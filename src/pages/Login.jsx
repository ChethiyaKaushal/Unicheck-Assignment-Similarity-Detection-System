function Login() {
  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg">

        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-emerald-700">
          UniCheck
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Assignment Similarity Detection System
        </p>

        {/* Username / Email */}
        <div className="mt-8">
          <label className="block text-sm font-medium text-gray-700">
            Username or University Email
          </label>

          <input
            type="text"
            placeholder="Enter your username or email"
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
            placeholder="Enter your password"
            className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Login Button */}
        <button className="w-full mt-6 bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700">
          Login
        </button>

        {/* Sign Up text - NOT LINKED YET */}
        <p className="text-center text-sm text-gray-500 mt-5">
          Don't have an account?{" "}
          <span className="text-emerald-600 font-medium">
            Sign Up
          </span>
        </p>

      </div>
    </div>
  );
}

export default Login;