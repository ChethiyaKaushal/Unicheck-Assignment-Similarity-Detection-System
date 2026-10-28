# UniCheck

UniCheck is a React/Vite frontend with an Express, MongoDB, JWT, and PDF-processing backend. The current MVP supports lecturer question-paper extraction and review, student answer-PDF submission, and question-by-question similarity reports.

## Requirements

- Node.js 20 or later
- MongoDB connection string
- Tesseract OCR installed at `C:\Program Files\Tesseract-OCR\tesseract.exe` for scanned PDFs (searchable PDFs do not need OCR)

## Configuration

Create `backend/.env` locally. Do not commit it. Set:

```text
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=a-long-random-secret
PORT=5000
```

The MongoDB connection variable must match `backend/config/db.js`. Keep real connection strings and signing secrets out of Git.

## Run locally

Terminal 1:

```powershell
cd C:\Academics\Unicheck\backend
npm install
npm start
```

Terminal 2:

```powershell
cd C:\Academics\Unicheck
npm install
npm run dev
```

Vite forwards `/api` calls to `http://localhost:5000`. Set `VITE_API_URL` at build time if the deployed frontend and API use different origins. Create student and lecturer accounts through the existing administrator-only `POST /api/auth/users` endpoint. First sign-in may require a password change.

The first similarity report downloads an English-only sentence-embedding model (about 23 MB) to `%LOCALAPPDATA%\UniCheck\model-cache` on Windows. Student answers are embedded locally by the backend; answer text is not sent to an inference service. Set `UNICHECK_MODEL_CACHE` to choose a different cache directory, or `UNICHECK_EMBEDDING_MODEL` to use another compatible English Transformers.js model. Idea-level similarity is intended for English answers; the interface still accepts PDFs, but semantic scores for other languages may not be reliable. If the model cannot be loaded, the report remains available with text-overlap scoring and labels that fallback.

## MVP workflow

1. A lecturer signs in and uploads a question-paper PDF from **Assignments**.
2. UniCheck extracts text (OCR fallback for scans), stores the PDF privately, and creates question records in `review` status.
3. UniCheck keeps non-empty question blocks, skips blank hierarchy rows and obvious table/figure OCR noise, and shows a review block for each extracted question. The lecturer can edit questions individually, verify one at a time, or use **Verify all questions**. Publishing is blocked until the extracted questions are verified.
4. Students sign in and see only published assignments. They upload one answer PDF per assignment. Write answers in English for the idea-similarity analysis. Start each main answer on a new line with `Q1`, `Q2`, `Q3`, and so on. Keep subparts such as `a)`, `e)`, `i)`, `ii)`, `1.`, or `2)` under that main question; do not use those subpart markers alone to start a new main answer. The upload page explains this format.
5. The lecturer opens **Reports** and selects an assignment to compare each mapped answer question by question.

Similarity reports combine local English sentence-embedding scores (85% of the score) with question-specific weighted word overlap (10%) and shared exact phrase evidence (5%). If the local model is unavailable, the report uses wording evidence only and identifies that fallback. Scores describe answer similarity; they do not decide why answers are similar. Short answers or answers common across many students are marked with lower evidence confidence, since a short common answer such as `4` is not informative by itself. The lecturer sees matched phrases and both answers to review the context.

## API overview

- `POST /api/auth/login`, `POST /api/auth/change-password`
- `POST /api/upload/question-paper` (lecturer)
- `GET /api/assignments` and `GET /api/assignments/:assignmentId` (lecturer-owned assignments)
- `PATCH /api/assignments/:assignmentId/questions/:questionId`
- `POST /api/assignments/:assignmentId/questions/:questionId/verify`
- `POST /api/assignments/:assignmentId/publish`
- `GET /api/assignments/published` (students)
- `POST /api/submissions/:assignmentId` and `GET /api/submissions/mine` (students)
- `GET /api/submissions` (lecturer-owned assignments)
- `GET /api/assignments/:assignmentId/report` (owner-only question-wise comparisons)

All PDFs are stored under `backend/private_uploads` and must remain untracked. JWTs are sent in the `Authorization: Bearer` header. The API checks role and assignment ownership on protected operations.

## Checks

From `backend`, run `npm test` for similarity-service and question-processing unit tests. From the repository root, run `npm run build` and `npm run lint` for the frontend.
