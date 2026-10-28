const mongoose = require("mongoose");

const moduleSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 24 },
    enrollmentCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, trim: true, default: "", maxlength: 1000 },
    lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

moduleSchema.index({ lecturerId: 1, code: 1 }, { unique: true });
moduleSchema.index({ lecturerId: 1, createdAt: -1 });

module.exports = mongoose.model("Module", moduleSchema);
