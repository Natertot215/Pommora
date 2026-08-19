// The editor's native right-click menu. Built from the OS `context-menu` event (so spelling,
// Share, Speech, and the system edit roles come native) plus Pommora formatting submenus drawn
// from the renderer's last-pushed FormatState (Electron's static params can't see CM6 state).
// Sidebar right-clicks (non-editable) fall through to their own React→IPC menu untouched.

import { Menu, clipboard } from 'electron'
import type {
  BrowserWindow,
  ContextMenuParams,
  MenuItemConstructorOptions,
  WebContents,
} from 'electron'
import { EDITOR_ACTION_PREFIX, INSERT_LINK_ACTION, type FormatState } from '@shared/editorMenu'
import { isValidLink } from '@shared/links'
import { PASTE_AS_PREFIX, pasteAsRows } from '@shared/PasteAsMenu'

let lastState: FormatState | null = null
export function setFormatState(s: FormatState): void {
  lastState = s
}

// The renderer flags when the pointer sits on any block grip (set on hover, so it's live before the
// right-press). Grips are editable content — unlike the non-editable table widget — so the generic
// editor menu would otherwise fire over them; this lets each grip's own menu be the only one.
let gripHot = false
export function setGripHot(on: boolean): void {
  gripHot = on
}

// raw send: the context-menu event hands over a bare WebContents, not a BrowserWindow,
// so the typed push (which takes a window) can't be used here.
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
    // The paste block reads outward from the plain act: paste, paste as something else, paste with
    // nothing carried over. Paste As only means anything where a markdown surface is receiving it.
    ...(editorFocused ? pasteAsItems(wc) : []),
    // The `pasteAndMatchStyle` role would take ⌘⇧V's accelerator back, and that chord belongs to the
    // inverse paste now (→ ConfigurationPM §Commands). The act itself is unchanged.
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

function pommoraItems(
  wc: WebContents,
  s: FormatState,
  selection: string,
): MenuItemConstructorOptions[] {
  const act = (a: string): (() => void) => dispatch(wc, a)
  const heading = (label: string, level: number): MenuItemConstructorOptions => ({
    label,
    type: 'radio',
    checked: s.heading === level,
    click: act(`heading:${level}`),
  })
  return [
    { type: 'separator' },
    // An address sitting in the prose as ordinary text, selected: the one gesture that turns it into
    // a link without retyping it. Offered only when the selection IS one, which is what keeps it
    // apart from Format ▸ Link — that one opens an empty target for words you have yet to point
    // anywhere.
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
      ],
    },
    {
      label: 'Format',
      submenu: [
        // Accelerators are display-only (registerAccelerator: false); the keys are bound in formatKeymap.ts.
        {
          label: 'Italic',
          type: 'checkbox',
          checked: s.italic,
          accelerator: 'CmdOrCtrl+I',
          registerAccelerator: false,
          click: act('format:italic'),
        },
        {
          label: 'Inline Code',
          type: 'checkbox',
          checked: s.inlineCode,
          accelerator: 'CmdOrCtrl+E',
          registerAccelerator: false,
          click: act('format:inlineCode'),
        },
        {
          label: 'Bold',
          type: 'checkbox',
          checked: s.bold,
          accelerator: 'CmdOrCtrl+B',
          registerAccelerator: false,
          click: act('format:bold'),
        },
        {
          label: 'Strikethrough',
          type: 'checkbox',
          checked: s.strikethrough,
          accelerator: 'CmdOrCtrl+Shift+X',
          registerAccelerator: false,
          click: act('format:strikethrough'),
        },
        {
          label: 'Connection',
          type: 'checkbox',
          checked: s.connection,
          accelerator: 'CmdOrCtrl+Shift+K',
          registerAccelerator: false,
          click: act('format:connection'),
        },
        {
          label: 'Link',
          type: 'checkbox',
          checked: s.link,
          accelerator: 'CmdOrCtrl+K',
          registerAccelerator: false,
          click: act('format:link'),
        },
      ],
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
      submenu: [
        heading('Paragraph', 0),
        heading('Heading 1', 1),
        heading('Heading 2', 2),
        heading('Heading 3', 3),
        heading('Heading 4', 4),
        heading('Heading 5', 5),
      ],
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
          checked: s.list === 'task',
          click: act('list:task'),
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
  const rows = pasteAsRows(clipboard.readText())
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
