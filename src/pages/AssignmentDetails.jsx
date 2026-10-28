import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function AssignmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [settings, setSettings] = useState({ moduleCode: "", moduleName: "", dueAt: "", durationMinutes: "" });
  const activeQuestions = useMemo(() => questions.filter((question) => question.verificationStatus !== "rejected"), [questions]);
  const rejectedQuestions = useMemo(() => questions.filter((question) => question.verificationStatus === "rejected"), [questions]);

  async function refresh() {
    const data = await api(`/assignments/${id}`);
    setAssignment(data.assignment);
    setQuestions(data.questions);
    setSettings({ moduleCode: data.assignment.moduleCode || "", moduleName: data.assignment.moduleName || "", dueAt: toLocalDateTime(data.assignment.dueAt), durationMinutes: data.assignment.durationMinutes ?? "" });
  }

  useEffect(() => {
    let active = true;
    api(`/assignments/${id}`)
      .then((data) => {
        if (!active) return;
        setAssignment(data.assignment);
        setQuestions(data.questions);
        setSettings({ moduleCode: data.assignment.moduleCode || "", moduleName: data.assignment.moduleName || "", dueAt: toLocalDateTime(data.assignment.dueAt), durationMinutes: data.assignment.durationMinutes ?? "" });
      })
      .catch((issue) => { if (active) setError(issue.message); });
    return () => { active = false; };
  }, [id]);

  function changeSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings(event) {
    event.preventDefault(); setBusy("settings"); setError(""); setMessage("");
    try {
      const result = await api(`/assignments/${id}/settings`, { method: "PATCH", body: {
        moduleCode: settings.moduleCode, moduleName: settings.moduleName,
        dueAt: settings.dueAt ? new Date(settings.dueAt).toISOString() : null,
        durationMinutes: settings.durationMinutes === "" ? null : Number(settings.durationMinutes)
      } });
      setAssignment((current) => ({ ...current, ...result.assignment }));
      setMessage("Module and timing details saved to UniCheck.");
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  }

  function change(questionId, key, value) {
    setQuestions((current) => current.map((question) => question.id === questionId ? { ...question, [key]: value } : question));
  }

  function questionBody(question) {
    return { questionNumber: question.questionNumber, questionText: question.questionText };
  }

  async function save(question) {
    setBusy(question.id); setError(""); setMessage("");
    try {
      await api(`/assignments/${id}/questions/${question.id}`, { method: "PATCH", body: questionBody(question) });
      setMessage(`${question.questionNumber} saved to UniCheck. The stored block is shown below.`);
      await refresh();
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  }

  async function verify(question) {
    setBusy(question.id); setError(""); setMessage("");
    try {
      const result = await api(`/assignments/${id}/questions/${question.id}`, { method: "PATCH", body: questionBody(question) });
      await api(`/assignments/${id}/questions/${result.question.id}/verify`, { method: "POST" });
      setMessage(`${question.questionNumber} saved and verified.`);
      await refresh();
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  }

  async function verifyAll() {
    setBusy("all"); setError(""); setMessage("");
    try {
      await Promise.all(activeQuestions.map((question) => api(`/assignments/${id}/questions/${question.id}`, { method: "PATCH", body: questionBody(question) })));
      const result = await api(`/assignments/${id}/questions/verify-all`, { method: "POST" });
      setMessage(result.message);
      await refresh();
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  }

  async function reject(question) {
    setBusy(question.id); setError(""); setMessage("");
    try {
      const result = await api(`/assignments/${id}/questions/${question.id}/reject`, { method: "POST" });
      setMessage(result.message);
      await refresh();
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  }

  async function restore(question) {
    setBusy(question.id); setError(""); setMessage("");
    try {
      const result = await api(`/assignments/${id}/questions/${question.id}/restore`, { method: "POST" });
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

  const verifiedCount = activeQuestions.filter((question) => question.verificationStatus === "verified").length;
  const canReview = assignment?.status === "review";

  return <div className="min-h-screen bg-emerald-50 p-5 md:p-8"><main className="mx-auto max-w-5xl">
    <button onClick={() => navigate("/assignments")} className="mb-5 text-emerald-700">← Assignments</button>
    <header className="mb-6 rounded-xl bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-800">{assignment?.title || "Loading assignment…"}</h1><p className="mt-2 text-gray-600">{assignment?.description}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm capitalize text-emerald-700">{assignment?.status}</span></div></header>
    {assignment && <form onSubmit={saveSettings} className="mb-6 rounded-xl border border-white/10 bg-white p-5"><div className="mb-4"><h2 className="font-semibold">Module and timing</h2><p className="mt-1 text-sm text-gray-500">Set the module filter and submission deadline students see on their dashboard. Duration is shown as expected exam time.</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-gray-500">Module code<input value={settings.moduleCode} onChange={(event) => changeSetting("moduleCode", event.target.value)} maxLength="24" className="mt-1 w-full rounded-lg border p-3" placeholder="e.g. EE5253" /></label><label className="block text-sm text-gray-500">Module name<input value={settings.moduleName} onChange={(event) => changeSetting("moduleName", event.target.value)} maxLength="120" className="mt-1 w-full rounded-lg border p-3" placeholder="e.g. Machine Learning" /></label><label className="block text-sm text-gray-500">Submission deadline<input type="datetime-local" value={settings.dueAt} onChange={(event) => changeSetting("dueAt", event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label><label className="block text-sm text-gray-500">Expected duration (minutes)<input type="number" min="1" max="1440" value={settings.durationMinutes} onChange={(event) => changeSetting("durationMinutes", event.target.value)} className="mt-1 w-full rounded-lg border p-3" placeholder="Optional" /></label></div><button disabled={Boolean(busy)} className="mt-4 rounded-lg border border-emerald-700 px-4 py-2 text-emerald-700 disabled:opacity-50">{busy === "settings" ? "Saving…" : "Save module and timing"}</button></form>}
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">{message}</p>}
    <section className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-gray-800">Questions saved in UniCheck ({activeQuestions.length})</h2><p className="mt-1 text-sm text-gray-500">Loaded from the database. Labels and parent links are shown with each saved block.</p></div>{canReview && <span className="text-sm text-gray-600">{verifiedCount} of {activeQuestions.length} verified</span>}</section>
    <div className="space-y-4">{activeQuestions.map((question, index) => <article key={question.id} className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><label className="text-sm font-medium text-gray-600">Question label<input value={question.questionNumber} onChange={(event) => change(question.id, "questionNumber", event.target.value)} disabled={!canReview} className="ml-3 w-36 rounded border p-2 text-gray-800" /></label><span className="text-xs text-gray-500">Saved block {index + 1} of {activeQuestions.length}</span><span className={`rounded-full px-3 py-1 text-xs ${question.verificationStatus === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{question.verificationStatus === "verified" ? "Verified" : "Needs review"}</span></div>
      {question.parentQuestionNumber && <p className="mt-3 text-xs text-gray-500">Parent question: {question.parentQuestionNumber}</p>}
      <textarea rows="3" value={question.questionText} onChange={(event) => change(question.id, "questionText", event.target.value)} disabled={!canReview} className="mt-4 w-full rounded-lg border p-3 text-gray-700 disabled:bg-gray-50" />
      {canReview && <div className="mt-3 flex flex-wrap gap-3"><button disabled={Boolean(busy)} onClick={() => save(question)} className="rounded-lg border px-4 py-2 text-emerald-700 disabled:opacity-50">Save</button><button disabled={Boolean(busy)} onClick={() => verify(question)} className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">{busy === question.id ? "Saving…" : "Save and verify"}</button><button disabled={Boolean(busy)} onClick={() => reject(question)} className="rounded-lg border border-red-900/40 px-4 py-2 text-red-300 disabled:opacity-50">{busy === question.id ? "Updating…" : "Reject block"}</button></div>}
    </article>)}</div>
    {!activeQuestions.length && assignment && <p className="rounded-xl bg-white p-5 text-gray-600">No active question blocks. Restore a rejected block or upload the paper again.</p>}
    {rejectedQuestions.length > 0 && <section className="mt-8 rounded-xl border border-red-900/40 bg-white p-5"><h2 className="text-lg font-semibold text-gray-800">Rejected blocks ({rejectedQuestions.length})</h2><p className="mt-1 text-sm text-gray-500">These blocks are excluded from verification and student answer matching. You can restore one if it was rejected by mistake.</p><div className="mt-4 space-y-3">{rejectedQuestions.map((question) => <article key={question.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4"><div><strong className="text-amber-300">{question.questionNumber}</strong><p className="mt-1 whitespace-pre-wrap text-sm text-gray-400">{question.questionText}</p></div>{canReview && <button disabled={Boolean(busy)} onClick={() => restore(question)} className="rounded-lg border px-4 py-2 text-emerald-700 disabled:opacity-50">{busy === question.id ? "Restoring…" : "Restore block"}</button>}</article>)}</div></section>}
    {canReview && <div className="mt-6 rounded-xl bg-white p-5"><p className="mb-3 text-sm text-gray-600">Verify the active blocks before publishing. Rejected blocks remain saved for your review but will not be assigned or compared.</p><div className="flex flex-wrap gap-3"><button disabled={Boolean(busy) || activeQuestions.length === 0} onClick={verifyAll} className="rounded-lg border border-emerald-700 px-5 py-3 text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40">{busy === "all" ? "Verifying all…" : `Verify all ${activeQuestions.length} questions`}</button><button disabled={Boolean(busy) || activeQuestions.length === 0 || verifiedCount !== activeQuestions.length} onClick={publish} className="rounded-lg bg-emerald-700 px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-40">{busy === "publish" ? "Publishing…" : "Publish assignment"}</button></div></div>}
  </main></div>;
}
