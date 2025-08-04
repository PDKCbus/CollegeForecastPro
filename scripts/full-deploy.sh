#!/bin/bash
# Complete deployment script for Rick's Picks production environment

echo "🚀 Starting Rick's Picks production deployment..."

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose --env-file .env.production down

# Build and start containers
echo "Building and starting containers..."
docker-compose --env-file .env.production up -d --build

# Wait for containers to be ready
echo "Waiting for containers to initialize..."
sleep 30

# Check container status
echo "Checking container status..."
docker-compose --env-file .env.production ps

# Deploy frontend
echo "Deploying frontend..."
./scripts/deploy-frontend.sh

# Test platform
echo "Testing platform connectivity..."
curl -I http://localhost/health

echo "✅ Deployment complete!"
echo "Platform accessible at: http://ricks-picks.football"
echo "To add SSL: sudo certbot --nginx -d ricks-picks.football"