import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CircleDollarSign, Laptop, PackageCheck, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { adminRequest, errorMessage, formatAdminPrice } from "../service/adminService";

function StatCard({ icon: Icon, label, value, detail, tone = "" }) {
  return <article className={`admin-stat${tone ? ` admin-stat--${tone}` : ""}`}><span><Icon size={19} /></span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>;
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    adminRequest("/admin/dashboard")
      .then(({ dashboard: result }) => { if (active) { setDashboard(result); setStatus("succeeded"); } })
      .catch((requestError) => { if (active) { setError(errorMessage(requestError)); setStatus("failed"); } });
    return () => { active = false; };
  }, []);

  if (status === "loading") return <div className="admin-loading">Loading your store overview…</div>;
  if (status === "failed") return <div className="admin-alert admin-alert--error">{error}<button type="button" onClick={() => window.location.reload()}>Try again</button></div>;

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><p className="admin-eyebrow">STORE OVERVIEW</p><h1>Good morning.</h1><p>Here’s what’s happening with your store today.</p></div></div>
      <div className="admin-stat-grid">
        <StatCard icon={Laptop} label="Active products" value={dashboard.products.total.toLocaleString()} detail="Products not archived" />
        <StatCard icon={ShoppingBag} label="All orders" value={dashboard.orders.total.toLocaleString()} detail={`${dashboard.orders.pending} awaiting action`} tone="red" />
        <StatCard icon={AlertTriangle} label="Low stock" value={dashboard.products.lowStock.toLocaleString()} detail={`At or below ${dashboard.lowStockThreshold} units`} tone="amber" />
        <StatCard icon={PackageCheck} label="Out of stock" value={dashboard.products.outOfStock.toLocaleString()} detail="Products needing restock" />
      </div>

      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Recent orders</h2><p>Latest activity from your customers.</p></div><Link to="/admin/orders">All orders <ArrowRight size={14} /></Link></div>
          {dashboard.recentOrders.length ? <div className="admin-table-wrap"><table className="admin-table admin-table--compact"><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead><tbody>{dashboard.recentOrders.map((order) => <tr key={order.id}><td><Link className="admin-order-link" to={`/admin/orders?search=${encodeURIComponent(order.orderNumber)}`}>{order.orderNumber}</Link><small>{new Date(order.createdAt).toLocaleDateString()}</small></td><td>{order.customerEmail}</td><td><span className={`admin-badge admin-badge--${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span></td><td className="admin-table__amount">{formatAdminPrice(order.totalAmount, order.currency)}</td></tr>)}</tbody></table></div> : <div className="admin-empty">No orders yet.</div>}
        </section>
        <section className="admin-panel admin-revenue-panel">
          <div className="admin-panel-heading"><div><h2>Paid revenue</h2><p>Totals are shown separately by currency.</p></div><span className="admin-panel-icon"><CircleDollarSign size={19} /></span></div>
          {dashboard.paidRevenueByCurrency.length ? dashboard.paidRevenueByCurrency.map(({ currency, amount }) => <div className="admin-revenue-row" key={currency}><span>{currency}</span><strong>{formatAdminPrice(amount, currency)}</strong></div>) : <div className="admin-empty">No successfully paid orders yet.</div>}
          <div className="admin-revenue-note">Revenue includes orders marked as successfully paid.</div>
        </section>
      </div>
      <div className="admin-quick-links"><Link to="/admin/products"><Laptop size={17} /> Manage inventory <ArrowRight size={15} /></Link><Link to="/admin/orders"><PackageCheck size={17} /> Review orders <ArrowRight size={15} /></Link></div>
    </section>
  );
}
