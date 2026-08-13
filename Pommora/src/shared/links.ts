// External markdown-link URL handling. No fs, no React — imported by both main (the opener) and the
// renderer (the decoration that styles valid vs invalid), so a link's appearance can never disagree
// with whether it actually opens.

/** The `[alias](url)` markdown-link shape — a URL property's Renamed (aliased) form. The codec stores
 *  it as a plain string (the declared-type coercion re-tags it as a url at read time); this regex backs
 *  the renderer's link parse + the Edit/Rename writes.
 *  Group 1 = the (still-escaped) alias, group 2 = the target URL. The alias group allows escape
 *  sequences (`\]`, `\\`) so a user title containing `]` survives — see escape/unescapeAlias. */
export const MD_LINK = /^\[((?:[^\]\\]|\\.)*)\]\((.*)\)$/

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
 *  built-in touches them, and the grammar's target group ends at the first `)` — so a page titled
 *  `Atomic Habits (Book)` would otherwise be written as a target truncated mid-title, followed by a
 *  stray `)` sitting raw in the line. */
export function encodeLinkTarget(target: string): string {
  return encodeURI(target).replace(/\(/g, '%28').replace(/\)/g, '%29')
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
  const decoded = decodeLinkTarget(rawTarget).trim()
  if (!decoded || decoded.includes('/') || /^[a-z][a-z0-9+.-]*:/i.test(decoded)) return null
  return decoded.replace(/\.md$/i, '')
}

/** Schemeless URLs get `https://`; anything with a scheme is left as-is. */
export function normalizeLinkUrl(url: string): string {
  const u = url.trim()
  return /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`
}

/** The bare display domain for a URL — its host with a leading `www.` dropped (`https://www.github.com/x`
 *  → `github.com`). The `link-title` look shows this as its placeholder + its offline/404 fallback, so a
 *  title-mode cell still reads cleanly before (or without) a fetched title. Unparseable input → itself. */
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
  return isValidLink(url) && /^https?:\/\//i.test(normalizeLinkUrl(url))
}

/** A statically-openable link: a well-formed http(s) URL with a dotted host, or a plausible mailto.
 *  No network — this is the local check that mirrors how connections resolve against the index. */
export function isValidLink(url: string): boolean {
  const u = url.trim()
  if (!u || /\s/.test(u)) return false
  const n = normalizeLinkUrl(u)
  if (/^mailto:/i.test(n)) return /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(n)
  if (!/^https?:\/\//i.test(n)) return false
  try {
    const host = new URL(n).hostname
    return host.length > 2 && host.includes('.') && !host.startsWith('.') && !host.endsWith('.')
  } catch {
    return false
  }
}
