import { parsePropertyAction, type PropertyMenuRow } from '../../Actions/propertyRows'
import type { NexusTree } from '../../Nexus/tree'
import { pagesByIdOf } from '../../Nexus/treeIndex'
import { pickKindOf, PROPERTY_TYPES, type PropertyDefinition } from '../../Properties/properties'
import type { PropertyValue } from '../../Properties/propertyValue'
import type { ColumnStyle } from '../../Properties/columnStyles'
import type { ResolvedColumn, ViewRow } from '../../Views/viewRow'
import { contextIdsOf, contextsByIdOf } from '../../Contexts/contextIdentity'
import { contextOptionsFor } from '../../Contexts/contextOptions'
import { columnLabel } from '../../Properties/Cells/columnLabel'
import { pickFileInto } from '../../Properties/Pickers/filePick'
import {
  pickedValue,
  pickGroups,
  selectedValues,
  syntheticContextDef,
} from '../../Properties/Pickers/PropertyPicker'
import { resolveFieldValue } from '../../Properties/value'
import { useSession } from '../../Session/store'

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
  const build = (id: string, def: PropertyDefinition): PropertyMenuRow => {
    const base = { id, name: columnLabel(id, schema, contexts) }
    const current = resolveFieldValue(row, id, schema)
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
  const built = schema
    .filter((d) => PROPERTY_TYPES[d.type].origin === 'user')
    .map((def) => build(def.id, def))
  return {
    spaces: [...contexts.keys()].map((id) => build(id, syntheticContextDef(id))),
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
    styleOf?: (id: string) => ColumnStyle
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
    else
      useSession.getState().requestPick({
        def,
        current,
        holder: tree ? pagesByIdOf(tree).get(row.id) : undefined,
        trigger,
        commit: commitValue,
        style: styleOf?.(id),
      })
    return true
  }
  if (def.type === 'checkbox')
    commitValue(value === 'true' ? { kind: 'checkbox', value: true } : null)
  else commitValue(pickedValue(def, current, value))
  return true
}
