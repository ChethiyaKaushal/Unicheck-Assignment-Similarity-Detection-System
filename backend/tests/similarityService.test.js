const test = require("node:test");
const assert = require("node:assert/strict");
const { similarityPercent, similarityLevel } = require("../services/similarityService");

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
