import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { Queue_Names } from './queue.constants';

const redisConnection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

@Module({
  imports: [
    BullModule.forRoot({
      connection: redisConnection,
    }),
    BullModule.registerQueue(
      { name: Queue_Names.START_SIMULATION },
      { name: Queue_Names.ORDER_EVENTS },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
