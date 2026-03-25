#!/bin/bash
# Vercel Build Command
# Uses --force when should-deploy.sh detected file changes to avoid stale cache hits

if [ -f .turbo-force ]; then
  echo "🔄 File changes detected, bypassing turbo cache..."
  rm .turbo-force
  turbo run build --filter=@dorkroom/dorkroom --force
else
  echo "📦 Running cached build..."
  turbo run build --filter=@dorkroom/dorkroom
fi
