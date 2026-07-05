import './environment';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { OffersModule } from './offers/offers.module';
import { ProductsModule } from './products/products.module';
import { MerchantFeedsModule } from './merchant-feeds/merchant-feeds.module';
import { AuthModule } from './auth/auth.module';
import { FeedBuilderModule } from './feed-builder/feed-builder.module';

@Module({
  imports: [
    DatabaseModule,
    ProductsModule,
    OffersModule,
    AuthModule,
    MerchantFeedsModule,
    FeedBuilderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
