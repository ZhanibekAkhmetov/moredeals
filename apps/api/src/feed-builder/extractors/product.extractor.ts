import { ExtractionStatus } from '@moredeals/database';
import { MERCHANT_FEED_HEADERS } from '../../merchant-feeds/merchant-feed.template';
import type { MerchantFeedRow } from '../../merchant-feeds/merchant-feed.types';
import {
  deriveBrand,
  deriveModel,
  deriveProductDetails,
  deriveShopNameFromDomain,
  deriveVariantName,
  mergeExtraction,
  type ExtractedProduct,
} from '../extraction.utils';
import type {
  ExtractionContext,
  ProductPageExtraction,
  RefreshableOffer,
} from '../feed-builder.types';
import { SafePageFetcher } from '../safe-page-fetcher.service';

const requiredFields = [
  'shopName',
  'shopDomain',
  'productTitle',
  'brand',
  'model',
  'variantName',
  'price',
  'currency',
  'productUrl',
] as const;

export interface ProductPageExtractor {
  readonly name: string;
  canHandle(url: URL): boolean;
  extract(url: string): Promise<ProductPageExtraction>;
  refresh(existingOffer: RefreshableOffer): Promise<ProductPageExtraction>;
}

export abstract class BaseProductPageExtractor implements ProductPageExtractor {
  abstract readonly name: string;

  constructor(protected readonly fetcher: SafePageFetcher) {}

  abstract canHandle(url: URL): boolean;

  protected abstract extractPage(context: ExtractionContext): ExtractedProduct;

  async extract(input: string): Promise<ProductPageExtraction> {
    const row = this.emptyRow();
    const warnings: string[] = [];
    const extractedFields: ProductPageExtraction['extractedFields'] = {};
    let resolvedUrl = input;
    let fetched = false;
    let metadata: Record<string, string> = {};

    try {
      this.applyUrlDefaults(row, new URL(input));
    } catch {
      row.productUrl = input;
    }

    try {
      const page = await this.fetcher.fetchHtml(input);
      fetched = true;
      resolvedUrl = page.url.toString();
      this.applyUrlDefaults(row, page.url);
      const extracted = this.extractPage({ url: page.url, html: page.html });
      const title = extracted.row.productTitle || '';
      const brand =
        extracted.row.brand || deriveBrand(title, page.url.hostname);
      const details = deriveProductDetails(title);
      mergeExtraction(extracted, 'derived', {
        brand,
        model: extracted.row.model || deriveModel(title, brand),
        variantName: extracted.row.variantName || deriveVariantName(title),
        storageGb: details.storageGb?.toString() ?? '',
        ramGb: details.ramGb?.toString() ?? '',
        color: details.color,
        description: extracted.metadata.description || '',
      });
      this.fillBlanks(row, extracted.row);
      Object.assign(extractedFields, extracted.fields);
      metadata = extracted.metadata;
      warnings.push(...extracted.warnings);
    } catch (reason) {
      warnings.push(
        `Extraction failed: ${reason instanceof Error ? reason.message : 'Unknown error.'}`,
      );
    }

    // Keep the submitted listing URL as the import identity. Redirect targets are
    // returned separately and are persisted after the first refresh.
    row.productUrl = input;

    const missing = requiredFields.filter((field) => !row[field]?.trim());
    if (missing.length) {
      warnings.push(`Complete before import: ${missing.join(', ')}.`);
    }
    if (!row.ean && !row.gtin && !row.mpn) {
      warnings.push(
        'EAN/GTIN/MPN was not found. It is optional, but improves matching.',
      );
    }
    if (!row.color) {
      warnings.push(
        'Color was not detected. Import is allowed, but variant matching will be limited to the same product URL.',
      );
    }
    const status =
      !fetched || !row.productTitle
        ? ExtractionStatus.FAILED
        : missing.length
          ? ExtractionStatus.PARTIAL
          : ExtractionStatus.SUCCESS;
    const extractedRequired = requiredFields.filter((field) =>
      row[field]?.trim(),
    ).length;

    return {
      url: input,
      productTitle: row.productTitle,
      brand: row.brand,
      model: row.model,
      variantName: row.variantName,
      price: row.price,
      currency: row.currency,
      shippingCost: row.shippingCost,
      stockStatus: row.stockStatus,
      imageUrl: row.imageUrl,
      productUrl: row.productUrl,
      originalUrl: input,
      resolvedUrl,
      warnings,
      status,
      row,
      strategies: [
        this.name,
        ...Array.from(
          new Set(
            Object.values(extractedFields).filter(
              (value): value is string => typeof value === 'string',
            ),
          ),
        ),
      ],
      extractedFields,
      metadata: { ...metadata, originalUrl: input, resolvedUrl },
      confidence: Number(
        (extractedRequired / requiredFields.length).toFixed(2),
      ),
    };
  }

  refresh(existingOffer: RefreshableOffer) {
    const url =
      existingOffer.resolvedProductUrl ||
      existingOffer.originalProductUrl ||
      existingOffer.redirectUrl;
    return this.extract(url);
  }

  private emptyRow(): MerchantFeedRow {
    const row = Object.fromEntries(
      MERCHANT_FEED_HEADERS.map((field) => [field, '']),
    ) as MerchantFeedRow;
    row.condition = 'NEW';
    return row;
  }

  private applyUrlDefaults(row: MerchantFeedRow, url: URL) {
    const domain = url.hostname.toLowerCase().replace(/^www\./, '');
    row.productUrl = url.toString();
    row.shopDomain = domain;
    row.shopName = deriveShopNameFromDomain(domain);
    row.condition ||= 'NEW';
  }

  private fillBlanks(
    row: MerchantFeedRow,
    extracted: Partial<MerchantFeedRow>,
  ) {
    for (const field of MERCHANT_FEED_HEADERS) {
      const value = extracted[field];
      if (!row[field] && value) row[field] = value;
    }
  }
}
