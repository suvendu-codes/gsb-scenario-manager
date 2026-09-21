FROM node:20-alpine AS builder
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/bff-service/package.json apps/api/bff-service/package.json
RUN pnpm install --frozen-lockfile --filter bff-service...
COPY packages/shared packages/shared
COPY apps/api/bff-service apps/api/bff-service
RUN pnpm --filter shared build
RUN pnpm --filter bff-service build
RUN pnpm --filter bff-service deploy --prod /out

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=builder /out ./
EXPOSE 3001
CMD ["node", "dist/main.js"]
