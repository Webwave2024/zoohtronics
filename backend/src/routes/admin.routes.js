import express from "express";
import { z } from "zod";
import * as adminController from "../controllers/admin.controller.js";
import * as catalogController from "../controllers/catalog.controller.js";
import * as orderController from "../controllers/order.controller.js";
import * as commerceController from "../controllers/customer-commerce.controller.js";
import * as imageUploadController from "../controllers/image-upload.controller.js";
import * as inquiryController from "../controllers/inquiry.controller.js";
import { authenticate, requireAdmin } from "../middleware/authenticate.js";
import validate from "../middleware/validate.js";
import asyncHandler from "../utils/async-handler.js";
import {
  emptyBody,
  pageQuery,
  paramsWithId,
  laptopFields,
} from "../validation/schemas.js";

const router = express.Router();
router.use(authenticate, requireAdmin);

const adminProductQuery = pageQuery.extend({
  search: z.string().trim().max(100).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "OUT_OF_STOCK", "ARCHIVED"]).optional(),
  stock: z.enum(["in_stock", "out_of_stock", "low_stock"]).optional(),
  lowStockThreshold: z.coerce.number().int().min(1).max(10000).default(5),
  brand: z.string().trim().max(100).optional(),
  category: z.string().trim().max(120).optional(),
  grade: z.enum(["LIKE_NEW", "EXCELLENT", "GOOD", "FAIR"]).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "stock_asc", "stock_desc"]).default("newest"),
}).refine(
  (query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice,
  { message: "minPrice must not exceed maxPrice." },
);

router.get(
  "/dashboard",
  validate(z.object({
    body: emptyBody,
    params: z.object({}),
    query: z.object({
      lowStockThreshold: z.coerce.number().int().min(1).max(10000).default(5),
    }),
  })),
  asyncHandler(adminController.getDashboard),
);
router.get(
  "/orders",
  validate(z.object({
    body: emptyBody,
    params: z.object({}),
    query: pageQuery.extend({
      status: z.enum(["PENDING", "PAYMENT_PROCESSING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
      paymentStatus: z.enum(["PENDING", "PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED", "PARTIALLY_REFUNDED", "REFUNDED"]).optional(),
      search: z.string().trim().max(100).optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    }).refine(
      (query) => query.from === undefined || query.to === undefined || query.from <= query.to,
      { message: "from must not be later than to." },
    ),
  })),
  asyncHandler(orderController.listAdminOrders),
);
router.get(
  "/inquiries",
  validate(z.object({
    body: emptyBody,
    params: z.object({}),
    query: pageQuery.extend({
      status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
      search: z.string().trim().max(100).optional(),
    }),
  })),
  asyncHandler(inquiryController.listInquiries),
);
router.get(
  "/inquiries/:id",
  validate(z.object({ body: emptyBody, params: paramsWithId, query: z.object({}) })),
  asyncHandler(inquiryController.getInquiry),
);
router.patch(
  "/inquiries/:id",
  validate(z.object({
    body: z.object({
      status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
      adminNotes: z.string().trim().max(5000).nullable().optional(),
      assignedAdminId: z.string().min(1).nullable().optional(),
    }).refine((body) => Object.keys(body).length > 0, {
      message: "Provide a status, admin note, or assignee to update.",
    }),
    params: paramsWithId,
    query: z.object({}),
  })),
  asyncHandler(inquiryController.updateInquiry),
);
router.post(
  "/uploads/product-images",
  validate(z.object({
    body: z.object({
      contentType: z.enum(["image/avif", "image/jpeg", "image/png", "image/webp"]),
      sizeBytes: z.number().int().min(1).max(10 * 1024 * 1024),
    }),
    params: z.object({}),
    query: z.object({}),
  })),
  asyncHandler(imageUploadController.createProductImageUploadController),
);
router.post(
  "/uploads/product-images/direct",
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp", "image/avif", "application/octet-stream"],
    limit: "10mb",
  }),
  asyncHandler(imageUploadController.uploadProductImageDirectController),
);
router.get(
  "/coupons",
  validate(z.object({ body: emptyBody, params: z.object({}), query: pageQuery })),
  asyncHandler(commerceController.listAdminCoupons),
);
const couponBody = z.object({
  code: z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  type: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  amount: z.coerce.number().positive().max(99999999.99).optional(),
  minimumOrderAmount: z.coerce.number().nonnegative().max(99999999.99).optional(),
  maximumDiscount: z.coerce.number().positive().max(99999999.99).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  perUserUsageLimit: z.coerce.number().int().positive().optional(),
  active: z.boolean().optional(),
});
const newCouponBody = couponBody.extend({
  code: z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  amount: z.coerce.number().positive().max(99999999.99),
});
router.post(
  "/coupons",
  validate(z.object({
    body: newCouponBody,
    params: z.object({}),
    query: z.object({}),
  }).refine(
    (request) => !request.body.startsAt || !request.body.expiresAt ||
      request.body.startsAt < request.body.expiresAt,
    { path: ["body", "expiresAt"], message: "Coupon expiry must be later than its start time." },
  )),
  asyncHandler(commerceController.createAdminCoupon),
);
router.patch(
  "/coupons/:id",
  validate(z.object({
    body: couponBody.refine((body) => Object.keys(body).length > 0, {
      message: "Provide at least one coupon field to update.",
    }),
    params: paramsWithId,
    query: z.object({}),
  })),
  asyncHandler(commerceController.updateAdminCoupon),
);
router.delete(
  "/coupons/:id",
  validate(z.object({ body: emptyBody, params: paramsWithId, query: z.object({}) })),
  asyncHandler(commerceController.deactivateAdminCoupon),
);
router.get(
  "/reviews",
  validate(z.object({ body: emptyBody, params: z.object({}), query: pageQuery })),
  asyncHandler(commerceController.listPendingReviews),
);
router.patch(
  "/reviews/:id/moderation",
  validate(z.object({
    body: z.object({ status: z.enum(["PUBLISHED", "REJECTED"]) }),
    params: paramsWithId,
    query: z.object({}),
  })),
  asyncHandler(commerceController.moderateReview),
);
router.get(
  "/products",
  validate(z.object({ body: emptyBody, params: z.object({}), query: adminProductQuery })),
  asyncHandler(adminController.listProducts),
);
router.post(
  "/products",
  validate(z.object({ body: laptopFields, params: z.object({}), query: z.object({}) })),
  asyncHandler(catalogController.createAdminProduct),
);
router.get(
  "/products/:id/inventory",
  validate(z.object({
    body: emptyBody,
    params: paramsWithId,
    query: pageQuery,
  })),
  asyncHandler(adminController.listInventoryMovements),
);
router.post(
  "/products/:id/inventory-adjustments",
  validate(z.object({
    body: z.object({
      type: z.enum(["RESTOCK", "ADJUSTMENT", "RETURN"]),
      quantityChange: z.number().int().min(-2147483647).max(2147483647).refine((value) => value !== 0, {
        message: "quantityChange cannot be zero.",
      }),
      reason: z.string().trim().min(3).max(500),
    }).superRefine((body, context) => {
      if (body.type === "RESTOCK" && body.quantityChange < 0) {
        context.addIssue({ code: "custom", path: ["quantityChange"], message: "A restock must add stock." });
      }
      if (body.type === "RETURN" && body.quantityChange < 0) {
        context.addIssue({ code: "custom", path: ["quantityChange"], message: "A return must add stock." });
      }
    }),
    params: paramsWithId,
    query: z.object({}),
  })),
  asyncHandler(adminController.adjustInventory),
);
router.get(
  "/products/:id",
  validate(z.object({ body: emptyBody, params: paramsWithId, query: z.object({}) })),
  asyncHandler(adminController.getProduct),
);
router.patch(
  "/products/:id",
  validate(z.object({
    body: laptopFields.omit({ stockQuantity: true }).partial().refine((body) => Object.keys(body).length > 0, {
      message: "At least one non-stock product field is required.",
    }),
    params: paramsWithId,
    query: z.object({}),
  })),
  asyncHandler(catalogController.updateProduct),
);
router.delete(
  "/products/:id",
  validate(z.object({ body: emptyBody, params: paramsWithId, query: z.object({}) })),
  asyncHandler(catalogController.deleteProduct),
);

router.get(
  "/users",
  validate(z.object({
    body: emptyBody,
    params: z.object({}),
    query: pageQuery.extend({
      role: z.enum(["CUSTOMER", "ADMIN"]).optional(),
      status: z.enum(["ACTIVE", "DISABLED"]).optional(),
    }),
  })),
  asyncHandler(adminController.listUsers),
);
router.patch(
  "/users/:id",
  validate(z.object({
    body: z.object({
      role: z.enum(["CUSTOMER", "ADMIN"]).optional(),
      status: z.enum(["ACTIVE", "DISABLED"]).optional(),
    }).refine((body) => Object.keys(body).length > 0, {
      message: "Provide a role or status to update.",
    }),
    params: paramsWithId,
    query: z.object({}),
  })),
  asyncHandler(adminController.updateUser),
);

export default router;
