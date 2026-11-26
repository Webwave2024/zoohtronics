import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { useAppSelector } from "../../../app/hooks";
import { adminRequest, errorMessage, queryString } from "../service/adminService";

export default function AdminCustomers() {
  const actor = useAppSelector((state) => state.auth.user);
  const [filters, setFilters] = useState({ role: "", status: "", page: 1 });
  const [result, setResult] = useState({ items: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [loadedQuery, setLoadedQuery] = useState(null);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [actionError, setActionError] = useState("");

  const currentQuery = queryString({ ...filters, pageSize: 25 });
  const loadUsers = useCallback(async () => {
    try {
      setResult(await adminRequest(`/admin/users?${currentQuery}`));
      setError("");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
      setLoadedQuery(currentQuery);
    }
  }, [currentQuery]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function updateUser(user, field, value) {
    setSavingId(user.id);
    setActionError("");
    try {
      const { user: updated } = await adminRequest(`/admin/users/${encodeURIComponent(user.id)}`, { method: "PATCH", body: { [field]: value } });
      setResult((current) => ({ ...current, items: current.items.map((item) => item.id === user.id ? updated : item) }));
    } catch (requestError) {
      setActionError(errorMessage(requestError));
    } finally {
      setSavingId("");
    }
  }

  const isLoading = loading || loadedQuery !== currentQuery;
  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><p className="admin-eyebrow">ACCESS & ACCOUNTS</p><h1>Customers</h1><p>Review accounts and manage staff access safely.</p></div></div>
      {actionError && <div className="admin-alert admin-alert--error">{actionError}<button type="button" onClick={() => setActionError("")}>Dismiss</button></div>}
      <div className="admin-toolbar"><select aria-label="Filter users by role" value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value, page: 1 }))}><option value="">All roles</option><option value="CUSTOMER">Customer</option><option value="ADMIN">Admin</option></select><select aria-label="Filter users by status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}><option value="">All account statuses</option><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option></select></div>
      <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Accounts</h2><p>{result.pagination.total || 0} matching accounts</p></div></div>
        {isLoading ? <div className="admin-loading">Loading accounts…</div> : error ? <div className="admin-alert admin-alert--error">{error}<button type="button" onClick={loadUsers}>Retry</button></div> : result.items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Phone</th><th>Joined</th><th>Role</th><th>Account</th></tr></thead><tbody>{result.items.map((user) => <tr key={user.id}><td><div className="admin-user-cell"><span><UserRound size={16} /></span><div><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small></div></div></td><td>{user.phone || "—"}</td><td>{new Date(user.createdAt).toLocaleDateString()}</td><td><select aria-label={`Role for ${user.email}`} value={user.role} disabled={savingId === user.id || user.id === actor?.id} onChange={(event) => updateUser(user, "role", event.target.value)}><option value="CUSTOMER">Customer</option><option value="ADMIN">Admin</option></select></td><td><select aria-label={`Status for ${user.email}`} value={user.status} disabled={savingId === user.id || user.id === actor?.id} onChange={(event) => updateUser(user, "status", event.target.value)}><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option></select></td></tr>)}</tbody></table></div> : <div className="admin-empty">No accounts match those filters.</div>}
        <div className="admin-pagination"><span>{result.pagination.total || 0} total</span><div><button type="button" disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}><ChevronLeft size={16} /> Previous</button><span>Page {result.pagination.page} of {Math.max(1, result.pagination.pages)}</span><button type="button" disabled={filters.page >= result.pagination.pages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next <ChevronRight size={16} /></button></div></div>
      </section>
    </section>
  );
}
