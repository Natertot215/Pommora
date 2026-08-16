import { EditorView } from '@codemirror/view'
import { decidePaste, pastedUrl } from '@shared/PasteLink'
import { useSession } from '../../store'
import { awaitTitle } from './PendingTitle'

// Turns a pasted address into a markdown link, in the form the nexus is set to. Mounted in BOTH
// editors: the page body and a table cell each build their own EditorView, and a URL pasted into a
// cell has the same problem as one pasted into the body.
//
// The settings are read here rather than closed over, because the extension array is built once at
// mount — a captured value would freeze at whatever the knobs said then.
export const pasteLink = EditorView.domEventHandlers({
  paste(event, view) {
    // Null on CodeMirror's brokenClipboardAPI path, and in jsdom, which has no DataTransfer.
    const text = event.clipboardData?.getData('text/plain')
    if (!text) return false
    // The read-only change filter drops a doc-changing transaction without a trace, so decline
    // before dispatching into it rather than after.
    if (view.state.readOnly) return false
    // One caret, one link. A multi-range paste is CodeMirror's own business.
    if (view.state.selection.ranges.length !== 1) return false

    const { personalization, linkTitles, resolveLinkTitle } = useSession.getState()
    const url = pastedUrl(text)
    const sel = view.state.selection.main
    const decision = decidePaste({
      clipboard: text,
      selectionText: view.state.sliceDoc(sel.from, sel.to),
      autoFormat: personalization.autoFormatPastedLinks === true,
      pasteIntoText: personalization.pasteLinkIntoText === true,
      inverse: false,
      format: personalization.defaultLinkFormat ?? 'link-full',
      title: url ? linkTitles[url] : undefined,
    })
    if (decision.kind === 'literal') return false

    event.preventDefault()
    // The inserted span, in the coordinates the transaction leaves behind — an insert at `from`
    // does not move `from` itself.
    const to = sel.from + decision.text.length
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: decision.text },
      selection: { anchor: to },
      userEvent: 'input.paste',
      effects: decision.wantsTitle
        ? awaitTitle.of({ from: sel.from, to, url: decision.target, text: decision.text })
        : undefined,
    })
    // Fire-and-forget into the shared cache: the anchor above is what picks the answer back up, and
    // a property cell showing the same address gets it for free.
    if (decision.wantsTitle) resolveLinkTitle(decision.target)
    return true
  },
})
