import { z } from 'zod';

// --- PII classification ----------------------------------------------------
//
// Every Domain Event declares what class of data it carries. Log redactors,
// Convex schema tags, and Sentry `beforeSend` hooks read this field to
// decide whether to redact, hash, or drop the payload. This is R8 (security
// baseline) operationalized at the event level — threaded through every
// event the pack emits, not siloed in the security rule.

export const PiiClassSchema = z.enum(['none', 'behavioral', 'health', 'contact', 'payment']);
export type PiiClass = z.infer<typeof PiiClassSchema>;

// --- Domain event envelope -------------------------------------------------
//
// Brand-neutral envelope. Packs emit subtypes (`MealLogged`,
// `SymptomObserved`, `MedicationAdministered` for pet-health) by registering
// kind-specific payload schemas via their PackManifest's `eventSchema` slot.
// Persisted via StoragePort in the `events` table; the diary screen reads
// projections over this same log.

export const DomainEventSchema = z.object({
  id: z.string().min(1),
  petId: z.string().min(1),
  eventType: z.string().min(1),
  payload: z.unknown(),
  piiClass: PiiClassSchema,
  emittedAt: z.number().int().nonnegative(),
  // Chat turn that produced this event, if any. Absent for events
  // emitted by scheduled functions, imports, or cross-pack hooks.
  sourceTurnId: z.string().optional(),
});
export type DomainEvent<TPayload = unknown> = Omit<z.infer<typeof DomainEventSchema>, 'payload'> & {
  readonly payload: TPayload;
};

/** The Convex table name every pack writes events into. Single canonical log. */
export const EVENTS_TABLE = 'events';
