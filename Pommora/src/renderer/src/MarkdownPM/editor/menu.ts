import type { EditorView } from '@codemirror/view'
import { EDITOR_ACTION_PREFIX, INSERT_LINK_ACTION, type FormatState } from '@shared/editorMenu'
import { isValidLink, normalizeLinkUrl } from '@shared/links'
import { serializeLink } from '@shared/linkValue'
import { PASTE_AS_PREFIX, type PasteAsForm } from '@shared/PasteAsMenu'
import { embedInsertAtCaret } from './embedInsert'
import { pasteAs } from './PasteLink'
import {
  toggleInline,
  setHeading,
  setList,
  setBlock,
  type FormatEdit,
  type InlineFormat,
  type HeadingLevel,
  type ListFormat,
  type BlockFormat,
} from '../input/format'

/** Native context-menu seam — pushes editor state to main, receives chosen actions back. */
export interface EditorMenuApi {
  pushState: (s: FormatState) => void
  onAction: (cb: (action: string) => void) => () => void
}

/** The seam over the real bridge. Every surface that mounts an editor passes this one — a menu built
 *  from the last-pushed state can only be right for whichever editor pushed last, so an editor that
 *  doesn't push gets no Pommora items at all. */
export const nativeEditorMenu: EditorMenuApi = {
  pushState: (s) => window.nexus.setEditorFormatState(s),
  onAction: (cb) => window.nexus.onMenuAction(cb),
}

function editFor(action: string, doc: string, from: number, to: number): FormatEdit | null {
  const [group, value] = action.split(':')
  switch (group) {
    case 'format':
      return toggleInline(doc, from, to, value as InlineFormat)
    case 'heading':
      return setHeading(doc, from, Number(value) as HeadingLevel)
    case 'list':
      return setList(doc, from, value as ListFormat)
    case 'block':
      return setBlock(doc, from, value as BlockFormat)
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
  const action = raw.slice(EDITOR_ACTION_PREFIX.length)
  // Page embeds type the opener and hand off to the autocomplete, not a plain format edit.
  if (action === 'block:page') return embedInsertAtCaret(view)
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
