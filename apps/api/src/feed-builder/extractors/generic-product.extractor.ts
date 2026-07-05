import { Injectable } from '@nestjs/common';
import type { ExtractionContext } from '../feed-builder.types';
import { extractGenericProduct } from '../extraction.utils';
import { SafePageFetcher } from '../safe-page-fetcher.service';
import { BaseProductPageExtractor } from './product.extractor';

@Injectable()
export class GenericProductExtractor extends BaseProductPageExtractor {
  readonly name = 'GenericProductExtractor';

  constructor(fetcher: SafePageFetcher) {
    super(fetcher);
  }

  canHandle() {
    return true;
  }

  protected extractPage({ html, url }: ExtractionContext) {
    return extractGenericProduct(html, url);
  }
}
