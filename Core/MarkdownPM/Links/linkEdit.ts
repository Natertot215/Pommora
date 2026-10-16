import type { EditorView } from '@codemirror/view'
import { EditorSelection, type EditorState } from '@codemirror/state'
import type { LinkAction } from '../../Actions/connectionMenu'
import { unescapeLabel } from '../../Connections/links'
import { targetSpan } from '../../Connections/connections'
import { linkPaste } from '../../Connections/linkValue'
import type { LinkDisplay } from '../../Properties/properties'
import type { MarkdownScope } from '../Engine/detect'
import { aliasedToken, headingOf, type LinkKind, type TokenOf } from '../Engine/tokens'
import type { Span } from '../Engine/markdownCode'
import { docScan, docString } from '../docCache'
import { slotAt } from '../Input/edits'
import { focusRange } from '../caretPlacement'
import { restedOnLink } from './linkReveal'
import { type EditorHost, editorHost, inRawHtml } from '../api'
import { drawnLinkAt } from '../decorations'
import { writeLinkAt } from './pendingTitle'

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

/** Return in an alias or label lands the caret on the closer with no separating space, since the closer is the one caret position that doesn't reveal the syntax; in a written markdown destination, the moment an address is assigned, it moves on to the label, where the picker lists the page's aliases. */
export const commitAliasOnEnter =
  (scope: MarkdownScope) =>
  (view: EditorView): boolean => {
    const { state } = view
    const sel = state.selection.main
    if (!sel.empty || inRawHtml(state, sel.head, scope)) return false
    const s = slotAt(docScan(state.doc), sel.head)
    if (s?.part === 'shown') {
      const end = s.from + s.link.full[1]
      view.dispatch({ selection: EditorSelection.cursor(end, 1), effects: restedOnLink.of(end) })
    } else if (
      s?.link.syntax === 'markdown' &&
      state.facet(editorHost).settings().aliasPickerOnCommit
    )
      view.dispatch({ selection: EditorSelection.cursor(s.from + s.link.shown[1], 1) })
    else return false
    view.focus()
    return true
  }
