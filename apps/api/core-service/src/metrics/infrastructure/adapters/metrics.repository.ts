import { Injectable } from '@nestjs/common';
import { MetricsRepositoryPort } from '../../application/ports/metrics.repository.port';

@Injectable()
export class MetricsRepository implements MetricsRepositoryPort {
  definitions() {
    return [];
  }

  signedUrl(metricId: string) {
    return { metricId, url: null as string | null };
  }
}
