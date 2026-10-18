import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center py-10">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg">
        
        <h1 className="text-3xl font-bold text-center text-emerald-700">
          UniCheck
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Create your account
        </p>

        {/* Full Name */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700">
            Full Name
          </label>

          <input
            type="text"
            placeholder="Enter your full name"
            className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Username */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Username
          </label>

          <input
            type="text"
            placeholder="Choose a username"
            className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Email */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            University Email
          </label>

          <input
            type="email"
            placeholder="Enter your university email"
            className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* ID */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Student / Lecturer ID
          </label>

          <input
            type="text"
            placeholder="Enter your ID"
            className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Role */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Role
          </label>

          <select className="w-full mt-2 p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Select your role</option>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
          </select>
        </div>

        {/* Department */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Department
          </label>

          <input
            type="text"
            placeholder="Enter your department"
            className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Password */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Password
          </label>

          <input
            type="password"
            placeholder="Create a password"
            className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Confirm Password */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>

          <input
            type="password"
            placeholder="Confirm your password"
            className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Sign Up Button */}
        <button type="button" onClick={() => navigate("/login", { state: { notice: "Frontend demo only: no account was created." } })} className="w-full mt-6 bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700">
          Sign Up
        </button>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{" "}
          <button type="button" onClick={() => navigate("/login")} className="text-emerald-600 font-medium hover:underline">Login</button>
        </p>

      </div>
    </div>
  );
}

export default Register;