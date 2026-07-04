import './environment';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { OffersModule } from './offers/offers.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [DatabaseModule, ProductsModule, OffersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
