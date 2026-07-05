export type MerchantFeedRow = Record<string, string> & {
  shopName: string;
  shopDomain: string;
  productTitle: string;
  brand: string;
  model: string;
  variantName: string;
  storageGb: string;
  ramGb: string;
  color: string;
  ean: string;
  gtin: string;
  mpn: string;
  condition: string;
  price: string;
  shippingCost: string;
  currency: string;
  deliveryMinDays: string;
  deliveryMaxDays: string;
  stockStatus: string;
  paymentMethods: string;
  returnDays: string;
  returnShipping: string;
  warrantyMonths: string;
  productRating: string;
  productReviewCount: string;
  storeRating: string;
  storeReviewCount: string;
  productUrl: string;
  imageUrl: string;
  description: string;
};

export type MerchantFeedRowError = {
  row: number;
  message: string;
};

export type MerchantFeedImportSummary = {
  importId: string;
  importedRows: number;
  failedRows: number;
  createdOffers: number;
  updatedOffers: number;
  priceSnapshotsCreated: number;
  errors: MerchantFeedRowError[];
};
