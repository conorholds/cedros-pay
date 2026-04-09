#!/bin/bash
set -e

echo "📚 Cedros Pay Storybook Deployment"
echo "==================================="
echo ""

# Check if in correct directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from ui/ directory"
  exit 1
fi

# Check if storybook is installed
if ! grep -q "storybook" package.json; then
  echo "❌ Error: Storybook not found in package.json"
  exit 1
fi

echo "🔨 Building Storybook..."
npm run build-storybook

if [ ! -d "storybook-static" ]; then
  echo "❌ Error: Build failed - storybook-static directory not found"
  exit 1
fi

echo "✅ Build successful!"
echo ""
echo "📊 Build stats:"
du -sh storybook-static
echo ""

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
  echo "⚠️  Vercel CLI not found. Install with: npm i -g vercel"
  echo ""
  echo "📦 Static build ready in: storybook-static/"
  echo ""
  echo "You can deploy manually by:"
  echo "  1. Install Vercel CLI: npm i -g vercel"
  echo "  2. Run: vercel --prod"
  echo "  3. Configure domain: docs.cedrospay.com"
  exit 0
fi

echo "🚀 Ready to deploy to Vercel"
echo ""
echo "Configuration:"
echo "  - Build Command: npm run build-storybook"
echo "  - Output Directory: storybook-static"
echo "  - Domain: docs.cedrospay.com"
echo ""
read -p "Deploy now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "📤 Deploying to Vercel..."
  vercel --prod --yes

  echo ""
  echo "✅ Deployment complete!"
  echo "🌐 Visit: https://docs.cedrospay.com"
else
  echo "⏸️  Deployment cancelled"
  echo "📦 Static build ready in: storybook-static/"
  echo ""
  echo "To deploy later, run: vercel --prod"
fi
