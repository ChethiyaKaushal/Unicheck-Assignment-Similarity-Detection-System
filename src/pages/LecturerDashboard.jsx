import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { api, currentUser, logout } from "../lib/api";
import BrandMark from "../components/BrandMark";

export default function LecturerDashboard() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api("/assignments"), api("/submissions")])
      .then(([a, s]) => { setAssignments(a.assignments); setSubmissions(s.submissions); })
      .catch((issue) => setError(issue.message));
  }, []);
  const user = currentUser();
  const navClass = ({ isActive }) => isActive ? "active" : "";
  return <div className="app-frame">
    <aside className="app-sidebar">
      <div className="app-brand"><BrandMark /><div><strong className="block text-lg">UniCheck</strong><span className="text-xs text-gray-500">Lecturer workspace</span></div></div>
      <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[.18em] text-gray-500">Workspace</p>
      <nav className="app-nav">
        <NavLink to="/lecturer-dashboard" className={navClass}><span>⌂</span>Dashboard</NavLink>
        <NavLink to="/assignments" className={navClass}><span>▤</span>Assignments</NavLink>
        <NavLink to="/modules/manage" className={navClass}><span>▦</span>Modules</NavLink>
        <NavLink to="/submissions" className={navClass}><span>⇧</span>Submissions</NavLink>
        <NavLink to="/reports" className={navClass}><span>◷</span>Similarity reports</NavLink>
        <NavLink to="/profile" className={navClass}><span>○</span>Profile</NavLink>
      </nav>
      <div className="app-sidebar-foot"><div className="mb-3 truncate font-medium text-gray-300">{user?.username || "Lecturer"}</div><button onClick={logout} className="text-amber-400">Sign out ↗</button></div>
    </aside>
    <div className="app-main"><header className="app-topbar">Dashboard <span className="ml-auto hidden text-sm font-normal text-gray-500 sm:block">Assignment integrity workspace</span></header>
      <main className="app-content mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-amber-400">LECTURER OVERVIEW</p><h1 className="mt-2 text-3xl font-bold text-gray-800">Welcome, {user?.username || "Lecturer"}</h1><p className="mt-1 text-gray-600">Manage question papers, submissions, and similarity reviews.</p></div><button onClick={() => navigate("/assignments/new")} className="rounded-lg bg-emerald-600 px-5 py-3 text-white">+ Upload question paper</button></header>
        {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        <section className="mt-7 grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-white/5 bg-white p-5"><p className="text-gray-500">Assignments</p><strong className="text-3xl text-emerald-700">{assignments.length}</strong></div><div className="rounded-xl border border-white/5 bg-white p-5"><p className="text-gray-500">Submissions</p><strong className="text-3xl text-blue-700">{submissions.length}</strong></div><div className="rounded-xl border border-white/5 bg-white p-5"><p className="text-gray-500">Questions needing review</p><strong className="text-3xl text-amber-600">{assignments.reduce((sum, item) => sum + item.pendingQuestions, 0)}</strong></div></section>
        <section className="mt-7 rounded-xl border border-white/5 bg-white p-5 shadow-sm"><div className="mb-2 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Your assignments</h2><p className="mt-1 text-sm text-gray-500">Continue reviewing or open a published assignment.</p></div><Link to="/assignments" className="text-emerald-700">View all →</Link></div>{assignments.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-3 border-b py-4"><div><strong>{item.title}</strong><p className="text-sm text-gray-500">{item.questionCount} questions · {item.status}</p></div><Link to={`/assignment/${item.id}`} className="self-center text-emerald-700">{item.status === "review" ? "Review questions →" : "Open →"}</Link></div>)}{!assignments.length && !error && <p className="mt-4 text-gray-600">Upload your first question paper to start.</p>}</section>
      </main>
    </div>
  </div>;
}
