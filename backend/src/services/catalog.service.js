import prisma from "../config/prisma.js";
import AppError from "../utils/app-error.js";

const productInclude = {
  categories: true,
  images: { orderBy: { sortOrder: "asc" } },
};

async function listProducts(query, isAdmin = false) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 20);
  const brands = (query.brands || query.brand || "").split(",").filter(Boolean);
  const categories = (query.categories || query.category || "").split(",").filter(Boolean);
  const grades = (query.grades || query.grade || "").split(",").filter(Boolean);
  const ramValues = (query.ramGB || "").split(",").filter(Boolean).map(Number);
  const storageValues = (query.storageGB || "").split(",").filter(Boolean).map(Number);
  const processors = (query.processors || "").split(",").filter(Boolean);
  const popularity = (query.popularity || "").split(",").filter(Boolean);
  let popularityIds = [];
  if (!isAdmin && popularity.length) {
    const rankedGroups = await Promise.all([
      ...(popularity.includes("best-seller") ? [getBestSellers({ all: true })] : []),
      ...(popularity.includes("trending") ? [getTrendingProducts({ all: true })] : []),
    ]);
    popularityIds = [...new Set(rankedGroups.flatMap(({ items }) => items.map(({ id }) => id)))];
  }
  const orderBy = query.sort === "price_asc"
    ? { price: "asc" }
    : query.sort === "price_desc"
      ? { price: "desc" }
      : { createdAt: "desc" };
  const where = {
    ...(!isAdmin ? { status: "ACTIVE" } : query.status ? { status: query.status } : {}),
    ...(brands.length ? { brand: { in: brands, mode: "insensitive" } } : {}),
    ...(grades.length ? { refurbishmentGrade: { in: grades } } : {}),
    ...(query.featured !== undefined ? { featured: query.featured === "true" } : {}),
    ...(categories.length
      ? { categories: { some: { slug: { in: categories } } } }
      : {}),
    ...(ramValues.length ? { ramGB: { in: ramValues } } : {}),
    ...(storageValues.length ? { storageGB: { in: storageValues } } : {}),
    ...(processors.length ? { processor: { in: processors, mode: "insensitive" } } : {}),
    ...(popularity.length && !isAdmin ? { id: { in: popularityIds } } : {}),
    ...(query.inStock === "true" ? { stockQuantity: { gt: 0 } } : {}),
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
            { brand: { contains: query.search, mode: "insensitive" } },
            { model: { contains: query.search, mode: "insensitive" } },
            { processor: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [matchedItems, total] = await prisma.$transaction([
    prisma.laptop.findMany({
      where,
      include: productInclude,
      orderBy,
      ...(popularityIds.length ? {} : {
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    }),
    prisma.laptop.count({ where }),
  ]);

  let items = matchedItems;
  if (popularityIds.length) {
    const rank = new Map(popularityIds.map((id, index) => [id, index]));
    items = matchedItems
      .sort((left, right) => rank.get(left.id) - rank.get(right.id))
      .slice((page - 1) * pageSize, page * pageSize);
  }

  return { items, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } };
}

async function getRankedProducts({ all = false, createdAt, fallbackOrderBy }) {
  const soldItems = await prisma.orderItem.groupBy({
    by: ["laptopId"],
    where: {
      laptopId: { not: null },
      order: {
        paymentStatus: "SUCCEEDED",
        status: { not: "CANCELLED" },
        ...(createdAt ? { createdAt: { gte: createdAt } } : {}),
      },
      laptop: { status: "ACTIVE" },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    ...(all ? {} : { take: 5 }),
  });
  const hasSalesHistory = soldItems.length > 0;
  const featuredProducts = hasSalesHistory
    ? []
    : await prisma.laptop.findMany({
        where: { status: "ACTIVE", stockQuantity: { gt: 0 } },
        include: productInclude,
        orderBy: fallbackOrderBy || [{ featured: "desc" }, { createdAt: "desc" }],
        ...(all ? {} : { take: 5 }),
      });
  const laptopIds = hasSalesHistory
    ? soldItems.map((item) => item.laptopId)
    : featuredProducts.map((product) => product.id);
  if (!laptopIds.length) return { items: [], isFeaturedFallback: !hasSalesHistory };

  const [laptops, reviews] = await Promise.all([
    hasSalesHistory
      ? prisma.laptop.findMany({
          where: { id: { in: laptopIds }, status: "ACTIVE" },
          include: productInclude,
        })
      : Promise.resolve(featuredProducts),
    prisma.productReview.groupBy({
      by: ["laptopId"],
      where: { laptopId: { in: laptopIds }, status: "PUBLISHED" },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);
  const laptopById = new Map(laptops.map((laptop) => [laptop.id, laptop]));
  const reviewsByLaptopId = new Map(reviews.map((review) => [review.laptopId, review]));

  const rankedItems = hasSalesHistory
    ? soldItems.map(({ laptopId, _sum }) => [laptopId, _sum.quantity || 0])
    : laptopIds.map((laptopId) => [laptopId, 0]);
  const items = rankedItems.flatMap(([laptopId, soldCount]) => {
    const laptop = laptopById.get(laptopId);
    if (!laptop) return [];
    const review = reviewsByLaptopId.get(laptopId);
    return [{
      ...laptop,
      soldCount,
      averageRating: review?._avg.rating ?? null,
      reviewCount: review?._count._all ?? 0,
    }];
  });
  return { items, isFeaturedFallback: !hasSalesHistory };
}

async function getBestSellers(options) {
  return getRankedProducts(options);
}

async function getTrendingProducts({ all = false } = {}) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return getRankedProducts({
    all,
    createdAt: thirtyDaysAgo,
    fallbackOrderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
}

async function getProduct(id, isAdmin = false) {
  const laptop = await prisma.laptop.findFirst({
    where: { id, ...(!isAdmin ? { status: "ACTIVE" } : {}) },
    include: productInclude,
  });
  if (!laptop) throw new AppError(404, "Laptop not found.");
  return laptop;
}

async function listCategories() {
  return prisma.category.findMany({
    where: { laptops: { some: { status: "ACTIVE" } } },
    orderBy: { name: "asc" },
    include: { _count: { select: { laptops: { where: { status: "ACTIVE" } } } } },
  });
}

async function getSuggestions(search) {
  const laptops = await prisma.laptop.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { processor: { contains: search, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      brand: true,
      model: true,
      price: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true, altText: true },
      },
    },
    orderBy: { featured: "desc" },
    take: 6,
  });

  return laptops;
}

async function getFilterOptions() {
  const [
    brands,
    grades,
    categories,
    priceRange,
    ramOptions,
    storageOptions,
    processorOptions,
    b20,
    b30,
    b40,
    b50,
    bAbove,
  ] = await Promise.all([
    prisma.laptop.groupBy({
      by: ["brand"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
      orderBy: { brand: "asc" },
    }),
    prisma.laptop.groupBy({
      by: ["refurbishmentGrade"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.category.findMany({
      where: { laptops: { some: { status: "ACTIVE" } } },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { laptops: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.laptop.aggregate({
      where: { status: "ACTIVE" },
      _min: { price: true },
      _max: { price: true },
    }),
    prisma.laptop.groupBy({
      by: ["ramGB"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
      orderBy: { ramGB: "asc" },
    }),
    prisma.laptop.groupBy({
      by: ["storageGB"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
      orderBy: { storageGB: "asc" },
    }),
    prisma.laptop.groupBy({
      by: ["processor"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
      orderBy: { processor: "asc" },
      take: 50,
    }),
    prisma.laptop.count({ where: { status: "ACTIVE", price: { lte: 20000 } } }),
    prisma.laptop.count({ where: { status: "ACTIVE", price: { gt: 20000, lte: 30000 } } }),
    prisma.laptop.count({ where: { status: "ACTIVE", price: { gt: 30000, lte: 40000 } } }),
    prisma.laptop.count({ where: { status: "ACTIVE", price: { gt: 40000, lte: 50000 } } }),
    prisma.laptop.count({ where: { status: "ACTIVE", price: { gt: 50000 } } }),
  ]);

  const budgets = [
    { label: "Under 20k", minPrice: 0, maxPrice: 20000, count: b20 },
    { label: "20k - 30k", minPrice: 20000, maxPrice: 30000, count: b30 },
    { label: "30k - 40k", minPrice: 30000, maxPrice: 40000, count: b40 },
    { label: "40k - 50k", minPrice: 40000, maxPrice: 50000, count: b50 },
    { label: "Above 50k", minPrice: 50000, maxPrice: null, count: bAbove },
  ].filter((b) => b.count > 0);

  return {
    brands: brands.map(({ brand, _count }) => ({ name: brand, count: _count._all })),
    grades: grades.map(({ refurbishmentGrade, _count }) => ({
      value: refurbishmentGrade,
      count: _count._all,
    })),
    categories: categories.map(({ _count, ...category }) => ({
      ...category,
      count: _count.laptops,
    })),
    ram: ramOptions.map(({ ramGB, _count }) => ({ value: ramGB, count: _count._all })),
    storage: storageOptions.map(({ storageGB, _count }) => ({ value: storageGB, count: _count._all })),
    processors: processorOptions.map(({ processor, _count }) => ({ value: processor, count: _count._all })),
    price: { min: priceRange._min.price, max: priceRange._max.price },
    budgets,
  };
}

async function createCategory(data) {
  return prisma.category.create({ data });
}

async function updateCategory(id, data) {
  const result = await prisma.category.updateMany({ where: { id }, data });
  if (result.count === 0) throw new AppError(404, "Category not found.");
  return prisma.category.findUnique({ where: { id } });
}

async function deleteCategory(id) {
  const result = await prisma.category.deleteMany({ where: { id } });
  if (result.count === 0) throw new AppError(404, "Category not found.");
  return { deleted: true };
}

function toLaptopData(data) {
  const { categoryIds, images, ...fields } = data;
  return {
    ...fields,
    ...(categoryIds
      ? { categories: { connect: categoryIds.map((id) => ({ id })) } }
      : {}),
    ...(images
      ? { images: { create: images.map((image, sortOrder) => ({ ...image, sortOrder })) } }
      : {}),
  };
}

async function createProduct(data, adminId) {
  const stockQuantity = data.stockQuantity ?? 0;
  const status = data.status ?? "DRAFT";
  if (status === "ACTIVE" && stockQuantity === 0) {
    throw new AppError(400, "An active product must have stock. Add inventory or save it as a draft.");
  }
  if (status === "OUT_OF_STOCK" && stockQuantity > 0) {
    throw new AppError(400, "An out-of-stock product cannot have positive stock.");
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.laptop.create({
      data: toLaptopData(data),
      include: productInclude,
    });
    if (stockQuantity > 0) {
      await tx.inventoryMovement.create({
        data: {
          laptopId: product.id,
          adminId,
          type: "RESTOCK",
          quantityChange: stockQuantity,
          previousStock: 0,
          newStock: stockQuantity,
          reason: "Initial stock when product was created",
        },
      });
    }
    return product;
  });
}

async function updateProduct(id, data) {
  const { categoryIds, images, ...fields } = data;
  const updateData = {
    ...fields,
    ...(categoryIds
      ? { categories: { set: categoryIds.map((categoryId) => ({ id: categoryId })) } }
      : {}),
  };

  return prisma.$transaction(async (tx) => {
    const exists = await tx.laptop.findUnique({
      where: { id },
      select: { id: true, stockQuantity: true },
    });
    if (!exists) throw new AppError(404, "Laptop not found.");
    if (fields.status === "ACTIVE" && exists.stockQuantity === 0) {
      throw new AppError(409, "An out-of-stock product cannot be activated.");
    }
    if (fields.status === "OUT_OF_STOCK" && exists.stockQuantity > 0) {
      throw new AppError(409, "Adjust product stock to zero before marking it out of stock.");
    }
    if (images) {
      await tx.laptopImage.deleteMany({ where: { laptopId: id } });
      updateData.images = {
        create: images.map((image, sortOrder) => ({ ...image, sortOrder })),
      };
    }
    return tx.laptop.update({ where: { id }, data: updateData, include: productInclude });
  }, { isolationLevel: "Serializable" });
}

async function deleteProduct(id) {
  const result = await prisma.laptop.updateMany({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  if (result.count === 0) throw new AppError(404, "Laptop not found.");
  return { archived: true };
}

export {
  listProducts,
  getBestSellers,
  getTrendingProducts,
  getProduct,
  listCategories,
  getSuggestions,
  getFilterOptions,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
};
