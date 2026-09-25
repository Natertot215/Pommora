import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { titleTarget, resolveMdTarget, type ConnectionsApi } from '../Links/connectionsApi'
import { type MarkerRef, citationFor, markersFor } from '../Engine/detect'
import { lineEndOf } from '../Engine/markdownCode'
import { headingOf, linkTarget, tokenize } from '../Engine/tokens'
import { docScan, docString } from '../docCache'
import { type FollowEvent, followTarget } from '../Links/linkClicks'
import { applyCitationAction, travelToCitation } from './citationActions'
import { travelTo } from '../travel'
import { pointerHandlers, type PointerTarget } from '../Gestures/pointerPath'
import { editorHost } from '../api'

export const CITE_GLYPH = '.md-citation-reference'

/** Drawn over hidden source rather than written, so it is the one element a press on the row can be aimed at. */
const CITE_ROW_GLYPH = '.md-citation-number'

export function loneTarget(
  content: string,
): { kind: 'link'; url: string } | { kind: 'connection'; title: string; heading?: string } | null {
  const text = content.trim()
  if (text === '') return null
  const tk = tokenize(text).find((t) => t.range[0] === 0 && t.range[1] === text.length)
  if (!tk) return null
  if (tk.kind === 'wikiLink') {
    const [s, e] = tk.resolveRange ?? tk.contentRange
    return { kind: 'connection', title: text.slice(s, e), heading: headingOf(text, tk) }
  }
  if (tk.kind !== 'link') return null
  const url = linkTarget(text, tk)
  return url ? { kind: 'link', url } : null
}

interface CiteHit extends PointerTarget {
  marker: MarkerRef
}

/** A marker whose footnote is one link follows it, in the body or a resting cell; any other travels to its footnote. */
export function followCitation(
  view: EditorView,
  label: string,
  api: ConnectionsApi | undefined,
  event: FollowEvent,
): void {
  const scan = docScan(view.state.doc)
  const entry = citationFor(scan.citations, label)
  const lone =
    entry &&
    loneTarget(docString(view.state.doc).slice(entry.contentStart, lineEndOf(scan, entry.lastLine)))
  const target =
    lone &&
    (lone.kind === 'link'
      ? resolveMdTarget(api, lone.url)
      : titleTarget(api, lone.title, lone.heading))
  const go = target && followTarget(target, api, event)
  if (go) go()
  else travelToCitation(view, label)
}

/** A marker's offsets are the two seats either side of it, so an offset test alone would claim a press aimed at the space beside it. */
function citeHitAt(view: EditorView, event: MouseEvent): CiteHit | null {
  if (!(event.target as HTMLElement).closest?.(CITE_GLYPH)) return null
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const { citations } = docScan(view.state.doc)
  const marker = citations.markers.find(
    (m) => m.ordinal !== null && pos >= m.from && pos <= m.to && citationFor(citations, m.label),
  )
  if (!marker) return null
  return { range: [marker.from, marker.to], onText: true, hidesSyntax: true, pos, marker }
}

export function citationPointer(getApi: () => ConnectionsApi | undefined): Extension {
  return pointerHandlers<CiteHit>({
    hoverGate: CITE_GLYPH,
    hitAt: citeHitAt,
    follow: (hit, view, event) => () => followCitation(view, hit.marker.label, getApi(), event),
    dwell: () => null,
    menu: (hit, view) => () =>
      void view.state
        .facet(editorHost)
        .menus.citation({ subject: 'marker', editable: !view.state.readOnly })
        .then((action) => {
          if (action) applyCitationAction(view, action, { kind: 'marker', marker: hit.marker })
        }),
  })
}

interface RowHit extends PointerTarget {
  label: string
}

/** The row's prefix is hidden and atomic, so a coordinate read lands at the line's start either way; the line names the citation. */
function rowHitAt(view: EditorView, event: MouseEvent): RowHit | null {
  const glyph = (event.target as HTMLElement).closest?.(CITE_ROW_GLYPH)
  const line = glyph?.closest('.cm-line')
  if (!line) return null
  const from = view.posAtDOM(line)
  const entry = docScan(view.state.doc).citations.entryAt.get(
    view.state.doc.lineAt(from).number - 1,
  )
  if (!entry) return null
  return { range: [from, from], onText: true, hidesSyntax: true, pos: from, label: entry.label }
}

/** Inverted from the marker's: a citation's glyph leads back to the first marker bound to it. The whole-line right-press stays `citationRowMenu`'s. */
export function citationRowPointer(): Extension {
  return pointerHandlers<RowHit>({
    hoverGate: CITE_ROW_GLYPH,
    hitAt: rowHitAt,
    follow: (hit, view) => () => {
      const marker = markersFor(docScan(view.state.doc).citations, hit.label)[0]
      if (marker) travelTo(view, marker.from)
      else applyCitationAction(view, 'cite:copy', { kind: 'citation', label: hit.label })
    },
    dwell: () => null,
    menu: () => null,
  })
}

export function citationRowMenu(): Extension {
  return EditorView.domEventHandlers({
    contextmenu(event, view) {
      if (view.state.readOnly) return false
      const line = (event.target as HTMLElement).closest?.(
        '.cm-line.md-citation, .cm-line.md-citation-continued',
      )
      if (!line) return false
      const scan = docScan(view.state.doc)
      const entry = scan.citations.entryAt.get(
        view.state.doc.lineAt(view.posAtDOM(line)).number - 1,
      )
      if (!entry) return false
      event.preventDefault()
      void view.state
        .facet(editorHost)
        .menus.citation({ subject: 'citation', editable: true })
        .then((action) => {
          if (action) applyCitationAction(view, action, { kind: 'citation', label: entry.label })
        })
      return true
    },
  })
}
