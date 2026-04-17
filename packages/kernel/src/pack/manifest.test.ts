import { describe, expect, it } from 'vitest';

import { type PackManifest, PackManifestSchema, registerPack } from './manifest';

const allNullManifest = (): PackManifest => ({
  name: 'pet-health',
  version: '0.0.0',
  eventSchema: null,
  knowledgeBase: null,
  skills: null,
  mcpTools: null,
  criticRules: null,
  flowCatalog: null,
  situationClassifier: null,
  copyBundle: null,
  glossary: null,
  cards: null,
});

describe('PackManifestSchema', () => {
  it('accepts a manifest with every slot explicit-null (R0 — unused slots are declared)', () => {
    expect(PackManifestSchema.parse(allNullManifest())).toMatchObject({ name: 'pet-health' });
  });

  it('accepts a manifest with some slots populated', () => {
    const m: PackManifest = {
      ...allNullManifest(),
      eventSchema: {
        eventTypes: [{ kind: 'MealLogged', piiClass: 'health' }],
      },
      cards: [{ kind: 'meal-card' }],
    };
    const parsed = PackManifestSchema.parse(m);
    expect(parsed.eventSchema?.eventTypes[0]?.kind).toBe('MealLogged');
    expect(parsed.cards?.[0]?.kind).toBe('meal-card');
  });

  it('rejects a manifest with a missing slot (R15 — must be explicit null, not undefined)', () => {
    const m: Partial<PackManifest> = { ...allNullManifest() };
    delete m.cards;
    expect(() => PackManifestSchema.parse(m)).toThrow();
  });

  it('rejects an empty name', () => {
    expect(() => PackManifestSchema.parse({ ...allNullManifest(), name: '' })).toThrow();
  });

  it('rejects an unknown piiClass on an event registration', () => {
    expect(() =>
      PackManifestSchema.parse({
        ...allNullManifest(),
        eventSchema: {
          eventTypes: [{ kind: 'MealLogged', piiClass: 'unknown' }],
        },
      }),
    ).toThrow();
  });

  it('rejects an empty eventTypes array (at-least-one per pack)', () => {
    expect(() =>
      PackManifestSchema.parse({
        ...allNullManifest(),
        eventSchema: { eventTypes: [] },
      }),
    ).toThrow();
  });
});

describe('registerPack', () => {
  it('returns a ValidatedPackManifest brand on success', () => {
    const m = allNullManifest();
    const validated = registerPack(m);
    expect(validated.__validated).toBe(true);
    expect(validated.name).toBe(m.name);
  });

  it('throws on a malformed manifest — reject at the boundary (R5)', () => {
    expect(() => registerPack({ ...allNullManifest(), name: '' })).toThrow();
  });
});
