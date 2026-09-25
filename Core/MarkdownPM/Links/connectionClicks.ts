import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { aliasedToken, headingOf, linkTokenAt } from '../Engine/tokens'
import { titleTarget, type ConnectionsApi, type MdTarget } from './connectionsApi'
import { dwellTarget, followTarget } from './linkClicks'
import { applyLinkAction } from './linkEdit'
import { pointerHandlers, type PointerTarget } from '../Gestures/pointerPath'

type GetApi = () => ConnectionsApi | undefined

interface WikiHit {
  title: string
  heading?: string
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
    range: abs(tk.range),
    content: abs(tk.contentRange),
    aliased: aliasedToken(tk),
  }
}

interface ConnHit extends PointerTarget {
  hit: WikiHit
  target: MdTarget
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
    const target = titleTarget(api, hit.title, hit.heading)
    const el = (event.target as HTMLElement).closest?.(
      '.md-connection-resolved, .md-connection-ambiguous, .md-heading-symbol',
    )
    return {
      hit,
      target,
      range: hit.range,
      onText: el != null && pos >= hit.content[0] && pos <= hit.content[1],
      // An ambiguous title leads nowhere yet still draws as a link.
      hidesSyntax: target.kind !== 'invalid' || api.resolve(hit.title).status === 'ambiguous',
      pos,
    }
  }
  const run = sectionRunAt(view, event)
  if (!run) return null
  const target = titleTarget(api, '', run.heading)
  return { hit: run, target, range: run.range, onText: true, hidesSyntax: true, pos }
}

export function connectionClicks(getApi: GetApi): Extension {
  return pointerHandlers<ConnHit>({
    hoverGate: '.md-connection-resolved',
    hitAt: (view, event) => connHitAt(getApi(), view, event),
    follow: ({ target, onText }, _, event) =>
      onText ? followTarget(target, getApi(), event) : null,
    dwell: ({ target, onText }, el, glance) => (onText ? dwellTarget(target, glance, el) : null),
    menu: ({ hit, target, onText }, view) => {
      const menu = getApi()?.menu
      if (!onText || target.kind !== 'page' || !menu) return null
      return () =>
        menu({
          kind: 'page',
          page: target.page,
          heading: target.heading,
          // Editability is read here rather than threaded through the host: `readOnly` is live inside the editor and flips at runtime through a Compartment, so a captured value would go stale.
          editable: !view.state.readOnly,
          hasAlias: hit.aliased,
          apply: (action) => applyLinkAction(view, action, hit.range),
        })
    },
  })
}
