import express from "express";
import { z } from "zod";
import * as accountController from "../controllers/account.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import validate from "../middleware/validate.js";
import asyncHandler from "../utils/async-handler.js";
import {
  addressRequest,
  addressUpdateRequest,
  idRequest,
  emptyBody,
  profileUpdateBody,
  passwordChangeBody,
} from "../validation/schemas.js";

const router = express.Router();
const emptyRequest = z.object({ body: emptyBody, params: z.object({}), query: z.object({}) });

router.use(authenticate);
router.get("/profile", validate(emptyRequest), asyncHandler(accountController.getProfile));
router.patch(
  "/profile",
  validate(z.object({
    body: profileUpdateBody,
    params: z.object({}),
    query: z.object({}),
  })),
  asyncHandler(accountController.updateProfile),
);
router.post(
  "/password",
  validate(z.object({
    body: passwordChangeBody,
    params: z.object({}),
    query: z.object({}),
  })),
  asyncHandler(accountController.changePassword),
);
router.get("/addresses", validate(emptyRequest), asyncHandler(accountController.listAddresses));
router.post("/addresses", validate(addressRequest), asyncHandler(accountController.createAddress));
router.patch(
  "/addresses/:id",
  validate(addressUpdateRequest),
  asyncHandler(accountController.updateAddress),
);
router.delete(
  "/addresses/:id",
  validate(idRequest),
  asyncHandler(accountController.deleteAddress),
);

export default router;
