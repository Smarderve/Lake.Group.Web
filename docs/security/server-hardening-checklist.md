# Server Hardening — Deployment-Site Checklist (SECURITY_ROADMAP Phase 16)

**Status:** checklist + verification steps · execution is deployment-site work
(this checkout cannot run it) · **target host: Ubuntu 22.04/24.04 LTS** (adapt
paths to the distro)

Maps 1:1 to the roadmap's Phase 16 acceptance criteria (OS + process
management). Every item has a **verification command** so the deployment can
be *proven*, not assumed. Run top-to-bottom at first deployment; re-run the
"acceptance sweep" (§12) on every release.

---

## OS — 1. Security updates current

- [ ] `sudo apt update && sudo apt full-upgrade -y` (reboot if a kernel
      updated: `sudo reboot`, then re-verify everything below).
- [ ] Automatic security updates enabled:

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades   # enable
systemctl status unattended-upgrades --no-pager            # → active (running)
```

## OS — 2. Unnecessary services removed

- [ ] Inventory and disable anything not needed (web server is nginx/caddy
      ONLY; no mail, no ftp, no telnet, no snmp, no docker if unused):

```bash
systemctl list-unit-files --state=enabled   # review every entry
ss -tlnp                                     # what is actually listening
sudo systemctl disable --now <unneeded-service>
```

## OS — 3 & 11. Dedicated application user (non-root)

- [ ] A dedicated system user runs the app — Node **never** runs as root:

```bash
sudo useradd --system --home /opt/lakegroup --shell /usr/sbin/nologin lakeapp
sudo mkdir -p /opt/lakegroup && sudo chown -R lakeapp:lakeapp /opt/lakegroup
```

Verify after the service starts (§10):

```bash
ps -o user=,comm= -p "$(pgrep -f 'node src/index.js' | head -1)"   # → lakeapp, not root
```

## OS — 4. Node not running as root

- [ ] Covered by §3; the systemd unit (§10) must carry `User=lakeapp`.
- [ ] Sanity: `sudo -u lakeapp node -e 'console.log(process.getuid())'` →
      non-zero uid.

## OS — 5. Firewall rules

- [ ] Default-deny with explicit allow rules (ufw example):

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 80/tcp      # HTTP  → the reverse proxy
sudo ufw allow 443/tcp     # HTTPS → the reverse proxy
sudo ufw allow from <your-admin-ip>/32 to any port 22 proto tcp   # SSH: admin IPs ONLY
sudo ufw enable
sudo ufw status verbose    # verify
```

## OS — 6 & 7. SSH restricted; keys preferred

- [ ] `/etc/ssh/sshd_config` (or a drop-in):

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowGroups ssh-users        # or AllowUsers <admin-accounts>
```

- [ ] Install your public key, then verify the running daemon state:

```bash
sudo mkdir -p /home/<admin>/.ssh && sudo tee /home/<admin>/.ssh/authorized_keys   # paste key
sudo sshd -T | grep -E 'permitrootlogin|passwordauthentication|pubkeyauthentication'
# → permitrootlogin no / passwordauthentication no / pubkeyauthentication yes
sudo systemctl reload ssh
```

- [ ] Open a SECOND session before closing the first (never lock yourself out).

## OS — 8. Only 80/443 public; unnecessary ports disabled

- [ ] The host exposes nothing else publicly. Verify from the host and from
      an external box:

```bash
ss -tlnp                                              # compare against the allow list
# external scan (from your workstation): nc -zv <host> 22 80 443 5432 4000
#   → 80/443 open, 22 only from admin IPs, 5432 and 4000 must be FILTERED
```

- [ ] The backend itself binds `PORT=4000` on loopback only
      (see §9 / `TRUST_PROXY` below).

## OS — 9. PostgreSQL private

- [ ] Already code-level enforced (Phase 6): `listen_addresses = '127.0.0.1'`
      and a least-privilege runtime role (`lake_app`). Verify on the DB host:

```bash
sudo -u postgres psql -c "SELECT name, setting FROM pg_settings WHERE name IN ('listen_addresses','port');"
# → listen_addresses = 127.0.0.1
sudo -u postgres psql -c "SELECT type, database, user_name, address, auth_method FROM pg_hba_file_rules;"
# → host rules restricted to 127.0.0.1/32 or the app subnet; no 0.0.0.0/0
```

## Process management — 10. Node under a service manager

- [ ] systemd unit (create `/etc/systemd/system/lakegroup-backend.service`):

```ini
[Unit]
Description=Lake Group backend (API + CMS)
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=lakeapp
Group=lakeapp
WorkingDirectory=/opt/lakegroup/backend
EnvironmentFile=/opt/lakegroup/backend/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=3
LimitNOFILE=65536
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

- [ ] Install and verify:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lakegroup-backend
systemctl status lakegroup-backend --no-pager          # → active (running), user lakeapp
systemctl is-enabled lakegroup-backend                 # → enabled
curl -s http://127.0.0.1:4000/health                   # → {"status":"ok",...}
```

## App-level settings the server must run with (verified at boot)

- [ ] `NODE_ENV=production` — the backend **refuses to start** (Phase 1
      fail-fast) without `DATABASE_URL`, a ≥32-char `SESSION_SECRET`, and
      `SESSION_COOKIE_SECURE=true`.
- [ ] `SESSION_COOKIE_SECURE=true` — HTTPS-only cookies + HSTS header on.
- [ ] `TRUST_PROXY=1` only for an ingress-only one-hop topology, or an exact
      proxy IP/CIDR allowlist — real client IPs for rate limiting/audit and
      trusted external origin reconstruction. Unsafe broad values fail
      production boot.
- [ ] `CSRF_ALLOWED_ORIGINS` — the real admin-UI origin(s) if the CMS is
      served from a different host than the API.
- [ ] `PORT=4000` bound on 127.0.0.1 (the proxy talks to it locally; it is
      never public).

Boot check: `journalctl -u lakegroup-backend -n 50 --no-pager` — no
"insecure production configuration" fatal, no TRUST_PROXY warning.

---

## 12. Acceptance sweep (run after EVERY release)

```bash
echo '── processes ──';        ps -o user=,comm= -p "$(pgrep -f 'node src/index.js' | head -1)"
echo '── listeners ──';        ss -tlnp
echo '── firewall ──';         sudo ufw status verbose
echo '── sshd ──';             sudo sshd -T | grep -E 'permitrootlogin|passwordauthentication|pubkeyauthentication'
echo '── postgres ──';         sudo -u postgres psql -c "SELECT name, setting FROM pg_settings WHERE name='listen_addresses';"
echo '── service ──';          systemctl is-active lakegroup-backend && systemctl is-enabled lakegroup-backend
echo '── app health ──';       curl -s http://127.0.0.1:4000/health
echo '── headers ──';          curl -sI https://api.example.com/health | grep -iE 'strict-transport|x-content-type|x-frame|content-security'
```

Every line must print the expected value (listed in the items above). Any
deviation = the release does not ship until fixed.

## Failure → response

| Check | Typical failure | Action |
| --- | --- | --- |
| `listen_addresses` | `0.0.0.0` (DB public) | fix `postgresql.conf` + restart; block 5432 in the firewall |
| service user | `root` in process list | add `User=lakeapp`, restart, re-verify |
| sshd | `permitrootlogin yes` / password auth on | fix `sshd_config`, reload, retest from a second session |
| firewall | 4000/5432 public | remove the allow rule; keep only 80/443 + admin SSH |
| HSTS | header missing over HTTPS | `SESSION_COOKIE_SECURE=true` + restart (TLS at the proxy) |

---

## Audit note (2026-08-11)

Before this checklist, the production runbook
(`docs/PHASE-11-HARDENING-PRODUCTION.md`) covered TLS/HSTS handoff, backups,
migration and rollback but **none** of the Phase 16 criteria explicitly
(non-root user, service manager, firewall, SSH restriction, port hygiene,
private Postgres). This document is the Phase 16 deliverable; the runbook
now points here. Execution remains deployment-site work — the checklist is
the acceptance test for it.
