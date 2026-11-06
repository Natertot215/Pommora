import { Menu, clipboard } from 'electron'
import type {
  BrowserWindow,
  ContextMenuParams,
  MenuItemConstructorOptions,
  WebContents,
} from 'electron'
import {
  type EditorMenuRequest,
  changeColorItems,
  editorContextItems,
  PASTE_LITERAL_ACTION,
  restingRows,
  shortRows,
} from '@pommora/core/Actions/editorMenu'
import type { ActionItem } from '@pommora/core/Actions/menuModel'
import { pasteAsRows } from '@pommora/core/Actions/pasteAsMenu'
import { heldTreeOf } from '@pommora/core/Nexus/liveTree'
import { pageIndexOf } from '@pommora/core/Nexus/record'
import { sessionRoot } from '@pommora/core/Nexus/session'
import { heldCommands } from '@pommora/core/Settings/settings'
import { rowTemplate } from './menu'

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

  const resting = editor?.req.menu === 'resting' ? editor : null
  const canPaste = resting ? clipboard.readText() !== '' : f.canPaste
  items.push(
    ...(resting
      ? editorRows(resting, restingRows(!!resting.req.selection, canPaste))
      : ([
          { role: 'undo', enabled: f.canUndo },
          { role: 'redo', enabled: f.canRedo },
          { type: 'separator' },
          { role: 'cut', enabled: f.canCut },
          { role: 'copy', enabled: f.canCopy },
          { role: 'paste', enabled: f.canPaste },
        ] satisfies MenuItemConstructorOptions[])),
    ...(editor ? pasteAsItems(editor) : []),
    // The `pasteAndMatchStyle` role would take back ⌘⇧V, which belongs to the inverse paste command.
    {
      label: 'Paste Without Formatting',
      enabled: canPaste,
      click: editor ? () => editor.resolve(PASTE_LITERAL_ACTION) : () => wc.pasteAndMatchStyle(),
    },
    ...(resting ? [] : [{ role: 'selectAll' } as const]),
    ...(editor ? editorRows(editor, changeColorItems(editor.req, heldCommands())) : []),
  )
  return items
}

// Last, so the Pommora formatting block sits directly under the edit items.
function speechShareItems(selection: string): MenuItemConstructorOptions[] {
  if (!selection || process.platform !== 'darwin') return []
  return [
    { type: 'separator' },
    { label: 'Speech', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] },
    { role: 'shareMenu', sharingItem: { texts: [selection] } },
  ]
}

// The clipboard is read here, in the same turn as the right-click, not sent with the request.
function pasteAsItems(editor: EditorMenu): MenuItemConstructorOptions[] {
  const root = sessionRoot()
  const tree = root ? heldTreeOf(root) : null
  const rows = pasteAsRows(
    clipboard.readText(),
    editor.req.embedSeat,
    editor.req.citeSeat,
    tree ? pageIndexOf(tree) : undefined,
  )
  return rows.length === 0 ? [] : editorRows(editor, [{ label: 'Paste As', submenu: rows }])
}

function editorRows(
  editor: EditorMenu,
  rows: readonly ActionItem<string>[],
): MenuItemConstructorOptions[] {
  return rowTemplate(rows, (action) => () => editor.resolve(action))
}

export function installEditorContextMenu(win: BrowserWindow): void {
  win.webContents.on('context-menu', (_e, params) => {
    const editor = pending
    pending = null
    if (!params.isEditable && !editor) return
    const selection = editor?.req.selection ?? params.selectionText
    const items =
      editor?.req.menu === 'short'
        ? editorRows(editor, shortRows(selection !== ''))
        : [
            ...systemItems(win.webContents, params, editor),
            ...(editor
              ? [
                  { type: 'separator' } as const,
                  ...editorRows(editor, editorContextItems(editor.req, heldCommands(), selection)),
                ]
              : []),
            ...speechShareItems(selection),
          ]
    Menu.buildFromTemplate(items).popup({ window: win, callback: () => editor?.resolve(null) })
  })
}
