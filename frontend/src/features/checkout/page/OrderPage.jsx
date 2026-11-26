import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, PackageCheck, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { formatPrice, gradeLabels } from "../../../shared/format";
import { cancelOrder, fetchOrder } from "../state/checkoutSlice";
import { startOnlinePayment } from "../service/payment";

function prettyStatus(value = "") {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function OrderPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { order, orderStatus, orderError, cancelStatus, cancelError } = useAppSelector((state) => state.checkout);
  const user = useAppSelector((state) => state.auth.user);
  const [paymentError, setPaymentError] = useState("");
  const [paymentStarting, setPaymentStarting] = useState(false);

  useEffect(() => {
    dispatch(fetchOrder(id));
  }, [dispatch, id, location.search]);

  const isForThisOrder = order?.id === id;
  const pending = isForThisOrder && ["PENDING", "PAYMENT_PROCESSING"].includes(order.status) && ["PENDING", "FAILED", "CANCELLED", "PROCESSING"].includes(order.paymentStatus);
  const canCancel = pending && order.paymentStatus !== "PROCESSING";
  const canPayOnline = pending && order.payments?.some((payment) => payment.provider === "razorpay");
  const shippingAddress = order?.addresses?.find((address) => address.type === "SHIPPING");

  async function retryPayment() {
    if (!order) return;
    setPaymentError("");
    setPaymentStarting(true);
    try {
      await startOnlinePayment({ order, user, navigate, onError: setPaymentError });
    } catch (error) {
      setPaymentError(error.message);
    } finally {
      setPaymentStarting(false);
    }
  }

  async function handleCancel() {
    if (!order || !window.confirm("Cancel this order? Reserved stock will be released.")) return;
    const result = await dispatch(cancelOrder(order.id));
    if (cancelOrder.fulfilled.match(result)) dispatch(fetchOrder(id));
  }

  if (!isForThisOrder && orderStatus !== "failed") return <main className="commerce-page"><div className="state-card"><h3>Loading your order…</h3></div></main>;
  if (orderStatus === "failed") {
    return <main className="commerce-page"><div className="state-card state-card--error"><CircleAlert size={28} /><h3>We couldn’t load this order.</h3><p>{orderError || "Order information is not available."}</p><Link className="button button--outline" to="/account">Back to your account</Link></div></main>;
  }

  const successMessage = searchParams.get("payment") === "success" || order.paymentStatus === "SUCCEEDED";
  return (
    <main className="commerce-page order-page">
      <div className="commerce-page__heading">
        <Link className="auth-back" to="/account"><ArrowLeft size={15} /> Back to your account</Link>
        <p className="eyebrow">{successMessage ? "PAYMENT CONFIRMED" : "ORDER DETAILS"}</p>
        <h1>{successMessage ? "Thank you for your order." : order.status === "CANCELLED" ? "Order cancelled." : "Your order is in safe hands."}</h1>
        <p>Order <strong>{order.orderNumber}</strong> · Placed {new Date(order.createdAt).toLocaleString()}</p>
      </div>

      {successMessage && <div className="notice notice--success" role="status"><Check size={17} /> Payment received. We’ll keep you updated as your order progresses.</div>}
      {(paymentError || cancelError || (searchParams.get("payment") === "verify-failed" && location.state?.paymentError)) && <div className="notice notice--error" role="alert">{paymentError || cancelError || location.state?.paymentError}</div>}

      <div className="order-layout">
        <section className="order-details-main">
          <article className="order-card">
            <div className="order-card__heading"><span><PackageCheck size={18} /></span><div><h2>Order status</h2><p>Current status for your order.</p></div></div>
            <div className="order-status-grid">
              <div><small>Order</small><strong>{prettyStatus(order.status)}</strong></div>
              <div><small>Payment</small><strong>{prettyStatus(order.paymentStatus)}</strong></div>
              {order.paymentExpiresAt && pending && <div><small>Payment deadline</small><strong>{new Date(order.paymentExpiresAt).toLocaleString()}</strong></div>}
            </div>
            {canPayOnline && <div className="order-payment-actions">
              <p>Payment is not complete. Finish payment before the order’s payment window expires.</p>
              <button className="button button--primary" type="button" disabled={paymentStarting} onClick={retryPayment}>{paymentStarting ? "Opening secure payment…" : "Retry payment"} <ArrowRight size={15} /></button>
            </div>}
            {canCancel && <button className="order-cancel-button" type="button" disabled={cancelStatus === "loading"} onClick={handleCancel}>{cancelStatus === "loading" ? "Cancelling…" : "Cancel this order"}</button>}
          </article>

          <article className="order-card">
            <div className="order-card__heading"><span><PackageCheck size={18} /></span><div><h2>Items in your order</h2><p>{order.items.length} item(s)</p></div></div>
            <div className="order-items">
              {order.items.map((item) => (
                <div className="order-item" key={item.id}>
                  <div className="order-item__image">{item.laptop?.images?.[0]?.url && <img src={item.laptop.images[0].url} alt="" />}</div>
                  <div><strong>{item.productTitle}</strong><span>{gradeLabels[item.refurbishmentGrade] || item.refurbishmentGrade} · Qty {item.quantity}</span><small>SKU {item.productSku}</small></div>
                  <b>{formatPrice(Number(item.unitPrice) * item.quantity, order.currency)}</b>
                </div>
              ))}
            </div>
          </article>

          {shippingAddress && <article className="order-card">
            <div className="order-card__heading"><span><ShieldCheck size={18} /></span><div><h2>Delivery address</h2><p>Address saved with this order.</p></div></div>
            <address className="order-address"><strong>{shippingAddress.firstName} {shippingAddress.lastName}</strong><br />{shippingAddress.addressLine1}{shippingAddress.addressLine2 ? `, ${shippingAddress.addressLine2}` : ""}<br />{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}, {shippingAddress.countryCode}<br />{shippingAddress.phone}</address>
          </article>}
        </section>

        <aside className="order-summary order-detail-summary">
          <h2>Payment summary</h2>
          <div><span>Subtotal</span><strong>{formatPrice(order.subtotal, order.currency)}</strong></div>
          {Number(order.discountAmount) > 0 && <div><span>Discount</span><strong className="discount-amount">−{formatPrice(order.discountAmount, order.currency)}</strong></div>}
          <div><span>Shipping</span><strong>{Number(order.shippingAmount) ? formatPrice(order.shippingAmount, order.currency) : "Free"}</strong></div>
          <div><span>Taxes</span><strong>{Number(order.taxAmount) ? formatPrice(order.taxAmount, order.currency) : formatPrice(0, order.currency)}</strong></div>
          <div className="order-summary__total"><span>Total</span><strong>{formatPrice(order.totalAmount, order.currency)}</strong></div>
          <p>Payment status: {prettyStatus(order.paymentStatus)}</p>
          <Link className="button button--outline button--full" to="/">Continue shopping <ArrowRight size={15} /></Link>
        </aside>
      </div>
    </main>
  );
}
