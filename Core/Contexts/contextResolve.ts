import { normalizeTitle } from '../Connections/connections'
import { foldKey, heldKey, heldKeys } from '../Paths/caseFold'
import { contextKey, parseContextKey } from './contexts'
import { byFoldedName, holdsList, type PropertyDefinition } from '../Properties/properties'
import { heldValue, type Matcher } from '../Properties/pageValue'
import {
  type Adoption,
  type Frozen,
  encodeValue,
  heldSpelling,
  isBlankValue,
  reconcilePropertyValue,
} from '../Properties/propertyValue'
import { settingOf } from '../Settings/personalization'
import type { ContextGroup, NexusTree, SpaceNode } from '../Nexus/tree'
import { listOf } from '../Contract/validators'

type ResolvedLinks = Map<string, string[]>

export const namesSpace =
  (title: string): Matcher =>
  (el) =>
    typeof el === 'string' && normalizeTitle(el) === normalizeTitle(title)

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
  resolveCase: boolean
}

export const governedWorld = (
  tree: NexusTree,
  defs: ReadonlyMap<string, PropertyDefinition>,
): GovernedWorld => ({
  contexts: contextWorldOf(tree.contexts),
  defs,
  resolveCase: settingOf(tree.config.personalization, 'resolveCaseConflicts'),
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
  for (const [key, raw] of Object.entries(root)) {
    const group = raw == null ? undefined : groupOf(key, world)
    if (!group || heldKey(root, contextKey(group.def.title)) !== key) continue
    const byTitle = world.spacesByTitle.get(group.def.id)
    const ids: string[] = []
    for (const value of listOf(raw)) {
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
  adoptions: Adoption[]
  /** Each spelling joined into a key the reconcile wrote, by that key. */
  retired: Record<string, string>
}

type Governor = { name: string; def: PropertyDefinition } | { name: string; group: ContextGroup }

function governorOf(key: string, world: GovernedWorld): Governor | undefined {
  const def = world.defs.get(foldKey(key))
  if (def) return { name: def.name, def }
  const group = groupOf(key, world.contexts)
  return group && { name: contextKey(group.def.title), group }
}

// A governed name reconciles once, under the key `heldKey` reads, and its other spellings pass through as foreign; with `resolveCase` they join it under the registered spelling and leave once that key is written. A key in `skip` passes through verbatim.
export function reconcileGovernedRoot(
  root: Record<string, unknown>,
  world: GovernedWorld,
  frozen?: Frozen,
  skip: readonly string[] = [],
): Reconciled {
  const out: Record<string, unknown> = {}
  const changed: string[] = []
  const adoptions: Adoption[] = []
  const retired: Record<string, string> = {}
  const { resolveCase } = world
  for (const [key, raw] of Object.entries(root)) {
    const governor = skip.includes(key) ? undefined : governorOf(key, world)
    const keys = governor ? heldKeys(root, governor.name) : []
    if (!governor || keys[0] !== key) {
      out[key] = raw
      continue
    }
    const join = 'group' in governor || holdsList(governor.def)
    const held = heldValue(root, governor.name, resolveCase && join)
    let next: unknown
    if ('def' in governor) {
      const reconciled = reconcilePropertyValue(governor.def, held, frozen)
      adoptions.push(...reconciled.adoptions)
      if (!isBlankValue(reconciled.value)) next = encodeValue(reconciled.value)
    } else {
      const byTitle = world.contexts.spacesByTitle.get(governor.group.def.id)
      const spaces = listOf(held ?? []).map((value) => byTitle?.get(normalizeTitle(value)))
      // A live reconcile leaves a key naming a Space it can't resolve as written, for the user to settle.
      if (!frozen && spaces.includes(undefined)) {
        out[key] = raw
        continue
      }
      const titles = spaces.flatMap((space) => (space ? [space.title] : []))
      if (titles.length) next = titles
    }
    if (next === undefined) {
      changed.push(key)
      continue
    }
    const target = resolveCase ? governor.name : key
    const joined = resolveCase ? keys.filter((k) => k !== target) : []
    for (const k of joined) retired[k] = target
    out[target] = resolveCase ? next : heldSpelling(next, held)
    if (joined.length || JSON.stringify(out[target]) !== JSON.stringify(raw)) changed.push(target)
  }
  for (const k of Object.keys(retired)) {
    delete out[k]
    changed.push(k)
  }
  return { root: out, changed, adoptions, retired }
}

export function survivingChanges({ root, changed }: Reconciled): Record<string, unknown> {
  return Object.fromEntries(changed.filter((k) => k in root).map((k) => [k, root[k]]))
}

const memberCount = (v: unknown): number => (Array.isArray(v) ? v.length : 1)

// A reconcile that can't resolve a member must never shrink the value it writes: `original` is the pre-reconcile root, a change that drops members against the key it read is withheld, and a spelling joined into a withheld key stays.
export function preservedChanges(
  reconciled: Reconciled,
  original: Record<string, unknown>,
): Record<string, unknown> {
  const surviving = survivingChanges(reconciled)
  for (const key of Object.keys(surviving)) {
    if (memberCount(surviving[key]) < memberCount(heldValue(original, key, false)))
      delete surviving[key]
  }
  for (const [key, target] of Object.entries(reconciled.retired))
    if (target in surviving) surviving[key] = undefined
  return surviving
}
