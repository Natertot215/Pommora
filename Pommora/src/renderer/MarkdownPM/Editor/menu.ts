import type { EditorView } from '@codemirror/view'
import { EDITOR_ACTION_PREFIX, INSERT_LINK_ACTION, type FormatState } from '@shared/editorMenu'
import { isValidLink, normalizeLinkUrl } from '@shared/links'
import { serializeLink } from '@shared/linkValue'
import { PASTE_AS_PREFIX, type PasteAsForm } from '@shared/pasteAsMenu'
import type { ListKind } from '@shared/gripMenu'
import { insertCitation } from './citationActions'
import { embedInsertAtCaret, webpageInsertAtCaret } from './embedInsert'
import { pasteAs } from './pasteLink'
import {
  toggleInline,
  setHeading,
  setList,
  setBlock,
  type FormatEdit,
  type InlineFormat,
  type HeadingLevel,
  type BlockFormat,
} from '../Input/format'

/** Native context-menu seam — pushes editor state to main, receives chosen actions back. */
export interface EditorMenuApi {
  pushState: (s: FormatState) => void
  onAction: (cb: (action: string) => void) => () => void
}

/** The seam over the real bridge. The bridge's listener is per-caller, so every mounted editor
 *  hears every action; both directions answer to `subject` below. */
export const nativeEditorMenu: EditorMenuApi = {
  pushState: (s) => window.nexus.setEditorFormatState(s),
  onAction: (cb) => window.nexus.onMenuAction(cb),
}

/** The editor the native menu is about. Latched when focus lands rather than read live: a native
 *  menu can hold the document's focus while it's open, so `hasFocus` reads false at exactly the
 *  moment the chosen action comes back. */
let subject: EditorView | null = null

export const claimEditorMenu = (view: EditorView): void => {
  subject = view
}

/** Released on unmount only — never on blur, which is the state a native menu puts the editor in. */
export const releaseEditorMenu = (view: EditorView): void => {
  if (subject === view) subject = null
}

export const ownsEditorMenu = (view: EditorView): boolean => subject === view

function editFor(action: string, doc: string, from: number, to: number): FormatEdit | null {
  const [group, value] = action.split(':')
  switch (group) {
    case 'format':
      return toggleInline(doc, from, to, value as InlineFormat)
    case 'heading':
      return setHeading(doc, from, to, Number(value) as HeadingLevel)
    case 'list':
      return setList(doc, from, to, value as ListKind)
    case 'block':
      return setBlock(doc, from, to, value as BlockFormat)
    default:
      return null
  }
}

/** Wrap a selected address in the link syntax, pointing at itself. The selected words stay the
 *  label, so a schemeless address keeps its bare form while its target gains the scheme. */
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

/** Apply a `mdpm:*` menu action to the editor; ignores actions from other `menu:action` senders.
 *  Applies to whatever view is handed in — only the broadcast menu subscription has to ask
 *  `ownsEditorMenu` first. */
export function applyEditorAction(view: EditorView, raw: string): boolean {
  if (!raw.startsWith(EDITOR_ACTION_PREFIX)) return false
  const action = raw.slice(EDITOR_ACTION_PREFIX.length)
  // Page embeds type the opener and hand off to the autocomplete, not a plain format edit.
  if (action === 'block:page') return embedInsertAtCaret(view)
  if (action === 'block:webpage') return webpageInsertAtCaret(view)
  if (action === INSERT_LINK_ACTION) return insertLinkOverSelection(view)
  // A footnote is a pair at two disjoint sites, not a block whose format changes, so it sits here
  // rather than inside the format union's exhaustive switch.
  if (action === 'block:citation') return insertCitation(view)
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
