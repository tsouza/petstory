# BitNet — local LLM for integration testing

## Why this exists

The product talks to Claude Haiku via `AnthropicLlmAdapter` (ADR-001). Every integration test that exercises the chat loop would hit the real API — nontrivial cost per CI run, network dependency, non-determinism. `BitNetLlmAdapter` is a **third implementation of `LlmPort`** that calls a local bitnet.cpp server over OpenAI-compatible HTTP. Zero cost, offline, reproducible-enough for tests.

**Not for production.** A 2B-class 1-bit model lags Haiku meaningfully on PT-BR nuance and tool-calling fidelity. The adapter exists so integration tests can exercise the full pipeline without burning API budget, and so we can later pilot a privacy-first on-device story from a known baseline.

## What we're running

Microsoft's bitnet.cpp — inference runtime for the b1.58 1-bit architecture, [github.com/microsoft/BitNet](https://github.com/microsoft/BitNet).

- **Model:** `microsoft/bitnet-b1.58-2B-4T` (2B params, 4T training tokens, 1.58-bit from scratch)
- **Memory:** ~0.4 GB
- **Expected throughput on a laptop i7 with AVX2:** ~15–30 tok/s
- **First-token latency:** ~1–3s cold, ~200ms warm
- **Server:** OpenAI-compatible HTTP on `127.0.0.1:8080` (configurable)

## First-time setup

Prereqs on the host:

- `clang` ≥ 18
- `cmake` ≥ 3.22
- `python` ≥ 3.9 with `pip`
- ~2 GB free disk for the model + build artifacts

Then:

```
just bitnet-install
```

This clones bitnet.cpp into `vendor/bitnet/BitNet`, runs its `setup_env.py` to build the llama.cpp fork with BitNet kernels, and downloads the b1.58-2B-4T model quantized with `i2_s` (the production kernel on x86).

Idempotent — rerun to pick up upstream fixes.

## Running it

```
just bitnet-serve         # starts on 127.0.0.1:8080
just bitnet-ping          # smoke test — expect "hi" back within a few seconds
```

## Wiring into tests (when we actually do)

```ts
import { BitNetLlmAdapter } from '@petstory/kernel';

const llm = new BitNetLlmAdapter({
  baseUrl: 'http://127.0.0.1:8080',
  model: 'bitnet-b1.58-2B-4T',
});

// Drop-in for any code that accepts LlmPort.
const { content } = await llm.complete({
  tier: 'haiku',
  messages: [{ role: 'user', content: 'Extract {food, time} from: "Brutus comeu ração às 8h"' }],
  maxTokens: 200,
});
```

The adapter's `tier` field is advisory — BitNet ships one model; every request uses whatever `model` the server is configured with. Cache hints are ignored (OpenAI-compat has no prompt caching).

## What NOT to use this for

- **Production inference.** Haiku via `AnthropicLlmAdapter` remains the product default.
- **Flow unit tests.** Those already use `MockLlmAdapter` with scripted responses — deterministic, instant, no external process.
- **Tool-calling benchmarks.** 2B models are flaky on strict JSON schema fidelity. Expect ≥80% happy-path success; budget for retries and wider assertions in any test that depends on BitNet output structure.

## Known rough edges

- **Port collisions.** If `8080` is taken (Metro dev server parks there under some configs), pass a different port: `just bitnet-serve 8085` and set `baseUrl` to match.
- **Cold starts.** First request after boot takes several seconds while the model weights page in. Subsequent requests are fast. Tests that time out under 5s will flake on cold starts; use `timeoutMs: 15_000` for the first request.
- **PT-BR quality.** The 2B model was trained on predominantly English tokens. Simple PT-BR phrases work; idiomatic Portuguese is hit-or-miss. Tests should use straightforward phrasing.
- **No streaming.** The current `LlmPort` contract is request/response; `BitNetLlmAdapter` matches. Adding streaming is a cross-cutting port change — revisit when a UI consumer actually needs it.
