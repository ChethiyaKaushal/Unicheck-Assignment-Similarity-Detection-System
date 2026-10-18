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
        }
    },
    {
        timestamps: true
    }
);

// Prevent a student from submitting the same assignment more than once.
// Remove this constraint later if resubmissions are required.
submissionSchema.index(
    { studentId: 1, assignmentId: 1 },
    { unique: true }
);

module.exports = mongoose.model("Submission", submissionSchema);