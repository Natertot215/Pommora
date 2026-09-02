// The editor's native right-click menu. Built from the OS `context-menu` event (so spelling,
// Share, Speech, and the system edit roles come native) plus Pommora formatting submenus drawn
// from the renderer's last-pushed FormatState, since Electron's static params can't see CM6 state.

import { Menu, clipboard } from 'electron'
import type {
  BrowserWindow,
  ContextMenuParams,
  MenuItemConstructorOptions,
  WebContents,
} from 'electron'
import {
  acceleratorFor,
  EDITOR_ACTION_PREFIX,
  type FormatChordAction,
  type FormatState,
  INSERT_LINK_ACTION,
} from '@shared/editorMenu'
import { HEADING_LEVELS } from '@shared/gripMenu'
import { isValidLink } from '@shared/links'
import { PASTE_AS_PREFIX, pasteAsRows } from '@shared/pasteAsMenu'

let lastState: FormatState | null = null
export function setFormatState(s: FormatState): void {
  lastState = s
}

// The renderer flags when the pointer sits on any block grip (set on hover, live before the
// right-press). Grips are editable content, so the generic editor menu would otherwise fire over
// them too; this lets each grip's own menu be the only one.
let gripHot = false
export function setGripHot(on: boolean): void {
  gripHot = on
}

// The context-menu event hands over a bare WebContents, not a BrowserWindow, so the typed
// push (which takes a window) can't be used here.
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
    // Paste As only means anything where a markdown surface is receiving it.
    ...(editorFocused ? pasteAsItems(wc) : []),
    // The `pasteAndMatchStyle` role would take back ⌘⇧V's accelerator, which now belongs to the
    // inverse paste command (→ ConfigurationPM §Commands).
    {
      label: 'Paste Without Formatting',
      enabled: f.canPaste,
      click: () => wc.pasteAndMatchStyle(),
    },
    { role: 'selectAll' },
  )
  return items
}

// OS sharing/speech — placed last so the Pommora formatting block sits directly under the edit items.
function speechShareItems(params: ContextMenuParams): MenuItemConstructorOptions[] {
  if (!params.selectionText) return []
  return [
    { type: 'separator' },
    { label: 'Speech', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] },
    { role: 'shareMenu', sharingItem: { texts: [params.selectionText] } },
  ]
}

/** The FormatState fields a checkbox row can wear a checkmark from. */
type FormatFlag = {
  [K in keyof FormatState]: FormatState[K] extends boolean ? K : never
}[keyof FormatState]

/** The Format submenu's rows, in display order. */
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
    // Turns a selected address into a link without retyping it; offered only when the selection IS
    // one, which is what keeps it apart from Format ▸ Link (an empty target for un-pointed words).
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
      // Accelerators are display-only (registerAccelerator: false); the keys are bound in
      // formatKeymap.ts, from the same FORMAT_CHORDS this reads.
      submenu: FORMAT_ROWS.map(({ label, action, state }) => ({
        label,
        type: 'checkbox' as const,
        checked: s[state],
        accelerator: acceleratorFor(action),
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
        type: 'radio' as const,
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

// What the clipboard could be pasted as, where it holds anything that can become more than itself.
// The clipboard is read here rather than pushed from the renderer: the offer is decided from its
// text alone, and the renderer cannot read it in time — main's `context-menu` event fires in the same
// turn as the right-click that triggers it.
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
    if (gripHot) return // a grip right-click → the renderer pops that grip's own menu
    if (!params.isEditable) return // sidebar + read-only surfaces keep their own menus
    const items = systemItems(win.webContents, params, lastState?.focused === true)
    if (lastState?.focused)
      items.push(...pommoraItems(win.webContents, lastState, params.selectionText))
    items.push(...speechShareItems(params))
    Menu.buildFromTemplate(items).popup({ window: win })
  })
}
