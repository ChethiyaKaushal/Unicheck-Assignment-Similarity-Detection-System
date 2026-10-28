import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import StudentDashboard from "../pages/StudentDashboard";
import LecturerDashboard from "../pages/LecturerDashboard";
import AssignmentDetails from "../pages/AssignmentDetails";
import Submissions from "../pages/Submissions";
import SubmissionDetails from "../pages/SubmissionDetails";
import Reports from "../pages/Reports";
import Profile from "../pages/Profile";
import ChangePassword from "../pages/ChangePassword";
import { AssignmentsPage, CreateAssignmentPage, ModuleDetailsPage, ReportDetailPage, NotFoundPage } from "../pages/FrontendPages";
import { currentUser } from "../lib/api";

function RoleRoute({ role, children }) {
  const user = currentUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (user.role !== role) return <Navigate to={user.role === "student" ? "/student-dashboard" : "/lecturer-dashboard"} replace />;
  return children;
}

function HomeRedirect() {
  const user = currentUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return <Navigate to={user.role === "student" ? "/student-dashboard" : "/lecturer-dashboard"} replace />;
}

function AppRoutes() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<HomeRedirect />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/change-password" element={<ChangePassword />} />
    <Route path="/student-dashboard" element={<RoleRoute role="student"><StudentDashboard /></RoleRoute>} />
    <Route path="/lecturer-dashboard" element={<RoleRoute role="lecturer"><LecturerDashboard /></RoleRoute>} />
    <Route path="/assignments" element={<RoleRoute role="lecturer"><AssignmentsPage /></RoleRoute>} />
    <Route path="/assignments/new" element={<RoleRoute role="lecturer"><CreateAssignmentPage /></RoleRoute>} />
    <Route path="/modules/:moduleId" element={<ModuleDetailsPage />} />
    <Route path="/student/assignments" element={<RoleRoute role="student"><Navigate to="/student-dashboard?view=assignments" replace /></RoleRoute>} />
    <Route path="/student/submissions" element={<RoleRoute role="student"><Navigate to="/student-dashboard?view=submissions" replace /></RoleRoute>} />
    <Route path="/student/results" element={<RoleRoute role="student"><Navigate to="/student-dashboard?view=feedback" replace /></RoleRoute>} />
    <Route path="/assignment/:id/edit" element={<RoleRoute role="lecturer"><AssignmentDetails /></RoleRoute>} />
    <Route path="/assignment/:id" element={<RoleRoute role="lecturer"><AssignmentDetails /></RoleRoute>} />
    <Route path="/submissions" element={<RoleRoute role="lecturer"><Submissions /></RoleRoute>} />
    <Route path="/submissions/:id" element={<RoleRoute role="lecturer"><SubmissionDetails /></RoleRoute>} />
    <Route path="/reports" element={<RoleRoute role="lecturer"><Reports /></RoleRoute>} />
    <Route path="/reports/:reportId" element={<RoleRoute role="lecturer"><ReportDetailPage /></RoleRoute>} />
    <Route path="/profile" element={<RoleRoute role="lecturer"><Profile /></RoleRoute>} />
    <Route path="/similarity-check" element={<RoleRoute role="lecturer"><Reports /></RoleRoute>} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></BrowserRouter>;
}
export default AppRoutes;
