import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
export default function Submissions() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { api("/submissions").then((data) => setSubmissions(data.submissions)).catch((issue) => setError(issue.message)); }, []);
  return <div className="min-h-screen bg-emerald-50 p-5 md:p-8"><main className="mx-auto max-w-6xl"><h1 className="text-3xl font-bold text-gray-800">Submissions</h1><p className="mt-2 text-gray-600">Open a saved submission to inspect the answers stored for each question, or compare two students.</p>{error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm"><table className="w-full text-left"><thead className="bg-emerald-50"><tr>{["Student", "Assignment", "Submitted", "Status", "Mapped answers", "Actions"].map((label) => <th key={label} className="px-4 py-3 text-sm">{label}</th>)}</tr></thead><tbody>{submissions.map((item) => <tr key={item.id} className="border-t"><td className="px-4 py-3">{item.student.username}<div className="text-xs text-gray-500">{item.student.email}</div></td><td className="px-4 py-3">{item.assignmentTitle}</td><td className="px-4 py-3">{new Date(item.createdAt).toLocaleDateString()}</td><td className="px-4 py-3">{item.status}</td><td className="px-4 py-3">{item.answerCount}</td><td className="flex flex-wrap gap-2 px-4 py-3"><Link to={`/submissions/${item.id}`} className="rounded-lg border px-3 py-2 text-sm text-emerald-700">View saved answers</Link><button onClick={() => navigate(`/reports?assignment=${item.assignmentId}`)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white">Compare students</button></td></tr>)}</tbody></table>{!submissions.length && !error && <p className="p-6 text-gray-600">No student submissions yet.</p>}</div></main></div>;
}
