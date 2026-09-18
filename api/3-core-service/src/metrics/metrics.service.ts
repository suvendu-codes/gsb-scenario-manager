import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  definitions() {
    return [];
  }

  signedUrl(metricId: string) {
    return { metricId, url: null as string | null };
  }
}
