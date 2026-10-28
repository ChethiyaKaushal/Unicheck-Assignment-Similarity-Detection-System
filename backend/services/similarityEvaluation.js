function scoreMetrics(samples, threshold) {
    let truePositive = 0;
    let falsePositive = 0;
    let trueNegative = 0;
    let falseNegative = 0;

    for (const sample of samples) {
        const predictedSimilar = sample.score >= threshold;
        if (predictedSimilar && sample.expectedReview) truePositive += 1;
        else if (predictedSimilar) falsePositive += 1;
        else if (sample.expectedReview) falseNegative += 1;
        else trueNegative += 1;
    }

    const precision = truePositive + falsePositive ? truePositive / (truePositive + falsePositive) : 0;
    const recall = truePositive + falseNegative ? truePositive / (truePositive + falseNegative) : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    const accuracy = samples.length ? (truePositive + trueNegative) / samples.length : 0;
    return { threshold, samples: samples.length, truePositive, falsePositive, trueNegative, falseNegative, precision, recall, f1, accuracy };
}

function evaluateThresholds(samples, thresholds = [40, 50, 60, 70, 80, 90]) {
    if (!Array.isArray(samples) || samples.some((sample) => (
        typeof sample?.score !== "number"
        || !Number.isFinite(sample.score)
        || typeof sample.expectedReview !== "boolean"
    ))) {
        throw new TypeError("Each evaluation sample needs a numeric score and boolean expectedReview label.");
    }
    return thresholds.map((threshold) => scoreMetrics(samples, threshold));
}

module.exports = { scoreMetrics, evaluateThresholds };
