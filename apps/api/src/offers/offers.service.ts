import {
  ExtractionStatus,
  OfferSource,
  StockStatus,
} from '@moredeals/database';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProductExtractorRegistry } from '../feed-builder/product-extractor.registry';
import { ProductMatchingService } from '../merchant-feeds/product-matching.service';

const offerDetailsInclude = {
  variant: { include: { product: true } },
  shop: { include: { returnPolicy: true } },
  warrantyInfo: true,
  priceSnapshots: {
    orderBy: { capturedAt: 'desc' as const },
    take: 30,
  },
} as const;

export type RefreshImportedSummary = {
  attempted: number;
  succeeded: number;
  partial: number;
  failed: number;
  errors: { offerId: string; message: string }[];
};

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extractors: ProductExtractorRegistry,
    private readonly matching: ProductMatchingService,
  ) {}

  async findOne(id: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: offerDetailsInclude,
    });

    if (!offer) {
      throw new NotFoundException(`Offer ${id} was not found.`);
    }

    return offer;
  }

  async findPriceHistory(id: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      select: {
        priceSnapshots: {
          orderBy: { capturedAt: 'asc' },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException(`Offer ${id} was not found.`);
    }

    return offer.priceSnapshots;
  }

  async refreshOne(id: string) {
    const existingOffer = await this.prisma.offer.findUnique({
      where: { id },
      include: { variant: { include: { product: true } } },
    });
    if (!existingOffer) {
      throw new NotFoundException(`Offer ${id} was not found.`);
    }
    if (existingOffer.source !== OfferSource.IMPORTED_FEED) {
      throw new BadRequestException('Only imported offers can be refreshed.');
    }

    const refreshUrl =
      existingOffer.resolvedProductUrl ||
      existingOffer.originalProductUrl ||
      existingOffer.redirectUrl;
    const extraction = await this.extractors
      .forUrl(refreshUrl)
      .refresh(existingOffer);
    const checkedAt = new Date();
    const price = this.extractedMoney(extraction.price, existingOffer.price);
    const shippingCost = this.extractedMoney(
      extraction.shippingCost,
      existingOffer.shippingCost,
    );
    const totalPrice = Number((price + shippingCost).toFixed(2));
    const stockStatus = this.extractedStockStatus(
      extraction.stockStatus,
      existingOffer.stockStatus,
    );
    const currency = /^[A-Z]{3}$/.test(extraction.currency.toUpperCase())
      ? extraction.currency.toUpperCase()
      : existingOffer.currency;
    const imageUrl = extraction.imageUrl || existingOffer.imageUrl;
    const variantDetails = this.matching.variantDetails(extraction.row);

    return this.prisma.$transaction(async (tx) => {
      if (extraction.imageUrl && !existingOffer.variant.product.imageUrl) {
        await tx.product.update({
          where: { id: existingOffer.variant.productId },
          data: { imageUrl: extraction.imageUrl },
        });
      }

      let variantId = existingOffer.variantId;
      if (variantDetails.color) {
        const matchingVariant = await tx.productVariant.findFirst({
          where: {
            productId: existingOffer.variant.productId,
            storageGb: variantDetails.storageGb,
            color: {
              equals: variantDetails.color,
              mode: 'insensitive',
            },
          },
        });
        if (matchingVariant) {
          variantId = matchingVariant.id;
          await tx.productVariant.update({
            where: { id: matchingVariant.id },
            data: { imageUrl: extraction.imageUrl || undefined },
          });
        } else if (!existingOffer.variant.color) {
          await tx.productVariant.update({
            where: { id: existingOffer.variantId },
            data: {
              name: this.matching.canonicalVariantName(variantDetails),
              color: variantDetails.color,
              storageGb:
                variantDetails.storageGb || existingOffer.variant.storageGb,
              ramGb: variantDetails.ramGb ?? undefined,
              imageUrl: extraction.imageUrl || undefined,
            },
          });
        }
      } else if (extraction.imageUrl && !existingOffer.variant.imageUrl) {
        await tx.productVariant.update({
          where: { id: existingOffer.variantId },
          data: { imageUrl: extraction.imageUrl },
        });
      }

      const offer = await tx.offer.update({
        where: { id },
        data: {
          variantId,
          price,
          shippingCost,
          totalPrice,
          currency,
          stockStatus,
          imageUrl,
          originalProductUrl:
            existingOffer.originalProductUrl || existingOffer.redirectUrl,
          resolvedProductUrl:
            this.httpUrl(extraction.resolvedUrl) ||
            existingOffer.resolvedProductUrl,
          lastCheckedAt: checkedAt,
          lastExtractionStatus: extraction.status,
          lastExtractionWarnings: extraction.warnings,
        },
        include: offerDetailsInclude,
      });
      const snapshot = await tx.priceSnapshot.create({
        data: {
          offerId: id,
          price,
          shippingCost,
          totalPrice,
          capturedAt: checkedAt,
        },
      });

      return { offer, snapshot };
    });
  }

  async refreshImported(): Promise<RefreshImportedSummary> {
    const offers = await this.prisma.offer.findMany({
      where: { source: OfferSource.IMPORTED_FEED },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    const summary: RefreshImportedSummary = {
      attempted: 0,
      succeeded: 0,
      partial: 0,
      failed: 0,
      errors: [],
    };

    for (const [index, offer] of offers.entries()) {
      if (index > 0) await this.delay(this.refreshDelayMs());
      summary.attempted += 1;
      try {
        const result = await this.refreshOne(offer.id);
        if (result.offer.lastExtractionStatus === ExtractionStatus.SUCCESS) {
          summary.succeeded += 1;
        } else if (
          result.offer.lastExtractionStatus === ExtractionStatus.PARTIAL
        ) {
          summary.partial += 1;
        } else {
          summary.failed += 1;
          summary.errors.push({
            offerId: offer.id,
            message:
              result.offer.lastExtractionWarnings.join(' ') ||
              'Extraction failed without a specific warning.',
          });
        }
      } catch (reason) {
        summary.failed += 1;
        summary.errors.push({
          offerId: offer.id,
          message:
            reason instanceof Error ? reason.message : 'Unknown refresh error.',
        });
      }
    }

    return summary;
  }

  private extractedMoney(value: string, fallback: unknown) {
    if (!value.trim()) return Number(fallback);
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number(fallback);
  }

  private extractedStockStatus(value: string, fallback: StockStatus) {
    const statuses = StockStatus as Record<string, StockStatus>;
    return statuses[value] ?? fallback;
  }

  private httpUrl(value: string) {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
    } catch {
      return null;
    }
  }

  private refreshDelayMs() {
    const configured = Number(process.env.OFFER_REFRESH_DELAY_MS ?? 1000);
    return Number.isFinite(configured) && configured >= 0 ? configured : 1000;
  }

  private delay(milliseconds: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  }
}
