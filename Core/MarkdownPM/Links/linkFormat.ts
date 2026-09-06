import type { EditorView } from '@codemirror/view'
import type { ConnUrlAction } from '@pommora/core/Actions/connMenu'
import { unescapeAlias } from '@pommora/core/Connections/links'
import { linkPaste } from '@pommora/core/Web/pasteLink'
import type { LinkDisplay } from '@pommora/core/Properties/properties'
import { linkTarget, tokenize, type Token } from '../Engine/tokens'
import { focusRange } from '../caretPlacement'
import { awaitTitle } from './pendingTitle'
import { type EditorHost, editorHost } from '../api'

interface LinkActionText {
  insert: string
  url: string
  wantsTitle: boolean
}

export function linkHalves(tk: Token): { label: [number, number]; address: [number, number] } {
  const [, close] = tk.markerRanges
  return { label: tk.contentRange, address: [close[0] + 2, close[1] - 1] }
}

/** Null for the two that seat a caret rather than write. Pure of any editor, because a link in a resting table cell has none. */
export function linkActionText(
  text: string,
  tk: Token,
  action: ConnUrlAction,
  titles: EditorHost['linkTitles'],
): LinkActionText | null {
  const url = linkTarget(text, tk)
  const label = text.slice(tk.contentRange[0], tk.contentRange[1])
  switch (action) {
    case 'rename':
    case 'editLink':
      return null
    case 'link:remove':
      return { insert: unescapeAlias(label), url, wantsTitle: false }
    case 'link:delete':
      return { insert: '', url, wantsTitle: false }
    // Spelled out rather than sliced off the id, which would put a second, weaker definition of a link form here.
    case 'format:link-full':
      return formatted(url, 'link-full', titles)
    case 'format:link-short':
      return formatted(url, 'link-short', titles)
    case 'format:link-title':
      return formatted(url, 'link-title', titles)
  }
}

function formatted(
  url: string,
  display: LinkDisplay,
  titles: EditorHost['linkTitles'],
): LinkActionText {
  const { text, wantsTitle } = linkPaste(url, display, titles.get(url) ?? undefined)
  return { insert: text, url, wantsTitle }
}

/** Works off the token's spans, the only thing that still knows where the label ends once the syntax is drawn away. `applyLinkAction` is the parallel for a wikilink, whose label is an alias over a title that resolves. */
export function applyUrlLinkAction(
  view: EditorView,
  action: ConnUrlAction,
  range: [number, number],
): void {
  // The span was captured before a native menu opened, and `lineAt` throws past the document's end rather than clamping.
  if (range[0] > view.state.doc.length) return
  const line = view.state.doc.lineAt(range[0])
  const tk = tokenize(line.text).find(
    (t) => t.kind === 'link' && line.from + t.range[0] === range[0],
  )
  if (!tk) return
  const at = (n: number): number => line.from + n

  // Both halves are selected rather than reached, since both are things you replace; the wikilink form seats a bare caret.
  if (action === 'rename' || action === 'editLink') {
    const half = linkHalves(tk)[action === 'rename' ? 'label' : 'address']
    focusRange(view, at(half[0]), at(half[1]))
    return
  }

  const titles = view.state.facet(editorHost).linkTitles
  const edit = linkActionText(line.text, tk, action, titles)
  if (!edit) return
  const span = { from: at(tk.range[0]), to: at(tk.range[1]) }
  const to = span.from + edit.insert.length
  view.dispatch({
    changes:
      view.state.sliceDoc(span.from, span.to) === edit.insert
        ? undefined
        : { ...span, insert: edit.insert },
    // Announces the same anchor the paste path does, so the fetch lands through one mechanism however the link came to be waiting.
    effects: edit.wantsTitle
      ? awaitTitle.of({ from: span.from, to, url: edit.url, text: edit.insert })
      : undefined,
  })
  if (edit.wantsTitle) titles.resolve(edit.url)
}
