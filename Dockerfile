# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Copy dependency manifests first for layer caching
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

RUN pnpm install --frozen-lockfile

# Copy all source files
COPY . .

# Build frontend (Vite → dist/public) + backend (esbuild → dist/index.js)
RUN pnpm build

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@10.4.1

# Copy only production dependencies
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
# Vite outputs frontend to dist/public, esbuild outputs server to dist/index.js
COPY --from=builder /app/dist ./dist

# Drizzle schema for migrations (optional, if you run migrations at startup)
COPY --from=builder /app/drizzle ./drizzle

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
