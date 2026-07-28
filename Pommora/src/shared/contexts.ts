// The Contexts registry contract — `.nexus/contexts.json` is the one identity source
// (id, title, singular, icon per Context); member files speak bracketed TITLE keys only.
// Pure: no fs, no React — both processes import it.

import { z } from 'zod'
import type { NexusLabels } from './types'

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

/** A Context title → its bracketed frontmatter/JSON root key. Always written quoted on disk
 *  (unquoted `[…]:` parses as a YAML flow-sequence complex key and never registers). */
export function contextKey(title: string): string {
  return `[${title}]`
}

/** A frontmatter/JSON root key the Contexts layer governs when it rewrites a root: any
 *  bracketed key — malformed ones included, so a rewrite still sweeps them. */
export function isGovernedContextKey(key: string): boolean {
  return key.startsWith('[')
}

/** '[Projects]' → 'Projects'; anything unbracketed, empty, or with interior brackets → null. */
export function parseContextKey(key: string): string | null {
  if (key.length < 3 || !key.startsWith('[') || !key.endsWith(']')) return null
  const inner = key.slice(1, -1)
  return inner.includes('[') || inner.includes(']') ? null : inner
}

/** Context titles follow the shared file-basename rules (titles name folders under
 *  `.nexus/contexts/`) plus the bracket ban — brackets are the key sigil (registry-side
 *  enforcement only; Page/Space titles may still contain them). */
export function invalidContextTitle(title: string): boolean {
  const trimmed = title.trim()
  return (
    !trimmed ||
    title.includes('[') ||
    title.includes(']') ||
    title.includes('/') ||
    title.includes('\\') ||
    title.includes('\0') ||
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

/** The fresh-nexus registry: titles from the three LabelPairs' plurals, singulars from their
 *  singular halves, a minted id each. Colliding custom plurals disambiguate ("Title 2") —
 *  titles are nexus-wide identity, so two entries can never share one. */
export function seededRegistry(labels: NexusLabels, mintId: () => string): ContextsRegistry {
  const pairs = [labels.area, labels.topic, labels.project]
  const taken = new Set<string>()
  return {
    contexts: pairs.map((pair) => {
      let title = pair.plural
      for (let n = 2; taken.has(title); n++) title = `${pair.plural} ${n}`
      taken.add(title)
      return { id: mintId(), title, singular: pair.singular }
    }),
  }
}

/** The create-entry label for a Context's Spaces. A seeded Context carries the singular its
 *  label pair gave it ("New Area"); one the user minted has none to speak for it. */
export function createSpaceLabel(def: ContextDef): string {
  return def.singular ? `New ${def.singular}` : 'New Space'
}
