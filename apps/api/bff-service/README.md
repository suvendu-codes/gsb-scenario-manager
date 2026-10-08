# BFF service

Nest BFF on port `3001`.

## Env

| Variable | Description |
| --- | --- |
| `REDIS_URL` | Socket.IO Redis adapter for WS fan-out |
| `KAFKA_BROKERS` | GCP Managed Kafka bootstrap address (comma-separated) |
| `KAFKA_SSL` | `true` for GCP (default when broker hostname contains `.managedkafka.`) |
| `KAFKA_SASL_MECHANISM` | `oauthbearer` (default for GCP), `plain`, or `none` |
| `KAFKA_CONSUMER_GROUP_ID` | Consumer group (default `bff-live`) |
| `CORE_SERVICE_URL` | Core HTTP base URL (default `http://localhost:3002`) |

## GCP Managed Kafka setup

1. Authenticate locally:

```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT
```

2. Provision cluster + `order.events` topic:

```bash
chmod +x scripts/setup-gcp-kafka.sh
./scripts/setup-gcp-kafka.sh
```

3. Copy env template and paste the bootstrap address from the script output:

```bash
cp .env.example .env
```

4. Grant `roles/managedkafka.client` to your user or service account.

5. Run from repo root (Kafka brokers are VPC-reachable only):

```bash
pnpm --filter bff-service dev
```
