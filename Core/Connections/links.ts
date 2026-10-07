import { HAS_SCHEME } from '../Paths/urlPath'
import { normalizeTitle } from '../Paths/caseFold'
import { stripMarkdownExt } from '../Paths/posix'

export const MD_LINK = /^\[((?:[^\]\\]|\\.)*)\]\((.*)\)$/

// The label's cap is load-bearing: reading escapes makes it an alternation under a quantifier, which backtracks quadratically on a long run of unclosed `[`. A label may not open with `^` because GFM reads `[^1](url)` as a footnote reference. The target admits parentheses nested two deep, what cmark renders.
const LINK_LABEL = (min: 0 | 1): string => `((?!\\^)(?:[^\\]\\\\\\r\\n]|\\\\.){${min},255})`
const LINK_DEST = (min: 0 | 1): string =>
  `((?:[^()\\r\\n]|\\((?:[^()\\r\\n]|\\([^()\\r\\n]*\\))*\\)){${min},2048})`

export const markdownLinkRegex = (): RegExp =>
  new RegExp(`\\[${LINK_LABEL(1)}\\]\\(${LINK_DEST(1)}\\)`, 'dg')

/** Every other link grammar refuses empty halves, so the surfaces that recognize a link mid-authoring read this one. */
export const emptyTolerantLinkRegex = (): RegExp =>
  new RegExp(`\\[${LINK_LABEL(0)}\\]\\(${LINK_DEST(0)}\\)`, 'dg')

export function escapeAlias(alias: string): string {
  return alias.replace(/[\\\]]/g, '\\$&')
}

export function unescapeAlias(alias: string): string {
  return alias.replace(/\\(.)/g, '$1')
}

/** The ONLY assembly path: `serializeLink` emits no bang and collapses an empty alias to the bare URL, so composing through it would write a line the detector refuses. */
export function composeWebpageEmbedLine(label: string, url: string): string {
  return `![${escapeAlias(label)}](${url})`
}

/** Two shapes count: a complete link, empty halves included (⌘K seats the caret inside `[]()`), and a destination still open before the caret. */
export function linkDestinationAt(lineText: string, col: number): boolean {
  for (const m of lineText.matchAll(emptyTolerantLinkRegex())) {
    const span = m.indices?.[2]
    if (!span || span[0] > col) break
    if (col >= span[0] && col <= span[1]) return true
  }
  const head = lineText.slice(0, col)
  const open = head.lastIndexOf('](')
  return open !== -1 && !head.slice(open + 2).includes(')')
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

const pageTarget = (rawTarget: string): { page: string; fragment: string } | null => {
  const raw = rawTarget.trim()
  if (!raw || raw.includes('/') || HAS_SCHEME.test(raw)) return null
  const i = raw.indexOf('#')
  return i === -1
    ? { page: raw, fragment: '' }
    : { page: raw.slice(0, i), fragment: raw.slice(i + 1) }
}

// Read on the raw target: a URL's scheme and separators are literal, while an encoded page title spells them out. The `#` is split before decoding so an encoded `%23` stays inside the title.
export function targetTitle(rawTarget: string): string | null {
  const t = pageTarget(rawTarget)
  if (!t) return null
  const decoded = decodeLinkTarget(t.page).trim()
  if (!decoded) return t.fragment ? '' : null
  return stripMarkdownExt(decoded)
}

export function targetFragment(rawTarget: string): string {
  const t = pageTarget(rawTarget)
  return t ? decodeLinkTarget(t.fragment).trim() : ''
}

export function targetNamesTitle(rawTarget: string, normalizedKey: string): boolean {
  const named = targetTitle(rawTarget)
  return named !== null && normalizeTitle(named) === normalizedKey
}
