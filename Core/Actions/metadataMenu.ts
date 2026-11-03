import { type ActionItem, joinGroups } from './menuModel'
import type { MetadataAction } from './pageMenu'
import type { NexusTree } from '../Nexus/tree'
import { pickKindOf, type PropertyDefinition } from '../Properties/properties'
import { checkboxValue, type PropertyValue, selectedValues } from '../Properties/propertyValue'
import type { ColumnStyle } from '../Properties/columnStyles'
import type { ResolvedColumn, ViewRow } from '../Views/viewRow'
import { contextIdsOf, contextsByIdOf } from '../Contexts/contextIdentity'
import { contextOptionsFor } from '../Contexts/contextOptions'
import { columnLabel, GROUP_LABELS } from '../Properties/columnDisplay'
import { pickedValue, pickGroups } from '../Properties/Pickers/pickModel'
import { resolveFieldValue } from '../Properties/fieldValue'
import { useSession } from '../Session/store'
import { itemColumns, resolveColumn } from '../Views/Pipeline/columns'

const PREFIX = 'prop:'

const CHECKBOX_OPTIONS = [
  { id: 'true', label: 'Check' },
  { id: '', label: 'Uncheck' },
] as const

export interface MetadataTarget {
  row: ViewRow
  schema: PropertyDefinition[]
  rowOf: () => ViewRow | undefined
  commit: (column: ResolvedColumn, value: PropertyValue | null) => void
  trigger: HTMLElement
  styleOf?: (column: ResolvedColumn) => ColumnStyle
}

export function metadataBranches(
  { row, schema }: MetadataTarget,
  tree: NexusTree | null,
): ActionItem<MetadataAction>[] {
  const contexts = contextsByIdOf(tree)
  const branchRow = (column: ResolvedColumn): ActionItem<MetadataAction> => {
    const label = columnLabel(column, contexts)
    const leaf = `${PREFIX}${column.id}` as const
    const option = (
      o: { id: string; label: string },
      checked: boolean,
    ): ActionItem<MetadataAction> => ({ label: o.label, action: `${leaf}:${o.id}`, checked })
    const current = resolveFieldValue(row, column)
    if (column.type === 'checkbox') {
      const checked = current.kind === 'checkbox' && current.value
      return {
        label,
        submenu: CHECKBOX_OPTIONS.map((o) => option(o, (o.id === 'true') === checked)),
      }
    }
    if (pickKindOf(column.type) === null) return { label, action: leaf }
    const selected = selectedValues(current)
    return {
      label,
      submenu: joinGroups(
        pickGroups(column, contextOptionsFor(column, tree, row.id)).map((g) =>
          g.options.map((o) => option(o, selected.includes(o.id))),
        ),
      ),
    }
  }
  const item = itemColumns(tree, schema, row.id)
  return (['contexts', 'properties'] as const).flatMap((key) =>
    item[key].length > 0 ? [{ label: GROUP_LABELS[key], submenu: item[key].map(branchRow) }] : [],
  )
}

export function runMetadataAction(
  action: string,
  { row, schema, rowOf, commit, trigger, styleOf }: MetadataTarget,
): boolean {
  if (!action.startsWith(PREFIX)) return false
  const [id, ...rest] = action.slice(PREFIX.length).split(':')
  const value = rest.length > 0 ? rest.join(':') : null
  const s = useSession.getState()
  const column = resolveColumn(id, schema, contextIdsOf(s.tree))
  // The property can leave between the menu opening and the pick; the pick then writes nothing.
  if (!column) return true
  const pick = pickKindOf(column.type)
  if (value === null) s.requestPick({ rowOf, column, trigger, commit, style: styleOf?.(column) })
  else if (column.type === 'checkbox') commit(column, checkboxValue(value === 'true'))
  else if (pick) commit(column, pickedValue(pick, resolveFieldValue(row, column), value))
  return true
}
