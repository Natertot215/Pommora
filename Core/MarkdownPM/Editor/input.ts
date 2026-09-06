import { EditorView, keymap } from '@codemirror/view'
import { Prec } from '@codemirror/state'
import {
  continueListOnEnter,
  continueBlockquoteOnEnter,
  smartBackspace,
  canonicalizeCheckbox,
  autoPair,
  autoDelete,
  closeConstructOnEnter,
  closeConstructOnShiftEnter,
  dashArrow,
  calloutShorthand,
  shiftEnterEdit,
  indentListOnTab,
  outdentListOnShiftTab,
  lineStartAt,
  lineEndAt,
  type Edit,
} from '../Input'
import { aliasSpanAt } from '@pommora/core/Connections/connections'
import { commitAliasOnEnter } from './linkEdit'
import { embedTileRanges } from './embedWidget'
import type { DocScan } from '../Decorations/intent'
import { commitCitation, seedTypedCitation } from './citationActions'
import { citationDeleteIntent } from './citationEdits'
import { docScan, docString } from './docCache'

function apply(view: EditorView, edit: Edit | null): boolean {
  if (!edit) return false
  view.dispatch({
    changes: { from: edit.from, to: edit.to, insert: edit.insert },
    selection: { anchor: edit.selection },
    scrollIntoView: true,
    userEvent: 'input',
  })
  return true
}

// GFM lazy continuation absorbs any non-blank line touching a table as a row, so Enter at the bottom boundary lays a blank-line fence.
const tableBoundaryEnter = (scan: DocScan, s: { from: number; to: number }): Edit | null => {
  if (s.from !== s.to) return null
  const r = scan.tables.find((r) => r.to === s.from)
  return r ? { from: s.from, to: s.from, insert: '\n\n', selection: s.from + 2 } : null
}

const onEnter = (view: EditorView): boolean => {
  const s = view.state.selection.main
  const scan = docScan(view.state.doc)
  return apply(
    view,
    closeConstructOnEnter(scan, s.from, s.to) ??
      tableBoundaryEnter(scan, s) ??
      continueListOnEnter(scan.text, s.from, s.to) ??
      continueBlockquoteOnEnter(scan, s.from, s.to),
  )
}

// Forward-delete at the end of the line above a table would join prose into the header row, so it mirrors
// the backspace atomic behavior instead.
/** Dispatched rather than returned into the transform chain: removing a footnote is two disjoint sites, and
 *  the edit that chain carries is a single range. Both delete keys ask here. */
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
  return apply(view, smartBackspace(scan, s.from, s.to) ?? autoDelete(scan, s.from, s.to))
}

const onTab = (view: EditorView): boolean => {
  const s = view.state.selection.main
  apply(view, indentListOnTab(docString(view.state.doc), s.from, s.to))
  return true
}

// Same containment for Shift-Tab: outdent when there's a level to remove, and never blur the editor.
const onShiftTab = (view: EditorView): boolean => {
  const s = view.state.selection.main
  apply(view, outdentListOnShiftTab(docString(view.state.doc), s.from, s.to))
  return true
}

/** `]` would truncate the link the caret is sitting in — the same treatment `|` gets in a title. Exported
 *  because the page editor and a table cell run different input handlers, and the guard belongs to the alias. */
export function refusedInAlias(doc: string, at: number, text: string): boolean {
  if (text !== ']') return false
  const ls = lineStartAt(doc, at)
  return aliasSpanAt(doc.slice(ls, lineEndAt(doc, at)), at - ls) !== null
}

// Except inside a callout, where it stays in the box. An unclosed pair is closed first so the break never lands inside it.
const onShiftEnter = (view: EditorView): boolean => {
  const s = view.state.selection.main
  const scan = docScan(view.state.doc)
  return apply(
    view,
    closeConstructOnShiftEnter(scan, s.from, s.to) ?? shiftEnterEdit(scan, s.from, s.to),
  )
}

export const markdownInput = [
  Prec.high(
    keymap.of([
      { key: 'Enter', run: commitAliasOnEnter },
      { key: 'Enter', run: onEnter },
      { key: 'Shift-Enter', run: onShiftEnter },
      { key: 'Tab', run: onTab },
      { key: 'Shift-Tab', run: onShiftTab },
      { key: 'Backspace', run: onBackspace },
      { key: 'Delete', run: onForwardDelete },
      // Shift+Backspace joins like Backspace inside a callout instead of falling to the default delete, which would erode the body prefix.
      { key: 'Shift-Backspace', run: onBackspace },
    ]),
  ),
  EditorView.inputHandler.of((view, from, to, text) => {
    // Never dispatch mid-composition: a transaction there aborts or garbles the IME session.
    if (view.composing || view.compositionStarted) return false
    if (text.length !== 1 || from !== to) return false
    const scan = docScan(view.state.doc)
    if (refusedInAlias(scan.text, from, text)) return true
    // Dispatched on its own: a seed writes at two disjoint sites, and every transform in that chain carries one range.
    if (text === ']' && seedTypedCitation(view, from)) return true
    return apply(
      view,
      calloutShorthand(scan.text, from, from, text) ??
        canonicalizeCheckbox(scan.text, from, from, text) ??
        autoPair(scan, from, from, text) ??
        dashArrow(scan, from, from, text),
    )
  }),
]
