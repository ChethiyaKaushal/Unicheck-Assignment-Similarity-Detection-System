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
const publicQuestion = (question, parentQuestionNumber = null) => ({
    id: String(question._id), questionNumber: question.questionNumber,
    questionText: question.questionText,
    parentQuestionId: question.parentQuestionId ? String(question.parentQuestionId) : null,
    parentQuestionNumber, verificationStatus: question.verificationStatus,
    rejectedAt: question.rejectedAt, createdAt: question.createdAt, updatedAt: question.updatedAt
});

async function listLecturerAssignments(req, res) {
    if (!readyUser(req, res)) return;
    const assignments = await Assignment.find({ lecturerId: req.user.userId }).sort({ createdAt: -1 }).lean();
    const ids = assignments.map((item) => item._id);
    const counts = await Question.aggregate([{ $match: { assignmentId: { $in: ids }, questionText: { $regex: "\\S" }, verificationStatus: { $ne: "rejected" } } }, { $group: { _id: "$assignmentId", count: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ["$verificationStatus", "verified"] }, 0, 1] } } } }]);
    const byId = new Map(counts.map((item) => [String(item._id), item]));
    return res.json({ assignments: assignments.map((item) => ({ ...item, id: String(item._id), questionCount: byId.get(String(item._id))?.count || 0, pendingQuestions: byId.get(String(item._id))?.pending || 0 })) });
}

async function getLecturerAssignment(req, res) {
    if (!readyUser(req, res)) return;
    if (!validId(req.params.assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    const assignment = await Assignment.findOne({ _id: req.params.assignmentId, lecturerId: req.user.userId }).lean();
    if (!assignment) return res.status(404).json({ message: "Assignment not found." });
    const questions = await Question.find({ assignmentId: assignment._id, questionText: { $regex: "\\S" } }).sort({ createdAt: 1, _id: 1 }).lean();
    const questionNumbers = new Map(questions.map((question) => [String(question._id), question.questionNumber]));
    return res.json({ assignment: { ...assignment, id: String(assignment._id) }, questions: questions.map((question) => publicQuestion(question, questionNumbers.get(String(question.parentQuestionId)) || null)) });
}

async function updateAssignmentSettings(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId } = req.params;
    if (!validId(assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    const assignment = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId, status: { $in: ["review", "published"] } });
    if (!assignment) return res.status(404).json({ message: "Assignment not found." });
    const { moduleCode, moduleName, dueAt, durationMinutes } = req.body || {};
    if (moduleCode !== undefined) {
        if (typeof moduleCode !== "string" || moduleCode.trim().length > 24) return res.status(400).json({ message: "Module code must be 24 characters or fewer." });
        assignment.moduleCode = moduleCode.trim();
    }
    if (moduleName !== undefined) {
        if (typeof moduleName !== "string" || moduleName.trim().length > 120) return res.status(400).json({ message: "Module name must be 120 characters or fewer." });
        assignment.moduleName = moduleName.trim();
    }
    if (dueAt !== undefined) {
        if (dueAt === null || dueAt === "") assignment.dueAt = null;
        else {
            const parsedDueAt = new Date(dueAt);
            if (Number.isNaN(parsedDueAt.getTime())) return res.status(400).json({ message: "Enter a valid assignment deadline." });
            assignment.dueAt = parsedDueAt;
        }
    }
    if (durationMinutes !== undefined) {
        if (durationMinutes === null || durationMinutes === "") assignment.durationMinutes = null;
        else if (!Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) < 1 || Number(durationMinutes) > 1440) return res.status(400).json({ message: "Duration must be between 1 minute and 24 hours." });
        else assignment.durationMinutes = Number(durationMinutes);
    }
    await assignment.save();
    return res.json({ assignment: { id: String(assignment._id), title: assignment.title, status: assignment.status, moduleCode: assignment.moduleCode, moduleName: assignment.moduleName, dueAt: assignment.dueAt, durationMinutes: assignment.durationMinutes } });
}

async function updateQuestion(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId, questionId } = req.params;
    if (!validId(assignmentId) || !validId(questionId)) return res.status(400).json({ message: "Invalid id." });
    const assignment = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId, status: "review" });
    if (!assignment) return res.status(404).json({ message: "Reviewable assignment not found." });
    const question = await Question.findOne({ _id: questionId, assignmentId, verificationStatus: { $ne: "rejected" } });
    if (!question) return res.status(404).json({ message: "Question not found." });
    const { questionNumber, questionText, parentQuestionId } = req.body;
    if (questionNumber !== undefined) {
        if (typeof questionNumber !== "string" || !questionNumber.trim()) return res.status(400).json({ message: "Question number is required." });
        question.questionNumber = questionNumber.trim();
    }
    if (questionText !== undefined) {
        if (typeof questionText !== "string" || !questionText.trim()) return res.status(400).json({ message: "Question text is required." });
        question.questionText = questionText.trim();
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
    const question = await Question.findOne({ _id: questionId, assignmentId, verificationStatus: { $ne: "rejected" } });
    if (!question) return res.status(404).json({ message: "Question not found." });
    const hasChildren = await Question.exists({ parentQuestionId: question._id, assignmentId });
    if (!question.questionText.trim() && !hasChildren) return res.status(400).json({ message: "Add question text before verifying." });
    question.verificationStatus = "verified";
    question.verifiedBy = req.user.userId;
    question.verifiedAt = new Date();
    await question.save();
    return res.json({ question: publicQuestion(question) });
}

async function rejectQuestion(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId, questionId } = req.params;
    if (!validId(assignmentId) || !validId(questionId)) return res.status(400).json({ message: "Invalid id." });
    const assignment = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId, status: "review" });
    if (!assignment) return res.status(404).json({ message: "Reviewable assignment not found." });
    const question = await Question.findOne({ _id: questionId, assignmentId, verificationStatus: { $ne: "rejected" } });
    if (!question) return res.status(404).json({ message: "Question block not found or already rejected." });
    question.verificationStatus = "rejected";
    question.verifiedBy = null;
    question.verifiedAt = null;
    question.rejectedBy = req.user.userId;
    question.rejectedAt = new Date();
    await question.save();
    return res.json({ message: `${question.questionNumber} rejected and excluded from the assignment.`, question: publicQuestion(question) });
}

async function restoreQuestion(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId, questionId } = req.params;
    if (!validId(assignmentId) || !validId(questionId)) return res.status(400).json({ message: "Invalid id." });
    const assignment = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId, status: "review" });
    if (!assignment) return res.status(404).json({ message: "Reviewable assignment not found." });
    const question = await Question.findOne({ _id: questionId, assignmentId, verificationStatus: "rejected" });
    if (!question) return res.status(404).json({ message: "Rejected question block not found." });
    question.verificationStatus = "pending";
    question.verifiedBy = null;
    question.verifiedAt = null;
    question.rejectedBy = null;
    question.rejectedAt = null;
    await question.save();
    return res.json({ message: `${question.questionNumber} restored to question review.`, question: publicQuestion(question) });
}

async function verifyAllQuestions(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId } = req.params;
    if (!validId(assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    const assignment = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId, status: "review" });
    if (!assignment) return res.status(404).json({ message: "Reviewable assignment not found." });
    const result = await Question.updateMany(
        { assignmentId, questionText: { $regex: "\\S" }, verificationStatus: { $ne: "rejected" } },
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
    const questions = await Question.find({ assignmentId, questionText: { $regex: "\\S" }, verificationStatus: { $ne: "rejected" } });
    if (!questions.length) return res.status(400).json({ message: "Add at least one question before publishing." });
    const needsReview = questions.filter((question) => question.verificationStatus !== "verified");
    if (needsReview.length) return res.status(409).json({ message: `Verify all questions before publishing. ${needsReview.length} remain.` });
    assignment.status = "published";
    await assignment.save();
    return res.json({ message: "Assignment published.", assignment: { id: String(assignment._id), title: assignment.title, status: assignment.status } });
}

async function listPublishedAssignments(req, res) {
    if (!readyUser(req, res)) return;
    const assignments = await Assignment.find({ status: "published" }).select("title description moduleCode moduleName dueAt durationMinutes createdAt lecturerId").populate("lecturerId", "username").sort({ createdAt: -1 }).lean();
    return res.json({ assignments: assignments.map((item) => ({ id: String(item._id), title: item.title, description: item.description, moduleCode: item.moduleCode, moduleName: item.moduleName, dueAt: item.dueAt, durationMinutes: item.durationMinutes, lecturer: item.lecturerId?.username || "Lecturer", createdAt: item.createdAt })) });
}

async function listSubmissions(req, res) {
    if (!readyUser(req, res)) return;
    const owned = await Assignment.find({ lecturerId: req.user.userId }).select("_id").lean();
    const assignmentIds = owned.map((item) => item._id);
    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } }).populate("studentId", "username email").populate("assignmentId", "title").sort({ createdAt: -1 }).lean();
    return res.json({ submissions: submissions.map((item) => ({ id: String(item._id), assignmentId: String(item.assignmentId._id), assignmentTitle: item.assignmentId.title, student: { id: String(item.studentId._id), username: item.studentId.username, email: item.studentId.email }, status: item.status, answerCount: item.answers.length, createdAt: item.createdAt })) });
}

async function getLecturerSubmission(req, res) {
    if (!readyUser(req, res)) return;
    const { submissionId } = req.params;
    if (!validId(submissionId)) return res.status(400).json({ message: "Invalid submission id." });
    const submission = await Submission.findById(submissionId)
        .populate("studentId", "username email")
        .populate("assignmentId", "title lecturerId")
        .lean();
    if (!submission || !submission.assignmentId || String(submission.assignmentId.lecturerId) !== String(req.user.userId)) {
        return res.status(404).json({ message: "Submission not found." });
    }
    const questions = await Question.find({ assignmentId: submission.assignmentId._id, verificationStatus: { $ne: "rejected" } })
        .sort({ createdAt: 1, _id: 1 }).lean();
    const questionNumbers = new Map(questions.map((question) => [String(question._id), question.questionNumber]));
    const savedAnswers = new Map(submission.answers.map((answer) => [String(answer.questionId), answer]));
    return res.json({ submission: {
        id: String(submission._id), assignmentId: String(submission.assignmentId._id),
        assignmentTitle: submission.assignmentId.title, status: submission.status,
        createdAt: submission.createdAt,
        student: { id: String(submission.studentId._id), username: submission.studentId.username, email: submission.studentId.email },
        answers: questions.map((question) => {
            const saved = savedAnswers.get(String(question._id));
            return {
                questionId: String(question._id), questionNumber: question.questionNumber,
                parentQuestionNumber: questionNumbers.get(String(question.parentQuestionId)) || null,
                questionText: question.questionText, answerText: saved?.answerText || "",
                matchingStatus: saved?.matchingStatus || "unmatched", isSaved: Boolean(saved)
            };
        })
    } });
}

async function releaseSimilarityFeedback(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId } = req.params;
    const { submissionIds, note = "" } = req.body || {};
    if (!validId(assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    if (!Array.isArray(submissionIds) || submissionIds.length !== 2 || submissionIds.some((id) => !validId(id)) || String(submissionIds[0]) === String(submissionIds[1])) {
        return res.status(400).json({ message: "Select one pair of student submissions." });
    }
    if (typeof note !== "string" || note.length > 1000) return res.status(400).json({ message: "Feedback note must be 1000 characters or fewer." });
    const assignment = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId });
    if (!assignment) return res.status(404).json({ message: "Assignment not found." });
    const [questions, submissions] = await Promise.all([
        Question.find({ assignmentId, questionText: { $regex: "\\S" }, verificationStatus: { $ne: "rejected" } }).sort({ createdAt: 1, _id: 1 }).lean(),
        Submission.find({ _id: { $in: submissionIds }, assignmentId, status: { $in: ["processed", "needs_review"] } }).populate("studentId", "username email").lean()
    ]);
    if (submissions.length !== 2) return res.status(404).json({ message: "Both submissions must belong to this assignment." });
    const pair = (await compareSubmissions(submissions, questions))[0];
    if (!pair) return res.status(422).json({ message: "There are no comparable answers to share." });
    const pairKey = pair.submissionIds.slice().sort().join(":");
    const feedback = {
        pairKey, releaseId: new mongoose.Types.ObjectId().toString(), releasedAt: new Date(), releasedBy: req.user.userId,
        overallScore: pair.score, level: pair.level, threshold: 70, note: note.trim(),
        questions: pair.questions.filter((question) => question.score !== null).map((question) => ({
            questionId: question.questionId, questionNumber: question.questionNumber, score: question.score, level: question.level,
            confidence: question.confidence, confidenceNote: question.confidenceNote, commonAnswerPercent: question.commonAnswerPercent
        }))
    };
    await Promise.all(submissionIds.map((id) => Submission.updateOne({ _id: id, assignmentId }, { $pull: { similarityFeedbacks: { pairKey } } })));
    await Submission.updateMany({ _id: { $in: submissionIds }, assignmentId }, { $push: { similarityFeedbacks: feedback } });
    return res.json({ message: "Similarity feedback released to both students.", releasedAt: feedback.releasedAt, students: pair.students.map((student) => student.username) });
}

async function getSimilarityReport(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId } = req.params;
    if (!validId(assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    const assignment = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId });
    if (!assignment) return res.status(404).json({ message: "Assignment not found." });
    const [questions, submissions] = await Promise.all([
        Question.find({ assignmentId, questionText: { $regex: "\\S" }, verificationStatus: { $ne: "rejected" } }).sort({ createdAt: 1, _id: 1 }).lean(),
        Submission.find({ assignmentId, status: { $in: ["processed", "needs_review"] } }).populate("studentId", "username email").sort({ createdAt: 1 }).lean()
    ]);
    const pairs = await compareSubmissions(submissions, questions);
    const semanticAvailable = pairs.some((pair) => pair.similarityMethod === "semantic+text");
    return res.json({
        assignment: { id: String(assignment._id), title: assignment.title },
        submissionCount: submissions.length,
        pairs,
        note: semanticAvailable
            ? "Scores combine idea-level similarity, question-specific word overlap, and shared wording. They describe similarity only; short or common answers show lower evidence confidence."
            : "The local semantic model is unavailable, so scores use question-specific word overlap and shared wording only. They describe similarity only, not a decision about why answers are alike."
    });
}

module.exports = { listLecturerAssignments, getLecturerAssignment, updateAssignmentSettings, updateQuestion, verifyQuestion, verifyAllQuestions, publishAssignment, listPublishedAssignments, listSubmissions, getLecturerSubmission, rejectQuestion, restoreQuestion, getSimilarityReport, releaseSimilarityFeedback };
