import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { tokenize } from '../Tokens'
import type { ConnectionsApi, ConnPage } from '../Connections'
import { followTarget } from './links'
import { applyLinkAction } from './linkEdit'
import { pointerHandlers, type PointerTarget } from './pointerPath'

type GetApi = () => ConnectionsApi | undefined

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
    armable: () => getApi()?.glance !== undefined,
    hitAt: (view, event) => connHitAt(getApi(), view, event),
    follow: ({ page }, _view, event) =>
      page
        ? followTarget({ kind: 'page', page }, '', getApi(), event.metaKey, event.target as Element)
        : null,
    dwell: ({ page }, el) => {
      const glance = getApi()?.glance
      return page && glance
        ? () => glance({ kind: 'page', id: page.id, path: page.path }, el)
        : null
    },
    menu: ({ hit, page }, view) => {
      const menu = getApi()?.menu
      if (!page || !menu) return null
      return () =>
        menu({
          kind: 'page',
          page,
          // Editability is read here rather than threaded through the host: `readOnly` is live
          // inside the editor and flips at runtime through a Compartment, so a captured value
          // would go stale.
          editable: !view.state.readOnly,
          hasAlias: hit.aliased,
          apply: (action) => applyLinkAction(view, action, hit.range),
        })
    },
  })
}
