import { EditorView } from '@codemirror/view'
import { tokenize } from '../tokens'
import type { ConnectionsApi, ConnPage } from '../connections'
import { applyLinkAction } from './linkEdit'

type GetApi = () => ConnectionsApi | undefined

/** KNOB — the dwell before a connection's preview blooms. Exported so tests wait on the real value
 *  rather than restating it: a test that hard-codes the number goes red the moment it's tuned. */
export const CONN_HOVER_INTENT_MS = 1000

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
function connectionAt(
  view: EditorView,
  api: ConnectionsApi,
  event: MouseEvent,
): { page: ConnPage; hit: WikiHit } | null {
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const hit = wikiLinkAt(view, pos)
  if (!hit) return null
  if (pos < hit.content[0] || pos > hit.content[1]) return null
  const res = api.resolve(hit.title)
  return res.status === 'resolved' && res.page ? { page: res.page, hit } : null
}

function resolvedPageAt(
  view: EditorView,
  api: ConnectionsApi,
  event: MouseEvent,
  skipWhenEditing = false,
): ConnPage | null {
  const found = connectionAt(view, api, event)
  if (!found) return null
  if (skipWhenEditing && caretInside(view, found.hit)) return null
  return found.page
}

export function connectionClicks(getApi: GetApi): ReturnType<typeof EditorView.domEventHandlers> {
  // The pending hover intent — armed on mouseover of a resolved connection, cancelled the
  // moment the pointer leaves it (mouseout fires per CM6 text span; re-entry re-arms fresh).
  const intent = hoverIntent()
  // Was the caret in this link BEFORE the press moved it? CM seats the caret on mousedown, so the
  // click handler can no longer tell "I was editing this" from "I just clicked it" on its own.
  let editingOnPress = false
  // A link that has just been acted on stops arming until the pointer leaves it. Cancelling once
  // isn't enough: a native menu takes the pointer away and hands it back over the same link, and
  // that re-entry is a fresh mouseover that would bloom a preview behind the menu you just used.
  let handled = false
  return EditorView.domEventHandlers({
    // No press on a connection seats a caret in it. `true` is what stops that — CM seats the caret
    // in its own mousedown handling rather than through the browser default, so preventDefault
    // alone would leave it happening.
    mousedown(event, view) {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      const hit = pos == null ? null : wikiLinkAt(view, pos)
      editingOnPress = hit ? caretInside(view, hit) : false
      const api = getApi()
      if (!api || !connectionAt(view, api, event)) return false
      // A right press hands the caret to whichever menu action is chosen, and Rename and Edit Link
      // exist to place it themselves — seating one here would land it somewhere first and make both
      // of them meaningless. No preventDefault: the contextmenu event still has to fire.
      if (event.button === 2) return true
      // A left press is about to follow the link, and the seat would flash its syntax on the way
      // out. Pressing a link you're already editing still seats normally.
      if (event.button !== 0 || editingOnPress) return false
      event.preventDefault()
      return true
    },
    mouseover(event, view) {
      const api = getApi()
      if (!api?.hover) return false
      intent.cancel()
      // Cheap class gate FIRST (the every-mouseover hard rule): only a resolved connection's
      // decoration span warrants the layout read + line tokenize below.
      const el = (event.target as HTMLElement).closest?.('.md-connection-resolved')
      if (!el || handled) return false
      // A dwell reads the live caret safely — unlike a click, hovering never moves it.
      const page = resolvedPageAt(view, api, event, true)
      if (!page) return false
      intent.arm(() => api.hover?.(page, el))
      return false
    },
    mouseout() {
      intent.cancel()
      handled = false
      return false
    },
    // Navigate on a plain single-click. Handled on `click`, not `mousedown`, and skipped when the
    // selection is non-empty — so dragging across a connection highlights it instead of navigating away.
    click(event, view) {
      // A click consumes the link — an intent armed during the dwell must not bloom over
      // whatever the click opened.
      intent.cancel()
      handled = true
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
      handled = true
      const api = getApi()
      if (!api?.menu) return false
      const found = connectionAt(view, api, event)
      if (!found) return false
      event.preventDefault()
      // Editability is read HERE rather than threaded through the host: `readOnly` is live inside
      // the editor and PreviewWindow flips it at runtime through a Compartment, so a value captured
      // in a memoized seam goes stale.
      api.menu(found.page, {
        range: found.hit.range,
        editable: !view.state.readOnly,
        apply: (action, range) => applyLinkAction(view, action, range),
      })
      return true
    },
  })
}
