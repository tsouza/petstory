import {
  type CardPayload,
  CardPayloadSchema,
  type TextCardPayload,
  TextCardPayloadSchema,
} from '@petstory/kernel';
import type { z } from 'zod';

/**
 * A card renderer — takes the validated payload and a caller-supplied
 * context and returns some render artifact (typically a React element).
 *
 * The context is registry-wide: every entry in a given registry sees the
 * same `TContext` type. Use it for things renderers can't read from the
 * payload alone — e.g. the message's author (so a text bubble knows
 * whether to draw itself in the user or assistant variant).
 *
 * `TContext` defaults to `void` for registries that don't need one.
 */
export type CardRenderer<TPayload extends CardPayload, TContext, TRendered> = (
  payload: TPayload,
  context: TContext,
) => TRendered;

/**
 * A registered card — couples a Zod schema with the renderer. Packs
 * register entries to extend the chat surface without modifying
 * kernel/L1 code (R22 — extension slots over direct edits).
 */
export interface CardEntry<TContext, TRendered> {
  readonly kind: string;
  readonly schema: z.ZodType<CardPayload>;
  readonly render: CardRenderer<CardPayload, TContext, TRendered>;
}

/**
 * Lookup registry for card kinds. Generic over:
 *  - `TRendered` — the renderer's return type (React.ReactNode in apps,
 *    string in pure-logic tests).
 *  - `TContext` — shared state every renderer receives alongside its
 *    payload (defaults to `void` when unused).
 *
 * Behaviour:
 *  - `register({ kind, schema, render })` — adds an entry. Re-registering
 *    the same kind throws (R15 — no silent overwrite).
 *  - `dispatch(payload, context)` — routes to the registered renderer
 *    after Zod validation. Unknown kinds invoke the caller-supplied
 *    fallback, which is **required** (R15 — no silent default).
 */
export class CardRegistry<TRendered, TContext = void> {
  private readonly entries = new Map<string, CardEntry<TContext, TRendered>>();
  private readonly fallback: CardRenderer<CardPayload, TContext, TRendered>;

  constructor(fallback: CardRenderer<CardPayload, TContext, TRendered>) {
    this.fallback = fallback;
  }

  register(entry: CardEntry<TContext, TRendered>): void {
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

  dispatch(raw: unknown, context: TContext): TRendered {
    const payload = CardPayloadSchema.parse(raw);
    const entry = this.entries.get(payload.kind);
    if (!entry) return this.fallback(payload, context);
    const validated = entry.schema.parse(payload);
    return entry.render(validated, context);
  }
}

/**
 * The built-in `text-card` entry. Every registry consumer can register
 * this to get a free text-rendering path. Renderer is injected by the
 * consumer (React, RN, test harness) — this helper just wires up the
 * kind + schema.
 */
export function textCardEntry<TContext, TRendered>(
  render: CardRenderer<TextCardPayload, TContext, TRendered>,
): CardEntry<TContext, TRendered> {
  return {
    kind: 'text',
    schema: TextCardPayloadSchema,
    render: render as CardRenderer<CardPayload, TContext, TRendered>,
  };
}
