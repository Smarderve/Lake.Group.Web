# Lake Assistant knowledge refresh

Lake Assistant loads two distinct local indexes: `ai/knowledge/lake-group-index.json` is generated from Lake Group's own public pages; `ai/knowledge/lake-group-external-index.json` contains short, independently written factual summaries from individually approved public sources. The assistant does not browse the internet at answer time. A stored item is not represented as a live check.

## Controlled external-source update

1. Verify the specific company/subsidiary identity, exact claim, publication date, reporting period, primary evidence, limitations, and the source's public-access and reuse terms. Do not copy article prose. The loader only accepts HTTPS records from the explicit host allowlist in `backend/src/lib/assistant-rag.js`; review any new host with Legal/IT before changing that allowlist. Do not add paid APIs, scraping, accounts, credentials, private data, or automatic fetchers.
2. Prepare a JSON record or array with a unique `id`, `entity`, `topic`, `pageTitle`, `sourceTitle`, `sourceUrl`, `publisher`, `publicationDate` (full or partial date, or `null` if the source does not state one), `checkedAt` (ISO date), `entityInSource`, `reportingPeriod`, `limitations`, `sourceClass`, and a short independently written `text`. Set `verification` to `REVIEW`.
3. Stage it without making it retrievable: `node scripts/manage-assistant-external-kb.mjs stage --input <record.json>`. This validates the host and required metadata, computes the text hash, and rejects duplicate IDs/text.
4. Have an authorized reviewer compare the claim with its linked source, check entity attribution and material caveats, and decide whether it can be published. Change only the reviewed record's `verification` to `PUBLISHED`; retain `REVIEW` for disputed, stale, or unsupported claims. The runtime ignores `REVIEW` records. Then run `npm run assistant:external-kb:check` and backend RAG tests.
5. Refresh official pages separately with `npm run build:assistant-kb`. The official website generator does not overwrite the external collection. Review the resulting diffs, duplicate/staleness warnings, source provenance, and answer coverage before publishing. Deploy the source and indexes together.
6. Roll back via the normal reviewed Git revert of the knowledge update. Do not delete older evidence without checking references and maintaining the change history.

The checker detects duplicate IDs, normalized duplicate text, duplicate source-claim pairs, invalid hashes/hosts, and records checked more than 365 days ago. It performs no network requests and does not automatically approve a claim. A reviewer must refresh source verification and `checkedAt`; publication status is an editorial decision, not a machine confidence score.

## Financial evidence policy

Regulator market-share data is scoped to the regulator's geography, product category, measurement, and reporting period. A secondary publication's revenue estimate remains an attributed, unverified press claim unless independently supported by an appropriate audited or primary source. Revenue is not valuation, profit, assets, equity, or market capitalization. Never infer current operations from an old project or permit report. Legal/compliance review is still required for production publication decisions.

## Current collection status

The external collection contains published short summaries from EWURA, Kenya EPRA, and Business Daily Africa. It includes dated Tanzania/Kenya market-share metrics, a regulator supplier profile and CNG application notice, plus clearly caveated secondary reporting on revenue and the Kilifi facility's disputed permit status. These are stored-source summaries checked on 13 October 2026, not a live search feature. The reported revenue has no stated fiscal period, audited basis, methodology, or consolidation scope. The 2025 Kilifi article does not establish current legal/operating status. The collection should be reviewed by Lake Group legal/compliance before production publication.

The official company index currently contains 467 records, covering 18 group companies plus the group, across products, services, locations, history and other published topics. The official index builder now excludes the gallery page and all `figcaption` text; this removed image captions and navigation-like media copy, not the 18-company roster.

## Resource and speech acceptance note

Whisper still uses the existing 3 GiB free-RAM guard, while Qwen warm-up requires 7 GiB and cold inference requires 3 GiB (or a confirmed resident model under the existing policy). During this work, free physical RAM ranged from about 1.1 to 2.1 GiB of 15.67 GiB; neither model was loaded. The existing local website/backend/Ollama services were healthy, but Ollama had no resident model and voice health correctly reported insufficient memory. Progressive transcription currently invokes a new `whisper-cli` process for each short overlapping window and a final pass; process-start cost and peak working set have not been safely measured on this machine. Do not replace this with a persistent model process or change thresholds until IT can profile cold/steady/peak RAM and latency on target hardware. Real Qwen responses and microphone audio must be acceptance-tested on a host with adequate headroom, in Chrome, Firefox, Edge, Safari/Android where supported; automated or mocked tests are not proof of that.
