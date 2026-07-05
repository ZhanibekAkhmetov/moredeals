import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeedBuilderService } from './feed-builder.service';

@Controller('feed-builder')
export class FeedBuilderController {
  constructor(private readonly feedBuilderService: FeedBuilderService) {}

  @Post('extract')
  @UseGuards(JwtAuthGuard, AdminGuard)
  extract(@Body() body: unknown) {
    if (
      !body ||
      typeof body !== 'object' ||
      !Array.isArray((body as { urls?: unknown }).urls)
    ) {
      throw new BadRequestException('urls must be an array of product URLs.');
    }
    const urls = (body as { urls: unknown[] }).urls;
    if (urls.length === 0 || urls.length > 20) {
      throw new BadRequestException('Submit between 1 and 20 URLs.');
    }
    if (urls.some((url) => typeof url !== 'string' || !url.trim())) {
      throw new BadRequestException('Every URL must be a non-empty string.');
    }
    return this.feedBuilderService.extract(
      Array.from(new Set((urls as string[]).map((url) => url.trim()))),
    );
  }
}
