#!/usr/bin/env bash
#
# ios.sh — one entry point for the three Dorkroom iOS workflows.
#
#   ./scripts/ios.sh server                # Metro dev server (JS/TS-only changes, hot reload)
#   ./scripts/ios.sh server --tailscale    # ...same, but reachable over Tailscale (off-LAN)
#   ./scripts/ios.sh dev-build   # local dev-client build -> install + launch (native changes)
#   ./scripts/ios.sh build       # local standalone preview build -> install + launch (no Metro)
#   ./scripts/ios.sh install     # (re)install the last built .ipa + launch
#
# Flags:
#   --clear        (server)  start Metro with --clear (stale bundler cache)
#   --tailscale    (server)  serve Metro over HTTPS via Tailscale (see "Tailscale" below)
#   --port=N       (server)  dev server port (default 8081)
#   --no-launch    (dev-build/build/install)  install but don't launch
#   --no-install   (dev-build/build)  build only, skip install/launch
#
# Tailscale (server --tailscale): loads the dev client from anywhere on your
# tailnet (other Wi-Fi, cellular), not just the LAN. iOS ATS blocks plain-HTTP
# Metro over Tailscale's 100.64.0.0/10 CGNAT range (it isn't "local" like your
# 192.168.x LAN), so this serves Metro over trusted HTTPS instead: mint a real
# TLS cert for this node's MagicDNS name (`tailscale cert`; needs HTTPS enabled
# on the tailnet), bind Metro to loopback advertising that hostname, and front
# it with `tailscale serve`. Ctrl-C tears the proxy down. The phone needs
# Tailscale connected with MagicDNS ("Use Tailscale DNS") on.
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
SCHEME="dorkroom"   # app.json expo.scheme — for the dev-client deep link
PORT="${PORT:-8081}"
CERT_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/dorkroom-tailscale"

# --- PATH: make eas / fastlane / pod / bun resolvable ------------------------
export PATH="/opt/homebrew/bin:$HOME/.bun/bin:$PATH"
if ! command -v eas >/dev/null 2>&1; then
  for d in "$HOME"/.nvm/versions/node/*/bin; do
    [ -x "$d/eas" ] && { export PATH="$d:$PATH"; break; }
  done
fi
TS="$(command -v tailscale || true)"
[ -z "$TS" ] && [ -x "/Applications/Tailscale.app/Contents/MacOS/Tailscale" ] \
  && TS="/Applications/Tailscale.app/Contents/MacOS/Tailscale"

log()  { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*" >&2; }
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

# --- Tailscale serving (server --tailscale) ----------------------------------
# This node's MagicDNS name, no trailing dot (e.g. io.fawn-snares.ts.net).
ts_dnsname() {
  "$TS" status --json 2>/dev/null \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['Self']['DNSName'].rstrip('.'))"
}

# Ensure a currently-valid cert for $1 exists in $CERT_DIR; mint if missing or
# expiring within a day. Let's Encrypt rate-limits issuance, so we reuse.
ts_ensure_cert() {
  local name="$1"
  CRT="$CERT_DIR/$name.crt"; KEY="$CERT_DIR/$name.key"
  mkdir -p "$CERT_DIR"
  if [ -f "$CRT" ] && [ -f "$KEY" ] && openssl x509 -checkend 86400 -noout -in "$CRT" >/dev/null 2>&1; then
    log "Reusing TLS cert: $CRT"
  else
    log "Minting TLS cert for $name (tailscale cert)…"
    "$TS" cert --cert-file "$CRT" --key-file "$KEY" "$name" \
      || die "tailscale cert failed. Enable HTTPS for the tailnet (admin console → DNS → Enable HTTPS)."
  fi
}

# Start Metro on loopback fronted by `tailscale serve` for TLS. Runs in the
# foreground; the trap tears the proxy + Metro down on exit.
serve_over_tailscale() {
  [ -n "$TS" ] || die "tailscale CLI not found (install the Tailscale app or 'brew install tailscale')."
  "$TS" status >/dev/null 2>&1 || die "Tailscale is not running / not logged in. Start it and retry."
  local name ip4; name="$(ts_dnsname)"; ip4="$("$TS" ip -4 2>/dev/null | head -1)"
  [ -n "$name" ] || die "Could not determine this node's MagicDNS name."
  ts_ensure_cert "$name"

  local plog metro_pid=""; plog="$(mktemp -t dorkroom-metro.XXXXXX.log)"
  # shellcheck disable=SC2329  # invoked indirectly via `trap` below
  cleanup_ts() {
    log "Shutting down…"
    "$TS" serve --https="$PORT" off >/dev/null 2>&1 || true
    [ -n "$metro_pid" ] && kill "$metro_pid" 2>/dev/null || true
    rm -f "$plog"
  }
  trap cleanup_ts EXIT INT TERM

  # 1. Metro on loopback ONLY, advertising the MagicDNS hostname. Must bind the
  #    port before `tailscale serve` claims it, or Expo's probe skips the server.
  log "Starting Metro on loopback :$PORT (advertising https://$name:$PORT)…"
  local metro_args=(expo start --dev-client --host localhost --port "$PORT")
  [ "$CLEAR" = "1" ] && metro_args+=(--clear)
  ( cd "$APP_DIR" && REACT_NATIVE_PACKAGER_HOSTNAME="$name" exec bunx "${metro_args[@]}" ) \
    >"$plog" 2>&1 &
  metro_pid=$!

  # 2. Wait for Metro to answer on loopback (or bail if it died).
  for _ in $(seq 1 60); do
    kill -0 "$metro_pid" 2>/dev/null || { cat "$plog"; die "Metro exited during startup."; }
    curl -fsS -o /dev/null "http://localhost:$PORT/status" 2>/dev/null && break
    sleep 1
  done
  curl -fsS -o /dev/null "http://localhost:$PORT/status" 2>/dev/null \
    || { cat "$plog"; die "Metro did not become ready on :$PORT."; }

  # 3. Front it with a TLS terminator on the tailnet interface.
  log "Enabling tailscale serve: https://$name:$PORT → localhost:$PORT"
  "$TS" serve --https="$PORT" off >/dev/null 2>&1 || true
  "$TS" serve --bg --https="$PORT" "http://localhost:$PORT" >/dev/null \
    || die "tailscale serve failed."

  # 4. Verify the phone-facing chain (manifest over TLS with our cert as CA).
  if [ -n "$ip4" ]; then
    local bu
    bu="$(curl -fsS --cacert "$CRT" --resolve "$name:$PORT:$ip4" \
           "https://$name:$PORT/" -H 'Expo-Platform: ios' 2>/dev/null \
           | python3 -c "import sys,json;print(json.load(sys.stdin)['launchAsset']['url'])" 2>/dev/null || true)"
    case "$bu" in
      https://$name:$PORT/*) log "Verified: manifest serves https bundle URL over Tailscale ✓" ;;
      "") warn "Could not verify the manifest over TLS (still starting?). Try loading it on the phone." ;;
      *)  warn "Manifest bundle URL is unexpected: $bu" ;;
    esac
  fi

  printf '\n\033[1;32m  Dev client URL:\033[0m  https://%s:%s\n' "$name" "$PORT"
  printf '\033[1;32m  Deep link:     \033[0m  %s://expo-development-client/?url=https://%s:%s\n\n' "$SCHEME" "$name" "$PORT"
  log "Phone needs Tailscale connected with MagicDNS on. Ctrl-C here to stop."

  # 5. Foreground: stream Metro logs; cleanup runs on exit.
  tail -n +1 -f "$plog" &
  wait "$metro_pid"
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
CLEAR=0; LAUNCH=1; INSTALL=1; TAILSCALE=0
for arg in "$@"; do
  case "$arg" in
    --clear)      CLEAR=1 ;;
    --tailscale)  TAILSCALE=1 ;;
    --port=*)     PORT="${arg#--port=}" ;;
    --no-launch)  LAUNCH=0 ;;
    --no-install) INSTALL=0 ;;
    *) die "Unknown flag: $arg" ;;
  esac
done

case "$cmd" in
  server|dev|start)
    command -v bunx >/dev/null 2>&1 || die "bun not found on PATH."
    if [ "$TAILSCALE" = "1" ]; then
      serve_over_tailscale
      exit 0
    fi
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
    sed -n '3,25p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    ;;
esac
