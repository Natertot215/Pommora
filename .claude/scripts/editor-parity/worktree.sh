#!/bin/zsh
# worktree.sh <commit> <dir> — a detached worktree of <commit>, its packages resolving to itself, built for launch.sh.
set -e
REPO="$HOME/The Studio/Projects/Project Pommora"
COMMIT=$1 DIR=$2
[ -d "$DIR" ] && git -C "$REPO" worktree remove --force "$DIR"
git -C "$REPO" worktree add --detach "$DIR" "$COMMIT" >/dev/null
mkdir -p "$DIR/node_modules/@pommora"
for e in "$REPO/node_modules/"* "$REPO/node_modules/.bin"; do
  n=${e:t}
  [ "$n" = "@pommora" ] || ln -s "$e" "$DIR/node_modules/$n"
done
# The root's own @pommora links point at the main checkout; these point at the worktree, so the build compiles its code.
for p in core:Core uix:UIX desktop:Desktop sync:Sync dashboard:Dashboard mobile:Mobile; do
  ln -s "../../${p#*:}" "$DIR/node_modules/@pommora/${p%%:*}"
done
cd "$DIR" && npm run build >/dev/null && echo "built $COMMIT in $DIR"
