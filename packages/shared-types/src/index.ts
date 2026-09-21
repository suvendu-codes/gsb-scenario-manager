export type OrderLifecycleStage =
  | "created"
  | "released"
  | "picking"
  | "packed"
  | "shipped";

export interface OrderPayload {
  orderId: string;
  orderLines: OrderLinePayload[];
}

export interface OrderLinePayload {
  sku: string;
  quantity: number;
}

export interface LifecycleEvent {
  eventId: string;
  orderId: string;
  stage: OrderLifecycleStage;
  occurredAt: string;
}

export const ORDER_EVENTS_TOPIC = "order.events";
