function StudentDashboard() {
  return (
    <div className="flex min-h-screen bg-emerald-50">

      {/* Sidebar */}
      <nav className="flex flex-col w-64 min-h-screen bg-white p-6 shadow-md">

        <h2 className="text-2xl font-bold text-emerald-700 mb-8">
          UniCheck
        </h2>

        <a
          href=""
          className="py-3 px-4 rounded-lg bg-emerald-100 text-emerald-700 font-medium"
        >
          Dashboard
        </a>

        <a
          href=""
          className="py-3 px-4 rounded-lg hover:bg-emerald-50"
        >
          My Assignments
        </a>

        <a
          href=""
          className="py-3 px-4 rounded-lg hover:bg-emerald-50"
        >
          My Submissions
        </a>

        <a
          href=""
          className="py-3 px-4 rounded-lg hover:bg-emerald-50"
        >
          Results
        </a>

      </nav>


      {/* Main Content */}
      <main className="flex-1 p-8">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome back!
          </h1>

          <p className="text-gray-600 mt-2">
            Manage your modules and assignments from here.
          </p>
        </div>


        {/* My Modules */}
        <section className="mb-10">

          <h2 className="text-2xl font-bold text-gray-800 mb-5">
            My Modules
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">


            {/* Database Systems */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 hover:shadow-md transition">

              <h3 className="text-xl font-semibold text-emerald-700">
                Database Systems
              </h3>

              <p className="text-gray-600 mt-2">
                Database concepts, SQL and database design.
              </p>

              <p className="text-sm text-gray-500 mt-4">
                3 Assignments
              </p>

              <button className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                View Module
              </button>

            </div>


            {/* Operating Systems */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 hover:shadow-md transition">

              <h3 className="text-xl font-semibold text-emerald-700">
                Operating Systems
              </h3>

              <p className="text-gray-600 mt-2">
                Processes, memory management and file systems.
              </p>

              <p className="text-sm text-gray-500 mt-4">
                2 Assignments
              </p>

              <button className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                View Module
              </button>

            </div>


            {/* Computer Networks */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 hover:shadow-md transition">

              <h3 className="text-xl font-semibold text-emerald-700">
                Computer Networks
              </h3>

              <p className="text-gray-600 mt-2">
                Network protocols, communication and security.
              </p>

              <p className="text-sm text-gray-500 mt-4">
                4 Assignments
              </p>

              <button className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                View Module
              </button>

            </div>


            {/* Software Engineering */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 hover:shadow-md transition">

              <h3 className="text-xl font-semibold text-emerald-700">
                Software Engineering
              </h3>

              <p className="text-gray-600 mt-2">
                Software development, design and methodologies.
              </p>

              <p className="text-sm text-gray-500 mt-4">
                3 Assignments
              </p>

              <button className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                View Module
              </button>

            </div>


            {/* Data Structures */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 hover:shadow-md transition">

              <h3 className="text-xl font-semibold text-emerald-700">
                Data Structures
              </h3>

              <p className="text-gray-600 mt-2">
                Algorithms, trees, graphs and data structures.
              </p>

              <p className="text-sm text-gray-500 mt-4">
                2 Assignments
              </p>

              <button className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                View Module
              </button>

            </div>


            {/* Wireless Communications */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 hover:shadow-md transition">

              <h3 className="text-xl font-semibold text-emerald-700">
                Wireless Communications
              </h3>

              <p className="text-gray-600 mt-2">
                Communication technologies for automation and embedded systems.
              </p>

              <p className="text-sm text-gray-500 mt-4">
                2 Assignments
              </p>

              <button className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                View Module
              </button>

            </div>

          </div>

        </section>


        {/* Upcoming Assignments */}
        <section>

          <h2 className="text-2xl font-bold text-gray-800 mb-5">
            Upcoming Assignments
          </h2>


          {/* Table Header */}
          <div className="grid grid-cols-4 bg-emerald-700 text-white p-4 rounded-t-xl font-semibold">

            <div>
              Assignment
            </div>

            <div>
              Module
            </div>

            <div>
              Due Date
            </div>

            <div>
              Status
            </div>

          </div>


          {/* Assignment 1 */}
          <div className="grid grid-cols-4 bg-white p-4 border-b border-gray-100">

            <div className="text-gray-800">
              Database Assignment 02
            </div>

            <div className="text-gray-600">
              Database Systems
            </div>

            <div className="text-gray-600">
              Sep 28
            </div>

            <div className="text-orange-600 font-medium">
              Pending
            </div>

          </div>


          {/* Assignment 2 */}
          <div className="grid grid-cols-4 bg-white p-4 rounded-b-xl">

            <div className="text-gray-800">
              OS Assignment 01
            </div>

            <div className="text-gray-600">
              Operating Systems
            </div>

            <div className="text-gray-600">
              Oct 02
            </div>

            <div className="text-emerald-600 font-medium">
              Submitted
            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default StudentDashboard;