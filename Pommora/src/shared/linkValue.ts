// A Link property value names one of two things: a web address, stored as a bare URL or as
// `[alias](url)` once the user Renames it, or a PAGE, stored as the same `[[Title]]` connection
// every other surface writes. Markdown-native + agent-legible, exactly like Obsidian's. The alias
// ALWAYS wins at render — it overrides whichever format the property is set to. This is the one
// seam that parses/serializes both shapes; Cell render + the cell Edit/Rename writes go through it.

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
import type { LinkDisplay } from './properties'
import type { PropertyValue } from './propertyValue'

export type LinkValue = { url: string; alias?: string }

/** The canonical title a raw connection title names, or null when no single page answers to it —
 *  the nexus's page index, handed in by whichever surface holds it. */
export type ResolveTitle = (rawTitle: string) => string | null

/** What a stored Link value actually points at. A connection and an address are different things
 *  wearing the same property, and every surface branches on this rather than re-reading the string:
 *  one opens a page, the other an address, and neither can be drawn as the other. */
export type LinkTarget =
  | { kind: 'page'; title: string; alias?: string }
  | { kind: 'url'; url: string; alias?: string }

/** Read a stored Link value. A whole-string connection names a page; anything else is an address. */
export function readLink(raw: string): LinkTarget {
  const conn = parseConnectionText(raw)
  if (conn) return { kind: 'page', title: conn.title, alias: conn.alias }
  const { url, alias } = parseLink(raw)
  return { kind: 'url', url, alias }
}

/** Parse a stored URL value: `[alias](url)` → { url, alias }; a bare string → { url }. An empty
 *  alias (`[](url)`) collapses to no alias. The alias is unescaped (`\]` → `]`) — see escapeAlias. */
export function parseLink(raw: string): LinkValue {
  const s = raw.trim()
  const m = MD_LINK.exec(s)
  if (m) return { url: m[2], alias: unescapeAlias(m[1]).trim() || undefined }
  return { url: s }
}

/** Serialize back to the stored form: an alias → `[alias](url)`; none → the bare url. The alias is
 *  escaped so a title containing `]` / `\` can't break the shape (silent corruption otherwise). */
export function serializeLink(v: LinkValue): string {
  return v.alias ? `[${escapeAlias(v.alias)}](${v.url})` : v.url
}

/** The stored value a PASTED link becomes, or null when the text names nothing this property can
 *  hold. Both syntaxes that can name a page are read here — `[[Title]]`, which is what Copy Link
 *  puts on the clipboard, and `[Alias](Title)` — so a connection copied out of a page lands in a
 *  Link cell as the same connection every other surface writes, alias and all. A title no page
 *  answers to names nothing, so it returns null and the commit is refused exactly as a malformed
 *  address is. A markdown link over a web address keeps its label as the value's alias. */
export function parsePastedLink(text: string, resolve?: ResolveTitle): string | null {
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

/** Whether typed text would commit — the live cue behind the url field's ghosting, so what reads as
 *  valid is exactly what the commit accepts. */
export function isCommittableLink(text: string, resolve?: ResolveTitle): boolean {
  return parsePastedLink(text, resolve) !== null || isValidLink(text)
}

/** The click target for a url value: the URL to open when the value holds an address, else null —
 *  a connection opens its page instead, and an empty value opens the editor to type one in. Shared
 *  by the card + table cell click handlers. */
export function urlClickTarget(value: string | undefined): string | null {
  if (!value) return null
  const target = readLink(value)
  return target.kind === 'url' ? target.url || null : null
}

/** The text an Edit field opens on. An address edits as its bare URL (the alias rides along
 *  untouched); a connection edits as itself, so the syntax that made it is the syntax that changes
 *  it. */
export function linkEditText(raw: string): string {
  const target = readLink(raw)
  return target.kind === 'page' ? connectionText(target.title, target.alias) : target.url
}

/** The alias a Link value wears, whichever shape holds it — what the Rename field opens on. */
export function linkAlias(raw: string): string | undefined {
  return readLink(raw).alias
}

/** Commit an EDITED link — the raw text is the new target. A pasted connection or markdown link is
 *  read as what it names; anything else is an address, and a rename-set alias on a current ADDRESS
 *  rides along (so editing the URL never silently drops the title). `null` clears (empty),
 *  `undefined` = invalid, don't commit. Shared by the card + table cell editors. */
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
  // Only an ADDRESS has an alias to carry: its field shows the bare URL, so an alias left off the
  // typed text was never on screen to remove. A connection edits as its whole `[[Title|alias]]`,
  // where what was typed over it is the whole truth.
  const cur = current ? readLink(current) : undefined
  const alias = cur?.kind === 'url' ? cur.alias : undefined
  return { kind: 'url', value: serializeLink({ url: normalizeLinkUrl(trimmed), alias }) }
}

/** Commit a RENAMED link — the raw text is the new alias; the current target is preserved. An empty
 *  alias drops back to the bare form. Shared by the card + table rename surfaces. */
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

/** The one place a Link value becomes the text shown for it, whether that is a property cell or a
 *  link the editor is writing. An alias always wins; otherwise the display decides — `link-title`
 *  shows the fetched page title (the caller resolves it out-of-band and hands it in), falling back
 *  to the bare domain while it loads or if it never arrives, `link-short` shows that domain
 *  outright, and `link-full` the whole address. A connection has one reading and ignores all three:
 *  it shows the page it names.
 *
 *  Passing no display is how sort and filter ask for the raw URL: ordering must not move when a
 *  property's look changes, so the absent case can never resolve to one of the shortened forms. */
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

/** Whether a Link value names the page holding this normalized key — the rename cascade's test over
 *  a frontmatter value, and the one reading of "this property points at that page". */
export function linkNamesTitle(raw: string, normalizedKey: string): boolean {
  const target = readLink(raw)
  return target.kind === 'page' && normalizeTitle(target.title) === normalizedKey
}
