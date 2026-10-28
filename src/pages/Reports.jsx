import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

export default function Reports() {
  const [params, setParams] = useSearchParams();
  const [assignments, setAssignments] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState({});
  const [sharing, setSharing] = useState("");
  const [comparing, setComparing] = useState(false);
  const selected = params.get("assignment") || "";
  const selectedAssignment = assignments.find((item) => item.id === selected);
  const loadingReport = Boolean(selected && report?.assignment.id !== selected && !error);

  useEffect(() => {
    api("/assignments").then((data) => setAssignments(data.assignments)).catch((issue) => setError(issue.message));
  }, []);

  useEffect(() => {
    if (!selected) return undefined;
    let active = true;
    const refresh = () => api("/assignments/" + selected + "/report")
      .then((data) => { if (active) setReport(data); })
      .catch((issue) => { if (active) setError(issue.message); });
    void refresh();
    const timer = window.setInterval(refresh, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [selected]);

  async function shareFeedback(pair) {
    const pairKey = pair.submissionIds.join(":");
    setSharing(pairKey); setError(""); setMessage("");
    try {
      const result = await api("/assignments/" + selected + "/report/share", {
        method: "POST",
        body: { submissionIds: pair.submissionIds, note: notes[pairKey] || "" }
      });
      setMessage(result.message);
      setReport((current) => current ? {
        ...current,
        pairs: current.pairs.map((item) => item.submissionIds.join(":") === pairKey
          || item.submissionIds.slice().reverse().join(":") === pairKey
          ? { ...item, feedbackShared: true }
          : item)
      } : current);
    } catch (issue) { setError(issue.message); }
    finally { setSharing(""); }
  }

  async function compareNow() {
    setComparing(true); setError(""); setMessage("");
    try {
      await api(`/assignments/${selected}/report/run`, { method: "POST" });
      setMessage("Comparison started for the PDFs submitted so far. This report will refresh automatically; run it again after more students submit.");
      const data = await api(`/assignments/${selected}/report`);
      setReport(data);
    } catch (issue) { setError(issue.message); }
    finally { setComparing(false); }
  }

  return <div className="min-h-screen bg-emerald-50 p-5 md:p-8"><main className="mx-auto max-w-7xl">
    <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">Lecturer workspace</p>
    <h1 className="mt-2 text-3xl font-bold text-gray-800">Compare student answers</h1>
    <p className="mt-2 text-gray-600">Each question shows both saved answers side by side. Scores describe answer similarity only; they do not decide why answers are alike. You decide whether to share feedback with students.</p>
    <label className="mt-6 block max-w-xl text-sm font-medium text-gray-600">Assignment<select value={selected} onChange={(event) => { setError(""); setMessage(""); setReport(null); setParams(event.target.value ? { assignment: event.target.value } : {}); }} className="mt-2 w-full rounded-lg border bg-white p-3"><option value="">Choose an assignment</option>{assignments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    {loadingReport && <p role="status" className="mt-4 text-sm text-gray-500">Comparing answers… the first report may take longer while the local language model loads.</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">{message}</p>}
    {selected && <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={compareNow} disabled={comparing || report?.reportStatus === "processing" || (selectedAssignment?.submissionCount || 0) < 2} className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">{comparing || report?.reportStatus === "processing" ? "Comparing submitted PDFs…" : report?.reportStatus === "completed" ? "Compare latest submissions" : "Compare submissions now"}</button><span className="text-xs text-gray-500">{(selectedAssignment?.submissionCount || 0) < 2 ? "At least two student PDFs must be submitted first." : "Available before or after the deadline; each run uses submissions received at that time."}</span></div>}
    {report?.assignment.id === selected && <>
      <div className="mt-5 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">{report.assignment.title}</h2>
        <p className="mt-1 text-gray-600">{report.submissionCount} submissions · {report.automatic ? `${report.pairsCompared ?? 0} pairs compared · ${report.criticalPairCount ?? report.pairs.length} pairs met the review threshold` : `${report.pairs.length} student pairs`}</p>
        <p className="mt-3 rounded-lg bg-slate-900/5 p-3 text-sm text-gray-600">{report.note}</p>
        {report.truncated && <p className="mt-3 rounded-lg bg-amber-950/20 p-3 text-sm text-amber-300">Showing the highest 300 similarity pairs. {report.criticalPairCount - report.pairs.length} additional pairs also met the threshold.</p>}
      </div>
      {report.reportStatus === "waiting_deadline"
        ? <p className="mt-4 rounded-xl bg-white p-5 text-gray-600">Automatic final comparison runs after the deadline. You can also compare the current submissions any time with the button above.</p>
        : report.reportStatus === "processing" || report.reportStatus === "failed"
        ? <p className="mt-4 rounded-xl bg-white p-5 text-gray-600">{report.note}</p>
        : report.pairs.length === 0
        ? <p className="mt-4 rounded-xl bg-white p-5 text-gray-600">At least two submissions with mapped answers are needed for a comparison.</p>
        : <div className="mt-5 space-y-6">{report.pairs.map((pair) => {
          const pairKey = pair.submissionIds.join(":");
          return <section key={pairKey} className="rounded-xl bg-white p-5 shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Student comparison</p>
                <h3 className="mt-1 text-lg font-semibold">{pair.students[0].username} <span className="text-gray-500">vs</span> {pair.students[1].username}</h3>
                <p className="text-sm text-gray-500">{pair.comparedQuestions} questions with two answers to compare · {pair.similarityMethod === "semantic+text" ? "idea and wording comparison" : "wording comparison only"}</p>
              </div>
              <span className="rounded-full bg-amber-100 px-4 py-2 font-semibold text-amber-800">Overall similarity {pair.score}% · {pair.level}</span>
            </header>
            <div className="mt-4 rounded-lg border border-amber-900/30 bg-amber-950/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold">Share feedback with these students?</h4>
                  <p className="mt-1 max-w-3xl text-sm text-gray-500">This shares the overall score and question scores, including questions at or above 70%. It does not reveal the other student’s name or answer.</p>
                </div>
                <button type="button" disabled={Boolean(sharing)} onClick={() => shareFeedback(pair)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50">{sharing === pairKey ? "Sharing…" : pair.feedbackShared ? "Update shared feedback" : "Share feedback with both"}</button>
              </div>
              <label className="mt-3 block text-xs text-gray-500">Optional note from lecturer<textarea value={notes[pairKey] || ""} onChange={(event) => setNotes((current) => ({ ...current, [pairKey]: event.target.value }))} maxLength={1000} rows={2} className="mt-1 w-full rounded-lg border p-3 text-sm" placeholder="Add context or explain what the students should review." /></label>
              {pair.feedbackShared && <p className="mt-2 text-xs text-emerald-700">Feedback has been released to both student dashboards.</p>}
            </div>
            <div className="mt-4 space-y-4">{pair.questions.map((question) => <article key={question.questionId} className="rounded-lg border border-white/10 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold text-amber-700">{question.questionNumber}</h4>
                {question.score === null
                  ? <span className="text-sm text-gray-500">Cannot compare: one answer is missing</span>
                  : <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">Similarity {question.score}% · {question.level}</span>}
              </div>
              {question.score !== null && <div className="mb-3 rounded-lg bg-slate-900/5 p-3 text-sm">
                <p className="font-medium">Comparison details</p>
                <p className="mt-1 text-gray-600">
                  Wording overlap: {question.wordingScore ?? "—"}%
                  {question.semanticScore !== null
                    ? " · Idea similarity: " + question.semanticScore + "%"
                    : " · Idea similarity unavailable (text-only fallback)"}
                  {question.codeScore !== null && question.codeScore !== undefined ? " · Code structure: " + question.codeScore + "%" : ""}
                </p>
                <p className="mt-1 text-gray-500">Text evidence: {question.confidence}. {question.confidenceNote}</p>
                {question.commonAnswerPercent >= 35 && <p className="mt-1 text-gray-500">A similar answer appears in {question.commonAnswerPercent}% of submissions for this question.</p>}
                {question.matchedPhrases?.length > 0 && <div className="mt-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Shared exact wording</p>
                  <ul className="mt-1 list-disc pl-5 text-gray-700">{question.matchedPhrases.map((phrase) => <li key={phrase}>{phrase}</li>)}</ul>
                </div>}
              </div>}
              <div className="grid gap-3 md:grid-cols-2">{pair.students.map((student, index) => {
                const response = question.studentAnswers?.find((answer) => answer.studentId === student.id) || question.studentAnswers?.[index];
                const responseText = response?.answerText || "No answer was mapped to this question.";
                const codeAnswer = /[{};]|(?:==|!=|<=|>=|&&|\|\||=>|\+\+|--)/.test(responseText);
                return <section key={student.id} className="min-w-0 rounded-lg bg-black/10 p-4">
                  <div className="mb-2 border-b border-white/10 pb-2"><p className="font-medium">{student.username}</p><p className="text-xs text-gray-500">{student.email}</p></div>
                  {codeAnswer ? <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm leading-6 text-gray-700">{responseText}</pre> : <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{responseText}</p>}
                </section>;
              })}</div>
            </article>)}</div>
          </section>;
        })}</div>}
    </>}
  </main></div>;
}
