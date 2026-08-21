// What a footnote gesture writes, and where every one of them lands. A native menu stays open as long
// as the reader likes and an undo or an outside write can move the document under it, so every
// action re-finds its target in the LIVE document and matches it against what the menu was built
// from before it writes — the discipline the connection and heading menus already keep.
import { type ChangeSet, type ChangeSpec, type EditorState, Facet } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { CitationMenuAction } from '@shared/citationMenu'
import { isInsideInlineCode } from '@shared/markdownCode'
import { useSession } from '../../store'
import { citationFor, markerEndingAt, markersFor } from '../detect'
import { focusRange } from './caretSeat'
import {
  citationGesture,
  citationRowChanges,
  deleteCitationChanges,
  deleteMarkerChanges,
  mintLabel,
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
 *  document moves beneath it.
 *
 *  It answers on every caret move, so both halves come off the cached scan or the caret's own line;
 *  the whole-document form would split the text and pair every fence from the top each time. */
export function citationSeatAt(state: EditorState): boolean {
  const scan = docScan(state.doc)
  const at = state.selection.main.from
  const line = state.doc.lineAt(at)
  const i = line.number - 1
  if (scan.citations.mask[i] || scan.fences[i]) return false
  return !isInsideInlineCode(line.text, at - line.from)
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

/** Write a creation gesture and answer for where it leaves the reader. Jump To Citation On Creation
 *  decides between the new citation and the marker just written; the disclosure is the page's own
 *  visibility, so the footer's control still reads the section's true state afterwards.
 *
 *  The pair is found again in the finished document rather than assumed: a minted label is free, not
 *  final, and the normalization riding in the same transaction may well have renumbered it. */
function writeCitation(view: EditorView, markerFrom: number, changes: ChangeSpec[]): boolean {
  const set = commitCitation(view, changes, 'input')
  if (!set) return false
  const scan = docScan(view.state.doc)
  const marker = scan.citations.markers.find((m) => m.from === set.mapPos(markerFrom, -1))
  const entry = marker && citationFor(scan.citations, marker.label)
  if (!entry || useSession.getState().personalization.jumpToCitation === false) {
    focusRange(view, marker?.to ?? markerFrom)
    return true
  }
  view.state.facet(citationHost).reveal?.()
  focusRange(view, entry.contentStart)
  travelTo(view, entry.contentStart)
  return true
}

/** Insert ▸ Footnote and Paste As ▸ Footnote: a complete pair in one transaction. The marker goes
 *  after whatever is selected — a footnote annotates the words it follows — and the citation lands at
 *  the document's end. */
export function insertCitation(view: EditorView, text = ''): boolean {
  if (view.state.readOnly || !citationSeatAt(view.state)) return false
  const scan = docScan(view.state.doc)
  const at = view.state.selection.main.to
  const label = mintLabel(scan.citations)
  return writeCitation(view, at, [
    { from: at, to: at, insert: `[^${label}]` },
    citationRowChanges(scan, label, text, at),
  ])
}

/** A label finished by typing `]`. Typing a fresh one is a creation gesture like any other and seeds
 *  its citation; typing one that already has a citation adopts it and rewrites nothing, which is the
 *  whole of how a footnote comes to be shared by hand.
 *
 *  A typed label is a creation like any other, so Jump To Citation On Creation governs it too — the
 *  setting is the one place a reader decides whether creating a footnote takes them to it.
 *
 *  It cannot be a link in the typing chain: every transform there returns one range, and this writes
 *  at two disjoint sites. The closing bracket is typed OVER the one `[` auto-paired rather than
 *  doubled beside it. */
export function seedTypedCitation(view: EditorView, at: number): boolean {
  if (view.state.readOnly || !citationSeatAt(view.state)) return false
  const scan = docScan(view.state.doc)
  const label = markerEndingAt(`${scan.text.slice(view.state.doc.lineAt(at).from, at)}]`)
  if (label === null || citationFor(scan.citations, label)) return false
  return writeCitation(view, at - label.length - 2, [
    ...(scan.text[at] === ']' ? [] : [{ from: at, to: at, insert: ']' }]),
    citationRowChanges(scan, label, '', at),
  ])
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
