import { Injectable } from '@nestjs/common';
import type { MerchantFeedRow } from './merchant-feed.types';
import {
  extractSmartphoneColor,
  normalizeSmartphoneColor,
  parseSmartphoneTitle,
} from './smartphone-normalization';

type VariantIdentity = {
  name: string;
  storageGb: number;
  color: string | null;
  ramGb: number | null;
};

const noise = [
  /\bdual\s*sim\b/gi,
  /\bohne\s+vertrag\b/gi,
  /\bhandy\b/gi,
  /\bsmartphone\b/gi,
  /\bmit\s+galaxy\s+ai\b/gi,
  /\bandroid\b/gi,
  /\bprivacy\s+display\b/gi,
  /\b\d+\s*mp\b/gi,
  /\b\d+\s*jahre?\s+herstellergarantie\b/gi,
  /\bherstellergarantie\b/gi,
  /\bexklusiv\s+auf\s+amazon\b/gi,
];

@Injectable()
export class ProductMatchingService {
  normalize(value: string) {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/ß/g, 'ss')
      .replace(/(\d+)\s*(tb|gb)/g, '$1$2')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  productKey(brand: string, model: string) {
    const normalizedBrand = this.normalize(brand);
    let normalizedModel = this.removeNoise(model);
    if (normalizedModel.startsWith(`${normalizedBrand} `)) {
      normalizedModel = normalizedModel.slice(normalizedBrand.length + 1);
    }
    return `${normalizedBrand}|${normalizedModel}`;
  }

  sameProduct(
    row: Pick<MerchantFeedRow, 'brand' | 'model'>,
    product: { brand: string; modelNumber: string | null; name: string },
  ) {
    return (
      this.productKey(row.brand, row.model) ===
      this.productKey(product.brand, product.modelNumber || product.name)
    );
  }

  variantDetails(row: MerchantFeedRow): VariantIdentity {
    const parsed = parseSmartphoneTitle(
      `${row.productTitle} ${row.variantName}`,
      row.brand,
    );
    const storageGb = row.storageGb?.trim()
      ? Number(row.storageGb)
      : (parsed.storageGb ?? 0);
    const ramGb = row.ramGb?.trim() ? Number(row.ramGb) : parsed.ramGb;
    const color =
      extractSmartphoneColor(row.color) ||
      extractSmartphoneColor(row.variantName) ||
      parsed.color;
    return {
      name: row.variantName || parsed.variantName,
      storageGb,
      ramGb,
      color,
    };
  }

  sameVariant(incoming: VariantIdentity, existing: VariantIdentity) {
    if (incoming.storageGb !== existing.storageGb) return false;
    const incomingColor = normalizeSmartphoneColor(incoming.color);
    const existingColor = normalizeSmartphoneColor(existing.color);
    if (!incomingColor || !existingColor || incomingColor !== existingColor) {
      return false;
    }
    if (incoming.ramGb && existing.ramGb && incoming.ramGb !== existing.ramGb) {
      return false;
    }
    return true;
  }

  canonicalVariantName(details: VariantIdentity) {
    return [details.storageGb ? `${details.storageGb} GB` : '', details.color]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  private removeNoise(value: string) {
    let cleaned = value;
    for (const pattern of noise) cleaned = cleaned.replace(pattern, ' ');
    return this.normalize(cleaned.replace(/\[[^\]]*]/g, ' '));
  }

  private colorFromVariant(value: string) {
    return value
      .replace(/\b\d+(?:[.,]\d+)?\s*(?:TB|GB)\b/i, '')
      .replace(/^\s*[-–·/]\s*/, '')
      .trim();
  }

  private normalizeColor(value: string) {
    const normalized = this.normalize(value);
    const aliases: Record<string, string> = {
      schwarz: 'black',
      weiss: 'white',
      grau: 'grey',
      gray: 'grey',
      blau: 'blue',
      grun: 'green',
      rot: 'red',
    };
    return aliases[normalized] ?? normalized;
  }
}
