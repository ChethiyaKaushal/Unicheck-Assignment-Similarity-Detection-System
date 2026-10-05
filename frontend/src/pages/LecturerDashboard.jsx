
function LecturerDashboard() {
  return (
    <div className="flex min-h-screen bg-emerald-50">

      {/* Sidebar */}
      <nav className="flex flex-col w-64 min-h-screen bg-white p-6 shadow-md">

        {/* Logo / Name */}
        <h2 className="text-2xl font-bold text-emerald-700 mb-2">
          UniCheck
        </h2>

        <p className="text-sm text-gray-500 mb-8">
          Lecturer Panel
        </p>

        {/* Navigation */}
        <div className="flex flex-col gap-2">

          <button className="text-left px-4 py-3 rounded-lg bg-emerald-100 text-emerald-700 font-medium">
            Dashboard
          </button>

          <button className="text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-emerald-50">
            Assignments
          </button>

          <button className="text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-emerald-50">
            Submissions
          </button>

          <button className="text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-emerald-50">
            Similarity Check
          </button>

          <button className="text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-emerald-50">
            Reports
          </button>

        </div>

        {/* Bottom section */}
        <div className="mt-auto">

          <button className="w-full text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-emerald-50 mb-2">
            Profile
          </button>

          <button className="w-full text-left px-4 py-3 rounded-lg text-red-500 hover:bg-red-50">
            Logout
          </button>

        </div>

      </nav>


      {/* Main Content */}
      <main className="flex-1 p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">

          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Lecturer Dashboard
            </h1>

            <p className="text-gray-500 mt-1">
              Manage assignments and check student submissions
            </p>
          </div>

          <div className="bg-white px-5 py-3 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500">
              Welcome
            </p>

            <p className="font-semibold text-gray-800">
              Lecturer
            </p>
          </div>

        </div>


        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          {/* Assignments */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-gray-500 text-sm">
              Total Assignments
            </p>

            <h2 className="text-3xl font-bold text-emerald-700 mt-2">
              12
            </h2>
          </div>


          {/* Submissions */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-gray-500 text-sm">
              Submissions
            </p>

            <h2 className="text-3xl font-bold text-blue-600 mt-2">
              148
            </h2>
          </div>


          {/* Pending */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-gray-500 text-sm">
              Pending Checks
            </p>

            <h2 className="text-3xl font-bold text-orange-500 mt-2">
              23
            </h2>
          </div>


          {/* Reports */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-gray-500 text-sm">
              Reports Generated
            </p>

            <h2 className="text-3xl font-bold text-purple-600 mt-2">
              89
            </h2>
          </div>

        </div>


        {/* Main Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


          {/* Recent Assignments */}
          <div className="bg-white rounded-xl shadow-sm p-6">

            <div className="flex justify-between items-center mb-5">

              <h2 className="text-xl font-semibold text-gray-800">
                Recent Assignments
              </h2>

              <button className="text-emerald-600 text-sm font-medium">
                View All
              </button>

            </div>


            {/* Assignment 1 */}
            <div className="border-b border-gray-100 py-4">

              <div className="flex justify-between">

                <div>
                  <h3 className="font-semibold text-gray-800">
                    Database Management
                  </h3>

                  <p className="text-sm text-gray-500">
                    32 submissions
                  </p>
                </div>

                <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full h-fit">
                  Active
                </span>

              </div>

            </div>


            {/* Assignment 2 */}
            <div className="border-b border-gray-100 py-4">

              <div className="flex justify-between">

                <div>
                  <h3 className="font-semibold text-gray-800">
                    Operating Systems
                  </h3>

                  <p className="text-sm text-gray-500">
                    45 submissions
                  </p>
                </div>

                <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full h-fit">
                  Checking
                </span>

              </div>

            </div>


            {/* Assignment 3 */}
            <div className="py-4">

              <div className="flex justify-between">

                <div>
                  <h3 className="font-semibold text-gray-800">
                    Computer Networks
                  </h3>

                  <p className="text-sm text-gray-500">
                    28 submissions
                  </p>
                </div>

                <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full h-fit">
                  Closed
                </span>

              </div>

            </div>

          </div>


          {/* Recent Submissions */}
          <div className="bg-white rounded-xl shadow-sm p-6">

            <div className="flex justify-between items-center mb-5">

              <h2 className="text-xl font-semibold text-gray-800">
                Recent Submissions
              </h2>

              <button className="text-emerald-600 text-sm font-medium">
                View All
              </button>

            </div>


            {/* Submission 1 */}
            <div className="border-b border-gray-100 py-4">

              <div className="flex justify-between">

                <div>
                  <h3 className="font-semibold text-gray-800">
                    Kasun Perera
                  </h3>

                  <p className="text-sm text-gray-500">
                    Database Management
                  </p>
                </div>

                <span className="text-sm text-orange-500">
                  Pending
                </span>

              </div>

            </div>


            {/* Submission 2 */}
            <div className="border-b border-gray-100 py-4">

              <div className="flex justify-between">

                <div>
                  <h3 className="font-semibold text-gray-800">
                    Nimal Fernando
                  </h3>

                  <p className="text-sm text-gray-500">
                    Operating Systems
                  </p>
                </div>

                <span className="text-sm text-emerald-600">
                  Checked
                </span>

              </div>

            </div>


            {/* Submission 3 */}
            <div className="py-4">

              <div className="flex justify-between">

                <div>
                  <h3 className="font-semibold text-gray-800">
                    Tharushi Silva
                  </h3>

                  <p className="text-sm text-gray-500">
                    Computer Networks
                  </p>
                </div>

                <span className="text-sm text-orange-500">
                  Pending
                </span>

              </div>

            </div>

          </div>

        </div>


        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">

          <h2 className="text-xl font-semibold text-gray-800 mb-5">
            Quick Actions
          </h2>

          <div className="flex flex-wrap gap-4">

            <button className="px-5 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              + Create Assignment
            </button>

            <button className="px-5 py-3 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200">
              View Submissions
            </button>

            <button className="px-5 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
              Check Similarity
            </button>

            <button className="px-5 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200">
              Generate Report
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}

export default LecturerDashboard;
