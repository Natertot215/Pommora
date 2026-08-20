import type { PropertyDefinition, PropertyType } from '@shared/properties'
import { isBlankValue, type PropertyValue } from '@shared/propertyValue'
import type { NexusTree, ResolvedColumn, ViewRow } from '@shared/types'
import { isCompact, type SavedView } from '@shared/views'
import { hiddenListIds } from '@renderer/Components/Detail/hiddenPaneModel'
import { contextIdsOf, contextsByIdOf } from '../pipeline/contextIdentity'
import { resolveFieldValue } from '../pipeline/value'
import { columnLabel } from '../Table/columnLabel'
import type { ResolveContext } from '../Table/resolveContext'
import { urlValueFromEdit } from '@shared/linkValue'
import { resolveTitle } from '@renderer/linkResolve'

/** The kinds whose BLANK entries drill into a value pane. Checkbox is deliberately excluded from the
 *  pane split (its box on the card is the toggle — an add-list pick just reveals it); Context columns
 *  pane via contextOptions rather than this set. */
export const ADDABLE_TYPES: ReadonlySet<string> = new Set([
  'select',
  'status',
  'multi_select',
  'datetime',
  'number',
  'url',
  'checkbox',
])

/** The card's VISIBLE property columns. Standard keeps a blank one as a labeled, fillable row;
 *  Compact's label-less flow can't render an empty value, so it drops blanks — EXCEPT a checkbox,
 *  whose (unchecked) box is the on-card toggle. */
export function shownColumnsFor(
  row: ViewRow,
  columns: ResolvedColumn[],
  ctx: ResolveContext,
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

/** The add menu: everything NOT currently shown — the Visibility hidden list, any schema prop that's
 *  revealed-but-blank (Compact drops it, so it stays addable to re-fill), and Compact-suppressed blank
 *  Context columns. Context-shaped entries pane when blank (the picker fills in place); filled entries reveal. */
export function addEntriesFor(
  row: ViewRow,
  view: SavedView,
  ctx: ResolveContext,
  columns: ResolvedColumn[],
  tree: NexusTree | null = null,
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
      const type = def?.type ?? 'context'
      const blank = isBlankValue(resolveFieldValue(row, id, ctx.schema))
      const contextShaped = contextIds.includes(id) || type === 'context'
      const revealOnly = contextShaped
        ? !blank
        : !def || !ADDABLE_TYPES.has(type) || type === 'checkbox' || !blank
      return { id, name: columnLabel(id, ctx.schema, contextsByIdOf(tree)), type, def, revealOnly }
    })
}

/** An add-menu entry's column ref: a registry Context id routes as a Context column (writeContextValue),
 *  everything else as a property — the same split commitValue makes for on-card values. */
export const addColumn = (id: string, tree: NexusTree | null = null): ResolvedColumn => ({
  id,
  kind: contextIdsOf(tree).includes(id) ? 'context' : 'property',
})

/** One row of the card add-property menu. `def` is null for a reserved Context or Modified id,
 *  which carries no schema entry. */
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

/** Parse a text-editor string for a number/url property into its committable value. `null` clears
 *  (empty input); `undefined` means invalid — don't commit. Shared by the card value editor and the
 *  add-picker's value pane so both parse identically. */
export function parseEditorValue(
  type: string | undefined,
  raw: string,
): PropertyValue | null | undefined {
  const trimmed = raw.trim()
  if (type === 'number') {
    if (trimmed === '') return null
    const n = Number.parseFloat(trimmed)
    return Number.isNaN(n) ? undefined : { kind: 'number', value: n }
  }
  if (type === 'url') return urlValueFromEdit(trimmed, undefined, resolveTitle)
  return undefined
}
