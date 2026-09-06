import type { ContextsRegistry } from './contexts'
import { normalizeTitle } from '../Connections/connections'
import { parseContextKey } from './contexts'
import type { PropertyDefinition } from './properties'
import { type Adoption, encodeValue, isBlankValue, reconcilePropertyValue } from './propertyValue'
import type { SpaceNode } from '../Nexus/tree'

export type ResolvedLinks = Map<string, string[]>

const listOf = (raw: unknown): unknown[] => (Array.isArray(raw) ? raw : [raw])

export interface GovernedWorld {
  registry: ContextsRegistry | null
  spacesByContext: Map<string, SpaceNode[]>
  defs: ReadonlyMap<string, PropertyDefinition>
}

export const NO_DEFS: ReadonlyMap<string, PropertyDefinition> = new Map()

/** Keys must match EXACTLY — the coercion classes apply to values only, so a case-drifted key is foreign data, never a link. */
function idsByExactTitle(registry: ContextsRegistry): Map<string, string> {
  const m = new Map<string, string>()
  for (const c of registry.contexts) m.set(c.title, c.id)
  return m
}

function spacesByTitle(spaces: SpaceNode[] | undefined): Map<string, SpaceNode> {
  const m = new Map<string, SpaceNode>()
  for (const s of spaces ?? []) m.set(normalizeTitle(s.title), s)
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
    if (title === null || raw == null) continue
    const contextId = contextIds.get(title)
    if (contextId === undefined) continue
    const byTitle = spacesByTitle(spacesByContext.get(contextId))
    const ids: string[] = []
    for (const value of listOf(raw)) {
      const match = byTitle.get(normalizeTitle(value))
      if (match) ids.push(match.id)
    }
    if (ids.length) links.set(contextId, ids)
  }
  return links
}

export interface Reconciled {
  root: Record<string, unknown>
  changed: string[]
  adoptions: Adoption[]
}

export function reconcileGovernedRoot(
  root: Record<string, unknown>,
  world: GovernedWorld,
  adopt = true,
): Reconciled {
  const out: Record<string, unknown> = {}
  const changed: string[] = []
  const adoptions: Adoption[] = []
  const contextIds = world.registry ? idsByExactTitle(world.registry) : null
  const moved = (key: string, raw: unknown, next: unknown): void => {
    if (JSON.stringify(next) !== JSON.stringify(raw)) changed.push(key)
    out[key] = next
  }
  for (const [key, raw] of Object.entries(root)) {
    const def = world.defs.get(key)
    if (def) {
      const reconciled = reconcilePropertyValue(def, raw, adopt)
      adoptions.push(...reconciled.adoptions)
      if (isBlankValue(reconciled.value)) changed.push(key)
      else moved(key, raw, encodeValue(reconciled.value))
      continue
    }
    const title = parseContextKey(key)
    const contextId = title !== null && contextIds ? contextIds.get(title) : undefined
    if (contextId === undefined) {
      out[key] = raw
      continue
    }
    const byTitle = spacesByTitle(world.spacesByContext.get(contextId))
    const repaired: string[] = []
    for (const value of listOf(raw)) {
      const match = byTitle.get(normalizeTitle(value))
      if (match) repaired.push(match.title)
    }
    if (repaired.length) moved(key, raw, repaired)
    else changed.push(key)
  }
  return { root: out, changed, adoptions }
}

export function survivingChanges({ root, changed }: Reconciled): Record<string, unknown> {
  return Object.fromEntries(changed.filter((k) => k in root).map((k) => [k, root[k]]))
}
