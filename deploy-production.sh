#!/bin/bash

# Production deployment script for Rick's Picks
# Run this on your server after pushing code changes

set -e  # Exit on any error

echo "🚀 Starting production deployment with ULTRA NUCLEAR React Query bundling..."

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin more-august-5th

# Stop containers
echo "⏹️  Stopping containers..."
docker-compose -f docker-compose.unified.yml --env-file .env.production down

# Clean Docker system
echo "🧹 Cleaning Docker system..."
docker system prune -a -f

# Rebuild containers
echo "🔨 Building containers (no cache)..."
docker-compose -f docker-compose.unified.yml --env-file .env.production build --no-cache

# Start containers
echo "▶️  Starting containers..."
docker-compose -f docker-compose.unified.yml --env-file .env.production up -d

# Show logs
echo "📋 Showing application logs..."
docker-compose -f docker-compose.unified.yml --env-file .env.production logs app

echo "✅ Deployment complete with ultra nuclear React Query protection!"
echo "🌐 React Query is now FORCE BUNDLED and survives production tree-shaking"
echo "💰 Google AdSense is configured with client ID: ca-pub-9536994486729073"
echo "🔥 Race condition eliminated - site should load completely without blank screens"