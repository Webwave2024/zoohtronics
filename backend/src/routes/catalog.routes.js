import express from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import * as catalogController from "../controllers/catalog.controller.js";
import { authenticate, requireAdmin } from "../middleware/authenticate.js";
import validate from "../middleware/validate.js";
import asyncHandler from "../utils/async-handler.js";
import {
  idRequest,
  categoryRequest,
  categoryUpdateRequest,
  laptopFields,
  pageQuery,
  emptyBody,
} from "../validation/schemas.js";

const router = express.Router();
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many search requests. Try again shortly." },
});
const listQuery = pageQuery.extend({
  search: z.string().trim().max(100).optional(),
  brand: z.string().trim().max(500).optional(),
  brands: z.string().trim().max(500).optional(),
  grade: z.enum(["LIKE_NEW", "EXCELLENT", "GOOD", "FAIR"]).optional(),
  grades: z.string().trim().max(100).optional(),
  category: z.string().trim().max(120).optional(),
  categories: z.string().trim().max(1000).optional(),
  ramGB: z.string().trim().max(200).optional(),
  storageGB: z.string().trim().max(200).optional(),
  processors: z.string().trim().max(1000).optional(),
  popularity: z.string().trim().max(50).refine(
    (value) => value.split(",").every((item) => ["best-seller", "trending"].includes(item)),
    { message: "Popularity must contain best-seller and/or trending." },
  ).optional(),
  inStock: z.enum(["true", "false"]).optional(),
  featured: z.enum(["true", "false"]).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
}).refine(
  (query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice,
  { message: "minPrice must not exceed maxPrice." },
);
const adminListQuery = listQuery.extend({
  status: z.enum(["DRAFT", "ACTIVE", "OUT_OF_STOCK", "ARCHIVED"]).optional(),
});

router.get(
  "/categories",
  validate(z.object({ body: emptyBody, params: z.object({}), query: z.object({}) })),
  asyncHandler(catalogController.listCategories),
);
router.get(
  "/search/suggestions",
  searchLimiter,
  validate(z.object({
    body: emptyBody,
    params: z.object({}),
    query: z.object({ q: z.string().trim().min(2).max(100) }),
  })),
  asyncHandler(catalogController.getSuggestions),
);
router.get(
  "/laptops/filters",
  validate(z.object({ body: emptyBody, params: z.object({}), query: z.object({}) })),
  asyncHandler(catalogController.getFilterOptions),
);
router.get(
  "/laptops/best-sellers",
  validate(z.object({
    body: emptyBody,
    params: z.object({}),
    query: z.object({ all: z.enum(["true"]).optional() }),
  })),
  asyncHandler(catalogController.getBestSellers),
);
router.get(
  "/laptops/trending",
  validate(z.object({
    body: emptyBody,
    params: z.object({}),
    query: z.object({ all: z.enum(["true"]).optional() }),
  })),
  asyncHandler(catalogController.getTrendingProducts),
);
router.get(
  "/laptops",
  validate(z.object({ body: emptyBody, params: z.object({}), query: listQuery })),
  asyncHandler(catalogController.listProducts),
);
router.get(
  "/laptops/admin",
  authenticate,
  requireAdmin,
  validate(z.object({ body: emptyBody, params: z.object({}), query: adminListQuery })),
  asyncHandler(catalogController.listAdminProducts),
);
router.get(
  "/laptops/admin/:id",
  authenticate,
  requireAdmin,
  validate(idRequest),
  asyncHandler(catalogController.getAdminProduct),
);
router.get("/laptops/:id", validate(idRequest), asyncHandler(catalogController.getProduct));

router.post(
  "/categories",
  authenticate,
  requireAdmin,
  validate(categoryRequest),
  asyncHandler(catalogController.createCategory),
);
router.patch(
  "/categories/:id",
  authenticate,
  requireAdmin,
  validate(categoryUpdateRequest),
  asyncHandler(catalogController.updateCategory),
);
router.delete(
  "/categories/:id",
  authenticate,
  requireAdmin,
  validate(idRequest),
  asyncHandler(catalogController.deleteCategory),
);
router.post(
  "/laptops",
  authenticate,
  requireAdmin,
  validate(z.object({
    body: laptopFields,
    params: z.object({}),
    query: z.object({}),
  })),
  asyncHandler(catalogController.createProduct),
);
router.patch(
  "/laptops/:id",
  authenticate,
  requireAdmin,
  validate(z.object({
    body: laptopFields.omit({ stockQuantity: true }).partial().refine((body) => Object.keys(body).length > 0, {
      message: "At least one non-stock laptop field is required. Use the inventory adjustment endpoint for stock changes.",
    }),
    params: z.object({ id: z.string().min(1) }),
    query: z.object({}),
  })),
  asyncHandler(catalogController.updateProduct),
);
router.delete(
  "/laptops/:id",
  authenticate,
  requireAdmin,
  validate(idRequest),
  asyncHandler(catalogController.deleteProduct),
);

export default router;
