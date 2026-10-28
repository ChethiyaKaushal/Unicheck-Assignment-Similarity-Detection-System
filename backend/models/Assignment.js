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

        moduleName: {
            type: String,
            trim: true,
            default: "",
            maxlength: 120
        },

        dueAt: {
            type: Date,
            default: null
        },

        durationMinutes: {
            type: Number,
            min: 1,
            max: 1440,
            default: null
        },

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
            enum: ["draft", "processing", "review", "published"],
            default: "draft"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Assignment", assignmentSchema);