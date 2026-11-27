import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is missing. Create backend/.env from backend/.env.example and set your PostgreSQL connection string.",
  );
}

let databaseUrl;
try {
  databaseUrl = new URL(connectionString);
} catch {
  throw new Error(
    "DATABASE_URL must be a valid PostgreSQL connection URL. Use the format postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public.",
  );
}

if (!["postgresql:", "postgres:"].includes(databaseUrl.protocol) || !databaseUrl.hostname) {
  throw new Error(
    "DATABASE_URL must use the PostgreSQL protocol and include a database hostname.",
  );
}

if (databaseUrl.hostname.toLowerCase() === "base") {
  throw new Error(
    "DATABASE_URL uses 'base' as its hostname. Replace it with the actual PostgreSQL server hostname or IP address.",
  );
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export default prisma;
