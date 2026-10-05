import { useNavigate } from "react-router-dom";

function Reports() {
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
            className="text-left px-4 py-3 rounded-lg bg-emerald-100 text-emerald-700 font-medium"
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

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Reports
          </h1>

          <p className="text-gray-500 mt-1">
            View and manage assignment similarity reports
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500">
              Total Reports
            </p>

            <h2 className="text-3xl font-bold text-emerald-700 mt-2">
              89
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500">
              High Similarity
            </p>

            <h2 className="text-3xl font-bold text-red-500 mt-2">
              14
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500">
              Low Similarity
            </p>

            <h2 className="text-3xl font-bold text-blue-600 mt-2">
              75
            </h2>
          </div>

        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">

          <div className="flex flex-col md:flex-row gap-4">

            <select className="border border-gray-200 rounded-lg px-4 py-3 text-gray-600">
              <option>All Assignments</option>
              <option>Database Assignment 01</option>
              <option>Operating Systems Assignment 01</option>
              <option>Computer Networks Assignment 01</option>
              <option>Software Engineering Assignment 02</option>
            </select>

            <select className="border border-gray-200 rounded-lg px-4 py-3 text-gray-600">
              <option>All Similarity Levels</option>
              <option>High Similarity</option>
              <option>Medium Similarity</option>
              <option>Low Similarity</option>
            </select>

            <input
              type="text"
              placeholder="Search student..."
              className="border border-gray-200 rounded-lg px-4 py-3 flex-1 outline-none focus:border-emerald-500"
            />

          </div>

        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">

          <div className="p-6 border-b border-gray-100">

            <h2 className="text-xl font-semibold text-gray-800">
              Similarity Reports
            </h2>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-emerald-50">

                <tr>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Student
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Assignment
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Similarity
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Checked Date
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                <tr className="border-b border-gray-100">

                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">
                      Kasun Perera
                    </p>
                    <p className="text-sm text-gray-500">
                      CE2021-001
                    </p>
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    Database Assignment 01
                  </td>

                  <td className="px-6 py-4">
                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                      82%
                    </span>
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    24 Sep 2026
                  </td>

                  <td className="px-6 py-4">
                    <button className="text-emerald-600 hover:text-emerald-800 font-medium">
                      View Report
                    </button>
                  </td>

                </tr>

                <tr className="border-b border-gray-100">

                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">
                      Nimal Fernando
                    </p>
                    <p className="text-sm text-gray-500">
                      CE2021-015
                    </p>
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    Database Assignment 01
                  </td>

                  <td className="px-6 py-4">
                    <span className="bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-sm font-medium">
                      48%
                    </span>
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    23 Sep 2026
                  </td>

                  <td className="px-6 py-4">
                    <button className="text-emerald-600 hover:text-emerald-800 font-medium">
                      View Report
                    </button>
                  </td>

                </tr>

                <tr className="border-b border-gray-100">

                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">
                      Tharushi Silva
                    </p>
                    <p className="text-sm text-gray-500">
                      CE2021-023
                    </p>
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    Operating Systems Assignment 01
                  </td>

                  <td className="px-6 py-4">
                    <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-sm font-medium">
                      18%
                    </span>
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    22 Sep 2026
                  </td>

                  <td className="px-6 py-4">
                    <button className="text-emerald-600 hover:text-emerald-800 font-medium">
                      View Report
                    </button>
                  </td>

                </tr>

                <tr className="border-b border-gray-100">

                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">
                      Dinesh Kumar
                    </p>
                    <p className="text-sm text-gray-500">
                      CE2021-031
                    </p>
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    Computer Networks Assignment 01
                  </td>

                  <td className="px-6 py-4">
                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                      76%
                    </span>
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    21 Sep 2026
                  </td>

                  <td className="px-6 py-4">
                    <button className="text-emerald-600 hover:text-emerald-800 font-medium">
                      View Report
                    </button>
                  </td>

                </tr>

                <tr>

                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">
                      Amaya Perera
                    </p>
                    <p className="text-sm text-gray-500">
                      CE2021-042
                    </p>
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    Software Engineering Assignment 02
                  </td>

                  <td className="px-6 py-4">
                    <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-sm font-medium">
                      12%
                    </span>
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    20 Sep 2026
                  </td>

                  <td className="px-6 py-4">
                    <button className="text-emerald-600 hover:text-emerald-800 font-medium">
                      View Report
                    </button>
                  </td>

                </tr>

              </tbody>

            </table>

          </div>

        </div>

      </main>

    </div>
  );
}

export default Reports;