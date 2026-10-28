const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true,
            default: ""
        },

        moduleCode: {
            type: String,
            trim: true,
            default: "",
            maxlength: 24
        },

        moduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Module", default: null },

        moduleName: {
            type: String,
            trim: true,
            default: "",
            maxlength: 120
        },

        dueAt: {
            type: Date,
            required: true
        },

        durationMinutes: {
            type: Number,
            min: 1,
            max: 1440,
            default: null
        },

        similarityStatus: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
        similarityStartedAt: { type: Date, default: null },
        similarityCompletedAt: { type: Date, default: null },
        adminArchived: { type: Boolean, default: false },
        adminArchivedAt: { type: Date, default: null },

        lecturerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        questionPaper: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: ["draft", "processing", "review", "published", "deleted"],
            default: "draft"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
