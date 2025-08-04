#!/bin/bash

# Quick deployment script for frequent updates
echo "🔄 Quick deployment starting..."

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin main

# Restart containers with fresh build
echo "🐳 Restarting containers..."
docker-compose --env-file .env.production down
docker-compose --env-file .env.production up -d

# Wait for containers to be ready
echo "⏳ Waiting for containers to start..."
sleep 15

# Deploy frontend
echo "🚀 Deploying frontend..."
./scripts/deploy-frontend.sh

echo "✅ Quick deployment complete!"
echo "🌐 Site should be updated at https://ricks-picks.football"