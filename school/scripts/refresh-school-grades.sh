#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="$ROOT_DIR/tools"
GRADES_SCRIPT="$TOOLS_DIR/grades.py"
GRADES_JSON="$ROOT_DIR/data/grades.json"

# Load only D2L vars from .env without shell-evaluating the file.
if [[ -f "$ROOT_DIR/.env" ]]; then
  while IFS='=' read -r key raw_value; do
    [[ -z "$key" ]] && continue
    case "$key" in
      D2L_USERNAME|D2L_PASSWORD)
        if [[ -z "${!key:-}" ]]; then
          value="${raw_value%$'\r'}"
          if [[ "$value" == \"*\" && "$value" == *\" ]]; then
            value="${value:1:${#value}-2}"
          elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
            value="${value:1:${#value}-2}"
          fi
          export "$key=$value"
        fi
        ;;
    esac
  done < <(grep -E '^(D2L_USERNAME|D2L_PASSWORD)=' "$ROOT_DIR/.env" || true)
fi

if [[ -x "$TOOLS_DIR/.venv/bin/python" ]]; then
  PYTHON_BIN="$TOOLS_DIR/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
else
  echo "python3 is required to refresh school grades." >&2
  exit 1
fi

if [[ ! -d "$TOOLS_DIR" || ! -f "$GRADES_SCRIPT" ]]; then
  echo "School tooling is missing. Expected: $GRADES_SCRIPT" >&2
  exit 1
fi

if [[ -z "${D2L_USERNAME:-}" || -z "${D2L_PASSWORD:-}" ]]; then
  echo "Missing D2L credentials." >&2
  echo "Set D2L_USERNAME and D2L_PASSWORD (env or .env), then run: npm run refresh" >&2
  exit 1
fi

if ! "$PYTHON_BIN" -c "from playwright.sync_api import sync_playwright; from bs4 import BeautifulSoup; import dotenv" >/dev/null 2>&1; then
  echo "Missing Python dependencies for school refresh." >&2
  echo "If using the local venv, run:" >&2
  echo "  cd tools && python3 -m venv .venv && source .venv/bin/activate && python -m pip install -r requirements.txt && python -m playwright install chromium" >&2
  echo "Or install with your active python environment." >&2
  exit 1
fi

if ! "$PYTHON_BIN" -c "from playwright.sync_api import sync_playwright; p = sync_playwright().start(); b = p.chromium.launch(headless=True); b.close(); p.stop()" >/dev/null 2>&1; then
  echo "Playwright Chromium is not ready." >&2
  echo "Install browser with the same Python environment used for refresh:" >&2
  echo "  $PYTHON_BIN -m playwright install chromium" >&2
  exit 1
fi

(
  cd "$TOOLS_DIR"
  "$PYTHON_BIN" grades.py
)

# grades.py writes to its own directory by default; move if needed
if [[ -f "$TOOLS_DIR/grades.json" && "$TOOLS_DIR/grades.json" != "$GRADES_JSON" ]]; then
  mv "$TOOLS_DIR/grades.json" "$GRADES_JSON"
fi

if [[ ! -s "$GRADES_JSON" ]]; then
  echo "Refresh completed but grades output was not created: $GRADES_JSON" >&2
  exit 1
fi

echo "School grades refreshed: data/grades.json"
