import express from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import * as orderController from "../controllers/order.controller.js";
import { authenticate, requireAdmin } from "../middleware/authenticate.js";
import validate from "../middleware/validate.js";
import asyncHandler from "../utils/async-handler.js";
import { emptyBody, pageQuery, paramsWithId } from "../validation/schemas.js";

const router = express.Router();
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many checkout attempts. Try again later." },
});
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many payment attempts. Try again later." },
});
const paymentMethods = ["CARD", "UPI", "NET_BANKING", "WALLET", "CASH_ON_DELIVERY"];
const orderStatuses = [
  "PENDING",
  "PAYMENT_PROCESSING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];
const paymentStatuses = [
  "PENDING",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
];
const shipmentStatuses = [
  "PENDING",
  "LABEL_CREATED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "RETURNED",
  "CANCELLED",
];

router.use(authenticate);
router.post(
  "/checkout",
  checkoutLimiter,
  validate(z.object({
    body: z.object({
      shippingAddressId: z.string().min(1),
      billingAddressId: z.string().min(1).optional(),
      paymentMethod: z.enum(paymentMethods),
      couponCode: z.string().trim().min(1).max(40).optional(),
    }),
    params: z.object({}),
    query: z.object({}),
  })),
  asyncHandler(orderController.checkout),
);
router.post(
  "/:id/payments/session",
  paymentLimiter,
  validate(z.object({
    body: emptyBody,
    params: paramsWithId,
    query: z.object({}),
  })),
  asyncHandler(orderController.createRazorpayPaymentSession),
);
router.post(
  "/:id/payments/verify",
  paymentLimiter,
  validate(z.object({
    body: z.object({
      razorpay_order_id: z.string().min(1).max(100),
      razorpay_payment_id: z.string().min(1).max(100),
      razorpay_signature: z.string().regex(/^[a-fA-F0-9]{64}$/),
    }),
    params: paramsWithId,
    query: z.object({}),
  })),
  asyncHandler(orderController.verifyRazorpayPayment),
);
router.get(
  "/",
  validate(z.object({ body: emptyBody, params: z.object({}), query: pageQuery })),
  asyncHandler(orderController.listOrders),
);
router.get("/:id", validate(z.object({
  body: emptyBody,
  params: paramsWithId,
  query: z.object({}),
})), asyncHandler(orderController.getOrder));
router.post(
  "/:id/cancel",
  validate(z.object({ body: emptyBody, params: paramsWithId, query: z.object({}) })),
  asyncHandler(orderController.cancelOrder),
);

router.patch(
  "/admin/:id/status",
  requireAdmin,
  validate(z.object({
    body: z.object({ status: z.enum(orderStatuses) }),
    params: paramsWithId,
    query: z.object({}),
  })),
  asyncHandler(orderController.updateOrderStatus),
);
router.post(
  "/admin/:id/cancel",
  requireAdmin,
  validate(z.object({ body: emptyBody, params: paramsWithId, query: z.object({}) })),
  asyncHandler(orderController.cancelAdminOrder),
);
router.patch(
  "/admin/payments/:paymentId/status",
  requireAdmin,
  validate(z.object({
    body: z.object({
      status: z.enum(paymentStatuses),
      failureReason: z.string().max(2000).optional(),
    }),
    params: z.object({ paymentId: z.string().min(1) }),
    query: z.object({}),
  })),
  asyncHandler(orderController.updatePaymentStatus),
);
router.post(
  "/admin/:orderId/shipments",
  requireAdmin,
  validate(z.object({
    body: z.object({
      status: z.enum(shipmentStatuses).optional(),
      carrier: z.string().max(100).optional(),
      trackingNumber: z.string().max(200).optional(),
      trackingUrl: z.string().url().max(2048).optional(),
    }),
    params: z.object({ orderId: z.string().min(1) }),
    query: z.object({}),
  })),
  asyncHandler(orderController.createShipment),
);
router.patch(
  "/admin/shipments/:shipmentId",
  requireAdmin,
  validate(z.object({
    body: z.object({
      status: z.enum(shipmentStatuses).optional(),
      carrier: z.string().max(100).nullable().optional(),
      trackingNumber: z.string().max(200).nullable().optional(),
      trackingUrl: z.string().url().max(2048).nullable().optional(),
    }).refine((body) => Object.keys(body).length > 0, {
      message: "At least one shipment field is required.",
    }),
    params: z.object({ shipmentId: z.string().min(1) }),
    query: z.object({}),
  })),
  asyncHandler(orderController.updateShipment),
);

export default router;
