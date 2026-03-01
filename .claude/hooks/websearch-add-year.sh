#!/bin/bash
# PreToolUse hook: Append current year to WebSearch queries that lack a year or temporal keyword

input_data=$(cat)
query=$(echo "$input_data" | jq -r '.tool_input.query // empty')

[ -z "$query" ] && exit 0

current_year=$(date +%Y)
has_year=$(echo "$query" | grep -oE '\b20[0-9]{2}\b' || true)
has_temporal=$(echo "$query" | grep -iE '\b(latest|recent|current|new|now|today)\b' || true)

if [ -z "$has_year" ] && [ -z "$has_temporal" ]; then
  modified_query="$query $current_year"
else
  modified_query="$query"
fi

jq -n --arg q "$modified_query" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    modifiedToolInput: { query: $q }
  }
}'
