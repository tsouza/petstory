import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { MockStoragePort } from './storage.js';

const PetSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
});
type Pet = z.infer<typeof PetSchema>;

const EventSchema = z.object({
  id: z.string(),
  petId: z.string(),
  kind: z.string(),
});

describe('MockStoragePort.put + list', () => {
  it('roundtrips a well-formed record', async () => {
    const port = new MockStoragePort();
    await port.put<Pet>('pets', { id: 'p1', name: 'Brutus', ownerId: 'u1' }, PetSchema);
    const result = await port.list<Pet>('pets', { ownerId: 'u1' }, PetSchema);
    expect(result).toEqual([{ id: 'p1', name: 'Brutus', ownerId: 'u1' }]);
  });

  it('rejects a record that fails the schema (R15 — fail loud, not silent)', async () => {
    const port = new MockStoragePort();
    await expect(
      port.put<Pet>('pets', { id: 'p1', name: 'Brutus' } as unknown as Pet, PetSchema),
    ).rejects.toMatchObject({
      name: 'StoragePortError',
      detail: { kind: 'schema_rejected', table: 'pets' },
    });
  });

  it('filter is primitive equality — rows not matching every key are excluded', async () => {
    const port = new MockStoragePort();
    await port.put<Pet>('pets', { id: 'p1', name: 'Brutus', ownerId: 'u1' }, PetSchema);
    await port.put<Pet>('pets', { id: 'p2', name: 'Luna', ownerId: 'u2' }, PetSchema);
    const u1 = await port.list<Pet>('pets', { ownerId: 'u1' }, PetSchema);
    expect(u1).toHaveLength(1);
    expect(u1[0]?.id).toBe('p1');
  });

  it('empty filter returns everything in the table', async () => {
    const port = new MockStoragePort();
    await port.put<Pet>('pets', { id: 'p1', name: 'Brutus', ownerId: 'u1' }, PetSchema);
    await port.put<Pet>('pets', { id: 'p2', name: 'Luna', ownerId: 'u2' }, PetSchema);
    const all = await port.list<Pet>('pets', {}, PetSchema);
    expect(all).toHaveLength(2);
  });

  it('tables are isolated — writing to one does not leak into another', async () => {
    const port = new MockStoragePort();
    await port.put<Pet>('pets', { id: 'p1', name: 'Brutus', ownerId: 'u1' }, PetSchema);
    const events = await port.list('events', {}, EventSchema);
    expect(events).toEqual([]);
  });
});

describe('MockStoragePort.subscribe', () => {
  it('fires immediately with the current snapshot', async () => {
    const port = new MockStoragePort();
    await port.put<Pet>('pets', { id: 'p1', name: 'Brutus', ownerId: 'u1' }, PetSchema);
    const listener = vi.fn();
    port.subscribe('pets', { ownerId: 'u1' }, PetSchema, listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith([{ id: 'p1', name: 'Brutus', ownerId: 'u1' }]);
  });

  it('fires again on every subsequent mutation in the table', async () => {
    const port = new MockStoragePort();
    const listener = vi.fn();
    port.subscribe('pets', {}, PetSchema, listener);
    // Initial empty snapshot.
    expect(listener).toHaveBeenCalledTimes(1);
    await port.put<Pet>('pets', { id: 'p1', name: 'Brutus', ownerId: 'u1' }, PetSchema);
    expect(listener).toHaveBeenCalledTimes(2);
    await port.put<Pet>('pets', { id: 'p2', name: 'Luna', ownerId: 'u2' }, PetSchema);
    expect(listener).toHaveBeenCalledTimes(3);
    // Latest call sees both rows.
    const lastSnapshot = listener.mock.calls.at(-1)?.[0];
    expect(lastSnapshot).toHaveLength(2);
  });

  it('filters the notification — only rows matching the filter are surfaced', async () => {
    const port = new MockStoragePort();
    const listener = vi.fn();
    port.subscribe('pets', { ownerId: 'u1' }, PetSchema, listener);
    await port.put<Pet>('pets', { id: 'p1', name: 'Brutus', ownerId: 'u1' }, PetSchema);
    await port.put<Pet>('pets', { id: 'p2', name: 'Luna', ownerId: 'u2' }, PetSchema);
    // Last snapshot only contains Brutus — Luna belongs to a different owner.
    const last = listener.mock.calls.at(-1)?.[0];
    expect(last).toHaveLength(1);
    expect(last[0].id).toBe('p1');
  });

  it('unsubscribe stops notifications', async () => {
    const port = new MockStoragePort();
    const listener = vi.fn();
    const unsub = port.subscribe('pets', {}, PetSchema, listener);
    unsub();
    await port.put<Pet>('pets', { id: 'p1', name: 'Brutus', ownerId: 'u1' }, PetSchema);
    // Only the initial empty-snapshot call.
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('multiple subscribers on the same table each receive their own filtered view', async () => {
    const port = new MockStoragePort();
    const u1Listener = vi.fn();
    const u2Listener = vi.fn();
    port.subscribe('pets', { ownerId: 'u1' }, PetSchema, u1Listener);
    port.subscribe('pets', { ownerId: 'u2' }, PetSchema, u2Listener);
    await port.put<Pet>('pets', { id: 'p1', name: 'Brutus', ownerId: 'u1' }, PetSchema);
    expect(u1Listener.mock.calls.at(-1)?.[0]).toHaveLength(1);
    expect(u2Listener.mock.calls.at(-1)?.[0]).toHaveLength(0);
  });
});

describe('MockStoragePort.reset', () => {
  it('drops rows and silences subscribers', async () => {
    const port = new MockStoragePort();
    const listener = vi.fn();
    port.subscribe('pets', {}, PetSchema, listener);
    await port.put<Pet>('pets', { id: 'p1', name: 'Brutus', ownerId: 'u1' }, PetSchema);
    port.reset();
    expect(await port.list<Pet>('pets', {}, PetSchema)).toEqual([]);
    // After reset, new puts don't notify the (dropped) listener.
    const callsBefore = listener.mock.calls.length;
    await port.put<Pet>('pets', { id: 'p2', name: 'Luna', ownerId: 'u2' }, PetSchema);
    expect(listener.mock.calls.length).toBe(callsBefore);
  });
});
