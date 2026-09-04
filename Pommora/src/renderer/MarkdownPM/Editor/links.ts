import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { hasWebScheme, normalizeLinkUrl } from '@shared/links'
import { linkTarget, tokenize } from '../Tokens'
import { openPage, resolveMdTarget, type ConnectionsApi, type MdTarget } from '../Connections'
import { openWebLink } from '../../Actions/openWebLink'
import { MD_LINK_CLASS } from './decorations'
import { applyUrlLinkAction } from './linkFormat'
import { pointerHandlers, type PointerTarget } from './pointerPath'

type GetApi = () => ConnectionsApi | undefined

interface LinkHit extends PointerTarget {
  url: string
  /** What the target names — a page to navigate to, a URL to hand the system, or neither. */
  target: MdTarget
}

// The external markdown link under a pointer gesture. `posAtCoords` clamps to the nearest rendered
// position, and a valid link's `[` and `](url)` are replaced to zero width, so a click past a short
// label resolves back onto its last character — following that would launch the browser for a link
// never touched. An invalid link draws its whole syntax, so there's nothing beside it to clamp from.
function linkUnder(view: EditorView, getApi: GetApi, event: MouseEvent): LinkHit | null {
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const line = view.state.doc.lineAt(pos)
  const rel = pos - line.from
  const tk = tokenize(line.text).find(
    (t) => t.kind === 'link' && rel >= t.range[0] && rel <= t.range[1],
  )
  if (!tk) return null
  const url = linkTarget(line.text, tk)
  if (!url) return null
  const target = resolveMdTarget(getApi(), url)
  // An internal target is drawn as a connection, so it answers to that class too.
  const el = (event.target as HTMLElement).closest?.(
    `.${MD_LINK_CLASS}, .md-link-invalid, .md-connection-resolved`,
  )
  return {
    url,
    target,
    range: [line.from + tk.range[0], line.from + tk.range[1]],
    onText: el != null && rel >= tk.contentRange[0] && rel <= tk.contentRange[1],
    hidesSyntax: target.kind !== 'invalid',
    pos,
  }
}

/** Where a markdown link's target leads, for a caller with no editor to hit-test against — a
 *  resting table cell reads the same answer the body's own click path does. Null when it names
 *  nothing to follow. */
export function followTarget(
  target: MdTarget,
  url: string,
  api: ConnectionsApi | undefined,
  bypass: boolean,
): (() => void) | null {
  if (target.kind === 'invalid') return null
  if (target.kind === 'page') {
    if (!api) return null
    const page = target.page
    return () => openPage(api, page, bypass)
  }
  return () => openWebLink(url)
}

/** What a dwell over a markdown link arms — a page glance for a target naming a page, a live site
 *  glance for a web address. The attach gate refuses anything but http(s), so a mailto: arms
 *  nothing rather than a blank pane. */
export function dwellTarget(
  target: MdTarget,
  url: string,
  api: ConnectionsApi | undefined,
  el: Element,
): (() => void) | null {
  const glance = api?.glance
  if (!glance || target.kind === 'invalid') return null
  if (target.kind === 'page') {
    const { id, path } = target.page
    return () => glance({ kind: 'page', id, path }, el)
  }
  const web = normalizeLinkUrl(url)
  return hasWebScheme(web) ? () => glance({ kind: 'site', url: web }, el) : null
}

// Follow a markdown link on a plain single-click, on the shared pointer path. A link naming a page
// is drawn as a connection and raises the same glance — the connection handler can't do it, because
// its hit-test reads wikiLink tokens and this is a `link`.
export function markdownLinkClicks(getApi: GetApi): Extension {
  return pointerHandlers<LinkHit>({
    // Both gates are required: external links wear the link class, not the connection one.
    hoverGate: `.md-connection-resolved, .${MD_LINK_CLASS}`,
    armable: () => getApi()?.glance !== undefined,
    hitAt: (view, event) => linkUnder(view, getApi, event),
    follow: (hit, _view, event) =>
      hit.onText ? followTarget(hit.target, hit.url, getApi(), event.metaKey) : null,
    dwell: (hit, el) => (hit.onText ? dwellTarget(hit.target, hit.url, getApi(), el) : null),
    menu: (hit, view) => {
      const menu = getApi()?.menu
      if (!menu || !hit.onText || hit.target.kind === 'invalid') return null
      const target = hit.target
      return () =>
        menu(
          target.kind === 'page'
            ? { kind: 'page', page: target.page, editable: false, hasAlias: false }
            : {
                kind: 'url',
                url: hit.url,
                // The way back into this editor, closed over the span the menu was popped on. Its
                // absence is what a read-only surface offers instead of a refusal.
                apply: view.state.readOnly
                  ? undefined
                  : (action) => applyUrlLinkAction(view, action, hit.range),
              },
        )
    },
  })
}
