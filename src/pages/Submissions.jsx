
import { useNavigate } from "react-router-dom";

function Submissions() {

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
            className="text-left px-4 py-3 rounded-lg bg-emerald-100 text-emerald-700 font-medium"
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
            Submissions
          </h1>

          <p className="text-gray-500 mt-1">
            View and manage student assignment submissions
          </p>

        </div>


        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          <div className="bg-white rounded-xl shadow-sm p-6">

            <p className="text-sm text-gray-500">
              Total Submissions
            </p>

            <h2 className="text-3xl font-bold text-emerald-700 mt-2">
              148
            </h2>

          </div>


          <div className="bg-white rounded-xl shadow-sm p-6">

            <p className="text-sm text-gray-500">
              Pending
            </p>

            <h2 className="text-3xl font-bold text-orange-500 mt-2">
              23
            </h2>

          </div>


          <div className="bg-white rounded-xl shadow-sm p-6">

            <p className="text-sm text-gray-500">
              Checked
            </p>

            <h2 className="text-3xl font-bold text-blue-600 mt-2">
              125
            </h2>

          </div>

        </div>


        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">

          <div className="flex flex-col md:flex-row gap-4">

            <select className="border border-gray-200 rounded-lg px-4 py-3 text-gray-600">
              <option>All Assignments</option>
              <option>Database Assignment 01</option>
              <option>Operating Systems Assignment 01</option>
              <option>Computer Networks Assignment 01</option>
            </select>

            <select className="border border-gray-200 rounded-lg px-4 py-3 text-gray-600">
              <option>All Status</option>
              <option>Pending</option>
              <option>Checked</option>
            </select>

            <input
              type="text"
              placeholder="Search student..."
              className="border border-gray-200 rounded-lg px-4 py-3 flex-1 outline-none focus:border-emerald-500"
            />

          </div>

        </div>


        {/* Submission Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">

          <div className="p-6 border-b border-gray-100">

            <h2 className="text-xl font-semibold text-gray-800">
              Student Submissions
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
                    Submitted
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Status
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>


                {/* Submission 1 */}
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

                  <td className="px-6 py-4 text-gray-600">
                    24 Sep 2026
                  </td>

                  <td className="px-6 py-4">

                    <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm">
                      Pending
                    </span>

                  </td>

                  <td className="px-6 py-4">

                    <button
                      onClick={() => navigate("/similarity-check")}
                      className="text-emerald-600 hover:text-emerald-800 font-medium"
                    >
                      Check
                    </button>

                  </td>

                </tr>


                {/* Submission 2 */}
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

                  <td className="px-6 py-4 text-gray-600">
                    23 Sep 2026
                  </td>

                  <td className="px-6 py-4">

                    <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-sm">
                      Checked
                    </span>

                  </td>

                  <td className="px-6 py-4">

                    <button
                      onClick={() => navigate("/reports")}
                      className="text-emerald-600 hover:text-emerald-800 font-medium"
                    >
                      View Report
                    </button>

                  </td>

                </tr>


                {/* Submission 3 */}
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

                  <td className="px-6 py-4 text-gray-600">
                    22 Sep 2026
                  </td>

                  <td className="px-6 py-4">

                    <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-sm">
                      Checked
                    </span>

                  </td>

                  <td className="px-6 py-4">

                    <button
                      onClick={() => navigate("/reports")}
                      className="text-emerald-600 hover:text-emerald-800 font-medium"
                    >
                      View Report
                    </button>

                  </td>

                </tr>


                {/* Submission 4 */}
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

                  <td className="px-6 py-4 text-gray-600">
                    21 Sep 2026
                  </td>

                  <td className="px-6 py-4">

                    <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm">
                      Pending
                    </span>

                  </td>

                  <td className="px-6 py-4">

                    <button
                      onClick={() => navigate("/similarity-check")}
                      className="text-emerald-600 hover:text-emerald-800 font-medium"
                    >
                      Check
                    </button>

                  </td>

                </tr>


                {/* Submission 5 */}
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

                  <td className="px-6 py-4 text-gray-600">
                    20 Sep 2026
                  </td>

                  <td className="px-6 py-4">

                    <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-sm">
                      Checked
                    </span>

                  </td>

                  <td className="px-6 py-4">

                    <button
                      onClick={() => navigate("/reports")}
                      className="text-emerald-600 hover:text-emerald-800 font-medium"
                    >
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

export default Submissions;
