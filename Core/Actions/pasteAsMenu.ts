import { embeddableTitle, pageEmbedText, connectionText } from '../Connections/connections'
import { composeWebpageEmbedLine, markdownPageLink } from '../Connections/links'
import { WEB_ADDRESS } from '../Paths/urlPath'
import { linkPaste, readLinkText, type LinkPaste, type LinkTarget } from '../Connections/linkValue'
import { LINK_DISPLAY_LABELS, LINK_DISPLAYS, type LinkDisplay } from '../Properties/properties'

export type PasteAsForm =
  | LinkDisplay
  | 'plain'
  | 'connection'
  | 'markdown'
  | 'embedPage'
  | 'embedLink'
  | 'footnote'

export const PASTE_AS_PREFIX = 'pasteAs:'

interface PasteAsRow {
  label: string
  form: PasteAsForm
}

const PAGE_ROWS: readonly PasteAsRow[] = [
  { label: 'Connection', form: 'connection' },
  { label: 'Markdown Link', form: 'markdown' },
]

const URL_ROWS: readonly PasteAsRow[] = [
  ...LINK_DISPLAYS.map((form) => ({ label: LINK_DISPLAY_LABELS[form], form })),
  { label: 'Plain Text', form: 'plain' },
]

const FOOTNOTE_ROW: PasteAsRow = { label: 'Footnote', form: 'footnote' }
const PAGE_EMBED_ROW: PasteAsRow = { label: 'Embedded Page', form: 'embedPage' }
const URL_EMBED_ROW: PasteAsRow = { label: 'Embedded Link', form: 'embedLink' }

/** `![[…]]` can't carry a `]`, and a tile forms only over an explicit http(s) address. */
function embeddableTarget(target: LinkTarget): boolean {
  return target.kind === 'page' ? embeddableTitle(target.title) : WEB_ADDRESS.test(target.url)
}

export function pasteAsRows(
  clipboard: string,
  embedSeat: boolean,
  citeSeat: boolean,
): readonly PasteAsRow[] {
  const footnote = citeSeat && clipboard.trim() !== '' ? [FOOTNOTE_ROW] : []
  const target = readLinkText(clipboard)
  if (!target) return footnote
  const page = target.kind === 'page'
  const embed = embedSeat && embeddableTarget(target)
  const rows = page ? PAGE_ROWS : URL_ROWS
  const embedRow = page ? PAGE_EMBED_ROW : URL_EMBED_ROW
  return [...footnote, ...rows, ...(embed ? [embedRow] : [])]
}

interface TextPaste {
  kind: 'text'
  text: string
}

interface LinePaste {
  kind: 'line'
  text: string
}

export function pasteAsWrite(
  target: LinkTarget | null,
  form: PasteAsForm,
  title?: string,
): LinkPaste | TextPaste | LinePaste | null {
  // A footnote writes two disjoint sites, so the caller forks ahead of this single-range writer.
  if (!target || form === 'footnote') return null
  if ((form === 'embedPage' || form === 'embedLink') && !embeddableTarget(target)) return null
  if (target.kind === 'page') {
    if (form === 'connection')
      return { kind: 'text', text: connectionText(target.title, target.alias, target.heading) }
    if (form === 'embedPage') return { kind: 'line', text: pageEmbedText(target.title) }
    if (form === 'markdown')
      return { kind: 'text', text: markdownPageLink(target.title, target.heading, target.alias) }
    return null
  }
  if (form === 'plain') return { kind: 'text', text: target.url }
  if (form === 'embedLink') return { kind: 'line', text: composeWebpageEmbedLine('', target.url) }
  if (form === 'connection' || form === 'markdown' || form === 'embedPage') return null
  return linkPaste(target.url, form, title)
}
