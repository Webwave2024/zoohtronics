DO $$ BEGIN
  CREATE TYPE "InventoryMovementType" AS ENUM (
    'RESTOCK',
    'ADJUSTMENT',
    'SALE',
    'CANCELLATION',
    'RETURN'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CouponRedemptionStatus" AS ENUM ('APPLIED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "InventoryMovement" (
  "id" TEXT NOT NULL,
  "type" "InventoryMovementType" NOT NULL,
  "quantityChange" INTEGER NOT NULL,
  "previousStock" INTEGER NOT NULL,
  "newStock" INTEGER NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "laptopId" TEXT NOT NULL,
  "adminId" TEXT,
  "orderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryMovement_laptopId_createdAt_idx"
  ON "InventoryMovement"("laptopId", "createdAt");
CREATE INDEX "InventoryMovement_adminId_createdAt_idx"
  ON "InventoryMovement"("adminId", "createdAt");
CREATE INDEX "InventoryMovement_orderId_idx"
  ON "InventoryMovement"("orderId");

ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_laptopId_fkey"
  FOREIGN KEY ("laptopId") REFERENCES "Laptop"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Wishlist" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WishlistItem" (
  "id" TEXT NOT NULL,
  "wishlistId" TEXT NOT NULL,
  "laptopId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductReview" (
  "id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "title" VARCHAR(150),
  "body" VARCHAR(3000) NOT NULL,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "userId" TEXT NOT NULL,
  "laptopId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "type" "CouponType" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "minimumOrderAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "maximumDiscount" DECIMAL(10,2),
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "usageLimit" INTEGER,
  "perUserUsageLimit" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CouponRedemption" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "discountAmount" DECIMAL(10,2) NOT NULL,
  "status" "CouponRedemptionStatus" NOT NULL DEFAULT 'APPLIED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Wishlist_userId_key" ON "Wishlist"("userId");
CREATE UNIQUE INDEX "WishlistItem_wishlistId_laptopId_key"
  ON "WishlistItem"("wishlistId", "laptopId");
CREATE INDEX "WishlistItem_laptopId_idx" ON "WishlistItem"("laptopId");
CREATE UNIQUE INDEX "ProductReview_userId_laptopId_key"
  ON "ProductReview"("userId", "laptopId");
CREATE INDEX "ProductReview_laptopId_status_createdAt_idx"
  ON "ProductReview"("laptopId", "status", "createdAt");
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_active_startsAt_expiresAt_idx"
  ON "Coupon"("active", "startsAt", "expiresAt");
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");
CREATE INDEX "CouponRedemption_couponId_status_idx"
  ON "CouponRedemption"("couponId", "status");
CREATE INDEX "CouponRedemption_userId_couponId_status_idx"
  ON "CouponRedemption"("userId", "couponId", "status");

ALTER TABLE "Wishlist"
  ADD CONSTRAINT "Wishlist_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WishlistItem"
  ADD CONSTRAINT "WishlistItem_wishlistId_fkey"
  FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WishlistItem"
  ADD CONSTRAINT "WishlistItem_laptopId_fkey"
  FOREIGN KEY ("laptopId") REFERENCES "Laptop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReview"
  ADD CONSTRAINT "ProductReview_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReview"
  ADD CONSTRAINT "ProductReview_laptopId_fkey"
  FOREIGN KEY ("laptopId") REFERENCES "Laptop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption"
  ADD CONSTRAINT "CouponRedemption_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "Coupon"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption"
  ADD CONSTRAINT "CouponRedemption_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption"
  ADD CONSTRAINT "CouponRedemption_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
