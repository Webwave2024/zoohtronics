import express from "express";
import { z } from "zod";
import * as cartController from "../controllers/cart.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import validate from "../middleware/validate.js";
import asyncHandler from "../utils/async-handler.js";
import { emptyBody, paramsWithItemId } from "../validation/schemas.js";

const router = express.Router();
const emptyRequest = z.object({ body: emptyBody, params: z.object({}), query: z.object({}) });

router.use(authenticate);
router.get("/", validate(emptyRequest), asyncHandler(cartController.getCart));
router.delete("/", validate(emptyRequest), asyncHandler(cartController.clearCart));
router.post(
  "/items",
  validate(z.object({
    body: z.object({
      laptopId: z.string().min(1),
      quantity: z.number().int().min(1).max(100),
    }),
    params: z.object({}),
    query: z.object({}),
  })),
  asyncHandler(cartController.addItem),
);
router.patch(
  "/items/:itemId",
  validate(z.object({
    body: z.object({ quantity: z.number().int().min(1).max(100) }),
    params: paramsWithItemId,
    query: z.object({}),
  })),
  asyncHandler(cartController.updateItem),
);
router.delete(
  "/items/:itemId",
  validate(z.object({ body: emptyBody, params: paramsWithItemId, query: z.object({}) })),
  asyncHandler(cartController.removeItem),
);

export default router;
