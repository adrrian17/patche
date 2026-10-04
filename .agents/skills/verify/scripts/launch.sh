#!/usr/bin/env bash
# Starts a fresh `verify` Alchemy stage on http://localhost:3001 and waits until it answers.
set -euo pipefail

source "$(dirname "$0")/lib.sh"

if lsof -nP -iTCP:3001 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port 3001 is already in use. Run doctor.sh: if it is not ours, it is the user's dev server or an E2E run. Do not kill it." >&2
  exit 1
fi

mkdir -p "$run"
# Dropping the stage state makes Alchemy create a fresh local D1 and R2, like the E2E suite.
rm -rf "$root/packages/infra/.alchemy/state/patche/verify"

cd "$root"
APP_ENV=e2e nohup bunx varlock run -- bash -c 'cd packages/infra && exec bunx alchemy dev --stage verify' \
  >"$run/server.log" 2>&1 &
echo $! >"$run/pid"

for _ in $(seq 1 180); do
  if curl -fs -o /dev/null http://localhost:3001/; then
    echo "ready: http://localhost:3001 (pid $(cat "$run/pid"), log $run/server.log)"
    exit 0
  fi
  if ! kill -0 "$(cat "$run/pid")" 2>/dev/null; then
    echo "server exited during startup; last log lines:" >&2
    tail -20 "$run/server.log" >&2
    exit 1
  fi
  sleep 1
done
echo "timed out after 180s; see $run/server.log" >&2
exit 1
