#!/bin/bash

# Database initialization script for production deployment
echo "🔧 Initializing database schema..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
sleep 5

# Run database migrations
echo "📊 Running database schema migrations..."
npm run db:push

echo "✅ Database initialization complete!"