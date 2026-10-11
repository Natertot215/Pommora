import { expressibleInLink, pageEmbedText, connectionText } from '../Connections/connections'
import { composeWebpageEmbedLine, markdownPageLink } from '../Connections/links'
import { isHttpLink } from '../Paths/urlPath'
import {
  connectionSpells,
  linkPaste,
  readLinkText,
  serializeLink,
  type LinkPaste,
  type LinkTarget,
} from '../Connections/linkValue'
import { LINK_DISPLAY_LABELS, LINK_DISPLAYS, type LinkDisplay } from '../Properties/properties'
import { PASTE_LITERAL_ACTION, RESTING_EDITS } from './editorMenu'

export type PasteAsForm =
  | LinkDisplay
  | 'plain'
  | 'connection'
  | 'markdown'
  | 'embedPage'
  | 'embedLink'
  | 'footnote'

export type PasteMode = PasteAsForm | 'auto' | 'inverse' | 'literal'

export const PASTE_AS_PREFIX = 'pasteAs:'

export const pasteModeOf = (action: string): PasteMode | null => {
  if (action === PASTE_LITERAL_ACTION) return 'literal'
  if (action === RESTING_EDITS.paste) return 'auto'
  return action.startsWith(PASTE_AS_PREFIX)
    ? (action.slice(PASTE_AS_PREFIX.length) as PasteAsForm)
    : null
}

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

function embeddableTarget(target: LinkTarget): boolean {
  return target.kind === 'page'
    ? expressibleInLink(target.title) && !target.heading && !target.alias
    : isHttpLink(target.url)
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
  const rows = page
    ? PAGE_ROWS.filter((r) => r.form !== 'connection' || connectionSpells(target))
    : URL_ROWS.filter((r) => r.form !== 'link-title' || isHttpLink(target.url))
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

export type PasteWrite = LinkPaste | TextPaste | LinePaste

export function pasteAsWrite(
  target: LinkTarget,
  how: PasteMode,
  over: { selection: string; format: LinkDisplay; title?: string },
): PasteWrite | null {
  // A footnote writes two disjoint sites, so the caller forks ahead of this single-range writer.
  if (how === 'footnote' || how === 'literal') return null
  if ((how === 'embedPage' || how === 'embedLink') && !embeddableTarget(target)) return null
  if (target.kind === 'page') {
    switch (how) {
      case 'connection':
        return { kind: 'text', text: connectionText(target.title, target.alias, target.heading) }
      case 'markdown':
        return { kind: 'text', text: markdownPageLink(target.title, target.heading, target.alias) }
      case 'embedPage':
        return { kind: 'line', text: pageEmbedText(target.title) }
      default:
        return null
    }
  }
  if ((how === 'auto' || how === 'inverse') && target.syntax !== 'bare') return null
  const wrappable = over.selection !== '' && !/[\r\n]/.test(over.selection)
  switch (how) {
    case 'plain':
      return { kind: 'text', text: target.url }
    case 'embedLink':
      return { kind: 'line', text: composeWebpageEmbedLine('', target.url) }
    case 'connection':
    case 'markdown':
    case 'embedPage':
      return null
    case 'auto':
      return wrappable
        ? { kind: 'link', text: serializeLink(target.url, over.selection) }
        : linkPaste(target.url, over.format, over.title)
    case 'inverse':
      return wrappable ? linkPaste(target.url, over.format, over.title) : null
    default:
      return linkPaste(target.url, how, over.title)
  }
}
