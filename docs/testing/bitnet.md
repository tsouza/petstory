# BitNet — local LLM for integration testing

## Why this exists

The product talks to Claude Haiku via `AnthropicLlmAdapter` (ADR-001). Every integration test that exercises the chat loop would hit the real API — nontrivial cost per CI run, network dependency, non-determinism. `BitNetLlmAdapter` is a **third implementation of `LlmPort`** that calls a local bitnet.cpp server over OpenAI-compatible HTTP. Zero cost, offline, reproducible-enough for tests.

**Not for production.** A 2B-class 1-bit model lags Haiku meaningfully on PT-BR nuance and tool-calling fidelity. The adapter exists so integration tests can exercise the full pipeline without burning API budget, and so we can later pilot a privacy-first on-device story from a known baseline.

## How we run it

**Docker, using Microsoft's official image.** The container ships `bitnet.cpp` + the `b1.58-2B-4T` GGUF model pre-baked and serves OpenAI-compatible HTTP on port `11434`. No local C++ build, no clang/cmake/python venv gymnastics.

```
just bitnet-install     # docker pull the image (~1.2 GB, once)
just bitnet-serve       # start container on 127.0.0.1:11434
just bitnet-ping        # smoke test: POST "say hi in 3 words", expect a short reply
just bitnet-logs        # tail llama-server logs
just bitnet-stop        # stop the container
```

Image: `mcr.microsoft.com/appsvc/docs/sidecars/sample-experiment:bitnet-b1.58-2b-4t-gguf` — shipped by Microsoft for Azure App Service's "BitNet as a sidecar" pattern. Repurposed here for local dev.

## Expected performance on a mid-range laptop CPU

- **Model:** b1.58-2B-4T (2B params, 4T training tokens, 1.58-bit from scratch)
- **Memory:** ~0.4 GB resident
- **First-token latency:** ~1–3s cold, ~200ms warm
- **Throughput on an i7-10510U (AVX2):** ~15–30 tok/s

## Wiring into tests

```ts
import { BitNetLlmAdapter } from '@petstory/kernel';

const llm = new BitNetLlmAdapter({
  // baseUrl defaults to http://127.0.0.1:11434 — matches `just bitnet-serve`.
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

- **Port collision with Ollama.** `11434` is Ollama's default too. Pass a different port: `just bitnet-serve 11435` and set the adapter's `baseUrl` to match.
- **Cold starts.** First request after container boot takes several seconds while the model weights page in. Subsequent requests are fast. Tests that time out under 5s will flake on cold starts; use `timeoutMs: 15_000` for the first request.
- **PT-BR quality.** The 2B model was trained on predominantly English tokens. Simple PT-BR phrases work; idiomatic Portuguese is hit-or-miss. Tests should use straightforward phrasing.
- **No streaming.** The current `LlmPort` contract is request/response; `BitNetLlmAdapter` matches. Adding streaming is a cross-cutting port change — revisit when a UI consumer actually needs it.

## Native-build escape hatch (currently broken upstream)

For anyone who wants to hack on bitnet.cpp itself (rather than just consume it), `scripts/bitnet/preflight.sh` installs the full native toolchain (`clang-18`, `cmake`, `python` + venv, `git`) via `apt` or `brew` and `just bitnet-native-preflight` runs the checks. Building from source currently hits a const-correctness bug in `src/ggml-bitnet-mad.cpp` that clang-18 refuses (`cannot initialize 'int8_t *' from 'const int8_t *'`). Upstream issue, not ours — the Docker path avoids it entirely.
