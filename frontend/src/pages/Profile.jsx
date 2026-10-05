import { useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-emerald-50">

      {/* Sidebar */}
      <nav className="flex flex-col w-64 min-h-screen bg-white p-6 shadow-md">

        <h2 className="text-2xl font-bold text-emerald-700 mb-2">
          UniCheck
        </h2>

        <p className="text-sm text-gray-500 mb-8">
          Lecturer Panel
        </p>

        <div className="flex flex-col gap-2">

          <button
            onClick={() => navigate("/lecturer-dashboard")}
            className="text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-emerald-50"
          >
            Dashboard
          </button>

          <button
            onClick={() => navigate("/assignments")}
            className="text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-emerald-50"
          >
            Assignments
          </button>

          <button
            onClick={() => navigate("/submissions")}
            className="text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-emerald-50"
          >
            Submissions
          </button>

          <button
            onClick={() => navigate("/similarity-check")}
            className="text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-emerald-50"
          >
            Similarity Check
          </button>

          <button
            onClick={() => navigate("/reports")}
            className="text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-emerald-50"
          >
            Reports
          </button>

        </div>

        <div className="mt-auto">

          <button
            className="w-full text-left px-4 py-3 rounded-lg bg-emerald-100 text-emerald-700 font-medium mb-2"
          >
            Profile
          </button>

          <button
            onClick={() => navigate("/login")}
            className="w-full text-left px-4 py-3 rounded-lg text-red-500 hover:bg-red-50"
          >
            Logout
          </button>

        </div>

      </nav>

      {/* Main Content */}
      <main className="flex-1 p-8">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Profile
          </h1>

          <p className="text-gray-500 mt-1">
            Manage your lecturer account information
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-4xl">

          {/* Profile Header */}
          <div className="flex items-center gap-6 pb-8 border-b border-gray-100">

            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-3xl font-bold text-emerald-700">
                DK
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Dr. Dinesh Kumar
              </h2>

              <p className="text-gray-500">
                Lecturer
              </p>

              <p className="text-sm text-emerald-600 mt-1">
                Computer Engineering Department
              </p>
            </div>

          </div>

          {/* Personal Information */}
          <div className="pt-8">

            <h3 className="text-lg font-semibold text-gray-800 mb-6">
              Personal Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Full Name
                </label>

                <input
                  type="text"
                  value="Dr. Dinesh Kumar"
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Email
                </label>

                <input
                  type="email"
                  value="dinesh@unicheck.com"
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Staff ID
                </label>

                <input
                  type="text"
                  value="LEC-001"
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Department
                </label>

                <input
                  type="text"
                  value="Computer Engineering"
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-700"
                />
              </div>

            </div>

          </div>

          {/* Account Information */}
          <div className="pt-8 mt-8 border-t border-gray-100">

            <h3 className="text-lg font-semibold text-gray-800 mb-6">
              Account Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <p className="text-sm text-gray-500">
                  Account Type
                </p>

                <p className="font-medium text-gray-800 mt-1">
                  Lecturer
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Account Status
                </p>

                <span className="inline-block mt-1 bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-sm">
                  Active
                </span>
              </div>

            </div>

          </div>

          {/* Buttons */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-100">

            <button
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Edit Profile
            </button>

            <button
              onClick={() => navigate("/lecturer-dashboard")}
              className="px-6 py-3 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
            >
              Back to Dashboard
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}

export default Profile;