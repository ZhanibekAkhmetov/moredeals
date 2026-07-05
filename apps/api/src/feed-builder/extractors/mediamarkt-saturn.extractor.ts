import { Injectable } from '@nestjs/common';
import { load } from 'cheerio';
import type { MerchantFeedRow } from '../../merchant-feeds/merchant-feed.types';
import type { ExtractionContext } from '../feed-builder.types';
import {
  deriveBrand,
  deriveModel,
  deriveProductDetails,
  deriveVariantName,
  extractGenericProduct,
  mergeExtraction,
  normalizeAvailability,
  normalizeCurrency,
  normalizeImageUrl,
  normalizePrice,
  text,
} from '../extraction.utils';
import { SafePageFetcher } from '../safe-page-fetcher.service';
import { BaseProductPageExtractor } from './product.extractor';

@Injectable()
export class MediaMarktSaturnExtractor extends BaseProductPageExtractor {
  readonly name = 'MediaMarktSaturnExtractor';

  constructor(fetcher: SafePageFetcher) {
    super(fetcher);
  }

  canHandle(url: URL) {
    const domain = url.hostname.toLowerCase().replace(/^www\./, '');
    return (
      domain.includes('.mediamarkt.') ||
      domain.startsWith('mediamarkt.') ||
      domain.includes('.saturn.') ||
      domain.startsWith('saturn.')
    );
  }

  protected extractPage({ html, url }: ExtractionContext) {
    // Generic extraction is deliberately ordered JSON-LD, embedded state, meta,
    // microdata and conservative HTML fallback.
    const result = extractGenericProduct(html, url);
    const $ = load(html);
    const pageText = $('body').text().replace(/\s+/g, ' ').trim();
    const title = (
      result.row.productTitle ||
      $('h1').first().text() ||
      $('meta[property="og:title"]').attr('content') ||
      ''
    )
      .replace(/\s*[|-]\s*(?:MediaMarkt|Saturn).*$/i, '')
      .trim();

    const brand = deriveBrand(title, url.hostname);
    const model = deriveModel(title, brand);
    const variantName = deriveVariantName(title);
    const details = deriveProductDetails(title);
    const identifiers = this.identifiers(pageText);
    const delivery = this.deliveryDays(pageText);
    const shippingText = pageText.match(
      /(?:Versandkosten|Lieferkosten)\s*(?::|ab)?\s*([\d.,]+\s*(?:€|EUR)|kostenlos|gratis)/i,
    )?.[1];
    const specificPrice =
      $('[data-test="product-price"], [data-test="price"], [itemprop="price"]')
        .first()
        .attr('content') ||
      $('[data-test="product-price"], [data-test="price"]').first().text();
    const image =
      $('meta[property="og:image"]').attr('content') ||
      $('img[itemprop="image"]').first().attr('src') ||
      $('main img').first().attr('src');

    mergeExtraction(result, 'store-specific', {
      productTitle: title,
      ean: identifiers.ean,
      gtin: identifiers.gtin,
      mpn: identifiers.mpn,
      price: normalizePrice(specificPrice),
      shippingCost: /kostenlos|gratis/i.test(shippingText ?? '')
        ? '0'
        : normalizePrice(shippingText),
      currency:
        normalizeCurrency(specificPrice) ||
        normalizeCurrency(shippingText) ||
        'EUR',
      deliveryMinDays: delivery.min?.toString() ?? '',
      deliveryMaxDays: delivery.max?.toString() ?? '',
      stockStatus: normalizeAvailability(
        $('[itemprop="availability"]').attr('href') || pageText,
      ),
      paymentMethods: this.paymentMethods(pageText),
      imageUrl: normalizeImageUrl(image, url),
      description: result.metadata.description || '',
    });

    // For these stores, title-derived identity is more reliable than generic
    // embedded keys such as `model`, which can refer to unrelated app state.
    this.setDerived(result.row, result.fields, 'brand', brand);
    this.setDerived(result.row, result.fields, 'model', model);
    this.setDerived(result.row, result.fields, 'variantName', variantName);
    this.setDerived(
      result.row,
      result.fields,
      'storageGb',
      details.storageGb?.toString() ?? '',
    );
    this.setDerived(
      result.row,
      result.fields,
      'ramGb',
      details.ramGb?.toString() ?? '',
    );
    this.setDerived(result.row, result.fields, 'color', details.color);

    return result;
  }

  private setDerived(
    row: Partial<MerchantFeedRow>,
    fields: Partial<Record<keyof MerchantFeedRow, string>>,
    key: keyof MerchantFeedRow,
    value: string,
  ) {
    if (!value) return;
    row[key] = value;
    fields[key] = 'derived';
  }

  private identifiers(pageText: string) {
    const numeric = (labels: string) =>
      text(
        pageText.match(
          new RegExp(`(?:${labels})\\s*(?::|Nr\\.?|Nummer)?\\s*(\\d{8,14})\\b`, 'i'),
        )?.[1],
      );
    const mpn = text(
      pageText.match(
        /(?:MPN|Hersteller(?:artikel)?nummer)\s*(?::|Nr\.?|Nummer)?\s*([A-Z0-9][A-Z0-9./-]{4,30})/i,
      )?.[1],
    );
    return {
      ean: numeric('EAN|European Article Number'),
      gtin: numeric('GTIN'),
      mpn,
    };
  }

  private deliveryDays(pageText: string) {
    const range = pageText.match(
      /(?:Lieferung|Lieferzeit)[^.!]{0,50}?(\d+)\s*(?:-|bis)\s*(\d+)\s*(?:Werk)?tage/i,
    );
    if (range) return { min: Number(range[1]), max: Number(range[2]) };
    const single = pageText.match(
      /(?:Lieferung|Lieferzeit)[^.!]{0,50}?(\d+)\s*(?:Werk)?tage/i,
    );
    return single
      ? { min: Number(single[1]), max: Number(single[1]) }
      : {};
  }

  private paymentMethods(pageText: string) {
    const methods = [
      [/PayPal/i, 'PAYPAL'],
      [/Klarna/i, 'KLARNA'],
      [/Kreditkarte/i, 'CREDIT_CARD'],
      [/Apple Pay/i, 'APPLE_PAY'],
      [/Google Pay/i, 'GOOGLE_PAY'],
      [/Bank(?:überweisung|ueberweisung)/i, 'BANK_TRANSFER'],
    ] as const;
    return methods
      .filter(([pattern]) => pattern.test(pageText))
      .map(([, method]) => method)
      .join('|');
  }
}
