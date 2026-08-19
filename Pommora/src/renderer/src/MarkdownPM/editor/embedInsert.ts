// Typing a page embed into the document — the Embed ▸ Internal Page path. The token lands fenced on its own
// line below the caret's block, and the caret between the brackets so the embed autocomplete takes over.
import type { EditorView } from '@codemirror/view'
import { blockAt } from './blockModel'
import { docString } from './docCache'

/** The fenced insert below a block: blank-separated above and below wherever content adjoins,
 *  reusing the blank lines already standing — a caret on a blank line supplies one fence newline
 *  and takes the token itself, a blank (or the doc's start) above it supplies the other. `token`
 *  is the placed text — a full `![[Title]]`, or the bare opener when the autocomplete finishes
 *  the title. Returns the change spec plus where the caret lands. */
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

function insertEmbedToken(view: EditorView, token: string, caretBack: number): boolean {
  if (view.state.readOnly) return false
  const doc = docString(view.state.doc)
  const head = view.state.selection.main.head
  const block = blockAt(doc, head)
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
