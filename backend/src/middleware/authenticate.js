import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import AppError from "../utils/app-error.js";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new AppError(500, "JWT_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

async function authenticate(req, res, next) {
  const authorization = req.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return next(new AppError(401, "Authentication token is required."));
  }

  try {
    const payload = jwt.verify(authorization.slice(7), getJwtSecret(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload !== "object" ||
      typeof payload.sub !== "string" ||
      !Number.isInteger(payload.ver)
    ) {
      throw new AppError(401, "Invalid authentication token.");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        tokenVersion: true,
      },
    });

    if (!user || user.status !== "ACTIVE" || user.tokenVersion !== payload.ver) {
      throw new AppError(401, "User account is unavailable.");
    }

    const { tokenVersion, ...publicUser } = user;
    req.user = publicUser;
    return next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new AppError(401, "Invalid or expired authentication token."));
    }
    return next(error);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return next(new AppError(403, "Administrator access is required."));
  }
  return next();
}

export { authenticate, requireAdmin, getJwtSecret };
