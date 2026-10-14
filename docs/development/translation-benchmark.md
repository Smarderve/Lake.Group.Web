# Translation benchmark runbook

Status: **pending**. No model has been downloaded or benchmarked. Run this only on approved hardware with adequate free RAM and disk; do not run it on the current development PC.

## Candidate checkpoints

- [`google/madlad400-3b-mt`](https://huggingface.co/google/madlad400-3b-mt) — the current model card reports Apache-2.0 and 419 languages. This is license metadata only; the exact revision, files, dependencies, resource profile and quality still require review before use.
- [`facebook/m2m100_418M`](https://huggingface.co/facebook/m2m100_418M) — the current model card reports MIT and 101 languages. The model repository lists approximately 3.88 GB of weights; verify the exact revision, dependencies and runtime memory before use.

Do not infer translation quality from license or language coverage. These are candidates, not a selection.

## Benchmark procedure

1. Record host CPU/GPU, VRAM/RAM, disk, OS, driver/runtime, model commit SHA, dependency lockfile and license texts.
2. Use an approved, non-private sample set spanning short UI labels, corporate paragraphs, manufacturing, petroleum, construction, logistics, legal/policy wording, dates, statistics, named entities and complex grammar. Include a glossary and protected facts.
3. Produce outputs for `sw`, `hi`, `ar`, `zh`, `fr`, `es` and `pt`; save raw outputs and timing/resource measurements without modifying production dictionaries.
4. Score meaning, grammar, fluency, terminology, context, names, factual integrity, completeness and consistency with qualified reviewers for each language. Automated checks are screening evidence only.
5. Report per-language results, failures, reviewer methodology, resource use, model/dependency licenses, and unresolved risks. Do not select a model until the evidence is reviewed.

Benchmark output must remain separate from published translation assets until it passes review and the publishing policy is approved.

## Machine-readable benchmark handoff

Use `scripts/.generated/i18n-translation-manifest.json` from a normal build as the source corpus inventory. It contains English candidates and hashes only, not simulated or generated translations. Import it only into a migrated isolated/server database with `npm run translation:import-hardcoded -- <manifest>` from `backend/`. Capture the host inventory from `deployment/windows/translation/verify-translation-server.ps1`; model download, conversion, checkpoint selection and inference are intentionally outside this development workstation workflow. Compare outputs with a versioned glossary, record per-language human review and numerical/name/placeholder screening, and leave every output in review state until approval.

The worker adapter protocol and deployment shell do not establish compatibility with Transformers, CTranslate2, MADLAD, M2M100, quantization, or a specific model checkpoint. IT must supply and review an adapter executable that implements the documented JSON stdio contract, pass the full benchmark, confirm exact weight/runtime license obligations, and approve activation. No checkpoint is selected or benchmarked here.
