import { EditorSelection, Prec, type Extension } from '@codemirror/state'
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
import { clickInside } from '../Engine/markdownCode'
import { glyphAt } from '../lineDom'
import { editFor } from '../Input/format'

/** Runs the menu's, the block pane's, or a chord's action on the view handed in, over the selection unless a range is handed in. */
export function applyEditorAction(
  view: EditorView,
  action: string,
  scope: MarkdownScope = 'page',
  { from, to }: { from: number; to: number } = view.state.selection.main,
): void {
  const how = pasteModeOf(action)
  const settings = view.state.facet(editorHost).settings()
  if (action === 'block:page') embedInsertAtCaret(view)
  else if (action === 'block:webpage') webpageInsertAtCaret(view)
  else if (action === 'block:citation') insertCitation(view)
  else if (how) void pasteFromClipboard(view, how)
  else if (applyEdit(view, editFor(action, docScan(view.state.doc), from, to, settings, scope)))
    view.focus()
}

/** Asks at the click and answers to the reply: the native menu holds focus, so nothing read later could say which view was clicked. A list glyph asks for its type menu instead. Lowest precedence, so a grip, a link, or a footnote row that claimed the press keeps its own menu. */
export const editorMenu = (scope: MarkdownScope): Extension =>
  Prec.lowest(
    EditorView.domEventHandlers({
      contextmenu(event, view) {
        const host = view.state.facet(editorHost)
        const ask = host.menus.format
        if (!ask || view.state.readOnly) return false
        const glyph = glyphAt(event)
        // A text click outside the selection seats the word under it here, before the browser reseats or doesn't, so the flags and every row act where the click points; a list row keeps the click-time range, since a click points at an item.
        const opened = view.state.doc
        const sel = view.state.selection.main
        const at = glyph ? view.posAtDOM(glyph) : view.posAtCoords(event)
        const scan = docScan(opened)
        const inside = at === null || clickInside(scan.text, at, sel.from, sel.to, glyph !== null)
        const [from, to] = inside ? [sel.from, sel.to] : [at, at]
        if (!inside && !glyph)
          view.dispatch({ selection: view.state.wordAt(at) ?? EditorSelection.cursor(at) })
        const state = readFormatState(scan, from, to, host.settings(), scope)
        const page = scope === 'page'
        if (glyph) event.preventDefault()
        const pick = glyph
          ? host.menus.grip({ kind: 'glyph', current: state.list })
          : ask({
              ...state,
              scope,
              x: event.clientX,
              y: event.clientY,
              embedSeat: page && embedSeatAt(view.state, from),
              citeSeat: page && citationSeatAt(view.state, to),
              resting: null,
            })
        void pick.then((action) => {
          if (!action || !view.dom.isConnected) return
          if (!action.startsWith('list:')) applyEditorAction(view, action, scope)
          else if (view.state.doc === opened) applyEditorAction(view, action, scope, { from, to })
        })
        return false
      },
    }),
  )
