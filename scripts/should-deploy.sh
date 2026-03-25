#!/bin/bash
# Vercel Ignored Build Step
# Exit 0 = skip build, Exit 1 = proceed with build

echo "🔍 Checking if build should be skipped..."
echo "📌 Current commit: $VERCEL_GIT_COMMIT_SHA"
echo "📌 Previous commit: $VERCEL_GIT_PREVIOUS_SHA"
echo "📌 Repo: $VERCEL_GIT_REPO_OWNER/$VERCEL_GIT_REPO_SLUG"

# Check if we have a previous commit to compare against
if [ -z "$VERCEL_GIT_PREVIOUS_SHA" ]; then
  echo "⚠️ No previous commit SHA, falling back to turbo-ignore"
  bunx turbo-ignore @dorkroom/dorkroom
  exit $?
fi

# Use GitHub API to get changed files (works without git history)
GITHUB_API="https://api.github.com/repos/$VERCEL_GIT_REPO_OWNER/$VERCEL_GIT_REPO_SLUG/compare/$VERCEL_GIT_PREVIOUS_SHA...$VERCEL_GIT_COMMIT_SHA"
echo "📡 Fetching diff from GitHub API..."

CHANGED_FILES=$(curl -s "$GITHUB_API" | grep '"filename":' | sed 's/.*"filename": "\([^"]*\)".*/\1/')

echo "📁 Changed files:"
echo "$CHANGED_FILES"

if [ -z "$CHANGED_FILES" ]; then
  echo "⚠️ Could not determine changed files, falling back to turbo-ignore"
  bunx turbo-ignore @dorkroom/dorkroom
  exit $?
fi

# Skip if changes are ONLY in these paths/files
NON_BUILD_PATTERNS="(^docs/|^scripts/|^\.github/|^\.cursor/|^\.vscode/|^\.claude/|\.md$|^LICENSE$|^NOTICE$|^\.gitignore$|^\.dockerignore$|^\.editorconfig$)"

# Check if ANY changed file is NOT in the skip patterns
if echo "$CHANGED_FILES" | grep -qvE "$NON_BUILD_PATTERNS"; then
  echo "🔨 App-related files changed, marking for cache-free build..."
  touch .turbo-force
  exit 1
fi

# Only docs/config changed - skip build
echo "⏭ Skipping build: only docs/config files changed"
exit 0
