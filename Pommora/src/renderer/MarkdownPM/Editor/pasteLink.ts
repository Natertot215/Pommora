import { EditorView } from '@codemirror/view'
import { decidePaste, pastedUrl, type LinkPaste } from '@shared/pasteLink'
import { pasteAsTarget, pasteAsWrite, type PasteAsForm } from '@shared/pasteAsMenu'
import { DEFAULT_LINK_DISPLAY } from '@shared/properties'
import { isInsideCode } from '@shared/markdownCode'
import { linkDestinationAt } from '@shared/webpageEmbed'
import { matchesCommand } from '@renderer/Actions/commands'
import { useSession } from '../../store'
import { docString } from './docCache'
import { insertCitation } from './citationActions'
import { citationText } from './citationEdits'
import { embedSeatAt } from './embedInsert'
import { awaitTitle } from './pendingTitle'

// Turns a pasted address into a markdown link per the nexus's format setting, with a chord for the
// reverse. Mounted in both the page-body and table-cell editors, each its own EditorView.
//
// Settings are read at paste time rather than closed over, since the extension array is built once
// at mount and a captured value would freeze at whatever the knobs said then.

/** Deciding and writing are separate calls so a paste can be claimed from the platform on the
 *  decision alone — claiming after the write would leave the original text pasted alongside the
 *  link if anything in between went wrong. */
function linkFor(view: EditorView, text: string, inverse: boolean): LinkPaste | null {
  // The read-only change filter drops a doc-changing transaction without a trace, so decline before dispatching.
  if (view.state.readOnly) return null
  if (view.state.selection.ranges.length !== 1) return null

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

/** A caret inside a link's `()` — the seat ⌘K leaves — receives an address as literal text;
 *  formatting there would nest a link inside one. */
function destinationGuard(view: EditorView, pos: number): boolean {
  const line = view.state.doc.lineAt(pos)
  return linkDestinationAt(line.text, pos - line.from)
}

/** `isInsideCode` answers for a character; an insertion at a span's exclusive end (the caret before
 *  a closing backtick) still lands inside, so the position behind the caret answers too — except
 *  across a newline, or the first column after a fence would read as the fence's. */
function insideCodeAtCaret(view: EditorView, pos: number): boolean {
  const s = docString(view.state.doc)
  if (isInsideCode(pos, s)) return true
  return pos > 0 && s[pos - 1] !== '\n' && isInsideCode(pos - 1, s)
}

function writeLink(view: EditorView, link: LinkPaste): void {
  const sel = view.state.selection.main
  // An insert at `from` does not move `from` itself.
  const to = sel.from + link.text.length
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: link.text },
    selection: { anchor: to },
    userEvent: 'input.paste',
    effects: link.wantsTitle
      ? awaitTitle.of({ from: sel.from, to, url: link.target, text: link.text })
      : undefined,
  })
  // Fire-and-forget: the anchor effect above picks the answer back up, and a property cell showing
  // the same address gets it for free.
  if (link.wantsTitle) useSession.getState().resolveLinkTitle(link.target)
}

/** The seat is re-read here rather than trusted from the menu: the offer was decided when the menu
 *  popped, and the document may have moved while it stood open. */
function writeLine(view: EditorView, text: string): void {
  if (!embedSeatAt(view.state)) return
  const line = view.state.doc.lineAt(view.state.selection.main.from)
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: text },
    selection: { anchor: line.from + text.length },
    userEvent: 'input.paste',
  })
}

/** The forms are decided and written by the shared model, so this menu can never offer something
 *  the writer can't produce. */
export async function pasteAs(view: EditorView, form: PasteAsForm): Promise<void> {
  const text = await window.nexus.readClipboard()
  // The menu is popped by main and can be held open indefinitely — the surface it was popped over
  // may be gone, and a table cell's editor is destroyed the moment its cell deactivates.
  if (!text || !view.dom.isConnected || view.state.readOnly) return
  if (view.state.selection.ranges.length !== 1) return
  // The explicit pick overrides the settings, never the syntax: a destination still takes any
  // clipboard as the text it is, or the picked form would nest a link inside the link being authored.
  if (destinationGuard(view, view.state.selection.main.from)) {
    view.dispatch(view.state.replaceSelection(text))
    view.focus()
    return
  }
  // A footnote is two disjoint sites; its own action answers for the seat, the caret and the disclosure.
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
      // The clipboard read is a round trip through main, so the view this was aimed at may be gone.
      if (!text || !view.dom.isConnected) return
      const link = linkFor(view, text, true)
      if (link) writeLink(view, link)
      else view.dispatch(view.state.replaceSelection(text))
    })
    return true
  },
})
