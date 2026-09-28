#!/usr/bin/env bash
set -euo pipefail
ROOT=${1:?usage: deploy-forms.sh /opt/lakegroup}
ENV_FILE=/etc/lakegroup/forms.production.env
test "$(id -u)" -eq 0 || { echo 'Run as root.' >&2; exit 1; }
id lakeforms >/dev/null 2>&1 || useradd --system --home /nonexistent --shell /usr/sbin/nologin lakeforms
install -d -m 0750 -o root -g lakeforms /etc/lakegroup
test -f "$ENV_FILE" || { echo "Create $ENV_FILE from forms.production.env.template first." >&2; exit 1; }
chown root:lakeforms "$ENV_FILE"; chmod 0640 "$ENV_FILE"
cd "$ROOT/backend"; npm ci --omit=dev
install -m 0644 "$ROOT/deployment/linux/forms/lakegroup-forms.service" /etc/systemd/system/lakegroup-forms.service
systemctl daemon-reload
systemctl enable --now lakegroup-forms
"$ROOT/deployment/linux/forms/verify-forms.sh" "$ROOT"
