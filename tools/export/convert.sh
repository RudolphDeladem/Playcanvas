#!/bin/sh
# Runs the campus conversion: starts the converter's server (port 5310) and the headless page, writing public/campus/.
# ORIG=/path/to/legonrush-world (default ../legonrush-world). Logs: $LOG (default /tmp/legonrush-convert.log).
cd "$(dirname "$0")/../.."
LOG=${LOG:-/tmp/legonrush-convert.log}
# (a partial run, QUERY=?only=..., keeps the files already converted)
[ -z "$QUERY" ] && rm -rf public/campus
node node_modules/vite/bin/vite.js --config tools/export/vite.config.ts > "$LOG.server" 2>&1 &
SERVER=$!
sleep 5
timeout ${TIMEOUT:-14000} node tools/export/run.mjs "tools/export/export.html${QUERY:-}" 14000000 > "$LOG" 2>&1
STATUS=$?
kill $SERVER 2>/dev/null
exit $STATUS
