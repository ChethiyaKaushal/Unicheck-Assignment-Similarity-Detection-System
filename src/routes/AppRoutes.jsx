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
import { AssignmentsPage, CreateAssignmentPage, ModuleDetailsPage, StudentAreaPage, ReportDetailPage, NotFoundPage } from "../pages/FrontendPages";

function AppRoutes() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/student-dashboard" element={<StudentDashboard />} />
    <Route path="/lecturer-dashboard" element={<LecturerDashboard />} />
    <Route path="/assignments" element={<AssignmentsPage />} />
    <Route path="/assignments/new" element={<CreateAssignmentPage />} />
    <Route path="/modules/:moduleId" element={<ModuleDetailsPage />} />
    <Route path="/student/assignments" element={<StudentAreaPage kind="assignments" />} />
    <Route path="/student/submissions" element={<StudentAreaPage kind="submissions" />} />
    <Route path="/student/results" element={<StudentAreaPage kind="results" />} />
    <Route path="/assignment/:id/edit" element={<CreateAssignmentPage />} />
    <Route path="/assignment/:id" element={<AssignmentDetails />} />
    <Route path="/submissions" element={<Submissions />} />
    <Route path="/reports" element={<Reports />} />
    <Route path="/reports/:reportId" element={<ReportDetailPage />} />
    <Route path="/profile" element={<Profile />} />
    <Route path="/similarity-check" element={<SimilarityCheck />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></BrowserRouter>;
}
export default AppRoutes;
