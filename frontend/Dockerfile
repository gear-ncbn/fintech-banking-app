# syntax=docker/dockerfile:1
# Build stage
FROM node:20-alpine AS builder

# Install dependencies for building
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy application code
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://backend:8000}
ENV SKIP_ENV_VALIDATION=true
ENV NEXT_SKIP_TYPE_VALIDATION=true

# Build the application
# Install SWC dependencies for Alpine Linux
RUN npm install @next/swc-linux-x64-musl || true
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy the Next.js standalone server (output: 'standalone' in next.config.ts).
# It bundles a minimal server + node_modules and the compiled config, so no
# devDependencies (e.g. typescript for next.config.ts) are needed at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]