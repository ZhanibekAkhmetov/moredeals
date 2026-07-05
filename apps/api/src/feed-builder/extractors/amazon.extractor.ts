import { Injectable } from '@nestjs/common';
import { load } from 'cheerio';
import type { ExtractionContext } from '../feed-builder.types';
import {
  deriveBrand, deriveModel, deriveProductDetails, deriveVariantName, extractGenericProduct,
  isValidExtractedIdentity,
  mergeExtraction, normalizeAvailability, normalizeImageUrl, normalizePrice,
} from '../extraction.utils';
import { SafePageFetcher } from '../safe-page-fetcher.service';
import { BaseProductPageExtractor } from './product.extractor';

@Injectable()
export class AmazonExtractor extends BaseProductPageExtractor {
  readonly name = 'AmazonExtractor';

  constructor(fetcher: SafePageFetcher) {
    super(fetcher);
  }

  canHandle(url: URL) {
    const domain = url.hostname.toLowerCase().replace(/^www\./, '');
    return (
      domain === 'amzn.eu' ||
      domain.includes('.amazon.') ||
      domain.startsWith('amazon.')
    );
  }

  protected extractPage({ html, url }: ExtractionContext) {
    const result = extractGenericProduct(html, url);
    const $ = load(html);
    if (/captcha|robot check|enter the characters you see below|sorry, we just need to make sure/i.test(html)) {
      result.warnings.push('Amazon page could not be extracted from server-side fetch. Fill fields manually or use a merchant feed/API.');
      return result;
    }
    const title = $('#productTitle').first().text().trim();
    const bullets = $('#detailBullets_feature_div, #productDetails_feature_div, #prodDetails').text().replace(/\s+/g, ' ');
    const detail = (label: string) => bullets.match(new RegExp(`${label}\\s*[:：]?\\s*([^|;]{2,80})`, 'i'))?.[1]?.trim() ?? '';
    const image = $('#landingImage').attr('data-old-hires') || $('#landingImage').attr('src') || $('#imgTagWrapperId img').attr('src');
    const priceText = $('#priceblock_ourprice, #priceblock_dealprice, #corePrice_feature_div .a-offscreen, #corePriceDisplay_desktop_feature_div .a-offscreen').first().text();
    const derivedBrand = deriveBrand(title, url.hostname);
    const extractedBrand = detail('Brand|Marke');
    const extractedModel = detail('Item model number|Modellnummer|Model');
    const brand = isValidExtractedIdentity(extractedBrand) ? extractedBrand : derivedBrand;
    const model = isValidExtractedIdentity(extractedModel)
      ? extractedModel
      : deriveModel(title, brand);
    const details = deriveProductDetails(title);
    mergeExtraction(result, 'store-specific', {
      productTitle: title,
      brand,
      model,
      mpn: detail('Part Number|Herstellerreferenz'),
      imageUrl: normalizeImageUrl(image, url),
      price: normalizePrice(priceText),
      currency: /€|EUR/.test(priceText) ? 'EUR' : '',
      stockStatus: normalizeAvailability($('#availability').text()),
      variantName: deriveVariantName(title),
      storageGb: details.storageGb?.toString() ?? '',
      ramGb: details.ramGb?.toString() ?? '',
      color: details.color,
      description: result.metadata.description || '',
    });
    const titleModel = deriveModel(title, derivedBrand);
    if (derivedBrand) {
      result.row.brand = derivedBrand;
      result.fields.brand = 'derived';
    }
    if (titleModel) {
      result.row.model = titleModel;
      result.fields.model = 'derived';
    }
    if (result.row.variantName) result.fields.variantName = 'derived';
    return result;
  }
}
