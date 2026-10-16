import type { Extension } from '@codemirror/state'
import { isCmd } from '@pommora/uix/Interactions/chords'
import type { EditorView } from '@codemirror/view'
import { isHttpLink, normalizeLinkUrl } from '../../Paths/urlPath'
import type { LinkKind, Token } from '../Engine/tokens'
import { docString } from '../docCache'
import type { ConnectionsApi } from './connectionsApi'
import { linkMenuTarget } from '../../Actions/connectionMenu'
import {
  bareHeading,
  readOccurrence,
  type ResolvedLink,
  resolveLink,
} from '../../Connections/linkValue'
import { drawnLinkAt } from '../decorations'
import { applyLinkAction } from './linkEdit'
import { pointerHandlers, type PointerTarget } from '../Gestures/pointerPath'
import { travelToHeading } from '../travel'
import { type EditorHost, editorHost, heldOf, type OwnPage, ownPage, pageEditorAt } from '../api'

interface LinkHit extends PointerTarget {
  target: ResolvedLink
  /** Absent on a bare `§Heading` run, which no token holds. */
  tk?: Token
}

// A bare `§Heading` run: the run's own text is the heading, on the page holding a value and in this body otherwise.
function sectionRunAt(view: EditorView, event: MouseEvent, pos: number): LinkHit | null {
  const span = (event.target as HTMLElement).closest?.('.md-section-run')
  if (!span) return null
  const text = span.textContent ?? ''
  const from = view.posAtDOM(span)
  return {
    target: bareHeading(text.slice(1), heldOf(ownPage(view))),
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
  const target = resolveLink(
    readOccurrence(docString(view.state.doc), tk.link),
    api?.index,
    heldOf(ownPage(view)),
  )
  const el = (event.target as HTMLElement).closest?.(
    '.md-connection-resolved, .md-connection-ambiguous, .md-heading-symbol, .md-link',
  )
  return {
    tk,
    target,
    range: tk.range,
    onText: el != null && pos >= tk.contentRange[0] && pos <= tk.contentRange[1],
    hidesSyntax: target.kind !== 'unresolved' || target.status !== 'phantom',
    pos,
  }
}

export type FollowEvent = Pick<MouseEvent, 'target' | 'metaKey' | 'ctrlKey'>

/** The one answer the body, a footnote marker, and a table cell resting or live all read. Null inside a glance: the pane is a glance surface by contract, so nothing follows there. */
export function followTarget(
  target: ResolvedLink,
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

/** What a follow does once the surface it starts on is known: `own` is the body a bare `#Heading` travels in. */
export function resolveFollow(
  target: ResolvedLink,
  own: OwnPage | null,
  api: ConnectionsApi | undefined,
  event: Pick<MouseEvent, 'metaKey' | 'ctrlKey'>,
  openLink: (url: string) => void,
): (() => void) | null {
  switch (target.kind) {
    case 'self':
      return own?.kind === 'body'
        ? () => travelToHeading(own.view, target.heading, own.view.posAtDOM(own.seat))
        : null
    case 'page':
      return api ? () => api.open(target.page, target.heading, isCmd(event)) : null
    case 'url':
      return () => openLink(target.url)
    case 'unresolved':
      return null
  }
}

/** The attach gate refuses anything but http(s), so a mailto: arms nothing rather than a blank pane. */
export function dwellTarget(
  target: ResolvedLink,
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
    // Both gates are required: weblinks wear the link class, not the connection one.
    hoverGate: '.md-connection-resolved, .md-link',
    hitAt: (view, event) => linkUnder(view, apiOf(view), event),
    follow: (hit, view, event) =>
      hit.onText ? followTarget(hit.target, apiOf(view), event) : null,
    dwell: (hit, el, glance) => (hit.onText ? dwellTarget(hit.target, glance, el) : null),
    menu: (hit, view) => {
      const menu = apiOf(view)?.menu
      // A run has no link text to rename or remove, so its menu offers what the target alone supports.
      const target = hit.onText && linkMenuTarget(hit.target, !!hit.tk && !view.state.readOnly)
      return menu && target
        ? () =>
            void menu(target).then((action) => action && applyLinkAction(view, action, hit.range))
        : null
    },
  })
}
