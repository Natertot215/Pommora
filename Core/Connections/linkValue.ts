import {
  connectionText,
  expressibleInLink,
  keepsAlias,
  parseConnectionText,
  wholeLink,
} from './connections'
import {
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
import type { ConnPage, ConnResolution, PageIndex } from './pageIndex'

export type LinkTarget =
  | { kind: 'page'; syntax: 'wiki' | 'markdown'; title: string; heading?: string; alias?: string }
  | { kind: 'url'; syntax: 'markdown' | 'bare'; url: string; alias?: string }

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

function pageTarget(
  syntax: 'wiki' | 'markdown',
  title: string,
  heading: string | undefined,
  alias: string | undefined,
  res: ConnResolution | undefined,
): LinkTarget | null {
  if (title === '' && !heading) return null
  if (res && res.status !== 'resolved') return null
  const named = title !== '' && res?.page ? res.page.title : title
  return {
    kind: 'page',
    syntax,
    title: named,
    ...(heading ? { heading } : {}),
    ...(alias ? { alias } : {}),
  }
}

export function readLinkText(text: string, resolve?: PageIndex['resolve']): LinkTarget | null {
  const conn = parseConnectionText(text)
  if (conn) return pageTarget('wiki', conn.title, conn.heading, conn.alias, resolve?.(conn.title))
  const s = text.trim()
  const whole = wholeLink(s)
  const md = whole?.syntax === 'markdown' ? whole : null
  const alias = md ? unescapeLabel(s.slice(...md.shown)).trim() || undefined : undefined
  // The halves come from the occurrence; the address is the destination whole.
  const titleHalf = md ? s.slice(...md.title) : s
  const headingHalf = md?.heading ? s.slice(...md.heading) : null
  const dest = headingHalf === null ? titleHalf : `${titleHalf}#${headingHalf}`
  const title = md ? targetTitle(titleHalf, headingHalf !== null) : null
  const res = title === null ? undefined : resolve?.(title)
  if (
    title !== null &&
    (targetNamesFile(titleHalf) || (res ? res.status !== 'phantom' : !isValidLink(dest)))
  )
    return pageTarget(
      'markdown',
      title,
      (headingHalf && targetFragment(headingHalf)) || undefined,
      alias,
      res,
    )
  if (!isValidLink(dest)) return null
  return { kind: 'url', syntax: md ? 'markdown' : 'bare', url: normalizeLinkUrl(dest), alias }
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
  resolve: PageIndex['resolve'],
  was?: string,
): { page: ConnPage; alias: string } | null {
  const target = readLinkText(text, resolve)
  if (target?.kind !== 'page' || !target.alias) return null
  const { alias } = target
  const page = resolve(target.title).page
  if (!page || !keepsAlias(alias, page.title) || showsTarget(alias, target)) return null
  const before = was === undefined ? null : readLinkText(was)
  if (before?.kind === 'page') {
    if (showsTarget(alias, before)) return null
    if (before.alias === alias && resolve(before.title).page?.id === page.id) return null
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
  resolve: PageIndex['resolve'],
  keepTitle: boolean,
): PropertyValue | null | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const next = readLinkText(trimmed, resolve)
  if (!next) return undefined
  const was = current ? readLinkText(current) : null
  return { kind: 'link', value: retarget('wiki', was, next, keepTitle).text }
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
      return target.url
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

const sameTarget = (a: LinkTarget, b: LinkTarget): boolean =>
  a.kind === 'page' && b.kind === 'page'
    ? normalizeTitle(a.title) === normalizeTitle(b.title) &&
      normalizeTitle(a.heading ?? '') === normalizeTitle(b.heading ?? '')
    : a.kind === 'url' && b.kind === 'url' && a.url === b.url

export const keepsShown = (
  container: LinkTarget | null,
  next: LinkTarget,
  keepTitle: boolean,
): boolean => container !== null && (keepTitle || sameTarget(container, next))

export function retarget(
  syntax: 'wiki' | 'markdown',
  container: LinkTarget | null,
  next: LinkTarget,
  keepTitle: boolean,
  into?: { format: LinkDisplay; title?: string },
): LinkPaste {
  const shown =
    next.alias ?? (keepsShown(container, next, keepTitle) ? container?.alias : undefined)
  if (next.kind === 'page') {
    const text =
      syntax === 'wiki' && connectionSpells(next)
        ? connectionText(next.title, next.heading, shown)
        : markdownPageLink(next.title, next.heading, shown)
    return { kind: 'link', text }
  }
  if (shown) return { kind: 'link', text: serializeLink(next.url, shown) }
  return into ? linkPaste(next.url, into.format, into.title) : { kind: 'link', text: next.url }
}
