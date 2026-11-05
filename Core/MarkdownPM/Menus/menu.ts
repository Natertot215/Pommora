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
import { reachEnd } from '../Engine/markdownCode'
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
        // The browser seats the word under a right-click after this handler, so a click outside the selection reads the flags at the click, and a list row acts there too, since a click points at an item; every other row acts on the seated word.
        const opened = view.state.doc
        const sel = view.state.selection.main
        const at = glyph ? view.posAtDOM(glyph) : view.posAtCoords(event)
        const scan = docScan(opened)
        const [from, to] =
          at !== null && (at < sel.from || at > reachEnd(scan.text, sel.from, sel.to))
            ? [at, at]
            : [sel.from, sel.to]
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
