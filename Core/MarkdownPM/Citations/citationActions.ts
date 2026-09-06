// A native menu stays open as long as the reader likes and an undo can move the document under it, so every action re-finds its target in the live document and matches it against what the menu was built from.
import {
  type ChangeSet,
  type ChangeSpec,
  EditorState,
  type Extension,
  Facet,
} from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { CitationMenuAction } from '@pommora/core/Actions/citationMenu'
import { isInsideInlineCode } from '@pommora/core/Connections/markdownCode'
import { citationFor, markerEndingAt, markersFor } from '../Engine/detect'
import { focusRange } from '../caretPlacement'
import type { CitationScan } from '../Engine/detect'
import {
  citationGesture,
  citationRowChanges,
  deleteCitationChanges,
  deleteMarkerChanges,
  mintLabel,
  normalizeCitations,
} from './citationEdits'
import { docScan } from '../docCache'
import { editAcrossCitations } from '../folding'
import { travelTo } from '../travel'
import { editorHost } from '../api'

interface CitationHost {
  shown: () => boolean
  reveal?: () => void
}

export const citationHost = Facet.define<CitationHost, CitationHost>({
  combine: (v) => v[0] ?? { shown: () => false },
})

export function travelToCitation(view: EditorView, label: string): void {
  const entry = citationFor(docScan(view.state.doc).citations, label)
  if (!entry) return
  view.state.facet(citationHost).reveal?.()
  travelTo(view, entry.contentStart)
}

/** A footnote annotates the words it follows, so the selection's end is where every creation puts the marker — outside the section and outside code. Both halves come off the cached scan. */
export function citationSeatAt(state: EditorState): boolean {
  const scan = docScan(state.doc)
  const at = state.selection.main.to
  const line = state.doc.lineAt(at)
  const i = line.number - 1
  if (scan.citations.mask[i] || scan.fences[i]) return false
  return !isInsideInlineCode(line.text, at - line.from)
}

/** One transaction, so one undo takes the whole act. Returns what landed in the original document's coordinates. */
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

/** The pair is found again in the finished document rather than assumed: a minted label is free, not final, and the normalization riding the same transaction may have renumbered it. */
function writeCitation(view: EditorView, markerFrom: number, changes: ChangeSpec[]): boolean {
  const set = commitCitation(view, changes, 'input')
  if (!set) return false
  const scan = docScan(view.state.doc)
  const marker = scan.citations.markers.find((m) => m.from === set.mapPos(markerFrom, -1))
  const entry = marker && citationFor(scan.citations, marker.label)
  if (!entry || view.state.facet(editorHost).settings().jumpToCitation === false) {
    focusRange(view, marker?.to ?? markerFrom)
    return true
  }
  view.state.facet(citationHost).reveal?.()
  focusRange(view, entry.contentStart)
  travelTo(view, entry.contentStart)
  return true
}

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

/** It cannot be a link in the typing chain: every transform there returns one range, and adopting an existing label writes at two disjoint sites. */
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

function bindingMoved(before: CitationScan, after: CitationScan): boolean {
  if (before.entries.length !== after.entries.length) return true
  return after.entries.some((e, i) => {
    const was = before.entries[i]
    return was.label !== e.label || was.ordinal !== e.ordinal
  })
}

/** The section a reader sees is first-use order or it is nothing, so the rewrite rides the same transaction; an ordinary keystroke pays one comparison over the rows. */
export const citationOrder: Extension = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr
  const after = docScan(tr.newDoc)
  if (!bindingMoved(docScan(tr.startState.doc).citations, after.citations)) return tr
  const changes = normalizeCitations(after)
  return changes.length === 0 ? tr : [tr, { changes, sequential: true }]
})

/** Identified by the label it carried — an offset alone would name whatever moved into that seat while the menu stood open. */
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
  if (subject.kind === 'marker' ? !marker : !entry) return

  switch (action) {
    case 'cite:edit':
      if (entry) focusRange(view, entry.contentStart)
      return
    case 'cite:copy':
      // The raw reference, not the citation's text: pasting it back IS the second reference.
      void view.state.facet(editorHost).clipboard.write(`[^${(marker ?? entry)?.label ?? ''}]`)
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
