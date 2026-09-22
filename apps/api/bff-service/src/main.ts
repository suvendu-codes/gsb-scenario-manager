import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './gateway/redis-io.adapter';
import { Logger, ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from 'shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const logger = new Logger('Bootstrap');
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
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const redisIoAdapter = new RedisIoAdapter(app, redisUrl);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
  }

  const kafkaBrokers = process.env.KAFKA_BROKERS;
  if (kafkaBrokers) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: kafkaBrokers.split(','),
        },
        consumer: {
          groupId: 'bff-live',
        },
      },
    });
    await app.startAllMicroservices();
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`Listening on port ${port}`);
}
void bootstrap();
