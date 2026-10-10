## Scout 6: How the Editor Reads and Draws Links

Baseline `75c3bcb9c`. Everything here was verified by reading unless it's marked *inferred*. Line counts come from `wc -l` on production files.

### Short Answers

- **How many grammars:** The connection grammar is one regex, `pageLinkPattern` plus `linkSpans` (`Core/Connections/connections.ts:7-40`). It has three kinds of reader inside the editor, and those readers apply five different "is it code" gates (§2.1). Markdown links have three regexes for one syntax: `markdownLinkRegex`, `emptyTolerantLinkRegex`, and the anchored `MD_LINK` (`Core/Connections/links.ts:5-17`).
- **Is the pointer/caret split required:** For connections, no. The caret readers run the same regex the tokenizer runs (`tokens.ts:230-231` vs `connections.ts:43-44`) and then rebuild the tokenizer's code rule by hand (`linkInCode`). There's one real reason the readers exist, and it's self-induced: the token throws away empty slots (`tokens.ts:235-236`), and the caret paths need them. The cost and the host constraints don't hold up (§4, §8). For markdown links, yes. Authoring reads `[]()` and `[label]()`, which the drawn grammar refuses by design (`links.ts:15`).
- **How many renderers:** Two, not five. The first is `build` in `decorations.ts`. It serves the body, embed and markdown tiles, the live cell, and the live Text pane: `surface.ts:47` is mounted by `MarkdownEditor.tsx:155` (page), `Tiles/Surfaces/PageTile.tsx:171`, `Tiles/Surfaces/MarkdownTile.tsx:60`, `Tables/CellEditor.tsx:145`, and `Properties/Pickers/TextPane.tsx:117`. The second is `renderCellContent`, which serves the resting cell and the resting Text value (`TextCell.tsx:60`). They share `wikiLinkView` and `mdLinkClass` but draw headings, phantoms, and invalid links their own way (§2.2, §3).
- **Per-caret work:** Two of the per-caret costs grow with the whole document rather than the viewport: `claimedEmbeds` and the heading map that `sectionRunsIn` rebuilds. Two more grow with the viewport: a resolve for each link, and a second regex pass over links in `sectionRunsIn` (§4.4).

---

### 1. Surface Map

| File | Lines | Rules It Owns | Read By | Why It's Separate |
|---|---|---|---|---|
| `Core/MarkdownPM/Engine/tokens.ts` | 364 | The inline token grammar and overlap precedence (`tokenizeChunk` :258-326); `linkAddress`/`linkTarget` :47-52; `aliasedToken` :44; `headingOf` :54; `linkTokenAt` :331-344; `activeTokenIndices` :347-364 | `decorations.ts:366`, `cellStatic.tsx:52`, `formatState.ts:16`, `format.ts:86,123`, `edits.ts:402`, `citationPointer.ts:21`, `cellCitations.ts:19`, `subfieldStats.ts:60` | The pure engine half. It can't import `Links/`. |
| `Core/MarkdownPM/Engine/detect.ts` | 671 | For links, only `loneEmbedTitle` :400-404, `loneWebpageEmbed` :407-416, and `webpageEmbedUrlSpan` :419-423 | `docScan` (`blockEmbedLines` :426) | Line-shape detection for the scan. |
| `Core/MarkdownPM/Engine/embedClaims.ts` | 25 | `claimedEmbeds`, the rule for which tile is claimed | `decorations.ts:475`, `embedWidget.tsx` | Shared by the draw and the tile field. Scout 5 C gives it a single owner. |
| `Core/MarkdownPM/decorations.ts` | 856 | `mdLinkClass` :82-99, `drawnLinkAt` :370-374, `visibleInline` :377-392, link drawing in `build` :557-664, section runs :666-676 | `linkClicks.ts:15,56`, `linkEdit.ts:43`, `linkFormat.ts:60`, `cellStatic.tsx:10,135` | The CodeMirror draw. A resting React renderer imports `mdLinkClass` and `MD_LINK_CLASS` from it (§3). |
| `Core/MarkdownPM/Links/linkReveal.ts` | 26 | `linkRest` (caret resting on a finished link), `linkTyping` (a connection being written) | `decorations.ts:486,488`, `linkEdit.ts:65`, `surface.ts:56-57` | StateFields, because both are gesture state rather than position state. |
| `Core/MarkdownPM/Links/connectionsApi.ts` | 158 | `MdTarget`, `titleTarget`, `resolveMdTarget`, `tokenTarget` :70-74, `tokenMenuTarget`, `headingMissing` :121-129, `linkStatus` :131-134, `wikiLinkView` :136-148 | Both renderers, `linkClicks.ts` | The editor-side resolver over `PageIndex`. |
| `Core/MarkdownPM/Tables/cellStatic.tsx` | 486 | `renderCellContent` :55-179, `cellTokens` :52, `LINK_SELECTOR` :255, `linkGestures` :397-434, `cellLinkTarget` :436-446, `menuTarget` :449-477 | `MarkdownTable.tsx` (StaticCell), `TextCell.tsx:11,28,60` | A resting cell has no EditorView (`Editor-Internals.md:17`). |
| `Core/Properties/Cells/TextCell.tsx` | 82 | The resting Text value: a draw for each line and a follow path | Property cells | Lives in Properties and borrows the resting-cell renderer. |
| `Core/MarkdownPM/docCache.ts` | 99 | `perDoc`, `drawnLast` :40-52, `docScan`, `docHeadingKeys`, `docSectionHeadings` | Everywhere | The per-version cache. |
| `Core/Connections/connections.ts` | 109 | `pageLinkPattern`, `linkSpans`, plus the caret readers `linkAt`/`aliasSpanAt`/`emptyAliasPipeAt`/`emptyHeadingHashAt` :42-64 | The caret readers are used only in MarkdownPM: `linkEdit.ts:56,57,82,107,109,124`, `edits.ts:327,337`, `linkReveal.ts:23`, `autocomplete.ts:72`, `headingHash.ts:8` | The grammar is shared with the host (`scan.ts`, `rewrite.ts`). The caret readers have no host caller. |
| `Core/MarkdownPM/Input/edits.ts` | 819 | `linkInCode` :324-331, `inAliasAt` :334-338 | `linkEdit.ts:61,106`, `markdownInput.ts:249`, `edits.ts:375` | Exists because `linkAt` can't see code. |

---

### 2. Duplicated or Parallel Rules

#### 2.1 "Is This Connection Live (Not Code)": Five Gates

1. **Tokenizer** (`tokens.ts:232,282`): a token is dropped if its start is in code (`inCodeAt`, which covers fences and inline spans) or if it overlaps an inline-code token.
2. **`linkInCode`** (`edits.ts:324-331`): `linkAt` on the line, then either the caret's line is fenced or an inline span overlaps `link.full`. This is rule 1 written a second time. It feeds `commitAliasOnEnter` (`linkEdit.ts:61`), `slotNear` (`:106`), and `inAliasAt` (`edits.ts:335`).
3. **Caret-position `inCodeAt`:** `autocompleteQuery` (`autocomplete.ts:51`), `headingHash` (`headingHash.ts:21`, at the caret and the caret minus one), and `literalAt` (`pasteLink.ts:42-46`). These ask about the caret, not the link. For example, in `` `[[A`]] `` with the caret after the closing backtick, `inCodeAt` is false and the picker can arm on a connection the draw renders as code. That example is *inferred* from the two rules.
4. **No gate at all:** `linkTyping` (`linkReveal.ts:23`) and `rememberAliasNear` (`linkEdit.ts:82`). Line-alone `tokenize` also has no fence context: `readFormatState` (`formatState.ts:16`) reports `link`/`connection: true` for a `[[A]]` written inside a fenced block, and the toggle-link wrap (`format.ts:123`) finds and unwraps a "link" there. This breaks `Editor-Internals.md:12` ("A parse given a fragment answers about the fragment") and `MarkdownPM.md:21` ("suppressed inside code").
5. **Host:** `linksIn` checks `mask(at)` at the link's start only (`scan.ts:83`). This is scout 1's surface; cited here, not re-derived.

Raw HTML is a sixth axis. The draw drops `inHtml` tokens only when `scope === 'page' && htmlFormatting` (`decorations.ts:471-472`). `commitAliasOnEnter` checks `htmlFormatting && spanAt(scan.html, …)` with no scope test (`linkEdit.ts:60`), so in a cell it treats as raw a block the cell actually draws. Nothing else checks raw HTML at all (scout 4 §A).

**Verdict:** This is drift. Only rule 1 is the drawn truth.

#### 2.2 Heading Join, Phantom, and Invalid: Two Renderers

| State | `build` | `renderCellContent` | Correct or Drift |
|---|---|---|---|
| Heading join (`[[P#H]]`, resolved, unaliased, at rest) | `decorations.ts:615-637`: page half `md-connection-resolved` or hidden, `HeadingJoinWidget` for `§`, heading `md-connection-resolved md-connection-heading` | `cellStatic.tsx:94-124`: the same `showPage` rule and the same `resolved && !alias` gate, `§` as a span, heading class `md-connection-heading` inside a resolved parent | The decision is written twice; the DOM differs only by the medium. `headingLinkStyle` comes from `settings` (:590) in one and a prop in the other, which is how F-062 happens (`TextCell.tsx:60` passes neither it nor `around`). |
| Phantom connection | Content `md-connection-phantom`/`-typing`, markers `md-phantom-syntax`/`md-bracket` (:639-651) | The same, plus `md-unresolved-fixed` (:84-89) | See 3.1. |
| Invalid markdown link | Label `md-link-invalid`, syntax shown as `md-unresolved-syntax` (:570-573, 581) | Label only, with syntax dropped (:131-141) | Drift. At rest, a phantom connection keeps its brackets but an invalid markdown link loses its syntax. |
| Ambiguous | Connection: `md-connection-ambiguous` (:653-660). Markdown link: `md-link-invalid`, since `mdLinkClass` ignores `target.ambiguous` (:96-97) | Same split | Drift between the two kinds. `linkClicks.ts:67` carries a wiki-only ambiguous exception for `hidesSyntax` because of it. |
| Empty alias `[[T\|]]` | Re-derived from text: `text[tk.contentRange[1]] === '\|'` (:606) | n/a | Also re-derived in `wikiAuthorTarget` (`linkEdit.ts:35`). Self-induced (§4.1). |
| Title span | `tk.resolveRange ?? tk.contentRange` | The same expression | Written four times: `decorations.ts:594`, `cellStatic.tsx:78`, `connectionsApi.ts:72`, `linkEdit.ts:28`. |

#### 2.3 Unresolved-Look Classes Written Twice

`md-unresolved-syntax` and `md-phantom-syntax` share one CSS rule (`markdown-pm.css:241-244`). `md-link-invalid` and `md-connection-phantom` share one rule too (:233-237), except that `md-link-invalid` adds an underline (:238-240). The plain-unresolved override resets `md-phantom-syntax` (:250) but leaves `md-unresolved-syntax` alone. With **Display Unresolved Links As Plain Syntax** on, a phantom connection's brackets go plain, while an invalid markdown link's `[`/`](…)` stay control-colored.

#### 2.4 Three Tokenizer Memos

The draw uses `drawnLast(tokenizeChunk)` (`decorations.ts:366`). The resting cell uses `perText(tokenize, 4096)` (`cellStatic.tsx:52`). Line-local callers use no memo (`formatState.ts:16`, `format.ts:86,123`, `edits.ts:402`, `citationPointer.ts:21`). The first two differ because one is React and the other CodeMirror, which is fine (§8). The unmemoized line-alone calls are what lose fence context (§2.1, gate 4).

#### 2.5 `webpageEmbedUrlSpan` Re-runs the Regex Its Guard Just Ran

`webpageEmbedUrlSpan` calls `loneWebpageEmbed` and then runs `emptyTolerantLinkRegex().exec` again for the indices (`detect.ts:420-421`). If `loneWebpageEmbed` returned the URL span, that saves about −2 lines.

---

### 3. Odd-Ones-Out

1. **Plain-unresolved reaches the live cell and the live Text pane but not their resting forms.** `md-unresolved-fixed` is emitted only by `cellStatic.tsx:84,87,88,136`, and `build` never emits it. The CSS override is scoped to `:root` (`markdown-pm.css:245-251`), and `build` runs for every scope (`surface.ts:47`). So with the setting on, a cell's phantom link goes plain the moment the cell is clicked into, and drops back to muted when the cell rests. `ConnectionsPM.md:34` ("applies to page prose only — cells and other fields stay muted") is false for live cells and Text panes. This was read from the code; no test covers it.
2. **Plain-unresolved also restyles the slash menu.** `blockQuery.ts:29-30` borrows `md-phantom-syntax` and `md-connection-phantom` for the `/query` text, so the link setting changes how a non-link looks.
3. **An ambiguous markdown link draws as invalid, while an ambiguous connection draws as ambiguous** (§2.2).
4. **The `md-link-invalid` underline:** `[x](Missing)` is underlined and muted, but `[x](Present)` isn't underlined (`md-connection-resolved`). The underline belongs to the external look and has leaked into the invalid-page case.
5. **`MD_LINK_CLASS` is the only link class with a constant.** The selectors in `linkClicks.ts:60,135` mix `${MD_LINK_CLASS}` with literal `md-link-invalid` and `md-connection-resolved`.
6. **`LINK_SELECTOR`** (`cellStatic.tsx:255`) is `.md-link, .md-connection-resolved, [data-link-span]`. Every element in that set either carries `data-link-span` or sits inside one that does, and `linkSpanAt` returns null without the attribute. So the first two parts are dead, and they're the only reason `cellStatic` imports `MD_LINK_CLASS`.
7. **`§` runs are the one drawn link kind missing from the drawn token list.** `linkClicks.ts:31-43` (`sectionRunAt`) reads the DOM for `.md-section-run`, because `drawnLinkAt` can't find them. The reason is real: runs depend on the outline, and the chunk memo is keyed by text alone.
8. **The mdast resting renderer imports from the CodeMirror draw module:** `cellStatic.tsx:10` takes `mdLinkClass` and `MD_LINK_CLASS` from `decorations.ts`, while its sibling look rule `wikiLinkView` lives in `connectionsApi.ts`. The two look rules for links live in two different files.

---

### 4. Self-Induced Machinery

#### 4.1 The Token Drops Slots, So the Caret Paths Keep a Second Reader

`wikiLinkTokens` throws away an empty alias and an empty heading (`tokens.ts:235-236`), and it encodes the title as `resolveRange`, set only when an alias or heading exists (:243), the heading as `fragment`, and the alias as `contentRange`. Everything below exists only to recover what was thrown away:

- `aliasedToken` (`tokens.ts:43-45`) infers an alias by comparing range starts.
- `resolveRange ?? contentRange` is written four times (§2.2).
- The empty-pipe sniff `text[contentRange[1]] === '|'` appears at `decorations.ts:606` and `linkEdit.ts:35`.
- The regex caret readers `linkAt`, `aliasSpanAt`, `emptyAliasPipeAt`, and `emptyHeadingHashAt` (`connections.ts:42-64`, 23 lines) have no host caller. They exist because the token can't answer "which slot is the caret in, and is it empty."
- `linkInCode` (`edits.ts:324-331`) exists because those readers can't see code.

`linkSpans` already returns exactly `{full, title, heading, alias}` with empty slots intact (`connections.ts:24-40`), and the tokenizer calls it (`tokens.ts:231`). It then reshapes the spans into the lossy form. **Fixing the cause:** the connection token carries `linkSpans`' spans.

#### 4.2 Why the Pointer Has Its Own Lookup (Legitimate)

`drawnTokens` (`decorations.ts:367,484`) holds the draw's filtered list, minus raw-HTML tokens in page scope and minus claimed embeds. Those filters depend on scope and settings, and no state facet carries scope (scout 4 §B). Pointer events only land on drawn content. Keeping it is correct.

#### 4.3 `md-unresolved-fixed` Opts Out One Span at a Time

The setting is a `:root` class (`applyPersonalization.ts:58`), so excluding a surface means tagging every span on it, and `build` never got the tag (§3.1). The page editor's root is `.mdpm-editor` (`MarkdownEditor.tsx:296`). Tables render inside it, embed and page tiles mount their own `.mdpm-editor`, and Text values sit outside it. A container-scoped rule such as `:root.plain-unresolved .mdpm-editor :is(.md-link-invalid, .md-connection-phantom, .md-phantom-syntax):not(.mdpm-tbl *)` states "page prose only" once. That selector is *inferred* to work: `:not()` with a complex argument is Selectors 4, which Electron 42's Chromium supports.

#### 4.4 Work on Every Caret Move

`build` reruns whenever `selectionSet` changes (`decorations.ts:841-847`). Its link-related costs:

| Work | Site | Scales With | Fix |
|---|---|---|---|
| `claimedEmbeds`, calling `conn.resolve` and `normalizeTitle` on every embed line in the document, then a `tokens.filter` × `claimed.some` | :474-483 | **Document** | Scout 5 C: filter against `embedTileRanges` (a StateField). Endorsed. |
| `sectionRunsIn` rebuilds `byLength` from every heading on every call, once for each visible range | `scan.ts:33-38`, called at :669-675 | **Document** (heading count) | Memo it by the headings array's identity. `docSectionHeadings` is per version (`docCache.ts:99`) and `headingsOf` is stable for each index. That's about +3 lines; the hard rule drives it, not the line count. |
| `sectionRunsIn` runs `pageLinkPattern` and `markdownLinkRegex` again over the visible text to exclude links | `scan.ts:30-32` | Viewport | The drawn `tokens` already hold the links. Move link exclusion into the caller's mask (§6 C). |
| `tokenTarget`/`wikiLinkView`, calling `resolve`, `normalizeTitle`, and `headingsOf().includes()` for each visible link | :561, :595, `connectionsApi.ts:127-128` | Viewport × heading count | Leave it. A target cache keyed on `conn` identity plus token text would add more machinery than it removes, and the cost is bounded by the viewport. |
| `visibleInline` re-slices each chunk's text and `shiftToken`-copies every token | :384-389 | Viewport | Leave it. It's inherent to text-keyed chunk memos. |

---

### 5. Confusing Names

- **`LinkHit`** names two unrelated types: an index occurrence (`scan.ts:62`) and a pointer hit (`linkClicks.ts:24`).
- **`linkAt`** is a Connections export that reads connections only, never markdown links (`connections.ts:42`). It's also the name of `linkGestures`' DOM-hit closure (`cellStatic.tsx:404`, used at :317 and `TextCell.tsx:37`).
- **The heading half has four names:** `Token.fragment` (`tokens.ts:36`), `headingOf` (:54), `LinkSpans.heading` (`connections.ts:16`), and `LinkHit.qualifier` (`scan.ts:65`). Meanwhile `fragment` also means a markdown destination's `#…` (`links.ts:42`, `targetFragment`).
- **`resolveRange`** (`tokens.ts:35`) means "title span," and it exists only on aliased or headed tokens.
- **`contentRange`** on a connection means "the shown span," which is either the alias or the target.
- **`linkTarget`** (`tokens.ts:52`) returns the raw address string. `tokenTarget` (`connectionsApi.ts:70`) returns a resolved `MdTarget`, and `MdTarget` is also what connections resolve to.
- **`MD_LINK`** is the anchored regex (`links.ts:5`), while **`MD_LINK_CLASS`** is the class for an *external* link only (`decorations.ts:80`). Internal markdown links wear `md-connection-resolved`, and `mdLinkClass` returns connection classes.
- **`md-unresolved-syntax` and `md-phantom-syntax`** are one look with two names (§2.3).
- **`cellTokens`, `renderCellContent`, `CellPage`/`around`, and `StaticCell`'s `linkGestures`** also serve the Text value (`TextCell.tsx:11`), and they live in `Tables/`.

---

### 6. Approaches

This surface's own line yield is modest. The larger lever is the question in A: whether the editor keeps a second connection reader. That decision also settles whether scout 4 A (`slotAt`) and scout 1 C (a shared occurrence reader) apply.

#### A. One Connection Reader: the Token Carries Its Slots (Recommended)

- **Token shape:** A `wikiLink` token carries `parts: { title, heading, alias }` from `linkSpans`, with empty slots kept as zero-width spans. This replaces `resolveRange` and `fragment`. `contentRange` stays the shown span.
- **One state-side lookup:** `tokensNear(scan, pos)` in `Engine/tokens.ts` tokenizes the `chunksOver(scan, [[i, i]])` chunk that holds `pos`. It reads through **one** module memo, `chunkTokens = perText(tokenizeChunk, small cap)`, which `visibleInline` also reads in place of `drawnLast`. The caret reader and the draw then parse a changed chunk once between them. A `line.includes('[[')` gate keeps a caret move on a line with no connection free.
- **Caret readers:** Every caret reader becomes `linkTokenAt(tokensNear(scan, pos), pos, 'wikiLink')` plus a check on `parts`. That covers `commitAliasOnEnter`, `rememberAliasNear`, `slotNear`/`leaveSlot`, `inAliasAt`, `linkTyping` (via `docScan.after(tr)`), `autocompleteQuery`'s connection branch, and `headingHash`'s title test.
- **Pointer:** The pointer keeps `drawnLinkAt` (§4.2).

**Deleted:**
- `connections.ts:42-64`: −23
- `linkInCode`, `edits.ts:324-331`: −8
- `inAliasAt` shrinks from 5 lines to 3: −2
- `aliasedToken`, `tokens.ts:43-45`: −3
- `wikiLinkTokens`' alias/fragment juggling, `tokens.ts:234-237`: −3
- `decorations.ts:604-608` pipe sniff, which becomes `parts.alias`: −3
- Token field net (two optional fields become one): −1
- Line-relative arithmetic in the callers (`linkEdit.ts` −6, `linkReveal.ts` −1, `autocomplete.ts` −2)

**Added:**
- `tokensNear` + memo + gate: +10
- `shiftToken` moving `parts`: +2

**Net:** −52 + 12 ≈ **−40** (±8).

**What it fixes:** All the connection gates in §2.1 collapse into the tokenizer's code rule, by construction. If the line-alone sites (`formatState.ts:16`, `format.ts:123`) move to `tokensNear` as well, they gain fence context, at ±0 lines.

**Behavior a user would notice:**
- The `[[` picker, Enter-commit, slot collapse, alias memory, and `]` refusal all stand down on any connection the draw renders as code. That includes the half-in-code cases `autocompleteQuery` and `headingHash` currently admit.
- The format menu stops reporting "Connection" or "Link" inside a fenced block, and its toggle stops unwrapping there.

**Raw HTML:** It stays `commitAliasOnEnter`'s own check unless scope gets a facet. If the check is kept, give it the draw's `scope === 'page'` test (+1) so it stops misreading cells.

**Composes with:**
- **Scout 4 A:** This supersedes its regex `slotAt`. The slot comes from `parts`, so `slotAt`'s switch moves onto the token, and its `liveLinkAt` gate *is* this lookup. Don't do both.
- **Scout 4 B:** Folding `linkTyping` into a picker field is independent. Under A, `linkTyping` still reads the token.
- **Scout 1 C:** Yes, wanted. If `linksIn`'s occurrence reader yields the same `{title, heading, alias}` spans, the tokenizer and the index share one occurrence shape. Its −6 stands as scout 1 measured it.

**Depends on:** Nothing outside MarkdownPM and `connections.ts`. Tests go false (§7).

#### B. One Look Rule, Two Media

- **One function:** Fold `wikiLinkView`, `linkStatus`, and `mdLinkClass` into one `linkLook(conn, text, tk, ownKeys, headingLinkStyle)` in `connectionsApi.ts`. It returns `{ target, status, missing, bare, join: { showPage, heading } | null }`, and both renderers draw from it. That settles the heading-join decision (§2.2) and moves the look rule out of `decorations.ts`, which removes `cellStatic`'s import of the CodeMirror module.
- **One status vocabulary for both kinds:**
  - An invalid markdown link reads `phantom`, or `ambiguous` when its target is ambiguous.
  - `md-link-invalid` merges into `md-connection-phantom`, and `md-unresolved-syntax` into `md-phantom-syntax`.
  - `linkClicks.ts:67`'s wiki-only ambiguous exception becomes `target.ambiguous`.
  - `LINK_SELECTOR` becomes `[data-link-span]`.
  - `MD_LINK_CLASS` is inlined as `'md-link'`.

**Arithmetic:**
- `wikiLinkView` + `WikiLinkView` + `linkStatus` (`connectionsApi.ts:114-148`, about 22 code lines) and `mdLinkClass` (`decorations.ts:82-99`, 18) become `linkLook`, about 24: −16
- The duplicated join decision across the two renderers: −6
- `linkClicks.ts:67`: −0
- Selector, constant, and import lines: −3
- CSS (`:233-240`, `:241-244`): −4

**Net:** about **−29** (TS −25, CSS −4).

**Behavior a user would notice:**
- Invalid markdown links lose the underline.
- Ambiguous markdown links draw in the ambiguous tone.
- With the setting on, a markdown link's syntax goes plain too.
- At rest, an invalid markdown link keeps its syntax, matching phantom connections. That costs +3 if adopted; it's Nathan's call, and the reverse is also coherent.

**F-062:** Fixing it in the same pass costs +3. `TextCell` passes `ownKeys: holder && conn?.headingsOf?.(holder.path)` and reads `headingLinkStyle` from personalization, which makes the draw agree with the `heldTarget` its gestures already use (`TextCell.tsx:27,41`).

**Depends on:** Nathan ruling on the three look changes.

#### C. State "Page Prose Only" Once, and Stop Re-matching on Every Caret Move

- **The setting:**
  - Replace the per-span opt-out with the container-scoped CSS rule from §4.3.
  - Delete `md-unresolved-fixed` at `cellStatic.tsx:84,87,88,136` and its three `:not()` clauses.
  - Point `blockQuery.ts:29-30` at its own look, or `md-control`, so the link setting stops reaching the slash menu.
  - Net about −4 TS, ±0 CSS.
  - This fixes §3.1 and makes `ConnectionsPM.md:34` true.
- **`sectionRunsIn`:**
  - Its link exclusion moves into the caller's `inCode` mask.
  - The editor's mask adds `linkTokenAt(tokens, a + o) !== undefined` (±0).
  - `linksIn` collects the spans it already matches (+3).
  - `scan.ts:30-32,42,44` and the link clause in :45 go (−5).
  - `byLength` is memoized (+3).
  - Net about +1.
  - That's not a line win; it's what clears the hard-rule violations in §4.4 that scout 5 C leaves.

**Total for C:** about **−3**.

**Combined A + B + C:** about **−72**, on top of scout 5 C (−7) and scout 4 B/C, which are independent.

---

### 7. Would Go False

**Approach A:**
- `connections.test.ts` (12 references to the four readers)
- `aliasPicker.test.tsx` (11 references)
- `tokens.test.ts` (13 assertions on `resolveRange`, `fragment`, or `aliasedToken`)
- `edits.test.ts` cases calling `linkInCode`
- `Dashboard/Audit/audit.md:325` (F-033's description of the readers)
- `.claude/Planning/Link Gestures — Implementation Plan.md`, wherever it states the caret-side `linkAt` rule
- The comment at `linkEdit.ts:59`

**Approach B:**
- `externalLink.test.tsx:80` (`.md-link-invalid`)
- `mdLinkTarget.test.tsx:158`
- The comment at `cellStatic.tsx:129`
- `Dashboard/Audit/audit.md:373` ("the differences … are deliberate")

The `.md-connection-heading` hooks survive as long as the class is kept: `aliasRender.test.tsx:65,85`, `connectionHover.test.tsx:107`, `linkEdges.test.tsx:284,304,311`, `textScope.test.tsx:94`.

**Approach C:**
- `mdLinkTarget.test.tsx:158` (asserts `md-unresolved-fixed`)
- `blockMenuFlow.test.tsx:301,308` (asserts `md-phantom-syntax` on the slash)
- `ConnectionsPM.md:34` stays true. It's currently false.

---

### 8. Traps

- **`drawnTokens` can't serve the caret paths.** `linkTyping` is a StateField and runs before the new document is drawn (`linkReveal.ts:17-25`). `autoPair`/`inAliasAt` are pure functions over `scan` (`edits.ts:340,375`). `aliasOnLeave`'s blur handler can fire with the caret scrolled off-screen, where the viewport-bound list holds nothing (`decorations.ts:376-392`). A's lookup has to be derived from state (`tokensNear`), not from the last draw.
- **The chunk memo needs a small cap.** `perText` copies every key (`perText.ts:10-11`), and a chunk can run past 50 lines (`CHUNK_REACH`, `docScan.ts:263`). `cellTokens`' 4096 cap would hold megabytes. The draw and the caret reader also have to share **one** memo. Otherwise a keystroke parses the caret's chunk twice, because `linkTyping` runs before the draw.
- **`chunksOver` returns no chunk for a fenced line** (`docScan.ts:284-287`). Under A, an empty result has to mean "no tokens," which is correct, since code holds no links.
- **Markdown-link authoring readers stay as they are.** `markdownDestinationAt` and `linkDestinationStart` (`links.ts:46-65`) read `[]()` while it's being typed, and the drawn grammar refuses empty halves by design (`links.ts:15`).
- **The host keeps the regex.** `linksIn` and `rewrite.ts` walk whole bodies across the Nexus. micromark *can* load on the host (`scan.ts:7-8` already imports Engine), but tokenizing every page per index pass is the cost the regex avoids.
- **`data-link-span` is required.** A resting cell has no `posAtCoords` (`Editor-Internals.md:17`), and every reader resolves the attribute against the whole cell (`cellStatic.tsx:54`). Only the class parts of `LINK_SELECTOR` are dead.
- **`drawnLast` stays.** It still has two users outside links (`codeHighlight.ts:186`, `codeScroll.ts:218`). A only takes `decorations.ts:366` off it.
- **`cellTokens` (`perText`) vs `chunkTokens` (`drawnLast`)** being two memos is React vs CodeMirror, not drift. Under A, the resting cell can read the same `chunkTokens` only if the cap fits both. Otherwise it keeps its own.
- **`activeTokenIndices`' inclusive end** (`tokens.ts:360-361`) is what `linkRest` compensates for (`linkReveal.ts:6`). That's deliberate, so it isn't removable.
- **`md-connection-heading` has no CSS,** but it's the DOM and test hook for the heading half (§7). Keep the class.
- **`sectionRunsIn` can't go into the chunk memo or the token list.** It depends on the outline (`docSectionHeadings`), so the text-keyed memo would serve stale runs after a heading rename. That's why `linkClicks`' DOM fallback (`sectionRunAt`) stays.
- **The `conn` gate on connection drawing** (`decorations.ts:589`) and the `api ? undefined : 'link'` lookup (`linkClicks.ts:56`) agree: a surface without connections leaves `[[…]]` as raw text and never hits it. The resting renderer does the same (`cellStatic.tsx:80`). It isn't removable on its own.
