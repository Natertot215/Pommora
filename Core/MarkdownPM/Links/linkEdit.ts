import { EditorView, type ViewUpdate } from '@codemirror/view'
import { EditorSelection, type EditorState, type Extension, type Line } from '@codemirror/state'
import type { LinkSpans } from '../../Connections/connections'
import type { ConnEditAction } from '../../Actions/connectionMenu'
import type { ConnectionsApi } from './connectionsApi'
import { aliasedToken, type TokenOf } from '../Engine/tokens'
import { docScan, docString } from '../docCache'
import { spanAt } from '../Engine/docScan'
import { connectionAt } from '../Input/edits'
import { focusRange } from '../caretPlacement'
import { restedOnLink } from './linkReveal'
import { editorHost } from '../api'
import { drawnLinkAt } from '../decorations'
import { clamp } from '@pommora/uix/Utilities/clamp'

/** Pure of any editor, because a connection in a resting table cell has none. Reads the token's spans, since a displayed alias hides where the title is. */
export function wikiAuthorTarget(
  text: string,
  tk: TokenOf<'wikiLink'>,
  action: ConnEditAction,
): { pipeAt?: number; select: [number, number] } {
  if (action === 'editLink') {
    const [, titleEnd] = tk.resolveRange
    return { select: [titleEnd, titleEnd] }
  }
  if (aliasedToken(tk)) return { select: [tk.contentRange[0], tk.contentRange[1]] }
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
  const tk = drawnLinkAt(view, range[0], 'wikiLink')
  if (!tk || tk.range[0] !== range[0]) return
  const { pipeAt, select } = wikiAuthorTarget(docString(view.state.doc), tk, action)
  if (pipeAt !== undefined) view.dispatch({ changes: { from: pipeAt, to: pipeAt, insert: '|' } })
  focusRange(view, select[0], select[1])
}

/** The caret lands on the closer with no separating space, since the closer is the one caret position that doesn't reveal the syntax. */
export function commitAliasOnEnter(view: EditorView): boolean {
  const sel = view.state.selection.main
  if (!sel.empty) return false
  const line = view.state.doc.lineAt(sel.head)
  const rel = sel.head - line.from
  const scan = docScan(view.state.doc)
  const link = connectionAt(scan, sel.head)
  if (!link?.alias || rel < link.alias[0] || rel > link.alias[1]) return false
  // An HTML block HTML Formatting draws raw holds no live link.
  if (view.state.facet(editorHost).settings().htmlFormatting && spanAt(scan.html, sel.head))
    return false
  const end = line.from + link.full[1]
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

/** Authoring is the only moment the memory is written: a body scan can't honor a real forget. */
function rememberAlias(
  view: EditorView,
  api: ConnectionsApi | undefined,
  line: Line,
  s: LinkSpans,
): void {
  const alias = s.alias && line.text.slice(s.alias[0], s.alias[1])
  if (!api || !alias?.trim()) return
  const res = api.resolve(line.text.slice(s.title[0], s.title[1]))
  // A phantom or ambiguous title names no single page, and the memory is keyed by page id.
  if (res.status === 'resolved' && res.page)
    view.state.facet(editorHost).aliases.remember(res.page.id, alias)
}

function collapseAt(view: EditorView, at: number): void {
  if (!/[|#]/.test(view.state.doc.sliceString(at, at + 1))) return
  view.dispatch({ changes: { from: at, to: at + 1 } })
}

// The slot the caret sits in, alias or heading, identified by its start: leaving one fires that slot's collapse or the alias memory, never the other slot's.
interface Slot {
  start: number
  end: number
  kind: 'alias' | 'heading'
}

function slotNear(state: EditorState, at: number): Slot | null {
  const { line, rel } = lineNear(state, at)
  const s = connectionAt(docScan(state.doc), line.from + rel)
  for (const kind of ['alias', 'heading'] as const) {
    const span = s?.[kind]
    if (span && rel >= span[0] && rel <= span[1])
      return { start: line.from + span[0], end: line.from + span[1], kind }
  }
  return null
}

/** An empty alias takes its pipe with it, and an empty heading its hash, matching the nexus-wide rule that an emptied value drops its key. */
function leaveSlot(
  view: EditorView,
  api: ConnectionsApi | undefined,
  at: number,
  kind: Slot['kind'],
  defer: boolean,
): void {
  const { line, rel } = lineNear(view.state, at)
  const s = connectionAt(docScan(view.state.doc), line.from + rel)
  const span = s?.[kind]
  if (!s || !span) return
  if (span[0] !== span[1]) {
    if (kind === 'alias') rememberAlias(view, api, line, s)
    return
  }
  const slot = line.from + (kind === 'alias' ? (s.heading ?? s.title)[1] : span[0] - 1)
  if (defer) setTimeout(() => collapseAt(view, slot), 0)
  else collapseAt(view, slot)
}

/** Both fire on LEAVING the alias, never as it changes: clearing one to retype would pull the pipe from under the caret. Blur is handled on the event rather than the update listener, whose macrotask the editor's own teardown outruns. */
export function aliasOnLeave(getApi: () => ConnectionsApi | undefined): Extension {
  let authored: number | null = null
  const leave = (view: EditorView, at: number, slot: Slot, defer: boolean): void => {
    leaveSlot(view, authored === slot.start ? getApi() : undefined, at, slot.kind, defer)
    authored = null
  }
  return [
    EditorView.domEventHandlers({
      blur(_event, view) {
        const at = view.state.selection.main.head
        const slot = slotNear(view.state, at)
        if (slot) leave(view, at, slot, false)
        return false
      },
    }),
    EditorView.updateListener.of((u) => {
      if (!u.docChanged && !u.selectionSet) return
      // The NEW document at the OLD caret, mapped forward — reading the old offset against the new text makes typing look like leaving.
      const was = u.changes.mapPos(u.startState.selection.main.head)
      const left = slotNear(u.state, was)
      if (authored !== null) authored = u.changes.mapPos(authored)
      if (left?.kind === 'alias' && typedInto(u, left)) authored = left.start
      if (!u.selectionSet || left === null) return
      if (u.view.hasFocus && slotNear(u.state, u.state.selection.main.head)?.start === left.start)
        return
      leave(u.view, was, left, true)
    }),
  ]
}

function typedInto(u: ViewUpdate, slot: Slot): boolean {
  if (!u.transactions.some((tr) => tr.isUserEvent('input') || tr.isUserEvent('delete')))
    return false
  let touched = false
  u.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
    if (fromB <= slot.end && toB >= slot.start) touched = true
  })
  return touched
}
