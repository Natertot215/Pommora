import { describe, expect, it } from 'vitest'
import { unfolded } from './DisclosureRow'

describe('unfolded', () => {
  const row = (value: string, level: number) => ({ value, level })
  const shown = (rows: { value: string; level: number }[], closed: string[]): string[] =>
    unfolded(
      rows,
      (r) => r.level,
      (r) => !closed.includes(r.value),
    ).map((r) => r.value)

  it('hides everything deeper than a closed row, up to its next sibling', () => {
    const rows = [row('A', 2), row('A1', 3), row('A1a', 4), row('B', 2), row('B1', 3)]
    expect(shown(rows, ['A'])).toEqual(['A', 'B', 'B1'])
    expect(shown(rows, ['A1'])).toEqual(['A', 'A1', 'B', 'B1'])
    expect(shown(rows, [])).toEqual(['A', 'A1', 'A1a', 'B', 'B1'])
  })
})
