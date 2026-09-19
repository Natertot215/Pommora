import { contextIdsOf } from '../Contexts/contextIdentity'
import type { CollectionNode, NexusTree, PageNode, SetNode } from '../Nexus/tree'
import { pageIndexOf } from '../Nexus/treeIndex'
import type { PropertyDefinition } from '../Properties/properties'
import { applyFilter } from '../Views/Pipeline/filter'
import { buildSetTree, type SetTreeNode, toRow } from '../Views/Pipeline/group'
import type { ViewRow } from '../Views/viewRow'
import type { ConnectionKind, GraphInput } from './Engine/graph'
import type { MatrixConfig } from './matrixConfig'
import type { MatrixGraphReply } from './matrixGraph'

const spaceIdsOf = (values: Record<string, string[]> | undefined): string[] =>
  values ? Object.values(values).flat() : []

// Collections are the roots, so a Location rule can name a Collection as well as a Set.
export const filterSetTree = (tree: NexusTree): SetTreeNode[] =>
  tree.collections.map((c) => ({ id: c.id, children: buildSetTree(c.sets) }))

export interface MatrixTree {
  tree: NexusTree
  pages: GraphInput['pages']
  folders: GraphInput['folders']
  spaces: GraphInput['spaces']
  seats: Array<{ page: PageNode; folderId: string }>
  schema: PropertyDefinition[]
  setTree: SetTreeNode[]
  contextIds: string[]
}

export interface MatrixWalk {
  input: GraphInput
  rows: ViewRow[]
  schema: PropertyDefinition[]
  setTree: SetTreeNode[]
  contextIds: string[]
}

// The half that only the tree can change. A page save replaces the reply alone, and re-walking every collection for it is the whole nexus paid for one edit.
export function matrixTree(tree: NexusTree): MatrixTree {
  const pages: GraphInput['pages'] = []
  const folders: GraphInput['folders'] = []
  const seats: MatrixTree['seats'] = []
  const walk = (node: CollectionNode | SetNode, parentId: string | null): void => {
    folders.push({ id: node.id, title: node.title, icon: node.icon, parentId })
    for (const p of node.pages) {
      pages.push({
        id: p.id,
        title: p.title,
        icon: p.icon,
        folderId: node.id,
        spaceIds: spaceIdsOf(p.contextValues),
      })
      seats.push({ page: p, folderId: node.id })
    }
    for (const s of node.sets ?? []) walk(s, node.id)
  }
  for (const c of tree.collections) walk(c, null)

  const spaces: GraphInput['spaces'] = tree.contexts.flatMap((g) =>
    g.spaces.map((s) => ({
      id: s.id,
      title: s.title,
      icon: s.icon,
      spaceIds: spaceIdsOf(s.contextValues),
    })),
  )

  return {
    tree,
    pages,
    folders,
    spaces,
    seats,
    schema: tree.registry,
    setTree: filterSetTree(tree),
    contextIds: contextIdsOf(tree),
  }
}

export function matrixWalk(held: MatrixTree, reply: MatrixGraphReply): MatrixWalk {
  const resolve = pageIndexOf(held.tree).resolve
  const connections: GraphInput['connections'] = []
  for (const link of reply.links) {
    const hit = resolve(link.target)
    if (hit.status === 'resolved' && hit.page)
      connections.push({ from: link.pageId, to: hit.page.id, kind: link.kind as ConnectionKind })
  }

  return {
    input: { pages: held.pages, folders: held.folders, spaces: held.spaces, connections },
    rows: held.seats.map((s) => toRow(s.page, s.folderId, reply.values)),
    schema: held.schema,
    setTree: held.setTree,
    contextIds: held.contextIds,
  }
}

export function matrixVisible(
  walk: MatrixWalk,
  filter: MatrixConfig['filter'],
): ReadonlySet<string> | null {
  if (!filter.enabled || !filter.rules) return null
  const kept = applyFilter(walk.rows, filter.rules, walk.schema, walk.setTree, walk.contextIds)
  return new Set(kept.map((r) => r.id))
}
