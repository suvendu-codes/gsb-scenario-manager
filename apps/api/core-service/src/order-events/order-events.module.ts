import { Module } from '@nestjs/common';
import { QueueModule } from '../queues/queue.module';
import { OrderEventsProcessor } from './order-events.processor';
import { OrderEventsService } from './order-events.service';

@Module({
  imports: [QueueModule],
  providers: [OrderEventsService, OrderEventsProcessor],
  exports: [OrderEventsService],
})
export class OrderEventsModule {}
