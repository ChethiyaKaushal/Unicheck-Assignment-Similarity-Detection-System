import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState("student");
  const [notice] = useState(location.state?.notice || "");

  function handleSubmit(event) {
    event.preventDefault();
    navigate(role === "student" ? "/student-dashboard" : "/lecturer-dashboard");
  }

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold text-center text-emerald-700">UniCheck</h1>
        <p className="text-center text-gray-500 mt-2">Assignment Similarity Detection System</p>
        {notice && <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mt-8">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">University Email</label>
            <input id="email" type="email" required placeholder="Enter your university email" className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="mt-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input id="password" type="password" required placeholder="Enter your password" className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="mt-4">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Continue as</label>
            <select id="role" value={role} onChange={(event) => setRole(event.target.value)} className="w-full mt-2 p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="student">Student</option><option value="lecturer">Lecturer</option>
            </select>
          </div>
          <button type="submit" className="w-full mt-6 bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700">Continue to dashboard</button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-5">Don't have an account?{" "}
          <button type="button" onClick={() => navigate("/register")} className="text-emerald-600 font-medium hover:underline">Sign Up</button>
        </p>
        <p className="mt-3 text-center text-xs text-gray-400">Frontend demo: account details are not verified or saved.</p>
      </div>
    </div>
  );
}
export default Login;
