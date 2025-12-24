#!/bin/bash
# PostToolUse hook: Format files with Biome after Edit/Write/MultiEdit

# Read JSON from stdin and extract file path
file_path=$(jq -r '.tool_input.file_path // .tool_input.filePath // empty')

# Exit if no file path
[ -z "$file_path" ] && exit 0

# Check if file exists and has a supported extension
if [ -f "$file_path" ]; then
  case "$file_path" in
    *.ts|*.tsx|*.js|*.jsx|*.css|*.html|*.json)
      bunx biome check --write "$file_path" 2>/dev/null || true
      ;;
  esac
fi
