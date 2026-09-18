#!/usr/bin/env bash
set -e

echo "==> Building Next.js application..."
pnpm build

echo "==> Building Docker image 'gsb-web:latest'..."
docker build -t gsb-web:latest .

echo "==> Deploying to Floci Cloud Run (http://localhost:4588)..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4588/v2/projects/floci-local/locations/us-central1/services/web || true)
if [ "$HTTP_STATUS" = "200" ]; then
  echo "==> Re-deploying service..."
  curl -s -X DELETE "http://localhost:4588/v2/projects/floci-local/locations/us-central1/services/web" > /dev/null || true
  sleep 1
fi

RESPONSE=$(curl -s -X POST "http://localhost:4588/v2/projects/floci-local/locations/us-central1/services?serviceId=web" \
  -H "Content-Type: application/json" \
  -d '{
    "template": {
      "containers": [
        {
          "image": "gsb-web:latest",
          "ports": [{"containerPort": 8080}],
          "env": [
            {"name": "PORT", "value": "8080"},
            {"name": "NODE_ENV", "value": "production"}
          ]
        }
      ]
    }
  }')

URL=$(echo "$RESPONSE" | grep -o '"uri":"[^"]*"' | head -n 1 | cut -d'"' -f4)

echo "==> Deployed successfully to Floci Cloud Run!"
echo "Application URL: $URL"
