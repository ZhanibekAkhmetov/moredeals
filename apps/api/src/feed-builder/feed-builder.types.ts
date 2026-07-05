import type { ExtractionStatus } from '@moredeals/database';
import type { MerchantFeedRow } from '../merchant-feeds/merchant-feed.types';

export type ExtractionContext = {
  url: URL;
  html: string;
};

export type RefreshableOffer = {
  redirectUrl: string;
  originalProductUrl: string | null;
  resolvedProductUrl: string | null;
};

export type ProductPageExtraction = {
  url: string;
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
  originalUrl: string;
  resolvedUrl: string;
  warnings: string[];
  status: ExtractionStatus;
  row: MerchantFeedRow;
  strategies: string[];
  extractedFields: Partial<Record<keyof MerchantFeedRow, string>>;
  metadata: Record<string, string>;
  confidence: number;
};

export type FeedBuilderExtraction = ProductPageExtraction;
