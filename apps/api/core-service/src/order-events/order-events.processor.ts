import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { LifecycleEvent } from 'shared-types';
import { Queue_Names } from '../queues/queue.constants';

@Processor(Queue_Names.ORDER_EVENTS)
export class OrderEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderEventsProcessor.name);

  process(job: Job<LifecycleEvent>): Promise<void> {
    this.logger.log(
      `order-events job ${job.id}: ${job.data.stage} for order ${job.data.orderId}`,
    );
    return Promise.resolve();
  }
}
