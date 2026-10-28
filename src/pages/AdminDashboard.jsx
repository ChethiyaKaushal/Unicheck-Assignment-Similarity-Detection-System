import { useEffect, useState } from "react";
import { api, currentUser, logout } from "../lib/api";
import BrandMark from "../components/BrandMark";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() { const data = await api("/auth/users"); setUsers(data.users); }
  useEffect(() => {
    let active = true;
    api("/auth/users").then((data) => { if (active) setUsers(data.users); }).catch((issue) => { if (active) setError(issue.message); });
    return () => { active = false; };
  }, []);
  async function createUser(event) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api("/auth/users", { method: "POST", body: { username: form.get("username"), email: form.get("email"), password: form.get("password"), role: form.get("role") } });
      formElement.reset(); setMessage("Account created. The user will set a new password at first sign-in."); await refresh();
    } catch (issue) { setError(issue.message); } finally { setBusy(false); }
  }
  async function toggle(user) {
    setError(""); setMessage("");
    try { await api(`/auth/users/${user.id}/status`, { method: "PATCH", body: { status: user.status === "active" ? "inactive" : "active" } }); await refresh(); }
    catch (issue) { setError(issue.message); }
  }
  const admin = currentUser();
  return <div className="app-frame"><aside className="app-sidebar"><div className="app-brand"><BrandMark /><div><strong className="block text-lg">UniCheck</strong><span className="text-xs text-gray-500">Admin workspace</span></div></div><nav className="app-nav"><a className="active" href="/admin-dashboard">Accounts</a></nav><div className="app-sidebar-foot"><div className="mb-3 truncate font-medium">{admin?.username || "Administrator"}</div><button onClick={logout} className="text-amber-400">Sign out ↗</button></div></aside>
    <div className="app-main"><header className="app-topbar">Administrator dashboard</header><main className="app-content mx-auto max-w-7xl"><h1 className="text-3xl font-bold">Accounts</h1><p className="mt-2 text-gray-500">Create student and lecturer profiles and manage account access.</p>{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">{message}</p>}
      <form onSubmit={createUser} className="mt-6 grid gap-4 rounded-xl bg-white p-5 md:grid-cols-2"><h2 className="text-xl font-semibold md:col-span-2">Create account</h2><label className="text-sm text-gray-500">Username<input name="username" required className="mt-1 w-full rounded-lg border p-3" /></label><label className="text-sm text-gray-500">University email<input name="email" type="email" required className="mt-1 w-full rounded-lg border p-3" /></label><label className="text-sm text-gray-500">Temporary password<input name="password" type="password" minLength="8" required className="mt-1 w-full rounded-lg border p-3" /></label><label className="text-sm text-gray-500">Role<select name="role" className="mt-1 w-full rounded-lg border p-3"><option value="student">Student</option><option value="lecturer">Lecturer</option></select></label><button disabled={busy} className="w-fit rounded-lg bg-emerald-600 px-5 py-3 text-white disabled:opacity-50 md:col-span-2">{busy ? "Creating…" : "Create profile"}</button></form>
      <section className="mt-7 rounded-xl bg-white p-5"><h2 className="text-xl font-semibold">Registered users ({users.length})</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Access</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-white/10"><td className="p-3">{user.username}</td><td className="p-3">{user.email}</td><td className="p-3 capitalize">{user.role}</td><td className="p-3 capitalize">{user.status}</td><td className="p-3"><button onClick={() => toggle(user)} className="rounded-lg border px-3 py-1 text-amber-300">{user.status === "active" ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table></div></section>
    </main></div></div>;
}
