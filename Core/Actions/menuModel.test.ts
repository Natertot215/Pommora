import { describe, expect, it } from 'vitest'
import { joinGroups } from './menuModel'

describe('joinGroups', () => {
  it('divides each group from the one before it, skipping empty groups and never leading with a divider', () => {
    expect(
      joinGroups([
        [],
        [
          { label: 'A', action: 'a' },
          { label: 'B', action: 'b' },
        ],
        [],
        [{ label: 'C', submenu: [] }],
      ]),
    ).toEqual([
      { label: 'A', action: 'a' },
      { label: 'B', action: 'b' },
      { label: 'C', submenu: [], separatorBefore: true },
    ])
  })
})
