# Search Strategy Guide

Optimize search efficiency by choosing the right tool for each task.

## Finding Files

**Use `Glob` first** (fastest, integrated):

- Pattern: `**/*.tsx`, `src/**/*.test.ts`, `apps/dorkroom/**/*`
- Best for: File discovery, checking if patterns exist
- Example: `Glob` with pattern `**/*border*.tsx`

**Use `fd` for complex file filters:**

- Filters by size, type, modification time, or regex names
- Example: `fd --type f --size +100k` (files over 100KB)

## Finding Text/Strings

**Use `Grep` for simple text searches** (optimized for my use):

- Pattern: "useQuery", "borderCalculator", "const name"
- Supports regex, type filtering (--type js, --type ts)
- Example: `Grep` with pattern `useQuery` and type `typescript`

**Use `rg` directly for complex patterns or context:**

- Superior context handling with `-A`/`-B`/`-C` flags
- Example: `rg "function.*border" -A 5` (function + 5 lines after)
- Better for: chains with `fzf`, when building complex patterns

## Finding Code Structure

**Use `ast-grep` for syntax-aware searches** (essential for TypeScript):

- Structural patterns: function definitions, imports, exports, component props
- Examples for usage can be found by activating the Claude skill `ast-grep`
- Best for: Understanding code patterns, finding hook implementations, tracking prop usage

## Interactive Result Selection

**Use `fzf` to filter large result sets:**

- Chain any tool with `| fzf` to pick from many results
- Example: `rg "TODO" | fzf` (pick which TODO to handle)
- Example: `fd "*.test.ts" | fzf` (pick which test to review)
- Best for: Multiple matches where you need to decide which one matters

## Parsing JSON/YAML Configuration

**Use `jq` for JSON extraction:**

- Example: `cat package.json | jq '.dependencies | keys'` (all dependency names)
- Example: `jq '.scripts | to_entries[] | .key' < package.json`
- Best for: Configuration analysis, extracting specific fields from configs

**Use `yq` for YAML extraction:**

- Example: `yq '.scripts' .github/workflows/ci.yml` (get scripts section)
- Example: `yq -r '.jobs | keys[]' < workflow.yml` (all job names)
- Best for: GitHub Actions config, deployment configs

## When to Use the Task Tool Instead

**Don't manually chain tools for complex analysis.** Use `Task` agent with `subagent_type=Explore`:

- Question: "How does authentication flow through this codebase?"
- Question: "What components use the border calculator hook?"
- Question: "Where are all form validations defined?"
- This handles multi-file analysis, cross-referencing, and pattern synthesis better than manual command chains

## Decision Tree

```text
Is it finding FILES?
  → Glob (simple patterns)
  → fd (complex filters)

Is it finding TEXT in files?
  → Grep (quick, simple text)
  → rg (when you need context/complex patterns)
  → rg | fzf (when there are many results)

Is it finding CODE STRUCTURE?
  → ast-grep (TypeScript patterns)
  → rg with regex (plain text structure)

Is it PICKING from many results?
  → Pipe to fzf (interactive selection)

Is it parsing JSON/YAML config?
  → jq (JSON files)
  → yq (YAML files)

Is it complex multi-file analysis?
  → Task agent with Explore (better than manual chains)
```
