## Links Foundation Prototype — Report

Saved by the orchestrator from the proving scout's hand-back (the harness blocked the scout from writing it). Diff: `proving/foundation.diff` (plain `git diff`, 37 files, +464 / −625). Worked from `42a18f4a5` in an isolated worktree; nothing committed, staged, or pushed.

**Production net:** −114 TS (+281 / −395, comments included), −5 CSS. Tests −42 (+182 / −224; −80 is the deleted `embedClaims.test.ts`).

**Gates:** typecheck clean (7 projects); `npx vitest run` 520 files / 7,524 tests / 2 skipped (baseline 521 / 7,528; one file deleted by ruling); `biome check Core UIX Desktop Sync` clean, plus the `no-wrapped-comments` and `no-name-mentions` hooks (`npm run lint`'s `biome check .` skips worktrees under `.claude/`). Known flake `connectionCommit.test.tsx` "reads no layout…" failed once under load, passed alone.

### 1. Types and Signatures

**`Core/Connections/connections.ts`**

```ts
export function pageLinkPattern(): RegExp            // `(?<!!)` removed
type Span = [number, number]
export interface LinkSpans { full: Span; title: Span; heading: Span | null; alias: Span | null }
export type LinkOccurrence =
  | ({ syntax: 'wiki' } & LinkSpans)
  | { syntax: 'markdown'; full: Span; label: Span; destination: Span }
export function linkOccurrences(text: string, inCode: CodeMask): LinkOccurrence[]
function codeTouches(text: string, inCode: CodeMask, span: Span): boolean  // private
```

- `codeTouches`: the link's start is in code by the caller's mask, or a closed inline code span (backticks included) overlaps it — the tokenizer's old two rules, now defined once.
- Precedence: a markdown link overlapping a connection yields to it.
- Private now: `linkSpans`; `titleOf` stays (read by `parseConnectionText`).
- Deleted: `pageEmbedPattern`, `linkAt`, `aliasSpanAt`, `emptyAliasPipeAt`, `emptyHeadingHashAt`.
- Empty slots: `[[]]` and `[[|x]]` still refused; `[[#]]`, `[[T|]]`, `[[T#]]` return zero-width slots.

**`Core/MarkdownPM/Input/edits.ts`** (replaces `linkInCode`)

```ts
export function connectionAt(scan: DocScan, at: number): LinkSpans | null  // spans relative to at's line
export function inAliasAt(scan: DocScan, at: number): boolean
```

- Gate `line.includes('[[')`, then `linkOccurrences(line, (p) => inCodeAt(scan, lineStart + p))`: one regex pass over one line with the document scan's fences.
- Callers: `commitAliasOnEnter`, `slotNear`, `leaveSlot`/alias memory, `inAliasAt`, `linkTyping` (reads `docScan.after(tr)`, incremental and shared with the draw's cache), `headingHash`'s title (the `line[rel-3] !== '!'` guard dropped: an embed's title now takes `#`), the picker's link branch.
- Passes: `commitAliasOnEnter` 3 → 1, `slotNear` 3 → 1, `leaveSlot` + alias memory 2 → 1.

**`Core/Connections/scan.ts`**

```ts
export interface LinkHit {
  syntax: LinkSyntax; target: string; qualifier: string; at: number
  title: Span            // the page name as written; empty for a bare fragment or § run
  heading: Span | null   // wiki heading, markdown fragment, or § run text
  alias: Span | null     // a connection's alias only
}
```

- `linksIn` yields from `linkOccurrences`. `embed` only for a connection alone on its line behind `!` (via `loneEmbedTitle`); an embed's `at` is the `[[` offset.
- A `names()` rule keeps bare fragments and `§` runs with key `''` when no own title is given; `[[#]]`, `[[ ]]`, and a blank page half name nothing.
- `sectionRunsIn` excludes links through the walk. `indexSeed.ts` records every `valueLinks` hit as `'body'`.

**`Core/Connections/rewrite.ts`:** `rewriteConnections` and `rewriteHeadingConnections` are one `linksIn` walk (one code mask), filtered by target or qualifier, then `applyEdits` over title or heading spans. Deleted: `rewriteFrontmatterConnections`, `groupsOf`, `offsetOf`, `escapedPipe`, six chained `replace` passes and four rebuilt masks, `targetNamesTitle` (`links.ts`). P-22: `cascade.ts` `patchOf` sends Link keys through the same rewrite as Text keys; `spend.ts` maps stored values through `rewriteConnections`.

**Token shape (decided):** a `wikiLink` token always sets `resolveRange` to the title span; `fragment` only when the heading has text; no slots on the token. The four `?? contentRange` fallbacks became `tk.resolveRange!` (`decorations.ts`, `cellStatic.tsx`, `connectionsApi.ts`, `linkEdit.ts`); `aliasedToken` unchanged. The two empty-pipe checks stay. Slots on the token were rejected: caret readers no longer read tokens, and slots would add emptiness checks for ≈ ±0 with a wider type. The `!` assertions exist only because `resolveRange` is optional on every kind; a `Token` union for `wikiLink` would remove them.

**Tokenizer:** `tokenizeChunk` maps `linkOccurrences` through `linkToken`. Removed `wikiLinkTokens`, the markdown-link regex spec, the `'embed'` kind (spec, push, five overlap filters). Every other kind's overlap rule kept exactly.

**Embeds:** `loneEmbedTitle` reads `^!(?:<pageLinkPattern source>)[ \t]*$` and returns the raw bracket text (empty included, so a lone `![[]]` keeps its block, grip, and Source ▸). The claim lives only in `buildTiles`: a line tiles when its title is embeddable (no heading, no alias), resolves, isn't already shown, and isn't an ancestor; one resolve, keyed by path. Deleted `embedClaims.ts` (`embeddable` moved beside `embedExclusions`), the cycle stub (`cyclic`, the widget's `title`, `.mdpm-embed-cycle`), `CONTENT_CLASS.embed`, `.md-embed`, and `build`'s claim filter (E-11 Option B).

### 2. Measured Deltas (`git diff --numstat`, Tests Excluded)

| File | Net |
|---|---|
| `rewrite.ts` | −85 |
| `scan.ts` | +32 |
| `connections.ts` | +10 |
| `links.ts` | −6 |
| `tokens.ts` | −22 |
| `embedClaims.ts` | −25 |
| `decorations.ts` | −12 |
| `cascade.ts` | −6 |
| `headingHash.ts` | −4 |
| `linkEdit.ts` | −2 |
| `indexSeed.ts` | −2 |
| `intents.ts` | −1 |
| `useConnectionAutocomplete.ts` | −1 |
| `edits.ts`, `autocomplete.ts`, `linkReveal.ts`, `connectionsApi.ts`, `cellStatic.tsx` | 0 each |
| `embedWidget.tsx` | +1 |
| `detect.ts` | +2 |
| `spend.ts` | +2 |
| `gripMenu.ts` | +5 (import line rewrapped) |
| **TypeScript** | **−114** |
| `markdown-pm.css` | −5 |

Rename + P-22 ≈ −95; embeds ≈ −44 TS; `scan.ts` +32 is the `LinkHit` spans, the lone-embed test, `destinationHalves` (reuses `trimmedRange`), and `names()`; F-035 in the body rename ≈ +5 (also drops an empty alias: `[[Old|]]` → `[[New]]`).

### 3. Red Tests and Causes

46 red in 14 files on the first run.

- **Real breakage, fixed:** `headingRename.test.tsx` (12) — heading rename on a surface with no page title dropped hits keyed `''` (fixed by `names()`); `rewrite.test.ts` "drops an empty alias segment" (the F-035 drop now takes empty aliases).
- **Premise changed by the embed ruling:** deleted `embedClaims.test.ts`, the `intents.test.ts` embed-class case, the `detect.test.ts` "image embed" case; `embedSuppression.test.tsx` rewritten as the E-11 proof; `tokens.test.ts` "image wins over wikilink" inverted; `detect.test.ts` "excludes ![[ ]]" offset 1; `rewrite.test.ts` grammar corpus around `loneEmbedTitle`; `autocomplete.test.ts` (2, closed `![[P]]` is the `link` form at `[[`); `scan.test.ts` (mid-line `wiki`, lone `embed`, `at` on `[[`); `indexSeed.test.ts` (3); `headingHash.test.ts` (embed titles take `#`).
- **Premise changed by the code rule (B-35):** `headingHash.test.ts`'s `` [[`Page`]] `` case.
- **Premise changed by the token shape:** two `tokens.test.ts` cases read `aliasedToken`.
- **Premise changed by spans, P-22, F-035:** `scan.test.ts` (`§` hit spans, `''` key), `linkValue.test.ts` (3, through the body rewrite; `[x](Meeting%20Notes#H)` now renames), `cascade.test.ts` (`[[Target|New Target]]` → `[[New Target]]`).
- **New coverage:** walk slots, precedence, code rule; `connectionAt` on a fence and half-in-code; half-in-code tokenizing to code only; F-035 and the cell escape; the S1-A trap; byte-for-byte spacing.

### 4. Running Proofs

- **E-11 Option B (a page tile over a `wikiLink` draws clean):** proven in `embedSuppression.test.tsx` with the real `MarkdownEditor` and tile field. `![[Alpha]]\n\n![[Nowhere]]` → one tile, no resolved-connection element in `.cm-content`, `Nowhere` a phantom connection; a duplicate → one tile plus one connection; mid-line and lone `![[Alpha#Part]]` → no tile, connections. The token under a tile stays in `drawnTokens`; the tile is atomic, so no pointer reaches it (noted, not guarded).
- **S1-A trap:** a title rename never risked `[[#H]]` (`rewriteConnections` passes no own title): `rewriteConnections('[[#H]] [[Old]]','Old','New')` → `[[#H]] [[New]]`; in `'[[#H]] [x](#H) [[Old#H]] [[#H|Old]]'` only `[[Old#H]]` moves. The real risk was the inverse (finding above), proven by the 12 `headingRename` tests and `rewriteHeadingConnections('## A\n[[#A]] §A','','A','B','',['A'])` → `[[#B]] §B`.

### 5. Code Rule, One Definition

`codeTouches` is the only spelling for written links (`git grep inlineSpans(`: there, the tokenizer's `inlineCodeTokens`, and `codeAt`). B-35 probe: `autocompleteQuery` and `headingHash` on `` x `[[A`]] y `` return null. **Outside this phase:** gate 3 (caret-position `inCodeAt` in `autocompleteQuery`, `headingHash`, `literalAt`) serves unclosed openers (B-120); gate 4 (`readFormatState`, `toggleInline`, `toggleWrap` tokenize a line alone with no fence context) keeps B-35's fenced-format defect until that phase passes them the scan's mask.

### 6. What Proved Wrong Earlier

- S1-A's trap direction (above).
- A-45: `linkInCode` disagreed with the tokenizer — it counted unclosed backtick runs as code and compared against the text inside backticks, so `` [[A `b]] `` was code to Enter/slots/`]` but live to the draw.
- S1-A's deletion list: `titleOf` stays; the span edit must drop empty aliases explicitly (the old `escapedPipe` did it implicitly).
- Estimates: S1-A (−46) + P-22 (−28) predicted −74; measured rename ≈ −95. S1-C's "≈ −6" and S1-A's "+8 for spans": `scan.ts` +32; walk + tokenizer ≈ −12 together.
- E-09: returning the raw bracket text suffices; `embedGuard`, `gripMenu`, `blockModel` unchanged; the claim refuses headings and aliases via `embeddableTitle`.
- B-127: the pass lives in `Connections` (S1-C's home); `connectionAt` is the walk plus the scan's mask.
- E-08: `wikiLinkTokens` deleted outright. `linkTyping`'s code-blindness moot.

### 7. E-31 Verdict

Not a hard dependency for the foundation (the picker's `![[` loop and `'embed'` form untouched; `autocompleteQuery('![[]]', 3, true)` → `{query:'', form:'embed'}` committing `![[Alpha]]`). It becomes one when a phase deletes the loop: S7-D's opener rule must land in or before that phase.

### 8. User-Visible Changes

- **Embeds:** mid-line `![[P]]` and any lone one that doesn't tile (missing, ambiguous, duplicate, self, headed, aliased) draw and act as `!` + a connection; cells and Text values never tile (F-054's look half at zero lines); self-embeds and cycles are connections, not stubs.
- **Code:** any link code touches is text to every reader.
- **Rename:** an alias the new title repeats is dropped (`[[Old|New]]` → `[[New]]`) in bodies and values; spacing inside link syntax survives; `[[A#Note\]]` no longer matches heading `Note`; `[[A\]]` with no alias indexes as `A\`.
- **Link values:** hand-written `[x](Old)` values rename (delete-side readers, P-21, unchanged in the prototype).
- **Index:** a mid-line embed is a `body` relation (enters the Matrix graph as any connection; tiled embeds stay `embed` and excluded); `[x]([[T]])` records no phantom key; a link holding inline code isn't indexed.

### 9. Disclosed Calls and Open Edges

- Lone `![[P|a]]` is a link, not a tile.
- A lone embed line inside a `$$` block (unregistered by `scanDoc`) would index as `embed` — one more condition to exclude.
- `` [[A `x` §B]] ``: the walk drops the link, so `sectionRunsIn` no longer excludes the `§` (matches the draw).
- Picker pool filter: `embeddable` applies only to the `'embed'` form; a closed `![[` via the `link` form can write a duplicate of a tiled page (draws as a working connection). E-13 stays with the picker phase.
- `tk.resolveRange!` at four sites (see token shape).
