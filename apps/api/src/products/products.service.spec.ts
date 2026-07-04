import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const findUnique = jest.fn();
  const findMany = jest.fn();
  const prisma = {
    product: { findUnique },
    offer: { findMany },
  } as unknown as PrismaService;
  const service = new ProductsService(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 404 when a product does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('requests offers in total-price order and exposes the latest snapshot', async () => {
    const snapshot = { id: 'snapshot-1' };
    findUnique.mockResolvedValue({ id: 'product-1' });
    findMany.mockResolvedValue([{ id: 'offer-1', priceSnapshots: [snapshot] }]);

    await expect(service.findOffers('product-1')).resolves.toEqual([
      { id: 'offer-1', latestPriceSnapshot: snapshot },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { totalPrice: 'asc' } }),
    );
  });
});
