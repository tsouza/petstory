import { z } from 'zod';

// Model tier — the kernel speaks tiers, not raw model IDs.
// Adapters map tier → concrete provider model ID.
export const ModelTierSchema = z.enum(['haiku', 'sonnet', 'opus']);
export type ModelTier = z.infer<typeof ModelTierSchema>;

export const LlmMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});
export type LlmMessage = z.infer<typeof LlmMessageSchema>;

// Cache directive — tells the adapter which parts of the prompt
// to mark as ephemeral cache breakpoints. No-op on adapters that
// don't support prompt caching.
export const CacheControlSchema = z.object({
  system: z.boolean().default(false),
  lastMessage: z.boolean().default(false),
});
export type CacheControl = z.infer<typeof CacheControlSchema>;

export const LlmRequestMetadataSchema = z.object({
  flow: z.string().optional(),
  node: z.string().optional(),
  pack: z.string().optional(),
  correlationId: z.string().optional(),
});
export type LlmRequestMetadata = z.infer<typeof LlmRequestMetadataSchema>;

export const LlmRequestSchema = z.object({
  tier: ModelTierSchema,
  system: z.string().optional(),
  messages: z.array(LlmMessageSchema).min(1),
  maxTokens: z.number().int().positive().max(8192).default(1024),
  temperature: z.number().min(0).max(1).optional(),
  cache: CacheControlSchema.optional(),
  metadata: LlmRequestMetadataSchema.optional(),
});
export type LlmRequest = z.infer<typeof LlmRequestSchema>;

export const LlmUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheCreationInputTokens: z.number().int().nonnegative().optional(),
  cacheReadInputTokens: z.number().int().nonnegative().optional(),
});
export type LlmUsage = z.infer<typeof LlmUsageSchema>;

export const LlmStopReasonSchema = z.enum(['end_turn', 'max_tokens', 'stop_sequence', 'tool_use']);
export type LlmStopReason = z.infer<typeof LlmStopReasonSchema>;

export const LlmResponseSchema = z.object({
  content: z.string(),
  stopReason: LlmStopReasonSchema,
  usage: LlmUsageSchema,
  model: z.string(),
});
export type LlmResponse = z.infer<typeof LlmResponseSchema>;

// Structured error type — discriminated union so callers can branch
// cleanly. No silent fallbacks: every error kind surfaces.
export type LlmError =
  | { readonly kind: 'rate_limit'; readonly retryAfterMs?: number; readonly message: string }
  | { readonly kind: 'auth'; readonly message: string }
  | { readonly kind: 'upstream'; readonly statusCode: number; readonly message: string }
  | { readonly kind: 'timeout'; readonly elapsedMs: number; readonly message: string }
  | { readonly kind: 'invalid_response'; readonly message: string };

export class LlmPortError extends Error {
  public readonly detail: LlmError;

  constructor(detail: LlmError) {
    super(`[LlmPort:${detail.kind}] ${detail.message}`);
    this.name = 'LlmPortError';
    this.detail = detail;
  }
}

/**
 * The kernel's Anti-Corruption Layer for LLM providers.
 * Adapters (Anthropic, Mock, future Cassette) implement this interface.
 * Consumers receive an `LlmPort` instance via dependency injection — they
 * never import a concrete adapter directly.
 */
export interface LlmPort {
  complete(request: LlmRequest): Promise<LlmResponse>;
}
