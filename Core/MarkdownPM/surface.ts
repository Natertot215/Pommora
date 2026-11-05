import { type Command, Decoration, EditorView, keymap } from '@codemirror/view'
import {
  EditorSelection,
  type EditorState,
  type Extension,
  Prec,
  type SelectionRange,
} from '@codemirror/state'
import {
  cursorGroupLeft,
  cursorGroupRight,
  defaultKeymap,
  deleteGroupBackward,
  deleteGroupForward,
  selectGroupLeft,
  selectGroupRight,
  toggleBlockComment,
  toggleComment,
} from '@codemirror/commands'
import { isWordChar } from './Engine/markdownCode'
import type { MarkdownScope } from './Engine/detect'
import { markdownDecorations } from './decorations'
import { listDragExtension } from './Gestures/listDrag'
import { blockDragExtension } from './Gestures/blockDrag'
import { linkRest } from './Links/linkReveal'
import { linkSettle, linkWriting, type Remembers } from './Links/linkSettle'
import { listRenumber } from './Input/listRenumber'
import { smartDelete, typedInput, wrapChords } from './Input/markdownInput'
import { blockHandles, pointerReveal } from './Menus/blockHandles'
import { gripMenu } from './Menus/gripMenu'
import { editorMenu } from './Menus/menu'
import { customCaret } from './caret'
import { customSelection } from './selection'
import { linkPointer } from './Links/linkClicks'
import { citationPointer } from './Citations/citationPointer'
import { pasteLink } from './Links/pasteLink'
import { pendingTitles } from './Links/pendingTitle'
import { commitAliasOnEnter } from './Links/linkEdit'
import { type EditorHost, editorHost } from './api'
import { type EditorPane, paneKeys } from './Menus/caretPane'

function blockGestures(scope: MarkdownScope): Extension {
  switch (scope) {
    case 'page':
    case 'cell':
      return [
        listDragExtension(scope),
        listRenumber(scope),
        blockHandles(scope),
        pointerReveal(scope),
        blockDragExtension,
        gripMenu(scope),
      ]
    case 'text':
      return []
  }
}

const joins = (state: EditorState, at: number): boolean =>
  /['’]/.test(state.sliceDoc(at, at + 1)) &&
  isWordChar(state.sliceDoc(at - 1, at)) &&
  isWordChar(state.sliceDoc(at + 1, at + 2))

/** The word holding the character on `side` of `pos`: CodeMirror's word, carried across an apostrophe with a letter or digit on both sides, so `don't` reads whole and `'quoted'` reads `quoted`; a code fence's language adds its own word characters. A right-click's word on every surface is it, and while a double-click or a group motion, selection, or deletion runs, each joined word in view is one atom to it, so every other motion still steps through one. */
export function wordAt(state: EditorState, pos: number, side: -1 | 1): SelectionRange | null {
  const word = state.wordAt(pos)
  if (!word) return null
  let { from, to } = word
  while (joins(state, to)) to = state.wordAt(to + 1)!.to
  while (joins(state, from - 1)) from = state.wordAt(from - 1)!.from
  return (side < 0 ? from < pos : to > pos) ? EditorSelection.range(from, to) : null
}

let grouping = false
const JOINED = Decoration.mark({})
const wordPress = EditorView.mouseSelectionStyle.of((_, press) => {
  if (press.button === 0 && press.detail === 2) {
    grouping = true
    queueMicrotask(() => {
      grouping = false
    })
  }
  return null
})
const joinedWords = EditorView.atomicRanges.of((view) => {
  if (!grouping) return Decoration.none
  const { state } = view
  const { from, to } = view.viewport
  const words = [...state.sliceDoc(from, to).matchAll(/['’]/g)].flatMap(({ index }) => {
    const word = joins(state, from + index) && wordAt(state, from + index, -1)
    return word ? [JOINED.range(word.from, word.to)] : []
  })
  return Decoration.set(words, true)
})
const GROUPS: readonly Command[] = [
  cursorGroupLeft,
  cursorGroupRight,
  selectGroupLeft,
  selectGroupRight,
  deleteGroupBackward,
  deleteGroupForward,
]
const byWords = (command: Command | undefined): Command | undefined =>
  command && GROUPS.includes(command)
    ? (view) => {
        grouping = true
        try {
          return command(view)
        } finally {
          grouping = false
        }
      }
    : command
const editorKeymap = defaultKeymap.flatMap((b) =>
  b.run === toggleComment || b.run === toggleBlockComment
    ? []
    : [{ ...b, run: byWords(b.run), shift: byWords(b.shift) }],
)

/** Everything a page body, a table cell, and a property value share: inline rendering, the block gestures their scope holds, link and footnote pointers, the paste and alias rules, typing, the word gestures, and the right-click menu. The surfaces differ only in what wraps this. `oneLine` is a value field's surface: it scrolls where a body wraps, and it spellchecks nothing, since a field often holds an address or a name; `remembers` is when its alias memory writes. */
const inlineSurface = (
  scope: MarkdownScope,
  { oneLine = false, remembers = 'leave' }: { oneLine?: boolean; remembers?: Remembers } = {},
): Extension => [
  markdownDecorations(scope),
  blockGestures(scope),
  customCaret,
  customSelection,
  linkPointer(),
  citationPointer(),
  pasteLink,
  pendingTitles,
  linkSettle.of({ scope, remembers }),
  linkRest,
  linkWriting,
  oneLine ? [] : EditorView.lineWrapping,
  // A cell's contentEditable=false widget host suppresses the inherited spellcheck; the rest are iOS keyboard hints.
  EditorView.contentAttributes.of({
    autocapitalize: 'sentences',
    autocorrect: 'off',
    spellcheck: oneLine ? 'false' : 'true',
    enterkeyhint: 'enter',
    'data-drawn-caret': '',
  }),
  Prec.high(keymap.of(wrapChords)),
  typedInput(scope),
  wordPress,
  joinedWords,
  editorMenu(scope),
]

/** What every editor holds beside its surface: its panes, with Enter and Tab picking the open one's row, the marker- and pair-aware Backspace, and the format chords. Each mount adds only what it alone holds. */
export const editorBase = ({
  host,
  scope,
  panes,
  formatExt,
  oneLine,
  remembers,
}: {
  host: EditorHost
  scope: MarkdownScope
  panes: readonly EditorPane[]
  formatExt: Extension
  oneLine?: boolean
  remembers?: Remembers
}): Extension => [
  editorHost.of(host),
  inlineSurface(scope, { oneLine, remembers }),
  Prec.highest(
    keymap.of([
      ...paneKeys(panes.map((p) => p.ctl)),
      { key: 'Enter', run: commitAliasOnEnter(scope) },
      { key: 'Backspace', run: smartDelete(scope) },
    ]),
  ),
  panes.map((p) => p.extension),
  // Ahead of the default keymap, which also binds Mod-i and Mod-[.
  formatExt,
  keymap.of(editorKeymap),
]
