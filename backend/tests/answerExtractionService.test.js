const test = require("node:test");
const assert = require("node:assert/strict");
const { extractAnswers } = require("../services/answerExtractionService");

function makeQuestion(id, questionNumber, parentQuestionId = null) {
    return { _id: id, questionNumber, parentQuestionId };
}

test("maps written subparts under the current main question and preserves numbered answer points", () => {
    const questions = [
        makeQuestion("q1", "Q1"),
        makeQuestion("q1e", "Q1(e)", "q1"),
        makeQuestion("q1ei", "Q1(e)(i)", "q1e"),
        makeQuestion("q1eii", "Q1(e)(ii)", "q1e"),
        makeQuestion("q1f", "Q1(f)", "q1"),
        makeQuestion("q2", "Q2")
    ];
    const answers = extractAnswers([
        "Q1",
        "e)",
        "Advantages include:",
        "1. Lower cost.",
        "2) Faster processing.",
        "i) First nested subquestion answer.",
        "ii) Second nested subquestion answer.",
        "f) Final part answer.",
        "Q2) The next main answer."
    ].join("\n"), questions);

    const byId = new Map(answers.map((answer) => [String(answer.questionId), answer.answerText]));
    assert.equal(byId.get("q1e"), "Advantages include: 1. Lower cost. 2) Faster processing.");
    assert.equal(byId.get("q1ei"), "First nested subquestion answer.");
    assert.equal(byId.get("q1eii"), "Second nested subquestion answer.");
    assert.equal(byId.get("q1f"), "Final part answer.");
    assert.equal(byId.get("q2"), "The next main answer.");
    assert.equal(byId.has("q1"), false);
});

test("handles multiple hierarchy markers on one OCR line and combines repeated blocks", () => {
    const questions = [
        makeQuestion("q1", "Q1"),
        makeQuestion("q1b", "Q1(b)", "q1"),
        makeQuestion("q1bi", "Q1(b)(i)", "q1b"),
        makeQuestion("q1bii", "Q1(b)(ii)", "q1b")
    ];
    const answers = extractAnswers("Q1\nb) i) First line\nb) ii) Second line\nQ1(b)(i) More detail", questions);
    const byId = new Map(answers.map((answer) => [String(answer.questionId), answer.answerText]));
    assert.equal(byId.size, 2);
    assert.equal(byId.get("q1bi"), "First line More detail");
    assert.equal(byId.get("q1bii"), "Second line");
});

test("uses rejected blocks as hierarchy context without saving answers to them", () => {
    const questions = [
        { ...makeQuestion("q1", "Q1"), verificationStatus: "rejected" },
        { ...makeQuestion("q1a", "Q1(a)", "q1"), verificationStatus: "verified" },
        { ...makeQuestion("q1b", "Q1(b)", "q1"), verificationStatus: "rejected" },
        { ...makeQuestion("q1bi", "Q1(b)(i)", "q1b"), verificationStatus: "verified" },
        { ...makeQuestion("q2", "Q2"), verificationStatus: "verified" }
    ];
    const answers = extractAnswers([
        "Q1)",
        "Q1) a) Answer to approved part a.",
        "Q1) b) i) Answer to approved nested part.",
        "Q2) Answer to verified root."
    ].join("\n"), questions);
    const byId = new Map(answers.map((answer) => [String(answer.questionId), answer.answerText]));
    assert.deepEqual([...byId.keys()].sort(), ["q1a", "q1bi", "q2"]);
    assert.equal(byId.get("q1a"), "Answer to approved part a.");
    assert.equal(byId.get("q1bi"), "Answer to approved nested part.");
    assert.equal(byId.has("q1"), false);
    assert.equal(byId.has("q1b"), false);
});

test("infers missing main and intermediate parent blocks from complete question labels", () => {
    const questions = [
        { ...makeQuestion("q2a", "Q2(a)"), verificationStatus: "rejected" },
        { ...makeQuestion("q2ai", "Q2(a)(i)", "q2a"), verificationStatus: "verified" },
        { ...makeQuestion("q2b", "Q2(b)"), verificationStatus: "verified" },
        { ...makeQuestion("q4bi", "Q4(b)(i)"), verificationStatus: "verified" }
    ];
    const answers = extractAnswers([
        "Q2)",
        "Q2) a) i) Nested answer without a saved Q2 parent.",
        "Q2) b) Direct answer.",
        "Q4) b) i) Answer without a saved Q4(b) intermediate block."
    ].join("\n"), questions);
    const byId = new Map(answers.map((answer) => [String(answer.questionId), answer.answerText]));
    assert.equal(byId.get("q2ai"), "Nested answer without a saved Q2 parent.");
    assert.equal(byId.get("q2b"), "Direct answer.");
    assert.equal(byId.get("q4bi"), "Answer without a saved Q4(b) intermediate block.");
    assert.equal(byId.has("q2a"), false);
    assert.equal(byId.size, 3);
});

test("does not treat bare numbered points as new main questions", () => {
    const questions = [makeQuestion("q1", "Q1"), makeQuestion("q2", "Q2")];
    const answers = extractAnswers("Q1\nThe benefits are:\n1. Shorter runtime.\n2. Lower memory use.\nQ2\nSecond response.", questions);
    const byId = new Map(answers.map((answer) => [String(answer.questionId), answer.answerText]));
    assert.equal(byId.get("q1"), "The benefits are: 1. Shorter runtime. 2. Lower memory use.");
    assert.equal(byId.get("q2"), "Second response.");
});

test("keeps code snippet lines intact and does not mistake code labels for answer subparts", () => {
    const questions = [
        makeQuestion("q1", "Q1"),
        makeQuestion("q1a", "Q1(a)", "q1"),
        makeQuestion("q1ai", "Q1(a)(i)", "q1a"),
        makeQuestion("q1b", "Q1(b)", "q1")
    ];
    const answers = extractAnswers([
        "Q1",
        "a) i) int main() {",
        "    if (i) {",
        "        return 1;",
        "    }",
        "}",
        "",
        "b) The code returns one."
    ].join("\n"), questions);
    const byId = new Map(answers.map((answer) => [String(answer.questionId), answer.answerText]));
    assert.equal(byId.get("q1ai"), "int main() {\n    if (i) {\n        return 1;\n    }\n}");
    assert.equal(byId.get("q1b"), "The code returns one.");
});

