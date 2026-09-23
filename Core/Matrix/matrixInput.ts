import { contextIdsOf } from '../Contexts/contextIdentity'
import type { CollectionNode, NexusTree, PageNode, SetNode } from '../Nexus/tree'
import { pageIndexOf } from '../Nexus/treeIndex'
import { spaceRowOf } from '../Properties/pageRow'
import type { PropertyDefinition } from '../Properties/properties'
import { declaredType } from '../Properties/value'
import { applyFilter, FILTER_OPS } from '../Views/Pipeline/filter'
import { buildSetTree, type SetTreeNode, toRow } from '../Views/Pipeline/group'
import type { ViewRow } from '../Views/viewRow'
import type { FilterGroup, FilterRule } from '../Views/views'
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
  spaceRows: ViewRow[]
  schema: PropertyDefinition[]
  setTree: SetTreeNode[]
  contextIds: string[]
}

export interface MatrixWalk {
  input: GraphInput
  rows: ViewRow[]
  spaceRows: ViewRow[]
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
        icon: tree.pageMetadata[p.id]?.icon,
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

  // Self-membership belongs to the filter and stays out of spaceRowOf, which the panel and the menus read.
  const spaceRows: ViewRow[] = tree.contexts.flatMap((g) =>
    g.spaces.map((s) => {
      const row = spaceRowOf(tree, s)
      return {
        ...row,
        contextValues: {
          ...row.contextValues,
          [g.def.id]: [...(row.contextValues?.[g.def.id] ?? []), s.id],
        },
      }
    }),
  )

  return {
    tree,
    pages,
    folders,
    spaces,
    seats,
    spaceRows,
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
    rows: held.seats.map((s) => toRow(s.page, s.folderId, reply.values, held.tree.pageMetadata)),
    spaceRows: held.spaceRows,
    schema: held.schema,
    setTree: held.setTree,
    contextIds: held.contextIds,
  }
}

const ASKS_ABSENCE = new Set<string>([FILTER_OPS.isEmpty, FILTER_OPS.isNotEmpty])

function answers(
  row: ViewRow,
  rule: FilterRule,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): boolean {
  switch (declaredType(rule.property_id, schema, contextIds)) {
    case undefined:
    case 'created_time':
    case 'last_edited_time':
      return false
    case 'title':
    case 'context':
      return true
    default: {
      if (ASKS_ABSENCE.has(rule.op)) return true
      const name = schema.find((d) => d.id === rule.property_id)?.name
      return name !== undefined && name in row.frontmatter
    }
  }
}

function pruneFilterFor(
  row: ViewRow,
  filter: FilterGroup,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): FilterGroup {
  return {
    match: filter.match,
    rules: filter.rules.flatMap<FilterRule | FilterGroup>((node) =>
      'rules' in node
        ? [pruneFilterFor(row, node, schema, contextIds)]
        : answers(row, node, schema, contextIds)
          ? [node]
          : [],
    ),
  }
}

export function matrixVisible(
  walk: MatrixWalk,
  filter: MatrixConfig['filter'],
): ReadonlySet<string> | null {
  if (!filter.enabled || !filter.rules) return null
  const rules = filter.rules
  const ids = new Set(
    applyFilter(walk.rows, rules, walk.schema, walk.setTree, walk.contextIds).map((r) => r.id),
  )
  for (const row of walk.spaceRows) {
    const pruned = pruneFilterFor(row, rules, walk.schema, walk.contextIds)
    if (applyFilter([row], pruned, walk.schema, [], walk.contextIds).length > 0) ids.add(row.id)
  }
  return ids
}
