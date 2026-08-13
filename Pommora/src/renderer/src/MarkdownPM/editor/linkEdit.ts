import { EditorView } from '@codemirror/view'
import type { EditorState, Extension } from '@codemirror/state'
import { aliasSpanAt, emptyAliasPipeAt, type ConnEditAction } from '@shared/connections'
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

/** Enter inside an alias finishes it rather than breaking the line. The picker is bounded to the
 *  title, so nothing else claims this key there and Enter would otherwise split the link in half.
 *  The caret lands past a space for the same reason committing a page does — resting on the closer
 *  keeps the token active, and the link you just named would sit there as raw syntax. */
export function commitAliasOnEnter(view: EditorView): boolean {
  const sel = view.state.selection.main
  if (!sel.empty) return false
  const line = view.state.doc.lineAt(sel.head)
  const span = aliasSpanAt(line.text, sel.head - line.from)
  if (!span) return false
  const tk = tokenize(line.text).find(
    (t) => t.kind === 'wikiLink' && span[0] >= t.range[0] && span[1] <= t.range[1],
  )
  if (!tk) return false
  const end = line.from + tk.range[1]
  const pad = view.state.doc.sliceString(end, end + 1) === ' ' ? '' : ' '
  view.dispatch({
    changes: pad ? { from: end, to: end, insert: pad } : undefined,
    selection: { anchor: end + 1 },
    userEvent: 'input',
  })
  return true
}

/** The absolute offset of the bare `|` of an empty alias on the line holding `at`, or null. */
function emptyPipeNear(state: EditorState, at: number): number | null {
  const pos = Math.min(Math.max(at, 0), state.doc.length)
  const line = state.doc.lineAt(pos)
  const pipe = emptyAliasPipeAt(line.text, pos - line.from)
  return pipe === null ? null : line.from + pipe
}

/** Remove the pipe, having first confirmed it's still the character sitting there. The check is what
 *  makes the call safe to make late: an offset computed one turn and spent the next would otherwise
 *  delete whatever had drifted into it. */
function collapseAt(view: EditorView, at: number): void {
  if (view.state.doc.sliceString(at, at + 1) !== '|') return
  view.dispatch({ changes: { from: at, to: at + 1 } })
}

/** An alias opened and then left empty takes its pipe with it, matching the nexus-wide rule that an
 *  emptied value drops its key rather than persisting an empty container.
 *
 *  It collapses on LEAVING the token, never the moment the alias empties: clearing an alias to
 *  retype it would otherwise pull the pipe out from under the caret mid-edit.
 *
 *  Leaving by losing focus is handled on the `blur` event rather than through the update listener,
 *  and that split is the point. A blur handler runs outside the update cycle, so it can dispatch
 *  straight away; the listener can't, and has to defer to a macrotask that the editor's own teardown
 *  can outrun — which is exactly what blurring often precedes, since clicking another page both
 *  blurs this editor and unmounts it. Deferred, the pipe would reach disk. */
export function collapseEmptyAlias(): Extension {
  return [
    EditorView.domEventHandlers({
      blur(_event, view) {
        const at = emptyPipeNear(view.state, view.state.selection.main.head)
        if (at !== null) collapseAt(view, at)
        return false
      },
    }),
    EditorView.updateListener.of((u) => {
      if (!u.selectionSet) return
      // Read against the NEW document at the OLD caret, mapped forward. Reading the old offset
      // against the new text is what makes typing into a fresh alias look like leaving one.
      const at = emptyPipeNear(u.state, u.changes.mapPos(u.startState.selection.main.head))
      if (at === null) return
      if (u.view.hasFocus && emptyPipeNear(u.state, u.state.selection.main.head) === at) return
      setTimeout(() => collapseAt(u.view, at), 0)
    }),
  ]
}
