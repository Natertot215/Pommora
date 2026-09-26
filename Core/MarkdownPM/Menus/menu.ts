import { Prec, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { INSERT_LINK_ACTION, PASTE_PLAIN_ACTION } from '@pommora/core/Actions/editorMenu'
import { isValidLink, normalizeLinkUrl } from '@pommora/core/Paths/urlPath'
import { serializeLink } from '@pommora/core/Connections/linkValue'
import { PASTE_AS_PREFIX, type PasteAsForm } from '@pommora/core/Actions/pasteAsMenu'
import type { HeadingLevel, ListKind } from '@pommora/core/Actions/gripMenu'
import type { BlockFormat } from '@pommora/core/Actions/blockMenu'
import { citationSeatAt, insertCitation } from '../Citations/citationActions'
import { embedInsertAtCaret, embedSeatAt, webpageInsertAtCaret } from '../Embeds/embedInsert'
import { pasteAs } from '../Links/pasteLink'
import { readFormatState } from '../Input/formatState'
import type { MarkdownScope } from '../Engine/detect'
import { editorHost } from '../api'
import { applyEdit } from '../Input/applyEdit'
import { docString } from '../docCache'
import {
  toggleInline,
  setHeading,
  setList,
  setBlock,
  type FormatEdit,
  type InlineFormat,
} from '../Input/format'
import { trimmedRange } from '../Engine/markdownCode'

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

/** The selected words stay the label, so a schemeless address keeps its bare form while its target gains the scheme. */
function insertLinkOverSelection(view: EditorView): boolean {
  const sel = view.state.selection.main
  const [from, to] = trimmedRange(docString(view.state.doc), sel.from, sel.to)
  const text = view.state.sliceDoc(from, to)
  if (!text.trim() || !isValidLink(text)) return false
  const insert = serializeLink({ url: normalizeLinkUrl(text), alias: text })
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
    userEvent: 'input',
  })
  view.focus()
  return true
}

/** Runs the menu's, the block pane's, or a chord's action on the view handed in. */
export function applyEditorAction(view: EditorView, action: string): boolean {
  if (action === 'block:page') return embedInsertAtCaret(view)
  if (action === 'block:webpage') return webpageInsertAtCaret(view)
  if (action === INSERT_LINK_ACTION) return insertLinkOverSelection(view)
  if (action === 'block:citation') return insertCitation(view)
  if (action === PASTE_PLAIN_ACTION) {
    void pasteAs(view, 'literal')
    return true
  }
  if (action.startsWith(PASTE_AS_PREFIX)) {
    void pasteAs(view, action.slice(PASTE_AS_PREFIX.length) as PasteAsForm)
    return true
  }
  const sel = view.state.selection.main
  if (!applyEdit(view, editFor(action, docString(view.state.doc), sel.from, sel.to))) return false
  view.focus()
  return true
}

/** Asks at the click and answers to the reply: the native menu holds focus, so nothing read later could say which view was clicked. Lowest precedence, so a grip, a link, or a footnote row that claimed the press keeps its own menu. */
export const editorMenu = (scope: MarkdownScope): Extension =>
  Prec.lowest(
    EditorView.domEventHandlers({
      contextmenu(event, view) {
        const ask = view.state.facet(editorHost).menus.format
        if (!ask || view.state.readOnly) return false
        // The browser seats the word under a right-click after this handler, so a click outside the selection reads the flags at the click.
        const sel = view.state.selection.main
        const at = view.posAtCoords(event)
        const [from, to] =
          at !== null && (at < sel.from || at > sel.to) ? [at, at] : [sel.from, sel.to]
        const page = scope === 'page'
        void ask({
          ...readFormatState(docString(view.state.doc), from, to),
          scope,
          x: event.clientX,
          y: event.clientY,
          embedSeat: page && embedSeatAt(view.state, from),
          citeSeat: page && citationSeatAt(view.state, to),
        }).then((action) => {
          if (action && view.dom.isConnected) applyEditorAction(view, action)
        })
        return false
      },
    }),
  )
