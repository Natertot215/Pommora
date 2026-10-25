import { groupOptions, optionGroupsOf, type OptionPickKind, type PickOption } from '../properties'
import { type PropertyValue, selectedValues } from '../propertyValue'
import type { ResolvedColumn } from '../../Views/viewRow'

export type PickGroup = { id: string; options: PickOption[] }
export type PickCommit = { index: number; next: PropertyValue | null }

export const pickGroups = (column: ResolvedColumn, contextOptions?: PickOption[]): PickGroup[] =>
  contextOptions
    ? [{ id: column.id, options: contextOptions }]
    : column.def
      ? optionGroupsOf(column.def)
          .map((g) => ({ id: g.id, options: groupOptions(g).map((o) => ({ ...o, value: o.id })) }))
          .filter((g) => g.options.length > 0)
      : []

export const toggleValue = (selected: string[], value: string): string[] =>
  selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]

// A value every row holds leaves them all; otherwise it lands on each row lacking it, a Select replacing what the row held and a list joining it.
function pickCommits(kind: OptionPickKind, rows: string[][], value: string): PickCommit[] {
  const all = rows.every((own) => own.includes(value))
  return rows.flatMap<PickCommit>((own, index) => {
    if (own.includes(value) !== all) return []
    if (kind !== 'select') return [{ index, next: { kind, value: toggleValue(own, value) } }]
    return [{ index, next: all ? null : { kind, value } }]
  })
}

/** One pick over one row or many: what every row holds reads as picked, and a Select's picker closes once picked, since a Select holds one value. */
export function pickOver(
  kind: OptionPickKind,
  currents: readonly (PropertyValue | null)[],
  onCommit: (commits: PickCommit[]) => void,
  onClose: () => void,
): { selected: string[]; pick: (value: string) => void } {
  const rows = currents.map(selectedValues)
  return {
    selected: rows[0].filter((v) => rows.every((own) => own.includes(v))),
    pick: (value) => {
      onCommit(pickCommits(kind, rows, value))
      if (kind === 'select') onClose()
    },
  }
}

export const pickedValue = (
  kind: OptionPickKind,
  current: PropertyValue | null,
  value: string,
): PropertyValue | null => pickCommits(kind, [selectedValues(current)], value)[0].next
