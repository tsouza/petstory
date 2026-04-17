import { describe, expect, it } from 'vitest';

import { DomainEventSchema, EVENTS_TABLE, PiiClassSchema } from './events';

describe('DomainEventSchema', () => {
  it('accepts a minimal well-formed event', () => {
    const evt = {
      id: 'evt_1',
      petId: 'pet_1',
      eventType: 'MealLogged',
      payload: { amount: '1 cup' },
      piiClass: 'health' as const,
      emittedAt: Date.now(),
    };
    expect(DomainEventSchema.parse(evt)).toMatchObject(evt);
  });

  it('accepts sourceTurnId when provided', () => {
    const evt = {
      id: 'evt_1',
      petId: 'pet_1',
      eventType: 'MealLogged',
      payload: null,
      piiClass: 'none' as const,
      emittedAt: 0,
      sourceTurnId: 'turn_abc',
    };
    const parsed = DomainEventSchema.parse(evt);
    expect(parsed.sourceTurnId).toBe('turn_abc');
  });

  it('rejects an empty eventType (R15 — explicit, not silent)', () => {
    expect(() =>
      DomainEventSchema.parse({
        id: 'evt_1',
        petId: 'pet_1',
        eventType: '',
        payload: null,
        piiClass: 'none',
        emittedAt: 0,
      }),
    ).toThrow();
  });

  it('rejects an unknown piiClass (closed enum)', () => {
    expect(() =>
      DomainEventSchema.parse({
        id: 'evt_1',
        petId: 'pet_1',
        eventType: 'MealLogged',
        payload: null,
        piiClass: 'PHI',
        emittedAt: 0,
      }),
    ).toThrow();
  });

  it('rejects a negative emittedAt', () => {
    expect(() =>
      DomainEventSchema.parse({
        id: 'evt_1',
        petId: 'pet_1',
        eventType: 'MealLogged',
        payload: null,
        piiClass: 'none',
        emittedAt: -1,
      }),
    ).toThrow();
  });
});

describe('PiiClassSchema', () => {
  it('enumerates exactly the five classes', () => {
    expect(PiiClassSchema.options).toEqual(['none', 'behavioral', 'health', 'contact', 'payment']);
  });
});

describe('EVENTS_TABLE', () => {
  it('is the canonical events-table name', () => {
    expect(EVENTS_TABLE).toBe('events');
  });
});
