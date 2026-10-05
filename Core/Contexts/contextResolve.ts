import { foldKey, normalizeTitle } from '../Paths/caseFold'
import { heldKey, heldValue, writeTarget } from '../Files/heldKeys'
import { contextKey, parseContextKey } from './contexts'
import { byFoldedName, holdsList, type PropertyDefinition } from '../Properties/properties'
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
  /** Keyed by folded title. */
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
    idByTitle: new Map(groups.map((g) => [foldKey(g.def.title), g.def.id])),
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
  /** Keyed by folded name. */
  defs: ReadonlyMap<string, PropertyDefinition>
}

export const governedWorld = (
  tree: NexusTree,
  defs: ReadonlyMap<string, PropertyDefinition>,
): GovernedWorld => ({
  contexts: contextWorldOf(tree.contexts),
  defs,
})

// A Space holds any registry property, so its own values reconcile against every definition, by name.
export const spaceWorldOf = (tree: NexusTree): GovernedWorld =>
  governedWorld(tree, byFoldedName(tree.config.registry))

function groupOf(key: string, world: ContextWorld): ContextGroup | undefined {
  const title = parseContextKey(key)
  const id = title === null ? undefined : world.idByTitle.get(foldKey(title))
  return id === undefined ? undefined : world.groupById.get(id)
}

export function resolveContextKeys(
  root: Record<string, unknown>,
  world: ContextWorld,
): ResolvedLinks {
  const links: ResolvedLinks = new Map()
  for (const key of Object.keys(root)) {
    const group = groupOf(key, world)
    if (!group) continue
    const name = contextKey(group.def.title)
    if (heldKey(root, name) !== key) continue
    const byTitle = world.spacesByTitle.get(group.def.id)
    const ids: string[] = []
    for (const value of listOf(heldValue(root, name, true) ?? [])) {
      const match = byTitle?.get(normalizeTitle(value))
      if (match) ids.push(match.id)
    }
    if (ids.length) links.set(group.def.id, ids)
  }
  return links
}

interface Reconciled {
  root: Record<string, unknown>
  changed: string[]
}

type Governor = { name: string; def: PropertyDefinition } | { name: string; group: ContextGroup }

function governorOf(key: string, world: GovernedWorld): Governor | undefined {
  const def = world.defs.get(foldKey(key))
  if (def) return { name: def.name, def }
  const group = groupOf(key, world.contexts)
  return group && { name: contextKey(group.def.title), group }
}

const joins = (governor: Governor): boolean => 'group' in governor || holdsList(governor.def)

/** Whether a read of `name` joins its spellings: a Context key's or a list-holding property's does. */
export function joinsSpellings(name: string, world: GovernedWorld): boolean {
  const governor = governorOf(name, world)
  return governor !== undefined && joins(governor)
}

const memberCount = (v: unknown): number => new Set(listOf(v).map(normalizeTitle)).size

// A governed name reconciles once, under the key `heldKey` reads: a list's spellings join it under the registered spelling and leave once that key is written, while a scalar's other spellings pass through as foreign, for a write to settle. A key in `skip` passes through verbatim.
export function reconcileGovernedRoot(
  root: Record<string, unknown>,
  world: GovernedWorld,
  frozen?: Frozen,
  skip: readonly string[] = [],
): Reconciled {
  const out: Record<string, unknown> = {}
  const changed: string[] = []
  const retired = new Set<string>()
  for (const [key, raw] of Object.entries(root)) {
    const governor = skip.includes(key) ? undefined : governorOf(key, world)
    if (!governor || heldKey(root, governor.name) !== key) {
      out[key] = raw
      continue
    }
    const join = joins(governor)
    const held = heldValue(root, governor.name, join)
    let next: unknown
    if ('def' in governor) {
      const reconciled = reconcilePropertyValue(governor.def, held, frozen)
      if (!isBlankValue(reconciled)) next = encodeValue(reconciled)
    } else {
      const byTitle = world.contexts.spacesByTitle.get(governor.group.def.id)
      const titles = listOf(held ?? []).flatMap((value) => {
        const space = byTitle?.get(normalizeTitle(value))
        return space ? [space.title] : []
      })
      if (titles.length) next = [...new Set(titles)]
    }
    // A live reconcile never shrinks or blanks a value: one holding a member it can't resolve, or reading as nothing, stays as written, every spelling of it, for the user to settle.
    if (!frozen && (next === undefined || memberCount(next) < memberCount(held))) {
      out[key] = raw
      continue
    }
    const { key: target, govern } = writeTarget(root, governor.name, join)
    if (next === undefined) {
      for (const k of govern) retired.add(k)
      continue
    }
    const joined = govern.filter((k) => k !== target)
    for (const k of joined) retired.add(k)
    out[target] = writtenSpelling(next, held)
    if (joined.length || JSON.stringify(out[target]) !== JSON.stringify(raw)) changed.push(target)
  }
  for (const k of retired) {
    delete out[k]
    changed.push(k)
  }
  return { root: out, changed }
}
