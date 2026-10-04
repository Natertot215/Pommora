import { contextIdsOf } from '../Contexts/contextIdentity'
import type { CollectionNode, NexusTree, PageNode, SetNode } from '../Nexus/tree'
import { pageIndexOf } from '../Nexus/treeIndex'
import { heldKey } from '../Files/heldKeys'
import { spaceRowOf } from '../Properties/pageRow'
import { type PropertyDefinition, specOf } from '../Properties/properties'
import { declaredType } from '../Properties/value'
import { applyFilter } from '../Views/Pipeline/filter'
import { buildSetTree, type SetTreeNode, toRow } from '../Views/Pipeline/group'
import type { ViewRow } from '../Views/viewRow'
import { type FilterRule, mapRules, OPERANDLESS_OPS } from '../Views/views'
import type { GraphInput } from './Engine/graph'
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
        icon: tree.config.pageMetadata[p.id]?.icon,
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

  return { tree, pages, folders, spaces, seats }
}

export function matrixConnections(
  held: MatrixTree,
  links: MatrixGraphReply['links'],
): GraphInput['connections'] {
  const resolve = pageIndexOf(held.tree).resolve
  const connections: GraphInput['connections'] = []
  for (const link of links) {
    const hit = resolve(link.target)
    if (hit.status === 'resolved' && hit.page)
      connections.push({ from: link.pageId, to: hit.page.id, kind: link.kind })
  }
  return connections
}

function answers(
  row: ViewRow,
  rule: FilterRule,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): boolean {
  const t = declaredType(rule.property_id, schema, contextIds)
  if (t === 'title') return true
  switch (specOf(t)?.origin) {
    case undefined:
    case 'stamp':
      return false
    case 'context':
      return true
    case 'user': {
      if (OPERANDLESS_OPS.has(rule.op)) return true
      const name = schema.find((d) => d.id === rule.property_id)?.name
      return name !== undefined && heldKey(row.frontmatter, name) !== undefined
    }
  }
}

// Rows exist only for a filter to read, so a Matrix with none set builds none.
export function matrixVisible(
  held: MatrixTree,
  values: MatrixGraphReply['values'],
  filter: MatrixConfig['filter'],
): ReadonlySet<string> | null {
  if (!filter.enabled || !filter.rules) return null
  const { tree } = held
  const rules = filter.rules
  const schema = tree.config.registry
  const contextIds = contextIdsOf(tree)
  const rows = held.seats.map((s) => toRow(s.page, s.folderId, values, tree.config.pageMetadata))
  const ids = new Set(
    applyFilter(rows, rules, schema, filterSetTree(tree), contextIds).map((r) => r.id),
  )
  // Self-membership belongs to the filter and stays out of spaceRowOf, which the panel and the menus read.
  for (const g of tree.contexts)
    for (const s of g.spaces) {
      const own = spaceRowOf(tree, s)
      const row = {
        ...own,
        contextValues: {
          ...own.contextValues,
          [g.def.id]: [...(own.contextValues?.[g.def.id] ?? []), s.id],
        },
      }
      const pruned = mapRules(rules, (rule) =>
        answers(row, rule, schema, contextIds) ? rule : null,
      )
      if (applyFilter([row], pruned, schema, [], contextIds).length > 0) ids.add(row.id)
    }
  return ids
}
