# UniCheck

UniCheck is a React/Vite frontend with an Express, MongoDB, JWT, and PDF-processing backend. It supports administrator account management, lecturer-owned modules, enrollment codes, question-paper extraction and review, student answer-PDF submissions, and automatic question-by-question similarity reports after assignment deadlines.

## Requirements

- Node.js 20 or later
- MongoDB connection string
- Tesseract OCR at `C:\Program Files\Tesseract-OCR\tesseract.exe` for scanned PDFs (searchable PDFs do not need OCR)

## Configuration

Create `backend/.env` locally and do not commit it:

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

Vite forwards `/api` calls to `http://localhost:5000`. Set `VITE_API_URL` at build time if the deployed frontend and API use different origins.

The first similarity report downloads an English-only sentence-embedding model (about 23 MB) to `%LOCALAPPDATA%\UniCheck\model-cache` on Windows. Student answers are embedded locally by the backend; answer text is not sent to an inference service. Set `UNICHECK_MODEL_CACHE` to choose another cache directory, or `UNICHECK_EMBEDDING_MODEL` to use another compatible English Transformers.js model. Idea-level similarity is intended for English answers. If the model cannot be loaded, the report uses wording evidence only and labels that fallback.

## Workflow

1. An administrator signs in and creates student and lecturer profiles from **Admin dashboard**. The first sign-in requires a password change.
2. A lecturer creates a module and shares the generated enrollment code with that class. Students enter the code in **Your modules** to join.
3. A lecturer uploads a question-paper PDF for one of their modules and sets the upload deadline date and time. Students in that module can see its published assignments.
4. UniCheck extracts text (OCR fallback for scans), stores the PDF privately, and creates question records in `review` status. The lecturer can edit or add blocks, verify questions one at a time, or use **Verify all questions**. Publishing is blocked until active question blocks are verified.
5. Students upload answer PDFs before the deadline. If a student selects a wrong PDF, they can remove the active submission and upload another before the deadline. Write answers in English for idea-similarity analysis. Start each main answer on a new line with `Q1`, `Q2`, `Q3`, and so on. Keep subparts such as `a)`, `e)`, `i)`, `ii)`, `1.`, or `2)` under that main question; do not use subpart markers alone to start a new main answer.
6. After the deadline, the backend compares all student pairs in the background and saves the highest similarity matches, including pairs with an overall or question-level score of at least 70%. The lecturer dashboard shows report readiness and the number of critical pairs. **Reports** displays up to 300 highest matches with both mapped answers side by side. If more pairs cross the threshold, the report indicates that it is capped. Jobs run while the backend is online and pending/failed jobs are retried when it starts again.

Similarity scores combine local English sentence-embedding results (85%) with question-specific weighted word overlap (10%) and shared wording (5%). Scores describe answer similarity; they do not decide why answers are alike. Short or common answers carry lower evidence confidence, since a short common answer such as `4` is not informative by itself.

## API overview

- `POST /api/auth/login`, `POST /api/auth/change-password`
- `GET/POST /api/auth/users` (administrator account list/create)
- `GET/POST /api/modules` (lecturer-owned modules)
- `GET /api/modules/mine`, `POST /api/modules/enroll` (student enrollment)
- `POST /api/upload/question-paper` (lecturer)
- `GET /api/assignments` and `GET /api/assignments/:assignmentId` (lecturer-owned assignments)
- `POST /api/assignments/:assignmentId/questions` (add a question block)
- `PATCH /api/assignments/:assignmentId/questions/:questionId`
- `POST /api/assignments/:assignmentId/questions/:questionId/verify`
- `POST /api/assignments/:assignmentId/publish`
- `GET /api/assignments/published` (published assignments for joined modules)
- `POST /api/submissions/:assignmentId`, `GET /api/submissions/mine`, `DELETE /api/submissions/:submissionId` (student upload, list, and pre-deadline replacement)
- `GET /api/submissions` (lecturer submissions)
- `GET /api/assignments/:assignmentId/report` (lecturer-owned report)

PDFs are stored under `backend/private_uploads` and must remain untracked. JWTs are sent in the `Authorization: Bearer` header. Protected APIs check the signed-in role and assignment/module ownership.

## Checks

From `backend`, run `npm test` for similarity-service and question-processing unit tests. From the repository root, run `npm run build` and `npm run lint` for the frontend.
