import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import AppError from "../utils/app-error.js";

const cartInclude = {
  items: {
    include: {
      laptop: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          categories: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
};
const maxCartItems = 100;

async function getOrCreateCart(userId, tx = prisma) {
  return tx.cart.upsert({
    where: { userId },
    create: { userId },
    update: { status: "ACTIVE" },
    include: cartInclude,
  });
}

async function getCart(userId) {
  const cart = await getOrCreateCart(userId);
  const currency = cart.items[0]?.laptop.currency || null;
  const hasMixedCurrencies = cart.items.some((item) => item.laptop.currency !== currency);
  const subtotal = hasMixedCurrencies
    ? null
    : cart.items.reduce(
      (sum, item) => sum.plus(item.laptop.price.mul(item.quantity)),
      new Prisma.Decimal(0),
    ).toDecimalPlaces(2);
  return {
    ...cart,
    subtotal,
    currency: hasMixedCurrencies ? null : currency,
    hasMixedCurrencies,
  };
}

async function addItem(userId, laptopId, quantity) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.laptop.findFirst({
      where: { id: laptopId, status: "ACTIVE", stockQuantity: { gt: 0 } },
      select: { id: true, stockQuantity: true, currency: true },
    });
    if (!product) throw new AppError(404, "Laptop not found or unavailable.");
    const cart = await getOrCreateCart(userId, tx);
    if (cart.items.some((item) => item.laptop.currency !== product.currency)) {
      throw new AppError(409, "All items in a cart must use the same currency.");
    }
    const current = await tx.cartItem.findUnique({
      where: { cartId_laptopId: { cartId: cart.id, laptopId } },
    });
    if (!current && cart.items.length >= maxCartItems) {
      throw new AppError(409, `A cart can contain at most ${maxCartItems} different products.`);
    }
    if ((current?.quantity || 0) + quantity > product.stockQuantity) {
      throw new AppError(409, "Requested quantity exceeds available stock.");
    }

    return tx.cartItem.upsert({
      where: { cartId_laptopId: { cartId: cart.id, laptopId } },
      create: { cartId: cart.id, laptopId, quantity },
      update: { quantity: { increment: quantity } },
      include: { laptop: true },
    });
  });
}

async function updateItem(userId, itemId, quantity) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
      include: { laptop: true },
    });
    if (!item) throw new AppError(404, "Cart item not found.");
    if (
      item.laptop.status !== "ACTIVE" ||
      quantity > item.laptop.stockQuantity
    ) {
      throw new AppError(409, "Requested quantity exceeds available stock or product is unavailable.");
    }

    return tx.cartItem.update({ where: { id: itemId }, data: { quantity } });
  });
}

async function removeItem(userId, itemId) {
  const result = await prisma.cartItem.deleteMany({
    where: { id: itemId, cart: { userId } },
  });
  if (!result.count) throw new AppError(404, "Cart item not found.");
  return { deleted: true };
}

async function clearCart(userId) {
  const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
  if (!cart) return { deleted: 0 };
  const result = await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return { deleted: result.count };
}

export { getOrCreateCart, getCart, addItem, updateItem, removeItem, clearCart };
