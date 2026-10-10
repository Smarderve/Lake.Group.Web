# Lake Group self-hosted assistant payload

This directory contains the prebuilt public-content knowledge index and the private local inference payloads (Ollama/Qwen3 for answers and whisper.cpp/Whisper for voice). It is a handoff payload, not website content.

## IIS and packaging boundary

Never expose `ai/runtime/`, `ai/models/`, `ai/config/`, or `ai/speech/` from the IIS public web root. Install the runtime, model store, and knowledge index under an access-controlled application directory outside the public web root. The website may call only the authorized same-origin backend API; browsers must never connect to Ollama or Whisper directly. Include ignored runtime/model folders when preparing the IT ZIP, but never add them to normal Git history. The voice path accepts at most 30 seconds of mono 16 kHz PCM, allows one inference at a time, requires 3 GiB free memory, writes recordings only to a short-lived OS temporary directory, and removes that directory after each job.

The source knowledge index in `knowledge/lake-group-index.json` is generated from approved, published Lake Group website content by `node scripts/build_assistant_kb.js`. Review its provenance and run the generator after controlled website-content publication.

## Local developer run

Use a project-local model directory and loopback-only Ollama listener. These environment variables are process-scoped; do not set them permanently at machine level:

```powershell
$env:OLLAMA_MODELS = (Resolve-Path '.\ai\models').Path
$env:OLLAMA_HOST = '127.0.0.1:11434'
& '.\ai\runtime\ollama\ollama.exe' serve
```

In a second terminal, acquire the exact approved model if it is not already present:

```powershell
$env:OLLAMA_MODELS = (Resolve-Path '.\ai\models').Path
$env:OLLAMA_HOST = '127.0.0.1:11434'
& '.\ai\runtime\ollama\ollama.exe' pull 'qwen3:4b-instruct-2507-q4_K_M'
```

Start the isolated development API after the runtime and model are available (from the repository root; `127.0.0.1:8080` is an example local website origin):

```powershell
$env:PORT = '4001'
$env:LAKE_ASSISTANT_OLLAMA_PORT = '11434'
$env:LAKE_ASSISTANT_ALLOWED_ORIGINS = 'http://127.0.0.1:8080'
$env:NODE_ENV = 'development'
Push-Location .\backend
node .\src\assistant-index.js
Pop-Location
```

The backend uses the fixed approved model name, a 4,096-token context, bounded in-memory sessions, request limits, concurrency controls, timeouts, and same-origin API calls. No paid inference service or cloud model is configured.

## Provenance and licensing

See `config/runtime-manifest.json` for the pinned official Windows x64 Ollama release, archive SHA-256, exact model tag, layer digest, and expected model size. Keep upstream runtime notices in `runtime/ollama/lib/ollama/`. Preserve the Qwen model license and attribution supplied by the official model source alongside the downloaded model metadata.

The offline voice path is pinned in `speech/config/whisper-manifest.json`. It uses the official whisper.cpp v1.9.2 CPU Windows x64 runtime at `speech/runtime/` and the multilingual Whisper Base model at `speech/models/ggml-base.bin`; both handoff directories are ignored by Git. The model and runtime are MIT-licensed; attribution is in `speech/licenses/WHISPER-MODEL-LICENSE.txt` and `speech/licenses/WHISPER-CPP-LICENSE.txt`. Firefox/Chrome `MediaRecorder` audio is normalized in-browser to mono 16 kHz PCM WAV, then uploaded only to the same-origin private API. Whisper runs with automatic language detection, returning the recognized language with the editable transcript; no transcript is ever submitted automatically. English and Kiswahili quality must be tested with actual speech on the target Windows server before rollout.

The bundled model is large and intentionally ignored by Git. It remains on disk for approved ZIP handoff and must not be removed as part of repository cleanup.
