# Lake Assistant: Windows/IIS handoff

This package keeps the Ollama runtime, model store, and RAG index private. Do **not** use the extracted repository as the IIS public webroot and do not copy `ai/` or `backend/` into a public web directory. The installer copies the private payload to `%ProgramData%\Lake Group\Assistant` (or an explicitly selected private path); only the existing website and the narrow `/api/assistant/*` rewrite remain public.

## Prerequisites and install

An administrator must approve and run the installation on the intended Windows host. The current installer requires 64-bit AMD64 Windows Server 2016+, at least 12 GiB visible RAM with 4 GiB currently available, four logical CPU cores, 8 GiB free installation-disk space, Node.js 22.6+, IIS URL Rewrite, IIS ARR with proxying already enabled, an existing IIS site `web.config`, and free loopback ports. If 11434 is busy, it isolates Ollama on the first free port from 11435–11449; the backend defaults to port 4001 (or a selected port). Same-origin requests are checked against explicit HTTPS origins from the site's host-bound IIS bindings. If the site only has wildcard bindings, supply IT-approved origins with `-PublicOrigins 'https://www.lakeoilgroup.com','https://lakeoilgroup.com'`. It checks the bundled runtime/model/index, disjoint private and public paths, and index hashes before copying. It refuses to enable ARR, replace secrets, or stop a process occupying a port. CPU/GPU and OS inventory is written to the private install report; the real inference gate checks runtime compatibility, while the initial supported configuration is CPU inference.

The private assistant API runs as a dedicated process and does not read or copy the Contact/Careers backend's environment file, connect to its database, or start its CMS/release workers. Run from an elevated PowerShell prompt in the extracted package:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\deployment\windows\Install-LakeAssistant.ps1 -IisSiteName 'Lake Group'
```

The two managed startup entries are Windows Scheduled Tasks running as LocalService, not SCM Windows services. They start at boot, restart on task failure, and bind Ollama and the private Node API to loopback only. The backend trusts exactly one reverse-proxy hop because IIS is the sole public path to the loopback-bound API; do not expose the backend port on another interface or place another proxy layer in front without revisiting this trust setting. LocalService can write only the private model and log directories; administrators and SYSTEM retain full control. A rerun is refused if either managed task already exists; verify the current install or run the scoped rollback before reinstalling, so an upgrade cannot silently replace a working startup configuration. Review the install report and logs under the private installation path.

## Verification and rollback

Once the site is reachable through its configured HTTPS origin, run:

```powershell
.\deployment\windows\Verify-LakeAssistant.ps1 -InstallRoot "$env:ProgramData\Lake Group\Assistant" -WebsiteBaseUrl 'https://www.lakeoilgroup.com/'
```

The verifier checks the pinned runtime, loopback listener, exact model tag, knowledge provenance/hashes, task state, and a four-message same-origin conversation, recording response timings and host CPU/RAM. A passing conversation demonstrates inference and follow-up behavior; GPU utilization, restart-after-reboot, clean-machine ZIP extraction, and production-server compatibility must be marked NOT TESTED unless IT separately observes them. The installer requires the local model health endpoint before it reports installed; it never asserts that model availability alone proves a successful conversation.

To remove only Lake Assistant routing/tasks, leaving the private model/runtime and all other IIS settings intact:

```powershell
.\deployment\windows\Rollback-LakeAssistant.ps1 -IisSiteName 'Lake Group'
```

The script backs up the current `web.config` before removing its one named Lake Assistant rule. Private payload is intentionally retained for recovery; IT may archive/delete it later after confirming no task remains and applying its own retention policy. Inspect each generated PASS/FAIL/NOT TESTED result and the raw logs; do not treat this package as production-ready until it has passed on the authorized target host.
