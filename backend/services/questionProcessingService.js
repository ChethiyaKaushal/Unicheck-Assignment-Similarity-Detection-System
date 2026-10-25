
const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const { PDFParse } = require("pdf-parse");

const TESSERACT_PATH =
    "C:\\Program Files\\Tesseract-OCR\\tesseract.exe";

const OCR_DIR = path.join(
    __dirname,
    "..",
    "private_uploads",
    "ocr_temp"
);

const ROMAN_NUMERALS = new Set([
    "i", "ii", "iii", "iv", "v",
    "vi", "vii", "viii", "ix", "x"
]);

// --------------------------------------------------
// 1. OCR
// --------------------------------------------------

function runTesseract(imagePath) {
    return new Promise((resolve, reject) => {
        const process = spawn(
            TESSERACT_PATH,
            [imagePath, "stdout", "-l", "eng", "--psm", "3"],
            { windowsHide: true }
        );

        let stdout = "";
        let stderr = "";

        process.stdout.setEncoding("utf8");
        process.stderr.setEncoding("utf8");

        process.stdout.on("data", (data) => {
            stdout += data;
        });

        process.stderr.on("data", (data) => {
            stderr += data;
        });

        process.on("error", reject);

        process.on("close", (code) => {
            if (code !== 0) {
                reject(
                    new Error(
                        stderr || `Tesseract exited with code ${code}`
                    )
                );
                return;
            }

            resolve(stdout.trim());
        });
    });
}

// --------------------------------------------------
// 2. PDF text extraction with OCR fallback
// --------------------------------------------------

async function extractPdfText(pdfBuffer) {
    let parser;

    try {
        parser = new PDFParse({
            data: new Uint8Array(pdfBuffer)
        });

        const result = await parser.getText();
        const extractedText = (result.text || "").trim();

        // Use embedded text when enough readable text exists.
        if (extractedText.length >= 100) {
            return {
                text: extractedText,
                extractionMethod: "text",
                reviewRequired: false
            };
        }

        // Otherwise, render pages and use OCR.
        await fs.mkdir(OCR_DIR, { recursive: true });

        const screenshotResult = await parser.getScreenshot({
            desiredWidth: 2000,
            imageBuffer: true
        });

        const pageTexts = [];

        for (const page of screenshotResult.pages) {
            const imagePath = path.join(
                OCR_DIR,
                `ocr-${Date.now()}-${page.pageNumber}.png`
            );

            try {
                await fs.writeFile(
                    imagePath,
                    Buffer.from(page.data)
                );

                const pageText = await runTesseract(imagePath);

                pageTexts.push(
                    `--- PAGE ${page.pageNumber} ---\n${pageText}`
                );
            } finally {
                await fs.unlink(imagePath).catch(() => {});
            }
        }

        const ocrText = pageTexts.join("\n\n").trim();

        if (!ocrText) {
            throw new Error(
                "No readable text could be extracted from the PDF."
            );
        }

        return {
            text: ocrText,
            extractionMethod: "ocr",
            reviewRequired: true
        };
    } finally {
        if (parser) {
            await parser.destroy();
        }
    }
}

// --------------------------------------------------
// 3. Main question marker detection
// --------------------------------------------------

function parseMainQuestionMarker(line) {
    const patterns = [
        // Question 1:, Question 2.
        /^\s*Question\s+(\d+)\s*[:.)-]?\s*(.*)$/i,

        // Q1), Q1., Q1:, Q1 followed by whitespace,
        // and OCR mistakes such as Ql or QI.
        /^\s*Q\s*(\d+|[Il])(?:\s*[).:]|\s+)(.*)$/i,

        // Do not treat plain "1)" numbered lists as questions.
        // Only accept the "1. Question text" format here.
        /^\s*(\d+)\.\s+(.*)$/
    ];

    for (const pattern of patterns) {
        const match = line.match(pattern);

        if (match) {
            const number = /^[0-9]+$/.test(match[1])
                ? match[1]
                : "1";

            return {
                label: `Q${number}`,
                text: match[2].trim()
            };
        }
    }

    return null;
}

// --------------------------------------------------
// 4. Subquestion marker detection
// --------------------------------------------------

function parseSubQuestionMarker(line) {
    const normalizedLine = line.replace(/^[€£]\s*\)/, "e)");

    const match = normalizedLine.match(
        /^\s*(?:\(([a-z]+)\)|([a-z]+)\s*[.)])\s*/i
    );

    if (!match) {
        return null;
    }

    return {
        marker: (match[1] || match[2]).toLowerCase(),
        text: normalizedLine.slice(match[0].length).trim(),
        parenthesized: Boolean(match[1])
    };
}

// --------------------------------------------------
// 5. Question hierarchy parser
// --------------------------------------------------

function parseQuestionHierarchy(text) {
    const lines = text
        .replace(/\r\n/g, "\n")
        .split("\n");

    const questions = [];

    let currentMain = null;
    let currentSub = null;
    let currentNested = null;

    function addQuestion(label, questionText, parentLabel) {
        const question = {
            questionNumber: label,
            questionText: questionText.trim(),
            parentLabel
        };

        questions.push(question);
        return question;
    }

    for (const rawLine of lines) {
        let line = rawLine.trim();

        if (!line) {
            continue;
        }

        // Detect a main question at the beginning of a line.
        const main = parseMainQuestionMarker(line);

        if (main) {
    currentMain = addQuestion(
        main.label,
        "",
        null
    );

    currentSub = null;
    currentNested = null;

    line = main.text;

    // A main question may be immediately followed by
    // a subquestion marker, e.g. "Q2 a) Explain..."
    // In that case, the main question's text can be empty.
}

        if (!currentMain) {
            continue;
        }

        // Detect multiple markers on the same line:
        // "Q1 a) (i) Explain..."
        let consumedMarker = false;

        while (line) {
            const sub = parseSubQuestionMarker(line);

            if (!sub) {
                break;
            }

            const { marker, parenthesized } = sub;
            const isRoman = ROMAN_NUMERALS.has(marker);

            // Roman numeral under a lettered subquestion.
            if (isRoman && currentSub) {
                currentNested = addQuestion(
                    `${currentSub.questionNumber}(${marker})`,
                    "",
                    currentSub.questionNumber
                );

                line = sub.text;
                consumedMarker = true;
                continue;
            }

            // Lettered subquestion.
            // Single-letter "i" is ambiguous with Roman numeral i.
            if (
                /^[a-z]$/.test(marker) &&
                !isRoman
            ) {
                currentSub = addQuestion(
                    `${currentMain.questionNumber}(${marker})`,
                    "",
                    currentMain.questionNumber
                );

                currentNested = null;

                line = sub.text;
                consumedMarker = true;
                continue;
            }

            // Roman numeral directly under the main question.
            if (isRoman && parenthesized) {
                currentNested = addQuestion(
                    `${currentMain.questionNumber}(${marker})`,
                    "",
                    currentMain.questionNumber
                );

                line = sub.text;
                consumedMarker = true;
                continue;
            }

            // Do not guess when a marker is ambiguous.
            break;
        }

        if (!line) {
            continue;
        }

        const target =
            currentNested || currentSub || currentMain;

        if (target.questionText) {
            target.questionText += ` ${line}`;
        } else {
            target.questionText = line;
        }

        // "consumedMarker" indicates that one or more markers
        // were detected before the remaining question text.
        // It is intentionally retained for debugging extensions.
        void consumedMarker;
    }

    return questions;
}

// --------------------------------------------------
// 6. Exports
// --------------------------------------------------

module.exports = {
    extractPdfText,
    parseQuestionHierarchy
};
