import { z } from 'zod';

// --- Stub registration types ----------------------------------------------
//
// Each of the 10 slots below carries a registration shape. In this PR the
// shapes are structural stubs — enough to type-check the manifest and lock
// the contract. Concrete runtime wiring (compiling flows, composing Convex
// schema, etc.) arrives in later PRs when the first pack actually uses each
// slot (R0 + R18 rule-of-three).
//
// Every slot in `PackManifest` is either a registration (or array thereof)
// or explicit `null`. Never `undefined` — explicit intent beats silent
// defaults (R15).

const NonEmptyStringSchema = z.string().min(1);

export const EventSchemaRegistrationSchema = z.object({
  eventTypes: z
    .array(
      z.object({
        kind: NonEmptyStringSchema,
        piiClass: z.enum(['none', 'behavioral', 'health', 'contact', 'payment']),
      }),
    )
    .min(1),
});
export type EventSchemaRegistration = z.infer<typeof EventSchemaRegistrationSchema>;

export const KnowledgeBaseRegistrationSchema = z.object({
  // Path to the curated KB; format is pack-specific at registration time.
  source: NonEmptyStringSchema,
});
export type KnowledgeBaseRegistration = z.infer<typeof KnowledgeBaseRegistrationSchema>;

export const SkillRegistrationSchema = z.object({
  name: NonEmptyStringSchema,
  // Path to the markdown skill asset.
  source: NonEmptyStringSchema,
});
export type SkillRegistration = z.infer<typeof SkillRegistrationSchema>;

export const McpToolRegistrationSchema = z.object({
  name: NonEmptyStringSchema,
  // Reserved for the tool's input-shape Zod schema once we define it per tool.
  description: NonEmptyStringSchema,
});
export type McpToolRegistration = z.infer<typeof McpToolRegistrationSchema>;

export const CriticRuleRegistrationSchema = z.object({
  name: NonEmptyStringSchema,
  // Hook name it registers into — pack-level.
  hook: NonEmptyStringSchema,
});
export type CriticRuleRegistration = z.infer<typeof CriticRuleRegistrationSchema>;

export const FlowRegistrationSchema = z.object({
  name: NonEmptyStringSchema,
  version: NonEmptyStringSchema,
});
export type FlowRegistration = z.infer<typeof FlowRegistrationSchema>;

export const SituationClassifierRegistrationSchema = z.object({
  // Path to the classifier prompt + rules asset.
  source: NonEmptyStringSchema,
});
export type SituationClassifierRegistration = z.infer<typeof SituationClassifierRegistrationSchema>;

export const CopyBundleRegistrationSchema = z.object({
  // Keyed locale bundles. Runtime lookup shape lands when i18n lands.
  locales: z.array(NonEmptyStringSchema).min(1),
});
export type CopyBundleRegistration = z.infer<typeof CopyBundleRegistrationSchema>;

export const GlossaryRegistrationSchema = z.object({
  source: NonEmptyStringSchema,
});
export type GlossaryRegistration = z.infer<typeof GlossaryRegistrationSchema>;

export const CardRegistrationSchema = z.object({
  kind: NonEmptyStringSchema,
  // Renderer functions are supplied alongside the manifest in the shell —
  // this record just names the kind so the registry lookup matches.
});
export type CardRegistration = z.infer<typeof CardRegistrationSchema>;

// --- Manifest --------------------------------------------------------------

export const PackManifestSchema = z.object({
  name: NonEmptyStringSchema,
  version: NonEmptyStringSchema,
  eventSchema: EventSchemaRegistrationSchema.nullable(),
  knowledgeBase: KnowledgeBaseRegistrationSchema.nullable(),
  skills: z.array(SkillRegistrationSchema).nullable(),
  mcpTools: z.array(McpToolRegistrationSchema).nullable(),
  criticRules: z.array(CriticRuleRegistrationSchema).nullable(),
  flowCatalog: z.array(FlowRegistrationSchema).nullable(),
  situationClassifier: SituationClassifierRegistrationSchema.nullable(),
  copyBundle: CopyBundleRegistrationSchema.nullable(),
  glossary: GlossaryRegistrationSchema.nullable(),
  cards: z.array(CardRegistrationSchema).nullable(),
});
export type PackManifest = z.infer<typeof PackManifestSchema>;

/** Validated manifest — nominal wrapper so consumers know it passed schema. */
export interface ValidatedPackManifest extends PackManifest {
  readonly __validated: true;
}

/**
 * Validate a pack manifest at registration time. Throws with a descriptive
 * message if any slot is malformed; every slot is required (null when
 * unused — no `undefined` accepted, R15).
 */
export function registerPack(manifest: PackManifest): ValidatedPackManifest {
  const parsed = PackManifestSchema.parse(manifest);
  return { ...parsed, __validated: true };
}
