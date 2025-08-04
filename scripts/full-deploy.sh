#!/bin/bash

echo "🚀 Starting full Rick's Picks production deployment..."

# Exit on any error
set -e

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker-compose --env-file .env.production down 2>/dev/null || true

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Initialize database schema
echo "🔧 Initializing database schema..."
npm run db:push

# Build and start containers
echo "🏗️ Building and starting containers..."
docker-compose --env-file .env.production up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check if containers are running
echo "🔍 Checking container status..."
docker-compose --env-file .env.production ps

# Test the deployment
echo "🧪 Testing deployment..."
echo "Checking health endpoint..."
curl -f https://ricks-picks.football/api/health || echo "Health check failed"

echo "Checking main site..."
curl -f https://ricks-picks.football || echo "Main site check failed"

echo "✅ Deployment complete!"
echo "🌐 Site available at: https://ricks-picks.football"