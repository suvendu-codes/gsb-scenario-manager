import { Module } from '@nestjs/common';
import { METRICS_REPOSITORY } from './application/ports/metrics.repository.port';
import { GetMetricSignedUrlUseCase } from './application/use-cases/get-metric-signed-url.use-case';
import { ListMetricDefinitionsUseCase } from './application/use-cases/list-metric-definitions.use-case';
import { MetricsRepository } from './infrastructure/adapters/metrics.repository';
import { MetricsController } from './presentation/metrics.controller';

@Module({
  controllers: [MetricsController],
  providers: [
    ListMetricDefinitionsUseCase,
    GetMetricSignedUrlUseCase,
    {
      provide: METRICS_REPOSITORY,
      useClass: MetricsRepository,
    },
  ],
})
export class MetricsModule {}
