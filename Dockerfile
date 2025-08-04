# Use Node.js 20 LTS as base image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Copy source code
COPY . .

# Build both frontend and backend
ENV NODE_ENV=production
RUN npx vite build && npx esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist

# Copy frontend build to server public directory
RUN mkdir -p server/public
RUN cp -r client/dist/* server/public/ 2>/dev/null || echo "No frontend dist found"

# Production image
FROM base AS runner
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/public ./server/public
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Set proper permissions
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]