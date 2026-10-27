import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
export default function StudentDashboard() { const navigate = useNavigate(); useEffect(() => { navigate("/student/assignments", { replace: true }); }, [navigate]); return <main className="p-8">Opening available assignments…</main>; }
