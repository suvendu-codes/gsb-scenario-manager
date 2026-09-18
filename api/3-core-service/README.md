# Core service

Nest domain service on port `3002`. Optional:

- `REDIS_HOST` / `REDIS_PORT` — BullMQ (`start-simulation` queue)
- `BFF_SERVICE_URL` — BFF base URL (default `http://localhost:3001`)

```bash
pnpm --filter core-service dev
```
