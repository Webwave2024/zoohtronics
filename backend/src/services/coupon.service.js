import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import AppError from "../utils/app-error.js";

async function calculateCouponDiscount(tx, userId, code, subtotal) {
  if (!code) return { coupon: null, discountAmount: new Prisma.Decimal(0) };

  const coupon = await tx.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
  const now = new Date();
  if (
    !coupon ||
    !coupon.active ||
    (coupon.startsAt && coupon.startsAt > now) ||
    (coupon.expiresAt && coupon.expiresAt < now)
  ) {
    throw new AppError(400, "This coupon is invalid or expired.");
  }
  if (subtotal.lessThan(coupon.minimumOrderAmount)) {
    throw new AppError(400, "The order does not meet this coupon's minimum spend.");
  }

  const [totalRedemptions, userRedemptions] = await Promise.all([
    tx.couponRedemption.count({ where: { couponId: coupon.id, status: "APPLIED" } }),
    tx.couponRedemption.count({
      where: { couponId: coupon.id, userId, status: "APPLIED" },
    }),
  ]);
  if (coupon.usageLimit !== null && totalRedemptions >= coupon.usageLimit) {
    throw new AppError(409, "This coupon has reached its usage limit.");
  }
  if (userRedemptions >= coupon.perUserUsageLimit) {
    throw new AppError(409, "You have already used this coupon the maximum number of times.");
  }

  let discountAmount = coupon.type === "PERCENTAGE"
    ? subtotal.mul(coupon.amount).div(100)
    : coupon.amount;
  if (coupon.maximumDiscount && discountAmount.greaterThan(coupon.maximumDiscount)) {
    discountAmount = coupon.maximumDiscount;
  }
  if (discountAmount.greaterThan(subtotal)) discountAmount = subtotal;

  return {
    coupon,
    discountAmount: discountAmount.toDecimalPlaces(2),
  };
}

async function previewCoupon(userId, code) {
  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: { items: { include: { laptop: { select: { price: true, currency: true } } } } },
    });
    if (!cart || cart.items.length === 0) throw new AppError(400, "Your cart is empty.");
    const currency = cart.items[0].laptop.currency;
    if (cart.items.some((item) => item.laptop.currency !== currency)) {
      throw new AppError(409, "All items in a cart must use the same currency.");
    }
    const subtotal = cart.items.reduce(
      (sum, item) => sum.plus(item.laptop.price.mul(item.quantity)),
      new Prisma.Decimal(0),
    ).toDecimalPlaces(2);
    const { coupon, discountAmount } = await calculateCouponDiscount(tx, userId, code, subtotal);
    return {
      code: coupon.code,
      subtotal,
      discountAmount,
      totalAmount: subtotal.minus(discountAmount),
      currency,
    };
  }, { isolationLevel: "Serializable" });
}

async function listCoupons(query = {}) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 20);
  const [items, total] = await prisma.$transaction([
    prisma.coupon.findMany({
      include: { _count: { select: { redemptions: { where: { status: "APPLIED" } } } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.coupon.count(),
  ]);
  return { items, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } };
}

function normalizeCouponData(data) {
  const normalized = { ...data };
  if (normalized.code !== undefined) normalized.code = normalized.code.trim().toUpperCase();
  if (normalized.amount !== undefined && Number(normalized.amount) <= 0) {
    throw new AppError(400, "Coupon amount must be greater than zero.");
  }
  if (normalized.type === "PERCENTAGE" && Number(normalized.amount) > 100) {
    throw new AppError(400, "Percentage coupons cannot exceed 100%.");
  }
  if (
    normalized.minimumOrderAmount !== undefined &&
    Number(normalized.minimumOrderAmount) < 0
  ) {
    throw new AppError(400, "Minimum order amount cannot be negative.");
  }
  if (
    normalized.maximumDiscount !== undefined &&
    normalized.maximumDiscount !== null &&
    Number(normalized.maximumDiscount) <= 0
  ) {
    throw new AppError(400, "Maximum discount must be greater than zero.");
  }
  if (normalized.usageLimit !== undefined && normalized.usageLimit !== null &&
    normalized.usageLimit < 1) {
    throw new AppError(400, "Usage limit must be at least one.");
  }
  if (normalized.perUserUsageLimit !== undefined && normalized.perUserUsageLimit < 1) {
    throw new AppError(400, "Per-user usage limit must be at least one.");
  }
  if (
    normalized.startsAt &&
    normalized.expiresAt &&
    normalized.startsAt >= normalized.expiresAt
  ) {
    throw new AppError(400, "Coupon expiry must be later than its start time.");
  }
  return normalized;
}

const mutableCouponFields = [
  "code",
  "type",
  "amount",
  "minimumOrderAmount",
  "maximumDiscount",
  "startsAt",
  "expiresAt",
  "usageLimit",
  "perUserUsageLimit",
  "active",
];

function pickCouponFields(data) {
  return Object.fromEntries(
    mutableCouponFields
      .filter((field) => Object.hasOwn(data, field))
      .map((field) => [field, data[field]]),
  );
}

async function createCoupon(data) {
  return prisma.coupon.create({ data: pickCouponFields(normalizeCouponData(data)) });
}

async function updateCoupon(id, data) {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw new AppError(404, "Coupon not found.");
  const normalized = normalizeCouponData({
    ...coupon,
    ...data,
  });
  return prisma.coupon.update({
    where: { id },
    data: pickCouponFields(
      Object.fromEntries(
        Object.keys(data).map((field) => [field, normalized[field]]),
      ),
    ),
  });
}

async function deactivateCoupon(id) {
  const result = await prisma.coupon.updateMany({ where: { id }, data: { active: false } });
  if (!result.count) throw new AppError(404, "Coupon not found.");
  return prisma.coupon.findUnique({ where: { id } });
}

export {
  calculateCouponDiscount,
  previewCoupon,
  listCoupons,
  createCoupon,
  updateCoupon,
  deactivateCoupon,
};
