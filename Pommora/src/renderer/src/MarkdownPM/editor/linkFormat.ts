import type { EditorView } from '@codemirror/view'
import type { ConnUrlAction } from '@shared/connections'
import { unescapeAlias } from '@shared/links'
import { linkPaste } from '@shared/PasteLink'
import type { LinkDisplay } from '@shared/properties'
import { useSession } from '../../store'
import { linkTarget, tokenize, type Token } from '../tokens'
import { focusRange } from './caretSeat'
import { awaitTitle } from './PendingTitle'

/** What a link's whole span becomes, and whether the label written is only standing in until a
 *  fetched title arrives. */
export interface LinkActionText {
  insert: string
  url: string
  wantsTitle: boolean
}

/** The two halves of a link as spans in the text holding it: the words shown, and the address behind
 *  them. Both actions that seat a caret address one of these, from an editor or from a resting table
 *  cell, and neither should be re-deriving where a link keeps its parts. */
export function linkHalves(tk: Token): { label: [number, number]; address: [number, number] } {
  const [, close] = tk.markerRanges
  return { label: tk.contentRange, address: [close[0] + 2, close[1] - 1] }
}

/** The text an action turns a link into, or null for the two that seat a caret rather than write.
 *
 *  Pure of any editor, because a link in a resting table cell has none: that cell commits the same
 *  replacement as a string, and would otherwise need its own idea of what Format means. */
export function linkActionText(
  text: string,
  tk: Token,
  action: ConnUrlAction,
): LinkActionText | null {
  const url = linkTarget(text, tk)
  const label = text.slice(tk.contentRange[0], tk.contentRange[1])
  switch (action) {
    case 'rename':
    case 'editLink':
      return null
    // The label survived the link syntax escaped; as prose it is just the words again.
    case 'link:remove':
      return { insert: unescapeAlias(label), url, wantsTitle: false }
    case 'link:delete':
      return { insert: '', url, wantsTitle: false }
    // Spelled out rather than sliced off the id, which would take a cast back into the vocabulary
    // and put a second, weaker definition of what a link form is right here.
    case 'format:link-full':
      return formatted(url, 'link-full')
    case 'format:link-short':
      return formatted(url, 'link-short')
    case 'format:link-title':
      return formatted(url, 'link-title')
  }
}

function formatted(url: string, display: LinkDisplay): LinkActionText {
  const { text, wantsTitle } = linkPaste(url, display, useSession.getState().linkTitles[url])
  return { insert: text, url, wantsTitle }
}

/** Everything a `[label](address)` link's own menu does. It works off the token's spans rather than
 *  the rendered text, which is the only thing that still knows where the label ends once the syntax
 *  is drawn away.
 *
 *  `applyLinkAction` is the parallel for `[[ ]]`, and the two stay apart deliberately: a wikilink's
 *  label is an alias over a title that resolves, where this one is free text over an address, so
 *  every gesture below means something different there. */
export function applyUrlLinkAction(
  view: EditorView,
  action: ConnUrlAction,
  range: [number, number],
): void {
  // The span was captured before a native menu opened, and a native menu can be held open for as
  // long as the user likes. `lineAt` throws past the document's end rather than clamping.
  if (range[0] > view.state.doc.length) return
  const line = view.state.doc.lineAt(range[0])
  const tk = tokenize(line.text).find(
    (t) => t.kind === 'link' && line.from + t.range[0] === range[0],
  )
  if (!tk) return
  const at = (n: number): number => line.from + n

  // Both halves are selected rather than merely reached, because both are things you replace. The
  // wikilink form seats a bare caret instead — its target is a page title you nudge, not an address
  // you retype.
  if (action === 'rename' || action === 'editLink') {
    const half = linkHalves(tk)[action === 'rename' ? 'label' : 'address']
    focusRange(view, at(half[0]), at(half[1]))
    return
  }

  const edit = linkActionText(line.text, tk, action)
  if (!edit) return
  const span = { from: at(tk.range[0]), to: at(tk.range[1]) }
  const to = span.from + edit.insert.length
  view.dispatch({
    changes:
      view.state.sliceDoc(span.from, span.to) === edit.insert
        ? undefined
        : { ...span, insert: edit.insert },
    // Page Title with nothing cached stands the domain in and announces the anchor the paste path
    // announces, so the fetch lands through one mechanism however the link came to be waiting.
    effects: edit.wantsTitle
      ? awaitTitle.of({ from: span.from, to, url: edit.url, text: edit.insert })
      : undefined,
  })
  if (edit.wantsTitle) useSession.getState().resolveLinkTitle(edit.url)
}
