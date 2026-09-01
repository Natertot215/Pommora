import type { ContextsRegistry } from './contexts'
import { normalizeContextValue, parseContextKey } from './contexts'
import type { SpaceNode } from './types'

export type ResolvedLinks = Map<string, string[]>

/** Keys must match EXACTLY — the coercion classes apply to values only, so a case-drifted
 *  key is foreign data, never a link. */
function idsByExactTitle(registry: ContextsRegistry): Map<string, string> {
  const m = new Map<string, string>()
  for (const c of registry.contexts) m.set(c.title, c.id)
  return m
}

function spacesByTitle(spaces: SpaceNode[] | undefined): Map<string, SpaceNode> {
  const m = new Map<string, SpaceNode>()
  for (const s of spaces ?? []) m.set(normalizeContextValue(s.title), s)
  return m
}

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

/** A coercion-only near-miss (case/whitespace/NFC/scalar) repairs to the canonical Space
 *  title; a genuinely unknown value drops, and an emptied key drops with it (no empties). */
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
