import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, PackageCheck, Search, Truck, X } from "lucide-react";
import { adminRequest, errorMessage, formatAdminPrice, queryString } from "../service/adminService";

const orderStatuses = ["PENDING", "PAYMENT_PROCESSING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
const orderTransitions = {
  PENDING: ["PAYMENT_PROCESSING", "CONFIRMED", "PROCESSING"],
  PAYMENT_PROCESSING: ["CONFIRMED"],
  CONFIRMED: ["PROCESSING"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
const shipmentTransitions = {
  PENDING: ["LABEL_CREATED", "CANCELLED"],
  LABEL_CREATED: ["IN_TRANSIT", "CANCELLED", "FAILED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED", "RETURNED"],
  DELIVERED: [],
  FAILED: ["IN_TRANSIT", "CANCELLED"],
  RETURNED: [],
  CANCELLED: [],
};

export default function AdminOrders() {
  const [filters, setFilters] = useState({ search: "", status: "", paymentStatus: "", page: 1 });
  const [search, setSearch] = useState("");
  const [result, setResult] = useState({ items: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [loadedQuery, setLoadedQuery] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [shipment, setShipment] = useState({ status: "PENDING", carrier: "", trackingNumber: "", trackingUrl: "" });

  const currentQuery = queryString({ ...filters, pageSize: 20 });
  const loadOrders = useCallback(async () => {
    try {
      setResult(await adminRequest(`/admin/orders?${currentQuery}`));
      setError("");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
      setLoadedQuery(currentQuery);
    }
  }, [currentQuery]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  async function updateOrderStatus(status) {
    setSaving(true);
    setMutationError("");
    try {
      const { order } = await adminRequest(`/orders/admin/${encodeURIComponent(selected.id)}/status`, { method: "PATCH", body: { status } });
      setSelected(order);
      await loadOrders();
    } catch (requestError) {
      setMutationError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder() {
    if (!window.confirm(`Cancel order ${selected.orderNumber}? Reserved stock will be restored.`)) return;
    setSaving(true);
    setMutationError("");
    try {
      const { order } = await adminRequest(`/orders/admin/${encodeURIComponent(selected.id)}/cancel`, { method: "POST", body: {} });
      setSelected(order);
      await loadOrders();
    } catch (requestError) {
      setMutationError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function saveShipment(event) {
    event.preventDefault();
    setSaving(true);
    setMutationError("");
    try {
      await adminRequest(`/orders/admin/${encodeURIComponent(selected.id)}/shipments`, {
        method: "POST",
        body: Object.fromEntries(Object.entries(shipment).filter(([, value]) => value !== "")),
      });
      const { order } = await adminRequest(`/orders/${encodeURIComponent(selected.id)}`);
      setSelected(order);
      setShipment({ status: "PENDING", carrier: "", trackingNumber: "", trackingUrl: "" });
      await loadOrders();
    } catch (requestError) {
      setMutationError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function updateShipmentStatus(shipmentId, status) {
    setSaving(true);
    setMutationError("");
    try {
      await adminRequest(`/orders/admin/shipments/${encodeURIComponent(shipmentId)}`, { method: "PATCH", body: { status } });
      const { order } = await adminRequest(`/orders/${encodeURIComponent(selected.id)}`);
      setSelected(order);
      await loadOrders();
    } catch (requestError) {
      setMutationError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const isLoading = loading || loadedQuery !== currentQuery;
  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><p className="admin-eyebrow">FULFILLMENT</p><h1>Orders</h1><p>Review order payments, fulfillment status, and shipping details.</p></div></div>
      <div className="admin-toolbar">
        <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setFilters((current) => ({ ...current, search, page: 1 })); }}><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order number or customer email…" /><button type="submit">Search</button></form>
        <select aria-label="Order status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}><option value="">All order statuses</option>{orderStatuses.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Payment status" value={filters.paymentStatus} onChange={(event) => setFilters((current) => ({ ...current, paymentStatus: event.target.value, page: 1 }))}><option value="">All payments</option>{["PENDING", "PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED", "PARTIALLY_REFUNDED", "REFUNDED"].map((item) => <option key={item}>{item}</option>)}</select>
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Order list</h2><p>{result.pagination.total || 0} matching orders</p></div></div>
        {isLoading ? <div className="admin-loading">Loading orders…</div> : error ? <div className="admin-alert admin-alert--error">{error}<button type="button" onClick={loadOrders}>Retry</button></div> : result.items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Order status</th><th>Payment</th><th>Total</th><th /></tr></thead><tbody>{result.items.map((order) => <tr key={order.id}><td><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleString()}</small></td><td>{order.user?.firstName} {order.user?.lastName}<small>{order.customerEmail}</small></td><td>{order.items.length}</td><td><span className={`admin-badge admin-badge--${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span></td><td><span className={`admin-badge admin-badge--${order.paymentStatus.toLowerCase()}`}>{order.paymentStatus.replaceAll("_", " ")}</span></td><td className="admin-table__amount">{formatAdminPrice(order.totalAmount, order.currency)}</td><td><button className="admin-button admin-button--small" type="button" onClick={() => { setSelected(order); setMutationError(""); }}>Manage</button></td></tr>)}</tbody></table></div> : <div className="admin-empty">No orders found.</div>}
        <div className="admin-pagination"><span>{result.pagination.total || 0} total</span><div><button type="button" disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}><ChevronLeft size={16} /> Previous</button><span>Page {result.pagination.page} of {Math.max(1, result.pagination.pages)}</span><button type="button" disabled={filters.page >= result.pagination.pages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next <ChevronRight size={16} /></button></div></div>
      </section>
      {selected && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSelected(null); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
        <div className="admin-modal-heading"><div><p className="admin-eyebrow">ORDER MANAGEMENT</p><h2 id="order-detail-title">{selected.orderNumber}</h2><p>{selected.customerEmail} · {new Date(selected.createdAt).toLocaleString()}</p></div><button type="button" aria-label="Close" onClick={() => setSelected(null)}><X size={19} /></button></div>
        {mutationError && <div className="admin-alert admin-alert--error" role="alert">{mutationError}</div>}
        <div className="admin-order-overview"><div><small>Order total</small><strong>{formatAdminPrice(selected.totalAmount, selected.currency)}</strong></div><div><small>Order status</small><strong>{selected.status.replaceAll("_", " ")}</strong></div><div><small>Payment</small><strong>{selected.paymentStatus.replaceAll("_", " ")}</strong></div></div>
        <div className="admin-order-items">{selected.items.map((item) => <div key={item.id}><span>{item.quantity} ×</span><strong>{item.productTitle}</strong><small>{item.productSku}</small><b>{formatAdminPrice(Number(item.unitPrice) * item.quantity, selected.currency)}</b></div>)}</div>
        <div className="admin-order-addresses">{selected.addresses.filter((address) => address.type === "SHIPPING").map((address) => <div key={address.id}><h3>Ship to</h3><p>{address.firstName} {address.lastName}<br />{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}<br />{address.city}, {address.state} {address.postalCode}, {address.countryCode}<br />{address.phone}</p></div>)}</div>
        <div className="admin-form-grid admin-order-controls"><label>Fulfillment status<select value={selected.status} disabled={saving} onChange={(event) => updateOrderStatus(event.target.value)}>{[selected.status, ...(orderTransitions[selected.status] || [])].filter((item, index, options) => options.indexOf(item) === index).map((item) => <option key={item}>{item}</option>)}</select></label>{["PENDING", "PAYMENT_PROCESSING"].includes(selected.status) && <button className="admin-button admin-button--danger" type="button" disabled={saving} onClick={cancelOrder}>Cancel order</button>}</div>
        {selected.payments.map((payment) => <div className="admin-payment-line" key={payment.id}><span>Payment · {payment.method.replaceAll("_", " ")}</span><strong>{payment.status}</strong><small>{payment.provider}</small></div>)}
        {selected.shipments.map((item) => <div className="admin-shipment-line" key={item.id}><Truck size={16} /><div><strong>{item.status.replaceAll("_", " ")}</strong><small>{item.carrier || "Carrier pending"} · {item.trackingNumber || "Tracking pending"}</small></div>{item.trackingUrl && <a href={item.trackingUrl} target="_blank" rel="noreferrer" aria-label="Open tracking"><ExternalLink size={15} /></a>}{(shipmentTransitions[item.status] || []).length > 0 && <select aria-label={`Update shipment ${item.trackingNumber || item.id}`} value={item.status} disabled={saving} onChange={(event) => updateShipmentStatus(item.id, event.target.value)}>{[item.status, ...shipmentTransitions[item.status]].map((option) => <option key={option}>{option}</option>)}</select>}</div>)}
        {["PROCESSING", "SHIPPED"].includes(selected.status) && !["CANCELLED", "DELIVERED"].includes(selected.status) && <form className="admin-form admin-shipment-form" onSubmit={saveShipment}><h3><PackageCheck size={16} /> Add shipment tracking</h3><div className="admin-form-grid"><label>Status<select value={shipment.status} onChange={(event) => setShipment((current) => ({ ...current, status: event.target.value }))}><option value="PENDING">PENDING</option><option value="LABEL_CREATED">LABEL_CREATED</option></select></label><label>Carrier<input maxLength={100} value={shipment.carrier} onChange={(event) => setShipment((current) => ({ ...current, carrier: event.target.value }))} /></label><label>Tracking number<input maxLength={200} value={shipment.trackingNumber} onChange={(event) => setShipment((current) => ({ ...current, trackingNumber: event.target.value }))} /></label><label>Tracking URL<input type="url" maxLength={2048} value={shipment.trackingUrl} onChange={(event) => setShipment((current) => ({ ...current, trackingUrl: event.target.value }))} /></label></div><button className="admin-button admin-button--primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save shipment"}</button></form>}
      </section></div>}
    </section>
  );
}
