// A marker's pointer gestures. The factory owns the hover intent, the press latch, the right-button
// claim and the caret-seat clamp; a marker is a third spec over it rather than a third copy of any
// of that. The jump itself is `travelTo` — this supplies a target, never a second traveller.
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { openPage, resolveMdTarget, type ConnectionsApi } from '../connections'
import {
  type CitationEntry,
  type MarkerRef,
  citationFor,
  isLastReference,
  lineEndOf,
} from '../detect'
import { linkTarget, tokenize } from '../tokens'
import { docScan, docString, perDoc } from './docCache'
import { followTarget } from './links'
import { applyCitationAction, citationHost } from './citationActions'
import { pointerHandlers, type PointerTarget } from './pointerPath'
import { travelTo } from './travel'

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

/** One marker a click can lead somewhere from, with the citation it binds to. */
interface CiteSpot {
  from: number
  to: number
  entry: CitationEntry
  marker: MarkerRef
  /** Whether this is the only marker bound to the citation — the row says what the click will do. */
  lastReference: boolean
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
      entry,
      marker: m,
      lastReference: isLastReference(scan.citations, m),
      lone: loneTarget(text.slice(entry.contentStart, end)),
    })
  }
  return out
})

function citeHitAt(view: EditorView, event: MouseEvent): CiteHit | null {
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
    hoverGate: '.md-cite-ref',
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
      view.state.facet(citationHost).reveal?.()
      travelTo(view, hit.entry.contentStart)
    },
    dwell: () => null,
    menu: (hit, view) => () =>
      void window.nexus
        ?.citationMenu?.({
          subject: 'marker',
          editable: !view.state.readOnly,
          lastReference: hit.lastReference,
        })
        .then((action) => {
          if (action) applyCitationAction(view, action, { kind: 'marker', marker: hit.marker })
        }),
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
