import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import AppError from "../utils/app-error.js";

const maxImageSizeBytes = 10 * 1024 * 1024;
const multipartOverheadBytes = 64 * 1024;
const imageTypes = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

let s3Client;

function getStorageConfig() {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET;
  const publicUrl = process.env.AWS_S3_PUBLIC_URL ||
    (bucket && region ? `https://${bucket}.s3.${region}.amazonaws.com` : "");
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new AppError(
      500,
      "Set both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or use the AWS default credential provider.",
    );
  }
  if (!region || !bucket || !publicUrl) {
    throw new AppError(
      503,
      "Image uploads require AWS_REGION and AWS_BUCKET_NAME in backend/.env.",
    );
  }

  let parsedPublicUrl;
  try {
    parsedPublicUrl = new URL(publicUrl);
  } catch {
    throw new AppError(500, "AWS_S3_PUBLIC_URL must be a valid HTTPS URL.");
  }
  if (
    (parsedPublicUrl.protocol !== "https:" && parsedPublicUrl.hostname !== "localhost") ||
    parsedPublicUrl.username ||
    parsedPublicUrl.password ||
    parsedPublicUrl.search ||
    parsedPublicUrl.hash
  ) {
    throw new AppError(500, "AWS_S3_PUBLIC_URL must use HTTPS.");
  }

  return {
    region,
    bucket,
    publicUrl: parsedPublicUrl.toString().replace(/\/+$/, ""),
  };
}

function getS3Client(region) {
  if (!s3Client) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    s3Client = new S3Client({
      region,
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }
  return s3Client;
}

async function createProductImageUpload({ contentType, sizeBytes }) {
  const extension = imageTypes[contentType];
  if (!extension) {
    throw new AppError(400, "Use a JPEG, PNG, WebP, or AVIF image.");
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > maxImageSizeBytes) {
    throw new AppError(400, "Image size must be between 1 byte and 10 MB.");
  }

  const { region, bucket, publicUrl } = getStorageConfig();
  const key = `products/${randomUUID()}.${extension}`;
  const upload = await createPresignedPost(getS3Client(region), {
    Bucket: bucket,
    Key: key,
    Expires: 600,
    Fields: { "Content-Type": contentType },
    Conditions: [
      ["content-length-range", 1, maxImageSizeBytes + multipartOverheadBytes],
      ["eq", "$Content-Type", contentType],
    ],
  });

  return {
    uploadUrl: upload.url,
    fields: upload.fields,
    objectKey: key,
    imageUrl: `${publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`,
    expiresInSeconds: 600,
    maxSizeBytes: maxImageSizeBytes,
  };
}

async function uploadProductImageDirect({ buffer, contentType }) {
  const extension = imageTypes[contentType];
  if (!extension) {
    throw new AppError(400, "Use a JPEG, PNG, WebP, or AVIF image.");
  }
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 1 || buffer.length > maxImageSizeBytes) {
    throw new AppError(400, "Image size must be between 1 byte and 10 MB.");
  }

  const { region, bucket, publicUrl } = getStorageConfig();
  const key = `products/${randomUUID()}.${extension}`;
  const client = getS3Client(region);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return {
    objectKey: key,
    imageUrl: `${publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`,
  };
}

export { createProductImageUpload, uploadProductImageDirect };

