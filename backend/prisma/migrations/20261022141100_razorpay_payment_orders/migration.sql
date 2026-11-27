ALTER TABLE "Payment" ADD COLUMN "providerOrderId" TEXT;

CREATE UNIQUE INDEX "Payment_provider_providerOrderId_key"
  ON "Payment"("provider", "providerOrderId");
