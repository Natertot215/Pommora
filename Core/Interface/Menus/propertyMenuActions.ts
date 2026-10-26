import { parsePropertyAction, type PropertyMenuRow } from '../../Actions/propertyRows'
import type { NexusTree } from '../../Nexus/tree'
import { pagesByIdOf } from '../../Nexus/record'
import { pickKindOf, type PropertyDefinition } from '../../Properties/properties'
import { checkboxValue, type PropertyValue, selectedValues } from '../../Properties/propertyValue'
import type { ColumnStyle } from '../../Properties/columnStyles'
import type { ResolvedColumn, ViewRow } from '../../Views/viewRow'
import { contextIdsOf, contextsByIdOf } from '../../Contexts/contextIdentity'
import { contextOptionsFor } from '../../Contexts/contextOptions'
import { columnLabel } from '../../Properties/columnDisplay'
import { pickedValue, pickGroups } from '../../Properties/Pickers/pickModel'
import { resolveFieldValue } from '../../Properties/fieldValue'
import { useSession } from '../../Session/store'
import { contextColumn, propertyColumn, resolveColumn } from '../../Views/Pipeline/columns'

const CHECKBOX_OPTIONS = [
  { value: 'true', label: 'Check' },
  { value: '', label: 'Uncheck' },
] as const

export interface PropertyMenuTarget {
  tree: NexusTree | null
  schema: PropertyDefinition[]
  row: ViewRow
}

export function propertyMenuBranches({ tree, schema, row }: PropertyMenuTarget): {
  spaces: PropertyMenuRow[]
  properties: PropertyMenuRow[]
} {
  const contexts = contextsByIdOf(tree)
  const build = (column: ResolvedColumn): PropertyMenuRow => {
    const base = { id: column.id, name: columnLabel(column, contexts) }
    const current = resolveFieldValue(row, column)
    if (column.type === 'checkbox') {
      const checked = current.kind === 'checkbox' && current.value
      return {
        ...base,
        options: [
          CHECKBOX_OPTIONS.map((o) => ({ ...o, checked: (o.value === 'true') === checked })),
        ],
      }
    }
    if (pickKindOf(column.type) === null) return base
    const selected = selectedValues(current)
    return {
      ...base,
      options: pickGroups(column, contextOptionsFor(column, tree, row.id)).map((g) =>
        g.options.map((o) => ({
          value: o.value,
          label: o.label,
          checked: selected.includes(o.value),
        })),
      ),
    }
  }
  const built = schema.map((def) => build(propertyColumn(def)))
  return {
    spaces: [...contexts.keys()].map((id) => build(contextColumn(id))),
    properties: [...built.filter((r) => r.options), ...built.filter((r) => !r.options)],
  }
}

export function runPropertyAction(
  action: string,
  {
    tree,
    schema,
    row,
    rowOf,
    commit,
    trigger,
    styleOf,
  }: PropertyMenuTarget & {
    rowOf: () => ViewRow | undefined
    commit: (column: ResolvedColumn, value: PropertyValue | null) => void
    trigger: HTMLElement
    styleOf?: (column: ResolvedColumn) => ColumnStyle
  },
): boolean {
  const parsed = parsePropertyAction(action)
  if (!parsed) return false
  const { id, value } = parsed
  const column = resolveColumn(id, schema, contextIdsOf(tree))
  // The property can leave between the menu opening and the pick; the pick then writes nothing.
  if (!column) return true
  const current = resolveFieldValue(row, column)
  const pick = pickKindOf(column.type)
  if (value === null)
    useSession.getState().requestPick({
      rowOf,
      column,
      holder: tree ? pagesByIdOf(tree).get(row.id) : undefined,
      trigger,
      commit,
      style: styleOf?.(column),
    })
  else if (column.type === 'checkbox') commit(column, checkboxValue(value === 'true'))
  else if (pick) commit(column, pickedValue(pick, current, value))
  return true
}
