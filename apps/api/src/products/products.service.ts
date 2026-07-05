import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const variantSelect = {
  id: true,
  name: true,
  sku: true,
  color: true,
  storageGb: true,
  ramGb: true,
  imageUrl: true,
  ean: true,
  gtin: true,
  mpn: true,
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({
      where: {
        variants: { some: { offers: { some: { source: 'IMPORTED_FEED' } } } },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        brand: true,
        category: true,
        modelNumber: true,
        description: true,
        imageUrl: true,
        variants: {
          select: variantSelect,
          orderBy: [{ storageGb: 'asc' }, { color: 'asc' }],
        },
      },
      orderBy: [{ brand: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: [{ storageGb: 'asc' }, { color: 'asc' }],
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} was not found.`);
    }

    return product;
  }

  async findOffers(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} was not found.`);
    }

    const offers = await this.prisma.offer.findMany({
      where: { variant: { productId: id } },
      include: {
        variant: {
          select: {
            ...variantSelect,
            product: { select: { imageUrl: true } },
          },
        },
        shop: { include: { returnPolicy: true } },
        warrantyInfo: true,
        priceSnapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { totalPrice: 'asc' },
    });

    const seen = new Set<string>();
    return offers
      .filter((offer) => {
        const url =
          offer.resolvedProductUrl ||
          offer.originalProductUrl ||
          offer.redirectUrl;
        const key = `${offer.shopId}|${url}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(({ priceSnapshots, ...offer }) => ({
        ...offer,
        latestPriceSnapshot: priceSnapshots[0] ?? null,
      }));
  }
}
