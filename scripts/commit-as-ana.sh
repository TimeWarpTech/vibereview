#!/usr/bin/env bash
set -euo pipefail

ANA_NAME="Ana Rodrigues"
ANA_EMAIL="anapaularozeno1@gmail.com"

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 \"commit message\" [-- <paths>...]" >&2
  exit 1
fi

MSG="$1"
shift

if [ "$#" -eq 0 ]; then
  git add -A
else
  git add "$@"
fi

if git diff --cached --quiet; then
  echo "Nothing staged. Aborting." >&2
  exit 1
fi

GIT_AUTHOR_NAME="$ANA_NAME" \
GIT_AUTHOR_EMAIL="$ANA_EMAIL" \
GIT_COMMITTER_NAME="$ANA_NAME" \
GIT_COMMITTER_EMAIL="$ANA_EMAIL" \
git commit -m "$MSG"

git --no-pager log -1 --format="committed as %an <%ae>: %s"
