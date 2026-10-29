# Trigger API and Kafka outbox

Implements the SM → engine command path from the
[Scenario Manager – Event Schema Proposal](https://greyorange-work.atlassian.net/wiki/spaces/SVRPERFTM/pages/236912869)
(v28, agreed `run.trigger` v1.1 example).

**The API builds the event; the worker only delivers it.** The trigger request, the new run and the
complete wire payload are committed in one PostgreSQL transaction. The worker never reads scenario
data, so a retry re-sends byte-identical content with the same `(correlation_id, sequence)`, and a
scenario edited later cannot change what was queued.

```
POST /api/v1/scenarios/:id/runs            (LLD §5 Trigger a run)
  idempotency → scenario → engine gate → failure brake → status
  → local checks (config + files, every issue) → upstream (map/sizer versions)
  → config snapshot (create-only) → tx: lock scenario, re-check,
         insert run (trigger_requested, pending_command=run, command_sequence=1, pinned versions)
         insert run_outbox (payload, topic, key=correlation_id)
         scenario.status = running, scenario.current_run_id = run.id
  ← 202 (durably queued — NOT engine-accepted) · 200 for a repeated Idempotency-Key

outbox worker (separate process, N replicas)
  loop: claim due rows (FOR UPDATE SKIP LOCKED + lease) → producer.send(acks=all) → mark published
        retriable failure → backoff (available_at) · non-retriable → dead
```

The status worker (engine → SM) is unchanged by publishing: the run stays `trigger_requested` with
`pending_command = run` until the engine reports acceptance and the matching transition.

## Trigger a run

```http
POST /api/v1/scenarios/{scenario_id}/runs
Content-Type: application/json
Idempotency-Key: 4f1c2a7e-0b8e-4d1c-9b62-6a4b5e2c9f10     (required)
x-user-email: puneet.a@greyorange.com                       (set by the gateway; recorded as triggered_by)

{ "engine": "emulator", "priority": "normal" }
```

Response `202` (or `200` with the same body for a repeated key), `Location: /v1/runs/{correlation_id}`:

```json
{ "correlation_id": "cid_…", "scenario_id": "…", "engine": "emulator", "state": "trigger_requested",
  "triggered_by": "puneet.a@greyorange.com", "created_at": "2026-10-29T11:07:30.000Z" }
```

Errors use the LLD envelope `{ "error": { "code", "message", "details", "request_id" } }`:

| Status | Code | When |
| --- | --- | --- |
| 400 | `idempotency_key_required` | Header missing or not printable ASCII ≤200 chars (malformed JSON is also 400) |
| 404 | `scenario_not_found` | No such scenario (or the id is not a UUID) |
| 409 | `scenario_not_triggerable` | A run is active (`details.active_run`), or the last run completed (clone it) |
| 409 | `scenario_blocked` | The last 3 runs failed |
| 422 | `validation_failed` | `engine` / `priority` invalid (`details.errors`) |
| 422 | `idempotency_key_reuse` | The key was used before with a different request |
| 422 | `scenario_invalid` | `details.issues`: `config_incomplete`, `config_invalid`, `data_file_missing`, `map_not_found`, `sizer_not_found` |
| 503 | `engine_unavailable` | `ENGINE_GATE_CLOSED` lists the engine (`Retry-After: 300`) |
| 503 | `upstream_unavailable` / `storage_unavailable` | Upstream check, config blob or snapshot store failed (`Retry-After: 30`) |

Rules as implemented:

- Runnable from `draft`, or after the latest run `failed` / `cancelled`. A run after a failed or
  cancelled one is a **new run with a new `correlation_id`**, linked by `retry_of_run_id` (as the
  status worker and the Event Schema expect).
- Config comes from the scenario (inline body, or the `configUri` blob). The engine receives the
  **effective** config: defaults with overrides merged (objects merge, arrays replace; station-level
  overrides per station id). The same JSON is written create-only to
  `gs://$SCENARIO_CONFIG_BUCKET/$SCENARIO_CONFIG_PREFIX/runs/{scenario_id}/{correlation_id}/config.json`
  (in memory when no bucket is configured) and its URI stored on the run.
- Files: `inbound`, `outbound`, `masterdata` are required, `mockput` optional; the event carries their URIs.
- Upstream is a mock abstraction (every map has a sizer at `v1`); the resolved versions are pinned on
  the run (`map_version`, `sizer_version`) and in the event (`references.map_version_id`, `pins`).
- A rejected trigger writes nothing. Two concurrent triggers can't both pass: the commit locks the
  scenario and re-checks status, latest run and key.

Wire event (built by `buildRunTriggerEvent`, validated by `RunTriggerEventSchema`):

```json
{
  "event_type": "run.trigger", "command_id": "run", "version": "1.1", "engine": "emulator",
  "sequence": 1, "correlation_id": "cid_…", "issued_at": "2026-10-29T11:07:30.000Z",
  "issued_by": "puneet.a@greyorange.com", "priority": "normal",
  "references": { "project_id": "…", "scenario_id": "…", "map_id": "…", "map_version_id": "v1",
                  "pins": [{ "service": "map_creator", "artifact_type": "map", "id": "…", "version": "v1" },
                           { "service": "sizer", "artifact_type": "sizer", "id": "…", "version": "v1" }] },
  "data": { "inbound": { "uri": "gs://…" }, "outbound": { "uri": "gs://…" }, "masterdata": { "uri": "gs://…" } },
  "config": { "wms_order": { … }, "agent": { … }, "station": { "shared": { … }, "station_level": { "default": { … }, "stations": { … } } } }
}
```

Kafka record: topic = engine trigger topic, key = `correlation_id`, value = the JSON above, headers
`event_id` (outbox row id), `event_type`, `correlation_id`, `schema_version`, `content-type`.

## `run_outbox`

| Column | Purpose |
| --- | --- |
| id | Delivery id (also the `event_id` header) |
| scenario_id, run_id | Owning scenario and SM execution (FKs) |
| correlation_id, sequence | Execution identity + SM command sequence; **unique together** (engine dedup key) |
| engine, event_type, command_id | `emulator`/`simulator`, `run.trigger`…, `run`/`pause`/`resume`/`cancel` |
| topic, message_key | Routing fixed at enqueue time; key = correlation_id |
| payload, headers | Exact record value and headers |
| status | `pending` → `published`, or `dead` (needs an operator); text + CHECK, like `run.pending_command` |
| attempts | Claims so far (incremented on claim, given back on release) |
| available_at | Earliest next attempt (backoff) |
| locked_by, locked_until | Worker lease; an expired lease is reclaimable |
| last_error | Bounded one-line error from the last failure |
| created_at, published_at | Queue age; Kafka acknowledgement time |

Also added to `run`: `priority`, `triggered_by`, `map_version`, `sizer_version`, `config_snapshot_uri`,
`idempotency_key` (unique per scenario) and `request_hash`. The trigger writes the existing
`pending_command = 'run'`, `command_sequence = 1`, `status = 'trigger_requested'` and `retry_of_run_id`,
and sets `scenario.current_run_id` so the status worker moves the scenario with this run.

Everything is in the single `db/schema.sql` baseline. Like the rest of the baseline it has no
migration: an existing development database without `run_outbox` is refused as a partial schema,
so recreate it.

## Worker

`pnpm --filter core-service build && pnpm --filter core-service worker:outbox`
(`node dist/outbox/worker-main.js`). Run it as its own deployment; replicas are safe.

- **Claim:** `FOR UPDATE SKIP LOCKED` in a short transaction sets a lease, so Kafka is never called while
  holding a database transaction and concurrent workers get disjoint rows.
- **Order:** a row is not claimable while an earlier `sequence` of the same `correlation_id` is
  unpublished (including `dead`), and records are keyed by `correlation_id`, so an execution's commands
  reach its partition in order.
- **Delivery:** at-least-once. A crash after Kafka acked but before `published` commits re-sends the same
  payload after the lease expires; engines deduplicate on `(correlation_id, sequence)`.
- **Leases:** one claim leases the whole batch, but rows are sent one at a time, so the relay renews
  each row's lease right before its send (`renewLease`, conditional on still holding it) and skips a row
  another worker already reclaimed. A send is bounded by `OUTBOX_SEND_TIMEOUT_MS` (producer timeouts and
  retries are derived to fit, with a last-resort timer), and config requires
  `OUTBOX_LEASE_MS ≥ 2 × OUTBOX_SEND_TIMEOUT_MS`, so a send never outlives its lease.
- **Failures:** retriable (broker down, unknown topic, timeouts — kafkajs' "retries exceeded" wrapper is
  unwrapped to its cause) → `available_at = now + backoff` (exponential, jitter, capped) and the rest of
  the batch is released untouched; non-retriable (e.g. record too large, not authorized) or
  `OUTBOX_MAX_ATTEMPTS` reached → `dead`. A timeout never changes the run: it does not prove rejection.
- **Dead `run.trigger`:** the broker never stored it, so the engine cannot have the run. In the same
  transaction the run (if the engine has reported nothing yet) becomes `failed` with reason
  `trigger_undeliverable`, `pending_command` is cleared, and the scenario becomes `finished` if this is
  still its current run — the user can retry. These runs do not count toward the failure brake.
- **Shutdown:** SIGTERM finishes the in-flight batch, then disconnects the producer.
- **Producer:** `acks=-1`, `maxInFlightRequests=1`, `allowAutoTopicCreation=false` — create topics up front.

Settings (`.env.example`): `KAFKA_BROKERS`, `KAFKA_SSL`, `KAFKA_USERNAME`, `KAFKA_PASSWORD` (shared with
the status worker), `KAFKA_CLIENT_ID`, `KAFKA_SASL_MECHANISM`,
`KAFKA_TOPIC_EMULATOR_COMMANDS`, `KAFKA_TOPIC_SIMULATOR_COMMANDS`, `EVENT_SCHEMA_VERSION`,
`OUTBOX_POLL_INTERVAL_MS` (500), `OUTBOX_BATCH_SIZE` (50), `OUTBOX_SEND_TIMEOUT_MS` (30000),
`OUTBOX_LEASE_MS` (60000, ≥ 2 × send timeout), `OUTBOX_BACKOFF_BASE_MS` (1000), `OUTBOX_BACKOFF_MAX_MS` (60000), `OUTBOX_MAX_ATTEMPTS` (0 = unlimited).

### Operations

```sql
-- backlog and oldest pending event
SELECT status, count(*), min(created_at) FROM run_outbox GROUP BY status;
-- parked events
SELECT id, correlation_id, sequence, attempts, last_error FROM run_outbox WHERE status = 'dead';
-- requeue a parked event after fixing the cause
UPDATE run_outbox SET status = 'pending', attempts = 0, available_at = now(), last_error = NULL WHERE id = '<id>';
-- purge old published rows (keep enough for audit)
DELETE FROM run_outbox WHERE status = 'published' AND published_at < now() - interval '30 days';
```

## Not in this change

- Pause / resume / cancel endpoints. The table, ordering rule and `run.command_sequence` already support
  them: lock the run, check `pending_command IS NULL` and the source state, increment
  `command_sequence`, set `pending_command`, and `insertOutboxMessage` in the same transaction.
- File integrity metadata (`sha256`, `size_bytes`, `rows`) and the `data_file_changed` /
  `data_file_map_mismatch` checks: they need the Complete-upload flow, which is not built yet. The event
  sends file URIs only until then.
- Run duration (`run.execution_duration_minutes`): not stored on the scenario yet, so the event omits `run`.
- Real upstream (Foundry) connection, authentication (`triggered_by` comes from the gateway's
  `x-user-email`), and clearing the failure brake.
- Metrics/alerts on `dead` rows and backlog age.
