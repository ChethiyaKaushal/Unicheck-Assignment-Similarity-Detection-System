const { compareSubmissions } = require("../services/similarityService");

const prompts = [
    "What does an operating system do?",
    "Explain why a cache is used.",
    "What is the purpose of a primary key?",
    "What is 2 + 2?",
    "Explain how TCP provides reliable delivery.",
    "What is normalization in a relational database?",
    "What does this code calculate?",
    "What is the role of an index in a database?",
    "Name two benefits of modular programming.",
    "What is the difference between RAM and a hard disk?"
];

const answerSets = {
    A: [
        "An operating system manages hardware resources and provides services that application programs need.",
        "A cache stores frequently used data close to the processor so it can be accessed faster.",
        "A primary key uniquely identifies each row in a database table.",
        "4",
        "TCP provides reliable delivery by numbering segments, checking acknowledgements, and retransmitting missing data.",
        "Normalization organizes relational tables to reduce duplicated data and update anomalies.",
        "int sum(int left, int right) { return left + right; }",
        "A database index helps the system find rows without scanning every row in the table.",
        "Modular programming makes code easier to maintain and allows components to be reused.",
        "RAM is temporary working memory, while a hard disk stores files persistently."
    ],
    B: [
        "An operating system manages hardware resources and provides services that application programs need.",
        "A cache keeps commonly needed information near the CPU for quicker access.",
        "A primary key uniquely identifies each row in a database table.",
        "4",
        "TCP ensures dependable delivery with sequence numbers, acknowledgements, and resending lost segments.",
        "Normalization organizes relational tables to reduce duplicated data and update anomalies.",
        "int total(int a, int b) { return a + b; }",
        "An index lets a database locate records faster instead of checking every row.",
        "Using modules improves maintainability and makes parts of a program reusable.",
        "RAM is temporary working memory, while a hard disk stores files persistently."
    ],
    C: [
        "The OS controls computer hardware and offers common functions to the software running on it.",
        "A cache is a small, fast storage area that avoids repeatedly fetching the same information from slower memory.",
        "A primary key uniquely identifies each row in a database table.",
        "4",
        "TCP divides data into packets so applications can send information over a network.",
        "Normalization organizes relational tables to reduce duplicated data and update anomalies.",
        "int product(int x, int y) { return x * y; }",
        "An index is a data structure that speeds up searching by keeping a lookup for stored records.",
        "Breaking software into modules lets teams work on separate components independently.",
        "RAM is temporary working memory, while a hard disk stores files persistently."
    ]
};

const questions = prompts.map((prompt, index) => ({ _id: `scenario-q${index + 1}`, questionNumber: `Q${index + 1}`, questionText: prompt }));
const submissions = Object.entries(answerSets).map(([student, texts]) => ({
    _id: `scenario-student-${student}`,
    studentId: { _id: `student-${student}`, username: `Student ${student}`, email: `${student.toLowerCase()}@example.test` },
    answers: texts.map((answerText, index) => ({ questionId: questions[index]._id, answerText }))
}));

async function main() {
    const pairs = await compareSubmissions(submissions, questions);
    console.log("Synthetic local scenario only; nothing is uploaded or saved to MongoDB.");
    console.log("Question rows show raw score and confidence-adjusted review signal.");
    for (const pair of pairs) {
        console.log(`\n${pair.students[0].username} vs ${pair.students[1].username} | overall raw ${pair.score}% | review ${pair.reviewScore}%`);
        console.table(pair.questions.map((question) => ({
            question: question.questionNumber,
            raw: question.score,
            review: question.reviewScore,
            idea: question.semanticScore,
            wording: question.wordingScore,
            code: question.codeScore,
            confidence: question.confidence
        })));
    }
}

main().catch((error) => {
    console.error("Scenario comparison failed:", error.message);
    process.exitCode = 1;
});
