#!/bin/bash

# Clean development server script
# Prevents CSS 404 floods and development cache issues

echo "🧹 Cleaning development environment..."

# Kill any running Next.js processes
pkill -f "next dev" 2>/dev/null || true

# Clean Next.js cache
echo "  ├── Removing .next cache..."
rm -rf .next

# Clean node modules cache  
echo "  ├── Removing node modules cache..."
rm -rf node_modules/.cache

# Clean npm cache (optional but helps)
echo "  ├── Clearing npm cache..."
npm cache clean --force 2>/dev/null || true

echo "✅ Environment cleaned!"
echo ""
echo "🚀 Starting clean development server..."

# Start development server
npm run dev 