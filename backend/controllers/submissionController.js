const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Assignment = require("../models/Assignment");
const Question = require("../models/Question");
const Submission = require("../models/Submission");
const Module = require("../models/Module");
const { extractPdfText } = require("../services/questionProcessingService");
const { extractAnswers } = require("../services/answerExtractionService");
const UPLOAD_DIR = path.join(__dirname, "..", "private_uploads");
async function submitAnswers(req, res) {
    if (req.user.mustChangePassword) return res.status(403).json({ message: "Please change your password before continuing." });
    if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    if (!req.file) return res.status(400).json({ message: "Upload an answer PDF." });
    if (req.file.buffer.subarray(0, 5).toString() !== "%PDF-") return res.status(400).json({ message: "The uploaded file is not a valid PDF." });
    const assignment = await Assignment.findOne({ _id: req.params.assignmentId, status: "published" });
    if (!assignment) return res.status(404).json({ message: "Published assignment not found." });
    if (assignment.dueAt && assignment.dueAt.getTime() <= Date.now()) return res.status(410).json({ message: "The submission deadline has passed." });
    if (assignment.moduleId) {
        if (!(await Module.exists({ _id: assignment.moduleId, studentIds: req.user.userId }))) return res.status(403).json({ message: "Join this assignment's module before submitting." });
    }
    const questions = await Question.find({ assignmentId: assignment._id }).sort({ createdAt: 1 });
    let extraction;
    try { extraction = await extractPdfText(req.file.buffer); }
    catch { return res.status(422).json({ message: "Could not read the answer PDF. Use a text PDF or check that OCR is installed." }); }
    const answers = extractAnswers(extraction.text, questions);
    if (!answers.length) return res.status(422).json({ message: "No answer labels matched the published questions. Label answers with question numbers such as Q1, Q2(a), or Q2(a)(i)." });
    const parentsWithChildren = new Set(questions.filter((question) => question.parentQuestionId).map((question) => String(question.parentQuestionId)));
    const expectedLeafQuestionIds = questions.filter((question) => question.verificationStatus !== "rejected" && question.questionText.trim() && !parentsWithChildren.has(String(question._id))).map((question) => String(question._id));
    const mappedIds = new Set(answers.map((answer) => String(answer.questionId)));
    const allExpectedAnswersMapped = expectedLeafQuestionIds.every((questionId) => mappedIds.has(questionId));
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}.pdf`;
    const filePath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(filePath, req.file.buffer, { flag: "wx", mode: 0o600 });
    try {
        const submission = await Submission.create({ studentId: req.user.userId, assignmentId: assignment._id, pdfFile: path.relative(path.join(__dirname, ".."), filePath), answers, status: allExpectedAnswersMapped ? "processed" : "needs_review" });
        if (!(await Assignment.exists({ _id: assignment._id, status: "published" }))) {
            await Submission.deleteOne({ _id: submission._id });
            await fs.unlink(filePath).catch(() => {});
            return res.status(410).json({ message: "This assignment is no longer available." });
        }
        return res.status(201).json({ message: "Submission received.", submission: { id: String(submission._id), assignmentId: String(assignment._id), status: submission.status, mappedAnswers: answers.length, questionsAvailable: questions.length, extractionMethod: extraction.extractionMethod } });
    } catch (error) {
        await fs.unlink(filePath).catch(() => {});
        if (error.code === 11000) return res.status(409).json({ message: "You have already submitted this assignment." });
        throw error;
    }
}
async function listMySubmissions(req, res) {
    if (req.user.mustChangePassword) return res.status(403).json({ message: "Please change your password before continuing." });
    const submissions = await Submission.find({ studentId: req.user.userId, active: { $ne: false } }).populate("assignmentId", "title").sort({ createdAt: -1 }).lean();
    return res.json({ submissions: submissions.map((item) => ({
        id: String(item._id), assignmentId: String(item.assignmentId._id), assignmentTitle: item.assignmentId.title,
        status: item.status, answerCount: item.answers.length, createdAt: item.createdAt,
        similarityFeedbacks: (item.similarityFeedbacks || []).map((feedback) => ({
            releaseId: feedback.releaseId, releasedAt: feedback.releasedAt,
            overallScore: feedback.overallScore, level: feedback.level,
            threshold: feedback.threshold, note: feedback.note,
            questions: feedback.questions.map((question) => ({ questionNumber: question.questionNumber, score: question.score, level: question.level, confidence: question.confidence, confidenceNote: question.confidenceNote, commonAnswerPercent: question.commonAnswerPercent }))
        }))
    })) });
}

async function deleteMySubmission(req, res) {
    if (req.user.mustChangePassword) return res.status(403).json({ message: "Please change your password before continuing." });
    if (!mongoose.Types.ObjectId.isValid(req.params.submissionId)) return res.status(400).json({ message: "Invalid submission id." });
    const submission = await Submission.findOne({ _id: req.params.submissionId, studentId: req.user.userId, active: { $ne: false } });
    if (!submission) return res.status(404).json({ message: "Your active submission was not found." });
    const assignment = await Assignment.findById(submission.assignmentId).select("dueAt status");
    if (!assignment || assignment.status !== "published") return res.status(404).json({ message: "Assignment not found." });
    if (assignment.dueAt && assignment.dueAt.getTime() <= Date.now()) return res.status(410).json({ message: "The deadline has passed. The submission can no longer be replaced." });
    await Submission.deleteOne({ _id: submission._id, studentId: req.user.userId });
    const filePath = path.resolve(__dirname, "..", submission.pdfFile);
    const privateRoot = path.resolve(UPLOAD_DIR);
    if (filePath.startsWith(privateRoot + path.sep)) await fs.unlink(filePath).catch(() => {});
    return res.json({ message: "Submission removed. You can upload the corrected PDF before the deadline." });
}

module.exports = { submitAnswers, listMySubmissions, deleteMySubmission };
