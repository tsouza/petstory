#!/usr/bin/env bash
# Preflight for bitnet.cpp local install. Detects missing build prereqs
# (clang ≥18, cmake, python + venv + pip, git) and installs them when a
# supported package manager is available. Keeps the justfile target
# `bitnet-install` idempotent: safe to rerun, no-op when everything is
# already in place.
#
# Supported platforms:
#   - Ubuntu/Debian (apt + sudo)
#   - macOS (brew)
# Anything else: fail loud with the install hints.

set -euo pipefail

readonly REQUIRED_CLANG_MAJOR=18
readonly REQUIRED_CMAKE_MAJOR=3
readonly REQUIRED_CMAKE_MINOR=22
readonly REQUIRED_PYTHON_MINOR=9   # python 3.9+

# --- helpers ---------------------------------------------------------------

log()  { printf '\033[0;36m[preflight]\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m[preflight]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[0;31m[preflight]\033[0m %s\n' "$*" >&2; exit 1; }

have() { command -v "$1" >/dev/null 2>&1; }

clang_major_from_version() {
  # Parses `clang version X.Y.Z` from `clang --version`.
  local raw
  raw=$("$1" --version 2>/dev/null | head -1) || return 1
  # shellcheck disable=SC2001  # sed is clearer than parameter expansion here
  printf '%s' "$raw" | sed -nE 's/.*clang version ([0-9]+)\..*/\1/p'
}

# --- platform detection ----------------------------------------------------

OS=""
PKG=""
case "$(uname -s)" in
  Linux)
    OS="linux"
    if have apt-get; then PKG="apt"; fi
    ;;
  Darwin)
    OS="macos"
    if have brew; then PKG="brew"; fi
    ;;
esac

if [[ -z "$OS" ]]; then
  err "Unsupported platform ($(uname -s)). Install clang ≥$REQUIRED_CLANG_MAJOR, cmake ≥$REQUIRED_CMAKE_MAJOR.$REQUIRED_CMAKE_MINOR, python 3, git manually, then re-run."
fi

log "platform: $OS${PKG:+ ($PKG)}"

# --- sudo for apt (Linux only) --------------------------------------------

SUDO=""
if [[ "$PKG" == "apt" ]]; then
  if [[ $EUID -eq 0 ]]; then
    SUDO=""
  elif have sudo; then
    SUDO="sudo"
  else
    warn "sudo not available; apt installs will fail. Run as root or install sudo."
  fi
fi

install_apt() {
  if [[ "$PKG" != "apt" ]]; then
    err "Install $* manually — no supported package manager detected."
  fi
  log "apt install: $*"
  # DEBIAN_FRONTEND=noninteractive + NEEDRESTART_MODE=a suppress the interactive
  # kernel-upgrade / service-restart whiptail prompts that block automated runs.
  $SUDO env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt-get update -qq
  # shellcheck disable=SC2068  # intentional word-splitting of the package list
  $SUDO env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a \
    apt-get install -y --no-install-recommends $@
}

install_brew() {
  if [[ "$PKG" != "brew" ]]; then
    err "Install $* manually — brew not available."
  fi
  log "brew install: $*"
  # shellcheck disable=SC2068
  brew install $@
}

# --- checks ----------------------------------------------------------------

ensure_clang() {
  local major
  local best=""
  # Prefer a versioned binary (clang-18, clang-19, …); fall back to plain clang.
  for candidate in clang-20 clang-19 clang-18 clang; do
    if have "$candidate"; then
      major=$(clang_major_from_version "$candidate" || true)
      if [[ -n "$major" && "$major" -ge "$REQUIRED_CLANG_MAJOR" ]]; then
        best="$candidate"
        break
      fi
    fi
  done

  if [[ -n "$best" ]]; then
    log "clang ≥$REQUIRED_CLANG_MAJOR found: $best ($(clang_major_from_version "$best"))"
    export CC="$best"
    export CXX="${best/clang/clang++}"
    log "exporting CC=$CC CXX=$CXX for the build"
    ensure_clang_alternative "$best"
    return 0
  fi

  warn "clang ≥$REQUIRED_CLANG_MAJOR not found — installing…"
  case "$PKG" in
    apt)  install_apt clang-18 clang-tools-18 lld-18 ;;
    brew) install_brew llvm ;;
    *)    err "Install clang ≥$REQUIRED_CLANG_MAJOR manually." ;;
  esac

  # Re-resolve after install.
  for candidate in clang-18 clang; do
    if have "$candidate"; then
      major=$(clang_major_from_version "$candidate" || true)
      if [[ -n "$major" && "$major" -ge "$REQUIRED_CLANG_MAJOR" ]]; then
        export CC="$candidate"
        export CXX="${candidate/clang/clang++}"
        ensure_clang_alternative "$candidate"
        log "installed clang: $candidate ($major); CC=$CC CXX=$CXX"
        return 0
      fi
    fi
  done
  err "clang install completed but a compatible version still isn't on PATH."
}

# BitNet's setup_env.py hardcodes `-DCMAKE_C_COMPILER=clang` and ignores
# env vars. On Ubuntu, apt installs the binary as `clang-18` without a
# plain `clang` alias — so cmake can't find it. Register update-alternatives
# so `clang` resolves to the installed versioned binary.
ensure_clang_alternative() {
  local versioned="$1"  # e.g. clang-18
  if [[ "$PKG" != "apt" ]]; then
    return 0
  fi
  if have clang; then
    return 0
  fi
  if ! have update-alternatives; then
    return 0
  fi
  log "registering '$versioned' as the default 'clang' via update-alternatives"
  $SUDO update-alternatives --install /usr/bin/clang clang "/usr/bin/$versioned" 100 >/dev/null 2>&1 || true
  $SUDO update-alternatives --install /usr/bin/clang++ clang++ "/usr/bin/${versioned/clang/clang++}" 100 >/dev/null 2>&1 || true
}

ensure_cmake() {
  if have cmake; then
    local raw major minor
    raw=$(cmake --version | head -1 | awk '{print $3}')
    major=$(printf '%s' "$raw" | cut -d. -f1)
    minor=$(printf '%s' "$raw" | cut -d. -f2)
    if [[ "$major" -gt "$REQUIRED_CMAKE_MAJOR" \
          || ( "$major" -eq "$REQUIRED_CMAKE_MAJOR" && "$minor" -ge "$REQUIRED_CMAKE_MINOR" ) ]]; then
      log "cmake $raw OK"
      return 0
    fi
    warn "cmake $raw is older than $REQUIRED_CMAKE_MAJOR.$REQUIRED_CMAKE_MINOR — upgrading…"
  else
    warn "cmake not found — installing…"
  fi
  case "$PKG" in
    apt)  install_apt cmake ;;
    brew) install_brew cmake ;;
    *)    err "Install cmake ≥$REQUIRED_CMAKE_MAJOR.$REQUIRED_CMAKE_MINOR manually." ;;
  esac
}

ensure_python() {
  if ! have python3; then
    warn "python3 not found — installing…"
    case "$PKG" in
      apt)  install_apt python3 python3-venv python3-pip ;;
      brew) install_brew python@3.12 ;;
      *)    err "Install python 3 manually." ;;
    esac
    return 0
  fi

  local raw minor
  raw=$(python3 --version 2>&1 | awk '{print $2}')
  minor=$(printf '%s' "$raw" | cut -d. -f2)
  if [[ "$minor" -lt "$REQUIRED_PYTHON_MINOR" ]]; then
    err "python 3.$REQUIRED_PYTHON_MINOR+ required, found $raw. Upgrade manually."
  fi
  log "python $raw OK"

  # venv + pip modules — on Ubuntu these are separate packages.
  if ! python3 -c 'import venv' 2>/dev/null; then
    warn "python venv module missing — installing…"
    case "$PKG" in
      apt)  install_apt python3-venv ;;
      brew) : ;; # brew python ships venv bundled
      *)    err "Install python3-venv manually." ;;
    esac
  fi
  if ! python3 -m pip --version >/dev/null 2>&1; then
    warn "python pip missing — installing…"
    case "$PKG" in
      apt)  install_apt python3-pip ;;
      brew) : ;;
      *)    err "Install python3-pip manually." ;;
    esac
  fi
}

ensure_git() {
  if have git; then
    log "git $(git --version | awk '{print $3}') OK"
    return 0
  fi
  warn "git not found — installing…"
  case "$PKG" in
    apt)  install_apt git ;;
    brew) install_brew git ;;
    *)    err "Install git manually." ;;
  esac
}

ensure_disk_space() {
  # BitNet clone + build + model + quant weights ≈ 2 GB. Walk up until we find
  # an existing directory — the target may not exist yet on the first run.
  local target="${1:-.}" avail_kb avail_gb
  while [[ -n "$target" && ! -d "$target" ]]; do
    target=$(dirname "$target")
  done
  [[ -z "$target" ]] && target="."
  avail_kb=$(df -Pk "$target" | awk 'NR==2 { print $4 }')
  avail_gb=$(( avail_kb / 1024 / 1024 ))
  if [[ "$avail_gb" -lt 2 ]]; then
    warn "only ${avail_gb} GB free under $target — BitNet needs ~2 GB. Proceeding anyway."
  else
    log "disk space OK (~${avail_gb} GB free under $target)"
  fi
}

# --- main ------------------------------------------------------------------

ensure_git
ensure_cmake
ensure_python
ensure_clang
ensure_disk_space "${1:-.}"

log "preflight complete — all prerequisites satisfied"
