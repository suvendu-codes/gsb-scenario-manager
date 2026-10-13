export interface SwaggerConfigOptions {
  title: string;
  description: string;
  version: string;
  /** Path the Swagger UI is served on, without a leading slash. */
  path: string;
  /** Whether Swagger should be mounted at all. */
  enabled: boolean;
}
