# Graphite Workflow Examples

## Example: Building a Feature Stack

```
User: "Implement user authentication"

Correct Flow:
1. Present stack plan to user:
   PR1: feat(db): Add user model and migrations
   PR2: feat(api): Add registration endpoint
   PR3: feat(api): Add login endpoint with JWT
   PR4: test: Add auth tests

2. Get user confirmation

3. Implement each PR:
   # PR1
   [write migration and model code]
   git add .
   gt create -a -m "feat(db): Add user model and migrations"

   # PR2
   [write registration endpoint]
   git add .
   gt create -a -m "feat(api): Add registration endpoint"

   # Continue for PR3, PR4...

4. Submit:
   gt submit --stack --no-interactive

5. Share PR link with user
```

---

## Example: Using execute-issue-jira-graphite Agent

```
User: "Implement PROJ-123 as a stacked PR"

The execute-issue-jira-graphite agent will:
1. Read Subtask details from Jira
2. Create a stacked branch for the work
3. Implement the Subtask
4. Use gt create for commits
5. Use gt submit for PR creation
6. Transition Jira issue status
```

---

## Example: Addressing Review Feedback

```
Scenario: Reviewer requests changes on PR2, but you're on PR4

gt log
# Shows: main <- PR1 <- PR2 <- PR3 <- PR4 (current)

gt checkout PR2-branch        # Navigate to PR needing changes
# Make code changes
git add .
gt modify -a                  # Amend + auto-restack PR3, PR4
gt submit --stack --no-interactive
gt top                        # Return to PR4
```

---

## Example: Common Mistakes

### Wrong: Using git commit
```bash
# DON'T DO THIS
git commit -m "feat: add feature"
git push origin feature-branch
```

### Right: Using gt create
```bash
# DO THIS
git add .
gt create -a -m "feat: add feature"
gt submit --no-interactive
```

---

### Wrong: Amending without restack
```bash
# DON'T DO THIS
git commit --amend
# Upstack branches are now orphaned!
```

### Right: Using gt modify
```bash
# DO THIS
gt modify -a
# Graphite automatically restacks all upstack branches
```

---

## Example: Daily Workflow

```bash
# Morning: Start fresh
gt sync                       # Get latest main, cleanup merged

# During development
gt create -a -m "..."         # Each logical chunk = new PR
gt submit                     # Push as you go

# When feedback arrives
gt checkout <branch>
# Make fixes
gt modify -a
gt submit --stack

# End of day
gt sync
gt log                        # Review stack state
```

---

## Stack Structure Visualization

```
gt log output example:

◯ main
│
◯ feat/user-model (PR #101) ✓ Approved
│
◯ feat/registration-api (PR #102) ⏳ In Review
│
◯ feat/login-api (PR #103) 📝 Draft
│
● feat/auth-tests (PR #104) ← you are here
```

---

## Conflict Resolution Example

```bash
gt sync
# ERROR: Conflict in src/api/users.ts

# 1. Open file, resolve conflict markers
vim src/api/users.ts

# 2. Stage resolved file
git add src/api/users.ts

# 3. Continue the operation
gt continue

# If you want to abort instead:
gt abort
```
