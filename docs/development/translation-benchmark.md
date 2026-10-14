# Translation benchmark runbook

Status: **pending**. No model has been downloaded or benchmarked. Run this only on approved hardware with adequate free RAM and disk; do not run it on the current development PC.

## Candidate checkpoints (not approved selections)

- [`google/madlad400-3b-mt`](https://huggingface.co/google/madlad400-3b-mt) — candidate snapshot `fa184c675da0b5c9e1c8694fccd4e12e2d422094` (HF repository HEAD metadata checked 2026-10-14; no model files downloaded). The current model card labels this 3B checkpoint Apache-2.0, lists 419 languages, reports an 11.8 GB original weight file and shows the Transformers path requires `transformers`, `accelerate`, and `sentencepiece`. The card also notes research usage, domain limitations, and that quality varies by language. This revision is an identified benchmark candidate, not an approved selection. Before any staging download, IT must re-resolve and verify this commit, exact filenames, per-file SHA-256, license file/card snapshot, and the exact pinned runtime dependency lock with machine-readable license inventory. Reject floating `main` as a benchmark identifier.
- [`facebook/m2m100_418M`](https://huggingface.co/facebook/m2m100_418M) — candidate snapshot `55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636` (HF model API metadata checked 2026-10-14; no model files downloaded). The current model card labels this checkpoint MIT, lists 101 languages and a 3.88 GB repository. The repository currently includes a PyTorch `.bin` weight file that Hugging Face identifies as using pickle imports; do not load it with unrestricted pickle deserialization. The runtime owner must either approve a documented safe format/runtime from a pinned revision or reject this candidate. Verify actual files and SHA-256, license texts, and a pinned dependency lock plus license inventory before benchmarking.

Model-card license labels are preliminary inventory evidence, not legal sign-off. License review must cover the exact weight revision, tokenizer/vocabulary, conversion/quantization artifact, runtime, native libraries and every transitive dependency. Capture source URL, retrieval date, immutable revision, file hashes and license texts in the benchmark record. Do not use third-party converted or quantized copies unless Lake Group IT separately approves their exact artifact and license.

Do not infer translation quality from license or language coverage. These are candidates, not a selection.

## Benchmark procedure

1. Record host CPU/GPU and driver, VRAM, total/free RAM, disk before/after download, OS build, runtime versions, model repository plus full immutable commit SHA, exact checkpoint files and hashes, dependency lockfile/SBOM and each license text. The full weight set must fit a dedicated staging volume with room for cache, conversion, logs and rollback copy; derive free-space and memory gates from actual approved host measurements rather than a guessed universal requirement.
2. Use an approved, non-private sample set spanning short UI labels, corporate paragraphs, manufacturing, petroleum, construction, logistics, legal/policy wording, dates, statistics, named entities and complex grammar. Include a glossary and protected facts.
3. Produce outputs for `sw`, `hi`, `ar`, `zh`, `fr`, `es` and `pt`; save raw outputs and timing/resource measurements without modifying production dictionaries. Warm the model before timing and record cold-start/load time, peak working set/private bytes, peak GPU memory, CPU/GPU utilization, throughput (source characters and words per second), and p50/p95 latency for short and long segments. Include idle and post-run measurements and monitor existing Qwen3/Whisper service responsiveness.
4. Score meaning, grammar, fluency, terminology, context, names, factual integrity, completeness and consistency with qualified reviewers for each language. Automated checks are screening evidence only.
5. Report per-language results, failures, reviewer methodology, resource use, exact checkpoint/dependency/license evidence, and unresolved risks. Review every language independently with a qualified human reviewer; an aggregate score cannot hide a failing language. Do not select a model until Lake Group IT and content owners review the evidence.

Benchmark output must remain separate from published translation assets until it passes review and the publishing policy is approved.

## Machine-readable benchmark handoff

Use `scripts/.generated/i18n-translation-manifest.json` from a normal build as the source corpus inventory. It contains English candidates and hashes only, not simulated or generated translations. Import it only into a migrated isolated/server database with `npm run translation:import-hardcoded -- <manifest>` from `backend/`. Capture the host inventory from `deployment/windows/translation/verify-translation-server.ps1`; model download, conversion, checkpoint selection and inference are intentionally outside this development workstation workflow. Compare outputs with a versioned glossary, record per-language human review and numerical/name/placeholder screening, and leave every output in review state until approval.

The worker adapter protocol and deployment shell do not establish compatibility with Transformers, CTranslate2, MADLAD, M2M100, quantization, or a specific model checkpoint. IT must supply and review an adapter executable that implements the documented JSON stdio contract, pass the full benchmark, confirm exact weight/runtime license obligations, and approve activation. No checkpoint is selected or benchmarked here.
