#!/bin/bash

# Rick's Picks Deployment Script
# Usage: ./scripts/deploy.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
PROJECT_DIR="/home/ubuntu/ricks-picks"
BACKUP_DIR="/home/ubuntu/backups"

echo "🚀 Starting deployment for $ENVIRONMENT environment"

# Create backup
echo "📦 Creating database backup..."
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T db pg_dump -U postgres rickspicks > "$BACKUP_DIR/pre_deploy_$TIMESTAMP.sql"

# Pull latest code
echo "📥 Pulling latest code..."
cd $PROJECT_DIR
git pull origin main

# Build and deploy
echo "🔨 Building and deploying..."
docker-compose --env-file .env.$ENVIRONMENT down
docker-compose --env-file .env.$ENVIRONMENT up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Health check
echo "🏥 Running health check..."
for i in {1..5}; do
    if curl -f http://localhost/api/health; then
        echo "✅ Health check passed!"
        break
    else
        echo "❌ Health check failed, attempt $i/5"
        sleep 10
    fi
done

# Clean up
echo "🧹 Cleaning up..."
docker system prune -f

echo "🎉 Deployment completed successfully!"
echo "📊 Service status:"
docker-compose ps