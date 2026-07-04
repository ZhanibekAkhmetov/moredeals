import { Controller, Get, Param } from '@nestjs/common';
import { OffersService } from './offers.service';

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.offersService.findOne(id);
  }

  @Get(':id/price-history')
  findPriceHistory(@Param('id') id: string) {
    return this.offersService.findPriceHistory(id);
  }
}
