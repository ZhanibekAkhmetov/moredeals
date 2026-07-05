import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AmazonExtractor } from './extractors/amazon.extractor';
import { GenericProductExtractor } from './extractors/generic-product.extractor';
import { MediaMarktSaturnExtractor } from './extractors/mediamarkt-saturn.extractor';
import { FeedBuilderController } from './feed-builder.controller';
import { FeedBuilderService } from './feed-builder.service';
import { ProductExtractorRegistry } from './product-extractor.registry';
import { SafePageFetcher } from './safe-page-fetcher.service';

@Module({
  imports: [AuthModule],
  controllers: [FeedBuilderController],
  providers: [
    FeedBuilderService,
    SafePageFetcher,
    GenericProductExtractor,
    AmazonExtractor,
    MediaMarktSaturnExtractor,
    ProductExtractorRegistry,
  ],
  exports: [ProductExtractorRegistry],
})
export class FeedBuilderModule {}
