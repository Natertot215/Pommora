import type { EditorView } from '@codemirror/view'
import type { ConnUrlAction } from '../../Actions/connectionMenu'
import { unescapeAlias } from '../../Connections/links'
import { linkPaste } from '../../Connections/linkValue'
import type { LinkDisplay } from '../../Properties/properties'
import { linkAddress, linkTarget, type Token } from '../Engine/tokens'
import { docString } from '../docCache'
import { drawnLinkAt } from '../decorations'
import { focusRange } from '../caretPlacement'
import { awaitTitle } from './pendingTitle'
import { type EditorHost, editorHost } from '../api'

interface LinkActionText {
  insert: string
  url: string
  wantsTitle: boolean
}

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
  const tk = drawnLinkAt(view, range[0], 'link')
  if (!tk || tk.range[0] !== range[0]) return

  // Both halves are selected rather than reached, since both are things you replace; the wikilink form seats a bare caret.
  if (action === 'rename' || action === 'editLink') {
    const half = action === 'rename' ? tk.contentRange : linkAddress(tk)
    focusRange(view, half[0], half[1])
    return
  }

  const titles = view.state.facet(editorHost).linkTitles
  const edit = linkActionText(docString(view.state.doc), tk, action, titles)
  if (!edit) return
  const span = { from: tk.range[0], to: tk.range[1] }
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
