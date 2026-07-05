import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FeedBuilderModule } from '../feed-builder/feed-builder.module';
import { MerchantFeedsModule } from '../merchant-feeds/merchant-feeds.module';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';

@Module({
  imports: [AuthModule, FeedBuilderModule, MerchantFeedsModule],
  controllers: [OffersController],
  providers: [OffersService],
})
export class OffersModule {}
