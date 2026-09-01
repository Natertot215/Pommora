// Typing a page embed into the document — the Embed ▸ Internal Page path. The token lands fenced on its own
// line below the caret's block, and the caret between the brackets so the embed autocomplete takes over.
import type { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { blockAt } from './blockModel'
import { docScan, docString } from './docCache'

/** The fenced insert below a block: blank-separated above and below wherever content adjoins,
 *  reusing the blank lines already standing. `token` is the placed text — a full `![[Title]]`, or
 *  the bare opener when the autocomplete finishes the title. */
export function embedInsertAfter(
  doc: string,
  blockTo: number,
  token: string,
): { from: number; to: number; insert: string; caret: number } {
  const nextLineStart = blockTo + 1
  const nextLineEnd = doc.indexOf('\n', nextLineStart)
  const nextLine = doc.slice(nextLineStart, nextLineEnd === -1 ? doc.length : nextLineEnd)
  const trail = nextLine.trim() === '' ? '' : '\n'
  const lineStart = doc.lastIndexOf('\n', blockTo - 1) + 1
  const curBlank = doc.slice(lineStart, blockTo).trim() === ''
  const prevBlank =
    lineStart === 0 ||
    doc.slice(doc.lastIndexOf('\n', lineStart - 2) + 1, lineStart - 1).trim() === ''
  const lead = curBlank ? (prevBlank ? '' : '\n') : '\n\n'
  const from = curBlank ? lineStart : blockTo
  return {
    from,
    to: blockTo,
    insert: `${lead}${token}${trail}`,
    caret: from + lead.length + token.length,
  }
}

/** Whether the caret already sits where a lone-line embed may be written: a blank line, outside the
 *  regions that would make the token content rather than a construct. This is the placement Paste
 *  As offers its embed forms on. Read off the per-version scan, since it answers on every caret move. */
export function embedSeatAt(state: EditorState): boolean {
  const line = state.doc.lineAt(state.selection.main.from)
  if (line.text.trim() !== '') return false
  const scan = docScan(state.doc)
  if (scan.fences[line.number - 1]) return false
  const holds = (from: number, to: number): boolean => line.from >= from && line.from <= to
  return !scan.maths.some(([f, t]) => holds(f, t)) && !scan.tables.some((r) => holds(r.from, r.to))
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

/** Embed ▸ Webpage: the empty pair with the caret seated inside `()` — the destination guard
 *  keeps a pasted address literal there, and leaving the line forms the tile. */
export function webpageInsertAtCaret(view: EditorView): boolean {
  return insertEmbedToken(view, '![]()', ')'.length)
}
