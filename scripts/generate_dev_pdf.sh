#!/usr/bin/env bash
# Generate DEVELOPER_GUIDE.pdf from docs/developer-guide.html
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HTML="$ROOT/docs/developer-guide.html"
PDF="$ROOT/DEVELOPER_GUIDE.pdf"
CHROME="${CHROME:-google-chrome}"

if [[ ! -f "$HTML" ]]; then
  echo "Missing $HTML" >&2
  exit 1
fi

"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$PDF" \
  "file://$HTML"

echo "Wrote $PDF ($(wc -c < "$PDF") bytes)"
