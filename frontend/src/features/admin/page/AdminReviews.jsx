import { useCallback, useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Star, X } from "lucide-react";
import { adminRequest, errorMessage, queryString } from "../service/adminService";

export default function AdminReviews() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadedQuery, setLoadedQuery] = useState(null);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  const currentQuery = queryString({ page, pageSize: 20 });
  const loadReviews = useCallback(async () => {
    try {
      const result = await adminRequest(`/admin/reviews?${currentQuery}`);
      setItems(result.items);
      setPagination(result.pagination);
      setError("");
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); setLoadedQuery(currentQuery); }
  }, [currentQuery]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  async function moderate(review, status) {
    setSavingId(review.id);
    setError("");
    try {
      await adminRequest(`/admin/reviews/${encodeURIComponent(review.id)}/moderation`, { method: "PATCH", body: { status } });
      await loadReviews();
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSavingId(""); }
  }

  const isLoading = loading || loadedQuery !== currentQuery;
  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><p className="admin-eyebrow">CUSTOMER FEEDBACK</p><h1>Reviews</h1><p>Moderate purchase-verified customer reviews before publication.</p></div></div>
      {error && <div className="admin-alert admin-alert--error" role="alert">{error}<button type="button" onClick={loadReviews}>Retry</button></div>}
      <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Awaiting moderation</h2><p>{pagination.total} pending review(s)</p></div></div>
        {isLoading ? <div className="admin-loading">Loading reviews…</div> : error ? <div className="admin-alert admin-alert--error">{error}<button type="button" onClick={loadReviews}>Retry</button></div> : items.length ? <div className="admin-review-list">{items.map((review) => <article className="admin-review-card" key={review.id}><div className="admin-review-card__top"><div><strong>{review.user.firstName} {review.user.lastName}</strong><small>{review.user.email} · {new Date(review.createdAt).toLocaleString()}</small></div><span><Star size={14} fill="currentColor" /> {review.rating}/5</span></div><p className="admin-review-product">{review.laptop.title} · SKU {review.laptop.sku}</p>{review.title && <h3>{review.title}</h3>}<p className="admin-review-body">{review.body}</p><div className="admin-review-actions"><button className="admin-button admin-button--primary admin-button--small" type="button" disabled={savingId === review.id} onClick={() => moderate(review, "PUBLISHED")}><Check size={14} /> Publish</button><button className="admin-button admin-button--danger admin-button--small" type="button" disabled={savingId === review.id} onClick={() => moderate(review, "REJECTED")}><X size={14} /> Reject</button></div></article>)}</div> : <div className="admin-empty">All caught up. There are no reviews waiting for moderation.</div>}
        <div className="admin-pagination"><span>{pagination.total} total</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={16} /> Previous</button><span>Page {pagination.page} of {Math.max(1, pagination.pages)}</span><button type="button" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)}>Next <ChevronRight size={16} /></button></div></div>
      </section>
    </section>
  );
}
