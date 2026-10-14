# Private translation worker handoff

This package prepares a separate startup scheduled task named `LakeGroupTranslation` under LocalService. It does not modify IIS, Qwen, Whisper, forms, firewall rules, PostgreSQL data, or public routing. The worker has no public HTTP listener. It reads durable CMS and hardcoded translation jobs, but remains idle until an IT-approved local executable and private model directory are configured. The executable contract is one JSON request on stdin and one JSON object containing `translation` and `modelVersion` on stdout; stderr is discarded and text is never logged. The exact model/runtime protocol adapter remains an IT integration item until a candidate is selected and benchmarked.

## Install and validate

1. Run `verify-translation-server.ps1` elevated with the intended private model path and inspect RAM, CPU, disk, related service inventory, and blockers. It does not infer GPU readiness or database readiness.
2. Prepare the backend payload with the approved Node runtime and locked dependencies in an IT staging area. Do not put it under IIS public root.
3. Back up PostgreSQL and follow `docs/development/translation-migration-safety.md`; migration execution is a separate controlled step, not part of install.
4. Run `install-translation-service.ps1`. It refuses an existing task and grants LocalService read-only application access and log write access. Inject runtime DB credentials using the approved machine secret/environment mechanism; never commit them.
5. Review the exact model checkpoint, license, conversion/runtime chain, and benchmark on approved server hardware. Configure only after approval with `configure-translation-engine.ps1 -ApprovedByIT`.
6. Import hardcoded jobs with `npm run translation:import-hardcoded -- <manifest>` only after database migration. CMS saves enqueue revision-bound jobs directly.
7. Start the scheduled task manually for supervised verification, then inspect `verify-translation-service.ps1`. Translation results remain review-only and no locale becomes visitor-selectable from this worker.

`rollback-translation-service.ps1` removes only the task. `uninstall-translation-service.ps1` retains all private files by default; database translations and memory are never deleted. This kit is source-prepared, not server-tested. Resource telemetry on Windows reports RAM/disk and CPU load percent from CIM; the Node worker fails closed on missing model path, insufficient free RAM, or an unset engine executable. GPU, existing service utilization, DB credentials/connectivity, and full process memory ceilings require IT-specific verification. The generic process adapter does not claim MADLAD, M2M100, CTranslate2, or quantization compatibility.
