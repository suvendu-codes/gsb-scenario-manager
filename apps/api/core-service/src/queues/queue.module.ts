import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { appConfig } from '../config';
import { Queue_Names } from './queue.constants';

const redisConnection = appConfig.redis;

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
