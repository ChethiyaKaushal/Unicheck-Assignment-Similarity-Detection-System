import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import StudentDashboard from "../pages/StudentDashboard";
import LecturerDashboard from "../pages/LecturerDashboard";
import AssignmentDetails from "../pages/AssignmentDetails";
import Submissions from "../pages/Submissions";
import Reports from "../pages/Reports";
import Profile from "../pages/Profile";
import SimilarityCheck from "../pages/SimilarityCheck";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/lecturer-dashboard" element={<LecturerDashboard />} />
        <Route path="/assignment/:id" element={<AssignmentDetails />}/>
        <Route path="/submissions" element={<Submissions />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/similarity-check" element={<SimilarityCheck />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;