#!/bin/bash

# Cedros Pay React SDK - NPM Publishing Script
# Publishes the built dist/ files to npm

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SOURCE_DIR="/Users/conorholdsworth/Workspace/cedros/cedros-pay/ui"
PUBLISH_DIR="/Users/conorholdsworth/Workspace/published/cedros-pay/ui"

echo -e "${BLUE}=== Cedros Pay React SDK - NPM Publisher ===${NC}"
echo ""

# Step 1: Build the source
echo -e "${YELLOW}Step 1: Building source...${NC}"
cd "$SOURCE_DIR"
npm run build

# Step 2: Clean and prepare publish directory
echo -e "${YELLOW}Step 2: Preparing publish directory...${NC}"
rm -rf "$PUBLISH_DIR"
mkdir -p "$PUBLISH_DIR"

# Step 3: Copy dist (built files) - REQUIRED for npm
echo -e "${YELLOW}Step 3: Copying built files (dist/)...${NC}"
cp -r "$SOURCE_DIR/dist" "$PUBLISH_DIR/"

# Step 4: Copy package.json and essential files
echo -e "${YELLOW}Step 4: Copying package files...${NC}"
cp "$SOURCE_DIR/package.json" "$PUBLISH_DIR/"
cp "$SOURCE_DIR/.npmignore" "$PUBLISH_DIR/" 2>/dev/null || true
cp "$SOURCE_DIR/README.md" "$PUBLISH_DIR/" 2>/dev/null || echo "No README.md found"
cp "$SOURCE_DIR/LICENSE" "$PUBLISH_DIR/" 2>/dev/null || echo "No LICENSE found"
cp "$SOURCE_DIR/CHANGELOG.md" "$PUBLISH_DIR/" 2>/dev/null || echo "No CHANGELOG.md found"

# Step 4b: Modify package.json for publishing (remove prepublishOnly script)
echo -e "${YELLOW}Step 4b: Modifying package.json for publishing...${NC}"
cd "$PUBLISH_DIR"
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Remove scripts that require dev dependencies
if (pkg.scripts) {
  delete pkg.scripts.prepublishOnly;
  delete pkg.scripts['prepublish-only'];
  delete pkg.scripts.prepare;
}

// Ensure files array only includes dist
pkg.files = ['dist'];

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✓ Modified package.json for publishing');
"

# Step 5: Verify package
echo -e "${YELLOW}Step 5: Verifying package...${NC}"
cd "$PUBLISH_DIR"

if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found${NC}"
    exit 1
fi

if [ ! -d "dist" ]; then
    echo -e "${RED}Error: dist/ directory not found${NC}"
    exit 1
fi

# Step 6: Show summary
echo ""
echo -e "${GREEN}Package ready in publish directory:${NC}"
echo "  Name: $(node -p "require('./package.json').name")"
echo "  Version: $(node -p "require('./package.json').version")"
echo "  Files: $(find dist -type f | wc -l) files in dist/"
echo "  Size: $(du -sh dist | cut -f1)"
echo "  Path: $PUBLISH_DIR"
echo ""
echo -e "${GREEN}=== Done ===${NC}"
echo ""
echo -e "To publish, commit and push from the publishing repo:${NC}"
echo "  cd $PUBLISH_DIR && npm publish --access public"
