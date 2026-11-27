import { createProductImageUpload, uploadProductImageDirect } from "../services/image-upload.service.js";
import AppError from "../utils/app-error.js";

async function createProductImageUploadController(req, res) {
  const upload = await createProductImageUpload(req.validated.body);
  return res.status(201).json({ upload });
}

async function uploadProductImageDirectController(req, res) {
  const rawContentType = req.headers["content-type"] || "";
  const contentType = rawContentType.split(";")[0].trim();
  const buffer = req.body;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError(400, "No image binary received or empty file.");
  }

  const result = await uploadProductImageDirect({ buffer, contentType });
  return res.status(201).json(result);
}

export { createProductImageUploadController, uploadProductImageDirectController };

