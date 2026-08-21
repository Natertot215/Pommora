// What the clipboard can be pasted as. The nexus-wide default decides what ⌘V does and the chord
// does the other thing; this is how one paste departs from both without touching a setting.
//
// The offer is read off the clipboard's text alone — no page index and no round trip — because every
// shape that has anything to offer says what it is: an address is an address, and a page arrives as
// the `[[Title]]` its own Copy Link puts there.

import { embeddableTitle, pageEmbedText, pageLinkPattern } from './connections'
import { MD_LINK, encodeLinkTarget, hasWebScheme, isValidLink, targetTitle } from './links'
import { serializeLink } from './linkValue'
import { pageLinkText } from './pageMenu'
import { linkPaste, type LinkPaste } from './PasteLink'
import { LINK_DISPLAY_LABELS, LINK_DISPLAYS, type LinkDisplay } from './properties'
import { composeWebpageEmbedLine } from './webpageEmbed'

/** The three link forms, plus the address bare, the two syntaxes that reach a page, the two
 *  lone-line embeds, and the footnote — every form whose placement is a question. */
export type PasteAsForm =
  | LinkDisplay
  | 'plain'
  | 'connection'
  | 'markdown'
  | 'embedPage'
  | 'embedLink'
  | 'footnote'

/** What a chosen form's action id is spelled with, so main names it and the renderer reads it back
 *  from the one place. */
export const PASTE_AS_PREFIX = 'pasteAs:'

/** What the clipboard names, or null where it names nothing this menu can act on. */
export type PasteAsTarget = { kind: 'url'; url: string } | { kind: 'page'; title: string } | null

/** The whole clipboard as one wikilink, or null. Anything around it makes the text prose that
 *  happens to contain a connection. */
function wholeWikiLink(s: string): string | null {
  const m = pageLinkPattern().exec(s)
  return m && m[0] === s ? m[1] : null
}

export function pasteAsTarget(clipboard: string): PasteAsTarget {
  const s = clipboard.trim()
  // Every form writes one line, so a clipboard carrying more than one is prose whatever its first
  // line looks like.
  if (!s || /[\r\n]/.test(s)) return null

  const wiki = wholeWikiLink(s)
  if (wiki !== null) return { kind: 'page', title: wiki }

  // A markdown link is offered what its target names rather than what its syntax is — the rule the
  // editor's own link menu already follows. Its label is not carried through: both forms below name
  // the page, and all four url forms are about the address.
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

/** Whether the clipboard can be spelled as an embed at all, placement aside: `![[…]]` has no way to
 *  carry a `]`, and a tile forms only over an explicit http(s) address. */
function embeddableTarget(target: NonNullable<PasteAsTarget>): boolean {
  return target.kind === 'page' ? embeddableTitle(target.title) : hasWebScheme(target.url)
}

/** The forms this clipboard can take, in the order they are offered. Empty means no submenu at all,
 *  rather than one shown with nothing in it. Each placement-bound form is gated on its own seat —
 *  the embeds on a blank line the token can have to itself, the footnote on a spot a marker can bind
 *  from. Off a seat the lists read exactly as they did before those forms existed. */
export function pasteAsRows(
  clipboard: string,
  embedSeat: boolean,
  citeSeat: boolean,
): readonly PasteAsRow[] {
  // Footnote answers to the clipboard alone, not to `pasteAsTarget`: every other form writes one
  // line, so that reader refuses a clipboard holding a newline — and a multi-paragraph clipboard is
  // exactly what the footnote's normalization exists for.
  const footnote = citeSeat && clipboard.trim() !== '' ? [FOOTNOTE_ROW] : []
  const target = pasteAsTarget(clipboard)
  if (!target) return footnote
  const page = target.kind === 'page'
  const embed = embedSeat && embeddableTarget(target)
  const rows = page ? PAGE_ROWS : URL_ROWS
  const embedRow = page ? PAGE_EMBED_ROW : URL_EMBED_ROW
  return [...footnote, ...rows, ...(embed ? [embedRow] : [])]
}

/** Text to insert as-is, where no title can be pending. */
export interface TextPaste {
  kind: 'text'
  text: string
}

/** A construct that takes the caret's whole line — the writer replaces the line rather than the
 *  selection, so a caret sitting after stray whitespace can't leave the token indented, which the
 *  two embed grammars read as prose. */
export interface LinePaste {
  kind: 'line'
  text: string
}

/** What `form` writes for `target`, or null where the two don't belong together — a menu can be held
 *  open while the clipboard changes underneath it. The three link forms come back as the same shape
 *  a formatted paste does, so a Page Title chosen here defers to the fetch exactly as one pasted does. */
export function pasteAsWrite(
  target: PasteAsTarget,
  form: PasteAsForm,
  title?: string,
): LinkPaste | TextPaste | LinePaste | null {
  // A footnote is two disjoint sites — a marker and a citation — so the caller forks ahead of this
  // single-range writer rather than asking it for text it has no way to spell.
  if (!target || form === 'footnote') return null
  if ((form === 'embedPage' || form === 'embedLink') && !embeddableTarget(target)) return null
  if (target.kind === 'page') {
    if (form === 'connection') return { kind: 'text', text: pageLinkText(target.title) }
    if (form === 'embedPage') return { kind: 'line', text: pageEmbedText(target.title) }
    // Through the serializer, so a title carrying `]` is escaped by the one writer that knows how —
    // spelled inline, `Notes [WIP]` would compose a link that tokenizes as nothing at all.
    if (form === 'markdown')
      return {
        kind: 'text',
        text: serializeLink({ url: encodeLinkTarget(target.title), alias: target.title }),
      }
    return null
  }
  if (form === 'plain') return { kind: 'text', text: target.url }
  // The tile's own label is left empty: a pasted address has no words of its own, and an empty label
  // is what defers the display to the nexus's link format at render.
  if (form === 'embedLink') return { kind: 'line', text: composeWebpageEmbedLine('', target.url) }
  if (form === 'connection' || form === 'markdown' || form === 'embedPage') return null
  return linkPaste(target.url, form, title)
}
