import {
  type CardPayload,
  CardPayloadSchema,
  type TextCardPayload,
  TextCardPayloadSchema,
} from '@petstory/kernel';
import type { z } from 'zod';

/**
 * A card renderer — takes the validated payload and returns some render
 * artifact (typically a React element). The kernel's chat substrate is
 * generic over the renderer type so the same registry shape can be reused
 * for React, React Native, or non-React consumers (e.g. server-rendered
 * HTML in a test snapshot).
 */
export type CardRenderer<TPayload extends CardPayload, TRendered> = (
  payload: TPayload,
) => TRendered;

/**
 * A registered card — couples a Zod schema (validator for `kind` payloads)
 * with the renderer. Packs register entries to extend the chat surface
 * without modifying kernel/L1 code (R22 — extension slots over direct edits).
 */
export interface CardEntry<TRendered> {
  readonly kind: string;
  readonly schema: z.ZodType<CardPayload>;
  readonly render: CardRenderer<CardPayload, TRendered>;
}

/**
 * Lookup registry for card kinds. The generic parameter is the renderer's
 * return type — `React.ReactNode` at runtime in apps; `string` or
 * `TestDescriptor` in unit tests.
 *
 * Behaviour:
 *  - `register({ kind, schema, render })` — adds an entry. Re-registering
 *    the same kind throws (no silent overwrite — R15).
 *  - `dispatch(payload)` — routes a payload to its registered renderer
 *    after Zod validation. Unknown kinds invoke the caller-supplied
 *    fallback renderer, which is **required** (R15 — no silent default).
 */
export class CardRegistry<TRendered> {
  private readonly entries = new Map<string, CardEntry<TRendered>>();
  private readonly fallback: CardRenderer<CardPayload, TRendered>;

  constructor(fallback: CardRenderer<CardPayload, TRendered>) {
    this.fallback = fallback;
  }

  register(entry: CardEntry<TRendered>): void {
    if (this.entries.has(entry.kind)) {
      throw new Error(
        `[CardRegistry] kind "${entry.kind}" is already registered — re-registration is not allowed`,
      );
    }
    this.entries.set(entry.kind, entry);
  }

  has(kind: string): boolean {
    return this.entries.has(kind);
  }

  kinds(): readonly string[] {
    return Array.from(this.entries.keys());
  }

  /**
   * Validate (via the kernel's open envelope schema) and dispatch to the
   * registered renderer for this kind. If no renderer is registered,
   * calls the fallback with the raw payload.
   */
  dispatch(raw: unknown): TRendered {
    const payload = CardPayloadSchema.parse(raw);
    const entry = this.entries.get(payload.kind);
    if (!entry) return this.fallback(payload);
    const validated = entry.schema.parse(payload);
    return entry.render(validated);
  }
}

/**
 * The built-in `text-card` entry. Every registry consumer can register
 * this to get a free text-rendering path. Renderer is injected by the
 * consumer (React, RN, test harness) — this helper just wires up the
 * kind + schema.
 */
export function textCardEntry<TRendered>(
  render: CardRenderer<TextCardPayload, TRendered>,
): CardEntry<TRendered> {
  return {
    kind: 'text',
    schema: TextCardPayloadSchema,
    render: render as CardRenderer<CardPayload, TRendered>,
  };
}
