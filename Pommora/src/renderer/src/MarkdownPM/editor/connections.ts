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

export interface WikiHit {
  title: string
  /** The whole token, markers included. */
  range: [number, number]
  /** What the token displays — the alias when it has one. */
  content: [number, number]
}

/** The wikiLink token at `pos`, resolved or not, in absolute document offsets. */
export function wikiLinkAt(view: EditorView, pos: number): WikiHit | null {
  const line = view.state.doc.lineAt(pos)
  const rel = pos - line.from
  const tk = tokenize(line.text).find(
    (t) => t.kind === 'wikiLink' && rel >= t.range[0] && rel <= t.range[1],
  )
  if (!tk) return null
  const [rs, re] = tk.resolveRange ?? tk.contentRange
  const abs = ([s, e]: [number, number]): [number, number] => [line.from + s, line.from + e]
  return { title: line.text.slice(rs, re), range: abs(tk.range), content: abs(tk.contentRange) }
}

/** Whether the caret currently sits inside the token — a link being edited. Read at mousedown for a
 *  click, since CM seats the caret before `click` fires and it would otherwise always read true. */
function caretInside(view: EditorView, hit: WikiHit): boolean {
  const head = view.state.selection.main.head
  return view.hasFocus && head >= hit.range[0] && head <= hit.range[1]
}

/** The resolved connection page a pointer gesture should act on, or null. The positions beside the
 *  syntax belong to caret placement rather than to the link, measured from the token's range rather
 *  than from what's drawn — a hidden `[[Title|` means an aliased link's visible extent IS its
 *  content, so there'd otherwise be no edge left to click. */
function resolvedPageAt(
  view: EditorView,
  api: ConnectionsApi,
  event: MouseEvent,
  skipWhenEditing = false,
): ConnPage | null {
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const hit = wikiLinkAt(view, pos)
  if (!hit) return null
  if (pos < hit.content[0] || pos > hit.content[1]) return null
  if (skipWhenEditing && caretInside(view, hit)) return null
  const res = api.resolve(hit.title)
  return res.status === 'resolved' && res.page ? res.page : null
}

export function connectionClicks(getApi: GetApi): ReturnType<typeof EditorView.domEventHandlers> {
  // The pending hover intent — armed on mouseover of a resolved connection, cancelled the
  // moment the pointer leaves it (mouseout fires per CM6 text span; re-entry re-arms fresh).
  const intent = hoverIntent()
  // Was the caret in this link BEFORE the press moved it? CM seats the caret on mousedown, so the
  // click handler can no longer tell "I was editing this" from "I just clicked it" on its own.
  let editingOnPress = false
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      const hit = pos == null ? null : wikiLinkAt(view, pos)
      editingOnPress = hit ? caretInside(view, hit) : false
      return false
    },
    mouseover(event, view) {
      const api = getApi()
      if (!api?.hover) return false
      intent.cancel()
      // Cheap class gate FIRST (the every-mouseover hard rule): only a resolved connection's
      // decoration span warrants the layout read + line tokenize below.
      const el = (event.target as HTMLElement).closest?.('.md-connection-resolved')
      if (!el) return false
      // A dwell reads the live caret safely — unlike a click, hovering never moves it.
      const page = resolvedPageAt(view, api, event, true)
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
      if (editingOnPress) return false // already inside it when you pressed — you're editing, not following
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
