const test = require("node:test");
const assert = require("node:assert/strict");
const { scoreMetrics, evaluateThresholds } = require("../services/similarityEvaluation");

test("evaluation metrics report precision, recall, false positives, and false negatives", () => {
    const samples = [
        { score: 90, expectedReview: true },
        { score: 80, expectedReview: false },
        { score: 20, expectedReview: false },
        { score: 60, expectedReview: true }
    ];
    const result = scoreMetrics(samples, 70);
    assert.equal(result.truePositive, 1);
    assert.equal(result.falsePositive, 1);
    assert.equal(result.trueNegative, 1);
    assert.equal(result.falseNegative, 1);
    assert.equal(result.precision, 0.5);
    assert.equal(result.recall, 0.5);
    assert.equal(result.f1, 0.5);
    assert.equal(result.accuracy, 0.5);
});

test("threshold evaluation validates labels and evaluates multiple cutoffs", () => {
    const results = evaluateThresholds([{ score: 75, expectedReview: true }], [70, 80]);
    assert.equal(results[0].truePositive, 1);
    assert.equal(results[1].falseNegative, 1);
    assert.throws(() => evaluateThresholds([{ score: 75, expectedReview: "yes" }]), /boolean expectedReview/);
});
