import {
  ExtractionStatus,
  OfferSource,
  StockStatus,
} from '@moredeals/database';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProductExtractorRegistry } from '../feed-builder/product-extractor.registry';
import { ProductMatchingService } from '../merchant-feeds/product-matching.service';
import { OffersService } from './offers.service';

describe('OffersService', () => {
  const findUnique = jest.fn();
  const findMany = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    offer: { findUnique, findMany },
    $transaction: transaction,
  } as unknown as PrismaService;
  const refresh = jest.fn();
  const forUrl = jest.fn().mockReturnValue({ refresh });
  const extractors = { forUrl } as unknown as ProductExtractorRegistry;
  const variantDetails = jest.fn();
  const matching = {
    variantDetails,
    canonicalVariantName: jest.fn(),
  } as unknown as ProductMatchingService;
  const service = new OffersService(prisma, extractors, matching);

  beforeEach(() => {
    jest.resetAllMocks();
    forUrl.mockReturnValue({ refresh });
    variantDetails.mockReturnValue({
      name: '128 GB',
      storageGb: 128,
      color: '',
      ramGb: null,
    });
    process.env.OFFER_REFRESH_DELAY_MS = '0';
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

  it('records a snapshot and failed status while retaining last known prices', async () => {
    const existingOffer = {
      id: 'offer-1',
      variantId: 'variant-1',
      source: OfferSource.IMPORTED_FEED,
      redirectUrl: 'https://www.mediamarkt.de/product',
      originalProductUrl: null,
      resolvedProductUrl: null,
      price: 100,
      shippingCost: 5,
      currency: 'EUR',
      stockStatus: StockStatus.IN_STOCK,
      imageUrl: null,
      variant: {
        id: 'variant-1',
        productId: 'product-1',
        color: null,
        storageGb: 128,
        imageUrl: null,
        product: { imageUrl: null },
      },
    };
    findUnique.mockResolvedValue(existingOffer);
    refresh.mockResolvedValue({
      price: '',
      shippingCost: '',
      currency: '',
      stockStatus: '',
      imageUrl: '',
      resolvedUrl: 'https://www.mediamarkt.de/product',
      status: ExtractionStatus.FAILED,
      warnings: ['Blocked by upstream.'],
      row: {},
    });
    const offerUpdate = jest.fn().mockImplementation(({ data }) => ({
      ...existingOffer,
      ...data,
    }));
    const snapshotCreate = jest.fn().mockImplementation(({ data }) => ({
      id: 'snapshot-1',
      ...data,
    }));
    transaction.mockImplementation((callback) =>
      callback({
        product: { update: jest.fn() },
        productVariant: { findFirst: jest.fn(), update: jest.fn() },
        offer: { update: offerUpdate },
        priceSnapshot: { create: snapshotCreate },
      }),
    );

    const result = await service.refreshOne('offer-1');

    expect(result.offer).toEqual(
      expect.objectContaining({
        price: 100,
        shippingCost: 5,
        totalPrice: 105,
        lastExtractionStatus: ExtractionStatus.FAILED,
        lastExtractionWarnings: ['Blocked by upstream.'],
      }),
    );
    expect(snapshotCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        offerId: 'offer-1',
        price: 100,
        shippingCost: 5,
        totalPrice: 105,
        capturedAt: expect.any(Date),
      }),
    });
  });

  it('counts sequential imported refresh outcomes', async () => {
    findMany.mockResolvedValue([{ id: 'one' }, { id: 'two' }, { id: 'three' }]);
    const refreshOne = jest
      .spyOn(service, 'refreshOne')
      .mockResolvedValueOnce({
        offer: {
          lastExtractionStatus: ExtractionStatus.SUCCESS,
          lastExtractionWarnings: [],
        },
      } as never)
      .mockResolvedValueOnce({
        offer: {
          lastExtractionStatus: ExtractionStatus.PARTIAL,
          lastExtractionWarnings: ['Missing price.'],
        },
      } as never)
      .mockResolvedValueOnce({
        offer: {
          lastExtractionStatus: ExtractionStatus.FAILED,
          lastExtractionWarnings: ['Blocked.'],
        },
      } as never);

    await expect(service.refreshImported()).resolves.toEqual({
      attempted: 3,
      succeeded: 1,
      partial: 1,
      failed: 1,
      errors: [{ offerId: 'three', message: 'Blocked.' }],
    });
    expect(refreshOne.mock.calls.map(([id]) => id)).toEqual([
      'one',
      'two',
      'three',
    ]);
  });
});
