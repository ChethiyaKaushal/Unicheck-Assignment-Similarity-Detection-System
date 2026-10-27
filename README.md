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

## MVP workflow

1. A lecturer signs in and uploads a question-paper PDF from **Assignments**.
2. UniCheck extracts text (OCR fallback for scans), stores the PDF privately, and creates question records in `review` status.
3. UniCheck keeps non-empty question blocks, skips blank hierarchy rows and obvious table/figure OCR noise, and shows a review block for each extracted question. The lecturer can edit questions individually, verify one at a time, or use **Verify all questions**. Publishing is blocked until the extracted questions are verified.
4. Students sign in and see only published assignments. They upload one answer PDF per assignment; answer sections should begin with labels such as `Q1`, `Q2(a)`, or `Q2(a)(i)`.
5. The lecturer opens **Reports** and selects an assignment to compare each mapped answer question by question.

Similarity is cosine overlap of normalized word counts. It is a review aid and can be affected by shared technical vocabulary, OCR quality, and answer length; it is not an automatic plagiarism finding. Unlabelled answers cannot be mapped reliably and are rejected for correction.

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

From `backend`, run `npm test` for similarity-service unit tests. From the repository root, run `npm run build` and `npm run lint` for the frontend.
