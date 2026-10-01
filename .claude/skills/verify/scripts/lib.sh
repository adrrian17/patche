# Sourced by the other scripts. Alchemy spawns workerd in new process groups, so track the process tree instead.
root="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
run="$root/.verify/run"

descendants() {
  local child
  for child in $(pgrep -P "$1"); do
    echo "$child"
    descendants "$child"
  done
}
