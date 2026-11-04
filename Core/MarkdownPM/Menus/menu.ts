import { Prec, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { pasteModeOf } from '../../Actions/pasteAsMenu'
import { citationSeatAt, insertCitation } from '../Citations/citationActions'
import { embedInsertAtCaret, embedSeatAt, webpageInsertAtCaret } from '../Embeds/embedInsert'
import { pasteFromClipboard } from '../Links/pasteLink'
import { readFormatState } from '../Input/formatState'
import type { MarkdownScope } from '../Engine/detect'
import { editorHost } from '../api'
import { applyEdit } from '../Input/applyEdit'
import { docScan } from '../docCache'
import { editFor } from '../Input/format'

/** Runs the menu's, the block pane's, or a chord's action on the view handed in. */
export function applyEditorAction(
  view: EditorView,
  action: string,
  scope: MarkdownScope = 'page',
): void {
  const how = pasteModeOf(action)
  const sel = view.state.selection.main
  const settings = view.state.facet(editorHost).settings()
  if (action === 'block:page') embedInsertAtCaret(view)
  else if (action === 'block:webpage') webpageInsertAtCaret(view)
  else if (action === 'block:citation') insertCitation(view)
  else if (how) void pasteFromClipboard(view, how)
  else if (
    applyEdit(view, editFor(action, docScan(view.state.doc), sel.from, sel.to, settings, scope))
  )
    view.focus()
}

/** Asks at the click and answers to the reply: the native menu holds focus, so nothing read later could say which view was clicked. Lowest precedence, so a grip, a link, or a footnote row that claimed the press keeps its own menu. */
export const editorMenu = (scope: MarkdownScope): Extension =>
  Prec.lowest(
    EditorView.domEventHandlers({
      contextmenu(event, view) {
        const host = view.state.facet(editorHost)
        const ask = host.menus.format
        if (!ask || view.state.readOnly) return false
        // The browser seats the word under a right-click after this handler, so a click outside the selection reads the flags at the click.
        const sel = view.state.selection.main
        const at = view.posAtCoords(event)
        const [from, to] =
          at !== null && (at < sel.from || at > sel.to) ? [at, at] : [sel.from, sel.to]
        const page = scope === 'page'
        void ask({
          ...readFormatState(docScan(view.state.doc), from, to, host.settings(), scope),
          scope,
          x: event.clientX,
          y: event.clientY,
          embedSeat: page && embedSeatAt(view.state, from),
          citeSeat: page && citationSeatAt(view.state, to),
          resting: null,
        }).then((action) => {
          if (action && view.dom.isConnected) applyEditorAction(view, action, scope)
        })
        return false
      },
    }),
  )
