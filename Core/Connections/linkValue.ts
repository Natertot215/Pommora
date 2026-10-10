import { connectionText, parseConnectionText, wholeLink } from './connections'
import { escapeAlias, markdownPageLink, targetFragment, targetTitle, unescapeAlias } from './links'
import { isValidLink, linkDomain, normalizeLinkUrl } from '../Paths/urlPath'
import type { LinkDisplay } from '../Properties/properties'
import type { PropertyValue } from '../Properties/propertyValue'
import type { ConnResolution, PageIndex } from './pageIndex'

export type ResolveTitle = (rawTitle: string) => string | null

export type LinkTarget =
  | { kind: 'page'; syntax: 'wiki' | 'markdown'; title: string; heading?: string; alias?: string }
  | { kind: 'url'; syntax: 'markdown' | 'bare'; url: string; alias?: string }

/** A `[[Page]]` or `[[Name.ext]]` written unquoted is a nested flow sequence to yaml, not a string; unwrapping single-element arrays reads the connection the author spelled, so a hand-edit never nulls the value. A reader blind to the key's type asks for `nesting` 2, yaml's least for `[[Page]]`, so a one-item list stays a list. */
export function linkEntry(v: unknown, nesting = 1): string | null {
  if (typeof v === 'string') return v
  let inner: unknown = v
  let depth = 0
  for (; Array.isArray(inner) && inner.length === 1; depth++) inner = inner[0]
  return typeof inner === 'string' && depth >= nesting ? `[[${inner}]]` : null
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
  const alias = md
    ? unescapeAlias(s.slice(md.label[0], md.label[1])).trim() || undefined
    : undefined
  const dest = md ? s.slice(md.destination[0], md.destination[1]).trim() : s
  const title = md ? targetTitle(dest) : null
  const res = title === null ? undefined : resolve?.(title)
  if (title !== null && (res ? res.status !== 'phantom' : !isValidLink(dest)))
    return pageTarget('markdown', title, targetFragment(dest) || undefined, alias, res)
  if (!isValidLink(dest)) return null
  return { kind: 'url', syntax: md ? 'markdown' : 'bare', url: normalizeLinkUrl(dest), alias }
}

export function serializeLink(url: string, label?: string): string {
  return label ? `[${escapeAlias(label)}](${url})` : url
}

function parsePastedLink(text: string, resolve?: ResolveTitle): string | null {
  const named = (rawTitle: string, alias?: string, heading?: string): string | null => {
    const title = resolve?.(rawTitle)
    return title ? connectionText(title, alias, heading) : null
  }
  const conn = parseConnectionText(text)
  if (conn) return named(conn.title, conn.alias, conn.heading)
  const s = text.trim()
  const md = wholeLink(s)
  if (md?.syntax !== 'markdown') return null
  const alias = unescapeAlias(s.slice(md.label[0], md.label[1])).trim() || undefined
  const target = s.slice(md.destination[0], md.destination[1]).trim()
  const title = targetTitle(target)
  if (title !== null) return named(title, alias, targetFragment(target) || undefined)
  return isValidLink(target) ? serializeLink(normalizeLinkUrl(target), alias) : null
}

export function urlClickTarget(value: string | undefined): string | null {
  if (!value) return null
  const target = readLinkText(value)
  return target?.kind === 'url' ? target.url : null
}

export function linkEditText(raw: string): string {
  const target = readLinkText(raw)
  if (!target) return raw
  return target.kind === 'page'
    ? connectionText(target.title, undefined, target.heading)
    : target.url
}

// `null` clears, `undefined` refuses the commit. Only an address carries its alias through an edit: its field shows the bare URL, so an alias left off the typed text was never on screen.
export function linkValueFromEdit(
  raw: string,
  current: string | undefined,
  resolve?: ResolveTitle,
): PropertyValue | null | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const pasted = parsePastedLink(trimmed, resolve)
  if (pasted !== null) return { kind: 'link', value: pasted }
  if (!isValidLink(trimmed)) return undefined
  const cur = current ? readLinkText(current) : null
  const alias = cur?.kind === 'url' ? cur.alias : undefined
  return { kind: 'link', value: serializeLink(normalizeLinkUrl(trimmed), alias) }
}

export function linkValueFromRename(alias: string, current: string): PropertyValue {
  const named = alias.trim() || undefined
  const target = readLinkText(current)
  if (!target) return { kind: 'link', value: current }
  return {
    kind: 'link',
    value:
      target.kind === 'url'
        ? serializeLink(target.url, named)
        : target.syntax === 'wiki'
          ? connectionText(target.title, named, target.heading)
          : markdownPageLink(target.title, target.heading, named),
  }
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
  target: string
  wantsTitle: boolean
}

/** The editor's deferred title rewrite reads this same function once its fetch lands, so a paste and its swap-in can never disagree about the form. */
export function linkMarkdown(url: string, display: LinkDisplay, title?: string): string {
  return serializeLink(url, linkDisplayText(url, display, title))
}

/** Every writer of a formatted link — paste, Paste As, Format rewrite — comes through here, so a link waiting on a title is announced the same way regardless of how it came to be. */
export function linkPaste(url: string, display: LinkDisplay, title?: string): LinkPaste {
  return {
    kind: 'link',
    text: linkMarkdown(url, display, title),
    target: url,
    wantsTitle: display === 'link-title' && title === undefined,
  }
}
