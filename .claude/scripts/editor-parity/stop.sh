#!/bin/zsh
# stop.sh <port> — ends the instance whose browser process holds the debug port, and confirms it is gone.
PID=$(lsof -ti tcp:$1 -sTCP:LISTEN 2>/dev/null)
[ -z "$PID" ] && exit 0
kill $PID
for i in {1..20}; do lsof -ti tcp:$1 -sTCP:LISTEN >/dev/null 2>&1 || exit 0; sleep 0.5; done
kill -9 $PID 2>/dev/null
exit 0
