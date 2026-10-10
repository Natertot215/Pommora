## MarkdownPM Links — Implementation Plan

**DATE:** 10-10-2026
**STATUS:** Draft
**SOURCE:** *Links Cleanup — Continuation* and *synthesis.md* in `.claude/Planning/MarkdownPM Links/`, the rulings of 10-09-2026 and 10-10-2026 (*Ruling Log.md*), and the planning checkpoint of 10-10-2026.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `HASH` | {count} | {MM-DD-YYYY h:mm AM/PM} | {MM-DD-YYYY h:mm AM/PM} |

### Context

Pommora reads, draws, follows, edits, pastes, copies, and renames links across a dozen surfaces: the page body, MarkdownPM table cells live and at rest, a Text property's resting value and its TextPane, a Link property's value in a Table, a Card, and the Panel, the `[[` picker, the Paste As menu that main builds, the rename and delete cascades on the host, and the content index. At `42a18f4a5` (the Link Gestures commit plus its docs reconcile) each of those surfaces reads link syntax with its own regex pass or its own policy, so the same question has several answers: a markdown link whose target names a title is a URL to the Link property, a page to Paste As, and a page-if-it-resolves to the editor; "is this link inside code" is decided five ways; the link menu is built four ways and answers through callbacks nobody else uses; an `![[Page]]` that doesn't tile is dead grey text; a Link value draws, opens, and routes through its own path, so it ignores Open Connections In Preview, Tab Open Behavior, and the phantom and ambiguous tones; a resting table cell answers a right-click only on a link and otherwise focuses the cell; and pasting a link onto a link nests one inside the other. The code that does this lives in `Core/Connections/` (the grammars, the index walk, the rename, the Link value codec), `Core/MarkdownPM/Links/` (clicks, menus, edits, paste, titles), `Core/MarkdownPM/Autocomplete/` (the picker), `Core/MarkdownPM/Tables/cellStatic.tsx` (the resting renderer both cells and Text values share), `Core/MarkdownPM/Engine/tokens.ts` and `decorations.ts` (the draw), `Core/Properties/Cells/LinkCell.tsx` and `TextCell.tsx`, `Core/Interface/Menus/connectionMenuActions.ts` and `Core/Actions/connectionMenu.ts` (the menu), `Core/Actions/pasteAsMenu.ts` and `Desktop/Actions/editorMenu.ts` (Paste As), `Core/Session/pageConnections.ts` (the bundle every editor reads), `Core/Nexus/cascade.ts`, `Core/Trash/`, and `Core/Index/indexSeed.ts` (the host readers), and `Desktop/Store/` (the index store).

The investigation behind this plan (twelve scouts, three verifiers, and a proving scout whose diff of the reading foundation measured −119 lines with the gates green) is in `.claude/Planning/MarkdownPM Links/`; its *synthesis.md* holds the code-level account each phase below rests on, section by section, and the Continuation's §5 holds every ruling as it stands. The plan leaves alone how Text values sort and filter, the Footnote Paste As row, footnote-marker menus in cells, the word count's treatment of lone embed lines (M11-08), the Matrix graph's exclusion of lone embed lines, and the deferred audit findings F-093, F-095, and F-097.

### Overview

After this plan, link syntax is read in one place: a single walk in the Connections layer that the editor's drawing, its typing behaviors, the content index, and the rename cascade all share, with one rule for "this link sits in code." "Is this text a page or a web address" is answered by one function, with the page index when a surface has one and by one fixed tiebreak when it doesn't (main has no index, so a title-shaped target that isn't a valid address reads as a page there; a spaceless dotted title such as `v1.2` reads as an address, a case Nathan ruled acceptable). Every link's right-click menu is built by one builder from one model and answers with the row picked, like the app's other menus; one pure function turns the pick into text, and one applier writes it in a live editor. Pasting a link onto a link, picking a page in the picker, and Edit Title or Edit Link on a Link value all change the target under one rule with one carve-out point. A Link property's value draws, follows, glances, and routes the way every other link does, through the renderer resting cells and Text values already share; only an address keeps the property's own look. A resting MarkdownPM table cell gives every construct its menu without being focused, writes land without placing the caret, and the rows that need typing enter the cell. The page index reaches every editor through the host it already carries, and the index holds each page's heading text and level, so the picker, the missing-heading mark, and `§` runs read one source. An `![[Page]]` is a tile only when it stands alone on its own line in a page body; anywhere else it's `!` followed by an ordinary connection.

What a person sees: `[x](Page)` edits like `[[Page]]`; every link reads **Rename** then **Edit Title** (a connection) or **Edit Link** (a weblink), with no "Add Title"; unresolved links look the same whichever syntax wrote them, and **Display Unresolved Links As Plain Syntax** reaches cells and values; a Link value shows `Page § Heading`, the phantom and ambiguous tones, and the glance, opens where connections open, and accepts `[[#Heading]]` and `[x](example.com)`, its Edit Title seed showing the page without its alias as the address seed shows the bare address; a right-click anywhere in a resting table cell opens that construct's menu; `[[` and `[label](` open the picker whether or not Pair Brackets is on; pasting a link onto a link replaces its target; Format ▸ Page Title at rest writes the title once it arrives; `mailto:` goes to the system; and embeds that don't tile act as the connections they are. Two ledgers of this plan's AFTER blocks against the tree, reconciled, put the cleanup at about −280 production lines and the resting cell (Phase 9, ruled additive and shipped in this bundle) at about +160, so the bundle estimates at about −120 (the Continuation's §9 holds the method); the reviews keep tightening every addition that doesn't earn its place, and the measured figure is reported at closeout in those two numbers (*§Delta* in the report).

#### Concepts

**ADDED**

| Concept                                                                                                   | Description                                                                                                                                                     | Location                                                                                |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `LinkOccurrence` • Type, `linkOccurrences` • Function, `LinkSpans` • Type                                 | The one walk over both link syntaxes against a code mask, and the spans (full, title, heading, alias) one connection occupies.                                  | `Core/Connections/connections.ts`                                                       |
| `expressibleInLink` • Function                                                                            | Whether a title or heading can be written inside link syntax; the name rule and the embed tree read it.                                                         | `Core/Connections/connections.ts`                                                       |
| `connectionAt`, `openConnectionAt` • Functions                                                            | The closed connection at an offset, and the unclosed one read as if its `]]` were written.                                                                      | `Core/MarkdownPM/Input/edits.ts`                                                        |
| `TokenBase`, `LinkKind`, `TokenOf<K>` • Types; `wholeLinkToken` • Function                                | The token union with a `wikiLink` arm that always carries `resolveRange`, and the one reader of a text that is exactly one link.                                | `Core/MarkdownPM/Engine/tokens.ts`                                                      |
| `readLinkText` • Function                                                               | The one reader of a whole link's text: page or URL, with its written syntax, resolved by the index when a resolver is given and by the fixed tiebreak when not. | `Core/Connections/linkValue.ts`                                                         |
| `retarget` • Function                                                                                     | The one rule for changing a link's target: syntax kept (a URL into `[[…]]` becomes markdown), shown text per the pasted alias, the kept alias, or the setting.  | `Core/Connections/linkValue.ts`                                                         |
| `markdownPageLink` • Function                                                                             | The one markdown spelling of a page link.                                                                                                                       | `Core/Connections/links.ts`                                                             |
| `isWebAddress` • Function                                                                                 | A URL with a written http(s) scheme that validates; the paste, embed, and guest gates read it.                                                                  | `Core/Paths/urlPath.ts`                                                                 |
| `EditorHost.connections` • Member                                                                         | The page index as every editor piece reads it, live through the host facet.                                                                                     | `Core/MarkdownPM/api.ts`                                                                |
| `inRawHtml` • Function | Whether an offset sits inside a raw-HTML block on a page. | `Core/MarkdownPM/decorations.ts` |
| `PageHeading` • Type                                                                                      | A heading's text and level as the index stores it.                                                                                                              | `Core/Platform/stores.ts`                                                               |
| `PageHeadings` • Type, `headingKeys` • Function | A page's heading keys, texts, and outline as the renderer holds them, and the one derivation of the keys from an outline. | `Core/Connections/pageIndex.ts`                                                         |
| `LinkLook` • Type, `linkLook`, `linkClass` • Functions                                                    | One link's target, status, missing mark, bare flag, and heading join, and the class its tone wears; both renderers read it.                                     | `Core/MarkdownPM/Links/connectionsApi.ts`                                               |
| `md-block-query` • Class                                                                                  | The `/` menu's query look.                                                                                                                                      | `Core/MarkdownPM/markdown-pm.css`                                                       |
| `srcOf` • Function, `RestingHit` • Type, `data-src` / `data-link` / `data-at` / `data-base` • Attributes  | The resting renderer's source spans on every drawn element, the link mark, verbatim offsets, and line bases.                                                    | `Core/MarkdownPM/Tables/cellStatic.tsx`                                                 |
| `cellOffsetAt`, `restingRange`, `commitAtRest`, `restingAction`, `pasteAtRest` • Functions; `onFill` • Prop | The pointer-to-source mapper, the resting right-click's range, the one guarded commit, and the resting menu's reply dispatch.                                   | `Core/MarkdownPM/Tables/cellStatic.tsx`                                                 |
| `valueTarget`, `valueMenuTarget` • Functions | A property value's resolved target through the shared token path, and its link menu target built from its context and row. | `Core/Properties/Cells/valueTarget.ts`                                                  |
| `useLinkTitle` • Hook                                                                                     | Subscribes to an address's title and fetches it once when wanted.                                                                                               | `Core/Web/useLinkTitle.ts`                                                              |
| `writeLinkAt`, `forwardTitles`, `settledLinkText` • Functions | The one writer that announces a pending title and settles it, the forward for an editor closing with one pending, and the text a surface with no editor commits once the title answers. | `Core/MarkdownPM/Links/pendingTitle.ts` |
| `inCodeNear` • Function | Code at the caret or just behind it on the same line; the caret paths and the paste read it. | `Core/MarkdownPM/Engine/docScan.ts` |
| `gonePageEntry` • Function | The entry a Link value holds when it names a page the frozen world lacks; the three restore paths note and park it. | `Core/Properties/propertyValue.ts` |
| `LinkMenuContext`, `LinkEditAction`, `LinkAction` • Types; `isLinkAction`, `FORMAT_ROW`                   | The link menu's one model and its action vocabulary.                                                                                                            | `Core/Actions/connectionMenu.ts`                                                        |
| `LinkMenuTarget` • Type                                                                                   | What a link's menu is built from: the target, editability, and the value's closing rows.                                                                        | `Core/MarkdownPM/Links/connectionsApi.ts`                                               |
| `LinkEdit` • Type, `linkEdit` • Function                                                                  | A menu pick turned into text or a selection, pure.                                                                                                              | `Core/MarkdownPM/Links/linkEdit.ts`                                                     |
| `PasteMode` • Type                                                                                         | A paste's form: a Paste As form, the plain paste, the inverse chord, or literal.                                                                                | `Core/Actions/pasteAsMenu.ts`                                                           |
| `paste`, `pasteFromClipboard`, `pastedCellText` • Functions                                               | The one paste pipeline, its clipboard entry, and the text a paste writes into a cell that holds no editor.                                                      | `Core/MarkdownPM/Links/pasteLink.ts`                                                    |
| `LinkEditContext` • Type, `linkResolver` • Function                                                       | A Link value's commit context: the resolver (the holder answering a bare `[[#Heading]]`) and the setting.                                                       | `Core/Properties/parseEditorValue.ts`, `Core/Properties/Pickers/PropertyValueInput.tsx` |
| `Seat` • Type, `seatSelection` • Function                                                                 | How a table cell is entered: a point, a sweep edge, or a range.                                                                                                 | `Core/MarkdownPM/Tables/CellEditor.tsx`                                                 |
| `RESTING_EDITS` • Constant, `editorMenuRequest.resting` • Field                                           | The edit rows a resting cell answers itself, and the request field that carries its source selection to main.                                                   | `Core/Actions/editorMenu.ts`                                                            |
| `restingEditItems` • Function                                                                             | Main's Cut, Copy, and Paste rows for a resting request.                                                                                                         | `Desktop/Actions/editorMenu.ts`                                                         |
| `insertLinkEdit` • Function                                                                               | Insert Link as a pure edit inside `editFor`.                                                                                                                    | `Core/MarkdownPM/Input/format.ts`                                                       |
| `AutocompleteQuery.closed` • Field, `closerOf` • Function                                                 | Whether a picker query's link is closed, and the closer a commit writes when it isn't.                                                                          | `Core/MarkdownPM/Autocomplete/autocomplete.ts`                                          |
| `acQuery` • StateField, `AcField` • Type, `closeAcQuery` • Effect                                         | The picker's query, its `§` arm, and its dismissal, held in editor state.                                                                                       | `Core/MarkdownPM/Autocomplete/acQuery.ts`                                               |
| `behind` • State                                                                                          | The rows the pane slid away from, or null.                                                                                                                      | `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts`                             |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `embedClaims.ts` • File, `embeddable` • Function | The second embed-claim owner and the picker's pool filter. | `Core/MarkdownPM/Engine/embedClaims.ts`, `Core/MarkdownPM/Embeds/embedWidget.tsx` |
| `pageEmbedPattern`, `linkAt`, `aliasSpanAt`, `emptyAliasPipeAt`, `emptyHeadingHashAt`, `expressibleHeading`, `embeddableTitle` | The regex readers and the two expressibility checks the walk and `expressibleInLink` replace. | `Core/Connections/connections.ts` |
| `linkInCode`, `isInsideWikilink` | Two caret readers the code mask and `openConnectionAt` replace. | `Core/MarkdownPM/Input/edits.ts` |
| `readLink`, `parseLink`, `linkAlias`, `urlClickTarget`, `LinkValue`, `ConnectionParts` | The value readers and types `readLinkText` and `LinkTarget` absorb. | `Core/Connections/linkValue.ts`, `Core/Connections/connections.ts` |
| `PasteAsTarget`, `wholeWikiLink`, `pasteAsTarget` | Paste As's own clipboard reader. | `Core/Actions/pasteAsMenu.ts` |
| `namesGonePage` | The boolean the three restore paths read before re-reading the value for its note. | `Core/Properties/propertyValue.ts` |
| `pasteDecision.ts` • File; `linkFor`, `literalAt`, `writeLink`, `pasteAs` | The second paste decision and the writers the pipeline replaces. | `Core/MarkdownPM/Links/` |
| The connections getter (22 signatures), `embedHost.getConn`, `tableConnections` • Facet, `ConnGetter`, the `connections` prop on `MarkdownEditor`, `CellEditor`, `MarkdownTable`, `StaticCell` | Connections threaded by hand. | `Core/MarkdownPM/` |
| `openPage`, `ConnectionsApi.bypass` | The second and third page-open routes. | `Core/MarkdownPM/Links/connectionsApi.ts`, `Core/Session/pageConnections.ts` |
| `WikiLinkView`, `wikiLinkView`, `mdLinkClass`, `MD_LINK_CLASS` | The two look rules. | `Core/MarkdownPM/Links/connectionsApi.ts`, `Core/MarkdownPM/decorations.ts` |
| `md-link-invalid`, `md-unresolved-syntax`, `md-unresolved-fixed` • Classes | The second unresolved treatment and the class that kept the plain-syntax setting out of resting cells. | `Core/MarkdownPM/markdown-pm.css` |
| `LINK_SELECTOR`, `linkSpanAt`, `data-link-span`, `menuTarget`, `still` | The resting renderer's own hit test and menu. | `Core/MarkdownPM/Tables/cellStatic.tsx` |
| `sweepOnTitles` • Plugin, `linkTitles.subscribe` • Member | The subscription sweep the promise replaces. | `Core/MarkdownPM/Links/pendingTitle.ts`, `Core/MarkdownPM/api.ts` |
| `ConnMenuContext`, `ConnSurface`, `ConnCellApply`, `CONN_URL_ACTIONS`, `ConnUrlAction`, `isConnUrlAction`, `isConnCellAction`, `closingRows` | The callback-shaped menu model. | `Core/Actions/connectionMenu.ts` |
| `LinkCellAction`, `linkValueMenuTarget`, `ConnMenuTarget`, `tokenMenuTarget` | The value's and the token's own menu builders. | `Core/Interface/Menus/connectionMenuActions.ts`, `Core/MarkdownPM/Links/connectionsApi.ts` |
| `linkFormat.ts` • File; `wikiAuthorTarget`, `applyUrlLinkAction`, `linkActionText`, `LinkActionText`, `formatted` | The split appliers `linkEdit` replaces. | `Core/MarkdownPM/Links/` |
| `ConnectionCell` • Component, `.cell-connection` • Class, the `open` click intent and its three handlers | A Link value's own render and open path. | `Core/Properties/Cells/LinkCell.tsx`, `Core/Properties/Pickers/valueClick.ts` |
| `linkResolve.ts` • File, `resolveConnection`, `parsePastedLink`, `ResolveTitle` | The tree-reading resolver whose null blanked ambiguity, and the string resolver and reader it fed until Task 8-3 rewrites the commit. | `Core/Properties/Cells/linkResolve.ts`, `Core/Nexus/treeIndex.ts`, `Core/Connections/linkValue.ts` |
| `caretCoords`, `initialSelect`, `sweepFrom` • Refs; `onSelect` • Prop | Three ways to enter a cell. | `Core/MarkdownPM/Tables/` |
| `insertLinkOverSelection` | Insert Link dispatched on the view. | `Core/MarkdownPM/Menus/menu.ts` |
| `'embed'` form, `allowEmbeds`, `formSyntax`, `connectionInsert`, `AcQuery`, `sectionArmAfter`, `viaChevron`, `cameFrom`, `fetched`, `loading`, `NONE` | The picker's embed loop, hand spellings, React-held state, and optional-prop defaults. | `Core/MarkdownPM/Autocomplete/` |
| `headingTarget.ts` • File; `EditorHost.warmBody`, `EditorHost.fetchBody` | The second heading source. | `Core/MarkdownPM/Autocomplete/headingTarget.ts`, `Core/MarkdownPM/api.ts` |

#### Constraints

- **Gates:** `npm run typecheck` (the only type gate), `npm run test` (vitest; the **BASELINE** count is the floor, with the files this plan deletes accounted for), and `npm run lint` (`biome check .`, clean), all from the repo root. In a worktree, lint is `npx biome check Core UIX Desktop Sync`. Biome formats every TS/CSS/JSON write, so an Edit that fails on whitespace means it reformatted: re-read and retry. "Run the gates" means these three.
- **Frozen:** The persisted keys `link_display` and every settings key (`frames.ts`); the `'wikiLink'` token kind's name; `Relation.qualifier`'s name and width; the channel set in `Core/Contract/bridge.ts` (fields may widen, no channel is added or removed); `pendingTitles`' exact-text match; the 255 and 2048 caps in the link grammars; `pageIndex.ts`'s lazy alphabetical sort; `linkEntry`'s YAML unwrap; the `input.paste` tag on every paste write; a written scheme before a pasted bare address formats or retargets (`isWebAddress`); one tile per page per document, first-per-page; `resolveFollow`'s own `heldTarget`; `EditorHost.openLink`; the explicit browser picks (`link:window`, `link:browser`, the browser window's title button) calling their arm directly; `drawnLast`; the two tokenizer memos (`drawnLast(tokenizeChunk)` for CodeMirror, `perText(tokenize)` for React).
- **Hard Rules:** Core reaches the machine only through `Core/Platform`; the host-run half of Core imports no React (`engineGraph.test.ts`, `hostGraph.test.ts`); `Core/Connections` imports `MarkdownPM/Engine` and never `MarkdownPM/Links`; finite states are unions + switch; no O(N), allocating, or layout-reading work on a keystroke, caret move, or pointer move; read-write separation.
- **Conventions:** Nathan's principles bind every task: net simplification is the bar (nothing relocated, no indirection added, nothing passed forward); never a half-fix (a finding is resolved at its cause or left in *§Open Items*); readable over clever; source over patch (one definition per rule, placed with the code that reads it; a second copy of a mechanism is a defect while both copies work); follow the new input (when a function starts reading something new, check whatever decides when it runs); removal earns its place (defensive fallbacks, props only tests need, flags for states production never produces, and channels that restate another channel go, with what produces the guarded state established first); honest behavior descriptions. Anything in the plan's surface reads as always intended, with no odd-ones-out and nothing hand-rolled beside an existing mechanism. No code comments beyond a file-level boundary or a load-bearing reason the code can't show. Vocabulary: a **connection** is any link to a page or heading in either syntax; **weblink** is the code's word for a link to a URL (the docs say "link"); `'url'` is the kind tag in code; a **MarkdownPM table cell** is a table inside a page body and a **property value cell** is a Link or Text value in a Table, a Card, or the Panel, never conflated. User-facing copy this plan writes: **Rename**, **Edit Title**, **Edit Link**, **Remove Link**, **Delete**, **Clear**, **Remove**, **Preview**, **Open In Browser**, **Copy Link**, **Copy Path**, **Format**, **Full Link**, **Short Link**, **Page Title**, **Plain Text**, **Embedded Link**, **Embedded Page**, **Connection**, **Markdown Link**, **Internal Page**, **External Link**. Out of scope everywhere: how Text values sort and filter; the Footnote Paste As row; footnote-marker menus in cells; the column's Format ▸ on a Link cell's right-click; M11-08; F-093, F-095, F-097.
- **Shape:** This work is a removal, a refactor, and a fix at once. **Removal:** *§Concepts* REMOVED is the inventory, and the never-delete list is the Frozen bullet above. **Refactor:** the **BASELINE** tests are the behavior the reading foundation can't move except where a task names the test it rewrites and why; every rewritten test pins the new behavior at a named input. **Fix:** every task that changes a behavior sweeps the siblings that consumed the old one (the synthesis's *Would Go False* lists are the sweep's seed) and lists them under its VERIFY.
- **Order:** The foundation lands first; the connections bundle's shape and the promise-returning title fetch land before the menus and the resting cell read them; the answering menu lands before the one builder; the builder and `retarget` land before Link values; the paste pipeline lands before the resting cell's paste rows; the opener rule lands in the phase that deletes the `![[` loop; the four host readers move in one task.

#### Process Overview

- [ ] **Phase 1** — Reading Foundation
  - [ ] Task 1-1 — Apply the proven foundation
  - [ ] Task 1-2 — The token type's `wikiLink` arm
  - [ ] Task 1-3 — The Format menu reads the fence
  - [ ] Task 1-4 — The unclosed reader
  - [ ] Review Checkpoint
- [ ] **Phase 2** — Values, Writers, and the Clipboard Reader
  - [ ] Task 2-1 — One reader for a whole link
  - [ ] Task 2-2 — The host readers move together
  - [ ] Task 2-3 — One writer per syntax and one expressibility rule
  - [ ] Task 2-4 — `retarget`
  - [ ] Task 2-5 — `isWebAddress`
  - [ ] Review Checkpoint
- [ ] **Phase 3** — Seams
  - [ ] Task 3-1 — Connections ride the editor host (F-094)
  - [ ] Task 3-2 — The heading index carries text and level
  - [ ] Task 3-3 — The connections bundle settles its shape
  - [ ] Task 3-4 — Title fetches answer with a promise
  - [ ] Review Checkpoint
- [ ] **Phase 4** — Looks and Resolution
  - [ ] Task 4-1 — One look rule and one unresolved treatment
  - [ ] Task 4-2 — Plain syntax everywhere, and the slash menu's own look
  - [ ] Task 4-3 — The resting renderer nests, draws every span, and draws `§` runs
  - [ ] Task 4-4 — A Text value draws against its page and follows a `§` run
  - [ ] Task 4-5 — The value's resolved target and one hit shape
  - [ ] Review Checkpoint
- [ ] **Phase 5** — Opening and Titles
  - [ ] Task 5-1 — Addresses that open and titles that fetch
  - [ ] Task 5-2 — One title hook
  - [ ] Task 5-3 — Pending titles settle through the promise
  - [ ] Review Checkpoint
- [ ] **Phase 6** — Menus and Actions
  - [ ] Task 6-1 — The link menu answers
  - [ ] Task 6-2 — One builder and one target type
  - [ ] Task 6-3 — One pure edit and one live applier
  - [ ] Task 6-4 — The resting cell's seat and guarded commit
  - [ ] Task 6-5 — The body, the resting cell's link door, and the Text value read the builder
  - [ ] Task 6-6 — The three value parents read the builder
  - [ ] Review Checkpoint
- [ ] **Phase 7** — Paste
  - [ ] Task 7-1 — One pipeline
  - [ ] Task 7-2 — Paste inside a link retargets
  - [ ] Task 7-3 — Rectangle paste and dropped addresses
  - [ ] Review Checkpoint
- [ ] **Phase 8** — Link Values
  - [ ] Task 8-1 — A Link value renders through the shared stack
  - [ ] Task 8-2 — Clicks
  - [ ] Task 8-3 — The commit
  - [ ] Task 8-4 — Panel Remove, the popover's alias, and the fallback menu
  - [ ] Review Checkpoint
- [ ] **Phase 9** — MarkdownPM Table Cells at Rest
  - [ ] Task 9-1 — Every construct answers at rest
  - [ ] Task 9-2 — Commit at rest
  - [ ] Task 9-3 — System rows at rest
  - [ ] Review Checkpoint
- [ ] **Phase 10** — The Picker
  - [ ] Task 10-1 — The opener rule, and the embed form's end
  - [ ] Task 10-2 — The query as editor state
  - [ ] Task 10-3 — Commit through `retarget`, one `behind`, the setting on the markdown arms
  - [ ] Task 10-4 — Heading rows from the index
  - [ ] Review Checkpoint
- [ ] **Phase 11** — Names and Documentation
  - [ ] Task 11-1 — Names
  - [ ] Task 11-2 — Feature documentation and guidelines

---

### Phase 1 — Reading Foundation

**GOAL:** Link syntax gets one reader. The proving scout's diff lands as built: one walk over both syntaxes with one code rule, a caret reader over the caret's line, a tokenizer that maps the walk to tokens, embeds read as `!` plus a connection with the tile claim owned by `buildTiles`, and renames as span edits that Link keys ride. On top of it, the token type says what a `wikiLink` carries, the Format menu stops reading a fenced line as prose, and an unclosed `[[` gets the same reader a closed one has. Everything after this phase reads these pieces, so it lands first and alone.

#### Task 1-1 — Apply the proven foundation

**TASK:** Apply `.claude/Planning/MarkdownPM Links/proving/foundation.diff` (37 files, measured −114 TS and −5 CSS, gates green at `42a18f4a5`) as the phase's first commit, then settle the two places the prototype left as it found them.

**NOW:** `pageLinkPattern`, `pageEmbedPattern`, and `markdownLinkRegex` are each run by their own readers: `linkSpans`/`linkAt` and three slot wrappers in `connections.ts`; `wikiLinkTokens` and two `RegexSpec`s in `tokens.ts`; three chained `String.replace` passes in `rewrite.ts`; three loops in `scan.ts`'s `linksIn`. The tokenizer's code rule (start in code, or overlap with a closed inline code span) and `linkInCode`'s (any inline span, unclosed runs included) disagree. `claimedEmbeds` runs on every caret move in `build`, and again in `buildTiles`. `rewriteFrontmatterConnections` rewrites Link values through `connectionText` while bodies re-emit aliases verbatim.

**CHANGE**

- [ ] `git apply --3way ".claude/Planning/MarkdownPM Links/proving/foundation.diff"` from the repo root; the production code at HEAD is identical to the diff's base, so it applies clean. Run the gates; the expected test movement is the prototype report's §3 (46 red on the pre-rewrite tests, all rewritten in the diff).
- [ ] The diff leaves `rememberAlias` (`Links/linkEdit.ts`) reading `api.resolve(...)` raw and keeping `status === 'resolved' && res.page`; leave it, since Task 3-3 makes `titleTarget` the one adapter and rewrites this line then.
- [ ] The diff keeps `pageEmbedText` (Paste As ▸ Embedded Page writes it) and the picker's `![[` loop, which goes in Phase 10.
- [ ] Record in the commit message that the diff is the proving scout's, applied as proven.

**AFTER**

The diff is the AFTER. Its shape, for the executor and the reviewers:

```Core/Connections/connections.ts diff
@@ exports @@
+ export interface LinkSpans { full: Span; title: Span; heading: Span | null; alias: Span | null }
+ export type LinkOccurrence =
+   | ({ syntax: 'wiki' } & LinkSpans)
+   | { syntax: 'markdown'; full: Span; label: Span; destination: Span }
+ export function linkOccurrences(text: string, inCode: CodeMask): LinkOccurrence[]
~ function linkSpans(m): LinkSpans | null            (private)
~ const titleOf = (rawTitle)                          (private; parseConnectionText reads it)
+ function codeTouches(text, inCode, span): boolean   (private: start in code, or a closed inline span, backticks included, overlaps)
- export const pageEmbedPattern
- export function linkAt / aliasSpanAt / emptyAliasPipeAt / emptyHeadingHashAt
~ pageLinkPattern loses `(?<!!)`
```

```Core/MarkdownPM/Input/edits.ts diff
@@ connectionAt @@
- export function linkInCode(scan, at): boolean
+ export function connectionAt(scan: DocScan, at: number): LinkSpans | null
+   // gated on line.includes('[['); linkOccurrences over the caret's line with (p) => inCodeAt(scan, lineStart + p); spans relative to the line
~ export function inAliasAt(scan, at) reads connectionAt
```

```Core/Connections/scan.ts diff
@@ LinkHit @@
  export interface LinkHit {
    syntax: LinkSyntax; target: string; qualifier: string; at: number
+   title: Span
+   heading: Span | null
+   alias: Span | null
  }
+ const names = (target, written, qualifier) => (written === '' ? qualifier !== '' : target !== '')
+ const loneEmbed = (body, at) => body[at - 1] === '!' && lineStartAt(body, at) === at - 1 && loneEmbedTitle(...) !== null
~ linksIn yields from linkOccurrences; 'embed' only for a lone line behind `!`, `at` on the `[[`
~ sectionRunsIn excludes links through linkOccurrences(text, inCode)
```

```Core/Connections/rewrite.ts diff
~ rewriteConnections: one linksIn walk filtered by target, applyEdits over title spans (encoded for markdown), the alias dropped when empty or repeating the new target
~ rewriteHeadingConnections: one linksIn walk with [...outline, oldHeading], editing heading spans
- groupsOf, offsetOf, escapedPipe, rewriteFrontmatterConnections, the chained passes and rebuilt masks
```

```Core/MarkdownPM/Engine/tokens.ts diff
- 'embed' kind, pageEmbedPattern spec, wikiLinkTokens, markdown RegexSpec
+ function linkToken(o: LinkOccurrence): Token    // maps the walk; a wikiLink always sets resolveRange to the title span
~ tokenizeChunk: const links = linkOccurrences(text, inCode).map(linkToken)
```

```Core/MarkdownPM/Embeds/embedWidget.tsx diff
~ buildTiles: a line tiles when embeddableTitle(e.title), it resolves, its page isn't already shown, and isn't an ancestor; one resolve, keyed by path
- EmbedTileWidget's title and cyclic; the .mdpm-embed-cycle stub
+ export function embeddable(title, exclude)      (moved from embedClaims.ts)
```

```Core/MarkdownPM/decorations.ts diff
- build's claimedEmbeds filter (the per-caret-move claim)
```

```Core/Nexus/cascade.ts · Core/Trash/spend.ts diff
~ patchOf sends Link-typed keys through the same rewrite as Text-typed keys
~ spend.ts maps stored values through rewriteConnections(value, was, landed) behind landed === was
```

Deleted whole: `Core/MarkdownPM/Engine/embedClaims.ts` and its test. Also: `targetNamesTitle` (`links.ts`), `headingHash.ts`'s `titleSpanAt` (reads `connectionAt`, falls back to `openedTitle`), `linkReveal.ts`'s `linkTyping` reads `connectionAt(docScan.after(tr), head)`.

**VERIFY**

- [ ] `git apply --check` reports no conflict before applying.
- [ ] Run the gates. Typecheck clean; tests at the prototype's count (one file fewer than **BASELINE**, `embedClaims.test.ts`); lint clean.
- [ ] Probe (`npx vite-node`): `linkOccurrences('x `[[A`]] y', codeMask(...))` → `[]`; `linkOccurrences('[x]([[T]])')` → one `wiki`; `linksIn('[[A#Note\\]]')` → qualifier `note\`; `rewriteConnections('[[Old|New]] [[Old#H|new#h]]', 'Old', 'New')` → `[[New]] [[New#H]]`; `tokenize('![[pic]]')` → one `wikiLink` at `[1, 8]`.
- [ ] Open `~/Test` and drive: a page with `![[Alpha]]` alone and `see ![[Alpha]] here` draws one tile and one inline connection; a `[[` typed inside a fenced block opens nothing and Enter inside a fenced `[[A|b]]` inserts a newline.
- [ ] **Live Check (E-11):** with a selection spanning the page tile (drag or Select All), no `md-connection-glyph` draws inside the tile.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-2 — The token type's `wikiLink` arm

**TASK:** `Token` becomes a union whose `wikiLink` arm carries its `resolveRange` as required and its heading span as `heading`; the four `tk.resolveRange!` assertions and every `fragment` go; `linkTokenAt` and `drawnLinkAt` return the arm they're asked for.

**NOW:** `Token` is one interface with `resolveRange?` and `fragment?` optional on every kind (`tokens.ts:31-41`). The prototype sets `resolveRange` on every `wikiLink` and reads it as `tk.resolveRange!` at `decorations.ts`, `cellStatic.tsx`, `connectionsApi.ts`, and `linkEdit.ts`. `headingOf` and `shiftToken` read `fragment`; `decorations.ts` reads `tk.fragment` at the heading join and the revealed pipe; `cellStatic.tsx` at the heading join.

**CHANGE**

- [ ] Write the test: `tokenize('[[Page#H|a]]')[0]` has `kind: 'wikiLink'`, `resolveRange: [2, 6]`, `heading: [7, 8]`; `tokenize('[x](u)')[0]` has no `resolveRange` key. Watch it fail on the key name.
- [ ] Split `Token` as below; `linkToken` writes `heading`; `headingOf`, `shiftToken`, `aliasedToken` narrow on `kind`.
- [ ] `linkTokenAt` and `drawnLinkAt` take `kind?: K` and return `Extract<Token, { kind: K }> | undefined`; the four `!` sites become plain reads under the `'wikiLink'` narrowing they already have.
- [ ] Rename every `fragment` read to `heading` (`decorations.ts`, `cellStatic.tsx`, `tokens.test.ts`, `textScope.test.tsx` if it reads the field).

**AFTER**

```Core/MarkdownPM/Engine/tokens.ts diff
@@ Token @@
- export interface Token {
-   kind: TokenKind
-   range: [number, number]
-   contentRange: [number, number]
-   resolveRange?: [number, number]
-   fragment?: [number, number]
-   markerRanges: [number, number][]
-   color?: HighlightColor
-   inHtml?: true
- }
+ interface TokenBase {
+   range: Span
+   contentRange: Span
+   markerRanges: Span[]
+   color?: HighlightColor
+   /** Inside an HTML block, where HTML Formatting draws the source raw. */
+   inHtml?: true
+ }
+
+ export type LinkKind = 'link' | 'wikiLink'
+
+ /** A connection resolves by its title span, which starts the shown text unless an alias replaces it; `heading` is set only when one is written. */
+ export type Token =
+   | (TokenBase & { kind: 'wikiLink'; resolveRange: Span; heading?: Span })
+   | (TokenBase & { kind: Exclude<TokenKind, 'wikiLink'> })
+
+ export type TokenOf<K extends TokenKind> = Extract<Token, { kind: K }>

@@ aliasedToken @@
- export const aliasedToken = (tk: Token): boolean =>
-   tk.resolveRange !== undefined && tk.contentRange[0] !== tk.resolveRange[0]
+ export const aliasedToken = (tk: Token): boolean =>
+   tk.kind === 'wikiLink' && tk.contentRange[0] !== tk.resolveRange[0]

@@ headingOf @@
- export const headingOf = (text: string, tk: Token): string | undefined =>
-   tk.fragment && text.slice(tk.fragment[0], tk.fragment[1])
+ export const headingOf = (text: string, tk: TokenOf<'wikiLink'>): string | undefined =>
+   tk.heading && text.slice(tk.heading[0], tk.heading[1])

@@ shiftToken @@
  export function shiftToken(tk: Token, by: number): Token {
    const move = ([s, e]: Span): Span => [s + by, e + by]
-   return {
-     kind: tk.kind,
-     range: move(tk.range),
-     contentRange: move(tk.contentRange),
-     ...(tk.resolveRange ? { resolveRange: move(tk.resolveRange) } : {}),
-     ...(tk.fragment ? { fragment: move(tk.fragment) } : {}),
-     markerRanges: tk.markerRanges.map(move),
-     ...(tk.color ? { color: tk.color } : {}),
-     ...(tk.inHtml ? { inHtml: true } : {}),
-   }
+   const base = {
+     range: move(tk.range),
+     contentRange: move(tk.contentRange),
+     markerRanges: tk.markerRanges.map(move),
+     ...(tk.color ? { color: tk.color } : {}),
+     ...(tk.inHtml ? { inHtml: true } : {}),
+   }
+   if (tk.kind !== 'wikiLink') return { ...base, kind: tk.kind }
+   return {
+     ...base,
+     kind: 'wikiLink',
+     resolveRange: move(tk.resolveRange),
+     ...(tk.heading ? { heading: move(tk.heading) } : {}),
+   }
  }

@@ linkToken @@
    const alias = o.alias && o.alias[1] > o.alias[0] ? o.alias : null
-   const fragment = o.heading && o.heading[1] > o.heading[0] ? o.heading : null
-   const shown = alias ?? [o.title[0], fragment ? fragment[1] : o.title[1]]
+   const heading = o.heading && o.heading[1] > o.heading[0] ? o.heading : null
+   const shown = alias ?? [o.title[0], heading ? heading[1] : o.title[1]]
    return {
      kind: 'wikiLink',
      range: o.full,
      contentRange: shown,
      resolveRange: o.title,
-     ...(fragment ? { fragment } : {}),
+     ...(heading ? { heading } : {}),

@@ linkTokenAt @@
- export function linkTokenAt(tokens: readonly Token[], offset: number, kind?: 'link' | 'wikiLink'): Token | undefined {
-   return tokens.filter((t) => (kind ? t.kind === kind : t.kind === 'link' || t.kind === 'wikiLink') && offset >= t.range[0] && offset <= t.range[1]).at(-1)
+ export function linkTokenAt<K extends LinkKind = LinkKind>(
+   tokens: readonly Token[],
+   offset: number,
+   kind?: K,
+ ): TokenOf<K> | undefined {
+   return tokens
+     .filter(
+       (t): t is TokenOf<K> =>
+         (kind ? t.kind === kind : t.kind === 'link' || t.kind === 'wikiLink') &&
+         offset >= t.range[0] &&
+         offset <= t.range[1],
+     )
+     .at(-1)
  }
```

```Core/MarkdownPM/decorations.ts diff
@@ drawnLinkAt @@
- export const drawnLinkAt = (view: EditorView, pos: number, kind?: 'link' | 'wikiLink'): Token | undefined =>
-   linkTokenAt(drawnTokens.get(view) ?? [], pos, kind)
+ export const drawnLinkAt = <K extends LinkKind = LinkKind>(
+   view: EditorView,
+   pos: number,
+   kind?: K,
+ ): TokenOf<K> | undefined => linkTokenAt(drawnTokens.get(view) ?? [], pos, kind)

@@ build · the wikiLink loop @@
-     const [rs, re] = tk.resolveRange!
+     const [rs, re] = tk.resolveRange
-       ? [rs, tk.fragment?.[1] ?? re]
+       ? [rs, tk.heading?.[1] ?? re]
-     if (tk.fragment && !open && !alias && status === 'resolved') {
-       const [hs, he] = tk.fragment
+     if (tk.heading && !open && !alias && status === 'resolved') {
+       const [hs, he] = tk.heading
```

```Core/MarkdownPM/Tables/cellStatic.tsx · Core/MarkdownPM/Links/connectionsApi.ts · Core/MarkdownPM/Links/linkEdit.ts diff
-     const [rs, re] = tk.resolveRange!
+     const [rs, re] = tk.resolveRange
-       const frag = view.status === 'resolved' && !alias ? tk.fragment : undefined
+       const frag = view.status === 'resolved' && !alias ? tk.heading : undefined
```

**VERIFY**

- [ ] `grep -rn "resolveRange!\|\.fragment\b" Core --include='*.ts' --include='*.tsx'` returns only `links.ts`'s `DestinationSpans.fragment` and `targetFragment`, which are the markdown destination's own.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-3 — The Format menu reads the fence

**TASK:** `readFormatState` and `toggleInline` take the document scan and stand down on a fenced line, so the Format menu stops reporting Connection or Link inside a code block and its toggle stops unwrapping there.

**NOW:** Both tokenize the caret's line alone (`formatState.ts:16`, `format.ts:86,123`) with no fence context, so a `[[A]]` line inside a fence reports `connection: true` and `toggleInline(..., 'connection')` unwraps it to `A` (B-35, probed). `editFor` in `Menus/menu.ts` is their only production caller and holds the document as a string; `applyEditorAction` holds the view.

**CHANGE**

- [ ] Write the tests: `readFormatState(scanDoc('```\n[[A]]\n```'), 4, 4).connection` is `false`; `toggleInline(scanDoc('```\n**b**\n```'), 6, 6, 'bold')` is `null`; `readFormatState(scanDoc('x `[[A]]` y'), 4, 4).connection` is `false` (inline code, unchanged). Watch the first two fail.
- [ ] `readFormatState(scan, from, to)`: the line's tokens are `[]` when `inFenceAt(scan, from)`.
- [ ] `toggleInline(scan, …): FormatEdit | null` returns `null` when `inFenceAt(scan, from)`; `toggleWrap` takes the scan's text as it did the string.
- [ ] `editFor(action, scan, from, to)` moves to `Input/format.ts`, the pure home of every edit it dispatches, and is exported from there; `applyEditorAction` and `editorMenu` pass `docScan(view.state.doc)`; `setHeading`, `setList`, `setBlock` keep taking `scan.text`.

**AFTER**

```Core/MarkdownPM/Input/formatState.ts diff
@@ readFormatState @@
- export function readFormatState(doc: string, from: number, to: number)
+ export function readFormatState(scan: DocScan, from: number, to: number)
+   const doc = scan.text
    const ls = lineStartAt(doc, from)
    const le = lineEndAt(doc, from)
    const line = doc.slice(ls, le)
-   const tokens = tokenize(line)
+   const tokens = inFenceAt(scan, from) ? [] : tokenize(line)
```

```Core/MarkdownPM/Input/format.ts diff
@@ toggleInline @@
  export function toggleInline(
-   doc: string,
+   scan: DocScan,
    selFrom: number,
    selTo: number,
    fmt: InlineFormat,
    color: HighlightColor | null = null,
- ): FormatEdit {
+ ): FormatEdit | null {
+   if (inFenceAt(scan, selFrom)) return null
+   const doc = scan.text
    const [from, to] = trimmedRange(doc, selFrom, selTo)
```

```Core/MarkdownPM/Input/format.ts diff
@@ editFor (moved from Menus/menu.ts) @@
+ /** The pure edit a menu, pane, or chord action asks for over a selection, or null for an action that needs the view. */
+ export function editFor(action: string, scan: DocScan, from: number, to: number): FormatEdit | null {
+   const [group, value] = action.split(':')
+   switch (group) {
+     case 'format':
+       return toggleInline(scan, from, to, value as InlineFormat)
+     case 'highlight':
+       return toggleInline(scan, from, to, 'highlight', value as HighlightColor)
+     case 'heading':
+       return setHeading(scan.text, from, to, Number(value) as HeadingLevel)
+     case 'list':
+       return setList(scan.text, from, to, value as ListKind)
+     case 'block':
+       return setBlock(scan.text, from, to, value as BlockFormat)
+     default:
+       return null
+   }
+ }
```

```Core/MarkdownPM/Menus/menu.ts diff
- function editFor(action: string, doc: string, from: number, to: number): FormatEdit | null { … }

@@ applyEditorAction @@
-   if (!applyEdit(view, editFor(action, docString(view.state.doc), sel.from, sel.to))) return false
+   if (!applyEdit(view, editFor(action, docScan(view.state.doc), sel.from, sel.to))) return false

@@ editorMenu · contextmenu @@
-         ...readFormatState(docString(view.state.doc), from, to),
+         ...readFormatState(docScan(view.state.doc), from, to),
```

`editFor` lives with the edits it dispatches because Phase 9's resting cell is its second caller, and a resting cell shouldn't import the CodeMirror menu module for a pure function.

**VERIFY**

- [ ] `Core/MarkdownPM/Input/formatState.test.ts` and `format.test.ts` pass with the scan argument; `Menus/editorMenu.test.tsx` passes.
- [ ] Run the gates.
- [ ] In `~/Test`, right-click inside a fenced `[[Alpha]]`: Format ▸ shows Connection unchecked, and choosing it leaves the fence as written.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-4 — The unclosed reader

**TASK:** `openConnectionAt(scan, at)` reads an unclosed `[[` as the connection it would be once closed, by running the one grammar over the line up to the caret plus `]]`, with the empty opener a `[[` just typed; `isInsideWikilink` goes, and `headingHash` and `isLiteralAt` read it.

**NOW:** Three partial unclosed readers, none sharing the grammar: `isInsideWikilink` counts `[[` depth (`edits.ts:612-627`, one caller at `:642`); `headingHash`'s `openedTitle` recognizes `[[` before a `|` or `]]`; the picker's `![[` loop reads to the line's end (`autocomplete.ts:119-134`, Phase 10's). Probed at `42a18f4a5`: the closed grammar over `line.slice(0, rel) + ']]'` reads `[[Page#He` as title `Page`, heading `He`; `[[Page|al` as alias `al`; `[[A]] [[B` as `B` from 6; `[[A]]` at 3 as the closed link; and `[[` alone as nothing (the grammar refuses an empty page).

**CHANGE**

- [ ] Write the tests in `edits.test.ts` (replacing the `describe('isInsideWikilink')` block): `openConnectionAt(scanDoc('see [[Pro'), 9)` → `{ full: [4, 9], title: [6, 9], heading: null, alias: null }`; `openConnectionAt(scanDoc('[[Page#He'), 9)?.heading` → `[7, 9]`; `openConnectionAt(scanDoc('x [['), 4)` → `{ full: [2, 4], title: [4, 4], … }`; `openConnectionAt(scanDoc('[[A]] b'), 6)` → `null`; `openConnectionAt(scanDoc('```\n[[A\n```'), 7)` → `null` (a closed fence; an unclosed one isn't code to the scan). Watch them fail.
- [ ] Add `openConnectionAt` beside `connectionAt`; delete `isInsideWikilink`; `isLiteralAt` reads `(connectionAt(scan, c) ?? openConnectionAt(scan, c)) !== null`.
- [ ] `headingHash` reads `connectionAt(scan, selStart)?.title ?? openConnectionAt(scan, selStart)?.title`; `openedTitle` goes.

**AFTER**

```Core/MarkdownPM/Input/edits.ts diff
@@ openConnectionAt @@
+ /** The connection an unclosed `[[` before `at` would be once closed: the grammar over the line up to the caret plus `]]`, or the empty title an opener just typed. Spans are relative to the line, as `connectionAt`'s are, and end at the caret, never on the closer that isn't written. */
+ export function openConnectionAt(scan: DocScan, at: number): LinkSpans | null {
+   const i = lineIndexAt(scan, at)
+   const ls = scan.lineStarts[i]
+   const head = scan.lines[i].slice(0, at - ls)
+   if (!head.includes('[[')) return null
+   if (head.endsWith('[[')) {
+     const rel = head.length
+     return { full: [rel - 2, rel], title: [rel, rel], heading: null, alias: null }
+   }
+   const closed = `${head}]]`
+   for (const o of linkOccurrences(closed, (p) => inCodeAt(scan, ls + p)))
+     if (o.syntax === 'wiki' && o.full[1] === closed.length) return { ...o, full: [o.full[0], head.length] }
+   return null
+ }

@@ isInsideWikilink @@
- // Line-scoped so an unclosed `[[` never bleeds across lines.
- export function isInsideWikilink(offset: number, text: string): boolean { … }

@@ isLiteralAt @@
  const isLiteralAt = (scan: DocScan, c: number): boolean =>
-   inCodeAt(scan, c) ||
+   inCodeNear(scan, c) ||
    spanAt(scan.maths, c) !== undefined ||
-   inCodeAt(scan, c - 1) ||
-   isInsideWikilink(c, scan.text) ||
+   (connectionAt(scan, c) ?? openConnectionAt(scan, c)) !== null ||
    inUrlRun(scan.text, c)
```

```Core/MarkdownPM/Engine/docScan.ts diff
@@ inCodeAt @@
+ /** Code at the caret or just behind it on the same line, which is where a typed character lands against a closing backtick; the caret paths and the paste read it. */
+ export const inCodeNear = (scan: DocScan, pos: number): boolean =>
+   inCodeAt(scan, pos) || (pos > lineStartAt(scan.text, pos) && inCodeAt(scan, pos - 1))
```

```Core/MarkdownPM/Links/headingHash.ts diff
- // A `[[` just typed before its closer or a pipe: the empty title the link grammar doesn't read yet.
- const openedTitle = (line: string, rel: number): [number, number] | null =>
-   line.slice(rel - 2, rel) === '[[' && /^(?:\||\]\])/.test(line.slice(rel)) ? [rel, rel] : null
@@ headingHash @@
-   if (inserted !== '§' || inCodeAt(scan, selStart) || inCodeAt(scan, selStart - 1)) return null
+   if (inserted !== '§' || inCodeNear(scan, selStart)) return null
    …
-   const title = connectionAt(scan, selStart)?.title ?? openedTitle(line, from)
+   const title = (connectionAt(scan, selStart) ?? openConnectionAt(scan, selStart))?.title
```

`isLiteralAt` (`edits.ts:641`), `headingHash` (`headingHash.ts:21`), and `literalAt` (`pasteLink.ts:46`, rewritten in Task 7-1) spelled "code at or just behind the caret" three ways; `inCodeNear` is the one spelling, and the two caret paths gain the line-start exception only the paste had, so a `§` or a typographic replacement typed at the first column after a closing fence no longer stands down.

**VERIFY**

- [ ] `headingHash.test.ts` passes; add: `headingHash(scanDoc('[[Pa'), 4, 4, '§')` writes `#`.
- [ ] `edits.test.ts`'s typography cases still stand down inside `[[A -- b` and `[[A -- b]]`.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] One reviewer reads the applied diff and the three tasks against the synthesis's §3.1, §3.3, §3.4, §3.14, and §3.16 for a reader that still runs its own regex over link syntax (`git grep -n "pageLinkPattern()\|markdownLinkRegex()"` must list only `connections.ts`, `links.ts`'s own builders, `detect.ts`'s `loneEmbedRe`, and tests) and for any caret path that re-tokenizes a line the walk already read.
- [ ] The index and the editor agree on `[[A#Note\]]`, `[x]([[T]])`, a half-in-code link, and a lone vs mid-line `![[P]]` (probe both `linksIn` and `tokenize`).
- [ ] Gates green; the delta reported from `git diff --numstat <baseline>` excluding tests.

### Phase 2 — Values, Writers, and the Clipboard Reader

**GOAL:** One function answers "what link does this text name" for a whole value, a clipboard, and a commit, with the page index when a surface has one and one fixed tiebreak when it doesn't; the four host readers move onto it in one step; each link syntax gets one writer; one expressibility rule serves headings and tiles; and the pure `retarget` that paste, the picker, and Link values will share is written once. Nothing here changes a renderer; it gives Phases 6–10 the pieces they call.

#### Task 2-1 — One reader for a whole link

**TASK:** `readLinkText(text, resolve?)` in `linkValue.ts` becomes the one reader of a whole link: a page if the text names a title (resolved when a resolver is given, title-shaped and not a valid address when none is), a weblink if valid (normalized to a scheme), else nothing. It carries the written syntax so renames keep it. `readLink`, `parseLink`, `LinkValue`, `ConnectionParts`, and `PasteAsTarget` go, and `MD_LINK` is rebuilt from the tokenizer's grammar.

**NOW:** Four readers answer the question four ways (synthesis §3.1): `readLink` (`linkValue.ts:30`) reads any non-wikilink as a URL; `parsePastedLink` (`:48`) refuses an unresolved markdown title; `pasteAsTarget` (`pasteAsMenu.ts:35`) reads `[x](example.com)` as a page; `resolveMdTarget` tries the page first. `MD_LINK` (`links.ts:5`) is a second markdown grammar with no caps and a greedy destination, so `[a](b) [c](d)` reads as one link and `[^1](x)` as a link. `wholeWikiLink` (`pasteAsMenu.ts:30`) drops the alias and refuses a heading, so Paste As loses what it's handed (F-042) and `[[T#H]]` offers nothing.

**CHANGE**

- [ ] Write the tests in `linkValue.test.ts` (replacing the `readLink`/`parseLink` cases): without a resolver, `readLinkText('[[T#H|a]]')` → `{ kind: 'page', syntax: 'wiki', title: 'T', heading: 'H', alias: 'a' }`; `readLinkText('[x](Old)')` → `{ kind: 'page', syntax: 'markdown', title: 'Old', alias: 'x' }`; `readLinkText('[x](example.com)')` → `{ kind: 'url', syntax: 'markdown', url: 'https://example.com', alias: 'x' }`; `readLinkText('example.com')` → `{ kind: 'url', syntax: 'bare', url: 'https://example.com' }`; `readLinkText('[x](#H)')` → `{ kind: 'page', syntax: 'markdown', title: '', heading: 'H', alias: 'x' }`; `readLinkText('[^1](https://a.com)')` → `null`; `readLinkText('[a](b) [c](d)')` → `null`; `readLinkText('foo bar')` → `null`. With a resolver answering only `Meeting Notes`: `readLinkText('[[meeting notes]]', r)` → title `Meeting Notes`; `readLinkText('[x](meeting notes)', r)` → title `Meeting Notes`; `readLinkText('[x](example.com)', r)` → `{ kind: 'url', … 'https://example.com' }` (no such page, so the address arm); `readLinkText('[x](Nope)', r)` → `null` (title-shaped, no page, no valid address); `readLinkText('[[Dup]]', ambiguous)` → `null`, and `readLinkText('[x](dup.io)', ambiguousDotted)` → `null` (ambiguity wins over the address shape; T-06); `readLinkText('[[#H]]', r)` → `null` and with a resolver answering `''` as resolved → `{ kind: 'page', syntax: 'wiki', title: '', heading: 'H' }`. Watch them fail.
- [ ] Rebuild `MD_LINK` from `emptyTolerantLinkRegex`'s source, anchored, as `WHOLE_LINK` is built from `pageLinkPattern`.
- [ ] Write `readLinkText`; `wholeValueLink(v)` reads it; delete `readLink`, `parseLink`, `LinkValue`, `ConnectionParts` (its shape is `readLinkText`'s page arm), `PasteAsTarget`, `wholeWikiLink`, `pasteAsTarget`; `pasteAsRows` reads `readLinkText(clipboard)` (its `embeddableTarget` and rows follow in Task 2-3). `serializeLink(url, label?)`.
- [ ] `linkEditText`, `linkDisplayText`, `linkValueFromRename`, `urlClickTarget`, `valueLinks`' exclusion, `frontmatterMentions`, `goneEntry`, `parkLinks`, `namesGonePage`, `LinkCell.tsx:30`, `valueClick.ts:51`, and `connectionMenuActions.ts:81` read `readLinkText`; `linkValueFromEdit`, `parsePastedLink`, and `ResolveTitle` stand until Task 8-3 rewrites the first and deletes the other two (`parseEditorValue.ts` and `linkResolve.ts` read them until then); `linkValueFromEdit`'s only changes here are `readLink(current)` → `readLinkText(current)` and `serializeLink(normalizeLinkUrl(trimmed), alias)`. `PropertyValueInput.tsx:56` reads `readLinkText(raw)?.alias` in place of `linkAlias`, which goes.

**AFTER**

```Core/Connections/links.ts diff
@@ grammars @@
- export const MD_LINK = /^\[((?:[^\]\\]|\\.)*)\]\((.*)\)$/
  const LINK_LABEL = …
  const LINK_DEST = …
  export const markdownLinkRegex = (): RegExp => new RegExp(`\\[${LINK_LABEL(1)}\\]\\(${LINK_DEST(1)}\\)`, 'dg')
  export const emptyTolerantLinkRegex = (): RegExp => new RegExp(`\\[${LINK_LABEL(0)}\\]\\(${LINK_DEST(0)}\\)`, 'dg')
+ /** A whole value or clipboard that is one markdown link, empty halves admitted so `[](Page)` reads as a page with no label. */
+ export const MD_LINK = new RegExp(`^${emptyTolerantLinkRegex().source}$`)
```

```Core/Connections/linkValue.ts diff
@@ types @@
- type LinkValue = { url: string; alias?: string }
- export type LinkTarget =
-   | { kind: 'page'; title: string; alias?: string; heading?: string }
-   | { kind: 'url'; url: string; alias?: string }
+ /** What a whole link names, with the syntax it was written in so a rewrite keeps it. A page's `title` is '' for a bare `[[#Heading]]`, which the caller's resolver answers with the holder. */
+ export type LinkTarget =
+   | { kind: 'page'; syntax: 'wiki' | 'markdown'; title: string; heading?: string; alias?: string }
+   | { kind: 'url'; syntax: 'markdown' | 'bare'; url: string; alias?: string }

@@ wholeValueLink @@
  export function wholeValueLink(v: unknown): LinkTarget | null {
    const entry = linkEntry(v, 2)
-   return entry === null ? null : readLink(entry)
+   return entry === null ? null : readLinkText(entry)
  }

@@ linkValueFromEdit (rewritten whole in Task 8-3) @@
-   const cur = current ? readLink(current) : undefined
+   const cur = current ? readLinkText(current) : null
    const alias = cur?.kind === 'url' ? cur.alias : undefined
-   return { kind: 'link', value: serializeLink({ url: normalizeLinkUrl(trimmed), alias }) }
+   return { kind: 'link', value: serializeLink(normalizeLinkUrl(trimmed), alias) }

@@ readLinkText @@
- export function readLink(raw: string): LinkTarget { … }
- export function parseLink(raw: string): LinkValue { … }
+ /** The one reader of a whole link. A connection is a page, and a bare `#Heading` in either syntax a page with an empty title that the caller's resolver answers with the holder. With a resolver, a title the index resolves is that page under its own capitalization, an ambiguous one is refused, and one the index has no page for falls to the address arm; without one (main has none), a title-shaped target that is no valid address is a page, so a spaceless dotted title reads as an address there (a conceded case). Anything else is a valid address normalized to a scheme, or nothing. */
+ export function readLinkText(text: string, resolve?: PageIndex['resolve']): LinkTarget | null {
+   const conn = parseConnectionText(text)
+   if (conn) return page('wiki', conn.title, conn.heading, conn.alias, resolve?.(conn.title))
+   const m = MD_LINK.exec(text.trim())
+   const alias = m ? unescapeAlias(m[1]).trim() || undefined : undefined
+   const dest = m ? m[2].trim() : text.trim()
+   const title = m ? targetTitle(dest) : null
+   const res = title === null ? undefined : resolve?.(title)
+   if (title !== null && (res ? res.status !== 'phantom' : !isValidLink(dest)))
+     return page('markdown', title, targetFragment(dest) || undefined, alias, res)
+   if (!isValidLink(dest)) return null
+   return { kind: 'url', syntax: m ? 'markdown' : 'bare', url: normalizeLinkUrl(dest), alias }
+
+   function page(syntax, title, heading, alias, res?: ConnResolution): LinkTarget | null {
+     if (title === '' && !heading) return null
+     if (res && res.status !== 'resolved') return null
+     const named = title !== '' && res?.page ? res.page.title : title
+     return { kind: 'page', syntax, title: named, ...(heading ? { heading } : {}), ...(alias ? { alias } : {}) }
+   }
+ }

@@ serializeLink @@
- export function serializeLink(v: LinkValue): string {
-   return v.alias ? `[${escapeAlias(v.alias)}](${v.url})` : v.url
+ export function serializeLink(url: string, label?: string): string {
+   return label ? `[${escapeAlias(label)}](${url})` : url
  }

@@ readers @@
  export function urlClickTarget(value: string | undefined): string | null {
    if (!value) return null
-   const target = readLink(value)
-   return target.kind === 'url' && isValidLink(target.url) ? target.url : null
+   const target = readLinkText(value)
+   return target?.kind === 'url' ? target.url : null
  }

  export function linkEditText(raw: string): string {
-   const target = readLink(raw)
-   return target.kind === 'page' ? connectionText(target.title, target.alias, target.heading) : target.url
+   const target = readLinkText(raw)
+   if (!target) return raw
+   return target.kind === 'page' ? connectionText(target.title, undefined, target.heading) : target.url
  }

- export function linkAlias(raw: string): string | undefined {
-   return readLink(raw).alias
- }

  export function linkValueFromRename(alias: string, current: string): PropertyValue {
    const named = alias.trim() || undefined
-   const target = readLink(current)
+   const target = readLinkText(current)
+   if (!target) return { kind: 'link', value: current }
    return {
      kind: 'link',
      value:
-       target.kind === 'page'
-         ? connectionText(target.title, named, target.heading)
-         : serializeLink({ url: target.url, alias: named }),
+       target.kind === 'url'
+         ? serializeLink(target.url, named)
+         : target.syntax === 'wiki'
+           ? connectionText(target.title, named, target.heading)
+           : markdownPageLink(target.title, target.heading, named),
    }
  }

  export function linkDisplayText(raw: string, display?: LinkDisplay, title?: string): string {
-   const target = readLink(raw)
-   if (target.alias) return target.alias
+   const target = readLinkText(raw)
+   if (!target) return raw
+   if (target.alias) return target.alias
    if (target.kind === 'page') return target.title
    …
  }

@@ linkMarkdown @@
  export function linkMarkdown(url: string, display: LinkDisplay, title?: string): string {
-   return serializeLink({ url, alias: linkDisplayText(url, display, title) })
+   return serializeLink(url, linkDisplayText(url, display, title))
  }
```

The edit seed (`linkEditText`) now shows a page without its alias, matching the address seed; the alias is Rename's. `urlClickTarget` goes in Task 8-2; `linkEditText`, `linkDisplayText`, and `linkValueFromRename` keep their callers. `markdownPageLink` is Task 2-3's; write it in the same commit.

```Core/Connections/scan.ts diff
@@ valueLinks @@
-     if (typeof value !== 'string' || readLink(value).kind === 'page') continue
+     if (typeof value !== 'string' || readLinkText(value)?.kind === 'page') continue
```

```Core/Actions/pasteAsMenu.ts diff
- type PasteAsTarget = { kind: 'url'; url: string } | { kind: 'page'; title: string } | null
- function wholeWikiLink(s: string): string | null { … }
- export function pasteAsTarget(clipboard: string): PasteAsTarget { … }
@@ pasteAsRows @@
-   const target = pasteAsTarget(clipboard)
+   const target = clipboard.includes('\n') ? null : readLinkText(clipboard)
```

`pasteAsWrite` keeps its shape until Task 7-1 and reads `LinkTarget` from here (`target.title`, `target.url`); its `markdown` arm writes `markdownPageLink(target.title, target.heading, target.alias)` and its `connection` arm `connectionText(target.title, target.alias, target.heading)`, which is what makes Paste As keep alias and heading.

**VERIFY**

- [ ] `pasteAsRows('[[T#H]]', false, false)` → Connection, Markdown Link; `pasteAsRows('[x](#H)', …)` and `pasteAsRows('[[#H]]', …)` → Connection, Markdown Link (a held heading in either syntax; no Embedded Page, since it carries a heading); `pasteAsRows('[x](example.com)', …)` → the address rows; `pasteAsWrite(readLinkText('[[T|a]]'), 'connection')` → `[[T|a]]`; `pasteAsWrite(readLinkText('[[#H]]'), 'markdown')` → `[H](#H)`.
- [ ] `grep -rn "readLink(\|parseLink(\|PasteAsTarget\|wholeWikiLink" Core Desktop --include='*.ts' --include='*.tsx'` is empty.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-2 — The host readers move together

**TASK:** `goneEntry`, `parkLinks`, `namesGonePage`, and `frontmatterMentions` all read the resolver-free `readLinkText` (`parkLinks` on the entry string it already holds, the rest through `wholeValueLink`), so a hand-written `[x](Page)` value is stripped, parked, and restored like `[[Page]]`, and the three restore notes write the entry `linkEntry` reads rather than `String(raw)`.

**NOW:** `goneEntry` (`cascade.ts:95-99`) unwraps nested YAML and reads `readLink`; `parkLinks` (`holdings.ts:89`) reads `parseConnectionText` on the string; `namesGonePage` (`propertyValue.ts:123-126`) reads `parseConnectionText` on strings only, so a hand-written unquoted `[[Gone]]` (a nested YAML sequence) is stripped on a frozen restore and never noted or parked (M9-01); `frontmatterMentions` reads `wholeValueLink`. The notes write `String(raw)` (`restoreScrub.ts:43`, `restoreProperty.ts:66`, `assignment.ts:99`), which `parkLinks` can't read for a nested value.

**CHANGE**

- [ ] Write the tests: `namesGonePage([['Gone']], { holds: () => false })` is `true`; `namesGonePage('[x](Gone)', …)` is `true`; `namesGonePage('[x](example.com)', { holds: () => false })` is `false`; a cascade test where a page with a Link value `[x](Target)` has Target deleted: the value is stripped and parked (`cascade.test.ts`, beside the `[[Target]]` case). Watch them fail.
- [ ] Rewrite the four readers and the three notes as below.

**AFTER**

```Core/Nexus/cascade.ts diff
@@ deleteCascade · goneEntry @@
    const goneEntry = (value: unknown): string | null => {
-     const entry = linkEntry(value, 2)
-     const link = entry === null ? null : readLink(entry)
-     return link?.kind === 'page' && gone.has(normalizeTitle(link.title)) ? entry : null
+     const link = wholeValueLink(value)
+     return link?.kind === 'page' && gone.has(normalizeTitle(link.title)) ? linkEntry(value, 2) : null
    }
```

```Core/Trash/holdings.ts diff
@@ parkLinks @@
    for (const link of links) {
-     const page = parseConnectionText(link.value)
+     const page = readLinkText(link.value)
-     const bundle = page && newest.get(normalizeTitle(page.title))
+     const bundle = page?.kind === 'page' && newest.get(normalizeTitle(page.title))
```

```Core/Properties/propertyValue.ts diff
@@ namesGonePage → gonePageEntry @@
- /** Whether `raw` is a Link naming a page `frozen` doesn't hold; one naming only a heading of its own page always stands. */
- export function namesGonePage(raw: unknown, frozen: Frozen): boolean {
-   const page = typeof raw === 'string' ? parseConnectionText(raw) : null
-   return !!page?.title && frozen.holds !== undefined && !frozen.holds(page.title)
+ /** The entry a Link value holds when it names a page `frozen` doesn't hold, which the restore parks; one naming only a heading of its own page always stands. */
+ export function gonePageEntry(raw: unknown, frozen: Frozen): string | null {
+   const link = wholeValueLink(raw)
+   const gone = link?.kind === 'page' && link.title !== '' && frozen.holds !== undefined && !frozen.holds(link.title)
+   return gone ? linkEntry(raw, 2) : null
  }
```

```Core/Trash/restoreScrub.ts diff
@@ restoreScrub @@
-   // Whether or not the destination assigns its key, a Link naming a page gone leaves, noted by its root's id.
-   const unlinked = (raw: Record<string, unknown>): string[] =>
-     Object.keys(raw).filter((k) => links.has(foldKey(k)) && namesGonePage(raw[k], frozen))
-   const note = (raw: Record<string, unknown>, keys: string[], id: string | undefined): void => {
-     for (const key of keys) {
+   // Whether or not the destination assigns its key, a Link naming a page gone leaves, noted by its root's id with the entry it held.
+   const unlinked = (raw: Record<string, unknown>): Record<string, string> =>
+     Object.fromEntries(
+       Object.entries(raw).flatMap(([k, v]) => {
+         const entry = links.has(foldKey(k)) ? gonePageEntry(v, frozen) : null
+         return entry === null ? [] : [[k, entry]]
+       }),
+     )
+   const note = (gone: Record<string, string>, id: string | undefined): void => {
+     for (const [key, value] of Object.entries(gone)) {
        const def = links.get(foldKey(key))
-       if (def && id) dropped.push({ page: id, property: def.id, value: String(raw[key]) })
+       if (def && id) dropped.push({ page: id, property: def.id, value })
      }
    }
-   const unstamped = new Map<string, Record<string, unknown>>()
+   const unstamped = new Map<string, Record<string, string>>()
    const text = (content: string, file: string): string | null => {
      …
      const gone = unlinked(raw)
-     if (!r.changed.length && !gone.length) return null
-     if (raw[ID_KEY] === undefined && gone.length)
-       unstamped.set(file, Object.fromEntries(gone.map((k) => [k, raw[k]])))
-     else note(raw, gone, asString(raw[ID_KEY]))
-     const keys = [...new Set([...r.changed, ...gone])]
-     const kept = stripKeys(r.root, gone) ?? r.root
+     const goneKeys = Object.keys(gone)
+     if (!r.changed.length && !goneKeys.length) return null
+     if (raw[ID_KEY] === undefined && goneKeys.length) unstamped.set(file, gone)
+     else note(gone, asString(raw[ID_KEY]))
+     const keys = [...new Set([...r.changed, ...goneKeys])]
+     const kept = stripKeys(r.root, goneKeys) ?? r.root
      …
-   for (const [file, lost] of unstamped)
-     note(lost, Object.keys(lost), valueOr(await ensurePageId(file), undefined))
+   for (const [file, lost] of unstamped) note(lost, valueOr(await ensurePageId(file), undefined))
    …
        const gone = unlinked(next ?? raw)
-       note(raw, gone, asString(raw.id))
-       return stripKeys(next ?? raw, gone) ?? next
+       note(gone, asString(raw.id))
+       return stripKeys(next ?? raw, Object.keys(gone)) ?? next
```

```Core/Trash/restoreProperty.ts diff
-       if (def.type !== 'link' || !namesGonePage(raw, frozen)) return true
-       dropped.push({ page: id, property: def.id, value: String(raw) })
+       const entry = def.type === 'link' ? gonePageEntry(raw, frozen) : null
+       if (entry === null) return true
+       dropped.push({ page: id, property: def.id, value: entry })
        return false
```

```Core/Properties/assignment.ts diff
    const gone =
      def.type === 'link'
-       ? Object.keys(members).filter((id) => namesGonePage(cached[id], frozen))
+       ? Object.keys(members).flatMap((id) => {
+           const entry = gonePageEntry(cached[id], frozen)
+           return entry === null ? [] : [{ page: id, property: propertyId, value: entry }]
+         })
        : []
    const spent = await refillValues(root, def, members, cached, frozen)
-   await parkLinks(
-     root,
-     gone.map((id) => ({ page: id, property: propertyId, value: String(cached[id]) })),
-   )
+   await parkLinks(root, gone)
    …
-     for (const id of [...spent, ...gone]) delete left[id]
+     for (const id of [...spent, ...gone.map((g) => g.page)]) delete left[id]
```

The note writes the entry `parkLinks` reads, so a nested-YAML value parks as the string it held; `namesGonePage`'s three callers all read the entry once.

**VERIFY**

- [ ] `cascade.test.ts`, `restoreScrub.test.ts`, `restoreProperty.test.ts`, `assignment.test.ts`, `holdings.test.ts` pass with the new cases.
- [ ] `grep -rn "parseConnectionText" Core --include='*.ts' --include='*.tsx' | grep -v test` lists only `linkValue.ts` and the asset readers (`assetWrite.ts`, `adoptFile.ts`, or whichever still read a whole wikilink for a file name).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-3 — One writer per syntax and one expressibility rule

**TASK:** `markdownPageLink(title, heading?, label?)` becomes the one writer of a markdown link naming a page; `composeWebpageEmbedLine` becomes the one `![label](url)` writer; `expressibleInLink(text)` replaces `expressibleHeading` and `embeddableTitle`; and the name rule refuses a page title the wikilink grammar can't carry, so no writer needs a fallback.

**NOW:** No function writes a page markdown link with a heading and a label; `pasteAsWrite` spells it by hand (`pasteAsMenu.ts:111-115`) and the picker's target arm spells the destination by span. `webpageInsertAtCaret` writes `![]()` by hand (`embedInsert.ts:60`). `expressibleHeading` and `embeddableTitle` (`connections.ts:99-105`) state two subsets of one rule. `nameError` (`names.ts`) refuses `|`, `#`, `§` and allows `]`, so a title ending in `]` yields `[[Draft]]]`, which the grammar reads as `Draft` plus a stray bracket (A-47).

**CHANGE**

- [ ] Write the tests: `markdownPageLink('Meeting Notes', 'H', 'x')` → `[x](Meeting%20Notes#H)`; `markdownPageLink('P')` → `[P](P)`; `markdownPageLink('', 'H')` → `[H](#H)`; `nameError('Draft]', 'page')` and `nameError('A]]B', 'page')` return a message, `nameError('A]B', 'page')` is `null`; `expressibleInLink('a|b')`, `expressibleInLink('C#')`, `expressibleInLink('x]')` are `false`. Watch them fail.
- [ ] Add `markdownPageLink` to `links.ts`; `pasteAsWrite`'s markdown arm reads it (Task 2-1 wrote the call).
- [ ] `webpageInsertAtCaret` inserts `composeWebpageEmbedLine('', '')`.
- [ ] `expressibleInLink` replaces both predicates; readers: `headingRows` (`autocomplete.ts:151`), `rewriteHeadingConnections`'s `wiki` gate, `buildTiles`' claim, `embeddable` (`embedWidget.tsx`), `embeddableTarget` (`pasteAsMenu.ts`).
- [ ] `nameError` gains the rule for pages.

**AFTER**

```Core/Connections/links.ts diff
+ /** The one markdown spelling of a page link; the label is the title when none is given, or the heading of a bare `#Heading`, since an empty label isn't a link. */
+ export function markdownPageLink(title: string, heading?: string, label?: string): string {
+   const dest = encodeLinkTarget(title) + (heading ? `#${encodeLinkTarget(heading)}` : '')
+   return `[${escapeAlias(label ?? (title || heading || ''))}](${dest})`
+ }
```

```Core/Connections/connections.ts diff
- // A heading the link grammar can write: no pipe, hash, or newline, and no `]]` or a trailing `]` that would close the link early.
- export function expressibleHeading(heading: string): boolean {
-   return !/[|#\r\n]/.test(heading) && !heading.includes(']]') && !heading.endsWith(']')
- }
-
- export function embeddableTitle(title: string): boolean {
-   return !/[\]|#\r\n]/.test(title)
- }
+ /** Text the link grammar can carry as a title or a heading: no pipe, hash, or newline, and no `]]` or trailing `]` that would close the link early. */
+ export function expressibleInLink(text: string): boolean {
+   return !/[|#\r\n]/.test(text) && !text.includes(']]') && !text.endsWith(']')
+ }
```

```Core/Paths/names.ts diff
@@ nameError @@
    if (/[|#§]/.test(name)) return `"${name}" can't contain "|", "#", or "§".`
+   if (role === 'page' && !expressibleInLink(name)) return `"${name}" can't end in "]" or contain "]]".`
    if (role === 'page' && isMarkdownFile(name)) return `"${name}" can't end in ".md".`
```

```Core/MarkdownPM/Embeds/embedInsert.ts diff
  export function webpageInsertAtCaret(view: EditorView): boolean {
-   return insertEmbedToken(view, '![]()', ')'.length)
+   return insertEmbedToken(view, composeWebpageEmbedLine('', ''), ')'.length)
  }
```

```Core/Actions/pasteAsMenu.ts diff
@@ embeddableTarget @@
  function embeddableTarget(target: LinkTarget): boolean {
-   return target.kind === 'page' ? embeddableTitle(target.title) : WEB_ADDRESS.test(target.url)
+   return target.kind === 'page' ? expressibleInLink(target.title) && !target.heading && !target.alias : isWebAddress(target.url)
  }
```

`isWebAddress` is Task 2-5's; write them in order. A pasted `[[T#H]]` or `[[T|a]]` offers Connection and Markdown Link and no Embedded Page, since a tile carries neither.

**VERIFY**

- [ ] `grep -rn "expressibleHeading\|embeddableTitle" Core --include='*.ts' --include='*.tsx'` is empty; `grep -rn "'!\[\]()'\|\`!\[\[" Core --include='*.ts' | grep -v test` lists only `pageEmbedText` and `detect.ts`'s grammar (the picker's own `![[` spelling goes in Phase 10).
- [ ] `names.test.ts` passes with the new rule; a rename to `Draft]` is refused in `~/Test` with the message shown.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-4 — `retarget`

**TASK:** A pure `retarget(syntax, container, next, keepTitle, into?)` in `linkValue.ts` writes a link whose target changed, under the one shown-text rule; `LinkPaste` carries the address a title is awaited for as `awaits`.

**NOW:** Nothing retargets a link deliberately except the picker, which replaces the whole `[[…]]` by hand (`autocomplete.ts:210`) and the destination span by hand (`:270-278`); pasting a link onto a link nests it (E-19, E-20, E-21). `LinkPaste` is `{ kind, text, target, wantsTitle }` (`linkValue.ts:124-129`), where `target` is read only when `wantsTitle`.

**CHANGE**

- [ ] Write the tests (the rule table from the Continuation §5.8, plus the same-target keep): with `keepTitle` false, `retarget('wiki', page('Page1'), page('Page2'))` → `[[Page2]]`; `retarget('wiki', page('Page1'), page('Page2', 'x'))` → `[[Page2|x]]`; `retarget('wiki', page('Page1', 'Mine'), page('Page2'))` → `[[Page2]]`, and with `keepTitle` true → `[[Page2|Mine]]`; `retarget('markdown', page('Page1', 'y'), page('Page2'))` → `[Page2](Page2)`, and with `keepTitle` true → `[y](Page2)`; `retarget('wiki', page('Page1'), url('https://x.com'), false, { format: 'link-short' })` → `{ text: '[x.com](https://x.com)' }`; with `format: 'link-title'` and no cached title → `awaits: 'https://x.com'`; `retarget('wiki', page('Page1', 'Mine'), page('page1'), false)` → `[[page1|Mine]]` (same target keeps the alias); `retarget('wiki', null, url('https://x.com'), false)` → `https://x.com` (a Link value: no format, no label). Watch them fail.
- [ ] Write `retarget`; `LinkPaste` becomes `{ kind: 'link'; text: string; awaits?: string }`; `linkPaste` sets `awaits` only when the display is Page Title, no title is cached, and `isHttpLink(url)`; `writeLink` (`pasteLink.ts:49-63`) and `formatted` (`linkFormat.ts:45-52`) read `awaits` in place of `target`/`wantsTitle` until Phases 5–7 rewrite them.

**AFTER**

```Core/Connections/linkValue.ts diff
@@ LinkPaste @@
  export interface LinkPaste {
    kind: 'link'
    text: string
-   target: string
-   wantsTitle: boolean
+   /** The address whose page title is still to be fetched and swapped in. */
+   awaits?: string
  }

  export function linkPaste(url: string, display: LinkDisplay, title?: string): LinkPaste {
-   return {
-     kind: 'link',
-     text: linkMarkdown(url, display, title),
-     target: url,
-     wantsTitle: display === 'link-title' && title === undefined,
-   }
+   const text = linkMarkdown(url, display, title)
+   const awaits = display === 'link-title' && title === undefined && isHttpLink(url)
+   return awaits ? { kind: 'link', text, awaits: url } : { kind: 'link', text }
  }

@@ retarget @@
+ const sameTarget = (a: LinkTarget, b: LinkTarget): boolean =>
+   a.kind === 'page' && b.kind === 'page'
+     ? normalizeTitle(a.title) === normalizeTitle(b.title) && normalizeTitle(a.heading ?? '') === normalizeTitle(b.heading ?? '')
+     : a.kind === 'url' && b.kind === 'url' && a.url === b.url
+
+ /** A link whose target changes: the one rule paste, the picker, and a Link value's edit share. The shown text is the next link's own alias, else the container's where the setting keeps it or the target is unchanged. A connection stays `[[…]]` unless the next target is an address, which `[[ ]]` can't hold; a markdown link stays markdown. A weblink with no shown text takes the Default Link Format where one is given, and the bare address where none is (a Link value). */
+ export function retarget(
+   syntax: 'wiki' | 'markdown',
+   container: LinkTarget | null,
+   next: LinkTarget,
+   keepTitle: boolean,
+   into?: { format: LinkDisplay; title?: string },
+ ): LinkPaste {
+   const kept = container && (keepTitle || sameTarget(container, next)) ? container.alias : undefined
+   const shown = next.alias ?? kept
+   if (next.kind === 'page') {
+     const text =
+       syntax === 'wiki'
+         ? connectionText(next.title, shown, next.heading)
+         : markdownPageLink(next.title, next.heading, shown)
+     return { kind: 'link', text }
+   }
+   if (shown) return { kind: 'link', text: serializeLink(next.url, shown) }
+   return into ? linkPaste(next.url, into.format, into.title) : { kind: 'link', text: next.url }
+ }
```

The carve-out: `keepTitle` is Remove Title On Link Change read as "off" at each caller; a caller that should keep aliases regardless passes `true`.

**VERIFY**

- [ ] `linkValue.test.ts`'s retarget cases pass; `pasteLink.test.tsx` and `linkFormat.test.tsx` pass with `awaits`.
- [ ] `grep -rn "wantsTitle\|\.target\b" Core/MarkdownPM/Links Core/Actions/pasteAsMenu.ts Core/Connections/linkValue.ts` finds no `LinkPaste.target`.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-5 — `isWebAddress`

**TASK:** One `isWebAddress(s)` in `urlPath.ts` spells "a valid address with a written http(s) scheme", replacing the three `WEB_ADDRESS && isValidLink` copies and the bare `WEB_ADDRESS.test(url)` in Paste As.

**NOW:** The gate is spelled six ways (synthesis §3.11): `pastedUrl` (`pasteDecision.ts:25-26`), `loneWebpageEmbed` (`detect.ts:414`), `isWebUrl` (`webGuests.ts:18`, as `WEB_ADDRESS.test(x) && isHttpLink(x)`, equivalent), `embeddableTarget` (`pasteAsMenu.ts:70`, `WEB_ADDRESS` alone), `dwellTarget` (`linkClicks.ts:128-129`, `isHttpLink` restated; Task 4-5's).

**CHANGE**

- [ ] Write the tests: `isWebAddress('https://a.com')` true; `isWebAddress('a.com')` false; `isWebAddress('https://a')` false; `isWebAddress('mailto:a@b.co')` false.
- [ ] Add it; `pastedUrl`, `loneWebpageEmbed`, `isWebUrl`, and `embeddableTarget` read it. `pastedUrl` keeps its one-token rule only as `isWebAddress` already implies it (`isValidLink` refuses whitespace), so it becomes `isWebAddress(s) ? s : null` and goes whole in Task 7-1.

**AFTER**

```Core/Paths/urlPath.ts diff
+ /** A valid address with its http(s) scheme written out: what a paste formats, a tile forms over, and a guest may attach. */
+ export function isWebAddress(url: string): boolean {
+   return WEB_ADDRESS.test(url.trim()) && isValidLink(url)
+ }
```

```Core/MarkdownPM/Engine/detect.ts diff
@@ loneWebpageEmbed @@
-   if (!url || !WEB_ADDRESS.test(url) || !isValidLink(url)) return null
+   if (!isWebAddress(url)) return null
```

```Desktop/Web/webGuests.ts diff
- // `isHttpLink` alone normalizes a schemeless string to https, admitting what the renderer refuses.
- const isWebUrl = (url: string): boolean => WEB_ADDRESS.test(url) && isHttpLink(url)
+ // `isHttpLink` alone normalizes a schemeless string to https, admitting what the renderer refuses.
  …
-     (src !== '' && !isWebUrl(src)) ||
+     (src !== '' && !isWebAddress(src)) ||
```

```Core/MarkdownPM/Links/pasteDecision.ts diff
  export function pastedUrl(clipboard: string): string | null {
    const s = clipboard.trim()
-   if (!s || /\s/.test(s)) return null
-   if (!WEB_ADDRESS.test(s)) return null
-   return isValidLink(s) ? s : null
+   return isWebAddress(s) ? s : null
  }
```

**VERIFY**

- [ ] `grep -rn "WEB_ADDRESS" Core Desktop --include='*.ts' --include='*.tsx' | grep -v test` lists `urlPath.ts` alone (and `linkClicks.ts` until Task 4-5).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] One reviewer reads `readLinkText` against every former reader's behavior (the synthesis §3.1 table) and against Paste As, the Link value commit's current path, and the four host readers, looking for a value the old reader accepted that the new one refuses or the reverse, beyond the ones ruled: `[x](example.com)` commits, `[[#H]]` and `[x](#H)` commit with a holder and are refused on a Space, ambiguity is refused.
- [ ] `retarget`'s rule table is probed against all five Continuation §5.8 rows and the same-target keep.
- [ ] Gates green; delta reported.

### Phase 3 — Seams

**GOAL:** The pieces every later phase reads settle their shape once. The page index reaches every editor through the host it already carries (F-094), so the getter threaded through 22 signatures goes; the content index carries each page's heading text and level, so the picker, the missing-heading mark, and `§` runs will read one source; the connections bundle gets one page-open route and required members; and a title fetch answers with a promise, so every surface that waits on a title can await it under its own guard. These rewrite the editor mounts and the host contract, and land before the menus, the resting cell, and the picker rewrite the same lines.

#### Task 3-1 — Connections ride the editor host (F-094)

**TASK:** `EditorHost` gains `connections()`, read live through the `editorHost` facet; the `() => ConnectionsApi | undefined` parameter drops out of every intermediate, `embedHost.getConn` and the `tableConnections` facet go, the `connections` prop leaves `MarkdownEditor`, `CellEditor`, `MarkdownTable`, and `StaticCell`, and the raw-HTML stand-down becomes one predicate the slot cleanup and Enter read.

**NOW:** The getter is built in `MarkdownEditor.tsx` (`connectionsRef`), `TextPane.tsx`, and `CellEditor.tsx`, threaded through `surface.ts:43-87`, re-wrapped as `embedHost.getConn` (`embedWidget.tsx:41,47`), and carried by the `tableConnections` facet (`widget.tsx:55-56,345,560,570`) into `MarkdownTable.connections` (`:133`), `CellEditor.connections`, and `StaticCell.connections` (`cellStatic.tsx:278`). `buildEditorHost` already holds `connRef` and never reads it; `useEditorHost`'s memo lists `connections`. The raw-HTML stand-down lives only in `commitAliasOnEnter` (`linkEdit.ts`); `slotNear` and the alias memory act inside a raw-HTML block.

**CHANGE**

- [ ] Write the test (`editorHarness`): an editor mounted with `connections` on the host and none on the component draws `[[Alpha]]` resolved; a `slotNear` test on a page with HTML Formatting on and `[[Foo|]]` inside a `<div>` block: leaving the slot collapses nothing. Watch the first fail on the removed prop, the second on the collapse.
- [ ] `api.ts`: `EditorHost.connections(): ConnectionsApi | undefined`; `editorHost.tsx`: `connections: () => connRef.current`; the harness host: `connections: () => state.connections`, seated by `mountEditor`'s option.
- [ ] `surface.ts`, `decorations.ts`, `linkClicks.ts`, `citationPointer.ts`, `linkEdit.ts`, `embedWidget.tsx`, `widget.tsx`, `MarkdownTable.tsx`, `CellEditor.tsx`, `cellStatic.tsx`, `useConnectionAutocomplete.ts`, `MarkdownEditor.tsx`, `TextPane.tsx`, `PageView.tsx`, `PageTile.tsx`, `MarkdownTile.tsx`: as below.
- [ ] Add `inRawHtml(state, at, scope)` to `decorations.ts`, beside the `raw` read it shares (`linkEdit.ts` already imports from `decorations.ts`; the reverse edge would be a cycle); `commitAliasOnEnter` and `slotNear` read it (`aliasOnLeave(scope)` passes its scope through). The picker reads it in Task 10-2.

**AFTER**

```Core/MarkdownPM/api.ts diff
@@ EditorHost @@
  export interface EditorHost {
    settings(): EditorSettings
+   /** The page index and what a connection does here, read at the gesture: a tree change re-identifies the host, and the editor redraws on it. */
+   connections(): ConnectionsApi | undefined
    aliases: { … }
```

```Core/Pages/editorHost.tsx diff
@@ buildEditorHost @@
    return {
      settings: () => { … },
+     connections: () => connRef.current,
      aliases: { … },
```

```Core/MarkdownPM/surface.ts diff
- export const inlineSurface = (getConn: () => ConnectionsApi | undefined, scope: MarkdownScope): Extension => [
-   markdownDecorations(getConn, scope),
+ export const inlineSurface = (scope: MarkdownScope): Extension => [
+   markdownDecorations(scope),
    blockGestures(scope),
    customCaret,
    customSelection,
-   linkPointer(getConn),
-   citationPointer(getConn),
+   linkPointer,
+   citationPointer,
    pasteLink,
    pendingTitle,
-   aliasOnLeave(getConn),
+   aliasOnLeave(scope),
    …
- export const editorBase = ({ host, getConn, scope, panes, formatExt }: { host: EditorHost; getConn: () => ConnectionsApi | undefined; scope: MarkdownScope; … }): Extension => [
+ export const editorBase = ({ host, scope, panes, formatExt }: { host: EditorHost; scope: MarkdownScope; panes: readonly EditorPane[]; formatExt: Extension }): Extension => [
    editorHost.of(host),
-   inlineSurface(getConn, scope),
+   inlineSurface(scope),
```

```Core/MarkdownPM/decorations.ts diff
- export function markdownDecorations(getConn: () => ConnectionsApi | undefined, scope: MarkdownScope = 'page'): Extension {
-   return [stepDocs(scope), decorationPlugin(getConn, scope), caretSeat(scope)]
+ export function markdownDecorations(scope: MarkdownScope = 'page'): Extension {
+   return [stepDocs(scope), decorationPlugin(scope), caretSeat(scope)]
  }
- function decorationPlugin(getConn, scope)                 // every `getConn()` inside becomes `view.state.facet(editorHost).connections()`
- function build(view: EditorView, conn: ConnectionsApi | undefined, scope: MarkdownScope): Built {
+ function build(view: EditorView, scope: MarkdownScope): Built {
+   const host = view.state.facet(editorHost)
+   const conn = host.connections()
    const scan = docScan(view.state.doc)
    …
-   const settings = view.state.facet(editorHost).settings()
+   const settings = host.settings()
```

```Core/MarkdownPM/Links/linkClicks.ts diff
- type GetApi = () => ConnectionsApi | undefined
- export function linkPointer(getApi: GetApi): Extension {
-   return pointerHandlers<LinkHit>({
+ const apiOf = (view: EditorView): ConnectionsApi | undefined => view.state.facet(editorHost).connections()
+ export const linkPointer: Extension = pointerHandlers<LinkHit>({
    hoverGate: …,
-   hitAt: (view, event) => linkUnder(view, getApi(), event),
-   follow: (hit, _, event) => (hit.onText ? followTarget(hit.target, getApi(), event) : null),
+   hitAt: (view, event) => linkUnder(view, apiOf(view), event),
+   follow: (hit, view, event) => (hit.onText ? followTarget(hit.target, apiOf(view), event) : null),
    dwell: …,
    menu: (hit, view) => {
-     const menu = getApi()?.menu
+     const menu = apiOf(view)?.menu
```

```Core/MarkdownPM/Citations/citationPointer.ts diff
- export function citationPointer(getApi: () => ConnectionsApi | undefined): Extension {
-   return pointerHandlers<CiteHit>({
+ export const citationPointer: Extension = pointerHandlers<CiteHit>({
    hoverGate: CITE_GLYPH,
    hitAt: citeHitAt,
-   follow: (hit, _, event) => () => followCitation(hit.marker.label, getApi(), event),
+   follow: (hit, view, event) => () => followCitation(hit.marker.label, view.state.facet(editorHost).connections(), event),
```

```Core/MarkdownPM/decorations.ts diff
- import { editorHost, type OwnPage, ownPage, redrawNudge } from './api'
+ import { editorHost, type EditorSettings, type OwnPage, ownPage, redrawNudge } from './api'

+ /** An HTML block a page's HTML Formatting draws raw holds no live link: the picker, the slot cleanup, the alias memory, and Enter all stand down there, as the draw does. A cell's text parses alone and never draws raw. */
+ const drawsRawHtml = (scope: MarkdownScope, settings: EditorSettings): boolean => scope === 'page' && settings.htmlFormatting
+
+ export function inRawHtml(state: EditorState, at: number, scope: MarkdownScope): boolean {
+   return drawsRawHtml(scope, state.facet(editorHost).settings()) && spanAt(docScan(state.doc).html, at) !== undefined
+ }

@@ build @@
-   const raw = scope === 'page' && settings.htmlFormatting ? inline.html : []
+   const raw = drawsRawHtml(scope, settings) ? inline.html : []
```

```Core/MarkdownPM/Links/linkEdit.ts diff
- import { drawnLinkAt } from '../decorations'
+ import { drawnLinkAt, inRawHtml } from '../decorations'

@@ commitAliasOnEnter @@
    const link = connectionAt(scan, sel.head)
    if (!link?.alias || rel < link.alias[0] || rel > link.alias[1]) return false
-   // An HTML block HTML Formatting draws raw holds no live link.
-   if (view.state.facet(editorHost).settings().htmlFormatting && spanAt(scan.html, sel.head)) return false
+   if (inRawHtml(view.state, sel.head, 'page')) return false

@@ slotNear @@
- function slotNear(state: EditorState, at: number): Slot | null {
+ function slotNear(state: EditorState, at: number, scope: MarkdownScope): Slot | null {
    const { line, rel } = lineNear(state, at)
+   if (inRawHtml(state, line.from + rel, scope)) return null
    const s = connectionAt(docScan(state.doc), line.from + rel)

@@ aliasOnLeave @@
- export function aliasOnLeave(getApi: () => ConnectionsApi | undefined): Extension {
+ export function aliasOnLeave(scope: MarkdownScope): Extension {
    let authored: number | null = null
    const leave = (view: EditorView, at: number, slot: Slot, defer: boolean): void => {
-     leaveSlot(view, authored === slot.start ? getApi() : undefined, at, slot.kind, defer)
+     const api = authored === slot.start ? view.state.facet(editorHost).connections() : undefined
+     leaveSlot(view, api, at, slot.kind, defer)
      …
-       const slot = slotNear(view.state, at)
+       const slot = slotNear(view.state, at, scope)
      …
-       const left = slotNear(u.state, was)
+       const left = slotNear(u.state, was, scope)
-       if (u.view.hasFocus && slotNear(u.state, u.state.selection.main.head)?.start === left.start)
+       if (u.view.hasFocus && slotNear(u.state, u.state.selection.main.head, scope)?.start === left.start)
```

`commitAliasOnEnter` is bound only by `markdownInput`, which only the page editor mounts, so `'page'` is its scope.

```Core/MarkdownPM/Embeds/embedWidget.tsx diff
  interface EmbedHost {
-   getConn: () => ConnectionsApi | undefined
    ancestors: readonly string[]
    tabActive?: () => boolean
  }
  const embedHost = Facet.define<EmbedHost, EmbedHost>({
-   combine: (v) => v[0] ?? { getConn: () => undefined, ancestors: [] },
+   combine: (v) => v[0] ?? { ancestors: [] },
  })
@@ buildTiles @@
    const host = state.facet(embedHost)
-   const conn = host.getConn()
+   const conn = state.facet(editorHost).connections()
```

```Core/MarkdownPM/Tables/widget.tsx diff
- type ConnGetter = () => ConnectionsApi | undefined
- const tableConnections = Facet.define<ConnGetter, ConnGetter>({ combine: (vals) => vals[0] })
@@ renderInto @@
-       connections={view.state.facet(tableConnections)}
@@ tableWidgetExtension @@
- export function tableWidgetExtension(connections: ConnGetter): Extension {
+ export function tableWidgetExtension(): Extension {
    …
-     tableConnections.of(connections),
```

```Core/MarkdownPM/Tables/MarkdownTable.tsx · CellEditor.tsx · cellStatic.tsx diff
- `connections: () => ConnectionsApi | undefined` leaves the three prop lists and the two `<CellEditor connections=…>` / `<StaticCell connections=…>` sites.
~ CellEditor: editorBase({ host, scope: 'cell', panes: [ac], formatExt }); useConnectionAutocomplete(viewRef, host, 'cell')
~ StaticCellImpl: linkGestures(text, host.connections, host.glance, null, menuAt); claimLink/claimCite read host.connections(); renderCellBody(text, host.connections, around, linkStyle)
```

```Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts diff
- export function useConnectionAutocomplete(viewRef, host, getConn: () => ConnectionsApi | undefined, scope) {
+ export function useConnectionAutocomplete(viewRef, host, scope) {
-   const getConnRef = useLatest(getConn)
    …  every `getConnRef.current()` becomes `host.connections()`
```

```Core/MarkdownPM/MarkdownEditor.tsx diff
  interface Props {
    initialBody: string
    onChange: (body: string) => void
    host: EditorHost
    header?: ReactNode
-   connections?: ConnectionsApi
    embedAncestors?: readonly string[]
    …
- const connectionsRef = useLatest(connections)
  const settings = host.settings()
- // Decorations rebuild only on editor updates, so a real tree or settings change dispatches an empty transaction.
+ // Decorations rebuild only on editor updates, so a host or settings change dispatches an empty transaction; the host re-identifies on a tree change.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: redrawNudge.of(null) })
- }, [connections, settings])
+ }, [host, settings])
- const ac = useConnectionAutocomplete(viewRef, host, () => connectionsRef.current, 'page')
+ const ac = useConnectionAutocomplete(viewRef, host, 'page')
    …
-     editorBase({ host: hostRef.current, getConn: () => connectionsRef.current, scope: 'page', panes: [ac, block], formatExt }),
+     editorBase({ host: hostRef.current, scope: 'page', panes: [ac, block], formatExt }),
-     tableWidgetExtension(() => connectionsRef.current),
-     embedTiles({ getConn: () => connectionsRef.current, ancestors: embedAncestorsRef.current, tabActive: () => activeRef.current }),
+     tableWidgetExtension(),
+     embedTiles({ ancestors: embedAncestorsRef.current, tabActive: () => activeRef.current }),
```

```Core/Properties/Pickers/TextPane.tsx diff
- const host = useEditorHost({})
+ const host = useEditorHost({ connections: connections() })
  …  TextPaneEditor loses its `connections` prop; editorBase({ host, scope: 'text', panes: [ac], formatExt }); useConnectionAutocomplete(viewRef, host, 'text')
```

`PageView.tsx`, `PageTile.tsx`, and `MarkdownTile.tsx` drop `connections={…}` from `<MarkdownEditor>`; each already builds its host with `useEditorHost({ connections })`. The harness's `mountEditor({ connections })` seats it on `state.host.connections`.

**VERIFY**

- [ ] `grep -rn "() => ConnectionsApi | undefined\|getConn\|ConnGetter\|tableConnections\|connectionsRef" Core --include='*.ts' --include='*.tsx' | grep -v test` lists only `TextCell.tsx`, `linkGestures`' parameter in `cellStatic.tsx`, `TextPane.tsx`'s source prop, `valueContext.ts`, and `PropertyValueInput.tsx` (the surfaces outside an editor).
- [ ] Run the gates; `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` pass.
- [ ] In `~/Test`: a page body, a table cell, and a Text value's pane each draw `[[Alpha]]` resolved and open it; renaming Alpha in another window redraws the open page's links.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-2 — The heading index carries text and level

**TASK:** The content index stores each page's headings as text and level in document order; the session derives the normalized keys once on reply; `ConnectionsApi.headingsOf(path)` answers `{ keys, texts, outline }`, so the missing-heading mark keeps reading keys, `§` runs read the texts, and the picker reads the outline.

**NOW:** `indexSeed.ts:73` stores `[...new Set(outline.map(normalizeTitle))]`; the `headings` table is `(path, heading, ordinal)` keyed on `(path, heading)` (`ddl.ts:27-32`); `readHeadings` returns `Record<string, string[]>`; `nexusSlice.headings` holds the keys; `pageConnections.ts:31` hands them out as `headingsOf`. The picker reads a page's headings by fetching its body (`headingTarget.ts`), a second source the ruling retires in Task 10-4. `reindex` (`indexSeed.ts:143-160`) detects a heading rename by comparing the stored keys with the fresh ones.

**CHANGE**

- [ ] Write the tests: `indexSeed.test.ts` — a page `## Setup\n### Notes` yields `headings: [{ text: 'Setup', level: 2 }, { text: 'Notes', level: 3 }]`; `Desktop/Store/open.test.ts` — `INDEX_GENERATION` is `12` and a database at 11 drops and recreates the index tables; `nexusSlice` — a `loadHeadings` reply `{ 'A.md': [{ text: 'Setup', level: 2 }] }` lands as `{ keys: ['setup'], texts: ['Setup'], outline: [...] }`. Watch them fail.
- [ ] `Core/Platform/stores.ts`: `PageHeading`, `PageIndexEntry.headings: PageHeading[]`, `readHeadings(): Record<string, PageHeading[]>`.
- [ ] `Desktop/Store/ddl.ts`: the table and the generation; `stores.ts`: the insert and the select.
- [ ] `Core/Contract/bridge.ts`: `index:headings` replies `Record<string, PageHeading[]>`.
- [ ] `indexSeed.ts`: the entry carries text and level; `reindex` normalizes both sides for its compare.
- [ ] `Core/Connections/pageIndex.ts`: `PageHeadings`; `nexusSlice.ts`: derive keys; `pageConnections.ts`: `headingsOf` returns it; `headingMissing` and `decorations.ts`'s `ownHeadings` read `.keys`.

**AFTER**

```Core/Platform/stores.ts diff
+ export interface PageHeading {
+   text: string
+   level: number
+ }
  export interface PageIndexEntry {
    relations: Relation[]
-   headings: string[]
+   headings: PageHeading[]
    values: Record<string, unknown>
  }
  export interface ContentIndexStore {
    …
-   readHeadings(paths?: string[]): Record<string, string[]>
+   /** Each page's headings as written, in document order. */
+   readHeadings(paths?: string[]): Record<string, PageHeading[]>
```

```Desktop/Store/ddl.ts diff
- export const INDEX_GENERATION = 11
+ export const INDEX_GENERATION = 12
  …
    CREATE TABLE IF NOT EXISTS headings (
      path TEXT NOT NULL,
-     heading TEXT NOT NULL,
+     text TEXT NOT NULL,
+     level INTEGER NOT NULL,
      ordinal INTEGER NOT NULL,
-     PRIMARY KEY (path, heading)
+     PRIMARY KEY (path, ordinal)
    );
```

```Desktop/Store/stores.ts diff
-     const insHeading = db.prepare('INSERT OR REPLACE INTO headings (path, heading, ordinal) VALUES (?, ?, ?)')
+     const insHeading = db.prepare('INSERT OR REPLACE INTO headings (path, text, level, ordinal) VALUES (?, ?, ?, ?)')
      …
-       entry.headings.forEach((heading, ordinal) => { insHeading.run(path, heading, ordinal) })
+       entry.headings.forEach(({ text, level }, ordinal) => { insHeading.run(path, text, level, ordinal) })
@@ readHeadings @@
-   const rows = (only ? db.prepare(`SELECT path, heading FROM headings WHERE path IN ${PATHS_OF} ORDER BY path, ordinal`).all(JSON.stringify(only)) : db.prepare('SELECT path, heading FROM headings ORDER BY path, ordinal').all()) as { path: string; heading: string }[]
-   const out: Record<string, string[]> = {}
+   const rows = (only ? db.prepare(`SELECT path, text, level FROM headings WHERE path IN ${PATHS_OF} ORDER BY path, ordinal`).all(JSON.stringify(only)) : db.prepare('SELECT path, text, level FROM headings ORDER BY path, ordinal').all()) as { path: string; text: string; level: number }[]
+   const out: Record<string, PageHeading[]> = {}
    for (const p of only ?? paths(db, 'SELECT path FROM indexed_files')) out[p] = []
-   for (const { path, heading } of rows) { out[path] ??= []; out[path].push(heading) }
+   for (const { path, text, level } of rows) { out[path] ??= []; out[path].push({ text, level }) }
```

```Core/Contract/bridge.ts diff
-   'index:headings': { args: [paths?: string[]]; reply: Result<Record<string, string[]>> }
+   'index:headings': { args: [paths?: string[]]; reply: Result<Record<string, PageHeading[]>> }
```

```Core/Index/indexSeed.ts diff
@@ extractPageIndex @@
-   const outline = headingOutlineOf(scan).map((h) => h.text)
+   const headings = headingOutlineOf(scan).filter((h) => normalizeTitle(h.text) !== '')
+   const outline = headings.map((h) => h.text)
    …
-   const headings = [...new Set(outline.map(normalizeTitle))].filter(Boolean)
-   return { entry: { relations: [...tally.values()], headings, values }, outline }
+   return {
+     entry: { relations: [...tally.values()], headings: headings.map(({ text, level }) => ({ text, level })), values },
+     outline,
+   }

@@ reindex @@
  function reindex(rows: readonly ReadRow[]): HeadingRenameSeen[] {
    const held = readHeadings(rows.map(({ path }) => path)) ?? {}
    upsertPageIndexes(rows)
    return rows.flatMap(({ path, entry, outline }) => {
-     const before = held[path] ?? []
-     const after = entry.headings
+     const before = headingKeys(held[path] ?? [])
+     const after = headingKeys(entry.headings)
```

```Core/Connections/pageIndex.ts diff
+ /** A page's headings as the index holds them: the normalized keys a heading link is judged against, the texts a `§` run and a Text cell read on every build, and the outline a picker reads. */
+ export interface PageHeadings {
+   keys: string[]
+   texts: string[]
+   outline: PageHeading[]
+ }
+
+ /** The keys an outline's headings answer to, each once; the host's rename detection and the session's `headingsOf` both derive them here. */
+ export const headingKeys = (headings: readonly PageHeading[]): string[] => [...new Set(headings.map((h) => normalizeTitle(h.text)))]
```

```Core/Session/nexusSlice.ts diff
-   headings: Record<string, string[]>
+   headings: Record<string, PageHeadings>
@@ loadHeadings @@
        const res = await dialer().ask('index:headings', paths)
        if (!res.ok) return
-       set((s) => ({ headings: paths ? { ...s.headings, ...res.value } : res.value }))
+       const read = Object.fromEntries(
+         Object.entries(res.value).map(([path, outline]) => [
+           path,
+           { keys: headingKeys(outline), texts: outline.map((h) => h.text), outline },
+         ]),
+       )
+       set((s) => ({ headings: paths ? { ...s.headings, ...read } : read }))
```

```Core/MarkdownPM/Links/connectionsApi.ts diff
@@ ConnectionsApi @@
-   headingsOf?: (path: string) => string[] | undefined
+   headingsOf: (path: string) => PageHeadings | undefined
@@ headingMissing @@
-   const known = target.kind === 'self' ? ownKeys : conn?.headingsOf?.(target.page.path)
+   const known = target.kind === 'self' ? ownKeys : conn?.headingsOf(target.page.path)?.keys
```

```Core/MarkdownPM/decorations.ts diff
@@ ownHeadings @@
- // A body's headings as `read` takes them from its document; a held page's come from the index, which keys them.
+ // A body's headings as `read` takes them from its document; a held page's as `held` picks them from the index, keys for the missing mark and texts for `§` runs.
  function ownHeadings(
    own: OwnPage | null,
    conn: ConnectionsApi | undefined,
    read: (doc: Text) => readonly string[],
+   held: (h: PageHeadings) => readonly string[],
  ): readonly string[] | undefined {
    if (!own) return undefined
-   return own.kind === 'held' ? conn?.headingsOf?.(own.page.path) : read(own.view.state.doc)
+   if (own.kind !== 'held') return read(own.view.state.doc)
+   const h = conn?.headingsOf(own.page.path)
+   return h && held(h)
  }
@@ build @@
-   const ownKeys = ownHeadings(own, conn, docHeadingKeys)
+   const ownKeys = ownHeadings(own, conn, docHeadingKeys, (h) => h.keys)
    …
-     const sectionHeadings = ownHeadings(own, conn, docSectionHeadings) ?? []
+     const sectionHeadings = ownHeadings(own, conn, docSectionHeadings, (h) => h.texts) ?? []
```

A live TextPane's `§` runs read the index's heading texts, as the resting Text value does (Task 4-4); keys fold case and can change a heading's length, which `sectionRunsIn` slices by.

`pageConnections.ts`'s `headingsOf = (path) => headings[path]` is unchanged in text and changes in type. Making `headingsOf` required is Task 3-3's; write both in one commit if the type flow asks for it.

**VERIFY**

- [ ] `grep -rn "headingsOf\|s\.headings\[" Core --include='*.ts' --include='*.tsx' | grep -v test` lists only `.keys` or `.outline` reads and the two builders.
- [ ] `engineGraph.test.ts` and `hostGraph.test.ts` pass with `Core/Connections/pageIndex.ts` importing the `PageHeading` type from `Core/Platform/stores.ts` (the first `Core/Connections → Core/Platform` edge in the tree, type-only; the graph tests check externals and `.tsx` reach, not import direction).
- [ ] Run the gates; `indexSeed.test.ts`, `open.test.ts`, `contentIndex.test.ts`, `pageConnections.test.tsx` pass.
- [ ] Open `~/Test`: the index reseeds once (log line or the `index_generation` row at 12), and a `[[Alpha#Missing]]` still draws the missing mark.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-3 — The connections bundle settles its shape

**TASK:** `ConnectionsApi.open(page, heading?, newTab?)` replaces `open`, `bypass`, and `openPage`; `location` and `headingsOf` become required; `rememberAlias` reads `titleTarget`.

**NOW:** `pageConnections.ts:37-42` builds `open` (window tab or `select`) and `bypass` (`select` with `newTab: true`); `openPage` (`connectionsApi.ts:150-158`) falls back from `bypass` to `open`; the inert bundle omits `bypass`, which is the only reason it's optional. `location?` and `headingsOf?` are optional though every builder supplies them (`pageConnections.ts:34,44-45`). `rememberAlias` (`linkEdit.ts`) re-reads `api.resolve` and keeps `resolved && page` by hand, one of five such adapters.

**CHANGE**

- [ ] Write the test (`pageConnections.test.tsx:57` rewritten): `open(page, 'Setup', true)` in window mode calls `select` with `{ newTab: true, heading: 'Setup' }`; `open(page, 'Setup')` in window mode calls `openWindowTab`; `open(page)` in preview mode with Open Connections In Preview off calls `select` with `{ newTab: undefined, heading: undefined }`. Watch it fail.
- [ ] Rewrite as below; `resolveFollow` calls `api.open(named.page, named.heading, isCmd(event))`; `TileHost`'s `openRoute` keeps `connections?.open`.

**AFTER**

```Core/MarkdownPM/Links/connectionsApi.ts diff
  export interface ConnectionsApi extends PageIndex {
-   open: (page: ConnPage, heading?: string) => void
+   /** Opens a page where this surface's connections open; `newTab` is the ⌘-click, which takes the other route. */
+   open: (page: ConnPage, heading?: string, newTab?: boolean) => void
    menu?: (target: ConnMenuTarget) => void
-   bypass?: (page: ConnPage, heading?: string) => void
-   headingsOf?: (path: string) => string[] | undefined
-   location?: (pageId: string) => TrailSegment[]
+   headingsOf: (path: string) => PageHeadings | undefined
+   location: (pageId: string) => TrailSegment[]
  }
- export function openPage(api: ConnectionsApi, page: ConnPage, bypass: boolean, heading?: string): void { … }
```

```Core/Session/pageConnections.ts diff
    if (mode === 'inert') return { ...index, open: () => {}, headingsOf, location }
    return {
      ...index,
-     open: ({ id, path }, heading) => {
-       if (inWindow) openWindowTab({ kind: 'page', id, path }, { heading })
-       else void select({ kind: 'page', id, path }, { heading })
-     },
-     bypass: ({ id, path }, heading) => void select({ kind: 'page', id, path }, { newTab: true, heading }),
+     // No `newTab` means Tab Open Behavior decides, as every other page opener leaves it.
+     open: ({ id, path }, heading, newTab) => {
+       if (inWindow && !newTab) openWindowTab({ kind: 'page', id, path }, { heading })
+       else void select({ kind: 'page', id, path }, { newTab: newTab || undefined, heading })
+     },
      menu: showConnectionMenu,
```

```Core/MarkdownPM/Links/linkClicks.ts diff
@@ resolveFollow @@
      case 'page':
-       return api ? () => openPage(api, named.page, isCmd(event), named.heading) : null
+       return api ? () => api.open(named.page, named.heading, isCmd(event)) : null
```

```Core/MarkdownPM/Links/linkEdit.ts diff
@@ rememberAlias @@
-   const res = api.resolve(line.text.slice(s.title[0], s.title[1]))
-   // A phantom or ambiguous title names no single page, and the memory is keyed by page id.
-   if (res.status === 'resolved' && res.page) view.state.facet(editorHost).aliases.remember(res.page.id, alias)
+   // A phantom or ambiguous title names no single page, and the memory is keyed by page id.
+   const target = titleTarget(api, line.text.slice(s.title[0], s.title[1]))
+   if (target.kind === 'page') view.state.facet(editorHost).aliases.remember(target.page.id, alias)
```

`autocomplete.ts`'s `pageRow` reads `conn.location(p.id) ?? NO_TRAIL` → `conn.location(p.id)`; `aliasRows`' own resolve goes in Task 10-4.

**VERIFY**

- [ ] `grep -rn "bypass\|openPage(" Core --include='*.ts' --include='*.tsx' | grep -v test` lists only `useViewInteractions.tsx` and the tile `openPage` (a different function).
- [ ] `grep -rn "headingsOf?\.\|location?\." Core --include='*.ts' --include='*.tsx'` is empty.
- [ ] Run the gates.
- [ ] In `~/Test`, with Open Connections In Preview on: a click on `[[Alpha]]` opens the Page Window, ⌘-click opens a new tab; with it off and Tab Open Behavior set to new tab, a plain click opens a new tab.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-4 — Title fetches answer with a promise

**TASK:** `resolveLinkTitle(url)` and `EditorHost.linkTitles.resolve(url)` return `Promise<string | null>`: the cached title at once, `null` at once for a failed address, and the fetch's answer otherwise, with one promise per in-flight address.

**NOW:** `resolveLinkTitle` (`cacheSlice.ts:23-35`) returns void, dedupes with `inFlightTitles: Set`, and records failures in `failedTitles`, which nothing can observe; the editor learns of a title only through `linkTitles.subscribe` (`pendingTitle.ts:50`), so a failed fetch leaves a pending entry waiting until its text is edited (A-61), and a surface without an editor has nothing to wait on (F-043).

**CHANGE**

- [ ] Write the test (`store.test.tsx` or `cacheSlice.test.ts`): a stubbed `linkTitles:fetch` answering `Hello` resolves `resolveLinkTitle(url)` with `Hello` and a second call before it lands shares the promise (the dialer asked once); a failed fetch resolves `null` and a later call resolves `null` without asking; a cached title resolves at once. Watch it fail on the return type.
- [ ] Rewrite `resolveLinkTitle`; widen `EditorHost.linkTitles.resolve`'s type; the harness's `resolve` returns a promise a test can settle (`settleTitle(url, title)`), and its `subscribe` stays until Task 5-3 deletes it.

**AFTER**

```Core/Session/cacheSlice.ts diff
  export interface CacheSlice {
    linkTitles: Record<string, string>
-   resolveLinkTitle: (url: string) => void
+   /** The address's page title: cached at once, `null` at once once a fetch has failed, else the fetch's answer, one fetch per address in flight. */
+   resolveLinkTitle: (url: string) => Promise<string | null>
    …
- const inFlightTitles = new Set<string>()
+ const inFlightTitles = new Map<string, Promise<string | null>>()
  const failedTitles = new Set<string>()

    resolveLinkTitle: (url) => {
-     if (inFlightTitles.has(url) || failedTitles.has(url) || get().linkTitles[url]) return
-     inFlightTitles.add(url)
-     dialer()
-       .ask('linkTitles:fetch', url)
-       .then((res) => {
-         // A late fetch resolving after a nexus switch merges harmlessly: …
-         const title = res.ok ? res.value.title : null
-         if (title) set((s) => ({ linkTitles: { ...s.linkTitles, [url]: title } }))
-         else failedTitles.add(url)
-       })
-       .finally(() => inFlightTitles.delete(url))
+     const cached = get().linkTitles[url]
+     if (cached) return Promise.resolve(cached)
+     if (failedTitles.has(url)) return Promise.resolve(null)
+     const flying = inFlightTitles.get(url)
+     if (flying) return flying
+     const fetch = dialer()
+       .ask('linkTitles:fetch', url)
+       .then((res) => {
+         // A late fetch resolving after a nexus switch merges harmlessly: a URL's <title> is identical in any nexus, and main won't persist it cross-nexus.
+         const title = (res.ok && res.value.title) || null
+         if (title) set((s) => ({ linkTitles: { ...s.linkTitles, [url]: title } }))
+         else failedTitles.add(url)
+         return title
+       })
+       .finally(() => inFlightTitles.delete(url))
+     inFlightTitles.set(url, fetch)
+     return fetch
    },
```

```Core/MarkdownPM/api.ts diff
    linkTitles: {
      get(url: string): string | null
-     resolve(url: string): void
+     resolve(url: string): Promise<string | null>
      subscribe(cb: () => void): () => void
    }
```

Every current caller (`pasteLink.ts:62`, `linkFormat.ts:85`, `cellStatic.tsx:474`, `LinkCell.tsx:37`, `WebTile.tsx:27`) ignores the return; mark each `void` where lint asks.

**VERIFY**

- [ ] Run the gates; `pendingTitle.test.ts` still passes on the subscription it reads until Task 5-3.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] One reviewer reads the three editor mounts and `editorHost.tsx` for a connections source that isn't the host (a prop, a ref, a facet), and the `EditorHost` contract for a member two phases could still disagree about (`connections`, `headingsOf`, `linkTitles.resolve`).
- [ ] The index reseed is confirmed on a real database (`index_generation` 12), and `index:headings` round-trips text and level into the session.
- [ ] Gates green; delta reported.

### Phase 4 — Looks and Resolution

**GOAL:** One function decides how a link looks, and both renderers draw from it: unresolved links share one treatment whichever syntax wrote them, an ambiguous markdown link draws in the ambiguous tone, **Display Unresolved Links As Plain Syntax** reaches every surface, the resting renderer nests tokens so a link inside emphasis draws and acts, `§` runs draw and follow at rest, a Text value draws against its page's headings, and a Link value's target is resolved through the editor's own chain. The resting hit carries its target once. These are the pieces the menus and the Link value read, so they land before them.

#### Task 4-1 — One look rule and one unresolved treatment

**TASK:** `linkLook(conn, text, tk, ownKeys, headingLinkStyle)` in `connectionsApi.ts` returns a link's target, status, missing mark, bare flag, and heading join; `linkClass(look)` is the class its shown text wears. `wikiLinkView`, `WikiLinkView`, `mdLinkClass`, and `MD_LINK_CLASS` go; `md-link-invalid` merges into `md-connection-phantom` and `md-unresolved-syntax` into `md-phantom-syntax`; `MdTarget`'s `external` arm becomes `url` and `GlanceTarget`'s `site` becomes `url`.

**NOW:** Two renderers decide one look (synthesis §3.6): `build` (`decorations.ts:557-664`) and `renderCellContent` (`cellStatic.tsx:72-141`) each state the heading join (`showPage`, `resolved && !alias`) and the phantom spans; `mdLinkClass` maps every `invalid` target to `md-link-invalid`, so an ambiguous markdown link draws as broken (B-62) and underlined (B-63) where a connection to the same title draws `md-connection-ambiguous`; `cellStatic.tsx:10` imports the CodeMirror draw module for two names; `linkClicks.ts:60,135` and `cellStatic.tsx:255` hold three "is this a link" selectors, two of whose class arms never decide anything (B-41).

**CHANGE**

- [ ] Write the tests: `mdLinkTarget.test.tsx:158` and `externalLink.test.tsx:80` rewritten so `[x](Dup)` with two Dup pages draws `md-connection-ambiguous`, `[x](dup.io)` with two `dup.io` pages draws the same (an ambiguous title is never an address, the input Task 4-5 pins on `valueTarget` and Task 2-1 on `readLinkText`), and `[x](Missing)` draws `md-connection-phantom` with no underline rule; a cellStatic test: a resting `[x](Missing)` draws its `[`, `](Missing)` as `md-phantom-syntax` spans around a `md-connection-phantom` label. Watch them fail.
- [ ] Add `linkLook` and `linkClass`; rewrite the two draw sites; delete the four names; inline `'md-link'`.
- [ ] CSS: merge the rules; delete the `md-link-invalid` underline.
- [ ] `MdTarget` `'external'` → `'url'` (`connectionsApi.ts`, `linkClicks.ts`, `decorations.ts`, `cellStatic.tsx`, `linkMenuTarget`); `GlanceTarget` `'site'` → `'url'` (`api.ts`, `GlancePane.tsx`, `linkClicks.ts`, `glanceAction.ts` if it switches on it).
- [ ] `linkClicks.ts`: `linkUnder`'s `hidesSyntax` reads the look's status; the two selectors read the merged classes.

**AFTER**

```Core/MarkdownPM/Links/connectionsApi.ts diff
- interface WikiLinkView { status: LinkStatus; bare: boolean; missing: boolean }
- export function wikiLinkView(conn, text, tk, ownKeys): WikiLinkView { … }
+ export interface LinkLook {
+   target: MdTarget
+   status: LinkStatus
+   /** The heading the link names isn't among its page's known headings. */
+   missing: boolean
+   /** A bare `[[#Heading]]`, which shows no page half. */
+   bare: boolean
+   /** A resolved, unaliased heading link draws as `Page § Heading`; null where the link shows its text as written. */
+   join: { showPage: boolean; heading: Span } | null
+ }
+
+ /** How a link looks, for both renderers: what it points to, whether that resolves, and how a heading link joins its halves. An invalid markdown link reads as a phantom, or ambiguous when its title is. */
+ export function linkLook(
+   conn: ConnectionsApi | undefined,
+   text: string,
+   tk: TokenOf<LinkKind>,
+   ownKeys: readonly string[] | undefined,
+   headingLinkStyle: HeadingLinkStyle,
+ ): LinkLook {
+   const target = tokenTarget(conn, text, tk)
+   const status = linkStatus(target)
+   const bare = target.kind === 'self'
+   const join =
+     tk.kind === 'wikiLink' && tk.heading && status === 'resolved' && !aliasedToken(tk)
+       ? { showPage: headingLinkStyle !== 'heading-only' && !bare, heading: tk.heading }
+       : null
+   return { target, status, missing: headingMissing(conn, target, ownKeys), bare, join }
+ }
+
+ /** The class a link's shown text wears; a joined heading link marks its missing heading on the heading half instead. */
+ export function linkClass(look: LinkLook): string {
+   if (look.status !== 'resolved') return `md-connection-${look.status}`
+   if (look.target.kind === 'url') return 'md-link'
+   return cx('md-connection-resolved', look.missing && !look.join && 'md-connection-heading-missing')
+ }

@@ MdTarget @@
-   | { kind: 'external'; url: string }
+   | { kind: 'url'; url: string }
@@ resolveMdTarget @@
-   if (target.kind !== 'invalid' || !isValidLink(rawTarget)) return target
+   if (target.kind !== 'invalid' || target.ambiguous || !isValidLink(rawTarget)) return target
-   return { kind: 'external', url: rawTarget }
+   return { kind: 'url', url: rawTarget }
@@ linkMenuTarget @@
-     case 'external':
+     case 'url':
```

```Core/MarkdownPM/decorations.ts diff
- export const MD_LINK_CLASS = 'md-link'
- export function mdLinkClass(conn, target, ownKeys): string { … }

@@ build · the link loop @@
    tokens.forEach((tk, i) => {
      if (tk.kind !== 'link') return
      const [open, close] = tk.markerRanges
      const bracketEnd = close[0] + 1
-     const target = tokenTarget(conn, text, tk)
-     const valid = target.kind !== 'invalid'
-     const internal = target.kind === 'page' || target.kind === 'self'
+     const look = linkLook(conn, text, tk, ownKeys, headingLinkStyle)
+     const shown = look.status !== 'phantom'
+     const internal = look.target.kind === 'page' || look.target.kind === 'self'
      const isActive = active.has(i)
      ranges.push(
-       Decoration.mark({ class: cx(mdLinkClass(conn, target, ownKeys), internal && isActive && 'md-connection-open') }).range(…),
+       Decoration.mark({ class: cx(linkClass(look), internal && isActive && 'md-connection-open') }).range(…),
      )
-     const dim = Decoration.mark({ class: valid ? 'md-control' : 'md-unresolved-syntax' })
-     if (!valid || isActive) {
+     const dim = Decoration.mark({ class: shown ? 'md-control' : 'md-phantom-syntax' })
+     if (!shown || isActive) {
        …
-           class: internal ? 'md-connection-target' : valid ? 'md-link-url' : 'md-unresolved-syntax',
+           class: internal ? 'md-connection-target' : shown ? 'md-link-url' : 'md-phantom-syntax',

@@ build · the wikiLink loop @@
-   if (conn) {
-     const { headingLinkStyle } = settings
      tokens.forEach((tk, i) => {
-       if (tk.kind !== 'wikiLink') return
+       if (tk.kind !== 'wikiLink' || !conn) return
        const alias = aliasedToken(tk)
        const [rs, re] = tk.resolveRange
-       const { status, bare, missing } = wikiLinkView(conn, text, tk, ownKeys)
+       const look = linkLook(conn, text, tk, ownKeys, headingLinkStyle)
+       const { status, bare, missing, join } = look
        …
-       if (tk.heading && !open && !alias && status === 'resolved') {
+       if (join && !open) {
          const [hs, he] = tk.heading
-         const showPage = headingLinkStyle !== 'heading-only' && !bare
          if (!bare)
            ranges.push(
-             (showPage ? Decoration.mark({ class: 'md-connection-resolved' }) : hideMarker).range(rs, re),
+             (join.showPage ? Decoration.mark({ class: 'md-connection-resolved' }) : hideMarker).range(rs, re),
            )
-         ranges.push(Decoration.replace({ widget: new HeadingJoinWidget(showPage) }).range(hs - 1, hs))
+         ranges.push(Decoration.replace({ widget: new HeadingJoinWidget(join.showPage) }).range(hs - 1, hs))
          …
        }
        if (status === 'phantom') { … unchanged … }
        ranges.push(
          Decoration.mark({
-           class: cx(`md-connection-${status}`, open && 'md-connection-open', alias && missing && 'md-connection-heading-missing'),
+           class: cx(linkClass(look), open && 'md-connection-open'),
          }).range(tk.contentRange[0], tk.contentRange[1]),
        )
```

`headingLinkStyle` is read once at the top of `build` from `settings`.

```Core/MarkdownPM/Links/linkClicks.ts diff
@@ linkUnder @@
-   const target = heldTarget(tokenTarget(api, docString(view.state.doc), tk), ownPage(view))
+   const named = tokenTarget(api, docString(view.state.doc), tk)
+   const target = heldTarget(named, ownPage(view))
    const el = (event.target as HTMLElement).closest?.(
-     `.md-connection-resolved, .md-connection-ambiguous, .md-heading-symbol, .${MD_LINK_CLASS}, .md-link-invalid`,
+     '.md-connection-resolved, .md-connection-ambiguous, .md-heading-symbol, .md-link',
    )
    return {
      tk, target, range: tk.range,
      onText: el != null && pos >= tk.contentRange[0] && pos <= tk.contentRange[1],
-     hidesSyntax: target.kind !== 'invalid' || (tk.kind === 'wikiLink' && target.ambiguous === true),
+     hidesSyntax: linkStatus(named) !== 'phantom',
      pos,
    }
@@ linkPointer @@
-   hoverGate: `.md-connection-resolved, .${MD_LINK_CLASS}`,
+   hoverGate: '.md-connection-resolved, .md-link',
```

`linkStatus` (`connectionsApi.ts:131`) stays as the one status rule: `linkLook` reads it for both renderers, and `linkUnder`, which wants only the target and its status, reads it directly.

```Core/MarkdownPM/markdown-pm.css diff
- .md-link-invalid,
  .md-connection-phantom {
    color: var(--label-primary);
    opacity: var(--state-inactive);
  }
- .md-link-invalid {
-   text-decoration: underline;
- }
- .md-unresolved-syntax,
  .md-phantom-syntax {
    color: var(--label-control);
  }
```

```Core/MarkdownPM/api.ts diff
  export type GlanceTarget =
    | { kind: 'page'; id: string; path: string; heading?: string }
-   | { kind: 'site'; url: string }
+   | { kind: 'url'; url: string }
```

`cellStatic.tsx`'s draw is rewritten whole in Task 4-3 (it reads `linkLook` and `linkClass` there); in this task change only its import and its `'external'`/`MD_LINK_CLASS` reads so the gates stay green.

**VERIFY**

- [ ] `grep -rn "wikiLinkView\|mdLinkClass\|MD_LINK_CLASS\|md-link-invalid\|md-unresolved-syntax\|'external'\|'site'" Core --include='*.ts' --include='*.tsx' --include='*.css' | grep -v test` is empty (`AssetValue`'s `'external'` in `assetUrl.ts` is unrelated and stays).
- [ ] Run the gates; `blockMenuFlow.test.tsx:301,308` and `textScope.test.tsx` pass or are rewritten to the merged classes.
- [ ] In `~/Test`: `[x](Missing)` and `[[Missing]]` draw alike; `[x](Dup)` and `[[Dup]]` draw alike; `[x](https://example.com)` keeps the link color and underline.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-2 — Plain syntax everywhere, and the slash menu's own look

**TASK:** `md-unresolved-fixed` goes from the resting renderer and the CSS, so the `:root.plain-unresolved` override reaches cells and values at rest; the `/` menu's query gets a class of its own.

**NOW:** Only `cellStatic.tsx:84,87,88,136` emit `md-unresolved-fixed`, which the override skips (`markdown-pm.css:245-252`), so the setting restyles live cells and Text panes but not their resting forms (B-60); `blockQuery.ts:29-30` marks the `/` query with the phantom classes, so the setting restyles the slash menu's query (B-61).

**CHANGE**

- [ ] Write the test: a resting cell's phantom spans carry no `md-unresolved-fixed` class (cellStatic test); the block query marks `md-control` and `md-block-query` (`blockQuery.test.ts` or `blockMenuFlow.test.tsx`). Watch them fail.
- [ ] Delete the four emits and the `:not()` arms; add the query's class and its one rule.

**AFTER**

```Core/MarkdownPM/markdown-pm.css diff
- :root.plain-unresolved .md-connection-phantom:not(.md-unresolved-fixed) {
+ :root.plain-unresolved .md-connection-phantom {
    color: inherit;
    opacity: 1;
  }
- :root.plain-unresolved .md-phantom-syntax:not(.md-unresolved-fixed) {
+ :root.plain-unresolved .md-phantom-syntax {
    color: inherit;
  }
+ .md-block-query {
+   color: var(--label-primary);
+   opacity: var(--state-inactive);
+ }
```

```Core/MarkdownPM/Menus/blockQuery.ts diff
- const querySlash = Decoration.mark({ class: 'md-phantom-syntax' })
- const queryText = Decoration.mark({ class: 'md-connection-phantom' })
+ const querySlash = Decoration.mark({ class: 'md-control' })
+ const queryText = Decoration.mark({ class: 'md-block-query' })
```

**VERIFY**

- [ ] `grep -rn "md-unresolved-fixed" Core` is empty.
- [ ] In `~/Test` with Display Unresolved Links As Plain Syntax on: a resting table cell's `[[Missing]]` reads as plain prose, and typing `/` shows the muted query as before.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-3 — The resting renderer nests, draws every span, and draws `§` runs

**TASK:** `renderCellContent` draws each token's content through the tokens inside it, draws every token as a span, reads `linkLook`/`linkClass`, and draws `§Heading` runs over the page's outline when In-Page Heading Resolution is Automatic; `CellPage` carries `sectionHeadings`, filled by the widget.

**NOW:** `renderCellContent` (`cellStatic.tsx:55-179`) skips every token that starts inside an earlier one, so `**a [[P]] b**` draws `[[P]]` as raw text with no `data-link-span` (X-12, M10-01); its final `else` has an unreachable classless arm (M10-05); it has no `§` pass, so a run draws live and not at rest (B-58). `cellPage` (`widget.tsx:499-512`) carries `ordinalOf` and `ownKeys`; `StaticCell`'s memo re-renders on an outline change only for a same-page link (`cellStatic.tsx:480-486`).

**CHANGE**

- [ ] Write the tests (cellStatic tests): `**a [[P]] b**` with P resolved draws a `md-bold` span (`data-src="0,13"`) holding a `md-connection-resolved` span with `data-link` and `data-src="5,10"`; `[x **b**](https://a.com)` draws a `md-link` span holding a `md-bold` span; `see §Setup` with `sectionHeadings: ['Setup']` draws a `md-section-run` span with `data-link`; every token kind draws a span carrying `data-src` (`*a*` → `md-italic`). Watch them fail.
- [ ] Rewrite `renderCellContent` as below; every token span carries `data-src="s,e"` (the source range, offset by `base`) and a link span additionally `data-link`; `linkSpanAt` reads `[data-link]`'s `data-src`; `CellPage.sectionHeadings`; `cellPage(doc, text, automatic)`; the memo learns `§`.

**AFTER**

```Core/MarkdownPM/Tables/cellStatic.tsx diff
  export interface CellPage {
-   ordinalOf: (label: string) => number | null
+   ordinalOf?: (label: string) => number | null
    ownKeys: readonly string[]
+   /** The page's heading text, for a `§Heading` run; empty unless In-Page Heading Resolution is Automatic and the text holds a `§`. */
+   sectionHeadings: readonly string[]
  }

- /** A cell reads its page's headings only through a same-page link. */
- export const linksOwnHeadings = (text: string): boolean => /\[\[#|\]\(\s*#/.test(text)
+ /** A cell reads its page's headings through a same-page link or a `§` run. */
+ export const linksOwnHeadings = (text: string): boolean => /\[\[#|\]\(\s*#|§/.test(text)

+ type Drawn = Token | { kind: 'section'; range: Span; contentRange: Span }

  export function renderCellContent(
    text: string,
    getConn?: () => ConnectionsApi | undefined,
    { around, headingLinkStyle, base = 0 }: { around?: CellPage; headingLinkStyle?: HeadingLinkStyle; base?: number } = {},
  ): React.ReactNode {
+   const runs =
+     around && around.sectionHeadings.length > 0 && text.includes('§')
+       ? sectionRunsIn(text, around.sectionHeadings, codeMask(text))
+       : []
    // No markdown-significant char → no token possible, so skip the mdast parse; this is the per-cell cost of a table scrolling in.
-   if (!holdsTokens(text)) return text
-   const tokens = cellTokens(text)
-   if (tokens.length === 0) return text
+   const held = holdsTokens(text) ? cellTokens(text) : []
+   if (held.length === 0 && runs.length === 0) return text
+   // The memo hands out its own array, so runs join a copy of it.
+   const tokens: readonly Drawn[] = runs.length
+     ? [...held, ...runs.map((r): Drawn => ({ kind: 'section', range: [r.from, r.to], contentRange: [r.from, r.to] }))].sort((a, b) => a.range[0] - b.range[0])
+     : held
    const conn = getConn?.()
-   const out: React.ReactNode[] = []
-   let pos = 0
    let key = 0
-   for (const tk of tokens) {
-     const [s, e] = tk.range
-     if (s < pos) continue
-     if (s > pos) out.push(text.slice(pos, s))
-     const content = text.slice(tk.contentRange[0], tk.contentRange[1])
-     if (tk.kind === 'wikiLink') { … }
-     else if (tk.kind === 'link') { … }
-     else if (tk.kind === 'htmlTag') { … }
-     else if (tk.kind === 'citationRef') { … }
-     else { const cls = contentClass(tk); out.push(cls ? <span …>{content}</span> : content) }
-     pos = e
-   }
-   if (pos < text.length) out.push(text.slice(pos))
-   return out
+   // Every span names the source it draws, so a pointer in the rendered text can be mapped back to an offset; a link's span is also marked as the element a link gesture resolves.
+   const src = (s: number, e: number): { 'data-src': string } => ({ 'data-src': `${base + s},${base + e}` })
+   const linkSpan = (s: number, e: number): { 'data-src': string; 'data-link': '' } => ({ ...src(s, e), 'data-link': '' })
+   // Tokens nest — a link inside emphasis, emphasis inside a label — so a token's content is drawn through the tokens inside it, and every token draws a span.
+   const draw = (from: number, to: number, within: readonly Drawn[]): React.ReactNode[] => {
+     const out: React.ReactNode[] = []
+     let pos = from
+     within.forEach((tk, i) => {
+       const [s, e] = tk.range
+       if (s < pos) return
+       if (s > pos) out.push(text.slice(pos, s))
+       const [cs, ce] = tk.contentRange
+       const inner = within.slice(i + 1).filter((t) => t.range[0] >= cs && t.range[1] <= ce)
+       out.push(drawOne(tk, inner))
+       pos = e
+     })
+     if (pos < to) out.push(text.slice(pos, to))
+     return out
+   }
+   const drawOne = (tk: Drawn, inner: readonly Drawn[]): React.ReactNode => {
+     const [s, e] = tk.range
+     const [cs, ce] = tk.contentRange
+     switch (tk.kind) {
+       case 'section':
+         return <span key={key++} className="md-connection-resolved md-section-run" {...linkSpan(s, e)}>{text.slice(s, e)}</span>
+       case 'wikiLink':
+       case 'link': {
+         if (tk.kind === 'wikiLink' && !conn) return text.slice(s, e)
+         const look = linkLook(conn, text, tk, around?.ownKeys, headingLinkStyle)
+         if (look.status === 'phantom')
+           return (
+             <Fragment key={key++}>
+               <span className="md-phantom-syntax">{text.slice(s, cs)}</span>
+               <span className="md-connection-phantom">{text.slice(cs, ce)}</span>
+               <span className="md-phantom-syntax">{text.slice(ce, e)}</span>
+             </Fragment>
+           )
+         const { join } = look
+         return (
+           <span key={key++} className={linkClass(look)} {...linkSpan(s, e)}>
+             {join && tk.kind === 'wikiLink' ? (
+               <>
+                 {join.showPage && text.slice(tk.resolveRange[0], tk.resolveRange[1])}
+                 <span className={cx('md-heading-symbol', join.showPage && 'md-heading-symbol-spaced')}>§</span>
+                 <span className={cx('md-connection-heading', look.missing && 'md-connection-heading-missing')}>
+                   {text.slice(join.heading[0], join.heading[1])}
+                 </span>
+               </>
+             ) : (
+               draw(cs, ce, inner)
+             )}
+           </span>
+         )
+       }
+       case 'htmlTag': {
+         const [open, close] = tk.markerRanges
+         return (
+           <Fragment key={key++}>
+             <span className="md-bracket">{text.slice(open[0], open[1])}</span>
+             <span className="md-html-tag">{text.slice(cs, ce)}</span>
+             <span className="md-bracket">{text.slice(close[0], close[1])}</span>
+           </Fragment>
+         )
+       }
+       case 'citationRef': {
+         const label = text.slice(cs, ce)
+         const n = around?.ordinalOf?.(label) ?? null
+         return n === null ? text.slice(s, e) : <span key={key++} className="md-citation-reference" data-cite-label={label}>{n}</span>
+       }
+       default:
+         return <span key={key++} className={contentClass(tk)} {...src(s, e)}>{draw(cs, ce, inner)}</span>
+     }
+   }
+   return draw(0, text.length, tokens)
  }

@@ linkSpanAt @@
- const LINK_SELECTOR = `.${MD_LINK_CLASS}, .md-connection-resolved, [data-link-span]`
- function linkSpanAt(target: EventTarget | null): [number, number] | null {
-   const el = (target as HTMLElement | null)?.closest?.(LINK_SELECTOR)
-   const raw = (el as HTMLElement | undefined)?.dataset.linkSpan?.split(',')
+ /** The source range a drawn span names. */
+ export function srcOf(el: Element): Span | null {
+   const raw = (el as HTMLElement).dataset.src?.split(',')
    if (raw?.length !== 2) return null
    return [Number(raw[0]), Number(raw[1])]
  }
```

The `htmlTag` and phantom pieces and `MarkerGlyph` draw without `data-src` here; Phase 9's mapper adds what it needs to them.

`contentClass` returns `string | undefined`; with `embed` gone every kind the default arm reaches has an entry, so make `CONTENT_CLASS` a full `Record<Exclude<TokenKind, LinkKind | 'citationRef'>, string>` in `intents.ts` and `contentClass`'s return `string`.

```Core/MarkdownPM/Tables/cellStatic.tsx diff
@@ StaticCell memo @@
-     (a.around === b.around || !(linksOwnHeadings(a.text) || a.text.includes('[^'))),
+     (a.around === b.around || !(linksOwnHeadings(a.text) || a.text.includes('[^'))),
```

(unchanged in text; `linksOwnHeadings` now covers `§`.)

```Core/MarkdownPM/Tables/widget.tsx diff
@@ cellPage @@
- function cellPage(doc: Text, text: string): CellPage {
+ function cellPage(doc: Text, text: string, automatic: boolean): CellPage {
    const linksHeadings = linksOwnHeadings(text)
-   const key = linksHeadings ? `${citeKey(doc)}\n${headingKey(doc)}` : citeKey(doc)
+   const runs = automatic && text.includes('§')
+   const key = linksHeadings ? `${citeKey(doc)}\n${headingKey(doc)}\n${runs}` : citeKey(doc)
    let page = cellPages.get(key)
    if (!page) {
      const numbers = ordinals(doc)
      page = {
        ordinalOf: (label) => numbers.get(foldLabel(label)) ?? null,
        ownKeys: linksHeadings ? docHeadingKeys(doc) : [],
+       sectionHeadings: runs ? docSectionHeadings(doc) : [],
      }
```

Every `cellPage(doc, text)` call passes `state.facet(editorHost).settings().inPageHeadingResolution === 'automatic'` (the widget build and `rebuiltTable`); `headingKey` already keys the cache on the page's headings.

**VERIFY**

- [ ] `cellStatic.test.tsx`, `cellLinks.test.tsx`, `textScope.test.tsx` pass with the new cases; the token-less fast path still returns the bare string for `plain text`.
- [ ] Run the gates.
- [ ] In `~/Test`, a table cell holding `**see [[Alpha]]**` and `§Setup` (Automatic on) draws the link in bold and the run in the connection color at rest and live alike.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-4 — A Text value draws against its page and follows a `§` run

**TASK:** `TextCell` passes its holder's headings and the Heading Link Style to the renderer (F-062), so a resting Text value's heading links carry the missing mark and the style, and a `§` run in a resting cell or Text value follows as a live one does.

**NOW:** `TextCell.tsx:60` passes neither `around` nor `headingLinkStyle`; its gestures already convert through `heldTarget` (`:27,41`), so the draw disagrees with the follow. `cellLinkTarget` (`cellStatic.tsx:436-446`) reads a token for every hit, and a `§` run has none.

**CHANGE**

- [ ] Write the tests: a `TextCell` with `holder` and a `connections` whose `headingsOf` answers `{ keys: ['setup'], texts: ['Setup'], outline: [...] }` draws `[[#Nope]]` with `md-connection-heading-missing` and, with Automatic on, draws `§Setup` as a run; clicking the run calls `open(holder, 'Setup')`. Watch them fail.
- [ ] `TextCell` builds `around` from the holder; `cellLinkTarget` gains the run arm (Task 4-5 writes the hit shape; land both in one commit).

**AFTER**

```Core/Properties/Cells/TextCell.tsx diff
  export function TextCell({ text, connections, holder, onPane, … }) {
    const hostRef = useRef<HTMLDivElement>(null)
    const own = holder ? ({ kind: 'held', page: holder } as const) : null
+   const headingLinkStyle = useSetting('headingLinkStyle')
+   const automatic = useSetting('inPageHeadingResolution') === 'automatic'
+   const headings = holder && connections?.()?.headingsOf(holder.path)
+   const around: CellPage | undefined = headings && {
+     ownKeys: headings.keys,
+     sectionHeadings: automatic ? headings.texts : [],
+   }
    …
-             {renderCellContent(line, connections, { base: starts[i] })}
+             {renderCellContent(line, connections, { base: starts[i], around, headingLinkStyle })}
```

```Core/MarkdownPM/Tables/cellStatic.tsx diff
@@ cellLinkTarget @@
+   if (el.classList.contains('md-section-run'))
+     return { el, span, target: heldTarget(titleTarget(undefined, '', (el.textContent ?? '').slice(1)), own) }
```

**VERIFY**

- [ ] `LinkCell.test.tsx` / a `TextCell.test.tsx` case covers the missing mark and the run.
- [ ] Run the gates.
- [ ] In `~/Test`, a Text value `see §Setup` on a page with a Setup heading draws the run at rest and clicking it opens the page at Setup.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-5 — The value's resolved target and one hit shape

**TASK:** `valueTarget(api, raw, holder)` resolves a Link value through `tokenTarget` and `heldTarget`, the chain every editor link uses; `linkGestures.linkAt` returns one hit with its target converted once; `dwellTarget` reads `isHttpLink`; `wholeLinkToken` is the one "a token spanning the whole text" rule.

**NOW:** A Link value resolves through `resolveConnection` (`LinkCell.tsx:75`, `connectionMenuActions.ts:90`), whose ambiguity-null blanks the ambiguous tone and the open (B-27). `linkGestures.linkAt` returns the unconverted target, so `heldTarget` runs again at the read-only menu and the dwell (`cellStatic.tsx:411,430`), and the resting menu re-derives the span and token (`:289-290`). `dwellTarget` spells the address gate as `WEB_ADDRESS.test(normalizeLinkUrl(x))` (`linkClicks.ts:128`). `loneTarget` (`citationPointer.ts:19-23`) already finds the token spanning a whole text.

**CHANGE**

- [ ] Write the tests: `valueTarget(api, '[[Old|a]]')` → page; `valueTarget(api, '[[#H]]', holder)` → `{ kind: 'page', page: holder, heading: 'H' }`; `valueTarget(api, '[[Dup]]')` → `{ kind: 'invalid', ambiguous: true }`; `valueTarget(api, '[x](dup.io)')` with two `dup.io` pages → `{ kind: 'invalid', ambiguous: true }`; `valueTarget(api, '[x](example.com)')` → `{ kind: 'url', url: 'example.com' }`; `valueTarget(api, 'https://a.com')` → url; `valueTarget(api, 'foo')` → invalid; `valueTarget(api, '[a](b) [c](d)')` → invalid. Watch them fail.
- [ ] `wholeLinkToken(tokens, text)` in `tokens.ts`; `loneTarget` reads it; `valueTarget` in `Core/Properties/Cells/valueTarget.ts` reads it through `cellTokens` (exported from `cellStatic.tsx`).
- [ ] `linkGestures` returns the converted hit; `readOnlyMenu` and `onPointerOver` drop their `heldTarget`; `StaticCellImpl.menuAt` reads `found.tk`/`found.span` (its body is Task 6-4's).
- [ ] `dwellTarget` reads `isHttpLink`.

**AFTER**

```Core/MarkdownPM/Engine/tokens.ts diff
+ /** The link or connection that is the whole of `text`, or none: a Link value, a footnote's lone link. */
+ export const wholeLinkToken = (tokens: readonly Token[], text: string): TokenOf<LinkKind> | undefined =>
+   tokens.find((t): t is TokenOf<LinkKind> => (t.kind === 'link' || t.kind === 'wikiLink') && t.range[0] === 0 && t.range[1] === text.length)
```

```Core/MarkdownPM/Citations/citationPointer.ts diff
  export function loneTarget(content: string): { text: string; tk: Token } | null {
    const text = content.trim()
-   const tk = tokenize(text).find((t) => t.range[0] === 0 && t.range[1] === text.length)
-   return tk?.kind === 'wikiLink' || tk?.kind === 'link' ? { text, tk } : null
+   const tk = wholeLinkToken(tokenize(text), text)
+   return tk ? { text, tk } : null
  }
```

```Core/Properties/Cells/valueTarget.ts diff
+ import { cellTokens } from '../../MarkdownPM/Tables/cellStatic'
+ import { wholeLinkToken } from '../../MarkdownPM/Engine/tokens'
+ import { type MdTarget, tokenTarget, type ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
+ import { heldTarget } from '../../MarkdownPM/Links/linkClicks'
+ import { isValidLink } from '../../Paths/urlPath'
+ import type { ConnPage } from '../../Connections/pageIndex'
+
+ /** What a Link value points to, through the chain every editor link resolves by: a whole-token value reads as its token does, with a bare `[[#Heading]]` answered by the holder; a bare address is itself; text that is neither names nothing. */
+ export function valueTarget(api: ConnectionsApi | undefined, raw: string, holder?: ConnPage): MdTarget | null {
+   const text = raw.trim()
+   const tk = wholeLinkToken(cellTokens(text), text)
+   if (tk) return heldTarget(tokenTarget(api, text, tk), holder ? { kind: 'held', page: holder } : null)
+   return isValidLink(text) ? { kind: 'url', url: text } : null
+ }
```

```Core/MarkdownPM/Tables/cellStatic.tsx diff
- const cellTokens = perText(tokenize, 4096)
+ export const cellTokens = perText(tokenize, 4096)

+ /** A link under the pointer in a resting surface, its target converted once; `tk` and `span` are absent on a `§` run, which no token holds. */
+ export interface RestingHit {
+   el: Element
+   span: Span
+   target: MdTarget
+   tk?: TokenOf<LinkKind>
+ }

@@ linkGestures @@
  export function linkGestures(text, connections, glance, own: OwnPage | null = null, menuAt?: (e: React.MouseEvent, hit: RestingHit, api: ConnectionsApi) => ConnMenuTarget | null) {
-   const linkAt = (e: React.SyntheticEvent): ReturnType<typeof cellLinkTarget> => cellLinkTarget(text, e.target, connections?.())
+   const linkAt = (e: React.SyntheticEvent): RestingHit | null => cellLinkTarget(text, e.target, connections?.(), own)
    …
    const readOnlyMenu = (e: React.MouseEvent): ConnMenuTarget | null => {
      const found = linkAt(e)
-     return found && linkMenuTarget(heldTarget(found.target, own))
+     return found && linkMenuTarget(found.target)
    }
    return {
      linkAt, dismiss,
      onContextMenu: (e) => {
        dismiss(e)
        const api = connections?.()
        if (!api?.menu) return false
-       const target = menuAt ? menuAt(e, api) : readOnlyMenu(e)
+       const found = linkAt(e)
+       if (!found?.tk) return false
+       const target = menuAt ? menuAt(e, found, api) : linkMenuTarget(found.target)
        …
      onPointerOver: (e) => {
        const found = glance && linkAt(e)
-       if (found) dwellTarget(heldTarget(found.target, own), glance, found.el)?.()
+       if (found?.tk) dwellTarget(found.target, glance, found.el)?.()
      },

- function cellLinkTarget(text, eventTarget, api): { el: Element; target: MdTarget } | null {
-   const el = (eventTarget as HTMLElement | null)?.closest?.(LINK_SELECTOR)
-   if (!el || !api) return null
-   const span = linkSpanAt(eventTarget)
-   const tk = span && linkTokenAt(cellTokens(text), span[0])
-   return tk ? { el, target: tokenTarget(api, text, tk) } : null
- }
+ function cellLinkTarget(text: string, eventTarget: EventTarget | null, api: ConnectionsApi | undefined, own: OwnPage | null): RestingHit | null {
+   const el = (eventTarget as HTMLElement | null)?.closest?.('[data-link]')
+   const span = el && srcOf(el)
+   if (!el || !span || !api) return null
+   if (el.classList.contains('md-section-run'))
+     return { el, span, target: heldTarget(titleTarget(undefined, '', (el.textContent ?? '').slice(1)), own) }
+   const tk = linkTokenAt(cellTokens(text), span[0])
+   return tk ? { el, span, tk, target: heldTarget(tokenTarget(api, text, tk), own) } : null
+ }
```

A `§` run is prose that follows: it draws and a click travels, but it carries no token, so it gets no menu and no glance, at rest as in the body (`sectionRunAt`, `linkClicks.ts:31`); only a token hit reaches the menu and the dwell.

`LINK_SELECTOR`, `linkSpanAt`, and the `readOnlyMenu` closure go (`linkMenuTarget(found.target)` is the one default); the right-press claim in `StaticCellImpl.onMouseDown` reads `closest('[data-link]')` until Phase 9 claims every right press.

```Core/MarkdownPM/Links/linkClicks.ts diff
@@ dwellTarget @@
-   if (target.kind !== 'external') return null
-   const web = normalizeLinkUrl(target.url)
-   return WEB_ADDRESS.test(web) ? () => glance.arm({ kind: 'site', url: web }, el) : null
+   if (target.kind !== 'url' || !isHttpLink(target.url)) return null
+   return () => glance.arm({ kind: 'url', url: normalizeLinkUrl(target.url) }, el)
```

**VERIFY**

- [ ] `grep -rn "heldTarget(" Core --include='*.ts' --include='*.tsx' | grep -v test` lists `linkClicks.ts` (`linkUnder`, `resolveFollow`), `cellStatic.tsx` (`cellLinkTarget`), and `valueTarget.ts` only.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] One reviewer reads both renderers against `linkLook` for a look decided outside it (a class literal, a status derived from a target, a join rule), and the resting renderer's `draw` for a token drawn twice or skipped.
- [ ] **Hand-check (Nathan):** a visual pass on link looks across the body, live and resting cells, and Text values: resolved, phantom, ambiguous, heading links in both styles, nested in emphasis, and `§` runs, with the plain-syntax setting on and off.
- [ ] Gates green; delta reported.

### Phase 5 — Opening and Titles

**GOAL:** An address opens in the right place and only a web address is offered a page title; one hook fetches a title for display; and a pending title settles through the promise Phase 3 made, so the subscription sweep goes, a failed fetch settles, a surface without an editor can wait for a title, and a live cell or TextPane closing with a swap pending hands it forward. The menus (Phase 6), the paste pipeline (Phase 7), and the resting cell (Phase 9) all write through `writeLinkAt` and `forwardTitles`, so these land first.

#### Task 5-1 — Addresses that open and titles that fetch

**TASK:** `openWebLink` sends only an `isHttpLink` address to the in-app browser and everything else to the system; `openBrowser` normalizes the address it's handed; Paste As offers Page Title only for a web address.

**NOW:** `openWebLink.ts:9` passes any address raw to `openBrowser` when **Open Links In Pommora** is on, so `[x](example.com)` and a `mailto:` reach the guest, whose attach gate refuses anything without a written `http(s)://` (`webGuests.ts:18,150-157`), leaving a blank window (B-54); `URL_ROWS` offers Page Title for any `isValidLink` address (`pasteAsMenu.ts:59-62`), and `fetchPageTitle` refuses non-http addresses (`linkTitles.ts:9`).

**CHANGE**

- [ ] Write the tests: `openWebLink('mailto:a@b.co')` with the setting on asks `link:open`; `openWebLink('example.com')` with it on calls `openBrowser`, and the summon's URL is `https://example.com`; `pasteAsRows('mailto:a@b.co', false, false)` has no Page Title row. Watch them fail.
- [ ] Rewrite as below.

**AFTER**

```Core/Web/openWebLink.ts diff
  export function openWebLink(url: string): void {
    const s = useSession.getState()
-   if (settingOf(personalizationOf(s), 'openLinksInApp')) s.openBrowser(url)
+   // The in-app browser shows web pages alone; a mailto: or any other scheme is the system's.
+   if (settingOf(personalizationOf(s), 'openLinksInApp') && isHttpLink(url)) s.openBrowser(url)
    else void dialer().ask('link:open', url)
  }
```

```Core/Session/windowSlice.ts diff
-   openBrowser: (url) => set({ browserSummon: { url, seq: ++browserSeq } }),
+   openBrowser: (url) => set({ browserSummon: { url: normalizeLinkUrl(url), seq: ++browserSeq } }),
```

```Core/Actions/pasteAsMenu.ts diff
@@ pasteAsRows @@
-   const rows = page ? PAGE_ROWS : URL_ROWS
+   const rows = page ? PAGE_ROWS : URL_ROWS.filter((r) => r.form !== 'link-title' || isHttpLink(target.url))
```

The Preview row and the link menu's Page Title row hide for a non-web address in Task 6-1, where the model learns `web`.

**VERIFY**

- [ ] Run the gates.
- [ ] **Live Check (P1):** with Open Links In Pommora on, `[x](example.com)` opens an in-app window on `https://example.com`, a `mailto:` link goes to the system.
- [ ] Check for unnecessary code or mistakes.

#### Task 5-2 — One title hook

**TASK:** `useLinkTitle(url, wants)` in `Core/Web/useLinkTitle.ts` subscribes to an address's title and fetches it once when wanted; `LinkCell` and `WebTile` read it.

**NOW:** `LinkCell.tsx:33-38` and `WebTile.tsx:21-30` each subscribe to `linkTitles`, read `resolveLinkTitle`, and run the same effect; they differ only in their `wants` and their display source, which each keeps.

**CHANGE**

- [ ] Write the test: a rendered `useLinkTitle('https://a.com', true)` calls `resolveLinkTitle` once and returns the title once the store holds it; with `wants` false it neither subscribes nor fetches. Watch it fail.
- [ ] Add the hook; rewrite the two callers.

**AFTER**

```Core/Web/useLinkTitle.ts diff
+ import { useEffect } from 'react'
+ import { useSession } from '../Session/store'
+
+ /** An address's page title for display, fetched once when wanted; the caller decides whether it wants one. */
+ export function useLinkTitle(url: string, wants: boolean): string | undefined {
+   const title = useSession((s) => (wants ? s.linkTitles[url] : undefined))
+   const resolveLinkTitle = useSession((s) => s.resolveLinkTitle)
+   useEffect(() => {
+     if (wants && !title) void resolveLinkTitle(url)
+   }, [wants, title, url, resolveLinkTitle])
+   return title
+ }
```

```Core/Tiles/Surfaces/WebTile.tsx diff
  function useWebpageTitle(label: string, url: string): string {
    const display = useSession((s) => devicePref(s.devicePrefs, 'defaultLinkFormat'))
-   const title = useSession((s) => s.linkTitles[url])
-   const resolveLinkTitle = useSession((s) => s.resolveLinkTitle)
-   const wantsTitle = label === '' && display === 'link-title'
-   useEffect(() => {
-     if (wantsTitle && !title) resolveLinkTitle(url)
-   }, [wantsTitle, title, url, resolveLinkTitle])
+   const title = useLinkTitle(url, label === '' && display === 'link-title')
    return label !== '' ? label : linkDisplayText(url, display, title)
  }
```

```Core/Properties/Cells/LinkCell.tsx diff
-   const title = useSession((s) => (wantsTitle ? s.linkTitles[url] : undefined))
-   const resolveLinkTitle = useSession((s) => s.resolveLinkTitle)
-   useEffect(() => {
-     if (wantsTitle && !title) resolveLinkTitle(url)
-   }, [wantsTitle, title, url, resolveLinkTitle])
+   const title = useLinkTitle(url, wantsTitle)
```

**VERIFY**

- [ ] Run the gates; `LinkCell.test.tsx` and `WebTile` tests pass.
- [ ] Check for unnecessary code or mistakes.

#### Task 5-3 — Pending titles settle through the promise

**TASK:** `writeLinkAt(view, from, to, write, userEvent)` becomes the one writer that announces a pending title, and each announce awaits `linkTitles.resolve` and settles its own entry; `forwardTitles` lets an editor that closes with entries pending land each once under a text guard, and `settledLinkText` gives a surface with no editor the text it commits once the title answers; the subscription sweep, `linkTitles.subscribe`, and the harness's watchers go.

**NOW:** `writeLink` (`pasteLink.ts:49-63`), `applyUrlLinkAction` (`linkFormat.ts:75-85`), and the resting cell's url arm (`cellStatic.tsx:471-474`) each announce or fetch; `sweepOnTitles` (`pendingTitle.ts:44-72`) subscribes to the store and swaps every pending entry whose title arrived, and unsubscribes on `destroy`, so a fetch landing after a live cell or TextPane closes reaches nothing (B-158), a failed fetch never settles (A-61), and a resting cell's Page Title stays the short form (F-043).

**CHANGE**

- [ ] Write the tests (`pendingTitle.test.ts` rewritten): `writeLinkAt` announces an entry and, when the harness settles the title, swaps the text once; a second paste of the same address swaps both; a settled `null` removes the entry and leaves the short form; a cell closing with an entry pending forwards it, and the resting cell's text swaps when the title lands (a `cellLinks`/`MarkdownTable` test with the harness's `settleTitle`); a TextPane closing with an entry pending commits the swapped value once. Watch them fail.
- [ ] Rewrite `pendingTitle.ts`; `writeLink` in `pasteLink.ts` calls `writeLinkAt`; `applyUrlLinkAction` calls it (until Task 6-3 replaces it); `CellEditor` and `TextPaneEditor` forward on cleanup; `EditorHost.linkTitles.subscribe` goes from `api.ts`, `editorHost.tsx`, and the harness; the harness's `linkTitles.resolve` returns a promise `settleTitle(url, title)` resolves.

**AFTER**

```Core/MarkdownPM/Links/pendingTitle.ts diff
- // Page Title writes the Short Link first and swaps the label in when the fetch lands. To know WHICH link to swap when the same address is pasted twice, the rewrite tracks the range it inserted and only fires while the text there still matches exactly what was written.
+ // Page Title writes the Short Link first and swaps the title in when the fetch lands. Each write awaits its own fetch; to know WHICH link to swap when the same address is pasted twice, the entry tracks the range it inserted and fires only while the text there still matches exactly what was written.

  export interface PendingTitle { from: number; to: number; url: string; text: string }
  export const awaitTitle = StateEffect.define<PendingTitle>()
- const titleSettled = StateEffect.define<readonly PendingTitle[]>()
+ const titleSettled = StateEffect.define<PendingTitle>()

  export const pendingTitles = StateField.define<readonly PendingTitle[]>({
    …
      for (const e of tr.effects) {
        if (e.is(awaitTitle)) next = [...next, e.value]
-       else if (e.is(titleSettled)) next = next.filter((p) => !e.value.includes(p))
+       else if (e.is(titleSettled)) next = next.filter((p) => p !== e.value)
      }
  })

- /** The subscription is torn down with the view, so a fetch resolving after the page or a deactivated table-cell editor closes reaches nothing. */
- const sweepOnTitles = ViewPlugin.fromClass(class { … })
- export const pendingTitle: Extension = [pendingTitles, sweepOnTitles]
+ export const pendingTitle: Extension = pendingTitles

+ /** The one writer of a formatted link in a live editor: it writes the text, and where a title is still to come, announces the range and swaps the title in once, provided the text still reads as written. A view that has closed by then has forwarded its entries. */
+ export function writeLinkAt(
+   view: EditorView,
+   from: number,
+   to: number,
+   write: { text: string; awaits?: string },
+   userEvent: string,
+ ): void {
+   const end = from + write.text.length
+   const entry = write.awaits ? { from, to: end, url: write.awaits, text: write.text } : null
+   view.dispatch({
+     changes: { from, to, insert: write.text },
+     selection: { anchor: end },
+     userEvent,
+     effects: entry ? awaitTitle.of(entry) : undefined,
+   })
+   if (!entry) return
+   void settledLinkText(view.state.facet(editorHost), write).then((text) => {
+     if (!view.dom.isConnected) return
+     const held = view.state.field(pendingTitles).find((p) => p.url === entry.url && p.text === entry.text)
+     if (!held) return
+     view.dispatch({
+       changes: text === held.text ? undefined : { from: held.from, to: held.to, insert: text },
+       effects: titleSettled.of(held),
+     })
+   })
+ }
+
+ /** Titles a surface can't hold a swap for: a resting cell, or an editor closing with entries pending. Each lands once, where the text it was written for still stands. */
+ export function forwardTitles(
+   host: EditorHost,
+   entries: readonly PendingTitle[],
+   text: () => string | null,
+   commit: (next: string) => void,
+ ): void {
+   for (const p of entries)
+     void settledLinkText(host, { text: p.text, awaits: p.url }).then((titled) => {
+       const held = text()
+       if (titled === p.text || held === null || held.slice(p.from, p.to) !== p.text) return
+       commit(held.slice(0, p.from) + titled + held.slice(p.to))
+     })
+ }
+
+ /** The text a write lands as on a surface with no editor to hold a swap: the titled form once the title answers, else the text as written. A resting cell commits it once. */
+ export async function settledLinkText(host: EditorHost, write: { text: string; awaits?: string }): Promise<string> {
+   if (!write.awaits) return write.text
+   const title = await host.linkTitles.resolve(write.awaits)
+   return title ? linkMarkdown(write.awaits, 'link-title', title) : write.text
+ }
```

```Core/MarkdownPM/Links/pasteLink.ts diff
- function writeLink(view: EditorView, link: LinkPaste): void {
-   const sel = view.state.selection.main
-   const [from, selTo] = trimmedRange(docString(view.state.doc), sel.from, sel.to)
-   const to = from + link.text.length
-   view.dispatch({ changes: …, selection: { anchor: to }, userEvent: 'input.paste', effects: … })
-   if (link.wantsTitle) view.state.facet(editorHost).linkTitles.resolve(link.target)
- }
+ function writeLink(view: EditorView, link: LinkPaste): void {
+   const sel = view.state.selection.main
+   const [from, to] = trimmedRange(docString(view.state.doc), sel.from, sel.to)
+   writeLinkAt(view, from, to, link, 'input.paste')
+ }
```

```Core/MarkdownPM/Tables/CellEditor.tsx diff
+   onClose,
    …
+   /** Titles still pending when the cell closes, which the resting cell waits for. */
+   onClose: (pending: readonly PendingTitle[]) => void
    …
      return () => {
+       onCloseRef.current(view.state.field(pendingTitles))
        view.destroy()
```

```Core/MarkdownPM/Tables/MarkdownTable.tsx diff
-   const live = useLatest({ onCellCommit, onSettled })
+   const live = useLatest({ onCellCommit, onSettled, model })
    …
        <CellEditor
          …
+         onClose={(pending) =>
+           forwardTitles(
+             host,
+             pending,
+             () => {
+               const { header, rows } = live.current.model
+               return cellToDisplay((row === 0 ? header[col] : rows[row - 1]?.[col]) ?? '')
+             },
+             (next) => {
+               live.current.onCellCommit(row, col, next)
+               live.current.onSettled()
+             },
+           )
+         }
```

(`TableModel` holds `header: string[]` and `rows: string[][]` as source text, row 0 of the grid being the header; the forward reads it through `cellToDisplay`, so it compares display text with display text.)

```Core/Properties/Pickers/TextPane.tsx diff
      return () => {
        shell?.removeEventListener('animationend', settle)
+       forwardTitles(
+         host,
+         view.state.field(pendingTitles),
+         () => committed.current,
+         (next) => {
+           committed.current = settled(next)
+           onCommitRef.current(committed.current === '' ? null : { kind: 'text', value: next })
+         },
+       )
        view.destroy()
```

(`save()` runs in the layout-effect cleanup before this, so `committed.current` holds the text the entries index into.)

```Core/MarkdownPM/api.ts · Core/Pages/editorHost.tsx · Core/Testing/editorHarness.ts diff
    linkTitles: {
      get(url: string): string | null
      resolve(url: string): Promise<string | null>
-     subscribe(cb: () => void): () => void
    }
```

**VERIFY**

- [ ] `grep -rn "linkTitles.subscribe\|titleWatchers\|sweepOnTitles" Core --include='*.ts' --include='*.tsx'` is empty.
- [ ] Run the gates.
- [ ] **Live Check (B-158):** in `~/Test`, Paste a `https://` address into a table cell with Default Link Format = Page Title, press Escape before the title lands; the resting cell shows the title when it arrives. **Live Check (F-043)** lands in Task 6-4.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] One reviewer reads every path that writes a formatted link or waits for a title (`writeLinkAt`, `forwardTitles`, `useLinkTitle`, `openWebLink`) for a second mechanism doing one of their jobs, and the two forwards for a text guard that can pass on the wrong text (a ragged row, a value trimmed by `settled`).
- [ ] Gates green; delta reported.

### Phase 6 — Menus and Actions

**GOAL:** Every link's right-click menu is built by one builder from one model and answers with the row picked, like the citation, grip, and table menus; one pure function turns the pick into text and one applier writes it in a live editor. `[x](Page)` authors like `[[Page]]`, every label comes from one place, connections get Remove Link and Delete in editors, and the create-ghost stays held while a value's menu is open. The three property-value parents and the resting cell's link door are rewired in this phase so nothing transitional survives it.

#### Task 6-1 — The link menu answers

**TASK:** `showConnectionMenu(target)` returns a promise of the picked action, runs the open, site, and copy rows itself, and hands back an authoring or value action for the caller to apply; `connectionMenuModel` takes one `LinkMenuContext` and builds every link's menu as one join: opens, authoring, copy and Format, closing.

**NOW:** `showConnectionMenu` (`connectionMenuActions.ts:19-72`) returns `void` and runs `apply`/`onCell` closures; `connectionMenuModel` (`connectionMenu.ts:80-122`) reads `surface`, `editable`, `hasAlias`, `external`, `open`, `windowed`, `hideable`, returns a URL menu two ways whose row order differs (a value puts Copy Link beside the opens, the editor after the authoring rows), labels the first authoring row `Rename`/`Edit Title`/`Add Title` by syntax and alias, and offers Remove Link and Delete only for weblinks.

**CHANGE**

- [ ] Write the tests (`connectionMenu.test.ts` rewritten): a page in an editable editor lists opens | Rename, Edit Title | Copy Link, Copy Path | Remove Link, Delete; a weblink in an editable editor lists Preview, Open In Browser | Rename, Edit Link | Copy Link, Format ▸ | Remove Link, Delete; a weblink value lists Preview, Open In Browser | Rename, Edit Link | Copy Link | Clear, Remove (hideable) with no Format; a non-web address lists Open In Browser alone among the opens and no Page Title under Format; a read-only page lists opens | Copy Link, Copy Path. `connectionMenuActions.test.ts`: `showConnectionMenu` resolves `'rename'` when picked and `null` after it ran `title:copylink`. Watch them fail.
- [ ] Rewrite both files as below.

**AFTER**

```Core/Actions/connectionMenu.ts diff
- export interface ConnMenuContext { surface: ConnSurface; editable: boolean; hasAlias: boolean; external?: boolean; open?: …; windowed?: boolean; hideable?: boolean }
- export type ConnSurface = 'editor' | 'cell'
+ /** What a link's menu is built from: whether the surface can author it, whether it's a property value (which closes with Clear and Remove rather than Remove Link and Delete, and takes no Format), and what the link is. */
+ export type LinkMenuContext = { editable: boolean; value?: { hideable: boolean } } & (
+   | { kind: 'page'; open: 'closed' | 'tab' | 'detail'; windowed: boolean }
+   | { kind: 'url'; web: boolean }
+ )
  export type ConnEditAction = 'rename' | 'editLink'
- export type ConnCellAction = 'cell:clear' | 'cell:hide'
+ const CELL_ACTIONS = ['cell:clear', 'cell:hide'] as const
+ export type ConnCellAction = (typeof CELL_ACTIONS)[number]
- export type ConnCellApply = (action: ConnCellAction) => void
  type ConnCopyAction = Extract<PageMetaAction, 'title:copylink' | 'title:copypath'>
  type ConnSiteAction = 'link:window' | 'link:browser'
  const CONN_SITE_ROWS = …
- const CONN_URL_ACTIONS = ['rename', 'editLink', 'format:link-full', 'format:link-short', 'format:link-title', 'link:remove', 'link:delete'] as const
- export type ConnUrlAction = (typeof CONN_URL_ACTIONS)[number]
+ const LINK_EDIT_ACTIONS = ['rename', 'editLink', 'format:link-full', 'format:link-short', 'format:link-title', 'link:remove', 'link:delete'] as const
+ /** What a link's menu hands back for its caller to apply; the opens and copies it runs itself. */
+ export type LinkEditAction = (typeof LINK_EDIT_ACTIONS)[number]
+ const LINK_ACTIONS = [...LINK_EDIT_ACTIONS, ...CELL_ACTIONS] as const
+ export type LinkAction = (typeof LINK_ACTIONS)[number]
- const CONN_UNLINK_ROWS: readonly ActionItem<ConnUrlAction>[] = …
+ const CONN_UNLINK_ROWS: readonly ActionItem<LinkEditAction>[] = [ { label: 'Remove Link', action: 'link:remove' }, { label: 'Delete', action: 'link:delete' } ]
+ const FORMAT_ROW = (web: boolean): ActionItem<LinkEditAction> => ({
+   label: 'Format',
+   submenu: LINK_DISPLAYS.filter((d) => d !== 'link-title' || web).map((d) => ({ label: LINK_DISPLAY_LABELS[d], action: `format:${d}` as const })),
+ })
- export type LinkMenuAction = PageOpenAction | ConnSiteAction | ConnEditAction | ConnCellAction | ConnCopyAction
+ export type LinkMenuAction = PageOpenAction | ConnSiteAction | ConnCopyAction | LinkAction
- export const isConnUrlAction = (action: LinkMenuAction): action is ConnUrlAction => (CONN_URL_ACTIONS as readonly string[]).includes(action)
+ export const isLinkAction = (action: LinkMenuAction): action is LinkAction => (LINK_ACTIONS as readonly string[]).includes(action)
- export const isConnCellAction = …
- function closingRows(ctx: ConnMenuContext) { … }
  export function cellClosingRows(…)   (unchanged; the cell menu reads it)

- export function connectionMenuModel(ctx: ConnMenuContext): ActionItem<LinkMenuAction>[] { … two returns … }
+ /** One join for every link: the opens, then Rename and Edit Title or Edit Link where the surface authors, then the copies with Format for an editable weblink outside a value, then what closes it. */
+ export function connectionMenuModel(ctx: LinkMenuContext): ActionItem<LinkMenuAction>[] {
+   const opens: readonly ActionItem<LinkMenuAction>[] =
+     ctx.kind === 'page'
+       ? pageOpenRows({ alreadyOpen: ctx.open === 'tab', window: !ctx.windowed, newTab: ctx.open !== 'detail' })
+       : CONN_SITE_ROWS.filter((r) => r.action !== 'link:window' || ctx.web)
+   const authoring: ActionItem<LinkMenuAction>[] = ctx.editable
+     ? [
+         { label: 'Rename', action: 'rename' },
+         { label: ctx.kind === 'page' ? 'Edit Title' : 'Edit Link', action: 'editLink' },
+       ]
+     : []
+   const copies: ActionItem<LinkMenuAction>[] = ctx.kind === 'page' ? [COPY_LINK_ROW, COPY_PATH_ROW] : [COPY_LINK_ROW]
+   const format = ctx.kind === 'url' && ctx.editable && !ctx.value ? [FORMAT_ROW(ctx.web)] : []
+   const closing = ctx.value ? cellClosingRows(true, ctx.value.hideable) : ctx.editable ? CONN_UNLINK_ROWS : []
+   return joinGroups([opens, authoring, [...copies, ...format], closing])
+ }
```

```Core/Interface/Menus/connectionMenuActions.ts diff
- export function showConnectionMenu(target: ConnMenuTarget): void { … }
+ /** Pops a link's menu and answers with the row the caller applies; the opens and copies run here, since they read session state and need no span. */
+ export function showConnectionMenu(target: LinkMenuTarget): Promise<LinkAction | null> {
+   const s = useSession.getState()
+   const shared = { editable: target.editable, ...(target.value ? { value: target.value } : {}) }
+   if (target.kind === 'url') {
+     const ctx: LinkMenuContext = { ...shared, kind: 'url', web: isHttpLink(target.url) }
+     return popMenu(connectionMenuModel(ctx)).then((action) => {
+       if (action === 'link:window') s.openBrowser(target.url)
+       else if (action === 'link:browser') void dialer().ask('link:open', target.url)
+       else if (action === 'title:copylink') void dialer().ask('clipboard:write', target.url)
+       else if (action !== null && isLinkAction(action)) return action
+       return null
+     })
+   }
+   const { page, heading } = target
+   const ref = { kind: 'page', id: page.id, path: page.path } as const
+   const ctx: LinkMenuContext = {
+     ...shared,
+     kind: 'page',
+     // The two readings are independent: the content view answers for the tab item, the page window for its own. A named heading travels even where the page already shows, so it keeps both.
+     open: !heading && shownDetail(s)?.path === page.path ? 'detail' : isOpenInTabs(s.tabs, s.pinned, ref) ? 'tab' : 'closed',
+     windowed: !heading && windowTargetOf(s)?.id === page.id,
+   }
+   return popMenu(connectionMenuModel(ctx)).then((action) =>
+     action === null || runPageAction(action, { ...page, heading }) || !isLinkAction(action) ? null : action,
+   )
+ }
- type LinkCellAction = ConnEditAction | ConnCellAction
- export function linkValueMenuTarget(raw, apply, hideable = false): ConnMenuTarget | null { … }
```

The url arm carries no `windowed`: no producer ever set it (the filter at `connectionMenu.ts:92` read a page field), so the site rows filter on `web` alone. `LinkMenuTarget` is Task 6-2's, which renames `ConnMenuTarget` and gives it one builder; write the two tasks in one commit.

**VERIFY**

- [ ] `grep -rn "hasAlias\|ConnSurface\|surface: 'cell'\|ConnCellApply\|isConnUrlAction\|isConnCellAction\|Add Title" Core --include='*.ts' --include='*.tsx' | grep -v test` is empty.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-2 — One builder and one target type

**TASK:** `linkMenuTarget(target, editable, value?)` is the one builder of a `LinkMenuTarget` from a resolved target; `ConnMenuTarget` and `tokenMenuTarget` go; `ConnectionsApi.menu` answers with a promise.

**NOW:** The target is built four ways (synthesis §3.8): `tokenMenuTarget` (`connectionsApi.ts:97-112`) authors only a `wikiLink` naming a page, so `[x](Page)` gets a read-only menu (B-57); `linkMenuTarget` returns `editable: false, hasAlias: false`; `menuTarget` (`cellStatic.tsx:449-477`) and `linkValueMenuTarget` build the rest. `ConnMenuTarget` carries `surface`, `hideable`, `onCell`, `editable`, `hasAlias`, and `apply`, arm-inconsistently.

**CHANGE**

- [ ] Write the tests: `linkMenuTarget({ kind: 'page', page }, true)` → `{ kind: 'page', page, editable: true }`; `linkMenuTarget({ kind: 'url', url }, false, { hideable: true })` → `{ kind: 'url', url, editable: false, value: { hideable: true } }`; `linkMenuTarget({ kind: 'invalid' }, true)` and `({ kind: 'self', heading })` → `null`. Watch them fail.
- [ ] Rewrite as below; `ConnectionsApi.menu?: (target: LinkMenuTarget) => Promise<LinkAction | null>`.

**AFTER**

```Core/MarkdownPM/Links/connectionsApi.ts diff
- /** `apply` closes over the span it was built for, so no caller can aim an action at a link the menu wasn't popped on; its absence marks a display-only surface. */
- export type ConnMenuTarget = { surface?: ConnSurface; hideable?: boolean; onCell?: ConnCellApply } & ( … )
+ /** What a link's menu is popped for: the resolved page or address, whether this surface authors it, and, for a property value, whether the value can be removed from its surface. */
+ export type LinkMenuTarget = { editable: boolean; value?: { hideable: boolean } } & (
+   | { kind: 'page'; page: ConnPage; heading?: string }
+   | { kind: 'url'; url: string }
+ )

  export interface ConnectionsApi extends PageIndex {
    open: …
-   menu?: (target: ConnMenuTarget) => void
+   menu?: (target: LinkMenuTarget) => Promise<LinkAction | null>
    …

- export function linkMenuTarget(target: MdTarget, apply?): ConnMenuTarget | null { … }
- export function tokenMenuTarget(tk, target, edit?): ConnMenuTarget | null { … }
+ /** The one builder of a link's menu target. A phantom, ambiguous, or invalid link has no menu of its own and falls to the surface's; a bare `[[#Heading]]` reaches here already converted to its holder's page where one holds it. */
+ export function linkMenuTarget(
+   target: MdTarget,
+   editable: boolean,
+   value?: { hideable: boolean },
+ ): LinkMenuTarget | null {
+   const base = { editable, ...(value ? { value } : {}) }
+   switch (target.kind) {
+     case 'page':
+       return { ...base, kind: 'page', page: target.page, heading: target.heading }
+     case 'url':
+       return { ...base, kind: 'url', url: target.url }
+     default:
+       return null
+   }
+ }
```

**VERIFY**

- [ ] `grep -rn "ConnMenuTarget\|tokenMenuTarget" Core --include='*.ts' --include='*.tsx'` is empty after Tasks 6-4 and 6-5 land.
- [ ] Run the gates once the callers in 6-4 and 6-5 are rewritten; the three tasks land in one green state.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-3 — One pure edit and one live applier

**TASK:** `linkEdit(text, tk, action, titles)` in `linkEdit.ts` turns a picked action into a selection to seat or a write to make, for a connection and a weblink alike; `applyLinkAction(view, action, range)` applies it in a live editor through `writeLinkAt` and focuses after every edit; `linkFormat.ts` and `wikiAuthorTarget` go.

**NOW:** Two appliers split by syntax, `applyLinkAction` (`linkEdit.ts:38-48`, wikilink: seats a pipe or a selection) and `applyUrlLinkAction` (`linkFormat.ts:55-86`, markdown: selects, writes, announces a title, never focuses after a write); `wikiAuthorTarget` and `linkActionText`+`formatted` are their pure halves; Edit Link seats a bare caret at a connection's title end but selects a weblink's address; the markdown caret rule is written again in `cellStatic.tsx:469-470`.

**CHANGE**

- [ ] Write the tests (`linkEdit.test.tsx` rewritten; `linkFormat.test.tsx` folded in): on `[[P|a]]` Rename selects `a`, Edit Title selects `P`; on `[[P]]` Rename writes `|` after `P` and seats after it, and with `[[P|]]` already there seats after the pipe; on `[[P#H]]` Edit Title selects `P`, Rename seats after `H`; on `[x](https://a.com)` Rename selects `x`, Edit Link selects the address, Remove Link writes `x`, Delete writes nothing, Format ▸ Short Link writes `[a.com](https://a.com)`, Format ▸ Page Title with no cached title writes the short form and `awaits` the address; on `[x](Page)` Edit Title selects `Page`; Remove Link on `[[P|a]]` writes `a`, on `[[P]]` writes `P`, on `[[P#H]]` writes `P § H`, and on `[[#H]]` writes `H`; a Format on a connection returns `null`; the applier focuses the view after Remove Link. Watch them fail.
- [ ] Write `linkEdit` and the applier; delete `linkFormat.ts`, `wikiAuthorTarget`, `applyUrlLinkAction`, `linkActionText`, `formatted`, `LinkActionText`.

**AFTER**

```Core/MarkdownPM/Links/linkEdit.ts diff
- /** Pure of any editor, because a connection in a resting table cell has none. … */
- export function wikiAuthorTarget(text, tk, action): { pipeAt?: number; select: [number, number] } { … }
- export function applyLinkAction(view, action: ConnEditAction, range): void { … }
+ /** What a link's menu pick does to the text, pure of any editor: a selection to seat where the pick needs typing, or a write. */
+ export type LinkEdit =
+   | { kind: 'select'; range: Span }
+   | { kind: 'write'; from: number; to: number; text: string; awaits?: string; select?: number }
+
+ /** What an unaliased connection shows: its title and heading joined as the draw joins them, or the heading alone when it's held. */
+ function shownConnection(text: string, tk: TokenOf<'wikiLink'>): string {
+   const heading = aliasedToken(tk) ? undefined : headingOf(text, tk)
+   if (!heading) return text.slice(tk.contentRange[0], tk.contentRange[1])
+   const title = text.slice(tk.resolveRange[0], tk.resolveRange[1])
+   return title ? `${title} § ${heading}` : heading
+ }
+
+ export function linkEdit(
+   text: string,
+   tk: TokenOf<LinkKind>,
+   action: LinkAction,
+   titles: Pick<EditorHost['linkTitles'], 'get'>,
+ ): LinkEdit | null {
+   const [s, e] = tk.range
+   const [cs, ce] = tk.contentRange
+   switch (action) {
+     case 'rename': {
+       if (tk.kind === 'link' || aliasedToken(tk)) return { kind: 'select', range: [cs, ce] }
+       const afterTitle = (tk.heading ?? tk.resolveRange)[1]
+       if (text[afterTitle] === '|') return { kind: 'select', range: [afterTitle + 1, afterTitle + 1] }
+       return { kind: 'write', from: afterTitle, to: afterTitle, text: '|', select: afterTitle + 1 }
+     }
+     case 'editLink':
+       return { kind: 'select', range: tk.kind === 'link' ? linkAddress(tk) : tk.resolveRange }
+     case 'link:remove':
+       return { kind: 'write', from: s, to: e, text: tk.kind === 'link' ? unescapeAlias(text.slice(cs, ce)) : shownConnection(text, tk) }
+     case 'link:delete':
+       return { kind: 'write', from: s, to: e, text: '' }
+     case 'format:link-full':
+       return tk.kind === 'link' ? formatted(text, tk, 'link-full', titles) : null
+     case 'format:link-short':
+       return tk.kind === 'link' ? formatted(text, tk, 'link-short', titles) : null
+     case 'format:link-title':
+       return tk.kind === 'link' ? formatted(text, tk, 'link-title', titles) : null
+     default:
+       return null
+   }
+ }
+
+ function formatted(text: string, tk: TokenOf<'link'>, display: LinkDisplay, titles: Pick<EditorHost['linkTitles'], 'get'>): LinkEdit {
+   const url = linkTarget(text, tk)
+   const write = linkPaste(url, display, titles.get(url) ?? undefined)
+   return { kind: 'write', from: tk.range[0], to: tk.range[1], text: write.text, awaits: write.awaits }
+ }
+
+ /** Applies a pick to the drawn link at `range` in a live editor; the editor keeps focus after every edit, as it does after the editor menu's. */
+ export function applyLinkAction(view: EditorView, action: LinkAction, range: Span): void {
+   const tk = drawnLinkAt(view, range[0])
+   if (!tk || tk.range[0] !== range[0]) return
+   const edit = linkEdit(docString(view.state.doc), tk, action, view.state.facet(editorHost).linkTitles)
+   if (!edit) return
+   if (edit.kind === 'select') return focusRange(view, edit.range[0], edit.range[1])
+   if (view.state.sliceDoc(edit.from, edit.to) !== edit.text) writeLinkAt(view, edit.from, edit.to, edit, 'input')
+   if (edit.select !== undefined) focusRange(view, edit.select, edit.select)
+   else view.focus()
+ }
```

Remove Link on an unaliased heading connection writes `Page § Heading` whatever the Heading Link Style or the link's resolution, since the edit reads nothing from the view; the drawn text under Heading Only or on a phantom differs, and the written form is the one the rule names.

`cell:clear` and `cell:hide` reach `linkEdit` only through the type; they're a value's, and the default arm returns null.

**VERIFY**

- [ ] `grep -rn "linkFormat\|wikiAuthorTarget\|applyUrlLinkAction\|linkActionText" Core --include='*.ts' --include='*.tsx'` is empty.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-4 — The resting cell's seat and guarded commit

**TASK:** Entering a cell is one `Seat | null`, a point with an optional sweep edge or a range, in one ref on `MarkdownTable`, one `CellEditor` prop, and one `onActivate(seat)`, with the nested ternary becoming `seatSelection`; and every write made at rest commits through one `commitAtRest(built, edits)` on `StaticCellImpl`, which stands down when the cell no longer reads the text the gesture read and writes nothing an edit leaves unchanged. The link door (Task 6-5) and the resting menu (Phase 9) both read them.

**NOW:** Three refs (`caretCoords`, `initialSelect`, `sweepFrom`, `MarkdownTable.tsx:152-154`), reset at three sites, passed as three `CellEditor` props, consumed by one nested ternary (`CellEditor.tsx:247-262`), with `onActivate(coords, sweep?)` and `onSelect(range)` as two entries (R-09); Tab and Enter navigation enters with no coordinates at all. The checkbox and `menuTarget`'s writes commit through `onCommit` directly, and `cellCommitChange` returns a non-empty replace for identical text (`sync.ts:23`), so a write that changes nothing records an undo step (M10-04).

**CHANGE**

- [ ] Write the tests (`cellSeat.test.ts`): `seatSelection(null, 5, posAt)` → `{ anchor: 5, head: 5 }`; `({ kind: 'select', range: [1, 3] }, 2, …)` clamps to `{ 1, 2 }`; `({ kind: 'point', x, y }, 5, () => 2)` → `{ 2, 2 }`; `({ kind: 'point', x, y, sweep: 'start' }, 5, () => 2)` → `{ 0, 2 }`; `cellStatic.test.tsx`: a checkbox toggle whose cell text changed under it commits nothing, and one producing identical text commits nothing. Watch them fail.
- [ ] Rewrite as below; `menuTarget`'s two `onSelect(range)` calls read `onActivate({ kind: 'select', range })` until Task 6-5 deletes the function.

**AFTER**

```Core/MarkdownPM/Tables/CellEditor.tsx diff
+ /** How a cell is entered: at a pointer, which a sweep that crossed into the cell extends from one edge, or over a range of its text. Tab and Enter enter with no seat and take the caret at the end. */
+ export type Seat =
+   | { kind: 'point'; x: number; y: number; sweep?: 'start' | 'end' }
+   | { kind: 'select'; range: [number, number] }
+
+ export function seatSelection(
+   seat: Seat | null,
+   end: number,
+   posAt: (p: { x: number; y: number }) => number | null,
+ ): { anchor: number; head: number } {
+   if (!seat) return { anchor: end, head: end }
+   switch (seat.kind) {
+     case 'select':
+       return { anchor: Math.min(seat.range[0], end), head: Math.min(seat.range[1], end) }
+     case 'point': {
+       const head = posAt(seat) ?? end
+       if (!seat.sweep) return { anchor: head, head }
+       return { anchor: seat.sweep === 'start' ? 0 : end, head }
+     }
+   }
+ }

  export function CellEditor({ …,
-   caretCoords, initialSelect, sweepFrom,
+   seat,
    … }: { …
-   caretCoords: { x: number; y: number } | null
-   initialSelect: [number, number] | null
-   sweepFrom: 'start' | 'end' | null
+   seat: Seat | null
    … }) {
    …
      view.focus()
-     const end = view.state.doc.length
-     let pos: number | null = null
-     if (!initialSelect && caretCoords) { try { pos = view.posAtCoords(caretCoords) } catch { pos = null } }
-     const head = pos ?? end
-     view.dispatch({ selection: initialSelect ? … : sweepFrom ? … : { anchor: head } })
+     const posAt = (p: { x: number; y: number }): number | null => {
+       // posAtCoords can throw before the view has measured.
+       try {
+         return view.posAtCoords(p)
+       } catch {
+         return null
+       }
+     }
+     view.dispatch({ selection: seatSelection(seat, view.state.doc.length, posAt) })
```

```Core/MarkdownPM/Tables/MarkdownTable.tsx diff
-   const caretCoords = useRef<{ x: number; y: number } | null>(null)
-   const initialSelect = useRef<[number, number] | null>(null)
-   const sweepFrom = useRef<'start' | 'end' | null>(null)
+   const seat = useRef<Seat | null>(null)
@@ navigate @@
-     caretCoords.current = null
-     initialSelect.current = null
-     sweepFrom.current = null
+     seat.current = null
@@ cell @@
-         caretCoords={caretCoords.current}
-         initialSelect={initialSelect.current}
-         sweepFrom={sweepFrom.current}
+         seat={seat.current}
        …
-       onActivate={(coords, sweep) => {
-         host.glance?.close()
-         caretCoords.current = coords
-         initialSelect.current = null
-         sweepFrom.current = sweep ?? null
-         setActive({ row, col })
-       }}
+       onActivate={(at) => {
+         host.glance?.close()
+         seat.current = at
+         setActive({ row, col })
+       }}
        …
-       onSelect={(range) => { … }}
```

```Core/MarkdownPM/Tables/cellStatic.tsx diff
-   onActivate: (coords: { x: number; y: number }, sweep?: 'start' | 'end') => void
-   onSelect: (range: [number, number]) => void
+   onActivate: (seat: Seat) => void
    …
-       onActivate({ x: e.clientX, y: e.clientY })
+       onActivate({ kind: 'point', x: e.clientX, y: e.clientY })
    …
-       queueMicrotask(() => onActivate(coords, above ? 'start' : 'end'))
+       const at: Seat = { kind: 'point', x: e.clientX, y: e.clientY, sweep: above ? 'start' : 'end' }
+       queueMicrotask(() => onActivate(at))
@@ StaticCellImpl @@
+   /** Every resting write: it stands down unless the cell still reads `built`, the text the gesture read, since a menu can stand open while an undo moves the cell, and writes nothing an edit leaves unchanged. */
+   const commitAtRest = (built: string, edits: readonly TextEdit[]): boolean => {
+     if (live.current !== built) return false
+     const next = applyEdits(built, edits)
+     if (next === built) return false
+     onCommit(next)
+     return true
+   }
@@ claimCheckbox @@
-     return () => onCommit(applyEdits(doc, [change]))
+     return () => commitAtRest(doc, [change])
```

**VERIFY**

- [ ] `grep -rn "caretCoords\|initialSelect\|sweepFrom\|onSelect" Core/MarkdownPM/Tables` is empty; `cellNavigation.test.tsx` passes.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-5 — The body, the resting cell's link door, and the Text value read the builder

**TASK:** The body's menu becomes `menu(target).then(apply)`; `linkGestures` pops the builder's target and hands the answer to the surface's applier; the resting cell applies through `linkEdit`, awaits a title through `settledLinkText`, and commits once through `commitAtRest`; a Text value's links get the read-only menu through the same door; `menuTarget`, `still()`, and the `wiki`/`url` closure pair go.

**NOW:** `linkPointer.menu` (`linkClicks.ts:139-154`) builds a `{ wiki, url }` closure pair; `menuAt`/`menuTarget` (`cellStatic.tsx:288-306,449-477`) re-find the link through `still()` and split by syntax; the resting url arm commits the short form and calls `linkTitles.resolve` with nothing awaiting (F-043); `linkGestures`' `readOnlyMenu` builds a read-only target for `TextCell`.

**CHANGE**

- [ ] Write the tests (`cellLinks.test.tsx:194-269` rewritten): at rest, Remove Link on `[[P|a]]` commits `a` without entering; Rename on `[[P]]` commits `[[P|]]` and enters with the caret after the pipe; Edit Title enters with `P` selected; Format ▸ Page Title on `[x](https://a.com)` commits nothing until the harness settles the title, then commits the titled form once (the F-043 proof), and commits the short form once when the harness settles `null`; a resting `[x](Page)` offers Rename and Edit Title; a cell edited while its menu stood open declines the pick; a read-only resting cell's menu has no authoring rows (B-56). Watch them fail.
- [ ] Rewrite as below.

**AFTER**

```Core/MarkdownPM/Links/linkClicks.ts diff
@@ linkPointer · menu @@
    menu: (hit, view) => {
      const menu = apiOf(view)?.menu
-     const target = hit.onText && tokenMenuTarget(hit.tk, hit.target, view.state.readOnly ? undefined : { wiki: …, url: … })
-     return menu && target ? () => menu(target) : null
+     const target = hit.onText && linkMenuTarget(hit.target, !view.state.readOnly)
+     return menu && target
+       ? () => void menu(target).then((action) => action && applyLinkAction(view, action, hit.range))
+       : null
    },
```

```Core/MarkdownPM/Tables/cellStatic.tsx diff
@@ linkGestures @@
- export function linkGestures(text, connections, glance, own = null, menuAt?: (e, hit, api) => ConnMenuTarget | null) {
+ /** The link gestures a resting surface shares. `editable` and `apply` are the authoring surface's; a surface without them offers the read-only menu. */
+ export function linkGestures(
+   text: string,
+   connections: (() => ConnectionsApi | undefined) | undefined,
+   glance: EditorHost['glance'],
+   own: OwnPage | null = null,
+   authoring?: { editable: () => boolean; apply: (tk: TokenOf<LinkKind>, action: LinkAction) => void },
+ ) {
    …
    onContextMenu: (e: React.MouseEvent): boolean => {
      dismiss(e)
      const api = connections?.()
      if (!api?.menu) return false
      const found = linkAt(e)
      if (!found?.tk) return false
-     const target = menuAt ? menuAt(e, found, api) : linkMenuTarget(found.target)
+     const { tk } = found
+     const target = linkMenuTarget(found.target, authoring?.editable() ?? false)
      if (!target) return false
      e.preventDefault()
      e.stopPropagation()
-     api.menu(target)
+     void api.menu(target).then((action) => action && authoring?.apply(tk, action))
      return true
    },

@@ StaticCellImpl @@
- const menuAt = (e, api) => { … menuTarget(…) … }
- const { linkAt, dismiss, onContextMenu, onPointerOver, onPointerOut } = linkGestures(text, host.connections, host.glance, null, menuAt)
+ /** A pick applied at rest: a selection enters the cell seated; a write commits once, without entering, with a title it awaits landed first; a cell that changed while the menu stood open or the title was fetched takes nothing. */
+ const applyAtRest = async (tk: TokenOf<LinkKind>, action: LinkAction): Promise<void> => {
+   const edit = linkEdit(text, tk, action, host.linkTitles)
+   if (!edit) return
+   if (edit.kind === 'select') return onActivate({ kind: 'select', range: edit.range })
+   const insert = await settledLinkText(host, edit)
+   if (!commitAtRest(text, [{ from: edit.from, to: edit.to, insert }])) return
+   if (edit.select !== undefined) onActivate({ kind: 'select', range: [edit.select, edit.select] })
+ }
+ const { linkAt, dismiss, onContextMenu, onPointerOver, onPointerOut } = linkGestures(
+   text, host.connections, host.glance, null,
+   { editable: () => !readOnly(), apply: applyAtRest },
+ )

- /** `still` re-reads the link when the action is chosen … */
- function menuTarget(still, tk, text, api, host, onCommit, onSelect): ConnMenuTarget | null { … }
```

`TextCell` passes no `authoring`, so its links read `editable: false` and the pick is discarded, which is the read-only menu.

**VERIFY**

- [ ] `grep -rn "menuTarget\|still()" Core/MarkdownPM/Tables Core/MarkdownPM/Links` is empty.
- [ ] Run the gates.
- [ ] **Live Check (F-043):** at rest, Format ▸ Page Title leaves the cell as it was until the title arrives, then writes the titled form in one step (one undo removes it). **Live Check (B-56):** a read-only embedded page's resting cells offer no authoring rows.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-6 — The three value parents read the builder

**TASK:** `TableView`, `CardValue`, and `PropertyPanel` pop a Link value's menu through `valueTarget` and `linkMenuTarget`, await the answering menu inside `holdGhost`, and hand the pick to `runMenuIntent`; `valueMenuIntent` takes the link actions; the Panel's value menu gains Remove; `linkValueMenuTarget` and the `onCell` channel go.

**NOW:** Each parent calls `linkValueMenuTarget(raw, run, hideable)` (`TableView.tsx:287-293`, `CardValue.tsx:114-120`, `PropertyPanel.tsx:340-347`), which resolves on its own and routes Clear and Remove through `onCell`; `holdGhost` awaits a menu that returns at once, so the create-ghost shows behind it (B-68); the Panel's `hide` is `null` though its row menu offers Remove (Q-05).

**CHANGE**

- [ ] Write the tests: `valueMenuIntent('format:link-full')` is `null`; a Panel test where Remove on a Link value's menu clears the value and un-reveals the row; the three parents' menu paths pop through `showConnectionMenu` with `value: { hideable }` as each surface allows (Table `false`, Card `true`, Panel `true`). Watch them fail.
- [ ] Rewrite the three sites; `valueClick.ts`'s `MENU_INTENTS` type widens; `holderOf(row, ctx)` supplies the holder.

**AFTER**

```Core/Properties/Cells/valueTarget.ts diff
+ /** A property value's link menu target: the value resolved through the index its context carries, the row's holder answering a bare `[[#Heading]]`. */
+ export const valueMenuTarget = (ctx: ValueContext, row: ViewRow, raw: string, hideable: boolean): LinkMenuTarget | null => {
+   const target = valueTarget(ctx.connections?.(), raw, holderOf(row, ctx))
+   return target && linkMenuTarget(target, true, { hideable })
+ }
```

```Core/Views/Table/TableView.tsx diff
@@ openCellMenu @@
    if (dt === 'link') {
-     const target = linkValueMenuTarget(value.kind === 'link' ? value.value : '', runMenuIntent)
+     const target = valueMenuTarget(ctx, row, value.kind === 'link' ? value.value : '', false)
      if (target) {
-       await interactions.holdGhost(async () => showConnectionMenu(target))
+       const action = await interactions.holdGhost(() => showConnectionMenu(target))
+       if (action) runMenuIntent(action)
        return
      }
    }
```

```Core/Views/Cards/CardValue.tsx diff
    if (t === 'link') {
-     const target = linkValueMenuTarget(v.kind === 'link' ? v.value : '', runMenuIntent, true)
+     const target = valueMenuTarget(ctx, row, v.kind === 'link' ? v.value : '', true)
      if (target) {
-       await holdGhost(async () => showConnectionMenu(target))
+       const action = await holdGhost(() => showConnectionMenu(target))
+       if (action) runMenuIntent(action)
        return
      }
    }
```

```Core/Properties/PropertyPanel.tsx diff
@@ runIntent @@
-     hide: null,
+     hide: () => emptyRow(def.id, false),
@@ valueMenu @@
    if (!def || value.kind !== 'link') return false
    const run = (action: CellMenuAction | LinkAction | null): void => {
      if (action) runIntent(def, value, valueMenuIntent(action), null)
    }
-   const link = linkValueMenuTarget(value.value, run)
-   if (link) showConnectionMenu(link)
+   const link = row && ctx && valueMenuTarget(ctx, row, value.value, true)
+   if (link) void showConnectionMenu(link).then(run)
    else void popMenu(cellMenuModel({ kind: 'link', filled: true })).then(run)
    return true
```

```Core/Properties/Pickers/valueClick.ts diff
- const MENU_INTENTS: Partial<Record<CellMenuAction, ValueIntent>> = {
+ const MENU_INTENTS: Partial<Record<CellMenuAction | LinkAction, ValueIntent>> = {
  …
- export const valueMenuIntent = (action: CellMenuAction): ValueIntent | null => MENU_INTENTS[action] ?? null
+ export const valueMenuIntent = (action: CellMenuAction | LinkAction): ValueIntent | null => MENU_INTENTS[action] ?? null
```

`runMenuIntent` in each parent widens its parameter the same way. The Panel's `hide` is what its row menu's Remove already does (`emptyRow(id, false)`): clear this page's value and hide the row on this page.

**VERIFY**

- [ ] `grep -rn "linkValueMenuTarget\|onCell\|LinkCellAction" Core --include='*.ts' --include='*.tsx'` is empty.
- [ ] Run the gates; `connectionMenuActions.test.ts`, `LinkCell.test.tsx`, the Table and Card view tests pass.
- [ ] **Live Check (B-68):** no create-ghost appears while a Link value's menu is open in a Table or a Card.
- [ ] In `~/Test`: a Link value's menu reads Rename · Edit Title on a page and Rename · Edit Link on an address; the Panel's offers Remove, which hides the row.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] One reviewer reads every `menu(` and `showConnectionMenu(` call for a surface that builds its target without `linkMenuTarget`, applies without `linkEdit`, or still answers through a callback; and `connectionMenuModel` against the Continuation §5.5 rows, surface by surface.
- [ ] Gates green; delta reported.

### Phase 7 — Paste

**GOAL:** One pipeline decides every paste: ⌘V, ⌘⇧V, Paste As, Paste Without Formatting, a rectangle paste over table cells, and a dropped address, with one reader of the clipboard, one writer, and one word for leave-as-typed. Pasting a link anywhere inside a link retargets it under `retarget`, which ends the three corrupting pastes the investigation probed. The resting cell's paste rows (Phase 9) run through this pipeline rather than restating it.

#### Task 7-1 — One pipeline

**TASK:** `pasteAsWrite(target, how, over)` absorbs `decidePaste`'s wrap and inverse axes as two more forms; `paste(view, text, how)` in `pasteLink.ts` is the one entry for the paste event, the chord, Paste As, and Paste Without Formatting; `pasteDecision.ts` goes; `'literal'` is the code word for leave-as-typed.

**NOW:** `linkFor` (`pasteLink.ts:17-39`) and `decidePaste` (`pasteDecision.ts:29-47`) classify a plain paste twice; `pasteAs` (`:86-109`) reads and classifies again; the inverse chord has its own body (`:123-135`); `pastedUrl` and `pasteAsTarget` are two clipboard readers; "literal" and "plain" both name leave-as-typed (`PASTE_PLAIN_ACTION = 'paste:plain'` dispatches `pasteAs(view, 'literal')`).

**CHANGE**

- [ ] Write the tests (`pasteDecision.test.ts` folded into `pasteLink.test.tsx`/`pasteAsMenu.test.ts`): `pasteAsWrite(url, 'auto', { selection: 'docs', format })` → `[docs](https://a.com)`; with `selection: ''` → the Default Link Format's text; `'inverse'` with a selection → the format axis, with none → `null`; `pasteAsWrite(url, 'plain', …)` → the address; `pasteAsWrite(page, 'auto', …)` → `null`; `paste(view, '3.14', 'auto')` → `false`; `paste(view, 'example.com', 'auto')` → `false` and `paste(view, 'example.com', 'link-short')` → `[example.com](https://example.com)`; `paste(view, '[x](u)', 'literal')` writes the text as is. Watch them fail.
- [ ] Rewrite `pasteAsMenu.ts`'s writer and `pasteLink.ts` as below; delete `pasteDecision.ts`; `PASTE_PLAIN_ACTION` → `PASTE_LITERAL_ACTION = 'paste:literal'` (`Core/Actions/editorMenu.ts`, `commands.ts`, `commandRouter.ts`, `Menus/menu.ts`, `Desktop/Actions/editorMenu.ts`, `appMenu.ts`).

**AFTER**

```Core/Actions/pasteAsMenu.ts diff
+ /** How a paste lands: a form picked from Paste As, `auto` for a plain ⌘V, `inverse` for the chord that flips whichever axis a plain paste chose, `literal` for the clipboard as typed. */
+ export type PasteMode = PasteAsForm | 'auto' | 'inverse' | 'literal'

- export function pasteAsWrite(target: PasteAsTarget, form: PasteAsForm, title?: string): LinkPaste | TextPaste | LinePaste | null {
-   if (!target || form === 'footnote') return null
-   …
+ export function pasteAsWrite(
+   target: LinkTarget | null,
+   how: PasteMode,
+   over: { selection: string; format: LinkDisplay; title?: string },
+ ): LinkPaste | TextPaste | LinePaste | null {
+   if (!target || how === 'footnote' || how === 'literal') return null
+   if ((how === 'embedPage' || how === 'embedLink') && !embeddableTarget(target)) return null
+   if (target.kind === 'page') {
+     switch (how) {
+       case 'connection':
+         return { kind: 'text', text: connectionText(target.title, target.alias, target.heading) }
+       case 'markdown':
+         return { kind: 'text', text: markdownPageLink(target.title, target.heading, target.alias) }
+       case 'embedPage':
+         return { kind: 'line', text: pageEmbedText(target.title) }
+       default:
+         return null
+     }
+   }
+   // A plain paste formats only a bare address; a written link lands as written.
+   if ((how === 'auto' || how === 'inverse') && target.syntax !== 'bare') return null
+   const wrappable = over.selection !== '' && !/[\r\n]/.test(over.selection)
+   switch (how) {
+     case 'plain':
+       return { kind: 'text', text: target.url }
+     case 'embedLink':
+       return { kind: 'line', text: composeWebpageEmbedLine('', target.url) }
+     case 'connection':
+     case 'markdown':
+     case 'embedPage':
+       return null
+     case 'auto':
+       return wrappable
+         ? { kind: 'link', text: serializeLink(target.url, over.selection) }
+         : linkPaste(target.url, over.format, over.title)
+     case 'inverse':
+       return wrappable ? linkPaste(target.url, over.format, over.title) : null
+     default:
+       return linkPaste(target.url, how, over.title)
+   }
+ }
```

```Core/MarkdownPM/Links/pasteLink.ts diff
- function linkFor(view, text, inverse): LinkPaste | null { … }
- function literalAt(view, pos): boolean { … }
- function writeLink(view, link): void { … }
+ /** What the clipboard names: a link in either syntax, or a bare address, which a plain paste reads only with its scheme written, so `3.14` and `App.tsx` stay text; a form picked by hand reads any address. */
+ function clipboardTarget(text: string, how: PasteMode): LinkTarget | null {
+   const target = readLinkText(text)
+   if (target?.syntax === 'bare' && (how === 'auto' || how === 'inverse') && !isWebAddress(text)) return null
+   return target
+ }
+
+ /** The link a selection sits strictly inside, read from the written line; a paste there retargets it. The edges are out, since a finished link leaves the caret on its end. */
+ function linkContainerAt(scan: DocScan, sel: { from: number; to: number }): { kind: LinkKind; range: Span; text: string } | null {
+   const ls = lineStartAt(scan.text, sel.from)
+   const line = scan.text.slice(ls, lineEndAt(scan.text, sel.from))
+   const tk = linkTokenAt(tokenize(line), sel.from - ls)
+   if (!tk || tk.range[0] >= sel.from - ls || sel.to - ls >= tk.range[1]) return null
+   return { kind: tk.kind, range: [ls + tk.range[0], ls + tk.range[1]], text: line.slice(tk.range[0], tk.range[1]) }
+ }
+
+ export interface PasteEdit {
+   from: number
+   to: number
+   write: LinkPaste | TextPaste | LinePaste
+ }
+
+ export interface PasteOptions {
+   format: LinkDisplay
+   keepTitle: boolean
+   title: (url: string) => string | undefined
+ }
+
+ export const pasteOptions = (host: EditorHost): PasteOptions => {
+   const { defaultLinkFormat, removeTitleOnLinkChange } = host.settings()
+   return { format: defaultLinkFormat, keepTitle: !removeTitleOnLinkChange, title: (url) => host.linkTitles.get(url) ?? undefined }
+ }
+
+ /** The one paste decision, pure of any view, so a live editor, a resting cell, and a table rectangle make the same one. In order: a literal paste and code take the text as written; a link the selection sits strictly inside takes the clipboard as its new target, in the container's syntax for ⌘V and in the form's for a Paste As pick, while Plain Text and the inverse chord land as text there; a seat inside another link's `( )` takes the text as written; otherwise the form decides. Null means nothing claims the paste. */
+ export function pasteEdit(
+   scan: DocScan,
+   sel: { from: number; to: number },
+   text: string,
+   how: PasteMode,
+   opts: PasteOptions,
+ ): PasteEdit | null {
+   if (how === 'literal' || inCodeNear(scan, sel.from)) return null
+   const target = clipboardTarget(text, how)
+   if (!target) return null
+   const title = target.kind === 'url' ? opts.title(target.url) : undefined
+   const within = how === 'plain' || how === 'inverse' ? null : linkContainerAt(scan, sel)
+   if (within) {
+     const syntax = how === 'markdown' ? 'markdown' : how === 'connection' ? 'wiki' : within.kind === 'wikiLink' ? 'wiki' : 'markdown'
+     const format = isLinkDisplay(how) ? how : opts.format
+     const write = retarget(syntax, readLinkText(within.text), target, opts.keepTitle, { format, title })
+     return { from: within.range[0], to: within.range[1], write }
+   }
+   const ls = lineStartAt(scan.text, sel.from)
+   if (linkDestinationStart(scan.text.slice(ls, lineEndAt(scan.text, sel.from)), sel.from - ls) !== null) return null
+   const [from, to] = trimmedRange(scan.text, sel.from, sel.to)
+   const write = pasteAsWrite(target, how, { selection: scan.text.slice(from, to), format: opts.format, title })
+   return write && { from, to, write }
+ }
+
+ /** The one live paste: a read-only view declines, a footnote writes its two sites, and otherwise the decision above lands through the one link writer; a plain paste nothing claims is the editor's own. */
+ export function paste(view: EditorView, text: string, how: PasteMode): boolean {
+   // The read-only change filter drops a doc-changing transaction without a trace, so decline before dispatching.
+   if (view.state.readOnly) return false
+   if (how === 'footnote') {
+     insertCitation(view, citationText(text))
+     return true
+   }
+   const host = view.state.facet(editorHost)
+   const edit = pasteEdit(docScan(view.state.doc), view.state.selection.main, text, how, pasteOptions(host))
+   if (!edit) {
+     if (how === 'auto') return false
+     writePlain(view, text)
+   } else if (edit.write.kind === 'link') writeLinkAt(view, edit.from, edit.to, edit.write, 'input.paste')
+   else if (edit.write.kind === 'line') writeLine(view, edit.write.text)
+   else writePlain(view, edit.write.text)
+   view.focus()
+   return true
+ }
+
+ /** Reads the clipboard through main and pastes; the view this was aimed at may be gone by the time the read lands. */
+ export async function pasteFromClipboard(view: EditorView, how: PasteMode): Promise<void> {
+   const text = await view.state.facet(editorHost).clipboard.read()
+   if (text && view.dom.isConnected) paste(view, text, how)
+ }

- export async function pasteAs(view, form: PasteAsForm | 'literal'): Promise<void> { … }

  export const pasteLink = EditorView.domEventHandlers({
    paste(event, view) {
      // Null on CodeMirror's brokenClipboardAPI path, and in jsdom, which has no DataTransfer.
      const text = event.clipboardData?.getData('text/plain')
-     if (!text) return false
-     const link = linkFor(view, text, false)
-     if (!link) return false
-     event.preventDefault()
-     writeLink(view, link)
-     return true
+     // Claimed on the decision alone: claiming after the write would leave the original text pasted alongside the link.
+     if (!text || !paste(view, text, 'auto')) return false
+     event.preventDefault()
+     return true
    },
    keydown(event, view) {
      const host = view.state.facet(editorHost)
      if (!matchesCommand(host.settings().commands['paste-inverse'], event)) return false
      if (view.state.readOnly) return false
      event.preventDefault()
-     void host.clipboard.read().then((text) => { … linkFor … writePlain … })
+     void pasteFromClipboard(view, 'inverse')
      return true
    },
  })
```

`writePlain` and `writeLine` stay as they are. `Menus/menu.ts`'s `applyEditorAction` dispatches `PASTE_LITERAL_ACTION` → `pasteFromClipboard(view, 'literal')` and `pasteAs:<form>` → `pasteFromClipboard(view, form)`.

**VERIFY**

- [ ] `grep -rn "pasteDecision\|decidePaste\|pastedUrl\|linkFor\|'paste:plain'\|PASTE_PLAIN" Core Desktop --include='*.ts' --include='*.tsx'` is empty.
- [ ] Run the gates; `pasteLink.test.tsx`, `pasteAsMenu.test.ts`, `Menus/editorMenu.test.tsx`, `Desktop/Actions/editorMenu.test.ts`, `appMenu` tests pass.
- [ ] In `~/Test`: ⌘V of `https://example.com` at a caret writes the Default Link Format; over a selected word wraps it; ⌘⇧V flips each; Paste As ▸ Plain Text writes the address; Paste Without Formatting writes the clipboard as is.
- [ ] Check for unnecessary code or mistakes.

#### Task 7-2 — Paste inside a link retargets

**TASK:** The container step in `pasteEdit` (Task 7-1) is exercised and pinned: ⌘V and a Paste As form with a link or scheme-bearing address on the clipboard, anywhere strictly inside a link, replace that link's target under `retarget`, ⌘V keeping the container's syntax and a Paste As pick writing the form picked; plain text, Plain Text, ⌘⇧V, Paste Without Formatting, and a schemeless address inside a link paste as text.

**NOW:** Probed at `42a18f4a5`: `[[P2]]` pasted into `[[P1]]`'s title writes `[[P[[P2]]1]]` (E-19); `https://a.co` pasted into `[[Foo|]]` writes `[[Foo|[a.co](https://a.co)]]`, one markdown link (E-20); an address pasted into `[x](https://b.co)` splices into the destination (E-21); Paste As ▸ Connection in `[[Foo]]` nests `[[…]]` (E-22).

**CHANGE**

- [ ] Write the tests (`pasteLink.test.tsx`): the Continuation §5.8 table, pasted with the caret in the title, the heading, and the alias of each container; `https://a.co` pasted into `[[Foo|]]` → `[a.co](https://a.co)`; `https://c.co` into `[x](https://b.co)` → `[x](https://c.co)` (Remove Title On Link Change off) and the Default Link Format's text with it on; `3.14` into `[[P]]`'s title inserts `3.14` as text; plain text into a link inserts as text; Paste As ▸ Plain Text and ⌘⇧V with `https://a.co` inside `[[P1]]` insert the address as text; Paste As ▸ Markdown Link with `[[P2]]` on the clipboard inside `[[P1|a]]` → `[a](P2)`, Paste As ▸ Connection with `[x](P2)` inside `[y](P1)` → `[[P2|y]]`, Paste As ▸ Short Link with `https://c.co` inside `[x](https://b.co)` → the Short Link form whatever the Default Link Format; `paste(view, '[Docs](https://a.com)', 'auto')` at a bare caret → `false` (a written link lands as written); ⌘V right after `[[P]]` (the resting seat) appends rather than retargets; `[[P]]` pasted mid-line `![[Q]]`'s title → `![[P]]`. Watch them fail (they pass once Task 7-1 lands; write them first in that task's red run).
- [ ] No code beyond Task 7-1; this task is the proof.

**AFTER**

The container step of `paste` in Task 7-1.

**VERIFY**

- [ ] The tests above pass; `pasteLink.test.tsx:212` and any case pinning an address inserted inside a destination are rewritten to the retarget.
- [ ] In `~/Test`: with the caret inside `[[Alpha]]`, ⌘V of `[[Beta]]` writes `[[Beta]]`; Edit Link on `[Docs](https://old.example)` then ⌘V of `https://new.example` writes the Default Link Format's text (the setting on) or `[Docs](https://new.example)` (off).
- [ ] Check for unnecessary code or mistakes.

#### Task 7-3 — Rectangle paste and dropped addresses

**TASK:** A rectangle ⌘V over selected table cells formats a single-line address as a plain paste does, with its title fetched first since no editor can swap it later; an address dropped from outside the editor pastes through the same decision.

**NOW:** `MarkdownTable.tsx:243-252` writes `cellToSource(text)` raw into the rectangle; the only drop handler is `dropMargin` (`decorations.ts:760-766`), and CodeMirror's default inserts a dropped address as text.

**CHANGE**

- [ ] Write the tests: `pastedCellText(host, '', { from: 0, to: 0 }, 'https://a.com', 'auto')` with Default Link Format = Short Link → `{ from: 0, to: 0, insert: '[a.com](https://a.com)' }`; with Page Title and a settled title → `[Hello](https://a.com)`, and with a failed fetch the short form; `pastedCellText(host, '', …, 'plain', 'auto')` → `plain`; over `see [[Nope]] x` with the seat inside the title and `[[P2]]` on the clipboard → `{ from: 4, to: 12, insert: '[[P2]]' }` (the container retargets at rest as it does live); inside `` `npm i` `` with an address → the address as typed; a `drop` event carrying `text/uri-list` with `https://a.com` writes the formatted link at the drop point, and one carrying only `text/plain` is left to CodeMirror. Watch them fail.
- [ ] Add `pastedCellText` to `pasteLink.ts`; `MarkdownTable`'s rectangle paste reads it; `pasteLink` gains a `drop` arm.

**AFTER**

```Core/MarkdownPM/Links/pasteLink.ts diff
+ /** What a paste writes into a cell that holds no editor: the decision a live paste makes, over the cell's text, with a title awaited first; a paste nothing claims, or one that would write a lone line, lands as typed at the seat. */
+ export async function pastedCellText(
+   host: EditorHost,
+   built: string,
+   sel: { from: number; to: number },
+   text: string,
+   how: PasteMode,
+ ): Promise<TextEdit> {
+   const edit = pasteEdit(scanDoc(built), sel, text, how, pasteOptions(host))
+   if (!edit || edit.write.kind === 'line') return { ...sel, insert: text }
+   const insert = edit.write.kind === 'text' ? edit.write.text : await settledLinkText(host, edit.write)
+   return { from: edit.from, to: edit.to, insert }
+ }

  export const pasteLink = EditorView.domEventHandlers({
    paste(event, view) { … },
    keydown(event, view) { … },
+   // A link dragged from outside carries `text/uri-list`; the editor's own drags carry text alone and stay CodeMirror's, which moves rather than copies them.
+   drop(event, view) {
+     const text = event.dataTransfer?.types.includes('text/uri-list') ? event.dataTransfer.getData('text/plain') : ''
+     if (!text) return false
+     const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
+     if (pos === null) return false
+     view.dispatch({ selection: { anchor: pos } })
+     if (!paste(view, text, 'auto')) return false
+     event.preventDefault()
+     return true
+   },
  })
```

```Core/MarkdownPM/Tables/MarkdownTable.tsx diff
      } else if (mod && e.key === 'v') {
        claim(e)
-       void host.clipboard.read().then((text) => {
+       void host.clipboard.read().then(async (text) => {
          if (!text) return
          const payload: TablePayload = decodePayload(text) ?? {
            kind: 'rect',
-           grid: [[cellToSource(text)]],
+           grid: [[cellToSource((await pastedCellText(host, '', { from: 0, to: 0 }, text, 'auto')).insert)]],
          }
          onFill(rect.r0, rect.c0, payload)
        })
```

Phase 9's resting Paste row reads `pastedCellText` too.

**VERIFY**

- [ ] Run the gates.
- [ ] In `~/Test`: select two table cells and ⌘V a `https://` address: the top-left cell gets the formatted link; drag a link from a browser into a page: it lands formatted.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] One reviewer reads every paste entry (`paste`, `pasteFromClipboard`, the chord, Paste As, Paste Without Formatting, the rectangle, the drop) for a second decision or a second clipboard reader, and `paste`'s order against the synthesis §3.11 steps with E-19, E-20, E-21, E-25, and E-36 as the probes.
- [ ] Gates green; delta reported.

### Phase 8 — Link Values

**GOAL:** A Link property's value is a link like every other: it draws through the shared resting renderer with the phantom and ambiguous tones, `Page § Heading`, the missing-heading mark, and the glance; it follows where connections follow and honors Open Connections In Preview, ⌘-click, and Tab Open Behavior; clicking its text follows and clicking its padding edits; its commit reads through the one classifier with the index at the gesture and writes through `retarget`; and `[[#Heading]]` and `[x](example.com)` commit. Only an address keeps the property's own look. The last readers of `resolveConnection` go with it.

#### Task 8-1 — A Link value renders through the shared stack

**TASK:** `LinkCell` renders a page value (page, held heading, phantom, ambiguous, hand-written `[x](Page)`) through `TextCell` with the link menu declined, and an address or an invalid value through its URL half, which follows and glances through the shared gestures; `ConnectionCell` and `.cell-connection` go.

**NOW:** `LinkCell.tsx:40-61` branches on `readLink`: a page goes to `ConnectionCell`, which resolves through `resolveConnection`, opens through `useSession.select` with `newTab: isCmd(e)` (so a plain click overrides Tab Open Behavior, B-52), shows `alias ?? title` with no heading, no tone, and no glance; the URL half's anchor opens any non-empty URL and has no glance (A-25…A-28). `Cell.tsx:131-137` mounts `LinkCell` without `ctx.connections`.

**CHANGE**

- [ ] Write the tests (`LinkCell.test.tsx` rewritten): `[[Alpha#Setup]]` renders a `md-connection-resolved` span reading `Alpha § Setup` with `data-link`; `[[Nope]]` renders `md-connection-phantom`; `[[Dup]]` renders `md-connection-ambiguous`; `[x](Alpha)` renders resolved; `[[#Setup]]` with a holder renders resolved; a click on the text calls `connections.open(page, 'Setup', false)` and ⌘-click `open(page, 'Setup', true)`; `https://a.com` renders the URL half with the property's color and, on pointer over, arms the glance; `foo` renders the URL half and a click on its text bubbles. Watch them fail.
- [ ] Rewrite `LinkCell`; `Cell.tsx` passes `connections={ctx.connections}`; `TextCell` takes `menu?: boolean` (default `true`) and passes no `authoring` and no menu when false; delete `ConnectionCell` and `.cell-connection`.

**AFTER**

```Core/Properties/Cells/LinkCell.tsx diff
- /** Opens through the sanctioned IPC — a raw <a> nav is denied by main's will-navigate hardening. Only the Page Title format fetches; the other two derive from the URL itself. */
+ /** A Link value is a link like every other. A page in either syntax, a held heading, and an unresolved title draw and act through the shared resting stack; an address keeps the property's own look, and follows and glances through the shared gestures. Only the Page Title format fetches. */
  export function LinkCell({
    raw,
    def,
    look,
    showFullLink,
    holder,
+   connections,
  }: {
    raw: string
    def: PropertyDefinition | undefined
    look?: ColumnLook
    showFullLink?: boolean
    holder?: ConnPage
+   connections?: () => ConnectionsApi | undefined
  }): React.JSX.Element | null {
-   const target = readLink(raw)
-   const url = target.kind === 'url' ? target.url : ''
+   // One classifier for the value: the index decides page against address where it has an answer, as every editor link does.
+   const api = connections?.()
+   const target = valueTarget(api, raw, holder)
+   const url = target?.kind === 'url' ? target.url : raw.trim()
    const display = isLinkDisplay(look) ? look : (def?.link_display ?? DEFAULT_LINK_DISPLAY)
-   const wantsTitle = display === 'link-title' && !target.alias && isHttpLink(url)
-   const title = useLinkTitle(url, wantsTitle)
-   if (target.kind === 'page')
-     return <ConnectionCell target={target} showTitle={showFullLink === true} holder={holder} />
-   if (!url) return null
+   const title = useLinkTitle(url, display === 'link-title' && !readLinkText(raw)?.alias && isHttpLink(url))
+   if (target && target.kind !== 'url')
+     return (
+       <TextCell
+         text={showFullLink && target.kind === 'page' ? connectionText(target.page.title, undefined, target.heading) : raw}
+         connections={connections}
+         holder={holder}
+         menu={false}
+       />
+     )
+   if (!url) return null
+   const own = holder ? ({ kind: 'held', page: holder } as const) : null
    return (
      <OverScroll className="cell-text-scroll">
        <a
          className={cx('cell-link', def?.link_underline && 'cell-link-underline')}
          style={{ color: solidColorCss(def?.link_color) }}
          href={url}
          // A card is a whole-surface drag handle; without this an anchor's native link-drag hijacks the gesture and the card drag dies.
          draggable={false}
          onClick={(e) => {
-           e.preventDefault()
-           e.stopPropagation()
            if (isSecondaryClick(e)) return
-           openWebLink(url)
+           // The anchor never navigates; a value that follows nothing lets the click bubble to the value, which edits.
+           e.preventDefault()
+           const go = target && resolveFollow(target, own, api, e, openWebLink)
+           if (!go) return
+           e.stopPropagation()
+           go()
          }}
+         onPointerOver={(e) => target && dwellTarget(target, glanceHost, e.currentTarget)?.()}
+         onPointerOut={() => glanceHost.cancel()}
        >
          {showFullLink ? url : linkDisplayText(raw, display, title)}
        </a>
      </OverScroll>
    )
  }
- function ConnectionCell({ … }) { … }
```

`useSession`, `resolveConnection`, `isCmd`, and `LinkTarget` leave the imports; `glanceHost`, `resolveFollow`, `dwellTarget`, `connectionText`, `readLinkText` (the alias read alone), `valueTarget`, and `TextCell` join them.

```Core/Properties/Cells/TextCell.tsx diff
  export function TextCell({
    text,
    connections,
    holder,
    onPane,
+   menu = true,
  }: {
    text: string
    connections?: () => ConnectionsApi | undefined
    holder?: ConnPage
    onPane?: (anchor: HTMLElement) => void
+   /** False for a Link value, whose parent pops the value's own menu over the link's read-only one. */
+   menu?: boolean
  }): React.JSX.Element {
    …
    const { linkAt, dismiss, onContextMenu, onPointerOver, onPointerOut } = linkGestures(text, connections, glanceHost, own)
    …
        onClick={follow}
-       onContextMenu={onContextMenu}
+       onContextMenu={menu ? onContextMenu : undefined}
```

```Core/Properties/Cells/Cell.tsx diff
      case 'link':
        return (
          <LinkCell
            raw={v.value}
            def={def}
            look={style.look}
            showFullLink={showFullLink}
            holder={holder}
+           connections={ctx.connections}
          />
        )
```

```UIX/Table/table.css diff
- .cell-connection {
-   color: var(--connection);
-   text-decoration: none;
-   cursor: pointer;
- }
```

**VERIFY**

- [ ] `grep -rn "ConnectionCell\|cell-connection\|urlClickTarget" Core UIX --include='*.ts' --include='*.tsx' --include='*.css'` is empty after Task 8-2.
- [ ] Run the gates.
- [ ] **Live Check (P8):** a Link value through `TextCell` truncates and shows its ellipsis as the URL half's `OverScroll` does, in a Table, a Card, and the Panel. **Live Check (P3, B-52):** with Open Connections In Preview on, clicking a page value opens the Page Window; with Tab Open Behavior set to new tab and the preview setting off, a plain click opens a new tab.
- [ ] Check for unnecessary code or mistakes.

#### Task 8-2 — Clicks

**TASK:** Clicking a Link value's text follows and clicking its padding edits, for page and address values alike; `valueClickIntent`'s link arm joins the text arm; the `open` intent, its three handlers, and their `openWebLink` imports go, and `TextCell` stops a click only where a follow exists.

**NOW:** `valueClickIntent`'s link arm (`valueClick.ts:47-52`) returns `open` for a valid address, `null` for a page, and `edit` otherwise; `open` has one producer and three handlers (`TableView.tsx:155`, `CardValue.tsx:94`, `PropertyPanel.tsx:301`), each importing `openWebLink` for nothing else; `TextCell.follow` (`TextCell.tsx:34-41`) stops the click on any hit link before knowing whether it can follow, so an ambiguous value's text neither follows nor edits.

**CHANGE**

- [ ] Write the tests: `valueClickIntent('link', { kind: 'link', value: 'https://a.com' })` → `{ kind: 'edit' }` and the same for a page value; a `TextCell` test where a click on an ambiguous link's text bubbles to the host. Watch them fail.
- [ ] Rewrite as below.

**AFTER**

```Core/Properties/Pickers/valueClick.ts diff
  export type ValueIntent =
    …
    | { kind: 'rename' }
-   | { kind: 'open'; url: string }
    | { kind: 'hide' }

- /** Null = the click does nothing: a stamp, the title, or a page link, whose own text opens it. */
+ /** Null = the click does nothing: a stamp or the title. A link's text follows on its own, so a click on the value edits it. */
  export function valueClickIntent(…) {
    …
      case 'text':
+     case 'link':
        return { kind: 'edit' }
-     case 'link': {
-       const raw = value.kind === 'link' ? value.value : ''
-       const url = urlClickTarget(raw)
-       if (url) return { kind: 'open', url }
-       return readLink(raw).kind === 'page' ? null : { kind: 'edit' }
-     }
```

```Core/Views/Table/TableView.tsx · Core/Views/Cards/CardValue.tsx · Core/Properties/PropertyPanel.tsx diff
-     open: ({ url }) => openWebLink(url),
```

```Core/Properties/Cells/TextCell.tsx diff
    const follow = (e: React.MouseEvent): void => {
      if (isSecondaryClick(e)) return
      dismiss(e)
      const found = linkAt(e)
-     if (!found) return
+     const go = found && resolveFollow(found.target, own, connections?.(), e, openWebLink)
+     // A link that follows nothing (ambiguous, invalid) leaves the click to the value, which edits.
+     if (!go) return
      e.preventDefault()
      e.stopPropagation()
-     resolveFollow(found.target, own, connections?.(), e, openWebLink)?.()
+     go()
    }
```

`urlClickTarget` goes from `linkValue.ts` with its last reader.

**VERIFY**

- [ ] `grep -rn "kind: 'open'\|urlClickTarget" Core --include='*.ts' --include='*.tsx'` is empty; `openWebLink` is imported only by `LinkCell.tsx`, `TextCell.tsx`, `WebTile.tsx`, and `editorHost.tsx`.
- [ ] Run the gates; `valueClick.test.ts:61-66` is rewritten.
- [ ] In `~/Test`: clicking a Link value's padding opens the editor; clicking its text follows; an invalid value's text edits.
- [ ] Check for unnecessary code or mistakes.

#### Task 8-3 — The commit

**TASK:** A Link value's Edit Title / Edit Link commit reads through `readLinkText` with the page index read at the gesture (the holder answering a bare `[[#Heading]]`), refuses anything but a resolved page or a valid address, and writes through `retarget` with the stored syntax following the next target's kind; the three inline editors receive the holder and connections; `linkResolve.ts` and `resolveConnection` go.

**NOW:** `parseEditorValue` → `linkValueFromEdit(raw, current, resolveTitle)` (`parseEditorValue.ts:35-40`, `linkValue.ts:82-95`) → `parsePastedLink`, with `resolveTitle` reading the tree through `resolveConnection` (`linkResolve.ts`), whose ambiguity-null is the only refusal of `[[Dup]]` (T-06); `[[#H]]`, `[x](#H)`, and `[x](example.com)` are refused (P-15, A-62); alias carry follows three rules by kind, and Remove Title On Link Change never reaches a value. The inline editors pass no `holder` or `connections` (T-08).

**CHANGE**

- [ ] Write the tests (`linkValue.test.ts`): with an index holding Alpha and two Dups and a holder: `linkValueFromEdit('[[alpha]]', undefined, resolve, false)` → `[[Alpha]]`; `'[[Dup]]'` → `undefined`; `'[[#Setup]]'` → `[[#Setup]]`, and without a holder → `undefined`; `'[x](example.com)'` → `[x](https://example.com)`; `'[x](Nope)'` → `undefined`; `'example.com'` → `https://example.com`; `'[[Alpha]]'` over `[[Beta|Mine]]` with `keepTitle` true → `[[Alpha|Mine]]` and false → `[[Alpha]]`; `'https://b.com'` over `[x](https://a.com)` with `keepTitle` false → `https://b.com`; `'[[beta]]'` over `[[Beta|Mine]]` with `keepTitle` false → `[[Beta|Mine]]` (same target); `'[[Alpha]]'` over `[x](https://a.com)` → `[[Alpha]]` (a page is stored as a connection). Watch them fail.
- [ ] Rewrite `linkValueFromEdit`; `parseEditorValue(type, raw, current, link?)`; `PropertyValueInput` reads the setting and builds the resolver; the three inline editor mounts pass `holder` and `connections`; delete `linkResolve.ts`, `resolveConnection`, `parsePastedLink`, and `ResolveTitle`.

**AFTER**

```Core/Connections/linkValue.ts diff
- export type ResolveTitle = (rawTitle: string) => string | null
- function parsePastedLink(text: string, resolve?: ResolveTitle): string | null { … }
- // `null` clears, `undefined` refuses the commit. Only an address carries its alias through an edit: its field shows the bare URL, so an alias left off the typed text was never on screen.
- export function linkValueFromEdit(raw: string, current: string | undefined, resolve?: ResolveTitle): PropertyValue | null | undefined {
-   const trimmed = raw.trim()
-   if (trimmed === '') return null
-   const pasted = parsePastedLink(trimmed, resolve)
-   if (pasted !== null) return { kind: 'link', value: pasted }
-   if (!isValidLink(trimmed)) return undefined
-   const cur = current ? readLink(current) : undefined
-   const alias = cur?.kind === 'url' ? cur.alias : undefined
-   return { kind: 'link', value: serializeLink({ url: normalizeLinkUrl(trimmed), alias }) }
- }
+ /** `null` clears, `undefined` refuses the commit. The typed text names a resolved page or a valid address, or it's refused; the value's alias follows the one retarget rule, and a page is stored as a connection whatever syntax the typed text or the old value used. */
+ export function linkValueFromEdit(
+   raw: string,
+   current: string | undefined,
+   resolve: PageIndex['resolve'],
+   keepTitle: boolean,
+ ): PropertyValue | null | undefined {
+   const trimmed = raw.trim()
+   if (trimmed === '') return null
+   const next = readLinkText(trimmed, resolve)
+   if (!next) return undefined
+   const was = current ? readLinkText(current) : null
+   return { kind: 'link', value: retarget('wiki', was, next, keepTitle).text }
+ }
```

```Core/Properties/parseEditorValue.ts diff
- import { resolveTitle } from './Cells/linkResolve'
+ export interface LinkEditContext { resolve: PageIndex['resolve']; keepTitle: boolean }
  export function parseEditorValue(
    type: PropertyType | 'title' | undefined,
    raw: string,
    current?: PropertyValue | null,
+   link?: LinkEditContext,
  ): PropertyValue | null | undefined {
    …
-   if (type === 'link') return linkValueFromEdit(raw, current?.kind === 'link' ? current.value : undefined, resolveTitle)
+   if (type === 'link' && link)
+     return linkValueFromEdit(raw, current?.kind === 'link' ? current.value : undefined, link.resolve, link.keepTitle)
```

```Core/Properties/Pickers/PropertyValueInput.tsx diff
+ /** The index read at the gesture, with a bare `[[#Heading]]` answered by the page holding the value; a Space holds none, so there it stays unresolved. */
+ const linkResolver = (api: ConnectionsApi | undefined, holder: ConnPage | undefined): PageIndex['resolve'] => (title) =>
+   title === '' ? (holder ? { status: 'resolved', page: holder } : { status: 'phantom' }) : (api?.resolve(title) ?? { status: 'phantom' })

  export function PropertyValueInput({ def, current, holder, connections, alias, popover, onCommit, onClose }) {
+   const keepTitle = !useSetting('removeTitleOnLinkChange')
    …
    const raw = current?.kind === 'link' ? current.value : ''
    const initial = alias ? (readLinkText(raw)?.alias ?? '') : editorText(current)
    const parse = (text: string): PropertyValue | null | undefined =>
-     alias ? linkValueFromRename(text, raw) : parseEditorValue(def.type, text, current)
+     alias
+       ? linkValueFromRename(text, raw)
+       : parseEditorValue(def.type, text, current, { resolve: linkResolver(connections?.(), holder), keepTitle })
```

```Core/Properties/PropertyPanel.tsx · Core/Views/Cards/CardValue.tsx · Core/Views/Table/TableView.tsx diff
                <PropertyValueInput
                  def={def}
                  current={current}
+                 holder={holderOf(row, ctx)}
+                 connections={ctx.connections}
                  onCommit={…}
                  onClose={…}
                />
```

`Core/Properties/Cells/linkResolve.ts` is deleted; `resolveConnection` leaves `Nexus/treeIndex.ts` with its comment. The resolver reads the index the value's own `connections` carries, which `pageConnections.ts` rebuilds on every tree change, so a page created moments ago resolves.

**VERIFY**

- [ ] `grep -rn "resolveConnection\|linkResolve\|parsePastedLink\|ResolveTitle\|resolveTitle" Core --include='*.ts' --include='*.tsx'` is empty.
- [ ] Run the gates; `linkValue.test.ts:241,249,255-262` are rewritten to the rules above.
- [ ] In `~/Test`: Edit Link on a Link value, type `[[#Setup]]` on a page with a Setup heading: it commits and draws `§Setup`; type `[[Dup]]` with two Dup pages: the field marks invalid; type `example.com`: it commits as `https://example.com`.
- [ ] Check for unnecessary code or mistakes.

#### Task 8-4 — Panel Remove, the popover's alias, and the fallback menu

**TASK:** The pieces Tasks 6-5 and 8-3 left: the Panel's value menu offers Remove (landed in 6-5; verified here end to end), the alias popover reads `readLinkText`'s alias (landed in 8-3), and the fallback cell menu for an unresolvable value keeps its `Edit` and `Rename` labels, the one place a label differs, since a value with no target can't say Edit Title or Edit Link.

**NOW:** `cellMenuModel({ kind: 'link' })` offers `Edit · Rename · Clear · Remove` (`cellMenu.ts:128-133`) when the value menu has no target.

**CHANGE**

- [ ] Write the test: a Panel with a phantom Link value pops `cellMenuModel({ kind: 'link', filled: true })` and `Edit` opens the editor. Watch it pass (this pins the one deliberate difference).
- [ ] No code; the two sibling sweeps are in Tasks 6-5 and 8-3.

**AFTER**

Unchanged: `Core/Actions/cellMenu.ts`'s `link` arm.

**VERIFY**

- [ ] In `~/Test`: right-click a Link value naming a missing page: Edit · Rename · Clear (· Remove in a Card and the Panel).
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] One reviewer reads `LinkCell`, `TextCell`, `valueTarget`, `linkValueFromEdit`, and the three parents for a path where a Link value still resolves, opens, or classifies on its own rather than through the shared chain, and probes the Continuation §5.7 commit rules at the field.
- [ ] **Hand-check (Nathan):** a visual pass on Link values in a Table, a Card, and the Panel: a page, a heading link, an alias, a phantom, an ambiguous title, an address in each Format, and a hand-written `[x](Page)`.
- [ ] Gates green; delta reported.

### Phase 9 — MarkdownPM Table Cells at Rest

**GOAL:** A right-click anywhere in a resting table cell opens that construct's menu without focusing the cell: a link takes the link door (Phase 6), everything else the same editor-menu door a live cell asks through, with the system rows acting at rest. A chosen row that writes commits without placing the caret; a row that opens a typing slot or needs typing enters the cell with the selection seated. The seat and the guarded commit landed in Task 6-4. A proving scout built this phase on a scratch worktree at `42a18f4a5`; its diff is `.claude/Planning/MarkdownPM Links/proving/resting-cell.diff` (gates green, 524 files / 7,561 tests), and the tasks below are written from it with five corrections: the mapper reads the `data-src` spans Phase 4 draws, a point bypasses the selection-edge rule, Paste and Paste As run through Phase 7's pipeline, Format ▸ External Link over a selection enters the cell since its address is empty, and the seat and `commitAtRest` land ahead of the link door that reads them.

#### Task 9-1 — Every construct answers at rest

**TASK:** A resting cell claims every right press, consults `readOnly()` once, and for a non-link right-click asks the editor menu through `host.menus.format` with `resting: { selection }` carrying the source text under the click; a pointer-to-offset mapper reads the `data-src` spans the renderer draws; main pops the menu for a resting request with renderer-resolved Cut, Copy, and Paste and without Undo, Redo, and Select All.

**NOW:** `cellStatic.tsx:354-357` opens the link door or focuses the cell (R-02), so no non-link construct has a menu at rest; `onMouseDown` claims a right press only over a link (`:384-386`); `readOnly()` is consulted at four sites. Main's `context-menu` handler returns before `systemItems` when `!params.isEditable` (`Desktop/Actions/editorMenu.ts:128`), which Chromium reports for the static cell (`WidgetTile` sets `contentEditable="false"`; confirmed over CDP against the running instance); `editorContextItems` reads `params.selectionText`, which at rest is the drawn text (an alias, not `[[Page|alias]]`), so Insert Link's gate and Cut/Copy's enablement need the source selection. The role rows act on whatever has focus, which at rest is the page body's caret or nothing (R-19).

**CHANGE**

- [ ] Write the tests (`cellOffsets.test.tsx`, `cellRestingMenu.test.tsx`, `Desktop/Actions/editorMenu.test.ts`, `cellStatic.test.tsx:117-127` flipped): the mapper maps a point in plain text, inside `**bold**` text, on an alias (clamps to its token), on a `§` run, on a list glyph (clamps to the marker), and on an empty line's filler; a range from offset 0 of a mark's drawn text takes the hidden markers (`Copy` of the drawn "a bc" in `**a** bc` yields `**a** bc`), while a point at that offset maps inside the mark; a right-click on plain text asks `host.menus.format` with `scope: 'cell'`, `resting: { selection }`, and the source selection, and leaves no `.cm-editor` mounted; a read-only cell asks nothing; main's resting branch lists Cut, Copy, Paste as actions, no Undo/Redo/Select All, and enables Cut/Copy only with a selection. Watch them fail.
- [ ] Rewrite as below.

**AFTER**

```Core/Actions/editorMenu.ts diff
  export const editorMenuRequest = z.object({
    …
    citeSeat: z.boolean(),
+   // A resting table cell has no focused editor for the native edit roles to act on, so it sends the source its reply acts over; a live editor sends null.
+   resting: z.object({ selection: z.string() }).nullable(),
  })
  export const INSERT_LINK_ACTION = 'link:insert' as const
  export const PASTE_LITERAL_ACTION = 'paste:literal' as const
+ /** The edit rows a resting cell answers itself, where a native role would act on whatever holds focus. */
+ export const RESTING_EDITS = { cut: 'edit:cut', copy: 'edit:copy', paste: 'edit:paste' } as const
```

```Core/MarkdownPM/Input/formatState.ts diff
- ): Omit<EditorMenuRequest, 'scope' | 'x' | 'y' | 'embedSeat' | 'citeSeat'> {
+ ): Omit<EditorMenuRequest, 'scope' | 'x' | 'y' | 'embedSeat' | 'citeSeat' | 'resting'> {
```

```Core/MarkdownPM/Menus/menu.ts diff
@@ editorMenu · contextmenu @@
          citeSeat: page && citationSeatAt(view.state, to),
+         resting: null,
```

```Desktop/Actions/editorMenu.ts diff
@@ systemItems @@
+   const resting = editor?.req.resting
+   const canPaste = resting ? clipboard.readText() !== '' : f.canPaste
    items.push(
-     { role: 'undo', enabled: f.canUndo },
-     { role: 'redo', enabled: f.canRedo },
-     { type: 'separator' },
-     { role: 'cut', enabled: f.canCut },
-     { role: 'copy', enabled: f.canCopy },
-     { role: 'paste', enabled: f.canPaste },
+     ...(resting && editor
+       ? restingEditItems(editor, resting.selection !== '', canPaste)
+       : ([
+           { role: 'undo', enabled: f.canUndo },
+           { role: 'redo', enabled: f.canRedo },
+           { type: 'separator' },
+           { role: 'cut', enabled: f.canCut },
+           { role: 'copy', enabled: f.canCopy },
+           { role: 'paste', enabled: f.canPaste },
+         ] satisfies MenuItemConstructorOptions[])),
      ...(editor ? pasteAsItems(editor) : []),
      {
        label: 'Paste Without Formatting',
-       enabled: f.canPaste,
+       enabled: canPaste,
        click: editor ? () => editor.resolve(PASTE_LITERAL_ACTION) : () => wc.pasteAndMatchStyle(),
      },
-     { role: 'selectAll' },
+     ...(resting ? [] : [{ role: 'selectAll' } as const]),
      ...(editor ? editorRows(editor, changeColorItems(editor.req, heldCommands())) : []),
    )
    return items
  }

+ // A role acts on whatever holds focus, which a resting cell never does, so its edits answer the cell instead; with no focused history behind it, Undo, Redo, and Select All have nothing to act on. The accelerators are shown, not bound: the chords stay the focused surface's.
+ function restingEditItems(editor: EditorMenu, selected: boolean, canPaste: boolean): MenuItemConstructorOptions[] {
+   const answer = (action: string) => () => editor.resolve(action)
+   return [
+     { label: 'Cut', enabled: selected, accelerator: 'CmdOrCtrl+X', registerAccelerator: false, click: answer(RESTING_EDITS.cut) },
+     { label: 'Copy', enabled: selected, accelerator: 'CmdOrCtrl+C', registerAccelerator: false, click: answer(RESTING_EDITS.copy) },
+     { label: 'Paste', enabled: canPaste, accelerator: 'CmdOrCtrl+V', registerAccelerator: false, click: answer(RESTING_EDITS.paste) },
+   ]
+ }

@@ installEditorContextMenu @@
      const editor = takeEditorMenu(win, params)
-     if (!params.isEditable) return editor?.resolve(null) // the sidebar keeps its own menus
+     // The sidebar keeps its own menus; a resting cell reads as not editable but asks for this one.
+     if (!params.isEditable && !editor?.req.resting) return editor?.resolve(null)
      const items = systemItems(win.webContents, params, editor)
-     if (editor)
+     if (editor) {
+       const selection = editor.req.resting?.selection ?? params.selectionText
        items.push(
          { type: 'separator' },
-         ...editorRows(editor, editorContextItems(editor.req, heldCommands(), params.selectionText)),
+         ...editorRows(editor, editorContextItems(editor.req, heldCommands(), selection)),
        )
+     }
```

```Core/MarkdownPM/Tables/cellStatic.tsx diff
@@ renderCellContent · the spans @@
+   // `at` is where a span's text begins in the source when that text IS the source; a span without it draws something else in the source's place (an alias, a `§`, an ordinal, a glyph) and maps to its token's edges.
+   const verbatim = (s: number, e: number, at: number) => ({ ...src(s, e), 'data-at': base + at })
    …  the phantom pieces, the htmlTag pieces, and the default arm carry `verbatim(...)`; a link's span, the citation ordinal, and the `§` run carry `src(...)`/`linkSpan(...)` alone

@@ MarkerGlyph @@
- function MarkerGlyph({ lm, glyph, line }: { lm: ListMarker; glyph: ListGlyph; line: string }) {
+ function MarkerGlyph({ lm, glyph, line, at }: { lm: ListMarker; glyph: ListGlyph; line: string; at: number }) {
+   const src = `${at},${at + lm.contentStart}`
    …  each returned span carries data-src={src}

@@ renderCellBody @@
-       data-cell-line={i}
+       data-cell-line={i}
+       data-base={starts[i]}
        …
-       {it && <MarkerGlyph lm={it.lm} glyph={it.glyph} line={line} />}
+       {it && <MarkerGlyph lm={it.lm} glyph={it.glyph} line={line} at={starts[i]} />}

+ const isFiller = (n: Node): boolean =>
+   n.nodeType === Node.TEXT_NODE && n.textContent === '​' && n.parentElement?.dataset.cellLine !== undefined
+
+ /** Where a DOM point inside a resting cell sits in the cell's source. A span that draws something other than its source clamps to the token it stands for; text between spans reads from what precedes it. A range's edge that touches a mark's drawn text takes the markers it hides; a point doesn't. Read at a right-click or a copy, never on render. */
+ export function cellOffsetAt(cell: Element, node: Node, offset: number, side?: 'start' | 'end'): number {
+   // A point between children reads as the start of the child after it.
+   while (node.nodeType !== Node.TEXT_NODE && offset < node.childNodes.length && !(node as HTMLElement).matches('[data-src]')) {
+     node = node.childNodes[offset]
+     offset = 0
+   }
+   const drawn = (node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement))?.closest<HTMLElement>('[data-src]')
+   if (drawn && cell.contains(drawn)) {
+     const [s, e] = srcOf(drawn) ?? [0, 0]
+     if (node === drawn) return offset === 0 ? s : e
+     const at = drawn.dataset.at
+     const edge = side !== undefined && offset === (side === 'start' ? 0 : node.textContent?.length)
+     if (at !== undefined && node.parentNode === drawn && !edge) return Number(at) + offset
+     return side === 'end' ? e : s
+   }
+   let acc = node.nodeType === Node.TEXT_NODE && !isFiller(node) ? offset : 0
+   let prev = node.nodeType === Node.TEXT_NODE ? node.previousSibling : node.childNodes[offset - 1]
+   let parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
+   while (parent) {
+     for (; prev; prev = prev.previousSibling) {
+       if (prev.nodeType === Node.TEXT_NODE) {
+         if (!isFiller(prev)) acc += (prev as Text).data.length
+         continue
+       }
+       const sib = prev as HTMLElement
+       if (sib.matches('[data-src]')) return (srcOf(sib)?.[1] ?? 0) + acc
+       return cellOffsetAt(cell, sib, sib.childNodes.length) + acc
+     }
+     if (parent === cell) return acc
+     const lineBase = parent.dataset.base
+     if (lineBase !== undefined) return Number(lineBase) + acc
+     prev = parent.previousSibling
+     parent = parent.parentElement
+   }
+   return acc
+ }
+
+ /** The source a right-click reads: the selection when the click lands inside it, clamped to this cell, else the point under the pointer. */
+ function restingRange(cell: HTMLElement, x: number, y: number, length: number): [number, number] {
+   const caret = document.caretPositionFromPoint?.(x, y)
+   const at = caret && cell.contains(caret.offsetNode) ? cellOffsetAt(cell, caret.offsetNode, caret.offset) : length
+   const sel = window.getSelection()
+   const range = sel && !sel.isCollapsed && sel.rangeCount > 0 ? sel.getRangeAt(0) : null
+   if (!range?.intersectsNode(cell)) return [at, at]
+   const from = cell.contains(range.startContainer) ? cellOffsetAt(cell, range.startContainer, range.startOffset, 'start') : 0
+   const to = cell.contains(range.endContainer) ? cellOffsetAt(cell, range.endContainer, range.endOffset, 'end') : length
+   return at >= from && at <= to ? [from, to] : [at, at]
+ }

@@ StaticCellImpl @@
+   const restingMenu = (e: React.MouseEvent<HTMLElement>): void => {
+     const ask = host.menus.format
+     if (!ask) return
+     const built = text
+     const [from, to] = restingRange(e.currentTarget, e.clientX, e.clientY, built.length)
+     void ask({
+       ...readFormatState(scanDoc(built), from, to),
+       scope: 'cell',
+       x: e.clientX,
+       y: e.clientY,
+       embedSeat: false,
+       citeSeat: false,
+       resting: { selection: built.slice(from, to) },
+     }).then((action) => {
+       if (action) void restingAction(action, built, from, to)
+     })
+   }
    …
      <div
        className="mdpm-tbl-cell-static"
        onContextMenu={(e) => {
-         if (onContextMenu(e) || readOnly()) return
-         onActivate({ kind: 'point', x: e.clientX, y: e.clientY })
+         // The link's own menu claims the event; the editor menu leaves it undefaulted, since main pops the native menu only when the renderer does.
+         if (onContextMenu(e) || readOnly()) return
+         e.stopPropagation()
+         restingMenu(e)
        }}
        …
        onMouseDown={(e) => {
-         // Claiming a right press here is what stops the browser selecting the word under the pointer before the menu opens.
-         if (e.button === 2) {
-           if (linkSpanAt(e.target)) e.preventDefault()
-           return
-         }
+         // Claiming every right press is what stops the browser seating the word under the pointer before the menu reads the selection.
+         if (e.button === 2) return e.preventDefault()
          if (e.button === 0) claimCheckbox(e) ?? claimCite(e) ?? claimLink(e)
        }}
```

`restingAction` is Task 9-2's. On an `inert` host (`menus.format` undefined: a glance, a page's history) a resting right-click does nothing, where it used to enter a read-only cell; the link door still answers there.

**VERIFY**

- [ ] `grep -rn "readOnly()" Core/MarkdownPM/Tables/cellStatic.tsx` shows the one consult in `onContextMenu` plus the left-click, sweep, and checkbox gates that already exist.
- [ ] Run the gates.
- [ ] **Live Checks (R-16, R-19, R-20):** in `~/Test`, right-click plain text in a resting cell: the editor menu pops with Cut/Copy/Paste, Paste As, Paste Without Formatting, Lists ▸, Format ▸ and no Undo/Redo/Select All; Paste Without Formatting is enabled only with clipboard text; no role row reaches the page body's caret; a right-click on a link still pops the link menu and nothing else.
- [ ] Check for unnecessary code or mistakes.

#### Task 9-2 — Commit at rest

**TASK:** `restingAction` dispatches the editor menu's reply through `editFor` and commits through `commitAtRest` (Task 6-4), enters the cell for a slot meant for typing, and Insert Link becomes a pure `insertLinkEdit` in `editFor`'s switch.

**NOW:** No row the editor menu offers has a resting applier, since no construct but a link answers a resting right-click; `insertLinkOverSelection` (`menu.ts:47-60`) dispatches on the view.

**CHANGE**

- [ ] Write the tests (`cellRestingMenu.test.tsx`): Bold over a selection commits `**sel**` and mounts no editor; Bold at a point commits `****` and enters with the caret between; Lists ▸ Bulleted at a point commits `- text` and stays at rest; Format ▸ External Link over a selection commits `[sel]()` and enters with the caret inside `()`; Format ▸ Connection over a selection commits `[[sel]]` and stays at rest; Insert Link over `example.com` commits `[example.com](https://example.com)`. Watch them fail.
- [ ] Rewrite as below; `insertLinkEdit` joins `editFor` in `Input/format.ts`; `insertLinkOverSelection` and its `applyEditorAction` line go.

**AFTER**

```Core/MarkdownPM/Input/format.ts diff
@@ editFor @@
    switch (group) {
+     case 'link':
+       return value === 'insert' ? insertLinkEdit(scan.text, from, to) : null
      case 'format':
      …
+ /** The selected words stay the label, so a schemeless address keeps its bare form while its target gains the scheme. */
+ function insertLinkEdit(doc: string, selFrom: number, selTo: number): FormatEdit | null {
+   const [from, to] = trimmedRange(doc, selFrom, selTo)
+   const text = doc.slice(from, to)
+   if (!text.trim() || !isValidLink(text)) return null
+   const insert = serializeLink(normalizeLinkUrl(text), text)
+   return { changes: [{ from, to, insert }], selection: from + insert.length }
+ }
```

```Core/MarkdownPM/Menus/menu.ts diff
- /** The selected words stay the label, so a schemeless address keeps its bare form while its target gains the scheme. */
- function insertLinkOverSelection(view: EditorView): boolean { … }
  export function applyEditorAction(view: EditorView, action: string): boolean {
    if (action === 'block:page') return embedInsertAtCaret(view)
    if (action === 'block:webpage') return webpageInsertAtCaret(view)
-   if (action === INSERT_LINK_ACTION) return insertLinkOverSelection(view)
```

```Core/MarkdownPM/Tables/cellStatic.tsx diff
@@ StaticCellImpl @@
+   /** A row the editor menu answered with, applied at rest. A mark written at a point and a link written with an empty address are slots only typing fills, so those enter the cell; every other write commits where it stands. */
+   const restingAction = async (action: string, built: string, from: number, to: number): Promise<void> => {
+     switch (action) {
+       case RESTING_EDITS.copy:
+         return void host.clipboard.write(built.slice(from, to))
+       case RESTING_EDITS.cut:
+         void host.clipboard.write(built.slice(from, to))
+         commitAtRest(built, [{ from, to, insert: '' }])
+         return
+       case RESTING_EDITS.paste:
+         return pasteAtRest(built, from, to, 'auto')
+       case PASTE_LITERAL_ACTION:
+         return pasteAtRest(built, from, to, 'literal')
+     }
+     if (action.startsWith(PASTE_AS_PREFIX))
+       return pasteAtRest(built, from, to, action.slice(PASTE_AS_PREFIX.length) as PasteAsForm)
+     const edit = editFor(action, scanDoc(built), from, to)
+     if (!edit || !commitAtRest(built, edit.changes)) return
+     const slot = /^(format|highlight):/.test(action) && (from === to || action === 'format:link' || action === 'format:linkText')
+     if (slot && edit.selection !== undefined) onActivate({ kind: 'select', range: [edit.selection, edit.selection] })
+   }
```

`pasteAtRest` is Task 9-3's. The slot rule is gated on the format and highlight rows because a list, heading, or block row also returns a `selection` for a single-line edit (`format.ts:180,237,310-335`), and those write a line and stay at rest.

**VERIFY**

- [ ] Run the gates.
- [ ] In `~/Test`: in a resting cell, select a word and choose Format ▸ Bold: the cell stays at rest, bold applied; right-click a blank spot and choose Bold: the cell opens with the caret inside `****`; Format ▸ Connection over a word writes `[[word]]` at rest.
- [ ] Check for unnecessary code or mistakes.

#### Task 9-3 — System rows at rest

**TASK:** Cut and Copy write the source slice through `host.clipboard`; Paste, Paste As, and Paste Without Formatting run through Phase 7's pipeline at the click's range, with a table-shaped clipboard filling cells through `onFill`.

**NOW:** Nothing at rest; a live cell's `input.paste` filter routes a table payload to `onTablePaste` (`CellEditor.tsx:154-163`), and `onFill` reaches `CellEditor` only (R-23).

**CHANGE**

- [ ] Write the tests (`cellRestingMenu.test.tsx`): Copy over a DOM selection writes the source slice (`[[Page|alias]]`, not `alias`); Cut copies then commits the deletion; Paste of `https://a.com` at a point commits the Default Link Format's text, and with Page Title and a settled title the titled form; Paste of `| a | b |\n| - | - |` calls `onFill` with the decoded payload; Paste As ▸ Connection with `[[P]]` on the clipboard commits `[[P]]`; Paste Without Formatting commits the clipboard as is; Paste over a selection with an address wraps it. Watch them fail.
- [ ] Add `pasteAtRest` and the `onFill` prop.

**AFTER**

```Core/MarkdownPM/Tables/cellStatic.tsx diff
@@ StaticCellImpl props @@
+   /** A table-shaped clipboard pasted at rest fills cells, as a live paste does. */
+   onFill: (payload: TablePayload) => void
@@ StaticCellImpl @@
+   const pasteAtRest = async (built: string, from: number, to: number, how: PasteMode): Promise<void> => {
+     const clip = await host.clipboard.read()
+     if (!clip) return
+     const payload = decodePayload(clip)
+     if (payload) return onFill(payload)
+     commitAtRest(built, [await pastedCellText(host, built, { from, to }, clip, how)])
+   }
```

```Core/MarkdownPM/Tables/MarkdownTable.tsx diff
-   const live = useLatest({ onCellCommit, onSettled, model })
+   const live = useLatest({ onCellCommit, onSettled, onFill, model })
    …
        <StaticCell
          …
+         onFill={(payload) => live.current.onFill(row, col, payload)}
```

A `table`-kind payload still falls to the widget's `fill`, which returns early for it. The clipboard is read a second time here after main read it to build the rows, as the live `pasteAs` does.

**VERIFY**

- [ ] Run the gates.
- [ ] In `~/Test`: copy a two-cell rectangle, right-click a resting cell and Paste: the cells fill; right-click a resting cell and Paste a `https://` address: it lands formatted; select drawn text in a resting cell, Copy, paste into a text editor: the source syntax arrives.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] One reviewer reads the resting cell against the live cell for a row that behaves differently at rest without a ruling behind it, and the mapper against the renderer's spans for a drawn element it can't map.
- [ ] **Hand-check (Nathan):** resting-cell menus across plain text, a selection, a link, a checkbox line, a `§` run, and a read-only embedded page.
- [ ] Gates green; delta reported.

### Phase 10 — The Picker

**GOAL:** `[[` and `[label](` open the picker whether or not Pair Brackets is on, Enter or a pick writes the closer, and dismissing leaves the typed text; the picker's query lives in editor state like the block menu's; the embed form and the `![[` loop go, since a closed `![[Page]]` is `!` plus a connection; the link form commits through `retarget` and the markdown arms honor Remove Title On Link Change; heading rows read the index. This phase deletes the `![[` loop, so the opener rule lands in it (E-31).

#### Task 10-1 — The opener rule, and the embed form's end

**TASK:** `autocompleteQuery(scan, caret, armed?)` reads a closed connection through `connectionAt`, an unclosed one through `openConnectionAt`, a closed markdown destination through `markdownDestinationAt`, and an unclosed one through the same reader over the line up to the caret plus `)`; the query carries `closed`, and `commitEdit` writes the closer when it's false. `form: 'embed'`, `allowEmbeds`, `formSyntax`'s embed arm, the `![[` loop, the pool filter, and `embeddable` go.

**NOW:** `autocompleteQuery` (`autocomplete.ts:44-136`) needs a closed `[[…]]` or `)` and refuses `[[]]`, so with Pair Brackets off `[[Foo` and `[label](foo` open nothing, and with it on `[[` opens on the first title character rather than on the brackets; only the `![[` loop (`:119-134`) reads unclosed input. The `embed` form, `allowEmbeds`, `formSyntax`'s embed arm (`:207-208`), and the pool filter (`useConnectionAutocomplete.ts:134-140`) serve the loop; `embeddable` (`embedWidget.tsx`) has the filter and `embedPickTree` (`gripMenu.ts:29`) as readers. Insert ▸ Embed ▸ Internal Page writes `![[]]`, which only the loop opens (E-31).

**CHANGE**

- [ ] Write the tests (`autocomplete.test.ts:25-26,92,120` rewritten): `autocompleteQuery(scanDoc('see [[Pro'), 9)` → `{ query: 'Pro', from: 4, to: 9, form: 'link', closed: false }`; `('see [['), 6)` → `{ query: '', from: 4, to: 6, form: 'link', closed: false }`; `('![[]]'), 3)` → `{ query: '', from: 1, to: 5, form: 'link', closed: true }`; `('[[Page#He'), 9)` → heading form, `closed: false`; `('[label](Pa'), 10)` → `{ form: 'target', closed: false }`; `('[[Pro]]'), 5)` → `closed: true`; `commitEdit({ …link, closed: false }, 'Project')` writes `[[Project]]`; a heading pick in an unclosed `[[Page#He` writes `Heading]]`; a target pick in `[label](Pa` writes `Page)`; `connectionCommit.test.tsx`: with Pair Brackets off, typing `[[Pro` opens the pane and Enter writes `[[Project]]` with the caret after `]]`; Escape leaves `[[Pro`. Watch them fail.
- [ ] Rewrite as below; the `exact` rule in `candidates` stays and the `query === '' && form === 'link'` refusal goes, so an empty `[[` browses alphabetically as `![[]]` did.

**AFTER**

```Core/MarkdownPM/Autocomplete/autocomplete.ts diff
- type ConnectionForm = 'link' | 'embed' | 'alias' | 'target' | 'heading' | 'fragment' | 'section'
+ type ConnectionForm = 'link' | 'alias' | 'target' | 'heading' | 'fragment' | 'section'
  export interface AutocompleteQuery {
    query: string
    from: number
    to: number
    form: ConnectionForm
+   /** Whether the link's closer is already written; a commit writes it when not. */
+   closed: boolean
    title?: string
    label?: { from: number; to: number }
  }
- export type AcQuery = …

- export function autocompleteQuery(scan, caret, allowEmbeds = false, armed?): AutocompleteQuery | null {
+ export function autocompleteQuery(scan: DocScan, caret: number, armed?: number): AutocompleteQuery | null {
    if (inCodeAt(scan, caret)) return null
    …  (the armed section arm is unchanged, with `closed: true`)
-   const s = connectionAt(scan, caret)
+   const closedLink = connectionAt(scan, caret)
+   const s = closedLink ?? openConnectionAt(scan, caret)
    if (s) {
+     const closed = closedLink !== null
+     if (!closed && s.title[0] === s.title[1]) {
+       const after = line.startsWith(']]', rel)
+       return { query: '', from: lineStart + s.full[0], to: lineStart + rel + (after ? 2 : 0), form: 'link', closed: after }
+     }
      const title = line.slice(s.title[0], s.title[1])
      // Only the TITLE opens the page picker: accepting replaces the whole token, so a caret in the alias would arm a list keyed on the title and discard the alias on Enter.
      if (rel >= s.title[0] && rel <= s.title[1])
-       return { query: title, from: lineStart + s.full[0], to: lineStart + s.full[1], form: 'link' }
+       return { query: title, from: lineStart + s.full[0], to: lineStart + s.full[1], form: 'link', closed }
      if (s.heading && rel >= s.heading[0] && rel <= s.heading[1])
-       return { query: …, from: …, to: …, form: 'heading', title }
+       return { query: …, from: …, to: …, form: 'heading', closed, title }
      if (s.alias && rel >= s.alias[0] && rel <= s.alias[1])
-       return { query: …, from: …, to: …, form: 'alias', title }
+       return { query: …, from: …, to: …, form: 'alias', closed, title }
    }
-   const md = markdownDestinationAt(line, rel)
+   // An unclosed `[label](dest` reads as the link it would be once closed, as an unclosed `[[` does.
+   const closedMd = markdownDestinationAt(line, rel)
+   const md = closedMd ?? markdownDestinationAt(`${line.slice(0, rel)})`, rel)
    if (md) {
+     const closed = closedMd !== null
      …
-       return { query: …, from: …, to: …, form: 'target', label }
+       return { query: …, from: …, to: …, form: 'target', closed, label }
      …
-     return { query: …, from: …, to: …, form: 'fragment', title: …, label }
+     return { query: …, from: …, to: …, form: 'fragment', closed, title: …, label }
    }
-   // A LOCAL match — the connections pattern excludes an embed opener by design …
-   if (allowEmbeds) { for (let idx = line.indexOf('![['); …) { … form: 'embed' … } }
    return null
  }
```

An unclosed link is read up to the caret, so a pick replaces what stands before the caret and leaves what follows it, as typing would (`[[Projct` with the caret moved back two and a pick of Project reads `[[Project]]ct`). An empty `[[` (`openConnectionAt`'s empty opener) opens from the brackets to the caret, or past an existing `]]` when one follows, so `![[]]` and a Pair-Bracketed `[[|]]` open with `closed: true`.

```Core/MarkdownPM/Autocomplete/autocomplete.ts diff
@@ formSyntax · commitEdit @@
- /** A carried `alias` rides only the link form — `![[ ]]` has no alias syntax, and the alias form writes into a link that already exists. */
- function formSyntax(value, form, alias?): string {
-   switch (form) {
-     case 'alias': case 'heading': case 'section': return value
-     case 'target': case 'fragment': return encodeLinkTarget(value)
-     case 'embed': return pageEmbedText(value)
-     case 'link': return alias ? `[[${value}|${alias}]]` : `[[${value}]]`
-   }
- }
- export function connectionInsert(value, from, form = 'link', alias?): { insert: string; caret: number } { … }
+ /** The closer a commit writes when the link wasn't closed yet. */
+ const closerOf = (form: ConnectionForm): string =>
+   form === 'target' || form === 'fragment' ? ')' : form === 'section' ? '' : ']]'
```

The link form's commit is Task 10-3's; `commitEdit`'s slot arms (`heading`, `alias`, `target`, `fragment`, `section`) append `closerOf(ac.form)` to their insert when `!ac.closed` and keep their anchors, which then sit past the closer as they do today past a written one.

```Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts diff
-   const q = empty ? autocompleteQuery(docScan(u.state.doc), head, scope === 'page', armed.current ?? undefined) : null
+   const q = empty ? autocompleteQuery(docScan(u.state.doc), head, armed.current ?? undefined) : null
@@ lookup @@
-   const embed = form === 'embed'
-   let pool = conn.candidates(q, embed ? AC_MAX * 2 : AC_MAX)
-   if (embed) { … embedExclusions … embeddable … }
-   return pool.slice(0, AC_MAX).map((p) => pageRow(p, conn))
+   return conn.candidates(q, AC_MAX).map((p) => pageRow(p, conn))
@@ candidates @@
    if (query === null) return []
-   if (query === '' && form === 'link') return []
```

```Core/MarkdownPM/Embeds/embedWidget.tsx · Core/MarkdownPM/Menus/gripMenu.ts diff
- /** A title not already held by a tile in this document or a host above it, which would land a duplicate or a cycle. */
- export function embeddable(title: string, exclude: ReadonlySet<string>): boolean { … }
@@ embedPickTree @@
-     return embeddable(n.pick, exclude) ? [n] : []
+     return expressibleInLink(n.pick) && !exclude.has(normalizeTitle(n.pick)) ? [n] : []
```

`ConnectionsPM.md`'s picker sentences change in Task 11-2.

**VERIFY**

- [ ] `grep -rn "'embed'" Core/MarkdownPM/Autocomplete; grep -rn "allowEmbeds\|embeddable(\|connectionInsert\|formSyntax\|AcQuery" Core --include='*.ts' --include='*.tsx'` is empty.
- [ ] Run the gates.
- [ ] In `~/Test` with Pair Brackets off: type `[[Al` → the pane lists Alpha; Enter writes `[[Alpha]]` with the caret after; type `[x](Al` → the pane lists Alpha; Enter writes `[x](Alpha)`. With Pair Brackets on: type `[[` → the pane browses. Insert ▸ Embed ▸ Internal Page → `![[]]` opens the browse; a pick writes `![[Alpha]]` and the tile forms on leaving the line.
- [ ] Check for unnecessary code or mistakes.

#### Task 10-2 — The query as editor state

**TASK:** One `acQuery` `StateField` holds the picker's query, its `§` arm, and the query it was dismissed on, so the hook measures geometry only when the query changes, as `useBlockMenu` does; a `§` typed in prose and a `##` → `§` conversion both arm the heading list; the hook stands down inside a raw-HTML block.

**NOW:** `useConnectionAutocomplete.ts:46-83` holds the query in React state, the arm in a ref never mapped through changes (`sectionArmAfter`, `:251-273`), `measured` and `formRef` to suppress re-measures and lapse the arm; `##` → `§` doesn't arm, because `sectionArmAfter` needs `input.type` and `sectionSign` applies with `'input'`; the picker opens inside a raw-HTML block the draw renders as text.

**CHANGE**

- [ ] Write the tests (`acQuery.test.ts`): the field answers a `[[Pro` query after a typed `o` and keeps the same object across a selection-only transaction; `closeAcQuery` nulls it and the next identical query stays null until the query differs; a typed `§` arms at its position, text inserted before it maps the arm, and a caret leaving the line lapses it; a `##` → `§` conversion arms; on a page with HTML Formatting on, a `[[Pro` inside a `<div>` block answers null. Watch them fail.
- [ ] Add `Autocomplete/acQuery.ts`; the hook reads it; `armed`, `measured`, `formRef` and its effect, `sameQuery`'s React use, and `sectionArmAfter` go.

**AFTER**

```Core/MarkdownPM/Autocomplete/acQuery.ts diff
+ import { StateEffect, StateField, type Transaction } from '@codemirror/state'
+ import { docScan } from '../docCache'
+ import { inCodeAt } from '../Engine/docScan'
+ import { inBracket } from '../Input/edits'
+ import { inRawHtml } from '../decorations'
+ import { editorHost } from '../api'
+ import type { MarkdownScope } from '../Engine/detect'
+ import { autocompleteQuery, type AutocompleteQuery } from './autocomplete'
+
+ export interface AcField {
+   query: AutocompleteQuery | null
+   /** A `§` typed alone in prose under Automatic, which opens the heading list at its position until the caret leaves its line. */
+   armed: number | null
+   /** The query the pane was dismissed on; it stays closed until the query changes. */
+   dismissed: AutocompleteQuery | null
+ }
+
+ export const closeAcQuery = StateEffect.define<null>()
+
+ const sameQuery = (a: AutocompleteQuery, b: AutocompleteQuery | null): boolean =>
+   b !== null && a.form === b.form && a.from === b.from && a.to === b.to && a.query === b.query && a.title === b.title
+
+ /** A `§` this transaction wrote alone, outside a bracket and code: typed, or converted from `##`. */
+ function armedBy(tr: Transaction): number | null {
+   if (!tr.isUserEvent('input') || tr.state.facet(editorHost).settings().inPageHeadingResolution !== 'automatic') return null
+   let at: number | null = null
+   let seen = 0
+   tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
+     seen++
+     if (toB - fromB === 1 && tr.newDoc.sliceString(fromB, toB) === '§') at = fromB
+   })
+   if (seen !== 1 || at === null) return null
+   const line = tr.newDoc.lineAt(at)
+   return inBracket(line.text, at - line.from) || inCodeAt(docScan(tr.newDoc), at) ? null : at
+ }
+
+ /** The picker's query, held in editor state so the pane measures only when it changes. Re-derived on every document or selection change, as the listener it replaces was. */
+ export const acQuery = (scope: MarkdownScope) =>
+   StateField.define<AcField>({
+     create: () => ({ query: null, armed: null, dismissed: null }),
+     update(value, tr) {
+       if (tr.effects.some((e) => e.is(closeAcQuery))) return { query: null, armed: null, dismissed: value.query }
+       let armed = armedBy(tr) ?? (value.armed === null ? null : tr.changes.mapPos(value.armed))
+       if (armed !== null && tr.newDoc.lineAt(armed).number !== tr.newDoc.lineAt(tr.newSelection.main.head).number) armed = null
+       if (!tr.docChanged && !tr.selection) return armed === value.armed ? value : { ...value, armed }
+       const { empty, head } = tr.newSelection.main
+       const q =
+         empty && !tr.state.readOnly && !inRawHtml(tr.state, head, scope)
+           ? autocompleteQuery(docScan(tr.newDoc), head, armed ?? undefined)
+           : null
+       const dismissed = q && sameQuery(q, value.dismissed) ? value.dismissed : null
+       const query = dismissed ? null : q && value.query && sameQuery(q, value.query) ? value.query : q
+       return query === value.query && armed === value.armed && dismissed === value.dismissed ? value : { query, armed, dismissed }
+     },
+   })
```

The field is defined per mount (`acQuery(scope)` in the hook's `useState`) because the raw-HTML stand-down reads the scope and no facet carries it; that's the one reason, stated here.

```Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts diff
  export function useConnectionAutocomplete(viewRef, host, scope): ConnectionAutocomplete {
    const [ac, setAc] = useState<AcState | null>(null)
-   const armed = useRef<number | null>(null)
-   const measured = useRef<AutocompleteQuery | null>(null)
-   const [extension] = useState<Extension>(() => [
-     EditorView.domEventHandlers({ blur: () => { measured.current = null; setAc(null); return false } }),
-     EditorView.updateListener.of((u) => { armed.current = sectionArmAfter(u, armed.current); … }),
-   ])
-   const formRef = useRef<string | null>(null)
-   useEffect(() => { … formRef … }, [ac])
+   const [field] = useState(() => acQuery(scope))
+   const [extension] = useState<Extension>(() => [
+     field,
+     EditorView.updateListener.of((u) => {
+       const q = u.state.field(field).query
+       if (q === u.startState.field(field).query) return
+       // The caret is measured only when the query moves, so arrowing inside a finished link reads no layout.
+       const g = q && caretGeometry(u.view, u.state.selection.main.head)
+       setAc(q && g ? { ...q, ...g } : null)
+     }),
+     EditorView.domEventHandlers({
+       blur: (_, view) => {
+         if (view.state.field(field).query) view.dispatch({ effects: closeAcQuery.of(null) })
+         return false
+       },
+     }),
+   ])
    …
-   const { index, row, ctl } = usePaneCtl(candidates, resetKey, { open, pick: commit, close: () => setAc(null), aside: … })
+   const close = (): void => {
+     const view = viewRef.current
+     if (view?.state.field(field).query) view.dispatch({ effects: closeAcQuery.of(null) })
+   }
+   const { index, row, ctl } = usePaneCtl(candidates, resetKey, { open, pick: commit, close, aside: … })
```

`sectionArmAfter`, `sameQuery` (moved into the field), `armed`, `measured`, and `formRef` go from the hook. A commit that finishes the link dispatches `restedOnLink` and the field re-derives: the caret on the closer reads no query, so the pane closes without an effect; a commit that opens a slot keeps the query it earned.

**VERIFY**

- [ ] `grep -rn "sectionArmAfter\|measured\b\|formRef" Core/MarkdownPM/Autocomplete` is empty.
- [ ] Run the gates; `aliasPicker.test.tsx` and `connectionCommit.test.tsx` pass.
- [ ] In `~/Test` with Automatic on: type `##` then a space in prose → `§` and the heading list opens; type `§` alone → the list opens; Escape and arrow keys leave it closed until the query changes.
- [ ] **Live Check (Raw HTML):** on a page with HTML Formatting on, inside a `<div>` block, type `[[Foo|]]`, press Enter, leave the slot, and open the picker: none of them act.
- [ ] Check for unnecessary code or mistakes.

#### Task 10-3 — Commit through `retarget`, one `behind`, the setting on the markdown arms

**TASK:** The link form's commit writes through `retarget`, so the worn alias follows the one rule; the `target` and `fragment` arms keep their span edit and fill the label with the title when Remove Title On Link Change is on; one `behind: AcRow[] | null` replaces `viaChevron` and `cameFrom`, so the alias list slides in only when the picker opened that slot; ArrowRight and the chevron share one rule; `aliasRows` keys on the page id.

**NOW:** `commit` re-parses the worn alias with a fresh `pageLinkPattern().exec` (`useConnectionAutocomplete.ts:165-169`) and `formSyntax` hand-spells `[[v|a]]` (F-035); the markdown arms' `fill` fires only on an empty label (`autocomplete.ts:272-273`), so the setting never reaches a markdown link (E-16); `viaChevron` state and `cameFrom` (a ref written during render, `AutocompletePane.tsx:81-87`) decide the slide separately; ArrowRight requires `query !== ''` for `target` while the chevron draws on every page row (A-68); `aliasRows` resolves a title on its own and returns `[]` for `''` (A-69).

**CHANGE**

- [ ] Write the tests (`connectionCommit.test.tsx`, `autocomplete.test.ts`): a pick in `[[Old|Mine]]`'s title with the setting on writes `[[New]]`, off writes `[[New|Mine]]`, and re-picking Old keeps `Mine` either way; a pick in `[Notes](Old)`'s destination with the setting on writes `[New](New)`, off writes `[Notes](New)`; the alias list slides in after a pick when the page has aliases, and not when the caret walks into a typed `|`; ArrowRight on a page row with an empty `target` query opens its headings; `aliasRows(aliases, pageId, 'q')` lists the page's aliases. Watch them fail.
- [ ] Rewrite as below; `pageLinkPattern` leaves the hook's imports.

**AFTER**

```Core/MarkdownPM/Autocomplete/autocomplete.ts diff
  export function commitEdit(
    ac: AutocompleteQuery,
    value: string,
-   opts: { keepAlias?: string; openAlias?: boolean; openHeading?: boolean } = {},
+   opts: { container?: LinkTarget | null; keepTitle: boolean; openAlias?: boolean; openHeading?: boolean },
  ): CommitEdit {
    …  (the openHeading / openAlias arms unchanged)
-   const { insert, caret } = connectionInsert(value, ac.from, ac.form, opts.keepAlias)
+   const closer = ac.closed ? '' : closerOf(ac.form)
+   if (ac.form === 'link') {
+     const { text } = retarget('wiki', opts.container ?? null, { kind: 'page', syntax: 'wiki', title: value }, opts.keepTitle)
+     return { changes: [{ from: ac.from, to: ac.to, insert: text }], anchor: ac.from + text.length }
+   }
    // Bare text, no wrapping syntax to land inside of — the anchor sits right after the heading itself.
    if (ac.form === 'section') return { changes: [{ from: ac.from, to: ac.to, insert: value }], anchor: ac.from + value.length }
    if (ac.form === 'alias' || ac.form === 'heading')
-     return { changes: [{ from: ac.from, to: ac.to, insert }], anchor: caret + 2 }
+     return { changes: [{ from: ac.from, to: ac.to, insert: value + closer }], anchor: ac.from + value.length + 2 }
    // The anchor steps one past what was written: the `)` that finishes the link, or the `#` the heading slot opens behind.
-   if (ac.form === 'target' || ac.form === 'fragment') {
-     const retarget = { from: ac.from, to: ac.to, insert: opts.openHeading ? `${insert}#` : insert }
-     const fill = ac.label && ac.label.from === ac.label.to ? ac.label : null
-     const label = fill ? escapeAlias(value) : ''
-     …
-   }
-   return { changes: [{ from: ac.from, to: ac.to, insert }], anchor: caret }
+   const encoded = encodeLinkTarget(value)
+   const dest = { from: ac.from, to: ac.to, insert: (opts.openHeading ? `${encoded}#` : encoded) + (opts.openHeading ? '' : closer) }
+   // An empty label isn't a link, so "remove the title" means "fill it with the new one"; a label is kept where the setting keeps it or the target is unchanged.
+   const same = ac.form === 'target' && normalizeTitle(ac.query) === normalizeTitle(value)
+   const fill = ac.label && (ac.label.from === ac.label.to || (ac.form === 'target' && !opts.keepTitle && !same)) ? ac.label : null
+   const label = fill ? escapeAlias(value) : ''
+   // One past the written destination (`#` or `)`) once both changes apply.
+   return {
+     changes: fill ? [{ from: fill.from, to: fill.to, insert: label }, dest] : [dest],
+     anchor: ac.from + (label.length - (fill ? fill.to - fill.from : 0)) + encoded.length + 1,
+     opensHeading: opts.openHeading,
+   }
  }
```

The anchor is pinned by a test for a filled and an unfilled label.

```Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts diff
-   const [viaChevron, setViaChevron] = useState(false)
+   // The rows the pane slid away from (a page's rows behind its headings or its aliases), or null while nothing slid.
+   const [behind, setBehind] = useState<AcRow[] | null>(null)
@@ commit @@
-     const worn = ac.form === 'link' ? pageLinkPattern().exec(view.state.doc.sliceString(ac.from, ac.to))?.groups?.alias : undefined
+     const container = ac.form === 'link' ? readLinkText(view.state.sliceDoc(ac.from, ac.to) + (ac.closed ? '' : ']]')) : null
      const pageId = row.kind === 'page' ? row.pageId : target?.pageId
      const openAlias = (ac.form === 'link' || ac.form === 'heading') && !opts.openHeading && settings.aliasPickerOnCommit && host.aliases.list(pageId ?? '').length > 0
-     const { changes, anchor, opensAlias, opensHeading } = commitEdit(ac, row.value, { keepAlias: settings.removeTitleOnLinkChange ? undefined : worn, openAlias, openHeading: opts.openHeading })
-     if (opensHeading) setViaChevron(true)
+     const { changes, anchor, opensAlias, opensHeading } = commitEdit(ac, row.value, { container, keepTitle: !settings.removeTitleOnLinkChange, openAlias, openHeading: opts.openHeading })
+     if (opensAlias || opensHeading) setBehind(candidates)
@@ aside @@
-       if (dir === 1 && (ac.form === 'link' || (ac.form === 'target' && ac.query !== ''))) {
+       if (dir === 1 && (ac.form === 'link' || ac.form === 'target')) {
          if (row?.kind !== 'page') return false
          commit(row, { openHeading: true })
          return true
        }
-       if (dir === -1 && heading && viaChevron) {
+       if (dir === -1 && heading && behind) {
@@ lookup · alias @@
-     if (form === 'alias') return aliasRows(conn, host.aliases, title, q)
+     if (form === 'alias') {
+       const named = titleTarget(conn, title ?? '')
+       return aliasRows(host.aliases, target?.pageId ?? (named.kind === 'page' ? named.page.id : undefined), q)
+     }
@@ pane @@
-     viaChevron,
+     behind,
```

`setBehind(null)` where `setViaChevron(false)` was (the `heading` effect, and when `ac` nulls). `aliasRows(aliases, pageId: string | undefined, query)` drops its `conn` and `title` parameters and its own resolve. The pane reads `behind` in place of `viaChevron` and `cameFrom`: `sliding = behind !== null`, `root = sliding ? slot(behind, false) : …`.

```Core/MarkdownPM/Autocomplete/AutocompletePane.tsx diff
-   const cameFrom = useRef<AcRow[]>([])
-   const linksPages = v.ac.form === 'link' || v.ac.form === 'target'
-   if (open && linksPages) cameFrom.current = v.candidates
-   useEffect(() => { if (ac === null) cameFrom.current = [] }, [ac])
+   const linksPages = v.ac.form === 'link' || v.ac.form === 'target'
    const headingForm = listsHeadings(v.ac.form)
-   const headingSlide = headingForm && v.viaChevron
-   const sliding = (v.ac.form === 'alias' && cameFrom.current.length > 0) || headingSlide
+   const sliding = v.behind !== null
+   const headingSlide = headingForm && sliding
    …
-         root={sliding ? slot(cameFrom.current, false) : headingForm ? headingSlot(v.candidates) : shown}
+         root={sliding ? slot(v.behind, false) : headingForm ? headingSlot(v.candidates) : shown}
```

**VERIFY**

- [ ] `grep -rn "viaChevron\|cameFrom\|keepAlias\|pageLinkPattern" Core/MarkdownPM/Autocomplete` is empty.
- [ ] Run the gates.
- [ ] In `~/Test`: pick a page in `[[Old|Mine]]` with Remove Title On Link Change on → `[[New]]`; walk the caret into a typed `|` → no slide; accept a page with remembered aliases → the alias list slides in.
- [ ] Check for unnecessary code or mistakes.

#### Task 10-4 — Heading rows from the index

**TASK:** The picker's heading list reads `headingsOf(path).outline` for another page and the live document outline for its own page; `headingTarget.ts`, `warmBody`, `fetchBody`, the `fetched` state and effect, and `loading` go; the pane builds its tree from the outline rather than reshaping rows; its props become required.

**NOW:** `headingTargetOf` (`headingTarget.ts`) reads a page's warm body or fetches it, a second heading source beside the index (A-41); the hook holds `fetched` state and an effect with a stale frame; the pane reshapes `headingRows` into fake `OutlineHeading`s (`AutocompletePane.tsx:184`); seven pane props are optional with defaults and `NONE`, while production always spreads the full `ac.pane`.

**CHANGE**

- [ ] Write the tests (`aliasPicker.test.tsx:97,193`, `autocomplete.test.ts`): a `[[Alpha#` query lists the headings `headingsOf('Alpha.md').outline` holds, nested by level; `[[#` on a page lists the live document's headings; the pane requires every prop. Watch them fail.
- [ ] Rewrite as below; delete `headingTarget.ts`; `EditorHost.warmBody` and `fetchBody` go from `api.ts`, `editorHost.tsx`, and the harness.

**AFTER**

```Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts diff
+ import type { PageHeading } from '../../Platform/stores'
-   const [fetched, setFetched] = useState<OutlineHeading[] | null>(null)
    …
-   const target = useMemo(() => { … headingTargetOf … pageHeadingTarget … }, [heading, title])
-   const outline = target?.kind === 'warm' ? target.outline : fetched
-   const loading = heading && outline === null && query === ''
-   useEffect(() => { setFetched(null); … target.fetch() … }, [target])
+   // The headings a heading form lists: the named page's from the index, or, for a bare `#`, the page this editor sits on — its own live outline where the editor is its body, the index where the editor is a cell or a value held by it.
+   const page = useMemo(() => {
+     if (!heading) return null
+     const conn = host.connections()
+     if (title) {
+       const named = titleTarget(conn, title)
+       return named.kind === 'page' ? named.page : null
+     }
+     const own = viewRef.current && ownPage(viewRef.current)
+     return own?.kind === 'held' ? own.page : null
+   }, [heading, title])
+   const outline: readonly PageHeading[] = useMemo(() => {
+     if (!heading) return []
+     if (page) return host.connections()?.headingsOf(page.path)?.outline ?? []
+     const own = viewRef.current && ownPage(viewRef.current)
+     return own?.kind === 'body' ? docOutline(own.view.state.doc) : []
+   }, [heading, page, title])
    …
    const allHeadingRows = useMemo(() => (heading && query !== null ? headingRows(outline, query) : []), [heading, outline, query])
+   const tree = useMemo(() => outlineTree(outline), [outline])
    …
-   const open = ac !== null && (candidates.length > 0 || loading)
+   const open = ac !== null && candidates.length > 0
    return { extension, ctl, pane: { open, ac, candidates, index: index ?? 0, onPick: commit, behind, headingRows: allHeadingRows, tree, collapsed, onToggleHeading, onAside, onBack, geometry } }
```

`openHeadingRows` stays as the one rule for which rows a collapse hides (it reads rows and levels, not a tree). `outlineTree` reads only `level`, so it takes any heading shape; `OutlineMenu.tsx` keeps passing `OutlineHeading`s and its `OutlineNode` type through the default.

```Core/MarkdownPM/Engine/outlineTree.ts diff
- export interface OutlineNode extends OutlineHeading {
-   children: OutlineNode[]
- }
+ export type OutlineNode<T = OutlineHeading> = T & { children: OutlineNode<T>[] }
- export function outlineTree(headings: readonly OutlineHeading[]): OutlineNode[] {
-   const roots: OutlineNode[] = []
-   const ancestors: OutlineNode[] = []
+ export function outlineTree<T extends { level: number }>(headings: readonly T[]): OutlineNode<T>[] {
+   const roots: OutlineNode<T>[] = []
+   const ancestors: OutlineNode<T>[] = []
    for (const heading of headings) {
-     const node: OutlineNode = { ...heading, children: [] }
+     const node: OutlineNode<T> = { ...heading, children: [] }
```

```Core/MarkdownPM/Autocomplete/autocomplete.ts diff
@@ headingRows @@
- import type { OutlineHeading } from '../Engine/headingScan'
+ import type { PageHeading } from '../../Platform/stores'
- export function headingRows(outline: readonly OutlineHeading[], query: string): HeadingRow[] {
+ export function headingRows(outline: readonly PageHeading[], query: string): HeadingRow[] {
```

```Core/MarkdownPM/Autocomplete/AutocompletePane.tsx diff
+ import type { PageHeading } from '../../Platform/stores'

  export interface AutocompletePaneProps {
    open: boolean
    ac: AcState | null
    candidates: AcRow[]
    index: number
    onPick: (row: AcRow) => void
-   viaChevron?: boolean
-   loading?: boolean
-   headingRows?: HeadingRow[]
-   collapsed?: ReadonlySet<string>
-   onToggleHeading?: (value: string) => void
-   onAside?: (row: AcRow) => void
-   onBack?: () => void
+   behind: AcRow[] | null
+   headingRows: HeadingRow[]
+   tree: OutlineNode<PageHeading>[]
+   collapsed: ReadonlySet<string>
+   onToggleHeading: (value: string) => void
+   onAside: (row: AcRow) => void
+   onBack: () => void
    geometry?: RememberedSize
  }
- const NONE: ReadonlySet<string> = new Set()
  …
-   const nested = (): React.JSX.Element[] => {
-     const at = new Map(v.candidates.map((r, i) => [r.value, i]))
-     const walk = (nodes) => …
-     return walk(outlineTree(v.headingRows.map((r) => ({ from: 0, key: r.value, text: r.value, level: r.level }))))
-   }
+   const nested = (): React.JSX.Element[] => {
+     const at = new Map(v.candidates.map((r, i) => [r.value, i]))
+     const walk = (nodes: OutlineNode<PageHeading>[]): React.JSX.Element[] =>
+       nodes.flatMap((n) => {
+         const i = at.get(n.text)
+         return i === undefined ? [] : headingRow(v.candidates[i], i, n.children.length ? walk(n.children) : undefined)
+       })
+     return walk(v.tree)
+   }
    …
-       {loading ? null : v.ac.query !== '' ? rows.map((r, i) => headingRow(r, i)) : nested()}
+       {v.ac.query !== '' ? rows.map((r, i) => headingRow(r, i)) : nested()}
```

```Core/MarkdownPM/api.ts · Core/Pages/editorHost.tsx · Core/Testing/editorHarness.ts diff
-   // A page's body as the session holds it: the open tab's live text when warm, else read from disk.
-   warmBody(page: ConnPage): string | null
-   fetchBody(page: ConnPage): Promise<string | null>
```

`Core/MarkdownPM/Autocomplete/headingTarget.ts` is deleted. `fetchPageDetail` and `knownBody` keep their other readers.

**VERIFY**

- [ ] `grep -rn "headingTarget\|warmBody\|fetchBody\|loading" Core/MarkdownPM/Autocomplete Core/MarkdownPM/api.ts Core/Pages/editorHost.tsx Core/Testing/editorHarness.ts` is empty.
- [ ] Run the gates.
- [ ] In `~/Test`: `[[Alpha#` lists Alpha's headings nested; `[[#` on a page lists its own, including one typed moments ago; the same in a table cell lists the holding page's.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] One reviewer reads the picker for a second reader of unclosed input, a second heading source, or state held in React that the field now holds, and drives the opener rule with Pair Brackets on and off for `[[`, `![[`, `[label](`, `##`, and `§`.
- [ ] Gates green; delta reported.

### Phase 11 — Names and Documentation

**GOAL:** The three names no shape change rewrote take the vocabulary the rest of the work settled on, and the Feature documents, the guideline, and the audit read true for the code as it now stands. No behavior changes in this phase.

#### Task 11-1 — Names

**TASK:** `LinkFormat` becomes `LinkWrapKind`, `escapeAlias`/`unescapeAlias` become `escapeLabel`/`unescapeLabel`, and the Embed ▸ row's "Webpage" reads "External Link".

**NOW:** `LinkFormat` (`Core/Actions/blockMenu.ts:4`) names the three wraps the Format menu writes (`link`, `linkText`, `connection`), which collides with the Link property's Format and the Default Link Format setting; `escapeAlias`/`unescapeAlias` (`Core/Connections/links.ts:19,23`) escape a markdown label, which the code elsewhere calls a label; `EMBED_ROWS` (`blockMenu.ts:75`) says "Webpage" where Paste As says "Embedded Link" and the setting group says "Webpages & Links" (checkpoint, question 8). Every other rename in the synthesis's *§3.18* rode a shape change in an earlier phase (`'external'`/`'site'` → `'url'`, `fragment` → `heading`, `ConnMenuTarget` → `LinkMenuTarget`, `PASTE_PLAIN_ACTION` → `PASTE_LITERAL_ACTION`).

**CHANGE**

- [ ] Rename across readers (`grep -rln` each, then edit): `LinkFormat` → `LinkWrapKind` in `blockMenu.ts` and `Input/format.ts`; `escapeAlias`/`unescapeAlias` → `escapeLabel`/`unescapeLabel` in `links.ts`, `linkValue.ts`, `Autocomplete/autocomplete.ts`, `Engine/detect.ts`, and their tests.
- [ ] `EMBED_ROWS`: `{ label: 'External Link', action: 'block:webpage', icon: 'globe' }`; the `block:webpage` action id and `composeWebpageEmbedLine` keep their names (the docs call the tile a webpage embed).

**AFTER**

```Core/Actions/blockMenu.ts diff
- export type LinkFormat = 'link' | 'linkText' | 'connection'
+ export type LinkWrapKind = 'link' | 'linkText' | 'connection'
  …
-   | `format:${LinkFormat}`
+   | `format:${LinkWrapKind}`
  …
-   { label: 'Webpage', action: 'block:webpage', icon: 'globe' },
+   { label: 'External Link', action: 'block:webpage', icon: 'globe' },
```

```Core/Connections/links.ts diff
- export function escapeAlias(alias: string): string {
+ export function escapeLabel(label: string): string {
  …
- export function unescapeAlias(alias: string): string {
+ export function unescapeLabel(label: string): string {
```

**VERIFY**

- [ ] `grep -rn "LinkFormat\b\|escapeAlias\|unescapeAlias\|'Webpage'" Core Desktop --include='*.ts' --include='*.tsx'` is empty (`defaultLinkFormat` and `useWebpageTitle` are different names and stay).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 11-2 — Feature documentation, the guideline, and the audit

**TASK:** Every sentence the synthesis's *Would Go False* lists and the plan's *§Reconciliation* names is rewritten as the current truth, in the house style (`Studio-Documentation.md`): surgical edits, no amendments or supersedes, no session history.

**NOW:** The sentences below describe the baseline or were already false at it; *§Reconciliation* lists each with the task that changed the behavior.

**CHANGE**

- [ ] `ConnectionsPM.md`:
  - `:8`: the tokenizer and main's rename rewriter read one walk (true now).
  - `:12`: a `!`-prefixed form is a tile only when it stands alone on its own line in a page body; anywhere else it's `!` followed by a connection or a link.
  - `:16`: resolution runs through the page index in the renderer; main resolves nothing (its Paste As rows read a title-shaped target that isn't a valid address).
  - `:24`: one walk over two syntaxes, with Link values riding the body rewrite.
  - `:32`: a markdown link that names neither a page nor a website takes the phantom treatment.
  - `:34`: Link values route by Open Connections In Preview like every connection; Display Unresolved Links As Plain Syntax applies everywhere except the `/` menu's query.
  - `:38`: drop the "never depend on where it was found" clause, or state the one place that differs (a Link value's Format is the property's).
  - `:42-49`: the menu table reads Rename · Edit Title (connection) / Edit Link (weblink); Format ▸ is for weblinks in editors, resting cells included; Remove Link and Delete on every link in an editor; a property value cell's Close is Clear, Remove on a card and in the Panel; unresolved links offer no menu; a read-only surface offers the opens and the copies.
  - `:53-59`: the picker opens on `[[` and `[label](` whether or not Pair Brackets is on, Enter writes the closer, an empty `[[` browses, the `![[` entry goes, heading rows read the index, the alias list slides in only when a pick opened the slot, the markdown target arm honors Remove Title On Link Change.
  - `:65`: `##` → `§` opens the heading list like `§` does.
  - `:72-73`: remove the two limitations (Text-value `§` runs read the index's outline; one renderer look rule).
- [ ] `MarkdownPM.md`:
  - `:8`: `Links/` holds clicks, menus, edits, paste, and titles for both link kinds.
  - `:21`: inline marks and connections are suppressed inside code (true now).
  - `:33`: an address pasted inside a link retargets it; pasted anywhere in the editor, including a rectangle paste and a drop, formats per Default Link Format.
  - `:56-57`: a resting cell answers every construct's right-click without focusing; writes commit at rest; typing rows enter with the selection seated.
  - `:68-70`: `embedClaims.ts` goes from the sentence; a tile forms from a lone embed line claimed once in `buildTiles`; five ways to create one (the `/` menu, the context menu's Embed ▸ Internal Page, Paste As ▸ Embedded Page, the grip's Source ▸, and typing `![[` which opens the ordinary picker).
  - `:97`: a resting table cell sends what sits under the click too, with the source selection its reply acts over.
  - `:103`: "Embed ▸ — Internal Page or External Link."
  - `:107`: a copied connection, headed or not, or a markdown link offers Connection and Markdown Link, and Embedded Page where a tile can form.
- [ ] `PropertiesPM.md:81-83`: a per-value alias comes from Rename or from a pasted label and is stored as `[alias](url)` or `[[Page|alias]]`; a pasted or edited value is a page if a page has that title, with ambiguity refused, else an address if valid (so `[x](example.com)` commits as an address), else refused; `[[#Heading]]` commits on a page; a page value draws with the shared connection tones, `Page § Heading`, the glance, and opens where connections open.
- [ ] `ConfigurationPM.md:100` and the hint at `Settings/frames.ts:532`: "Pointing a link at another target drops the title it was showing." (every syntax and every retarget: paste, the picker, Edit Title / Edit Link). `ConfigurationPM.md:171`: drop "Page prose only."
- [ ] `WebviewPM.md:20`: the adjudicator decides where a clicked or followed external link opens; the menu's explicit Preview and Open In Browser rows and the browser window's title button call their arm directly.
- [ ] `Guidelines/Editor-Internals.md`:
  - `:12`: fenced lines hold no inline tokens (true now for every reader).
  - `:25`: the embed claim has one owner, `buildTiles`, read by the tile field, boundary guards, and grip-menu exclusions.
- [ ] `Pommora Codebase Audit.md`: W21's sentence that F-093, F-094, and F-095 land together (`:997`) says F-094 landed with the Links Cleanup and F-093 and F-095 rewrite the same mounts when they land; F-094's status (`:1013`) reads Resolved; F-035 and F-043 read Resolved; F-042, F-054, F-062 read Resolved where the plan made them true (check each against its finding text).

**VERIFY**

- [ ] Each edited paragraph is read whole and doesn't contradict itself or its neighbors.
- [ ] `grep -rn "Add Title\|Website Link\|Webpage\b" .claude/Features .claude/Guidelines` finds only the webpage-embed tile's own name.
- [ ] Check for unnecessary code or mistakes.

---

### Completion Criteria

- **Conformance:** Every task honors *§Constraints*: the Frozen list is untouched, the Hard Rules hold (`engineGraph.test.ts` and `hostGraph.test.ts` pass), no mechanism landed beside one the codebase already provided, and nothing changed outside the files the tasks name and their tests and docs.
- **Correctness:** Each ruling in the Continuation's §5 is observed in the running app on `~/Test`: one look for unresolved links in the body, a cell, and a value; a Link value drawing `Page § Heading` and opening through Open Connections In Preview; a right-click on plain text in a resting cell popping the editor menu without focusing; `[[Al` opening the picker with Pair Brackets off; a link pasted onto a link retargeting it; Format ▸ Page Title at rest writing the title when it arrives; `mailto:` opening in the system; `![[Page]]` mid-line drawing and following as a connection.
- **Completeness:** Every task is ticked; nothing is deferred, narrowed, or left as scaffolding; *§Concepts* REMOVED is empty of survivors (`grep` each name).
- **Confirmation:** Every red-first test was watched fail before its change; every VERIFY ran and its output was read; Nathan's hand-checks (Phase 4, Phase 8, Phase 9) carry his word.
- **Continuity:** *§Reconciliation* is walked; the Feature docs, the guideline, and the audit read true; *§Deviations* holds every material departure.
- **Confidence:** Gates green from a clean state over `baseline..HEAD`; the production delta is reported as measured (comments and tests excluded), in the two figures *§Delta* names (the cleanup, and the resting cell: Phase 9, Task 6-4, the resting arms of Task 6-5, and the `data-src`/`data-at`/`data-base` attributes of Task 4-3), with growth reported rather than tidied away.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

**WHAT COUNTS AS A FINDING:** In every review below, a finding names a mechanism: a real incorrect behavior or an actionable concern at a `file:line` the reviewer read, reached by an ordinary action. Cosmetic observations, style preferences, and "could break" without the path aren't findings; a finding whose fix adds a guard, a layer, or a test for a state the code can't produce is scope creep; a reviewer that finds nothing wrong has done its job. Every finding is verified against the tree before it changes anything, then fixed at its cause or rejected with the code that shows why; a standing disagreement goes to Nathan. Code is never added only to answer a critique.

**THE PRINCIPLES EVERY REVIEWER MEASURES AGAINST:** Nathan's working rules and design principles as *§Constraints* states them (net simplification is the bar; never a half-fix; readable over clever; source over patch; follow the new input; removal earns its place; honest behavior descriptions; nothing odd-one-out, nothing hand-rolled beside an existing mechanism, nothing that behaves differently from its sibling without reason), and the six-point rubric: less to carry, less to understand, clearer boundaries, better rather than moved, reads as designed, one way.

- [ ] **Phase review** (fable-high, after each phase lands): the phase's tasks against their AFTER blocks and VERIFY steps, its review checkpoint's question answered with evidence, gates green, delta reported. A phase doesn't close with a finding open.
- [ ] **Simplification lens** (fable-high, `~/The Studio/.claude/skills/code-simplification/SKILL.md`) over `{baseline}..HEAD`: the six opportunity lenses (structure, redundancy, remnants, clarity, cohesion, TypeScript preferences) across the whole range, with every export the range introduces searched for importers, every twin searched by literal shape, every guard asked what produces the state it guards, and placement judged against where a fresh reader would look. It runs before the adversarial lens, since criticizing a shape before it's simplified criticizes something that hasn't earned its form.
- [ ] **Adversarial lens** (fable-high, `~/The Studio/.claude/skills/adversarial-review/SKILL.md`) over `{baseline}..HEAD`: the seven perspectives (correctness, cohesiveness, architecture, completion, interaction, implications, oversight), aimed at complexity and coherence as much as at breakage: does the shape follow from the mandate or from the order things were written in; does each abstraction earn its place; what does this teach the next reader; does every round-trip close; what did the untouched neighbor stop matching. Nathan's calls go to him.
- [ ] **Neutral before/after review** (fable-high, zero context; runs last, after every other finding is closed):
  - **Gets:** the file list only, production files and tests marked. Before is `git show {baseline}:<path>`; After is the working tree. It may read untouched code for comparison.
  - **Forbidden:** `git diff`, `git log`, commit messages, `.claude/`, this plan, and any statement of intent.
  - **Rubric:** read both versions honestly and at an overview level, as code to inherit and maintain, judging per axis which is better and why: **Simplicity** (does each piece earn its existence, or serve another piece's shape); **Cohesion** (reads like the codebase around it, one home per concern, nothing hand-rolled the codebase already provides, nothing behaving differently from its siblings without reason); **Direct Purpose** (each file, function, and type does what its name says, with no detours, shims, defensive layers, or speculative generality); **Legibility** (a newcomer finds where a behavior lives and understands it in one read; names say what things are); **Ownership** (who owns each rule, and where the next change of this kind goes); **Honest Weight** (complexity removed, or relocated, renamed, or exchanged for new complexity of similar weight); **Settledness** (nothing transitional, half-finished, leftover, or inconsistent with itself). The one question: is After genuinely better, with no reason left to think anything in Before was the better choice, or does it pass the ball forward?
  - **Returns:** a Positive, Neutral, or Negative verdict; a per-file account; a ranked list of anything worse in After, with `file:line`; and before/after line counts.
  - **Closing the list:** every ranked-worse item is verified; if it holds it's fixed at its cause, if it's rejected the report answers it with the code that shows why, and a standing disagreement goes to Nathan. A second pass runs on the fixed state; at most two passes. Completion requires Positive.
- [ ] **Own pass:** gates from a clean state over the full range · the diff read whole · *§Deviations* complete · *§Completion Criteria* walked item by item
- [ ] **Reconciliation walked:** each entry opened, the rewrite confirmed, the surrounding paragraph read
- [ ] **Report delivered:** the measured production delta (comments and tests excluded) in two figures, the cleanup and the resting cell, against *§Delta*; real gate output; every deviation; every item ruled on by Nathan

#### Reconciliation

- `ConnectionsPM.md:8` — "the editor's tokenizer and main's rename rewriter can never disagree" — Task 1-1 (true now), 11-2
- `ConnectionsPM.md:12` — "A `!`-prefixed form standing alone on a line is not a connection" — Task 1-1, 11-2
- `ConnectionsPM.md:16` — "the content index in main" resolves — Task 2-1, 11-2
- `ConnectionsPM.md:24` — "one pure pass over three patterns … plus the Link property values in frontmatter" — Task 1-1, 11-2
- `ConnectionsPM.md:32` — "one that names neither keeps the broken-link treatment" — Task 4-1, 11-2
- `ConnectionsPM.md:34` — "applies to page prose only — cells and other fields stay muted"; Link values and Open Connections In Preview — Task 4-2, 8-1, 11-2
- `ConnectionsPM.md:38` — "never depend on where it was found" — Task 8-1, 11-2
- `ConnectionsPM.md:42-49` — Add Title / Edit Title · Edit Link; "Format (editor only)"; Close rows; read-only surfaces — Task 6-1, 6-6, 9-1, 11-2
- `ConnectionsPM.md:53-59` — the picker's openers, `![[ ]]` entry, heading rows, alias slide — Task 10-1, 10-3, 10-4, 11-2
- `ConnectionsPM.md:65` — `§` opens the heading list (add `##` → `§`) — Task 10-2, 11-2
- `ConnectionsPM.md:72-73` — the two limitations — Task 4-3, 4-4, 11-2
- `MarkdownPM.md:8` — "`Links/` … the connection layer" — Task 11-2
- `MarkdownPM.md:21` — "suppressed inside code" — Task 1-1, 1-3 (true now), 11-2
- `MarkdownPM.md:33` — "another link's `( )`, the address lands as the literal text"; "Pasted anywhere in the editor" — Task 7-1, 7-3, 11-2
- `MarkdownPM.md:56-57` — a resting cell "renders the same content as plain markup" — Task 9-1, 9-2, 11-2
- `MarkdownPM.md:68-70` — `embedClaims.ts`; "four ways to create one"; "the `![[` autocomplete, which offers only pages the syntax can express" — Task 1-1, 10-1, 11-2
- `MarkdownPM.md:97` — "The right-clicked editor sends what sits under the click" — Task 9-1, 11-2
- `MarkdownPM.md:103` — "Embed ▸ — Internal Page or Webpage" — Task 11-1, 11-2
- `MarkdownPM.md:107` — Paste As offers for a copied connection — Task 2-1, 7-1, 11-2
- `PropertiesPM.md:81-83` — alias "set through Rename and stored as `[alias](url)`"; "a title no page answers to is refused at commit"; "the connection color, a click that opens the page" — Task 2-1, 8-1, 8-3, 11-2
- `ConfigurationPM.md:100` and `Settings/frames.ts:532` — "Pointing a connection at another page drops the alias it was wearing" — Task 2-4, 7-1, 10-3, 8-3, 11-2
- `ConfigurationPM.md:171` — "Page prose only" — Task 4-2, 11-2
- `WebviewPM.md:20` — "decides where every external link opens" — Task 5-1, 11-2
- `Editor-Internals.md:12` — "Fenced lines hold no inline tokens" — Task 1-1, 1-3 (true now), 11-2
- `Editor-Internals.md:25` — the embed claim's readers ("token suppression … and the autocomplete pool") — Task 1-1, 10-1, 11-2
- `Pommora Codebase Audit.md:997,1013` — W21 lands together; F-094 deferred — Task 3-1, 11-2; F-035 (Task 10-3), F-043 (Task 5-3), F-042 (Task 2-1, 8-3), F-054 (Task 1-1), F-062 (Task 4-4)
- Tests, each rewritten in the task that changes the behavior it pins: `connections.test.ts`, `aliasPicker.test.tsx`, `tokens.test.ts:58-61,120-133`, `embedClaims.test.ts` (deleted), `embedSuppression.test.tsx`, `intents.test.ts`, `detect.test.ts`, `scan.test.ts`, `indexSeed.test.ts`, `headingHash.test.ts`, `rewrite.test.ts`, `cascade.test.ts`, `linkValue.test.ts`, `headingRename.test.tsx` (Task 1-1); `headingHash.test.ts:33-37`, `edits.test.ts:873-` (Task 1-3, 1-4); `pageConnections.test.tsx:57` (Task 3-3); `externalLink.test.tsx:80`, `mdLinkTarget.test.tsx:158`, `blockMenuFlow.test.tsx:301,308` (Task 4-1); `connectionMenu.test.ts`, `connectionMenuActions.test.ts`, `linkEdit.test.tsx`, `linkFormat.test.tsx` (deleted), `linkEdges.test.tsx:432`, `externalLink.test.tsx:129,145`, `cellLinks.test.tsx` (Task 6-1 to 6-5); `pasteDecision.test.ts` (deleted), `pasteLink.test.tsx` (Task 7-1, 7-2); `LinkCell.test.tsx`, `valueClick.test.ts`, `linkValue.test.ts` (Task 8-1 to 8-3); `cellStatic.test.tsx:117-127`, `cellLinks.test.tsx:207-269`, `Desktop/Actions/editorMenu.test.ts`, `Menus/editorMenu.test.tsx:59-177` (Task 6-4, 9-1 to 9-3); `autocomplete.test.ts`, `connectionCommit.test.tsx`, `aliasPicker.test.tsx:97,193` (Task 10-1 to 10-4).

#### Open Items

- **Column Format ▸ on Link cells:** Left out; it belongs to an app-wide decision on whether every cell right-click offers its column's Format (Number, Select, and Date cells do today).
- **Word count (M11-08):** `subfieldStats.ts` zeroes every lone `![[…]]` line, including lone embeds that draw as links; it belongs to the audit's deferred counter rework.
- **Deferred audit findings:** F-093, F-095, and F-097 stay deferred; F-093 and F-095 rewrite the mounts Task 3-1 rewrites, so those mounts are touched again when they land.
- **⌘C over a DOM selection in a resting cell:** The keyboard copies the drawn text (an alias, not its syntax); the resting menu's Copy copies the source. Making the chord match means a key handler on the resting cell and isn't this plan's.
- **A page body closing with a title pending:** a cell and a TextPane forward a pending Page Title swap on close (Task 5-3); the page body has no close-time commit path, so a tab closed before the title answers keeps the short form, as it does today.
- **A Text value's pane and a rename in another window:** With connections read from the host (Task 3-1), an open TextPane reads the index as of its last render, so a rename made in another window while the pane is open can trail by one render (the audit's F-094 note).

#### Deviations
