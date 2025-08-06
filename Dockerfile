# ------------------------------------------------------
# Stage 1: Build Environment (Build Doc and Application)
# ------------------------------------------------------
FROM node:22-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./
COPY .env ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Build documentation and application
RUN npm run docs:build
RUN npm run build:prod


# ----------------------------------------
# Stage 2: Production Runtime
# ----------------------------------------
FROM node:22-alpine AS production

# Install security updates and dumb-init for proper signal handling
RUN apk add --no-cache \
    dumb-init \
    && apk upgrade --no-cache

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001 \
    && mkdir -p /app/logs /app/docs \
    && chown -R nextjs:nodejs /app

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/docs ./docs

# Switch to non-root user
USER nextjs

# Expose port (configurable via environment variable)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT:-3000}/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]
