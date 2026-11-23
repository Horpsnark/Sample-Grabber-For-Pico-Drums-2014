#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if command -v python3 >/dev/null 2>&1; then
  PY_CMD="python3"
elif command -v python >/dev/null 2>&1; then
  PY_CMD="python"
else
  echo "Python 3.9+ was not found. Install Python 3 first."
  exit 1
fi

"$PY_CMD" check_python.py --install
