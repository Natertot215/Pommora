import type { Extension } from '@codemirror/state'
import { isCmd } from '@pommora/uix/Interactions/chords'
import type { EditorView } from '@codemirror/view'
import { aliasedToken, headingOf, linkTokenAt } from '../Engine/tokens'
import type { ConnectionsApi, MdTarget } from './connectionsApi'
import type { ConnPage, ConnResolution } from '@pommora/core/Connections/pageIndex'
import { followTarget } from './linkClicks'
import { applyLinkAction } from './linkEdit'
import { pointerHandlers, type PointerTarget } from '../Gestures/pointerPath'
import { editorHost } from '../api'

type GetApi = () => ConnectionsApi | undefined

interface WikiHit {
  title: string
  heading?: string
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
    heading: headingOf(line.text, tk),
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

// A bare `§Heading` run in prose: no page, no menu, no glance — the run's own text is the target.
function sectionRunAt(view: EditorView, event: MouseEvent): WikiHit | null {
  const span = (event.target as HTMLElement).closest?.('.md-section-run')
  if (!span) return null
  const text = span.textContent ?? ''
  const from = view.posAtDOM(span)
  return {
    title: '',
    heading: text.slice(1),
    self: true,
    range: [from, from + text.length],
    content: [from, from + text.length],
    aliased: false,
  }
}

function connHitAt(
  api: ConnectionsApi | undefined,
  view: EditorView,
  event: MouseEvent,
): ConnHit | null {
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const hit = api && wikiLinkAt(view, pos)
  if (api && hit) {
    // A bare fragment names the page's own heading and never carries a page — it reads as resolved regardless of the map.
    const res: ConnResolution = hit.self
      ? { status: hit.heading ? 'resolved' : 'phantom' }
      : api.resolve(hit.title)
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
  const run = sectionRunAt(view, event)
  if (!run) return null
  return { hit: run, page: null, range: run.range, onText: true, hidesSyntax: true, pos }
}

export function connectionClicks(getApi: GetApi): Extension {
  return pointerHandlers<ConnHit>({
    hoverGate: '.md-connection-resolved',
    hitAt: (view, event) => connHitAt(getApi(), view, event),
    follow: ({ hit, page, onText }, view, event) => {
      const target: MdTarget | null =
        hit.self && onText
          ? { kind: 'self', heading: hit.heading ?? '' }
          : page
            ? { kind: 'page', page, heading: hit.heading }
            : null
      return (
        target &&
        followTarget(
          target,
          '',
          getApi(),
          isCmd(event),
          event.target as Element,
          view.state.facet(editorHost),
          view,
          hit.range[0],
        )
      )
    },
    dwell: ({ hit, page }, el, glance) =>
      page
        ? () => glance.arm({ kind: 'page', id: page.id, path: page.path, heading: hit.heading }, el)
        : null,
    menu: ({ hit, page }, view) => {
      const menu = getApi()?.menu
      if (!page || !menu) return null
      return () =>
        menu({
          kind: 'page',
          page,
          heading: hit.heading,
          // Editability is read here rather than threaded through the host: `readOnly` is live inside the editor and flips at runtime through a Compartment, so a captured value would go stale.
          editable: !view.state.readOnly,
          hasAlias: hit.aliased,
          apply: (action) => applyLinkAction(view, action, hit.range),
        })
    },
  })
}
