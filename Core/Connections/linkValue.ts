import {
  connectionText,
  expressibleInLink,
  keepsAlias,
  type LinkOccurrence,
  type LinkStatus,
  targetSpan,
  wholeLink,
} from './connections'
import {
  defaultLabel,
  markdownLink,
  markdownPageLink,
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
  | { kind: 'page'; syntax: 'wiki' | 'markdown'; title: string; heading?: string; alias?: string }
  | {
      kind: 'url'
      syntax: 'markdown' | 'bare'
      url: string
      alias?: string
      page?: { title: string; heading?: string }
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

/** The link a whole key value spells — a string, or an unquoted `[[Page]]` — or `null` for any other shape. */
export function wholeValueLink(v: unknown): LinkTarget | null {
  const entry = linkEntry(v, 2)
  return entry === null ? null : readLinkText(entry)
}

const writtenPage = (
  syntax: 'wiki' | 'markdown',
  title: string,
  heading: string,
  alias?: string,
): LinkTarget | null =>
  title === '' && !heading
    ? null
    : { kind: 'page', syntax, title, ...(heading ? { heading } : {}), ...(alias ? { alias } : {}) }

/** The one reader of what a link occurrence in `text` writes; the address is kept as written. */
export function readOccurrence(text: string, o: LinkOccurrence): LinkTarget | null {
  const slice = ([s, e]: [number, number]): string => text.slice(s, e).trim()
  const heading = o.heading ? slice(o.heading) : ''
  if (o.syntax === 'wiki')
    return writtenPage('wiki', slice(o.title), heading, o.shown ? slice(o.shown) : undefined)
  const alias = unescapeLabel(slice(o.shown)) || undefined
  const titleHalf = slice(o.title)
  const title = targetTitle(titleHalf, o.heading !== null)
  const fragment = targetFragment(heading)
  const url = slice(targetSpan(o))
  const address = isValidLink(url)
  if (title !== null && (targetNamesFile(titleHalf) || !address))
    return writtenPage('markdown', title, fragment, alias)
  if (!address) return null
  return {
    kind: 'url',
    syntax: 'markdown',
    url,
    alias,
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
  const named = written.kind === 'url' ? written.page : written
  if (!named) return unpaged
  const { title, heading } = named
  if (title === '') return heading ? bareHeading(heading, own) : unpaged
  const res = index?.resolve(title)
  if (res?.page) return { kind: 'page', page: res.page, ...(heading ? { heading } : {}) }
  return res?.status === 'ambiguous' ? { kind: 'unresolved', status: 'ambiguous' } : unpaged
}

/** The label a link shows for the page it names, by what it resolved to: a page link's own target, or the page an address-shaped destination resolved to; an address names none. */
export function pageLabel(written: LinkTarget | null, target: ResolvedLink): string | null {
  const named =
    written?.kind === 'page' ? written : target.kind === 'page' ? written?.page : undefined
  return named ? defaultLabel(named.title, named.heading) : null
}

/** The wikilink a File value or an asset reference spells, by its title alone; a markdown link to a page is never a file reference. */
export const wikiTitle = (raw: string): string | null => {
  const t = readLinkText(raw)
  return t?.kind === 'page' && t.syntax === 'wiki' ? t.title : null
}

/** Whether a link's shown text only names what it targets — the page's title or the heading, as a picked link's default label does — rather than giving it a name. */
export function showsTarget(shown: string, target: { title: string; heading?: string }): boolean {
  const key = normalizeTitle(shown)
  return (
    key === normalizeTitle(target.title) ||
    (!!target.heading && key === normalizeTitle(target.heading))
  )
}

/** The alias a link of either syntax shows for the one page it names, where that page can hold it and it names more than the target. Against `was`, how the link read before, neither the alias it already showed that page nor the target it showed counts: a label kept through a retarget is the old target, not a name given. */
export function shownAlias(
  text: string,
  index: PageIndex,
  was?: string,
): { page: ConnPage; alias: string } | null {
  const written = readLinkText(text)
  const target = resolveLink(written, index)
  const alias = written?.alias
  if (target.kind !== 'page' || !alias) return null
  const { page, heading } = target
  if (!keepsAlias(alias, page.title) || showsTarget(alias, { title: page.title, heading }))
    return null
  const before = was === undefined ? null : readLinkText(was)
  if (before?.kind === 'page') {
    if (showsTarget(alias, before)) return null
    if (before.alias === alias && index.resolve(before.title).page?.id === page.id) return null
  }
  return { page, alias }
}

export function serializeLink(url: string, label?: string): string {
  return label ? markdownLink(url, label) : url
}

export function linkEditText(raw: string): string {
  const target = readLinkText(raw)
  if (!target) return raw
  return target.kind === 'page' ? connectionText(target.title, target.heading) : target.url
}

export function linkValueFromEdit(
  raw: string,
  current: string | undefined,
  index: PageIndex | undefined,
  own: ConnPage | undefined,
  keepTitle: boolean,
): PropertyValue | null | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const written = readLinkText(trimmed)
  const target = resolveLink(written, index, own)
  if (!written || (target.kind !== 'page' && target.kind !== 'url')) return undefined
  // A resolved page is written by its own title; a value's bare heading keeps its empty title.
  const bare = written.kind === 'page' && written.title === ''
  const next: LinkTarget =
    target.kind === 'url'
      ? written
      : {
          kind: 'page',
          syntax: 'wiki',
          title: bare ? '' : target.page.title,
          heading: target.heading,
          alias: written.alias,
        }
  const was = current ? readLinkText(current) : null
  return { kind: 'link', value: retarget('wiki', was, next, !keepTitle, index).text }
}

export function linkValueFromRename(alias: string, current: string): PropertyValue {
  const named = alias.trim() || undefined
  const target = readLinkText(current)
  if (!target) return { kind: 'link', value: current }
  const syntax = target.syntax === 'wiki' ? 'wiki' : 'markdown'
  return { kind: 'link', value: retarget(syntax, null, { ...target, alias: named }, false).text }
}

// No display means the raw URL: sort and filter must not move when a property's look changes.
export function linkDisplayText(raw: string, display?: LinkDisplay, title?: string): string {
  const target = readLinkText(raw)
  if (!target) return raw
  if (target.alias) return target.alias
  if (target.kind === 'page') return target.title
  switch (display) {
    case 'link-title':
      return title ?? linkDomain(target.url)
    case 'link-short':
      return linkDomain(target.url)
    default:
      return normalizeLinkUrl(target.url)
  }
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

export const connectionSpells = (target: { title: string; heading?: string }): boolean =>
  expressibleInLink(target.title) && (!target.heading || expressibleInLink(target.heading))

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

export function retarget(
  syntax: 'wiki' | 'markdown',
  baseline: LinkTarget | null,
  next: LinkTarget,
  removeTitle: boolean,
  index?: PageIndex,
  into?: { format: LinkDisplay; title?: string },
): LinkPaste {
  const shown =
    next.alias ?? (keepsShown(baseline, next, removeTitle, index) ? baseline?.alias : undefined)
  if (next.kind === 'page') {
    const text =
      syntax === 'wiki' && connectionSpells(next)
        ? connectionText(next.title, next.heading, shown)
        : markdownPageLink(next.title, next.heading, shown)
    return { kind: 'link', text }
  }
  const url = normalizeLinkUrl(next.url)
  if (shown) return { kind: 'link', text: serializeLink(url, shown) }
  return into ? linkPaste(url, into.format, into.title) : { kind: 'link', text: url }
}
