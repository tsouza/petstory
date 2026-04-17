import { describe, expect, it } from 'vitest';

import {
  type CardPayload,
  CardPayloadSchema,
  ChatMessageSchema,
  ChatTurnSchema,
  generateEventId,
  generateMessageId,
  generateTurnId,
  isTextCard,
  TextCardPayloadSchema,
} from '../index';

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

describe('ID helpers', () => {
  const UUID_SHAPE = /^(turn|msg|evt)_[0-9a-f-]{36}$/;

  it('generateTurnId returns a turn_-prefixed uuid', () => {
    const id = generateTurnId();
    expect(id).toMatch(/^turn_[0-9a-f-]{36}$/);
    expect(id).toMatch(UUID_SHAPE);
  });

  it('generateMessageId returns a msg_-prefixed uuid', () => {
    expect(generateMessageId()).toMatch(/^msg_[0-9a-f-]{36}$/);
  });

  it('generateEventId returns an evt_-prefixed uuid', () => {
    expect(generateEventId()).toMatch(/^evt_[0-9a-f-]{36}$/);
  });

  it('produces unique ids across 1000 calls (no collisions)', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i += 1) ids.add(generateTurnId());
    expect(ids.size).toBe(1000);
  });

  it('each helper uses its own prefix — prefixes never collide', () => {
    const t = generateTurnId();
    const m = generateMessageId();
    const e = generateEventId();
    expect(t.startsWith('turn_')).toBe(true);
    expect(m.startsWith('msg_')).toBe(true);
    expect(e.startsWith('evt_')).toBe(true);
  });
});
