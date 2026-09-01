import type { PropertyValue } from '@shared/propertyValue'

export type PickKind = 'select' | 'multiSelect' | 'context'

export function massSelected(optionValues: string[], rows: string[][]): string[] {
  return optionValues.filter((v) => rows.every((r) => r.includes(v)))
}

export function massPickCommits(
  rows: string[][],
  value: string,
  kind: PickKind,
): Array<{ index: number; next: PropertyValue | null }> {
  if (kind === 'select') {
    const holds = (own: string[]): boolean => own.length === 1 && own[0] === value
    if (rows.every(holds)) return rows.map((_, index) => ({ index, next: null }))
    return rows.flatMap((own, index) =>
      holds(own) ? [] : [{ index, next: { kind: 'select', value } }],
    )
  }
  const unanimous = rows.every((r) => r.includes(value))
  return rows.flatMap((own, index) => {
    if (own.includes(value) !== unanimous) return []
    const next = unanimous ? own.filter((x) => x !== value) : [...own, value]
    return [{ index, next: { kind, value: next } }]
  })
}
