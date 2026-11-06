import { EditorView, keymap } from '@codemirror/view'
import { type Extension, Prec } from '@codemirror/state'
import { type MarkdownScope, readsLists } from './Engine/detect'
import { markdownDecorations } from './decorations'
import { listDragExtension } from './Gestures/listDrag'
import { blockDragExtension } from './Gestures/blockDrag'
import { linkRest } from './Links/linkReveal'
import { linkSettle, linkWriting, type Remembers } from './Links/linkSettle'
import { listRenumber } from './Input/listRenumber'
import {
  editorKeymap,
  smartDelete,
  typedInput,
  wordGestures,
  wrapChords,
} from './Input/markdownInput'
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
import { surfaceScope } from './docCache'
import { type EditorHost, editorHost } from './api'
import { type EditorPane, paneKeys } from './Menus/caretPane'

/** Everything a page body, a table cell, and a property value share: inline rendering, the block gestures their scope holds, link and footnote pointers, the paste and alias rules, typing, the word gestures, and the right-click menu. The surfaces differ only in what wraps this. `oneLine` is a value field's surface: it scrolls where a body wraps, and it spellchecks nothing, since a field often holds an address or a name; every surface states its spellcheck, since a cell's contentEditable=false widget host suppresses the inherited one, and the other content attributes are iOS keyboard hints. `remembers` is when its alias memory writes. */
const sharedSurface = (
  scope: MarkdownScope,
  { oneLine = false, remembers = 'leave' }: { oneLine?: boolean; remembers?: Remembers } = {},
): Extension => [
  surfaceScope.of(scope),
  markdownDecorations,
  readsLists(scope)
    ? [listDragExtension, listRenumber, blockHandles, pointerReveal(), blockDragExtension, gripMenu]
    : [],
  customCaret,
  customSelection,
  linkPointer(),
  citationPointer(),
  pasteLink,
  pendingTitles,
  linkSettle.of(remembers),
  linkRest,
  linkWriting,
  oneLine ? [] : EditorView.lineWrapping,
  EditorView.contentAttributes.of({
    autocapitalize: 'sentences',
    autocorrect: 'off',
    spellcheck: oneLine ? 'false' : 'true',
    enterkeyhint: 'enter',
    'data-drawn-caret': '',
  }),
  Prec.high(keymap.of(wrapChords)),
  typedInput,
  wordGestures,
  editorMenu(scope),
]

/** What every editor holds beside its surface: its panes, with Enter and Tab picking the open one's row, the marker- and pair-aware Backspace, and the format chords, ahead of the default keymap, which also binds Mod-i and Mod-[. Each mount adds only what it alone holds. */
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
  sharedSurface(scope, { oneLine, remembers }),
  Prec.highest(
    keymap.of([
      ...paneKeys(panes.map((p) => p.ctl)),
      { key: 'Enter', run: commitAliasOnEnter },
      { key: 'Backspace', run: smartDelete },
    ]),
  ),
  panes.map((p) => p.extension),
  formatExt,
  keymap.of(editorKeymap),
]
