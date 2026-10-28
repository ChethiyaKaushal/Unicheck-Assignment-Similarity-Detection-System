export function dashboardPath(role) {
  return role === "student" ? "/student-dashboard" : role === "admin" ? "/admin-dashboard" : "/lecturer-dashboard";
}
