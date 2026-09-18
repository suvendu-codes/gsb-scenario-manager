# Deploying Applications to Floci-GCP (Cloud Run)

This guide documents the exact step-by-step procedure to containerize and deploy your Next.js application to **Floci-GCP** locally.

---

## 1. Overview & Architecture

[Floci-GCP](https://floci.io) is a local Google Cloud Platform emulator running on port `4588`. 
For serverless applications, Floci emulates **Google Cloud Run** using Docker-backed invocation. When you deploy a service to Floci's Cloud Run API, Floci calls Docker Engine via the Docker socket to spin up and manage sidecar containers, routing incoming traffic through `*.run.localhost.floci.io:4588`.

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                    Docker Host                          │
                  │                                                         │
Browser / Curl ──►│ :4588  [floci-gcp Container]                            │
                  │               │                                         │
                  │               ├─► /var/run/docker.sock (Docker Engine)  │
                  │               │                                         │
                  │               └─► Reverse-proxies to:                   │
                  │                   [gsb-web Cloud Run Container] :8080   │
                  └─────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites

1. **Docker** installed and running on your host machine.
2. **Docker socket** available at `/var/run/docker.sock` (or `~/.docker/run/docker.sock`).
3. **Node.js** (v20+) and **pnpm** (v12+).

---

## 3. Step-by-Step Deployment Guide

### Step 1: Start the `floci-gcp` Emulator Container

> [!IMPORTANT]
> Because Cloud Run launches actual Docker containers, **you must mount `/var/run/docker.sock`** into the `floci-gcp` container. Without this volume, Cloud Run container creation fails with `SocketException: No such file or directory`.

Run the following command in your terminal:

```bash
docker run -d --name floci-gcp \
  -p 4588:4588 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  floci/floci-gcp:latest
```

Verify that Floci is running and healthy:
```bash
curl -s http://localhost:4588/_floci-gcp/health
```
You should see JSON with `"cloudrun":"running"`.

---

### Step 2: Configure Next.js for Containerization

1. In `apps/web/next.config.ts`, ensure `output: "standalone"` is configured:
   ```typescript
   const nextConfig: NextConfig = {
     output: "standalone",
     // ... rest of configuration
   };
   ```

2. Build the production standalone bundle:
   ```bash
   pnpm build
   ```
   This generates the self-contained production bundle at `apps/web/.next/standalone`.

---

### Step 3: Use the `runner.js` Compatibility Bridge

Floci's Java-based runtime client initiates connections with HTTP/2 cleartext upgrade headers (`Upgrade: h2c`). Standard Node.js servers destroy the socket when receiving `h2c`.

To resolve this, `runner.js` in the project root:
- Runs Next.js internally on port `3000`.
- Listens on port `8080` (the standard Cloud Run port).
- Gracefully handles `Upgrade: h2c` by wrapping the socket in an `http.ServerResponse` and streaming with explicit `Content-Length`.
- Prevents chunked framing conflicts with GZIP-compressed responses (`Illegal character in chunk size: 31`).

---

### Step 4: Build the Docker Image

The application uses the multi-stage `Dockerfile` in the root of the project:

```bash
docker build -t gsb-web:latest .
```

---

### Step 5: Deploy the Service to Floci Cloud Run

Deploy the service via Floci's Cloud Run v2 REST API:

```bash
curl -s -X POST "http://localhost:4588/v2/projects/floci-local/locations/us-central1/services?serviceId=web" \
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
  }'
```

Floci will automatically:
1. Detect image `gsb-web:latest`.
2. Spin up container `floci-gcp-cloudrun-web-...`.
3. Register the service URL.

---

### Step 6: Access Your Application

Floci assigns each Cloud Run service a unique URL pattern:

```
http://<service-name>-<hash>.<location>.run.localhost.floci.io:4588
```

For your application:
- **Cloud Run URL**: [http://web-1efb2c36c23f.us-central1.run.localhost.floci.io:4588](http://web-1efb2c36c23f.us-central1.run.localhost.floci.io:4588)
- *(Note: `localhost.floci.io` and its wildcards automatically resolve to `127.0.0.1` via public DNS).*

---

## 4. One-Click Redeployment Script

To automate Steps 2 through 5 whenever you modify code, use the included deployment script:

```bash
./deploy-floci.sh
```

This script:
1. Builds the Next.js standalone application (`pnpm build`).
2. Builds the Docker container (`docker build -t gsb-web:latest .`).
3. Replaces the service on Floci Cloud Run.
4. Outputs the active service URL.

---

## 5. Troubleshooting & Gotchas

| Issue | Cause | Resolution |
|---|---|---|
| `SocketException: No such file or directory` | `floci-gcp` container missing Docker socket mount. | Start `floci-gcp` with `-v /var/run/docker.sock:/var/run/docker.sock`. |
| `Illegal character in chunk size: 31` | Java HTTP client receiving de-chunked GZIP bytes with `transfer-encoding: chunked` header. | Handled automatically by `runner.js` which recalculates `Content-Length`. |
| `Cloud Run service has no ready runtime` | Container not listening on port 8080 or crashed on startup. | Ensure container exposes and listens on port 8080 (`PORT=8080`). |
| Port already in use (4588) | Previous emulator container still running. | Stop existing container with `docker rm -f floci-gcp`. |

---

## 6. Sharing Access with Other Users / Devices

Because `localhost.floci.io` resolves to `127.0.0.1`, colleagues on other devices cannot simply open `localhost` URLs without routing to your machine. Choose one of the following methods:

### Method A: Zero-Config Wildcard DNS via `nip.io` (Recommended for Local WiFi/LAN)

`nip.io` is a free wildcard DNS service where any hostname containing an IP address resolves directly to that IP (e.g. `*.192.168.15.51.nip.io` → `192.168.15.51`).

1. Find your Mac's LAN IP address:
   ```bash
   ipconfig getifaddr en0
   # Example output: 192.168.15.51
   ```

2. Start `floci-gcp` with `FLOCI_GCP_HOSTNAME` set to your `nip.io` domain:
   ```bash
   HOST_IP=$(ipconfig getifaddr en0)

   docker rm -f floci-gcp
   docker run -d --name floci-gcp \
     -p 4588:4588 \
     -v /var/run/docker.sock:/var/run/docker.sock \
     -e FLOCI_GCP_HOSTNAME="${HOST_IP}.nip.io" \
     floci/floci-gcp:latest
   ```

3. Re-deploy the application:
   ```bash
   ./deploy-floci.sh
   ```

4. Share the generated URL with your colleagues:
   ```
   http://web-1efb2c36c23f.us-central1.run.<YOUR-IP>.nip.io:4588
   ```
   Anyone on the same WiFi or office network can open this link directly from their browser or mobile device without editing any configuration.

---

### Method B: Direct Container Port Access (Immediate)

Floci publishes the Cloud Run container port to your host (visible in `docker ps`).

1. Check the mapped port:
   ```bash
   docker ps | grep gsb-web
   # Look for 0.0.0.0:<PORT>->8080/tcp (e.g. 45285)
   ```

2. Anyone on the same network can access your app directly at:
   ```
   http://<YOUR-LAN-IP>:<PORT>
   # Example: http://192.168.15.51:45285
   ```

---

### Method C: Colleague's `/etc/hosts` Mapping

If you want colleagues to use the exact `localhost.floci.io` URL:

1. Have your colleague add this line to their `/etc/hosts` file (or `C:\Windows\System32\drivers\etc\hosts` on Windows):
   ```
   <YOUR-LAN-IP> web-1efb2c36c23f.us-central1.run.localhost.floci.io
   ```
2. They can then navigate to:
   ```
   http://web-1efb2c36c23f.us-central1.run.localhost.floci.io:4588
   ```

---

### Method D: Remote Access via Public Tunnel (Different Networks)

If your colleagues are remote (not on your local WiFi):

Run a free tunnel tool like `localtunnel` or `cloudflared`:

```bash
npx localtunnel --port 4588
```
This produces an immediate public HTTPS URL (e.g. `https://my-app.loca.lt`) that anyone on the internet can access.

