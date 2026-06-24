# syntax=docker/dockerfile:1

# Multi-stage build for the SyncSpace Next.js app. Produces a small, non-root
# runtime image from Next's standalone output. Vercel remains primary prod; this
# image is for portability (run anywhere) and the AWS deploy path.

# ── Base ─────────────────────────────────────────────────────────────────────
# Node 24 (current LTS) on Alpine. libc6-compat covers the odd native addon.
# pnpm is provided via corepack and pinned to match the v9 lockfile.
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# ── Dependencies ─────────────────────────────────────────────────────────────
# Cached on the lockfile alone so installs are skipped unless deps change.
# pnpm-workspace.yaml carries config (ignoredBuiltDependencies), so install sees
# the same settings as local.
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ── Builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* are inlined into the bundle at build time, so they must be
# present here (not just at runtime). The anon key is a public client key.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN pnpm build

# ── Runner ───────────────────────────────────────────────────────────────────
# Ships only the traced standalone server + static assets. Runs as the
# unprivileged `node` user baked into the base image.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
