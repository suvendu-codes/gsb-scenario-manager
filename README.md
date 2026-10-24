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

## Backend runtime configuration

Use the same application code in dev, stage, and prod, with a separate deployment
and configuration for each environment. Broker addresses, database connections,
and credentials are supplied at process startup rather than selected through
environment-specific branches in application code.

```text
Environment deployment configuration and secrets
                  |
                  v
Container environment variables
                  |
                  v
Node.js process.env -> validation -> Kafka consumer and PostgreSQL pool
```

### How values reach the application

- **Local Docker:** `compose.local.yml` supplies container environment variables;
  no `.env` edit is needed for the worker demo.
- **Direct local execution:** the backend can load a local `.env` file through
  `src/load-env.ts`. Existing process environment variables take precedence over
  values loaded by that helper. Keep credentials out of committed files.
- **Deployed environments:** deployment tooling supplies environment variables.
  For Kubernetes, ordinary settings can come from configuration and credentials
  from the team's approved secret-management integration. These are deployment
  responsibilities; Kubernetes manifests and secret provisioning are not provided
  by this setup.

The backend reads and validates configuration at startup. Validation errors stop
startup; valid configuration does not itself guarantee network connectivity or
valid credentials. Settings are not automatically reloaded: roll out or restart
the process after changing them.

### Kafka and PostgreSQL settings

| Variable | Purpose |
| --- | --- |
| `STATUS_WORKER_ENABLED` | Set to `true` to enable Kafka consumption; disabled by default |
| `KAFKA_BROKERS` | Comma-separated broker addresses for this deployment |
| `KAFKA_GROUP_ID` | Consumer group shared by worker replicas within the environment |
| `KAFKA_STATUS_TOPIC` | Status event topic; set to the shared run-response topic |
| `KAFKA_RESULT_TOPIC` | Result event topic; set to the same shared run-response topic |
| `KAFKA_SSL` | Whether to use TLS for Kafka connections |
| `KAFKA_USERNAME`, `KAFKA_PASSWORD` | Optional SASL/PLAIN credentials; configure both and enable TLS |
| `DATABASE_URL` | PostgreSQL connection string; takes precedence over individual `DB_*` connection fields |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Alternative PostgreSQL connection fields when `DATABASE_URL` is not provided |
| `DB_POOL_MAX` | Maximum connections in this process's PostgreSQL pool |
| `NODE_ENV` | Node execution mode: `development`, `test`, or `production`; does not select an environment's resources |

Status and result events share one topic and are distinguished by `event_type`.
The code currently exposes two topic settings, so configure both to the same
value. A single `KAFKA_RUN_EVENTS_TOPIC` setting has been discussed but is not
implemented.

Example of injected settings for a deployed dev environment (illustrative values,
not a committed secret file):

```dotenv
NODE_ENV=production
STATUS_WORKER_ENABLED=true
KAFKA_BROKERS=kafka-dev.example:9093
KAFKA_GROUP_ID=scenario-manager-status-worker
KAFKA_STATUS_TOPIC=scenario.run.response
KAFKA_RESULT_TOPIC=scenario.run.response
KAFKA_SSL=true
DATABASE_URL=postgresql://<user>:<password>@postgres-dev.example:5432/scenario
```

Supply actual broker/database addresses, credentials, and required authentication
or connection options through the deployment's configuration and secrets.
`NODE_ENV=production` can be used for deployed dev and stage environments as well
as prod; it enables production configuration rules rather than choosing a cluster.

| Deployment | Kafka connection | PostgreSQL connection | Credentials |
| --- | --- | --- | --- |
| Dev | Dev broker cluster | Dev database | Dev secrets |
| Stage | Stage broker cluster | Stage database | Stage secrets |
| Prod | Prod broker cluster | Prod database | Prod secrets |

Separate Kafka clusters can use the same topic/group names. If environments share
a cluster, isolate their topics and permissions; different consumer groups alone
do not isolate event streams. The platform team decides whether PostgreSQL uses
separate instances or isolated databases on shared infrastructure. The app receives
the appropriate connection string in either case. Producers must use the matching
environment's Kafka topic, and database migrations must be applied to each target
database before deploying code that depends on them.

### Configuration ownership in code

Paths are relative to `apps/api/core-service/`:

| File | Responsibility |
| --- | --- |
| `src/load-env.ts` | Loads a local `.env` file when found |
| `src/config.ts` | Reads, validates, and freezes application/PostgreSQL configuration |
| `src/status-worker/infrastructure/kafka.config.ts` | Reads and validates Kafka settings |
| `src/db/db.module.ts` | Creates the PostgreSQL pool and Drizzle database provider |
| `src/status-worker/infrastructure/kafka-event-source.module.ts` | Creates the Kafka consumer from its configuration |

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
The [module test guide](./apps/api/core-service/test/module/README.md) describes
each executable module test in plain language with its expected result and test ID.

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
