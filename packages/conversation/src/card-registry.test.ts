import type { CardPayload, TextCardPayload } from '@petstory/kernel';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { CardRegistry, textCardEntry } from './card-registry';

// Tests use `string` as the rendered type — simpler than React for pure
// logic verification. Apps swap in `React.ReactNode` at consumption time.
// `TContext` defaults to `void` in these tests (no context needed).

describe('CardRegistry', () => {
  it('dispatches a registered kind through its renderer', () => {
    const registry = new CardRegistry<string>(() => 'fallback');
    registry.register(textCardEntry<void, string>((p: TextCardPayload) => `text:${p.text}`));
    expect(registry.dispatch({ kind: 'text', text: 'hi' }, undefined)).toBe('text:hi');
  });

  it('passes the context to every renderer', () => {
    type Ctx = { who: string };
    const registry = new CardRegistry<string, Ctx>(() => 'fallback');
    registry.register(textCardEntry<Ctx, string>((p, ctx) => `${ctx.who}:${p.text}`));
    expect(registry.dispatch({ kind: 'text', text: 'hi' }, { who: 'user' })).toBe('user:hi');
    expect(registry.dispatch({ kind: 'text', text: 'hi' }, { who: 'asst' })).toBe('asst:hi');
  });

  it('calls the fallback for an unregistered kind (R15 — explicit, not silent)', () => {
    const fallback = vi.fn((p: CardPayload) => `fallback:${p.kind}`);
    const registry = new CardRegistry<string>(fallback);
    const result = registry.dispatch({ kind: 'meal-card', petName: 'Brutus' }, undefined);
    expect(result).toBe('fallback:meal-card');
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('refuses to re-register an existing kind (R15 — no silent overwrite)', () => {
    const registry = new CardRegistry<string>(() => 'fb');
    registry.register(textCardEntry<void, string>(() => 'a'));
    expect(() => registry.register(textCardEntry<void, string>(() => 'b'))).toThrow(
      /already registered/,
    );
  });

  it('has() reports registration state; kinds() returns the registered set', () => {
    const registry = new CardRegistry<string>(() => 'fb');
    expect(registry.has('text')).toBe(false);
    expect(registry.kinds()).toEqual([]);
    registry.register(textCardEntry<void, string>(() => 'x'));
    expect(registry.has('text')).toBe(true);
    expect(registry.kinds()).toEqual(['text']);
  });

  it('enforces per-kind payload schemas (R5 — validate at every boundary)', () => {
    const mealSchema = z.object({
      kind: z.literal('meal-card'),
      petName: z.string().min(1),
      when: z.string().regex(/^\d{2}:\d{2}$/),
    });
    type MealPayload = z.infer<typeof mealSchema>;
    const registry = new CardRegistry<string>(() => 'fb');
    registry.register({
      kind: 'meal-card',
      schema: mealSchema,
      render: (p) => `meal:${(p as MealPayload).petName}@${(p as MealPayload).when}`,
    });

    // well-formed
    expect(
      registry.dispatch({ kind: 'meal-card', petName: 'Brutus', when: '08:15' }, undefined),
    ).toBe('meal:Brutus@08:15');

    // bad `when` format — kind-specific schema rejects, kernel envelope would accept
    expect(() =>
      registry.dispatch({ kind: 'meal-card', petName: 'Brutus', when: '8am' }, undefined),
    ).toThrow();
  });

  it('rejects a payload missing the kind field at the envelope (kernel schema)', () => {
    const registry = new CardRegistry<string>(() => 'fb');
    expect(() => registry.dispatch({ text: 'no kind' } as unknown, undefined)).toThrow();
  });
});

describe('textCardEntry', () => {
  it('wires up kind=text with the kernel TextCardPayloadSchema', () => {
    const registry = new CardRegistry<string>(() => 'fb');
    registry.register(textCardEntry<void, string>((p) => `bubble:${p.text}`));
    expect(registry.dispatch({ kind: 'text', text: 'yo' }, undefined)).toBe('bubble:yo');
  });

  it('rejects non-text kinds for the text renderer path', () => {
    const registry = new CardRegistry<string>(() => 'fb');
    registry.register(textCardEntry<void, string>((p) => p.text));
    // With the text renderer, a meal-card payload falls through to the fallback
    // because its kind is not `text` — dispatch matches on kind.
    const r = registry.dispatch({ kind: 'meal-card', petName: 'x', when: '08:15' }, undefined);
    expect(r).toBe('fb');
  });
});
