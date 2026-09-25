
import { useNavigate } from "react-router-dom";

function AssignmentDetails() {

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

        {/* Navigation */}
        <div className="flex flex-col gap-2">

          <button
            onClick={() => navigate("/lecturer-dashboard")}
            className="text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-emerald-50"
          >
            Dashboard
          </button>

          <button
            className="text-left px-4 py-3 rounded-lg bg-emerald-100 text-emerald-700 font-medium"
          >
            Assignments
          </button>

          <button
            className="text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-emerald-50"
          >
            Submissions
          </button>

          <button
            className="text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-emerald-50"
          >
            Similarity Check
          </button>

          <button
            className="text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-emerald-50"
          >
            Reports
          </button>

        </div>

        {/* Bottom */}
        <div className="mt-auto">

          <button
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

        {/* Back button */}
        <button
          onClick={() => navigate("/lecturer-dashboard")}
          className="text-emerald-600 hover:text-emerald-800 mb-6"
        >
          ← Back to Dashboard
        </button>


        {/* Assignment Header */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">

          <div className="flex justify-between items-start">

            <div>

              <p className="text-sm text-emerald-600 font-medium mb-2">
                Database Management
              </p>

              <h1 className="text-3xl font-bold text-gray-800">
                Database Assignment 01
              </h1>

              <p className="text-gray-500 mt-2">
                Introduction to Relational Database Management Systems
              </p>

            </div>

            <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
              Active
            </span>

          </div>

        </div>


        {/* Assignment Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* Deadline */}
          <div className="bg-white rounded-xl shadow-sm p-6">

            <p className="text-sm text-gray-500">
              Deadline
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mt-2">
              30 September 2026
            </h2>

          </div>


          {/* Submissions */}
          <div className="bg-white rounded-xl shadow-sm p-6">

            <p className="text-sm text-gray-500">
              Submissions
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mt-2">
              32 / 45
            </h2>

          </div>


          {/* Status */}
          <div className="bg-white rounded-xl shadow-sm p-6">

            <p className="text-sm text-gray-500">
              Assignment Status
            </p>

            <h2 className="text-xl font-semibold text-emerald-600 mt-2">
              Active
            </h2>

          </div>

        </div>


        {/* Description */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">

          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Assignment Description
          </h2>

          <p className="text-gray-600 leading-7">
            Students are required to design a relational database
            for a given scenario. The assignment covers entity
            identification, relational schemas, primary keys,
            foreign keys and normalization.
          </p>

        </div>


        {/* Questions */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">

          <h2 className="text-xl font-semibold text-gray-800 mb-5">
            Assignment Questions
          </h2>


          {/* Question 01 */}
          <div className="border border-gray-200 rounded-lg p-5 mb-4">

            <div className="flex justify-between">

              <h3 className="font-semibold text-gray-800">
                Question 01
              </h3>

              <span className="text-sm text-gray-500">
                20 Marks
              </span>

            </div>

            <p className="text-gray-600 mt-3">
              Explain the concept of database normalization and
              describe the first three normal forms with suitable
              examples.
            </p>

          </div>


          {/* Question 02 */}
          <div className="border border-gray-200 rounded-lg p-5 mb-4">

            <div className="flex justify-between">

              <h3 className="font-semibold text-gray-800">
                Question 02
              </h3>

              <span className="text-sm text-gray-500">
                30 Marks
              </span>

            </div>

            <p className="text-gray-600 mt-3">
              Design a relational database schema for a university
              course registration system. Identify the entities,
              attributes and relationships.
            </p>

          </div>


          {/* Question 03 */}
          <div className="border border-gray-200 rounded-lg p-5">

            <div className="flex justify-between">

              <h3 className="font-semibold text-gray-800">
                Question 03
              </h3>

              <span className="text-sm text-gray-500">
                50 Marks
              </span>

            </div>

            <p className="text-gray-600 mt-3">
              Convert the given unnormalized data into a normalized
              relational database structure and explain each step.
            </p>

          </div>

        </div>


        {/* Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">

          <h2 className="text-xl font-semibold text-gray-800 mb-5">
            Assignment Actions
          </h2>

          <div className="flex flex-wrap gap-4">

            <button
              className="px-5 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              View Submissions
            </button>

            <button
              className="px-5 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              Check Similarity
            </button>

            <button
              className="px-5 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
            >
              Generate Report
            </button>

            <button
              className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Edit Assignment
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}

export default AssignmentDetails;
