export const EVENT_SOURCE = Symbol('EVENT_SOURCE');

export interface EventDelivery {
  /** JSON-encoded event envelope; transport headers are not domain fields. */
  body: Buffer | null;
  /** Safe identifiers for logging. Never include credentials or event payloads. */
  context: Readonly<Record<string, string | number>>;
  /** Resolve only when the transport has accepted the acknowledgement. */
  acknowledge(): Promise<void>;
}

/*
 * "Port" = an interface describing what the worker needs, without saying how it is done.
 * Kafka implements it (infrastructure/kafka-event-source.ts); tests use a mock.
 *
 * The contract that gives us "at-least-once" delivery:
 *   1. the source hands the worker a message,
 *   2. the worker saves it to the database,
 *   3. ONLY THEN the worker calls acknowledge() (for Kafka: commit the offset = "I have read
 *      up to here").
 * If we crash between 2 and 3 the message is delivered again, which is safe because saving is
 * idempotent (duplicates are detected by sequence number, see domain/plan-run-events.ts).
 */
export interface EventSource {
  /** Begin delivery. Await handlers; retain/retry rejected deliveries without acknowledging.
   * Clean up partially initialized resources if startup fails.
   */
  start(handler: (delivery: EventDelivery) => Promise<void>): Promise<void>;
  /** Stop new delivery and await in-flight handlers before releasing resources. */
  stop(): Promise<void>;
}
