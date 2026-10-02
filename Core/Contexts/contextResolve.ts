import { normalizeTitle } from '../Connections/connections'
import { parseContextKey } from './contexts'
import type { PropertyDefinition } from '../Properties/properties'
import type { Matcher } from '../Properties/pageValue'
import {
  type Adoption,
  type Frozen,
  encodeValue,
  isBlankValue,
  reconcilePropertyValue,
} from '../Properties/propertyValue'
import type { ContextGroup, NexusTree, SpaceNode } from '../Nexus/tree'
import { listOf } from '../Contract/validators'

type ResolvedLinks = Map<string, string[]>

export const namesSpace =
  (title: string): Matcher =>
  (el) =>
    typeof el === 'string' && normalizeTitle(el) === normalizeTitle(title)

export interface ContextWorld {
  groupById: ReadonlyMap<string, ContextGroup>
  /** Keys must match EXACTLY — the coercion classes apply to values only, so a case-drifted key is foreign data, never a link. */
  idByTitle: ReadonlyMap<string, string>
  spacesByTitle: ReadonlyMap<string, ReadonlyMap<string, SpaceNode>>
  spaceById: ReadonlyMap<string, SpaceNode>
}

const worlds = new WeakMap<ContextGroup[], ContextWorld>()

// Held against the groups array it was built from: whatever changes a group's def or a Space's id, title, or path answers a new array, so a world never outlives what it describes.
export function contextWorldOf(groups: ContextGroup[]): ContextWorld {
  const held = worlds.get(groups)
  if (held) return held
  const world: ContextWorld = {
    groupById: new Map(groups.map((g) => [g.def.id, g])),
    idByTitle: new Map(groups.map((g) => [g.def.title, g.def.id])),
    spacesByTitle: new Map(
      groups.map((g) => [g.def.id, new Map(g.spaces.map((s) => [normalizeTitle(s.title), s]))]),
    ),
    spaceById: new Map(groups.flatMap((g) => g.spaces.map((s): [string, SpaceNode] => [s.id, s]))),
  }
  worlds.set(groups, world)
  return world
}

export interface GovernedWorld {
  contexts: ContextWorld
  defs: ReadonlyMap<string, PropertyDefinition>
}

export const NO_DEFS: ReadonlyMap<string, PropertyDefinition> = new Map()

// A Space holds any registry property, so its own values reconcile against every definition, by name.
export const spaceWorldOf = (tree: NexusTree): GovernedWorld => ({
  contexts: contextWorldOf(tree.contexts),
  defs: new Map(tree.config.registry.map((d) => [d.name, d])),
})

export function resolveContextKeys(
  root: Record<string, unknown>,
  world: ContextWorld,
): ResolvedLinks {
  const links: ResolvedLinks = new Map()
  for (const [key, raw] of Object.entries(root)) {
    const title = parseContextKey(key)
    if (title === null || raw == null) continue
    const contextId = world.idByTitle.get(title)
    if (contextId === undefined) continue
    const byTitle = world.spacesByTitle.get(contextId)
    const ids: string[] = []
    for (const value of listOf(raw)) {
      const match = byTitle?.get(normalizeTitle(value))
      if (match) ids.push(match.id)
    }
    if (ids.length) links.set(contextId, ids)
  }
  return links
}

interface Reconciled {
  root: Record<string, unknown>
  changed: string[]
  adoptions: Adoption[]
}

export function reconcileGovernedRoot(
  root: Record<string, unknown>,
  world: GovernedWorld,
  frozen?: Frozen,
): Reconciled {
  const out: Record<string, unknown> = {}
  const changed: string[] = []
  const adoptions: Adoption[] = []
  const moved = (key: string, raw: unknown, next: unknown): void => {
    if (JSON.stringify(next) !== JSON.stringify(raw)) changed.push(key)
    out[key] = next
  }
  for (const [key, raw] of Object.entries(root)) {
    const def = world.defs.get(key)
    if (def) {
      const reconciled = reconcilePropertyValue(def, raw, frozen)
      adoptions.push(...reconciled.adoptions)
      if (isBlankValue(reconciled.value)) changed.push(key)
      else moved(key, raw, encodeValue(reconciled.value))
      continue
    }
    const title = parseContextKey(key)
    const contextId = title === null ? undefined : world.contexts.idByTitle.get(title)
    if (contextId === undefined) {
      out[key] = raw
      continue
    }
    const byTitle = world.contexts.spacesByTitle.get(contextId)
    const repaired: string[] = []
    for (const value of listOf(raw)) {
      const match = byTitle?.get(normalizeTitle(value))
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

const memberCount = (v: unknown): number => (Array.isArray(v) ? v.length : 1)

// A reconcile that can't resolve a Space must never shrink the value it writes: an unresolvable tag is kept as written for the user to settle, never dropped. `original` is the pre-reconcile root; a change that drops members against it is withheld.
export function preservedChanges(
  reconciled: Reconciled,
  original: Record<string, unknown>,
): Record<string, unknown> {
  const surviving = survivingChanges(reconciled)
  for (const key of Object.keys(surviving)) {
    if (memberCount(surviving[key]) < memberCount(original[key])) delete surviving[key]
  }
  return surviving
}
