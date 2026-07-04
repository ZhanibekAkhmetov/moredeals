-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NEW', 'REFURBISHED', 'USED');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'PREORDER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CREDIT_CARD', 'PAYPAL', 'KLARNA', 'BANK_TRANSFER', 'APPLE_PAY', 'GOOGLE_PAY', 'CASH_ON_DELIVERY');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'smartphone',
    "modelNumber" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "storageGb" INTEGER NOT NULL,
    "ramGb" INTEGER,
    "ean" TEXT,
    "gtin" TEXT,
    "mpn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "trustpilotRating" DECIMAL(3,2),
    "trustpilotReviewCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "condition" "ProductCondition" NOT NULL DEFAULT 'NEW',
    "price" DECIMAL(10,2) NOT NULL,
    "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "deliveryMinDays" INTEGER,
    "deliveryMaxDays" INTEGER,
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'UNKNOWN',
    "paymentMethods" "PaymentMethod"[],
    "shopProductRating" DECIMAL(3,2),
    "shopProductReviewCount" INTEGER,
    "matchConfidence" DECIMAL(5,4) NOT NULL,
    "redirectUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "shippingCost" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnPolicy" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "returnPeriodDays" INTEGER NOT NULL,
    "returnShippingPaidBy" TEXT NOT NULL,
    "returnShippingDetails" TEXT,
    "restockingFeePercent" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyInfo" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarrantyInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_brand_idx" ON "Product"("brand");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_ean_key" ON "ProductVariant"("ean");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_gtin_key" ON "ProductVariant"("gtin");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_mpn_key" ON "ProductVariant"("mpn");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_color_storageGb_key" ON "ProductVariant"("productId", "color", "storageGb");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");

-- CreateIndex
CREATE INDEX "Shop_trustpilotRating_idx" ON "Shop"("trustpilotRating");

-- CreateIndex
CREATE INDEX "Offer_variantId_totalPrice_idx" ON "Offer"("variantId", "totalPrice");

-- CreateIndex
CREATE INDEX "Offer_shopId_idx" ON "Offer"("shopId");

-- CreateIndex
CREATE INDEX "Offer_stockStatus_idx" ON "Offer"("stockStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_variantId_shopId_condition_key" ON "Offer"("variantId", "shopId", "condition");

-- CreateIndex
CREATE INDEX "PriceSnapshot_offerId_capturedAt_idx" ON "PriceSnapshot"("offerId", "capturedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PriceSnapshot_offerId_capturedAt_key" ON "PriceSnapshot"("offerId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnPolicy_shopId_key" ON "ReturnPolicy"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "WarrantyInfo_offerId_key" ON "WarrantyInfo"("offerId");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnPolicy" ADD CONSTRAINT "ReturnPolicy_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyInfo" ADD CONSTRAINT "WarrantyInfo_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
