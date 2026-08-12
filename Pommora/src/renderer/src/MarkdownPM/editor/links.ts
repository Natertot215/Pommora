import { EditorView } from '@codemirror/view'
import { tokenize } from '../tokens'

// The external markdown link at `pos`, with its URL pulled from the source. Works even when the markers
// are hidden off-caret (the source still holds them). The carve-outs mirror connections exactly: the
// label is what a click acts on, and a link the caret is inside is text being edited.
function externalLinkAt(view: EditorView, pos: number): { url: string } | null {
  const line = view.state.doc.lineAt(pos)
  const rel = pos - line.from
  const tk = tokenize(line.text).find(
    (t) => t.kind === 'link' && rel >= t.range[0] && rel <= t.range[1],
  )
  if (!tk) return null
  if (rel < tk.contentRange[0] || rel > tk.contentRange[1]) return null
  const head = view.state.selection.main.head - line.from
  if (view.hasFocus && head >= tk.range[0] && head <= tk.range[1]) return null
  const closer = line.text.slice(tk.markerRanges[1][0], tk.markerRanges[1][1])
  const url = closer.slice(2, -1)
  return url ? { url } : null
}

// Navigate an external link on a plain single-click (mirrors connectionClicks). Opening is
// host-owned — main's shell.openExternal via the IPC bridge; the renderer never opens it directly.
export function externalLinkClicks(): ReturnType<typeof EditorView.domEventHandlers> {
  return EditorView.domEventHandlers({
    click(event, view) {
      if (event.button !== 0 || event.detail !== 1 || !view.state.selection.main.empty) return false
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos == null) return false
      const hit = externalLinkAt(view, pos)
      if (!hit) return false
      event.preventDefault()
      void window.nexus.openExternal(hit.url)
      return true
    },
  })
}
