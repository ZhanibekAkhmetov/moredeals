import { Injectable } from '@nestjs/common';
import { AmazonExtractor } from './extractors/amazon.extractor';
import { GenericProductExtractor } from './extractors/generic-product.extractor';
import { MediaMarktSaturnExtractor } from './extractors/mediamarkt-saturn.extractor';
import type { ProductPageExtractor } from './extractors/product.extractor';

@Injectable()
export class ProductExtractorRegistry {
  private readonly extractors: ProductPageExtractor[];

  constructor(
    mediaMarktSaturn: MediaMarktSaturnExtractor,
    amazon: AmazonExtractor,
    generic: GenericProductExtractor,
  ) {
    this.extractors = [mediaMarktSaturn, amazon, generic];
  }

  forUrl(input: string): ProductPageExtractor {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      return this.extractors[this.extractors.length - 1];
    }
    return (
      this.extractors.find((extractor) => extractor.canHandle(url)) ??
      this.extractors[this.extractors.length - 1]
    );
  }
}
