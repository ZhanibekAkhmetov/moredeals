import { Injectable } from '@nestjs/common';
import type { FeedBuilderExtraction } from './feed-builder.types';
import { ProductExtractorRegistry } from './product-extractor.registry';

@Injectable()
export class FeedBuilderService {
  constructor(private readonly extractors: ProductExtractorRegistry) {}

  extract(urls: string[]): Promise<FeedBuilderExtraction[]> {
    return Promise.all(
      urls.map((url) => this.extractors.forUrl(url).extract(url)),
    );
  }
}
