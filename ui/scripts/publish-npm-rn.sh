#!/bin/bash

# Publish script for @cedros/pay-react-native
# This script prepares and publishes the React Native package to npm

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Cedros Pay React Native Publisher ===${NC}"
echo ""

# Configuration
SOURCE_DIR="/Users/conorholdsworth/Workspace/cedros/cedros-pay/ui/react-native"
PUBLISH_DIR="/Users/conorholdsworth/Workspace/published/cedros-pay/react-native"
PACKAGE_NAME="@cedros/pay-react-native"

echo -e "${YELLOW}Step 1: Cleaning publish directory...${NC}"
rm -rf "$PUBLISH_DIR"
mkdir -p "$PUBLISH_DIR"

echo -e "${YELLOW}Step 2: Copying source files...${NC}"
# Copy package.json
cp "$SOURCE_DIR/package.json" "$PUBLISH_DIR/"

# Copy tsconfig.json
cp "$SOURCE_DIR/tsconfig.json" "$PUBLISH_DIR/"

# Copy src directory (excluding tests)
mkdir -p "$PUBLISH_DIR/src"
cp -r "$SOURCE_DIR/src/"* "$PUBLISH_DIR/src/" 2>/dev/null || true

# Remove test files from publish
find "$PUBLISH_DIR/src" -name "*.test.ts" -delete
find "$PUBLISH_DIR/src" -name "*.test.tsx" -delete
find "$PUBLISH_DIR/src" -name "__tests__" -type d -exec rm -rf {} + 2>/dev/null || true

echo -e "${YELLOW}Step 3: Modifying package.json for React Native source publishing...${NC}"
# Modify package.json to publish TypeScript source directly for React Native
node -e "
const fs = require('fs');
const path = '$PUBLISH_DIR/package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));

// Update main entry points to point to TypeScript source
pkg.main = './src/index.ts';
pkg.module = './src/index.ts';
pkg.types = './src/index.ts';

// Update files array to only include src
pkg.files = ['src'];

// Update exports to point to src
pkg.exports = {
  '.': {
    types: './src/index.ts',
    import: './src/index.ts',
    require: './src/index.ts'
  },
  './stripe-only': {
    types: './src/stripe-only.ts',
    import: './src/stripe-only.ts',
    require: './src/stripe-only.ts'
  },
  './crypto-only': {
    types: './src/crypto-only.ts',
    import: './src/crypto-only.ts',
    require: './src/crypto-only.ts'
  }
};

// Replace prepublishOnly with a simple echo
if (pkg.scripts && pkg.scripts.prepublishOnly) {
  pkg.scripts.prepublishOnly = 'echo \"Publishing @cedros/pay-react-native...\"';
}

fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
console.log('package.json modified for React Native source publishing');
"

echo -e "${YELLOW}Step 4: Copying configuration files...${NC}"
# Copy .npmignore
cp "/Users/conorholdsworth/Workspace/cedros/cedros-pay/ui/react-native/.npmignore" "$PUBLISH_DIR/" 2>/dev/null || echo "Creating .npmignore..."

# Copy README
cp "/Users/conorholdsworth/Workspace/cedros/cedros-pay/ui/react-native/README.md" "$PUBLISH_DIR/" 2>/dev/null || echo "Creating README..."

echo -e "${YELLOW}Step 5: Validating package...${NC}"
cd "$PUBLISH_DIR"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found${NC}"
    exit 1
fi

# Validate package.json
node -e "JSON.parse(require('fs').readFileSync('package.json'))" || {
    echo -e "${RED}Error: package.json is invalid${NC}"
    exit 1
}

echo -e "${YELLOW}Step 6: Checking npm authentication...${NC}"
npm whoami || {
    echo -e "${RED}Error: Not logged in to npm${NC}"
    echo "Run: npm login"
    exit 1
}

echo -e "${YELLOW}Step 7: Running npm publish (dry-run)...${NC}"
npm publish --dry-run

echo ""
echo -e "${GREEN}=== Package prepared successfully ===${NC}"
echo ""
echo "Package: $PACKAGE_NAME"
echo "Version: $(node -p "require('./package.json').version")"
echo "Location: $PUBLISH_DIR"
echo ""
echo "Files to be published:"
npm publish --dry-run 2>&1 | grep -E "^\s+\d+\s+" || echo "(check with: npm publish --dry-run)"
echo ""
echo -e "${YELLOW}To publish, run:${NC}"
echo "  cd $PUBLISH_DIR && npm publish"
echo ""
echo -e "${YELLOW}To publish with public access (scoped package):${NC}"
echo "  cd $PUBLISH_DIR && npm publish --access public"
