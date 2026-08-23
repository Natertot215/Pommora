#!/bin/sh
# .git/hooks isn't versioned, so a fresh clone has none. This copies the ones kept beside it.
set -e
root=$(git rev-parse --show-toplevel)
for hook in post-commit; do
  cp "$root/.claude/scripts/$hook" "$root/.git/hooks/$hook"
  chmod +x "$root/.git/hooks/$hook"
  echo "installed $hook"
done
