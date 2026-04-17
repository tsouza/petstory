import type { z } from 'zod';
import type { Unsubscribe } from './chat';

// Re-export so kernel consumers can pull both types from a single import site.
export type { Unsubscribe };

/**
 * Storage filter — primitive equality on record fields. Deliberately
 * minimal: richer query DSLs arrive only when a real consumer needs them
 * (R0, R18 rule-of-three).
 */
export type StorageFilter = Readonly<Record<string, string | number | boolean>>;

/** Listener signature — fires with the current snapshot on subscribe and on every mutation. */
export type StorageListener<T> = (records: readonly T[]) => void;

// --- Structured error type -------------------------------------------------

export type StorageError =
  | { readonly kind: 'schema_rejected'; readonly table: string; readonly message: string }
  | { readonly kind: 'conflict'; readonly table: string; readonly message: string }
  | { readonly kind: 'upstream'; readonly message: string };

export class StoragePortError extends Error {
  public readonly detail: StorageError;

  constructor(detail: StorageError) {
    const table = 'table' in detail ? ` [${detail.table}]` : '';
    super(`[StoragePort:${detail.kind}]${table} ${detail.message}`);
    this.name = 'StoragePortError';
    this.detail = detail;
  }
}

// --- Port ------------------------------------------------------------------

/**
 * The kernel's Anti-Corruption Layer for persistence + reactive reads.
 *
 * Adapters (InMemory, Convex, cassette-replay) implement this interface.
 * Packs and the shell receive a `StoragePort` via dependency injection; they
 * never import a concrete adapter directly (ADR-002 boundary rule).
 *
 * Generic over the record shape: every call carries a Zod schema so the
 * port validates at both write and read. No silent schema drift (R5, R15).
 */
export interface StoragePort {
  /**
   * Insert or upsert a record. Throws `StoragePortError` with
   * `kind: 'schema_rejected'` if the record fails the schema.
   */
  put<T>(table: string, record: T, schema: z.ZodType<T>): Promise<void>;

  /**
   * List records matching the filter. Every returned record is
   * schema-validated; invalid rows throw `schema_rejected`.
   */
  list<T>(table: string, filter: StorageFilter, schema: z.ZodType<T>): Promise<readonly T[]>;

  /**
   * Subscribe to reactive updates. The listener fires once immediately with
   * the current snapshot, then on every mutation that affects the filtered
   * set. Returns an `Unsubscribe` to stop receiving updates.
   */
  subscribe<T>(
    table: string,
    filter: StorageFilter,
    schema: z.ZodType<T>,
    listener: StorageListener<T>,
  ): Unsubscribe;
}
