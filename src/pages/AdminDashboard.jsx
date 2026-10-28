import { useEffect, useMemo, useState } from "react";
import { api, currentUser, logout } from "../lib/api";
import BrandMark from "../components/BrandMark";

const sections = ["Overview", "Users", "Modules", "Assignments", "Activity"];
const panel = "rounded-xl border border-white/10 bg-white p-5 shadow-sm";
const field = "mt-1 w-full rounded-lg border border-slate-200 p-3 text-gray-800";
const button = "rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50";

export default function AdminDashboard() {
  const [section, setSection] = useState("Overview");
  const [data, setData] = useState({ overview: null, users: [], modules: [], assignments: [], logs: [] });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const admin = currentUser();

  async function refresh() {
    const [overview, users, modules, assignments] = await Promise.all([
      api("/admin/overview"), api("/admin/users"), api("/admin/modules"), api("/admin/assignments")
    ]);
    setData((current) => ({ ...current, overview, users: users.users, modules: modules.modules, assignments: assignments.assignments }));
  }
  useEffect(() => {
    let active = true;
    Promise.all([api("/admin/overview"), api("/admin/users"), api("/admin/modules"), api("/admin/assignments")])
      .then(([overview, users, modules, assignments]) => {
        if (active) setData((current) => ({ ...current, overview, users: users.users, modules: modules.modules, assignments: assignments.assignments }));
      })
      .catch((issue) => { if (active) setError(issue.message); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (section !== "Activity") return undefined;
    let active = true;
    api("/admin/activity").then((result) => {
      if (active) setData((current) => ({ ...current, logs: result.logs }));
    }).catch((issue) => { if (active) setError(issue.message); });
    return () => { active = false; };
  }, [section]);

  async function runAction(key, action, success) {
    setBusy(key); setError(""); setMessage("");
    try {
      const result = await action(); setMessage(result?.message || success); await refresh();
      if (section === "Activity") { const logs = await api("/admin/activity"); setData((current) => ({ ...current, logs: logs.logs })); }
      return result;
    }
    catch (issue) { setError(issue.message); return null; }
    finally { setBusy(""); }
  }
  async function createUser(event) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    const result = await runAction("create-user", () => api("/admin/users", { method: "POST", body: { username: form.get("username"), email: form.get("email"), password: form.get("password"), role: form.get("role") } }), "Account created.");
    if (result) formElement.reset();
  }
  async function resetPassword(user) {
    const result = await runAction(`reset-${user.id}`, () => api(`/admin/users/${user.id}/reset-password`, { method: "POST" }), "Temporary password created.");
    if (result?.temporaryPassword) setMessage(`${result.message} Temporary password for ${user.email}: ${result.temporaryPassword}`);
  }
  async function createModule(event) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    const result = await runAction("create-module", () => api("/admin/modules", { method: "POST", body: { name: form.get("name"), code: form.get("code"), description: form.get("description"), lecturerId: form.get("lecturerId") } }), "Module created.");
    if (result) formElement.reset();
  }
  async function createAssignment(event) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    const result = await runAction("create-assignment", () => api("/admin/assignments", { method: "POST", body: form }), "Assignment created and sent for question extraction.");
    if (result) formElement.reset();
  }
  async function removeUser(user) {
    if (!window.confirm(`Permanently delete unused account ${user.email}? Accounts linked to coursework cannot be deleted; deactivate those instead.`)) return;
    await runAction(`delete-${user.id}`, () => api(`/admin/users/${user.id}`, { method: "DELETE" }), "Account deleted.");
  }
  async function setStatus(user) {
    const status = user.status === "active" ? "inactive" : "active";
    await runAction(`status-${user.id}`, () => api(`/admin/users/${user.id}`, { method: "PATCH", body: { status } }), `Account ${status}.`);
  }
  async function setArchived(kind, item) {
    if (!item.isArchived && !window.confirm(`Archive this ${kind}? It will be hidden from active use, but submissions and reports will be preserved and it can be restored.`)) return;
    const path = kind === "module" ? `/admin/modules/${item.id}/archive` : `/admin/assignments/${item.id}/archive`;
    await runAction(`${kind}-${item.id}`, () => api(path, { method: "PATCH", body: { isArchived: !item.isArchived } }), `${kind} updated.`);
  }

  const activeLecturers = data.users.filter((user) => user.role === "lecturer" && user.status === "active");
  const activeModules = data.modules.filter((module) => !module.isArchived);
  const currentModule = activeModules.find((module) => module.id === selectedModule);
  const filteredUsers = useMemo(() => data.users.filter((user) => `${user.username} ${user.email} ${user.role} ${user.status}`.toLowerCase().includes(search.toLowerCase())), [data.users, search]);
  const filteredModules = useMemo(() => data.modules.filter((item) => `${item.name} ${item.code} ${item.lecturer?.username || ""}`.toLowerCase().includes(search.toLowerCase())), [data.modules, search]);
  const filteredAssignments = useMemo(() => data.assignments.filter((item) => `${item.title} ${item.module?.code || ""} ${item.lecturer?.username || ""} ${item.status}`.toLowerCase().includes(search.toLowerCase())), [data.assignments, search]);

  return <div className="app-frame"><aside className="app-sidebar"><div className="app-brand"><BrandMark /><div><strong className="block text-lg">UniCheck</strong><span className="text-xs text-gray-500">Admin workspace</span></div></div><nav className="app-nav">{sections.map((item) => <button key={item} type="button" onClick={() => { setSection(item); setSearch(""); setError(""); }} className={`w-full rounded-lg px-3 py-2 text-left ${section === item ? "active" : ""}`}>{item}</button>)}</nav><div className="app-sidebar-foot"><div className="mb-3 truncate font-medium">{admin?.username || "Administrator"}</div><button onClick={logout} className="text-amber-400">Sign out ↗</button></div></aside>
    <div className="app-main"><header className="app-topbar">Administrator dashboard</header><main className="app-content mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold">{section}</h1><p className="mt-2 text-gray-500">Manage UniCheck accounts, modules, and assignments.</p></div>{["Users", "Modules", "Assignments"].includes(section) && <input aria-label="Search" value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-lg border p-3" placeholder={`Search ${section.toLowerCase()}…`} />}</div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{message && <p role="status" className="mt-4 break-all rounded-lg bg-emerald-50 p-3 text-emerald-800">{message}</p>}

      {section === "Overview" && <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        ["Users", data.overview?.users?.reduce((sum, item) => sum + item.total, 0) || 0], ["Active modules", data.overview?.modules ?? 0], ["Assignments", data.overview?.assignments ?? 0], ["Submissions", data.overview?.submissions ?? 0]
      ].map(([label, value]) => <article key={label} className={panel}><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-3xl font-bold text-amber-300">{value}</p></article>)}<section className={`${panel} sm:col-span-2 xl:col-span-4`}><h2 className="text-lg font-semibold">Accounts by role</h2><div className="mt-3 flex flex-wrap gap-3">{(data.overview?.users || []).map((item) => <span key={item._id} className="rounded-full border border-amber-900/40 bg-slate-800 px-3 py-2 capitalize text-amber-100">{item._id}: {item.active} active / {item.total}</span>)}</div></section></div>}

      {section === "Users" && <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]"><section className={panel}><h2 className="text-xl font-semibold">Users ({filteredUsers.length})</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-gray-500"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id} className="border-b border-slate-100"><td className="p-3">{user.username}</td><td className="p-3">{user.email}</td><td className="p-3 capitalize">{user.role}</td><td className="p-3 capitalize">{user.status}{user.mustChangePassword ? " · change password required" : ""}</td><td className="flex flex-wrap gap-2 p-3"><button disabled={busy !== ""} onClick={() => setStatus(user)} className="rounded border px-2 py-1">{user.status === "active" ? "Deactivate" : "Activate"}</button><button disabled={busy !== ""} onClick={() => resetPassword(user)} className="rounded border px-2 py-1">Reset password</button><button disabled={busy !== ""} onClick={() => removeUser(user)} className="rounded border border-red-200 px-2 py-1 text-red-700">Delete</button></td></tr>)}</tbody></table></div></section><form onSubmit={createUser} className={`${panel} h-fit space-y-3`}><h2 className="text-lg font-semibold">Create account</h2><label className="block text-sm text-gray-600">Username<input name="username" required className={field} /></label><label className="block text-sm text-gray-600">Email<input name="email" type="email" required className={field} /></label><label className="block text-sm text-gray-600">Temporary password<input name="password" type="password" minLength="8" maxLength="72" required className={field} /></label><label className="block text-sm text-gray-600">Role<select name="role" className={field}><option value="student">Student</option><option value="lecturer">Lecturer</option><option value="admin">Admin</option></select></label><button disabled={busy !== ""} className={button}>Create user</button><p className="text-xs text-gray-500">The user must change this password at first sign-in.</p></form></div>}

      {section === "Modules" && <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]"><section className="space-y-3">{filteredModules.map((module) => <article key={module.id} className={panel}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{module.code} · {module.name}</h2><p className="mt-1 text-sm text-gray-500">Lecturer: {module.lecturer?.username || "Unassigned"} · {module.studentCount} students · {module.assignmentCount} assignments</p><p className="mt-2 font-mono text-sm tracking-widest">Enrollment code: {module.enrollmentCode}</p></div><button disabled={busy !== ""} onClick={() => setArchived("module", module)} className="rounded border px-3 py-2">{module.isArchived ? "Restore" : "Archive"}</button></div>{module.description && <p className="mt-2 text-sm text-gray-500">{module.description}</p>}</article>)}{filteredModules.length === 0 && <p className={panel}>No modules found.</p>}</section><form onSubmit={createModule} className={`${panel} h-fit space-y-3`}><h2 className="text-lg font-semibold">Create module</h2><label className="block text-sm text-gray-600">Module name<input name="name" required maxLength="120" className={field} /></label><label className="block text-sm text-gray-600">Module code<input name="code" required maxLength="24" className={field} /></label><label className="block text-sm text-gray-600">Lecturer<select name="lecturerId" required className={field}><option value="">Choose lecturer</option>{activeLecturers.map((user) => <option key={user.id} value={user.id}>{user.username} · {user.email}</option>)}</select></label><label className="block text-sm text-gray-600">Description<textarea name="description" maxLength="1000" rows="3" className={field} /></label><button disabled={busy !== "" || activeLecturers.length === 0} className={button}>Create module</button>{activeLecturers.length === 0 && <p className="text-xs text-amber-800">Create or activate a lecturer account first.</p>}</form></div>}

      {section === "Assignments" && <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]"><section className="space-y-3">{filteredAssignments.map((item) => <article key={item.id} className={panel}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{item.title}</h2><p className="mt-1 text-sm text-gray-500">{item.module?.code || "No module"} · Lecturer: {item.lecturer?.username || "Unknown"} · {item.submissionCount} submissions</p><p className="mt-1 text-xs text-gray-500">{item.status} · due {item.dueAt ? new Date(item.dueAt).toLocaleString() : "not set"}{item.isArchived ? " · archived" : ""}</p></div><button disabled={busy !== "" || item.status === "processing" || item.similarityStatus === "processing"} onClick={() => setArchived("assignment", item)} className="rounded border px-3 py-2">{item.isArchived ? "Restore" : "Archive"}</button></div></article>)}{filteredAssignments.length === 0 && <p className={panel}>No assignments found.</p>}</section><form onSubmit={createAssignment} className={`${panel} h-fit space-y-3`}><h2 className="text-lg font-semibold">Create assignment</h2><label className="block text-sm text-gray-600">Title<input name="title" required className={field} /></label><label className="block text-sm text-gray-600">Description<textarea name="description" rows="2" className={field} /></label><label className="block text-sm text-gray-600">Module<select name="moduleId" required className={field} value={selectedModule} onChange={(event) => setSelectedModule(event.target.value)}><option value="">Choose module</option>{activeModules.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><input type="hidden" name="lecturerId" value={currentModule?.lecturer?.id || ""} /><label className="block text-sm text-gray-600">Upload deadline<input name="dueAt" type="datetime-local" required className={field} /></label><label className="block text-sm text-gray-600">Question paper PDF<input name="pdf" type="file" accept="application/pdf,.pdf" required className="mt-1 w-full text-sm" /></label><button disabled={busy !== "" || activeModules.length === 0} className={button}>{busy === "create-assignment" ? "Uploading and extracting…" : "Create assignment"}</button><p className="text-xs text-gray-500">The assignment is created for the module’s lecturer and starts in question review.</p></form></div>}

      {section === "Activity" && <section className={`${panel} mt-6`}><h2 className="text-xl font-semibold">Recent admin activity</h2><div className="mt-4 space-y-3">{data.logs.map((log) => <article key={log.id} className="border-b border-slate-100 pb-3"><p className="font-medium">{log.summary}</p><p className="mt-1 text-sm text-gray-500">{log.actor} · {log.action} · {new Date(log.createdAt).toLocaleString()}</p></article>)}{data.logs.length === 0 && <p className="text-gray-500">No recorded admin actions yet.</p>}</div></section>}
    </main></div></div>;
}
