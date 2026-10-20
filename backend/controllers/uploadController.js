
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { PDFParse } = require("pdf-parse");

const Assignment = require("../models/Assignment");

const UPLOAD_DIR = path.join(__dirname, "..", "private_uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const uploadQuestionPaper = async (req, res) => {
    let savedFilePath;

    try {
        // Check whether a PDF was uploaded.
        if (!req.file) {
            return res.status(400).json({
                message: "Please upload a question-paper PDF."
            });
        }

        // Enforce the size limit at controller level too.
        if (req.file.size > MAX_FILE_SIZE) {
            return res.status(413).json({
                message: "PDF must not exceed 10 MB."
            });
        }

        // Check the PDF signature (%PDF-).
        const pdfSignature = req.file.buffer.subarray(0, 5).toString();

        if (pdfSignature !== "%PDF-") {
            return res.status(400).json({
                message: "The uploaded file is not a valid PDF."
            });
        }

        // Parse the PDF to check that it is readable.
        const parser = new PDFParse({ data: req.file.buffer });

        try {
            const result = await parser.getText();

            if (!result.text || !result.text.trim()) {
                return res.status(422).json({
                    message:
                        "No readable text was found in the PDF. Scanned PDFs need OCR."
                });
            }
        } finally {
            await parser.destroy();
        }

        // Create private storage directory if it doesn't exist.
        await fs.mkdir(UPLOAD_DIR, { recursive: true });

        // Generate a server-side filename; never trust the uploaded filename.
        const filename = `${crypto.randomUUID()}.pdf`;
        savedFilePath = path.join(UPLOAD_DIR, filename);

        // Save the PDF privately.
        await fs.writeFile(savedFilePath, req.file.buffer, {
            flag: "wx",
            mode: 0o600
        });

        // Create the assignment for the authenticated lecturer.
        const assignment = await Assignment.create({
            title: req.body.title,
            description: req.body.description || "",
            lecturerId: req.user.userId,
            questionPaper: path.relative(
                path.join(__dirname, ".."),
                savedFilePath
            ),
            status: "processing"
        });

        return res.status(201).json({
            message: "Question paper uploaded successfully.",
            assignment: {
                id: assignment._id,
                title: assignment.title,
                description: assignment.description,
                status: assignment.status,
                createdAt: assignment.createdAt
            }
        });
    } catch (error) {
        // Remove the saved PDF if assignment creation fails.
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
            message: "Unable to upload the question paper."
        });
    }
};

module.exports = { uploadQuestionPaper };
