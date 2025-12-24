#!/bin/bash
# Vercel Ignored Build Step
# Exit 0 = skip build, Exit 1 = proceed with build

echo "🔍 Checking if build should be skipped..."

# Fetch enough history for comparison (Vercel uses shallow clones)
git fetch --depth=2 origin main 2>/dev/null || true

# Get changed files
CHANGED_FILES=$(git diff --name-only HEAD^ HEAD 2>/dev/null)
GIT_EXIT_CODE=$?

echo "📁 Changed files (exit code: $GIT_EXIT_CODE):"
echo "$CHANGED_FILES"

if [ $GIT_EXIT_CODE -ne 0 ] || [ -z "$CHANGED_FILES" ]; then
  echo "⚠️ Could not determine changed files, falling back to turbo-ignore"
  npx turbo-ignore
  exit $?
fi

# Skip if changes are ONLY in these paths
NON_BUILD_PATTERNS="(^docs/|^\.github/|^\.cursor/|^\.vscode/|^\.claude/|\.md$)"

# Check if ANY changed file is NOT in the skip patterns
if echo "$CHANGED_FILES" | grep -qvE "$NON_BUILD_PATTERNS"; then
  echo "🔨 App-related files changed, checking with turbo-ignore..."
  npx turbo-ignore
  exit $?
fi

# Only docs/config changed - skip build
echo "⏭ Skipping build: only docs/config files changed"
exit 0
