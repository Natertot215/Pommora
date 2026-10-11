import { EditorView, type ViewUpdate } from '@codemirror/view'
import { EditorSelection, type EditorState, type Extension, type Line } from '@codemirror/state'
import type { LinkSpans } from '../../Connections/connections'
import type { LinkAction } from '../../Actions/connectionMenu'
import { unescapeAlias } from '../../Connections/links'
import { linkPaste } from '../../Connections/linkValue'
import type { LinkDisplay } from '../../Properties/properties'
import { titleTarget, type ConnectionsApi } from './connectionsApi'
import type { MarkdownScope } from '../Engine/detect'
import {
  aliasedToken,
  headingOf,
  type LinkKind,
  linkAddress,
  linkTarget,
  type TokenOf,
} from '../Engine/tokens'
import { docScan, docString } from '../docCache'
import { connectionAt } from '../Input/edits'
import { focusRange } from '../caretPlacement'
import { restedOnLink } from './linkReveal'
import { type EditorHost, editorHost } from '../api'
import { drawnLinkAt, inRawHtml } from '../decorations'
import { writeLinkAt } from './pendingTitle'
import { clamp } from '@pommora/uix/Utilities/clamp'

export type LinkEdit =
  | { kind: 'select'; range: [number, number] }
  | { kind: 'write'; from: number; to: number; text: string; awaits?: string; select?: number }

function shownConnection(text: string, tk: TokenOf<'wikiLink'>): string {
  const heading = aliasedToken(tk) ? undefined : headingOf(text, tk)
  if (!heading) return text.slice(tk.contentRange[0], tk.contentRange[1])
  const title = text.slice(tk.resolveRange[0], tk.resolveRange[1])
  return title ? `${title} § ${heading}` : heading
}

export function linkEdit(
  text: string,
  tk: TokenOf<LinkKind>,
  action: LinkAction,
  titles: Pick<EditorHost['linkTitles'], 'get'>,
): LinkEdit | null {
  const [s, e] = tk.range
  const [cs, ce] = tk.contentRange
  switch (action) {
    case 'rename': {
      if (tk.kind === 'link' || aliasedToken(tk)) return { kind: 'select', range: [cs, ce] }
      const slot = tk.range[1] - 2
      if (text[slot - 1] === '|') return { kind: 'select', range: [slot, slot] }
      return { kind: 'write', from: slot, to: slot, text: '|', select: slot + 1 }
    }
    case 'editLink':
      return { kind: 'select', range: tk.kind === 'link' ? linkAddress(tk) : tk.resolveRange }
    case 'link:remove':
      return {
        kind: 'write',
        from: s,
        to: e,
        text: tk.kind === 'link' ? unescapeAlias(text.slice(cs, ce)) : shownConnection(text, tk),
      }
    case 'link:delete':
      return { kind: 'write', from: s, to: e, text: '' }
    case 'format:link-full':
      return tk.kind === 'link' ? formatted(text, tk, 'link-full', titles) : null
    case 'format:link-short':
      return tk.kind === 'link' ? formatted(text, tk, 'link-short', titles) : null
    case 'format:link-title':
      return tk.kind === 'link' ? formatted(text, tk, 'link-title', titles) : null
    default:
      return null
  }
}

function formatted(
  text: string,
  tk: TokenOf<'link'>,
  display: LinkDisplay,
  titles: Pick<EditorHost['linkTitles'], 'get'>,
): LinkEdit {
  const url = linkTarget(text, tk)
  const write = linkPaste(url, display, titles.get(url) ?? undefined)
  return {
    kind: 'write',
    from: tk.range[0],
    to: tk.range[1],
    text: write.text,
    awaits: write.awaits,
  }
}

export function applyLinkAction(
  view: EditorView,
  action: LinkAction,
  range: [number, number],
): void {
  const tk = drawnLinkAt(view, range[0])
  if (!tk || tk.range[0] !== range[0]) return
  const edit = linkEdit(
    docString(view.state.doc),
    tk,
    action,
    view.state.facet(editorHost).linkTitles,
  )
  if (!edit) return
  if (edit.kind === 'select') {
    focusRange(view, edit.range[0], edit.range[1])
    return
  }
  view.focus()
  writeLinkAt(view, edit.from, edit.to, edit, 'input')
  if (edit.select !== undefined) focusRange(view, edit.select, edit.select)
}

/** The caret lands on the closer with no separating space, since the closer is the one caret position that doesn't reveal the syntax. */
export function commitAliasOnEnter(view: EditorView): boolean {
  const sel = view.state.selection.main
  if (!sel.empty) return false
  const line = view.state.doc.lineAt(sel.head)
  const rel = sel.head - line.from
  const link = connectionAt(docScan(view.state.doc), sel.head)
  if (!link?.alias || rel < link.alias[0] || rel > link.alias[1]) return false
  if (inRawHtml(view.state, sel.head, 'page')) return false
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
  const target = titleTarget(api, line.text.slice(s.title[0], s.title[1]))
  // A phantom or ambiguous title names no single page, and the memory is keyed by page id.
  if (target.kind === 'page') view.state.facet(editorHost).aliases.remember(target.page.id, alias)
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

function slotNear(state: EditorState, at: number, scope: MarkdownScope): Slot | null {
  const { line, rel } = lineNear(state, at)
  if (inRawHtml(state, line.from + rel, scope)) return null
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
export function aliasOnLeave(scope: MarkdownScope): Extension {
  let authored: number | null = null
  const leave = (view: EditorView, at: number, slot: Slot, defer: boolean): void => {
    const api = authored === slot.start ? view.state.facet(editorHost).connections() : undefined
    leaveSlot(view, api, at, slot.kind, defer)
    authored = null
  }
  return [
    EditorView.domEventHandlers({
      blur(_event, view) {
        const at = view.state.selection.main.head
        const slot = slotNear(view.state, at, scope)
        if (slot) leave(view, at, slot, false)
        return false
      },
    }),
    EditorView.updateListener.of((u) => {
      if (!u.docChanged && !u.selectionSet) return
      // The NEW document at the OLD caret, mapped forward — reading the old offset against the new text makes typing look like leaving.
      const was = u.changes.mapPos(u.startState.selection.main.head)
      const left = slotNear(u.state, was, scope)
      if (authored !== null) authored = u.changes.mapPos(authored)
      if (left?.kind === 'alias' && typedInto(u, left)) authored = left.start
      if (!u.selectionSet || left === null) return
      if (
        u.view.hasFocus &&
        slotNear(u.state, u.state.selection.main.head, scope)?.start === left.start
      )
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
