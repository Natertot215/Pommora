import { HAS_SCHEME, WEB_ADDRESS } from '../Locations/url'
import { normalizeTitle } from './connections'

export const hasWebScheme = (url: string): boolean => WEB_ADDRESS.test(url)

export const LINK_RESOLVE_TIMEOUT_MS = 6000

export const MD_LINK = /^\[((?:[^\]\\]|\\.)*)\]\((.*)\)$/

// The label's cap is load-bearing: reading escapes makes it an alternation under a quantifier, which backtracks quadratically on a long run of unclosed `[`. A label may not open with `^` because GFM reads `[^1](url)` as a footnote reference. The target admits parentheses nested two deep, what cmark renders.
const LINK_LABEL = (min: 0 | 1): string => `((?!\\^)(?:[^\\]\\\\\\r\\n]|\\\\.){${min},255})`
const LINK_DEST = (min: 0 | 1): string =>
  `((?:[^()\\r\\n]|\\((?:[^()\\r\\n]|\\([^()\\r\\n]*\\))*\\)){${min},2048})`

export const markdownLinkRegex = (): RegExp =>
  new RegExp(`\\[${LINK_LABEL(1)}\\]\\(${LINK_DEST(1)}\\)`, 'dg')

export const emptyTolerantLinkRegex = (): RegExp =>
  new RegExp(`\\[${LINK_LABEL(0)}\\]\\(${LINK_DEST(0)}\\)`, 'dg')

export function escapeAlias(alias: string): string {
  return alias.replace(/[\\\]]/g, '\\$&')
}

export function unescapeAlias(alias: string): string {
  return alias.replace(/\\(.)/g, '$1')
}

// `encodeURI` leaves parens and colons alone; a raw colon declares a target a URL and a lone `(` leaves the link untokenizable, so both are escaped on top. A lone surrogate makes encodeURI throw, and the rename cascade calls this unwrapped.
export function encodeLinkTarget(target: string): string {
  try {
    return encodeURI(target).replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/:/g, '%3A')
  } catch {
    return target
  }
}

// `decodeURIComponent` throws on a lone `%`, and CodeMirror deactivates a throwing ViewPlugin.
export function decodeLinkTarget(target: string): string {
  try {
    return decodeURIComponent(target)
  } catch {
    return target
  }
}

// Read on the raw target: a URL's scheme and separators are literal, while an encoded page title spells them out.
export function targetTitle(rawTarget: string): string | null {
  const raw = rawTarget.trim()
  if (!raw || raw.includes('/') || HAS_SCHEME.test(raw)) return null
  const decoded = decodeLinkTarget(raw).trim()
  return decoded ? decoded.replace(/\.md$/i, '') : null
}

export function targetNamesTitle(rawTarget: string, normalizedKey: string): boolean {
  const named = targetTitle(rawTarget)
  return named !== null && normalizeTitle(named) === normalizedKey
}

export function normalizeLinkUrl(url: string): string {
  const u = url.trim()
  return HAS_SCHEME.test(u) ? u : `https://${u}`
}

export function linkDomain(url: string): string {
  try {
    return new URL(normalizeLinkUrl(url)).hostname.replace(/^www\./i, '') || url.trim()
  } catch {
    return url.trim()
  }
}

export function isHttpLink(url: string): boolean {
  return isValidLink(url) && hasWebScheme(normalizeLinkUrl(url))
}

export function isValidLink(url: string): boolean {
  const u = url.trim()
  if (!u || /\s/.test(u)) return false
  const n = normalizeLinkUrl(u)
  if (/^mailto:/i.test(n)) return /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(n)
  if (!hasWebScheme(n)) return false
  try {
    const host = new URL(n).hostname
    return host.length > 2 && host.includes('.') && !host.startsWith('.') && !host.endsWith('.')
  } catch {
    return false
  }
}
