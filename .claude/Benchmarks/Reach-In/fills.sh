#!/bin/zsh
# fills.sh <Size...> — for each size (Small, Medium, Large, XLarge), builds the benchmark Nexus with the repo's make-benchmark-nexus.mjs, moves it into
# the working folder, augments it (augment.mjs base), and builds its 0%, 10%, and 50% Trash fills by deleting through the baseline build (fill.mjs).
set -e
HERE=${0:A:h}
REPO=${POMMORA_REPO:-$(git -C $HERE rev-parse --show-toplevel)}
WORK=${REACH_IN_WORK:-${TMPDIR:-/tmp}/pommora-reach-in}
mkdir -p $WORK/nexus $WORK/ud-gen
for S in "$@"; do
  (cd $REPO && POMMORA_USERDATA=$WORK/ud-gen node .claude/scripts/make-benchmark-nexus.mjs ${S:l})
  rm -rf $WORK/nexus/Benchmark-$S
  mv ~/Benchmark-$S $WORK/nexus/
  node $HERE/augment.mjs $WORK/nexus/Benchmark-$S base > /dev/null
  node $HERE/fill.mjs $S 0 10 50
done
