#!/bin/zsh
# record.sh <label> <app worktree> — one reveal recording of a built worktree into results/<label>.json.
cd ${0:A:h}
PORT=${REVEAL_PORT:-9446}
../editor-parity/launch.sh $1 $2 $PORT $PWD/fixtures.mjs && node run.mjs $1 $PORT
STATUS=$?
../editor-parity/stop.sh $PORT
exit $STATUS
