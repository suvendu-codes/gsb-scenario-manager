# BFF service

Nest BFF on port `3001`. Optional:

- `REDIS_URL` — Socket.IO Redis adapter for WS fan-out
- `KAFKA_BROKERS` — Kafka consumer group `bff-live`
- `CORE_SERVICE_URL` — core HTTP base URL (default `http://localhost:3002`)

```bash
pnpm --filter bff-service dev
```
