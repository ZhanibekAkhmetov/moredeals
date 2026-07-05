export type MoneyValue = string | number;

export type ProductVariant = {
  id: string;
  name: string;
  sku: string;
  color: string | null;
  storageGb: number;
  ramGb: number | null;
  imageUrl: string | null;
  ean: string | null;
  gtin: string | null;
  mpn: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  modelNumber: string | null;
  description: string | null;
  imageUrl: string | null;
  variants: ProductVariant[];
};

export type ReturnPolicy = {
  id: string;
  returnPeriodDays: number;
  returnShippingPaidBy: string;
  returnShippingDetails: string | null;
  restockingFeePercent: MoneyValue | null;
};

export type WarrantyInfo = {
  id: string;
  durationMonths: number;
  provider: string;
  type: string;
  details: string | null;
};

export type Shop = {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  trustpilotRating: MoneyValue | null;
  trustpilotReviewCount: number | null;
  returnPolicy: ReturnPolicy | null;
};

export type PriceSnapshot = {
  id: string;
  offerId: string;
  price: MoneyValue;
  shippingCost: MoneyValue;
  totalPrice: MoneyValue;
  capturedAt: string;
};

export type Offer = {
  id: string;
  condition: string;
  price: MoneyValue;
  shippingCost: MoneyValue;
  totalPrice: MoneyValue;
  currency: string;
  deliveryMinDays: number | null;
  deliveryMaxDays: number | null;
  stockStatus: string;
  paymentMethods: string[];
  shopProductRating: MoneyValue | null;
  shopProductReviewCount: number | null;
  matchConfidence: MoneyValue;
  redirectUrl: string;
  imageUrl: string | null;
  source: "DEMO" | "IMPORTED_FEED";
  sourceName: string | null;
  originalProductUrl: string | null;
  resolvedProductUrl: string | null;
  lastCheckedAt: string | null;
  lastExtractionStatus: ExtractionStatus | null;
  lastExtractionWarnings: string[];
  merchantFeedImportId: string | null;
  variant: ProductVariant & { product: { imageUrl: string | null } };
  shop: Shop;
  warrantyInfo: WarrantyInfo | null;
  latestPriceSnapshot?: PriceSnapshot | null;
};

export type OfferDetails = Omit<Offer, "variant"> & {
  variant: ProductVariant & { product: Product };
  priceSnapshots: PriceSnapshot[];
};

export type MerchantFeedRowError = {
  row: number;
  message: string;
};

export type MerchantFeedRow = {
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

export type FeedBuilderExtraction = {
  productTitle: string;
  brand: string;
  model: string;
  variantName: string;
  price: string;
  currency: string;
  shippingCost: string;
  stockStatus: string;
  imageUrl: string;
  productUrl: string;
  url: string;
  originalUrl: string;
  resolvedUrl: string;
  row: MerchantFeedRow;
  strategies: string[];
  warnings: string[];
  status: ExtractionStatus;
  extractedFields: Partial<Record<keyof MerchantFeedRow, string>>;
  metadata: Record<string, string>;
  confidence: number;
};

export type ExtractionStatus = "SUCCESS" | "PARTIAL" | "FAILED";

export type OfferRefreshResult = {
  offer: OfferDetails;
  snapshot: PriceSnapshot;
};

export type RefreshImportedSummary = {
  attempted: number;
  succeeded: number;
  partial: number;
  failed: number;
  errors: { offerId: string; message: string }[];
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
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
