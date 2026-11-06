import { describe, expect, it, vi } from 'vitest'
import type { BrowserWindow, ContextMenuParams, MenuItemConstructorOptions } from 'electron'
import type { EditorMenuRequest } from '@pommora/core/Actions/editorMenu'
import { askEditorMenu, installEditorContextMenu } from './editorMenu'

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

const req: EditorMenuRequest = {
  scope: 'page',
  menu: 'live',
  bold: false,
  italic: false,
  strikethrough: false,
  painted: null,
  inlineCode: false,
  link: false,
  connection: false,
  heading: 0,
  list: null,
  block: null,
  embedSeat: false,
  citeSeat: false,
  selection: null,
}

describe('the parked ask', () => {
  it('answers an earlier ask with null when a second one arrives', async () => {
    const first = askEditorMenu(req)
    void askEditorMenu(req)
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
            isEditable: true,
            selectionText: '',
            misspelledWord: '',
            dictionarySuggestions: [],
            editFlags: { canPaste: true },
            ...params,
          } as ContextMenuParams)
      },
      pasteAndMatchStyle,
    },
  } as unknown as BrowserWindow)

  const labels = (): (string | undefined)[] => (native.popped ?? []).map((i) => i.label ?? i.role)
  const row = (label: string): MenuItemConstructorOptions | undefined =>
    native.popped?.find((i) => i.label === label)
  const pick = (item: MenuItemConstructorOptions | undefined): void =>
    (item?.click as (() => void) | undefined)?.()

  it('builds the editor rows from the parked ask, and a row answers it', async () => {
    const asked = askEditorMenu(req)
    rightClick({})
    expect(labels()).toContain('Format')
    pick((row('Format')?.submenu as MenuItemConstructorOptions[])[0])
    await expect(asked).resolves.toBe('format:italic')
  })

  it('pops nothing over a field that isn’t editable when nothing asked', () => {
    native.popped = null
    rightClick({ isEditable: false })
    expect(native.popped).toBeNull()
  })

  it('answers null when the menu closes with nothing picked', async () => {
    const asked = askEditorMenu(req)
    rightClick({})
    native.close?.()
    await expect(asked).resolves.toBeNull()
  })

  it('sends Paste Without Formatting to the editor that asked, and to the browser otherwise', async () => {
    const asked = askEditorMenu(req)
    rightClick({})
    pick(row('Paste Without Formatting'))
    await expect(asked).resolves.toBe('paste:literal')
    rightClick({})
    pick(row('Paste Without Formatting'))
    expect(pasteAndMatchStyle).toHaveBeenCalledOnce()
  })

  it('offers Paste As from the seats the ask carries', () => {
    native.clipboard = 'plain words'
    void askEditorMenu({ ...req, citeSeat: true })
    rightClick({})
    expect(labels()).toContain('Paste As')
    void askEditorMenu(req)
    rightClick({})
    expect(labels()).not.toContain('Paste As')
  })

  describe('over a resting cell, which Chromium reports as not editable', () => {
    const resting = (selection: string): EditorMenuRequest => ({
      ...req,
      scope: 'lists',
      menu: 'resting',
      selection,
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

    it('offers Insert Link, Speech, and Share from the source selection, not the drawn one', () => {
      void askEditorMenu(resting('example.com'))
      rightClick({ isEditable: false, selectionText: 'the site' })
      expect(labels()).toContain('Insert Link')
      const platform = vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin')
      void askEditorMenu(resting(''))
      rightClick({ isEditable: false, selectionText: 'cella' })
      expect(labels()).not.toContain('Speech')
      void askEditorMenu(resting('wo'))
      rightClick({ isEditable: false, selectionText: '' })
      expect(labels()).toContain('Speech')
      platform.mockRestore()
    })
  })

  describe('over a surface that can’t be edited', () => {
    const short = (selection: string): EditorMenuRequest => ({ ...req, menu: 'short', selection })

    it('offers Copy and Select All alone, the renderer answering each', async () => {
      const copied = askEditorMenu(short('wo'))
      rightClick({ isEditable: true, misspelledWord: 'wo', dictionarySuggestions: ['we'] })
      expect(labels()).toEqual(['Copy', 'Select All'])
      pick(row('Copy'))
      await expect(copied).resolves.toBe('edit:copy')
      const all = askEditorMenu(short('wo'))
      rightClick({ isEditable: false })
      pick(row('Select All'))
      await expect(all).resolves.toBe('edit:selectAll')
    })

    it('turns Copy off with nothing selected', () => {
      void askEditorMenu(short(''))
      rightClick({ isEditable: false, selectionText: 'drawn' })
      expect(row('Copy')?.enabled).toBe(false)
      expect(row('Select All')?.enabled).toBe(true)
    })
  })

  it('seats Change Color under Select All, above the line over the editor block', async () => {
    const asked = askEditorMenu({
      ...req,
      painted: { paint: 'highlight', color: 'accent' },
    })
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
    void askEditorMenu(req)
    rightClick({})
    expect(labels()).not.toContain('Change Color')
  })
})
