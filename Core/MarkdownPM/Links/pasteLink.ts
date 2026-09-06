import { EditorView } from '@codemirror/view'
import { decidePaste, pastedUrl, type LinkPaste } from '@pommora/core/Web/pasteLink'
import { pasteAsTarget, pasteAsWrite, type PasteAsForm } from '@pommora/core/Actions/pasteAsMenu'
import { DEFAULT_LINK_DISPLAY } from '@pommora/core/Properties/properties'
import { linkDestinationAt } from '@pommora/core/Web/webpageEmbed'
import { matchesCommand } from '@pommora/uix/Interactions/commands'
import { useSession } from '../../Session/store'
import { docScan } from '../docCache'
import { inCodeAt } from '../Engine/docScan'
import { insertCitation } from '../Citations/citationActions'
import { citationText } from '../Citations/citationEdits'
import { embedSeatAt } from '../Embeds/embedInsert'
import { awaitTitle } from './pendingTitle'
import { host } from '../../Platform/dialer'

// Settings are read at paste time rather than closed over, since the extension array is built once at mount.

/** Deciding and writing are separate so a paste can be claimed on the decision alone — claiming after the write would leave the original text pasted alongside the link. */
function linkFor(view: EditorView, text: string, inverse: boolean): LinkPaste | null {
  // The read-only change filter drops a doc-changing transaction without a trace, so decline before dispatching.
  if (view.state.readOnly) return null

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

function destinationGuard(view: EditorView, pos: number): boolean {
  const line = view.state.doc.lineAt(pos)
  return linkDestinationAt(line.text, pos - line.from)
}

/** An insertion at a span's exclusive end still lands inside, so the position behind the caret answers too — except across a newline, or the first column after a fence would read as the fence's. */
function insideCodeAtCaret(view: EditorView, pos: number): boolean {
  const scan = docScan(view.state.doc)
  if (inCodeAt(scan, pos)) return true
  return pos > 0 && view.state.sliceDoc(pos - 1, pos) !== '\n' && inCodeAt(scan, pos - 1)
}

function writeLink(view: EditorView, link: LinkPaste): void {
  const sel = view.state.selection.main
  const to = sel.from + link.text.length
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: link.text },
    selection: { anchor: to },
    userEvent: 'input.paste',
    effects: link.wantsTitle
      ? awaitTitle.of({ from: sel.from, to, url: link.target, text: link.text })
      : undefined,
  })
  // Fire-and-forget: the anchor effect above picks the answer back up.
  if (link.wantsTitle) useSession.getState().resolveLinkTitle(link.target)
}

/** Re-read here rather than trusted from the menu: the document may have moved while it stood open. */
function writeLine(view: EditorView, text: string): void {
  if (!embedSeatAt(view.state)) return
  const line = view.state.doc.lineAt(view.state.selection.main.from)
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: text },
    selection: { anchor: line.from + text.length },
    userEvent: 'input.paste',
  })
}

export async function pasteAs(view: EditorView, form: PasteAsForm): Promise<void> {
  const text = await host().ask('clipboard:read')
  // The menu can be held open indefinitely — a table cell's editor is destroyed the moment its cell deactivates.
  if (!text || !view.dom.isConnected || view.state.readOnly) return
  // The explicit pick overrides the settings, never the syntax, or the picked form would nest a link inside the one being authored.
  if (destinationGuard(view, view.state.selection.main.from)) {
    view.dispatch(view.state.replaceSelection(text))
    view.focus()
    return
  }
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
    if (view.state.readOnly) return false
    event.preventDefault()
    void host()
      .ask('clipboard:read')
      .then((text) => {
        // The clipboard read is a round trip through main, so the view this was aimed at may be gone.
        if (!text || !view.dom.isConnected) return
        const link = linkFor(view, text, true)
        if (link) writeLink(view, link)
        else view.dispatch(view.state.replaceSelection(text))
      })
    return true
  },
})
