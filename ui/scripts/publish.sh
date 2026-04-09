#!/bin/bash

# Cedros Pay React SDK - Public Repository Publishing Script
#
# This script copies the source code to a public repository while excluding
# sensitive configuration, audit documents, and private development files.

set -e  # Exit on error

# Configuration
PRIVATE_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Public repo root can be set via environment variable (required for CI/automation)
if [ -z "$CEDROS_PUBLIC_REPO_ROOT" ]; then
    # Default for local development
    PUBLIC_REPO_ROOT="/Users/conorholdsworth/Workspace/published/cedros-pay/ui"
else
    PUBLIC_REPO_ROOT="$CEDROS_PUBLIC_REPO_ROOT"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Excluded files and directories (private/sensitive content)
EXCLUDE_PATTERNS=(
    # Audit and internal docs (already deleted, kept for historical reference)
    "readiness-audit.md"
    "readiness-audit-impact.md"
    "AUDIT-RESPONSE.md"
    "AUDIT-RESPONSE-2.md"
    "AUDIT-FIXES-SUMMARY.md"
    "AUDIT_FINDINGS_1.md"
    "AUDIT_RESPONSE_1.md"

    # Development-only documentation
    "AGENTS.md"              # AI agent integration docs (internal dev use)
    "API_REFERENCE.md"       # Backend server API docs (not React library)
    "landing/"               # Landing page assets (not part of library)

    # Development files (.env but NOT .env.example)
    ".env"
    ".env.local"
    ".env.production"
    ".env.staging"
    ".env.development"
    ".env.test"

    # Build artifacts (built from source by users)
    "dist/"
    "coverage/"
    ".nyc_output/"
    "storybook-static/"
    "*.tgz"

    # Development tools
    "stories/"               # Storybook stories (dev-only, not needed in published package)

    # IDE and OS files
    ".DS_Store"
    ".idea/"
    ".vscode/"
    "*.swp"
    "*.swo"
    "*~"

    # Git directory (will be separate in public repo)
    ".git/"

    # Claude Code project-specific instructions (keep private)
    "CLAUDE.md"
    ".claude/"

    # Security audit documents (internal only)
    "sources-sinks.md"

    # Node modules (users will install themselves)
    "node_modules/"
)

# Print banner
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Cedros Pay React SDK - Public Repository Publisher   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verify we're in the correct directory
if [ ! -f "$PRIVATE_REPO_ROOT/package.json" ]; then
    echo -e "${RED}Error: Not in the correct repository root${NC}"
    echo "Expected to find package.json in: $PRIVATE_REPO_ROOT"
    exit 1
fi

# Verify this is the Cedros Pay React package
if ! grep -q '"name": "@cedros/pay-react"' "$PRIVATE_REPO_ROOT/package.json"; then
    echo -e "${RED}Error: This doesn't appear to be the Cedros Pay React repository${NC}"
    exit 1
fi

echo -e "${BLUE}Private repo:${NC} $PRIVATE_REPO_ROOT"
echo -e "${BLUE}Public repo:${NC}  $PUBLIC_REPO_ROOT"
echo ""

# Create public repo directory if it doesn't exist
if [ ! -d "$PUBLIC_REPO_ROOT" ]; then
    echo -e "${YELLOW}Public repository directory does not exist.${NC}"

    # CI mode: create directory automatically without prompting
    if [ "$CI" = "true" ]; then
        mkdir -p "$PUBLIC_REPO_ROOT"
        echo -e "${GREEN}✓${NC} Created public repository directory"
    else
        # Interactive mode: prompt user
        read -p "Create $PUBLIC_REPO_ROOT? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            mkdir -p "$PUBLIC_REPO_ROOT"
            echo -e "${GREEN}✓${NC} Created public repository directory"
        else
            echo -e "${RED}Aborted.${NC}"
            exit 1
        fi
    fi
fi

# Build rsync exclusion arguments
RSYNC_EXCLUDE_ARGS=()
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    RSYNC_EXCLUDE_ARGS+=(--exclude="$pattern")
done

# Show what will be excluded
echo -e "${YELLOW}Excluding the following patterns:${NC}"
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    echo "  - $pattern"
done
echo ""

# Confirm before proceeding (skip in CI mode)
if [ "$CI" != "true" ]; then
    read -p "Proceed with publishing? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborted.${NC}"
        exit 1
    fi
fi

# Perform the sync
echo ""
echo -e "${BLUE}Syncing files...${NC}"
rsync -av --delete \
    "${RSYNC_EXCLUDE_ARGS[@]}" \
    "$PRIVATE_REPO_ROOT/" \
    "$PUBLIC_REPO_ROOT/"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Successfully published to public repository${NC}"
    echo ""

    # Show summary
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. cd $PUBLIC_REPO_ROOT"
    echo "  2. Review changes: git status"
    echo "  3. Install dependencies: npm install"
    echo "  4. Verify package: npm run build && npm test && npm run verify:exports"
    echo "  5. Commit and push: git add . && git commit -m 'Update from private repo' && git push"
    echo "  6. Publish to npm: npm publish --access public"
    echo ""

    # Check if public repo is a git repository
    if [ -d "$PUBLIC_REPO_ROOT/.git" ]; then
        echo -e "${YELLOW}Public repository git status:${NC}"
        cd "$PUBLIC_REPO_ROOT"
        git status --short | head -20

        # Count total changes
        TOTAL_CHANGES=$(git status --short | wc -l | tr -d ' ')
        if [ "$TOTAL_CHANGES" -gt 20 ]; then
            echo "  ... and $((TOTAL_CHANGES - 20)) more files"
        fi
    else
        echo -e "${YELLOW}Note: Public repository is not yet a git repository.${NC}"
        echo "Initialize it with:"
        echo "  cd $PUBLIC_REPO_ROOT"
        echo "  git init"
        echo "  git remote add origin https://github.com/conorholds/cedros-pay.git"
        echo "  git add ."
        echo "  git commit -m 'Initial commit'"
        echo "  git push -u origin main"
    fi
else
    echo -e "${RED}✗ Failed to publish${NC}"
    exit 1
fi
