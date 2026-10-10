import { EditorView } from '@codemirror/view'
import { decidePaste, pastedUrl } from './pasteDecision'
import { readLinkText, type LinkPaste } from '../../Connections/linkValue'
import { pasteAsWrite, type PasteAsForm } from '../../Actions/pasteAsMenu'
import { linkDestinationStart } from '../../Connections/links'
import { matchesCommand } from '../../Actions/commands'
import { docScan, docString } from '../docCache'
import { inCodeNear } from '../Engine/docScan'
import { insertCitation } from '../Citations/citationActions'
import { citationText } from '../Citations/citationEdits'
import { embedSeatAt } from '../Embeds/embedInsert'
import { awaitTitle } from './pendingTitle'
import { editorHost } from '../api'
import { trimmedRange } from '../Engine/markdownCode'

/** Deciding and writing are separate so a paste can be claimed on the decision alone — claiming after the write would leave the original text pasted alongside the link. */
function linkFor(view: EditorView, text: string, inverse: boolean): LinkPaste | null {
  // The read-only change filter drops a doc-changing transaction without a trace, so decline before dispatching.
  if (view.state.readOnly) return null

  const url = pastedUrl(text)
  if (!url) return null

  const sel = view.state.selection.main
  if (literalAt(view, sel.from)) return null

  const host = view.state.facet(editorHost)
  const settings = host.settings()
  const decision = decidePaste({
    clipboard: text,
    selectionText: view.state.sliceDoc(
      ...trimmedRange(docString(view.state.doc), sel.from, sel.to),
    ),
    inverse,
    format: settings.defaultLinkFormat,
    title: host.linkTitles.get(url) ?? undefined,
  })
  return decision.kind === 'literal' ? null : decision
}

/** Code and another link's destination take the clipboard as written. An insertion at a code span's exclusive end still lands inside, so the position behind the caret answers too, except at the line's start, where it would read the fence above. */
function literalAt(view: EditorView, pos: number): boolean {
  const line = view.state.doc.lineAt(pos)
  if (linkDestinationStart(line.text, pos - line.from) !== null) return true
  const scan = docScan(view.state.doc)
  return inCodeNear(scan, pos)
}

function writeLink(view: EditorView, link: LinkPaste): void {
  const sel = view.state.selection.main
  const [from, selTo] = trimmedRange(docString(view.state.doc), sel.from, sel.to)
  const to = from + link.text.length
  view.dispatch({
    changes: { from, to: selTo, insert: link.text },
    selection: { anchor: to },
    userEvent: 'input.paste',
    effects: link.wantsTitle
      ? awaitTitle.of({ from, to, url: link.target, text: link.text })
      : undefined,
  })
  // Fire-and-forget: the anchor effect above picks the answer back up.
  if (link.wantsTitle) view.state.facet(editorHost).linkTitles.resolve(link.target)
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

/** Literal text, tagged as a paste so every paste guard reads it as one. */
function writePlain(view: EditorView, text: string): void {
  view.dispatch({
    ...view.state.replaceSelection(text),
    userEvent: 'input.paste',
    scrollIntoView: true,
  })
}

/** `'literal'` is the menu's Paste Without Formatting: the clipboard as typed, whatever it holds. */
export async function pasteAs(view: EditorView, form: PasteAsForm | 'literal'): Promise<void> {
  const host = view.state.facet(editorHost)
  const text = await host.clipboard.read()
  // The menu can be held open indefinitely — a table cell's editor is destroyed the moment its cell deactivates.
  if (!text || !view.dom.isConnected || view.state.readOnly) return
  // The explicit pick overrides the settings, never the syntax, or the picked form would nest a link inside the one being authored.
  if (form === 'literal' || literalAt(view, view.state.selection.main.from)) {
    writePlain(view, text)
    view.focus()
    return
  }
  if (form === 'footnote') {
    insertCitation(view, citationText(text))
    return
  }
  const target = readLinkText(text)
  const cached = target?.kind === 'url' ? (host.linkTitles.get(target.url) ?? undefined) : undefined
  const write = pasteAsWrite(target, form, cached)
  if (!write) return
  if (write.kind === 'link') writeLink(view, write)
  else if (write.kind === 'line') writeLine(view, write.text)
  else writePlain(view, write.text)
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
    const host = view.state.facet(editorHost)
    if (!matchesCommand(host.settings().commands['paste-inverse'], event)) return false
    if (view.state.readOnly) return false
    event.preventDefault()
    void host.clipboard.read().then((text) => {
      // The clipboard read is a round trip through main, so the view this was aimed at may be gone.
      if (!text || !view.dom.isConnected) return
      const link = linkFor(view, text, true)
      if (link) writeLink(view, link)
      else writePlain(view, text)
    })
    return true
  },
})
