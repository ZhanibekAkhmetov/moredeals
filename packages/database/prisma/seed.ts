import { PrismaPg } from "@prisma/adapter-pg";
import {
  PaymentMethod,
  PrismaClient,
  ProductCondition,
  StockStatus,
} from "@prisma/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: "../../.env", quiet: true });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const shops = [
  {
    name: "TechHaus",
    slug: "techhaus",
    baseUrl: "https://techhaus.example",
    rating: 4.72,
    reviews: 18_420,
    shipping: 0,
    delivery: [1, 2],
    returnDays: 30,
    returnPaidBy: "SHOP",
    returnDetails: "A prepaid return label is provided for domestic returns.",
  },
  {
    name: "PhonePort",
    slug: "phoneport",
    baseUrl: "https://phoneport.example",
    rating: 4.51,
    reviews: 9_870,
    shipping: 4.99,
    delivery: [2, 4],
    returnDays: 30,
    returnPaidBy: "CUSTOMER",
    returnDetails: "The customer arranges insured return shipping.",
  },
  {
    name: "Mobile Markt",
    slug: "mobile-markt",
    baseUrl: "https://mobile-markt.example",
    rating: 4.34,
    reviews: 31_205,
    shipping: 0,
    delivery: [1, 3],
    returnDays: 14,
    returnPaidBy: "SHOP",
    returnDetails: "Free returns are available through the online return portal.",
  },
  {
    name: "SmartBuy",
    slug: "smartbuy",
    baseUrl: "https://smartbuy.example",
    rating: 4.08,
    reviews: 6_430,
    shipping: 6.49,
    delivery: [3, 6],
    returnDays: 14,
    returnPaidBy: "CUSTOMER",
    returnDetails: "Original shipping charges are not refundable.",
  },
  {
    name: "Digital Dock",
    slug: "digital-dock",
    baseUrl: "https://digital-dock.example",
    rating: 4.83,
    reviews: 12_710,
    shipping: 0,
    delivery: [1, 2],
    returnDays: 60,
    returnPaidBy: "SHOP",
    returnDetails: "A free tracked label is included for unopened and defective items.",
  },
  {
    name: "Gadget Grove",
    slug: "gadget-grove",
    baseUrl: "https://gadget-grove.example",
    rating: 3.92,
    reviews: 2_980,
    shipping: 3.99,
    delivery: [4, 8],
    returnDays: 30,
    returnPaidBy: "CUSTOMER",
    returnDetails: "Return shipping is only reimbursed for faulty products.",
  },
  {
    name: "ElectroDirect",
    slug: "electrodirect",
    baseUrl: "https://electrodirect.example",
    rating: 4.61,
    reviews: 24_560,
    shipping: 2.99,
    delivery: [2, 3],
    returnDays: 30,
    returnPaidBy: "SHOP",
    returnDetails: "Returns can be dropped off or sent with a prepaid label.",
  },
  {
    name: "Pocket Tech",
    slug: "pocket-tech",
    baseUrl: "https://pocket-tech.example",
    rating: 4.27,
    reviews: 4_115,
    shipping: 5.99,
    delivery: [2, 5],
    returnDays: 21,
    returnPaidBy: "CUSTOMER",
    returnDetails: "Tracked shipping is required; no restocking fee applies.",
  },
] as const;

const products = [
  {
    name: "Apple iPhone 16",
    slug: "apple-iphone-16",
    brand: "Apple",
    modelNumber: "A3287",
    description: "A current-generation iPhone with a 6.1-inch display.",
    imageUrl: "https://images.example/apple-iphone-16.webp",
    variants: [
      { name: "128 GB Black", sku: "IPH16-BLK-128", color: "Black", storageGb: 128, ramGb: 8, ean: "0195949822127", mpn: "MYE73ZD/A", price: 829 },
      { name: "256 GB Ultramarine", sku: "IPH16-ULT-256", color: "Ultramarine", storageGb: 256, ramGb: 8, ean: "0195949822295", mpn: "MYEG3ZD/A", price: 949 },
    ],
  },
  {
    name: "Samsung Galaxy S25",
    slug: "samsung-galaxy-s25",
    brand: "Samsung",
    modelNumber: "SM-S931B",
    description: "A compact Android flagship in the Galaxy S series.",
    imageUrl: "https://images.example/samsung-galaxy-s25.webp",
    variants: [
      { name: "128 GB Navy", sku: "S25-NVY-128", color: "Navy", storageGb: 128, ramGb: 12, ean: "8806095850341", mpn: "SM-S931BDBDEUB", price: 849 },
      { name: "256 GB Silver", sku: "S25-SLV-256", color: "Silver Shadow", storageGb: 256, ramGb: 12, ean: "8806095850419", mpn: "SM-S931BZKGEUB", price: 909 },
    ],
  },
  {
    name: "Google Pixel 9",
    slug: "google-pixel-9",
    brand: "Google",
    modelNumber: "GUR25",
    description: "Google's Android smartphone with integrated AI features.",
    imageUrl: "https://images.example/google-pixel-9.webp",
    variants: [
      { name: "128 GB Obsidian", sku: "PIX9-OBS-128", color: "Obsidian", storageGb: 128, ramGb: 12, ean: "0840353915035", mpn: "GA05842-GB", price: 699 },
      { name: "256 GB Wintergreen", sku: "PIX9-WGR-256", color: "Wintergreen", storageGb: 256, ramGb: 12, ean: "0840353915172", mpn: "GA05848-GB", price: 799 },
    ],
  },
  {
    name: "OnePlus 13",
    slug: "oneplus-13",
    brand: "OnePlus",
    modelNumber: "CPH2653",
    description: "A performance-focused Android flagship with fast charging.",
    imageUrl: "https://images.example/oneplus-13.webp",
    variants: [
      { name: "256 GB Black Eclipse", sku: "OP13-BLK-256", color: "Black Eclipse", storageGb: 256, ramGb: 12, ean: "6921815627789", mpn: "5011110256", price: 899 },
      { name: "512 GB Arctic Dawn", sku: "OP13-ARC-512", color: "Arctic Dawn", storageGb: 512, ramGb: 16, ean: "6921815627796", mpn: "5011110512", price: 999 },
    ],
  },
  {
    name: "Xiaomi 15",
    slug: "xiaomi-15",
    brand: "Xiaomi",
    modelNumber: "24129PN74G",
    description: "A compact premium Android phone with a Leica camera system.",
    imageUrl: "https://images.example/xiaomi-15.webp",
    variants: [
      { name: "256 GB Black", sku: "XIA15-BLK-256", color: "Black", storageGb: 256, ramGb: 12, ean: "6941812792318", mpn: "MZB0JXHEU", price: 849 },
      { name: "512 GB Green", sku: "XIA15-GRN-512", color: "Green", storageGb: 512, ramGb: 12, ean: "6941812792325", mpn: "MZB0JXIEU", price: 949 },
    ],
  },
] as const;

const paymentSets: PaymentMethod[][] = [
  [PaymentMethod.CREDIT_CARD, PaymentMethod.PAYPAL, PaymentMethod.KLARNA],
  [PaymentMethod.CREDIT_CARD, PaymentMethod.PAYPAL, PaymentMethod.APPLE_PAY],
  [PaymentMethod.CREDIT_CARD, PaymentMethod.BANK_TRANSFER],
  [PaymentMethod.PAYPAL, PaymentMethod.KLARNA, PaymentMethod.GOOGLE_PAY],
];

const snapshotDates = [
  new Date("2026-05-15T08:00:00.000Z"),
  new Date("2026-06-01T08:00:00.000Z"),
  new Date("2026-06-18T08:00:00.000Z"),
  new Date("2026-07-01T08:00:00.000Z"),
];

const money = (value: number) => Number(value.toFixed(2));

async function main() {
  await prisma.$transaction([
    prisma.priceSnapshot.deleteMany(),
    prisma.warrantyInfo.deleteMany(),
    prisma.offer.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.returnPolicy.deleteMany(),
    prisma.shop.deleteMany(),
  ]);

  const createdShops = [];
  for (const shop of shops) {
    createdShops.push(
      await prisma.shop.create({
        data: {
          name: shop.name,
          slug: shop.slug,
          baseUrl: shop.baseUrl,
          trustpilotRating: shop.rating,
          trustpilotReviewCount: shop.reviews,
          returnPolicy: {
            create: {
              returnPeriodDays: shop.returnDays,
              returnShippingPaidBy: shop.returnPaidBy,
              returnShippingDetails: shop.returnDetails,
            },
          },
        },
      }),
    );
  }

  let variantIndex = 0;
  for (const product of products) {
    const createdProduct = await prisma.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        modelNumber: product.modelNumber,
        description: product.description,
        imageUrl: product.imageUrl,
      },
    });

    for (const sourceVariant of product.variants) {
      const variant = await prisma.productVariant.create({
        data: {
          productId: createdProduct.id,
          name: sourceVariant.name,
          sku: sourceVariant.sku,
          color: sourceVariant.color,
          storageGb: sourceVariant.storageGb,
          ramGb: sourceVariant.ramGb,
          ean: sourceVariant.ean,
          gtin: sourceVariant.ean,
          mpn: sourceVariant.mpn,
        },
      });
      const basePrice = sourceVariant.price;

      for (let offerIndex = 0; offerIndex < 3; offerIndex += 1) {
        const shopIndex = (variantIndex * 2 + offerIndex) % createdShops.length;
        const shop = shops[shopIndex];
        const createdShop = createdShops[shopIndex];
        const price = money(basePrice * (0.91 + offerIndex * 0.025) + shopIndex * 2.5);
        const shippingCost = shop.shipping;
        const totalPrice = money(price + shippingCost);
        const condition =
          offerIndex === 2 && variantIndex % 3 === 0
            ? ProductCondition.REFURBISHED
            : ProductCondition.NEW;

        await prisma.offer.create({
          data: {
            variantId: variant.id,
            shopId: createdShop.id,
            condition,
            price,
            shippingCost,
            totalPrice,
            deliveryMinDays: shop.delivery[0],
            deliveryMaxDays: shop.delivery[1],
            stockStatus:
              offerIndex === 2 && variantIndex % 4 === 0
                ? StockStatus.LOW_STOCK
                : StockStatus.IN_STOCK,
            paymentMethods: paymentSets[shopIndex % paymentSets.length],
            shopProductRating: money(4.05 + ((variantIndex + shopIndex) % 8) * 0.1),
            shopProductReviewCount: 35 + ((variantIndex * 83 + shopIndex * 29) % 1_400),
            matchConfidence: money(0.94 + offerIndex * 0.018),
            redirectUrl: `${shop.baseUrl}/products/${variant.sku.toLowerCase()}?source=moredeals`,
            warrantyInfo: {
              create: {
                durationMonths: condition === ProductCondition.REFURBISHED ? 12 : shopIndex % 3 === 0 ? 36 : 24,
                provider: shopIndex % 2 === 0 ? product.brand : shop.name,
                type: condition === ProductCondition.REFURBISHED ? "Seller warranty" : "Manufacturer warranty",
                details: "Coverage applies under the provider's standard warranty terms.",
              },
            },
            priceSnapshots: {
              create: snapshotDates.map((capturedAt, snapshotIndex) => {
                const historicalPrice = money(price + (3 - snapshotIndex) * (7 + offerIndex * 2));
                return {
                  price: historicalPrice,
                  shippingCost,
                  totalPrice: money(historicalPrice + shippingCost),
                  capturedAt,
                };
              }),
            },
          },
        });
      }

      variantIndex += 1;
    }
  }

  console.log(
    `Seeded ${products.length} products, ${variantIndex} variants, ${shops.length} shops, ${variantIndex * 3} offers, and ${variantIndex * 3 * snapshotDates.length} price snapshots.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
