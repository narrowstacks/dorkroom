#!/bin/bash
# Vercel Ignored Build Step
# Exit 0 = skip build, Exit 1 = proceed with build
#
# Builds are opt-in, through a marker in the commit subject: [deploy] for
# production, [preview] for everything else. That lets a batch of PRs merge
# without a deployment per merge; the final [deploy] commit ships everything
# since the last one. CLAUDE.md ("Vercel Builds") says when to mark a commit.
#
# The markers are per environment so that a preview request can never ship: a
# lone [preview] commit becomes the squash subject on main, where only [deploy]
# counts. Only the subject is read, because squash merges here copy every branch
# commit into the body.

MESSAGE="$VERCEL_GIT_COMMIT_MESSAGE"
SUBJECT="${MESSAGE%%$'\n'*}"

if [ "$VERCEL_ENV" = "production" ]; then
  MARKER="[deploy]"
else
  MARKER="[preview]"
fi

echo "📌 Current commit: $VERCEL_GIT_COMMIT_SHA"
echo "📌 Environment: $VERCEL_ENV (needs $MARKER)"
echo "📌 Subject: $SUBJECT"

# No commit message means no Git metadata, so this deployment did not come from
# a push (for example a CLI deploy from outside a checkout). Someone asked for
# it directly, and there is no subject to mark.
if [ -z "$MESSAGE" ]; then
  echo "🔨 No commit message, building."
  exit 1
fi

case "$SUBJECT" in
  *"$MARKER"*)
    echo "🔨 Subject contains $MARKER, building."
    exit 1
    ;;
esac

echo "⏭ Skipping build: subject has no $MARKER marker."
exit 0
