// External markdown-link URL handling. Imported by both main (the opener) and the renderer (the
// decoration that styles valid vs invalid), so a link's appearance can never disagree with
// whether it actually opens.

import { normalizeTitle } from './connections'

/** One expression because two callers make opposite decisions from it: a target carrying a
 *  scheme is left as-written and refused as a page title. A second copy would risk disagreeing
 *  about what a URL even is. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

/** Written-out rather than inferred: normalization promotes a bare `example.com` to https, so
 *  surfaces that must know what the author actually wrote layer this on top of link validity. */
const WEB_SCHEME = /^https?:\/\//i
export const hasWebScheme = (url: string): boolean => WEB_SCHEME.test(url)

/** The title fetch and the glance's site load share this one deadline. */
export const LINK_RESOLVE_TIMEOUT_MS = 6000

/** Group 1 = the (still-escaped) alias, group 2 = the target URL. The alias group allows escape
 *  sequences (`\]`, `\\`) so a user title containing `]` survives — see escape/unescapeAlias. */
export const MD_LINK = /^\[((?:[^\]\\]|\\.)*)\]\((.*)\)$/

/** The `[label](target)` markdown-link grammar, fresh per call so no caller shares `lastIndex`.
 *  Lives here rather than beside the editor's other matchers because the rename cascade parses
 *  the same syntax main-side.
 *
 *  The label reads escapes (`\]`, `\\`) exactly as `MD_LINK` does, so a page titled `Notes [WIP]`
 *  can be named in this form; unescaped, its `]` would end the label early.
 *
 *  The target admits balanced parentheses (CommonMark's rule), nested two levels deep — what
 *  cmark renders; a third level or an unmatched `(` is read as prose.
 *
 *  Both groups are length-capped, and the label's cap is load-bearing: reading escapes makes it
 *  an alternation under a quantifier, which on a long run of unclosed `[` backtracks
 *  quadratically at every start position — the same ReDoS `pageLinkPattern` caps itself against.
 *  The target's nested alternations avoid a second such run since each level's branches are
 *  disjoint on their first character.
 *
 *  A label may not open with `^`: GFM reads `[^1](url)` as a footnote reference followed by the
 *  prose `(url)`, never as a link.
 *
 *  Both halves share one fragment each with the empty-tolerant variant below, so the two grammars
 *  can only differ by the floors that define them. */
const LINK_LABEL = (min: 0 | 1): string => `((?!\\^)(?:[^\\]\\\\\\r\\n]|\\\\.){${min},255})`
const LINK_DEST = (min: 0 | 1): string =>
  `((?:[^()\\r\\n]|\\((?:[^()\\r\\n]|\\([^()\\r\\n]*\\))*\\)){${min},2048})`

export const markdownLinkRegex = (): RegExp =>
  new RegExp(`\\[${LINK_LABEL(1)}\\]\\(${LINK_DEST(1)}\\)`, 'dg')

/** The same grammar with empty halves admitted — the shapes mid-authoring leaves behind (`[]()`,
 *  `[docs]()`) that the tokenizer deliberately refuses. Only surfaces that must recognize a link
 *  before it's one read this form. */
export const emptyTolerantLinkRegex = (): RegExp =>
  new RegExp(`\\[${LINK_LABEL(0)}\\]\\(${LINK_DEST(0)}\\)`, 'dg')

/** `\` and `]` (the only chars that can break `[alias](url)`) become `\\` and `\]`,
 *  standard-markdown style. */
export function escapeAlias(alias: string): string {
  return alias.replace(/[\\\]]/g, '\\$&')
}

export function unescapeAlias(alias: string): string {
  return alias.replace(/\\(.)/g, '$1')
}

/** `encodeURI` rather than `encodeURIComponent` so a separator survives being written by hand,
 *  with parens escaped on top: neither built-in touches them, and `Notes (draft` is a legal page
 *  name whose lone `(` would leave the whole link untokenizable. */
export function encodeLinkTarget(target: string): string {
  try {
    // Colon escaped too: a raw colon declares a target a URL, so `Meeting: Notes` would
    // otherwise encode to something this module's own reader refuses.
    return encodeURI(target).replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/:/g, '%3A')
  } catch {
    // A lone surrogate makes encodeURI throw; the rename cascade calls this unwrapped, where a
    // throw is turned into a reverted rename rather than a skipped link.
    return target
  }
}

/** Never throws: `decodeURIComponent` raises on a lone `%`, an ordinary character to type — and
 *  CodeMirror deactivates a throwing ViewPlugin for the rest of the session. */
export function decodeLinkTarget(target: string): string {
  try {
    return decodeURIComponent(target)
  } catch {
    return target
  }
}

/** The title a markdown link's target names, or null. A target carrying a scheme or separator is
 *  addressing something outside the nexus — otherwise `https://example.com/Notes` would reach a
 *  page called Notes by its last segment. */
export function targetTitle(rawTarget: string): string | null {
  const raw = rawTarget.trim()
  // Read on the RAW target, not the decoded one: a URL's scheme and separators are literal,
  // while an encoded page title spells them out.
  if (!raw || raw.includes('/') || HAS_SCHEME.test(raw)) return null
  const decoded = decodeLinkTarget(raw).trim()
  return decoded ? decoded.replace(/\.md$/i, '') : null
}

/** The rename cascade's prefilter and rewriter both ask this and must never answer differently:
 *  a missed prefilter leaves the link silently rotting in an unopened body. */
export function targetNamesTitle(rawTarget: string, normalizedKey: string): boolean {
  const named = targetTitle(rawTarget)
  return named !== null && normalizeTitle(named) === normalizedKey
}

/** Schemeless URLs get `https://`; anything with a scheme is left as-is. */
export function normalizeLinkUrl(url: string): string {
  const u = url.trim()
  return HAS_SCHEME.test(u) ? u : `https://${u}`
}

/** The host with a leading `www.` dropped (`https://www.github.com/x` → `github.com`). What Short
 *  Link shows, and also Page Title's placeholder and offline/404 fallback, so a title-mode link
 *  still reads cleanly before or without a fetched title. Unparseable input → itself. */
export function linkDomain(url: string): string {
  try {
    return new URL(normalizeLinkUrl(url)).hostname.replace(/^www\./i, '') || url.trim()
  } catch {
    return url.trim()
  }
}

/** A valid http(s) URL. Excludes mailto (which passes isValidLink but has no page to fetch) so a
 *  mailto in title mode shows itself rather than wasting a round-trip. */
export function isHttpLink(url: string): boolean {
  return isValidLink(url) && hasWebScheme(normalizeLinkUrl(url))
}

/** A well-formed http(s) URL with a dotted host, or a plausible mailto. No network — the local
 *  check that mirrors how connections resolve against the index. */
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
