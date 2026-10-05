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

        answerPaper: {
            type: String,
            required: true
        },

        answers: [
            {
                questionNumber: {
                    type: Number,
                    required: true
                },

                answerText: {
                    type: String,
                    required: true,
                    trim: true
                }
            }
        ],

        submittedAt: {
            type: Date,
            default: Date.now
        },

        status: {
            type: String,
            enum: ["submitted", "processing", "processed", "failed"],
            default: "submitted"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Submission", submissionSchema);