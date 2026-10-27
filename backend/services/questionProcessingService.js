const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const { PDFParse } = require("pdf-parse");

const TESSERACT_PATH = "C:\\Program Files\\Tesseract-OCR\\tesseract.exe";
const OCR_DIR = path.join(__dirname, "..", "private_uploads", "ocr_temp");
const ROMAN_NUMERALS = new Set(["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]);

function runTesseract(imagePath) {
    return new Promise((resolve, reject) => {
        const process = spawn(TESSERACT_PATH, [imagePath, "stdout", "-l", "eng", "--psm", "6"], { windowsHide: true });
        let stdout = "";
        let stderr = "";
        process.stdout.setEncoding("utf8");
        process.stderr.setEncoding("utf8");
        process.stdout.on("data", (data) => { stdout += data; });
        process.stderr.on("data", (data) => { stderr += data; });
        process.on("error", reject);
        process.on("close", (code) => {
            if (code !== 0) return reject(new Error(stderr || `Tesseract exited with code ${code}`));
            return resolve(stdout.trim());
        });
    });
}

async function extractPdfText(pdfBuffer) {
    let parser;
    try {
        parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
        const result = await parser.getText();
        const extractedText = (result.text || "").trim();
        if (extractedText.length >= 100) {
            return { text: extractedText, extractionMethod: "text", reviewRequired: false };
        }
        await fs.mkdir(OCR_DIR, { recursive: true });
        const screenshotResult = await parser.getScreenshot({ desiredWidth: 2000, imageBuffer: true });
        const pageTexts = [];
        for (const page of screenshotResult.pages) {
            const imagePath = path.join(OCR_DIR, `ocr-${Date.now()}-${page.pageNumber}.png`);
            try {
                await fs.writeFile(imagePath, Buffer.from(page.data));
                const pageText = await runTesseract(imagePath);
                pageTexts.push(`--- PAGE ${page.pageNumber} ---\n${pageText}`);
            } finally {
                await fs.unlink(imagePath).catch(() => {});
            }
        }
        const ocrText = pageTexts.join("\n\n").trim();
        if (!ocrText) throw new Error("No readable text could be extracted from the PDF.");
        return { text: ocrText, extractionMethod: "ocr", reviewRequired: true };
    } finally {
        if (parser) await parser.destroy();
    }
}

function parseMainQuestionMarker(line) {
    const patterns = [
        /^\s*Question\s+(\d+)\s*[:.)-]?\s*(.*)$/i,
        /^\s*Q\s*(\d+|[Il])(?=\s|[).:]|[a-z(])\s*[).:]?\s*(.*)$/i,
        /^\s*(\d+)\.\s+(.*)$/
    ];
    for (const pattern of patterns) {
        const match = line.match(pattern);
        if (!match) continue;
        const number = /^[0-9]+$/.test(match[1]) ? match[1] : "1";
        return { label: `Q${number}`, text: match[2].trim() };
    }
    return null;
}

function isVisualCaption(line) {
    return /^\s*(?:table|figure|fig\.?|diagram|chart)\s*(?:no\.?\s*)?(?:\d+[a-z]?|[ivx]+)?\s*[:.)-]?.*$/i.test(line);
}

function startsWithQuestionMarker(line) {
    return /^\s*(?:Question\s+\d+|Q\s*(?:\d+|[Il])(?:[).:]|\s)|\d+\.\s+|[a-z][).]|\([a-z]\)|\((?:i{1,3}|iv|v|vi{0,3}|ix|x)\))/i.test(line);
}

function isTabularLine(line) {
    if (startsWithQuestionMarker(line)) return false;
    if (/[|\t]/.test(line)) return true;
    const cells = line.trim().split(/\s{2,}/);
    return cells.length >= 2 && cells.every((cell) => cell.length < 40);
}

function isDiagramNoise(line) {
    if (startsWithQuestionMarker(line)) return false;
    const symbols = line.match(/[\\/_|{}~^<>]/g) || [];
    const words = line.match(/[\p{L}\p{N}]{2,}/gu) || [];
    return symbols.length >= 5 && words.length <= 8;
}

function cleanQuestionLines(text) {
    const lines = (text || "")
        .replace(/\r\n/g, "\n")
        .replace(/^\s*---\s*PAGE\s+\d+(?:\s+OF\s+\d+)?\s*---\s*$/gim, "")
        .replace(/^\s*Page\s+\d+\s+of\s+\d+\s*$/gim, "")
        .split("\n")
        .map((line) => line.replace(/^[€£]\s*\)/, "e)").trim());
    const cleaned = [];
    let insideVisualBlock = false;
    for (const line of lines) {
        if (!line) continue;
        if (isVisualCaption(line)) {
            insideVisualBlock = true;
            continue;
        }
        if (insideVisualBlock) {
            if (!startsWithQuestionMarker(line)) continue;
            insideVisualBlock = false;
        }
        if (isTabularLine(line) || isDiagramNoise(line)) continue;
        cleaned.push(line);
    }
    return cleaned;
}

function parseQuestionHierarchy(text) {
    const questions = [];
    const questionsByLabel = new Map();
    let currentMain = null;
    let currentSub = null;
    let currentNested = null;

    function addOrGetQuestion(label, parentLabel) {
        let question = questionsByLabel.get(label);
        if (!question) {
            question = { questionNumber: label, questionText: "", parentLabel };
            questions.push(question);
            questionsByLabel.set(label, question);
        }
        return question;
    }

    function appendText(question, value) {
        const clean = value.replace(/\s+/g, " ").trim();
        if (!question || !clean) return;
        question.questionText = question.questionText ? `${question.questionText} ${clean}` : clean;
    }

    function activeQuestion() {
        return currentNested || currentSub || currentMain;
    }

    function parseLine(rawLine) {
        let line = rawLine;
        const main = parseMainQuestionMarker(line);
        if (main) {
            currentMain = addOrGetQuestion(main.label, null);
            currentSub = null;
            currentNested = null;
            line = main.text;
        }
        if (!currentMain || !line) return;

        const markerRegex = /(^|[\s;:])(?:\(([a-z]+)\)|([a-z]+)[.)])(?=\s|$)/gi;
        let cursor = 0;
        let foundMarker = false;
        let match;
        while ((match = markerRegex.exec(line)) !== null) {
            const markerStart = match.index + match[1].length;
            const previousQuestion = activeQuestion();
            const marker = (match[2] || match[3]).toLowerCase();
            const parenthesized = Boolean(match[2]);
            const punctuation = line[markerRegex.lastIndex - 1];
            const betweenMarkers = line.slice(cursor, markerStart);
            if (parenthesized && betweenMarkers.trim() && !/[.!?:;]\s*$/.test(betweenMarkers)) continue;
            const beforeMarker = line.slice(0, markerStart);
            if (!parenthesized && punctuation === "." && marker.length === 1 && !/^\s*$/.test(beforeMarker) && !/[;:.)]\s*$/.test(beforeMarker)) continue;
            const isRoman = ROMAN_NUMERALS.has(marker);
            let nextQuestion = null;

            if (isRoman && currentSub) {
                nextQuestion = addOrGetQuestion(`${currentSub.questionNumber}(${marker})`, currentSub.questionNumber);
                currentNested = nextQuestion;
            } else if (/^[a-hj-z]$/.test(marker)) {
                nextQuestion = addOrGetQuestion(`${currentMain.questionNumber}(${marker})`, currentMain.questionNumber);
                currentSub = nextQuestion;
                currentNested = null;
            } else if (isRoman && parenthesized) {
                nextQuestion = addOrGetQuestion(`${currentMain.questionNumber}(${marker})`, currentMain.questionNumber);
                currentSub = nextQuestion;
                currentNested = null;
            }

            if (!nextQuestion) continue;
            appendText(previousQuestion, line.slice(cursor, markerStart));
            cursor = markerRegex.lastIndex;
            foundMarker = true;
        }

        if (foundMarker) appendText(activeQuestion(), line.slice(cursor));
        else appendText(activeQuestion(), line);
    }

    for (const line of cleanQuestionLines(text)) parseLine(line);

    // Keep meaningful question blocks only. Empty parents stay out of storage;
    // children attach to the nearest meaningful ancestor when one exists.
    const meaningfulLabels = new Set(questions.filter((question) => question.questionText.trim()).map((question) => question.questionNumber));
    return questions
        .filter((question) => meaningfulLabels.has(question.questionNumber))
        .map((question) => {
            let parentLabel = question.parentLabel;
            while (parentLabel && !meaningfulLabels.has(parentLabel)) {
                parentLabel = questionsByLabel.get(parentLabel)?.parentLabel || null;
            }
            return { ...question, parentLabel };
        });
}

module.exports = { extractPdfText, parseQuestionHierarchy };
