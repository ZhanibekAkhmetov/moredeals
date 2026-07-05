import type { MerchantFeedRow } from "./types";

export const merchantFeedColumns = [
  "shopName",
  "shopDomain",
  "productTitle",
  "brand",
  "model",
  "variantName",
  "storageGb",
  "ramGb",
  "color",
  "ean",
  "gtin",
  "mpn",
  "condition",
  "price",
  "shippingCost",
  "currency",
  "deliveryMinDays",
  "deliveryMaxDays",
  "stockStatus",
  "paymentMethods",
  "returnDays",
  "returnShipping",
  "warrantyMonths",
  "productRating",
  "productReviewCount",
  "storeRating",
  "storeReviewCount",
  "productUrl",
  "imageUrl",
  "description",
] as const satisfies readonly (keyof MerchantFeedRow)[];

export const merchantFeedRequiredColumns = new Set<keyof MerchantFeedRow>([
  "shopName",
  "shopDomain",
  "productTitle",
  "brand",
  "model",
  "variantName",
  "price",
  "currency",
  "productUrl",
]);

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function rowsToMerchantCsv(rows: MerchantFeedRow[]) {
  return [
    merchantFeedColumns.join(","),
    ...rows.map((row) =>
      merchantFeedColumns.map((column) => csvCell(row[column])).join(","),
    ),
  ].join("\r\n");
}
