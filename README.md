# Scenario Manager

Workspace for the Scenario Manager frontend, backend API, and status worker.

## Repository layout

```text
apps/
  web/                         Next.js frontend
  api/core-service/
    src/                       Production backend code
      scenarios/               Scenario CRUD and domain rules
      runs/                    Execution domain models
      status-worker/           Event processing and transport/storage adapters
      pps/                     PPS feature
      db/                      PostgreSQL connection and Drizzle schema
      common/                  Backend utilities and HTTP infrastructure
      main.ts                  HTTP API entry point
      app.module.ts            Wires backend modules and adapters
    tools/local/               Infrastructure initialization and event/mock CLIs
    test/module/               Tests requiring real PostgreSQL and Kafka
    test/fixtures/             Sample events
    drizzle/                   Versioned migrations and metadata
    db/schema.sql              SQL schema reference
packages/
  shared/                      Shared backend utilities
  shared-types/                Shared type definitions
scripts/                       Local demo and module-test orchestration
compose.local.yml              Persistent worker development stack
compose.module.yml             Isolated module-test overlay
docker-compose.yml             Original PostgreSQL/Redis development stack
LOCAL_DEVELOPMENT.md            Local setup, connections, and troubleshooting
```

Backend features retain their existing `domain`, `application`, `infrastructure`,
and, where applicable, `presentation` structure. Unit tests remain beside the
code they test. Development tools and infrastructure-dependent tests live outside
production `src`.

## Backend components

Paths below are relative to `apps/api/core-service/`.

| Location | Content |
| --- | --- |
| `src/scenarios/` | Scenario CRUD, business rules, repository adapters, and HTTP controllers |
| `src/runs/domain/` | Run models, statuses, and execution state |
| `src/status-worker/` | Kafka status/result event processing and run persistence |
| `src/pps/` | PPS domain, queries, repository, and HTTP controller |
| `src/db/` | PostgreSQL connection, Drizzle configuration providers, and table definitions |
| `src/common/` | Backend helpers, HTTP error handling, authorization helpers, and DTO utilities |
| `tools/local/` | Infrastructure initialization, real Kafka event generator, and in-memory mock CLI |
| `test/module/` | Module tests using real PostgreSQL and Kafka |
| `test/fixtures/` | Sample event payloads |
| `drizzle/` | Database migrations and migration metadata |
| `db/schema.sql` | SQL schema reference |

### Status worker structure

Paths below are relative to `apps/api/core-service/src/status-worker/`.

| Location | Content |
| --- | --- |
| `domain/` | Event schemas, identity validation, lifecycle transitions, duplicate/stale-event rules, and scenario status mapping |
| `application/` | Event processing and coordination of persistence followed by acknowledgement |
| `application/ports/` | Interfaces for replacing the event source and run storage |
| `infrastructure/` | Kafka consumer, PostgreSQL repository, configuration, and mock adapters |
| `worker-main.ts` | Standalone worker startup without an HTTP server |
| `status-worker.module.ts` | Dependency wiring for the component |
| `*.spec.ts` | Unit tests alongside the implementation |
| `README.md` | Component behavior, sequence diagrams, data models, local commands, and proposed observability |
| `ARCHITECTURE_REVIEW.md` | Architecture review and known limitations |

The normal API entry point is `src/main.ts`; the standalone worker entry point is
`src/status-worker/worker-main.ts`. Both use the same worker component. Local
development and module-test entry points stay outside production `src/`.

### Current health monitoring

The worker emits structured startup, processing, acknowledgement, and failure
logs. It does not yet expose HTTP health or metrics endpoints, consume heartbeat
or progress events, or automatically evaluate health alerts.

The [component observability plan](./apps/api/core-service/src/status-worker/README.md#observability-and-alerting-planned)
separates worker availability, delayed consumption, missing execution heartbeats,
and stalled progress. Kubernetes/platform checks, independent Kafka monitoring,
worker metrics, and alert routing remain subject to review of existing practices
and tooling. Health alerts must preserve run lifecycle status and leave execution
decisions to human intervention.

## Local status worker

With Docker running, execute from the repository root:

```sh
pnpm local:demo
```

This starts real PostgreSQL and Kafka, applies migrations, starts the standalone
worker, and publishes sample events with database verification. Services remain
running afterward.

```sh
pnpm local:logs      # Follow worker logs
pnpm local:generate  # Generate another execution scenario
pnpm local:down      # Stop containers; preserve local data
pnpm test:module     # Test using a separate temporary infrastructure stack
```

See [Local development](./LOCAL_DEVELOPMENT.md) for prerequisites, connections,
cleanup, and CI behavior. See the [status worker component guide](./apps/api/core-service/src/status-worker/README.md)
for lifecycle rules, sequence diagrams, data models, and planned observability.

## Frontend

```sh
pnpm install --frozen-lockfile
pnpm --filter web dev
```

Open http://localhost:3000. Frontend code lives in `apps/web`; the worker demo
starts only the worker and its infrastructure.

## Backend checks and builds

```sh
pnpm --filter core-service typecheck
pnpm --filter core-service lint
pnpm --filter core-service test
pnpm --filter core-service build
pnpm --filter core-service build:tools
```

`build` emits production code to `dist/`. `build:tools` emits local tools, module
tests, and the production modules they import to a separate `dist-tools/` tree.
The local Docker image builds both; production builds do not include tools or
module-test entry points. `worker:mock` builds and runs the in-memory demo without
Kafka or PostgreSQL.
