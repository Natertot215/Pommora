### Properties Restructure — Scout Reports

**DATE:** 10-21-2026
**HEAD:** `d0595b22d`

The nine scouts' reports, each checked against the code at HEAD by two reconcilers, kept as the backup evidence behind *Properties Restructure — Investigation*, which cites their finding, ledger, and approach IDs. Each finding keeps its *Now* with its citations, and one marked INFERRED is reasoned from the code without a run or a measurement.

---

#### Scout 01 — Catalog & Types

The type catalog, the definition decoder, and every place a type fact is decided, read at `d0595b22d`. NexusOS's `.nexus/properties.json` holds 15 definitions (14 listed in `order`) over 9 types (`dateTime` 3, `multiSelect` 3, `select` 3, and one each of `status`, `link`, `checkbox`, `file`, `number`, `text`), carrying `id`/`key`/`label`/`type` on all 15, `icon` 10, `select_options` 6, `key_format` 3, and `status_groups`, `link_color`, `link_underline`, `checkbox_color`, `number_decimals`, `number_family` 1 each; no stored definition has a `context`, `createdTime`, or `lastEditedTime` type, and the O(n²) `validateName` admission is cold at this size. `.claude/scripts/make-benchmark-nexus.mjs:143-152` writes only current camelCase ids.

##### Inventory

| File / Symbol | Lines | Responsibility | Callers Outside the File | Belongs Here? |
|---|---|---|---|---|
| `Core/Properties/properties.ts` | 342 | Type catalog, definition decoder, option shapes, reserved ids, refusals, seeds | 50 exports (below) | Mixed |
| ↳ `typeIds`/`PropertyType`/`PROPERTY_TYPES`/`specOf`/`groupable`/`pickKindOf` | 10-76 | The engine type record and its derivations | 8+ files outside Properties | Yes |
| ↳ `TypeSpec` | 27 | The record's row type | none | Unexport |
| ↳ `LEGACY_TYPE_IDS`/`propertyType` preprocess | 78-88 | Reads earlier-build type spellings | `LEGACY_TYPE_IDS` only in a test; `propertyType` in `migrateConfig.ts:58` and `Bundles/rows.ts:91` (a Trash row's type for its icon, read as `row.propertyType` at `TrashFrame.tsx:66-67`) | Remove (01-02) |
| ↳ `LINK_DISPLAYS`/`LinkDisplay`/`isLinkDisplay`/`DEFAULT_LINK_DISPLAY`/`LINK_DISPLAY_LABELS` | 90-102 | Link format vocabulary | columnStyles, columnMenu, LinkCell, pasteLink, LinkEditor, linkFormatOptions | Yes; see 01-09 |
| ↳ `NUMBER_FAMILIES` | 105 | Number family list | none | Unexport |
| ↳ `NumberFamily`/`CURRENCY_CODES`/`DEFAULT_CURRENCY` | 106-109 | Number format vocabulary | NumberEditor, formatValue | Yes |
| ↳ `optionAppearance`/`OptionAppearance` | 111-112 | Option appearance enum | optionModel, OptionChip, OptionEditPopup | Yes |
| ↳ `labelled` | 115-120 | Label falls back to key | optionOps | Yes |
| ↳ `SelectOption`/`StatusOption`/`StatusGroup` | 122-158 | Option decoders | optionModel, optionOps, propertyValue | Yes |
| ↳ `propertyDefinition`/`PropertyDefinition` | 160-195 | The definition decoder | propertiesRegistry, `Trash/restoreProperty.ts:37`; the type in 42 files outside | Yes |
| ↳ `propertyDraft`/`PropertyDraft` | 197-201 | The create payload | handlers; type in restoreProperty | Yes |
| ↳ `narrowLinkConfig`/`narrowNumberFormat`/`narrowFileConfig` + `LinkConfig`/`NumberConfig`/`FileConfig` | 203-241 | Channel-input narrowers for display config | handlers.ts | With the channel (03-07) |
| ↳ `RESERVED_PROPERTY_ID`/`STAMP_TYPE`/`isReservedPropertyId` | 243-259 | Reserved column ids | 8 files outside | Partly (01-04) |
| ↳ `RESERVED_NAME_PREFIX` | 261 | `$` prefix | schema.ts | Move to schema.ts |
| ↳ `itemCount` | 263 | "N Items" pluralizer | `Interface/Confirm/confirmations.ts`, governedSweep | Engine-side (01-10) |
| ↳ `KEY_REFUSAL` | 265-274 | Name-gate refusal messages | schema.ts, registryProperty.ts, tests | Move to schema.ts |
| ↳ `groupOptions`/`optionsOf`/`optionLabels`/`SELECT_GROUP`/`optionGroupsOf`/`withOptionGroups` | 276-315 | Option-model readers | Views/Pipeline group and sort, restoreScrub, replay, Pickers | Yes; `optionGroupsOf`/`withOptionGroups`/`SELECT_GROUP`/`groupOptions` are Properties-only |
| ↳ `PickOption` | 284 | Picker option shape | Contexts/contextOptions, Pickers, FilterFrame | Picker vocabulary in the definition file (minor) |
| ↳ `defaultStatusSeed`/`defaultSelectSeed` | 317-342 | Create-time seeds | registryProperty, tests | Move to registryProperty.ts |
| ↳ `byKey` | 49-50 | `Map` by `.key` | `Contexts/contextResolve.ts:4`, `Nexus/cascade.ts`, `Trash/restoreScrub.ts`, `assignment.ts`, `schema.ts` (other `byKey` hits in Views and UIX are unrelated local names) | Generic helper (minor) |
| `Core/Properties/schema.ts` | 112 | Name gate, definition validation, option uniqueness, `linkKeysOf` | `keyRefusal` restoreScrub; `linkKeysOf` matrixInput, cascade | `linkKeysOf` is a type fact (01-05) |
| `Core/Properties/keyFormat.ts` | 76 | The ten Key/Value Formats and `formatKey` | `KeyFormat`/`FormatChange` in bridge.ts, confirmations; `spellingsOf` restoreScrub | Yes |
| `Core/Properties/optionModel.ts` | 92 | Pure option-group edits (`applyOptionEdit`) and the `optionEdit` decoder | optionOps, registryProperty, handlers | Yes |
| `Core/Properties/propertiesRegistry.ts` | 127 | Registry read and admission, ordered defs, guarded mutation, schema-op lock | readNexus, fileEvents, cascade, create, Trash/spend, restoreProperty | Yes; `linkDefsOf` is a type fact (01-05) |
| `Core/Properties/columnStyles.ts` | 155 | Per-view looks, date/time/weekday vocabularies, stored-style decoder, resolution, defaults | columnMenu, Settings, Bundles/browser, Views/Host, useColumns, cells | Yes; `StoredColumnStyle` exported for tests only |
| `Core/Properties/formatValue.ts` | 303 | Date read and format, bucket labels, number format, parse, and respell | Cells, Pickers, Views/Pipeline, bandModel, PageReaderWindow, Settings | Mostly; `formatBucketLabel` is Views grouping (01-14); `numberDivisor` is internal plus tests, and `NumberPart` (`:194`) has no outside reader |
| `Core/Properties/rowOrder.ts` | 13 | "Listed first, the rest after" ordering | registry, PropertyPanel, Views/Bands, Views/Pipeline | Generic utility; its local `byKey` shadows the properties.ts name |
| `Core/Properties/Cells/PropertyTypes.tsx` | 97 | `TYPE_META`, `CREATABLE_TYPES`, `PropertyTypeIcon`, and filter/sort/group pane targets | PropertyFrame, ArchiveView, TrashFrame, TableView, CardsView, VisibilityFrame, filterModel, SortFrame, GroupFrame, PropertyPanel, previewRules | Split: `:59-97` aren't type facts (01-08) |
| `Core/Properties/Cells/columnLabel.ts` | 19 | Header label for any column id; `RESERVED_LABEL` | 6 production files (propertyMenuActions, CardsView, cardValueInput, useViewInteractions, VisibilityFrame, TableView); `RESERVED_LABEL` only PropertyTypes.tsx and a test | Reserved-column facts are scattered (01-04) |
| `Core/Properties/Schema/linkFormatOptions.ts` | 8 | `LINK_FORMAT_OPTIONS` picker rows | LinkEditor, Settings/frames.ts | No: duplicates `lookOptions(LINK_DISPLAYS)` (01-09) |
| `Core/Nexus/migrateConfig.ts` | 74 | On-open respell of saved-view keys and registry type ids | `Nexus/handlers.ts:44-45`, `adopt.ts:28,109` | Remove (01-02) |
| `Core/Contexts/contextOptions.ts` | 37 | Context column's picker options, cached per Space identity map | propertyMenuActions, PropertyPanel, useViewHost, FilterFrame | Yes |
| `Core/Properties/value.ts` `declaredType`/`columnType` | 14-31 | Column id → type, including `'title'`, stamps, Context | 15+ Views, Matrix, and Table sites | Yes; carries the `'title'`/Context threading (01-03) |

**Export Surface of `properties.ts`:** 50 names. Unused outside the file: `TypeSpec`, `NUMBER_FAMILIES`. Test-only outside: `LEGACY_TYPE_IDS`. Properties-folder only, tests included (21): `labelled`, `SelectOption`, `StatusOption`, `StatusGroup`, `optionAppearance`, `propertyDraft`, the three `narrow*`, `RESERVED_NAME_PREFIX`, `KEY_REFUSAL`, `groupOptions`, `SELECT_GROUP`, `optionGroupsOf`, `withOptionGroups`, `defaultStatusSeed`, `defaultSelectSeed`, `NumberFamily`, `CURRENCY_CODES`, `DEFAULT_CURRENCY`, `OptionAppearance`, `OptionPickKind`. Used beyond Properties: the remaining 26. Elsewhere, `numberDivisor` and `StoredColumnStyle` have no production caller outside their file, and `NumberPart` has no caller outside its file.

###### Where Type Facts Live (Outward Map)

An exhaustive `switch` or `Record` over `kind` or `PropertyType` breaks at compile time when a type is added; an ad hoc `type === 'x'` doesn't.

| Site | Keyed By | Compile-Checked | Re-Decides a Spec Fact? |
|---|---|---|---|
| `properties.ts:10-23,34-47` `typeIds`, `PROPERTY_TYPES` | type | yes | — (the record) |
| `Cells/PropertyTypes.tsx:21-35` `TYPE_META` | type + `'title'` | yes | second per-type record (01-01) |
| `Views/Table/useColumns.ts:32` `WIDTHS`, `:52` `STYLE_MIN`, `:103` `DEFAULT_ALIGN` | type + `'title'` | yes / partial / yes | third to fifth per-type tables |
| `Schema/PropertyFrame.tsx:341-394` `SETTINGS` | type | yes | `NO_SETTINGS` rows for `context`/`createdTime`/`lastEditedTime` (`:390-393`), types a definition can't legitimately have (01-03) |
| `columnStyles.ts:133` `defaultStyleFor` | kind | yes | — |
| `Actions/columnMenu.ts:40-42` `styleMenuLabel` | `type === 'link' \|\| 'number'` | no | yes |
| `Actions/columnMenu.ts:65` `styleMenuItems`, `Actions/cellMenu.ts:61-86` | kind (+ `=== 'title'`) | yes | — |
| `Pickers/valueClick.ts:21-48` `valueClickIntent` | kind/origin | yes | — |
| PickTarget builders: `PropertyPanel.tsx:367-377`, `useViewHost.ts:211-234`, `CardsView.tsx:528`, `propertyMenuActions.ts:36,46,101,113`, `ValuePickPresenter.tsx:19` | `def.type === 'dateTime'/'file'/'context'/'checkbox'` | no | yes: five builders for one "which editor does this type open" fact |
| `propertyValue.ts:21-35,104-144,247-269,295` | kind | yes | — |
| `optionOps.ts:133`, `Nexus/fileEvents.ts:528-529` | `=== 'multiSelect'` | no | yes: "registers unknown members" stated twice. `propertyValue.ts:169` (the keep-unclaimed-words write rule) and `Nexus/configReach.ts:127-128` (whether a rule's operands name whole values) state other facts and read `PROPERTY_TYPES[def.type].kind` |
| `schema.ts:37` `linkKeysOf`, `propertiesRegistry.ts:67` `linkDefsOf`, `Trash/restoreScrub.ts:148`, `Trash/restoreProperty.ts:65`, `assignment.ts:93` | `=== 'link'` / `'text'` | no | yes (01-05) |
| `registryProperty.ts:42` `seeded` | `options` | yes | — |
| `Views/Pipeline/filter.ts:117` `evaluatorOf`, `Views/filterModel.ts:112` `KIND_OPS`, `sort.ts:81`, `reassign.ts:6` `FROM_GROUP_KEY`, `creationSeeds.ts:29`, `Host/useViewCreation.ts:33` `SEEDS_FROM_SORT`, `Settings/SortFrame.tsx:54` | kind | yes | — (six more per-kind tables, 07) |
| `Settings/GroupFrame.tsx:106,159,236,279,304,309`, `FilterFrame.tsx:380,408`, `SortFrame.tsx:119`, `Pipeline/group.ts:383` | `=== 'dateTime'/'checkbox'/'context'`, `kind === 'select'` | no | partly |
| `Cells/OptionChip.tsx:26` `optionGlyph`, `UIX/Labels/recipes.tsx:11` `optionShapeFor` | `=== 'status'/'multiSelect'` on `type: string` | no | yes (01-06) |
| `Pickers/PropertyValueInput.tsx:48,84,101,109`, `parseEditorValue.ts:36-42`, `PropertyPanel.tsx:325,334,539`, `CardsView.tsx:217,494,718`, `cardValueInput.ts:35`, `TableView.tsx:260` | `def.type === 'number'/'text'/'link'/'checkbox'` | no | partly |
| `Matrix/matrixInput.ts:88` | origin | yes | — |

**Count:** adding a type touches about 14 compile-checked tables and switches (two records, three width/align tables, `SETTINGS`, `defaultStyleFor`, `styleMenuItems`, `cellMenu`, `valueClick`, decode, encode, `isBlankValue`, and six per-kind Views tables) and about 25 unchecked `=== 'x'` sites, the scout's tally, not re-counted; about a third restate something a spec field could answer.

##### Findings

###### 01-01 · Two Per-Type Records Hold Type Facts, and Five More Tables Repeat the Keying
- **Now:** `PROPERTY_TYPES` (`properties.ts:34-47`) holds kind/origin/groups/options. `TYPE_META` (`Cells/PropertyTypes.tsx:21-35`) holds label/icon keyed on the same 12 ids plus `'title'`. `WIDTHS`/`STYLE_MIN`/`DEFAULT_ALIGN` (`useColumns.ts:32,52,103`) key the same set again, and `styleMenuLabel` (`columnMenu.ts:40`), `optionShapeFor` (`UIX/Labels/recipes.tsx:11`), and `optionGlyph`'s default (`OptionChip.tsx:26`) restate per-type display facts as string comparisons. `CREATABLE_TYPES` (`PropertyTypes.tsx:44-46`) is a pure derivation of the engine record living in a `.tsx`.
- **Better:** One engine record and one renderer record, with the boundary as the only reason for two. The engine record gains `label`, a connections fact (01-05), and `registersMembers`, which replaces the two registration sites (`optionOps.ts:133`, `fileEvents.ts:528`); `CREATABLE_TYPES` moves beside it. The renderer record absorbs icon, chip shape (deleting `optionShapeFor` from UIX), chip default glyph, and the style-menu label. Widths, minimums, and alignment are Table layout facts and stay in `useColumns.ts` unless 07-02's per-kind view record takes them. Icons can't join the engine record: `IconName` is `keyof typeof icons` in `UIX/Symbols/index.tsx:206`, and `Testing/engineGraph.ts:13-40` counts type-only imports, so importing it into `properties.ts` fails `engineGraph.test.ts:7-9` and the UIX allowlist at `:23-36`.
- **Estimate:** −10 to −25 · inferred. Rows relocate rather than delete; the deletions are `optionShapeFor`, `styleMenuLabel`, the `TYPE_META` shell, and two `=== 'multiSelect'` sites, against a `registersMembers` field and a `label` column.

###### 01-02 · The Legacy Type-Id Path and All of `migrateConfig.ts` Hold Shapes No Live Nexus Carries
- **Now:** `LEGACY_TYPE_IDS` and the `propertyType` preprocess (`properties.ts:78-88`, whose comment claims they "read forever"), `normalizePropertyTypes`/`renamedRegistry`/`respelled`/`field` (`migrateConfig.ts:30-38,57-74`), and the on-open calls (`Nexus/handlers.ts:44-45`). The saved-view `RENAMED` table (`migrateConfig.ts:20-23`: `card_banner: image`, `icon: table`), `renamedSidecar` reused by adoption's `stampFolder` (`Nexus/adopt.ts:28,109`), and `normalizeSavedViews` (`:47-55`) run `rmwJsonStrict` over every sidecar in `.trash` and `.nexus/archive` and every `_tiles.json` under the homepage and Contexts folders on every open (`migrateConfig.ts:48-54`). A grep of every `*.json` in NexusOS, including the 93 in `.trash` (NexusOS has no `.nexus/archive`), finds no `"type": "multi_select"|"url"|"datetime"`, no `"card_banner": "image"` (its three `card_banner` keys hold other values), and no `"icon": "table"`; `.trash` holds no property record. `field` is read only by `renamedRegistry` (`migrateConfig.ts:63,66`). Origin: F-221 (`31b2e8481`, 09-25, and `686ac2a08`).
- **Better:** Delete `migrateConfig.ts`, `migrateConfig.test.ts` (74), `normalizeSavedViews.test.ts` (148), the two handler calls and their import (`handlers.ts:26,44-45`), adoption's `renamedSidecar` branch (`adopt.ts:28,109-113`), `LEGACY_TYPE_IDS`, the preprocess, `properties.test.ts:44-47`, and the `PropertiesPM.md:8` clause. `propertyType` stays as the plain `typeIds` enum that `propertyDefinition` and `Bundles/rows.ts:91` read. The saved-view `RENAMED` half is Views residue removable under the same live-Nexus rule.
- **Behavior:** Unchanged for every live Nexus; the open-time `rmwJsonStrict` pass over the Trash, the Archive, and tile documents leaves.
- **Estimate:** about −90 production, about −315 with tests · read

###### 01-03 · Context and the Two Stamps Share the Stored-Definition Enum With the Column Taxonomy
- **Now:** `typeIds` (`properties.ts:10-23`) feeds both `propertyDefinition.type` (`:164`) and the column taxonomy.
  - (a) `normalizeRegistry` (`propertiesRegistry.ts:28-36`) admits a stored def with `type: "context" | "createdTime" | "lastEditedTime"`, since only `validateDefinition` at create refuses them (`schema.ts:65-66`). A Context def decodes to `NULL_VALUE` forever (`propertyValue.ts:142-143`), and a stamp def decodes front matter as a date while `valueClickIntent` makes it uneditable (`valueClick.ts:28`).
  - (b) Guards defend against that state at `SortFrame.tsx:92`, `propertyMenuActions.ts:69`, and `PropertyFrame.tsx:390-393` (`NO_SETTINGS` rows).
  - (c) `syntheticContextDef` (`Pickers/PropertyPicker.tsx:82-87`) fabricates a def with empty `label`/`key` so Context columns ride def-typed APIs, at six call sites in five files (`PropertyPanel.tsx:364,403`, `useViewHost.ts:212`, `propertyMenuActions.ts:72,96`, `FilterFrame.tsx:378`).
  - (d) Tests seed schemas with stamp-typed defs production never writes (`propertyMenuActions.test.ts:39`, `useColumnStyles.test.ts:90`, `sort.test.ts:51,56`, `propertyValue.test.ts:157,161`), and `schema.test.ts:81` pins the create-time refusal.
  - (e) `PropertiesPM.md:20-22` says Context and stamps are "never a schema definition" and "never persisted", yet the read path accepts both.
- **Better:** Context stays a property type [Intended as F-1]; Created Time and Last Modified Time leave for file-derived fields beside a page's Aliases and ID [Intended as F-2]; Title is a built-in field [Intended as F-3]. `propertyDefinition.type` and `propertyDraft.type` decode the nine user types plus Context, and a `ColumnType` adding the stamps and `'title'` is what `declaredType` returns and display tables key. `PROPERTY_TYPES` stays keyed by column type, since `specOf`, `pickKindOf` (`properties.ts:60-66`), `valueClickIntent` (`valueClick.ts:27-28`), and `fillsBlank` (`cardValueInput.ts:18-21`) still answer for stamp columns. A stored stamp type then fails decode and rides as `unadmitted`; the stamp halves of the guards at `schema.ts:65-66`, `SortFrame.tsx:92`, `propertyMenuActions.ts:69`, and the `NO_SETTINGS` rows leave, and the stamp-typed fixtures are rewritten. How a stored Context definition reads, and whether `syntheticContextDef` stays, are F-1's design (Approach B).
- **Behavior:** A hand-written def with a stamp type stops appearing as an uneditable property and stays in the file unread. No path in the app writes one and NexusOS holds none.
- **Estimate:** −10 to −30 (the stamp half) · inferred

###### 01-04 · Reserved-Column Facts Are Spread Over Eight Places
- **Now:** The facts for `_title`, `_created_at`, `_modified_at`, and `_location` live in `RESERVED_PROPERTY_ID` (`properties.ts:243-248`), `STAMP_TYPE` (`:250-253`), `RESERVED_LABEL` (`Cells/columnLabel.ts:4-8`), `TYPE_META.title/createdTime/lastEditedTime` (reading `RESERVED_LABEL` back, `PropertyTypes.tsx:22,33-34`), `TITLE_TARGET`/`LOCATION_TARGET` (label `'Location'` and icon `'folder'` hand-written, `:65-74`), `STAMP_TARGETS` (`:75-77`), VisibilityFrame's `rowGlyph` (`Views/Settings/VisibilityFrame.tsx:23-28`, falling back to `'context'` for any unknown id), and `declaredType` (`value.ts:19-21`). `'Title'` is spelled twice (`columnLabel.ts:5`, `PropertyTypes.tsx:22`).
- **Better:** One `RESERVED_COLUMNS` table keyed by reserved id carrying `{ type, label }` engine-side, with the icon on the renderer record by type; `RESERVED_LABEL`, `STAMP_TYPE`, the three target constants, and `rowGlyph` read it, and `isReservedPropertyId` reads its keys.
- **Estimate:** −20 · read

###### 01-05 / 01-15 · "Which Types Hold Connections" Is Stated Five Ways
- **Now:** `linkKeysOf` (`schema.ts:32-39`, Link + Text, plus keys the registry hasn't typed unless Pommora reserves them) sits in the validation file; `linkDefsOf` (`propertiesRegistry.ts:67-68`, Link only) sits in the registry reader; `restoreScrub.ts:148` hand-inlines `linkDefsOf`; `restoreProperty.ts:65` and `assignment.ts:93` test one definition's `def.type === 'link'`. The Link-only set ("a value that can name a gone page") and the Link + Text set ("front-matter connections") are both real, and neither is named as a type fact.
- **Better:** `restoreScrub.ts:148` calls `linkDefsOf`; `linkKeysOf` and `linkDefsOf` sit in one file; one spec field covers both sets (`connections: 'value'` on Link, `'prose'` on Text). Converting the two single-definition checks is optional.
- **Estimate:** −3 to −5 · read

###### 01-06 · Option-Chip Shape and Glyph Live in UIX and a Cell as String Comparisons, and the Select Glyph Disagrees With the Type Icon
- **Now:** `optionShapeFor(type: string)` (`UIX/Labels/recipes.tsx:10-13`) encodes the Core type id `'status'` in UIX and is called from `OptionChip.tsx:50`, `GhostOptionChip.tsx:51`, and `useOptionEdit.tsx:203`. `optionGlyph` (`Cells/OptionChip.tsx:21-30`) defaults Select to `'tag'` and Multi-Select to `'tags'`, while `TYPE_META.select.icon` is `'send'` (`PropertyTypes.tsx:27`). `PropertiesPM.md:76` says Compact renders "the option's own icon or the property type's default", false for Select. `STATUS_GROUP_GLYPH` (`OptionChip.tsx:15-19`) keys on the three seed group ids, so every user-made group gets `'circle-dashed'`.
- **Better:** Chip shape and default glyph become renderer-record fields (01-01) and `optionShapeFor` leaves UIX. Select chips keep `'tag'`, with `PropertiesPM.md:76` corrected [Intended as M-1]; user-made Status groups keep `'circle-dashed'` [Intended as M-2].
- **Estimate:** −8 · read

###### 01-08 · `Cells/PropertyTypes.tsx` Holds Pane Targets, and Neither Its Folder nor Its Name Fits
- **Now:** `PropertyTypes.tsx:59-97` (`PaneTarget`, `TITLE_TARGET`, `LOCATION_TARGET`, `STAMP_TARGETS`, `contextPaneTargets`, `schemaTargets`, `targetOption`) is the filter, sort, group, and preview target vocabulary, consumed by filterModel, SortFrame, GroupFrame, FilterFrame, PropertyPanel, and `Navigation/previewRules.ts`. Nothing in the file is a cell, and `Cells/columnLabel.ts` isn't a cell either.
- **Better:** The targets move to a Views-root `Views/paneTargets.ts` beside `filterModel.ts`: four of six consumers are Views modules, `PropertyPanel.tsx` already imports Views row types, and the module stays renderer-side because it reads the renderer record's icons, as a `.ts` of its own so a host-side per-kind table never inherits a renderer import. The renderer type record lives at the `Properties/` root, or under `Schema/` with its creator caller.
- **Estimate:** ±0 · read

###### 01-09 · Link Format Options Are Built Twice, and Label-to-Option Builders Are Built Three Ways
- **Now:** `Schema/linkFormatOptions.ts:5-8` builds `LINK_DISPLAYS.map(v => ({ value, label: LINK_DISPLAY_LABELS[v] }))`, which equals `lookOptions(LINK_DISPLAYS)` (`columnStyles.ts:33-35`, since `LOOK_LABELS` spreads `LINK_DISPLAY_LABELS`, `:28`). `DATE_FORMAT_OPTIONS` (`columnStyles.ts:48-51`) is the same map a third time. The Time and Weekday label tables have no `*_OPTIONS` twin, so `DateTimeEditor.tsx:12-16` and `Settings/frames.ts:174` assemble them separately, and `columnMenu.ts:84-86` maps them a fourth way into menu rows.
- **Better:** Delete `linkFormatOptions.ts` and use `lookOptions(LINK_DISPLAYS)`; one `pickerOptions(values, labels)` builds date, time, and weekday options. It lands in the renderer label module 08-07 creates, after the label tables move there: `columnStyles.ts` is in the engine graph, which forbids any `.tsx` and pins an exact UIX leaf list (`engineGraph.test.ts:23-37`), so `UIX/Pickers/PickerControl.tsx` can't hold it, and `labelled` is already taken at `properties.ts:115`.
- **Estimate:** −12 · read

###### 01-10 · Misplaced Helpers, Dead Exports, and One Stale Justification in the Catalog File
- **Now:** `itemCount` (`properties.ts:263`) is read by `Interface/Confirm/confirmations.ts` and `governedSweep.ts:60`, and by `KEY_REFUSAL.held` (`properties.ts:272-273`). `KEY_REFUSAL`/`RESERVED_NAME_PREFIX` (`:261-274`) belong to `schema.ts`, their main reader; `registryProperty.ts:154` also reads `KEY_REFUSAL.held` and already imports `schema.ts`. `defaultStatusSeed`/`defaultSelectSeed` (`:317-342`) belong to `registryProperty.ts`. `TypeSpec`, `NUMBER_FAMILIES`, and `NumberPart` (`formatValue.ts:194`) have no outside reader; `numberDivisor` and `StoredColumnStyle` are exported for tests only. The `optionsOf` comment (`properties.ts:286`) and its test (`properties.test.ts:267`) justify keying on the declared type by "a type change", but no type-change operation exists (`bridge.ts:145-186`; no `setType` anywhere).
- **Better:** Move each to its reader, keeping `itemCount` engine-side; unexport the five; rewrite the comment and test title as "keyed on the declared type, so a stale array a hand edit leaves is ignored", or drop the comment.
- **Estimate:** −5 · read

###### 01-11 · `'title'` Is Threaded as a Type by 21 Hand-Spelled Unions
- **Now:** `PropertyType | 'title'` appears 21 times across 11 production files (cellMenu 2, PropertyTypes 3, valueClick 1, columnStyles 1, parseEditorValue 1, properties 3, value 2, cardValueInput 1, useViewHost 1, useColumns 3, reassign 3). `specOf` returns `undefined` for it (`properties.ts:52-53`), so callers special-case it first: `cellMenu.ts:61`, `filter.ts:83`, `SortFrame.tsx:53`, `useColumns.ts:313`, `VisibilityFrame.tsx:26`, and `filterModel.ts:127` by id.
- **Better:** A named `ColumnType` (01-03) replaces the 21 unions. Title then either gets a spec row (kind `text`) so `specOf` answers and the pre-checks leave, or stops being a type and every site keys on the reserved id; the first removes more branches and pairs with 02-15.
- **Estimate:** −15 to −30 · read (count), inferred (branches)

###### 01-12 · Date-Following Uses Two Mechanisms: Absence for Date, the `'shown'` Sentinel for Time
- **Now:** `columnStyle.time_format` accepts the extra stored word `'shown'` (`columnStyles.ts:80-83`), resolved to the Nexus clock (`:118`) and written by `storedPick` (`:130`). Date format follows the Nexus by being absent. Time can't, because `resolveStyle`'s defaults come from `columnDefaults` (`Views/Host/useColumnStyles.ts:23-33`), which spreads `dateDefaults(nexus.dateFormat)` with `time_format: 'none'` (`columnStyles.ts:100-104`), so `'shown'` means "show the time, following the Nexus clock", a state the defaults can't express. Origin: `dc7780ca7` (F-584, 09-25). NexusOS holds no `"time_format": "shown"`.
- **Better:** Dates stay per view, following the Nexus's Date Format and Time Format until a view picks its own, and an unstyled date column keeps showing no time [Intended as I-2], so `'shown'` keeps its job as the one way a column follows the Nexus clock. Removing it alone would flip the default, so every unstyled date column whose values carry a time would start showing it; there's no shape-only variant.
- **Estimate:** ±0 · read

###### 01-13 · `showsWeekday` Is Restated Inline in the Formatter
- **Now:** `columnStyles.ts:72-73` `showsWeekday` is short or full; `formatValue.ts:129` re-spells `(dateFormat === 'short' || dateFormat === 'full')`.
- **Better:** `formatPoint` calls `showsWeekday`.
- **Estimate:** ±0 · read

###### 01-14 · `formatBucketLabel` Is Views Grouping Code Living in Properties
- **Now:** `formatValue.ts:154-184` imports `DateGranularity`/`DateSeparator` from `Views/views` (`:4`). `formatBucketLabel`'s only caller is `Views/Bands/bandModel.ts`, with its own test file `formatBucketLabel.test.ts`; `NUMERIC_FORMATS` is read by `formatBucketLabel` and `GroupFrame.tsx:52,210`.
- **Better:** `formatBucketLabel` moves to `Views/Pipeline/group.ts` beside its inverse `dateBucketKey` (`group.ts:152`), with its test, keeping a bucket's key and label together (`bandModel.ts` holds no bucket keys). `NUMERIC_FORMATS` stays in `formatValue.ts` as date-form vocabulary, so `GroupFrame.tsx` doesn't import a bucket module for a date-form fact. This removes `formatValue.ts`'s Views import; Properties keeps five others (`assignValue.ts:6`, `pageRow.ts:6`, `removeProperty.ts:14`, `value.ts:3`, `valueContext.ts:6`; 07-15).
- **Estimate:** ±0 · read

##### Behavior Ledger

| Behavior | Where | Origin | Classification |
|---|---|---|---|
| A registry read hides every later def (by sorted id) whose label or key folds equal to an earlier one's; the hidden def stays in the file as `unadmitted` and nothing tells the user. Under Sync's per-definition merge, two devices each creating "Priority" mint different ids and the later by sort stays invisible. | `propertiesRegistry.ts:28-36,101,112-116` | `9c2850b3b` (10-04 fix), `85e8a9f89`/`585a6bef9` (MetadataV3 Task 5A-2 and its review, 10-18) | Agent's choice, a review-round rule; the Sync consequence is INFERRED and a Sync rebuild input [Intended as H-1] |
| Context and stamp types are accepted on stored defs and show as dead or uneditable properties | `properties.ts:19-21` → `propertiesRegistry.ts:30-33` | F-219 put them in one record (`ee86c919b`) | Accident (01-03) |
| Checkbox doesn't group; sort-run reassign and filter seeding still handle checkbox | `properties.ts:37` (no `groups`), `group.ts:181`, `reassign.ts:8` | `ee86c919b` "Checkbox stops grouping" (F-219 Phase 1, 09-26) | Nathan's intent [Intended as P-3] |
| Context sort ranks nothing | `sort.ts:106-108` | `ee86c919b` | Nathan's intent [Intended as P-3] |
| Status options can't be created inline from the value picker; Select and Multi-Select can | `PropertyPicker.tsx:312` (`creates = options === 'select'`) | `033a3d86d` era | Agent's choice (a Status option needs a group) [Intended as J-8] |
| Link format is set on the property and can be overridden per view column (`link_display` vs `column_styles.look`) | `properties.ts:172`, `columnStyles.ts:143-145`, `LinkCell.tsx:39` | PropertiesPM.md Link section | Nathan's intent: the format on the property as the default, the column's look as the per-view override [Intended as I-2] |
| Select compact chip default glyph is `tag`, unlike the Select type icon `send` | `OptionChip.tsx:26`, `PropertyTypes.tsx:27` | Predates `0cdb92cd2` (monorepo move) | Nathan's intent; `PropertiesPM.md:76` is corrected [Intended as M-1] |
| User-made Status groups always show `circle-dashed` in Compact | `OptionChip.tsx:15-19,29` | Per-option editor era | Nathan's intent [Intended as M-2] |
| Status seeds use ids `upcoming`/`in_progress`/`done` under labels Open/Active/Done | `properties.ts:317-338` | Pre-monorepo | Agent's choice, harmless |
| Time format follows the Nexus only through a stored `'shown'` word, and an unstyled date column hides its time | `columnStyles.ts:81,100-104,118,130` | `dc7780ca7` F-584 | Unstyled hiding its time is Nathan's intent [Intended as I-2] (01-12) |
| A Number format can be written onto any property type through its channel | `handlers.ts:182-187`, `registryProperty.ts:235` | — | Accident; no UI path does it (03-07) |
| Every open walks the Trash, the Archive, and every tile document to respell view keys no Nexus holds (74 lines plus the walk) | `migrateConfig.ts:47-55`, `Nexus/handlers.ts:44` | F-221 and the view-icon rename | Residue (01-02) |

##### Approaches

###### A · One Type Record per Side of the Boundary
Fold `TYPE_META`, `optionShapeFor`, the `optionGlyph` defaults, `styleMenuLabel`, and the data of the six per-kind Views tables (`KIND_OPS`, `evaluatorOf`, `FROM_GROUP_KEY`, `SEEDS_FROM_SORT`, sort direction, `defaultStyleFor`) into two records: the engine record carries kind, origin, groups, options, label, connections, `registersMembers`, filter ops, sort shape, reassign, and seeds; the renderer record carries icon, shape, glyph, style label, and editor.
- **Removes:** a few tables' declaration shells and about ten ad hoc comparisons; adding a type becomes two rows plus its decode, encode, cell, and editor.
- **Costs:** wide records; Views logic referenced from Properties inverts today's direction unless the engine record holds only data (op lists, flags) and Views keeps the functions. Table widths stay in Views. Rows relocate, so the line delta is small.
- **Risk:** over-centralizing; facts go in rows and functions stay where they run. Overlaps 07's per-kind view record, which owns the Views half.

###### B · The Stamps Leave the Definition Type
The definition decoder takes the nine user types plus Context [Intended as F-1], the timestamps become file-derived fields [Intended as F-2], and `ColumnType` adds the stamps and title (01-03, 01-11) [Intended as F-3]; `PROPERTY_TYPES` stays keyed by column type.
- **Removes:** the stamp halves of the origin guards, the stamp `NO_SETTINGS` rows, the create-time stamp refusal, and stamp-typed fixtures; `PropertiesPM.md:20-22` is rewritten to say Context is a property type and the stamps are file-derived. The `case 'context': return NULL_VALUE` decode arm (`propertyValue.ts:142-143`) leaves only if `decodeValue` switches on a definition-side kind; while it switches on the column-keyed `kind`, the arm stays for exhaustiveness.
- **Costs:** if Context columns stop riding a fabricated def, every def-typed picker API (PropertyPicker, massAssign, propertyMenuActions, FilterFrame) widens to column plus def, touching 05 and 06 surfaces; whether `syntheticContextDef` stays is F-1's design.
- **Risk:** moderate; Context's value path already runs separately (`assignValue.ts:44-53,67`, `value.ts:36,46-47`).

###### C · Delete the Migration Layer Outright
01-02 alone, as a first independent landing.
- **Removes:** `migrateConfig.ts`, `LEGACY_TYPE_IDS`, the preprocess, the on-open calls, the adoption branch, both test files, and the doc sentence: about 315 lines with tests (about 90 production), plus an open-time walk.
- **Costs:** none for live Nexuses.
- **Risk:** a Nexus outside the three named ones would read a legacy type id as an invalid def, kept unadmitted rather than lost, which the settled scope accepts.

##### Cross-Domain Notes

- **Schema Mutations:** `schema:add` accepts a renderer-sent `id` (PropertyFrame sends `''` at `PropertyFrame.tsx:236`; `createProperty` mints on falsy, `registryProperty.ts:83`). Only Restore needs a supplied id, so the channel could drop it, and the `isReservedPropertyId` and duplicate-id checks in `validateDefinition` (`schema.ts:64,67`) would then guard only the restore path.
- **Sync:** `mutateRegistry`'s `rebuiltOptions` (`propertiesRegistry.ts:72-82`) writes `select_options`/`status_groups` whole, the known option-list merge loss.
- **Value Surfaces:** five PickTarget builders decide "which editor does this type open" (`PropertyPanel.tsx:367`, `useViewHost.ts:211`, `CardsView.tsx:528`, `propertyMenuActions.ts:36-113`, `ValuePickPresenter.tsx:19`) beside `valueClickIntent`, which claims to be the one home (`valueClick.ts:1`). `groupOptions` re-applies group color inheritance on `optionGroupsOf` output (`PropertyPicker.tsx:66`, `OptionEditor.tsx:30,98`) while `optionsOf` already applies it for flat readers, two representations of one option's color (INFERRED). `cardValueInput.ts:35` re-tests `type === 'checkbox'` with a `schema.find` per column per row; it isn't `fillsBlank`'s rule (`:18-21`), which also excludes stamps, so it belongs to 06-14.
- **Views:** `bucketKey`'s checkbox case (`group.ts:181`) is reachable only through sort-run reassign (`useViewHost.ts:203`), not grouping, and its comment should say so.

---

#### Scout 02 — Values: Read, Encode, Write

How a value is decoded, encoded, and landed in a file, read at `d0595b22d`. One read-only probe ran against the repo's `yaml` dependency (02-02), re-run by the reconciler with the same result.

##### Inventory

| File / Symbol | Lines | Responsibility | Callers Outside the File | Belongs Here? |
|---|---|---|---|---|
| `Core/Properties/propertyValue.ts` | 326 | The value union plus nine other jobs, below | ~60 files | Split (02-04) |
| · `propertyValue` (zod), `PropertyValue`, `ValueKind`, `NULL_VALUE` | 20-40 | The in-memory value union and the door's validator | `Nexus/mutateRequest.ts:60,90`, many | Yes |
| · `decodeValue` | 104-145 | File raw → `PropertyValue` by the definition's kind | `value.ts:57`, tests; inside: `reconcilePropertyValue` | Yes |
| · `encodeValue` / `valueToWrite` | 247-281 | `PropertyValue` → raw; `valueToWrite` wraps it in a `Result` for blank and a refusal | `contextResolve.ts:113`, `assignment.ts:58` / `Nexus/page.ts:28`, `setProperty.ts:43`, `Testing/propertyWrites.ts` | Yes, minus the dead refusal (02-01) |
| · `wordsOf`, `findOption`, `registeredOption`, `keyOf` | 49-81 | Per-definition option label↔key cache | `findOption`: Cells, optionOps, bandModel, GroupFrame, OptionOrderList | Yes |
| · `CHECKBOX_WORDS`, `checkboxWord`, `checkedSpelling` | 83-102, 221-229 | Checkbox word vocabulary and its spelling on write | `checkboxWord`: `Views/reassign.ts:8`, `Views/Pipeline/filter.ts`, `Views/Settings/FilterFrame.tsx` | Yes (type fact) |
| · `unregisteredMembers` | 147-162 | Multi-Select adoption predicate | `optionOps.ts` | No → `optionOps.ts` |
| · `keepingForeignWords` | 164-179 | Multi-Select write keeps unclaimed words | `governedWrite.ts:15`, internal `applyValueAtRoot` | Encode-side (02-05) |
| · `Frozen`, `frozenWorld`, `gonePageEntry`, `reconcilePropertyValue` | 181-219 | Trash and Archive restore check that a Link's page is gone | `Trash/restoreProperty.ts`, `Trash/restoreScrub.ts`, `Trash/spend.ts`, `Nexus/cascade.ts:117`, `assignment.ts`, `contextResolve.ts:112` | No → restore side (02-04) |
| · `writtenSpelling` | 231-245 | Re-spells a raw value the way the file already spells it | `contextResolve.ts:128`, `assignment.ts:61`, `governedWrite.ts:16` | With the reconcile (02-04) |
| · `isBlankRaw`, `isBlankValue`, `selectedValues` | 283-312 | Blank predicates, option-list projection | many | Yes |
| · `applyValueAtRoot` | 314-326 | The renderer's copy of a host value write | `assignValue.ts:56`, `Views/Host/useViewCreation.ts:54` | Renderer twin of `writtenRoot` (02-05) |
| `Core/Properties/value.ts` | 66 | `declaredType`/`columnType`, `resolveFieldValue` (memoized per-row decode), `fileName` | ~15 files | Misnamed; `fileName` → `linkValue.ts` (02-08) |
| `Core/Properties/pageValue.ts` | 45 | Raw member-list edits (`namesValue`, `stripList`, `editList`) plus `valueEditRewrite` | `contextCascade.ts`, `contextWrite.ts`, `configReach.ts`, `restoreScrub.ts`, `optionOps.ts`, `propertyValue.ts` | No → `Files/rootValues.ts`; `valueEditRewrite` → `optionOps.ts` (02-08) |
| `Core/Properties/pageRow.ts` | 67 | Builds `ViewRow` for a page or Space; `fetchPageValues`/`fetchPageRow` reads | PropertyPanel, entityMenuActions, matrixInput, useContainerValues, PageReaderWindow | Mostly; name collides (02-08) |
| `Core/Properties/assignValue.ts` | 120 | Renderer write pipeline: optimistic patch, mutate, undo capture and revert, alias remember | `useViewHost.ts:187`, `PropertyPanel.tsx:205`, `entityMenuActions.ts:95` | Yes |
| `Core/Properties/setProperty.ts` | 83 | Host ops `setPagePropertyOp`/`setSpacePropertyOp`; `landPageValue`/`landSpaceValue` | `Nexus/mutate.ts:201-202`; `land*` only `Testing/propertyWrites.ts` and `Files/writePathRace.test.ts` | Yes; `land*` exports are test-only |
| `Core/Properties/governedWrite.ts` | 36 | `writtenRoot` (reconcile plus land one key), `setGovernedRootKey` (single-file read, merge, write) | `contextWrite.ts:70` and two `writtenRoot` calls in `setSpaceContext`, `setProperty.ts:22,34`, `Pages/setBanner.ts:29` | Yes, with 02-06 |
| `Core/Properties/propertyWrite.ts` | 30 | Schema-write round trip: replay, owed retry, refusal toast | `Schema/PropertyFrame.tsx:15`, `Schema/useOptionEdit.tsx:16` | No: schema writes (03, 04) |
| `Core/Properties/valueContext.ts` | 29 | Cell render context (`ValueContext`), `holderOf`, `buildValueContext` (a one-line repack, 02-12) | Cells, Cards, Table, PropertyPanel, useViewHost | No: render context (06) |
| `Core/Properties/valueOverride.ts` | 57 | Optimistic-override map with a global settle counter | PropertyPanel, useViewHost, useViewCreation, useContainerValues | Yes |
| `Core/Properties/parseEditorValue.ts` | 44 | Text field → `PropertyValue` for number, link, text; `editorText` | `Pickers/PropertyValueInput.tsx`, `cardValueInput.test.ts` | Type facts outside the type record |
| `Core/Contexts/contextResolve.ts` | 132 | `contextWorldOf`, `resolveContextKeys`; also `GovernedWorld`, `governedWorld`, `spaceWorldOf`, `reconcileGovernedRoot` | readNexus, pageRow, governedWrite, repairSweep, restoreScrub, contextWrite, setProperty | The governed-root half doesn't belong here (02-03) |
| `Core/Contexts/contextWrite.ts` | 204 | Context tag writes (`contextTarget`, `setPageContext`, `setSpaceContext`, `setContextOp`), `pageWorldOf`, `writeSpaceSidecar`, structural Context/Space creates, color and order writes | create.ts, setProperty.ts, mutate.ts | `pageWorldOf` belongs beside `governedWorld` |
| `Core/Contexts/spaceSidecar.ts` | 89 | Space sidecar keys, discovery, `spaceNodeFrom` (pulls `values`), `withoutOrderId` | readNexus, sweeps, contextWrite | Yes |
| `Core/Nexus/page.ts` | 88 | `createPage` (encodes seeds via `valueToWrite`), rename, move, body | create.ts | Yes |
| `Core/Nexus/containerFields.ts` | 74 | Container sidecar → node, including `resolveAssignedSchema`, `cachedIds` | readNexus, fileEvents | Third parser of `properties` (02-11) |
| `Core/Connections/linkValue.ts` | 285 | Link reading, resolving, writing: `linkEntry` (unwraps unquoted `[[x]]`), `linkValueFromEdit`, `shownAlias` | many | Yes |
| `Core/Views/reassign.ts` | 44 | Group key → `PropertyValue` for a drag reassign (`FROM_GROUP_KEY`) | useViewHost, useViewCreation, creationSeeds | Per-kind table outside the type record |
| `Core/Views/Host/useContainerValues.ts` | 103 | Renderer value store per container: load, epoch refetch, overrides, rename re-key | useViewHost, PropertyPanel, GroupFrame | Yes |
| `Core/Testing/pageValues.ts` | 29 | Fixtures `propsAtRoot`, `pageValues`, `valuesReply` | tests | Yes; third file of the name (02-08) |
| `Core/Testing/propertyWrites.ts` | 23 | `writePageValue`/`writeSpaceValue` test seeders | 63 hits in 9 test files | The page seeder takes a path production never takes (02-07) |
| `Core/Views/pageValues.ts` (adjacent) | 17 | `pageValuesOf`: host-side `PageValues` builder (zod `pageFrontmatter.parse`) | loadValues, matrixGraph, previewRules, useViewCreation | Name collision (02-08) |

##### Write Paths

Every route a value change takes to bytes on disk. The bottom-layer writers are `mergeFrontmatter` + `atomicWriteFile`, `SweptPage.merge` + `rewritePreservingTimes`, `rmwJsonStrict` → `writeJson`, and the sweep's own `jsonText` + `atomicWriteFile` for sidecars.

1. **Surface Edit (panel, picker, cell, card, menu, group drag, sort-run reassign):** surface → `commitValue`/`commit` → `assignValue` (`assignValue.ts:87`) → `write` → `applyValueAtRoot` (renderer patch, `propertyValue.ts:315`) + `mutate({op:'setProperty'})` → zod door (`mutateRequest.ts:90`) → `mutate.ts:198` → `setPagePropertyOp` (`setProperty.ts:61`): `mutableTarget` → `machine().lock(file)` → `readRegistry` (disk) → `valueToWrite` → `pageWorldOf` (`contextWrite.ts:75`: `liveTreeOf` + `assignedDefs`, evaluated as `landPageValue`'s argument at `setProperty.ts:78`) → `landPageValue` (`pathExists`) → `setGovernedRootKey` (`governedWrite.ts:19`): `readTextOrNull` → `splitFrontmatter` (parse 1) → `writtenRoot` (reconcile every other governed key, `keepingForeignWords`, `writtenSpelling`) → `changedKeys` → `mergeFrontmatter` (parse 2) → `atomicWriteFile`.
2. **Same Edit on a Space:** `setSpacePropertyOp` (`setProperty.ts:49`) under `underContexts` reads `readRegistry` before any file lock (`:55`), then `landSpaceValue` → `liveTreeOf` → `spaceWorldOf` (whole registry) → `writeSpaceSidecar` → `rmwJsonStrict` (file lock, `atomicWrite.ts:141-147`) → a short-circuit for clearing an absent key (`setProperty.ts:34`) → `writtenRoot` → `writeJson`.
3. **Undo of an Edit:** `assignValue`'s `revert` → `restore` (`assignValue.ts:60`) → renderer patch `landValue(fm, key, held)` (`:70`, without `keepingForeignWords`, unlike path 1) + `mutate({op:'restoreValue', held})` → the ops of paths 1 and 2, with `requestedValue` returning `held` unencoded (`setProperty.ts:44-45`); `held` still passes through `writtenRoot`'s `keepingForeignWords` and `writtenSpelling`. Context columns don't use `held`: they re-send `setContext` with the decoded prior ids (`assignValue.ts:67`).
4. **Mass Assign:** `MassPropertyPicker` → `massPickCommits` → `TableView.tsx:368-370` `groupUndo(() => { for (…) commitValue(…) })`: N independent path-1 round trips, each with its own registry read, `pageWorldOf`, lock, and write.
5. **Context Tag Pick:** `assignValue` → `{op:'setContext'}` → `setContextOp` (`contextWrite.ts:124`). A page runs `setPageContext` (lock, `pathExists`, `pageWorldOf`, `contextTarget`, `setGovernedRootKey`), replacing the whole list; a Space runs `setSpaceContext`, with N far-sidecar `rmwJsonStrict` + `writtenRoot` edits, then its own.
6. **Create With Seeds:** `useViewCreation` (`withSeeds` → `applyValueAtRoot`) → `createPageOp` (`create.ts:21`) → `createPage` (`page.ts:13`): `valueToWrite` per seed → `mergeFrontmatter('', …)` → `atomicWriteFile`, with no world, reconcile, or spelling; then a second write per Context seed via `setPageContext` (`create.ts:48-49`), whose `contextTarget` already ran at `create.ts:30-33`.
7. **Refill (re-assign stash restore, property restore from the Trash, Restore Links On Deletion):** `refillValues` (`assignment.ts:49`) → `sweepRootsById` → `sweepGovernedRoots` (`governedSweep.ts:88`): per-file `guarded` lock → `sweepParse` (one parse) → `rewriteRaw` → `SweptPage.merge` → `rewritePreservingTimes`. The rewrite hand-rolls decode → gone-check → blank → encode → `writtenSpelling` (`assignment.ts:57-61`).
8. **Repair on Open:** `runRepairSweep` (`repairSweep.ts:17`) → `sweepGovernedRoots({raw: reconcileGovernedRoot})`.
9. **Trash and Archive Restore Scrub:** `scrubReturning` (`restoreScrub.ts:136`) → `sweepGovernedRoots({text})` with `reconcileGovernedRoot(raw, world, frozen)`, then `mergeFrontmatter` again inside the text rewrite; sidecars go through `rmwJsonStrict` with `reconcileGovernedRoot(…, {}, …)` (`:186`).
10. **Rename, Format, and Option Sweeps:** `valueEditRewrite` (`pageValue.ts:42`) and the rename and delete plans → `sweepGovernedRoots` (03 and 04 own the plans).
11. **Banner (not a property):** `Pages/setBanner.ts:29` → `setGovernedRootKey(abs, 'banner', v)` with no world, so through `landValue` only, after its own `readTextOrNull` existence check (`setBanner.ts:25`).
12. **Tests:** `writePageValue` (`Testing/propertyWrites.ts:6-13`) → `valueToWrite` → `landPageValue(file, key, v)` with no world and no lock; `writeSpaceValue` (`:15-23`) → `landSpaceValue`, which builds `spaceWorldOf` and takes the sidecar lock, skipping only `mutableTarget`, the definition lookup, and `underContexts` (02-07).

**Where They Diverge:**
- **World or No World (1, 2, 5 vs 6, 11, 12):** required only for the banner, which isn't a property. Create-with-seeds goes to a fresh file, so reconcile has nothing to repair, but it makes a second encoder. Tests don't need it.
- **Lock Inside the Op or Inside the Writer (1 vs 2):** the page path resolves the definition inside the page lock on purpose (`setProperty.ts:67`); the Space path doesn't (02-09).
- **Two Single-File Front-Matter Writers:** `setGovernedRootKey` parses twice and splits the envelope three times (`governedWrite.ts:25-34`); `SweptPage` parses once (`pageFile.ts:254-260`). The mtime choice (`atomicWriteFile` vs `rewritePreservingTimes`) is required and stays a parameter.
- **Renderer Encode vs Host Encode:** `applyValueAtRoot` matches `valueToWrite` + `keepingForeignWords` but not `writtenSpelling` or the sibling reconcile, and the restore patch drops even `keepingForeignWords`; display decodes identically, so it isn't visible, but it's a second implementation (02-05).
- **Context Arm vs Property Arm of Undo (3):** the unfixed half of I-063 (02-02).

**Read Path:** `view:loadValues` → `loadValues` (`Views/loadValues.ts:18`) → `readPageRecord` (cached parse, `readNexus.ts:134`) → `pageValuesOf` (zod `pageFrontmatter.parse`) → renderer `useContainerValues` → `resolveFieldValue`, decoding lazily per row and definition with a WeakMap memo (`value.ts:50-64`). The Properties panel seeds from `readPageDetail`/`fetchPageDetail` (raw `splitFrontmatter`, no `pageFrontmatter.parse`) and swaps to the `loadValues` shape on the first epoch (`PropertyPanel.tsx:115-142`), two renderer sources of one page's front matter (INFERRED harmless: `pageFrontmatter` only coerces `ID` and `banner`). Spaces read from the tree's `node.values` (`spaceSidecar.ts:65-70`). No decoder or loader writes, and the WeakMap memos (`wordsOf`, `resolvedByFm`, `contextWorldOf`) are caches; the two read-triggered writes run as separate, explicit writes: the on-open repair sweep (gated by `repairOnOpen`, default off at `Settings/personalization.ts:146`) and Multi-Select adoption on file arrival (03).

##### Findings

###### 02-01 · The Value Encoder's Refusal Guards a State the Door Already Makes Impossible
- **Now:** `encodeValue`'s `default` arm returns `undefined` for a value carrying a kind outside the union (`propertyValue.ts:263-268`), so `valueToWrite` returns `fail('invalid-property', …has no shape for.)` (`:272-281`), and every caller unwraps it: `page.ts:28-29`, `setProperty.ts:40-47,58,73-80`, `applyValueAtRoot`'s `written.ok ?` (`:324`), `Testing/propertyWrites.ts:11-12,21-22`. The guard came in `0733fded9` (09-06); since `5f8d7e680` (09-25) every `setProperty`/`createPage` value is zod-validated at the door (`mutateRequest.ts:60,90`), and TS proves the switch exhaustive through `const _exhaustive: never = value` (`:265`). The only test reaching it casts a removed `'status'` kind past the door through the no-world seeder (`Nexus/page.test.ts:279-293`). A valid kind against the wrong definition type goes unguarded, since `encodeValue` switches on `value.kind`; no path produces that, as no type-change op exists.
- **Better:** `valueToWrite` returns `unknown` (`undefined` meaning the key drops); the `Result` plumbing, the `invalid-property` message, and the cast test go. The `never` check stays, so a future kind can't fall through silently. A kind/type mismatch, if worth refusing, belongs once at the door.
- **Estimate:** −20 to −25, and −15 tests · read

###### 02-02 · I-063 Is Half-Fixed: Context Undo Still Reverts the Decoded Value, and a Bare Key Comes Back as `null`
- **Now:** The property arm captures raw `held` (`assignValue.ts:98-99`) and reverts it through `restoreValue`. The context arm re-sends `setContext` with `prior`, the decoded Space ids (`assignValue.ts:67`, `prior` from `resolveFieldValue` at `:96`), so a tag key naming a Space Pommora can't resolve decodes to no ids, undo writes `[]`, and the key is deleted, unresolved titles included; the forward pick already drops them, since `setPageContext` replaces the list (`contextWrite.ts:42-56,70`; the comment at `:134` says so). A bare `Status:` parses to `null`, so `held = null` → `restoreValue` (`z.unknown()` admits null, `mutateRequest.ts:92`) → `writtenRoot` → `landValue` keeps `null` (`rootValues.ts:6-11`) → `mergeInto`'s `written = modeled[key] !== undefined` (`pageFile.ts:172`) → `createNode(null)` writes `Status: null`; a read-only `yaml` probe shows `doc.set('Status', createNode(null))` prints `Status: null` while an untouched `Status:` re-serializes as `Status:`. IssuesPM `[^63]` (`IssuesPM.md:1344`) cites `valueToWrite` at `Core/Nexus/page.ts:90-99` (now `propertyValue.ts:272`, since `f19cb9d1b`), `mutate.ts:185` (now `:198-202`), and `isBlankRaw` at `propertyValue.ts:224` (now `:284`).
- **Better:** Undo puts back what the file held, recorded by the writer, for the edited property only [Intended as E-1, E-2]: the host returns the landed before and after for the touched key, and undo puts that key back the way `undoSweep`/`keysPutBack` do (`governedSweep.ts:151-182`), removing `held` capture, the `restoreValue` op, `requestedValue`'s switch, and the renderer's `restore` patch, and giving the context arm the same put-back. `keysPutBack` re-lands parsed `was[k]` (`:169`), so it lands the parsed `before` document's nodes instead, which keeps a bare key bare with no `nodeSpelledAs` change (a `yaml` probe: `now.set('Status', before.get('Status', true))` prints `Status:`). `[^63]` is rewritten in the same pass.
- **Behavior:** Undo over unresolved tags keeps them; undo over a bare key leaves it bare.
- **Estimate:** about −30 / +28 · read (null spelling probed)

###### 02-03 · The Governed-Root Pipeline Is Owned by the Contexts File, in Four Pieces Across Three Files
- **Now:** `GovernedWorld`/`governedWorld`/`spaceWorldOf`/`reconcileGovernedRoot` sit in `Contexts/contextResolve.ts:42-132`, which imports the property codec (`:4-11`); `pageWorldOf` and `writeSpaceSidecar` sit in `Contexts/contextWrite.ts:75-79,81`; `writtenRoot`/`setGovernedRootKey` sit in `Properties/governedWrite.ts`. The dependency runs Properties → Contexts → Properties (`governedWrite.ts:3` → `contextResolve.ts:5-11`), and `contextResolve.ts` is otherwise about Context titles.
- **Better:** One `Nexus/governedRoot.ts` holds `GovernedWorld`, the three world builders, `reconcileGovernedRoot`, `writtenRoot`, and 02-06's single-file writer; `contextResolve.ts` keeps `contextWorldOf`/`resolveContextKeys`/`groupOf`. `Core/Files` is ruled out by the module's imports (02 A-01); Nexus over Properties is a layering judgment, since the module composes the property codec and the Context world, is called from Properties, Contexts, Pages, and the Trash, and Nexus already hosts such composers (`cascade.ts`, `liveTree.ts`).
- **Estimate:** ±0 (moves); `governedWrite.ts` goes · read

###### 02-04 · `propertyValue.ts` Does Ten Jobs
- **Now:** Besides the union and codec, the file holds the option-word cache, checkbox vocabulary and spelling, `unregisteredMembers` (only `optionOps` uses it), `keepingForeignWords`, the Trash oracle `Frozen`/`frozenWorld`/`gonePageEntry` (callers: Trash ×3, `cascade.ts:117`, which builds its own inline `{ holds }`, and `assignment.ts`), `reconcilePropertyValue` (a four-line wrapper, `:211-219`), `writtenSpelling`, blank predicates, and `applyValueAtRoot`. Decode → gone → blank → encode → `writtenSpelling` is hand-rolled twice (`contextResolve.ts:112-128`, `assignment.ts:57-61`). `Frozen` is two things: `{}` is a mode flag meaning "may shrink or blank" (`restoreScrub.ts:186`, `contextResolve.ts:120`, tests), and `{holds}` is a page-existence oracle. The comment at `:29` ("Kept while the Status tag goes") is stale.
- **Better:** `propertyValue.ts` keeps the union, decode, encode, option words, checkbox reading, and blank predicates. One `reencode(def, raw, frozen?)` replaces `reconcilePropertyValue` and both hand-rolled copies and lives in the governed-root module with `writtenSpelling`/`checkedSpelling`; `Frozen`/`frozenWorld`/`gonePageEntry` move to the restore side; the reconcile's mode becomes explicit (`mode: 'live' | 'restore'` plus an optional oracle); `unregisteredMembers` moves to `optionOps.ts`; the `:29` comment goes.
- **Estimate:** −10 to −15 · read

###### 02-05 · The Renderer Re-Implements the Host's Value Encode, and the Restore Patch Differs From Both
- **Now:** The host lands `valueToWrite` → `keepingForeignWords` → `writtenSpelling` after a sibling reconcile (`governedWrite.ts:12-17`), applying `keepingForeignWords` even to a `restoreValue` `held` that already carries its words. The renderer runs `applyValueAtRoot` (`propertyValue.ts:315-326`) for edits and creation seeds (`useViewCreation.ts:54`), but bare `landValue(fm, key, held)` for undo (`assignValue.ts:70`). `held` for a second edit before the epoch read is captured from the renderer copy (`assignValue.ts:95,99`), not the file's spelling. Context-key writes and restores pass through a no-op lookup (`world.defs.get(key)`, `governedWrite.ts:14`).
- **Better:** One pure `valueAtRoot(def, value, heldRaw)` = `keepingForeignWords(def, valueToWrite(def, value), heldRaw)`, called by the renderer and by the host's `setProperty` arm inside the file rewrite (where `heldRaw` is the file's raw read under the lock, `governedWrite.ts:25-27`), which needs 02-06's `rewriteRootAt(file, raw => …)`. `writtenRoot` then drops its definition lookup and becomes "reconcile siblings and land with spelling" for properties, contexts, and restores. Approach C is the larger alternative.
- **Behavior:** An undo no longer picks up a foreign word added outside the app between the edit and the undo.
- **Estimate:** −5 · read

###### 02-06 · Two Single-File Front-Matter Writers; One Parses Twice, and the Banner Borrows the Property Writer
- **Now:** `setGovernedRootKey` runs `readTextOrNull` → `splitFrontmatter` → `mergeFrontmatter` (parse again) → `splitEnvelope(existing).body` (a third split) (`governedWrite.ts:25-34`), while `sweepParse` parses once with `merge` (`pageFile.ts:254-260`) and `rewriteRaw` (`governedSweep.ts:77-85`) is the same changed-keys-then-merge logic. Its optional `world` makes it two functions: without one it serves only `Pages/setBanner.ts:29`, the test seeder, and `governedWrite.test.ts`. "Page not found" is decided twice per write: `landPageValue`'s `pathExists` (`setProperty.ts:21`), `setPageContext`'s (`contextWrite.ts:65`), or the banner's `readTextOrNull` (`setBanner.ts:25`), each followed by `setGovernedRootKey`'s throw on a `null` read (`governedWrite.ts:26`).
- **Better:** One `rewriteRootAt(file, rewrite, preserveTimes)` built on `sweepParse` + `rewriteRaw` answers `not-found` itself; `setGovernedRootKey` becomes `rewriteRootAt(file, raw => writtenRoot(raw, key, value, world))` with a required world; the banner passes `raw => landValue(raw, 'banner', v)`; `sweepGovernedRoots`' per-file body reuses it; `landPageValue` folds into its op and callers' existence checks leave.
- **Behavior:** Only a refusal's wording changes: a front matter that can't round-trip is refused either way (`mergeInto` throws today, `pageFile.ts:183-185`; `sweepParse` returns `null`), and `mutableTarget(['page'])` already requires a held page.
- **Estimate:** −15 to −20 · read

###### 02-07 · Test Seeders Write Through a Path Production Never Takes
- **Now:** `writePageValue` is `valueToWrite` + `landPageValue(file, key, v)` with no world and no lock (`Testing/propertyWrites.ts:6-13`), skipping the sibling reconcile, `keepingForeignWords`, and `writtenSpelling`. `writeSpaceValue` (`:15-23`) runs `landSpaceValue`, skipping only `mutableTarget`, the definition lookup, and `underContexts`. About 50 call sites (63 hits across 9 test files, among them `page.test.ts`, `optionOps.test.ts`, `removeProperty.test.ts`, `restoreProperty.test.ts`) seed or assert through them. `landPageValue`/`landSpaceValue` are exported only for them and `writePathRace.test.ts:82`, and `landPageValue`'s optional `world` exists only for the page seeder.
- **Better:** Seeders call the ops through `settledMutate` (`Testing/settledMutate.ts:13`) when a test means "a user wrote this", or write raw front matter when it means "the file holds this"; `land*` then fold into their ops and lose their exports. Some expectations need re-reading under the real spelling.
- **Estimate:** −15 production, test churn ±0 · read

###### 02-08 · Five Files Named "Value(s)" Meaning Five Different Things
- **Now:** `Properties/propertyValue.ts` (codec), `Properties/value.ts` (column type, per-row decode, `fileName`), `Properties/pageValue.ts` (raw list-member edits, nothing about pages), `Views/pageValues.ts` (host `PageValues` builder), `Testing/pageValues.ts` (fixtures), plus `assignValue.ts` and `useContainerValues.ts`. `fileName` (`value.ts:66`) is a link helper used by `Cells/Cell.tsx:11` and `Pipeline/sort.ts:12`.
- **Better:** `pageValue.ts`'s `namesValue`/`stripList`/`editList`/`Matcher`/`ValueEdit` move to `Files/rootValues.ts` beside `memberKey`/`joinValues`/`editHeldList` (`rootValues.ts:14,17,24`), and `valueEditRewrite` to `optionOps.ts`, its only caller (`optionOps.ts:203`), deleting the file. `value.ts` becomes `fieldValue.ts`, with `fileName` moving to `linkValue.ts` beside `wikiTitle`. `pageValuesOf` folds into `Views/loadValues.ts`.
- **Estimate:** −10 · read

###### 02-09 · A Space Value Write Resolves Its Key Outside Any Lock a Rename Sweep Honors — INFERRED
- **Now:** `setPagePropertyOp` reads the definition inside the page lock, because "a rename sweeps under the schema lock, not this one" (`setProperty.ts:67`). `setSpacePropertyOp` reads it before `rmwJsonStrict` takes the sidecar lock (`setProperty.ts:55` vs `:33`, `atomicWrite.ts:141-147`), under `underContexts` only (`mutate.ts:198-202`), which a property rename doesn't take (it runs under `serializeSchemaOp`, `propertiesRegistry.ts:126-127`); the rename's sweep reaches every Space sidecar under `guarded` → `machine().lock(file)` (`governedSweep.ts:67-70,117-119`), the same lock. A Space write read before a rename and landed after the sweep passed would write the old key. The op also reads the registry twice: `readRegistry` for the def, then `liveTreeOf`'s `config.registry` for the world (`:32`).
- **Better:** Read the definition inside the `rmwJsonStrict` mutate, mirroring the page path, and build def and world from one registry read.
- **Behavior:** Changes only in the race window.
- **Estimate:** ±3 · inferred; a reproduction holding a Space write between its registry read and its lock while a rename sweeps settles it.

###### 02-10 · Mass Assign Is N Independent Writes — INFERRED
- **Now:** `TableView.tsx:368-370` loops `commitValue` per row inside `groupUndo`, each commit its own mutate, disk `readRegistry`, `liveTreeOf` + `assignedDefs`, page lock, two-parse write, `pushUndo` closure, and override entry.
- **Better:** Only if a Benchmark measurement shows it lags: `setProperty` takes `paths[]`, reads the registry and world once per Collection, and runs through `sweepGovernedRoots`/`sweepRootsById`, returning one result and one undo; it extends `setProperty` rather than adding an op.
- **Behavior:** Partial failure becomes one report instead of N silent refusals.
- **Estimate:** +20 / −5 · inferred; timing a mass assign over a few hundred rows on `make-benchmark-nexus.mjs large` settles it.

###### 02-11 · A Collection's `properties` List Has Three Parsers
- **Now:** `assignedIds` (`assignment.ts:28-31`, filters strings), `resolveAssignedSchema` (`containerFields.ts:29-39`, the same filter plus a registry lookup), and `assignedDefs`' disk fallback (`assignment.ts:43-44`).
- **Better:** One resolver; 08-02's one home per definition removes `resolveAssignedSchema` outright.
- **Estimate:** −6 · read

###### 02-12 · `buildValueContext` Is a One-Line Repack With Its Own Test
- **Now:** `valueContext.ts:22-29` repacks its arguments, renaming two `IdentityMaps` fields (`identity.spaces` → `contextsById`, `identity.contexts` → `contexts`), for two callers (`PropertyPanel.tsx:168`, `useViewHost.ts:123`); `valueContext.test.ts` (42 lines, tests at `:30` and `:37`) pins the bundling and a `Map.get` miss.
- **Better:** Callers write the object literal and the function and its test go, unless 06-08's heading-settings half lands on `ValueContext`, which gives the builder a job. `ValueContext`/`holderOf` move to the cell surface (06).
- **Estimate:** −45 (mostly tests) · read

###### 02-13 · `resolveFieldValue` and `assignValue` Search the Schema Linearly on Every Call — INFERRED
- **Now:** `schema.find((d) => d.id === propertyId)` runs before the memo on every cell render, filter row test, group bucket, and sort extract (`value.ts:48`; `filter.ts:85` closes over `id`, not the def). `assignValue` does it three times per commit (`resolveFieldValue` at `:96`, `:98`, and `write` at `:54`), and `restore` adds a fourth (`:68`); `declaredType` (`value.ts:23`) scans once more per filter rule. At Benchmark-XLarge that's 50k rows × about 10-80 defs per filter clause.
- **Better:** Resolve the definition once per column and pass it in (07-01).
- **Estimate:** ±5 · inferred; a profile of a filtered, grouped view on a Benchmark Nexus settles it.

###### 02-14 · A Space Clear and a Page Clear Repair Siblings Differently
- **Now:** `landSpaceValue` returns `null` (no write) when clearing a key the sidecar doesn't hold (`setProperty.ts:34`, from `c3e3a0116`, reshaped in `1292e2132`), so no sibling reconcile happens. The page path always runs `writtenRoot` and writes whenever siblings changed (`governedWrite.ts:28-35`), so clearing an absent key on a page repairs siblings and re-dates the file.
- **Better:** One rule in the shared writer (02-06): a clear of a key the holder doesn't hold still tidies its other properties, on Spaces as on pages, and the Space-only branch goes [Intended as J-9]; tidying neither is taken only if it's the meaningful simplification.
- **Behavior:** A Space clear of an absent key starts tidying the sidecar's other values.
- **Estimate:** −1 · read

###### 02-15 · Title Is Read as a `select` Value, and Two Consumers Route Around It
- **Now:** `resolveFieldValue` returns `{kind:'select', value: row.title}` for `_title` (`value.ts:43`). `filter.ts:82-83` special-cases title onto `evaluateText` with an apologetic comment; sort bypasses it (`sort.ts:78-79` `buildCriterion`: `extract: r => r.title`). `Cell.tsx`, `CardValue.tsx`, and `group.ts` don't name `_title`.
- **Better:** Title reads as `{kind:'text', value}` (or stays out of `resolveFieldValue`) and `filter.ts`'s title branch goes [Intended as F-3]. `textValue`'s `select` arm (`filter.ts:140-141`) stays, since `evaluatorOf` sends a real Select's substring operators to `evaluateText` (`filter.ts:125`), so 07-04's merged projection keeps a `select` arm too.
- **Estimate:** −3 · read

###### 02-16 · Create-With-Seeds Writes the New File Once per Context Seed
- **Now:** `createPageOp` validates each context seed with `contextTarget` (`create.ts:30-33`), writes the page with property seeds (`page.ts:25-36`), then calls `setPageContext` once per context seed (`create.ts:48-49`), each re-taking the lock and re-running `pathExists`, `pageWorldOf`, `contextTarget`, and a full write.
- **Better:** Fold the resolved `{key, value}` from the first `contextTarget` pass into `createPage`'s `modeled`, so it's one write.
- **Behavior:** One fewer watcher event per seed.
- **Estimate:** −4 · read

###### A-01 · I-042 Part (2) Moves the Governed-Write Machinery Into `Core/Files`, Which Its Own Imports Rule Out
- **Now:** `IssuesPM.md:1013` (I-042, Solution part 2) moves `governedSweep`/`governedWrite`/`journalSlot` into `Core/Files/`, which imports only Nexus leaf utilities (`atomicWrite.ts:9`, `pageFile.ts:12-15`, `sidecar.ts:4`). `governedWrite.ts` imports the Contexts reconcile and the property codec (`governedWrite.ts:3-5`); `governedSweep.ts` imports `Nexus/liveTree`, `Nexus/treePatch`, `Nexus/heldPages`, `Index/indexSeed`, `Contexts/spaceSidecar`, and `properties.ts` (`governedSweep.ts:8-21`). Only `journalSlot.ts` (`:2-4`, Files, Platform, Paths) fits.
- **Better:** I-042 part (2) narrows to `journalSlot` → `Core/Files`; the governed-root writer, the reconcile, and `governedSweep` go to `Core/Nexus` (02-03), a judgment over keeping them in Properties.
- **Estimate:** ±0 · read

##### Behavior Ledger

| Behavior | Where | Origin | Classification |
|---|---|---|---|
| Any value write re-encodes every other governed key (a scalar Select becomes a list, duplicates collapse, spelling is respelled) | `governedWrite.ts:13`; `governedWorldWrite.test.ts:69` | PropertiesPM *§Repairs*; agent-built across MetadataV3 | Nathan's intent [Intended as P-3]; undo leaves these tidy-ups in place [Intended as E-2] |
| Select and Status store a one-element list, not a scalar | `encodeValue` `propertyValue.ts:249-250` (Status has kind `select`, `properties.ts:41`) | PropertiesPM *§Select & Multi-Select* | Nathan's intent [Intended as P-3]; Obsidian types the key as List |
| Live reconcile never shrinks or blanks a value it can't resolve | `contextResolve.ts:119-123` | `ad6ba7860` era, *§Repairs* | Agent's choice, sound |
| A Select holding several registered words reads as the last one | `propertyValue.ts:121-126` (`.at(-1)`) | `9aeb29271` | Agent's choice [Intended as P-1] |
| A Select pick over `[foo, Done]` drops `foo`, while a Multi-Select keeps unclaimed words after the picked ones | `keepingForeignWords` `:164-179` (Multi-Select only) | `eea82f191`, `88ad37ea0` | Nathan's intent [Intended as P-2] |
| Clearing a Multi-Select deletes its unclaimed words too | `keepingForeignWords` `:169` early return | PropertiesPM *§Identity & Values* | Agent's choice, documented |
| A Context tag pick drops titles naming no Space, where a Multi-Select keeps unclaimed words | `contextTarget` `contextWrite.ts:42-56`, comment `:134` | Agent comment only | Nathan's intent for the pick [Intended as P-2]; undo keeps the unresolved titles (02-02) |
| A tick writes the partner of the file's unchecked word in its casing (`no` → `yes`, `OFF` → `ON`) | `checkedSpelling` `:222-229` | `4264df480` | Agent's choice, interop-protective |
| A changed number keeps the file's quoting, format, and decimals | `spelledNumber` via `writtenSpelling:234` | `65b1e8548`, `ac3219e97` | Agent's choice, interop-protective |
| Undo of a pick over a bare key writes `Key: null` | 02-02 | I-063 deferred | Accident [Intended as E-1] |
| Undo of a context pick over unresolved tags deletes them | `assignValue.ts:67` | The I-063 fix covered only the property arm (`e0a803028`) | Accident [Intended as E-1] |
| A landed Link value showing a new alias gives the target page that alias, and undoing the value leaves the alias | `rememberedAlias` `assignValue.ts:75-85,106-107` | Alias Management (`3fb2318d2` era), PropertiesPM *§Link* | The alias is documented intent; undo leaving it is an accident [Intended as E-3] |
| A unanimous Select mass pick clears every row; a mixed one sets the rest | `massAssign.ts:13-18` | — | Nathan's intent [Intended as P-3] |
| The Text field edits only the first line; later lines ride through | `parseEditorValue.ts:12-27` | `b80a7b12a` | Nathan's intent [Intended as P-3] |
| A refused write leaves nothing to undo, and its override vanishes | `assignValue.ts:102-118`, `valueOverride.ts:31-40` | — | Agent's choice, sound |
| A Space clear of an absent key repairs no siblings; a page clear does | 02-14 | `c3e3a0116`, reshaped `1292e2132` | Accident; both tidy [Intended as J-9] |
| Repair Properties On Open rewrites changed files behind the window, off by default | `repairSweep.ts:20`; `flag(false)` at `Settings/personalization.ts:146` | *§Repairs*; setting `repairOnOpen` | On by default [Intended as O-3] |

##### Approaches

###### A · The Codec and the Governed Root, Each With One Home
`propertyValue.ts` keeps only the union, decode, encode, option words, checkbox reading, and blank predicates; `Nexus/governedRoot.ts` owns the worlds, `reconcileGovernedRoot`, `reencode`, `writtenSpelling`, `writtenRoot`, and one `rewriteRootAt` built on `sweepParse`, serving the value ops, Context tag writes, the banner, and `sweepGovernedRoots`. List edits go to `Files/rootValues.ts`, adoption to `optionOps.ts`, the Trash oracle to the restore side, and `value.ts` becomes `fieldValue.ts`.
- **Removes:** `governedWrite.ts`, `pageValue.ts`, `reconcilePropertyValue`, `landPageValue`/`landSpaceValue`, one parse per write, the no-world mode, and the encode refusal (02-01, 02-03, 02-04, 02-06, 02-07, 02-08); about −60 to −80, INFERRED.
- **Costs:** import churn across about 40 files.
- **Risk:** low; moves plus pure merges, and the gates catch mismatches.

###### B · One Revert Mechanism, Built From File Text
Value writes return (or the host retains, keyed by a token) the touched key's before and after, and undo for edits, mass assigns, and sweeps goes through `undoSweep`/`keysPutBack`, with the bare-`null` spelling fix.
- **Removes:** `held` capture, the `restoreValue` op and its zod arm, `requestedValue`, `assignValue`'s `restore`, the renderer restore patch, and the context-arm divergence; about −30.
- **Costs:** a reply field on `MutateOutcome` or host-side undo state; Spaces use `keysPutBack`'s existing sidecar arm (`governedSweep.ts:179-181`).
- **Risk:** moderate; undo puts back only the edited key [Intended as E-1, E-2].

###### C · The Renderer Stops Encoding — INFERRED
The override holds the `PropertyValue` per column (and Context ids) instead of a patched front matter, and `resolveFieldValue` prefers it; or the host replies with the landed root and the override adopts it.
- **Removes:** `applyValueAtRoot`, `withSeeds`' encode (`useViewCreation.ts:45-58`), the spelling and foreign-word divergences, and `rekeyOverrides` (`useContainerValues.ts:17,48`); about −30, mostly in `useContainerValues`/`valueOverride`.
- **Costs:** `resolveFieldValue`'s memo consults the override, and `PropertyPanel`'s held check (`Object.hasOwn(fm, key)`) reads it too.
- **Risk:** moderate; it touches the hot read memo, so it waits on a Benchmark profile.

##### Cross-Domain Notes

- **Type Facts:** `FROM_GROUP_KEY` (`Views/reassign.ts:6`), `SEEDS_FROM_SORT` (`useViewCreation.ts:33`), `parseEditorValue`/`editorText`, and `checkboxWord`'s home are per-kind facts outside `PROPERTY_TYPES`. The `context` member of `PropertyValue` decodes to `NULL_VALUE` (`propertyValue.ts:142-143`) and is real only on `row.contextValues` and in create seeds, a request shape posing as a value kind.
- **Sweeps:** `sweepGovernedRoots` writes sidecars with its own `parseJsonObject`/`jsonText`/`atomicWriteFile` loop (`governedSweep.ts:116-137`) while value writes use `rmwJsonStrict`; both take the same lock and write the same bytes, differing only in how a read miss is classed (04-05).
- **Trash:** `scrubReturning`'s `unlinked(raw)` (all registry links) and the reconcile's frozen gone-check (assigned links) check the same Link goneness twice before `stripKeys` removes the result (`restoreScrub.ts:151-178`).
- **Value Surfaces:** the three hand-built `ValueWriter`s (`useViewHost.ts:171`, `PropertyPanel.tsx:192`, `entityMenuActions.ts:84`); the menu's mutates a local `row`, ignores `contexts`, and publishes no override to an open view, and the panel and the view hold separate overrides for one page (06-05).
- **Sync-Ready Shapes:** `_space.json` is one flat object holding system keys (`id`, `$icon`, `$color`, `$order`, `banner`), Context links (`<Title>:` keys), and property values side by side (`spaceNodeFrom`, `spaceSidecar.ts:59-82`), so a per-section merge has to partition it by key pattern; a page's front matter has the same mix.
- **Comments:** `mutate.ts:81` claims a page value write "never shrinks or drops a key it can't resolve", which holds for siblings only; a context pick drops unresolved titles from the written key.

---

#### Scout 03 — Schema Mutations

Every operation that changes the property list or a Collection's assignment, read at `d0595b22d`; 03 and 04 describe one machinery, so their shared findings carry both IDs. The "F-042" that Phase 7A and Phase 9 commit subjects cite (`cf4dee4e6`, `f8aa48665`) is today's I-036 (the index moved from F to I in `fea03ca3b`; its claim sits at `IssuesPM.md:755`). NexusOS holds no `property_cache` block in any of its 7 Collection sidecars, no property Trash record, and no `.nexus/property-cascade.json`.

##### Inventory

| File / Symbol | Lines | Responsibility | Callers Outside the File | Belongs Here? |
|---|---|---|---|---|
| `Core/Properties/registryProperty.ts` | 267 | Registry-level create, rename, Key Format, def edit, removal, Nexus order | — | Mostly |
| ↳ `createProperty` | 72-102 | Mints a def: label step-aside (`freeLabel`), option seed, delete-record consumption | `handlers.ts:158` (unlocked), `Trash/restoreProperty.ts:40` | Yes; the lock wrapping is inconsistent (03-04) |
| ↳ `renameProperty` / `setKeyFormat` → `rekeyProperty` | 171-220 | Journaled rekey: plan → journal → commit → sweep → clear | `handlers.ts:173-174` | Yes |
| ↳ `keyFormatHolders`, `rekeyPlan`, `bothKeyHolders`, `renamePlan` | 106-168 | Plan and dry-run count for a rekey | `handlers.ts:204` | Yes |
| ↳ `renameSweep` | 118-121 | The rekey sweep | `replaySchemaCascade.ts:49` (replay-only export) | Yes |
| ↳ `editProperty` | 223-242 | Non-identity def-field patch (locked) | `handlers.ts:149` | Yes |
| ↳ `removeFromRegistry` | 244-254 | Drops a def (unlocked) | `deleteProperty.ts:159`, `handlers.ts:162` (`schema:add` rollback) | Yes |
| ↳ `reorderRegistry` | 256-267 | Nexus-wide display order (unlocked) | `handlers.ts:172` | Yes |
| ↳ `PropertyRename` (type) | 123 | Rename reply | `bridge.ts`, `PropertyFrame.tsx` | Yes |
| `Core/Properties/optionOps.ts` | 386 | Every option mutation, adoption of held Multi-Select words, the option cascade | — | Mostly |
| ↳ `editOption` | 88-110 | Registry-only option edits (add, recolor, reorder, relabel group), owed-key check | `handlers.ts:194` | Yes |
| ↳ `registerHeldOptions` | 113-166 | Adopts unknown Multi-Select members (open, settle) | `Nexus/handlers.ts:114`, `Nexus/settle.ts:163` | Stays near option writes |
| ↳ `renameOption` / `setValueFormat` → `rekeyOptions` | 236-325 | Journaled option rekey, registry-first | `handlers.ts:195-196` | Yes |
| ↳ `removeOption` | 367-386 | Journaled option strip, registry-last | `handlers.ts:197` | Yes |
| ↳ `clearOption` | 340-354 | Unjournaled value strip, option kept | `handlers.ts:198` | Yes |
| ↳ `optionHolders`, `valueFormatHolders` | 327-365 | Dry-run counts | `handlers.ts:202,206` | Yes |
| ↳ `optionCascade`, `dropOptionFromDef` | 168-234 | Files → stashes → config pass; def drop (unlocked) | `replaySchemaCascade.ts:73,82,87` (replay-only exports) | Yes |
| `Core/Properties/assignment.ts` | 162 | Assignment reads and writes, plus the refill-by-id helper | — | Mixed |
| ↳ `assignedIds` | 28-31 | Reads a sidecar's `properties` | `removeProperty.ts`, `deleteProperty.ts` | Yes |
| ↳ `assignedDefs` | 33-46 | A Collection's schema from the held tree, falling back to disk | `Contexts/contextWrite.ts:78`, `repairSweep.ts:31`, `Trash/restoreScrub.ts:145` | No: schema resolution beside `containerSchema` (`Nexus/treePatch.ts:128`) |
| ↳ `refillValues` | 49-63 | Lands values by id where the root reads blank | `Trash/restoreProperty.ts:71`, `Trash/spend.ts:237` | No: a values primitive, beside `sweepRootsById` (`governedSweep.ts:185`) |
| ↳ `restoreCachedValues` | 65-107 | Re-assign refill from `property_cache` | — | Yes |
| ↳ `assignInner` / `assignProperty` / `reorderAssignment` | 110-162 | Assign (with refill), reorder | `handlers.ts:160,168,170`; `assignInner` also `restoreProperty.ts:48` | Yes |
| `Core/Properties/removeProperty.ts` | 62 | Per-Collection Remove: stash + unassign + view clear, then config reach, then page strip (no journal) | `handlers.ts:169` | Yes; the name collides with "remove" as a global op (03-10) |
| `Core/Properties/deleteProperty.ts` | 172 | Global delete: snapshot bundle → journal → strip → unassign and purge every stash → config → registry | — | Yes |
| ↳ `writePropertyBundle` | 42-49 | Mints a `.trash` bundle | tests only (4 files) | Unexport |
| ↳ `snapshot` | 51-94 | Builds the Trash record, including the `partial` flag (03-09) | — | Yes |
| ↳ `propertyHolders` | 98-103 | Dry-run count | `handlers.ts:201` | Yes |
| ↳ `deletePlan`, `stripAndRemove` | 136-161 | Plan and tail shared with the replay | `replaySchemaCascade.ts:58-63` (replay-only exports) | Yes |
| ↳ `PropertyDeletion` (type) | 96 | Delete reply | `bridge.ts` | Yes |
| `Core/Properties/propertyCache.ts` | 68 | Reads and writes `property_cache` blocks; edits stashes across Collections | `Nexus/cascade.ts:274` (`editCaches`) | Yes, unless the stash gets a better home [Intended as C-2] |
| `Core/Properties/keyHolders.ts` | 66 | Files holding a key confirmed from disk (`confirmedKeyHolders`); values filed by id (`keyedHolders`) | `registryProperty.ts:126-128` (sole caller of `confirmedKeyHolders`); `removeProperty.ts`, `deleteProperty.ts` | Two readers of one fact (03-06); I-042 moves it to `Core/Index/` |
| ↳ `KeyedHolders` (type) | 31-35 | — | `deleteProperty.ts` | — |
| `Core/Properties/handlers.ts` | 209 | 20 property and schema handlers, their narrowers, 3 reply shapes | `Contract` wiring | Yes; the channel count is the issue (03-07) |
| `Core/Contract/bridge.ts:131-189` | ~58 | 20 channel declarations | — | Yes |
| `Core/Interface/Confirm/confirmations.ts:177-228` | 52 | `askHolding` + 4 counted confirmations | `Schema/PropertyFrame.tsx:250,294`, `Schema/useOptionEdit.tsx:111,115` | Yes |
| `Core/Trash/restoreProperty.ts` | 78 | Property restore: create → assign → stashes → refill | `Trash/spend.ts:103` | Yes |
| `Core/Trash/holdings.ts` | 86 | Link values the Trash parks or refills (`parkLinks`, `refillTrashed`) | `assignment.ts:100`, `spend.ts:86,108,244` | Yes, but its name says nothing of Links (03-10) |
| `Core/Properties/propertyWrite.ts` | 30 | Renderer round trip: owed → Try Again, `retryOwed`, `warnOwed` | `PropertyFrame.tsx`, `useOptionEdit.tsx` | Yes (05's surface) |

**Test Mass:** about 5,900 test lines across 15 files against about 1,600 production lines; the largest are `optionOps.test.ts` 1,521 (21 `describe`, 95 `it`), `replaySchemaCascade.test.ts` 713, `registryProperty.test.ts` 626, `confirmations.test.ts` 437, `deleteProperty.test.ts` 430, `handlers.test.ts` 410, `removeProperty.test.ts` 407, `journalWiring.test.ts` 372, `keyHolders.test.ts` 312, `restoreValue.test.ts` 193, `assignment.test.ts` 168, `renameSweep.test.ts` 132, `propertyJournal.test.ts` 102, and `cascadeRace.test.ts` 85. Only the `describe` and `it` names of `optionOps.test.ts` and `handlers.test.ts` were read, so every collapse claim over them is INFERRED.

##### Refusal & Guard Catalog

| Guard | Where | State That Produces It | Reachable? | Folds Into |
|---|---|---|---|---|
| Rename, Key Format, or delete runs unjournaled when the slot holds another record (the `writeSchemaJournal` boolean is discarded) | `registryProperty.ts:183`, `deleteProperty.ts:123` | Any property's cascade still owed, or an unreadable slot (`journalSlot.ts:36`) | Yes, after any skipped file | Per-property record (03-01) |
| Option rename or Value Format change refused, `OWED` | `optionOps.ts:242` (`rekeyOptions`) | Any property's record held, or the slot unreadable | Yes; an unreadable slot shows the "earlier change" copy with nothing owed | Wait only on its own record |
| Option Remove refused, `OWED` | `optionOps.ts:377` | Same | Yes, after the confirmation already asked (`confirmations.ts:196`) | Same |
| Clear waits on its own property's option record | `optionOps.ts:346-348` | Same property's option rename or remove owed | Yes | I-036 clause 1 ("an op waits on its property's record") |
| Option edit refused when it re-takes an owed old key | `optionOps.ts:79-84` (`owedKeys`), `:103` | Same property's option rename owed | Yes | Clause 2 ("owed old keys count as held"); clause 1 must not apply, or a recolor would wait |
| Adoption skips an owed rename's old keys | `optionOps.ts:150-151` | Same | Yes | Clause 2 |
| Create steps aside from an owed rename's old key | `registryProperty.ts:77-81` (`freeLabel` with `owed`) | Any rename owed | Yes | Clause 2 |
| Create consumes a journaled delete whose key or id it wears | `registryProperty.ts:94-100` | Delete owed, then a same-key create or a restore | Yes | By key: refused with the general unfinished-change message, its Try Again re-running the cleanup [Intended as B-4]. By id (restore): the replay's `crashed` arm needs it today (04-02) and it leaves under list-first commits [Intended as B-2] |
| Rename refused when a live file holds both keys (`KEY_REFUSAL.held`) | `registryProperty.ts:152-154`, `keyHolders.ts:14-29` | An Obsidian or hand-edited page holding both | Yes; archived files are excluded by design (Archive C-4) and lose the old value under `prefer-new` | Keep |
| Name or key case-fold collision (`validateName`) | `registryProperty.ts:149`, re-run at `:190` | A taken label or key; the second check covers a registry write landing between plan and commit | Yes (hand edits, Sync arrivals, the unlocked `schema:add`) | Keep both until the lock rule (03-04) and the outside-writer question settle |
| `CROSSED`: one option's new key is another's old key | `optionOps.ts:47-50`, `:305-307` | A Value Format change under hand-edited or legacy keys | Rare (INFERRED) | Keep; it guards replay idempotence |
| Two options would share a key | `optionOps.ts:297-300` | A format collapses two labels | Yes | Keep |
| `NO_OPTION`, `NO_GROUP`, blank group label, `NO_OPTIONS` | `optionOps.ts:43-76` | Stale renderer, wrong type | Stale renderer only | Keep (boundary) |
| Remove no-ops when not assigned or the def is missing | `removeProperty.ts:33,36` | Stale renderer, or a second Remove after a partial one | Yes | The second state makes Remove non-retriable (03-03) |
| Remove halts when its strip skipped | `optionCascade` `optionOps.ts:229` (`labels?.[1] === null`) | Option Remove skip | Yes | Keep the behavior as a union (03-11) |
| Restore refused, `'exists'` | `restoreProperty.ts:35-36` | Id already in the registry | Yes | Duplicate of `validateDefinition`'s id check (`schema.ts:67-68`) (03-08) |
| Restore: "could not be read back" | `restoreProperty.ts:42-43` | A def vanishing between commit and re-read inside the schema lock | Only an outside writer in that window | Ghost guard (03-08) |
| Reorder refused: "Property not assigned." | `assignment.ts:136` | Stale renderer | Stale only | Keep |
| `schema:add` rollback (`removeFromRegistry` on assign failure, unlocked) | `handlers.ts:160-163` | Sidecar write failed | Yes | One locked hold (03-04) |
| Replay `answered` branches | `replaySchemaCascade.ts:54` (delete), `:78` (option remove) | A renderer-held record the slot never took or no longer holds | Yes, through the unjournaled path | Per-property record (03-01) |
| `journalRecord` narrower on `property:replay` | `handlers.ts:105-109` | The renderer sends a record back | Yes | Replay by id (03-01) |
| Confirmation thresholds: delete and option Remove always ask (even at 0 holders); Clear and format change ask past one; Remove never asks; Confirm Before Deletion governs none | `confirmations.ts:177-228` (`askHolding`'s `asksPastOne`) | — | — | L-04; one shared home for counting and wording [Intended as O-2] |

##### Findings

###### 03-01 / 04-01 / 04-03 · One Global Journal Slot Forces Seven Hand-Placed Guards and Two Contradictory Journal Shapes
- **Now:**
  - The schema journal is one Nexus-wide record (`propertyJournal.ts:42`, `journalSlot.ts:33-41`); a write against a different held record, or against an unreadable slot, returns `false` (`journalSlot.ts:36-37`).
  - Three policies meet that `false`: `rekeyProperty` (`registryProperty.ts:183`) and `deleteInner` (`deleteProperty.ts:123`) discard it and proceed with no crash recovery; `rekeyOptions` (`optionOps.ts:242`) and `removeOption` (`:377`) refuse with `OWED`; Context and Space renames discard it and proceed (`contextCascade.ts:217`, `renameSpaceOp`'s `writeJournal`), and Contexts alone pass `supersedes` (`contextJournal.ts:42-45`, `journalSlot.ts:19,37`), letting a later rename of the same entity overwrite an earlier rename's owed record.
  - Both property arms still attach `owed: record` through `schemaCascade` (`propertyJournal.ts:51-54`, called at `registryProperty.ts:205` and `deleteProperty.ts:128`) whether or not the slot took it, so the renderer carries a record that may exist nowhere on disk (`propertyWrite.ts:6,22-23`, `PropertyFrame.tsx:300`). That's why `property:replay` accepts a record over IPC (`handlers.ts:105-109,176-180`, `bridge.ts:154`) and why the replay grew `answered` logic (`replaySchemaCascade.ts:54` `crashed = !answered && …`; `:78`, an option remove's answered record owed "only while the slot still holds it").
  - The guards patch around the shared slot (catalog rows 2-8): `owedKeys` (`optionOps.ts:79-84`), Clear's wait (`:346-348`), adoption's owed filter (`:144,150-151`), create's step-aside (`registryProperty.ts:77-81`), and create's delete consumption (`:94-100`). I-036 (`IssuesPM.md:755`) claims per-property records fold them into one rule: "an operation on a property waits on that property's owed record, and every owed record's old keys count as held."
- **Better:** One record per property, Context, and Space [Intended as B-1], shared with Contexts as I-036 asks. Every cascading op always journals; the unjournaled paths, `supersedes`, `answered`, the renderer-carried record, and `journalRecord` go; `SchemaCascade.owed` shrinks to the id and Try Again becomes `property:replay(id)` read from disk. `OWED` scopes to the op's own property, so an owed record on one property stops blocking option renames, Value Format changes, and option Removes on others (`editOption` already filters owed keys by its own id, `optionOps.ts:81`). `owedKeys`, the adoption filter, and the create step-aside become one read of every held record's old keys. An op on an entity with a record of its own replays it first (04-01's form) rather than refusing. I-036 holds only with these limits:
  - Clause 1 covers only cascading ops; applied to `editOption`, a recolor would wait on an owed rename.
  - Create's consumption by key contradicts clause 2: an owed delete's key counts as held, so a create on it is refused with the general unfinished-change message and its Try Again re-runs the cleanup [Intended as B-4] (L-06). Consumption by id (restore) leaves with list-first commits [Intended as B-2].
  - A second rename on an entity whose rename is owed composes into one record rather than waiting: the property replay already sweeps "to the key the def holds now, however many renames have followed" (`replaySchemaCascade.ts:46`), and the Context Try Again re-derives from → current the same way (`contextCascade.ts:206-211`).
- **Behavior:** Option renames, Value Format changes, and option Removes on other properties stop being refused; a rename, Key Format change, or delete gains crash recovery while another record is owed; a same-key create on an owed delete is refused with Try Again instead of adopting its skipped files; a Context's first rename's leftovers survive a restart.
- **Estimate:** about −60 to −100 production across `optionOps.ts`, `registryProperty.ts`, `replaySchemaCascade.ts`, `handlers.ts`, `propertyWrite.ts`, `propertyJournal.ts`, and `journalSlot.ts`, plus a keyed slot (+15 to +25, shared with Contexts); rewrites `journalWiring.test.ts:274-319` and parts of `optionOps.test.ts:707` · inferred

###### 03-02 · `property_cache` and the Assignment List Each Merge as One Field Under Sync, and Losing the Stash Loses Data
- **Now:** `mergeDepthFor` (`Core/Sync/Arrival/mergePolicy.ts:25-40`) returns `{}` for every sidecar, so a Collection's `property_cache` and its `properties` list each merge as one top-level key. Remove strips page values after moving them into the stash (`removeProperty.ts:47-60`), so when two devices each Remove a different property from one Collection inside a sync window, the newer writer's `property_cache` wins whole and the loser's values exist nowhere (INFERRED from `mergeKeys`, `jsonMerge.ts:35-44`). Concurrent assigns lose one assignment the same way, recoverable by hand. NexusOS holds no `property_cache`, so the loss is prospective.
- **Better:** The stash stays [Intended as C-1] and is meant to lose nothing under sync [Intended as C-2] while Sync's rules stay [Intended as H-1]. Per-page merging needs depth 3 on today's shape, or the `values` wrapper flattened (08-06) plus `{ property_cache: 2 }`, since `mergeKeys` recurses at `level - 1` (`jsonMerge.ts:36-43`) and depth 2 stops at `<propId>`; that and an order-aware `properties` merge are Sync rebuild inputs unless the stash's placement achieves the same without a Sync rule [Intended as H-2].
- **Estimate:** set by the stash's placement · read (merge policy), inferred (loss)

###### 03-03 / 04-13 · Remove's Partial Run Can't Be Retried, Is Reported as a Refusal, and the Docs Claim the Opposite
- **Now:**
  - Remove has no journal: its sidecar write unassigns and stashes first (`removeProperty.ts:47-57`), then runs the config reach (`:59`), then strips (`:60`).
  - Skipped files come back as `fault(unsweptLine)` through `unsweptReply` (`handlers.ts:62-65,169`), which the renderer treats as a refusal: `PropertyFrame.tsx:255-257` calls `backToList()` only when `reportRefusal` passes, so the editor stays open on a property no longer assigned, and `propertyWrite.ts:14` offers Try Again only for code `'owed'`. A second Remove returns `NOTHING_TO_REMOVE` (`removeProperty.ts:33`), so skipped pages keep values the Collection no longer governs.
  - Clear has the same reply (`optionOps.ts:352`), though re-running Clear works.
  - Skip reporting has four shapes: `SchemaCascade` with a record (rename, delete, option rename and remove); `fault` (Remove, Clear, replay); `asIs` around a `SchemaCascade` (rename and Key Format pass `PropertyRename` through `asIs`, `handlers.ts:173-174`, harmless since a rename's `hosts` is always `[]`, `registryProperty.ts:205`); and silence (a re-assign refill skip stays stashed unreported, `assignment.ts:99-105`).
  - `PropertiesPM.md:136` claims Remove and the delete "re-run cleanly after a partial run", false for Remove.
- **Better:** Every op that sweeps answers one `SchemaCascade` and lands through `warnOwed`. Remove's retry re-runs the strip against the stash it already wrote [Intended as C-2], either through an `{ op: 'unassign', id, folder }` record under 03-01's keyed records, or by keying Remove's guard on "the stash block exists or a file still holds the key" (which still needs a Try Again to reach it, since an unassigned property has no Remove in the panel). The doc line is rewritten.
- **Behavior:** Remove and Clear skips gain Try Again, and the editor leaves once Remove lands.
- **Estimate:** about −5 to +10 · read

###### 03-04 · The Schema Lock Wraps Some Registry Writers and Not Others, and `schema:add` Runs Create, Assign, and Rollback in Three Holds
- **Now:** `serializeSchemaOp`'s comment (`propertiesRegistry.ts:125`) says ops that cascade to pages queue on it. `editProperty` (registry-only) is wrapped (`registryProperty.ts:231`); `reorderRegistry` and `removeFromRegistry` aren't (`:244-267`); `createProperty` isn't when `schema:add` calls it (`handlers.ts:158`), while `restoreProperty` wraps it (`restoreProperty.ts:28`). `schema:add` creates (unlocked), assigns (locked), then rolls back with `removeFromRegistry` on failure (unlocked) (`handlers.ts:153-166`). `rekeyProperty`'s docblock names the race this opens, "since a create can land between the two" (`registryProperty.ts:170`), but every registry write is atomic under the registry file's own lock (`mutateRegistry` → `updateNexusFile`, `propertiesRegistry.ts:92`) and the in-commit `validateName` (`:190`) already catches it, so no wrong state results.
- **Better:** Every entry point that writes the registry or a schema sidecar takes the schema lock, and `schema:add` becomes one hold (`createProperty` + `assignInner` with an in-hold rollback). The in-commit `validateName` stays for outside writers to `properties.json` (Sync arrivals, hand edits), which don't take this lock, and its comment is rewritten to that reason.
- **Estimate:** about ±0 · read

###### 03-05 · Each Mutation Hand-Rolls Its Own Plan, Count, Journal, Commit, Sweep, and Report Shape — INFERRED
- **Now:** Ten entry points in eight rows, seven distinct shapes (each row read):

  | Op | Lock | Journal | Commit Order | Count Function | Reply |
  |---|---|---|---|---|---|
  | create | partial (03-04) | reads | registry | — | `{ id }` |
  | rename / Key Format | yes | written; result ignored | registry, then files | `keyFormatHolders` (`registryProperty.ts:158`) | `asIs(PropertyRename)` |
  | delete | yes | after bundle; result ignored | files and Space sidecars, then Collection sidecars, then config, then registry | `propertyHolders` (`deleteProperty.ts:98`) | `cascadeReply` |
  | Remove | yes | none | sidecar, then config, then files | — | `unsweptReply` |
  | assign | yes | none | sidecar, then refill | — | `asIs` |
  | option rename / Value Format | yes | refuses | registry, then files, then stashes, then config | `valueFormatHolders` (`optionOps.ts:327`) | `cascadeReply` |
  | option Remove | yes | refuses | files, then stashes, then config, then registry | `optionHolders` (`:356`) | `cascadeReply` |
  | Clear | yes | reads | files, then stashes | `optionHolders` | `asIs` / fault |

  Each count re-derives its op's plan through its own function (`rekeyPlan`/`renamePlan`, `valueFormatPlan`/`valueEditPlan`, `resolveForCascade`, `deletePlan`), and every count already ends in `sweepCount(files, plan)` (`c5dccd62b`). `property:holders` multiplexes four counts by argument shape (`handlers.ts:199-208`), left open by the MetadataV3 plan as "One Holders Shape" (`.claude/Planning/Completed/MetadataV3/MetadataV3 — Implementation Plan.md:5828`).
- **Better:** Each op is one descriptor, `plan(root, args)` returning `{ record?, files, sweep, commit }`, run by one runner (journal → list commit → sweep → clear → `SchemaCascade`), with `holders` as `sweepCount(plan)` for any op; that folds the four count functions and the shape-sniffing `property:holders`. Every op commits the list first [Intended as B-2]; an option removal's record then carries what its replay needs to find the option (`replaySchemaCascade.ts:76`), as a property delete's record already carries its key (04-02). The runner is a new layer and earns its place only after 03-01 and 03-03 have removed most per-op variation.
- **Estimate:** about −40 to −80 · inferred; measured after 03-01 and 03-03 land

###### 03-06 / 04-09 · "Which Files Hold This Key" Is Read Three Ways, With Repeated Full Disk Passes per Op
- **Now:** `confirmedKeyHolders` (`keyHolders.ts:14-29`) reads every holder and then every Space sidecar from disk. `bothKeyHolders` (`registryProperty.ts:125-130`) runs it once for `from` and once for `to` (the `to` pass only when `from` has holders), so a Key Format count (`keyFormatHolders` → `rekeyPlan` → `bothKeyHolders`, then `sweepCount`'s dry sweep re-reading holders and all Space sidecars, `governedSweep.ts:116-137`) makes three disk passes, and the change itself repeats `rekeyPlan` (`:177`) plus the real sweep (`:203`): four reads of the `from` holders across one confirmed Key Format change. `keyedHolders` (`keyHolders.ts:38-66`) reads pages only, so the delete's `snapshot` re-walks every Space sidecar (`deleteProperty.ts:74-84`) and the strip's sidecar arm scans them again (`deleteProperty.ts:144` → `governedSweep.ts:118`): three scans per delete counting its preview.
- **Better:** One `keyHolders(root, keys[])` pass reads each candidate once and answers which keys each holds, plus values by id for pages and Spaces and `partial` (shown on the Trash entry [Intended as N-1]). The clash needs no `to` scan, since a file holds both keys only if it holds `from`; `bothKeyHolders` becomes a filter, `snapshot` drops its Space loop, and `confirmedKeyHolders` folds in. These are user-paced ops, so this is clarity and efficiency rather than a Hard Rule matter.
- **Estimate:** about −20 · read

###### 03-07 / 01-07 · Five `defEditOp` Channels Are One Operation
- **Now:** `property:setLinkConfig`, `setCheckboxColor`, `setIcon`, `setNumberFormat`, and `setFileDirectory` (`bridge.ts:155-171`, `handlers.ts:182-193`) all call `editProperty` through per-field narrowers (`properties.ts:219-229` for three; `handlers.ts:183-186` inline for checkbox color and icon, each accepting any string), each with one renderer caller (`PropertyFrame.tsx:259,353,363,371,516`). Nothing checks a patch fits the def's type: `editProperty` spreads any narrowed patch onto any def (`registryProperty.ts:235`), so a number format can land on a Link. `property:rename` and `property:setKeyFormat` likewise share `rekeyProperty`.
- **Better:** One `property:configure(id, patch)` narrowed by one zod `partial()` pick of the editable non-identity fields, with the file-directory normalization and `validPropertyDir` check inline; optionally one `property:setFormat(id, FormatChange)` for both formats, dispatching by the change's shape.
- **Estimate:** about −25 to −35 · read

###### 03-08 · The Trash Restore Re-Checks What `createProperty` Already Refuses and Guards a State Nothing Produces
- **Now:** `restoreInner` refuses `'exists'` (`restoreProperty.ts:35-36`), which `createProperty`'s `validateDefinition` already refuses (`schema.ts:67-68`) after `freeLabel` steps the label aside; it re-reads the registry for the def it just wrote and faults "could not be read back" (`:42-43`) inside the schema lock; it calls `liveTreeOf` twice (`:45`, `:56`). `createProperty` returns only `{ id }` (`registryProperty.ts:91`), and no caller branches on `'exists'` (`spend.ts:103-104` passes the refusal through).
- **Better:** `createProperty` returns the landed def; the pre-check, the read-back, and the second tree read go (INFERRED: the assignments in between don't change the pages `nexusPages` reads), keeping today's refusal message ("Something in the nexus already carries this identity.").
- **Estimate:** about −8 · read

###### 03-09 · A Record's `partial` Flag Is Computed in Five Branches and Read by Nothing
- **Now:** `snapshot` sets `partial` at `deleteProperty.ts:62,66,70,77,82` and writes it (`:92`), fed by `KeyedHolders.partial` (`keyHolders.ts:34,64`). No production code reads it on any record kind: page, Set, Collection, Space, and Context deletes write it too (`Trash/delete.ts:142,159`, `Trash/gather.ts:83-91,127-133`), the schema declares it on four record shapes (`Bundles/record.ts:54,70,80,88`), and the only consumer destructures it away (`spend.ts:156`); `git grep '\.partial\b'` finds only `deleteProperty.ts:62`. `NexusRecordPM.md:12` describes it as the record saying it's thinner than the truth.
- **Better:** The mark shows on the Trash entry for every record kind, and a restore that comes back partial tells the user so [Intended as N-1].
- **Behavior:** The mark becomes visible.
- **Estimate:** about +5 · read

###### 03-10 · "Remove", "Held", and the Channel Prefixes Each Mean Several Things
- **Now:** "Remove" is a per-Collection unassign (`removeProperty` / `schema:unassign` / the `property:remove` menu action, `PropertyFrame.tsx:293`), the global delete's registry step (`removeFromRegistry`), and a global, permanent option delete with no Trash (`removeOption`), so the user reads it as restorable on a property and permanent on an option (`confirmations.ts:196-201`). "Held" names the in-memory tree (`heldTreeOf`), files holding a key (`confirmedKeyHolders`/`keyedHolders`), the Trash's parked Link values (`holdings.ts`), Multi-Select words on files (`registerHeldOptions`), a root's values (`editHeldList`/`rekeyHeld`), and the journal slot's record. `schema:*` is per-Collection except `schema:add`, which also creates globally, and `registry:reorder` sits beside `property:*` for the same registry.
- **Better:** `removeProperty` → `unassignProperty`; `holdings.ts` named for what it holds (for example `trashLinks.ts`); `registry:reorder` → `property:reorder`; an option's Remove reads Delete [Intended as O-1].
- **Behavior:** The option's label changes.
- **Estimate:** ±0 · read

###### 03-11 · `optionCascade` Encodes "Remove" as a `null` in a Label Tuple
- **Now:** `labels?: readonly [string, string | null]`, with `labels?.[1] === null` meaning a Remove whose skip halts the cascade (`optionOps.ts:218-234`); callers pass `[label, null]` (`:378`, `replaySchemaCascade.ts:82-85`) and Clear passes no labels (`:351`). `ValueEdit`'s `null` separately means "strip" (`pageValue.ts`).
- **Better:** `edit: { kind: 'rename'; keys; labels? } | { kind: 'remove'; key; label } | { kind: 'clear'; key }`, matched by `switch`, so Clear's no-config pass and Remove's halt are explicit arms.
- **Estimate:** about ±0 · read

###### 03-13 · Remove Clears the Collection's Own Views Twice
- **Now:** Remove's sidecar patch runs `mapViews(cur, clear)` with `clear = propertyClear(propertyId)` (`removeProperty.ts:45,51`); `reachConfig(…, collectionFolder)` (`:59`) then applies the same edit (`configReach.ts:258`) to the same sidecar, since `within(node)` includes the node and `reaches` admits the folder itself (`Nexus/configReach.ts:278-281,323,370-379`), a no-op second write. The inline comment's rationale needs the stash and assignment in one write, not the views; `reachConfig`'s `editJsonStrict` is itself a locked read-modify-write. The inline clear came in `874f687d2`.
- **Better:** The inline `mapViews` goes and `reachConfig` owns every view edit, as in the delete (`deleteProperty.ts:154-155`); `propertyClear` then has only a test importer (`configReach.test.ts:13`) and unexports.
- **Estimate:** −3 · read

###### 03-14 · Misplaced and Over-Exported Symbols
- **Now:** `refillValues` (`assignment.ts:49`) is a value-landing primitive used by two Trash paths; `assignedDefs` (`assignment.ts:33`) is schema resolution; `writePropertyBundle` is exported for tests only (`deleteProperty.ts:42`; `Bundles/handlers.test.ts`, `Bundles/rows.test.ts`, `replaySchemaCascade.test.ts`, `Trash/spend.test.ts`); five functions are exported only for the replay (`renameSweep`, `deletePlan`, `stripAndRemove`, `dropOptionFromDef`, `optionCascade`; `replaySchemaCascade.ts:8-10`), which become the descriptor's internals under 03-01 and 03-05.
- **Better:** `refillValues` moves beside `sweepRootsById` (`governedSweep.ts:185`); `assignedDefs` folds into the holder resolver (its held-tree arm is `containerSchema`, `treePatch.ts:128`, and its disk fallback is unreachable wherever a tree is in hand, 04-10); `writePropertyBundle` unexports and its tests drive `deleteProperty`.
- **Estimate:** about ±0 · read

###### 03-15 · PropertiesPM's Schema-Mutation Claims That the Code Makes False
- **Now:** `PropertiesPM.md:123`'s "their entry points queue on one lock" is false for `schema:add`'s create, `registry:reorder`, and the rollback (03-04), and "every operation that writes both the registry and pages states its intent in a journal first" is false while another record is held or the slot is unreadable (03-01: `registryProperty.ts:183` and `deleteProperty.ts:123` proceed unjournaled), and by design for Clear (`journalWiring.test.ts:257`) and Remove. `:136`'s "re-runs cleanly after a partial run" is false for Remove (03-03). Neither the Change-a-Format row (`:131`) nor the Delete row says a Key Format change or delete proceeds unjournaled while another record is owed. `registryProperty.ts:170` carries a stale race rationale (03-04); `keyHolders.test.ts:80-216` (`describe('governedReach')`) tests `governedReach` and `collectionFolders`, which live in `governedSweep.ts`; `cascadeRace.test.ts:58` carries "F1 —".
- **Better:** Each line is rewritten in the same pass as 03-01, 03-03, and 03-04.
- **Estimate:** docs and tests only · read

##### Behavior Ledger

| ID | Behavior | Where | Origin | Classification |
|---|---|---|---|---|
| L-01 | Remove strips a Collection's values off its pages into `property_cache`, and re-assigning puts them back; about 170 production lines across 11 files, plus stash arms in at least 5 test files. Remove reaches the Collection's own Archive (`governedReach(…, only)` → `archiveReach`, `governedSweep.ts:43-57`, `treePatch.ts:119-123`), stripping and stashing archived pages under their ids; re-assign refills them because `owningCollection` resolves archive paths (`treePatch.ts:113-115`); the delete's `snapshot` captures archived holders since `deletePlan` runs `governedReach` with no `only` (`deleteProperty.ts:142`) | `removeProperty.ts`, `assignment.ts:65-107`, `propertyCache.ts`, `deleteProperty.ts:60-72,163-172`, `restoreProperty.ts:50-54`, `optionOps.ts:207-215`, `Nexus/cascade.ts:271-274`, `Nexus/containerFields.ts:24-27`, `Nexus/tree.ts:66-67`, `Bundles/record.ts:79` | 7-2 Decision Log C-3 and C-6 (`052ceec63`, since removed from the tree), implemented in `f85ccf2b3` (07-02); C-3 reopened the earlier leave-in-front-matter ruling, and C-6's shape is marked "signed approach 1" | Nathan's intent, ruled before Sync existed [Intended as C-1] |
| L-02 | Stash entries for pages that left the Collection (moved, or emptied from the Trash) stay until the property is globally deleted, growing the sidecar without bound | `assignment.ts:101-104` (only spent and gone-link ids leave), `removeProperty.ts:46,48` | C-6 specified "stale page-ids dropped" on re-assign (`052ceec63`); the current comment keeps "what a refill cut short left" | Agent's choice drifting from C-6; stale entries drop [Intended as C-2] |
| L-03 | A rename or Key Format change onto a key files already hold adopts their values, refused only where a live file holds both keys; an archived file holding both keeps the new key's value and loses the old one | `registryProperty.ts:151-154`, `keyHolders.ts:18` | `da190d039` (10-08); the Archive exclusion is Archive C-4 (`Archive — Decisions & Intention.md:62`), though Archive Planning Findings 1.7 (`:116`) recommended keeping archived holders | Agent's choice, consistent with "registering makes values live"; the Archive half is settled |
| L-04 | Property delete and option Remove always ask, even at 0 holders ("stripped from 0 Items"); Clear and format changes ask only past one Item; Remove never asks; Confirm Before Deletion governs none | `confirmations.ts:177-228` | Past-one entered for format changes in `96ca4cdba` (Task 7B-4) and extended to Clear in `5e3aee180`; always-asks predates MetadataV3; the zero-count wording was routed to a copy review (`Archive — Planning Findings.md:12`) | The threshold is Nathan's ruling (INFERRED from the ruling's removal); Remove asking nothing follows C-3's "restorable"; counting and wording move to one home shared with the Archive and the Trash [Intended as O-2] |
| L-05 | A create whose label or key is taken, or matches an owed rename's old key, silently takes a numbered name; a Trash restore whose label is now taken comes back numbered and writes its values under the new key | `registryProperty.ts:56-81`, `restoreProperty.ts:40` | `59a8f0586` (Task 7A-2), `cf4dee4e6` (Phase 9 review, the owed-key half) | Agent's choice; the numbered name is "Label (2)" (`Paths/names.ts:54-68`), a restore under a taken name says so through `landedAs` [Intended as O-4], and an owed rename's old name refusing like an owed delete's is planning's reading of B-4, pending Nathan's confirmation |
| L-06 | A create wearing an owed delete's key adopts the files the delete skipped and cancels its Try Again | `registryProperty.ts:94-100` | Present at the monorepo move `759a2dbef` (09-05) | Accident; refused with the general unfinished-change message, its Try Again re-running the cleanup [Intended as B-4] |
| L-07 | An option rename, Value Format change, or option Remove is refused while any property's record is owed or the slot can't be read, after the confirmation already asked | `optionOps.ts:242,377` | `cb2f3a8a0` (Task 6-4, 10-18) | Agent's choice forced by the single slot [Intended as B-1] |
| L-08 | A rename, Key Format change, or delete runs with no crash recovery while another record is owed | `registryProperty.ts:183`, `deleteProperty.ts:123` | The journal-slot refusal (`e744714fc`); I-036 names it | Accident [Intended as B-1] |
| L-09 | Remove's skipped files read as an error with no Try Again, the editor stays open on a property no longer assigned, and those pages keep values nothing governs; Clear's skips offer no Try Again either | `handlers.ts:62-65`, `PropertyFrame.tsx:255-257`, `removeProperty.ts:33` | `874f687d2` | Accident; Remove is retryable [Intended as C-2] |
| L-10 | A re-assign refill skips any page whose key holds anything, and the stashed value stays stashed | `assignment.ts:60` | MetadataV3 Phase 3 review ("A Refill Never Replaces Words") | Agent's choice, sound |
| L-11 | A property delete always writes a `.trash` bundle, even in system-trash mode, where the documented rule is "records nothing" | `deleteProperty.ts:46` (`mintBundle(root, { kind: 'trash' }, …)`, no mode check), `NexusRecordPM.md:12` | — | Nathan's intent, since a property has no file for the system Trash [Intended as N-2]; the Trash pane mounts and lists `.trash` bundles with no mode check (`Settings/frames.ts:915-921`, `browser.ts:215`), so the entry shows in system mode |
| L-12 | Every record kind's `partial` flag is written and never shown (03-09) | `deleteProperty.ts:62-92`, `Trash/delete.ts:142,159`, `Trash/gather.ts:83-91,127-133` | — | Agent's choice; shown on the Trash entry and on a partial restore [Intended as N-1] |

##### Approaches

###### A · Keyed Journal and One Mutation Runner (03-01, 03-05, 03-03) — INFERRED
Each op is a descriptor `{ plan, record, order, commit }` run by one runner over a per-entity record store shared with Contexts (I-036), with `holders` as `sweepCount` of any plan.
- **Removes:** the unjournaled paths and `supersedes`, the `answered` replay branches, the renderer-carried record and `journalRecord`, `owedKeys` and its two siblings (one held-keys read), Clear's special check, the four count functions and the shape-sniffing `property:holders`, and three of four reply shapes; −100 to −150 net.
- **Costs:** a keyed record format, a rewrite of about 1,190 journal, replay, and wiring test lines (`replaySchemaCascade` 713, `journalWiring` 372, `propertyJournal` 102), and the chained-rename rule settled under B-1.
- **Risk:** crash-order semantics move; every op commits list-first [Intended as B-2] and is replay-tested again. Keyed records and one reply shape land first, the runner after.

###### B · The Stash, Fixed (Nathan's C-3 and C-6)
Remove keeps stripping a Collection's values into the stash and re-assign keeps putting them back [Intended as C-1]; the stash drops entries for pages that left (L-02), a partial Remove can be retried (03-03), and the vestigial `values` wrapper flattens under a name that says what it holds (08-06) [Intended as C-2]. It loses nothing under sync where its placement achieves that without a Sync rule, and otherwise per-page merging is a Sync rebuild input (03-02) [Intended as H-2].
- **Removes:** L-02's unbounded growth, 03-03's non-retriable strip, and the `values` wrapper.
- **Costs:** no live Nexus needs migrating (NexusOS holds no `property_cache` block or property Trash record, `~/Test` no property data); a relocation moves the stash's readers and writers (L-01's ~170 lines). Dormant stashed values aren't adopted or repaired while unassigned (`optionOps.ts:132`, `repairSweep.ts:31`).
- **Risk:** low for the fixes; a relocation's depends on the home.

###### C · Fold the Property Channels (03-07, 03-04, I-032)
`property:configure` replaces the five `defEditOp` channels, `property:setFormat` the two format setters, `property:reorder` absorbs `registry:reorder`, and `schema:add` runs as one locked hold; optionally all of it folds into `mutate`'s op union per I-032.
- **Removes:** five bridge entries and their handlers (`bridge.ts:144,149,155-171,177`); −25 to −40 · read.
- **Costs:** churn in `PropertyFrame.tsx`'s callers.
- **Risk:** low.

##### Cross-Domain Notes

- **Schema Surfaces:** `PropertyFrame.tsx:255-257,295-300` and `useOptionEdit.tsx:93,111-116` hold the renderer half of the four reply shapes (03-03).
- **Trash:** `holdings.ts` is Link-value work (I-033, I-068) this domain touches only through `parkLinks` in `restoreCachedValues`.
- **Catalog:** `uniqueOptionGroups` and `validateOptionValues` both compare through `normalizeTitle` (`schema.ts:77-90,100-112`), so they state one rule.

---

#### Scout 04 — Journals, Replays & Sweeps

Scouts 03 and 04 describe one machinery, so findings both raised sit once, under the ID pair (03-01 / 04-01 / 04-03, 03-03 / 04-13, 03-06 / 04-09, 04-06 / 03-12). **Live Nexus:** NexusOS's `.nexus/` holds no `property-cascade.json` or `context-rename.json`, `~/Test` holds an empty registry, and no `~/Benchmark-*` Nexus is on disk, so no stranded record constrains a redesign.

##### Inventory

| File / Symbol | Lines | Responsibility | Callers Outside the File | Belongs Here? |
|---|---|---|---|---|
| `Core/Properties/journalSlot.ts` · `journalSlot` | 49 | A one-record JSON slot in `.nexus/`: lock, strict read, refuse-or-displace, set aside a corrupt file, clear only its own record | `propertyJournal.ts`, `Contexts/contextJournal.ts` | No: generic infrastructure Contexts imports from Properties; belongs in `Core/Files`. `supersedes` has one caller (Contexts) |
| `Core/Properties/propertyJournal.ts` | 54 | The `SchemaJournal` union (4 ops), its decoder, the slot binding, and `schemaCascade` (the reply shape carrying `owed`) | `registryProperty`, `deleteProperty`, `optionOps`, `replaySchemaCascade`, `Properties/handlers` (`decodeSchemaJournal` as the channel narrow), `propertyWrite`, `Contract/bridge.ts:154` | Yes |
| `Core/Properties/replaySchemaCascade.ts` | 92 | Open-time and Try Again replay of the one property record, with a per-op "does disk still match" rule and an `answered` branch for renderer-handed records | `Nexus/handlers.ts:111`, `Properties/handlers.ts:176` | Yes |
| `Core/Properties/governedSweep.ts` | 212 | The shared multi-file engine: candidate reach, page + Space-sidecar sweep, dry-run count, undo, by-id sweep, the skipped-line string | 19 non-test importers, 8 outside Properties (Contexts ×2, Nexus ×2, Trash ×3, Settings ×1) | No: Nexus-wide (I-042) |
| ↳ `collectionFolders` | 36-40 | The folders a schema governs | `deleteProperty`, `replaySchemaCascade` | — |
| ↳ `governedReach` | 43-57 | Index candidates or the whole corpus, filtered to Collections + Archive | 7 files | — |
| ↳ `sweepGovernedRoots` | 88-139 | Lock → read → parse → rewrite → write per file; a second arm reads **every** Space sidecar found by disk scan | 11 files | — |
| ↳ `undoSweep` / `keysPutBack` | 151-182 | Put back what a sweep changed | `contextCascade.ts:179` only | — |
| ↳ `sweepRootsById` | 185-212 | Sweep by ID through `nexusPages().byId` | `assignment.ts:56`, `Trash/spend.ts:265` | — |
| ↳ `changedKeys`, `governedRoot`, `outsideArchive`, `unsweptLine`, `sweepCount` | — | Small helpers | `changedKeys`: `governedWrite.ts`; `governedRoot`: `Nexus/cascade.ts`; `outsideArchive`: `cascade.ts`, `keyHolders.ts`; `unsweptLine` (user copy): 7 files | `unsweptLine` is a notification string in an engine file |
| `Core/Properties/repairSweep.ts` · `runRepairSweep` | 45 | On open, behind Repair Properties On Open (default off, `personalization.ts:146`), reconciles exactly the files the index seed re-read | `Nexus/handlers.ts:113` | Yes; hand-rolls `pageWorldOf` (04-10) |
| `Core/Properties/propertyWrite.ts` | 30 | Window-side round trip: `write`, `replay(record?)`, `retryOwed`, `warnOwed` | `Schema/PropertyFrame.tsx`, `Schema/useOptionEdit.tsx` | Window-side in a host-mixed folder (I-042) |
| `Core/Properties/keyHolders.ts` · `confirmedKeyHolders`, `keyedHolders` | 66 | Read-only holder enumerators: a disk-confirmed holder list (pages + every Space sidecar) and values-by-ID for a strip | `registryProperty.ts:126-128`, `deleteProperty.ts:142`, `removeProperty.ts:40` | No: index-adjacent (I-042 proposes `Core/Index`) |
| `Core/Properties/registryProperty.ts` (journal parts) | 77-100, 170-207 | `createProperty`'s two journal guards; `rekeyProperty` writes the record and ignores the slot's refusal | 03 | — |
| `Core/Properties/deleteProperty.ts` (journal parts) | 112-161 | Bundle snapshot → journal (refusal ignored) → strip → unassign → config reach → registry **last** | 03 | — |
| `Core/Properties/optionOps.ts` (journal parts) | 78-110, 144-151, 236-266, 340-386 | `owedKeys` guard, `OWED` refusals when the slot refuses, Clear's own-property refusal | 03 | — |
| `Core/Contexts/contextJournal.ts` | 49 | The `RenameJournal` record, its decoder, and `same`/`sameEntity` | `contextCascade.ts` only | The Contexts twin of `propertyJournal.ts` |
| `Core/Contexts/contextCascade.ts` | 352 | Context and Space rename ops (+ a `from` Try Again path), `replayPendingRename`, and the unlink sweeps the Trash delete uses | `Nexus/handlers.ts:86`, `Nexus/mutate.ts`, `Trash/delete.ts` (`unlinkContextKey`, `unlinkSpaceValue`), `Trash/spend.ts` (`rekeyContext`) | Mostly; the unlink sweeps are the Trash's delete half |
| `Core/Nexus/handlers.ts` · `openNexusSequence` | 57-118 | The open path: two replays at two points (`:86`, `:111`), the repair sweep, whole-Nexus option registration (`:113-115`) | — | Yes |
| `Core/Nexus/configReach.ts` | 420 | Rewrites saved views, View Tiles, the Matrix filter, and Open In Preview for an option, property, or container edit (a `ROLES` table over `SavedView`) | `deleteProperty`, `removeProperty`, `optionOps`, `Trash/delete`, `Trash/spend`, `replaySchemaCascade` | Mostly Views knowledge; may belong beside `Core/Views` (inferred) |
| `Core/Nexus/cascade.ts` (property parts) | 64-68, 96-169, 271-274 | `spaceArm` (tree-gated sidecar arm), `deleteCascade`'s Link strip, Link-cache edits on a re-spell | Trash, settle, mutate | Yes |
| `Core/Nexus/settle.ts` (property parts) | 161-168, 282-305 | Registers held Multi-Select options at each settle, plus `returningCascade` for a restore | — | `returningNames` (`:269`) is exported only for `settle.test.ts` |
| `Core/Trash/restoreScrub.ts` | 213 | Reconciles returning content against the live world (`currentKeys`, `scrubReturning`) and repairs a landed artifact's links (`repairLanded`) | `spend.ts`, `settle.ts:302` | Yes; two hand-rolled sidecar loops |
| `Core/Trash/spend.ts` (property parts) | 101-109, 191-245 | The property-bundle restore arm, the Context re-key loop (`:194-197`), and Link refill | `Nexus/mutate.ts` | Yes |
| `Core/Trash/holdings.ts` · `refillTrashed` | 68-86 | Writes Link values back into trashed copies, one file per sweep call | `spend.ts` | Yes |
| `Core/Trash/restoreProperty.ts` | 78 | Re-creates a property from its bundle via `createProperty`, which consumes a journaled delete | `spend.ts:103` | Yes |
| `Core/Trash/delete.ts` (write-ahead block) | 84-140 | The bundle record written before any sweep; no open-time replayer ("delete again finishes it", I-036) | `Nexus/mutate.ts` | Yes |
| `Core/Bundles/record.ts` (property entity) | 73, 94 | The artifact-less property bundle: def, values by ID, assignments, caches, `partial` | Trash | Yes |

**Describers:** `propertyJournal.test.ts:47` ("never displaced") and `journalWiring.test.ts:306-319` ("an unrelated op neither displaces") pin one slot rule twice; the generic slot's unreadable/corrupt behavior is tested only through the property binding (`journalWiring.test.ts:321-345`); `cascadeRace.test.ts` is one 85-line test whose `describe` carries "F1 —" (`:58`); `contextJournal.test.ts` is one 20-line test of the decoder's title check.

##### Mechanism Map

**Journals (write-ahead records): three in kind, two replayed.**
- **J1 `property-cascade.json`** (`propertyJournal.ts:42`): rename, delete, option-rename, and option-remove, in one slot.
- **J2 `context-rename.json`** (`contextJournal.ts:45`): Context and Space renames, in one slot that supersedes for the same entity.
- **J3 the Trash bundle record** (`Trash/delete.ts:84` "Write-ahead:"; for a property, `deleteProperty.ts:120` `snapshot`): a snapshot rather than an intent, and nothing replays it.

A property delete writes both J3 and J1 (`deleteProperty.ts:120-123`).

**Replayers: four entry points.**
- **R1 `replaySchemaCascade`:** at open (`handlers.ts:111`, after the index seed, only for a new root) and as Try Again (`Properties/handlers.ts:176`, taking a record the renderer hands back, `answered = true`).
- **R2 `replayPendingRename`:** at open (`handlers.ts:86`), before the tree and the index seed, on every open including a re-point.
- **R3 `renameContextOp` / `renameSpaceOp` with `from`:** the Context Try Again (`contextCascade.ts:207-211, 260-264`; `mutate.ts:68-76`); re-derives the sweep and bypasses the journal.
- **R4 the `'owed'` refusal → `replay()` with no record:** replays whatever the slot holds (`propertyWrite.ts:14-15`).

**What each journal defends:**
- **J1 rename / option-rename:** the window between the registry commit and the end of the sweep; without the record, files still holding the old key become foreign once the registry names only the new one (`registryProperty.ts:170` docblock; `optionOps.ts:241`).
- **J1 delete / option-remove:** a strip cut short. For option-remove the def's option list still holds the key and the record says to finish the strip (`replaySchemaCascade.ts:76`); for delete the record carries the key and the registry drop lands regardless of skips (`deleteProperty.ts:159`; the replay's freed arm, `replaySchemaCascade.ts:55`).
- **J2:** the window between the folder relocate and the registry title commit (`contextCascade.ts:193`); the replay finishes the relocate, the cascade, and the commit (`:304-320`).
- **J3:** nothing at open; a delete cut short leaves its bundle, and deleting again finishes it.
- **Reachability:** the common producer is a skipped file rather than a crash — a lock or write that throws (`governedSweep.ts:66-70`), a file unreadable at read time (`:99-101`), or an evicted cloud placeholder (`atomicWrite.ts:140` comment) — each leaving a record owed for Try Again or the next open, on any iCloud-backed Nexus. A force-quit or power loss during a long sweep is plausible at Benchmark scale and rare at NexusOS scale (inferred). The corrupt-slot and unreadable-slot guards (`journalSlot.ts:36-38`) defend a damaged `.nexus/` file.

**Write loops (enumerate → lock → read → decide → write): 13 in 10 functions.**
1. `sweepGovernedRoots`, its pages arm (`governedSweep.ts:96`)
2. Its Space-sidecar arm (`:118`)
3. `undoSweep` (`:153`)
4. `reachConfig`'s containers (`configReach.ts:378`)
5. Its archived Sets (`:380`)
6. Its tile docs (`:393`), plus two config files (`:402-417`)
7. `unassignAndPurge` over every Collection (`deleteProperty.ts:154`)
8. `editCaches` (`propertyCache.ts:52`)
9. `scrubReturning`'s sidecars (`restoreScrub.ts:183`)
10. `repairLanded`'s sidecars (`restoreScrub.ts:208`)
11. `restoreTrashed`'s Context re-key (`spend.ts:194`)
12. `refillTrashed` (`holdings.ts:83`, one `sweepGovernedRoots` call per file)
13. `rewriteTileConnections` (`tilesFile.ts:304`)

`assetMigrate.ts:117` is a fourteenth, outside the domain, and a fourth caller of `spaceSidecars`. Loops 9-12 are hand-rolled sidecar writers beside an engine that has a sidecar arm.

**Read-only enumerators: 12.** `nexusCorpus` (`indexSeed.ts:73`); `governedReach` (`governedSweep.ts:43`); `collectionFolders` (`:36`); `spaceSidecars` (`spaceSidecar.ts:50`, a disk scan); `sweepMembers` (`contextCascade.ts:65`, index or corpus, not through `governedReach`); `confirmedKeyHolders` (`keyHolders.ts:14`, two loops, every Space sidecar again); `keyedHolders` (`:38`); `snapshot` (`deleteProperty.ts:63, 74`, every Space sidecar again); `registerHeldOptions` (`optionOps.ts:125-141`); `artifactFiles` (`restoreScrub.ts:123`); `trashedHolders` (`holdings.ts`); `archivedSets` / `archivedSetIds` (`configReach.ts:325-345`).

**Frozen and live world builders: 9.** `contextWorldOf` (`contextResolve.ts:27`, memoized); `governedWorld` (`:47`); `spaceWorldOf` (`:56`); `pageWorldOf` (`contextWrite.ts:75`); `runRepairSweep`'s per-folder map (`repairSweep.ts:22-35`, a hand-rolled `pageWorldOf`); `scrubReturning`'s destination world (`restoreScrub.ts:145`, the same shape); `currentKeys` (`restoreScrub.ts:54`, a key/word matching world); `linkWorld` + `frozenWorld` after `nexusPages`, built fresh at three sites (04-11); `deleteCascade`'s `after` index (`cascade.ts:111`, `linkWorld` minus the deleted subtree).

**One Pattern Each:** J1/J2 and R1-R4 are one "intent record → finish forward" pattern split across two vocabularies, two open points, and three Try Again forms; write loops 2 and 9-12 are one "rewrite named Space sidecars" pattern; `pageWorldOf`, the repair map, and `scrubReturning`'s world are one builder; the `frozenWorld(linkWorld(...))` sites are one builder. I-036's footnote source (`.claude/Planning/Data Layer — Investigation Reports/E — Governed Data Sweeps.md`) doesn't exist, so its "nine loops and five enumerators" can't be checked; this count stands in its place.

##### Findings

###### 04-02 · A Property Delete Commits the Registry Last for No Reason the Record Needs, and That Order Creates the Crash/Restore Ambiguity
- **Now:** `stripAndRemove` removes the definition unconditionally after the strip (`deleteProperty.ts:159`). The replay's delete arm then tells "def present = crash" from "def present = a restore" with `crashed = !answered && def.key === journal.key` vs `freed` (`replaySchemaCascade.ts:52-56`), plus `createProperty` consuming the record on a restore (`registryProperty.ts:94-100`, tested at `journalWiring.test.ts:274-304`), without which the `crashed` arm would strip a restored living property at the next open (`registryProperty.ts:94` comment). The "a strip that could not read every holder defers the registry drop" rationale belonged to option removal (`13d7215d2`, `removeOption`'s docblock; last seen in `e5c619124`), which still defers (`optionOps.ts:228-229`); the property delete has dropped its def regardless of skips since `13d7215d2`. The record carries the key (`propertyJournal.ts:11`), so the replay never needs the def to find it. Registry-last also opens A-01's window.
- **Better:** Registry first, as rename commits (`registryProperty.ts:170` docblock) [Intended as B-2]. The replay keeps only the `freed` arm, and the `crashed`/`answered` logic and the create-side consumer go, since a restored or re-created def under the key makes `freed` false on its own. Removing the consumer before keyed records would leave a re-created property's record holding the single slot and blocking other properties' option ops (L-07), so it lands with 03-01.
- **Behavior:** Inside the crash window only, a crashed delete's property leaves the panel at once instead of lingering until the next open. A crash between the bundle mint and the registry drop leaves a Trash record for a living property, as a crash before the journal write does today.
- **Estimate:** −15 · read (the order and the key), inferred (the replay simplification)

###### 04-04 · `RenameJournal.skipped` Is Written and Decoded but Never Read
- **Now:** `settleJournal` rewrites the record with the skip list (`contextCascade.ts:183-186`) and the decoder parses it (`contextJournal.ts:30-32`), but every replay re-derives members from `queryMembers ?? nexusCorpus` (`contextCascade.ts:72`) and nothing reads `j.skipped`. The header's "persisting the skip list updates the held record" (`contextJournal.ts:1`) is the only reason `same` excludes it (`:36-40`).
- **Better:** Drop the field; `settleJournal` becomes "clear if nothing skipped", as the property ops do (`registryProperty.ts:204`), and the header is rewritten.
- **Estimate:** −12 · read

###### 04-05 · Space Sidecars Are Found by Disk Scan on Every Property Sweep and Written by Four Hand Loops, While the Tree Already Knows Them
- **Now:** `sweepGovernedRoots`' sidecar arm reads every Space sidecar `spaceSidecars`' folder scan finds (`governedSweep.ts:116-137`; `spaceSidecar.ts:50-57`). Property plans set that arm unconditionally (`registryProperty.ts:115`, `optionOps.ts:204`, `deleteProperty.ts:144`, `contextCascade.ts:76`), while `spaceArm` (`cascade.ts:65-68`) and `sweepRootsById` (`governedSweep.ts:208`) gate it from the tree. `confirmedKeyHolders` (`keyHolders.ts:24`) and the delete `snapshot` (`deleteProperty.ts:74`) scan again, so one property delete scans every sidecar three times (count preview, snapshot, strip). `scrubReturning` (`restoreScrub.ts:183-192`), `repairLanded` (`:208-211`), the Context re-key (`spend.ts:194-197`), and `refillTrashed` (`holdings.ts:83-85`) each hand-roll `rmwJsonStrict` over named sidecars with three failure accountings: `scrubReturning` and `refillTrashed` discard the result, the other two count it, and `scrubReturning` refuses the whole restore when a page skips (`restoreScrub.ts:180`). The writers agree underneath: `rmwJsonStrict` → `writeJson` → `atomicWriteFile(jsonText)` (`atomicWrite.ts:97, 141-160`) is the sweep arm's lock, echo, and re-dating (`governedSweep.ts:119,133-134`), differing only in how a read miss is classed (`readJsonStrictly`'s absent/unreadable/corrupt vs `readTextOrNull` + `parseJsonObject`).
- **Better:** `sweepGovernedRoots` takes sidecar paths in its `files` list and dispatches by basename, as `governedRoot` (`:63`) and `keysPutBack` (`:174`) already do. Property and Context sweeps pass the Spaces the tree says hold the key (`s.values`, as `spaceArm` reads); loops 9-12 pass the artifact's own sidecar paths (`artifactFiles`, `spaceSidecarsIn`). That retires `spaceSidecars`, `spaceArm`, the separate `sidecars` plan field, and loops 9-12, with one skip accounting; the value write stays on `rmwJsonStrict` (`contextWrite.ts:85`). I-036's *Solution* proposes the tree-sourced half, conditioned on one commit order and a replay that runs once the tree is held (04-07).
- **Behavior:** A sidecar write failure in a restore scrub or refill becomes a counted skip reported as a warning, and the restore still lands [Intended as G-3]. Pages and Spaces find holders through one mechanism [Intended as G-1]; tree-sourcing Spaces trades the disk truth `keyHolders.ts:13` and `spaceSidecar.ts:49` defend (an outside edit not yet settled; a Context folder a rename moved ahead of the tree) for the consistency pages already have through `queryKeyHolders`.
- **Estimate:** −35 · read (sites), inferred (delta)

###### 04-06 / 03-12 · Every Open Re-Checks Every Page Under Every Multi-Select Collection
- **Now:** `handlers.ts:113-114` runs `registerHeldOptions(root)` with no `rels`, its only such caller (`settle.ts:163` passes changed paths). It walks `everywhere` (`optionOps.ts:125-141`): every Collection and Set carrying a Multi-Select, a `readPageRecord` per page whether the page holds the key or not, under the schema lock, on every open. `readPageRecord` is a `cachedParse` (`readNexus.ts:134-140`), so after the open walk the per-page cost is one `stat` plus a fresh read only where the file changed; Spaces come from the tree (`optionOps.ts:136`). The settle already registers changed files incrementally, and the index holds every page's values (`Platform/stores.ts:45-48`, `readPageRelations`). Added in `7a4452592` (10-04), documented at `PropertiesPM.md:74`. NexusOS holds three Multi-Select definitions.
- **Better:** Read members from the index (`readPageRelations(paths).pages[*].values`), ready at that point (the seed has run, `handlers.ts:108`): one query in place of N stats. Narrowing to `reread.rels` instead drops the catch for a registry edited while closed, which is a decision. 03-12's per-definition `queryKeyHolders(def.key)` still reads files.
- **Estimate:** −5 · read (the walk); that `PageRelations.pages[*].values` holds every front-matter value is inferred from the type (`stores.ts:47`) and `indexSeed.ts:63`'s comment. Scale unmeasured.

###### 04-07 · Two Replays at Two Points of the Open, and the Context One Runs Blind
- **Now:** `replayPendingRename` (`handlers.ts:86`) runs right after `ctx.openStores` binds a fresh store (`:85`), before `readNexus` (`:89`) and `seedContentIndex` (`:108`). `indexReady()` compares the bound store with the one the last seed marked (`contentIndex.ts:43-50`; `indexSeed.ts:243`), so `queryMembers` returns null and the replay sweeps the whole corpus (`contextCascade.ts:72`). It also runs on a re-point, where `replaySchemaCascade` (`:111`) doesn't.
- **Better:** One replay step after the seed, inside the `root !== priorRoot` block, dispatching every owed record (with 03-01). The Context folder relocation the replay does (`contextCascade.ts:312-313, 342-348`) then needs a tree re-read after it, which is likely why it sits early (inferred).
- **Estimate:** ±0 (saves the blind corpus pass, adds a tree read when a relocation is owed) · read

###### 04-08 · Four Try Again Vocabularies
- **Now:** A property cascade replays a carried record (`propertyWrite.ts:6, 22-23`; `PropertyFrame.tsx:244, 300`). The `'owed'` refusal replays whatever the slot holds (`propertyWrite.ts:14-15`). A Context or Space rename resends the request with `from` (`mutate.ts:68-76`, `nexusSlice.ts:255-257`) through a second op path (`contextCascade.ts:206-211, 259-264`, `sweepAgain` at `:101-109`); `MutateOutcome.retry` (`mutateRequest.ts:22`) has this one producer (`mutate.ts:76`). Remove and Clear offer none: a plain `fault` (`handlers.ts:62-65` `unsweptReply`; `optionOps.ts:352`).
- **Better:** One `replay(entityId)` everywhere with 03-01; the `from` branches, `sweepAgain`, and `MutateOutcome.retry` leave.
- **Behavior:** Remove and Clear gain Try Again (03-03) [Intended as B-1, C-2].
- **Estimate:** −30 · inferred

###### 04-10 · `runRepairSweep` Hand-Rolls `pageWorldOf` With an Async Memo the Tree Makes Unnecessary
- **Now:** `repairSweep.ts:22-35` keeps a `defsByFolder` map and awaits `assignedDefs` per folder. `assignedDefs` answers from the held tree when it can (`assignment.ts:38-41`), `liveTreeOf` already returned that tree (`repairSweep.ts:24`), and the folder comes from `owningCollection` on the same tree (`:27-28`), so its disk fallback is unreachable here. `pageWorldOf` (`contextWrite.ts:75-79`) and `scrubReturning` (`restoreScrub.ts:145`) build the same world.
- **Better:** A synchronous `governedWorld(tree, byKey(containerSchema(tree, rel)))` per file (`treePatch.ts:126-129`), as `registerHeldOptions` reads the schema (`optionOps.ts:132`); one builder serves all three sites.
- **Estimate:** −12 · read

###### 04-11 · `frozenWorld(linkWorld(tree, archived))` After `nexusPages` Is Built Three Times
- **Now:** The fresh chain appears at `assignment.ts:81,90`, `restoreProperty.ts:57-58`, and `spend.ts:114,129-130` (the last with `back` and `targets`); `spend.ts:229` re-wraps an existing `world` or a settled tree's `linkWorld`. `deleteCascade` builds the same index minus the deleted subtree (`cascade.ts:110-111`).
- **Better:** One `frozenOf(root, tree, { more, targets })` in `heldPages.ts` returning `{ byId, archived, frozen }`, worth doing only alongside 02-04's move of `Frozen`/`frozenWorld` out of the codec, since three two-line sites against a new helper is close to even.
- **Estimate:** −2 to −4 · read

###### 04-12 · I-039's Race Is Closed for the `mutate` Ops
- **Now:** Since `c8e4b18ca` (10-17), `rename` and `movePage` run through `addressed` → `inSettleTurn` (`mutate.ts:91-96, 125-126, 210-211`), and a Space or Context delete through `underContexts(() => inSettleTurn(...))` (`:131-134`), both on the one `inTurn` queue (`settle.ts:65, 241-245`), so I-039's "nothing orders them" (`IssuesPM.md:839`) no longer holds for the app's page rename and move. Sync's arrival rename (`Sync/Arrival/land.ts:135`), adoption's renames (`Nexus/adopt.ts:56, 126`), and outside moves aren't on that queue, and `undoSweep`'s `now === null` pass-over (`governedSweep.ts:156`) still applies to them.
- **Better:** Re-scope I-039 to Sync arrivals, adoption renames, and outside moves during a refused delete.
- **Estimate:** one Issues edit · read

###### 04-14 · The Shared Engine and Slot Live in Properties
- **Now:** `governedSweep.ts` is imported by Contexts (`contextCascade.ts`, `spaceSidecar.ts` type-only), Nexus (`cascade.ts`, `configReach.ts`), Trash (`holdings`, `restoreScrub`, `spend`), and Settings (`exclusionScan.ts`). `journalSlot.ts` is imported by Contexts. `unsweptLine`, a user-facing string, lives in the engine and is imported by `configReach.ts:25` among others.
- **Better:** `journalSlot.ts` → `Core/Files` (its imports are Files, Platform, and Paths, `journalSlot.ts:2-4`). `governedSweep.ts` can't go to `Core/Files`, which imports nothing above Nexus leaf utilities, since it reads the Nexus tree, the Index, and Contexts (`governedSweep.ts:8-21`); `Core/Nexus` beside `Nexus/governedRoot.ts` is the recommended home. `unsweptLine` moves beside the notification copy or `CascadeReport`, and I-042 part (2) (`IssuesPM.md:1013`) is re-scoped to match.
- **Estimate:** ±0 · read

###### 04-15 · Context Sweeps Choose Their Candidates Differently From Property Sweeps
- **Now:** `sweepMembers` uses `queryMembers ?? nexusCorpus` (`contextCascade.ts:72`) over every content file in the watch scope (`indexSeed.ts:73-75`), while property sweeps filter through `governedReach` to Collections + Archive (`governedSweep.ts:43-57`), as `deleteCascade` does (`cascade.ts:129`). `sweepParse` admits any identity short of unknown, identity-less pages included, regardless of location (`pageFile.ts:252-260`), so a Context rename or delete rewrites a tag on a page outside every Collection and a property sweep doesn't. NexusOS's `Agenda/II. Tasks/PM-QuickFilter.md` sits outside its six live Collections and holds a Context-titled key.
- **Better:** One reach mechanism for properties and Contexts [Intended as G-1] whose stated rule, written where it reads it, is that a change reaches every file where its key means something: a property key on the pages of Collections and the Archive, and a Context tag on any content file [Intended as G-2].
- **Estimate:** −2 or +1 (a comment) · read

###### 04-16 · Slot Tests Are Duplicated and Filed Under the Property Binding
- **Now:** `propertyJournal.test.ts:47-58` overlaps `journalWiring.test.ts:306-319`; the generic slot's unreadable/corrupt rules are tested only through `writeSchemaJournal` (`journalWiring.test.ts:321-345`); `cascadeRace.test.ts:58` carries "F1 —".
- **Better:** One slot test file beside the slot, wherever 03-01 lands it, with the op-wiring tests kept op-specific.
- **Estimate:** −30 test lines · read

###### A-01 · A Property Delete's Registry-Last Order Lets an App Value Write Land on a Page Its Strip Already Passed — INFERRED
- **Now:** A page value write reads the definition inside the page's own lock, outside the schema lock (`setProperty.ts:67-71`; `mutate.ts:198-202`). During a delete the def stays in the registry until after the strip and the config reach (`deleteProperty.ts:153-159`), so a write to that property on an already-stripped page finds the def, lands the key, and is left behind once the def drops: a value of a deleted property, outside every schema, that no record owes. Rename avoids this by committing registry-first, which the page-lock comment relies on (`setProperty.ts:67`).
- **Better:** 04-02's registry-first order, under which the write answers `NO_PROPERTY`.
- **Behavior:** Changes only in the race window.
- **Estimate:** 0 beyond 04-02 · inferred (a reproduction settles it)

##### Behavior Ledger

| Behavior | Where | Origin | Classification |
|---|---|---|---|
| Option rename or remove is refused while any other change's record is owed | `optionOps.ts:242, 377`; `propertyWrite.ts:14-15` | `cb2f3a8a0` (MetadataV3 Task 6-4) | **Agent's choice**, protecting the one slot (03-01) |
| Clear is refused while its own property's option record is owed | `optionOps.ts:346-348` | `cf4dee4e6` (Phase 9 review) | **Agent's choice**; survives 03-01 as the per-entity rule |
| Rename, Label Format change, and delete run unjournaled while the slot holds another record | `registryProperty.ts:183`, `deleteProperty.ts:123` | The `e744714fc` slot refusal plus the `journalSlot.ts:1` header | **Accident**; crash safety silently lapses |
| Option remove offers Try Again only while its record holds the slot | `replaySchemaCascade.ts:76-79`; `PropertiesPM.md:123` | `6e2d61669` | **Agent's choice** forced by the single slot |
| A create steps aside from an owed rename's old key | `registryProperty.ts:63,77-78` (`freeLabel` `owed`) | `cf4dee4e6` (Phase 9 review) | **Agent's choice**; survives as "owed old keys count as held" |
| A later rename of the same Context or Space displaces the earlier rename's owed record, so after a restart the first rename's leftovers are never swept (the in-session `from` Try Again covers them until then) | `journalSlot.ts:18-19, 37`; `contextJournal.ts:42-45`; `mutate.ts:68` | `supersedes`, predating the `759a2dbef` monorepo move | **Agent's choice** with a stated reason (a replay that trusts the record's before-state, `journalSlot.ts:18`); the post-restart loss is the **accident** |
| A Space or Context delete that misses a member puts everything back and refuses, while every property op proceeds and owes | `contextCascade.ts:166-181`; `optionOps.ts:228-229`; `deleteProperty.ts:125-128` | `contextCascade.ts:166` comment ("A refused delete leaves no record to restore from") | **Agent's choice**; every delete finishes what it can and offers Try Again [Intended as B-3] |
| A property delete with skipped files still removes the definition, leaving the stragglers to the replay's freed arm | `deleteProperty.ts:159`; `replaySchemaCascade.ts:55` | The shape since `13d7215d2` | **Agent's choice** |
| An option remove that skipped a file leaves the option and every view reference in place | `optionOps.ts:228-229` | MetadataV3 Task 6 | **Agent's choice**, coherent with pages-first |
| Remove-from-Collection with skipped files has no Try Again, and a re-run does nothing | `removeProperty.ts:33, 60-61`; `handlers.ts:62-65` | `874f687d2` | **Accident** (03-03; 03 L-09) |
| A Context or Space delete cut short by a crash has no recovery until the user deletes again | `Trash/delete.ts:84` | I-036 | **Agent's choice** |
| Every open registers held Multi-Select members from every file | `handlers.ts:114`; `optionOps.ts:125-141` | `7a4452592`; `PropertiesPM.md:74` | **Agent's choice**, the only catch for a registry edited while closed; its cost is the issue (04-06) |
| A corrupt journal is set aside as `.property-cascade.json.bad-<id>` in `.nexus/` and never cleaned | `journalSlot.ts:38`; `atomicWrite.ts:220-221` | `e744714fc` (F-051) | **Agent's choice**, and the shared policy for strict JSON files (`updateNexusFile`, `atomicWrite.ts:225`), so any cleanup rule is Nexus-wide; it leaves litter in a user-legible folder |
| A Context replay that finds the freed old title re-minted by another Space discards the record | `contextCascade.ts:337-340` | Contexts journal arc | **Agent's choice**, defensible |

##### Approaches

###### A · One Owed-Work Ledger — INFERRED
I-036's shape: every property, Context, and Space keeps its own record, and every change that rewrites many files writes one [Intended as B-1]. One `.nexus/` file maps entity → record, with kinds rename, delete, option-rename, and option-remove for properties and rename for Contexts and Spaces; one decoder, one `op`-dispatched replay at one open point after the seed (04-07), one Try Again (`replay(entityId)`), and one rule: an op on an entity waits on or composes with its own record, and every record's old keys count as held (03-01). A create on an owed delete's key is refused with the general unfinished-change message, and its Try Again re-runs that cleanup [Intended as B-4].
- **Removes:** `contextJournal.ts` (folded into a record kind); `supersedes` and the `answered` branches; both `OWED` refusals and the unjournaled paths; the `record?` channel argument and its narrow; the `from` Try Again path, `sweepAgain`, and `MutateOutcome.retry`; the `createProperty` consumer (with 04-02) and `RenameJournal.skipped`. About −120 to −180 production, with comparable test shrinkage.
- **Costs:** One commit order. Property rename commits registry-first, so a value written mid-sweep lands under the new key (page value writes resolve the def inside the page lock, `setProperty.ts:67`; `NEW_KEY_IS_FRESHER` resolves collisions). Context rename commits registry-last, so a tag written mid-cascade lands under the old key with a `'merge'` collision rule (`contextCascade.ts:32-33`); app tag writes serialize under `underContexts` (`mutate.ts:81-89`), so the order matters mostly for outside writes. Registry-first everywhere [Intended as B-2] makes every replay "sweep only" and retires Context rename's `'merge'` rule.
- **Risk:** The replay still runs before the tree is trusted when a Context folder relocation is owed. Sync excludes both journal files (`exclusion.ts:58`), so the ledger stays per device.

###### B · The Trash Bundle as Every Delete's Write-Ahead Record
A bundle record gains a `pending` phase its op clears once the sweep lands, and the open replays pending bundles, finishing a property, Context, or Space delete's strip, folder move, and config reach.
- **Removes:** J1's delete kind and its replay arm, and the double write-ahead in `deleteInner` (bundle and journal); adds the crash recovery Context and Space deletes lack (I-036).
- **Costs:** An open-time scan of `.trash` records (O(bundles) unless indexed). System Trash mode mints no bundle for content deletes (`delete.ts:79-82`), so those still need a ledger entry and B composes with A rather than replacing it; a property delete mints its bundle in every mode (`deleteProperty.ts:46`, 03 L-11).

###### C · No Crash Journaling; In-Session Owed Records Plus Idempotent Re-Run — INFERRED
Keep `skipped` → Try Again in memory only, and make every op idempotent so re-issuing it finishes the work.
- **Removes:** Both journal files, both replayers, the slot, and every guard in 03-01 (about −300).
- **Risk:** A crash during a long sweep leaves keys orphaned until the user redoes the change, and a rename re-run can't recover once the old key is gone from the registry; rejected in the decision log (*§Rejected*).

##### Cross-Domain Notes
- **03:** `configReach.ts` is mostly Views knowledge (the `ROLES` over `SavedView`) living in `Core/Nexus` (inferred).
- **02:** `owedKeys` filtering in adoption is Values behavior gated by this domain's slot; `reconcileGovernedRoot`'s `skip` parameter exists for `governedWrite.ts:13` and `restoreScrub.ts:186`, the in-transit Context key.
- **08:** The open sequence runs `settleNow` twice around the repair sweep (`handlers.ts:112, 115`).
- **Settle:** `returningNames` (`settle.ts:269`) is exported only for its test.
- **Issues:** I-036 holds; its footnote's report path is missing and its two-replay citation `handlers.ts:82,102` is now `:86,:111`. I-042 holds for `governedSweep`, `journalSlot`, and `keyHolders`.

---

#### Scout 05 — Schema Surfaces

The Collection Settings ▸ Properties pane, its type editors, and the option editor. Every line count, caller list, and "exported but unread" claim in the inventory was checked by `git grep`.

##### Inventory

| File / Symbol | Lines | Responsibility | Callers Outside the File | Belongs Here? |
|---|---|---|---|---|
| `Core/Properties/Schema/PropertyFrame.tsx` | 521 | The pane: the list, the type picker, and each property's editor | `Core/Views/Settings/SettingsFrame.tsx:13,158` | Yes, but it also writes view `column_styles` (`:260-262`) and the rename store slice (05-09) |
| ↳ `ListGroups` | `:77-175` | The assigned rows and the All Properties disclosure | Itself | Yes |
| ↳ `SETTINGS` record | `:341-394` | Dispatches each property type to its editor | Itself | Yes; every editor has its own structure (05-01) |
| ↳ `create`, `rename`, `setFormat`, `remove`, `handleDrop`, `editorMenu`, `rowMenu` | `:234-307` | The writes the pane sends through `dialer()` | Itself | Mostly; `editorMenu`'s delete flow belongs in `confirmations.ts` (05-05) |
| `Schema/OptionEditor.tsx` | 122 | The grouped option list: drag, ghost create, + per group, group relabel | `PropertyFrame.tsx:328` | Yes |
| `Schema/useOptionEdit.tsx` | 216 | The one option-edit hook: popup state, rename keys, the draft, the menu, moves, and writes; also holds `OptionDraft` | `PropertyPicker.tsx:14,311`, `MassPropertyPicker.tsx:4` (type only), `OptionEditor.tsx` | Yes; `OptionDraft` is a component in a hook file, and `OptionEditApi`/`OptionDef` are exported with no outside importer |
| `Schema/OptionEditPopup.tsx` | 107 | The per-option popup: icon, title, color grid, Appearance | `useOptionEdit.tsx:158` | Yes; its icon-plus-title and footing rows restate kit shapes (05-07) |
| `Schema/option-edit-popup.css.ts` | 69 | The popup's field row, icon seat, and footing row | `OptionEditPopup.tsx` | Mostly restates kit styles (05-07) |
| `Schema/OptionRow.tsx` | 57 | Exports `OptionSlot`: chip, compact title, and pen | `OptionEditor.tsx:11,101` | The file name doesn't match its export |
| `Schema/option-row.css.ts` | 8 | One class (`compactTitle`) | `OptionRow.tsx` | Belongs beside `optionLead` in `UIX/Menus/frames.css.ts` or in OptionRow's file |
| `Schema/GhostOptionChip.tsx` | 59 | The "New Option" ghost chip, plus `useGhostOptionAnchor` | `OptionEditor.tsx`; `PropertyPanel.tsx:45,282` uses the hook for property add rows | The hook is redundant and misnamed for its second caller (05-06) |
| `Schema/FormatRows.tsx` | 56 | The Label Format and Value Format picker rows | `PropertyFrame.tsx:447` | Yes |
| `Schema/NumberEditor.tsx` | 146 | Number family, currency, separators, decimals, fraction, and the per-view Style row | `PropertyFrame.tsx:368` | Yes; own container and spacing (05-01, B-05-01) |
| `Schema/number-editor.css.ts` | 9 | A spacing rhythm meant to stay correct when a row collapses | `NumberEditor.tsx` | Belongs to the shared editor container once the rule works |
| `Schema/CheckboxEditor.tsx` | 52 | Checkbox color (definition) and Style (view) | `PropertyFrame.tsx:360` | Yes; `CheckboxLook` is exported for its test only |
| `Schema/DateTimeEditor.tsx` | 65 | Date, Day, and Time rows (all view `column_styles`) | `PropertyFrame.tsx:357` | Yes; its inline layout `style` is the domain's only static one |
| `Schema/LinkEditor.tsx` | 63 | Underline, Color, and Format, all on the definition | `PropertyFrame.tsx:349` | Yes |
| `Schema/FileEditor.tsx` | 46 | The file directory field | `PropertyFrame.tsx:376` | Reads `useSession` itself while its Browse logic lives in the parent (05-12) |
| `Schema/linkFormatOptions.ts` | 8 | `LINK_FORMAT_OPTIONS` | `LinkEditor.tsx:4`, `Core/Settings/frames.ts:13,552` | No; its sibling `DATE_FORMAT_OPTIONS` lives in `columnStyles.ts:48`, and `lookOptions(LINK_DISPLAYS)` already builds it (08-09 / 05-04) |
| `Core/Properties/paneDrop.tsx` | 118 | The two-zone membership drag spec (`paneSpec`, `PaneAllGroup`, `PaneDrop`) plus `nexusReorderIndex` | `PropertyFrame.tsx:53`, `Views/Settings/VisibilityFrame.tsx:15`, `PropertyPanel.tsx:9` (`nexusReorderIndex` only) | No; imports nothing from Properties (05-08) |
| `Core/Views/Settings/OptionOrderList.tsx` | 107 | A view's bucket order for an option-typed group or sort, plus `rowEye`, `SUB_LOOK`, `HideControls` | `GroupFrame.tsx:72,319,415,528`, `SortFrame.tsx:14,220` | The list belongs in Views; the three helpers don't belong in a file named for options (05-10) |
| Tests: `PropertyFrame.test.tsx` 614, `PropertyFrame.dateTime.test.tsx` 108, `OptionEditor.test.tsx` 572, `NumberEditor.test.tsx` 71, `CheckboxEditor.test.tsx` 93, `DateTimeEditor.test.tsx` 77, `paneDrop.test.ts` 200, `OptionOrderList.test.tsx` 133 | — | — | — | 05-13 |

**Kit Use:** The surfaces use `FrameSlide`, `MenuScrollFrame`, `MenuTopRow`, `MenuFooting`, `FootingItem`, `MenuIndex`, `pickerRow`, `MenuRowView`, `PickerMenu`, `ColorGrid`, `PickerControl`, `LineZone`/`LineGroup`/`LineRow`/`lineList`, `useGhostAnchor`, `useRenameKeys`, `RenamableLabel`, `InlineEditHeader`, and `Reveal`. They restate kit shapes in three places: the popup's icon-plus-title row and footing row (05-07), and the editors' row-stack spacing (05-01).

##### Findings

###### 05-01 · Five Type Editors, Four Containers, and the Spacing Bug the Number Editor Exists to Avoid
- **Now:** Checkbox, Link, and File use `MenuIndex` inside `s.configEditor` (`UIX/Menus/frames.css.ts:180-185`, flex column, `gap: 8px`); FormatRows uses `MenuIndex` inside `s.ruleFrame` (`frames.css.ts:126`); NumberEditor stacks bare `MenuRowView`s in its own `number-editor.css.ts` (section plus `rowRhythm` margins); DateTimeEditor stacks bare `MenuRowView`s in an inline `style={{ display: 'flex', flexDirection: 'column', gap: 4 }}` (`DateTimeEditor.tsx:31`), the domain's only static inline layout style (others, such as `LinkCell.tsx:67`, carry computed colors). `number-editor.css.ts:3` avoids flex `gap` because "a collapsed Reveal would still consume one on each side", which holds: `Reveal`'s outer grid `div` stays mounted while collapsed (`UIX/Animations/Reveal.tsx:42-65`), so DateTimeEditor's revealed Day row (`:50`, `reveal: showDay`) leaves an extra 4px between Date and Time when hidden. The Number editor's own rule fails too (B-05-01). `MenuIndex` already renders each row through `MenuRowView` (`MenuIndex.tsx:161-176`), which already wraps a `reveal` row in `Reveal` (`:122-130`); only `configEditor`'s collapse-unsafe `gap` keeps Number and DateTime off it. DateTimeEditor rows carry icons at `iconSize: 'headline'` (`DateTimeEditor.tsx:18`), FormatRows at the default `'body'` (`FormatRows.tsx:40,45`, `MenuIndex.tsx:63`), and the Number, Checkbox, Link, and File rows carry none.
- **Better:** Give `s.configEditor` one collapse-safe rhythm and put every editor in it. The rule needs a selector that doesn't read a revealed row as its list's first child, such as a margin on the `[data-reveal]` wrapper or the non-revealed row (`Reveal.tsx:45` exposes `data-reveal` for this), since moving `number-editor.css.ts`'s rule as written spreads B-05-01. Every editor returns `MenuSection`/`MenuRow[]` rendered by one `<MenuIndex>`, `number-editor.css.ts` and the inline style go, and `SETTINGS` can hold the row builders as `(def, style) => MenuRow[]` (FileEditor's `useSession` read moves to the frame, 05-12) [Intended as L-1]. Which rows each editor shows, their wording, and their icons stay as they are, with the icons filed as I-076 [Intended as I-1, L-2].
- **Behavior:** Accident fixes a user sees: the stray 4px under a hidden Day row goes, and the Number editor gains the 8px between rows it lacks.
- **Estimate:** about −90 to −130 across six files · read

###### 05-02 · One "Look" Concept Placed Three Ways in the Frame, and the Frame's "Format" and the Column Menu's "Format" Write Different Layers for Link and Number
- **Now:** The per-view look (`ColumnStyle.look`) appears three ways. Option types get a `MenuFooting` with a Style `PickerControl` (`PropertyFrame.tsx:409-426`), and the option row's right-click Style submenu offers the same look again (`useOptionEdit.tsx:98-123` → `optionMenuModel` → `styleBranch`, `Actions/optionMenu.ts:16`). Checkbox and Number each build a Style row from their own `STYLE_OPTIONS` (`CheckboxEditor.tsx:8,42`, `NumberEditor.tsx:25,137-143`). Link offers no per-view look in the frame. The column menu labels its look submenu "Format" for Link and Number (`Actions/columnMenu.ts:40-42`), writing the view's `look`, while the frame's Link "Format" row writes the definition's `link_display` (`LinkEditor.tsx:49-56`, `PropertyFrame.tsx:353`) and Number's "Format" row writes `def.number_family` (`NumberEditor.tsx:63-72`) with its view look under "Style" (`:137-143`); for Link the view's look wins (`columnStyles.ts:143-145`, `Cells/LinkCell.tsx:39`). The frame re-narrows the all-types `ColumnLook` union by hand three times (`PropertyFrame.tsx:362`, `:370`, `:408`), rules `styleMenuItems` (`columnMenu.ts:54-94`) and `defaultStyleFor` (`columnStyles.ts:133-155`) already state per type. The definition-versus-view split is written only in a component comment (`CheckboxEditor.tsx:10`) and a decoder comment (`properties.ts:174`).
- **Better:** State each type's looks once, as a `Record<PropertyType, readonly ColumnLook[]>` in `columnStyles.ts` beside `OPTION_LOOKS`/`CHECKBOX_LOOKS`/`NUMBER_LOOKS` (`columnStyles.ts:12-14`; `LINK_DISPLAYS` from `properties.ts:90` is spread into `COLUMN_LOOKS` at `:18`), read by `styleMenuItems`, `defaultStyleFor`, and the frame's three narrowings. It can't sit on `TypeSpec`: `columnStyles.ts` imports `properties.ts` (`:3-10`), so the reverse would cycle or pull view vocabulary into the catalog. The record moves no row: the pane's rows, their placement, and their "Format"/"Style" wording stay as they are and are filed as I-076 [Intended as I-1], while Date's format stays per view and Number's and Link's stay on the property with the column's look as the override [Intended as I-2]. The column menu's "Format" narrows to Link, so Number's look reads "Style" [Intended as I-4].
- **Estimate:** about −30 to −50 · read

###### 05-03 · The Frame Filters Reserved Ids Because Registry Admission Doesn't Refuse Them
- **Now:** `PropertyFrame.tsx:202` and `:204` filter `isReservedPropertyId` out of the assigned and All lists, as `Views/visibilityModel.ts:17` does; these are the only non-test callers besides `schema.ts:64`. Creates refuse reserved ids (`Properties/schema.ts:64`, `validateDefinition`) and non-user types (`:65-66`), but `normalizeRegistry` (`propertiesRegistry.ts:21-45`) runs only the shape decode, `validateName`, and `withUniqueOptions` (`:30-33`). A Collection's schema resolves straight from the registry by id (`Nexus/containerFields.ts:29-39`), so a hand-edited `properties.json` holding `_title` (or a `context`/`createdTime`-typed definition) is admitted and reaches the frame, guarded only by the UI filter, which `PropertyFrame.test.tsx:174,177-187` pins using that state. NexusOS's 15 definitions hold no `_` id and no non-user type.
- **Better:** Admission refuses what `validateDefinition` refuses on identity and origin (a reserved id, `origin !== 'user'`) and files the definition as `unadmitted`, as it does a parse failure. The two UI filters, the test's `titleDef` case, and the `paneDrop.tsx:17` comment go. With Context staying a property type and the timestamps leaving the property types [Intended as F-1, F-2, F-3], a stored `createdTime`/`lastEditedTime` definition fails its decode and `SETTINGS`' two stamp arms (`:389-393`) go; how a stored `context`-typed definition reads, and its `SETTINGS` arm, are planning's.
- **Behavior:** A hand-edited reserved-id definition moves from silently hidden in the frame to unadmitted and carried through, as other bad definitions are.
- **Estimate:** about −6 in the UI, +2 at admission · read

###### 05-05 · The Property Delete Flow Is Hand-Rolled in the Frame, Including a `storesChanged` Emit Tied to One Write Outside `mutate`
- **Now:** `editorMenu` (`PropertyFrame.tsx:291-301`) runs ask → `property:delete` → `storesChanged.emit()` → back to the list → `notifyTrashed(..., replay(owed))`. Every other trash-bound delete goes through `confirmDelete` (`Interface/Confirm/confirmations.ts:121-133`; callers `Bundles/browser.ts:175`, `entityMenuActions.ts:137`, `pageMenuActions.ts:70`) and gets its `storesChanged` from the `mutate` pipeline (`nexusSlice.ts:258`, `changesStores`); the other non-pipeline emitter is the Trash/Archive browser's batch (`Bundles/browser.ts:320`). The frame's emit exists because `property:delete` is a direct channel rather than a `mutate` op.
- **Better:** A `confirmDeleteProperty(def)` beside `confirmDelete` owns the ask, the write, the signal, and the notification, and the frame keeps `if (await confirmDeleteProperty(def)) backToList()`; its counting and wording come from the one confirmation home [Intended as O-2]. If the delete routes through `mutate` (03-07, I-032), the hand emit leaves with no new function.
- **Estimate:** about −5 in the frame, +9 in confirmations (net +4) · read

###### 05-06 · `useGhostOptionAnchor` Repeats What `useGhostAnchor` Already Does, and Its Name Is Wrong for Its Second Caller
- **Now:** `GhostOptionChip.tsx:13-21` wraps `useGhostAnchor` to "latch `busy` in a ref" so the dwell re-reads it at fire time, but `useGhostAnchor` already keeps `optsRef = useLatest(opts)` (`UIX/Interactions/ghostCreate.ts:38`) and its `blocked()` calls `optsRef.current.suppressed()` (`:49`) when the dwell fires (`:65`); TileGrid passes a render closure that way (`Tiles/TileGrid.tsx:510-514`). Sidebar, TileGrid, and useViewInteractions call `useGhostAnchor` directly (`Sidebar.tsx:325`, `TileGrid.tsx:510`, `useViewInteractions.tsx:436`), and `PropertyPanel.tsx:282` uses `useGhostOptionAnchor` for Add Property rows.
- **Better:** Delete the wrapper and `GHOST_GRACE_MS`; both sites call `useGhostAnchor({ dwellMs: REVEAL_DWELL_MS, graceMs: 0, suppressed: () => busy })`, with the constant's comment (`GhostOptionChip.tsx:10`) riding to the call as the reason for zero grace.
- **Open:** The other three consumers call `useClearStrandedGhost` (`ghostCreate.ts:183-192`; `Sidebar.tsx:341`, `TileGrid.tsx:517`, `useViewInteractions.tsx:442`) and the two Properties sites don't; a stranded anchor id renders nothing (`GhostOptionChip.tsx:35`) but stays set, so an option re-added under the same label could show its ghost with no dwell (inferred).
- **Estimate:** about −4 net · read

###### 05-07 · OptionEditPopup Restates the Kit's Icon-Plus-Title Header and Footing Row, and Neither Kit Piece Fits as-Is
- **Now:** `OptionEditPopup.tsx:59-79` builds an icon seat button plus a boxed, always-live `EditableInput` (`autoFocus={false}`, `required`), styled by `option-edit-popup.css.ts:21-57` (`iconSeat`, `iconSeatActive`, `titleField`, `restingRing`, `focusRing`). `UIX/Menus/InlineEditHeader.tsx:7-63` draws the same composition for five surfaces (`SpaceMenu.tsx:87`, `PageMenu.tsx:59`, `PropertyFrame.tsx:438`, `LayoutFrame.tsx:220`, `SettingsFrame.tsx:91`), but its title is an `InputField` that rests as text and edits on demand (`:54-60`), so adopting it changes either interaction. The popup's `footRow` (`option-edit-popup.css.ts:61-69`; `footingBar` + `footingLabel` + `PickerControl`, `OptionEditPopup.tsx:87-95`) restates `FootingItem`/`MenuFooting` (`UIX/Menus/MenuRows.tsx:189-230`), which requires an `icon` (`:193-196`) the popup's row lacks. The aria-labels differ: "Edit Icon" (popup `:63`) versus "Edit icon" (`InlineEditHeader.tsx:47`, queried by `PropertyFrame.test.tsx:224`).
- **Better:** The title field and footer stay [Intended as L-4], with planning raising the two differences above; the kit's aria-label takes Title-Like Capitalization.
- **Estimate:** ±0 · read

###### 05-08 · `paneDrop.tsx` Is a Kit-Only Drag Model Filed at the Properties Root and Named in Schema Words
- **Now:** `paneDrop.tsx` imports only React and UIX (`:3-14`), and its header explains two hosts (`:16-17`). `VisibilityFrame.tsx:119-123` maps `assign`/`unassign`/`reorder-assigned` to show and hide, with lanes `'assigned'`/`'all'` standing for Shown and Hidden. `nexusReorderIndex` (`:28-40`) is order arithmetic unrelated to drag, used by `PropertyPanel.tsx:257,271` for the Contexts order and a Collection's schema order, where "nexus" is wrong. `PropertyFrame.handleDrop` (`:263-281`) dispatches the `PaneDrop` union with a three-level nested ternary, against the unions-and-switch Hard Rule.
- **Better:** The pane model moves to `UIX/Menus` (it already imports `menuDropLine` and `allHighlight` from there) with neutral kind names (`reorder-members`/`reorder-rest`/`join`/`leave`), `nexusReorderIndex` becomes `fullOrderIndex` beside `moveBefore`/`nextOrder` in `UIX/Utilities/moveItem.ts` (where 08-11 sends `resolveRowOrder`), `handleDrop` becomes a `switch`, and `paneDrop.test.ts` moves with the model.
- **Estimate:** ±0 · read

###### 05-09 · The Inline-Rename Session Slice Has One Reader and One Writer
- **Now:** `renamingProperty`, `beginPropertyRename`, and `cancelPropertyRename` live in the global store (`Session/editSlice.ts:42-44,66,162-163`), with `PropertyFrame.tsx:194-196,304,482,489,492` the only production consumer; the other references are test stubs (`PropertyFrame.test.tsx:103`, `PropertyFrame.dateTime.test.tsx:41`) and the Nexus-switch reset test (`Session/store.test.tsx:1233,1241`) pinning its `PER_NEXUS` place (`editSlice.ts:59-67`). The slice was a store channel from the start (`3ce8532da`, 07-02-2026); `af1fd00cd` borrowed it for create → inline rename and `bb6ac59d1` reverted that, and nothing outside the frame has set it.
- **Better:** `useState<string | null>` in `PropertyFrame`, dropping the `collectionPath` match at `:482`, the editSlice entries, its `PER_NEXUS` line, and the store test's assertion; a Nexus switch clears it by unmounting the frame.
- **Estimate:** about −12 · read

###### 05-10 · OptionOrderList Is a Grab-Bag, and GroupFrame Hand-Rolls Its Row
- **Now:** `OptionOrderList.tsx:14-39` exports `SUB_LOOK`, `HideControls`, and `rowEye`, used by GroupFrame for date buckets and Set rows (`GroupFrame.tsx:72,138,145,415,528`) and by SortFrame (`SortFrame.tsx:14,173,191,212`). `GroupFrame.tsx:408-417` (`subChipRow`) re-draws OptionOrderList's chip-plus-eye row (`OptionOrderList.tsx:96-99`), and the date list's row (`GroupFrame.tsx:524-529`) is the same row with a text label. `findOption(def, v)` runs twice per row (`:74`, `:94`). OptionOrderList is correctly separate from `useOptionEdit`, since it writes a view's bucket order rather than the definition.
- **Better:** `rowEye`, `SUB_LOOK`, and `HideControls` move to a Views/Settings pane-row module exporting one order row that `subChipRow` and the date row reuse, and each option resolves once.
- **Estimate:** about −12 · read

###### 05-11 · Option Editing Is One Hook, but OptionEditor Rebuilds a Definition That Misstates a Select
- **Now:** The frame and the value picker share `useOptionEdit` (`OptionEditor.tsx:35`, `PropertyPicker.tsx:311`), with two renderers that differ by design (a grouped, ghost-creating, destructive list; a flat, pickable list with footer create). `PropertyFrame` hands OptionEditor `optionGroupsOf(def)` (`:331`), and OptionEditor reconstructs `def = { id, type, status_groups: groups }` (`:31-34`), which for a Select carries a synthetic `status_groups` (`properties.ts:304-305`); it's harmless while every reader gates `status_groups` on the declared type (`Cells/OptionChip.tsx:26`, `properties.ts:290`). `type` is threaded separately into `OptionSlot`, `OptionDraft`, `GhostOptionChip`, `OptionEditPopup`, and `OptionChip`; only `OptionSlot`, `OptionEditPopup`, and `OptionChip` take a `def`, each narrowed to `Pick<PropertyDefinition, 'status_groups'>` (`OptionRow.tsx:23`, `OptionEditPopup.tsx:38`, `OptionChip.tsx:24,43`), and `OptionChip`'s ten callers include some with no definition in hand (`GroupFrame.tsx:414`). `OptionRow.tsx` exports `OptionSlot`, `OptionDraft` lives in `useOptionEdit.tsx`, `option-row.css.ts` holds one class, and `OptionEditApi`/`OptionDef` are exported for in-file use only.
- **Better:** OptionEditor takes `def` and derives groups; the three def-taking components widen their pick to include `type` and drop the separate prop; `OptionRow.tsx` becomes `OptionSlot.tsx`, folding in `OptionDraft` and `compactTitle`; the internal types unexport.
- **Estimate:** about −15 and −1 file · read

###### 05-12 · Smaller Data-Layer Decisions Held in the UI
- **Now:**
  - **Decimals:** `decimalsToPicker` (`NumberEditor.tsx:31-32`) shows "Hidden" for an unset `number_decimals`, while the formatter renders unset as Intl's default (`formatValue.ts:186-191`: up to three digits for a plain or percent number, the currency's minor digits for currency) and only `'hidden'` as zero digits. The decoder admits two spellings of "no decimals", `'hidden'` and `0` (`properties.ts:185-188`); the UI can't write `0`, a file can hold it.
  - **Denominator:** the Value row accepts any parsed number (`NumberEditor.tsx:129-132`) and the decoder any number (`properties.ts:190`), while `fractionDenominator` drops anything ≤0 at render (`formatValue.ts:220-223`), so a 0 or negative denominator persists and does nothing. `narrowNumberFormat` decodes writes through the same field (`properties.ts:211-222`), so `z.number().positive()` there stops both.
  - **Create:** `PropertyFrame.create` sends `id: ''` (`:236`) to satisfy `propertyDraft`'s required id (`properties.ts:197-200`), and the host reads `def.id || mintPropertyId()` (`registryProperty.ts:83`); only the Trash restore passes an id (`Trash/restoreProperty.ts:40`).
  - **FileEditor** reads the asset root from the store (`FileEditor.tsx:16`) while its Browse round trip lives in the parent (`PropertyFrame.tsx:379-386`).
  - **Two Write Spellings:** non-option writes go through `write()` (assign, drops, config, icon), whose only addition over `reportRefusal` is an `'owed'` branch (`propertyWrite.ts:13-20`) that only option ops return (`optionOps.ts:45,103,242,348,377`); `schema:add`, `schema:unassign` from menus, and `property:delete` use `reportRefusal`, so `schema:unassign` is called both ways (`:256`, `:306` versus `:280`).
- **Better:** Decimals keeps reading "Hidden" and the denominator decodes positive [Intended as L-3]; the draft id becomes optional; FileEditor gets one owner; each channel family takes one write spelling.
- **Behavior:** A zero or negative denominator is refused.
- **Estimate:** about −10 · read

###### 05-13 · The Describers: Stale Tags, False Test Names, History-Pinning Tests, Two Harnesses, and a Drifted I-064
- **Now:**
  - **Planning Tags:** `(A-7)` `:134`, `(T5)` `:176`, `(A-4/E-5)` and `(B-1)` `:177`, `(A-9)` `:202`, `(T6)` `:235,243`, `(T7)` `:430`, `(A-8)` `:438`, `(A-8/D-1)` `:451`, `(A-10)` `:486` in `PropertyFrame.test.tsx`; `(A-3)` in `PropertyFrame.dateTime.test.tsx:77`; `(C-1…C-5)` and `(breaker M-1)` in `paneDrop.test.ts:63-82,180`. The codebase-wide strip is 09-06.
  - **False Names:** `:202` "header ⊕ opens the type picker; the footer create-row is gone" clicks the footer's `FootingCreate` (`PropertyFrame.tsx:458-462`, "New Property"); `:255` "commits the Remove (schema.delete)" and `:438` "routes through schema.delete" name `schema:unassign`, and `deleteSpy` returns `unassignSpy` (`PropertyFrame.test.tsx:244`); `:486` "commits schema.rename" names `property:rename`.
  - **History Pins:** `:454` asserts a removed "Delete Property" row is absent, and `:199` asserts `loadSpy` was never called; `loadSpy` exists only for that (`:51,65,101`).
  - **Two Harnesses:** `PropertyFrame.test.tsx` and `PropertyFrame.dateTime.test.tsx` each carry their own stubs and menu door (`setMenuDoor`, `PropertyFrame.test.tsx:18,25`; `MenuDoorHost`, `PropertyFrame.dateTime.test.tsx:11,61`).
  - **`row-title-input`** (`PropertyFrame.tsx:107`) is a test hook whose CSS is scoped to the sidebar's `.row` (`Interface/Sidebar/sidebar.css:178-192`), where a comment calls it "the query hook only"; the sidebar sets it too (`sidebarRows.tsx:32`).
  - **I-064:** its premise stands, since `FrameSlide`'s per-host `maxWidth` (`UIX/Menus/FrameSlide.tsx:22,83`, present by `d9dfc1a52`, 09-25) isn't the one rule "set once for every such pane" its Solution asks for. Its wording names "Key Format" for the row that reads "Label Format" (`143298503`), and its footnote cites `PropertyFrame.tsx:500-506` (now `:503-509`), `MenuRows.tsx:153` (now `:156`), and `SettingsWindow.tsx:47-52` (now `:54`) (`.claude/IssuesPM.md:1073-1085,1345`).
  - **`PropertiesPM.md:76`** puts the option editor "under a Style toggle", which is the footing below the list, and omits the ghost "New Option" chip.
- **Better:** The names are corrected (with `deleteSpy`), the two history assertions and `loadSpy` go, the dateTime suite merges into the main suite, the frame's `row-title-input` either goes or keeps the sidebar's reason, I-064's row name and footnote are corrected with its Solution kept, and `PropertiesPM.md:76` is corrected.
- **Estimate:** about −40 test lines · read

###### B-05-01 · The Number Editor's Collapse-Safe Rhythm Zeroes the Margin of Every Revealed Row
- **Now:** `rowRhythm` (`number-editor.css.ts:6-9`) gives each row `marginTop: 8px` except `:first-child`, on the `MenuItem` root `div` (`UIX/Menus/MenuRows.tsx:129-140`). `MenuRowView` wraps any row with a defined `reveal` in `Reveal` (`MenuIndex.tsx:122-130`), whose inner `div` holds that row alone (`Reveal.tsx:62-63`), making it its parent's first child. Five of seven rows pass a boolean `reveal` (`NumberEditor.tsx:81,94,118,126,141`) and render with no top margin; only Decimals (`:98-107`) carries the 8px. The file's comment (`:3`) describes a rhythm the selector doesn't deliver.
- **Better:** Folds into 05-01's shared rhythm, and `number-editor.css.ts` goes.
- **Behavior:** The Number editor's rows gain even spacing; a screenshot of a Number editor settles how it reads today.
- **Estimate:** within 05-01 · read

##### Behavior Ledger

| Behavior | Where | Origin | Classification |
|---|---|---|---|
| The pane mixes Nexus-wide definition edits (formats, checkbox and link color, number format, file directory, icon, options) with this view's `column_styles` (Style, date forms), with no visual cue | `PropertyFrame.tsx:260-262,341-394`; `CheckboxEditor.tsx:10` | Accreted per type before the monorepo move (`0cdb92cd2`) | Agent's choice; layout and wording stay, filed as I-076 [Intended as I-1] |
| Link's and Number's frame "Format" set definition fields, while the column menu's "Format" sets the per-view look | `LinkEditor.tsx:49-56`, `NumberEditor.tsx:63-72`, `columnMenu.ts:40-42,71-76`, `columnStyles.ts:143-145` | Link's view looks: `4d447dd40` (08-15-2026); `dc7780ca7` | Agent's choice; the pane's wording stays, filed as I-076 [Intended as I-1], and the column menu names Number's look "Style" [Intended as I-4] |
| A date's format is per view, while a number's is per definition ("rides as an inert foreign key", `properties.ts:176`) | `DateTimeEditor.tsx`, `NumberEditor.tsx` | `properties.ts:176` comment | Agent's choice; each stays where it reaches today [Intended as I-2] |
| An option's Style is offered twice in the frame: the footing picker and the row's right-click Style submenu | `PropertyFrame.tsx:409-426`, `useOptionEdit.tsx:98-123` | The footing (`39a62437f`, 08-25-2026), then the submenu with the one option menu (`8bacf4073`, 10-05-2026) | Accident (duplication); pane layout stays under I-076 [Intended as I-1] |
| Decimals shows "Hidden" when unset, though cells render Intl's default digits | `NumberEditor.tsx:31-32`, `formatValue.ts:186-191` | Unclear | **Nathan's Intent** [Intended as L-3] |
| Decimals offers 1–10 and Hidden, while the decoder admits 0–100 | `NumberEditor.tsx:26-29`, `properties.ts:185-188` | `properties.ts:178` comment (Intl bounds) | Agent's choice |
| A 0 or negative fraction denominator is stored but ignored | `NumberEditor.tsx:129-132`, `formatValue.ts:220-223` | Unclear | Accident; refused [Intended as L-3] |
| The value picker's option menu has no Clear or Remove (`destructive` only in the frame) | `useOptionEdit.tsx:58,102`; `optionMenu.ts:18` | `7ee3d1b6d` | Agent's choice, plausibly Nathan's intent |
| The value picker creates options for Select and Multi-Select but not Status | `PropertyPicker.tsx:312` | `PropertiesPM.md:117` | Agent's choice; planning recommends [Intended as J-8] |
| Clear asks only past one Item, while Remove always asks | `confirmations.ts:177-200` via `useOptionEdit.tsx:110-117` | `c7c232664` | Agent's choice; counts from one home, zero included [Intended as O-2] |
| Creating a property opens its editor (it briefly opened an inline list rename) | `PropertyFrame.tsx:240` | `af1fd00cd` → `bb6ac59d1` reversal | Likely Nathan's intent (a reversal reads as feedback) |
| Delete exists only behind the editor's ⋮ menu; the row menu offers Rename and Remove | `propertyMenu.ts:19-30` | `propertyMenu.ts:3` comment (`bea36e407`) | Agent's choice |
| The ghost "New Option" chip appears after a 1500ms hover dwell with 0 grace | `GhostOptionChip.tsx:11,17`, `hoverReveal.ts:12` | KNOB constants | Agent's choice (a tuned knob) |
| The format rows carry no hints | `FormatRows.tsx` | `739730c5e`, I-064 | Agent's choice, deferred |
| All Properties starts collapsed on every mount | `PropertyFrame.tsx:200` | — | Agent's choice |
| "Property not found." shows when the definition vanishes or leaves this Collection's schema under an open editor (the editor reads assigned `props`, `:397`) | `PropertyFrame.tsx:396-405` | — | Agent's choice; returns to the list [Intended as O-5] |
| All Properties rows open no context menu | `PropertyFrame.tsx:151`, test `:601` | `af1fd00cd` | Agent's choice |

##### Approaches

###### 1 · Type Editors as Row Specifications
`SETTINGS: Record<PropertyType, (def, style, write) => MenuRow[]>` replaces the five editor components, rendered by one `<MenuIndex>` in a collapse-safe `configEditor` [Intended as L-1], each type keeping the rows it has today [Intended as I-1].
- **Removes:** five components, `number-editor.css.ts`, the inline style, and the three look narrowings (with 05-02's looks record); about −150 to −200 with tests.
- **Costs:** editor tests rewritten against rows; FileEditor's `useSession` read moves to the frame, since row builders can't call hooks.
- **Risk:** low; FileEditor's `PathField` and Number's typeable Value row already fit `Trailing` (`kind: 'field'`, `typeable`), and the collapse-safe rule has to be new (B-05-01).

###### 2 · One Definition-Config Channel
`property:setLinkConfig`, `setCheckboxColor`, `setIcon`, `setNumberFormat`, and `setFileDirectory` are five `defEditOp` entries (`Properties/handlers.ts:182-193`, `Contract/bridge.ts:155-171`), each called from one frame site (`PropertyFrame.tsx:259,353,363,371,516`); one `property:configure(id, patch)` narrowed against a display-fields pick, keeping the file-directory check as its one `check`, replaces them with one `onConfigure(patch)` (03-07 owns it).
- **Removes:** four bridge entries, four handlers, and the per-editor callback shapes; about −30.
- **Risk:** the narrowing loses per-channel field isolation unless the pick is exact.

###### 3 · Move the Pane Model to the Kit and Keep Views Panes in Views
`paneDrop` moves to `UIX/Menus` with neutral names, `nexusReorderIndex` to `UIX/Utilities/moveItem.ts` (the one destination for order arithmetic, shared with 08-11's `resolveRowOrder`), and OptionOrderList's helpers to a Views/Settings pane-rows module.
- **Removes:** a mis-filed module, schema vocabulary in a view pane, and a grab-bag export file.
- **Costs:** import churn across about six files.
- **Risk:** low and structural.

##### Cross-Domain Notes
- **01:** `optionGlyph` (`Cells/OptionChip.tsx:21-30`) scans `def.status_groups` per compact Status chip; it keeps resolving the group from the nesting, the one source of an option's group (`properties.ts:149-155`), while `group_id` leaves (08-04). The per-chip cost, under the Compact look only (`:54-56`), is inferred; a label→group map memoized on the definition answers it if it ever measures.
- **01:** `ColumnStyle.look` is the all-types union (`columnStyles.ts:15-21,95`), which makes every surface re-narrow it (05-02).
- **03:** The two "no decimals" spellings (`'hidden'` and `0`, both zero digits at `formatValue.ts:187-189`) can fold into one.
- **06:** `LinkCell.tsx:39`'s fallback to `def.link_display` is load-bearing: the Properties panel hands every cell `look: 'standard'` (`PropertyPanel.tsx:419-420`), which isn't a link display. The origin is the panel's hand-built style in place of `defaultStyleFor`; fixing that lets the fallback go.
- **UIX:** `useRenameKeys` has no test of its own; it's pinned only through `OptionEditor.test.tsx:267-448`, though `UIX/Menus/useListEdit.ts:28` also calls it.

---

#### Scout 06 — Value Surfaces

Every place a property value is drawn, opened for editing, or written from the interface.

**Counts:**
- **Render Sites:** Nine places draw a value. `Cell` (`Core/Properties/Cells/Cell.tsx:22`) is the shared renderer behind `TableView.DataRow` (`Core/Views/Table/TableView.tsx:619`), `CardValue` (`Core/Views/Cards/CardValue.tsx:154`), and `PropertyPanel` (`Core/Properties/PropertyPanel.tsx:416`). Six more draw values themselves: the `PropertyPicker`/`MassPropertyPicker` option rows (`PropertyPicker.tsx:257-264`, `:350-365`), `FilterFrame.ChipsField` (`Core/Views/Settings/FilterFrame.tsx:165-183`), the FilterFrame checkbox operator glyph (`FilterFrame.tsx:411-417`), the `GroupBand` option face (`Core/Views/Bands/GroupBand.tsx:258`), `OptionOrderList` (`Core/Views/Settings/OptionOrderList.tsx:74`), and the native menu's checkbox and option rows (`Core/Interface/Menus/propertyMenuActions.ts:46-66`); GroupBand and OptionOrderList draw through the shared `OptionChip`.
- **Editor-Opening Sites:** Six places open a value editor. Three map `ValueIntent` to their own widgets: `TableView.runIntent` (`TableView.tsx:134-156`), `CardValue.runIntent` plus `CardsView`'s pickers (`CardValue.tsx:74-94`, `CardsView.tsx:486-537`), and `PropertyPanel.runIntent` (`PropertyPanel.tsx:286-304`). Two route without `valueClick`: `runPropertyAction` → `requestPick` → `ValuePickPresenter` (`propertyMenuActions.ts:100-111`, `ValuePickPresenter.tsx:19-48`) and `CardsView`'s add-chooser `onReveal` (`CardsView.tsx:520-532`). `FilterFrame` opens its own `PickerMenu` and `CalendarPicker` for operands (`FilterFrame.tsx:187-198`, `:352-371`).
- **Writers:** Interface code never writes a value file directly; every surface reaches `assignValue` (`Core/Properties/assignValue.ts:87`), with its `ValueWriter` assembled three ways (06-05).

##### Inventory

| File / Symbol | Lines | Responsibility | Callers Outside the File | Belongs Here? |
|---|---|---|---|---|
| `Core/Properties/Cells/Cell.tsx` · `Cell` | 242 | Per-type resting renderer for one value | TableView, CardValue, PropertyPanel | Yes |
| ↳ `Chips`, `SortableChip` | (183-242) | Chip run with drag-reorder for multi/context/file | — | Yes |
| `Cells/TextCell.tsx` · `TextCell` | 100 | Text value with live inline links, link gestures, and pen | Cell, LinkCell (`LinkCell.tsx:43`) | Yes |
| `Cells/LinkCell.tsx` · `LinkCell` | 87 | Link value: page link via TextCell, address as an anchor | Cell | Yes |
| `Cells/OptionChip.tsx` · `OptionChip`, `optionGlyph`, `OptionChipData`, `STATUS_GROUP_GLYPH` | 60 | Option chip, compact glyph, status-group glyph table | 9 files outside Cells (Schema ×3, Views ×5 incl. `bandModel.ts` type-only, PropertyPicker); `optionGlyph` only by `Schema/OptionEditPopup.tsx:67` | Chip yes; `STATUS_GROUP_GLYPH` is a type fact (01) |
| `Cells/CheckboxGlyph.tsx` | 22 | Display-only checkbox/switch in the property's color | Cell, FilterFrame | Yes |
| `Cells/valueMenuTarget.ts` | 18 | One-call wrapper: `linkMenuTarget(resolveLink(readLinkText(raw)…))` | PropertyPanel, CardValue, TableView | Folds into the seat (06-01) |
| `Cells/PropertyTypes.tsx` · `TYPE_META`, `propertyTypeLabel`, `propertyTypeIconName`, `propertyIcon`, `PropertyTypeIcon`, `CREATABLE_TYPES` | 97 (15-57) | Per-type label and icon table plus creatable list | 12 non-test files: Archive, Trash, PropertyFrame, Table, Cards, Visibility, … | No: catalog data, and no cell reads it |
| ↳ `PaneTarget`, `TITLE_TARGET`, `LOCATION_TARGET`, `STAMP_TARGETS`, `contextPaneTargets`, `schemaTargets`, `targetOption` | (59-97) | Target lists for the Filter, Sort, Group, and preview-rules panes and the panel | filterModel, SortFrame, GroupFrame, previewRules, PropertyPanel, FilterFrame | No: Views vocabulary |
| `Cells/columnLabel.ts` · `RESERVED_LABEL`, `columnLabel` | 19 | Display name for a column id | 6 production files (Views ×5, propertyMenuActions) plus `PropertyTypes.tsx` (`RESERVED_LABEL` only) | No: a name fact |
| `Pickers/PropertyPicker.tsx` · `PropertyPicker` | 401 (89-222) | Popover for options, dateTime, or file, plus the add-property chooser slide | PropertyPanel, TableView, CardsView, ValuePickPresenter | Partly (06-07) |
| ↳ `PickTarget`, `PickEntry` | (41-58) | Picker target union and chooser entry | useViewHost, CardsView, PropertyPanel | Yes |
| ↳ `pickGroups`, `pickShape`, `toggleValue`, `syntheticContextDef`, `pickedValue` | (60-87, 391-401) | Pure pick model | propertyMenuActions, FilterFrame, valueField, useViewHost, MassPropertyPicker | No: a pure module in a component file |
| ↳ `PropertyOptionRows`, `OptionGroups`, `EditableOptionRows`, `pickSemantics` | (224-389) | Option rows, groups, and in-place option editing | MassPropertyPicker, FilterFrame | Yes |
| `Pickers/ValueEditor.tsx` | 206 | The one CodeMirror value editor (pane and one-line field) | PropertyValueInput, TextPane | Yes |
| `Pickers/PropertyValueInput.tsx` | 124 | Routes a typed value: Number input, TextPane, or one-line editor, inline or popover | PropertyPanel, TableView, CardValue, CardsView, ValuePickPresenter | Yes |
| `Pickers/TextPane.tsx` | 59 | Text value's multi-line popover | PropertyValueInput | Yes; encodes its own value (06-10) |
| `Pickers/DateTimeValuePicker.tsx` | 33 | Calendar for a dateTime value | PropertyPicker | Yes; duplicated by FilterFrame (06-09) |
| `Pickers/MassPropertyPicker.tsx` | 50 | Option picker over a swept run of cells | TableView | Yes |
| `Pickers/massAssign.ts` · `massSelected`, `massPickCommits` | 26 | N-row pick rule | MassPropertyPicker | Merges with `pickedValue` (06-04) |
| `Pickers/filePick.ts` · `FILE_CHIP_INDEX_ATTR`, `fileChipIndex`, `fileValueWithout`, `pickFileInto`, `adoptPathInto`, `runFileMenuAction`, `fileValueMenu` | 125 | File value effects: OS dialog, adopt, chip index, file menu | Cell, PropertyPanel, TableView, CardValue, propertyMenuActions, PropertyPicker | Yes; `runFilePick` is exported for in-file use and its test; `fileValueMenu` has one caller (`PropertyPanel.tsx:335`, B-06-01) |
| `Pickers/valueClick.ts` | 71 | Click and menu → `ValueIntent`, and `runValueIntent` | PropertyPanel, TableView, CardValue | Yes (06-01) |
| `Pickers/property-picker.css.ts` | 7 | `chooserTop`, `emptyPane` | PropertyPicker | Yes |
| `Pickers/text-pane.css` | 39 | Global CSS for `.text-pane`, `.text-pane-close`, and `.value-field` | ValueEditor | 06-12 |
| `Core/Properties/PropertyPanel.tsx` | 577 | Panel: subject load, override, writer, intents, menus, row order, add/ghost, layout | PageMenu, SpaceMenu, WindowTabBody | Partly (06-03) |
| `Core/Properties/property-panel.css.ts` | 63 | Panel styles | PropertyPanel | Yes |
| `Core/Interface/Menus/propertyMenuActions.ts` · `propertyMenuBranches`, `runPropertyAction` | 117 | Builds the Spaces/Properties menu rows and runs a pick | entityMenuActions, useViewInteractions | The row builder belongs in `Core/Actions` (06-11) |
| `Core/Interface/Menus/ValuePickPresenter.tsx` | 49 | App-level presenter for the menu's non-option value picks | App.tsx | Removable (06-02) |
| `Core/Interface/Menus/entityMenuActions.ts` · `showEntityMenu`, `valueCommitFor` | 152 | Entity menu; `valueCommitFor` builds a throwaway writer (79-97) | Sidebar, Matrix, GroupBand | `valueCommitFor` (06-05) |
| `Core/Actions/cellMenu.ts` | 149 | Cell menu context and model | TableView, CardValue, PropertyPanel, filePick, valueClick | Yes |
| `Core/Actions/columnMenu.ts` | 129 | Column and style menu rows | useColumns, CardValue, useOptionEdit, Bundles/browser, tableMenu | Yes |
| `Core/Views/Cards/CardValue.tsx` | 171 | Card value seat: intents, menu, inline editor | CardsView | One of three seat copies (06-01) |
| `Core/Views/Cards/cardValueInput.ts` · `fillsBlank`, `shownColumnsFor`, `addEntriesFor`, `addColumn`, `orderAddableEntries` | 86 | Card column visibility and the add-property entries | CardsView, CardValue | Misnamed: nothing here is an input |
| `Core/Views/Settings/valueField.tsx` · `emptyPicker`, `useMultiValue` | 21 | A one-line `MenuCaption` wrapper and an optimistic multi toggle for filter fields | FilterFrame, LocationField | Misnamed: holds no field |
| `Core/Pages/PageMenu.tsx` | 99 | Page settings dropdown hosting the panel | SettingsMenu | Yes |
| `Core/Contexts/SpaceMenu.tsx` | 135 | Space settings dropdown hosting the panel | SettingsMenu | Yes |

**Tests:** `Cell.test.tsx` 339, `LinkCell.test.tsx` 148, `TextCell.test.tsx` 185, `OptionChip.test.tsx` 48, `PropertyTypes.test.ts` 18, `columnLabel.test.ts` 43, `PropertyPicker.pane.test.tsx` 382, `ValueEditor.test.tsx` 354, `PropertyValueInput.test.tsx` 411, `TextPane.test.tsx` 314, `filePick.test.ts` 202, `massAssign.test.ts` 46, `valueClick.test.ts` 100, `PropertyPanel.test.tsx` 472, and `ValuePickPresenter.test.tsx`.

##### Findings

###### 06-01 · Three Hand-Wired Copies of One Value Seat
- **Now:** `valueClick.ts` unified the decision (`b9624265e`: "one intent in valueClick that the Table, Cards, and the Properties panel each map to their own widget"), while the dispatch is written once per surface:
  - **Intent Maps:** `TableView.tsx:134-156`, `CardValue.tsx:74-94`, and `PropertyPanel.tsx:286-304` give the same eight intent kinds near-identical bodies. All three map `rename` and `popover` to one popover mode; Table and the panel map `picker` and `dateTime` to one `'picker'` mode, while Cards keeps them apart (`CardValue.tsx:87-88`) only so a `'picker'` request carries the click's x for centering and a calendar doesn't (`CardsView.tsx:518`). The three `file` arms are one shared call, `pickFileInto(def, current, fileChipIndex(target), commit)` (`TableView.tsx:147`, `CardValue.tsx:85`, `PropertyPanel.tsx:296`).
  - **Right-Click Chains:** Table and Cards run the same sequence at `TableView.tsx:269-309` and `CardValue.tsx:106-131`: link → `valueMenuTarget` → `showConnectionMenu`, otherwise `cellMenuContextFor` → `popMenu(cellMenuModel)` → `runFileMenuAction` → `valueMenuIntent` → style action. The panel's value seat (`PropertyPanel.tsx:332-346`) runs only the link half plus a separate file entry (`fileValueMenu`), and every other type falls through to the row's `propertyMenuModel` menu (`:388-391`, 06-06), a third, differently shaped chain.
  - **Editing State:** three spellings of one `picker | editor | popover` mode: `TableView.tsx:99-106` `Editing`, `PropertyPanel.tsx:66` `Editing`, and `CardsView.tsx:79-86` `ValuePickerRequest` plus `CardPickerKind` (`CardValue.tsx:30`).
  - **Link Seat Rule:** `seat={def.type === 'link' ? 'rename' : undefined}` appears three times (`TableView.tsx:260`, `CardsView.tsx:494`, `PropertyPanel.tsx:539`).
  - **Redundant Intent Kinds:** `rename` is reachable only for links (sources: the connection menu's and the link cell menu's Rename, `valueClick.ts:53`, `Actions/cellMenu.ts:131`), so it can be `popover` carrying a seat; `dateTime` is collapsed by Table and the panel and read by Cards.
- **Better:** One seat module in `Core/Properties` (such as `useValueSeat`) owning the handler table, the menu chain, and the mode state, plus one `<ValueSeat>` overlay renderer; each host passes only its genuine differences: the popover anchor, whether `hide` exists, how a commit is spelled, and the panel's row-level menu. One menu chain makes a value's right-click read the same on every surface [Intended as J-10]. `ValueIntent` loses `rename`, and loses `dateTime` only if Cards derives "no click-x" from the column type. `valueMenuTarget.ts` folds into the chain.
- **Behavior:** The table passes no `hideable` (`TableView.tsx:288`, `:296`) while Cards and the panel pass `true`; collapsing `dateTime` into `picker` without a type check would start centering Cards' calendar on the click (`CardsView.tsx:518`).
- **Estimate:** −150 to −220 across TableView, CardValue, CardsView, and PropertyPanel, against about +90 for the seat · read (the duplication), inferred (the delta)

###### 06-02 · The Native Menu's Value Picks Run a Fourth Router Through the Session Store
- **Now:** `runPropertyAction` (`propertyMenuActions.ts:100-111`) decides by type: File → `pickFileInto`; anything else → `useSession.getState().requestPick(...)`, writing `pendingPick` into the chrome slice (`Core/Session/chromeSlice.ts:17-37`, `:74-76`), where the app-level `ValuePickPresenter` (`ValuePickPresenter.tsx:19-48`) decides again (dateTime → `PropertyPicker`; else → `PropertyValueInput` popover) and keeps a `picked` echo state (`:15`, `:18`) only its dateTime arm uses. `MatrixView.tsx:45` and `:82` read `pendingPick` to hold its menu. `CHECKBOX_OPTIONS` (`propertyMenuActions.ts:20-23`) and `value === 'true' ? {…true} : null` (`:113-114`) restate `valueClickIntent`'s checkbox arm (`valueClick.ts:30-33`). "Which properties does this surface treat as editable" is answered by two predicates over nine non-test sites: `origin === 'user'` (Contexts excluded: `propertyMenuActions.ts:69`, `Cells/PropertyTypes.tsx:45`, `Properties/schema.ts:65`, `Views/Host/useViewCreation.ts:246`, `Views/Settings/SortFrame.tsx:92`, `Actions/cellMenu.ts:76`, `Views/Host/useViewHost.ts:217`) and `origin !== 'stamp'` (Contexts included: `valueClick.ts:28`, `Views/Cards/cardValueInput.ts:20`); they answer different questions.
- **Better:** The menu leaf asks 06-01's seat for a "fill from away" intent, a popover anchored at the menu trigger; the presenter becomes one more seat mount, or its channel carries a `ValueIntent` in place of re-deciding by type. Checkbox Check/Uncheck derives from the intent's commit value, the row builder moves to `Core/Actions` (06-11), and a catalog editability fact carries both "user-made" and "fillable".
- **Estimate:** −40 to −60 · read

###### 06-03 · `PropertyPanel.tsx` Holds Five Jobs
- **Now:** The 577 lines hold:
  1. **Subject Loading:** the page-detail read, `base` state, the `useValuesEpoch` subscription, and override retirement (`:101-149`), reading the shared page-detail cache (`readPageDetail`/`fetchPageDetail`, `Core/Session/pageDetailCache.ts:36`, `:118`) that GlancePane, PageTile, windowTabBanner, and navigation use; `fetchPageRow` (`Core/Properties/pageRow.ts:60-67`, used by `entityMenuActions.ts:57`) reads `view:loadValues` instead, so the menu doesn't build on the cache (`832970031`).
  2. **The Writer:** `:192-206`.
  3. **Value Seating:** intents and menus (`:286-358`), 06-01's copy.
  4. **Row Ordering:** three writes behind one drag (`commitOrder`, `:240-274`): `setSpaceRowOrder`, `reorderPanelContexts`, and `dialer().ask('schema:reorder')`, the last bypassing `mutate` (no op exists; `PropertyFrame.tsx:266` uses the same channel) and wrapping a hand-rolled `sendWithUndo` (`:232-239`).
  5. **Add Rows:** the add row, ghost, and held presence (`:448-529`), with the `revealed` set that outlives subject changes (L-05).
- **Better:** (1) can become a `useSubjectRow(subject)` hook beside the panel, with no twin to merge (`showEntityMenu` is a non-hook one-shot reading a different channel on purpose). (2) and (3) go to 06-01's seat. (4) stays or moves as a unit; routing `schema:reorder` through `mutate` is I-032's fold. The panel keeps layout and add rows.
- **Estimate:** the panel drops to about 350 lines through 06-01, 06-05, and 06-06; net −40 to −80 comes from those · read (structure), inferred (delta)

###### 06-04 · The Pick Rule Is Written Twice: Single Row and Mass
- **Now:** `pickedValue` (`PropertyPicker.tsx:391-401`): a repeat Select clears, every other kind toggles. `massPickCommits` (`massAssign.ts:8-26`): all-hold clears all, otherwise non-holders are set; for multi, the unanimity toggle. For one row, `massPickCommits([selectedValues(current)], v, kind)` produces exactly `pickedValue`'s result (a Select's `selectedValues` has at most one entry, and the multi branch's `own.includes(value) !== unanimous` is always false for one row). "Select closes after a pick" is duplicated at `PropertyPicker.tsx:386` and `MassPropertyPicker.tsx:36`. `toggleValue` (`PropertyPicker.tsx:79`) is imported by `Views/Settings/valueField.tsx:4`.
- **Better:** One pure `pickModel.ts` holding `pickGroups`, `pickShape`, `toggleValue`, `syntheticContextDef`, the N-row rule, and `pickedValue` as its one-row case; `massAssign.ts` merges in and `PropertyPicker.tsx` keeps only components. `MassPropertyPicker` (a `PickerMenu` around `PropertyOptionRows`, `MassPropertyPicker.tsx:38-49`) can become a `currents` prop on `PropertyPicker` (inferred).
- **Estimate:** −40 to −60 · read

###### 06-05 · `ValueWriter` Is Assembled Three Ways
- **Now:** `assignValue`'s writer is hand-built at `Core/Views/Host/useViewHost.ts:171-182` (a ref plus effect, `rows.find`, and `patchOverride`), `PropertyPanel.tsx:192-203` (the same shape over one row), and `entityMenuActions.ts:79-97` `valueCommitFor` (a fake ref whose `apply` reassigns a closure-local `row` and drops the `write` and `contexts` arguments; the dropped `contexts` is inert, since a context restore writes `prior` without reading the row, `assignValue.ts:67`, and a native-menu Context pick is one commit per writer, `propertyMenuActions.ts:115`). `ValueWriter.apply` is the optimistic-override patch every write lands through (`assignValue.ts:34`), and `rowOf` serves both the assign-time live row (`:95`) and undo's live-row read (`:109-113`).
- **Better:** One `useValueWriter(schema, rowsById, setOverride)` hook for the two React hosts and one `oneShotWriter(schema, row)` beside `assignValue` for menus; with 06-02, the menu path uses the seat's writer and `valueCommitFor` goes. Undo's reshaping (E-1) lands first, since it changes `rowOf`/`apply`.
- **Estimate:** −20 to −30 · read

###### 06-06 · The Panel's Row Menu Is a Parallel Vocabulary
- **Now:** `PropertyPanel.rowMenu` (`:319-331`) pops `propertyMenuModel({kind:'page-value'})` (`Core/Actions/propertyMenu.ts:9`, `:15-17`, `:31-38`), whose `value:edit`, `value:clear`, and `value:remove` it hand-maps; it fires for every row's label and, through bubbling, for every value seat that isn't a link or file (`PropertyPanel.tsx:388-402`). The link value seat instead uses `cellMenuModel({kind:'link', …, hideable:true})` (`:344`), whose `cell:clear` and `cell:hide` map through `valueMenuIntent`: two models and two action sets for "Clear · Remove" on one panel. `eb82f1234` states the goal for Text ("a Text value's right-click reads Edit · Clear · Remove on every surface").
- **Better:** The `page-value` kind and its three actions go; the panel row maps through `cellMenuModel` and `valueMenuIntent` (`hide` → `emptyRow(id, false)`, `commit null` → `emptyRow(id, true)`). It can't call `cellMenuContextFor` as-is, which returns `style-only` for Select, Multi-Select, Status, Date, Number, and Checkbox (`cellMenu.ts:73-84`), adding Style submenus with no view to style and dropping Clear from Checkbox (`clearable` unset, `:77-84`); the panel passes `{ kind: 'bare', clearable: filled, hideable: true }` (an existing kind, `cellMenu.ts:26`) for those types and the text/link kinds otherwise [Intended as J-10].
- **Behavior:** A Link row's label right-click gains Edit and Rename, which its value seat already offers [Intended as J-3].
- **Estimate:** −20 · read

###### 06-07 · `PropertyPicker`'s File Pane Is Reachable From One Surface and Gives a Different Interface
- **Now:** Every click, menu, and panel route for a File value opens the OS dialog through `pickFileInto` (`TableView.tsx:147`, `CardValue.tsx:85`, `PropertyPanel.tsx:296`, `propertyMenuActions.ts:101`). `PropertyPicker`'s `kind:'file'` pane (`PropertyPicker.tsx:142-158`) renders a `PathField` ("Choose a file", Browse, and a typed-path commit through `adoptPathInto`, `filePick.ts:62-69`, whose only caller is that pane). It's reachable only through `CardsView`'s add-chooser: File isn't drillable (`pickKindOf('file')` is `null`, `properties.ts:71`; `CardsView.tsx:509`), so `onReveal` sets `kind: 'file'` (`CardsView.tsx:528`), and `PROPERTY_PICKER_KINDS` includes `'file'` (`:88`). The table's picker opens only on `picker`/`dateTime` intents, the panel's `panelTarget` (`PropertyPanel.tsx:361-377`) never builds `file`, and `useViewHost.pickTarget`'s `file` arm (`Core/Views/Host/useViewHost.ts:225`) exists for this one route.
- **Better:** The pane, `adoptPathInto`, `PickTarget`'s `file` member, and the `pickTarget` arm stay as Cards' intended file handling [Intended as J-7], carried by the shared seat as Cards' one genuine difference (L-01).
- **Estimate:** ±0 · read

###### 06-08 · Per-Cell Subscriptions and Lookups Ignore the Pattern `ValueContext` Set — INFERRED
- **Now:** `ValueContext.assets` exists so that "one subscription serves the whole view instead of one per rendered value" (`Core/Properties/valueContext.ts:12`), yet `TextCell` opens three store subscriptions per instance (`TextCell.tsx:31-34`: `useSetting('headingLinkStyle')`, `useSetting('inPageHeadingResolution')`, and `useSession(s.headings[ownPath])`, which subscribes even when `ownPath` is null); `LinkCell` opens two through `useLinkTitle` (`Core/Web/useLinkTitle.ts:5-6`) even when the display isn't `link-title` (called before the page-link early return, `LinkCell.tsx:40-41`), and a page link nests a `TextCell` for three more; every `TextCell` render re-splits the text, recomputes line offsets, re-runs `renderCellContent` per line (`TextCell.tsx:56-57`, `:78`), and rebuilds `linkGestures` closures (`:40-45`); `Cell` scans `ctx.schema.find` (`Cell.tsx:45`) right after `resolveFieldValue` did (`Core/Properties/value.ts:48`), and `schema.find((d) => d.id === …)` appears 6× in TableView, 4× in PropertyPanel, 3× in assignValue, and 35× across non-test Core; compact Status chips run `status_groups.find(g => g.options.some(...))` per chip (`OptionChip.tsx:28`). `Cell` isn't memoized; `DataRow` is (`TableView.tsx:619`). Any change to `ctx` or `styleByCol` re-renders every visible cell's markdown, and N text columns × M visible rows hold about 3·N·M selectors every store write evaluates.
- **Better:** The two heading settings go on `ValueContext` (built once in `buildValueContext`, `valueContext.ts:22-29`); `TextCell` reads `headings` only when `mayNameOwnHeading`; `LinkCell` splits into `PageLinkCell` and `AddressCell` so `useLinkTitle` runs only for addresses; parsed lines memoize on `text`. The definition lookup rides 07-01's column-carried `def` and `type`: the scan's origin is `resolveFieldValue` (`value.ts:48`), which the pipeline calls with an id and no `ValueContext` (`filter.ts:85`, `sort.ts:34`, `group.ts:178`), so a `ValueContext.defById` would serve cells only and sit beside 07-01's compiled `fieldOf` as a second way.
- **Open:** Whether any of this costs a frame; a React profiler trace of a store write and a scroll on a text-heavy Table at Benchmark scale settles it.
- **Estimate:** ±0 to −10 · read (mechanism), unmeasured (cost)

###### 06-09 · Chip and Date-Pane Rendering Re-Decided per Surface
- **Now:**
  - **Context Versus Option Chips:** `contextOptions ? <NeutralChip color={colorNameFor(o.color)} title icon/> : <OptionChip type def option/>` is forked at `Cell.tsx:96-116` (with `:64-95`), `PropertyPicker.tsx:259-263`, and `FilterFrame.tsx:167-182`. The `OptionChip` prop subsets differ (`Cell.tsx:82-92` passes no `def` for multi while `:68-74` does for select; `GroupFrame.tsx:414` passes `type={subDef?.type ?? ''}`), inertly: `def` feeds only the compact Status glyph (`OptionChip.tsx:24-29`), and the GroupFrame chip passes no `look`.
  - **Stringly Typed:** `OptionChip.type` is `string` (`OptionChip.tsx:22`, `:40`), not `PropertyType`.
  - **Type Knowledge in UIX:** `optionShapeFor(type: string)` returns `type === 'status' ? 'pill' : 'tag'` (`UIX/Labels/recipes.tsx:11-13`), called from three Core files, a property-type fact in a kit that reaches nothing outside itself.
  - **Duplicated Date Pane:** `DateTimeValuePicker.tsx:18-31` and `FilterFrame.tsx:352-371` both do `fmt === 'relative' ? 'short' : fmt` → `CalendarPicker` with `formatDate(k, fmt, 'none')`; the filter always uses the Nexus clock (`FilterFrame.tsx:235`, `:365`), the value picker the column's (`DateTimeValuePicker.tsx:20`).
- **Better:** One `ValueChip({def, option, look, onRemove})` picks neutral, tag, or pill from the type record, and `optionShapeFor` leaves UIX for a `shape` in the type facts (01-01); FilterFrame's date slot mounts `DateTimeValuePicker`.
- **Behavior:** The filter's date picker follows the column's clock [Intended as J-1].
- **Estimate:** −25 · read

###### 06-10 · Text Values Have Two Encoders
- **Now:** `PropertyValueInput` builds Text values through `parseEditorValue` → `textFromEdit` (`Core/Properties/parseEditorValue.ts:20-27`, first line only, the lines behind it kept), while `TextPane` builds its own: `text === '' ? null : { kind: 'text', value: text }` (`TextPane.tsx:47`). Both blank a whitespace-only entry on save: `ValueEditor`'s `blanked` (`Pickers/ValueEditor.tsx:27,68`, `df3e2e987`) hands `TextPane` `''` for a whitespace-only document, and `textFromEdit` clears a whitespace-only field. `TextPane` opens on `current.value` (`:43`) while the field opens on `editorText` (`parseEditorValue.ts:15`).
- **Better:** `parseEditorValue` gains a whole-text mode (or `TextPane` calls a `textFromPane` sibling in the same file), so one module states how typed Text becomes a value. J-1's spaces-only rule is already met on typing; its remaining half is the read side (decode's text arm, `propertyValue.ts:121`, and `isBlankValue`, `:305-307`).
- **Estimate:** ±0 · read

###### 06-11 · Non-Cell and Non-Picker Facts Live in `Cells/` and `Pickers/`
- **Now:**
  - **Type Table:** `Cells/PropertyTypes.tsx` `TYPE_META` (`:21-35`) is a second per-type table beside `PROPERTY_TYPES` (`Core/Properties/properties.ts:34-47`); its other half, `PaneTarget` and related (`:59-97`), serves filterModel, SortFrame, GroupFrame, previewRules, FilterFrame, and the panel. "Title" is spelled twice (`PropertyTypes.tsx:22`, `columnLabel.ts:5`); the stamp labels are shared (`PropertyTypes.tsx:33-34` reads `RESERVED_LABEL`).
  - **Column Names:** `Cells/columnLabel.ts` is a display-name rule used by Views and menus.
  - **Pure Model in a Component File:** `PropertyPicker.tsx` exports five pure model functions (06-04).
  - **Misplaced Row Builder:** `propertyMenuBranches` (`Interface/Menus/propertyMenuActions.ts:38-75`) is a pure row builder, which the codebase structure puts in `Core/Actions` beside its other half, `propertyRows.ts`; `runPropertyAction` (`:77-117`) reaches the session store and stays.
  - **Misnamed Files:** `Views/Cards/cardValueInput.ts` holds card visibility and add entries; `Views/Settings/valueField.tsx` holds a `MenuCaption` one-liner and a multi-toggle hook, already the one module its two callers share (`FilterFrame.tsx:55`, `LocationField.tsx:13`).
  - **Unused Exports:** `runFilePick` is exported only for its test; `optionGlyph` has one external caller.
- **Better:** `TYPE_META` (label, icon, shape) moves into the renderer type record (01-01); `PaneTarget` and related move to a Views-root `Views/paneTargets.ts` beside `filterModel.ts`, since `Views/filterModel.ts` and `Navigation/previewRules.ts` are consumers outside `Views/Settings/`; `columnLabel` moves beside `declaredType` or into the reserved-columns table (01-04); the pick model moves to `Pickers/pickModel.ts`; `propertyMenuBranches` moves into `Actions/propertyRows.ts`; `cardValueInput.ts` becomes `cardColumns.ts`, and `valueField.tsx` takes a name for what it holds. `Cells/` then holds cells only.
- **Estimate:** −10 (mostly moves) · read

###### 06-12 · `text-pane.css` Is Named for One of the Two Components It Styles
- **Now:** `Pickers/text-pane.css` (39 lines, side-effect imported at `ValueEditor.tsx:23`) styles TextPane's `.text-pane` and `.text-pane-close` (`:2-22`; set by `TextPane.tsx:40`, `:54`) and ValueEditor's one-line `.value-field` (`:24-39`; toggled at `ValueEditor.tsx:197`). It's the only plain `.css` in `Core/Properties`, while plain global CSS is Core's majority convention (29 `.css` files to 20 `.css.ts`) and MarkdownPM's surfaces are global (`Core/MarkdownPM/markdown-pm.css`); these rules override `.mdpm-editor .cm-content` in that pattern.
- **Better:** Optionally named for both (such as `value-editor.css`, imported by both components); converting to `.css.ts` would make it the odd one out among editor overrides.
- **Estimate:** ±0 · read

###### 06-14 · The Checkbox "Blank Still Renders" Rule Is Stated Four Times
- **Now:** `Cell.tsx:50-58` checks for a checkbox before the blank test; `cardValueInput.ts:18-21` `fillsBlank` excludes checkbox; `cardValueInput.ts:35` keeps a blank checkbox in Compact (a separate rule from `fillsBlank`, which also excludes stamps); `CardsView.tsx:217-218` keeps the picker open for a blank checkbox.
- **Better:** One type fact, `PROPERTY_TYPES[t].blankDraws` (01-01), read at the four sites.
- **Estimate:** ±0 · read

###### 06-15 · Describers: Document Claims the Code Contradicts, and Overlapping Tests
- **Now:**
  - **Document:** *§The Value Picker* (`.claude/Features/PropertiesPM.md:117`) says setting a value "runs through one control (`PropertyPicker.tsx`) across every surface" and offers "a file field for File", while typed values go through `PropertyValueInput`, File goes through the OS dialog everywhere but Cards' add path (06-07), and the menu goes through `ValuePickPresenter`. The same paragraph re-describes the panel, which *§The Properties Panel* (`:119`) covers.
  - **Tests:** `ValueEditor.test.tsx` covers only the one-line mode (`:83`); `TextPane.test.tsx` is the pane mode's coverage, and its Escape test (`:179`, "Escape commits the typed text once") pins the opposite of the one-line Escape (`ValueEditor.test.tsx:157`, "cancels without a commit"). The alias-memory tests pin each wrapper's `remembers` routing (`PropertyValueInput.test.tsx:363` link → never, `:400` one-line Text → flush, `TextPane.test.tsx:150` the pane's default) beside the mechanism (`ValueEditor.test.tsx:306-350`). The duplicates are the outside-write pair (`ValueEditor.test.tsx:240`, `TextPane.test.tsx:223`) and the one-line no-commit Escape (`ValueEditor.test.tsx:157`, `PropertyValueInput.test.tsx:340`). `PropertyPicker.pane.test.tsx:140` pins 06-07's file pane.
- **Better:** §The Value Picker names the real controls (`PropertyPicker` for options and dates, `PropertyValueInput` for typed values, the OS dialog for files, the path field on Cards' add-chooser), the duplicated panel sentence goes (carried once in 09-05's PropertiesPM rewrite), and the two duplicate pairs collapse, keeping each wrapper's routing tests.
- **Estimate:** about −15 to −30 test lines · read

###### B-06-01 · The Panel's File Value Seat Swallows the Row Menu
- **Now:** A right-click on a File value in the panel calls `fileValueMenu` (`PropertyPanel.tsx:334-336`), which pops `cellMenuModel({ kind: 'file', onChip })` with no `hideable` (`filePick.ts:116-125`) and then prevents the event (`PropertyPanel.tsx:399-401`), so the row's Clear · Remove menu never opens there. Every other non-link value bubbles to the row menu (`:388-391`), and Cards' file menu passes `hideable: true` and offers "Remove from View" (`CardValue.tsx:120-124`, `cellMenu.ts:94`). `fileValueMenu` has this one caller; the shape dates to the monorepo move (`0cdb92cd2`).
- **Better:** Falls out of 06-01 and 06-06: the panel seat maps a File value through `cellMenuModel({ kind: 'file', onChip, hideable: true })` as Cards does, and `fileValueMenu` leaves `filePick.ts`.
- **Behavior:** A panel File value's right-click gains Remove [Intended as J-10].
- **Estimate:** −10 · read

##### Behavior Ledger

| ID | Behavior | Where | Origin | Classification |
|---|---|---|---|---|
| L-01 | Adding a File property from a card's chooser shows a path field (Browse plus typed path); every other route opens the OS dialog | `PropertyPicker.tsx:142-158`, `CardsView.tsx:528` | Direct dialog routes from `a22317e3b` (08-22); `4d0a63975` (09-06) folded the Cards chooser's file popup into `PropertyPicker`'s target union and kept its pane | **Nathan's Intent**: cards' file handling [Intended as J-7] |
| L-02 | Unchecking removes the key; the app never writes a stored "false" | `valueClick.ts:1`, `:30-33`, `propertyMenuActions.ts:114`, `propertyValue.ts:315-325` | `4264df480` and the valueClick header | **Nathan's Intent** [Intended as J-2]; a per-property `false` is a prospect |
| L-03 | A repeat pick on a Select clears it; on a mass run, all-holding clears every row, otherwise only non-holders are set | `PropertyPicker.tsx:391-401`, `massAssign.ts:13-19` | `d6829a48c` (09-11) | **Agent's Choice** |
| L-04 | Clicking a Link value edits it; only its text follows | `valueClick.ts:20`, `:44-46` | `a1ada0fc1` | **Agent's Choice**, an explicit refactor |
| L-05 | A row added in the Properties panel stays shown, empty, after moving to another page or Space, until the Nexus changes | `PropertyPanel.tsx:151-157` ("KNOB — a row added this session outlives a subject change") | `268f14691` (09-21); `PropertiesPM.md:119` | **Nathan's Intent**: the row stays shown while empty and reads as a blank row on every other page, open to cleanup [Intended as J-5] |
| L-06 | The panel's Clear empties the value and keeps the row; Remove empties it and hides the row | `PropertyPanel.tsx:314-318`, `:329-330` | `eb82f1234` | **Agent's Choice**, consistent with the menu copy |
| L-07 | A number drawn as a bar opens a popover on click in place of an inline field | `valueClick.ts:43` | `b9624265e` | **Agent's Choice**; a bar has no text seat |
| L-08 | A number popover shows a leading `#` when the format names no symbol | `PropertyValueInput.tsx:56-62` | `e629012b3` (10-19) | **Agent's Choice**, made explicitly |
| L-09 | An inline Text field edits only the first line, and the lines behind it ride through | `parseEditorValue.ts:12-27` | `b80a7b12a` | **Agent's Choice** [Intended as P-3] |
| L-10 | Compact Cards drop blank values (except checkboxes) and close an open picker when the value goes blank | `cardValueInput.ts:23-36`, `CardsView.tsx:211-219` | Comment only | **Agent's Choice** |
| L-11 | Cards hide the chip × below 80% zoom | `CardsView.tsx:460` (`allowInlineRemove={effectiveZoom >= 0.8}`) | Predates the 09-06 monorepo move | **Nathan's Intent** [Intended as J-6] |
| L-12 | A Status picker can reorder and edit options but can't create one | `PropertyPicker.tsx:312` (`creates = … options === 'select'`); test `PropertyPicker.pane.test.tsx:325` | `033a3d86d` | **Agent's Choice**; a new Status option needs a group, and planning recommends [Intended as J-8] |
| L-13 | The native Properties menu lists option-holding properties first, then leaves | `propertyMenuActions.ts:73` | `832970031` | **Agent's Choice**, made explicitly |
| L-14 | The text pen's accessible name reads "Open in TextPane", a component name exposed to VoiceOver | `TextCell.tsx:89` | `f1bf08f74` | **Accident**; reads "Open In Editor" [Intended as J-4] |
| L-15 | Filter date operands use the Nexus clock; value pickers use the column's clock | `FilterFrame.tsx:365` vs `DateTimeValuePicker.tsx:20` | No commit isolated it | **Accident** (inferred); filters follow the column's clock [Intended as J-1] |

##### Approaches

###### A · One Value Seat (06-01, 06-03, 06-05, 06-06, B-06-01) — INFERRED
- **Removes:** three intent maps, two identical right-click chains plus the panel's third, three editing-state types, three link-seat lines, the panel's `page-value` menu kind, the `rename` intent kind (and `dateTime` if Cards derives its no-click-x rule from type), `valueMenuTarget.ts`, two writer assemblies, and `fileValueMenu` [Intended as J-10].
- **Costs:** one `useValueSeat` and `<ValueSeat>` module (about 120 lines) and a host parameter shape: anchor, hideable, commit, and the panel's row-menu mapping (06-06's `bare` context).
- **Risk:** The panel's Space subject has no `holder` and treats `hideable` as un-reveal. Cards' ghost hold (`holdGhost`, `CardValue.tsx:61-67`) and the table's `interactions.runTitleAction` (`TableView.tsx:306`) interleave with the menu chain, so the seat needs a before/after-menu hook or a title-action passthrough, and the table's lingering `lastOpened` popover keying (`TableView.tsx:110-111`, `:226-265`) has to survive. Net −150 to −250, unmeasured until designed.

###### B · Fold the Menu Path Into the Seat (06-02)
- **Removes:** `ValuePickPresenter.tsx`, the `pendingPick`/`requestPick`/`dismissPick` channel (or its type-deciding half), `CHECKBOX_OPTIONS`, the presenter's echo state, and `valueCommitFor`.
- **Costs:** An app-level seat instance for menus that open off-surface (sidebar, Matrix), so the session channel may stay as "open seat at trigger with intent"; Matrix's `pendingPick` hold (`MatrixView.tsx:45`, `:82`) follows it.
- **Risk:** Low; depends on A. Cards' file pane route stays [Intended as J-7].

###### C · Relocate the Facts (06-09, 06-11, 06-14)
- **Removes:** `TYPE_META` as a separate table, `optionShapeFor` from UIX, "Title" spelled twice, the four-site checkbox blank rule, `PropertyTypes.tsx`'s PaneTarget half, and the misnamed files; the editability predicates become two named type facts ("user-made" and "fillable", 06-02).
- **Costs:** Touches 01's catalog shape, so it lands in the same pass as 01-01 and imports move once; mostly moves and renames across about 20 import sites.
- **Risk:** Churn-heavy for a small line delta; its value is *Less to Understand*.

##### Cross-Domain Notes
- **01/03:** `syntheticContextDef` (`PropertyPicker.tsx:82-87`) fabricates a definition with empty `label` and `key` at six call sites (`propertyMenuActions.ts:72,96`, `PropertyPanel.tsx:364,403`, `useViewHost.ts:212`, `FilterFrame.tsx:378`) so Contexts fit definition-typed APIs.
- **05:** `EditableOptionRows` (`PropertyPicker.tsx:296-372`) embeds the `useOptionEdit` option editor inside the value picker, so option-edit changes there land in a value-surface file.
- **07:** `useViewHost.pickTarget` (`useViewHost.ts:211-234`) and `PropertyPanel.panelTarget` (`PropertyPanel.tsx:361-377`) are two `PickTarget` builders; the panel's omits `style`, so its option chips always render standard (`PropertyPicker.tsx:251`). `CardsView.onReveal`'s `src.type === 'dateTime' || 'file' ? … : 'popover'` (`CardsView.tsx:528`) is a third type router for "fill from away".

---

#### Scout 07 — Views Integration

Baseline `d0595b22d`, every cited line re-opened at HEAD. NexusOS's 20 view-bearing files (every `_pagecollection.json`, `_pageset.json`, `_tiles.json`, and `matrix.json`) were surveyed read-only; `~/Test` holds no property data and no Benchmark Nexus is on disk, so "no Nexus holds X" covers NexusOS and `~/Test`.

##### How Saved Views Name Things

- **Properties:** by `prop_` id (`sort[].property_id`, `filter` rules, `group`, `sub_group`, `property_order`, `hidden_properties`, `column_widths`, `column_alignments`, `column_styles`).
- **Options:** by label. `sort[].order: ['Active','Open',…]` sits in `Ideas/_pagecollection.json` (`views[0].sort[0].order`), the homepage `_tiles.json` (`tiles[0].views[0..1]`), and `.nexus/contexts/Projects/Pommora/_tiles.json` (`tiles[2]`); the homepage tile's filter holds `values: ['Complete','Closed','Archived','Revisit']`; `group.order` sits in `Ideas` views 0 and 1. `hidden_groups` stores `<prop>/<label>` or `sub/<prop>/<label>`, and `collapsed_groups` stores a bare `<label>` for top-level buckets and `<setId>/<label>` for sub-buckets.
- **Spaces:** by id (a `contains_any` rule in `.nexus/contexts/Projects/Pommora/_tiles.json`, `tiles[2].views[0].config.filter`).
- **Locations:** by Set id, or by a typed folder name.
- **Dates:** by bucket key, which depends on granularity.

`PropertiesPM.md:131` confirms options are named by label, so an option rename or delete sweeps six view roles across every sidecar, tile document, `matrix.json`, and `settings.openInPreview` (`Core/Nexus/configReach.ts:182-196`, `:378-417`).

##### Inventory

| File / Symbol | Lines | Property Responsibility | Home |
|---|---|---|---|
| `Views/Pipeline/filter.ts` `prepareRule`, `evaluatorOf`, `evaluate*`, `textValue` | 1-301 | Per-kind filter semantics: operand parsing, comparison, text projection | Compilation stays; evaluators go to a per-kind view spec (07-02); `textValue` folds into `shownText` (07-04) |
| `Views/Pipeline/filter.ts` `prepareLocation` | 89-115 | Location (Set tree) matching | Here |
| `Views/Pipeline/sort.ts` `buildCriterion`, `rank`, `numberOf`, `dateOf`, `boolRank`, `sortText`, `resolvedSortCount` | 1-159 | Per-kind sort keys and comparators; Custom option order | Comparator composition stays; per-kind key extraction to the spec; `sortText` folds into `shownText` (07-04) |
| `Views/Pipeline/group.ts` `bucketKey`, `dateBucketKey`, `isoWeek`, `bucketOrder`, `liveBucketOrder`, `configuredOrder`, `readable`, `groupPlan` | 143-405 | Per-kind bucket keys, option-order buckets, date bucketing, the manual-date-order guard | Here; `bucketKey`'s kind switch to the spec (`bucket`) |
| `Views/Pipeline/group.ts` `flattenContainer`, `toRow`, `frontmatterOf` | 100-140 | Builds `ViewRow` from page plus values | Here (Properties consumes the row shape, 07-15) |
| `Views/Pipeline/columns.ts` `resolveColumns`, `columnKind` | 1-46 | Column allowlist; classifies title/stamp/context/property | Here; also carries resolved type and def (07-01) |
| `Views/Pipeline/creationSeeds.ts` `ruleSeed`, `mergeSeeds`, `filterSeeds` | 1-104 | Filter → seed values per kind | Here; kind switch to the spec (`seedsFromFilter`) |
| `Views/Pipeline/resolveView.ts` | 1-56 | Composes filter, sort, group | Here |
| `Views/Pipeline/pickView.ts` | 1-19 | Default view minted once per schema | Here; the schema key is redundant (07-08) |
| `Views/filterModel.ts` `KIND_OPS`, `operatorsFor`, `filterTargets`, `decodeFilter` | 1-147 | Per-kind operator menus and value slots | Model stays; `KIND_OPS` to the spec; I-042 moves the file to `Views/Settings/` |
| `Views/filterRules.ts` `FILTER_OPS`, `SUBSTRING_OPS`, `OPERANDLESS_OPS` | 29-60 | Operator vocabulary | Here |
| `Views/reassign.ts` `FROM_GROUP_KEY`, `reassignable`, `groupKeyToValue` | 1-31 | Bucket key → value per kind (drag reassign, seeds) | Spec (`fromBucket`) |
| `Views/visibilityModel.ts` | 1-52 | Show and hide of property ids in a view | `Views/Settings/` (I-042) |
| `Views/views.ts` `savedView`, `SubGroupConfig`, `hiddenBucketKey`, `legacyBucketKey`, `isBucketHidden`, `toggleHiddenBucket`, `editHiddenBucket`, `clearHiddenBuckets`, `mintNewView` | 62-447 | Stored view shape naming properties and options; hidden-bucket key scheme; legacy key reads | Here, less the legacy reads (07-06) |
| `Views/Bands/bandModel.ts` `headContextOf`, `dateLabeller`, `draggable` | 44-151 | Date face vs option face of a bucket (`def.type === 'dateTime'`) | Here; the branch reads the spec (`groups: 'date'`) |
| `Views/Bands/bandRouter.ts` `routeBucket` | 112-133 | Bucket drag rewrites group or sub-group order by label | Here |
| `Views/Bands/GroupBand.tsx` | 77, 224-237 | Draws OptionChip or date glyph per face | Here |
| `Views/Host/useViewHost.ts` `pickTarget`, `sortReassign`, `reassignBySortRun`, `commitGroupValue`, `styleOf` | 60-234 | Picker kind per type; reassign by sort run; column style accessor | Host wiring stays; `pickTarget`'s type dispatch is 06's |
| `Views/Host/useViewCreation.ts` `SEEDS_FROM_SORT`, `withSeeds`, `createAdjacent` | 32-57, 235-256 | Which kinds a new page inherits from its sort anchor; seed frontmatter patch | Gesture stays; the table to the spec; `withSeeds` shares `assignValue`'s patch (07-14) |
| `Views/Host/useColumnStyles.ts` `styleFor`, `pickedStyle`, `columnStylePatch`, `useStyleFor`, `useColumnStyleMap` | 23-102 | Resolves a column's per-view look over the type default | Here; four accessors (07-09) |
| `Views/Host/useBandHeads.ts`, `useActiveView.ts` | 1-35, 1-15 | Band heads with date labels; active view pick | Here |
| `Views/Table/useColumns.ts` `WIDTHS`, `STYLE_MIN`, `DEFAULT_ALIGN`, `widthFor`, `minWidthFor`, `clampWidth`, `defaultAlignFor`, `openHeaderMenu`, `commitHide` | 30-136, 288-330 | Per-type widths, min-by-look, alignment; header style menu; hide | Here (Table layout) |
| `Views/Table/TableView.tsx` `runIntent`, `onCellClick`, `popoverField`, `openCellMenu`, `massPicker`, `headerIcon`, `startSweep` | 133-430 | Cell intent dispatch, Link `seat`, mass assign, header icon per column | Host stays; the type branches are 06's |
| `Views/Cards/CardsView.tsx` `PROPERTY_PICKER_KINDS`, checkbox exception, `seat`, add-picker routing, text-value class | 88, 211-219, 494, 528, 718 | Picker routing per type | Host stays; the branches are 06's |
| `Views/Settings/FilterFrame.tsx` `mintRule`, `ChipsField`, `valueCell`, `ruleRow` | 120-460 | Operator and value UI by slot; Context vs option chip; checkbox lead glyph | Here |
| `Views/Settings/GroupFrame.tsx` `orderOptionsFor`, `pickOrder`, `DateBucketList`, `LocationHierarchy` | 105-534 | Option vs date ordering UI; date bucket list (refetches values) | Here; six `type === 'dateTime'` branches read the spec |
| `Views/Settings/SortFrame.tsx` `directionOptions` | 48-69 | Direction labels per kind | Spec (`sort.directions`) |
| `Views/Settings/OptionOrderList.tsx` | 55-107 | Option-order list for group or sort | Here |
| `Views/Settings/VisibilityFrame.tsx` `rowGlyph` | 23-28 | Column icon resolution, a third copy | The one reserved-columns table (01-04) |
| `Views/Settings/SettingsFrame.tsx` | 76 | Derives schema by hand | `containerSchema` (07-12) |
| `Views/Settings/LayoutFrame.tsx`, `ViewFrame.tsx`, `ViewLeaf.tsx`, `valueField.tsx` | — | Pass `schema` through; `ViewFrame:80` mints a view with the schema | Here |
| `Tiles/Surfaces/ViewTile.tsx` `coerceEmbeddedView`, `schema` | 71, 258, 359 | Schema for the embed; fallback default view | Here |
| `Matrix/matrixInput.ts` `answers`, `matrixVisible` | 80-135 | Prunes rules a Space can't answer (per origin); runs the view filter over pages and Spaces | Here |
| `Properties/columnStyles.ts` | 1-155 | Look and date-format vocabulary; `columnStyle` codec; `resolveStyle`, `storedPick`, `defaultStyleFor` | Properties: consumed by `Settings/personalization.ts:3`, `Settings/frames.ts:41`, `Properties/formatValue.ts:3`, `Bundles/browser.ts:30`, and the Schema editors, so it's Nexus-wide type-look vocabulary; `defaultStyleFor` joins the per-type looks record |
| `Properties/value.ts` `declaredType`, `columnType`, `resolveFieldValue` | 14-61 | Column type classifier ×2; memoized value read | Properties; imports `ViewRow`, `ResolvedColumn` from Views (07-15) |
| `Properties/formatValue.ts` `formatBucketLabel` | 155-184 | Group-bucket labels; imports `DateGranularity`/`DateSeparator` from `Views/views` (`:4`) | `Views/Pipeline/group.ts` (07-15) |
| `Nexus/configReach.ts` `ROLES`, `RENAME`, `CLEAR`, `GONE`, `wholeValues`, `collapsedKeys` | 47-262 | The sweep of saved-view property and option references; `ROLES` is `satisfies Record<keyof SavedView, Role>` (`:95`) | Beside `views.ts` (Cross-Domain Notes) |

##### Per-Type Branch Map

Every site in the domain that switches on, or tables by, property type or value kind.

| Site | Keyed By | Decides |
|---|---|---|
| `Views/Pipeline/filter.ts:83` | `t === 'title'` | Title uses the text evaluator |
| `Views/Pipeline/filter.ts:117-136` `evaluatorOf` | `ValueKind` + op | Evaluator per kind; Select splits on is/isNot → members, else text |
| `Views/Pipeline/filter.ts:138-155` `textValue` | `ValueKind` | Text projection: select / text (`shownProse`) / link (`linkDisplayText`) |
| `Views/Pipeline/filter.ts:157-300` `evaluate*` | op per kind | Operand parsing and comparison (number, date, checkbox, text, members, presence) |
| `Views/Pipeline/sort.ts:79-80` | `RESERVED_PROPERTY_ID.title` | Title sorts by `r.title`, case-insensitive |
| `Views/Pipeline/sort.ts:81-109` `buildCriterion` | `ValueKind` | Key extractor plus `less`: rank / numeric / date / bool / text; context and unknown → no criterion |
| `Views/Pipeline/sort.ts:55-75` `sortText` | `ValueKind` | Text projection: text / link / multiSelect joined / file `fileName` joined |
| `Views/Pipeline/group.ts:172-195` `bucketKey` | `ValueKind` | Bucket key: select → label, checkbox → `'true'`, dateTime → date bucket, rest → none |
| `Views/Pipeline/group.ts:382-385` `readable` | `declaredType === 'dateTime'` | Manual order coerced to configured |
| `Views/Pipeline/group.ts:398, 401` | `groupable()` = `TypeSpec.groups` | Whether a group or sub-group applies (dateTime, select, status) |
| `Views/Pipeline/columns.ts:11-15` `columnKind` | reserved / stamp / contextIds | Column kind |
| `Views/Pipeline/creationSeeds.ts:20-43` `ruleSeed` | `ValueKind` + op | context/multiSelect seed on Is Any or Is All; else Is → `groupKeyToValue` (only select and checkbox yield); a rule names exactly one operand (`:26`) |
| `Views/Pipeline/creationSeeds.ts:52` `mergeSeeds` | `kind` | Unions list kinds |
| `Views/filterModel.ts:110-120` `KIND_OPS` | `ValueKind` | Operator menu plus value slot per kind |
| `Views/filterModel.ts:127-128` | title / location | Title and Location op sets |
| `Views/reassign.ts:6-16` `FROM_GROUP_KEY` | `ValueKind` | Bucket key → value (select, checkbox) |
| `Views/Host/useViewCreation.ts:32-42` `SEEDS_FROM_SORT` | `ValueKind` | New Page Above/Below inherits the anchor's sort value (select, checkbox, number, dateTime) |
| `Views/Host/useViewCreation.ts:245-246` | `spec.origin !== 'user'` | Stamps don't seed |
| `Views/Host/useViewHost.ts:211-234` `pickTarget` | `kind === 'dateTime' && origin === 'user'`, `type === 'file'` | Picker kind: date / file / options |
| `Views/Host/useViewHost.ts:72, 114` | `reassignable()` | Cross-band and sort-run reassign |
| `Views/Bands/bandModel.ts:54-86` `headContextOf` | `def.type === 'dateTime'` (`:66`) | Date face vs option face |
| `Views/Bands/bandModel.ts:142-151` `draggable` | `face.kind` | Date buckets don't drag |
| `Views/Table/useColumns.ts:32-46` `WIDTHS` | `PropertyType \| 'title'` | Min, default, and max width |
| `Views/Table/useColumns.ts:52-57` `STYLE_MIN` | type × look | Min width by look |
| `Views/Table/useColumns.ts:103-117` `DEFAULT_ALIGN` | type | Default alignment |
| `Views/Table/useColumns.ts:312-314` | `t !== 'title' && t !== 'context'` | Whether the header offers Style |
| `Properties/columnStyles.ts:133-155` `defaultStyleFor` | `ValueKind` | Default look |
| `Actions/columnMenu.ts:64-93` `styleMenuItems` | `ValueKind` | Which looks or date formats the Style menu offers |
| `Views/Settings/SortFrame.tsx:48-69` `directionOptions` | `ValueKind` | Default/Reversed vs A→Z vs Ascending |
| `Views/Settings/SortFrame.tsx:92, 119` | `origin === 'user'`, `kind === 'select'` | Sort targets; Custom order only for option kinds |
| `Views/Settings/GroupFrame.tsx:105-106` `orderOptionsFor` | `type === 'dateTime'` | Date vs option order picker |
| `Views/Settings/GroupFrame.tsx:154` | `groupable(d.type)` | Group targets |
| `Views/Settings/GroupFrame.tsx:159, 236, 279, 304, 309` | `type === 'dateTime'` | Date heading prop (Separation footing), Date By rows top and sub, chip region, DateBucketList vs OptionOrderList |
| `Views/Settings/FilterFrame.tsx:167-177` | `contextOptions` present | NeutralChip vs OptionChip |
| `Views/Settings/FilterFrame.tsx:380, 408-410` | `declaredType === 'context' / 'checkbox'` | Context options; checkbox lead glyph |
| `Views/Settings/VisibilityFrame.tsx:23-28` `rowGlyph` | def / title / stamp / context | Row icon |
| `Views/Table/TableView.tsx:260`, `Views/Cards/CardsView.tsx:494`, `Properties/PropertyPanel.tsx:539` | `def.type === 'link'` | `seat='rename'` (three copies) |
| `Views/Table/TableView.tsx:287, 330` | `columnType === 'link'`, `pickKindOf` | Link menu; sweep eligibility |
| `Views/Table/TableView.tsx:406-430` `headerIcon` | context / def / type | Header icon |
| `Views/Cards/CardsView.tsx:217, 528, 718` | `type === 'checkbox'`, `type ∈ {dateTime, file}`, `columnType === 'text'` | Compact blank exception; add-picker routing; text class |
| `Matrix/matrixInput.ts:80-100` `answers` | `spec.origin` | Which rules a Space answers |
| `Nexus/configReach.ts:127-128` `wholeValues` | `kind === 'multiSelect'` + op | Which rule operands an option rename rewrites |

###### The Table of Tables

Five sites answer "can this type do X?" with five different membership sets, each right in itself and none reading the others or one shared declaration.

| Question | Members |
|---|---|
| `groupable` (`properties.ts:38-41,55-56`) | dateTime, select, status |
| `reassignable` / `FROM_GROUP_KEY` (`reassign.ts:6-24`) | select, status, checkbox |
| `SEEDS_FROM_SORT` (`useViewCreation.ts:32-42`) | select, status, checkbox, number, dateTime |
| `pickKindOf` (`properties.ts:60-76`) | select, status, multiSelect, context |
| `ruleSeed` (`creationSeeds.ts:29-42`) | select, status, checkbox, multiSelect, context |

##### Findings

###### 07-01 · A Column's Type and Definition Are Re-Resolved per Cell Instead of Once per View
- **Now:**
  - **The scan runs before the memo:** `resolveFieldValue` does a linear `schema.find((d) => d.id === propertyId)` (`Properties/value.ts:48`) before its memo lookup (`:50-59`). The WeakMap is keyed on the definition, so it saves the decode but never the scan, which runs per row × per filter rule (`filter.ts:85`), per row × per sort criterion (`sort.ts:34,40,45,51,56`), per row per grouping (`group.ts:178`), and per cell in Table and Cards.
  - **Two classifiers for one question:** `declaredType` scans again (`value.ts:23`) and checks `contextIds.includes` (`:22`); `columnType` (`value.ts:27-31`) is a second classifier that exists because `contextIds` is optional.
  - **An optional `contextIds`:** it defaults to `[]` in `declaredType` (`value.ts:17`), `widthFor`, `minWidthFor`, `clampWidth`, `defaultAlignFor`, `alignFor` (`useColumns.ts:65,76,93,123,133`), `operatorsFor` (`filterModel.ts:125`), `resolveColumns` (`columns.ts:40`), `hiddenListIds` (`visibilityModel.ts:10`), `applyFilter` (`filter.ts:41`), and `resolveView` (`resolveView.ts:29,31`). Comments warn at `useColumns.ts:61,119`, and `Properties/Cells/columnLabel.ts:10` calls the same parameter "deliberately un-defaulted". `declaredType` calls omit it at `useColumns.ts:310`, `TableView.tsx:424`, `sort.ts:81`, `useViewHost.ts:71,113`, `useViewCreation.ts:245`, `SortFrame.tsx:52`, `useColumnStyles.ts:30`, and `group.ts:383,398,401`.
  - **Scale:** 23 `schema.find((d) => d.id === …)` lookups across Views and Matrix non-test files (6 in `TableView.tsx`: `:145,172,211,249,280,416`), 25 counting `value.ts:23,48`, and 21 `declaredType(` calls.
- **Better:** `resolveColumns` already classifies each column once per view (`columns.ts:18-34`); it returns `ResolvedColumn = { id, kind, type, def }` with the Context classification done there, and cells, menus, width, align, and the picker read `col.type` and `col.def`. `ResolvedColumn` is also built by hand at `PropertyPanel.tsx:382`, `cardValueInput.ts:71` (`addColumn`), and `useViewHost.ts:196` (`commitGroupValue`), so those resolve type and def too. One `fieldOf(id, schema, contextIds)` → `{ type, spec, def, read(row) }` is compiled once in `prepareRule`, `buildCriterion`, and `property()`/`structuralSubGrouped()`, with `read` going straight to the memo. `columnType`, the hot-path scan, and every optional `contextIds` default go. `useColumns.ts:310` and `TableView.tsx:424` then classify Context columns correctly, with no visible change: `useColumns.ts:312-314` excludes context and unknown alike, and `TableView.tsx:408-414` returns a Context's own icon before `:424` whenever the value context exists (`contextIdentity.ts:8,41`).
- **Estimate:** −60 to −100 · read (call sites), inferred (delta)

###### 07-02 · Views States Each Type's Behavior in About 15 Separate Switches
- **Now:** See the Per-Type Branch Map.
  - **Grouping:** `TypeSpec.groups?: true` (`properties.ts:30`) says whether a type groups but not how, so the date-vs-option family is re-decided by `=== 'dateTime'` in `group.ts:383`, `bandModel.ts:66`, and `GroupFrame.tsx:106,159,236,279,304,309`: eight checks.
  - **Sort:** the comparator class is picked in `sort.ts:81-109`, and its direction labels again in `SortFrame.tsx:48-69`, over the same partition.
  - **Filter:** operators come from `filterModel.ts:110-120`, evaluators from `filter.ts:117-136`, and the "operands are option words" fact a third time in `configReach.ts:127-128` (07-11).
  - **Looks:** stated in `columnStyles.ts:133-155` (default look), `columnMenu.ts:64-93` (offered looks), and each Schema editor's style options (`CheckboxEditor.tsx:8`, `NumberEditor.tsx:25`, `PropertyFrame.tsx:72` `OPTION_STYLE_OPTIONS`); defaults are always `looks[0]`, except Link, which reads `def.link_display`.
- **Better:**
  - **Smallest Step:** `groups?: 'option' | 'date'`, so the eight branches read `spec.groups === 'date'`. It re-spells the checks rather than removing them; the gain is one declaration of the date family. A per-type looks record sits in `columnStyles.ts` beside `OPTION_LOOKS`/`CHECKBOX_LOOKS`/`NUMBER_LOOKS`, since `looks` on `TypeSpec` would make `properties.ts` import `ColumnLook` from `columnStyles.ts`, which already imports `properties.ts` (`columnStyles.ts:3-10`); `defaultStyleFor`, `styleMenuItems`, and the editors read it.
  - **Fuller Step:** one `Views/viewKinds.ts` `Record<ValueKind, ViewKindSpec>` holding `{ ops, evaluate, sortKey, less, directions, bucket?, fromBucket?, seedsFromSort, seedsFromFilter }`, which `filter.ts`, `sort.ts`, `group.ts`, `reassign.ts`, `creationSeeds.ts`, `filterModel.ts`, `SortFrame.tsx`, and `useViewCreation.ts` ask. It's a third per-type record beside 01-01's engine and renderer records, keyed by `ValueKind`; it earns its place by owning view behavior and removing more than it adds, and lands after 07-01's compiled columns so it doesn't key on a column taxonomy F-2 and F-3 change.
  - **Host-Graph Note:** `filter.ts`, `sort.ts`, and `group.ts` are React-free, and `matrixInput.ts` is renderer-side (reached through `Matrix/matrixRuntime.ts`). The host constraint is `Nexus/configReach.ts`, which runs from `Core/Contract/serve.ts`'s graph and already imports `Views/views` and `Views/filterRules` (`configReach.ts:9,18`); if it asks the spec (07-11), `viewKinds.ts` stays a `.ts` importing no `.tsx`. `filterModel.ts` imports `Properties/Cells/PropertyTypes` (`filterModel.ts:15-22`), so `KIND_OPS` moves without the pane targets (`Core/Contract/engineGraph.test.ts:7-9`).
- **Estimate:** −80 to −150 for the fuller step · read (branches), inferred (delta); the smallest step is about ±0

###### 07-03 · The Filter Re-Parses Its Constant Operand on Every Row, and an Unreadable Operand Passes Every Row
- **Now:**
  - **Per-Row Parsing:** `readNumber(want[0])` (`filter.ts:165`), `readDate(want[0])` (`:194`, a regex plus a `Date` per row), and `checkboxWord(want[0])` (`:235`) run inside the per-row evaluators, while `prepareRule` already hoists `foldKey` for text operands (`:84`).
  - **Unreadable Operands:** these return `true` for every row (`:166, :195, :236`), as does every evaluator's `default:` (`:181, :224, :240, :266, :287, :298`). `FILTER_OP_SET` (`:31,78`) only checks that an op is a known filter op, so a known op the kind lacks (`greater_than` on a Checkbox) also lands in `default: true`. Inside an `any` group one such rule matches everything. `prepareRule` already defines abstaining as returning `undefined` (`:69`) for unknown ops and dead properties.
- **Better:** Each kind's `prepare(op, operands)` returns `RowTest | undefined`; operands parse once, and an unparseable operand or an op the kind lacks abstains at prepare time. The `default: return true` arms and the per-row parsing go.
- **Behavior:** A garbage operand in an Any group stops showing every row, and an All group reads the same. The number field is a free-text `EditableInput` (`FilterFrame.tsx:336-349`), so a user reaches it; the date slot is a `CalendarPicker` and the checkbox slot carries an implied value. `filterSeeds` reads `prepareRule`'s pass-or-abstain (`creationSeeds.ts:75-103`), so an Any group holding a garbage rule, which seeds nothing today (`:97`), can seed from its first satisfiable rule [Intended as K-1].
- **Estimate:** −10 to −20 · read

###### 07-04 · The "Value as Shown Text" Projection Is Written Twice, and the Two Copies Differ
- **Now:** `filter.ts:138-155` `textValue` and `sort.ts:55-75` `sortText` both map a value to a string through `shownProse` and `linkDisplayText`. Filter returns `null` for `multiSelect` and `file`, while sort joins them (`v.value.join(',')`, `v.value.map(fileName).join(',')`); it hasn't surfaced because `evaluatorOf` routes those kinds to members or presence (`filter.ts:130-134`). Title is handled a third way in each (`filter.ts:82-83` through the select pun, `sort.ts:79-80` through `r.title`).
- **Better:** One `shownText(value): string | null` in `Properties/formatValue.ts` covering select, text, link, multiSelect, and file, keeping the `select` arm, since `filter.ts:126` routes Select's `contains`/`starts_with` to `evaluateText`. `textValue` and `sortText` and their two 10-arm switches go; they're the only callers of `shownProse`/`linkDisplayText` for a property value.
- **Estimate:** −15 · read

###### 07-05 · Every Value Write Re-Runs the Whole Pipeline, and Per-Row Derived Keys Are Recomputed Each Run
- **Now:** One optimistic write calls `setValueOverride`, which rebuilds `effectiveValues` by shallow-copying the values map (`useContainerValues.ts:88-101`) and re-runs the single `useMemo` in `useViewHost.ts:84-90`: `flattenContainer` builds a new `ViewRow` per page (`group.ts:105-140`), then the full filter, sort (decorate plus N log N), and grouping. A value read landing (`useContainerValues.ts:85`) repeats it. `resolveFieldValue`'s memo (`value.ts:50-64`) keeps the decode cheap for untouched rows, whose frontmatter keeps its identity, but the derived keys are recomputed per row per run: `readDate` (`sort.ts:46`, `group.ts:153`, `filter.ts:187`), `shownProse`/`linkDisplayText` (`sort.ts:59-61`, `filter.ts:143-145`), `foldKey` (`filter.ts:253`), and 07-03's operand parses. On a 50k-page Nexus that's 50k regex date parses plus a 50k sort per cell commit (inferred).
- **Better:** Cache derived keys per (frontmatter, def) beside the decode memo, or at minimum memoize `readDate` per ISO string. Memoizing `toRow` per (`PageNode`, `RowValues` entry) saves nothing until a stage keys on row identity, so it belongs to Approach B.
- **Estimate:** +15 / −5, landing only once a Benchmark shows the cost · read (mechanism), inferred (cost)

###### 07-06 · Legacy Bare Hidden-Group Keys Are Still Read
- **Now:** `38df2a0d0` (F-383) moved hidden-bucket keys to `<prop>/<bucket>` and `sub/<prop>/<bucket>` but kept reading the bare `<bucket>` and `sub/<bucket>` spellings through `legacyBucketKey` (`views.ts:317-323`), used by `isBucketHidden` (`:332-336`), `toggleHiddenBucket` (`:347-348`), and `editHiddenBucket` (`:369-370`); the bare-`sub/` clause of `clearHiddenBuckets` (`views.ts:382`); and the `/^\d{4}/` year sniff in `DateBucketList` (`GroupFrame.tsx:510-511`, from `247994ded`). Tests pin them at `resolveView.test.ts:561,593,619`, `views.test.ts:553,562,600,604`, and `GroupFrame.test.tsx:268`. NexusOS's one `hidden_groups` is `[]` (`Studio/_pagecollection.json` `views[0]`), and `~/Test` holds none.
- **Better:** Delete `legacyBucketKey`, its three call branches, the year sniff, the legacy clause in `clearHiddenBuckets`, and the eight tests.
- **Estimate:** −35 / −60 tests · read

###### 07-07 · Collapsed Bucket Keys Are a Bare Label While Hidden Keys Are Scoped by Property, So Collapse Leaks Across Groupings
- **Now:** A top-level property bucket's band key is its bare label (`group.ts:253`, `key = value = label`), and that's what `collapsed_groups` stores (`useViewHost.ts:149-155`, the only writer); F-383's scoping reached `hidden_groups` only (`views.ts:314-315`). A "Done" collapsed under Status stays collapsed when the view regroups by another property with a "Done", and nothing clears `collapsed_groups` on a Group By change. The sweep needs its own `collapsedKeys` (`configReach.ts:167-178`) beside `editHiddenBucket`, and deleting the grouped property clears every collapsed key, Set ids from an earlier structural grouping included (`configReach.ts:212-214`). `Ideas/_pagecollection.json` holds bare labels under its Status grouping (`views[0]`: `open`, `closed`, `Archived`, `Paused`, `Closed`, `Complete`; `views[1]`: `open`, `Paused`, `Revisit`, `Closed`), and `.nexus/contexts/Projects/Pommora/_tiles.json` `tiles[2]` holds labels under a now-structural grouping, a live instance of the leak. Lowercase `open`/`closed` match no current option (the group's `order` holds `Open`/`Closed`), so they're already dead.
- **Better:** Key property buckets the way hidden keys are keyed (`<prop>/<bucket>` top-level; `<setId>/<prop>/<bucket>` under a Set, replacing `subGroupKey`, `group.ts:311`), and let RENAME and CLEAR reuse `editHiddenBucket` and `clearHiddenBuckets` for both fields; `collapsedKeys` and the bespoke `bandKeys` handlers go. NexusOS's keys convert under their property once.
- **Behavior:** Collapse no longer carries across a Group By switch, deleting the grouped property keeps structural collapse memory, and the Ideas views' collapsed buckets carry over through the conversion [Intended as D-2, K-1].
- **Estimate:** −15 · read

###### 07-08 · A New View Seeds `hidden_properties` With Every Schema Id, Duplicating the `property_order` Allowlist
- **Now:** `mintNewView` writes `hidden_properties: schema.map((d) => d.id)` (`views.ts:441`) with `property_order: [title]` (`:440`). Every reader already treats "absent from `property_order`" as hidden: `resolveColumns` iterates `property_order` only (`columns.ts:26`), `hiddenListIds` hides on `set.has(id) || !shown.has(id)` (`visibilityModel.ts:14`), `unhide` and `placeInShown` add to the order and remove from hidden (`visibilityModel.ts:22-51`), and `reorderColumns` keeps only `property_order` ids (`useColumns.ts:141-150`). The seed is redundant state that enlarges the property-delete CLEAR (`configReach.ts:67`), and it's the only reason `mintNewView`/`mintDefaultView` take a schema, which makes `pickView` key its default by schema in a WeakMap (`pickView.ts:5-18`) and makes `tilesFile.ts:84`, `ViewTile.tsx:71,359`, and `ViewFrame.tsx:80` pass one (`Nexus/create.ts:66` passes `[]`).
- **Better:** Mint `hidden_properties: []`, drop the `schema` parameter from both mints, and make `pickView`'s fallback one module-level default view with `DEFAULT_VIEW_ID`; the WeakMap goes, and 07-12 becomes moot. A new view renders identically.
- **Estimate:** −15 · read

###### 07-09 · Four Ways to Get a Column's Resolved Style
- **Now:** `styleFor(columnId, schema, view, nexus)` (`useColumnStyles.ts:35`); `useStyleFor()` (`:83`), consumed by `FilterFrame.tsx:234,353,410` and `Properties/Schema/PropertyFrame.tsx:188,406`; `useColumnStyleMap(host)` (`:93`), memoized, used by Table (`useColumns.ts:186`) and Cards (`CardsView.tsx:208`); and `host.styleOf` (`useViewHost.ts:210`), unmemoized and allocating per call, handed to `runPropertyAction` (`useViewInteractions.tsx:412`). `useBandHeads.ts:29` builds its own closure and `GroupFrame.tsx:210,519` call the raw form. Each call runs `declaredType` and `schema.find` (`useColumnStyles.ts:29-31`).
- **Better:** The view host owns one memoized style map that `host.styleOf` reads, folding in `useColumnStyleMap`; the Settings panes keep the pure `styleFor` with `useNexusForms()`, as `GroupFrame` does, and `useStyleFor` goes. After 07-01, `columnDefaults` reads `col.type` and `col.def`.
- **Estimate:** −20 · read

###### 07-10 · The Matrix Filter Compiles the Whole Filter Once per Space — INFERRED
- **Now:** `matrixVisible` runs `mapRules` plus `applyFilter([row], pruned, …)` for every Space (`matrixInput.ts:118-132`), each compiling the filter (`prepareGroup`) again, and page rows are rebuilt from every seat on every values reply (`:113`). It scales with Spaces × rules and runs only while a Matrix filter is set (`:108`).
- **Better:** A Space's prune depends only on which rules its sidecar keys answer (`answers`, `:80-100`; only the `user`-origin arm reads the row, `:94-98`), so the pruned filter could compile once per distinct prune. Until a timing with hundreds of Spaces shows a cost, the signature cache is new machinery without evidence.
- **Estimate:** ±0 · read (mechanism), unmeasured (cost)

###### 07-11 · Whether a Rule's Operands Name Whole Options Is Decided in Three Places
- **Now:** The evaluator picks "members" for multiSelect/context and Select's is/isNot (`filter.ts:125-132`); the pane assigns `slot: 'chips'` (`filterModel.ts:70-92`); and the option-rename sweep re-derives it as `kind === 'multiSelect' || !SUBSTRING_OPS.has(op)` (`configReach.ts:127-128`). `does_not_contain` and `contains` mean substring on text but membership on sets (`filter.ts:259-262` vs `:280-285`), which is why the sweep needs `wholeValues`.
- **Better:** The per-kind op table (07-02) carries `operands: 'words' | 'text' | 'date' | …`, and `configReach.optionRule` asks it, keeping the table renderer-free (07-02's host-graph note).
- **Estimate:** −5 · read

###### 07-12 · SettingsFrame Derives the Schema by Hand
- **Now:** `SettingsFrame.tsx:76` uses `schemaCollection.properties ?? []` (`CollectionNode.properties` is optional, `Nexus/tree.ts:65`), while every other surface uses `containerSchema` and its shared `NO_SCHEMA` (`treePatch.ts:125-131`). The fresh `[]` per render misses `pickView`'s per-schema mint cache (`pickView.ts:16`), so a property-less, view-less Collection mints a new default view every render.
- **Better:** `containerSchema(tree, node)`; moot under 07-08 and 08-02.
- **Estimate:** −1 · read

###### 07-13 · Title Passes as a Select Value and Is Special-Cased Wherever a Type Is Asked
- **Now:** `resolveFieldValue` returns Title as `{ kind: 'select', value: row.title }` (`value.ts:43`), which `filter.ts:82` has to explain. `declaredType` returns a `'title'` pseudo-type (`value.ts:19`) and `specOf('title')` returns `undefined` (`properties.ts:52-53`), so every `specOf(...)?.kind` switch carries a `case undefined` lumping Title with unknown properties (`sort.ts:107`, `SortFrame.tsx:66`, `columnStyles.ts:152`, `properties.ts:73`). Title is then handled ad hoc in `filter.ts:83`, `sort.ts:79-80`, `filterModel.ts:107-108,127`, `SortFrame.tsx:53`, and `useColumns.ts:33,104`. `columnLabel.ts:4-8` is the reserved-label table for Title and both stamps, not a type question.
- **Better:** Title's value reads as `{ kind: 'text' }` and its spec (`{ kind: 'text', origin: 'reserved' }`) sits on the record for built-in columns, beside a stored-definition enum that keeps Context [Intended as F-1, F-3]; a `title` entry in `PROPERTY_TYPES` (`properties.ts:10-24,34`) would make `type: 'title'` a decodable definition type. The filter, sort, and SortFrame special cases go; `TITLE_OPS` (`filterModel.ts:107-108`) stays, since Title offers no empty ops.
- **Behavior:** Effectively preserving (inferred): text reads through `shownProse`, so a title holding literal `[[…]]` would filter and sort on its shown text.
- **Estimate:** −15 · read (sites), inferred (edge)

###### 07-14 · The Creation Seeds Copy `assignValue`'s Context-vs-Property Split
- **Now:** `withSeeds` (`useViewCreation.ts:44-57`) re-implements the split in `assignValue.write` (`assignValue.ts:38-57`) for a created page's optimistic patch (`useViewCreation.ts:127-136`): Context values go to `contexts`, anything else through `applyValueAtRoot`. `write` splits on `column.kind` (`assignValue.ts:44`) and `withSeeds` on whether the schema holds the id (`useViewCreation.ts:52-54`).
- **Better:** One exported `patchedValues(schema, frontmatter, seeds)` in `assignValue.ts` used by both. `write` also builds the `setContext`/`setProperty` request and calls `send` per value, so only the two-branch patch is shared; the host side of seeds (`Nexus/create.ts:35-41`) is 02's.
- **Estimate:** about −3 · read

###### 07-15 · Properties Imports the Views Row Shape
- **Now:** `value.ts:3`, `assignValue.ts:6`, `pageRow.ts:6`, `valueContext.ts:6`, `Cells/Cell.tsx:4`, `Cells/valueMenuTarget.ts:4`, and `PropertyPanel.tsx:20` import `ViewRow`, `ResolvedColumn`, or `PageValues` from `Views/viewRow`, type-only; `removeProperty.ts:14` imports `mapViews` from `Views/views` at runtime. `formatValue.ts:4` imports `DateGranularity` and `DateSeparator` from `Views/views` for `formatBucketLabel`, a group-bucket label.
- **Better:** `ViewRow` is the pipeline's row (`parentSetId`, `ResolvedGroup.items`, `Views/viewRow.ts:17-45`) imported by 22 non-Properties files (`Contract/bridge.ts:18`, Matrix, Tiles, the Pipeline) against 7 Properties files, so it stays in Views; `pageRow.ts`, which builds `ViewRow`s and calls `view:loadValues` (`pageRow.ts:11-67`), moves to Views (08-11), and the remaining Properties imports are type-only reads of the row a value belongs to. `formatBucketLabel` (`formatValue.ts:155-184`) moves to `Views/Pipeline/group.ts` beside its inverse `dateBucketKey`, with `Properties/formatBucketLabel.test.ts`; `bandModel.ts:11,51`, its only caller, imports it from there. `NUMERIC_FORMATS` (`formatValue.ts:153`, read by `GroupFrame.tsx:52,210`) stays as date-form vocabulary.
- **Estimate:** ±0 (moves) · read

###### 07-16 · Hiding a Column Has Two Write Paths
- **Now:** `useColumns.commitHide` writes `[...view.hidden_properties, collapsing]` itself (`useColumns.ts:291-296`), without the dedupe in `visibilityModel.hideShown` (`visibilityModel.ts:37-43`) that `useViewHost.hideProperty` (`:166-169`) and VisibilityFrame use; `useViewHost.revealProperty:162` re-derives "is shown" beside `resolveColumns`. The header hides only a rendered column, which `resolveColumns` has already excluded from `hidden_properties` (`columns.ts:27`), so the missing dedupe is unreachable.
- **Better:** `commitHide` calls `hideShown`.
- **Estimate:** −2 · read

###### 07-17 · `GroupFrame`'s Date List Fetches the Container's Values a Second Time — INFERRED
- **Now:** `DateBucketList` mounts its own `useContainerValues(source.path)` (`GroupFrame.tsx:499`), a second `fetchPageValues` read of every page with its own value-epoch subscription, then flattens and buckets every row (`:503-512`) to list the present date buckets.
- **Better:** Read the host's flattened pre-filter `rows` (`useViewHost.ts:84-90`) when one is mounted; its resolved groups are post-filter and post-hide (`resolveView.ts:34-51`), so reading those would drop a filtered-out bucket from the pane. The Settings frame mounts from the toolbar (`Interface/Toolbar/SettingsMenu.tsx:15`) and `ViewTile.tsx:654`, outside the host's tree, so reaching it needs a seam that doesn't exist.
- **Estimate:** −10 · read (mechanism), inferred (whether a seam costs less than the second read)

##### Behavior Ledger

| Behavior | Where | Code Cost | Origin | Classification |
|---|---|---|---|---|
| A Custom option sort always reads ascending; Default/Reversed is ignored once Custom is set | `sort.ts:83-92`; `SortFrame.tsx:181-190` | ~6 lines | `sort.ts:83` comment | Agent's choice, kept [Intended as P-3] |
| Where empty values sort depends on type and direction: number and date empties first ascending (`-Infinity`), Select empties last ascending but first Reversed (`MAX_SAFE_INTEGER`), text empties first, unchecked first | `sort.ts:36,41,47,52,73` | 5 extractors | — | Accident; empty values sort last for every type [Intended as K-2] |
| Manual group order is coerced to configured for a Date property | `group.ts:382-385` | 4 lines plus a test | `47c16173d` | Agent's choice; guards a type change that doesn't sweep `group.order` |
| Only live option keys earn an empty band; a stale manual key never renders | `group.ts:248-253` | 3 lines | `c81dca38c` | Agent's choice |
| Value-less rows form a header-less tail, with no "None" band | `group.ts:255`; `views.ts:231` | — | Design comments | Likely Nathan's intent (the Ungrouped Top/Bottom knob is user-facing); unruled |
| Row drag is off with two or more live sorts; with one sort, a drop inside another value run rewrites the sorted property (Select, Status, Checkbox, shown column only) | `useViewHost.ts:75,109-119,199-209` | ~25 lines | `2c15c767f`; `73668f9fc` gated drag on effective sorts | Agent's choice, kept [Intended as K-2] |
| New Page Above/Below inherits the anchor's Select, Status, Checkbox, Number, and Date sort values | `useViewCreation.ts:32-42,244-249` | ~15 lines | `e93ed66de` | Agent's choice |
| A new page takes the values a filter implies (Is on Select/Status/Checkbox; Is Any/All on Multi-Select/Context, one value per rule, `creationSeeds.ts:26`), and the gesture wins on conflict | `creationSeeds.ts:1-104` | 104 lines plus 307 test | File comment | Agent's choice |
| An unreadable operand passes every row | `filter.ts:166,195,236` | 3 lines | — | Accident (07-03); the rule is ignored [Intended as K-1] |
| Checkbox `is_empty` is evaluated but never offered, and `is_not_empty` falls to `default: true` | `filter.ts:231-232,239-240`; `filterModel.ts:94-97` | 3 lines | — | Accident; `is_not_empty` works [Intended as K-1] |
| Strict date ops, text ops on a Select, and other hand-authored ops evaluate but aren't offered | `filterModel.ts:60`; `filter.ts:126` | ~10 lines | Comment | Agent's choice, consistent with agent-legible hand authoring |
| Title offers no empty ops | `filterModel.ts:107-108` | 1 line | Comment | Agent's choice |
| A new view shows Title only; properties and Contexts created later stay hidden until revealed | `columns.ts:1,36`; `views.ts:440-441` | — | Comments ("creation never visually changes an existing view") | Plausibly Nathan's intent; unruled |
| Collapse carries across a Group By switch for buckets sharing a label | `group.ts:253`; `useViewHost.ts:149-155` | — | F-383 scoped hidden only | Accident (07-07), live on NexusOS's Pommora tile; remembered per property [Intended as D-2] |
| Deleting the grouped property clears all collapsed keys, remembered Set collapses included | `configReach.ts:212-214` | 3 lines | — | Accident; structural collapse is kept [Intended as K-1] |
| Date buckets can't be dragged or custom-ordered; date order is Ascending/Descending only | `bandModel.ts:147`; `GroupFrame.tsx:85-88,105-106` | ~8 lines | — | Agent's choice |
| Date grouping defaults to Month | `views.ts:241-243` | 1 line | — | Agent's choice |
| Link and Text filter and sort read the raw address or alias, not the column's look, so sort never moves on a look change | `linkValue.ts:198`; `filter.ts:145`; `sort.ts:61` | — | Documented | Agent's choice |
| Location "Contains" also matches a typed folder name; a filter naming only dead Set ids is ignored | `filter.ts:88-111`; `filterModel.ts:99-105` | ~25 lines | Comments | Agent's choice |
| Compact Cards close the value picker on a blank value, except for Checkbox | `CardsView.tsx:211-219` | 4 lines | — | Agent's choice (06's) |

##### Approaches

###### A · One Compiled Field Plus a Per-Kind View Spec
07-01, 07-02, 07-03, 07-04, and 07-11 together: `Views/viewKinds.ts` holds one record per `ValueKind` (operators with slot and operand class, `prepare(op, operands)` → test or abstain, `sortKey` plus `less` plus `directions`, `bucket` plus `fromBucket` plus the date/option family, `seedsFromSort`, `seedsFromFilter`), and `resolveColumns` with `fieldOf` compiles each column, rule, criterion, and grouping once per view into `{ type, def, spec, read }`.
- **Removes:** about 15 switches; `columnType`; the hot-path scan in `resolveFieldValue`; `textValue` and `sortText`; `SEEDS_FROM_SORT`, `FROM_GROUP_KEY`, and `KIND_OPS` as freestanding tables; `wholeValues`; every optional `contextIds`.
- **Costs:** one file of about 150 lines against about 250 deleted (inferred); the filter, sort, and group tests become per-kind spec tests; the hand-built `ResolvedColumn`s (`PropertyPanel.tsx:382`, `cardValueInput.ts:71`, `useViewHost.ts:196`) resolve type and def.
- **Risk:** the test surface (`filter.test` 906, `group.test` 759, `sort.test` 502 lines); Title's special cases (07-13) settle in the same pass [Intended as F-3]; `configReach.ts` is host-side and reads the operand class, so `viewKinds.ts` stays renderer-free; 07-03's abstain rule makes the pass a behavior change [Intended as K-1].

###### B · An Incremental View Pipeline — INFERRED
Keep `ViewRow` identity per page and per-(frontmatter, def) derived-key memos (07-05), and split `resolveView` so a single-row change re-tests that row against the compiled filter, re-buckets it, and moves it by binary insertion within its band.
- **Removes:** the per-edit O(N log N) rebuild the Hard Rule names.
- **Costs:** a state machine (prior groups plus a diff of changed rows) and a full-rebuild fallback when the view or schema changes.
- **Risk:** drift between incremental and full results; worth it only if a Benchmark shows commit latency, and 07-05's memos may be enough.

###### C · Stable Option Identity in Saved Views
Views reference an option by a stable id instead of its label in `sort.order`, `group.order`, `sub_group.order`, filter operands, `hidden_groups`, and `collapsed_groups` [Intended as D-1].
- **Removes:** the RENAME role table (`configReach.ts:148-196`): `optionRule`, `scopedOrder`, `collapsedKeys`, and the rename half of `editHiddenBucket` (`views.ts:359-375`), so an option rename stops rewriting views, tiles, and the Matrix filter; and the sync loss where a rename racing an unsynced view edit brings back the old label and the filter or order silently stops matching.
- **Costs:** an id on `select_options` and `status_groups` entries; a one-time conversion of NexusOS's `Ideas/_pagecollection.json` (`group.order`, `sort.order`, `collapsed_groups`), homepage `_tiles.json` (`sort.order`, filter `values`), and `.nexus/contexts/Projects/Pommora/_tiles.json` (`sort.order`, `collapsed_groups`); readers mapping labels to ids, or `decodeValue` yielding ids.
- **Risk:** Legibility in hand-read view JSON, with views already naming properties by `prop_` id as precedent; option delete still sweeps.

##### Cross-Domain Notes

- **02 Values:** a `dateTime` `PropertyValue` holds the raw ISO string (`propertyValue.ts:25-26,118-119`), so filter, sort, group, and the picker each re-parse it with `readDate`; a parsed form or a per-string memo belongs at the decode. `Nexus/create.ts:35-41` resolves creation seeds against the whole registry (`readRegistry(root)`) rather than the Collection's schema.
- **01 Catalog:** `properties.ts` has `byKey` (`:49-50`) but no `byId`, which the 23 view-side `schema.find(id)` calls and FilterFrame's private `defById` (`FilterFrame.tsx:265`) want, or want 07-01. A type change leaves `group.order`, `sort.order`, and option-word operands on a property that no longer has options; `group.ts:382` guards one symptom.
- **06 Value Surfaces:** the column header and row glyph are resolved three ways, and the Context icon differs between them: `TableView.tsx:406-430` uses a Context's own icon, while `VisibilityFrame.tsx:23-28` and `CardsView.tsx:507` (`propertyTypeIconName(e.type)`) use the generic Context type icon.
- **Nexus:** `configReach.ts`'s ROLES, RENAME, CLEAR, and GONE edit `SavedView` fields field by field (`:60-95`, `satisfies Record<keyof SavedView, Role>`), so the table belongs beside `views.ts`, with Nexus keeping the walk (`reachConfig`); both are host-side, so the move keeps the table renderer-free. `migrateConfig.ts:17-23`'s `RENAMED` normalizations (`card_banner: image`, `icon: table`) are view residue; neither NexusOS outside `.obsidian/` nor `~/Test` holds either spelling, so they're removable now.
- **Docs:** `PropertiesPM.md:150`'s Pending "Per-view link styling" has shipped for Format through `column_styles.look` (`LinkCell.tsx:39`; `columnMenu.ts:71-72`); only Underline and Color stay property-level.
- **Issues:** I-042 already lists `filterModel.ts` and `visibilityModel.ts` among misfiled files (`IssuesPM.md:1323`, footnote 42), so that move belongs to it.

---

#### Scout 08 — Nexus, Settings & Seams

Baseline `d0595b22d`. `~/NexusOS/.nexus/properties.json` holds 15 definitions, every type camelCase, with top-level keys `defs` and `order` only; no JSON under `~/NexusOS` (`.nexus`, `.trash`, and the one `.deleted` bundle, `.trash/2026-09-18T02-31-49-204Z__Knowledge.deleted`) holds `multi_select`, `url`, or `datetime` as a type, no `_pagecollection.json` (six live, one trashed) holds `property_cache`, no property Trash record exists, and every status option carries `group_id` equal to its parent group's id. `~/Test` holds no property data and no Benchmark Nexus is on disk, so NexusOS is the only live Nexus whose property shapes constrain removal.

##### Inventory

| File / Symbol | Lines | Property Responsibility | Home |
|---|---|---|---|
| `Core/Nexus/readNexus.ts` `readNexusConfig` / `walkNexus` | 287-288, 330-356 | Reads the registry through `readKeptRegistry`, orders it into `config.registry`, and hands `registry.defs` to the walk (`:333`) | Here |
| `Core/Nexus/readNexus.ts` `readContainer` / `readFolder` | 173-192, 226-245 | Passes `registryOf(tree.config.registry)` (`:238`) into `containerNodeFrom` so each Collection resolves its schema | Here (08-02) |
| `Core/Nexus/containerFields.ts` `resolveAssignedSchema`, `cachedIds` | 24-39, 71-72 | Resolves a sidecar's `properties` ids to full definitions, dropping ids the registry lacks; lists `property_cache` ids | Resolution moves to `containerSchema` (08-02) |
| `Core/Nexus/tree.ts` `CollectionNode.properties`, `.cached`, `NexusConfig.registry`, `Unreadable{kind:'registry'}` | 65-67, 104, 111 | Each definition has two homes (registry plus each Collection's resolved copy) | `propertyIds: string[]` (08-02) |
| `Core/Nexus/treePatch.ts` `containerSchema`, `NO_SCHEMA`, `repointRegistryInTree` | 125-131, 151-170 | The schema lookup; keeps both homes reference-identical on every registry change | `containerSchema` stays; `repointRegistryInTree` goes (08-02) |
| `Core/Nexus/fileEvents.ts` `applyRegistry` | 488-500 | Patches the registry into the tree; walks the whole Nexus when a watched edit adds a definition | Here; the walk goes (08-02) |
| `Core/Nexus/fileEvents.ts` `applyContainer` | 405-437 | Re-resolves a sidecar's schema and owes options registration when it gains a property | Here |
| `Core/Nexus/fileEvents.ts` `oweNamedKeys` | 521-538 | A Multi-Select whose key, type, or format changed owes its Collections and every Space to registration | Here |
| `Core/Nexus/settle.ts` `settle` | 159-166 | Runs `registerHeldOptions` (`:163`) over owed holders plus every non-body-only changed page | Here |
| `Core/Nexus/handlers.ts` open pass | 45, 111-115 | `normalizePropertyTypes` before the walk; `replaySchemaCascade`; then `runRepairSweep` → `registerHeldOptions(root)` | `:45` goes (08-03); the rest is Scout 04's |
| `Core/Nexus/migrateConfig.ts` `respelled`, `renamedRegistry`, `normalizePropertyTypes` | 14, 57-74 | Reads `properties.json` at every open and rewrites it only when a legacy type id is present | Delete (08-03) |
| `Core/Nexus/create.ts` `createPageOp` | 34-41 | Resolves create-time `seeds` against `readRegistry` (a disk re-parse) while `liveTreeOf` is in hand at `:29` | Here (08-05) |
| `Core/Nexus/mutate.ts` `'setProperty'` dispatch | 198-202 | Routes value writes to `setPagePropertyOp` / `setSpacePropertyOp` | Here |
| `Core/Nexus/mutateRequest.ts` `seeds`, `setProperty`, `restoreValue` | 60, 90-92 | The wire shapes of value writes | Here |
| `Core/Properties/setProperty.ts` `setPagePropertyOp` | 61-83 | Reads and re-parses the whole registry from disk inside the page lock (`:70`) on every value write | Here (08-05) |
| `Core/Index/indexSeed.ts` `extractPageIndex` | 41-61 | Stores every frontmatter root key as `page_values` rows and Link/Text values as `value` relations | Here |
| `Core/Index/contentIndex.ts` `queryKeyHolders` | 74-76 | Used by five property sweeps (delete, keyHolders, optionOps, registryProperty, removeProperty) | Here |
| `Core/Settings/personalization.ts` `checkboxColor`, `repairOnOpen`, `restoreLinksOnDeletion`, `dateFormat`, `timeFormat`, `trashColumnStyle`, `archiveColumnStyle` | 3, 22-26, 140-146, 195-199 | The settings that govern properties; imports `columnStyle`, `DATE_FORMATS`, and `TimeFormat` from Properties | Here |
| `Core/Settings/frames.ts` property rows | 13-14, 173-183, 197-211, 236-243, 546-553, 636-640, 855-870 | Date/Time Format, Repair On Open, Default Link Format, Restore Links, Checkbox Color; hand-rolls picker options | Here (08-09) |
| `Core/Settings/devicePrefs.ts` `defaultLinkFormat` | 7, 41, 63 | A device pref typed by the Link property's `LINK_DISPLAYS` | Here; the vocabulary moves (08-08) |
| `Core/Settings/applyPersonalization.ts` `checkboxColor` | 42-46 | Turns Checkbox Color into CSS variables once, with no per-cell cost | Here |
| `Core/Settings/exclusionScan.ts` `clearRewrite` | 8, 54-87 | Clear Exclusion Data strips the ID and Context keys through `sweepGovernedRoots` (`:83`) | Here; the sweep's home is cross-domain (04-14) |
| `Core/Settings/TrashFrame.tsx` property row icon | 15, 64-68, 101 | The type icon for a trashed property, falling back to `'tag'` | Here |
| `Core/Settings/NexusRows.tsx` | 10, 36, 57 | Only `clockOf` and `timeFormat` for the sync caption | Here |
| `Core/Bundles/browser.ts` `useDateColumn`, `widestDate` | 89-148 | The Trash/Archive date column style over the Nexus date and clock | Here |
| `Core/Bundles/rows.ts` `bundleRowOf` property arm | 90-101 | A trashed property's title and type | Here (L7) |
| `Core/Archive/ArchiveView.tsx` | 24, 127, 138 | Header glyphs from `PropertyTypeIcon` | Here |
| `Core/Session/chromeSlice.ts` `ValuePickRequest` | 17-24, 35-36 | The value-pick request's shape | Here |
| `Core/Interface/Windows/PageReaderWindow.tsx` `HistoryReader` | 128-164 | Calls `view:loadValues` (through `fetchPageValues`) for one page's `modifiedAt`; reads date and clock directly | Partly (Cross-Domain Notes) |
| `Core/Interface/Windows/WindowTabBody.tsx` | 10, 221 | Mounts `PropertyPanel` | Here |
| `Core/MarkdownPM/Links/linkEdit.ts`, `pasteLink.ts` | 7 / 12 | Use the Link property's `LinkDisplay` vocabulary for pasted links | `Core/Connections/linkValue.ts` (08-08) |
| `Core/Navigation/previewRules.ts` `previewTargets` | 5-12, 31-37 | Builds filter targets from `Properties/Cells/PropertyTypes.tsx` | Targets move to `Views/paneTargets.ts` (08-11) |
| `Core/Contract/serve.ts` / `bridge.ts` | serve 9, 21; bridge 131-189 | 20 `schema:`/`registry:`/`property:` channels (4 + 1 + 15) | Here |
| `Core/Sync/Arrival/mergePolicy.ts` `mergeDepthFor` | 25-41 | `properties.json → {defs: 2}` (`:32-33`); sidecars fall to `{}` (`:38-39`) | Here (08-01, 08-06) |
| `Core/Files/jsonMerge.ts` `mergeKeys` | 15-46 | The "a deleted side merges as empty" rule at `:36-42` | Here (08-01) |
| `Core/Properties/rowOrder.ts` `resolveRowOrder` | 1-13 | A generic "listed first, the rest in arrival order" helper; 3 Views callers, 2 Properties callers | `UIX/Utilities/moveItem.ts` (08-11) |
| `Core/Properties/pageRow.ts` | 1-67 | ViewRow builders plus a `view:loadValues` client | `Core/Views/` (08-11) |
| `Core/Properties/propertyCache.ts` | 1-68 | The `property_cache` reader and writer | Here (08-06) |

##### Engine / Interface Split

Re-run at HEAD with a read-only `vite-node` call to `Core/Testing/engineGraph.ts` rooted at `Core/Contract/serve.ts`, the walk `engineGraph.test.ts:4` runs. **Engine** means the host graph reaches the file; **Renderer** means it reaches `.tsx` or `.css.ts`, imports React, or reaches the host through `dialer`/notifications; **Shared-Pure** means neither graph forbids it but only the renderer imports it.

- **Engine (25, all pure, none importing React):** `assignment`, `columnStyles`, `deleteProperty`, `formatValue`, `governedSweep`, `governedWrite`, `handlers`, `journalSlot`, `keyFormat`, `keyHolders`, `optionModel`, `optionOps`, `pageValue`, `properties`, `propertiesRegistry`, `propertyCache`, `propertyJournal`, `propertyValue`, `registryProperty`, `removeProperty`, `repairSweep`, `replaySchemaCascade`, `rowOrder`, `schema`, `setProperty`.
- **Renderer, Root Folder:** `PropertyPanel.tsx`, `paneDrop.tsx`, `property-panel.css.ts`, `assignValue.ts` (React types and the session store, `:1,10-11`), `valueOverride.ts` (React types, `:1`), `pageRow.ts` (`dialer`, `:9`), `propertyWrite.ts` (notifications, `:2`).
- **Shared-Pure, Root Folder:** `value.ts`, `parseEditorValue.ts`, and `valueContext.ts` (type-only imports, `valueContext.ts:1-6`).
- **Renderer, Subfolders:** all of `Cells/`, `Pickers/`, and `Schema/`; `Pickers/massAssign.ts` and `Pickers/valueClick.ts` are pure, but only the renderer imports them.
- **Mixed Files:** none. Three engine files carry interface copy: `columnStyles.ts:23-69` (`LOOK_LABELS`, `DATE_FORMAT_LABELS`, `TIME_FORMAT_LABELS`, `WEEKDAY_FORMAT_LABELS`, `lookOptions`, `DATE_FORMAT_OPTIONS`), `properties.ts:98-102` (`LINK_DISPLAY_LABELS`), and `properties.ts:263-274` (`itemCount`, `KEY_REFUSAL`). `formatValue.ts` is engine only because `propertyValue.ts:16` imports `readNumber`/`spelledNumber`; `columnStyles.ts` is engine because `Settings/personalization.ts:3` and `Views/views.ts` import its decoder.
- **What the Tests Enforce:** `engineGraph.test.ts:7-8` (no `.tsx`/`.css.ts`), `:11-20` (an exact external allowlist without `react`), and `:23-37` (the exact UIX leaves, already including `UIX/Utilities/moveItem.ts`); nothing in either graph test is property-specific or ties a folder to a seam.
- **What the Layout Tells a Reader:** the subfolders are cleanly renderer, but the root interleaves 25 engine files with 10 renderer or renderer-only files. Seven value-named files (`value`, `pageValue`, `propertyValue`, `assignValue`, `valueContext`, `valueOverride`, `parseEditorValue`) give no hint which side they're on, and "Schema" means three things: `Schema/` holds the renderer's definition editors, `schema.ts` holds engine name and option validators, and `schema:*` channels plus `containerSchema` mean a Collection's assignment list.

##### Sync Shapes

Merge mechanics traced through `mergeKeys` (`jsonMerge.ts:15-46`), `mergeDepthFor` (`mergePolicy.ts:25-41`), `bytesToLand` (`land.ts:45-64`), and `base.ts:57` (base bytes kept only for merged JSON). Landings write through `landBytes` (`atomicWrite.ts:42-52`) with no write echo, so the watcher sees them as `'watched'` (`NexusSyncPM.md:61`).

| Shape | Merges As | Loses Under | Shape Change That Fixes It |
|---|---|---|---|
| `properties.json` `defs.<id>.<field>` | Per definition, per field (`{defs: 2}`, `mergePolicy.ts:32-33`) | One device deletes a definition while the other edits it, and the edit is newer: the result is a fragment holding only the edited fields, with no id, key, or type. `normalizeRegistry` files it `unadmitted` (`propertiesRegistry.ts:35`), and `mutateRegistry` re-writes it and appends it to `order` on every registry write (`:101, 112-116`); `mergePolicy.test.ts:130-136` pins it | None; a whole-on-absent rule is a Sync rebuild input (08-01) [Intended as H-1] |
| `properties.json` `defs.<id>.select_options` | Whole field | One option added per device on the same property loses one add (I-006, `IssuesPM.md:189`) | 09-14's stable option id [Intended as D-1]; per-option merging is a Sync rebuild input [Intended as H-2] |
| `properties.json` `defs.<id>.status_groups` | Whole field, options nested inside | The same, plus a group relabel on one device against an option add on the other loses one | As for `select_options`; the nested `group_id` leaves (08-04) [Intended as D-3] |
| `properties.json` `order` | Whole (level 0) | A reorder on each device: one loses, and `resolveRowOrder` appends what's missing | None needed |
| Collection sidecar `properties` (assigned ids) | Whole (sidecars fall to `{}`, `mergePolicy.ts:38-39`) | Assigning a different property on each device drops one (I-006, `IssuesPM.md:188`) | Merge as a set (I-006's proposal), a Sync rebuild input [Intended as H-1] |
| Collection sidecar `property_cache.<propId>.values.<pageId>` | Whole | Removing a different property from one Collection on each device loses one device's stash, the only copy of the stripped values, and I-006 doesn't list it. Because `properties` merges whole too, the losing device's property returns assigned while its values are already stripped | `{property_cache: 2}` merges per property with today's shape; per page needs depth 3, or the `values` wrapper flattened plus depth 2 (08-06), and `mergeDepthFor` has no sidecar arm. A Sync rebuild input unless the stash's placement removes the loss without a Sync rule [Intended as C-2, H-2] |
| Collection sidecar `views[].column_styles` | Whole with `views` | A style picked on each device in one view loses one (I-006's `views`) | I-006's per-view item merge, a Sync rebuild input [Intended as H-1] |
| `_space.json` value keys | Per root key (each value is a top-level key at level 0) | Only a both-sides edit of one key; multi-value arrays go whole | None; the one property shape that already merges finely |
| Page frontmatter values | Not merged: `.md` isn't merged JSON (`mergePolicy.ts:20-21`), and `base.ts:57` keeps no base bytes for it; the newer side wins the whole file and the loser lands in the capture store (`NexusSyncPM.md:55`) | Two devices setting different properties on one page lose one, visible only in the capture store | No on-disk change is possible (Legibility); a YAML-aware per-root-key merge at landing needs page base bytes (Approach D), a Sync rebuild input [Intended as H-1] |
| `state.json` `order.contexts` (the Properties panel's Context order) | Whole per list (`order: 1`, `mergePolicy.ts:31`) | One reorder loses; it self-repairs | None |
| `settings.json` `personalization.trashColumnStyle` / `archiveColumnStyle` / `checkboxColor` / `dateFormat` / `timeFormat` / `repairOnOpen` | Per setting, per field (`{personalization: 2}`, `mergePolicy.ts:29`) | None that matter | None |

##### Findings

###### 08-01 · A Property Deleted on One Device and Edited on Another Leaves a Corrupt Fragment Definition, and a Test Pins It as Intended
- **Now:** `mergeKeys` treats a deleted side as an empty object (`Core/Files/jsonMerge.ts:36-42`), which suits metadata month files, where one device clearing a page and another setting a field should keep the field (`NexusSyncPM.md:63`). `{defs: 2}` (`mergePolicy.ts:32-33`) applies the same rule to definitions: base `P{id,name,type}`, local deleted, remote renamed and newer gives `{defs:{P:{name:'New'}}}`, since `id` and `type` take the deleting side and `name` goes to `pick()`. `mergePolicy.test.ts:130-136` asserts exactly this ("keeps only the edited fields of a def one side deleted and the other edited"). On disk, `normalizeRegistry` files the fragment `unadmitted` (`propertiesRegistry.ts:35`) and `mutateRegistry` re-writes it and appends it to `order` on every registry write (`:101, 112-116`); it never shows and is cleaned only if that property is restored from the Trash, whose `createProperty` writes the id over it (`:101-110`). The test, from `686ac2a08`, uses a `name` field the schema doesn't have (the field is `label`, `properties.ts:163`), and neither registry test (`mergePolicy.test.ts:120-136`) carries `key`.
- **Better:** In this restructure, both registry tests change `name` to `label`. The fix is a Sync rebuild input [Intended as H-1]: a record semantic for `defs`, where a side that deleted the entry and a side that changed it resolve by `pick()` to one whole side, while both-present conflicts keep merging per field. It can't be an unconditional branch in `mergeKeys`, because the metadata shards rely on keep-the-field (`mergePolicy.ts:26`, `NexusSyncPM.md:63`), so it's a policy-scoped option (a `{defs: {depth: 2, whole: 'absent'}}` entry widening `Depth` from `Record<string, number>` at `jsonMerge.ts:4`). Reverting to `{defs: 1}` would remove the fragment but lose a rename racing another field's edit (B-08-01). Under the rule, when the edit wins, the deleting device's Trash record still exists and its restore refuses because the id is present (`restoreProperty.ts:34-35`).
- **Estimate:** one test's field name here; the rule's own cost (about +6 / −2 plus the `Depth` widening and a test rewrite) belongs to the rebuild · read (merge and test), inferred (downstream)

###### 08-02 · Collections Hold Resolved Copies of Definitions, So a Definition Arriving by Sync Forces a Full Nexus Walk
- **Now:** `resolveAssignedSchema` (`containerFields.ts:29-39`, called at `:71`) turns a sidecar's `properties` ids into definition objects and drops ids the registry doesn't hold, so the tree keeps every definition in two homes, `config.registry` and each `CollectionNode.properties` (`tree.ts:65, 104`). `repointRegistryInTree` (`treePatch.ts:151-170`) exists only to keep the two reference-identical; `stabilize` is the general identity-recycler across the tree, sessions, and assets (`treeStabilize.ts:1-5`). Because the tree has forgotten unresolved ids, `applyRegistry` can't place a definition that arrives from outside, and for a `'watched'` event it returns `null` → walk (`fileEvents.ts:491-495`; `applyPatch` maps `null` to `'walk'`, `:313-316`). Sync landings are `'watched'` because `landBytes` records no echo (`atomicWrite.ts:42-52`), so every synced `properties.json` that adds a property re-walks the whole Nexus. `applyContainer` and `readFolder` also rebuild `registryOf(...)` per event (`fileEvents.ts:430`, `readNexus.ts:238`).
- **Better:** `CollectionNode` holds `propertyIds: string[]` as written, and `containerSchema(tree, of)` (`treePatch.ts:128-131`, nine call sites in eight files) resolves them against a registry map built once per `config.registry` identity (`entityMemo`, `tree.ts:132`, or a WeakMap). The direct `.properties` readers (`fileEvents.ts:536`, `assignment.ts:41`, `Views/Settings/SettingsFrame.tsx:76`) go through it; the `Actions/*` `properties` fields are already filled from `containerSchema` (`entityMenuActions.ts:60-64`). `applyRegistry` then always patches, and `repointRegistryInTree`, the `arrived` walk branch, `resolveAssignedSchema`, and per-event `registryOf` go.
- **Behavior:** A synced or hand-added property shows with no re-walk lag.
- **Estimate:** about −45 / +15 · read (mechanism), inferred (walk cost at 50k pages)

###### 08-03 / 09-01 · Legacy Type Ids and the Open-Time Respell Are Migration Residue
- **Now:** `LEGACY_TYPE_IDS` and the `propertyType` preprocess (`properties.ts:78-88`) justify themselves with "a Trash record and an older build's synced file keep them, so they read forever". `normalizePropertyTypes` with `respelled`, `renamedRegistry`, and the `field` helper (`migrateConfig.ts:14, 30-38, 57-74`; `field` has no reader outside `renamedRegistry`, `:63,66`) runs at every open (`Nexus/handlers.ts:26, 45`). It reads `properties.json` under its lock and rewrites it only when a legacy id is present, since `rmwJsonStrict` skips the write when the mutate returns `null` (`atomicWrite.ts` `rmwLocked`). NexusOS's registry types are `checkbox, dateTime, file, link, multiSelect, number, select, status, text`, with no legacy id in the Trash or `.nexus` and no property Trash record; `make-benchmark-nexus.mjs:128-137` writes camelCase, which arrived in `31b2e8481` (09-25). Pinning tests and docs: `migrateConfig.test.ts` (all 74 lines, `:19-74`), `properties.test.ts:3, 44-47`, `optionOps.test.ts:416-435` (ordinary writes preserve the legacy spelling), `mergePolicy.test.ts:120-128`, `Nexus/handlers.test.ts:165-178` ("respells a legacy property type in the registry it opens"), `Trash/restoreScrub.test.ts:287, 310`, `PropertiesPM.md:8` ("still read, and are rewritten"), and `NexusSyncPM.md:63` ("a type respelled on one device and a rename made on another both survive").
- **Better:** `propertyType = typeIds`; delete the legacy map, `respelled`/`renamedRegistry`/`field`/`normalizePropertyTypes`, the `propertyType` import, the open call, `migrateConfig.test.ts`, `properties.test.ts:44-47`, `optionOps.test.ts:416-435`, `handlers.test.ts:165-178`, and both doc clauses. `restoreScrub.test.ts:287, 310` use `multi_select` incidentally and are respelled to `multiSelect`. The `mergePolicy` test is re-based on a field edit racing a rename so per-field merging stays covered (B-08-01). The saved-view `RENAMED` (`migrateConfig.ts:20-23`) is the same kind of residue outside property scope (01-02).
- **Behavior:** Nothing visible changes, since no live registry is rewritten today; the open stops a locked read. A registry still holding a legacy id would read that definition as unadmitted (carried through writes, hidden, `propertiesRegistry.ts:32-35`), and none exists.
- **Estimate:** about −38 production (`properties.ts` −11, `migrateConfig.ts` −25, `handlers.ts` −2) / −70 to −110 tests · read

###### 08-04 · `group_id` on a Status Option Is Required and Written, but Nothing Reads It
- **Now:** Options nest inside their group (`properties.ts:149-155`), yet each also carries `group_id: statusGroupId` as a required field with no catch (`:144`). `git grep group_id` across Core, UIX, Desktop, and Sync finds no reader; `optionGlyph` resolves an option's group by scanning `status_groups` for its label (`Cells/OptionChip.tsx:27-28`). Writers are `optionModel.ts:35, 49`, `properties.ts:304` (stamped on Select options temporarily) and `:313` (stripped again), the seed at `:323-335`, and the fixtures `Testing/fixtures/registry.json:13-34` and `Testing/viewHarness.tsx:68, 74`. A hand edit omitting it fails `statusOption`, then `statusGroup`, then the definition (`status_groups` has no catch, `:169`), so the property silently goes unadmitted. Options sat nested with `group_id` beside them from the field's first commit (`2a5936603`, 06-14).
- **Better:** Remove `group_id` from `statusOption`, stop `optionModel` stamping it, and drop the add-and-strip in `optionGroupsOf`/`withOptionGroups`. Option writes start from the raw stored entry so unknown keys ride through (`optionOps.ts:59-66`), and `moveOption` spreads the stored option (`optionModel.ts:49`), so a moved option would keep writing its former group's id; NexusOS's `group_id`s are stripped once (one file) [Intended as D-3].
- **Behavior:** A hand-edited option without the field now reads.
- **Estimate:** about −10 plus fixtures · read

###### 08-05 · Every Value Write Re-Reads and Re-Validates the Whole Registry From Disk
- **Now:** `readRegistry` (`propertiesRegistry.ts:50-54`) is `readJsonStrict` plus `normalizeRegistry`, which zod-parses every definition and runs `validateName` against all earlier ones: O(R²) `normalizeTitle` calls (`:28-33`; `schema.ts:42-56`) plus option uniqueness per definition. It runs at 14 call sites, including `setPagePropertyOp` inside the page lock (`setProperty.ts:70`), `setSpacePropertyOp` (`:55`), `createPageOp` (`create.ts:36`), and `assignedDefs`' fallback (`assignment.ts:43`); the in-lock read is deliberate, to avoid racing a rename sweep (`setProperty.ts:67`). Sidecars and pages already get fresh-but-not-reparsed reads through `cachedParse` (`Files/walkCache.ts:34-58`, used by `readSidecar` at `readNexus.ts:86-87`), and every atomic write calls `forgetParse` (`atomicWrite.ts:36, 51`).
- **Better:** Wrap the strict read's parse in `cachedParse` keyed on the registry path. Each write still stats under the lock and `cachedParse` refuses an entry inside its racy window (`walkCache.ts:44-48`), so the race guarantee holds; one reader serves all 14 sites.
- **Estimate:** about +4 / −0 · read (cost negligible at 15 definitions, multiplied by mass assign's N writes, 02-10)

###### 08-06 · `property_cache` Has a Vestigial `values` Layer, Merges Whole Across Devices, and Its Name Misdescribes It
- **Now:** The shape is `property_cache.<propId>.values.<pageId>`; every writer passes `{ values }` and nothing else (`assignment.ts:104`, `removeProperty.ts:48-55`, `propertyCache.ts:45`, `Trash/restoreProperty.ts:53`), and `cachedValues` (`propertyCache.ts:8-14`) unwraps it. Sidecars merge at `{}`, so concurrent Removes of different properties on one Collection keep one device's block, and the whole-merging `properties` list brings the losing device's property back assigned. A Remove writes no Trash record (`removeProperty.ts:27-61`), so this block is the only copy of the stripped values: it isn't regenerable, the opposite of a cache. I-006 (`IssuesPM.md:183-189`) doesn't list it, and `PropertiesPM.md:27, 128-134` call it a "restore cache" and "value caches".
- **Better:** The stash stays and is meant to lose nothing under sync, drop entries for pages that left the Collection, and let a Remove that missed pages be retried, with planning free to give it a better home [Intended as C-1, C-2]. Flattening to `property_cache.<propId>.<pageId>` is its own Less Stuff change, and a name that says what it holds (such as `removed_values`) lands with planning's placement. With today's shape `{property_cache: 2}` merges per property and per page needs 3; a Collection-sidecar arm in `mergeDepthFor` is a Sync rebuild input unless the placement removes the loss without a Sync rule [Intended as H-2]. The loss is added to I-006. NexusOS and `~/Test` hold no `property_cache`, so no migration is needed.
- **Estimate:** about −6 / +4 · read

###### 08-07 · Engine Modules Carry Interface Copy, and a Value Codec Lives in the Display Formatter
- **Now:** `formatValue.ts` (303 lines, mostly display) enters the engine graph only because `readNumber`/`spelledNumber` (`:287-303`) are the value codec `propertyValue.ts:16` needs. `columnStyles.ts` is engine for its `columnStyle` decoder (`:76-86`) yet holds the label tables and `lookOptions`/`DATE_FORMAT_OPTIONS` (`:23-69`); `properties.ts:98-102` holds `LINK_DISPLAY_LABELS`; `Settings/personalization.ts:3` reaches into Properties for `DATE_FORMATS`. `itemCount` (`properties.ts:263`) is engine-used, in `KEY_REFUSAL.held` (`:272-273`) and `governedSweep.ts:21, 60`, beside other wire-crossing refusal text (`optionOps.ts` `NO_OPTION`, `OWED`, `CROSSED`).
- **Better:** Move `numberShape`/`readNumber`/`spelledNumber` beside `decodeValue` and `encodeValue` in `propertyValue.ts`. Enums and decoders stay engine-side, and the display label tables and option lists move to one renderer `.ts` module (a `.tsx` beside `TYPE_META` would make `Settings/frames.ts` and `Actions/*.ts` import a component file). `itemCount` stays with the refusal text. The payoff is reader clarity; label strings in the host cost nothing at runtime.
- **Estimate:** about ±0 (moves, possibly +1 file) · read

###### 08-08 · The Link-Display Vocabulary Belongs to Connections, Not the Link Property
- **Now:** `LINK_DISPLAYS`, `LinkDisplay`, `isLinkDisplay`, `DEFAULT_LINK_DISPLAY`, and `LINK_DISPLAY_LABELS` live in `properties.ts:90-102`. Outside Properties they're imported by `Connections/linkValue.ts:26` (which owns `linkDisplayText`, `linkMarkdown`, and `linkPaste`, `:199-279`), `MarkdownPM/Links/linkEdit.ts:7`, `pasteLink.ts:12`, `Actions/pasteAsMenu.ts:14`, `Actions/connectionMenu.ts:9`, `Actions/columnMenu.ts:17`, `Settings/devicePrefs.ts:7`, and `Settings/frames.ts:14`; inside, by `Cells/LinkCell.tsx:1`, `Schema/LinkEditor.tsx:2`, `Schema/linkFormatOptions.ts:1`, and `columnStyles.ts:4-6`. `Tiles/Surfaces/WebTile.tsx` reads the device pref and calls `linkDisplayText` (`:23-25`). This is how a URL is written anywhere, and the Link property is one consumer.
- **Better:** Move the enum, type, guard, and default into `Connections/linkValue.ts`; `properties.ts` keeps the `link_display` field's decoder, typed from there, and `LINK_DISPLAY_LABELS` follows 08-07's renderer label module rather than landing in engine `linkValue.ts`. Six outside importers stop reaching into Properties for it; `columnMenu.ts` still imports `PROPERTY_TYPES`, and `linkValue.ts` still imports `PropertyValue` (`:27`).
- **Estimate:** about ±0 · read

###### 08-09 / 05-04 · "Labels Map → Picker Options" Is Hand-Rolled Eight Times, and One File Exists Only for That
- **Now:** Eight label-record maps: `columnStyles.ts:33-35` (`lookOptions`) and `:48-51` (`DATE_FORMAT_OPTIONS`), `Schema/DateTimeEditor.tsx:12-16` (`WEEKDAY_OPTIONS`, `TIME_OPTIONS`), `Schema/linkFormatOptions.ts:5-8` (an 8-line file with one export), and `Settings/frames.ts:173-183` (`timeFormatOptions`, `headingLinkStyleOptions`, `inPageHeadingResolutionOptions`). `Schema/FormatRows.tsx:8-11` uses each value as its own label (an identity map); NumberEditor's `FAMILY_OPTIONS` is a hand-written literal restating labels for `NUMBER_FAMILIES` (`properties.ts:105`), and `DECIMAL_OPTIONS` is a generated range (`NumberEditor.tsx:16-29`). `DateTimeEditor`'s `TIME_OPTIONS` and `frames.ts`'s `timeFormatOptions` map the same `TIME_FORMAT_LABELS`. `LINK_FORMAT_OPTIONS` already equals `lookOptions(LINK_DISPLAYS)`, since `LOOK_LABELS` spreads `LINK_DISPLAY_LABELS` (`columnStyles.ts:28`), yet Settings imports it from a Schema UI file (`Settings/frames.ts:13,552`) while the date list sits beside its tuple in `columnStyles.ts`.
- **Better:** Delete `linkFormatOptions.ts` and call `lookOptions(LINK_DISPLAYS)` at both callers. One `pickerOptions(values, labels)` in 08-07's renderer label module serves the remaining maps once the label tables move there, and `lookOptions` becomes a call of it. It can't sit beside `PickerOption` in `UIX/Pickers/PickerControl.tsx:10` while `lookOptions` stays in engine `columnStyles.ts`, since `engineGraph.test.ts` forbids any `.tsx` and pins an exact UIX leaf list (`:23-37`); `labelled` is taken (`properties.ts:115-120`). A `NUMBER_FAMILY_LABELS` beside `NUMBER_FAMILIES` is added only if Number's options go through the helper.
- **Estimate:** about −25 / +4 · read

###### 08-11 · Generic Modules Sit in Properties Because Properties Wrote Them First
- **Now:**
  - `rowOrder.ts` (`resolveRowOrder`) has three Views callers (`Bands/bandRouter.ts:69-70, 88`, `Pipeline/bandOrder.ts:13`, `Pipeline/group.ts:436`), and its semantics differ from `Nexus/order.ts:11-28` `resolveOrder`, which sorts the unlisted by ULID (no order) or title.
  - `pageRow.ts` builds `ViewRow`s (it imports `Views/viewRow`, `:6`) and calls a Views channel (`:52-58`).
  - `PropertyTypes.tsx:59-97` holds `PaneTarget`, `TITLE_/LOCATION_/STAMP_TARGETS`, `contextPaneTargets`, `schemaTargets`, and `targetOption`, consumed by `Views/filterModel.ts`, `Views/Settings/SortFrame.tsx`, `GroupFrame.tsx:62`, `FilterFrame.tsx:11`, `Properties/PropertyPanel.tsx:44`, and `Navigation/previewRules.ts`. In a `.tsx` under `Cells/`, they make `previewRules.ts` renderer-only for data it doesn't render.
- **Better:** `resolveRowOrder` moves to `UIX/Utilities/moveItem.ts`, already a pinned engine-graph UIX leaf (`engineGraph.test.ts:31`), so no test changes. `pageRow.ts` moves to `Core/Views/`, and `ViewRow` stays there: 22 non-Properties files import it, `Contract/bridge.ts:18` among them, and it carries the pipeline's `parentSetId` (`Views/viewRow.ts:17-27`). The pane targets move to one Views-root `Views/paneTargets.ts` beside `filterModel.ts`, leaving `PropertyTypes.tsx` holding type glyphs: four of six consumers are Views modules, and a separate `.ts` keeps a host-side per-kind table from inheriting the renderer import the targets need for icons.
- **Estimate:** about ±0 (moves) · read

###### 08-12 · Nothing in the Root Folder's Layout or Names Tells a Reader Which Side a File Runs On
- **Now:** See *§Engine / Interface Split*: ten renderer or renderer-only files sit among 25 engine files at the root, "Schema" names three things, and seven files are value-named.
- **Better:** Keep the engine at the root and put the renderer files in subfolders, as `Cells/`, `Pickers/`, and `Schema/` already work. The root stragglers (`PropertyPanel.tsx`, `paneDrop.tsx`, `property-panel.css.ts`, `assignValue.ts`, `valueOverride.ts`, `valueContext.ts`, `propertyWrite.ts`, `value.ts`, `parseEditorValue.ts`, plus `pageRow.ts` unless 08-11 moves it) go to a `Panel/` folder or the existing subfolders. Rename `Schema/` to `Definitions/` or `schema.ts` to `validation.ts`, so "schema" keeps the one meaning `containerSchema` and the `schema:*` channels give it. No sibling folder sets a precedent: `Core/Views` splits by feature (`Bands/`, `Cards/`, `Host/`, `Pipeline/`, `Settings/`, `Table/`), and `Core/Contexts` is flat.
- **Estimate:** ±0 lines; renames only · read

###### 08-13 · "The Schema a Holder Carries" Is Stated Three Times
- **Now:** `PropertyPanel.tsx:161` (`isSpace ? tree.config.registry : containerSchema(tree, path)`), `optionOps.ts:132` (`space ? tree.config.registry : containerSchema(tree, rel)`), and `Interface/Menus/entityMenuActions.ts:60-64` (`node ? registry : containerSchema(s.tree, target.path)`) each decide that a Space reads the whole registry and a page reads its Collection's schema. `assignedDefs` (`assignment.ts:33-46`) is a fourth resolver, with a disk fallback (03-14).
- **Better:** One `holderSchema(tree, rel)` in `treePatch.ts` beside `containerSchema`, which all three call, fitting 08-02's resolver.
- **Estimate:** about −3 / +4 · read

###### 08-14 · Describers That Go Stale With This Domain's Changes
- **Now:**
  - `NexusSyncPM.md:63`'s respelling example (08-03, B-08-01).
  - `PropertiesPM.md:8`, the legacy clause (08-03).
  - `PropertiesPM.md:53` ("Every option references its group by id, so status semantics resolve by id") describes `group_id` as read (08-04).
  - `PropertiesPM.md:27, 128-134`: "restore cache" and "value caches" (08-06).
  - I-006 (`IssuesPM.md:213`) says "Option lists key on `value`", while options key on `key` (`properties.ts:122-130`), and it leaves out `property_cache` (`:183-189`).
  - `mergePolicy.test.ts:120-136` uses a `name` field (08-01).
  - The merge-loss notes sit in `IssuesPM.md` I-006 and `NexusSyncPM.md:55, 63`.
- **Better:** Each is rewritten in the same pass as its finding.
- **Estimate:** docs only · read

###### B-08-01 · The Registry's Per-Field Merge Depth Has Only a Respelling Rationale on Record; Its Live Reason Is a Rename Racing Another Field's Edit
- **Now:** `686ac2a08` changed `mergeDepthFor('properties')` from `{defs: 1}` to `{defs: 2}`, and the only stated reason anywhere is the respelling: the test "keeps one side's type respelling and the other side's rename of the same def" (`mergePolicy.test.ts:120-128`) and `NexusSyncPM.md:63`'s example, both of which 08-03 deletes. Under `{defs: 1}`, a Key rename on one device racing any other edit of that definition on the other keeps the newer definition whole, so a losing rename leaves pages swept to the new key under a registry still holding the old key.
- **Better:** In 08-03's pass, `{defs: 2}` stays, the test is re-based on a rename racing an option or icon edit, and `NexusSyncPM.md:63`'s example is rewritten to that case; 08-01's absent-side rule is a Sync rebuild input [Intended as H-1].
- **Estimate:** docs and one test · read (history), inferred (rename-loss scenario)

##### Behavior Ledger

| ID | Behavior | Where | Origin | Classification |
|---|---|---|---|---|
| L1 | A delete raced by a newer edit leaves an invisible fragment definition in `properties.json` forever | `jsonMerge.ts:36-42` with `mergePolicy.ts:33`, pinned by `mergePolicy.test.ts:130-136` | `686ac2a08` (09-25), which changed `defs: 1` → `defs: 2` for the legacy respelling and carried over the metadata-file rule | Accident: the test title states the mechanism without weighing whether the result is usable; a Sync rebuild input [Intended as H-1] |
| L2 | Every open reads `properties.json` under its lock and rewrites it only when a legacy type spelling is present | `handlers.ts:45`, `migrateConfig.ts:57-74` | F-221 Phase 3 (`686ac2a08`) | Agent's choice, with nothing left to rewrite in any live Nexus |
| L3 | A definition added from outside (sync or hand edit) re-walks the whole Nexus | `fileEvents.ts:491-495` | — | Agent's choice: a correctness patch over the tree having forgotten unresolved ids; users see only lag |
| L4 | A damaged `properties.json` the session never read fails the whole open, while a damaged Contexts registry blanks its layer and is listed unreadable | `readKept` throws (`atomicWrite.ts:201-205`) inside `readNexusConfig` (`readNexus.ts:287-288`), and the open waits on the error (`Nexus/handlers.ts:74-80`); the Contexts arm is `readNexus.ts:313-322`, and `Unreadable{kind:'registry'}` (`tree.ts:111`) serves only Contexts | — | Agent's choice, inconsistent: the property registry is grouped with identity and settings as "the three hand-authored files every read rests on" (`readNexus.ts:286`). It opens with Properties marked unreadable [Intended as O-6] |
| L5 | Repair Properties On Open defaults to off | `personalization.ts:146` | `4c1faf1ef` (09-01; added `repairSweep.ts` and the toggle) | Agent's choice of default; NexusOS has it on (`settings.json` `repairOnOpen: true`), and its cost is one reconcile write per page changed while the app was closed (Scout 04). On by default [Intended as O-3] |
| L6 | The Trash and Archive date-column styles are synced Nexus personalization, while view column styles live in sidecars | `personalization.ts:198-199`, `browser.ts:89-148` | `dc7780ca7` (09-25) | Agent's choice, consistent enough to keep; NexusOS holds `trashColumnStyle: {time_format: 'none'}` |
| L7 | A trashed property's row hand-decodes `label` and `type` where `propertyDefinition.safeParse` (as `restoreProperty.ts:36` does) would give both; a record with no `label` would be titled by its id | `Bundles/rows.ts:91-96` | — | A consolidation: the id fallback is unreachable from Pommora's writes, since the delete records the parsed definition (`deleteProperty.ts:84-88`), whose `labelled` transform always sets `label` (`properties.ts:115-120, 194`) |
| L8 | A hand-edited status option without `group_id` makes its whole property disappear | `properties.ts:144, 169` | `2a5936603` (06-14) | Accident (08-04); `group_id` leaves [Intended as D-3] |
| L9 | A Remove's stashed values exist only in the Collection sidecar, and two devices removing different properties lose one stash, with the losing device's property coming back assigned | `mergePolicy.ts:38-39`, `removeProperty.ts:47-56` | — | Accident of the sidecar's default merge depth (08-06); the stash is meant to lose nothing under sync [Intended as C-2, H-2] |

##### Approaches

###### A · One Home per Definition
Collections hold `propertyIds`, and every schema read goes through `containerSchema`/`holderSchema` resolved against a memoized registry map (08-02, 08-13).
- **Removes:** `repointRegistryInTree`, `resolveAssignedSchema`, the walk-on-arrival branch, per-event `registryOf`, and definition duplication in tree deltas.
- **Costs:** about 15 consumers (nine `containerSchema` sites, three direct `.properties` readers, three holder-schema copies).
- **Risk:** a render-path consumer holding `.properties` by reference switches to the memoized resolver, keyed on `config.registry` identity, or loses the identity `repointRegistryInTree` gave it.

###### B · One Option Shape on Disk — INFERRED
Select and Status share `options: {<key>: {label, color, icon, appearance, group?}}` plus `option_order: [...]`, and Status adds `status_groups: {<id>: {label, color}}` plus `group_order`.
- **Removes:** `optionGroupsOf`/`withOptionGroups`/`SELECT_GROUP` (`properties.ts:298-315`), the nested `group_id`, and the declared-type branching in `optionsOf`; `groupOptions` (`:277-278`, the group-color fallback) survives in some form. The shape would let `mergeDepthFor` go to `{defs: 3}` and merge per option, a Sync rebuild input [Intended as H-2].
- **Costs:** a one-time NexusOS rewrite (one file, 15 definitions) and wide edits in `optionModel`/`optionOps`.
- **Risk:** Legibility and the Concurrency locked decision. Keying by `key` keeps the rename-is-delete-plus-add loss that 09-14's stable option id closes [Intended as D-1], so the shape is weighed against the ids and lands only where it removes code without adding a Sync rule.

###### C · A Seam-Shaped Properties Folder, With Generics Moved Out
08-07, 08-08, 08-11, and 08-12 together: the engine stays at the root and the renderer goes to subfolders; `rowOrder` moves to UIX, `pageRow` and the pane targets to Views, the link vocabulary to Connections, display labels out of engine files (`itemCount` and refusal text stay), and `governedSweep` and the governed-root module, used by Contexts, Nexus, Trash, Settings, and Pages, to `Core/Nexus`, since their imports rule out `Core/Files` (02 A-01).
- **Removes:** cross-domain imports into Properties and the guesswork about which side a file runs on.
- **Costs:** about 25 file moves, line-neutral.
- **Risk:** churn alone; best done last, in one sweep.

###### D · Frontmatter Merge at Landing
A per-root-key YAML merge for `.md` arrivals, which needs `base.ts:57` to keep page base bytes (it keeps them only for merged JSON).
- **Removes:** the largest property-value loss under sync.
- **Costs:** a database that grows by every page's bytes, and a YAML-aware merger.
- **Risk:** high, with Sync desktop-only today; it gates Mobile sync and is a Sync rebuild input [Intended as H-1].

##### Cross-Domain Notes

- **Pages:** `HistoryReader` calls `view:loadValues` through `fetchPageValues` (`PageReaderWindow.tsx:154-164`, `Properties/pageRow.ts:52-58`) only to learn one page's `modifiedAt`; whether it takes the stamp from `history:list` or `page:open` is the Pages domain's question.

---

#### Scout 09 — Tests & Describers

Baseline `d0595b22d`. `Core/Properties` holds 56 test files (14,657 lines) beside about 8.1k source lines, and about 53 test files outside it import Properties; the property-focused ones are inventoried and the rest treated as incidental importers. Legacy-shape claims were checked against `~/NexusOS` (read-only) and the rebuilt `~/Test`, which holds no property data.

##### Test Inventory

**B** pins behavior, **S** pins implementation shape (a literal list, a call order, DOM nesting, object identity), and **B/S** mixes both. Overlaps were opened where a finding rests on them (configReach, the optionOps views block, columnStyles, OptionOrderList, pageValue).

| Test File | Lines | What It Pins | Kind | Overlaps With | Legacy or Stale |
|---|---|---|---|---|---|
| `Properties/optionOps.test.ts` | 1521 | Option add, rename, remove, clear, Value Format; owed-record guards; cascades into Spaces, caches, saved views | B | `configReach.test.ts` (views block `:1112-1323`), `replaySchemaCascade`, `journalWiring`, `handlers` | `:416-434` pins the legacy type spelling surviving writes |
| `Properties/replaySchemaCascade.test.ts` | 713 | Open-time replay of rename, delete, and option records; idempotence; unreadable holders | B | `optionOps` (Space and views reach), `deleteProperty`, `keyHolders` (index seam) | — |
| `Properties/registryProperty.test.ts` | 626 | Create (step-aside, Key Format, seeds), rename, Key Format, holders, reorder | B | `schema.test` (name refusals), `keyHolders:96` | — |
| `Properties/Schema/PropertyFrame.test.tsx` | 614 | Assign surface: slides, All Properties, two-region drag, ⋮ menu, format rows | B/S | `paneDrop.test` | Titles tagged A-4, A-7, T5, T6, T7, A-8, D-1, A-10 (`:134,176,177,202,243,430,438,451,486`) |
| `Properties/propertyValue.test.ts` | 602 | Decode by declared type, encode, no-empties, frozen world, spellings, exact options | B | `value.test`, `governedWrite` (spellings, foreign words), `pageValue` | `:245` "legacy object shape" (File) |
| `Properties/Schema/OptionEditor.test.tsx` | 572 | Option menu, create draft, popup survival through renames, group heading, drag | B | `PropertyPicker.pane` (draft add), `optionMenu.test` | — |
| `Properties/PropertyPanel.test.tsx` | 472 | Row visibility, Remove, pushes, Space subject, order, Add row, drag | B | `rowOrder.test` | — |
| `Properties/deleteProperty.test.ts` | 430 | Global delete: scrub, snapshot, cache purge, Space reach, views reach, replay | B | `configReach:277`, `replaySchemaCascade`, `keyHolders:304` | `:303` pins the old `icon` reservation; `:124` D-6 tag |
| `Properties/Pickers/PropertyValueInput.test.tsx` | 411 | Number, Link, and Text single-line fields; Rename alias; commit rules | B | `ValueEditor.test`, `assignValue:212` (alias memory) | — |
| `Properties/handlers.test.ts` | 410 | Channel replies, warnings and replay, owed-record refusals, unparseable sidecars | B | `optionOps:707`, `journalWiring:306`, `propertyJournal:47` | — |
| `Properties/removeProperty.test.ts` | 407 | Remove: strip and cache, ID-less holders, archive, views reach, refill on re-assign | B | `assignment.test:84`, `configReach:428` | Titles tagged C-3, C-6, E-6, B-6, breaker H-1 (`:93,178,217,261,361`) |
| `Properties/Pickers/PropertyPicker.pane.test.tsx` | 382 | Pane routing per type, chooser, New Option draft, Status groups | B | `OptionEditor` (draft) | B28 tags (`:145,150`) |
| `Properties/properties.test.ts` | 375 | Definition decoding, loose keys, `PROPERTY_TYPES` facts, `optionsOf`, seeds | B/S | `optionOps:416` | `:44-47` legacy spellings |
| `Properties/journalWiring.test.ts` | 372 | Each writer stages and clears its journal record; create-side consumer; slot protection | B/S (call order) | `propertyJournal`, `handlers:301` | — |
| `Properties/Pickers/ValueEditor.test.tsx` | 354 | One-line editor keys, seat, alias slot, alias memory | B | `PropertyValueInput`, `TextPane` | — |
| `Properties/Cells/Cell.test.tsx` | 339 | Status, checkbox, and format looks; file chips; chip list drag; text links | B | `CheckboxEditor` (color var) | — |
| `Properties/value.test.ts` | 339 | `declaredType`, `resolveFieldValue`, memoization, type never inferred | B/S (memo identity) | `propertyValue:59-147` | `:81` title says "snake_case PropertyType" |
| `Properties/propertiesRegistry.test.ts` | 336 | Read strictness, junk tolerance, fold-alike first-wins, serialization, byte preservation | B | `registryProperty:56`, `optionOps:207-245` | breaker M-2/L-1 (`:148`), B-3 (`:204`), C-3 (`:123`) tags |
| `Properties/formatValue.test.ts` | 332 | Date, number, span formatting; `readDate`; `readNumber`; `spelledNumber` | B | `governedWrite:232` | — |
| `Properties/Pickers/TextPane.test.tsx` | 314 | TextPane keys, saves on every exit, outside change, headings | B | `ValueEditor` | — |
| `Properties/keyHolders.test.ts` | 312 | `governedReach`, `confirmedKeyHolders`, `keyedHolders`, exclusion, mtime | B | `renameSweep`, `deleteProperty:150`, `removeProperty` | "Requirement 9" tag (`:270`) |
| `Properties/schema.test.ts` | 295 | `validateName`, `validateDefinition`, option uniqueness, `linkKeysOf` | B | `registryProperty:250-271` | — |
| `Properties/assignValue.test.ts` | 294 | Optimistic patch, revert via held raw, refused writes, alias memory | B | `valueOverride.test`, `restoreValue.test` | — |
| `Properties/governedWrite.test.ts` | 277 | `setGovernedRootKey`: foreign keys, clears, precedence, spellings | B | `propertyValue:430-490`, `setSpaceProperty`, `governedWorldWrite` | `:70` keeps legacy `modified_at` as foreign (interop) |
| `Properties/paneDrop.test.ts` | 200 | Drop resolution for the schema and visibility panes; Nexus reorder index | B | `PropertyFrame:243-412` | C-1..C-5 (`:63-82`), breaker M-1 (`:180`) tags |
| `Properties/repairSweep.test.ts` | 203 | On-open repair over re-read pages; never removes; toggle; cold index | B | `governedWrite:89-155` | — |
| `Properties/Pickers/filePick.test.ts` | 202 | File value edit helpers, dialog start folder, file value menu | B | `valueClick:32` | — |
| `Properties/restoreValue.test.ts` | 193 | A `describe.each`/`it.each` matrix (`:174,178`): set, then restore the raw held value, page and Space | B | `assignValue:72` | — |
| `Properties/Cells/TextCell.test.tsx` | 185 | Text value links, § runs, menus, heading redraw | B | `Cell.test:267` | — |
| `Properties/governedWorldWrite.test.ts` | 181 | Whole-file reconcile on write; unheld Space; managed-key definitions | B | `governedWrite:89` | — |
| `Properties/setSpaceProperty.test.ts` | 177 | Space value writes, reconcile, exact key, 0 | B | `governedWrite`, `restoreValue` | — |
| `Properties/assignment.test.ts` | 168 | Assign idempotence, reorder, race, refill from cache | B | `removeProperty:261`, `Trash/restoreProperty` | breaker H-2 tag (`:49`) |
| `Properties/optionModel.test.ts` | 153 | Pure option edits; group round-trip | B | `optionOps:277-436` | — |
| `Properties/pageValue.test.ts` | 154 | `valueEditRewrite`, `editList`, `namesValue`, `stripList` | B | `optionOps` cascades, `Files/rootValues.test` | `:20`, `:58` "status" tests run as Select |
| `Properties/governedSweep.test.ts` | 143 | Unparseable sidecar refused; dry run; `sweepCount` excludes Archive | B | `keyHolders` | — |
| `Properties/Cells/LinkCell.test.tsx` | 148 | Link value as connection vs address look | B | `TextCell` | — |
| `Properties/renameSweep.test.ts` | 132 | Key move in place, idempotent, exact key, Space sidecar | B | `keyHolders:261`, `registryProperty:321` | — |
| `Properties/keyFormat.test.ts` | 115 | Ten formats, word splitting, Unicode | B | `registryProperty:90` | — |
| `Properties/Schema/PropertyFrame.dateTime.test.tsx` | 108 | Date format writes the active view's `column_styles` | B | `DateTimeEditor.test` | A-3 tag (`:77`) |
| `Properties/propertyJournal.test.ts` | 102 | Record round-trip; non-displacement; validator; clear | B | `journalWiring:306-345` | — |
| `Properties/valueOverride.test.ts` | 101 | Optimistic override retire and settle | B | `assignValue` | — |
| `Properties/columnStyles.test.ts` | 101 | Look vocabulary; defaults; codec | B/S | itself (`:34`, `:39` duplicate `:78`) | `:34` and `:39` pin dropped legacy looks; NexusOS's saved views hold only `bar`, `checkbox`, `compact`, `standard` |
| `Properties/Pickers/valueClick.test.ts` | 100 | Click and menu intent per type | B | `cellMenu.test` | — |
| `Properties/Schema/CheckboxEditor.test.tsx` | 93 | Color and Style rows | B | `Cell.test:144-176` | — |
| `Properties/cascadeRace.test.ts` | 85 | Rename cascade queues behind a cell-write lock | B | — | "F1" tag (`:58`) |
| `Properties/governedWorld.test.ts` | 84 | `assignedDefs`, `pageWorldOf` | B | — | — |
| `Properties/Schema/DateTimeEditor.test.tsx` | 77 | Day row gating; patches | B | `columnMenu:87` | — |
| `Properties/Schema/NumberEditor.test.tsx` | 71 | Row gating; Value row parse | B | — | — |
| `Properties/Cells/OptionChip.test.tsx` | 48 | Glyph fallback | B | — | — |
| `Properties/Pickers/massAssign.test.ts` | 46 | Mass pick commits | B | `propertyMenuActions:200-212` | — |
| `Properties/Cells/columnLabel.test.ts` | 43 | Column label resolution | B | — | — |
| `Properties/valueContext.test.ts` | 42 | `buildValueContext` | B | — | — |
| `Properties/formatBucketLabel.test.ts` | 33 | Bucket labels | B | `formatValue.test` (same module, `formatValue.ts:155`) | — |
| `Properties/pageRow.test.ts` | 32 | `spaceRowOf` | B | — | — |
| `Properties/rowOrder.test.ts` | 20 | `resolveRowOrder` | B | — | — |
| `Properties/Cells/PropertyTypes.test.ts` | 18 | `CREATABLE_TYPES` equals a literal list, the only pin of the New Property picker's visible order | B/S | `properties.test:209` (origins only) | — |
| `Trash/restoreProperty.test.ts` | 468 | Property restore from the Trash: refill, step-aside, Link parking, archive | B | `removeProperty:261-407`, `assignment:84` | — |
| `Nexus/configReach.test.ts` | 714 | The configuration pass: option rename, removal, and clear across views, tiles, Matrix; skips; scoping | B | `optionOps:1112`, `deleteProperty:356`, `removeProperty:217`, `replaySchemaCascade:448` | — |
| `Interface/Menus/propertyMenuActions.test.ts` | 287 | Spaces ▸ / Properties ▸ branches and picks | B | `massAssign`, `PropertyPicker.tsx:391` toggle rule | — |
| `Actions/columnMenu.test.ts` | 182 | Style items per type | B | `columnStyles` | `:39` title says "file Filename/Full Path" while `:49` asserts `[]` |
| `Actions/cellMenu.test.ts` | 273 | Cell menu per type | B | `valueClick` | `:100` "(its look is per-property)" contradicts `columnMenu:44-48` |
| `Actions/optionMenu.test.ts` | 29 | Option menu rows | B | `OptionEditor:131` | — |
| `Views/Settings/OptionOrderList.test.tsx` | 133 | Group-order list | B | `properties.test:267` (stale `select_options`) | — |
| `Files/rootValues.test.ts` | 54 | `joinValues`, `editHeldList`, `rekeyHeld` | B | `pageValue.test` (`editList`) | — |
| `Nexus/migrateConfig.test.ts` | 74 | `normalizePropertyTypes` respelling | B | `properties.test:44`, `optionOps:416` | Wholly legacy (imports only `normalizePropertyTypes`, `:7`) |
| `Nexus/handlers.test.ts:165-178` | — | "respells a legacy property type in the registry it opens", the open-time respell end to end | B | `migrateConfig.test` | Wholly legacy |
| `Trash/restoreScrub.test.ts:287,310` | — | `type: 'multi_select'` as incidental fixture data that decodes only through the legacy preprocess | — | — | Legacy spelling in a fixture |
| `Sync/Arrival/mergePolicy.test.ts:122-124` | — | `multi_select` vs `multiSelect` as the two sides of a per-field JSON merge that never decodes the type | — | — | Legacy spelling as the example |

##### Doc Claims

| Doc:Line | Claim | Holds at HEAD? | Overview or Implementation? |
|---|---|---|---|
| PropertiesPM:8 | Earlier spellings (`multi_select`, `url`, `datetime`) still read and are rewritten at open | Holds (`properties.ts:79-88`, `migrateConfig.ts:57-74`, `handlers.ts:45`); removable, since no NexusOS registry, `.nexus`, or `.trash` holds a legacy id | Implementation (migration residue) |
| PropertiesPM:8 | "A definition names its type by the displayed name in camelCase — … `dateTime`, `createdTime`, `lastEditedTime`" | False for three ids: `PropertyTypes.tsx:26,33-34` and the doc's own table display them as "Date", "Creation Time", and "Last Modified" (`columnLabel.ts:4-8`) | Overview |
| PropertiesPM:15 vs :68 | The table row says "Date" and the section heading "Date & Time" | One type, two names | Overview |
| PropertiesPM:27 | Built-ins use `_title`, `_created_at`, `_modified_at`, `_location` | Holds (`properties.ts:243-248`) | Overview |
| PropertiesPM:27 | Label and key are trimmed and NFC-normalized once at write | Holds: create and rename pass the label through `exactTitle` (`registryProperty.ts:81,214`; `Paths/caseFold.ts:16-17`), the key through `formatKey` (`keyFormat.ts:73-74`) | Implementation |
| PropertiesPM:29 | Checkbox reads `true/false`, `yes/no`, `on/off`, `y/n` in any casing | Holds (`propertyValue.ts:83-88`) | Overview |
| PropertiesPM:66 | "a number with no bar to fill offers no Format choice" | Holds, with mixed vocabulary: the doc says "look", the UI says Style (`NumberEditor.test:41-46`), or Format only as a branch of one row (`columnMenu.test:171-175`, a deliberate `styleBranch` rule) | Overview |
| PropertiesPM:74 | Multi-Select registration triggers: a file change or arrival in reach, an assign, the registry gaining a key, a Key/Value Format change, and every file at open | Holds (`settle.ts:163`, `handlers.ts:114`; `owed.options` fed by `fileEvents.ts:434,440,536-537`) | Implementation (trigger list) |
| PropertiesPM:76 | Clear asks first past one Item; Remove always asks | Holds (`confirmations.ts:185`); `asksPastOne` is passed by `askClearOption` (`:214`) and `askFormatChange` (`:227`), sharing one threshold since `5e3aee180` | Overview |
| ConfigurationPM:115 | A property's delete "and an option's Clear and Remove" ask regardless of Confirm Before Deletion | False for Clear, which asks only past one Item (`confirmations.ts:185,214`); stale since `5e3aee180` (10-19), which updated PropertiesPM only | Overview |
| PropertiesPM:94 | The basename index lives in `Core/Assets/assetMap.ts` | Holds | Implementation (path) |
| PropertiesPM:117 / :119 | Two adjacent paragraphs introduce the Properties panel with the same file path | Holds: `:117`'s second-to-last sentence describes `Core/Properties/PropertyPanel.tsx`, which `:119` introduces again | Overview, duplicated |
| PropertiesPM:121 | "**The Properties Menu.**" | The label ends in a period, breaking the `**Label:**` rule its siblings follow | Formatting |
| PropertiesPM:123 | "every operation that writes both the registry and pages states its intent in a journal first" | False while another record holds the slot: `journalSlot.write` returns `false` for a different held record (`journalSlot.ts:34-36`), and `rekeyProperty` ignores it and commits unjournaled (`registryProperty.ts:183`) | Implementation |
| PropertiesPM:125-134 | Mutation table (Remove caches before strip, delete record first, refusals while a record is owed) | Holds per tests (`removeProperty:93-216`, `deleteProperty:67`, `optionOps:707`, `:1425`) | Implementation (mechanism specs) |
| PropertiesPM:136 | Remove and the global delete each "re-run cleanly after a partial run" | False for Remove: a second Remove finds the property unassigned and returns `NOTHING_TO_REMOVE` (`removeProperty.ts:33`), so skipped pages keep the key | Overview |
| PropertiesPM:138 | Repairs: `reconcileGovernedRoot` in `Core/Contexts/contextResolve.ts`; the on-open sweep sits behind Repair Properties On Open | Holds (`contextResolve.ts:96`, `repairSweep.ts:20`, `frames.ts:239-240`) | Implementation |
| PropertiesPM:140 | Reserved names are `ID`, `banner`, `heading_icon_hidden` in any casing, plus `constructor`/`toString` exactly | Holds (`schema.ts:18-30`, `identityMark.ts:11`, `spaceSidecar.ts:16-23`); `$`-prefixed Space keys (`$icon`, `$color`, `$order`, `spaceSidecar.ts:11-13`) fall under the `$` rule | Implementation |
| PropertiesPM:140 | "two options whose labels or keys fold alike read as the first, and the second leaves the file on that property's next option edit" | Holds (`propertiesRegistry.test:71`, `optionOps.test:224`) | Implementation (repair-on-write) |
| PropertiesPM:149 | Pending: "Calendar Picker — range values, keyboard stepping on the time parts" | Stale in part: spans ship (`:70` describes End Date; `formatValue.test:126-176`), while keyboard stepping is absent (no arrow-key handling in `UIX/Pickers`) | — |
| PropertiesPM:150 | Pending: "Per-view link styling … a prospect" | Stale in part: a view's column already overrides the link Format (`:80`; `columnStyles.ts:15-18` puts `LINK_DISPLAYS` in `COLUMN_LOOKS`; `columnMenu.test:44-48`); only Underline and Color stay property-level | — |
| ContextsPM:25 | A Space takes a value for any registry property through the same operation a page's does | Holds (`setProperty.ts:38-83`, one `ValueRequest`) | Overview |
| CollectionsPM:14 | `property_cache` appears while a removed property's values are held | Holds (`propertyCache.ts:1`) | Implementation |
| IssuesPM I-036 | "two replayers at two points of the open (`Core/Nexus/handlers.ts:82`, `:102`)" | Holds in substance; the lines are `:86` (`replayPendingRename`) and `:111` (`replaySchemaCascade`) | — |
| IssuesPM I-006 | "Option lists key on `value`, which a rename changes" | Stale vocabulary: options carry `key` and `label` (`properties.ts:122-130`); the conclusion stands, since without a stable id they merge whole | — |
| `.claude/Guidelines/*` | Nothing in Guidelines describes properties (three files hit "property" in other senses) | n/a (`Development-Environment.md:38`, `Web-Guests.md:7`, `Editor-Internals.md:44`) | — |
| `.claude/scripts/README.md` | Describes the three property drives | The drives exist (`Option Picker Drive`, `Text Property Drive`, `Metadata Drive`; README `:10,18,29`), and `Metadata Drive/MATRIX.md` is 203 lines; whether every channel they call resolves in `bridge.ts` is inferred, settled by grepping the three `live-drive.mjs` files against it | Overview |

##### Issues Status

| Issue | Still Holds? | Proposed Solution Fits the Principles? | Notes |
|---|---|---|---|
| I-006 | Yes for `select_options`/`status_groups` merging as one field: `mergeDepthFor` gives `properties.json` `{ defs: 2 }` (`Sync/Arrival/mergePolicy.ts:37-38`), so each option list is one field under its definition, as `NexusSyncPM.md:63` says | Partly; item merge by `id` is One Way, and the option-list exclusion is a symptom of options having no stable id | Vocabulary stale (Doc Claims). A stable option id is the origin fix [Intended as D-1]; per-item option merging is a Sync rebuild input [Intended as H-2] |
| I-032 | Yes; "seventeen property and schema channels" is now eighteen writing channels (four `schema:*`, fourteen `property:*`, `bridge.ts:131-185`) plus the `property:holders` read (`:186`), since `property:setValueFormat` (MetadataV3 7B-1, 10-18) landed after the issue's 10-16 update. `setProperty` and `restoreValue` ride `mutate` (`mutateRequest.ts:90,92`) | Yes; folding the five `defEditOp` channels into one op is a Properties-local slice | The slice lands inside this restructure, and the count is rewritten with it |
| I-035 | Not re-verified (Contexts settle) — inferred | Yes | Not Properties-owned; listed because tags are values. Reading its cited `applySpace`/`renameSpaceOp` settles it |
| I-036 | Yes: `propertyJournal.ts` and `contextJournal.ts` share `journalSlot.ts`, with two replayers at `handlers.ts:86` and `:111` | Yes, and it's the origin of a large share of the property test corpus (09-07, 09-10) | Line citations stale; unifying collapses about four test files' owed-record coverage into one |
| I-039 | Yes: `undoSweep` returns on `now === null` (`Properties/governedSweep.ts:156`) | Yes | `undoSweep` (`governedSweep.ts:151`) lives in Properties while its only caller is `Contexts/contextCascade.ts:179`, an instance of I-042 |
| I-042 | Yes: `governedSweep.ts`, `governedWrite.ts`, `journalSlot.ts`, and `keyHolders.ts` are still in `Core/Properties` | Part (2) fits Clearer Boundaries only for `journalSlot`, since `governedSweep`/`governedWrite`'s imports rule out `Core/Files` (02 A-01); part (1) is unruled | Moving them relocates about six test files (`governedSweep`, `governedWrite`, `governedWorld*`, `keyHolders`, `propertyJournal`) |
| I-063 | Yes: `assignValue.ts:71` sends `restoreValue`, `setProperty.ts:44-45` lands `req.held` raw, and `assignment.ts:60` uses `isBlankRaw` | Its Deferred question (whether the file's raw value is what every write and revert is built from) is this restructure's, answered by undo putting back what the file held [Intended as E-1] | Two value ops (`setProperty` encodes, `restoreValue` lands raw) over one `requestedValue` switch (`setProperty.ts:40-47`) is the visible seam |
| I-064 | Yes: `Schema/FormatRows.tsx` carries no `hint`/`caption` | Yes (one rule for every pane) | UIX-owned; Properties rows are the waiting consumer; the issue stays open |
| I-033 / I-068 / I-072 | Trash Link-value parking; not re-verified — inferred | n/a | Touch Link values only through the Trash; reading their footnoted `Bundles/` and `Trash/holdings.ts` sites settles them |

##### Findings

###### 09-02 · `Core/Testing/propertyWrites.ts` Is a Second Value-Write Path That Exists Only for Tests
- **Now:** `writePageValue` and `writeSpaceValue` (`Core/Testing/propertyWrites.ts:6-23`) encode with `valueToWrite`, then call `landPageValue` and `landSpaceValue` directly, skipping `mutableTarget`, the page lock, and the registry read. `writePageValue` also skips `pageWorldOf` and passes no world, so `setGovernedRootKey` runs without the reconcile the production page write always runs (`setProperty.ts:68-82`); `landSpaceValue` builds its own world (`setProperty.ts:32`), so the Space seed does reconcile. `landPageValue` and `landSpaceValue` are exported from `setProperty.ts:15,26` for this fixture and `Core/Files/writePathRace.test.ts:7,82`, which pins `landPageValue`'s lock-free contract; both world-less callers are tests. Nine test files call the fixture 54 times: `Trash/restoreProperty` ×19, `optionOps` ×8, `Nexus/page` ×8, `removeProperty` ×7, `deleteProperty` ×6, `handlers` ×3, and `assignment`, `cascadeRace`, `registryProperty` ×1 each.
- **Better:** Route a seed meaning "a user wrote this" through `settledMutate(root, { op: 'setProperty', path, propertyId, value }, deps)` (`Core/Testing/settledMutate.ts:13`), and a seed meaning "the file holds this" through `putJson` and `seedSpaceSidecar` (`Core/Testing/hostFs.ts:22-36`); `propertyWrites.ts` goes. The `land*` exports leave once `writePathRace.test.ts:75-82` pins the lock rule through `setPagePropertyOp` or leaves with the export. Routing through `settledMutate` makes every seeded value pass the reconcile, which can change what some legacy-shape tests start from, and costs a tree read and settle per seed.
- **Estimate:** −23 fixture, −2 export keywords, test call sites about ±0 · read

###### 09-03 · Configuration Reach Is Pinned Once in Its Unit and Again in Every Caller
- **Now:** `Core/Nexus/configReach.test.ts` tests the pass on its own: `:157` (option rename across Collection, Set, tile, and Matrix), `:253` (option removal), `:277` (property clear), and `:427` (scoped under one Collection). Each caller re-seeds the same surfaces through `seedConfigSurfaces` and re-asserts the same fields: `optionOps.test.ts:1112-1323` (about 210 lines; `:1142` mirrors `configReach:158`), `deleteProperty.test.ts:356-411` (`:394` mirrors `configReach:278`), `removeProperty.test.ts:217-259` (`:230` mirrors `configReach:428`), and `replaySchemaCascade.test.ts:448-579`.
- **Better:** `configReach.test.ts` owns every field-level expectation, and each caller keeps one test that pins its own decision (scope, label, kind) plus what's unique to it: `optionOps:1172-1222` (a page skip holds the views and the journal), `:1224` (a rename onto its own key), `:1240`, `:1258`, `:1274` (files by key, views by label), `:1294`; `deleteProperty:412` (a failed registry write keeps its record); `removeProperty:230`'s single own-sidecar write; and `replaySchemaCascade:467,493,530` (replay idempotence and label-less records). Only the per-surface re-assertions go.
- **Estimate:** tests about −100 to −150 · read (the overlap), inferred (per-caller size)

###### 09-04 · Each File Hand-Rolls Its Own Nexus Seed and Its Own Definitions
- **Now:** 35 test files (72 lines) name `.nexus/nexus.json`, most writing it by hand, and 9 use the exact `JSON.stringify({ id: 'nx', createdAt: 'x' })`; in Properties that's `governedWorld:22`, `governedWorldWrite:31`, `journalWiring:48`, `keyHolders:52`, `repairSweep:39`, `replaySchemaCascade:42`, `restoreValue:36`, and `setSpaceProperty:99`. `Core/Testing/hostFs.ts` provides `tempRoot`, `putJson`, and `seedSpaceSidecar`, but nothing that seeds a Nexus. 25 test files inline a `status_groups: [` literal while `viewHarness.tsx:58` exports `STATUS_DEF` and `Core/Testing/fixtures/registry.json` holds a shared Status definition (`prop_status`), read by `Views/Pipeline/columns.test.ts:3` and `resolveView.test.ts:4`. Files also wrap `createProperty` in their own helpers (`restoreValue.test.ts:26` `property`, `deleteProperty.test.ts:238` `mkProperty`).
- **Better:** One `seedNexus(root)` in `hostFs.ts` (identity file, contexts registry), and one shared definitions module, or `fixtures/registry.json` itself, holding the Status, a Select, a Multi-Select, and a `createProperty`-and-throw helper, which `STATUS_DEF` and the JSON fixture both read. `STATUS_DEF` leaves `viewHarness.tsx`, a React mount harness, so host-side tests don't import a `.tsx` for a definition.
- **Estimate:** tests about −80 (+25 fixture) · read (counts), inferred (per-file savings)

###### 09-05 · PropertiesPM Mixes Overview Description With Mechanism Specs, and Seven Claims Are Wrong or Stale
- **Now:** *§Shared Mechanisms* reads as implementation notes: the Schema Mutations paragraph and table (`:123-136`) list lock, journal, cache-before-strip ordering, and per-op refusals; Repairs (`:138`) names `reconcileGovernedRoot` and its file; Validation (`:140`) lists reserved words and the fold-alike repair-on-write; `:74` lists registration trigger points. Wrong or stale: `:8` (the camelCase-of-displayed-name claim), `:149` (range values ship, keyboard stepping doesn't), `:150` (Pending entries that shipped), ConfigurationPM:115 (Clear "asks regardless", stale since `5e3aee180`), the panel defined twice (`:117` and `:119`), `:123` ("states its intent in a journal first", false while another record holds the slot, `registryProperty.ts:183`), and `:136` ("re-runs cleanly after a partial run", false for Remove, `removeProperty.ts:33`). Smaller: "Date" vs "Date & Time", "look" vs "Style" vs "Format", and the `**The Properties Menu.**` label.
- **Better:** *§Shared Mechanisms* is rewritten at overview level: what each mutation does to existing values in a line each, refusals named as user-visible outcomes, no lock or journal choreography. The stale claims are corrected or removed in the same pass, with `:123` and `:136` following the crash-recovery and Remove decisions. The documents settle on one name for the Date type and one for the per-view look; the UI's "Format" for Link and a bar-capable Number is a deliberate `styleBranch` rule (`columnMenu.test:171-175`), and the settings rows' wording stays as it reads [Intended as I-1].
- **Estimate:** doc about −40 lines · read

###### 09-06 · Test Titles Carry Plan-Round Tags and Four Stale Claims
- **Now:** About 31 test or describe titles in `Core/Properties` cite plan or review ids a reader can't resolve: `A-3`, `A-4` (`PropertyFrame.test.tsx:177`), `A-7`..`A-10`, `B-1`, `B-3`, `B-6`, `B28`, `C-1`..`C-6`, `D-1`, `D-6`, `E-5`, `E-6`, `T5`..`T7`, `F1`, `Requirement 9`, and `breaker H-1`, `H-2`, `M-1`, `M-2`, `L-1` (`removeProperty:361`, `assignment:49`, `paneDrop:180`, `propertiesRegistry:148`), the last marking adversarial-review fixes. Stale titles: `value.test.ts:81` "(snake_case PropertyType)", stale since `31b2e8481`; `Actions/columnMenu.test.ts:39` "file Filename/Full Path" while `:49` asserts `[]`; `Actions/cellMenu.test.ts:100` "(its look is per-property)" while a column overrides it (`columnMenu.test:44-48`); and `pageValue.test.ts:20,58` (09-08).
- **Better:** Every tag leaves its title, each stale title says what it asserts, and each guard the `breaker` tests pin is traced to the state that produces it.
- **Estimate:** ±0 lines · read

###### 09-07 · The Exact-Key Rule Is Pinned 17 Times Across 12 Files, Because Each Layer Decides It for Itself
- **Now:** "The exact key; another casing is foreign" is asserted in `renameSweep:82,90,98`, `keyHolders:155,219`, `governedWrite:217,270`, `repairSweep:182,190`, `deleteProperty:278`, `removeProperty:117`, `optionOps:530`, `propertyValue:431`, `value:128`, `PropertyPanel:146`, `setSpaceProperty:165`, and `assignment:113`; `repairSweep:190` pins a Context key's spelling, a sibling rule. "Reaches a Space sidecar" and "reaches saved views" each recur in about five files, and "never re-dates a page" in four (`renameSweep:67`, `keyHolders:287`, `removeProperty:262`, `governedWrite:37`).
- **Better:** The ten sweep-side pins (`renameSweep` ×3, `keyHolders` ×2, `repairSweep` ×2, `deleteProperty`, `removeProperty`, `optionOps`) are the test-side cost of I-036's per-op enumerate-lock-read-decide-write loops; under one sweep loop the rule is pinned once at the shared walk (exact key, Space reach, mtime), and each op pins only its decision. The write-path pins (`governedWrite` ×2, `propertyValue:431`, `setSpaceProperty:165`, `assignment:113`) collapse with 02's one write path. The read-side pins (`value.test:128`, `PropertyPanel:146`) cover decode and row visibility and stay.
- **Estimate:** tests about −100 once I-036 and the write-path fold land · inferred

###### 09-08 · `pageValue.test.ts`'s "Status" Tests Run as Select and Duplicate Their Neighbors
- **Now:** `defOf` (`Core/Properties/pageValue.test.ts:5`) builds only `'multiSelect'` or `'select'`, so "status: strips the bare label, same as select" (`:20`) and "status: swaps the bare label, same as select" (`:58`) exercise Select, repeating `:14` and `:54`, and `:34-50` "the option list is the one shape" covers the same ground. "Bare label" is stale: values are option keys in one-element lists.
- **Better:** Delete `:20-22` and `:58-60` (Status has no divergence: `PROPERTY_TYPES.status.kind === 'select'`, `properties.ts:41`), and merge `:13-31` and `:53-77` into the one-shape block.
- **Estimate:** tests about −15 · read

###### 09-09 · Exports With No Outside Reader, or Only a Test Reader
- **Now:** No outside reader: `OptionDef` and `OptionEditApi` (`Schema/useOptionEdit.tsx`), `NumberPart` (`formatValue.ts:194`, the return element of the exported `formatNumber`, `:225`), `TypeSpec` (`properties.ts:27`), and `NUMBER_FAMILIES` (`properties.ts:105`, read at `:177`). Only tests or fixtures read: `landPageValue`/`landSpaceValue` (09-02); `writePropertyBundle` (`deleteProperty.ts:42`, used at `:85` and by `Bundles/handlers.test.ts`, `Bundles/rows.test.ts`, `replaySchemaCascade.test.ts`, and `Trash/spend.test.ts:663`, a whole describe on "the artifact-less shape"); `runFilePick` (`Pickers/filePick.ts:32`, used at `:97`); `numberDivisor` (`formatValue.ts:237`); `LEGACY_TYPE_IDS`; `CheckboxLook`; `StoredColumnStyle` (`columnStyles.ts:87`); and `ValueIntentHandlers` (`valueClick.ts:61`).
- **Better:** Zero-reader names drop `export`. Test-only ones are reached through the public entry the app calls: `deleteProperty` for the bundle, `pickFileInto` or `fileValueMenu` for `runFilePick`, and the `formatValue.ts:243,246` wrappers for `numberDivisor`; a test that can't is testing implementation shape. `LEGACY_TYPE_IDS` leaves with 08-03 / 09-01.
- **Estimate:** ±0 lines; about 13 export keywords · read

###### 09-10 · The Journal Slot's Non-Displacement Rule Is Pinned in Four Files
- **Now:** "A held record isn't displaced by a new op" appears in `propertyJournal.test.ts:47`, `journalWiring.test.ts:306-319`, `handlers.test.ts:216,230,301-376`, and `optionOps.test.ts:707-836` (four owed-record cases, plus `:1425` for the Value Format). The guards they pin are the ones I-036 folds into "an operation on a property waits on that property's owed record" (`IssuesPM.md` I-036 Solution).
- **Better:** With a crash-recovery note per property, Context, and Space [Intended as B-1], the guards leave with the one slot and each guard's test leaves with it; one unit pin stays on the slot and one per-op refusal pin wherever an op's reply differs.
- **Estimate:** tests about −150 · inferred

###### 09-11 · Comments That Claim Constraints, or Restate the Code
- **Now:**
  - `properties.ts:78`: "so they read forever", a constraint no live Nexus needs (08-03 / 09-01).
  - `columnLabel.ts:10`: "`contexts` is REQUIRED and deliberately un-defaulted", which the signature already says.
  - `paneDrop.tsx:16-17`: "refuse drops differently by design", a design claim with no owner, pinned by `paneDrop.test:132-136`.
  - `pageValue.ts:1`: "never decode-to-strings→re-encode", a rule I-063's raw-versus-decoded question reopens.
  - `setProperty.ts:14`: "callers hold the page's lock … a re-take would be refused"; once 09-02 removes the fixture, the only production caller is in the file (`:69-79`), and `writePathRace.test.ts:75` restates the rule.
  - `property-panel.css.ts:8`: "KNOB —", tuning jargon.
  - `registryProperty.ts:170`: an ordering argument of about 290 characters belonging to the crash-recovery design.
  - `formatValue.ts:1` and `:10` (en-US pinned, a formatter cache justification) and `value.ts:1` ("Two axes that must not be confused", which `:26`, `:36`, and `:63` don't repeat) are accurate.
- **Better:** `:78` leaves with 08-03 / 09-01; the `columnLabel.ts:10` and `setProperty.ts:14` comments go; `paneDrop.tsx:16-17` becomes one line naming the two panes' different bottom zones; the `registryProperty.ts:170` argument folds into the per-entity notes [Intended as B-1]; the rest stays.
- **Estimate:** about −8 lines · read

###### 09-12 · Change-Detector and Legacy-Vocabulary Tests
- **Now:** `Cells/PropertyTypes.test.ts` (18 lines) asserts `CREATABLE_TYPES` equals a literal array ("lists the user types in the New Property order"); that order is the type picker's visible order, derived from `PROPERTY_TYPES`' key order (`PropertyTypes.tsx:44-46`), and nothing else pins it, since `properties.test.ts:209` pins only the origins. `properties.test.ts:25` checks "accepts the 12 type ids". `columnStyles.test.ts:13` checks "COLUMN_LOOKS includes the number looks", and `:34-43` pins that two retired look vocabularies (`full`/`title`, `filename`/`path`) drop, the same assertion as `:78` "drops an unknown enum value". `PropertyFrame.test.tsx:135` and `:235` pin DOM nesting ("inner FrameSlide keeps them mounted", "renders inside its region wrapper (T6 hangs rects on it)").
- **Better:** `PropertyTypes.test.ts` stays as the order pin it is, retitled, or folds into one `properties.test` assertion if the New Property order is declared to follow `PROPERTY_TYPES`. `columnStyles:13-16` and `:34-43` go, keeping `:39-43`'s `defaultStyleFor('file')` line inside `:22`. The two DOM-nesting pins become the user-visible outcome they protect, or leave.
- **Estimate:** tests about −30 to −45 · read

###### 09-13 · `restoreValue` Sits Beside `setProperty` as a Second Value Op
- **Now:** `mutateRequest.ts:92` declares `restoreValue { path, propertyId, held }`, and `setProperty.ts:38-47` switches between encoding (`setProperty`) and landing the raw held value (`restoreValue`); `assignValue.ts:71` sends it for undo, and `restoreValue.test.ts` (193 lines, a `describe.each`/`it.each` matrix at `:174-178`) pins it. I-063 is still Deferred.
- **Better:** With undo putting back what the file held, recorded by the part of Pommora that writes the file [Intended as E-1], `restoreValue` stops being a second value op, its test matrix merges into the `setProperty` tests, and I-063 closes.
- **Behavior:** Undo changes as decided [Intended as E-1, E-2, E-3].
- **Estimate:** n/a · read

###### 09-14 · Option Lists Have No Stable Identity, the Origin of I-006's Option Exclusion and of the Rename-Popup Tests — INFERRED
- **Now:** Options are `{ key, label, … }` with no id (`properties.ts:122-130`), and I-006 excludes them from per-item merge because "a rename changes" the key (the issue still says `value`). `OptionEditor.test.tsx:267-448` spends about 180 lines keeping a popup addressed through renames ("re-keys the popup", "two renames before a refresh", "a later option taking an intermediate name keys apart"), and `optionOps.test.ts:245-276` pins "an edit still addressed to the old value is refused". Both read as compensations for addressing an option by a mutable name; whether a stable id retires the re-keying or moves it to id lookups is settled by sketching `useOptionEdit`'s addressing against an id.
- **Better:** A stable option id [Intended as D-1] collapses the popup re-keying machinery and its tests where that sketch confirms it, and lets I-006 merge option lists per item once the Sync rebuild takes that input [Intended as H-2].
- **Behavior:** The on-disk shape gains a field; a user sees no difference.
- **Estimate:** tests about −150; code unknown · inferred

###### 09-15 · Minor Describer Residue
- **Now:** `formatBucketLabel.test.ts` (33 lines) is a separate file for one export of `formatValue.ts` (`:155`). `propertyValue.test.ts:245` "the legacy object shape reads as null" pins a File shape `{ path }` from before `820192976`; NexusOS has one File property (key `File`) and no frontmatter holding the object shape, and the test reduces to "a non-wikilink entry reads as nothing", which `:249` nearly covers. `deleteProperty.test.ts:303` "a property named icon … leaving every Space its glyph" pins the move of the Space icon to `$icon` (`96fc1b343`, which introduced both); `icon` is an ordinary word today.
- **Better:** `formatBucketLabel.test` moves with `formatBucketLabel` to `Views/Pipeline/group.ts`'s tests (07-15); `propertyValue:245-247` and `deleteProperty:303-332` go.
- **Estimate:** tests about −40 · read

##### Behavior Ledger

| Behavior | Pinned At | Origin | Classification |
|---|---|---|---|
| A Select or Status list holding several elements reads as its last registered option, and removing that option reveals the one before it | `propertyValue.test.ts:168-190`, PropertiesPM:16,74 | In PropertiesPM by `f5ea8a144` (09-01); the test's describe arrived with `820192976` (09-05) | Agent's choice; the intended rule ignores words no option names, shows the most recently added valid option, and tidies to it on the next change [Intended as P-1] |
| A re-assign's refill skips a page whose key holds only words no option names | `assignment.test.ts:130` | `a4d4c7ab4` "MetadataV3 Phase 3 review" | A review-round fix that never overwrites user words; a symptom-level guard in the I-063 family |
| A cached member naming no option exactly doesn't come back on re-assign | `assignment.test.ts:126`, `removeProperty.test.ts:320,385`, `Trash/restoreProperty.test.ts:232,447` | MetadataV3 (`9aeb29271`, Task 3-2, exact option words) | Agent's choice, kept: re-adding a property loses values whose option was renamed or deleted meanwhile [Intended as P-3] |
| A restored Space loses an option deleted while it sat in the Trash | `setSpaceProperty.test.ts:151` | `0134cc02d` | Agent's choice, consistent with the frozen-world rule, kept [Intended as P-3] |
| An adopted word renamed onto the key its Value Format writes keeps its key and leaves its pages | `optionOps.test.ts:583` | `e3dd70939` (MetadataV3 7B-1) | An edge rule falling out of "a rename to its own key writes nothing" |
| A sibling write withholds an own Multi-Select that would reconcile smaller, keeping the original list | `governedWrite.test.ts:155` | `3d28c836f` "feat(audit): clear seven findings" | An audit-round guard; the origin question is why a sibling write reconciles another key at all |
| Clear asks only past one Item; Remove and Delete always ask | `OptionEditor.test.tsx:146-168`, `confirmations.ts:185,214` | `5e3aee180` (10-19), which closed the MetadataV3 plan's open ruling "The Format Change's Quiet Threshold" by giving Clear the format change's past-one threshold (earlier, `745f33edb` asked past none) | Agent's resolution of a listed open ruling; every property and option confirmation counts its Items correctly, zero included, from one home the Archive's and the Trash's share [Intended as O-2]. ConfigurationPM:115 is stale against it |
| Two options or definitions whose names fold alike read as the first, and the second is silently dropped on the next option edit | `propertiesRegistry.test.ts:71`, `optionOps.test.ts:224`, PropertiesPM:140 | `9c2850b3b` (10-04) | Agent's choice, kept: a silent write-time repair of a hand-edited file [Intended as P-3] |
| Names compare case-folded Nexus-wide because Obsidian merges keys that differ only in case | `schema.test.ts:29,37`, PropertiesPM:140 | Present by `759a2dbef` (09-05) | Interop (Legibility); likely Nathan's intent |
| A checkbox reads `yes/no/on/off/y/n` in any casing, while options match exactly | `propertyValue.test.ts:494-536` | Option exactness: MetadataV3 (`9aeb29271`) | Interop for checkboxes; option exactness is a MetadataV3 decision |
| Repair Properties On Open defaults to Off | `personalization.ts:146`, `repairSweep.test.ts:110` | — | Agent's choice with no stated reason; on by default [Intended as O-3] |
| The value picker offers `+ New Option` for Select and Multi-Select, but not Status | `PropertyPicker.pane.test.tsx:277,325` | — | Agent's choice (inferred: Status needs a group); planning recommends whether Status gains it [Intended as J-8] |
| A Value Format change, an option rename, or an option removal is refused while another journal record is owed | `optionOps.test.ts:707,1425`, `handlers.test.ts:230` | I-036 guard set | Accident of the single journal slot; per-entity notes remove it [Intended as B-1] |
| A delete's record is replayed after the property is restored and leaves it alone | `handlers.test.ts:196` | — | Correct and defensive; falls out of the slot design |
| A File value in the old `{ path }` object shape reads as nothing | `propertyValue.test.ts:245` | before `820192976` | Legacy residue (09-15) |

##### Cross-Domain Notes

- `spaceSidecars`' disk scan is used by `deleteProperty.ts:74`, `governedSweep.ts:118`, `keyHolders.ts:24`, and `Assets/assetMigrate.ts:117`; I-036's footnote lists all four, at stale lines (`assetMigrate.ts` at `:162`).
- `cellMenu.test.ts:100` and `columnMenu.test.ts:44-48` disagree on whether a Link's look is per-property; the code offers it per column, so the cell menu's lack of Style may be an inconsistency rather than a rule.
