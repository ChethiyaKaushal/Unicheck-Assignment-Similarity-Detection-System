const test = require("node:test");
const assert = require("node:assert/strict");
const {
    similarityPercent,
    similarityLevel,
    compareSubmissions,
    phraseSimilarityPercent,
    sharedPhrases,
    setEmbeddingProvider
} = require("../services/similarityService");

function makePair(leftText, rightText, extraAnswers = []) {
    const question = { _id: "question-1", questionNumber: "Q1" };
    const submissions = [
        { _id: "submission-1", studentId: { _id: "student-1", username: "A", email: "a@example.test" }, answers: [{ questionId: question._id, answerText: leftText }] },
        { _id: "submission-2", studentId: { _id: "student-2", username: "B", email: "b@example.test" }, answers: [{ questionId: question._id, answerText: rightText }] },
        ...extraAnswers.map((text, index) => ({
            _id: "submission-" + (index + 3),
            studentId: { _id: "student-" + (index + 3), username: "Student " + (index + 3), email: "student" + (index + 3) + "@example.test" },
            answers: [{ questionId: question._id, answerText: text }]
        }))
    ];
    return { submissions, question };
}

test("identical answer text scores 100 percent", () => {
    assert.equal(similarityPercent("The quick brown fox", "The quick brown fox"), 100);
});

test("unrelated answers score lower than identical answers", () => {
    assert.ok(similarityPercent("database indexing query plan", "photosynthesis chlorophyll sunlight") < 20);
});

test("similarity levels use the documented thresholds", () => {
    assert.equal(similarityLevel(70), "high");
    assert.equal(similarityLevel(40), "medium");
    assert.equal(similarityLevel(39), "low");
});

test("phrase evidence highlights longer exact shared wording", () => {
    const left = "The system reduces energy usage through automatic workload balancing.";
    const right = "The system reduces energy usage through automatic workload balancing and monitoring.";
    assert.ok(phraseSimilarityPercent(left, right) > 50);
    assert.ok(sharedPhrases(left, right).some((phrase) => phrase.includes("reduces energy usage")));
});

test("semantic comparison catches paraphrases with low wording overlap", async () => {
    setEmbeddingProvider(async (texts) => texts.map((text) => text.includes("reduces energy")
        ? [1, 0, 0]
        : [0.98, 0.2, 0]));
    const { submissions, question } = makePair(
        "A method reduces energy consumption significantly.",
        "An approach lowers power use considerably."
    );
    const pair = (await compareSubmissions(submissions, [question]))[0];
    assert.equal(pair.similarityMethod, "semantic+text");
    assert.ok(pair.questions[0].semanticScore > 90);
    assert.ok(pair.questions[0].wordingScore < 30);
    setEmbeddingProvider(null);
});

test("short common answers retain their similarity score but are marked low confidence", async () => {
    setEmbeddingProvider(async (texts) => texts.map(() => [1, 0, 0]));
    const { submissions, question } = makePair("4", "4", ["4", "4"]);
    const pair = (await compareSubmissions(submissions, [question]))[0];
    assert.equal(pair.questions[0].score, 100);
    assert.equal(pair.questions[0].confidence, "low");
    assert.equal(pair.questions[0].commonAnswerPercent, 100);
    setEmbeddingProvider(null);
});

test("shared numbered answer points remain available as phrase evidence", () => {
    const left = "The advantages are: 1. lower cost for users 2. faster processing for requests";
    const right = "The advantages are: 1. lower cost for users 2. faster processing for requests";
    assert.equal(phraseSimilarityPercent(left, right), 100);
    assert.ok(sharedPhrases(left, right).length > 0);
});
