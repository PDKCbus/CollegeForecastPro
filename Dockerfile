# Use Node.js 20 LTS as base image
FROM node:20-alpine AS base

# Single stage build
FROM base AS production
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Build frontend only
ENV NODE_ENV=production
RUN npx vite build

# Copy frontend build to server public directory
RUN mkdir -p server/public
RUN if [ -d "client/dist" ]; then cp -r client/dist/* server/public/; else echo "Frontend build failed"; exit 1; fi

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set proper permissions
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["npx", "tsx", "server/index.ts"]