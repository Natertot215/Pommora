// What a footnote gesture writes, and where every one of them lands. A native menu stays open as long
// as the reader likes and an undo or an outside write can move the document under it, so every
// action re-finds its target in the LIVE document and matches it against what the menu was built
// from before it writes — the discipline the connection and heading menus already keep.
import type { ChangeSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { CitationMenuAction } from '@shared/citationMenu'
import { citationFor, markersFor } from '../detect'
import { focusRange } from './caretSeat'
import { citationGesture, deleteCitationChanges, deleteMarkerChanges } from './citationEdits'
import { docScan } from './docCache'
import { withCitationsUnfolded } from './folding'

/** Every footnote gesture's dispatch: the edit it asked for, the renormalization that follows it,
 *  and the fold teardown the section's rewrite needs — one transaction, so one undo takes the whole
 *  act rather than half of it. */
export function commitCitation(view: EditorView, changes: ChangeSpec[], userEvent: string): void {
  const set = citationGesture(docScan(view.state.doc), changes)
  if (set.empty) return
  withCitationsUnfolded(view, () => view.dispatch({ changes: set, userEvent }))
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
