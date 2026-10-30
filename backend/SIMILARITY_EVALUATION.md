# Similarity evaluation

Use lecturer-reviewed answer pairs to measure whether UniCheck surfaces answers that deserve review. `expectedReview` means “this pair should be surfaced for lecturer review”; it does not mean misconduct was established.

Create a UTF-8 JSON file with this structure:

```json
[
  {
    "id": "same-meaning-paraphrase-01",
    "questionNumber": "Q1(a)",
    "left": "A CPU executes program instructions.",
    "right": "A processor runs the commands in a program.",
    "expectedReview": true
  },
  {
    "id": "common-correct-answer-01",
    "questionNumber": "Q1(b)",
    "left": "4",
    "right": "4",
    "expectedReview": false
  }
]
```

Use pairs from these categories: exact overlap, changed words, paraphrases, common correct answers, unrelated answers with shared technical terms, code with renamed identifiers, and OCR-damaged text. Have lecturers label the pairs independently, then resolve disagreements before treating labels as a reference set. Keep a held-out group of pairs that is not used to choose the threshold.

From `backend`, run:

```powershell
npm run evaluate:similarity -- .\evaluation\labeled-pairs.json
```

The evaluator reports precision, recall, F1, accuracy, false positives, and false negatives at several thresholds. These metrics describe only the provided labeled sample. Do not make accuracy claims from synthetic examples or the same pairs used to tune the threshold. Report the sample size and OCR/model setup alongside results.
