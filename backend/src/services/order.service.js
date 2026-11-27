import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import AppError from "../utils/app-error.js";
import { calculateCouponDiscount } from "./coupon.service.js";

const orderInclude = {
  items: true,
  addresses: true,
  payments: { orderBy: { createdAt: "desc" } },
  shipments: { orderBy: { createdAt: "desc" } },
};

function copyAddress(address, type) {
  return {
    type,
    firstName: address.firstName,
    lastName: address.lastName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    countryCode: address.countryCode,
  };
}

async function checkout(user, data) {
  return prisma.$transaction(
    async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId: user.id },
        include: {
          items: { include: { laptop: true } },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new AppError(400, "Your cart is empty.");
      }

      const shippingAddress = await tx.userAddress.findFirst({
        where: { id: data.shippingAddressId, userId: user.id },
      });
      if (!shippingAddress) throw new AppError(400, "A valid shipping address is required.");

      let billingAddress = shippingAddress;
      if (data.billingAddressId) {
        billingAddress = await tx.userAddress.findFirst({
          where: { id: data.billingAddressId, userId: user.id },
        });
        if (!billingAddress) throw new AppError(400, "Billing address is invalid.");
      }

      const currency = cart.items[0].laptop.currency;
      let subtotal = new Prisma.Decimal(0);
      for (const item of cart.items) {
        if (item.laptop.currency !== currency) {
          throw new AppError(409, "All items in a cart must use the same currency.");
        }
        if (item.laptop.status !== "ACTIVE") {
          throw new AppError(409, `${item.laptop.title} is no longer available.`);
        }
        if (item.quantity > item.laptop.stockQuantity) {
          throw new AppError(409, `Insufficient stock for ${item.laptop.title}.`);
        }
        subtotal = subtotal.plus(item.laptop.price.mul(item.quantity));
      }
      subtotal = subtotal.toDecimalPlaces(2);
      const { coupon, discountAmount } = await calculateCouponDiscount(
        tx,
        user.id,
        data.couponCode,
        subtotal,
      );
      const totalAmount = subtotal.minus(discountAmount).toDecimalPlaces(2);
      const isFullyDiscounted = totalAmount.isZero();
      const paymentExpiresAt = !isFullyDiscounted && data.paymentMethod !== "CASH_ON_DELIVERY"
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null;

      const order = await tx.order.create({
        data: {
          orderNumber: `ZOH-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`,
          paymentExpiresAt,
          ...(isFullyDiscounted
            ? { status: "CONFIRMED", paymentStatus: "SUCCEEDED" }
            : {}),
          customerEmail: user.email,
          customerPhone: shippingAddress.phone,
          subtotal,
          shippingAmount: 0,
          discountAmount,
          taxAmount: 0,
          totalAmount,
          currency,
          userId: user.id,
          items: {
            create: cart.items.map(({ laptop, quantity }) => ({
              productTitle: laptop.title,
              productSku: laptop.sku,
              unitPrice: laptop.price,
              quantity,
              refurbishmentGrade: laptop.refurbishmentGrade,
              laptopId: laptop.id,
            })),
          },
          addresses: {
            create: [
              copyAddress(shippingAddress, "SHIPPING"),
              copyAddress(billingAddress, "BILLING"),
            ],
          },
          payments: {
            create: {
              method: isFullyDiscounted
                ? "OTHER"
                : data.paymentMethod,
              provider: isFullyDiscounted
                ? "discount"
                : data.paymentMethod === "CASH_ON_DELIVERY" ? "manual" : "razorpay",
              amount: totalAmount,
              currency,
              status: isFullyDiscounted ? "SUCCEEDED" : "PENDING",
              ...(isFullyDiscounted ? { paidAt: new Date() } : {}),
            },
          },
        },
        include: orderInclude,
      });
      if (coupon) {
        await tx.couponRedemption.create({
          data: {
            couponId: coupon.id,
            userId: user.id,
            orderId: order.id,
            discountAmount,
          },
        });
      }

      for (const item of cart.items) {
        const result = await tx.laptop.updateMany({
          where: {
            id: item.laptopId,
            status: "ACTIVE",
            stockQuantity: { gte: item.quantity },
          },
          data: {
            stockQuantity: { decrement: item.quantity },
            ...(item.laptop.stockQuantity === item.quantity ? { status: "OUT_OF_STOCK" } : {}),
          },
        });
        if (result.count !== 1) {
          throw new AppError(409, `Stock changed while checking out ${item.laptop.title}.`);
        }
        await tx.inventoryMovement.create({
          data: {
            laptopId: item.laptopId,
            orderId: order.id,
            type: "SALE",
            quantityChange: -item.quantity,
            previousStock: item.laptop.stockQuantity,
            newStock: item.laptop.stockQuantity - item.quantity,
            reason: `Stock reserved for order ${order.orderNumber}`,
          },
        });
      }

      await tx.checkoutSession.create({
        data: {
          userId: user.id,
          cartId: cart.id,
          orderId: order.id,
          status: "COMPLETED",
        },
      });
      await tx.cart.update({
        where: { id: cart.id },
        data: { status: "ACTIVE", items: { deleteMany: {} } },
      });

      return order;
    },
    { isolationLevel: "Serializable" },
  );
}

async function listOrders(userId, isAdmin, query = {}) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 20);
  const where = {
    ...(isAdmin ? {} : { userId }),
    ...(query.status ? { status: query.status } : {}),
    ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { orderNumber: { contains: query.search, mode: "insensitive" } },
            { customerEmail: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: {
        ...orderInclude,
        ...(isAdmin
          ? {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  return { items, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } };
}

async function listAdminOrders(query) {
  return listOrders(null, true, query);
}

async function getOrder(userId, isAdmin, id) {
  const order = await prisma.order.findFirst({
    where: isAdmin ? { id } : { id, userId },
    include: orderInclude,
  });
  if (!order) throw new AppError(404, "Order not found.");
  return order;
}

async function cancelOrder(
  userId,
  id,
  isAdmin = false,
  adminId = userId,
  allowPaymentProcessing = false,
) {
  const cancellablePaymentStatuses = allowPaymentProcessing
    ? ["PENDING", "PROCESSING", "FAILED", "CANCELLED"]
    : ["PENDING", "FAILED", "CANCELLED"];
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: isAdmin ? { id } : { id, userId },
      include: { items: true },
    });
    if (!order) throw new AppError(404, "Order not found.");
    if (
      !["PENDING", "PAYMENT_PROCESSING"].includes(order.status) ||
      !cancellablePaymentStatuses.includes(order.paymentStatus)
    ) {
      throw new AppError(409, "This order can no longer be cancelled.");
    }

    const cancelled = await tx.order.updateMany({
      where: {
        id,
        status: { in: ["PENDING", "PAYMENT_PROCESSING"] },
        paymentStatus: { in: cancellablePaymentStatuses },
        ...(isAdmin ? {} : { userId }),
      },
      data: { status: "CANCELLED", paymentStatus: "CANCELLED", paymentExpiresAt: null },
    });
    if (!cancelled.count) {
      throw new AppError(409, "Order changed while cancelling. Refresh and retry.");
    }

    for (const item of order.items) {
      if (item.laptopId) {
        const laptop = await tx.laptop.findUnique({
          where: { id: item.laptopId },
          select: { status: true, stockQuantity: true },
        });
        if (!laptop) continue;
        const restored = await tx.laptop.update({
          where: { id: item.laptopId },
          data: {
            stockQuantity: { increment: item.quantity },
            ...(laptop.status === "OUT_OF_STOCK" ? { status: "ACTIVE" } : {}),
          },
          select: { stockQuantity: true },
        });
        await tx.inventoryMovement.create({
          data: {
            laptopId: item.laptopId,
            orderId: order.id,
            adminId: isAdmin ? adminId : null,
            type: "CANCELLATION",
            quantityChange: item.quantity,
            previousStock: laptop.stockQuantity,
            newStock: restored.stockQuantity,
            reason: `Stock restored for cancelled order ${order.orderNumber}`,
          },
        });
      }
    }

    await tx.payment.updateMany({
      where: { orderId: id, status: { in: ["PENDING", "PROCESSING"] } },
      data: { status: "CANCELLED" },
    });
    await tx.couponRedemption.updateMany({
      where: { orderId: id, status: "APPLIED" },
      data: { status: "CANCELLED" },
    });

    return tx.order.findUnique({ where: { id }, include: orderInclude });
  }, { isolationLevel: "Serializable" });
}

async function expirePendingPayments(now = new Date()) {
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: { in: ["PENDING", "PAYMENT_PROCESSING"] },
      paymentStatus: { in: ["PENDING", "PROCESSING", "FAILED", "CANCELLED"] },
      paymentExpiresAt: { lte: now },
    },
    select: { id: true, userId: true },
    orderBy: { paymentExpiresAt: "asc" },
    take: 25,
  });

  let expired = 0;
  for (const order of expiredOrders) {
    try {
      await cancelOrder(order.userId, order.id, false, order.userId, true);
      expired += 1;
    } catch (error) {
      if (
        (error instanceof AppError && error.statusCode === 409) ||
        error?.code === "P2034"
      ) {
        console.info(`Skipped concurrent payment expiry for order ${order.id}.`);
        continue;
      }
      throw error;
    }
  }
  return { checked: expiredOrders.length, expired };
}

async function updateOrderStatus(id, status) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id } });
    if (!order) throw new AppError(404, "Order not found.");
    if (order.status === status) return tx.order.findUnique({ where: { id }, include: orderInclude });

    const allowedTransitions = {
      PENDING: ["PAYMENT_PROCESSING", "CONFIRMED", "PROCESSING"],
      PAYMENT_PROCESSING: ["CONFIRMED"],
      CONFIRMED: ["PROCESSING"],
      PROCESSING: ["SHIPPED"],
      SHIPPED: ["DELIVERED"],
      DELIVERED: [],
      CANCELLED: [],
    };
    if (!allowedTransitions[order.status].includes(status)) {
      throw new AppError(409, `Order cannot transition from ${order.status} to ${status}.`);
    }
    if (
      ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(status) &&
      order.paymentStatus !== "SUCCEEDED"
    ) {
      const hasCashOnDelivery = await tx.payment.findFirst({
        where: { orderId: id, method: "CASH_ON_DELIVERY" },
        select: { id: true },
      });
      if (!hasCashOnDelivery) {
        throw new AppError(409, "Payment must be confirmed before fulfilling this order.");
      }
    }
    const result = await tx.order.updateMany({
      where: { id, status: order.status, paymentStatus: order.paymentStatus },
      data: { status },
    });
    if (!result.count) throw new AppError(409, "Order changed concurrently. Refresh and retry.");
    return tx.order.findUnique({ where: { id }, include: orderInclude });
  }, { isolationLevel: "Serializable" });
}

async function updatePaymentStatus(id, status, failureReason) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id } });
    if (!payment) throw new AppError(404, "Payment not found.");
    if (payment.provider === "razorpay") {
      throw new AppError(409, "Razorpay payments must be reconciled through verified provider callbacks.");
    }
    const order = await tx.order.findUnique({ where: { id: payment.orderId } });
    if (!order) throw new AppError(404, "Order not found.");
    if (payment.status === status) {
      return payment;
    }

    const allowedTransitions = {
      PENDING: ["PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED"],
      PROCESSING: ["SUCCEEDED", "FAILED", "CANCELLED"],
      SUCCEEDED: ["PARTIALLY_REFUNDED", "REFUNDED"],
      PARTIALLY_REFUNDED: ["REFUNDED"],
      FAILED: [],
      CANCELLED: [],
      REFUNDED: [],
    };
    if (!allowedTransitions[payment.status].includes(status)) {
      throw new AppError(409, `Payment cannot transition from ${payment.status} to ${status}.`);
    }
    if (order.status === "CANCELLED" && status === "SUCCEEDED") {
      throw new AppError(409, "A cancelled order cannot receive a successful payment.");
    }
    const paidAt = status === "SUCCEEDED" ? new Date() : undefined;
    const updated = await tx.payment.update({
      where: { id },
      data: { status, failureReason, ...(paidAt ? { paidAt } : {}) },
    });
    const payments = await tx.payment.findMany({ where: { orderId: payment.orderId } });
    const orderPaymentStatus = payments.some((entry) => entry.status === "SUCCEEDED")
      ? "SUCCEEDED"
      : payments.some((entry) => entry.status === "PARTIALLY_REFUNDED")
        ? "PARTIALLY_REFUNDED"
        : payments.some((entry) => entry.status === "REFUNDED")
          ? "REFUNDED"
          : payments.every((entry) => ["FAILED", "CANCELLED"].includes(entry.status))
            ? payments.every((entry) => entry.status === "CANCELLED")
              ? "CANCELLED"
              : "FAILED"
            : payments.some((entry) => entry.status === "PROCESSING")
              ? "PROCESSING"
              : "PENDING";
    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: orderPaymentStatus,
        ...(orderPaymentStatus === "SUCCEEDED" ? { paymentExpiresAt: null } : {}),
        ...(orderPaymentStatus === "SUCCEEDED" &&
          ["PENDING", "PAYMENT_PROCESSING"].includes(order.status)
          ? { status: "CONFIRMED" }
          : {}),
      },
    });
    return updated;
  }, { isolationLevel: "Serializable" });
}

async function createShipment(orderId, data) {
  if (data.status && !["PENDING", "LABEL_CREATED"].includes(data.status)) {
    throw new AppError(400, "A shipment must start as pending or label-created.");
  }
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { payments: { select: { method: true } } },
    });
    if (!order) throw new AppError(404, "Order not found.");
    if (!["PROCESSING", "SHIPPED"].includes(order.status)) {
      throw new AppError(409, "A shipment can only be created for an order in fulfillment.");
    }
    if (
      order.paymentStatus !== "SUCCEEDED" &&
      !order.payments.some((payment) => payment.method === "CASH_ON_DELIVERY")
    ) {
      throw new AppError(409, "Payment must be confirmed before shipping this order.");
    }
    return tx.shipment.create({ data: { ...data, orderId } });
  }, { isolationLevel: "Serializable" });
}

async function updateShipment(id, data) {
  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUnique({
      where: { id },
      include: { order: { select: { id: true, status: true, paymentStatus: true } } },
    });
    if (!shipment) throw new AppError(404, "Shipment not found.");
    if (
      ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(data.status) &&
      shipment.order.status !== "PROCESSING" &&
      shipment.order.status !== "SHIPPED"
    ) {
      throw new AppError(409, "The order must be in fulfillment before shipment can progress.");
    }
    if (
      ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(data.status) &&
      shipment.order.paymentStatus !== "SUCCEEDED"
    ) {
      const cashOnDelivery = await tx.payment.findFirst({
        where: { orderId: shipment.order.id, method: "CASH_ON_DELIVERY" },
        select: { id: true },
      });
      if (!cashOnDelivery) {
        throw new AppError(409, "Payment must be confirmed before shipping this order.");
      }
    }
    if (data.status && data.status !== shipment.status) {
      const allowedTransitions = {
        PENDING: ["LABEL_CREATED", "CANCELLED"],
        LABEL_CREATED: ["IN_TRANSIT", "CANCELLED", "FAILED"],
        IN_TRANSIT: ["OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"],
        OUT_FOR_DELIVERY: ["DELIVERED", "FAILED", "RETURNED"],
        DELIVERED: [],
        FAILED: ["IN_TRANSIT", "CANCELLED"],
        RETURNED: [],
        CANCELLED: [],
      };
      if (!allowedTransitions[shipment.status].includes(data.status)) {
        throw new AppError(409, `Shipment cannot transition from ${shipment.status} to ${data.status}.`);
      }
    }
    const timestamps = {};
    if (data.status === "IN_TRANSIT" && !shipment.shippedAt) timestamps.shippedAt = new Date();
    if (data.status === "DELIVERED" && !shipment.deliveredAt) timestamps.deliveredAt = new Date();
    const updated = await tx.shipment.update({
      where: { id },
      data: { ...data, ...timestamps },
    });

    if (data.status === "IN_TRANSIT" || data.status === "OUT_FOR_DELIVERY") {
      await tx.order.updateMany({
        where: { id: shipment.order.id, status: { in: ["PROCESSING", "SHIPPED"] } },
        data: { status: "SHIPPED" },
      });
    } else if (data.status === "DELIVERED") {
      const remaining = await tx.shipment.count({
        where: { orderId: shipment.order.id, status: { not: "DELIVERED" } },
      });
      if (remaining === 0) {
        await tx.order.updateMany({
          where: { id: shipment.order.id, status: "SHIPPED" },
          data: { status: "DELIVERED" },
        });
      }
    }
    return updated;
  }, { isolationLevel: "Serializable" });
}

export {
  checkout,
  listOrders,
  listAdminOrders,
  getOrder,
  cancelOrder,
  updateOrderStatus,
  updatePaymentStatus,
  expirePendingPayments,
  createShipment,
  updateShipment,
};
