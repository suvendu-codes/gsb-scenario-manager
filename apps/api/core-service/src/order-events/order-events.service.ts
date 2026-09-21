import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { LifecycleEvent } from 'shared-types';
import {
  buildOrderLifecycleJob,
  defaultQueueJobOptions,
} from '../queues/queue-job.util';
import { Queue_Names } from '../queues/queue.constants';

@Injectable()
export class OrderEventsService {
  private readonly logger = new Logger(OrderEventsService.name);

  constructor(
    @InjectQueue(Queue_Names.ORDER_EVENTS)
    private readonly orderEventsQueue: Queue,
  ) {}

  async publish(
    event: LifecycleEvent,
    options: JobsOptions = defaultQueueJobOptions,
  ): Promise<void> {
    const job = buildOrderLifecycleJob(event, options);
    await this.orderEventsQueue.add(job.name, job.data, job.opts);
    this.logger.log(`Enqueued ${event.stage} for order ${event.orderId}`);
  }
}
