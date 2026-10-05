import { useNavigate } from "react-router-dom";

function SimilarityCheck() {
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
            className="text-left px-4 py-3 rounded-lg bg-emerald-100 text-emerald-700 font-medium"
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
            onClick={() => navigate("/profile")}
            className="w-full text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-emerald-50 mb-2"
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
            Similarity Check
          </h1>

          <p className="text-gray-500 mt-1">
            Compare student submissions and detect similarities
          </p>
        </div>

        {/* Select Assignment */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">

          <h2 className="text-xl font-semibold text-gray-800 mb-5">
            Select Assignment
          </h2>

          <select className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-600">
            <option>Select an assignment</option>
            <option>Database Assignment 01</option>
            <option>Operating Systems Assignment 01</option>
            <option>Computer Networks Assignment 01</option>
            <option>Software Engineering Assignment 02</option>
          </select>

        </div>

        {/* Submission Selection */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">

          <h2 className="text-xl font-semibold text-gray-800 mb-5">
            Select Submissions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                First Submission
              </label>

              <select className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-600">
                <option>Select student</option>
                <option>Kasun Perera - CE2021-001</option>
                <option>Nimal Fernando - CE2021-015</option>
                <option>Tharushi Silva - CE2021-023</option>
                <option>Dinesh Kumar - CE2021-031</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Second Submission
              </label>

              <select className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-600">
                <option>Select student</option>
                <option>Kasun Perera - CE2021-001</option>
                <option>Nimal Fernando - CE2021-015</option>
                <option>Tharushi Silva - CE2021-023</option>
                <option>Dinesh Kumar - CE2021-031</option>
              </select>
            </div>

          </div>

          <button
            className="mt-6 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Run Similarity Check
          </button>

        </div>

        {/* Result */}
        <div className="bg-white rounded-xl shadow-sm p-6">

          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Similarity Result
          </h2>

          <div className="flex flex-col md:flex-row items-center gap-8">

            <div className="w-36 h-36 rounded-full bg-red-50 border-8 border-red-200 flex items-center justify-center">

              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  82%
                </p>

                <p className="text-sm text-gray-500">
                  Similarity
                </p>
              </div>

            </div>

            <div className="flex-1">

              <h3 className="text-lg font-semibold text-gray-800">
                High Similarity Detected
              </h3>

              <p className="text-gray-500 mt-2">
                The selected submissions contain a high level of similar
                content. Review the highlighted sections before generating
                the final report.
              </p>

              <div className="mt-5">

                <p className="text-sm text-gray-500">
                  Matching Content
                </p>

                <div className="mt-2 bg-red-50 border border-red-100 rounded-lg p-4">
                  <p className="text-gray-700">
                    "A database management system is software that allows
                    users to create, manage and organize data..."
                  </p>
                </div>

              </div>

            </div>

          </div>

          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-100">

            <button
              onClick={() => navigate("/reports")}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Generate Report
            </button>

            <button
              onClick={() => navigate("/submissions")}
              className="px-6 py-3 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
            >
              Back to Submissions
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}

export default SimilarityCheck;
