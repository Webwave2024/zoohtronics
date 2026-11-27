import prisma from "../config/prisma.js";
import AppError from "../utils/app-error.js";

const wishlistInclude = {
  items: {
    include: {
      laptop: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          categories: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  },
};

async function getWishlist(userId) {
  return prisma.wishlist.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: wishlistInclude,
  });
}

async function addWishlistItem(userId, laptopId) {
  const laptop = await prisma.laptop.findFirst({
    where: { id: laptopId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!laptop) throw new AppError(404, "Laptop not found or unavailable.");
  const wishlist = await prisma.wishlist.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });
  return prisma.wishlistItem.upsert({
    where: { wishlistId_laptopId: { wishlistId: wishlist.id, laptopId } },
    create: { wishlistId: wishlist.id, laptopId },
    update: {},
    include: {
      laptop: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          categories: true,
        },
      },
    },
  });
}

async function removeWishlistItem(userId, laptopId) {
  const result = await prisma.wishlistItem.deleteMany({
    where: { laptopId, wishlist: { userId } },
  });
  if (!result.count) throw new AppError(404, "Laptop is not in your wishlist.");
  return { deleted: true };
}

async function listReviews(laptopId, query) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 10);
  const laptop = await prisma.laptop.findFirst({
    where: { id: laptopId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!laptop) throw new AppError(404, "Laptop not found.");

  const where = { laptopId, status: "PUBLISHED" };
  const [items, total, summary] = await Promise.all([
    prisma.productReview.findMany({
      where,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        createdAt: true,
        user: { select: { firstName: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productReview.count({ where }),
    prisma.productReview.aggregate({
      where,
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);
  return {
    items,
    summary: { averageRating: summary._avg.rating, totalReviews: summary._count._all },
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
  };
}

async function createReview(userId, laptopId, data) {
  const laptop = await prisma.laptop.findFirst({
    where: { id: laptopId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!laptop) throw new AppError(404, "Laptop not found.");

  const purchase = await prisma.orderItem.findFirst({
    where: {
      laptopId,
      order: { userId, status: "DELIVERED" },
    },
    select: { id: true },
  });
  if (!purchase) {
    throw new AppError(403, "A delivered purchase is required before reviewing this laptop.");
  }

  return prisma.productReview.create({
    data: { ...data, userId, laptopId, status: "PENDING" },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
    },
  });
}

async function listPendingReviews(query) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 20);
  const where = { status: "PENDING" };
  const [items, total] = await prisma.$transaction([
    prisma.productReview.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        laptop: { select: { id: true, sku: true, title: true } },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productReview.count({ where }),
  ]);
  return { items, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } };
}

async function moderateReview(id, status) {
  const result = await prisma.productReview.updateMany({
    where: { id, status: "PENDING" },
    data: { status },
  });
  if (!result.count) {
    const review = await prisma.productReview.findUnique({ where: { id }, select: { id: true } });
    if (!review) throw new AppError(404, "Review not found.");
    throw new AppError(409, "Review has already been moderated.");
  }
  return prisma.productReview.findUnique({
    where: { id },
    select: { id: true, rating: true, title: true, body: true, status: true, updatedAt: true },
  });
}

export {
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  listReviews,
  createReview,
  listPendingReviews,
  moderateReview,
};
