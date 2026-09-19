import { contextIdsOf } from '../Contexts/contextIdentity'
import type { CollectionNode, NexusTree, SetNode } from '../Nexus/tree'
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

export interface MatrixWalk {
  input: GraphInput
  rows: ViewRow[]
  schema: PropertyDefinition[]
  setTree: SetTreeNode[]
  contextIds: string[]
}

export function matrixWalk(tree: NexusTree, reply: MatrixGraphReply): MatrixWalk {
  const pages: GraphInput['pages'] = []
  const rows: ViewRow[] = []
  const folders: GraphInput['folders'] = []
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
      rows.push(toRow(p, node.id, reply.values))
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

  const resolve = pageIndexOf(tree).resolve
  const connections: GraphInput['connections'] = []
  for (const link of reply.links) {
    const hit = resolve(link.target)
    if (hit.status === 'resolved' && hit.page)
      connections.push({ from: link.pageId, to: hit.page.id, kind: link.kind as ConnectionKind })
  }

  return {
    input: { pages, folders, spaces, connections },
    rows,
    schema: tree.registry,
    setTree: filterSetTree(tree),
    contextIds: contextIdsOf(tree),
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
