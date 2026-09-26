import { Menu, clipboard } from 'electron'
import type {
  BrowserWindow,
  ContextMenuParams,
  MenuItemConstructorOptions,
  WebContents,
} from 'electron'
import {
  type EditorMenuRequest,
  editorContextItems,
  PASTE_PLAIN_ACTION,
} from '@pommora/core/Actions/editorMenu'
import { type Commands, DEFAULT_COMMANDS } from '@pommora/core/Actions/commands'
import { PASTE_AS_PREFIX, pasteAsRows } from '@pommora/core/Actions/pasteAsMenu'
import { rowTemplate } from './menu'

let commands: Commands = DEFAULT_COMMANDS
export function setEditorCommands(c: Commands): void {
  commands = c
}

interface EditorMenu {
  req: EditorMenuRequest
  resolve: (action: string | null) => void
}
let pending: EditorMenu | null = null

/** Parked until the click's own `context-menu` event arrives, which Chromium sends after the renderer's handler. */
export function askEditorMenu(req: EditorMenuRequest): Promise<string | null> {
  pending?.resolve(null)
  return new Promise((resolve) => {
    pending = { req, resolve }
  })
}

/** The renderer measures in CSS pixels and the event in window DIPs, differing by the window's zoom. */
export function atClick(
  req: EditorMenuRequest,
  params: Pick<ContextMenuParams, 'x' | 'y'>,
  zoom: number,
): boolean {
  return (
    Math.abs(Math.round(req.x * zoom) - params.x) <= 2 &&
    Math.abs(Math.round(req.y * zoom) - params.y) <= 2
  )
}

function takeEditorMenu(win: BrowserWindow, params: ContextMenuParams): EditorMenu | null {
  const menu = pending
  pending = null
  if (!menu) return null
  if (atClick(menu.req, params, win.webContents.getZoomFactor())) return menu
  menu.resolve(null)
  return null
}

function systemItems(
  wc: WebContents,
  params: ContextMenuParams,
  editor: EditorMenu | null,
): MenuItemConstructorOptions[] {
  const f = params.editFlags
  const items: MenuItemConstructorOptions[] = []

  if (params.misspelledWord) {
    for (const s of params.dictionarySuggestions)
      items.push({ label: s, click: () => wc.replaceMisspelling(s) })
    items.push(
      { type: 'separator' },
      {
        label: 'Add to Dictionary',
        click: () => wc.session.addWordToSpellCheckerDictionary(params.misspelledWord),
      },
      { type: 'separator' },
    )
  }

  items.push(
    { role: 'undo', enabled: f.canUndo },
    { role: 'redo', enabled: f.canRedo },
    { type: 'separator' },
    { role: 'cut', enabled: f.canCut },
    { role: 'copy', enabled: f.canCopy },
    { role: 'paste', enabled: f.canPaste },
    ...(editor ? pasteAsItems(editor) : []),
    // The `pasteAndMatchStyle` role would take back ⌘⇧V, which belongs to the inverse paste command.
    {
      label: 'Paste Without Formatting',
      enabled: f.canPaste,
      click: editor ? () => editor.resolve(PASTE_PLAIN_ACTION) : () => wc.pasteAndMatchStyle(),
    },
    { role: 'selectAll' },
  )
  return items
}

// Last, so the Pommora formatting block sits directly under the edit items.
function speechShareItems(params: ContextMenuParams): MenuItemConstructorOptions[] {
  if (!params.selectionText || process.platform !== 'darwin') return []
  return [
    { type: 'separator' },
    { label: 'Speech', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] },
    { role: 'shareMenu', sharingItem: { texts: [params.selectionText] } },
  ]
}

// The clipboard is read here, in the same turn as the right-click, not sent with the request.
function pasteAsItems(editor: EditorMenu): MenuItemConstructorOptions[] {
  const rows = pasteAsRows(clipboard.readText(), editor.req.embedSeat, editor.req.citeSeat)
  if (rows.length === 0) return []
  return [
    {
      label: 'Paste As',
      submenu: rows.map((r) => ({
        label: r.label,
        click: () => editor.resolve(PASTE_AS_PREFIX + r.form),
      })),
    },
  ]
}

export function installEditorContextMenu(win: BrowserWindow): void {
  win.webContents.on('context-menu', (_e, params) => {
    const editor = takeEditorMenu(win, params)
    if (!params.isEditable) return editor?.resolve(null) // the sidebar keeps its own menus
    const wc = win.webContents
    const items = systemItems(wc, params, editor)
    if (editor)
      items.push(
        { type: 'separator' },
        ...rowTemplate(
          editorContextItems(editor.req, commands, params.selectionText),
          (action) => () => editor.resolve(action),
        ),
      )
    items.push(...speechShareItems(params))
    Menu.buildFromTemplate(items).popup({ window: win, callback: () => editor?.resolve(null) })
  })
}
