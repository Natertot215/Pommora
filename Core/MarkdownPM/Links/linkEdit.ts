import { EditorView, type ViewUpdate } from '@codemirror/view'
import {
  type ChangeSpec,
  EditorSelection,
  type EditorState,
  type Extension,
  type Line,
} from '@codemirror/state'
import type { LinkAction } from '../../Actions/connectionMenu'
import {
  decodeLinkTarget,
  escapeLabel,
  markdownLinkAt,
  targetTitle,
  unescapeLabel,
} from '../../Connections/links'
import { linkPaste, shownAlias } from '../../Connections/linkValue'
import type { LinkDisplay } from '../../Properties/properties'
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
import { inCodeAt } from '../Engine/docScan'
import { connectionAt, linkAt } from '../Input/edits'
import { focusRange } from '../caretPlacement'
import { restedOnLink } from './linkReveal'
import { type EditorHost, editorHost } from '../api'
import { drawnLinkAt, inRawHtml } from '../decorations'
import { writeLinkAt } from './pendingTitle'
import { inCaretPane } from '../Menus/caretPane'
import { clamp } from '@pommora/uix/Utilities/clamp'

type LinkEdit =
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
        text: tk.kind === 'link' ? unescapeLabel(text.slice(cs, ce)) : shownConnection(text, tk),
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

/** Past the closer of the link whose alias or label holds `at`: a markdown label, empty or not, lies before its destination. */
function shownEnd(state: EditorState, at: number): number | null {
  const scan = docScan(state.doc)
  if (inCodeAt(scan, at) || inRawHtml(state, at, 'page')) return null
  const line = state.doc.lineAt(at)
  const rel = at - line.from
  const wiki = connectionAt(scan, at)
  if (wiki)
    return wiki.alias && rel >= wiki.alias[0] && rel <= wiki.alias[1]
      ? line.from + wiki.full[1]
      : null
  const md = markdownLinkAt(line.text, rel, 'label')
  return md ? line.from + md.full[1] : null
}

/** The caret lands on the closer with no separating space, since the closer is the one caret position that doesn't reveal the syntax. */
export function commitAliasOnEnter(view: EditorView): boolean {
  const sel = view.state.selection.main
  const end = sel.empty ? shownEnd(view.state, sel.head) : null
  if (end === null) return false
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

// The slot the caret sits in, identified by its start: a wikilink's alias or heading, or a whole markdown link, whose label is written before its destination. Leaving one fires that slot's collapse, never another's.
interface Slot {
  start: number
  end: number
  kind: 'alias' | 'heading' | 'label'
}

function slotNear(state: EditorState, at: number, scope: MarkdownScope): Slot | null {
  const { line, rel } = lineNear(state, at)
  const scan = docScan(state.doc)
  if (inRawHtml(state, line.from + rel, scope) || inCodeAt(scan, line.from + rel)) return null
  const s = connectionAt(scan, line.from + rel)
  if (s) {
    for (const kind of ['alias', 'heading'] as const) {
      const span = s[kind]
      if (span && rel >= span[0] && rel <= span[1])
        return { start: line.from + span[0], end: line.from + span[1], kind }
    }
    return null
  }
  // An image's alt text is its own, and an empty one is meant.
  const md = markdownLinkAt(line.text, rel, 'full')
  if (!md || rel <= md.full[0] || rel >= md.full[1] || line.text[md.full[0] - 1] === '!')
    return null
  return { start: line.from + md.full[0], end: line.from + md.full[1], kind: 'label' }
}

/** An empty alias takes its pipe with it and an empty heading its hash, matching the nexus-wide rule that an emptied value drops its key; a markdown link can't drop its label, so an empty one shows its target — the heading, else the title — as a picked one does. */
function emptied(state: EditorState, at: number, kind: Slot['kind']): ChangeSpec | null {
  const { line, rel } = lineNear(state, at)
  if (kind === 'label') {
    const md = markdownLinkAt(line.text, rel, 'full')
    if (!md || md.label[0] !== md.label[1]) return null
    const heading = md.fragment && decodeLinkTarget(line.text.slice(md.fragment[0], md.fragment[1]))
    const shown = heading || targetTitle(line.text.slice(md.page[0], md.page[1]))
    return shown ? { from: line.from + md.label[0], insert: escapeLabel(shown) } : null
  }
  const s = connectionAt(docScan(state.doc), line.from + rel)
  const span = s?.[kind]
  if (!s || !span || span[0] !== span[1]) return null
  const slot = line.from + (kind === 'alias' ? (s.heading ?? s.title)[1] : span[0] - 1)
  return /[|#]/.test(state.doc.sliceString(slot, slot + 1)) ? { from: slot, to: slot + 1 } : null
}

function collapseSlot(view: EditorView, at: number, kind: Slot['kind'], defer: boolean): void {
  const run = (): void => {
    const changes = emptied(view.state, at, kind)
    if (changes) view.dispatch({ changes })
  }
  if (defer) setTimeout(run, 0)
  else run()
}

interface Written {
  start: number
  end: number
  text: string
}

/** The link of either syntax an offset sits strictly inside: past its closer is where a finished link rests. */
function linkWithin(state: EditorState, at: number, scope: MarkdownScope): Written | null {
  const { line, rel } = lineNear(state, at)
  if (inRawHtml(state, line.from + rel, scope)) return null
  const o = linkAt(docScan(state.doc), line.from + rel)
  if (!o || rel <= o.full[0] || rel >= o.full[1]) return null
  return {
    start: line.from + o.full[0],
    end: line.from + o.full[1],
    text: line.text.slice(o.full[0], o.full[1]),
  }
}

/** A body reaches the memory only where a link is written — typed into or picked, either syntax — and it remembers once the caret leaves that link, against how the link read before, since a scan of bodies can't honor a real forget. A slot collapses only where an edit emptied or opened it, so reading a note never rewrites it, and only on LEAVING it, never as it changes: clearing one to retype would pull the pipe from under the caret. Blur is handled on the event rather than the update listener, whose macrotask the editor's own teardown outruns. */
export function aliasOnLeave(scope: MarkdownScope): Extension {
  let writing: { start: number; was: string } | null = null
  let edited: number | null = null
  const remember = (view: EditorView): void => {
    const w = writing
    writing = null
    if (!w) return
    const link = linkWithin(view.state, w.start + 1, scope)
    const host = view.state.facet(editorHost)
    const api = host.connections()
    const shown = link?.start === w.start && api ? shownAlias(link.text, api.resolve, w.was) : null
    if (shown) void host.aliases.edit(shown.page.id, { op: 'add', alias: shown.alias })
  }
  return [
    EditorView.domEventHandlers({
      blur(event, view) {
        if (inCaretPane(event.relatedTarget)) return false
        remember(view)
        const at = view.state.selection.main.head
        const slot = slotNear(view.state, at, scope)
        if (slot && slot.start === edited) collapseSlot(view, at, slot.kind, false)
        edited = null
        return false
      },
    }),
    EditorView.updateListener.of((u) => {
      if (!u.docChanged && !u.selectionSet) return
      // The NEW document at the OLD caret, mapped forward — reading the old offset against the new text makes typing look like leaving.
      const was = u.changes.mapPos(u.startState.selection.main.head)
      if (writing) writing.start = u.changes.mapPos(writing.start, 1)
      const link = linkWithin(u.state, was, scope)
      if (link && link.start !== writing?.start && typedInto(u, link)) {
        const before = linkWithin(u.startState, u.startState.selection.main.head, scope)
        writing = { start: link.start, was: before?.text ?? '' }
      }
      const head = u.state.selection.main.head
      const left = slotNear(u.state, was, scope)
      const here = slotNear(u.state, head, scope)
      if (edited !== null) edited = u.changes.mapPos(edited)
      for (const slot of [left, here]) if (slot && typedInto(u, slot)) edited = slot.start
      if (!u.selectionSet) return
      if (
        writing &&
        !(u.view.hasFocus && linkWithin(u.state, head, scope)?.start === writing.start)
      )
        remember(u.view)
      if (!left || (u.view.hasFocus && here?.start === left.start)) return
      if (left.start === edited) collapseSlot(u.view, was, left.kind, true)
      edited = null
    }),
  ]
}

function typedInto(u: ViewUpdate, span: { start: number; end: number }): boolean {
  if (!u.transactions.some((tr) => tr.isUserEvent('input') || tr.isUserEvent('delete')))
    return false
  let touched = false
  u.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
    if (fromB <= span.end && toB >= span.start) touched = true
  })
  return touched
}
