#!/bin/bash
set -e

echo "🏗️ Building Fortress Panel Frontend..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application
echo "🔨 Building application..."
npm run build

echo "✅ Frontend build completed!"