import { EditorView } from '@codemirror/view'
import { linkTarget, tokenize } from '../tokens'
import { resolveMdTarget, type ConnectionsApi, type MdTarget } from '../connections'
import { seatAtNearerEdge } from './input'
import { hoverIntent } from './connections'

type GetApi = () => ConnectionsApi | undefined

interface LinkHit {
  url: string
  /** What the target names — a page to navigate to, a URL to hand the system, or neither. */
  target: MdTarget
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
function linkUnder(view: EditorView, getApi: GetApi, event: MouseEvent): LinkHit | null {
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const line = view.state.doc.lineAt(pos)
  const rel = pos - line.from
  const tk = tokenize(line.text).find(
    (t) => t.kind === 'link' && rel >= t.range[0] && rel <= t.range[1],
  )
  if (!tk) return null
  const url = linkTarget(line.text, tk)
  if (!url) return null
  const target = resolveMdTarget(getApi(), url)
  // An internal target is drawn as a connection, so it answers to that class too.
  const el = (event.target as HTMLElement).closest?.(
    '.md-link, .md-link-invalid, .md-connection-resolved',
  )
  return {
    url,
    target,
    range: [line.from + tk.range[0], line.from + tk.range[1]],
    onText: el != null && rel >= tk.contentRange[0] && rel <= tk.contentRange[1],
    hidesSyntax: target.kind !== 'invalid',
    pos,
  }
}

// Follow a markdown link on a plain single-click (mirrors connectionClicks). Where it leads is the
// shared resolver's answer, so a link can't be coloured as a page and then opened as a website.
export function markdownLinkClicks(getApi: GetApi): ReturnType<typeof EditorView.domEventHandlers> {
  // The same mousedown record connections keeps, and for the same reason: CM seats the caret before
  // `click` runs, so reading it live can never tell "I was editing this" from "I just clicked it" —
  // it reads true for every press and no link opens at all.
  let editingOnPress = false
  // A markdown link naming a page is drawn as a connection and behaves as one, so it raises the same
  // hover preview. The connection handler can't do it: its hit-test reads wikiLink tokens, and this
  // is a `link`. Without this the same link previews in a table cell and not in the body.
  const intent = hoverIntent()
  return EditorView.domEventHandlers({
    mouseover(event, view) {
      const api = getApi()
      intent.cancel()
      if (!api?.hover) return false
      // Cheap class gate FIRST (the every-mouseover hard rule) — only a drawn internal link warrants
      // the layout read and the tokenize below.
      const el = (event.target as HTMLElement).closest?.('.md-connection-resolved')
      if (!el) return false
      const hit = linkUnder(view, getApi, event)
      if (!hit?.onText || hit.target.kind !== 'page') return false
      const head = view.state.selection.main.head
      // A link the caret is already inside is open for editing, and no dwell should carry you away
      // from what you're typing.
      if (view.hasFocus && head >= hit.range[0] && head <= hit.range[1]) return false
      const page = hit.target.page
      intent.arm(() => api.hover?.(page, el))
      return false
    },
    mouseout() {
      intent.cancel()
      return false
    },
    mousedown(event, view) {
      const hit = linkUnder(view, getApi, event)
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
      const hit = linkUnder(view, getApi, event)
      if (!hit?.onText) return false
      event.preventDefault()
      intent.cancel()
      // A target that names a page navigates there. Opening is host-owned either way — main's
      // shell.openExternal through the bridge, or the connections host's own router.
      if (hit.target.kind === 'page') getApi()?.open(hit.target.page)
      else void window.nexus.openExternal(hit.url)
      return true
    },
  })
}
