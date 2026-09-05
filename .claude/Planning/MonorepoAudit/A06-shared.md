## A06 — `src/shared/` Audit

Scope: 52 non-test modules (5,953 lines) + 33 test files (4,378 lines) + 2 JSON fixtures = 87 files, 10,331 lines. Read-only; every file read in full. Importer counts are file-level, non-test, from a parse of every `import … from` / `export … from` / `import('…').X` in `src/` (the `@shared/*` alias and `./x` within shared). Tests were counted separately and never count as importers.

---

### Part 1 — Placement

#### 1. File Table

Counts = importing files per process (non-test). `shrd` = other shared modules importing it. Reach = where the module's *runtime* is actually consumed today.

| File | Lines | Class (brief) | main | rend | prel | shrd | tests | Reach |
|---|---|---|---|---|---|---|---|---|
| bridge.ts | 392 | WIRE | 1 | 0 | 1 | 0 | 0 | main + preload; renderer only via `window.nexus: NexusApi` |
| result.ts | 44 | WIRE | 40 | 8 | 1 | 3 | 3 | both |
| types.ts | 654 | WIRE (mixed, see §2) | 29 | 106 | 1 | 6 | 59 | both |
| properties.ts | 261 | DATA | 13 | 55 | 0 | 14 | 53 | both |
| views.ts | 333 | DATA | 5 | 41 | 0 | 5 | 22 | both |
| tiles.ts | 224 | DATA | 6 | 10 | 0 | 2 | 5 | both |
| contexts.ts | 68 | DATA | 8 | 2 | 0 | 2 | 2 | both |
| contextResolve.ts | 110 | DATA | 6 | 1 | 0 | 0 | 2 | both (renderer: 1 file) |
| identity.ts | 51 | DATA | 14 | 1 | 0 | 2 | 17 | both (renderer: 1 file) |
| schemas.ts | 65 | DATA | 13 | 15 | 0 | 3 | 18 | both |
| nexusPaths.ts | 65 | DATA | 20 | 11 | 0 | 0 | 15 | both |
| treePatch.ts | 563 | DATA | 3 | 7 | 0 | 0 | 2 | both |
| treeStabilize.ts | 31 | DATA | 1 | 2 | 0 | 1 | 4 | both |
| propertyValue.ts | 157 | DATA | 16 | 22 | 0 | 3 | 2 | both |
| linkValue.ts | 159 | DATA | 2 | 13 | 0 | 3 | 2 | both |
| links.ts | 149 | DATA | 6 | 12 | 0 | 4 | 4 | both |
| connections.ts | 133 | DATA | 10 | 19 | 0 | 4 | 7 | both |
| optionModel.ts | 178 | DATA | 2 | 3 | 0 | 0 | 1 | both |
| markdownCode.ts | 213 | DATA | 2 | 8 | 0 | 0 | 2 | both |
| mutate.ts | 156 | DATA | 6 | 16 | 0 | 2 | 5 | both |
| record.ts | 20 | DATA | 2 | 1 | 0 | 0 | 2 | main; renderer takes a 3-field `Pick` |
| devicePrefs.ts | 15 | DATA (Desktop pref) | 1 | 2 | 0 | 1 | 1 | both |
| cropGeometry.ts | 79 | DATA | 1 | 2 | 0 | 0 | 3 | both (main: `clampZoom` only) |
| webpageEmbed.ts | 73 | DATA | 0 | 6 | 0 | 1 | 1 | **renderer only** (shared importer is pasteAsMenu's renderer-only `pasteAsWrite`) |
| assetMime.ts | 13 | DATA | 2 | 0 | 0 | 0 | 0 | **main only** |
| menuModel.ts | 42 | UI | 1 | 1 | 0 | 13 | 0 | both |
| pageMenu.ts | 161 | UI | 5 | 4 | 0 | 9 | 1 | both |
| cellMenu.ts | 180 | UI | 1 | 3 | 0 | 1 | 1 | both (`cellMenuContextFor` renderer, `cellMenuModel` main) |
| columnMenu.ts | 123 | UI | 2 | 2 | 0 | 2 | 1 | both |
| connMenu.ts | 137 | UI | 1 | 4 | 0 | 1 | 5 | both |
| citationMenu.ts | 33 | UI | 1 | 1 | 0 | 1 | 1 | both |
| tableMenu.ts | 92 | UI | 1 | 2 | 0 | 1 | 1 | both |
| gripMenu.ts | 57 | UI | 2 | 4 | 0 | 3 | 1 | both |
| editorMenu.ts | 63 | UI | 2 | 4 | 0 | 1 | 2 | both (three audiences, see §4) |
| pasteAsMenu.ts | 134 | UI | 1 | 2 | 0 | 0 | 1 | both (main: `pasteAsRows` only) |
| pasteLink.ts | 83 | UI | 0 | 3 | 0 | 1 | 2 | **renderer only** (+ pasteAsMenu) |
| tileMenu.ts | 109 | UI | 0 | 1 | 0 | 0 | 2 | **renderer only** (`TileHost.tsx`) |
| toggleLabels.ts | 33 | UI | 4 | 8 | 0 | 3 | 0 | both |
| theme.ts | 45 | UI | 4 | 5 | 0 | 1 | 2 | both |
| columnStyles.ts | 78 | UI (brief) — is the on-disk `column_styles` codec | 1 | 18 | 0 | 5 | 3 | both |
| viewMenus.ts | 94 | UI | 3 | 0 | 0 | 1 | 1 | **main + bridge types** |
| viewRowMenu.ts | 29 | UI | 2 | 0 | 0 | 1 | 1 | **main + bridge types** |
| cardMenu.ts | 47 | UI | 1 | 0 | 0 | 1 | 1 | **main + bridge types** |
| trashMenu.ts | 49 | UI | 2 | 0 | 0 | 1 | 1 | **main + bridge types** |
| navRowMenu.ts | 26 | UI | 2 | 0 | 0 | 1 | 0 | **main + bridge types** |
| tabMenu.ts | 16 | UI | 2 | 0 | 0 | 1 | 0 | **main + bridge types** |
| optionMenu.ts | 29 | UI | 1 | 0 | 0 | 1 | 0 | **main + bridge types** |
| propertyMenu.ts | 46 | UI | 1 | 0 | 0 | 1 | 1 | **main + bridge types** |
| fileHistoryMenu.ts | 13 | UI | 1 | 0 | 0 | 1 | 1 | **main + bridge types** |
| identityMenus.ts | 11 | UI | 2 | 1 | 0 | 1 | 0 | both (types only) |
| clamp.ts | 1 | UTILITY | 0 | 10 | 0 | 2 | 0 | renderer direct; main transitively via `types.clampInt` |
| stableJson.ts | 16 | UTILITY | 1 | 0 | 0 | 0 | 1 | **main only** (`IO/atomicWrite.ts`) |

Totals by class: WIRE 1,090 · DATA 3,116 · UI 1,730 · UTILITY 17.

**Imported only by renderer (not shared):** `tileMenu.ts` (109), `webpageEmbed.ts` (73), `pasteLink.ts` (83), `clamp.ts` (1, transitive main via `clampInt`). Inside `types.ts`, 29 of 106 exports have renderer-only importers (list in §2).

**Imported only by main (not shared):** `assetMime.ts` (13), `stableJson.ts` (16). Nine menu modules (`viewMenus`, `viewRowMenu`, `cardMenu`, `trashMenu`, `navRowMenu`, `tabMenu`, `optionMenu`, `propertyMenu`, `fileHistoryMenu`; 349 lines) have zero renderer importers: their `*Context`/`*Action` types reach the renderer only through `bridge.ts` typing, and their row-builder functions each have exactly one caller in main. Inside `types.ts`, 7 exports are main-only (`ENTITY_ICON_KINDS`, `TrashCrumb`, `clampInt`, `coerceInterfaceScale`, `interfaceScaleZoom`, `coerceHoverLinger`, `DEFAULT_TRASH_MODE`).

The "one model, two renderers" premise the menu files state (an OS menu and an in-app pane drawing from one model) is realized by zero files: every `*MenuModel`/`*MenuItems` function has one consumer process. `tileMenuModel` is the inverse case (renderer only; no native menu reads it despite `tileMenu.ts:2`).

#### 2. `types.ts` — One Thing or Six?

Seven, by line range, and the importer split proves they have different audiences:

| Lines | Block | Exports | Audience |
|---|---|---|---|
| 12–41 | `NodeKind` + color-setting vocabulary (`SOLID_COLORS`, `ColorSetting<>`, 6 aliases) | 11 | 6 aliases used only inside `Personalization`; `SOLID_COLORS` imported by Showcase alone |
| 43–302 | Settings knobs: time format, entity icon kinds, `FolderPlacement`/`SidebarMode`/`PickerSelection`/`TabOpenBehavior`, `HISTORY_*`, `TAB_*`, `clampInt`, `Personalization`, `WEB_PARTITION`, `SCALE_*`, `EMBED_SCALE_*`, `INTERFACE_SCALE_*`, `HOVER_LINGER_*`, `DEFAULT_COMMANDS` | 44 | `Personalization` is wire (bridge, main 2, renderer 4); the `*_STEPS` arrays are renderer-only (SettingsWindow); the `coerce*`/`clampInt` readers are main-only |
| 57–82 | Trash rows: `TrashCrumb`, `ClearReport`, `TrashRow` | 3 | main + bridge; renderer 1 |
| 304–453 | Tree nodes + `NexusTree`/`NexusState`/`AssetMap`/`ValueChange`/`ValuesEpoch`/`PickFileOptions`; `OpenIn`/`ViewButton`/`ViewStyle` | 20 | genuinely both (`SetNode` 6/32, `CollectionNode` 5/31, `NexusTree` 12/22) |
| 455–552 | Navigation & session: `SelectionState`, `SelectTarget`, `NavRef`, `toNavRef`, `NavigationState`, tab/window persistence (`Tab`, `StoredTab`, `StoredTabSet`, `WindowSetRecord`, `WindowsFile`, `GlanceSize`) | 15 | `NavRef`/`toNavRef`/`Stored*`/`Windows*` both; `SelectionState`/`SelectTarget`/`Tab`/`TabTarget`/`NewTabSentinel`/`WindowTabTarget` renderer-only |
| 554–583 | `ThumbRect`, `SubfieldConfig`, `NavViewMode(s)` | 4 | main + bridge (renderer consumes via API types) |
| 585–654 | Page/view pipeline: `PageDetail`, `PageValues`, `ViewRow`, `ColumnKind`, `ResolvedColumn`, `GroupKind`, `ResolvedGroup`, `UNGROUPED`; `TrashMode` | 10 | `PageDetail`/`PageValues` wire; `ViewRow` (0/15), `ResolvedGroup` (0/10), `UNGROUPED` (0/6), `ColumnKind`, `GroupKind` renderer-only |

Per-export split: 106 exports → 29 renderer-only, 7 main-only, 13 referenced nowhere outside the file, ~8 main + bridge, ~49 both processes.

Belongs beside its domain module instead:
- `OpenIn`, `ViewButton`, `ViewStyle` (348–350) → `views.ts`/`tiles.ts`. They are already re-spelled as zod enums in `schemas.ts:10-11` and `tiles.ts:145-146` (see Part 2 §4).
- `ViewRow`, `ColumnKind`, `ResolvedColumn`, `GroupKind`, `ResolvedGroup`, `UNGROUPED` (604–648) → beside `views.ts` (or the renderer's `Views/Pipeline`; main never touches them).
- `PageValues` (596) → `views.ts` (it is the view pipeline's batch entry); `PageDetail` stays wire.
- `TrashCrumb`/`ClearReport`/`TrashRow`/`TrashMode`/`DEFAULT_TRASH_MODE` → one `trash.ts` beside `trashMenu.ts`.
- `SOLID_COLORS`/`SolidColor`/`ColorSetting` family (14–41) → `theme.ts` (they are derived from `SPECTRUM`).
- `Personalization` + every `*_STEPS`/`coerce*`/`DEFAULT_COMMANDS` (43–302) → a `personalization.ts`; that alone is ~260 lines, 40% of the file.
- `Tab`/`StoredTab`/`StoredTabSet`/`WindowSetRecord`/`WindowsFile`/`EMPTY_WINDOWS`/`GlanceSize`/`ThumbRect`/`WEB_PARTITION`/`DEFAULT_COMMANDS`/`interfaceScaleZoom` → Desktop (multi-window, webContents zoom, Electron session partition, `cmd+` chords).
- `NodeKind` (12) stays with the tree block; `record.ts` imports only this from `types.ts`.

`types.ts` is imported by 106 renderer files and 29 main files, so it is the load-bearing wall: none of the rest of `shared/` can be moved cleanly until it is split, because `properties`, `views`, `tiles`, `contexts`, `schemas`, `columnStyles`, `result`, `theme`, `clamp` all sit under it in the import graph (`types.ts:3-10`).

#### 3. The Split

**Core (a phone imports; data model + wire vocabulary), ≈3,650 lines:**
`identity` 51 · `schemas` 65 · `contexts` 68 · `contextResolve` 110 · `properties` 261 · `propertyValue` 157 · `optionModel` 178 · `views` 333 · `columnStyles` 78 (the `column_styles` codec; its labels are vocabulary a phone shows too) · `tiles` 221 (minus the two dead inspector constants) · `nexusPaths` 65 · `connections` 133 · `links` 149 · `linkValue` 159 · `markdownCode` 213 · `webpageEmbed` 73 · `record` 20 · `treePatch` 563 · `treeStabilize` 31 · `mutate` ≈120 (the `MutateRequest`/`MutateReply`/`containerCreators` vocabulary) · `result` 44 · `clamp` 1 · `cropGeometry` 79 · `theme` ≈40 (`SPECTRUM`, ramps, `isColorKey`) · `assetMime` 13 · `types.ts` ≈420 (tree block, `Personalization` as the settings codec, `NavRef`/`NavigationState`, `PageDetail`/`PageValues`, trash types).

**UIX (host-neutral interface models; a phone could reuse the vocabulary, its menus, and labels), ≈1,700 lines:**
`menuModel` 30 (`ActionItem`) · `pageMenu` 161 · `cellMenu` 180 · `columnMenu` 123 · `connMenu` 137 · `cardMenu` 47 · `citationMenu` 33 · `tableMenu` 92 · `gripMenu` 57 · `tileMenu` 109 · `viewMenus` 94 · `viewRowMenu` 29 · `propertyMenu` 46 · `optionMenu` 29 · `trashMenu` 49 · `navRowMenu` 26 · `tabMenu` 16 · `fileHistoryMenu` 13 · `identityMenus` 11 · `toggleLabels` 33 · `pasteAsMenu` 134 · `pasteLink` 83 · `editorMenu` ≈55 (`FormatState`, `FORMAT_CHORDS`, `keyBindingFor`) · `mutate`'s `ContextTarget`/`Creator`/`RenameHost` ≈36 · `types.ts` ≈100 (`SelectionState`/`SelectTarget`, `SubfieldConfig`, `NavViewModes`, view-pipeline types, `*_STEPS`).

**Desktop-only despite living in shared, ≈600 lines:**
`bridge.ts` 392 (the Electron IPC channel map — a phone has no `ipcRenderer`; its transport is a different contract) · `devicePrefs.ts` 15 (`nativeMenus`) · `stableJson.ts` 16 · `menuModel.ts` `MenuAnchor`/`RowMenuRequest` 12 (native popup anchoring) · `editorMenu.ts` `acceleratorFor`/`EDITOR_ACTION_PREFIX`/`INSERT_LINK_ACTION` ≈8 (Electron accelerator spelling + `menu:action` protocol) · `theme.ts` `WINDOW_BG` 2 · `types.ts` ≈130: `WEB_PARTITION` (245), `DEFAULT_COMMANDS` (297–302), `Tab`/`StoredTab`/`StoredTabSet`/`WindowSetRecord`/`WindowsFile`/`EMPTY_WINDOWS`/`GlanceSize` (504–552), `ThumbRect` (556–566), `PickFileOptions` (393–396), `TrashMode: 'system'`/`DEFAULT_TRASH_MODE` (652–654), `interfaceScaleZoom`/`INTERFACE_SCALE_BASE`/`coerceInterfaceScale` (270–284), `clampInt`/`coerceHoverLinger` (133, 289 — main's settings readers).

Ratio: 61% Core / 29% UIX / 10% Desktop.

#### 4. Misfiled Outright

- `assetMime.ts` → main. Both importers are main (`main/index.ts:74`, `main/mutate.ts:86`); the "picker offers them" in its header is main's dialog filter. 13 lines.
- `stableJson.ts` → `main/IO`. Sole importer `main/IO/atomicWrite.ts:10`. 16 lines.
- `tileMenu.ts` → renderer (`Tiles/`). Sole importer `renderer/Tiles/TileHost.tsx:27`; no main file reads it. 109 lines. (UIX if that package exists.)
- `record.ts` → main. `main/record.ts`, `main/remint.ts` use `EntityRecord`/`RecordKind`; the renderer's only use is `Pick<EntityRecord,'id'|'title'|'path'>` at `renderer/treeIndex.ts:46`, three string fields it can declare. 20 lines.
- `types.ts:604-648` (view pipeline) → `renderer/Views/Pipeline`. Zero main importers for `ViewRow`, `ColumnKind`, `GroupKind`, `ResolvedGroup`, `UNGROUPED`; `ResolvedColumn` is also read by `cellMenu.ts:11`. 45 lines.
- `types.ts:133`, `:274`, `:284`, `:289`, `:52`, `:654` (`clampInt`, `coerceInterfaceScale`, `interfaceScaleZoom`, `coerceHoverLinger`, `ENTITY_ICON_KINDS`, `DEFAULT_TRASH_MODE`) → `main/readNexus.ts`/`main/settings.ts`; main is the only reader. ≈25 lines.
- `types.ts:455-499` (`SelectionState`, `SelectTarget`, `NewTabSentinel`, `TabTarget`, `WindowTabTarget`, `Tab`, `ValuesEpoch`) → renderer store; main reads only `NavRef`/`Stored*`. `SelectTarget` is pinned by `toNavRef`'s parameter (`:477`), so it moves only if `toNavRef` takes `NavRef | { kind; id }` instead. ≈50 lines.
- `editorMenu.ts:54` `acceleratorFor` → main (Electron accelerator grammar); `:41-51` `FORMAT_CHORDS` + `:60` `keyBindingFor` → renderer (`MarkdownPM/Editor/formatKeymap.ts` is the sole importer of both). Only `FormatState` and the two action strings are cross-process. ≈25 lines leave shared.
- `tiles.ts:175,177` `MAX_INSPECTOR_TABS`, `INSPECTOR_STATE_KEY` → nowhere; dead (Part 2 §1).
- The nine main-only menu modules (349 lines): correctly placed for the target monorepo (UIX), misplaced for the app as it stands. Their row-builders could live beside their single callers in `main/` today with only the `*Context`/`*Action` types staying on the wire.

#### 5. Should `shared/` Survive as a Name?

No. `shared/` names a *location* — what two Electron processes both happen to import — not a *domain*, and the folder shows it: 61% engine data model, 29% interface models, 10% Electron wire and desktop facts, with three modules (`assetMime`, `stableJson`, `tileMenu`) that no second process imports at all and a 654-line `types.ts` that is seven files wearing one name. In a host-neutral monorepo the axis that matters is engine / interface / host, and `shared/` cuts across all three; keeping the name preserves the wrong axis and keeps the grab-bag door open (`devicePrefs`, `assetMime`, `stableJson` landed there because "main and… roughly nothing else" felt close enough). Dissolve it: data model + `result` → Core; menu models, labels, the theme ramp → UIX; `bridge.ts`, `devicePrefs`, `MenuAnchor`/`RowMenuRequest`, `WINDOW_BG`, `acceleratorFor`, and the desktop half of `types.ts` → Desktop's own `contract.ts`. The one thing genuinely shared between a laptop and a phone is Core itself, and it needs no second name. Sequence matters: split `types.ts` first or it drags everything with it.

---

### Part 2 — Dead / Stale / Obsolete

Confidence: **H** = verified by whole-tree word grep with zero external references; **M** = judgement about intent or acceptable risk; **L** = taste.

#### 1. Zero-Importer Exports (non-test)

Verified two ways: import-clause parse of all 959 `src` files, then a word-boundary grep of every candidate across `src/` excluding its own file and tests. 68 exports have no importer. They fall into three buckets.

**(a) Dead symbols — no reference anywhere but the declaration:**

| Where | What | Lines | Conf | Breaks if wrong |
|---|---|---|---|---|
| `tiles.ts:175` | `MAX_INSPECTOR_TABS = 6` | 1 | H | nothing — zero references in src or tests |
| `tiles.ts:177` | `INSPECTOR_STATE_KEY = 'inspector'` | 1 | H | nothing |

**(b) Dead `export` keyword — symbol used only inside its own file (66 exports, 0 lines, public surface only).** Notable clusters: `connMenu.ts:23,25,30,37,39,44,56` (seven of its nine type/const exports leave the file nowhere); `types.ts:15,31,35,36,37,41,250,251,272,273,282,304,316` (the five `*ColorSetting` aliases, `SolidColor`, `SCALE_MIN/MAX`, `INTERFACE_SCALE_MIN/MAX/BASE`, `BaseNode`, `PathNode`); `pasteAsMenu.ts:24,49,92,99`; `tileMenu.ts:16,26,28,39`; `markdownCode.ts:10,73,110`; `schemas.ts:10,11,18` (`openInField`, `viewButtonField`, `crop` — exported alongside the `coerce*` wrappers that are the actual API); `pageMenu.ts:67,72`; `cropGeometry.ts:4,32,36`; `identity.ts:7,35`; `linkValue.ts:19,35,59`; `mutate.ts:12,40`; `properties.ts:7,63,164`; `propertyValue.ts:34,41`; `contextResolve.ts:7,56`; `connections.ts:45`; `result.ts:6`; `record.ts:12`; `tableMenu.ts:8`; `viewMenus.ts:10`; `views.ts:16,184,197,198`; `columnMenu.ts:28`; `citationMenu.ts:12`; `cardMenu.ts:26`; `cellMenu.ts:49`; `pasteLink.ts:8,29`. Removable: the keyword. Breaks: nothing at runtime; nine of them are imported by a test alone (`StyleMenuContext`, `panToCrop`, `parseLink`, `PasteInput`, `propertyType`, `resolveSingleOption`, `TileMenuContext`, `decodeSubGroup`, `decodeGroupConfig`) and would need the tests to go through the public entry instead.

**(c) Showcase-only:** `types.ts:15` `SOLID_COLORS` — sole importer `renderer/Showcase/Leaves/ColorsLeaf.tsx`. Showcase must compile, so it moves into that leaf as `Object.keys(SPECTRUM)`. 1 line. H.

#### 2. Retired-Feature Remnants

| Where | What | Verdict | Lines | Conf | Breaks if wrong |
|---|---|---|---|---|---|
| `identity.ts:5` + `properties.ts:167-172` | `RETIRED_ID_KEYS = ['PageID','TaskID','EventID']` and `'created_at'`/`'modified_at'` folded into `RESERVED_KEY_NAMES` | Their only job is refusing a user property named after a retired key. No migration reads them; `RETIRED_ID_KEYS` has one importer. A remnant kept deliberately as a name guard. | 5 | M | A user could name a property `PageID`; in a Nexus that still carries old `PageID:` frontmatter that property would adopt those values. Keep until NexusOS is confirmed clean; otherwise drop. |
| `mutate.ts:88-90` | `op: 'setProfileSubtitle'` | The comment insists "NOT dead code", but no renderer file dispatches it (grep: only `main/mutate.ts:432`, `main/mutatePatch.ts:171` handle it; zero senders). An unreachable write arm across three files. | 1 shared (+≈15 in main) | H | Nothing; the eventual settings surface re-adds a one-line union member. |
| `record.ts` (20) | `EntityRecord`/`RecordKind`/`ExistState` | Not a remnant — the live baseline tuple for `main/record.ts` + `main/remint.ts`; `'unreadable'` is produced at `main/record.ts:98-115`. Misfiled to shared (renderer takes a 3-field `Pick`). | 0 removable, 20 to move | H | — |
| `treeStabilize.ts` vs `treePatch.ts` | overlap? | None. `stabilize` is a generic structural-sharing deep-equal (identity recycler) used by `main/assetMap.ts:125`, `renderer/Store/nexusSlice.ts:153`, `cacheSlice.ts:101`, and `treePatch.ts:332`. `treePatch` is the transform set. Distinct concerns; the one smell is `treeStabilize.ts:6` importing `isPlainObject` from the *property* module for a generic utility. | 0 | H | — |
| `devicePrefs.ts` (15) | `DevicePrefs { nativeMenus? }` + `packDevicePrefs` | Live end-to-end (`bridge.ts:267-268`, `main/index.ts:857-865`, `renderer/Store/configSlice.ts`, `SettingsWindow.tsx:101`). Desktop-only content. | 0 | H | — |
| `identityMenus.ts` (11) | four action unions | Live (`bridge.ts:319-341`, `main/index.ts:1781-1850`, `main/iconFavoriteMenu.ts`, `renderer/Interface/DetailTitleHeader.tsx`). The odd one out: every other menu has a shared row-builder; these four have their rows hard-coded main-side in `popReturningMenu` calls. Inconsistent, not dead. | 0 | H | — |
| `clamp.ts` (1) | `clamp` | 12 importers. A one-line module is a homeless utility; fold with `isPlainObject` (also used by 10 main files, 2 shared) into one `util.ts`. | 0 | L | — |

#### 3. One-Reader Indirection Worth Inlining

| Where | What | Why | Lines | Conf | Breaks if wrong |
|---|---|---|---|---|---|
| `properties.ts:198` | `isRegisteredPropertyName(key, names) = names.has(key)` | Wraps `Set.has`; one importer (`main/CRUD/cascade.ts`). | 3 | H | nothing |
| `properties.ts:189` | `isReservedKeyName` | One importer (`main/CRUD/registryProperty.ts:28`) that then calls `invalidPropertyName` (`:193`), which re-tests the same set, to pick a message. A single `propertyNameProblem(name): string \| null` returning the `KEY_REFUSAL` reason would replace both. | 4 | M | the two message branches at `registryProperty.ts:28` |
| `treePatch.ts:533` | `reorderTopInTree(tree, _key, order)` | Ignores `_key`; is exactly `reorderChildrenInTree(tree, '', order)` (`:543`). Both callers (`main/mutatePatch.ts:81`, `renderer/Store/nexusSlice.ts:217`) already import the other one. | 3 | H | nothing; the two call sites pass `''` |
| `pasteAsMenu.ts:28` | `wholeWikiLink` | Re-implements `connections.ts:105` `parseConnectionText` (whole-string wikilink) without `titleOf`'s `\|` strip or trim, so the two can disagree on `[[Notes\|x]]` inside a table cell. | 4 | M | Paste As on a pipe-escaped connection — arguably a fix |
| `schemas.ts:10-16` | `openInField`/`viewButtonField` + `coerceOpenIn`/`coerceViewButton` | Fields exported but unimported; coercers are `field.parse(raw)` one-liners with 2 main importers. Export one pair, not both. | 4 | M | nothing |
| `tiles.ts:179` | `mintSeed(type, id) => ({ id, type })` | Two main callers; a one-line object literal behind a name. | 1 | L | nothing |
| `fileHistoryMenu.ts` (13) | `fileHistoryMenuItems` | A 6-line function with one caller (`main/index.ts`); the module exists to host it. Same pattern for `optionMenu.ts`, `propertyMenu.ts`, `viewRowMenu.ts`, `tabMenu.ts`, `navRowMenu.ts`. | — | L | — (placement, not deletion) |
| 13 row-builders | `cardMenuModel`, `cellMenuModel`, `citationMenuModel`, `connMenuModel`, `fileHistoryMenuItems`, `optionMenuModel`, `propertyMenuModel`, `tableMenuItems`, `viewRowMenuItems`, `viewButtonMenuItems`, `embedTitleMenuItems`, `embedAreaMenuItems`, `trashMenuLabels` | Each has exactly one caller, a `popModelMenu`/`popReturningMenu` wrapper in main. The shared placement buys nothing today; in the target layout they are UIX. | 0 | H | — |

#### 4. Duplicate Definitions

The seven asked:

1. **`shared/columnStyles.ts` vs `renderer/Tables/columnStyles.ts`** — same concept split by layer: shared = codec + `defaultStyleFor`; renderer = `styleFor` (pure merge of saved over default) + `useStyleFor` (React hook). `styleFor` has no React dependency and belongs beside `defaultStyleFor`; only the hook needs the renderer. **Collapse** (move `styleFor`, 15 lines).
2. **`shared/propertyValue.ts` vs `renderer/Properties/value.ts`** — same domain, two layers: codec (decode/encode/reconcile) vs row resolution (`declaredType`, memoized `resolveFieldValue`, `fileName`). `declaredType` is pure and shared already contorts to avoid depending on it (`columnStyles.ts:50` takes `declaredType: string` "so shared/ needs nothing from the renderer's declaredType"). **Partial collapse:** `declaredType` → `shared/properties.ts` beside `STAMP_TYPE`; `resolveFieldValue` + its WeakMap stays renderer; rename the renderer file `rowValue.ts`.
3. **`shared/identity.ts` vs `main/identity.ts`** — two things: content-file ULID identity (kind marks, `ID` key, admission) vs per-Nexus `.nexus/nexus.json` identity + agenda seeding. **Rename** main's → `nexusIdentity.ts`.
4. **`shared/tiles.ts` vs `main/tiles.ts`** — same domain, codec vs IO (`createMarkdownTile`, `duplicateTile`, `rewriteTileConnections`). Under Core/Desktop the split is right. **Rename** main's → `tileOps.ts`.
5. **`shared/mutate.ts` vs `main/mutate.ts`** — same concept (the write path), contract vs 784-line handler. Legit split; **rename** main's → `writePath.ts`. Additionally `main/mutatePatch.ts:36` **redeclares `MutateOutcome`** as a 2-field subset (`created`, `renamed`) under the same name as `shared/mutate.ts:12` (which also carries `adopted`, `trashed`). Collapse to `Pick<MutateOutcome,'created'|'renamed'>` or the import. 4 lines. H.
6. **`shared/editorMenu.ts` vs `main/editorMenu.ts`** — contract vs Electron `Menu` builder. Legit split, but the shared side is itself three audiences (see Part 1 §4). **Rename** main's → `editorContextMenu.ts`.
7. **`shared/contexts.ts` vs `shared/contextResolve.ts` vs `renderer/Properties/resolveContext.ts`** — `contexts` (registry codec, sigils, normalization) and `contextResolve` (resolve `<Context>:` keys, reconcile a governed root) are one domain in two files; the only cycle a merge creates is type-only (`types.ts` → `contexts.ContextDef`; `contextResolve` → `types.SpaceNode`). **Merge** (68 + 110). The renderer's `ResolveContext` is unrelated — it is the dependency bag (schema, id maps, asset map) for resolving a *cell*, where "context" means environment, not Pommora Contexts. **Rename** → `ValueResolveEnv`/`CellEnv`.

Found beyond the brief (all within or touching shared):

| Where | What | Verdict | Lines | Conf |
|---|---|---|---|---|
| `links.ts:10` `HAS_SCHEME` ≡ `nexusPaths.ts:48` `WEB_ADDRESS` | identical `/^[a-z][a-z0-9+.-]*:/i` | one export | 1 | H |
| `links.ts:14` `WEB_SCHEME` ≡ `nexusPaths.ts:52` `HTTP_URL` ≡ `pasteLink.ts:42` inline | identical `/^https?:\/\//i` | one export | 2 | H |
| `connections.ts:22` `normalizeTitle` ≡ `contexts.ts:53` `normalizeContextValue` | same `trim().toLowerCase().normalize('NFC')`, the latter `String()`-wrapped | one function taking `unknown` | 3 | H |
| `types.ts:348-350` `OpenIn`/`ViewButton`/`ViewStyle` vs `schemas.ts:10-11` vs `tiles.ts:145-146` | the three enums' values re-listed as zod literals 2–3× (`views.ts:5-6` states the one-source idiom this violates) | `as const` arrays once, derive type + zod | ≈4 | H |
| `types.ts:250-251` `SCALE_MIN/MAX` vs `renderer/Frames/LayoutFrame.tsx:43-44` | renderer redefines `0.5`/`1.5` locally — which is *why* the shared exports have no importer | import the shared pair | 2 | H |
| `columnStyles.ts:24` `DATE_FORMAT_LABELS`, `columnMenu.ts:92-98` (weekday/time labels), `types.ts:47` `TIME_FORMAT_LABELS` vs `renderer/Properties/Editors/DateTimeEditor.tsx:6-22` | the date/weekday/time label vocabulary spelled three times (`'12 Hours'`/`'24 Hours'`/`'Full'`/`'Short'`/`'Hidden'`/`'MM/DD/YYYY'`…) | one `*_LABELS` per axis in `columnStyles.ts`; `columnMenu` and `DateTimeEditor` map over them | ≈15 | H |
| `types.ts:43` `TimeFormatSetting` ⊂ `columnStyles.ts:32` `TimeFormat` | two enums for one vocabulary (`'none'` is the only difference) | `TimeFormatSetting = Exclude<TimeFormat,'none'>` | ≈6 | M |
| `citationMenu.ts:12` `CitationSubject` vs `renderer/MarkdownPM/Editor/citationActions.ts:164` `CitationSubject` | a string union vs an object union with locations — two things, one name | rename shared's → `CitationSubjectKind` | 0 | H |
| `pasteAsMenu.ts:28` `wholeWikiLink` vs `connections.ts:105` `parseConnectionText` | see §3 | collapse | 4 | M |
| `.md` strip ×6: `connections.ts:14`, `pageMenu.ts:20`, `links.ts:102`, `main/coerce.ts:15` `basenameNoMd`, `main/CRUD/trashRows.ts:71`, `main/provenance.ts:395` | the same `replace(/\.md$/i,'')` | one helper in `nexusPaths.ts` | ≈5 | M |
| `treePatch.ts:21,24` `basename`/`parentOf` vs `main/assetMap.ts:30`, `main/valuesChanged.ts:10` | POSIX path helpers re-rolled | export from `nexusPaths.ts` | ≈3 | L |
| `properties.ts:32` comment on `LINK_DISPLAY_LABELS` | claims "Duplicated rather than imported — main cannot read a renderer's list"; there is no renderer list — `renderer/Properties/linkFormat.ts:1` imports this one | false claim of duplication (comment only) | 0 | H |

#### 5. Read Three Times — Blunt Verdicts

- **`contextResolve.ts:66-104` `reconcileGovernedRoot`** — `changed` doubles as a delete list *by absence* (a key in `changed` but not in `root` means deleted), decoded later by `survivingChanges` (`:108`). A `{ set: Record, deleted: string[] }` return says it once. Clever; costs every reader a second pass.
- **`treePatch.ts:147-203` `extract`/`insert`** — `let node`/`let done` mutated inside `.map` callbacks with `if (node) return c` as an early-out. It is a `for` loop dressed as a `map`. Works; reads as a puzzle.
- **Separator bookkeeping** — resolved four different ways: `pageMenu.ts:125,137` (`separatorBefore: !opts.move`, `!opts.history && !opts.clipboard && !opts.move`), `pageMenu.ts:160` (strip index 0), `connMenu.ts:104,131-134` (re-map after the fact), `cellMenu.ts:121` (`model.items.length > 0`). `menuModel.ts:11` even legislates "leading separators are the caller's to drop", pushing the arithmetic into every model. One `normalizeSeparators(items)` at the popup would delete all of it. ≈12 lines across four files. M.
- **`tileMenu.ts:48-65` `drill`** — builds rows while pushing into a side array `picks` and encodes the index into the action string (`tile:pick:${picks.length - 1}`). Row and payload are coupled through a counter. `ActionItem` is generic; carrying the pick on the row (or returning `{rows, picks}` from `drill`) removes the side effect.
- **`cellMenu.ts:60-126`** — `cellMenuContextFor` → `baseCellMenu` → `cellMenuModel` → `baseCellMenuModel`: four functions, two of which exist only to thread `hideable`. The comment "remove-only must CARRY the hideable flag — the model appends Remove only when it sees it" is the tell.
- **`linkValue.ts:103-118` `urlValueFromEdit`** — returns `PropertyValue | null | undefined` with `null` = clear and `undefined` = invalid. Tri-state via two nullish values; a `{ kind: 'clear' } | { kind: 'invalid' } | PropertyValue` reads once.
- **`views.ts:198-247` `decodeSubGroup`/`decodeGroupConfig`** — hand-rolled lenient decoders wired into a zod schema through `z.unknown().transform(...)` (`:279-280,290`). Two validation idioms in one file for shapes zod expresses directly (`discriminatedUnion` + per-field `catch`). ≈50 lines could be ≈20. M.
- **`types.ts:18-41` `ColorSetting<Inherit>`** — a generic plus five aliases that are referenced only as `Personalization` field types. The aliases add names without adding meaning outside the file.
- **`columnMenu.ts:62-70`** — `row(key, checked)(label, value, sep)` double-curried row factory. Fine after one re-read; noted because it's the only curried builder in the folder.

#### Totals

**High confidence removable (code, not comments/tests): ≈45 lines** — dead inspector constants 3 · `SOLID_COLORS` 1 · `HAS_SCHEME`/`WEB_ADDRESS` 1 · `WEB_SCHEME`/`HTTP_URL`/inline 2 · `normalizeTitle`/`normalizeContextValue` 3 · `SCALE_MIN/MAX` in LayoutFrame 2 · `MutateOutcome` redeclaration 4 · `isRegisteredPropertyName` 3 · `reorderTopInTree` 3 · enum re-lists 4 · date/time label triplication 15 · `setProfileSubtitle` arm 1 (+≈15 in main) · `wholeWikiLink` 4.

**Medium confidence: ≈35 lines** — retired key guards 5 · `isReservedKeyName` fold 4 · `TimeFormatSetting` fold 6 · `.md`-strip consolidation 5 · separator normalization 12 · `schemas` coerce/field pair 4. Plus 66 dead `export` keywords (surface, 0 lines) and ≈30 lines of `decodeGroupConfig` compressible under zod.

**Relocations (moved, not removed): ≈600 lines** of Desktop-only content out of shared; ≈130 lines of `types.ts` to the renderer; `assetMime` 13 + `stableJson` 16 + `record` 20 to main; `tileMenu` 109 to renderer/UIX.

---

### Summary

`src/shared/` is not Core; it is a location. Of 5,953 non-test lines, ~61% is a genuine host-neutral data model (properties, views, tiles, contexts, identity, schemas, connections/links grammar, treePatch), ~29% is interface models (fourteen menu row-builders, labels, theme ramp), and ~10% is Electron wire and desktop fact (`bridge.ts`, `devicePrefs`, window/tab persistence, accelerators, `WEB_PARTITION`). Three modules are imported by only one process (`assetMime`, `stableJson` → main; `tileMenu` → renderer), and every shared menu row-builder has exactly one consumer process, so the "one model, two renderers" premise is realized nowhere. `types.ts` is seven files under one name (29 renderer-only exports, 7 main-only, 13 never referenced outside the file) and is the import-graph root for the whole folder; it must split first. Dissolve `shared/` into Core / UIX / Desktop (~3,650 / ~1,700 / ~600 lines). Dead code is small: two unreferenced constants, one unreachable mutate op, 66 needless `export` keywords, and ~45 high-confidence lines of duplicated regexes, normalizers, enum literals, and label tables (the datetime label vocabulary is spelled three times; `SCALE_MIN/MAX` is redefined in the renderer because the shared export went unused). Two name collisions hide different types (`CitationSubject`, `MutateOutcome`).
