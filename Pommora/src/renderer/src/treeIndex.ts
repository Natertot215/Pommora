// The one owner of every navigation-layer lookup derived from the tree. One walk per tree builds
// one record per entity; the reconcile, resolve, search, connections, and thumbnail-key tables are
// projections of those records, each built lazily and cached. Caches key on the tree object itself
// — stabilize() preserves identity across echo pushes, so a real push invalidates everything at
// once and every other access is a WeakMap hit. A new lookup belongs here as another projection,
// never as its own walk. (The Views pipeline's context/space identity maps live apart in
// `contextIdentity.ts` — same tree-keyed caching, different question.)
//
// The record LIST is the source — duplicate ids (a copied .md carries its id in frontmatter) stay
// listed, so title resolution can still answer "ambiguous" and search still shows both. The keyed
// projections collapse duplicates last-wins, which is what a Map built from a list always did.

import type { NavRef, NexusTree, PageNode, SetNode } from '@shared/types'
import { entityIcon, iconNameOr } from '@renderer/design-system/symbols'
import { buildPageIndex, type ConnPage, type PageIndex } from './MarkdownPM/connections'
import { navKey } from './Navigation/navRecents'
import type { NavCore, PathCrumb, ResolveIndex } from './Navigation/navResolve'
import type { SearchEntry } from './Navigation/navSearch'
import type { ReconcileIndex } from './selection'

interface NodeRecord {
  key: string
  kind: 'homepage' | 'space' | 'collection' | 'set' | 'page'
  /** '' for the id-less homepage singleton. */
  id: string
  title: string
  /** Resolved display glyph — the user's own icon if renderable, else the nexus default. */
  icon: string
  /** The node's own raw icon field — surfaces that render absence read this, not the resolved glyph. */
  ownIcon?: string
  /** Nexus-relative fs path; '' where no folder backs the entity. */
  path: string
  /** Container breadcrumbs, excluding the entity itself. */
  crumbs: PathCrumb[]
}

export interface ContainerCore {
  title: string
  icon?: string
  kind: 'collection' | 'set'
}

interface TreeIndex {
  /** Every entity in walk order — homepage, spaces, then each collection's subtree. */
  nodes: NodeRecord[]
  reconcile?: ReconcileIndex
  resolve?: ResolveIndex
  search?: SearchEntry[]
  pages?: ConnPage[]
  pagesById?: Map<string, ConnPage>
  pageIndex?: PageIndex
  containers?: Map<string, ContainerCore>
  navKeys?: string[]
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
    icon: iconNameOr(tree.nexus.profileIcon, 'house'),
    path: '',
    crumbs: [],
  })
  for (const g of tree.contexts ?? []) {
    const groupCrumb: PathCrumb = { icon: entityIcon('space', g.def.icon, di), title: g.def.title }
    for (const s of g.spaces)
      nodes.push({
        key: navKey({ kind: 'space', id: s.id }),
        kind: 'space',
        id: s.id,
        title: s.title,
        icon: entityIcon('space', s.icon, di),
        ownIcon: s.icon,
        path: s.path,
        crumbs: [groupCrumb],
      })
  }
  const addPage = (p: PageNode, crumbs: PathCrumb[]): void => {
    nodes.push({
      key: navKey({ kind: 'page', id: p.id }),
      kind: 'page',
      id: p.id,
      title: p.title,
      icon: entityIcon('page', p.icon, di),
      ownIcon: p.icon,
      path: p.path,
      crumbs,
    })
  }
  const walkSets = (sets: SetNode[] | undefined, parents: PathCrumb[]): void => {
    for (const s of sets ?? []) {
      const icon = entityIcon('set', s.icon, di)
      nodes.push({
        key: navKey({ kind: 'set', id: s.id }),
        kind: 'set',
        id: s.id,
        title: s.title,
        icon,
        ownIcon: s.icon,
        path: s.path,
        crumbs: parents,
      })
      const chain = [...parents, { icon, title: s.title }]
      for (const p of s.pages) addPage(p, chain)
      walkSets(s.sets, chain)
    }
  }
  for (const col of tree.collections ?? []) {
    const icon = entityIcon('collection', col.icon, di)
    nodes.push({
      key: navKey({ kind: 'collection', id: col.id }),
      kind: 'collection',
      id: col.id,
      title: col.title,
      icon,
      ownIcon: col.icon,
      path: col.path,
      crumbs: [],
    })
    const colCrumb: PathCrumb = { icon, title: col.title }
    for (const p of col.pages) addPage(p, [colCrumb])
    walkSets(col.sets, [colCrumb])
  }
  return nodes
}

/** Existence + live-path lookup per entity kind — what reconcileWith answers from. */
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

/** navKey → display core (title, resolved icon, breadcrumbs) — O(1) resolution per entry. */
export function resolveIndexOf(tree: NexusTree): ResolveIndex {
  const ix = indexFor(tree)
  if (!ix.resolve) {
    const m: ResolveIndex = new Map<string, NavCore>()
    for (const r of ix.nodes) m.set(r.key, { icon: r.icon, title: r.title, path: r.crumbs })
    ix.resolve = m
  }
  return ix.resolve
}

/** Tree-derived search entries, grouped by kind (homepage, spaces, collections, sets, pages) so
 *  equal-scored ties keep a stable cross-kind order. Agenda entries append per surface — they
 *  ride a snapshot, not the tree. */
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

/** Every page in the tree, in walk order — the connections layer's page universe. */
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

export function pagesByIdOf(tree: NexusTree): ReadonlyMap<string, ConnPage> {
  const ix = indexFor(tree)
  if (!ix.pagesById) ix.pagesById = new Map(pagesOf(tree).map((p) => [p.id, p]))
  return ix.pagesById
}

/** The [[Title]] resolution + autocomplete closure over the page universe. */
export function pageIndexOf(tree: NexusTree): PageIndex {
  const ix = indexFor(tree)
  if (!ix.pageIndex) ix.pageIndex = buildPageIndex(pagesOf(tree))
  return ix.pageIndex
}

/** path → container display core — embed and menu surfaces resolving a container by its path. */
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

/** Every live navKey — the closed set thumbnail eviction prunes against. Capture fires on any
 *  selection, and nothing today selects a Context group, so the record keyspace is the complete
 *  universe of capturable keys. */
export function navKeysOf(tree: NexusTree): string[] {
  const ix = indexFor(tree)
  if (!ix.navKeys) ix.navKeys = ix.nodes.map((r) => r.key)
  return ix.navKeys
}
