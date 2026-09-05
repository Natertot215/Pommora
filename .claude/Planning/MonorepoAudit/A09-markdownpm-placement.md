## A09 — MarkdownPM Placement Audit

Scope: `Pommora/src/renderer/MarkdownPM/` — 141 files; 72 non-test files, 14,025 lines (12,830 TS/TSX + 1,195 CSS); 69 test files. Judged by code and importers only. Line references are to the working tree at commit `7c7c7542`.

Legend for the tables below: **pure** = no CodeMirror, no React, no DOM, no host; **CM** = CodeMirror extension/helper with no React; **CM+React** = a CodeMirror `WidgetType` that mounts a React root; **host** = `window.nexus`, the Zustand store (`useSession`), Electron-only surfaces, or an import from an app folder (`Tiles`, `Interface`, `Actions`, `treeIndex`). Importer counts exclude tests; `MD` = importers inside MarkdownPM.

### 1. File Table

#### Root

| File | Lines | Class | Importers | Concern | New home |
| --- | --- | --- | --- | --- | --- |
| `index.tsx` | 534 | React component; host — `window.nexus.setGripHot` L292, `useSession` L183/195/314/339, `Tiles/tileCache.registerScrollHeal` L34 | 5 · Interface/PageView, Tiles/Surfaces ×2, Windows/PageHistoryWindow, Testing/editorHarness | editor assembly | `MarkdownEditor.tsx` (package root) |
| `autocomplete.ts` | 216 | pure query/commit model; store — `useSession.getState()` L137 (`pageAliases`, `forgetAlias`) | 4 · MD | autocomplete | `Autocomplete/query.ts`, alias source injected |
| `useConnectionAutocomplete.ts` | 192 | React hook over CM view types; store ×3 L58–62 | 2 · MD | autocomplete | `Autocomplete/useConnectionAutocomplete.ts` |
| `AutocompletePane.tsx` | 136 | React component; store (`tree` L41), `treeIndex.ancestryOf` L12, `Utilities/EntityIcon`, DesignSystem ×6, Interactions ×2 | 2 · MD | autocomplete | `Autocomplete/AutocompletePane.tsx`; row location/icon supplied by host |
| `PageHeader.tsx` | 102 | React component; host — `window.nexus.titleMenu` L63, `useSession`/`useAssetUrl` L2, `Interface/useBannerMenu`, `Interface/AddBannerButton`, `Interface/DetailTitleHeader`, `Assets/AssetImage` | 1 · MD (`index.tsx`) | page header (app chrome) | **out** → Interface (page surface) |
| `warmSeam.ts` | 6 | pure type | 5 · Interface/Glance, Tiles ×2, Windows/useWindowWarm, MD | warmth/caching | `api.ts` (public contract) |
| `zoom.ts` | 17 | pure | 1 · MD | zoom | collapse into `MarkdownEditor.tsx` as a `scale` prop (see §4) |
| `Styles.css` | 955 | style; ~50 lines are `.mdpm-header`/banner rules, ~15 reads of shell tokens (`--sidebar-clearance`, `--inspector-clearance`, `--content-inset`, `--rail-inset`, `--toolbar-h`, `--app-inset`, `--z-content` at L19/26/27/87/90/93/102/139/157/204) | `index.tsx` | tokens/theme | `styles/editor.css` minus header block and shell padding |

#### Connections / Decorations / Detect / Parser / Tokens / Input

| File | Lines | Class | Importers | Concern | New home |
| --- | --- | --- | --- | --- | --- |
| `Connections/index.ts` | 128 | pure resolver + host contract types; host — `armGlance` from `Interface/Glance/glanceAction` L4/L64 | 21 · treeIndex, Interface/PageView, Tiles ×4, Actions/connectionMenu, Windows ×2, MD ×12 | connections contract | `api.ts`; `glanceLink` (L64) → Interface/Glance |
| `Decorations/intent.ts` | 661 | pure | 12 · Interface/Subfield/subfieldStats, MD ×11 | document model (`scanDoc`, `DocScan`, `inCodeAt`, `inCalloutAt`, `lineIndexAt`) **and** decoration intents (`tokenIntents`, `docLineIntents`, `assembleLineIntents`, `decorationsFor`) | split → `Model/docScan.ts` + `Render/intent.ts` |
| `Detect/index.ts` | 634 | pure | 24 · Interface/pageEditor, Interface/Subfield, MD ×22 | document model (line grammar) | `Model/detect.ts` |
| `Detect/codeLangs.ts` | 62 | pure data | 2 · MD | code-fence language roster | `Model/codeLangs.ts` |
| `Parser/index.ts` | 27 | pure (micromark/mdast) | 5 · MD | parser seam | `Model/parse.ts` |
| `Tokens/index.ts` | 268 | pure | 12 · MD | inline tokenizer | `Model/tokens.ts` |
| `Input/index.ts` | 482 | pure | 6 · MD | typing transforms | `Input/transforms.ts` |
| `Input/format.ts` | 362 | pure | 3 · MD | format commands (`toggleInline`, `setHeading`, `setList`, `setBlock`) | `Input/format.ts` |

#### Editor (41 files, 6,395 lines)

| File | Lines | Class | Importers | Concern | New home |
| --- | --- | --- | --- | --- | --- |
| `blockDrag.ts` | 143 | CM gesture | 3 · MD | block drag | `Gestures/blockDrag.ts` |
| `blockHandles.ts` | 114 | CM; hover-driven (`mousemove`/`mouseleave`) | 1 · MD | block grips | `Gestures/blockHandles.ts` |
| `blockModel.ts` | 277 | pure | 4 · MD | document model (block resolver) | `Model/blockModel.ts` |
| `calloutAtomic.ts` | 33 | CM | 1 · MD | caret skip ranges | `Render/atomic.ts` |
| `calloutGuard.ts` | 145 | CM transactionFilter | 3 · MD | guards | `Guards/calloutGuard.ts` |
| `caret.ts` | 77 | CM layer | 3 · MD | caret drawing | `Render/caret.ts` |
| `caretSeat.ts` | 31 | CM helper | 7 · MD | caret placement | `Gestures/caretSeat.ts` |
| `citationActions.ts` | 205 | CM; host — `window.nexus?.writeClipboard` L193, `useSession` L92 | 6 · MD | footnotes | `Citations/actions.ts` |
| `citationEdits.ts` | 227 | pure over `@codemirror/state` `ChangeSet`/`Text` | 4 · MD | footnotes model | `Citations/edits.ts` |
| `citationGuard.ts` | 72 | CM transactionFilter | 1 · MD | guards | `Guards/citationGuard.ts` |
| `citationPointer.ts` | 189 | CM; host — `window.nexus?.citationMenu` L121, L183; right-click, ⌘ | 2 · MD | footnotes pointer + menus | `Citations/pointer.ts` |
| `codeGlyphs.ts` | 83 | pure data (SVG paths) | 1 · MD | code tag marks | `Render/codeGlyphs.ts` (candidate for DesignSystem/Symbols, §7) |
| `codeHighlight.ts` | 89 | CM language | 1 · MD | code highlighting | `Render/codeHighlight.ts` |
| `connections.ts` | 101 | CM; ⌘ | 2 · MD | connection clicks | `Links/connectionClicks.ts` |
| `decorations.ts` | 599 | CM ViewPlugin; host — `window.nexus.writeClipboard` L226 | 5 · MD | decorations | `Render/decorations.ts` |
| `docCache.ts` | 68 | CM `Text`-keyed caches; `DesignSystem/Util/capMap` L4 | 22 · Interface/Subfield, MD ×21 | caching | `Render/docCache.ts` (`perText`/`scanOf` → `Model/docScan.ts`) |
| `dragChrome.ts` | 97 | CM | 3 · MD | drag chrome | `Gestures/dragChrome.ts` |
| `editorGesture.ts` | 119 | CM; `Interactions/gesture`, `Interactions/autoscroll` | 2 · MD | drag gesture lifecycle | `Gestures/editorGesture.ts` |
| `embedInsert.ts` | 72 | CM state helper | 3 · MD | embeds | `Embeds/insert.ts` |
| `embedRanges.ts` | 85 | pure | 5 · MD | document model (embed claims) | `Model/embedRanges.ts` |
| `embedWidget.tsx` | 954 | CM StateField + two `WidgetType`s mounting React; host — `Tiles/Surfaces/PageTile` L108, `Tiles/Surfaces/WebTile` L339 (lazy), `Tiles/tileCache` L38, `Tiles/tileZoom` L34, `Tiles/tile-base.css` L32; `Interactions/ResizeFrame`; DesignSystem size tokens | 5 · MD | embeds/tiles | split → `Embeds/embedField.ts` + `Widgets/reactWidget.ts` + host-supplied `renderTile` (§3) |
| `folding.ts` | 516 | CM StateField; `Animation` (`duration`, `ms`) L11 | 9 · Interface/pageEditor, Interface/Glance, Toolbar ×3, MD ×4 | folding, outline, citations disclosure | `Render/folding.ts`; outline API re-exported at root |
| `formatKeymap.ts` | 18 | CM keymap | 2 · MD | shortcuts | `Input/keymap.ts` |
| `formatState.ts` | 50 | pure | 1 · MD | menu state | `Input/formatState.ts` |
| `gripMenu.ts` | 226 | CM; host — `window.nexus?.gripMenu` L110/L174, `setGripHot` L143/L219, `useSession` L83, `@shared/types` `NexusTree` L10, `Tiles/tileZoom` L15; right-click | 1 · MD | block menus | `Menus/gripMenu.ts`; `embedPickTree` → host |
| `headingScan.ts` | 126 | pure | 3 · MD | document model (headings/outline) | `Model/headingScan.ts` |
| `input.ts` | 177 | CM keymap wiring | 1 · MD | input | `Input/keymap.ts` |
| `lineDom.ts` | 11 | CM helper | 4 · MD | DOM helper | `Render/lineDom.ts` |
| `linkEdit.ts` | 170 | CM; store — `rememberAlias` L105 | 5 · MD | connection authoring | `Links/linkEdit.ts` |
| `linkFormat.ts` | 104 | CM helper; store — `linkTitles` L56, `resolveLinkTitle` L103 | 2 · MD | link menu actions | `Links/linkFormat.ts` |
| `linkGestures.ts` | 42 | CM StateField | 5 · MD | link rest state | `Links/linkRest.ts` |
| `links.ts` | 122 | CM; host — `Actions/openWebLink` L7, `glanceAction.insideGlance` L5; ⌘ | 5 · MD | link clicks | `Links/linkClicks.ts` |
| `listDrag.ts` | 158 | CM gesture | 1 · MD | list drag | `Gestures/listDrag.ts` |
| `listDragModel.ts` | 298 | pure | 5 · Interface/pageEditor, MD ×4 | document model (block moves) | `Model/blockMove.ts` |
| `listRenumber.ts` | 22 | CM transactionFilter | 1 · MD | lists | `Guards/listRenumber.ts` |
| `menu.ts` | 110 | CM helper; host — `nativeEditorMenu` L29–32 (`window.nexus.setEditorFormatState`, `onMenuAction`) | 5 · Interface/PageView, Tiles/Surfaces ×2, MD ×2 | native context-menu seam | `Menus/editorMenu.ts`; `nativeEditorMenu` → Desktop host adapter |
| `pasteLink.ts` | 148 | CM; host — `window.nexus.readClipboard` L96/L139, `useSession` L36/L78/L114/L136, `Actions/commands.matchesCommand` L7 | 3 · MD | paste | `Links/pasteLink.ts` |
| `pendingTitle.ts` | 83 | CM ViewPlugin; store — `useSession.subscribe` L57 | 4 · MD | link title fetch | `Links/pendingTitle.ts` |
| `pointerPath.ts` | 146 | CM; `glanceAction` cancel/close L3; hover (`mouseover` ×5), right-click | 3 · MD | pointer skeleton (hover-dwell, click, menu) | `Gestures/pointerPath.ts` |
| `selection.ts` | 44 | CM layer | 2 · MD | selection drawing | `Render/selection.ts` |
| `travel.ts` | 44 | CM helper; `Interactions/autoscroll.scrollGlide` L4 | 3 · Interface/pageEditor, MD ×2 | in-editor navigation | `Gestures/travel.ts` |

#### Tables (15 files, 2,848 lines)

| File | Lines | Class | Importers | Concern | New home |
| --- | --- | --- | --- | --- | --- |
| `index.ts` | 3 | barrel | 1 · MD | tables | `Tables/index.ts` |
| `widget.tsx` | 549 | CM StateField + `WidgetType` mounting React; host — `window.nexus.writeClipboard` L245, `tableMenu` L252, `readClipboard` L318 | 1 · MD | table widget | `Tables/widget.tsx` over shared `Widgets/reactWidget.ts` |
| `MarkdownTable.tsx` | 740 | React component; `Interactions/gesture`, `Interactions/autoscroll`, DesignSystem `Icon`, `glanceAction`; host reached only through props (`onCopyText`, `readClipboard`, `onMenu`) | 1 · MD (lazy) | table UI | `Tables/MarkdownTable.tsx` |
| `CellEditor.tsx` | 284 | React + nested CM `EditorView`; `clipboardData` L135 | 1 · MD | cell editor | `Tables/CellEditor.tsx` |
| `cellStatic.tsx` | 407 | React; store — `resolveLinkTitle` L398; `glanceAction`; ⌘ | 1 · MD | resting cell | `Tables/StaticCell.tsx` |
| `cellCitations.ts` | 53 | CM ViewPlugin | 1 · MD | cell footnote numbering | `Tables/cellCitations.ts` |
| `clipboard.ts` | 63 | pure | 3 · MD | table payload codec | `Model/Tables/clipboard.ts` |
| `codec.ts` | 108 | pure | 7 · MD (incl. `Input/format`) | GFM cell/row codec | `Model/Tables/codec.ts` |
| `guard.ts` | 68 | CM transactionFilter | 1 · MD | guards | `Tables/guard.ts` |
| `model.ts` | 30 | pure | 9 · MD (incl. `Input/format`) | table model | `Model/Tables/model.ts` |
| `navigate.ts` | 26 | pure | 2 · MD | cell navigation | `Model/Tables/navigate.ts` |
| `operations.ts` | 145 | pure | 1 · MD | model transforms | `Model/Tables/operations.ts` |
| `regions.ts` | 82 | pure | 4 · MD (`Decorations/intent`, `Editor/embedRanges`) | document model (table regions) | `Model/Tables/regions.ts` |
| `sync.ts` | 50 | CM `Annotation` + pure change builders | 3 · MD (incl. `Editor/calloutGuard`) | cell↔source sync | `Tables/sync.ts` |
| `widget.css` | 240 | style | `MarkdownTable.tsx` | table theme | `Tables/table.css` |

No non-test file has zero non-test importers; every file is live. Per-symbol test-only exports exist (e.g. `citationPointer.loneTarget` is "exported pure for tests") but were not audited symbol-by-symbol.

### 2. Is MarkdownPM a Package?

**Verdict:** yes — as two packages, not one. 51 of the 72 files never touch a host seam; the other 21 do so at about 60 call sites total, and every one of them has an obvious seam.

#### What's already clean

23 files (≈4,240 lines, a third of the TS) import nothing from `@codemirror`, `react`, or the DOM: `Parser`, `Detect` ×2, `Tokens`, `Decorations/intent`, `Input` ×2, `Editor/{blockModel,headingScan,listDragModel,embedRanges,formatState,codeGlyphs}`, `Tables/{model,codec,regions,operations,clipboard,navigate}`, `Connections`, `autocomplete`, `zoom`, `warmSeam`. Two of them still reach the app (`Connections` → `glanceAction`, `autocomplete` → store), covered below. The dependency shape confirms they form one layer:

```
Parser ← Detect ← Tokens ← Decorations/intent(scanDoc) ← Editor/docCache
                ↑            ↑         ↑
     Tables/regions   Editor/embedRanges   Editor/headingScan ← Editor/blockModel
```

This layer is what `main/Connections/scan.ts`, `main/Connections/rewrite.ts`, `main/mutate.ts`, and `Interface/Subfield/subfieldStats.ts` need — and today the renderer-side pieces (`scanDoc`, `Detect`) are only reachable through the editor folder while main re-derives from `@shared/markdownCode` + `@shared/connections`. That's the case for a **`markdown-model` package** (Core-level, no CM, no React) consumed by main, the editor, and the word counter alike.

The remaining ~8,600 lines are the **`markdownpm` editor package**: CM6 extensions, the React widgets, the autocomplete, the stylesheet. It depends on `markdown-model` and on UIX primitives (`Interactions/{gesture,autoscroll,ResizeFrame,HoverRemove,useKeepInView}`, `Animation/motion`, `DesignSystem/{Util/cx,Util/capMap,Tokens/size,Symbols,Pickers,Menus,Elements/NavTrail,Tokens/typography}`). Editor → UIX-primitives is a correct dependency direction; it's the reverse direction and the app-level imports below that need cutting.

#### Every import FROM MarkdownPM into the rest of the renderer (non-test)

| Target | Files | Sites | Entanglement point | What cuts it |
| --- | --- | --- | --- | --- |
| `../store` / `@renderer/store` (`useSession`) | 10 | 22 | Settings: `personalization.{codeblockLineCount, removeTitleOnLinkChange, aliasPickerOnCommit, jumpToCitation, pasteLinkIntoText, defaultLinkFormat}`, `commands['paste-inverse']`, `citationsVisible`/`setCitationsVisible`/`toggleCitations`; caches: `pageAliases`/`rememberAlias`/`forgetAlias`, `linkTitles`/`resolveLinkTitle` (+ `subscribe` in `pendingTitle.ts:57`); `tree` (`gripMenu.ts:83`, `AutocompletePane.tsx:41`); `reloadPage` (`PageHeader.tsx:41`) | One `EditorHost` object handed in as a prop and threaded through a CM facet (the pattern `embedHost`, `citationHost`, `tableConnections` already use): `settings()` snapshot getter, `aliases {list, remember, forget}`, `linkTitles {get, resolve, subscribe}`, `citations {shown, set}`. The tree reads become host-supplied `embedPickTree()` and `AcRow.location`. |
| `window.nexus.*` | 9 | 20 | Clipboard: `writeClipboard` (`decorations.ts:226`, `citationActions.ts:193`, `Tables/widget.tsx:245`), `readClipboard` (`pasteLink.ts:96,139`, `Tables/widget.tsx:318`). Native menus: `gripMenu` + `setGripHot` (`gripMenu.ts:110,143,174,219`; `index.tsx:292`), `tableMenu` (`Tables/widget.tsx:252`), `citationMenu` (`citationPointer.ts:121,183`), `titleMenu` (`PageHeader.tsx:63`), `setEditorFormatState`/`onMenuAction` (`menu.ts:30–31`) | `EditorHost.clipboard {read, write}` and `EditorHost.menus {grip, table, citation, format}`. `menu.ts` already models this correctly — `EditorMenuApi` is an interface and `nativeEditorMenu` is the Electron implementation passed by hosts; the other four menus just never got the same treatment. Move `nativeEditorMenu` (4 lines) to the Desktop host. |
| `@renderer/Interface/Glance/glanceAction` | 5 | 10 | `armGlance` (`Connections/index.ts:64`), `insideGlance` (`links.ts:5`, `cellStatic.tsx:14`, `MarkdownTable.tsx:8`), `cancelGlance`/`closeGlance` (`pointerPath.ts:3`, `cellStatic.tsx:14`, `MarkdownTable.tsx:8`) | `glanceAction.ts` is a 100-line leaf with zero imports — it is already a UIX primitive that happens to live under Interface. Either move it to `Interactions/` (editor may depend on UIX primitives) or widen `ConnectionsApi.glance` into `{arm, cancel, close, contains}`. The former is one `git mv`. |
| `@renderer/Tiles/*` | 3 | 7 | `Surfaces/PageTile` + `Surfaces/WebTile` lazy (`embedWidget.tsx:108,339`), `tileCache.{healTileScrolls,tileWarmSeam}` (`embedWidget.tsx:38`), `tileCache.registerScrollHeal` (`index.tsx:34`), `tileZoom.{DEFAULT_ZOOM,zoomStep}` (`embedWidget.tsx:34`), `tileZoom.ZOOM_STEPS` (`gripMenu.ts:15`), `tile-base.css` (`embedWidget.tsx:32`) | `EmbedHost.renderTile(range) => ReactNode` and `EmbedHost.warmFor(chain)`; the scroll-heal registry folds into `WarmSeam`. The zoom ramp is `@shared/types.SCALE_STEPS` wearing a label — move `zoomStep` to Core. The `React.lazy` in `embedWidget.tsx:104–109` exists only to break the cycle the direct import would create; with `renderTile` the lazy goes away. |
| `@renderer/Actions/*` | 2 | 2 | `openWebLink` (`links.ts:7`), `commands.matchesCommand` (`pasteLink.ts:7`) | `ConnectionsApi.openUrl(url)`; `EditorHost.commands` |
| `@renderer/treeIndex`, `@renderer/Utilities/EntityIcon` | 1 | 2 | `ancestryOf` + `EntityIcon` in `AutocompletePane.tsx:2,12` | `AcRow` gains `location?: TrailSegment[]` and `icon?: ReactNode`, filled by the host's row mapper (`pageRow` moves to the host or takes a mapper). |
| `@shared/types` | 1 | 1 | `NexusTree`/`CollectionNode`/`SetNode` for `embedPickTree` (`gripMenu.ts:10,45–54`) | Host supplies the pick tree; the editor should not know what a Collection or Set is. |
| `@renderer/Interface/{useBannerMenu,AddBannerButton,DetailTitleHeader}`, `@renderer/Assets/AssetImage` | 1 | 4 | `PageHeader.tsx:3–7` | Move `PageHeader.tsx` out (§4). |
| `@shared/*` grammar (`connections`, `links`, `markdownCode`, `webpageEmbed`, `pasteLink`, `pasteAsMenu`, `linkValue`, `properties`, `clamp`) | 22 | ~40 | Pure grammar shared with main | Not entanglement — these are `markdown-model` / Core. `main/` imports the same five modules in 14 files. |
| `@shared/*` menu contracts (`editorMenu`, `gripMenu`, `citationMenu`, `tableMenu`, `connMenu`) | 12 | ~18 | `ListKind` (grammar) rides in `gripMenu.ts`; the rest are the Electron wire types | `ListKind` → Core. The menu context/action types are editor-owned (the editor decides what a grip offers); export them from the editor package and let main import them. |
| `@renderer/Interactions`, `@renderer/Animation`, `@renderer/DesignSystem` | 8 | ~20 | Pointer gesture engine, autoscroll, resize frame, motion tokens, menu/picker primitives | Legitimate editor → UIX dependency; keep. |

#### Every import INTO MarkdownPM from outside (non-test)

| Importer | Symbols | Verdict |
| --- | --- | --- |
| `Interface/PageView.tsx`, `Tiles/Surfaces/PageTile.tsx`, `Tiles/Surfaces/MarkdownTile.tsx`, `Windows/PageHistoryWindow.tsx`, `Testing/editorHarness.ts` | `MarkdownEditor` | The component. Public API. |
| `Interface/PageView.tsx`, `Tiles/Surfaces/PageTile.tsx`, `Tiles/Surfaces/MarkdownTile.tsx` | `Editor/menu.nativeEditorMenu` | The Electron adapter, living inside the editor. Moves to the Desktop host; hosts import it from there. |
| `treeIndex.ts`, `Tiles/tileKinds.tsx`, `Tiles/TileHost.tsx`, `Tiles/Surfaces/PageTile.tsx`, `Tiles/Surfaces/MarkdownTile.tsx`, `Interface/PageView.tsx`, `Windows/PageWindow.tsx`, `Windows/NavWindow.tsx`, `Actions/connectionMenu.ts` | `Connections.{buildPageIndex, ConnectionsApi, ConnPage, PageIndex, ConnMenuTarget, glanceLink}` | Public API except `glanceLink`, which is app code (it binds the glance's dwell) and belongs beside `armGlance`. |
| `Interface/Glance/GlancePane.tsx`, `Tiles/tileCache.ts`, `Tiles/Surfaces/PageTile.tsx`, `Windows/useWindowWarm.ts` | `warmSeam.WarmSeam` | Public API. |
| `Interface/pageEditor.ts`, `Interface/Glance/GlancePane.tsx`, `Toolbar/outlineTree.ts`, `Toolbar/OutlineDnd.tsx`, `Toolbar/OutlineMenu.tsx` | `Editor/folding.{headingOutline, sectionEnd, OutlineHeading, toggleFoldAt, HEADING_FOLD_LINE}` | Outline + fold commands. Legitimate, but reached by deep path into `Editor/`; should be root exports. |
| `Interface/pageEditor.ts` | `Editor/travel.travelTo`, `Editor/listDragModel.blockMoveChanges`, `Detect.headingParts` | The outline's rename/move reaching into internals to rebuild `renameHeading`/`moveSection`. These should be editor commands exported at root. |
| `Interface/Subfield/subfieldStats.ts` | `Detect` ×9, `Decorations/intent.{lineIndexAt, DocScan}`, `Editor/docCache.{perText, scanOf}` | A pure-model consumer (word/line/citation counts). This is the strongest argument for `markdown-model` as its own package — the Subfield has no business importing from an editor. |

#### Cost of the cut

~60 sites in ~20 files, plus moving three things out (`PageHeader.tsx`, `nativeEditorMenu`, `glanceLink`) and one thing in (`glanceAction.ts` → UIX). The `EditorHost` facet replaces 22 store reads and 20 bridge calls with one object the host constructs; `PageView`, `PageTile`, `MarkdownTile`, `PageHistoryWindow`, and `editorHarness` are the five constructors. The test harness (`Testing/editorHarness.ts`) seeds `useSession` directly today (L23–29) and 22 test files stub `window.nexus`; those would seed the host object instead.

### 3. Tables/ and the Tile/Embed Widgets

**Where mounting lives:** two places, same pattern, written twice.

- `Tables/widget.tsx:170–367` — `TableWidget extends WidgetType`; `toDOM` parks a React root on the node (`dom._root`), `renderInto` re-renders in place, `updateDOM` reuses the root, `destroy` unmounts on a microtask, a `HeightBox` + `ResizeObserver` answers `estimatedHeight`, `ignoreEvent() → true`. Lazy-imports `MarkdownTable` (L337) "to keep this module unit-testable".
- `Editor/embedWidget.tsx:112–280, 343–434` — `EmbedTileWidget` and `WebpageTileWidget`; same parked root (`TileDom._root`), same `mountTile`/`unmountIfDetached` microtask dance, same `estimatedHeight` discipline (`tileEstimate`), same `ignoreEvent`. Lazy-imports `PageTile` and `WebTile` (L108, L339) to break a cycle: PageTile mounts MarkdownEditor which registers this extension.

**Who owns what:**

- The **React-root-in-a-WidgetType chassis** is an editor primitive. It belongs to the editor as one `Widgets/reactWidget.ts` (~120 lines) that both the table and the tiles extend; today it's duplicated across the two files with slightly different microtask/`isConnected` handling.
- **Tables** belong entirely to the editor. GFM tables are Markdown grammar, nothing in `Tiles/` knows they exist, and `MarkdownTable.tsx` is already host-neutral — every host touch (`onCopyText`, `readClipboard`, `onMenu`) arrives as a prop. The leak is only in `widget.tsx:245,252,318`, where `window.nexus` is bound directly instead of read off a facet.
- **The tile surfaces** (`PageTile`, `WebTile`) belong to `Tiles/`, and the editor should not import them. The lazy import is the tell: the editor is importing the app that mounts it. `EmbedHost` (already a facet at `embedWidget.tsx:57–59`) grows a `renderTile(range: TileRange, ctx) => ReactNode`; PageView/PageTile supply it. The claim set, formation gate, atomic absorb, boundary guard, click seat, and editing exit (L436–930) all stay — they are about document positions, not tiles.
- Three pieces inside `embedWidget.tsx` are Tiles logic that leaked in because the file was the only place with a hand on the scroller: the web-tile visibility observers (`observersFor`, `WEB_FIT_MARGIN`, `WEB_FULL_RATIO`, L283–336, ~55 lines) which decide when a `<webview>` guest goes live; `applyTileZoom`/`--tile-zoom` (L446–450) and `tileEstimate` with `TILE_DEFAULT_PX/GAP/MIN` (L191); and `EmbedResizeHandle` (L155–183). The observers move to `Tiles/Surfaces/WebTile` as a hook taking a scroller element; the zoom/estimate constants come from Core; the resize handle stays (it dispatches `setEmbedHeights` on the editor's field).

Resulting `embedWidget.tsx` ≈ 600 lines of field/guard logic + ~120 shared chassis, down from 954 with four `Tiles` imports and one CSS import.

### 4. PageHeader, zoom, warmSeam, autocomplete

- **`PageHeader.tsx` — app concern, misfiled.** Its only importer is `index.tsx`; it composes three `Interface/` components, `Assets/AssetImage`, `useAssetUrl`, `reloadPage`, and pops `window.nexus.titleMenu`. The editor needs two things from it: the `--header-zone` measurement (`index.tsx:492–503`, a `ResizeObserver` on whatever node is passed) and the scroll-park keyframe (`Styles.css:61–80`), both of which work on any header node. `Tiles/Surfaces/PageTile.tsx:161–208` already re-implements the banner as `EmbedBanner` rather than reusing `PageHeader` — the duplication exists because the header is filed under the editor. Give `MarkdownEditor` a `header?: ReactNode` slot; move `PageHeader` to the page surface beside `DetailTitleHeader`; let PageTile reuse it.
- **`zoom.ts` — editor concern, but half a mapping.** `zoomFontSize(z) = 15 · 2^(z−1)` (L15) is the exact inverse of `@shared/types.embedZoom(scale) = 1 + log2(scale)` (L265), which is what every caller feeds it (`PageTile.tsx:151`, `PageHistoryWindow.tsx:235`). Composed, they are `15 · scale`. The editor should take `scale` and the exponential intermediary goes; `EDITOR_BASE_PT` stays as the one editor knob. Fold into `MarkdownEditor.tsx`.
- **`warmSeam.ts` — editor concern.** It is the editor's own state-capture contract (`EditorState.toJSON` + `scrollTop`); every consumer is a host implementing it. Keep as public API. The reverse leak is `registerScrollHeal` (`index.tsx:34`, from `Tiles/tileCache`): a re-slot self-check the editor registers with a Tiles registry. Fold it into `WarmSeam` (`onReslot?`) or drive it from `embedField`'s own `reslotHeal` plugin, which already knows when tiles re-slot.
- **Autocomplete trio — editor concern with three app leaks.** The `[[` picker is editor UI and belongs in the package. Leaks: `autocomplete.ts:137` reads alias memory from the store; `useConnectionAutocomplete.ts:58–62` reads two settings and the alias map; `AutocompletePane.tsx:12–13,41,59–63` reads the Nexus tree to draw a location trail and imports `EntityIcon`. All three are host-suppliable: aliases and settings via `EditorHost`, location/icon via fields on `AcRow`. File them under `Autocomplete/` — three root-level files named `autocomplete.ts`, `useConnectionAutocomplete.ts`, `AutocompletePane.tsx` are a folder that was never made.

### 5. Host-Bound: What a Capacitor Host Couldn't Reuse Without Change

Direct bridge and Electron surfaces (must be adapted):

- `index.tsx:292` — `window.nexus?.setGripHot?.(…)`
- `Editor/menu.ts:30–31` — `window.nexus.setEditorFormatState(s)`, `window.nexus.onMenuAction(cb)` (Electron native menu round-trip)
- `Editor/gripMenu.ts:110` — `window.nexus?.gripMenu?.({ kind: 'heading', level })`; `:143` `setGripHot(false)`; `:174` `gripMenu(contextFor(…))`; `:219` `setGripHot(false)`
- `Editor/citationPointer.ts:121–122` — `window.nexus?.citationMenu?.({ subject: 'marker', … })`; `:183` `citationMenu({ subject: 'citation', … })`
- `Editor/citationActions.ts:193` — `window.nexus?.writeClipboard?.(…)`
- `Editor/decorations.ts:226` — `window.nexus.writeClipboard(text)` (code-block copy tag)
- `Editor/pasteLink.ts:96` — `await window.nexus.readClipboard()` (Paste As); `:139` `readClipboard()` (⌘⇧V)
- `Editor/links.ts:7` → `Actions/openWebLink.ts:11` — `window.nexus.openExternal(url)` / `Windows/WebWindow.openInAppBrowser`
- `Tables/widget.tsx:245` — `writeClipboard`; `:252` `window.nexus.tableMenu(ctx)`; `:318` `readClipboard`
- `PageHeader.tsx:63` — `window.nexus.titleMenu(…)`
- `Editor/embedWidget.tsx:339–340` → `Tiles/Surfaces/WebTile.tsx:193` — `<webview partition=…>`. Electron-only; WKWebView has no `<webview>` element. Every `![Label](https://…)` embed renders nothing on iOS until WebTile gets an `<iframe>` or native-overlay implementation.
- Store reads (22 sites, listed in §2) — the store itself is portable Zustand, but the fields are Electron-fed (`resolveLinkTitle` and `reloadPage` go through the bridge).

Interaction model that has no touch equivalent (works in WKWebView but is unreachable on iOS):

- Right-click menus: `gripMenu.ts:155` (`e.button !== 2`), `:160` `contextmenu`; `citationPointer.ts:171` `contextmenu`; `pointerPath.ts` `contextmenu` ×3; `Tables/MarkdownTable.tsx` `onContextMenu` ×3; `Tables/cellStatic.tsx` `onContextMenu`; `PageHeader.tsx:76`. iOS fires no reliable `contextmenu` inside a contenteditable; a long-press gesture must synthesize these, and the menus themselves need an in-app fallback (there is no native context menu from web content on iOS).
- Hover-revealed affordances: `blockHandles.ts` (`mousemove`/`mouseleave` gutter hover reveals grips), `pointerPath.ts` (`mouseover` ×5 — the 1000 ms glance dwell), `Styles.css` `:hover` rules. Grips, glance, and the code-tag copy control have no touch entry point.
- ⌘-modifier semantics: `links.ts:99`, `connections.ts`, `citationPointer.ts:103,112`, `MarkdownTable.tsx`, `cellStatic.tsx` read `event.metaKey` for the "other route" open. No ⌘ on iOS.
- `formatKeymap.ts` binds `FORMAT_CHORDS` (⌘B etc.) — fine with a hardware keyboard, dead otherwise; the format menu is the only other route and it's native-Electron.

Platform features to version-gate rather than rewrite:

- `Styles.css:22,47,72–73` — `timeline-scope`, `scroll-timeline`, `animation-timeline`, `animation-range` (the header park). Safari gained scroll-driven animations in Safari 26; a WKWebView below that renders the header unparked. Not a break, a floor.
- `Styles.css:1–5` `@property`, `:has()` ×8, `color-mix()` ×3 — all in WebKit for several releases; fine.
- `ResizeObserver`, `IntersectionObserver`, `getComputedStyle`, `event.clipboardData` (`pasteLink.ts:126`, `CellEditor.tsx:135`) — fine in WKWebView. Programmatic clipboard *reads* (`readClipboard`) will show iOS's paste banner each time; the Paste As flow should be re-evaluated for mobile rather than ported.

Already mobile-aware: `index.tsx:262–269` sets `autocapitalize`/`autocorrect`/`spellcheck`/`enterkeyhint` on the content element.

Net for the "ships on mobile as-is" claim: 51 of 72 files (≈6,800 lines — the model, render, input, guard, and folding layers) ship as-is. The other 21 files carry the ~60 host-bound lines plus the interaction model — five native menus, hover grips, right-click, ⌘-click, async clipboard, `<webview>` embeds — and every one of them is also on the entanglement list in §2, so the host abstraction and the mobile port are the same work.

### 6. Folder Verdicts and Proposed Tree

| Folder | Verdict | Admission rule for a future file |
| --- | --- | --- |
| `Detect/` | **rename → `Model/`** and absorb the rest of the model layer | No `@codemirror`, `react`, DOM, or host import. Answers "what is this text?" for a string + offsets. |
| `Parser/` | **dissolve** into `Model/parse.ts` | 27 lines does not earn a folder. |
| `Tokens/` | **dissolve** into `Model/tokens.ts` | Same layer as Detect; one file. |
| `Decorations/` | **split**: `scanDoc` + `DocScan` + `inCodeAt`/`inCalloutAt`/`lineIndexAt` → `Model/docScan.ts`; intents → `Render/intent.ts` | Two folders both called "decorations" (`Decorations/intent.ts`, `Editor/decorations.ts`) is the naming failure to fix. `Render/` admits anything that turns model answers into CM decorations, layers, or DOM. |
| `Input/` | **keep**; absorb `Editor/input.ts` (keymap wiring), `formatKeymap.ts`, `formatState.ts` | A function from (doc string, selection) to an `Edit`/`FormatEdit`, plus the one keymap file that binds them. No DOM. |
| `Connections/` | **dissolve** → `api.ts` at root | It is the host contract (`ConnectionsApi`, `PageIndex`, `buildPageIndex`, `resolveMdTarget`), not a feature. `glanceLink` leaves. |
| `Editor/` | **split** — this is the "filed by birth" bin: 41 files spanning model, render, guards, gestures, links, citations, embeds, menus | Dissolves into `Render/`, `Guards/`, `Gestures/`, `Links/`, `Citations/`, `Embeds/`, `Menus/`. Nothing is admitted to a folder named "Editor" again. |
| `Tables/` | **split** pure ↔ widget; keep the name | `Model/Tables/` admits the six pure files (the model layer already imports `regions`, `codec`, `model` from `Decorations/intent`, `Editor/embedRanges`, `Input/format`); `Tables/` keeps widget, React, CM, CSS. |
| root | **tidy**: `index.tsx` → `MarkdownEditor.tsx`; autocomplete trio → `Autocomplete/`; `PageHeader.tsx` out; `zoom.ts` collapsed; `warmSeam.ts` into `api.ts`; `Styles.css` → `styles/editor.css` | Root holds the component, the host contract, and the barrel. |

#### Proposed tree (as a UIX subtree or two workspace packages)

```
markdown-model/                        ≈ 2,430   (Core-level; main, editor, Subfield import it)
  parse.ts                               27
  detect.ts                             634
  codeLangs.ts                           62
  tokens.ts                             268
  docScan.ts                           ≈200   (scanDoc half of Decorations/intent + perText/scanOf)
  embedRanges.ts                         85
  headingScan.ts                        126
  blockModel.ts                         277
  blockMove.ts                          298   (listDragModel)
  Tables/ {model,codec,regions,operations,clipboard,navigate}.ts   454

markdownpm/                            ≈ 10,000 TS + 1,130 CSS
  MarkdownEditor.tsx                    ≈550   (index.tsx + zoom collapsed; header slot; EditorHost prop)
  api.ts                                ≈140   (ConnectionsApi, PageIndex, buildPageIndex, WarmSeam, EditorHost, EmbedHost)
  index.ts                                     (barrel: MarkdownEditor, api types, outline/fold/travel commands)
  Input/    transforms 482 · format 362 · formatState 50 · keymap ≈195 (input.ts + formatKeymap)    ≈ 1,090
  Render/   intent ≈460 · decorations 599 · docCache 68 · caret 77 · selection 44 · codeHighlight 89
            · codeGlyphs 83 · atomic 33 · folding 516 · dragChrome 97 · lineDom 11                  ≈ 2,080
  Guards/   calloutGuard 145 · citationGuard 72 · listRenumber 22                                    ≈   240
  Gestures/ pointerPath 146 · editorGesture 119 · blockDrag 143 · blockHandles 114 · listDrag 158
            · travel 44 · caretSeat 31                                                               ≈   755
  Links/    connectionClicks 101 · linkClicks 122 · linkEdit 170 · linkFormat 104 · pasteLink 148
            · pendingTitle 83 · linkRest 42                                                          ≈   770
  Citations/ actions 205 · edits 227 · pointer 189                                                   ≈   620
  Embeds/   embedField ≈600 · insert 72                                                              ≈   670
  Widgets/  reactWidget.ts ≈120  (the parked-root WidgetType chassis, shared by Tables and Embeds)
  Menus/    editorMenu ≈105 · gripMenu ≈200 (pick tree out)                                          ≈   305
  Tables/   widget 549 · MarkdownTable 740 · CellEditor 284 · StaticCell 407 · cellCitations 53
            · guard 68 · sync 50 · table.css 240                                                     ≈ 2,150 + 240 CSS
  Autocomplete/ query 216 · useConnectionAutocomplete 192 · AutocompletePane 136                     ≈   545
  styles/editor.css                     ≈890   (955 − header block − shell padding)

Leaves the editor:
  PageHeader.tsx                        102 → Interface (page surface); PageTile.EmbedBanner deduped against it
  menu.ts nativeEditorMenu                4 → Desktop host adapter
  Connections glanceLink                  2 → Interface/Glance
  embedWidget web-tile observers        ≈55 → Tiles/Surfaces/WebTile (hook over a scroller element)
  gripMenu embedPickTree                ≈10 → host (treeIndex)
```

Model (≈2,430) + editor (≈10,000) + the ≈170 lines that leave reconcile to the current 12,830 TS lines within about 2% — the slack is the two estimated file splits (`intent.ts`, `embedWidget.tsx`).

### 7. Files That Belong to a Different Scope

- **`PageHeader.tsx`** → Interface. Page chrome with one importer, composed of Interface parts, already duplicated by `PageTile.EmbedBanner`.
- **`Editor/menu.ts` L27–32 (`nativeEditorMenu`)** → Desktop host. The one Electron adapter the editor got right as an interface, then defined the implementation next to it.
- **`Connections/index.ts` L63–65 (`glanceLink`)** → Interface/Glance. Binds the app's dwell constant to the editor's hook.
- **`Interface/Glance/glanceAction.ts`** (outside scope, 100 lines, zero imports) → UIX `Interactions/`. It is already a host-neutral leaf; filing it under Interface is what makes five editor files look app-bound.
- **`Editor/gripMenu.ts` L45–54 (`embedPickTree`)** → host. Walks `NexusTree.collections[].sets[].pages[]`; the editor should ask the host for `PickNode[]`.
- **`Editor/embedWidget.tsx` L283–336 (web-tile observers)** → Tiles/Surfaces/WebTile. Guest go-live rules belong with the guest.
- **`zoom.ts` + `@shared/types.embedZoom`** → one place in Core. Two halves of one mapping in two packages.
- **`Editor/codeGlyphs.ts`** (83 lines of brand SVG path data) — candidate for `DesignSystem/Symbols`, which is the curated icon registry. It is raw DOM because a `WidgetType` builds raw DOM, but the *asset* is design-system.
- **`Styles.css` shell tokens** (`--sidebar-clearance`, `--inspector-clearance`, `--content-inset`, `--rail-inset`, `--toolbar-h`, `--app-inset`) → the host's mount wrapper (`Interface/PageView` CSS). The editor should be given its padding, not compute the app shell's.
- **`Testing/editorHarness.ts`** (outside scope) → travels with the editor package; it is the editor's jsdom harness and seeds the store (L23–29), which becomes seeding `EditorHost`.
- **Naming collision to resolve:** `renderer/Tables/` (top-level, the Views column-table: `ColumnHeader.tsx`, `tableDnd.tsx`, `columnWidths.ts`) versus `renderer/MarkdownPM/Tables/` (GFM tables). Two folders named `Tables` at two depths meaning two things. Rename the Views one (`Views/DataTable/` or `Views/Columns/`).

---

### Summary

MarkdownPM is two packages in one folder. Twenty-three files (~4,240 lines) — Parser, Detect, Tokens, `scanDoc`, block/heading/embed models, the six pure table files — import no CodeMirror, React, or DOM, and are exactly what `main/Connections`, `main/mutate`, and the Subfield word counter need; they should become a Core-level `markdown-model` package. The remaining ~8,600 lines are the CM6 editor, legitimately dependent on UIX primitives (gesture engine, autoscroll, pickers, motion tokens). App entanglement is concentrated: 22 `useSession` reads in 10 files, 20 `window.nexus` calls in 9 files, 5 files touching `glanceAction`, one widget lazy-importing `Tiles/Surfaces` to dodge a cycle, and `PageHeader.tsx` (app chrome, already duplicated by PageTile). One `EditorHost` facet plus a `renderTile` callback cuts all of it — roughly 60 sites in 21 files. `Editor/` (41 files) is the filed-by-birth bin and dissolves into Render, Guards, Gestures, Links, Citations, Embeds, Menus; Parser, Tokens, Decorations, Connections dissolve into `Model/` and `api.ts`. On mobile, 51 of 72 files ship as-is; the five native menus, hover grips, right-click, ⌘-click, async clipboard, and `<webview>` embeds do not — and that list is the entanglement list, so the host seam and the iOS port are one job.
