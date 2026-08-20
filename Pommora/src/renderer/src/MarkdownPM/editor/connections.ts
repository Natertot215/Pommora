import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { tokenize } from '../tokens'
import type { ConnectionsApi, ConnPage } from '../connections'
import { applyLinkAction } from './linkEdit'
import { pointerHandlers, type PointerTarget } from './pointerPath'

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

interface WikiHit {
  title: string
  /** The whole token, markers included. */
  range: [number, number]
  /** What the token displays — the alias when it has one. */
  content: [number, number]
  /** Whether it wears an alias. An opened-but-empty one doesn't count — there's nothing to rename. */
  aliased: boolean
}

/** The wikiLink token at `pos`, resolved or not, in absolute document offsets. */
function wikiLinkAt(view: EditorView, pos: number): WikiHit | null {
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
export function caretInside(view: EditorView, range: [number, number]): boolean {
  const head = view.state.selection.main.head
  return view.hasFocus && head >= range[0] && head <= range[1]
}

/** The wikiLink under a pointer gesture, where the gesture landed on it, and the page it leads to.
 *
 *  Offsets alone can't answer where the pointer was: `posAtCoords` clamps to the nearest RENDERED
 *  position, and a hidden marker is replaced to zero width — so a click in the empty space past a
 *  short alias resolves back onto its last character. The drawn text is asked for directly instead.
 *  A resolved link and an ambiguous one each carry a class; a phantom carries none, because it is
 *  drawn as its own raw bracketed text with nothing hidden and nothing to clamp against. */
interface ConnHit extends PointerTarget {
  hit: WikiHit
  /** The page to follow — only ever set for a gesture that touched a resolved link's text. */
  page: ConnPage | null
}

function connHitAt(
  api: ConnectionsApi | undefined,
  view: EditorView,
  event: MouseEvent,
): ConnHit | null {
  if (!api) return null
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const hit = wikiLinkAt(view, pos)
  if (!hit) return null
  const res = api.resolve(hit.title)
  const el = (event.target as HTMLElement).closest?.(
    '.md-connection-resolved, .md-connection-ambiguous',
  )
  const onText = el != null && pos >= hit.content[0] && pos <= hit.content[1]
  return {
    hit,
    page: onText && res.status === 'resolved' && res.page ? res.page : null,
    range: hit.range,
    onText,
    hidesSyntax: res.status !== 'phantom',
    pos,
  }
}

export function connectionClicks(getApi: GetApi): Extension {
  return pointerHandlers<ConnHit>({
    hoverGate: '.md-connection-resolved',
    hitAt: (view, event) => connHitAt(getApi(), view, event),
    follow: ({ page }, _view, event) => {
      const api = getApi()
      if (!page || !api) return null
      // The one modifier branch: ⌘ takes the host's other route when it offers one.
      return () => (event.metaKey && api.bypass ? api.bypass(page) : api.open(page))
    },
    dwell: ({ page }, el) => {
      const hover = getApi()?.hover
      return page && hover ? () => hover(page, el) : null
    },
    menu: ({ hit, page }, view) => {
      const menu = getApi()?.menu
      if (!page || !menu) return null
      return () =>
        menu({
          kind: 'page',
          page,
          // Editability is read HERE rather than threaded through the host: `readOnly` is live inside
          // the editor and PreviewWindow flips it at runtime through a Compartment, so a value captured
          // in a memoized seam goes stale.
          editable: !view.state.readOnly,
          hasAlias: hit.aliased,
          apply: (action) => applyLinkAction(view, action, hit.range),
        })
    },
  })
}
