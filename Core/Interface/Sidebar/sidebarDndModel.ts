import type { NexusTree } from '@pommora/core/Nexus/tree'
import type { MutateRequest } from '@pommora/core/Nexus/mutateRequest'
import { placementOf, type Personalization } from '@pommora/core/Settings/personalization'
import { nearestByTop } from '@pommora/uix/Interactions/insertionDrag'
import {
  nextOrder,
  slotInGroup,
  walksTo,
  type MeasuredRow,
} from '@pommora/uix/Interactions/reorderModel'
import { contextDirRel } from '@pommora/core/Paths/nexusPaths'
import { nodesOf } from '../../Nexus/treeIndex'

type Kind = 'collection' | 'set' | 'page' | 'space' | 'contextGroup'
type Entry = {
  id: string
  kind: Kind
  path: string
  depth: number
  parentId: string | null
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
    byId.set(r.id, {
      id: r.id,
      kind: r.kind,
      path: r.path,
      depth: r.parents.length,
      parentId: parent?.id ?? null,
      pageIds: [],
      containerIds: [],
    })
    if (r.kind === 'collection') collectionIds.push(r.id)
    const holder = parent && byId.get(parent.id)
    if (holder) (r.kind === 'page' ? holder.pageIds : holder.containerIds).push(r.id)
  }

  const spaceIdsByContext = new Map<string, string[]>()
  const contextGroupIds: string[] = []
  for (const g of tree.contexts) {
    contextGroupIds.push(g.def.id)
    byId.set(g.def.id, {
      id: g.def.id,
      kind: 'contextGroup',
      path: contextDirRel(g.def.title),
      depth: 0,
      parentId: null,
      pageIds: [],
      containerIds: [],
    })
    for (const s of g.spaces)
      byId.set(s.id, {
        id: s.id,
        kind: 'space',
        path: s.path,
        depth: 1,
        parentId: g.def.id,
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
const SET_EDGE = 0.25
const intoSetRow = (over: MeasuredRow, y: number): boolean => {
  const edge = (over.bottom - over.top) * SET_EDGE
  return y >= over.top + edge && y < over.bottom - edge
}

export type SidebarSlot = { depth: number; lineY: number; commit: MutateRequest }
export type SidebarSnapshot = {
  idx: Index
  prefs: Personalization
  dragged: Entry
  draggedRow: MeasuredRow | undefined
  measured: MeasuredRow[]
  rowById: Map<string, MeasuredRow>
  siblings: MeasuredRow[]
}

export function sidebarSnapshot(
  idx: Index,
  prefs: Personalization,
  draggedId: string,
  measured: MeasuredRow[],
  draggedRow?: MeasuredRow,
): SidebarSnapshot | null {
  const dragged = idx.byId.get(draggedId)
  if (!dragged || measured.length === 0) return null
  const reorders = dragged.kind !== 'page' && dragged.kind !== 'set'
  return {
    idx,
    prefs,
    dragged,
    draggedRow,
    measured,
    rowById: new Map(measured.map((m) => [m.id, m])),
    siblings: reorders
      ? measured.filter((m) => {
          const e = idx.byId.get(m.id)
          return e?.kind === dragged.kind && e.parentId === dragged.parentId
        })
      : [],
  }
}

// Over its own row the drag promises nothing, so a nudge-and-release moves nothing.
export function sidebarSlot(s: SidebarSnapshot, y: number): SidebarSlot | null {
  const { idx, dragged, draggedRow } = s
  if (draggedRow && y >= draggedRow.top && y < draggedRow.bottom) return null
  switch (dragged.kind) {
    case 'page':
      return pageSlot(s, y)
    case 'set':
      return setSlot(s, y)
    case 'collection':
      return siblingSlot(s, y, idx.collectionIds, (order) => ({ op: 'reorderTop', order }))
    case 'space': {
      const contextId = dragged.parentId
      if (!contextId) return null
      const group = idx.spaceIdsByContext.get(contextId) ?? []
      return siblingSlot(s, y, group, (ids) => ({ op: 'reorderSpaces', contextId, ids }))
    }
    case 'contextGroup':
      return siblingSlot(s, y, idx.contextGroupIds, (ids) => ({ op: 'reorderContexts', ids }))
  }
}

const sameOrder = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i])

// A slot that reproduces where the row already sits is declined — the line promises a move.
const unless = (noop: boolean, slot: SidebarSlot): SidebarSlot | null => (noop ? null : slot)

// Into a container, the line sits at the first other child's top — the slot the drop resolves to — or at the fallback when that child is off screen.
function firstOf(
  ids: string[],
  { dragged, rowById }: SidebarSnapshot,
  fallback: number,
): { beforeId: string | null; edge: number } {
  const beforeId = ids.find((x) => x !== dragged.id) ?? null
  return { beforeId, edge: (beforeId ? rowById.get(beforeId)?.top : undefined) ?? fallback }
}

function pageSlot(s: SidebarSnapshot, y: number): SidebarSlot | null {
  const { idx, prefs, dragged } = s
  const over = nearestByTop(s.measured, y)
  const entry = idx.byId.get(over.id)
  if (!entry) return null
  const move = (newParentPath: string, order: string[]): MutateRequest => ({
    op: 'movePage',
    path: dragged.path,
    newParentPath,
    order,
  })
  if (entry.kind === 'page') {
    const container = entry.parentId ? idx.byId.get(entry.parentId) : undefined
    if (!container) return null
    const { beforeId, edge } = slotInGroup(container.pageIds, over, y, dragged.id)
    const order = nextOrder(container.pageIds, dragged.id, beforeId)
    return unless(sameOrder(order, container.pageIds), {
      depth: entry.depth,
      lineY: edge,
      commit: move(container.path, order),
    })
  }
  // A sibling Set's edges are the page group's own edge, so grazing one reorders the page to that end of its group.
  const home = dragged.parentId ? idx.byId.get(dragged.parentId) : undefined
  if (entry.kind === 'set' && home && entry.parentId === home.id && !intoSetRow(over, y)) {
    const below = placementOf(prefs, home.kind) === 'bottom'
    const before = below ? null : (home.pageIds.find((x) => x !== dragged.id) ?? null)
    const order = nextOrder(home.pageIds, dragged.id, before)
    return unless(sameOrder(order, home.pageIds), {
      depth: dragged.depth,
      lineY: below ? over.top : over.bottom,
      commit: move(home.path, order),
    })
  }
  const { beforeId, edge } = firstOf(entry.pageIds, s, over.bottom)
  const order = nextOrder(entry.pageIds, dragged.id, beforeId)
  return unless(sameOrder(order, entry.pageIds), {
    depth: entry.depth + 1,
    lineY: edge,
    commit: move(entry.path, order),
  })
}

// A Set may never land on a context or the top level; dropping into its own subtree is blocked as a cycle.
function setSlot(s: SidebarSnapshot, y: number): SidebarSlot | null {
  const { idx, prefs, dragged, rowById } = s
  const over = nearestByTop(s.measured, y)
  const overEntry = idx.byId.get(over.id)
  if (!overEntry) return null
  const beside = overEntry.kind === 'set' && !intoSetRow(over, y)
  const targetId = beside || overEntry.kind === 'page' ? overEntry.parentId : overEntry.id
  const target = targetId ? idx.byId.get(targetId) : undefined
  if (target?.kind !== 'collection' && target?.kind !== 'set') return null
  if (walksTo(target.id, dragged.id, idx.byId)) return null
  const group = target.containerIds
  // An empty Sets block starts just under the header, or after the container's last page when Sets sit below its pages.
  const into = (): { beforeId: string | null; edge: number } => {
    const pageBottoms = target.pageIds.flatMap((x) => rowById.get(x)?.bottom ?? [])
    const below = placementOf(prefs, target.kind) === 'bottom' && pageBottoms.length > 0
    const headEdge = rowById.get(target.id)?.bottom ?? over.bottom
    return firstOf(group, s, below ? Math.max(...pageBottoms) : headEdge)
  }
  const slot = beside ? slotInGroup(group, over, y, dragged.id) : into()
  const order = nextOrder(group, dragged.id, slot.beforeId)
  return unless(sameOrder(order, group), {
    depth: target.depth + 1,
    lineY: slot.edge,
    commit: { op: 'moveSet', path: dragged.path, newParentPath: target.path, order },
  })
}

function siblingSlot(
  { dragged, siblings }: SidebarSnapshot,
  y: number,
  group: string[],
  commit: (order: string[]) => MutateRequest,
): SidebarSlot | null {
  if (siblings.length === 0) return null
  const { beforeId, edge } = slotInGroup(group, nearestByTop(siblings, y), y, dragged.id)
  const order = nextOrder(group, dragged.id, beforeId)
  return unless(sameOrder(order, group), {
    depth: dragged.depth,
    lineY: edge,
    commit: commit(order),
  })
}
