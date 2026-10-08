import { EditorView, keymap } from '@codemirror/view'
import { type Extension, Prec } from '@codemirror/state'
import type { MarkdownScope } from './Engine/detect'
import type { ConnectionsApi } from './Links/connectionsApi'
import { markdownDecorations } from './decorations'
import { listDragExtension } from './Gestures/listDrag'
import { blockDragExtension } from './Gestures/blockDrag'
import { linkRest, linkTyping } from './Links/linkReveal'
import { listRenumber } from './Input/listRenumber'
import { typedInput, wrapChords } from './Input/markdownInput'
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
import { docScan } from './docCache'
import { applyEdit } from './Input/applyEdit'
import { autoDelete, smartBackspace } from './Input/edits'
import { editorKeymap } from './Input/formatKeymap'
import { paneKeys, whenPaneOpen } from './Menus/caretPane'
import {
  type ConnectionAutocomplete,
  detectConnectionQuery,
} from './Autocomplete/useConnectionAutocomplete'

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

/** What an editor mounted outside a page body holds beside its surface: the `[[` pane's keys, with Enter and Tab picking its row, the marker- and pair-aware Backspace, the format chords, and the query that opens the pane. Each mount adds only its own ways out. */
export const editorBase = ({
  host,
  getConn,
  scope,
  ac: { acCtl, setAc },
  formatExt,
}: {
  host: EditorHost
  getConn: () => ConnectionsApi | undefined
  scope: MarkdownScope
  ac: Pick<ConnectionAutocomplete, 'acCtl' | 'setAc'>
  formatExt: Extension
}): Extension => [
  editorHost.of(host),
  inlineSurface(getConn, scope),
  Prec.highest(
    keymap.of([
      ...paneKeys([acCtl]),
      { key: 'Enter', run: whenPaneOpen([acCtl], (c) => c.pick()) },
      { key: 'Tab', run: whenPaneOpen([acCtl], (c) => c.pick()) },
      {
        key: 'Backspace',
        run: (view) => {
          const s = view.state.selection.main
          const scan = docScan(view.state.doc)
          return applyEdit(
            view,
            smartBackspace(scan, s.from, s.to, scope) ??
              autoDelete(scan, s.from, s.to, host.settings()),
            { userEvent: 'delete' },
          )
        },
      },
    ]),
  ),
  formatExt,
  keymap.of(editorKeymap),
  EditorView.domEventHandlers({
    blur: () => {
      setAc(null)
      return false
    },
  }),
  EditorView.updateListener.of((u) => {
    if (u.docChanged || u.selectionSet) detectConnectionQuery(u.view, setAc)
  }),
]
