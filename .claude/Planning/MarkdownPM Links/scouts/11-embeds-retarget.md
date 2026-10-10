## Scout 11 · Embeds Become Links, and Paste Retargets a Link

**Baseline:** HEAD `42a18f4a5` (production identical to `75c3bcb9c`). Read-only; pure functions run through `npx vite-node --config vitest.config.ts` from `Core/` on scripts in `probe11/` (`tok.ts`, `paste.ts`). Tags: **V** verified by reading, **V·R** verified by running, **I** inferred. Counts are `wc -l`, production only.

**Rulings Applied:** Checkpoint 1 Q9 and the coordinator's Checkpoint 1b: a tile forms only from an embed alone on its own line in a body that mounts the tile field; anywhere else there's no embed construct at all, so mid-line `![[Page]]` is a literal `!` followed by the connection `[[Page]]`, and `![x](url)` is `!` followed by a weblink; cells and Text values never tile. A weblink pasted into a `[[…]]` container becomes `[…](url)` keeping the pasted alias; a page target pasted into a container keeps the container's syntax.

**Measured Files:** `embedClaims.ts` 25 · `embedWidget.tsx` 717 · `detect.ts` 671 · `tokens.ts` 364 · `decorations.ts` 856 · `intents.ts` 674 · `autocomplete.ts` 284 · `useConnectionAutocomplete.ts` 273 · `connections.ts` 109 · `links.ts` 110 · `rewrite.ts` 133 · `scan.ts` 137 · `pasteLink.ts` 137 · `pasteDecision.ts` 47 · `pasteAsMenu.ts` 122 · `linkValue.ts` 144 · `linkEdit.ts` 173 · `linkFormat.ts` 86 · `embedInsert.ts` 61 · `embedGuard.ts` 85 · `menu.ts` 108 · `gripMenu.ts` 169 · `cellStatic.tsx` 486 · `subfieldStats.ts` 178.

---

### Claim Conditions Today

- **E-01 · The Pipeline, in Order (V):**
  1. **Lone Line, No Indent:** `loneEmbedRe = /^!\[\[([^\]\r\n]*)\]\][ \t]*$/` (`Engine/detect.ts:400`), read by `loneEmbedTitle` (`:402-404`) and `blockEmbedLines` (`:426-431`) through `loneLines` (`:206-219`). Trailing whitespace is allowed; an indent, a `> ` or `- ` prefix, or other text on the line isn't.
  2. **Not in a Fence, Table, or Block Math:** `loneLines` skips `excluded` (`docScan.ts:69-74,85`). Raw-HTML blocks aren't excluded, so a lone embed inside one still tiles (matches `MarkdownPM.md:28`).
  3. **`conn` Present:** `buildTiles` claims nothing without a `ConnectionsApi` (`embedWidget.tsx:398,404`).
  4. **The Raw Lone-Line Text Resolves to Exactly One Page:** `claimedEmbeds` skips `statusOf(e.title) !== 'resolved'` (`embedClaims.ts:18`), where `e.title` is everything between `![[` and `]]`; `buildTiles` resolves it a second time for the page (`embedWidget.tsx:405-407`).
  5. **First Line Naming the Title:** `seen` on `normalizeTitle(e.title)` (`embedClaims.ts:19-21`).
  6. **Cycle:** a claimed page already in `host.ancestors` still forms, but as the `mdpm-embed-cycle md-embed` text stub (`embedWidget.tsx:433,203-207`); a page passes its own path as the first ancestor (`PageView.tsx:107`), so a lone self-embed is a stub.
  7. **Depth:** `interactive = host.ancestors.length <= 1` (`:400`) locks a nested tile; it doesn't decide the claim.
  8. **Scope:** none in the claim itself. The tile field mounts only in `MarkdownEditor` (`MarkdownEditor.tsx:164-168`, always `scope: 'page'` at `:155`), but `build`'s suppression (`decorations.ts:474-483`) runs `claimedEmbeds` in every scope, which is F-054's cause. No setting gates a claim.
- **E-02 · The Synthesis Misnames the Gate (V, Corrects *§3.14*):** `claimedEmbeds` never calls `embeddableTitle`. The `embeddable()` wrapper (`embedClaims.ts:6-8`) is only the **picker's pool filter** (`useConnectionAutocomplete.ts:139`) and the **grip's Source ▸ tree filter** (`gripMenu.ts:29`). The claim's only semantic gate is condition 4, the resolve over the raw text.
- **E-03 · A Lone Headed or Aliased Embed Never Tiles (V·R):** `scan.embeds` for `![[P#H]]` holds title `P#H` and for `![[P|a]]` title `P|a`; both resolve `phantom`, so neither is claimed. The tokenizer meanwhile draws `![[P#H]]` as an `embed` token whose content is `P`, with `#H]]` hidden in the closing marker. A lone headed embed therefore shows a grey `P` and can't tile, even though the rename cascade writes that exact form (`rewrite.ts:47,92`).
- **E-04 · What Each Condition Becomes Under the Ruling:**

| Condition | Under "alone in a tile-capable body → tile; else link" | What a user sees for the case it rejects |
|---|---|---|
| 1 Lone, no indent | **Survives:** it is the rule | `x ![[P]]`, `- ![[P]]`, `> ![[P]]`, an indented line: `!` + connection `P` (today: inert grey `P`) |
| 2 Fence/table/math | **Survives:** code and widgets aren't body lines | Unchanged (code stays literal) |
| 3 `conn` | **Survives:** no resolver means no page to tile | Without a tree: `!` + unresolved-looking text, as every connection there |
| 4 Resolves | **Survives** (a tile needs one page) but reads the `[[…]]` grammar's title, not the raw text | Lone `![[Missing]]`: `!` + phantom connection; lone ambiguous `![[Q]]`: `!` + ambiguous connection (today: inert grey) |
| — Heading | **New, explicit:** a tile shows a whole page, so a headed lone embed is a link (or a whole-page tile; Nathan's call) | Lone `![[P#H]]`: `!` + connection `P § H`, following to the heading (today: inert grey `P`) |
| 5 First per title | **Decision:** survives if two editors on one page in one document stay forbidden (the comment's reason, `embedClaims.ts:10`) | Lone duplicate: `!` + resolved connection (today: inert grey) |
| 6 Cycle | **Decision:** fold into the claim (`!ancestors.includes(path)`), and a self-embed becomes a link | Lone `![[Self]]`: `!` + connection to its own page (today: grey stub) |
| 7 Depth | Survives as a tile property | Unchanged |
| 8 Scope | **Becomes structural:** only a body with the tile field has tile ranges | Cells and Text values: always `!` + connection (resolves F-054) |

  Under the ruling, every rejected case lands on the link look rather than the inert one, which is why the inert `embed` token can go entirely. **I** for the drawn outcomes (they follow from the token change in *E-06*).

---

### Embeds as Links

#### Today

- **E-05 · `![x](url)` Is Already Half the Ruling (V·R):** `markdownLinkRegex` (`links.ts:12-13`) has no `!` guard, so `a ![x](https://a.co) b` and a lone `![x](https://a.co)` both tokenize as `link` over `[x](https://a.co)` with a literal `!` before it. In a cell, a Text value, or anywhere mid-line on a page, a webpage embed already draws, follows, glances, and opens the menu as a weblink. Only the lone-line tile differs, and that is the ruling. **No work.**
- **E-06 · `![[…]]` Is a Separate, Inert Token (V·R):** `tokenizeChunk` matches `pageEmbedPattern` as kind `'embed'` (`tokens.ts:275-280`); `pageLinkPattern`'s `(?<!!)` (`connections.ts:8`) keeps the wikilink pass off it, and `...embeds` is threaded through five overlap filters (`:282,288,290,298,309`) and the push (`:313`). `tokenIntents` styles it `md-embed` (`intents.ts:126`) and hides its markers; `linkTokenAt` accepts only `link`/`wikiLink` (`tokens.ts:339`), so it has no follow, glance, or menu. The resting cell's generic arm draws it as an inert `<span class="md-embed">` (`cellStatic.tsx:163-173`). Probe: `![[P|a]]` reads as an embed of title `P|a`, and `linksIn` records the dead key `p|a`.
- **E-07 · Five Embed Grammar Readers (V):** `pageEmbedPattern` in `tokens.ts:277`, `scan.ts:92`, `rewrite.ts:44,88`; `loneEmbedRe` (`detect.ts:400`); and the picker's hand loop (`autocomplete.ts:119-134`).

#### Shape: Drop the Lookbehind, Delete the Embed Token

- **E-08 · `pageLinkPattern` Loses `(?<!!)`:** With it gone, `[[P]]` inside `![[P]]` is an ordinary connection and the `!` is ordinary text, exactly the ruling's "literal `!` followed by the connection." Every reader of the pattern changes as follows (each **V** by reading its call site; outcomes **I** unless marked):
  - **`wikiLinkTokens`** (`tokens.ts:228-253`): no change; embeds now yield `wikiLink` tokens. Delete the `'embed'` kind (`:25`), the embed spec (`:275-280`), the push (`:313`), and `...embeds` from the five filters. The drawn `!` stays visible, per the ruling.
  - **Every token reader** (`decorations.ts:557-664`, `renderCellContent` `cellStatic.tsx:77-127`, `linkPointer`, `tokenMenuTarget`, `readFormatState`): no change. A cell's or Text value's `![[P]]` draws with `data-link-span` and follows, glances, and opens the menu through the existing paths. That is F-054's "connection look" half (audit +16, `embedAsConnection`) at zero lines.
  - **Caret readers** (`linkAt` `connections.ts:42`, so `slotNear`, `commitAliasOnEnter`, `inAliasAt`, `linkInCode`, `headingHash`'s `titleSpanAt`, `linkTyping`, `autocompleteQuery`'s link branch): embeds gain alias and heading slots, Enter-commit, slot collapse, alias memory, and `§`→`#`. The picker's `link` form replaces `s.full`, which starts at `[[` (`autocomplete.ts:77`), so a commit keeps the `!`.
  - **`linksIn`** (`scan.ts:80-91`): now hits embeds in its wiki loop, so the embed loop (`:92-98`) must go to avoid a double count. What relation an embed records is a **decision** (*E-12*).
  - **`rewrite.ts`** (`:35-41`, `:81-86`): the wiki pass rewrites `[[Old…]]` inside `![[Old…]]` and leaves the `!` where it stands, so both embed passes (`:42-48`, `:87-93`) are dead and delete; the following mask lines re-point at `afterLinks`. Bonus: `![[Old|a]]` renames (today the embed grammar reads `Old|a` and never matches).
  - **`sectionRunsIn`'s exclusion** (`scan.ts:30`): now also excludes embed spans; today a `§` inside `![[…]]` can read as a run.
  - **`WHOLE_LINK`/`parseConnectionText`** (`connections.ts:66,74`): unchanged. The `^` anchor already refuses a leading `!`, so `readLink('![[P]]')` stays a url as today.
  - **`wholeWikiLink`** (`pasteAsMenu.ts:30-33`): `exec('![[P]]')` now matches at index 1, and `m[0] === s` still refuses it; unchanged.
  - **`pageEmbedPattern`** (`connections.ts:3-4`): no readers remain; delete.
- **E-09 · `loneEmbedTitle` Becomes the Anchored Connection Grammar:** `new RegExp(\`^!(?:${pageLinkPattern().source})[ \\t]*$\`, 'd')` with the title read off the match's `page`/`heading`/`alias` groups directly (as `parseConnectionText` does), **not** through `linkSpans`. `linkSpans` refuses an empty page with no heading (`connections.ts:30`), so routing through it would drop a lone `![[]]` (what `embedInsertAtCaret` writes, `embedInsert.ts:55`, and what Pair Brackets produces, A-71) from `scan.embeds`. That would take away its `'embed'` block (`blockModel.ts:71`), grip, and Source ▸ the moment it's inserted; today it registers with title `''`. The claim then resolves the **title half** (with `titleOf`), and the heading and alias are known, so the claim and the token stop disagreeing (*E-03*). `blockEmbedLines`, `blockModel`'s `'embed'` block (`blockModel.ts:71`), `embedGuard`'s lone checks (`embedGuard.ts:46,69`), and `subfieldStats.ts:29` keep calling it. A lone **unclaimed** embed keeps its embed block and grip, which is deliberate: `gripMenu.ts:142` re-aims a stale embed through Source ▸. ±0, plus one import in `detect.ts`.
- **E-10 · The Claim Moves Into `buildTiles`, and `embedClaims.ts` Goes:** `claimedEmbeds`' one remaining caller is `buildTiles` once `build` stops calling it (*E-11*). The loop resolves once (fixing the double resolve, `embedWidget.tsx:405-407`) and carries the surviving conditions: page, first per title, no heading (if Nathan takes it), and not an ancestor (if a self-embed becomes a link). That's ≈ 9 lines replacing `:404-411`'s 8. `embeddable` (4 lines) moves beside `embedExclusions` (`:651-658`), its only other neighbor, for the grip (and the picker, if kept).
- **E-11 · `build`'s Claim Filter:** `decorations.ts:473-483` (11 lines) re-runs `claimedEmbeds` over every embed line on every build, including `selectionSet` (`:842`).
  - **Option A (Safe, −7):** filter tokens against `embedTileRanges(view.state)`, which holds both kinds and is O(tiles).
    - **No Import Cycle:** `embedWidget.tsx` imports `../api`, `../docCache`, `../lineDom`, `./scrollHeal`, `../reactWidget`, `../../Tiles/tileZoom`, and `../../Settings/personalization`; none reaches `decorations` (`api.ts:1-25`; `tileZoom.ts:1-2` → `Settings`, `Actions/menuModel`; `personalization.ts:2-4` → `Files`, `Properties`, `Nexus`).
    - **No Stale Read:** `redrawNudge` rebuilds the field (`embedWidget.tsx:526`) and the draw (`decorations.ts:845`) in the same transaction, and `build` reads `view.state` after the field has updated (S5-C's verified sequencing).
  - **Option B (Delete, −12):** drop the filter outright. **Evidence:** a lone webpage line's `link` token sits under its tile today with no suppression at all (the filter matches only `kind === 'embed'`, `:480`; the lone line tokenizes as `link`, **V·R**), and webpage tiles draw correctly, so a mark under a tile's replace is already harmless. **I**: needs one live check that a page tile over a `wikiLink` token draws clean.
  - Either resolves F-054's per-caret-move half.
- **E-12 · The `'embed'` Relation Kind (Decision for Nathan):** `indexSeed.ts:61-62` records `'embed'` vs `'body'`; the only reader that distinguishes them is the graph query (`Desktop/Store/stores.ts:137`, `kind IN ('body','citation','frontmatter')`); backlinks include both (`:102,109`).
  - **Collapse:** every `![[P]]` is `'body'`. `LinkSyntax`, `RelationKind`, and the ternary edit at ±0, and the graph starts drawing an edge for a tiled embed.
  - **Keep:** `linksIn` yields `'embed'` only for a lone `!`-prefixed match in a body, never from `valueLinks` (a Text value never tiles), ≈ +4.

  Under the ruling, a mid-line `![[P]]` is a connection and belongs in the graph either way; today it's excluded.
- **E-13 · The Picker:** `form: 'embed'`, `allowEmbeds`, the `formSyntax` embed arm (`autocomplete.ts:19,47,207-208`), and `useConnectionAutocomplete.ts:67` (`scope === 'page'`) go. The closed `![[P]]` rides the `link` form (*E-08*). The unclosed and empty `![[`/`![[]]` cases need S7-D's opener rule, which already owns deleting the loop (`autocomplete.ts:119-134`, its −17) and whose `![[` opener collapses into `[[`. The pool filter (`useConnectionAutocomplete.ts:134-140`) is a **decision**:
  - **Drop (−9 with imports and arg):** picking an already-tiled page on a lone line writes a duplicate, which now draws as a working connection rather than a dead token.
  - **Keep (≈ +2 to +3):** key it on a `!` before `s.full[0]` **and** a line holding nothing else **and** page scope, since its reason (tile dedupe and ancestors) applies only where a tile can form; keying on the `!` alone would filter mid-line embeds, which are plain connections now. The conservative column below counts +2.

  `ConnectionsPM.md:57` describes the filter. Picker embeds also start working in cells and Text values, as connections.
- **E-14 · The Cycle Stub (Decision):** if a lone self-embed or nested cycle becomes a link, `EmbedTileWidget`'s `cyclic` (`embedWidget.tsx:147,161,203-207,214,433,441-442`) goes, −9, plus `.mdpm-embed-cycle` (`markdown-pm.css:341-343`). Kept, ±0.
- **E-15 · Smaller Deletions:** `CONTENT_CLASS.embed` (`intents.ts:126`, −1) and `.md-embed` in the grouped selector (`markdown-pm.css:301`, CSS, uncounted); `pageEmbedText` stays (5 writers: `pasteAsMenu.ts:109`, `gripMenu.ts:144`, `embedGuard.ts:65`, `autocomplete.ts:208` (goes), `rewrite.ts:47` (goes)).

#### Delta (Production TS)

| Piece | Lean | Conservative |
|---|---|---|
| `connections.ts`: `pageEmbedPattern` + blank | −3 | −3 |
| `tokens.ts`: kind, spec, push | −8 | −8 |
| `intents.ts`: class entry | −1 | −1 |
| `decorations.ts`: claim filter (B / A) | −12 | −7 |
| `embedClaims.ts` −25, claim loop +1, `embeddable` moved +5, import −1 | −20 | −20 |
| `embedWidget.tsx` cycle stub (*E-14*) | −9 | 0 |
| `detect.ts`: import for the anchored grammar | +1 | +1 |
| `autocomplete.ts`: `formSyntax` arm −2, `allowEmbeds` −1 (loop owned by S7-D) | −3 | −3 |
| `useConnectionAutocomplete.ts`: pool filter + 2 imports + arg (*E-13*) | −9 | +2 |
| `rewrite.ts`: two embed passes −14, imports −2 | −16 | −16 |
| `scan.ts`: embed loop −7; relation kept +4 (*E-12*) | −7 | −3 |
| **Total** | **−87** | **−58** |

**Overlaps:**
- S7-D owns the picker loop's −17.
- S1-C's "anchor `loneEmbedTitle` on `pageEmbedPattern`" and its two `RegexSpec`/filter deletions (≈ −10) are superseded here, since the embed spec goes with the lookbehind; count once, here.
- S5-C's −4 to −7 is this table's `decorations.ts` + `embedClaims.ts` rows; count once, here.
- The audit's F-054 +12 net disappears: its +16 look half is free.

---

### Retarget Today

- **E-16 · The Picker Is the Only Real Retarget, and It's Two Rules (V):**
  - **`link` Form:** replaces the whole `[[…]]` (`autocomplete.ts:77`). `commit` re-parses the worn alias from the doc with a fresh `pageLinkPattern().exec` (`useConnectionAutocomplete.ts:165-169`) and passes `keepAlias: settings.removeTitleOnLinkChange ? undefined : worn` (`:178`). `formSyntax` hand-spells `[[v|a]]` (`autocomplete.ts:210`, F-035). The heading is dropped on retarget (it belonged to the old page).
  - **`target`/`fragment` Forms:** replace only the destination span (`autocomplete.ts:270-278`). The label **always survives** whatever Remove Title On Link Change says (default On, `personalization.ts:153`), and an empty label is filled with the title (`:272-273`).

  So the setting governs connections and not markdown links: an odd-one-out. `ConfigurationPM.md:100` scopes it to "a connection", consistent with the code, though not with Nathan's "every link behavior" rule.
- **E-17 · Edit Link Isn't a Writer (V):** `wikiAuthorTarget('editLink')` seats the caret at the title's end (`linkEdit.ts:27-29`); `applyUrlLinkAction` and the resting cell select the address (`linkFormat.ts:64-66`, `cellStatic.tsx:469-470`); the grip's webpage Edit Link seats the tile raw and selects the URL (`gripMenu.ts:151-157`). What follows is typing (the picker) or a paste, so "Edit Link + paste" is the paste path with a selection inside the container.
- **E-18 · Other Target-Changing Writers (V):** the rename cascade (`rewrite.ts:31-133`, syntax-preserving by construction); `linkValueFromEdit` (`linkValue.ts:82-95`, which turns a pasted `[x](P)` into `[[P|x]]` because a Link value always stores a page as a connection); `linkValueFromRename` (`:97-107`). The cascade is a mass rename, not a retarget-by-intent, and the Link value has its own storage rule. None of these should call a paste retarget.

---

### Paste Into a Link

#### Today

- **E-19 · Plain ⌘V Handles Only Bare Addresses (V·R):** `linkFor` exits when `pastedUrl(text)` is null (`pasteLink.ts:21-22`); `pastedUrl` is null for `[[P]]`, `[[P#H|a]]`, `[x](P)`, and `[x](https://a.co)` (ran). Every pasted link but a bare address falls to CodeMirror's default raw insert:
  - `[[P2]]` into `[[P1]]`'s title → `[[P[[P2]]1]]`, which tokenizes as one `wikiLink` over `[[P[[P2]]` (page `P[[P2`) with `1]]` loose (**V·R**).
  - `[y](P2)` into `[[P1|x]]`'s alias → `[[P1|x[y](P2)]]`, which tokenizes as a `link` labeled `[P1|x[y` to `P2`, so the connection is gone (**V·R**).
- **E-20 · P6 Confirmed, and Worse Than Reported (V·R):** caret in `[[Foo|]]` with clipboard `https://a.co`:
  - `literalAt` sees no destination (`linkDestinationStart('[[Foo|]]', 6) === null`) and no code (`pasteLink.ts:42-47`), so `decidePaste` returns `[a.co](https://a.co)`.
  - The result `[[Foo|[a.co](https://a.co)]]` tokenizes as **one `link` over `[[Foo|[a.co](https://a.co)`**: the connection disappears, and a weblink labeled `[Foo|[a.co` takes its place, with `]]` left as text (`LINK_LABEL` admits `[`, `links.ts:8`). `linkAt` finds no connection.
  - The same holds in the title and heading slots, and in a markdown link's label (`[x](P)` at col 1 isn't literal).
  - With a selection inside a link (say `Foo` in `[[Foo]]`), the wrap axis writes `[[[Foo](https://a.co)]]` (`decidePaste` ran → `[Foo](https://a.co)`).
- **E-21 · Literal Where It Shouldn't Be (V·R):** a URL pasted into a **closed** destination (`[x](Page)`, `[x](https://b.co)`) is literal (`linkDestinationStart` → 4), so it **inserts at the caret** inside the old address instead of replacing it. Edit Link's address selection makes that a replace by accident.
- **E-22 · Paste As Inside a Link (V):** `pasteAs` writes literal only when `literalAt` holds (`pasteLink.ts:92`), so Paste As ▸ Connection in `[[Foo]]`'s title nests `[[…]]` inside it. Main builds the rows from the clipboard alone (`Desktop/Actions/editorMenu.ts:104-105`), **but the request already carries `link` and `connection`** (`Actions/editorMenu.ts:29-30`, filled by `readFormatState`, `formatState.ts:38-39`), so main can know "the caret is inside a link" with **no new channel field**.

#### Shape

- **E-23 · One Pure `retarget` in `Core/Connections/linkValue.ts`:** placed beside `readLink`/`serializeLink`/`linkPaste`/`connectionText`, host-safe and resolver-free. It takes classified targets, not strings, so it rides S3-1's one reader instead of adding a fifth classifier:

  ```ts
  retarget(container: { syntax: 'wiki' | 'markdown'; title?: string }, next: LinkTarget,
           keepTitle: boolean, format: LinkDisplay, cached?: string): LinkPaste
  ```

  - **Title:** `keepTitle && container.title` wins, else `next.alias`.
  - **Page Into Wiki:** `connectionText(next.title, title, next.heading)`.
  - **Page Into Markdown:** `serializeLink({ url: encodeLinkTarget(title) + (heading ? '#' + encodeLinkTarget(heading) : ''), alias: title ?? next.title })`.
  - **Weblink Into Either:** `serializeLink({ url, alias: title })` when a title exists, else `linkPaste(url, format, cached)`. A wiki container can't hold an address, and `serializeLink` alone would write a bare URL (`linkValue.ts:45`), which isn't the ruling's `[…](url)`.

  ≈ +12. Returning `LinkPaste` keeps `writeLink`'s pending-title announce (`pasteLink.ts:57-62`) as the one writer. **Shape Wart:** for a page retarget, `LinkPaste.target` would hold a title in the field the title fetch reads as a URL (`pendingTitle.ts`). Either S8's `target → url` rename makes it optional, or `retarget` returns `{ text, url?: string }` and `writeLink` builds the effect.
- **E-24 · The Container Reader Already Exists:** `readFormatState` tokenizes the caret's line alone (`formatState.ts:13-16`), and `linkTokenAt(tokenize(line), rel)` is the same read. It's pure, line-scoped, works with the caret off-screen (`drawnLinkAt` doesn't: B-163), and hands the container's `range`, kind, and title (`contentRange` when `aliasedToken`, or a markdown label).
  - **Code Gate:** a line read alone misses fences, so `literalAt`'s `inCodeAt` must run first, as it already does.
  - If B-127 lands its slot-bearing caret-line pass, the paste reads that instead; no new "link at caret" reader is proposed.
  - Under *E-08*, mid-line `![[P]]` and `![x](url)` are containers through their `[[…]]`/`[…](…)` token, so the `!` survives every retarget.
- **E-25 · Paste Precedence:**
  1. Read-only: decline.
  2. Code: literal.
  3. A selection **strictly inside** one link token (`range[0] < sel.from` and `sel.to < range[1]`), and the clipboard reads as a link (S3-1's reader, kept strict for bare addresses via `pastedUrl`'s scheme rule): **retarget**, replacing `tk.range`.
     - **Why Strict:** `linkTokenAt` is inclusive at both edges (`tokens.ts:339-341`), and `range[1]` is the resting seat a finished link leaves the caret on (`activeTokenIndices`, `tokens.ts:346,358`). An inclusive test would retarget `[[P]]` to `Q` when the user pastes `[[Q]]` right after it, instead of appending.
  4. Otherwise, today's wrap/format decision.
  5. Otherwise, raw.

  `literalAt`'s `linkDestinationStart` clause keeps only its unclosed half (`links.ts:62-64`, `[x](` with no closer, which isn't a token), and the closed case moves to retarget, which fixes *E-21*.
  - **Paste Without Formatting / Paste As ▸ Plain Text:** stay literal (Checkpoint 1 Q8). Inside a link they still nest; that's the explicit choice.
  - **⌘⇧V (Inverse):** **I** that it should retarget too; the rule says "any link."
- **E-26 · The Picker Calls the Same `retarget`:** for the `link` form only. The container's alias comes from the query (S4-C carries `alias` on the link-form query, +2), so the re-parse (`useConnectionAutocomplete.ts:165-169` + import, −6) and `formSyntax`'s hand spelling (F-035, −1, owned by S1-B) go. The `target`/`fragment` forms edit a span (with `#` slot opening and anchor math) and keep `commitEdit`; adopting `retarget` there would mean the setting starts stripping markdown labels on a picker retarget. **Decision**, and it's the *E-16* asymmetry.
- **E-27 · Paste As Inside a Link (Decision):** with `req.link || req.connection` in hand (*E-22*), either:
  - **(a) Retarget:** Paste As's link forms write the **picked** syntax over the container (the explicit pick overriding container syntax, per `pasteLink.ts:91`'s own principle). `pasteAsRows` gains one param (+1), `pasteAs` gains the container branch (+3).
  - **(b) Hide:** link forms are hidden inside a link (+1).

#### Delta

| Piece | Standalone | Inside S3-2 |
|---|---|---|
| `retarget` (`linkValue.ts`) | +12 | +12 |
| Container branch in `linkFor` (token read, range-aware `writeLink`) | +8 | +5 (the pipeline already holds the decision) |
| Clipboard classifier | +10 without S3-1; 0 with it (S3-1 owns ≈ −15) | 0 |
| Picker: worn re-parse −6, query alias +2 (S4-C) | −4 | −4 |
| Paste As inside a link (*E-27a/b*) | +1 to +4 | +1 to +4 |
| **Net** | **≈ +17 to +30** | **≈ +14 to +17** |

**Honest Read:** Part 2 is net **positive**. It buys three verified defect fixes:
- a pasted address no longer destroys the connection (*E-20*);
- a pasted connection or markdown link no longer nests (*E-19*);
- a pasted address replaces, rather than splices into, a closed destination (*E-21*).

It deletes only the picker's second alias reader. It nets negative only when credited inside S3-2/S3-1, which own the deletions.

---

### Conversions

- **E-28 · Writers That Exist (V):**
  - **Connection:** `connectionText(title, alias?, heading?)` (`connections.ts:89-96`) drops an alias equal to the target and refuses one holding `]` or a newline.
  - **Markdown Link:** `serializeLink({url, alias})` (`linkValue.ts:44-46`) writes a bare URL when the alias is empty; labels escape through `escapeAlias` (`links.ts:19-21`, only `\` and `]`).
  - **Page Destination:** `encodeLinkTarget` (`links.ts:68-74`).
  - **Formatted Address:** `linkPaste`/`linkMarkdown` (`linkValue.ts:132-143`) carry the pending title.
  - **Embeds:** `pageEmbedText` (`connections.ts:107-109`, no heading) and `composeWebpageEmbedLine` (`links.ts:28-30`, lone-line only).
- **E-29 · The Missing Writer:** no function writes a **page** markdown link with a heading and label. `pasteAsWrite` spells `serializeLink({ url: encodeLinkTarget(title), alias: title })` without the heading (`pasteAsMenu.ts:111-115`); the picker's `target`/`fragment` arms spell the destination by span (`autocomplete.ts:206,270-278`). `retarget`'s page-into-markdown arm and S3-1's "Paste As carries alias and heading" (+2) are the same writer; it should be one `markdownPageLink(title, heading?, label?)` called by both (count once).
- **E-30 · The Conversion Table** (`keepTitle` = Remove Title On Link Change off):

| Clipboard → Container | `[[A]]` / `[[A\|t]]` | `[t](A)` / `[t](https://…)` |
|---|---|---|
| `[[P]]`, `[x](P)` | `[[P]]` / `[[P\|t]]` if `keepTitle` | `[t](P)` if `keepTitle`, else `[x or P](P)` |
| `[[P#H\|a]]` | `[[P#H\|a]]` (container `t` wins if `keepTitle`) | `[t or a](P#H)` |
| `https://…`, `[x](https://…)` | `[x](url)`; no alias: `t` if `keepTitle`, else the default format via `linkPaste` | `[t](url)` or `[x](url)` |
| Into `![[A]]` mid-line | the `[[A]]` part converts; `!` stays | n/a |
| Into a lone tile | unreachable (atomic, `embedWidget.tsx:565-573`); the webpage tile's Edit Link seat is a markdown container (`gripMenu.ts:151-157`) | |

  **Pending:** Nathan's own example (`[[Page1]]` + `[x](Page2)` → `[[Page2]]`) drops the pasted label `x`, while ruling (2) keeps a pasted alias for a weblink. Whether a pasted **page** link's alias carries (`[[Page2|x]]`) needs his word; the table assumes it does when the container has none.

---

### Traps

- **E-31 · S7-D Is a Prerequisite for the Picker Half:** `![[]]` (written by `embedInsertAtCaret`, `embedInsert.ts:55`, and by Pair Brackets, A-71) contains `[[]]`, which `linkSpans` refuses (`connections.ts:30`), and the `link` form refuses an empty query (`useConnectionAutocomplete.ts:146`). Today only the embed loop opens the picker there, and only on the alphabetical browse (`pageIndex.ts:43`). Deleting the loop before S7-D's empty-query opener lands breaks Insert ▸ Embed ▸ Internal Page.
- **E-32 · Two Tiles of One Page:** the first-per-title rule exists so two editors never write one page from one document (`embedClaims.ts:10`); dropping it is a product change with a write-conflict risk, not a simplification.
- **E-33 · The `'embed'` Relation Feeds the Graph's Exclusion** (`Desktop/Store/stores.ts:137`); collapsing it changes the Matrix (*E-12*).
- **E-34 · Retarget Into an Embed Changes the Construct:** a URL pasted into mid-line `![[P]]` writes `![x](url)`, and if that line is alone it **tiles** on leaving the line. A page pasted into a webpage tile's seated address writes `![t](P)`, which un-forms the tile into `!` + connection.
- **E-35 · Retarget in a Table Cell:** `[[P|a]]` written into a cell needs the `\|` escape (B-176); `retarget` writes the bare pipe, the same gap the F-043 fix budgets.
- **E-36 · Keep `pastedUrl`'s Scheme Rule** for a bare address (`pasteDecision.ts:20-27`), or `3.14` pasted into a link retargets it; S3-1's looser `isValidLink` arm applies only inside `[…](…)`.
- **E-37 · Images:** `![[pic.png]]` (`tokens.test.ts:58-61`) becomes `!` + phantom connection `pic.png`, and lone it doesn't tile. Images render nothing today (`MarkdownPM.md:206`), so nothing is lost, but the test's premise ("embed wins over wikilink") inverts.
- **E-38 · The Synthesis Trap A-123 Goes False:** "keep the wikilink and embed patterns apart" (*§3.1*, *§3.14*) is the opposite of this ruling; the lookbehind's purpose was the inert embed token, which the ruling removes.

---

### Would Go False

- **Docs:**
  - `ConnectionsPM.md:12`: "a `!`-prefixed form standing alone… is not a connection" holds for a tile only; mid-line forms become connections.
  - `ConnectionsPM.md:24`: "three patterns (wikilink, page embed, markdown link)" becomes two.
  - `ConnectionsPM.md:57`: under *E-13* Drop; and "Page-body editors only" goes either way.
  - `ConnectionsPM.md:78`: under *E-12* Collapse.
  - `Editor-Internals.md:25`: the claim's reader list loses "token suppression" (Option B) and "autocomplete pool" (Drop); "one owner" becomes true.
  - `MarkdownPM.md:68`: names `embedClaims.ts`.
  - `MarkdownPM.md:70`: "the `![[` autocomplete, which offers only pages the syntax can express."
  - `MarkdownPM.md:107`: Paste As inside a link (*E-27*).
  - `ConfigurationPM.md:100`: "pointing a connection at another page" becomes any link, if *E-26* extends the setting.
- **Comments:** `scan.ts:1` ("`![[ ]]` embeds are NOT connections"), `autocomplete.ts:119` (already false) and `:197`, `decorations.ts:473`, `embedClaims.ts:5,10`, `connections.ts:6` (unaffected), `pasteLink.ts:41` ("another link's destination takes the clipboard as written"), `useConnectionAutocomplete.ts:165`.
- **Tests:**
  - `embedClaims.test.ts` (whole file), `embedSuppression.test.tsx` (all three cases assert `.md-embed`), `tokens.test.ts:58-61`, and `intents.test.ts` (`md-embed`).
  - `autocomplete.test.ts:92` (`allowEmbeds`, `'embed'` form) and `:120` (`connectionInsert(…, 'embed')`).
  - `scan.test.ts:50,234-245` (embed syntax and at-offset: the `at` moves to `[[`, one past the `!`), `indexSeed.test.ts` (under Collapse), `rewrite.test.ts` embed cases (output unchanged; the path changes), and `detect.test.ts` lone-embed cases (return shape).
  - `pasteLink.test.tsx:221-224` (Paste As Embedded Page from `[[Alpha]]`: unchanged), plus any `pasteLink`/`pasteDecision` case pinning a URL inserted inside a destination (*E-21*).
