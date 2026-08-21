// What a footnote gesture writes, and where every one of them lands. A native menu stays open as long
// as the reader likes and an undo or an outside write can move the document under it, so every
// action re-finds its target in the LIVE document and matches it against what the menu was built
// from before it writes — the discipline the connection and heading menus already keep.
import { type ChangeSet, type ChangeSpec, type EditorState, Facet } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { CitationMenuAction } from '@shared/citationMenu'
import { isInsideCode } from '@shared/markdownCode'
import { useSession } from '../../store'
import { citationFor, markersFor } from '../detect'
import { focusRange } from './caretSeat'
import {
  citationGesture,
  deleteCitationChanges,
  deleteMarkerChanges,
  insertCitationChanges,
} from './citationEdits'
import { docScan } from './docCache'
import { editAcrossCitations } from './folding'
import { travelTo } from './travel'

/** What the surface around this editor answers for on its own page. `reveal` opens a hidden section
 *  by writing the page's visibility rather than folding behind the host's back, so the footer's
 *  control still reads the section's true state after a jump or a creation. A surface with no page to
 *  write — an embed, a preview, a hover card — provides none, and the travel's own reveal carries it. */
export interface CitationHost {
  /** Whether this surface's page shows its footnotes — the state the fold follows after any gesture
   *  that rewrites the section, a first footnote on a page with none included. */
  shown: () => boolean
  reveal?: () => void
}

export const citationHost = Facet.define<CitationHost, CitationHost>({
  combine: (v) => v[0] ?? { shown: () => false },
})

/** Whether the caret sits where a marker may be written: outside the section, whose own `[^1]` stays
 *  literal, and outside code, where the syntax is characters rather than a reference. Both creation
 *  menus are offered under it and both write under it — a native menu can hang open while the
 *  document moves beneath it. */
export function citationSeatAt(state: EditorState): boolean {
  const scan = docScan(state.doc)
  const at = state.selection.main.from
  if (scan.citations.mask[state.doc.lineAt(at).number - 1]) return false
  return !isInsideCode(at, scan.text)
}

/** Every footnote gesture's dispatch: the edit it asked for, the renormalization that follows it,
 *  and the fold teardown the section's rewrite needs — one transaction, so one undo takes the whole
 *  act rather than half of it. Returns what landed, in the original document's coordinates, so a
 *  caller can find what it just wrote. */
export function commitCitation(
  view: EditorView,
  changes: ChangeSpec[],
  userEvent: string,
): ChangeSet | null {
  const set = citationGesture(docScan(view.state.doc), changes)
  if (set.empty) return null
  const host = view.state.facet(citationHost)
  editAcrossCitations(view, host.shown(), () => view.dispatch({ changes: set, userEvent }))
  return set
}

/** Insert ▸ Footnote and Paste As ▸ Footnote: a complete pair written in one transaction, with the
 *  caret's own answer to Jump To Citation On Creation. The marker goes after whatever is selected —
 *  a footnote annotates the words it follows — and the citation lands at the document's end.
 *
 *  The pair is found again in the finished document rather than assumed: the minted label is free,
 *  not final, and the normalization riding in the same transaction may well have renumbered it. */
export function insertCitation(view: EditorView, text = ''): boolean {
  if (view.state.readOnly || !citationSeatAt(view.state)) return false
  const at = view.state.selection.main.to
  const set = commitCitation(
    view,
    insertCitationChanges(docScan(view.state.doc), at, text),
    'input',
  )
  if (!set) return false
  const scan = docScan(view.state.doc)
  const marker = scan.citations.markers.find((m) => m.from === set.mapPos(at, -1))
  const entry = marker && citationFor(scan.citations, marker.label)
  if (!entry || useSession.getState().personalization.jumpToCitation === false) {
    focusRange(view, marker?.to ?? at)
    return true
  }
  view.state.facet(citationHost).reveal?.()
  focusRange(view, entry.contentStart)
  travelTo(view, entry.contentStart)
  return true
}

/** Which construct the menu was popped on, identified by the label it carried — an offset alone
 *  would name whatever moved into that seat while the menu stood open. */
export type CitationSubject =
  | { kind: 'marker'; marker: { from: number; to: number; label: string } }
  | { kind: 'citation'; label: string }

export function applyCitationAction(
  view: EditorView,
  action: CitationMenuAction,
  subject: CitationSubject,
): void {
  const scan = docScan(view.state.doc)
  const label = subject.kind === 'marker' ? subject.marker.label : subject.label
  const entry = citationFor(scan.citations, label)
  const marker =
    subject.kind === 'marker'
      ? markersFor(scan.citations, label).find(
          (m) => m.from === subject.marker.from && m.to === subject.marker.to,
        )
      : undefined
  // The document no longer holds what the menu was built from.
  if (subject.kind === 'marker' ? !marker : !entry) return

  switch (action) {
    case 'cite:edit':
      // Only a marker offers it, and only a citation can receive it.
      if (entry) focusRange(view, entry.contentStart)
      return
    case 'cite:copy':
      // The raw reference, not the citation's text: pasting it back in the page IS the second
      // reference, and that is the whole of how a footnote comes to be shared.
      void window.nexus?.writeClipboard?.(`[^${(marker ?? entry)?.label ?? ''}]`)
      return
    case 'cite:delete': {
      const changes = marker
        ? deleteMarkerChanges(scan, marker)
        : entry
          ? deleteCitationChanges(scan, entry)
          : []
      commitCitation(view, changes, 'delete')
      return
    }
  }
}
