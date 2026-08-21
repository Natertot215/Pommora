// A marker's pointer gestures. The factory owns the hover intent, the press latch, the right-button
// claim and the caret-seat clamp; a marker is a third spec over it rather than a third copy of any
// of that. The jump itself is `travelTo` — this supplies a target, never a second traveller.
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { openPage, resolveMdTarget, type ConnectionsApi } from '../connections'
import { type MarkerRef, citationFor, lineEndOf, markersFor } from '../detect'
import { linkTarget, tokenize } from '../tokens'
import { docScan, docString, perDoc } from './docCache'
import { followTarget } from './links'
import { applyCitationAction, travelToCitation } from './citationActions'
import { travelTo } from './travel'
import { pointerHandlers, type PointerTarget } from './pointerPath'

/** The drawn marker. THE selector for it — the hover gate, the click's hit-test and the resting
 *  table cell's own handler all ask for the same element. */
export const CITE_GLYPH = '.md-cite-ref'

/** The citation row's own number. Drawn over hidden source rather than written, so it is the one
 *  element a press on the row can be aimed at. */
export const CITE_ROW_GLYPH = '.md-cite-num'

/** What a citation's whole content is, when that content is exactly ONE link or ONE Connection.
 *  Defined once — trailing text or a stray period means it is not that, and the click jumps to the
 *  citation like any other. Exported pure for tests. */
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

/** One marker a click can lead somewhere from. What it binds to is read back by LABEL on arrival,
 *  so nothing here has to hold a citation the document may have moved since. */
interface CiteSpot {
  from: number
  to: number
  marker: MarkerRef
  lone: ReturnType<typeof loneTarget>
}

interface CiteHit extends CiteSpot, PointerTarget {}

/** Every marker a click can lead somewhere from, with the citation it binds to and the one thing
 *  that citation's whole content is — derived once per document version, because a pointer path that
 *  re-derived it would tokenize a citation on every mousemove over a marker. An unmatched marker is
 *  literal prose and never appears here. */
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

/** The marker under the pointer, and only where the pointer is on the GLYPH. A marker's offsets are
 *  the two seats either side of it, so an offset test claims a press aimed at the space beside it —
 *  which is where a caret goes to delete the thing. The drawn element is the exact question, and
 *  asking it first also keeps the layout read off every mousedown in the editor. */
function citeHitAt(view: EditorView, event: MouseEvent): CiteHit | null {
  if (!(event.target as HTMLElement).closest?.(CITE_GLYPH)) return null
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const targets = citationTargets(view.state.doc)
  const hit = targets.find((t) => pos >= t.from && pos <= t.to)
  if (!hit) return null
  return { range: [hit.from, hit.to], onText: true, hidesSyntax: true, pos, ...hit }
}

/** The marker's gestures. Opening a hidden section on arrival is the host's `reveal` — read off the
 *  facet, the same one a creation reads, so a jump and an insert can never disagree about what
 *  showing the section means. */
export function citationPointer(getApi: () => ConnectionsApi | undefined): Extension {
  return pointerHandlers<CiteHit>({
    hoverGate: CITE_GLYPH,
    // A hover preview over a marker is a Prospect, so nothing here ever arms a dwell.
    armable: () => false,
    hitAt: citeHitAt,
    follow: (hit, view, event) => () => {
      const api = getApi()
      if (hit.lone?.kind === 'connection' && api) {
        const res = api.resolve(hit.lone.title)
        if (res.status === 'resolved' && res.page) return openPage(api, res.page, event.metaKey)
      }
      if (hit.lone?.kind === 'link') {
        const go = followTarget(
          resolveMdTarget(api, hit.lone.url),
          hit.lone.url,
          api,
          event.metaKey,
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

/** One citation row's number, and the label it answers for — read back on arrival like a marker's,
 *  so nothing here holds a position the document may have moved since. */
interface RowHit extends PointerTarget {
  label: string
}

/** The row number under the pointer. The row's prefix is hidden and atomic, so a coordinate read
 *  would land at the line's start whether the press hit the glyph or the text beside it; the drawn
 *  element is the exact question, and the line it sits on names the citation. A dimmed row binds no
 *  marker and leads nowhere, so its glyph is not a target. */
function rowHitAt(view: EditorView, event: MouseEvent): RowHit | null {
  const glyph = (event.target as HTMLElement).closest?.(CITE_ROW_GLYPH)
  const line = glyph?.closest('.cm-line')
  if (!line) return null
  const from = view.posAtDOM(line)
  const entry = docScan(view.state.doc).citations.entryAt.get(
    view.state.doc.lineAt(from).number - 1,
  )
  if (!entry || entry.ordinal === null) return null
  return { range: [from, from], onText: true, hidesSyntax: true, pos: from, label: entry.label }
}

/** The row number's gestures — the marker's, inverted: a body glyph leads to its citation, so a
 *  citation's glyph leads back to the first marker bound to it. The row's whole-line right-press
 *  stays `citationRowMenu`'s, so this arms no menu of its own. */
export function citationRowPointer(): Extension {
  return pointerHandlers<RowHit>({
    hoverGate: CITE_ROW_GLYPH,
    armable: () => false,
    hitAt: rowHitAt,
    follow: (hit, view) => {
      const marker = markersFor(docScan(view.state.doc).citations, hit.label)[0]
      return marker ? () => travelTo(view, marker.from) : null
    },
    dwell: () => null,
    menu: () => null,
  })
}

/** The citation row's own right-press. It is a whole line rather than an inline token, so it takes
 *  a plain handler instead of the inline pointer path — the same division the grip menu keeps. */
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
