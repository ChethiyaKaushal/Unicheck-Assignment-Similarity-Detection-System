import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import BrandMark from "../components/BrandMark";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState("student");
  const [notice] = useState(location.state?.notice || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function handleSubmit(event) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await api("/auth/login", { method: "POST", body: { email: form.get("email"), password: form.get("password") } });
      if (result.user.role !== role) throw new Error(`This account belongs to the ${result.user.role} role.`);
      localStorage.setItem("unicheckToken", result.token);
      localStorage.setItem("unicheckUser", JSON.stringify(result.user));
      navigate(result.user.mustChangePassword ? "/change-password" : result.user.role === "student" ? "/student-dashboard" : result.user.role === "admin" ? "/admin-dashboard" : "/lecturer-dashboard", { replace: true });
    } catch (issue) { setError(issue.message); }
    finally { setBusy(false); }
  }
  return <div className="login-screen min-h-screen flex flex-col md:flex-row items-center justify-center gap-10 md:gap-20 p-5 md:p-10"><section className="login-brand hidden md:block"><div className="login-brand-lockup"><BrandMark className="brand-logo-large"/><div><p className="login-brand-name">UniCheck</p><p className="login-brand-kicker">Assignment integrity workspace</p></div></div><h2 className="login-brand-headline">Clear review.<br/><span>Fair learning.</span></h2><p className="login-brand-description">Question-aware similarity insights for confident lecturer review.</p><div className="login-brand-rule"/></section><div className="login-card w-full max-w-md p-7 md:p-9 rounded-2xl shadow-lg">
    <div className="login-brand-lockup login-mobile-brand mb-7 md:hidden"><BrandMark className="brand-logo-mobile"/><div><h1 className="login-brand-name">UniCheck</h1><p className="login-brand-kicker">Assignment integrity workspace</p></div></div><div className="hidden md:block"><h1 className="text-3xl font-bold text-emerald-700">Welcome back</h1><p className="text-gray-500 mt-2">Sign in to your UniCheck workspace.</p></div>
    {notice && <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}{error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <form onSubmit={handleSubmit}>
      <label className="block mt-7 text-sm font-medium text-gray-700">University email<input name="email" type="email" required autoComplete="username" className="w-full mt-2 p-3 border rounded-lg" /></label>
      <label className="block mt-4 text-sm font-medium text-gray-700">Password<input name="password" type="password" required autoComplete="current-password" className="w-full mt-2 p-3 border rounded-lg" /></label>
      <label className="block mt-4 text-sm font-medium text-gray-700">Continue as<select value={role} onChange={(event) => setRole(event.target.value)} className="w-full mt-2 p-3 border rounded-lg bg-white"><option value="student">Student</option><option value="lecturer">Lecturer</option><option value="admin">Administrator</option></select></label>
      <button disabled={busy} className="w-full mt-6 bg-emerald-600 text-white p-3 rounded-lg disabled:opacity-60">{busy ? "Signing in…" : "Continue to dashboard"}</button>
    </form><p className="mt-5 text-center text-xs text-gray-500">Sign-in accounts are issued by your UniCheck administrator.</p>
  </div></div>;
}
