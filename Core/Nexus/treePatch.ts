// The tree's path-addressed steps. The host applies them as file events land; the window applies the same ones to paint a drag ahead of its write. Null means the step can't resolve against the given tree, and the host walks.

import { stabilize } from './treeStabilize'
import type {
  CollectionNode,
  ContextGroup,
  NexusTree,
  PageNode,
  SetNode,
  SpaceNode,
  Unreadable,
  UnreadReason,
} from './tree'
import type { PropertyDefinition } from '../Properties/properties'
import { basename, relDirname, relJoin, titleFromPath } from '../Paths/posix'
import { CONTEXTS_DIR_REL, contextDirRel } from '../Paths/nexusPaths'
import { asStringArray } from './coerce'
import { resolveOrder } from './order'

/** The ORIGINAL paths thread through: swapping against an already-swapped child re-prepends. */
function reparentPaths<T extends PageNode | SetNode | CollectionNode>(
  node: T,
  oldPath: string,
  newPath: string,
): T {
  const swap = (p: string): string => (p === oldPath ? newPath : newPath + p.slice(oldPath.length))
  if (node.kind === 'page') return { ...node, path: swap(node.path) }
  const set = node as SetNode
  return {
    ...set,
    path: swap(set.path),
    sets: set.sets?.map((s) => reparentPaths(s, oldPath, newPath)),
    pages: set.pages.map((pg) => ({ ...pg, path: swap(pg.path) })),
  } as T
}

/** `newPath` null prunes. A stale entry lists a file at a dead address. */
function repointUnreadable(
  tree: NexusTree | null,
  oldPath: string,
  newPath: string | null,
): NexusTree | null {
  if (!tree) return null
  const list = tree.unreadable
  const hit = (p: string): boolean => p === oldPath || p.startsWith(`${oldPath}/`)
  if (!list?.some((u) => hit(u.path))) return tree
  const kept: Unreadable[] = []
  for (const u of list) {
    if (!hit(u.path)) kept.push(u)
    else if (newPath !== null) kept.push({ ...u, path: newPath + u.path.slice(oldPath.length) })
  }
  const next = { ...tree }
  if (kept.length) next.unreadable = kept
  else delete next.unreadable
  return next
}

type ContainerMatch = (node: CollectionNode | SetNode) => boolean

function trailIn(
  containers: (CollectionNode | SetNode)[],
  match: ContainerMatch,
): (CollectionNode | SetNode)[] | null {
  for (const c of containers) {
    if (match(c)) return [c]
    const deep = c.sets?.length ? trailIn(c.sets, match) : null
    if (deep) {
      deep.unshift(c)
      return deep
    }
  }
  return null
}

/** The matched container and every container above it, outermost first. */
export const containerTrailWhere = (
  tree: NexusTree,
  match: ContainerMatch,
): (CollectionNode | SetNode)[] | null => trailIn(tree.collections, match)

export const findContainerWhere = (
  tree: NexusTree,
  match: ContainerMatch,
): CollectionNode | SetNode | null => containerTrailWhere(tree, match)?.at(-1) ?? null

/** A Collection owns itself; anything else is owned by the Collection its path starts in, since Collections sit only at the Nexus root. */
export function owningCollection(
  tree: NexusTree | null,
  of: string | CollectionNode | SetNode,
): CollectionNode | undefined {
  if (typeof of !== 'string' && of.kind === 'collection') return of
  const top = (typeof of === 'string' ? of : of.path).split('/', 1)[0]
  return tree?.collections.find((c) => c.path === top)
}

export const NO_SCHEMA: PropertyDefinition[] = []

/** A Set or page takes its Collection's schema; the one empty schema when nothing owns it. */
export const containerSchema = (
  tree: NexusTree | null,
  of: string | CollectionNode | SetNode,
): PropertyDefinition[] => owningCollection(tree, of)?.properties ?? NO_SCHEMA

export const containerAt = (tree: NexusTree, rel: string): CollectionNode | SetNode | null =>
  findContainerWhere(tree, (n) => n.path === rel)

export const pageAt = (tree: NexusTree, rel: string): PageNode | null =>
  containerAt(tree, relDirname(rel))?.pages.find((p) => p.path === rel) ?? null

export const spaceAt = (tree: NexusTree, rel: string): SpaceNode | null =>
  tree.contexts.flatMap((g) => g.spaces).find((s) => s.path === rel) ?? null

export const contextAt = (tree: NexusTree, rel: string): ContextGroup | null =>
  tree.contexts.find((g) => contextDirRel(g.def.title) === rel) ?? null

export const pageIdsIn = (tree: NexusTree, path: string): string[] | undefined =>
  containerAt(tree, path)?.pages.map((p) => p.id)

/** Keeps one def reference-identical in both homes (`config.registry` and each Collection's `properties`); an id the registry dropped falls out, as the walk resolves a dangling ref. */
export function repointRegistryInTree(tree: NexusTree, registry: PropertyDefinition[]): NexusTree {
  const defs = stabilize(registry, tree.config.registry)
  const byId = new Map(defs.map((d) => [d.id, d]))
  let moved = false
  const collections = tree.collections.map((c) => {
    const held = c.properties
    if (!held) return c
    const next = held.flatMap((d) => byId.get(d.id) ?? [])
    if (next.length === held.length && next.every((d, i) => d === held[i])) return c
    moved = true
    return { ...c, properties: next.length ? next : undefined }
  })
  if (!moved && defs === tree.config.registry) return tree
  return {
    ...tree,
    config: { ...tree.config, registry: defs },
    collections: moved ? collections : tree.collections,
  }
}

type TreeEntity = PageNode | SetNode | CollectionNode | SpaceNode

export function updateNodeInTree(
  tree: NexusTree,
  path: string,
  fn: (node: TreeEntity) => TreeEntity | null,
): NexusTree | null {
  for (const [gi, g] of tree.contexts.entries()) {
    const i = g.spaces.findIndex((s) => s.path === path)
    if (i === -1) continue
    const next = fn(g.spaces[i])
    const spaces = [...g.spaces]
    if (next === null) spaces.splice(i, 1)
    else spaces[i] = next as SpaceNode
    const groups = [...tree.contexts]
    groups[gi] = { ...g, spaces }
    return { ...tree, contexts: groups }
  }
  const r = updateInContainers(tree.collections, path, fn)
  return r.found ? { ...tree, collections: r.containers as CollectionNode[] } : null
}

function updateInContainers(
  containers: (CollectionNode | SetNode)[],
  path: string,
  fn: (node: TreeEntity) => TreeEntity | null,
): { containers: (CollectionNode | SetNode)[]; found: boolean } {
  let found = false
  const out: (CollectionNode | SetNode)[] = []
  for (const cont of containers) {
    if (found) {
      out.push(cont)
      continue
    }
    if (cont.path === path) {
      found = true
      const next = fn(cont)
      if (next !== null) out.push(next as CollectionNode | SetNode)
      continue
    }
    const pi = cont.pages.findIndex((p) => p.path === path)
    if (pi !== -1) {
      found = true
      const next = fn(cont.pages[pi])
      const pages = [...cont.pages]
      if (next === null) pages.splice(pi, 1)
      else pages[pi] = next as PageNode
      out.push({ ...cont, pages })
      continue
    }
    if (cont.sets?.length) {
      const r = updateInContainers(cont.sets, path, fn)
      if (r.found) {
        found = true
        out.push({ ...cont, sets: r.containers as SetNode[] })
        continue
      }
    }
    out.push(cont)
  }
  return { containers: out, found }
}

export const removeNodeInTree = (tree: NexusTree, path: string): NexusTree =>
  repointUnreadable(updateNodeInTree(tree, path, () => null) ?? tree, path, null) ?? tree

export const setUnreadable = (tree: NexusTree, path: string, reason: UnreadReason): NexusTree => ({
  ...tree,
  unreadable: [...(tree.unreadable ?? []), { path, reason }],
})

export function placeNode(tree: NexusTree, node: TreeEntity): NexusTree | null {
  const others = <T extends { path: string }>(list: T[]): T[] =>
    list.filter((n) => n.path !== node.path)
  if (node.kind === 'collection') {
    const collections = [...others(tree.collections), node]
    return { ...tree, collections: resolveOrder(collections, tree.config.order.collections) }
  }
  if (node.kind === 'space') {
    const group = tree.contexts.find((g) => g.def.id === node.contextId)
    if (!group) return null
    const spaces = resolveOrder(
      [...others(group.spaces), node],
      asStringArray(tree.config.order.spaces[group.def.id]),
    )
    return { ...tree, contexts: tree.contexts.map((g) => (g === group ? { ...g, spaces } : g)) }
  }
  return updateNodeInTree(tree, relDirname(node.path), (parent) => {
    if (parent.kind !== 'collection' && parent.kind !== 'set') return parent
    return node.kind === 'page'
      ? { ...parent, pages: resolveOrder([...others(parent.pages), node], parent.pageOrder) }
      : { ...parent, sets: resolveOrder([...others(parent.sets ?? []), node], parent.setOrder) }
  })
}

export function moveNodeInTree(tree: NexusTree, from: string, to: string): NexusTree | null {
  const group = contextAt(tree, from)
  if (group) {
    if (relDirname(to) !== CONTEXTS_DIR_REL) return null
    const moved: ContextGroup = {
      def: { ...group.def, title: basename(to) },
      spaces: group.spaces.map((s) => ({ ...s, path: relJoin(to, basename(s.path)) })),
    }
    const contexts = tree.contexts.map((g) => (g === group ? moved : g))
    return repointUnreadable({ ...tree, contexts }, from, to)
  }
  const node = spaceAt(tree, from) ?? pageAt(tree, from) ?? containerAt(tree, from)
  if (!node) return null
  // A Space keeps its Context and a Collection sits only at the root, so a move across either line changes what the folder is.
  const crosses =
    node.kind === 'space'
      ? relDirname(to) !== relDirname(from)
      : (node.kind === 'collection') !== (relDirname(to) === '')
  if (crosses) return null
  const title = node.kind === 'page' ? titleFromPath(to) : basename(to)
  const moved =
    node.kind === 'space'
      ? { ...node, path: to, title }
      : { ...reparentPaths(node, from, to), title }
  const pulled = updateNodeInTree(tree, from, () => null)
  return pulled && repointUnreadable(placeNode(pulled, moved), from, to)
}
