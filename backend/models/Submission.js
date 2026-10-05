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
                questionNumber: {
                    type: Number,
                    required: true
                },

                question: {
                    type: String,
                    required: true
                },

                answer: {
                    type: String,
                    required: true
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Submission", submissionSchema);