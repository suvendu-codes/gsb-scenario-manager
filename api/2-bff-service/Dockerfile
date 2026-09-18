FROM node:20-alpine AS builder
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY api/2-bff-service/package.json api/2-bff-service/package.json
COPY api/3-core-service/package.json api/3-core-service/package.json
RUN pnpm install --frozen-lockfile --filter bff-service...
COPY api/2-bff-service api/2-bff-service
RUN pnpm --filter bff-service build
RUN pnpm --filter bff-service deploy --prod /out

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=builder /out ./
EXPOSE 3001
CMD ["node", "dist/main.js"]
