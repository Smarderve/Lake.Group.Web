# Lake Assistant: Windows/IIS handoff

This package keeps the Ollama runtime, model store, and RAG index private. Do **not** use the extracted repository as the IIS public webroot and do not copy `ai/` or `backend/` into a public web directory. The installer copies the private payload to `%ProgramData%\Lake Group\Assistant` (or an explicitly selected private path); only the existing website and the narrow `/api/assistant/*` rewrite remain public.

## Prerequisites and install

Lake Group IT must supply an approved Windows Server host and IIS site name, the final HTTPS website binding/certificate, an administrator install session, machine-wide Node.js 22.6+, IIS URL Rewrite and ARR with proxying enabled, four logical CPU cores, at least 12 GiB RAM with 4 GiB free for installation, and at least 8 GiB free on the private application volume. The host also needs approved npm registry access during installation because the installer runs `npm ci`; inference and transcription themselves use only local Qwen3/Whisper and require no AI API egress. If server egress is prohibited, IT must provide a vetted offline npm dependency bundle or internal registry before install. The script requires free loopback ports and refuses to stop any process occupying them. It installs the private payload under `%ProgramData%\Lake Group\Assistant` (or a separately approved path), outside the IIS public root.

If port 11434 is occupied, the installer selects the first free loopback port from 11435–11449; the backend defaults to port 4001 (or an explicitly selected port). Same-origin requests are checked against explicit HTTPS origins from the site's host-bound IIS bindings. If the site only has wildcard bindings, supply IT-approved origins with `-PublicOrigins 'https://www.lakeoilgroup.com','https://lakeoilgroup.com'`. It verifies runtime/model/index manifests, payload hashes and private/public path separation before copying. It refuses to enable ARR, replace secrets, or stop any process occupying a port. CPU/GPU and OS inventory is written to the private install report; inference is verified with a grounded local Qwen response, and installation now fails closed unless the private Whisper health/memory check is also ready.

The private assistant API runs as a dedicated process and does not read or copy the Contact/Careers backend's environment file, connect to its database, or start its CMS/release workers. Run from an elevated PowerShell prompt in the extracted package:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\deployment\windows\Install-LakeAssistant.ps1 -IisSiteName 'Lake Group'
```

The two managed startup entries are Windows Scheduled Tasks running as LocalService (not SCM Windows Services). They start at boot and are configured to restart after task failure up to five times, one minute apart. Both Ollama and the private Node API bind only to loopback; IIS URL Rewrite/ARR proxies only `/api/assistant/*`. Ollama and Whisper ports must never be opened in Windows Firewall or published by another proxy. The backend trusts exactly one reverse-proxy hop because IIS is its sole public path. LocalService receives read access to the private payload and write access only to its model-store and log directories; Administrators and SYSTEM retain full control. Logs are in `%ProgramData%\Lake Group\Assistant\logs` (`ollama.stdout.log`, `ollama.stderr.log`, `backend.stdout.log`, `backend.stderr.log`).

Use the installed manager for controlled, ordered operation; it verifies task ownership and waits for loopback listeners to close rather than force-killing a process:

```powershell
$manager = "$env:ProgramData\Lake Group\Assistant\scripts\Manage-LakeAssistant.ps1"
& $manager -Action Status
& $manager -Action Stop       # backend first, then Ollama
& $manager -Action Start      # waits for Qwen, API health, then Whisper readiness
& $manager -Action Restart
```

A rerun of the installer is refused if either managed task already exists; use the manager and verifier first. If a task fails, inspect `Get-ScheduledTaskInfo -TaskName LakeAssistant-Backend` and `Get-ScheduledTaskInfo -TaskName LakeAssistant-Ollama`, then review the matching logs. If a loopback port remains open after Stop, do not kill by process name: identify the listener PID and confirm its executable/command line before involving IT. The private install report records the selected ports and host prerequisites.

## Verification and rollback

Once the site is reachable through its configured HTTPS origin, run:

```powershell
.\deployment\windows\Verify-LakeAssistant.ps1 -InstallRoot "$env:ProgramData\Lake Group\Assistant" -WebsiteBaseUrl 'https://www.lakeoilgroup.com/'
```

The verifier checks the pinned runtime, loopback-only Ollama and backend listeners, exact model tag, knowledge provenance/hashes, startup task state, same-origin Whisper health/memory readiness, and multi-turn same-origin conversations, recording response timings and host CPU/RAM. It does not fabricate an audio sample: IT must use an actual microphone in Firefox, Chrome, and Edge to validate `Record → Pause → Continue → Stop → Transcribe → Edit → Send`, including that stopping or transcript completion never auto-sends. GPU utilization, restart-after-reboot, clean-machine ZIP extraction and production-server compatibility are NOT TESTED until IT observes them on the approved host. The installer verifies a grounded Qwen answer and Whisper health, but a passing health check alone is not proof of speech recognition quality.

To remove only Lake Assistant routing/tasks, leaving the private model/runtime and all other IIS settings intact:

```powershell
.\deployment\windows\Rollback-LakeAssistant.ps1 -IisSiteName 'Lake Group'
```

The script backs up the current `web.config` before removing its one named Lake Assistant rule. Private payload is intentionally retained for recovery; IT may archive/delete it later after confirming no task remains and applying its own retention policy. Include the Git-ignored `ai/models`, `ai/runtime/ollama`, `ai/speech/models` and `ai/speech/runtime` directories in the handoff ZIP; a `git archive` alone omits them. Their manifests and hashes are checked by the installer. Keep the extracted package and `%ProgramData%` payload outside the IIS web root, and publish only the approved static website files. Inspect each generated PASS/FAIL/NOT TESTED result; do not claim production readiness until IT has passed on the authorized target host.
