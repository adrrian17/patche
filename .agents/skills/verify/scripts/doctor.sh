#!/usr/bin/env bash
# Read-only: is the instance on :3001 ours and healthy? Exits non-zero when it is not worth driving.
set -uo pipefail

source "$(dirname "$0")/lib.sh"
status=0

pid="$(cat "$run/pid" 2>/dev/null || true)"
if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
  echo "ok   launcher pid $pid alive"
else
  echo "FAIL no live launcher pid in $run/pid (run launch.sh)"
  status=1
fi

listener="$(lsof -nP -tiTCP:3001 -sTCP:LISTEN 2>/dev/null | head -1)"
if [[ -z "$listener" ]]; then
  echo "FAIL nothing listens on :3001"
  status=1
elif [[ -n "$pid" ]] && descendants "$pid" | grep -x "$listener" >/dev/null; then
  echo "ok   :3001 listener $listener is in our launcher's process tree"
else
  echo "FAIL :3001 listener $listener is NOT ours ($(ps -o command= -p "$listener" | cut -c1-80)). Do not drive or kill it."
  status=1
fi

home="$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/)"
session="$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/auth/get-session)"
[[ "$home" == 200 ]] && echo "ok   GET / -> 200" || { echo "FAIL GET / -> $home"; status=1; }
[[ "$session" == 200 ]] && echo "ok   GET /api/auth/get-session -> 200" || { echo "FAIL GET /api/auth/get-session -> $session"; status=1; }

if [[ -f "$run/server.log" ]] && grep -qiE 'error|exception' "$run/server.log"; then
  echo "warn server.log contains errors:"
  grep -iE 'error|exception' "$run/server.log" | tail -5 | cut -c1-160
fi
exit "$status"
