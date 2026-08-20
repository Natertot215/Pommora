import type { EditorView } from '@codemirror/view'
import {
  BLOCK_FORMATS,
  EDITOR_ACTION_PREFIX,
  EDITOR_LIST_KINDS,
  DOC_HEADING_LEVELS,
  INLINE_FORMATS,
  INSERT_LINK_ACTION,
  type FormatState,
} from '@shared/editorMenu'
import { isValidLink, normalizeLinkUrl } from '@shared/links'
import { serializeLink } from '@shared/linkValue'
import { PASTE_AS_PREFIX, type PasteAsForm } from '@shared/PasteAsMenu'
import { embedInsertAtCaret, webpageInsertAtCaret } from './embedInsert'
import { pasteAs } from './PasteLink'
import { toggleInline, setHeading, setList, setBlock, type FormatEdit } from '../input/format'

/** Native context-menu seam — pushes editor state to main, receives chosen actions back. */
export interface EditorMenuApi {
  pushState: (s: FormatState) => void
  onAction: (cb: (action: string) => void) => () => void
}

/** The seam over the real bridge. Every surface that mounts an editor passes this one, and the
 *  bridge's listener is per-caller — so every mounted editor hears every action, and the menu is
 *  built from whatever state was pushed last. Both directions answer to `subject` below. */
export const nativeEditorMenu: EditorMenuApi = {
  pushState: (s) => window.nexus.setEditorFormatState(s),
  onAction: (cb) => window.nexus.onMenuAction(cb),
}

/** The editor the native menu is about. Latched when focus lands rather than read live: a native
 *  menu can hold the document's focus while it is open, so `hasFocus` is false at exactly the
 *  moment the chosen action comes back. Parked tabs and resting embeds keep their editors mounted,
 *  and an action applied to one of those writes a document nobody opened. */
let subject: EditorView | null = null

export const claimEditorMenu = (view: EditorView): void => {
  subject = view
}

/** Released on unmount only — never on blur, which is the state a native menu puts the editor in. */
export const releaseEditorMenu = (view: EditorView): void => {
  if (subject === view) subject = null
}

export const ownsEditorMenu = (view: EditorView): boolean => subject === view

/** Resolve the action's tail back through the set that offered it rather than casting it. The reply
 *  is a bare string by the time it crosses the bridge, so only a value the menu actually names may
 *  reach an edit — a row main grows without a branch here resolves to nothing instead of arriving
 *  as a lie and falling off an exhaustive switch. */
function editFor(action: string, doc: string, from: number, to: number): FormatEdit | null {
  const [group, value] = action.split(':')
  switch (group) {
    case 'format': {
      const fmt = INLINE_FORMATS.find((f) => f === value)
      return fmt ? toggleInline(doc, from, to, fmt) : null
    }
    case 'heading': {
      const level = DOC_HEADING_LEVELS.find((l) => String(l) === value)
      return level === undefined ? null : setHeading(doc, from, level)
    }
    case 'list': {
      const kind = EDITOR_LIST_KINDS.find((k) => k === value)
      return kind ? setList(doc, from, kind) : null
    }
    case 'block': {
      const fmt = BLOCK_FORMATS.find((f) => f === value)
      return fmt ? setBlock(doc, from, fmt) : null
    }
    default:
      return null
  }
}

/** Wrap a selected address in the link syntax, pointing at itself. The words you selected stay the
 *  label — an address converted in place should still read as the address you were looking at — so a
 *  schemeless one keeps its bare form while its target gains the scheme that makes it open. */
function insertLinkOverSelection(view: EditorView): boolean {
  const sel = view.state.selection.main
  const text = view.state.sliceDoc(sel.from, sel.to).trim()
  if (!text || !isValidLink(text)) return false
  const insert = serializeLink({ url: normalizeLinkUrl(text), alias: text })
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert },
    selection: { anchor: sel.from + insert.length },
    userEvent: 'input',
  })
  view.focus()
  return true
}

/** Apply a `mdpm:*` menu action to the editor; ignores actions from other `menu:action` senders. */
export function applyEditorAction(view: EditorView, raw: string): boolean {
  if (!raw.startsWith(EDITOR_ACTION_PREFIX)) return false
  if (!ownsEditorMenu(view)) return false
  const action = raw.slice(EDITOR_ACTION_PREFIX.length)
  // Page embeds type the opener and hand off to the autocomplete, not a plain format edit.
  if (action === 'block:page') return embedInsertAtCaret(view)
  if (action === 'block:webpage') return webpageInsertAtCaret(view)
  if (action === INSERT_LINK_ACTION) return insertLinkOverSelection(view)
  // Paste As reads the clipboard back over the bridge, so it finishes a turn later than the rest.
  if (action.startsWith(PASTE_AS_PREFIX)) {
    void pasteAs(view, action.slice(PASTE_AS_PREFIX.length) as PasteAsForm)
    return true
  }
  const sel = view.state.selection.main
  const edit = editFor(action, view.state.doc.toString(), sel.from, sel.to)
  if (!edit) return false
  view.dispatch({
    changes: edit.changes,
    selection: edit.selection !== undefined ? { anchor: edit.selection } : undefined,
    userEvent: 'input',
  })
  view.focus()
  return true
}
