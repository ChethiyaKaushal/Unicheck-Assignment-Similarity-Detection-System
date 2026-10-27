const mongoose = require("mongoose");
const Assignment = require("../models/Assignment");
const Question = require("../models/Question");
const Submission = require("../models/Submission");
const { compareSubmissions } = require("../services/similarityService");

const readyUser = (req, res) => {
    if (req.user.mustChangePassword) {
        res.status(403).json({ message: "Please change your password before continuing." });
        return false;
    }
    return true;
};
const validId = (value) => mongoose.Types.ObjectId.isValid(value);
const publicQuestion = (question) => ({
    id: String(question._id), questionNumber: question.questionNumber,
    questionText: question.questionText, parentQuestionId: question.parentQuestionId ? String(question.parentQuestionId) : null,
    marks: question.marks, verificationStatus: question.verificationStatus
});

async function listLecturerAssignments(req, res) {
    if (!readyUser(req, res)) return;
    const assignments = await Assignment.find({ lecturerId: req.user.userId }).sort({ createdAt: -1 }).lean();
    const ids = assignments.map((item) => item._id);
    const counts = await Question.aggregate([{ $match: { assignmentId: { $in: ids }, questionText: { $regex: "\\S" } } }, { $group: { _id: "$assignmentId", count: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ["$verificationStatus", "verified"] }, 0, 1] } } } }]);
    const byId = new Map(counts.map((item) => [String(item._id), item]));
    return res.json({ assignments: assignments.map((item) => ({ ...item, id: String(item._id), questionCount: byId.get(String(item._id))?.count || 0, pendingQuestions: byId.get(String(item._id))?.pending || 0 })) });
}

async function getLecturerAssignment(req, res) {
    if (!readyUser(req, res)) return;
    if (!validId(req.params.assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    const assignment = await Assignment.findOne({ _id: req.params.assignmentId, lecturerId: req.user.userId }).lean();
    if (!assignment) return res.status(404).json({ message: "Assignment not found." });
    const questions = await Question.find({ assignmentId: assignment._id, questionText: { $regex: "\\S" } }).sort({ createdAt: 1, _id: 1 }).lean();
    return res.json({ assignment: { ...assignment, id: String(assignment._id) }, questions: questions.map(publicQuestion) });
}

async function updateQuestion(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId, questionId } = req.params;
    if (!validId(assignmentId) || !validId(questionId)) return res.status(400).json({ message: "Invalid id." });
    const assignment = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId, status: "review" });
    if (!assignment) return res.status(404).json({ message: "Reviewable assignment not found." });
    const question = await Question.findOne({ _id: questionId, assignmentId });
    if (!question) return res.status(404).json({ message: "Question not found." });
    const { questionNumber, questionText, marks, parentQuestionId } = req.body;
    if (questionNumber !== undefined) {
        if (typeof questionNumber !== "string" || !questionNumber.trim()) return res.status(400).json({ message: "Question number is required." });
        question.questionNumber = questionNumber.trim();
    }
    if (questionText !== undefined) {
        if (typeof questionText !== "string" || !questionText.trim()) return res.status(400).json({ message: "Question text is required." });
        question.questionText = questionText.trim();
    }
    if (marks !== undefined) {
        if (marks !== null && (!Number.isFinite(Number(marks)) || Number(marks) < 0)) return res.status(400).json({ message: "Marks must be zero or greater." });
        question.marks = marks === null || marks === "" ? null : Number(marks);
    }
    if (parentQuestionId !== undefined) {
        if (parentQuestionId && !validId(parentQuestionId)) return res.status(400).json({ message: "Invalid parent question id." });
        if (parentQuestionId && String(parentQuestionId) === String(question._id)) return res.status(400).json({ message: "A question cannot parent itself." });
        if (parentQuestionId && !(await Question.exists({ _id: parentQuestionId, assignmentId }))) return res.status(400).json({ message: "Parent must belong to the same assignment." });
        question.parentQuestionId = parentQuestionId || null;
    }
    question.verificationStatus = "pending";
    question.verifiedBy = null;
    question.verifiedAt = null;
    try { await question.save(); }
    catch (error) { if (error.code === 11000) return res.status(409).json({ message: "That question number is already in use." }); throw error; }
    return res.json({ question: publicQuestion(question) });
}

async function verifyQuestion(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId, questionId } = req.params;
    if (!validId(assignmentId) || !validId(questionId)) return res.status(400).json({ message: "Invalid id." });
    const assignment = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId, status: "review" });
    if (!assignment) return res.status(404).json({ message: "Reviewable assignment not found." });
    const question = await Question.findOne({ _id: questionId, assignmentId });
    if (!question) return res.status(404).json({ message: "Question not found." });
    const hasChildren = await Question.exists({ parentQuestionId: question._id, assignmentId });
    if (!question.questionText.trim() && !hasChildren) return res.status(400).json({ message: "Add question text before verifying." });
    question.verificationStatus = "verified";
    question.verifiedBy = req.user.userId;
    question.verifiedAt = new Date();
    await question.save();
    return res.json({ question: publicQuestion(question) });
}

async function verifyAllQuestions(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId } = req.params;
    if (!validId(assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    const assignment = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId, status: "review" });
    if (!assignment) return res.status(404).json({ message: "Reviewable assignment not found." });
    const result = await Question.updateMany(
        { assignmentId, questionText: { $regex: "\\S" } },
        { $set: { verificationStatus: "verified", verifiedBy: req.user.userId, verifiedAt: new Date() } }
    );
    if (!result.matchedCount) return res.status(400).json({ message: "There are no non-empty questions to verify." });
    return res.json({ message: `Verified ${result.matchedCount} questions.`, verifiedCount: result.matchedCount });
}
async function publishAssignment(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId } = req.params;
    if (!validId(assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    const assignment = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId, status: "review" });
    if (!assignment) return res.status(404).json({ message: "Reviewable assignment not found." });
    const questions = await Question.find({ assignmentId, questionText: { $regex: "\\S" } });
    if (!questions.length) return res.status(400).json({ message: "Add at least one question before publishing." });
    const needsReview = questions.filter((question) => question.verificationStatus !== "verified");
    if (needsReview.length) return res.status(409).json({ message: `Verify all questions before publishing. ${needsReview.length} remain.` });
    assignment.status = "published";
    await assignment.save();
    return res.json({ message: "Assignment published.", assignment: { id: String(assignment._id), title: assignment.title, status: assignment.status } });
}

async function listPublishedAssignments(req, res) {
    if (!readyUser(req, res)) return;
    const assignments = await Assignment.find({ status: "published" }).select("title description createdAt lecturerId").populate("lecturerId", "username").sort({ createdAt: -1 }).lean();
    return res.json({ assignments: assignments.map((item) => ({ id: String(item._id), title: item.title, description: item.description, lecturer: item.lecturerId?.username || "Lecturer", createdAt: item.createdAt })) });
}

async function listSubmissions(req, res) {
    if (!readyUser(req, res)) return;
    const owned = await Assignment.find({ lecturerId: req.user.userId }).select("_id").lean();
    const assignmentIds = owned.map((item) => item._id);
    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } }).populate("studentId", "username email").populate("assignmentId", "title").sort({ createdAt: -1 }).lean();
    return res.json({ submissions: submissions.map((item) => ({ id: String(item._id), assignmentId: String(item.assignmentId._id), assignmentTitle: item.assignmentId.title, student: { id: String(item.studentId._id), username: item.studentId.username, email: item.studentId.email }, status: item.status, answerCount: item.answers.length, createdAt: item.createdAt })) });
}

async function getSimilarityReport(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId } = req.params;
    if (!validId(assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    const assignment = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId });
    if (!assignment) return res.status(404).json({ message: "Assignment not found." });
    const [questions, submissions] = await Promise.all([
        Question.find({ assignmentId, questionText: { $regex: "\\S" } }).sort({ createdAt: 1, _id: 1 }).lean(),
        Submission.find({ assignmentId, status: { $in: ["processed", "needs_review"] } }).populate("studentId", "username email").sort({ createdAt: 1 }).lean()
    ]);
    return res.json({ assignment: { id: String(assignment._id), title: assignment.title }, submissionCount: submissions.length, pairs: compareSubmissions(submissions, questions), note: "Scores compare extracted answer text question by question. Review matched text and context before drawing conclusions." });
}

module.exports = { listLecturerAssignments, getLecturerAssignment, updateQuestion, verifyQuestion, verifyAllQuestions, publishAssignment, listPublishedAssignments, listSubmissions, getSimilarityReport };
