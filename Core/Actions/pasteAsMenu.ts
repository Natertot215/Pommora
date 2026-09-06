// How one paste departs from the nexus-wide ⌘V default without touching a setting. Read off the
// clipboard's text alone — no page index, no round trip.

import { embeddableTitle, pageEmbedText, pageLinkPattern } from '../Connections/connections'
import {
  MD_LINK,
  encodeLinkTarget,
  hasWebScheme,
  isValidLink,
  targetTitle,
} from '../Connections/links'
import { serializeLink } from '../Connections/linkValue'
import { pageLinkText } from './pageMenu'
import { linkPaste, type LinkPaste } from '../Web/pasteLink'
import { LINK_DISPLAY_LABELS, LINK_DISPLAYS, type LinkDisplay } from '../Properties/properties'
import { composeWebpageEmbedLine } from '../Web/webpageEmbed'

export type PasteAsForm =
  | LinkDisplay
  | 'plain'
  | 'connection'
  | 'markdown'
  | 'embedPage'
  | 'embedLink'
  | 'footnote'

export const PASTE_AS_PREFIX = 'pasteAs:'

export type PasteAsTarget = { kind: 'url'; url: string } | { kind: 'page'; title: string } | null

/** Null unless the whole clipboard IS the wikilink; anything around it is prose. */
function wholeWikiLink(s: string): string | null {
  const m = pageLinkPattern().exec(s)
  return m && m[0] === s ? m[1] : null
}

export function pasteAsTarget(clipboard: string): PasteAsTarget {
  const s = clipboard.trim()
  // Every form writes one line, so more than one is prose regardless of the first line.
  if (!s || /[\r\n]/.test(s)) return null

  const wiki = wholeWikiLink(s)
  if (wiki !== null) return { kind: 'page', title: wiki }

  // Offered by what its target names, not its syntax — the editor's own link menu rule.
  const md = MD_LINK.exec(s)
  const raw = md ? md[2].trim() : s
  const title = targetTitle(raw)
  if (md && title !== null) return { kind: 'page', title }
  return isValidLink(raw) ? { kind: 'url', url: raw } : null
}

export interface PasteAsRow {
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
function embeddableTarget(target: NonNullable<PasteAsTarget>): boolean {
  return target.kind === 'page' ? embeddableTitle(target.title) : hasWebScheme(target.url)
}

/** Empty means no submenu, not one shown empty; each form is gated on its own seat. */
export function pasteAsRows(
  clipboard: string,
  embedSeat: boolean,
  citeSeat: boolean,
): readonly PasteAsRow[] {
  // Footnote reads the clipboard, not `pasteAsTarget`: that reader refuses the newline a
  // multi-paragraph clipboard carries, which is exactly what the footnote normalizes.
  const footnote = citeSeat && clipboard.trim() !== '' ? [FOOTNOTE_ROW] : []
  const target = pasteAsTarget(clipboard)
  if (!target) return footnote
  const page = target.kind === 'page'
  const embed = embedSeat && embeddableTarget(target)
  const rows = page ? PAGE_ROWS : URL_ROWS
  const embedRow = page ? PAGE_EMBED_ROW : URL_EMBED_ROW
  return [...footnote, ...rows, ...(embed ? [embedRow] : [])]
}

export interface TextPaste {
  kind: 'text'
  text: string
}

/** The whole line, not the selection: leading whitespace would indent the token into prose. */
export interface LinePaste {
  kind: 'line'
  text: string
}

/** Null where `target` and `form` don't belong together, since a menu can stay open while the
 *  clipboard changes under it. The link forms return what a formatted paste returns. */
export function pasteAsWrite(
  target: PasteAsTarget,
  form: PasteAsForm,
  title?: string,
): LinkPaste | TextPaste | LinePaste | null {
  // A footnote writes two disjoint sites, so the caller forks ahead of this single-range writer.
  if (!target || form === 'footnote') return null
  if ((form === 'embedPage' || form === 'embedLink') && !embeddableTarget(target)) return null
  if (target.kind === 'page') {
    if (form === 'connection') return { kind: 'text', text: pageLinkText(target.title) }
    if (form === 'embedPage') return { kind: 'line', text: pageEmbedText(target.title) }
    // Through the serializer so a `]` escapes: inline, `Notes [WIP]` tokenizes as nothing.
    if (form === 'markdown')
      return {
        kind: 'text',
        text: serializeLink({ url: encodeLinkTarget(target.title), alias: target.title }),
      }
    return null
  }
  if (form === 'plain') return { kind: 'text', text: target.url }
  // Left empty: a pasted address has no words, so display defers to the link format at render.
  if (form === 'embedLink') return { kind: 'line', text: composeWebpageEmbedLine('', target.url) }
  if (form === 'connection' || form === 'markdown' || form === 'embedPage') return null
  return linkPaste(target.url, form, title)
}
