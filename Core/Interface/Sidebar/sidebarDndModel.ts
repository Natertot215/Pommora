import type { NexusTree } from '@pommora/core/Nexus/tree'
import type { MutateRequest } from '@pommora/core/Nexus/mutateRequest'
import { placementOf, type Personalization } from '@pommora/core/Settings/personalization'
import { INTO_EDGE, rank, type Row, walksTo } from '@pommora/uix/Interactions/reorderModel'
import { nextOrder } from '@pommora/uix/Utilities/moveItem'
import { contextDirRel } from '@pommora/core/Paths/nexusPaths'
import { entityIcon } from '../../Assets/entityIconPolicy'
import { nodesOf } from '../../Nexus/treeIndex'

type Kind = 'collection' | 'set' | 'page' | 'space' | 'contextGroup'
type Entry = {
  id: string
  kind: Kind
  path: string
  title: string
  icon: string
  depth: number
  parentId: string | null
  at: number
  pageIds: string[]
  containerIds: string[]
}
export type Index = {
  byId: Map<string, Entry>
  collectionIds: string[] // persisted in `.nexus/state.json`
  spaceIdsByContext: Map<string, string[]> // a Space reorders within its group only
  contextGroupIds: string[]
}

export function buildIndex(tree: NexusTree): Index {
  const byId = new Map<string, Entry>()
  const collectionIds: string[] = []
  for (const r of nodesOf(tree)) {
    if (r.kind !== 'collection' && r.kind !== 'set' && r.kind !== 'page') continue
    const parent = r.parents.at(-1) ?? null
    const holder = parent ? byId.get(parent.id) : undefined
    const siblings =
      r.kind === 'collection'
        ? collectionIds
        : r.kind === 'page'
          ? holder?.pageIds
          : holder?.containerIds
    byId.set(r.id, {
      id: r.id,
      kind: r.kind,
      path: r.path,
      title: r.title,
      icon: r.icon,
      depth: r.parents.length,
      parentId: parent?.id ?? null,
      at: siblings?.length ?? 0,
      pageIds: [],
      containerIds: [],
    })
    siblings?.push(r.id)
  }

  const icons = tree.personalization.defaultIcons
  const spaceIdsByContext = new Map<string, string[]>()
  const contextGroupIds: string[] = []
  for (const [at, g] of tree.contexts.entries()) {
    contextGroupIds.push(g.def.id)
    byId.set(g.def.id, {
      id: g.def.id,
      kind: 'contextGroup',
      path: contextDirRel(g.def.title),
      title: g.def.title,
      icon: entityIcon('context', g.def.icon, icons),
      depth: 0,
      parentId: null,
      at,
      pageIds: [],
      containerIds: [],
    })
    for (const [i, s] of g.spaces.entries())
      byId.set(s.id, {
        id: s.id,
        kind: 'space',
        path: s.path,
        title: s.title,
        icon: entityIcon('space', s.icon, icons),
        depth: 1,
        parentId: g.def.id,
        at: i,
        pageIds: [],
        containerIds: [],
      })
    spaceIdsByContext.set(
      g.def.id,
      g.spaces.map((s) => s.id),
    )
  }
  return { byId, collectionIds, spaceIdsByContext, contextGroupIds }
}

// A Set row's edge quarters read as beside it and its middle half as into it — the one way into a Set with no rows of its own.
const intoSetRow = (over: Row, y: number): boolean => {
  const edge = (over.bottom - over.top) * INTO_EDGE
  return y >= over.top + edge && y < over.bottom - edge
}

export type SidebarSlot = {
  parentId: string | null
  beforeId: string | null
  depth: number
  edge: number
}
export type SidebarSnapshot = {
  idx: Index
  prefs: Personalization
  dragged: Entry
  own: Row | undefined
  rows: readonly Row[]
  tops: readonly number[]
  byId: ReadonlyMap<string, Row>
  lastPage: ReadonlyMap<string, number>
  siblings: readonly Row[]
  siblingTops: readonly number[]
  group: readonly string[]
  next: string | null
}

function groupOf(idx: Index, e: Entry): readonly string[] {
  switch (e.kind) {
    case 'collection':
      return idx.collectionIds
    case 'contextGroup':
      return idx.contextGroupIds
    case 'space':
      return idx.spaceIdsByContext.get(e.parentId ?? '') ?? []
    case 'page':
      return idx.byId.get(e.parentId ?? '')?.pageIds ?? []
    case 'set':
      return idx.byId.get(e.parentId ?? '')?.containerIds ?? []
  }
}

export function sidebarSnapshot(
  idx: Index,
  prefs: Personalization,
  draggedId: string,
  all: readonly Row[],
): SidebarSnapshot | null {
  const dragged = idx.byId.get(draggedId)
  if (!dragged) return null
  const flat = dragged.kind !== 'page' && dragged.kind !== 'set'
  const rows: Row[] = []
  const byId = new Map<string, Row>()
  const lastPage = new Map<string, number>()
  const siblings: Row[] = []
  let own: Row | undefined
  for (const r of all) {
    if (r.id === draggedId) {
      own = r
      continue
    }
    rows.push(r)
    byId.set(r.id, r)
    const e = idx.byId.get(r.id)
    if (e?.kind === 'page' && e.parentId)
      lastPage.set(
        e.parentId,
        Math.max(lastPage.get(e.parentId) ?? Number.NEGATIVE_INFINITY, r.bottom),
      )
    if (flat && e?.kind === dragged.kind && e.parentId === dragged.parentId) siblings.push(r)
  }
  if (rows.length === 0) return null
  const group = groupOf(idx, dragged)
  return {
    idx,
    prefs,
    dragged,
    own,
    rows,
    tops: rows.map((r) => r.top),
    byId,
    lastPage,
    siblings,
    siblingTops: siblings.map((r) => r.top),
    group,
    next: group[dragged.at + 1] ?? null,
  }
}

const overAt = (rows: readonly Row[], tops: readonly number[], y: number): Row =>
  rows[Math.max(0, rank(tops, y) - 1)]

const first = (ids: readonly string[], draggedId: string): string | null =>
  (ids[0] === draggedId ? ids[1] : ids[0]) ?? null

const after = (ids: readonly string[], at: number, draggedId: string): string | null =>
  (ids[at + 1] === draggedId ? ids[at + 2] : ids[at + 1]) ?? null

// A slot that reproduces where the row already sits is declined — the line promises a move.
const unless = (s: SidebarSnapshot, slot: SidebarSlot): SidebarSlot | null =>
  slot.parentId === s.dragged.parentId && slot.beforeId === s.next ? null : slot

// Over its own row the drag promises nothing, so a nudge-and-release moves nothing.
export function sidebarSlot(s: SidebarSnapshot, y: number): SidebarSlot | null {
  if (s.own && y >= s.own.top && y < s.own.bottom) return null
  switch (s.dragged.kind) {
    case 'page':
      return pageSlot(s, y)
    case 'set':
      return setSlot(s, y)
    case 'collection':
    case 'space':
    case 'contextGroup':
      return siblingSlot(s, y)
  }
}

function pageSlot(s: SidebarSnapshot, y: number): SidebarSlot | null {
  const { idx, prefs, dragged } = s
  const over = overAt(s.rows, s.tops, y)
  const entry = idx.byId.get(over.id)
  if (!entry) return null
  if (entry.kind === 'page') {
    const container = entry.parentId ? idx.byId.get(entry.parentId) : undefined
    if (!container) return null
    const above = y < over.mid
    return unless(s, {
      parentId: container.id,
      beforeId: above ? entry.id : after(container.pageIds, entry.at, dragged.id),
      depth: entry.depth,
      edge: above ? over.top : over.bottom,
    })
  }
  // A sibling Set's edges are the page group's own edge, so grazing one reorders the page to that end of its group.
  const home = dragged.parentId ? idx.byId.get(dragged.parentId) : undefined
  if (entry.kind === 'set' && home && entry.parentId === home.id && !intoSetRow(over, y)) {
    const below = placementOf(prefs, home.kind) === 'bottom'
    return unless(s, {
      parentId: home.id,
      beforeId: below ? null : first(home.pageIds, dragged.id),
      depth: dragged.depth,
      edge: below ? over.top : over.bottom,
    })
  }
  const beforeId = first(entry.pageIds, dragged.id)
  return unless(s, {
    parentId: entry.id,
    beforeId,
    depth: entry.depth + 1,
    edge: (beforeId ? s.byId.get(beforeId)?.top : undefined) ?? over.bottom,
  })
}

// A Set may never land on a context or the top level; dropping into its own subtree is blocked as a cycle.
function setSlot(s: SidebarSnapshot, y: number): SidebarSlot | null {
  const { idx, prefs, dragged } = s
  const over = overAt(s.rows, s.tops, y)
  const entry = idx.byId.get(over.id)
  if (!entry) return null
  const beside = entry.kind === 'set' && !intoSetRow(over, y)
  const targetId = beside || entry.kind === 'page' ? entry.parentId : entry.id
  const target = targetId ? idx.byId.get(targetId) : undefined
  if (target?.kind !== 'collection' && target?.kind !== 'set') return null
  if (walksTo(target.id, dragged.id, (id) => idx.byId.get(id)?.parentId)) return null
  if (beside) {
    const above = y < over.mid
    return unless(s, {
      parentId: target.id,
      beforeId: above ? entry.id : after(target.containerIds, entry.at, dragged.id),
      depth: target.depth + 1,
      edge: above ? over.top : over.bottom,
    })
  }
  // An empty Sets block starts just under the header, or after the container's last page when Sets sit below its pages.
  const beforeId = first(target.containerIds, dragged.id)
  const head = s.byId.get(target.id)?.bottom ?? over.bottom
  const empty =
    placementOf(prefs, target.kind) === 'bottom' ? (s.lastPage.get(target.id) ?? head) : head
  return unless(s, {
    parentId: target.id,
    beforeId,
    depth: target.depth + 1,
    edge: (beforeId ? s.byId.get(beforeId)?.top : undefined) ?? empty,
  })
}

function siblingSlot(s: SidebarSnapshot, y: number): SidebarSlot | null {
  if (s.siblings.length === 0) return null
  const over = overAt(s.siblings, s.siblingTops, y)
  const above = y < over.mid
  return unless(s, {
    parentId: s.dragged.parentId,
    beforeId: above ? over.id : after(s.group, s.idx.byId.get(over.id)?.at ?? 0, s.dragged.id),
    depth: s.dragged.depth,
    edge: above ? over.top : over.bottom,
  })
}

export function sidebarCommit(
  { idx, dragged, group }: SidebarSnapshot,
  { parentId, beforeId }: SidebarSlot,
): MutateRequest | null {
  const order = (ids: readonly string[]): string[] => nextOrder(ids, dragged.id, beforeId)
  const to = parentId ? idx.byId.get(parentId) : undefined
  switch (dragged.kind) {
    case 'page':
      return to
        ? { op: 'movePage', path: dragged.path, newParentPath: to.path, order: order(to.pageIds) }
        : null
    case 'set':
      return to
        ? {
            op: 'moveSet',
            path: dragged.path,
            newParentPath: to.path,
            order: order(to.containerIds),
          }
        : null
    case 'collection':
      return { op: 'reorderTop', order: order(group) }
    case 'space':
      return dragged.parentId
        ? { op: 'reorderSpaces', contextId: dragged.parentId, ids: order(group) }
        : null
    case 'contextGroup':
      return { op: 'reorderContexts', ids: order(group) }
  }
}
