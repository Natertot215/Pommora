import { identityOf } from '../Contexts/contextIdentity'
import type { CollectionNode, NexusTree, PageNode, SetNode } from '../Nexus/tree'
import { entityMemo } from '../Nexus/tree'
import { pageIndexOf } from '../Nexus/record'
import { spaceRowOf } from '../Views/pageRow'
import type { PropertyDefinition } from '../Properties/properties'
import { linkKeysOf } from '../Properties/validation'
import { resolveColumn } from '../Views/Pipeline/columns'
import { applyFilter } from '../Views/Pipeline/filter'
import { toRow } from '../Views/Pipeline/group'
import type { ViewRow } from '../Views/viewRow'
import {
  type FilterRule,
  filtering,
  mapRules,
  OPERANDLESS_OPS,
  type StandaloneFilter,
} from '../Views/filterRules'
import type { GraphInput } from './Engine/graph'
import type { MatrixGraphReply } from './matrixGraph'

const spaceIdsOf = (values: Record<string, string[]> | undefined): string[] =>
  values ? Object.values(values).flat() : []

export interface MatrixTree {
  pages: GraphInput['pages']
  folders: GraphInput['folders']
  spaces: GraphInput['spaces']
  seats: Array<{ page: PageNode; folderId: string }>
}

// The half that only the tree can change. A page save replaces the reply alone, and re-walking every collection for it is the whole nexus paid for one edit.
export const matrixTree = entityMemo([(t) => t.contexts], (tree): MatrixTree => {
  const pages: GraphInput['pages'] = []
  const folders: GraphInput['folders'] = []
  const seats: MatrixTree['seats'] = []
  const walk = (node: CollectionNode | SetNode, parentId: string | null): void => {
    folders.push({ id: node.id, title: node.title, parentId })
    for (const p of node.pages) {
      pages.push({
        id: p.id,
        title: p.title,
        folderId: node.id,
        spaceIds: spaceIdsOf(p.contextValues),
      })
      seats.push({ page: p, folderId: node.id })
    }
    for (const s of node.sets ?? []) walk(s, node.id)
  }
  for (const c of tree.collections) walk(c, null)

  const spaces: GraphInput['spaces'] = tree.contexts.flatMap((g) =>
    g.spaces.map((s) => ({ id: s.id, title: s.title, spaceIds: spaceIdsOf(s.contextValues) })),
  )

  return { pages, folders, spaces, seats }
})

export function matrixConnections(
  tree: NexusTree,
  links: MatrixGraphReply['links'],
): GraphInput['connections'] {
  const resolve = pageIndexOf(tree).resolve
  // A value row relates only under a key that holds links; asked here, with the registry in hand, so a property created, renamed, or synced over a held key changes the graph without a re-index. The rule runs before the dedupe, so a Number key never shadows a Link key naming the same page.
  const holds = linkKeysOf(tree.config.registry)
  const seen = new Set<string>()
  const connections: GraphInput['connections'] = []
  for (const link of links) {
    if (link.kind === 'value' && !holds(link.key)) continue
    const hit = resolve(link.target)
    if (hit.status !== 'resolved' || !hit.page) continue
    const id = `${link.pageId}\0${link.kind}\0${hit.page.id}`
    if (seen.has(id)) continue
    seen.add(id)
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
  const column = resolveColumn(rule.property_id, schema, contextIds)
  switch (column?.kind) {
    case 'title':
    case 'context':
      return true
    case undefined:
    case 'stamp':
      return false
    case 'property':
      return (
        OPERANDLESS_OPS.has(rule.op) ||
        (column.def !== undefined && Object.hasOwn(row.frontmatter, column.def.key))
      )
  }
}

// Rows exist only for a filter to read, so a Matrix with none set builds none, nor does one whose values have yet to land.
export function matrixVisible(
  tree: NexusTree,
  values: MatrixGraphReply['values'],
  filter: StandaloneFilter,
): ReadonlySet<string> | null {
  if (!values || !filtering(filter)) return null
  const { seats } = matrixTree(tree)
  const rules = filter.rules
  const schema = tree.config.registry
  const identity = identityOf(tree)
  const rows = seats.map((s) => toRow(s.page, s.folderId, values, tree.config.pageMetadata))
  // Collections are the roots, so a Location rule can name a Collection as well as a Set.
  const ids = new Set(applyFilter(rows, rules, schema, tree.collections, identity).map((r) => r.id))
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
        answers(row, rule, schema, identity.contextIds) ? rule : null,
      )
      if (applyFilter([row], pruned, schema, [], identity).length > 0) ids.add(row.id)
    }
  return ids
}
