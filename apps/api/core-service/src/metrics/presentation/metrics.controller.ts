import { Controller, Get, Param } from '@nestjs/common';
import { GetMetricSignedUrlUseCase } from '../application/use-cases/get-metric-signed-url.use-case';
import { ListMetricDefinitionsUseCase } from '../application/use-cases/list-metric-definitions.use-case';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly listDefinitions: ListMetricDefinitionsUseCase,
    private readonly getSignedUrl: GetMetricSignedUrlUseCase,
  ) {}

  @Get('definitions')
  definitions() {
    return this.listDefinitions.execute();
  }

  @Get(':id/signed-url')
  signedUrl(@Param('id') id: string) {
    return this.getSignedUrl.execute(id);
  }
}
