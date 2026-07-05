import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MerchantFeedsController } from './merchant-feeds.controller';
import { MerchantFeedsService } from './merchant-feeds.service';
import { ProductMatchingService } from './product-matching.service';

@Module({
  imports: [AuthModule],
  controllers: [MerchantFeedsController],
  providers: [MerchantFeedsService, ProductMatchingService],
  exports: [ProductMatchingService],
})
export class MerchantFeedsModule {}
