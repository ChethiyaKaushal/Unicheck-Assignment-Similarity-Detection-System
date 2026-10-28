const MAX_EMBEDDING_CACHE = 10000;
const os = require("os");
const path = require("path");
const DEFAULT_EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const STOP_WORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by",
    "for", "from", "had", "has", "have", "he", "her", "hers", "him", "his",
    "i", "if", "in", "into", "is", "it", "its", "me", "my", "of", "on",
    "or", "our", "ours", "she", "that", "the", "their", "them", "then",
    "there", "these", "they", "this", "those", "to", "was", "we", "were",
    "what", "when", "where", "which", "who", "will", "with", "you", "your"
]);

let extractorPromise = null;
let embeddingProviderForTests = null;
const embeddingCache = new Map();

function tokenize(text) {
    return (text || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((word) => word.length > 1 || /^\d+$/u.test(word));
}

function informativeTokens(text) {
    return tokenize(text).filter((word) => !STOP_WORDS.has(word));
}

function similarityPercent(left, right) {
    const a = tokenize(left);
    const b = tokenize(right);
    if (!a.length || !b.length) return 0;
    const countsA = new Map();
    const countsB = new Map();
    for (const token of a) countsA.set(token, (countsA.get(token) || 0) + 1);
    for (const token of b) countsB.set(token, (countsB.get(token) || 0) + 1);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (const value of countsA.values()) normA += value * value;
    for (const value of countsB.values()) normB += value * value;
    for (const [token, value] of countsA) dot += value * (countsB.get(token) || 0);
    if (!normA || !normB) return 0;
    return Math.round((dot / Math.sqrt(normA * normB)) * 100);
}

function buildQuestionContext(answerTexts) {
    const documentFrequency = new Map();
    let documentCount = 0;
    for (const text of answerTexts) {
        if (!text || !text.trim()) continue;
        documentCount += 1;
        for (const token of new Set(informativeTokens(text))) {
            documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
        }
    }
    return { documentCount, documentFrequency };
}

function weightedSimilarityPercent(left, right, context) {
    const countsA = new Map();
    const countsB = new Map();
    for (const token of informativeTokens(left)) countsA.set(token, (countsA.get(token) || 0) + 1);
    for (const token of informativeTokens(right)) countsB.set(token, (countsB.get(token) || 0) + 1);
    if (!countsA.size || !countsB.size) return 0;
    const weightFor = (token) => 1 + Math.log(
        (context.documentCount + 1) / ((context.documentFrequency.get(token) || 0) + 1)
    );
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (const [token, count] of countsA) {
        const weighted = count * weightFor(token);
        normA += weighted * weighted;
        dot += weighted * (countsB.get(token) || 0) * weightFor(token);
    }
    for (const [token, count] of countsB) {
        const weighted = count * weightFor(token);
        normB += weighted * weighted;
    }
    if (!normA || !normB) return 0;
    return Math.round((dot / Math.sqrt(normA * normB)) * 100);
}

function makeNgrams(tokens, size) {
    const grams = new Set();
    for (let index = 0; index <= tokens.length - size; index += 1) {
        grams.add(tokens.slice(index, index + size).join(" "));
    }
    return grams;
}

function phraseSimilarityPercent(left, right) {
    const a = tokenize(left);
    const b = tokenize(right);
    if (!a.length || !b.length) return 0;
    const normalizedA = a.join(" ");
    const normalizedB = b.join(" ");
    if (normalizedA === normalizedB && Math.min(a.length, b.length) < 4) return 100;
    if (Math.min(a.length, b.length) < 4) return 0;
    const gramsA = makeNgrams(a, 4);
    const gramsB = makeNgrams(b, 4);
    let common = 0;
    for (const gram of gramsA) if (gramsB.has(gram)) common += 1;
    return gramsA.size + gramsB.size
        ? Math.round((2 * common / (gramsA.size + gramsB.size)) * 100)
        : 0;
}

function sharedPhrases(left, right) {
    const a = tokenize(left);
    const b = tokenize(right);
    if (Math.min(a.length, b.length) < 4) return [];
    const gramsB = new Set();
    for (let size = 4; size <= Math.min(10, b.length); size += 1) {
        for (let index = 0; index <= b.length - size; index += 1) {
            gramsB.add(b.slice(index, index + size).join(" "));
        }
    }
    const candidates = new Set();
    for (let size = 10; size >= 4; size -= 1) {
        if (size > a.length) continue;
        for (let index = 0; index <= a.length - size; index += 1) {
            const phrase = a.slice(index, index + size).join(" ");
            if (gramsB.has(phrase)) candidates.add(phrase);
        }
    }
    const ordered = [...candidates].sort((x, y) => y.split(" ").length - x.split(" ").length);
    const result = [];
    for (const phrase of ordered) {
        if (result.some((longer) => longer.includes(phrase))) continue;
        result.push(phrase);
        if (result.length >= 5) break;
    }
    return result;
}

const CODE_KEYWORDS = new Set(["if", "else", "for", "while", "switch", "case", "return", "function", "class", "module", "endmodule", "always", "assign", "wire", "reg", "input", "output", "begin", "end", "int", "float", "double", "char", "void", "const", "let", "var"]);

function looksLikeCode(text) {
    const value = String(text || "");
    const lines = value.split(/\r?\n/).filter((line) => line.trim());
    const codeCueCount = (value.match(/[{};]|(?:==|!=|<=|>=|&&|\|\||=>|\+\+|--)/g) || []).length;
    const keywordCue = /\b(?:module|endmodule|always|assign|wire|reg|function|class|return|const|int|void)\b/i.test(value);
    const assignmentCue = lines.filter((line) => /^\s*[\w.$]+\s*=(?!=)/.test(line)).length;
    return codeCueCount >= 2 || keywordCue || (lines.length >= 2 && assignmentCue >= 1);
}

function codeTokens(text, normalizeIdentifiers = false) {
    const source = String(text || "")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/\/\/[^\n]*/g, " ")
        .replace(/--[^\n]*/g, " ");
    const raw = source.match(/(?:0x[\da-f]+|\d+(?:\.\d+)?|[a-z_$][\w$]*|===|!==|==|!=|<=|>=|&&|\|\||=>|\+\+|--|<<|>>|[{}()[\].,;:+*/%<>=!&|^~-])/giu) || [];
    if (!normalizeIdentifiers) return raw.map((token) => token.toLowerCase());
    const names = new Map();
    let nextName = 0;
    return raw.map((token) => {
        const value = token.toLowerCase();
        if (!/^[a-z_$][\w$]*$/i.test(token) || CODE_KEYWORDS.has(value)) return value;
        if (!names.has(value)) names.set(value, `identifier_${nextName++}`);
        return names.get(value);
    });
}

function codeSequenceScore(tokensA, tokensB, size) {
    if (!tokensA.length || !tokensB.length) return 0;
    const grams = (tokens) => {
        const result = new Set();
        if (tokens.length < size) return new Set([tokens.join(" ")]);
        for (let i = 0; i <= tokens.length - size; i += 1) result.add(tokens.slice(i, i + size).join(" "));
        return result;
    };
    const a = grams(tokensA);
    const b = grams(tokensB);
    let common = 0;
    for (const gram of a) if (b.has(gram)) common += 1;
    return Math.round((2 * common / (a.size + b.size)) * 100);
}

function codeSimilarityPercent(left, right) {
    if (!looksLikeCode(left) || !looksLikeCode(right)) return null;
    const exactA = codeTokens(left);
    const exactB = codeTokens(right);
    const structureA = codeTokens(left, true);
    const structureB = codeTokens(right, true);
    const exact = Math.max(codeSequenceScore(exactA, exactB, 3), codeSequenceScore(exactA, exactB, 5));
    const structure = Math.max(codeSequenceScore(structureA, structureB, 3), codeSequenceScore(structureA, structureB, 5));
    return Math.max(exact, structure);
}

function splitIntoEmbeddingChunks(text) {
    const parts = String(text || "")
        .replace(/\r/g, "\n")
        .split(/\n+|(?<=[.!?;])\s+|\s+(?=\d+[.)]\s+)/u)
        .map((part) => part.trim())
        .filter(Boolean);
    const chunks = [];
    for (const part of parts) {
        const words = part.split(/\s+/);
        for (let index = 0; index < words.length; index += 80) {
            const chunk = words.slice(index, index + 80).join(" ").trim();
            if (chunk) chunks.push(chunk);
        }
    }
    return chunks.length ? chunks : [String(text || "").trim()].filter(Boolean);
}

async function getExtractor() {
    if (!extractorPromise) {
        extractorPromise = import("@huggingface/transformers")
            .then(({ pipeline, env }) => {
                const defaultCacheRoot = process.env.LOCALAPPDATA || path.join(os.homedir(), ".cache");
                env.cacheDir = process.env.UNICHECK_MODEL_CACHE || path.join(defaultCacheRoot, "UniCheck", "model-cache");
                return pipeline(
                    "feature-extraction",
                    process.env.UNICHECK_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL,
                    { dtype: "q8" }
                );
            })
            .catch((error) => {
                extractorPromise = null;
                throw error;
            });
    }
    return extractorPromise;
}

async function embedTexts(texts) {
    const unique = [...new Set(texts.filter(Boolean))];
    if (embeddingProviderForTests) {
        const vectors = await embeddingProviderForTests(unique);
        return new Map(unique.map((text, index) => [text, Array.from(vectors[index] || [])]));
    }
    const missing = unique.filter((text) => !embeddingCache.has(text));
    if (missing.length) {
        const extractor = await getExtractor();
        for (let offset = 0; offset < missing.length; offset += 8) {
            const batch = missing.slice(offset, offset + 8);
            const output = await extractor(batch, { pooling: "mean", normalize: true });
            const rows = output.tolist();
            batch.forEach((text, index) => {
                const vector = Array.from(rows[index] || []);
                embeddingCache.set(text, vector);
                if (embeddingCache.size > MAX_EMBEDDING_CACHE) {
                    embeddingCache.delete(embeddingCache.keys().next().value);
                }
            });
        }
    }
    return new Map(unique.map((text) => [text, embeddingCache.get(text)]));
}

function cosinePercent(left, right) {
    if (!left?.length || left.length !== right?.length) return 0;
    let dot = 0;
    let normLeft = 0;
    let normRight = 0;
    for (let index = 0; index < left.length; index += 1) {
        dot += left[index] * right[index];
        normLeft += left[index] * left[index];
        normRight += right[index] * right[index];
    }
    if (!normLeft || !normRight) return 0;
    return Math.max(0, Math.min(100, Math.round((dot / Math.sqrt(normLeft * normRight)) * 100)));
}

function semanticAnswerPercent(leftChunks, rightChunks, vectors) {
    if (!leftChunks.length || !rightChunks.length) return 0;
    const directional = (source, target) => {
        let weightedScore = 0;
        let totalWeight = 0;
        for (const chunk of source) {
            let best = 0;
            for (const candidate of target) {
                best = Math.max(best, cosinePercent(vectors.get(chunk), vectors.get(candidate)));
            }
            const weight = Math.max(1, informativeTokens(chunk).length);
            weightedScore += best * weight;
            totalWeight += weight;
        }
        return totalWeight ? weightedScore / totalWeight : 0;
    };
    return Math.round((directional(leftChunks, rightChunks) + directional(rightChunks, leftChunks)) / 2);
}

function meanVector(chunks, vectors) {
    const rows = chunks.map((chunk) => vectors.get(chunk)).filter((vector) => vector?.length);
    if (!rows.length) return null;
    const mean = Array(rows[0].length).fill(0);
    for (const row of rows) {
        for (let index = 0; index < mean.length; index += 1) mean[index] += row[index] / rows.length;
    }
    const norm = Math.sqrt(mean.reduce((sum, value) => sum + value * value, 0));
    return norm ? mean.map((value) => value / norm) : mean;
}

function similarityLevel(score) {
    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
}

function answerConfidence(leftText, rightText, commonAnswerPercent, responseCount) {
    const leftLength = informativeTokens(leftText).length;
    const rightLength = informativeTokens(rightText).length;
    const minimumLength = Math.min(leftLength, rightLength);
    if (minimumLength < 5) {
        return {
            confidence: "low",
            confidenceNote: "Short answers contain little text evidence, even when their similarity score is high."
        };
    }
    if (responseCount >= 4 && commonAnswerPercent >= 60) {
        return {
            confidence: "low",
            confidenceNote: "A similar answer appears in many submissions for this question."
        };
    }
    if (minimumLength < 12 || (responseCount >= 4 && commonAnswerPercent >= 35)) {
        return {
            confidence: "medium",
            confidenceNote: responseCount >= 4 && commonAnswerPercent >= 35
                ? "Similar answers are common for this question."
                : "The answers provide a moderate amount of text evidence."
        };
    }
    return {
        confidence: "high",
        confidenceNote: "The answers contain enough text for a more informative comparison."
    };
}

async function compareSubmissions(submissions, questions, options = {}) {
    const { includeAnswers = true, criticalThreshold = 70, limit = Infinity, skipCommonAnswer = false, aggregateSemantic = false } = options;
    const questionContexts = new Map();
    const answerRecords = new Map();
    const embeddingTexts = [];
    for (const submission of submissions) {
        for (const answer of submission.answers || []) {
            const questionId = String(answer.questionId);
            const text = answer.answerText || "";
            if (!questionContexts.has(questionId)) questionContexts.set(questionId, []);
            questionContexts.get(questionId).push(text);
            const key = String(submission._id) + ":" + questionId;
            const chunks = splitIntoEmbeddingChunks(text);
            answerRecords.set(key, { text, chunks });
            embeddingTexts.push(...chunks);
        }
    }

    let vectors = new Map();
    let semanticAvailable = true;
    try {
        vectors = await embedTexts(embeddingTexts);
    } catch (error) {
        semanticAvailable = false;
        console.warn("Semantic similarity model unavailable; using text overlap only:", error.message);
    }

    const meanByAnswer = new Map();
    if (aggregateSemantic && semanticAvailable) {
        for (const [key, record] of answerRecords) meanByAnswer.set(key, meanVector(record.chunks, vectors));
    }
    const contextByQuestion = new Map([...questionContexts].map(([questionId, texts]) => [questionId, buildQuestionContext(texts)]));

    const pairs = [];
    const criticalPairs = [];
    let criticalPairCount = 0;
    const pairPriority = (pair) => Math.max(pair.score, ...pair.questions.map((item) => item.score ?? 0));
    for (let i = 0; i < submissions.length; i += 1) {
        for (let j = i + 1; j < submissions.length; j += 1) {
            const left = submissions[i];
            const right = submissions[j];
            const leftAnswers = new Map((left.answers || []).map((answer) => [String(answer.questionId), answer.answerText]));
            const rightAnswers = new Map((right.answers || []).map((answer) => [String(answer.questionId), answer.answerText]));
            const perQuestion = [];
            for (const question of questions) {
                const questionId = String(question._id);
                const leftText = leftAnswers.get(questionId) || "";
                const rightText = rightAnswers.get(questionId) || "";
                if (!leftText.trim() && !rightText.trim()) continue;
                const hasBoth = Boolean(leftText.trim() && rightText.trim());
                let score = null;
                let semanticScore = null;
                let wordingScore = null;
                let codeScore = null;
                let matchedPhrases = [];
                let confidence = "low";
                let confidenceNote = "There is not enough text to compare both answers.";
                let commonAnswerPercent = 0;
                if (hasBoth) {
                    const context = contextByQuestion.get(questionId) || { documentCount: 0, documentFrequency: new Map() };
                    const lexical = weightedSimilarityPercent(leftText, rightText, context);
                    const phrase = phraseSimilarityPercent(leftText, rightText);
                    wordingScore = Math.round(lexical * 0.7 + phrase * 0.3);
                    codeScore = codeSimilarityPercent(leftText, rightText);
                    matchedPhrases = sharedPhrases(leftText, rightText);
                    const leftKey = String(left._id) + ":" + questionId;
                    const rightKey = String(right._id) + ":" + questionId;
                    const leftRecord = answerRecords.get(leftKey);
                    const rightRecord = answerRecords.get(rightKey);
                    if (semanticAvailable) {
                        semanticScore = aggregateSemantic
                            ? cosinePercent(meanByAnswer.get(leftKey), meanByAnswer.get(rightKey))
                            : semanticAnswerPercent(leftRecord.chunks, rightRecord.chunks, vectors);
                        score = codeScore === null
                            ? Math.round(semanticScore * 0.85 + lexical * 0.10 + phrase * 0.05)
                            : Math.round(semanticScore * 0.70 + lexical * 0.10 + phrase * 0.05 + codeScore * 0.15);
                    } else {
                        score = codeScore === null
                            ? Math.round(lexical * 0.7 + phrase * 0.3)
                            : Math.round(lexical * 0.60 + phrase * 0.10 + codeScore * 0.30);
                    }

                    const peerRecords = skipCommonAnswer ? [] : submissions.map((submission) => {
                        const answer = (submission.answers || []).find((item) => String(item.questionId) === questionId);
                        return answer ? answerRecords.get(String(submission._id) + ":" + questionId) : null;
                    }).filter(Boolean);
                    const leftMean = !skipCommonAnswer && semanticAvailable ? (aggregateSemantic ? meanByAnswer.get(leftKey) : meanVector(leftRecord.chunks, vectors)) : null;
                    const rightMean = !skipCommonAnswer && semanticAvailable ? (aggregateSemantic ? meanByAnswer.get(rightKey) : meanVector(rightRecord.chunks, vectors)) : null;
                    let commonCount = 0;
                    if (peerRecords.length >= 4) {
                        for (const record of peerRecords) {
                            if (semanticAvailable) {
                                const peerMean = meanVector(record.chunks, vectors);
                                if (cosinePercent(leftMean, peerMean) >= 82 && cosinePercent(rightMean, peerMean) >= 82) commonCount += 1;
                            } else if (
                                tokenize(record.text).join(" ") === tokenize(leftText).join(" ")
                                && tokenize(record.text).join(" ") === tokenize(rightText).join(" ")
                            ) {
                                commonCount += 1;
                            }
                        }
                        commonAnswerPercent = Math.round((commonCount / peerRecords.length) * 100);
                    }
                    ({ confidence, confidenceNote } = answerConfidence(leftText, rightText, commonAnswerPercent, peerRecords.length));
                }
                perQuestion.push({
                    questionId,
                    questionNumber: question.questionNumber,
                    score,
                    level: score === null ? "unavailable" : similarityLevel(score),
                    semanticScore,
                    wordingScore,
                    codeScore,
                    matchedPhrases,
                    confidence,
                    confidenceNote,
                    commonAnswerPercent,
                    studentAnswers: includeAnswers ? [
                        { studentId: String(left.studentId._id), answerText: leftText },
                        { studentId: String(right.studentId._id), answerText: rightText }
                    ] : undefined
                });
            }
            const comparable = perQuestion.filter((item) => item.score !== null);
            const overall = comparable.length
                ? Math.round(comparable.reduce((sum, item) => sum + item.score, 0) / comparable.length)
                : 0;
            const pairKey = [String(left._id), String(right._id)].sort().join(":");
            const pair = {
                submissionIds: [String(left._id), String(right._id)],
                students: [left.studentId, right.studentId].map((student) => ({ id: String(student._id), username: student.username, email: student.email })),
                score: overall,
                level: similarityLevel(overall),
                comparedQuestions: comparable.length,
                similarityMethod: semanticAvailable ? "semantic+text" : "text-only",
                feedbackShared: Boolean(
                    (left.similarityFeedbacks || []).some((item) => item.pairKey === pairKey)
                    && (right.similarityFeedbacks || []).some((item) => item.pairKey === pairKey)
                ),
                questions: perQuestion
            };
            if (includeAnswers) pairs.push(pair);
            else if (pair.score >= criticalThreshold || pair.questions.some((item) => item.score !== null && item.score >= criticalThreshold)) {
                criticalPairCount += 1;
                if (criticalPairs.length < limit) criticalPairs.push(pair);
                else {
                    let lowestIndex = 0;
                    for (let index = 1; index < criticalPairs.length; index += 1) if (pairPriority(criticalPairs[index]) < pairPriority(criticalPairs[lowestIndex])) lowestIndex = index;
                    if (pairPriority(pair) > pairPriority(criticalPairs[lowestIndex])) criticalPairs[lowestIndex] = pair;
                }
            }
        }
    }
    if (includeAnswers) {
        pairs.sort((a, b) => b.score - a.score);
        return Number.isFinite(limit) ? pairs.slice(0, limit) : pairs;
    }
    criticalPairs.sort((a, b) => pairPriority(b) - pairPriority(a));
    return { pairs: criticalPairs, criticalPairCount, pairsCompared: submissions.length * (submissions.length - 1) / 2, semanticAvailable: semanticAvailable };
}

function setEmbeddingProvider(provider) {
    embeddingProviderForTests = provider;
    embeddingCache.clear();
}

module.exports = {
    tokenize,
    similarityPercent,
    similarityLevel,
    compareSubmissions,
    phraseSimilarityPercent,
    sharedPhrases,
    looksLikeCode,
    codeSimilarityPercent,
    setEmbeddingProvider
};
