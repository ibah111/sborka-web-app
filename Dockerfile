# syntax=docker/dockerfile:1

# --- deps ---
FROM oven/bun:1.1 AS deps
WORKDIR /app

# копируем только манифесты, чтобы кешировалось
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --ignore-scripts

# --- build ---
FROM oven/bun:1.1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN bun run build

# --- runtime (Node) ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Next standalone кладёт server.js + минимальный node_modules внутрь .next/standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE ${PORT:-3050}
CMD ["node", "server.js"]
