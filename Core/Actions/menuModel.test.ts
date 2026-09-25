import { describe, expect, it } from 'vitest'
import { joinGroups, menuRequest } from './menuModel'

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

describe('menuRequest — a native menu is built only from the item model', () => {
  it('reads leaves and branches to any depth and drops keys the model does not name', () => {
    const parsed = menuRequest.parse({
      items: [
        { label: 'Open', action: 'open', chord: '⌘O', extra: 1 },
        { label: 'More', submenu: [{ label: 'Deep', action: 'deep', separatorBefore: true }] },
      ],
      anchor: { left: 1, top: 2, height: 3 },
    })
    expect(parsed).toEqual({
      items: [
        { label: 'Open', action: 'open', chord: '⌘O' },
        { label: 'More', submenu: [{ label: 'Deep', action: 'deep', separatorBefore: true }] },
      ],
      anchor: { left: 1, top: 2, height: 3 },
    })
  })

  it('refuses an item that is neither a leaf nor a branch, and a non-list of items', () => {
    expect(menuRequest.safeParse({ items: [{ label: 'x' }] }).success).toBe(false)
    expect(menuRequest.safeParse({ items: [{ action: 'a' }] }).success).toBe(false)
    expect(menuRequest.safeParse({ items: 'none' }).success).toBe(false)
  })
})
