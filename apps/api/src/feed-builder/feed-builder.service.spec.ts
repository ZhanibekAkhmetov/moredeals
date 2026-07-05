import { AmazonExtractor } from './extractors/amazon.extractor';
import { GenericProductExtractor } from './extractors/generic-product.extractor';
import { MediaMarktSaturnExtractor } from './extractors/mediamarkt-saturn.extractor';
import {
  deriveModel,
  deriveProductDetails,
  deriveVariantName,
  extractJsonLd,
  normalizeImageUrl,
  normalizePrice,
} from './extraction.utils';
import { FeedBuilderService } from './feed-builder.service';
import { ProductExtractorRegistry } from './product-extractor.registry';
import { SafePageFetcher } from './safe-page-fetcher.service';

function fetcherWith(html: string, url: string) {
  return {
    fetchHtml: jest.fn().mockResolvedValue({ url: new URL(url), html }),
  } as unknown as SafePageFetcher;
}

describe('extraction utilities', () => {
  it('extracts Product JSON-LD from @graph', () => {
    const row = extractJsonLd(
      `
      <script type="application/ld+json">{
        "@graph": [{"@type":"Product","name":"Samsung Galaxy S26 256 GB Black",
        "brand":{"name":"Samsung"},"gtin13":"1234567890123","image":"/phone.jpg",
        "offers":{"price":"1.099,00","priceCurrency":"EUR","availability":"https://schema.org/InStock"}}]
      }</script>`,
      new URL('https://shop.example/product'),
    );
    expect(row).toEqual(
      expect.objectContaining({
        productTitle: 'Samsung Galaxy S26 256 GB Black',
        brand: 'Samsung',
        gtin: '1234567890123',
        price: '1099.00',
        currency: 'EUR',
        stockStatus: 'IN_STOCK',
        imageUrl: 'https://shop.example/phone.jpg',
      }),
    );
  });

  it.each([
    ['1.099,00 €', '1099.00'],
    ['EUR 1,099.95', '1099.95'],
    ['499', '499'],
  ])('normalizes price %s', (input, expected) => {
    expect(normalizePrice(input)).toBe(expected);
  });

  it('derives conservative model and variant values', () => {
    const title = 'Samsung Galaxy S26 256 GB Black Dual SIM';
    expect(deriveModel(title, 'Samsung')).toBe('Samsung Galaxy S26');
    expect(deriveVariantName(title)).toBe('256 GB Black');
  });

  it.each([
    [
      'SAMSUNG Galaxy S25 256 GB Blue Black Dual SIM',
      'Samsung Galaxy S25',
      '256 GB Blue Black',
      'Blue Black',
    ],
    [
      'GOOGLE Pixel 10a 256 GB Obsidian',
      'Google Pixel 10a',
      '256 GB Obsidian',
      'Obsidian',
    ],
    [
      'Apple iPhone 17 Pro Max 5G 256 GB Tieflau Dual SIM',
      'Apple iPhone 17 Pro Max',
      '256 GB Tieflau',
      'Tieflau',
    ],
    [
      'Apple iPhone 17 Pro 256 GB Schwarz Dual SIM',
      'Apple iPhone 17 Pro',
      '256 GB Black',
      'Black',
    ],
  ])('parses smartphone identity from %s', (title, model, variant, color) => {
    const brand = title.split(' ')[0];
    expect(deriveModel(title, brand)).toBe(model);
    expect(deriveVariantName(title)).toBe(variant);
    expect(deriveProductDetails(title).color).toBe(color);
  });

  it('derives the canonical model and configuration from a noisy Amazon title', () => {
    const title =
      'Samsung Galaxy S26 Ultra AI Smartphone mit Galaxy AI, Handy ohne Vertrag, Android, Privacy Display, 12 GB RAM, 512 GB Speicher, 200 MP, Cobalt Violet, 3 Jahre Herstellergarantie [Exklusiv auf Amazon]';
    expect(deriveModel(title, 'Samsung')).toBe('Samsung Galaxy S26 Ultra');
    expect(deriveVariantName(title)).toBe('512 GB Cobalt Violet');
    expect(deriveProductDetails(title)).toEqual({
      storageGb: 512,
      ramGb: 12,
      color: 'Cobalt Violet',
    });
  });

  it('extracts a MediaMarkt listing with title-derived identity and structured variant fields', async () => {
    const url = 'https://www.mediamarkt.de/de/product/example.html';
    const extractor = new MediaMarktSaturnExtractor(
      fetcherWith(
        `<script type="application/ld+json">{
        "@type":"Product","name":"SAMSUNG Galaxy S26 Ultra 512 GB Cobalt Violet Dual SIM",
        "brand":{"name":"SAMSUNG"},"image":"https://assets.example/phone.jpg",
        "offers":{"price":"1499.00","priceCurrency":"EUR","availability":"https://schema.org/InStock"}
      }</script><body>EAN: 1234567890123 Lieferzeit 1 bis 3 Werktage PayPal Kreditkarte</body>`,
        url,
      ),
    );
    const result = await extractor.extract(url);
    expect(result.row).toEqual(
      expect.objectContaining({
        brand: 'Samsung',
        model: 'Samsung Galaxy S26 Ultra',
        variantName: '512 GB Cobalt Violet',
        storageGb: '512',
        color: 'Cobalt Violet',
        ean: '1234567890123',
        price: '1499.00',
        currency: 'EUR',
        deliveryMinDays: '1',
        deliveryMaxDays: '3',
        imageUrl: 'https://assets.example/phone.jpg',
      }),
    );
    expect(result.extractedFields.model).toBe('derived');
  });

  it('rejects script fragments as brand and model candidates', async () => {
    const row = extractJsonLd(
      `<script type="application/ld+json">{
      "@type":"Product","name":"Samsung Galaxy S26 256 GB Black",
      "brand":"tplaceId = $(#marketplaceId).val();",
      "model":"const model = function() {};"
    }</script>`,
      new URL('https://shop.example/product'),
    );
    expect(row.brand).toContain('marketplaceId');
    const url = 'https://shop.example/product';
    const result = await new GenericProductExtractor(
      fetcherWith(
        `<script type="application/ld+json">{
        "@type":"Product","name":"Samsung Galaxy S26 256 GB Black",
        "brand":"tplaceId = $(#marketplaceId).val();",
        "model":"const model = function() {};"
      }</script>`,
        url,
      ),
    ).extract(url);
    expect(result.row.brand).toBe('Samsung');
    expect(result.row.model).toBe('Samsung Galaxy S26');
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        'Ignored invalid brand value from json-ld.',
        'Ignored invalid model value from json-ld.',
      ]),
    );
  });

  it('does not treat adjacent application text as a MediaMarkt EAN', async () => {
    const url = 'https://www.mediamarkt.de/product';
    const result = await new MediaMarktSaturnExtractor(
      fetcherWith(
        '<h1>SAMSUNG Galaxy S26 256 GB Black Dual SIM</h1><body>EAN dBuyable</body>',
        url,
      ),
    ).extract(url);
    expect(result.row.ean).toBe('');
  });

  it('normalizes relative and protocol-relative image URLs', () => {
    const base = new URL('https://shop.example/products/1');
    expect(normalizeImageUrl('/images/a.jpg', base)).toBe(
      'https://shop.example/images/a.jpg',
    );
    expect(normalizeImageUrl('//cdn.example/a.jpg', base)).toBe(
      'https://cdn.example/a.jpg',
    );
  });
});

describe('FeedBuilderService', () => {
  it('prioritizes JSON-LD and reports extraction metadata', async () => {
    const fetcher = {
      fetchHtml: jest.fn().mockResolvedValue({
        url: new URL('https://shop.example/products/phone'),
        html: `<script type="application/ld+json">{
          "@type":"Product","name":"Structured phone","brand":{"name":"Example"},
          "model":"Model 1","offers":{"price":"499.00","priceCurrency":"EUR"}
        }</script>`,
      }),
    } as unknown as SafePageFetcher;
    const generic = new GenericProductExtractor(fetcher);
    const registry = new ProductExtractorRegistry(
      new MediaMarktSaturnExtractor(fetcher),
      new AmazonExtractor(fetcher),
      generic,
    );
    const service = new FeedBuilderService(registry);
    const [result] = await service.extract([
      'https://shop.example/products/phone',
    ]);
    expect(result.row).toEqual(
      expect.objectContaining({
        shopName: 'Shop',
        shopDomain: 'shop.example',
        productTitle: 'Structured phone',
        brand: 'Example',
        model: 'Model 1',
        price: '499.00',
        currency: 'EUR',
      }),
    );
    expect(result.extractedFields.productTitle).toBe('json-ld');
    expect(result.originalUrl).toBe('https://shop.example/products/phone');
    expect(result.status).toBe(ExtractionStatus.PARTIAL);
  });

  it('selects the MediaMarkt adapter before the generic fallback', () => {
    const fetcher = fetcherWith('', 'https://www.mediamarkt.de/product');
    const mediaMarkt = new MediaMarktSaturnExtractor(fetcher);
    const registry = new ProductExtractorRegistry(
      mediaMarkt,
      new AmazonExtractor(fetcher),
      new GenericProductExtractor(fetcher),
    );

    expect(registry.forUrl('https://www.mediamarkt.de/product')).toBe(
      mediaMarkt,
    );
  });
});

describe('SafePageFetcher', () => {
  it.each([
    'http://127.0.0.1/product',
    'http://localhost/product',
    'http://10.0.0.1/product',
    'http://[::1]/product',
  ])('rejects private target %s', async (url) => {
    await expect(new SafePageFetcher().fetchHtml(url)).rejects.toThrow(
      'private network',
    );
  });
});
import { ExtractionStatus } from '@moredeals/database';
