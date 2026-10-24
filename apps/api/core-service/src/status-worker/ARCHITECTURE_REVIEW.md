# Status worker architecture review

## Corrected findings

- **Major — terminal outcomes could change:** the earlier cross-topic override
  allowed completed/failed/cancelled runs to change terminal status. This conflicts
  with the documented sticky-terminal rule. Terminal status events are now ignored;
  late results may enrich a record but never change its terminal lifecycle.
- **Cleanup error masking:** Kafka startup cleanup could replace the original
  connection/subscription error. Cleanup failure is now logged separately and
  the original startup error is preserved, with regression coverage.
- **Backend CI coverage:** the workflow previously ran only web checks. A dedicated
  core-service job now runs lint, typecheck, build, and all backend tests.
- **Major — silent consumer termination:** disabling KafkaJS logs hid fatal
  consumer crashes. A sanitized CRASH listener now reports whether restart
  is scheduled or operator intervention is required.
- **Development gap — no broker:** the worker now depends on a minimal
  consumer interface. A standalone development runner uses the same processing
  and acknowledgement code with mock transport, and either in-memory storage
  or the actual PostgreSQL repository. Production wiring remains KafkaJS.

## Reviewed guarantees

- Correlation lookup is unique; engine identity cannot be rebound.
- PostgreSQL row locking covers the read/decision/write transaction.
- Offsets are committed after persistence; a commit failure safely replays.
- Independent status/result clocks prevent one event type suppressing the other.
- Terminal runs cannot return to an active state or change terminal outcome.
- Shutdown drains delivery before the pool closes; database waits are bounded.
- Runtime validation rejects malformed envelopes; full result JSON is retained.

## Remaining rollout decisions and limitations

- **Poison-message policy:** malformed or unknown-correlation events remain
  unacknowledged. No DLQ is implemented. Persistent bad records stall progress;
  Kafka consumer restarts may affect more than the originating partition.
  Decide on DLQ routing and operational recovery before production rollout.
- **P1 — current event contract mismatch:** the updated PDF defines sequence
  numbers, engine build version, resuming, and heartbeats. The strict schema still
  rejects sequence/engine_version and has no heartbeat branch; the state enum lacks
  triggering/resuming. The current implementation still orders by timestamps.
  Updated engine events can therefore stall consumption. Implement schema,
  persistence, and sequence-based ordering together before engine integration;
  do not just permit and discard these fields.
- **Lifecycle bookkeeping:** pending command completion, heartbeat receipt times,
  and scenario failure counters/brake are not implemented. Existing scenario labels
  remain running/paused/finished rather than the PDF's active/completed/failed/cancelled.
- **Database rollout:** apply migrations 0001 and 0002. Migration 0002 reconciles
  the initial scenario enum with the existing application labels and introduces
  current-run ownership, retry links, and one-active-run enforcement.
- **Trigger lifecycle:** the triggering service must create the run before
  publishing. This worker cannot infer scenario identity from response events.
- **Operational validation:** real Kafka rebalance/restart behavior and real
  PostgreSQL concurrent updates still need integration testing. Monitor group
  lag and crash logs; the service has no worker-specific readiness endpoint.
- **Domain decisions:** the agreed execution model is many runs per scenario,
  at most one active, with each retry creating a fresh correlation ID. Only
  the current run changes scenario status, atomically with the run update.
  Engine reference objects remain JSON strings in the existing text column.

The module is suitable for local development and review. Mock test success is
not a production-readiness certification.

## Adapter separation

The worker now depends on transport-neutral `EventSource` deliveries and a
`RunEventRepository`. Kafka subscription and offset operations are isolated in
`KafkaEventSource`. Scenario CRUD uses the separate `ScenarioRepository` port.
`StatusWorkerModule.register` and `ScenariosModule.register` receive typed
provider bindings; `AppModule` explicitly selects the production adapters.
Run lifecycle state and enum values now live in the domain and are reused by
the Drizzle schema, reversing the previous domain-to-database dependency.

Replacement tests boot modules with class, value, and factory providers and a
source without Kafka-specific identifiers. They verify persisted state before
acknowledgement, failure propagation without acknowledgement, and source stop
on module shutdown. Adapter replacement still requires preserving atomicity
and durable acknowledgement semantics described in the README.

## Execution ownership update

The repository locks the scenario before the run and checks explicit
`current_run_id` ownership before changing scenario status. Trigger writers
must use the same lock order and update the pointer atomically with run creation.
Database constraints enforce one active execution and same-scenario current/run
retry references. No attempt field or overwrite-on-retry behavior is introduced.
Late historical events cannot affect the current execution or scenario.

The updated migration and actual repository were exercised with temporary
embedded PostgreSQL (PGlite), including legacy backfill, uniqueness/FK violations,
late events, and rollback when the scenario update fails. This does not replace
live PostgreSQL concurrent-session or Kafka integration testing.

## Latest verification scope

The unit suite covers current-run isolation, historical events, identity checks,
terminal stickiness, duplicate processing, acknowledgement failures, adapter
replacement, and cleanup. Passing tests validate the implemented contract, not
all requirements in the newer PDF. Live Kafka rebalances and multi-session
PostgreSQL races remain unverified. The trigger/outbox path must still create
new execution identities and update current_run_id atomically.
