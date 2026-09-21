import { Controller, Get, Param } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('definitions')
  definitions() {
    return this.metricsService.definitions();
  }

  @Get(':id/signed-url')
  signedUrl(@Param('id') id: string) {
    return this.metricsService.signedUrl(id);
  }
}
