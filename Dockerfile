# Use Node.js 20 LTS as base image
FROM node:20-alpine
# Set working directory
WORKDIR /app
# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
# Copy package files
COPY package*.json ./
# Install ALL dependencies including tsx
RUN npm install
# Copy source code
COPY . .
# Build frontend only (vite build)
ENV NODE_ENV=production
RUN npx vite build
# Set proper permissions
RUN chown -R nextjs:nodejs /app
USER nextjs
# Expose port
EXPOSE 5000
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1
# Start server directly with tsx (no bundling needed)
CMD ["npx", "tsx", "server/index.ts"]
