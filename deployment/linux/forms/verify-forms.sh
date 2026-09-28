#!/usr/bin/env bash
set -euo pipefail
ROOT=${1:?usage: verify-forms.sh /opt/lakegroup}
ENV_FILE=/etc/lakegroup/forms.production.env
set -a; source "$ENV_FILE"; set +a
test "$CAREERS_SCANNER_PROVIDER" = clamd
test "$CAREERS_CLAMD_HOST" = 127.0.0.1
test "$CAREERS_CLAMD_PORT" = 3310
systemctl is-active --quiet lakegroup-forms
ss -ltnH 'sport = :4000' | grep -q '127.0.0.1:4000'
ss -ltnH 'sport = :3310' | grep -q '127.0.0.1:3310'
curl --fail --silent http://127.0.0.1:4000/api/contact/token >/dev/null
curl --fail --silent http://127.0.0.1:4000/api/careers/token >/dev/null
cd "$ROOT/backend"
node --input-type=module -e "import { createFileScanner } from './src/lib/file-scanner.js'; const r=await createFileScanner({provider:'clamd',clamdHost:'127.0.0.1',clamdPort:3310})({buffer:Buffer.from('Lake Group scanner verification'),filename:'health.txt',mimeType:'text/plain'}); if(!r.clean) process.exit(1)"
echo 'PASS: Node, clamd, and both local token endpoints are healthy on loopback.'
