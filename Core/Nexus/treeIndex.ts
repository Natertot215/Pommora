// One walk per tree; every table is cached on the tree. Record LIST is source; keyed projections collapse duplicates last-wins.

import type { EntityRecord } from '@pommora/core/Nexus/record'
import type { BannerOwnerKind } from '@pommora/core/Pages/mutateRequest'
import { type NavRef, type SelectTarget, toNavRef } from '@pommora/core/Navigation/navRef'
import type { CollectionNode, NexusTree, PageNode, SetNode } from '@pommora/core/Nexus/tree'
import { iconNameOr } from '@pommora/uix/Symbols'
import { DEFAULT_NEXUS_ICON, entityIcon } from '../Assets/entityIconPolicy'
import { NO_TRAIL, type TrailSegment } from '@pommora/uix/Elements/NavTrail/NavTrail'
import {
  buildPageIndex,
  type ConnectionsApi,
  type ConnPage,
  type PageIndex,
} from '../MarkdownPM/Links/connectionsApi'
import { navKey } from '../Navigation/navRecents'
import type { NavCore, ResolveIndex } from '../Navigation/navResolve'
import type { SearchEntry } from '../Navigation/navSearch'
import type { ReconcileIndex } from '../Session/reconcileSelection'

/** `id` and `path` are '' for the folderless homepage singleton. */
interface NodeRecord extends TrailNode {
  key: string
  kind: 'homepage' | 'space' | 'collection' | 'set' | 'page'
  /** The raw icon field — surfaces that render absence read this, not the resolved glyph. */
  ownIcon?: string
  parents: TrailNode[]
}

export interface TrailNode extends Pick<EntityRecord, 'id' | 'title' | 'path'> {
  kind: 'homepage' | 'context' | 'space' | 'collection' | 'set' | 'page'
  icon: string
}

export interface ContainerCore {
  title: string
  icon?: string
  kind: 'collection' | 'set'
}

interface TreeIndex {
  nodes: NodeRecord[]
  reconcile?: ReconcileIndex
  resolve?: ResolveIndex
  search?: SearchEntry[]
  pages?: ConnPage[]
  pagesById?: Map<string, ConnPage>
  pageIndex?: PageIndex
  containers?: Map<string, ContainerCore>
  navKeys?: string[]
  ancestry?: Map<string, TrailNode[]>
}

const byTree = new WeakMap<NexusTree, TreeIndex>()

function indexFor(tree: NexusTree): TreeIndex {
  let ix = byTree.get(tree)
  if (!ix) {
    ix = { nodes: walk(tree) }
    byTree.set(tree, ix)
  }
  return ix
}

function walk(tree: NexusTree): NodeRecord[] {
  const nodes: NodeRecord[] = []
  const di = tree.personalization.defaultIcons
  nodes.push({
    key: navKey({ kind: 'homepage' }),
    kind: 'homepage',
    id: '',
    title: tree.nexus.name,
    icon: iconNameOr(tree.nexus.profileIcon, DEFAULT_NEXUS_ICON),
    path: '',
    parents: [],
  })
  for (const g of tree.contexts ?? []) {
    const group: TrailNode = {
      kind: 'context',
      id: g.def.id,
      title: g.def.title,
      icon: entityIcon('context', g.def.icon, di),
      path: '',
    }
    for (const s of g.spaces)
      nodes.push({
        key: navKey({ kind: 'space', id: s.id }),
        kind: 'space',
        id: s.id,
        title: s.title,
        icon: entityIcon('space', s.icon, di),
        ownIcon: s.icon,
        path: s.path,
        parents: [group],
      })
  }
  const addPage = (p: PageNode, parents: TrailNode[]): void => {
    nodes.push({
      key: navKey({ kind: 'page', id: p.id }),
      kind: 'page',
      id: p.id,
      title: p.title,
      icon: entityIcon('page', p.icon, di),
      ownIcon: p.icon,
      path: p.path,
      parents,
    })
  }
  const walkSets = (sets: SetNode[] | undefined, parents: TrailNode[]): void => {
    for (const s of sets ?? []) {
      const node: NodeRecord = {
        key: navKey({ kind: 'set', id: s.id }),
        kind: 'set',
        id: s.id,
        title: s.title,
        icon: entityIcon('set', s.icon, di),
        ownIcon: s.icon,
        path: s.path,
        parents,
      }
      nodes.push(node)
      const chain = [...parents, node]
      for (const p of s.pages) addPage(p, chain)
      walkSets(s.sets, chain)
    }
  }
  for (const col of tree.collections) {
    const node: NodeRecord = {
      key: navKey({ kind: 'collection', id: col.id }),
      kind: 'collection',
      id: col.id,
      title: col.title,
      icon: entityIcon('collection', col.icon, di),
      ownIcon: col.icon,
      path: col.path,
      parents: [],
    }
    nodes.push(node)
    for (const p of col.pages) addPage(p, [node])
    walkSets(col.sets, [node])
  }
  return nodes
}

export const nodesOf = (tree: NexusTree): readonly NodeRecord[] => indexFor(tree).nodes

export function reconcileIndexOf(tree: NexusTree): ReconcileIndex {
  const ix = indexFor(tree)
  if (!ix.reconcile) {
    const spaces = new Set<string>()
    const collections = new Set<string>()
    const sets = new Map<string, string>()
    const pages = new Map<string, string>()
    for (const r of ix.nodes)
      switch (r.kind) {
        case 'homepage':
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
          break
      }
    ix.reconcile = { spaces, collections, sets, pages }
  }
  return ix.reconcile
}

export function resolveIndexOf(tree: NexusTree): ResolveIndex {
  const ix = indexFor(tree)
  if (!ix.resolve) {
    const m: ResolveIndex = new Map<string, NavCore>()
    for (const r of ix.nodes) m.set(r.key, { icon: r.icon, title: r.title, path: r.parents })
    ix.resolve = m
  }
  return ix.resolve
}

export const trailOf = (tree: NexusTree | null, ref: NavRef | SelectTarget): TrailSegment[] =>
  (tree && ancestryOf(tree, ref)) ?? NO_TRAIL

/** The ancestry including the entity itself, outermost first; null when the ref no longer resolves. */
export function ancestryOf(tree: NexusTree, ref: NavRef | SelectTarget): TrailNode[] | null {
  const ix = indexFor(tree)
  if (!ix.ancestry) {
    const m = new Map<string, TrailNode[]>()
    for (const r of ix.nodes) m.set(r.key, [...r.parents, r])
    ix.ancestry = m
  }
  return ix.ancestry.get(navKey(toNavRef(ref))) ?? null
}

/** Grouped by kind so equal-scored ties keep a stable cross-kind order. */
export function searchEntriesOf(tree: NexusTree): SearchEntry[] {
  const ix = indexFor(tree)
  if (!ix.search) {
    const byKind: Record<NodeRecord['kind'], SearchEntry[]> = {
      homepage: [],
      space: [],
      collection: [],
      set: [],
      page: [],
    }
    for (const r of ix.nodes) {
      const target: NavRef =
        r.kind === 'homepage' ? { kind: 'homepage' } : { kind: r.kind, id: r.id }
      byKind[r.kind].push({ key: r.key, target, title: r.title, lower: r.title.toLowerCase() })
    }
    ix.search = [
      ...byKind.homepage,
      ...byKind.space,
      ...byKind.collection,
      ...byKind.set,
      ...byKind.page,
    ]
  }
  return ix.search
}

export function pagesOf(tree: NexusTree): ConnPage[] {
  const ix = indexFor(tree)
  if (!ix.pages) {
    const pages: ConnPage[] = []
    for (const r of ix.nodes)
      if (r.kind === 'page') pages.push({ id: r.id, title: r.title, path: r.path, icon: r.ownIcon })
    ix.pages = pages
  }
  return ix.pages
}

export const livePagePath = (
  tree: NexusTree | null,
  target: { id: string; path: string },
): string => (tree && pagesByIdOf(tree).get(target.id)?.path) ?? target.path

export function pagesByIdOf(tree: NexusTree): ReadonlyMap<string, ConnPage> {
  const ix = indexFor(tree)
  if (!ix.pagesById) ix.pagesById = new Map(pagesOf(tree).map((p) => [p.id, p]))
  return ix.pagesById
}

export function pageIndexOf(tree: NexusTree): PageIndex {
  const ix = indexFor(tree)
  if (!ix.pageIndex) ix.pageIndex = buildPageIndex(pagesOf(tree))
  return ix.pageIndex
}

export const connectionsFor = (
  tree: NexusTree | null,
  rest: Omit<ConnectionsApi, keyof PageIndex>,
): ConnectionsApi | undefined => (tree ? { ...pageIndexOf(tree), ...rest } : undefined)

export function containersByPathOf(tree: NexusTree): ReadonlyMap<string, ContainerCore> {
  const ix = indexFor(tree)
  if (!ix.containers) {
    const m = new Map<string, ContainerCore>()
    for (const r of ix.nodes)
      if (r.kind === 'collection' || r.kind === 'set')
        m.set(r.path, { title: r.title, icon: r.ownIcon, kind: r.kind })
    ix.containers = m
  }
  return ix.containers
}

/** The closed set thumbnail eviction prunes against — nothing selects a Context group, so the records are the complete universe of capturable keys. */
export function navKeysOf(tree: NexusTree): string[] {
  const ix = indexFor(tree)
  if (!ix.navKeys) ix.navKeys = ix.nodes.map((r) => r.key)
  return ix.navKeys
}

/** Null when no page answers the title, or more than one does. Behind both a Link property's paste gate and the connection a Link cell draws, so a cell can't show a link the index wouldn't reach. */
export function resolveConnection(tree: NexusTree | null, rawTitle: string): ConnPage | null {
  if (!tree) return null
  const res = pageIndexOf(tree).resolve(rawTitle)
  return res.status === 'resolved' && res.page ? res.page : null
}

/** `icon` is raw and unvalidated; NavView is excluded because its banner is treated separately. */
export interface BannerOwner {
  path: string
  kind: Exclude<BannerOwnerKind, 'navview'>
  name: string
  banner?: string
  icon?: string
  headingIconHidden?: boolean
}

export function findCollection(tree: NexusTree | null, id: string): CollectionNode | undefined {
  if (!tree) return undefined
  return tree.collections.find((c) => c.id === id)
}

export function findSet(tree: NexusTree | null, id: string): SetNode | undefined {
  const hit = tree && findContainer(tree, (n) => n.kind === 'set' && n.id === id)
  return hit && hit.kind === 'set' ? hit : undefined
}

export function findCollectionForSet(
  tree: NexusTree | null,
  setId: string,
): CollectionNode | undefined {
  if (!tree) return undefined
  const has = (sets: SetNode[] | undefined): boolean => {
    for (const set of sets ?? []) {
      if (set.id === setId) return true
      if (has(set.sets)) return true
    }
    return false
  }
  return tree.collections.find((c) => has(c.sets))
}

/** Tile surfaces run tight tile gutters instead of the content inset. Drives `is-surface`. */
export function isSurfaceKind(kind: BannerOwnerKind): boolean {
  return kind === 'homepage' || kind === 'space'
}

/** Tested, not trusted: a reparent plus a Back-nav replay can surface either depth as a `set` selection. */
export function isDepth1Set(tree: NexusTree | null, setId: string): boolean {
  const col = findCollectionForSet(tree, setId)
  return !!col && col.sets.some((s) => s.id === setId)
}

export function findSpace(tree: NexusTree | null, id: string): BannerOwner | null {
  if (!tree) return null
  for (const g of tree.contexts) {
    const sp = g.spaces.find((s) => s.id === id)
    if (sp)
      return {
        path: sp.path,
        kind: 'space',
        name: sp.title,
        banner: sp.banner,
        icon: sp.icon,
        headingIconHidden: sp.headingIconHidden,
      }
  }
  return null
}

export function containerOwner(node: CollectionNode | SetNode): BannerOwner {
  return {
    path: node.path,
    kind: node.kind,
    name: node.title,
    banner: node.banner,
    icon: node.icon,
    headingIconHidden: node.headingIconHidden,
  }
}

export const parentPathOf = (path: string): string => path.split('/').slice(0, -1).join('/')

export function findContainer(
  tree: NexusTree,
  match: (node: CollectionNode | SetNode) => boolean,
): CollectionNode | SetNode | null {
  const inSets = (sets: SetNode[] | undefined): SetNode | null => {
    for (const s of sets ?? []) {
      if (match(s)) return s
      const deep = inSets(s.sets)
      if (deep) return deep
    }
    return null
  }
  for (const c of tree.collections) {
    if (match(c)) return c
    const hit = inSets(c.sets)
    if (hit) return hit
  }
  return null
}
