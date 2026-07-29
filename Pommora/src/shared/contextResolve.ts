// Pure context-link resolution + reconcile over an entity's raw root keys — the one
// read/repair seam every consumer shares (walk assembly, governed writes, migration).
// No fs, no React; the registry and space lists arrive as arguments.

import type { ContextsRegistry } from './contexts'
import { normalizeContextValue, parseContextKey } from './contexts'
import type { SpaceNode } from './types'

/** contextId → the member's resolved Space ids. */
export type ResolvedLinks = Map<string, string[]>

/** Registry title → its ContextDef id. Keys must match EXACTLY (the coercion classes
 *  apply to values only) — a case-drifted key is foreign data, never a link. */
function idsByExactTitle(registry: ContextsRegistry): Map<string, string> {
  const m = new Map<string, string>()
  for (const c of registry.contexts) m.set(c.title, c.id)
  return m
}

/** Space title (coerced) → the SpaceNode, per Context. */
function spacesByTitle(spaces: SpaceNode[] | undefined): Map<string, SpaceNode> {
  const m = new Map<string, SpaceNode>()
  for (const s of spaces ?? []) m.set(normalizeContextValue(s.title), s)
  return m
}

/** Resolve an entity root's bracketed keys to registered links only: the key must
 *  exact-match a registry Context title (after the bracket parse) and each value a Space
 *  title in that Context through the shared value coercion. Anything else never
 *  registers (inert-on-read). */
export function resolveContextKeys(
  root: Record<string, unknown>,
  registry: ContextsRegistry,
  spacesByContext: Map<string, SpaceNode[]>,
): ResolvedLinks {
  const links: ResolvedLinks = new Map()
  const contextIds = idsByExactTitle(registry)
  for (const [key, raw] of Object.entries(root)) {
    const title = parseContextKey(key)
    if (title === null || !Array.isArray(raw)) continue
    const contextId = contextIds.get(title)
    if (contextId === undefined) continue
    const byTitle = spacesByTitle(spacesByContext.get(contextId))
    const ids: string[] = []
    for (const value of raw) {
      const match = byTitle.get(normalizeContextValue(value))
      if (match) ids.push(match.id)
    }
    if (ids.length) links.set(contextId, ids)
  }
  return links
}

/** Per-value repair for a root about to be rewritten anyway: a coercion-only near-miss
 *  (case/whitespace/NFC/scalar) repairs to the canonical Space title, a genuinely unknown
 *  value drops, and a key left empty drops with it (no empties). Unknown bracketed keys
 *  and non-context keys pass through verbatim — this never guesses. */
export function reconcileContextKeys(
  root: Record<string, unknown>,
  registry: ContextsRegistry,
  spacesByContext: Map<string, SpaceNode[]>,
): { root: Record<string, unknown>; changed: boolean } {
  const out: Record<string, unknown> = {}
  const contextIds = idsByExactTitle(registry)
  let changed = false
  for (const [key, raw] of Object.entries(root)) {
    const title = parseContextKey(key)
    const contextId = title !== null ? contextIds.get(title) : undefined
    if (contextId === undefined || !Array.isArray(raw)) {
      out[key] = raw
      continue
    }
    const byTitle = spacesByTitle(spacesByContext.get(contextId))
    const repaired: string[] = []
    for (const value of raw) {
      const match = byTitle.get(normalizeContextValue(value))
      if (!match) {
        changed = true
        continue
      }
      if (value !== match.title) changed = true
      repaired.push(match.title)
    }
    if (repaired.length) out[key] = repaired
    else changed = true
  }
  return { root: out, changed }
}
