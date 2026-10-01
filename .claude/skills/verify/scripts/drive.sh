#!/usr/bin/env bash
# Usage: drive.sh <name> [playwright args...]
# Runs drives/*.spec.ts against the live verify instance and writes evidence to .verify/evidence/<timestamp>-<name>/.
set -euo pipefail

source "$(dirname "$0")/lib.sh"
skill="$root/.claude/skills/verify"
name="${1:?usage: drive.sh <name> [playwright args, e.g. a spec filter]}"
shift

"$skill/scripts/doctor.sh" >/dev/null || { echo "doctor failed; run doctor.sh to see why" >&2; exit 1; }

export VERIFY_EVIDENCE="$root/.verify/evidence/$(date +%Y%m%d-%H%M%S)-$name"
mkdir -p "$VERIFY_EVIDENCE" "$root/.verify/auth"
cd "$root/apps/web"
# Drives live outside apps/web and ESM ignores NODE_PATH, so link apps/web's dependencies
# next to them (gitignored). Varlock supplies the e2e Stripe keys that stripe-events.ts reads.
ln -sfn ../../../apps/web/node_modules "$skill/node_modules"
APP_ENV=e2e bunx varlock run -- \
  bunx playwright test -c "$skill/playwright.config.ts" "$@" 2>&1 | tee "$VERIFY_EVIDENCE/run.log"
status="${PIPESTATUS[0]}"
echo "evidence: $VERIFY_EVIDENCE"
exit "$status"
