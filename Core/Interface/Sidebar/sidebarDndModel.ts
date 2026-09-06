import type { NexusTree } from '@pommora/core/Nexus/tree'
import { contextDirRel } from '@pommora/core/Locations/nexusPaths'
import { nodesOf } from '../../Session/treeIndex'

export type Kind = 'collection' | 'set' | 'page' | 'space' | 'contextGroup'
export type Entry = {
  id: string
  kind: Kind
  path: string
  depth: number
  parentId: string | null
  parentPath: string | null
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
      parentPath: parent?.path ?? null,
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
      parentPath: null,
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
        parentPath: null,
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

export function setContainerOf(entry: Entry, idx: Index): Entry | null {
  switch (entry.kind) {
    case 'collection':
      return entry
    case 'set':
      return entry.parentId ? (idx.byId.get(entry.parentId) ?? null) : null
    case 'page': {
      const parent = entry.parentId ? (idx.byId.get(entry.parentId) ?? null) : null
      if (!parent) return null
      return parent.kind === 'collection' || parent.kind === 'set' ? parent : null
    }
    default:
      return null
  }
}

export function isSelfOrDescendant(targetId: string, ancestorId: string, idx: Index): boolean {
  let cur: string | null = targetId
  while (cur) {
    if (cur === ancestorId) return true
    cur = idx.byId.get(cur)?.parentId ?? null
  }
  return false
}
