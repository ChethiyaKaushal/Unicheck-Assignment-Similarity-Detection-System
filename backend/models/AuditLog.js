const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true, maxlength: 80 },
    targetType: { type: String, required: true, maxlength: 40 },
    targetId: { type: String, default: "", maxlength: 80 },
    summary: { type: String, required: true, maxlength: 300 }
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
module.exports = mongoose.model("AuditLog", auditLogSchema);
