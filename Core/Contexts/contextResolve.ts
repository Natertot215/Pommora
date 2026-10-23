import { exactTitle } from '../Paths/caseFold'
import { contextTitles, parseContextKey } from './contexts'
import type { ContextGroup, SpaceNode } from '../Nexus/tree'

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

export function groupOf(key: string, world: ContextWorld): ContextGroup | undefined {
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
    const ids = new Set(contextTitles(raw).flatMap((title) => byTitle?.get(title)?.id ?? []))
    if (ids.size) links.set(group.def.id, [...ids])
  }
  return links
}
