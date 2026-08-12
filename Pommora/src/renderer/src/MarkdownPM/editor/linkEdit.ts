import type { EditorView } from '@codemirror/view'
import type { ConnEditAction } from '@shared/connections'
import { tokenize } from '../tokens'
import { focusRange } from './input'

/** The two authoring gestures, both seating the caret where their names imply. They work off the
 *  token's own spans rather than the rendered text: a displayed alias hides where the title is, so
 *  the only thing that still knows both is the token. */
export function applyLinkAction(
  view: EditorView,
  action: ConnEditAction,
  range: [number, number],
): void {
  const line = view.state.doc.lineAt(range[0])
  const tk = tokenize(line.text).find(
    (t) => t.kind === 'wikiLink' && line.from + t.range[0] === range[0],
  )
  if (!tk) return
  const at = (n: number): number => line.from + n

  // Edit Link targets the page pointed at — the title's last character, ahead of any alias.
  if (action === 'editLink') {
    const [, titleEnd] = tk.resolveRange ?? tk.contentRange
    focusRange(view, at(titleEnd))
    return
  }

  // Rename targets the words shown. An existing alias is selected so typing replaces it.
  if (tk.resolveRange) {
    focusRange(view, at(tk.contentRange[0]), at(tk.contentRange[1]))
    return
  }
  // No alias yet: the pipe is what creates one, and the caret lands after it.
  const pipe = at(tk.contentRange[1])
  view.dispatch({ changes: { from: pipe, to: pipe, insert: '|' } })
  focusRange(view, pipe + 1)
}
