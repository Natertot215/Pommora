import { exactTitle } from '../Paths/caseFold'
import { memberKey } from '../Files/heldKeys'
import { contextTitles, parseContextKey } from './contexts'
import { byKey, type PropertyDefinition } from '../Properties/properties'
import {
  type Frozen,
  encodeValue,
  writtenSpelling,
  isBlankValue,
  reconcilePropertyValue,
} from '../Properties/propertyValue'
import type { ContextGroup, NexusTree, SpaceNode } from '../Nexus/tree'
import { listOf } from '../Contract/validators'

type ResolvedLinks = Map<string, string[]>

export interface ContextWorld {
  groupById: ReadonlyMap<string, ContextGroup>
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
      groups.map((g) => [g.def.id, new Map(g.spaces.map((s) => [exactTitle(s.title), s]))]),
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

export const governedWorld = (
  tree: NexusTree,
  defs: ReadonlyMap<string, PropertyDefinition>,
): GovernedWorld => ({
  contexts: contextWorldOf(tree.contexts),
  defs,
})

// A Space holds any registry property, so its own values reconcile against every definition, by key.
export const spaceWorldOf = (tree: NexusTree): GovernedWorld =>
  governedWorld(tree, byKey(tree.config.registry))

function groupOf(key: string, world: ContextWorld): ContextGroup | undefined {
  const title = parseContextKey(key)
  const id = title === null ? undefined : world.idByTitle.get(title)
  return id === undefined ? undefined : world.groupById.get(id)
}

export function resolveContextKeys(
  root: Record<string, unknown>,
  world: ContextWorld,
): ResolvedLinks {
  const links: ResolvedLinks = new Map()
  for (const [key, raw] of Object.entries(root)) {
    const group = groupOf(key, world)
    if (!group) continue
    const byTitle = world.spacesByTitle.get(group.def.id)
    const ids = contextTitles(raw).flatMap((title) => byTitle?.get(title)?.id ?? [])
    if (ids.length) links.set(group.def.id, ids)
  }
  return links
}

interface Reconciled {
  root: Record<string, unknown>
  changed: string[]
}

type Governor = { def: PropertyDefinition } | { group: ContextGroup }

function governorOf(key: string, world: GovernedWorld): Governor | undefined {
  const def = world.defs.get(key)
  if (def) return { def }
  const group = groupOf(key, world.contexts)
  return group && { group }
}

const memberCount = (v: unknown): number => new Set(listOf(v).map(memberKey)).size

export function reconcileGovernedRoot(
  root: Record<string, unknown>,
  world: GovernedWorld,
  frozen?: Frozen,
  skip?: string,
): Reconciled {
  const out: Record<string, unknown> = {}
  const changed: string[] = []
  for (const [key, raw] of Object.entries(root)) {
    const governor = key === skip ? undefined : governorOf(key, world)
    if (!governor) {
      out[key] = raw
      continue
    }
    let next: unknown
    if ('def' in governor) {
      const reconciled = reconcilePropertyValue(governor.def, raw, frozen)
      if (!isBlankValue(reconciled)) next = encodeValue(reconciled)
    } else {
      const byTitle = world.contexts.spacesByTitle.get(governor.group.def.id)
      const titles = contextTitles(raw).flatMap((title) => byTitle?.get(title)?.title ?? [])
      if (titles.length) next = [...new Set(titles)]
    }
    // A live reconcile never shrinks or blanks a value: one holding a member it can't resolve, or reading as nothing, stays as written, for the user to settle.
    if (!frozen && (next === undefined || memberCount(next) < memberCount(raw))) {
      out[key] = raw
      continue
    }
    if (next === undefined) {
      changed.push(key)
      continue
    }
    out[key] = writtenSpelling(next, raw)
    if (JSON.stringify(out[key]) !== JSON.stringify(raw)) changed.push(key)
  }
  return { root: out, changed }
}
