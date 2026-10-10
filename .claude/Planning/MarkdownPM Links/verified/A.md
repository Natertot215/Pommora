## Verifier A — Scouts 1 (Connections), 2 (Values), 3 (Clipboard), 4 (Picker)

**Baseline:** HEAD `75c3bcb9c` (Link Gestures landed). Every claim was re-read against HEAD. **Status tags:** **[V]** Verified (re-anchored `path:line`), **[C]** Corrected (what's actually true), **[D]** Dropped, **[P]** Needs Probe (probe named), **[NEW]** missed by all four scouts (held to the same evidence bar; also tagged V or P). **Sources:** S1-S4 = scouts 1-4.

**Method:** Read the cited code and followed callers with `git grep`. Line counts are `wc -l` on production files. Pure functions were also run read-only through `npx vite-node` on a script in the scratchpad (no repo writes; `git status` unchanged). Those results are marked **(ran)**:

- `pasteAsTarget('[x](#Heading)')` → `{kind:'page', title:''}`.
- That target's rows are Connection, Markdown Link, and Embedded Page. Its writes are `[[]]`, `''`, and `![[]]`.
- `pasteAsRows('[[T#H]]')` → `[]`, and `pasteAsTarget('[[T|a]]')` → `{page 'T'}` (the alias is dropped).
- `linkValueFromEdit('[x](example.com)')` → `undefined`, while `'example.com'` → `https://example.com` and `'[[#H]]'` → `undefined`.
- `linksIn('[a]([[B]]) [[A#Note\\]]')` yields `wiki b`, `wiki a/note`, and `markdown [[b]]`.
- `rewriteHeadingConnections('[[A#Note\\]]','A','Note','New')` → `[[A#New]]`.
- `rewriteConnections('[[Old|Bar]] [[Old#N\\]]','Old','Bar')` → `[[Bar|Bar]] [[Bar#N]]`.
- `readLink('[x](Old)')` → `{kind:'url', url:'Old'}`.
- The copied grammars give `MD_LINK('[a](b) [c](d)')` → url `b) [c](d`. `pageLinkPattern` on `[[Draft]]]` matches `[[Draft]]` with page `Draft`.

---

### 1. Surface Map

**A-01 [V] Line Counts Are Exact (S1, S2, S3):** All counts are measured.

| File | Lines |
|---|---|
| `Core/Connections/connections.ts` | 109 |
| `Core/Connections/links.ts` | 110 |
| `Core/Connections/scan.ts` | 137 |
| `Core/Connections/rewrite.ts` | 133 |
| `Core/Connections/linkValue.ts` | 144 |
| `Core/Connections/pageIndex.ts` | 55 |
| `Core/Connections/aliasMemory.ts` | 9 |
| `Core/Properties/Cells/LinkCell.tsx` | 97 |
| `Core/Properties/Cells/linkResolve.ts` | 8 |
| `Core/Properties/Cells/TextCell.tsx` | 82 |
| `Core/Properties/Pickers/PropertyValueInput.tsx` | 88 |
| `Core/Properties/Pickers/valueClick.ts` | 77 |
| `Core/Properties/parseEditorValue.ts` | 43 |
| `Core/Properties/propertyValue.ts` | 219 |
| `Core/Properties/PropertyPanel.tsx` | 571 |
| `Core/Views/Cards/CardValue.tsx` | 171 |
| `Core/Views/Table/TableView.tsx` | 734 |
| `Core/Views/Pipeline/filter.ts` | 300 |
| `Core/Views/Pipeline/sort.ts` | 160 |
| `Core/Tiles/Surfaces/WebTile.tsx` | 180 |
| `Core/Interface/Menus/connectionMenuActions.ts` | 103 |
| `Core/Interface/Menus/pageMenuActions.ts` | 63 |
| `Core/MarkdownPM/Links/pasteLink.ts` | 137 |
| `Core/MarkdownPM/Links/pasteDecision.ts` | 47 |
| `Core/Actions/pasteAsMenu.ts` | 122 |
| `Desktop/Actions/editorMenu.ts` | 138 |
| `Core/Actions/editorMenu.ts` | 143 |
| `Core/Actions/connectionMenu.ts` | 122 |
| `Core/MarkdownPM/Menus/gripMenu.ts` | 169 |
| `Core/Paths/urlPath.ts` | 36 |
| `Core/MarkdownPM/Guards/tableGuard.ts` | 62 |
| `Core/MarkdownPM/Tables/CellEditor.tsx` | 291 |
| `Core/MarkdownPM/Tables/MarkdownTable.tsx` | 645 |
| `Core/MarkdownPM/Tables/widget.tsx` | 578 |
| `Core/MarkdownPM/Engine/Tables/clipboard.ts` | 58 |
| `Core/MarkdownPM/Citations/citationActions.ts` | 159 |
| `Core/Pages/editorHost.tsx` | 168 |
| `Core/MarkdownPM/Autocomplete/autocomplete.ts` | 284 |
| `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts` | 273 |
| `Core/MarkdownPM/Autocomplete/AutocompletePane.tsx` | 215 |
| `Core/MarkdownPM/Autocomplete/headingTarget.ts` | 28 |
| `Core/MarkdownPM/Links/headingHash.ts` | 35 |
| `Core/MarkdownPM/Links/linkReveal.ts` | 26 |

S1's 697-line total for Connections is correct.

**A-02 [C] Two of Scout 4's Counts Moved, and `edits.ts` Lines Shifted (S4):** At HEAD, `Input/edits.ts` is **819** lines, not 808, and `Links/linkEdit.ts` is **173**, not 172. The `edits.ts` slices moved:

| Function | Scout 4's Line | Line at HEAD |
|---|---|---|
| `inAliasAt` | `:323-327` | `:334-338` |
| `isInsideWikilink` | `:601-616` | `:612-627` |
| `isLiteralAt` | `:627-632` | `:638-643` |
| `inBracket` | `:635-639` | `:646-650` |

`linkInCode` (`:324-331`) is new in the baseline commit. S1's "`isInsideWikilink` (`edits.ts:601-616`)" moves with it.

**A-03 [V] Scout 1's Reader Lists Mostly Hold (S1):** The readers of `connections.ts` and `links.ts` hold. The full importer list is from `git grep`: `pasteAsMenu`, `adoptFile`, `assetMigrate`, `assetRoots`, `assetUrl`, `assetWrite`, `linkValue`, `pageIndex`, `rewrite`, `scan`, `pageMenuActions`, `autocomplete`, `useConnectionAutocomplete`, `embedClaims`, `tokens.ts:14`, `embedGuard`, `edits.ts:3`, `connectionsApi`, `headingHash`, `linkEdit`, `linkReveal`, `gripMenu`, `decorations.ts:71`, `propertyValue`, `value.ts`, and `holdings`. **Re-Anchor:** S1's "`Input/edits.ts:326`" is now `edits.ts:3` (the import), with uses at `:327` (`linkInCode`) and `:337` (`inAliasAt`). Its "`edits.ts:624`" (links.ts) is now `edits.ts:2`, used at `:635`.

**A-04 [V] `pageIndex.ts` Is the Single Resolver Builder (S1):** `buildPageIndex` is called only in `pageIndexOf` (`Nexus/treeIndex.ts:270-274`). Raw `.resolve` readers include `Matrix/matrixInput.ts:58` and `Session/pageConnections.ts:30`. See A-19 for the resolve adapters the scouts undercounted.

**A-05 [V] `pasteDecision.ts` Has One Reader (S3):** `linkFor` in `pasteLink.ts:17-39` is its only reader. Its header's "serves both editors" reason is stale, because `pasteLink` is mounted once in `inlineSurface` (`surface.ts:53`) for page, cell, and Text alike.

**A-06 [V] The Picker Is Mounted Three Times (S4):** The mounts are `MarkdownEditor.tsx:298`, `Tables/CellEditor.tsx:288`, and `Properties/Pickers/TextPane.tsx:180`. The only other mounts of `AutocompletePane` are in `aliasPicker.test.tsx:97,193`.

---

### 2. Duplicated or Parallel Rules

**A-07 [V] The Cell-Escape Rule Is Written Twice, and the Heading Half Is Live Drift (S1):**

- **`linkSpans`:** It strips a trailing `\` only when an alias follows (`connections.ts:32-33`).
- **`titleOf`:** It strips one unconditionally (`connections.ts:21-22`). Its callers are `scan.ts:89` (the heading qualifier), `rewrite.ts:37` (the page, even with a heading), `rewrite.ts:39,84` (the heading), and `connections.ts:79-80`.
- **Outcome (ran):** For `[[A#Note\]]`, the index records qualifier `note`, while the editor's `linkSpans` keeps the heading as `Note\`. A heading rename `Note`→`New` writes `[[A#New]]`, and a title rename writes `[[Bar#N]]`. Both consume the backslash.
- **Page Half:** Page titles can't hold `\` (`Paths/names.ts:15`, `holdsName`), so the page-half drift is latent, as S1 said.

**A-08 [V] Title Rename Writes Aliases Differently in Bodies and Frontmatter (S1):** The body path re-emits the alias verbatim (`rewrite.ts:40`). The frontmatter path writes through `connectionText` (`rewrite.ts:130`), which drops an alias equal to the target (`connections.ts:91-93`). **(ran):** `[[Old|Bar]]` renamed to Bar gives `[[Bar|Bar]]` in a body, while a Link value gets `[[Bar]]`. This is drift.

**A-09 [C] `MD_LINK` Is a Separate, Looser Grammar (S1, S3):** `links.ts:5` has no 255 cap and no `^` exclusion, and its destination is greedy `(.*)`. **(ran):** `[a](b) [c](d)` gives url `b) [c](d`, and `[^1](x)` reads as a link. **Correction:** S1 said "admits newlines." Only the **label** admits a newline (`[^\]\\]`). The destination's `.` doesn't. `pasteAsTarget` refuses newlines before reaching it anyway (`pasteAsMenu.ts:37`). It's read by `parseLink` (`linkValue.ts:39`), `parsePastedLink` (`:55`), and `pasteAsTarget` (`pasteAsMenu.ts:42`).

**A-10 [V] Rename Reads Links Separately from the Index (S1):** `linksIn` (`scan.ts:70-109`) and the rewrites (`rewrite.ts:31-111`) walk the same three patterns.

- **Masks:** The rewrite builds `codeMask` 3× for a title (`rewrite.ts:34,43,50`) and 4× for a heading (`:79,87,94,104`). Its comments at `:42,49` say why.
- **Heading Settle:** The heading path runs from the editor's settle (`Guards/headingRenameSettle.ts:57`). That's settle-time, not per keystroke, so no high-frequency rule is broken.

**A-11 [V] The Embed Grammar Has Three Readers (S1):** `pageEmbedPattern` (`connections.ts:3-4`) excludes `#` from the page. `loneEmbedRe` (`Engine/detect.ts:400`) admits `#` in the title and is gated by `embeddableTitle` in `embedClaims.ts:7`. The `![[` hand loop is at `autocomplete.ts:121-133`. S1 is right that the lone-line reader could anchor `pageEmbedPattern`, as `WHOLE_LINK` does (`connections.ts:66`).

**A-12 [V] The Two Heading-Reference Gates Earn Their Difference (S1):** `HEADING_REFERENCE` (`rewrite.ts:62`) and `linksOwnHeadings` (`Tables/cellStatic.tsx:49`) answer different questions, as S1 said. That's acceptable.

**A-13 [V] Seven Readers Consume Raw `pageLinkPattern` Groups (S1, S3, S4):**

- `linkSpans` (`connections.ts:24`), which feeds `linkAt` and `wikiLinkTokens` (`tokens.ts:228-253`).
- `WHOLE_LINK`/`parseConnectionText` (`connections.ts:66,74-87`).
- `linksIn` (`scan.ts:80-91`).
- The two rewrites (`rewrite.ts:35,81`), through `groupsOf`/`offsetOf` (`:21-23`).
- `wholeWikiLink` (`pasteAsMenu.ts:30-33`).
- The worn alias (`useConnectionAutocomplete.ts:166-169`).
- The exclusion in `sectionRunsIn` (`scan.ts:30`).

**Merge:** S3 §2A (`wholeWikiLink` vs `parseConnectionText`) and S4 §4 (the worn-alias re-parse) are instances of this entry. `wholeWikiLink` skips the trim and `titleOf`, refuses a heading, and drops the alias. **(ran):** `[[T|a]]` → page `T` with no alias.

**A-14 [V] Four Classifiers Read "What Link Does This Text Name" (S1, S2, S3):**

| Reader | Location | Markdown Target Naming a Title |
|---|---|---|
| `readLink` | `linkValue.ts:30-35` | A **url**, always (ran: `[x](Old)` → url) |
| `parsePastedLink` | `linkValue.ts:48-62` | A **page if resolved, else refused**, with no URL fallback (A-15) |
| `pasteAsTarget` | `pasteAsMenu.ts:35-47` | A **page**, never resolved (ran: `[x](example.com)` → page `example.com`) |
| `resolveMdTarget` | `connectionsApi.ts:64-68` | A page if resolved, else `external` if valid |

`namesGonePage` (`propertyValue.ts:123-126`) is a fifth entry point through `parseConnectionText`. Scouts 1, 2, and 3 each raised a slice of this. It's one rule with four policies, and it's drift (F-042's mechanism).

**A-15 [C] Scout 3's Table Is Wrong About `[l](example.com)` in a Link Property (S3 vs S1, S2):** S3's §2A table says `parsePastedLink` gives "url only if `example.com` doesn't resolve as a title; normalized."

- **What Happens:** The `title !== null` branch returns `named(...)` whether or not it resolves (`linkValue.ts:59-60`). The `isValidLink` fallback at `:61` is reached only for schemed or slashed targets. `linkValueFromEdit` then refuses, because `isValidLink('[x](example.com)')` is false (`linkValue.ts:91`).
- **(ran):** → `undefined`.
- **Who Was Right:** S1 (§2, "`[x](example.com)` is refused") and S2 (§2.9) were right. The rest of S3's row holds: a bare `example.com` → `https://example.com` (ran).

**A-16 [V] Paste As Turns a Same-Page Markdown Link into an Empty Page Target (S3; NEW Defect Beyond F-042):**

- **(ran):** `pasteAsTarget('[x](#Heading)')` → `{kind:'page', title:''}`. It offers Connection, Markdown Link, and Embedded Page.
- **Connection:** Writes `[[]]`.
- **Embedded Page:** Writes `![[]]`.
- **Markdown Link:** Writes `''`, and `writePlain(view, '')` (`pasteLink.ts:77-83`) deletes the selection.
- **Mechanism:** `targetTitle` returns `''` for a fragment-only target (`links.ts:98`). `pasteAsMenu.ts:45` tests `!== null`, and `embeddableTitle('')` is true (`connections.ts:103-104`).

**A-17 [V] Heading Copies Don't Round-Trip Through Paste As (S3):** **(ran):** `pasteAsRows('[[T#H]]')` → `[]`. Copy Link from the page menu (`pageMenuActions.ts:51-52`) or the heading grip (`gripMenu.ts:91-92`) writes `[[T#H]]`, which Paste As refuses.

**A-18 [V] The Held `[[#Heading]]` Rule Is Written Three Ways (S1, S2):**

- **`heldTarget`:** Defined at `linkClicks.ts:89-92`.
- **`LinkCell`:** Hand-copies the rule at `LinkCell.tsx:75`: `target.title ? resolveConnection(...) : (holder ?? null)`.
- **`linkValueMenuTarget`:** Has no held arm (`connectionMenuActions.ts:89-91`). `resolveConnection(tree, '')` → `byTitle.get('')`, which `buildPageIndex` never fills (`pageIndex.ts:26`), so it returns null. The menu then falls back to `cellMenuModel({kind:'link'})` (`PropertyPanel.tsx:344-346`, `CardValue.tsx:114-120`, `TableView.tsx:287-293`).
- **Outcome:** A bare `[[#Setup]]` Link value follows on click but gets no page menu.

S1 §2 and S2 §2.2 raised the same thing, so they're merged here.

**A-19 [V; NEW Extension] Five Hand Adapters Read "Resolved Page or Null" (S1 Said Four):** S1 found four adapters. The full set re-reads `resolve()` and keeps only `resolved` + `page`:

- `resolveConnection` (`treeIndex.ts:284-288`).
- `titleTarget` (`connectionsApi.ts:58-59`).
- `aliasRows` (`autocomplete.ts:180-182`).
- `headingTargetOf` (`headingTarget.ts:15-16`).
- `rememberAliasNear` (`linkEdit.ts:86-88`).

`ConnectionCell` and `linkValueMenuTarget` sit on top of `resolveConnection`. Any "one resolver" approach should cover all five.

**A-20 [V] Index and Rename Disagree on Scope (S1, S2):**

- **Index:** `valueLinks` reads every key that isn't a whole connection (`scan.ts:128-136`). **(ran):** `readLink('[x](Old)').kind` is `url`, so a Link value `[x](Old)` is indexed as a backlink to Old through `linksIn`'s markdown branch.
- **Rename:** `cascade.ts:199-211` (`patchOf`) rewrites Link-typed keys only via `rewriteFrontmatterConnections`, which skips non-`page` values (`rewrite.ts:125-126`).
- **Delete:** `goneEntry` (`cascade.ts:95-99`) skips them too.

S1 §2 "Index scope vs. rename scope" and S2 §2.9 are merged here. It's a decision for Nathan. `ConnectionsPM.md:24` documents the gating.

**A-21 [V] Overlap Precedence Is Undecided on the Host Side (S1):** **(ran):** `[a]([[B]])` yields wiki `b` and markdown `[[b]]`, a phantom key. The editor drops the markdown token through `notOverlapping([...embeds, ...wikis, ...code])` (`tokens.ts:284-288`). It's harmless today.

**A-22 [V] Alias Memory Is Written Twice (S1):** `aliasMemory.ts:1-9` vs `Testing/editorHarness.ts:83-90`. They differ slightly: the harness skips the `trim` and the head-is-same `null` short-circuit. Because the harness is test-only, this is a test-fidelity gap rather than production duplication.

**A-23 [V] A Connection Value Bypasses the Connections Bundle When Opening (S2):**

- **Value Side:** `ConnectionCell` calls `useSession.select` directly (`LinkCell.tsx:73-74,87-90`).
- **Wiring:** `Cell.tsx:130-137` doesn't pass `ctx.connections` to `LinkCell`, while it does for `TextCell` (`:139-141`).
- **Window Pane:** The window side pane passes `useConnections('window')` (`WindowTabBody.tsx:160,215`) → `hostConnections` → `ctx.connections` (`PropertyPanel.tsx:164-175`). `connectionsOf` routes 'window' and Open-in-Preview to `openWindowTab` (`pageConnections.ts:17-19,37-39`).
- **Outcome:** A Text value's `[[Page]]` opens in the window's tab strip, while a Link value's opens in main content.
- **Glance (S2's Inference Is Now Verified):** `GlancePane.tsx` mounts no `PropertyPanel`. The only mounts are `Contexts/SpaceMenu.tsx:103`, `WindowTabBody.tsx:215`, and `Pages/PageMenu.tsx:92`.

It's a user-visible defect.

**A-24 [V] A Connection Value Hides Its Heading (S2):** `ConnectionCell` shows `target.alias ?? (target.title || '#'+heading)` (`LinkCell.tsx:76,93`). `renderCellContent` draws the page § heading (`cellStatic.tsx:55-110`). `linkDisplayText` mirrors the cell (`linkValue.ts:112-113`), and for `[[#H]]` it returns `''`.

**A-25 [V] A Link Value Never Glances (S2):** `LinkCell` has no pointer handlers. `ConnectionsPM.md:73` names this.

**A-26 [V] A URL Value Has Two Openers on One Click (S2):**

- **Anchor:** Its `onClick` opens any non-empty url and stops propagation (`LinkCell.tsx:51-56`).
- **Padding:** A padding click reaches `valueClickIntent` → `urlClickTarget`, which is gated on `isValidLink` (`valueClick.ts:47-52`, `linkValue.ts:64-68`).
- **`open` Intent:** It has exactly one producer (`valueClick.ts:50`). Its handlers are at `PropertyPanel.tsx:301`, `CardValue.tsx:94`, and `TableView.tsx:155`.
- **Host Gate:** `link:open` refuses invalid input host-side (`Web/handlers.ts:39-40`).
- **App Path:** `openWebLink` → `openBrowser` (`openWebLink.ts:9`, `windowSlice.ts:247`) has no gate.

**A-27 [P] Whether the In-App Browser Opens an Invalid Value (S2):** With Open Links In App on, does an invalid value open a browser window? `WebWindow.tsx:17-48` loads `summon.url` without validating it. `WebGuest`'s own gate wasn't read. **Probe:** Give a Link value the hand-written raw text `foo` (or `[x](Some%20Page)`), turn on `openLinksInApp`, and click the text. *Expected:* edit, or nothing. *Feared:* a WebWindow opens on `foo`.

**A-28 [V] Link Values Have Their Own Look and Lack the Invalid Tone (S2):** They use `.cell-link`, `.cell-link-underline`, and `.cell-connection` (`UIX/Table/table.css:252-262`), with an inline `solidColorCss` (`LinkCell.tsx:46-47`). There's no invalid tone. Color and underline earn themselves; the missing invalid tone is drift.

**A-29 [C] The Two Title Hooks Differ in More Than the Predicate (S2):** `LinkCell.tsx:32-38` and `WebTile.tsx:21-30` (`useWebpageTitle`) differ in three ways:

- **Predicate:** As S2 said.
- **Display Source:** `def.link_display` vs `devicePref('defaultLinkFormat')` (`WebTile.tsx:22`).
- **Subscription:** WebTile's `linkTitles[url]` selector is unconditional (`:23`), while LinkCell gates it on `wantsTitle` (`:34`).

A shared `useLinkTitle(url, wants)` still works, because each caller computes `wants`.

**A-30 [V] Paste-Time and Paste As URL Tests Diverge (S3):**

- **`pastedUrl`:** Requires a scheme (`pasteDecision.ts:21-27`). That's deliberate and correct.
- **Composite Check:** "`WEB_ADDRESS` plus validity" is written at `pasteDecision.ts:25-26`, `detect.ts:414` (`loneWebpageEmbed`), and `pasteAsMenu.ts:70` (on an already-valid url).
- **Normalization:** Paste As writes the URL raw (`pasteAsMenu.ts:118,121`). The Link property normalizes (`linkValue.ts:61,94`), and so does Insert Link (`Menus/menu.ts:52`).
- **Whitespace:** `pastedUrl`'s `/\s/` repeats `isValidLink`'s (`urlPath.ts:26`).

**A-31 [C] `webGuests.ts:18` Is Spelled Differently (S3):** S3 listed it as `WEB_ADDRESS && isValidLink`. It's actually `WEB_ADDRESS.test(url) && isHttpLink(url)`. It's equivalent in effect, because a raw `WEB_ADDRESS` match leaves normalization a no-op and excludes mailto. The "four copies" claim stands with this spelling difference.

**A-32 [V] One Paste Classifies Twice, and Paste As Reads the Clipboard Twice (S3):**

- **Plain Paste:** `linkFor` calls `pastedUrl` (`pasteLink.ts:21`), then `decidePaste` calls it again (`pasteDecision.ts:30`). `trimmedRange` runs in both `linkFor` (`:32`) and `writeLink` (`:51`).
- **Paste As:** Main reads the clipboard (`Desktop/Actions/editorMenu.ts:103-105`), then the renderer reads it again and re-classifies (`pasteLink.ts:88,101`).

**A-33 [V; Extended] Title-Pending Writes Come in Two Shapes, with Three Writers (S3):**

- **Shapes:** `LinkPaste` (`linkValue.ts:124-129`) and `LinkActionText` (`linkFormat.ts:13-17`). `formatted()` (`:45-52`) only renames fields.
- **Writers:** `writeLink` (`pasteLink.ts:49-63`), `applyUrlLinkAction` (`linkFormat.ts:55-86`), and the resting cell's url arm (`cellStatic.tsx:466-474`). The cell arm writes through `onCommit` and calls `host.linkTitles.resolve` with **no** `awaitTitle` tracker (see A-58).

**A-34 [V] Page Copy Link Is Written Twice, and That's Forced (S3):** `pageMenuActions.ts:51-52` writes through `dialer`, and `gripMenu.ts:91-92` through `host.clipboard`. The split is forced by layering.

**A-35 [V] The Three Plain-Paste Commands Differ (S3):** The S3 §2G table matches the code: `pasteAs 'literal'` (`pasteLink.ts:92-95`), ⌘⇧V (`:123-135`), and Plain Text (`pasteAsMenu.ts:118`). For Plain Text, `[Home](url)` → url, pinned by `pasteAsMenu.test.ts:101`.

**A-36 [C] Scout 4's Reader Table Is Stale and Undercounted at HEAD (S4):** Link Gestures changed the gates. At HEAD:

- **`linkInCode` Gate:** `slotNear` (`linkEdit.ts:106`), `commitAliasOnEnter` (`:61`), and `inAliasAt` (`edits.ts:335`) gate on `linkInCode` (`edits.ts:324-331`: "code touches any of the connection") instead of on the caret.
- **Caret Gate:** `autocompleteQuery` (`autocomplete.ts:50`) and `headingHash` (`headingHash.ts:21`) still gate on the caret's `inCodeAt`, and `pasteLink.literalAt` (`pasteLink.ts:42-47`) does too.
- **No Gate:** `linkTyping` has none (`linkReveal.ts:17-25`).
- **Pass Counts:** `linkInCode` runs `linkAt` again (`edits.ts:327`). `slotNear` is **3** `pageLinkPattern` passes (linkInCode, aliasSpanAt, linkAt), not 2. `commitAliasOnEnter` is **3** (`linkAt`, `aliasSpanAt`, `linkInCode`), not 2. `inAliasAt` is 2. Per keystroke, `aliasOnLeave` can call `slotNear` twice (`linkEdit.ts:154,158`), which is up to 6 passes. Everything is line-scoped, so no rule is broken.

This strengthens S4's Approach A.

**A-37 [V] Only `commitAliasOnEnter` Refuses Raw HTML (S4):** It does so at `linkEdit.ts:60`. `decorations.ts:472` drops `inHtml` tokens. `slotNear`, `inAliasAt`, the picker, and `rememberAliasNear` don't refuse. The consequence (picker, collapse, alias memory) is inferred.

**A-38 [V] The `[[` Picker Needs a Closer, but Embeds Don't (S4):** `autoPair` returns null with Pair Brackets off (`edits.ts:353`). `pageLinkPattern` requires `]]` (`connections.ts:8`), and `markdownDestinationAt` uses `emptyTolerantLinkRegex`, which requires `)` (`links.ts:16-17,46-56`). So with Pair Brackets off, neither `[[Foo` nor `[label](foo` opens a picker. Only the `![[` loop feeds the picker unclosed input (`autocomplete.ts:121-133`). `linkDestinationStart`'s fallback (`links.ts:62-64`) and `isInsideWikilink` (`edits.ts:612-627`) read unclosed openers too, but not for the picker (A-112).

This is exactly what Nathan's picker ruling targets. **No approach in these four reports implements that ruling** (see A-112).

**A-39 [V] Slot Classification Happens Four Times (S4):** The four places are `autocompleteQuery:72-94`, `slotNear` (`linkEdit.ts:104-113`), `titleSpanAt` (`headingHash.ts:7-12`), and `aliasSpanAt` (`commitAliasOnEnter`, `inAliasAt`). The three wrappers (`connections.ts:50-64`) each re-run `linkAt`.

**A-40 [V] Link Syntax Is Spelled by Hand (S1, S4):**

- **Picker Link Form:** `formSyntax` 'link' (`autocomplete.ts:210`) bypasses `connectionText` (F-035).
- **Slot Openers:** `autocomplete.ts:238,247,256,271`.
- **Caret Arithmetic:** `:241,250,268,276`.
- **Embed with Heading:** Spelled by hand at `rewrite.ts:47,92`, because `pageEmbedText` (`connections.ts:107-109`) takes no heading.

S1 §3 "Writer naming" and S4 §2.2 are merged here. The embed-commit drop of a typed `#heading` is inferred: `formSyntax` 'embed' replaces the whole span.

**A-41 [V] Heading Lists Come from Two Sources (S4):** The picker uses `warmBody`/`fetchBody` → `headingOutline` (`headingTarget.ts:20-27`, `editorHost.tsx:139-143`). Missing-heading drawing uses `conn.headingsOf` → `s.headings[path]` (`pageConnections.ts:31`, `decorations.ts:459`). The lag mismatch is inferred.

**A-42 [V] The Heading Tree Is Derived Twice (S4):** `openHeadingRows` (`autocomplete.ts:159-171`) and the pane's `nested()`, which uses fake `OutlineHeading`s `{from:0,key,text,level}` (`AutocompletePane.tsx:184`). Meanwhile the hook holds real outlines (`useConnectionAutocomplete.ts:103`).

**A-43 [V] The Arm-Time `inBracket` Check Is Redundant (S4):** `sectionArmAfter` checks at `useConnectionAutocomplete.ts:268`, and `autocompleteQuery` checks again at `autocomplete.ts:61`, which `autocomplete.test.ts:389` pins. The arm-time code check isn't redundant (the query checks the caret, not the `§`).

**A-44 [V] "Literal Here" Is Spelled Three Times (S4):** `isLiteralAt` (`edits.ts:638-643`: code, `c-1`, math, `isInsideWikilink`, url run), `literalAt` (`pasteLink.ts:42-47`), and `headingHash`'s `inCodeAt(sel)||inCodeAt(sel-1)` (`:21`). `literalAt` ignores wikilink interiors (consequence: A-59).

**A-45 [V; NEW] "Code Touches the Connection" Is Spelled Twice After the Baseline (Link Gestures Leftover):** The tokenizer drops a wiki that overlaps a code token (`tokens.ts:282`, `notOverlapping([...embeds, ...code])`, plus `inCode(s.full[0])` at `:232`). `linkInCode` re-derives the same rule with `inlineSpans(line).some(overlap)` plus `inFenceAt` (`edits.ts:324-331`). The outcome is the same with two spellings. None of the four scouts could see it (it landed after they ran).

---

### 3. Odd-Ones-Out

**A-46 [V] Rename Reconstructs Whole Tokens (S1):** `rewrite.ts:40,47,57,85,92,100` rebuild whole tokens, while every other link mutation edits a span. `escapedPipe` (`:25-26`) exists only for this.

**A-47 [V] Titles Lack an Expressibility Check (S1):** `nameError` rejects `|#§` and allows `]` (`names.ts:27`). **(ran, grammar copy):** `[[Draft]]]` matches `[[Draft]]` with page `Draft`. So Copy Link, Paste As Connection, and the picker break a title ending in `]`. `expressibleHeading` and `embeddableTitle` exist at `connections.ts:99-105`.

**A-48 [V] Pattern Naming Is Inconsistent (S1):** There are `*Pattern()` factories, `*Regex()` factories, and the `MD_LINK` constant.

**A-49 [V] `LinkSyntax` Has Four Arms but One Reader (S1):** The only reader is `indexSeed.ts:62` (embed vs not), confirmed by `git grep '\.syntax\b'`. **Merged:** `linkAt` being wikilink-only (S1) is folded in here as naming (A-86).

**A-50 [V] `linkEntry`'s Hand Spelling Earns Itself (S1, S2):** `linkValue.ts:21`. See the Traps.

**A-51 [V] `LinkCell` Ignores `ctx.connections` (S2):** See A-23.

**A-52 [V] The Value Menu Is Wired at the Parent Three Times (S2):** At `PropertyPanel.tsx:333-347`, `CardValue.tsx:108-121`, and `TableView.tsx:282-293`. The three differ:

- **Card:** Passes `hideable=true` (`CardValue.tsx:115`).
- **Card and Table:** Wrap the menu in `holdGhost` (`CardValue.tsx:117`, `TableView.tsx:290`).
- **Panel:** Neither.

S2 didn't mention these differences, and they bear on Approach S2-B.

**A-53 [V] `valueClickIntent`'s Link Arm Is Asymmetric (S2):** A page returns `null` and a url returns `open` (`valueClick.ts:21,47-52`).

**A-54 [V] `linkResolve.ts` Lives in `Cells/` Without a Cell Reader (S2):** Its only reader is `parseEditorValue.ts:5,39`.

**A-55 [V] The Optional `resolve?` Has No Consumer (S2):** In `linkValue.ts:48,85`, the only production caller always passes it (`parseEditorValue.ts:36-40`).

**A-56 [V] Text Values Sort and Filter on Raw Markdown (S2):** `filter.ts:144-146` and `sort.ts:58-59` use raw text, while link values use `linkDisplayText` (`filter.ts:147-149`, `sort.ts:60-62`). Intent is unknown.

**A-57 [V] Rectangle ⌘V Doesn't Format Links (S3):** `MarkdownTable.tsx:243-252` goes through `cellToSource(text)` with no link formatting.

**A-58 [P; NEW] A Resting Cell's Format ▸ Page Title Never Swaps In the Fetched Title:**

- **Mechanism:** `menuTarget`'s url arm (`cellStatic.tsx:466-474`) commits `linkActionText(...).insert`. When uncached, that's `[domain](url)` with `wantsTitle` true (`linkFormat.ts:45-52`, `linkValue.ts:132-143`). It then calls `host.linkTitles.resolve(url)`, but nothing tracks the inserted span. The body path does track it, through `awaitTitle` (`linkFormat.ts:81-83`) and `pendingTitles` (`pendingTitle.ts:20-41`).
- **Probe:** In a resting table cell holding `[x](https://example.org)`, choose Format ▸ Page Title with an empty cache, wait for the fetch, and re-render. *Expected:* the label becomes the title. *Feared (by reading):* the label stays the domain.

**A-59 [P; NEW] Pasting an Address Inside a Wikilink Nests a Markdown Link:**

- **Mechanism:** `literalAt` (`pasteLink.ts:42-47`) treats only code and markdown destinations as literal, so pasting `https://a.co` with the caret in `[[Foo|]]` reaches `decidePaste` → `linkPaste` and writes `[a.co](https://a.co)` into the alias. `pageLinkPattern`'s alias admits no `]` (`connections.ts:8`), so the connection breaks.
- **Contrast:** The sibling typing guard does stand down inside a wikilink (`isInsideWikilink` in `isLiteralAt`, `edits.ts:642`).
- **Probe:** Type `[[Foo|]]`, place the caret in the alias, and ⌘V an `https` URL. *Expected:* literal text. *Feared:* nested `[..](..)` and a broken link.

**A-60 [P] Dropping an Address Isn't Formatted (S3, Inferred from CM6 Defaults):** The only drop handler is `dropMargin` (`decorations.ts:760-766`). **Probe:** Drag an `https` URL from a browser into the body. *Expected per Nathan's "one rule":* formatted as a paste. *Likely:* raw text.

**A-61 [V] Page Title Is Offered for Non-HTTP Addresses (S3):** `URL_ROWS` offers Page Title for any `isValidLink` address (`pasteAsMenu.ts:59-62`). `linkPaste` sets `wantsTitle` with no http gate (`linkValue.ts:142`), while `fetchPageTitle` refuses non-http (`Desktop/Web/linkTitles.ts:9`). The rest is verified by reading:

- **Failed Fetch:** `resolveLinkTitle` records the failure in `failedTitles` and never sets a title (`cacheSlice.ts:23-35`).
- **Pending Entry:** `sweepOnTitles` `continue`s on null (`pendingTitle.ts:56-57`), and the subscription never fires for a failure. So the pending entry lives until the text is edited.
- **Not Mailto-Only:** This holds for **any** failed fetch, not only mailto.

**A-62 [V] The Link Property Refuses `[[#Heading]]`, Though Its Cell Draws It (S3):** **(ran):** `linkValueFromEdit('[[#H]]')` → `undefined`. `LinkCell.tsx:75-76` draws and opens it through `holder`.

**A-63 [V] Address Copy Link Drops the Alias and Doesn't Normalize (S3):** At `connectionMenuActions.ts:37`. A schemeless copy fails plain ⌘V, because `pastedUrl` requires a scheme. That's defensible, as S3 said.

**A-64 [V] Footnote Is Offered on Any Non-Empty Clipboard (S3):** At `pasteAsMenu.ts:79`. It's minor.

**A-65 [V] The Picker's State Lives in React, Its Sibling's in CodeMirror (S4):**

- **Picker:** `ac` useState, the `armed` ref (never mapped through changes; `sectionArmAfter` returns positions without `mapPos`, `:251-273`), `measured`, `sameQuery`, and `formRef` plus its effect (`useConnectionAutocomplete.ts:46-83,242-248`).
- **Sibling:** `blockQuery` is a `StateField` (`Menus/blockQuery.ts:32-54`), and `useBlockMenu` compares field identity (`useBlockMenu.ts:21-30`).

**A-66 [V] A Typed `§` Arms the List, but `##`→`§` Doesn't (S4):** `sectionArmAfter` needs `input.type` (`:255`). `sectionSign` is applied via `apply` → `applyEdit` with userEvent `'input'` (`markdownInput.ts:56,262`, `applyEdit.ts:26`). Intent is unknown.

**A-67 [V] The Alias Slide Is Inferred, the Heading Slide Recorded (S4):** The alias slide reads the `cameFrom` ref written during render (`AutocompletePane.tsx:81-87,90`). The heading slide uses `viaChevron` state (`useConnectionAutocomplete.ts:85,182`).

**A-68 [V] Chevron and ArrowRight Disagree on an Empty Markdown Target (S4):** The chevron is drawn on every `link`/`target` page row (`AutocompletePane.tsx:83,127`). ArrowRight requires `query !== ''` for `target` (`useConnectionAutocomplete.ts:203`). `lookup('')` lists pages for `target`, since only `link` empties (`:146`).

**A-69 [V] `openAlias` and `aliasRows` Key the Page Differently (S4):** `openAlias` uses `target?.pageId` (`useConnectionAutocomplete.ts:170-176`). `aliasRows` needs `title` and returns `[]` for `''` (`autocomplete.ts:179`). For `[[#H` in a held (Text value) pane, the pipe opens over an empty list. The outcome is inferred.

**A-70 [V] Scope Split and Remaining Picker Odd-Ones-Out (S4):**

- **Alias Rows:** Carry a closure (`autocomplete.ts:35,192`).
- **`headingRows`:** Applies `expressibleHeading` to the `fragment` form too (`:151`).
- **`commitAliasOnEnter`:** Page-only (`markdownInput.ts:271`, mounted at `MarkdownEditor.tsx:142`), while `aliasOnLeave` and `typedInput` sit in `inlineSurface` (`surface.ts:55,68`).
- **`headingHash`:** Lives in `Links/`, while its chain siblings live in `Input/edits.ts` (`markdownInput.ts:43,247,254`).

**A-71 [V] The Embed-Pairing Comment Is False (S4):** `autocomplete.ts:119` says "`[` doesn't auto-pair after `!`." With Pair Brackets on, the first `[` after `!` is refused (`edits.ts:374`, where `isPairEdge('!')` is false). The second `[` takes the multi branch (`:357-369`): `opensEmpty` is false, `glued` is false for `!`, and `openDoubles` is 0. So it writes `[]]`, giving `![[|]]`.

---

### 4. Self-Induced Machinery

**A-72 [V] Rename Machinery Exists Because of Chained `String.replace` (S1):** The extra masks, `groupsOf`/`offsetOf` (`rewrite.ts:21-23`), and `escapedPipe` (`:25-26`) exist because rename runs three chained `String.replace` passes that rebuild tokens. `applyEdits` already exists (`markdownCode.ts`, used at `rewrite.ts:105`).

**A-73 [V] `titleOf` Exists Because Readers Use Raw Groups (S1):** `titleOf` (`connections.ts:21-22`) and `targetNamesTitle` (`links.ts:107-110`, sole caller `rewrite.ts:54`) exist because readers consume raw groups instead of `linkSpans` or `linksIn`.

**A-74 [V] `MdTarget` and `titleTarget` Sit in `MarkdownPM/Links` but Are Pure Over `PageIndex` (S1, S2):** They import only `PageIndex`, `targetTitle`/`targetFragment`, and `isValidLink` (`connectionsApi.ts:46-68`). `tokenTarget` (`:70-74`) is the only part that needs Engine tokens. So the value side re-derives resolution through `resolveConnection`.

**A-75 [V] The Double Opener Spawns `urlClickTarget`, `open`, and Three Handlers (S2):** See A-26.

**A-76 [V] `resolveConnection`'s Null-Collapse Exists for the Value Side (S2):** Its doc says so (`treeIndex.ts:283`). After `LinkCell` and the value menu move to `titleTarget`, its last caller is `linkResolve.ts`.

**A-77 [V] `ConnectionCell` Predates the Shared Stack (S2):** At `LinkCell.tsx:64-97` (34 lines). `TextCell` proves the shared stack runs on a resting value (`TextCell.tsx:28-41,60`).

**A-78 [V] `linkValueMenuTarget`'s `apply` Filter Is a Type Adapter (S2):** At `connectionMenuActions.ts:98-100`.

**A-79 [V] `pasteDecision` Is a Subset of `pasteAsWrite` (S3):** The bare-caret arm `linkPaste(target, format, title)` (`pasteDecision.ts:46`) equals `pasteAsWrite({kind:'url',url}, format, title)` (`pasteAsMenu.ts:121`). `PasteInput`, `LITERAL`, and `PasteDecision` (`pasteDecision.ts:7-18`) exist only to keep `decidePaste` pure.

**A-80 [V] Several Paste Pieces Exist Because the Paste Paths Grew Separately (S3):**

- `wholeWikiLink` duplicates `parseConnectionText`.
- `TextPaste`/`LinePaste`/`LinkPaste.kind` exist only to discriminate.
- `LinkActionText` plus `formatted()` rename `LinkPaste`.
- The renderer's second clipboard read exists because the menu reply is a bare action string (`Menus/menu.ts:72-73`).

**A-81 [V] `composeWebpageEmbedLine`'s Label Has Only a Test Caller (S3):** The only production caller passes `''` (`pasteAsMenu.ts:119`). Its "ONLY assembly path" comment (`links.ts:27`) is false, because `webpageInsertAtCaret` writes `![]()` by hand (`Embeds/embedInsert.ts:59-60`). The label is test-only (`detect.test.ts:420-423`).

**A-82 [V] Picker Self-Machinery (S4):**

- The `measured`/`sameQuery`/`formRef`/unmapped `armed` cluster (A-65).
- The commit's re-parse of the worn alias (`useConnectionAutocomplete.ts:166-169`).
- `connectionInsert` (`autocomplete.ts:214-222`), whose only production caller is `commitEdit:263`.
- `cameFrom` vs `viaChevron` (A-67).
- The fake-outline reshape (A-42).
- The `fetched` reset in an effect (`:107-115`). A stale frame is possible; that's inferred and P-grade.
- `AcQuery` (`autocomplete.ts:30`), which is dead: `git grep` finds no reader.
- Seven optional pane props with defaults plus `NONE` (`AutocompletePane.tsx:35-45,63-69`). Production always spreads the full `ac.pane` (`useConnectionAutocomplete.ts:224-238`).

**A-83 [V] `ConnectionsApi.location?` and `headingsOf?` Are Optional but Always Supplied (S4):** At `connectionsApi.ts:42-43`. Both production builders supply them (`pageConnections.ts:31-34,44-45`).

**A-84 [D] Scout 4's `transactionFilter` Idea for `leaveSlot`'s `setTimeout` (S4):** S4 itself says "not measured." The blur path still needs its handler, and no mechanism is shown that a filter can append the collapse without altering undo grouping. That makes it a hypothesis, which the brief excludes.

---

### 5. Confusing Names

**A-85 [V] `LinkHit` Names Two Unrelated Types (S1):** It's the index occurrence (`scan.ts:62`, exported) and a private pointer hit (`linkClicks.ts:24`, not exported). The collision is real but low-cost.

**A-86 [V] `linkAt` Means Four Different Things (S1, S4):** It's `connections.ts:42` and the per-event finder returned by `linkGestures` (`cellStatic.tsx:404,414`, destructured at `TextCell.tsx:28`, `cellStatic.tsx:307`). `linkTokenAt` (`tokens.ts:331`) and `drawnLinkAt` (`decorations.ts:370`) are siblings. The merged entry also covers `linkAt` being wikilink-only.

**A-87 [V] `titleOf` Is an Escape Stripper That Collides with a Parameter (S1):** `connections.ts:21` strips an escape. `titleOf` is also a parameter name at `Properties/properties.ts:55`.

**A-88 [V] "Target" Means Six or More Things (S1, S2, S4):**

- `LinkTarget` (`linkValue.ts:11`) vs `linkTarget` (`tokens.ts:52`), which differ by case alone.
- `MdTarget`, `titleTarget`, and `tokenTarget` (`connectionsApi.ts`).
- `targetTitle` and `targetFragment` (`links.ts:94,102`).
- `encodeLinkTarget` and `decodeLinkTarget` (`links.ts:68,77`).
- `ConnMenuTarget`, `linkMenuTarget`, `tokenMenuTarget`, `linkValueMenuTarget`, and `cellLinkTarget` (`cellStatic.tsx:436`).
- `PasteAsTarget` (`pasteAsMenu.ts:28`).
- `HeadingTarget` (`headingTarget.ts:5`).
- The `'target'` form (`autocomplete.ts:19`).
- `LinkHit.target` (a normalized key).
- `LinkPaste.target` (a URL, `linkValue.ts:127`).

**A-89 [V] Heading, Qualifier, Fragment, and Section Name One Concept (S1, S4):** The names are `heading` (`ConnectionParts`, `LinkTarget`, `MdTarget`), `qualifier` (`LinkHit`), `fragment` (`Token.fragment`, `targetFragment`, the `'fragment'` form), and `'section'` (`§`).

**A-90 [V] `alias` Means Both an Alias and a Label (S1):** `escapeAlias`/`unescapeAlias` (`links.ts:19-25`) act on markdown labels.

**A-91 [V] Reader Names Don't Say Their Grammar (S1, S2, S3):**

- **Four Readers:** `parseLink`, `readLink`, `parseConnectionText`, and `parsePastedLink`.
- **Misleading "Pasted":** `parsePastedLink` runs on every commit, typed or pasted (`linkValue.ts:89`).
- **Five Resolver Names:** `resolveTitle`, `ResolveTitle`, `resolveConnection`, `PageIndex.resolve`, and `titleTarget`/`resolveMdTarget`.

**A-92 [V] `rewriteConnections` Also Rewrites Embeds and Markdown Links (S1):** `rewriteTileConnections` (`tilesFile.ts:291`) takes any rewrite.

**A-93 [V] File Names Don't Match Their Grammars (S1):** `pageLinkPattern` (the wikilink) lives in `connections.ts`, while the markdown grammar lives in `links.ts`.

**A-94 [V] `linkValue.ts` Is Half Editor-Paste Code (S2, S3):** Its paste exports (`linkPaste`, `linkMarkdown`, `LinkPaste`) are read by `pasteDecision`, `pendingTitle`, `linkFormat`, `pasteLink`, and `pasteAsMenu`. Its private `LinkValue` type (`:7`) isn't the property value. `pasteLink` and `linkPaste` are anagrams.

**A-95 [V] `ConnectionCell` and `.cell-connection` Break the Class Family (S2):** The rest of the app uses `md-connection-*`. Also, `linkDisplayText` handles connections, which `LinkDisplay` doesn't cover.

**A-96 [V] "Plain" and "Literal" Cross Meanings (S3):** `PASTE_PLAIN_ACTION='paste:plain'` (`Actions/editorMenu.ts:41`) dispatches `pasteAs(view,'literal')` (`Menus/menu.ts:68-69`), while the `'plain'` form means "the address alone." `pastedUrl` isn't paste-specific.

**A-97 [V] Picker Vocabulary Misleads (S4):**

- **`ConnectionForm`:** Its `'link'` means a wikilink title (`autocomplete.ts:19`).
- **`AutocompleteQuery.title`:** Names the owning page.
- **"Warm":** `warmBody` (`api.ts:192`) collides with `WarmSeam`/`warmSeamOf`/`tileWarmSeam` (`editorHost.tsx:10,15,36`).
- **`headingHash`:** Is named for its output.
- **`HeadingTarget 'warm'`:** Also covers "no page" (`headingTarget.ts:16`).
- **`aliasOnLeave`:** Also handles heading slots (`linkEdit.ts:98-102`).
- **"Title" in Product Copy:** `removeTitleOnLinkChange`'s label says "Title," while its hint says alias (`Settings/frames.ts:530-533`, `personalization.ts:153`, `useConnectionAutocomplete.ts:178`).
- **Abbreviations:** `AcRow`/`AcState` sit beside the full-word names.

---

### 6. Approaches

S1-S4 deltas are scout estimates from reading. The base files are measured (A-01), but the deltas are not. Each approach below is stressed on four questions: does it delete what it claims, does it relocate complexity, does it conflict with another approach, and does it break a rule. Overlapping claims are flagged; the de-duplicated ledger is A-113.

**A-98 [V, Estimate Plausible] S1-A: Rename Reads the Index Walk:**

- **Claimed Deletions:** `rewrite.ts:21-26` (6), the replace bodies `:32-59` (28) and `:73-110` (38), `targetNamesTitle` (`links.ts:107-110`, 4), and `titleOf` (`connections.ts:20-22`, 2-3). That totals 78, plus 32 added, for **−46**. The arithmetic checks against measured spans.
- **Stress 1:** The deleted `:73-80` include the `HEADING_REFERENCE` gate and the `own`/`names`/`wiki` setup, which the new body must keep. That's presumably inside S1's +24, so the estimate is tight.
- **Stress 2 (Trap):** `linksIn` maps an empty title to `own` (`scan.ts:18-21`). If rename calls `linksIn` with an `ownTitle`, `[[#H]]` on the renamed page would match `target === oldKey`, and editing its empty title span would *insert* the new title. Title rename must pass `ownTitle = ''` or skip empty title spans.
- **Stress 3:** A markdown destination with leading whitespace (`[x]( Old)`) is fixed by today's rewrite (it re-emits the whole target). A span edit must take the trimmed span to stay equivalent.
- **Behavior:** `[[A#Note\]]` stops matching heading `Note`, as the editor already treats it. That's the correct fix for A-07.
- **Rules:** No seam is touched; Connections already imports `Engine/markdownCode`. It's net simplification (fewer passes and no reconstruction), not relocation.

**A-99 [C] S1-B: One Value Model and One Resolver (−17):** The pieces don't all stand, and S1's −17 is not additive with the other scouts:

- **Holds:** `parseConnectionText` returning the page arm of `LinkTarget` (−6), and the title-expressibility check (+1). The `MD_LINK` → anchored `emptyTolerantLinkRegex` change holds too, but changes `[^1](x)` and `[a](b) [c](d)` in Link values and Paste As; that's intended.
- **Double-Counted:** "`ConnectionCell`/`linkValueMenuTarget` via `titleTarget` −6" is also claimed by S2-A (which deletes `ConnectionCell` outright) and S2-B (`linkValueMenuTarget`). F-035 (−1) is also claimed by S4-C (0).
- **Folding `parseLink` into `readLink` (−5):** `parseLink` is exported but has no production reader outside `linkValue.ts` (`git grep`), so it holds. It overlaps S3-1's reader restructure.
- **Moving `titleTarget`/`MdTarget` into `Connections`:** No rule breaks. `Connections` is engine-reached (`scan`, `rewrite`), and `connectionsApi.ts:46-68` imports nothing renderer-side. But `heldTarget` needs `OwnPage` (`MarkdownPM/api`) and stays in `Links`.
- **Unique Net:** About **−11**.

**A-100 [V] S1-C: One Occurrence Reader (≈−6, Optional):** The deletion spans are real (`wikiLinkTokens` `tokens.ts:228-253` = 26 lines, `sectionRunsIn` re-match `scan.ts:30-32`, `loneEmbedRe` `detect.ts:400`).

- **Rules:** The Engine already imports `Connections` (`tokens.ts:14`), so an occurrence reader there breaks **no** rule.
- **Stress:** It folds `notOverlapping` precedence for embeds and wikis into `Connections`, but `tokenizeChunk` keeps `notOverlapping` for every other token kind (`tokens.ts:288-309`). The "agreement by construction" is the real value, as S1 said.
- **High-Frequency Work:** It must keep the editor's per-chunk call shape (`visibleInline`, `decorations.ts:376`). No high-frequency violation if it does.

**A-101 [V] S1 Aside: `aliasMemory` into `editorHost` (−4, Optional):** It's fine. Have the harness import the real functions (that fixes A-22).

**A-102 [V with Stress] S2-A: Link Value Pages Ride `TextCell` (−38):**

- **Deletions:** `LinkCell.tsx:64-97` is 34 lines. **Five of the −38 are CSS** (`table.css:258-262`); excluding CSS, it's **≈−33** for TS/TSX.
- **Behavior Gains:** Window and Preview routing, phantom and ambiguous tones, `§` heading display, heading-missing marking, and glancing.
- **Stress 1:** `TextCell`'s `linkGestures` without `menuAt` opens the **read-only** page menu (`cellStatic.tsx:409-412,415-424`) and calls `stopPropagation`, which pre-empts the parent's editable value menu. S2 said this. A requires B, or the +2 decline.
- **Stress 2:** `TextCell`'s layout (`cell-text-host`/`clip`/`line`, `TextCell.tsx:47-63`) differs from `OverScroll className="cell-text-scroll"`. **[P]** Probe a Table, Cards, and the Panel with a long `[[Page#Heading|Alias]]` value for truncation and ellipsis parity.
- **Stress 3:** `cellLinkTarget` returns null without an api (`cellStatic.tsx:442`), so a surface without `ctx.connections` would draw but not follow. `PropertyPanel` always supplies one (`:172`), and views use `previewConnections` (`Views/Host/useViewHost.ts:113`). OK.
- **Rules:** None broken.

**A-103 [C] S2-B: The Value Menu Lives With the Value (−18):** The −20 for deleting the three parent blocks ignores per-surface differences that must move with the menu or be threaded:

- **`holdGhost`:** Card and Table wrap it (`CardValue.tsx:117`, `TableView.tsx:290`).
- **`hideable`:** Card passes `hideable: true` (`CardValue.tsx:115`).
- **Fallback:** When no link target exists, the parents still need the generic-menu fallback (`PropertyPanel.tsx:346`, and the generic paths in Card and Table). That works only if the value's `onContextMenu` returns false and lets the event bubble, which `linkGestures` already does (`cellStatic.tsx:419-420`).
- **Corrected Net:** About **−12 to −14**, and still negative.
- **Overlap:** It overlaps S1-B's `linkValueMenuTarget` piece (A-99).

**A-104 [C] S2-C: One Reader per Concern (−32):**

- **`useLinkTitle`:** −6 holds, but **placement is wrong**. `Session/cacheSlice.ts` is a store slice with no React today (imports at `:1-4`). Put the hook beside `useConnections` in `Session/` or under `Core/Web/`. It's not a rule break, but a hook in a slice is an odd-one-out.
- **One URL Opener:** −3 holds. Behavior: an invalid-address text click becomes edit, which ties to A-27.
- **`urlClickTarget`:** −5 holds.
- **`linkAlias`:** −4 holds (sole caller `PropertyValueInput.tsx:56`).
- **`linkResolve.ts` and `resolveConnection`:** −14 holds only after S2-A and S2-B. Callers today: `LinkCell.tsx:75`, `connectionMenuActions.ts:90`, `linkResolve.ts:8` (`git grep`).
- **Overlaps:** S1-B claims part of `resolveConnection`'s removal. S3-1 also reshapes `linkValueFromEdit`'s resolver argument, but `ResolveTitle` (−1) is the only overlapping line.
- **Rules:** Making `resolve` a required `PageIndex` on `linkValue.ts` (engine-reached) is fine, since `pageIndex.ts` is pure.

**A-105 [C] S2-D Conflicts With S3-1 (S2-D: `readLink` Reads `[x](Page)` as a Page):**

- **The Conflict:** S2-D's rule is "a markdown target with non-null `targetTitle` is a page, unresolved." Applied in host-side `readLink`, that would make `[x](example.com)` a page (ran: `targetTitle('example.com')` is non-null). That repeats `pasteAsTarget`'s mistake (A-14).
- **Better Rule:** S3-1's "page when it resolves; without a resolver, a page only when it isn't a valid address" is the right rule for a resolver-free reader.
- **Overlap:** D's −8 on `parsePastedLink` is the same lines S3-1 deletes (−15).
- **Merge:** Take S3-1's rule and drop D's delta.

**A-106 [C] S3-1: One Link Reader (−15):** The arithmetic holds against measured spans: `wholeWikiLink` `:30-33` (4) + `PasteAsTarget` `:28` (1) + `pasteAsTarget` `:35-47` (13) + `parsePastedLink` `:48-62` (15) = 33, plus 18 added. Two corrections:

- **Unlisted Behavior Change:** The Link property would start **accepting** `[x](example.com)` as `[x](https://example.com)`. Today it's refused (A-15), and the new rule falls through to "address if valid." That's probably desirable, but it's unlisted.
- **Unaddressed Edge:** It leaves A-16's sibling: `[x](#H)` is refused only if the reader rejects an empty title with a fragment. S3 says it does, so keep that explicit.
- **Overlaps:** S2-D's −4 deletes the same `parsePastedLink` lines (A-105), so it isn't additive. S1-B's `ConnectionParts` (−6) and `parseLink` fold (−5) touch different lines and stay counted in A-99. Design the reader with S1-B's `MD_LINK` and `parseLink` changes as one change, but count its lines once at about −15.

**A-107 [C] S3-2: One Paste Pipeline (−80):** The deletion list holds, but two pieces are overcounted:

- **`linkFormat.ts` −23 Is Overstated:** `cellStatic.tsx:33,471-474` consumes `linkActionText`'s `{insert,url,wantsTitle}` with no view. So `LinkActionText` either survives or `cellStatic` is rewritten to `LinkPaste` field names. The view-based `writeLinkAt` can't serve the resting cell (A-33, A-58). Count about **−12**, not −23.
- **Plain Text Removal (−3) Is a Product Change:** It needs Nathan's ruling.
- **`pasteLink.ts` −20:** Self-described as uncertain (±15). The truly removable code is `linkFor` (`:17-39`, 23 lines) minus a re-added `paste()` body.
- **Seams:** `pasteAsMenu.ts` stays pure and main-importable, so `Desktop` still builds rows. **Rule-safe.**
- **Corrected Net:** About **−55 to −65** inclusive of S3-1's −15.

**A-108 [V] S3-3: Rectangle and Copy-Side Fixes (+3 Net):** They're behavioral. The rectangle path has no view, so it needs `pasteAsWrite(…,'auto')` with settings and cache read from `host`. `MarkdownTable.tsx:245` already has `host`. Each fix is skippable.

**A-109 [C] S4-A: One Slot Reader (−13 to −16):**

- **Stronger Than S4 Knew:** `linkInCode` (`edits.ts:324-331`) is a fourth `linkAt` caller that a `slotAt` must also feed. Have `linkInCode` take the spans instead of re-reading. With that, `slotNear` and `commitAliasOnEnter` drop from 3 passes to 1.
- **No Second Gate:** S4's proposed `liveLinkAt(scan,pos)` shared gate already half-exists as `linkInCode`. Extend or rename it rather than adding one; adding one would duplicate A-45.
- **Gap:** `slotAt` is closed-link-only, so it doesn't deliver the picker ruling (A-112).
- **Rules:** `Connections` stays code-blind; the gate stays in `MarkdownPM`. Rule-safe.

**A-110 [V with Stress] S4-B: The Picker Query as a StateField (≈−18):**

- **Behavior Difference:** Unlike `blockQuery`, which nulls on selection-only transactions (`blockQuery.ts:36`), the picker must re-derive on selection moves (caret placed into a finished link). So the field's `update` runs `autocompleteQuery` on every selection transaction. That's the same cost as today's listener (`useConnectionAutocomplete.ts:61`), so it's not a new high-frequency cost, but it should be stated.
- **Per-Mount Field:** Needed because no facet carries `MarkdownScope`.
- **Arm Logic:** The −53/+35 arithmetic is a plausible estimate. The arm logic (23 lines) mostly moves into the field, so check that it isn't relocation: the real deletions are `measured`, `formRef` plus its effect, and the unmapped-`armed` bug.

**A-111 [C] S4-C: Commit and Phase Cleanup (−36):** Most items hold:

- **`connectionInsert`:** "−8" is about −6, because inlining re-adds the `insert`/`caret` computation.
- **`AcQuery`:** −1, and it's dead.
- **F-035:** Shared with S1-B.
- **`behind` Replacing `viaChevron` + `cameFrom`:** −7, with a user-visible change S4 noted.
- **The Rest:** The `headingTarget.ts` fold (−6) and the heading tree (−8) are estimates.
- **Net:** About **−32**.

**A-112 [V; NEW Gap] No Approach Implements Nathan's Picker Ruling:** Nathan ruled that `[[`, `![[`, and `[label](` each open the picker with or without Pair Brackets, and a pick or Enter writes the closer. Every reader above is closed-only:

- `linkAt` and `pageLinkPattern` need `]]`.
- `markdownDestinationAt` and `emptyTolerantLinkRegex` need `)`.

Three partial unclosed readers exist, and none feeds the picker:

- **The `![[` Loop:** It yields spans and already commits to line end or the closer (`autocomplete.ts:120-133`).
- **`linkDestinationStart`'s Fallback:** It finds an unclosed `[label](` destination start through `head.lastIndexOf('](')` with no `)` after it (`links.ts:62-64`). Its readers are `headingHash`, `inUrlRun`, and `literalAt`, but not `autocompleteQuery`.
- **`isInsideWikilink`:** It counts unclosed `[[` depth, but gives no spans (`edits.ts:612-627`).

The planner must add an unclosed-opener read for `[[` and `[label](`, most naturally one opener scan generalizing these three. That scan then also resolves the three-answers problem in A-38. The ruling (10-09, 7:11 PM) postdates the scouts (6:42-6:49 PM), so this is a gap to fill rather than a scout failure.

**A-113 [C] De-Duplicated Ledger for These Four Surfaces:** Estimates, not measurements. Each line is counted once:

| Item                                                                                      | Delta     |
| ----------------------------------------------------------------------------------------- | --------- |
| S1-A                                                                                      | −46       |
| S1-B, unique part                                                                         | −11       |
| S2-A (excluding CSS)                                                                      | −33       |
| S2-B, corrected                                                                           | −13       |
| S2-C                                                                                      | −32       |
| One link reader (S3-1; absorbs S2-D's −4, which deletes the same `parsePastedLink` lines) | −15       |
| S3-2 beyond S3-1, corrected                                                               | about −45 |
| S3-3                                                                                      | +3        |
| S4-A                                                                                      | −14       |
| S4-B                                                                                      | −18       |
| S4-C                                                                                      | −32       |

- **Total:** **About −256**, with S1-C (−6) and `aliasMemory` (−4) optional.
- **Picker Ruling:** A-112's implementation will **add** lines not in any estimate.
- **Scouts' Own Sum:** The scouts' summed figures (S1 −63, S2 −88, S3 −80 to −77, S4 −65 to −70, about −296) double-count roughly 40 lines across the reader, resolver, F-035, and `ConnectionCell`/`linkValueMenuTarget` overlaps.

---

### 7. Would Go False

**A-114 [V] Docs:**

- **`ConnectionsPM.md:24`:** "One pure pass over three patterns" is **already inaccurate**, since rename runs three passes. S1-A changes it.
- **`ConnectionsPM.md:8`:** "Can never disagree." S1-C makes it true; it's half-true today (A-21).
- **`ConnectionsPM.md:73`:** The limitation goes under S2-A.
- **`ConnectionsPM.md:4`:** S2-D or S3-1 widen it.
- **`PropertiesPM.md:81-83`:** S3-1 changes markdown-to-address acceptance.
- **`PropertiesPM.md:118`:** Doesn't name the parent menu route. **S2's "verify on edit" resolves to no change.**
- **`MarkdownPM.md:107`:** "A copied connection … offers Connection, Markdown Link, and Embedded Page" is **already false** for headed connections (ran, A-17), and S3-2 drops Plain Text.
- **`MarkdownPM.md:33`:** S3-3 makes "pasted anywhere in the editor" true.
- **`Guidelines/Editor-Internals.md:39`:** Describes a held pane's handlers generally. S4-B doesn't falsify it. **Corrected** from S4's claim.

**A-115 [V] Comments:**

- `rewrite.ts:38,42,49` and `scan.ts:86` (S1-A).
- `LinkCell.tsx:15` (S2-A).
- `valueClick.ts:21` (S2-C).
- `treeIndex.ts:283` (S2-C).
- `linkResolve.ts:1` (S2-C).
- `pasteDecision.ts:1,20` (S3-2).
- `linkValue.ts:131,136` (S3-2).
- `linkFormat.ts:80` (S3-2).
- `links.ts:27` ("ONLY", **already false**).
- `autocomplete.ts:119` (**already false**, A-71).
- `autocomplete.ts:197` (S4-C).
- `headingTarget.ts:9` (S4-C).
- `useConnectionAutocomplete.ts:47,71,78,189` (S4-B).

**A-116 [V] Tests:** Spot-checked against HEAD:

- `scan.test.ts:235,254` (exact `LinkHit` shape).
- `rewrite.test.ts:154-165`.
- `LinkCell.test.tsx:26-37` (`.cell-connection` and the mocked `select`).
- `connectionMenuActions.test.ts:104`.
- `linkValue.test.ts:120,133,159,170`.
- `pasteAsMenu.test.ts:42-43,51,70,100-101,131` (Plain Text).
- `pasteLink.test.tsx:212`.
- `detect.test.ts:420-423` ("the ONE assembly path").
- `pasteDecision.test.ts` (132 lines).
- `autocomplete.test.ts:389`.
- `aliasPicker.test.tsx:97,193`.

---

### 8. Traps

**A-117 [V] Main Must Read the Clipboard and Build Paste As Rows (S3):** `askEditorMenu` parks until Chromium's `context-menu` (`Desktop/Actions/editorMenu.ts:25-31,43-50`), and rows read `clipboard.readText()` in that turn (`:103-105`). **The `clipboard:read` channel stays:** ⌘⇧V (`pasteLink.ts:128`), Paste Without Formatting (`pasteLink.ts:88` via `menu.ts:68-69`), and rectangle ⌘V (`MarkdownTable.tsx:245`) all use it.

**A-118 [V] The Two Clipboard Doors Are Forced by Layering (S3):** `dialer` vs `host.clipboard` exist because the editor imports no `Platform/dialer`.

**A-119 [V] Every Paste Write Must Stay Tagged `input.paste` (S3):** `CellEditor.tsx:154-163`, `tableGuard.ts:26-28`, and `pasteMargin` (`decorations.ts:753-759`, a reader S3 missed) all depend on it. A shared `writeLinkAt` must take `userEvent` from its caller, because Format ▸ isn't a paste.

**A-120 [V] Async and Read-Only Checks Must Survive Any Merge (S3):** `isConnected` and `readOnly` re-checks are at `pasteLink.ts:19,90,126,130`, and the null `clipboardData` path at `:114`. `writeLine`'s `embedSeatAt` re-check is at `:67`. All must survive.

**A-121 [V] Keep the Strict Paste Test (S3):** `pastedUrl`'s strictness is correct; unify only the spelling. Don't move `ImagePicker`/`adoptFile` to the composite, because `isValidLink` needs a dotted host (`urlPath.ts:32`).

**A-122 [V] `pasteAsWrite`'s Null Arms Are Mostly Type-Forced (S3):** At `pasteAsMenu.ts:105-106,116,120`.

**A-123 [V] Keep the Wikilink and Embed Patterns Apart (S1, S4):** Embeds exclude `#` from the page and have no alias (`connections.ts:3-4`), and `(?<!!)` keeps the patterns disjoint (`:8`).

**A-124 [V] `linkSpans`' `unescaped` Must Stay (S1):** At `connections.ts:32-33`. `escapedPipe` can go under a span edit.

**A-125 [V] `codeMask` and `inCodeAt` Both Read Fence Spans (S1):** They aren't divergent. `codeMask` (`Engine/markdownCode.ts:199`) masks through `fenceSpans` (`:100,118`). `inCodeAt` (`Engine/docScan.ts:350-355`) reads `scan.fences`, built by `scanFencedCode` (`docScan.ts:66`) over `fenceSpans` (`detect.ts:89`). Re-read at HEAD.

**A-126 [V] `emptyTolerantLinkRegex` Is Needed (S1):** ⌘K seats the caret in `[]()` (`links.ts:45`).

**A-127 [V] `linkEntry`'s Nesting Unwrap Is Real (S1, S2):** YAML reads unquoted `[[Page]]` as a nested sequence (`linkValue.ts:15-22`, `propertyValue.ts:73`).

**A-128 [V] `isInsideWikilink` Isn't a Duplicate of `linkAt` (S1, S4):** It counts unclosed `[[` for typography. It's also the nearest existing piece for A-112.

**A-129 [V] Keep `frontmatterMentions` and `valueLinks` Separate (S1):** Only the key-scope disagreement (A-20) is open.

**A-130 [V] The Lazy Alphabetical Sort Is Load-Bearing (S1):** At `pageIndex.ts:31-32`.

**A-131 [V] Rename Must Pass the Same Outline (S1):** `rewriteHeadingConnections` passes `[...outline, oldHeading]` (`rewrite.ts:107`). S1-A must pass the same to `linksIn`. **Add (A-98):** title rename must not let `linksIn`'s `own` mapping catch `[[#H]]`.

**A-132 [V] A Bare URL Isn't a Token (S2):** `TokenKind` has no url (`tokens.ts:17-29`). So `LinkCell`'s URL half stays, and synthesizing `[d](url)` would hit page-first resolution.

**A-133 [V] `readLink` Family Runs Host-Side (S2):** It runs in `cascade.ts:96-97,209`, `scan.ts:118,134`, and `rewrite.ts:125`. Keep it resolver-free (see A-105).

**A-134 [V] `linkDisplayText`'s No-Format Raw URL Is Deliberate (S2):** Sort and filter rely on it (`linkValue.ts:109`).

**A-135 [V] `holder` Is Undefined for Spaces (S2):** At `valueContext.ts:18-20`.

**A-136 [V] Editable Menu Closures Stay (S2):** The editable-action closures stay with the parents, plus `holdGhost`/`hideable` (A-103).

**A-137 [V] `showFullLink` Must Be Preserved (S2):** At `TableView.tsx:680`.

**A-138 [V] Views Read `previewConnections` (S2):** At `Views/Host/useViewHost.ts:113`.

**A-139 [V] Keep the `open` Intent, Drop the Anchor's Opener (S2):** That's S2's call, and it's correct.

**A-140 [V] Picker Traps That Hold (S4):**

- `index:headings` stores normalized keys only (`indexSeed.ts:73`).
- Tokens drop empty alias and fragment slots (`tokens.ts:234-235`), so they can't replace `linkAt` for slots.
- `backedTo`, `authored`/`typedInto`, `aliasEpoch`, and `sameQuery` earn themselves.
- `cold` stays after F-041 (`knownBody` exists, `pageDetailCache.ts`).
- Alias memory has one writer and one forgetter.

**A-141 [V] Rename Can Still Write `[[Bar|Bar]]` (S3, Corrected Scope):** S3's trap says `connectionText` suppression means "`[[Bar|Bar]]` can't be produced." That holds **for Paste As only**. The body rename path produces it today (ran, A-08).

---

### Dropped & Corrected

**Corrected:**

- **A-142 [C] (S3, Severe):** `parsePastedLink` on `[l](example.com)` is **refused**, not "url if unresolved" (A-15).
- **A-143 [C] (S4):** The code gates and `linkAt` pass counts are stale. `linkInCode` now gates three readers, and the passes are 3, not 2 (A-36). `edits.ts` is 819 lines and `linkEdit.ts` is 173 (A-02).
- **A-144 [C] (S2-D, S3-1, S1-B):** The reader deltas are one change. S2-D's unresolved page rule would misread `[x](example.com)` (A-105).
- **A-145 [C] (S3-2):** `linkFormat` −23 is about −12, because the resting cell consumes `LinkActionText` with no view (A-107).
- **A-146 [C] (S2-B):** It ignores `holdGhost`/`hideable` and the generic fallback, so −18 is about −13 (A-103).
- **A-147 [C] (S2-A):** 5 of its −38 are CSS (A-102).
- **A-148 [C] (S2 §2.8):** The title hooks differ in the display source and the subscription too (A-29).
- **A-149 [C] (S2 §2.3):** The glance inference is now verified by reading (A-23).
- **A-150 [C] (S1):** `MD_LINK` admits a newline in the label only (A-09).
- **A-151 [C] (S3):** `webGuests.ts:18` is `WEB_ADDRESS && isHttpLink` (A-31).
- **A-152 [C] (S2-C):** The `useLinkTitle` placement in `cacheSlice.ts` is wrong (A-104).
- **A-153 [C] (S4-A):** Its shared gate already exists as `linkInCode` (A-109).
- **A-154 [C] (S4):** `Editor-Internals.md:39` doesn't go false (A-114).
- **A-155 [C] (S3 Trap):** The `[[Bar|Bar]]` impossibility is Paste As only (A-141).
- **A-156 [C] (S3 §3):** The "never settles" pending title applies to any failed fetch, not only mailto (A-61).

**Dropped:**

- **A-157 [D] (S4 §4):** The `leaveSlot` `setTimeout` → `transactionFilter` idea is self-declared unmeasured and has no mechanism (A-84).
- **A-158 [D] (S1 §6-A):** The deleted-comment count ("four of the three-line justification comments") is subsumed by A-98's span count. It isn't a separate claim.

**Corrected, Approach Arithmetic:**

- **A-159 [C] (S1-B):** Its "`ConnectionCell`/`linkValueMenuTarget` through `titleTarget` −6" overlaps S2-A and S2-B, which already delete those lines. S1-B's unique net is about −11, not −17 (A-99).
- **A-160 [C] (S4-C):** Inlining `connectionInsert` saves about −6, not −8, so S4-C nets about −32 (A-111).
- **A-161 [C] (All Four):** The scouts' summed totals (about −296) double-count roughly 40 lines. The de-duplicated estimate is about −256 before the picker-ruling additions (A-113).
