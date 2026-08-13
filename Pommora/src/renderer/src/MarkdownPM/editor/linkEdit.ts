import { EditorView } from '@codemirror/view'
import type { EditorState, Extension, Line } from '@codemirror/state'
import { aliasSpanAt, emptyAliasPipeAt, linkAt, type ConnEditAction } from '@shared/connections'
import { useSession } from '../../store'
import type { ConnectionsApi } from '../connections'
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

/** The line holding `at` and the offset into it. Every gesture below reads through this because each
 *  spends an offset computed a turn earlier, which the document may since have shrunk past. */
function lineNear(state: EditorState, at: number): { line: Line; rel: number } {
  const pos = Math.min(Math.max(at, 0), state.doc.length)
  const line = state.doc.lineAt(pos)
  return { line, rel: pos - line.from }
}

/** The absolute offset of the bare `|` of an empty alias on the line holding `at`, or null. */
function emptyPipeNear(state: EditorState, at: number): number | null {
  const { line, rel } = lineNear(state, at)
  const pipe = emptyAliasPipeAt(line.text, rel)
  return pipe === null ? null : line.from + pipe
}

/** Put a written alias into its target page's memory, so it can be offered back the next time that
 *  page is linked. Authoring is the only moment the memory is written: a body scan can't honour a
 *  real forget, and there is no other point at which the words are known to be finished. */
function rememberAliasNear(view: EditorView, api: ConnectionsApi | undefined, at: number): void {
  if (!api) return
  const { line, rel } = lineNear(view.state, at)
  const s = linkAt(line.text, rel)
  if (!s?.alias) return
  const alias = line.text.slice(s.alias[0], s.alias[1])
  if (!alias.trim()) return
  const res = api.resolve(line.text.slice(s.title[0], s.title[1]))
  // Only a page that exists can be said to have worn the words. A phantom or an ambiguous title
  // names no single page, and the memory is keyed by PageID.
  if (res.status === 'resolved' && res.page) useSession.getState().rememberAlias(res.page.id, alias)
}

/** Remove the pipe, having first confirmed it's still the character sitting there. The check is what
 *  makes the call safe to make late: an offset computed one turn and spent the next would otherwise
 *  delete whatever had drifted into it. */
function collapseAt(view: EditorView, at: number): void {
  if (view.state.doc.sliceString(at, at + 1) !== '|') return
  view.dispatch({ changes: { from: at, to: at + 1 } })
}

/** Which alias the caret is in, as that alias's absolute start — the identity both gestures below
 *  compare against to tell editing an alias from having finished with it. */
function aliasStartNear(state: EditorState, at: number): number | null {
  const { line, rel } = lineNear(state, at)
  const span = aliasSpanAt(line.text, rel)
  return span ? line.from + span[0] : null
}

/** Everything that happens when the caret leaves an alias: an empty one takes its pipe with it,
 *  matching the nexus-wide rule that an emptied value drops its key rather than persisting an empty
 *  container, and a written one is remembered against the page it names. */
function leaveAlias(
  view: EditorView,
  api: ConnectionsApi | undefined,
  at: number,
  defer: boolean,
): void {
  const pipe = emptyPipeNear(view.state, at)
  if (pipe === null) rememberAliasNear(view, api, at)
  else if (defer) setTimeout(() => collapseAt(view, pipe), 0)
  else collapseAt(view, pipe)
}

/** Both gestures fire on LEAVING the alias, never the moment it changes: clearing one to retype it
 *  would otherwise pull the pipe out from under the caret, and every keystroke would be remembered
 *  as its own name for the page.
 *
 *  Leaving by losing focus is handled on the `blur` event rather than through the update listener,
 *  and that split is the point. A blur handler runs outside the update cycle, so it can dispatch
 *  straight away; the listener can't, and has to defer to a macrotask that the editor's own teardown
 *  can outrun — which is exactly what blurring often precedes, since clicking another page both
 *  blurs this editor and unmounts it. Deferred, an abandoned pipe would reach disk. */
export function aliasOnLeave(getApi: () => ConnectionsApi | undefined): Extension {
  return [
    EditorView.domEventHandlers({
      blur(_event, view) {
        // The same predicate the listener uses. Without it, blurring anywhere inside a link would
        // remember an alias nobody just authored — including one that came in with a paste.
        const at = view.state.selection.main.head
        if (aliasStartNear(view.state, at) !== null) leaveAlias(view, getApi(), at, false)
        return false
      },
    }),
    EditorView.updateListener.of((u) => {
      if (!u.selectionSet) return
      // Read against the NEW document at the OLD caret, mapped forward. Reading the old offset
      // against the new text is what makes typing into a fresh alias look like leaving one.
      const was = u.changes.mapPos(u.startState.selection.main.head)
      const left = aliasStartNear(u.state, was)
      if (left === null) return
      if (u.view.hasFocus && aliasStartNear(u.state, u.state.selection.main.head) === left) return
      leaveAlias(u.view, getApi(), was, true)
    }),
  ]
}
