-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- AlterTable
ALTER TABLE "Offer"
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "originalProductUrl" TEXT,
ADD COLUMN "resolvedProductUrl" TEXT,
ADD COLUMN "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN "lastExtractionStatus" "ExtractionStatus",
ADD COLUMN "lastExtractionWarnings" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
