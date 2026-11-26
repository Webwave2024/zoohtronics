import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { adminRequest, errorMessage, formatAdminPrice, queryString } from "../service/adminService";

const newCoupon = { code: "", type: "PERCENTAGE", amount: "", minimumOrderAmount: "0", maximumDiscount: "", startsAt: "", expiresAt: "", usageLimit: "", perUserUsageLimit: "1", active: true };

function toInputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function toPayload(form) {
  return {
    ...form,
    code: form.code.trim().toUpperCase(),
    amount: Number(form.amount),
    minimumOrderAmount: Number(form.minimumOrderAmount || 0),
    maximumDiscount: form.maximumDiscount === "" ? null : Number(form.maximumDiscount),
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
    perUserUsageLimit: Number(form.perUserUsageLimit),
  };
}

export default function AdminCoupons() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ coupons: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [loadedQuery, setLoadedQuery] = useState(null);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState("");

  const currentQuery = queryString({ page, pageSize: 20 });
  const loadCoupons = useCallback(async () => {
    try { setResult(await adminRequest(`/admin/coupons?${currentQuery}`)); setError(""); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); setLoadedQuery(currentQuery); }
  }, [currentQuery]);

  useEffect(() => { loadCoupons(); }, [loadCoupons]);

  function editCoupon(coupon) {
    setMutationError("");
    setEditor({
      id: coupon?.id || null,
      form: coupon ? {
        code: coupon.code, type: coupon.type, amount: String(coupon.amount), minimumOrderAmount: String(coupon.minimumOrderAmount),
        maximumDiscount: coupon.maximumDiscount == null ? "" : String(coupon.maximumDiscount),
        startsAt: toInputDate(coupon.startsAt), expiresAt: toInputDate(coupon.expiresAt),
        usageLimit: coupon.usageLimit == null ? "" : String(coupon.usageLimit),
        perUserUsageLimit: String(coupon.perUserUsageLimit), active: coupon.active,
      } : { ...newCoupon },
    });
  }

  async function saveCoupon(event) {
    event.preventDefault();
    setSaving(true);
    setMutationError("");
    try {
      const path = editor.id ? `/admin/coupons/${encodeURIComponent(editor.id)}` : "/admin/coupons";
      await adminRequest(path, { method: editor.id ? "PATCH" : "POST", body: toPayload(editor.form) });
      setEditor(null);
      await loadCoupons();
    } catch (requestError) { setMutationError(errorMessage(requestError)); }
    finally { setSaving(false); }
  }

  async function deactivate(coupon) {
    if (!window.confirm(`Deactivate coupon ${coupon.code}?`)) return;
    setMutationError("");
    try {
      await adminRequest(`/admin/coupons/${encodeURIComponent(coupon.id)}`, { method: "DELETE" });
      await loadCoupons();
    } catch (requestError) { setMutationError(errorMessage(requestError)); }
  }

  const setField = (field, value) => setEditor((current) => ({ ...current, form: { ...current.form, [field]: value } }));
  const isLoading = loading || loadedQuery !== currentQuery;
  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><p className="admin-eyebrow">PROMOTIONS</p><h1>Coupons</h1><p>Create and manage discount codes and usage limits.</p></div><button className="admin-button admin-button--primary" type="button" onClick={() => editCoupon()}><Plus size={16} /> New coupon</button></div>
      {mutationError && <div className="admin-alert admin-alert--error" role="alert">{mutationError}<button type="button" onClick={() => setMutationError("")}>Dismiss</button></div>}
      <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Discount codes</h2><p>{result.pagination.total || 0} coupons</p></div></div>
        {isLoading ? <div className="admin-loading">Loading coupons…</div> : error ? <div className="admin-alert admin-alert--error">{error}<button type="button" onClick={loadCoupons}>Retry</button></div> : result.coupons.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Code</th><th>Discount</th><th>Minimum spend</th><th>Usage</th><th>Validity</th><th>Status</th><th>Actions</th></tr></thead><tbody>{result.coupons.map((coupon) => { const applied = coupon._count?.redemptions || 0; return <tr key={coupon.id}><td><strong className="admin-coupon-code">{coupon.code}</strong><small>{coupon.type === "PERCENTAGE" ? "Percentage" : "Fixed amount"}</small></td><td>{coupon.type === "PERCENTAGE" ? `${coupon.amount}%` : formatAdminPrice(coupon.amount, "INR")}{coupon.maximumDiscount && <small>Max {formatAdminPrice(coupon.maximumDiscount, "INR")}</small>}</td><td>{formatAdminPrice(coupon.minimumOrderAmount, "INR")}</td><td>{applied}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : " / unlimited"}<small>{coupon.perUserUsageLimit} per customer</small></td><td>{coupon.startsAt ? new Date(coupon.startsAt).toLocaleDateString() : "Anytime"}{coupon.expiresAt && <small>Until {new Date(coupon.expiresAt).toLocaleDateString()}</small>}</td><td><span className={`admin-badge ${coupon.active ? "admin-badge--active" : "admin-badge--disabled"}`}>{coupon.active ? "ACTIVE" : "INACTIVE"}</span></td><td><div className="admin-row-actions"><button type="button" title="Edit coupon" onClick={() => editCoupon(coupon)}>Edit</button>{coupon.active && <button className="is-danger" type="button" onClick={() => deactivate(coupon)}>Deactivate</button>}</div></td></tr>; })}</tbody></table></div> : <div className="admin-empty">No coupons created yet.</div>}
        <div className="admin-pagination"><span>{result.pagination.total || 0} total</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={16} /> Previous</button><span>Page {result.pagination.page} of {Math.max(1, result.pagination.pages)}</span><button type="button" disabled={page >= result.pagination.pages} onClick={() => setPage((current) => current + 1)}>Next <ChevronRight size={16} /></button></div></div>
      </section>
      {editor && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditor(null); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="coupon-title"><div className="admin-modal-heading"><div><p className="admin-eyebrow">PROMOTION SETUP</p><h2 id="coupon-title">{editor.id ? "Edit coupon" : "Create coupon"}</h2></div><button type="button" aria-label="Close" onClick={() => setEditor(null)}><X size={19} /></button></div>
        <form className="admin-form" onSubmit={saveCoupon}><div className="admin-form-grid">
          <label>Coupon code<input required maxLength={40} pattern="[A-Za-z0-9_-]+" value={editor.form.code} onChange={(event) => setField("code", event.target.value.toUpperCase())} /></label>
          <label>Discount type<select value={editor.form.type} onChange={(event) => setField("type", event.target.value)}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount</option></select></label>
          <label>Amount{editor.form.type === "PERCENTAGE" ? " (%)" : ""}<input required type="number" min="0.01" step="0.01" max={editor.form.type === "PERCENTAGE" ? "100" : undefined} value={editor.form.amount} onChange={(event) => setField("amount", event.target.value)} /></label>
          <label>Minimum order amount<input type="number" min="0" step="0.01" value={editor.form.minimumOrderAmount} onChange={(event) => setField("minimumOrderAmount", event.target.value)} /></label>
          <label>Maximum discount <small>(optional)</small><input type="number" min="0.01" step="0.01" value={editor.form.maximumDiscount} onChange={(event) => setField("maximumDiscount", event.target.value)} /></label>
          <label>Total usage limit <small>(blank = unlimited)</small><input type="number" min="1" step="1" value={editor.form.usageLimit} onChange={(event) => setField("usageLimit", event.target.value)} /></label>
          <label>Per-customer usage limit<input required type="number" min="1" step="1" value={editor.form.perUserUsageLimit} onChange={(event) => setField("perUserUsageLimit", event.target.value)} /></label>
          <label>Starts at<input type="datetime-local" value={editor.form.startsAt} onChange={(event) => setField("startsAt", event.target.value)} /></label>
          <label>Expires at<input type="datetime-local" value={editor.form.expiresAt} onChange={(event) => setField("expiresAt", event.target.value)} /></label>
          {editor.id && <label className="admin-checkbox"><input type="checkbox" checked={editor.form.active} onChange={(event) => setField("active", event.target.checked)} /> Active</label>}
        </div>
        {mutationError && <div className="admin-alert admin-alert--error">{mutationError}</div>}
        <div className="admin-modal-actions"><button className="admin-button" type="button" disabled={saving} onClick={() => setEditor(null)}>Cancel</button><button className="admin-button admin-button--primary" type="submit" disabled={saving}>{saving ? "Saving…" : editor.id ? "Save changes" : "Create coupon"}</button></div></form>
      </section></div>}
    </section>
  );
}
