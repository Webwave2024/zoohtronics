import { apiRequest } from "../../../shared/api/client";

const checkoutScript = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${checkoutScript}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load the payment provider.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = checkoutScript;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load the payment provider. Check your connection and try again."));
    document.body.appendChild(script);
  });
}

export async function startOnlinePayment({ order, user, navigate, onError }) {
  const sessionResult = await apiRequest(`/orders/${encodeURIComponent(order.id)}/payments/session`, {
    method: "POST",
    body: {},
  });
  const session = sessionResult.payment;
  await loadRazorpay();

  const checkout = new window.Razorpay({
    key: session.keyId,
    amount: session.amount,
    currency: session.currency,
    name: "Zohntronics",
    description: `Order ${session.orderNumber}`,
    order_id: session.razorpayOrderId,
    prefill: { name: `${user.firstName} ${user.lastName}`, email: user.email, contact: user.phone || "" },
    theme: { color: "#b5121b" },
    handler: async (response) => {
      try {
        await apiRequest(`/orders/${encodeURIComponent(order.id)}/payments/verify`, {
          method: "POST",
          body: {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          },
        });
        navigate(`/orders/${order.id}?payment=success`, { replace: true });
      } catch (error) {
        onError(`${error.message} Your order is saved; you can retry payment from its details page.`);
        navigate(`/orders/${order.id}?payment=verify-failed`, { replace: true, state: { paymentError: error.message } });
      }
    },
    modal: {
      ondismiss: () => navigate(`/orders/${order.id}`, { replace: true }),
    },
  });
  checkout.on("payment.failed", (event) => {
    const message = event.error?.description || "Payment did not complete. Your order is still available to retry.";
    onError(message);
  });
  checkout.open();
}
