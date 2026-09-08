import { EditorView } from '@codemirror/view'
import { EditorSelection, type EditorState, type Extension, type Line } from '@codemirror/state'
import { aliasSpanAt, emptyAliasPipeAt, linkAt } from '@pommora/core/Connections/connections'
import type { ConnEditAction } from '@pommora/core/Actions/connectionMenu'
import type { ConnectionsApi } from './connectionsApi'
import { tokenize, type Token } from '../Engine/tokens'
import { focusRange } from '../caretPlacement'
import { restedOnLink } from '../Gestures/linkGestures'
import { editorHost } from '../api'
import { clamp } from '@pommora/uix/Utilities/clamp'

/** Pure of any editor, because a connection in a resting table cell has none. Reads the token's spans, since a displayed alias hides where the title is. */
export function wikiAuthorTarget(
  text: string,
  tk: Token,
  action: ConnEditAction,
): { pipeAt?: number; select: [number, number] } {
  if (action === 'editLink') {
    const [, titleEnd] = tk.resolveRange ?? tk.contentRange
    return { select: [titleEnd, titleEnd] }
  }
  if (tk.resolveRange) return { select: [tk.contentRange[0], tk.contentRange[1]] }
  // A pipe already sitting there is an Add Title that was abandoned — reuse it rather than stacking a second.
  const afterTitle = tk.contentRange[1]
  const seat: [number, number] = [afterTitle + 1, afterTitle + 1]
  return text[afterTitle] === '|' ? { select: seat } : { pipeAt: afterTitle, select: seat }
}

export function applyLinkAction(
  view: EditorView,
  action: ConnEditAction,
  range: [number, number],
): void {
  // The span was captured before a native menu opened, and `lineAt` throws past the document's end rather than clamping — the throw would land unhandled inside the menu's promise.
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

/** The caret lands on the closer with no separating space, since the closer is the one caret position that doesn't reveal the syntax. */
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

/** Every gesture below spends an offset computed a turn earlier, which the document may since have shrunk past. */
function lineNear(state: EditorState, at: number): { line: Line; rel: number } {
  const pos = clamp(at, 0, state.doc.length)
  const line = state.doc.lineAt(pos)
  return { line, rel: pos - line.from }
}

function emptyPipeNear(state: EditorState, at: number): number | null {
  const { line, rel } = lineNear(state, at)
  const pipe = emptyAliasPipeAt(line.text, rel)
  return pipe === null ? null : line.from + pipe
}

/** Authoring is the only moment the memory is written: a body scan can't honor a real forget. */
function rememberAliasNear(view: EditorView, api: ConnectionsApi | undefined, at: number): void {
  if (!api) return
  const { line, rel } = lineNear(view.state, at)
  const s = linkAt(line.text, rel)
  if (!s?.alias) return
  const alias = line.text.slice(s.alias[0], s.alias[1])
  if (!alias.trim()) return
  const res = api.resolve(line.text.slice(s.title[0], s.title[1]))
  // A phantom or ambiguous title names no single page, and the memory is keyed by page id.
  if (res.status === 'resolved' && res.page)
    view.state.facet(editorHost).aliases.remember(res.page.id, alias)
}

function collapseAt(view: EditorView, at: number): void {
  if (view.state.doc.sliceString(at, at + 1) !== '|') return
  view.dispatch({ changes: { from: at, to: at + 1 } })
}

function aliasStartNear(state: EditorState, at: number): number | null {
  const { line, rel } = lineNear(state, at)
  const span = aliasSpanAt(line.text, rel)
  return span ? line.from + span[0] : null
}

/** An empty alias takes its pipe with it, matching the nexus-wide rule that an emptied value drops its key. */
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

/** Both fire on LEAVING the alias, never as it changes: clearing one to retype would pull the pipe from under the caret. Blur is handled on the event rather than the update listener, whose macrotask the editor's own teardown outruns. */
export function aliasOnLeave(getApi: () => ConnectionsApi | undefined): Extension {
  return [
    EditorView.domEventHandlers({
      blur(_event, view) {
        // The same predicate the listener uses, or blurring anywhere inside a link would remember an alias nobody authored.
        const at = view.state.selection.main.head
        if (aliasStartNear(view.state, at) !== null) leaveAlias(view, getApi(), at, false)
        return false
      },
    }),
    EditorView.updateListener.of((u) => {
      if (!u.selectionSet) return
      // The NEW document at the OLD caret, mapped forward — reading the old offset against the new text makes typing look like leaving.
      const was = u.changes.mapPos(u.startState.selection.main.head)
      const left = aliasStartNear(u.state, was)
      if (left === null) return
      if (u.view.hasFocus && aliasStartNear(u.state, u.state.selection.main.head) === left) return
      leaveAlias(u.view, getApi(), was, true)
    }),
  ]
}
