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
```

Backend features retain their existing `domain`, `application`, `infrastructure`,
and, where applicable, `presentation` structure. Unit tests remain beside the
code they test. Development tools and infrastructure-dependent tests live outside
production `src`.

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
