import "./config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import prisma from "./config/prisma.js";
import accountRoutes from "./routes/account.routes.js";
import authRoutes from "./routes/auth.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import customerCommerceRoutes from "./routes/customer-commerce.routes.js";
import paymentWebhookRoutes from "./routes/payment-webhook.routes.js";
import inquiryRoutes from "./routes/inquiry.routes.js";
import errorHandler from "./middleware/error-handler.js";
import asyncHandler from "./utils/async-handler.js";

const app = express();
const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
const configuredOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);

app.disable("x-powered-by");
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));
app.use("/api", paymentWebhookRoutes);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", asyncHandler(async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  return res.json({ status: "ok" });
}));

app.use("/api/auth", authRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api", catalogRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", customerCommerceRoutes);

app.use((req, res) => res.status(404).json({ error: "Route not found." }));
app.use(errorHandler);

export default app;
