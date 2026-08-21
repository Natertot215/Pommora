// What a footnote menu's chosen action does, for both constructs. A native menu stays open as long
// as the reader likes and an undo or an outside write can move the document under it, so every
// action re-finds its target in the LIVE document and matches it against what the menu was built
// from before it writes — the discipline the connection and heading menus already keep.
import type { EditorView } from '@codemirror/view'
import type { CitationMenuAction } from '@shared/citationMenu'
import { foldLabel } from '../detect'
import { focusRange } from './caretSeat'
import { deleteCitationChanges, deleteMarkerChanges } from './citationEdits'
import { docScan } from './docCache'

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
  const key = foldLabel(subject.kind === 'marker' ? subject.marker.label : subject.label)
  const entry = scan.citations.entries.find((e) => foldLabel(e.label) === key)
  const marker =
    subject.kind === 'marker'
      ? scan.citations.markers.find(
          (m) =>
            m.from === subject.marker.from &&
            m.to === subject.marker.to &&
            foldLabel(m.label) === key,
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
      const changes =
        subject.kind === 'marker' && marker
          ? deleteMarkerChanges(scan, marker, view.state.doc.length)
          : entry
            ? deleteCitationChanges(scan, entry, view.state.doc.length)
            : []
      if (changes.length) view.dispatch({ changes, userEvent: 'delete' })
      return
    }
  }
}
