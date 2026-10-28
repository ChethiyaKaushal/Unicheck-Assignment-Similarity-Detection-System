const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Module = require("../models/Module");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const AuditLog = require("../models/AuditLog");

const validId = (id) => mongoose.Types.ObjectId.isValid(id);
async function audit(req, action, targetType, targetId, summary) {
    await AuditLog.create({ actorId: req.user.userId, action, targetType, targetId: String(targetId || ""), summary });
}

async function overview(req, res) {
    const [users, modules, assignments, submissions, recentLogs] = await Promise.all([
        User.aggregate([{ $group: { _id: "$role", total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } } } }]),
        Module.countDocuments({ isArchived: { $ne: true } }),
        Assignment.countDocuments({ status: { $ne: "deleted" }, adminArchived: { $ne: true } }),
        Submission.countDocuments({}),
        AuditLog.find({}).sort({ createdAt: -1 }).limit(8).populate("actorId", "username email").lean()
    ]);
    return res.json({ users, modules, assignments, submissions, recentLogs: recentLogs.map(formatLog) });
}

function formatLog(item) {
    return { id: String(item._id), actor: item.actorId?.username || "System", action: item.action, targetType: item.targetType, summary: item.summary, createdAt: item.createdAt };
}

async function listActivity(req, res) {
    const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(200).populate("actorId", "username email").lean();
    return res.json({ logs: logs.map(formatLog) });
}

async function listUsers(req, res) {
    const users = await User.find({}).select("username email role status mustChangePassword createdAt").sort({ role: 1, username: 1 }).lean();
    return res.json({ users: users.map((user) => ({ id: String(user._id), username: user.username, email: user.email, role: user.role, status: user.status, mustChangePassword: user.mustChangePassword, createdAt: user.createdAt })) });
}

async function createUser(req, res) {
    const { username, email, password, role } = req.body || {};
    if (typeof username !== "string" || !username.trim() || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== "string" || password.length < 8 || password.length > 72 || !["student", "lecturer", "admin"].includes(role)) {
        return res.status(400).json({ message: "Provide a username, valid email, password of 8–72 characters, and a valid role." });
    }
    try {
        const user = await User.create({ username: username.trim(), email: email.trim().toLowerCase(), password: await bcrypt.hash(password, 12), role, status: "active", mustChangePassword: true });
        await audit(req, "user.create", "user", user._id, `Created ${role} account ${user.email}.`);
        return res.status(201).json({ message: "Account created. The user must change the temporary password at first sign-in.", user: { id: String(user._id), username: user.username, email: user.email, role: user.role, status: user.status, mustChangePassword: true } });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "Username or email is already registered." });
        throw error;
    }
}

async function updateUser(req, res) {
    if (!validId(req.params.userId)) return res.status(400).json({ message: "Invalid user id." });
    const { username, email, role, status } = req.body || {};
    const updates = {};
    const existing = await User.findById(req.params.userId).select("role");
    if (!existing) return res.status(404).json({ message: "User not found." });
    if (username !== undefined) { if (typeof username !== "string" || !username.trim()) return res.status(400).json({ message: "Username cannot be empty." }); updates.username = username.trim(); }
    if (email !== undefined) { if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ message: "Enter a valid email." }); updates.email = email.trim().toLowerCase(); }
    if (role !== undefined) {
        if (!["student", "lecturer", "admin"].includes(role)) return res.status(400).json({ message: "Choose a valid account role." });
        if (String(req.user.userId) === req.params.userId && role !== "admin") return res.status(400).json({ message: "You cannot change your own admin role." });
        if (role !== existing.role) {
            const [submissions, assignments, modules] = await Promise.all([
                Submission.exists({ studentId: req.params.userId }),
                Assignment.exists({ lecturerId: req.params.userId }),
                Module.exists({ $or: [{ lecturerId: req.params.userId }, { studentIds: req.params.userId }] })
            ]);
            if (submissions || assignments || modules) return res.status(409).json({ message: "This user has linked academic records. Create a new account for the new role to preserve those records." });
        }
        updates.role = role;
    }
    if (status !== undefined) { if (!["active", "inactive"].includes(status)) return res.status(400).json({ message: "Choose active or inactive status." }); if (String(req.user.userId) === req.params.userId && status !== "active") return res.status(400).json({ message: "You cannot deactivate your own admin account." }); updates.status = status; }
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { $set: updates }, { new: true, runValidators: true }).select("username email role status mustChangePassword");
        await audit(req, "user.update", "user", user._id, `Updated account ${user.email}.`);
        return res.json({ user: { id: String(user._id), username: user.username, email: user.email, role: user.role, status: user.status, mustChangePassword: user.mustChangePassword } });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "Username or email is already registered." });
        throw error;
    }
}

async function resetPassword(req, res) {
    if (!validId(req.params.userId)) return res.status(400).json({ message: "Invalid user id." });
    const user = await User.findById(req.params.userId).select("email");
    if (!user) return res.status(404).json({ message: "User not found." });
    const temporaryPassword = crypto.randomBytes(12).toString("base64url");
    user.password = await bcrypt.hash(temporaryPassword, 12);
    user.mustChangePassword = true;
    await user.save();
    await audit(req, "user.password_reset", "user", user._id, `Reset password for ${user.email}.`);
    return res.json({ message: "Temporary password generated. Copy it now; it will not be shown again.", temporaryPassword });
}

async function deleteUser(req, res) {
    if (!validId(req.params.userId)) return res.status(400).json({ message: "Invalid user id." });
    if (String(req.user.userId) === req.params.userId) return res.status(400).json({ message: "You cannot delete your own admin account." });
    const user = await User.findById(req.params.userId).select("email role");
    if (!user) return res.status(404).json({ message: "User not found." });
    const [submissionCount, ownedAssignments, taughtModules, enrolledModules] = await Promise.all([
        Submission.countDocuments({ studentId: user._id }), Assignment.countDocuments({ lecturerId: user._id }), Module.countDocuments({ lecturerId: user._id }), Module.countDocuments({ studentIds: user._id })
    ]);
    if (submissionCount || ownedAssignments || taughtModules || enrolledModules) return res.status(409).json({ message: "This account has academic records or module links. Deactivate it to preserve those records." });
    await User.deleteOne({ _id: user._id });
    await audit(req, "user.delete", "user", user._id, `Deleted unused ${user.role} account ${user.email}.`);
    return res.json({ message: "Unused account deleted." });
}

async function listModules(req, res) {
    const modules = await Module.find({}).populate("lecturerId", "username email").populate("studentIds", "username email").sort({ createdAt: -1 }).lean();
    const ids = modules.map((item) => item._id);
    const counts = await Assignment.aggregate([{ $match: { moduleId: { $in: ids }, status: { $ne: "deleted" } } }, { $group: { _id: "$moduleId", count: { $sum: 1 } } }]);
    const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
    return res.json({ modules: modules.map((item) => ({ id: String(item._id), name: item.name, code: item.code, enrollmentCode: item.enrollmentCode, description: item.description, isArchived: item.isArchived === true, lecturer: item.lecturerId ? { id: String(item.lecturerId._id), username: item.lecturerId.username, email: item.lecturerId.email } : null, studentCount: item.studentIds.length, assignmentCount: countMap.get(String(item._id)) || 0 })) });
}

async function createModule(req, res) {
    const { name, code, description = "", lecturerId } = req.body || {};
    if (typeof name !== "string" || !name.trim() || name.trim().length > 120 || typeof code !== "string" || !/^[A-Z0-9_-]{2,24}$/i.test(code.trim()) || typeof description !== "string" || description.length > 1000 || !validId(lecturerId)) return res.status(400).json({ message: "Provide a module name, valid code, description, and lecturer." });
    const lecturer = await User.findOne({ _id: lecturerId, role: "lecturer", status: "active" }).select("_id");
    if (!lecturer) return res.status(400).json({ message: "Choose an active lecturer account." });
    try {
        const module = await Module.create({ name: name.trim(), code: code.trim().toUpperCase(), description: description.trim(), enrollmentCode: crypto.randomBytes(4).toString("hex").toUpperCase(), lecturerId });
        await audit(req, "module.create", "module", module._id, `Created module ${module.code} · ${module.name}.`);
        return res.status(201).json({ module: { id: String(module._id), name: module.name, code: module.code, enrollmentCode: module.enrollmentCode, lecturer: lecturerId } });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "That lecturer already has a module with this code." });
        throw error;
    }
}

async function updateModule(req, res) {
    if (!validId(req.params.moduleId)) return res.status(400).json({ message: "Invalid module id." });
    const { name, code, description, lecturerId } = req.body || {};
    const module = await Module.findById(req.params.moduleId);
    if (!module) return res.status(404).json({ message: "Module not found." });
    if (name !== undefined) { if (typeof name !== "string" || !name.trim() || name.trim().length > 120) return res.status(400).json({ message: "Module name is required and must be under 120 characters." }); module.name = name.trim(); }
    if (code !== undefined) { if (typeof code !== "string" || !/^[A-Z0-9_-]{2,24}$/i.test(code.trim())) return res.status(400).json({ message: "Module code must be 2–24 letters, numbers, underscores, or hyphens." }); module.code = code.trim().toUpperCase(); }
    if (description !== undefined) { if (typeof description !== "string" || description.length > 1000) return res.status(400).json({ message: "Description must be under 1000 characters." }); module.description = description.trim(); }
    if (lecturerId !== undefined) { if (!validId(lecturerId) || !await User.exists({ _id: lecturerId, role: "lecturer", status: "active" })) return res.status(400).json({ message: "Choose an active lecturer account." }); module.lecturerId = lecturerId; }
    try {
        await module.save();
        await Assignment.updateMany({ moduleId: module._id }, { $set: { moduleCode: module.code, moduleName: module.name, lecturerId: module.lecturerId } });
        await audit(req, "module.update", "module", module._id, `Updated module ${module.code} · ${module.name}.`);
        return res.json({ message: "Module updated." });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "That lecturer already has a module with this code." });
        throw error;
    }
}

async function setModuleArchived(req, res) {
    if (!validId(req.params.moduleId)) return res.status(400).json({ message: "Invalid module id." });
    const isArchived = req.body?.isArchived;
    if (typeof isArchived !== "boolean") return res.status(400).json({ message: "Provide isArchived true or false." });
    const module = await Module.findByIdAndUpdate(req.params.moduleId, { $set: { isArchived, archivedAt: isArchived ? new Date() : null } }, { new: true });
    if (!module) return res.status(404).json({ message: "Module not found." });
    await audit(req, isArchived ? "module.archive" : "module.restore", "module", module._id, `${isArchived ? "Archived" : "Restored"} module ${module.code}.`);
    return res.json({ message: isArchived ? "Module archived. Existing records are preserved." : "Module restored." });
}

async function listAssignments(req, res) {
    const assignments = await Assignment.find({ status: { $ne: "deleted" } }).populate("lecturerId", "username email").populate("moduleId", "name code isArchived").sort({ createdAt: -1 }).lean();
    const ids = assignments.map((item) => item._id);
    const counts = await Submission.aggregate([{ $match: { assignmentId: { $in: ids } } }, { $group: { _id: "$assignmentId", count: { $sum: 1 } } }]);
    const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
    return res.json({ assignments: assignments.map((item) => ({ id: String(item._id), title: item.title, description: item.description, status: item.status, dueAt: item.dueAt, isArchived: item.adminArchived === true, lecturer: item.lecturerId ? { id: String(item.lecturerId._id), username: item.lecturerId.username, email: item.lecturerId.email } : null, module: item.moduleId ? { id: String(item.moduleId._id), name: item.moduleId.name, code: item.moduleId.code } : null, submissionCount: countMap.get(String(item._id)) || 0, similarityStatus: item.similarityStatus })) });
}

async function setAssignmentArchived(req, res) {
    if (!validId(req.params.assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    const isArchived = req.body?.isArchived;
    if (typeof isArchived !== "boolean") return res.status(400).json({ message: "Provide isArchived true or false." });
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment || assignment.status === "deleted") return res.status(404).json({ message: "Assignment not found." });
    if (assignment.status === "processing" || assignment.similarityStatus === "processing") return res.status(409).json({ message: "Wait for processing to finish before archiving this assignment." });
    assignment.adminArchived = isArchived;
    assignment.adminArchivedAt = isArchived ? new Date() : null;
    await assignment.save();
    await audit(req, isArchived ? "assignment.archive" : "assignment.restore", "assignment", assignment._id, `${isArchived ? "Archived" : "Restored"} assignment ${assignment.title}.`);
    return res.json({ message: isArchived ? "Assignment archived. Submissions and reports are preserved." : "Assignment restored." });
}

module.exports = { overview, listActivity, listUsers, createUser, updateUser, resetPassword, deleteUser, listModules, createModule, updateModule, setModuleArchived, listAssignments, setAssignmentArchived };
