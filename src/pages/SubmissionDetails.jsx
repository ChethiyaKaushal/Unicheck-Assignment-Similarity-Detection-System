import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

export default function SubmissionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api(`/submissions/${id}`)
      .then((data) => { if (active) setSubmission(data.submission); })
      .catch((issue) => { if (active) setError(issue.message); });
    return () => { active = false; };
  }, [id]);

  if (error) return <main className="min-h-screen bg-emerald-50 p-8"><p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p><button onClick={() => navigate("/submissions")} className="mt-4 text-emerald-700">Back to submissions</button></main>;

  const answers = submission?.answers || [];
  const mappedCount = answers.filter((answer) => answer.isSaved).length;
  return <div className="min-h-screen bg-emerald-50 p-5 md:p-8">
    <main className="mx-auto max-w-5xl">
      <Link to="/submissions" className="mb-5 inline-block text-emerald-700">← Submissions</Link>
      <header className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">Saved submission</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-800">{submission?.assignmentTitle || "Loading submission…"}</h1>
        {submission && <p className="mt-2 text-gray-600">{submission.student.username} · {submission.student.email} · {new Date(submission.createdAt).toLocaleString()}</p>}
        <p className="mt-3 text-sm text-gray-500">{mappedCount} of {answers.length} stored question blocks have a matched answer.</p>
      </header>
      <section className="mt-6 space-y-4">
        {answers.map((answer) => <article key={answer.questionId} className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-amber-300">{answer.questionNumber}</h2><span className={`rounded-full px-3 py-1 text-xs ${answer.isSaved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{answer.isSaved ? "Saved answer" : "No answer mapped"}</span></div>
          {answer.parentQuestionNumber && <p className="mt-1 text-xs text-gray-500">Parent question: {answer.parentQuestionNumber}</p>}
          {answer.questionText && <p className="mt-3 text-sm text-gray-500">{answer.questionText}</p>}
          <div className="mt-4 rounded-lg border border-white/10 bg-black/10 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Student answer stored in database</p><p className="whitespace-pre-wrap text-sm leading-6 text-gray-200">{answer.answerText || "No labeled answer was matched to this question."}</p></div>
        </article>)}
        {submission && !answers.length && <p className="rounded-xl bg-white p-6 text-gray-600">No active question blocks were available for this submission.</p>}
      </section>
    </main>
  </div>;
}
