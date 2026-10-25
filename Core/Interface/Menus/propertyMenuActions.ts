import { parsePropertyAction, type PropertyMenuRow } from '../../Actions/propertyRows'
import type { NexusTree } from '../../Nexus/tree'
import { pagesByIdOf } from '../../Nexus/record'
import { pickKindOf, type PropertyDefinition } from '../../Properties/properties'
import { type PropertyValue, selectedValues } from '../../Properties/propertyValue'
import type { ColumnStyle } from '../../Properties/columnStyles'
import type { ResolvedColumn, ViewRow } from '../../Views/viewRow'
import { contextIdsOf, contextsByIdOf } from '../../Contexts/contextIdentity'
import { contextOptionsFor } from '../../Contexts/contextOptions'
import { columnLabel } from '../../Properties/columnLabel'
import { pickFileInto } from '../../Properties/Pickers/filePick'
import {
  pickedValue,
  pickGroups,
  syntheticContextDef,
} from '../../Properties/Pickers/PropertyPicker'
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

const contextOptionsOf = (
  tree: NexusTree | null,
  def: PropertyDefinition,
  excludeId?: string,
): ReturnType<typeof contextOptionsFor> | undefined =>
  def.type === 'context' && tree ? contextOptionsFor(def.id, tree, excludeId) : undefined

export function propertyMenuBranches({ tree, schema, row }: PropertyMenuTarget): {
  spaces: PropertyMenuRow[]
  properties: PropertyMenuRow[]
} {
  const contexts = contextsByIdOf(tree)
  const build = (column: ResolvedColumn, def: PropertyDefinition): PropertyMenuRow => {
    const base = { id: column.id, name: columnLabel(column, contexts) }
    const current = resolveFieldValue(row, column)
    if (def.type === 'checkbox') {
      const checked = current.kind === 'checkbox' && current.value
      return {
        ...base,
        options: [
          CHECKBOX_OPTIONS.map((o) => ({ ...o, checked: (o.value === 'true') === checked })),
        ],
      }
    }
    if (pickKindOf(def.type) === null) return base
    const selected = selectedValues(current)
    return {
      ...base,
      options: pickGroups(def, contextOptionsOf(tree, def, row.id)).map((g) =>
        g.options.map((o) => ({
          value: o.value,
          label: o.label,
          checked: selected.includes(o.value),
        })),
      ),
    }
  }
  const built = schema.map((def) => build(propertyColumn(def), def))
  return {
    spaces: [...contexts.keys()].map((id) => build(contextColumn(id), syntheticContextDef(id))),
    properties: [...built.filter((r) => r.options), ...built.filter((r) => !r.options)],
  }
}

export function runPropertyAction(
  action: string,
  {
    tree,
    schema,
    row,
    commit,
    trigger,
    styleOf,
  }: PropertyMenuTarget & {
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
  const def = column.def ?? syntheticContextDef(id)
  const current = resolveFieldValue(row, column)
  const commitValue = (next: PropertyValue | null): void => commit(column, next)
  if (value === null) {
    if (def.type === 'file') pickFileInto(def, current, null, commitValue)
    else
      useSession.getState().requestPick({
        def,
        current,
        holder: tree ? pagesByIdOf(tree).get(row.id) : undefined,
        trigger,
        commit: commitValue,
        style: styleOf?.(column),
      })
    return true
  }
  if (def.type === 'checkbox')
    commitValue(value === 'true' ? { kind: 'checkbox', value: true } : null)
  else commitValue(pickedValue(def, current, value))
  return true
}
