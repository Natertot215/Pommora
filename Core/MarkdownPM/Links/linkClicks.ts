import type { Extension } from '@codemirror/state'
import { isCmd } from '@pommora/uix/Interactions/chords'
import type { EditorView } from '@codemirror/view'
import { normalizeLinkUrl, WEB_ADDRESS } from '../../Paths/urlPath'
import type { Token } from '../Engine/tokens'
import { docString } from '../docCache'
import {
  openPage,
  titleTarget,
  tokenMenuTarget,
  tokenTarget,
  type ConnectionsApi,
  type MdTarget,
} from './connectionsApi'
import { drawnLinkAt, MD_LINK_CLASS } from '../decorations'
import { applyLinkAction } from './linkEdit'
import { applyUrlLinkAction } from './linkFormat'
import { pointerHandlers, type PointerTarget } from '../Gestures/pointerPath'
import { travelToHeading } from '../travel'
import { type EditorHost, editorHost, type OwnPage, ownPage, pageEditorAt } from '../api'

type GetApi = () => ConnectionsApi | undefined

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
  const tk = drawnLinkAt(view, pos, api ? undefined : 'link')
  if (!tk) return null
  const target = heldTarget(tokenTarget(api, docString(view.state.doc), tk), ownPage(view))
  const el = (event.target as HTMLElement).closest?.(
    `.md-connection-resolved, .md-connection-ambiguous, .md-heading-symbol, .${MD_LINK_CLASS}, .md-link-invalid`,
  )
  return {
    tk,
    target,
    range: tk.range,
    onText: el != null && pos >= tk.contentRange[0] && pos <= tk.contentRange[1],
    hidesSyntax: target.kind !== 'invalid' || (tk.kind === 'wikiLink' && target.ambiguous === true),
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
      return api ? () => openPage(api, named.page, isCmd(event), named.heading) : null
    case 'external':
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
  if (target.kind !== 'external') return null
  const web = normalizeLinkUrl(target.url)
  return WEB_ADDRESS.test(web) ? () => glance.arm({ kind: 'site', url: web }, el) : null
}

export function linkPointer(getApi: GetApi): Extension {
  return pointerHandlers<LinkHit>({
    // Both gates are required: external links wear the link class, not the connection one.
    hoverGate: `.md-connection-resolved, .${MD_LINK_CLASS}`,
    hitAt: (view, event) => linkUnder(view, getApi(), event),
    follow: (hit, _, event) => (hit.onText ? followTarget(hit.target, getApi(), event) : null),
    dwell: (hit, el, glance) => (hit.onText ? dwellTarget(hit.target, glance, el) : null),
    menu: (hit, view) => {
      const menu = getApi()?.menu
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
