import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import { type ChangeSpec, EditorSelection, type EditorState } from '@codemirror/state'
import type { LinkAction } from '../../Actions/connectionMenu'
import { escapeLabel, unescapeLabel } from '../../Connections/links'
import { targetSpan } from '../../Connections/connections'
import {
  linkPaste,
  pageLabel,
  readOccurrence,
  resolveLink,
  shownAlias,
} from '../../Connections/linkValue'
import type { PageIndex } from '../../Connections/pageIndex'
import type { LinkDisplay } from '../../Properties/properties'
import type { MarkdownScope } from '../Engine/detect'
import { aliasedToken, headingOf, type LinkKind, type TokenOf } from '../Engine/tokens'
import type { Span } from '../Engine/markdownCode'
import { docScan, docString } from '../docCache'
import { linkAt, slotAt } from '../Input/edits'
import { focusRange } from '../caretPlacement'
import { linkSettled, linkWithin, linkWriting, restedOnLink, type Writing } from './linkReveal'
import { type EditorHost, editorHost, inRawHtml } from '../api'
import { drawnLinkAt } from '../decorations'
import { writeLinkAt } from './pendingTitle'
import { inCaretPane } from '../Menus/caretPane'

type LinkEdit =
  | { kind: 'select'; range: Span }
  | { kind: 'write'; from: number; to: number; text: string; awaits?: string; select?: number }

function shownConnection(text: string, tk: TokenOf<'wikiLink'>): string {
  const heading = aliasedToken(tk) ? undefined : headingOf(text, tk)
  if (!heading) return text.slice(tk.contentRange[0], tk.contentRange[1])
  const title = text.slice(...tk.link.title)
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
      const { shown } = tk.link
      if (shown !== null) return { kind: 'select', range: [shown[0], shown[0]] }
      const slot = targetSpan(tk.link)[1]
      return { kind: 'write', from: slot, to: slot, text: '|', select: slot + 1 }
    }
    case 'editLink':
      return { kind: 'select', range: tk.kind === 'link' ? targetSpan(tk.link) : tk.link.title }
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
  const url = text.slice(...targetSpan(tk.link))
  const write = linkPaste(url, display, titles.get(url) ?? undefined)
  return {
    kind: 'write',
    from: tk.range[0],
    to: tk.range[1],
    text: write.text,
    awaits: write.awaits,
  }
}

export function applyLinkAction(view: EditorView, action: LinkAction, range: Span): void {
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

/** Past the closer of the live link whose alias or label holds `at`: the one question Return, a typed `]`, and a typed `[` ask. */
export function shownEnd(state: EditorState, at: number, scope: MarkdownScope): number | null {
  if (inRawHtml(state, at, scope)) return null
  const s = slotAt(docScan(state.doc), at)
  return s?.part === 'shown' ? s.from + s.link.full[1] : null
}

/** The caret lands on the closer with no separating space, since the closer is the one caret position that doesn't reveal the syntax. */
export const commitAliasOnEnter =
  (scope: MarkdownScope) =>
  (view: EditorView): boolean => {
    const sel = view.state.selection.main
    const end = sel.empty ? shownEnd(view.state, sel.head, scope) : null
    if (end === null) return false
    view.dispatch({
      selection: EditorSelection.cursor(end, 1),
      effects: restedOnLink.of(end),
    })
    view.focus()
    return true
  }

/** Every empty part of the link at `start`: an empty alias takes its pipe and an empty heading its hash, matching the nexus-wide rule that an emptied value drops its key; a markdown link can't drop its label, so an empty one shows the label the draw gives it, as a picked one does, and an emptied address label stays empty, since an address has none. */
function emptied(state: EditorState, start: number, index: PageIndex | undefined): ChangeSpec[] {
  const line = state.doc.lineAt(start)
  const o = linkAt(docScan(state.doc), start + 1)
  if (!o || line.from + o.full[0] !== start) return []
  const empty = (s: Span | null): s is Span => s !== null && s[0] === s[1]
  if (o.syntax === 'wiki')
    return [
      ...(empty(o.heading)
        ? [{ from: line.from + o.heading[0] - 1, to: line.from + o.heading[1] }]
        : []),
      ...(empty(o.shown)
        ? [{ from: line.from + targetSpan(o)[1], to: line.from + o.shown[1] }]
        : []),
    ]
  if (!empty(o.shown)) return []
  const written = readOccurrence(line.text, o)
  const label = pageLabel(written, resolveLink(written, index))
  return label ? [{ from: line.from + o.shown[0], insert: escapeLabel(label) }] : []
}

/** A body reaches the memory only where a link is written, typed into or picked, either syntax, and it remembers once the caret leaves that link, against how the link read before, since a scan of bodies can't honor a real forget. Its emptied parts collapse then too, so reading a note never rewrites it and clearing a slot to retype never pulls the pipe from under the caret: the collapse is deferred and stands down if the caret is back in the link when it runs. The field clears only when the collapse lands, so `settling` holds the link already being settled and a second leave of it before then settles nothing. Blur settles on the event and unmount through `flush`, since the editor's own teardown outruns a deferred dispatch; `remembers` is false for the Link field's instance, whose write layer owns its memory. */
export const linkSettle = ViewPlugin.define(
  (view, { scope, remembers }: { scope: MarkdownScope; remembers: boolean }) => {
    let settling: number | null = null
    const holds = (start: number): boolean =>
      view.hasFocus &&
      linkWithin(docScan(view.state.doc), view.state.selection.main.head)?.start === start
    const remember = (w: Writing): void => {
      const link = linkWithin(docScan(view.state.doc), w.start + 1)
      const host = view.state.facet(editorHost)
      const api = host.connections()
      const shown = link?.start === w.start && api ? shownAlias(link.text, api.index, w.was) : null
      if (shown) void host.aliases.edit(shown.page.id, { op: 'add', alias: shown.alias })
    }
    const settle = (w: Writing, defer: boolean): void => {
      if (settling === w.start && defer) return
      const html = inRawHtml(view.state, w.start, scope)
      if (settling !== w.start && remembers && !html) remember(w)
      settling = w.start
      const collapse = (): void => {
        if (settling === w.start) settling = null
        if (defer && holds(w.start)) return
        const armed = view.state.field(linkWriting)?.start === w.start
        const index = view.state.facet(editorHost).connections()?.index
        view.dispatch({
          changes: html ? [] : emptied(view.state, w.start, index),
          effects: armed ? linkSettled.of(null) : [],
        })
      }
      if (defer) setTimeout(collapse, 0)
      else collapse()
    }
    return {
      update(u: ViewUpdate) {
        const was = u.startState.field(linkWriting)
        const now = u.state.field(linkWriting)
        if (was && now) {
          const start = u.changes.mapPos(was.start, 1)
          if (now.start !== start) settle({ start, was: was.was }, true)
        }
        if (now && u.selectionSet && !holds(now.start)) settle(now, true)
      },
      flush() {
        const w = view.state.field(linkWriting)
        if (w) settle(w, false)
      },
    }
  },
  {
    eventHandlers: {
      blur(e) {
        if (!inCaretPane(e.relatedTarget)) this.flush()
        return false
      },
    },
  },
)
