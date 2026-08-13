import { EditorView } from '@codemirror/view'
import { tokenize } from '../tokens'

interface LinkHit {
  url: string
  /** The whole token, markers included. */
  range: [number, number]
}

// The external markdown link at `pos`, with its URL pulled from the source. Works even when the markers
// are hidden off-caret (the source still holds them). A position on the syntax beside the label belongs
// to caret placement rather than to the link.
function externalLinkAt(view: EditorView, pos: number): LinkHit | null {
  const line = view.state.doc.lineAt(pos)
  const rel = pos - line.from
  const tk = tokenize(line.text).find(
    (t) => t.kind === 'link' && rel >= t.range[0] && rel <= t.range[1],
  )
  if (!tk) return null
  if (rel < tk.contentRange[0] || rel > tk.contentRange[1]) return null
  const closer = line.text.slice(tk.markerRanges[1][0], tk.markerRanges[1][1])
  const url = closer.slice(2, -1)
  if (!url) return null
  return { url, range: [line.from + tk.range[0], line.from + tk.range[1]] }
}

const linkUnder = (view: EditorView, event: MouseEvent): LinkHit | null => {
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  return pos == null ? null : externalLinkAt(view, pos)
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
      if (!hit || event.button !== 0 || editingOnPress) return false
      // A press that will follow the link doesn't seat a caret in it on the way out.
      event.preventDefault()
      return true
    },
    click(event, view) {
      if (event.button !== 0 || event.detail !== 1 || !view.state.selection.main.empty) return false
      if (editingOnPress) return false
      const hit = linkUnder(view, event)
      if (!hit) return false
      event.preventDefault()
      void window.nexus.openExternal(hit.url)
      return true
    },
  })
}
