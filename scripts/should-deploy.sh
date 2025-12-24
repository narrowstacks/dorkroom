#!/bin/bash
# Vercel Ignored Build Step
# Exit 0 = skip build, Exit 1 = proceed with build

echo "🔍 Checking if build should be skipped..."
echo "📌 Current commit: $VERCEL_GIT_COMMIT_SHA"
echo "📌 Previous commit: $VERCEL_GIT_PREVIOUS_SHA"

# Check if we have a previous commit to compare against
if [ -z "$VERCEL_GIT_PREVIOUS_SHA" ]; then
  echo "⚠️ No previous commit SHA, falling back to turbo-ignore"
  npx turbo-ignore
  exit $?
fi

# Unshallow the repo to get full history for diff
echo "📥 Fetching git history..."
git fetch --unshallow 2>/dev/null || git fetch origin main 2>/dev/null || true

# Get changed files between previous and current commit
CHANGED_FILES=$(git diff --name-only "$VERCEL_GIT_PREVIOUS_SHA" "$VERCEL_GIT_COMMIT_SHA" 2>&1)
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
