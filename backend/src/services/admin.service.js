import prisma from "../config/prisma.js";
import AppError from "../utils/app-error.js";

const adminProductInclude = {
  categories: true,
  images: { orderBy: { sortOrder: "asc" } },
  _count: { select: { cartItems: true, orderItems: true } },
};

async function listUsers(query) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 20);
  const where = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } };
}

function buildProductWhere(query) {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.grade ? { refurbishmentGrade: query.grade } : {}),
    ...(query.brand ? { brand: { equals: query.brand, mode: "insensitive" } } : {}),
    ...(query.category ? { categories: { some: { slug: query.category } } } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? {
          price: {
            ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
            ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: "insensitive" } },
            { sku: { contains: query.search, mode: "insensitive" } },
            { brand: { contains: query.search, mode: "insensitive" } },
            { model: { contains: query.search, mode: "insensitive" } },
            { processor: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  if (query.stock === "out_of_stock") where.stockQuantity = 0;
  if (query.stock === "in_stock") where.stockQuantity = { gt: 0 };
  if (query.stock === "low_stock") {
    where.stockQuantity = { gt: 0, lte: query.lowStockThreshold };
  }
  return where;
}

async function listProducts(query) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 20);
  const orderBy = query.sort === "price_asc"
    ? [{ price: "asc" }, { id: "asc" }]
    : query.sort === "price_desc"
      ? [{ price: "desc" }, { id: "asc" }]
      : query.sort === "stock_asc"
        ? [{ stockQuantity: "asc" }, { id: "asc" }]
        : query.sort === "stock_desc"
          ? [{ stockQuantity: "desc" }, { id: "asc" }]
          : [{ createdAt: "desc" }, { id: "desc" }];
  const where = buildProductWhere(query);
  const [items, total] = await prisma.$transaction([
    prisma.laptop.findMany({
      where,
      include: adminProductInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.laptop.count({ where }),
  ]);

  return {
    items: items.map((product) => ({
      ...product,
      inventory: {
        stockQuantity: product.stockQuantity,
        availability: product.stockQuantity === 0
          ? "OUT_OF_STOCK"
          : product.stockQuantity <= query.lowStockThreshold
            ? "LOW_STOCK"
            : "IN_STOCK",
      },
    })),
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
    filters: { lowStockThreshold: query.lowStockThreshold },
  };
}

async function getProduct(id) {
  const product = await prisma.laptop.findUnique({
    where: { id },
    include: {
      ...adminProductInclude,
      inventoryMovements: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          admin: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          order: { select: { id: true, orderNumber: true } },
        },
      },
    },
  });
  if (!product) throw new AppError(404, "Laptop not found.");
  return {
    ...product,
    inventory: {
      stockQuantity: product.stockQuantity,
      recentMovements: product.inventoryMovements,
    },
  };
}

async function adjustInventory(adminId, laptopId, { quantityChange, type, reason }) {
  return prisma.$transaction(async (tx) => {
    const laptop = await tx.laptop.findUnique({
      where: { id: laptopId },
      select: { id: true, status: true, stockQuantity: true },
    });
    if (!laptop) throw new AppError(404, "Laptop not found.");
    if (laptop.status === "ARCHIVED") {
      throw new AppError(409, "Archived products cannot have inventory adjusted.");
    }

    const nextStock = laptop.stockQuantity + quantityChange;
    if (!Number.isSafeInteger(nextStock) || nextStock < 0 || nextStock > 2147483647) {
      throw new AppError(409, "The stock adjustment would result in an invalid inventory quantity.");
    }

    const updated = await tx.laptop.updateMany({
      where: {
        id: laptopId,
        stockQuantity: laptop.stockQuantity,
        status: { not: "ARCHIVED" },
      },
      data: {
        stockQuantity: nextStock,
        ...(nextStock === 0 && laptop.status === "ACTIVE" ? { status: "OUT_OF_STOCK" } : {}),
        ...(nextStock > 0 && laptop.status === "OUT_OF_STOCK" ? { status: "ACTIVE" } : {}),
      },
    });
    if (!updated.count) {
      throw new AppError(409, "Inventory changed concurrently. Refresh and retry.");
    }

    const movement = await tx.inventoryMovement.create({
      data: {
        laptopId,
        adminId,
        type,
        quantityChange,
        previousStock: laptop.stockQuantity,
        newStock: nextStock,
        reason,
      },
      include: {
        admin: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const product = await tx.laptop.findUnique({
      where: { id: laptopId },
      include: adminProductInclude,
    });
    return { product, movement };
  }, { isolationLevel: "Serializable" });
}

async function listInventoryMovements(laptopId, query) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 20);
  const exists = await prisma.laptop.findUnique({ where: { id: laptopId }, select: { id: true } });
  if (!exists) throw new AppError(404, "Laptop not found.");
  const where = { laptopId };
  const [items, total] = await prisma.$transaction([
    prisma.inventoryMovement.findMany({
      where,
      include: {
        admin: { select: { id: true, firstName: true, lastName: true, email: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inventoryMovement.count({ where }),
  ]);
  return { items, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } };
}

async function getDashboard(lowStockThreshold) {
  const [
    products,
    lowStockProducts,
    outOfStockProducts,
    pendingOrders,
    totalOrders,
    revenue,
    recentOrders,
  ] =
    await Promise.all([
      prisma.laptop.count({ where: { status: { not: "ARCHIVED" } } }),
      prisma.laptop.count({
        where: { status: { not: "ARCHIVED" }, stockQuantity: { gt: 0, lte: lowStockThreshold } },
      }),
      prisma.laptop.count({ where: { status: { not: "ARCHIVED" }, stockQuantity: 0 } }),
      prisma.order.count({
        where: { status: { in: ["PENDING", "PAYMENT_PROCESSING"] } },
      }),
      prisma.order.count(),
      prisma.order.groupBy({
        by: ["currency"],
        where: { paymentStatus: "SUCCEEDED" },
        _sum: { totalAmount: true },
      }),
      prisma.order.findMany({
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          customerEmail: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  return {
    products: { total: products, lowStock: lowStockProducts, outOfStock: outOfStockProducts },
    orders: { total: totalOrders, pending: pendingOrders },
    paidRevenueByCurrency: revenue.map(({ currency, _sum }) => ({
      currency,
      amount: _sum.totalAmount || 0,
    })),
    recentOrders,
    lowStockThreshold,
  };
}

async function updateUser(actorId, userId, data) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });
    if (!user) throw new AppError(404, "User not found.");

    const removesActiveAdminAccess =
      user.role === "ADMIN" &&
      user.status === "ACTIVE" &&
      ((data.role && data.role !== "ADMIN") || data.status === "DISABLED");

    if (removesActiveAdminAccess) {
      const activeAdmins = await tx.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
      if (activeAdmins <= 1) {
        throw new AppError(409, "The last active administrator cannot be demoted or disabled.");
      }
    }

    if (userId === actorId && data.status === "DISABLED") {
      throw new AppError(409, "You cannot disable your own account.");
    }

    return tx.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
  }, { isolationLevel: "Serializable" });
}

export {
  listUsers,
  listProducts,
  getProduct,
  adjustInventory,
  listInventoryMovements,
  getDashboard,
  updateUser,
};
