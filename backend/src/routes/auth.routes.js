import express from "express";
import { rateLimit } from "express-rate-limit";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import validate from "../middleware/validate.js";
import asyncHandler from "../utils/async-handler.js";
import { registerBody, loginBody, emptyBody } from "../validation/schemas.js";
import { z } from "zod";

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Try again later." },
});

router.post(
  "/register",
  authLimiter,
  validate(z.object({ body: registerBody, params: z.object({}), query: z.object({}) })),
  asyncHandler(authController.register),
);
router.post(
  "/login",
  authLimiter,
  validate(z.object({ body: loginBody, params: z.object({}), query: z.object({}) })),
  asyncHandler(authController.login),
);
router.get(
  "/me",
  authenticate,
  validate(z.object({ body: emptyBody, params: z.object({}), query: z.object({}) })),
  asyncHandler(authController.me),
);

export default router;
