import { EditorSelection, Prec, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { pasteModeOf } from '../../Actions/pasteAsMenu'
import type { EditorMenuRequest } from '../../Actions/editorMenu'
import { citationSeatAt, insertCitation } from '../Citations/citationActions'
import { embedInsertAtCaret, embedSeatAt, webpageInsertAtCaret } from '../Embeds/embedInsert'
import { pasteFromClipboard } from '../Links/pasteLink'
import { readFormatState } from '../Input/formatState'
import type { BlockSpan, MarkdownScope } from '../Engine/detect'
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
  { from, to }: BlockSpan = view.state.selection.main,
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

/** Every surface's right-click, routed from where its own hit test lands, run only once the host can ask: a list glyph asks for its type menu at its own point, which seats nothing, and anything else for the format menu over one range. That's the selection when the click lands in its reach, and otherwise the word under the pointer, or the point where it sits on none, as the surface seats it. */
export function routeRightClick(
  host: EditorHost,
  scan: DocScan,
  event: { clientX: number; clientY: number; preventDefault(): void },
  click: () => {
    at: number
    glyph: boolean
    sel: BlockSpan
    word: () => BlockSpan | null
  },
  surface: {
    seat: (range: BlockSpan) => BlockSpan
    request: (
      from: number,
      to: number,
    ) => Pick<EditorMenuRequest, 'embedSeat' | 'citeSeat' | 'resting'>
    apply: (action: string, from: number, to: number) => void
  },
): void {
  const ask = host.menus.format
  if (!ask) return
  const { at, glyph, sel, word } = click()
  const point = { from: at, to: at }
  const inside = !glyph && clickInside(scan.text, at, sel.from, sel.to)
  const { from, to } = glyph ? point : inside ? sel : surface.seat(word() ?? point)
  if (!inside && !glyph) keepSeatedSelection()
  const state = readFormatState(scan, from, to, host.settings())
  if (glyph) event.preventDefault()
  const pick = glyph
    ? host.menus.grip({ kind: 'glyph', current: state.list })
    : ask({
        ...state,
        scope: scan.scope,
        x: event.clientX,
        y: event.clientY,
        ...surface.request(from, to),
      })
  void pick.then((action) => {
    if (action) surface.apply(action, from, to)
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
        const wordUnder = (): BlockSpan | null => {
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
            seat: ({ from, to }) => {
              view.dispatch({
                selection: EditorSelection.range(from, to),
                userEvent: 'select.pointer',
              })
              return view.state.selection.main
            },
            request: () => ({
              embedSeat: page && embedSeatAt(view.state),
              citeSeat: page && citationSeatAt(view.state),
              resting: null,
            }),
            apply: (action, from, to) => {
              if (!glyph) applyEditorAction(view, action)
              else if (view.state.doc === opened) applyEditorAction(view, action, { from, to })
            },
          },
        )
        return false
      },
    }),
  )
