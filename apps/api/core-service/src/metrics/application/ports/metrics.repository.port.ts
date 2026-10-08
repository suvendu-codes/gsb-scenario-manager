export interface MetricSignedUrl {
  metricId: string;
  url: string | null;
}

export interface MetricsRepositoryPort {
  definitions(): unknown[];
  signedUrl(metricId: string): MetricSignedUrl;
}

export const METRICS_REPOSITORY = Symbol('METRICS_REPOSITORY');
