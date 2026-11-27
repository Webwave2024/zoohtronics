ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentExpiresAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Order_status_paymentExpiresAt_idx"
  ON "Order"("status", "paymentExpiresAt");
