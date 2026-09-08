import { describe, expect, it } from 'vitest'
import type { ActionItem } from '@pommora/core/Actions/menuModel'
import { menuRows } from './menuRows'

const items: ActionItem<string>[] = [
  { label: 'Rename', action: 'rename', icon: 'pencil' },
  {
    label: 'Style',
    action: 'style:a',
    submenu: [{ label: 'A', action: 'style:a', checked: true }],
  },
  { label: 'Delete', action: 'delete', separatorBefore: true, disabled: true },
]

describe('a row model as presenter rows', () => {
  it('maps a leaf, a branch, a divider, a checked row, and a disabled row', () => {
    const rows = menuRows(items)
    expect(rows.map((r) => r.kind)).toEqual(['item', 'item', 'separator', 'item'])
    const [rename, style, , del] = rows
    expect(rename).toMatchObject({ kind: 'item', action: 'rename', icon: 'pencil' })
    expect(style).toMatchObject({ kind: 'item', submenu: items[1].submenu })
    expect(del).toMatchObject({ kind: 'item', disabled: true })
    expect(menuRows(items[1].submenu ?? [])[0]).toMatchObject({
      kind: 'choice',
      label: 'A',
      checked: true,
    })
  })

  it('keeps a divider that leads the list, which the door has already dropped when it leads a menu', () => {
    expect(
      menuRows([{ label: 'Delete', action: 'd', separatorBefore: true }]).map((r) => r.kind),
    ).toEqual(['separator', 'item'])
  })
})
