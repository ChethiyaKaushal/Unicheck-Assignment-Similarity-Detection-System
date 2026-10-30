const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");
const Assignment = require("../models/Assignment");
const Question = require("../models/Question");
const Submission = require("../models/Submission");
const { compareSubmissions } = require("../services/similarityService");
const Module = require("../models/Module");
const SimilarityReport = require("../models/SimilarityReport");
const { extractPdfText } = require("../services/questionProcessingService");
const { extractAnswers } = require("../services/answerExtractionService");
const { compareAssignmentNow } = require("../services/similarityScheduler");
const PRIVATE_UPLOAD_DIR = path.join(__dirname, "..", "private_uploads");

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
    const assignments = await Assignment.find({ lecturerId: req.user.userId, status: { $ne: "deleted" }, adminArchived: { $ne: true } }).sort({ createdAt: -1 }).lean();
    const ids = assignments.map((item) => item._id);
    const counts = await Question.aggregate([{ $match: { assignmentId: { $in: ids }, questionText: { $regex: "\\S" }, verificationStatus: { $ne: "rejected" } } }, { $group: { _id: "$assignmentId", count: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ["$verificationStatus", "verified"] }, 0, 1] } } } }]);
    const byId = new Map(counts.map((item) => [String(item._id), item]));
    const submissionCounts = await Submission.aggregate([{ $match: { assignmentId: { $in: ids } } }, { $group: { _id: "$assignmentId", count: { $sum: 1 } } }]);
    const submissionsByAssignment = new Map(submissionCounts.map((item) => [String(item._id), item.count]));
    const reports = await SimilarityReport.find({ assignmentId: { $in: ids }, status: "completed" }).select("assignmentId criticalPairCount pairsCompared completedAt").lean();
    const reportById = new Map(reports.map((item) => [String(item.assignmentId), item]));
    return res.json({ assignments: assignments.map((item) => ({ ...item, id: String(item._id), questionCount: byId.get(String(item._id))?.count || 0, pendingQuestions: byId.get(String(item._id))?.pending || 0, submissionCount: submissionsByAssignment.get(String(item._id)) || 0, similarityReport: reportById.get(String(item._id)) ? { criticalPairCount: reportById.get(String(item._id)).criticalPairCount, pairsCompared: reportById.get(String(item._id)).pairsCompared, completedAt: reportById.get(String(item._id)).completedAt } : null })) });
}

async function getLecturerAssignment(req, res) {
    if (!readyUser(req, res)) return;
    if (!validId(req.params.assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    const assignment = await Assignment.findOne({ _id: req.params.assignmentId, lecturerId: req.user.userId, status: { $ne: "deleted" }, adminArchived: { $ne: true } }).lean();
    if (!assignment) return res.status(404).json({ message: "Assignment not found." });
    const questions = await Question.find({ assignmentId: assignment._id, questionText: { $regex: "\\S" } }).sort({ createdAt: 1, _id: 1 }).lean();
    const questionNumbers = new Map(questions.map((question) => [String(question._id), question.questionNumber]));
    return res.json({ assignment: { ...assignment, id: String(assignment._id) }, questions: questions.map((question) => publicQuestion(question, questionNumbers.get(String(question.parentQuestionId)) || null)) });
}

async function deleteAssignment(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId } = req.params;
    if (!validId(assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    const current = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId, status: { $ne: "deleted" } }).select("status similarityStatus").lean();
    if (!current) return res.status(404).json({ message: "Assignment not found." });
    if (current.status === "processing" || current.similarityStatus === "processing") return res.status(409).json({ message: "Wait for processing to finish before deleting this assignment." });
    const assignment = await Assignment.findOneAndUpdate(
        { _id: assignmentId, lecturerId: req.user.userId, status: { $ne: "deleted" }, similarityStatus: { $ne: "processing" } },
        { $set: { status: "deleted" } },
        { new: true }
    );
    if (!assignment) return res.status(409).json({ message: "This assignment is being processed. Try again when it finishes." });

    const submissions = await Submission.find({ assignmentId }).select("pdfFile").lean();
    const questionPaperPath = assignment.questionPaper;
    const questionCount = await Question.countDocuments({ assignmentId });
    const safeUnlink = async (storedPath) => {
        if (!storedPath) return;
        const resolved = path.resolve(__dirname, "..", storedPath);
        const root = path.resolve(PRIVATE_UPLOAD_DIR);
        if (resolved.startsWith(root + path.sep)) await fs.unlink(resolved).catch(() => {});
    };
    await Promise.all([
        Question.deleteMany({ assignmentId }),
        Submission.deleteMany({ assignmentId }),
        SimilarityReport.deleteOne({ assignmentId })
    ]);
    await Promise.all([safeUnlink(questionPaperPath), ...submissions.map((item) => safeUnlink(item.pdfFile))]);
    await Assignment.deleteOne({ _id: assignmentId, lecturerId: req.user.userId, status: "deleted" });
    return res.json({ message: "Assignment and its saved questions, student answer PDFs, answers, and similarity report were deleted.", deleted: { questionBlocks: questionCount, submissions: submissions.length } });
}

async function addQuestion(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId } = req.params;
    const { questionNumber, questionText = "", parentQuestionId = null } = req.body || {};
    if (!validId(assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    if (typeof questionNumber !== "string" || !questionNumber.trim()) return res.status(400).json({ message: "Enter a question label." });
    if (typeof questionText !== "string" || (parentQuestionId && !validId(parentQuestionId))) return res.status(400).json({ message: "Enter valid question details." });
    const assignment = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId, status: "review" });
    if (!assignment) return res.status(404).json({ message: "Reviewable assignment not found." });
    if (parentQuestionId && !(await Question.exists({ _id: parentQuestionId, assignmentId }))) return res.status(400).json({ message: "Parent must belong to this assignment." });
    try {
        const question = await Question.create({ assignmentId, questionNumber: questionNumber.trim(), questionText: questionText.trim(), parentQuestionId });
        return res.status(201).json({ message: "Question block added.", question: publicQuestion(question) });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "That question label already exists." });
        throw error;
    }
}

async function updateAssignmentSettings(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId } = req.params;
    if (!validId(assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    const assignment = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId, status: { $in: ["review", "published"] } });
    if (!assignment) return res.status(404).json({ message: "Assignment not found." });
    const { moduleId, dueAt } = req.body || {};
    if (moduleId !== undefined) {
        if (!validId(moduleId)) return res.status(400).json({ message: "Choose a valid module." });
        const module = await Module.findOne({ _id: moduleId, lecturerId: req.user.userId });
        if (!module) return res.status(404).json({ message: "Module not found." });
        assignment.moduleId = module._id;
        assignment.moduleCode = module.code;
        assignment.moduleName = module.name;
    }
    if (dueAt !== undefined) {
        if (dueAt === null || dueAt === "") return res.status(400).json({ message: "Set the date and time when uploads close." });
        else {
            const parsedDueAt = new Date(dueAt);
            if (Number.isNaN(parsedDueAt.getTime())) return res.status(400).json({ message: "Enter a valid assignment deadline." });
            assignment.dueAt = parsedDueAt;
        }
    }
    if (assignment.isModified("dueAt")) {
        assignment.similarityStatus = "pending";
        assignment.similarityStartedAt = null;
        assignment.similarityCompletedAt = null;
        await SimilarityReport.deleteOne({ assignmentId: assignment._id });
    }
    await assignment.save();
    return res.json({ assignment: { id: String(assignment._id), title: assignment.title, status: assignment.status, moduleId: assignment.moduleId, moduleCode: assignment.moduleCode, moduleName: assignment.moduleName, dueAt: assignment.dueAt } });
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
    assignment.similarityStatus = "pending";
    await assignment.save();
    return res.json({ message: "Assignment published.", assignment: { id: String(assignment._id), title: assignment.title, status: assignment.status } });
}

async function listPublishedAssignments(req, res) {
    if (!readyUser(req, res)) return;
    const modules = await Module.find({ studentIds: req.user.userId, isArchived: { $ne: true } }).select("_id").lean();
    const moduleIds = modules.map((item) => item._id);
    const assignments = await Assignment.find({ status: "published", adminArchived: { $ne: true }, $or: [{ moduleId: { $in: moduleIds } }, { moduleId: null }, { moduleId: { $exists: false } }] }).select("title description moduleCode moduleName moduleId dueAt createdAt lecturerId similarityStatus").populate("lecturerId", "username").sort({ createdAt: -1 }).lean();
    return res.json({ assignments: assignments.map((item) => ({ id: String(item._id), title: item.title, description: item.description, moduleCode: item.moduleCode, moduleName: item.moduleName, moduleId: item.moduleId ? String(item.moduleId) : null, dueAt: item.dueAt, similarityStatus: item.similarityStatus, lecturer: item.lecturerId?.username || "Lecturer", createdAt: item.createdAt })) });
}

async function listSubmissions(req, res) {
    if (!readyUser(req, res)) return;
    let assignmentIds;
    if (req.query.assignmentId !== undefined) {
        const assignmentId = req.query.assignmentId;
        if (typeof assignmentId !== "string" || !validId(assignmentId)) {
            return res.status(400).json({ message: "Invalid assignment id." });
        }
        const ownedAssignment = await Assignment.findOne({
            _id: assignmentId,
            lecturerId: req.user.userId,
            adminArchived: { $ne: true },
            status: { $ne: "deleted" }
        }).select("_id").lean();
        if (!ownedAssignment) return res.status(404).json({ message: "Assignment not found." });
        assignmentIds = [ownedAssignment._id];
    } else {
        const ownedAssignments = await Assignment.find({
            lecturerId: req.user.userId,
            adminArchived: { $ne: true },
            status: { $ne: "deleted" }
        }).select("_id").lean();
        assignmentIds = ownedAssignments.map((item) => item._id);
    }

    const submissions = await Submission.find({
        assignmentId: { $in: assignmentIds },
        active: { $ne: false }
    })
        .populate("studentId", "username email")
        .populate("assignmentId", "title")
        .sort({ createdAt: -1 })
        .lean();

    return res.json({
        submissions: submissions.map((item) => ({
            id: String(item._id),
            assignmentId: String(item.assignmentId._id),
            assignmentTitle: item.assignmentId.title,
            student: {
                id: String(item.studentId._id),
                username: item.studentId.username,
                email: item.studentId.email
            },
            status: item.status,
            answerCount: item.answers.length,
            createdAt: item.createdAt
        }))
    });
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

async function reprocessSubmission(req, res) {
    if (!readyUser(req, res)) return;
    const { submissionId } = req.params;
    if (!validId(submissionId)) return res.status(400).json({ message: "Invalid submission id." });
    const submission = await Submission.findById(submissionId).populate("assignmentId", "title lecturerId similarityStatus");
    if (!submission || !submission.assignmentId || String(submission.assignmentId.lecturerId) !== String(req.user.userId)) return res.status(404).json({ message: "Submission not found." });
    const filePath = path.resolve(__dirname, "..", submission.pdfFile);
    const privateRoot = path.resolve(PRIVATE_UPLOAD_DIR);
    if (!filePath.startsWith(privateRoot + path.sep)) return res.status(404).json({ message: "The private answer PDF is unavailable." });
    let extraction;
    try { extraction = await extractPdfText(await fs.readFile(filePath)); }
    catch { return res.status(422).json({ message: "UniCheck could not read this saved PDF. Check that OCR is installed for scanned pages." }); }
    const questions = await Question.find({ assignmentId: submission.assignmentId._id }).sort({ createdAt: 1 }).lean();
    const answers = extractAnswers(extraction.text, questions);
    if (!answers.length) return res.status(422).json({ message: "No answer labels matched. Begin each main answer with Q1, Q2, and so on; write subpart labels such as e), i), or 1) beneath their parent question." });
    const parentsWithChildren = new Set(questions.filter((item) => item.parentQuestionId).map((item) => String(item.parentQuestionId)));
    const expected = questions.filter((item) => item.verificationStatus !== "rejected" && item.questionText.trim() && !parentsWithChildren.has(String(item._id)));
    const savedIds = new Set(answers.map((answer) => String(answer.questionId)));
    const missingQuestionNumbers = expected.filter((item) => !savedIds.has(String(item._id))).map((item) => item.questionNumber);
    const locked = await Assignment.findOneAndUpdate(
        { _id: submission.assignmentId._id, lecturerId: req.user.userId, similarityStatus: { $ne: "processing" } },
        { $set: { similarityStatus: "processing", similarityStartedAt: new Date() } },
        { new: true }
    );
    if (!locked) return res.status(409).json({ message: "A similarity comparison is running. Try extracting this PDF again when it finishes." });
    try {
        submission.answers = answers;
        submission.status = missingQuestionNumbers.length ? "needs_review" : "processed";
        submission.processingError = null;
        await submission.save();
        await SimilarityReport.deleteOne({ assignmentId: submission.assignmentId._id });
        await Assignment.updateOne({ _id: submission.assignmentId._id }, { $set: { similarityStatus: "pending", similarityStartedAt: null, similarityCompletedAt: null } });
    } catch (error) {
        await Assignment.updateOne({ _id: submission.assignmentId._id }, { $set: { similarityStatus: "pending", similarityStartedAt: null } });
        throw error;
    }
    return res.json({ message: "Saved PDF reprocessed with the current question hierarchy.", submission: { id: String(submission._id), status: submission.status, mappedAnswers: answers.length, expectedAnswers: expected.length, missingQuestionNumbers, extractionMethod: extraction.extractionMethod } });
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
    const [questions, submissions, savedReport] = await Promise.all([
        Question.find({ assignmentId, questionText: { $regex: "\\S" }, verificationStatus: { $ne: "rejected" } }).sort({ createdAt: 1, _id: 1 }).lean(),
        Submission.find({ assignmentId, active: { $ne: false }, status: { $in: ["processed", "needs_review"] } }).populate("studentId", "username email").sort({ createdAt: 1 }).lean(),
        SimilarityReport.findOne({ assignmentId }).lean()
    ]);
    if (savedReport?.status === "completed") {
        const activeIds = new Set(submissions.map((item) => String(item._id)));
        const candidates = (savedReport.flaggedPairs || []).filter((pair) => pair.submissionIds.every((id) => activeIds.has(id)));
        const pairById = new Map(submissions.map((item) => [String(item._id), item]));
        const pairs = candidates.map((pair) => ({
            ...pair,
            feedbackShared: pair.submissionIds.every((id) => (pairById.get(id)?.similarityFeedbacks || []).some((item) => item.pairKey === pair.submissionIds.slice().sort().join(":"))),
            questions: pair.questions.map((question) => ({
                ...question,
                studentAnswers: pair.submissionIds.map((submissionId) => {
                    const submission = pairById.get(submissionId);
                    const answer = submission.answers.find((item) => String(item.questionId) === question.questionId);
                    return { studentId: String(submission.studentId._id), answerText: answer?.answerText || "" };
                })
            }))
        }));
        return res.json({ assignment: { id: String(assignment._id), title: assignment.title, dueAt: assignment.dueAt }, submissionCount: submissions.length, pairs, automatic: true, reportStatus: "completed", criticalPairCount: savedReport.criticalPairCount, pairsCompared: savedReport.pairsCompared, truncated: savedReport.truncated, similarityMethod: savedReport.similarityMethod, note: "Highest overall or question-level similarities among the submissions included in this comparison. Review each answer in context; similarity does not establish why answers are alike." });
    }
    if (savedReport?.status === "processing" || savedReport?.status === "failed") return res.json({ assignment: { id: String(assignment._id), title: assignment.title, dueAt: assignment.dueAt }, submissionCount: submissions.length, pairs: [], automatic: true, reportStatus: savedReport.status, note: savedReport.status === "processing" ? "UniCheck is comparing answers. Refresh this page shortly." : "The automatic comparison encountered a problem and will retry in the background." });
    if (assignment.dueAt && assignment.dueAt.getTime() > Date.now()) return res.json({ assignment: { id: String(assignment._id), title: assignment.title, dueAt: assignment.dueAt }, submissionCount: submissions.length, pairs: [], automatic: true, reportStatus: "waiting_deadline", note: "Automatic comparison starts after the submission deadline." });
    const pairs = await compareSubmissions(submissions, questions);
    const semanticAvailable = pairs.some((pair) => pair.similarityMethod === "semantic+text");
    return res.json({
        assignment: { id: String(assignment._id), title: assignment.title, dueAt: assignment.dueAt },
        submissionCount: submissions.length,
        pairs,
        note: semanticAvailable
            ? "Scores combine idea-level similarity, question-specific word overlap, and shared wording. They describe similarity only; short or common answers show lower evidence confidence."
            : "The local semantic model is unavailable, so scores use question-specific word overlap and shared wording only. They describe similarity only, not a decision about why answers are alike."
    });
}

async function startSimilarityReport(req, res) {
    if (!readyUser(req, res)) return;
    const { assignmentId } = req.params;
    if (!validId(assignmentId)) return res.status(400).json({ message: "Invalid assignment id." });
    const assignment = await Assignment.findOne({ _id: assignmentId, lecturerId: req.user.userId, status: "published", adminArchived: { $ne: true } }).select("_id dueAt similarityStatus").lean();
    if (!assignment) return res.status(404).json({ message: "Published assignment not found." });
    const submissionCount = await Submission.countDocuments({ assignmentId, active: { $ne: false }, status: { $in: ["processed", "needs_review"] } });
    if (submissionCount < 2) return res.status(422).json({ message: "At least two submitted answer PDFs are needed to compare." });
    const result = await compareAssignmentNow(assignment._id, { final: assignment.dueAt && assignment.dueAt.getTime() <= Date.now() });
    if (!result.started) return res.status(409).json({ message: "A comparison is already running for this assignment." });
    return res.status(202).json({ message: "Comparison started for the current submitted PDFs. You can run it again after more students submit.", reportStatus: "processing", submissionCount });
}

module.exports = { listLecturerAssignments, getLecturerAssignment, deleteAssignment, updateAssignmentSettings, updateQuestion, addQuestion, verifyQuestion, verifyAllQuestions, publishAssignment, listPublishedAssignments, listSubmissions, getLecturerSubmission, reprocessSubmission, rejectQuestion, restoreQuestion, getSimilarityReport, startSimilarityReport, releaseSimilarityFeedback };
