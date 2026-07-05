import type { MerchantFeedRow } from './merchant-feed.types';
import { ProductMatchingService } from './product-matching.service';

const row = (values: Partial<MerchantFeedRow>): MerchantFeedRow =>
  ({
    brand: 'Samsung',
    model: 'Samsung Galaxy S26 Ultra',
    variantName: '512 GB Cobalt Violet',
    storageGb: '',
    ramGb: '',
    color: '',
    productTitle: '',
    ...values,
  }) as MerchantFeedRow;

describe('ProductMatchingService', () => {
  const service = new ProductMatchingService();

  it('matches brand/model across casing and noisy store titles', () => {
    expect(
      service.sameProduct(
        row({ model: 'SAMSUNG Galaxy S26 Ultra Smartphone ohne Vertrag' }),
        {
          brand: 'samsung',
          modelNumber: 'Samsung Galaxy S26 Ultra',
          name: 'Samsung Galaxy S26 Ultra',
        },
      ),
    ).toBe(true);
  });

  it('keeps base, Plus and Ultra models separate', () => {
    const product = {
      brand: 'Samsung',
      modelNumber: 'Samsung Galaxy S26 Ultra',
      name: 'Samsung Galaxy S26 Ultra',
    };
    expect(service.sameProduct(row({ model: 'Galaxy S26' }), product)).toBe(
      false,
    );
    expect(
      service.sameProduct(row({ model: 'Galaxy S26 Plus' }), product),
    ).toBe(false);
  });

  it('matches equal variants without identifiers and respects storage/color', () => {
    const incoming = service.variantDetails(row({}));
    expect(
      service.sameVariant(incoming, {
        name: '512GB Cobalt Violet',
        storageGb: 512,
        color: 'cobalt violet',
        ramGb: null,
      }),
    ).toBe(true);
    expect(
      service.sameVariant(incoming, {
        name: '256 GB Black',
        storageGb: 256,
        color: 'Black',
        ramGb: null,
      }),
    ).toBe(false);
  });

  it('never merges unknown, blue, and green variants by storage alone', () => {
    const unknown = service.variantDetails(
      row({ variantName: '128 GB', storageGb: '128', color: '' }),
    );
    const blue = service.variantDetails(
      row({ variantName: '128 GB Blue', storageGb: '128', color: 'Blue' }),
    );
    const green = service.variantDetails(
      row({ variantName: '128 GB Green', storageGb: '128', color: 'Green' }),
    );

    expect(service.sameVariant(unknown, unknown)).toBe(false);
    expect(service.sameVariant(unknown, blue)).toBe(false);
    expect(service.sameVariant(blue, green)).toBe(false);
  });

  it('normalizes obvious German colors in canonical variant names', () => {
    expect(
      service.canonicalVariantName(
        service.variantDetails(
          row({
            variantName: '256 GB Silber',
            storageGb: '256',
            color: 'Silber',
          }),
        ),
      ),
    ).toBe('256 GB Silver');
  });
});
