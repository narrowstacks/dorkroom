# PR Respond

**PR Link/Number**: $ARGUMENTS

> **Instructions**: Systematically address PR review feedback, fix identified issues, and update the PR with a summary of changes. Execute each task in order.

---

## Task 1: Fetch & Parse PR Feedback

**Objective**: Retrieve and organize all feedback from the PR.

**Actions**:

1. Use `gh pr view $ARGUMENTS --json comments,reviews,reviewRequests --comments` to fetch PR data
2. Parse and categorize feedback into:
   - **Critical Issues**: Blocking problems, bugs, security concerns
   - **Required Changes**: Code quality, performance, maintainability issues
   - **Suggestions**: Optional improvements, style preferences
   - **Questions**: Clarifications needed, discussion points
   - **Inline Code Comments**: Specific line/file feedback

**Output**: Present organized summary of all feedback with clear categorization.

---

## Task 2: Analyze & Create Action Plan

**Objective**: Determine which items warrant code changes and create a structured plan.

**Actions**:

1. Review each piece of feedback systematically
2. Identify which items should be addressed with code changes vs. just responses
3. Use `TodoWrite` tool to create actionable task list with:
   - Description of the issue/feedback
   - File/location affected
   - Proposed fix approach
   - Priority (critical/high/medium/low)
4. Present action plan to user for confirmation

**Decision Criteria**:

- **Address immediately**: Security issues, bugs, blocking problems, incorrect functionality
- **Address as requested**: Code quality improvements, performance issues, maintainability concerns
- **Consider deferring**: Large refactors better suited for separate PR, out-of-scope enhancements
- **Respond only**: Questions, clarifications, suggestions that don't require code changes

---

## Task 3: Address Feedback Systematically

**Objective**: Fix code issues and implement requested changes using Gemini CLI via Zen MCP for increased token capacity.

**Actions**:
For each item (or logical group of related items) in the action plan:

1. **Use Zen `clink` tool** to delegate to Gemini CLI:

   - Tool: `mcp__zen__clink`
   - CLI: `gemini`
   - Role: `default` (or `codereviewer` for code quality fixes)
   - Files: Include relevant file paths from the feedback/action plan

2. **Construct detailed prompt for Gemini** that includes:

   ```
   CRITICAL: You MUST activate the Serena MCP project 'dorkroom-nx' FIRST before any code work.

   Use Serena MCP tools exclusively for code exploration and editing:
   - get_symbols_overview: Understand file structure
   - find_symbol: Locate specific functions/classes
   - search_for_pattern: Find code patterns
   - replace_symbol_body: Edit functions/classes
   - insert_before_symbol / insert_after_symbol: Add new code

   Address the following PR feedback:
   [Paste specific feedback item(s) here]

   Requirements:
   - Follow project conventions from CLAUDE.md
   - Use @dorkroom/ui components where applicable
   - Make one logical change at a time
   - Keep changes focused on addressing the specific feedback
   - Document any decisions or trade-offs
   - Verify each fix by reading the changed code

   After completing changes, provide:
   1. Summary of what was changed
   2. Files modified
   3. Any notes or decisions made
   ```

3. **Process Gemini's response**:

   - Review changes made
   - Mark todo item as completed
   - Track changes in running list
   - Continue to next item

4. **Reuse continuation_id**: Pass the `continuation_id` from previous clink calls to maintain context across multiple fixes

**Important**:

- Leverage Gemini's larger token capacity for complex multi-file changes
- Always instruct Gemini to use Serena MCP for semantic code operations
- Group related feedback items to maintain context
- Keep conversation with Gemini focused on implementation details

---

## Task 4: Run Quality Checks

**Objective**: Ensure all changes meet code quality standards.

**Actions**:

1. Run linting with auto-fix: `bunx nx lint dorkroom --fix`
2. Run type checking: `bunx nx typecheck dorkroom`
3. Run code formatting: `bunx prettier --write .`
4. **If any checks fail**:
   - Fix the issues immediately
   - Re-run the failing check
   - Update relevant todo items
5. **Only proceed when all checks pass**

**Note**: These checks should match the pre-commit hook configuration in `.claude/hooks/react-app/`.

---

## Task 5: Test Changes (if UI changes were made)

**Objective**: Verify functionality in live browser if UI/UX changes were made.

**Actions**:

1. **If UI changes were made**:
   - Check if dev server is running on port 4200
   - If not running, start it: `bunx nx dev dorkroom -- --host=0.0.0.0`
   - Use Chrome DevTools MCP to:
     - Navigate to affected pages
     - Take snapshots/screenshots
     - Verify visual changes
     - Test interactions
     - Check console for errors
2. **If only backend/logic changes**: Skip this task

---

## Task 6: Commit Changes

**Objective**: Create a clean commit with descriptive message.

**Actions**:

1. Review all changes using `git diff`
2. Stage all changes: `git add .`
3. Create commit with structured message:

   ```
   chore: address PR feedback from review

   Addressed the following feedback:
   - [Brief description of fix 1]
   - [Brief description of fix 2]
   - [etc.]

   Changes made:
   - [Specific change 1 with file reference]
   - [Specific change 2 with file reference]

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

4. Push changes: `git push`

---

## Task 7: Post PR Summary Comment

**Objective**: Update PR with clear communication about what was addressed.

**Actions**:

1. Generate comprehensive summary including:
   - **Addressed Items**: List each piece of feedback that was fixed with brief explanation
   - **Deferred Items**: List any feedback that was intentionally not addressed with rationale
   - **Questions/Responses**: Answer any questions from reviewers
   - **Request for Re-review**: Tag reviewers if their specific feedback was addressed
2. Post comment using: `gh pr comment $ARGUMENTS --body "$(cat <<'EOF'...EOF)"`

**Comment Template**:

```markdown
## PR Feedback Response

### ✅ Addressed Items

- **[Issue/Feedback 1]** (by @reviewer-name)

  - Fixed: [Brief description of fix]
  - Location: `file/path.tsx:line`

- **[Issue/Feedback 2]**
  - Implemented: [Brief description]
  - Files changed: `file1.tsx`, `file2.tsx`

### 📋 Deferred Items

- **[Suggestion X]** (by @reviewer-name)
  - Rationale: [Why deferred - e.g., "Better suited for separate PR focused on refactoring"]
  - Tracking: [Optional: Link to new issue/PR]

### 💬 Responses

- **@reviewer-name**: [Answer to their question]

### 🔄 Re-review Request

@reviewer1 @reviewer2 - I've addressed your feedback. Please re-review when you have a chance.

---

All quality checks passing ✓

- Lint: ✓
- TypeScript: ✓
- Formatting: ✓

🤖 Automated response via [Claude Code](https://claude.com/claude-code)
```

---

**End of PR Respond Workflow**
