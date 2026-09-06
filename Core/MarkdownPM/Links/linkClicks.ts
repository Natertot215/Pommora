import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { hasWebScheme, normalizeLinkUrl } from '@pommora/core/Connections/links'
import { linkTarget, tokenize } from '../Engine/tokens'
import { openPage, resolveMdTarget, type ConnectionsApi, type MdTarget } from './connectionsApi'
import { openWebLink } from '../../Platform/openWebLink'
import { MD_LINK_CLASS } from '../decorations'
import { applyUrlLinkAction } from './linkFormat'
import { pointerHandlers, type PointerTarget } from '../Gestures/pointerPath'
import { type EditorHost, editorHost } from '../api'

type GetApi = () => ConnectionsApi | undefined

interface LinkHit extends PointerTarget {
  url: string
  target: MdTarget
}

// `posAtCoords` clamps to the nearest rendered position and a valid link's markers are replaced to zero width, so a click past a short label resolves onto its last character.
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

/** The one answer the body's click path, the wikilink's, and a resting table cell's all read. Null inside a glance: the pane is a glance surface by contract, so nothing follows there. */
export function followTarget(
  target: MdTarget,
  url: string,
  api: ConnectionsApi | undefined,
  bypass: boolean,
  el: Element,
  glance: EditorHost['glance'],
): (() => void) | null {
  if (target.kind === 'invalid' || glance?.contains(el)) return null
  if (target.kind === 'page') {
    if (!api) return null
    const page = target.page
    return () => openPage(api, page, bypass)
  }
  return () => openWebLink(url)
}

/** The attach gate refuses anything but http(s), so a mailto: arms nothing rather than a blank pane. */
export function dwellTarget(
  target: MdTarget,
  url: string,
  glance: NonNullable<EditorHost['glance']>,
  el: Element,
): (() => void) | null {
  if (target.kind === 'invalid') return null
  if (target.kind === 'page') {
    const { id, path } = target.page
    return () => glance.arm({ kind: 'page', id, path }, el)
  }
  const web = normalizeLinkUrl(url)
  return hasWebScheme(web) ? () => glance.arm({ kind: 'site', url: web }, el) : null
}

// A link naming a page raises the same glance, which the connection handler can't do: its hit-test reads wikiLink tokens and this is a `link`.
export function markdownLinkClicks(getApi: GetApi): Extension {
  return pointerHandlers<LinkHit>({
    // Both gates are required: external links wear the link class, not the connection one.
    hoverGate: `.md-connection-resolved, .${MD_LINK_CLASS}`,
    hitAt: (view, event) => linkUnder(view, getApi, event),
    follow: (hit, view, event) =>
      hit.onText
        ? followTarget(
            hit.target,
            hit.url,
            getApi(),
            event.metaKey,
            event.target as Element,
            view.state.facet(editorHost).glance,
          )
        : null,
    dwell: (hit, el, glance) => (hit.onText ? dwellTarget(hit.target, hit.url, glance, el) : null),
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
                apply: view.state.readOnly
                  ? undefined
                  : (action) => applyUrlLinkAction(view, action, hit.range),
              },
        )
    },
  })
}
