import { describe, expect, it, vi } from 'vitest'
import type { BrowserWindow, ContextMenuParams, MenuItemConstructorOptions } from 'electron'
import type { EditorMenuRequest } from '@pommora/core/Actions/editorMenu'
import { askEditorMenu, atClick, installEditorContextMenu } from './editorMenu'

const native = vi.hoisted(() => ({
  clipboard: '',
  popped: null as MenuItemConstructorOptions[] | null,
  close: null as (() => void) | null,
}))

vi.mock('electron', () => ({
  clipboard: { readText: () => native.clipboard },
  Menu: {
    buildFromTemplate: (items: MenuItemConstructorOptions[]) => ({
      popup: (opts: { callback?: () => void }) => {
        native.popped = items
        native.close = opts.callback ?? null
      },
    }),
  },
}))

const req = (x: number, y: number): EditorMenuRequest => ({
  scope: 'page',
  x,
  y,
  bold: false,
  italic: false,
  strikethrough: false,
  highlight: false,
  inlineCode: false,
  link: false,
  connection: false,
  heading: 0,
  list: null,
  block: null,
  embedSeat: false,
  citeSeat: false,
})

describe('matching an editor’s ask to the click', () => {
  it('matches the click it was sent from', () => {
    expect(atClick(req(100, 40), { x: 100, y: 40 }, 1)).toBe(true)
  })

  it('converts CSS pixels to window DIPs', () => {
    expect(atClick(req(101, 41), { x: 126, y: 51 }, 1.25)).toBe(true)
  })

  it('widens with the zoom, since the renderer truncates its click to whole CSS pixels', () => {
    expect(atClick(req(282, 329), { x: 849, y: 990 }, 3)).toBe(true)
    expect(atClick(req(262, 77), { x: 1052, y: 312 }, 3.9999)).toBe(true)
  })

  it('refuses a click farther than that slack', () => {
    expect(atClick(req(100, 40), { x: 104, y: 40 }, 1)).toBe(false)
    expect(atClick(req(100, 40), { x: 306, y: 120 }, 3)).toBe(false)
  })
})

describe('the parked ask', () => {
  it('answers an earlier ask with null when a second one arrives', async () => {
    const first = askEditorMenu(req(0, 0))
    void askEditorMenu(req(1, 1))
    await expect(first).resolves.toBeNull()
  })
})

describe('the window’s right-click', () => {
  let rightClick: (params: Partial<ContextMenuParams>) => void = () => {}
  const pasteAndMatchStyle = vi.fn()
  installEditorContextMenu({
    webContents: {
      on: (_event: string, fn: (e: unknown, p: ContextMenuParams) => void) => {
        rightClick = (params) =>
          fn({}, {
            x: 10,
            y: 10,
            isEditable: true,
            selectionText: '',
            misspelledWord: '',
            dictionarySuggestions: [],
            editFlags: { canPaste: true },
            ...params,
          } as ContextMenuParams)
      },
      getZoomFactor: () => 1,
      pasteAndMatchStyle,
    },
  } as unknown as BrowserWindow)

  const labels = (): (string | undefined)[] => (native.popped ?? []).map((i) => i.label ?? i.role)
  const row = (label: string): MenuItemConstructorOptions | undefined =>
    native.popped?.find((i) => i.label === label)
  const pick = (item: MenuItemConstructorOptions | undefined): void =>
    (item?.click as (() => void) | undefined)?.()

  it('builds the editor rows from the ask its click matches, and a row answers it', async () => {
    const asked = askEditorMenu(req(10, 10))
    rightClick({})
    expect(labels()).toContain('Format')
    pick((row('Format')?.submenu as MenuItemConstructorOptions[])[0])
    await expect(asked).resolves.toBe('format:italic')
  })

  it('answers null to an ask whose click lands elsewhere, and offers no editor rows', async () => {
    const asked = askEditorMenu(req(50, 50))
    rightClick({})
    expect(labels()).not.toContain('Format')
    await expect(asked).resolves.toBeNull()
  })

  it('answers null and pops nothing over a field that isn’t editable', async () => {
    native.popped = null
    const asked = askEditorMenu(req(10, 10))
    rightClick({ isEditable: false })
    expect(native.popped).toBeNull()
    await expect(asked).resolves.toBeNull()
  })

  it('answers null when the menu closes with nothing picked', async () => {
    const asked = askEditorMenu(req(10, 10))
    rightClick({})
    native.close?.()
    await expect(asked).resolves.toBeNull()
  })

  it('sends Paste Without Formatting to the editor that asked, and to the browser otherwise', async () => {
    const asked = askEditorMenu(req(10, 10))
    rightClick({})
    pick(row('Paste Without Formatting'))
    await expect(asked).resolves.toBe('paste:plain')
    rightClick({})
    pick(row('Paste Without Formatting'))
    expect(pasteAndMatchStyle).toHaveBeenCalledOnce()
  })

  it('offers Paste As from the seats the ask carries', () => {
    native.clipboard = 'plain words'
    void askEditorMenu({ ...req(10, 10), citeSeat: true })
    rightClick({})
    expect(labels()).toContain('Paste As')
    void askEditorMenu(req(10, 10))
    rightClick({})
    expect(labels()).not.toContain('Paste As')
  })
})
