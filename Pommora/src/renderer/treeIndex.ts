// The one owner of every navigation-layer lookup derived from the tree. One walk per tree builds
// one record per entity; reconcile/resolve/search/connections/thumbnail-key tables are lazy,
// cached projections of those records, keyed on the tree object — stabilize() preserves identity
// across echo pushes, so a real push invalidates everything at once and every other access is a
// WeakMap hit. A new lookup belongs here as another projection, never its own walk.
//
// The record LIST is the source — duplicate ids (a copied .md carries its id in frontmatter) stay
// listed, so title resolution can still answer "ambiguous". The keyed projections collapse
// duplicates last-wins.

import type { EntityRecord } from '@shared/record'
import {
  type NavRef,
  type NexusTree,
  type PageNode,
  type SelectTarget,
  type SetNode,
  toNavRef,
} from '@shared/types'
import { DEFAULT_NEXUS_ICON, entityIcon, iconNameOr } from '@renderer/DesignSystem/Symbols'
import {
  buildPageIndex,
  type ConnectionsApi,
  type ConnPage,
  type PageIndex,
} from './MarkdownPM/Connections'
import { navKey } from './Navigation/navRecents'
import type { NavCore, ResolveIndex } from './Navigation/navResolve'
import type { SearchEntry } from './Navigation/navSearch'
import type { ReconcileIndex } from '@renderer/Actions/selection'

/** The `{id, title, path}` tuple is `EntityRecord`'s; `id` and `path` are '' for the folderless,
 *  id-less homepage singleton. `kind` stays local — the unions are disjoint (`homepage` here,
 *  `context` there). */
interface NodeRecord extends TrailNode {
  key: string
  kind: 'homepage' | 'space' | 'collection' | 'set' | 'page'
  /** The node's own raw icon field — surfaces that render absence read this, not the resolved glyph. */
  ownIcon?: string
  /** The containers above the entity, outermost first. */
  parents: TrailNode[]
}

/** One node on an entity's ancestry — identity plus its resolved display core. */
export interface TrailNode extends Pick<EntityRecord, 'id' | 'title' | 'path'> {
  kind: 'homepage' | 'context' | 'space' | 'collection' | 'set' | 'page'
  /** Resolved display glyph — the user's own icon if renderable, else the nexus default. */
  icon: string
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
  for (const col of tree.collections ?? []) {
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
    for (const r of ix.nodes) m.set(r.key, { icon: r.icon, title: r.title, path: r.parents })
    ix.resolve = m
  }
  return ix.resolve
}

/** The entity's ancestry including itself, outermost first — what every location trail draws from.
 *  Null when the ref no longer resolves. */
export function ancestryOf(tree: NexusTree, ref: NavRef | SelectTarget): TrailNode[] | null {
  const ix = indexFor(tree)
  if (!ix.ancestry) {
    const m = new Map<string, TrailNode[]>()
    for (const r of ix.nodes) m.set(r.key, [...r.parents, r])
    ix.ancestry = m
  }
  return ix.ancestry.get(navKey(toNavRef(ref))) ?? null
}

/** Tree-derived search entries, grouped by kind (homepage, spaces, collections, sets, pages) so
 *  equal-scored ties keep a stable cross-kind order. The tree is the whole universe — a kind
 *  absent from the walk is absent from search. */
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

/** The page index with `open` inert — links style and resolve, and a click goes nowhere. */
export const resolveOnlyConnections = (tree: NexusTree | null): ConnectionsApi | undefined =>
  tree ? { ...pageIndexOf(tree), open: () => {} } : undefined

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

/** The page a raw connection title names, or null when none does (or more than one does). The
 *  resolution behind a Link property's paste gate and behind the connection a Link cell draws, so a
 *  cell can never show a link the index wouldn't reach. */
export function resolveConnection(tree: NexusTree | null, rawTitle: string): ConnPage | null {
  if (!tree) return null
  const res = pageIndexOf(tree).resolve(rawTitle)
  return res.status === 'resolved' && res.page ? res.page : null
}
