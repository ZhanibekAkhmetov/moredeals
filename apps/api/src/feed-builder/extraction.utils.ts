import { load, type CheerioAPI } from 'cheerio';
import type { MerchantFeedRow } from '../merchant-feeds/merchant-feed.types';
import { parseSmartphoneTitle } from '../merchant-feeds/smartphone-normalization';

type JsonObject = Record<string, unknown>;

export type ExtractionSource =
  | 'json-ld'
  | 'app-state'
  | 'meta'
  | 'microdata'
  | 'store-specific'
  | 'fallback'
  | 'derived';

export type ExtractedProduct = {
  row: Partial<MerchantFeedRow>;
  fields: Partial<Record<keyof MerchantFeedRow, ExtractionSource>>;
  warnings: string[];
  metadata: Record<string, string>;
};

export function text(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  return '';
}

function object(value: unknown): JsonObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function namedValue(value: unknown) {
  const item = object(Array.isArray(value) ? value[0] : value);
  return item ? text(item.name) : text(value);
}

function imageValue(value: unknown): string {
  const first: unknown = Array.isArray(value) ? (value as unknown[])[0] : value;
  const item = object(first);
  return item ? text(item.url ?? item.contentUrl) : text(first);
}

export function normalizePrice(value: unknown): string {
  let raw = text(value).replace(/\s|\u00a0/g, '');
  if (!raw) return '';
  raw = raw.replace(/[^\d.,'-]/g, '');
  const match = raw.match(/\d[\d.,']*/)?.[0];
  if (!match) return '';
  const lastComma = match.lastIndexOf(',');
  const lastDot = match.lastIndexOf('.');
  const decimalAt = Math.max(lastComma, lastDot);
  let normalized: string;
  if (decimalAt >= 0 && match.length - decimalAt - 1 <= 2) {
    normalized =
      match.slice(0, decimalAt).replace(/[.,']/g, '') +
      '.' +
      match.slice(decimalAt + 1).replace(/\D/g, '');
  } else {
    normalized = match.replace(/[.,']/g, '');
  }
  const number = Number(normalized);
  return Number.isFinite(number) ? normalized : '';
}

export function normalizeCurrency(value: unknown): string {
  const raw = text(value).toUpperCase();
  if (/\bEUR\b|€/.test(raw)) return 'EUR';
  if (/\bUSD\b|US\$/.test(raw)) return 'USD';
  if (/\bGBP\b|£/.test(raw)) return 'GBP';
  return /^[A-Z]{3}$/.test(raw) ? raw : '';
}

export function normalizeAvailability(value: unknown): string {
  const raw = text(value).toLowerCase().replace(/[_-]/g, ' ');
  if (/out\s*of\s*stock|nicht (?:auf lager|verfügbar)|ausverkauft/.test(raw))
    return 'OUT_OF_STOCK';
  if (/pre[ -]?order|vorbestell/.test(raw)) return 'PREORDER';
  if (/limited|low stock|wenige/.test(raw)) return 'LOW_STOCK';
  if (/in\s*stock|auf lager|lieferbar|verfügbar/.test(raw)) return 'IN_STOCK';
  return '';
}

export function normalizeImageUrl(value: unknown, baseUrl: URL): string {
  const raw = imageValue(value);
  if (!raw || raw.startsWith('data:')) return '';
  try {
    const url = new URL(
      raw.startsWith('//') ? `${baseUrl.protocol}${raw}` : raw,
      baseUrl,
    );
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export function deriveShopNameFromDomain(domain: string): string {
  const normalized = domain.toLowerCase().replace(/^www\./, '');
  if (/(^|\.)amazon\.|(^|\.)amzn\.eu$/.test(normalized)) return 'Amazon';
  if (/(^|\.)mediamarkt\./.test(normalized)) return 'MediaMarkt';
  if (/(^|\.)saturn\./.test(normalized)) return 'Saturn';
  const label = normalized.split('.')[0].replace(/[-_]+/g, ' ');
  return label.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const knownBrands = [
  'Samsung',
  'Apple',
  'Google',
  'Xiaomi',
  'OnePlus',
  'Motorola',
  'Sony',
  'Huawei',
  'Honor',
  'Nokia',
  'Nothing',
  'Oppo',
  'Realme',
  'Asus',
  'Lenovo',
  'Acer',
  'Dell',
  'HP',
  'LG',
  'Bosch',
  'Philips',
  'Nintendo',
  'Microsoft',
];

const invalidExtractedValue =
  /\$\s*\(|\bfunction\b|\b(?:var|const|let)\s+|marketplaceId|<\/?(?:script|html|body)\b|[{};]/i;

export function isValidExtractedIdentity(value: string): boolean {
  const candidate = value.trim();
  return (
    candidate.length >= 2 &&
    candidate.length <= 100 &&
    !invalidExtractedValue.test(candidate)
  );
}

export function deriveBrand(title: string, domain = ''): string {
  const found =
    parseSmartphoneTitle(title).brand ||
    knownBrands.find((brand) =>
      new RegExp(`(?:^|\\s)${brand}(?:\\s|$)`, 'i').test(title),
    );
  if (found) return found;
  const shop = deriveShopNameFromDomain(domain);
  return title.toLowerCase().startsWith(`${shop.toLowerCase()} `) ? shop : '';
}

export function deriveModel(title: string, brand: string): string {
  if (!title || !brand) return '';
  const parsed = parseSmartphoneTitle(title, brand).model;
  if (parsed && isValidExtractedIdentity(parsed)) return parsed;
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const afterBrand = title.match(new RegExp(`${escaped}\\s+(.+)`, 'i'))?.[1];
  if (!afterBrand) return '';
  const phonePatterns: Record<string, RegExp> = {
    samsung: /^(Galaxy\s+[A-Z]?\d+[A-Z]?(?:\s+(?:Ultra|Plus|FE))?)/i,
    apple: /^(iPhone\s+\d+(?:\s+(?:Pro\s+Max|Pro|Plus|Mini|SE))?)/i,
    google: /^(Pixel\s+\d+[A-Z]?(?:\s+(?:Pro\s+XL|Pro|XL|Fold|a))?)/i,
    xiaomi: /^(\d+[A-Z]?(?:\s+(?:Ultra|Pro|Lite))?)/i,
    oneplus: /^(\d+[A-Z]?(?:\s+(?:Pro|R|T))?)/i,
  };
  const knownModel = phonePatterns[brand.toLowerCase()]?.exec(afterBrand)?.[1];
  const model = (knownModel ?? afterBrand)
    .replace(/\b(?:AI\s+)?Smartphone\b.*$/i, '')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:TB|GB|MB)\b.*$/i, '')
    .replace(
      /\b(?:Dual SIM|Single SIM|ohne Vertrag|Handy|mit Galaxy AI|Android|Privacy Display)\b.*$/i,
      '',
    )
    .replace(/[|,;\-–]+$/g, '')
    .trim();
  const value = `${brand} ${model}`.replace(/\s+/g, ' ').trim();
  return isValidExtractedIdentity(value) ? value : '';
}

export function deriveVariantName(title: string): string {
  return parseSmartphoneTitle(title).variantName;
}

export function deriveProductDetails(title: string) {
  const parsed = parseSmartphoneTitle(title);
  return {
    storageGb: parsed.storageGb,
    ramGb: parsed.ramGb,
    color: parsed.color,
  };
}

function add(
  result: ExtractedProduct,
  source: ExtractionSource,
  values: Partial<MerchantFeedRow>,
) {
  for (const [key, value] of Object.entries(values) as [
    keyof MerchantFeedRow,
    string,
  ][]) {
    if (
      (key === 'brand' || key === 'model') &&
      value &&
      !isValidExtractedIdentity(value)
    ) {
      const warning = `Ignored invalid ${key} value from ${source}.`;
      if (!result.warnings.includes(warning)) result.warnings.push(warning);
      continue;
    }
    if (value && !result.row[key]) {
      result.row[key] = value;
      result.fields[key] = source;
    }
  }
}

function collectProducts(value: unknown, products: JsonObject[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectProducts(item, products));
    return;
  }
  const item = object(value);
  if (!item) return;
  const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
  if (
    types.some((type) => {
      const normalized = text(type).toLowerCase();
      return (
        normalized.endsWith('product') || normalized.endsWith('productgroup')
      );
    })
  )
    products.push(item);
  for (const child of Object.values(item)) collectProducts(child, products);
}

function firstJsonLdProduct(html: string): JsonObject | undefined {
  const $ = load(html);
  const products: JsonObject[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      collectProducts(
        JSON.parse($(element).text().trim()) as unknown,
        products,
      );
    } catch {
      // A malformed block must not prevent extraction from later blocks.
    }
  });
  return products[0];
}

export function extractJsonLd(
  html: string,
  url: URL,
): Partial<MerchantFeedRow> {
  const product = firstJsonLdProduct(html);
  if (!product) return {};
  const rawOffers: unknown = product.offers;
  const offersValue: unknown = Array.isArray(rawOffers)
    ? (rawOffers as unknown[])[0]
    : rawOffers;
  const offer = object(offersValue) ?? {};
  const rating = object(product.aggregateRating) ?? {};
  return {
    productTitle: text(product.name),
    brand: namedValue(product.brand),
    model: text(product.model),
    ean: text(product.ean),
    gtin: text(
      product.gtin ??
        product.gtin14 ??
        product.gtin13 ??
        product.gtin12 ??
        product.gtin8,
    ),
    mpn: text(product.mpn),
    price: normalizePrice(offer.price ?? offer.lowPrice),
    currency: normalizeCurrency(offer.priceCurrency),
    stockStatus: normalizeAvailability(offer.availability),
    productRating: text(rating.ratingValue),
    productReviewCount: text(rating.reviewCount ?? rating.ratingCount),
    imageUrl: normalizeImageUrl(product.image, url),
    productUrl: text(offer.url) ? normalizeImageUrl(offer.url, url) : '',
  };
}

export function extractJsonLdMetadata(html: string): Record<string, string> {
  const product = firstJsonLdProduct(html);
  if (!product) return {};
  return {
    description: text(product.description),
    sku: text(product.sku),
  };
}

function findJsonValue(value: unknown, keys: string[], depth = 0): unknown {
  if (depth > 10 || value === null) return undefined;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 100)) {
      const found = findJsonValue(item, keys, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const item = object(value);
  if (!item) return undefined;
  for (const key of keys) {
    const actual = Object.keys(item).find(
      (candidate) => candidate.toLowerCase() === key,
    );
    const candidate = actual ? item[actual] : undefined;
    if (candidate !== undefined && candidate !== null && text(candidate))
      return candidate;
  }
  for (const child of Object.values(item).slice(0, 200)) {
    const found = findJsonValue(child, keys, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function extractAppState($: CheerioAPI, url: URL): Partial<MerchantFeedRow> {
  const states: unknown[] = [];
  $('script#__NEXT_DATA__, script[type="application/json"]').each(
    (_, element) => {
      const raw = $(element).text().trim();
      if (!raw || raw.length > 5_000_000) return;
      try {
        states.push(JSON.parse(raw) as unknown);
      } catch {
        /* ignore */
      }
    },
  );
  for (const state of states) {
    const title = findJsonValue(state, [
      'productname',
      'producttitle',
      'title',
      'name',
    ]);
    if (!title) continue;
    return {
      productTitle: text(title),
      brand: namedValue(findJsonValue(state, ['brandname', 'brand'])),
      model: text(findJsonValue(state, ['modelname', 'model'])),
      ean: text(findJsonValue(state, ['ean'])),
      gtin: text(findJsonValue(state, ['gtin14', 'gtin13', 'gtin'])),
      mpn: text(findJsonValue(state, ['mpn'])),
      price: normalizePrice(
        findJsonValue(state, ['saleprice', 'currentprice', 'price']),
      ),
      currency: normalizeCurrency(
        findJsonValue(state, ['pricecurrency', 'currencycode', 'currency']),
      ),
      stockStatus: normalizeAvailability(
        findJsonValue(state, ['availability', 'stockstatus']),
      ),
      imageUrl: normalizeImageUrl(
        findJsonValue(state, ['primaryimage', 'imageurl', 'image']),
        url,
      ),
    };
  }
  return {};
}

function meta($: CheerioAPI, selector: string) {
  return $(selector).first().attr('content')?.trim() ?? '';
}

function itemValue($: CheerioAPI, itemprop: string) {
  const element = $(`[itemprop="${itemprop}"]`).first();
  return text(
    element.attr('content') ??
      element.attr('href') ??
      element.attr('src') ??
      element.text(),
  );
}

export function extractGenericProduct(
  html: string,
  url: URL,
): ExtractedProduct {
  const result: ExtractedProduct = {
    row: {},
    fields: {},
    warnings: [],
    metadata: extractJsonLdMetadata(html),
  };
  const $ = load(html);
  result.metadata.description ||=
    meta($, 'meta[name="description"]') ||
    meta($, 'meta[property="og:description"]');
  add(result, 'json-ld', extractJsonLd(html, url));
  add(result, 'app-state', extractAppState($, url));
  add(result, 'meta', {
    productTitle:
      meta($, 'meta[property="og:title"]') ||
      meta($, 'meta[name="twitter:title"]'),
    brand:
      meta($, 'meta[property="product:brand"]') ||
      meta($, 'meta[name="brand"]'),
    model: meta($, 'meta[name="model"]'),
    ean: meta($, 'meta[name="ean"]'),
    gtin: meta($, 'meta[name="gtin"]'),
    mpn: meta($, 'meta[name="mpn"]'),
    price: normalizePrice(
      meta($, 'meta[property="product:price:amount"]') ||
        meta($, 'meta[property="og:price:amount"]'),
    ),
    currency: normalizeCurrency(
      meta($, 'meta[property="product:price:currency"]') ||
        meta($, 'meta[property="og:price:currency"]'),
    ),
    stockStatus: normalizeAvailability(
      meta($, 'meta[property="product:availability"]'),
    ),
    imageUrl: normalizeImageUrl(
      meta($, 'meta[property="og:image"]') ||
        meta($, 'meta[name="twitter:image"]'),
      url,
    ),
  });
  add(result, 'microdata', {
    productTitle: itemValue($, 'name'),
    brand: itemValue($, 'brand'),
    model: itemValue($, 'model'),
    ean: itemValue($, 'ean'),
    gtin:
      itemValue($, 'gtin') || itemValue($, 'gtin13') || itemValue($, 'gtin14'),
    mpn: itemValue($, 'mpn'),
    price: normalizePrice(itemValue($, 'price')),
    currency: normalizeCurrency(itemValue($, 'priceCurrency')),
    stockStatus: normalizeAvailability(itemValue($, 'availability')),
    imageUrl: normalizeImageUrl(itemValue($, 'image'), url),
  });
  add(result, 'fallback', {
    productTitle:
      $('h1').first().text().trim() || $('title').first().text().trim(),
  });
  return result;
}

export function mergeExtraction(
  target: ExtractedProduct,
  source: ExtractionSource,
  values: Partial<MerchantFeedRow>,
) {
  add(target, source, values);
}
