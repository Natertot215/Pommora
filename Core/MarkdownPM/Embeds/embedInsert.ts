import type { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { blockAt } from '../Engine/blockModel'
import { inSealedBlockAt } from '../Engine/docScan'
import { lineStartAt } from '../Input/edits'
import { docScan, docString } from '../docCache'

export function embedInsertAfter(
  doc: string,
  blockTo: number,
  token: string,
): { from: number; to: number; insert: string; caret: number } {
  const nextLineStart = blockTo + 1
  const nextLineEnd = doc.indexOf('\n', nextLineStart)
  const nextLine = doc.slice(nextLineStart, nextLineEnd === -1 ? doc.length : nextLineEnd)
  const trail = nextLine.trim() === '' ? '' : '\n'
  const lineStart = lineStartAt(doc, blockTo)
  const curBlank = doc.slice(lineStart, blockTo).trim() === ''
  const prevBlank =
    lineStart === 0 || doc.slice(lineStartAt(doc, lineStart - 1), lineStart - 1).trim() === ''
  const lead = curBlank ? (prevBlank ? '' : '\n') : '\n\n'
  const from = curBlank ? lineStart : blockTo
  return {
    from,
    to: blockTo,
    insert: `${lead}${token}${trail}`,
    caret: from + lead.length + token.length,
  }
}

/** Whether the caret already sits where a lone-line embed may be written. Read off the per-version scan, since it answers on every caret move. */
export function embedSeatAt(state: EditorState): boolean {
  const line = state.doc.lineAt(state.selection.main.from)
  if (line.text.trim() !== '') return false
  return !inSealedBlockAt(docScan(state.doc), line.number - 1)
}

function insertEmbedToken(view: EditorView, token: string, caretBack: number): boolean {
  if (view.state.readOnly) return false
  const doc = docString(view.state.doc)
  const head = view.state.selection.main.head
  const block = blockAt(docScan(view.state.doc), head)
  const after = block ? block.to : view.state.doc.lineAt(head).to
  const c = embedInsertAfter(doc, after, token)
  view.dispatch({
    changes: c,
    selection: { anchor: c.caret - caretBack },
    userEvent: 'input',
    scrollIntoView: true,
  })
  view.focus()
  return true
}

export function embedInsertAtCaret(view: EditorView): boolean {
  return insertEmbedToken(view, '![[]]', ']]'.length)
}

/** The empty pair with the caret seated inside the target: the destination guard keeps a pasted address literal there, and leaving the line forms the tile. */
export function webpageInsertAtCaret(view: EditorView): boolean {
  return insertEmbedToken(view, '![]()', ')'.length)
}
