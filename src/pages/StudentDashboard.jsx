import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, currentUser, logout } from "../lib/api";
import BrandMark from "../components/BrandMark";


function moduleLabel(item) {
  return [item.moduleCode, item.moduleName].filter(Boolean).join(" · ") || "Unassigned module";
}
function deadlineLabel(dueAt, now) {
  if (!dueAt) return "No deadline set";
  if (now === null) return "Checking deadline…";
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return "Deadline unavailable";
  const remaining = due.getTime() - now;
  if (remaining <= 0) return `Closed · ${due.toLocaleString()}`;
  const hours = Math.floor(remaining / 3600000);
  const days = Math.floor(hours / 24);
  const leftHours = hours % 24;
  const leftMinutes = Math.floor((remaining % 3600000) / 60000);
  const countdown = days ? `${days}d ${leftHours}h left` : hours ? `${hours}h ${leftMinutes}m left` : `${leftMinutes}m left`;
  return `${countdown} · due ${due.toLocaleString()}`;
}

export default function StudentDashboard() {
  const [params, setParams] = useSearchParams();
  const [assignments, setAssignments] = useState([]);
  const [modules, setModules] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedModule, setSelectedModule] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [enrollmentCode, setEnrollmentCode] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(null);
  const user = currentUser();
  const view = params.get("view") || "overview";

  async function refresh() {
    const [assignmentData, submissionData, moduleData] = await Promise.all([api("/assignments/published"), api("/submissions/mine"), api("/modules/mine")]);
    setAssignments(assignmentData.assignments);
    setSubmissions(submissionData.submissions);
    setModules(moduleData.modules);
  }

  useEffect(() => {
    let active = true;
    Promise.all([api("/assignments/published"), api("/submissions/mine"), api("/modules/mine")])
      .then(([assignmentData, submissionData, moduleData]) => {
        if (!active) return;
        setAssignments(assignmentData.assignments);
        setSubmissions(submissionData.submissions);
        setModules(moduleData.modules);
      })
      .catch((issue) => { if (active) setError(issue.message); });
    const firstClock = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => { active = false; window.clearTimeout(firstClock); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (view !== "feedback" && view !== "submissions") return undefined;
    let active = true;
    Promise.all([api("/assignments/published"), api("/submissions/mine"), api("/modules/mine")])
      .then(([assignmentData, submissionData, moduleData]) => {
        if (!active) return;
        setAssignments(assignmentData.assignments);
        setSubmissions(submissionData.submissions);
        setModules(moduleData.modules);
      })
      .catch((issue) => { if (active) setError(issue.message); });
    return () => { active = false; };
  }, [view]);

  const visibleAssignments = selectedModule === "all" ? assignments : assignments.filter((item) => item.moduleId === selectedModule || moduleLabel(item) === selectedModule);
  const submissionsByAssignment = useMemo(() => new Map(submissions.map((item) => [item.assignmentId, item])), [submissions]);
  const releasedFeedback = submissions.flatMap((item) => (item.similarityFeedbacks || []).map((feedback) => ({ ...item, id: `${item.id}:${feedback.releaseId}`, similarityFeedback: feedback })));
  const openCount = assignments.filter((item) => now === null || !item.dueAt || new Date(item.dueAt).getTime() > now).length;

  async function submit(event, assignment) {
    event.preventDefault();
    setError(""); setMessage(""); setBusy(assignment.id);
    const formElement = event.currentTarget;
    try {
      const result = await api(`/submissions/${assignment.id}`, { method: "POST", body: new FormData(formElement) });
      setMessage(`${assignment.title} submitted. ${result.submission.mappedAnswers} answers were matched.`);
      formElement.reset();
      await refresh();
      setParams({ view: "submissions" });
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  }

  async function enroll(event) {
    event.preventDefault(); setError(""); setMessage(""); setBusy("enroll");
    try { const result = await api("/modules/enroll", { method: "POST", body: { enrollmentCode } }); setMessage(result.message); setEnrollmentCode(""); await refresh(); }
    catch (issue) { setError(issue.message); } finally { setBusy(""); }
  }

  async function removeSubmission(submission) {
    if (!window.confirm("Remove this answer PDF? You can upload a corrected PDF before the deadline.")) return;
    setError(""); setMessage(""); setBusy(submission.id);
    try { const result = await api(`/submissions/${submission.id}`, { method: "DELETE" }); setMessage(result.message); await refresh(); }
    catch (issue) { setError(issue.message); } finally { setBusy(""); }
  }

  function changeView(next) {
    setError(""); setMessage("");
    setParams(next === "overview" ? {} : { view: next });
  }

  const tabs = [
    ["overview", "Dashboard"], ["assignments", "Modules & assignments"],
    ["submissions", "My submissions"], ["feedback", "Lecturer feedback"]
  ];

  return <div className={`app-frame${collapsed ? " sidebar-collapsed" : ""}`}>
    <aside className="app-sidebar">
      <div className="app-brand"><BrandMark /><div><strong className="block text-lg">UniCheck</strong><span className="text-xs text-gray-500">Student workspace</span></div></div>
      <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[.18em] text-gray-500">My learning</p>
      <nav className="app-nav">{tabs.map(([key, label]) => <button key={key} type="button" className={view === key ? "active" : ""} onClick={() => changeView(key)}>{label}</button>)}</nav>
      <div className="app-sidebar-foot"><div className="mb-3 truncate font-medium text-gray-300">{user?.username || "Student"}</div><button onClick={logout} className="text-amber-400">Sign out ↗</button></div>
    </aside>
    <div className="app-main"><header className="app-topbar"><button className="sidebar-toggle" aria-label={collapsed ? "Expand sidebar" : "Minimize sidebar"} onClick={() => setCollapsed((value) => !value)}>☰</button>{tabs.find(([key]) => key === view)?.[1] || "Student dashboard"}<span className="ml-auto hidden text-sm font-normal text-gray-500 sm:block">Assignments · submissions · feedback</span></header>
      <main className="app-content mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-amber-400">STUDENT WORKSPACE</p><h1 className="mt-2 text-3xl font-bold text-gray-800">Hello, {user?.username || "Student"}</h1><p className="mt-1 text-gray-600">Choose a module, check assignment timing, and track your submissions.</p></div><button type="button" onClick={() => changeView("assignments")} className="rounded-lg bg-emerald-600 px-5 py-3 text-white">Browse assignments</button></header>
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">{message}</p>}

        {view === "overview" && <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><article className="rounded-xl border border-white/5 bg-white p-5"><p className="text-gray-500">Published assignments</p><strong className="mt-1 block text-3xl text-emerald-700">{assignments.length}</strong></article><article className="rounded-xl border border-white/5 bg-white p-5"><p className="text-gray-500">Open for submission</p><strong className="mt-1 block text-3xl text-amber-400">{openCount}</strong></article><article className="rounded-xl border border-white/5 bg-white p-5"><p className="text-gray-500">Submitted</p><strong className="mt-1 block text-3xl text-blue-400">{submissions.length}</strong></article><article className="rounded-xl border border-white/5 bg-white p-5"><p className="text-gray-500">Feedback shared</p><strong className="mt-1 block text-3xl text-amber-400">{releasedFeedback.length}</strong></article></section>
          <section className="mt-7 rounded-xl bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Your modules</h2><p className="mt-1 text-sm text-gray-500">Enter an enrollment code shared by a lecturer.</p></div><button onClick={() => changeView("assignments")} className="text-emerald-700">View assignments →</button></div><form onSubmit={enroll} className="mt-4 flex flex-wrap gap-3"><input value={enrollmentCode} onChange={(event) => setEnrollmentCode(event.target.value)} placeholder="Module enrollment code" className="min-w-60 rounded-lg border p-3"/><button disabled={busy === "enroll"} className="rounded-lg bg-emerald-600 px-4 py-2 text-white">{busy === "enroll" ? "Joining…" : "Join module"}</button></form>{modules.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{modules.map((module) => <button key={module.id} onClick={() => { setSelectedModule(module.id); changeView("assignments"); }} className="rounded-lg border border-white/10 p-4 text-left hover:border-amber-700"><span className="text-xs font-semibold uppercase tracking-wide text-amber-400">{module.lecturer}</span><strong className="mt-1 block">{module.code} · {module.name}</strong><span className="mt-2 block text-sm text-gray-500">{assignments.filter((item) => item.moduleId === module.id).length} published assignments</span></button>)}</div> : <p className="mt-4 text-gray-500">You have not joined any modules yet.</p>}</section>
          <section className="mt-6 rounded-xl bg-white p-5"><h2 className="text-xl font-semibold">Recent submissions</h2>{submissions.length ? <div className="mt-3 space-y-3">{submissions.slice(0, 4).map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 border-b border-white/10 py-3"><span>{item.assignmentTitle}</span><span className="text-sm text-gray-500">{item.status} · {item.answerCount} answers</span></div>)}</div> : <p className="mt-3 text-gray-500">You have not submitted an assignment yet.</p>}</section>
        </>}

        {view === "assignments" && <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Published assignments</h2><p className="mt-1 text-sm text-gray-500">Upload before the date and time set by your lecturer.</p></div><label className="min-w-60 text-sm text-gray-500">Filter by module<select value={selectedModule} onChange={(event) => setSelectedModule(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2"><option value="all">All modules</option>{modules.map((module) => <option key={module.id} value={module.id}>{module.code} · {module.name}</option>)}</select></label></div>
          {visibleAssignments.length ? <div className="grid gap-4 lg:grid-cols-2">{visibleAssignments.map((item) => {
            const submitted = submissionsByAssignment.get(item.id);
            const isClosed = Boolean(now !== null && item.dueAt && new Date(item.dueAt).getTime() <= now);
            return <article key={item.id} className="rounded-xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">{moduleLabel(item)}</span><h3 className="mt-3 text-lg font-semibold text-gray-800">{item.title}</h3></div><span className={`rounded-full px-3 py-1 text-xs ${submitted ? "bg-emerald-100 text-emerald-700" : isClosed ? "bg-red-900/30 text-red-300" : "bg-amber-100 text-amber-700"}`}>{submitted ? "Submitted" : isClosed ? "Closed" : "Open"}</span></div><p className="mt-2 text-sm text-gray-500">{item.description || "No instructions provided."} · Lecturer: {item.lecturer}</p><div className="mt-4 rounded-lg border border-white/10 p-3 text-sm"><span className="text-gray-500">Upload deadline</span><br/><strong>{deadlineLabel(item.dueAt, now)}</strong></div>
              {submitted ? <div className="mt-4"><p className="text-sm text-emerald-300">Your answer paper is saved. Status: {submitted.status} · {submitted.answerCount} mapped answers.</p>{!isClosed && <button disabled={busy === submitted.id} onClick={() => removeSubmission(submitted)} className="mt-3 rounded-lg border border-red-900/50 px-4 py-2 text-red-300 disabled:opacity-50">{busy === submitted.id ? "Removing…" : "Remove wrong PDF and resubmit"}</button>}</div> : isClosed ? <p className="mt-4 text-sm text-red-300">The submission window has closed.</p> : <form onSubmit={(event) => submit(event, item)} className="mt-4 flex flex-wrap items-center gap-3"><div className="basis-full rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><p className="font-semibold">Answer-sheet format</p><p className="mt-1">Write answers in English for the idea-similarity analysis. Start every main question on a new line with Q1, Q2, Q3, and so on. Keep subparts such as e), i), ii), 1., and 2) under that main question; do not start a new main answer with a subpart label alone.</p><p className="mt-1">For code snippets, write the code on separate lines and leave a blank line before the next question part. Start each new main question with Q followed by its number.</p><p className="mt-1">Example: Q1, then e), i), ii), 1., 2); start the next main answer with Q2.</p></div><input name="pdf" type="file" accept="application/pdf,.pdf" required className="max-w-full rounded-lg border p-2"/><button disabled={busy === item.id} className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-60">{busy === item.id ? "Uploading…" : "Submit answers"}</button></form>}
            </article>;
          })}</div> : <p className="rounded-xl bg-white p-6 text-gray-600">No published assignments are available for this module.</p>}
        </section>}

        {view === "submissions" && <section className="space-y-4"><h2 className="text-xl font-semibold">My submissions</h2>{submissions.length ? submissions.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-5"><div><h3 className="font-semibold">{item.assignmentTitle}</h3><p className="mt-1 text-sm text-gray-500">{new Date(item.createdAt).toLocaleString()} · {item.answerCount} mapped answers</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">{item.status}</span></article>) : <p className="rounded-xl bg-white p-6 text-gray-600">No submissions yet.</p>}</section>}

        {view === "feedback" && <section className="space-y-4"><div><h2 className="text-xl font-semibold">Lecturer-shared similarity feedback</h2><p className="mt-1 text-sm text-gray-500">Feedback appears here only when your lecturer chooses to release it. Similarity is a review signal, not a finding of misconduct.</p></div>{releasedFeedback.length ? releasedFeedback.map((item) => { const feedback = item.similarityFeedback; const flagged = feedback.questions.filter((question) => question.score >= feedback.threshold); return <article key={item.id} className="rounded-xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{item.assignmentTitle}</h3><p className="mt-1 text-xs text-gray-500">Shared {new Date(feedback.releasedAt).toLocaleString()}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">Overall similarity {feedback.overallScore}% · {feedback.level}</span></div><p className="mt-4 text-sm text-gray-300">{feedback.note || "Your lecturer has shared this comparison for your review."}</p><div className="mt-4 rounded-lg border border-white/10 p-4"><h4 className="font-medium">Questions at or above {feedback.threshold}%</h4>{flagged.length ? <ul className="mt-2 space-y-2">{flagged.map((question) => <li key={question.questionNumber} className="flex justify-between gap-3 text-sm"><div><span>{question.questionNumber}</span>{question.confidenceNote && <p className="mt-1 max-w-xl text-xs text-gray-500">Text evidence: {question.confidence}. {question.confidenceNote}</p>}</div><span className="font-semibold text-amber-800">{question.score}% · {question.level}</span></li>)}</ul> : <p className="mt-2 text-sm text-gray-500">No question in this shared comparison reached the {feedback.threshold}% review threshold.</p>}</div></article>; }) : <p className="rounded-xl bg-white p-6 text-gray-600">Your lecturer has not shared similarity feedback yet.</p>}</section>}
      </main>
    </div>
  </div>;
}
