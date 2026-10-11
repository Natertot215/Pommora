import type { Extension } from '@codemirror/state'
import { isCmd } from '@pommora/uix/Interactions/chords'
import type { EditorView } from '@codemirror/view'
import { isHttpLink, normalizeLinkUrl } from '../../Paths/urlPath'
import type { LinkKind, Token } from '../Engine/tokens'
import { docString } from '../docCache'
import {
  linkStatus,
  titleTarget,
  tokenMenuTarget,
  tokenTarget,
  type ConnectionsApi,
  type MdTarget,
} from './connectionsApi'
import { drawnLinkAt } from '../decorations'
import { applyLinkAction } from './linkEdit'
import { applyUrlLinkAction } from './linkFormat'
import { pointerHandlers, type PointerTarget } from '../Gestures/pointerPath'
import { travelToHeading } from '../travel'
import { type EditorHost, editorHost, type OwnPage, ownPage, pageEditorAt } from '../api'

interface LinkHit extends PointerTarget {
  target: MdTarget
  /** Absent on a bare `§Heading` run, which no token holds. */
  tk?: Token
}

// A bare `§Heading` run in prose: no page, no menu, no glance — the run's own text is the target.
function sectionRunAt(view: EditorView, event: MouseEvent, pos: number): LinkHit | null {
  const span = (event.target as HTMLElement).closest?.('.md-section-run')
  if (!span) return null
  const text = span.textContent ?? ''
  const from = view.posAtDOM(span)
  return {
    target: titleTarget(undefined, '', text.slice(1)),
    range: [from, from + text.length],
    onText: true,
    hidesSyntax: true,
    pos,
  }
}

// `posAtCoords` clamps to the nearest rendered position and a valid link's markers are replaced to zero width, so a click past a short label resolves onto its last character.
function linkUnder(
  view: EditorView,
  api: ConnectionsApi | undefined,
  event: MouseEvent,
): LinkHit | null {
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const run = sectionRunAt(view, event, pos)
  if (run) return run
  // A connection acts as one only where connections resolve.
  const tk = drawnLinkAt<LinkKind>(view, pos, api ? undefined : 'link')
  if (!tk) return null
  const target = heldTarget(tokenTarget(api, docString(view.state.doc), tk), ownPage(view))
  const el = (event.target as HTMLElement).closest?.(
    '.md-connection-resolved, .md-connection-ambiguous, .md-heading-symbol, .md-link',
  )
  return {
    tk,
    target,
    range: tk.range,
    onText: el != null && pos >= tk.contentRange[0] && pos <= tk.contentRange[1],
    hidesSyntax: linkStatus(target) !== 'phantom',
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
  if (!view) return null
  const host = view.state.facet(editorHost)
  if (host.glance?.contains(el)) return null
  return resolveFollow(target, ownPage(el), api, event, host.openLink)
}

/** A bare `#Heading` held by a value names the page holding the value. */
export const heldTarget = (target: MdTarget, own: OwnPage | null): MdTarget =>
  target.kind === 'self' && own?.kind === 'held'
    ? { kind: 'page', page: own.page, heading: target.heading }
    : target

/** What a follow does once the surface it starts on is known: `own` is the page a bare `#Heading` answers to. */
export function resolveFollow(
  target: MdTarget,
  own: OwnPage | null,
  api: ConnectionsApi | undefined,
  event: Pick<MouseEvent, 'metaKey' | 'ctrlKey'>,
  openLink: (url: string) => void,
): (() => void) | null {
  const named = heldTarget(target, own)
  switch (named.kind) {
    case 'self':
      return own?.kind === 'body'
        ? () => travelToHeading(own.view, named.heading, own.view.posAtDOM(own.seat))
        : null
    case 'page':
      return api ? () => api.open(named.page, named.heading, isCmd(event)) : null
    case 'url':
      return () => openLink(named.url)
    case 'invalid':
      return null
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
  if (target.kind !== 'url' || !isHttpLink(target.url)) return null
  return () => glance.arm({ kind: 'url', url: normalizeLinkUrl(target.url) }, el)
}

const apiOf = (view: EditorView): ConnectionsApi | undefined =>
  view.state.facet(editorHost).connections()

export function linkPointer(): Extension {
  return pointerHandlers<LinkHit>({
    // Both gates are required: external links wear the link class, not the connection one.
    hoverGate: '.md-connection-resolved, .md-link',
    hitAt: (view, event) => linkUnder(view, apiOf(view), event),
    follow: (hit, view, event) =>
      hit.onText ? followTarget(hit.target, apiOf(view), event) : null,
    dwell: (hit, el, glance) => (hit.onText ? dwellTarget(hit.target, glance, el) : null),
    menu: (hit, view) => {
      const menu = apiOf(view)?.menu
      const target =
        hit.onText &&
        tokenMenuTarget(
          hit.tk,
          hit.target,
          view.state.readOnly
            ? undefined
            : {
                wiki: (action) => applyLinkAction(view, action, hit.range),
                url: (action) => applyUrlLinkAction(view, action, hit.range),
              },
        )
      return menu && target ? () => menu(target) : null
    },
  })
}
