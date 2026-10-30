const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
    {
        assignmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Assignment",
            required: true
        },

        questionNumber: {
            type: String,
            required: true,
            trim: true
        },

        questionText: {
        type: String,
        trim: true,
        default: ""
        },

        parentQuestionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Question",
            default: null
        },

        verificationStatus: {
            type: String,
            enum: ["pending", "verified", "needs_correction", "rejected"],
            default: "pending"
        },

        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        verifiedAt: {
            type: Date,
            default: null
        },

        rejectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        rejectedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Prevent duplicate question labels within the same assignment.
questionSchema.index(
    { assignmentId: 1, questionNumber: 1 },
    { unique: true }
);

module.exports = mongoose.model("Question", questionSchema);