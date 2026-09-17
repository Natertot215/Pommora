## Heading Links — Implementation Plan

### Context

Connections reach a Page and nothing inside it: the wikilink grammar in `Core/Connections/connections.ts` admits `#` as a title character, so `[[Page#Heading]]` today parses as one page titled `Page#Heading`, resolves as a phantom, and drops out of the rename cascade. This plan implements the decision log at `.claude/Planning/Heading Links — Decision Log.md`: the grammar splits page from fragment once and every consumer inherits it; the content index records each page's heading keys and each heading link; the editor renders `Page ┃ §Heading` per two settings and marks a heading that no longer exists; the autocomplete lists a page's headings after `#` or `§`, with a chevron slide from a page row; a click opens the page and travels to the heading, on the main tab, the Page Window, and the glance pane; the heading grip gains Copy Link; a heading rename rewrites its inbound links, same-page inside the editor transaction and cross-page through main; and an Automatic mode resolves a bare `§Heading` in prose. It touches `Core/Connections`, `Core/Index`, `Desktop/Store`, `Core/Contract`, `Core/MarkdownPM` (Engine, decorations, Autocomplete, Links, Guards, Menus, docCache), `Core/Session`, `Core/Pages`, `Core/Tiles/Surfaces/PageTile.tsx`, `Core/Interface/Glance`, `Core/Settings`, `Core/Actions/gripMenu.ts`, and the four documents that describe them. It leaves embeds inert to fragments, Link property values page-only, block anchors and nested heading paths as prospects, and the pixel treatment of the divider to a Figma pass Nathan takes at the first stop.

### Summary

After this plan, typing `[[Notes#` in a page lists the headings of the page called Notes, and picking one writes a link that reads as the page name, a thin divider, and `§Setup`. Clicking it opens Notes and scrolls to that heading, opening any folded section on the way; hovering shows the glance pane already scrolled there. A page's own headings can be linked with `[[#Setup]]`, which shows only the heading. Renaming a heading that other pages link to rewrites those links, so the connection survives; a heading that no longer exists reads muted so the reader knows. The heading menu gains Copy Link, two settings choose how a heading link reads, and a third, off by default, lets a bare `§Setup` in prose act as a link to the heading on the same page.

#### Constraints

- Gates, from the repo root with `set -o pipefail`: `npm run typecheck` · `npm run test` · `npm run lint` — each exits 0; read each tail. Biome formats on write (single quotes, no semicolons); an Edit failing on whitespace means re-read and retry; a shell-driven edit is repaired by `npm run format`. Comments are `//` line comments, only where a boundary needs stating.
- Settled rulings (never re-litigate): the fragment is the literal heading text after `#`, no slug; `§` typed inside `[[ ]]` becomes `#` on the keystroke and the file only ever holds `#`; `#` and `§` leave every name; `[[#Heading]]` names the page's own heading and renders the heading alone under either style; an alias overrides both halves; the divider is `UIX/Elements/segment.css`'s hairline; the three settings sit under Pages & Writing › Links; duplicates resolve to the nearest heading (same page: nearest the link; cross-page: nearest the target's warm scroll position, else first top-to-bottom), read target-side at travel time; the chevron slide shows a `‹ Links · Page` top row only in that flow, and a typed `#` opens the bare list; a page with no headings or a filter with no match closes the pane; the cascade rewrites only linked headings, same-page inside the editor transaction, cross-page after the edit settles; a rename whose old text survives on the page cascades nothing cross-page; the fourth state is a state of the fragment span, never a fourth `LinkStatus`; embeds stay inert and answer in three statuses; assets named with `#` are refused at adoption; Explicit is the default of In-Page Heading Resolution and a bare `§Heading` stays bare in the file; a bare run has no menu and no glance.
- Frozen interfaces: `LinkStatus` stays `'resolved' | 'phantom' | 'ambiguous'`; `PageIndex.resolve` keeps answering for pages; `mentions(path, title)` keeps its shape and `queryMentions(title)` its contract; `registerPageEditor` stays a singleton; `pageEmbedPattern`'s embed stays a token to the tile field.
- The host owns the machine: Core reaches it only through `Core/Platform`; every new channel is declared once in `Core/Contract/bridge.ts` and answers a `Result`.
- Never expensive work on a high-frequency trigger: the decoration pass reads `docOutline` and `conn.headingsOf`, never a fresh `headingOutline` per link; the rename guard reads two lines per transaction, never two documents; the settle detector asks main once per settled rename; no per-caret channel call.
- A display setting that only hides something rides a `:root` class through `applyPersonalization.ts`, as `plainUnresolvedLinks` does; one that changes what the decoration builds rides `EditorSettings`.
- Settings hint copy: every new settings row ships without a `hint`; Nathan writes them in flight (H-1).
- Never delete: `Core/Connections/connections.ts` exports `titleOf`, `linkAt`, `aliasSpanAt`, `emptyAliasPipeAt`, `connectionText`, `parseConnectionText`, `embeddableTitle`, `pageEmbedText`; `Core/Connections/links.ts` `targetTitle` keeps returning the page half.
- Fix shape: every consumer of `pageLinkPattern`'s match groups reads named groups after Task 1.1; the sibling sweep in 1.1's VERIFY names each.

#### Baseline

- Gates: green at `1d52ab413` (typecheck 0 · test 398 files, 4876 passed · lint 1202 files clean).
- `grep -c "  it(" Core/Connections/connections.test.ts` → 6 — adds 8
- `grep -c "  it(" Core/Connections/links.test.ts` → 33 — adds 4
- `grep -c "  it(" Core/Connections/linkValue.test.ts` → 33 — adds 1
- `grep -c "  it(" Core/Connections/scan.test.ts` → 10 — adds 11 (the section-run cases live here)
- `grep -c "  it(" Core/Connections/rewrite.test.ts` → 20 — adds 6
- `grep -c "  it(" Core/Paths/names.test.ts` → 11 — adds 2
- `grep -c "  it(" Core/Index/indexSeed.test.ts` → 7 — adds 2
- `grep -c "  it(" Core/Nexus/cascade.test.ts` → 7 — adds 3
- `grep -c "  it(" Core/MarkdownPM/Engine/tokens.test.ts` → 25 — adds 3
- `grep -c "  it(" Core/MarkdownPM/Links/aliasRender.test.tsx` → 4 — adds 5
- `grep -c "  it(" Core/MarkdownPM/Autocomplete/autocomplete.test.ts` → 32 — adds 7
- `grep -c "  it(" Core/MarkdownPM/travel.test.ts` → 4 — adds 1
- `grep -c "  it(" Core/Actions/gripMenu.test.ts` → 5 — adds 1 (one assertion changes)
- `grep -c "  it(" Core/MarkdownPM/Guards/calloutGuard.test.ts` → 13 — unchanged; `headingRenameGuard.test.ts` is new
- `grep -c "  it(" Core/Settings/personalization.test.ts` → 7 — adds 2
- `grep -rn "m\[1\]\|m\[2\]\|?\.\[2\]" Core/Connections Core/MarkdownPM/Autocomplete Core/Actions/pasteAsMenu.ts --include='*.ts' | grep -v test | wc -l` → 13 — every `pageLinkPattern`/`pageEmbedPattern` read retires; the markdown-link reads (`m[2]` on `markdownLinkRegex`) stay
- `grep -rn "§" Core --include='*.ts' --include='*.tsx' --include='*.css' | wc -l` → 0 — grows (UIX and Desktop hold two `§` in comments; untouched)

**START:** 2026-09-16T22:36:29Z
**END:** <same command, run as the report is given>

#### Implementation Process

- [x] **Phase 1** — The grammar splits page from fragment
  - [x] Task 1.1 — `pageLinkPattern`, `linkSpans`, `parseConnectionText`, `connectionText`, `embeddableTitle`, `pageEmbedPattern`
  - [x] Task 1.2 — `targetTitle` keeps the page, `targetFragment` reads the rest
  - [x] Task 1.3 — `extractMentions` learns the page; `extractHeadingMentions` and `sectionRunsIn`
  - [x] Task 1.4 — `rewriteConnections` keeps fragments; `rewriteHeadingConnections` is the heading primitive
  - [x] Task 1.5 — The name rule bans `#` and `§`
  - [x] Task 1.6 — Consumers read named groups
  - [x] Review Checkpoint
- [x] **Phase 2** — The index records headings and heading links
  - [x] Task 2.1 — Two tables, the store contract, both backends
  - [x] Task 2.2 — The seed extracts headings and heading mentions
  - [x] Task 2.3 — `index:headings` reaches the renderer; `headingsOf` joins the connections api
  - [x] Review Checkpoint
- [x] **Phase 3** — Rendering and the settings
  - [x] Task 3.1 — Three personalization keys, three rows, `EditorSettings`
  - [x] Task 3.2 — Tokens carry the fragment; `docOutline`
  - [x] Task 3.3 — The decoration draws `Page ┃ §Heading` and the missing heading
  - [x] Task 3.4 — The stylesheet
  - [x] Task 3.5 — Resting cells and the click selectors
  - [x] Task 3.6 — `§` becomes `#` inside a link
  - [x] Review Checkpoint
- [x] `[Stop: Nathan eyeballs the display under each setting and adjusts the divider]` — confirmed 09-16-2026; the join's leading gap moved onto the divider and the divider reads `--label-secondary`.
- [x] **Phase 4** — The heading pane
  - [x] Task 4.1 — The heading form and its rows
  - [x] Task 4.2 — Heading rows as pane state; the chevron commit; `→` and `←`
  - [x] Task 4.3 — The pane draws the outline and the top row
  - [x] Review Checkpoint
- [x] `[Stop: Nathan drives the pane]` — driven 09-16-2026 through the chevron, collapse, caret, and § rulings above; the remaining stops fold into one live walk after Phase 8 at Nathan's direction.
- [x] **Phase 5** — Following and Copy Link
  - [x] Task 5.1 — The pending travel, the travel helpers, and the `arrive` prop
  - [x] Task 5.2 — The click carries the heading
  - [x] Task 5.3 — The glance travels
  - [x] Task 5.4 — Copy Link on the heading grip
  - [x] Review Checkpoint
- [x] `[Stop: Nathan clicks around, tab, window, glance]` — folded into the live walk after Phase 8.
- [x] **Phase 6** — The rename cascade
  - [x] Task 6.1 — The same-page rewrite rides the editing transaction
  - [x] Task 6.2 — The settle detector and the fold rekey
  - [x] Task 6.3 — `connections:headingRenamed` and the main-side cascade
  - [x] Task 6.4 — The external diff
  - [x] Review Checkpoint
- [x] `[Stop: Nathan renames a heading with links on two pages and in Obsidian]` — folded into the live walk after Phase 8.
- [x] **Phase 7** — In-Page Heading Resolution
  - [x] Task 7.1 — Section runs
  - [x] Task 7.2 — The bare run draws and travels
  - [x] Task 7.3 — The `§` picker on the keystroke
  - [x] Review Checkpoint
- [x] **Phase 8** — Documentation
  - [x] Task 8.1 — ConnectionsPM, MarkdownPM, ConfigurationPM, Editor-Internals, CLAUDE.md

### Phase 1 — The grammar splits page from fragment

**GOAL:** One split in `Core/Connections`, inherited by every consumer: a wikilink, a page embed, and a markdown link each carry a page half and an optional heading, `[[#Heading]]` names the containing page, the page-rename rewrite keeps every fragment, and a heading-rename primitive exists for both the editor and main. Nothing renders differently yet; the editor's tokens still read `title`, which is now the page half alone. This phase is its own because every later phase reads its shapes.

#### Task 1.1

**TASK:** Give `pageLinkPattern` and `pageEmbedPattern` named `page`, `heading`, and `alias` groups with the `d` flag, rebuild `linkSpans` from `m.indices`, and teach `parseConnectionText`, `connectionText`, and `embeddableTitle` the fragment.

**FILES:** `Core/Connections/connections.ts`, `Core/Connections/connections.test.ts`

**DEPENDENCIES:** Tasks 1.2–1.6 and every later phase read `LinkSpans.heading`, `m.groups`, and `connectionText`'s third parameter.

**NOW**

```ts
export const pageEmbedPattern = (): RegExp => /!\[\[([^\]\r\n]*)\]\]/dg

// Fresh per call so callers never share `lastIndex`. `]` is content unless it closes the pair; the 255 cap is load-bearing, since an unbounded run backtracks quadratically on an unclosed `[`-run.
export function pageLinkPattern(): RegExp {
  return /(?<!!)\[\[((?:[^\]\r\n|]|\](?!\])){1,255})(?:\|([^\]\r\n]{0,255}))?\]\]/g
}

export type LinkStatus = 'resolved' | 'phantom' | 'ambiguous'

interface LinkSpans {
  full: [number, number]
  title: [number, number]
  alias: [number, number] | null
}

// A GFM cell escapes `|`, so an aliased connection inside a table arrives as `[[Title\|alias]]` — the backslash is the cell's, not the title's.
export const titleOf = (rawTitle: string): string =>
  rawTitle.endsWith('\\') ? rawTitle.slice(0, -1) : rawTitle

export function linkSpans(m: RegExpMatchArray): LinkSpans | null {
  if (m.index == null) return null
  const full: [number, number] = [m.index, m.index + m[0].length]
  const titleEnd = m.index + 2 + m[1].length
  const aliased = m[2] !== undefined
  return {
    full,
    title: [m.index + 2, aliased && m[1].endsWith('\\') ? titleEnd - 1 : titleEnd],
    alias: aliased ? [titleEnd + 1, full[1] - 2] : null,
  }
}
…
const WHOLE_LINK = new RegExp(`^(?:${pageLinkPattern().source})$`)

export function parseConnectionText(raw: string): { title: string; alias?: string } | null {
  const m = WHOLE_LINK.exec(raw.trim())
  if (!m) return null
  const title = titleOf(m[1]).trim()
  return title ? { title, alias: m[2]?.trim() || undefined } : null
}

export function connectionText(title: string, alias?: string): string {
  const named =
    alias && !/[\]\r\n]/.test(alias) && normalizeTitle(alias) !== normalizeTitle(title)
      ? alias
      : undefined
  return named ? `[[${title}|${named}]]` : `[[${title}]]`
}

export function embeddableTitle(title: string): boolean {
  return !title.includes(']') && !title.includes('|') && !/[\r\n]/.test(title)
}
```

**CHANGE**

- [ ] Replace both patterns with the named-group forms below; both carry `d` so `linkSpans` reads offsets from `m.indices.groups` instead of arithmetic on `m[1].length`.
- [ ] The page group's floor drops to `{0,255}` so `[[#Heading]]` matches with an empty page; `linkSpans` returns `null` when the page is empty and no heading group matched, so `[[]]` and `[[|x]]` stay non-links as they are today. An empty heading span (`[[Page#]]`, `[[#]]`) stays a span, since the pane opens in that state; the token layer (Task 3.2) is what reads an empty span as no fragment.
- [ ] `LinkSpans` gains `heading: [number, number] | null` and is exported. The cell's trailing backslash is stripped from whichever half precedes the pipe: the heading when present, else the title.
- [ ] `parseConnectionText` returns `{ title, heading?, alias? }`: `title` is the page half (`''` for a bare fragment), `heading` is present only when the `#` was written, and an empty heading (`[[Page#]]`) reads as absent. A link with neither a title nor a `#` is `null`.
- [ ] `connectionText(title, alias?, heading?)` writes `[[title#heading]]`, `[[title#heading|alias]]`, and, with an empty title, `[[#heading]]`; the alias is dropped when it equals the whole target.
- [ ] `embeddableTitle` also refuses `#`.
- [ ] Rewrite the comment on `titleOf` to name both halves.

**AFTER**

```ts
export const pageEmbedPattern = (): RegExp =>
  /!\[\[(?<page>[^\]\r\n#]*)(?:#(?<heading>[^\]\r\n]*))?\]\]/dg

// Fresh per call so callers never share `lastIndex`. `]` is content unless it closes the pair; the 255 cap is load-bearing, since an unbounded run backtracks quadratically on an unclosed `[`-run. The page half stops at the first `#`; the heading takes the rest up to the pipe.
export function pageLinkPattern(): RegExp {
  return /(?<!!)\[\[(?<page>(?:[^\]\r\n|#]|\](?!\])){0,255})(?:#(?<heading>(?:[^\]\r\n|]|\](?!\])){0,255}))?(?:\|(?<alias>[^\]\r\n]{0,255}))?\]\]/dg
}

export type LinkStatus = 'resolved' | 'phantom' | 'ambiguous'

export interface LinkSpans {
  full: [number, number]
  title: [number, number]
  heading: [number, number] | null
  alias: [number, number] | null
}

// A GFM cell escapes `|`, so an aliased connection inside a table arrives as `[[Title\|alias]]` or `[[Title#Heading\|alias]]` — the backslash is the cell's, and it sits on whichever half precedes the pipe.
export const titleOf = (rawTitle: string): string =>
  rawTitle.endsWith('\\') ? rawTitle.slice(0, -1) : rawTitle

export function linkSpans(m: RegExpMatchArray): LinkSpans | null {
  const at = m.index
  const g = m.indices?.groups
  if (at == null || !g?.page) return null
  const page = g.page
  const heading = g.heading ?? null
  if (page[1] === page[0] && heading === null) return null
  const alias = g.alias ?? null
  const unescaped = (r: [number, number]): [number, number] =>
    alias !== null && m[0][r[1] - 1 - at] === '\\' ? [r[0], r[1] - 1] : r
  return {
    full: [at, at + m[0].length],
    title: heading === null ? unescaped(page) : page,
    heading: heading === null ? null : unescaped(heading),
    alias,
  }
}
…
const WHOLE_LINK = new RegExp(`^(?:${pageLinkPattern().source})$`, 'd')

export interface ConnectionParts {
  title: string
  heading?: string
  alias?: string
}

export function parseConnectionText(raw: string): ConnectionParts | null {
  const m = WHOLE_LINK.exec(raw.trim())
  const g = m?.groups
  if (!g) return null
  const written = g.heading !== undefined
  const title = (written ? g.page : titleOf(g.page)).trim()
  const heading = written ? titleOf(g.heading).trim() : ''
  if (!title && !written) return null
  return {
    title,
    ...(heading ? { heading } : {}),
    ...(g.alias?.trim() ? { alias: g.alias.trim() } : {}),
  }
}

export function connectionText(title: string, alias?: string, heading?: string): string {
  const target = heading ? `${title}#${heading}` : title
  const named =
    alias && !/[\]\r\n]/.test(alias) && normalizeTitle(alias) !== normalizeTitle(target)
      ? alias
      : undefined
  return named ? `[[${target}|${named}]]` : `[[${target}]]`
}

export function embeddableTitle(title: string): boolean {
  return !/[\]|#\r\n]/.test(title)
}
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; no positional `m[1]`/`m[2]` remains in this file.
- [ ] Add to `connections.test.ts`, red first: `[[Page#Heading]]` → title `Page`, heading `Heading`; `[[#Heading]]` → title `''`, heading `Heading`; `[[Page#Heading|alias]]` → all three; `[[Page#]]` → title only; `[[#]]` → `{ title: '' }`; `[[]]` and `[[|x]]` → `null`; `[[Page#Heading\|alias]]` → heading `Heading` (backslash stripped from the heading, not the title); `connectionText('', undefined, 'H')` → `[[#H]]`; `embeddableTitle('C#')` → false. The `it(` count goes 6 → 14.
- [ ] `npm run test -- Core/Connections` green; `npm run typecheck` red only in the consumers Task 1.6 names (record the list in the task).

#### Task 1.2

**TASK:** `targetTitle` returns the page half and `targetFragment` the decoded heading, both split on the raw target before decoding; `encodePageTarget` composes a target from a title and a heading.

**FILES:** `Core/Connections/links.ts`, `Core/Connections/links.test.ts`

**DEPENDENCIES:** Tasks 1.3, 1.4, 5.1 read `targetFragment` and `encodePageTarget`.

**NOW**

```ts
// Read on the raw target: a URL's scheme and separators are literal, while an encoded page title spells them out.
export function targetTitle(rawTarget: string): string | null {
  const raw = rawTarget.trim()
  if (!raw || raw.includes('/') || HAS_SCHEME.test(raw)) return null
  const decoded = decodeLinkTarget(raw).trim()
  return decoded ? decoded.replace(/\.md$/i, '') : null
}
```

**CHANGE**

- [ ] Split the raw target at its first `#` before decoding, so a `%23` inside an encoded title stays a title.
- [ ] `targetTitle` returns `''` for a bare fragment target (`#Heading`), meaning the containing page, and `null` as before for a URL, a path, or an empty target.
- [ ] Add `targetFragment(rawTarget): string`, `''` when none, and `encodePageTarget(title, heading?)`.

**AFTER**

```ts
const splitTarget = (raw: string): { page: string; fragment: string } => {
  const i = raw.indexOf('#')
  return i === -1 ? { page: raw, fragment: '' } : { page: raw.slice(0, i), fragment: raw.slice(i + 1) }
}

const pageTarget = (rawTarget: string): { page: string; fragment: string } | null => {
  const raw = rawTarget.trim()
  return !raw || raw.includes('/') || HAS_SCHEME.test(raw) ? null : splitTarget(raw)
}

// Read on the raw target: a URL's scheme and separators are literal, while an encoded page title spells them out. The `#` is split before decoding so an encoded `%23` stays inside the title.
export function targetTitle(rawTarget: string): string | null {
  const t = pageTarget(rawTarget)
  if (!t) return null
  const decoded = decodeLinkTarget(t.page).trim()
  if (!decoded) return t.fragment ? '' : null
  return decoded.replace(/\.md$/i, '')
}

export function targetFragment(rawTarget: string): string {
  const t = pageTarget(rawTarget)
  return t ? decodeLinkTarget(t.fragment).trim() : ''
}

export function encodePageTarget(title: string, heading?: string): string {
  return heading ? `${encodeLinkTarget(title)}#${encodeLinkTarget(heading)}` : encodeLinkTarget(title)
}
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] Add to `links.test.ts`, red first: `targetTitle('Page#Setup')` → `Page`; `targetFragment('Page#My%20Heading')` → `My Heading`; `targetTitle('#Setup')` → `''` and `targetFragment` → `Setup`; `targetTitle('A%23B')` → `A#B` with fragment `''`. Count 33 → 37.
- [ ] `targetNamesTitle` is untouched and its tests stay green.
- [ ] `linkValue.test.ts`: `readLink('[[Page#H]]')` → `{ kind: 'page', title: 'Page' }` with no heading; `readLink` needs no code change, since it never copies `conn.heading` (33 → 34).

#### Task 1.3

**TASK:** `extractMentions` keeps returning page keys and learns the containing title so `[[#H]]` counts as a self-mention; `extractHeadingMentions` returns `(title, heading)` pairs for every fragment link and every bare `§` run; `sectionRunsIn`, in the same file, is the run finder.

**FILES:** `Core/Connections/scan.ts`, `Core/Connections/scan.test.ts`

**DEPENDENCIES:** Task 1.4 and Phase 2 read both; Phase 7 reads `sectionRunsIn`.

**NOW**

```ts
export function extractMentions(body: string): Set<string> {
  const out = new Set<string>()
  if (!body.includes('[[') && !body.includes('](')) return out
  const inCode = codeMask(body)
  for (const m of body.matchAll(pageLinkPattern())) {
    if (m.index !== undefined && inCode(m.index)) continue
    const key = normalizeTitle(titleOf(m[1]))
    if (key) out.add(key)
  }
  for (const m of body.matchAll(pageEmbedPattern())) {
    if (m.index !== undefined && inCode(m.index)) continue
    const key = normalizeTitle(m[1])
    if (key) out.add(key)
  }
  for (const m of body.matchAll(markdownLinkRegex())) {
    if (m.index !== undefined && inCode(m.index)) continue
    const named = targetTitle(m[2])
    if (named === null) continue
    const key = normalizeTitle(named)
    if (key) out.add(key)
  }
  return out
}

export function mentionsTitle(body: string, normalizedKey: string): boolean {
  return normalizedKey !== '' && extractMentions(body).has(normalizedKey)
}
```

**CHANGE**

- [ ] `sectionRunsIn(text, headings, inCode, sorted = false)` in `scan.ts` finds every `§` outside code and outside a wikilink match, compares the text after it against each heading (longest first) through `normalizeTitle` over a slice of the heading's own length, and accepts a match only when the run ends there or the next character is not a letter, digit, or underscore.
- [ ] `extractMentions(body, ownTitle = '')`: the page key is `g.page` (with `titleOf` when no heading), and an empty page with a written heading adds `normalizeTitle(ownTitle)` when it is non-empty. The early-out stays; the embed pass reads `g.page`; the markdown pass reads `targetTitle` as before, with `''` mapping to `ownTitle`.
- [ ] New `extractHeadingMentions(body, ownTitle, outline = [])`: for each wikilink with a written non-empty heading, each markdown link with a non-empty `targetFragment`, and each run `sectionRunsIn` finds against `outline`, push `{ title: key, heading: normalizeTitle(heading) }`, where `key` is the page key or the own key for a bare fragment; skip pairs whose title key is empty; dedupe. No early-out: every document with a heading holds `#`.
- [ ] `extractMentions`' own `[[` / `](` early-out stays: a bare `§` run is a heading mention, never a page mention (a declared narrowing of the log's A-13).
- [ ] `mentionsTitle(body, normalizedKey)` is unchanged in signature and passes no own title.

**AFTER**

```ts
// Core/Connections/scan.ts (additions)
export interface SectionRun {
  from: number
  to: number
  heading: string
}

const wordChar = /[\p{L}\p{N}_]/u

/** A bare `§Heading` in prose: the longest outline heading the text after `§` begins with, ending at the run's end or a non-word character, so `§Overviewing` never links `Overview`. Runs inside code or inside a wikilink are never runs. */
export function sectionRunsIn(
  text: string,
  headings: readonly string[],
  inCode: CodeMask,
  sorted = false,
): SectionRun[] {
  if (!text.includes('§') || headings.length === 0) return []
  const links = [...text.matchAll(pageLinkPattern())].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length])
  const byLength = sorted ? headings : [...headings].sort((a, b) => b.length - a.length)
  const out: SectionRun[] = []
  for (let i = text.indexOf('§'); i !== -1; i = text.indexOf('§', i + 1)) {
    if (inCode(i) || links.some(([a, b]) => i >= a && i < b)) continue
    for (const heading of byLength) {
      const end = i + 1 + heading.length
      if (end > text.length) continue
      if (normalizeTitle(text.slice(i + 1, end)) !== normalizeTitle(heading)) continue
      if (end < text.length && wordChar.test(text[end])) continue
      out.push({ from: i, to: end, heading })
      i = end - 1
      break
    }
  }
  return out
}

export function extractMentions(body: string, ownTitle = ''): Set<string> {
  const out = new Set<string>()
  if (!body.includes('[[') && !body.includes('](')) return out
  const inCode = codeMask(body)
  const own = normalizeTitle(ownTitle)
  const add = (raw: string | null): void => {
    const key = raw === '' ? own : raw === null ? '' : normalizeTitle(raw)
    if (key) out.add(key)
  }
  for (const m of body.matchAll(pageLinkPattern())) {
    const g = m.groups
    if (!g || (m.index !== undefined && inCode(m.index))) continue
    // `[[]]` matches with an empty page and no heading; it names nothing, and never the page itself.
    if (g.page === '' && g.heading === undefined) continue
    add(g.heading === undefined ? titleOf(g.page) : g.page)
  }
  for (const m of body.matchAll(pageEmbedPattern())) {
    if (m.index !== undefined && inCode(m.index)) continue
    add(m.groups?.page ?? null)
  }
  for (const m of body.matchAll(markdownLinkRegex())) {
    if (m.index !== undefined && inCode(m.index)) continue
    add(targetTitle(m[2]))
  }
  return out
}

export interface HeadingMention {
  title: string
  heading: string
}

/** Every link that names a heading, keyed the way the index stores it; a bare fragment or a bare `§` run names the containing page. */
export function extractHeadingMentions(
  body: string,
  ownTitle: string,
  outline: readonly string[] = [],
): HeadingMention[] {
  const own = normalizeTitle(ownTitle)
  const seen = new Set<string>()
  const out: HeadingMention[] = []
  const add = (rawTitle: string | null, rawHeading: string): void => {
    const title = rawTitle === '' ? own : rawTitle === null ? '' : normalizeTitle(rawTitle)
    const heading = normalizeTitle(rawHeading)
    if (!title || !heading || seen.has(`${title}#${heading}`)) return
    seen.add(`${title}#${heading}`)
    out.push({ title, heading })
  }
  const inCode = codeMask(body)
  for (const m of body.matchAll(pageLinkPattern())) {
    const g = m.groups
    if (!g || g.heading === undefined || (m.index !== undefined && inCode(m.index))) continue
    add(g.page, titleOf(g.heading))
  }
  for (const m of body.matchAll(markdownLinkRegex())) {
    if (m.index !== undefined && inCode(m.index)) continue
    add(targetTitle(m[2]), targetFragment(m[2]))
  }
  for (const run of sectionRunsIn(body, outline, inCode)) add('', run.heading)
  return out
}
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; `extractMentions`' early-out is unchanged and `extractHeadingMentions` has none.
- [ ] `scan.test.ts`, red first, the run cases: `§Setup` against `['Setup']` → one run; `§Overviewing` against `['Overview']` → none; `§Setup.` → one run ending before the period; a `§` inside a code span → none; two headings where one prefixes the other picks the longer; `[[Page§X]]` text → none.
- [ ] `scan.test.ts`, red first, the mention cases: `[[Page#H]]` → `extractMentions` has `page` and `extractHeadingMentions` has `{page, h}`; `[[#H]]` with own title `Own` → `{own, h}` and `extractMentions` has `own`; `[Alias](Page#H)` → `{page, h}`; `§Setup` with outline `['Setup']` and own `Own` → `{own, setup}`; `[[Page#]]` → no heading mention; `[[]]` with own title `Own` → no mention at all. Count 10 → 22 with the run cases.
- [ ] Update the header comment of `scan.test.ts` to the consumer count Task 1.6 leaves.

#### Task 1.4

**TASK:** A page rename re-emits every fragment; `rewriteHeadingConnections` rewrites the links and runs that name one heading of one page.

**FILES:** `Core/Connections/rewrite.ts`, `Core/Connections/rewrite.test.ts`

**DEPENDENCIES:** Task 6.1 (the editor) and Task 6.3 (main) both call `rewriteHeadingConnections`.

**NOW**

```ts
export function rewriteConnections(body: string, oldTitle: string, newTitle: string): string {
  const oldKey = normalizeTitle(oldTitle)
  const inCode = codeMask(body)
  const afterLinks = body.replace(
    pageLinkPattern(),
    (match, title: string, alias: string | undefined, offset: number) => {
      if (inCode(offset) || normalizeTitle(titleOf(title)) !== oldKey) return match
      // A table cell's pipe-escape is re-emitted exactly as it arrived: dropping it would write a bare `|` into a cell and split the row into an extra column.
      const pipe = alias ? `${title.endsWith('\\') ? '\\|' : '|'}${alias}` : ''
      return `[[${newTitle}${pipe}]]`
    },
  )
  const inCodeAfter = codeMask(afterLinks)
  const afterEmbeds = afterLinks.replace(
    pageEmbedPattern(),
    (match, title: string, offset: number) =>
      !inCodeAfter(offset) && normalizeTitle(title) === oldKey ? pageEmbedText(newTitle) : match,
  )
  const inCodeFinal = codeMask(afterEmbeds)
  return afterEmbeds.replace(
    markdownLinkRegex(),
    (match, label: string, target: string, offset: number) =>
      !inCodeFinal(offset) && targetNamesTitle(target, oldKey)
        ? `[${label}](${encodeLinkTarget(newTitle)})`
        : match,
  )
}
```

**CHANGE**

- [ ] `rewrite.ts` imports `sectionRunsIn` from `./scan` beside its existing `linkValue` import. The replace callbacks read `groups` (the last argument) rather than positional captures. The wikilink pass re-emits `#heading` and the pipe-escape exactly as written; the embed pass re-emits `#heading`; the markdown pass re-emits the raw fragment after `#`.
- [ ] Add `rewriteHeadingConnections(body, title, oldHeading, newHeading, ownTitle = '', runs = false)`: the wikilink pass rewrites a link whose page key is `title`'s key, or whose page is empty when `ownTitle`'s key is `title`'s key, and whose heading key is `oldHeading`'s, keeping page text, pipe-escape, and alias; the markdown pass does the same by `targetTitle`/`targetFragment`, re-emitting the raw page half and `encodeLinkTarget(newHeading)`; when `runs` is set and `ownTitle`'s key is `title`'s key, every `§oldHeading` run from `sectionRunsIn(body, [oldHeading], inCode)` becomes `§newHeading`; a caller passes `runs` only under Automatic, since under Explicit a bare `§Setup` is prose by ruling. Code is never rewritten.

**AFTER**

```ts
type LinkGroups = { page: string; heading?: string; alias?: string }
const groupsOf = (args: unknown[]): LinkGroups => args[args.length - 1] as LinkGroups
const offsetOf = (args: unknown[]): number => args[args.length - 3] as number

const escapedPipe = (half: string, alias: string | undefined): string =>
  alias === undefined ? '' : `${half.endsWith('\\') ? '\\|' : '|'}${alias}`

export function rewriteConnections(body: string, oldTitle: string, newTitle: string): string {
  const oldKey = normalizeTitle(oldTitle)
  const inCode = codeMask(body)
  const afterLinks = body.replace(pageLinkPattern(), (match, ...args) => {
    const { page, heading, alias } = groupsOf(args)
    const last = heading ?? page
    if (inCode(offsetOf(args)) || normalizeTitle(titleOf(page)) !== oldKey) return match
    // A table cell's pipe-escape is re-emitted exactly as it arrived: dropping it would write a bare `|` into a cell and split the row into an extra column.
    const fragment = heading === undefined ? '' : `#${heading}`
    return `[[${newTitle}${fragment}${escapedPipe(last, alias)}]]`
  })
  // The embed pass sees POST-link-pass offsets — its mask must be built over the same string, or any length-changing link rewrite above shifts every later offset off the original mask.
  const inCodeAfter = codeMask(afterLinks)
  const afterEmbeds = afterLinks.replace(pageEmbedPattern(), (match, ...args) => {
    const { page, heading } = groupsOf(args)
    if (inCodeAfter(offsetOf(args)) || normalizeTitle(page) !== oldKey) return match
    return heading === undefined ? pageEmbedText(newTitle) : `![[${newTitle}#${heading}]]`
  })
  // Rebuilt for the same reason. Only a target that NAMES a page moves, so a URL whose last segment happens to match the renamed title is left as written.
  const inCodeFinal = codeMask(afterEmbeds)
  return afterEmbeds.replace(
    markdownLinkRegex(),
    (match, label: string, target: string, offset: number) => {
      if (inCodeFinal(offset) || !targetNamesTitle(target, oldKey)) return match
      const hash = target.indexOf('#')
      const fragment = hash === -1 ? '' : target.slice(hash)
      return `[${label}](${encodeLinkTarget(newTitle)}${fragment})`
    },
  )
}

/** Rewrites every link and bare run that names `oldHeading` on the page titled `title`; a bare fragment or `§` run counts only when `ownTitle` is that page. */
export function rewriteHeadingConnections(
  body: string,
  title: string,
  oldHeading: string,
  newHeading: string,
  ownTitle = '',
  runs = false,
): string {
  const titleKey = normalizeTitle(title)
  const oldKey = normalizeTitle(oldHeading)
  const own = normalizeTitle(ownTitle) === titleKey
  const names = (page: string | null): boolean =>
    page === '' ? own : page !== null && normalizeTitle(page) === titleKey
  const inCode = codeMask(body)
  const afterLinks = body.replace(pageLinkPattern(), (match, ...args) => {
    const { page, heading, alias } = groupsOf(args)
    if (heading === undefined || inCode(offsetOf(args))) return match
    if (!names(page) || normalizeTitle(titleOf(heading)) !== oldKey) return match
    return `[[${page}#${newHeading}${escapedPipe(heading, alias)}]]`
  })
  const inCodeAfter = codeMask(afterLinks)
  const afterMd = afterLinks.replace(
    markdownLinkRegex(),
    (match, label: string, target: string, offset: number) => {
      if (inCodeAfter(offset) || !names(targetTitle(target))) return match
      if (normalizeTitle(targetFragment(target)) !== oldKey) return match
      return `[${label}](${target.slice(0, target.indexOf('#'))}#${encodeLinkTarget(newHeading)})`
    },
  )
  if (!own || !runs) return afterMd
  const inCodeFinal = codeMask(afterMd)
  let out = afterMd
  for (const run of sectionRunsIn(afterMd, [oldHeading], inCodeFinal).reverse())
    out = `${out.slice(0, run.from + 1)}${newHeading}${out.slice(run.to)}`
  return out
}
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; the three existing masks are rebuilt in the same order.
- [ ] `rewrite.test.ts`, red first: page rename keeps `[[Old#H]]` → `[[New#H]]`, `[[Old#H|a]]` → `[[New#H|a]]`, `![[Old#H]]` → `![[New#H]]`, `[a](Old#H)` → `[a](New#H)`; heading rename rewrites `[[P#Old]]`, `[[P#Old|a]]`, `[a](P#Old)`, and with own title `P` also `[[#Old]]`, and `§Old` only when `runs` is set, leaving `[[Q#Old]]`, `§Older`, and a fenced sample untouched. Count 20 → 27.
- [ ] Every existing rewrite test stays green byte for byte.

#### Task 1.5

**TASK:** The name rule refuses `#` and `§`.

**FILES:** `Core/Paths/names.ts`, `Core/Paths/names.test.ts`

**NOW**

```ts
  if (name.includes('|')) return `"${name}" can't contain "|".`
```

**CHANGE**

- [ ] `nameError` refuses `#` and `§` beside `|`, ungated by role.

**AFTER**

```ts
  if (/[|#§]/.test(name)) return `"${name}" can't contain "|", "#", or "§".`
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `names.test.ts`: `nameError('Q#3', 'page')` and `nameError('§4', 'directory')` both return the message (11 → 13).
- [ ] `grep -rn "can't contain \"|\"" Core` → 0 outside tests that assert the new message.

#### Task 1.6

**TASK:** Every consumer of the two patterns reads named groups, and `embedRanges` keeps embeds inert to the fragment.

**FILES:** `Core/Actions/pasteAsMenu.ts`, `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts`, `Core/MarkdownPM/Engine/tokens.ts`, `Core/MarkdownPM/Engine/embedRanges.ts`, `Core/Assets/adoptFile.ts`

**NOW**

```ts
// pasteAsMenu.ts
  const m = pageLinkPattern().exec(s)
  return m && m[0] === s ? m[1] : null
```

```ts
// useConnectionAutocomplete.ts
        ? pageLinkPattern().exec(view.state.doc.sliceString(ac.from, ac.to))?.[2]
```

```ts
// tokens.ts (the embed token spec)
    re: pageEmbedPattern(),
    …
    if (spec.accept && !spec.accept(m[1] ?? '')) continue
```

**CHANGE**

- [ ] `pasteAsMenu.ts`: read `m.groups?.page`, and refuse a match with a written heading (a copied heading link never becomes an embed).
- [ ] `useConnectionAutocomplete.ts`: read `?.groups?.alias`.
- [ ] `tokens.ts`: the generic `accept(m[1] ?? '')` keeps reading index 1, which is the `page` group for the embed pattern; add a comment only if the reader would otherwise wonder. `wikiLinkTokens` gains nothing here (Task 3.2).
- [ ] `embedRanges.ts` and any other reader of an embed match: `grep -rn "pageEmbedPattern\|matchAll(pageLinkPattern" Core` and open each hit; every `m[1]` becomes `m.groups?.page`.
- [ ] `adoptFile.ts` is untouched: `embeddableTitle` now refuses `#`, so the existing fault fires.
- [ ] `Core/MarkdownPM/Engine/detect.ts`'s `loneEmbedRe` is a fourth spelling of the embed grammar outside the split; it hands `Page#Heading` whole to `embeddable()`, which now refuses it, so the tile stays inert with no change there. Record it in the sweep's list.

**AFTER**

```ts
// pasteAsMenu.ts
  const m = pageLinkPattern().exec(s)
  return m && m[0] === s && m.groups?.heading === undefined ? (m.groups?.page ?? null) : null
```

```ts
// useConnectionAutocomplete.ts
        ? pageLinkPattern().exec(view.state.doc.sliceString(ac.from, ac.to))?.groups?.alias
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [x] `grep -rn "pageLinkPattern()\|pageEmbedPattern()" Core --include='*.ts' --include='*.tsx' | grep -v test` lists every consumer; each line either uses `linkSpans`, `groups`, or the generic `m[1]` embed accept. Record the list.
  - Task 1.1 left `npm run typecheck` green: every `parseConnectionText` reader (`navigationFile.ts`, `linkValue.ts`, `Properties/value.ts`, `assetRoots.ts`, `assetUrl.ts`, `assetMigrate.ts`) reads `.title` or null-checks, `connectionText`'s third parameter is optional, and `LinkSpans.heading` is additive.
  - Consumers: `scan.ts` (named groups), `rewrite.ts` (`groupsOf`/`offsetOf`), `pasteAsMenu.ts` (`groups.page`, refuses a written heading), `useConnectionAutocomplete.ts` (`groups.alias`), `tokens.ts` `wikiLinkTokens` (`linkSpans`), `tokens.ts` embed spec (generic `m[1]` = `page`), `detect.ts` `loneEmbedRe` (untouched; `embeddable()` refuses `#`), `adoptFile.ts` (untouched).
- [ ] Gates green across the repo.

#### Review Checkpoint

- [ ] `npm run test` green; the six `it(` counts moved as the Baseline says.
- [ ] `node -e` against the built modules or a scratch vitest file: `parseConnectionText('[[A#B|c]]')`, `extractHeadingMentions('[[#B]]', 'A')`, `rewriteConnections('[[A#B]]', 'A', 'Z')`, `rewriteHeadingConnections('[[#B]] §B', 'A', 'B', 'C', 'A')` print the expected values.
- [ ] No behavior of a plain `[[Title]]` changed: `aliasRender`, `linkFormat`, `mdLinkTarget`, `regression-pins` suites green untouched.

### Phase 2 — The index records headings and heading links

**GOAL:** `nexus.db` gains `headings(path, heading)` and `heading_mentions(path, title, heading)` beside the untouched `mentions`, the seed fills them from Phase 1's scanners, and the renderer holds a path-keyed map of every page's heading keys served over one ask, so a link can be drawn muted when its heading is gone and a rename can find its inbound files. Its own phase because the store contract has two backends and a contract suite, and the renderer map is a session concern.

#### Task 2.1

**TASK:** Add the two tables to the DDL and `INDEX_TABLES`, step the generation, widen `PageIndexEntry` and `ContentIndexStore`, and implement the SQLite and memory backends plus the contract suite.

**FILES:** `Desktop/Store/ddl.ts`, `Desktop/Store/stores.ts`, `Desktop/Store/stores.test.ts`, `Core/Platform/stores.ts`, `Core/Testing/memoryStores.ts`, `Core/Testing/storesContract.ts`

**DEPENDENCIES:** Tasks 2.2, 2.3, 6.3, 6.4 read the new store methods.

**NOW**

```ts
// ddl.ts
export const INDEX_GENERATION = 3
…
  CREATE TABLE IF NOT EXISTS mentions (
    path TEXT NOT NULL,
    title TEXT NOT NULL,
    PRIMARY KEY (path, title)
  );
  CREATE INDEX IF NOT EXISTS mentions_by_title ON mentions (title);
…
export const INDEX_TABLES = ['mentions', 'page_values', 'memberships', 'indexed_files'] as const
```

```ts
// Core/Platform/stores.ts
export interface PageIndexEntry {
  mentions: string[]
  values: Record<string, unknown>
  memberships: Membership[]
}
…
export interface ContentIndexStore {
  upsertPageIndex(path: string, entry: PageIndexEntry, stat: IndexedStat): void
  …
  queryMentions(normalizedTitle: string): string[]
  queryKeyHolders(key: string): string[]
  queryMembers(key: string, title: string): string[]
  readIndexedStat(path: string): IndexedStat | null
  readIndexedStats(): Map<string, IndexedStat>
}
```

**CHANGE**

- [ ] `ddl.ts`: after `mentions_by_title`, create `headings (path, heading, PRIMARY KEY (path, heading))` and `heading_mentions (path, title, heading, PRIMARY KEY (path, title, heading))` with `heading_mentions_by_target ON heading_mentions (title, heading)`; add both names to `INDEX_TABLES`; `INDEX_GENERATION = 4`. `truncateIndex` and every path-scoped op inherit both through the array.
- [ ] `Core/Platform/stores.ts`: `PageIndexEntry` gains `headings: string[]` and `headingMentions: HeadingMention[]` (import the type from `Core/Connections/scan`); `ContentIndexStore` gains `queryHeadingMentions(normalizedTitle, normalizedHeading): string[]` and `readHeadings(paths?: string[]): Record<string, string[]>`.
- [ ] `Desktop/Store/stores.ts`: `upsertPageIndex` inserts the two new row sets after mentions; the two queries are `SELECT path FROM heading_mentions WHERE title = ? AND heading = ? ORDER BY path` and `SELECT path, heading FROM headings` (with `WHERE path IN (…)` when paths are given) folded into a record.
- [ ] `Core/Testing/memoryStores.ts`: `MemoryIndex` gains `headings` and `headingMentions` maps; both join every hand-listed table loop (`clearPath`, the two prefix ops); `upsertPageIndex` writes them; the two queries filter the maps.
- [ ] `storesContract.ts`: every fixture entry gains `headings: []` and `headingMentions: []`; one new `it(` round-trips a page with `headings: ['setup']` and `headingMentions: [{ title: 'beta', heading: 'setup' }]` through both queries, then renames the path and reads them back under the new path.
- [ ] `Desktop/Store/stores.test.ts`: the `DROP TABLE` literal gains `headings` and `heading_mentions`.

**AFTER**

```ts
// ddl.ts
export const INDEX_GENERATION = 4
…
  CREATE INDEX IF NOT EXISTS mentions_by_title ON mentions (title);
  CREATE TABLE IF NOT EXISTS headings (
    path TEXT NOT NULL,
    heading TEXT NOT NULL,
    PRIMARY KEY (path, heading)
  );
  CREATE TABLE IF NOT EXISTS heading_mentions (
    path TEXT NOT NULL,
    title TEXT NOT NULL,
    heading TEXT NOT NULL,
    PRIMARY KEY (path, title, heading)
  );
  CREATE INDEX IF NOT EXISTS heading_mentions_by_target ON heading_mentions (title, heading);
…
export const INDEX_TABLES = [
  'mentions',
  'headings',
  'heading_mentions',
  'page_values',
  'memberships',
  'indexed_files',
] as const
```

```ts
// Core/Platform/stores.ts
export interface PageIndexEntry {
  mentions: string[]
  headings: string[]
  headingMentions: HeadingMention[]
  values: Record<string, unknown>
  memberships: Membership[]
}
…
  queryMentions(normalizedTitle: string): string[]
  queryHeadingMentions(normalizedTitle: string, normalizedHeading: string): string[]
  readHeadings(paths?: string[]): Record<string, string[]>
```

```ts
// Desktop/Store/stores.ts, inside upsertPageIndex after the mentions loop
    const insHeading = db.prepare('INSERT OR REPLACE INTO headings (path, heading) VALUES (?, ?)')
    for (const heading of entry.headings) insHeading.run(path, heading)
    const insHeadingMention = db.prepare(
      'INSERT OR REPLACE INTO heading_mentions (path, title, heading) VALUES (?, ?, ?)',
    )
    for (const { title, heading } of entry.headingMentions) insHeadingMention.run(path, title, heading)
…
  queryHeadingMentions(normalizedTitle, normalizedHeading) {
    return paths(
      db,
      'SELECT path FROM heading_mentions WHERE title = ? AND heading = ? ORDER BY path',
      normalizedTitle,
      normalizedHeading,
    )
  },
  readHeadings(paths) {
    const rows = (
      paths
        ? db
            .prepare(`SELECT path, heading FROM headings WHERE path IN (${paths.map(() => '?').join(',')})`)
            .all(...paths)
        : db.prepare('SELECT path, heading FROM headings').all()
    ) as { path: string; heading: string }[]
    const out: Record<string, string[]> = {}
    for (const p of paths ?? []) out[p] = []
    for (const { path, heading } of rows) (out[path] ??= []).push(heading)
    return out
  },
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; `paths(db, …)`'s existing helper signature accepts the extra bind parameter, or the query is written with `.all` like its neighbor.
- [ ] `npm run test -- Desktop/Store Core/Testing` green: the contract suite runs against both backends and the new `it(` passes on each.
- [ ] `grep -n "index.mentions, index.values, index.memberships" Core/Testing/memoryStores.ts` → 0 (every loop lists five tables now).

#### Task 2.2

**TASK:** The seed records each page's heading keys and heading mentions, and `contentIndex.ts` exposes the three queries.

**FILES:** `Core/Index/indexSeed.ts`, `Core/Index/indexSeed.test.ts`, `Core/Index/contentIndex.ts`

**NOW**

```ts
const NO_ROWS: PageIndexEntry = { mentions: [], values: {}, memberships: [] }

function extractPageIndex(content: string): PageIndexEntry {
  if (!sweepAdmitsBody(content)) return NO_ROWS
  const values = frontmatterValues(content)
  const mentions = extractMentions(splitEnvelope(content).body)
  for (const title of frontmatterMentions(values)) mentions.add(title)
  return { mentions: [...mentions], values, memberships: extractMemberships(values) }
}

function recordPage(rel: string, content: string, stat: IndexedStat): void {
  upsertPageIndex(rel, extractPageIndex(content), stat)
}
```

**CHANGE**

- [ ] `extractPageIndex(rel, content)`: the own title is `titleFromPath(rel)`; the outline is `headingOutline(body)` from `Core/MarkdownPM/Engine/headingScan`. That module reaches `Engine/detect.ts` and its micromark parse, which main has not imported before; it is React- and CodeMirror-free, so no gate moves, and one heading scanner beats a second spelling of the heading grammar. Keys are `normalizeTitle(h.text)`, deduped; `extractMentions(body, own)`; `headingMentions` from `extractHeadingMentions(body, own, outline.map((h) => h.text))`.
- [ ] `contentIndex.ts`: `queryHeadingMentions` through `queryPaths` (null until ready) and `readHeadings(paths?)` through `queried`.

**AFTER**

```ts
const NO_ROWS: PageIndexEntry = {
  mentions: [],
  headings: [],
  headingMentions: [],
  values: {},
  memberships: [],
}

function extractPageIndex(rel: string, content: string): PageIndexEntry {
  if (!sweepAdmitsBody(content)) return NO_ROWS
  const values = frontmatterValues(content)
  const own = titleFromPath(rel)
  const { body } = splitEnvelope(content)
  const outline = headingOutline(body).map((h) => h.text)
  const mentions = extractMentions(body, own)
  for (const title of frontmatterMentions(values)) mentions.add(title)
  return {
    mentions: [...mentions],
    headings: [...new Set(outline.map(normalizeTitle))].filter(Boolean),
    headingMentions: extractHeadingMentions(body, own, outline),
    values,
    memberships: extractMemberships(values),
  }
}

function recordPage(rel: string, content: string, stat: IndexedStat): void {
  upsertPageIndex(rel, extractPageIndex(rel, content), stat)
}
```

```ts
// contentIndex.ts
export function queryHeadingMentions(normalizedTitle: string, normalizedHeading: string): string[] | null {
  return queryPaths((db) => db.queryHeadingMentions(normalizedTitle, normalizedHeading))
}
export function readHeadings(paths?: string[]): Record<string, string[]> | null {
  return queried((db) => db.readHeadings(paths))
}
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; `extractPageIndex`'s every caller passes `rel`.
- [ ] `indexSeed.test.ts`, red first: a seeded page `Notes/A.md` with `## Setup` and `[[B#Intro]]` records `headings: ['setup']` and `headingMentions: [{ title: 'b', heading: 'intro' }]`; a page with `[[#Setup]]` records `{ title: 'a', heading: 'setup' }`. Count 7 → 9.
- [ ] `Core/Nexus/cascade.test.ts` stays green: a page rename still finds its files through `queryMentions`.

#### Task 2.3

**TASK:** The renderer asks `index:headings` for the map when a tree lands and for the changed paths when pages change, holds it in the nexus slice, and the connections api exposes `headingsOf(path)`.

**FILES:** `Core/Contract/bridge.ts`, `Core/Nexus/handlers.ts`, `Core/Session/nexusSlice.ts`, `Core/Session/useBridgeSubscriptions.ts`, `Core/Session/pageConnections.ts`, `Core/MarkdownPM/Links/connectionsApi.ts`, `Core/MarkdownPM/editorHarness.ts`

**NOW**

```ts
// bridge.ts
    'folds:get': { args: []; reply: Result<Record<string, string[]>> }
```

```ts
// useBridgeSubscriptions.ts
    const off = dialer().on('pages:changed', (paths) => {
      for (const path of paths) absorb(path)
    })
```

```ts
// connectionsApi.ts
export interface ConnectionsApi extends PageIndex {
  open: (page: ConnPage) => void
  menu?: (target: ConnMenuTarget) => void
  bypass?: (page: ConnPage) => void
}
```

**CHANGE**

- [ ] `bridge.ts` `Asks`: `'index:headings': { args: [paths?: string[]]; reply: Result<Record<string, string[]>> }`.
- [ ] `Core/Nexus/handlers.ts`: `'index:headings': withRoot(async (_root, _ctx, paths) => ok(readHeadings(isStringArray(paths) ? paths : undefined) ?? {}))`.
- [ ] `nexusSlice.ts`: `headings: Record<string, string[]>` (initial `{}`) and `loadHeadings(paths?)`, which asks and merges (a full load replaces; a partial load overwrites the given keys). `applyTree` must not round-trip per reconcile (its own standing comment), so a module flag `headingsLoaded`, beside `devicePrefsLoaded`, gates one full load per nexus after `set({ status: 'ready', tree })`; `resetNexusSession` clears the map and the flag. Later changes arrive through `pages:changed`.
- [ ] `useBridgeSubscriptions.ts`: the `pages:changed` handler also calls `void useSession.getState().loadHeadings(paths)`.
- [ ] `connectionsApi.ts`: `headingsOf?: (path: string) => string[] | undefined`.
- [ ] `pageConnections.ts`: both hooks select `s.headings`, add `headingsOf: (path) => headings[path]` to the `rest` they pass `connectionsFor`, and add `headings` to their memo deps, so the editor's existing `resolutionNudge` on a changed `connections` identity repaints.
- [ ] `editorHarness.ts`: the bridge stub answers `'index:headings'` with `ok({})`.

**AFTER**

```ts
// nexusSlice.ts (interface additions)
  headings: Record<string, string[]>
  loadHeadings: (paths?: string[]) => Promise<void>
…
    headings: {},
    loadHeadings: async (paths) => {
      const res = await host().ask('index:headings', paths)
      if (!res.ok) return
      set((s) => ({ headings: paths ? { ...s.headings, ...res.value } : res.value }))
    },
…
      set({ status: 'ready', tree })
      if (!headingsLoaded) {
        headingsLoaded = true
        void get().loadHeadings()
      }
```

```ts
// pageConnections.ts, usePreviewConnections
  const headings = useSession((s) => s.headings)
  return useMemo(
    () =>
      connectionsFor(tree, {
        open: …,
        bypass: …,
        menu: showConnectionMenu,
        headingsOf: (path) => headings[path],
      }),
    [tree, select, openWindow, openInWindow, headings],
  )
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; the full ask fires once per nexus, the partial one once per `pages:changed` batch, never per paint. `GlancePane.tsx` and `PageHistoryWindow.tsx` build their `connectionsFor` without `headingsOf`, so a missing heading never draws there; that is E-6's absent-reads-as-resolved rule and stays.
- [ ] `npm run typecheck` green: the bridge entry compiles on both ends.
- [ ] A store test (`Core/Session/store.test.tsx` or the nexus slice's own) pins: a full load replaces the map; a partial load keeps unrelated keys.

#### Review Checkpoint

- [ ] Launch the app against NexusOS: `nexus.db` opens, `index_generation` reads 4, `SELECT COUNT(*) FROM headings` is non-zero after the seed, and `SELECT * FROM heading_mentions` lists the documentation samples that write `[[Page#Heading]]`.
- [ ] Typing a heading into an open page and saving updates that page's row in `headings` within a settle (`SELECT heading FROM headings WHERE path = ?`).

### Phase 3 — Rendering and the settings

**GOAL:** A heading link reads as `Page ┃ §Heading` or `§Heading` per **Heading Link Style**, drops the `§` per **Hide Heading Symbol**, shows its fragment muted when the heading is gone, keeps resting cells and click gates in step, and turns a typed `§` into `#` inside a link. **In-Page Heading Resolution** is declared here and consumed in Phase 7. Its own phase because it's the first surface Nathan sees and adjusts.

#### Task 3.1

**TASK:** Declare `headingLinkStyle`, `hideHeadingSymbol`, and `inPageHeadingResolution`, their codec lines, their three rows under Pages & Writing › Links, and their passage into `EditorSettings`.

**FILES:** `Core/Settings/personalization.ts`, `Core/Settings/codec.ts`, `Core/Settings/frames.ts`, `Core/Settings/applyPersonalization.ts`, `Core/Settings/personalization.test.ts`, `Core/MarkdownPM/api.ts`, `Core/Pages/editorHost.tsx`, `Core/MarkdownPM/MarkdownEditor.tsx`

**NOW**

```ts
// personalization.ts
  plainUnresolvedLinks?: boolean
…
  defaultLinkFormat?: LinkDisplay
```

```ts
// codec.ts
    plainUnresolvedLinks: bool(p.plainUnresolvedLinks),
…
    defaultLinkFormat: LINK_DISPLAYS.find((d) => d === p.defaultLinkFormat),
```

```ts
// frames.ts (Pages & Writing)
      {
        title: 'Links',
        rows: [
          {
            kind: 'toggle',
            key: 'plainUnresolvedLinks',
            label: 'Display Unresolved Links As Plain Syntax',
            hint: 'A link leading nowhere reads as the prose it is written as, instead of dimmed with its syntax showing.',
          },
        ],
      },
```

```ts
// editorHost.tsx settings()
        exitPairsOnEnter: p.exitPairsOnEnter,
        commands,
```

**CHANGE**

- [ ] `personalization.ts`: beside `LinkDisplay`'s import, declare `HEADING_LINK_STYLES = ['page-heading', 'heading-only'] as const`, `HeadingLinkStyle`, `HEADING_LINK_STYLE_LABELS`, `IN_PAGE_HEADING_RESOLUTIONS = ['explicit', 'automatic'] as const`, `InPageHeadingResolution`, `IN_PAGE_HEADING_RESOLUTION_LABELS`; the interface gains `headingLinkStyle?: HeadingLinkStyle`, `hideHeadingSymbol?: boolean`, `inPageHeadingResolution?: InPageHeadingResolution`.
- [ ] `codec.ts`: three lines in the shape of their neighbors.
- [ ] `frames.ts`: three rows after `plainUnresolvedLinks` in the Links section, no `hint`: a `picker` for `headingLinkStyle` (options from the labels, fallback `'page-heading'`), a `toggle` for `hideHeadingSymbol`, a `picker` for `inPageHeadingResolution` (fallback `'explicit'`); `Row`'s union gains `PickerControlRow<HeadingLinkStyle>` and `PickerControlRow<InPageHeadingResolution>`.
- [ ] `api.ts`: the `EditorSettings` pick gains `headingLinkStyle` and `inPageHeadingResolution`, the two that change what the decoration builds; `editorHost.tsx`'s `settings()` copies them, and `useEditorHost`'s memo deps gain both values read through `useSession`. `hideHeadingSymbol` only hides a span, so it rides `applyPersonalization.ts`'s `ROOT_CLASSES` as `hide-heading-symbol`, the way `plainUnresolvedLinks` does.
- [ ] `MarkdownEditor.tsx`: beside the `cbLineCount` effect, read the two from `host.settings()` and dispatch `resolutionNudge` when either changes, so an open page repaints on a settings change.

**AFTER**

```ts
// personalization.ts
export const HEADING_LINK_STYLES = ['page-heading', 'heading-only'] as const
export type HeadingLinkStyle = (typeof HEADING_LINK_STYLES)[number]
export const HEADING_LINK_STYLE_LABELS: Record<HeadingLinkStyle, string> = {
  'page-heading': 'Page & Heading',
  'heading-only': 'Heading Only',
}
export const IN_PAGE_HEADING_RESOLUTIONS = ['explicit', 'automatic'] as const
export type InPageHeadingResolution = (typeof IN_PAGE_HEADING_RESOLUTIONS)[number]
export const IN_PAGE_HEADING_RESOLUTION_LABELS: Record<InPageHeadingResolution, string> = {
  explicit: 'Explicit',
  automatic: 'Automatic',
}
…
  plainUnresolvedLinks?: boolean
  headingLinkStyle?: HeadingLinkStyle
  hideHeadingSymbol?: boolean
  inPageHeadingResolution?: InPageHeadingResolution
```

```ts
// codec.ts
    plainUnresolvedLinks: bool(p.plainUnresolvedLinks),
    headingLinkStyle: HEADING_LINK_STYLES.find((d) => d === p.headingLinkStyle),
    hideHeadingSymbol: bool(p.hideHeadingSymbol),
    inPageHeadingResolution: IN_PAGE_HEADING_RESOLUTIONS.find((d) => d === p.inPageHeadingResolution),
```

```ts
// frames.ts, after the plainUnresolvedLinks row
          {
            kind: 'picker',
            key: 'headingLinkStyle',
            label: 'Heading Link Style',
            options: HEADING_LINK_STYLES.map((value) => ({ value, label: HEADING_LINK_STYLE_LABELS[value] })),
            fallback: 'page-heading',
          },
          { kind: 'toggle', key: 'hideHeadingSymbol', label: 'Hide Heading Symbol (§)' },
          {
            kind: 'picker',
            key: 'inPageHeadingResolution',
            label: 'In-Page Heading Resolution',
            options: IN_PAGE_HEADING_RESOLUTIONS.map((value) => ({
              value,
              label: IN_PAGE_HEADING_RESOLUTION_LABELS[value],
            })),
            fallback: 'explicit',
          },
```

```ts
// MarkdownEditor.tsx, beside the cbLineCount effect
  const { headingLinkStyle, inPageHeadingResolution } = host.settings()
  useEffect(() => {
    viewRef.current?.dispatch({ effects: resolutionNudge.of(null) })
  }, [headingLinkStyle, inPageHeadingResolution])
```

```ts
// applyPersonalization.ts
  plainUnresolvedLinks: 'plain-unresolved',
  hideHeadingSymbol: 'hide-heading-symbol',
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; the `PickerOption` shape matches `dateFormat`'s row in the same file.
- [ ] `personalization.test.ts`: the codec passes each valid value and drops junk (7 → 9).
- [ ] Settings › Pages & Writing › Links shows three new rows with no captions; each writes its key to `.nexus/settings.json`.

#### Task 3.2

**TASK:** A wikilink token carries a `fragment` range, its `contentRange` spans page, `#`, and heading, and `docCache.ts` gains `docOutline` and `docHeadingKeys`.

**FILES:** `Core/MarkdownPM/Engine/tokens.ts`, `Core/MarkdownPM/Engine/tokens.test.ts`, `Core/MarkdownPM/docCache.ts`, `Core/MarkdownPM/Links/connectionClicks.ts`, `Core/MarkdownPM/Tables/cellStatic.tsx`, `Core/MarkdownPM/Links/linkEdit.ts`

**DEPENDENCIES:** Tasks 3.3, 3.5, 5.2, 6.1, 7.1 read `fragment`, `docOutline`, `docHeadingKeys`.

**NOW**

```ts
export interface Token {
  kind: TokenKind
  range: [number, number]
  contentRange: [number, number]
  resolveRange?: [number, number]
  markerRanges: [number, number][]
}

export function shiftToken(tk: Token, by: number): Token {
  const move = ([s, e]: [number, number]): [number, number] => [s + by, e + by]
  return {
    kind: tk.kind,
    range: move(tk.range),
    contentRange: move(tk.contentRange),
    ...(tk.resolveRange ? { resolveRange: move(tk.resolveRange) } : {}),
    markerRanges: tk.markerRanges.map(move),
  }
}

function wikiLinkTokens(text: string, inCode: (offset: number) => boolean): Token[] {
  const tokens: Token[] = []
  for (const m of text.matchAll(pageLinkPattern())) {
    const s = linkSpans(m)
    if (!s || inCode(s.full[0])) continue
    const [fs, fe] = s.full
    const alias = s.alias && s.alias[1] > s.alias[0] ? s.alias : null
    const shown = alias ?? s.title
    tokens.push({
      kind: 'wikiLink',
      range: [fs, fe],
      contentRange: shown,
      ...(alias ? { resolveRange: s.title } : {}),
      markerRanges: [
        [fs, shown[0]],
        [shown[1], fe],
      ],
    })
  }
  return tokens
}
```

**CHANGE**

- [ ] `Token` gains `fragment?: [number, number]`, shifted like `resolveRange`. Export `aliasedToken(tk)`: `tk.resolveRange !== undefined && tk.contentRange[0] !== tk.resolveRange[0]`. Today three readers spell "aliased" as `tk.resolveRange !== undefined` (`Links/connectionClicks.ts`, `Tables/cellStatic.tsx`, `Links/linkEdit.ts`); each moves to the predicate in this task, since a heading token now carries `resolveRange` too.
- [ ] `wikiLinkTokens`: with a heading and no alias, `contentRange` runs from the title's start to the heading's end and `resolveRange` is the title span, so every status read keeps resolving the page; `fragment` is the heading span whenever a heading was written and is non-empty. With an alias, `resolveRange` stays the title span and `fragment` is still set (Task 5.2 reads it for travel).
- [ ] `docCache.ts`: `docOutline = perDoc((doc) => headingOutline(docString(doc)))` and `docHeadingKeys = perDoc((doc) => docOutline(doc).map((h) => normalizeTitle(h.text)))`, a `string[]` like `headingsOf`'s answer.

**AFTER**

```ts
export interface Token {
  kind: TokenKind
  range: [number, number]
  contentRange: [number, number]
  resolveRange?: [number, number]
  fragment?: [number, number]
  markerRanges: [number, number][]
}

export function shiftToken(tk: Token, by: number): Token {
  const move = ([s, e]: [number, number]): [number, number] => [s + by, e + by]
  return {
    kind: tk.kind,
    range: move(tk.range),
    contentRange: move(tk.contentRange),
    ...(tk.resolveRange ? { resolveRange: move(tk.resolveRange) } : {}),
    ...(tk.fragment ? { fragment: move(tk.fragment) } : {}),
    markerRanges: tk.markerRanges.map(move),
  }
}

function wikiLinkTokens(text: string, inCode: (offset: number) => boolean): Token[] {
  const tokens: Token[] = []
  for (const m of text.matchAll(pageLinkPattern())) {
    const s = linkSpans(m)
    if (!s || inCode(s.full[0])) continue
    const [fs, fe] = s.full
    // The leading marker swallows `[[Title|`. An opened-but-empty alias shows nothing, so it stays a plain link.
    const alias = s.alias && s.alias[1] > s.alias[0] ? s.alias : null
    const fragment = s.heading && s.heading[1] > s.heading[0] ? s.heading : null
    const target: [number, number] = [s.title[0], s.heading ? s.heading[1] : s.title[1]]
    const shown = alias ?? target
    tokens.push({
      kind: 'wikiLink',
      range: [fs, fe],
      contentRange: shown,
      // The page half alone resolves; the heading is judged against that page's outline where the token is drawn.
      ...(alias || s.heading ? { resolveRange: s.title } : {}),
      ...(fragment ? { fragment } : {}),
      // The markers tile the whole token, so a renderer drawing only the content span can't disagree with one hiding markers.
      markerRanges: [
        [fs, shown[0]],
        [shown[1], fe],
      ],
    })
  }
  return tokens
}
```

```ts
// docCache.ts
import { headingOutline } from './Engine/headingScan'
import { normalizeTitle } from '@pommora/core/Connections/connections'
…
export const docOutline = perDoc((doc) => headingOutline(docString(doc)))

export const docHeadingKeys = perDoc((doc) => docOutline(doc).map((h) => normalizeTitle(h.text)))

// tokens.ts
/** An alias shows in place of the target: the shown span starts after the page half. A heading token carries `resolveRange` too and is not aliased by that alone. */
export const aliasedToken = (tk: Token): boolean =>
  tk.resolveRange !== undefined && tk.contentRange[0] !== tk.resolveRange[0]
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes: a plain `[[Page]]` token is byte-identical to today (no `resolveRange`, no `fragment`).
- [ ] `tokens.test.ts`, red first: `[[Page#H]]` → `resolveRange` slices `Page`, `fragment` slices `H`, `contentRange` slices `Page#H`, `aliasedToken` false; `[[#H]]` → `resolveRange` empty span, `fragment` `H`; `[[Page#H|a]]` → content `a`, `resolveRange` `Page`, `fragment` `H`, `aliasedToken` true; `[[Page#]]` → no `fragment`, content `Page#`. Count 25 → 29.
- [ ] `grep -rn "resolveRange !== undefined" Core/MarkdownPM --include='*.ts' --include='*.tsx' | grep -v test | grep -v tokens.ts` → 0; the Edit Link row on `[[Page#H]]` reads Add Title, not Edit Title.
- [ ] `regression-pins.test.ts` green.

#### Task 3.3

**TASK:** The decoration draws a resolved heading link per the two settings, with a widget replacing the `#`, and marks a missing heading on the fragment span.

**FILES:** `Core/MarkdownPM/decorations.ts`, `Core/MarkdownPM/Links/aliasRender.test.tsx`

**NOW** — the wikiLink branch of `build` (quoted in full in the Phase 3 scout report; the relevant lines):

```ts
    if (conn) {
      tokens.forEach((tk, i) => {
        if (tk.kind !== 'wikiLink') return
        const [rs, re] = tk.resolveRange ?? tk.contentRange
        const status = conn.resolve(text.slice(rs, re)).status
        const open = active.has(i)
        const pipe =
          tk.resolveRange ?? (text[tk.contentRange[1]] === '|' ? tk.contentRange : undefined)
        if (open && (pipe || status === 'resolved')) {
          ranges.push(connGlyph(status, tk.range[0] + 2))
          if (pipe)
            ranges.push(Decoration.mark({ class: 'md-connection-target' }).range(pipe[0], pipe[1]))
        }
        if (status === 'phantom') { … return }
        ranges.push(
          Decoration.mark({
            class: `md-connection-${status}${open ? ' md-connection-open' : ''}`,
          }).range(tk.contentRange[0], tk.contentRange[1]),
        )
        const bracket = open ? Decoration.mark({ class: 'md-bracket' }) : hideMarker
        for (const [s, e] of tk.markerRanges) ranges.push(bracket.range(s, e))
      })
    }
```

**CHANGE**

- [ ] Add `HeadingJoinWidget(divider: boolean)` beside `ConnGlyphWidget`: `toDOM` returns `<span class="md-heading-join">` holding, when `divider`, `<span class="md-heading-divider">` carrying the imported `segment` class from `@pommora/uix/Elements/segment.css`, and always `<span class="md-heading-symbol">§</span>`, which the `:root.hide-heading-symbol` rule hides; `eq` compares the flag.
- [ ] Read `const { headingLinkStyle } = view.state.facet(editorHost).settings()` once at the top of `build`, and `const ownKeys = docHeadingKeys(view.state.doc)`.
- [ ] Name `alias = aliasedToken(tk)` at the top of the callback, and derive `pipe` from it: `const pipe = alias ? tk.resolveRange : text[tk.contentRange[1]] === '|' ? tk.contentRange : undefined`, so an open heading token no longer draws its page half as a target.
- [ ] Resolution of the page half: an empty `resolveRange` (a bare fragment) resolves as `'resolved'` when a fragment is present and as `'phantom'` when not, so `[[#]]` mid-typing reads as a link being written rather than a clickable `#`.
- [ ] After the phantom return and before the content mark, when `tk.fragment` is set and the token is not `open` and has no alias:
  - the page span (`resolveRange`) is marked `md-connection-resolved` under `page-heading`, hidden with `hideMarker` under `heading-only`; an empty page half pushes nothing (a zero-length replace is never emitted);
  - the `#` character (`fragment[0] - 1`) is replaced by a `HeadingJoinWidget(divider)` where `divider` is `page-heading && page half non-empty`;
  - the fragment span is marked `md-connection-resolved md-connection-heading` plus `md-connection-heading-missing` when the heading is missing: the known keys are `ownKeys` for an empty page half and `conn.headingsOf?.(page.path)` otherwise, and missing means the list exists and lacks `key = normalizeTitle(text.slice(...tk.fragment))`;
  - the markers are hidden as today; `return`.
- [ ] An `open` heading token, or one with an alias, falls through to today's path unchanged, so the caret sees literal `[[Page#Heading]]` with brackets and the glyph.

**AFTER**

```ts
class HeadingJoinWidget extends WidgetType {
  constructor(readonly divider: boolean) {
    super()
  }
  eq(other: HeadingJoinWidget): boolean {
    return other.divider === this.divider
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'md-heading-join'
    if (this.divider) {
      const bar = document.createElement('span')
      bar.className = `${segment} md-heading-divider`
      el.append(bar)
    }
    const sym = document.createElement('span')
    sym.className = 'md-heading-symbol'
    sym.textContent = '§'
    el.append(sym)
    return el
  }
  ignoreEvent(): boolean {
    return false
  }
}
```

```ts
// inside build, before the token loops
  const { headingLinkStyle } = view.state.facet(editorHost).settings()
  const ownKeys = docHeadingKeys(view.state.doc)
…
        const alias = aliasedToken(tk)
        const [rs, re] = tk.resolveRange ?? tk.contentRange
        const bare = rs === re
        const res = bare ? null : conn.resolve(text.slice(rs, re))
        const status = bare ? (tk.fragment ? 'resolved' : 'phantom') : res!.status
        const open = active.has(i)
        const pipe = alias ? tk.resolveRange : text[tk.contentRange[1]] === '|' ? tk.contentRange : undefined
…
        if (tk.fragment && !open && !alias) {
          const [hs, he] = tk.fragment
          const key = normalizeTitle(text.slice(hs, he))
          const known = bare ? ownKeys : res?.page ? conn.headingsOf?.(res.page.path) : undefined
          const missing = known !== undefined && !known.includes(key)
          const showPage = headingLinkStyle !== 'heading-only' && !bare
          if (!bare)
            ranges.push(
              (showPage ? Decoration.mark({ class: 'md-connection-resolved' }) : hideMarker).range(rs, re),
            )
          ranges.push(
            Decoration.replace({ widget: new HeadingJoinWidget(showPage) }).range(hs - 1, hs),
          )
          ranges.push(
            Decoration.mark({
              class: `md-connection-resolved md-connection-heading${missing ? ' md-connection-heading-missing' : ''}`,
            }).range(hs, he),
          )
          for (const [s, e] of tk.markerRanges) ranges.push(hideMarker.range(s, e))
          return
        }
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; `segment` is imported from `@pommora/uix/Elements/segment.css` exactly as `TabBar.tsx` imports it.
- [ ] `aliasRender.test.tsx`, red first, with `conn` extended by `headingsOf: () => ['setup']`: `[[Alpha#Setup]]` at rest renders `Alpha`, a `.md-heading-join` holding `.md-heading-divider` and `.md-heading-symbol`, and `Setup` in `.md-connection-heading`; under `headingLinkStyle: 'heading-only'` no `Alpha` text and no divider; with `:root` carrying `hide-heading-symbol` the symbol span is present and hidden by the stylesheet; `[[#Setup]]` on a doc holding `## Setup` renders `Setup` alone, no divider; `[[Alpha#Gone]]` carries `md-connection-heading-missing`. Count 4 → 9.
- [ ] Placing the caret inside a heading link reveals `[[Alpha#Setup]]` literally.

#### Task 3.4

**TASK:** The stylesheet draws the join, the symbol, and the missing heading.

**FILES:** `Core/MarkdownPM/markdown-pm.css`

**NOW**

```css
.md-connection-resolved {
  color: var(--connection);
  cursor: pointer;
}
```

**CHANGE**

- [ ] After `.md-connection-target`, add the three rules below. The divider's height and gaps are the first pass Nathan adjusts at the stop; they are KNOBs on `.mdpm-shell`.

**AFTER**

```css
.md-heading-join {
  display: inline-flex;
  align-items: center;
  gap: var(--heading-join-gap);
  margin: 0 var(--heading-join-gap);
  vertical-align: -0.1em;
}
.md-heading-divider {
  height: var(--heading-divider-h);
}
.md-heading-symbol {
  color: var(--connection);
}
:root.hide-heading-symbol .md-heading-symbol {
  display: none;
}
.md-connection-heading-missing {
  color: var(--label-tertiary);
  cursor: default;
}
```

and on `.mdpm-shell`:

```css
  --heading-join-gap: 0.3em; /* KNOB */
  --heading-divider-h: 0.9em; /* KNOB */
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; `npm run lint` clean.
- [ ] User confirms: the divider reads as the tab bar's hairline at body size, and the `§` sits flush with the heading text.

#### Task 3.5

**TASK:** A resting table cell resolves the page half and marks a missing heading; the click and hover selectors accept the heading span.

**FILES:** `Core/MarkdownPM/Tables/cellStatic.tsx`

**NOW**

```tsx
// cellStatic.tsx (resting render)
  if (tk.kind === 'wikiLink') {
    const [rs, re] = tk.resolveRange ?? tk.contentRange
    const status = conn?.resolve(text.slice(rs, re)).status
```

```ts
// cellStatic.tsx (cell link target)
  api.resolve(titleOf(text.slice(rs, re)))
```

```ts
// connectionClicks.ts
    const el = (event.target as HTMLElement).closest?.(
      '.md-connection-resolved, .md-connection-ambiguous',
    )
…
      hoverGate: '.md-connection-resolved',
```

**CHANGE**

- [ ] `cellStatic.tsx`: an empty `resolveRange` reads as resolved; the resting span for a fragment token renders the page text, a literal `§`, and the heading text (cells draw no widget), with `md-connection-heading-missing` on the heading part when `conn.headingsOf?.(page.path)` lacks the key; a bare fragment in a cell renders resolved. `cellLinkTarget` keeps resolving `text.slice(rs, re)` and drops `titleOf` there since `rs, re` is now the page span.
- [ ] The click and hover selectors need no change, since the heading span carries `md-connection-resolved`; a click on the missing span still opens the page (Task 5.2 decides travel).

**AFTER** — `cellStatic.tsx`, the resolved branch:

```tsx
      else {
        const frag = tk.fragment
        const page = conn?.resolve(text.slice(rs, re)).page
        const missing =
          frag && page && conn?.headingsOf?.(page.path)?.includes(normalizeTitle(text.slice(frag[0], frag[1]))) === false
        out.push(
          <span key={key++} className={`md-connection-${status}`} data-conn-title={text.slice(rs, re)} data-link-span={`${s},${e}`}>
            {frag ? (
              <>
                {text.slice(rs, re)}
                <span className="md-heading-symbol"> § </span>
                <span className={missing ? 'md-connection-heading-missing' : undefined}>{text.slice(frag[0], frag[1])}</span>
              </>
            ) : (
              content
            )}
          </span>,
        )
      }
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `Tables/widget.test.ts` or a sibling: a cell holding `[[Alpha#Setup]]` renders the three parts and resolves to Alpha; `connectionHover.test.tsx` gains one `it(` that hovering the heading span arms the glance.

#### Task 3.6

**TASK:** A `§` typed inside `[[ ]]` writes `#`.

**FILES:** `Core/MarkdownPM/Links/headingHash.ts` (new), `Core/MarkdownPM/Links/headingHash.test.ts` (new), `Core/MarkdownPM/Input/markdownInput.ts`

**NOW**

```ts
    return apply(
      view,
      calloutShorthand(scan.text, from, from, text, settings) ??
        canonicalizeCheckbox(scan.text, from, from, text) ??
        autoPair(scan, from, from, text, settings) ??
        dashArrow(scan, from, from, text, settings) ??
        ellipsis(scan, from, from, text, settings) ??
        equations(scan, from, from, text, settings),
    )
```

**CHANGE**

- [ ] New `Links/headingHash.ts` exporting `headingHash(scan, selStart, selEnd, inserted): Edit | null`, the inverse of the `Input/edits.ts` guards: it answers only for a single `§` inserted inside a wikilink and outside code.
- [ ] Thread it first in the chain, before `calloutShorthand`.

**AFTER**

```ts
// headingHash.ts
import type { DocScan } from '../Engine/docScan'
import { inCodeAt } from '../Engine/docScan'
import { isInsideWikilink } from '../Engine/parser'
import type { Edit } from '../Input/edits'

/** The one transform that fires only inside a wikilink: every transform in `Input/edits.ts` stands down there, and the file only ever holds `#`. */
export function headingHash(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
): Edit | null {
  if (selStart !== selEnd || inserted !== '§' || inCodeAt(scan, selStart)) return null
  if (!isInsideWikilink(selStart, scan.text)) return null
  return { from: selStart, to: selStart, insert: '#', selection: selStart + 1 }
}
```

```ts
// markdownInput.ts
    return apply(
      view,
      headingHash(scan, from, from, text) ??
        calloutShorthand(scan.text, from, from, text, settings) ??
        …
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; `Edit`'s exported shape matches (`from`, `to`, `insert`, `selection`).
- [ ] `headingHash.test.ts`: `§` at `[[Page|` → `#`; `§` in prose → `null`; `§` inside a code span inside a link → `null`.
- [ ] Typing `[[Page§` in the app leaves `[[Page#` on screen.

#### Review Checkpoint

- [ ] With NexusOS open, a page holding `[[Page#Heading]]`, `[[#Heading]]`, `[[Page#Heading|alias]]`, and `[[Page#Gone]]` reads per the settings, and flipping each setting repaints without a reload.
- [ ] `npm run test` green; the `aliasRender` and `tokens` counts moved as the Baseline says.
- [ ] User confirms: the display under all four setting combinations, and the caret-in reveal.

### Phase 4 — The heading pane

**GOAL:** Typing `#` (or `§`, which Task 3.6 already turned into `#`) after a title inside `[[ ]]` opens the target page's outline in the connection pane; `[[#` opens the current page's; a page row's hover chevron or `→` commits `[[Title#` and slides the outline in under a `‹ Links · Title` top row; `←` slides back; Return commits `[[Title#Heading]]`. Its own phase because the pane is one surface Nathan drives at the stop.

#### Task 4.1

**TASK:** The autocomplete grammar gains the `heading` form, heading rows, and the chevron commit.

**FILES:** `Core/MarkdownPM/Autocomplete/autocomplete.ts`, `Core/MarkdownPM/Autocomplete/autocomplete.test.ts`

**DEPENDENCIES:** Tasks 4.2 and 4.3 read `form: 'heading'`, `headingRows`, `AcRow.level`, and `openHeading`.

**NOW**

```ts
type ConnectionForm = 'link' | 'embed' | 'alias' | 'target'
…
export interface AcRow {
  value: string
  label: string
  pageId?: string
  isPage: boolean
  location: TrailSegment[]
  forget?: () => void
}
…
  const s = linkAt(line, rel)
  if (s) {
    const title = line.slice(s.title[0], s.title[1])
    if (rel >= s.title[0] && rel <= s.title[1])
      return { query: title, from: lineStart + s.full[0], to: lineStart + s.full[1], form: 'link' }
    if (s.alias && rel >= s.alias[0] && rel <= s.alias[1])
      return { … form: 'alias', title }
  }
…
export function commitEdit(
  ac: AutocompleteQuery,
  row: AcRow,
  opts: { keepAlias?: string; openAlias?: boolean } = {},
): CommitEdit {
  if (ac.form === 'link' && opts.openAlias) {
    const text = `[[${row.value}|]]`
    return { changes: [{ from: ac.from, to: ac.to, insert: text }], anchor: ac.from + text.length - 2, opensAlias: true }
  }
```

**CHANGE**

- [ ] `ConnectionForm` gains `'heading'`; `AcRow` gains `level?: number`.
- [ ] `autocompleteQuery`: after the title branch and before the alias branch, when `s.heading` is set and the caret sits in it, return `{ query: heading text, from: lineStart + s.heading[0], to: lineStart + s.heading[1], form: 'heading', title }` where `title` is the page half (`''` for a bare fragment). The title branch's `rel <= s.title[1]` already excludes the `#` position, since `s.title` ends before it.
- [ ] `headingRows(outline, query)`: rows for every outline heading whose normalized text starts with the normalized query, once per text, `value` and `label` the text, `isPage: false`, `location: []`, `level`; an empty query keeps the outline's order; a non-empty one too (flat, filtered).
- [ ] `formSyntax` case `'heading'` returns `value` (the caller's `commitEdit` replaces just the fragment span, like `'alias'`).
- [ ] `commitEdit` gains `opts.openHeading`: for a `'link'` form it writes `[[${row.value}#]]` over the whole token span with the anchor just after the `#`, and `opensHeading: true`, so the next detection reads the caret inside an empty heading span; the `'heading'` form replaces `[ac.from, ac.to]` with the value and sets the anchor after the `]]` that follows (`caret + 2`), like the alias form.

**AFTER**

```ts
type ConnectionForm = 'link' | 'embed' | 'alias' | 'target' | 'heading'
…
export interface AcRow {
  value: string
  label: string
  pageId?: string
  isPage: boolean
  location: TrailSegment[]
  level?: number
  forget?: () => void
}
…
    if (rel >= s.title[0] && rel <= s.title[1])
      return { query: title, from: lineStart + s.full[0], to: lineStart + s.full[1], form: 'link' }
    if (s.heading && rel >= s.heading[0] && rel <= s.heading[1])
      return {
        query: line.slice(s.heading[0], s.heading[1]),
        from: lineStart + s.heading[0],
        to: lineStart + s.heading[1],
        form: 'heading',
        title,
      }
    if (s.alias && rel >= s.alias[0] && rel <= s.alias[1]) …
…
export function headingRows(outline: readonly OutlineHeading[], query: string): AcRow[] {
  const q = normalizeTitle(query)
  const seen = new Set<string>()
  return outline
    .filter((h) => {
      const key = normalizeTitle(h.text)
      if (!key.startsWith(q) || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((h) => ({ value: h.text, label: h.text, isPage: false, location: [], level: h.level }))
}
…
function formSyntax(value: string, form: ConnectionForm, alias?: string): string {
  switch (form) {
    case 'alias':
    case 'heading':
      return value
    …
  }
}
…
interface CommitEdit {
  changes: { from: number; to: number; insert: string }[]
  opensAlias?: boolean
  opensHeading?: boolean
  anchor: number
}

export function commitEdit(
  ac: AutocompleteQuery,
  row: AcRow,
  opts: { keepAlias?: string; openAlias?: boolean; openHeading?: boolean } = {},
): CommitEdit {
  if (ac.form === 'link' && opts.openHeading) {
    const text = `[[${row.value}#]]`
    return {
      changes: [{ from: ac.from, to: ac.to, insert: text }],
      anchor: ac.from + text.length - 2,
      opensHeading: true,
    }
  }
  if (ac.form === 'link' && opts.openAlias) { … unchanged … }
  const { insert, caret } = connectionInsert(row.value, ac.from, ac.form, opts.keepAlias)
  if (ac.form === 'alias' || ac.form === 'heading')
    return { changes: [{ from: ac.from, to: ac.to, insert }], anchor: caret + 2 }
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; `OutlineHeading` is imported as a type from `../Engine/headingScan`.
- [ ] `autocomplete.test.ts`, red first: caret after `[[Page#` → `form: 'heading'`, `title: 'Page'`, `query: ''`; after `[[#Se` → `title: ''`, `query: 'Se'`; `headingRows` filters by prefix and dedupes; `commitEdit` with `openHeading` writes `[[Page#]]` and anchors before the `]]`; a heading commit on `[[Page#Se]]` writes `[[Page#Setup]]` and anchors after `]]`. Count adds 5.
- [ ] The existing four-form tests are green untouched.

#### Task 4.2

**TASK:** Heading rows arrive as pane state from the warm slot or disk, the chevron and `→` open the slide, `←` closes it, and the empty-list close falls out of the candidate gate.

**FILES:** `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts`, `Core/MarkdownPM/MarkdownEditor.tsx`, `Core/MarkdownPM/Tables/CellEditor.tsx`, `Core/MarkdownPM/Autocomplete/connectionCommit.test.tsx`

**NOW**

```ts
export function useConnectionAutocomplete(
  viewRef: RefObject<EditorView | null>,
  host: EditorHost,
  candidatesFor: (q: AcQuery) => AcRow[],
): ConnectionAutocomplete {
  const [ac, setAc] = useState<AcState | null>(null)
  …
  const candidates = useMemo(() => {
    if (query === null || (query === '' && form === 'link')) return []
    const found = candidatesForRef.current({ query, form, title })
    if (found.length === 1 && normalizeTitle(found[0].label) === normalizeTitle(query)) return []
    return found
  }, [query, form, title, host])

  const commit = (row: AcRow): void => {
    …
    const { changes, anchor, opensAlias } = commitEdit(ac, row, { keepAlias: …, openAlias })
    view.dispatch({ changes, selection: { anchor }, ...(opensAlias ? {} : { effects: restedOnLink.of(anchor) }), userEvent: 'input' })
    view.focus()
  }

  const { index, ctl } = useMenuCtl(candidates.length, ac?.query, {
    open: ac !== null && candidates.length > 0,
    pick: (i) => { const r = candidates[i]; if (r) commit(r) },
    close: () => setAc(null),
  })

  return { ac, setAc, candidates, acIndex: index ?? 0, commit, acCtl: ctl }
}
```

**CHANGE**

- [ ] The hook takes a fourth argument `targetOf: (title: string) => { pageId?: string; outline: OutlineHeading[] | Promise<OutlineHeading[]> }`; the editor supplies it (below). An `outline` state (`OutlineHeading[] | null`) is loaded by an effect keyed on `(form === 'heading', title)`: it calls `targetOf(title).outline`, and if the answer is a promise, sets the rows when it lands and the effect is still live. It resets to `null` when the form leaves `'heading'`.
- [ ] `candidates`: for the heading form, `headingRows(outline ?? [], query)`, without the exact-single-match close (a fully typed heading still commits); every other form as today.
- [ ] The open gate for the heading form is `outline === null || candidates.length > 0`, so the pane stays open while the rows load (D-2) and closes once an answer holds nothing (D-5); every other form keeps `candidates.length > 0`.
- [ ] `commit(row, opts?)`: an `openHeading` option threads to `commitEdit`; the alias slide follows a heading commit as it follows a page commit, with `targetOf(ac.title).pageId` in place of `row.pageId`.
- [ ] `viaChevron: boolean` state: set when a chevron/`→` commit happens, cleared when `ac` becomes null or the form is no longer `'heading'`; exposed for the pane, which already holds the page rows it slides from.
- [ ] `AcCtl` gains `aside?: (dir: 1 | -1) => boolean`: `+1` on the link form with a highlighted page row commits with `openHeading`; `-1` on the heading form when `viaChevron` deletes from `ac.from - 1` (the `#`) to `ac.to` and places the caret at `ac.from - 1`, which the next detection reads as the link form again. Both return `false` otherwise so the arrow falls through to the editor.
- [ ] `MarkdownEditor.tsx`: keymap gains `ArrowRight` and `ArrowLeft` bound through `whenAcOpen(acCtls, (c) => c.aside?.(±1) ?? false)` (a `false` lets the key fall through). `targetOf(title)`: an empty title answers `{ outline: docOutline(view.state.doc) }`; otherwise `conn.resolve(title)`, and for a resolved page, `pageId` is its id and `outline` is `headingOutline(slot.body)` when `useSession.getState().pages[page.id]` is a ready slot, else `fetchPageDetail(page.path).then((d) => (d ? headingOutline(d.body) : []))`; an unresolved title answers `{ outline: [] }`.
- [ ] `CellEditor.tsx`: passes the same `targetOf` with the empty-title case answering `{ outline: [] }` (no bare fragment in a cell) and no arrow bindings beyond today's.

**AFTER** — the hook's new parts:

```ts
export function useConnectionAutocomplete(
  viewRef: RefObject<EditorView | null>,
  host: EditorHost,
  candidatesFor: (q: AcQuery) => AcRow[],
  targetOf: (title: string) => { pageId?: string; outline: OutlineHeading[] | Promise<OutlineHeading[]> },
): ConnectionAutocomplete {
  const [ac, setAc] = useState<AcState | null>(null)
  const [outline, setOutline] = useState<OutlineHeading[] | null>(null)
  const [viaChevron, setViaChevron] = useState(false)
  …
  const heading = form === 'heading'
  useEffect(() => {
    if (!heading) {
      setOutline(null)
      setViaChevron(false)
      return
    }
    let live = true
    const got = targetOf(title ?? '').outline
    if (Array.isArray(got)) setOutline(got)
    else void got.then((rows) => live && setOutline(rows))
    return () => {
      live = false
    }
  }, [heading, title])

  const candidates = useMemo(() => {
    if (query === null) return []
    if (heading) return headingRows(outline ?? [], query)
    if (query === '' && form === 'link') return []
    const found = candidatesForRef.current({ query, form, title })
    if (found.length === 1 && normalizeTitle(found[0].label) === normalizeTitle(query)) return []
    return found
  }, [query, form, title, host, heading, outline])

  const commit = (row: AcRow, opts: { openHeading?: boolean } = {}): void => {
    const view = viewRef.current
    if (!view || !ac || !ctl.current.open) return
    const settings = host.settings()
    const worn = ac.form === 'link' ? pageLinkPattern().exec(view.state.doc.sliceString(ac.from, ac.to))?.groups?.alias : undefined
    const pageId = heading ? targetOf(ac.title ?? '').pageId : row.pageId
    const openAlias =
      (ac.form === 'link' || heading) &&
      !opts.openHeading &&
      settings.aliasPickerOnCommit !== false &&
      host.aliases.list(pageId ?? '').length > 0
    const { changes, anchor, opensAlias, opensHeading } = commitEdit(ac, row, {
      keepAlias: settings.removeTitleOnLinkChange !== false ? undefined : worn,
      openAlias,
      openHeading: opts.openHeading,
    })
    if (opensHeading) setViaChevron(true)
    view.dispatch({
      changes,
      selection: { anchor },
      ...(opensAlias || opensHeading ? {} : { effects: restedOnLink.of(anchor) }),
      userEvent: 'input',
    })
    view.focus()
  }

  const { index, ctl } = useMenuCtl(candidates.length, ac?.query, {
    open: ac !== null && (heading ? outline === null || candidates.length > 0 : candidates.length > 0),
    pick: (i) => {
      const r = candidates[i]
      if (r) commit(r)
    },
    close: () => setAc(null),
    aside: (dir) => {
      const view = viewRef.current
      if (!view || !ac) return false
      if (dir === 1 && ac.form === 'link') {
        const r = candidates[index ?? 0]
        if (!r?.isPage) return false
        commit(r, { openHeading: true })
        return true
      }
      if (dir === -1 && heading && viaChevron) {
        view.dispatch({ changes: { from: ac.from - 1, to: ac.to, insert: '' }, selection: { anchor: ac.from - 1 }, userEvent: 'delete' })
        return true
      }
      return false
    },
  })

  return { ac, setAc, candidates, acIndex: index ?? 0, commit, acCtl: ctl, viaChevron, loading: heading && outline === null }
}
```

```ts
// MarkdownEditor.tsx, the two new keys
        { key: 'ArrowRight', run: whenAcOpen(acCtls, (c) => c.aside?.(1) ?? false) },
        { key: 'ArrowLeft', run: whenAcOpen(acCtls, (c) => c.aside?.(-1) ?? false) },
```

(`whenAcOpen` today returns `true` whenever a control is open; it changes to return the driver's boolean when the driver returns one, so an unhandled arrow moves the caret. `useMenuCtl`'s `drive` type gains the optional `aside`.)

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; `useBlockMenu`'s `ctl` needs no `aside`.
- [ ] `connectionCommit.test.tsx`, red first: with a page `Notes` holding `## Setup`, typing `[[Not` then `→` leaves `[[Notes#]]` with the caret before `]]` and the pane lists `Setup`; Return leaves `[[Notes#Setup]]`; `←` from the heading list leaves `[[Notes` with the page list open; `[[#` on a doc with headings lists them; `[[Notes#` on a page with none closes the pane.
- [ ] A typed exact title still closes the page list, and `#` from there opens the heading list.

#### Task 4.3

**TASK:** The pane draws the heading form as the outline menu does, slides from the page list with a `‹ Links · Title` top row when it arrived by the chevron, and shows a hover chevron on page rows.

**FILES:** `Core/MarkdownPM/Autocomplete/AutocompletePane.tsx`, `Core/MarkdownPM/Autocomplete/aliasPicker.test.tsx`

**NOW**

```tsx
  const cameFrom = useRef<AcRow[]>([])
  if (live && v.ac.form !== 'alias') cameFrom.current = v.candidates
  useEffect(() => {
    if (ac === null) cameFrom.current = []
  }, [ac])
  const sliding = v.ac.form === 'alias' && cameFrom.current.length > 0
…
          trailing={
            row.forget && (
              <HoverRemove reveal="host" className="mdpm-ac-forget" label={`Forget ${row.label}`} onRemove={row.forget} />
            )
          }
…
      <FrameSlide
        open={sliding}
        root={sliding ? slot(cameFrom.current, false) : shown}
        detail={sliding ? shown : null}
      />
```

**CHANGE**

- [ ] Props gain `viaChevron: boolean`, `loading: boolean`, `onAside: (row: AcRow) => void` (the chevron's click, which calls `commit(row, { openHeading: true })`), and `onBack: () => void` (the top row's Back, which is `acCtl.current.aside(-1)`). `live` becomes `ac !== null && (candidates.length > 0 || loading)`, and `viaChevron` joins the frozen `last.current` beside `ac` so a closing slide reads one consistent state.
- [ ] `cameFrom` captures only on the `'link'` form. `sliding` is true for the alias slide as today, or for the heading form when the frozen `viaChevron` is set; the slide's root is `cameFrom.current` in both cases.
- [ ] The heading form's slot: when the query is empty, the rows nest through `outlineTree` and render as `DisclosureRow`s with `className={itemEmphasized}` (not `picker`, whose branch drops the class), `dropOutline` `'chevron'` for a row with children else `'spacer'`, all open, committing on mousedown with `preventDefault` through the row's `wrap` prop so the caret never leaves the editor; with a query, the flat rows render through the same row builder with no nesting. Selection highlighting follows `index` over the flat candidate order in both cases. While `loading`, the slot renders empty. When `viaChevron` is set, `MenuTopRow label="Links" current={ac.title} onBack={onBack}` is the frame's `header`, as `PropertyPanel.tsx` passes it, so it stays pinned while the rows scroll.
- [ ] A page row's `trailing` becomes the forget × when present, else a hover-revealed `chevron-right` `Icon` inside a `<button>` carrying `mdpm-ac-aside` that calls `onAside(row)` on mousedown with `preventDefault`; the existing mousedown handler ignores a target inside `.mdpm-ac-aside` the way it ignores `.mdpm-ac-forget`.

**AFTER** — the pane's changed parts:

```tsx
  const cameFrom = useRef<AcRow[]>([])
  if (live && v.ac.form === 'link') cameFrom.current = v.candidates
  useEffect(() => {
    if (ac === null) cameFrom.current = []
  }, [ac])
  const headingSlide = v.ac.form === 'heading' && v.viaChevron
  const sliding = (v.ac.form === 'alias' && cameFrom.current.length > 0) || headingSlide
…
  const headingRow = (row: AcRow, i: number, children?: React.ReactNode): React.JSX.Element => (
    <DisclosureRow
      key={row.value}
      title={row.label}
      icon={null}
      className={itemEmphasized}
      dropOutline={children ? 'chevron' : 'spacer'}
      open
      onToggle={() => {}}
      selected={i === v.index}
      wrap={(node) => (
        <div
          ref={i === v.index ? keepInView : undefined}
          onMouseDown={(e) => {
            e.preventDefault()
            onPick(row)
          }}
        >
          {node}
        </div>
      )}
    >
      {children}
    </DisclosureRow>
  )
  const nested = (rows: AcRow[]): React.JSX.Element[] => {
    const at = new Map(rows.map((r, i) => [r.value, i]))
    const walk = (nodes: OutlineNode[]): React.JSX.Element[] =>
      nodes.map((n) => {
        const row = rows[at.get(n.text) ?? 0]
        return headingRow(row, at.get(n.text) ?? 0, n.children.length ? walk(n.children) : undefined)
      })
    return walk(outlineTree(rows.map((r) => ({ from: 0, key: r.value, text: r.label, level: r.level ?? 1 }))))
  }
  const headingSlot = (rows: AcRow[]): React.JSX.Element => (
    <MenuScrollFrame
      maxHeight={PICKER_MAX_HEIGHT}
      className="mdpm-autocomplete-slot"
      header={headingSlide ? <MenuTopRow label="Links" current={v.ac.title} onBack={onBack} /> : undefined}
    >
      {loading ? null : v.ac.query !== '' ? rows.map((r, i) => headingRow(r, i)) : nested(rows)}
    </MenuScrollFrame>
  )
```

```tsx
          trailing={
            row.forget ? (
              <HoverRemove reveal="host" className="mdpm-ac-forget" label={`Forget ${row.label}`} onRemove={row.forget} />
            ) : row.isPage ? (
              <button
                type="button"
                className="mdpm-ac-aside"
                aria-label={`Headings of ${row.label}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onAside(row)
                }}
              >
                <Icon name="chevron-right" size="footnote" />
              </button>
            ) : undefined
          }
…
      <FrameSlide
        open={sliding}
        root={sliding ? slot(cameFrom.current, false) : v.ac.form === 'heading' ? headingSlot(v.candidates) : shown}
        detail={sliding ? (headingSlide ? headingSlot(v.candidates) : shown) : null}
      />
```

`markdown-pm.css` gains `.mdpm-ac-aside` reading like `.mdpm-ac-forget` (revealed on the host row's hover, no background).

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; the pane still owns no focus and no dismiss; `MenuScrollFrame`'s `header` prop exists (`PropertyPanel.tsx`, `HiddenFrame.tsx` pass it).
- [ ] `aliasPicker.test.tsx` gains two `it(`: the heading slide shows `MenuTopRow` with the page's title; a hand-typed `#` shows no top row.
- [ ] User confirms: the chevron reveals on hover, `→`/`←` slide both ways, Return commits, the alias slide follows when that setting is on, the tree shows when the query is empty and flattens as one types.

#### Review Checkpoint

- [ ] User confirms the pane end to end on a real page: typed `#`, typed `§`, `[[#`, the chevron, `→`, `←`, Backspace over the `#`, Escape, a page with no headings.
- [ ] `npm run test` green; the autocomplete counts moved as the Baseline says.

### Phase 5 — Following and Copy Link

**GOAL:** A click on a heading link opens the page as today and lands on the heading, whether the page mounts fresh, is already open in a tab, or opens in the Page Window; the glance pane opens scrolled there; the heading grip copies `[[Page#Heading]]`. Its own phase because it adds the one new session record and the `arrive` prop that two surfaces share.

#### Task 5.1

**TASK:** `pendingTravel` in the navigation slice, `nearestHeading` and `travelToHeading`, the `arrive` prop on `MarkdownEditor`, and its two consumers.

**FILES:** `Core/Session/navigationSlice.ts`, `Core/MarkdownPM/MarkdownEditor.tsx`, `Core/MarkdownPM/travel.ts`, `Core/MarkdownPM/travel.test.ts`, `Core/Pages/PageView.tsx`, `Core/Tiles/Surfaces/PageTile.tsx`, `Core/Interface/Windows/PageWindow.tsx`, `Core/Session/store.test.tsx`

**DEPENDENCIES:** Task 5.2 calls `setPendingTravel` and `travelToHeading`; Task 5.3 passes `arrive` to `PageTile`.

**NOW**

```tsx
// MarkdownEditor.tsx mount effect, the settle
    if (foldsLoad || heightsLoad || zoomsLoad || colsLoad)
      void Promise.allSettled([foldsLoad, heightsLoad, zoomsLoad, colsLoad]).then(
        ([keys, h, z, cols]) => {
          …
          restoreScroll()
        },
      )
    else requestAnimationFrame(restoreScroll)
```

```tsx
// PageTile.tsx
      <MarkdownEditor
        key={epoch}
        initialBody={body}
        …
        embedAncestors={[...(ancestors ?? []), path]}
      />
```

**CHANGE**

- [ ] `navigationSlice.ts`: `pendingTravel: { route: 'tab' | 'window'; path: string; heading: string } | null`, `setPendingTravel(t)`, `clearPendingTravel()`. `resetNexusSession` clears it. No stamp: `onArrived` clears the record, so the prop cycles through `undefined` between two clicks and an effect keyed on the heading fires each time.
- [ ] `travel.ts`: `nearestHeading(outline, heading, near)` picks, among outline entries whose normalized text equals the heading's, the one whose `from` is closest to `near`; `travelToHeading(view, heading, near?)` resolves through `docOutline(view.state.doc)` and calls `travelTo`. `near` defaults to the document offset at the scroller's top edge, `view.lineBlockAtHeight(view.scrollDOM.getBoundingClientRect().top - view.documentTop).from` (heights are relative to `documentTop`, as `caret.ts` converts them), which is A-5's warm-position rule when the page was already open; a fresh mount passes `0`.
- [ ] `MarkdownEditor.tsx`: prop `arrive?: string` (the heading). On mount, after `restoreScroll()` in both branches, if `arrive` is set, `travelToHeading(view, arrive, 0)`. An effect on `[arrive]` skips the first run (the mount consumed it) and travels on later values. Each travel calls `onArrived?.()` so the surface clears the record.
- [ ] `PageView.tsx`: selects `pendingTravel`, and when `route === 'tab'` and `path` matches, passes `arrive={heading}` and `onArrived={clearPendingTravel}`.
- [ ] `PageTile.tsx`: prop `arrive?: string` forwarded with `onArrived`; `PageWindow.tsx` selects `pendingTravel` for `route === 'window'` and its `target.path` and passes it, clearing on arrival.

**AFTER**

```ts
// navigationSlice.ts additions
export interface PendingTravel {
  route: 'tab' | 'window'
  path: string
  heading: string
}
…
  pendingTravel: null,
  setPendingTravel: (pendingTravel) => set({ pendingTravel }),
  clearPendingTravel: () => set({ pendingTravel: null }),
```

```ts
// travel.ts additions
export function nearestHeading(outline: readonly OutlineHeading[], heading: string, near: number): number | null {
  const key = normalizeTitle(heading)
  let best: number | null = null
  for (const h of outline) {
    if (normalizeTitle(h.text) !== key) continue
    if (best === null || Math.abs(h.from - near) < Math.abs(best - near)) best = h.from
  }
  return best
}

/** Heights are relative to `documentTop`, so the scroller's top edge is converted before the block is read. */
export function travelToHeading(view: EditorView, heading: string, near?: number): void {
  const top = view.scrollDOM.getBoundingClientRect().top - view.documentTop
  const at = nearestHeading(docOutline(view.state.doc), heading, near ?? view.lineBlockAtHeight(top).from)
  if (at !== null) travelTo(view, at)
}
```

```tsx
// MarkdownEditor.tsx
  arrive,
  onArrived,
…
  const arriveRef = useRef(arrive)
  arriveRef.current = arrive
  const onArrivedRef = useRef(onArrived)
  onArrivedRef.current = onArrived
…
    const land = (): void => {
      restoreScroll()
      const a = arriveRef.current
      if (a) {
        travelToHeading(view, a, 0)
        onArrivedRef.current?.()
      }
    }
    // then `land()` replaces both `restoreScroll()` calls in the settle branches
…
  const firstArrive = useRef(true)
  useEffect(() => {
    if (firstArrive.current) {
      firstArrive.current = false
      return
    }
    const view = viewRef.current
    if (!view || !arrive) return
    travelToHeading(view, arrive)
    onArrived?.()
  }, [arrive])
```

```tsx
// PageView.tsx
  const pendingTravel = useSession((s) => s.pendingTravel)
  const clearPendingTravel = useSession((s) => s.clearPendingTravel)
  const arrive =
    pendingTravel?.route === 'tab' && pendingTravel.path === path ? pendingTravel.heading : undefined
  …
        arrive={arrive}
        onArrived={clearPendingTravel}
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; the mount-time travel runs after `applySavedFolds`, so `expandFoldsAt` sees the folds.
- [ ] `store.test.tsx`: `setPendingTravel` holds the record; `clearPendingTravel` nulls it. `travel.test.ts`: `nearestHeading` picks the closer of two `Setup`s (4 → 5).
- [ ] User confirms: click a heading link to a closed page (fresh mount lands on the heading, folds opened); click one to a page already in a tab (lands without re-mount); ⌘-click; with Open Connections In Preview on, the Page Window lands.

#### Task 5.2

**TASK:** The click path carries the heading from the token to `ConnectionsApi.open`.

**DEPENDENCIES:** Reads Task 5.1's `setPendingTravel` and `travelToHeading`.

**FILES:** `Core/MarkdownPM/Links/connectionsApi.ts`, `Core/MarkdownPM/Links/connectionClicks.ts`, `Core/MarkdownPM/Links/linkClicks.ts`, `Core/MarkdownPM/Tables/cellStatic.tsx`, `Core/MarkdownPM/api.ts`, `Core/Session/pageConnections.ts`, `Core/Interface/Menus/connectionMenuActions.ts`

**NOW**

```ts
export interface ConnectionsApi extends PageIndex {
  open: (page: ConnPage) => void
  menu?: (target: ConnMenuTarget) => void
  bypass?: (page: ConnPage) => void
}

export type MdTarget = { kind: 'page'; page: ConnPage } | { kind: 'external' } | { kind: 'invalid' }

export function resolveMdTarget(index: PageIndex | undefined, rawTarget: string): MdTarget {
  const title = targetTitle(rawTarget)
  if (index && title) {
    const res = index.resolve(title)
    if (res.status === 'resolved' && res.page) return { kind: 'page', page: res.page }
  }
  return isValidLink(rawTarget) ? { kind: 'external' } : { kind: 'invalid' }
}

export function openPage(api: ConnectionsApi, page: ConnPage, bypass: boolean): void {
  if (bypass && api.bypass) api.bypass(page)
  else api.open(page)
}
```

```ts
// connectionClicks.ts
interface WikiHit {
  title: string
  range: [number, number]
  content: [number, number]
  aliased: boolean
}
function wikiLinkAt(view: EditorView, pos: number): WikiHit | null {
  …
  const [rs, re] = tk.resolveRange ?? tk.contentRange
  return { title: line.text.slice(rs, re), range: abs(tk.range), content: abs(tk.contentRange), aliased: tk.resolveRange !== undefined }
}
…
      follow: ({ page }, view, event) =>
        page ? followTarget({ kind: 'page', page }, '', getApi(), isCmd(event), event.target as Element, view.state.facet(editorHost)) : null,
      dwell: ({ page }, el, glance) =>
        page ? () => glance.arm({ kind: 'page', id: page.id, path: page.path }, el) : null,
```

```ts
// api.ts
export type GlanceTarget =
  | { kind: 'page'; id: string; path: string }
  | { kind: 'site'; url: string }
```

**CHANGE**

- [ ] `ConnectionsApi.open` and `bypass` take `(page, heading?: string)`; `openPage` takes and forwards `heading`. `MdTarget`'s page variant gains `heading?: string`, and a new variant `{ kind: 'self'; heading: string }` stands for a bare fragment (`targetTitle` returned `''`). `resolveMdTarget` fills `heading` from `targetFragment(rawTarget)` when non-empty.
- [ ] `connectionClicks.ts`: `WikiHit` gains `heading: string | null` from `tk.fragment` and `self: boolean` (an empty `resolveRange`); `connHitAt` treats `self` as resolved with `page: null`; `follow` passes `{ kind: 'page', page, heading }` or, for `self`, `{ kind: 'self', heading }`; `dwell` arms `{ kind: 'page', id, path, heading }` and arms nothing for `self`.
- [ ] `linkClicks.ts` `followTarget` gains a trailing `view: EditorView | null` and `at: number` (the click position): the page case returns `() => openPage(api, page, bypass, target.heading)`; the `self` case returns `view ? () => travelToHeading(view, target.heading, at) : null`, so both the wikilink and the markdown click paths (each has the view in hand) travel, and a resting cell answers `null`. `dwellTarget` forwards the heading for a page target.
- [ ] `cellStatic.tsx`'s `cellLinkTarget` passes the fragment the same way for a cell's wikilink and markdown link; a cell has no view, so its `self` case answers `null`.
- [ ] `api.ts` `GlanceTarget` page variant gains `heading?: string`.
- [ ] `ConnMenuTarget`'s page variant gains `heading?: string`; `connectionClicks`' and `cellStatic`'s menu hooks pass the hit's heading; `Core/Interface/Menus/connectionMenuActions.ts`'s `title:copylink` writes `connectionText(page.title, undefined, heading)`, so the connection menu's Copy Link copies the fragment form (E-4). Edit Link keeps editing the whole target.
- [ ] `pageConnections.ts`: both hooks' `open` and `bypass` accept `heading` and, when set, call `setPendingTravel({ route, path: page.path, heading })` before the navigation call: `open`'s `route` is `'window'` when it goes to the Page Window (`openInWindow` in the preview hook; always in the window hook) and `'tab'` otherwise; `bypass` is `select(…, { newTab: true })` in both hooks, so its route is always `'tab'`.

**AFTER**

```ts
export interface ConnectionsApi extends PageIndex {
  open: (page: ConnPage, heading?: string) => void
  menu?: (target: ConnMenuTarget) => void
  bypass?: (page: ConnPage, heading?: string) => void
  headingsOf?: (path: string) => string[] | undefined
}

export type MdTarget =
  | { kind: 'page'; page: ConnPage; heading?: string }
  | { kind: 'self'; heading: string }
  | { kind: 'external' }
  | { kind: 'invalid' }

export function resolveMdTarget(index: PageIndex | undefined, rawTarget: string): MdTarget {
  const title = targetTitle(rawTarget)
  const heading = targetFragment(rawTarget)
  if (title === '' && heading) return { kind: 'self', heading }
  if (index && title) {
    const res = index.resolve(title)
    if (res.status === 'resolved' && res.page)
      return heading ? { kind: 'page', page: res.page, heading } : { kind: 'page', page: res.page }
  }
  return isValidLink(rawTarget) ? { kind: 'external' } : { kind: 'invalid' }
}

export function openPage(api: ConnectionsApi, page: ConnPage, bypass: boolean, heading?: string): void {
  if (bypass && api.bypass) api.bypass(page, heading)
  else api.open(page, heading)
}
```

```ts
// connectionClicks.ts, the self follow
      follow: ({ hit, page }, view, event) =>
        followTarget(
          hit.self ? { kind: 'self', heading: hit.heading ?? '' } : page ? { kind: 'page', page, heading: hit.heading ?? undefined } : { kind: 'invalid' },
          '',
          getApi(),
          isCmd(event),
          event.target as Element,
          view.state.facet(editorHost),
          view,
          hit.range[0],
        ),
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; every `open(`/`bypass(` caller compiles with the optional parameter.
- [ ] `mdLinkTarget.test.tsx`: `resolveMdTarget(index, 'Alpha#Setup')` → page with heading; `'#Setup'` → `self`; clicking `[x](#Setup)` travels.
- [ ] A test in `linkEdges.test.tsx` or a new `connectionClicks.test.tsx`: clicking `[[#Setup]]` in a doc with `## Setup` calls `travelTo` with that line's offset.

#### Task 5.3

**TASK:** The glance pane opens scrolled to the heading.

**FILES:** `Core/Interface/Glance/GlancePane.tsx`, `Core/MarkdownPM/Links/linkClicks.ts`

**NOW**

```tsx
  const renderPageTile = (t: { id: string; path: string }, seam: WarmSeam | undefined): React.JSX.Element => (
    <PageTile key={t.path} path={t.path} editing={false} onBeginEdit={NOOP} locked connections={resolveOnly} warm={seam} ancestors={GLANCE_ANCESTORS} />
  )
```

**CHANGE**

- [ ] `renderPageTile` takes the target's `heading` and passes `arrive={heading}`; the guest editor's mount path travels, and a re-arm on the same page with a different heading travels through the `[arrive]` effect since the tile stays mounted under `key={t.path}`. A re-arm with the same heading stays where it is.
- [ ] `dwellTarget` forwards `target.heading` into the arm (Task 5.2 already reads it on the wikilink path; this covers markdown links).

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] User confirms: resting on `[[Notes#Setup]]` opens the glance already at Setup.

#### Task 5.4

**TASK:** The heading grip gains Copy Link, writing `[[Page#Heading]]` through the editor host's clipboard.

**FILES:** `Core/Actions/gripMenu.ts`, `Core/Actions/gripMenu.test.ts`, `Core/MarkdownPM/Menus/gripMenu.ts`, `Core/MarkdownPM/api.ts`, `Core/Pages/editorHost.tsx`

**NOW**

```ts
// Core/Actions/gripMenu.ts
    case 'heading':
      return [
        { label: 'Rename', action: 'rename' },
        { label: 'Size', action: 'size:0', submenu: … },
      ]
```

```ts
// Core/MarkdownPM/Menus/gripMenu.ts
    if (action === 'rename') focusRange(view, contentStart, line.to)
    else if (action === 'delete') { … }
    else { … size … }
```

**CHANGE**

- [ ] `GripMenuAction` gains `'copyLink'`; the heading rows read `Rename · Copy Link · Size ▸`; the existing test's `['Rename', 'Size', 'Delete']` becomes `['Rename', 'Copy Link', 'Size', 'Delete']`.
- [ ] `EditorHost` gains `pageTitle(): string | null`; `buildEditorHost` answers it from the live tree, `pagesByIdOf(state().tree).get(pageId)?.title ?? null`, never from the capped detail cache; callers without a `pageId` answer `null`.
- [ ] `popHeadingMenu`: `copyLink` writes `connectionText(title, undefined, heading)` through `host.clipboard.write`. The row is offered only when `ctx.linkable`, computed in `popHeadingMenu` as `host.pageTitle() !== null && embeddableTitle(heading)`, so a heading holding `]]`, `|`, or `#`, or a surface without a title, never copies a link that resolves only on its own page.

**AFTER**

```ts
// Core/Actions/gripMenu.ts
  | { kind: 'heading'; level: number; linkable: boolean }
…
  | 'copyLink'
…
    case 'heading':
      return [
        { label: 'Rename', action: 'rename' },
        ...(ctx.linkable ? [{ label: 'Copy Link', action: 'copyLink' as const }] : []),
        { label: 'Size', action: 'size:0', submenu: … },
      ]
```

```ts
// Core/MarkdownPM/Menus/gripMenu.ts
  const heading = headingParts(opened.text)?.content.trim() ?? ''
  const title = host.pageTitle()
  void host.menus.grip({ kind: 'heading', level, linkable: title !== null && embeddableTitle(heading) }).then((action) => {
    …
    if (action === 'rename') focusRange(view, contentStart, line.to)
    else if (action === 'copyLink' && title !== null)
      void host.clipboard.write(connectionText(title, undefined, parts.content.trim()))
    else if (action === 'delete') { … }
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `gripMenu.test.ts`: the heading rows include Copy Link when `linkable`; a `linkable: false` context omits it (5 → 6; the existing `['Rename', 'Size', 'Delete']` assertion becomes `['Rename', 'Copy Link', 'Size', 'Delete']`).
- [ ] User confirms: right-click a heading, Copy Link, paste into another page, and the pasted link resolves and travels.

#### Review Checkpoint

- [ ] User confirms the four routes: fresh tab, already-open tab, Page Window, glance; plus Copy Link → paste → click.
- [ ] `npm run test` green.

### Phase 6 — The rename cascade

**GOAL:** Editing a heading line rewrites that page's own links to it inside the same transaction; once the edit settles, one ask reaches main, which rewrites every other file the index names and the page's fold keys follow; a rename landing from outside is recognized by the index re-scan and takes the same main-side path. Its own phase because it is the one place a keystroke reaches the disk of other files, and Nathan tests it live.

#### Task 6.1

**TASK:** A transaction filter recognizes a heading rename, stamps the transaction with a `headingRenamed` effect, and appends the same-page rewrites to it.

**FILES:** `Core/MarkdownPM/Guards/headingRenameGuard.ts` (new), `Core/MarkdownPM/Guards/headingRenameGuard.test.ts` (new), `Core/MarkdownPM/Guards/calloutGuard.ts`, `Core/MarkdownPM/MarkdownEditor.tsx`

**DEPENDENCIES:** Task 6.2 reads the `headingRenamed` effect.

**NOW** — the guard precedent, `Guards/calloutGuard.ts`:

```ts
export function verdictFilter(verdict: …): Extension {
  return EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged || tr.annotation(syncLanding)) return tr
    const doc = docString(tr.startState.doc)
    …
    return [{ changes, effects: tr.effects, scrollIntoView: tr.scrollIntoView, annotations: carriedAnnotations(tr) }]
  })
}
```

**CHANGE**

- [ ] `headingRenameOf(tr: Transaction): { old: string; next: string; line: number } | null`, pure over the transaction: among its changed ranges, exactly one sits on a heading line on both sides (the line at `fromA` in `tr.startState.doc` and at `fromB` in `tr.newDoc`, two `lineAt` reads, never two document strings), stays within that line, and changes its trimmed content from a non-empty old text; the other ranges are ignored, so an undo that restores a heading and its same-page links in one composite transaction still reads as a rename. An empty old content (typed fresh) is `null`; an empty new content (cleared) is a rename to `''`, which the guard rewrites nothing for and the listener (Task 6.2) keeps in its trail. A `syncLanding` transaction is `null`.
- [ ] `headingRenamed` is a `StateEffect<{ old: string; next: string; line: number }>` exported from the guard, `line` being the heading's own line number in the new document, so the outline menu's and the grip's renames, whose caret sits elsewhere, settle on the heading's line and not the caret's. `headingRenameGuard`: `EditorState.transactionFilter` that returns `tr` when `headingRenameOf` is null; otherwise appends `headingRenamed.of(rename)` to the transaction's effects and, when `next` is non-empty and `rewritten = rewriteHeadingConnections(after, ownTitle, old, next, ownTitle)` differs from `after` (`ownTitle` from `tr.startState.facet(editorHost).pageTitle() ?? ''`, `runs` from the host's `inPageHeadingResolution`; an empty title still rewrites `[[#old]]`, since the primitive treats an empty title as its own), returns `[{ ...spec of tr with the added effect }, { changes: changesTo(after, rewritten), sequential: true }]`, so one undo pops both. The second spec carries no annotations: `resolveTransaction` reads the first spec's.
- [ ] `after` is `docString(tr.newDoc)` only on the rename path, never per transaction.
- [ ] `MarkdownEditor.tsx`: `headingRenameGuard` joins the extension list after `calloutGuard`.

**AFTER**

```ts
// headingRenameGuard.ts
import { EditorState, type Extension, StateEffect, type Transaction } from '@codemirror/state'
import { rewriteHeadingConnections } from '@pommora/core/Connections/rewrite'
import { headingParts } from '../Engine/detect'
import { editorHost, syncLanding } from '../api'
import { docString } from '../docCache'
import { changesTo } from '../../Pages/merge3'

export interface HeadingRename {
  old: string
  next: string
  line: number
}

export const headingRenamed = StateEffect.define<HeadingRename>()

/** The one changed range that sits on a heading line and changed its content; other ranges in the same transaction (an undo that also restores links) are ignored. A heading typed fresh is not a rename; a heading cleared is a rename to nothing, which the listener carries. */
export function headingRenameOf(tr: Transaction): HeadingRename | null {
  let found: HeadingRename | null = null
  let seen = 0
  tr.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
    const oldLine = tr.startState.doc.lineAt(fromA)
    const newLine = tr.newDoc.lineAt(fromB)
    if (toA > oldLine.to || toB > newLine.to) return
    const oldParts = headingParts(oldLine.text)
    const newParts = headingParts(newLine.text)
    if (!oldParts || !newParts) return
    const old = oldParts.content.trim()
    const next = newParts.content.trim()
    if (!old || old === next) return
    seen++
    found = { old, next, line: newLine.number }
  })
  return seen === 1 ? found : null
}

export const headingRenameGuard: Extension = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || tr.annotation(syncLanding)) return tr
  const rename = headingRenameOf(tr)
  if (!rename) return tr
  const stamped = {
    changes: tr.changes,
    selection: tr.selection,
    effects: [...tr.effects, headingRenamed.of(rename)],
    annotations: tr.annotations,
    scrollIntoView: tr.scrollIntoView,
  }
  if (!rename.next) return stamped
  const after = docString(tr.newDoc)
  const own = tr.startState.facet(editorHost).pageTitle() ?? ''
  const runs = tr.startState.facet(editorHost).settings().inPageHeadingResolution === 'automatic'
  const rewritten = rewriteHeadingConnections(after, own, rename.old, rename.next, own, runs)
  if (rewritten === after) return stamped
  return [stamped, { changes: changesTo(after, rewritten), sequential: true }]
})
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; `changesTo`'s `Edit[]` shape is what `changes` accepts (`{ from, to, insert }`); `tr.annotations` is the transaction's own array and the spec accepts it.
- [ ] `headingRenameGuard.test.ts`: on a doc `## Setup\n[[#Setup]] §Setup`, dispatching an insert of `x` at the end of the heading line yields `## Setupx\n[[#Setupx]] §Setupx` with a `headingRenamed` effect of `{ old: 'Setup', next: 'Setupx' }`, and one `undo` restores the original; typing a heading fresh on an empty line rewrites nothing and stamps nothing; clearing the heading stamps `{ old: 'Setup', next: '' }` and rewrites nothing; a `syncLanding` transaction stamps nothing; a multi-line paste stamps nothing; an `undo` of a rename that carried same-page rewrites stamps `{ old: 'Setupx', next: 'Setup' }`.
- [ ] `regression-pins.test.ts` green.

#### Task 6.2

**TASK:** The editor reports a settled heading rename once, and the page surface asks main and rekeys its folds.

**FILES:** `Core/MarkdownPM/MarkdownEditor.tsx`, `Core/Pages/PageView.tsx`, `Core/Tiles/Surfaces/PageTile.tsx`

**NOW** — the update listener's tail in `MarkdownEditor.tsx`:

```tsx
        if ((u.docChanged || u.selectionSet) && !u.state.readOnly) {
          detectConnectionQuery(u.view, setAc, true)
          detectBlockQuery(u.view, block.setState, u.docChanged)
        }
```

**CHANGE**

- [ ] `MarkdownEditor` prop `onHeadingRename?: (old: string, next: string) => void`. A `pendingRename` ref holds `{ old, line, trail }`: on any update whose transactions carry a `headingRenamed` effect, the record is created with `old` = the effect's `old` (the first one survives further keystrokes) and `line` = the effect's `line` (the heading's own), and every `old` and `next` the effects carried joins `trail` (a `Set<string>`). On any update where the caret's line differs from `pendingRename.line`, or `u.focusChanged && !u.view.hasFocus`, the record settles: the current content of that line through `headingParts` is `final`; when `final` is non-empty and differs from `old`: (a) if `docHeadingKeys(u.state.doc)` still holds `normalizeTitle(old)`, a duplicate was renamed and nothing fires (B-9); (b) otherwise, for every trail entry other than `final`, `rewriteHeadingConnections(doc, own, entry, final, own, runs)` is applied in one transaction (`userEvent: 'input'`, dispatched through `setTimeout(…, 0)` as `leaveAlias` defers its own) when it changes the document, which closes the clear-and-retype case where the guard could not follow; then `onHeadingRename(old, final)`. The record clears either way. A heading line that no longer exists clears without firing.
- [ ] `PageView.tsx` passes `onHeadingRename={(old, next) => void renameHeading(pageDetail.id, old, next)}` where `renameHeading` (a small function in `Core/Pages/pageEditor.ts`) asks `connections:headingRenamed` with `(pageId, old, next)` and then rekeys folds: `folds:get` for the page, replace every key equal to `old` with `next` and every `${old} N` with `${next} N`, `folds:set`. `PageTile.tsx` passes the same for its `entry.id`.

**AFTER**

```tsx
// MarkdownEditor.tsx, inside the update listener before the connection query detection
        const lineNo = u.state.doc.lineAt(u.state.selection.main.head).number
        for (const tr of u.transactions)
          for (const e of tr.effects)
            if (e.is(headingRenamed)) {
              const held = pendingRenameRef.current ?? { old: e.value.old, line: e.value.line, trail: new Set<string>() }
              held.trail.add(e.value.old).add(e.value.next)
              pendingRenameRef.current = held
            }
        const held = pendingRenameRef.current
        if (held && (held.line !== lineNo || (u.focusChanged && !u.view.hasFocus))) {
          pendingRenameRef.current = null
          const text = held.line <= u.state.doc.lines ? u.state.doc.line(held.line).text : ''
          const final = headingParts(text)?.content.trim() ?? ''
          const own = hostRef.current.pageTitle() ?? ''
          if (final && final !== held.old && !docHeadingKeys(u.state.doc).includes(normalizeTitle(held.old))) {
            let body = doc
            for (const stale of held.trail)
              if (stale && stale !== final) body = rewriteHeadingConnections(body, own, stale, final, own)
            // Deferred as `leaveAlias` defers its own leave dispatch: a dispatch inside an update listener re-enters the view.
            if (body !== doc)
              setTimeout(() => u.view.dispatch({ changes: changesTo(doc, body), userEvent: 'input' }), 0)
            onHeadingRenameRef.current?.(held.old, final)
          }
        }
```

```ts
// pageEditor.ts
export async function renameHeading(pageId: string, old: string, next: string): Promise<void> {
  await host().ask('connections:headingRenamed', pageId, old, next)
  const keys = valueOr(await host().ask('folds:get'), {})[pageId]
  if (!keys?.length) return
  const shifted = keys.map((k) => (k === old ? next : k.startsWith(`${old} `) ? `${next}${k.slice(old.length)}` : k))
  if (shifted.some((k, i) => k !== keys[i])) await host().ask('folds:set', pageId, shifted)
}
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; the listener adds no per-update allocation beyond the line read when a rename is pending.
- [ ] A test in `Core/MarkdownPM` (`headingRename.test.tsx`, new): typing three characters into a heading then moving the caret to another line calls `onHeadingRename` once with the original and final text; blurring fires it too; deleting the line fires nothing; clearing `Setup` to nothing and retyping `Intro` leaves `[[#Intro]]` in the body and fires `('Setup', 'Intro')`; renaming one of two `## Setup` fires nothing.
- [ ] `pageEditor.ts`'s `renameHeading` unit test: folds `['Setup', 'Setup 2', 'Other']` with `Setup → Intro` become `['Intro', 'Intro 2', 'Other']`.

#### Task 6.3

**TASK:** The channel, the main-side handler, and the heading cascade.

**FILES:** `Core/Contract/bridge.ts`, `Core/Nexus/handlers.ts`, `Core/Nexus/cascade.ts`, `Core/Nexus/cascade.test.ts`, `Core/Nexus/watchPatch.ts`, `Core/MarkdownPM/editorHarness.ts`

**NOW**

```ts
export async function renameCascade(nexusRoot: string, oldTitle: string, newTitle: string): Promise<Result<{ touched: string[] }>> {
  const oldKey = normalizeTitle(oldTitle)
  const rels = queryMentions(oldKey) ?? (await nexusCorpus(nexusRoot))
  …
  const swept = await sweepGovernedRoots(nexusRoot, files, { text })
  return ok({ touched: swept.touched })
}
```

**CHANGE**

- [ ] `bridge.ts` `Asks`: `'connections:headingRenamed': { args: [pageId: string, oldHeading: string, newHeading: string]; reply: Result<{ touched: string[] }> }`.
- [ ] `cascade.ts`: `renameHeadingCascade(nexusRoot, title, oldHeading, newHeading, skipRel: string | null)`: `rels = queryHeadingMentions(titleKey, oldKey)`; `null` (index not ready) returns `ok({ touched: [] })` and never scans the corpus; `skipRel`, when given, is left out of the file list (the live path passes the page's own rel, since the editor already rewrote it; the external path in Task 6.4 passes `null`, since no editor did); each file's body goes through `rewriteHeadingConnections(body, title, oldHeading, newHeading, titleFromPath(rel), runs)`, where `runs` is whether the nexus's `inPageHeadingResolution` reads `'automatic'`: `readSettingsLeaves(await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings)) ?? {}).personalization`, the read `watchPatch.ts` makes in its private `readSettings`, which this task hoists to an export in `Core/Settings/codec.ts`'s neighborhood so both call it; frontmatter is untouched. The duplicate rule (B-9) is the editor's (Task 6.2) and the re-scan's (Task 6.4), each of which holds the live heading set; the index at consult time still lists the old key.
- [ ] `Core/Nexus/handlers.ts`: the handler resolves the page id to its rel path and title through the live tree (`getLiveTree()` and the page-id index it already offers), then calls `renameHeadingCascade`.
- [ ] `editorHarness.ts`: the stub answers the new ask with `ok({ touched: [] })`.

**AFTER**

```ts
export async function renameHeadingCascade(
  nexusRoot: string,
  title: string,
  oldHeading: string,
  newHeading: string,
  skipRel: string | null,
): Promise<Result<{ touched: string[] }>> {
  const titleKey = normalizeTitle(title)
  const oldKey = normalizeTitle(oldHeading)
  // Only a linked heading cascades, and only through a ready index: a heading rename never sweeps the corpus.
  const rels = queryHeadingMentions(titleKey, oldKey)
  if (!rels?.length) return ok({ touched: [] })
  const files = rels.filter((rel) => rel !== skipRel).map((rel) => join(nexusRoot, rel))
  const runs = (await readSettings(nexusRoot)).personalization.inPageHeadingResolution === 'automatic'
  const text = (content: string, file: string): string | null => {
    const { body } = splitEnvelope(content)
    const next = rewriteHeadingConnections(body, title, oldHeading, newHeading, titleFromPath(file), runs)
    return next === body ? null : mergeFrontmatter(content, {}, [], next)
  }
  const swept = await sweepGovernedRoots(nexusRoot, files, { text })
  return ok({ touched: swept.touched })
}
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; `mergeFrontmatter(content, {}, [], next)` is the no-frontmatter-change call its neighbor makes.
- [ ] `cascade.test.ts`, red first: a nexus with `A.md` (`## Setup` and `[[#Setup]]`) and `B.md` (`[[A#Setup]]`) seeded; `renameHeadingCascade(root, 'A', 'Setup', 'Intro', 'A.md')` rewrites B and leaves A; the same call with `null` rewrites both; with the index unseeded it touches nothing. Count 7 → 10.
- [ ] `npm run typecheck` green on both ends of the channel.

#### Task 6.4

**TASK:** The index re-scan recognizes an external rename and takes the same cascade.

**FILES:** `Core/Index/indexSeed.ts`, `Core/Index/indexSeed.test.ts`

**NOW**

```ts
export async function indexWrittenPage(root: string, abs: string): Promise<void> {
  const rel = relCorpusPath(root, abs)
  if (!rel || !isMarkdownFile(rel)) return
  const st = await machine().stat(abs).catch(() => null)
  const content = st && (await readTextOrNull(abs))
  if (st && content !== null) recordPage(rel, content, { mtimeMs: st.mtimeMs, size: st.size })
  else removePathIndex(rel)
}
```

**CHANGE**

- [ ] Before `recordPage`, read `before = readHeadings([rel])?.[rel] ?? []`. `recordPage` returns the entry it recorded, so `after = entry.headings`. `gone` is every key in `before` and not in `after` that some file links (`queryHeadingMentions(titleKey, key)` non-empty); `fresh` is every heading text in the new outline whose key is not in `before`. One linked key gone and one new heading present is a rename: `void renameHeadingCascade(root, title, gone[0], fresh[0], null)`, the gone key serving as `oldHeading` since the primitive compares it normalized. Anything else does nothing; the fourth state shows it.
- [ ] The editor's own save reaches this path with `gone` empty (its inbound files were rewritten before the save landed, and its own `headings` rows were recorded by the previous save), so it no-ops.

**AFTER**

```ts
export async function indexWrittenPage(root: string, abs: string): Promise<void> {
  const rel = relCorpusPath(root, abs)
  if (!rel || !isMarkdownFile(rel)) return
  const st = await machine().stat(abs).catch(() => null)
  const content = st && (await readTextOrNull(abs))
  if (!st || content === null) {
    removePathIndex(rel)
    return
  }
  const title = titleFromPath(rel)
  const titleKey = normalizeTitle(title)
  const before = new Set(readHeadings([rel])?.[rel] ?? [])
  const entry = recordPage(rel, content, { mtimeMs: st.mtimeMs, size: st.size })
  const after = new Set(entry.headings)
  const gone = [...before].filter((k) => !after.has(k) && (queryHeadingMentions(titleKey, k)?.length ?? 0) > 0)
  const fresh = headingOutline(splitEnvelope(content).body).map((h) => h.text).filter((t) => !before.has(normalizeTitle(t)))
  // One linked heading gone and one new heading in its place reads as a rename; anything murkier is left to the fourth state.
  if (gone.length === 1 && fresh.length === 1)
    void renameHeadingCascade(root, title, gone[0], fresh[0], null)
}
```

(`recordPage` returns the `PageIndexEntry` it recorded.)

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; the two reads are index queries, not file reads.
- [ ] `indexSeed.test.ts`, red first: with A (`## Setup` and `[[#Setup]]`) and B (`[[A#Setup]]`) seeded, rewriting A on disk to `## Intro` and calling `indexWrittenPage` rewrites B and A's own `[[#Setup]]`; rewriting A to hold two new headings rewrites nothing. Count 9 → 11.
- [ ] The cascade's own file writes re-enter `indexWrittenPage` for B with `gone` empty (B's headings didn't change), so nothing loops.

#### Review Checkpoint

- [ ] User confirms: rename a heading linked from two pages by typing, by the outline menu, and by the grip's Rename; undo; check both pages. Rename it in Obsidian and watch the links follow within a settle. Rename one of two identical headings and see the links keep the survivor.
- [ ] `npm run test` green; `cascade` and `indexSeed` counts moved as the Baseline says.

### Phase 7 — In-Page Heading Resolution

**GOAL:** Under Automatic, a bare `§Heading` in prose draws and travels as a same-page link, and a typed `§` opens the current page's heading list without link syntax; under Explicit nothing changes. Last because it stands on every earlier phase.

#### Task 7.1

**TASK:** The decoration draws bare runs from `sectionRunsIn` over `docOutline`.

**FILES:** `Core/MarkdownPM/decorations.ts`, `Core/MarkdownPM/docCache.ts`, `Core/MarkdownPM/markdown-pm.css`, `Core/MarkdownPM/Links/aliasRender.test.tsx`

**CHANGE**

- [ ] In `build`, after the wikilink loop, when `inPageHeadingResolution === 'automatic'`: for each `{ from: a, to: b }` of `view.visibleRanges` (`visibleInlineTokens` hides them; read them directly), `sectionRunsIn(text.slice(a, b), docSectionHeadings(view.state.doc), (o) => inCodeAt(scan, a + o))`, where `docSectionHeadings` is a `perDoc` in `docCache.ts` holding the outline's texts sorted longest first, so the sort never runs per build; each run gets `Decoration.mark({ class: 'md-connection-resolved md-section-run' })` over `[a + run.from, a + run.to]`. The `§` is the run's own marker and stays visible under either toggle (C-1).
- [ ] `.md-section-run` has no extra rule beyond the shared color; it exists for the click handler. The decoration passes `sorted = true` with `docSectionHeadings`.

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; the runs are computed only over visible ranges and only under Automatic.
- [ ] `aliasRender.test.tsx`: under `inPageHeadingResolution: 'automatic'`, `## Setup\nsee §Setup.` renders `§Setup` in `.md-section-run`; under Explicit it renders as prose; `§Setups` renders as prose.

#### Task 7.2

**TASK:** A click on a bare run travels; it carries no menu and no glance.

**FILES:** `Core/MarkdownPM/Links/connectionClicks.ts`

**CHANGE**

- [ ] `connHitAt`: when the pointer target's `closest('.md-section-run')` is set and no wikilink token holds the position, return a hit with `self: true`, `heading` = the run's text after `§` (read from the DOM span's `textContent`), `page: null`, and `range` from the span through `view.posAtDOM`; `follow` takes the `self` branch from Task 5.1; `dwell` and `menu` return `null` for a run.

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] A `connectionClicks.test.tsx` case: clicking the run scrolls to `## Setup`; hovering arms nothing; right-click opens the native editor menu (no `preventDefault`).

#### Task 7.3

**TASK:** A typed `§` in prose opens the current page's heading list under Automatic and writes the bare run.

**FILES:** `Core/MarkdownPM/Autocomplete/autocomplete.ts`, `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts`, `Core/MarkdownPM/MarkdownEditor.tsx`, `Core/MarkdownPM/Autocomplete/autocomplete.test.ts`

**CHANGE**

- [ ] `ConnectionForm` gains `'section'`. `autocompleteQuery(scan, caret, allowEmbeds, armed?: number)`: when `armed` is a position and the caret sits at or after `armed + 1` on the same line with no whitespace-free break, and the caret is not inside a wikilink or code, return `{ query: text between armed+1 and caret, from: armed + 1, to: caret, form: 'section', title: '' }`.
- [ ] `formSyntax` case `'section'` returns `value`; `commitEdit` for `'section'` replaces the query span with the heading text and anchors after it.
- [ ] `MarkdownEditor.tsx`: a `sectionArmed` ref: set to `from` when a transaction is `isUserEvent('input.type')`, inserts exactly `§`, the setting is Automatic, the position is outside a wikilink and code; cleared when the selection leaves the run's line or the pane closes. `detectConnectionQuery` receives it. The `outlineFor('')` path already answers the current document.
- [ ] `CellEditor.tsx` passes no armed position (no bare runs in cells).

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; an existing `§` is never armed (Backspace into one, a sync landing, a paste).
- [ ] `autocomplete.test.ts`: `form: 'section'` for an armed `§` and `null` when unarmed (adds 2).
- [ ] User confirms: under Automatic, typing `§` mid-sentence opens the list, Return writes `§Setup`, Escape leaves the `§`; under Explicit nothing opens.

#### Review Checkpoint

- [ ] User confirms the Automatic walk on a real page, then flips to Explicit and sees prose.
- [ ] `npm run test` green.

### Phase 8 — Documentation

**GOAL:** The four Features documents, the editor guideline, and the project instructions read true.

#### Task 8.1

**TASK:** Reconcile every claim the plan made false and describe what now exists, per `Studio-Documentation.md`.

**FILES:** `.claude/Features/ConnectionsPM.md`, `.claude/Features/MarkdownPM.md`, `.claude/Features/ConfigurationPM.md`, `.claude/Guidelines/Editor-Internals.md`, `.claude/CLAUDE.md`

**CHANGE**

- [ ] `ConnectionsPM.md` §Syntax + Scope: the wikilink bullet gains the fragment forms (`[[Title#Heading]]`, `[[#Heading]]`, with an alias), the markdown bullet gains `[Label](Title#Heading)` and `[Label](#Heading)`, the Scope bullet reads that a Page or a heading within one is a target; the name rule sentence names `|`, `#`, and `§`.
- [ ] §Resolution: the three states stand; a fourth paragraph describes the missing heading as a state of the heading half, drawn from the index's heading table for another page and the document's own outline for its own.
- [ ] §The Rename Cascade: a second paragraph on heading renames: the settled-edit detector, the same-page rewrite in the editing transaction, the main-side cascade over `heading_mentions`, the external re-scan diff, the duplicate rule, and the fold rekey.
- [ ] §Rendering: the two settings and their four readings; the same-page rule; the alias rule; the click travels and the glance lands.
- [ ] §The Link Menu: Copy Link on a heading link copies the fragment form; the heading grip's Copy Link is described in MarkdownPM.
- [ ] §Autocomplete: a bullet for `#`/`§` after a title, `[[#`, the chevron slide with its top row, the bare list, flat filtering, the empty close.
- [ ] §Prospects: the "Wider targets" line drops heading anchors.
- [ ] A new §In-Page Heading Resolution describing Automatic, the longest whole-word match, the typed-`§` picker, no menu and no glance, and the bare token staying prose elsewhere.
- [ ] `MarkdownPM.md`: the heading grip row reads `Rename · Copy Link · Size ▸ (…) · Delete`; the Connections bullet gains the heading forms and the bare `§Heading` under Automatic; the embed sentence stays.
- [ ] `ConfigurationPM.md` Pages & Writing table: three rows after Display Unresolved Links As Plain Syntax, descriptions in the table's voice, options `**Page & Heading** · Heading Only`, `On · **Off**`, `**Explicit** · Automatic`. The hint column stays empty until Nathan writes the hints; the description column is filled.
- [ ] `Editor-Internals.md`: the heading-scan bullet names `docOutline` and `docHeadingKeys` beside the fold and the outline.
- [ ] `.claude/CLAUDE.md` Connections line: "connecting to another Page, or a heading within one, as the Content ↔ Content matrix".

**VERIFY**

- [ ] Check every edited paragraph reads as a whole; no `(resolved)` or amendment framing.
- [ ] `grep -n "three states\|only targets\|identity is its title" .claude/Features/ConnectionsPM.md .claude/Features/MarkdownPM.md` → 0.

### Completion Criteria

**Conformance**

- [ ] No duplicated mechanism: `grep -rn "indexOf('#')" Core --include='*.ts'` finds only `links.ts` and `rewrite.ts`; `grep -rn "§" Core --include='*.ts' --include='*.tsx'` finds only `sections.ts`, `headingHash.ts`, `decorations.ts`, `connections.ts`, `names.ts`, the settings label, and tests.
- [ ] Nothing changed outside what the plan named: `git diff --name-only <baseline>..HEAD` matches the FILES lists plus Biome-touched formatting.
- [ ] No new settings row carries a `hint`.

**Correctness**

- [ ] `[[Page#Heading]]`, `[[#Heading]]`, `[[Page#Heading|alias]]`, `[Alias](Page#Heading)`, `[Alias](#Heading)` each render per the settings and travel on click.
- [ ] A page rename keeps every fragment; a linked heading's rename rewrites same-page links in one undo step and cross-page links after settle; an Obsidian rename follows.
- [ ] A heading link whose heading is gone reads muted, cross-page included, once the index has seeded.
- [ ] End to end: open NexusOS, type `[[Notes#`, pick a heading, click the link, land on it, rename the heading, watch the link follow, undo, watch it return.

**Completeness**

- [ ] Every task ticked; no scaffolding, debug output, or unauthorized TODO in `<baseline>..HEAD`.

**Confirmation**

- [ ] Every verification result read; each new test goes red with its change reverted.
- [ ] User: display under all four combinations · pane walk · four routes · rename walk · Automatic walk.

**Continuity**

- [ ] Reconciliation complete; living documents read true; Deviations each fixed or ruled on.

**Confidence**

- [ ] Gates green from clean on `<baseline>..HEAD`; Baseline counts moved as planned.
- [ ] Diff size as the plan implied: on the order of +1400/−150, comments and tests excluded.

### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run. Edits found in adjacent files that no task made belong to the user — folded into the commit at hand, not reverted.

- [ ] Phase review dispatched: Phase 1 · Phase 2 · Phase 3 · Phase 4 · Phase 5 · Phase 6 · Phase 7 · Phase 8
- [ ] All findings fixed or ruled on
- [ ] Neutral verification passed on `<baseline commit>..HEAD`
- [ ] Final pass: gates · baseline · diff · deviations · criteria
- [ ] Reconciliation walked; living documents read
- [ ] Report delivered

#### Reconciliation

- `.claude/Features/ConnectionsPM.md` — "Pages are the only targets" · "lands in one of three states" · "a connection's identity is its title" · "A title can't contain `|`" · the Prospects "Wider targets" line — Task 8.1
- `.claude/Features/MarkdownPM.md` — the heading grip row `Rename · Size ▸ · Delete` · "render as colored inline text in one of three states" — Task 8.1
- `.claude/Features/ConfigurationPM.md` — the Pages & Writing table lacks the three rows — Task 8.1
- `.claude/Guidelines/Editor-Internals.md` — "The fold and the outline read one fence-aware heading scan" — Task 8.1
- `.claude/CLAUDE.md` — "connecting to another Page as the Content ↔ Content matrix" — Task 8.1
- `Core/Connections/scan.test.ts` — the header comment's consumer count — Task 1.3
- `Core/Actions/gripMenu.test.ts` — `['Rename', 'Size', 'Delete']` — Task 5.4
- `Core/MarkdownPM/Autocomplete/AutocompletePane.tsx` — "the editor's keymap owns arrows, Return and Escape" stays true; `cameFrom`'s capture rule changes — Task 4.3
- `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts` — "which is what shrinks the list under an unchanged query" gains the async heading case — Task 4.2
- `.claude/Planning/Heading Links — Decision Log.md` — restated at planning time (A-12, A-13, B-9, D-2, E-1, E-4, I-4); the Sources lines "`openPage(api, page, bypass)` takes no position" and "`GlanceTarget` carries no position" stay as the record of ratification

#### Report & Closure

Per the skill's §5.5, written when the chain is confirmed.

### Open Items

- The divider's pixel treatment (decision log C-6): the first pass is Task 3.4's two KNOBs; Nathan adjusts at the stop after Phase 3.
- Settings hint copy for the three rows: Nathan's, in flight.
- History entry: not written unless Nathan asks at closeout.

### Deviations

- **Task 1.4, `escapedPipe`:** the AFTER block tests `alias === undefined`; with named groups an empty typed alias (`[[Old|]]`) arrives as `''`, which would re-emit `[[New|]]` and break the existing byte-for-byte pin. Written as the falsy test the NOW code used, so `[[Old|]]` → `[[New]]` as before.
- **Task 1.2, `links.test.ts`:** the codec round-trip corpus held `'a#b?c&d+e'`; `#` is now the fragment separator and no longer a legal title, so the fixture reads `'a?b&c+d'`.
- **Task 2.2, engine externals:** the plan said importing `headingOutline` into `Core/Index` moves no gate. `headingScan.ts` reaches `detect.ts`, which imports the micromark parser, so `engineGraph.test.ts` and `hostGraph.test.ts` went red on their externals allowlist (`ulidx`, `yaml`, `zod`). The allowlist now also names `mdast`, `mdast-util-from-markdown`, `mdast-util-gfm`, and `micromark-extension-gfm`; the same suites' React/`.tsx`/`.css.ts` assertions stay green, so main still holds no renderer code. The pull is incidental to `detect.ts`'s module graph, not to heading scanning; splitting the heading helpers into a leaf would undo it and is not in this plan.
- **Task 2.1, `readHeadings`:** Biome refuses `(out[path] ??= []).push(heading)` (`noAssignInExpressions`); written as two statements in both backends.
- **Task 2.3, test stubs:** every `stubDialer` test that reaches `applyTree` or `pages:changed` (`store.test.tsx`, `useBridgeSubscriptions.test.tsx`, `devicePrefsSeed.test.ts`) gained an `'index:headings'` channel, and `contentIndex.test.ts` and `open.test.ts` fixtures gained the two new entry fields.
- **Task 3.5, `titleOf`:** the CHANGE text names `cellLinkTarget` as the site that dropped `titleOf`; in the tree that call sat in `cellStatic.tsx`'s `menuTarget`, which is where it was dropped. The cell test lives in `Tables/cellLinks.test.tsx`, the sibling that already covers resting wikilink cells.
- **Task 3.1, `frames.ts`:** the two pickers' options are hoisted constants beside `dateFormatOptions`, the file's convention, rather than inline maps.
- **Phase 3 stop, the display (Nathan's ruling, 09-16-2026):** the divider is gone and the `§` is the separator itself: `Page § Heading` under Page & Heading, `§Heading` under Heading Only, with `--heading-join-gap` and `--heading-symbol-shift` as the KNOBs. **Hide Heading Symbol** is removed from the settings, the codec, the root classes, and the log's C-1 reads accordingly at reconciliation; `personalization.test.ts` adds 1, not 2, and `aliasRender.test.tsx` adds 4, not 5.
- **Task 4.2, `←` back:** deleting the `#` leaves `[[Title]]`, an exact title, which the page list's exact-match rule would close; the hook holds the page list open on the title it slid back to until the query moves or the pane closes.
- **Task 4.2, `targetOf`:** the editor and the cell editor shared one body, so it lives once as `Autocomplete/headingTarget.ts`'s `headingTargetOf`; the editor adds the empty-title `docOutline` case, the cell answers nothing.
- **Task 4.3, the chevron reveal:** `.mdpm-ac-forget` has no rule in `markdown-pm.css`; its reveal is UIX's `removeButton` + `revealFromHost` on the `hoverRemoveHost` row, and the chevron button uses those same classes, so the stylesheet gains no rule.
- **Phases 1–4 review pass (09-16-2026, Fable simplifier then Fable adversarial, at Nathan's direction):** every finding fixed except two ruled and one held. Fixed: a heading link on a phantom or ambiguous page now falls to the phantom path (`wikiLinkView` gates the fragment branch on a resolved page); `rewriteConnections` re-emits a cell's pipe-escape once on a heading link; `[[Page#]]` reads as the page alone and `[[#]]` parses and indexes as nothing, a property holding a bare fragment writes no empty key; an abandoned heading slot drops its `#` when the caret leaves it, through the alias slot's own leave path (`emptyHeadingHashAt`, `slotNear` by kind), which also surfaced that `emptyAliasPipeAt` pointed at the page's end rather than the heading's; the alias slide follows a heading commit; a warm outline is read in render so a finished heading link never mounts an empty pane; `EditorHost` gains `warmBody` and `fetchBody` so MarkdownPM stops importing `Session/`; the cell honors Heading Link Style and spaces the `§` through the join knob; `§` becomes `#` in the title half only, never in an alias, an embed, or a heading; heading rows bold the typed prefix; a collapse resets the highlight; the missing heading keeps the pointer cursor since a click opens the page; one `wikiLinkView` serves both renderers. Ruled: `→` after Back re-slides, since the list is open on the row Back returned to; the pane's collapse state stays its own set rather than `useDisclosureSet`, since it must reset per opening and per page. Held for Nathan: the headings map loads once per nexus, so pages an excluded-folder change admits read as unknown (never missing) until they change; a full reload on every tree push is the plan's own prohibition.
- **Task 5.2, `[x](#Setup)`:** a markdown link with a bare fragment resolves as `self` and paints as a connection in the body and the cell, as `[[#Setup]]` does; its menu and glance are none, as the wikilink form's are. `Core/MarkdownPM/Citations/citationPointer.ts`'s two `followTarget` calls pass the view and the hit's start like the link paths. `connectionHover.test.tsx`'s heading-span dwell now expects the heading on the arm, which is the point of 5.3.
- **Task 6.1, annotations:** a `Transaction` has no `annotations` array; the stamped spec carries `carriedAnnotations(tr)` from `calloutGuard.ts`, now exported.
- **Task 6.2, undo and redo:** CodeMirror's `undo` dispatches with `filter: false`, so the guard never stamps an undo; the listener reads `headingRenameOf(tr)` on an `undo`/`redo` user event so a settled rename undone later fires the consult back (B-5's stated symmetry holds through the listener rather than the filter).
- **Task 6.3, page id to path:** `Nexus/treeIndex.ts` reaches renderer code, so the handler resolves through `livePathOf` from `Nexus/valuesChanged.ts` and `titleFromPath`; `readSettings` lives in `Core/Settings/codec.ts`, imported by `watchPatch.ts` and `cascade.ts`.
- **Footnotes (Nathan, 09-16-2026):** a lone `[[#Heading]]` or `[[Page#Heading]]` in a citation's body carries its heading through `loneTarget`, so the marker travels to the heading or opens the page there rather than falling to the citation row.
- **Task 7.2, the click test:** no `connectionClicks.test.tsx` exists; the run's click, hover, and right-click cases sit in `Links/linkEdges.test.tsx` beside the `[[#Setup]]` travel cases.
- **Task 7.3, the pane:** the `section` form rides the heading form's outline read, rows, open gate, and exact-match close; only the alias slide is gated to the heading form proper. The suite under a load average above 18 (a VM pinning a core) times out `citationBreakage` and `embedAbsorb` sweeps at 5 s and cascades two mount errors from the skipped cleanup; both files pass alone and the whole suite passes under `--testTimeout=30000`, so the gate is read there.
- **Task 8.1, the cut:** Nathan trimmed the documentation mid-session and the shorter cuts stand: §Resolution carries the missing heading as one clause, §The Rename Cascade and §Rendering each gain two sentences rather than paragraphs, §Autocomplete's heading bullet is his own wording, and §In-Page Heading Resolution is four sentences.
- **Task 1.3, `scan.test.ts` header:** the consumer count was already off before this phase (four, not five, outside `connections.ts` and `scan.ts`); it now reads four and names paste-as.
