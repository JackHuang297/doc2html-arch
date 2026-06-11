#!/usr/bin/env bash
# =============================================================================
# doc2html-arch Release Script
# =============================================================================
# Usage:
#   ./scripts/release.sh patch # 0.1.0 → 0.1.1
#   ./scripts/release.sh minor  # 0.1.0 → 0.2.0
#   ./scripts/release.sh major  # 0.1.0 → 1.0.0
#   ./scripts/release.sh 0.2.3  # Bump to specific version
# =============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# ─── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'
RESET='\033[0m'; BOLD='\033[1m'

log()  { echo -e "${GREEN}[release]${RESET} $*"; }
warn() { echo -e "${YELLOW}[warn]${RESET} $*"; }
err()  { echo -e "${RED}[error]${RESET} $*" >&2; }

# ─── Version helpers ──────────────────────────────────────────────────────────
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}${BOLD}Current version: $CURRENT_VERSION${RESET}"

bump_version() {
  local curr=$1 type=$2
  local major minor patch
  IFS='.' read -r major minor patch <<< "$curr"

  case "$type" in
    major) major=$((major + 1)); minor=0; patch=0 ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    patch) patch=$((patch + 1)) ;;
    *) echo "$type" ;; # custom version passed directly
  esac

  echo "${major}.${minor}.${patch}"
}

NEW_VERSION="${2:-}"
if [[ -z "$NEW_VERSION" ]]; then
  BUMP_TYPE="${1:-patch}"
  if [[ "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
    NEW_VERSION=$(bump_version "$CURRENT_VERSION" "$BUMP_TYPE")
  else
    err "Invalid bump type. Use: patch | minor | major |<version>"
    exit 1
  fi
fi

# ─── Pre-flight checks ─────────────────────────────────────────────────────────
if [[ -n "$(git status --porcelain)" ]]; then
  err "Working tree has uncommitted changes. Commit or stash them first."
  git status --short
  exit 1
fi

if [[ $(git rev-parse --abbrev-ref HEAD) != "main" ]]; then
  warn "Not on main branch. Release anyway? (Ctrl+C to abort)"
  read -r
fi

# ─── Update files ───────────────────────────────────────────────────────────────
log "Bumping version: $CURRENT_VERSION → $NEW_VERSION"

# package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# CHANGELOG.md — update version header
if [[ -f CHANGELOG.md ]]; then
  TODAY=$(date '+%Y-%m-%d')
  SED_CMD="s/## \[Unreleased\]/## [Unreleased]\\n\\n## [$NEW_VERSION] - $TODAY/"
  sed -i.bak "$SED_CMD" CHANGELOG.md && rm CHANGELOG.md.bak
  log "Updated CHANGELOG.md"
fi

# ─── Git commit & tag ────────────────────────────────────────────────────────────
log "Committing and tagging..."

git add package.json CHANGELOG.md 2>/dev/null || git add package.json
git commit -m "chore(release): $NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

log "Tag created: ${BOLD}v$NEW_VERSION${RESET}"
echo ""
echo -e "  ${GREEN}git push origin main${RESET}"
echo -e "  ${GREEN}git push origin v$NEW_VERSION${RESET}"
echo ""
echo -e "  After push, the GitHub Actions will:"
echo -e "  1. Run tests and build the Docker image"
echo -e "  2. Push the image to Docker Hub as ${BOLD}latest${RESET} + ${BOLD}v$NEW_VERSION${RESET}"
echo -e "  3. Wait for you to create a GitHub Release → triggers npm publish"
echo ""
log "Done!🎉"