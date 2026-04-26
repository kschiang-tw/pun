#!/bin/bash
# Usage:
#   ./bump.sh patch   → 1.0.0 → 1.0.1  (小修正)
#   ./bump.sh minor   → 1.0.0 → 1.1.0  (新功能)
#   ./bump.sh major   → 1.0.0 → 2.0.0  (大改版)

TYPE=${1:-patch}
CURRENT=$(grep -o "'[0-9]*\.[0-9]*\.[0-9]*'" version.js | tr -d "'")

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case $TYPE in
  patch) PATCH=$((PATCH + 1)) ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  *) echo "Usage: ./bump.sh [patch|minor|major]"; exit 1 ;;
esac

NEW="$MAJOR.$MINOR.$PATCH"
echo "window.APP_VERSION = '$NEW';" > version.js

# Bump SW cache name to bust browser cache on every deploy
SW_CURRENT=$(grep -o "'pun-v[0-9]*'" sw.js | tr -d "'" | sed 's/pun-v//')
SW_NEW=$((SW_CURRENT + 1))
sed -i '' "s/const CACHE = 'pun-v${SW_CURRENT}'/const CACHE = 'pun-v${SW_NEW}'/" sw.js

echo "✓ $CURRENT → $NEW  (SW cache: pun-v${SW_CURRENT} → pun-v${SW_NEW})"
