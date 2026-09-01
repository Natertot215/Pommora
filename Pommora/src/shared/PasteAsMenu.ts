// How one paste departs from the nexus-wide ⌘V default without touching a setting. The offer is
// read off the clipboard's text alone — no page index, no round trip — since an address is an
// address, and a page arrives as the `[[Title]]` its own Copy Link puts there.

import { embeddableTitle, pageEmbedText, pageLinkPattern } from './connections'
import { MD_LINK, encodeLinkTarget, hasWebScheme, isValidLink, targetTitle } from './links'
import { serializeLink } from './linkValue'
import { pageLinkText } from './pageMenu'
import { linkPaste, type LinkPaste } from './PasteLink'
import { LINK_DISPLAY_LABELS, LINK_DISPLAYS, type LinkDisplay } from './properties'
import { composeWebpageEmbedLine } from './webpageEmbed'

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

/** The whole clipboard as one wikilink, or null — anything around it makes it prose that happens
 *  to contain a connection. */
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

/** Empty means no submenu, not one shown empty. Each placement-bound form is gated on its own
 *  seat — embeds need a blank line to themselves, the footnote a spot a marker can bind from. */
export function pasteAsRows(
  clipboard: string,
  embedSeat: boolean,
  citeSeat: boolean,
): readonly PasteAsRow[] {
  // Footnote answers to the clipboard alone, not `pasteAsTarget`: that reader refuses a newline,
  // but a multi-paragraph clipboard is exactly what the footnote's normalization is for.
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

/** Replaces the caret's whole line rather than the selection, so stray leading whitespace can't
 *  leave the token indented, which the two embed grammars read as prose. */
export interface LinePaste {
  kind: 'line'
  text: string
}

/** Null where `target`/`form` don't belong together — a menu can stay open while the clipboard
 *  changes underneath it. The three link forms return the same shape a formatted paste does, so
 *  a Page Title chosen here defers to the fetch exactly as one pasted does. */
export function pasteAsWrite(
  target: PasteAsTarget,
  form: PasteAsForm,
  title?: string,
): LinkPaste | TextPaste | LinePaste | null {
  // A footnote is two disjoint sites — a marker and a citation — so the caller forks ahead of this
  // single-range writer rather than ask it for text it can't spell.
  if (!target || form === 'footnote') return null
  if ((form === 'embedPage' || form === 'embedLink') && !embeddableTarget(target)) return null
  if (target.kind === 'page') {
    if (form === 'connection') return { kind: 'text', text: pageLinkText(target.title) }
    if (form === 'embedPage') return { kind: 'line', text: pageEmbedText(target.title) }
    // Through the serializer so a title carrying `]` gets escaped — spelled inline, `Notes [WIP]`
    // would compose a link that tokenizes as nothing at all.
    if (form === 'markdown')
      return {
        kind: 'text',
        text: serializeLink({ url: encodeLinkTarget(target.title), alias: target.title }),
      }
    return null
  }
  if (form === 'plain') return { kind: 'text', text: target.url }
  // Label left empty: a pasted address has no words of its own, and an empty label defers display
  // to the nexus's link format at render.
  if (form === 'embedLink') return { kind: 'line', text: composeWebpageEmbedLine('', target.url) }
  if (form === 'connection' || form === 'markdown' || form === 'embedPage') return null
  return linkPaste(target.url, form, title)
}
