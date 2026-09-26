import {
  type PropertyDefinition,
  type PropertyType,
  STAMP_TYPE,
  specOf,
} from '@pommora/core/Properties/properties'
import { isBlankValue } from '@pommora/core/Properties/propertyValue'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
import { isCompact, type SavedView } from '@pommora/core/Views/views'
import { hiddenListIds } from '../visibilityModel'
import { contextIdsOf, contextsByIdOf } from '../../Contexts/contextIdentity'
import { resolveFieldValue } from '../../Properties/value'
import { columnLabel } from '../../Properties/Cells/columnLabel'
import type { ValueContext } from '../../Properties/valueContext'

/** A blank value of this type fills in place: a checkbox draws its own box, and a stamp has no fill path. */
export const fillsBlank = (type: PropertyType | 'title' | undefined): boolean => {
  const spec = specOf(type)
  return spec !== undefined && spec.origin !== 'stamp' && spec.kind !== 'checkbox'
}

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
      return {
        id,
        name: columnLabel(id, ctx.schema, contextsByIdOf(tree), capitalize),
        type,
        def,
        revealOnly: !fillsBlank(type) || !isBlankValue(resolveFieldValue(row, id, ctx.schema)),
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
