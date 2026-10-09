// A native menu stays open as long as the reader likes and an undo can move the document under it, so every action re-finds its target in the live document and matches it against what the menu was built from.
import {
  type ChangeSet,
  type ChangeSpec,
  EditorState,
  type Extension,
  Prec,
} from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { CitationMenuAction } from './citationMenu'
import { inCodeAt } from '../Engine/docScan'
import { citationFor, markerEndingAt, markersFor, type CitationScan } from '../Engine/detect'
import { focusRange } from '../caretPlacement'
import {
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

const citationsOf = (view: EditorView) => view.state.facet(editorHost).citations

export function travelToCitation(view: EditorView, label: string): void {
  const entry = citationFor(docScan(view.state.doc).citations, label)
  if (!entry) return
  citationsOf(view).set(true)
  travelTo(view, entry.contentStart)
}

/** A footnote annotates the words it follows, so the selection's end is where every creation puts the marker — outside the section and outside code. Both halves come off the cached scan. */
export function citationSeatAt(state: EditorState, at = state.selection.main.to): boolean {
  const scan = docScan(state.doc)
  return state.doc.lineAt(at).number - 1 < scan.citations.firstLine && !inCodeAt(scan, at)
}

/** One transaction, so one undo takes the whole act, and `citationOrder`'s renumbering rides it. Returns what landed in the original document's coordinates, or null where a guard refused it. */
export function commitCitation(
  view: EditorView,
  changes: ChangeSpec[],
  userEvent: string,
): ChangeSet | null {
  let landed: ChangeSet | null = null
  editAcrossCitations(view, citationsOf(view).shown(), () => {
    const tr = view.state.update({ changes, userEvent })
    if (!tr.docChanged) return
    view.dispatch(tr)
    landed = tr.changes
  })
  return landed
}

/** The pair is found again in the finished document rather than assumed: a minted label is free, not final, and the normalization riding the same transaction may have renumbered it. */
function writeCitation(view: EditorView, markerFrom: number, changes: ChangeSpec[]): boolean {
  const set = commitCitation(view, changes, 'input')
  if (!set) return false
  const scan = docScan(view.state.doc)
  const marker = scan.citations.markers.find((m) => m.from === set.mapPos(markerFrom, -1))
  const entry = marker && citationFor(scan.citations, marker.label)
  if (!entry || !view.state.facet(editorHost).settings().jumpToCitation) {
    focusRange(view, marker?.to ?? markerFrom)
    return true
  }
  editCitation(view, entry.contentStart)
  return true
}

/** The section opens before the caret seats: a caret seated in a hidden section takes typing no one can see. */
function editCitation(view: EditorView, at: number): void {
  citationsOf(view).set(true)
  focusRange(view, at)
  travelTo(view, at)
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

const sameLabels = (a: readonly { label: string }[], b: readonly { label: string }[]): boolean =>
  a.length === b.length && a.every((x, i) => x.label === b[i].label)

/** Every ordinal follows from the rows' and markers' labels in order, so those are all a binding is. */
function bindingMoved(before: CitationScan, after: CitationScan): boolean {
  return !sameLabels(before.entries, after.entries) || !sameLabels(before.markers, after.markers)
}

/** The section a reader sees is first-use order or it is nothing, so the rewrite rides the same transaction; an ordinary keystroke pays one comparison over the rows and markers. Filters run lowest precedence first, so at the highest it renumbers the edit every guard has already repaired. */
export const citationOrder: Extension = Prec.highest(
  EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged) return tr
    const after = docScan.after(tr)
    if (!bindingMoved(docScan(tr.startState.doc).citations, after.citations)) return tr
    const changes = normalizeCitations(after)
    return changes.length === 0 ? tr : [tr, { changes, sequential: true }]
  }),
)

/** Identified by the label it carried — an offset alone would name whatever moved into that seat while the menu stood open. */
type CitationSubject =
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
  const target = subject.kind === 'marker' ? marker : entry
  if (!target) return

  switch (action) {
    case 'cite:edit':
      if (entry) editCitation(view, entry.contentStart)
      return
    case 'cite:copy':
      // The raw reference, not the citation's text: pasting it back IS the second reference.
      void view.state.facet(editorHost).clipboard.write(`[^${target.label}]`)
      return
    case 'cite:delete':
      commitCitation(
        view,
        'from' in target ? deleteMarkerChanges(scan, target) : deleteCitationChanges(scan, target),
        'delete',
      )
      return
  }
}
