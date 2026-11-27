import * as orderService from "../services/order.service.js";
import * as razorpayService from "../services/razorpay.service.js";

async function checkout(req, res) {
  const order = await orderService.checkout(req.user, req.validated.body);
  return res.status(201).json({
    order,
    message: order.paymentStatus === "SUCCEEDED"
      ? "Order created with no payment due."
      : order.payments.some((payment) => payment.provider === "razorpay")
        ? "Order created. Start payment with the payment session endpoint."
        : "Order created. Cash on delivery was selected.",
  });
}

async function listOrders(req, res) {
  const isAdmin = req.user.role === "ADMIN";
  return res.json(await orderService.listOrders(req.user.id, isAdmin, req.validated.query));
}

async function listAdminOrders(req, res) {
  return res.json(await orderService.listAdminOrders(req.validated.query));
}

async function getOrder(req, res) {
  const order = await orderService.getOrder(
    req.user.id,
    req.user.role === "ADMIN",
    req.validated.params.id,
  );
  return res.json({ order });
}

async function cancelOrder(req, res) {
  const order = await orderService.cancelOrder(req.user.id, req.validated.params.id);
  return res.json({ order });
}

async function cancelAdminOrder(req, res) {
  const order = await orderService.cancelOrder(
    req.user.id,
    req.validated.params.id,
    true,
    req.user.id,
  );
  return res.json({ order });
}

async function updateOrderStatus(req, res) {
  const order = await orderService.updateOrderStatus(
    req.validated.params.id,
    req.validated.body.status,
  );
  return res.json({ order });
}

async function updatePaymentStatus(req, res) {
  const payment = await orderService.updatePaymentStatus(
    req.validated.params.paymentId,
    req.validated.body.status,
    req.validated.body.failureReason,
  );
  return res.json({ payment });
}

async function createShipment(req, res) {
  const shipment = await orderService.createShipment(
    req.validated.params.orderId,
    req.validated.body,
  );
  return res.status(201).json({ shipment });
}

async function updateShipment(req, res) {
  const shipment = await orderService.updateShipment(
    req.validated.params.shipmentId,
    req.validated.body,
  );
  return res.json({ shipment });
}

async function createRazorpayPaymentSession(req, res) {
  const session = await razorpayService.createPaymentSession(
    req.user.id,
    req.validated.params.id,
  );
  return res.status(201).json({ payment: session });
}

async function verifyRazorpayPayment(req, res) {
  const result = await razorpayService.verifyPayment(
    req.user.id,
    req.validated.params.id,
    req.validated.body,
  );
  return res.json({ payment: result });
}

async function handleRazorpayWebhook(req, res) {
  const result = await razorpayService.handleWebhook(
    req.body,
    req.get("x-razorpay-signature"),
  );
  return res.json(result);
}

export {
  checkout,
  listOrders,
  listAdminOrders,
  getOrder,
  cancelOrder,
  cancelAdminOrder,
  updateOrderStatus,
  updatePaymentStatus,
  createShipment,
  updateShipment,
  createRazorpayPaymentSession,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
};
