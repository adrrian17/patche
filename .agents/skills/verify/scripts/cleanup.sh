#!/usr/bin/env bash
# Stops only the process tree launch.sh started. Evidence in .verify/evidence/ is kept.
set -uo pipefail

source "$(dirname "$0")/lib.sh"
pid="$(cat "$run/pid" 2>/dev/null || true)"

if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
  # Snapshot the tree first: children reparent to launchd once their parent dies.
  tree="$pid $(descendants "$pid" | tr '\n' ' ')"
  kill -TERM $tree 2>/dev/null || true
  for _ in $(seq 1 15); do
    alive=""
    for p in $tree; do kill -0 "$p" 2>/dev/null && alive="$alive $p"; done
    [[ -z "$alive" ]] && break
    sleep 1
  done
  [[ -n "$alive" ]] && kill -KILL $alive 2>/dev/null
  echo "stopped launcher $pid and its process tree"
else
  echo "no live verify instance"
fi

# Auth storage states hold session cookies for a database that no longer exists.
rm -rf "$run" "$root/.verify/auth"
rm -rf "$root/packages/infra/.alchemy/state/patche/verify"

if lsof -nP -iTCP:3001 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "note: :3001 still has a listener; it is not ours, leave it alone"
fi
echo "evidence kept in $root/.verify/evidence/"
