import { EditorView } from '@codemirror/view'
import { readLinkText, retarget, type LinkTarget } from '../../Connections/linkValue'
import { pasteAsWrite, type PasteMode, type PasteWrite } from '../../Actions/pasteAsMenu'
import { linkDestinationStart } from '../../Connections/links'
import { matchesCommand } from '../../Actions/commands'
import { isWebAddress } from '../../Paths/urlPath'
import { isLinkDisplay } from '../../Properties/properties'
import { docScan } from '../docCache'
import { inCodeNear, scanDoc, type DocScan } from '../Engine/docScan'
import { linkTokenAt, tokenize, type LinkKind } from '../Engine/tokens'
import { insertCitation } from '../Citations/citationActions'
import { citationText } from '../Citations/citationEdits'
import { embedSeatAt } from '../Embeds/embedInsert'
import { settledLinkText, writeLinkAt } from './pendingTitle'
import { type EditorHost, editorHost } from '../api'
import { lineEndAt, lineStartAt, trimmedRange, type TextEdit } from '../Engine/markdownCode'

function clipboardTarget(text: string, how: PasteMode): LinkTarget | null {
  const target = readLinkText(text)
  if (target?.syntax === 'bare' && (how === 'auto' || how === 'inverse') && !isWebAddress(text))
    return null
  return target
}

function linkContainerAt(
  line: string,
  ls: number,
  sel: { from: number; to: number },
): { kind: LinkKind; range: [number, number]; text: string } | null {
  const tk = linkTokenAt(tokenize(line), sel.from - ls)
  if (!tk || tk.range[0] >= sel.from - ls || sel.to - ls >= tk.range[1]) return null
  const [start, end] = tk.range
  return { kind: tk.kind, range: [ls + start, ls + end], text: line.slice(start, end) }
}

interface PasteEdit {
  from: number
  to: number
  write: PasteWrite
}

function pasteEdit(
  scan: DocScan,
  sel: { from: number; to: number },
  text: string,
  how: PasteMode,
  host: EditorHost,
): PasteEdit {
  const pasted = text.trim()
  if (how === 'literal' || !pasted || /[\r\n]/.test(pasted) || inCodeNear(scan, sel.from))
    return { from: sel.from, to: sel.to, write: { kind: 'text', text } }
  const [from, to] = trimmedRange(scan.text, sel.from, sel.to)
  const plain: PasteEdit = { from, to, write: { kind: 'text', text: pasted } }
  const target = clipboardTarget(pasted, how)
  if (!target) return plain
  const { defaultLinkFormat: format, removeTitleOnLinkChange } = host.settings()
  const title = target.kind === 'url' ? (host.linkTitles.get(target.url) ?? undefined) : undefined
  const ls = lineStartAt(scan.text, sel.from)
  const line = scan.text.slice(ls, lineEndAt(scan.text, sel.from))
  const within = how === 'plain' ? null : linkContainerAt(line, ls, sel)
  if (how === 'inverse' && within) return plain
  if (within) {
    const syntax =
      how === 'connection' || (how !== 'markdown' && within.kind === 'wikiLink')
        ? 'wiki'
        : 'markdown'
    const write = isLinkDisplay(how)
      ? pasteAsWrite(target, how, { selection: '', format, title })
      : retarget(syntax, readLinkText(within.text), target, !removeTitleOnLinkChange, {
          format,
          title,
        })
    return write ? { from: within.range[0], to: within.range[1], write } : plain
  }
  if (how !== 'plain' && linkDestinationStart(line, sel.from - ls) !== null) return plain
  const write = pasteAsWrite(target, how, { selection: scan.text.slice(from, to), format, title })
  return write ? { from, to, write } : plain
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
function writePlain(view: EditorView, from: number, to: number, text: string): void {
  const insert = view.state.toText(text)
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
    userEvent: 'input.paste',
    scrollIntoView: true,
  })
}

export function paste(view: EditorView, text: string, how: PasteMode): boolean {
  // The read-only change filter drops a doc-changing transaction without a trace, so decline before dispatching.
  if (view.state.readOnly) return false
  if (how === 'footnote') {
    insertCitation(view, citationText(text))
    return true
  }
  const host = view.state.facet(editorHost)
  const { from, to, write } = pasteEdit(
    docScan(view.state.doc),
    view.state.selection.main,
    text,
    how,
    host,
  )
  if (write.kind === 'link') writeLinkAt(view, from, to, write, 'input.paste')
  else if (write.kind === 'line') writeLine(view, write.text)
  else writePlain(view, from, to, write.text)
  view.focus()
  return true
}

export async function pasteFromClipboard(view: EditorView, how: PasteMode): Promise<void> {
  const text = await view.state.facet(editorHost).clipboard.read()
  // The clipboard read is a round trip through main, so the view this was aimed at may be gone.
  if (text && view.dom.isConnected) paste(view, text, how)
}

export async function pastedCellText(
  host: EditorHost,
  doc: string,
  sel: { from: number; to: number },
  text: string,
  how: PasteMode,
): Promise<TextEdit> {
  const { from, to, write } = pasteEdit(scanDoc(doc), sel, text, how, host)
  return { from, to, insert: await settledLinkText(host, write) }
}

export const pasteLink = EditorView.domEventHandlers({
  paste(event, view) {
    // Null on CodeMirror's brokenClipboardAPI path, and in jsdom, which has no DataTransfer.
    const text = event.clipboardData?.getData('text/plain')
    if (!text || !paste(view, text, 'auto')) return false
    event.preventDefault()
    return true
  },

  keydown(event, view) {
    const host = view.state.facet(editorHost)
    if (!matchesCommand(host.settings().commands['paste-inverse'], event)) return false
    if (view.state.readOnly) return false
    event.preventDefault()
    void pasteFromClipboard(view, 'inverse')
    return true
  },

  drop(event, view) {
    if (!event.dataTransfer?.types.includes('text/uri-list')) return false
    const text = event.dataTransfer.getData('text/plain')
    if (!text) return false
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pos === null) return false
    view.dispatch({ selection: { anchor: pos } })
    if (!paste(view, text, 'auto')) return false
    event.preventDefault()
    return true
  },
})
