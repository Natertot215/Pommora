#!/bin/zsh
# launch.sh <label> <app worktree> <port> — a scratch Pommora instance on its own userData, port, and fresh fixture Nexus.
set -e
HERE=${0:A:h}
LABEL=$1 APP=$2 PORT=$3
ELECTRON="$HOME/The Studio/Projects/Project Pommora/node_modules/.bin/electron"
"$HERE/stop.sh" $PORT
rm -rf "$HERE/run/$LABEL" && mkdir -p "$HERE/run/$LABEL/ud"
cp -R "$HOME/Test" "$HERE/run/$LABEL/nexus"
node "$HERE/fixtures.mjs" "$HERE/run/$LABEL/nexus"
printf '{"lastNexusPath":"%s"}\n' "$HERE/run/$LABEL/nexus" > "$HERE/run/$LABEL/ud/pommora.json"
cd "$APP/Desktop"
POMMORA_USERDATA="$HERE/run/$LABEL/ud" POMMORA_DEBUG_PORT=$PORT env -u ELECTRON_RUN_AS_NODE "$ELECTRON" . > "$HERE/run/$LABEL/app.log" 2>&1 &
for i in {1..60}; do
  curl -s "http://127.0.0.1:$PORT/json/list" | grep -q webSocketDebuggerUrl && exit 0
  sleep 1
done
echo "launch: no page target on $PORT" >&2
exit 1
