// The Contexts registry contract — `.nexus/contexts.json` is the one identity source
// (id, title, singular, icon per Context); member files speak wrapped TITLE keys only.
// The sigil itself lives in `governedKeys`, which both layers read from.
// Pure: no fs, no React — both processes import it.

import { z } from 'zod'
import { isGovernedKey, parseGovernedKey, wrapKey } from './governedKeys'

/** `singular` is the seeded three's only (Areas/Topics/Projects) — set once at registry
 *  creation. Any other Context has none; its Spaces read "New Space". */
export type ContextDef = { id: string; title: string; singular?: string; icon?: string }

/** Array position IS the display order — no ordinal semantics anywhere. */
export type ContextsRegistry = { contexts: ContextDef[] }

export const contextsRegistry: z.ZodType<ContextsRegistry> = z.looseObject({
  contexts: z.array(
    z.looseObject({
      id: z.string().min(1),
      title: z.string().min(1),
      singular: z.string().min(1).optional(),
      icon: z.string().optional(),
    }),
  ),
})

/** A Context title → its frontmatter/JSON root key. */
export function contextKey(title: string): string {
  return wrapKey('context', title)
}

/** A frontmatter/JSON root key the Contexts layer governs when it rewrites a root: a Context-wrapped
 *  key, malformed ones included, so a rewrite still sweeps them. Scoped to the layer — a blind check
 *  would claim the property layer's keys, and a Context and a property may share a name. */
export function isGovernedContextKey(key: string): boolean {
  return isGovernedKey(key, 'context')
}

/** '(Projects)' → 'Projects'. A property key, an unwrapped key, or an empty name → null. */
export function parseContextKey(key: string): string | null {
  const parsed = parseGovernedKey(key)
  return parsed?.layer === 'context' ? parsed.name : null
}

/** The one path-safety core every entity title shares — a name that cannot be a folder or file
 *  basename. Callers add whatever their own layer forbids on top of it. */
export function invalidBasename(name: string): boolean {
  const trimmed = name.trim()
  return (
    !trimmed ||
    name.includes('/') ||
    name.includes('\\') ||
    name.includes('\0') || // a NUL byte throws in fs calls — reject as a clean invalid-name
    trimmed === '.' ||
    trimmed === '..'
  )
}

/** Read-side value coercion before any registry match: an outside write of `- 2024` / `- true`
 *  parses as number/boolean and must still match a Space titled "2024"; NFD input must match
 *  NFC titles. Both sides of every comparison pass through here. */
export function normalizeContextValue(raw: unknown): string {
  return String(raw).trim().toLowerCase().normalize('NFC')
}

/** The fresh-nexus registry: the three seeded Contexts, a minted id each. */
export function seededRegistry(mintId: () => string): ContextsRegistry {
  return {
    contexts: [
      { id: mintId(), title: 'Areas', singular: 'Area' },
      { id: mintId(), title: 'Topics', singular: 'Topic' },
      { id: mintId(), title: 'Projects', singular: 'Project' },
    ],
  }
}

/** The create-entry label for a Context's Spaces. A seeded Context carries a singular
 *  ("New Area"); one the user minted has none to speak for it. */
export function createSpaceLabel(def: ContextDef): string {
  return def.singular ? `New ${def.singular}` : 'New Space'
}
