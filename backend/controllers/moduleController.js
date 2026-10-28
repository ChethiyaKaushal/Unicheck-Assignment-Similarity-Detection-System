const crypto = require("crypto");
const mongoose = require("mongoose");
const Module = require("../models/Module");

async function listLecturerModules(req, res) {
    const modules = await Module.find({ lecturerId: req.user.userId }).populate("studentIds", "username email").sort({ createdAt: -1 }).lean();
    return res.json({ modules: modules.map((item) => ({ id: String(item._id), name: item.name, code: item.code, enrollmentCode: item.enrollmentCode, description: item.description, studentCount: item.studentIds.length, students: item.studentIds.map((student) => ({ id: String(student._id), username: student.username, email: student.email })) })) });
}

async function createModule(req, res) {
    const { name, code, description = "" } = req.body || {};
    if (typeof name !== "string" || !name.trim() || name.trim().length > 120 || typeof code !== "string" || !/^[A-Z0-9_-]{2,24}$/i.test(code.trim()) || typeof description !== "string" || description.length > 1000) return res.status(400).json({ message: "Enter a module name, a 2–24 character code, and an optional short description." });
    const enrollmentCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    try {
        const module = await Module.create({ name: name.trim(), code: code.trim().toUpperCase(), description: description.trim(), enrollmentCode, lecturerId: req.user.userId });
        return res.status(201).json({ message: "Module created.", module: { id: String(module._id), name: module.name, code: module.code, enrollmentCode: module.enrollmentCode, studentCount: 0 } });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "That module code is already used by one of your modules. Choose another code." });
        throw error;
    }
}

async function listMyModules(req, res) {
    const modules = await Module.find({ studentIds: req.user.userId }).populate("lecturerId", "username").sort({ name: 1 }).lean();
    return res.json({ modules: modules.map((item) => ({ id: String(item._id), name: item.name, code: item.code, description: item.description, lecturer: item.lecturerId?.username || "Lecturer" })) });
}

async function enroll(req, res) {
    const code = String(req.body?.enrollmentCode || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ message: "Enter the enrollment code from your lecturer." });
    const module = await Module.findOneAndUpdate({ enrollmentCode: code }, { $addToSet: { studentIds: req.user.userId } }, { new: true }).populate("lecturerId", "username");
    if (!module) return res.status(404).json({ message: "No module matches that enrollment code." });
    return res.json({ message: `Joined ${module.code} · ${module.name}.`, module: { id: String(module._id), name: module.name, code: module.code, lecturer: module.lecturerId?.username || "Lecturer" } });
}

async function removeEnrollment(req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.moduleId)) return res.status(400).json({ message: "Invalid module id." });
    const module = await Module.findOneAndUpdate({ _id: req.params.moduleId, studentIds: req.user.userId }, { $pull: { studentIds: req.user.userId } }, { new: true });
    if (!module) return res.status(404).json({ message: "Module enrollment was not found." });
    return res.json({ message: `You left ${module.code}.` });
}

module.exports = { listLecturerModules, createModule, listMyModules, enroll, removeEnrollment };
