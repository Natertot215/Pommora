// One allowlist — in propertyOrder AND not hidden — so a property or Context created after a view stays hidden until the user reveals it: creation never visually changes an existing view.

import type { SavedView } from '../views'
import {
  FILEDATA,
  FILEDATA_BY_ID,
  PROPERTY_TYPES,
  type PropertyDefinition,
  type ResolvedColumn,
} from '../../Properties/properties'
import { holdsValue } from '../../Properties/fieldValue'
import type { ViewRow } from '../viewRow'
import { contextIdsOf } from '../../Contexts/contextIdentity'
import type { NexusTree } from '../../Nexus/tree'
import { spaceNodeOf } from '../../Nexus/treeIndex'
import { fullOrderIndex, resolveRowOrder } from '@pommora/uix/Utilities/moveItem'

const TITLE: ResolvedColumn = { id: FILEDATA.title.id, kind: 'title', type: 'title' }

export const propertyColumn = (def: PropertyDefinition): ResolvedColumn => ({
  id: def.id,
  kind: 'property',
  type: def.type,
  def,
})

export const contextColumn = (id: string): ResolvedColumn => ({
  id,
  kind: 'context',
  type: 'context',
})

/** The one classification of a column id, done once per view pass; nothing for Location, which is never a column, or for an id neither the schema nor the registry holds. */
export function resolveColumn(
  id: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): ResolvedColumn | undefined {
  if (id === TITLE.id) return TITLE
  const stamp = FILEDATA_BY_ID.get(id)?.type
  if (stamp) return { id, kind: 'stamp', type: stamp }
  if (contextIds.includes(id)) return contextColumn(id)
  const def = schema.find((d) => d.id === id)
  return def && propertyColumn(def)
}

export type ItemColumns = Record<'contexts' | 'properties', ResolvedColumn[]>

/** Every Context and property an item can hold, in the order its panel lists them: the Nexus's Context order and its schema's, with a Space's own row order over both. */
export function itemColumns(
  tree: NexusTree | null,
  schema: PropertyDefinition[],
  itemId: string,
): ItemColumns {
  const rowOrder = spaceNodeOf(tree, itemId)?.rowOrder ?? []
  const idOf = (c: ResolvedColumn): string => c.id
  return {
    contexts: resolveRowOrder(contextIdsOf(tree).map(contextColumn), idOf, [
      ...rowOrder,
      ...(tree?.config.order.contexts ?? []),
    ]),
    properties: resolveRowOrder(schema.map(propertyColumn), idOf, rowOrder),
  }
}

/** The columns an item draws beside its title: all of them, or, where blanks drop, those holding a value or drawing their blank, as a checkbox does. */
export function drawnColumns(
  row: ViewRow,
  columns: ResolvedColumn[],
  dropBlanks: boolean,
): ResolvedColumn[] {
  return columns.filter(
    (c) =>
      c.kind !== 'title' &&
      (!dropBlanks || holdsValue(row, c) || PROPERTY_TYPES[c.type].blankDraws === true),
  )
}

/** What an item's Add list offers: the columns it doesn't draw, those it can fill ahead of those it only shows. */
export function addColumns(item: ItemColumns, row: ViewRow, drawn: ResolvedColumn[]): ItemColumns {
  const seen = new Set(drawn.map((c) => c.id))
  const listed = (columns: ResolvedColumn[]): ResolvedColumn[] => {
    const rest = columns.filter((c) => !seen.has(c.id))
    return [...rest.filter((c) => !holdsValue(row, c)), ...rest.filter((c) => holdsValue(row, c))]
  }
  return { contexts: listed(item.contexts), properties: listed(item.properties) }
}

/** Whether an item's Add list would hold anything: it draws fewer columns than its Contexts and properties number, a count standing in since a memoized row can't afford building the list each render. */
export const addable = (
  drawn: ResolvedColumn[],
  schema: PropertyDefinition[],
  contexts: ReadonlyMap<string, unknown>,
): boolean => drawn.filter((c) => c.kind !== 'stamp').length < schema.length + contexts.size

export const shownIn = (view: SavedView): ((id: string) => boolean) => {
  const ordered = new Set(view.property_order)
  const hidden = new Set(view.hidden_properties)
  return (id) => ordered.has(id) && !hidden.has(id)
}

/** Context columns are default-OFF — they render only when the view's property_order explicitly reveals them. */
export function resolveColumns(
  view: SavedView,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): ResolvedColumn[] {
  const shown = shownIn(view)
  const columns = new Map<string, ResolvedColumn>()
  for (const id of view.property_order) {
    if (!shown(id) || columns.has(id)) continue
    const column = resolveColumn(id, schema, contextIds)
    if (column) columns.set(id, column)
  }
  return columns.has(TITLE.id) ? [...columns.values()] : [TITLE, ...columns.values()]
}

export function hiddenListIds(
  view: SavedView,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): string[] {
  const shown = shownIn(view)
  const hidden = (id: string): boolean => !shown(id)
  return [
    ...contextIds.filter(hidden),
    ...schema.map((d) => d.id).filter(hidden),
    ...[FILEDATA.createdAt.id, FILEDATA.modifiedAt.id].filter(hidden),
  ]
}

type VisibilityPatch = Pick<SavedView, 'property_order' | 'hidden_properties'>

export function placeInShown(
  view: SavedView,
  shownIds: string[],
  id: string,
  toIndex: number,
): VisibilityPatch {
  const order = [
    ...shownIds.filter((x) => !view.property_order.includes(x)),
    ...view.property_order,
  ]
  const next = order.filter((x) => x !== id)
  next.splice(fullOrderIndex(order, shownIds, id, toIndex), 0, id)
  return {
    property_order: next,
    hidden_properties: view.hidden_properties.filter((x) => x !== id),
  }
}

/** Hide a shown property — flag it, never move it: its property_order slot is its remembered spot, so a later unhide restores it where it was. */
export function hideShown(view: SavedView, id: string): Pick<SavedView, 'hidden_properties'> {
  return {
    hidden_properties: view.hidden_properties.includes(id)
      ? view.hidden_properties
      : [...view.hidden_properties, id],
  }
}

export function unhide(view: SavedView, id: string): VisibilityPatch {
  return {
    property_order: view.property_order.includes(id)
      ? view.property_order
      : [...view.property_order, id],
    hidden_properties: view.hidden_properties.filter((x) => x !== id),
  }
}
