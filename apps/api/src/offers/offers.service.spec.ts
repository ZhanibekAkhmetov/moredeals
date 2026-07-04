import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OffersService } from './offers.service';

describe('OffersService', () => {
  const findUnique = jest.fn();
  const prisma = {
    offer: { findUnique },
  } as unknown as PrismaService;
  const service = new OffersService(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 404 when an offer does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns price history in ascending capture order', async () => {
    const priceSnapshots = [{ id: 'older' }, { id: 'newer' }];
    findUnique.mockResolvedValue({ priceSnapshots });

    await expect(service.findPriceHistory('offer-1')).resolves.toBe(
      priceSnapshots,
    );
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'offer-1' },
      select: {
        priceSnapshots: { orderBy: { capturedAt: 'asc' } },
      },
    });
  });
});
