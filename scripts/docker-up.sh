#!/usr/bin/env bash
# One command: full dev stack (Next + MySQL + Adminer)
set -euo pipefail
cd "$(dirname "$0")/.."
exec docker compose up --build "$@"
