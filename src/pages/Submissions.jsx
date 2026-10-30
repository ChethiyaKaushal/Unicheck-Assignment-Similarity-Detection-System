import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString();
}

export default function Submissions() {
  const navigate = useNavigate();
  const requestController = useRef(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api("/assignments")
      .then((data) => {
        if (active) setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
      })
      .catch((issue) => {
        if (active) setError(issue.message);
      })
      .finally(() => {
        if (active) setLoadingAssignments(false);
      });

    return () => {
      active = false;
      requestController.current?.abort();
    };
  }, []);

  async function handleAssignmentChange(event) {
    const assignmentId = event.target.value;
    setSelectedAssignmentId(assignmentId);
    setSubmissions([]);
    setError("");
    requestController.current?.abort();

    if (!assignmentId) {
      setLoadingSubmissions(false);
      return;
    }

    const controller = new AbortController();
    requestController.current = controller;
    setLoadingSubmissions(true);
    try {
      const data = await api(
        `/submissions?assignmentId=${encodeURIComponent(assignmentId)}`,
        { signal: controller.signal }
      );
      if (!controller.signal.aborted) {
        setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
      }
    } catch (issue) {
      if (!controller.signal.aborted) {
        setSubmissions([]);
        setError(issue.message);
      }
    } finally {
      if (!controller.signal.aborted) setLoadingSubmissions(false);
    }
  }

  const selectedAssignment = assignments.find(
    (item) => String(item.id) === selectedAssignmentId
  );

  return (
    <div className="min-h-screen bg-emerald-50 p-5 md:p-8">
      <main className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Lecturer workspace
            </p>
            <h1 className="mt-1 text-3xl font-bold text-gray-800">Submissions</h1>
            <p className="mt-2 text-gray-600">
              Select one of your assignments to view its student submissions.
            </p>
          </div>

          <label className="w-full text-sm font-medium text-gray-700 md:max-w-md">
            Select assignment
            <select
              className="mt-2 w-full rounded-lg border p-3"
              value={selectedAssignmentId}
              onChange={handleAssignmentChange}
              disabled={loadingAssignments || assignments.length === 0}
            >
              <option value="">
                {loadingAssignments
                  ? "Loading assignments…"
                  : assignments.length
                    ? "Choose an assignment"
                    : "No assignments available"}
              </option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.moduleCode ? `${assignment.moduleCode} · ` : ""}
                  {assignment.title} ({assignment.submissionCount ?? 0})
                </option>
              ))}
            </select>
          </label>
        </header>

        {error && (
          <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}

        {loadingAssignments && (
          <p className="mt-6 text-gray-600">Loading your assignments…</p>
        )}

        {!loadingAssignments && assignments.length === 0 && !error && (
          <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800">No assignments yet</h2>
            <p className="mt-2 text-gray-600">
              Create an assignment first. Its submissions will appear here after students upload their answer sheets.
            </p>
          </section>
        )}

        {!loadingAssignments && assignments.length > 0 && !selectedAssignment && (
          <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800">Choose an assignment</h2>
            <p className="mt-2 text-gray-600">
              Select an assignment above to see only the students who submitted to it.
            </p>
          </section>
        )}

        {selectedAssignment && (
          <section className="mt-6 grid gap-4 rounded-xl border bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-gray-500">Assignment</p>
              <p className="mt-1 font-semibold text-gray-800">{selectedAssignment.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Module</p>
              <p className="mt-1 font-medium text-gray-800">
                {selectedAssignment.moduleCode || selectedAssignment.moduleName || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Upload deadline</p>
              <p className="mt-1 font-medium text-gray-800">
                {formatDate(selectedAssignment.dueAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Submissions</p>
              <p className="mt-1 font-semibold text-emerald-700">
                {selectedAssignment.submissionCount ?? submissions.length}
              </p>
            </div>
          </section>
        )}

        {selectedAssignment && (
          <section className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Student submissions</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Showing submissions for {selectedAssignment.title} only.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
                {submissions.length} loaded
              </span>
            </div>

            {loadingSubmissions ? (
              <p className="p-6 text-gray-600">Loading submissions…</p>
            ) : submissions.length === 0 ? (
              <p className="p-6 text-gray-600">
                No student submissions have been uploaded for this assignment yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left">
                  <thead className="bg-emerald-50">
                    <tr>
                      {["Student", "Submitted", "Status", "Mapped answers", "Actions"].map((label) => (
                        <th key={label} className="px-4 py-3 text-sm">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-3">
                          {item.student.username}
                          <div className="text-xs text-gray-500">{item.student.email}</div>
                        </td>
                        <td className="px-4 py-3">{formatDate(item.createdAt)}</td>
                        <td className="px-4 py-3">{item.status}</td>
                        <td className="px-4 py-3">{item.answerCount}</td>
                        <td className="flex flex-wrap gap-2 px-4 py-3">
                          <Link
                            to={`/submissions/${item.id}`}
                            className="rounded-lg border px-3 py-2 text-sm text-emerald-700"
                          >
                            View saved answers
                          </Link>
                          <button
                            onClick={() => navigate(`/reports?assignment=${item.assignmentId}`)}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white"
                          >
                            Compare students
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}