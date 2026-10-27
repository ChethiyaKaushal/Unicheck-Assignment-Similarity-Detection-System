function tokenize(text) {
    return (text || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((word) => word.length > 1);
}

function similarityPercent(left, right) {
    const a = tokenize(left);
    const b = tokenize(right);
    if (!a.length || !b.length) return 0;
    const countsA = new Map();
    const countsB = new Map();
    for (const token of a) countsA.set(token, (countsA.get(token) || 0) + 1);
    for (const token of b) countsB.set(token, (countsB.get(token) || 0) + 1);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (const value of countsA.values()) normA += value * value;
    for (const value of countsB.values()) normB += value * value;
    for (const [token, value] of countsA) dot += value * (countsB.get(token) || 0);
    if (!normA || !normB) return 0;
    return Math.round((dot / Math.sqrt(normA * normB)) * 100);
}

function similarityLevel(score) {
    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
}

function compareSubmissions(submissions, questions) {
    const questionMap = new Map(questions.map((question) => [String(question._id), question]));
    const pairs = [];
    for (let i = 0; i < submissions.length; i += 1) {
        for (let j = i + 1; j < submissions.length; j += 1) {
            const left = submissions[i];
            const right = submissions[j];
            const leftAnswers = new Map(left.answers.map((answer) => [String(answer.questionId), answer.answerText]));
            const rightAnswers = new Map(right.answers.map((answer) => [String(answer.questionId), answer.answerText]));
            const perQuestion = [];
            for (const question of questions) {
                const questionId = String(question._id);
                const leftText = leftAnswers.get(questionId) || "";
                const rightText = rightAnswers.get(questionId) || "";
                if (!leftText.trim() || !rightText.trim()) continue;
                const score = similarityPercent(leftText, rightText);
                perQuestion.push({ questionId, questionNumber: question.questionNumber, score, level: similarityLevel(score) });
            }
            const overall = perQuestion.length
                ? Math.round(perQuestion.reduce((sum, item) => sum + item.score, 0) / perQuestion.length)
                : 0;
            pairs.push({
                submissionIds: [String(left._id), String(right._id)],
                students: [left.studentId, right.studentId].map((student) => ({ id: String(student._id), username: student.username, email: student.email })),
                score: overall,
                level: similarityLevel(overall),
                comparedQuestions: perQuestion.length,
                questions: perQuestion.map((item) => ({ ...item, questionText: questionMap.get(item.questionId)?.questionText || "" }))
            });
        }
    }
    return pairs.sort((a, b) => b.score - a.score);
}

module.exports = { tokenize, similarityPercent, similarityLevel, compareSubmissions };
