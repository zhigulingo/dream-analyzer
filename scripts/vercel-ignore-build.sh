#!/bin/bash

# Vercel Ignored Build Step Script
# Exit 1 = Build
# Exit 0 = Skip

echo "Checking build for branch: $VERCEL_GIT_COMMIT_REF"

# 1. Skip gh-pages branch
if [ "$VERCEL_GIT_COMMIT_REF" = "gh-pages" ]; then
  echo "✅ Skipping build for gh-pages branch."
  exit 0
fi

# 2. Check for changes in the current directory (project folder)
# Vercel provides VERCEL_GIT_PREVIOUS_SHA for reliable comparison
if [ -z "$VERCEL_GIT_PREVIOUS_SHA" ]; then
  echo "⚠️ No previous SHA available, forcing build."
  exit 1
fi

if git diff --quiet $VERCEL_GIT_PREVIOUS_SHA HEAD .; then
  echo "✅ No changes detected in the project folder. Skipping build."
  exit 0
else
  echo "🚀 Changes detected in project folder. Proceeding with build."
  exit 1
fi
