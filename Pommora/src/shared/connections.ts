// Connection model. Connections live ONLY as `[[Title]]` text in a Page's Markdown body
// (page→page) — no on-disk store, no frontmatter mirror, no id. Resolution is computed at
// read time: normalized body-title → the unique page holding that title → its id; the id
// never touches disk. `![[ ]]` and `{{ }}` are not connections. Obsidian/GitHub-compatible.
//
// `[[Title|alias]]` gives a connection its own words: the alias is what the reader sees, the
// TITLE alone resolves, and the alias is carried through every rewrite rather than dropped.
// Display and resolution are separate spans everywhere downstream, so no code may destroy one.
//
// This module is shared (renderer-importable: autocomplete + inline styling later) — no
// fs, no React. normalizeTitle is the SINGLE normalization the scanner, the phantom key,
// resolution, and uniqueness all share, so they can never disagree.

/** A page's display title from its Nexus-relative path — the basename, extension dropped. */
export const titleFromPath = (path: string): string =>
  (path.split('/').pop() ?? path).replace(/\.md$/i, '')

/** The parallel embed pattern — `![[Title]]` page embeds, matched for the rename cascade's sweep
 *  ONLY. Never widened into pageLinkPattern: `![[` is not a connection (no link-graph edge), and
 *  the connections pattern's four consumers must not start seeing it. Fresh per call. */
export const pageEmbedPattern = (): RegExp => /!\[\[([^\]\r\n]*)\]\]/g

/** Trim + case-fold + NFC — the one normalization for connection titles (NFC so an
 *  NFD-composed outside write still matches the NFC title it names). */
export function normalizeTitle(raw: string): string {
  return raw.trim().toLowerCase().normalize('NFC')
}

/** A fresh global regex matching `[[Title]]` / `[[Title|alias]]`, excluding `![[ ]]` page embeds.
 *  `[[ ]]` is the only connection syntax. Returned fresh per call so callers never share
 *  `lastIndex`. Capture group 1 = the raw title, group 2 = the alias when one is present.
 *
 *  The title tolerates internal brackets — `[[Notes [WIP] final]]` captures `Notes [WIP] final`
 *  — by treating a `]` as content unless it's the closing `]]` pair (`\](?!\])`). A title ending
 *  in `]` (`[[Notes [WIP]]]`) is the one irreducible ambiguity of the `[[ ]]` grammar (`]]]` could
 *  split either way): it degrades to a recognized phantom, never corrupts the surrounding text. `|`
 *  is the alias delimiter, so a title can't hold one — CRUD's invalidName rejects it at the source.
 *
 *  Title + alias are length-capped at 255 (the filesystem name limit — a longer title can't name a
 *  real page anyway). The cap is load-bearing, not cosmetic: allowing `[` in the class made an
 *  unclosed `[`-run backtrack quadratically at every `[[` start, so an unbounded `+` here is a
 *  ReDoS that freezes buildIndex + the live tokenizer on a pathological body. */
export function pageLinkPattern(): RegExp {
  return /(?<!!)\[\[((?:[^\]\r\n|]|\](?!\])){1,255})(?:\|([^\]\r\n]{0,255}))?\]\]/g
}


/** Resolution outcome for a scanned title against the nexus link index. */
export type LinkStatus = 'resolved' | 'phantom' | 'ambiguous'

/** Where the parts of one `pageLinkPattern` match sit, offset into whatever string it matched
 *  against. The grammar's arithmetic lives here and nowhere else: the editor's tokenizer, the
 *  autocomplete query, and the alias helpers below all read their boundaries from this, so a change
 *  to the syntax moves one set of numbers rather than three that have to be kept in agreement. */
export interface LinkSpans {
  /** The whole token, brackets included. */
  full: [number, number]
  /** The resolution key, always present. */
  title: [number, number]
  /** The words shown, excluding the `|` that opens them — which therefore sits at `title[1]`. Null
   *  when the link wears no pipe, and empty when one was opened and left bare; the three consumers
   *  each turn on a different one of those two states. */
  alias: [number, number] | null
}

/** The title a wikilink names, with a table cell's pipe-escape removed.
 *
 *  A GFM cell escapes `|`, and `|` is the alias delimiter — so a connection given its own words
 *  inside a table reaches every reader as `[[Title\|alias]]`. That backslash belongs to the cell's
 *  encoding, not to the title, and the shared name rule refuses `\` in a page name, so a title can
 *  never legitimately end in one. Stripping it is what keeps the renderer, the picker and the rename
 *  cascade naming the same page. */
export const titleOf = (rawTitle: string): string =>
  rawTitle.endsWith('\\') ? rawTitle.slice(0, -1) : rawTitle

export function linkSpans(m: RegExpMatchArray): LinkSpans | null {
  if (m.index == null) return null
  const full: [number, number] = [m.index, m.index + m[0].length]
  const titleEnd = m.index + 2 + m[1].length
  const aliased = m[2] !== undefined
  return {
    full,
    // The escape sits between the title and the pipe, so it leaves the title's span rather than
    // being shown as part of the name.
    title: [m.index + 2, aliased && m[1].endsWith('\\') ? titleEnd - 1 : titleEnd],
    alias: aliased ? [titleEnd + 1, full[1] - 2] : null,
  }
}

/** The link containing a line-relative offset, or null. Takes a line rather than a document so it
 *  stays free of any editor's line helpers — the grammar is the only thing it knows. Everything that
 *  asks "which link is the caret in" comes through here, so the containment test is written once. */
export function linkAt(line: string, rel: number): LinkSpans | null {
  for (const m of line.matchAll(pageLinkPattern())) {
    const s = linkSpans(m)
    if (s && rel >= s.full[0] && rel <= s.full[1]) return s
  }
  return null
}

/** The alias span containing `rel`, or null — the caret has to be in the alias itself, not merely
 *  somewhere in the link wearing it. */
export function aliasSpanAt(line: string, rel: number): [number, number] | null {
  const alias = linkAt(line, rel)?.alias
  return alias && rel >= alias[0] && rel <= alias[1] ? alias : null
}

/** The offset of a bare `|` in a `[[Title|]]` containing `rel`, or null — an alias that was opened
 *  and never written. */
export function emptyAliasPipeAt(line: string, rel: number): number | null {
  const s = linkAt(line, rel)
  return s?.alias && s.alias[0] === s.alias[1] ? s.title[1] : null
}

/** What the wikilink menu needs in order to render itself. The two authoring actions are built into
 *  the menu rather than filtered after it, so a surface that can't take an edit never offers them. */
export interface ConnMenuContext {
  editable: boolean
  /** Whether the link already wears an alias — the authoring item names creating one or changing it. */
  hasAlias: boolean
}

/** The wikilink native context menu's actions (conn-menu IPC). */
export type ConnMenuAction = 'preview' | 'rename' | 'editLink'

/** The two that edit the link rather than open it. */
export type ConnEditAction = Exclude<ConnMenuAction, 'preview'>
