#!/usr/bin/env bash
set -euo pipefail
test "$(id -u)" -eq 0 || { echo 'Run as root.' >&2; exit 1; }
systemctl disable --now lakegroup-forms 2>/dev/null || true
rm -f /etc/systemd/system/lakegroup-forms.service
systemctl daemon-reload
echo 'Removed only the Lake Group Node forms service definition. PostgreSQL, clamd, Nginx, and the environment file were retained.'
