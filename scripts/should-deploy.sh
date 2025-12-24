#!/bin/bash
# Vercel Ignored Build Step
# Exit 0 = skip build, Exit 1 = proceed with build

# First, check if only docs/config files changed
CHANGED_FILES=$(git diff --name-only HEAD^ HEAD 2>/dev/null || echo "")

if [ -n "$CHANGED_FILES" ]; then
  # Skip if changes are ONLY in these paths
  NON_BUILD_PATTERNS="^(docs/|\.md$|\.github/|CLAUDE\.md$|\.cursor/|\.vscode/)"

  # Check if ANY changed file is NOT in the skip patterns
  if echo "$CHANGED_FILES" | grep -qvE "$NON_BUILD_PATTERNS"; then
    # App-related files changed, use turbo-ignore for smart detection
    npx turbo-ignore
    exit $?
  fi

  # Only docs/config changed - skip build
  echo "⏭ Skipping build: only docs/config files changed"
  exit 0
fi

# Fallback to turbo-ignore
npx turbo-ignore
