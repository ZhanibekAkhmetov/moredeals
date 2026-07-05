import {
  MerchantFeedImportStatus,
  OfferSource,
  PaymentMethod,
  Prisma,
  ProductCondition,
  StockStatus,
} from '@moredeals/database';
import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../database/prisma.service';
import { MERCHANT_FEED_HEADERS } from './merchant-feed.template';
import type {
  MerchantFeedImportSummary,
  MerchantFeedRow,
  MerchantFeedRowError,
} from './merchant-feed.types';
import { ProductMatchingService } from './product-matching.service';

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

@Injectable()
export class MerchantFeedsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: ProductMatchingService,
  ) {}

  async import(
    sourceName: string,
    csvText: string,
  ): Promise<MerchantFeedImportSummary> {
    const feedImport = await this.prisma.merchantFeedImport.create({
      data: { sourceName },
    });
    const errors: MerchantFeedRowError[] = [];
    let rows: MerchantFeedRow[];

    try {
      rows = parse(csvText, {
        bom: true,
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: false,
      });
      this.validateHeaders(rows, csvText);
    } catch (reason) {
      const message = this.errorMessage(reason);
      errors.push({ row: 1, message });
      await this.finishImport(feedImport.id, {
        importedRows: 0,
        failedRows: 1,
        createdOffers: 0,
        updatedOffers: 0,
        priceSnapshotsCreated: 0,
        errors,
      });
      return {
        importId: feedImport.id,
        importedRows: 0,
        failedRows: 1,
        createdOffers: 0,
        updatedOffers: 0,
        priceSnapshotsCreated: 0,
        errors,
      };
    }

    let importedRows = 0;
    let createdOffers = 0;
    let updatedOffers = 0;
    let priceSnapshotsCreated = 0;

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      try {
        const result = await this.importRow(
          feedImport.id,
          sourceName,
          row,
          rowNumber,
        );
        importedRows += 1;
        if (result.created) createdOffers += 1;
        else updatedOffers += 1;
        priceSnapshotsCreated += 1;
      } catch (reason) {
        const message = this.errorMessage(reason);
        errors.push({ row: rowNumber, message });
        await this.prisma.rawMerchantOffer.create({
          data: {
            importId: feedImport.id,
            rowNumber,
            rawData: row,
            errorMessage: message,
          },
        });
      }
    }

    const summary = {
      importId: feedImport.id,
      importedRows,
      failedRows: errors.length,
      createdOffers,
      updatedOffers,
      priceSnapshotsCreated,
      errors,
    };
    await this.finishImport(feedImport.id, summary, rows[0]);
    return summary;
  }

  private async importRow(
    importId: string,
    sourceName: string,
    row: MerchantFeedRow,
    rowNumber: number,
  ) {
    this.validateRow(row);
    const shopDomain = this.normalizeDomain(row.shopDomain);
    const productUrl = this.validateUrl(row.productUrl, 'productUrl');
    const imageUrl = row.imageUrl
      ? this.validateUrl(row.imageUrl, 'imageUrl')
      : null;
    const price = this.decimal(row.price, 'price');
    const shippingCost = row.shippingCost
      ? this.decimal(row.shippingCost, 'shippingCost')
      : 0;
    const totalPrice = Number((price + shippingCost).toFixed(2));
    const condition = this.condition(row.condition);
    const stockStatus = this.stockStatus(row.stockStatus);
    const paymentMethods = this.paymentMethods(row.paymentMethods);
    const deliveryMinDays = this.optionalInteger(
      row.deliveryMinDays,
      'deliveryMinDays',
    );
    const deliveryMaxDays = this.optionalInteger(
      row.deliveryMaxDays,
      'deliveryMaxDays',
    );
    if (
      deliveryMinDays !== null &&
      deliveryMaxDays !== null &&
      deliveryMinDays > deliveryMaxDays
    ) {
      throw new Error('deliveryMinDays cannot exceed deliveryMaxDays.');
    }

    return this.prisma.$transaction(async (tx) => {
      let shop = await tx.shop.findFirst({
        where: { baseUrl: `https://${shopDomain}` },
      });
      const storeRating = this.optionalRating(row.storeRating, 'storeRating');
      const storeReviewCount = this.optionalInteger(
        row.storeReviewCount,
        'storeReviewCount',
      );

      if (shop) {
        shop = await tx.shop.update({
          where: { id: shop.id },
          data: {
            name: row.shopName,
            trustpilotRating: storeRating,
            trustpilotReviewCount: storeReviewCount,
          },
        });
      } else {
        shop = await tx.shop.create({
          data: {
            name: row.shopName,
            slug: await this.uniqueShopSlug(tx, row.shopName, shopDomain),
            baseUrl: `https://${shopDomain}`,
            trustpilotRating: storeRating,
            trustpilotReviewCount: storeReviewCount,
          },
        });
      }

      const returnDays = this.optionalInteger(row.returnDays, 'returnDays');
      if (returnDays !== null) {
        await tx.returnPolicy.upsert({
          where: { shopId: shop.id },
          create: {
            shopId: shop.id,
            returnPeriodDays: returnDays,
            returnShippingPaidBy: this.returnShippingPaidBy(row.returnShipping),
            returnShippingDetails: row.returnShipping || null,
          },
          update: {
            returnPeriodDays: returnDays,
            returnShippingPaidBy: this.returnShippingPaidBy(row.returnShipping),
            returnShippingDetails: row.returnShipping || null,
          },
        });
      }

      const existingOffers = await tx.offer.findMany({
        where: { shopId: shop.id },
        select: {
          id: true,
          variantId: true,
          redirectUrl: true,
          originalProductUrl: true,
          resolvedProductUrl: true,
          variant: {
            select: {
              id: true,
              productId: true,
              name: true,
              storageGb: true,
              color: true,
              ramGb: true,
              imageUrl: true,
            },
          },
        },
      });
      const existingOffer = existingOffers.find((offer) =>
        [
          offer.resolvedProductUrl,
          offer.originalProductUrl,
          offer.redirectUrl,
        ].some((candidate) => this.sameUrl(candidate, productUrl)),
      );

      const productCandidates = await tx.product.findMany();
      let product = productCandidates.find((candidate) =>
        this.matching.sameProduct(row, candidate),
      );
      if (product) {
        product = await tx.product.update({
          where: { id: product.id },
          data: {
            name: row.model,
            modelNumber: row.model,
            description: product.description
              ? undefined
              : row.description || undefined,
            imageUrl: product.imageUrl ? undefined : (imageUrl ?? undefined),
          },
        });
      } else {
        product = await tx.product.create({
          data: {
            name: row.model,
            slug: await this.uniqueProductSlug(tx, `${row.brand}-${row.model}`),
            brand: row.brand,
            modelNumber: row.model,
            description: row.description || null,
            imageUrl,
          },
        });
      }

      const variantDetails = this.matching.variantDetails(row);
      if (
        !Number.isInteger(variantDetails.storageGb) ||
        variantDetails.storageGb < 0
      ) {
        throw new Error('storageGb must be a non-negative integer.');
      }
      if (
        variantDetails.ramGb !== null &&
        (!Number.isInteger(variantDetails.ramGb) || variantDetails.ramGb < 0)
      ) {
        throw new Error('ramGb must be a non-negative integer.');
      }
      const identifiers = [
        row.ean ? { ean: row.ean } : null,
        row.gtin ? { gtin: row.gtin } : null,
        row.mpn ? { mpn: row.mpn } : null,
      ].filter((value): value is NonNullable<typeof value> => value !== null);
      let variant = identifiers.length
        ? await tx.productVariant.findFirst({ where: { OR: identifiers } })
        : null;

      if (!variant) {
        const variantCandidates = await tx.productVariant.findMany({
          where: { productId: product.id },
        });
        variant =
          variantCandidates.find((candidate) =>
            this.matching.sameVariant(variantDetails, candidate),
          ) ?? null;
      }

      if (
        !variant &&
        existingOffer?.variant.productId === product.id &&
        (!variantDetails.color || !existingOffer.variant.color)
      ) {
        // Same URL is the only safe identity for an unknown color. It also lets
        // a later extraction enrich an old storage-only variant in place.
        variant = await tx.productVariant.findUnique({
          where: { id: existingOffer.variant.id },
        });
      }

      if (variant && variant.productId !== product.id) {
        throw new Error(
          'A product identifier is already assigned to another product.',
        );
      }

      if (variant) {
        const color = variantDetails.color || variant.color || null;
        const storageGb = variantDetails.storageGb || variant.storageGb;
        variant = await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            name:
              this.matching.canonicalVariantName({
                ...variantDetails,
                color,
                storageGb,
              }) || row.variantName,
            color,
            storageGb,
            ramGb: variantDetails.ramGb ?? undefined,
            imageUrl: imageUrl ?? undefined,
            ean: row.ean || undefined,
            gtin: row.gtin || undefined,
            mpn: row.mpn || undefined,
          },
        });
      } else {
        variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            name:
              this.matching.canonicalVariantName(variantDetails) ||
              row.variantName,
            sku: await this.uniqueSku(
              tx,
              row.ean ||
                row.gtin ||
                row.mpn ||
                `${product.id}-${row.variantName}-${productUrl}`,
            ),
            color: variantDetails.color || null,
            storageGb: variantDetails.storageGb,
            ramGb: variantDetails.ramGb,
            imageUrl,
            ean: row.ean || null,
            gtin: row.gtin || null,
            mpn: row.mpn || null,
          },
        });
      }

      const offerToUpsert =
        existingOffers.find(
          (offer) =>
            offer.variantId === variant.id &&
            [
              offer.resolvedProductUrl,
              offer.originalProductUrl,
              offer.redirectUrl,
            ].some((candidate) => this.sameUrl(candidate, productUrl)),
        ) ?? existingOffer;
      const productRating = this.optionalRating(
        row.productRating,
        'productRating',
      );
      const productReviewCount = this.optionalInteger(
        row.productReviewCount,
        'productReviewCount',
      );
      const offerData = {
        variantId: variant.id,
        condition,
        price,
        shippingCost,
        totalPrice,
        currency: row.currency.toUpperCase(),
        deliveryMinDays,
        deliveryMaxDays,
        stockStatus,
        paymentMethods,
        shopProductRating: productRating,
        shopProductReviewCount: productReviewCount,
        matchConfidence: 1,
        redirectUrl: productUrl,
        imageUrl: imageUrl ?? undefined,
        source: OfferSource.IMPORTED_FEED,
        sourceName,
        originalProductUrl: productUrl,
        resolvedProductUrl: undefined,
        merchantFeedImportId: importId,
      };
      const offer = offerToUpsert
        ? await tx.offer.update({
            where: { id: offerToUpsert.id },
            data: offerData,
          })
        : await tx.offer.create({
            data: {
              ...offerData,
              shopId: shop.id,
            },
          });

      const warrantyMonths = this.optionalInteger(
        row.warrantyMonths,
        'warrantyMonths',
      );
      if (warrantyMonths !== null) {
        await tx.warrantyInfo.upsert({
          where: { offerId: offer.id },
          create: {
            offerId: offer.id,
            durationMonths: warrantyMonths,
            provider: shop.name,
            type: 'Merchant feed warranty',
          },
          update: {
            durationMonths: warrantyMonths,
            provider: shop.name,
            type: 'Merchant feed warranty',
          },
        });
      }

      await tx.priceSnapshot.create({
        data: {
          offerId: offer.id,
          price,
          shippingCost,
          totalPrice,
          capturedAt: new Date(Date.now() + rowNumber),
        },
      });
      await tx.rawMerchantOffer.create({
        data: {
          importId,
          rowNumber,
          rawData: row,
          imported: true,
          offerId: offer.id,
        },
      });

      return { created: !offerToUpsert };
    });
  }

  private validateHeaders(rows: MerchantFeedRow[], csvText: string) {
    const firstLine = csvText.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0];
    const headers = firstLine.split(',').map((header) => header.trim());
    const missingHeaders = MERCHANT_FEED_HEADERS.filter(
      (header) => !headers.includes(header),
    );
    if (missingHeaders.length) {
      throw new Error(`Missing CSV columns: ${missingHeaders.join(', ')}.`);
    }
    if (!rows.length) throw new Error('The CSV contains no data rows.');
  }

  private validateRow(row: MerchantFeedRow) {
    const missing = requiredFields.filter((field) => !row[field]?.trim());
    if (missing.length) {
      throw new Error(`Missing required fields: ${missing.join(', ')}.`);
    }
    if (!/^[A-Z]{3}$/i.test(row.currency)) {
      throw new Error('currency must be a three-letter ISO code.');
    }
    const invalidIdentity =
      /\$\s*\(|\bfunction\b|\b(?:var|const|let)\s+|marketplaceId|<\/?(?:script|html|body)\b|[{};]/i;
    if (invalidIdentity.test(row.brand) || invalidIdentity.test(row.model)) {
      throw new Error(
        'brand and model must not contain script or HTML fragments.',
      );
    }
  }

  private async finishImport(
    importId: string,
    summary: Omit<MerchantFeedImportSummary, 'importId'>,
    firstRow?: MerchantFeedRow,
  ) {
    const status =
      summary.failedRows === 0
        ? MerchantFeedImportStatus.COMPLETED
        : summary.importedRows > 0
          ? MerchantFeedImportStatus.PARTIAL
          : MerchantFeedImportStatus.FAILED;
    await this.prisma.merchantFeedImport.update({
      where: { id: importId },
      data: {
        shopName: firstRow?.shopName || null,
        shopDomain: firstRow ? this.normalizeDomain(firstRow.shopDomain) : null,
        status,
        importedRows: summary.importedRows,
        failedRows: summary.failedRows,
        createdOffers: summary.createdOffers,
        updatedOffers: summary.updatedOffers,
        priceSnapshotsCreated: summary.priceSnapshotsCreated,
        errorMessages: summary.errors,
        completedAt: new Date(),
      },
    });
  }

  private normalizeDomain(value: string) {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '');
    const domain = normalized.split('/')[0].replace(/^www\./, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      throw new Error('shopDomain must be a valid domain.');
    }
    return domain;
  }

  private validateUrl(value: string, field: string) {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      return url.toString();
    } catch {
      throw new Error(`${field} must be a valid HTTP URL.`);
    }
  }

  private sameUrl(left: string | null, right: string) {
    if (!left) return false;
    try {
      const leftUrl = new URL(left);
      const rightUrl = new URL(right);
      leftUrl.hash = '';
      rightUrl.hash = '';
      return leftUrl.toString() === rightUrl.toString();
    } catch {
      return left === right;
    }
  }

  private decimal(value: string, field: string) {
    const normalized = value.trim().replace(',', '.');
    const number = Number(normalized);
    if (!Number.isFinite(number) || number < 0) {
      throw new Error(`${field} must be a non-negative number.`);
    }
    return number;
  }

  private optionalInteger(value: string, field: string) {
    if (!value?.trim()) return null;
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) {
      throw new Error(`${field} must be a non-negative integer.`);
    }
    return number;
  }

  private optionalRating(value: string, field: string) {
    if (!value?.trim()) return null;
    const rating = this.decimal(value, field);
    if (rating > 5) throw new Error(`${field} must be between 0 and 5.`);
    return rating;
  }

  private condition(value: string) {
    const normalized = value?.trim().toUpperCase() || 'NEW';
    const conditions: Record<string, ProductCondition> = {
      NEW: ProductCondition.NEW,
      REFURBISHED: ProductCondition.REFURBISHED,
      REFURB: ProductCondition.REFURBISHED,
      USED: ProductCondition.USED,
    };
    if (!conditions[normalized])
      throw new Error(`Unsupported condition: ${value}.`);
    return conditions[normalized];
  }

  private stockStatus(value: string) {
    const normalized =
      value?.trim().toUpperCase().replaceAll(' ', '_') || 'UNKNOWN';
    const statuses = StockStatus as Record<string, StockStatus>;
    if (!statuses[normalized])
      throw new Error(`Unsupported stockStatus: ${value}.`);
    return statuses[normalized];
  }

  private paymentMethods(value: string) {
    if (!value?.trim()) return [];
    const aliases: Record<string, PaymentMethod> = {
      CARD: PaymentMethod.CREDIT_CARD,
      CREDITCARD: PaymentMethod.CREDIT_CARD,
      CREDIT_CARD: PaymentMethod.CREDIT_CARD,
      PAYPAL: PaymentMethod.PAYPAL,
      KLARNA: PaymentMethod.KLARNA,
      BANKTRANSFER: PaymentMethod.BANK_TRANSFER,
      BANK_TRANSFER: PaymentMethod.BANK_TRANSFER,
      APPLEPAY: PaymentMethod.APPLE_PAY,
      APPLE_PAY: PaymentMethod.APPLE_PAY,
      GOOGLEPAY: PaymentMethod.GOOGLE_PAY,
      GOOGLE_PAY: PaymentMethod.GOOGLE_PAY,
      CASHONDELIVERY: PaymentMethod.CASH_ON_DELIVERY,
      CASH_ON_DELIVERY: PaymentMethod.CASH_ON_DELIVERY,
    };
    return value.split('|').map((method) => {
      const key = method.trim().toUpperCase().replaceAll(' ', '');
      const paymentMethod = aliases[key];
      if (!paymentMethod)
        throw new Error(`Unsupported payment method: ${method}.`);
      return paymentMethod;
    });
  }

  private returnShippingPaidBy(value: string) {
    const normalized = value.trim().toUpperCase();
    return normalized === 'SHOP' || normalized.includes('FREE')
      ? 'SHOP'
      : 'CUSTOMER';
  }

  private variantDetails(name: string) {
    const storageMatch = name.match(/(\d+)\s*(TB|GB)/i);
    const storageGb = storageMatch
      ? Number(storageMatch[1]) *
        (storageMatch[2].toUpperCase() === 'TB' ? 1024 : 1)
      : 0;
    const color = name
      .replace(/\d+\s*(TB|GB)/i, '')
      .replace(/^\s*[-–·/]\s*/, '')
      .trim();
    return { storageGb, color: color || name };
  }

  private slug(value: string) {
    return value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70);
  }

  private hash(value: string) {
    return createHash('sha1').update(value).digest('hex').slice(0, 8);
  }

  private async uniqueShopSlug(
    tx: Prisma.TransactionClient,
    name: string,
    domain: string,
  ) {
    const base = this.slug(name);
    const existing = await tx.shop.findUnique({ where: { slug: base } });
    return existing ? `${base}-${this.hash(domain)}` : base;
  }

  private async uniqueProductSlug(tx: Prisma.TransactionClient, value: string) {
    const base = this.slug(value);
    const existing = await tx.product.findUnique({ where: { slug: base } });
    return existing ? `${base}-${this.hash(value)}` : base;
  }

  private async uniqueSku(tx: Prisma.TransactionClient, value: string) {
    const base = `FEED-${this.slug(value).toUpperCase()}`.slice(0, 80);
    const existing = await tx.productVariant.findUnique({
      where: { sku: base },
    });
    return existing ? `${base}-${this.hash(value).toUpperCase()}` : base;
  }

  private errorMessage(reason: unknown) {
    return reason instanceof Error ? reason.message : 'Unknown import error.';
  }
}
