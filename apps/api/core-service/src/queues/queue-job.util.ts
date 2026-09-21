import { JobsOptions } from 'bullmq';
import { LifecycleEvent, ORDER_EVENTS_TOPIC } from 'shared-types';

export const defaultQueueJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 3000,
  },
  removeOnComplete: 100,
  removeOnFail: false,
};

export function buildOrderLifecycleJob(
  event: LifecycleEvent,
  options: JobsOptions = defaultQueueJobOptions,
): { name: string; data: LifecycleEvent; opts: JobsOptions } {
  return {
    name: ORDER_EVENTS_TOPIC,
    data: event,
    opts: options,
  };
}
