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
  highlight: null,
  inlineCode: false,
  link: false,
  connection: false,
  heading: 0,
  list: null,
  block: null,
  embedSeat: false,
  citeSeat: false,
  resting: null,
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
    await expect(asked).resolves.toBe('paste:literal')
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

  describe('over a resting cell, which Chromium reports as not editable', () => {
    const resting = (selection: string): EditorMenuRequest => ({
      ...req(10, 10),
      scope: 'cell',
      resting: { selection },
    })

    it('pops the edit rows the renderer acts on, without Undo, Redo, or Select All', async () => {
      native.clipboard = ''
      const asked = askEditorMenu(resting('wo'))
      rightClick({
        isEditable: false,
        editFlags: { canPaste: false } as ContextMenuParams['editFlags'],
      })
      expect(labels()).not.toContain('undo')
      expect(labels()).not.toContain('redo')
      expect(labels()).not.toContain('selectAll')
      expect(labels().slice(0, 4)).toEqual(['Cut', 'Copy', 'Paste', 'Paste Without Formatting'])
      expect(labels()).toContain('Lists')
      expect(labels()).toContain('Format')
      pick(row('Cut'))
      await expect(asked).resolves.toBe('edit:cut')
    })

    it('answers Copy and Paste as actions rather than roles, keeping their chord hints', async () => {
      native.clipboard = 'x'
      const copied = askEditorMenu(resting('wo'))
      rightClick({ isEditable: false })
      expect(row('Copy')?.role).toBeUndefined()
      expect(['Cut', 'Copy', 'Paste'].map((l) => row(l)?.accelerator)).toEqual([
        'CmdOrCtrl+X',
        'CmdOrCtrl+C',
        'CmdOrCtrl+V',
      ])
      expect(row('Paste')?.registerAccelerator).toBe(false)
      pick(row('Copy'))
      await expect(copied).resolves.toBe('edit:copy')
      const pasted = askEditorMenu(resting(''))
      rightClick({ isEditable: false })
      pick(row('Paste'))
      await expect(pasted).resolves.toBe('edit:paste')
    })

    it('enables Cut and Copy from the source selection, and the pastes from the clipboard', () => {
      native.clipboard = ''
      void askEditorMenu(resting(''))
      rightClick({
        isEditable: false,
        editFlags: { canCopy: true, canPaste: true } as ContextMenuParams['editFlags'],
      })
      expect([row('Cut')?.enabled, row('Copy')?.enabled]).toEqual([false, false])
      expect([row('Paste')?.enabled, row('Paste Without Formatting')?.enabled]).toEqual([
        false,
        false,
      ])
      native.clipboard = 'x'
      void askEditorMenu(resting('wo'))
      rightClick({
        isEditable: false,
        editFlags: { canPaste: false } as ContextMenuParams['editFlags'],
      })
      expect([row('Cut')?.enabled, row('Copy')?.enabled]).toEqual([true, true])
      expect([row('Paste')?.enabled, row('Paste Without Formatting')?.enabled]).toEqual([
        true,
        true,
      ])
    })

    it('offers Insert Link from the source selection, not the drawn one', () => {
      void askEditorMenu(resting('example.com'))
      rightClick({ isEditable: false, selectionText: 'the site' })
      expect(labels()).toContain('Insert Link')
    })
  })

  it('seats Change Color under Select All, above the line over the editor block', async () => {
    const asked = askEditorMenu({ ...req(10, 10), highlight: 'accent' })
    rightClick({})
    const at = labels().indexOf('Change Color')
    expect(labels()[at - 1]).toBe('selectAll')
    expect(native.popped?.[at + 1].type).toBe('separator')
    pick(
      (row('Change Color')?.submenu as MenuItemConstructorOptions[]).find(
        (r) => r.label === 'Blue',
      ),
    )
    await expect(asked).resolves.toBe('highlight:blue')
    void askEditorMenu(req(10, 10))
    rightClick({})
    expect(labels()).not.toContain('Change Color')
  })
})
