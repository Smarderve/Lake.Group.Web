# syntax=docker/dockerfile:1
#
# Self-hosted Lake Group CMS (Payload 3 + Next.js standalone)
# Build:  docker compose build
# Run:    docker compose up -d

# Node 22 LTS (engines: "20.x || 22.x" in package.json). Node 20 reached
# EOL 2026-04; 22 is the supported LTS for this image.
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- Install dependencies -------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# --- Build the application ------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Payload needs the DB URI present at build time; the value is only used to
# compile config, not to connect during `next build`.
ARG DATABASE_URI_ARG=postgres://unused:unused@localhost:5432/unused
ENV DATABASE_URI=$DATABASE_URI_ARG
ENV PAYLOAD_SECRET=build_only_secret
RUN npm run build

# --- Runtime image ---------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /app/media \
  && chown -R nextjs:nodejs /app/media

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
