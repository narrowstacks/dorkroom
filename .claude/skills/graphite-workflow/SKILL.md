---
name: graphite-workflow
description: Graphite CLI (gt) for stacked PRs. Use when the user mentions Graphite, `gt`, or stacked PRs, or the current branch is already tracked by Graphite. Not for ordinary PRs; those go through `gh`.
---

# Graphite Workflow Skill

Graphite CLI (`gt`) for managing stacked PRs. First check that `gt` is installed
(`command -v gt`); if it isn't, say so and use plain `git`/`gh`. In a stack, use
`gt` for stack-aware operations, because raw `git` commits and rebases leave
descendant branches un-restacked.

The repo's git rules still apply: confirm before committing, and don't run
`gt submit` (which pushes) without an explicit request.

## gt vs git

| Instead of... | Use... | Why |
|---------------|--------|-----|
| `git commit` | `gt create -a -m "message"` | Creates branch + commit + tracks in stack |
| `git commit --amend` | `gt modify -a` | Amends AND auto-restacks descendants |
| `git push` | `gt submit --no-interactive` | Pushes AND creates/updates PRs |
| `git checkout <branch>` | `gt checkout <branch>` | Stack-aware checkout |
| `git pull` / `git rebase` | `gt sync` | Syncs trunk AND rebases entire stack |

## Core Commands Quick Reference

```bash
# Creating PRs in a stack
gt create -a -m "feat: description"   # Stage all, create branch, commit

# Modifying existing PR
gt modify -a                           # Amend commit, auto-restack upstack

# Submitting to GitHub
gt submit --no-interactive             # Current branch + downstack
gt submit --stack --no-interactive     # Entire stack

# Navigation
gt up / gt down                        # Move within stack
gt top / gt bottom                     # Jump to ends of stack
gt checkout                            # Interactive picker

# Syncing
gt sync                                # Fetch trunk, rebase stack, cleanup merged

# Viewing
gt log                                 # Visual stack graph
gt ls                                  # Short list
```

## The Stack Building Workflow

1. **Write code FIRST** - Never create empty branches
2. **Stage changes** - `git add .`
3. **Create branch** - `gt create -a -m "message"`
4. **Repeat** for each slice
5. **Submit stack** - `gt submit --stack --no-interactive`

## When to Use Raw Git

These operations are fine with raw git:
- `git add` - Staging files
- `git status` - Checking status
- `git diff` - Viewing changes
- `git log` (for viewing history, not stack structure)

## Handling Modifications

When changes are needed to an earlier PR in the stack:

```bash
gt checkout <branch-needing-changes>
# Make code changes
git add .
gt modify -a                           # Amend + auto-restack
gt submit --stack --no-interactive     # Push updates
```

## Conflict Resolution

```bash
# If conflict occurs during sync/restack:
# 1. Fix conflicts in editor
git add .
gt continue

# To abort:
gt abort
```
