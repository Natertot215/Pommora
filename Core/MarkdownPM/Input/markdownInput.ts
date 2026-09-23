import { EditorView, type KeyBinding, keymap } from '@codemirror/view'
import { Prec, StateField } from '@codemirror/state'
import {
  continueListOnEnter,
  continueBlockquoteOnEnter,
  smartBackspace,
  canonicalizeCheckbox,
  autoPair,
  autoDelete,
  closeConstructOnEnter,
  closeBlockOnEnter,
  closeConstructOnShiftEnter,
  dashArrow,
  ellipsis,
  equations,
  bullet,
  sectionSign,
  calloutShorthand,
  shiftEnterEdit,
  indentListOnTab,
  outdentListOnShiftTab,
  wrapSelection,
  type Edit,
} from './edits'
import { renumberAfterNest, type ChangeSpec } from '../Engine/listDragModel'
import { applyEdit } from './applyEdit'
import { fenceAt } from '../Engine/markdownCode'
import { refusedInAlias } from '../Guards/aliasGuard'
import { commitAliasOnEnter } from '../Links/linkEdit'
import { headingHash } from '../Links/headingHash'
import { embedTileRanges } from '../Embeds/embedWidget'
import type { DocScan } from '../Engine/docScan'
import { commitCitation, seedTypedCitation } from '../Citations/citationActions'
import { citationDeleteIntent } from '../Citations/citationEdits'
import { docScan, docString } from '../docCache'
import { editorHost } from '../api'

const settingsOf = (view: EditorView) => view.state.facet(editorHost).settings()

const apply = (view: EditorView, edit: Edit | null, recount: ChangeSpec[] = []): boolean =>
  applyEdit(view, edit, { recount, scrollIntoView: true })

const nest =
  (transform: (doc: string, selStart: number, selEnd: number) => Edit | null) =>
  (view: EditorView): boolean => {
    const s = view.state.selection.main
    const doc = docString(view.state.doc)
    const edit = transform(doc, s.from, s.to)
    if (edit) apply(view, edit, renumberAfterNest(doc, edit))
    return true
  }

// GFM lazy continuation absorbs any non-blank line touching a table as a row, so Enter at the bottom boundary lays a blank-line fence.
const tableBoundaryEnter = (scan: DocScan, s: { from: number; to: number }): Edit | null => {
  if (s.from !== s.to) return null
  const r = scan.tables.find((r) => r.to === s.from)
  return r ? { from: s.from, to: s.from, insert: '\n\n', selection: s.from + 2 } : null
}

const typedLine = StateField.define<number>({
  create: () => -1,
  update(at, tr) {
    const line = tr.newDoc.lineAt(tr.newSelection.main.head).from
    if (!tr.docChanged) return at === line ? at : -1
    if (!tr.isUserEvent('input')) return -1
    if (at === line) return line
    const was = tr.startState.doc.lineAt(tr.startState.selection.main.head).text
    return fenceAt(was) === null && was.trim() !== '$$' ? line : -1
  },
})

const onEnter = (view: EditorView): boolean => {
  const s = view.state.selection.main
  const scan = docScan(view.state.doc)
  const settings = settingsOf(view)
  return apply(
    view,
    closeConstructOnEnter(scan, s.from, s.to, settings) ??
      closeBlockOnEnter(scan, s.from, s.to, settings, view.state.field(typedLine) >= 0) ??
      tableBoundaryEnter(scan, s) ??
      continueListOnEnter(scan.text, s.from, s.to) ??
      continueBlockquoteOnEnter(scan, s.from, s.to),
  )
}

// Forward-delete at the end of the line above a table would join prose into the header row, so it mirrors the backspace atomic behavior instead.
/** Dispatched rather than returned into the transform chain: removing a footnote is two disjoint sites, and the edit that chain carries is a single range. */
const citationCascade = (view: EditorView, from: number, to: number): boolean => {
  const changes = citationDeleteIntent(docScan(view.state.doc), from, to)
  if (!changes) return false
  commitCitation(view, changes, 'delete')
  return true
}

const onForwardDelete = (view: EditorView): boolean => {
  const s = view.state.selection.main
  const scan = docScan(view.state.doc)
  const marker = s.empty ? scan.citations.markers.find((m) => m.from === s.from) : undefined
  const from = marker?.from ?? s.from
  const to = marker?.to ?? s.to
  if (from !== to && citationCascade(view, from, to)) return true
  if (!s.empty) return false
  // The atomic default would otherwise expand the delete over the whole absorbed range and remove the tile from a keystroke.
  if (embedTileRanges(view.state).some((r) => s.from === r.from - 1 || s.from === r.from))
    return true
  if (scan.text[s.from] !== '\n') return false
  const r = scan.tables.find((r) => r.from === s.from + 1)
  if (!r) return false
  view.dispatch({ changes: { from: s.from, to: r.to }, userEvent: 'delete' })
  return true
}

const onBackspace = (view: EditorView): boolean => {
  const s = view.state.selection.main
  if (s.empty && embedTileRanges(view.state).some((r) => s.from === r.to + 1 || s.from === r.to))
    return true
  if (citationCascade(view, s.from, s.to)) return true
  const scan = docScan(view.state.doc)
  return apply(
    view,
    smartBackspace(scan, s.from, s.to) ?? autoDelete(scan, s.from, s.to, settingsOf(view)),
  )
}

// Except inside a callout, where it stays in the box. An unclosed pair is closed first so the break never lands inside it.
const onShiftEnter = (view: EditorView): boolean => {
  const s = view.state.selection.main
  const scan = docScan(view.state.doc)
  return apply(
    view,
    closeConstructOnShiftEnter(scan, s.from, s.to, settingsOf(view)) ??
      shiftEnterEdit(scan, s.from, s.to),
  )
}

// ⌘ stands in for ⇧ on a pair key: it wraps a single-line selection with the shifted character, and ⌘[ with the bracket; across lines ⌘[ stays outdent.
export const wrapChords: KeyBinding[] = Object.entries({ "'": '"', 8: '*', 9: '(', '[': '[' }).map(
  ([key, ch]) => ({
    key: `Mod-${key}`,
    run: (view) => {
      const { from, to } = view.state.selection.main
      if (view.state.sliceDoc(from, to).includes('\n')) return false
      return apply(view, wrapSelection(docScan(view.state.doc), from, to, ch, settingsOf(view)))
    },
  }),
)

export const markdownInput = [
  typedLine,
  Prec.high(
    keymap.of([
      { key: 'Enter', run: commitAliasOnEnter },
      { key: 'Enter', run: onEnter },
      { key: 'Shift-Enter', run: onShiftEnter },
      { key: 'Tab', run: nest(indentListOnTab) },
      { key: 'Shift-Tab', run: nest(outdentListOnShiftTab) },
      { key: 'Backspace', run: onBackspace },
      { key: 'Delete', run: onForwardDelete },
      // Shift+Backspace joins like Backspace inside a callout instead of falling to the default delete, which would erode the body prefix.
      { key: 'Shift-Backspace', run: onBackspace },
      ...wrapChords,
    ]),
  ),
  EditorView.inputHandler.of((view, from, to, text) => {
    // Never dispatch mid-composition: a transaction there aborts or garbles the IME session.
    if (view.composing || view.compositionStarted) return false
    if (text.length !== 1) return false
    const scan = docScan(view.state.doc)
    const settings = settingsOf(view)
    if (from !== to)
      return apply(
        view,
        wrapSelection(scan, from, to, text, settings) ?? headingHash(scan, from, to, text),
      )
    if (refusedInAlias(scan.text, from, text)) return true
    if (text === ']' && seedTypedCitation(view, from)) return true
    return apply(
      view,
      headingHash(scan, from, from, text) ??
        calloutShorthand(scan.text, from, from, text, settings) ??
        canonicalizeCheckbox(scan.text, from, from, text) ??
        autoPair(scan, from, from, text, settings) ??
        dashArrow(scan, from, from, text, settings) ??
        ellipsis(scan, from, from, text, settings) ??
        equations(scan, from, from, text, settings) ??
        sectionSign(scan, from, from, text, settings) ??
        bullet(scan, from, from, text, settings),
    )
  }),
]
