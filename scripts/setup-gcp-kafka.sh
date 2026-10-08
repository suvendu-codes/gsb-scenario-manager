#!/usr/bin/env bash
set -euo pipefail

PROJECT="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}"
LOCATION="${KAFKA_LOCATION:-us-central1}"
CLUSTER="${KAFKA_CLUSTER_ID:-scene-kafka}"
TOPIC="${KAFKA_TOPIC:-order.events}"
SUBNET="${KAFKA_SUBNET:-projects/${PROJECT}/regions/${LOCATION}/subnetworks/default}"

if [[ -z "${PROJECT}" || "${PROJECT}" == "(unset)" ]]; then
  echo "Set GOOGLE_CLOUD_PROJECT or run: gcloud config set project YOUR_PROJECT"
  exit 1
fi

echo "==> Project: ${PROJECT}"
echo "==> Cluster: ${CLUSTER} (${LOCATION})"

echo "==> Enabling managedkafka.googleapis.com"
gcloud services enable managedkafka.googleapis.com --project="${PROJECT}"

if ! gcloud managed-kafka clusters describe "${CLUSTER}" \
  --location="${LOCATION}" \
  --project="${PROJECT}" >/dev/null 2>&1; then
  echo "==> Creating Kafka cluster (async, ~20-30 min)"
  gcloud managed-kafka clusters create "${CLUSTER}" \
    --project="${PROJECT}" \
    --location="${LOCATION}" \
    --cpu=3 \
    --memory=3GiB \
    --subnets="${SUBNET}" \
    --async
  echo "Track progress: gcloud managed-kafka operations list --location=${LOCATION} --project=${PROJECT}"
else
  echo "==> Cluster already exists"
fi

STATE="$(gcloud managed-kafka clusters describe "${CLUSTER}" \
  --location="${LOCATION}" \
  --project="${PROJECT}" \
  --format='value(state)' 2>/dev/null || echo UNKNOWN)"

if [[ "${STATE}" != "ACTIVE" ]]; then
  echo "Cluster state is ${STATE}. Re-run after it becomes ACTIVE."
  exit 0
fi

if ! gcloud managed-kafka topics describe "${TOPIC}" \
  --cluster="${CLUSTER}" \
  --location="${LOCATION}" \
  --project="${PROJECT}" >/dev/null 2>&1; then
  echo "==> Creating topic ${TOPIC}"
  gcloud managed-kafka topics create "${TOPIC}" \
    --cluster="${CLUSTER}" \
    --location="${LOCATION}" \
    --project="${PROJECT}" \
    --partitions=3 \
    --replication-factor=3
else
  echo "==> Topic ${TOPIC} already exists"
fi

BOOTSTRAP="$(gcloud managed-kafka clusters describe "${CLUSTER}" \
  --location="${LOCATION}" \
  --project="${PROJECT}" \
  --format='value(bootstrapAddress)')"

echo
echo "Add these to your local .env (copy from .env.example):"
echo
echo "GOOGLE_CLOUD_PROJECT=${PROJECT}"
echo "KAFKA_CLUSTER_ID=${CLUSTER}"
echo "KAFKA_LOCATION=${LOCATION}"
echo "KAFKA_BROKERS=${BOOTSTRAP}"
echo "KAFKA_SSL=true"
echo "KAFKA_SASL_MECHANISM=oauthbearer"
echo "KAFKA_CONSUMER_GROUP_ID=bff-live"
echo
echo "Local auth: gcloud auth application-default login"
echo "IAM: grant roles/managedkafka.client to your user or service account"
echo "Network: cluster is VPC-only; connect from GCE/GKE/Cloud Run or via VPN/tunnel"
