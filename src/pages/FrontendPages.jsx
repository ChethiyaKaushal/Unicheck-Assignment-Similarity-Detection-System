import { useNavigate, useParams } from "react-router-dom";

const assignments = [
  { id: "1", title: "Database Assignment 01", module: "Database Systems", due: "28 Sep 2026" },
  { id: "2", title: "Operating Systems Assignment 01", module: "Operating Systems", due: "02 Oct 2026" },
  { id: "3", title: "Networks Assignment 01", module: "Computer Networks", due: "08 Oct 2026" },
];
function readCreatedAssignments() {
  try { return JSON.parse(localStorage.getItem("unicheckDemoAssignments") || "[]"); }
  catch { return []; }
}
function PageFrame({ title, subtitle, children }) {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-emerald-50 p-6 md:p-10"><main className="mx-auto max-w-5xl">
    <button onClick={() => navigate(-1)} className="mb-5 text-emerald-700 hover:underline">← Back</button>
    <h1 className="text-3xl font-bold text-gray-800">{title}</h1>{subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
    <div className="mt-6">{children}</div>
  </main></div>;
}
export function AssignmentsPage() {
  const navigate = useNavigate();
  const all = [...readCreatedAssignments(), ...assignments];
  return <PageFrame title="Assignments" subtitle="Sample assignments for this frontend demo.">
    <div className="mb-5 flex justify-end"><button onClick={() => navigate("/assignments/new")} className="rounded-lg bg-emerald-600 px-5 py-3 text-white">+ Create Assignment</button></div>
    <div className="space-y-4">{all.map((item) => <article key={item.id} className="rounded-xl bg-white p-5 shadow-sm flex justify-between items-center gap-4">
      <div><h2 className="font-semibold text-gray-800">{item.title}</h2><p className="mt-1 text-sm text-gray-500">{item.module} · Due {item.due}</p></div>
      <button onClick={() => navigate("/assignment/" + item.id)} className="rounded-lg border border-emerald-200 px-4 py-2 text-emerald-700">View details</button>
    </article>)}</div>
  </PageFrame>;
}
export function CreateAssignmentPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const existing = editId ? [...readCreatedAssignments(), ...assignments].find((item) => item.id === editId) : null;
  function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const item = { id: editId || "demo-" + Date.now(), title: form.get("title"), module: form.get("module"), due: form.get("dueDate") };
    const saved = readCreatedAssignments().filter((assignment) => assignment.id !== item.id);
    localStorage.setItem("unicheckDemoAssignments", JSON.stringify([item, ...saved]));
    navigate("/assignments");
  }
  return <PageFrame title={editId ? "Edit Assignment" : "Create Assignment"} subtitle="Changes are saved in this browser only for the frontend demo.">
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-xl bg-white p-6 shadow-sm">
      <label className="block text-sm font-medium text-gray-700">Assignment title<input name="title" required defaultValue={existing?.title || ""} className="mt-2 w-full rounded-lg border p-3" placeholder="e.g. Database Assignment 02" /></label>
      <label className="block text-sm font-medium text-gray-700">Module<input name="module" required defaultValue={existing?.module || ""} className="mt-2 w-full rounded-lg border p-3" placeholder="e.g. Database Systems" /></label>
      <label className="block text-sm font-medium text-gray-700">Due date<input name="dueDate" type="date" required defaultValue={existing?.due || ""} className="mt-2 w-full rounded-lg border p-3" /></label>
      <div className="flex gap-3"><button type="submit" className="rounded-lg bg-emerald-600 px-5 py-3 text-white">{editId ? "Save changes" : "Save assignment"}</button><button type="button" onClick={() => navigate("/assignments")} className="rounded-lg border px-5 py-3">Cancel</button></div>
    </form>
  </PageFrame>;
}
export function ModuleDetailsPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const name = decodeURIComponent(moduleId || "").replaceAll("-", " ");
  const matching = assignments.filter((item) => item.module.toLowerCase() === name.toLowerCase());
  return <PageFrame title={name || "Module"} subtitle="Sample module page">
    <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Assignments for this module</h2><p className="mt-2 text-gray-600">Module content is sample frontend data.</p>
      {matching.map((item) => <div key={item.id} className="mt-5 flex justify-between border-t pt-4"><span>{item.title}</span><button onClick={() => navigate("/assignment/" + item.id)} className="text-emerald-700">Open</button></div>)}
      <button onClick={() => navigate("/student/assignments")} className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-white">All my assignments</button>
    </section>
  </PageFrame>;
}
export function StudentAreaPage({ kind }) {
  const navigate = useNavigate();
  const content = {
    assignments: { title: "My Assignments", subtitle: "Assignments available in this demo.", rows: assignments },
    submissions: { title: "My Submissions", subtitle: "Sample submission history.", rows: [{ title: "Database Assignment 01", status: "Submitted" }, { title: "Operating Systems Assignment 01", status: "Under review" }] },
    results: { title: "My Results", subtitle: "Sample similarity results.", rows: [{ title: "Database Assignment 01", status: "Similarity: 18%" }, { title: "Operating Systems Assignment 01", status: "Similarity: 7%" }] },
  }[kind];
  return <PageFrame title={content.title} subtitle={content.subtitle}><div className="space-y-4">
    {content.rows.map((row) => <article key={row.title} className="flex items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm"><div><h2 className="font-semibold text-gray-800">{row.title}</h2><p className="mt-1 text-sm text-gray-500">{row.module || row.status || row.due}</p></div>{kind === "assignments" && <button onClick={() => navigate("/assignment/" + row.id)} className="rounded-lg border px-4 py-2 text-emerald-700">View assignment</button>}</article>)}
  </div></PageFrame>;
}
export function ReportDetailPage() {
  const { reportId } = useParams();
  return <PageFrame title="Similarity Report" subtitle={"Demo report " + reportId}><div className="rounded-xl bg-white p-6 shadow-sm"><p className="text-gray-700">Sample report preview. Similarity score: <strong>82%</strong>.</p><p className="mt-3 text-sm text-gray-500">No document was analyzed or uploaded.</p></div></PageFrame>;
}
export function NotFoundPage() {
  const navigate = useNavigate();
  return <PageFrame title="Page not found" subtitle="That screen is not part of this demo yet."><button onClick={() => navigate("/login")} className="rounded-lg bg-emerald-600 px-5 py-3 text-white">Go to Login</button></PageFrame>;
}
