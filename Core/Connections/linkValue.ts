import {
  keepsAlias,
  type LinkOccurrence,
  type LinkStatus,
  linkOccurrences,
  mayHoldLink,
  namesTarget,
  type PageName,
  pageLinkText,
  targetSpan,
  wholeLink,
} from './connections'
import { codeMask } from '../MarkdownPM/Engine/markdownCode'
import {
  defaultLabel,
  markdownLink,
  targetFragment,
  targetNamesFile,
  targetTitle,
  unescapeLabel,
} from './links'
import { isHttpLink, isValidLink, linkDomain, normalizeLinkUrl } from '../Paths/urlPath'
import { isScalar } from '../Contract/validators'
import { normalizeTitle } from '../Paths/caseFold'
import type { LinkDisplay } from '../Properties/properties'
import type { PropertyValue } from '../Properties/propertyValue'
import type { ConnPage, PageIndex } from './pageIndex'

/** What a link writes. A markdown destination a page could also hold rides the url arm as `page?`, since only resolution decides which it is. */
export type LinkTarget =
  | { kind: 'page'; syntax: 'wiki' | 'markdown'; title: string; heading?: string; shown?: string }
  | {
      kind: 'url'
      syntax: 'markdown' | 'bare'
      url: string
      shown?: string
      page?: PageName
    }

/** What a written link resolves to, through the one index: a page, this document's own heading, an address, or nothing, with why. */
export type ResolvedLink =
  | { kind: 'page'; page: ConnPage; heading?: string }
  | { kind: 'self'; heading: string }
  | { kind: 'url'; url: string }
  | { kind: 'unresolved'; status: Exclude<LinkStatus, 'resolved'> }

/** A `[[Page]]` or `[[Name.ext]]` written unquoted is a nested flow sequence to yaml, not a string; unwrapping single-element arrays reads the connection the author spelled, a title yaml reads as a number or boolean included, so a hand-edit never nulls the value. A reader blind to the key's type asks for `nesting` 2, yaml's least for `[[Page]]`, so a one-item list stays a list. */
export function linkEntry(v: unknown, nesting = 1): string | null {
  if (typeof v === 'string') return v
  let inner: unknown = v
  let depth = 0
  for (; Array.isArray(inner) && inner.length === 1; depth++) inner = inner[0]
  return isScalar(inner) && depth >= nesting ? `[[${inner}]]` : null
}

const writtenPage = (
  syntax: 'wiki' | 'markdown',
  title: string,
  heading: string,
  shown?: string,
): LinkTarget | null =>
  title === '' && !heading
    ? null
    : { kind: 'page', syntax, title, ...(heading ? { heading } : {}), ...(shown ? { shown } : {}) }

/** The one reader of what a link occurrence in `text` writes; the address is kept as written. */
export function readOccurrence(text: string, o: LinkOccurrence): LinkTarget | null {
  const slice = ([s, e]: [number, number]): string => text.slice(s, e).trim()
  const heading = o.heading ? slice(o.heading) : ''
  if (o.syntax === 'wiki')
    return writtenPage('wiki', slice(o.title), heading, o.shown ? slice(o.shown) : undefined)
  const shown = unescapeLabel(slice(o.shown)) || undefined
  const titleHalf = slice(o.title)
  const title = targetTitle(titleHalf, o.heading !== null)
  const fragment = targetFragment(heading)
  const url = slice(targetSpan(o))
  const address = isValidLink(url)
  if (title !== null && (targetNamesFile(titleHalf) || !address))
    return writtenPage('markdown', title, fragment, shown)
  if (!address) return null
  return {
    kind: 'url',
    syntax: 'markdown',
    url,
    shown,
    ...(title === null ? {} : { page: { title, ...(fragment ? { heading: fragment } : {}) } }),
  }
}

export function readLinkText(text: string): LinkTarget | null {
  const s = text.trim()
  const o = wholeLink(s)
  if (o) return readOccurrence(s, o)
  return isValidLink(s) ? { kind: 'url', syntax: 'bare', url: s } : null
}

/** A bare heading names `own`, the page holding a value, and otherwise the document it's written in. */
export const bareHeading = (heading: string, own?: ConnPage): ResolvedLink =>
  own ? { kind: 'page', page: own, heading } : { kind: 'self', heading }

/** The page a written link names: a page link's own target, or the page an address-shaped destination could also hold. */
export const namedPage = (written: LinkTarget | null): PageName | undefined =>
  written?.kind === 'page' ? written : written?.page

/** Page resolution comes first, deliberately: `isValidLink` accepts any dotted host, so a destination `notes.io` would read as a website and the page holding that title would be unreachable. */
export function resolveLink(
  written: LinkTarget | null,
  index: PageIndex | undefined,
  own?: ConnPage,
): ResolvedLink {
  if (!written) return { kind: 'unresolved', status: 'phantom' }
  const unpaged: ResolvedLink =
    written.kind === 'url'
      ? { kind: 'url', url: written.url }
      : { kind: 'unresolved', status: 'phantom' }
  const named = namedPage(written)
  if (!named) return unpaged
  const { title, heading } = named
  if (title === '') return heading ? bareHeading(heading, own) : unpaged
  const res = index?.resolve(title)
  if (res?.page) return { kind: 'page', page: res.page, ...(heading ? { heading } : {}) }
  return res?.status === 'ambiguous' ? { kind: 'unresolved', status: 'ambiguous' } : unpaged
}

/** The label a link shows for the page it names, by what it resolved to: a page link's own target, or the page an address-shaped destination resolved to; an address names none. */
export function pageLabel(written: LinkTarget | null, target: ResolvedLink): string | null {
  const named = written?.kind === 'page' || target.kind === 'page' ? namedPage(written) : undefined
  return named ? defaultLabel(named.title, named.heading) : null
}

/** The wikilink a File value or an asset reference spells, by its title alone; a markdown link to a page is never a file reference. */
export const wikiTitle = (raw: string): string | null => {
  const t = readLinkText(raw)
  return t?.kind === 'page' && t.syntax === 'wiki' ? t.title : null
}

/** The alias a link of either syntax shows for the one page it names, where that page can hold it and it names more than the target. A link naming a heading never remembers: its shown text names the section, not the page. Against `was`, how the link read before, neither the alias it already showed that page nor the target it showed counts: a label kept through a retarget is the old target, not a name given. */
export function shownAlias(
  text: string,
  index: PageIndex,
  was?: string,
): { page: ConnPage; alias: string } | null {
  const written = readLinkText(text)
  const target = resolveLink(written, index)
  const alias = written?.shown
  if (target.kind !== 'page' || target.heading || !alias || !keepsAlias(alias, target.page.title))
    return null
  const { page } = target
  const wasWritten = was === undefined ? null : readLinkText(was)
  const named = namedPage(wasWritten)
  if (named && namesTarget(alias, named)) return null
  const before = resolveLink(wasWritten, index)
  if (wasWritten?.shown === alias && before.kind === 'page' && before.page.id === page.id)
    return null
  return { page, alias }
}

/** A written link as the page it resolves to, written by that page's own title in the syntax it came in (a value's bare heading keeps its empty title); anything else as written. */
export function resolvedTarget(
  written: LinkTarget,
  index: PageIndex | undefined,
  own?: ConnPage,
): LinkTarget {
  const target = resolveLink(written, index, own)
  const named = namedPage(written)
  if (target.kind !== 'page' || !named) return written
  return {
    kind: 'page',
    syntax: written.syntax === 'wiki' ? 'wiki' : 'markdown',
    title: named.title === '' ? '' : target.page.title,
    ...(target.heading ? { heading: target.heading } : {}),
    ...(written.shown ? { shown: written.shown } : {}),
  }
}

export function serializeLink(url: string, label?: string): string {
  return label ? markdownLink(url, label) : url
}

/** A Link value as the field wrote it: the page it resolves to, by title, as a wikilink wherever one spells; an address under its scheme; nothing a page or an address answers for is refused. */
export function linkValueFromEdit(
  raw: string,
  index: PageIndex | undefined,
  own: ConnPage | undefined,
): PropertyValue | null | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const written = readLinkText(trimmed)
  const target = resolveLink(written, index, own)
  if (!written || (target.kind !== 'page' && target.kind !== 'url')) return undefined
  return { kind: 'link', value: retarget('wiki', resolvedTarget(written, index, own)).text }
}

/** What a written link shows: its alias, a markdown link's default label, a wikilink's title, heading, or `Title § Heading`, or an address under its display; a markdown heading link shows the heading alone because its default label is what it draws, where a wikilink shows `Title § Heading`, the Heading Link Style's default, since display text carries no style; no display means the raw address, so sort and filter never move when a property's look changes. */
export function linkDisplayText(raw: string, display?: LinkDisplay, title?: string): string {
  const target = readLinkText(raw)
  if (!target) return raw
  if (target.shown) return target.shown
  if (target.kind === 'page') {
    if (target.syntax === 'markdown') return defaultLabel(target.title, target.heading)
    if (!target.heading) return target.title
    return target.title ? `${target.title} § ${target.heading}` : target.heading
  }
  switch (display) {
    case 'link-title':
      return title ?? linkDomain(target.url)
    case 'link-short':
      return linkDomain(target.url)
    default:
      return normalizeLinkUrl(target.url)
  }
}

/** A text with each connection replaced by what it shows, so a Text value sorts and filters as it reads. */
export function shownProse(text: string): string {
  if (!mayHoldLink(text)) return text
  let out = ''
  let at = 0
  for (const o of linkOccurrences(text, codeMask(text))) {
    out += text.slice(at, o.full[0]) + linkDisplayText(text.slice(o.full[0], o.full[1]))
    at = o.full[1]
  }
  return out + text.slice(at)
}

export interface LinkPaste {
  kind: 'link'
  text: string
  awaits?: string
}

/** The editor's deferred title rewrite reads this same function once its fetch lands, so a paste and its swap-in can never disagree about the form. */
export function linkMarkdown(url: string, display: LinkDisplay, title?: string): string {
  return serializeLink(url, linkDisplayText(url, display, title))
}

/** Every writer of a formatted link — paste, Paste As, Format rewrite — comes through here, so a link waiting on a title is announced the same way regardless of how it came to be. */
export function linkPaste(url: string, display: LinkDisplay, title?: string): LinkPaste {
  const text = linkMarkdown(url, display, title)
  const awaits = display === 'link-title' && title === undefined && isHttpLink(url)
  return awaits ? { kind: 'link', text, awaits: url } : { kind: 'link', text }
}

const sameTarget = (a: ResolvedLink, b: ResolvedLink): boolean => {
  if (a.kind === 'page' && b.kind === 'page')
    return (
      a.page.id === b.page.id && normalizeTitle(a.heading ?? '') === normalizeTitle(b.heading ?? '')
    )
  if (a.kind === 'self' && b.kind === 'self')
    return normalizeTitle(a.heading) === normalizeTitle(b.heading)
  return a.kind === 'url' && b.kind === 'url' && normalizeLinkUrl(a.url) === normalizeLinkUrl(b.url)
}

/** Whether a retarget keeps the link's shown text: always with Remove Title On Link Change off, and otherwise only where the link pointed somewhere as it read before the edit (`baseline`, null for a link that never closed) and is being re-aimed elsewhere. */
export function keepsShown(
  baseline: LinkTarget | null,
  next: LinkTarget,
  removeTitle: boolean,
  index?: PageIndex,
): boolean {
  if (!removeTitle || baseline === null) return true
  const was = resolveLink(baseline, index)
  return was.kind === 'unresolved' || sameTarget(was, resolveLink(next, index))
}

/** Writes a link to `next` in the syntax asked for, through the one page writer; whether an earlier alias rides along is `keepsShown`'s decision, folded into `next.shown` by the caller. */
export function retarget(
  syntax: 'wiki' | 'markdown',
  next: LinkTarget,
  into?: { format: LinkDisplay; title?: string },
): LinkPaste {
  if (next.kind === 'page') return { kind: 'link', text: pageLinkText(next, syntax) }
  const url = normalizeLinkUrl(next.url)
  if (next.shown) return { kind: 'link', text: serializeLink(url, next.shown) }
  return into ? linkPaste(url, into.format, into.title) : { kind: 'link', text: url }
}
