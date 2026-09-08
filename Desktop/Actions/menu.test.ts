import { describe, expect, it } from 'vitest'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import type { ActionItem } from '@pommora/core/Actions/menuModel'
import { menuRows } from '@pommora/core/Interface/Menus/menuRows'
import { anchorPoint, rowTemplate } from './menu'

const winAt = (zoom: number): BrowserWindow =>
  ({ webContents: { getZoomFactor: () => zoom } }) as unknown as BrowserWindow

describe('the anchor a menu opens at', () => {
  it('hangs the menu from the trigger’s bottom-left', () => {
    expect(anchorPoint(winAt(1), { left: 40, top: 100, height: 20 })).toEqual({
      x: 40,
      y: 120,
    })
  })

  it('converts CSS pixels to window DIPs, so a zoomed window still lands on its trigger', () => {
    expect(anchorPoint(winAt(1.5), { left: 40, top: 100, height: 20 })).toEqual({
      x: 60,
      y: 180,
    })
  })

  it('yields no point without an anchor, which is what pops a menu at the cursor', () => {
    expect(anchorPoint(winAt(1), undefined)).toBeUndefined()
  })
})

const pick = (a: string) => () => void a

describe('a row model as a native template', () => {
  it('expands separatorBefore into a real separator row', () => {
    const t = rowTemplate(
      [
        { label: 'Rename', action: 'a' },
        { label: 'Delete', action: 'b', separatorBefore: true },
      ],
      pick,
    )
    expect(t.map((i) => i.type ?? i.label)).toEqual(['Rename', 'separator', 'Delete'])
  })

  it('marks the row in force as a checkbox, and leaves a command menu unmarked', () => {
    const choice = rowTemplate(
      [
        { label: 'Dash', action: 'dash', checked: true },
        { label: 'Slash', action: 'slash', checked: false },
      ],
      pick,
    )
    expect(choice.map((i) => [i.type, i.checked])).toEqual([
      ['checkbox', true],
      ['checkbox', false],
    ])
    expect(rowTemplate([{ label: 'Rename', action: 'a' }], pick)[0].type).toBeUndefined()
  })

  it('nests a submenu and leaves its parent unclickable, so only the leaf resolves', () => {
    const t = rowTemplate(
      [
        {
          label: 'Style',
          action: 'open',
          submenu: [{ label: 'Bordered', action: 'style:bordered' }],
        },
      ],
      pick,
    )
    expect(t[0].click).toBeUndefined()
    expect((t[0].submenu as { label: string }[])[0].label).toBe('Bordered')
  })

  it('shows a disabled row rather than dropping it', () => {
    const t = rowTemplate([{ label: 'Delete', action: 'b', disabled: true }], pick)
    expect(t[0]).toMatchObject({ label: 'Delete', enabled: false })
  })

  it('keeps a divider a spliced fragment leads with, which separates it from the rows above', () => {
    const rows = rowTemplate(
      [
        { label: 'Remove Link', action: 'link:remove', separatorBefore: true },
        { label: 'Delete', action: 'link:delete' },
      ],
      pick,
    )
    expect(rows.map((r) => r.type ?? r.label)).toEqual(['separator', 'Remove Link', 'Delete'])
  })
})

const fixture: ActionItem<string>[] = [
  { label: 'Open', action: 'open', icon: 'link' },
  {
    label: 'Style',
    action: 'style',
    separatorBefore: true,
    submenu: [
      { label: 'Bordered', action: 'style:bordered', checked: true },
      { label: 'Plain', action: 'style:plain', checked: false },
    ],
  },
  {
    label: 'Layout',
    action: 'layout',
    checked: true,
    submenu: [{ label: 'Grid', action: 'layout:grid' }],
  },
  { label: 'Pin', action: 'pin', checked: false, disabled: true },
  { label: 'Delete', action: 'delete', disabled: true },
]

interface Flat {
  label: string
  disabled: boolean
  checked: boolean | null
  depth: number
}

const nativeFlat = (template: MenuItemConstructorOptions[], depth = 0): Flat[] =>
  template.flatMap((i): Flat[] =>
    i.type === 'separator'
      ? [{ label: 'separator', disabled: false, checked: null, depth }]
      : [
          {
            label: String(i.label),
            disabled: i.enabled === false,
            checked: i.checked ?? null,
            depth,
          },
          ...nativeFlat((i.submenu as MenuItemConstructorOptions[] | undefined) ?? [], depth + 1),
        ],
  )

const presenterFlat = (items: readonly ActionItem<string>[], depth = 0): Flat[] =>
  menuRows(items).flatMap((r): Flat[] =>
    r.kind === 'separator'
      ? [{ label: 'separator', disabled: false, checked: null, depth }]
      : [
          {
            label: r.label,
            disabled: r.disabled === true,
            checked: r.kind === 'choice' ? r.checked : null,
            depth,
          },
          ...(r.kind === 'item' && r.submenu ? presenterFlat(r.submenu, depth + 1) : []),
        ],
  )

describe('one model, two renderers', () => {
  it('draws the same rows natively and in-app, down to the checkmarks and the depth', () => {
    expect(presenterFlat(fixture)).toEqual(nativeFlat(rowTemplate(fixture, pick)))
  })
})
