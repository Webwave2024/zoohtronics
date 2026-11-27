import env from "./config/env.js";
import app from "./app.js";
import prisma from "./config/prisma.js";
import { expirePendingPayments } from "./services/order.service.js";

const port = env.PORT;
let server;

let expiryCheckRunning = false;
async function runPaymentExpiryCheck() {
  if (expiryCheckRunning) return;
  expiryCheckRunning = true;
  try {
    const result = await expirePendingPayments();
    if (result.expired > 0) {
      console.info(`Expired ${result.expired} unpaid order(s).`);
    }
  } catch (error) {
    console.error("Failed to expire unpaid orders.", error);
  } finally {
    expiryCheckRunning = false;
  }
}

const paymentExpiryTimer = setInterval(runPaymentExpiryCheck, 60 * 1000);
paymentExpiryTimer.unref();

async function startServer() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    const code = error.code || error.cause?.code || "unknown";
    console.error(
      `Database connection failed (${code}) for host "${databaseUrl.hostname}" on port ${databaseUrl.port || "5432"}. Check that this is the actual PostgreSQL hostname, the server is running, and its network/firewall allows this connection.`,
    );
    clearInterval(paymentExpiryTimer);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  server = app.listen(port, () => {
    console.log(`Zohntronics API listening on port ${port}`);
    void runPaymentExpiryCheck();
  });
}

void startServer();

async function shutdown(signal) {
  console.log(`${signal} received; closing API server.`);
  clearInterval(paymentExpiryTimer);
  if (server) {
    server.close(async (error) => {
      if (error) {
        console.error("Failed to close API server cleanly.", error);
        process.exitCode = 1;
      }
      await prisma.$disconnect();
    });
  } else {
    await prisma.$disconnect();
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
