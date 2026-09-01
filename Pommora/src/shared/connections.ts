// Connections live ONLY as `[[Title]]` text in a Page's Markdown body — no on-disk store, no
// frontmatter mirror, no id. Resolution is computed at read time: normalized body-title → the
// unique page holding that title → its id; the id never touches disk. `![[ ]]` and `{{ }}`
// aren't connections. Obsidian/GitHub-compatible.
//
// `[[Title|alias]]` gives a connection its own words: the alias is what the reader sees, the
// TITLE alone resolves, and it's carried through every rewrite. Display and resolution stay
// separate spans everywhere downstream, so no code may destroy one.
//
// normalizeTitle is the SINGLE normalization the scanner, the phantom key, resolution, and
// uniqueness all share. This module says what a link IS; `connMenu.ts` says what can be done to one.

export const titleFromPath = (path: string): string =>
  (path.split('/').pop() ?? path).replace(/\.md$/i, '')

/** Matches `![[Title]]` page embeds, for the rename cascade's sweep ONLY — never widen into
 *  pageLinkPattern, since `![[` isn't a connection and its consumers must not start seeing it. */
export const pageEmbedPattern = (): RegExp => /!\[\[([^\]\r\n]*)\]\]/g

/** Trim + case-fold + NFC, so an NFD-composed outside write still matches the NFC title it names. */
export function normalizeTitle(raw: string): string {
  return raw.trim().toLowerCase().normalize('NFC')
}

/** A fresh global regex matching `[[Title]]` / `[[Title|alias]]`, excluding `![[ ]]` page embeds.
 *  Fresh per call so callers never share `lastIndex`. Group 1 = raw title, group 2 = alias.
 *
 *  Tolerates internal brackets — `[[Notes [WIP] final]]` captures `Notes [WIP] final` — by
 *  treating `]` as content unless it's the closing `]]` pair. A title ending in `]`
 *  (`[[Notes [WIP]]]`) is the one irreducible ambiguity of the grammar: it degrades to a
 *  recognized phantom rather than corrupting the surrounding text.
 *
 *  Length-capped at 255, the filesystem name limit. The cap is load-bearing: allowing `[` in the
 *  class made an unclosed `[`-run backtrack quadratically at every `[[` start, so an unbounded
 *  `+` here is a ReDoS that freezes buildIndex and the live tokenizer on a pathological body. */
export function pageLinkPattern(): RegExp {
  return /(?<!!)\[\[((?:[^\]\r\n|]|\](?!\])){1,255})(?:\|([^\]\r\n]{0,255}))?\]\]/g
}

export type LinkStatus = 'resolved' | 'phantom' | 'ambiguous'

/** The grammar's arithmetic lives here and nowhere else: the editor's tokenizer, the autocomplete
 *  query, and the alias helpers below all read their boundaries from this, so a syntax change
 *  moves one set of numbers rather than three kept in agreement. */
export interface LinkSpans {
  /** Brackets included. */
  full: [number, number]
  title: [number, number]
  /** Excludes the opening `|`, which sits at `title[1]`. Null when the link wears no pipe, empty
   *  when one was opened and left bare — the three consumers each turn on a different state. */
  alias: [number, number] | null
}

/** A GFM cell escapes `|`, and `|` is the alias delimiter, so a connection given its own words
 *  inside a table reaches every reader as `[[Title\|alias]]`. That backslash belongs to the
 *  cell's encoding, not the title — page names can't end in `\` — so stripping it keeps the
 *  renderer, the picker, and the rename cascade naming the same page. */
export const titleOf = (rawTitle: string): string =>
  rawTitle.endsWith('\\') ? rawTitle.slice(0, -1) : rawTitle

export function linkSpans(m: RegExpMatchArray): LinkSpans | null {
  if (m.index == null) return null
  const full: [number, number] = [m.index, m.index + m[0].length]
  const titleEnd = m.index + 2 + m[1].length
  const aliased = m[2] !== undefined
  return {
    full,
    // The escape sits between title and pipe, so it leaves the title's span rather than showing
    // as part of the name.
    title: [m.index + 2, aliased && m[1].endsWith('\\') ? titleEnd - 1 : titleEnd],
    alias: aliased ? [titleEnd + 1, full[1] - 2] : null,
  }
}

/** Takes a line rather than a document, so it stays free of any editor's line helpers — the
 *  grammar is the only thing it knows. */
export function linkAt(line: string, rel: number): LinkSpans | null {
  for (const m of line.matchAll(pageLinkPattern())) {
    const s = linkSpans(m)
    if (s && rel >= s.full[0] && rel <= s.full[1]) return s
  }
  return null
}

/** The alias span containing `rel`, or null — the caret must be in the alias itself, not merely
 *  somewhere in the link wearing it. */
export function aliasSpanAt(line: string, rel: number): [number, number] | null {
  const alias = linkAt(line, rel)?.alias
  return alias && rel >= alias[0] && rel <= alias[1] ? alias : null
}

/** The offset of a bare `|` in a `[[Title|]]` containing `rel` — an alias opened and never
 *  written — or null. */
export function emptyAliasPipeAt(line: string, rel: number): number | null {
  const s = linkAt(line, rel)
  return s?.alias && s.alias[0] === s.alias[1] ? s.title[1] : null
}

/** Built once since every Link cell reads its value through it on render. Non-global, so it
 *  holds no `lastIndex`. */
const WHOLE_LINK = new RegExp(`^(?:${pageLinkPattern().source})$`)

/** The connection a string holds when the WHOLE string is one, as against a connection sitting
 *  in a run of prose. Null otherwise — how a Link value decides page vs address. */
export function parseConnectionText(raw: string): { title: string; alias?: string } | null {
  const m = WHOLE_LINK.exec(raw.trim())
  if (!m) return null
  const title = titleOf(m[1]).trim()
  return title ? { title, alias: m[2]?.trim() || undefined } : null
}

/** The alias is dropped when it can't survive the grammar (a `]` closes the link early) or when
 *  it merely repeats the title it stands for. */
export function connectionText(title: string, alias?: string): string {
  const named =
    alias && !/[\]\r\n]/.test(alias) && normalizeTitle(alias) !== normalizeTitle(title)
      ? alias
      : undefined
  return named ? `[[${title}|${named}]]` : `[[${title}]]`
}

/** What `[[…]]` can name: the syntax carries no escape, so a `]` ends the link early and a `|`
 *  splits off an alias — a title holding either has no spelling that means it. Every surface
 *  offering a link or embed reads this rather than restating it. */
export function embeddableTitle(title: string): boolean {
  // A line break too: the pattern that reads a connection back is single-line, so a name carrying
  // one mints a reference that can be written and never parsed.
  return !title.includes(']') && !title.includes('|') && !/[\r\n]/.test(title)
}

export function pageEmbedText(title: string): string {
  return `![[${title}]]`
}
