#!/bin/bash

# Cedros Pay - Master Publishing Script
# Publishes @cedros/pay-react (web) and/or @cedros/pay-react-native to npm
#
# Usage:
#   ./scripts/publish-all.sh web       # Publish web package only
#   ./scripts/publish-all.sh rn        # Publish React Native package only
#   ./scripts/publish-all.sh all       # Publish both packages (default)
#   ./scripts/publish-all.sh --help    # Show help

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory (absolute path)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Print banner
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Cedros Pay - NPM Publishing Script                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Show help
show_help() {
    echo "Usage: $0 [TARGET]"
    echo ""
    echo "Targets:"
    echo "  web       Publish @cedros/pay-react (web) only"
    echo "  rn        Publish @cedros/pay-react-native only"
    echo "  all       Publish both packages (default)"
    echo ""
    echo "Options:"
    echo "  --help    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 web              # Publish web package"
    echo "  $0 rn               # Publish React Native package"
    echo "  $0 all              # Publish both packages"
    echo "  $0                  # Same as 'all'"
    echo ""
    echo "After running this script, follow the printed instructions"
    echo "to complete the npm publish step."
}

# Parse arguments
TARGET="${1:-all}"

if [ "$TARGET" = "--help" ] || [ "$TARGET" = "-h" ]; then
    show_help
    exit 0
fi

# Validate target
if [ "$TARGET" != "web" ] && [ "$TARGET" != "rn" ] && [ "$TARGET" != "all" ]; then
    echo -e "${RED}Error: Unknown target '$TARGET'${NC}"
    show_help
    exit 1
fi

# Track success/failure
WEB_SUCCESS=false
RN_SUCCESS=false

# Publish web package
publish_web() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  Publishing @cedros/pay-react (Web)                   ${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
    echo ""

    if [ -f "$SCRIPT_DIR/publish-npm-web.sh" ]; then
        bash "$SCRIPT_DIR/publish-npm-web.sh"
        WEB_SUCCESS=true
    else
        echo -e "${RED}Error: publish-npm-web.sh not found at $SCRIPT_DIR${NC}"
        return 1
    fi
}

# Publish React Native package
publish_rn() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  Publishing @cedros/pay-react-native                   ${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
    echo ""

    if [ -f "$SCRIPT_DIR/publish-npm-rn.sh" ]; then
        bash "$SCRIPT_DIR/publish-npm-rn.sh"
        RN_SUCCESS=true
    else
        echo -e "${RED}Error: publish-npm-rn.sh not found at $SCRIPT_DIR${NC}"
        return 1
    fi
}

# Main execution
case "$TARGET" in
    web)
        publish_web
        ;;
    rn)
        publish_rn
        ;;
    all)
        publish_web
        publish_rn
        ;;
esac

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Publishing Summary                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$TARGET" = "all" ] || [ "$TARGET" = "web" ]; then
    if [ "$WEB_SUCCESS" = true ]; then
        echo -e "  ${GREEN}✓${NC} @cedros/pay-react (web) - prepared successfully"
    else
        echo -e "  ${RED}✗${NC} @cedros/pay-react (web) - failed"
    fi
fi

if [ "$TARGET" = "all" ] || [ "$TARGET" = "rn" ]; then
    if [ "$RN_SUCCESS" = true ]; then
        echo -e "  ${GREEN}✓${NC} @cedros/pay-react-native - prepared successfully"
    else
        echo -e "  ${RED}✗${NC} @cedros/pay-react-native - failed"
    fi
fi

echo ""
echo -e "${YELLOW}Note: Packages are prepared but not yet published to npm.${NC}"
echo -e "${YELLOW}Run the commands shown above to complete the publish.${NC}"
echo ""

exit 0
