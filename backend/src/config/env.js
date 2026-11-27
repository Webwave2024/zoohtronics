import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../.env");
config({ path: envPath });

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: Number(process.env.PORT || 3001),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  AWS_REGION: process.env.AWS_REGION || "ap-south-1",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET || "crm-images-data",
  AWS_S3_PUBLIC_URL: process.env.AWS_S3_PUBLIC_URL,
};

export default env;
