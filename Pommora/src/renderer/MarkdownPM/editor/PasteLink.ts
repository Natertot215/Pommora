import { EditorView } from '@codemirror/view'
import { decidePaste, pastedUrl, type LinkPaste } from '@shared/PasteLink'
import { pasteAsTarget, pasteAsWrite, type PasteAsForm } from '@shared/PasteAsMenu'
import { DEFAULT_LINK_DISPLAY } from '@shared/properties'
import { isInsideCode } from '@shared/markdownCode'
import { linkDestinationAt } from '@shared/webpageEmbed'
import { matchesCommand } from '../../Commands'
import { useSession } from '../../store'
import { docString } from './docCache'
import { insertCitation } from './citationActions'
import { citationText } from './citationEdits'
import { embedSeatAt } from './embedInsert'
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

  // A non-address always pastes literally, so the guards below only run for the pastes they can
  // actually change.
  const url = pastedUrl(text)
  if (!url) return null

  const sel = view.state.selection.main
  if (destinationGuard(view, sel.from)) return null
  if (insideCodeAtCaret(view, sel.from)) return null

  const { personalization, linkTitles } = useSession.getState()
  const decision = decidePaste({
    clipboard: text,
    selectionText: view.state.sliceDoc(sel.from, sel.to),
    pasteIntoText: personalization.pasteLinkIntoText === true,
    inverse,
    format: personalization.defaultLinkFormat ?? DEFAULT_LINK_DISPLAY,
    title: linkTitles[url],
  })
  return decision.kind === 'literal' ? null : decision
}

/** A caret inside a link's `()` — the seat ⌘K leaves — receives an address as the literal text the
 *  destination is made of; formatting there would nest a link inside one. One test for both paste
 *  entry points, so the menu path and the keystroke path can never disagree about it. */
function destinationGuard(view: EditorView, pos: number): boolean {
  const line = view.state.doc.lineAt(pos)
  return linkDestinationAt(line.text, pos - line.from)
}

/** A code span or fence renders nothing — a link written there is corrupted code, not a link.
 *  `isInsideCode` answers for a character; an insertion at the span's exclusive end (the caret
 *  before a closing backtick) still lands inside, so the position behind the caret answers too —
 *  except across a newline, or the first column after a fence would read as the fence's. */
function insideCodeAtCaret(view: EditorView, pos: number): boolean {
  const s = docString(view.state.doc)
  if (isInsideCode(pos, s)) return true
  return pos > 0 && s[pos - 1] !== '\n' && isInsideCode(pos - 1, s)
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

/** Put a lone-line construct in as the caret's whole line. The seat is re-read here rather than
 *  trusted from the menu: the offer was decided when the menu popped, and the document may have
 *  moved while it stood open. */
function writeLine(view: EditorView, text: string): void {
  if (!embedSeatAt(view.state)) return
  const line = view.state.doc.lineAt(view.state.selection.main.from)
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: text },
    selection: { anchor: line.from + text.length },
    userEvent: 'input.paste',
  })
}

/** Paste As: put the clipboard in as the form the menu picked, rather than as whatever the settings
 *  would have made of it. The forms are decided and written by the shared model, so this menu can
 *  never offer something the writer can't produce. */
export async function pasteAs(view: EditorView, form: PasteAsForm): Promise<void> {
  const text = await window.nexus.readClipboard()
  // The menu is popped by main and can be held open indefinitely — the surface it was popped over
  // may be gone, and a table cell's editor is destroyed the moment its cell deactivates.
  if (!text || !view.dom.isConnected || view.state.readOnly) return
  if (view.state.selection.ranges.length !== 1) return
  // The explicit pick overrides the settings, never the syntax: a destination takes any clipboard
  // as the text it is, or the picked form nests a link inside the link being authored.
  if (destinationGuard(view, view.state.selection.main.from)) {
    view.dispatch(view.state.replaceSelection(text))
    view.focus()
    return
  }
  // A footnote forks ahead of the single-range writer the other forms share: it is two disjoint
  // sites, and its own action answers for the seat, the caret and the disclosure.
  if (form === 'footnote') {
    insertCitation(view, citationText(text))
    return
  }
  const target = pasteAsTarget(text)
  const cached = target?.kind === 'url' ? useSession.getState().linkTitles[target.url] : undefined
  const write = pasteAsWrite(target, form, cached)
  if (!write) return
  if (write.kind === 'link') writeLink(view, write)
  else if (write.kind === 'line') writeLine(view, write.text)
  else view.dispatch(view.state.replaceSelection(write.text))
  view.focus()
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
