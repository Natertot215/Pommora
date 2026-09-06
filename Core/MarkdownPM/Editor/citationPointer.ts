// A marker's pointer gestures. The factory owns the hover intent, the press latch, the right-button
// claim and the caret-seat clamp; a marker is a third spec over it rather than a third copy of any
// of that. The jump itself is `travelTo`; this only supplies a target.
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

/** The hover gate, the click's hit-test and the resting table cell's own handler all ask for the
 *  same element. */
export const CITE_GLYPH = '.md-cite-ref'

/** Drawn over hidden source rather than written, so it is the one element a press on the row can be
 *  aimed at. */
export const CITE_ROW_GLYPH = '.md-cite-num'

/** What a citation's whole content is, when that content is exactly one link or one Connection —
 *  trailing text or a stray period means it is not that, and the click jumps to the citation like
 *  any other. Exported pure for tests. */
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

/** What it binds to is read back by label on arrival, so nothing here has to hold a citation the
 *  document may have moved since. */
interface CiteSpot {
  from: number
  to: number
  marker: MarkerRef
  lone: ReturnType<typeof loneTarget>
}

interface CiteHit extends CiteSpot, PointerTarget {}

/** Derived once per document version, since a pointer path that re-derived it would tokenize a
 *  citation on every mousemove over a marker. An unmatched marker is literal prose and never
 *  appears here. */
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

/** Only where the pointer is on the glyph — a marker's offsets are the two seats either side of it,
 *  so an offset test alone would claim a press aimed at the space beside it, where a caret goes to
 *  delete the thing. */
function citeHitAt(view: EditorView, event: MouseEvent): CiteHit | null {
  if (!(event.target as HTMLElement).closest?.(CITE_GLYPH)) return null
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const targets = citationTargets(view.state.doc)
  const hit = targets.find((t) => pos >= t.from && pos <= t.to)
  if (!hit) return null
  return { range: [hit.from, hit.to], onText: true, hidesSyntax: true, pos, ...hit }
}

/** Opening a hidden section on arrival is the host's `reveal`, read off the same facet a creation
 *  reads, so a jump and an insert can never disagree about what showing the section means. */
export function citationPointer(getApi: () => ConnectionsApi | undefined): Extension {
  return pointerHandlers<CiteHit>({
    hoverGate: CITE_GLYPH,
    // A glance over a marker is a Prospect, so nothing here ever arms a dwell.
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
      void window.nexus
        ?.citationMenu?.({ subject: 'marker', editable: !view.state.readOnly })
        .then((action) => {
          if (action) applyCitationAction(view, action, { kind: 'marker', marker: hit.marker })
        }),
  })
}

/** Read back on arrival like a marker's, so nothing here holds a position the document may have
 *  moved since. */
interface RowHit extends PointerTarget {
  label: string
}

/** The row's prefix is hidden and atomic, so a coordinate read would land at the line's start
 *  whether the press hit the glyph or the text beside it; the line it sits on names the citation. */
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

/** Inverted from the marker's: a body glyph leads to its citation, so a citation's glyph leads back
 *  to the first marker bound to it. A row bound to nothing offers the reference itself to copy
 *  instead. The whole-line right-press stays `citationRowMenu`'s, so this arms no menu of its own. */
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

/** A whole line rather than an inline token, so it takes a plain handler instead of the inline
 *  pointer path — the same division the grip menu keeps. */
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
      void window.nexus?.citationMenu?.({ subject: 'citation', editable: true }).then((action) => {
        if (action) applyCitationAction(view, action, { kind: 'citation', label: entry.label })
      })
      return true
    },
  })
}
