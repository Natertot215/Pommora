import { parsePropertyAction, type PropertyMenuRow } from '@pommora/core/Actions/propertyRows'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import {
  isOptionsKind,
  type PropertyDefinition,
  type PropertyType,
} from '@pommora/core/Properties/properties'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
import { contextIdsOf, contextsByIdOf } from '../../Contexts/contextIdentity'
import { contextOptionsFor } from '../../Contexts/contextOptions'
import { columnLabel } from '../../Properties/Cells/columnLabel'
import { pickFileInto } from '../../Properties/Pickers/filePick'
import {
  pickedValue,
  pickShape,
  selectedValues,
  syntheticContextDef,
} from '../../Properties/Pickers/PropertyPicker'
import { resolveFieldValue } from '../../Properties/value'
import { useSession } from '../../Session/store'

const STAMP_TYPES: ReadonlySet<PropertyType> = new Set(['created_time', 'last_edited_time'])

const CHECKBOX_OPTIONS = [
  { value: 'true', label: 'Check' },
  { value: '', label: 'Uncheck' },
] as const

export interface PropertyMenuTarget {
  tree: NexusTree | null
  schema: PropertyDefinition[]
  row: ViewRow
  capitalize?: boolean
}

const contextOptionsOf = (
  tree: NexusTree | null,
  def: PropertyDefinition,
): ReturnType<typeof contextOptionsFor> | undefined =>
  def.type === 'context' && tree ? contextOptionsFor(def.id, tree) : undefined

export function propertyMenuRows({
  tree,
  schema,
  row,
  capitalize = false,
}: PropertyMenuTarget): PropertyMenuRow[] {
  const contexts = contextsByIdOf(tree)
  const build = (id: string, def: PropertyDefinition): PropertyMenuRow => {
    const base = { id, name: columnLabel(id, schema, contexts, capitalize) }
    const current = resolveFieldValue(row, id, schema)
    if (def.type === 'checkbox') {
      const checked = current.kind === 'checkbox' && current.value
      return {
        ...base,
        options: CHECKBOX_OPTIONS.map((o) => ({ ...o, checked: (o.value === 'true') === checked })),
      }
    }
    if (!isOptionsKind(def.type)) return base
    const selected = selectedValues(current)
    return {
      ...base,
      options: pickShape(def, contextOptionsOf(tree, def)).options.map((o) => ({
        value: o.value,
        label: o.label,
        checked: selected.includes(o.value),
      })),
    }
  }
  const contextRows = [...contexts.keys()].map((id) => build(id, syntheticContextDef(id)))
  const built = schema.filter((d) => !STAMP_TYPES.has(d.type)).map((def) => build(def.id, def))
  const schemaRows = [...built.filter((r) => r.options), ...built.filter((r) => !r.options)]
  if (contextRows.length > 0 && schemaRows.length > 0)
    schemaRows[0] = { ...schemaRows[0], separatorBefore: true }
  return [...contextRows, ...schemaRows]
}

export function runPropertyAction(
  action: string,
  {
    tree,
    schema,
    row,
    commit,
    trigger,
  }: PropertyMenuTarget & {
    commit: (column: ResolvedColumn, value: PropertyValue | null) => void
    trigger: HTMLElement
  },
): boolean {
  const parsed = parsePropertyAction(action)
  if (!parsed) return false
  const { id, value } = parsed
  const contextIds = contextIdsOf(tree)
  const def = schema.find((d) => d.id === id) ?? syntheticContextDef(id)
  const current = resolveFieldValue(row, id, schema)
  const commitValue = (next: PropertyValue | null): void =>
    commit({ id, kind: contextIds.includes(id) ? 'context' : 'property' }, next)
  if (value === null) {
    if (def.type === 'file') pickFileInto(def, current, null, commitValue)
    else useSession.getState().requestPick({ def, current, trigger, commit: commitValue })
    return true
  }
  if (def.type === 'checkbox')
    commitValue(value === 'true' ? { kind: 'checkbox', value: true } : null)
  else commitValue(pickedValue(def, current, value, contextOptionsOf(tree, def)))
  return true
}
