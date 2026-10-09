import { EditorView, type KeyBinding, keymap } from '@codemirror/view'
import {
  EditorSelection,
  EditorState,
  type Extension,
  Prec,
  type StateCommand,
  StateField,
  type Transaction,
} from '@codemirror/state'
import { insertBlankLine, insertNewlineAndIndent } from '@codemirror/commands'
import { indentUnit } from '@codemirror/language'
import {
  continueListOnEnter,
  marginSign,
  continueBlockquoteOnEnter,
  smartBackspace,
  canonicalizeCheckbox,
  autoPair,
  pairColorMark,
  autoDelete,
  closeConstructOnEnter,
  closeBlockOnEnter,
  closeConstructOnShiftEnter,
  dashArrow,
  ellipsis,
  punctuation,
  equations,
  bullet,
  sectionSign,
  calloutShorthand,
  shiftEnterEdit,
  indentListOnTab,
  outdentListOnShiftTab,
  wrapSelection,
  inAliasAt,
  type Edit,
} from './edits'
import { isColorMark } from '../Engine/highlightColors'
import { applyEdit } from './applyEdit'
import { fenceAt, lineEndOf, lineIndexAt, lineOffsetsOf } from '../Engine/markdownCode'
import { commitAliasOnEnter } from '../Links/linkEdit'
import { headingHash } from '../Links/headingHash'
import { embedTileRanges } from '../Embeds/embedWidget'
import { caretInMargin, type DocScan, signSeatAt } from '../Engine/docScan'
import { type MarkdownScope, signedLine } from '../Engine/detect'
import { blockLanguage, blockLines } from '../codeHighlight'
import { commitCitation, seedTypedCitation } from '../Citations/citationActions'
import { citationDeleteIntent } from '../Citations/citationEdits'
import { docLineIntentsOf, docScan } from '../docCache'
import { prefixEndAt } from '../Engine/intents'
import { editorHost } from '../api'

const settingsOf = (view: EditorView) => view.state.facet(editorHost).settings()

const apply = (view: EditorView, edit: Edit | null): boolean =>
  applyEdit(view, edit, { scrollIntoView: true })

const nest =
  (transform: (scan: DocScan, selStart: number, selEnd: number) => Edit | null) =>
  (view: EditorView): boolean => {
    const s = view.state.selection.main
    apply(view, transform(docScan(view.state.doc), s.from, s.to))
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
      continueListOnEnter(scan, s.from, s.to) ??
      continueBlockquoteOnEnter(scan, s.from, s.to),
  )
}

// Enter on a diff line carries its sign to the new line, as a list item carries its marker, and Mod-Enter opens an unchanged line below. Each is CodeMirror's own command run on the block as its language reads it, so the code indents past the sign column; the break then lands back behind the line's prefix.
const diffBreak =
  (command: StateCommand, sign?: ' ') =>
  (view: EditorView): boolean => {
    const { from, to } = view.state.selection.main
    const scan = docScan(view.state.doc)
    const i = lineIndexAt(scan, from)
    const f = scan.fences[i]
    const seat = signSeatAt(scan, from)
    if (
      f === undefined ||
      !signedLine(f) ||
      seat === null ||
      from < seat ||
      to > lineEndOf(scan, i)
    )
      return false
    const lines = blockLines(scan, f)
    const shift = lineOffsetsOf(lines)[i - lineIndexAt(scan, f.from)] - seat
    const broke: Transaction[] = []
    command({
      state: EditorState.create({
        doc: lines.join('\n'),
        selection: EditorSelection.range(from + shift, to + shift),
        extensions: [
          blockLanguage,
          indentUnit.of(view.state.facet(indentUnit)),
          EditorState.tabSize.of(view.state.tabSize),
        ],
      }),
      dispatch: (tr) => broke.push(tr),
    })
    const lead = `\n${scan.lines[i].slice(0, seat - 1 - scan.lineStarts[i])}${sign ?? scan.text[seat - 1]}`
    const signed = (text: string) => text.replaceAll('\n', lead)
    // Each command makes one change for the one caret.
    const edits: Edit[] = []
    broke[0]?.changes.iterChanges((fromA, toA, fromB, _toB, inserted) => {
      const text = inserted.toString()
      const head = broke[0].newSelection.main.head - fromB
      edits.push({
        from: fromA - shift,
        to: toA - shift,
        insert: signed(text),
        selection: fromA - shift + signed(text.slice(0, head)).length,
      })
    })
    return apply(view, edits[0] ?? null)
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
  if (r) {
    view.dispatch({ changes: { from: s.from, to: r.to }, userEvent: 'delete' })
    return true
  }
  const next = s.from + 1
  if (lineIndexAt(scan, next) >= scan.citations.firstLine) return false
  const visible = prefixEndAt(docLineIntentsOf(view.state.doc, 'page'), scan, next)
  if (visible === next) return false
  view.dispatch({
    changes: { from: s.from, to: visible },
    selection: { anchor: s.from },
    userEvent: 'delete',
  })
  return true
}

/** Every surface's Backspace: a page first holds an embedded tile and cascades a footnote's removal, then a marker or an empty pair goes as a delete of its own. */
export const smartDelete =
  (scope: MarkdownScope) =>
  (view: EditorView): boolean => {
    const s = view.state.selection.main
    if (scope === 'page') {
      if (
        s.empty &&
        embedTileRanges(view.state).some((r) => s.from === r.to + 1 || s.from === r.to)
      )
        return true
      if (citationCascade(view, s.from, s.to)) return true
    }
    const scan = docScan(view.state.doc)
    return applyEdit(
      view,
      smartBackspace(scan, s.from, s.to, scope) ?? autoDelete(scan, s.from, s.to, settingsOf(view)),
      { scrollIntoView: true, userEvent: 'delete' },
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

/** Every typed character on both surfaces: a cell skips the callout shorthand and the citation seed, which write page constructs. */
export const typedInput = (scope: MarkdownScope): Extension =>
  EditorView.inputHandler.of((view, from, to, text) => {
    // Never dispatch mid-composition: a transaction there aborts or garbles the IME session.
    if (view.composing || view.compositionStarted) return false
    const scan = docScan(view.state.doc)
    const page = scope === 'page'
    if (page && caretInMargin(scan, view.state.selection.main)) {
      apply(view, marginSign(scan, from, text))
      return true
    }
    if (text.length !== 1 && !isColorMark(text)) return false
    const settings = settingsOf(view)
    if (from !== to)
      return apply(
        view,
        wrapSelection(scan, from, to, text, settings) ?? headingHash(scan, from, to, text),
      )
    if (text === ']' && inAliasAt(scan, from)) return true
    if (page && text === ']' && seedTypedCitation(view, from)) return true
    return apply(
      view,
      pairColorMark(scan, from, text, settings) ??
        headingHash(scan, from, from, text) ??
        (page ? calloutShorthand(scan.text, from, from, text, settings) : null) ??
        canonicalizeCheckbox(scan.text, from, from, text, scope) ??
        autoPair(scan, from, from, text, settings) ??
        dashArrow(scan, from, from, text, settings) ??
        ellipsis(scan, from, from, text, settings) ??
        punctuation(scan, from, from, text, settings) ??
        equations(scan, from, from, text, settings) ??
        sectionSign(scan, from, from, text, settings) ??
        bullet(scan, from, from, text, settings),
    )
  })

export const markdownInput = [
  typedLine,
  Prec.high(
    keymap.of([
      { key: 'Enter', run: commitAliasOnEnter },
      { key: 'Enter', run: diffBreak(insertNewlineAndIndent) },
      { key: 'Enter', run: onEnter },
      { key: 'Shift-Enter', run: onShiftEnter },
      { key: 'Mod-Enter', run: diffBreak(insertBlankLine, ' ') },
      { key: 'Tab', run: nest(indentListOnTab) },
      { key: 'Shift-Tab', run: nest(outdentListOnShiftTab) },
      { key: 'Delete', run: onForwardDelete },
      // Shift+Backspace joins like Backspace inside a callout instead of falling to the default delete, which would erode the body prefix.
      { key: 'Shift-Backspace', run: smartDelete('page') },
    ]),
  ),
]
