# gsb-scenario-manager

pnpm + Turborepo workspace.

| Path | Package | Role |
| --- | --- | --- |
| `apps/web` | `web` | Next.js UI |
| `apps/api/bff-service` | `bff-service` | Nest BFF (port 3001) |
| `apps/api/core-service` | `core-service` | Nest domain service (port 3002) |
| `apps/api/gateway` | — | nginx gateway image |
| `packages/shared` | `shared` | Shared resilience & utilities |
| `packages/shared-types` | `shared-types` | Shared TypeScript types |

Run every command from the repository root, not from `apps/`.

```bash
pnpm install
pnpm dev          # all apps (also: pnpm start:dev)
pnpm dev:web
pnpm dev:bff
pnpm dev:core
pnpm build
pnpm lint
pnpm test
pnpm typecheck
```

Service images must be built from the repo root:

```bash
docker build -f apps/api/bff-service/Dockerfile -t bff-service .
docker build -f apps/api/core-service/Dockerfile -t core-service .
```
