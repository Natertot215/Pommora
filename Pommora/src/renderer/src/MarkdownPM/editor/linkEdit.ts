import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { emptyAliasPipeAt, type ConnEditAction } from '@shared/connections'
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
  // No alias yet: the pipe is what creates one, and the caret lands after it. A pipe already sitting
  // there is an Add Title that was abandoned — reuse it rather than stacking a second.
  const afterTitle = tk.contentRange[1]
  if (line.text[afterTitle] === '|') {
    focusRange(view, at(afterTitle) + 1)
    return
  }
  const pipe = at(afterTitle)
  view.dispatch({ changes: { from: pipe, to: pipe, insert: '|' } })
  focusRange(view, pipe + 1)
}

/** An alias opened and then left empty takes its pipe with it, matching the nexus-wide rule that an
 *  emptied value drops its key rather than persisting an empty container.
 *
 *  It collapses on LEAVING the token, never the moment the alias empties: clearing an alias to
 *  retype it would otherwise pull the pipe out from under the caret mid-edit. Losing focus counts as
 *  leaving. The dispatch is deferred because CM forbids one inside an update listener. */
export function collapseEmptyAlias(): Extension {
  return EditorView.updateListener.of((u) => {
    if (!u.selectionSet && !u.focusChanged) return
    const doc = u.state.doc
    const was = Math.min(u.startState.selection.main.head, doc.length)
    const line = doc.lineAt(was)
    const pipe = emptyAliasPipeAt(line.text, was - line.from)
    if (pipe === null) return
    const now = u.state.selection.main.head
    const stillInside =
      u.view.hasFocus &&
      now >= line.from &&
      now <= line.to &&
      emptyAliasPipeAt(line.text, now - line.from) === pipe
    if (stillInside) return
    const at = line.from + pipe
    setTimeout(() => u.view.dispatch({ changes: { from: at, to: at + 1 } }), 0)
  })
}
