import type { Extension } from '@codemirror/state'
import { isCmd } from '@pommora/uix/Interactions/chords'
import type { EditorView } from '@codemirror/view'
import { aliasedToken, linkTokenAt } from '../Engine/tokens'
import type { ConnectionsApi } from './connectionsApi'
import type { ConnPage } from '@pommora/core/Connections/pageIndex'
import { followTarget } from './linkClicks'
import { applyLinkAction } from './linkEdit'
import { pointerHandlers, type PointerTarget } from '../Gestures/pointerPath'
import { editorHost } from '../api'

type GetApi = () => ConnectionsApi | undefined

interface WikiHit {
  title: string
  heading: string | null
  self: boolean
  range: [number, number]
  content: [number, number]
  aliased: boolean
}

function wikiLinkAt(view: EditorView, pos: number): WikiHit | null {
  const line = view.state.doc.lineAt(pos)
  const rel = pos - line.from
  const tk = linkTokenAt(line.text, rel, 'wikiLink')
  if (!tk) return null
  const [rs, re] = tk.resolveRange ?? tk.contentRange
  const abs = ([s, e]: [number, number]): [number, number] => [line.from + s, line.from + e]
  return {
    title: line.text.slice(rs, re),
    heading: tk.fragment ? line.text.slice(tk.fragment[0], tk.fragment[1]) : null,
    self: rs === re,
    range: abs(tk.range),
    content: abs(tk.contentRange),
    aliased: aliasedToken(tk),
  }
}

interface ConnHit extends PointerTarget {
  hit: WikiHit
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
  // A bare fragment names the page's own heading and never carries a page — it reads as resolved regardless of the map.
  const res = hit.self ? { status: 'resolved' as const, page: null } : api.resolve(hit.title)
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
    follow: ({ hit, page, onText }, view, event) =>
      hit.self && onText
        ? followTarget(
            { kind: 'self', heading: hit.heading ?? '' },
            '',
            getApi(),
            isCmd(event),
            event.target as Element,
            view.state.facet(editorHost),
            view,
            hit.range[0],
          )
        : page
          ? followTarget(
              { kind: 'page', page, heading: hit.heading ?? undefined },
              '',
              getApi(),
              isCmd(event),
              event.target as Element,
              view.state.facet(editorHost),
              view,
              hit.range[0],
            )
          : null,
    dwell: ({ hit, page }, el, glance) =>
      page
        ? () =>
            glance.arm(
              { kind: 'page', id: page.id, path: page.path, heading: hit.heading ?? undefined },
              el,
            )
        : null,
    menu: ({ hit, page }, view) => {
      const menu = getApi()?.menu
      if (!page || !menu) return null
      return () =>
        menu({
          kind: 'page',
          page,
          heading: hit.heading ?? undefined,
          // Editability is read here rather than threaded through the host: `readOnly` is live inside the editor and flips at runtime through a Compartment, so a captured value would go stale.
          editable: !view.state.readOnly,
          hasAlias: hit.aliased,
          apply: (action) => applyLinkAction(view, action, hit.range),
        })
    },
  })
}
