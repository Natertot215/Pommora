// Typing a page embed into the document — the Insert ▸ Page path. The token lands fenced on its own
// line below the caret's block, and the caret between the brackets so the embed autocomplete takes over.
import type { EditorView } from '@codemirror/view'
import { blockAt } from './blockModel'
import { docString } from './docCache'

/** The fenced insert below a block: always blank-separated above, and below whenever the next line
 *  holds content. `token` is the placed text — a full `![[Title]]`, or the bare opener when the
 *  autocomplete finishes the title. Returns the change spec plus where the caret lands. */
export function embedInsertAfter(
  doc: string,
  blockTo: number,
  token: string,
): { from: number; to: number; insert: string; caret: number } {
  const nextLineStart = blockTo + 1
  const nextLineEnd = doc.indexOf('\n', nextLineStart)
  const nextLine = doc.slice(nextLineStart, nextLineEnd === -1 ? doc.length : nextLineEnd)
  const trail = nextLine.trim() === '' ? '' : '\n'
  return {
    from: blockTo,
    to: blockTo,
    insert: `\n\n${token}${trail}`,
    caret: blockTo + 2 + token.length,
  }
}

export function embedInsertAtCaret(view: EditorView): boolean {
  if (view.state.readOnly) return false
  const doc = docString(view.state.doc)
  const head = view.state.selection.main.head
  const block = blockAt(doc, head)
  const after = block ? block.to : view.state.doc.lineAt(head).to
  const c = embedInsertAfter(doc, after, '![[]]')
  view.dispatch({
    changes: c,
    selection: { anchor: c.caret - ']]'.length },
    userEvent: 'input',
    scrollIntoView: true,
  })
  view.focus()
  return true
}
