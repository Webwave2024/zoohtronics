import express from "express";
import { z } from "zod";
import * as commerceController from "../controllers/customer-commerce.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import validate from "../middleware/validate.js";
import asyncHandler from "../utils/async-handler.js";
import { emptyBody, pageQuery } from "../validation/schemas.js";

const router = express.Router();
const emptyRequest = z.object({ body: emptyBody, params: z.object({}), query: z.object({}) });

router.get(
  "/laptops/:laptopId/reviews",
  validate(z.object({
    body: emptyBody,
    params: z.object({ laptopId: z.string().min(1) }),
    query: pageQuery,
  })),
  asyncHandler(commerceController.listReviews),
);
router.get(
  "/wishlist",
  authenticate,
  validate(emptyRequest),
  asyncHandler(commerceController.getWishlist),
);
router.post(
  "/wishlist/items",
  authenticate,
  validate(z.object({
    body: z.object({ laptopId: z.string().min(1) }),
    params: z.object({}),
    query: z.object({}),
  })),
  asyncHandler(commerceController.addWishlistItem),
);
router.delete(
  "/wishlist/items/:laptopId",
  authenticate,
  validate(z.object({
    body: emptyBody,
    params: z.object({ laptopId: z.string().min(1) }),
    query: z.object({}),
  })),
  asyncHandler(commerceController.removeWishlistItem),
);
router.post(
  "/laptops/:laptopId/reviews",
  authenticate,
  validate(z.object({
    body: z.object({
      rating: z.number().int().min(1).max(5),
      title: z.string().trim().max(150).optional(),
      body: z.string().trim().min(10).max(3000),
    }),
    params: z.object({ laptopId: z.string().min(1) }),
    query: z.object({}),
  })),
  asyncHandler(commerceController.createReview),
);
router.post(
  "/orders/coupons/validate",
  authenticate,
  validate(z.object({
    body: z.object({ code: z.string().trim().min(1).max(40) }),
    params: z.object({}),
    query: z.object({}),
  })),
  asyncHandler(commerceController.previewCoupon),
);

export default router;
