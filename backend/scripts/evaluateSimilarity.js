const fs = require("fs");
const path = require("path");
const { compareSubmissions } = require("../services/similarityService");
const { evaluateThresholds } = require("../services/similarityEvaluation");

async function main() {
    const inputPath = process.argv[2];
    if (!inputPath) throw new Error("Usage: npm run evaluate:similarity -- <labeled-pairs.json>");
    const cases = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));
    if (!Array.isArray(cases) || cases.length === 0) throw new Error("The JSON file must contain at least one labeled answer pair.");

    const scored = [];
    for (const [index, sample] of cases.entries()) {
        if (typeof sample.left !== "string" || typeof sample.right !== "string" || typeof sample.expectedReview !== "boolean") {
            throw new Error(`Sample ${index + 1} needs left, right, and expectedReview fields.`);
        }
        const question = { _id: "evaluation-question", questionNumber: sample.questionNumber || "Q1" };
        const submissions = [
            { _id: "evaluation-left", studentId: { _id: "student-left", username: "Left", email: "left@example.test" }, answers: [{ questionId: question._id, answerText: sample.left }] },
            { _id: "evaluation-right", studentId: { _id: "student-right", username: "Right", email: "right@example.test" }, answers: [{ questionId: question._id, answerText: sample.right }] }
        ];
        const pair = (await compareSubmissions(submissions, [question]))[0];
        scored.push({ id: sample.id || `sample-${index + 1}`, score: pair?.score || 0, reviewScore: pair?.reviewScore || 0, expectedReview: sample.expectedReview, similarityMethod: pair?.similarityMethod || "unavailable" });
    }

    const thresholds = evaluateThresholds(scored.map((sample) => ({ score: sample.reviewScore, expectedReview: sample.expectedReview })));
    const rows = thresholds.map((row) => ({
        threshold: row.threshold,
        precision: Number(row.precision.toFixed(3)),
        recall: Number(row.recall.toFixed(3)),
        f1: Number(row.f1.toFixed(3)),
        accuracy: Number(row.accuracy.toFixed(3)),
        falsePositives: row.falsePositive,
        falseNegatives: row.falseNegative
    }));
    console.log(JSON.stringify({
        note: "Metrics apply only to this labeled sample set. Use lecturer-reviewed examples and a separate held-out set before making accuracy claims.",
        samples: scored,
        thresholdMetrics: rows
    }, null, 2));
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
