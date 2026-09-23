#!/bin/zsh
# twice.sh <labelA> <labelB> <app> — two fresh runs of one build, compared: the harness is deterministic only when they match.
cd ${0:A:h}
for L in $1 $2; do ./launch.sh $L $3 9444 && node run.mjs $L 9444 2>/dev/null; ./stop.sh 9444; done
node compare.mjs $1 $2
grep -E "Rendered lines differing|DIFFERENT" results/$1-vs-$2.md
