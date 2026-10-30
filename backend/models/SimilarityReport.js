const mongoose = require("mongoose");

const similarityReportSchema = new mongoose.Schema({
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true, unique: true },
    status: { type: String, enum: ["processing", "completed", "failed"], required: true },
    submissionCount: { type: Number, default: 0 },
    pairsCompared: { type: Number, default: 0 },
    criticalPairCount: { type: Number, default: 0 },
    truncated: { type: Boolean, default: false },
    threshold: { type: Number, default: 70 },
    similarityMethod: { type: String, enum: ["semantic+text", "text-only", "pending"], default: "pending" },
    completedAt: { type: Date, default: null },
    flaggedPairs: [{ type: mongoose.Schema.Types.Mixed }],
    errorMessage: { type: String, maxlength: 1000, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("SimilarityReport", similarityReportSchema);
