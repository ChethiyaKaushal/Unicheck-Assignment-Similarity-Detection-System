const Assignment = require("../models/Assignment");
const Question = require("../models/Question");
const Submission = require("../models/Submission");
const SimilarityReport = require("../models/SimilarityReport");
const { compareSubmissions } = require("./similarityService");

let running = false;

async function compareAssignmentNow(assignmentId, { final = false } = {}) {
    const now = new Date();
    const claimed = await Assignment.findOneAndUpdate(
        { _id: assignmentId, status: "published", similarityStatus: { $ne: "processing" } },
        { $set: { similarityStatus: "processing", similarityStartedAt: now } },
        { new: true }
    );
    if (!claimed) return { started: false };
    await SimilarityReport.findOneAndUpdate(
        { assignmentId: claimed._id },
        { $set: { status: "processing", errorMessage: "" } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    void (async () => {
        try {
            const [submissions, questions] = await Promise.all([
                Submission.find({ assignmentId: claimed._id, active: { $ne: false }, status: { $in: ["processed", "needs_review"] } }).populate("studentId", "username email").lean(),
                Question.find({ assignmentId: claimed._id, questionText: { $regex: "\\S" }, verificationStatus: { $ne: "rejected" } }).sort({ createdAt: 1 }).lean()
            ]);
            const result = await compareSubmissions(submissions, questions, { includeAnswers: false, criticalThreshold: 70, limit: 300, skipCommonAnswer: true, aggregateSemantic: true });
            await SimilarityReport.findOneAndUpdate({ assignmentId: claimed._id }, { $set: {
                status: "completed", submissionCount: submissions.length, pairsCompared: result.pairsCompared,
                criticalPairCount: result.criticalPairCount, truncated: result.criticalPairCount > result.pairs.length,
                threshold: 70, similarityMethod: result.semanticAvailable ? "semantic+text" : "text-only",
                completedAt: new Date(), flaggedPairs: result.pairs, errorMessage: ""
            } }, { upsert: true, new: true });
            await Assignment.updateOne({ _id: claimed._id }, { $set: { similarityStatus: "completed", similarityStartedAt: null, similarityCompletedAt: final ? new Date() : null } });
            console.log(`Similarity report ready for assignment ${claimed._id}: ${result.criticalPairCount} review pairs.`);
        } catch (error) {
            await SimilarityReport.findOneAndUpdate({ assignmentId: claimed._id }, { $set: { status: "failed", errorMessage: String(error.message || "Similarity comparison failed.").slice(0, 1000) } }, { upsert: true });
            await Assignment.updateOne({ _id: claimed._id }, { $set: { similarityStatus: "failed", similarityStartedAt: null } });
            console.error(`Similarity report failed for assignment ${claimed._id}:`, error.message);
        }
    })();
    return { started: true };
}

async function processExpiredAssignments() {
    if (running) return;
    running = true;
    try {
        const staleBefore = new Date(Date.now() - 30 * 60_000);
        const runnable = { $or: [{ similarityStatus: { $in: ["pending", "failed"] } }, { similarityStatus: { $exists: false } }, { similarityStatus: "processing", similarityStartedAt: { $lte: staleBefore } }, { similarityStatus: "completed", similarityCompletedAt: null }] };
        const expired = await Assignment.find({ status: "published", dueAt: { $lte: new Date() }, ...runnable }).select("_id").limit(5).lean();
        for (const candidate of expired) {
            const claimed = await Assignment.findOneAndUpdate({ _id: candidate._id, status: "published", dueAt: { $lte: new Date() }, ...runnable }, { $set: { similarityStatus: "processing", similarityStartedAt: new Date() } }, { new: true });
            if (!claimed) continue;
            try {
                await SimilarityReport.findOneAndUpdate({ assignmentId: claimed._id }, { $set: { status: "processing", errorMessage: "" } }, { upsert: true, new: true, setDefaultsOnInsert: true });
                const [submissions, questions] = await Promise.all([
                    Submission.find({ assignmentId: claimed._id, active: { $ne: false }, status: { $in: ["processed", "needs_review"] } }).populate("studentId", "username email").lean(),
                    Question.find({ assignmentId: claimed._id, questionText: { $regex: "\\S" }, verificationStatus: { $ne: "rejected" } }).sort({ createdAt: 1 }).lean()
                ]);
                const result = await compareSubmissions(submissions, questions, { includeAnswers: false, criticalThreshold: 70, limit: 300, skipCommonAnswer: true, aggregateSemantic: true });
                const saved = await SimilarityReport.findOneAndUpdate({ assignmentId: claimed._id }, { $set: {
                    status: "completed", submissionCount: submissions.length, pairsCompared: result.pairsCompared,
                    criticalPairCount: result.criticalPairCount, truncated: result.criticalPairCount > result.pairs.length,
                    threshold: 70, similarityMethod: result.semanticAvailable ? "semantic+text" : "text-only",
                    completedAt: new Date(), flaggedPairs: result.pairs, errorMessage: ""
                } }, { upsert: true, new: true });
                void saved;
                await Assignment.updateOne({ _id: claimed._id }, { $set: { similarityStatus: "completed", similarityStartedAt: null, similarityCompletedAt: new Date() } });
                console.log(`Similarity report ready for assignment ${claimed._id}: ${result.criticalPairCount} critical pairs.`);
            } catch (error) {
                await SimilarityReport.findOneAndUpdate({ assignmentId: claimed._id }, { $set: { status: "failed", errorMessage: String(error.message || "Similarity comparison failed.").slice(0, 1000) } }, { upsert: true });
                await Assignment.updateOne({ _id: claimed._id }, { $set: { similarityStatus: "failed", similarityStartedAt: null } });
                console.error(`Similarity report failed for assignment ${claimed._id}:`, error.message);
            }
        }
    } finally { running = false; }
}

function startSimilarityScheduler() {
    void processExpiredAssignments();
    const timer = setInterval(() => void processExpiredAssignments(), 60_000);
    timer.unref?.();
}

module.exports = { startSimilarityScheduler, processExpiredAssignments, compareAssignmentNow };
