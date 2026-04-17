import {
  type StorageFilter,
  type StorageListener,
  type StoragePort,
  StoragePortError,
  type Unsubscribe,
} from '@petstory/kernel';
import type { z } from 'zod';

/**
 * In-memory implementation of `StoragePort`. Backed by a per-table `Map`
 * keyed by an internal row id; filtering is linear equality scan.
 *
 * Suitable for:
 *  - Dev-mode builds before Convex is wired (F2 of the chat substrate).
 *  - Unit tests over pack code that emits Domain Events.
 *
 * The adapter validates records via the caller-supplied Zod schema on put
 * and on every listener notification — matching the real Convex adapter's
 * discipline so tests surface schema bugs before production does.
 */
export class MockStoragePort implements StoragePort {
  private readonly rows = new Map<string, unknown[]>();
  private readonly listeners = new Map<string, Set<MockSubscription>>();

  async put<T>(table: string, record: T, schema: z.ZodType<T>): Promise<void> {
    const parsed = this.parseOrThrow(table, schema, record);
    const existing = this.rows.get(table) ?? [];
    const next = [...existing, parsed];
    this.rows.set(table, next);
    this.notify(table);
  }

  async list<T>(table: string, filter: StorageFilter, schema: z.ZodType<T>): Promise<readonly T[]> {
    return this.query(table, filter, schema);
  }

  subscribe<T>(
    table: string,
    filter: StorageFilter,
    schema: z.ZodType<T>,
    listener: StorageListener<T>,
  ): Unsubscribe {
    const subscription: MockSubscription = {
      filter,
      schema,
      listener: listener as StorageListener<unknown>,
    };
    if (!this.listeners.has(table)) this.listeners.set(table, new Set());
    this.listeners.get(table)?.add(subscription);
    // Fire immediately with the current snapshot.
    listener(this.query(table, filter, schema));
    return () => {
      this.listeners.get(table)?.delete(subscription);
    };
  }

  /** Test-only: drop every row + subscriber. */
  reset(): void {
    this.rows.clear();
    this.listeners.clear();
  }

  private parseOrThrow<T>(table: string, schema: z.ZodType<T>, record: unknown): T {
    const result = schema.safeParse(record);
    if (!result.success) {
      throw new StoragePortError({
        kind: 'schema_rejected',
        table,
        message: result.error.message,
      });
    }
    return result.data;
  }

  private query<T>(table: string, filter: StorageFilter, schema: z.ZodType<T>): readonly T[] {
    const rows = this.rows.get(table) ?? [];
    const filtered = rows.filter((row) => matches(row, filter));
    // Re-validate on read per R15 — schema drift between write and read
    // should fail loud, not silent.
    return filtered.map((row) => this.parseOrThrow(table, schema, row));
  }

  private notify(table: string): void {
    const subscribers = this.listeners.get(table);
    if (!subscribers) return;
    for (const sub of subscribers) {
      const snapshot = this.query(table, sub.filter, sub.schema);
      sub.listener(snapshot);
    }
  }
}

interface MockSubscription {
  readonly filter: StorageFilter;
  readonly schema: z.ZodType<unknown>;
  readonly listener: StorageListener<unknown>;
}

function matches(row: unknown, filter: StorageFilter): boolean {
  if (typeof row !== 'object' || row === null) return false;
  const rec = row as Record<string, unknown>;
  for (const [key, value] of Object.entries(filter)) {
    if (rec[key] !== value) return false;
  }
  return true;
}
