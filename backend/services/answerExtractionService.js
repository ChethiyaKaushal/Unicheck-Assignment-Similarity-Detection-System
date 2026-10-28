function canonical(label) {
    return String(label || "").toLowerCase().replace(/^q\s*/, "").replace(/[.\s]/g, "").replace(/[()]/g, "");
}

function lastPart(questionNumber) {
    const groups = String(questionNumber || "").match(/\(([^()]+)\)/g);
    if (groups?.length) return canonical(groups.at(-1).slice(1, -1));
    const main = String(questionNumber || "").match(/^\s*Q?\s*(\d+)\s*$/i);
    return main ? canonical(main[1]) : "";
}

function isCodeLike(line) {
    const value = String(line || "");
    return /^\s*(?:```|#\s*(?:include|define)|(?:module|always|assign|wire|reg|input|output|integer|parameter|function|task|begin|end)\b|(?:if|for|while|switch)\s*\()/i.test(value)
        || /[{};]|(?:==|!=|<=|>=|&&|\|\||=>|\+\+|--)/.test(value)
        || /^\s*(?:const|let|var|int|float|double|char|void|return)\b.*(?:=|\(|;)/i.test(value)
        || /^\s*[\w.$]+\s*=(?!=)/.test(value);
}

function extractAnswers(text, questions) {
    const questionsByLabel = new Map(questions.map((question) => [canonical(question.questionNumber), question]));
    const questionsById = new Map(questions.map((question) => [String(question._id), question]));
    const childrenByParent = new Map();
    for (const question of questions) {
        const parent = question.parentQuestionId ? String(question.parentQuestionId) : "";
        if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
        childrenByParent.get(parent).push(question);
    }

    const answers = new Map();
    let currentQuestion = null;
    let inCodeBlock = false;
    let fencedCodeBlock = false;

    function selectQuestion(question) {
        if (!question) return;
        currentQuestion = question;
        if (question.verificationStatus === "rejected" || question.synthetic) return;
        const key = String(question._id);
        if (!answers.has(key)) answers.set(key, { questionId: question._id, answerText: "", matchingStatus: "matched" });
    }

    function append(textToAppend, preserveCodeLine = false) {
        const raw = String(textToAppend || "").replace(/\r/g, "");
        const clean = preserveCodeLine ? raw.replace(/\s+$/u, "") : raw.trim();
        if (!currentQuestion || currentQuestion.verificationStatus === "rejected" || !clean) return;
        const answer = answers.get(String(currentQuestion._id));
        answer.answerText = answer.answerText
            ? `${answer.answerText}${preserveCodeLine ? "\n" : " "}${preserveCodeLine ? clean : clean}`
            : (preserveCodeLine ? clean : clean.trim());
    }

    function findSubpart(part) {
        let parent = currentQuestion;
        const visited = new Set();
        while (parent && !visited.has(String(parent._id))) {
            visited.add(String(parent._id));
            const targetLabel = `${parent.questionNumber}(${part})`;
            const directlyLabeled = questionsByLabel.get(canonical(targetLabel));
            if (directlyLabeled) return directlyLabeled;
            const found = (childrenByParent.get(String(parent._id)) || []).find((child) => lastPart(child.questionNumber) === part);
            if (found) return found;
            const structuralPrefix = targetLabel.toLowerCase().replace(/\s+/g, "");
            const hasDescendant = questions.some((question) => {
                const label = String(question.questionNumber || "").toLowerCase().replace(/\s+/g, "");
                return label.startsWith(structuralPrefix)
                    && (label.length === structuralPrefix.length || label[structuralPrefix.length] === "(");
            });
            if (hasDescendant) {
                return {
                    _id: `synthetic:${canonical(targetLabel)}`,
                    questionNumber: targetLabel,
                    parentQuestionId: parent._id,
                    verificationStatus: "rejected",
                    synthetic: true
                };
            }
            parent = parent.parentQuestionId ? questionsById.get(String(parent.parentQuestionId)) : null;
        }
        return null;
    }

    function appendWithSubparts(line) {
        let remainder = line;
        let matched = false;
        const subpartMarker = /^\s*([a-z]|[ivxlcdm]+|\d+)\s*[).]\s*/i;
        while (remainder) {
            const match = remainder.match(subpartMarker);
            if (!match || inCodeBlock) break;
            const part = canonical(match[1]);
            const child = findSubpart(part);
            if (!child) break;
            selectQuestion(child);
            remainder = remainder.slice(match[0].length);
            matched = true;
        }
        if (matched) {
            append(remainder, isCodeLike(remainder));
            if (isCodeLike(remainder)) inCodeBlock = true;
        } else {
            const codeLine = inCodeBlock || isCodeLike(line);
            append(line, codeLine);
            if (isCodeLike(line)) inCodeBlock = true;
        }
    }

    const mainQuestionMarker = /^\s*Q\s*(\d+(?:\s*\([a-z0-9ivxlcdm]+\))*)\s*[).:-]?\s*(.*)$/i;
    for (const line of String(text || "").replace(/\r/g, "").split("\n")) {
        if (/^\s*```/.test(line)) {
            append(line, true);
            fencedCodeBlock = !fencedCodeBlock;
            inCodeBlock = fencedCodeBlock;
            continue;
        }
        if (!line.trim()) {
            if (fencedCodeBlock && currentQuestion) {
                const answer = answers.get(String(currentQuestion._id));
                answer.answerText += "\n";
            } else if (inCodeBlock && currentQuestion) {
                const answer = answers.get(String(currentQuestion._id));
                answer.answerText += "\n";
                inCodeBlock = false;
            }
            continue;
        }
        if (fencedCodeBlock) {
            append(line, true);
            continue;
        }
        const mainMatch = line.match(mainQuestionMarker);
        if (mainMatch) {
            const questionLabel = `Q${mainMatch[1]}`;
            let question = questionsByLabel.get(canonical(mainMatch[1]));
            if (!question) {
                const structuralPrefix = questionLabel.toLowerCase().replace(/\s+/g, "");
                const hasDescendant = questions.some((candidate) => {
                    const label = String(candidate.questionNumber || "").toLowerCase().replace(/\s+/g, "");
                    return label.startsWith(structuralPrefix)
                        && (label.length === structuralPrefix.length || label[structuralPrefix.length] === "(");
                });
                if (hasDescendant) {
                    question = {
                        _id: `synthetic:${canonical(questionLabel)}`,
                        questionNumber: questionLabel,
                        parentQuestionId: null,
                        verificationStatus: "rejected",
                        synthetic: true
                    };
                }
            }
            if (!question) {
                currentQuestion = null;
                continue;
            }
            inCodeBlock = false;
            selectQuestion(question);
            appendWithSubparts(mainMatch[2]);
        } else if (currentQuestion && line.trim()) {
            appendWithSubparts(line);
        }
    }

    return [...answers.values()]
        .map((answer) => ({ ...answer, answerText: answer.answerText.replace(/\n+$/u, "") }))
        .filter((answer) => answer.answerText.trim());
}

module.exports = { canonical, extractAnswers };
