import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import prisma from "../config/prisma.js";
import AppError from "../utils/app-error.js";

let razorpayClient;
let initializedKeyId;
let initializedKeySecret;

function getRazorpayConfig() {
  const { RAZORPAY_KEY_ID: keyId, RAZORPAY_KEY_SECRET: keySecret } = process.env;
  if (!keyId || !keySecret) {
    throw new AppError(
      503,
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    );
  }
  if (
    !razorpayClient ||
    keyId !== initializedKeyId ||
    keySecret !== initializedKeySecret
  ) {
    razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
    initializedKeyId = keyId;
    initializedKeySecret = keySecret;
  }
  return { client: razorpayClient, keyId, keySecret };
}
function amountInMinorUnits(amount, currency) {
  let fractionDigits;
  try {
    fractionDigits = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits;
  } catch {
    throw new AppError(400, "Order currency is not a valid ISO currency code.");
  }
  const minorAmount = amount.mul(10 ** fractionDigits);
  const value = Number(minorAmount.toFixed(0));
  if (!minorAmount.isInteger() || !Number.isSafeInteger(value) || value < 1) {
    throw new AppError(400, "Order amount cannot be represented by Razorpay.");
  }
  return value;
}

function calculateOrderPaymentStatus(payments) {
  if (payments.some((payment) => payment.status === "SUCCEEDED")) return "SUCCEEDED";
  if (payments.some((payment) => payment.status === "PARTIALLY_REFUNDED")) {
    return "PARTIALLY_REFUNDED";
  }
  if (payments.some((payment) => payment.status === "REFUNDED")) return "REFUNDED";
  if (payments.some((payment) => payment.status === "PROCESSING")) return "PROCESSING";
  if (payments.some((payment) => payment.status === "PENDING")) return "PENDING";
  if (payments.length && payments.every((payment) => payment.status === "CANCELLED")) {
    return "CANCELLED";
  }
  return "FAILED";
}

function safeCompareHex(expected, actual) {
  if (typeof actual !== "string" || !/^[a-fA-F0-9]{64}$/.test(actual)) return false;
  const expectedBytes = Buffer.from(expected, "hex");
  const actualBytes = Buffer.from(actual, "hex");
  return expectedBytes.length === actualBytes.length &&
    timingSafeEqual(expectedBytes, actualBytes);
}

async function createPaymentSession(userId, orderId) {
  const { client, keyId } = getRazorpayConfig();
  const { order, payment } = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, userId },
      include: { payments: { orderBy: { createdAt: "desc" } } },
    });
    if (!order) throw new AppError(404, "Order not found.");
    if (order.paymentExpiresAt && order.paymentExpiresAt <= new Date()) {
      throw new AppError(409, "The payment window for this order has expired.");
    }
    if (!["PENDING", "PAYMENT_PROCESSING"].includes(order.status)) {
      throw new AppError(409, "This order is not awaiting payment.");
    }
    if (order.paymentStatus === "SUCCEEDED") {
      throw new AppError(409, "This order has already been paid.");
    }

    let payment = order.payments.find((entry) =>
      entry.provider === "razorpay" &&
      ["PENDING", "PROCESSING"].includes(entry.status),
    );
    if (!payment) {
      const previousAttempt = order.payments.find((entry) => entry.provider === "razorpay");
      if (!previousAttempt) {
        throw new AppError(409, "This order does not have a Razorpay payment method.");
      }
      payment = await tx.payment.create({
        data: {
          orderId: order.id,
          provider: "razorpay",
          method: previousAttempt.method,
          amount: order.totalAmount,
          currency: order.currency,
          status: "PENDING",
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: "PENDING" },
      });
    }
    return { order, payment };
  }, { isolationLevel: "Serializable" });

  let razorpayOrderId = payment.providerOrderId;
  if (!razorpayOrderId) {
    const amount = amountInMinorUnits(payment.amount, payment.currency);
    let providerOrder;
    try {
      providerOrder = await client.orders.create({
        amount,
        currency: payment.currency,
        receipt: order.orderNumber,
        ...(order.paymentExpiresAt
          ? { expire_by: Math.floor(order.paymentExpiresAt.getTime() / 1000) }
          : {}),
        notes: { orderId: order.id, paymentId: payment.id },
      });
    } catch (error) {
      console.error("Razorpay order creation failed.", error.message);
      throw new AppError(502, "Could not start payment with Razorpay. Retry the request.");
    }
    const claimed = await prisma.payment.updateMany({
      where: { id: payment.id, providerOrderId: null },
      data: { providerOrderId: providerOrder.id },
    });
    const stored = await prisma.payment.findUnique({
      where: { id: payment.id },
      select: { providerOrderId: true },
    });
    if (!stored?.providerOrderId) {
      throw new AppError(409, "Payment session changed concurrently. Retry the request.");
    }
    if (!claimed.count && stored.providerOrderId !== providerOrder.id) {
      razorpayOrderId = stored.providerOrderId;
    } else {
      razorpayOrderId = providerOrder.id;
    }
  }

  return {
    paymentId: payment.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    razorpayOrderId,
    keyId,
    amount: amountInMinorUnits(payment.amount, payment.currency),
    currency: payment.currency,
  };
}

function validateProviderPayment(payment, entity) {
  if (
    !entity ||
    entity.order_id !== payment.providerOrderId ||
    entity.amount !== amountInMinorUnits(payment.amount, payment.currency) ||
    entity.currency !== payment.currency
  ) {
    throw new AppError(409, "Razorpay payment details do not match this order.");
  }
}

async function applyProviderPayment(providerOrderId, entity, targetStatus) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { provider: "razorpay", providerOrderId },
      include: { order: true },
    });
    if (!payment) throw new AppError(404, "Razorpay order was not found.");
    validateProviderPayment(payment, entity);
    if (payment.providerPaymentId && payment.providerPaymentId !== entity.id) {
      throw new AppError(409, "A different Razorpay payment is already linked to this order.");
    }

    const terminalStatuses = ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"];
    if (terminalStatuses.includes(payment.status)) {
      return {
        id: payment.id,
        status: payment.status,
        paidAt: payment.paidAt,
        refundRequired: payment.order.status === "CANCELLED" && payment.status === "SUCCEEDED",
      };
    }
    if (payment.status === "FAILED" && targetStatus !== "SUCCEEDED") {
      return { id: payment.id, status: payment.status, paidAt: payment.paidAt };
    }
    const otherSuccessfulPayment = targetStatus === "SUCCEEDED"
      ? await tx.payment.findFirst({
          where: {
            orderId: payment.orderId,
            status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] },
            id: { not: payment.id },
          },
          select: { id: true },
        })
      : null;

    const paidAt = targetStatus === "SUCCEEDED" ? new Date() : undefined;
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: targetStatus,
        providerPaymentId: entity.id,
        failureReason: targetStatus === "FAILED" ? entity.error_description || "Payment failed." : null,
        ...(paidAt ? { paidAt } : {}),
      },
    });
    const payments = await tx.payment.findMany({ where: { orderId: payment.orderId } });
    const paymentStatus = calculateOrderPaymentStatus(payments);
    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus,
        ...((payment.order.status === "CANCELLED" || otherSuccessfulPayment) &&
          paymentStatus === "SUCCEEDED"
          ? {
              notes: [
                payment.order.notes,
                payment.order.status === "CANCELLED"
                  ? "Razorpay captured payment after order cancellation; refund is required."
                  : "Multiple Razorpay payment attempts were captured; refund is required.",
              ].filter(Boolean).join("\n"),
            }
          : {}),
        ...(paymentStatus === "SUCCEEDED" ? { paymentExpiresAt: null } : {}),
        ...(paymentStatus === "SUCCEEDED" &&
          ["PENDING", "PAYMENT_PROCESSING"].includes(payment.order.status)
          ? { status: "CONFIRMED" }
          : paymentStatus === "PROCESSING" && payment.order.status === "PENDING"
            ? { status: "PAYMENT_PROCESSING" }
            : {}),
      },
    });
    return {
      id: payment.id,
      status: targetStatus,
      providerPaymentId: entity.id,
      paidAt: paidAt || payment.paidAt,
      refundRequired: (
        payment.order.status === "CANCELLED" || Boolean(otherSuccessfulPayment)
      ) && paymentStatus === "SUCCEEDED",
    };
  }, { isolationLevel: "Serializable" });
}

async function verifyPayment(userId, orderId, details) {
  const { client, keySecret } = getRazorpayConfig();
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { payments: true },
  });
  if (!order) throw new AppError(404, "Order not found.");
  if (order.paymentExpiresAt && order.paymentExpiresAt <= new Date()) {
    throw new AppError(409, "The payment window for this order has expired.");
  }
  const payment = order.payments.find((entry) =>
    entry.provider === "razorpay" &&
    entry.providerOrderId === details.razorpay_order_id,
  );
  if (!payment) throw new AppError(400, "Razorpay order does not belong to this order.");

  const expectedSignature = createHmac("sha256", keySecret)
    .update(`${details.razorpay_order_id}|${details.razorpay_payment_id}`)
    .digest("hex");
  if (!safeCompareHex(expectedSignature, details.razorpay_signature)) {
    throw new AppError(400, "Razorpay payment signature is invalid.");
  }

  let providerPayment;
  try {
    providerPayment = await client.payments.fetch(details.razorpay_payment_id);
  } catch (error) {
    console.error("Razorpay payment verification failed.", error.message);
    throw new AppError(502, "Could not verify payment with Razorpay. Retry the request.");
  }
  validateProviderPayment(payment, providerPayment);

  const statuses = {
    authorized: "PROCESSING",
    captured: "SUCCEEDED",
    failed: "FAILED",
  };
  const targetStatus = statuses[providerPayment.status];
  if (!targetStatus) {
    throw new AppError(409, "Razorpay has not completed this payment yet.");
  }
  return applyProviderPayment(details.razorpay_order_id, providerPayment, targetStatus);
}

async function handleWebhook(rawBody, signature) {
  if (!Buffer.isBuffer(rawBody)) {
    throw new AppError(400, "Razorpay webhook body must be raw JSON.");
  }
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new AppError(503, "RAZORPAY_WEBHOOK_SECRET is not configured.");
  }
  const expectedSignature = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!safeCompareHex(expectedSignature, signature)) {
    throw new AppError(400, "Razorpay webhook signature is invalid.");
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new AppError(400, "Razorpay webhook body contains invalid JSON.");
  }
  const targetStatuses = {
    "payment.authorized": "PROCESSING",
    "payment.captured": "SUCCEEDED",
    "payment.failed": "FAILED",
  };
  const targetStatus = targetStatuses[event.event];
  if (!targetStatus) return { received: true, ignored: true };

  const entity = event.payload?.payment?.entity;
  if (!entity?.order_id || !entity.id) {
    throw new AppError(400, "Razorpay webhook is missing payment details.");
  }
  await applyProviderPayment(entity.order_id, entity, targetStatus);
  return { received: true };
}

export { createPaymentSession, verifyPayment, handleWebhook };
