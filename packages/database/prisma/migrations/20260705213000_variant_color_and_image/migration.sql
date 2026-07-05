-- Unknown colors must remain distinct until extraction resolves them. PostgreSQL
-- permits multiple NULL values in the existing product/storage/color unique index.
ALTER TABLE "ProductVariant"
ALTER COLUMN "color" DROP NOT NULL,
ADD COLUMN "imageUrl" TEXT;
