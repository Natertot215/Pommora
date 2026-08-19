// External markdown-link URL handling. No fs, no React — imported by both main (the opener) and the
// renderer (the decoration that styles valid vs invalid), so a link's appearance can never disagree
// with whether it actually opens.

import { normalizeTitle } from './connections'

/** The URI-scheme prefix. One expression, because two callers make opposite decisions from it — a
 *  target carrying a scheme is left exactly as written, and is refused as a page title — and a
 *  second copy widened on its own would disagree with the first about what a URL even is. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

/** An explicit http(s) scheme, spelled written-out rather than inferred. Normalization promotes a
 *  bare `example.com` to https, so every surface that must know what the author actually wrote —
 *  the embed grammar, the guest attach gate, the website hover route — layers this on top of link
 *  validity instead of trusting the normalized form. */
const WEB_SCHEME = /^https?:\/\//i
export const hasWebScheme = (url: string): boolean => WEB_SCHEME.test(url)

/** How long a link is given to resolve — the title fetch and the hover card's site load share
 *  the one deadline, so "resolves" means the same thing everywhere. */
export const LINK_RESOLVE_TIMEOUT_MS = 6000

/** The `[alias](url)` markdown-link shape — a URL property's Renamed (aliased) form. The codec stores
 *  it as a plain string (the declared-type coercion re-tags it as a url at read time); this regex backs
 *  the renderer's link parse + the Edit/Rename writes.
 *  Group 1 = the (still-escaped) alias, group 2 = the target URL. The alias group allows escape
 *  sequences (`\]`, `\\`) so a user title containing `]` survives — see escape/unescapeAlias. */
export const MD_LINK = /^\[((?:[^\]\\]|\\.)*)\]\((.*)\)$/

/** The `[label](target)` markdown-link grammar, fresh per call so no caller shares `lastIndex`.
 *  Lives here rather than beside the editor's other matchers because the rename cascade parses the
 *  same syntax main-side — one grammar, or a link the renderer draws is one the rewriter can't find.
 *
 *  The label reads escapes (`\]`, `\\`) exactly as `MD_LINK` does, so a page titled `Notes [WIP]`
 *  can be named in this form at all; unescaped, its `]` ends the label early and the whole link
 *  tokenizes as nothing.
 *
 *  The target admits balanced parentheses, as CommonMark's link destination does, so an address that
 *  carries them survives however it was authored — by hand, by another app, or by this one. Nesting
 *  goes two levels, which is what cmark renders; a third is read as prose, as is any target holding
 *  an unmatched `(`.
 *
 *  Both groups are length-capped, and the label's cap is load-bearing rather than cosmetic: reading
 *  escapes makes it an alternation under a quantifier, which on a long run of unclosed `[` backtracks
 *  quadratically at every start position — the same ReDoS `pageLinkPattern` caps itself against, and
 *  it freezes the cascade and the live tokenizer alike on one pathological body. The target's nested
 *  alternations avoid adding a second such run because each level's branches are disjoint on their
 *  first character (`(` against not-`(`), leaving nothing for the quantifiers to backtrack between.
 *
 *  Both halves are assembled from one fragment each, shared with the empty-tolerant variant below —
 *  the escape class, the paren nesting, and the caps are stated once, so the two grammars can only
 *  differ by the floors that define them. */
const LINK_LABEL = (min: 0 | 1): string => `((?:[^\\]\\\\\\r\\n]|\\\\.){${min},255})`
const LINK_DEST = (min: 0 | 1): string =>
  `((?:[^()\\r\\n]|\\((?:[^()\\r\\n]|\\([^()\\r\\n]*\\))*\\)){${min},2048})`

export const markdownLinkRegex = (): RegExp =>
  new RegExp(`\\[${LINK_LABEL(1)}\\]\\(${LINK_DEST(1)}\\)`, 'dg')

/** The same grammar with empty halves admitted — the shapes mid-authoring leaves behind (`[]()`,
 *  `[docs]()`) that the tokenizer deliberately refuses. Only the surfaces that must recognize a link
 *  before it is one read this form. */
export const emptyTolerantLinkRegex = (): RegExp =>
  new RegExp(`\\[${LINK_LABEL(0)}\\]\\(${LINK_DEST(0)}\\)`, 'dg')

/** Escape a user-typed alias for the `[alias](url)` form: `\` and `]` (the only chars that can break
 *  the shape) become `\\` and `\]`, standard-markdown style. Inverse of unescapeAlias. */
export function escapeAlias(alias: string): string {
  return alias.replace(/[\\\]]/g, '\\$&')
}

/** Recover the raw alias from its escaped stored form (`\]` → `]`, `\\` → `\`). Inverse of escapeAlias. */
export function unescapeAlias(alias: string): string {
  return alias.replace(/\\(.)/g, '$1')
}

/** Encode a page's title for a markdown link's `( )`. `encodeURI` rather than `encodeURIComponent`
 *  so a separator survives being written by hand, with the parens escaped on top of it: neither
 *  built-in touches them, and a title's parens answer to nobody's grammar — `Notes (draft` is a
 *  legal page name whose lone `(` would leave the whole link untokenizable. Escaping every one keeps
 *  a written target independent of how deeply the reader is willing to nest. */
export function encodeLinkTarget(target: string): string {
  try {
    // Parens and the colon on top of encodeURI: neither is touched by it, an unbalanced paren breaks
    // the target's grammar, and a raw colon is how a target declares itself a URL — so a page titled
    // `Meeting: Notes` would encode to something this module's own reader then refuses.
    return encodeURI(target).replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/:/g, '%3A')
  } catch {
    // A lone surrogate makes encodeURI throw, and the rename cascade calls this unwrapped — where a
    // throw is turned into a reverted rename, not a skipped link. Guarded like its inverse is.
    return target
  }
}

/** The inverse, and it never throws. `decodeURIComponent` raises `URIError` on a lone `%`, which is
 *  an ordinary character to type — and CodeMirror deactivates a ViewPlugin that throws for the rest
 *  of the session, so one keystroke would cost every decoration on the page. */
export function decodeLinkTarget(target: string): string {
  try {
    return decodeURIComponent(target)
  } catch {
    return target
  }
}

/** The title a markdown link's target names, or null when it can't name one. A target carrying a
 *  scheme or a separator is addressing something outside the nexus, and is left to the external gate
 *  — otherwise `https://example.com/Notes` would reach a page called Notes by its last segment. */
export function targetTitle(rawTarget: string): string | null {
  const raw = rawTarget.trim()
  // Read on the RAW target, not the decoded one. A URL is written with its scheme and separators
  // literal; an encoded page title spells them out, so the encoder's own output can never be
  // mistaken for an address here.
  if (!raw || raw.includes('/') || HAS_SCHEME.test(raw)) return null
  const decoded = decodeLinkTarget(raw).trim()
  return decoded ? decoded.replace(/\.md$/i, '') : null
}

/** Whether a target names the page holding this normalized key. The rename cascade's prefilter and
 *  its rewriter both ask it, and they must never answer differently: a prefilter that missed what
 *  the rewriter would change leaves the body unopened and the link silently rotting. */
export function targetNamesTitle(rawTarget: string, normalizedKey: string): boolean {
  const named = targetTitle(rawTarget)
  return named !== null && normalizeTitle(named) === normalizedKey
}

/** Schemeless URLs get `https://`; anything with a scheme is left as-is. */
export function normalizeLinkUrl(url: string): string {
  const u = url.trim()
  return HAS_SCHEME.test(u) ? u : `https://${u}`
}

/** The bare display domain for a URL — its host with a leading `www.` dropped (`https://www.github.com/x`
 *  → `github.com`). This is what Short Link shows, and it doubles as Page Title's placeholder and its
 *  offline/404 fallback, so a title-mode link still reads cleanly before (or without) a fetched title.
 *  Unparseable input → itself. */
export function linkDomain(url: string): string {
  try {
    return new URL(normalizeLinkUrl(url)).hostname.replace(/^www\./i, '') || url.trim()
  } catch {
    return url.trim()
  }
}

/** A link the title-fetcher can actually hit: a valid http(s) URL. Excludes mailto (which passes
 *  isValidLink but has no page to fetch) so the main fetch gate and the cell's fetch trigger never
 *  disagree by a scheme — a mailto in title mode shows itself, it doesn't waste a round-trip. */
export function isHttpLink(url: string): boolean {
  return isValidLink(url) && hasWebScheme(normalizeLinkUrl(url))
}

/** A statically-openable link: a well-formed http(s) URL with a dotted host, or a plausible mailto.
 *  No network — this is the local check that mirrors how connections resolve against the index. */
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
