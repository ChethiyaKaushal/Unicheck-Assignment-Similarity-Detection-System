const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        assignmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Assignment",
            required: true
        },

        pdfFile: {
            type: String,
            required: true
        },

        answers: [
            {
                questionId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Question",
                    required: true
                },

                answerText: {
                    type: String,
                    required: true,
                    trim: true
                },

                matchingStatus: {
                    type: String,
                    enum: [
                        "matched",
                        "needs_review",
                        "unmatched"
                    ],
                    default: "needs_review"
                }
            }
        ],

        status: {
            type: String,
            enum: [
                "submitted",
                "processing",
                "processed",
                "needs_review",
                "failed"
            ],
            default: "submitted"
        },

        processingError: {
            type: String,
            default: null
        },

        similarityFeedbacks: [{
            pairKey: { type: String, required: true },
            releaseId: { type: String, required: true },
            releasedAt: { type: Date, required: true },
            releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            overallScore: { type: Number, min: 0, max: 100, required: true },
            level: { type: String, enum: ["low", "medium", "high"], required: true },
            threshold: { type: Number, default: 70 },
            note: { type: String, trim: true, maxlength: 1000, default: "" },
            questions: [{
                questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
                questionNumber: { type: String, required: true },
                score: { type: Number, min: 0, max: 100, required: true },
                level: { type: String, enum: ["low", "medium", "high"], required: true },
                confidence: { type: String, enum: ["low", "medium", "high"], default: "low" },
                confidenceNote: { type: String, trim: true, maxlength: 300, default: "" },
                commonAnswerPercent: { type: Number, min: 0, max: 100, default: 0 }
            }]
        }]

    },
    {
        timestamps: true
    }
);

submissionSchema.index(
    { studentId: 1, assignmentId: 1 },
    { unique: true }
);

module.exports = mongoose.model("Submission", submissionSchema);
