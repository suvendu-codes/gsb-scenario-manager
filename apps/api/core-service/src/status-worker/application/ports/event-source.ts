export const EVENT_SOURCE = Symbol('EVENT_SOURCE');

export interface EventDelivery {
  /** JSON-encoded event envelope; transport headers are not domain fields. */
  body: Buffer | null;
  /** Safe identifiers for logging. Never include credentials or event payloads. */
  context: Readonly<Record<string, string | number>>;
  /** Resolve only when the transport has accepted the acknowledgement. */
  acknowledge(): Promise<void>;
}

export interface EventSource {
  /** Begin delivery. Await handlers; retain/retry rejected deliveries without acknowledging.
   * Clean up partially initialized resources if startup fails.
   */
  start(handler: (delivery: EventDelivery) => Promise<void>): Promise<void>;
  /** Stop new delivery and await in-flight handlers before releasing resources. */
  stop(): Promise<void>;
}
