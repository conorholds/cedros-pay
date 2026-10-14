#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/artifacts}"

ensure_docker() {
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    return
  fi

  if [[ "$(uname -s)" == "Darwin" ]] && open -Ra Docker >/dev/null 2>&1; then
    echo "starting Docker Desktop for the canonical release Wasm build"
    open -gja Docker
    for _ in {1..120}; do
      if docker info >/dev/null 2>&1; then
        return
      fi
      sleep 1
    done
  fi

  echo "extension packaging requires a running Docker daemon" >&2
  exit 1
}

ensure_docker
SOURCE_COMMIT="$(git -C "$ROOT_DIR" rev-parse HEAD)"
TRACKED_STATUS="$(git -C "$ROOT_DIR" status --porcelain --untracked-files=no)"

if [[ -n "$TRACKED_STATUS" ]]; then
  echo "extension packaging requires a clean tracked worktree" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd)"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/cedros-extension-package.XXXXXX")"
TEMP_DIR="$(cd "$TEMP_DIR" && pwd -P)"
WORKTREE_DIR="$TEMP_DIR/worktree"

cleanup() {
  git -C "$ROOT_DIR" worktree remove --force "$WORKTREE_DIR" >/dev/null 2>&1 || true
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

git -C "$ROOT_DIR" worktree add --quiet --detach "$WORKTREE_DIR" "$SOURCE_COMMIT"
node "$ROOT_DIR/scripts/refresh-release-package-metadata.mjs" inputs "$WORKTREE_DIR" "$SOURCE_COMMIT"

node "$WORKTREE_DIR/scripts/verify-wit.mjs"
node "$WORKTREE_DIR/scripts/validate-extension.mjs" --source-only
node "$WORKTREE_DIR/scripts/build-release-wasm.mjs"
(
  cd "$WORKTREE_DIR/ui"
  test -d node_modules || npm ci
  CEDROS_BUNDLE_EXTENSION_RUNTIME=1 npm run build
  npm run verify:browser-admin
)
(
  cd "$WORKTREE_DIR/ui/react-native"
  test -d node_modules || npm ci
  npm run build
  npm run verify:exports
)

PACKAGE_LOG="$TEMP_DIR/package.log"
CEDROS_STRICT_RUNTIME_IMPORTS=1 node "$WORKTREE_DIR/scripts/package-extension.mjs" \
  "$WORKTREE_DIR/artifacts" | tee "$PACKAGE_LOG"

ARCHIVE_NAME="$(node -p "const p=require('$WORKTREE_DIR/cedros-extension.manifest.json'); p.extensionId+'-'+p.version+'.cedros-extension.zip'")"
ARCHIVE_PATH="$WORKTREE_DIR/artifacts/$ARCHIVE_NAME"
node "$ROOT_DIR/scripts/refresh-release-package-metadata.mjs" archive \
  "$WORKTREE_DIR" "$ARCHIVE_PATH" "$PACKAGE_LOG"
node "$WORKTREE_DIR/scripts/validate-extension.mjs"

cp -f "$ARCHIVE_PATH" "$OUTPUT_DIR/$ARCHIVE_NAME"
cp -f "${ARCHIVE_PATH%.cedros-extension.zip}.release-handoff.json" "$OUTPUT_DIR/"
echo "archivePath $OUTPUT_DIR/$ARCHIVE_NAME"
