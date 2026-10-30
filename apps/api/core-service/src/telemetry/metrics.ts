import { metrics } from '@opentelemetry/api';

/*
 * Application metrics. Instruments are created once here and recorded at the call sites.
 *
 * With no OTel SDK registered (tests, local dev without OTEL_EXPORTER_OTLP_ENDPOINT) the API
 * returns no-op instruments, so recording is always safe and free.
 *
 * Rules (also in the StatusWorker "OBSERVABILITY PLAN"):
 *  - Labels must stay bounded: engine, outcome, stage, category, command, event type, error code.
 *  - Never use run/correlation/scenario IDs, offsets, URLs or exception messages as labels.
 *  - Durations and ages are in seconds.
 * The catalog for dashboard authors is in METRICS.md next to this file.
 */
const meter = metrics.getMeter('scenario-manager');

const seconds = { unit: 's' } as const;
// Buckets (seconds) that resolve both fast calls (ms) and slow ones (tens of seconds).
const DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60];
// Event age and delivery delay can legitimately be minutes when something is unhealthy.
const AGE_BUCKETS = [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600, 1800, 3600];

const duration = { ...seconds, advice: { explicitBucketBoundaries: DURATION_BUCKETS } };
const age = { ...seconds, advice: { explicitBucketBoundaries: AGE_BUCKETS } };

/** Elapsed seconds since a `performance.now()` timestamp. */
export const elapsedSeconds = (startedAt: number) => Math.max(0, (performance.now() - startedAt) / 1000);

/**
 * Bounded label for an error: its machine-readable `code` when it has a safe one
 * (DomainError / RunEventRejectedError), otherwise `internal_error`.
 * Never the message, which can carry user data.
 */
export function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(code) ? code : 'internal_error';
}

// ---------------------------------------------------------------- API: scenarios and runs

export const runTriggers = meter.createCounter('scenario_manager.run.triggers', {
  description: 'Run trigger requests by result. outcome: queued | replayed | rejected; reason is set when rejected.',
});
export const runTriggerDuration = meter.createHistogram('scenario_manager.run.trigger.duration', {
  description: 'Time to handle a run trigger request, by outcome.',
  ...duration,
});
export const runTerminal = meter.createCounter('scenario_manager.run.terminal', {
  description: 'Runs that reached a terminal status reported by the engine (completed | failed | cancelled).',
});
export const scenarioOperations = meter.createCounter('scenario_manager.scenario.operations', {
  description: 'Successful scenario writes. operation: create | update | clone | delete.',
});

// ---------------------------------------------------------------- Outbox worker

export const outboxMessages = meter.createCounter('scenario_manager.outbox.messages', {
  description: 'Outbox rows by delivery outcome: published | retried | dead | released | lease_lost.',
});
export const outboxPublishDuration = meter.createHistogram('scenario_manager.outbox.publish.duration', {
  description: 'Time for the broker to acknowledge one command. outcome: success | failure.',
  ...duration,
});
export const outboxDeliveryDelay = meter.createHistogram('scenario_manager.outbox.delivery.delay', {
  description: 'Time from the command being queued (run created) to the broker acknowledging it.',
  ...age,
});
export const outboxLoopFailures = meter.createCounter('scenario_manager.outbox.iteration.failures', {
  description: 'Outbox delivery passes that failed outright (typically the database was unavailable).',
});
export const outboxPending = meter.createObservableGauge('scenario_manager.outbox.pending', {
  description: 'Outbox rows waiting for delivery.',
});
export const outboxOldestPendingAge = meter.createObservableGauge('scenario_manager.outbox.oldest_pending.age', {
  description: 'Age of the oldest outbox row still waiting for delivery; 0 when the outbox is empty.',
  ...seconds,
});

// ---------------------------------------------------------------- Status worker

export const statusEventsReceived = meter.createCounter('scenario_manager.status_worker.events.received', {
  description: 'Kafka deliveries received. Counts attempts, so redeliveries increase it.',
});
export const statusEventsProcessed = meter.createCounter('scenario_manager.status_worker.events.processed', {
  description: 'Run events persisted. outcome: updated | ignored | held. Labels: engine, event_type.',
});
export const statusEventsAcknowledged = meter.createCounter('scenario_manager.status_worker.events.acknowledged', {
  description: 'Kafka deliveries acknowledged after processing.',
});
export const statusEventFailures = meter.createCounter('scenario_manager.status_worker.events.failures', {
  description:
    'Deliveries left unacknowledged. stage: processing | acknowledgement; category: rejected | infrastructure | commit; rejection_code when rejected.',
});
export const statusProcessingDuration = meter.createHistogram('scenario_manager.status_worker.processing.duration', {
  description: 'Time to parse, validate and persist one event (ends before the offset commit).',
  ...duration,
});
export const statusHandlingDuration = meter.createHistogram('scenario_manager.status_worker.handling.duration', {
  description: 'End-to-end time to handle one delivery, including the offset commit.',
  ...duration,
});
export const statusEventAge = meter.createHistogram('scenario_manager.status_worker.event.age', {
  description:
    'Engine emitted_at to receipt. Not Kafka lag: clocks differ, retries keep old timestamps, idle runs are normal.',
  ...age,
});
export const statusEventClockSkew = meter.createCounter('scenario_manager.status_worker.event.clock_skew', {
  description: 'Events whose emitted_at is in the future relative to this worker (engine/worker clock skew).',
});

// ---------------------------------------------------------------- Database pool

export const dbPoolConnections = meter.createObservableGauge('scenario_manager.db.pool.connections', {
  description: 'Pool connections by state: idle | used.',
});
export const dbPoolPending = meter.createObservableGauge('scenario_manager.db.pool.pending_requests', {
  description: 'Callers waiting for a free pool connection. Sustained values above 0 mean the pool is too small.',
});
export const dbPoolErrors = meter.createCounter('scenario_manager.db.pool.errors', {
  description: 'Errors raised by idle pool clients (for example a database restart).',
});

export { meter };
