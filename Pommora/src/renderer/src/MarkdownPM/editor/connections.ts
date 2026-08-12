import { EditorView } from '@codemirror/view'
import { tokenize } from '../tokens'
import type { ConnectionsApi, ConnPage } from '../connections'

type GetApi = () => ConnectionsApi | undefined

const CONN_HOVER_INTENT_MS = 450

/** One pending hover intent — re-arming replaces it, cancel is idempotent. Shared by the editor's
 *  own handlers and the table's resting-cell trigger, so the delay stays one fact. */
export function hoverIntent(): { arm: (fire: () => void) => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  const cancel = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  return {
    arm: (fire) => {
      cancel()
      timer = setTimeout(fire, CONN_HOVER_INTENT_MS)
    },
    cancel,
  }
}

function wikiLinkAt(
  view: EditorView,
  pos: number,
): { title: string; from: number; to: number } | null {
  const line = view.state.doc.lineAt(pos)
  const rel = pos - line.from
  const tk = tokenize(line.text).find(
    (t) => t.kind === 'wikiLink' && rel >= t.range[0] && rel <= t.range[1],
  )
  if (!tk) return null
  const [rs, re] = tk.resolveRange ?? tk.contentRange
  return { title: line.text.slice(rs, re), from: line.from + tk.range[0], to: line.from + tk.range[1] }
}

/** The resolved connection page under the pointer, or null — the shared hit-test for every handler.
 *  A connection the caret is already inside resolves to null: it's open for editing, and its own
 *  syntax is revealed, so neither a click nor a dwell should carry you away from what you're typing. */
function resolvedPageAt(view: EditorView, api: ConnectionsApi, event: MouseEvent): ConnPage | null {
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const hit = wikiLinkAt(view, pos)
  if (!hit) return null
  const head = view.state.selection.main.head
  if (view.hasFocus && head >= hit.from && head <= hit.to) return null
  const res = api.resolve(hit.title)
  return res.status === 'resolved' && res.page ? res.page : null
}

export function connectionClicks(getApi: GetApi): ReturnType<typeof EditorView.domEventHandlers> {
  // The pending hover intent — armed on mouseover of a resolved connection, cancelled the
  // moment the pointer leaves it (mouseout fires per CM6 text span; re-entry re-arms fresh).
  const intent = hoverIntent()
  return EditorView.domEventHandlers({
    mouseover(event, view) {
      const api = getApi()
      if (!api?.hover) return false
      intent.cancel()
      // Cheap class gate FIRST (the every-mouseover hard rule): only a resolved connection's
      // decoration span warrants the layout read + line tokenize below.
      const el = (event.target as HTMLElement).closest?.('.md-connection-resolved')
      if (!el) return false
      const page = resolvedPageAt(view, api, event)
      if (!page) return false
      intent.arm(() => api.hover?.(page, el))
      return false
    },
    mouseout() {
      intent.cancel()
      return false
    },
    // Navigate on a plain single-click. Handled on `click`, not `mousedown`, and skipped when the
    // selection is non-empty — so dragging across a connection highlights it instead of navigating away.
    click(event, view) {
      // A click consumes the link — an intent armed during the dwell must not bloom over
      // whatever the click opened.
      intent.cancel()
      if (event.button !== 0 || event.detail !== 1 || !view.state.selection.main.empty) return false
      const api = getApi()
      if (!api) return false
      const page = resolvedPageAt(view, api, event)
      if (!page) return false
      event.preventDefault()
      // The one modifier branch: ⌘ takes the host's other route when it offers one.
      if (event.metaKey && api.bypass) api.bypass(page)
      else api.open(page)
      return true
    },
    // Right-click on a resolved connection hands off to the host's menu hook (Open Preview et al).
    contextmenu(event, view) {
      intent.cancel()
      const api = getApi()
      if (!api?.menu) return false
      const page = resolvedPageAt(view, api, event)
      if (!page) return false
      event.preventDefault()
      api.menu(page)
      return true
    },
  })
}
