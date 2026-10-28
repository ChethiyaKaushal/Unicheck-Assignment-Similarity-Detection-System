
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const Assignment = require("../models/Assignment");
const Question = require("../models/Question");
const Module = require("../models/Module");

const {
    extractPdfText,
    parseQuestionHierarchy
} = require("../services/questionProcessingService");

const UPLOAD_DIR = path.join(__dirname, "..", "private_uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const uploadQuestionPaper = async (req, res) => {
    let savedFilePath;
    let assignment;

    try {
        // 1. Validate uploaded file.
        if (!req.file) {
            return res.status(400).json({
                message: "Please upload a question-paper PDF."
            });
        }

        if (req.file.size > MAX_FILE_SIZE) {
            return res.status(413).json({
                message: "PDF must not exceed 10 MB."
            });
        }

        const pdfSignature = req.file.buffer
            .subarray(0, 5)
            .toString();

        if (pdfSignature !== "%PDF-") {
            return res.status(400).json({
                message: "The uploaded file is not a valid PDF."
            });
        }

        const module = await Module.findOne({ _id: req.body.moduleId, lecturerId: req.user.userId });
        if (!module) return res.status(400).json({ message: "Choose one of your modules before creating the assignment." });
        const moduleCode = module.code;
        const moduleName = module.name;
        const dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
        if (!dueAt) return res.status(400).json({ message: "Set the date and time when uploads close." });
        if (dueAt && Number.isNaN(dueAt.getTime())) {
            return res.status(400).json({ message: "Enter a valid assignment deadline." });
        }

        // 2. Extract embedded text or use OCR.
        let extraction;

        try {
            extraction = await extractPdfText(req.file.buffer);
        } catch (error) {
            console.error("PDF text extraction failed:", error.message);

            return res.status(422).json({
                message:
                    "Unable to extract readable text from this PDF. Please check the PDF and try again."
            });
        }

        // 3. Parse the question hierarchy.
        const parsedQuestions = parseQuestionHierarchy(extraction.text);

        if (
            !parsedQuestions.length ||
            !parsedQuestions.some(
                (question) => question.questionText.trim()
            )
        ) {
            return res.status(422).json({
                message:
                    "No questions could be extracted. Please check the PDF."
            });
        }

        // 4. Save the original PDF in private storage.
        await fs.mkdir(UPLOAD_DIR, { recursive: true });

        const filename = `${crypto.randomUUID()}.pdf`;
        savedFilePath = path.join(UPLOAD_DIR, filename);

        await fs.writeFile(savedFilePath, req.file.buffer, {
            flag: "wx",
            mode: 0o600
        });

        // 5. Create the assignment for the authenticated lecturer.
        assignment = await Assignment.create({
            title: req.body.title,
            description: req.body.description || "",
            moduleCode,
            moduleName,
            moduleId: module._id,
            dueAt,
            lecturerId: req.user.userId,
            questionPaper: path.relative(
                path.join(__dirname, ".."),
                savedFilePath
            ),
            status: "processing"
        });

        // 6. Save questions in parser order.
        // Parents are parsed before their children.
        const questionIdsByLabel = new Map();

        for (const parsedQuestion of parsedQuestions) {
            let parentQuestionId = null;

            if (parsedQuestion.parentLabel) {
                parentQuestionId = questionIdsByLabel.get(
                    parsedQuestion.parentLabel
                );

                if (!parentQuestionId) {
                    throw new Error(
                        `Parent question not found: ${parsedQuestion.parentLabel}`
                    );
                }
            }

            const question = await Question.create({
                assignmentId: assignment._id,
                questionNumber: parsedQuestion.questionNumber,
                questionText: parsedQuestion.questionText || "",
                parentQuestionId
            });

            questionIdsByLabel.set(
                parsedQuestion.questionNumber,
                question._id
            );
        }

        // 7. Mark ready for lecturer review only after all saves succeed.
        assignment.status = "review";
        await assignment.save();

        return res.status(201).json({
            message:
                "Question paper processed successfully. Please review the extracted questions.",
            assignment: {
                id: assignment._id,
                title: assignment.title,
                description: assignment.description,
                status: assignment.status,
                createdAt: assignment.createdAt
            },
            processing: {
                extractionMethod: extraction.extractionMethod,
                reviewRequired: extraction.reviewRequired,
                questionsExtracted: parsedQuestions.length
            }
        });
    } catch (error) {
        // Clean up partial database records if processing fails.
        if (assignment) {
            await Question.deleteMany({
                assignmentId: assignment._id
            }).catch((cleanupError) => {
                console.error(
                    "Question cleanup failed:",
                    cleanupError.message
                );
            });

            await Assignment.deleteOne({
                _id: assignment._id
            }).catch((cleanupError) => {
                console.error(
                    "Assignment cleanup failed:",
                    cleanupError.message
                );
            });
        }

        // Remove the private PDF if processing fails.
        if (savedFilePath) {
            await fs.unlink(savedFilePath).catch(() => {});
        }

        console.error("Question-paper upload failed:", error.message);

        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: "A valid assignment title is required."
            });
        }

        return res.status(500).json({
            message: "Unable to process the question paper."
        });
    }
};

module.exports = { uploadQuestionPaper };
