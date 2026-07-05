import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: "../../.env", quiet: true });

if (process.env.NODE_ENV === "production") {
  throw new Error("db:clear-catalog is a local development command and cannot run in production.");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to clear catalog data.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const counts = await prisma.$transaction(async (tx) => {
    const rawOffers = await tx.rawMerchantOffer.deleteMany();
    const priceSnapshots = await tx.priceSnapshot.deleteMany();
    const warranties = await tx.warrantyInfo.deleteMany();
    const offers = await tx.offer.deleteMany();
    const variants = await tx.productVariant.deleteMany();
    const products = await tx.product.deleteMany();
    const returnPolicies = await tx.returnPolicy.deleteMany();
    const imports = await tx.merchantFeedImport.deleteMany();
    const shops = await tx.shop.deleteMany({ where: { offers: { none: {} } } });

    return {
      rawOffers: rawOffers.count,
      priceSnapshots: priceSnapshots.count,
      warranties: warranties.count,
      offers: offers.count,
      variants: variants.count,
      products: products.count,
      returnPolicies: returnPolicies.count,
      imports: imports.count,
      shops: shops.count,
    };
  });

  console.log("Cleared local catalog/import data. Users were not changed.", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
