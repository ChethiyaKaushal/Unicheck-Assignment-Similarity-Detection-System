const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Assignment = require("../models/Assignment");
const Question = require("../models/Question");
const Submission = require("../models/Submission");
const { extractPdfText } = require("../services/questionProcessingService");
const UPLOAD_DIR = path.join(__dirname, "..", "private_uploads");

function canonical(label) {
    return label.toLowerCase().replace(/^q\s*/, "").replace(/[.\s]/g, "").replace(/[()]/g, "");
}
function extractAnswers(text, questions) {
    const known = new Map(questions.map((question) => [canonical(question.questionNumber), question]));
    const lines = (text || "").replace(/\r/g, "").split("\n");
    const found = [];
    let current = null;
    const marker = /^\s*(?:Q\s*)?(\d+(?:\s*\([a-z0-9ivx]+\))*)\s*[).:-]?\s*(.*)$/i;
    for (const line of lines) {
        const match = line.match(marker);
        const question = match && known.get(canonical(match[1]));
        if (question) {
            current = { questionId: question._id, answerText: match[2].trim(), matchingStatus: "matched" };
            found.push(current);
        } else if (current && line.trim()) {
            current.answerText += ` ${line.trim()}`;
        }
    }
    return found.filter((answer) => answer.answerText.trim());
}
async function submitAnswers(req, res) {
    if (req.user.mustChangePassword) return res.status(403).json({ message: "Please change your password before continuing." });
    if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    if (!req.file) return res.status(400).json({ message: "Upload an answer PDF." });
    if (req.file.buffer.subarray(0, 5).toString() !== "%PDF-") return res.status(400).json({ message: "The uploaded file is not a valid PDF." });
    const assignment = await Assignment.findOne({ _id: req.params.assignmentId, status: "published" });
    if (!assignment) return res.status(404).json({ message: "Published assignment not found." });
    if (assignment.dueAt && assignment.dueAt.getTime() < Date.now()) return res.status(410).json({ message: "The submission deadline has passed." });
    const questions = await Question.find({ assignmentId: assignment._id, verificationStatus: { $ne: "rejected" } }).sort({ createdAt: 1 });
    let extraction;
    try { extraction = await extractPdfText(req.file.buffer); }
    catch { return res.status(422).json({ message: "Could not read the answer PDF. Use a text PDF or check that OCR is installed." }); }
    const answers = extractAnswers(extraction.text, questions);
    if (!answers.length) return res.status(422).json({ message: "No answer labels matched the published questions. Label answers with question numbers such as Q1, Q2(a), or Q2(a)(i)." });
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}.pdf`;
    const filePath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(filePath, req.file.buffer, { flag: "wx", mode: 0o600 });
    try {
        const submission = await Submission.create({ studentId: req.user.userId, assignmentId: assignment._id, pdfFile: path.relative(path.join(__dirname, ".."), filePath), answers, status: answers.length === questions.length ? "processed" : "needs_review" });
        return res.status(201).json({ message: "Submission received.", submission: { id: String(submission._id), assignmentId: String(assignment._id), status: submission.status, mappedAnswers: answers.length, questionsAvailable: questions.length, extractionMethod: extraction.extractionMethod } });
    } catch (error) {
        await fs.unlink(filePath).catch(() => {});
        if (error.code === 11000) return res.status(409).json({ message: "You have already submitted this assignment." });
        throw error;
    }
}
async function listMySubmissions(req, res) {
    if (req.user.mustChangePassword) return res.status(403).json({ message: "Please change your password before continuing." });
    const submissions = await Submission.find({ studentId: req.user.userId }).populate("assignmentId", "title").sort({ createdAt: -1 }).lean();
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
module.exports = { submitAnswers, listMySubmissions };
