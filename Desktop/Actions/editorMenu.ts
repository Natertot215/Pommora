import { Menu, clipboard } from 'electron'
import type {
  BrowserWindow,
  ContextMenuParams,
  MenuItemConstructorOptions,
  WebContents,
} from 'electron'
import {
  EDITOR_ACTION_PREFIX,
  editorContextItems,
  type FormatState,
} from '@pommora/core/Actions/editorMenu'
import { type Commands, DEFAULT_COMMANDS } from '@pommora/core/Actions/commands'
import { PASTE_AS_PREFIX, pasteAsRows } from '@pommora/core/Actions/pasteAsMenu'
import { rowTemplate } from './menu'

let lastState: FormatState | null = null
export function setFormatState(s: FormatState): void {
  lastState = s
}

let commands: Commands = DEFAULT_COMMANDS
export function setEditorCommands(c: Commands): void {
  commands = c
}

// The event hands over a bare WebContents, so the typed push (which takes a window) can't be used.
const dispatch = (wc: WebContents, action: string) => () =>
  wc.send('menu:action', EDITOR_ACTION_PREFIX + action)

function systemItems(
  wc: WebContents,
  params: ContextMenuParams,
  editorFocused: boolean,
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
    ...(editorFocused ? pasteAsItems(wc) : []),
    // The `pasteAndMatchStyle` role would take back ⌘⇧V, which belongs to the inverse paste command.
    {
      label: 'Paste Without Formatting',
      enabled: f.canPaste,
      click: () => wc.pasteAndMatchStyle(),
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

// Read here rather than pushed: the `context-menu` event fires in the same turn as the right-click.
function pasteAsItems(wc: WebContents): MenuItemConstructorOptions[] {
  const rows = pasteAsRows(
    clipboard.readText(),
    lastState?.embedSeat === true,
    lastState?.citeSeat === true,
  )
  if (rows.length === 0) return []
  return [
    {
      label: 'Paste As',
      submenu: rows.map((r) => ({
        label: r.label,
        click: dispatch(wc, PASTE_AS_PREFIX + r.form),
      })),
    },
  ]
}

export function installEditorContextMenu(win: BrowserWindow): void {
  win.webContents.on('context-menu', (_e, params) => {
    if (!params.isEditable) return // the sidebar keeps its own menus
    const items = systemItems(win.webContents, params, lastState?.focused === true)
    if (lastState?.focused)
      items.push(
        { type: 'separator' },
        ...rowTemplate(editorContextItems(lastState, commands, params.selectionText), (action) =>
          dispatch(win.webContents, action),
        ),
      )
    items.push(...speechShareItems(params))
    Menu.buildFromTemplate(items).popup({ window: win })
  })
}
