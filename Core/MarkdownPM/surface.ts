import { EditorView, keymap } from '@codemirror/view'
import { type Extension, Prec } from '@codemirror/state'
import type { MarkdownScope } from './Engine/detect'
import type { ConnectionsApi } from './Links/connectionsApi'
import { markdownDecorations } from './decorations'
import { listDragExtension } from './Gestures/listDrag'
import { blockDragExtension } from './Gestures/blockDrag'
import { linkRest, linkTyping } from './Gestures/linkGestures'
import { listRenumberOnDelete } from './Input/listRenumber'
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

/** Everything a page body and a table cell share: inline rendering, list and block gestures, link and footnote pointers, the paste and alias rules, typing, and the right-click menu. The two surfaces differ only in what wraps this. */
export const inlineSurface = (
  getConn: () => ConnectionsApi | undefined,
  scope: MarkdownScope,
): Extension => [
  markdownDecorations(getConn, scope),
  listDragExtension,
  listRenumberOnDelete(scope),
  blockHandles(scope),
  pointerReveal(scope),
  blockDragExtension,
  gripMenu,
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
