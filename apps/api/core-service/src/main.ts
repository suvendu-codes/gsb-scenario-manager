import './load-env';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { requestLogger } from 'shared';
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
  const allowedOrigins = [
    process.env.FRONTEND_ORIGIN,
    process.env.NODE_ENV !== 'production' ? process.env.DEV_ORIGIN : undefined,
  ].filter((origin): origin is string => !!origin);
  app.enableCors({
    // Array allowlist: disallowed origins just get no CORS headers (no 500), and requests without an Origin pass through.
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Version'],
    exposedHeaders: ['X-Total-Count', 'Content-Range'],
    credentials: true,
    maxAge: 600, // cache preflight for 10 minutes
  });
  app.enableCsrfProtection({ trustedOrigins: allowedOrigins });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );
  setupSwagger(app);
  const port = process.env.PORT || 3002;
  await app.listen(port);
  logger.log(`Listening on port ${port}`);
}

void bootstrap();
