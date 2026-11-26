import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { adminRequest, errorMessage, queryString } from "../service/adminService";

const inquiryStatuses = ["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function AdminInquiries() {
  const [filters, setFilters] = useState({ search: "", status: "", page: 1 });
  const [search, setSearch] = useState("");
  const [result, setResult] = useState({ items: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedQuery, setLoadedQuery] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState("");

  const currentQuery = queryString({ ...filters, pageSize: 20 });
  const loadInquiries = useCallback(async () => {
    try { setResult(await adminRequest(`/admin/inquiries?${currentQuery}`)); setError(""); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); setLoadedQuery(currentQuery); }
  }, [currentQuery]);

  useEffect(() => { loadInquiries(); }, [loadInquiries]);
  useEffect(() => {
    adminRequest("/admin/users?role=ADMIN&status=ACTIVE&page=1&pageSize=100")
      .then(({ items }) => setAdmins(items))
      .catch(() => setAdmins([]));
  }, []);

  async function openInquiry(inquiry) {
    setMutationError("");
    try {
      const { inquiry: fullInquiry } = await adminRequest(`/admin/inquiries/${encodeURIComponent(inquiry.id)}`);
      setSelected(fullInquiry);
      setDraft({ status: fullInquiry.status, adminNotes: fullInquiry.adminNotes || "", assignedAdminId: fullInquiry.assignedAdminId || "" });
    } catch (requestError) { setMutationError(errorMessage(requestError)); }
  }

  async function saveInquiry(event) {
    event.preventDefault();
    setSaving(true);
    setMutationError("");
    try {
      const { inquiry } = await adminRequest(`/admin/inquiries/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        body: { ...draft, assignedAdminId: draft.assignedAdminId || null, adminNotes: draft.adminNotes || null },
      });
      setSelected(inquiry);
      setDraft({ status: inquiry.status, adminNotes: inquiry.adminNotes || "", assignedAdminId: inquiry.assignedAdminId || "" });
      await loadInquiries();
    } catch (requestError) { setMutationError(errorMessage(requestError)); }
    finally { setSaving(false); }
  }

  const isLoading = loading || loadedQuery !== currentQuery;
  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><p className="admin-eyebrow">CUSTOMER SUPPORT</p><h1>Inquiries</h1><p>Review customer messages, add private notes, and track resolution.</p></div></div>
      {mutationError && !selected && <div className="admin-alert admin-alert--error">{mutationError}<button type="button" onClick={() => setMutationError("")}>Dismiss</button></div>}
      <div className="admin-toolbar"><form className="admin-search" onSubmit={(event) => { event.preventDefault(); setFilters((current) => ({ ...current, search, page: 1 })); }}><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or subject…" /><button type="submit">Search</button></form><select aria-label="Inquiry status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}><option value="">All statuses</option>{inquiryStatuses.map((status) => <option key={status}>{status}</option>)}</select></div>
      <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Customer messages</h2><p>{result.pagination.total || 0} inquiries</p></div></div>
        {isLoading ? <div className="admin-loading">Loading inquiries…</div> : error ? <div className="admin-alert admin-alert--error">{error}<button type="button" onClick={loadInquiries}>Retry</button></div> : result.items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Subject</th><th>Status</th><th>Assigned to</th><th>Received</th><th /></tr></thead><tbody>{result.items.map((inquiry) => <tr key={inquiry.id}><td><strong>{inquiry.name}</strong><small>{inquiry.email}</small></td><td>{inquiry.subject}</td><td><span className={`admin-badge admin-badge--${inquiry.status.toLowerCase()}`}>{inquiry.status.replaceAll("_", " ")}</span></td><td>{inquiry.assignedAdmin ? `${inquiry.assignedAdmin.firstName} ${inquiry.assignedAdmin.lastName}` : "Unassigned"}</td><td>{new Date(inquiry.createdAt).toLocaleDateString()}</td><td><button className="admin-button admin-button--small" type="button" onClick={() => openInquiry(inquiry)}>Open</button></td></tr>)}</tbody></table></div> : <div className="admin-empty">No inquiries match those filters.</div>}
        <div className="admin-pagination"><span>{result.pagination.total || 0} total</span><div><button type="button" disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}><ChevronLeft size={16} /> Previous</button><span>Page {result.pagination.page} of {Math.max(1, result.pagination.pages)}</span><button type="button" disabled={filters.page >= result.pagination.pages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next <ChevronRight size={16} /></button></div></div>
      </section>
      {selected && draft && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSelected(null); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="inquiry-title"><div className="admin-modal-heading"><div><p className="admin-eyebrow">INQUIRY DETAILS</p><h2 id="inquiry-title">{selected.subject}</h2><p>{selected.name} · <a href={`mailto:${selected.email}`}>{selected.email}</a></p></div><button type="button" aria-label="Close" onClick={() => setSelected(null)}><X size={19} /></button></div>
        <div className="admin-inquiry-message"><small>Received {new Date(selected.createdAt).toLocaleString()}</small><p>{selected.message}</p>{selected.phone && <span>Phone: {selected.phone}</span>}</div>
        <form className="admin-form" onSubmit={saveInquiry}><div className="admin-form-grid"><label>Status<select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>{inquiryStatuses.map((status) => <option key={status}>{status}</option>)}</select></label><label>Assign to<select value={draft.assignedAdminId} onChange={(event) => setDraft((current) => ({ ...current, assignedAdminId: event.target.value }))}><option value="">Unassigned</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.firstName} {admin.lastName} · {admin.email}</option>)}</select></label><label className="admin-form-full">Internal notes<textarea rows="5" maxLength={5000} value={draft.adminNotes} onChange={(event) => setDraft((current) => ({ ...current, adminNotes: event.target.value }))} placeholder="Notes are only visible to administrators." /></label></div>{mutationError && <div className="admin-alert admin-alert--error" role="alert">{mutationError}</div>}<div className="admin-modal-actions"><button className="admin-button" type="button" disabled={saving} onClick={() => setSelected(null)}>Close</button><button className="admin-button admin-button--primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save updates"}</button></div></form>
      </section></div>}
    </section>
  );
}
