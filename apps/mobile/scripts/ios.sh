#!/usr/bin/env bash
#
# ios.sh — one entry point for the three Dorkroom iOS workflows.
#
#   ./scripts/ios.sh server      # Metro dev server (JS/TS-only changes, hot reload)
#   ./scripts/ios.sh dev-build   # local dev-client build -> install + launch (native changes)
#   ./scripts/ios.sh build       # local standalone preview build -> install + launch (no Metro)
#   ./scripts/ios.sh install     # (re)install the last built .ipa + launch
#
# Flags:
#   --clear        (server)  start Metro with --clear (stale bundler cache)
#   --no-launch    (dev-build/build/install)  install but don't launch
#   --no-install   (dev-build/build)  build only, skip install/launch
#
# Why this script exists (gotchas it handles for you):
#   * `eas` isn't on PATH in a fresh shell — node/npm are nvm lazy-load shims but
#     `eas` has none, so we locate the nvm node bin that actually has `eas`.
#   * Fastlane/pod live in Homebrew; bun in ~/.bun — all prepended below.
#   * Builds stream the FULL log to a file (never piped through `tail`, which
#     buffers the real Xcode error and masks the exit code).
#
set -euo pipefail

# --- paths -------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ASC_ENV="$HOME/.app-store-connect/eas-asc.env"
BUILD_LOG="/tmp/dorkroom-build.log"
DEV_IPA="/tmp/dorkroom-dev.ipa"
PREVIEW_IPA="/tmp/dorkroom-preview.ipa"
BUNDLE_ID="art.dorkroom.mobile"

# --- PATH: make eas / fastlane / pod / bun resolvable ------------------------
export PATH="/opt/homebrew/bin:$HOME/.bun/bin:$PATH"
if ! command -v eas >/dev/null 2>&1; then
  for d in "$HOME"/.nvm/versions/node/*/bin; do
    [ -x "$d/eas" ] && { export PATH="$d:$PATH"; break; }
  done
fi

log()  { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# --- helpers -----------------------------------------------------------------
require_eas() {
  command -v eas >/dev/null 2>&1 || die "eas not found. Run: npm i -g eas-cli"
  [ -f "$ASC_ENV" ] || die "Missing $ASC_ENV (App Store Connect API key env)."
  # shellcheck disable=SC1090
  source "$ASC_ENV"
}

# Echo the connected iPhone's devicectl CoreDevice id (the UUID form, not the
# Apple hardware UDID). Empty if none connected.
device_id() {
  xcrun devicectl list devices 2>/dev/null \
    | grep -i iphone \
    | grep -oE '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}' \
    | head -1
}

install_and_launch() {
  local ipa="$1" launch="$2"
  [ -f "$ipa" ] || die "No .ipa at $ipa — build first."
  local dev; dev="$(device_id)"
  [ -n "$dev" ] || die "No iPhone detected. Connect it (Developer Mode on, 'Trust This Computer')."
  log "Installing $ipa -> device $dev"
  xcrun devicectl device install app --device "$dev" "$ipa"
  if [ "$launch" = "1" ]; then
    log "Launching $BUNDLE_ID"
    xcrun devicectl device process launch --device "$dev" "$BUNDLE_ID"
  fi
}

# Run a local EAS build, streaming the full log to $BUILD_LOG. pipefail + tee
# means the exit status reflects eas, and the whole log is saved (not truncated).
run_build() {
  local profile="$1" out="$2"
  require_eas
  log "Building ($profile) -> $out   [full log: $BUILD_LOG]"
  ( cd "$APP_DIR" && eas build --local --profile "$profile" --platform ios \
      --non-interactive --output "$out" ) 2>&1 | tee "$BUILD_LOG"
  [ -f "$out" ] || die "Build did not produce $out — see $BUILD_LOG"
  log "Build OK: $out"
}

# --- subcommands -------------------------------------------------------------
cmd="${1:-help}"; shift || true

# parse trailing flags
CLEAR=0; LAUNCH=1; INSTALL=1
for arg in "$@"; do
  case "$arg" in
    --clear)      CLEAR=1 ;;
    --no-launch)  LAUNCH=0 ;;
    --no-install) INSTALL=0 ;;
    *) die "Unknown flag: $arg" ;;
  esac
done

case "$cmd" in
  server|dev|start)
    command -v bunx >/dev/null 2>&1 || die "bun not found on PATH."
    args=(expo start --dev-client --host lan)
    [ "$CLEAR" = "1" ] && args+=(--clear)
    log "Metro dev server (open the installed dev client on the phone; same Wi-Fi)"
    cd "$APP_DIR" && exec bunx "${args[@]}"
    ;;

  dev-build|dev-client)
    run_build development "$DEV_IPA"
    [ "$INSTALL" = "1" ] && install_and_launch "$DEV_IPA" "$LAUNCH"
    [ "$INSTALL" = "1" ] && log "Now run: ./scripts/ios.sh server   (dev client loads JS from Metro)"
    ;;

  build|preview|full)
    run_build preview "$PREVIEW_IPA"
    [ "$INSTALL" = "1" ] && install_and_launch "$PREVIEW_IPA" "$LAUNCH"
    ;;

  install)
    # prefer the preview ipa, fall back to dev
    if [ -f "$PREVIEW_IPA" ]; then install_and_launch "$PREVIEW_IPA" "$LAUNCH"
    elif [ -f "$DEV_IPA" ]; then install_and_launch "$DEV_IPA" "$LAUNCH"
    else die "No built .ipa found ($PREVIEW_IPA or $DEV_IPA)."; fi
    ;;

  help|-h|--help|*)
    sed -n '3,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    ;;
esac
