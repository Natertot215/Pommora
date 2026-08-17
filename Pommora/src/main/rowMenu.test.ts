import { describe, expect, it } from 'vitest'
import type { BrowserWindow } from 'electron'
import { anchorPoint, rowTemplate } from './rowMenu'

const winAt = (zoom: number): BrowserWindow =>
  ({ webContents: { getZoomFactor: () => zoom } }) as unknown as BrowserWindow

describe('the anchor a row menu opens at', () => {
  it('hangs the menu from the trigger’s bottom-left', () => {
    expect(anchorPoint(winAt(1), { left: 40, top: 100, width: 80, height: 20 })).toEqual({
      x: 40,
      y: 120,
    })
  })

  it('converts CSS pixels to window DIPs, so a zoomed window still lands on its trigger', () => {
    expect(anchorPoint(winAt(1.5), { left: 40, top: 100, width: 80, height: 20 })).toEqual({
      x: 60,
      y: 180,
    })
  })

  it('yields no point without an anchor, which is what pops a menu at the cursor', () => {
    expect(anchorPoint(winAt(1), undefined)).toBeUndefined()
  })
})

describe('a row model as a native template', () => {
  const pick = (a: string) => () => void a

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

  it('drops a leading separator, which would separate nothing', () => {
    const t = rowTemplate([{ label: 'Delete', action: 'b', separatorBefore: true }], pick)
    expect(t).toHaveLength(1)
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
})
