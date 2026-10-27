const test = require("node:test");
const assert = require("node:assert/strict");
const { parseQuestionHierarchy } = require("../services/questionProcessingService");

test("parses stem and letter/roman markers on the same line", () => {
    const result = parseQuestionHierarchy("Q1) Explain the method. a) Define it. i) What is the first step? ii) What follows?");
    assert.deepEqual(result.map((question) => question.questionNumber), ["Q1", "Q1(a)", "Q1(a)(i)", "Q1(a)(ii)"]);
    assert.equal(result[0].questionText, "Explain the method.");
    assert.equal(result[2].questionText, "What is the first step?");
    assert.equal(result[1].parentLabel, "Q1");
});

test("parses a main prompt before inline subquestion markers", () => {
    const result = parseQuestionHierarchy("Q1) Bla bla bla a) First subquestion i) Nested question");
    assert.deepEqual(result.map((question) => question.questionNumber), ["Q1", "Q1(a)", "Q1(a)(i)"]);
    assert.equal(result[0].questionText, "Bla bla bla");
    assert.equal(result[1].questionText, "First subquestion");
    assert.equal(result[2].questionText, "Nested question");
});

test("omits empty hierarchy rows and reparents meaningful children", () => {
    const result = parseQuestionHierarchy("Q1)\na)\ni) Explain the concept.");
    assert.deepEqual(result.map((question) => question.questionNumber), ["Q1(a)(i)"]);
    assert.equal(result[0].parentLabel, null);
});

test("normalizes OCR euro/pound lookalikes for the letter e marker", () => {
    const result = parseQuestionHierarchy("Q1) Main text\n€) Explain the figure prompt.\n(i) Find the boundary.");
    assert.deepEqual(result.map((question) => question.questionNumber), ["Q1", "Q1(e)", "Q1(e)(i)"]);
    assert.equal(result[1].questionText, "Explain the figure prompt.");
});
test("does not read a mathematical variable b. as a new question marker", () => {
    const result = parseQuestionHierarchy("Q1) Train an SVM. e) Find the weight vector and bias b. What is the boundary? (ii) Circle the support vectors.");
    assert.deepEqual(result.map((question) => question.questionNumber), ["Q1", "Q1(e)", "Q1(e)(ii)"]);
    assert.match(result[1].questionText, /What is the boundary/);
    assert.equal(result[2].questionText, "Circle the support vectors.");
});
test("ignores parenthesized roman numerals used as references in prose", () => {
    const result = parseQuestionHierarchy("Q2 b) Use Figure Q2b. Answer questions (i) to (iv) from the chart.\n(i) First prompt.\n(ii) Second prompt.\n(iii) Third prompt.\n(iv) Fourth prompt.");
    assert.deepEqual(result.map((question) => question.questionNumber), ["Q2(b)", "Q2(b)(i)", "Q2(b)(ii)", "Q2(b)(iii)", "Q2(b)(iv)"]);
    assert.equal(result[1].questionText, "First prompt.");
});
test("excludes table rows, figure captions, and diagram OCR noise", () => {
    const result = parseQuestionHierarchy("Q1) Explain the result.\nTable 1: Methods | Scores\nMethod  One\nFigure 1: A chart\nColumn A | Column B\nA / _ \\\\ | { diagram }\nQ2) Describe the conclusion.");
    assert.deepEqual(result.map((question) => question.questionNumber), ["Q1", "Q2"]);
    assert.equal(result[0].questionText, "Explain the result.");
    assert.equal(result[1].questionText, "Describe the conclusion.");
});
