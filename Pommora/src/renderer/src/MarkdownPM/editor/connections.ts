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
  /** Whether it wears an alias. An opened-but-empty one doesn't count — there's nothing to rename. */
  aliased: boolean
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
  return {
    title: line.text.slice(rs, re),
    range: abs(tk.range),
    content: abs(tk.contentRange),
    aliased: tk.resolveRange !== undefined,
  }
}

/** Whether the caret currently sits inside the token — a link being edited. Read at mousedown for a
 *  click, since CM seats the caret before `click` fires and it would otherwise always read true. */
function caretInside(view: EditorView, hit: WikiHit): boolean {
  const head = view.state.selection.main.head
  return view.hasFocus && head >= hit.range[0] && head <= hit.range[1]
}

/** The wikiLink under a pointer gesture, and the page it leads to. `page` is null when the link
 *  doesn't resolve, and when the position belongs to the syntax beside the link rather than to the
 *  link itself: those positions are caret placement. They're measured from the token's range rather
 *  than from what's drawn — a hidden `[[Title|` means an aliased link's visible extent IS its
 *  content, so there'd otherwise be no edge left to click. */
function pointerLink(
  view: EditorView,
  api: ConnectionsApi,
  event: MouseEvent,
): { hit: WikiHit; page: ConnPage | null } | null {
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const hit = wikiLinkAt(view, pos)
  if (!hit) return null
  if (pos < hit.content[0] || pos > hit.content[1]) return { hit, page: null }
  const res = api.resolve(hit.title)
  return { hit, page: res.status === 'resolved' && res.page ? res.page : null }
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
  let actedOnLink = false
  return EditorView.domEventHandlers({
    // No press on a connection seats a caret in it. `true` is what stops that — CM seats the caret
    // in its own mousedown handling rather than through the browser default, so preventDefault
    // alone would leave it happening.
    mousedown(event, view) {
      const api = getApi()
      const found = api ? pointerLink(view, api, event) : null
      editingOnPress = found ? caretInside(view, found.hit) : false
      if (!found?.page) return false
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
      if (!el || actedOnLink) return false
      const found = pointerLink(view, api, event)
      // A dwell reads the live caret safely — unlike a click, hovering never moves it. A link the
      // caret is already inside is open for editing, and no dwell should carry you away from what
      // you're typing.
      if (!found?.page || caretInside(view, found.hit)) return false
      const page = found.page
      intent.arm(() => api.hover?.(page, el))
      return false
    },
    mouseout() {
      intent.cancel()
      actedOnLink = false
      return false
    },
    // Navigate on a plain single-click. Handled on `click`, not `mousedown`, and skipped when the
    // selection is non-empty — so dragging across a connection highlights it instead of navigating away.
    click(event, view) {
      // A click consumes the link — an intent armed during the dwell must not bloom over
      // whatever the click opened.
      intent.cancel()
      actedOnLink = true
      if (event.button !== 0 || event.detail !== 1 || !view.state.selection.main.empty) return false
      if (editingOnPress) return false // already inside it when you pressed — you're editing, not following
      const api = getApi()
      if (!api) return false
      const found = pointerLink(view, api, event)
      if (!found?.page) return false
      event.preventDefault()
      // The one modifier branch: ⌘ takes the host's other route when it offers one.
      if (event.metaKey && api.bypass) api.bypass(found.page)
      else api.open(found.page)
      return true
    },
    // Right-click on a resolved connection hands off to the host's menu hook (Open Preview et al).
    contextmenu(event, view) {
      intent.cancel()
      actedOnLink = true
      const api = getApi()
      if (!api?.menu) return false
      const found = pointerLink(view, api, event)
      if (!found?.page) return false
      event.preventDefault()
      // Editability is read HERE rather than threaded through the host: `readOnly` is live inside
      // the editor and PreviewWindow flips it at runtime through a Compartment, so a value captured
      // in a memoized seam goes stale.
      api.menu(found.page, {
        editable: !view.state.readOnly,
        hasAlias: found.hit.aliased,
        apply: (action) => applyLinkAction(view, action, found.hit.range),
      })
      return true
    },
  })
}
