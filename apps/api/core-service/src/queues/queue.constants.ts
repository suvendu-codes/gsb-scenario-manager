export const Queue_Names = {
  START_SIMULATION: 'start-simulation',
  ORDER_EVENTS: 'order-events',
} as const;

export type QueueName = (typeof Queue_Names)[keyof typeof Queue_Names];
