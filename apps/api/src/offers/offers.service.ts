import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: {
        variant: { include: { product: true } },
        shop: { include: { returnPolicy: true } },
        warrantyInfo: true,
        priceSnapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 30,
        },
      },
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
}
