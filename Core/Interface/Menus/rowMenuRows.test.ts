import { describe, expect, it, vi } from 'vitest'
import type { ActionItem } from '@pommora/core/Actions/menuModel'
import { rowMenuRows } from './rowMenuRows'

const items: ActionItem<string>[] = [
  { label: 'Rename', action: 'rename' },
  {
    label: 'Style',
    action: 'style:a',
    submenu: [{ label: 'A', action: 'style:a', checked: true }],
  },
  { label: 'Delete', action: 'delete', separatorBefore: true, disabled: true },
]

describe('a row model as in-app rows', () => {
  it('maps a leaf, a branch, a divider, a checked row, and a disabled row', () => {
    const onPick = vi.fn()
    const onDrill = vi.fn()
    const rows = rowMenuRows(items, onPick, onDrill)
    expect(rows.map((r) => r.kind)).toEqual(['item', 'item', 'separator', 'item'])
    const [rename, style, , del] = rows
    if (rename.kind !== 'item' || style.kind !== 'item' || del.kind !== 'item') throw new Error()
    rename.onSelect?.()
    expect(onPick).toHaveBeenCalledWith('rename')
    expect(style.trailing).toEqual({ kind: 'chevron' })
    style.onSelect?.()
    expect(onDrill).toHaveBeenCalledWith(items[1])
    expect(onPick).toHaveBeenCalledTimes(1)
    expect(del.disabled).toBe(true)
    const [checked] = rowMenuRows(items[1].submenu ?? [], onPick, onDrill)
    expect(checked).toMatchObject({ kind: 'item', label: 'A', selected: true })
  })

  it('drops a divider that would lead the whole list', () => {
    const rows = rowMenuRows(
      [{ label: 'Delete', action: 'd', separatorBefore: true }],
      vi.fn(),
      vi.fn(),
    )
    expect(rows.map((r) => r.kind)).toEqual(['item'])
  })
})
