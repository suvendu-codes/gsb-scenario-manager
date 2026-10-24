# Local status worker

Local CLI sources live in `apps/api/core-service/tools/local/`, real-infrastructure
tests in `apps/api/core-service/test/module/`, and sample events in
`apps/api/core-service/test/fixtures/`. Production code stays in `src/` with its
existing feature layout. `build:tools` compiles development entry points into
`dist-tools/`, separately from the production `dist/` build. Docker commands below
build both outputs automatically.

Start Docker Desktop, then run from the repository root:

```sh
pnpm local:demo
```

This builds the backend image, starts PostgreSQL 16 and a single Kafka 4.1.2 broker,
applies the Drizzle migrations, creates a three-partition topic, starts the standalone
status worker, and runs the event generator. Worker and producer logs appear in the
terminal. The first build downloads images and dependencies.

The generator publishes real Kafka messages and checks PostgreSQL after each status
change. It exercises a failed execution, a new execution linked through
`retry_of_run_id`, late events for the old execution, pause/resume, JSON results,
and duplicate result delivery. It checks that late events preserve the current
scenario, the final run is completed, the scenario is finished, and Kafka offsets
are committed. Look for `demo_passed`; failures return a nonzero exit code.

Each invocation creates a new scenario and two runs. The fixture inserts the
scenario and execution rows directly; this does not exercise a trigger API or
outbox. Events use the worker's currently implemented event contract. Future
sequence, heartbeat, and command-contract work is outside this demo.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm local:demo` | Build/start everything and run the verified demo with live worker logs |
| `pnpm local:up` | Build/start the infrastructure and worker |
| `pnpm local:generate` | Publish another demo against the running stack |
| `pnpm local:logs` | Follow worker logs; Ctrl+C stops following |
| `pnpm local:ps` | Inspect container state; completed init containers are expected |
| `pnpm local:db` | Open PostgreSQL's interactive SQL console |
| `pnpm local:down` | Stop/remove containers while preserving database and Kafka volumes |
| `pnpm local:reset` | Stop containers and **delete all local stack database and Kafka data** |

Services remain running after the demo. Use `local:up` after code changes to rebuild
and restart the worker. Database migrations and topic creation can run repeatedly.
The separate Compose project `scenario-worker-local` isolates these resources
from the main application Compose setup.

## Connections

| Service | Host connection |
| --- | --- |
| PostgreSQL | `postgresql://scene:scene@127.0.0.1:55432/scene_local` |
| Kafka | `localhost:19092` |
| Topic | `run.response.local` (status and result events) |
| Consumer group | `scenario-worker-local` |

Ports bind to loopback. The development credentials and plaintext Kafka are for
this local stack. The broker is a single-node development cluster; it cannot test
broker failover or replication. The worker runs without an HTTP server.

Override occupied host ports for every command in a shell:

```sh
export LOCAL_PG_PORT=55433
export LOCAL_KAFKA_PORT=19093
pnpm local:demo
```

Inspect the saved executions in `pnpm local:db`:

```sql
SELECT s.id AS scenario_id, s.status AS scenario_status, s.current_run_id,
       r.id AS run_id, r.status, r.correlation_id, r.retry_of_run_id, r.results
FROM scenario s JOIN run r ON r.scenario_id = s.id
WHERE s.project_id = 'local-demo'
ORDER BY s.created_at DESC, r.created_at;
```

For startup failures, inspect all services:

```sh
docker compose -f compose.local.yml logs --tail 100 init kafka postgres worker
```

The generator allows a configurable delay between events (default 500 ms):

```sh
docker compose -f compose.local.yml run --rm --no-deps \
  -e DEMO_EVENT_DELAY_MS=1500 generator
```

Backend checks run on the host after installing workspace dependencies:

```sh
pnpm --filter core-service typecheck
pnpm --filter core-service lint
pnpm --filter core-service test
```

## Automated module tests and CI

```sh
pnpm test:module
```

This command creates a fresh, uniquely named Compose project with its own image,
Kafka broker, PostgreSQL database, and volumes. It publishes no host ports, so it
can run alongside `local:up`. Docker Compose with support for `!reset` overlays is
required (use Compose 2.24.4 or newer). The overlay follows the
[Compose merge rules](https://docs.docker.com/reference/compose-file/merge/).

The suite runs 69 cases covering the currently implemented contract:

- Lifecycle statuses, pause/resume, JSON verdicts/results, terminal preservation,
  timestamp ordering, duplicates, historical-run isolation, and simulator events.
- Separate-topic delivery, invalid inputs, identity mismatches, unknown-run replay,
  offset-commit failures, transaction rollback/recovery, and consumer restart.
- PostgreSQL active-run uniqueness, valid retry links, cross-scenario references,
  self-retry rejection, and unique correlation IDs.

See the [plain-language module test guide](./apps/api/core-service/test/module/README.md)
for every test's steps and expected result, including the limits of fault injection
and the production scenarios not covered by this suite.

Tests poll for observable database state and committed offsets with bounded
timeouts. Constraint fixtures are rolled back. A failure produces a nonzero exit
code. The runner captures TAP output and infrastructure/build logs under
`test-results/module/<unique-id>/`, then removes its containers, network, and
volumes in a `finally` block on success or failure. Its uniquely tagged build
image remains available in Docker's cache. The persistent local demo is unaffected.
Abrupt machine shutdown or a forced process kill can prevent cleanup; `project.txt`
in the report directory records the Compose project for manual cleanup.

The `status-worker module tests (PostgreSQL + Kafka)` GitHub Actions job invokes the
same script on an Ubuntu runner and uploads the reports even when tests fail.
Node is the only host runtime dependency; backend dependencies install inside the
Docker build. Fast unit tests remain in the separate backend checks job.

This suite covers the worker boundary and PostgreSQL constraints. It seeds trigger
fixtures directly and uses a single broker; trigger/outbox integration, producer
contract alignment, and multi-broker failover require separate tests.
