FROM node:20-alpine AS builder
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/core-service/package.json apps/api/core-service/package.json
RUN pnpm install --frozen-lockfile --filter core-service...
COPY apps/api/core-service apps/api/core-service
RUN pnpm --filter core-service build
RUN pnpm --filter core-service deploy --prod /out

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3002
COPY --from=builder /out ./
EXPOSE 3002
CMD ["node", "dist/main.js"]
