#!/bin/zsh
# teardown.sh — removes both worktrees and the whole working folder (benchmark Nexuses, fills, live clones, userData, raw results) after killing any
# Electron launched from it. Results and profiles already copied back beside the harness stay.
HERE=${0:A:h}
REPO=${POMMORA_REPO:-$(git -C $HERE rev-parse --show-toplevel)}
WORK=${REACH_IN_WORK:-${TMPDIR:-/tmp}/pommora-reach-in}
for p in $(ps -A -o pid=,command= | grep "$WORK/.*/Electron.app/Contents/MacOS/Electron" | grep -v grep | awk '{print $1}'); do kill -9 $p; done
for w in baseline reach-in; do [ -d $WORK/$w ] && git -C $REPO worktree remove --force $WORK/$w; done
git -C $REPO worktree prune
rm -rf $WORK
