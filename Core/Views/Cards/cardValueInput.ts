import {
  type PropertyDefinition,
  type PropertyType,
  STAMP_TYPE,
} from '@pommora/core/Properties/properties'
import { isBlankValue } from '@pommora/core/Properties/propertyValue'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
import { isCompact, type SavedView } from '@pommora/core/Views/views'
import { hiddenListIds } from '../hiddenFrameModel'
import { contextIdsOf, contextsByIdOf } from '../../Properties/contextIdentity'
import { resolveFieldValue } from '../../Properties/value'
import { columnLabel } from '../../Properties/Cells/columnLabel'
import type { ValueContext } from '../../Properties/valueContext'

/** Checkbox is deliberately excluded from the pane split (its box on the card is the toggle); Context columns pane via contextOptions rather than this set. */
const ADDABLE_TYPES: ReadonlySet<string> = new Set([
  'select',
  'status',
  'multi_select',
  'datetime',
  'number',
  'url',
  'file',
  'checkbox',
])

/** Compact's label-less flow can't render an empty value, so it drops blanks — EXCEPT a checkbox, whose unchecked box is the on-card toggle. */
export function shownColumnsFor(
  row: ViewRow,
  columns: ResolvedColumn[],
  ctx: ValueContext,
  compactLayout: boolean,
): ResolvedColumn[] {
  return columns.filter(
    (c) =>
      c.kind !== 'title' &&
      (!compactLayout ||
        !isBlankValue(resolveFieldValue(row, c.id, ctx.schema)) ||
        ctx.schema.find((d) => d.id === c.id)?.type === 'checkbox'),
  )
}

export function addEntriesFor(
  row: ViewRow,
  view: SavedView,
  ctx: ValueContext,
  columns: ResolvedColumn[],
  tree: NexusTree | null = null,
  capitalize = false,
): AddEntry[] {
  const contextIds = contextIdsOf(tree)
  const shownIds = new Set(shownColumnsFor(row, columns, ctx, isCompact(view)).map((c) => c.id))
  const bySchema = new Map(ctx.schema.map((d) => [d.id, d]))
  const ids = [
    ...new Set([
      ...hiddenListIds(view, ctx.schema, contextIds),
      ...ctx.schema.map((d) => d.id),
      ...columns.filter((c) => c.kind === 'context').map((c) => c.id),
    ]),
  ]
  return ids
    .filter((id) => !shownIds.has(id))
    .map((id) => {
      const def = bySchema.get(id) ?? null
      const type = STAMP_TYPE[id] ?? def?.type ?? 'context'
      const blank = isBlankValue(resolveFieldValue(row, id, ctx.schema))
      const contextShaped = contextIds.includes(id) || type === 'context'
      const revealOnly = contextShaped
        ? !blank
        : !def || !ADDABLE_TYPES.has(type) || type === 'checkbox' || !blank
      return {
        id,
        name: columnLabel(id, ctx.schema, contextsByIdOf(tree), capitalize),
        type,
        def,
        revealOnly,
      }
    })
}

export const addColumn = (id: string, tree: NexusTree | null = null): ResolvedColumn => ({
  id,
  kind: contextIdsOf(tree).includes(id) ? 'context' : 'property',
})

export type AddEntry = {
  id: string
  name: string
  type: PropertyType
  def: PropertyDefinition | null
  revealOnly: boolean
}

export function orderAddableEntries(entries: AddEntry[]): AddEntry[] {
  return [...entries.filter((e) => !e.revealOnly), ...entries.filter((e) => e.revealOnly)]
}
