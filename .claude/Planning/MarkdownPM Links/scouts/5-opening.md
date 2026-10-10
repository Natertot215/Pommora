## Scout 5 — Opening Links, Page Titles, Embeds, and Citations

All claims verified by reading unless marked **Inferred**. In-flight files (`Core/MarkdownPM/Links/*`, `decorations.ts`, `Engine/tokens.ts`, `Engine/detect.ts`, `Tables/cellStatic.tsx`, `Input/format.ts`) are cited by function name; cellStatic line counts are taken from the tree as it stands (486 lines).

### Answers to the Three Questions

**Open routers:** Addresses have **one** adjudicator, `openWebLink` (`Core/Web/openWebLink.ts:7`), and every click reaches it: `resolveFollow` through `EditorHost.openLink` (`Core/Pages/editorHost.tsx:138`), `TextCell.tsx:41`, `LinkCell.tsx:55`, the three `valueClickIntent` `open:` handlers (`PropertyPanel.tsx:301`, `CardValue.tsx:94`, `TableView.tsx:155`), `WebTile.tsx:174`, and `web:popup` (`useBridgeSubscriptions.ts:110`). The only paths around it are explicit user picks (`connectionMenuActions.ts:35-36` Preview / Open In Browser, `WebWindow.tsx:85`). Pages have **four** routes:

1. `resolveFollow` → `openPage` (`connectionsApi.ts`) → `ConnectionsApi.open` / `.bypass` (`Session/pageConnections.ts:37-42`), which honors **Open Connections In Preview**. Used by the body, live cells, TextPane, resting cells, `TextCell`, and footnote markers.
2. `LinkCell`'s `ConnectionCell` → raw `select(..., { newTab: isCmd(e), heading })` (`LinkCell.tsx:73-90`), which resolves through `resolveConnection(tree)` rather than the bundle and ignores Open Connections In Preview.
3. The connection menu's verbs → `runPageAction` (`pageMenuActions.ts:44-50`), which is an explicit choice and earns its place.
4. View rows and tiles (`useViewInteractions.tsx:367-383`, `TileHost.tsx:237-239`), which honor the collection's `openIn`. That's a different concept, since opening a row isn't following a link.

There are four target types for a follow: page+heading, same-page heading (`self`), address, and invalid. Every editor-hosted surface takes all four through `resolveFollow`. **The odd one out:** a Link property holding `[[Page]]` sits beside a Text property holding `[[Page]]` (`Cell.tsx:131` vs `:141`), and the two open through different machinery under different settings. The Link cell also has no glance on either kind.

**Reuse by embeds and citations:** Footnote markers reuse the link layer correctly. `followCitation` (`citationPointer.ts:30-45`) runs `loneTarget` → `tokenTarget` → `followTarget`, and `citationPointer` is one `pointerHandlers` spec. A `§` run reuses `resolveFollow` through `sectionRunAt` in `linkClicks.ts`. That's an earned DOM-class hit, since no token holds a run. Page embeds share nothing with the link layer: no hover, no click, and no menu, because the tile replaces the line. The parallel copy is the **claim**, which is computed twice, once in `decorations.ts` `build` and once in `embedWidget.tsx` `buildTiles`. Embed recognition has three grammars: `pageEmbedPattern` (tokens and the index scan), `loneEmbedRe` and `loneWebpageEmbed` (`Engine/detect.ts`), and `Connections/scan.ts:92`. They do different jobs: inline tokens, lone-line tiles, and the index.

**Pending titles:** The write-time swap is one mechanism: `linkPaste.wantsTitle` → `awaitTitle` → `pendingTitles` → `sweepOnTitles` (`pendingTitle.ts`). Its two writers each restate the announce-and-fetch pair: `pasteLink.ts` (the dispatch with `awaitTitle`, then `linkTitles.resolve`) and `applyUrlLinkAction` in `linkFormat.ts`. The display-time read is a second, separate model, written twice by hand: `LinkCell.tsx:33-38` and `WebTile.tsx:20-30` (`useWebpageTitle`). Both models are genuine, because one writes the title into source and the other renders it from the cache. The resting cell is where they break: it runs the write-time action with no editor to carry `awaitTitle` (F-043).

### 1. Surface Map

| File | Lines | Rule It Owns | Readers | Why Separate |
| --- | --- | --- | --- | --- |
| `Core/Web/openWebLink.ts` | 11 | The open-in-app vs. system-browser decision for an address | 8 sites listed above | It's the one adjudicator, so it can't live in the editor, which is host-agnostic |
| `Core/Web/handlers.ts` | 57 | Title cache, `link:open`, guest zoom/pause | `Contract/serve.ts:14` | Host-run handlers |
| `Core/Web/titleScan.ts` | 46 | `<title>` extraction and the timeout | `Desktop/Web/linkTitles.ts:3`, `GlancePane.tsx:4` | It's pure, shared by main and the renderer |
| `Core/Web/guest.ts` | 4 | Partition and guest class constants | `Desktop/Web/webGuests.ts:5`, `MarkdownPM/folding.ts:17` | Import-free leaf |
| `Links/linkClicks.ts` | 158 | `linkPointer`, `followTarget`, `heldTarget`, `resolveFollow`, `dwellTarget`, `sectionRunAt` | `surface.ts:51`, `cellStatic.tsx` (`claimLink`, `linkGestures`), `TextCell.tsx:41`, `citationPointer.ts:42` | The one follow and dwell answer |
| `Links/connectionsApi.ts` | 158 | `MdTarget`, `ConnMenuTarget`, `ConnectionsApi`, target resolution (`titleTarget`, `resolveMdTarget`, `tokenTarget`), menu-target builders, `wikiLinkView`, `openPage` | Every link surface | Types and resolution |
| `Links/pendingTitle.ts` | 74 | Write-time title swap | `surface.ts:54`, `pasteLink.ts`, `linkFormat.ts` | Editor state |
| `Links/linkFormat.ts` | 86 | `linkActionText` (pure) and `applyUrlLinkAction` | `linkClicks.ts`, `cellStatic.tsx:33` | The pure half exists only for the resting cell (see §4) |
| `Session/pageConnections.ts` | 56 | Building `ConnectionsApi` per mode (`preview`, `window`, `inert`) | 8 readers (GlancePane, PageHistoryWindow, WindowTabBody, PageView, TextPane, PropertyPanel, TileHost, useViewHost) | Session-side bundle |
| `Interface/Menus/connectionMenuActions.ts` | 103 | `showConnectionMenu` and `linkValueMenuTarget` | `pageConnections.ts:43`, `PropertyPanel.tsx:344`, `CardValue.tsx:115`, `TableView.tsx:288` | It's the menu runner |
| `Properties/Cells/LinkCell.tsx` | 97 | Link property rendering, open, and display-time title | `Cell.tsx:131` | Display formats, color, and underline |
| `Properties/Cells/TextCell.tsx` | 82 | A resting Text value's links | `Cell.tsx:141` | Reuses `linkGestures` and `resolveFollow` |
| `Embeds/embedWidget.tsx` | 717 | Tile field, claim → tile, heights and zooms, atomic ranges | `MarkdownEditor.tsx`, `gripMenu.ts`, autocomplete | Only resize, zoom, and atomic logic live here; little of it is link machinery |
| `Engine/embedClaims.ts` | 25 | `claimedEmbeds`, `embeddable` | `embedWidget.tsx:405`, `decorations.ts` `build`, autocomplete | The claim predicate |
| `Embeds/embedInsert.ts` | 61 | Lone-line insertion of `![[]]` and `![]()` | `Menus/menu.ts:10`, `pasteLink.ts:11` | Has no link resolution |
| `Citations/citationPointer.ts` | 131 | Marker follow and menu, row follow, row menu, `loneTarget` | `surface.ts:52`, `MarkdownEditor.tsx:161`, `cellStatic.tsx:36` | Footnote gestures |
| `Citations/citationActions.ts` | 159 | Insert, edit, copy, delete, renumber | `markdownInput.ts:48`, `pasteLink.ts:9`, `menu.ts:9` | No link machinery |
| `Citations/citationEdits.ts` | 171 | Pure change builders | `citationActions.ts`, `citationGuard.ts`, `markdownInput.ts`, `pasteLink.ts` | No link machinery |
| `Citations/citationMenu.ts` | 23 | Menu model | `editorHost.tsx:103` | — |
| `Assets/assetWrite.ts` | 35 / `adoptFile.ts` 71 | Write an asset and return `connectionText(file)` (`[[name.ext]]`) | `filePick.ts:54` (via `assets:adopt`), `setProfileImage.ts:12`, `assetMigrate.ts:198` | They reuse `connectionText`, and they write File-property and settings values rather than embed syntax. Nothing to fold |

### 2. Duplicated or Parallel Rules

- **Page-open routing is written twice.** `pageConnections.ts:37-42` (`open` honors `inWindow`, `bypass` forces a new tab) and `LinkCell.tsx:87-90` (`select` with `newTab: isCmd(e)`). `ConnectionCell` drops the preview setting and the `window` mode. This is **drift**: `ConnectionsPM.md:34` states the routing rule for "a connection" without exception.
- **The page resolver has two front doors.** `ConnectionsApi.resolve` (the `PageIndex` spread, `pageConnections.ts:30`) and `resolveConnection(tree, title)` (`treeIndex.ts:284`). The latter is used by `LinkCell.tsx:75`, `connectionMenuActions.ts:90`, and `linkResolve.ts:8`. Both read the same `pageIndexOf`, but `resolveConnection` collapses ambiguous to null. For the Link-property **commit gate** that's correct (see §8). For the click path it's drift, since `titleTarget` already returns `invalid/ambiguous`.
- **The menu target is built four ways.** `tokenMenuTarget` (body and live cell), `linkMenuTarget` (read-only resting surfaces, `cellStatic.tsx` `linkGestures.readOnlyMenu`), `cellStatic.tsx` `menuTarget` (an editable resting cell), and `linkValueMenuTarget` (`connectionMenuActions.ts:76-103`). `linkMenuTarget` is `tokenMenuTarget` with `tk` undefined. `tokenMenuTarget` already accepts `tk?: Token`, so the read-only builder is a strict special case. The Link-value builder is genuinely different, since it adds cell actions and resolves from a stored value.
- **The editable flag is stated twice.** `ConnMenuTarget.editable` (`connectionsApi.ts:25,32`) and the presence of `apply` are combined at `connectionMenuActions.ts:23` as `(target.editable ?? true) && target.apply !== undefined`. Every constructor sets either `editable: true` (`tokenMenuTarget`, `linkValueMenuTarget:84`) or `editable: false` with no `apply` (`linkMenuTarget`), so `editable` never changes the outcome. That's drift.
- **Announce-and-fetch is written twice.** The `awaitTitle.of(...)` effect and the `linkTitles.resolve(url)` call appear as a pair in `pasteLink.ts` (`writeLink`) and in `linkFormat.ts` `applyUrlLinkAction`. A third, half copy in `cellStatic.tsx` `menuTarget` fetches with no announce (F-043).
- **The display-time title hook is written twice.** `LinkCell.tsx:33-38` and `WebTile.tsx:20-28` repeat the same subscribe, resolve, and `useEffect` lines. Their `wantsTitle` gates differ (`!alias && isHttpLink` vs. `label === ''`), and each is correct for its own source.
- **The embed claim is computed twice.** `decorations.ts` `build` runs `claimedEmbeds(scan.embeds, t => conn.resolve(t).status)` on **every build**, including caret moves, to suppress claimed tokens. `embedWidget.tsx:405-409` runs it again, then calls `conn.resolve(e.title)` a **second** time per claim at `:406`. The `build` copy is a hard-rule violation: O(embed lines) resolves plus `normalizeTitle` allocations on a high-frequency trigger. `embedTileRanges(state)` (`embedWidget.tsx:647`) already holds the answer. The audit's F-054 covers the claim half, and it hasn't landed.
- **The address gate is spelled four ways.** `isValidLink` (validity), `isHttpLink` (`urlPath.ts:20`), `WEB_ADDRESS.test(normalizeLinkUrl(x))` (`dwellTarget` in `linkClicks.ts`), and `WEB_ADDRESS.test(x) && isHttpLink(x)` (`Desktop/Web/webGuests.ts:18`, `loneWebpageEmbed`). `dwellTarget`'s spelling is `isHttpLink` restated, since its input already passed `isValidLink`. The written-scheme variants are genuine, because tile formation and the attach gate must see what was typed.

### 3. Odd-Ones-Out

- **A Link property's page link** opens through `select`, ignores Open Connections In Preview, has no glance, and draws no phantom or ambiguous tone. The open-route part is drift (§2). The rendering part is already admitted at `ConnectionsPM.md:73`.
- **A Link property's bare `[[#Heading]]`** follows to its holder (`LinkCell.tsx:75`) but gets **no menu**. `linkValueMenuTarget` runs `resolveConnection(tree, '')` (`connectionMenuActions.ts:90`), which returns null for an empty title, because `resolve` looks up `byTitle.get('')` and returns phantom (`Connections/pageIndex.ts:34-36`). A Text value's bare heading gets a menu through `heldTarget` (`cellStatic.tsx` `linkGestures`). That's drift.
- **The in-app browser receives an unnormalized address.** `openWebLink`'s in-app arm passes `url` raw to `openBrowser` (`openWebLink.ts:9`), which reaches `WebGuest src={url}` (`WebWindow.tsx:97`). The system arm normalizes (`Web/handlers.ts:41`), and the glance normalizes (`dwellTarget`). `resolveMdTarget` yields `external` for any `isValidLink` target, including a schemeless `example.com` or a `mailto:`. With **Open Links In App** on, those reach a guest whose attach `webGuests.ts:157` refuses (`!WEB_ADDRESS`), so the result is a blank browser window. `dwellTarget`'s doc comment shows this exact case was handled for the glance and missed for the open. The menu's **Preview** row has the same flaw (`connectionMenuActions.ts:35`). **Inferred** that the window shows blank: the refusal itself is verified, but the window wasn't driven.
- **The resting cell offers editor-only actions.** Format ▸ Page Title is offered because `showConnectionMenu` defaults `surface` to `'editor'` (`connectionMenuActions.ts:22`). The resting cell then commits a short-form label whose title never arrives (F-043).
- **A markdown link naming a page** gets a read-only page menu in an editable editor. `tokenMenuTarget` routes everything but a wikiLink→page to `linkMenuTarget`, where `editable: false` applies. An address link in the same editor gets Rename and Edit Link, and `applyUrlLinkAction` would serve a page target unchanged. `cellLinks.test.tsx:317` pins it as intended, so it's a decision rather than drift, but it's the one link kind without authoring.
- **A `§` run** draws in a live cell (`decorations.ts` `build`, the `inPageHeadingResolution` block) but not in a resting cell: `renderCellContent` has no `sectionRunsIn` pass. A cell therefore changes appearance on entry. **Inferred** from reading. Not driven.
- **Citation hover:** a marker whose footnote is one link follows that link on click (`followCitation`) but never glances (`dwell: () => null`, `citationPointer.ts:62`). That's defensible, since the glyph is a footnote rather than a link. Listed only so it's a conscious choice.

### 4. Self-Induced Machinery

- **The resting cell's editable link menu.** `cellStatic.tsx` `menuAt` and `menuTarget`, the `live` `useLatest` and its `still()` re-find, `onSelect` → `MarkdownTable.tsx:468-474` plus the `initialSelect` ref (`MarkdownTable.tsx:153,420,435,459,471`, `CellEditor.tsx:109,122,248,257-258`), and the pure splits `wikiAuthorTarget` (`linkEdit.ts`, whose doc comment says "Pure of any editor, because a connection in a resting table cell has none") and `linkActionText` (`linkFormat.ts`, whose only other caller is `applyUrlLinkAction`). The need comes from offering editor actions on a surface that has no editor (`Editor-Internals.md:17`). Rename and Edit Link already *enter the cell* (`onSelect`), so only Add Title's pipe, Remove, Delete, and Format write in place. That in-place write is exactly where F-043 breaks. Removing the cause, by having the resting cell offer the read-only menu with authoring arriving once the cell is live, deletes all of it.
- **`openPage` plus the optional `bypass`.** `bypass` is optional only because the `inert` bundle omits it (`pageConnections.ts:34`), so `openPage` exists to fall back. One `open(page, heading, newTab)` deletes the helper and the member.
- **Claim suppression in `build`** exists because `decorations.ts` doesn't read the tile field's ranges (§2).
- **`EditorHost.openLink`** has one production value (`editorHost.tsx:138`) plus the harness spy (`editorHarness.ts:122`). It's the editor's host seam for an address, parallel to `ConnectionsApi.open` for a page. It's earned while MarkdownPM stays host-agnostic: `openWebLink` imports the Session store, which MarkdownPM never does (only `folding.ts:17` reaches `Core/Web`, for a constant). It isn't self-induced, but two seams carry one "follow" verb.

### 5. Confusing Names

- **A web address has four names:** `external` (`MdTarget`, `connectionsApi.ts:49`), `url` (`LinkTarget`, `linkValue.ts:13`, and `ConnMenuTarget`, `connectionsApi.ts:30`), `site` (`GlanceTarget`, `api.ts:75`), and `webpage` (`TileRange`, `embedWidget.tsx:62`, and `TileMount`, `api.ts:151`). Token kind `'link'` means a markdown link whatever it targets.
- **`*Target` means three things:** `titleTarget` and `tokenTarget` return an `MdTarget`, `linkTarget` (`tokens.ts`) returns the raw address **string**, and `LinkTarget` (`linkValue.ts:11`) is a third, unresolved union. `urlClickTarget` (`linkValue.ts:64`) returns a string, and `loneTarget` (`citationPointer.ts:19`) returns `{text, tk}`.
- **`openPage` names three different functions:** `connectionsApi.ts` (the link follow), `useViewInteractions.tsx:367` (a row open), and `tile.openPage` (`useViewInteractions.tsx:377`).
- **The address-open names don't line up:** `openLink` (EditorHost), `openWebLink` (the adjudicator), `'link:open'` (the IPC channel, which opens the **system** browser only), and `openBrowser` (in-app). `'link:open'` reads like the generic one and is the narrow one.
- **"Page Title"** (`LINK_DISPLAY_LABELS['link-title']`, `properties.ts:120`) means a *website's* `<title>`, and it collides with Pommora's Page concept and with `EditorHost.pageTitle()` (`api.ts:195`, the Pommora page's title). `linkTitles` holds website titles.
- **`pendingTitle`, `pendingTitles`, and `PendingTitle`** (an extension, a field, and a type) all live in one 74-line file.
- **Holder vs. held:** `holder` (`LinkCell`/`TextCell` props), `OwnPage { kind: 'held' }`, `heldPage` (facet), and `heldTarget` all name one concept, the page a value sits on, in two words.
- **The `Conn` prefix covers non-connections:** `ConnMenuTarget{kind:'url'}`, `ConnUrlAction`, `ConnSiteAction`, and `ConnectionsApi` all carry markdown-link and address behavior.
- **`link:window` vs. `title:window`:** both show the label "Preview", one for a site and one for a page (`connectionMenu.ts:30`, `pageMenu.ts:73`).

### 6. Approaches

**A. One Page-Open Route (−13 to −16)**

`ConnectionsApi.open(page, heading?, newTab?)` replaces `open` plus `bypass`. `pageConnections.ts` gets `if (inWindow && !newTab) openWindowTab(...) else void select(ref, { newTab: newTab || undefined, heading })`, keeping the "no option means the tab preference decides" rule from `useViewInteractions.tsx:369`. `resolveFollow` calls `api.open(named.page, named.heading, isCmd(event))`. `ConnectionCell` takes `connections` (passed at `Cell.tsx:131` as `TextCell` does) and follows through `resolveFollow(titleTarget(api, title, heading), own, api, e, openWebLink)`, dropping `select`, `tree`, `resolveConnection`, and `isCmd`.

- **Arithmetic** (`connectionsApi.ts` 158, `linkClicks.ts` 158, `pageConnections.ts` 56, `LinkCell.tsx` 97, `Cell.tsx` 240): `openPage` −9, `bypass?` member −1, `bypass` impl −2, `openPage` import −1, `open` body ±0, `ConnectionCell` about −4 (two `useSession` subscriptions, `resolveConnection` and `isCmd` imports, the resolve line) +3 (the `connections` prop and its type, `Cell.tsx`'s pass). Net about **−14**.
- **User-visible:** a Link property's `[[Page]]` honors Open Connections In Preview and ⌘-click as a Text value's does. A Link value naming an ambiguous title stops opening the first match (it already opens nothing, since `resolveConnection` nulls ambiguity, so this is unchanged).
- **Depends on:** nothing in flight. `connectionsApi.ts` and `linkClicks.ts` are in-flight files, so this lands after Link Gestures.

**B. The Editable Link Menu Lives Where an Editor Lives (about −85 to −95)**

The resting cell's right-click on a link gives the read-only menu (Open, Preview, Copy). Authoring (Add/Edit Title, Rename, Edit Link, Format, Remove, Delete) is offered once the cell is live, through `linkPointer`. This resolves F-043 at its cause, because no write-time action runs off-editor, and it lets the read-only and token builders fold.

- **Arithmetic** (`wc -l` measured files: `cellStatic.tsx` 486, `MarkdownTable.tsx` 645, `CellEditor.tsx` 291, `linkFormat.ts` 86, `linkEdit.ts` 172, `connectionsApi.ts` 158, `connectionMenuActions.ts` 103):
  - `cellStatic.tsx`: `menuAt` −21, `menuTarget` and its doc comment −29, `live` −2, the `onSelect` prop and type −3, the `linkGestures` call collapse −5, imports (`linkActionText`, `wikiAuthorTarget`, `linkAddress`, `useLatest`, `tokenMenuTarget`) −4. That's ≈ **−64**.
  - `MarkdownTable.tsx`: `onSelect` handler and the `initialSelect` ref sites ≈ **−11**.
  - `CellEditor.tsx`: the `initialSelect` prop and its seat ≈ **−4**.
  - `linkFormat.ts`: inlining `linkActionText` and `LinkActionText` into `applyUrlLinkAction` ≈ **−8**.
  - `linkEdit.ts`: inlining `wikiAuthorTarget` into `applyLinkAction` ≈ **−5**.
  - **Fold `linkMenuTarget` into `tokenMenuTarget`, and drop `ConnMenuTarget.editable`:** that's −5 for the builder head and tail and −5 for the `editable` fields (`connectionsApi.ts` ×2, `tokenMenuTarget`, `linkMenuTarget`, `connectionMenuActions.ts:84`). `connectionMenuActions.ts:23` becomes `editable: target.apply !== undefined`. That's ≈ **−10**.
  - **Total:** ≈ **−102 gross**. Allowing ±15 for Biome, call it **−85 to −95**.
- **User-visible:** right-clicking a link in a resting, editable table cell shows only Open, Preview, and Copy rows. To rename, retarget, or reformat, the person clicks into the cell first, as in a Text value's resting render (`TextCell` already behaves this way). Format ▸ Page Title can no longer strand a cell on its domain.
- **Depends on:** `cellStatic.tsx`, `linkFormat.ts`, `linkEdit.ts`, and `connectionsApi.ts` are all in flight, so this lands after Link Gestures. It needs Nathan's ruling on the behavior change.
- **Alternative B′ (keeps the behavior):** right-click on a resting link activates the cell and re-pops `linkPointer`'s menu in the live editor. That still deletes `menuTarget`, `wikiAuthorTarget`, and `linkActionText`, but it adds an activate-then-menu handoff across a mount (async seat, then a synthetic `contextmenu`). Net is about −60 with a timing seam. It's not recommended over B.

**C. The Embed Claim Has One Owner (about −6, plus a hard-rule fix)**

`decorations.ts` `build` filters `embed` tokens against `embedTileRanges(view.state)` and drops its `claimedEmbeds` call and its `conn` gate. `claimedEmbeds` takes `resolve` and returns `{line, page}`, so `buildTiles` resolves once. That's F-054's claim half without its connection-look half.

- **Arithmetic** (`decorations.ts` 856, `embedWidget.tsx` 717, `embedClaims.ts` 25): `build` block −10 +4 = −6. `claimedEmbeds` returns the page (+1), and `buildTiles` drops the second resolve and its guard (−2). Net ≈ **−7**.
- **User-visible:** none on a page. In a live cell or TextPane (no tile field), the `![[…]]` token stops being suppressed on a lone line. That's F-054's "raw on the lone line" defect fixed for free, because `embedTileRanges` returns `[]` there.
- **Depends on:** `decorations.ts` (in flight) and the F-054 sequencing in the audit.

**D. Small Folds (each net ≤ 0)**

- **D1 `openWebLink` normalizes and gates the in-app arm:** `if (isHttpLink(url) && setting) s.openBrowser(normalizeLinkUrl(url)) else link:open`. The menu's Preview row (`connectionMenuActions.ts:35`) calls `openBrowser` raw, so normalize in `openBrowser` itself (`windowSlice.ts:247`, file 286 lines; `openWebLink.ts` 11) and gate `CONN_SITE_ROWS`' Preview on `isHttpLink`. That's **+2 / −0**, a defect fix that earns its two lines. With D3 below, the bundle stays net-negative.
- **D2 One `useLinkTitle(url, wanted)` hook:** used by `LinkCell` and `WebTile`, each caller dropping 5 lines for 1. The hook is about 7 lines. That's ≈ **−2**. Honest assessment: this is marginal, so take it only for the "once written" rule.
- **D3 `dwellTarget` reads `isHttpLink(target.url)`:** that's ±0 lines, but it removes the fourth spelling of the address gate.
- **D4 The write-time announce sits in the field:** `sweepOnTitles` gains an `update(u)` that calls `linkTitles.resolve` for each `awaitTitle` effect, and `pasteLink.ts` and `applyUrlLinkAction` drop their `resolve` lines. That's −2 +4 = **+2**. **Not recommended** alone. With B, only two writers remain and the pair is acceptable.

**Combined A + B + C + D1–D3:** about −14 −90 −7 +2 −2 = **≈ −111**.

### 7. Would Go False

- **A:** the `pageConnections.test.tsx:53-58` assertion reads `.bypass?.(...)`. `LinkCell.test.tsx:26-37,43-70` spies `select` directly, so the route moves to the bundle: with no `connectionsOpenInPreview`, `select` still receives `{ heading }`, but the test must pass `connections`. `ConnectionsPM.md:73` (Link cell "omits … the glance") stays true. `ConnectionsPM.md:34` becomes true for Link values.
- **B:** `cellLinks.test.tsx:207,241,253,262,303,308` (the resting menu's decline, Remove Link, Rename, Edit Link, and page-menu authoring). `linkFormat.test.tsx`'s cases that call `linkActionText` directly, if any (check that file's imports). The `wikiAuthorTarget` doc comment at `linkEdit.ts:20`. `Editor-Internals.md:17` ("anything a link, a gesture or a menu does in the body has to be given to the resting cell separately") gets narrower: menus become read-only at rest. The `ConnectionsPM.md:42-49` table's "Author (editable surfaces)" row needs a resting-cell clause beside "A read-only surface — a glance pane, an embedded page at rest".
- **C:** the `decorations.ts` comment "A CLAIMED embed line's token styling stands down; the claim is the tile field's own predicate" stays true. `embedClaims.test.ts`'s helper shape changes (status → resolution). `Editor-Internals.md:25` ("The embed claim has one owner") goes from false to true.
- **D1:** none. `WebviewPM.md` doesn't describe the in-app arm's normalization. The `openWebLink.ts:1` comment stays true.

### 8. Traps

- **`resolveConnection`'s ambiguity-null is the Link property's commit gate** (`treeIndex.ts:283` comment, `linkResolve.ts:8` → `parseEditorValue.ts:5`). Approach A replaces only `LinkCell`'s *click* use. Merging the resolvers wholesale would let an ambiguous title commit.
- **`heldTarget` runs in both `linkUnder` and `resolveFollow`.** The second call serves `TextCell.tsx:41`, the resting cell's `claimLink`, and `followCitation`, where no hit-test wrapped the target. F-038 settled that, so the duplicate application is idempotent and load-bearing.
- **`inert` mode's `open: () => {}`** (`pageConnections.ts:34`) and `followTarget`'s `host.glance?.contains(el)` look like two "don't follow" rules. They serve different surfaces: `inert` serves PageHistoryWindow (whose host has no `glance`, `editorHost.tsx:111`), and `contains` serves the glance pane (whose PageTile host *does* have `glance`). In the glance, the `contains` check is the one that stops addresses and same-page headings, which `inert` leaves live by design.
- **The explicit browser picks bypass `openWebLink`** (`connectionMenuActions.ts:35-36`, `WebWindow.tsx:85`). Folding them would make "Open In Browser" obey the in-app setting.
- **`pendingTitle`'s exact-text match** (`pendingTitle.ts:33`) is what tells apart two pastes of the same address. Collapsing it to a position or a URL key would swap the wrong one.
- **Pending swaps die with the cell editor.** The `sweepOnTitles` subscription is torn down in `destroy` (`pendingTitle.ts:43,68-70`), so a Page Title paste in a live cell whose fetch (up to `LINK_RESOLVE_TIMEOUT_MS` = 6000) outlasts the cell's activation keeps the domain. **Inferred** from reading, not driven. Any F-043 fix that "carries `awaitTitle` into the cell" inherits this. Moving pending entries to the page view is the only complete fix, and it's the audit's +23. Approach B sidesteps only the resting half.
- **`sectionRunAt` can't go through `drawnLinkAt`,** because no token holds a `§` run.
- **`loneWebpageEmbed` requires a written scheme** (`WEB_ADDRESS.test(url)` on the raw text). Swapping it for `isHttpLink` would form tiles from `![x](example.com)`, which the attach gate then refuses (`webGuests.ts:157`).
- **`EditorHost.openLink` can't be replaced by importing `openWebLink` into MarkdownPM.** That would pull `Session/store` into the editor. The harness spy (`editorHarness.ts:24,122`) is how `externalLink.test.tsx` pins follows.
- **`assetWrite` and `adoptFile` returning `[[name.ext]]`** isn't embed syntax and isn't a page connection. `ConnectionsPM.md:24` places File values in a separate domain, so don't route them through the link layer.
