# Jules Task Queue - Self-Hosting Dockerfile
# Multi-stage build for optimal production image size

# Build stage
FROM node:18-alpine AS builder

# Pass build-time arguments
ARG SKIP_ENV_VALIDATION=true
ARG NEXT_PUBLIC_GITHUB_APP_ID
ARG NEXT_PUBLIC_GITHUB_APP_NAME
ARG GITHUB_APP_CALLBACK_URL
ENV SKIP_ENV_VALIDATION=${SKIP_ENV_VALIDATION}
ENV NEXT_PUBLIC_GITHUB_APP_ID=${NEXT_PUBLIC_GITHUB_APP_ID}
ENV NEXT_PUBLIC_GITHUB_APP_NAME=${NEXT_PUBLIC_GITHUB_APP_NAME}
ENV GITHUB_APP_CALLBACK_URL=${GITHUB_APP_CALLBACK_URL}
ENV BUILD_STANDALONE=true

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build the application
RUN pnpm build

# Production stage
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /app/.next/build/standalone ./
COPY --from=builder /app/.next/build/static ./.next/static
COPY --from=builder /app/public ./public

# Copy the cron script for self-hosting
COPY --from=builder /app/scripts ./scripts

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV SKIP_ENV_VALIDATION=

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"] 