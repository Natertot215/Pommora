import { EditorView } from '@codemirror/view'
import { decidePaste, pastedUrl, type LinkPaste } from '@shared/PasteLink'
import { matchesCommand } from '../../Commands'
import { useSession } from '../../store'
import { awaitTitle } from './PendingTitle'

// Turns a pasted address into a markdown link, in the form the nexus is set to, and carries the
// chord that does the opposite. Mounted in BOTH editors: the page body and a table cell each build
// their own EditorView, and a URL pasted into a cell has the same problem as one pasted into the body.
//
// The settings are read at the moment of the paste rather than closed over, because the extension
// array is built once at mount — a captured value would freeze at whatever the knobs said then.

/** The link `text` should become at this selection, or null where it should stay the text it is —
 *  `inverse` reversing whichever of the two settings a selection puts in question.
 *
 *  Deciding and writing are separate calls so a paste can be claimed from the platform on the
 *  decision alone: claiming it after the write would leave the original text pasted alongside the
 *  link if anything in between went wrong. */
function linkFor(view: EditorView, text: string, inverse: boolean): LinkPaste | null {
  // The read-only change filter drops a doc-changing transaction without a trace, so decline before
  // dispatching into it rather than after.
  if (view.state.readOnly) return null
  // One caret, one link. A multi-range paste is CodeMirror's own business.
  if (view.state.selection.ranges.length !== 1) return null

  const { personalization, linkTitles } = useSession.getState()
  const url = pastedUrl(text)
  const sel = view.state.selection.main
  const decision = decidePaste({
    clipboard: text,
    selectionText: view.state.sliceDoc(sel.from, sel.to),
    autoFormat: personalization.autoFormatPastedLinks === true,
    pasteIntoText: personalization.pasteLinkIntoText === true,
    inverse,
    format: personalization.defaultLinkFormat ?? 'link-full',
    title: url ? linkTitles[url] : undefined,
  })
  return decision.kind === 'literal' ? null : decision
}

/** Put the decided link in, over whatever the selection covers. */
function writeLink(view: EditorView, link: LinkPaste): void {
  const sel = view.state.selection.main
  // The inserted span, in the coordinates the transaction leaves behind — an insert at `from` does
  // not move `from` itself.
  const to = sel.from + link.text.length
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: link.text },
    selection: { anchor: to },
    userEvent: 'input.paste',
    effects: link.wantsTitle
      ? awaitTitle.of({ from: sel.from, to, url: link.target, text: link.text })
      : undefined,
  })
  // Fire-and-forget into the shared cache: the anchor above is what picks the answer back up, and a
  // property cell showing the same address gets it for free.
  if (link.wantsTitle) useSession.getState().resolveLinkTitle(link.target)
}

export const pasteLink = EditorView.domEventHandlers({
  paste(event, view) {
    // Null on CodeMirror's brokenClipboardAPI path, and in jsdom, which has no DataTransfer.
    const text = event.clipboardData?.getData('text/plain')
    if (!text) return false
    const link = linkFor(view, text, false)
    if (!link) return false
    event.preventDefault()
    writeLink(view, link)
    return true
  },

  keydown(event, view) {
    if (!matchesCommand(useSession.getState().commands['paste-inverse'], event)) return false
    if (view.state.readOnly || view.state.selection.ranges.length !== 1) return false
    event.preventDefault()
    void window.nexus.readClipboard().then((text) => {
      // A table cell's editor is destroyed the moment the cell deactivates, and the clipboard read
      // is a round trip through main — so the view this was aimed at may no longer be in the page.
      if (!text || !view.dom.isConnected) return
      // Nothing else will paste this: the item that used to own the chord is gone from both menus,
      // so a decision to leave the text alone is still this handler's to carry out.
      const link = linkFor(view, text, true)
      if (link) writeLink(view, link)
      else view.dispatch(view.state.replaceSelection(text))
    })
    return true
  },
})
