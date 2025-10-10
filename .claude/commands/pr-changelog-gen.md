---
description: Generate a changelog for a pull request based on commits, diffs, and comments
allowed-tools: Bash(gh*)
---

# PR Changelog Generator

Generate a comprehensive changelog for a pull request by analyzing commits, diffs, and comments.

## Step 1: Get PR Number

First, check if a PR number was provided as an argument. If not, detect the current branch and find its associated PR:

!gh pr list --head $(git branch --show-current) --json number --jq '.[0].number'

If no PR is found, ask the user to provide a PR number or URL.

## Step 2: Fetch PR Information

Once you have the PR number, gather all necessary data in parallel:

!gh pr view {PR_NUMBER} --json title,body,number,headRefName,baseRefName,state,author,createdAt,updatedAt,mergedAt

!gh pr diff {PR_NUMBER}

!git log --pretty=format:"%h|%an|%ad|%s" --date=short $(gh pr view {PR_NUMBER} --json baseRefName --jq '.baseRefName')..$(gh pr view {PR_NUMBER} --json headRefName --jq '.headRefName')

!gh pr view {PR_NUMBER} --comments --json comments --jq '.comments[] | "[\(.author.login)] \(.createdAt): \(.body)"'

## Step 3: Analyze Changes

Analyze the gathered data to categorize changes:

1. **Parse commits**: Group by conventional commit type (feat, fix, chore, etc.) if using conventional commits, or categorize by file/area changed
2. **Review diff**: Identify key files and components modified
3. **Extract insights from comments**: Note any important discussions, decisions, or context

## Step 4: Generate Changelog

Create a structured changelog in markdown format with these sections:

### Format

```markdown
# Changelog for PR #{number}: {title}

**Author**: {author}
**Branch**: {headRefName} � {baseRefName}
**Status**: {state}
**Created**: {createdAt}
**Updated/Merged**: {updatedAt or mergedAt}

## Summary

{Brief overview of the PR's purpose based on body and commits}

## Changes

### Features

- {List new features from commits/diff}

### Fixes

- {List bug fixes}

### Improvements

- {List refactoring, performance improvements, etc.}

### Documentation

- {List documentation changes}

### Other Changes

- {List other modifications}

## Modified Files

- `{file path}` - {brief description of changes}
- ...

## Notable Commits

- `{hash}` - {commit message} ({author}, {date})
- ...

## Discussion Highlights

{Summarize key points from PR comments, if any}

## Breaking Changes

{List any breaking changes identified in commits or comments}

## Migration Notes

{If applicable, provide migration guidance for breaking changes}
```

## Step 5: Present Changelog

Present the generated changelog to the user in a code block and ask if they want to:

1. Copy it to clipboard
2. Save it to a file
3. Post it as a comment on the PR
4. Make any modifications

Wait for user confirmation before taking any action.

## Notes

- Skip empty sections to keep the changelog concise
- Prioritize clarity and usefulness over completeness
- Include links to commits/files where helpful
- Use conventional commit types if detected, otherwise categorize logically
- Highlight breaking changes prominently
