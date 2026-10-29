#!/bin/zsh
# setup.sh [commit] — cuts the baseline and reach-in worktrees from the repo at <commit> (default 15fe7422a) into the working folder,
# applies instrumentation.patch to both and reach-in.patch to the prototype, links node_modules to the main checkout's, and builds both.
set -e
HERE=${0:A:h}
REPO=${POMMORA_REPO:-$(git -C $HERE rev-parse --show-toplevel)}
WORK=${REACH_IN_WORK:-${TMPDIR:-/tmp}/pommora-reach-in}
COMMIT=${1:-15fe7422a}
mkdir -p $WORK
for w in baseline reach-in; do
  [ -d $WORK/$w ] && git -C $REPO worktree remove --force $WORK/$w
  git -C $REPO worktree add --detach $WORK/$w $COMMIT >/dev/null
  mkdir -p $WORK/$w/node_modules/@pommora
  for e in $REPO/node_modules/* $REPO/node_modules/.bin; do
    n=${e:t}
    [ "$n" = "@pommora" ] || ln -s "$e" "$WORK/$w/node_modules/$n"
  done
  for p in core:Core uix:UIX desktop:Desktop sync:Sync mobile:Mobile; do
    ln -s "../../${p#*:}" "$WORK/$w/node_modules/@pommora/${p%%:*}"
  done
  git -C $WORK/$w apply $HERE/instrumentation.patch
done
patch -p1 -d $WORK/reach-in < $HERE/reach-in.patch
for w in baseline reach-in; do (cd $WORK/$w && npm run build >/dev/null && echo "built $w at $COMMIT"); done
