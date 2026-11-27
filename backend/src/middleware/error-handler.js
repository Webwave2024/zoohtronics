import { Prisma } from "@prisma/client";
import AppError from "../utils/app-error.js";

export default function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Request body contains invalid JSON." });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "A record with those details already exists." });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Record not found." });
    }
    if (error.code === "P2003" || error.code === "P2014") {
      return res.status(400).json({ error: "The request conflicts with related records." });
    }
    if (error.code === "P2034") {
      return res.status(409).json({ error: "The record changed concurrently. Retry the request." });
    }
  }

  console.error(error);
  return res.status(500).json({ error: "An unexpected server error occurred." });
}
