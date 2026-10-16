// The renderer's projections of the one walk in `record.ts`, each cached on the tree object; glyphs and trails resolve here, beside the design kit.

import { type EntityRecord, recordsOf } from './record'
import type { BannerOwnerKind } from './mutateRequest'
import { navKey, type NavRef, type SelectTarget, toNavRef } from '../Navigation/navRef'
import { MATRIX_ICON, MATRIX_TITLE } from '../Matrix/matrixKind'
import type { CollectionNode, NexusTree, SetNode, SpaceNode } from './tree'
import { entityMemo } from './tree'
import { findContainerWhere, withheldIn } from './treePatch'
import { iconNameOr } from '@pommora/uix/Symbols'
import { DEFAULT_NEXUS_ICON, entityIcon } from '../Assets/entityIconPolicy'
import { NO_TRAIL, type TrailSegment } from '@pommora/uix/Elements/NavTrail'
import type { NavCore, ResolveIndex } from '../Navigation/navResolve'
import type { SearchEntry } from '../Navigation/navSearch'
import { foldKey } from '../Paths/caseFold'
import { dirname } from '../Paths/posix'
import { contextWorldOf } from '../Contexts/contextResolve'
import type { ReconcileIndex } from '../Session/reconcileSelection'

/** `id` and `path` are '' for the two folderless singletons, the Homepage and the Matrix. */
interface NodeRecord extends TrailNode {
  key: string
  kind: NavRef['kind']
  /** The raw icon field — surfaces that render absence read this, not the resolved glyph. */
  ownIcon?: string
  parents: TrailNode[]
}

export interface TrailNode extends Pick<EntityRecord, 'id' | 'title' | 'path'> {
  kind: NavRef['kind'] | 'context'
  icon: string
}

const LOOKS = [
  (t: NexusTree) => t.contexts,
  (t: NexusTree) => t.nexus.name,
  (t: NexusTree) => t.config.profileIcon,
  (t: NexusTree) => t.config.pageMetadata,
  (t: NexusTree) => t.config.personalization.defaultIcons,
]

export const nodesOf = entityMemo(LOOKS, (tree): readonly NodeRecord[] => {
  const di = tree.config.personalization.defaultIcons
  const nodes: NodeRecord[] = [
    {
      key: navKey({ kind: 'homepage' }),
      kind: 'homepage',
      id: '',
      title: tree.nexus.name,
      icon: iconNameOr(tree.config.profileIcon, DEFAULT_NEXUS_ICON),
      path: '',
      parents: [],
    },
    {
      key: navKey({ kind: 'matrix' }),
      kind: 'matrix',
      id: '',
      title: MATRIX_TITLE,
      icon: MATRIX_ICON,
      path: '',
      parents: [],
    },
  ]
  // A record's container is its path's directory: a page's or set's folder, a space's context folder, nothing for a collection; the walk lists containers before what they hold, so the chain is always there.
  const chains = new Map<string, TrailNode[]>()
  for (const { kind, id, title, path, icon: own } of recordsOf(tree)) {
    const ownIcon = kind === 'page' ? tree.config.pageMetadata[id]?.icon : own
    const icon = entityIcon(kind, ownIcon, di)
    if (kind === 'context') {
      chains.set(path, [{ kind, id, title, icon, path: '' }])
      continue
    }
    const parents = chains.get(dirname(path)) ?? []
    const node: NodeRecord = {
      key: navKey({ kind, id }),
      kind,
      id,
      title,
      icon,
      ownIcon,
      path,
      parents,
    }
    nodes.push(node)
    if (kind === 'collection' || kind === 'set') chains.set(path, [...parents, node])
  }
  return nodes
})

export const reconcileIndexOf = entityMemo(
  [(t) => t.contexts, (t) => t.unreadable],
  (tree): ReconcileIndex => {
    const spaces = new Set<string>()
    const collections = new Set<string>()
    const sets = new Map<string, string>()
    const pages = new Map<string, string>()
    const pagesByPath = new Map<string, string>()
    for (const r of recordsOf(tree))
      switch (r.kind) {
        case 'context':
          break
        case 'space':
          spaces.add(r.id)
          break
        case 'collection':
          collections.add(r.id)
          break
        case 'set':
          sets.set(r.id, r.path)
          break
        case 'page':
          pages.set(r.id, r.path)
          pagesByPath.set(r.path, r.id)
          break
      }
    return { spaces, collections, sets, pages, pagesByPath, withheld: withheldIn(tree.unreadable) }
  },
)

export const resolveIndexOf = entityMemo(
  LOOKS,
  (tree): ResolveIndex =>
    new Map<string, NavCore>(
      nodesOf(tree).map((r) => [r.key, { icon: r.icon, title: r.title, path: r.parents }]),
    ),
)

export const trailOf = (tree: NexusTree | null, ref: NavRef | SelectTarget): TrailSegment[] =>
  (tree && ancestryOf(tree, ref)) ?? NO_TRAIL

const ancestries = entityMemo(
  LOOKS,
  (tree): ReadonlyMap<string, TrailNode[]> =>
    new Map(nodesOf(tree).map((r) => [r.key, [...r.parents, r]])),
)

/** The ancestry including the entity itself, outermost first; null when the ref no longer resolves. */
export const ancestryOf = (tree: NexusTree, ref: NavRef | SelectTarget): TrailNode[] | null =>
  ancestries(tree).get(navKey(toNavRef(ref))) ?? null

/** Grouped by kind so equal-scored ties keep a stable cross-kind order. */
export const searchEntriesOf = entityMemo(
  [(t) => t.contexts, (t) => t.nexus.name],
  (tree): SearchEntry[] => {
    const byKind: Record<NodeRecord['kind'], SearchEntry[]> = {
      homepage: [],
      matrix: [],
      space: [],
      collection: [],
      set: [],
      page: [],
    }
    for (const r of nodesOf(tree)) {
      byKind[r.kind].push({
        key: r.key,
        target: toNavRef(r),
        title: r.title,
        folded: foldKey(r.title),
      })
    }
    return [
      ...byKind.homepage,
      ...byKind.matrix,
      ...byKind.space,
      ...byKind.collection,
      ...byKind.set,
      ...byKind.page,
    ]
  },
)

export const recordsByIdOf = entityMemo(
  LOOKS,
  (tree): ReadonlyMap<string, NodeRecord> =>
    new Map(
      nodesOf(tree)
        .filter((r) => r.id !== '')
        .map((r) => [r.id, r]),
    ),
)

/** The closed set thumbnail eviction prunes against — nothing selects a Context group, so the records are the complete universe of capturable keys. */
export const navKeysOf = entityMemo([(t) => t.contexts], (tree): string[] =>
  nodesOf(tree).map((r) => r.key),
)

/** `icon` is raw and unvalidated; NavView is excluded because its banner is treated separately. */
export interface BannerOwner {
  path: string
  kind: Exclude<BannerOwnerKind, 'navview'>
  title: string
  banner?: string
  icon?: string
  headingIconHidden?: boolean
}

export function findCollection(tree: NexusTree | null, id: string): CollectionNode | undefined {
  if (!tree) return undefined
  return tree.collections.find((c) => c.id === id)
}

export function findSet(tree: NexusTree | null, id: string): SetNode | undefined {
  const hit = tree && findContainerWhere(tree, (n) => n.kind === 'set' && n.id === id)
  return hit && hit.kind === 'set' ? hit : undefined
}

/** Tile surfaces run tight tile gutters instead of the content inset. Drives `is-surface`. */
export function isSurfaceKind(kind: BannerOwnerKind): boolean {
  return kind === 'homepage' || kind === 'space'
}

export const spaceLinksOf = entityMemo(
  [(t) => t.contexts],
  (tree): ReadonlyMap<string, Record<string, string[]>> => {
    const out = new Map<string, Record<string, string[]>>()
    const add = (spaceId: string, contextId: string, otherId: string): void => {
      const links = out.get(spaceId) ?? {}
      const ids = links[contextId] ?? []
      if (!ids.includes(otherId)) ids.push(otherId)
      links[contextId] = ids
      out.set(spaceId, links)
    }
    for (const g of tree.contexts)
      for (const s of g.spaces)
        for (const [contextId, ids] of Object.entries(s.contextValues ?? {}))
          for (const other of ids) {
            add(s.id, contextId, other)
            add(other, g.def.id, s.id)
          }
    return out
  },
)

export const spaceNodeOf = (tree: NexusTree | null, id: string): SpaceNode | null =>
  (tree && contextWorldOf(tree.contexts).spaceById.get(id)) ?? null

export function findSpace(tree: NexusTree | null, id: string): BannerOwner | null {
  const sp = spaceNodeOf(tree, id)
  return sp
    ? {
        path: sp.path,
        kind: 'space',
        title: sp.title,
        banner: sp.banner,
        icon: sp.icon,
        headingIconHidden: sp.headingIconHidden,
      }
    : null
}

export function containerOwner(node: CollectionNode | SetNode): BannerOwner {
  return {
    path: node.path,
    kind: node.kind,
    title: node.title,
    banner: node.banner,
    icon: node.icon,
    headingIconHidden: node.headingIconHidden,
  }
}
