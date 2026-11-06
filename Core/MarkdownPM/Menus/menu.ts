import { EditorSelection, Prec, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { pasteModeOf } from '../../Actions/pasteAsMenu'
import type { EditorMenuRequest } from '../../Actions/editorMenu'
import { citationSeatAt, insertCitation } from '../Citations/citationActions'
import { embedInsertAtCaret, embedSeatAt, webpageInsertAtCaret } from '../Embeds/embedInsert'
import { pasteFromClipboard } from '../Links/pasteLink'
import { readFormatState } from '../Input/formatState'
import type { MarkdownScope } from '../Engine/detect'
import type { DocScan } from '../Engine/docScan'
import { type EditorHost, editorHost } from '../api'
import { applyEdit } from '../Input/applyEdit'
import { docScan } from '../docCache'
import { reachEnd } from '../Engine/markdownCode'
import { glyphAt } from '../lineDom'
import { wordAt } from '../Input/markdownInput'
import { editFor } from '../Input/format'

/** Runs the menu's, the block pane's, or a chord's action on the view handed in, over the selection unless a range is handed in. */
export function applyEditorAction(
  view: EditorView,
  action: string,
  { from, to }: { from: number; to: number } = view.state.selection.main,
): void {
  const how = pasteModeOf(action)
  const settings = view.state.facet(editorHost).settings()
  if (action === 'block:page') embedInsertAtCaret(view)
  else if (action === 'block:webpage') webpageInsertAtCaret(view)
  else if (action === 'block:citation') insertCitation(view)
  else if (how) void pasteFromClipboard(view, how)
  else if (applyEdit(view, editFor(action, docScan(view.state), from, to, settings))) view.focus()
}

const clickInside = (doc: string, at: number, from: number, to: number): boolean =>
  from < to && at >= from && at <= reachEnd(doc, from, to)

/** Chromium seats its own word after a right-click's handler wherever the selection doesn't hold the click, so a surface that seated its own range refuses it. */
function keepSeatedSelection(): void {
  const refuse = (e: Event): void => e.preventDefault()
  document.addEventListener('selectstart', refuse, true)
  setTimeout(() => document.removeEventListener('selectstart', refuse, true))
}

/** Every surface's right-click, routed from where its own hit test lands, run only once the host can ask: a list glyph asks for its type menu, anything else for the format menu. A click on text inside a selection's reach acts on the selection; anywhere else, and at a caret, the list rows and the format flags read the click's point, since a click points at an item, and every other row acts on the word under the pointer, or at the point where it sits on none, which the surface seats as its selection. */
export function routeRightClick(
  host: EditorHost,
  scan: DocScan,
  event: { clientX: number; clientY: number; preventDefault(): void },
  click: () => {
    at: number
    glyph: boolean
    sel: { from: number; to: number }
    word: () => { from: number; to: number } | null
  },
  surface: {
    seat: (from: number, to: number) => void
    request: (
      from: number,
      to: number,
      start: number,
      end: number,
    ) => Pick<EditorMenuRequest, 'embedSeat' | 'citeSeat' | 'resting'>
    apply: (action: string, from: number, to: number) => void
  },
): void {
  const ask = host.menus.format
  if (!ask) return
  const { at, glyph, sel, word: wordOf } = click()
  const inside = !glyph && clickInside(scan.text, at, sel.from, sel.to)
  const [from, to] = inside ? [sel.from, sel.to] : [at, at]
  const word = inside || glyph ? null : wordOf()
  const [start, end] = word ? [word.from, word.to] : [from, to]
  if (!inside && !glyph) {
    surface.seat(start, end)
    keepSeatedSelection()
  }
  const state = readFormatState(scan, from, to, host.settings())
  if (glyph) event.preventDefault()
  const pick = glyph
    ? host.menus.grip({ kind: 'glyph', current: state.list })
    : ask({
        ...state,
        scope: scan.scope,
        x: event.clientX,
        y: event.clientY,
        ...surface.request(from, to, start, end),
      })
  void pick.then((action) => {
    if (!action) return
    const list = action.startsWith('list:')
    surface.apply(action, list ? from : start, list ? to : end)
  })
}

/** Asks at the click and answers to the reply: the native menu holds focus, so nothing read later could say which view was clicked. Lowest precedence, so a grip, a link, or a footnote row that claimed the press keeps its own menu. */
export const editorMenu = (scope: MarkdownScope): Extension =>
  Prec.lowest(
    EditorView.domEventHandlers({
      contextmenu(event, view) {
        if (view.state.readOnly) return false
        const glyph = glyphAt(event)
        const opened = view.state.doc
        const hit = view.posAndSideAtCoords(event, false)
        const wordUnder = (): { from: number; to: number } | null => {
          const edge = view.coordsAtPos(hit.pos, hit.assoc)
          const onText =
            !!edge &&
            (hit.assoc < 0 ? event.clientX <= edge.right : event.clientX >= edge.left) &&
            event.clientY >= edge.top &&
            event.clientY <= edge.bottom
          return onText ? wordAt(view.state, hit.pos, hit.assoc) : null
        }
        const page = scope === 'page'
        routeRightClick(
          view.state.facet(editorHost),
          docScan(view.state),
          event,
          () => ({
            at: glyph ? view.posAtDOM(glyph) : hit.pos,
            glyph: glyph !== null,
            sel: view.state.selection.main,
            word: wordUnder,
          }),
          {
            seat: (from, to) => view.dispatch({ selection: EditorSelection.range(from, to) }),
            request: (from, to) => ({
              embedSeat: page && embedSeatAt(view.state, from),
              citeSeat: page && citationSeatAt(view.state, to),
              resting: null,
            }),
            apply: (action, from, to) => {
              if (view.state.doc === opened) applyEditorAction(view, action, { from, to })
            },
          },
        )
        return false
      },
    }),
  )
