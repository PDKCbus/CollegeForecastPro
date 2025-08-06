#!/bin/bash

# Production build script that forces all dependencies to be included

echo "🚀 Starting unified production build..."

# Set environment to development for dependency resolution
export NODE_ENV=development

echo "📦 Installing ALL dependencies (including dev dependencies)..."
npm install --legacy-peer-deps

echo "🏗️ Building frontend with all dependencies available..."
export NODE_ENV=production
npm run build

echo "✅ Production build completed!"

# Verify build
if [ -d "dist" ]; then
    echo "✅ Build output verified in dist/ directory"
    echo "📄 Build files:"
    ls -la dist/
else
    echo "❌ Build failed - no dist/ directory found"
    exit 1
fi