import { Menu, clipboard } from 'electron'
import type {
  BrowserWindow,
  ContextMenuParams,
  MenuItemConstructorOptions,
  WebContents,
} from 'electron'
import {
  EDITOR_ACTION_PREFIX,
  type FormatChordAction,
  type FormatState,
  INSERT_LINK_ACTION,
} from '@pommora/core/Actions/editorMenu'
import { type Commands, DEFAULT_COMMANDS, toAccelerator } from '@pommora/core/Actions/commands'
import { HEADING_LEVELS } from '@pommora/core/Actions/gripMenu'
import { isValidLink } from '@pommora/core/Connections/links'
import { PASTE_AS_PREFIX, pasteAsRows } from '@pommora/core/Actions/pasteAsMenu'

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

type FormatFlag = {
  [K in keyof FormatState]: FormatState[K] extends boolean ? K : never
}[keyof FormatState]

const FORMAT_ROWS: readonly {
  label: string
  action: FormatChordAction
  state: FormatFlag
}[] = [
  { label: 'Italic', action: 'format:italic', state: 'italic' },
  { label: 'Inline Code', action: 'format:inlineCode', state: 'inlineCode' },
  { label: 'Bold', action: 'format:bold', state: 'bold' },
  { label: 'Strikethrough', action: 'format:strikethrough', state: 'strikethrough' },
  { label: 'Highlight', action: 'format:highlight', state: 'highlight' },
  { label: 'Connection', action: 'format:connection', state: 'connection' },
  { label: 'Link', action: 'format:link', state: 'link' },
]

function pommoraItems(
  wc: WebContents,
  s: FormatState,
  selection: string,
): MenuItemConstructorOptions[] {
  const act = (a: string): (() => void) => dispatch(wc, a)
  return [
    { type: 'separator' },
    // Offered only when the selection IS an address, which keeps it apart from Format ▸ Link.
    ...(isValidLink(selection) ? [{ label: 'Insert Link', click: act(INSERT_LINK_ACTION) }] : []),
    {
      label: 'Insert',
      submenu: [
        {
          label: 'Blockquote',
          type: 'checkbox',
          checked: s.block === 'quote',
          click: act('block:quote'),
        },
        { label: 'Horizontal Rule', click: act('block:hr') },
        { label: 'Code Block', click: act('block:code') },
        { label: 'Callout', click: act('block:callout') },
        { label: 'Table', click: act('block:table') },
        ...(s.citeSeat ? [{ label: 'Footnote', click: act('block:citation') }] : []),
      ],
    },
    {
      label: 'Format',
      // Display-only; formatKeymap binds the keys from the same table.
      submenu: FORMAT_ROWS.map(({ label, action, state }) => ({
        label,
        type: 'checkbox' as const,
        checked: s[state],
        accelerator: toAccelerator(commands[action]),
        registerAccelerator: false,
        click: act(action),
      })),
    },
    {
      label: 'Embed',
      submenu: [
        { label: 'Webpage', click: act('block:webpage') },
        { label: 'Internal Page', click: act('block:page') },
      ],
    },
    {
      label: 'Heading',
      submenu: HEADING_LEVELS.map(({ level, label }) => ({
        label,
        type: 'checkbox' as const,
        checked: s.heading === level,
        click: act(`heading:${level}`),
      })),
    },
    {
      label: 'Lists',
      submenu: [
        {
          label: 'Bullet List',
          type: 'checkbox',
          checked: s.list === 'bullet',
          click: act('list:bullet'),
        },
        {
          label: 'Numbered List',
          type: 'checkbox',
          checked: s.list === 'ordered',
          click: act('list:ordered'),
        },
        {
          label: 'Task List',
          type: 'checkbox',
          checked: s.list === 'checkbox',
          click: act('list:checkbox'),
        },
      ],
    },
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
      items.push(...pommoraItems(win.webContents, lastState, params.selectionText))
    items.push(...speechShareItems(params))
    Menu.buildFromTemplate(items).popup({ window: win })
  })
}
