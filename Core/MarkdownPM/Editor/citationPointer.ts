// A marker's pointer gestures — a third spec over the shared factory rather than a third copy of the hover
// intent, press latch and caret clamp. The jump itself is `travelTo`; this only supplies a target.
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { resolveMdTarget, type ConnectionsApi } from '../Connections'
import { type MarkerRef, citationFor, lineEndOf, markersFor } from '../Detect'
import { linkTarget, tokenize } from '../Tokens'
import { docScan, docString, perDoc } from './docCache'
import { followTarget } from './links'
import { applyCitationAction, travelToCitation } from './citationActions'
import { travelTo } from './travel'
import { pointerHandlers, type PointerTarget } from './pointerPath'
import { host } from '../../Platform/dialer'

export const CITE_GLYPH = '.md-cite-ref'

/** Drawn over hidden source rather than written, so it is the one element a press on the row can be aimed at. */
export const CITE_ROW_GLYPH = '.md-cite-num'

/** Trailing text or a stray period means it is not that, and the click jumps to the citation like any other. */
export function loneTarget(
  content: string,
): { kind: 'link'; url: string } | { kind: 'connection'; title: string } | null {
  const text = content.trim()
  if (text === '') return null
  const tk = tokenize(text).find((t) => t.range[0] === 0 && t.range[1] === text.length)
  if (!tk) return null
  if (tk.kind === 'wikiLink') {
    const [s, e] = tk.resolveRange ?? tk.contentRange
    return { kind: 'connection', title: text.slice(s, e) }
  }
  if (tk.kind !== 'link') return null
  const url = linkTarget(text, tk)
  return url ? { kind: 'link', url } : null
}

interface CiteSpot {
  from: number
  to: number
  marker: MarkerRef
  lone: ReturnType<typeof loneTarget>
}

interface CiteHit extends CiteSpot, PointerTarget {}

/** Derived once per document version — a pointer path that re-derived it would tokenize a citation on every mousemove. */
const citationTargets = perDoc((doc) => {
  const scan = docScan(doc)
  const text = docString(doc)
  const out: CiteSpot[] = []
  for (const m of scan.citations.markers) {
    if (m.ordinal === null) continue
    const entry = citationFor(scan.citations, m.label)
    if (!entry) continue
    const end = lineEndOf(scan, entry.lastLine)
    out.push({
      from: m.from,
      to: m.to,
      marker: m,
      lone: loneTarget(text.slice(entry.contentStart, end)),
    })
  }
  return out
})

/** A marker's offsets are the two seats either side of it, so an offset test alone would claim a press aimed at the space beside it. */
function citeHitAt(view: EditorView, event: MouseEvent): CiteHit | null {
  if (!(event.target as HTMLElement).closest?.(CITE_GLYPH)) return null
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const targets = citationTargets(view.state.doc)
  const hit = targets.find((t) => pos >= t.from && pos <= t.to)
  if (!hit) return null
  return { range: [hit.from, hit.to], onText: true, hidesSyntax: true, pos, ...hit }
}

export function citationPointer(getApi: () => ConnectionsApi | undefined): Extension {
  return pointerHandlers<CiteHit>({
    hoverGate: CITE_GLYPH,
    armable: () => false,
    hitAt: citeHitAt,
    follow: (hit, view, event) => () => {
      const api = getApi()
      const el = event.target as Element
      if (hit.lone?.kind === 'connection' && api) {
        const res = api.resolve(hit.lone.title)
        const go =
          res.status === 'resolved' && res.page
            ? followTarget({ kind: 'page', page: res.page }, '', api, event.metaKey, el)
            : null
        if (go) return go()
      }
      if (hit.lone?.kind === 'link') {
        const go = followTarget(
          resolveMdTarget(api, hit.lone.url),
          hit.lone.url,
          api,
          event.metaKey,
          el,
        )
        if (go) return go()
      }
      travelToCitation(view, hit.marker.label)
    },
    dwell: () => null,
    menu: (hit, view) => () =>
      void host()
        .ask('citation-menu', { subject: 'marker', editable: !view.state.readOnly })
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
    armable: () => false,
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
        '.cm-line.md-cite, .cm-line.md-cite-cont',
      )
      if (!line) return false
      const scan = docScan(view.state.doc)
      const entry = scan.citations.entryAt.get(
        view.state.doc.lineAt(view.posAtDOM(line)).number - 1,
      )
      if (!entry) return false
      event.preventDefault()
      void host()
        .ask('citation-menu', { subject: 'citation', editable: true })
        .then((action) => {
          if (action) applyCitationAction(view, action, { kind: 'citation', label: entry.label })
        })
      return true
    },
  })
}
