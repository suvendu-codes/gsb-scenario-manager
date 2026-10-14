import './load-env';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { requestLogger } from 'shared';
import { appConfig } from './config';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';


async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const logger = new Logger('Bootstrap');
  app.use(requestLogger);
  app.enableShutdownHooks()
  // Used for both CORS and CSRF: CORS-allowed origins are not implicitly CSRF-trusted.
  const { allowedOrigins } = appConfig;
  app.enableCors({
    // Array allowlist: disallowed origins just get no CORS headers (no 500), and requests without an Origin pass through.
    origin: allowedOrigins,
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
  logger.log(`Listening on port ${port}`);
}

void bootstrap();
