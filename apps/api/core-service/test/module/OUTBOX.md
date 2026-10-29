# Outbox module tests

```bash
# in-process suite only (no Docker needed)
pnpm --filter core-service test:outbox-module

# + PostgreSQL and Kafka suite
docker compose up -d postgres kafka
MODULE_TEST_DATABASE_URL=postgresql://scene:scene@localhost:5432/scene \
MODULE_TEST_KAFKA_BROKERS=localhost:9092 \
pnpm --filter core-service test:outbox-module
```

The PostgreSQL + Kafka suite creates a throwaway database per run, initialised by `db/schema.sql`, creates uniquely named topics, and drops the
database afterwards. It is skipped when the two variables are unset.

## In-process (`outbox-flow.module.spec.ts`)

Real controller, trigger use case, event builder, relay and worker loop wired by Nest over HTTP;
in-memory store/repository with the same semantics and a fake broker.

| Test | Scenario | Expected |
| --- | --- | --- |
| MT-01 | Trigger a draft scenario | 202 `trigger_requested`; the worker delivers a schema-valid `run.trigger` keyed by correlation_id to the engine topic; row `published`; run still pending `run` |
| MT-02 | Invalid body | 400; nothing queued |
| MT-03 | Malformed JSON, non-UUID id | 400; nothing queued |
| MT-04 | Unknown scenario | 404 `ScenarioNotFoundError` |
| MT-05 | Second trigger while active | 409; still one Kafka record |
| MT-06 | Idempotency-Key replay / changed body / invalid key | same run with `replayed: true` / 409 / 400; one record |
| MT-07 | Data URI differs from stored scenario file | 400; nothing queued |
| MT-08 | Broker outage, then recovery | Row stays `pending` with `last_error`; delivered once after recovery |
| MT-09 | Non-retriable broker error | Row `dead` after one attempt, no further attempts; run unchanged |
| MT-10 | Emulator and simulator triggers | Routed to their own topics, keyed by their correlation ids |
| MT-11 | Re-run after a terminal execution | New correlation; both records delivered in order |
| MT-12 | 12 concurrent triggers | 12 distinct records, all rows published |
| MT-13 | Application shutdown | Worker stops and producer disconnects |

## PostgreSQL + Kafka (`outbox-postgres-kafka.module.spec.ts`)

| Test | Scenario | Expected |
| --- | --- | --- |
| PK-01 | Initialise with `db/schema.sql` | `run_outbox` columns, run trigger columns and constraints exist |
| PK-02 | Re-run `db/schema.sql`; run it on a baseline missing `run_outbox` | Validated no-op keeps data; partial baseline is refused |
| PK-03 | HTTP trigger end to end | Run row, scenario `running` with `current_run_id`, record consumed from Kafka with matching payload and `event_id`; row `published` |
| PK-04 | Trigger rejected inside the transaction | No run, no outbox row, scenario stays `draft` |
| PK-05 | 6 concurrent triggers | Row lock admits one (202), five 409; one outbox row |
| PK-06 | 6 concurrent retries, one Idempotency-Key | One execution, five replays |
| PK-07 | Direct inserts | `run_one_active_per_scenario`, `(correlation_id, sequence)` unique and `published_consistent` check enforced |
| PK-08 | Two stores claim concurrently | Disjoint rows (SKIP LOCKED), nothing left |
| PK-09 | Sequence 1 and 2 of one execution | 2 is not claimable until 1 is published |
| PK-10 | Lease expiry | Another worker reclaims (attempts 2); old holder's write is refused |
| PK-11 | retry / dead / release | Backoff, error text, attempt accounting as designed |
| PK-12 | Topic missing, then created | Retriable failure kept `pending`; delivered after the topic exists |
| PK-13 | 25 triggers drained by two relays | Every record delivered exactly once to Kafka |

Unit tests (`pnpm --filter core-service test`) cover request validation, the event builder, the use
case (idempotency, concurrency, rollback), retry policy, the relay, the in-memory store, the Kafka
adapter's error classification, the worker loop and configuration.
