---
name: pr-review-fix
description: Start a PR review inline comments fixing session. Use when users want to address, fix, or resolve inline review comments on a GitHub PR. Fetches unresolved comments and helps fix each one systematically.
user_invocable: true
---

# PR Review Inline Comments Fixing Session

## Overview

This skill starts an interactive session to systematically address and fix inline review comments on a GitHub Pull Request. It uses the `gh pr-review` extension to fetch unresolved comments and guides you through fixing each one.

## Prerequisites

- `gh` CLI must be installed and authenticated
- `gh pr-review` extension must be installed (`gh extension install agynio/gh-pr-review`)

## Workflow

### Step 1: Identify the PR

First, determine the PR number. Check if the current branch has an associated PR:

```bash
gh pr view --json number,title,url 2>/dev/null
```

If no PR is found, ask the user for the PR number.

### Step 2: Fetch Unresolved Review Comments

Use the `gh pr-review` extension to get all unresolved review threads:

```bash
gh pr-review review view --pr <PR_NUMBER> --unresolved --not_outdated
```

This returns a hierarchical view of all review threads with:
- File path and line numbers
- Original comment body
- Any replies in the thread
- Thread IDs for resolution

### Step 3: Process Each Comment

Work through the threads one at a time. For each, show the user the file,
line(s), comment, and any replies, then read the code and the full thread before
proposing a fix. Some comments need a reply rather than a code change; use the
reply command for those.

Apply a fix only after the user approves it. Then ask whether to resolve the
thread, and if so: `gh pr-review threads resolve --thread-id <THREAD_ID> --pr <PR_NUMBER>`

### Step 4: Summary

After processing all comments:
- Summarize what was fixed
- List any comments that were skipped or need follow-up
- Remind user to commit changes if any were made

## Commands Reference

### View all unresolved comments
```bash
gh pr-review review view --pr <NUMBER> --unresolved --not_outdated
```

### View comments from a specific reviewer
```bash
gh pr-review review view --pr <NUMBER> --reviewer <login> --unresolved
```

### List threads (alternative view)
```bash
gh pr-review threads list --unresolved --pr <NUMBER>
```

### Resolve a thread
```bash
gh pr-review threads resolve --thread-id <THREAD_ID> --pr <NUMBER>
```

### Reply to a thread
```bash
gh pr-review comments reply --thread-id <THREAD_ID> --body "<message>" --pr <NUMBER>
```

## Notes

- `--not_outdated` skips comments on code that has already changed.
- Run `bun run test` after the fixes, before the user commits.
