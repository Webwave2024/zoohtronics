import express from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import * as inquiryController from "../controllers/inquiry.controller.js";
import validate from "../middleware/validate.js";
import asyncHandler from "../utils/async-handler.js";

const router = express.Router();
const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many inquiries submitted. Try again later." },
});

router.post(
  "/",
  inquiryLimiter,
  validate(z.object({
    body: z.object({
      name: z.string().trim().min(1).max(100),
      email: z.string().trim().email().max(254),
      phone: z.string().trim().max(30).optional(),
      subject: z.string().trim().min(3).max(160),
      message: z.string().trim().min(10).max(5000),
      website: z.string().max(200).optional(),
    }),
    params: z.object({}),
    query: z.object({}),
  })),
  asyncHandler(inquiryController.createInquiry),
);

export default router;
