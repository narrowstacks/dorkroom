---
description: Create a conventional commit following the Conventional Commits specification
allowed-tools: Bash(git*)
---

# Conventional Commit

Create a git commit that follows the Conventional Commits specification.

First, check if there are staged changes using:
!git diff --staged --stat

If no changes are staged, ask user if they want to stage all of their changes, and if they do, run:
!git add .

If user denies, **end command.**
If user approves, run diff command again.

Then analyze the staged changes and draft an appropriate conventional commit message:

- Type: feat, fix, chore, docs, style, refactor, test, build, ci, perf, or revert
- Scope: optional component/area affected
- Description: imperative mood summary
- Body: optional detailed explanation
- Footer: optional breaking changes or issue references

Format:

```text
type(scope): description

[optional body]

[optional footer(s)]
```

**IMPORTANT:** Present the drafted commit message to the user in a code block and wait for their approval before creating the commit. Only execute the git commit command after the user confirms they want to proceed.
