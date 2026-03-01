#!/bin/bash
# PostToolUse hook: Format files with Biome after Edit/Write/MultiEdit

# Capture stdin then extract file path
stdin=$(cat)
file_path=$(echo "$stdin" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')

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
