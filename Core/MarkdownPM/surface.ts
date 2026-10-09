import { EditorView, keymap } from '@codemirror/view'
import { type Extension, Prec } from '@codemirror/state'
import type { MarkdownScope } from './Engine/detect'
import type { ConnectionsApi } from './Links/connectionsApi'
import { markdownDecorations } from './decorations'
import { listDragExtension } from './Gestures/listDrag'
import { blockDragExtension } from './Gestures/blockDrag'
import { linkRest, linkTyping } from './Links/linkReveal'
import { listRenumber } from './Input/listRenumber'
import { smartDelete, typedInput, wrapChords } from './Input/markdownInput'
import { blockHandles, pointerReveal } from './Menus/blockHandles'
import { gripMenu } from './Menus/gripMenu'
import { editorMenu } from './Menus/menu'
import { customCaret } from './caret'
import { customSelection } from './selection'
import { connectionClicks } from './Links/connectionClicks'
import { markdownLinkClicks } from './Links/linkClicks'
import { citationPointer } from './Citations/citationPointer'
import { pasteLink } from './Links/pasteLink'
import { pendingTitle } from './Links/pendingTitle'
import { aliasOnLeave } from './Links/linkEdit'
import { type EditorHost, editorHost } from './api'
import { editorKeymap } from './Input/formatKeymap'
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
        gripMenu,
      ]
    case 'text':
      return []
  }
}

/** Everything a page body, a table cell, and a Text value share: inline rendering, the block gestures their scope holds, link and footnote pointers, the paste and alias rules, typing, and the right-click menu. The surfaces differ only in what wraps this. */
export const inlineSurface = (
  getConn: () => ConnectionsApi | undefined,
  scope: MarkdownScope,
): Extension => [
  markdownDecorations(getConn, scope),
  blockGestures(scope),
  customCaret,
  customSelection,
  connectionClicks(getConn),
  citationPointer(getConn),
  markdownLinkClicks(getConn),
  pasteLink,
  pendingTitle,
  aliasOnLeave(getConn),
  linkRest,
  linkTyping,
  EditorView.lineWrapping,
  // A cell's contentEditable=false widget host suppresses the inherited spellcheck; the rest are iOS keyboard hints.
  EditorView.contentAttributes.of({
    autocapitalize: 'sentences',
    autocorrect: 'off',
    spellcheck: 'true',
    enterkeyhint: 'enter',
    'data-drawn-caret': '',
  }),
  Prec.high(keymap.of(wrapChords)),
  typedInput(scope),
  editorMenu(scope),
]

/** What every editor holds beside its surface: its panes, with Enter and Tab picking the open one's row, the marker- and pair-aware Backspace, and the format chords. Each mount adds only what it alone holds. */
export const editorBase = ({
  host,
  getConn,
  scope,
  panes,
  formatExt,
}: {
  host: EditorHost
  getConn: () => ConnectionsApi | undefined
  scope: MarkdownScope
  panes: readonly EditorPane[]
  formatExt: Extension
}): Extension => [
  editorHost.of(host),
  inlineSurface(getConn, scope),
  Prec.highest(
    keymap.of([
      ...paneKeys(panes.map((p) => p.ctl)),
      { key: 'Backspace', run: smartDelete(scope) },
    ]),
  ),
  panes.map((p) => p.extension),
  // Ahead of the default keymap, which also binds Mod-i and Mod-[.
  formatExt,
  keymap.of(editorKeymap),
]
