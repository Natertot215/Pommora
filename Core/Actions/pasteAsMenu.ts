import { expressibleInLink, pageEmbedText, spellsAsWiki } from '../Connections/connections'
import { markdownLink } from '../Connections/links'
import { isHttpLink, normalizeLinkUrl } from '../Paths/urlPath'
import {
  LINK_DISPLAY_LABELS,
  LINK_DISPLAYS,
  type LinkDisplay,
  linkPaste,
  readLinkText,
  resolvedTarget,
  retarget,
  serializeLink,
  type LinkPaste,
  type LinkTarget,
} from '../Connections/linkValue'
import type { PageIndex } from '../Connections/pageIndex'
import { PASTE_LITERAL_ACTION, RESTING_EDITS } from './editorMenu'
import type { LeafItem } from './menuModel'

type PasteAsForm =
  | LinkDisplay
  | 'plain'
  | 'connection'
  | 'markdown'
  | 'embedPage'
  | 'embedLink'
  | 'footnote'

export type PasteMode = PasteAsForm | 'auto' | 'inverse' | 'literal'

const PASTE_AS_PREFIX = 'pasteAs:'

export const pasteModeOf = (action: string): PasteMode | null => {
  if (action === PASTE_LITERAL_ACTION) return 'literal'
  if (action === RESTING_EDITS.paste) return 'auto'
  return action.startsWith(PASTE_AS_PREFIX)
    ? (action.slice(PASTE_AS_PREFIX.length) as PasteAsForm)
    : null
}

const row = (label: string, form: PasteAsForm): LeafItem<string> => ({
  label,
  action: PASTE_AS_PREFIX + form,
})

function embeddableTarget(target: LinkTarget): boolean {
  return target.kind === 'page'
    ? expressibleInLink(target.title) && !target.heading && !target.shown
    : isHttpLink(target.url)
}

export function pasteAsRows(
  clipboard: string,
  embedSeat: boolean,
  citeSeat: boolean,
  index?: PageIndex,
): LeafItem<string>[] {
  const footnote = citeSeat && clipboard.trim() !== '' ? [row('Footnote', 'footnote')] : []
  const written = readLinkText(clipboard)
  if (!written) return footnote
  const target = resolvedTarget(written, index)
  const embed = embedSeat && embeddableTarget(target)
  if (target.kind === 'page')
    return [
      ...footnote,
      ...(spellsAsWiki(target) ? [row('Connection', 'connection')] : []),
      row('Markdown Link', 'markdown'),
      ...(embed ? [row('Embedded Page', 'embedPage')] : []),
    ]
  const web = isHttpLink(target.url)
  return [
    ...footnote,
    ...LINK_DISPLAYS.filter((d) => d !== 'link-title' || web).map((d) =>
      row(LINK_DISPLAY_LABELS[d], d),
    ),
    row('Plain Text', 'plain'),
    ...(embed ? [row('Embedded Link', 'embedLink')] : []),
  ]
}

interface TextPaste {
  kind: 'text' | 'line'
  text: string
}

export type PasteWrite = LinkPaste | TextPaste

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
      case 'markdown':
        return retarget(how === 'connection' ? 'wiki' : 'markdown', target)
      case 'embedPage':
        return { kind: 'line', text: pageEmbedText(target.title) }
      default:
        return null
    }
  }
  if ((how === 'auto' || how === 'inverse') && target.syntax !== 'bare') return null
  const url = normalizeLinkUrl(target.url)
  const wrappable = over.selection !== '' && !/[\r\n]/.test(over.selection)
  switch (how) {
    case 'plain':
      return { kind: 'text', text: url }
    case 'embedLink':
      return { kind: 'line', text: `!${markdownLink(url, '')}` }
    case 'connection':
    case 'markdown':
    case 'embedPage':
      return null
    case 'auto':
      return wrappable
        ? { kind: 'link', text: serializeLink(url, over.selection) }
        : linkPaste(url, over.format, over.title)
    case 'inverse':
      return wrappable ? linkPaste(url, over.format, over.title) : null
    default:
      return linkPaste(url, how, over.title)
  }
}
