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
  contractions,
  editorKeymap,
  listKeys,
  smartDelete,
  typedInput,
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

/** Everything a page body, a table cell, and a property value share: inline rendering, the block gestures their scope holds, link and footnote pointers, the paste and alias rules, typing, the word gestures, and the right-click menu. The surfaces differ only in what wraps this. An `inline` surface is a value's one-line field: it scrolls where a body wraps, and it spellchecks nothing, since a field often holds an address or a name; every surface states its spellcheck, since a cell's contentEditable=false widget host suppresses the inherited one, and the other content attributes are iOS keyboard hints. `remembers` is when its alias memory writes. */
const sharedSurface = (scope: MarkdownScope, remembers: Remembers = 'leave'): Extension => [
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
  scope === 'inline' ? [] : EditorView.lineWrapping,
  EditorView.contentAttributes.of({
    autocapitalize: 'sentences',
    autocorrect: 'off',
    spellcheck: scope === 'inline' ? 'false' : 'true',
    enterkeyhint: 'enter',
    'data-drawn-caret': '',
  }),
  Prec.high(keymap.of(wrapChords)),
  typedInput,
  Prec.high(contractions),
  editorMenu,
]

/** What every editor holds beside its surface: its panes, with Enter and Tab picking the open one's row, the marker- and pair-aware Backspace, the list keys, and the format chords, ahead of the default keymap, which also binds Mod-i and Mod-[. Each mount adds only what it alone holds. */
export const editorBase = ({
  host,
  scope,
  panes,
  formatExt,
  remembers,
}: {
  host: EditorHost
  scope: MarkdownScope
  panes: readonly EditorPane[]
  formatExt: Extension
  remembers?: Remembers
}): Extension => [
  editorHost.of(host),
  sharedSurface(scope, remembers),
  Prec.highest(
    keymap.of([
      ...paneKeys(panes.map((p) => p.ctl)),
      { key: 'Enter', run: commitAliasOnEnter },
      // Shift+Backspace joins like Backspace instead of falling to the default delete, which would erode a marker or a callout's body prefix.
      { key: 'Backspace', run: smartDelete, shift: smartDelete },
      ...listKeys(scope),
    ]),
  ),
  panes.map((p) => p.extension),
  formatExt,
  keymap.of(editorKeymap),
]
