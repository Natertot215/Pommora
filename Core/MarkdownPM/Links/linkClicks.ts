import type { Extension } from '@codemirror/state'
import { isCmd } from '@pommora/uix/Interactions/chords'
import type { EditorView } from '@codemirror/view'
import { normalizeLinkUrl, WEB_ADDRESS } from '../../Paths/urlPath'
import { linkTarget, linkTokenAt } from '../Engine/tokens'
import {
  linkMenuTarget,
  openPage,
  resolveMdTarget,
  type ConnectionsApi,
  type MdTarget,
} from './connectionsApi'
import { drawnRawAt, MD_LINK_CLASS } from '../decorations'
import { applyUrlLinkAction } from './linkFormat'
import { pointerHandlers, type PointerTarget } from '../Gestures/pointerPath'
import { travelToHeading } from '../travel'
import { type EditorHost, editorHost, ownPage, pageEditorAt } from '../api'

type GetApi = () => ConnectionsApi | undefined

interface LinkHit extends PointerTarget {
  target: MdTarget
}

// `posAtCoords` clamps to the nearest rendered position and a valid link's markers are replaced to zero width, so a click past a short label resolves onto its last character.
function linkUnder(view: EditorView, getApi: GetApi, event: MouseEvent): LinkHit | null {
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const line = view.state.doc.lineAt(pos)
  const rel = pos - line.from
  const tk = linkTokenAt(line.text, rel, 'link')
  if (!tk || drawnRawAt(view, line.from + tk.range[0])) return null
  const url = linkTarget(line.text, tk)
  if (!url) return null
  const target = resolveMdTarget(getApi(), url)
  const el = (event.target as HTMLElement).closest?.(
    `.${MD_LINK_CLASS}, .md-link-invalid, .md-connection-resolved`,
  )
  return {
    target,
    range: [line.from + tk.range[0], line.from + tk.range[1]],
    onText: el != null && rel >= tk.contentRange[0] && rel <= tk.contentRange[1],
    hidesSyntax: target.kind !== 'invalid',
    pos,
  }
}

export type FollowEvent = Pick<MouseEvent, 'target' | 'metaKey' | 'ctrlKey'>

/** The one answer the body, a footnote marker, and a table cell resting or live all read. Null inside a glance: the pane is a glance surface by contract, so nothing follows there. */
export function followTarget(
  target: MdTarget,
  api: ConnectionsApi | undefined,
  event: FollowEvent,
): (() => void) | null {
  const el = event.target as Element
  const { view } = pageEditorAt(el)
  if (!view || target.kind === 'invalid') return null
  const host = view.state.facet(editorHost)
  if (host.glance?.contains(el)) return null
  switch (target.kind) {
    case 'self': {
      const own = ownPage(el)
      if (own?.kind === 'held')
        return api ? () => openPage(api, own.page, isCmd(event), target.heading) : null
      return own && (() => travelToHeading(own.view, target.heading, own.view.posAtDOM(own.seat)))
    }
    case 'page':
      return api ? () => openPage(api, target.page, isCmd(event), target.heading) : null
    case 'external':
      return () => host.openLink(target.url)
  }
}

/** The attach gate refuses anything but http(s), so a mailto: arms nothing rather than a blank pane. */
export function dwellTarget(
  target: MdTarget,
  glance: NonNullable<EditorHost['glance']>,
  el: Element,
): (() => void) | null {
  if (target.kind === 'page') {
    const { id, path } = target.page
    return () => glance.arm({ kind: 'page', id, path, heading: target.heading }, el)
  }
  if (target.kind !== 'external') return null
  const web = normalizeLinkUrl(target.url)
  return WEB_ADDRESS.test(web) ? () => glance.arm({ kind: 'site', url: web }, el) : null
}

// A link naming a page raises the same glance, which the connection handler can't do: its hit-test reads wikiLink tokens and this is a `link`.
export function markdownLinkClicks(getApi: GetApi): Extension {
  return pointerHandlers<LinkHit>({
    // Both gates are required: external links wear the link class, not the connection one.
    hoverGate: `.md-connection-resolved, .${MD_LINK_CLASS}`,
    hitAt: (view, event) => linkUnder(view, getApi, event),
    follow: (hit, _, event) => (hit.onText ? followTarget(hit.target, getApi(), event) : null),
    dwell: (hit, el, glance) => (hit.onText ? dwellTarget(hit.target, glance, el) : null),
    menu: (hit, view) => {
      const menu = getApi()?.menu
      const target =
        hit.onText &&
        linkMenuTarget(
          hit.target,
          view.state.readOnly ? undefined : (action) => applyUrlLinkAction(view, action, hit.range),
        )
      return menu && target ? () => menu(target) : null
    },
  })
}
