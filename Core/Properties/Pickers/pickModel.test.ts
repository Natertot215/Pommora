import { describe, expect, it, vi } from 'vitest'
import type { OptionPickKind, PropertyDefinition } from '../properties'
import type { PropertyValue } from '../propertyValue'
import { propertyColumn } from '../../Views/Pipeline/columns'
import { type PickCommit, pickGroups, pickOver } from './pickModel'

const optionDef = (type: 'select' | 'multiSelect'): PropertyDefinition => ({
  id: 'prop_p',
  label: 'P',
  key: 'P',
  type,
  select_options: [
    { id: 'opt_a', key: 'a', label: 'a' },
    { id: 'opt_b', key: 'b', label: 'b' },
    { id: 'opt_c', key: 'c', label: 'c' },
  ],
})
const select = (value: string): PropertyValue => ({ kind: 'select', value })
const multi = (...value: string[]): PropertyValue => ({ kind: 'multiSelect', value })
const spaces = (...value: string[]): PropertyValue => ({ kind: 'context', value })

/** The commits one pick of `value` makes over `currents`, and whether it closed the picker. */
function pickOf(kind: OptionPickKind, currents: (PropertyValue | null)[], value: string) {
  const onCommit = vi.fn<(commits: PickCommit[]) => void>()
  const onClose = vi.fn()
  pickOver(kind, currents, onCommit, onClose).pick(value)
  return { commits: onCommit.mock.calls[0][0], closed: onClose.mock.calls.length > 0 }
}

describe('pickGroups', () => {
  it('offers an option under its id and names it by its label, never by its key', () => {
    const named = propertyColumn({
      ...optionDef('select'),
      select_options: [{ id: 'opt_new', key: 'new', label: 'New' }],
    })
    const offered = pickGroups(named).flatMap((g) => g.options)
    expect(offered.map((o) => [o.value, o.label])).toEqual([['opt_new', 'New']])
  })
})

describe('pickOver', () => {
  it('marks as picked only what every row holds', () => {
    const rows = [multi('opt_a', 'opt_b'), multi('opt_a'), multi('opt_a', 'opt_c')]
    expect(pickOver('multiSelect', rows, vi.fn(), vi.fn()).selected).toEqual(['opt_a'])
    expect(
      pickOver('select', [select('opt_a'), select('opt_b')], vi.fn(), vi.fn()).selected,
    ).toEqual([])
  })

  it('a list value joins every row lacking it, keeps what each holds, and leaves the picker open', () => {
    const { commits, closed } = pickOf(
      'multiSelect',
      [multi('opt_a'), multi('opt_b', 'opt_c'), null],
      'opt_b',
    )
    expect(commits).toEqual([
      { index: 0, next: multi('opt_a', 'opt_b') },
      { index: 2, next: multi('opt_b') },
    ])
    expect(closed).toBe(false)
  })

  it('a list value every row holds leaves each of them', () => {
    expect(pickOf('context', [spaces('a', 'b'), spaces('b', 'c')], 'b').commits).toEqual([
      { index: 0, next: spaces('a') },
      { index: 1, next: spaces('c') },
    ])
  })

  it('a Select lands on every row not already holding it, and closes the picker', () => {
    const { commits, closed } = pickOf('select', [select('opt_a'), select('opt_b'), null], 'opt_a')
    expect(commits).toEqual([
      { index: 1, next: select('opt_a') },
      { index: 2, next: select('opt_a') },
    ])
    expect(closed).toBe(true)
  })

  it('a Select every row holds clears from all of them', () => {
    expect(pickOf('select', [select('opt_a'), select('opt_a')], 'opt_a').commits).toEqual([
      { index: 0, next: null },
      { index: 1, next: null },
    ])
  })
})
