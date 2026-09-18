# gsb-scenario-manager

pnpm + Turborepo workspace.

| Path | Package | Role |
| --- | --- | --- |
| `apps/web` | `web` | Next.js UI |
| `api/2-bff-service` | `bff-service` | Nest BFF (port 3001) |
| `api/3-core-service` | `core-service` | Nest domain service (port 3002) |
| `api/1-gateway` | — | nginx gateway image |
| `packages/shared-types` | `shared-types` | Shared TypeScript types |

```bash
pnpm install
pnpm dev          # all apps
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
docker build -f api/2-bff-service/Dockerfile -t bff-service .
docker build -f api/3-core-service/Dockerfile -t core-service .
```
