# Status worker: how it works (beginner guide)

Read this first, then follow the code in the order of the "Where to read" table.

## The big picture

```
Engine (emulator / simulator)
   | publishes run.status / run.result / run.heartbeat JSON
   v
Kafka topic  (default: run.response)
   | pushed to us over a long-lived connection (no polling, no cron)
   v
KafkaEventSource  ──►  StatusWorker.handleMessage()
                          1. ProcessRunEventUseCase.execute()
                                parse + validate JSON (zod)
                                DrizzleRunEventRepository.apply()   <- ONE database transaction
                                    lock scenario, lock run, load receipts
                                    planRunEvents()  (pure rules)
                                    save receipt, update run, update scenario
                          2. only if 1 succeeded: acknowledge (commit Kafka offset)
                          3. if 1 failed: log + rethrow => message is NOT acknowledged => redelivered
```

* **Who publishes?** Not this service. The engines publish their responses. The *trigger* feature
  (not part of this PR) creates the `run` row and then publishes the request to the engine.
* **Who schedules it?** Nobody. When the process starts, `StatusWorker.onModuleInit()` subscribes to Kafka;
  afterwards Kafka calls our handler whenever a message exists. The process stays alive because the
  Kafka connection stays open.
* **Where does it start?** Two ways, same code: `worker-main.ts` (standalone process, `pnpm local:up`)
  or `app.module.ts` (inside the API service). Both only consume when `STATUS_WORKER_ENABLED=true`.

## Where to read (in this order)

| Step | File | What you learn |
| --- | --- | --- |
| 1 | `worker-main.ts` | Process entry point and how pieces are wired |
| 2 | `status-worker.module.ts` | NestJS dependency injection: which class gets which dependency |
| 3 | `infrastructure/kafka-event-source.ts` | Where events come from; manual offset commit |
| 4 | `application/status-worker.ts` | Receive -> process -> acknowledge / fail |
| 5 | `application/process-run-event.use-case.ts` | Parse, then apply |
| 6 | `domain/run-event.ts` | The event JSON contract (zod schema) |
| 7 | `infrastructure/drizzle-run-event.repository.ts` | The database transaction, step by step |
| 8 | `domain/plan-run-events.ts` | Sequence numbers, duplicates, gaps, replay |
| 9 | `domain/apply-run-event.ts` | Status lifecycle, commands, results, heartbeats |
| 10 | `domain/scenario-run-state.ts` | How a run status maps onto the scenario status |

## Scenarios and what the worker does

Assume a run has applied events up to sequence 5.

| What arrives | What happens | Kafka message |
| --- | --- | --- |
| Next event (6), valid | Run updated (and scenario if its status changes) | acknowledged |
| Exact duplicate of 5 | Nothing changes (`ignored`) | acknowledged |
| 5 again with different content | Rejected: not a safe replay | NOT acknowledged |
| 8 (6 and 7 missing) | Stored as a receipt only (`held`), `recovery_required = true` | acknowledged |
| 6 later, with 7 and 8 already stored | 6, 7, 8 applied together; flag cleared | acknowledged |
| 6 later, but stored 7 is invalid after 6 | 6 commits; 7 stays stored; flag stays set | acknowledged |
| Status after the run is terminal | Rejected (contract violation) | NOT acknowledged |
| `run.result` after completed / failed | Results stored; status unchanged | acknowledged |
| `run.result` while still running | Rejected | NOT acknowledged |
| Heartbeat | Heartbeat time + progress stored; status untouched; stale one ignored | acknowledged |
| Unknown correlation ID | Rejected (`unknown_correlation`) | NOT acknowledged |
| Wrong engine / engine run id | Rejected (identity mismatch) | NOT acknowledged |
| Malformed JSON / schema violation | Rejected | NOT acknowledged |
| Event of an OLD retry run | That run is updated; the scenario is left alone | acknowledged |
| Database down / lock timeout | Transaction rolls back | NOT acknowledged |
| Crash after DB commit, before acknowledge | Redelivered; detected as duplicate | acknowledged on retry |

"NOT acknowledged" means the partition is blocked until someone fixes the cause. There is deliberately
no dead-letter queue yet (see the README, "Delivery and errors").

## Node / TypeScript / NestJS terms used here

* **`async` / `await` / Promise**: database and Kafka calls take time. `await x()` pauses *this function*
  (not the whole process) until `x()` finishes; if it throws, the error surfaces at that line like a normal exception.
* **ES modules (`import ... from './x.js'`)**: imports of local TypeScript files end in `.js` because that is the
  file name after compilation (`tsc` turns `src/*.ts` into `dist/*.js`).
* **NestJS**: a framework that builds your objects for you. `@Injectable()` marks a class it may create;
  `@Inject(TOKEN)` says which dependency to hand to the constructor; `@Module` groups providers. Lifecycle hooks
  such as `onModuleInit` are called by Nest, never by our code.
* **Ports and adapters**: `application/ports/*` are interfaces (what we need); `infrastructure/*` are the real
  implementations (Kafka, PostgreSQL) and `InMemory*`/mock ones for tests. Business rules live in `domain/*` and
  import neither.
* **Drizzle**: type-safe SQL builder. `tx.select().from(run).where(...)` is SQL `SELECT ... FROM run WHERE ...`;
  `.for('update')` adds `FOR UPDATE` (row lock).
* **zod**: runtime validation library. `runEventSchema` rejects any JSON that does not match the contract.
* **Transaction**: a group of SQL statements that commit together or not at all.
* **Tests**: unit tests use **vitest** (`pnpm --filter core-service test`); module tests use Node's built-in
  `node:test` against real Kafka + PostgreSQL in Docker (`pnpm test:module`, cases listed in `test/module/README.md`).
