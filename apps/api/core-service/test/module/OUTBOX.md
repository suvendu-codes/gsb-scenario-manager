# Outbox module tests

```bash
# in-process suite (MT-*): part of the normal unit run, no Docker needed
pnpm --filter core-service test

# + PostgreSQL and Kafka suite
docker compose up -d postgres kafka
MODULE_TEST_DATABASE_URL=postgresql://scene:scene@localhost:5432/scene \
MODULE_TEST_KAFKA_BROKERS=localhost:9092 \
pnpm --filter core-service test:outbox-module
```

The PostgreSQL + Kafka suite creates a throwaway database per run, initialised by `db/schema.sql`, creates uniquely named topics, and drops the
database afterwards. It is skipped when the two variables are unset, except in CI: the `outbox module tests` job provides
Postgres and Kafka as service containers and sets `MODULE_TEST_REQUIRED=true`, which turns a missing
service into a failure instead of a skip.

## In-process (`outbox-flow.module.spec.ts`)

Real controller, trigger use case, event builder, relay and worker loop wired by Nest over HTTP;
in-memory store/repository with the same semantics and a fake broker.

| Test | Scenario | Expected |
| --- | --- | --- |
| MT-01 | Trigger a ready draft scenario | 202, `Location: /v1/runs/{correlation_id}`, LLD body; worker delivers a schema-valid `run.trigger`; run stays pending `run`; `current_run_id` set |
| MT-02 | No Idempotency-Key | 400 `idempotency_key_required` in the LLD error envelope with `request_id` |
| MT-03 | Bad engine / non-UUID id / malformed JSON | 422 `validation_failed` / 404 `scenario_not_found` / 400 |
| MT-04 | Unknown scenario | 404 `scenario_not_found` |
| MT-05 | Second trigger while active | 409 `scenario_not_triggerable` with `details.active_run` |
| MT-06 | Repeated key / same key, different body | 200 with the same body / 422 `idempotency_key_reuse`; one record |
| MT-07 | No config and no files | 422 `scenario_invalid` listing every issue; nothing created |
| MT-08 | Engine gate closed / upstream down | 503 `engine_unavailable` (Retry-After 300) / `upstream_unavailable` (Retry-After 30) |
| MT-09 | Broker outage, then recovery | Row stays `pending` with `last_error`; delivered once after recovery |
| MT-10 | Non-retriable broker error | Row `dead` after one attempt; run `failed` (`trigger_undeliverable`), scenario `finished`; retry accepted (202) and delivered |
| MT-11 | Emulator and simulator triggers | Routed to their own topics, keyed by correlation id |
| MT-12 | Retry after failed; trigger after completed | New run linked by `retry_of_run_id`; then 409 (`completed`) |
| MT-13 | 12 concurrent triggers | 12 distinct records, all published |
| MT-14 | No `x-user-email` | `triggered_by: system` |
| MT-15 | Application shutdown | Worker stops and producer disconnects |

## PostgreSQL + Kafka (`outbox-postgres-kafka.module.spec.ts`)

| Test | Scenario | Expected |
| --- | --- | --- |
| PK-01 | Initialise with `db/schema.sql` | `run_outbox` columns, run trigger columns and constraints exist |
| PK-02 | Re-run `db/schema.sql`; run it on a baseline missing `run_outbox` | Validated no-op keeps data; partial baseline is refused |
| PK-03 | HTTP trigger end to end | Run row with pinned versions, `triggered_by`, snapshot URI; scenario `running` with `current_run_id`; `Location` header; record consumed from Kafka with matching payload and `event_id`; row `published` |
| PK-04 | Scenario without config or files | 422 `scenario_invalid`; no run, no outbox row, scenario stays `draft` |
| PK-05 | 6 concurrent triggers | Row lock admits one (202), five 409; one outbox row |
| PK-06 | 6 concurrent retries, one Idempotency-Key | One 202, five 200 with the same `correlation_id`; one outbox row |
| PK-07 | Direct inserts | `run_one_active_per_scenario`, `(correlation_id, sequence)` unique and `published_consistent` check enforced |
| PK-08 | Two stores claim concurrently | Disjoint rows (SKIP LOCKED), nothing left |
| PK-09 | Sequence 1 and 2 of one execution | 2 is not claimable until 1 is published |
| PK-10 | Lease expiry | Another worker reclaims (attempts 2); old holder's write is refused |
| PK-11 | retry / dead / release | Backoff, error text, attempt accounting as designed |
| PK-12 | Topic missing, then created | Retriable failure kept `pending`; delivered after the topic exists |
| PK-13 | 25 triggers drained by two relays | Every record delivered exactly once to Kafka |
| PK-14 | Worker publishes, then crashes before marking the row sent | Row stays leased; after expiry another worker re-sends an identical record (same key, partition, payload, `event_id`); row ends `published` — a repeat, never a loss |
| PK-15 | `renewLease` | Extends only the holder's lease; another worker cannot claim or renew it |
| PK-16 | Dead `run.trigger` | Run `failed` with `trigger_undeliverable`, pending command cleared, scenario `finished`; a new run can be inserted |
| PK-17 | Dead row after the engine reported | Run left unchanged |

Unit tests (`pnpm --filter core-service test`) cover request validation, the event builder, the use
case (idempotency, concurrency, rollback), retry policy, the relay, the in-memory store, the Kafka
adapter's error classification, the worker loop and configuration.
