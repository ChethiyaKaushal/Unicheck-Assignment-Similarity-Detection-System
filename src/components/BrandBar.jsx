import { Link, useLocation } from "react-router-dom";
import { currentUser } from "../lib/api";
import { dashboardPath } from "../lib/paths";
import BrandMark from "./BrandMark";

export default function BrandBar() {
  const location = useLocation();
  const user = currentUser();
  if (!user || user.mustChangePassword || ["/login", "/register", "/change-password"].includes(location.pathname)) return null;
  return <header className="global-brandbar"><Link to={dashboardPath(user.role)} aria-label="UniCheck home"><BrandMark /><span className="brand-name">UniCheck</span></Link><span className="brand-role">{user.role} workspace</span></header>;
}
