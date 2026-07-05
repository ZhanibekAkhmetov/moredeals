-- CreateEnum
CREATE TYPE "OfferSource" AS ENUM ('DEMO', 'IMPORTED_FEED');

-- CreateEnum
CREATE TYPE "MerchantFeedImportStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- Replace the old offer identity with a seller-listing identity.
DROP INDEX "Offer_variantId_shopId_condition_key";

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN "merchantFeedImportId" TEXT,
ADD COLUMN "source" "OfferSource" NOT NULL DEFAULT 'DEMO',
ADD COLUMN "sourceName" TEXT;

-- CreateTable
CREATE TABLE "MerchantFeedImport" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "shopName" TEXT,
    "shopDomain" TEXT,
    "status" "MerchantFeedImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "createdOffers" INTEGER NOT NULL DEFAULT 0,
    "updatedOffers" INTEGER NOT NULL DEFAULT 0,
    "priceSnapshotsCreated" INTEGER NOT NULL DEFAULT 0,
    "errorMessages" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MerchantFeedImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawMerchantOffer" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "imported" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "offerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawMerchantOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantFeedImport_createdAt_idx" ON "MerchantFeedImport"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "MerchantFeedImport_shopDomain_idx" ON "MerchantFeedImport"("shopDomain");

-- CreateIndex
CREATE INDEX "RawMerchantOffer_offerId_idx" ON "RawMerchantOffer"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "RawMerchantOffer_importId_rowNumber_key" ON "RawMerchantOffer"("importId", "rowNumber");

-- CreateIndex
CREATE INDEX "Offer_merchantFeedImportId_idx" ON "Offer"("merchantFeedImportId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_variantId_shopId_redirectUrl_key" ON "Offer"("variantId", "shopId", "redirectUrl");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_merchantFeedImportId_fkey" FOREIGN KEY ("merchantFeedImportId") REFERENCES "MerchantFeedImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMerchantOffer" ADD CONSTRAINT "RawMerchantOffer_importId_fkey" FOREIGN KEY ("importId") REFERENCES "MerchantFeedImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMerchantOffer" ADD CONSTRAINT "RawMerchantOffer_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
