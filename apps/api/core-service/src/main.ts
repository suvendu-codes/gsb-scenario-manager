import './load-env';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { LoggingInterceptor } from 'shared';
import { AppModule } from './app.module';
// import { SafeListenerInterceptor } from './safe-listener.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const logger = new Logger('Bootstrap');
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    // new SafeListenerInterceptor(),
  );
  app.enableShutdownHooks();
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
    }),
  );
  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  logger.log(`Listening on port ${port}`);
}

void bootstrap();
