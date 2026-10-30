import './load-env.js';
import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { requestLogger } from 'shared';
import { appConfig } from './config.js';
import { AppModule } from './app.module.js';
import { setupSwagger } from './swagger.js';
import { JsonLogger } from './telemetry/json-logger.js';


async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // One JSON line per log on stdout; picked up by the cluster OTel collector.
    logger: new JsonLogger(),
  });
  const logger = new Logger('Bootstrap');
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.use(requestLogger);
  app.enableShutdownHooks();
  // Used for both CORS and CSRF: CORS-allowed origins are not implicitly CSRF-trusted.
  const { allowedOrigins } = appConfig;
  app.enableCors({
    // Array allowlist: disallowed origins just get no CORS headers (no 500), and requests without an Origin pass through.
    origin: allowedOrigins,
    trustedOrigins: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Total-Count', 'Content-Range', 'X-Request-Id', 'Location', 'Retry-After'],
    credentials: true,
    maxAge: 600, // cache preflight for 10 minutes
  });
  app.enableCsrfProtection({ trustedOrigins: allowedOrigins });
  setupSwagger(app);
  const port = appConfig.port;
  await app.listen(port);
  logger.log({ event: 'api_listening', port });
}

void bootstrap();
