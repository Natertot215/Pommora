## Links Cleanup Synthesis

This merges the two verified briefs (`verified/A.md`, IDs A-01…A-161, scouts 1-4; `verified/B.md`, IDs B-01…B-196, scouts 5-8) into one document organized by rule. Every verified and corrected entry lands in a rule section with its evidence, arithmetic, and source IDs; the appendix maps every ID. Where A and B disagree, both are stated and ruled with the code that settles it. Deltas are scout estimates re-costed by the verifiers unless marked *measured*; file sizes are measured (`wc -l`, production only) at HEAD.

**Status Tags:** **V** Verified by reading · **V·P** Verified by running a pure function (`vite-node`, scratchpad only) · **C** Corrected (the true statement is given) · **P** Needs Probe (the probe is named in *§8 Needs Probe*) · **I** Inferred (mechanism read, outcome not driven) · **D** Dropped · **R** Verifier ruling or ledger entry (not a scout claim). **Synthesis Rulings** are marked **⚖** and settle an A↔B disagreement or overlap.

**Option Labels:** Options keep their scout names so the planner can trace them: S1-A…S1-C, S2-A…S2-D, S3-1…S3-3, S4-A…S4-C, S5-A…S5-D4, S6-A…S6-C, S7-A…S7-E, S8 §6.1-§6.4, plus the verifier's B-127 reader.

---

### 1. Table of Contents

1. *§Table of Contents*
2. *§Baseline Facts* — HEAD, Link Gestures state, anchor corrections, surface map
3. *§The Rules*
   - 3.1 Reading Link Syntax: Grammars and Classifiers
   - 3.2 Writing Link Syntax
   - 3.3 Caret Readers and Slots
   - 3.4 Code Gating
   - 3.5 Resolution and Status
   - 3.6 Drawing and Looks
   - 3.7 Pointer Gestures and Targets
   - 3.8 Menus and Their Actions
   - 3.9 The Resting Table Cell
   - 3.10 Link Property Values
   - 3.11 Paste, Paste As, and Copy
   - 3.12 The Picker
   - 3.13 Opening and Titles
   - 3.14 Embeds
   - 3.15 Section Runs and Citations
   - 3.16 Rename and Index
   - 3.17 Delivery Seams
   - 3.18 Names and Vocabulary
   - 3.19 Types and Conversions
   - 3.20 Placement
   - 3.21 High-Frequency Costs
4. *§Converging Architecture*
5. *§Delta Ledger*
6. *§Deletion Ledger*
7. *§Decisions for Nathan*
8. *§Needs Probe*
9. *§Appendix: Coverage Map*

---

### 2. Baseline Facts

#### 2.1 HEAD and the Baseline Commit

- **Baseline Commit:** Link Gestures landed at `75c3bcb9c` on `active`. HEAD is `42a18f4a5` ("docs(audit): reconciled against 75c3bcb9c"). `git diff --stat 75c3bcb9c HEAD` touches four docs files only (`MarkdownPM.md`, the Link Gestures plan, `Pommora Codebase Audit.md`, `Dashboard/Audit/audit.md`), so every production `path:line` is identical at both; the working tree is clean. (B Method)
- **Audit Anchors Moved:** The reconcile deleted the resolved F-033, F-037, and F-038 entries, so audit citations from the scouts are re-anchored: F-043 `Pommora Codebase Audit.md:357`, F-054 `:501`, F-062 `:585`, F-094 `:1013` (footnote `:1501`), F-096 `:1037`, F-114 `:1267`/`:1273`, F-042 `:341`, F-035 `:317`, the doc-reconcile plan `:693`/`:697`. (B-133, B-134, B-136, B-140)
- **Link Gestures Resolved:** F-033, F-034, F-036, F-037, F-038, F-039, F-068 (brief).

#### 2.2 What Link Gestures Left as Baseline

- `Links/connectionClicks.ts` is gone; `linkPointer` (`linkClicks.ts:132`) is the one body pointer handler for both link kinds.
- `drawnLinkAt` (`decorations.ts:370-374`) is the link token the last draw produced at a position; `linkTokenAt` (`tokens.ts:331-344`) takes a `Token[]`.
- `tokenMenuTarget` (`connectionsApi.ts:97`) is the one menu rule for the body and the live cell; its `editable` reads `edit !== undefined` (`:107`).
- `Guards/aliasGuard.ts` is gone; `inAliasAt` lives at `Input/edits.ts:334-338`.
- `pasteLink.ts`'s two guards are `literalAt` (`pasteLink.ts:42-47`).
- `linkAddress` (`tokens.ts:47`) replaced `linkHalves`; `mdLinkClass` (`decorations.ts:82-99`) is one markdown-link look for both renderers; `stripBlockMarkers` and `data-conn-title` are gone.
- `linkInCode(scan, at)` (`edits.ts:324-331`) makes Enter (`commitAliasOnEnter`, `linkEdit.ts:61`), `slotNear` (`linkEdit.ts:106`), and `inAliasAt` (`edits.ts:335`) treat any connection code touches as text. (A-36, A-45, B-21)

#### 2.3 Anchor and Count Corrections Carried Forward

- **`Input/edits.ts`** is 819 lines; `inAliasAt` `:334-338`, `isInsideWikilink` `:612-627` (comment `:611`), `isLiteralAt` `:638-643`, `inBracket` `:646-650`, `inUrlRun` `:631`, `autoPair` `:340`, `closerEndAt` `:501`, `linkInCode` `:324-331` (new at baseline). S4's anchors were 11 lines early. (A-02, B-21)
- **`Links/linkEdit.ts`** is 173 lines, not 172. (A-02, B-07)
- **`Links/linkClicks.ts`** is 156 lines, not 158. (B-03)
- **`windowSlice.ts`** is `Core/Session/windowSlice.ts`, `openBrowser` at `:247`. (B-24)
- **⚖ `Engine/detect.ts`:** `loneEmbedRe` is at `:400` and `loneEmbedTitle` at `:402` (read at HEAD); B-15's `:398`/`:400` is two lines early, A-11/A-100's `:400` for `loneEmbedRe` is right. B-15's other anchors hold (read at HEAD): `loneWebpageEmbed` `:406-417` (doc `:406`, its `WEB_ADDRESS && isValidLink` test at `:414`, A-30's anchor), `webpageEmbedUrlSpan` `:419-423`, `blockEmbedLines` `:426`.
- **⚖ `Engine/tokens.ts` Slot Drop:** `wikiLinkTokens` discards an empty alias at `:235` and an empty heading at `:236` (read at HEAD); `:234` is the comment. B-76's `:235-236` is right; A-140's `:234-235` includes the comment line.
- **⚖ `pasteAsMenu.ts:70`:** The text is `WEB_ADDRESS.test(target.url)` alone (`embeddableTarget`). B-34's spelling is exact; A-30's "composite on an already-valid url" describes the effect (its input already passed `isValidLink`), not the spelling.
- **`linkSpans`' Empty-Page Refusal** is `connections.ts:30`, and only for an empty page with no heading slot (`[[#H]]` is accepted). (B-69, B-179)

#### 2.4 Surface Map

All counts `wc -l` at HEAD, production only. "Dedicated" files exist for links; "mixed" files hold link code among other concerns.

##### Dedicated Link Files (≈ 3,203 Lines)

| File | Lines | Owns | Readers and Anchors | IDs |
|---|---|---|---|---|
| `Core/Connections/connections.ts` | 109 | Wikilink and embed grammar (`pageEmbedPattern` `:3-4`, `pageLinkPattern` `:7-8`), `titleOf` `:21-22`, `linkSpans` `:24-40`, caret readers `linkAt`/`aliasSpanAt`/`emptyAliasPipeAt`/`emptyHeadingHashAt` `:42-64` (23 lines, no host caller), `WHOLE_LINK`/`parseConnectionText` `:66,74-87`, `connectionText` `:89-96`, `expressibleHeading`/`embeddableTitle` `:99-105`, `pageEmbedText` `:107-109` | Caret readers called only from MarkdownPM: `linkEdit.ts:56,57,82,107,109,124`, `edits.ts:327,337`, `linkReveal.ts:23`, `autocomplete.ts:72`, `headingHash.ts:8` | A-01, A-03, B-20 |
| `Core/Connections/links.ts` | 110 | Markdown-link grammar: `MD_LINK` `:5`, `emptyTolerantLinkRegex` `:16-17`, `escapeAlias`/`unescapeAlias` `:19-25`, `composeWebpageEmbedLine` `:27-30`, `DestinationSpans` `:39-43`, `markdownDestinationAt` `:46-56`, `linkDestinationStart` `:59-65`, `encodeLinkTarget`/`decodeLinkTarget` `:68,77`, `targetTitle` `:94-98`, `targetFragment` `:102`, `targetNamesTitle` `:107-110` | Importers of `connections.ts`/`links.ts` (git grep): `pasteAsMenu`, `adoptFile`, `assetMigrate`, `assetRoots`, `assetUrl`, `assetWrite`, `linkValue`, `pageIndex`, `rewrite`, `scan`, `pageMenuActions`, `autocomplete`, `useConnectionAutocomplete`, `embedClaims`, `tokens.ts:14`, `embedGuard`, `edits.ts:2,3` (uses `:327`, `:337`, `:635`), `connectionsApi`, `headingHash`, `linkEdit`, `linkReveal`, `gripMenu`, `decorations.ts:71`, `propertyValue`, `value.ts`, `holdings` | A-01, A-03 |
| `Core/Connections/scan.ts` | 137 | `titleKey` (empty title → own) `:18-21`, `sectionRunsIn` `:24-37`, `LinkSyntax` `:59`, `LinkHit` `:62-66`, `linksIn` `:70-109`, `frontmatterMentions`, `valueLinks` `:128-136` | Index seed (`indexSeed.ts:61-62`), `cascade.ts`, `decorations.ts` | A-01, A-10 |
| `Core/Connections/rewrite.ts` | 133 | Title/heading rename rewrites `:31-111`, `rewriteFrontmatterConnections` `:113-133` | `cascade.ts:199-211`, `headingRenameSettle.ts:57`, `tilesFile.ts:291` | A-01, A-10 |
| `Core/Connections/linkValue.ts` | 144 | Link value codec (`linkEntry` `:15-22`, `readLink` `:30-35`, `parseLink` `:37-42`, `serializeLink` `:44`, `parsePastedLink` `:48-62`, `urlClickTarget` `:64-68`, `linkEditText`, `linkAlias` `:77-79`, `linkValueFromEdit` `:82-95`, `linkValueFromRename`, `linkDisplayText` `:109-121`) plus editor paste writers (`LinkPaste` `:124-129`, `linkMarkdown` `:132`, `linkPaste` `:137-143`) | Paste writers read by `pasteDecision`, `pendingTitle`, `linkFormat`, `pasteLink`, `pasteAsMenu`, `Menus/menu.ts` | A-01, A-94 |
| `Core/Connections/pageIndex.ts` | 55 | `buildPageIndex` (the single resolver builder), `ConnResolution` `:11`, lazy alphabetical sort `:31-32`, status `:36-38` | `pageIndexOf` (`treeIndex.ts:270-274`) only; raw `.resolve` readers include `matrixInput.ts:58`, `pageConnections.ts:30` | A-01, A-04 |
| `Core/Connections/aliasMemory.ts` | 9 | Alias memory | `editorHost`; harness copy at `editorHarness.ts:83-90` | A-01, A-22 |
| `Core/MarkdownPM/Links/connectionsApi.ts` | 158 | `ConnMenuTarget` `:16-36`, `ConnectionsApi` `:38-44`, `MdTarget` `:46-50`, `titleTarget` `:52`, `resolveMdTarget` `:64`, `tokenTarget` `:70-74`, `linkMenuTarget` `:76`, `tokenMenuTarget` `:97`, `WikiLinkView` `:114-118`, `headingMissing` `:121`, `linkStatus` `:131-134`, `wikiLinkView` `:136-148`, `openPage` `:150-158`. Imports `Actions/connectionMenu` types (`:4-9`) and UIX `TrailSegment` (`:13`) | 13 importers outside MarkdownPM: `connectionMenuActions`, `WindowTabBody`, `editorHost`, `TextCell`, `PropertyValueInput`, `TextPane`, `PropertyPanel`, `valueContext`, `pageConnections`, `MarkdownTile`, `PageTile`, `TileHost`, `tileKinds` | B-04 |
| `Core/MarkdownPM/Links/linkClicks.ts` | 156 | Private `LinkHit` `:24`, `sectionRunAt` `:31-43`, `linkUnder` `:46`, `followTarget` `:75`, `heldTarget` `:89-92`, `resolveFollow` `:95`, `dwellTarget` `:118`, `linkPointer` `:132` | `surface.ts:51`, `cellStatic.tsx:35`, `TextCell.tsx:9`, `citationPointer.ts:8` | B-03 |
| `Core/MarkdownPM/Links/linkEdit.ts` | 173 | `wikiAuthorTarget` `:22` (doc `:21`), `applyLinkAction` `:38`, `commitAliasOnEnter` `:51`, `rememberAliasNear` `:79-90`, `slotNear` `:104-113`, `leaveSlot` `:116`, `aliasOnLeave` `:135` | `linkClicks.ts:16`, `cellStatic.tsx:34`, `markdownInput.ts:42,271`, `surface.ts:20,55` | B-07 |
| `Core/MarkdownPM/Links/linkFormat.ts` | 86 | `LinkActionText` `:13-17`, `linkActionText` `:19-43`, `formatted` `:45-52`, `applyUrlLinkAction` `:55-86` ("the parallel" comment `:54`) | `linkClicks.ts:17`, `cellStatic.tsx:33` | B-06 |
| `Core/MarkdownPM/Links/pendingTitle.ts` | 74 | `PendingTitle` `:9`, `pendingTitles` `:20-41`, exact-text survival `:33`, teardown comment `:43`, sweep writing `linkMarkdown` `:56-64`, `destroy` `:68-70`, `pendingTitle` `:74` | `surface.ts:19,54`, `pasteLink.ts:12`, `linkFormat.ts:10` | B-05 |
| `Core/MarkdownPM/Links/pasteLink.ts` | 137 | `linkFor` `:17-39`, `literalAt` `:42-47`, `writeLink` `:49-63`, `writeLine` `:66` (`embedSeatAt` re-check `:67`), `writePlain` `:77-83`, `pasteAs` `:86`, null `clipboardData` `:114`, ⌘⇧V `:123-135` | Mounted once in `inlineSurface` (`surface.ts:53`) | A-01, A-05 |
| `Core/MarkdownPM/Links/pasteDecision.ts` | 47 | `PasteInput`/`LITERAL`/`PasteDecision` `:7-18`, `pastedUrl` `:21-27`, `decidePaste` `:30-46` | `linkFor` only (`pasteLink.ts:17-39`); its "serves both editors" header is stale | A-01, A-05 |
| `Core/MarkdownPM/Links/headingHash.ts` | 35 | `titleSpanAt` `:7-12`, the `§`→`#` typing transform (code gate `:21`) | `markdownInput.ts:43,247,254` | A-01, A-70 |
| `Core/MarkdownPM/Links/linkReveal.ts` | 26 | `linkRest` `:6-14`, `linkTyping` `:17-25` (regex `linkAt` on every `docChanged`) | `decorations.ts:486,488`, `linkEdit.ts:65`, `surface.ts:56-57` | A-01, B-17 |
| `Core/MarkdownPM/Autocomplete/autocomplete.ts` | 284 | `ConnectionForm` `:19`, `AcQuery` `:30` (dead), `autocompleteQuery` `:44-134`, `openHeadingRows` `:159-171`, `aliasRows` `:173-192`, `formSyntax` `:198-212`, `connectionInsert` `:214-222`, `commitEdit` `:231-281` | `useConnectionAutocomplete` | A-01 |
| `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts` | 273 | The picker hook: `ac`, `armed`, `measured`, `sameQuery`, `formRef`, `viaChevron`, `fetched`, `commit` `:161-181`, `sectionArmAfter` `:251-273` | Three mounts: `MarkdownEditor.tsx:298`, `CellEditor.tsx:288`, `TextPane.tsx:180` (plus `aliasPicker.test.tsx:97,193`) | A-01, A-06 |
| `Core/MarkdownPM/Autocomplete/AutocompletePane.tsx` | 215 | Pane, `cameFrom` `:81-90`, fake-outline `nested()` `:184`, seven optional props + `NONE` `:35-45,63-69` | The hook | A-01 |
| `Core/MarkdownPM/Autocomplete/headingTarget.ts` | 28 | `HeadingTarget` `:5`, `headingTargetOf` `:15-16`, `headingOutline` `:20-27` | The hook | A-01 |
| `Core/MarkdownPM/Engine/embedClaims.ts` | 25 | `claimedEmbeds` `:11-25`, `embeddableTitle` gate `:7` | `decorations.ts:474-483`, `embedWidget.tsx:405-406` | B-11 |
| `Core/MarkdownPM/Citations/citationPointer.ts` | 131 | `loneTarget` `:19`, `followCitation` `:30-45`, `citationPointer` `:57` (`dwell: () => null` `:62`), `citationRowPointer` `:95`, `citationRowMenu` `:109` | `surface.ts:52` (every scope) | B-12 |
| `Core/Properties/Cells/LinkCell.tsx` | 97 | URL half (title hook `:33-38`, anchor `onClick` `:51-56`, `solidColorCss` `:46-47`) and `ConnectionCell` `:64-97` (34 lines) | `Cell.tsx:131` (no `connections` passed) | A-01, B-10 |
| `Core/Properties/Cells/linkResolve.ts` | 8 | `resolveTitle` over `resolveConnection` | `parseEditorValue.ts:5,39` only | A-54, B-10 |
| `Core/Interface/Menus/connectionMenuActions.ts` | 103 | `showConnectionMenu` `:19-70`, `LinkCellAction` `:74`, `linkValueMenuTarget` `:76-103` | `pageConnections.ts:3`, `TableView.tsx:288`, `CardValue.tsx:115`, `PropertyPanel.tsx:344` | B-09 |
| `Core/Actions/connectionMenu.ts` | 122 | `ConnSurface` `:21`, `CONN_SITE_ROWS`, `ConnMenuAction` `:50-56`, `isConnUrlAction`/`isConnCellAction` `:58-62`, `connectionMenuModel` `:80-99`, Copy Path `:119` | Main and renderer | B-09 |
| `Core/Actions/pasteAsMenu.ts` | 122 | `PasteAsTarget` `:28`, `wholeWikiLink` `:30-33`, `pasteAsTarget` `:35-47`, `URL_ROWS` `:59-62`, `embeddableTarget` `:69-71`, `pasteAsRows`, `pasteAsWrite` `:99-122` | `Desktop/Actions/editorMenu.ts` (main), `pasteLink.ts` | A-01 |
| `Core/Web/openWebLink.ts` | 11 | The one in-app-vs-system adjudicator for an address | 8 click readers: `editorHost.tsx:138`, `TextCell.tsx:41`, `LinkCell.tsx:55`, `PropertyPanel.tsx:301`, `CardValue.tsx:94`, `TableView.tsx:155`, `WebTile.tsx:174`, `useBridgeSubscriptions.ts:110` (`web:popup`); explicit picks bypass it (`connectionMenuActions.ts:35-36`, `WebWindow.tsx:85`) | B-01 |
| `Core/Web/handlers.ts`, `titleScan.ts`, `guest.ts` | 57, 46, 4 | `link:open` host handler (gate `:39-41`), title scan (`LINK_RESOLVE_TIMEOUT_MS = 6000`, `titleScan.ts:1`) | `serve.ts:14`; `Desktop/Web/linkTitles.ts:3`, `GlancePane.tsx:4`; `webGuests.ts:5`, `folding.ts:17` | B-02 |
| `Core/Session/pageConnections.ts` | 56 | The `ConnectionsApi` builder: modes `preview`/`window`/`inert` (`:17-19`), `resolve` spread `:30`, `headingsOf` `:31`, inert bundle `:34`, `open` `:37-40`, `bypass` `:41-42`, `menu` `:43` | 8 importers; `ConnectionsApi.open` also read by `TileHost.tsx:104` (`openRoute`, used `:238`, `:281`) | B-08 |
| `Core/Paths/urlPath.ts` | 36 | `isHttpLink` `:20`, `isValidLink` (whitespace test `:26`, dotted host `:32`), `WEB_ADDRESS`, `normalizeLinkUrl`, `linkDomain` | 15+ readers | A-01, B-34 |

**Dedicated Total:** Connections 697 + `Links/` 892 + `Autocomplete/` 800 + the remaining dedicated files 814 ≈ **3,203** production lines.

##### Mixed Files With Link Code

| File | Lines | Link Code | IDs |
|---|---|---|---|
| `Core/MarkdownPM/Engine/tokens.ts` | 364 | `Token` `:31-41` (`resolveRange` `:35`, `fragment` `:36`), `aliasedToken` `:44-45`, `linkAddress` `:47`, `linkTarget` `:52`, `headingOf` `:54`, `shiftToken` `:61`, `TokenKind` `:17-29`, `wikiLinkTokens` `:228-253`, `tokenizeChunk` `:258-326` (`notOverlapping` `:282-309`), `linkTokenAt` `:331-344`, `activeTokenIndices` `:347-364`. Tokenizer callers: `decorations.ts:366`, `cellStatic.tsx:52`, `formatState.ts:16`, `format.ts:86,123`, `edits.ts:402`, `citationPointer.ts:21`, `cellCitations.ts:19`, `subfieldStats.ts:60` | B-14 |
| `Core/MarkdownPM/Engine/detect.ts` | 671 | `loneEmbedRe` `:400`, `loneEmbedTitle` `:402`, `loneWebpageEmbed` `:406-417`, `webpageEmbedUrlSpan` `:419-423`, `blockEmbedLines` `:426` | B-15 (C) |
| `Core/MarkdownPM/decorations.ts` | 856 | `MD_LINK_CLASS` `:80`, `mdLinkClass` `:82-99`, `chunkTokens` `:366`, `drawnLinkAt` `:370-374`, `visibleInline` `:377`, raw-HTML drop `:471-472`, claim suppression `:473-483`, markdown-link draw `:557-588`, wikilink draw `:589-664`, section runs `:666-676`, `dropMargin` `:760-766`, `pasteMargin` `:753-759`, rebuild triggers `:840-846` (includes `selectionSet` `:842`) | B-16 |
| `Core/MarkdownPM/Tables/cellStatic.tsx` | 486 | `cellTokens` `:52`, `renderCellContent` `:55-179`, `LINK_SELECTOR` `:255`, `StaticCell` props `:273-283`, `live` `:286`, `menuAt` `:288-306`, `claimLink` `:316`, `claimCheckbox` `:326` (reads `live` `:332`), `linkGestures` `:397-434`, `cellLinkTarget` `:436-446`, `menuTarget` `:448-477` | B-18 |
| `Core/MarkdownPM/Tables/MarkdownTable.tsx` | 645 | `initialSelect` `:153,420,435,459,468-474`, rectangle ⌘V `:243-252`, wrapper `.mdpm-tbl-wrap` `:501` | B-18 |
| `Core/MarkdownPM/Tables/CellEditor.tsx` | 291 | `initialSelect` `:109,122,248,257-258`, `connections` `:124,147`, `input.paste` handling `:154-163`, picker mount `:288` | B-18 |
| `Core/MarkdownPM/Tables/widget.tsx` | 578 | `tableConnections` facet (`:55-56` define, `:345` read, `:560` parameter, `:570` `.of`), `commit` `:238-240` | B-49 |
| `Core/MarkdownPM/Input/edits.ts` | 819 | See *§2.3* | B-21 |
| `Core/MarkdownPM/Input/markdownInput.ts` | 283 | `typedInput` `:232`, Enter keymap `:270-279` (`commitAliasOnEnter` `:271`), `sectionSign` `:56,262` | B-23 |
| `Core/MarkdownPM/Input/format.ts` | 346 | `LINKS` `:55-59`, `toggleInline` `:86`, `toggleWrap` `:116-144` | B-23 |
| `Core/MarkdownPM/Menus/menu.ts` | 108 | `insertLinkOverSelection` `:47-52`, paste dispatch `:68-73`, scope branch `:94` | B-23 |
| `Core/MarkdownPM/Gestures/pointerPath.ts` | 99 | `pointerHandlers` `:30`; `onText`/`hidesSyntax` read only at `:50` | B-22 |
| `Core/MarkdownPM/docCache.ts` | 99 | `drawnLast` `:40-52`, `docScan` `:64`, `docSectionHeadings` `:99` | B-19 |
| `Core/MarkdownPM/Embeds/embedWidget.tsx` | 717 | `embedHost.getConn` `:41,47`, `buildTiles` claim `:403-411`, `embedField` `:511`, `redrawNudge` `:526`, `embedTileRanges` `:647` | B-11 |
| `Core/MarkdownPM/Embeds/embedInsert.ts` | 61 | `webpageInsertAtCaret` writes `![]()` by hand `:59-60` | B-11, A-81 |
| `Core/MarkdownPM/Citations/citationActions.ts`, `citationEdits.ts`, `citationMenu.ts` | 159, 171, 23 | Citation actions and menu (`citationActions` also read by `MarkdownEditor.tsx:19`; `citationMenu` by `api.ts:25`) | B-12 |
| `Core/Properties/Cells/TextCell.tsx`, `Cell.tsx` | 82, 240 | `TextCell` rides the shared stack (`:28-41,47-63`); `Cell.tsx:131-137` mounts `LinkCell`, `:139-141` mounts `TextCell` with `ctx.connections` | B-10 |
| `Core/Properties/PropertyPanel.tsx`, `Views/Cards/CardValue.tsx`, `Views/Table/TableView.tsx` | 571, 171, 734 | Value-menu wiring (`:333-347`, `:108-121`, `:282-293`), `open` intent handlers (`:301`, `:94`, `:155`) | A-52 |
| `Core/Properties/Pickers/valueClick.ts`, `PropertyValueInput.tsx`, `parseEditorValue.ts`, `propertyValue.ts`, `TextPane.tsx` | 77, 88, 43, 219, 183 | `valueClickIntent` link arm `:21,47-52`; `linkAlias` caller `:56`; Link commit `:36-40`; `namesGonePage` `:123-126`; `TextPane` mounts its editor in `.mdpm-editor` `:178` | A-01 |
| `Core/Views/Pipeline/filter.ts`, `sort.ts` | 300, 160 | Text values raw (`filter.ts:144-146`, `sort.ts:58-59`); link values through `linkDisplayText` (`:147-149`, `:60-62`) | A-56 |
| `Core/Tiles/Surfaces/WebTile.tsx` | 180 | `useWebpageTitle` `:21-30` | A-29 |
| `Core/Interface/Menus/pageMenuActions.ts`, `Core/MarkdownPM/Menus/gripMenu.ts` | 63, 169 | Copy Link (`:51-52`, `:91-92`) | A-34 |
| `Core/Actions/editorMenu.ts`, `Desktop/Actions/editorMenu.ts` | 143, 138 | `PASTE_PLAIN_ACTION` `:41`, `LINK_ROWS` `:60`; main clipboard read and Paste As rows `:25-50,103-105` | A-96, A-117 |
| `Desktop/Web/webGuests.ts`, `linkTitles.ts` | 228, 44 | Attach gate `:18,150-157`; `fetchPageTitle` refuses non-http `:9` | A-31, B-54 |
| `Core/Nexus/treeIndex.ts` | 363 | `pageIndexOf` `:270-274`, `resolveConnection` `:283-288` | B-27 |
| `Core/Session/windowSlice.ts`, `cacheSlice.ts` | 286, 53 | `openBrowser` `:247`; `resolveLinkTitle`/`failedTitles` `:23-35` (no React imports, `:1-4`) | B-24, A-61 |
| `Core/Pages/editorHost.tsx` | 168 | `openLink` `:138`, `warmBody`/`fetchBody` `:139-143`, `WarmSeam` `:10,15,36` | B-75 |
| `Core/MarkdownPM/Menus/blockQuery.ts` | 54 | Borrows `md-phantom-syntax`/`md-connection-phantom` `:29-30`; `StateField` `:32-54` | B-61, A-65 |
| `Core/Assets/assetWrite.ts`, `adoptFile.ts`, `assetUrl.ts` | 35, 71, 40 | Return `connectionText(...)` (`assetWrite.ts:31`, `adoptFile.ts:53,64`); `AssetValue { kind: 'external' }` `assetUrl.ts:9` | B-13, B-84 |

**Type Reference Counts (S8, Re-measured, Production Refs/Files · Test Refs/Files):** `LinkTarget` 5/2 · 0; `ConnPage` 53/16 · 12/5; `MdTarget` 18/4 · 0; `ConnMenuTarget` 12/3 · 5/1; `ConnectionsApi` 80/26 · 65/27; `GlanceTarget` 9/2 · 2/1; `connectionText` 19/8 · 3/1; `parseConnectionText` 18/8 · 16/3; `ConnResolution` 2/1 · 0; `LinkSyntax` 2/1 · 0; `resolveMdTarget` 2/1 · 11/1; `getConn` 27/8 · 6/3; `LinkFormat` 6/2 · 0. (B-25, B-103)

---
### 3. The Rules

Each section uses one shape: **Current Shape** (every copy, with `path:line`), **Defects** (user-visible, with status), **Options** (deleted, added, de-overlapped net, user-visible behavior, dependencies, rule risks), **Traps**, **Would Go False**, **Source IDs**. Option deltas here are per-option; *§5 Delta Ledger* assigns each shared line to one owner.

---

#### 3.1 Reading Link Syntax: Grammars and Classifiers

##### Current Shape

- **Wikilink and Embed Grammars:** `pageLinkPattern` (`connections.ts:7-8`) reads `[[Title#Heading|Alias]]`; its alias admits no `]`, and `(?<!!)` keeps it disjoint from `pageEmbedPattern` (`connections.ts:3-4`), which excludes `#` from the page and has no alias. **V** (A-123)
- **Seven Readers Consume Raw `pageLinkPattern` Groups:** `linkSpans` (`connections.ts:24`, feeding `linkAt` and `wikiLinkTokens`, `tokens.ts:228-253`); `WHOLE_LINK`/`parseConnectionText` (`connections.ts:66,74-87`); `linksIn` (`scan.ts:80-91`); the two rewrites (`rewrite.ts:35,81`, through `groupsOf`/`offsetOf` `:21-23`); `wholeWikiLink` (`pasteAsMenu.ts:30-33`); the picker's worn alias (`useConnectionAutocomplete.ts:166-169`); and the exclusion in `sectionRunsIn` (`scan.ts:30`). `wholeWikiLink` skips the trim and `titleOf`, refuses a heading, and drops the alias (**V·P**: `[[T|a]]` → page `T`, no alias). **V** (A-13; merges S3 §2A and S4 §4)
- **The Cell-Escape Rule Is Written Twice:** `linkSpans` strips a trailing `\` only when an alias follows (`connections.ts:32-33`); `titleOf` strips one unconditionally (`connections.ts:21-22`), called from `scan.ts:89` (heading qualifier), `rewrite.ts:37` (page, even with a heading), `rewrite.ts:39,84` (heading), and `connections.ts:79-80`. **V** (A-07)
- **The Markdown Grammar Is Two Grammars:** The tokenizer's `markdownLinkRegex`/`emptyTolerantLinkRegex` (`links.ts:8-17`) cap the label and exclude `^`. `MD_LINK` (`links.ts:5`) has no 255 cap and no `^` exclusion, and its destination is greedy `(.*)`. Only its **label** admits a newline (`[^\]\\]`); the destination's `.` doesn't, and `pasteAsTarget` refuses newlines first (`pasteAsMenu.ts:37`). Readers: `parseLink` (`linkValue.ts:39`), `parsePastedLink` (`:55`), `pasteAsTarget` (`pasteAsMenu.ts:42`). **C** (A-09; A-150 corrects S1's "admits newlines")
- **Four Classifiers Answer "What Link Does This Text Name":** One rule with four policies, F-042's mechanism. **V** (A-14)

| Reader | Location | A Markdown Target Naming a Title Is |
|---|---|---|
| `readLink` | `linkValue.ts:30-35` | A **url**, always (**V·P**: `[x](Old)` → url) |
| `parsePastedLink` | `linkValue.ts:48-62` | A **page if it resolves, else refused**; no URL fallback (A-15) |
| `pasteAsTarget` | `pasteAsMenu.ts:35-47` | A **page**, never resolved (**V·P**: `[x](example.com)` → page `example.com`) |
| `resolveMdTarget` | `connectionsApi.ts:64-68` | A page if it resolves, else `external` if valid |

  `namesGonePage` (`propertyValue.ts:123-126`) is a fifth entry point through `parseConnectionText`.
- **`parsePastedLink` on `[l](example.com)`:** The `title !== null` branch returns `named(...)` (`linkValue.ts:59-60`), and `named` returns null when the resolver answers nothing (`:49-52`), so an unresolved title is refused rather than falling to the `isValidLink` arm at `:61`, which only schemed or slashed targets reach. `linkValueFromEdit` then refuses too, because `isValidLink('[x](example.com)')` is false (`:91`). **C·P** (ran: → `undefined`). S1 and S2 were right; S3's table row was wrong. A bare `example.com` → `https://example.com` (ran). (A-15, A-142)
- **The Host Keeps Its Regex Reader, Resolver-Free:** `readLink` and its family run host-side in `cascade.ts:96-97,209`, `scan.ts:118,134`, and `rewrite.ts:125`. **V** (A-133, B-167)
- **A Bare URL Isn't a Token:** `TokenKind` has no url (`tokens.ts:17-29`). **V** (A-132)
- **Overlap Precedence Lives Only in the Editor:** The editor drops a markdown token overlapping a wikilink through `notOverlapping([...embeds, ...wikis, ...code])` (`tokens.ts:284-288`); the host's `linksIn` has no precedence. **V·P**: `[x]([[T]])` → tokens `wikiLink` only, while `linksIn` yields `wiki:t` and `markdown:[[t]]`, an unresolvable extra key. **⚖** A-21's example `[a]([[B]])` and B-139's `[x]([[T]])` are the same fact; B-139's correction holds that `[[T]](x)` produces no markdown match in **either** reader (a label can't hold `]`; probed). Harmless today. (A-21, B-139)

##### Defects

- **Heading Escape Drift (Live):** For `[[A#Note\]]`, the index records qualifier `note` while the editor's `linkSpans` keeps the heading as `Note\`. A heading rename `Note`→`New` writes `[[A#New]]`, and a title rename writes `[[Bar#N]]`; both consume the backslash. **V·P** (A-07, B-139). The page half is latent: titles can't hold `\` (`Paths/names.ts:15`, `holdsName`).
- **`MD_LINK` Misreads:** `[a](b) [c](d)` → url `b) [c](d`; `[^1](x)` reads as a link, in Link values and Paste As. **V·P** (A-09)
- **Four Policies:** A Link value `[x](Old)` is a url to `readLink` but a backlink to `Old` in the index (*§3.16*); Paste As treats `[x](example.com)` as a page; the Link property refuses it. **V·P** (A-14, A-15)

##### Options

- **S1-B: One Value Model (Unique ≈ −11):** `parseConnectionText` returns the page arm of `LinkTarget`, deleting `ConnectionParts` and its spread in `readLink` (−6); `parseLink`/`LinkValue` fold into `readLink` (−5; `parseLink` has no production reader outside `linkValue.ts`); `MD_LINK` becomes the anchored `emptyTolerantLinkRegex` source as `WHOLE_LINK` does (±0, one grammar fewer; changes `[^1](x)` and `[a](b) [c](d)` in Link values and Paste As, which is intended). Its F-035 (−1) and title-expressibility (+1) pieces are in *§3.2*; its resolver move (±0) in *§3.5*. Its "`ConnectionCell`/`linkValueMenuTarget` through `titleTarget` −6" is owned by S2-A/S2-B when those are taken (*§3.10*); S1-B's claimed −17 is ≈ −11 unique. **User-Visible:** the two `MD_LINK` misreads stop. **Depends:** S3-1 (design together, count once). **Rules:** none touched. **C** (A-99, A-159)
- **S3-1: One Link Reader (≈ −15):** `readLinkText(text, resolve?) : LinkTarget | null` in `linkValue.ts`, reusing `parseConnectionText`, `MD_LINK`, `targetTitle`/`targetFragment`, `isValidLink`, `normalizeLinkUrl`. Rules: a whole connection is a page with heading and alias; a markdown link's title-shaped target is a page when it resolves, or, without a resolver, when it isn't a valid address (fragment → heading, label → alias); an empty title with a fragment is refused; anything else is an address if valid, normalized. `pasteAsRows`/`pasteAsWrite` take a `LinkTarget`; `linkValueFromEdit` calls the reader. **Deleted:** `wholeWikiLink` `:30-33` (4) + `PasteAsTarget` `:28` (1) + `pasteAsTarget` `:35-47` (13) + `parsePastedLink` `:48-62` (15) = 33 (measured spans). **Added:** reader ≈ +14, `pasteAsWrite` page arms carrying alias and heading +2, `linkValueFromEdit` switch +2 = 18. **Net ≈ −15** (audit's F-042 typed −14). **User-Visible:** Paste As keeps alias and heading; `[[T#H]]` offers Connection and Markdown Link; `[x](example.com)` offers address rows; `[x](#H)` offers nothing instead of writing `[[]]`/`''`; Paste As normalizes schemeless addresses; the Link property starts accepting `[x](example.com)` as `[x](https://example.com)`. **⚖** A-106 called that last change "unlisted"; it is already the audit's taken F-042 doc rewrite (`Pommora Codebase Audit.md:693,697`: "a markdown link whose target no page answers to stores as the address it is"), so the audit assumes it, though it remains Nathan's call (*§7*). **Depends:** nothing; F-114 stays unfixed, so in main `[x](Notes.md)` offers address rows (audit `:1273`). Keep the `[x](#H)` refusal explicit in the reader. **C** (A-106, A-144)
- **S2-D: `readLink` Reads `[x](Page)` as a Page (Rejected):** "A markdown target with non-null `targetTitle` is a page, unresolved" would make `[x](example.com)` a page (`targetTitle('example.com')` is non-null), repeating `pasteAsTarget`'s mistake. Its −8 on `parsePastedLink` deletes the same lines as S3-1; take S3-1's rule and drop D's delta. **⚖** A-105's ruling holds. D's remaining question (whether a Link value `[x](Page)` is renamed, which would rewrite it as `[[New|x]]` through `connectionText`, `rewrite.ts:130`) belongs to *§3.16*'s scope decision. **C** (A-105, A-144)
- **S1-C: One Occurrence Reader for Editor and Host (≈ −6, Optional):** `Connections` exports `linkOccurrences(text, inCode)` with the editor's precedence (embed > wiki > markdown, code excluded); `tokenizeChunk` maps occurrences to tokens in place of `wikiLinkTokens` and the embed/link `RegexSpec`s; `linksIn` and `sectionRunsIn`'s exclusion consume the same walk; `loneEmbedTitle` becomes an anchored `pageEmbedPattern`. **Deleted:** `wikiLinkTokens` `tokens.ts:228-253` (26), two `RegexSpec` entries and overlap filters (≈ 10), `sectionRunsIn`'s re-match `scan.ts:30-32` (3), `loneEmbedRe` `detect.ts:400` (1). **Added:** reader ≈ +22, token mapping ≈ +12. **Net ≈ −6.** **Value:** agreement by construction (`ConnectionsPM.md:8` becomes true; `[x]([[T]])` reads the same everywhere). **Stress:** `tokenizeChunk` keeps `notOverlapping` for every other kind (`tokens.ts:288-309`); it must keep the per-chunk call shape (`visibleInline`, `decorations.ts:376`). **Rules:** the Engine already imports Connections (`tokens.ts:14`), so none break. **Composes with** B-127 (*§3.3*) if the occurrence reader yields the slot spans the caret readers need; the two overlap on `wikiLinkTokens`' slot juggling (≈ 3 lines) and S6-C's `sectionRunsIn` edit (*§3.15*). **V** (A-100)

##### Traps

- Keep the wikilink and embed patterns apart (embeds exclude `#`, have no alias; `(?<!!)` keeps them disjoint, `connections.ts:3-4,8`). (A-123)
- `linkSpans`' `unescaped` must stay (`connections.ts:32-33`); `escapedPipe` can go only under a span edit (*§3.16*). (A-124)
- `emptyTolerantLinkRegex` is needed: ⌘K seats the caret in `[]()` (`links.ts:45`). `markdownDestinationAt`/`linkDestinationStart` (`links.ts:46-65`) read `[]()` mid-authoring, while the drawn grammar refuses empty halves (`links.ts:15`). (A-126, B-166)
- `linkEntry`'s nesting unwrap is real and its hand spelling earns itself: YAML reads unquoted `[[Page]]` as a nested sequence (`linkValue.ts:15-22`, `propertyValue.ts:73`). (A-50, A-127)
- The `readLink` family runs host-side; keep it resolver-free (main has no resolver, F-114). (A-133, B-167)
- A bare URL isn't a token, so synthesizing `[d](url)` for a value would hit page-first resolution. (A-132)

##### Would Go False

- `ConnectionsPM.md:4` (S3-1 widens what reads as a connection). `PropertiesPM.md:81-83` (S3-1 changes markdown-to-address acceptance). `ConnectionsPM.md:8` ("can never disagree") is half-true today; S1-C makes it true. (A-114, B-139)
- Tests: `linkValue.test.ts:120,133,159,170`; `pasteAsMenu.test.ts:42-43,51,70`. (A-116)

##### Source IDs

A-07, A-09, A-13, A-14, A-15, A-21, A-50, A-99, A-100, A-105, A-106, A-123, A-124, A-126, A-127, A-132, A-133, A-142, A-144, A-150, A-159, B-139, B-166, B-167.

---

#### 3.2 Writing Link Syntax

##### Current Shape

- **Spellers:** `connectionText` (`connections.ts:89-96`; drops an alias equal to the target, `:91-93`), `pageEmbedText` (`:107-109`, no heading parameter), `serializeLink` (`linkValue.ts:44`; `escapeAlias` escapes only `\` and `]`, `links.ts:19-21`), `composeWebpageEmbedLine` (`links.ts:27-30`), `linkMarkdown`/`linkPaste` (`linkValue.ts:132-143`). Asset writers return `connectionText(...)` (`assetWrite.ts:31`, `adoptFile.ts:53,64`; `filePick.ts:54` reaches them through `assets:adopt`). **V** (B-13, B-105)
- **Hand Spellings:** The picker's `formSyntax` `'link'` (`autocomplete.ts:210`) bypasses `connectionText` (F-035, audit `:317`); slot openers at `autocomplete.ts:238,247,256,271`; caret arithmetic at `:241,250,268,276`; an embed with a heading at `rewrite.ts:47,92`, because `pageEmbedText` takes no heading; `webpageInsertAtCaret` writes `![]()` by hand (`Embeds/embedInsert.ts:59-60`). **V** (A-40, A-81; merges S1 §3 "writer naming" and S4 §2.2)
- **Wrap and Unwrap:** `pasteDecision.ts:38` and `insertLinkOverSelection` (`menu.ts:52`) wrap through `serializeLink`; `toggleWrap` (`format.ts:138-144`) writes `[` + selection + `]()` raw, and its wikilink arm writes `[[` + selection + `]]` raw. Remove Link unescapes (`linkFormat.ts:32`); Format ▸ Link toggled off writes the raw `contentRange` (`format.ts:127-136`). **V** (B-43, B-44, B-121)
- **Titles Lack an Expressibility Check:** `nameError` rejects `|#§` and allows `]` (`Paths/names.ts:27`). `expressibleHeading` and `embeddableTitle` exist (`connections.ts:99-105`) with no title sibling. **V** (A-47)

##### Defects

- **A Title Ending in `]`:** `[[Draft]]]` matches `[[Draft]]` with page `Draft` (**V·P**, grammar copy), so Copy Link, Paste As Connection, and the picker write a broken connection for such a title. (A-47)
- **Unlink Leaves Escapes:** `toggleInline('[a\]b](https://x.com)', 3, 3, 'link')` writes `a\]b`. **V·P** (B-43)
- **Wrap Writes Unreadable Syntax:** Wrapping `a]b` yields `[a]b]()`, which no link grammar reads; the wikilink arm has the same gap for a selection holding `]]`. **V·P** (B-44, B-121)
- **The Picker Can Write `[[Bar|Bar]]`:** F-035 through `formSyntax` (A-40). An embed commit replacing the whole span drops a typed `#heading` (**I**, A-40).

##### Options

- **S1-B Writer Pieces:** `connectionText` becomes the only wikilink spelling (`autocomplete.ts:210` goes through it, F-035, −1; S4-C's same change counts 0); `pageEmbedText` takes a heading so `rewrite.ts:47,92` stop hand-spelling (folded into S1-A); a title expressibility check generalizing `expressibleHeading`/`embeddableTitle` rather than adding a third (+1). **User-Visible:** a title ending in `]` stops producing broken connections. **V** (A-99)
- **S7-E: One Escape Rule for Wrap and Unwrap (+2):** `toggleWrap`'s markdown arms escape on wrap (`escapeAlias`) and unescape on unwrap (`unescapeAlias`), matching `serializeLink` and Remove Link (`format.ts:133,140-141`). It covers the markdown arms only; the wikilink arm's `]]` case is unaddressed. A defect fix that earns its lines. **V·P** (B-121)
- **S3-3 `composeWebpageEmbedLine` Once (−2):** `![${escapeAlias(alias ?? '')}](${url})` written once, used by `pasteAsWrite` and `webpageInsertAtCaret`; the false "ONLY" comment goes. Its label parameter has only a test caller today (the production caller passes `''`, `pasteAsMenu.ts:119`; `detect.test.ts:420-423`). **V** (A-81, A-108)
- **S8: `serializeLink(url, label?)`** replaces `serializeLink(v: LinkValue)` inside S1-B (0). (B-123)

##### Traps

- `escapeAlias` escapes only `\` and `]` (`links.ts:19-21`), so a title holding `|` written into a table cell through `linkMarkdown` would split the row; the audit's deferred F-043 fix budgets the `cellToSource` escape (+4). (B-176)
- `[[Bar|Bar]]` can't come from Paste As (`connectionText` suppresses it), but the body rename produces it (*§3.16*). (A-141, A-155)

##### Would Go False

- `links.ts:27` ("ONLY assembly path") and `detect.test.ts:420-423` ("the ONE assembly path") are **already false**. (A-115, A-116)

##### Source IDs

A-40, A-47, A-81, A-141, A-155, B-13, B-43, B-44, B-105 (spell-a-link), B-121, B-176.

---

#### 3.3 Caret Readers and Slots

##### Current Shape

- **Regex Caret Readers:** `linkAt`/`aliasSpanAt`/`emptyAliasPipeAt`/`emptyHeadingHashAt` (`connections.ts:42-64`, 23 lines), every caller in MarkdownPM (*§2.4*). **V** (B-20)
- **Slot Classification Happens Four Times:** `autocompleteQuery` (`autocomplete.ts:72-94`), `slotNear` (`linkEdit.ts:104-113`), `titleSpanAt` (`headingHash.ts:7-12`), and `aliasSpanAt` (through `commitAliasOnEnter` and `inAliasAt`). The three wrappers each re-run `linkAt`. **V** (A-39)
- **Six "Inside Link Syntax" Readers in the Typing Surface:** `linkInCode` `:324`, `inAliasAt` `:334`, `isInsideWikilink` `:612` (`[[` depth, so unclosed and `![[` count), `inBracket` `:646`, `inUrlRun` `:631`, and `headingHash`'s `titleSpanAt`. The closed/unclosed split is genuine. **V** (B-45)
- **"Literal Here" Is Spelled Three Times:** `isLiteralAt` (`edits.ts:638-643`: code, `c-1`, math, `isInsideWikilink`, url run), `literalAt` (`pasteLink.ts:42-47`), and `headingHash`'s `inCodeAt(sel) || inCodeAt(sel-1)` (`:21`). `literalAt` ignores wikilink interiors (consequence: A-59, *§3.11*). **V** (A-44)
- **Pass Counts:** `linkInCode` runs `linkAt` again (`edits.ts:327`). `slotNear` is **3** `pageLinkPattern` passes (`linkInCode`, `aliasSpanAt`, `linkAt`); `commitAliasOnEnter` is **3** (`linkAt`, `aliasSpanAt`, `linkInCode`); `inAliasAt` is 2. Per keystroke, `aliasOnLeave` can call `slotNear` twice (`linkEdit.ts:154,158`), up to 6 passes. All line-scoped; no rule broken. **C** (A-36, A-143)
- **The Token Drops Slots, So the Caret Paths Keep a Second Reader:** `wikiLinkTokens` discards an empty alias and heading (`tokens.ts:235-236`) and encodes title/heading/alias as `resolveRange`/`fragment`/`contentRange`. Recovering it costs `aliasedToken` (`:44-45`), four `tk.resolveRange ?? tk.contentRange` fallbacks (`decorations.ts:594`, `cellStatic.tsx:78`, `connectionsApi.ts:72`, `linkEdit.ts:28`, produced by `resolveRange` being set only when an alias or heading slot is written, `tokens.ts:243`), the empty-pipe sniff (`decorations.ts:606`, `linkEdit.ts:35`), the regex caret readers, and `linkInCode`. `linkSpans` already returns `{ full, title, heading, alias }` with empty slots intact (`connections.ts:24-40`). **V** (B-76, B-50)
- **Raw HTML:** Only `commitAliasOnEnter` refuses raw HTML (`linkEdit.ts:60`); the draw drops `inHtml` tokens (`decorations.ts:472`) in page scope (`:471`). `slotNear`, `inAliasAt`, the picker, and `rememberAliasNear` don't refuse. `commitAliasOnEnter` is bound only in `markdownInput` (`markdownInput.ts:271`), which only `MarkdownEditor.tsx:142` mounts, always `scope: 'page'` (`:155`); `CellEditor` and `TextPane` use `editorBase` without it. So the disagreement is page-scope only, and S6's "misreads cells" claim is dropped. **V** (A-37, B-196)
- **Derived Gates:** `rememberAliasNear` (`linkEdit.ts:79-90`) is called only from `leaveSlot` (`:126`), which runs only after `slotNear` returned a slot through `linkInCode` (`:106`), so it inherits the code gate. `linkTyping` (`linkReveal.ts:17-25`) is code-blind, but its value is read only when a drawn `wikiLink` token starts at that offset (`decorations.ts:641`), and a code-borne connection draws no token, so the blindness is invisible. **C** (B-36)
- **Scope Split:** `commitAliasOnEnter` is page-only, while `aliasOnLeave` and `typedInput` sit in `inlineSurface` (`surface.ts:55,68`); `headingHash` lives in `Links/`, its chain siblings in `Input/edits.ts` (`markdownInput.ts:43,247,254`; *§3.20*). **V** (A-70)

##### Defects

- **Raw-HTML Stand-Down (I):** On a page, the picker, slot collapse, and alias memory act inside a raw-HTML block the draw doesn't render as a link (consequence inferred; probe in *§8*). (A-37)
- The code-gate defects are in *§3.4*.

##### Options

- **S4-A: One Slot Reader (≈ −13 to −16):** `slotAt(line, rel): { spans: LinkSpans; slot: 'title' | 'heading' | 'alias' } | null` in `connections.ts` (code-blind) replaces the three wrappers; `autocompleteQuery`'s wikilink branch switches on `slot`; `slotNear` becomes a call plus offset; `commitAliasOnEnter`, `inAliasAt`, `rememberAliasNear` read once; `leaveSlot`'s emptiness is `start === end`. **Arithmetic:** −13 (wrappers) +8 (`slotAt`) −4 (`autocompleteQuery` branches) −5 (`slotNear`) −2 (double reads) ≈ −16; a shared gate adds ≈ +5 and removes `commitAliasOnEnter`'s 2-line HTML check → ≈ −13. **Verifier Stress:** `linkInCode` is a fourth `linkAt` caller `slotAt` must feed; have it take the spans, so `slotNear` and `commitAliasOnEnter` drop from 3 passes to 1. Don't add a separate `liveLinkAt`: it half-exists as `linkInCode`, so extend or rename that (adding one duplicates A-45). **Gap:** `slotAt` is closed-only and doesn't deliver the picker ruling (*§3.12*). **User-Visible:** with the shared gate, the picker, slot collapse, `]` refusal, and alias memory stand down in a raw-HTML block. **Rules:** Connections stays code-blind; the gate stays in MarkdownPM. **C** (A-109, A-153)
- **S6-A: The Token Carries Its Slots, With a Shared Memo (Fails Its Premise):** A `wikiLink` token carries `parts: { title, heading, alias }` (empty slots as zero-width spans) in place of `resolveRange` and `fragment`; `tokensNear(scan, pos)` tokenizes the `chunksOver(scan, [[i, i]])` chunk through one module memo shared with `visibleInline`, behind `line.includes('[[')`; every caret reader becomes `linkTokenAt(tokensNear(scan, pos), pos, 'wikiLink')` plus a `parts` check. **Scout Arithmetic:** deleted `connections.ts:42-64` (−23), `linkInCode` (−8), `inAliasAt` 5→3 (−2), `aliasedToken` (−3), slot juggling `tokens.ts:234-237` (−3), pipe sniff `decorations.ts:604-608` (−3), token field (−1), caller arithmetic (`linkEdit.ts` −6, `linkReveal.ts` −1, `autocomplete.ts` −2) = −52; added `tokensNear` + memo + gate (+10), `shiftToken` (+2) → ≈ −40. **Probe:** the shared memo needs `chunksOver(scan, [[i, i]])` to return the viewport pass's chunk; on a 1,362-line document of long lists, fences, and 80-line paragraphs, **499 of 528 lines mismatched** (line 1: viewport `[0,1217]`, single-line `[0,37]`), because `chunksOver` extends to `last + CHUNK_REACH` or cuts at `last + 1` depending on the requested span (`docScan.ts:290-300`). Where cuts are sparse the caret reader misses the memo and parses up to ≈ 50 lines per keystroke or caret move on a `[[` line: a hard-rule regression. Deleting `aliasedToken` leaves its four callers (`cellStatic.tsx:95`, `decorations.ts:592`, `connectionsApi.ts:108`, `linkEdit.ts:31`) a non-empty test to spell; replacing `fragment` with a possibly-empty `parts.heading` adds emptiness checks where readers rely on absence (`headingOf`, `decorations.ts:608,615`, `cellStatic.tsx:96`). Realistic ≈ −25 to −35 if a cheap reader exists. **C** (B-114)
- **B-127: The Viable One-Reader Form (Verifier Proposal, Uncosted):** Export the tokenizer's own wikilink pass from `Engine/tokens.ts` with its slots intact (`linkSpans`' spans, empty slots kept); the caret readers run it over **the caret's line** with the **document scan's** code mask (`inCodeAt(scan, …)` plus `inlineSpans` overlap, the two rules `tokenizeChunk` applies at `tokens.ts:232,282`), behind `line.includes('[[')`. One regex over one line, as today's `linkAt`, but the code rule is the tokenizer's function, so `linkInCode` and the four regex caret readers go and gates 2-4 (*§3.4*) agree with the draw by construction; line-alone `readFormatState`/`toggleWrap` can read the same pass. **Estimate:** S6-A's deletions minus its memo (+10 → ≈ +4) ≈ **−25 to −35**; the planner must cost it. **R** (B-127)
- **S8 §6.2: `resolveRange` Always Set (±0):** `tokens.ts:243` → `resolveRange: s.title`; the four fallbacks become plain reads; `aliasedToken` stays correct (re-verified). Mutually exclusive with S6-A/B-127's `parts`; if B-127 is taken it's moot, if not it's the cheap way to delete the fallbacks. **V** (B-123)
- **⚖ S4-A vs B-127 (vs S6-A):** A-45 (A's own finding) shows `linkInCode` re-derives the tokenizer's code rule; A-109's advice to extend `linkInCode` keeps that second spelling, so S4-A doesn't resolve A-45 at its cause. B-127 does, by making the caret readers call the tokenizer's pass. S6-A's memo mechanism fails B-114's probe and is out. **B-127 holds on principle (Source Over Patch) and is the preferred form; S4-A is the costed fallback.** They're mutually exclusive in the ledger (never both). Both are one regex over one line, so both meet the high-frequency rule. If B-127 is taken, `commitAliasOnEnter`'s raw-HTML clause moves into it (if it absorbs scope) or stays as today; S6-A's +1 scope test is dropped (B-196). (B-127, B-129, A-109)

##### Traps

- Today's tokens drop empty alias and fragment slots (`tokens.ts:235-236`), so the **current** token can't replace `linkAt` for slots; B-127 changes that by exporting the slot-bearing pass, not the drawn token. (A-140)
- `drawnTokens` can't serve the caret paths: `linkTyping` runs in a `StateField` before the draw; `autoPair`/`inAliasAt` are pure over the scan (`edits.ts:340,375`); `aliasOnLeave`'s blur can fire with the caret off-screen. (B-163)
- A shared chunk memo needs a small cap (`perText` copies keys, `perText.ts:10-11`; chunks can exceed 50 lines, `CHUNK_REACH`, `docScan.ts:263`) and can't be shared by keying on chunk text (B-114's probe). (B-164)
- `chunksOver` returns no chunk for a fenced line (`docScan.ts:284-287`). (B-165)
- `Token.contentRange` can't stand in for the alias span: `[[T|]]` leaves it on the title (`tokens.ts:235-238`). (B-189)
- `isInsideWikilink` isn't a duplicate of `linkAt`: it counts unclosed `[[` for typography, is code-blind on purpose (`isLiteralAt` asks `inCodeAt` first, `edits.ts:638-643`), and is the nearest existing piece for the picker ruling. (A-128, B-182)
- `activeTokenIndices`' inclusive end is deliberate (`tokens.ts:360-361`), compensated by `linkRest` (`linkReveal.ts:6-14`). (B-171)

##### Would Go False

- `connections.test.ts` (12 references) and `aliasPicker.test.tsx` (11); `tokens.test.ts` touches `resolveRange`/`fragment`/`aliasedToken` 17 times, including `:124,132` (`toBeUndefined`). `edits.test.ts` has **no** `linkInCode` case (dropped claim, B-191); its `inAliasAt` block (`:858-869`) goes false. `linkEdit.ts:59` comment and the Link Gestures plan. (B-133, B-138, B-191)

##### Source IDs

A-36, A-37, A-39, A-44, A-70, A-109, A-128, A-140, A-143, A-153, B-20, B-36, B-45, B-50, B-76, B-114, B-123, B-127, B-133, B-163, B-164, B-165, B-171, B-182, B-189, B-191, B-196.

---

#### 3.4 Code Gating

##### Current Shape

"Is this connection live (not code)" has five gates. **V·P** (B-35; A-36 and A-45 state the gate-2/gate-3 split and are merged here)

| Gate | Rule | Sites |
|---|---|---|
| 1. Tokenizer | Start-in-code (`tokens.ts:232`) plus inline-code overlap (`notOverlapping([...embeds, ...code])`, `:282`) | The draw and everything reading drawn tokens |
| 2. `linkInCode` | Rewrites gate 1 by hand: `inlineSpans(line).some(overlap)` plus `inFenceAt` (`edits.ts:324-331`) | `commitAliasOnEnter` (`linkEdit.ts:61`), `slotNear` (`:106`), `inAliasAt` (`edits.ts:335`) |
| 3. Caret `inCodeAt` | Caret position only | `autocompleteQuery` (`autocomplete.ts:50`), `headingHash` (`headingHash.ts:21`), `literalAt` (`pasteLink.ts:42-46`) |
| 4. Line-alone `tokenize` | No fence context | `readFormatState` (`formatState.ts:16`), `toggleInline`/`toggleWrap` (`format.ts:86,123`) |
| 5. Host `linksIn` | Masks the start only (`scan.ts:83`) | Index and rename |

- **Gate 2 Is a Link Gestures Leftover:** The outcome matches gate 1 with a second spelling; it landed after the scouts ran. **V** (A-45)
- **`codeMask` and `inCodeAt` Don't Diverge:** `codeMask` (`Engine/markdownCode.ts:199`) masks through `fenceSpans` (`:100,118`); `inCodeAt` (`Engine/docScan.ts:350-355`) reads `scan.fences`, built by `scanFencedCode` (`docScan.ts:66`) over `fenceSpans` (`detect.ts:89`). **V** (A-125)
- **`linkTyping` Has No Gate,** harmlessly (*§3.3*). (A-36, B-36)

##### Defects

- **Half-in-Code Connections Act Live (V·P):** For `` x `[[A`]] y `` with the caret before `]]`, `tokenize` yields only `inlineCode`, while `autocompleteQuery` returns `{ form: 'link', query: "A`" }` and `headingHash` converts `§` to `#`. (B-35)
- **Fenced Connections Format (V·P):** For a `[[A]]` line inside a fence, `readFormatState` returns `connection: true` and `toggleInline(..., 'connection')` unwraps it to `A`. (B-35)

##### Options

- **B-127 (Preferred, *§3.3*):** Gates 2 and 3 (for closed links) become calls to the tokenizer's pass; gate 4 can read the same pass with fence context (±0 lines). **User-Visible:** the picker, Enter-commit, slot collapse, alias memory, and `]` refusal stand down on any connection the draw renders as code, including the half-in-code cases; the format menu stops reporting Connection or Link inside a fence, and its toggle stops unwrapping there.
- **S4-A With `linkInCode` Taking Spans (Fallback):** Gate 2 stays a second spelling; gate 3 stays for `autocompleteQuery` and `headingHash` unless they switch to `linkInCode` too.
- **Gate 3 for Unclosed Openers Is Unavoidable:** An unclosed opener is no token, so the opener reader's callers keep a caret-position `inCodeAt` (*§3.12*). (B-120)
- **Gate 5:** The host masks the start only, while the tokenizer also drops overlap; S1-C's shared occurrence reader (*§3.1*) is the one option that aligns them. No defect is shown for it.

##### Traps

- `isInsideWikilink` is code-blind on purpose (B-182); `chunksOver` gives no chunk for a fenced line (B-165).

##### Would Go False

- `Editor-Internals.md:12` and `MarkdownPM.md:21` ("suppressed inside code") are **already false** for gates 3 and 4. (B-35)

##### Source IDs

A-36, A-45, A-125, B-35, B-36, B-120.

---

#### 3.5 Resolution and Status

##### Current Shape

- **One Builder:** `buildPageIndex` is called only in `pageIndexOf` (`Nexus/treeIndex.ts:270-274`). Raw `.resolve` readers include `Matrix/matrixInput.ts:58` and `Session/pageConnections.ts:30`. **V** (A-04)
- **Two Front Doors, Two Type Spines:** `ConnectionsApi.resolve` (the `PageIndex` spread, `pageConnections.ts:30`) feeds `titleTarget` → `MdTarget`. `resolveConnection` (`treeIndex.ts:284-288`, doc `:283`) collapses ambiguous to null and serves `LinkCell.tsx:75`, `connectionMenuActions.ts:90`, and `linkResolve.ts:8`. Both read `pageIndexOf` (`treeIndex.ts:270`). The editor spine is `Token → MdTarget`; the Link-value spine is `LinkTarget → ConnPage | null`. The ambiguity-null is correct for the commit gate and drift for display and click. **V** (B-27)
- **Five Hand Adapters Read "Resolved Page or Null":** `resolveConnection` (`treeIndex.ts:284-288`), `titleTarget` (`connectionsApi.ts:58-59`), `aliasRows` (`autocomplete.ts:180-182`), `headingTargetOf` (`headingTarget.ts:15-16`), `rememberAliasNear` (`linkEdit.ts:86-88`), each re-reading `resolve()` and keeping `resolved` + `page`. `ConnectionCell` and `linkValueMenuTarget` sit on `resolveConnection`. Any "one resolver" approach should cover all five. **V** (A-19; S1 said four)
- **`resolveConnection` Is the Only Resolver That Discards Ambiguity** (`treeIndex.ts:284-288`); its doc (`:283`) says it exists for the value side and binds it to the Link cell's drawing. **V** (A-76, B-72)
- **The Resolution Half Sits in the Editor:** `MdTarget`, `titleTarget`, and `resolveMdTarget` (`connectionsApi.ts:46-68`) import only `PageIndex`, `targetTitle`/`targetFragment`, and `isValidLink`; `tokenTarget` (`:70-74`) is the only part needing Engine tokens. So Properties re-derives resolution through `resolveConnection`. **V** (A-74)
- **`LinkStatus` Is Derived Twice, Genuinely:** From `ConnResolution.status` (`pageIndex.ts:36-38`, read raw by `claimedEmbeds` callers) and from `MdTarget` (`linkStatus`, `connectionsApi.ts:131-134`); the first runs before an `MdTarget` exists. **V** (B-48)
- **`resolveMdTarget` Is Exported for Tests:** One production caller (`connectionsApi.ts:71`), 11 test references (`mdLinkTarget.test.tsx`). **V** (B-82)
- **The Held `[[#Heading]]` Rule Is Written Three Ways:** `heldTarget` (`linkClicks.ts:89-92`); `LinkCell` hand-copies it (`LinkCell.tsx:75`: `target.title ? resolveConnection(...) : (holder ?? null)`); `linkValueMenuTarget` has no held arm (`connectionMenuActions.ts:89-91`), so `resolveConnection(tree, '')` → `resolve('')` → `{ status: 'phantom' }` (**V·P**; `buildPageIndex` never stores an empty key, `pageIndex.ts:26`) → null, and the menu falls back to `cellMenuModel({ kind: 'link' })` (`PropertyPanel.tsx:344-346`, `CardValue.tsx:114-120`, `TableView.tsx:287-293`). A Text value's bare heading gets a menu through `heldTarget` (`cellStatic.tsx:411`). **V·P** (A-18 and B-53 state the same fact; merged)
- **An Optional Resolver With No Optional Caller:** `resolve?` in `linkValue.ts:48,85`; the only production caller always passes it (`parseEditorValue.ts:36-40`). **V** (A-55)
- **No Host Resolver:** `git grep resolve -- Core/Index` finds none; `Relation.target` is a normalized title resolved at read time (`Core/Platform/stores.ts:11`); F-114 (`Pommora Codebase Audit.md:1267`): `pageIndexOf` imports UIX `.tsx` modules, so main can't import it. **V** (B-140)

##### Defects

- **A Bare `[[#Setup]]` Link Value Follows but Has No Page Menu.** (A-18, B-53)
- **Ambiguity Collapses to "Nothing" on the Value Side:** A Link value naming an ambiguous title draws no ambiguous tone and opens nothing, where a body connection draws `md-connection-ambiguous` (*§3.6*, *§3.10*). (B-27, B-51)

##### Options

- **Move the Pure Resolution Half Into `Core/Connections` (±0):** S1-B moves `MdTarget`/`titleTarget`/`resolveMdTarget` into Connections; S8 §6.3(2) names the file `Core/Connections/target.ts`. Properties (`LinkCell`, the value menu, `parseEditorValue`) then resolves through it. **⚖ Compatible with B-185/B-186/B-187's "can't move":** those traps cover `ConnectionsApi` (imports UIX `TrailSegment`, `connectionsApi.ts:13,43`; Connections runs on the host), `ConnMenuTarget` (`pasteAsMenu.ts` imports Connections, and menu types live in `Actions/`), and `tokenTarget` (`tokens.ts:14` is the Engine → Connections edge). The pure half imports nothing renderer-side (A-99), and Connections is already engine-reached (`scan.ts`, `rewrite.ts`), so it can move while those stay. `heldTarget` takes `OwnPage` (`MarkdownPM/api.ts`) and stays in `Links/` unless `OwnPage`'s `held` arm is expressed as `ConnPage | null`. **Cost:** import churn ≈ 6 files. (A-99, B-124)
- **S2-C: Delete `linkResolve.ts` (−8) and `resolveConnection` (−6), ≈ −14:** `linkValueFromEdit` takes a required `PageIndex` (dropping `ResolveTitle`, `linkValue.ts:9`, −1), and `parseEditorValue.ts:39` passes `previewConnections()` (+1), read live at the gesture, which satisfies `linkResolve.ts:1`'s concern. The two `resolve?` become required. It holds only after `LinkCell.tsx:75` and `connectionMenuActions.ts:90` stop calling `resolveConnection` (S2-A + S2-B, or S1-B's `titleTarget` switch). **⚖ With B-153:** `resolveConnection`'s ambiguity-null **is** the Link property's commit gate (`treeIndex.ts:283-288` → `linkResolve.ts:8` → `parseEditorValue.ts:5,39` → `named` returning null, `linkValue.ts:49-52`). The deletion holds only if the reader's resolve step refuses `status !== 'resolved'` explicitly; otherwise an ambiguous `[[Dup]]` starts committing. **C** (A-104)
- **One Adapter for All Five Readers (Uncosted):** If `titleTarget` (or its moved form) is the one "resolved page or null" adapter, `aliasRows`, `headingTargetOf`, and `rememberAliasNear` call it instead of re-reading `resolve()`. No scout costed it; likely ≈ −3 to −6. (A-19)
- **The Held Arm:** S2-B builds the value menu as `linkMenuTarget(heldTarget(titleTarget(api, …), own), …)`, which gives `[[#H]]` its page rows (*§3.10*); S1-B's `titleTarget` switch fixes it too.
- **S8 §6.2:** Drop `export` from `ConnResolution` (`pageIndex.ts:11`) and `LinkSyntax` (`scan.ts:59`), which have no outside reader (0 lines). (B-123)

##### Traps

- **The Commit Gate:** Replace `resolveConnection`'s display and menu uses only; the commit keeps refusing ambiguity. (B-153)
- **The Lazy Alphabetical Sort Is Load-Bearing** (`pageIndex.ts:31-32`). (A-130)
- **`MdTarget.invalid.ambiguous` Isn't Redundant With `LinkStatus`:** read after resolution at `linkClicks.ts:67` and `connectionsApi.ts:133`. (B-188)
- **`holder` Is Undefined for Spaces** (`valueContext.ts:18-20`), so a held fallback must tolerate it. (A-135)
- `ConnectionsApi`, `ConnMenuTarget`, and `tokenTarget` can't move into `Core/Connections` (above). (B-185, B-186, B-187)

##### Would Go False

- Comments: `treeIndex.ts:283`, `linkResolve.ts:1` (S2-C). (A-115)
- `ConnectionsPM.md:16` ("the content index in main") is **already false**. (B-140)
- Tests: `connectionMenuActions.test.ts:104`; `mdLinkTarget.test.tsx` (11 refs) if `resolveMdTarget` stops being exported. (A-116, B-82)

##### Source IDs

A-04, A-18, A-19, A-55, A-74, A-76, A-104 (resolver half), A-130, A-135, B-27, B-48, B-53, B-72, B-82, B-140, B-153, B-185, B-186, B-187, B-188.

---
#### 3.6 Drawing and Looks

##### Current Shape

- **Two Renderers Decide One Link Look:** The CodeMirror draw (`decorations.ts`, markdown links `:557-588`, wikilinks `:589-664`) and the resting React renderer (`renderCellContent`, `cellStatic.tsx:55-179`) each decide it. **V** (B-37)
  - **Heading Join:** `decorations.ts:613-637` vs `cellStatic.tsx:94-124`, the same `showPage` and `resolved && !alias` rule; `headingLinkStyle` comes from settings (`:590`) in one and a prop in the other; `TextCell.tsx:60` passes neither it nor `around` (F-062, audit `:585`).
  - **Phantom:** The same classes, plus `md-unresolved-fixed` in the cell (`cellStatic.tsx:84-89`).
  - **Invalid Markdown Link:** The body keeps dimmed syntax (`decorations.ts:570-573,581`); the cell draws the label alone (`cellStatic.tsx:128-141`).
  - **Ambiguous:** A connection draws `md-connection-ambiguous`; a markdown link `md-link-invalid` (`mdLinkClass` `:96-97`).
  - **Title Span:** `tk.resolveRange ?? tk.contentRange` at `decorations.ts:594`, `cellStatic.tsx:78`, `connectionsApi.ts:72`, `linkEdit.ts:28` (*§3.3*). (B-50)
- **The Look Functions:** `wikiLinkView`/`WikiLinkView`/`linkStatus` (`connectionsApi.ts:114-148`) and `mdLinkClass` (`decorations.ts:82-99`). `cellStatic.tsx:10` imports `mdLinkClass` and `MD_LINK_CLASS` from the CodeMirror draw module, while `wikiLinkView` lives in `connectionsApi.ts`. **V** (B-66)
- **The Unresolved Look Has Two Class Pairs:** `markdown-pm.css:233-237` (`md-link-invalid` and `md-connection-phantom` share a rule), `:238-240` (underline on `md-link-invalid` only), `:241-244` (`md-unresolved-syntax` and `md-phantom-syntax` share a rule). The plain override (`:245-252`) resets `md-phantom-syntax` but not `md-unresolved-syntax`. **V** (B-38)
- **The Plain Setting Opts Out One Span at a Time:** `md-unresolved-fixed` is emitted only by `cellStatic.tsx:84,87,88,136`; `build` serves every scope (`surface.ts:47`) and never emits it; the override is `:root`-scoped (`markdown-pm.css:245-252`). **V** (B-60, B-78)
- **`blockQuery.ts:29-30` Borrows `md-phantom-syntax` and `md-connection-phantom`** for the `/query` text. **V** (B-61)
- **`MD_LINK_CLASS` Is the Only Link Class With a Constant** (`decorations.ts:80`); literals at `decorations.ts:91,97,570,581,620,631`, `linkClicks.ts:60,135`, `cellStatic.tsx:255`. Internal markdown links wear `md-connection-resolved` (`decorations.ts:91`). **V** (B-64, B-97)
- **"Is This Element a Link" Has Three Selectors:** `linkClicks.ts:60` (five classes), `:135` (two, `hoverGate`), and `cellStatic.tsx:255` (`LINK_SELECTOR`: `.md-link, .md-connection-resolved, [data-link-span]`). Every link span the resting renderer draws carries `data-link-span` (`cellStatic.tsx:105,138`), inner spans carry neither class, and `linkSpanAt` returns null without the attribute, so the class arms are dead and are the only reason `cellStatic` imports `MD_LINK_CLASS`. **V** (B-41)
- **Three Tokenizer Memos:** `drawnLast(tokenizeChunk)` (`decorations.ts:366`), `perText(tokenize, 4096)` (`cellStatic.tsx:52`), and none at the line-alone sites. React vs CodeMirror explains the first two. **V** (B-39, B-170)
- **Link Property Values Have Their Own Look** (*§3.10*). (A-28)

##### Defects

- **Ambiguous Markdown Links Draw as Invalid (V·P):** `resolveMdTarget(ix, 'Dup')` → `{ kind: 'invalid', ambiguous: true }`; `mdLinkClass` maps every `invalid` to `md-link-invalid` (`decorations.ts:96-97`), while a wikilink to the same title draws `md-connection-ambiguous` (`decorations.ts:653-660`, `cellStatic.tsx:101-102`). `linkClicks.ts:67` carries a wiki-only ambiguous exception for `hidesSyntax`. `ConnectionsPM.md:4` defines both syntaxes as one connection, so the difference doesn't earn itself. (B-62)
- **Plain Syntax Skips Markdown Links:** With **Display Unresolved Links As Plain Syntax** on, an invalid markdown link's `[`/`](…)` stay control-colored. **V** (B-38)
- **Plain-Unresolved Reaches the Live Cell and Live Text Pane but Not Their Resting Forms;** `ConnectionsPM.md:34` ("page prose only") is false for live cells and Text panes. **V** (B-60)
- **Plain-Unresolved Restyles the Slash Menu** (`blockQuery.ts:29-30`). **V** (B-61)
- **A Resting Text Value Draws Heading Links Without Its Page's Headings or Heading Link Style** (F-062). **V** (B-37)
- **An Invalid Markdown Link Shows Its Syntax in the Body but Not at Rest.** **V** (B-37)
- **The `md-link-invalid` Underline:** `[x](Missing)` is underlined; `[x](Present)` wears `md-connection-resolved` without one. Intended or not is Nathan's call. **V** (B-63)

##### Options

- **S6-B: One Look Rule, Two Media (≈ −29: TS −25, CSS −4):** Fold `wikiLinkView`, `linkStatus`, and `mdLinkClass` into one `linkLook(conn, text, tk, ownKeys, headingLinkStyle)` in `connectionsApi.ts`, returning `{ target, status, missing, bare, join: { showPage, heading } | null }`; both renderers draw from it, and `cellStatic` stops importing `decorations.ts`. One status vocabulary: an invalid markdown link reads `phantom`, or `ambiguous`; `md-link-invalid` merges into `md-connection-phantom` and `md-unresolved-syntax` into `md-phantom-syntax`; `linkClicks.ts:67`'s exception becomes `target.ambiguous`; `LINK_SELECTOR` becomes `[data-link-span]`; `MD_LINK_CLASS` is inlined as `'md-link'`. **Arithmetic (spans checked):** `WikiLinkView` `:114-118` (5) + `linkStatus` `:131-134` (4) + `wikiLinkView` `:136-148` (13) = 22, plus `mdLinkClass` `:82-99` = 18; 40 → ≈ 24 = −16; duplicated join −6; selector/constant/import −3; CSS `:233-244` −4. `headingMissing` stays. **User-Visible (each needs Nathan):** invalid markdown links lose the underline; ambiguous markdown links draw in the ambiguous tone; with the setting on, a markdown link's syntax goes plain; at rest an invalid markdown link keeps its syntax, matching phantom connections (+3 if adopted; the reverse is also coherent). **Add-On:** fixing F-062 in the same pass costs +3 (`TextCell` passes `ownKeys: holder && conn?.headingsOf?.(holder.path)` and reads `headingLinkStyle`), which makes the draw agree with the `heldTarget` its gestures use (`TextCell.tsx:27,41`). **Owns:** `LINK_SELECTOR` (S7-C and S8 count 0); S8 §6.2's `mdLinkClass` ambiguous arm (+1) is subsumed. **⚖ Class Names:** S8 §6.1 proposes the merged pair `md-link-unresolved`/`md-unresolved-syntax`; S6-B folds into `md-connection-phantom`/`md-phantom-syntax`. S6-B's survivors already carry the live sites (`decorations.ts:599,644,648`, `cellStatic.tsx:84,87,88`, `blockQuery.ts:29-30`, `blockMenuFlow.test.tsx:301,308`) and `md-link-unresolved` has none, so fewer hooks are renamed; S6-B's names hold unless Nathan wants the word "link" in the class. **V** (B-115, B-122)
- **S6-C, Setting Half: State "Page Prose Only" Once (≈ 0 to +3 With Its Other Half):** The scout's container rule `:root.plain-unresolved .mdpm-editor :is(...):not(.mdpm-tbl *)` is wrong: `TextPane.tsx:178` mounts its editor in `.mdpm-editor` too, so the live Text pane would go plain, and no `.mdpm-tbl` class exists (the wrapper is `.mdpm-tbl-wrap`, `MarkdownTable.tsx:501`). A correct rule needs a class only the page editor carries (e.g. on `MarkdownEditor.tsx:296`, +1 TS) plus `:not(.mdpm-tbl-wrap *)`. Deleting `md-unresolved-fixed` saves ≈ −1 to −4 (three of the four sites are class-string edits; only `cellStatic.tsx:136` and its `cx` collapse delete lines). Point `blockQuery.ts:29-30` at its own look or `md-control` so the setting stops reaching the slash menu. **Fixes:** B-60, B-61; makes `ConnectionsPM.md:34` true. Its `sectionRunsIn` half is in *§3.15*. **C** (B-116, B-78)
- **S8 §6.1 Class Pair Rename:** Yields to S6-B's names (above). (B-122)

##### Traps

- `data-link-span` is required: only the class arms of `LINK_SELECTOR` are dead, and both `linkSpanAt` callers pass cell event targets (`cellStatic.tsx:289,385,443`). (B-168)
- `drawnLast` stays: `codeHighlight.ts:186`, `codeScroll.ts:218` read it. (B-169)
- Two memos for React vs CodeMirror aren't drift. (B-170)
- `md-connection-heading` has no CSS but is a test hook; only `.md-connection-heading-missing` has a rule (`markdown-pm.css:291`). (B-172)
- The `conn` gate on connection drawing and the `'link'`-only lookup agree (`decorations.ts:589`, `linkClicks.ts:56`, `cellStatic.tsx:80`). (B-174)

##### Would Go False

- Tests: `externalLink.test.tsx:80`, `mdLinkTarget.test.tsx:158`, `blockMenuFlow.test.tsx:301,308`; `.md-connection-heading` hooks at `textScope.test.tsx:94,123,137` (S6 listed only `:94`; B-195 drops its completeness claim). Comment: `cellStatic.tsx:129`. The scout's citation of `audit.md:373` (F-037, "the differences … are deliberate") no longer exists at HEAD. (B-134, B-195)
- `ConnectionsPM.md:34` is **already false** (B-60, B-142).

##### Source IDs

A-28 (cross-ref), B-16, B-37, B-38, B-39, B-41, B-50, B-60, B-61, B-62, B-63, B-64, B-66, B-78, B-97 (class half), B-115, B-116 (setting half), B-122 (class row), B-134, B-142, B-168, B-169, B-170, B-172, B-174, B-195.

---

#### 3.7 Pointer Gestures and Targets

##### Current Shape

- **The Body Handler:** `linkPointer` (`linkClicks.ts:132`) on `pointerHandlers` (`Gestures/pointerPath.ts:30`; `onText`/`hidesSyntax` read only at `:50`). `linkUnder` (`:46`) hit-tests through `drawnLinkAt` and converts with `heldTarget` (`:58`); `followTarget` (`:75`) checks `glance.contains` (`:84`) and finds the page editor (`:81-82`); `resolveFollow` (`:95`) converts again with `heldTarget` (`:102`); `dwellTarget` (`:118`) spells the address gate as `WEB_ADDRESS.test(normalizeLinkUrl(x))` (`:128-129`); `sectionRunAt` (`:31-43`) reads `.md-section-run` from the DOM. **V** (B-03, B-22)
- **The Pointer's Own Lookup Is Legitimate:** `drawnTokens` (`decorations.ts:367,484`) holds the scope- and setting-filtered list (raw HTML in page scope, claimed embeds); scope is a closure parameter of `markdownDecorations`, not a facet. **V** (B-77)
- **`heldTarget` Runs at Four Sites:** `linkClicks.ts:58` (hit-test), `:102` (inside `resolveFollow`), `cellStatic.tsx:411`, `:430`. `linkGestures.linkAt` (`cellStatic.tsx:404-405`) returns the unconverted target, which is why `TextCell.tsx:41` relies on `resolveFollow` converting. **V** (B-46)
- **`menuAt` Re-derives What `cellLinkTarget` Derived:** `cellStatic.tsx:289-290` repeats the span/token lookup of `:443-444`, and `tokenTarget` runs again at `:458`. **V** (B-47)
- **The Resting Gestures:** `linkGestures` (`cellStatic.tsx:397-434`) and `cellLinkTarget` (`:436-446`, null without an api at `:442`). **V** (B-18, A-102)
- **Link Value Clicks** are in *§3.10*; **section runs and citations** in *§3.15*; **selectors** in *§3.6*.

##### Defects

None user-visible beyond those owned by *§3.9* and *§3.10*; the copies here are drift.

##### Options

- **S7-C: One Hit Shape From Hit-Test to Action (≈ 0 to −3):** `linkGestures(text, connections, glance, own, menuAt)` gives its `linkAt` the `own` it already receives and returns `{ el, tk, span, target: heldTarget(tokenTarget(…), own) }`, the resting twin of `LinkHit`. `readOnlyMenu` (`:411`) and `onPointerOver` (`:430`) drop their `heldTarget` (±0). `menuAt` reads `found.tk`/`found.span` (−2) and `menuTarget` takes the found target (`:458`, −1); under Side 1 (*§3.9*) `menuAt` is gone, so these don't count. `LINK_SELECTOR` → `[data-link-span]` (±0; owned by S6-B). **Net ≈ −3 under Side 2, ≈ 0 under Side 1.** No user-visible change: the body and the resting surface both convert at hit time, and a `TextCell` link value's three gestures read one target. **Depends:** S2-A for which `own` `LinkCell` threads. **V** (B-119)
- **S5-D3: `dwellTarget` Reads `isHttpLink` (±0):** Equivalent, because `resolveMdTarget`'s external arm already passed `isValidLink`; the armed URL still needs `normalizeLinkUrl`. Removes one spelling of the address gate (*§3.13*). **V** (B-112)
- **S8 §6.2:** The private `LinkHit` becomes `PointerLink` (file-local, 0); `cellStatic`'s `{ el, target }` becomes `Pick<PointerLink, 'target'> & { el }` only if Side 1 lands. (B-123)

##### Traps

- `resolveFollow`'s own `heldTarget` (`linkClicks.ts:102`) is load-bearing: it serves `TextCell.tsx:41` (unconverted `linkAt` result), the resting cell's `claimLink`, and `followCitation` (`citationPointer.ts:42`), which is mounted on every scope (`surface.ts:52`). Idempotent where the hit-test already converted. (B-154, B-119)
- `inert`'s no-op `open` and `glance.contains` are two rules for two surfaces: PageHistoryWindow's host is inert (`PageHistoryWindow.tsx:117-118`, no glance per `editorHost.tsx:111`); GlancePane's `PageTile` builds a non-inert host (`PageTile.tsx:90`), so `followTarget`'s `contains` check (`linkClicks.ts:84`) is what stops follows there. (B-155)
- `sectionRunAt` can't go through `drawnLinkAt`: no token holds a run. (B-159)
- `followTarget` and `resolveFollow` aren't mergeable: `TextCell` has no surrounding editor for `pageEditorAt` (`linkClicks.ts:81-82`). (B-180)
- Making `pointerHandlers`' `onText`/`hidesSyntax` optional changes no line count. (B-181)
- `cellLinkTarget` returns null without an api (`cellStatic.tsx:442`); `PropertyPanel` always supplies one (`:172`) and views read `previewConnections` (`Views/Host/useViewHost.ts:113`). (A-102, A-138)

##### Would Go False

- `cellStatic.tsx:396` doc (under Side 1). F-038's "stays true" note is moot: Link Gestures resolved F-038 and the reconcile deleted it. (B-131, B-136)

##### Source IDs

A-138, B-03, B-22, B-46, B-47, B-77, B-112, B-119, B-154, B-155, B-159, B-180, B-181.

---

#### 3.8 Menus and Their Actions

##### Current Shape

- **The Menu Target Is Built Four Ways:** `tokenMenuTarget` (body, live cell); `linkMenuTarget` through `linkGestures.readOnlyMenu` (`cellStatic.tsx:409-412`); `menuTarget` (`cellStatic.tsx:448-477`, editable resting cell); `linkValueMenuTarget` (`connectionMenuActions.ts:76-103`). `linkMenuTarget` is `tokenMenuTarget` with `tk` undefined (`connectionsApi.ts:102,111`). Builders 1-3 route through `ConnectionsApi.menu` (`pageConnections.ts:43`); builder 4 calls `showConnectionMenu` directly. **V** (B-28)
- **The Link Menu Is Fire-and-Forget Where Every Sibling Is a Promise:** Grip, table, and citation menus are promise-returning host members (`api.ts:175-179`) whose answer the editor applies (e.g. `citationPointer.ts:67-73`); `showConnectionMenu` returns `void` and runs closures (`connectionMenuActions.ts:19,33,59`). This protocol produces `apply`, `onCell`, `editable`, the url `apply` filter (`:98-100`), and `still()`. **V** (B-67, B-80)
- **"Editable" Is Stated Twice:** The consumer reads `(target.editable ?? true) && target.apply !== undefined` (`connectionMenuActions.ts:23`); producers set both in lockstep (`connectionsApi.ts:86` false with no apply; `:107` `edit !== undefined` beside `apply: edit?.wiki`; the url arm of `linkMenuTarget` `:90`, editable absent with apply passed; `connectionMenuActions.ts:84`, true with apply). `editable` never changes the outcome. **V** (B-29)
- **`ConnMenuTarget` Carries Arm-Inconsistent and Properties-Only Fields:** `editable` and `hasAlias` are required on the page arm and optional on the url arm (`connectionsApi.ts:25-26,32-33`); `surface`, `hideable`, `onCell` (`:17-19`) are set only by `linkValueMenuTarget` (`connectionMenuActions.ts:83-87`). `CardValue.tsx:123` is `cellMenuContextFor`'s own `hideable`, not a `ConnMenuTarget` field (CardValue passes `hideable` to `linkValueMenuTarget` at `:115`). `surface === 'cell'` ⇔ `onCell !== undefined`. **C** (B-70)
- **The Url Arm's `hasAlias` Is Never Read:** set by `linkValueMenuTarget`'s shared `base` (`:85`), passed into the context (`:30`), read only by `connectionMenuModel`'s non-external label (`connectionMenu.ts:84`). **V** (B-71)
- **`LinkCellAction` Exists Only to Narrow `apply`:** `connectionMenuActions.ts:74`, used at `:78`, narrowed at `:98-100`. A-78 ("the `apply` filter is a type adapter") is the same fact; merged. **V** (B-81, A-78)
- **Two Appliers Split by Syntax:** `applyLinkAction` (`linkEdit.ts:38`, wikilink) and `applyUrlLinkAction` (`linkFormat.ts:55-86`, markdown link, which may name a page); `linkFormat.ts` is named for one of its seven actions. The markdown-link Rename/Edit Link caret rule is written twice (`linkFormat.ts:64-66`, `cellStatic.tsx:469-470`). **V** (B-42, B-100)
- **A Markdown Link Naming a Page Gets a Read-Only Menu in an Editable Editor:** `tokenMenuTarget` gives authoring only to `wikiLink` + page (`connectionsApi.ts:102`); everything else falls to `linkMenuTarget`'s `editable: false` (`:86`), pinned as intended by `cellLinks.test.tsx:317-320`. It's the one link kind without authoring. **V** (B-57)
- **The Resting Cell Menu and the Value Menus** are in *§3.9* and *§3.10*.

##### Defects

- B-57 (a markdown link naming a page can't be renamed, retargeted, or removed from its menu) is pinned as intended; whether it earns itself is Nathan's call (*§7*). `ConnectionsPM.md:43` describes it as uniform. (B-57, B-143)
- B-55 and B-56 (resting cell) and B-68 (Link value ghost) are in *§3.9* and *§3.10*.

##### Options

- **S7-A: The Link Menu Answers, the Caller Applies (≈ −22 to −29):** `showConnectionMenu(target): Promise<ConnUrlAction | ConnCellAction | null>`; the host runs open, site, and copy rows itself and returns authoring or value actions, the protocol `menus.citation` uses. **Arithmetic:** `ConnMenuTarget` drops `apply` ×2, `onCell`, per-arm `editable` ×2, the dead url `hasAlias`, and gains `editable: boolean` once (−5); `linkMenuTarget` drops `apply`, `tokenMenuTarget`'s `edit` object becomes `editable` (−2); in `connectionMenuActions.ts` the comment and `editable` AND (`:20-23`, −1), the url `.then` chain (`:33-40`, −3), the page `switch` (`:61-70`) becomes a narrowing return (−8; `popMenu` resolves the whole `ConnMenuAction` union, `connectionMenu.ts:50-56`, and `runPageAction` takes a string, `pageMenuActions.ts:32-35`, so the predicates stay), and `linkValueMenuTarget` drops `apply`, `onCell`, and the url filter (`:97-100`, −6) = −18; `linkClicks.ts:139-154` → `() => void menu(target).then((a) => a && apply(view, a, hit.range))` (−6, −7 with one applier); callers `TableView.tsx:288-290` and `CardValue.tsx:115-117` await `holdGhost` (+1 each), `PropertyPanel.tsx:345` `.then(run)` (±0) = +2. Scout total −29. **Corrections:** (1) the value callers' `runMenuIntent` takes `CellMenuAction` (`TableView.tsx:282`, `CardValue.tsx:98`, `PropertyPanel.tsx:341`), and the promise union includes `format:*`/`link:remove`/`link:delete`, so the narrowing reappears at the callers or as a cell-surface return type (+2 to +4); (2) the resting cell's `linkGestures.onContextMenu` calls `api.menu(target)` synchronously and returns `true` (`cellStatic.tsx:417-427`); under Side 1 nothing is applied at rest, under Side 2 it needs a `.then` (±0 to +2). **User-Visible:** the create-ghost stays suppressed while a Link value's menu is open (fixes B-68). **Owns:** the `editable` fold (S5-B and S8 §6.2 count 0). **Overlaps** S2-B on `linkValueMenuTarget` (≈ 6 lines; count once). **C** (B-117)
- **Fold `linkMenuTarget` Into `tokenMenuTarget` (≈ −5):** Counted inside S5-B (*§3.9*). (B-107)
- **S7-B Applier Merge (≈ −10):** The two body appliers merge into one `applyLinkAction(view, action, range)` in `linkEdit.ts`, dispatching on `drawnLinkAt(view, range[0])`'s kind; `linkFormat.ts` is deleted: one prelude (−3), duplicated imports (`EditorView`, `drawnLinkAt`, `docString`, `focusRange`, `editorHost`, −5), the cross-reference comment `linkFormat.ts:54` (−1), one import in `linkClicks.ts` (−1). S8 §6.1/§6.3(4) names the merged home `linkActions.ts`, with `commitAliasOnEnter`/`aliasOnLeave`/slot reading in `aliasSlots.ts`. Valid on both sides of the resting-cell ruling. **V** (B-118, B-124)
- **S8:** `ConnMenuTarget` → `LinkMenuTarget` inside these rewrites (12 production refs / 3 files); `LinkCellAction` −1; `hasAlias?` required on both arms (±0). Don't rename `ConnectionsApi` standalone (145 refs / 53 files). (B-122, B-123)

##### Traps

- The link menu can't join F-096's `menus.pop` (audit `:1037`): its rows read session state (`connectionMenuActions.ts:45-57`). (B-183)
- The editable value-action closures stay with the parents, with `holdGhost`/`hideable` (*§3.10*). (A-136)

##### Would Go False

- S7-A: `connectionMenuActions.test.ts:16,33,45,66,75,82` (5 `ConnMenuTarget` refs), `linkEdit.test.tsx:65,80,95,124`, `linkFormat.test.tsx:78,92`, `linkEdges.test.tsx:432`, `cellLinks.test.tsx:305,319`; comments `connectionsApi.ts:15`, `connectionMenuActions.ts:20`. (B-135, B-138)
- `ConnectionsPM.md:38` (B-53) and `:43` (B-57) are **already false**. (B-143)

##### Source IDs

A-78, A-136, B-09, B-28, B-29, B-42, B-57, B-67, B-70, B-71, B-80, B-81, B-100 (applier names), B-117, B-118 (applier merge), B-135, B-138, B-143, B-183.

---

#### 3.9 The Resting Table Cell

##### Current Shape

- **The Editable Resting Menu Is Self-Induced Machinery:** `menuAt` (`cellStatic.tsx:288-306`), `menuTarget` (`:448-477`), `still()` (`:293-298`), `onSelect` → `initialSelect` across `MarkdownTable.tsx` (`:153,420,435,459,468-474`) and `CellEditor.tsx` (`:109,122,248,257-258`), and the pure exports `wikiAuthorTarget` (`linkEdit.ts:21-36`, doc: "Pure of any editor, because a connection in a resting table cell has none") and `linkActionText` (`linkFormat.ts:19-43`). The need comes from authoring on a surface with no editor (`Editor-Internals.md:17`). Wiki authoring already enters the cell (`onSelect` after an optional pipe commit, `:462-464`); for an address only Remove, Delete, and Format write in place (`:471-474`). **V** (B-73, B-18)
- **The `live` Ref Is Not Part of It:** `claimCheckbox` reads `live.current` (`cellStatic.tsx:332`) to toggle a checkbox against the text the cell holds now. **R** (B-128, B-175; S5's −2 dropped, B-192)
- **The Cell's Url Arm Is a Half Copy of Announce-and-Fetch:** `menuTarget`'s url arm commits `linkActionText(...).insert` through `onCommit` and calls `host.linkTitles.resolve(url)` with **no** `awaitTitle` tracker (`cellStatic.tsx:466-474`); the body tracks it through `awaitTitle` (`linkFormat.ts:81-83`) and `pendingTitles` (`pendingTitle.ts:20-41`). **V** (A-33, B-30)
- **The Resting Cell Offers Editor-Only Actions:** `showConnectionMenu` defaults `surface` to `'editor'` (`connectionMenuActions.ts:22`), so a resting cell's address offers Format ▸ Page Title. **V** (B-55)

##### Defects

- **F-043: Format ▸ Page Title at Rest Never Swaps the Title In:** When uncached, the arm writes `[domain](url)` with `wantsTitle` true (`linkFormat.ts:45-52`, `linkValue.ts:132-143`) and nothing tracks the span. **⚖** A-58 tagged this NEW; it is F-043 (`Pommora Codebase Audit.md:357`: "writes the bare domain and never swaps the page title in"), which B-30/B-55/B-107 already treat as known. The probe is kept as confirmation. **P** (A-58, B-30, B-55)
- **Read-Only Embedded Pages Offer Link Authoring at Rest (New):** The body withholds authoring when `view.state.readOnly` (`linkClicks.ts:146`), but `StaticCellImpl` hands `menuAt` to `linkGestures` unconditionally (`cellStatic.tsx:307-313`), and `menuAt` always builds the editable `menuTarget` (`:288-306`, `:458-476`); `readOnly()` is consulted only after the menu opened (`:355`). A resting embedded page is read-only (`PageTile.tsx:182`, `readOnly={!editing}`) and holds the preview bundle with a `menu` (`TileHost.tsx:102`), so its cells offer Add Title / Edit Link / Rename / Remove Link / Delete / Format. Remove/Delete/Format commit through `onCommit` → `widget.tsx:238-240` `view.dispatch`, which `MarkdownEditor.tsx:139`'s `changeFilter` drops; Rename/Edit Link call `onSelect` (`MarkdownTable.tsx:468-474`), which mounts a `CellEditor` with no read-only guard (`onActivate` checks `readOnly()`, `onSelect` doesn't). `ConnectionsPM.md:49` is false here. **P** (B-56)
- **Pending Title Swaps Die With the Cell Editor:** `sweepOnTitles` unsubscribes in `destroy` (`pendingTitle.ts:43,68-70`); timeout 6,000 ms. Any F-043 fix that carries `awaitTitle` into the cell inherits it. **P** (B-158)

##### Options

- **Side 1 = S5-B + S7-B: Authoring Lives Where an Editor Lives (≈ −93 to −103 With S7-A Owning `editable`):** A resting cell's right-click gives the read-only menu (Open, Preview, Copy); authoring is offered once the cell is live, through `linkPointer`. **Re-measured (B-107):** `cellStatic.tsx` `menuAt` `:288-306` (−19), `menuTarget` + doc `:448-477` (−30), `onSelect` prop and type `:273,:283` (−2), the `linkGestures` call `:307-313` collapsing (−5), its `menuAt` parameter `:402` (−1), imports `linkActionText` `:33`, `wikiAuthorTarget` `:34`, and the `linkAddress`/`tokenMenuTarget`/`Token` members (≈ −5) = ≈ −62; `MarkdownTable.tsx` `:153,:420,:435,:459,:468-474` (−11); `CellEditor.tsx` `:109,:122,:257-258` (−4; `:248` is an edit); inlining `linkActionText`/`LinkActionText`/`formatted` (≈ −8, estimate; owner S3-2 when taken, *§3.11*); inlining `wikiAuthorTarget` (≈ −5); folding `linkMenuTarget` into `tokenMenuTarget` (≈ −5); dropping `editable` (≈ −5, owner S7-A). Standalone ≈ −100 gross → **−88 to −98** after Biome; **−83 to −93** with S7-A owning `editable`; plus the S7-B applier merge (−10) → **−93 to −103**. S5's −85 to −95 landed inside the range by coincidence (it counted `live` −2 and missed the `menuAt` parameter and the `Token` import). **Fixes:** F-043 at its cause (no write-time action runs off-editor) and B-56 by construction (no authoring builder exists at rest). **User-Visible:** right-clicking a link in a resting, editable cell shows only Open, Preview, Copy; to rename, retarget, or reformat, click into the cell first, as a resting Text value already behaves. **Needs Nathan's ruling.** **C** (B-107, B-118, B-128)
- **Side 2: Authoring Kept at Rest (≈ −32):** One pure `linkAuthorEdit(text, tk, action, titles): { change?: TextEdit; select?: [number, number]; titleUrl?: string }` replaces `wikiAuthorTarget` + `linkActionText` + `formatted` + `LinkActionText` (54 lines → ≈ 38, −16); the applier merge (−10); the cell's two closures become one (−6). **F-043 stays;** its clean fixes are B′ or withholding Format ▸ Page Title at rest; announcing `awaitTitle` into the page editor is a trap (below). B-56 also stays unless `menuAt` learns `readOnly()`. **V** (B-118)
- **B′: Activate, Then Re-Pop (≈ −60):** Right-click activates the cell and re-pops `linkPointer`'s menu in the live editor; deletes `menuTarget`, `wikiAuthorTarget`, `linkActionText`, but adds an activate-then-menu handoff across a mount (async seat, then a synthetic `contextmenu`). Costed as stated; not recommended (agreed by both). **V** (B-108)
- **The Difference Nathan Is Ruling On:** ≈ 65 lines plus F-043 and B-56.

##### Traps

- **`live` survives Side 1** (above). (B-175)
- **Announcing `awaitTitle` Into the Page Editor From a Resting Cell Writes an Unescaped `|`:** `sweepOnTitles` writes `linkMarkdown(...)` (`pendingTitle.ts:59`), and `serializeLink`'s `escapeAlias` escapes only `\` and `]` (`links.ts:19-21`), so a title holding `|` splits the row; the audit's deferred F-043 fix budgets the `cellToSource` escape (+4). (B-176, a reasoned path)
- Every paste write must stay tagged `input.paste` (`CellEditor.tsx:154-163`). (A-119)
- `tableConnections` is read inside the widget's React render (`widget.tsx:345`). (B-190)

##### Would Go False

- Side 1: `cellLinks.test.tsx`'s whole `describe('a link's menu in a resting cell')` (`:154-269`, including `:194`, `:201`, `:247`) and `:303-315`; no test calls `linkActionText` or `wikiAuthorTarget` directly (grep: 0). Docs and comments: `linkEdit.ts:21`, `linkFormat.ts:54`, `cellStatic.tsx:396`, `Editor-Internals.md:17` (true now; Side 1 narrows its menu half), `ConnectionsPM.md:42-49` (add the resting cell to the read-only clause), F-043 (`Pommora Codebase Audit.md:357`, not `audit.md:437`). (B-131, B-136, B-152)
- `ConnectionsPM.md:49` is **already false** (B-56); its omission of Copy Path is an abbreviation (the table at `:44` lists it), not the falsehood. (B-144)

##### Source IDs

A-33 (cell arm), A-58, A-119 (cross-ref), B-18, B-30 (half copy), B-55, B-56, B-73, B-107, B-108, B-118, B-128, B-131, B-136, B-144, B-152, B-158, B-175, B-176, B-190 (cross-ref), B-192.

---
#### 3.10 Link Property Values

##### Current Shape

- **Mounting:** `Cell.tsx:131-137` mounts `LinkCell` without `ctx.connections`; `:139-141` mounts `TextCell` with it. `LinkCell` (`LinkCell.tsx`, 97) holds a URL half and `ConnectionCell` (`:64-97`, 34 lines), which predates the shared stack; `TextCell` proves that stack runs on a resting value (`TextCell.tsx:28-41,60`). **V** (B-10, A-51, A-77)
- **A Page Link Opens Through Two Routes:** `ConnectionCell` calls `useSession.select` directly (`LinkCell.tsx:73-74,87-90`) with `{ newTab: isCmd(e), heading }`. Every other page link goes through `pageConnections.ts:37-42`, which honors **Open Connections In Preview** and window mode: the window side pane passes `useConnections('window')` (`WindowTabBody.tsx:160,215`) → `hostConnections` → `ctx.connections` (`PropertyPanel.tsx:164-175`), and `connectionsOf` routes `'window'` and Open-in-Preview to `openWindowTab` (`pageConnections.ts:17-19,37-39`). GlancePane mounts no `PropertyPanel` (mounts: `Contexts/SpaceMenu.tsx:103`, `WindowTabBody.tsx:215`, `Pages/PageMenu.tsx:92`), so S2's glance inference is now verified. `ConnectionsPM.md:34` states the routing rule for "a connection" with no exception. **V** (A-23 and B-26 state the same fact; merged; A-149)
- **The Display:** `ConnectionCell` shows `target.alias ?? (target.title || '#' + heading)` (`LinkCell.tsx:76,93`), while `renderCellContent` draws the page § heading (`cellStatic.tsx:55-110`); `linkDisplayText` mirrors the cell (`linkValue.ts:112-113`) and returns `''` for `[[#H]]`. **V** (A-24)
- **The Look:** `.cell-link`, `.cell-link-underline`, `.cell-connection` (`UIX/Table/table.css:252-262`; `.cell-connection` sets `cursor: pointer` itself, `:261`) and an inline `solidColorCss` (`LinkCell.tsx:46-47`); one `.cell-connection` color whatever the resolution; no invalid tone. Color and underline earn themselves; the missing invalid tone is drift. `ConnectionCell` and `.cell-connection` break the app's `md-connection-*` class family (*§3.18*). **V** (A-28, B-51, A-95)
- **No Glance:** `LinkCell` has no pointer handlers (`ConnectionsPM.md:73` names it). **V** (A-25, B-51)
- **A URL Value Has Two Openers on One Click:** The anchor's `onClick` opens any non-empty url and stops propagation (`LinkCell.tsx:51-56`); a padding click reaches `valueClickIntent` → `urlClickTarget`, gated on `isValidLink` (`valueClick.ts:47-52`, `linkValue.ts:64-68`). The `open` intent has exactly one producer (`valueClick.ts:50`) and three handlers (`PropertyPanel.tsx:301`, `CardValue.tsx:94`, `TableView.tsx:155`). The host's `link:open` refuses invalid input (`Web/handlers.ts:39-40`); the app path `openWebLink` → `openBrowser` has no gate (`openWebLink.ts:9`, `windowSlice.ts:247`). `valueClickIntent`'s link arm is asymmetric: a page returns `null`, a url returns `open` (`valueClick.ts:21,47-52`). The double opener is what spawns `urlClickTarget`, `open`, and three handlers. **V** (A-26, A-53, A-75)
- **The Value Menu Is Wired at the Parent Three Times:** `PropertyPanel.tsx:333-347`, `CardValue.tsx:108-121`, `TableView.tsx:282-293`. Card passes `hideable=true` (`CardValue.tsx:115`); Card and Table wrap the menu in `holdGhost` (`CardValue.tsx:117`, `TableView.tsx:290`); the Panel does neither. It offers Rename/Add Title/Edit Title, Edit Link, Clear, and Hide (`connectionMenu.ts:75-87`). **V** (A-52)
- **Sort and Filter:** Text values sort and filter on raw markdown (`filter.ts:144-146`, `sort.ts:58-59`); link values use `linkDisplayText` (`filter.ts:147-149`, `sort.ts:60-62`). Intent unknown. **V** (A-56)
- **The Held Rule and the Resolver** are in *§3.5*; the **title hook** in *§3.13*.

##### Defects

- **Routing:** A Text value's `[[Page]]` opens in the window's tab strip (or Preview), a Link value's in main content. **V** (A-23, B-26)
- **A Link Value's Plain Click Overrides Tab Open Behavior (New):** `ConnectionCell` passes `newTab: isCmd(e)` (`LinkCell.tsx:89`), so a plain click passes `false`; `select` reads `opts?.newTab ?? settingOf(..., 'tabOpenBehavior') === 'newtab'` (`Core/Session/navigationSlice.ts:540-541`), so the explicit `false` wins. Every other page opener passes no option on a plain click (`pageConnections.ts:39`; `useViewInteractions.tsx:369-370`, whose comment states the rule). With Tab Open Behavior set to new tab, a Link value opens in the current tab while a body or Text-value connection opens a new one. **V** (B-52)
- **A Connection Value Hides Its Heading** (`Alpha` instead of `Alpha § Setup`; `#Setup` instead of `§Setup`). **V** (A-24)
- **One Color for Resolved, Phantom, and Ambiguous; No Glance.** **V** (A-25, A-28, B-51)
- **A Bare `[[#Setup]]` Link Value Follows but Has No Page Menu** (*§3.5*). **V·P** (A-18, B-53)
- **The Link Property Refuses `[[#Heading]]` Though Its Cell Draws It:** `linkValueFromEdit('[[#H]]')` → `undefined` (ran); `LinkCell.tsx:75-76` draws and opens it through `holder`. **V** (A-62)
- **An Invalid URL Value's Text Opens Something:** The anchor opens any non-empty url; with Open Links In Pommora on, does an invalid value open a browser window? `WebWindow.tsx:17-48` loads `summon.url` without validating; B-54 read the attach gate (`webGuests.ts:18,150-157`), which refuses anything without a written `http(s)://`, so the feared outcome is a blank in-app window. **P** (A-26, A-27; merged probe with B-54 in *§8*)
- **The Create-Ghost Stops Being Held While a Link Value's Menu Is Open:** `suppressWrap` increments `menusOpen`, awaits `menu()`, decrements in `finally` (`UIX/Interactions/ghostCreate.ts:144-153`); `showConnectionMenu` resolves at once, so `blocked()` (`:49`) stops suppressing while the native menu is still up; sibling cell menus await the real `popMenu` (`TableView.tsx:302`, `CardValue.tsx:128`). Two view sites are affected (S7 said three; PropertyPanel has no create-ghost and its `popMenu`, `:346`, isn't wrapped either). **P** (B-68, wording corrected)

##### Options

- **S2-A: A Link Value Naming a Page Rides `TextCell` (≈ −38 Including CSS; ≈ −33 TS):** **Deletes:** `ConnectionCell` (`LinkCell.tsx:64-97`, −34), the page branch and its imports (`isCmd`, `resolveConnection`, the `LinkTarget` type, ≈ −5), `.cell-connection` (`table.css:258-262`, −5 CSS). **Adds:** the page kind renders `<TextCell text={showFullLink ? unaliased : raw} connections={connections} holder={holder} />` (+3; `unaliased = connectionText(title, undefined, heading)` keeps `TableView.tsx:680`'s alias popover), `Cell.tsx:131-137` passes `ctx.connections` (+1), and +2 for a menu decline if taken without S2-B. **User-Visible:** window and Preview routing, Tab Open Behavior honored, phantom and ambiguous tones, `Alpha § Setup`/`§Setup`, heading-missing marking, glancing. **Stress 1:** `TextCell`'s `linkGestures` without `menuAt` opens the **read-only** page menu (`cellStatic.tsx:409-412,415-424`) and calls `stopPropagation`, pre-empting the parent's editable value menu; S2-A requires S2-B, or the +2 decline. **Stress 2 (P):** `TextCell`'s layout (`cell-text-host`/`clip`/`line`, `TextCell.tsx:47-63`) differs from `OverScroll className="cell-text-scroll"`; probe truncation and ellipsis parity. **Stress 3:** `cellLinkTarget` returns null without an api; every mount supplies one (*§3.7*). **Inherits** `TextCell`'s F-062 gap; fixing F-062 once in `TextCell` serves both values. **Owns** the `ConnectionCell` lines (S5-A shrinks to its API half; S1-B's `titleTarget` piece counts 0). **Rules:** none broken. **C** (A-102, A-147, B-106)
- **S2-B: The Value Menu Lives With the Value (≈ −12 to −14):** **Deletes:** the three parent `if (t === 'link')` blocks (`TableView.tsx:287-293`, `CardValue.tsx:114-121`, `PropertyPanel.tsx:339-347`'s link half, ≈ −20) and `linkValueMenuTarget`'s own resolve and `apply` filter (`connectionMenuActions.ts:81-102` → ≈ 10 lines built as `linkMenuTarget(heldTarget(titleTarget(api, …), own), …)` spread with the cell fields, ≈ −12), which also gives `[[#H]]` its page rows. **Adds:** one `onLinkAction`-shaped prop through `Cell` (+2), passed by the three surfaces (+9), plus the `menuAt` handed to `linkGestures` (+3). Scout −18. **Correction:** `holdGhost` (Card, Table), `hideable` (Card), and the generic-menu fallback when no link target exists (`PropertyPanel.tsx:346` and Card/Table's generic paths) must move or be threaded; the fallback works only if the value's `onContextMenu` returns false and lets the event bubble, which `linkGestures` already does (`cellStatic.tsx:419-420`). **Net ≈ −12 to −14.** **Behavior:** unchanged except `[[#H]]` gains its menu. **Overlaps:** S1-B's and S7-A's `linkValueMenuTarget` lines (count once). **⚖ With B-68:** S2-B threads `holdGhost`, but the wrap only works once the menu is a real promise, which is S7-A. **C** (A-103, A-146)
- **⚖ S2-B vs Side 1 (Conflict Neither Brief Raised):** S2-B hands a `menuAt` to `linkGestures` so a resting Link value keeps today's value menu (Rename, Edit Link, Clear, Hide); Side 1 (*§3.9*) deletes `linkGestures`' `menuAt` parameter (`cellStatic.tsx:402`, −1) under the rule "authoring lives where an editor lives." Taken together, the parameter survives (+1 back on Side 1), and a resting Link value offers authoring rows while a resting Text value and a resting table cell offer read-only link menus. The value rows open the value's own editor (`runMenuIntent`) rather than writing text, which may justify the difference; Nathan decides whether it's one rule or an odd-one-out (*§7*).
- **S2-C: One Reader per Concern (≈ −28 to −30 After Re-Measure):** **`useLinkTitle`** (*§3.13*, ≈ −2 to −4 measured, not −6); **one URL opener** (−3): the anchor's `onClick` becomes `preventDefault` only, the click bubbles to `valueClickIntent`'s `open`, invalid addresses edit instead of opening, and `linkDisplayText`/the anchor render only valid URLs with the `md-link-invalid` look (+1); **`urlClickTarget`** (`linkValue.ts:64-68`, −6) → `valueClick.ts:47-52` reads `readLink` once and checks `isValidLink` (+1), net −5; **`linkAlias`** (`linkValue.ts:77-79`, −4; sole caller `PropertyValueInput.tsx:56`); **`linkResolve.ts` + `resolveConnection`** (−14, *§3.5*, with the commit-gate condition). Keep the `open` intent and drop the anchor's opener (A-139). **User-Visible:** only the invalid-address click changes (ties to the A-27/B-54 probe). **C** (A-104, A-139, B-111)
- **S5-A's `ConnectionCell` Half (Only if S2-A Isn't Taken, ≈ −1):** `ConnectionCell` takes `connections` (passed at `Cell.tsx:131` as `TextCell` does) and follows through `resolveFollow(titleTarget(api, title, heading), own, api, e, openWebLink)`, dropping `select`, `tree`, `resolveConnection`, and `isCmd` (−4 +3). Fixes routing and B-52. The `href={page?.path}` goes with `resolveConnection`; nothing visible depends on it. The API half is in *§3.13*. **V** (B-106)
- **S3-3: `[[#H]]` Commits (+2):** `linkValueFromEdit` admits `[[#H]]` through the one reader with a holder-aware resolver, matching what `LinkCell` draws. **V** (A-62, A-108)
- **S2-D** is rejected in *§3.1*.

##### Traps

- `linkDisplayText`'s no-format raw URL is deliberate: sort and filter rely on it (`linkValue.ts:109`). (A-134)
- `holder` is undefined for Spaces (`valueContext.ts:18-20`). (A-135)
- The editable value-action closures stay with the parents, plus `holdGhost`/`hideable` (A-103). (A-136)
- `showFullLink` must be preserved (`TableView.tsx:680`). (A-137)
- Views read `previewConnections` (`Views/Host/useViewHost.ts:113`). (A-138)
- A bare URL isn't a token, so `LinkCell`'s URL half stays (*§3.1*). (A-132)
- The ambiguity-null commit gate (*§3.5*). (B-153)

##### Would Go False

- `ConnectionsPM.md:73`'s limitation goes under S2-A; it is also incomplete today (omits the preview/window routing and Tab Open Behavior). `ConnectionsPM.md:34` becomes true for Link values. `PropertiesPM.md:118` doesn't name the parent menu route; S2's "verify on edit" resolves to no change. `PropertiesPM.md:83` ("a click that opens the page") is literally true; S8's claim is dropped. (A-114, B-130, B-145, B-193)
- Comments: `LinkCell.tsx:15` (S2-A), `valueClick.ts:21` (S2-C). (A-115)
- Tests: `LinkCell.test.tsx:26-37` (`.cell-connection` and the mocked `select`; with no `newTab`, `:37` changes too); `linkValue.test.ts:120,133,159,170`. (A-116, B-130)

##### Source IDs

A-23, A-24, A-25, A-26, A-27, A-28, A-51, A-52, A-53, A-56, A-62, A-75, A-77, A-95 (cross-ref), A-102, A-103, A-104 (value half), A-134, A-136, A-137, A-139, A-146, A-147, A-149, A-152 (cross-ref), B-10, B-26, B-51, B-52, B-68, B-106 (`ConnectionCell` half), B-130, B-145, B-193.

---

#### 3.11 Paste, Paste As, and Copy

##### Current Shape

- **One Mount:** `pasteLink` is mounted once in `inlineSurface` (`surface.ts:53`) for page, cell, and Text alike; `pasteDecision.ts`'s only reader is `linkFor` (`pasteLink.ts:17-39`), so its "serves both editors" header is stale. **V** (A-05)
- **One Paste Classifies Twice; Paste As Reads the Clipboard Twice:** `linkFor` calls `pastedUrl` (`pasteLink.ts:21`), then `decidePaste` calls it again (`pasteDecision.ts:30`); `trimmedRange` runs in both `linkFor` (`:32`) and `writeLink` (`:51`). For Paste As, main reads the clipboard (`Desktop/Actions/editorMenu.ts:103-105`), then the renderer reads it again and re-classifies (`pasteLink.ts:88,101`), because the menu reply is a bare action string (`Menus/menu.ts:72-73`). **V** (A-32, A-80)
- **`pasteDecision` Is a Subset of `pasteAsWrite`:** The bare-caret arm `linkPaste(target, format, title)` (`pasteDecision.ts:46`) equals `pasteAsWrite({ kind: 'url', url }, format, title)` (`pasteAsMenu.ts:121`). `PasteInput`, `LITERAL`, and `PasteDecision` (`pasteDecision.ts:7-18`) exist only to keep `decidePaste` pure. `TextPaste`/`LinePaste`/`LinkPaste.kind` exist only to discriminate; `wholeWikiLink` duplicates `parseConnectionText`. **V** (A-79, A-80)
- **Title-Pending Writes: Two Shapes, Three Writers:** Shapes `LinkPaste` (`linkValue.ts:124-129`) and `LinkActionText` (`linkFormat.ts:13-17`), with `formatted()` (`:45-52`) only renaming fields. Writers: `writeLink` (`pasteLink.ts:49-63`: `awaitTitle` `:58` + `linkTitles.resolve` `:62`), `applyUrlLinkAction` (`linkFormat.ts:55-86`, announce-and-fetch `:81-85`), and the resting cell's url arm (`cellStatic.tsx:466-474`, fetch without announce, *§3.9*). **V** (A-33 and B-30/B-31 state the same facts; merged)
- **The Address Gate Is Spelled Six Ways:** `isValidLink`; `isHttpLink` (`Core/Paths/urlPath.ts:20`); `WEB_ADDRESS.test(normalizeLinkUrl(x))` (`dwellTarget`, `linkClicks.ts:128-129`); `WEB_ADDRESS.test(x) && isHttpLink(x)` (`Desktop/Web/webGuests.ts:18`); `WEB_ADDRESS.test(x) && isValidLink(x)` (`loneWebpageEmbed`, `detect.ts:414`, and `pastedUrl`, `pasteDecision.ts:25-26`); `WEB_ADDRESS.test(url)` alone (`embeddableTarget`, `pasteAsMenu.ts:70`). `dwellTarget`'s spelling is `isHttpLink` restated (its input already passed `isValidLink` in `resolveMdTarget`); `webGuests.ts:18` is equivalent in effect (a raw `WEB_ADDRESS` match leaves normalization a no-op and excludes mailto); the written-scheme variants are genuine. `pastedUrl` requires a scheme (`pasteDecision.ts:21-27`), deliberately; its `/\s/` repeats `isValidLink`'s (`urlPath.ts:26`). **C** (B-34 corrects S5's count of four; A-30, A-31, A-151 merged)
- **Normalization Differs:** Paste As writes the URL raw (`pasteAsMenu.ts:118,121`); the Link property normalizes (`linkValue.ts:61,94`), and so does Insert Link (`Menus/menu.ts:52`). **V** (A-30)
- **Three Plain-Paste Commands:** `pasteAs 'literal'` (`pasteLink.ts:92-95`), ⌘⇧V (`:123-135`), and Paste As ▸ Plain Text (`pasteAsMenu.ts:118`); Plain Text turns `[Home](url)` into the url (pinned by `pasteAsMenu.test.ts:101`). `PASTE_PLAIN_ACTION = 'paste:plain'` dispatches `pasteAs(view, 'literal')` (*§3.18*). **V** (A-35)
- **Copy Link:** Page Copy Link is written twice, through `dialer` (`pageMenuActions.ts:51-52`) and through `host.clipboard` (`gripMenu.ts:91-92`); the split is forced by layering. Address Copy Link drops the alias and doesn't normalize (`connectionMenuActions.ts:37`), so a schemeless copy fails plain ⌘V (defensible, since `pastedUrl` requires a scheme). **V** (A-34, A-63)
- **Paste As Rows:** Footnote is offered on any non-empty clipboard (`pasteAsMenu.ts:79`, minor). Page Title is offered for any `isValidLink` address (`URL_ROWS`, `pasteAsMenu.ts:59-62`; *§3.13* for what a failed fetch leaves). **V** (A-64, A-61)
- **Rectangle ⌘V Doesn't Format Links:** `MarkdownTable.tsx:243-252` writes `cellToSource(text)` with no link formatting. **V** (A-57, B-147)

##### Defects

- **`[x](#Heading)` Becomes an Empty Page Target (V·P):** `pasteAsTarget('[x](#Heading)')` → `{ kind: 'page', title: '' }`, offering Connection, Markdown Link, and Embedded Page, which write `[[]]`, `''`, and `![[]]`; `writePlain(view, '')` (`pasteLink.ts:77-83`) deletes the selection. Mechanism: `targetTitle` returns `''` for a fragment-only target (`links.ts:98`), `pasteAsMenu.ts:45` tests `!== null`, and `embeddableTitle('')` is true (`connections.ts:103-104`). A defect beyond F-042. (A-16)
- **Heading Copies Don't Round-Trip (V·P):** `pasteAsRows('[[T#H]]')` → `[]` (`wholeWikiLink` refuses a heading, `pasteAsMenu.ts:32`), while Copy Link from the page menu (`pageMenuActions.ts:51-52`) or the heading grip (`gripMenu.ts:91-92`) writes `[[T#H]]`. `pasteAsTarget('[x](example.com)')` → page `example.com`; Embedded Page needs a blank-line seat (`:83`). (A-17, B-149)
- **Paste As Drops a Copied Link's Alias and Heading** (F-042; *§3.1*). (A-13, A-14)
- **Pasting an Address Inside a Wikilink Nests a Markdown Link:** `literalAt` (`pasteLink.ts:42-47`) treats only code and markdown destinations as literal, so pasting `https://a.co` with the caret in `[[Foo|]]` reaches `decidePaste` → `linkPaste` and writes `[a.co](https://a.co)` into the alias, which `pageLinkPattern`'s alias can't hold (`connections.ts:8`), breaking the connection. The typing guard stands down inside a wikilink (`isInsideWikilink` in `isLiteralAt`, `edits.ts:642`). **P** (A-59)
- **Dropping an Address Isn't Formatted:** The only drop handler is `dropMargin` (`decorations.ts:760-766`); CodeMirror's default inserts raw text. **P** (A-60, inferred from CM6 defaults)
- **Rectangle ⌘V Leaves Addresses Raw** (A-57, B-147).
- **Paste As Writes Schemeless Addresses Raw** where every other writer normalizes (A-30).

##### Options

- **S3-1: One Link Reader (≈ −15):** Owned in *§3.1*; it fixes A-16, A-17, and F-042's alias/heading loss.
- **S3-2: One Paste Pipeline (≈ −40 to −50 Beyond S3-1; Ledger −45):** Plain paste, the inverse chord, Paste Without Formatting, and Paste As become one decision: `pasteAsWrite(target, how, ctx)` in `pasteAsMenu.ts`, where `how` is `PasteAsForm | 'auto' | 'inverse'` (union + switch), absorbs `decidePaste`'s selection-wrap and inverse axes; `pasteDecision.ts` is deleted. `linkFor` and the bodies of `pasteAs` and `keydown` collapse into one `paste(view, text, how): boolean`, called synchronously by the `paste` event (it must claim the event on the decision alone) and after the IPC read by the chord and the menu. One `writeLinkAt(view, from, to, link, userEvent)` in `pendingTitle.ts` beside `awaitTitle` serves `pasteLink.ts` and `applyUrlLinkAction`; `LinkActionText`/`formatted()` give way to `LinkPaste`. Paste As ▸ Plain Text is removed (Paste Without Formatting sits under it, and its one distinct behavior has no other request behind it), with one word ("literal" or "plain") throughout. One `isWebAddress` in `urlPath.ts` replaces the `WEB_ADDRESS && isValidLink` copies (for `ImagePicker`/`adoptFile` only if the localhost trap is accepted). **Scout Arithmetic:** deleted `pasteDecision.ts` (−47), `pasteLink.ts` ≈ −20 (`linkFor` 23 plus duplicated read/guard/title code, partly re-added; ±15), `linkFormat.ts` `LinkActionText` (5) + `formatted` (8) + dispatch block (≈ 10) = −23, Plain Text row and arm (−3), `webGuests.ts:17-18` (−2), S3-1 (−15) = −110; added wrap/inverse arms (+14), `writeLinkAt` (+14), `isWebAddress` (+2) = +30; net ≈ −80. **Corrections (A-107):** `linkFormat.ts`'s −23 is ≈ −12 while `cellStatic.tsx:33,471-474` consumes `linkActionText`'s `{ insert, url, wantsTitle }` with no view (a view-based `writeLinkAt` can't serve it); the Plain Text removal is a product change; `pasteLink.ts`'s removable code is `linkFor` (`:17-39`) minus a re-added `paste()` body. **Corrected Net:** ≈ −55 to −65 including S3-1. **⚖ With Side 1:** Side 1 deletes the view-less consumer, so `linkFormat.ts`'s full −23 applies and S5-B's ≈ −8 fold counts 0 (B-129); against adding A's −12 and B's −8, that's a further ≈ −3. **Seams:** `pasteAsMenu.ts` stays pure and main-importable, so Desktop still builds rows; rule-safe. **User-Visible:** S3-1's changes, plus Paste As loses Plain Text; otherwise identical outputs. **Depends:** `linkFormat.ts`, `pendingTitle.ts`. **C** (A-107, A-145)
- **S3-3: Rectangle and Copy-Side Fixes (+3 Net, Each Skippable):** rectangle ⌘V routes a single-line non-table text through `pasteAsWrite(…, 'auto')` with settings and the title cache read from `host` (`MarkdownTable.tsx:245` already has `host`) (+3); `composeWebpageEmbedLine` once (−2, *§3.2*); `[[#H]]` commits (+2, *§3.10*). Makes `MarkdownPM.md:33` true. **V** (A-108)
- **S8:** `LinkPaste.target` → `url` (4 sites, ±0); `linkPaste`/`linkMarkdown`/`LinkPaste` move out of `linkValue.ts` into the paste model under `Actions/` (importable from main; ≈ 7 files of churn, *§3.20*). (B-123, B-124)
- **Uncosted Fixes for Open Defects:** A-59 (`literalAt` adopts the wikilink-interior rule, ideally the one "literal here" predicate, *§3.3*); A-60 (a drop handler routing an address through the paste decision); A-30's normalization arrives with S3-1. No scout costed these.

##### Traps

- **Main Must Read the Clipboard and Build Paste As Rows:** `askEditorMenu` parks until Chromium's `context-menu` (`Desktop/Actions/editorMenu.ts:25-31,43-50`), and rows read `clipboard.readText()` in that turn (`:103-105`). The `clipboard:read` channel stays for ⌘⇧V (`pasteLink.ts:128`), Paste Without Formatting (`:88` via `menu.ts:68-69`), and rectangle ⌘V (`MarkdownTable.tsx:245`). (A-117)
- **The Two Clipboard Doors Are Forced by Layering:** the editor imports no `Platform/dialer`. (A-118)
- **Every Paste Write Stays Tagged `input.paste`:** `CellEditor.tsx:154-163`, `tableGuard.ts:26-28`, and `pasteMargin` (`decorations.ts:753-759`) depend on it; a shared `writeLinkAt` takes `userEvent` from its caller, because Format ▸ isn't a paste. (A-119)
- **Async and Read-Only Re-Checks Survive Any Merge:** `isConnected`/`readOnly` at `pasteLink.ts:19,90,126,130`, the null `clipboardData` path at `:114`, and `writeLine`'s `embedSeatAt` re-check at `:67`. (A-120)
- **Keep the Strict Paste Test:** unify only the spelling; don't move `ImagePicker`/`adoptFile` to the composite, because `isValidLink` needs a dotted host (`urlPath.ts:32`). (A-121)
- **`pasteAsWrite`'s Null Arms Are Mostly Type-Forced** (`pasteAsMenu.ts:105-106,116,120`). (A-122)
- **`pendingTitle`'s Exact-Text Match** (`pendingTitle.ts:33`) must survive. (B-157)

##### Would Go False

- `MarkdownPM.md:107` ("a copied connection … offers Connection, Markdown Link, and Embedded Page") is **already false** for headed connections, and S3-2 drops Plain Text. `MarkdownPM.md:33` ("pasted anywhere in the editor") is **already false**; S3-3 makes it true. (A-114, B-147, B-149)
- Comments: `pasteDecision.ts:1,20`, `linkValue.ts:131,136`, `linkFormat.ts:80`. (A-115)
- Tests: `pasteAsMenu.test.ts:42-43,51,70,100-101,131` (Plain Text), `pasteLink.test.tsx:212`, `pasteDecision.test.ts` (132 lines). (A-116)

##### Source IDs

A-05, A-16, A-17, A-30, A-31, A-32, A-33, A-34, A-35, A-57, A-59, A-60, A-61 (row half), A-63, A-64, A-79, A-80, A-107, A-108, A-117, A-118, A-119, A-120, A-121, A-122, A-145, A-151, B-30, B-31, B-34, B-147, B-149, B-157.

---

#### 3.12 The Picker

##### Current Shape

- **Three Mounts:** `MarkdownEditor.tsx:298`, `Tables/CellEditor.tsx:288`, `Properties/Pickers/TextPane.tsx:180` (other `AutocompletePane` mounts only in `aliasPicker.test.tsx:97,193`). **V** (A-06)
- **The Openers Disagree:** `autoPair` returns null with Pair Brackets off (`edits.ts:353`). `[[` needs a closed link (`linkAt`; `pageLinkPattern` requires `]]`, `connections.ts:8`); `[label](` needs a closing `)` (`markdownDestinationAt` through `emptyTolerantLinkRegex`, `links.ts:16-17,46-56`). Only the `![[` loop feeds the picker unclosed input (`autocomplete.ts:119-134`). `[[]]` is refused because `linkSpans` rejects an empty page with no heading (`connections.ts:30`), pinned by `autocomplete.test.ts:25-26`. With Pair Brackets off, only `![[` obeys Nathan's ruling. **C** (A-38 and B-69 state the same fact; merged)
- **Nathan's Ruling (10-09):** `[[`, `![[`, and `[label](` each open the picker whether or not Pair Brackets is on; Enter or a pick completes it, writing the closer; dismissing leaves the typed text. (rulings.md)
- **Three Partial Unclosed Readers Exist, None Feeding the Picker for `[[`/`[label](`:** the `![[` loop (yields spans, commits to line end or the closer, `autocomplete.ts:120-133`); `linkDestinationStart`'s fallback (`links.ts:62-64`, `head.lastIndexOf('](')` with no `)` after; read by `headingHash`, `inUrlRun`, `literalAt`, not `autocompleteQuery`); `isInsideWikilink` (unclosed `[[` depth, no spans, `edits.ts:612-627`). **V** (A-112)
- **The Embed-Pairing Comment Is False:** `autocomplete.ts:119` says "`[` doesn't auto-pair after `!`"; with Pair Brackets on, the first `[` after `!` is refused (`edits.ts:374`, `isPairEdge('!')` false), and the second `[` takes the multi branch (`:357-369`: `opensEmpty` false, `glued` false for `!`, `openDoubles` 0), writing `[]]` → `![[|]]`. **V** (A-71, B-137)
- **Heading Lists Come From Two Sources:** the picker uses `warmBody`/`fetchBody` → `headingOutline` (`headingTarget.ts:20-27`, `editorHost.tsx:139-143`); missing-heading drawing uses `conn.headingsOf` → `s.headings[path]` (`pageConnections.ts:31`, `decorations.ts:459`). The lag mismatch is inferred. **V/I** (A-41)
- **The Heading Tree Is Derived Twice:** `openHeadingRows` (`autocomplete.ts:159-171`) and the pane's `nested()` with fake `OutlineHeading`s `{ from: 0, key, text, level }` (`AutocompletePane.tsx:184`), while the hook holds real outlines (`useConnectionAutocomplete.ts:103`). **V** (A-42)
- **State Lives in React; Its Sibling's in CodeMirror:** `ac` `useState`, the `armed` ref (never mapped through changes; `sectionArmAfter` returns positions without `mapPos`, `:251-273`), `measured`, `sameQuery`, `formRef` plus its effect (`useConnectionAutocomplete.ts:46-83,242-248`); `blockQuery` is a `StateField` (`Menus/blockQuery.ts:32-54`) and `useBlockMenu` compares field identity (`useBlockMenu.ts:21-30`). **V** (A-65)
- **Self-Machinery:** the `measured`/`sameQuery`/`formRef`/unmapped-`armed` cluster; the commit's re-parse of the worn alias (`useConnectionAutocomplete.ts:166-169`); `connectionInsert` (`autocomplete.ts:214-222`, sole production caller `commitEdit:263`); `cameFrom` vs `viaChevron`; the fake-outline reshape; the `fetched` reset in an effect (`:107-115`, a stale frame is possible, **P**-grade); `AcQuery` (`autocomplete.ts:30`), dead; seven optional pane props with defaults plus `NONE` (`AutocompletePane.tsx:35-45,63-69`), while production always spreads the full `ac.pane` (`useConnectionAutocomplete.ts:224-238`). **V** (A-82)
- **Arming:** `sectionArmAfter`'s `inBracket` check (`useConnectionAutocomplete.ts:268`) is redundant with `autocompleteQuery`'s (`autocomplete.ts:61`, pinned by `autocomplete.test.ts:389`); its code check isn't (the query checks the caret, not the `§`). A typed `§` arms the list; `##`→`§` doesn't (`sectionArmAfter` needs `input.type`, `:255`; `sectionSign` is applied via `apply` → `applyEdit` with userEvent `'input'`, `markdownInput.ts:56,262`, `applyEdit.ts:26`). **V** (A-43, A-66)
- **Slides:** the alias slide reads the `cameFrom` ref written during render (`AutocompletePane.tsx:81-87,90`); the heading slide uses `viaChevron` state (`useConnectionAutocomplete.ts:85,182`). **V** (A-67)
- **Other Odd-Ones-Out:** alias rows carry a closure (`autocomplete.ts:35,192`); `headingRows` applies `expressibleHeading` to the `fragment` form too (`:151`); `commitAliasOnEnter` is page-only (*§3.3*). **V** (A-70)

##### Defects

- **The Ruling Isn't Implemented:** With Pair Brackets off, `[[Foo` and `[label](foo` open no picker. (A-38, B-69, A-112)
- **Chevron and ArrowRight Disagree on an Empty Markdown Target:** the chevron is drawn on every `link`/`target` page row (`AutocompletePane.tsx:83,127`); ArrowRight requires `query !== ''` for `target` (`useConnectionAutocomplete.ts:203`); `lookup('')` lists pages for `target`, since only `link` empties (`:146`). **V** (A-68)
- **`openAlias` and `aliasRows` Key the Page Differently:** `openAlias` uses `target?.pageId` (`useConnectionAutocomplete.ts:170-176`); `aliasRows` needs `title` and returns `[]` for `''` (`autocomplete.ts:179`), so for `[[#H` in a held (Text value) pane the pipe opens over an empty list. **I** (A-69)
- **`armed` Drifts** when text shifts before the `§` on its line (unmapped). **V** (A-65, A-110)
- **`##`→`§` Doesn't Arm the List** (intent unknown). **V** (A-66)

##### Options

- **S7-D: One Opener Rule for `[[`, `![[`, `[label](` (≈ 0 to −11; Ledger −5):** The implementation of Nathan's ruling. One `openLinkAt(line, rel): { opener: '[[' | '![[' | '](', start, closed: boolean } | null` in `Connections/connections.ts` reads back from the caret to an opener with no closer between, delegates `](` to `linkDestinationStart` (`links.ts:59`), notes whether a closer follows, and ends the query at the caret (≈ +12). `isInsideWikilink` (`edits.ts:611-627`, 17 lines, one caller `:642`) becomes `openLinkAt(…) !== null` (−16). The embed loop (`autocomplete.ts:118-134`, −17) gives way to one opener branch serving all three openers when unclosed or empty (+7), with commit writing the closer when `closed` is false (+3), net −7; the closed `link`/`heading`/`alias` arms stay for the slots; the `[[]]` refusal becomes an empty-query open. **Net:** +12 −16 −7 ≈ −11, the picker side an estimate (−11 to ±0). **User-Visible:** with Pair Brackets off, `[[` and `[label](` open the picker; with it on, `[[` opens on the brackets rather than the first title character; Enter or a pick writes `]]`/`)` when absent; Escape leaves the typed text. `autoPair` is unchanged. **Gate:** `openLinkAt` stays code-blind in Connections, so its callers keep a caret-position `inCodeAt` (unavoidable; an unclosed opener is no token). **Depends:** S4-A or B-127 for the closed slots, and S4-B for the query field. **⚖ A-112 vs B-120:** A-112 said the ruling adds lines no estimate covers; it couldn't see S7-D (scout 7 ran later), which costs it at 0 to −11. B-120 holds; A-112's caution survives only as "the picker-side figure is an estimate." **V** (B-120, A-112)
- **S4-B: The Picker Query as a `StateField` (≈ −18):** One `acQuery` field `{ q, armed }` arms on a typed `§` (or on `sectionSign`'s conversion, if wanted), maps `armed` with `tr.changes.mapPos`, clears on a `closeAcQuery` effect (Escape, blur, commit-to-finished), and keeps `q`'s identity when `sameQuery`; the hook measures geometry only when the field's identity changes, as `useBlockMenu` does. **Delete:** `armed` ref + comment (2), `measured` (1 + 3 uses), `formRef` + effect (6), `sectionArmAfter` (23), listener body (18) ≈ 53. **Add:** field ≈ 28 (with arm logic), listener ≈ 6, effect definition 1 ≈ 35. **Scope:** `autocompleteQuery` needs `allowEmbeds = scope === 'page'` and no facet carries `MarkdownScope` (`Facet.define` sites: `embedWidget.tsx:46`, `Tables/widget.tsx:56`, `api.ts:44,206`), so the field is defined per mount in the hook's `useState`; a scope facet (+3) earns itself only with F-098's `surfaces.ts`. **Stress:** unlike `blockQuery`, which nulls on selection-only transactions (`blockQuery.ts:36`), the picker must re-derive on selection moves, so the field's `update` runs `autocompleteQuery` on every selection transaction, the same cost as today's listener (`useConnectionAutocomplete.ts:61`), not a new high-frequency cost, but stated. The arm logic mostly moves; the real deletions are `measured`, `formRef` + effect, and the unmapped-`armed` bug. Folding `linkTyping` into the field (≈ −10) couples the draw's color rule to the picker; not counted. **User-Visible:** none intended; `armed` stops drifting. **V** (A-110)
- **S4-C: Commit and Phase Cleanup (≈ −32):** carry the worn `alias` on the `link`-form query and delete `pageLinkPattern().exec` + import (−6 +2); `formSyntax` `'link'` → `connectionText(value, alias)` (F-035, 0; owner S1-B); inline `connectionInsert` into `commitEdit` (−6, not −8, since inlining re-adds the `insert`/`caret` computation); one `behind: AcRow[] | null` replaces `viaChevron` + `cameFrom` (−7; **user-visible:** the alias list slides only when the picker opened the slot, not when the caret walks into a typed `|`); build the heading tree once in the hook, deleting `openHeadingRows` and the fake-outline reshape (≈ −8, estimate); fold `headingTarget.ts` into one `headingSource` beside the hook, keyed by `pageId` so `fetched` can't go stale (≈ −6, estimate); required pane props, `NONE` gone (−2); `AcQuery` (−1, F-069); `warmBody` reads `knownBody` (F-041). **Depends:** `aliasPicker.test.tsx` gains the props; `connectionCommit.test.tsx`/`autocomplete.test.ts` cases on `connectionInsert` re-point at `commitEdit`. **C** (A-111, A-160)
- **S4-A or B-127** supplies the closed-slot reader (*§3.3*).
- **The Heading-Index Lever (Unverified Scout Lever, S4 §6; Not in A.md):** If the index stored raw heading text and level (not only normalized keys, `indexSeed.ts:73`), the picker could read `conn.headingsOf` synchronously and delete `headingTarget.ts` (28), `warmBody`/`fetchBody` on the seam (`api.ts` 3, `editorHost.tsx` 5, harness 2), and the `fetched` state/effect (≈ 10), ≈ −45, at the cost of no longer offering a heading typed moments ago (the index lags saves). It conflicts with A-140's "normalized keys only" trap by design; the planner must verify it before use. Nathan's call (*§7*).
- **Uncosted Small Fixes:** A-68 (ArrowRight follows the chevron's rule, or the chevron hides on an empty target); A-43 (drop the arm-time `inBracket`, ≈ −1); A-69 (key `aliasRows` by `pageId`).

##### Traps

- Copying the embed branch verbatim for `[[` swallows the line: `autocomplete.ts:123-125` runs an unclosed query to `line.length`. (B-177)
- The opener rule can't stop pairing `[[`: `autoPair`'s doubled-marker branch (`edits.ts:356-362`). (B-178)
- `index:headings` stores normalized keys only (`indexSeed.ts:73`); tokens drop empty alias and fragment slots (`tokens.ts:235-236`); `backedTo`, `authored`/`typedInto`, `aliasEpoch`, and `sameQuery` earn themselves; `cold` stays after F-041 (`knownBody` exists, `pageDetailCache.ts`); alias memory has one writer and one forgetter. (A-140)
- `isInsideWikilink` is the nearest existing piece for the ruling (A-128, *§3.3*).
- **Dropped Idea:** S4's `leaveSlot` `setTimeout` → `transactionFilter` is self-declared unmeasured, and no mechanism shows a filter can append the collapse without altering undo grouping; the blur path still needs its handler. **D** (A-84, A-157)

##### Would Go False

- Comments: `autocomplete.ts:119` (**already false**), `autocomplete.ts:95` ("An in-progress link has an EMPTY target…", under S7-D), `autocomplete.ts:197` and `headingTarget.ts:9` (S4-C), `useConnectionAutocomplete.ts:47,71,78,189` (S4-B). (A-115, B-137)
- Tests: `autocomplete.test.ts:25-26` (S7-D) and `:389`; `aliasPicker.test.tsx:97,193`; `edits.test.ts:873-…` (`describe('isInsideWikilink')`, imported at `:5`). (A-116, B-137)
- `Guidelines/Editor-Internals.md:39` (a held pane's handlers) doesn't go false under S4-B; S4's claim is corrected. (A-114, A-154)

##### Source IDs

A-06, A-38, A-41, A-42, A-43, A-65, A-66, A-67, A-68, A-69, A-70, A-71, A-82, A-84, A-110, A-111, A-112, A-140, A-154, A-157, A-160, B-69, B-120, B-137, B-177, B-178.

---
#### 3.13 Opening and Titles

##### Current Shape

- **The Address Adjudicator:** `openWebLink` (`Core/Web/openWebLink.ts`, 11) decides in-app vs system for an address, with 8 click readers (*§2.4*); the menu's Preview and Open In Browser rows (`connectionMenuActions.ts:35-36`) and `WebWindow.tsx:85` bypass it by design. `Core/Web/` mixes host (`handlers.ts`) with window (`openWebLink.ts`, `WebGuest.tsx`), an F-090 instance. **V** (B-01, B-02, B-156)
- **The Page-Open Bundle:** `pageConnections.ts` builds `ConnectionsApi` in `preview`/`window`/`inert` modes: `open` (`:37-40`), `bypass` (`:41-42`), `menu` (`:43`), inert bundle (`:34`). `bypass` is optional only because the inert bundle omits it, and `openPage` (`connectionsApi.ts:150-158`) exists to fall back. `ConnectionsApi.open` also has a non-link reader, `TileHost.tsx:104` (`openRoute`, used `:238`, `:281`). **V** (B-08, B-74)
- **Two Page-Open Routes** (the Link value's raw `select`): *§3.10*. (B-26)
- **`EditorHost.openLink` Is an Earned Seam:** one production value (`editorHost.tsx:138`) plus the harness default (`Core/Testing/editorHarness.ts:24,122`); `openWebLink` imports `Session/store` (`openWebLink.ts:2`), which MarkdownPM must not. **V** (B-75, B-161)
- **The In-App Arm Receives Raw Addresses:** `resolveMdTarget('example.com')` → `{ kind: 'external', url: 'example.com' }` and `mailto:a@b.co` → external (probed); `openWebLink.ts:9` passes `url` raw to `openBrowser` (`windowSlice.ts:247`) → `WebGuest src={url}` (`WebWindow.tsx:94`), and the attach gate refuses anything without a written `http(s)://` (`webGuests.ts:18,150-157`). The system arm normalizes (`Web/handlers.ts:41`); the menu's Preview row makes the same raw call (`connectionMenuActions.ts:35`). **V** (mechanism; B-54)
- **The Display-Time Title Hook Is Written Twice:** `LinkCell.tsx:33-38` and `WebTile.tsx:21-30` (`useWebpageTitle`) repeat subscribe + resolve + effect over one store cache. They differ, correctly, in three ways: the predicate (`display === 'link-title' && !alias && isHttpLink(url)` vs `label === '' && display === 'link-title'`), the display source (property `link_display` vs device `defaultLinkFormat`, `WebTile.tsx:22`), and the subscription (WebTile's `linkTitles[url]` selector is unconditional, `:23`; LinkCell gates it on `wantsTitle`, `:34`). A shared `useLinkTitle(url, wants)` works because each caller computes `wants`. Both surfaces already share the store cache and `resolveLinkTitle`, so `WebviewPM.md:10` isn't false (S8's claim dropped). **C** (A-29, A-148, B-32, B-194)
- **Pending Titles:** `pendingTitle.ts` (74) holds `PendingTitle`/`pendingTitles`/`pendingTitle` (`:9`, `:20`, `:74`), exact-text survival (`:33`), and the sweep writing `linkMarkdown` (`:56-64`). **V** (B-05, B-89)
- **Page Title for Non-HTTP Addresses and Failed Fetches:** `linkPaste` sets `wantsTitle` with no http gate (`linkValue.ts:142`), while `fetchPageTitle` refuses non-http (`Desktop/Web/linkTitles.ts:9`). `resolveLinkTitle` records a failure in `failedTitles` and never sets a title (`cacheSlice.ts:23-35`); `sweepOnTitles` `continue`s on null (`pendingTitle.ts:56-57`), and the subscription never fires for a failure, so the pending entry lives until the text is edited. This holds for **any** failed fetch, not only mailto. **C** (A-61, A-156)

##### Defects

- **The In-App Browser Opens Unnormalized or Non-HTTP Addresses:** With **Open Links In Pommora** on, `[x](example.com)` and `[m](mailto:a@b.co)` in a page, and an invalid Link value's text (`foo`, or `[x](Some%20Page)`), reach `openBrowser` raw. *Expected:* an in-app window on `https://example.com`, mailto handed to the system, and an invalid value editing or doing nothing. *Feared:* a blank in-app window for each. **P** (B-54 and A-27 merged into one probe, *§8*)
- **Failed Title Fetches Strand a Pending Entry** until the text is edited, and Page Title is offered for addresses that can't fetch one. **V** (A-61)
- **Link Values Override Tab Open Behavior** (*§3.10*). (B-52)

##### Options

- **S5-A: One Page-Open Route (≈ −13; −14 Without S2-A):** `ConnectionsApi.open(page, heading?, newTab?)` replaces `open` plus `bypass`; `pageConnections.ts` does `if (inWindow && !newTab) openWindowTab(...) else void select(ref, { newTab: newTab || undefined, heading })`, keeping "no option means the tab preference decides" (`useViewInteractions.tsx:369`); `resolveFollow` calls `api.open(named.page, named.heading, isCmd(event))`. **Arithmetic:** `openPage` (`connectionsApi.ts:150-158`) −9, `bypass?` member (`:41`) −1, `bypass` impl (`pageConnections.ts:41-42`) −2, `openPage` import (`linkClicks.ts:8`) −1, `open` body ±0 = −13; the `ConnectionCell` half (−1) only without S2-A (*§3.10*). **User-Visible:** a Link property's `[[Page]]` honors Open Connections In Preview, ⌘-click, and Tab Open Behavior as a Text value's does (fixes B-52). An ambiguous Link value still opens nothing (unchanged). **Keeps** `TileHost.tsx:104,238,281` working through the optional parameter. **V** (B-106)
- **S5-D1: `openWebLink` Normalizes and Gates the In-App Arm (≈ +4 to +5):** `if (isHttpLink(url) && setting) s.openBrowser(normalizeLinkUrl(url)) else link:open`; normalize inside `openBrowser` (`windowSlice.ts:247`, ≈ +1) so the menu's raw Preview call is covered; gate `CONN_SITE_ROWS`' Preview on `isHttpLink`, which needs the pure model to learn the fact (`connectionMenuModel` receives a context with no URL, `connectionMenu.ts:11-19,92`), so a context flag is set in `showConnectionMenu` and read in the filter (≈ +3); the `openWebLink` gate (≈ +1). Not +2 as S5 said. A defect fix that earns its lines. **C** (B-110)
- **S2-C's `useLinkTitle` (≈ −2 to −4 Measured):** `LinkCell.tsx:34-38` (5 lines; the `wantsTitle` line `:33` stays) → 1; `WebTile.tsx:22-29` → 1-2; the hook ≈ 6-7. S2-C claimed −6 and S5-D2 −2 for the same lines; **owner S2-C, S5-D2 counts 0.** **⚖ Placement:** S2-C put the hook in `Core/Session/cacheSlice.ts`, and B-111 recorded that; A-104's correction holds: `cacheSlice.ts` imports no React (`:1-4`, read at HEAD: `Nexus/tree`, `treeStabilize`, `sessionState`, `Platform/dialer`), so a hook there is an odd-one-out. Home it beside `useConnections` in `Session/` or under `Core/Web/`. **C** (B-111, A-104, A-152)
- **S5-D3** (±0) is in *§3.7*.
- **S5-D4: Sweep-Side Resolve (+2, Not Recommended):** `sweepOnTitles` gains an `update(u)` that calls `linkTitles.resolve` for each `awaitTitle` effect, and `pasteLink.ts` and `applyUrlLinkAction` drop their resolve lines (−2 +4). With Side 1, only two writers remain and the pair is acceptable. **V** (B-113)
- **Uncosted Fix for A-61:** gate `wantsTitle` and the Page Title row on `isHttpLink`, and let the sweep settle an entry when its fetch fails (it would read `failedTitles`).

##### Traps

- The explicit browser picks bypass `openWebLink` by design (`connectionMenuActions.ts:35-36`, `WebWindow.tsx:85`). (B-156)
- `EditorHost.openLink` can't be replaced by importing `openWebLink` (`openWebLink.ts:2` imports `Session/store`). (B-161)
- `pendingTitle`'s exact-text match (`pendingTitle.ts:33`). (B-157)
- Pending swaps die with the cell editor (*§3.9*). (B-158)
- `inert`'s no-op `open` vs `glance.contains` (*§3.7*). (B-155)

##### Would Go False

- S5-A: `Core/Session/pageConnections.test.tsx:57` (`.bypass?.(page, 'Setup')`); `LinkCell.test.tsx:26-37` (spies `select`; without `newTab`, `:37` changes). `ConnectionsPM.md:34` becomes true for Link values. (B-130)
- `WebviewPM.md:20` ("every external link opens") is **already overstated**: the menu's Preview and Open In Browser bypass by design. (B-150)

##### Source IDs

A-27, A-29, A-61 (fetch half), A-148, A-152, A-156, B-01, B-02, B-05, B-08, B-26 (cross), B-32, B-54, B-74, B-75, B-89 (cross), B-106 (API half), B-110, B-111, B-113, B-130, B-150, B-156, B-157, B-161, B-194.

---

#### 3.14 Embeds

##### Current Shape

- **The Embed Grammar Has Three Readers:** `pageEmbedPattern` (`connections.ts:3-4`) excludes `#` from the page; `loneEmbedRe` (`Engine/detect.ts:400`, read through `loneEmbedTitle` `:402`) admits `#` in the title and is gated by `embeddableTitle` in `embedClaims.ts:7`; the picker's `![[` hand loop (`autocomplete.ts:119-134`). The lone-line reader could anchor `pageEmbedPattern`, as `WHOLE_LINK` does (`connections.ts:66`). **V** (A-11; anchor per *§2.3*)
- **The Embed Files:** `embedWidget.tsx` (717: `buildTiles` claim `:403-411`, `embedField` `:511`, `redrawNudge` `:526`, `embedTileRanges` `:647`), `embedClaims.ts` (25: `claimedEmbeds` `:11-25`), `embedInsert.ts` (61; read by `Menus/menu.ts:10` and `pasteLink.ts:11`). Webpage embeds: `loneWebpageEmbed` (`detect.ts:406-417`), `webpageEmbedUrlSpan` (`:419-423`), `blockEmbedLines` (`:426`). **V** (B-11, B-15 with its two-line correction)
- **The Embed Claim Is Computed Twice, Once on Every Caret Move:** `decorations.ts:474-483` runs `claimedEmbeds(scan.embeds, t => conn.resolve(t).status)` over every embed line in the document on each `build`, which reruns on `selectionSet` (`:842`), a hard-rule violation; `embedWidget.tsx:405-406` runs it again and resolves each claimed title a second time. This is the audit's F-054 (`Pommora Codebase Audit.md:501`). **V** (B-33)
- **`webpageEmbedUrlSpan` Re-Runs the Regex Its Guard Ran** (`detect.ts:419-423`). **V** (B-40)
- **Webpage Embed Spelling:** `composeWebpageEmbedLine` and the hand-written `![]()` (*§3.2*). (A-81)
- **Assets:** asset writers return `connectionText(...)` (*§3.2*); asset `[[name.ext]]` values aren't the link layer. (B-13, B-162)

##### Defects

- **Per-Caret-Move Document-Scale Work** (B-33; *§3.21*).
- **F-054:** In a table cell or a Text value, a page embed alone on its line shows as raw `![[…]]` text (audit `:501`).

##### Options

- **S5-C: The Embed Claim Has One Owner (≈ −4 to −7):** `build` filters `embed` tokens against `embedTileRanges(view.state)` and drops its `claimedEmbeds` call and its `conn` gate; `claimedEmbeds` takes `resolve` and returns `{ line, page }`, so `buildTiles` resolves once. **Arithmetic:** `build` block −10 +4 = −6; `claimedEmbeds` returns the page (+1); `buildTiles` drops the second resolve and its guard (−2) → ≈ −7 (the audit typed −4 for this half). **Verified Sequencing:** it is exactly the claim half of F-054's taken fix (`Pommora Codebase Audit.md:501-509`). `embedTileRanges(view.state)` holds page and webpage ranges, and a webpage range never holds an `embed` token, so no kind filter is needed. The field and the draw both rebuild on `redrawNudge` (`embedWidget.tsx:526`, `decorations.ts:845`), and `build` reads `view.state` after the transaction, so the draw can't read a stale claim. **User-Visible:** none on a page; in a live cell or TextPane (no tile field, `embedTileRanges` returns `[]`), the lone-line token stops being suppressed and draws the inert `md-embed` span, still unclickable, so F-054 stays open. **Planner Decision:** take F-054 whole (claim half plus the connection-look half, +16 "by the owner's ruling", ≈ +12 net), so a cell or Text value draws `![[P]]` as a connection, or the claim half alone (≈ −4 to −7) with the look half deferred. **V** (B-109)
- **`loneWebpageEmbed` Returns Its Span (≈ −2).** (B-40)
- **S1-C** anchors `loneEmbedTitle` on `pageEmbedPattern` (inside its −6, *§3.1*); **S7-D** replaces the picker's `![[` loop (*§3.12*); **S3-3** writes `composeWebpageEmbedLine` once (*§3.2*).

##### Traps

- `loneWebpageEmbed` requires a written scheme (`detect.ts:414`); the attach gate refuses a schemeless `src` (`webGuests.ts:18,150-157`). (B-160)
- Asset `[[name.ext]]` values aren't the link layer. (B-162)
- Keep the wikilink and embed patterns apart (*§3.1*). (A-123)

##### Would Go False

- `Editor-Internals.md:25` ("The embed claim has one owner") is **already false**; it becomes true only when the claim has one owner. `embedClaims.test.ts`'s helper shape changes under S5-C. (B-132, B-151)
- Audit `:693`: F-054's taken fix makes a page embed in a cell or Text value "draw and act as the connection it names," where `ConnectionsPM.md` says such a form is never a connection.
- `MarkdownPM.md:70` (four ways to embed a page; "Source ▸") is **already false** and already known: the audit's reconcile plan (`Pommora Codebase Audit.md:697`) rewrites it to five ways naming the `/` menu. (B-148)

##### Source IDs

A-11, A-81 (cross), B-11, B-13 (cross), B-15, B-33, B-40, B-109, B-132, B-148, B-151, B-160, B-162.

---

#### 3.15 Section Runs and Citations

##### Current Shape

- **`§` Runs:** `build`'s section-run pass (`decorations.ts:666-676`) runs in every scope, only when `inPageHeadingResolution === 'automatic'` (`:666`); `renderCellContent` (`cellStatic.tsx:55-179`) has no `§` pass. `sectionRunsIn` (`scan.ts:24-37`) returns early unless the **visible text holds a `§`** (`:29`) and re-matches `pageLinkPattern` to exclude links (`:30-32`); its `byLength` rebuild scales with the heading count, not the document. **V/C** (B-58, B-79)
- **`§` Runs Are the One Drawn Link Kind Outside the Drawn Token List:** `sectionRunAt` reads `.md-section-run` from the DOM (`linkClicks.ts:31-43`); runs depend on the outline, which the text-keyed chunk memo can't carry. Earned. **V** (B-65)
- **Citations:** `citationPointer.ts` (131): `loneTarget` (`:19`), `followCitation` (`:30-45`), `citationPointer` (`:57`, `dwell: () => null` at `:62`), `citationRowPointer` (`:95`), `citationRowMenu` (`:109`); `citationActions` (159) is also read by `MarkdownEditor.tsx:19`, `citationMenu` (23) by `api.ts:25`; `citationEdits.ts` (171). The citation menu is a promise-returning host member whose answer the editor applies (`citationPointer.ts:67-73`), the model S7-A copies (*§3.8*). **V** (B-12, B-67)
- **The Picker's `§` Arming** is in *§3.12*. (A-66)

##### Defects

- **A `§` Run Draws in a Live Cell but Not at Rest:** the cell changes appearance on entry. **V** (B-58)
- **A Citation Marker Follows Its Lone Link but Never Glances** (`followCitation`, `citationPointer.ts:30-45`; `dwell: () => null`, `:62`). Defensible. **V** (B-59)

##### Options

- **S6-C, `sectionRunsIn` Half (≈ +1; Take Only With Corrections):** The scout moves the link exclusion into the caller's `inCode` mask (editor mask adds `linkTokenAt(tokens, a + o) !== undefined`, ±0), has `linksIn` collect the spans it already matches (+3), deletes `scan.ts:30-32,42,44` and the link clause in `:45` (−5), and memoizes `byLength` (+3). **Corrections:** (1) it misses a third caller, `rewrite.ts:107` (`rewriteHeadingConnections`), which would need its own link-span mask, so the exclusion relocates to three callers rather than going; (2) `linkTokenAt` is inclusive (`tokens.ts:340-341`), so for `[[A]]§B` the proposed mask reports the `§` at offset 5 as inside the link (probed: `true`), while today's `sectionRunsIn` returns the run `{ from: 5, to: 7 }` (probed); it needs an exclusive-end mask; (3) the `byLength` memo is sound, but the cost it removes is gated (B-79). **Overlap:** S1-C also deletes `sectionRunsIn`'s re-match (`scan.ts:30-32`); count those lines once. **C** (B-116)
- **`§` at Rest:** No scout costed a resting `§` pass; parity would need `renderCellContent` to read the outline. Nathan's call (*§7*).
- **Citation Glance:** Leave as is (defensible). (B-59)

##### Traps

- `sectionRunAt` can't go through `drawnLinkAt` (no token holds a run). (B-159)
- `sectionRunsIn` can't go into the chunk memo. (B-173)

##### Would Go False

- None beyond `scan.ts`'s comment at `:86` (S1-A, *§3.16*).

##### Source IDs

A-66 (cross), B-12, B-58, B-59, B-65, B-67 (cross), B-79, B-116 (`sectionRunsIn` half), B-159, B-173.

---

#### 3.16 Rename and Index

##### Current Shape

- **Rename Reads Links Separately From the Index:** `linksIn` (`scan.ts:70-109`) and the rewrites (`rewrite.ts:31-111`) walk the same three patterns. The rewrite builds `codeMask` 3× for a title (`rewrite.ts:34,43,50`) and 4× for a heading (`:79,87,94,104`); comments at `:42,49` say why. `ConnectionsPM.md:24`'s "one pure pass over three patterns" is false: three chained `replace` passes, each rebuilding the mask (`rewrite.ts:34-35,43-44,50-51`), and the heading rename repeats the shape (`:79-104`). The heading path runs from the editor's settle (`Guards/headingRenameSettle.ts:57`), settle-time rather than per keystroke. **V** (A-10, B-141)
- **Rename Reconstructs Whole Tokens:** `rewrite.ts:40,47,57,85,92,100` rebuild whole tokens, while every other link mutation edits a span; `escapedPipe` (`:25-26`) exists only for this. **V** (A-46)
- **Self-Induced Machinery:** the extra masks, `groupsOf`/`offsetOf` (`rewrite.ts:21-23`), and `escapedPipe` exist because rename runs three chained `String.replace` passes that rebuild tokens; `applyEdits` already exists (`markdownCode.ts`, used at `rewrite.ts:105`). `titleOf` (`connections.ts:21-22`) and `targetNamesTitle` (`links.ts:107-110`, sole caller `rewrite.ts:54`) exist because readers consume raw groups. **V** (A-72, A-73)
- **Title Rename Writes Aliases Differently in Bodies and Frontmatter:** the body path re-emits the alias verbatim (`rewrite.ts:40`); the frontmatter path writes through `connectionText` (`rewrite.ts:130`), which drops an alias equal to the target (`connections.ts:91-93`). **V·P** (A-08)
- **Index and Rename Disagree on Scope:** the index's `valueLinks` reads every key that isn't a whole connection (`scan.ts:128-136`); `readLink('[x](Old)').kind` is `url` (ran), so a Link value `[x](Old)` is indexed as a backlink to Old through `linksIn`'s markdown branch. Rename's `patchOf` (`cascade.ts:199-211`) rewrites Link-typed keys only through `rewriteFrontmatterConnections`, which skips non-`page` values (`rewrite.ts:125-126`); delete's `goneEntry` (`cascade.ts:95-99`) skips them too. `ConnectionsPM.md:24` documents the gating. **V·P** (A-20; merges S1 §2 and S2 §2.9)
- **Two Heading-Reference Gates Earn Their Difference:** `HEADING_REFERENCE` (`rewrite.ts:62`) and `linksOwnHeadings` (`Tables/cellStatic.tsx:49`) answer different questions. **V** (A-12)
- **No Host Resolver** (F-114, *§3.5*); **the host has no overlap precedence** (*§3.1*). (B-140, A-21)

##### Defects

- **Heading Escape:** a heading rename or title rename consumes the `\` in `[[A#Note\]]` (*§3.1*). **V·P** (A-07)
- **`[[Old|Bar]]` Renamed to Bar:** `[[Bar|Bar]]` in a body, `[[Bar]]` in a Link value. **V·P** (A-08, A-141)
- **Scope:** a Link value `[x](Old)` counts as a backlink to Old but isn't rewritten when Old is renamed or cleared when it's deleted. **V·P** (A-20)
- **Phantom Index Key** for `[x]([[T]])` (harmless; *§3.1*). (A-21, B-139)

##### Options

- **S1-A: Rename Reads the Index Walk (≈ −46, ±10):** `linksIn` yields spans as well as keys: `title: [s, e] | null` (the wikilink title span from `linkSpans`, the embed `page` group, or a markdown destination up to `#`) and `heading: [s, e] | null` (the heading span, the embed heading group, a markdown fragment, or a `§` run's text). The wikilink branch reads through `linkSpans`, so the escape rule lives once. `rewriteConnections` becomes "one mask, `linksIn(body)` filtered by `target === oldKey`, then edit each `title` span (encoded with `encodeLinkTarget` for markdown) through `applyEdits`"; `rewriteHeadingConnections` becomes "`linksIn(body, own, outline && [...outline, oldHeading])` filtered by `target` and `qualifier`, then edit each `heading` span," keeping `expressibleHeading` for wiki and embed; `rewriteFrontmatterConnections` stays. **Deleted:** `rewrite.ts:21-26` (6), the replace bodies `:32-59` (28) and `:73-110` (38), `targetNamesTitle` (`links.ts:107-110`, 4), `titleOf` (`connections.ts:20-22`, 2-3) = 78 (checks against measured spans). **Added:** span fields in `LinkHit` and the three branches (+8), the new rename bodies (+24) = 32. **Stress 1:** the deleted `:73-80` hold the `HEADING_REFERENCE` gate and the `own`/`names`/`wiki` setup, which the new body keeps (inside the +24; tight). **Stress 2 (Trap):** `linksIn` maps an empty title to `own` (`scan.ts:18-21`); if title rename passes an `ownTitle`, `[[#H]]` on the renamed page matches and editing its empty title span *inserts* the new title, so title rename must pass `ownTitle = ''` or skip empty title spans. **Stress 3:** today's rewrite fixes `[x]( Old)` by re-emitting the target; a span edit must take the trimmed span to stay equivalent. **User-Visible:** `[[A#Note\]]` stops matching heading `Note`, as the editor already treats it (the A-07 fix); unusual whitespace inside link syntax survives byte-for-byte; a heading rename stops running four whole-document mask builds in the settle. **Rules:** no seam touched (Connections already imports `Engine/markdownCode`); fewer passes and no reconstruction, so simplification rather than relocation. **Depends:** nothing; `indexSeed.ts:61-62` ignores the new fields. S1's separate "four justification comments" count is subsumed by the span count (A-158 dropped). **V** (A-98)
- **A-08 Under S1-A:** a span edit replaces the title span and leaves the alias, so `[[Old|Bar]]` still becomes `[[Bar|Bar]]` in a body; matching the frontmatter path (and F-035's rule) needs the body rename to drop an alias equal to the new title (one extra span edit, ≈ +2, uncosted).
- **A-20 Scope:** (a) the index stops treating a Link value's markdown link as a backlink unless rename and delete also handle it, or (b) rename and delete rewrite such values, which (per S2-D) writes `[[New|x]]` through `connectionText` (`rewrite.ts:130`), a visible form change. Nathan's call (*§7*).
- **S1-C** makes the host and the editor read one walk (*§3.1*).

##### Traps

- Rename must pass the same outline: `rewriteHeadingConnections` passes `[...outline, oldHeading]` (`rewrite.ts:107`), and S1-A must pass the same to `linksIn`; title rename must not let `linksIn`'s `own` mapping catch `[[#H]]` (Stress 2). (A-131)
- Keep `frontmatterMentions` and `valueLinks` separate; only the key-scope disagreement is open. (A-129)
- `escapedPipe` can go only under a span edit; `linkSpans`' `unescaped` stays. (A-124)
- The lazy alphabetical sort is load-bearing (`pageIndex.ts:31-32`). (A-130)

##### Would Go False

- `ConnectionsPM.md:24` is **already inaccurate** (three passes); S1-A changes it again. (A-114, B-141)
- Comments: `rewrite.ts:38,42,49`, `scan.ts:86`. (A-115)
- Tests: `scan.test.ts:235,254` (exact `LinkHit` shape), `rewrite.test.ts:154-165`. (A-116)

##### Source IDs

A-07 (cross), A-08, A-10, A-12, A-20, A-21 (cross), A-46, A-72, A-73, A-98, A-124 (cross), A-129, A-130 (cross), A-131, A-141, A-158, B-141.

---

#### 3.17 Delivery Seams

##### Current Shape

- **The Editor's Connections Getter Rides Three Carriers:** `getConn` through `surface.ts:43-87`; `embedHost.getConn` (`embedWidget.tsx:41,47`); and the `tableConnections` facet (`Tables/widget.tsx:55-56` define, `:345` read, `:560` parameter, `:570` `.of`) feeding `MarkdownTable.connections` (`:133`) → `CellEditor.connections` (`:124,147`) and `StaticCell.connections` (`cellStatic.tsx:278`). F-094's text and footnote (`Pommora Codebase Audit.md:1013,1501`) don't mention `tableConnections` (0 hits). F-094 (−50, audit-measured) waits for the SidePane editor (audit `:997`). **V** (B-49)
- **Optional but Always Supplied:** `ConnectionsApi.location?` and `headingsOf?` (`connectionsApi.ts:42-43`); both production builders supply them (`pageConnections.ts:31-34,44-45`). **V** (A-83)
- **`bypass?`** is optional only because the inert bundle omits it (*§3.13*). (B-74)
- **`EditorHost.openLink`** is earned (*§3.13*). (B-75)
- **Two Clipboard Doors** are forced by layering (*§3.11*). (A-118)
- **Alias Memory Is Written Twice:** `aliasMemory.ts:1-9` vs `Testing/editorHarness.ts:83-90`; the harness skips the `trim` and the head-is-same `null` short-circuit. Test-only, so a test-fidelity gap rather than production duplication. **V** (A-22)

##### Defects

None user-visible.

##### Options

- **S8 §6.4: Fold `tableConnections` Into `host` (≈ −6, Estimated):** fold the facet and the `connections` props on `MarkdownTable`/`StaticCell` into the `host` `StaticCell` already takes (facet define 2, `.of` 1, read 1, two prop declarations 2). **Double-Count Risk:** F-094's −50 counts "22 production signatures," and `tableWidgetExtension(connections: ConnGetter)` (`widget.tsx:560`) is plausibly one; count −6 only for the lines F-094 doesn't name. The getter then survives only on the renderers with no editor (`TextCell`, `TextPane`, `PropertyValueInput`, `valueContext`, `renderCellContent`, `linkGestures`). **V** (B-125)
- **Make `location`/`headingsOf` Required** (±0; drops optional chains). (A-83)
- **`aliasMemory` Into `editorHost` (≈ −4, Optional):** the harness imports the real functions, which also fixes A-22. **V** (A-101)
- **S8 §6.3(1), Under F-094:** `ConnectionsApi` moves from `Links/connectionsApi.ts` into `MarkdownPM/api.ts` as the type of `EditorHost.connections`, so the 13 outside importers read `MarkdownPM/api` (free inside F-094; ≈ 13 files of churn otherwise). (B-124)

##### Traps

- `tableConnections` is read inside the widget's React render (`widget.tsx:345`); a `host.connections()` fold must read live at the gesture. (B-190)
- `ConnectionsApi` can't move into `Core/Connections` (UIX `TrailSegment`, `connectionsApi.ts:13,43`; Connections runs on the host). (B-185)
- `EditorHost.openLink` stays (B-161).

##### Would Go False

- None identified beyond the moved-import churn.

##### Source IDs

A-22, A-83, A-101, A-118 (cross), B-49, B-74 (cross), B-75 (cross), B-124 (seam row), B-125, B-185 (cross), B-190.

---
#### 3.18 Names and Vocabulary

##### Current Shape

The product already settled two words: a **connection** is any link naming a page (`ConnectionsPM.md:4`), and Settings split connection from web link ("Internal Link Color"/"External Link Color", `frames.ts:477,484`; "Open Connections In Preview"/"Open Links In Pommora", `:357,328`). The code drifted from that split. (B-122)

| Concept | Names in Code | Evidence | IDs |
|---|---|---|---|
| **"Target"** | Raw destination: `linkTarget` (`tokens.ts:52`), `rawTarget`, `encodeLinkTarget`/`decodeLinkTarget` (`links.ts:68,77`), `targetTitle`/`targetFragment` (`links.ts:94,102`). Parsed: `LinkTarget` (`linkValue.ts:11`, differs from `linkTarget` by case alone). Resolved: `MdTarget`, `titleTarget`, `tokenTarget` (`connectionsApi.ts`), `heldTarget`. Thunks: `followTarget`, `dwellTarget` (return `(() => void) \| null`). Menu payload: `ConnMenuTarget`, `linkMenuTarget`, `tokenMenuTarget`, `menuTarget`, `linkValueMenuTarget`. `{ el, target }`: `cellLinkTarget` (`cellStatic.tsx:436`). `PasteAsTarget` (`pasteAsMenu.ts:28`), `GlanceTarget`, `HeadingTarget` (`headingTarget.ts:5`), the `'target'` form (`autocomplete.ts:19`), index keys `LinkHit.target`/`Relation.target`, `LinkPaste.target` (a URL, `linkValue.ts:127`), `urlClickTarget` (a string, `linkValue.ts:64`), `loneTarget` (`citationPointer.ts:19`, `{ text, tk }`), `wikiAuthorTarget` (`{ pipeAt, select }`) | Read | A-88, B-85 (same fact; merged) |
| **A web address** | `external` (`MdTarget`, `connectionsApi.ts:49`, 6 production sites), `url` (`LinkTarget`, `linkValue.ts:13`; `ConnMenuTarget`, `:31`; `PasteAsTarget`; `LinkActionText`), `target` (`LinkPaste.target`), `site` (`GlanceTarget`, `api.ts:75`; `ConnSiteAction`; **8 sites in 3 files**: `GlancePane.tsx:97,98,124,202,273,374`, `linkClicks.ts:129`, `api.ts:75`), `webpage` (`TileRange`, `embedWidget.tsx:62`; `TileMount`, `api.ts:151`). Copy: "External Link", "Website Link", "Webpage", "Embedded Link". `'external'` also tags an unrelated `AssetValue { kind: 'external'; url }` (`Core/Assets/assetUrl.ts:9`, built `:17`, excluded `:28`, read `:37`) | Read (S8's `'site'` count corrected from ≈ 4) | B-83 (C), B-84 (New) |
| **"Link"** (4-5 meanings) | Any link (`linkTokenAt`, `drawnLinkAt`, `linkPointer`); the markdown token kind `'link'` (`tokens.ts:27`); a web address (`isValidLink`, `isHttpLink`, `normalizeLinkUrl`, `linkDomain`, `linkTitles`, `openWebLink`, `'link:open'`, `link:*` actions, `EditorHost.openLink`); the Link property type; `ConnectionForm 'link'` (the wikilink title slot); `LinkFormat 'link'` (writes `[sel]()`, labelled "External Link", `Core/Actions/blockMenu.ts:4,44-46`) | Read | B-101 |
| **"Connection" / `Conn`** | Covers non-connections: `ConnMenuTarget { kind: 'url' }`, `ConnUrlAction`, `ConnSiteAction`, `CONN_SITE_ROWS`, `ConnectionsApi.menu`, `showConnectionMenu`; `MarkdownPM.md:8` calls `Links/` "the connection layer," though it also holds address paste, pending titles, and URL formatting | Read | B-91, B-146 |
| **The heading half** | `heading` (`ConnectionParts`, `LinkTarget`, `MdTarget`, `LinkSpans.heading` `connections.ts:16`), `qualifier` (`LinkHit.qualifier`, `scan.ts:65`), `fragment` (`Token.fragment` `tokens.ts:36`, `targetFragment` `links.ts:102`, `DestinationSpans.fragment` `:42`, the `'fragment'` form), `headingOf` (`tokens.ts:54`), `'section'` (`§`, `ConnectionForm`, `autocomplete.ts:19`). `qualifier` is legitimately wider on `Relation` (Context keys, `Core/Platform/stores.ts:11`) | Read | A-89, B-95 (merged) |
| **Shown text** | `alias` for both a connection alias and a markdown label: `escapeAlias`/`unescapeAlias` (`links.ts:19-25`) act on labels only, while `DestinationSpans` and `composeWebpageEmbedLine` say `label` | Read | A-90, B-105 (merged) |
| **"Title"** | `LINK_DISPLAY_LABELS['link-title'] = 'Page Title'` (`Core/Properties/properties.ts:120`) is a website's `<title>`; `EditorHost.pageTitle()` (`api.ts:195`) is the Pommora page's; "Add Title"/"Edit Title" (`connectionMenu.ts:84`) and "Remove Title On Link Change" (`Core/Settings/frames.ts:530-533`, hint "drops the alias"; `personalization.ts:153`; `useConnectionAutocomplete.ts:178`) mean the alias | Read | B-88, A-97 (copy half) |
| **"Preview"** | `link:window` (`connectionMenu.ts:30`, the in-app browser) and `title:window` (`Core/Actions/pageMenu.ts:73`, the Page Window); "Open Connections In Preview" means the Page Window | Read | B-92 |
| **"Format"** | `LinkFormat` (`blockMenu.ts:4`, wrap kinds; 6 production refs in 2 files, not 3) vs Default Link Format / `LinkDisplay` (`properties.ts:110`, `frames.ts:504`, `LinkEditor.tsx:51-55`, `LINK_FORMAT_OPTIONS`); `linkFormat.ts` holds every URL action, not formatting | Read (count corrected) | B-103 |
| **"Address"** | `linkAddress(tk)` (`tokens.ts:47`) returns a markdown destination span that may name a page; every doc uses "address" for a web address; `links.ts` already calls that span `dest` (`:39-43`) | Read | B-102 |
| **Readers and resolvers** | Four readers: `parseLink`, `readLink`, `parseConnectionText`, `parsePastedLink` (which runs on every commit, typed or pasted, `linkValue.ts:89`). Resolve-a-title: `PageIndex.resolve`, `resolveConnection`, `resolveTitle`, `ResolveTitle`, `titleTarget`, `resolveMdTarget`, `tokenTarget`. Spell-a-link: `connectionText`, `pageEmbedText`, `serializeLink`, `composeWebpageEmbedLine`, `linkMarkdown`, `linkPaste` | Read | A-91, B-105 (merged) |
| **The connections getter** | `getConn` (27/8), `GetApi` (`linkClicks.ts:22`), `ConnGetter` (`widget.tsx:55`), `connections` props, `getConnRef` | Read | B-105 |
| **`LinkHit`** | The exported index occurrence (`Core/Connections/scan.ts:62`) and a private pointer hit (`linkClicks.ts:24`); real, low-cost collision | Read | A-85, B-93 (merged) |
| **`linkAt`** | `connections.ts:42` (wikilink-only span lookup) and `linkGestures`' DOM-hit closure (`cellStatic.tsx:404`, destructured at `:307` and `TextCell.tsx:28`); with `linkTokenAt` (`tokens.ts:331`) and `drawnLinkAt` (`decorations.ts:370`), four "link at" lookups | Read | A-86, B-94 (merged) |
| **`titleOf`** | An escape stripper (`connections.ts:21`) that also collides with a parameter name (`Properties/properties.ts:55`) | Read | A-87 |
| **`openPage`** | Three functions: `connectionsApi.ts:150` (link follow), `useViewInteractions.tsx:368` (row open), `tile.openPage` (`:376-377`, typed at `ViewTile.tsx:231`, `tileKinds.tsx:27`) | Read | B-86 |
| **Address openers** | `openLink` (`EditorHost`, `api.ts:190`), `openWebLink` (the adjudicator), `'link:open'` (`Core/Contract/bridge.ts:256`, system browser only), `openBrowser` (in-app, `windowSlice.ts:247`) | Read | B-87 |
| **"Plain" vs "literal"** | `PASTE_PLAIN_ACTION = 'paste:plain'` (`Actions/editorMenu.ts:41`) dispatches `pasteAs(view, 'literal')` (`Menus/menu.ts:68-69`), while the `'plain'` Paste As form means "the address alone"; `pastedUrl` isn't paste-specific | Read | A-96 |
| **Picker vocabulary** | `ConnectionForm`'s `'link'` means a wikilink title (`autocomplete.ts:19`); `AutocompleteQuery.title` names the owning page; "warm" (`warmBody`, `api.ts:192`) collides with `WarmSeam`/`warmSeamOf`/`tileWarmSeam` (`editorHost.tsx:10,15,36`); `headingHash` is named for its output; `HeadingTarget 'warm'` also covers "no page" (`headingTarget.ts:16`); `aliasOnLeave` also handles heading slots (`linkEdit.ts:98-102`); `AcRow`/`AcState` abbreviations sit beside full-word names | Read | A-97 |
| **Patterns** | `*Pattern()` factories, `*Regex()` factories, and the `MD_LINK` constant; `MD_LINK` (`links.ts:5`, the anchored regex) vs `MD_LINK_CLASS` (`decorations.ts:80`, the class for an external link only); `MdTarget` is also what `tokenTarget` returns for wikilinks (`connectionsApi.ts:72-73`) | Read | A-48, B-97 |
| **`resolveRange` / `contentRange`** | `resolveRange` (`tokens.ts:35`) is "title span, only when aliased or a heading slot is written"; `contentRange` is the shown span | Read | B-96 |
| **Menu pairs** | `linkMenuTarget` vs `tokenMenuTarget` differ by input (`MdTarget` vs token); `applyLinkAction` vs `applyUrlLinkAction` differ by syntax (wikilink vs markdown link, which may name a page) | Read | B-100 |
| **`ConnSurface 'cell'`** | Means a property-value cell (`connectionMenu.ts:21`); a MarkdownPM table cell is `'editor'` by default (`connectionMenuActions.ts:22`); `ConnCellAction`, `onCell`, `cellClosingRows` share the meaning | Read | B-99 |
| **`LINK_ROWS`** | Two constants: `blockMenu.ts:50` (three rows), `Core/Actions/editorMenu.ts:60` (two rows) | Read | B-104 |
| **`pendingTitle` family** | `pendingTitle`, `pendingTitles`, `PendingTitle` in one file (`pendingTitle.ts:74,20,9`) | Read | B-89 |
| **Holder vs held** | `holder` (`LinkCell.tsx:28`, `TextCell.tsx:23`), `heldPage` (`api.ts:44`), `OwnPage { kind: 'held' }` (`:50`), `heldTarget`; two words for one concept, and S8's "leave it" is reasonable | Read | B-90 |
| **Classes** | `ConnectionCell` and `.cell-connection` break the `md-connection-*` family; `linkDisplayText` handles connections, which `LinkDisplay` doesn't cover | Read | A-95 |
| **Rename functions** | `rewriteConnections` also rewrites embeds and markdown links; `rewriteTileConnections` (`tilesFile.ts:291`) takes any rewrite | Read | A-92 |
| **File/grammar** | `pageLinkPattern` (the wikilink) lives in `connections.ts`, the markdown grammar in `links.ts` | Read | A-93 |
| **`linkValue.ts` names** | Its private `LinkValue` type (`:7`) isn't the property value; `pasteLink` and `linkPaste` are anagrams | Read | A-94 |

##### Defects

- **Product Copy:** "Title" names the alias in menus and Settings while "Page Title" names a website's title; "Preview" names two windows; "External Link"/"Website Link" (`ConnectionsPM.md:40`) and "Embedded Link"/"Webpage" each name one thing twice. These are Nathan's (*§7*). (B-88, B-92, B-83, A-97)

##### Options

- **S8 §6.1: Rename Only Where a Shape Change Already Rewrites the Line (≈ 0 Lines):** A standalone rename deletes nothing and costs churn, so each row rides a bundle. Rows that earn themselves: keep **connection** as the product word; rename only `parseConnectionText` → `readWikilink` inside S1-B (leave `connectionText`, 19 refs, the writer every surface calls); `ConnMenuTarget` → `LinkMenuTarget` with the S2-B/S5-B/S7-A rewrites (12 refs / 3 files), but not `ConnectionsApi` standalone (145 refs / 53 files; under F-094 it becomes `EditorHost.connections`); `'external'` → `'url'` (≈ 6 switch arms already being edited; also removes the `AssetValue` collision, B-84) and `'site'` → `'url'` (8 sites in 3 files); keep `webpage` for the embed; **destination** for a markdown link's `( )` text (`linkDestination`, `destinationSpan`, `destinationTitle`, `destinationHeading`, `encodeDestination`), earning for `linkAddress`/`linkTarget` (9 sites), the `target*` helpers only where S1-A and S3-1 touch them; one parsed type **`ParsedLink`** (today's `LinkTarget`, 5 refs) folding `ConnectionParts`, `LinkValue`, `PasteAsTarget`, which frees **`LinkTarget`** for the resolved `MdTarget` if it moves (*§3.5*); **heading** in every link type (`qualifier` stays on `Relation`; `Token.fragment` → `heading` only if F-054 or S1-C rewrites `wikiLinkTokens`); `escapeLabel`/`unescapeLabel` with S3-1; holder/held unchanged; the getter goes under F-094; literal/plain defers to S3-2; `LinkFormat` → `LinkWrapKind` (cheap, standalone acceptable); `linkFormat.ts` merges into `linkActions.ts` (with S5-B/S7-B); the class pair yields to S6-B (*§3.6*). **Churn** if every earning row rides its bundle: ≈ 60 production refs across ≈ 25 files, almost all already edited. **V** (B-122, with B-83/B-84/B-103's counts)

##### Traps

- Persisted keys can't be renamed for vocabulary: `link_display` (`properties.ts:178`) and settings keys (`frames.ts:326-504`) need a decoder migration; `Relation.qualifier` is wider than "heading." (B-184)

##### Would Go False

- `MarkdownPM.md:8` ("`Links/` the connection layer") is **already false**. (B-146)

##### Source IDs

A-48, A-85, A-86, A-87, A-88, A-89, A-90, A-91, A-92, A-93, A-94 (names half), A-95, A-96, A-97, B-83, B-84, B-85, B-86, B-87, B-88, B-89, B-90, B-91, B-92, B-93, B-94, B-95, B-96, B-97, B-99, B-100, B-101, B-102, B-103, B-104, B-105, B-122, B-146, B-184.

---

#### 3.19 Types and Conversions

##### Current Shape

- **Two Type Spines:** `Token → MdTarget` in the editor; `LinkTarget → ConnPage | null` for Link values (*§3.5*). (B-27)
- **Parsed-Link Types:** `LinkTarget` (`linkValue.ts:11-13`), `ConnectionParts` (`connections.ts:68`), private `LinkValue` (`linkValue.ts:7`, not the property value), `PasteAsTarget` (`pasteAsMenu.ts:28`). **V** (A-94, B-123)
- **Formatted-Write Types:** `LinkPaste` and `LinkActionText` (*§3.11*). (B-31)
- **`LinkSyntax` Has Four Arms and One Reader:** `indexSeed.ts:62` (embed vs not), confirmed by `git grep '\.syntax\b'`. (S1's "`linkAt` is wikilink-only" is folded into *§3.18*.) **V** (A-49)
- **Menu Types:** `ConnMenuTarget`'s arm-inconsistent fields, the unread url `hasAlias`, `LinkCellAction` (*§3.8*). (B-70, B-71, B-81)
- **Status:** `ConnResolution.status` and `MdTarget`-derived `LinkStatus`, both genuine (*§3.5*). (B-48)
- **Type-Forced Arms:** `pasteAsWrite`'s null arms are mostly type-forced (`pasteAsMenu.ts:105-106,116,120`). (A-122)
- **Reference Counts:** *§2.4*. (B-25)

##### Options

- **S8 §6.2: One Shape per Concept (Unique ≈ −1 to −3):**

| Concept | Keep | Fold In | Who Counted It | Unique Delta |
|---|---|---|---|---|
| Text spans | `LinkSpans` (Connections), `Token` (Engine), `DestinationSpans` | — | — | `Token.resolveRange` always set on wikiLink: 4 fallbacks become plain reads, ±0 (exclusive with B-127, *§3.3*) |
| Parsed, unresolved | `ParsedLink` (today's `LinkTarget`) | `ConnectionParts`, `LinkValue`, `PasteAsTarget`; the anonymous `{ page, fragment }` stays private to `links.ts` | S1-B, S3-1 | 0; `serializeLink(url, label?)` inside S1-B |
| Resolved | `MdTarget` (renamed if moved) | `resolveConnection`'s `ConnPage \| null` for display and menu | S2-A/C, S5-A | 0 |
| Status | `ConnResolution.status` → `LinkStatus` | `MdTarget.invalid.ambiguous` stays | — | `mdLinkClass` ambiguous arm +1 (subsumed by S6-B) |
| Glance | `GlanceTarget` | `'site'` → `'url'` | — | 0 |
| Menu | `ConnMenuTarget` → `LinkMenuTarget` | drop `editable` (S7-A), `hasAlias` required on both arms, drop `LinkCellAction` | S7-A, S2-B | `LinkCellAction` −1; `hasAlias` ±0 |
| Pointer hit | private `LinkHit` → `PointerLink` | `cellStatic`'s `{ el, target }` → `Pick<PointerLink, 'target'> & { el }` only under Side 1 | — | 0 |
| Index occurrence | `LinkHit` (`scan.ts:62`) | — | — | 0 |
| Formatted write | `LinkPaste` (`target` → `url`) | `LinkActionText`, `formatted` | S3-2, S5-B | ±0 (4 sites) |
| Unread exports | — | drop `export` from `ConnResolution` (`pageIndex.ts:11`), `LinkSyntax` (`scan.ts:59`) | — | 0 |

  **Conversions that remain** (each a real stage change): text → `LinkSpans`/`Token` (tokenize); `Token` → `MdTarget` (`tokenTarget`); value or clipboard → `ParsedLink` (one reader); `ParsedLink` → `MdTarget` (`titleTarget` for the page arm; the url arm maps directly); `MdTarget` → `heldTarget` → consumers (`LinkMenuTarget`, `GlanceTarget`, follow, CSS class); `MdTarget`/`ConnPage` → `LinkPaste` → `PendingTitle`. **Deleted conversions:** `ConnectionParts` → `LinkTarget` spread (`linkValue.ts:32`); `LinkValue` → `LinkTarget` re-tag (`:33-34`); clipboard → `PasteAsTarget` (alias and heading loss); `LinkPaste` → `LinkActionText` (`linkFormat.ts:50-51`); `LinkTarget` → `ConnPage | null` (`resolveConnection` in `LinkCell` and the value menu). The type set's value is the single spine; the deletions it enables are counted under S1-B, S2-A/B/C, S3-1/2, S5-A/B. **V** (B-123)

##### Traps

- `MdTarget.invalid.ambiguous` isn't redundant with `LinkStatus` (B-188); `Token.contentRange` can't stand in for the alias span (B-189).

##### Would Go False

- `tokens.test.ts:124,132`; `connectionMenuActions.test.ts` (5 `ConnMenuTarget` refs); `LinkFormat` has no test references; `GlanceTarget` has 2 test refs in 1 file. (B-138)

##### Source IDs

A-49, A-94 (type half), A-122 (cross), B-25 (cross), B-27 (cross), B-31 (cross), B-48 (cross), B-123, B-138, B-188 (cross), B-189 (cross).

---

#### 3.20 Placement

##### Current Shape

| File | Lines | Runs In | Folder Says What It Is? | Finding | IDs |
|---|---|---|---|---|---|
| `Core/Connections/connections.ts` | 109 | both | yes | Wikilink grammar; `linkAt` and the slot wrappers are editor-only readers | B-20, B-124 |
| `Core/Connections/links.ts` | 110 | both | partly | Markdown-link grammar named "links" beside a wikilink file named "connections"; `composeWebpageEmbedLine` is embed spelling | A-93 |
| `Core/Connections/linkValue.ts` | 144 | both | no | Value codec plus field writers plus the editor's paste writers (`linkPaste`/`linkMarkdown`/`LinkPaste`, `:124-144`, read by `pasteDecision`, `pendingTitle`, `linkFormat`, `pasteLink`, `pasteAsMenu`, `Menus/menu.ts`); imports `Properties/properties` and `Properties/propertyValue` (`:4-5`) while Properties imports Connections, a type-only folder cycle | A-94, B-124 |
| `Core/Connections/scan.ts`, `rewrite.ts` | 137, 133 | both | yes | Import `MarkdownPM/Engine/markdownCode` and `detect` (`scan.ts:7-8`, `rewrite.ts:18`): host-run Connections depends on the Engine; allowed (pure) but invisible from the path | B-124 |
| `Core/Connections/aliasMemory.ts` | 9 | window | no | No link grammar | A-101 |
| `MarkdownPM/Links/connectionsApi.ts` | 158 | window | no | Declares the app-wide `ConnectionsApi` (13 outside importers); holds the pure `titleTarget`/`resolveMdTarget` in the editor; imports menu types from `Actions/connectionMenu` (`:4-9`) and UIX `TrailSegment` (`:13`) | B-04, A-74 |
| `MarkdownPM/Links/linkEdit.ts`, `linkFormat.ts` | 173, 86 | window | no | One concern (link menu actions) split by syntax; `linkFormat.ts` named for one of seven actions | B-103 |
| `MarkdownPM/Links/headingHash.ts` | 35 | window | no | A typing transform; its siblings live in `Input/edits.ts` | A-70 |
| `Input/edits.ts` (`linkInCode`, `inAliasAt`, `isInsideWikilink`) | — | window | no | Link-liveness rules in `Input/`; a reader looking for "where is a link live" opens `Links/` and doesn't find them | B-21 |
| `MarkdownPM/Tables/cellStatic.tsx` (`linkGestures`, `cellLinkTarget`, `renderCellContent`, `cellTokens`, `CellPage`/`around`) | 486 | window | no | The resting renderer for both table cells and Text values (`TextCell.tsx:11`), filed under `Tables/`; imports `mdLinkClass`/`MD_LINK_CLASS` from the CodeMirror draw module (`:10`) | B-98, B-66 |
| `Core/Paths/urlPath.ts` | 36 | both | no | The web-address predicates live in Paths; 15+ readers and no deletion follows from moving it; leave and note | B-124 |
| `Core/Web/handlers.ts` vs `openWebLink.ts`/`WebGuest.tsx` | 57 / 11 / 174 | host / window | no | `Core/Web` mixes host and window (F-090) | B-02 |
| `Core/Interface/Menus/connectionMenuActions.ts` | 103 | window | partly | `showConnectionMenu` belongs; `linkValueMenuTarget` (`:76-103`) is a Properties value concern | B-124 |
| `Core/Properties/Cells/linkResolve.ts` | 8 | window | no | Serves `parseEditorValue.ts:5,39` only, no cell | A-54 |
| `Core/Nexus/treeIndex.ts` `resolveConnection` | — | window | no | A link resolver in Nexus | B-124 |

**Where a reader looks and doesn't find:** "How does a Link value resolve?" (`Nexus/treeIndex.ts:284`, `Properties/Cells/linkResolve.ts:7`, `MarkdownPM/Links/connectionsApi.ts:52`); "Where does a page link open?" (`Session/pageConnections.ts:37-42`, `connectionsApi.ts:150`, `LinkCell.tsx:87`); "Where does an address open?" (`Web/openWebLink.ts`, `EditorHost.openLink` `api.ts:190`, `connectionMenuActions.ts:35-36`); "Where is a link's caret-liveness rule?" (`Input/edits.ts:324-340`, not `Links/`). (B-124)

##### Options

All ≈ 0 lines; the cost is import churn. **V** (B-124)

1. **Under F-094:** `ConnectionsApi` moves into `MarkdownPM/api.ts` as the type of `EditorHost.connections` (≈ 13 files; free inside F-094). (*§3.17*)
2. **The Token-Free Resolution Half** (`MdTarget`, `titleTarget`, `resolveMdTarget`) moves to `Core/Connections/target.ts`; `tokenTarget` and the menu-target builders stay in `Links/`; `heldTarget` stays unless `OwnPage`'s `held` arm becomes `ConnPage | null` (≈ 6 files). (*§3.5*)
3. **`linkPaste`/`linkMarkdown`/`LinkPaste`** move out of `linkValue.ts` into the paste model; because `pasteAsMenu.ts` (read by main) reads them, the home is `Actions/`, not `Links/` (≈ 7 files). This also breaks the type-only `linkValue.ts` ↔ Properties cycle only if the Properties imports leave too (not claimed). (*§3.11*)
4. **`linkEdit.ts` + `linkFormat.ts`** become `linkActions.ts` (authoring and URL actions) plus `aliasSlots.ts` (`commitAliasOnEnter`, `aliasOnLeave`, slot reading) (3-4 files). (*§3.8*)
5. **One Direction for Link Rules:** link-liveness predicates (`linkInCode`, `inAliasAt`, `isInsideWikilink`) in `Links/`, and typing transforms (including `headingHash`) in `Input/`; pick one. (A-70, B-124)
6. **`linkResolve.ts`** goes under S2-C (*§3.5*); `useLinkTitle`'s home is `Session/` beside `useConnections` or `Core/Web/` (*§3.13*). (A-54, A-104)
7. **The Resting Renderer** (`renderCellContent`, `linkGestures`, `cellLinkTarget`) serves Text values from `Tables/`; no scout proposed a home. Open question (*§7*). (B-98)

##### Traps

- `ConnectionsApi`, `ConnMenuTarget`, and `tokenTarget` can't move into `Core/Connections` (*§3.5*). (B-185, B-186, B-187)

##### Would Go False

- Import paths only; `MarkdownPM.md:8`'s description of `Links/` (*§3.18*).

##### Source IDs

A-54, A-70 (cross), A-74 (cross), A-93 (cross), A-94 (placement half), A-101 (cross), B-02 (cross), B-04 (cross), B-21 (cross), B-66, B-98, B-124, B-185 (cross), B-186 (cross), B-187 (cross).

---

#### 3.21 High-Frequency Costs

##### Current Shape

- **Violation: The Embed Claim on Every Caret Move:** `claimedEmbeds` over every embed line in the document on each `build`, rerun on `selectionSet` (`decorations.ts:474-483,842`). The one document-scale per-caret cost found. **V** (B-33; fix S5-C, *§3.14*)
- **Gated, Not Violations:** the two `sectionRunsIn` costs (`scan.ts:30-37`) run only when `inPageHeadingResolution === 'automatic'` (`decorations.ts:666`), the page has headings, and the **visible text holds a `§`** (`scan.ts:29`); the `byLength` rebuild scales with the heading count; per-link `resolve`/`headingsOf().includes()` and `visibleInline`'s copies are viewport-bound. S6's "leave it" holds. **C** (B-79)
- **Line-Scoped Caret Work:** up to 6 `pageLinkPattern` passes per keystroke through `aliasOnLeave` → `slotNear` ×2 (*§3.3*), and `linkTyping`'s regex `linkAt` on every `docChanged` (`linkReveal.ts:17-25`); both line-scoped, so no rule broken. (A-36, B-17)
- **Settle-Time:** the heading rename's four whole-document mask builds run in the editor's settle (`headingRenameSettle.ts:57`), not per keystroke; S1-A drops them to one. (A-10, A-98)
- **The Picker Listener:** S4-B's field re-derives `autocompleteQuery` on every selection transaction, the same cost as today's listener (`useConnectionAutocomplete.ts:61`). (A-110)
- **Memos:** three tokenizer memos (*§3.6*); a shared caret/draw memo can't be keyed on chunk text (B-114's probe: 499 of 528 lines mismatched on a sparse-cut document), so S6-A's memo form would add a ≈ 50-line parse per keystroke or caret move on a `[[` line. (B-39, B-114, B-164)

##### Options

- **S5-C** removes the violation (*§3.14*).
- **B-127 and S4-A** both keep the caret readers at one regex over the caret's line (*§3.3*); S6-A's memo form is out.
- **S6-C's `byLength` Memo (+3)** is sound but removes a gated cost; optional (*§3.15*). (B-116)

##### Traps

- `chunksOver` returns no chunk for a fenced line (`docScan.ts:284-287`). (B-165)

##### Would Go False

- `Editor-Internals.md:25` (*§3.14*).

##### Source IDs

A-10 (cross), A-36 (cross), A-98 (cross), A-110 (cross), B-17, B-33 (cross), B-39 (cross), B-79, B-114 (cross), B-116 (cross), B-164 (cross), B-165 (cross).

---
### 4. Converging Architecture

If the options that compose are taken together, each concern lands in one home. This states the candidate homes and, where options conflict, the trade. It doesn't pick a winner where the evidence doesn't.

#### 4.1 Candidate Homes

| Concern | Candidate Home | Options That Put It There | What Stops Existing |
|---|---|---|---|
| **Link grammar** | `Core/Connections/connections.ts` (wikilink and embed patterns, `linkSpans` with slots, one title-expressibility check, `openLinkAt` for unclosed openers) and `links.ts` (markdown grammar; `MD_LINK` built from the anchored `emptyTolerantLinkRegex` source) | S1-B, S7-D, (S1-C) | `MD_LINK` as a looser second grammar; three partial unclosed readers; `isInsideWikilink`; the picker's `![[` loop |
| **Parsed link (values, clipboard)** | One `readLinkText` → `ParsedLink` in `linkValue.ts` | S3-1 + S1-B + S8 §6.2 | `parsePastedLink`, `pasteAsTarget`, `wholeWikiLink`, `PasteAsTarget`, `ConnectionParts`, `LinkValue`, `parseLink`; four classifier policies become one |
| **Editor caret reading** | Either the tokenizer's exported wikilink pass with slots plus the scan's code mask, in `Engine/tokens.ts` (B-127), or `slotAt` in `connections.ts` plus `linkInCode` (S4-A) | B-127 **or** S4-A | The four regex caret readers; under B-127 also `linkInCode`, `aliasedToken`'s workarounds, and the `?? contentRange` fallbacks |
| **Code rule** | The tokenizer (`tokens.ts:232,282`), once | B-127 | Gates 2-4 as separate spellings (gate 3 stays only for unclosed openers) |
| **Writing** | `connectionText` (the only wikilink spelling), `pageEmbedText(title, heading?)`, `serializeLink(url, label?)`, `composeWebpageEmbedLine` once; one escape rule in wrap/unwrap | S1-B, S3-3, S7-E, S4-C | Hand spellings in the picker, rename, and `webpageInsertAtCaret` |
| **Resolving** | `PageIndex.resolve` → `titleTarget`/`MdTarget` (moved to `Core/Connections/target.ts`, or left in `connectionsApi.ts`), used by every "resolved page or null" reader; the commit gate refuses non-`resolved` explicitly | S1-B, S2-C, S8 §6.3(2) | `resolveConnection`, `linkResolve.ts`, `ResolveTitle`, the hand adapters, the `LinkTarget → ConnPage \| null` spine |
| **Drawing** | `linkLook` in `connectionsApi.ts`, read by `decorations.ts` and `renderCellContent`; one unresolved class pair; `[data-link-span]`; one page-only CSS hook | S6-B, S6-C | `wikiLinkView`/`WikiLinkView`/`linkStatus`/`mdLinkClass` as separate deciders; `MD_LINK_CLASS`; `md-unresolved-fixed`; `cellStatic`'s import of the CodeMirror module |
| **Gestures** | `linkPointer` (body) and `linkGestures` (resting) with one hit shape; `resolveFollow` → `ConnectionsApi.open(page, heading?, newTab?)`; `openWebLink` normalizes and gates | S7-C, S5-A, S5-D1, S5-D3 | `openPage`, `bypass`, the duplicate `heldTarget` conversions at rest |
| **Menus** | `showConnectionMenu` returns a promise; one target builder (`tokenMenuTarget`, `linkMenuTarget` folded in); one applier (`applyLinkAction` in `linkActions.ts`) | S7-A, S5-B, S7-B | `apply`, `onCell`, `editable` ×2, `LinkCellAction`, the url filter, `linkFormat.ts`, `applyUrlLinkAction` as a parallel |
| **Resting cell** | Side 1: read-only link menu at rest, authoring after a click; Side 2: one pure `linkAuthorEdit` | S5-B/S7-B **or** Side 2 | Side 1: `menuAt`, `menuTarget`, `still()`, `initialSelect`, `wikiAuthorTarget`, `linkActionText` |
| **Link values** | Page half renders through `TextCell`; URL half stays; `useLinkTitle` in `Session/` or `Core/Web/`; one URL opener (the `open` intent); value menu either with the value (`onLinkAction`) or with the parents | S2-A, S2-B, S2-C | `ConnectionCell`, `.cell-connection`, `urlClickTarget`, `linkAlias`, the anchor's opener, three parent link blocks |
| **Paste and copy** | One `pasteAsWrite(target, how, ctx)` in `Actions/pasteAsMenu.ts` (pure, main-importable); one `paste(view, text, how)` in `pasteLink.ts`; one `writeLinkAt` in `pendingTitle.ts`; `LinkPaste` in the `Actions/` paste model; one `isWebAddress` in `urlPath.ts` | S3-2, S3-3, S8 §6.3(3) | `pasteDecision.ts`, `linkFor`, `LinkActionText`, `formatted`, Plain Text (if ruled), the duplicate address-gate spellings |
| **Picker** | A per-mount `StateField` query; `openLinkAt` for unclosed openers; closed slots from the caret reader; commit through `connectionText`; heading tree built once | S4-B, S7-D, S4-C, S4-A/B-127 | `armed`/`measured`/`formRef`, `sectionArmAfter`, `connectionInsert`, `cameFrom`/`viaChevron`, `openHeadingRows`, the fake outline, `AcQuery`, `NONE` |
| **Rename and index** | `linksIn` yields spans; rewrites edit spans through `applyEdits` | S1-A, (S1-C) | Three chained `replace` passes, extra masks, `groupsOf`/`offsetOf`/`escapedPipe`, `titleOf`, `targetNamesTitle` |
| **Embeds** | `embedTileRanges` owns the claim | S5-C (+ F-054 look half) | The per-caret claim in `build`, the second resolve in `buildTiles` |
| **Seams** | `tableConnections` folds into `host` (or waits for F-094) | S8 §6.4 | The facet and two props |

#### 4.2 Conflicts and Trades

- **Caret Reader Home (B-127 vs S4-A):** B-127 puts the closed-link reader in the Engine and makes the tokenizer's code rule the only one (resolves A-45 at its cause; uncosted, ≈ −25 to −35). S4-A keeps a code-blind `slotAt` in Connections and a second code-rule spelling in `linkInCode` (costed, ≈ −13 to −16). Mutually exclusive. (*§3.3*)
- **Occurrence Reader Home (S1-C vs B-127):** S1-C puts one occurrence walk in Connections for the tokenizer and the index; B-127 exports the tokenizer's own pass. They compose if S1-C's walk returns the slot spans and the Engine applies the code mask, in which case B-127's exported pass is S1-C's walk plus the mask (≈ 3 overlapping lines). Without S1-C, host and editor keep two walks (`ConnectionsPM.md:8` stays half-true). (*§3.1*)
- **Resting Authoring (Side 1 vs Side 2):** ≈ 65 lines, F-043, and B-56 ride on it. Side 1 also deletes `wikiAuthorTarget`/`linkActionText`'s reason to exist and lets S3-2 take `linkFormat.ts`'s full −23. (*§3.9*)
- **Value Menu vs Side 1 (S2-B vs S5-B):** S2-B keeps authoring rows on a resting Link value through `linkGestures`' `menuAt`; Side 1 removes that parameter and states "authoring lives where an editor lives." Together, the parameter stays and a resting Link value is the one resting surface with authoring rows, unless value actions (which open the value's editor) count as a different kind. (*§3.10*)
- **`ConnectionCell` (S2-A vs S5-A):** S2-A deletes it; S5-A rewires it. Resolved: S2-A owns those lines when taken. (B-106)
- **Reader Policy (S2-D vs S3-1):** Resolved for S3-1 (A-105). (*§3.1*)
- **Paste Writer vs Applier Merge (S3-2 vs S7-B):** compatible: `applyUrlLinkAction`'s body (now in `linkActions.ts`) calls S3-2's `writeLinkAt`; `LinkPaste` lives in `Actions/` (main-importable) and the view writer in `Links/`. Count `linkFormat.ts`'s type/fold lines under S3-2 and the file-merge lines under S7-B. (*§3.11*, *§3.8*)
- **`sectionRunsIn` (S6-C vs S1-C):** both delete the re-match at `scan.ts:30-32`; S6-C's form needs an exclusive-end mask and a third caller (`rewrite.ts:107`). Count once. (*§3.15*)
- **Token Slots (S8 §6.2 vs B-127):** an always-set `resolveRange` and B-127's slot-bearing pass are exclusive; S8's row is the fallback. (*§3.3*)
- **Class Names (S6-B vs S8 §6.1):** S6-B's surviving names hold unless Nathan wants "link" in the class. (*§3.6*)
- **F-054 (Claim Half vs Whole):** ≈ −4 to −7 vs ≈ +12; the whole fix makes a cell's `![[P]]` act as a connection. (*§3.14*)
- **`useLinkTitle` Home:** `Session/` beside `useConnections` or `Core/Web/`, not `cacheSlice.ts`. (*§3.13*)
- **Resolution Placement:** moving the pure half into `Core/Connections` is compatible with the "can't move" traps, which cover `ConnectionsApi`, `ConnMenuTarget`, and `tokenTarget` only. (*§3.5*)

---

### 5. Delta Ledger

Production lines, CSS included (marked). Each shared line has one owner; **Adjustments** remove what two owners would otherwise both count. Deltas are scout estimates re-costed by the verifiers against measured spans; B-127 is uncosted beyond the verifier's range. Per Nathan's ruling, the real figure is reported after implementation.

#### 5.1 Per-Option Deltas

| # | Option | Section | Range | Mid | Owner Notes |
|---|---|---|---|---|---|
| 1 | S1-A Rename reads the index walk | 3.16 | −36 to −56 | −46 | |
| 2 | S1-B unique (value model, `MD_LINK`, F-035, title check) | 3.1, 3.2 | −11 | −11 | Its `titleTarget` piece (−6) counts only when S2-A/S2-B aren't taken |
| 3 | S1-C One occurrence reader (optional) | 3.1 | −6 | −6 | −3 if B-127 is taken |
| 4 | `aliasMemory` into `editorHost` (optional) | 3.17 | −4 | −4 | |
| 5 | S2-A Link value pages ride `TextCell` | 3.10 | −38 (TS −33, CSS −5) | −38 | Owns `ConnectionCell`; needs S2-B or a +2 decline |
| 6 | S2-B Value menu with the value | 3.10 | −12 to −14 | −13 | Shares ≈ 6 lines with #16 |
| 7 | S2-C One reader per concern | 3.10, 3.13, 3.5 | −28 to −30 | −29 | `useLinkTitle` re-measured (−2 to −4, owner here; S5-D2 = 0); `resolveConnection` half needs S2-A+S2-B or S1-B's `titleTarget` piece |
| 8 | S3-1 One link reader | 3.1 | −15 | −15 | Absorbs S2-D |
| 9 | S3-2 Paste pipeline, beyond S3-1 | 3.11 | −40 to −50 | −45 | Includes Plain Text −3 (ruling) and `linkFormat.ts` −12 |
| 10 | S3-3 Rectangle and copy-side fixes | 3.11 | +3 | +3 | |
| 11a | S4-A One slot reader | 3.3 | −13 to −16 | −14 | Exclusive with 11b |
| 11b | B-127 One reader (tokenizer's pass) | 3.3 | −25 to −35 | −30 | Uncosted; exclusive with 11a |
| 12 | S4-B Picker query as a `StateField` | 3.12 | −18 | −18 | |
| 13 | S4-C Commit and phase cleanup | 3.12 | −32 | −32 | F-035 owned by #2 |
| 14 | S7-D One opener rule (Nathan's ruling) | 3.12 | 0 to −11 | −5 | Supersedes A-112's "adds lines" |
| 15a | Side 1: S5-B + S7-B merge (`editable` → #16) | 3.9 | −93 to −103 | −98 | Exclusive with 15b |
| 15b | Side 2: `linkAuthorEdit` + merge + closures | 3.9 | −32 | −32 | Exclusive with 15a |
| 16 | S7-A Promise menu | 3.8 | −22 to −29 | −25 | Owns `editable`; +0 to +2 at rest under Side 2 |
| 17 | S7-C One hit shape | 3.7 | 0 (Side 1) / −3 (Side 2) | 0 / −3 | |
| 18 | S7-E One escape rule | 3.2 | +2 | +2 | |
| 19 | S5-A One page-open route | 3.13 | −13 (−14 without S2-A) | −13 | |
| 20 | S5-C Embed claim, one owner | 3.14 | −4 to −7 | −6 | F-054 whole instead: ≈ +12 |
| 21 | S5-D1 `openWebLink` normalizes and gates | 3.13 | +4 to +5 | +5 | |
| 22 | S5-D3 `dwellTarget` reads `isHttpLink` | 3.7 | 0 | 0 | |
| 23 | S6-B One look rule | 3.6 | −29 (TS −25, CSS −4) | −29 | +3 each for resting invalid syntax and F-062 if taken |
| 24 | S6-C Page-only setting (+ `sectionRunsIn` half) | 3.6, 3.15 | 0 to +3 | +1 | |
| 25 | S8 §6.2 Type set, unique | 3.19 | −1 to −3 | −2 | |
| 26 | S8 §6.4 `tableConnections` into `host` | 3.17 | −6 | −6 | Only lines F-094's −50 doesn't count |
| 27 | `loneWebpageEmbed` returns its span | 3.14 | −2 | −2 | |
| — | S5-D4 Sweep-side resolve | 3.13 | +2 | — | Not recommended; excluded |
| — | Heading-index lever (unverified, S4 §6) | 3.12 | ≈ −45 | — | Excluded until verified and ruled |
| — | S5-B′ Activate then re-pop | 3.9 | ≈ −60 | — | Not recommended; excluded |

**Adjustments:**

| ID | When | Delta | Why |
|---|---|---|---|
| J1 | #6 and #16 | +6 | `linkValueMenuTarget`'s `apply` parameter and url filter counted by both |
| J2 | #9 and #15a | −3 | Side 1 removes `cellStatic`'s view-less `linkActionText` consumer, so S3-2's `linkFormat.ts` piece is the full −23 and Side 1's −8 fold counts 0 (vs −12 + −8) |
| J3 | #6 and #15a | +1 | `linkGestures`' `menuAt` parameter survives for the value menu |
| J4 | #3 and #11b | +3 | `wikiLinkTokens`' slot juggling counted by both |
| J5 | #3 and #24 | ≈ +3 | `sectionRunsIn`'s re-match (`scan.ts:30-32`) counted by both |
| J6 | #2's `titleTarget` piece and #19's `ConnectionCell` half | ≈ +3 | Both rewrite `ConnectionCell`'s resolve when S2-A isn't taken |

**Scouts' Own Sums Double-Count:** S1-S4 summed ≈ −296 against A's de-duplicated ≈ −256 (≈ 40 lines across the reader, resolver, F-035, and `ConnectionCell`/`linkValueMenuTarget`); S5-S8 de-duplicated to ≈ −190 ± 40 with B-127 included. The cross-set owners and J1-J6 above are applied on top of both. (A-113, A-161, B-126, B-129)

#### 5.2 Bundles Against the −200 to −400 Target

| Bundle | Contents | Mid | Range |
|---|---|---|---|
| **Full, Side 1, B-127** | #1, 2, 5, 6, 7, 8, 9, 10, 11b, 12, 13, 14, 15a, 16, 17, 18, 19, 20 (claim half), 21, 23, 24, 25, 26, 27 + J1, J2, J3 | **≈ −448** (TS ≈ −439) | ≈ −408 to −489 |
| Same with S4-A instead of B-127 | Replace #11b with #11a | ≈ −432 | ≈ −396 to −470 |
| Same with F-054 whole | Replace #20's −6 with +12 | ≈ −430 | ≈ −390 to −470 |
| **Full, Side 2, B-127** | As above with #15b, #17 at −3, S7-A's rest `.then` (+1), no J2/J3 | **≈ −382** | ≈ −348 to −419 |
| **Lean: Side 2, S4-A, No Look or Value-Surface Changes** | #1, 2 (+ `titleTarget` piece −6, J6 +3), 7, 8, 9 (keeping Plain Text, −42), 10, 11a, 12, 13, 14, 15b, 16 (+1), 17 (−3), 18, 19 (−14), 20, 21, 24, 25, 26, 27; no S2-A, S2-B, S6-B, S1-C | **≈ −293** | ≈ −255 to −330 |

**Arithmetic (Full, Side 1, B-127, Mids):** −46 −11 −38 −13 −29 −15 −45 +3 −30 −18 −32 −5 −98 −25 +0 +2 −13 −6 +5 −29 +1 −2 −6 −2 = −452; J1 +6, J2 −3, J3 +1 → **−448**.

**Arithmetic (Lean, Mids):** −46 −14 −29 −15 −42 +3 −14 −18 −32 −5 −32 −24 −3 +2 −14 −6 +5 +1 −2 −6 −2 = **−293**.

**Reading the Totals:** every plausible bundle lands inside or beyond Nathan's −200 to −400; the full Side 1 bundle overshoots −400 on these estimates, and the lean bundle sits mid-range. The largest single swing is the resting-cell ruling (≈ 65 lines). Excluded from all bundles: S1-C (−3 to −6), `aliasMemory` (−4), the heading-index lever (≈ −45, unverified), F-062 (+3), resting invalid syntax (+3), and the uncosted fixes (A-59, A-60, A-61, A-68, A-43, A-69, the A-08 body-alias rule ≈ +2, the A-19 adapters ≈ −3 to −6).

---

### 6. Deletion Ledger

Every item proposed for removal, with its measured span and the option that removes it. "Fold" means the code's job survives inside another named function.

#### 6.1 Files

| File | Lines | Removed By | Note |
|---|---|---|---|
| `Core/MarkdownPM/Links/pasteDecision.ts` | 47 | S3-2 | `pastedUrl`'s strict scheme test survives inside the pipeline (A-121) |
| `Core/MarkdownPM/Links/linkFormat.ts` | 86 | S7-B (merge into `linkEdit.ts`/`linkActions.ts`) | Its types and fold go under S3-2/S5-B; its URL actions survive in the merged applier |
| `Core/Properties/Cells/linkResolve.ts` | 8 | S2-C | Commit gate moves into the reader (B-153) |
| `Core/MarkdownPM/Autocomplete/headingTarget.ts` | 28 | S4-C (fold into `headingSource`, ≈ −6 net) | Or deleted outright by the unverified heading-index lever |
| `Core/Connections/aliasMemory.ts` | 9 | Optional (into `editorHost`) | Harness imports the real functions |

#### 6.2 Functions, Constants, and Blocks

| Item | Location | Lines | Removed By |
|---|---|---|---|
| `linkAt`, `aliasSpanAt`, `emptyAliasPipeAt`, `emptyHeadingHashAt` | `connections.ts:42-64` | 23 | B-127 (or replaced by `slotAt` under S4-A, −13 wrappers +8) |
| `titleOf` (export) | `connections.ts:20-22` | 2-3 | S1-A |
| `ConnectionParts` and its spread | `connections.ts:68-73`, `linkValue.ts:32` | ≈ 6 | S1-B |
| `targetNamesTitle` | `links.ts:107-110` | 4 | S1-A |
| `MD_LINK` as a separate grammar | `links.ts:5` | ±0 (rebuilt from `emptyTolerantLinkRegex`) | S1-B |
| `LinkGroups`, `groupsOf`, `offsetOf`, `escapedPipe` | `rewrite.ts:21-26` | 6 | S1-A |
| Title-rename replace bodies | `rewrite.ts:32-59` | 28 | S1-A |
| Heading-rename replace bodies | `rewrite.ts:73-110` | 38 | S1-A (keeps `HEADING_REFERENCE` and setup in the new body) |
| `parseLink`, `LinkValue` | `linkValue.ts:37-42`, `:7` | ≈ 5 | S1-B |
| `parsePastedLink` | `linkValue.ts:48-62` | 15 | S3-1 |
| `urlClickTarget` | `linkValue.ts:64-68` | 5-6 | S2-C |
| `linkAlias` | `linkValue.ts:77-79` | 3-4 | S2-C |
| `ResolveTitle`, optional `resolve?` | `linkValue.ts:9,48,85` | 1 | S2-C |
| `sectionRunsIn`'s link re-match | `scan.ts:30-32` | 3 | S1-C (or S6-C with corrections) |
| `wikiLinkTokens` | `tokens.ts:228-253` | 26 | S1-C (replaced by the occurrence mapping) |
| Slot juggling in `wikiLinkTokens` | `tokens.ts:234-237` | 3 | B-127 |
| `aliasedToken` | `tokens.ts:44-45` | 3 | S6-A/B-127 (its four callers then spell a non-empty test, B-114) |
| `loneEmbedRe` | `detect.ts:400` | 1 | S1-C |
| `webpageEmbedUrlSpan`'s regex re-run | `detect.ts:419-423` | ≈ 2 | `loneWebpageEmbed` returns the span (B-40) |
| `linkInCode` | `edits.ts:324-331` | 8 | B-127 |
| `isInsideWikilink` | `edits.ts:611-627` | 17 | S7-D (`openLinkAt(…) !== null`) |
| `MD_LINK_CLASS` | `decorations.ts:80` | 1 | S6-B (inlined `'md-link'`) |
| `mdLinkClass` | `decorations.ts:82-99` | 18 | S6-B (fold into `linkLook`) |
| Empty-pipe sniff | `decorations.ts:604-608` | 3 | B-127 |
| `claimedEmbeds` call and `conn` gate in `build` | `decorations.ts:474-483` | −10 +4 | S5-C |
| `WikiLinkView`, `linkStatus`, `wikiLinkView` | `connectionsApi.ts:114-118,131-134,136-148` | 22 | S6-B (fold into `linkLook`) |
| `openPage` | `connectionsApi.ts:150-158` | 9 | S5-A |
| `bypass?` member / impl / `openPage` import | `connectionsApi.ts:41`, `pageConnections.ts:41-42`, `linkClicks.ts:8` | 1 / 2 / 1 | S5-A |
| `linkMenuTarget` (fold into `tokenMenuTarget`) | `connectionsApi.ts:76-96` | ≈ 5 net | S5-B |
| `ConnMenuTarget.apply` ×2, `onCell`, per-arm `editable` ×2, url `hasAlias` | `connectionsApi.ts:16-36` | ≈ 5 net | S7-A |
| `resolveMdTarget` export | `connectionsApi.ts:64` | 0 | S8 §6.2 |
| Menu closure block | `linkClicks.ts:139-154` | ≈ 6 | S7-A |
| `wikiAuthorTarget` | `linkEdit.ts:21-36` | ≈ 5 (inlined) | Side 1 (or folded into `linkAuthorEdit` under Side 2) |
| `LinkActionText`, `linkActionText`, `formatted` | `linkFormat.ts:13-17,19-43,45-52` | ≈ 23 with the dispatch block | S3-2 (with Side 1; ≈ −12 without) / Side 2's `linkAuthorEdit` |
| `linkFor` | `pasteLink.ts:17-39` | 23 (minus a re-added `paste`) | S3-2 |
| `PasteInput`, `LITERAL`, `PasteDecision`, `decidePaste` | `pasteDecision.ts:7-46` | in the file | S3-2 |
| `wholeWikiLink`, `PasteAsTarget`, `pasteAsTarget` | `pasteAsMenu.ts:28-47` | 18 | S3-1 |
| Paste As ▸ Plain Text row and arm | `pasteAsMenu.ts:118` and row | 3 | S3-2 (needs Nathan) |
| `WEB_ADDRESS && isHttpLink` copy | `Desktop/Web/webGuests.ts:17-18` | 2 | S3-2 (`isWebAddress`) |
| `menuAt` | `cellStatic.tsx:288-306` | 19 | Side 1 |
| `menuTarget` + doc | `cellStatic.tsx:448-477` | 30 | Side 1 |
| `onSelect` prop and type | `cellStatic.tsx:273,283` | 2 | Side 1 |
| `linkGestures` call collapse / `menuAt` parameter | `cellStatic.tsx:307-313` / `:402` | 5 / 1 | Side 1 (parameter survives with S2-B) |
| Imports `linkActionText`, `wikiAuthorTarget`, `linkAddress`, `tokenMenuTarget`, `Token` | `cellStatic.tsx:33,34,…` | ≈ 5 | Side 1 |
| `LINK_SELECTOR`'s class arms; `mdLinkClass`/`MD_LINK_CLASS` import | `cellStatic.tsx:255`, `:10` | ≈ 2 | S6-B |
| `initialSelect` sites | `MarkdownTable.tsx:153,420,435,459,468-474`; `CellEditor.tsx:109,122,257-258` | 11; 4 | Side 1 |
| `ConnectionCell` and the page branch's imports | `LinkCell.tsx:64-97` + imports | 34 + ≈ 5 | S2-A |
| Title hook body; anchor `onClick` opener | `LinkCell.tsx:34-38`; `:51-56` | 5 → 1; ≈ 4 | S2-C |
| `useWebpageTitle` body | `WebTile.tsx:22-29` | 8 → 1-2 | S2-C |
| Parent link-menu blocks | `TableView.tsx:287-293`, `CardValue.tsx:114-121`, `PropertyPanel.tsx:339-347` (link half) | ≈ 20 | S2-B |
| `linkValueMenuTarget`'s resolve and `apply` filter | `connectionMenuActions.ts:81-102` | ≈ 12 | S2-B / S7-A (once) |
| `LinkCellAction` | `connectionMenuActions.ts:74` | 1 | S7-A / S8 |
| `editable` AND, url `.then` chain, page `switch` | `connectionMenuActions.ts:20-23,33-40,61-70` | 1, 3, 8 | S7-A |
| `resolveConnection` | `treeIndex.ts:283-288` | 6 | S2-C |
| `AcQuery` | `autocomplete.ts:30` | 1 | S4-C |
| `openHeadingRows` | `autocomplete.ts:159-171` | 13 (≈ −8 net) | S4-C |
| `connectionInsert` | `autocomplete.ts:214-222` | ≈ 6 net | S4-C |
| `![[` hand loop | `autocomplete.ts:118-134` | 17 (+7 branch) | S7-D |
| `armed` ref, `measured`, `formRef` + effect, `sectionArmAfter`, listener body | `useConnectionAutocomplete.ts:46-83,242-273` | ≈ 53 (+35) | S4-B |
| Worn-alias re-parse + import | `useConnectionAutocomplete.ts:166-169` | ≈ 6 (+2) | S4-C |
| `viaChevron` + `cameFrom` | `useConnectionAutocomplete.ts:85,182`; `AutocompletePane.tsx:81-90` | ≈ 7 net | S4-C |
| Fake-outline `nested()`; optional pane props + `NONE` | `AutocompletePane.tsx:184`; `:35-45,63-69` | in −8; 2 | S4-C |
| `tableConnections` facet and two props | `widget.tsx:55-56,345,570`; `MarkdownTable.tsx:133`; `cellStatic.tsx:278` | ≈ 6 | S8 §6.4 |
| Second resolve in `buildTiles` | `embedWidget.tsx:405-406` | ≈ 2 | S5-C |
| `md-unresolved-fixed` emission | `cellStatic.tsx:84,87,88,136` | 1-4 | S6-C |

#### 6.3 Types

`ConnectionParts`, `LinkValue`, `PasteAsTarget` (→ `ParsedLink`, S1-B/S3-1); `LinkActionText` (S3-2); `PasteInput`, `PasteDecision` (S3-2); `LinkCellAction` (S7-A/S8); `WikiLinkView` (S6-B); `AcQuery` (S4-C); `ResolveTitle` (S2-C); `LinkGroups` (S1-A); `Token.resolveRange`/`fragment` replaced by slot spans (B-127 only; S8's always-set `resolveRange` is the alternative); `ConnMenuTarget`'s `apply`, `onCell`, duplicated `editable`, url `hasAlias` (S7-A).

#### 6.4 Classes and Attributes

`.cell-connection` (`table.css:258-262`, S2-A); `md-link-invalid` → `md-connection-phantom` and `md-unresolved-syntax` → `md-phantom-syntax` (`markdown-pm.css:233-244`, S6-B); `md-unresolved-fixed` and its three `:not()` clauses (S6-C); `LINK_SELECTOR`'s `.md-link`/`.md-connection-resolved` arms (S6-B; `data-link-span` stays, B-168). `data-conn-title` is already gone at baseline.

---
### 7. Decisions for Nathan

Behavior, naming, placement, and architecture choices the evidence can't settle, ordered by how much of the plan depends on the answer. Each states the options and their costs in product terms. Pure implementation details are left out; *§7.2* lists the architecture calls the planner owns and discloses.

#### 7.1 Product Decisions

1. **Right-Clicking a Link in a Table Cell You Haven't Clicked Into (§3.9):**
   - **Side 1:** At rest, the menu offers only Open, Preview, and Copy; to rename, retarget, reformat, or remove, click into the cell first (as a Text value already works). ≈ 65 fewer lines than Side 2, and it fixes "Format ▸ Page Title leaves the bare domain" (F-043) and "a read-only embedded page offers editing rows" (B-56) by construction.
   - **Side 2:** Keep editing rows at rest; ≈ 32 lines saved instead of ≈ 98, F-043 and B-56 need separate fixes.
   - **B′:** Right-click activates the cell, then reopens the menu inside it (keeps today's rows, ≈ −60, adds a timing handoff; both verifiers advise against it).
   - **Tied Question:** If Side 1, should a Link **property** value at rest keep its Rename / Edit Link / Clear rows (S2-B keeps them)? Those rows open the value's own editor rather than editing text, which may justify the difference; otherwise it's the one resting surface with editing rows (§3.10).
2. **Link Property Pages Behave Like Text-Value Links (S2-A, §3.10):** A Link property naming a page would open in the window's tabs or Preview like every other connection, respect Tab Open Behavior, show phantom and ambiguous colors, show `Alpha § Setup` instead of `Alpha` (and `§Setup` instead of `#Setup`), mark a missing heading, and show a hover glance. Costs: ≈ −38 lines; requires the value menu to move with the value (S2-B) or the cell to decline the link menu; a layout parity probe (P8). The alternative (S5-A's rewire) fixes only routing and Tab Open Behavior.
3. **What a Markdown Link Naming a Title Means When Pasted or Typed Into a Link Property (S3-1, §3.1):** "A page if it resolves; otherwise an address if it's a valid one." Consequences: the Link property starts accepting `[x](example.com)` as `[x](https://example.com)` (the audit's F-042 fix already assumes this); Paste As keeps a copied link's label and heading; `[[T#H]]` (Copy Link's own output) offers Connection and Markdown Link; `[x](#H)` offers nothing instead of writing broken syntax. **Tied:** should a Link property accept `[[#Heading]]` (a heading on its own page), which its cell already draws and opens (S3-3, +2)?
4. **A Markdown Link in a Link Property Naming a Page (A-20, §3.16):** Today it counts as a backlink to that page but isn't updated when the page is renamed, or cleared when it's deleted. Either stop counting it as a backlink, or rename/clear it too (which rewrites `[x](Old)` as `[[New|x]]`, a visible change in the file).
5. **Link Looks (S6-B, S6-C, §3.6):** Four choices, each independent:
   - Should a markdown link to a missing page keep its underline (a connection to a missing page has none)?
   - Should a markdown link to an ambiguous title draw in the ambiguous color, as a connection does?
   - Should **Display Unresolved Links As Plain Syntax** also apply to markdown links' brackets?
   - At rest, should an invalid markdown link show its syntax (as the page does) or its label alone (as cells do now; +3 to change)?
   - **Scope of the Plain-Syntax Setting:** Its docs say "page prose only," but it reaches live cells and the live Text pane and not their resting forms, and it restyles the slash menu. Make "page prose only" true (S6-C), or change the doc to what it does.
   - (Minor) Whether the merged class names carry the word "link."
6. **Paste As ▸ Plain Text (S3-2, §3.11):** Remove it, leaving Paste Without Formatting directly beneath (its one distinct behavior, turning `[Home](url)` into the bare url, has no other request behind it; −3 lines); and pick one word, "plain" or "literal," for leave-as-typed.
7. **Page Embeds in Cells and Text Values (F-054, §3.14):** Take the audit's whole fix, so `![[Page]]` alone on a line in a cell or Text value draws and acts as a connection (≈ +12 net), or only the half that stops the per-caret-move cost (≈ −4 to −7), leaving it unclickable.
8. **Picker Behaviors (§3.12):**
   - **Heading-Index Lever (Unverified):** Read headings from the index instead of the page body (≈ −45 lines), at the cost of not offering a heading typed moments ago until the page saves.
   - **Alias Slide:** The alias list slides in only when the picker opened the slot, not when the caret walks into a typed `|` (S4-C).
   - **`##` → `§`:** Should converting `##` to `§` open the heading list as typing `§` does?
   - **Raw HTML:** Should the picker, slot collapse, and alias memory stand down inside a raw-HTML block on a page, as Enter already does?
   - **With Pair Brackets On:** Under the opener rule, `[[` opens the picker on the brackets rather than the first title character (S7-D's side effect).
9. **A Markdown Link Naming a Page Has No Editing Rows in Its Menu (B-57, §3.8):** It's the one link kind without Rename / Edit Link / Remove; a test pins it as intended. Keep, or give it parity with connections.
10. **Addresses That Aren't Web Pages (S5-D1, A-61, §3.13):** With Open Links In Pommora on, should `mailto:` and other non-http addresses go to the system (and the menu's Preview row hide for them)? Should Page Title be offered for them at all, and should a failed title fetch stop waiting (today it waits until the text changes)?
11. **Links Inside Code (§3.4):** The picker, Enter-commit, slot collapse, alias memory, and the format menu would stand down on any connection the editor draws as code, including half-in-code and fenced cases (a defect fix; listed because it changes what a user sees).
12. **`§` Runs at Rest (B-58, §3.15):** A `§Heading` reference draws as a link in a live cell but not at rest; add it at rest, or accept the difference.
13. **Text Values Sort and Filter on Raw Markdown (A-56, §3.10):** Link values sort by their shown text; Text values by raw source. Intended?
14. **Rectangle Paste and Drag-and-Drop (S3-3, A-60, §3.11):** Should pasting over several table cells and dropping an address format links as a normal paste does?
15. **Product Copy (§3.18):** "Add Title" / "Edit Title" / "Remove Title On Link Change" mean the alias, while "Page Title" means a website's title; "Preview" names both the in-app browser and the Page Window; "External Link" and "Website Link" name one thing, as do "Embedded Link" and "Webpage."
16. **Footnote Row (A-64):** Offered on any non-empty clipboard; minor.

#### 7.2 Architecture and Placement the Planner Owns (Disclosed, Not Asked)

- **One Caret Reader:** B-127 (the drawing's own link reader and code rule, uncosted, ≈ −25 to −35) vs S4-A (a separate reader plus a second code rule, ≈ −13 to −16). Principle favors B-127; the planner costs it before committing (§3.3).
- **One Occurrence Walk for Editor and Index (S1-C):** optional; composes with B-127 (§3.1).
- **Resolution's Home:** move the pure half into `Core/Connections/target.ts` or leave it in `connectionsApi.ts` (§3.5).
- **Link-Liveness Predicates in `Links/` vs Typing Transforms in `Input/`;** where the resting renderer that serves Text values lives (today `Tables/`) (§3.20).
- **`useLinkTitle`'s Home:** `Session/` or `Core/Web/` (§3.13).
- **`linkActions.ts` + `aliasSlots.ts` Split** (§3.8).
- **`tableConnections` Now or With F-094** (§3.17).

---

### 8. Needs Probe

Each probe is a live drive; none has been run. Results feed the plan before the affected option is committed.

| # | Probe | Steps | Expected | Feared | IDs |
|---|---|---|---|---|---|
| P1 | In-app browser with raw, non-http, or invalid addresses | Turn on **Open Links In Pommora**. Click `[x](example.com)` and `[m](mailto:a@b.co)` in a page; give a Link value the hand-written raw text `foo` and `[x](Some%20Page)` and click its text | An in-app window on `https://example.com`; mailto to the system; the invalid value edits or does nothing | A blank in-app window for each (the attach gate refuses anything without a written `http(s)://`, `webGuests.ts:18,150-157`) | A-27, B-54 |
| P2 | Resting-cell Format ▸ Page Title (F-043 confirmation) | In a resting table cell holding `[x](https://example.org)`, choose Format ▸ Page Title with an empty title cache; wait for the fetch; re-render | The label becomes the title | The label stays the domain (the audit states this outcome) | A-58, B-30, B-55 |
| P3 | Read-only embedded page offers link authoring | Embed a page holding a table cell `[[Alpha]]` and `[x](https://example.com)`; leave the tile at rest; right-click each link | Preview / Open / Copy rows only | Authoring rows; Remove does nothing; Rename opens a live cell editor in the read-only tile | B-56 |
| P4 | Pending title swap dies with the cell editor | Set Default Link Format to Page Title; paste a slow-titling address into a live table cell; leave the cell before the fetch lands | The title swaps in | The domain stays | B-158 |
| P5 | Create-ghost during a Link value's menu | In a table view, right-click a Link value, then move the pointer over the add-row hover zone while the menu is open, and again right after dismissing it | No create-ghost | The ghost blooms | B-68 |
| P6 | Paste an address into a wikilink alias | Type `[[Foo\|]]`, place the caret in the alias, ⌘V an `https` URL | Literal text | A nested `[..](..)` and a broken link | A-59 |
| P7 | Drop an address into the body | Drag an `https` URL from a browser into a page | Formatted as a paste | Raw text (CodeMirror's default) | A-60 |
| P8 | Link value layout through `TextCell` (before S2-A) | In a Table, Cards, and the Panel, show a long `[[Page#Heading\|Alias]]` value | Truncation and ellipsis match today's `OverScroll` | Layout differs (`cell-text-host`/`clip`/`line` vs `cell-text-scroll`) | A-102 |
| P9 | Picker `fetched` stale frame | Type `[[A#`, then quickly retarget to `[[B#` | B's headings only | One frame of A's headings for B | A-82 |
| P10 | Raw-HTML stand-down (inferred) | On a page, inside a raw-HTML block, type `[[Foo\|]]`; press Enter; leave the slot; open the picker | Consistent with the draw (no link there) | The picker, slot collapse, and alias memory act | A-37 |
| P11 | Heading lag (inferred) | Add a heading to page B; immediately type `[[B#` in page A, then complete it | The picker and the missing-heading mark agree | The picker offers it while the draw marks it missing until B saves | A-41 |
| P12 | Held alias list (inferred) | In a Text value pane, type `[[#H` then `\|` | An alias list for the holder page | An empty list | A-69 |
| P13 | Embed commit and a typed heading (inferred) | Type `![[Page#H` and pick a page row | The heading is kept or deliberately refused | The typed `#H` is dropped | A-40 |

**Open Costings (Not Drives):** B-127's reader (*§3.3*); the heading-index lever's verification (*§3.12*); the uncosted fixes listed in *§5.2*.

---
### 9. Appendix: Coverage Map

Every ID from both verified briefs, with the section it lands in. "Merged" names the entry it was combined with (same fact); "Dropped" carries the verifier's reason; "Also"/"Cross" names a section that also cites it.

| ID | Lands In | Disposition |
|---|---|---|
| A-01 | §2.4 | Surface counts |
| A-02 | §2.3 | Count and anchor corrections |
| A-03 | §2.4 | Importer lists |
| A-04 | §3.5 |  |
| A-05 | §3.11 |  |
| A-06 | §3.12 |  |
| A-07 | §3.1 | Cross: §3.16 |
| A-08 | §3.16 |  |
| A-09 | §3.1 |  |
| A-10 | §3.16 | Cross: §3.21 |
| A-11 | §3.14 |  |
| A-12 | §3.16 |  |
| A-13 | §3.1 | Merges S3 §2A, S4 §4 |
| A-14 | §3.1 |  |
| A-15 | §3.1 |  |
| A-16 | §3.11 |  |
| A-17 | §3.11 | Merged with B-149 |
| A-18 | §3.5 | Merged with B-53; cross: §3.10 |
| A-19 | §3.5 |  |
| A-20 | §3.16 | Decision 4 |
| A-21 | §3.1 | Merged with B-139 (overlap half); cross: §3.16 |
| A-22 | §3.17 |  |
| A-23 | §3.10 | Merged with B-26 |
| A-24 | §3.10 |  |
| A-25 | §3.10 | Merged with B-51 (glance half) |
| A-26 | §3.10 |  |
| A-27 | §3.10 | Probe P1, merged with B-54 |
| A-28 | §3.10 | Cross: §3.6 |
| A-29 | §3.13 | Merged with B-32 |
| A-30 | §3.11 | Merged into the address-gate entry with B-34 |
| A-31 | §3.11 | Merged into B-34 |
| A-32 | §3.11 |  |
| A-33 | §3.11 | Merged with B-30, B-31; cell arm in §3.9 |
| A-34 | §3.11 |  |
| A-35 | §3.11 |  |
| A-36 | §3.3 | Gate list merged into §3.4 with B-35 |
| A-37 | §3.3 | Probe P10 |
| A-38 | §3.12 | Merged with B-69 |
| A-39 | §3.3 |  |
| A-40 | §3.2 | Probe P13 (inferred half) |
| A-41 | §3.12 | Probe P11 |
| A-42 | §3.12 |  |
| A-43 | §3.12 |  |
| A-44 | §3.3 |  |
| A-45 | §3.4 | Merged with B-35 (gate 2) |
| A-46 | §3.16 |  |
| A-47 | §3.2 |  |
| A-48 | §3.18 |  |
| A-49 | §3.19 |  |
| A-50 | §3.1 | Trap |
| A-51 | §3.10 |  |
| A-52 | §3.10 |  |
| A-53 | §3.10 |  |
| A-54 | §3.20 |  |
| A-55 | §3.5 |  |
| A-56 | §3.10 | Decision 13 |
| A-57 | §3.11 | Merged with B-147 |
| A-58 | §3.9 | Ruled = F-043, not new; probe P2 |
| A-59 | §3.11 | Probe P6 |
| A-60 | §3.11 | Probe P7 |
| A-61 | §3.13 | Row half in §3.11 |
| A-62 | §3.10 |  |
| A-63 | §3.11 |  |
| A-64 | §3.11 | Decision 16 |
| A-65 | §3.12 |  |
| A-66 | §3.12 | Decision 8 |
| A-67 | §3.12 |  |
| A-68 | §3.12 |  |
| A-69 | §3.12 | Probe P12 |
| A-70 | §3.12 | Also §3.3, §3.20 |
| A-71 | §3.12 | Merged with B-137 (comment) |
| A-72 | §3.16 |  |
| A-73 | §3.16 |  |
| A-74 | §3.5 | Cross: §3.20 |
| A-75 | §3.10 |  |
| A-76 | §3.5 |  |
| A-77 | §3.10 |  |
| A-78 | §3.8 | Merged with B-81 |
| A-79 | §3.11 |  |
| A-80 | §3.11 |  |
| A-81 | §3.2 | Cross: §3.14 |
| A-82 | §3.12 | Probe P9 |
| A-83 | §3.17 |  |
| A-84 | §3.12 | Dropped (trap list): unmeasured, no mechanism |
| A-85 | §3.18 | Merged with B-93 |
| A-86 | §3.18 | Merged with B-94 |
| A-87 | §3.18 |  |
| A-88 | §3.18 | Merged with B-85 |
| A-89 | §3.18 | Merged with B-95 |
| A-90 | §3.18 | Merged with B-105 |
| A-91 | §3.18 | Merged with B-105 |
| A-92 | §3.18 |  |
| A-93 | §3.18 | Cross: §3.20 |
| A-94 | §3.18 | Also §3.19, §3.20 |
| A-95 | §3.18 | Cross: §3.10 |
| A-96 | §3.18 |  |
| A-97 | §3.18 | Copy half in Decision 15 |
| A-98 | §3.16 |  |
| A-99 | §3.1 | Pieces in §3.2, §3.5 |
| A-100 | §3.1 |  |
| A-101 | §3.17 |  |
| A-102 | §3.10 | Probe P8 |
| A-103 | §3.10 |  |
| A-104 | §3.10 | Also §3.5 (resolver), §3.13 (hook placement) |
| A-105 | §3.1 |  |
| A-106 | §3.1 | Ruled: change already assumed by audit F-042 |
| A-107 | §3.11 |  |
| A-108 | §3.11 |  |
| A-109 | §3.3 | Ruled vs B-127 |
| A-110 | §3.12 |  |
| A-111 | §3.12 |  |
| A-112 | §3.12 | Ruled: superseded on cost by B-120 |
| A-113 | §5.1 |  |
| A-114 | Would Go False | §3.1, §3.10, §3.11, §3.12, §3.16 |
| A-115 | Would Go False | §3.2, §3.5, §3.10, §3.11, §3.12, §3.16 |
| A-116 | Would Go False | §3.1, §3.2, §3.5, §3.10, §3.11, §3.12, §3.16 |
| A-117 | §3.11 |  |
| A-118 | §3.11 | Cross: §3.17 |
| A-119 | §3.11 | Cross: §3.9 |
| A-120 | §3.11 |  |
| A-121 | §3.11 |  |
| A-122 | §3.11 | Cross: §3.19 |
| A-123 | §3.1 |  |
| A-124 | §3.1 | Cross: §3.16 |
| A-125 | §3.4 |  |
| A-126 | §3.1 |  |
| A-127 | §3.1 |  |
| A-128 | §3.3 |  |
| A-129 | §3.16 |  |
| A-130 | §3.5 |  |
| A-131 | §3.16 |  |
| A-132 | §3.1 |  |
| A-133 | §3.1 |  |
| A-134 | §3.10 |  |
| A-135 | §3.5 | Also §3.10 |
| A-136 | §3.10 | Also §3.8 |
| A-137 | §3.10 |  |
| A-138 | §3.7 | Also §3.10 |
| A-139 | §3.10 |  |
| A-140 | §3.12 | Also §3.3 |
| A-141 | §3.16 | Also §3.2 |
| A-142 | §3.1 | Merged into A-15 |
| A-143 | §3.3 | Merged into A-36 |
| A-144 | §3.1 | Merged into A-105, A-106 |
| A-145 | §3.11 | Merged into A-107 |
| A-146 | §3.10 | Merged into A-103 |
| A-147 | §3.10 | Merged into A-102 |
| A-148 | §3.13 | Merged into A-29 |
| A-149 | §3.10 | Merged into A-23 |
| A-150 | §3.1 | Merged into A-09 |
| A-151 | §3.11 | Merged into A-31 / B-34 |
| A-152 | §3.13 | Merged into A-104 (placement) |
| A-153 | §3.3 | Merged into A-109 |
| A-154 | §3.12 | Merged into A-114 |
| A-155 | §3.2 | Merged into A-141 |
| A-156 | §3.13 | Merged into A-61 |
| A-157 | §3.12 | Dropped (= A-84) |
| A-158 | §3.16 | Dropped: subsumed by A-98's span count |
| A-159 | §3.1 | Merged into A-99 |
| A-160 | §3.12 | Merged into A-111 |
| A-161 | §5.1 | Merged into A-113 |
| B-01 | §3.13 | Also §2.4 |
| B-02 | §3.13 | Also §2.4, §3.20 |
| B-03 | §3.7 | Also §2.3, §2.4 |
| B-04 | §2.4 | Also §3.20 |
| B-05 | §3.13 | Also §2.4 |
| B-06 | §2.4 |  |
| B-07 | §2.4 | Also §2.3 |
| B-08 | §3.13 | Also §2.4 |
| B-09 | §3.8 | Also §2.4 |
| B-10 | §3.10 | Also §2.4 |
| B-11 | §3.14 | Also §2.4 |
| B-12 | §3.15 | Also §2.4 |
| B-13 | §3.2 | Also §3.14 |
| B-14 | §2.4 |  |
| B-15 | §3.14 | Corrected anchors in §2.3 |
| B-16 | §3.6 | Also §2.4 |
| B-17 | §3.21 | Also §2.4 |
| B-18 | §3.9 | Also §2.4 |
| B-19 | §2.4 |  |
| B-20 | §3.3 | Also §2.4 |
| B-21 | §2.3 | Also §3.20 |
| B-22 | §3.7 | Also §2.4 |
| B-23 | §2.4 |  |
| B-24 | §2.3 |  |
| B-25 | §2.4 | Cross: §3.19 |
| B-26 | §3.10 | Merged with A-23 |
| B-27 | §3.5 | Cross: §3.19 |
| B-28 | §3.8 |  |
| B-29 | §3.8 |  |
| B-30 | §3.11 | Merged with A-33; half copy in §3.9 |
| B-31 | §3.11 | Merged with A-33 |
| B-32 | §3.13 | Merged with A-29 |
| B-33 | §3.14 | Cross: §3.21 |
| B-34 | §3.11 |  |
| B-35 | §3.4 |  |
| B-36 | §3.3 | Also §3.4 |
| B-37 | §3.6 |  |
| B-38 | §3.6 |  |
| B-39 | §3.6 | Cross: §3.21 |
| B-40 | §3.14 |  |
| B-41 | §3.6 |  |
| B-42 | §3.8 |  |
| B-43 | §3.2 |  |
| B-44 | §3.2 |  |
| B-45 | §3.3 |  |
| B-46 | §3.7 |  |
| B-47 | §3.7 |  |
| B-48 | §3.5 |  |
| B-49 | §3.17 |  |
| B-50 | §3.3 | Also §3.6 |
| B-51 | §3.10 |  |
| B-52 | §3.10 |  |
| B-53 | §3.5 | Merged with A-18 |
| B-54 | §3.13 | Probe P1, merged with A-27 |
| B-55 | §3.9 |  |
| B-56 | §3.9 | Probe P3 |
| B-57 | §3.8 | Decision 9 |
| B-58 | §3.15 | Decision 12 |
| B-59 | §3.15 |  |
| B-60 | §3.6 |  |
| B-61 | §3.6 |  |
| B-62 | §3.6 |  |
| B-63 | §3.6 | Decision 5 |
| B-64 | §3.6 |  |
| B-65 | §3.15 |  |
| B-66 | §3.6 | Also §3.20 |
| B-67 | §3.8 |  |
| B-68 | §3.10 | Probe P5 |
| B-69 | §3.12 | Merged with A-38 |
| B-70 | §3.8 |  |
| B-71 | §3.8 |  |
| B-72 | §3.5 |  |
| B-73 | §3.9 |  |
| B-74 | §3.13 |  |
| B-75 | §3.13 |  |
| B-76 | §3.3 |  |
| B-77 | §3.7 |  |
| B-78 | §3.6 |  |
| B-79 | §3.15 | Also §3.21 |
| B-80 | §3.8 | Merged with B-67 |
| B-81 | §3.8 |  |
| B-82 | §3.5 |  |
| B-83 | §3.18 |  |
| B-84 | §3.18 |  |
| B-85 | §3.18 | Merged with A-88 |
| B-86 | §3.18 |  |
| B-87 | §3.18 |  |
| B-88 | §3.18 | Decision 15 |
| B-89 | §3.18 | Cross: §3.13 |
| B-90 | §3.18 |  |
| B-91 | §3.18 |  |
| B-92 | §3.18 | Decision 15 |
| B-93 | §3.18 | Merged with A-85 |
| B-94 | §3.18 | Merged with A-86 |
| B-95 | §3.18 | Merged with A-89 |
| B-96 | §3.18 |  |
| B-97 | §3.18 | Also §3.6 |
| B-98 | §3.20 |  |
| B-99 | §3.18 |  |
| B-100 | §3.18 | Also §3.8 |
| B-101 | §3.18 |  |
| B-102 | §3.18 |  |
| B-103 | §3.18 |  |
| B-104 | §3.18 |  |
| B-105 | §3.18 | Also §3.2 |
| B-106 | §3.13 | ConnectionCell half in §3.10 |
| B-107 | §3.9 |  |
| B-108 | §3.9 |  |
| B-109 | §3.14 |  |
| B-110 | §3.13 |  |
| B-111 | §3.13 |  |
| B-112 | §3.7 |  |
| B-113 | §3.13 |  |
| B-114 | §3.3 |  |
| B-115 | §3.6 |  |
| B-116 | §3.6 | sectionRunsIn half in §3.15 |
| B-117 | §3.8 |  |
| B-118 | §3.9 | Applier merge in §3.8 |
| B-119 | §3.7 |  |
| B-120 | §3.12 |  |
| B-121 | §3.2 |  |
| B-122 | §3.18 |  |
| B-123 | §3.19 | Also §3.3 |
| B-124 | §3.20 |  |
| B-125 | §3.17 |  |
| B-126 | §5.1 |  |
| B-127 | §3.3 | Ruling |
| B-128 | §3.9 | Ruling |
| B-129 | §5.1 | Ledger |
| B-130 | §3.10 | Also §3.13 |
| B-131 | §3.9 |  |
| B-132 | §3.14 |  |
| B-133 | §3.3 |  |
| B-134 | §3.6 |  |
| B-135 | §3.8 |  |
| B-136 | §3.9 | Also §3.7 |
| B-137 | §3.12 |  |
| B-138 | §3.19 | Also §3.3, §3.8 |
| B-139 | §3.1 |  |
| B-140 | §3.5 |  |
| B-141 | §3.16 |  |
| B-142 | §3.6 |  |
| B-143 | §3.8 |  |
| B-144 | §3.9 |  |
| B-145 | §3.10 |  |
| B-146 | §3.18 |  |
| B-147 | §3.11 |  |
| B-148 | §3.14 |  |
| B-149 | §3.11 |  |
| B-150 | §3.13 |  |
| B-151 | §3.14 |  |
| B-152 | §3.9 |  |
| B-153 | §3.5 |  |
| B-154 | §3.7 |  |
| B-155 | §3.7 |  |
| B-156 | §3.13 |  |
| B-157 | §3.11 | Also §3.13 |
| B-158 | §3.9 | Probe P4 |
| B-159 | §3.15 | Also §3.7 |
| B-160 | §3.14 |  |
| B-161 | §3.13 |  |
| B-162 | §3.14 |  |
| B-163 | §3.3 |  |
| B-164 | §3.3 |  |
| B-165 | §3.3 | Also §3.21 |
| B-166 | §3.1 |  |
| B-167 | §3.1 |  |
| B-168 | §3.6 |  |
| B-169 | §3.6 |  |
| B-170 | §3.6 |  |
| B-171 | §3.3 |  |
| B-172 | §3.6 |  |
| B-173 | §3.15 |  |
| B-174 | §3.6 |  |
| B-175 | §3.9 |  |
| B-176 | §3.9 | Also §3.2 |
| B-177 | §3.12 |  |
| B-178 | §3.12 |  |
| B-179 | §2.3 | Merged with B-69 |
| B-180 | §3.7 |  |
| B-181 | §3.7 |  |
| B-182 | §3.3 |  |
| B-183 | §3.8 |  |
| B-184 | §3.18 |  |
| B-185 | §3.5 |  |
| B-186 | §3.5 |  |
| B-187 | §3.5 |  |
| B-188 | §3.5 |  |
| B-189 | §3.3 |  |
| B-190 | §3.17 |  |
| B-191 | §3.3 | Dropped: no linkInCode test case exists |
| B-192 | §3.9 | Dropped: live is read by claimCheckbox |
| B-193 | §3.10 | Dropped: PropertiesPM.md:83 is literally true |
| B-194 | §3.13 | Dropped: both surfaces share the title cache |
| B-195 | §3.6 | Dropped as a completeness claim |
| B-196 | §3.3 | Dropped: commitAliasOnEnter is page-only |
