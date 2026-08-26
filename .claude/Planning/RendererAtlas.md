## Renderer Atlas

**Date:** 08-26-2026 · **Scope:** `Pommora/src/renderer/src` — 453 non-test source files, 659 files in all · **Base:** `cd36b8e6`

The one document for the renderer's organization: what it is, the rules that decide where anything goes, what it should look like, and which decisions the tree cannot make on its own. It replaces the Design Coherence Report and the organizational bundles of the Codebase-Cleanup Checklist, carrying every ruling those held forward as current truth. Nothing in it is a defect report. The code works; the tree no longer describes what the app is, and the design system's vocabulary is read correctly far more often than it is used correctly. This is the difference between a kitchen where the food is good and a kitchen where anyone can find the salt.

### Executive Summary

**The renderer works. It is filed by the order things were built, and its design system is read far more correctly than it is used.** Seven lenses over 453 files found no dead code, no wrong architecture, and one behavioral bug. What they found instead is three kinds of drift, each with a mechanical fix and each already half-done by the code itself.

**Structure.** Sixteen top-level folders say where a thing was first mounted, not what it is. Three folders are named `Detail` for three unrelated things; `Components/` is twenty-two view-settings panes and three shared files; twelve app-core modules sit at the root with no folder; thirty files have no importer in their own folder. The design system reaches upward into the app in exactly three files — two read the store, one reaches for the native menu — and the fix pattern already exists in `Settings/IconPicker.tsx`. The target tree (Part III) makes fourteen folders of the sixteen, each answering "what is this" in one word, and places all 453 files under eight testable rules, plus the Showcase as one folder row; 228 move, 87 of those by rename alone.

**Styling.** Motion is perfect — 165 reads, zero off the ladder. Color is near-perfect — 21 raw values, two strays. Geometry is where the discipline stops: 681 bare pixel values on a `2·4·6·8·10·12·14·16·20·24·28` grid the code already agreed on and never named; 224 custom properties declared outside `Tokens/`, two of them read by the design system with no fallback; the app's root font stack is not the design system's font stack. Twenty-eight plain stylesheets fail the stated reason for being plain; six feature sheets load globally from `main.tsx` so every surface depends on the table's CSS. One toolbar selector at `toolbar.css:98` has recruited seventeen doubled selectors and is still recruiting.

**Tokens.** The consumer side is 96% right — 45 findings against 1,071 reads — and the misuse is one shape: when a surface needs an edge, it reaches for a label tone, and nine of the twelve sites that do it are inside the design system's own `Controls/`. The recipe side is where definitions have been outvoted: `label.quaternary` is read four times and all four paint a border; `--accent-fill` is read zero times and hand-rolled three; the type ramp's three display steps have no readers while four surfaces hand-roll container titles at 20, 24, and 28px. The system is under-declared rather than broken — it publishes `--border-cell` and not its width, eleven type sizes and zero line heights — and nine of the sixteen mints Part IV proposes are ingredients that already exist unpublished. Ten edits, ranked by consumers fixed per line, close most of it; the first three are five lines.

**What this document decides, and what it leaves to Nathan.** The eight rules in Part II and the tree in Part III are the atlas's own calls, drawn from evidence and the two rulings already taken (`Detail` → `Interface`, `Views` to the root). Twenty-six decisions in Part V and the 41 taste-marked verdicts in Part IV are recommendations awaiting a stamp — the structural ones (D-A through D-I) gate the non-mechanical rows of the ledger; everything else can start on any row today. Nothing here changes behavior except one line in `ViewEmbedBlock.tsx`. The instrument is `git mv`, a lint rule, and about forty token declarations.

**How it was produced.** Seven read-only lenses, each keyed on the file path so their tables join: **Cartographer** (what each file is and who consumes it, from a resolved import graph — zero unresolved specifiers), **Boundary** (every import crossing a domain line, with direction), **Stylist** (what each file styles with), **Semantic** (whether each token read is for what the token is for), **Recipe** (whether each token's readers say it should be something else), **Lexicographer** (names against convention), and **Archivist** (what was already ruled, verified against the code). Every claim that places a file or sets a verdict was opened at its cited line before it entered this document; §VII records what was withdrawn. The joined tables sit beside the session that made them and are not part of the document.

**How to read it.** Part I is the evidence. Part II is the rules, each testable with a grep. Part III is the target — the tree and a ledger placing every file under a rule. Part IV is the token verdicts, the only section whose rows are recommendations rather than facts. Part V is the decisions the rules cannot make, each with a recommendation. Part VI is what is already settled, so a future sweep reads the ruling instead of re-raising the finding. A session doing the work reads Part III, picks rows, and consults Part V when a row's rule says `DECIDE`.

```
Renderer Atlas
├── Executive Summary
├── I. The Map As It Is
│   ├── I.1 The Shape In Numbers
│   ├── I.2 Structure
│   ├── I.3 Styling
│   ├── I.4 Naming
│   └── I.5 Token Use
├── II. The Rules
├── III. The Map As It Should Be
│   ├── III.1 The Target Tree
│   ├── III.2 What Changes And What Holds
│   └── III.3 The Ledger
├── IV. The Token Verdicts
├── V. Decisions The Tree Cannot Make
├── VI. What Is Already Settled
└── VII. Corrections Log
```

### I. The Map As It Is

#### I.1 The Shape In Numbers

Sixteen top-level folders hold 453 files and 64,412 lines. By kind: 160 models (pure logic, no React), 88 stylesheets, 86 pieces (render UI, read no store), 63 surfaces (render UI and read the store or IPC), 54 glue (hooks, adapters, contexts), 2 entries. The design system is 139 of the 453 and 12,264 lines; `Detail/` is 87 and 12,401; MarkdownPM is 69 and 14,104.

| Folder | Files | Lines | What it actually holds |
| --- | ---: | ---: | --- |
| `DesignSystem/` | 139 | 12,264 | The pieces — and three files that reach the app |
| `Detail/` | 87 | 12,401 | The main pane, the view types, the value-rendering library, the property row engine |
| `MarkdownPM/` | 69 | 14,104 | The editor; the best-structured folder in the renderer |
| `Components/` | 25 | 5,131 | Twenty-two view-settings panes and three shared strays |
| `Properties/` | 20 | 2,559 | The schema-editing surface, minted 08-25 |
| root | 16 | 3,382 | Two entries, two global sheets, and twelve app-core modules with no folder |
| `Toolbar/` · `Navigation/` · `PagePreview/` | 12 each | 3,705 | — |
| `SurfacePM/` · `Blocks/` · `Embeds/` | 11 · 10 · 10 | 5,439 | The tile world, split three ways |
| `Sidebar/` · `Settings/` · `Tabs/` | 9 · 8 · 7 | 4,847 | — |
| `testing/` · `NavWindow/` | 4 · 2 | 580 | — |

Three numbers frame everything below. **Zero** dead files — every file but the three that are meant to have no importer (`env.d.ts`, `main.tsx`, `testing/setup.ts`) is reached. **Thirty** files have no importer inside their own folder, the sharpest single wrong-folder signal. **Three** files inside the design system import the app.

#### I.2 Structure

**The design system reaches upward in exactly three files, and two of them read the store.** `DesignSystem/Components/AssetImage/AssetImage.tsx:6-7` imports `@renderer/assetUrl` and `@renderer/store`; `DesignSystem/Components/Pickers/ImagePicker/ImagePicker.tsx:14-15` does the same and adds the only two `window.nexus` calls in the design system at `:137` and `:200`; `DesignSystem/Elements/PickerControl/PickerControl.tsx:7` imports `@renderer/nativeMenus`, which is itself store and IPC. The other 136 files hold the boundary. The Showcase deploys from these same sources, so two components in the deployed library need a nexus store to render. The pattern that fixes it already exists in the codebase: `Settings/IconPicker.tsx` is a ten-line wrapper that binds this nexus's favorites and hands them to the design-system `IconPicker` as a prop. A fourth reach is a type only — `DesignSystem/Symbols/index.tsx:81` imports `EntityIconKind` from `@shared/types` so the glyph registry can be keyed by entity kind (`:201`, `:214`) — and is the one the design system should name as deliberate rather than close.

**`Components/` is `Detail/`'s satellite, not a components folder.** Twenty-two of its twenty-five files sit under `Components/Detail/` and make twenty-six import edges into `Detail/` — the pipeline, `Table/`, `ViewSettingsScope`, `Scope`. Ten of the twenty-five read the store. `Components/Detail/settingsPane.css.ts` has 21 consumers, 10 of them the property editors under `Properties/`, which makes a stylesheet named after a pane the single largest lateral edge in the graph. The three files that are genuinely app-shared — `EntityIcon.tsx` (6 consumers, 4 folders), `RenamableTitle.tsx` (4, 3), `useNexusIcon.ts` — are the ones the folder's name describes. The word `Detail` now names three unrelated folders: the main pane, the view-settings panes, and the design system's window chassis.

**The renderer root is an unnamed core folder.** Twelve modules beside the two entries and two global sheets, every one consumed across folders: `store.ts` (1,906 lines, 114 consumers, all sixteen folders), `treeIndex.ts` (21 consumers, 17 cross-folder), `assetUrl.ts` (9, 7), `linkResolve.ts` (6, 6), `pageMenuActions.ts` (5, 5), `openWebLink.ts`, `selection.ts`, `Commands.ts`, `destinationTree.ts`, `nativeMenus.ts`, `nativeCaret.ts`. The codemap documents two of them.

**The store is the composition root, not a leaf.** `store.ts:29-101` imports twelve feature modules — `Detail/Views/creationOrder`, `PagePreview/previewTabs`, `Navigation/navRecents`, `Tabs/tabsModel`, `Tabs/warmCache`, `PagePreview/previewWarm`, `PagePreview/WindowMorph`, `Detail/pageFlush`, `Navigation/useNavThumbnails`, `Detail/Scope`, `Detail/Subfield/crumbs`, `Detail/Views/viewMint` — and 114 files import it back. Every one of those folders is therefore in a cycle with the store. This is a Cleanup-lane fact (the store split is Bundle 5) and is recorded here because the target tree cannot make those folders independent while it holds; the tree below is honest about which edges the store keeps.

**`Detail/Views/Table/` is the renderer's cell-and-value library wearing a view type's name.** Thirty-eight imports from twenty-four files reach into it, nine of them from outside `Detail/` entirely — `Properties/`, `Settings/`, `PagePreview/`, `Navigation/`, `Components/`, `main.tsx`. What they import is not the table: `resolveContext` (8 importers), `solidColor` (6; `resolveColor` and `solidColorCss` are token math), `Cell` (3), `columnStyles` (3), `columnLabel` (3), `checkboxLook`, `tableDnd` (the nav list's row drag), and two stylesheets that `main.tsx:18-19` loads globally so every surface depends on the table's CSS whether it imports it or not. The prior count of "8 files at 12 sites" and today's 18 files at 24 sites differ by counting scope, not by growth; the Architecture Audit's claim that this compounds passively is plausible and unproven.

**Thirty files have no importer inside their own folder.** Outside the design system, where serving other folders is the job, the worst are `Settings/IconPicker.tsx` (14 consumers, none in `Settings/`), `Embeds/ViewEmbedScope.tsx` (15, 14 outside — a React context telling a pane it sits inside an embed, which is view infrastructure filed as an embed detail), `Tabs/warmCache.ts` (13, 12 outside — a cache, not a tab), `Embeds/connectionMenu.ts` (10, all outside), `Sidebar/sidebarDndModel.ts` (15, 11 outside — a generic reorder model that `Components/Detail/paneDnd*` and `hiddenPaneModel` run on), `Navigation/navRecents.ts` (15, 10 outside), and `Tabs/tabsModel.ts` (12, 10 outside). Three of `Navigation/`'s twelve files exist only for `NavWindow/` and `Tabs/`; `Navigation/` is a library that two surfaces use, with zero pieces of its own.

**Property editing has two homes and the upstream one is filed under a view.** `Detail/Views/PropertyEditing/` holds the app's shared property-value vocabulary — `formatValue.ts` (12 consumers, 5 folders), `PropertyPicker.tsx` (7, 3), `OptionChip.tsx` (6, 3), `PropertyEditor.tsx`, `DatetimeValuePicker.tsx` — and `Properties/` imports `Detail/` seventeen times across seven files to reach it; `PagePropertiesPane.tsx` alone pulls nine modules out of `Detail/Views`. Eleven of `PropertyEditing/`'s fourteen consumers are view surfaces, so it is not the panes' row engine as the open question assumed. `usePropertyRows.ts` is the exception: exactly two consumers, `Properties/PagePropertiesPane.tsx:26` and `PagePreview/PreviewInspector.tsx:28`, and those two files share roughly 470 identical lines of row chrome.

**The lateral graph.** Feature-to-feature importing-file counts, the ones that show which folders are really one domain: `Properties → Components` 12 (entirely `settingsPane.css.ts`), `Components → Detail` 9, `Components → Embeds` 8 (entirely `ViewEmbedScope`), `Components → Properties` 7, `MarkdownPM → Embeds` 7, `Components → Sidebar` 6 (entirely `sidebarDndModel`), `Detail → Embeds` 6, `Detail → Tabs` 6, `Embeds → Tabs` 6. Sixteen feature-folder pairs import each other in both directions. `MarkdownPM/` (134 files, four outbound lateral edges) and `SurfacePM/` (zero outbound) are the boundaries that hold.

**IPC is narrow at the preload and wide at the call sites.** `window.nexus` is called at 200 sites across fourteen of sixteen folders against 85 channels, with no renderer-side client module, so the `Result` envelope is unwrapped by hand two hundred times. This is a Cleanup-lane finding — it belongs beside the `main/index.ts` split, which carves the same context from the other side — and is recorded here because the boundary rule in Part II names it.

#### I.3 Styling

**The form split, and the claim about it.** 185 files carry styling: 41 plain `.css`, 47 vanilla-extract `.css.ts`, 37 components with both a stylesheet and `style={{}}`, 60 components authoring CSS values in TS. The stated rule — plain `.css` is for surfaces whose class names CodeMirror or imperative DOM emits — is true of six files: `MarkdownPM/Styles.css`, `MarkdownPM/Tables/widget.css`, `Carets.css`, `DesignSystem/Interactions/dropChrome.css` (`dragChrome.ts:51` sets `className = 'drop-line'`), `DesignSystem/Detail/tile-chassis.css`, `Embeds/embeds.css`. Six more follow a better rule nobody stated: **a class-name contract crossing module boundaries**, where the sheet paints names it does not emit — `resize-strip.css` paints five owners' resize handles, `reveal-bar.css` three toggles, `overScroll.css` the `.over-scroll-*` contract, `previewPane.css` sixteen `--ppane-*` vars two windows read, `table-tokens.css` and `card-tokens.css` their families' geometry. `styles.css` is the shell's var block. That leaves **28 plain sheets for ordinary React components** with string classNames, several large and knob-dense: `Sidebar.css` (24 px literals, 6 vars), `CardsView.css` (22, 10 vars, 9 knobs), `tabBar.css` (14 vars), `checkbox.css` whose only emitter is `Checkbox.tsx:32`.

**Six feature sheets load globally from `main.tsx:16-20`** — `Sidebar/Sidebar.css`, `Detail/Detail.css`, `Detail/Banner/Banner.css`, `Detail/Views/Table/table-tokens.css`, `Detail/Views/Table/Table.css` — with no global justification, and four of them are also imported by their own component, so nobody knows which import is load-bearing. The design-system sheets on `main.tsx:6-13` are correctly global: the token bridge (`Tokens/index.ts:5` pulls `theme-vars.css`, without which nothing works), the drag chrome, the ghost, the overscroll contract, the resize strips, the reveal bars, the card geometry.

**Motion is perfect.** Every transition reads `var(--duration-*)` or `duration.*`. The four raw times are a caret blink cadence (`Carets.css:9`) and three `0s` delays. Color is near-perfect: 21 raw values in five files, all but two explicable — the token sources, the frost recipe's four specular whites (`Materials/glass-material.ts:21-26`, white-light physics rather than palette), the melt gradient's black stops. The two strays: `DesignSystem/Components/Menu/NotchedPane.tsx:112` `stroke="#FFFFFF"`, and `DesignSystem/Interactions/group.tsx:723` inlining a `color-mix` that is character-for-character `--accent-stroke` from `theme-vars.css.ts:107`.

**Geometry is where the discipline stops.** 681 bare pixel values across 168 files (excluding `0px` and every `1px`), on an unnamed scale: `6px` ×101, `8px` ×72, `4px` ×68, `12px` ×44, `2px` ×43, `16px` ×40, `10px` ×33, `14px` ×27, `3px` ×24, `5px` ×20, `28px` ×18, `24px` ×17, `20px` ×17. That is a 4px grid with a 2px foot — `2·4·6·8·10·12·14·16·20·24·28` — already agreed on by the code and never named; `4`, `6`, `8` alone are 241 of the 681. The design system's own component layer is no more disciplined than feature code here: `calendarPicker.css.ts` carries 38, second only to `MarkdownPM/Styles.css` (54) and ahead of the two token files that are supposed to hold pixels. DesignSystemPM's Pending section already says spacing and radius stay ad-hoc pending a Figma lift; 681 is what ad-hoc costs. Radius restates the same way: `6/8/10/12` live in `size.control['button-*'].radius` (`size.css.ts:24-68`) and are hand-restated at `group.tsx:723`, `Slider.tsx:106`, `ImagePicker.tsx:31`, `styles.css:10`, `pickerMenu.css.ts:96`, `notchedPane.css.ts:4` — six writers for four numbers. The standing ruling that radius literals stay literal (Part VI) is about *feature* sites picking from the set; it does not cover the set being declared six times.

**356 custom properties are declared, 224 of them outside `Tokens/`.** Four are orphans, all deliberate — `--safe-top/right/bottom/left` at `styles.css:13-16`, forward declarations for the mobile shell with the comment saying so. Nine are declared by the app and read from inside the design system; seven carry fallbacks and are override hooks by design. **Two are hard upward dependencies with no fallback:** `--glass-inset` (`styles.css:9`, read at `DesignSystem/Detail/PreviewPane/previewPane.css:17`) and `--glass-radius` (`styles.css:10`, read at `previewPane.css:10` and `DesignSystem/Detail/SidePane/sidePane.css:10`). Mount either shell in the Showcase without `styles.css` and it loses its inset and corner radius — the one place the layering rule is actually broken in CSS. Three more families behave like tokens and are declared in app files by accident of history: the shell's three dimensions (`--toolbar-h`, `--sidebar-width`, `--inspector-width`), the layout grid (`--content-inset`, `--content-inset-right`, `--content-gutter`, `--surface-inset*` at `styles.css:104-120`, 36 reads across five features), and `--subline-h` (24px in two homes, with `previewWindow.css:7` a comment explaining why the value is duplicated — a token asking to exist in writing).

**Two channels nobody owns.** `--over-scroll-fade` has fourteen override sites; nine sit on a `12/16/20/24px` ladder and five route through private aliases (`FADE_RISE`, `SEGMENT_FADE`, `CONTENT_FADE`, `--tab-over-scroll`, and `--ppane-toolbar-h`, which resolves to a 34px toolbar height, off the ladder entirely). It stopped being an override hook and became an unnamed four-step scale. And seven scale vars multiply each other with no stated composition rule — `--zoom`, `--block-zoom`, `--label-zoom`, `--mdpm-scale`, `--editor-scale`, `--card-scale`, `--glyph-scale` (`Styles.css:41`: `calc(var(--mdpm-scale) * var(--block-zoom, 1))`) — plus `--cover-zoom`; a var per surface, growing.

**The root font is not the design system's font.** `styles.css:31-38` sets `body { font: 13px/1.4 "Inter Variable", -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif }`. The size restates `text.body` by hand, the line-height is `1.4` where `text.body` is `13/16` = 1.23, and the stack contains `"SF Pro Text"` where `typography.css.ts:8`'s does not and lacks the `'Segoe UI', Helvetica, Arial` that it does. The app's root stack and the design system's are two different stacks. The bridge publishes sizes but not line heights (`theme-vars.css.ts:135-145`), which is why this line could not read a token even if it tried.

**The container title has three values.** `DetailTitleHeader.css:7` says `--detail-title-size: 24px`; `Banner.css:9,57,142` say `var(--container-title-size)` = 20px (`size.css.ts:102`, read by the Banner alone); `embeds.css:200` and `MarkdownPM/Styles.css:138` say `calc(28px * scale)`. The type ramp's three display steps — `text.largeTitle` 26px, `text.title1` 22px, `text.title2` 17px — have zero consumers. Where the headings went is the 20/24/28.

**Inline styles are 83 sites in 50 files, and most are right.** Measured geometry (`MarkdownPM/Tables/TableView.tsx:452-551`, `ImagePicker.tsx:251-297`), custom-property injection (`PageEmbed.tsx:141`, `Cell.tsx:71`), and genuinely dynamic values (`Reveal.tsx:53,73`, `NotchedPane.tsx:98`) could not be a stylesheet. The static offenders are fourteen, nine of them inside the design system, and two are byte-identical in different files: `Detail/Views/Cards/CardAddPicker.tsx:130` and `Detail/Views/PropertyEditing/PropertyPicker.tsx:123` both write `{ minWidth: 96, height: 24 }`.

**One selector drives an arms race, and it is still recruiting.** `Toolbar/toolbar.css:98` sets `color` on `.app-toolbar button` at specificity (0,1,1); a vanilla-extract class is (0,1,0), so every button rendered inside the toolbar loses its color to it. Seventeen doubled selectors and escalations to `&&&` (`menu.css.ts:235`, and `imagePicker.css.ts:72`, a site that did not exist when the Design Report was written) and `&&&&` (`settingsPane.css.ts:394`) exist to outrank it; `groupingPane.css.ts:29` documents triple-classing to outrank *another component's* escape hatch. Eleven of the doubles name the toolbar rule in their own comments.

**`--gutter` means two things.** `styles.css:105` declares it as `var(--content-gutter)` (24px) on `.shell`; `Detail/Views/Table/table-tokens.css:27` redeclares it as `var(--fold-gutter)` (20px) on `.table-view`. A legal cascade, an illegible name, and `MarkdownPM/Styles.css` reads it too.

#### I.4 Naming

**One casing rule already governs 95% of the tree.** A file is PascalCase if and only if its primary export is a React component; everything else — hooks, models, pure functions, CM6 extensions, stylesheets — is lowerCamel. Fifteen of sixteen folders run it. The exceptions are 29 individual files and two dialects: `DesignSystem/Materials/glass-*.tsx`, six kebab-case files in a folder whose seventh file, `Surface.tsx`, is PascalCase; and the lowercase subfolders under `MarkdownPM/` and `SurfacePM/` (`editor/`, `detect/`, `parser/`, `tokens/`, `input/`, `connections/`, `decorations/`, `core/`, `sensors/`) plus `Detail/Views/pipeline/`, where the habit has leaked out. Stylesheets break the lowerCamel-beside-its-component rule 21 times — six PascalCase (`Detail.css`, `Table.css`, `Styles.css`, `Carets.css`, and `Banner.css`/`Sidebar.css`, which at least pair with PascalCase components), eight kebab, one all-lowercase (`surfacepm.css`, the abbreviation destroyed), and nine orphans whose named component does not exist. Two `Elements/` folders — `Segment/` and `DropOutline/` — contain only a stylesheet, so consumers reach past the empty shell into the file.

**`PM` is a documentation convention that leaked into two folder names.** All eighteen feature docs are `*PM.md`; only `MarkdownPM/` and `SurfacePM/` exist as folders, and `PommoraDND` — an in-house engine by the same test — lives at `DesignSystem/Interactions/` without one. `MarkdownPM` is a product name that appears in user-facing prose and the model section of CLAUDE.md; `SurfacePM` is a leftover that has already produced `surfacepm.css` and the renderer's only per-folder README. **`DND` has four casings**: `PommoraDND` (the feature's name, in docs), `Dnd` (every identifier and twelve of sixteen filenames), `dnd` (43 CSS classes and locals), `DnD` (4). `Dnd` wins by two orders of magnitude and is the only spelling that survives PascalCase composition.

**Seven folder names mislead.** Three `Detail` folders for three unrelated things. `NavWindow/` holds one component next to `Navigation/`, which holds everything that component displays; InterfacePM §The NavWindow already says what it is *for* is Navigation's. `Tabs/NavView.tsx` is a routed detail view whose only importer is `Detail/DetailPane.tsx:14`, filed away from its four siblings. `Detail/Views/` means both routed screens one level up (`Detail/*View.tsx`) and Collection view *types* inside. `Blocks/` and `SurfacePM/` name the same unit `block` and `tile` — `SurfacePM/core/model.ts` exports `TileLeaf`, `moveTile`, `splitAtTile`; `Blocks/` exports `BlockSurface`, `MarkdownBlock`, `PageEmbedBlock`; and `SurfacePM/SurfaceView.tsx:24`, inside the tile engine, reads "Moving a **block** lifts THE BLOCK ITSELF." `Detail/Views/PropertyEditing/` and `Properties/Editors/` are two folders of property editors in two vocabularies with a `DatetimeValuePicker`/`DateTimeEditor` capitalization split on the same word. `Components/` and `DesignSystem/Components/` are both called Components, and `Settings/IconPicker.tsx` exports an `IconPicker` that shadows the design system's, which it imports aliased as `Picker` (`:2`) — ten call sites import the Settings one, almost certainly believing otherwise.

**The concept table.** Seventeen concepts checked for two spellings. Confirmed and worth settling: **tile vs block** (179 vs 198, `block` inflated by MarkdownPM's unrelated paragraph model — tile wins); **Pane vs Panel** (397 vs 2 real — `InspectorPanel`, `AutocompletePanel`); **View vs Renderer** (1,101 vs 7, all one file and its importers — `ViewRenderer` also collides with `src/renderer` and the `@renderer` alias); **icon vs glyph** (877 vs 92 — `EntityGlyph` and `EntityIcon` are two wrappers over one `Icon`, and `EntityIcon.tsx:5` calls itself a glyph in its own docstring); **zoom vs scale** (85 vs 61, zoom wins); **Space vs board** (`board` has four UI-string hits and zero identifiers — `noun="board"` at `Toolbar/SpaceDropdown.tsx:89` and `Components/Detail/SettingsScaffold.tsx:51`, a title at `Blocks/BlockHandleMenu.tsx:213` — a fourth vocabulary for a thing the model calls a Space and the engine calls a Surface); **band ×3** (SurfacePM's layout run, the Views' group header, and the window toolbar's "band form" — three unrelated concepts on one word, where `pipeline/group.ts` already exports `ResolvedGroup` for the thing `GroupBand` renders); **`PickerChoice` vs `PickerOption`** (43 vs 42, two spellings for one list in the same layer); **warm vs cache** (warm wins). **Refuted, do not re-raise:** nexus vs vault (zero identifiers; three Obsidian-interop comments), chip vs label (DesignSystemPM §Labels & Chips defines chip as a recipe of Label — correct as-is), pane vs dropdown (`Toolbar/` runs a real two-tier convention: `ViewDropdown.tsx:56-65` wraps `ViewPane` in `MenuDropdown`; `SettingsDropdown.tsx:23` wraps `SettingsPane`), select vs option (`shared/properties.ts:15,102,194` layers them correctly — type is `select`, values are `options`), crumb vs trail (split by layer, reads fine).

**The floating-surface vocabulary already exists and nobody wrote it down.** DesignSystemPM:205-206 defines Surface (the base material), Pane (anything floating over the shell, no body), Window (the pane tier carrying a body), Dropdown (a Pane anchored to a trigger, owning its open state), Menu (the row list inside), Picker (a Menu whose rows are values). The app is 90% compliant. The four violations: `InspectorPanel` (a Pane), `AutocompletePanel` (a Menu — DesignSystemPM:205 lists the autocomplete as a thing that mounts `GlassPane`), `Toolbar/NavPane` rendered bare at `Toolbar.tsx:114` while both its siblings go through a Dropdown shell, and — the important one — the chassis every window mounts is named `PreviewPane`. Four windows use it, one of them previews nothing, and its stylesheet holds the Settings window's dimensions. The name is a fossil of the first window that needed it.

#### I.5 Token Use

Where the inventory above measures *whether* a token is read, the two token lenses measure whether it is read *for what it is for* and whether the token's own definition survives contact with its readers. The consumer side is 96% right: 45 findings against 1,071 token reads, and the misuse is one shape rather than a spread — when a surface needs an edge, it reaches for a label tone. Nine of the twelve sites that do it are inside the design system, six of them in `Components/Controls/`, which is why the fifth control's author reads it as convention. The recipe side is where the design system's own definitions have been outvoted by their readers: `label.quaternary` has four reads and all four paint a border; `--accent-fill` has one read and three hand-rolled equivalents; the type ramp's three display steps have zero reads while four surfaces hand-roll container titles at 20, 24, and 28px. Part IV carries the rows.

### II. The Rules

Eight statements that decide where anything goes. Each is testable with a grep, each is what the tree in Part III was drawn from, and each is what files the next module when this tree is out of date. A rule that cannot be tested is a preference; these are not preferences.

**R1 — Reach decides the layer.** A module that imports `@renderer/store`, calls `window.nexus`, or imports `nativeMenus` is a *surface* or *glue* and lives in a feature folder. A module that does none of those and knows no entity kind is a *piece* and may live in `DesignSystem/`. `DesignSystem/**` imports nothing from `@renderer/*` outside itself; its one sanctioned type-only reach is `Symbols/` reading `EntityIconKind` from `@shared`. *Test:* `grep -rl "@renderer/store\|window\.nexus\|@renderer/nativeMenus" DesignSystem/` returns nothing; a Biome `noRestrictedImports` rule makes it a gate (Part V, D014).

**R2 — Consumers decide the folder.** A module consumed from three or more top-level folders, with no plurality in any one, is shared: a piece goes to `DesignSystem/`, a model or glue to `Core/`, an app-bound wrapper over a design-system piece to `Components/`. A module with every consumer in one other folder belongs in that folder. *Test:* the Cartographer's `cross_folder_consumers` column against `consumer_count`; a file with zero importers in its own folder has failed this rule.

**R3 — A folder is named for what it holds, and no name appears twice.** `Detail` may not mean the main pane, the settings panes, and the window chassis. `Components` may not mean the app's wrappers and the design system's pieces. A folder holding one file is a file. *Test:* `find . -type d | xargs -n1 basename | sort | uniq -d` returns nothing under `renderer/src`.

**R4 — One home for schema, one home for values.** `Properties/` is the schema-editing surface: the panes that assign, rename, and retype a property and the per-type option editors. `Views/Values/` is value rendering: the formatters, the cell, the pickers a value opens, the checkbox glyph, and column styling. A file that renders what a property *holds* is a value; a file that edits what a property *is* is schema. *Test:* nothing under `Properties/` imports from `Views/Values/` except the two panes that display values, and nothing under `Views/` imports from `Properties/`.

**R5 — A value read from two folders is a token, and a token is declared once.** Tokens are declared in `DesignSystem/Tokens/`; the frost recipe's specular constants in `Materials/`; a per-surface tuning value is a `KNOB` with exactly one owner and a fallback at every read. A CSS custom property declared in an app file and read from another folder has failed this rule. Spacing reads a named step (`--space-*`, once minted) and a literal outside the step set is what needs justifying — the standing ruling on radius literals (Part VI, #1) extends to the spacing grid the code already agreed on. *Test:* `stylist-vars.csv`'s `shared` and `leaked-into-system` rows; after the moves, `grep -rh "^\s*--[a-z-]*:" --exclude-dir=Tokens --exclude-dir=Materials .` lists only `KNOB`-commented and component-scoped declarations.

**R6 — The style form follows the class-name contract.** Plain `.css` is for a sheet that paints class names it does not emit — CodeMirror decorations, imperative DOM, or a cross-module contract like the resize strips. Everything else is `.css.ts`. A `style` prop carries only a value computed this frame or a custom-property assignment; a literal length, color, weight, or display value in a `style` prop is a lint error. *Test:* for each `.css` file, the emitter of its classes is a different module or a non-React one; `grep -rn "style={{" | grep -E "[0-9]+[,}]|'#|display:"` lists the fourteen static sites and nothing else.

**R7 — The name says what it is.** PascalCase if and only if the primary export is a React component; lowerCamel otherwise, stylesheets included, beside the component they dress; folders Capitalized, no exceptions inside `MarkdownPM/` or `Surface/`. Floating surfaces use the design system's six words: Surface, Pane, Window, Dropdown, Menu, Picker. `Dnd` is the identifier spelling of the engine `PommoraDND` names in prose; `PM` appears in one folder name, `MarkdownPM`, because it is a product name. *Test:* `lexicographer-files.csv` empties; `find . -type d -name '[a-z]*'` returns only `testing/`.

**R8 — The root holds entries and global sheets.** `main.tsx`, `App.tsx`, `styles.css`, `Carets.css`, `env.d.ts`, and nothing else. App-core modules live in `Core/`. *Test:* `ls renderer/src/*.ts*` lists two files.

Two rules are recorded for the Cleanup lane rather than this one, because they change behavior rather than location: `window.nexus` reaches the renderer through one client module, and the store does not import feature modules. Both are Codebase-Cleanup bundles (5 and 7); the tree below assumes neither and is correct without them.

### III. The Map As It Should Be

#### III.1 The Target Tree

Sixteen top-level folders become fourteen, and each answers "what is this" in one word. New folders are marked. Files are shown where they carry a finding; the ledger in III.3 places every one.

```
// src/renderer/src                     | • The React renderer — it never touches Node
├── // Components                       | • App-bound wrappers over design-system pieces, and the view-settings panes
│   ├── // Detail                       | • The Settings dropdown's panes — filter, group, sort, hide, view settings; stays by ruling
│   ├── AssetImage.tsx                  | • NEW — binds the asset map and crops; the design-system piece takes them as props
│   ├── EntityIcon.tsx
│   ├── IconPicker.tsx                  | • MOVED from Settings — binds this nexus's favorites
│   ├── ImagePicker.tsx                 | • NEW — binds paste, pick, and the asset map
│   ├── PickerControl.tsx               | • NEW — binds the native row menu
│   ├── RenamableTitle.tsx
│   ├── iconFavorites.ts                | • MOVED from Settings
│   └── useNexusIcon.ts
├── // Connections                      | • NEW — the hover card and the link menu, with link resolution
│   ├── ConnectionHoverCard.tsx
│   ├── HoverCardPresenter.ts
│   ├── connectionMenu.ts               | • Ten consumers, none of them Embeds
│   ├── hoverCardSize.ts
│   ├── linkResolve.ts                  | • MOVED from the root
│   └── openWebLink.ts                  | • MOVED from the root
├── // Core                             | • NEW — the app-core modules the whole renderer reads
│   ├── Commands.ts
│   ├── assetUrl.ts
│   ├── destinationTree.ts
│   ├── nativeCaret.ts
│   ├── nativeMenus.ts
│   ├── pageMenuActions.ts
│   ├── selection.ts
│   ├── store.ts                        | • 1,906 lines; the split is Cleanup Bundle 5
│   ├── treeIndex.ts
│   └── warmCache.ts                    | • MOVED from Tabs — a cache, not a tab
├── // DesignSystem                     | • The pieces; DesignSystemPM is its ledger; Detail/ and Showcase/ are gone
│   ├── // Animation
│   ├── // Components
│   │   ├── // Controls
│   │   ├── // Fields
│   │   ├── // Menu
│   │   ├── // PaneSlider
│   │   ├── // Pickers                  | • Stays; PickerMenu is the most-composed primitive in the system
│   │   ├── // AssetImage               | • Props-only after the wrapper lands
│   │   └── // WindowChassis            | • RENAMED from Detail/PreviewPane — the shell every window mounts
│   ├── // Elements
│   ├── // Interactions
│   │   ├── TableRowDnd.tsx             | • MOVED from Detail/Views/Table/tableDnd — the nav list's row drag
│   │   └── reorderModel.ts             | • MOVED from Sidebar/sidebarDndModel — a generic reorder model
│   ├── // Labels
│   ├── // Materials                    | • Gains --glass-radius and the specular constants; glass-*.tsx become Glass*.tsx
│   ├── // Symbols                      | • Knows the entity kinds by design — named as the one sanctioned reach
│   ├── // Theming
│   ├── // Tokens                       | • Gains solidColor.ts, the spacing steps, the shell geometry, --subline-h
│   └── // Util
├── // Embeds                           | • The embed framework's consumers — page, webpage, retention
├── // Interface                        | • RENAMED from Detail — the main window's chrome and its routed pane
│   ├── // Banner
│   ├── // InspectorPane                | • RENAMED from InspectorPanel
│   ├── // Sidebar                      | • MOVED from the root
│   ├── // Subfield
│   ├── // Toolbar                      | • MOVED from the root
│   ├── ContainerView.tsx
│   ├── DetailPane.tsx
│   ├── DetailScaffold.tsx
│   ├── HomepageView.tsx
│   ├── NavView.tsx                     | • MOVED from Tabs — the fifth routed view, beside its four siblings
│   ├── PageView.tsx
│   ├── SpaceView.tsx
│   └── scope.ts
├── // MarkdownPM                       | • The editor; subfolders capitalize; otherwise untouched
├── // Navigation                       | • The nav layer — absorbs Tabs; NavWindow is a Window
│   ├── TabBar.tsx                      | • MOVED from Tabs
│   ├── tabsModel.ts                    | • MOVED from Tabs — per-tab history is navigation
│   └── …
├── // Properties                       | • The schema-editing surface — the panes and per-type option editors
├── // Settings                         | • The Settings window alone
│   └── // SidePane                     | • MOVED from DesignSystem/Detail — its one consumer is here
├── // Showcase                         | • MOVED out of DesignSystem — a deployed site, not a piece
├── // Surface                          | • RENAMED from SurfacePM; absorbs Blocks — the tile world in one folder
│   ├── // Blocks                       | • Tile content; block becomes tile in identifiers
│   ├── // Core
│   ├── // Sensors
│   ├── SurfaceView.tsx
│   ├── actionBand.css.ts               | • MOVED from Detail — Blocks is its only consumer
│   └── tileChassis.css                 | • MOVED from DesignSystem/Detail
├── // Views                            | • MOVED out of Detail — saved-view presentation
│   ├── // Cards
│   ├── // Pipeline                     | • Capitalized
│   ├── // Table                        | • The table view only; the cell library leaves
│   ├── // Values                       | • RENAMED from PropertyEditing, plus Cell, columnStyles, columnLabel, checkboxLook, resolveContext
│   ├── ViewEmbedScope.tsx              | • MOVED from Embeds — view infrastructure, fourteen consumers outside Embeds
│   ├── ViewRenderer.tsx
│   └── …
├── // Windows                          | • NEW — the floating family, one chassis, one morph
│   ├── // BrowserWindow                | • Split out of PagePreview
│   ├── // NavWindow
│   ├── // PagePreview
│   ├── previewWarm.ts
│   ├── usePreviewWarm.ts
│   └── windowMorph.ts                  | • The FLIP between windows
├── // testing                          | • The shared test harnesses; gains Navigation's fixture tree
├── App.tsx
├── Carets.css
├── env.d.ts
├── main.tsx                            | • Loads the design system's global sheets and styles.css; no feature sheets
└── styles.css                          | • The shell's own vars and resets; the layout grid and glass geometry leave for Tokens
```

Folder counts after the moves, over the Cartographer's 453 rows: `DesignSystem` 139 (WindowChassis and two Interactions arrive, Detail empties; the Showcase's 27 files sit outside the 453 by the Cartographer's stated scope and move as one folder row), `Views` 60, `Interface` 46, `Components` 28, `Surface` 23, `Properties` 20, `Navigation` 15, `Windows` 14, `Core` 10, `Settings` 8, `Connections` 6, `Embeds` 5, root 5, `testing` 5, `MarkdownPM` 69 unchanged.

#### III.2 What Changes And What Holds

**228 files move; 225 stay.** Of the moves, 87 are renames under R7 alone (casing, the `glass-*` six, the lowercase subfolders, stylesheets to lowerCamel) — mechanical and `git mv`-able in one commit. 47 ride the two rulings already taken, `Detail` → `Interface` and `Views` to the root. 58 move because their folder did not name what they were (R3): `Toolbar/` and `Sidebar/` into `Interface/`, `Tabs/` into `Navigation/`, the three windows into `Windows/`, the tile world into `Surface/`, the hover card and link menu into `Connections/`. 19 move to where their consumers are (R2). 15 consolidate value rendering (R4). One is a token (`solidColor.ts`, R5) and one a style-form fix (`tile-chassis.css`, R6).

**What holds, and why.** `MarkdownPM/` moves nothing but its subfolder casing: 134 files with four outbound lateral edges is the boundary every other folder should envy. `Properties/` holds as minted. `Components/Detail/` stays by the 08-25 ruling; the atlas records that its correct name is `Components/ViewSettings/` and that the rename waits for the folder to be opened for real work. `DesignSystem/Pickers/` stays: `PickerMenu` is the rectangle every menu mounts (~30 consumers) and moving it out would strand them on a feature-folder import; what makes the design system read as an "owner" is the three upward reaches, and closing those fixes the perception without a `git mv`. `Embeds/` shrinks to the five files that are embeds. `testing/` is correctly placed and correctly aliased; the only change is `Navigation/testTree.ts` joining it.

**What the tree does not do.** It does not split the store, unwrap IPC, or touch a line of behavior. It does not mint the spacing scale, close the three design-system reaches, or unwind the toolbar selector — those are edits, not moves, and Part V carries each as a decision with a recommendation. A session can execute any row of the ledger below in isolation; the typecheck catches every miss, and the import-rewriting the 08-25 session used is the instrument.

**Scaling.** The rules, not the tree, are what survive growth. A tree drawn for 453 files will be wrong in some detail at 1,400; the eight rules will still file every new module. Three seats are built for that growth: `Core/` takes the models every future feature reads; `Windows/` takes the fourth and fifth floating windows; `Views/Values/` takes every renderer a new view type needs, which is exactly what Cleanup Bundle 6c's view host is built to receive. A new feature folder appears when a domain has three or more surfaces of its own — `Connections/` is the first one this atlas mints on that test — and never before.

#### III.3 The Ledger

Every moved file, grouped by destination, with the rule that placed it and its consumer counts (`c` total, `x` outside its current folder). The 225 that stay are not listed; they are every file under `DesignSystem/` not named here, all of `Properties/`, `Components/`, the five entries at the root, and the `MarkdownPM/` files at its root. One row sits outside the Cartographer's 453: `DesignSystem/Showcase/**` (27 files, R1) moves whole to `Showcase/`, its four upward reaches into `Detail`, `Settings`, and `SurfacePM` becoming ordinary feature imports the moment it stops being a child of the tree it demonstrates.

**→ `Core/`** — 10 files

| From | To | Rule | Why |
| --- | --- | --- | --- |
| `Commands.ts` | `Core/Commands.ts` | R2 | c=3 x=1 model |
| `Tabs/warmCache.ts` | `Core/warmCache.ts` | R2 | c=13 x=12 glue |
| `assetUrl.ts` | `Core/assetUrl.ts` | R2 | c=9 x=7 model |
| `destinationTree.ts` | `Core/destinationTree.ts` | R2 | c=3 x=1 model |
| `nativeCaret.ts` | `Core/nativeCaret.ts` | R2 | c=1 x=0 model |
| `nativeMenus.ts` | `Core/nativeMenus.ts` | R2 | c=2 x=2 glue |
| `pageMenuActions.ts` | `Core/pageMenuActions.ts` | R2 | c=5 x=5 glue |
| `selection.ts` | `Core/selection.ts` | R2 | c=5 x=1 model |
| `store.ts` | `Core/store.ts` | R2 | c=114 x=107 glue |
| `treeIndex.ts` | `Core/treeIndex.ts` | R2 | c=21 x=17 model |

**→ `Connections/`** — 6 files

| From | To | Rule | Why |
| --- | --- | --- | --- |
| `Embeds/ConnectionHoverCard.tsx` | `Connections/ConnectionHoverCard.tsx` | R3 | c=7 x=5 surface |
| `Embeds/HoverCardPresenter.ts` | `Connections/HoverCardPresenter.ts` | R3 | c=3 x=2 model |
| `Embeds/connectionMenu.ts` | `Connections/connectionMenu.ts` | R3 | c=10 x=10 glue |
| `Embeds/hoverCardSize.ts` | `Connections/hoverCardSize.ts` | R3 | c=2 x=0 glue |
| `linkResolve.ts` | `Connections/linkResolve.ts` | R3 | c=6 x=6 glue |
| `openWebLink.ts` | `Connections/openWebLink.ts` | R3 | c=5 x=4 glue |

**→ `DesignSystem/`** — 11 files

| From | To | Rule | Why |
| --- | --- | --- | --- |
| `Detail/Views/Table/tableDnd.tsx` | `DesignSystem/Interactions/TableRowDnd.tsx` | R2 | c=3 x=1 glue |
| `Sidebar/sidebarDndModel.ts` | `DesignSystem/Interactions/reorderModel.ts` | R2 | c=15 x=11 model |
| `DesignSystem/Detail/PreviewPane/PreviewPane.tsx` | `DesignSystem/Components/WindowChassis/PreviewPane.tsx` | R3 | c=5 x=4 piece |
| `DesignSystem/Detail/PreviewPane/previewPane.css` | `DesignSystem/Components/WindowChassis/previewPane.css` | R3 | c=1 x=0 style |
| `Detail/Views/Table/solidColor.ts` | `DesignSystem/Tokens/solidColor.ts` | R5 | c=11 x=5 model |
| `DesignSystem/Materials/glass-controls.tsx` | `DesignSystem/Materials/GlassControls.tsx` | R7 | c=2 x=0 piece |
| `DesignSystem/Materials/glass-material.ts` | `DesignSystem/Materials/glassMaterial.ts` | R7 | c=3 x=0 model |
| `DesignSystem/Materials/glass-pane.tsx` | `DesignSystem/Materials/GlassPane.tsx` | R7 | c=3 x=0 piece |
| `DesignSystem/Materials/glass-segment.tsx` | `DesignSystem/Materials/GlassSegment.tsx` | R7 | c=1 x=0 piece |
| `DesignSystem/Materials/glass-surface.tsx` | `DesignSystem/Materials/GlassSurface.tsx` | R7 | c=2 x=0 piece |
| `DesignSystem/Materials/glass-window.tsx` | `DesignSystem/Materials/GlassWindow.tsx` | R7 | c=1 x=0 piece |

**→ `Components/`** — 3 files

| From | To | Rule | Why |
| --- | --- | --- | --- |
| `Detail/ViewSettingsScope.ts` | `Components/Detail/viewSettingsScope.ts` | R2 | c=2 x=2 model |
| `Settings/IconPicker.tsx` | `Components/IconPicker.tsx` | R2 | c=14 x=14 glue |
| `Settings/iconFavorites.ts` | `Components/iconFavorites.ts` | R2 | c=1 x=0 glue |

**→ `Settings/`** — 2 files

| From | To | Rule | Why |
| --- | --- | --- | --- |
| `DesignSystem/Detail/SidePane/SidePane.tsx` | `Settings/SidePane/SidePane.tsx` | R2 | c=2 x=1 piece |
| `DesignSystem/Detail/SidePane/sidePane.css` | `Settings/SidePane/sidePane.css` | R2 | c=1 x=0 style |

**→ `Interface/`** — 46 files

| From | To | Rule | Why |
| --- | --- | --- | --- |
| `Sidebar/AgendaMode.tsx` | `Interface/Sidebar/AgendaMode.tsx` | R3 | c=2 x=0 piece |
| `Sidebar/NexusPhoto.tsx` | `Interface/Sidebar/NexusPhoto.tsx` | R3 | c=1 x=0 surface |
| `Sidebar/Ribbon.tsx` | `Interface/Sidebar/Ribbon.tsx` | R3 | c=2 x=1 surface |
| `Sidebar/Sidebar.tsx` | `Interface/Sidebar/Sidebar.tsx` | R3 | c=1 x=1 surface |
| `Sidebar/disclosureState.ts` | `Interface/Sidebar/disclosureState.ts` | R3 | c=2 x=0 model |
| `Sidebar/nexusHeader.css.ts` | `Interface/Sidebar/nexusHeader.css.ts` | R3 | c=1 x=0 style |
| `Tabs/NavView.tsx` | `Interface/NavView.tsx` | R3 | c=1 x=1 surface |
| `Tabs/navView.css` | `Interface/navView.css` | R3 | c=1 x=0 style |
| `Toolbar/NavPane.tsx` | `Interface/Toolbar/NavPane.tsx` | R3 | c=1 x=0 piece |
| `Toolbar/OutlineDnd.tsx` | `Interface/Toolbar/OutlineDnd.tsx` | R3 | c=1 x=0 glue |
| `Toolbar/OutlineDropdown.tsx` | `Interface/Toolbar/OutlineDropdown.tsx` | R3 | c=1 x=0 surface |
| `Toolbar/SpaceDropdown.tsx` | `Interface/Toolbar/SpaceDropdown.tsx` | R3 | c=1 x=0 surface |
| `Toolbar/Toolbar.tsx` | `Interface/Toolbar/Toolbar.tsx` | R3 | c=1 x=1 surface |
| `Toolbar/ToolbarTrio.tsx` | `Interface/Toolbar/ToolbarTrio.tsx` | R3 | c=1 x=0 piece |
| `Toolbar/ViewDropdown.tsx` | `Interface/Toolbar/ViewDropdown.tsx` | R3 | c=1 x=0 surface |
| `Toolbar/ViewPane.tsx` | `Interface/Toolbar/ViewPane.tsx` | R3 | c=1 x=0 surface |
| `Toolbar/outlineDropdown.css.ts` | `Interface/Toolbar/outlineDropdown.css.ts` | R3 | c=1 x=0 style |
| `Toolbar/outlineTree.ts` | `Interface/Toolbar/outlineTree.ts` | R3 | c=2 x=0 model |
| `Toolbar/toolbar.css` | `Interface/Toolbar/toolbar.css` | R3 | c=1 x=0 style |
| `Toolbar/toolbarDropdown.css.ts` | `Interface/Toolbar/toolbarDropdown.css.ts` | R3 | c=5 x=0 style |
| `Detail/Banner/Banner.css` | `Interface/Banner/banner.css` | R7 | c=2 x=2 style |
| `Detail/Detail.css` | `Interface/interface.css` | R7 | c=1 x=1 style |
| `Detail/DetailTitleHeader.css` | `Interface/detailTitleHeader.css` | R7 | c=1 x=0 style |
| `Detail/InspectorPanel/InspectorPanel.tsx` | `Interface/InspectorPane/InspectorPane.tsx` | R7 | c=1 x=1 piece |
| `Detail/InspectorPanel/inspector-panel.css` | `Interface/InspectorPane/inspectorPane.css` | R7 | c=1 x=0 style |
| `Detail/Scope.ts` | `Interface/scope.ts` | R7 | c=15 x=6 model |
| `Sidebar/Sidebar.css` | `Interface/Sidebar/sidebar.css` | R7 | c=2 x=1 style |
| `Sidebar/sidebarDnd.tsx` | `Interface/Sidebar/SidebarDnd.tsx` | R7 | c=2 x=0 glue |
| `Detail/Banner/AddBannerButton.tsx` | `Interface/Banner/AddBannerButton.tsx` | RULED | c=3 x=2 piece |
| `Detail/Banner/Banner.tsx` | `Interface/Banner/Banner.tsx` | RULED | c=1 x=0 surface |
| `Detail/Banner/useBannerMenu.ts` | `Interface/Banner/useBannerMenu.ts` | RULED | c=6 x=3 glue |
| `Detail/ContainerView.tsx` | `Interface/ContainerView.tsx` | RULED | c=1 x=0 piece |
| `Detail/DetailPane.tsx` | `Interface/DetailPane.tsx` | RULED | c=2 x=2 surface |
| `Detail/DetailScaffold.tsx` | `Interface/DetailScaffold.tsx` | RULED | c=3 x=0 surface |
| `Detail/DetailTitleHeader.tsx` | `Interface/DetailTitleHeader.tsx` | RULED | c=2 x=1 piece |
| `Detail/HomepageView.tsx` | `Interface/HomepageView.tsx` | RULED | c=1 x=0 piece |
| `Detail/PageView.tsx` | `Interface/PageView.tsx` | RULED | c=1 x=0 surface |
| `Detail/SpaceView.tsx` | `Interface/SpaceView.tsx` | RULED | c=1 x=0 piece |
| `Detail/Subfield/CitationsToggle.tsx` | `Interface/Subfield/CitationsToggle.tsx` | RULED | c=3 x=1 surface |
| `Detail/Subfield/Subfield.tsx` | `Interface/Subfield/Subfield.tsx` | RULED | c=2 x=1 surface |
| `Detail/Subfield/crumbs.ts` | `Interface/Subfield/crumbs.ts` | RULED | c=2 x=1 glue |
| `Detail/Subfield/subfield.css` | `Interface/Subfield/subfield.css` | RULED | c=1 x=0 style |
| `Detail/Subfield/subfieldItems.tsx` | `Interface/Subfield/subfieldItems.tsx` | RULED | c=4 x=1 surface |
| `Detail/Subfield/subfieldStats.ts` | `Interface/Subfield/subfieldStats.ts` | RULED | c=4 x=1 model |
| `Detail/pageEditor.ts` | `Interface/pageEditor.ts` | RULED | c=3 x=2 model |
| `Detail/pageFlush.ts` | `Interface/pageFlush.ts` | RULED | c=3 x=2 glue |

**→ `Views/`** — 60 files

| From | To | Rule | Why |
| --- | --- | --- | --- |
| `Embeds/ViewEmbedScope.tsx` | `Views/ViewEmbedScope.tsx` | R2 | c=15 x=14 glue |
| `Detail/Views/PropertyEditing/DatetimeValuePicker.tsx` | `Views/Values/DatetimeValuePicker.tsx` | R4 | c=4 x=2 surface |
| `Detail/Views/PropertyEditing/OptionChip.tsx` | `Views/Values/OptionChip.tsx` | R4 | c=6 x=3 piece |
| `Detail/Views/PropertyEditing/PropertyEditor.tsx` | `Views/Values/PropertyEditor.tsx` | R4 | c=5 x=2 piece |
| `Detail/Views/PropertyEditing/PropertyPicker.tsx` | `Views/Values/PropertyPicker.tsx` | R4 | c=7 x=3 piece |
| `Detail/Views/PropertyEditing/filePick.ts` | `Views/Values/filePick.ts` | R4 | c=5 x=0 glue |
| `Detail/Views/PropertyEditing/formatValue.ts` | `Views/Values/formatValue.ts` | R4 | c=12 x=5 model |
| `Detail/Views/PropertyEditing/statusCycle.ts` | `Views/Values/statusCycle.ts` | R4 | c=2 x=0 model |
| `Detail/Views/PropertyEditing/usePropertyRows.ts` | `Views/Values/usePropertyRows.ts` | R4 | c=2 x=2 glue |
| `Detail/Views/PropertyEditing/valueClick.ts` | `Views/Values/valueClick.ts` | R4 | c=4 x=0 model |
| `Detail/Views/Table/Cell.tsx` | `Views/Values/Cell.tsx` | R4 | c=5 x=2 piece |
| `Detail/Views/Table/cellResolve.ts` | `Views/Values/cellResolve.ts` | R4 | c=5 x=0 model |
| `Detail/Views/Table/checkboxLook.tsx` | `Views/Values/checkboxLook.tsx` | R4 | c=4 x=1 piece |
| `Detail/Views/Table/columnLabel.ts` | `Views/Values/columnLabel.ts` | R4 | c=5 x=1 model |
| `Detail/Views/Table/columnStyles.ts` | `Views/Values/columnStyles.ts` | R4 | c=6 x=2 glue |
| `Detail/Views/Table/resolveContext.ts` | `Views/Values/resolveContext.ts` | R4 | c=15 x=0 model |
| `Detail/Views/Cards/CardsView.css` | `Views/Cards/cardsView.css` | R7 | c=1 x=0 style |
| `Detail/Views/GroupBand.css` | `Views/groupBand.css` | R7 | c=1 x=0 style |
| `Detail/Views/Table/Table.css` | `Views/Table/table.css` | R7 | c=2 x=2 style |
| `Detail/Views/Table/table-tokens.css` | `Views/Table/tableTokens.css` | R7 | c=2 x=2 style |
| `Detail/Views/pipeline/bandOrder.ts` | `Views/Pipeline/bandOrder.ts` | R7 | c=2 x=0 model |
| `Detail/Views/pipeline/columns.ts` | `Views/Pipeline/columns.ts` | R7 | c=4 x=1 model |
| `Detail/Views/pipeline/contextIdentity.ts` | `Views/Pipeline/contextIdentity.ts` | R7 | c=12 x=3 model |
| `Detail/Views/pipeline/contextOptions.ts` | `Views/Pipeline/contextOptions.ts` | R7 | c=7 x=3 model |
| `Detail/Views/pipeline/creationSeeds.ts` | `Views/Pipeline/creationSeeds.ts` | R7 | c=2 x=0 model |
| `Detail/Views/pipeline/filter.ts` | `Views/Pipeline/filter.ts` | R7 | c=4 x=1 model |
| `Detail/Views/pipeline/group.ts` | `Views/Pipeline/group.ts` | R7 | c=9 x=2 model |
| `Detail/Views/pipeline/pickView.ts` | `Views/Pipeline/pickView.ts` | R7 | c=5 x=1 model |
| `Detail/Views/pipeline/resolveView.ts` | `Views/Pipeline/resolveView.ts` | R7 | c=3 x=0 model |
| `Detail/Views/pipeline/sort.ts` | `Views/Pipeline/sort.ts` | R7 | c=5 x=0 model |
| `Detail/Views/pipeline/value.ts` | `Views/Pipeline/value.ts` | R7 | c=22 x=6 model |
| `Detail/Views/BandDnd.tsx` | `Views/BandDnd.tsx` | RULED | c=4 x=0 glue |
| `Detail/Views/Cards/CardAddPicker.tsx` | `Views/Cards/CardAddPicker.tsx` | RULED | c=1 x=0 piece |
| `Detail/Views/Cards/CardPickerHost.tsx` | `Views/Cards/CardPickerHost.tsx` | RULED | c=1 x=0 surface |
| `Detail/Views/Cards/CardValue.tsx` | `Views/Cards/CardValue.tsx` | RULED | c=1 x=0 surface |
| `Detail/Views/Cards/CardsView.tsx` | `Views/Cards/CardsView.tsx` | RULED | c=1 x=0 surface |
| `Detail/Views/Cards/cardAddPicker.css.ts` | `Views/Cards/cardAddPicker.css.ts` | RULED | c=1 x=0 style |
| `Detail/Views/Cards/cardValueInput.ts` | `Views/Cards/cardValueInput.ts` | RULED | c=7 x=2 model |
| `Detail/Views/Cards/cardsBand.ts` | `Views/Cards/cardsBand.ts` | RULED | c=2 x=0 model |
| `Detail/Views/Cards/cardsOrder.ts` | `Views/Cards/cardsOrder.ts` | RULED | c=2 x=0 model |
| `Detail/Views/GroupBand.tsx` | `Views/GroupBand.tsx` | RULED | c=4 x=0 piece |
| `Detail/Views/Table/LinkCell.tsx` | `Views/Table/LinkCell.tsx` | RULED | c=1 x=0 surface |
| `Detail/Views/Table/TableView.tsx` | `Views/Table/TableView.tsx` | RULED | c=3 x=0 surface |
| `Detail/Views/Table/columnAlign.ts` | `Views/Table/columnAlign.ts` | RULED | c=2 x=0 model |
| `Detail/Views/Table/columnReorder.ts` | `Views/Table/columnReorder.ts` | RULED | c=2 x=0 model |
| `Detail/Views/Table/columnWidths.ts` | `Views/Table/columnWidths.ts` | RULED | c=2 x=0 model |
| `Detail/Views/Table/reassign.ts` | `Views/Table/reassign.ts` | RULED | c=4 x=0 model |
| `Detail/Views/Table/viewMerge.ts` | `Views/Table/viewMerge.ts` | RULED | c=3 x=0 model |
| `Detail/Views/ViewGroupBand.tsx` | `Views/ViewGroupBand.tsx` | RULED | c=3 x=0 surface |
| `Detail/Views/ViewRenderer.tsx` | `Views/ViewRenderer.tsx` | RULED | c=2 x=1 surface |
| `Detail/Views/bandDndModel.ts` | `Views/bandDndModel.ts` | RULED | c=10 x=3 model |
| `Detail/Views/contextCellWrite.ts` | `Views/contextCellWrite.ts` | RULED | c=2 x=0 model |
| `Detail/Views/creationOrder.ts` | `Views/creationOrder.ts` | RULED | c=5 x=1 model |
| `Detail/Views/useActiveView.ts` | `Views/useActiveView.ts` | RULED | c=6 x=3 glue |
| `Detail/Views/useBandOrdering.ts` | `Views/useBandOrdering.ts` | RULED | c=3 x=0 glue |
| `Detail/Views/useGhostAnchor.ts` | `Views/useGhostAnchor.ts` | RULED | c=9 x=3 glue |
| `Detail/Views/useValuesEpoch.ts` | `Views/useValuesEpoch.ts` | RULED | c=2 x=0 glue |
| `Detail/Views/useViewCreation.ts` | `Views/useViewCreation.ts` | RULED | c=2 x=0 glue |
| `Detail/Views/useViewOrders.ts` | `Views/useViewOrders.ts` | RULED | c=2 x=0 glue |
| `Detail/Views/viewMint.ts` | `Views/viewMint.ts` | RULED | c=2 x=2 glue |

**→ `Navigation/`** — 4 files

| From | To | Rule | Why |
| --- | --- | --- | --- |
| `Tabs/TabBar.tsx` | `Navigation/TabBar.tsx` | R3 | c=1 x=1 surface |
| `Tabs/tabBar.css` | `Navigation/tabBar.css` | R3 | c=1 x=0 style |
| `Tabs/tabStrip.css` | `Navigation/tabStrip.css` | R3 | c=2 x=1 style |
| `Tabs/tabsModel.ts` | `Navigation/tabsModel.ts` | R3 | c=12 x=10 model |

**→ `Windows/`** — 14 files

| From | To | Rule | Why |
| --- | --- | --- | --- |
| `NavWindow/NavWindow.tsx` | `Windows/NavWindow/NavWindow.tsx` | R3 | c=1 x=1 surface |
| `NavWindow/navWindow.css` | `Windows/NavWindow/navWindow.css` | R3 | c=1 x=0 style |
| `PagePreview/BrowserWindow.tsx` | `Windows/BrowserWindow/BrowserWindow.tsx` | R3 | c=3 x=3 surface |
| `PagePreview/PreviewActions.tsx` | `Windows/PagePreview/PreviewActions.tsx` | R3 | c=2 x=1 piece |
| `PagePreview/PreviewInspector.tsx` | `Windows/PagePreview/PreviewInspector.tsx` | R3 | c=2 x=1 surface |
| `PagePreview/PreviewTabStrip.tsx` | `Windows/PagePreview/PreviewTabStrip.tsx` | R3 | c=2 x=1 surface |
| `PagePreview/PreviewWindow.tsx` | `Windows/PagePreview/PreviewWindow.tsx` | R3 | c=1 x=1 surface |
| `PagePreview/browserWindow.css` | `Windows/BrowserWindow/browserWindow.css` | R3 | c=1 x=0 style |
| `PagePreview/previewTabStrip.css` | `Windows/PagePreview/previewTabStrip.css` | R3 | c=1 x=0 style |
| `PagePreview/previewTabs.ts` | `Windows/PagePreview/previewTabs.ts` | R3 | c=3 x=2 model |
| `PagePreview/previewWarm.ts` | `Windows/previewWarm.ts` | R3 | c=3 x=1 model |
| `PagePreview/previewWindow.css` | `Windows/PagePreview/previewWindow.css` | R3 | c=1 x=0 style |
| `PagePreview/usePreviewWarm.ts` | `Windows/usePreviewWarm.ts` | R3 | c=2 x=1 glue |
| `PagePreview/WindowMorph.ts` | `Windows/windowMorph.ts` | R7 | c=2 x=2 model |

**→ `Surface/`** — 23 files

| From | To | Rule | Why |
| --- | --- | --- | --- |
| `Detail/ActionBand.css.ts` | `Surface/actionBand.css.ts` | R2 | c=2 x=2 style |
| `Blocks/BlockHandleMenu.tsx` | `Surface/Blocks/BlockHandleMenu.tsx` | R3 | c=1 x=0 piece |
| `Blocks/BlockSurface.tsx` | `Surface/Blocks/BlockSurface.tsx` | R3 | c=2 x=2 surface |
| `Blocks/MarkdownBlock.tsx` | `Surface/Blocks/MarkdownBlock.tsx` | R3 | c=1 x=0 surface |
| `Blocks/PageEmbedBlock.tsx` | `Surface/Blocks/PageEmbedBlock.tsx` | R3 | c=1 x=0 piece |
| `Blocks/ViewEmbedBlock.tsx` | `Surface/Blocks/ViewEmbedBlock.tsx` | R3 | c=1 x=0 surface |
| `Blocks/blockZoom.ts` | `Surface/Blocks/blockZoom.ts` | R3 | c=5 x=2 model |
| `Blocks/blocks.css` | `Surface/Blocks/blocks.css` | R3 | c=1 x=0 style |
| `Blocks/handleMenu.css.ts` | `Surface/Blocks/handleMenu.css.ts` | R3 | c=1 x=0 style |
| `Blocks/useBlockDoc.ts` | `Surface/Blocks/useBlockDoc.ts` | R3 | c=1 x=0 glue |
| `Blocks/viewEmbed.css.ts` | `Surface/Blocks/viewEmbed.css.ts` | R3 | c=1 x=0 style |
| `SurfacePM/SurfaceLab.tsx` | `Surface/SurfaceLab.tsx` | R3 | c=1 x=1 piece |
| `SurfacePM/SurfaceView.tsx` | `Surface/SurfaceView.tsx` | R3 | c=2 x=1 piece |
| `DesignSystem/Detail/tile-chassis.css` | `Surface/tileChassis.css` | R6 | c=2 x=2 style |
| `SurfacePM/core/codec.ts` | `Surface/Core/codec.ts` | R7 | c=2 x=1 model |
| `SurfacePM/core/edges.ts` | `Surface/Core/edges.ts` | R7 | c=2 x=0 model |
| `SurfacePM/core/hitTest.ts` | `Surface/Core/hitTest.ts` | R7 | c=2 x=0 model |
| `SurfacePM/core/model.ts` | `Surface/Core/model.ts` | R7 | c=11 x=2 model |
| `SurfacePM/core/ops.ts` | `Surface/Core/ops.ts` | R7 | c=8 x=1 model |
| `SurfacePM/core/rects.ts` | `Surface/Core/rects.ts` | R7 | c=7 x=0 model |
| `SurfacePM/core/snap.ts` | `Surface/Core/snap.ts` | R7 | c=2 x=0 model |
| `SurfacePM/sensors/pointerDrag.ts` | `Surface/Sensors/pointerDrag.ts` | R7 | c=2 x=0 model |
| `SurfacePM/surfacepm.css` | `Surface/surfaceView.css` | R7 | c=1 x=0 style |

**→ `MarkdownPM/`** — 48 files

| From | To | Rule | Why |
| --- | --- | --- | --- |
| `MarkdownPM/Styles.css` | `MarkdownPM/markdown.css` | R7 | c=1 x=0 style |
| `MarkdownPM/connections/index.ts` | `MarkdownPM/Connections/index.ts` | R7 | c=41 x=10 model |
| `MarkdownPM/decorations/intent.ts` | `MarkdownPM/Decorations/intent.ts` | R7 | c=23 x=1 model |
| `MarkdownPM/detect/codeLangs.ts` | `MarkdownPM/Detect/codeLangs.ts` | R7 | c=3 x=0 model |
| `MarkdownPM/detect/index.ts` | `MarkdownPM/Detect/index.ts` | R7 | c=32 x=2 model |
| `MarkdownPM/editor/EditorGesture.ts` | `MarkdownPM/Editor/EditorGesture.ts` | R7 | c=2 x=0 model |
| `MarkdownPM/editor/PasteLink.ts` | `MarkdownPM/Editor/PasteLink.ts` | R7 | c=5 x=0 glue |
| `MarkdownPM/editor/PendingTitle.ts` | `MarkdownPM/Editor/PendingTitle.ts` | R7 | c=6 x=0 glue |
| `MarkdownPM/editor/blockDrag.ts` | `MarkdownPM/Editor/blockDrag.ts` | R7 | c=3 x=0 model |
| `MarkdownPM/editor/blockHandles.ts` | `MarkdownPM/Editor/blockHandles.ts` | R7 | c=1 x=0 model |
| `MarkdownPM/editor/blockModel.ts` | `MarkdownPM/Editor/blockModel.ts` | R7 | c=6 x=0 model |
| `MarkdownPM/editor/calloutAtomic.ts` | `MarkdownPM/Editor/calloutAtomic.ts` | R7 | c=1 x=0 model |
| `MarkdownPM/editor/calloutGuard.ts` | `MarkdownPM/Editor/calloutGuard.ts` | R7 | c=4 x=0 model |
| `MarkdownPM/editor/caret.ts` | `MarkdownPM/Editor/caret.ts` | R7 | c=2 x=0 model |
| `MarkdownPM/editor/caretSeat.ts` | `MarkdownPM/Editor/caretSeat.ts` | R7 | c=7 x=0 model |
| `MarkdownPM/editor/citationActions.ts` | `MarkdownPM/Editor/citationActions.ts` | R7 | c=9 x=0 glue |
| `MarkdownPM/editor/citationEdits.ts` | `MarkdownPM/Editor/citationEdits.ts` | R7 | c=8 x=0 model |
| `MarkdownPM/editor/citationGuard.ts` | `MarkdownPM/Editor/citationGuard.ts` | R7 | c=2 x=0 model |
| `MarkdownPM/editor/citationPointer.ts` | `MarkdownPM/Editor/citationPointer.ts` | R7 | c=3 x=0 glue |
| `MarkdownPM/editor/codeGlyphs.ts` | `MarkdownPM/Editor/codeGlyphs.ts` | R7 | c=2 x=0 model |
| `MarkdownPM/editor/codeHighlight.ts` | `MarkdownPM/Editor/codeHighlight.ts` | R7 | c=2 x=0 model |
| `MarkdownPM/editor/connections.ts` | `MarkdownPM/Editor/connections.ts` | R7 | c=2 x=0 model |
| `MarkdownPM/editor/decorations.ts` | `MarkdownPM/Editor/decorations.ts` | R7 | c=7 x=0 glue |
| `MarkdownPM/editor/docCache.ts` | `MarkdownPM/Editor/docCache.ts` | R7 | c=24 x=1 model |
| `MarkdownPM/editor/dragChrome.ts` | `MarkdownPM/Editor/dragChrome.ts` | R7 | c=3 x=0 model |
| `MarkdownPM/editor/embedInsert.ts` | `MarkdownPM/Editor/embedInsert.ts` | R7 | c=4 x=0 model |
| `MarkdownPM/editor/embedRanges.ts` | `MarkdownPM/Editor/embedRanges.ts` | R7 | c=6 x=0 model |
| `MarkdownPM/editor/embedWidget.tsx` | `MarkdownPM/Editor/embedWidget.tsx` | R7 | c=8 x=0 piece |
| `MarkdownPM/editor/folding.ts` | `MarkdownPM/Editor/folding.ts` | R7 | c=15 x=6 model |
| `MarkdownPM/editor/formatKeymap.ts` | `MarkdownPM/Editor/formatKeymap.ts` | R7 | c=2 x=0 model |
| `MarkdownPM/editor/formatState.ts` | `MarkdownPM/Editor/formatState.ts` | R7 | c=2 x=0 model |
| `MarkdownPM/editor/gripMenu.ts` | `MarkdownPM/Editor/gripMenu.ts` | R7 | c=3 x=0 glue |
| `MarkdownPM/editor/headingScan.ts` | `MarkdownPM/Editor/headingScan.ts` | R7 | c=5 x=0 model |
| `MarkdownPM/editor/input.ts` | `MarkdownPM/Editor/input.ts` | R7 | c=2 x=0 model |
| `MarkdownPM/editor/lineDom.ts` | `MarkdownPM/Editor/lineDom.ts` | R7 | c=4 x=0 model |
| `MarkdownPM/editor/linkEdit.ts` | `MarkdownPM/Editor/linkEdit.ts` | R7 | c=6 x=0 glue |
| `MarkdownPM/editor/linkFormat.ts` | `MarkdownPM/Editor/linkFormat.ts` | R7 | c=2 x=0 glue |
| `MarkdownPM/editor/linkGestures.ts` | `MarkdownPM/Editor/linkGestures.ts` | R7 | c=6 x=0 model |
| `MarkdownPM/editor/links.ts` | `MarkdownPM/Editor/links.ts` | R7 | c=4 x=0 model |
| `MarkdownPM/editor/listDrag.ts` | `MarkdownPM/Editor/listDrag.ts` | R7 | c=1 x=0 model |
| `MarkdownPM/editor/listDragModel.ts` | `MarkdownPM/Editor/listDragModel.ts` | R7 | c=6 x=1 model |
| `MarkdownPM/editor/menu.ts` | `MarkdownPM/Editor/menu.ts` | R7 | c=7 x=3 glue |
| `MarkdownPM/editor/pointerPath.ts` | `MarkdownPM/Editor/pointerPath.ts` | R7 | c=6 x=0 model |
| `MarkdownPM/editor/travel.ts` | `MarkdownPM/Editor/travel.ts` | R7 | c=4 x=1 model |
| `MarkdownPM/input/format.ts` | `MarkdownPM/Input/format.ts` | R7 | c=5 x=0 model |
| `MarkdownPM/input/index.ts` | `MarkdownPM/Input/index.ts` | R7 | c=9 x=0 model |
| `MarkdownPM/parser/index.ts` | `MarkdownPM/Parser/index.ts` | R7 | c=7 x=0 model |
| `MarkdownPM/tokens/index.ts` | `MarkdownPM/Tokens/index.ts` | R7 | c=20 x=0 model |

**→ `testing/`** — 1 files

| From | To | Rule | Why |
| --- | --- | --- | --- |
| `Navigation/testTree.ts` | `testing/navTree.ts` | R3 | c=3 x=1 model |

### IV. The Token Verdicts

The consumer side (IV.1–IV.3) is fact: every row was opened at its line. The recipe side (IV.4) is the one table in this document whose rows are recommendations — each token's verdict from its readers' evidence, with a column saying whether the verdict follows from counts alone or involves a design call. Nathan rules; the table is written so that ruling is a checkbox, not a re-derivation.

#### IV.1 The Consumer Side

**1,071 token reads, 45 findings, one shape.** The sweeps that came back empty are worth naming so nobody re-runs them: zero `fill.*`/`surface.*`/`separator.*` reads used as text color; zero `state.*` reads used as a border or text; zero hand-rolled `rgba()`; zero hand-rolled `999px` beside `--radius-full`; one literal `font-weight` (in a lab file); one literal `font-size` (`Tabs/navView.css:28`); zero motion values off the four-rung ladder across 165 duration and easing reads; zero hand-rolled `z-index` against `stack.top` — all twelve bridged `--z-*` steps are read by name, and the 38 bare `z-index: 0..4` literals are exactly the in-context sibling ordering `stack.ts`'s header licenses.

**`label.*` paints edges at twelve sites.** The ink family — `system-white` at five opacities, roughly 226 reads — paints something that is not ink at: `Detail/Views/Table/table-tokens.css:43` (a 1.5px column divider), `MarkdownPM/Styles.css:883` (a callout's box seam), `:964` and `:831` (quote bars), `DesignSystem/Components/Controls/checkbox.css:13` (the unchecked border), `DesignSystem/Labels/labels.css.ts:144` (chip outline), `DesignSystem/Components/Controls/Button/button.css.ts:57` and `:79` (`--button-outline`), `Switches/dualSwitch.css.ts:31` (track border), `Slider/slider.css.ts:31` (the knob's box fill), `Pickers/ImagePicker/imagePicker.css.ts:56` (the crop ring), `Pickers/CalendarPicker/calendarPicker.css.ts:140` (today's ring). The carve-out a lint rule must state: `background-color: var(--label-*)` is correct under a `-webkit-mask` — `MarkdownPM/Styles.css:239, :270, :442` and `SurfacePM/surfacepm.css:125` paint glyphs through a mask channel, and a naive rule flags all four.

**`separator.*` is starved on its own job.** The family that should own those twelve edges has three consumer reads for `separator.segment` and nine for `separator.border`; `segment` is tied 3–3 with `label.tertiary` on the one job it is named for. The three composed seams — `--border-heading` 1.75px, `--border-cell` 1.5px, `--border-segment` 1px — are correct and restated by hand five times (`MarkdownPM/Styles.css:788`, `:884`, `labels.css.ts:24`, `imagePicker.css.ts:56`, `nexusSettings.css:71`) for a structural reason: the bridge publishes each seam as a whole shorthand and never its width, so a rule that needs a radius cap cannot use `border` and must restate `1.5px`. **A sixth seam weight exists that the ledger has never heard of:** `1.25px`, with five independent declarers and no owner — `button.css.ts:7` (`OUTLINE_W`), `checkbox.css:39`, `tile-chassis.css:6` (`--tile-border`, whose comment claims "one source"), `ActionBand.css.ts:48`, `table-tokens.css:31`. It is the control seam — the weight a button ring, a checkbox, a tile edge, and a chip all converged on — and the checkbox declares itself `1.25px` in `checkbox.css:39` and `1.5px` in `labels.css.ts:24`: one control, two widths, two files.

**The type ramp's top is dead and the app draws its titles off-ramp.** Reads per step: `body` 28, `caption` 17, `footnote` 14, `control` 11, `title3` 2, `subline` 2, `headline` 2, `callout` 1, `title2` 0, `title1` 0, `largeTitle` 0. The icon ladder named for the same rungs uses `title1` ×5, `title2` ×3, `largeTitle` ×1 — the glyph ladder consumes rungs the type ladder cannot give away. Where the display type went is `--detail-title-size` at 20, 24, and 28px, plus `navView.css:28`'s 16px, which overrides a `text.body.standard` class `NavView.tsx:48` put on the same element so that token read paints nothing. `text.callout.emphasized`, the ledger's rung for pane headers, has zero reads against three sibling panes at three different weights (`menu.css.ts:160` caption.emphasized, `settingsPane.css.ts:262` footnote.semibold, `groupingPane.css.ts:54` footnote.emphasized).

**Two accent ladders wear one name.** `--accent-stroke` (secondary, 40%) and `--accent-stroke-hot` (primary, 60%) are correct and consistent for tile chrome: selected rings at stroke, being-resized at hot (`surfacepm.css:206`/`:77`, `Styles.css:484`/`:492`, `embeds.css:87`). A second, unledgered ladder runs in `Components/`: focus = secondary (`fieldRing.ts:35`, `menu.css.ts:33`), selection = primary (`pickerMenu.css.ts:34`, `viewSettings.css.ts:42`). In SurfacePM `primary` means *being manipulated*; in PickerMenu it means *selected at rest*; `pickerMenu.css.ts:34`'s comment calls its tone "the tile-selection tone," which it is not. `viewSettings.css.ts:42` is where it shows: a selected tile in ViewSettings rings a step brighter than a selected tile in SurfacePM.

**Sibling drift.** Three of the highest-confidence wrong-step findings are a file diverging from one it explicitly shares a chassis with: `Navigation/NavGallery.tsx:140` (footnote.emphasized) against `Cards/CardsView.tsx:101` (body.semibold) while `card-tokens.css:74` says the two families share one title tone; `Settings/TrashLeaf.tsx:264` (caption.semibold) against `Table/TableView.tsx:1699` (callout.semibold) while TrashLeaf's element wears the class `table-head`; `groupingPane.css.ts:16`'s `subLabel` (body.emphasized) against `menu.css.ts:131`'s `subLabel` (caption.standard) — same export name, same color, 13px against 11px. A shared class name is not a shared type decision, and nothing in the build catches that.

**One wrong rung out of thirty-four.** `Toolbar/outlineDropdown.css.ts:12` dims a dragging row with `--state-inactive` where the identically-named export at `settingsPane.css.ts:183`, `GroupBand.css:62`, and `Table.css:150` all use `--state-ghost`.

**The one live bug.** `Blocks/ViewEmbedBlock.tsx:88` hand-rolls `tintAt(cellColor(key), 'primary')` where `cellRing(key)` exists at `ramp.ts:143` as `cellPaint(key).outline ?? tintAt(cellColor(key), 'primary')`. The hand-roll reproduces the fallback and drops the first branch, so a view assigned a **grey** cell gets a chroma-less tint of a grey instead of its `GREY_OUTLINES` step — the grey row has no chroma to draw an outline from, which is the entire reason `cellPaint` returns one. Behavioral, not stylistic; the fix is one identifier.

#### IV.2 The Hand-Rolled Sets

Literals whose value *is* a token, and values built from ingredients where a recipe exists. Each is a one-line fix; together they are the cheapest wins in the document.

| Site | Hand-roll | The token or recipe |
| --- | --- | --- |
| `styles.css:31` | `13px / 1.4` and a hand-written Inter stack | `text.body`'s size and `font.family` — a line-height the bridge does not yet publish |
| `MarkdownPM/Styles.css:788`, `:884` · `labels.css.ts:24` · `imagePicker.css.ts:56` | `1.5px` | `--border-cell`'s width, once the bridge publishes it |
| `button.css.ts:7` · `checkbox.css:39` · `tile-chassis.css:6` · `ActionBand.css.ts:48` · `table-tokens.css:31` | `1.25px` | nothing yet — the control seam, D-Z |
| `NotchedPane.tsx:112` | `stroke="#FFFFFF"` | nothing — brighter than `system.white`'s `#E8E8E8`; `currentColor` |
| `Blocks/ViewEmbedBlock.tsx:88` | `tintAt(cellColor(key), 'primary')` | `cellRing(key)` — the live bug |
| `surfacepm.css:90` · `group.tsx:723` | the `--accent-stroke` mix, as a background | `--accent-fill` |
| `iconPicker.css.ts:91` | `tintAt('var(--accent)', 'quaternary')` — accent at 15% | `--accent-fill`, exactly |
| `pickerMenu.css.ts:34` | `tintAt('var(--accent)', 'primary')` | `--accent-stroke-hot`, or `--accent-stroke` once the ladder is ruled |
| `viewSettings.css.ts:42` | `tintAt('var(--accent)', 'primary')` | `--accent-stroke` |
| `nexusSettings.css:71` | `1px solid var(--separator-border)` | `--border-segment` |
| `ColorSwatch.tsx:48` | half of `cellPaint` inline | `cellPaint(key)` |

#### IV.3 One Rule Per Family

Each is written to be lintable, with its carve-out stated.

1. **`label.*` paints ink — text and glyphs.** Never a border, rule, bar, or box fill. *Carve-out:* `background-color: var(--label-*)` is legal iff the same rule sets `mask` or `-webkit-mask`. Twelve violations today; four correct sites a naive rule would flag.
2. **`separator.*` paints every hairline, seam, divider, and rail.** A rule drawn as a filled box (for a radius or a partial length) still reads `separator.*` for color and a bridged `--border-*-width` for thickness. The ladder gains its sixth rung, `--border-control` at 1.25px, before this is enforceable.
3. **`fill.*` paints an area over a surface; `state.*` paints an area behind content.** Neither paints an edge or ink. *Carve-out:* `outline: Npx solid var(--state-selected)` beside `background: var(--state-selected)` is a fill bleeding past its box (`GroupBand.css:65-67`). One violation (`Sidebar.css:73`).
4. **An accent tone is read by name, never mixed.** Wash → `--accent-fill`; live outline → `--accent-stroke`; being driven → `--accent-stroke-hot`; focus → `fieldRing()`. Six violations, and one ruling first: `--accent-stroke-hot` means *being driven right now*, a selected-at-rest ring is `--accent-stroke`, and PickerMenu and ViewSettings both step down.
5. **A ramp cell's paint comes from `cellPaint` / `cellRing` / `cellColor`, never from `tintAt(cellColor(…))`.** The grey row's outline branch exists because the naive composition is wrong there. Two violations, one a live bug.
6. **A type decision is a `text.<style>.<variant>` class and nothing else.** No px `font-size`, no `font:` shorthand, no `--*-title-size` var holding a literal; a surface that scales reads `calc(var(--text-*-size) * var(--scale))`. *Corollary:* a file that shares a chassis with another shares its type step — NavGallery takes CardsView's, TrashLeaf takes TableView's, groupingPane takes menu's.
7. **The eleven type steps and the eleven icon steps are one ladder with two units.** A size not on it is a defect in the ladder, not a licence. The app wants a step at 20px; the ramp should grow `containerTitle` and `--container-title-size` becomes its bridge rather than the app restyling every container header to 17 or 22.
8. **`--state-drag` / `--state-ghost` / `--state-inactive` are worn as `opacity` by the element.** Ghost is *being carried*; inactive is *here but not live*. One violation, a copy of a correct file with one token swapped.

#### IV.4 The Verdicts

219 tokens judged — the 137 custom properties the bridge emits (132 declared plus the five `--tint-*` it generates from `Object.entries`), every TS token export, and the 50 app-declared vars that behave like tokens. **169 keep · 17 repoint · 16 mint · 9 redefine · 6 merge · 1 rename · 1 retire.** 178 verdicts follow from counts alone; 41 involve a design call, and each says so.

**The headline is that the system is under-declared, not broken.** Seventy-seven percent of rows are `keep`, and the three sweeps that would have found rot — hand-rolled `rgba()`, off-ladder motion, literal `z-index` against `stack.top` — come back at zero. The failures cluster at the exact points where the design system publishes a composed value and withholds its ingredients: it ships `--border-cell` and not its width, so four files restate `1.5px`; it ships eleven type sizes and zero line heights, so `styles.css:31` invents `1.4`; it ships `--accent-fill` as a raw `15%` with no way to say "accent at a step," so three files spell out the `color-mix`. Nine of the sixteen mints are an ingredient that already exists and is not published.

**Redefine — the readers outvoted the definition (9).**

| Token | Reads | New definition | Taste |
| --- | --- | --- | --- |
| `label.quaternary` | 4, all edges, 0 ink | `separator.control` · `--separator-control` = system-white @ 20%, filed under Separators. Value unchanged; four sites become correct; the label-as-edge count drops 12 → 8. `labels.css.ts:144` already exports it as `outline.tertiary`. `checkbox.css:13` repoints to `--checkbox-border`, which its bundle already owns. | evidence |
| `--accent-fill` | 0, 3 hand-rolled | `tintAt(var(--accent), 'quaternary')` — the same 15%, named through the ladder so the bridge stops holding its only raw percentage. Only `iconPicker.css.ts:91` is value-identical; `surfacepm.css:90` and `group.tsx:723` are 40% washes and go to `--accent-stroke`, a zero-pixel edit. | call |
| `CONTAINER_TITLE_SIZE` | 4, all Banner | Promoted to `text.containerTitle` at 20/24; `--container-title-size` stays as its bridged size so no consumer changes spelling. A geometry constant that sets a `font-size` is a type step in the wrong drawer. | call |
| `text.callout` | 1 | The table and column-header step (Semibold). The ledger's second assignment — "pane header → Callout / Emphasized" — has no referent in the product and is struck. | call |
| `text.footnote` | 12 | Small detail *and* the in-pane section heading (Emphasized) — what the panes already do. `settingsPane.css.ts:262` repoints from semibold to emphasized so the siblings match. | call |
| `surface.primary` · `secondary` · `tertiary` | 2 · 1 · 1 | The opaque grey ladder the ramp's grey row is seated on, moved to sit beside Ramp in the ledger. Pommora layers with frost over `--bg-window`, not with flat fills; the trio stops looking abandoned and starts looking load-bearing. | call |
| `--over-scroll-fade` | 2 by name, 14 overrides | Not a card token: the app-wide OverScroll channel. Base moves to the bridge; its four steps get names (`--fade-sm` 12 · `-md` 16 · `-lg` 20 · `-xl` 24) so a surface picks one. | call |

**Mint — a value the code agreed on with no token (16).**

| Mint | Value | What it absorbs | Taste |
| --- | --- | --- | --- |
| `--border-heading-width` · `--border-cell-width` · `--border-segment-width` | 1.75 · 1.5 · 1px | Six hand-rolled widths; the precondition for the separator rule being enforceable. The best ratio in the atlas: three lines, six sites. | evidence |
| `--border-control` | 1.25px | Five independent declarers; settles the checkbox's 1.25-vs-1.5 contradiction (1.25 wins — it is a control). | call |
| `text.containerTitle` | 20px / 24px | Four surfaces at 20/24/28/28; closes the container-title question. `navView.css:28`'s 16px is a separate case and goes to `title3`. | call |
| `--text-*-line` | eleven values | The line heights the bridge never published; why `styles.css:31` had to invent one. | evidence |
| `size.space.*` · `--space-*` | 2·4·6·8·10·12·14·16·20·24·28 | Roughly 480 of the 681 literals; the residue (3, 5, 9, 18, 22) becomes a visible list of ~60. Departs knowingly from the ledger's "ad-hoc until lifted from Figma" — the code has already done the lifting; Figma is a reconciliation, not a derivation. `18px` (13 sites) is left off deliberately. | call |
| `--glass-inset` · `--glass-radius` | 5px · 12px | 37 reads, two of them inside the design system with no fallback — the one real violation of the layering law. | evidence |
| `--subline-h` · `--toolbar-h` | 24px · 38px | The shell's bands, beside the `--button-*-height` trio the bridge already publishes. | call |
| `--sidebar-width` · `--inspector-width` | seeded defaults | Read by `styles.css:108` and `:124` in a `calc` with no declared default; `App.tsx` overrides per session. | call |
| `--content-gutter` | 24px (`--space-24` once minted) | The addend that keeps left and right insets equal — a layout constant with a stated invariant. | call |
| `Tokens/scale.ts` | a rule, not a var | The zoom/scale family's composition — which axes multiply, which are terminal. The nine vars stay where they are. | call |

**Merge (6):** `--accent-text` → `--accent` (a verbatim alias, zero readers, not a ramp member); `--main-bg` → `--bg-window` (a pure alias, all reads in `styles.css`); `--table-border-width` and `--tile-border` → `--border-control`; `--heading-segment-width` → `--border-cell-width`; `--detail-title-size` → `--container-title-size`.

**Rename (1):** `--gutter` → `--content-gutter` on `.shell` and `--table-gutter` inside tables; the four-letter alias goes.

**Retire (1):** `--code-chevron-mask` — zero reads, verified three times, a full inline SVG payload rather than a ramp member, so bridge completeness does not shield it. The only outright deletion in 219 rows.

**Repoint — right token, wrong consumers (17).** The eight label-as-edge sites that remain after the redefinition (`Controls/` first — it is what teaches the next control's author); `Sidebar.css:73`'s ribbon divider from `fill.secondary` to `separator.border` at the heading width; `table-tokens.css:41`'s `--heading-segment` to `separator.segment`; `outlineDropdown.css.ts:12` from inactive to ghost; `Properties/PropertiesPane.tsx:143`'s `<Reveal>` override back to `fast`; `nexusSettings.css:71` to `--border-segment`; the sibling-drift trio (`NavGallery.tsx:140` → body.semibold, `TrashLeaf.tsx:264` → callout.semibold, `groupingPane.css.ts:16` → caption); `subfield.css:43-44` off control-size and bold; `styles.css:31-38` onto the font, size, and line tokens; and `Blocks/ViewEmbedBlock.tsx:88` → `cellRing(key)`, the live bug.

**Where Recipe overrules an earlier lens, with the reason.** The pane-header finding: `menu.css.ts:160`'s own comment says it is a nav row, not a header, so the vote on in-pane section headings is 3–0 *for* footnote, not 3–0 against callout — the ledger absorbs what its readers do. Two of the three `--accent-fill` repoints: sending 40% washes to a 15% token would visibly dim two surfaces. The radius scale: the Stylist's mint is refused — every radius literal already matches `size.control['button-*'].radius`, so the literals are owned but not centralized, which is not the condition you mint for; the one reportable stray is `Slider.tsx:106`'s `borderRadius: 9`, and the four writers of `12px` are a `--glass-radius` mint, not a scale. The glyph ladder's doubled names: kept, because the icon ladder is named for the type ramp so a glyph and a type step can be spelled identically — collapse one side and the ladders stop rhyming. A third `stack.local` rung: declined; a private ladder inside one component is the rule working, and naming it would invite the cross-surface comparison `stack.ts:19-20` forbids.

**The ten to take first, by consumers fixed per edit.**

| # | Edit | Lines | Fixes |
| --- | --- | --- | --- |
| 1 | Mint the three seam widths | 3 | 6 sites, and the separator rule becomes lintable |
| 2 | `label.quaternary` → `separator.control` | 1 token moved | 4 sites; 12 violations become 8 |
| 3 | Mint `--border-control` | 1 + 5 repoints | 5 declarers; the checkbox contradiction |
| 4 | `ViewEmbedBlock.tsx:88` → `cellRing(key)` | 1 | The only behavioral defect |
| 5 | Mint `text.containerTitle`; merge `--detail-title-size` | 1 step + 3 | 4 surfaces; an 8px disagreement ends |
| 6 | The eight remaining label-as-edge repoints | 8 | 8 sites, unambiguous after 1 and 2 |
| 7 | Mint `--text-*-line`; repoint `styles.css:31-38` | 12 | The root of the cascade — every unstyled element |
| 8 | Redefine `--accent-fill`; settle the accent ladder | 6 | 6 sites and one visible inconsistency |
| 9 | Mint the spacing scale | ~11 | ~480 literals; needs the sign-off in D-J |
| 10 | Mint `--glass-inset` / `--glass-radius` | 2 | 37 reads; closes the layering violation |

Deliberately below the line: the radius scale, a third `stack.local` rung, the icon ladder's doubled names, `--tint-solid`, and the `--safe-*` vars — where two lenses say keep and one ruling says delete, and the atlas rules keep (VI.1, #29) because `styles.css:12`'s comment is exactly the disclosure that makes a forward declaration legitimate.

### V. Decisions The Tree Cannot Make

Each is a genuine fork the rules do not resolve, with the evidence and a recommendation. A recommendation is a design call, made plainly; the ruling is Nathan's. Where a decision was carried from the Design Coherence Report it keeps that report's number in parentheses so the retired document can be traced.

#### V.1 Structure

**D-A · The design system's three upward reaches.** `AssetImage` and `ImagePicker` read the store to draw data they are given no other way; `PickerControl` reaches for a menu, which is chrome the app can hand it. *Recommendation:* invert all three through the wrapper pattern `Settings/IconPicker` already uses — the design-system piece takes `src`/`crop` (or one `resolveAsset` function), `onPasteImage`/`onPickFile`, and `onRowMenu` as props; three thin wrappers in `Components/` bind them once so call sites do not each wire it. Then the roster of sanctioned reaches is exactly one, `Symbols/` reading a type, and it is written into DesignSystemPM §Tooling in the same edit. (Design Report §III; Archivist D007, D024)

**D-B · Make the boundary a lint rule.** *Recommendation:* now, with an allowlist of the three files until D-A lands. Biome's `noRestrictedImports` forbidding `@renderer/store`, `@renderer/nativeMenus`, `@renderer/assetUrl`, and `@renderer/<Feature>/**` from `DesignSystem/**`. The rule's value is refusing the *next* inversion; three named exceptions are an honest way to state three named exceptions. It cannot enforce the `Symbols/` reach — that one is `@shared`, not `@renderer` — which is the strongest reason to write that exception down. (Archivist D014)

**D-C · Where value rendering lives.** The open question asked whether `PropertyEditing/` folds into `Properties/`; the evidence contradicts the premise — eleven of its fourteen consumers are view surfaces, only three are under `Properties/`, and folding it would move it away from its majority and mint eleven new cross-folder imports. The same evidence answers where `checkboxLook`, `Cell`, `columnStyles`, and `columnLabel` go: they render what a property *holds*, and their consumers sit on both sides of `Table/`. *Recommendation:* one folder, `Views/Values/`, holding both sets; `Properties/` takes a stated scope — schema and options, never value rendering. `usePropertyRows` goes with it, because the twin extraction below belongs beside the hook that already knows both callers. (Design Report §VIII; Archivist D001, D008, D022)

**D-D · The floating family's name.** The grouping is right — `NavWindow`, `PagePreview`, and the browser window share the chassis and the morph — and the browser split belongs in the same pass, since `BrowserWindow.tsx` is already its own file. *Recommendation:* `Windows/`, not `PreviewPanes/`. These are Windows by the design system's own vocabulary; `PreviewPane` is the chassis they mount, so a folder by that name would read as its home; and `NavWindow` previews nothing. The two rules ContextPM records for any future in-app window get a home at `Windows/` in the same move. (Archivist D013)

**D-E · The chassis's name.** `PreviewPane` is mounted by four windows and the Settings window and previews nothing. *Recommendation:* `DesignSystem/Components/WindowChassis/`. It will feel wrong for a week; the week after, `previewPane.css` holding the Settings window's dimensions will stop looking like an accident. (Lexicographer)

**D-F · `Components/`'s remaining strays and the `IconPicker` wrapper.** The 08-25 ruling keeps `Components/` for the genuinely shared strays; Bundle 6a's "Components/ is deleted" contradicts it and retires here. *Recommendation:* `Settings/IconPicker.tsx` and `iconFavorites.ts` join them — fourteen importers across eight folders with no plurality is the definition of the folder — and the file is renamed `NexusIconPicker.tsx` so it stops shadowing the design-system export it wraps. (Archivist D009, D023)

**D-G · `Detail` → `Interface`'s scope.** Ruled for `Detail/`; the atlas extends it to `Toolbar/` and `Sidebar/`, which are the same window's chrome and are read by the same InterfacePM. *Recommendation:* take the extension. Two more top-level folders disappear and `Interface/` becomes the one place the main window's shape is decided. If the extension is refused, `Toolbar/` and `Sidebar/` stay at the root under R3 and the tree loses nothing else.

**D-H · `SurfacePM` → `Surface`, and `block` → `tile`.** `MarkdownPM` keeps its suffix because it is a product name; `SurfacePM` is a leftover that has already lost its abbreviation in `surfacepm.css`. *Recommendation:* rename the folder, absorb `Blocks/` as `Surface/Blocks/`, and rename `block` to `tile` in identifiers throughout — the engine's own model file already says tile, and it frees `block` for MarkdownPM, where it is correct. The doc stays `SurfacePM.md`, exactly as `InterfacePM.md` documents folders that carry no suffix. (Lexicographer)

**D-I · `Connections/`.** The hover card, its presenter and sizing, and the link menu are the ConnectionsPM domain with no renderer folder; today they sit in `Embeds/` with every consumer elsewhere. *Recommendation:* mint it, and move `linkResolve.ts` and `openWebLink.ts` in from the root. This is the one new feature folder the atlas creates on the three-surfaces test; refusing it leaves those six files in `Embeds/` under R3 with a note.

#### V.2 Geometry And Tokens

**D-J · The spacing scale.** 681 literals on a grid the code already agreed on. *Recommendation:* mint `size.space` and `--space-*` from the code — `2·4·6·8·10·12·14·16·20·24·28` — and reconcile with Figma after, not before. The residue of `3/5/9/22px` becomes a visible, arguable list of sixty-odd exceptions instead of an invisible 681. Do not wait for the Figma lift; the code has already done the lifting.

**D-K · The radius set.** Six writers for `12px`, and the Stylist proposed a `size.radius` ladder. *Recommendation:* no ladder — the standing ruling holds, and Recipe's reason is the right one: every radius literal already matches a value `size.control['button-*'].radius` publishes, so the literals are owned but not centralized, which is not the condition a token is minted for. Two things do change: `--glass-radius` becomes a token (D-L), which collapses four of the six writers of `12px`, and `Slider.tsx:106`'s `borderRadius: 9` is the fourth value the ruling asks about and gets a reason or a repoint.

**D-L · `--glass-inset` and `--glass-radius`.** Two lenses disagree on where they go. The Archivist splits them — radius to `Materials/` as a material property, inset staying at the app root as window layout. Recipe mints both into `Tokens/` as `size.glass`. *Recommendation:* Recipe's, because the deciding fact is not what kind of value each is but that the design system reads both with no fallback at `previewPane.css:10,17` and `sidePane.css:10` — the one place the layering law is broken in CSS — and a token the design system can read is the fix regardless of which shelf it sits on. `--glass-radius` also silently equals the large button radius and `RECT_RADIUS` at `ImagePicker.tsx:31`: three writers, one number. Give the design-system reads a fallback either way. (Archivist D019; Recipe)

**D-M · The container title.** Four surfaces draw one concept at 20, 24, 28, and 28px; the ramp offers 26, 22, and 17; the three display steps have zero type consumers. *Recommendation:* mint `text.containerTitle` at 20px / 24px and make `--container-title-size` its bridged size, rather than converging on `title2` or leaving the constant in Geometry. 20px is the only value already tokenized and already read; 20/24 is the only line height that fits the ramp's 17/22 and 22/26 neighbors; and a geometry constant that sets a `font-size` is a type step in the wrong drawer, which is exactly why the ramp's display end looks dead. The two `calc(28px * scale)` sites become `calc(var(--container-title-size) * scale)` — the scaling survives, the number stops being restated — and `DetailTitleHeader.css:7`'s 24 drops to 20. `navView.css:28`'s 16px is a separate case and goes to `title3`. (Design Report §VIII; Archivist D002; Recipe)

**D-N · The ladders' doubled spellings.** Eleven names over eight values on both ladders; three glyph steps have zero reads. *Recommendation:* keep all eleven on both, and write the reason down where the next sweep will read it: the icon ladder is named for the type ramp so that a glyph and a type step can be spelled identically — `<Icon size="body" />` beside `text.body.standard` is the whole value. Collapse the doubles on the glyph side and the ladders stop rhyming; collapse them on the type side and a role distinction the ledger states correctly (`headline` is body-size distinct by weight) is lost. The observation the ledger should carry instead: the two ladders have opposite readerships at the top — the type ramp's `largeTitle`/`title1`/`title2` are dead while the glyph ladder uses them at nine sites. That is the reason the display names must stay, not a defect. (Design Report §IV; Archivist D018; Recipe)

**D-O · `--gutter`.** A pure alias declared one line below the thing it aliases, redeclared with a different meaning inside tables. *Recommendation:* delete it; nine reads say `--content-gutter` or `--fold-gutter` at the same length. Zero visual change. (Design Report §VIII; Archivist D005)

**D-P · The two tab strips.** Four of the preview strip's five values are already 5/6 of the main strip's; only `--tab-min` (70 vs 90 = 0.78) breaks it. *Recommendation:* set `--tab-min: 75px`, and add one comment at `previewTabStrip.css:60` saying the floating window wears the tab strip at 5/6. A named variant for the cost of a 5px change nobody will see. (Design Report §VIII; Archivist D004)

**D-Q · Three checkboxes.** `Labels/ checkboxBox` (the 17px task square, already in place), `Controls/checkbox.css` (the control's chrome), `Table/checkboxLook.tsx` (the cell glyph). *Recommendation:* `checkboxBox` is the recipe; the other two are seats that read its geometry rather than restating it. Do this before `checkboxLook` moves under D-C, so the move carries a thin file. (Archivist D012)

**D-R · The convergent values.** `--subline-h` (24px in two homes, one of them a comment explaining the duplication) and `--labels-gap` (4px in three). *Recommendation:* absorb both into `Tokens/`; `--subline-h` first, because `previewPane.css:21` already reads it with a hardcoded fallback inside the design system. (Design Report §X; Archivist D020)

**D-S · `--tint-solid`.** Zero reads, but the bridge emits the whole ladder by construction and `mixAt` short-circuits at 100 (`Tokens/tint.ts:23`). *Recommendation:* keep, and add four words to DesignSystemPM's Tints table noting the short-circuit. (Archivist D017)

**D-T · The zoom family.** Seven scale vars with no stated composition rule. *Recommendation:* one `Tokens/scale.ts` naming the axes — window, editor, embed, card, glyph — and how they compose, with every `--*-zoom`/`--*-scale` var reading from it. Without it there will be a var per surface at 3× the code.

**D-U · The root font.** *Recommendation:* replace `styles.css:31-38` with `font-family: var(--font-family); font-size: var(--text-body-size); line-height: var(--text-body-line)`, and add the line-height family to the bridge, which publishes sizes but not line heights. One line, and the app's root stack stops being a second stack.

#### V.3 Styling Discipline

**D-V · The toolbar selector, in order.** *Recommendation:* delete the colliding `color` declaration at `toolbar.css:98` first — the buttons inside the toolbar are Buttons and Button owns `--button-ink` — then walk the seventeen doubles down one at a time with the app open. Do not unwind the armor before removing what it armors against; eleven of the doubles tell you so in their own comments. The Cohesion ruling already prescribes this mechanism. (Design Report §V; Archivist D021)

**D-W · The 28 plain sheets.** *Recommendation:* migrate to `.css.ts` when each is next opened, never as a sweep — the ruling that `.css` vs `.css.ts` tracks module type holds; these 28 simply fail the test. The five feature sheets loading from `main.tsx:16-20` go first, because their global load is what makes `Table.css` a dependency of every surface.

**D-X · Inline style props.** *Recommendation:* the rule in R6, as a lint. Fourteen fixes, nine inside the design system, and the byte-identical `{ minWidth: 96, height: 24 }` pair becomes one class. (Stylist)

**D-Y · The cursor convention.** Roughly twenty sites each way; design-system components consistently on `default`. *Recommendation:* `default` everywhere except links. This is a native macOS desktop app wearing macOS materials and type; AppKit shows the arrow on buttons, menu items, and rows, and the pointer only on links. Settle it in the primitives — `MenuItem`, `AccessoryButton`, the picker row — and the sweep collapses into a handful of declarations. (ContextPM Open Call; Archivist D010)

**D-Z · The control seam.** `1.25px` has five declarers and no owner, and the checkbox carries two widths in two files. *Recommendation:* mint `--border-control` at 1.25px beside the three composed seams, publish each seam's width as its own var so a radius-capped rule can read it, and have the five declarers read it. Then the seam ladder is `1 · 1.25 · 1.5 · 1.75` with one owner each, and the checkbox picks one. (Semantic)

#### V.4 Carried To The Cleanup Lane

Recorded here so they are not lost when the Design Report retires; each changes behavior and belongs to the Codebase-Cleanup queue.

- **The twin extraction** — `PagePropertiesPane` and `PreviewInspector`, ~470 identical lines including both `biome-ignore` comments verbatim. Lives beside `usePropertyRows` in `Views/Values/`; the largest single line-count payoff available and the item most at risk of silent divergence. (Archivist D016)
- **The view host's empty state** — loading is blank by the hard rule; empty and error are one decision at `ViewRenderer`. (Bundle 6c; Archivist D011)
- **The scroll timer** — an animation nobody can see is a delay; off-screen folds open unanimated. (Archivist D015)
- **`CalendarPicker`'s range mode** — built, styled, and unreachable; both callers pass `range={false}` against a default of `true`. Retire, keeping the `schema:changeType` precedent in mind: live scaffolding with a keep-ruling is a different thing from a default no caller takes. (Design Report §VIII; Archivist D003)
- **Two decided retirements never executed** — the `layout` prop (`Interactions/drag.tsx:40`, discarded at `:74`, passed at 21 sites, and `'table'` in the `Layout` union) and `PreviewPane.scanLabel` (defaulted, never passed). The Design Report ruled *Retire* and *Inline*; they are rulings, not findings. (Design Report §IV)

### VI. What Is Already Settled

Rulings a sweep would otherwise re-derive wrongly, carried forward as current truth. Reopen any of them with a reason, not with a fresh reading. The full 165-row verification sits with the session; Cohesion-Rulings remains the durable home for the code-level ones and gains the design-layer entries below.

#### VI.1 Do Not Re-Flag

1. **Radius literals stay literal** at feature sites — a fourth value outside `6/8/10/12` is the reportable defect, not the three that exist. (D-K narrows this to the *declaring* sites.)
2. **Both ladders are settled** — `ICON_PX`/`size.icon` absorbs every icon size; `size.control`'s four bundles are the button ladder.
3. **Bridge completeness is deliberate** — unread members of a fully-bridged ramp are not orphans; `theme-vars.css.ts` bridges whole ramps on purpose and says so.
4. **The bridge is the primary token interface** — all 44 plain stylesheets depend on it; its own comment ("the showcase chrome") understates it, and trimming on that comment's strength would break the app.
5. **Three var families look dead and are not** — bridge-completeness vars, fallback-only tuning hooks (the house tuning idiom), and `Materials/`'s specular whites.
6. **`.css` vs `.css.ts` tracks module type** — no blanket migration; the 28 exceptions in I.3 fail the test rather than disproving it.
7. **The option editors stay two components** — merging inverts the hook adapter; the row wrapper is closed as `OptionSlot`.
8. **`PickerMenu.closing` stays** — two live callers inside `CalendarPicker`.
9. **No middle layer** between the design system and the features. `Views/Values/` is feature code, not a third tier.
10. **Verified healthy, do not re-litigate:** Toolbar's dropdowns compose the menu shells · `RenamableTitle → RenamableLabel → EditableInput` · `useOptionReorder → useStatusReorder` · `fieldRing` (8 importers) · `OverScroll` (25) · no `backdrop-filter` outside `Materials/`.
11. **`FileLabel` and `FileChip` are two recipes on purpose** — treatment over one shape.
12. **`GlassWindow` / `GlassSurface` / `GlassControls` are semantic slots**, not duplication.
13. **The 1px pane divider has one production consumer** — the other seven are the Interaction Lab.
14. **The autocomplete row does not adopt the shared menu-row primitive** — its metrics are a design decision.
15. **A plain-CSS host wins on specificity, never on bundle order** — and a host whose colliding declarations are deleted needs no armor.
16. **Production-dead is not dead** — `Tables/codec.ts`'s `parseTable` is the reference implementation `modelFromRegion` is pinned against.
17. **No `assertNever` helper**; the house idiom is an inline `const _exhaustive: never = x`.
18. **`EmbedTitle` stays apart** — a block-level `contentEditable` with its own semantics.
19. **`PageHeader` stays driven, not store-reading** — a floating preview draws a page that is not the active one.
20. **`SegmentRun` lives in `Fields/`** — a run of values is a field's content.
21. **No shared `design-system/tables`** — what leaks out of `Table/` is four homes; this atlas names them (`Views/Values/`, `Tokens/`, `Interactions/`, the split sheet).
22. **Design decisions are not bundled as tasks** — several are decisions, and bundling forces them by default, which is how the drift accumulated. Part V is the roster; the Cleanup checklist stays behavioral.
23. **Nothing in the design layer is an architectural error** — the instrument is `git mv` and a lint rule; net ≈ 0; nothing a user sees.
24. **`--z-*` are all read. `--subline-h` and `--labels-gap` are convergent, not divergent. `--ix-ease` reaches nothing** outside the Interaction Lab.
25. **Showcase-only is a real consumer class** — it deploys from the same sources the app builds from, so it cannot drift; which is also why it must not live inside the tree it demonstrates.
26. **Accepted, not defects:** dark-only theming · hidden scrollbars app-wide · Liquid Glass cannot be voided in place · no tracking scale · no inactive label tone yet.
27. **`Components/Detail` stays** and `Components/` keeps the genuinely shared strays — 08-25 ruling.
28. **`PickerControl` and `EyeToggle` are Elements**, not Controls.
29. **The `--safe-*` vars stay** — documented forward declarations for the mobile shell.
30. **`--ppane-*` and `table-tokens.css`'s table-scoped block stay where they are** — correctly scoped component contracts with a documented owner; only the vars that leak (`--cell-padding-x`, `--labels-gap`) move.
31. **Refuted concept conflicts:** nexus/vault, chip/label, pane/dropdown, select/option, crumb/trail — see I.4.

#### VI.2 Process Notes That Outlive Their Documents

- **P1 —** A survey measuring two files against each other without accounting for what was already extracted beneath them will overstate the duplication. The ~470-line twin figure is honest only because `usePropertyRows`, `PropertyEditor`, and `PropertyPicker` were already counted out; verify that before quoting it again.
- **P2 —** Deferring to a prior ruling without checking what it actually covered is the opposite error: a decision bounds what it decided, not everything near it. The combinator ruling covers the IPC handlers, not `crud/optionOps.ts`; the radius ruling covers feature sites, not the declaring set.
- **P3 —** Reopen a ruling with a reason, not a fresh reading. A second reading that reaches the same plausible wrong answer is not evidence.
- **P4 —** Re-derive citations against the current code before editing; the tree moves. The 08-25 session made roughly forty doc citations stale in one sitting.
- **P5 —** Restate rather than amend. A fixed item is deleted; a changed fact is rewritten as currently true.
- **P6 —** A bundle removing duplicated *computation* rather than duplicated *text* will usually grow the files it touches; naming a seam costs lines to remove work.
- **P7 —** The reachability razor cuts guards, never structure; production-dead is not dead.

#### VI.3 Superseded, As Current Truth

Three documents described a filing that did not happen — `Components/Detail` moving into `Detail/`, `EyeToggle` lifting into `Controls`, `Components/` deleted. The property half went to `Properties/`; `EyeToggle` and `PickerControl` went to `DesignSystem/Elements/`; `NavGallery` to `Navigation/`; `ImagePicker` under `Pickers/`; `SpaceSettings` into `Toolbar/SpaceDropdown`; `Components/Detail` stays; `Detail` → `Interface` and `Views` → root are ruled and unexecuted. The Table-hoisting count reads "8 files at 12 sites" in the Architecture Audit and 18 at 24 today; the difference is counting scope, not growth. The escalation roster in I.3 has one member the Design Report did not — `imagePicker.css.ts:72`.

### VII. Corrections Log

What this atlas's own lenses got wrong and withdrew before the document was written. A withdrawn finding is as useful as one that stood.

| Claim | Correction |
| --- | --- |
| The 08-25 reorganization *minted* four wrong-address `Table/` imports, confirming the Audit's passive-compounding claim | Those imports existed under `Components/Detail` beforehand; the 8/12 → 18/24 jump is counting scope. The compounding claim stays the Audit's, unproven. |
| `settingsPane.css.ts` has 21 consumers outside `Components/` | 21 total, 10 of them under `Properties/`; the remainder are its own folder. The lateral-edge finding stands at 12 importing files. |
| The Lexicographer's headline concept counts | First computed over a corpus that still included tests and the Showcase; re-run scoped, no winner flipped, every margin held. |
| `select` was omitted from the option/choice row | Restored: `select` is the persisted type id, `option` the value, `choice` the stray — and the code is already right on the first two. |
| The plain-`.css` rule as the Design Report stated it | True of six files, not 41; a second, better rule (the class-name contract) covers six more; 28 are exceptions. Recorded in I.3 and R6. |
| `text.callout.emphasized` loses 0–4 to three substitutes on pane headers | One of the three (`menu.css.ts:160`) is a nav row by its own comment, and a fourth site Semantic did not count (`NexusSettings.tsx:624`) agrees with the other two; the vote is 3–0 for footnote. The ledger's rule is redefined, not the panes. |
| All three hand-rolled accent washes repoint to `--accent-fill` | Two are 40%; only `iconPicker.css.ts:91` is 15%. The two go to `--accent-stroke`, a zero-pixel edit. |
| The Stylist's `4/6/8 = 285` | Its own table sums to 241; the table is the auditable number. |
| `--accent-fill` has one read | The one hit is a comment in `Theming/accent.ts:17`; zero stands. |
| The radius set wants a `size.radius` ladder | Withdrawn on Recipe's reading: owned but not centralized is not the minting condition; the stray is `Slider.tsx:106`. |
