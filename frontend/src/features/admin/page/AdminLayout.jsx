import { useState } from "react";
import { LayoutDashboard, Laptop, Menu, MessageSquare, Package, Percent, ShieldCheck, Tags, Users, X } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { signOut } from "../../auth/state/authSlice";
import Brand from "../../../shared/components/Brand";

const navigation = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products & stock", icon: Laptop },
  { to: "/admin/categories", label: "Categories", icon: Tags },
  { to: "/admin/orders", label: "Orders", icon: Package },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/coupons", label: "Coupons", icon: Percent },
  { to: "/admin/reviews", label: "Reviews", icon: ShieldCheck },
  { to: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
];

export default function AdminLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [menuOpen, setMenuOpen] = useState(false);

  function logout() {
    dispatch(signOut());
    navigate("/login", { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar${menuOpen ? " is-open" : ""}`}>
        <div className="admin-sidebar__brand"><Brand /><span>STORE ADMIN</span></div>
        <div className="admin-sidebar__label">WORKSPACE</div>
        <nav aria-label="Admin navigation">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)}>
              <Icon size={17} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__bottom">
          <div className="admin-user"><span>{(user?.firstName || "A").slice(0, 1).toUpperCase()}</span><div><strong>{user?.firstName} {user?.lastName}</strong><small>Administrator</small></div></div>
          <button type="button" onClick={logout}>Sign out</button>
        </div>
      </aside>
      {menuOpen && <button className="admin-backdrop" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu-button" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          <div><strong>Zohntronics</strong><span> / Admin workspace</span></div>
          <a href="/" target="_blank" rel="noreferrer">View storefront ↗</a>
        </header>
        <div className="admin-content"><Outlet /></div>
      </div>
    </div>
  );
}
