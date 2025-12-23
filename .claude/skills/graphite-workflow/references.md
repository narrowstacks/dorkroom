# Graphite Workflow References

## Foundational Reading

- **Graphite Documentation**: https://graphite.dev/docs
- **Graphite Cheatsheet**: https://graphite.dev/docs/cheatsheet
- **Why Stacking?**: Small, focused PRs get reviewed faster and merge sooner

## The Stacking Philosophy

Traditional workflow:
```
Feature Branch: 47 files changed, 2,847 insertions
                One massive PR that takes days to review
```

Graphite workflow:
```
PR1: Database schema (5 files, ~100 lines)
PR2: API endpoints (8 files, ~200 lines)
PR3: Business logic (6 files, ~150 lines)
PR4: Frontend (10 files, ~300 lines)
```

## Key Terminology

| Term | Definition |
|------|------------|
| **Stack** | Sequence of PRs, each building on its parent |
| **Trunk** | Base branch (usually `main`) |
| **Downstack** | PRs below current (ancestors) |
| **Upstack** | PRs above current (descendants) |

## MCP Tools Available

| Tool | Purpose |
|------|---------|
| `mcp__graphite__run_gt_cmd` | Execute any gt command |
| `mcp__graphite__learn_gt` | Get Graphite documentation |

### MCP Command Format

```json
{
  "args": ["create", "--all", "--message", "feat: description"],
  "cwd": "/absolute/path/to/project",
  "why": "Creating new PR in stack"
}
```

## Complete Command Reference

### Setup
- `gt auth` - Authenticate with GitHub
- `gt init` - Initialize repo for Graphite

### Core Workflow
- `gt create [name]` - Create stacked branch + commit
- `gt modify` - Modify current branch, restack descendants
- `gt submit` - Push and create/update PRs
- `gt sync` - Sync with trunk, rebase stacks

### Navigation
- `gt checkout` - Interactive branch picker
- `gt up [n]` - Move upstack
- `gt down [n]` - Move downstack
- `gt top` - Jump to stack tip
- `gt bottom` - Jump to stack base

### Stack Management
- `gt restack` - Rebase stack
- `gt reorder` - Reorder branches
- `gt fold` - Merge branch into parent
- `gt split` - Split branch into multiple
- `gt delete` - Delete branch, restack children

### Visualization
- `gt log` - Stack graph
- `gt ls` - Short list
- `gt info` - Current branch details

## Related Plugin Agents

| Agent | Purpose |
|-------|---------|
| `execute-issue-jira-graphite` | Implements Jira Subtasks as stacked PRs |
| `/work-on-feature` | Can orchestrate Graphite stacking |
