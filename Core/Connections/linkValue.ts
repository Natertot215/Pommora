import { connectionText, normalizeTitle, parseConnectionText } from './connections'
import {
  MD_LINK,
  escapeAlias,
  isValidLink,
  linkDomain,
  normalizeLinkUrl,
  targetTitle,
  unescapeAlias,
} from './links'
import type { LinkDisplay } from '../Properties/properties'
import type { PropertyValue } from '../Properties/propertyValue'

type LinkValue = { url: string; alias?: string }

export type ResolveTitle = (rawTitle: string) => string | null

export type LinkTarget =
  | { kind: 'page'; title: string; alias?: string }
  | { kind: 'url'; url: string; alias?: string }

export function readLink(raw: string): LinkTarget {
  const conn = parseConnectionText(raw)
  if (conn) return { kind: 'page', title: conn.title, alias: conn.alias }
  const { url, alias } = parseLink(raw)
  return { kind: 'url', url, alias }
}

export function parseLink(raw: string): LinkValue {
  const s = raw.trim()
  const m = MD_LINK.exec(s)
  if (m) return { url: m[2], alias: unescapeAlias(m[1]).trim() || undefined }
  return { url: s }
}

export function serializeLink(v: LinkValue): string {
  return v.alias ? `[${escapeAlias(v.alias)}](${v.url})` : v.url
}

// A title no page answers to names nothing, so the commit is refused as a malformed address is.
function parsePastedLink(text: string, resolve?: ResolveTitle): string | null {
  const named = (rawTitle: string, alias?: string): string | null => {
    const title = resolve?.(rawTitle)
    return title ? connectionText(title, alias) : null
  }
  const conn = parseConnectionText(text)
  if (conn) return named(conn.title, conn.alias)
  const m = MD_LINK.exec(text.trim())
  if (!m) return null
  const alias = unescapeAlias(m[1]).trim() || undefined
  const target = m[2].trim()
  const title = targetTitle(target)
  if (title !== null) return named(title, alias)
  return isValidLink(target) ? serializeLink({ url: normalizeLinkUrl(target), alias }) : null
}

export function isCommittableLink(text: string, resolve?: ResolveTitle): boolean {
  return parsePastedLink(text, resolve) !== null || isValidLink(text)
}

export function urlClickTarget(value: string | undefined): string | null {
  if (!value) return null
  const target = readLink(value)
  return target.kind === 'url' ? target.url || null : null
}

export function linkEditText(raw: string): string {
  const target = readLink(raw)
  return target.kind === 'page' ? connectionText(target.title, target.alias) : target.url
}

export function linkAlias(raw: string): string | undefined {
  return readLink(raw).alias
}

// `null` clears, `undefined` refuses the commit. Only an address carries its alias through an
// edit: its field shows the bare URL, so an alias left off the typed text was never on screen.
export function urlValueFromEdit(
  raw: string,
  current: string | undefined,
  resolve?: ResolveTitle,
): PropertyValue | null | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const pasted = parsePastedLink(trimmed, resolve)
  if (pasted !== null) return { kind: 'url', value: pasted }
  if (!isValidLink(trimmed)) return undefined
  const cur = current ? readLink(current) : undefined
  const alias = cur?.kind === 'url' ? cur.alias : undefined
  return { kind: 'url', value: serializeLink({ url: normalizeLinkUrl(trimmed), alias }) }
}

export function urlValueFromRename(alias: string, current: string): PropertyValue {
  const named = alias.trim() || undefined
  const target = readLink(current)
  return {
    kind: 'url',
    value:
      target.kind === 'page'
        ? connectionText(target.title, named)
        : serializeLink({ url: target.url, alias: named }),
  }
}

// No display means the raw URL: sort and filter must not move when a property's look changes.
export function linkDisplayText(raw: string, display?: LinkDisplay, title?: string): string {
  const target = readLink(raw)
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

export function linkNamesTitle(raw: string, normalizedKey: string): boolean {
  const target = readLink(raw)
  return target.kind === 'page' && normalizeTitle(target.title) === normalizedKey
}
