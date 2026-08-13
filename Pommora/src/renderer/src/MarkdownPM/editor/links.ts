import { EditorView } from '@codemirror/view'
import { isValidLink } from '@shared/links'
import { tokenize } from '../tokens'
import { seatAtNearerEdge } from './input'

interface LinkHit {
  url: string
  /** The whole token, markers included. */
  range: [number, number]
  /** Whether the gesture landed on the label — at rest, the only part of a link that has width. */
  onText: boolean
  /** Whether the link is drawn with its syntax hidden, and so has space beside it to clamp from. */
  hidesSyntax: boolean
  pos: number
}

// The external markdown link under a pointer gesture. Works even when the markers are hidden
// off-caret, since the source still holds them.
//
// Where the pointer landed is asked of the drawn label rather than computed from offsets:
// `posAtCoords` clamps to the nearest RENDERED position and a valid link's `[` and `](url)` are
// replaced to zero width, so a click in the space past a short label resolves back onto the label's
// last character. Following that would launch the system browser for a link the pointer never
// touched. An invalid link draws its whole syntax, so there's nothing beside it to clamp from.
function linkUnder(view: EditorView, event: MouseEvent): LinkHit | null {
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const line = view.state.doc.lineAt(pos)
  const rel = pos - line.from
  const tk = tokenize(line.text).find(
    (t) => t.kind === 'link' && rel >= t.range[0] && rel <= t.range[1],
  )
  if (!tk) return null
  const closer = line.text.slice(tk.markerRanges[1][0], tk.markerRanges[1][1])
  const url = closer.slice(2, -1)
  if (!url) return null
  const el = (event.target as HTMLElement).closest?.('.md-link, .md-link-invalid')
  return {
    url,
    range: [line.from + tk.range[0], line.from + tk.range[1]],
    onText: el != null && rel >= tk.contentRange[0] && rel <= tk.contentRange[1],
    hidesSyntax: isValidLink(url),
    pos,
  }
}

// Navigate an external link on a plain single-click (mirrors connectionClicks). Opening is
// host-owned — main's shell.openExternal via the IPC bridge; the renderer never opens it directly.
export function externalLinkClicks(): ReturnType<typeof EditorView.domEventHandlers> {
  // The same mousedown record connections keeps, and for the same reason: CM seats the caret before
  // `click` runs, so reading it live can never tell "I was editing this" from "I just clicked it" —
  // it reads true for every press and no link opens at all.
  let editingOnPress = false
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      const hit = linkUnder(view, event)
      const head = view.state.selection.main.head
      editingOnPress = !!hit && view.hasFocus && head >= hit.range[0] && head <= hit.range[1]
      if (!hit) return false
      // Extending a selection, double- and triple-click, and the other buttons keep CM's own
      // semantics over a link like anywhere else.
      if (event.button !== 0 || event.shiftKey || event.detail > 1) return false
      // Clamped in from beside the link rather than landing on it: seat where the pointer actually
      // was. Open for editing, the syntax is real text and the press is aiming at it.
      if (!hit.onText && hit.hidesSyntax && !editingOnPress)
        return seatAtNearerEdge(view, hit.pos, hit.range)
      if (!hit.onText || editingOnPress) return false
      // A press that will follow the link doesn't seat a caret in it on the way out.
      event.preventDefault()
      return true
    },
    click(event, view) {
      if (event.button !== 0 || event.detail !== 1 || !view.state.selection.main.empty) return false
      if (editingOnPress) return false
      const hit = linkUnder(view, event)
      if (!hit?.onText) return false
      event.preventDefault()
      void window.nexus.openExternal(hit.url)
      return true
    },
  })
}
