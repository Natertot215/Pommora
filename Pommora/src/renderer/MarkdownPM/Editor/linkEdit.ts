import { EditorView } from '@codemirror/view'
import { EditorSelection, type EditorState, type Extension, type Line } from '@codemirror/state'
import { aliasSpanAt, emptyAliasPipeAt, linkAt } from '@shared/connections'
import type { ConnEditAction } from '@shared/connMenu'
import { useSession } from '../../store'
import type { ConnectionsApi } from '../Connections'
import { tokenize, type Token } from '../Tokens'
import { focusRange } from './caretSeat'
import { restedOnLink } from './linkGestures'

/** Pure of any editor, because a connection in a resting table cell has none — that cell commits the
 *  pipe and enters with the same span selected. It reads the token's spans rather than the rendered
 *  text: a displayed alias hides where the title is, so only the token still knows both. */
export function wikiAuthorTarget(
  text: string,
  tk: Token,
  action: ConnEditAction,
): { pipeAt?: number; select: [number, number] } {
  // Edit Link targets the page pointed at — the title's last character, ahead of any alias.
  if (action === 'editLink') {
    const [, titleEnd] = tk.resolveRange ?? tk.contentRange
    return { select: [titleEnd, titleEnd] }
  }
  // Rename targets the words shown. An existing alias is selected so typing replaces it.
  if (tk.resolveRange) return { select: [tk.contentRange[0], tk.contentRange[1]] }
  // No alias yet: the pipe is what creates one, and the caret lands after it. A pipe already sitting
  // there is an Add Title that was abandoned — reuse it rather than stacking a second.
  const afterTitle = tk.contentRange[1]
  const seat: [number, number] = [afterTitle + 1, afterTitle + 1]
  return text[afterTitle] === '|' ? { select: seat } : { pipeAt: afterTitle, select: seat }
}

/** The two authoring gestures, both seating the caret where their names imply. */
export function applyLinkAction(
  view: EditorView,
  action: ConnEditAction,
  range: [number, number],
): void {
  // The span was captured before a native menu opened, which can be held open indefinitely.
  // `lineAt` throws past the document's end rather than clamping, and the throw would land
  // unhandled inside the menu's promise.
  if (range[0] > view.state.doc.length) return
  const line = view.state.doc.lineAt(range[0])
  const tk = tokenize(line.text).find(
    (t) => t.kind === 'wikiLink' && line.from + t.range[0] === range[0],
  )
  if (!tk) return
  const at = (n: number): number => line.from + n
  const { pipeAt, select } = wikiAuthorTarget(line.text, tk, action)
  if (pipeAt !== undefined)
    view.dispatch({ changes: { from: at(pipeAt), to: at(pipeAt), insert: '|' } })
  focusRange(view, at(select[0]), at(select[1]))
}

/** Enter inside an alias finishes it rather than breaking the line. The caret lands on the closer
 *  with no space written to separate them, since the closer is the one caret position that doesn't
 *  reveal a connection's syntax (see `activeTokenIndices`). */
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
  view.dispatch({
    selection: EditorSelection.cursor(end, 1),
    effects: restedOnLink.of(end),
  })
  view.focus()
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

/** Authoring is the only moment the memory is written: a body scan can't honor a real forget, and
 *  there is no other point at which the words are known to be finished. */
function rememberAliasNear(view: EditorView, api: ConnectionsApi | undefined, at: number): void {
  if (!api) return
  const { line, rel } = lineNear(view.state, at)
  const s = linkAt(line.text, rel)
  if (!s?.alias) return
  const alias = line.text.slice(s.alias[0], s.alias[1])
  if (!alias.trim()) return
  const res = api.resolve(line.text.slice(s.title[0], s.title[1]))
  // Only a page that exists can be said to have worn the words. A phantom or an ambiguous title
  // names no single page, and the memory is keyed by page id.
  if (res.status === 'resolved' && res.page) useSession.getState().rememberAlias(res.page.id, alias)
}

/** Confirms it's still the character sitting there — the check is what makes the call safe to make
 *  late, since an offset computed one turn and spent the next would otherwise delete whatever had
 *  drifted into it. */
function collapseAt(view: EditorView, at: number): void {
  if (view.state.doc.sliceString(at, at + 1) !== '|') return
  view.dispatch({ changes: { from: at, to: at + 1 } })
}

/** The identity both gestures below compare against to tell editing an alias from having finished
 *  with it. */
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

/** Both gestures fire on leaving the alias, never the moment it changes: clearing one to retype it
 *  would otherwise pull the pipe out from under the caret, and every keystroke would be remembered
 *  as its own name for the page.
 *
 *  Leaving by losing focus is handled on the `blur` event rather than through the update listener: a
 *  blur handler runs outside the update cycle and can dispatch straight away, while the listener has
 *  to defer to a macrotask the editor's own teardown can outrun — exactly what blurring often
 *  precedes, since clicking another page both blurs this editor and unmounts it. Deferred, an
 *  abandoned pipe would reach disk. */
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
