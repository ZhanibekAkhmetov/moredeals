import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MERCHANT_FEED_TEMPLATE } from './merchant-feed.template';
import { MerchantFeedsService } from './merchant-feeds.service';

@Controller('merchant-feeds')
export class MerchantFeedsController {
  constructor(private readonly merchantFeedsService: MerchantFeedsService) {}

  @Get('template')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="moredeals-merchant-feed-template.csv"',
  )
  getTemplate() {
    return MERCHANT_FEED_TEMPLATE;
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, AdminGuard)
  importFeed(@Body() body: unknown) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('A JSON request body is required.');
    }

    const { sourceName, csvText } = body as Record<string, unknown>;
    if (typeof sourceName !== 'string' || !sourceName.trim()) {
      throw new BadRequestException('sourceName is required.');
    }
    if (typeof csvText !== 'string' || !csvText.trim()) {
      throw new BadRequestException('csvText is required.');
    }

    return this.merchantFeedsService.import(sourceName.trim(), csvText);
  }
}
