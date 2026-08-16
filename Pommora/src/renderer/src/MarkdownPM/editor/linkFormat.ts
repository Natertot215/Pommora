import type { EditorView } from '@codemirror/view'
import type { ConnUrlAction } from '@shared/connections'
import { unescapeAlias } from '@shared/links'
import { linkPaste } from '@shared/PasteLink'
import type { LinkDisplay } from '@shared/properties'
import { useSession } from '../../store'
import { linkTarget, tokenize } from '../tokens'
import { focusRange } from './input'
import { awaitTitle } from './PendingTitle'

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
  const span = { from: at(tk.range[0]), to: at(tk.range[1]) }
  const format = (display: LinkDisplay): void =>
    rewriteLabel(view, span, linkTarget(line.text, tk), display)

  switch (action) {
    case 'rename':
      focusRange(view, at(tk.contentRange[0]), at(tk.contentRange[1]))
      return
    // Both halves are selected rather than merely reached, because both are things you replace: the
    // words you show, and the address they point at. The wikilink form seats a bare caret instead —
    // its target is a page title you nudge, not an address you retype.
    case 'editLink': {
      const [, close] = tk.markerRanges
      focusRange(view, at(close[0]) + 2, at(close[1]) - 1)
      return
    }
    case 'link:remove':
      // The label survived the link syntax escaped; as prose it is just the words again.
      view.dispatch({
        changes: {
          ...span,
          insert: unescapeAlias(line.text.slice(tk.contentRange[0], tk.contentRange[1])),
        },
      })
      return
    case 'link:delete':
      view.dispatch({ changes: span })
      return
    // Spelled out rather than sliced off the id, which would take a cast back into the vocabulary
    // and put a second, weaker definition of what a link form is right here.
    case 'format:link-full':
      format('link-full')
      return
    case 'format:link-short':
      format('link-short')
      return
    case 'format:link-title':
      format('link-title')
  }
}

/** Write the link again in `display`'s form. Page Title with nothing cached stands the domain in and
 *  announces the anchor the paste path announces, so the fetch lands through one mechanism however
 *  the link came to be waiting for it. */
function rewriteLabel(
  view: EditorView,
  span: { from: number; to: number },
  url: string,
  display: LinkDisplay,
): void {
  const { linkTitles, resolveLinkTitle } = useSession.getState()
  const { text, wantsTitle } = linkPaste(url, display, linkTitles[url])
  const to = span.from + text.length
  view.dispatch({
    changes:
      view.state.sliceDoc(span.from, span.to) === text ? undefined : { ...span, insert: text },
    effects: wantsTitle ? awaitTitle.of({ from: span.from, to, url, text }) : undefined,
  })
  if (wantsTitle) resolveLinkTitle(url)
}
