// Server-side LLM client used from Convex actions.
//
// This is a deliberately small, self-contained OpenAI-compat client — not
// the full LlmPort contract from @petstory/kernel. Reasons:
//  - Convex bundles functions into its own isolate runtime; keeping the
//    server free of workspace imports avoids bundler surprises.
//  - The Stage A wire doesn't need tier routing, cache_control, tool use,
//    or Zod validation — a user message goes in, text comes out.
//  - When Stage C introduces real Anthropic wiring we can revisit (either
//    pull the kernel adapter in or keep inline — R0 wins until proven).
//
// Provider selection (resolved at action call time, not module load, so
// `npx convex env set` works without redeploy):
//  - BITNET_BASE_URL present → call the local bitnet.cpp server. Note:
//    from Convex cloud this only reaches the user's laptop via a tunnel
//    (ngrok etc.). On Convex's OSS local-backend, `http://host.docker.
//    internal:11434` works out of the box.
//  - ANTHROPIC_API_KEY present → (Stage C) real Anthropic call.
//  - Neither → echo fallback so the mid-tier still demos end-to-end.

interface OpenAiChatResponse {
  readonly choices?: ReadonlyArray<{
    readonly message?: { readonly content?: string };
  }>;
}

const DEFAULT_BITNET_MODEL = 'bitnet-b1.58-2B-4T';
const DEFAULT_TIMEOUT_MS = 60_000;

export async function generateReply(userText: string): Promise<string> {
  const bitnetUrl = process.env.BITNET_BASE_URL;
  if (bitnetUrl) {
    return callBitNet(bitnetUrl.replace(/\/$/, ''), userText);
  }
  return `Echo from the Convex mid-tier: "${userText}" (no LLM provider configured — set BITNET_BASE_URL or ANTHROPIC_API_KEY).`;
}

async function callBitNet(baseUrl: string, userText: string): Promise<string> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.BITNET_MODEL ?? DEFAULT_BITNET_MODEL,
        messages: [{ role: 'user', content: userText }],
        max_tokens: 200,
      }),
      signal: abort.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`bitnet ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as OpenAiChatResponse;
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('bitnet returned empty content');
    }
    return content;
  } catch (err) {
    // Fail soft: a laptop running `just dev` without `just bitnet-serve`
    // should still render *something* so the UI loop stays exercisable.
    // Real production (Anthropic adapter) will let errors propagate — the
    // chat screen's error banner already handles that path.
    console.warn('[convex/chat] BitNet request failed, falling back to echo:', err);
    return `(BitNet unreachable — echo fallback) You said: "${userText}"`;
  } finally {
    clearTimeout(timer);
  }
}
