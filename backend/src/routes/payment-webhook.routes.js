import express from "express";
import * as orderController from "../controllers/order.controller.js";
import asyncHandler from "../utils/async-handler.js";

const router = express.Router();

router.post(
  "/webhooks/razorpay",
  express.raw({ type: "application/json", limit: "1mb" }),
  asyncHandler(orderController.handleRazorpayWebhook),
);

export default router;
