FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

COPY apps/web/.next/standalone ./
COPY apps/web/.next/static ./apps/web/.next/static
RUN mkdir -p ./apps/web/public
COPY apps/web/public ./apps/web/public

EXPOSE 8080

CMD ["node", "apps/web/server.js"]
