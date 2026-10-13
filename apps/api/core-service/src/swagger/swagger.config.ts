import { SwaggerConfigOptions } from './swagger.interface';

export const swaggerConfig: SwaggerConfigOptions = {
  title: 'Core Service API',
  description: 'API documentation for the core service',
  version: '1.0',
  path: process.env.SWAGGER_PATH ?? 'docs',
  enabled: process.env.SWAGGER_ENABLED !== 'false',
};
