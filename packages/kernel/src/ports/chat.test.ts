import { describe, expect, it } from 'vitest';

import {
  type CardPayload,
  CardPayloadSchema,
  ChatMessageSchema,
  ChatTurnSchema,
  isTextCard,
  TextCardPayloadSchema,
} from '../index.js';

describe('ChatTurnSchema', () => {
  it('accepts a well-formed turn', () => {
    expect(ChatTurnSchema.parse({ petId: 'p1', text: 'hello' })).toEqual({
      petId: 'p1',
      text: 'hello',
    });
  });

  it('rejects empty petId or text (R15 — no silent fallback)', () => {
    expect(() => ChatTurnSchema.parse({ petId: '', text: 'hi' })).toThrow();
    expect(() => ChatTurnSchema.parse({ petId: 'p1', text: '' })).toThrow();
  });
});

describe('TextCardPayloadSchema', () => {
  it('accepts a text card', () => {
    expect(TextCardPayloadSchema.parse({ kind: 'text', text: 'hi!' })).toEqual({
      kind: 'text',
      text: 'hi!',
    });
  });

  it('rejects a non-text kind at the text schema', () => {
    expect(() =>
      TextCardPayloadSchema.parse({ kind: 'meal-card', text: 'x' } as unknown),
    ).toThrow();
  });
});

describe('CardPayloadSchema (open envelope)', () => {
  it('accepts any kind with a kind string (extension slot)', () => {
    const mealCard = { kind: 'meal-card', petName: 'Brutus', when: '08:15' };
    const parsed = CardPayloadSchema.parse(mealCard);
    // passthrough preserves unknown fields so pack-registered renderers can
    // read them after their own Zod pass.
    expect(parsed).toMatchObject(mealCard);
  });

  it('rejects a payload missing `kind`', () => {
    expect(() => CardPayloadSchema.parse({ text: 'no kind here' })).toThrow();
  });
});

describe('isTextCard type guard', () => {
  it('narrows a text payload', () => {
    const p: CardPayload = { kind: 'text', text: 'hi' };
    expect(isTextCard(p)).toBe(true);
  });

  it('returns false for non-text kinds', () => {
    const p: CardPayload = { kind: 'meal-card' };
    expect(isTextCard(p)).toBe(false);
  });

  it('returns false when kind is text but text field is missing', () => {
    // biome-ignore lint/suspicious/noExplicitAny: reason: intentionally malformed to test the guard
    const p = { kind: 'text' } as any;
    expect(isTextCard(p)).toBe(false);
  });
});

describe('ChatMessageSchema', () => {
  it('accepts a fully-formed message', () => {
    const msg = {
      id: 'm1',
      petId: 'p1',
      turnId: 't1',
      author: 'user' as const,
      payload: { kind: 'text', text: 'hi' },
      createdAt: Date.now(),
    };
    expect(ChatMessageSchema.parse(msg)).toMatchObject(msg);
  });

  it('rejects a message with a non-nonnegative createdAt', () => {
    expect(() =>
      ChatMessageSchema.parse({
        id: 'm1',
        petId: 'p1',
        turnId: 't1',
        author: 'user',
        payload: { kind: 'text', text: 'hi' },
        createdAt: -1,
      }),
    ).toThrow();
  });
});
