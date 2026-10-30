# Metrics catalog

Application metrics exported over OTLP to the in-cluster collector, then to ClickStack. They are
defined in `metrics.ts`. Durations and ages are in seconds. Labels are bounded: never add run,
correlation or scenario IDs, offsets, URLs or error messages as labels.

Export is on when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (see `otel.ts`). Interval: 60 s by default
(`OTEL_METRIC_EXPORT_INTERVAL`, in ms). Set `OTEL_METRICS_EXPORTER=none` to turn metrics off.

HTTP request rate, latency and status codes already come from the http/express auto-instrumentation
(`http.server.request.duration`), so there is no custom HTTP metric.

## API (runs and scenarios)

| Metric | Type | Labels | Use |
|---|---|---|---|
| `scenario_manager.run.triggers` | counter | `engine`, `outcome` (queued, replayed, rejected), `reason` (error code, when rejected) | Trigger volume and why triggers are refused (`scenario_invalid`, `scenario_blocked`, `engine_unavailable`, ...) |
| `scenario_manager.run.trigger.duration` | histogram (s) | `outcome` | Trigger endpoint latency, including upstream checks |
| `scenario_manager.run.terminal` | counter | `engine`, `status` (completed, failed, cancelled) | Run success rate per engine |
| `scenario_manager.scenario.operations` | counter | `operation` (create, update, clone, delete) | Scenario write activity |

## Outbox worker (API to engine commands)

| Metric | Type | Labels | Use |
|---|---|---|---|
| `scenario_manager.outbox.messages` | counter | `outcome` (published, retried, dead, released, lease_lost), `command` (run, pause, resume, cancel) | Delivery health. Alert on any `dead`; rising `retried` means the broker is unhealthy |
| `scenario_manager.outbox.publish.duration` | histogram (s) | `outcome` (success, failure) | Broker acknowledgement latency |
| `scenario_manager.outbox.delivery.delay` | histogram (s) | `command` | Run created to broker-acknowledged; the user-visible trigger latency |
| `scenario_manager.outbox.iteration.failures` | counter | none | Delivery passes that failed outright (usually database down) |
| `scenario_manager.outbox.pending` | gauge | none | Rows waiting for delivery |
| `scenario_manager.outbox.oldest_pending.age` | gauge (s) | none | Age of the oldest waiting row; the best single "outbox is stuck" signal |

Dead rows are not a gauge (the table has no index for them). Use the `dead` outcome of
`outbox.messages` or the `outbox_message_dead` log event.

## Status worker (engine events to run state)

| Metric | Type | Labels | Use |
|---|---|---|---|
| `scenario_manager.status_worker.events.received` | counter | none | Deliveries received (attempts, so redeliveries count) |
| `scenario_manager.status_worker.events.processed` | counter | `engine`, `event_type`, `outcome` (updated, ignored, held) | Events persisted. `held` means a sequence gap |
| `scenario_manager.status_worker.events.acknowledged` | counter | `outcome` | Offsets committed |
| `scenario_manager.status_worker.events.failures` | counter | `stage` (processing, acknowledgement), `category` (rejected, infrastructure, commit), `rejection_code` | Unacknowledged deliveries. A blocked partition shows as a steady rate here |
| `scenario_manager.status_worker.processing.duration` | histogram (s) | `outcome` | Parse, validate and persist time (successful events) |
| `scenario_manager.status_worker.handling.duration` | histogram (s) | `outcome` | End-to-end per delivery including the offset commit (successful events) |
| `scenario_manager.status_worker.event.age` | histogram (s) | `engine`, `event_type` | Engine `emitted_at` to receipt. Not Kafka lag |
| `scenario_manager.status_worker.event.clock_skew` | counter | `engine` | Events stamped in the future (clock skew) |

Kafka consumer-group lag must come from platform monitoring, so it stays visible when this worker
is down. Likewise detect a missing worker externally, not from its own counters.

## Database pool

| Metric | Type | Labels | Use |
|---|---|---|---|
| `scenario_manager.db.pool.connections` | gauge | `state` (idle, used) | Pool utilization |
| `scenario_manager.db.pool.pending_requests` | gauge | none | Callers waiting for a connection; sustained above 0 means the pool is too small |
| `scenario_manager.db.pool.errors` | counter | none | Idle-client errors (e.g. database restart) |

## Dashboard and alert starting points

- Trigger health: rate of `run.triggers` by `outcome`; p95 of `run.trigger.duration`.
- Run success: `run.terminal{status=completed}` over all terminal statuses, per engine.
- Outbox: `outbox.oldest_pending.age` above a few seconds, any `outbox.messages{outcome=dead}`,
  p95 of `outbox.delivery.delay`.
- Status worker: `events.failures` rate above 0 for several minutes, p95 of
  `processing.duration`, `events.processed{outcome=held}` (sequence gaps).
- Database: `db.pool.pending_requests` above 0 sustained.
