import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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

  @Post('refresh-imported')
  @UseGuards(JwtAuthGuard, AdminGuard)
  refreshImported() {
    return this.offersService.refreshImported();
  }

  @Post(':id/refresh')
  @UseGuards(JwtAuthGuard, AdminGuard)
  refreshOne(@Param('id') id: string) {
    return this.offersService.refreshOne(id);
  }
}
