import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor, logger } from 'shared';
import { appConfig } from './config';

async function bootstrap() {
  logger.log('starting app...');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips properties that don't have decorators
      forbidNonWhitelisted: true,
      transform: true, // automatically transforms payloads to be objects typed according to their dto claases
      disableErrorMessages: false,
    }),
  );
  const port = Number(appConfig.get('port'));
  await app.listen(port);
  logger.log(
    `Listening on port ${port} (${String(appConfig.get('env'))}). ${logger.count} total logs`,
  );
}
void bootstrap();
