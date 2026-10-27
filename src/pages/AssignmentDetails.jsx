import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

export default function AssignmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function refresh() {
    const data = await api(`/assignments/${id}`);
    setAssignment(data.assignment);
    setQuestions(data.questions);
  }

  useEffect(() => {
    let active = true;
    api(`/assignments/${id}`)
      .then((data) => {
        if (!active) return;
        setAssignment(data.assignment);
        setQuestions(data.questions);
      })
      .catch((issue) => { if (active) setError(issue.message); });
    return () => { active = false; };
  }, [id]);

  function change(questionId, key, value) {
    setQuestions((current) => current.map((question) => question.id === questionId ? { ...question, [key]: value } : question));
  }

  function questionBody(question) {
    return {
      questionNumber: question.questionNumber,
      questionText: question.questionText,
      marks: question.marks === "" ? null : question.marks,
    };
  }

  async function save(question) {
    setBusy(question.id); setError(""); setMessage("");
    try {
      await api(`/assignments/${id}/questions/${question.id}`, { method: "PATCH", body: questionBody(question) });
      setMessage(`${question.questionNumber} saved. Verify it when the wording is correct.`);
      await refresh();
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  }

  async function verify(question) {
    setBusy(question.id); setError(""); setMessage("");
    try {
      const result = await api(`/assignments/${id}/questions/${question.id}`, { method: "PATCH", body: questionBody(question) });
      await api(`/assignments/${id}/questions/${result.question.id}/verify`, { method: "POST" });
      setMessage(`${question.questionNumber} verified.`);
      await refresh();
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  }

  async function verifyAll() {
    setBusy("all"); setError(""); setMessage("");
    try {
      await Promise.all(questions.map((question) => api(`/assignments/${id}/questions/${question.id}`, { method: "PATCH", body: questionBody(question) })));
      const result = await api(`/assignments/${id}/questions/verify-all`, { method: "POST" });
      setMessage(result.message);
      await refresh();
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  }

  async function publish() {
    setBusy("publish"); setError(""); setMessage("");
    try {
      const result = await api(`/assignments/${id}/publish`, { method: "POST" });
      setMessage(result.message);
      await refresh();
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  }

  if (error && !assignment) {
    return <main className="min-h-screen bg-emerald-50 p-8"><p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p><button onClick={() => navigate("/assignments")} className="mt-4 text-emerald-700">Back to assignments</button></main>;
  }

  const verifiedCount = questions.filter((question) => question.verificationStatus === "verified").length;
  const canReview = assignment?.status === "review";

  return <div className="min-h-screen bg-emerald-50 p-5 md:p-8"><main className="mx-auto max-w-5xl">
    <button onClick={() => navigate("/assignments")} className="mb-5 text-emerald-700">← Assignments</button>
    <header className="mb-6 rounded-xl bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-800">{assignment?.title || "Loading assignment…"}</h1><p className="mt-2 text-gray-600">{assignment?.description}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm capitalize text-emerald-700">{assignment?.status}</span></div></header>
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">{message}</p>}
    <section className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold text-gray-800">Questions to review ({questions.length})</h2>{canReview && <span className="text-sm text-gray-600">{verifiedCount} of {questions.length} verified</span>}</section>
    <div className="space-y-4">{questions.map((question, index) => <article key={question.id} className="rounded-xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><label className="text-sm font-medium text-gray-600">Question label<input value={question.questionNumber} onChange={(event) => change(question.id, "questionNumber", event.target.value)} disabled={!canReview} className="ml-3 w-36 rounded border p-2 text-gray-800" /></label><label className="text-sm text-gray-600">Marks<input type="number" min="0" value={question.marks ?? ""} onChange={(event) => change(question.id, "marks", event.target.value)} disabled={!canReview} className="ml-2 w-24 rounded border p-2" /></label><span className="text-xs text-gray-500">Block {index + 1} of {questions.length}</span><span className={`rounded-full px-3 py-1 text-xs ${question.verificationStatus === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{question.verificationStatus}</span></div><textarea rows="3" value={question.questionText} onChange={(event) => change(question.id, "questionText", event.target.value)} disabled={!canReview} className="mt-4 w-full rounded-lg border p-3 text-gray-700 disabled:bg-gray-50" />{canReview && <div className="mt-3 flex gap-3"><button disabled={Boolean(busy)} onClick={() => save(question)} className="rounded-lg border px-4 py-2 text-emerald-700 disabled:opacity-50">Save</button><button disabled={Boolean(busy)} onClick={() => verify(question)} className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">{busy === question.id ? "Saving…" : "Save and verify"}</button></div>}</article>)}</div>
    {!questions.length && assignment && <p className="rounded-xl bg-white p-5">No non-empty questions were extracted. Check the PDF and try uploading it again.</p>}
    {canReview && <div className="mt-6 rounded-xl bg-white p-5"><p className="mb-3 text-sm text-gray-600">Review the wording above. You can verify each block individually or verify all {questions.length} blocks together.</p><div className="flex flex-wrap gap-3"><button disabled={Boolean(busy) || questions.length === 0} onClick={verifyAll} className="rounded-lg border border-emerald-700 px-5 py-3 text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40">{busy === "all" ? "Verifying all…" : `Verify all ${questions.length} questions`}</button><button disabled={Boolean(busy) || questions.length === 0 || verifiedCount !== questions.length} onClick={publish} className="rounded-lg bg-emerald-700 px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-40">{busy === "publish" ? "Publishing…" : "Publish assignment"}</button></div></div>}
  </main></div>;
}
