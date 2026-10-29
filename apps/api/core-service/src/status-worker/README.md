# Status worker

The Nest `StatusWorkerModule` consumes `run.status`, `run.result`, and `run.heartbeat` events and
updates an existing `run` by its unique `correlation_id`. The trigger flow must
persist that row before publishing the trigger. Events cannot create a run:
the response envelope does not contain its required `scenario_id`.

## Sequence diagrams

### Status and result consumption (implemented)

```mermaid
sequenceDiagram
    participant Engine as Emulator / Simulator
    participant Kafka
    participant Worker as Status worker
    participant DB as PostgreSQL
    Note over Engine,DB: Trigger flow has already persisted the scenario, run, and current-run pointer
    Engine->>Kafka: Publish run.status or run.result
    Kafka->>Worker: Deliver event with topic, partition, offset
    Worker->>Worker: Parse and validate event schema and execution identity
    alt Invalid event
        Worker->>Worker: Log processing failure; do not acknowledge
    else Valid event
        Worker->>DB: BEGIN; find run by correlation_id
        Worker->>DB: Lock owning scenario, then run
        Worker->>Worker: Validate sequence and command identity; plan contiguous events
        alt Unknown run, identity mismatch, or database error
            Worker->>DB: ROLLBACK
            Worker->>Worker: Log failure; do not acknowledge
        else Verified duplicate
            Worker->>DB: COMMIT without changes
            Worker->>Kafka: Commit next offset
        else Applicable event or durable gap receipt
            Worker->>DB: Store receipt; update contiguous state, command, result, or recovery flag
            opt Run is scenario.current_run_id
                Worker->>DB: Update scenario status in same transaction
            end
            Worker->>DB: COMMIT
            Worker->>Kafka: Commit next offset
        end
    end
    Note over Kafka,DB: Offset commit failure leaves persisted changes safe for replay
```

Kafka retry behavior belongs to the event-source adapter. A failed record is not
discarded or sent to a DLQ by the current implementation. Historical-run events
can update that run under the same rules but cannot change the current scenario.

### Health, progress, and alert evaluation (planned)

The participants below describe responsibilities, not selected services or tools.
The worker records heartbeat/progress observations. Alert evaluation and missing-event retrieval are not implemented.

```mermaid
sequenceDiagram
    participant Engine as Emulator / Simulator
    participant Kafka
    participant Worker as Status worker
    participant Store as Run observation store
    participant Signals as Independent platform / Kafka monitoring
    participant Evaluator as Health evaluator
    participant Alerts as Alerting system
    participant Operator
    Engine->>Kafka: Heartbeat and meaningful progress observations
    Kafka->>Worker: Deliver observation
    Worker->>Worker: Validate identity, sequence, and freshness
    Worker->>Store: Persist applicable heartbeat / progress observation
    Store-->>Worker: Persistence succeeds
    Worker->>Kafka: Acknowledge delivery
    Note over Signals,Evaluator: Monitoring remains independent of worker availability
    loop Periodic evaluation
        Evaluator->>Signals: Read monitoring, worker, and delivery health
        Signals-->>Evaluator: Availability, connectivity, lag, and signal freshness
        alt Required monitoring signals unavailable
            Evaluator->>Alerts: Monitoring unavailable; execution health unknown
        else Worker unavailable
            Evaluator->>Alerts: Status worker unavailable
        else Delivery degraded or recovering
            Evaluator->>Alerts: Event processing delayed / recovery context
        else Worker and delivery healthy
            Evaluator->>Store: Read active-run heartbeat and progress observations
            Store-->>Evaluator: Latest validated observations and phase
            alt Heartbeat missing beyond agreed timeout
                Evaluator->>Alerts: Execution heartbeat missing; health unknown
            else Fresh heartbeat but progress deadline exceeded
                Evaluator->>Alerts: Execution progress stalled
            else Relevant signal recovered
                Evaluator->>Alerts: Resolve corresponding execution alert
            end
        end
    end
    Alerts-->>Operator: Deduplicated notification with execution and delivery context
    Note over Evaluator,Operator: Alerts do not change lifecycle status or automatically retry executions
```

When prerequisites are unhealthy, suppress new execution alerts rather than infer
an engine failure. Suppression does not resolve existing execution alerts. Allow
catch-up after recovery; old queued observations must not restore fresh health.
The evaluator itself also needs independent availability monitoring. Thresholds,
storage, alert routing, and evaluator deployment remain deferred decisions.

## Data model

### Persisted scenario and run model (implemented)

The diagram shows the fields relevant to this component. The schema definitions
in `../db/schema/scenario.ts` and `../db/schema/run.ts` are the source of truth
(paths relative to this directory).

```mermaid
erDiagram
    SCENARIO ||--o{ RUN : owns
    SCENARIO o|--o| RUN : selects_current
    RUN o|--o{ RUN : retry_parent
    RUN ||--o{ RUN_EVENT_INBOX : stores_receipts
    RUN_EVENT_INBOX {
        uuid run_id PK,FK "internal SM ID"
        bigint sequence PK
        jsonb payload
        timestamptz received_at
    }
    SCENARIO {
        uuid id PK
        text project_id
        text map_id
        text name
        enum status
        uuid current_run_id FK "nullable; same scenario"
        timestamptz created_at
        timestamptz updated_at
    }
    RUN {
        uuid id PK "Scenario Manager run ID"
        text correlation_id UK "unique execution correlation"
        uuid scenario_id FK
        uuid retry_of_run_id FK "nullable; same scenario"
        text run_id "nullable engine execution ID"
        enum engine
        enum status
        enum verdict "legacy read-only"
        text pending_command "nullable action enum"
        bigint command_sequence "echoed request identity"
        text decision "accepted or rejected"
        text command_reason
        bigint last_event_sequence
        boolean recovery_required
        timestamptz heartbeat_emitted_at
        timestamptz heartbeat_received_at
        jsonb progress
        text reason "nullable"
        text status_message "nullable"
        jsonb results "opaque JSON object"
        text engine_ref "nullable serialized URL object"
        timestamptz status_event_at "nullable producer timestamp"
        timestamptz result_event_at "nullable producer timestamp"
        timestamptz created_at
        timestamptz updated_at
        timestamptz completed_at "nullable"
    }
```

- A scenario owns many runs and selects at most one current run. Its current
  pointer may be null before execution and remains set after completion.
- Composite foreign keys constrain current-run and retry references to the same
  scenario. A run cannot be its own retry parent.
- A partial unique index permits at most one nonterminal run per scenario,
  including paused runs. Every retry creates a new row and correlation ID.
- `run.id` is the internal primary key; `run.run_id` is the engine's execution ID,
  bound on an applicable response. They have different meanings.
- Status/results share a persisted sequence. Producer timestamps are diagnostic, not the ordering authority.
  `updated_at` is a database update timestamp, not proof of a fresh heartbeat or
  meaningful progress. Use the dedicated heartbeat fields, not generic row update timestamps, for reporting freshness.

### Health and progress observations (proposed, not implemented)

This logical model separates lifecycle data from execution observations. It does
not mandate new tables: decide whether to use run columns, a related table, or
the existing observability platform after reviewing current practices.

```mermaid
erDiagram
    RUN ||--o| RUN_HEALTH_OBSERVATION : has_latest
    RUN ||--o{ EXECUTION_ALERT : has_conditions
    RUN_HEALTH_OBSERVATION {
        uuid run_id PK,FK "internal run primary key"
        timestamptz heartbeat_received_at
        timestamptz heartbeat_emitted_at
        bigint heartbeat_sequence
        text phase
        bigint progress_revision
        jsonb progress_details
        timestamptz progress_emitted_at
        timestamptz progress_received_at
        timestamptz last_progress_advanced_at
        text health_assessment "separate from lifecycle"
        timestamptz evaluated_at
    }
    EXECUTION_ALERT {
        text alert_key PK "stable deduplication identity"
        uuid run_id FK "internal run primary key"
        text condition "heartbeat missing or progress stalled"
        text state "open, acknowledged, resolved"
        timestamptz opened_at
        timestamptz last_notified_at
        timestamptz resolved_at
    }
```

An observation record may be absent until reporting begins; individual values may
also be unknown until observed. Freshness, ordering, and progress-advancement
semantics must be agreed with producers before finalizing fields or schema changes.
Receipt timestamps alone cannot distinguish a fresh report from queued old data.
`last_progress_advanced_at` needs a defined time basis and clock-skew handling.
Any observation state must be tied to the exact execution rather than only the
scenario, so a historical run cannot refresh the current run's health.

Execution alert records are a logical view and may be owned by existing alerting
tools rather than PostgreSQL. Worker, Kafka, and monitoring availability alerts
belong to their service/group/partition scope, not to an individual run. The implemented heartbeat fields store latest observations only. Separate health/alert tables and health-driven lifecycle changes are not introduced.

## Configuration and rollout

Run the single baseline `apps/api/core-service/db/schema.sql` for a fresh database.
It creates the current scenario, run and event-inbox tables, enums, indexes and
constraints in one transaction. Local startup and CI call this same script automatically.
There is no incremental migration chain, migration-history table or legacy-data backfill.

Repeated initialization checks the existing columns, enum labels and named safety
constraints and preserves application data. A partial/incompatible schema fails
rather than being converted or erased. For later schema changes, use a fresh disposable
database or explicitly choose a local reset; initialization never drops stored data.

Manual setup from the repository root after starting PostgreSQL:

```sh
docker compose -f compose.local.yml exec -T postgres psql -U scene -d scene_local -v ON_ERROR_STOP=1 < apps/api/core-service/db/schema.sql
```

Set `STATUS_WORKER_ENABLED=true`, `KAFKA_BROKERS` (comma-separated),
`KAFKA_STATUS_TOPIC`, and `KAFKA_RESULT_TOPIC`. Both settings default to `run.response` and should name the same response topic for status, result, and health events. Explicit separate-topic overrides remain supported for development/testing. Set `KAFKA_GROUP_ID` consistently across replicas; the default is
`scenario-manager-status-worker`. Topics must already exist. A new group reads
from the beginning; an existing group resumes committed offsets.

TLS is configured with `KAFKA_SSL=true`. Optional SASL/PLAIN uses
`KAFKA_USERNAME` and `KAFKA_PASSWORD` together and requires TLS. Other SASL
mechanisms and custom certificates are not configured by this module.

The worker runs inside core-service, is disabled by default, and drains Kafka
processing before the database pool shuts down. No broker connection is made
when disabled. Run the normal core-service build and startup commands.

## Event and command business rules

The shared contract is the [Confluence Event Schema Proposal](https://greyorange-work.atlassian.net/wiki/spaces/SVRPERFTM/pages/236912869).

| Input | Persistence / rule |
| --- | --- |
| `correlation_id` | Required, unique execution lookup; never create an orphan run |
| `run_id` | Optional engine identity; bind when supplied, preserve when omitted, reject conflicts |
| `sequence` | Positive safe integer; status and results share a counter starting at 1 |
| `command_id` | Action enum: run, pause, resume, cancel |
| `command_sequence` | Echoes SM's command counter; independent from response sequence |
| `decision` | Accepted/rejected command decision; acceptance is not completion |
| Status | Confirmed engine lifecycle; do not overwrite it with pausing/cancelling |
| Results | Opaque JSON, only after completed/failed; no event verdict/status field |
| Heartbeat | Latest fresh observation; never changes lifecycle or clears commands |

One pending command is recorded by the command API. Acceptance keeps it pending.
A correlated destination or rejection clears it; any confirmed terminal state clears
it atomically as well. Rejection of Pause/Resume/Cancel preserves confirmed state.
Run rejection must explicitly report failed, even when no engine run ID is available.
A terminal outcome clearing Pause does not mean Pause succeeded. Command reasons are
stored separately from execution failure reasons.

Completed and failed statuses precede mandatory results. Cancelled executions do not
accept results. Missing results never turn completion into failure. The first terminal
state and completion timestamp remain authoritative; a conflicting new status is a
contract violation, not an acknowledged duplicate. A result cannot complete an active run.

Status/results are persisted in an execution receipt ledger keyed by internal run ID
and sequence. Identical receipts are no-ops; changed payload under the same identity is
rejected. On a gap, preserve confirmed state, store future events, set recovery_required,
and commit only after durable persistence. Unrelated runs can continue. Delivery of the
missing event drains the contiguous held prefix under the same lock and transaction.
A command API must reject new commands while recovery_required is true.

TODO: confirm start-at-1 counters and heartbeat sequencing with engines. Heartbeats
currently do not consume status/result counter slots. TODO: implement the engine recovery
client, bounded replay/retention, missing-result scheduler, and reviewed permanent-loss
policy. No engine HTTP endpoint, timeout, automatic failed state, or retry is invented.

## Delivery and errors

Scenario-then-run row locking serializes updates across topics and replicas. Kafka
offsets are committed only after the database transaction commits, using
at-least-once delivery. Replays are safe through persisted event receipts, sequences, and identity checks. SQL and lock waits are bounded below the consumer session
timeout. KafkaJS retries processing failures with backoff and restarts after
retry exhaustion. See https://kafka.js.org/docs/consuming and
https://kafka.js.org/docs/configuration#default-retry.

Invalid messages, mismatched identities, unknown correlations, and database
failures are not acknowledged. This intentionally blocks progress on the
affected partition until corrected; consumer restarts can also delay other
partitions. There is no automatic discard or DLQ.
A held receipt that fails on replay is different: it was already stored, so it must not
block valid events. If a held event breaks the rules once the gap closes (for example a
non-terminal status held behind a sequence that turns out to be terminal), the worker
commits the valid events before it, keeps the bad receipt in `run_event_inbox`, leaves
`recovery_required = true` and acknowledges the incoming record. Later events for that run
are stored but not applied, and commands stay blocked, until an operator repairs the run
(module test SW-52). An explicit quarantine marker on the receipt is SMF-503/504 work.
Monitor the worker's `run_event_not_acknowledged` logs (topic, partition,
offset only), and consumer group lag. A permanent bad record requires an
operator-approved repair/replay or offset intervention. Agree on a DLQ policy
before enabling if partition blocking is unacceptable.

### Rejected-event reasons

Rejected inputs use typed `RunEventRejectedError` subclasses with sanitized codes.
The existing failure log adds `rejectionCode` only for a classified processing
rejection; database/network and acknowledgement exceptions are propagated without
being mislabeled as invalid engine input. Raw payloads and exception details are
not included in that log.

| Code | Meaning |
| --- | --- |
| `empty_event` | Kafka tombstone/null or zero-length body |
| `malformed_json` | Body is not parseable JSON |
| `invalid_execution_identity` | Both correlation and engine run IDs fail validation |
| `invalid_correlation_id` | Correlation ID is absent, blank, null, or the wrong type |
| `invalid_engine_run_id` | Engine run ID is absent, blank, null, or the wrong type |
| `invalid_event_schema` | Another envelope/payload rule fails validation |
| `unknown_correlation` | Valid correlation ID has no registered run |
| `correlation_mismatch` | Domain input conflicts with the loaded run's correlation |
| `engine_mismatch` | Response engine does not match the registered run |
| `engine_run_id_mismatch` | Response attempts to replace the bound engine execution ID |

Correlation ID is mandatory. Missing engine run ID is valid; a supplied invalid ID is rejected. The first supplied valid engine ID is bound atomically. There is no engine-ID lookup fallback, orphan-run creation, or automatic state correction for invalid input. Unknown correlations require investigation;
configuration or data problems can cause them as well as producer defects.

Every rejection still propagates without acknowledging Kafka and without applying
state changes. Codes do not authorize skipping a record and do not change retry
behavior. Durable capture, quarantine, and controlled replay remain SMF-503/504
work. Metrics, deduplicated alerts, and engine-team reporting remain deferred
until the observability approach in SMF-482 is reviewed. A comment at the failure
boundary records that follow-up. No automatic reporting or new metrics endpoint
is introduced here.

Unit tests cover validation, mappings, lifecycle rules, duplicate/out-of-order
delivery, transactional repository calls, Kafka acknowledgements, failures,
configuration, and startup/shutdown. They use mocked database and broker
boundaries and do not replace a staging PostgreSQL/Kafka integration test.

The separate Docker module suite exercises real Kafka and PostgreSQL, including
event ordering, lifecycle outcomes, rejected inputs, rollback, replay, restart,
and database constraints. See the [plain-language module test guide](../../test/module/README.md)
for every case's steps, expected result, and test ID. Run it from the repository
root with `pnpm test:module`. Fault-injection details and remaining production
coverage gaps are documented in that guide.

Run `pnpm --filter core-service test`, `pnpm --filter core-service typecheck`,
and `pnpm --filter core-service build` from the repository root.

## Observability and alerting (planned)

This section records the agreed direction for future implementation. The worker records latest heartbeat timestamps and optional opaque progress and emits processing/acknowledgement logs. It does not expose monitoring endpoints or evaluate alerts. Review the organization's current observability tooling,
deployment monitoring, Kafka metrics, and alerting practices before selecting an
implementation. No monitoring vendor, exporter, alert destination, event schema,
or timeout is selected here.

### Alert policy

Health is separate from lifecycle status. Missing heartbeats or stalled progress
must not automatically fail, cancel, complete, or retry an execution. Raise an
alert for human investigation and keep the run status unchanged. The run remains
active, so the existing one-active-run constraint continues to prevent a new
execution until an explicit lifecycle action resolves the existing execution.

| Condition | Evidence to collect | Intended alert |
| --- | --- | --- |
| Worker unavailable | Independent deployment/process availability and reachability checks | Status worker unavailable |
| Event processing delayed | Sustained or growing consumer-group lag, slow committed-offset advancement, processing failures or latency | Status event processing delayed |
| Execution progress stalled | Fresh heartbeats, healthy delivery, and no meaningful progress within the current phase's allowed time | Execution progress stalled; investigation required |
| Execution heartbeat missing | No fresh execution heartbeat within the agreed timeout, while worker and delivery are healthy | Execution heartbeat missing; health unknown |
| Monitoring unavailable | Required monitoring signals cannot be collected or evaluated | Monitoring unavailable; execution health cannot be evaluated |

Missing execution heartbeats do not prove the engine is down. Engine failure,
publisher failure, and networking problems can produce the same observation.
Only an independent engine availability signal can support an engine-unavailable
alert. A process being reachable also does not prove its consumer is making
progress; use delivery and processing signals alongside process availability.

### Signal ownership and collection

- **Worker availability:** collect outside the worker through existing platform
  monitoring and external checks. The worker cannot reliably announce its own
  disappearance. Distinguish one unavailable replica from the whole consumer
  service being unavailable, and allow normal startup/rebalance grace periods.
- **Kafka delivery:** use the Kafka platform's monitoring integration or a
  separate collector/exporter querying broker offsets and consumer-group committed
  offsets. Do not rely exclusively on worker-emitted lag metrics: those disappear
  when the worker stops. Kafka metrics must be collected and exposed through the
  chosen monitoring integration; do not assume the broker pushes alerts itself.
- **Worker processing:** instrument successful processing, acknowledgement failures,
  event age, processing duration, database errors, and connectivity. These explain
  delivery delays alongside the independent Kafka signals. Low throughput alone
  is normal when no events are being produced.
- **Execution health and progress:** persist the latest validated observations per
  run. A watchdog or the existing monitoring system can evaluate them; ownership
  and deployment of that evaluator remain open. Monitor the evaluator's own
  availability so its failure does not silently disable execution alerts.

For each topic partition, consumer-group offset lag is the latest broker offset
minus the group's committed next offset, not the topic's byte size. Track both
the group/topic aggregate and the worst partition. Sustained backlog and its
trend indicate delayed processing; they do not by themselves identify the cause.
Database failures, blocked records, insufficient capacity, or connectivity may
all contribute. Agree on offset-lag thresholds and, where supported, time-based
lag or event-age measurements against the expected delivery latency. Handle
missing/invalid offsets as unknown rather than interpreting them as healthy zero
lag. Confirm collector semantics for inactive groups and missing partitions.

### Heartbeats and meaningful progress

A heartbeat means the execution's reporting loop is alive. It does not prove the
execution is advancing. Producers should report meaningful progress either in a
separate progress event or as clearly defined fields within heartbeat events;
align that contract with emulator and simulator teams before implementation.

Observation targets (latest heartbeat timestamps and opaque progress are implemented; phase/progress evaluation remains proposed):

| Observation | Purpose |
| --- | --- |
| Last fresh heartbeat receipt and emission times | Separate receipt from producer freshness and delivery delay |
| Last heartbeat sequence | Prevent replay/duplicates from refreshing health |
| Current execution phase | Select phase-specific progress expectations |
| Last progress revision and progress details | Identify meaningful advancement, such as completed work units |
| Last progress advancement time | Detect lack of progress independently of heartbeat arrival |
| Health assessment and alert state | Track unknown health, deduplicate alerts, and record recovery separately from lifecycle |

Heartbeat sequences advance when heartbeats are emitted. Progress revisions
advance only for meaningful work, not because a reporting timer fired. Define
progress expectations for each phase, including long initialization phases.
Paused runs should continue heartbeats but suspend progress-stall checks.
Terminal runs should no longer be evaluated as active executions. Allow a startup
grace period before the first heartbeat is expected.

Validate correlation ID, engine identity, and engine run ID before recording an
observation. Historical-run events must update only that historical run and must
not refresh the current run's health. Use producer emission time, receipt time,
and sequence together; define clock-skew tolerance so old queued events cannot
restore healthy status merely by arriving after an outage.

### Alert correlation and recovery

Evaluate monitoring availability, worker availability, and delivery health before
attributing missing events to an execution. Suppress new heartbeat/progress alerts
when their prerequisite signals are unavailable or delivery is degraded. Scope
suppression to affected partitions/executions where the available signals allow,
and allow the consumer to catch up after recovery before resuming evaluation.
Suppression must not mark an execution healthy or silently resolve an existing
execution alert.

Raise one alert per condition and affected entity, with deduplicated reminders at
an agreed interval. Execution alerts should include scenario ID, SM run ID,
correlation ID, engine run ID, last fresh heartbeat, current phase, last progress,
and delivery-health context. Keep execution identifiers in alert details and
structured logs; review metric-label cardinality before exposing per-run metrics.

Resolve heartbeat alerts when fresh reporting resumes and progress alerts when
meaningful progress resumes or an explicit lifecycle action closes the run.
Record recovery without changing lifecycle status automatically. Define how
operators acknowledge, investigate, and explicitly resolve an execution through
the team's existing incident workflow.

### Decisions deferred until tooling review

- Existing metrics, logs, dashboards, Kafka monitoring, alert routing, and on-call
  practices; reuse supported integrations where possible.
- Heartbeat/progress schemas, frequency, sequencing, phase semantics, paused-run
  behavior, clock skew, and availability of an independent engine check.
- Timeout and grace-period configuration. Ten minutes is a discussion example,
  not an agreed threshold; choose thresholds from expected behavior and latency.
- Persistence/retention, evaluator ownership, replica-aware worker availability,
  alert deduplication/reminders, recovery rules, and operator runbooks.
- Failure tests for worker outage, delayed consumption, engine/reporting silence,
  continuing heartbeats with stalled progress, monitoring outage, and recovery
  with queued old events.

## Run locally with PostgreSQL and Kafka

Development CLI entry points live in `tools/local/`, module tests in
`test/module/`, and sample events in `test/fixtures/` (relative to core-service).
They compile through `tsconfig.tools.json` into `dist-tools/`; the regular
`tsconfig.build.json` continues to build production `src/` into `dist/`. Unit
tests remain colocated with the files they test. Production startup and feature
boundaries are unchanged.

Prerequisites: Docker Desktop (or Docker Engine with Compose) running, Node.js 22,
and the repository's pnpm version (`12.3.4`). Run all commands below from the
repository root. No local PostgreSQL or Kafka installation is needed.

### Start and exercise the worker

```sh
pnpm local:demo
```

This builds the backend image, starts PostgreSQL and a single-node Kafka broker,
runs the single database schema initializer, creates the topic, starts the standalone status
worker, and runs the mock engine event generator. The generator publishes real
Kafka messages and verifies the resulting PostgreSQL records. Producer and worker
logs appear in the terminal; look for `demo_passed`. The first run downloads
images and dependencies.

The demo exercises a failed run, a separate retry run, late historical events,
pause/resume, JSON results, and duplicate delivery. It inserts scenario/run
fixtures directly rather than exercising a trigger API. Each invocation creates
new fixtures. Heartbeat alert evaluation is planned; the module suite covers observation persistence.

Services remain running after the demo. The standalone worker consumes events
without starting an HTTP server; this command does not start the frontend or
the core-service HTTP API.

### Start services, inspect logs, and generate more events

```sh
pnpm local:up        # Build/start infrastructure and worker; rebuild after code changes
pnpm local:ps        # Inspect containers and health
pnpm local:logs      # Follow worker logs; Ctrl+C stops following
pnpm local:generate  # Run another event scenario against the running stack
pnpm local:db        # Open the local PostgreSQL SQL console
```

PostgreSQL is available at
`postgresql://scene:scene@127.0.0.1:55432/scene_local`; Kafka is at
`localhost:19092`. Both bind to loopback. The topic is `run.response.local` and
the consumer group is `scenario-worker-local`. Credentials and plaintext broker
access are for local development. These settings are provided by
`compose.local.yml`; no `.env` edit is required for the container demo.

Inspect scenario and run state from the SQL console:

```sql
SELECT s.id AS scenario_id, s.status AS scenario_status, s.current_run_id,
       r.id AS run_id, r.status, r.correlation_id, r.retry_of_run_id, r.results
FROM scenario s JOIN run r ON r.scenario_id = s.id
WHERE s.project_id = 'local-demo'
ORDER BY s.created_at DESC, r.created_at;
```

### Run automated tests

```sh
pnpm test:module
```

The module suite creates a separate, temporary PostgreSQL/Kafka stack, verifies
event consumption and database constraints, saves reports and service logs under
`test-results/module/`, and removes its test containers and volumes afterward.
It can run alongside the persistent local demo. Use Compose 2.24.4 or newer for
the test overlay. This is also the suite run by the CI module-test job.

For fast unit tests on the host, install workspace dependencies first:

```sh
pnpm install --frozen-lockfile
pnpm --filter core-service test
```

### Stop or reset the local stack

```sh
pnpm local:down   # Stop/remove containers; preserve PostgreSQL and Kafka data
pnpm local:reset  # Stop/remove containers AND DELETE the local stack's stored data
```

For initialization failures, inspect all service logs:

```sh
docker compose -f compose.local.yml logs --tail 100 init kafka postgres worker
```

See the repository's [local development guide](../../../../../LOCAL_DEVELOPMENT.md)
for host-port overrides, event pacing, CI details, and troubleshooting. The
Compose file is [compose.local.yml](../../../../../compose.local.yml).

## Run locally without Kafka

Structured logs show `status_worker_starting`, `status_worker_started`,
`run_event_received`, `run_event_processed` (updated or ignored), and
`run_event_acknowledged` with delivery context and duration. Processing logs
include correlation ID, optional engine run ID, event type, sequence, and incoming lifecycle status.
They are emitted only after the repository completes; acknowledgement is logged
only after offset commit succeeds. Failures identify whether processing or
offset commit failed. Payloads, result metrics, engine URLs, credentials, and
raw exception details are not included in worker logs. The mock CLI separately
prints its in-memory demo row as a local diagnostic summary.

From the repository root:

```sh
pnpm --filter core-service worker:mock
```

This builds and runs a separate development CLI with an in-process consumer
and an in-memory run repository. It needs neither Kafka nor PostgreSQL. The
sample at `apps/api/core-service/test/fixtures/run-events.json` drives accepted,
setup-ready, running, completed, and result events through the real worker and prints
the final row and acknowledged offsets. Each invocation starts fresh with
one demo run (`mock-correlation-1`). It does not change your database.

To mock only Kafka and update real local PostgreSQL rows:

```sh
pnpm --filter core-service worker:mock --database --file /absolute/path/events.json
```

Initialize the schema first, configure the usual `DATABASE_URL` or `DB_*`
settings, and provide a JSON array of events whose correlation IDs and engines
match existing run rows. This mode performs real database updates; it does
not seed scenarios or runs. Both CLI modes reject `NODE_ENV=production`.
No HTTP injection endpoint or mock switch is added to the production service.

The mock records explicit offset commits, retains a failed message for a later
`drain()` retry, and serializes delivery. Automated tests exercise a database
failure and an offset-commit failure followed by replay. It is intentionally
a single-process, single-partition approximation: it does not simulate Kafka
rebalances, broker persistence, networking, partition concurrency, or retry
timing. It cannot establish production Kafka readiness.

## Replace event and scenario sources

`AppModule` is the composition root. Choose adapters there; application and
domain code do not import KafkaJS, Drizzle, or database schema types.

Three independent contracts allow replacements:

| Contract | Responsibility | Default implementation |
| --- | --- | --- |
| `EventSource` | Start/stop delivery and provide an acknowledgement callback | `KafkaEventSource` |
| `RunEventRepository` | Atomically apply an event to a scenario run | `DrizzleRunEventRepository` |
| `ScenarioRepository` | Scenario CRUD and query operations | `DrizzleScenarioRepository` |

Register alternatives using Nest `useClass`, `useValue`, `useFactory`, or
`useExisting` bindings. For example, a test composition can use:

```ts
ScenariosModule.register({
  repository: { useClass: InMemoryScenarioRepository },
});

StatusWorkerModule.register({
  eventSource: { useValue: myEventSource },
  runRepository: {
    useFactory: () => new InMemoryRunEventRepository(seedRuns, seedScenarios),
  },
});
```

Both module registration methods accept `imports` for adapter dependencies.
The production composition imports `KafkaEventSourceModule` and binds its
exported `KafkaEventSource` via `useExisting`. PostgreSQL remains the explicit
default in `AppModule`; mock storage is never selected implicitly.

A new queue, polling, or file source implements `EventSource.start(handler)`
and `stop()`. Each delivery supplies JSON bytes, safe logging context, and
`acknowledge()`. The worker awaits repository persistence before calling it.
The adapter owns its subscription, cursor/offset semantics, retry policy, and
shutdown draining. No Kafka-shaped API is required by the worker. Source
failures must not silently discard or acknowledge pending messages.

A new run repository implements `apply(event)` using the shared
`applyRunEvent` domain rules within an atomic update. Use a transaction/row
lock or compare-and-swap retry to prevent concurrent lost updates. Map the
external store's representation to the independent `RunState` domain model,
and resolve only after persistence succeeds. In-memory storage is for local
development, not durable delivery. Scenario repositories independently
implement the existing `ScenarioRepository` contract; changing scenario
storage does not automatically change run storage, so configure both when
moving the complete data source. Run-event persistence must be able to update
both the run and its scenario atomically; two unrelated stores without a shared
transaction do not satisfy this contract.

Module tests boot a non-Kafka push source with alternate run repositories and
the scenario module with in-memory storage, without importing a database or
Kafka module. The existing mock consumer tests still exercise the Kafka adapter's
offset behavior and the same transport-neutral worker.

## Execution and retry requirements

A scenario may have many execution records, but at most one nonterminal run.
Every intentional execution/retry gets a new SM primary key and a new unique
`correlation_id`; the engine's `run_id` is independently bound by responses.
There is no attempt field and no resetting of a historical run. Results remain
an opaque JSON object, without engine-specific metric requirements.

`retry_of_run_id` optionally links a retry to an earlier run of the same scenario.
Composite foreign keys prevent both retry links and `current_run_id` from
referencing a different scenario. The partial unique index
`run_one_active_per_scenario` includes every nonterminal state, including paused.
It prevents overlapping executions even when competing callers race.

The trigger path must perform the following in one transaction, locking the
scenario first (the same lock order as the worker):

1. Resolve a repeated idempotency key to its existing run; it is not a new execution.
2. Check trigger eligibility and that no active run exists.
3. Insert a new run/correlation ID, optionally linked by `retry_of_run_id`.
4. Set `scenario.current_run_id` to that run and update its scenario status.
5. Insert the trigger outbox entry, then commit.

This module consumes responses; it does not implement trigger creation, request
idempotency storage, or the outbox publisher. Trigger integration must follow
the above contract. Do not clear the current pointer on completion: it identifies
the most recent execution until the next trigger changes it.

A delayed event is looked up by its original correlation ID and can affect only
that run under the lifecycle rules. It never writes another run. If that run is
not the scenario's current run, the scenario is left untouched. Duplicate/stale
events remain acknowledged no-ops. An unknown correlation still fails processing.

Tests cover current-run scenario mappings, delayed old-run failures/results,
duplicate delivery, identity mismatches, current-run selection independent of
timestamps, scenario-first locking, and propagation of scenario-write failures.
Sequence-based status/result processing and heartbeat observations are implemented. Engine retrieval/reconciliation, alert evaluation, poison-event quarantine, and command API/outbox publication remain separate work.
