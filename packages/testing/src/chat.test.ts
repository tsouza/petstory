import { describe, expect, it, vi } from 'vitest';

import { InMemoryChatAdapter, mockChatMessage } from './chat.js';

describe('InMemoryChatAdapter', () => {
  it('appends user echo + assistant reply on sendTurn', async () => {
    const adapter = new InMemoryChatAdapter({ reply: () => 'hi there' });
    await adapter.sendTurn({ petId: 'p1', text: 'hello' });
    const snapshot = adapter.snapshot('p1');
    expect(snapshot).toHaveLength(2);
    expect(snapshot[0]).toMatchObject({ author: 'user', payload: { kind: 'text', text: 'hello' } });
    expect(snapshot[1]).toMatchObject({
      author: 'assistant',
      payload: { kind: 'text', text: 'hi there' },
    });
  });

  it('uses the same turnId for the user echo and assistant reply', async () => {
    const adapter = new InMemoryChatAdapter({ reply: () => 'ok' });
    await adapter.sendTurn({ petId: 'p1', text: 'hello' });
    const [userMsg, assistantMsg] = adapter.snapshot('p1');
    expect(userMsg?.turnId).toBeDefined();
    expect(userMsg?.turnId).toBe(assistantMsg?.turnId);
  });

  it('defaults to an echo reply when no reply fn is given', async () => {
    const adapter = new InMemoryChatAdapter();
    await adapter.sendTurn({ petId: 'p1', text: 'ping' });
    const snapshot = adapter.snapshot('p1');
    expect(snapshot[1]?.payload).toMatchObject({ kind: 'text', text: 'You said: ping' });
  });

  it('supports an async reply function', async () => {
    const adapter = new InMemoryChatAdapter({
      reply: async (t) => `async-${t.text}`,
    });
    await adapter.sendTurn({ petId: 'p1', text: 'x' });
    expect(adapter.snapshot('p1')[1]?.payload).toMatchObject({ text: 'async-x' });
  });

  it('notifies subscribers on every message, including the initial snapshot', async () => {
    const adapter = new InMemoryChatAdapter({ reply: () => 'r' });
    const listener = vi.fn();
    adapter.subscribeMessages('p1', listener);
    // First notify = empty snapshot on subscribe.
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith([]);

    await adapter.sendTurn({ petId: 'p1', text: 'x' });
    // User message + assistant message = two more notifications.
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('stops notifying after unsubscribe', async () => {
    const adapter = new InMemoryChatAdapter({ reply: () => 'r' });
    const listener = vi.fn();
    const unsub = adapter.subscribeMessages('p1', listener);
    unsub();
    await adapter.sendTurn({ petId: 'p1', text: 'x' });
    // Initial snapshot only; no post-unsubscribe calls.
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('isolates messages and subscribers by petId', async () => {
    const adapter = new InMemoryChatAdapter({ reply: () => 'r' });
    const listenerA = vi.fn();
    adapter.subscribeMessages('pet-A', listenerA);
    await adapter.sendTurn({ petId: 'pet-B', text: 'to B' });
    // listenerA only received its initial empty snapshot; no leak from pet-B.
    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(adapter.snapshot('pet-A')).toEqual([]);
    expect(adapter.snapshot('pet-B')).toHaveLength(2);
  });

  it('seed() appends a message and notifies subscribers', () => {
    const adapter = new InMemoryChatAdapter();
    const listener = vi.fn();
    adapter.subscribeMessages('p1', listener);
    adapter.seed('p1', mockChatMessage({ petId: 'p1', author: 'system' }));
    expect(adapter.snapshot('p1')).toHaveLength(1);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('rejects an invalid turn at the schema boundary (R5)', async () => {
    const adapter = new InMemoryChatAdapter();
    await expect(adapter.sendTurn({ petId: '', text: 'x' })).rejects.toThrow();
  });

  it('uses the injected clock and id generator for determinism', async () => {
    let counter = 100;
    const adapter = new InMemoryChatAdapter({
      reply: () => 'r',
      now: () => 42,
      nextId: () => {
        counter += 1;
        return String(counter);
      },
    });
    await adapter.sendTurn({ petId: 'p1', text: 'x' });
    const snapshot = adapter.snapshot('p1');
    expect(snapshot[0]?.createdAt).toBe(42);
    expect(snapshot[1]?.createdAt).toBe(42);
    // Deterministic ids — two per sendTurn (turn + user-id + assistant-id).
    expect(snapshot[0]?.id).toMatch(/^1\d\d$/);
  });
});

describe('mockChatMessage helper', () => {
  it('builds a message with sensible defaults', () => {
    const msg = mockChatMessage();
    expect(msg.author).toBe('assistant');
    expect(msg.payload).toMatchObject({ kind: 'text' });
  });

  it('lets the caller override any field', () => {
    const msg = mockChatMessage({ author: 'user', payload: { kind: 'text', text: 'x' } });
    expect(msg.author).toBe('user');
    expect(msg.payload).toMatchObject({ text: 'x' });
  });
});
