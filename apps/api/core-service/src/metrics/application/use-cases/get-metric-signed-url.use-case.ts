import { Inject, Injectable } from '@nestjs/common';
import {
  METRICS_REPOSITORY,
  type MetricsRepositoryPort,
} from '../ports/metrics.repository.port';

@Injectable()
export class GetMetricSignedUrlUseCase {
  constructor(
    @Inject(METRICS_REPOSITORY)
    private readonly metrics: MetricsRepositoryPort,
  ) {}

  execute(metricId: string) {
    return this.metrics.signedUrl(metricId);
  }
}
