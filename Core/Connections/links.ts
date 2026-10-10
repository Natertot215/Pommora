import { HAS_SCHEME } from '../Paths/urlPath'
import { stripMarkdownExt } from '../Paths/posix'

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

// Only the half before the first `#` decides: a scheme or a path separator there addresses something outside the Nexus, while a fragment is a heading's own text.
const namesPage = (pageHalf: string): boolean =>
  !pageHalf.includes('/') && !HAS_SCHEME.test(pageHalf.trim())

/** Whether a `#` written after `head`, a destination read up to that point, opens its fragment — rather than landing inside one, or inside an address. */
export const opensFragment = (head: string): boolean => !head.includes('#') && namesPage(head)

interface DestinationSpans {
  label: [number, number]
  dest: [number, number]
  fragment: [number, number] | null
}

/** The complete markdown link whose destination holds `col`, empty halves included (⌘K seats the caret inside `[]()`). `fragment` follows the `#` of a destination that names a page. */
export function markdownDestinationAt(lineText: string, col: number): DestinationSpans | null {
  for (const m of lineText.matchAll(emptyTolerantLinkRegex())) {
    const [, label, dest] = m.indices ?? []
    if (!label || !dest || dest[0] > col) break
    if (col > dest[1]) continue
    const hash = lineText.slice(dest[0], dest[1]).indexOf('#')
    const named = hash !== -1 && namesPage(lineText.slice(dest[0], dest[0] + hash))
    return { label, dest, fragment: named ? [dest[0] + hash + 1, dest[1]] : null }
  }
  return null
}

/** Where the destination holding `col` begins: a complete link's, or one still open before the caret. */
export function linkDestinationStart(lineText: string, col: number): number | null {
  const complete = markdownDestinationAt(lineText, col)
  if (complete) return complete.dest[0]
  const head = lineText.slice(0, col)
  const open = head.lastIndexOf('](')
  return open !== -1 && !head.slice(open + 2).includes(')') ? open + 2 : null
}

// `encodeURI` leaves parens and colons alone; a raw colon declares a target a URL and a lone `(` leaves the link untokenizable, so both are escaped on top. A lone surrogate makes encodeURI throw, and the rename cascade calls this unwrapped.
export function encodeLinkTarget(target: string): string {
  try {
    return encodeURI(target).replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/:/g, '%3A')
  } catch {
    return target
  }
}

export function markdownPageLink(title: string, heading?: string, label?: string): string {
  const dest = encodeLinkTarget(title) + (heading ? `#${encodeLinkTarget(heading)}` : '')
  return `[${escapeAlias(label ?? (title || heading || ''))}](${dest})`
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
  const i = raw.indexOf('#')
  const page = i === -1 ? raw : raw.slice(0, i)
  if (!raw || !namesPage(page)) return null
  return { page, fragment: i === -1 ? '' : raw.slice(i + 1) }
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
