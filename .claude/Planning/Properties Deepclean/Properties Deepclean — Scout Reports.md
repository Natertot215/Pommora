### Properties Deepclean — Scout Reports

**DATE:** 10-21-2026
**HEAD:** `d0595b22d`

The nine scouts' reports as the two reconcilers left them: each finding and ledger entry tagged VERIFIED, CORRECTED, or INFERRED against the code at HEAD, removed claims listed in each report's Reconciliation Log, and cross-report overlaps under each report's Overlaps & Contradictions. *Properties Deepclean — Investigation* synthesizes them.

---

#### Scout 01 — Catalog & Types (Reconciled)

Baseline `d0595b22d` on `active`. Read-only. **Live-Nexus evidence (re-run by the reconciler):** NexusOS is the only Nexus holding property data. `~/Test`, rebuilt at `156264f2f` by `make-benchmark-nexus.mjs test`, holds an empty registry and no property data, and no `~/Benchmark-*` is on disk. NexusOS's `.nexus/properties.json` holds 15 definitions (14 listed in `order`) over 9 types (`dateTime` 3, `multiSelect` 3, `select` 3, and one each of `status`, `link`, `checkbox`, `file`, `number`, `text`). The definitions carry these fields: `id`/`key`/`label`/`type` on all 15, `icon` 10, `select_options` 6, `key_format` 3, and `status_groups`, `link_color`, `link_underline`, `checkbox_color`, `number_decimals`, `number_family` 1 each. No stored definition has a `context`, `createdTime`, or `lastEditedTime` type. Registry-read cost (the O(n²) `validateName` admission) is cold at this size. `.claude/scripts/make-benchmark-nexus.mjs:143-152` writes only current camelCase ids.

Inventory and outward-map rows were spot-checked against HEAD; rows corrected in place carry *(corrected)*.

##### Inventory

| File / Symbol | Lines | Responsibility (one line) | Callers Outside the File | Belongs Here? |
|---|---|---|---|---|
| `Core/Properties/properties.ts` | 342 | The type catalog, definition decoder, option shapes, reserved ids, refusals, and seeds | 50 exports (below) | Mixed |
| ↳ `typeIds`/`PropertyType`/`PROPERTY_TYPES`/`specOf`/`groupable`/`pickKindOf` | 10-76 | The engine type record and its derivations | 8+ files outside Properties | Yes |
| ↳ `TypeSpec` | 27 | The record's row type | **none** (exported, unused) | Unexport |
| ↳ `LEGACY_TYPE_IDS`/`propertyType` preprocess | 78-88 | Reads earlier-build type spellings | `LEGACY_TYPE_IDS` only in a test; the `propertyType` decoder in `migrateConfig.ts:58` and `Bundles/rows.ts:91` (a Trash row's type for its icon, read back as the `row.propertyType` field at `TrashFrame.tsx:66-67`) | Remove (01-02) |
| ↳ `LINK_DISPLAYS`/`LinkDisplay`/`isLinkDisplay`/`DEFAULT_LINK_DISPLAY`/`LINK_DISPLAY_LABELS` | 90-102 | Link format vocabulary | columnStyles, columnMenu, LinkCell, pasteLink, LinkEditor, linkFormatOptions | Yes (it's a definition field), but see 01-09 |
| ↳ `NUMBER_FAMILIES` | 105 | Number family list | **none** outside the file | Unexport |
| ↳ `NumberFamily`/`CURRENCY_CODES`/`DEFAULT_CURRENCY` | 106-109 | Number format vocabulary | NumberEditor, formatValue (sibling) | Yes |
| ↳ `optionAppearance`/`OptionAppearance` | 111-112 | Option appearance enum | optionModel (sibling), OptionChip, OptionEditPopup | Yes |
| ↳ `labelled` | 115-120 | Label falls back to key | optionOps (sibling only) | Yes, sibling-only |
| ↳ `SelectOption`/`StatusOption`/`StatusGroup` | 122-158 | Option decoders | siblings only (optionModel, optionOps, propertyValue) | Yes, sibling-only |
| ↳ `propertyDefinition`/`PropertyDefinition` | 160-195 | The definition decoder | propertiesRegistry (sibling), `Trash/restoreProperty.ts:37`; the type has 42 files outside | Yes |
| ↳ `propertyDraft`/`PropertyDraft` | 197-201 | The create payload | handlers (sibling); type in restoreProperty | Yes |
| ↳ `narrowLinkConfig`/`narrowNumberFormat`/`narrowFileConfig` + `LinkConfig`/`NumberConfig`/`FileConfig` | 203-241 | Channel-input narrowers for display config | handlers.ts only (sibling) | Belongs with the channel (03-07) |
| ↳ `RESERVED_PROPERTY_ID`/`STAMP_TYPE`/`isReservedPropertyId` | 243-259 | Reserved column ids | 8 files outside | Partly; see 01-04 |
| ↳ `RESERVED_NAME_PREFIX` | 261 | `$` prefix | schema.ts only | Move to schema.ts |
| ↳ `itemCount` | 263 | Generic "N Items" pluralizer | `Interface/Confirm/confirmations.ts`, governedSweep | No (01-10) |
| ↳ `KEY_REFUSAL` | 265-274 | Name-gate refusal messages | schema.ts, registryProperty.ts (siblings) + tests | Move to schema.ts |
| ↳ `groupOptions`/`optionsOf`/`optionLabels`/`SELECT_GROUP`/`optionGroupsOf`/`withOptionGroups` | 276-315 | Option-model readers | Views/Pipeline group+sort, restoreScrub, replay, Pickers | Yes; `optionGroupsOf`/`withOptionGroups`/`SELECT_GROUP`/`groupOptions` are Properties-only |
| ↳ `PickOption` | 284 | Picker option shape | Contexts/contextOptions, Pickers, FilterFrame | Picker vocabulary in the definition file (minor) |
| ↳ `defaultStatusSeed`/`defaultSelectSeed` | 317-342 | Create-time seeds | registryProperty only (+tests) | Move to registryProperty.ts |
| ↳ `byKey` | 49-50 | Generic `Map` by `.key` | *(corrected)* 3 production files outside Properties (`Contexts/contextResolve.ts:4`, `Nexus/cascade.ts`, `Trash/restoreScrub.ts`) plus siblings `assignment.ts`, `schema.ts`; the other `byKey` hits in Views and UIX are unrelated local names | Generic helper (minor) |
| `Core/Properties/schema.ts` | 112 | Name gate, definition validation, option uniqueness, and `linkKeysOf` | `keyRefusal` restoreScrub; `linkKeysOf` matrixInput, cascade; others siblings | `linkKeysOf` is a type fact, not validation (01-05) |
| `Core/Properties/keyFormat.ts` | 76 | The ten Key/Value Formats and `formatKey` | `KeyFormat`/`FormatChange` in bridge.ts, confirmations; `spellingsOf` restoreScrub | Yes |
| `Core/Properties/optionModel.ts` | 92 | Pure option-group edits (`applyOptionEdit`) and the `optionEdit` decoder | optionOps, registryProperty, handlers (siblings); `optionEdit` also matched in OptionRow/frames.css (names only) | Yes |
| `Core/Properties/propertiesRegistry.ts` | 127 | Registry read/admission, ordered defs, guarded mutation, schema-op lock | Nexus/readNexus, fileEvents, cascade, create; Trash/spend, restoreProperty | Yes; `linkDefsOf` is a type fact (01-05) |
| `Core/Properties/columnStyles.ts` | 155 | Per-view looks and date/time/weekday vocabularies, stored-style decoder, resolution, defaults | columnMenu, Settings, Bundles/browser, Views/Host, useColumns, many cells | Yes; `StoredColumnStyle` exported for tests only |
| `Core/Properties/formatValue.ts` | 303 | Date read/format, bucket labels, number format/parse/respell | Cells, Pickers, Views/Pipeline, Bandmodel, PageReaderWindow, Settings | Mostly; `formatBucketLabel`/`NUMERIC_FORMATS` are Views grouping (imports `Views/views` types); *(corrected)* `numberDivisor` is used internally + tests, and `NumberPart` (`:194`, `formatNumber`'s return type) has no reader outside the file at all |
| `Core/Properties/rowOrder.ts` | 13 | "Listed first, the rest after" ordering | registry, PropertyPanel, Views/Bands, Views/Pipeline | Generic utility; local `byKey` shadows the properties.ts name |
| `Core/Properties/Cells/PropertyTypes.tsx` | 97 | `TYPE_META` (label/icon), `CREATABLE_TYPES`, `PropertyTypeIcon`, and filter/sort/group pane targets | PropertyFrame, ArchiveView, TrashFrame, TableView, CardsView, VisibilityFrame, filterModel, SortFrame, GroupFrame, PropertyPanel, Navigation/previewRules | Split: lines 59-97 aren't type facts (01-08) |
| `Core/Properties/Cells/columnLabel.ts` | 19 | Header label for any column id; `RESERVED_LABEL` | *(corrected)* 6 production files (propertyMenuActions, CardsView, cardValueInput, useViewInteractions, VisibilityFrame, TableView); `RESERVED_LABEL` only PropertyTypes.tsx (sibling) and a test | Reserved-column facts are scattered (01-04) |
| `Core/Properties/Schema/linkFormatOptions.ts` | 8 | `LINK_FORMAT_OPTIONS` picker rows | LinkEditor, Settings/frames.ts | No — duplicates `lookOptions(LINK_DISPLAYS)` (01-09) |
| `Core/Nexus/migrateConfig.ts` | 74 | On-open respell of saved-view keys and registry type ids | Nexus/handlers.ts:44-45, adopt.ts:28,109 | Remove wholesale (01-02) |
| `Core/Contexts/contextOptions.ts` | 37 | Context column's picker options, cached per Space identity map | propertyMenuActions, PropertyPanel, useViewHost, FilterFrame | Yes |
| `Core/Properties/value.ts` `declaredType`/`columnType` (outward) | 14-31 | Column id → type, including `'title'`, stamps, Context | 15+ Views/Matrix/Table sites | Yes; it carries the `'title'`/Context threading (01-03) |

**Export Surface of `properties.ts`:** 50 names (`properties.ts`, 50 `export` lines). Unused outside the file: `TypeSpec`, `NUMBER_FAMILIES`. Test-only outside the file: `LEGACY_TYPE_IDS`. Siblings only (Properties folder), including tests: `labelled`, `SelectOption`, `StatusOption`, `StatusGroup`, `optionAppearance`, `propertyDraft`, the three `narrow*`, `RESERVED_NAME_PREFIX`, `KEY_REFUSAL`, `groupOptions`, `SELECT_GROUP`, `optionGroupsOf`, `withOptionGroups`, `defaultStatusSeed`, `defaultSelectSeed`, `NumberFamily`, `CURRENCY_CODES`, `DEFAULT_CURRENCY`, `OptionAppearance`, and `OptionPickKind` (21). Used beyond Properties: the remaining 26. **Other Files:** `numberDivisor` and `StoredColumnStyle` have no production caller outside their file, and `NumberPart` has no caller outside its file at all.

###### Where Type Facts Live (Outward Map)

Exhaustive `switch`/`Record` over `kind` or `PropertyType` breaks at compile time when a type is added; an ad-hoc `type === 'x'` doesn't.

| Site | Keyed By | Compile-Checked | Re-Decides a Spec Fact? |
|---|---|---|---|
| `properties.ts:10-23,34-47` `typeIds`, `PROPERTY_TYPES` | type | yes | — (the record) |
| `Cells/PropertyTypes.tsx:21-35` `TYPE_META` | type + `'title'` | yes | second per-type record (01-01) |
| `Views/Table/useColumns.ts:32` `WIDTHS`, `:52` `STYLE_MIN`, `:103` `DEFAULT_ALIGN` | type + `'title'` | yes / partial / yes | third–fifth per-type tables |
| `Schema/PropertyFrame.tsx:341-394` `SETTINGS` | type | yes | holds `NO_SETTINGS` rows for `context`/`createdTime`/`lastEditedTime` (`:390-393`), types a definition can't legitimately have (01-03) |
| `columnStyles.ts:133` `defaultStyleFor` | kind | yes | — |
| `Actions/columnMenu.ts:40-42` `styleMenuLabel` | `type === 'link' \|\| 'number'` | **no** | yes |
| `Actions/columnMenu.ts:65` `styleMenuItems`, `Actions/cellMenu.ts:61-86` | kind (+ `=== 'title'`) | yes | — |
| `Pickers/valueClick.ts:21-48` `valueClickIntent` | kind/origin | yes | — |
| PickTarget builders: `PropertyPanel.tsx:367-377`, `useViewHost.ts:211-234`, `CardsView.tsx:528`, `propertyMenuActions.ts:36,46,101,113`, `ValuePickPresenter.tsx:19` | `def.type === 'dateTime'/'file'/'context'/'checkbox'` | **no** | yes — five builders for one "which editor does this type open" fact (05/06) |
| `propertyValue.ts:21-35,104-144,247-269,295` | kind | yes | — (02) |
| *(corrected)* `optionOps.ts:133`, `Nexus/fileEvents.ts:528-529` | `=== 'multiSelect'` | **no** | yes — "registers unknown members" stated twice. The scout's other two sites state different facts: `propertyValue.ts:169` is the write-side keep-unclaimed-words rule, and `Nexus/configReach.ts:127-128` is whether a filter rule's operands name whole values; both read `PROPERTY_TYPES[def.type].kind`, not an ad-hoc type id |
| `schema.ts:37` `linkKeysOf` (`link \|\| text`), `propertiesRegistry.ts:67` `linkDefsOf` (`link`), `Trash/restoreScrub.ts:148` (inline `linkDefsOf`), `Trash/restoreProperty.ts:65`, `assignment.ts:93` | `=== 'link'` / `'text'` | **no** | yes (01-05) |
| `registryProperty.ts:42` `seeded` | `options` | yes | — |
| `Views/Pipeline/filter.ts:117` `evaluatorOf`, `Views/filterModel.ts:112` `KIND_OPS`, `sort.ts:81`, `reassign.ts:6` `FROM_GROUP_KEY`, `creationSeeds.ts:29`, `Host/useViewCreation.ts:33` `SEEDS_FROM_SORT`, `Settings/SortFrame.tsx:54` | kind | yes | — (07); six more per-kind tables |
| `Settings/GroupFrame.tsx:106,159,236,279,304,309`, `FilterFrame.tsx:380,408`, `SortFrame.tsx:119`, `Pipeline/group.ts:383` | `=== 'dateTime'/'checkbox'/'context'`, `kind === 'select'` | **no** | partly |
| `Cells/OptionChip.tsx:26` `optionGlyph`, `UIX/Labels/recipes.tsx:11` `optionShapeFor` | `=== 'status'/'multiSelect'` on `type: string` | **no** | yes (01-06) |
| `Pickers/PropertyValueInput.tsx:48,84,101,109`, `parseEditorValue.ts:36-42`, `PropertyPanel.tsx:325,334`, `CardsView.tsx:217,718`, `cardValueInput.ts:35`, `TableView.tsx:260`, `CardsView.tsx:494`, `PropertyPanel.tsx:539` | `def.type === 'number'/'text'/'link'/'checkbox'` | **no** | partly |
| `Matrix/matrixInput.ts:88` | origin | yes | — |

**Count:** Adding a type touches ~14 compile-checked tables/switches (2 records, 3 width/align tables, SETTINGS, defaultStyleFor, styleMenuItems, cellMenu, valueClick, decode, encode, isBlankValue, plus 6 per-kind Views tables). It also touches ~25 unchecked `=== 'x'` sites, a reader can't find them by following the compiler, and about a third of them restate something a spec field could answer. *(Approximate; the unchecked-site count is the scout's tally, not re-counted.)*

##### Findings

###### 01-01 · Two Per-Type Records Hold Type Facts, and Five More Tables Repeat the Keying — CORRECTED
- **Lens:** Type Facts Once, One Way, Less to Understand
- **Now:** `PROPERTY_TYPES` (`properties.ts:34-47`) holds kind/origin/groups/options. `TYPE_META` (`Cells/PropertyTypes.tsx:21-35`) holds label/icon keyed on the same 12 ids plus `'title'`. `WIDTHS`/`STYLE_MIN`/`DEFAULT_ALIGN` (`useColumns.ts:32,52,103`) key the same set again, and `styleMenuLabel` (`columnMenu.ts:40`), `optionShapeFor` (`UIX/Labels/recipes.tsx:11`), and `optionGlyph`'s default (`OptionChip.tsx:26`) restate per-type display facts as string comparisons. `CREATABLE_TYPES` (`PropertyTypes.tsx:44-46`) is a pure derivation of the engine record living in a `.tsx`.
- **Better:** One engine record and one renderer record, with the boundary as the only reason for two. The engine `PROPERTY_TYPES` gains `label` (a plain string, host-safe) and the engine-side facts now spelled ad hoc: a connections fact (01-05) and `registersMembers`, which replaces the two registration sites (`optionOps.ts:133`, `fileEvents.ts:528`) — not four, since `propertyValue.ts:169` and `configReach.ts:128` state other facts and already read the record's `kind`. `CREATABLE_TYPES` moves next to it. One renderer record (today's `TYPE_META`) absorbs icon, chip shape (deleting `optionShapeFor` from UIX), chip default glyph, and the style-menu label. The width/min/align tables are Table-view layout facts; folding them into a Properties record moves a Views concern into Properties, so they stay in `useColumns.ts` unless 07's per-kind view spec (07-02) takes them. **Constraint (verified):** `IconName` is `keyof typeof icons` in `UIX/Symbols/index.tsx:206`, a `.tsx`; `Testing/engineGraph.ts:13-40` counts type-only imports, so importing it into `properties.ts` fails `engineGraph.test.ts:7-9` ("reaches no renderer file") as well as the UIX allowlist at `:23-36`. That's why icons stay in the renderer record.
- **Behavior:** Preserving; the Select chip's default glyph stays `'tag'` [Intended as M-1].
- **Estimate:** *(corrected)* −10 to −25 · inferred. Folding a table into a record relocates its rows rather than deleting them; the deletions are `optionShapeFor`, `styleMenuLabel`, the `TYPE_META` declaration shell, and two `=== 'multiSelect'` sites, against a `registersMembers` field and a `label` column added.

###### 01-02 · The Legacy Type-Id Path and All of `migrateConfig.ts` Hold Shapes No Live Nexus Carries — CORRECTED
- **Lens:** Legacy Versus Interop, Always Intentional, Removal First
- **Now:** `LEGACY_TYPE_IDS` + the `propertyType` preprocess (`properties.ts:78-88`, the comment claims they "read forever"), `normalizePropertyTypes`/`renamedRegistry`/`respelled`/`field` (`migrateConfig.ts:30-38,57-74`), and the on-open calls (`Nexus/handlers.ts:44-45`). The saved-view `RENAMED` table (`migrateConfig.ts:20-23`, `card_banner: image`, `icon: table`), `renamedSidecar` reused by adoption's `stampFolder` (`Nexus/adopt.ts:28,109`), and `normalizeSavedViews` (`:47-55`) run `rmwJsonStrict` over every sidecar in `.trash` and `.nexus/archive` and every `_tiles.json` under the homepage and Contexts folders on **every open** (`migrateConfig.ts:48-54`). Grepping NexusOS's whole tree across every `*.json`, including the 93 JSON files in `.trash` (NexusOS has no `.nexus/archive`), turns up no `"type": "multi_select"|"url"|"datetime"`, no `"card_banner": "image"` (the three `card_banner` keys hold other values), and no `"icon": "table"`; `.trash` holds no property record (`"entity": "property"`). The benchmark generator writes current ids. Origin: F-221 (`31b2e8481`, 09-25, and `686ac2a08`).
- **Better:** Delete `migrateConfig.ts`, `migrateConfig.test.ts` (74), and `normalizeSavedViews.test.ts` (148), the two handler calls and their import (`handlers.ts:26,44-45`), adopt.ts's `renamedSidecar` branch (`adopt.ts:28,109-113`), `LEGACY_TYPE_IDS`, the preprocess, `properties.test.ts:44-47`, and the `PropertiesPM.md:8` clause about earlier spellings. `propertyType` stays as the plain `typeIds` enum that `propertyDefinition` and `Bundles/rows.ts:91` read. The saved-view `RENAMED` half is Views residue riding in the same file (07 Cross-Domain), removable under the same live-Nexus rule.
- **Behavior:** Preserving for every live Nexus. It also removes the open-time `rmwJsonStrict` pass over the Trash, Archive, and tile documents.
- **Estimate:** *(corrected)* about −90 production, about −315 with tests (the scout missed `normalizeSavedViews.test.ts`) · read

###### 01-03 · Context and the Two Stamps Share the Stored-Definition Enum With the Column Taxonomy — CORRECTED
- **Lens:** Fix the Origin, One Vocabulary, Clearer Boundaries
- **Now:** `typeIds` (`properties.ts:10-23`) feeds both `propertyDefinition.type` (`:164`) and the column taxonomy. Consequences:
  - (a) `normalizeRegistry` (`propertiesRegistry.ts:28-36`) admits a stored def with `type: "context" | "createdTime" | "lastEditedTime"`, since only `validateDefinition` at create refuses them (`schema.ts:65-66`). A Context def decodes to `NULL_VALUE` forever (`propertyValue.ts:142-143`), and a stamp def decodes frontmatter as a date but `valueClickIntent` makes it uneditable (`valueClick.ts:28`).
  - (b) Guards then defend against that state at `SortFrame.tsx:92`, `propertyMenuActions.ts:69`, and `PropertyFrame.tsx:390-393` (`NO_SETTINGS` rows).
  - (c) `syntheticContextDef` (`Pickers/PropertyPicker.tsx:82-87`) fabricates a def with empty `label`/`key` so Context columns ride def-typed APIs: six call sites in five files (`PropertyPanel.tsx:364,403`, `useViewHost.ts:212`, `propertyMenuActions.ts:72,96`, `FilterFrame.tsx:378`).
  - (d) Tests seed schemas with stamp-typed defs production never writes (`propertyMenuActions.test.ts:39`, `useColumnStyles.test.ts:90`, `sort.test.ts:51,56`, `propertyValue.test.ts:157,161`), and `schema.test.ts:81` pins the create-time refusal the split makes unreachable.
  - (e) `PropertiesPM.md:20-22` says Context and stamps are "never a schema definition" and "never persisted", yet the read path accepts both.
- **Better:** Context stays a property type [Intended as F-1], while Created Time and Last Modified Time leave the property types for file-derived fields beside a page's Aliases and ID [Intended as F-2], and Title is a built-in field [Intended as F-3]. `propertyDefinition.type` and `propertyDraft.type` decode the nine user types plus Context, and a `ColumnType` that adds the stamps and `'title'` is what `declaredType` returns and display tables key. `PROPERTY_TYPES` stays keyed by column type, since `specOf`, `pickKindOf` (`properties.ts:60-66`), `valueClickIntent` (`valueClick.ts:27-28`), and `fillsBlank` (`cardValueInput.ts:18-21`) still answer for stamp columns. A stored stamp type then fails decode and rides as `unadmitted`, as any other invalid def does; the stamp halves of the guards at `schema.ts:65-66`, `SortFrame.tsx:92`, `propertyMenuActions.ts:69`, and the `NO_SETTINGS` rows leave, the stamp-typed fixtures are rewritten, and `schema.test.ts:81` follows F-1's design. How a stored Context definition reads, and whether `syntheticContextDef` stays as Context's definition shape, are planning's to settle under F-1 (see Approach B).
- **Behavior:** A hand-written def with a stamp type stops appearing as an uneditable property and is kept in the file unread. No path in the app writes one and NexusOS holds none.
- **Estimate:** −10 to −30 (the stamp half; Context's share depends on F-1's design) · inferred

###### 01-04 · Reserved-Column Facts Are Spread Over Eight Places — VERIFIED
- **Lens:** One Way, Type Facts Once, Less to Understand
- **Now:** The facts for `_title`, `_created_at`, `_modified_at`, and `_location` live in: `RESERVED_PROPERTY_ID` (`properties.ts:243-248`), `STAMP_TYPE` (`:250-253`), `RESERVED_LABEL` (`Cells/columnLabel.ts:4-8`), `TYPE_META.title/createdTime/lastEditedTime` (which read `RESERVED_LABEL` back, `PropertyTypes.tsx:22,33-34`), `TITLE_TARGET`/`LOCATION_TARGET` (label `'Location'` and icon `'folder'` hand-written, `:65-74`), `STAMP_TARGETS` (`:75-77`), VisibilityFrame's `rowGlyph` (`Views/Settings/VisibilityFrame.tsx:23-28`, which falls back to `'context'` for any unknown id), and `declaredType` (`value.ts:19-21`). `'Title'` is spelled twice (`columnLabel.ts:5`, `PropertyTypes.tsx:22`).
- **Better:** One `RESERVED_COLUMNS` table keyed by reserved id carrying `{ type, label }` engine-side, with the icon on the renderer record by type. `RESERVED_LABEL`, `STAMP_TYPE`, `TITLE_TARGET`/`LOCATION_TARGET`/`STAMP_TARGETS`, and `rowGlyph` become lookups into it, and `isReservedPropertyId` reads its keys.
- **Behavior:** Preserving.
- **Estimate:** −20 · read

###### 01-05 / 01-15 · "Which Types Hold Connections" Is Stated Five Ways — CORRECTED
- **Lens:** Type Facts Once, One Way
- **Now:** `linkKeysOf` (`schema.ts:32-39`, Link + Text, plus keys the registry hasn't typed unless Pommora reserves them) sits in the validation file. `linkDefsOf` (`propertiesRegistry.ts:67-68`, Link only) sits in the registry reader. `restoreScrub.ts:148` hand-inlines `linkDefsOf` (`tree.config.registry.filter((d) => d.type === 'link')`), while `restoreProperty.ts:65` and `assignment.ts:93` test one definition's `def.type === 'link'`. The Link-only subset ("a value that can name a gone page") and the Link+Text set ("frontmatter connections") are both real, but neither is named as a type fact.
- **Better:** `restoreScrub.ts:148` calls `linkDefsOf`, and `linkKeysOf` and `linkDefsOf` sit together in one file. One spec field covers both sets (e.g. `connections: 'value'` on link and `'prose'` on text: Link-only is `'value'`, Link+Text is "any"), so a second field isn't needed. The two single-definition `def.type === 'link'` tests don't get shorter by reading a flag; converting them is optional.
- **Behavior:** Preserving.
- **Estimate:** −3 to −5 · read

###### 01-06 · Option-Chip Shape and Glyph Live in UIX and a Cell as String Comparisons, and the Select Glyph Disagrees With the Type Icon — VERIFIED
- **Lens:** Type Facts Once, Clearer Boundaries (UIX encodes the Core type id `'status'`)
- **Now:** `optionShapeFor(type: string)` (`UIX/Labels/recipes.tsx:10-13`) is called from 3 Core files (`OptionChip.tsx:50`, `GhostOptionChip.tsx:51`, `useOptionEdit.tsx:203`). `optionGlyph` (`Cells/OptionChip.tsx:21-30`) defaults Select to `'tag'` and Multi-Select to `'tags'`, while `TYPE_META.select.icon` is `'send'` (`PropertyTypes.tsx:27`). `PropertiesPM.md:76` (Select & Multi-Select) says Compact renders "the option's own icon or the property type's default", which for Select is false. `STATUS_GROUP_GLYPH` (`OptionChip.tsx:15-19`) keys on the three seed group ids, so every user-made group gets `'circle-dashed'`.
- **Better:** Chip shape and default glyph become renderer-record fields (01-01), and `optionShapeFor` leaves UIX. Select chips keep `'tag'` and `PropertiesPM.md:76` is corrected to say so [Intended as M-1]; user-made Status groups keep `'circle-dashed'` [Intended as M-2].
- **Behavior:** Preserving; the Select half is a doc fix.
- **Estimate:** −8 · read

###### 01-08 · `Cells/PropertyTypes.tsx` Holds Pane Targets, and Neither Its Folder nor Its Name Fits — CORRECTED
- **Lens:** Clearer Boundaries, Less to Understand
- **Now:** Lines 59-97 (`PaneTarget`, `TITLE_TARGET`, `LOCATION_TARGET`, `STAMP_TARGETS`, `contextPaneTargets`, `schemaTargets`, `targetOption`) are the filter/sort/group/preview target vocabulary, consumed by filterModel, SortFrame, GroupFrame, FilterFrame, PropertyPanel, and `Navigation/previewRules.ts`. They aren't type metadata. Nothing in the file is a cell. Similarly `Cells/columnLabel.ts` isn't a cell.
- **Better:** Move the targets out of `Cells/` into one module of their own. Two of the six consumers sit outside Views (`Properties/PropertyPanel.tsx`, `Navigation/previewRules.ts`), so a Views home (06-11 proposes `Views/Settings/paneTargets.ts`) gives those two a new import into Views; a Properties-root `paneTargets.ts` avoids that. Let the renderer type record live at `Properties/` root, or under `Schema/` with its only creator caller.
- **Behavior:** Preserving.
- **Estimate:** ±0 lines, −1 misplaced responsibility · read

###### 01-09 · Link Format Options Are Built Twice, and Label-to-Option Builders Are Built Three Ways — VERIFIED
- **Lens:** One Way, Less Stuff
- **Now:** `Schema/linkFormatOptions.ts:5-8` builds `LINK_DISPLAYS.map(v => ({ value, label: LINK_DISPLAY_LABELS[v] }))`, which equals `lookOptions(LINK_DISPLAYS)` (`columnStyles.ts:33-35`, since `LOOK_LABELS` spreads `LINK_DISPLAY_LABELS`, `:28`). `DATE_FORMAT_OPTIONS` (`columnStyles.ts:48-51`) is the same map a third time. The Time and Weekday label tables have no `*_OPTIONS` twin, so `DateTimeEditor.tsx:12-16` and `Settings/frames.ts:174` assemble them separately (and `columnMenu.ts:84-86` maps them a fourth way into menu rows).
- **Better:** Delete `linkFormatOptions.ts` and use `lookOptions(LINK_DISPLAYS)`. One `optionsFrom(values, labels)` builds date/time/weekday options from their label tables. (05-04 and 08-09 propose the same helper, placed in `UIX/Pickers/PickerControl`; see Overlaps.)
- **Behavior:** Preserving.
- **Estimate:** −12 · read

###### 01-10 · Misplaced Helpers, Dead Exports, and One Stale Justification in the Catalog File — CORRECTED
- **Lens:** Clearer Boundaries, Describers Get Swept, Fix the Origin
- **Now:** `itemCount` (`properties.ts:263`) is a UI pluralizer used by `Interface/Confirm/confirmations.ts` and `governedSweep.ts:60`. `KEY_REFUSAL`/`RESERVED_NAME_PREFIX` (`:261-274`) belong to `schema.ts`, their main reader; `registryProperty.ts:154` also reads `KEY_REFUSAL.held`, and it already imports `schema.ts`. `defaultStatusSeed`/`defaultSelectSeed` (`:317-342`) belong to `registryProperty.ts`. `TypeSpec` and `NUMBER_FAMILIES` are exported with no outside reader, `NumberPart` (`formatValue.ts:194`) has none either, and `numberDivisor` and `StoredColumnStyle` are exported for tests only. The `optionsOf` doc (`properties.ts:286`) and its test (`properties.test.ts:267`) justify keying on the declared type by "a type change", but no type-change operation exists (`bridge.ts:145-186`; no `setType` anywhere). The rule is right and its stated reason is a ghost.
- **Better:** Move each to its reader, keeping `itemCount` engine-side beside the refusal text that reads it (08-07), unexport the five, and rewrite the comment and test name as "keyed on the declared type, so a stale array a hand edit leaves is ignored", or drop the comment.
- **Behavior:** Preserving.
- **Estimate:** −5 (moves are line-neutral) · read

###### 01-11 · `'title'` Is Threaded as a Type by 21 Hand-Spelled Unions — VERIFIED
- **Lens:** One Vocabulary, Type Facts Once
- **Now:** `PropertyType | 'title'` appears 21 times across 11 production files (cellMenu 2, PropertyTypes 3, valueClick 1, columnStyles 1, parseEditorValue 1, properties 3, value 2, cardValueInput 1, useViewHost 1, useColumns 3, reassign 3). `specOf` returns `undefined` for it (`properties.ts:52-53`), so callers special-case it first: `cellMenu.ts:61`, `filter.ts:83`, `SortFrame.tsx:53`, `useColumns.ts:313`, `VisibilityFrame.tsx:26`, and `filterModel.ts:127` by id.
- **Better:** A named `ColumnType` (01-03) replaces the 21 unions. Then decide one way: Title gets a spec row (kind `text`, origin `stamp`-like) so `specOf` answers and the pre-checks leave, or `'title'` stops being a type and every site keys on the reserved id. The first removes more branches, and it pairs with 02-15 (Title's value read as `select`).
- **Behavior:** Preserving.
- **Estimate:** −15 to −30 · read (count), inferred (branches removed)

###### 01-12 · Date-Following Uses Two Mechanisms: Absence for Date, the `'shown'` Sentinel for Time — CORRECTED
- **Lens:** One Way
- **Now:** `columnStyle.time_format` accepts the extra stored word `'shown'` (`columnStyles.ts:80-83`), resolved to the Nexus clock (`:118`) and written by `storedPick` (`:130`). Date format follows the Nexus by being absent. Time can't use absence, because the defaults `resolveStyle` receives come from `columnDefaults` (`Views/Host/useColumnStyles.ts:23-33`), which spreads `dateDefaults(nexus.dateFormat)` with `time_format: 'none'` (`columnStyles.ts:100-104`) rather than the Nexus clock. `'shown'` therefore means "show the time, following the Nexus clock", a state the defaults can't express. Origin: `dc7780ca7` (F-584, 09-25).
- **Better:** A Date property carries its own format, which its columns follow unless a column overrides how it displays, and an unstyled date column keeps showing no time [Intended as I-2]. Where "follow the Nexus clock" lives in that shape, and whether `'shown'` keeps a job, is settled by I-2's design.
- **Behavior:** *(corrected)* Removing `'shown'` alone requires the default to flip, so every unstyled date column whose values carry a time would start showing it; there's no shape-only variant. Unstyled display stays as it is. Stored `'shown'` values would need one respell (NexusOS holds none: grep found no `"time_format": "shown"`).
- **Estimate:** set by I-2's design · inferred

###### 01-13 · `showsWeekday` Is Restated Inline in the Formatter — VERIFIED
- **Lens:** One Way
- **Now:** `columnStyles.ts:72-73` `showsWeekday` = short|full. `formatValue.ts:129` re-spells `(dateFormat === 'short' || dateFormat === 'full')`.
- **Better:** `formatPoint` calls `showsWeekday`.
- **Behavior:** Preserving.
- **Estimate:** ±0 · read

###### 01-14 · `formatBucketLabel` Is Views Grouping Code Living in Properties — CORRECTED
- **Lens:** Clearer Boundaries
- **Now:** `formatValue.ts:154-184` imports `DateGranularity`/`DateSeparator` from `Views/views` (`:4`). Its only callers are `Views/Bands/bandModel.ts` (`formatBucketLabel`) and `GroupFrame.tsx` (`NUMERIC_FORMATS`), and it has its own test file `formatBucketLabel.test.ts`.
- **Better:** Move it with `NUMERIC_FORMATS` to `Views/Pipeline/group.ts` beside `dateBucketKey` (`group.ts:152`), its inverse. *(corrected)* This removes `formatValue.ts`'s Views import, but Properties keeps five others (`assignValue.ts:6`, `pageRow.ts:6`, `removeProperty.ts:14`, `value.ts:3`, `valueContext.ts:6`; 07-15), so Properties doesn't stop importing Views.
- **Behavior:** Preserving.
- **Estimate:** ±0 · read

##### Behavior Ledger

| Status | Behavior | Where | Code Cost | Origin | Classification |
|---|---|---|---|---|---|
| VERIFIED (Sync consequence inferred) | A registry read hides every later def (by sorted id) whose label or key folds equal to an earlier one's. The hidden def stays in the file as `unadmitted` and nothing tells the user. Under Sync's per-definition merge, two devices each creating "Priority" mint different ids, and the later by sort stays invisible. | `propertiesRegistry.ts:28-36,101,112-116` | ~15 | `9c2850b3b` (10-04 fix), `85e8a9f89`/`585a6bef9` ("MetadataV3 Task 5A-2" / "Phase 5A review", 10-18) | Agent's choice. A review-round rule; two devices creating one name is a Sync rebuild input [Intended as H-1]. **Sync-Ready Shapes.** |
| VERIFIED | Context and stamp types are accepted on stored defs and show as dead or uneditable properties | `properties.ts:19-21` → `propertiesRegistry.ts:30-33` | guards at 3+ sites | F-219 put them in one record (`ee86c919b`) | Accident (01-03) |
| VERIFIED | Checkbox doesn't group. Sort-run reassign and filter-seeding still handle checkbox. | `properties.ts:37` (no `groups`), `group.ts:181`, `reassign.ts:8` | — | `ee86c919b` "Checkbox stops grouping" (F-219 Phase 1, 09-26) | **Nathan's Intent** [Intended as P-3] |
| VERIFIED | Context sort ranks nothing | `sort.ts:106-108` (`case 'context': return null`) | — | `ee86c919b` "a Context sort ranks nothing" | **Nathan's Intent** [Intended as P-3] |
| VERIFIED | Status options can't be created inline from the value picker; Select and Multi-Select can | `PropertyPicker.tsx:312` (`creates = options === 'select'`) | 1 line | `033a3d86d` era | Agent's choice (plausible, since a Status option needs a group); planning recommends whether it stays [Intended as J-8] |
| VERIFIED | Link format is set on the property and can be overridden per view column (`link_display` vs `column_styles.look`) | `properties.ts:172`, `columnStyles.ts:143-145`, `LinkCell.tsx:39` | two storage sites for one look | PropertiesPM.md Link section documents it | **Nathan's Intent:** the format on the property, display overrides per column [Intended as I-3] |
| VERIFIED | Select compact chip default glyph is `tag`, which differs from the Select type icon `send` | `OptionChip.tsx:26`, `PropertyTypes.tsx:27` | — | Predates `0cdb92cd2` (monorepo move), not traced further | **Nathan's Intent**; `PropertiesPM.md:76` is corrected [Intended as M-1] |
| VERIFIED | User-made Status groups always show `circle-dashed` in Compact | `OptionChip.tsx:15-19,29` | — | per-option editor era | **Nathan's Intent** [Intended as M-2] |
| VERIFIED | Status seeds use ids `upcoming`/`in_progress`/`done` under labels Open/Active/Done | `properties.ts:317-338` | — | pre-monorepo | Agent's choice, harmless (ids are stable keys) |
| VERIFIED | Time format follows the Nexus only through a stored `'shown'` word, and an unstyled date column hides its time | `columnStyles.ts:81,100-104,118,130` | ~6 | `dc7780ca7` F-584 | Unstyled hiding its time is **Nathan's Intent** [Intended as I-2] (01-12) |
| VERIFIED | A Number format can be written onto any property type through its channel | `handlers.ts:182-187`, `registryProperty.ts:235` | — | — | Accident (no UI path does it; 03-07) |
| VERIFIED | Every Nexus open walks the Trash, the Archive, and every tile document to respell view keys no Nexus holds | `migrateConfig.ts:47-55`, `Nexus/handlers.ts:44` | 74 lines + an open-time walk | F-221 / view-icon rename | Residue (01-02) |

##### Approaches

###### A · One Type Record per Side of the Boundary — CORRECTED
Fold `TYPE_META`, `optionShapeFor`, `optionGlyph` defaults, `styleMenuLabel`, and the six per-kind Views tables' *data* (`KIND_OPS`, `evaluatorOf`, `FROM_GROUP_KEY`, `SEEDS_FROM_SORT`, sort direction, `defaultStyleFor`) into two records. The engine `PROPERTY_TYPES` carries kind/origin/groups/options/label/connections/registersMembers/filter-ops/sort-shape/reassign/seeds. The renderer record carries icon/shape/glyph/style-label/editor. **Removes:** a few tables' declaration shells and ~10 ad-hoc comparisons, and adding a type becomes two rows plus its decode/encode/cell/editor. **Costs:** the records grow wide, and Views logic (filter evaluators, sort comparators) ends up referenced from Properties, which inverts today's direction unless the engine record holds only *data* (op lists, flags) and Views keeps the functions. The Table widths/min/align stay in Views (or 07's view spec) for the same reason. **Risk:** over-centralizing. Keep functions where they run and put only facts in the rows. *(corrected)* Merged tables relocate rows rather than delete them, so the line delta is small; the gain is one place to look, not a large deletion. Overlaps 07 Approach (one per-kind view spec), which owns the Views half.

###### B · The Stamps Leave the Definition Type — CORRECTED
The definition decoder takes the nine user types plus Context [Intended as F-1], Created Time and Last Modified Time become file-derived fields [Intended as F-2], and `ColumnType` adds the stamps and title (01-03, 01-11) [Intended as F-3]; `PROPERTY_TYPES` stays keyed by column type. **Removes:** the stamp halves of the origin guards, the stamp `NO_SETTINGS` rows, the create-time stamp refusal, and stamp-typed test fixtures, and `PropertiesPM.md:20-22` is rewritten to say Context is a property type and the stamps are file-derived. Whether pickers, the panel, and menus keep `syntheticContextDef` or take a `ResolvedColumn` plus an optional def is planning's to settle under F-1. *(corrected)* The `case 'context': return NULL_VALUE` decode arm (`propertyValue.ts:142-143`) only leaves if `decodeValue` switches on a definition-side kind; while it switches on the column-keyed record's `kind`, the arm stays for exhaustiveness and becomes unreachable. **Costs:** if Context columns stop riding a fabricated def, every def-typed picker API (PropertyPicker, massAssign, propertyMenuActions, FilterFrame) widens to column+def, which touches 05/06 surfaces. **Risk:** moderate. Context's value path already runs separately (`assignValue.ts:44-53,67`, `value.ts:36,46-47`), so most of the split exists.

###### C · Delete the Migration Layer Outright — CORRECTED
01-02 alone, as a first, independent landing: `migrateConfig.ts`, `LEGACY_TYPE_IDS`, the preprocess, the on-open calls, the adopt.ts branch, both test files, and the doc sentence. **Removes:** *(corrected)* about 315 lines with tests (about 90 production), plus an open-time walk. **Costs:** none for live Nexuses. **Risk:** a Nexus outside the three named ones would read a legacy type id as an invalid def (kept unadmitted, not lost), which the settled scope accepts.

##### Cross-Domain Notes
- **02 Values:** `propertyValue.ts:29` carries a transitional "Kept while the Status tag goes" comment on the `context` value kind (02-04). *(corrected)* Only two of the four `multiSelect` sites are member registration (`optionOps.ts:133`, `fileEvents.ts:528`); `propertyValue.ts:169` is the keep-unclaimed-words write rule and `configReach.ts:128` is filter-operand wholeness.
- **03 Schema Mutations:** `schema:add` accepts a renderer-sent `id` (PropertyFrame sends `''` at `PropertyFrame.tsx:236`; `createProperty` mints on falsy, `registryProperty.ts:83`). Only Restore needs a supplied id, so the channel could drop it, and the `isReservedPropertyId`/duplicate-id checks in `validateDefinition` (`schema.ts:64,67`) then guard only the restore path.
- **03:** `mutateRegistry`'s `rebuiltOptions` (`propertiesRegistry.ts:72-82`) writes `select_options`/`status_groups` whole. This is the known Sync merge loss. 01-03's split doesn't change it.
- **05/06 UI:** five PickTarget builders decide "which editor does this type open" (`PropertyPanel.tsx:367`, `useViewHost.ts:211`, `CardsView.tsx:528`, `propertyMenuActions.ts:36-113`, `ValuePickPresenter.tsx:19`) beside `valueClickIntent`, which claims to be the one home (`valueClick.ts:1`).
- **05/06:** `groupOptions` re-applies group color inheritance on `optionGroupsOf` output (`PropertyPicker.tsx:66`, `OptionEditor.tsx:30,98`) while `optionsOf` already applies it for flat readers. That's two representations of one option's color (inferred).
- **06:** `cardValueInput.ts:35` re-tests `type === 'checkbox'` with a `schema.find` per column per row. It isn't a restatement of `fillsBlank` (`:18-21`), which also excludes stamps, so swapping it in would keep blank stamp values on Compact cards; the checkbox-blank rule belongs to 06-14.
- **07 Views:** `Views/views.ts:317-370` `legacyBucketKey` and `GroupFrame.tsx:510` read a "legacy bare key" bucket shape and should get the same live-Nexus check as 01-02 (07-06).
- **07:** `bucketKey`'s checkbox case (`group.ts:181`) is reachable only through sort-run reassign (`useViewHost.ts:203`), not grouping. Comments should say so.
- **Nexus:** `adopt.ts:104,120` `migrateContainerSidecar` is a separate migration and should get the same live-Nexus check.
- **Docs:** PropertiesPM.md:8 (legacy spellings, "twelve types") changes with 01-02 and 01-03, and the `PropertiesPM.md:76` Compact-glyph claim is corrected to the tag icon (01-06).

##### Reconciliation Log

| ID | Status | Reason | Evidence |
|---|---|---|---|
| Header | CORRECTED | NexusOS has no `.nexus/archive`; benchmark table sits at `:143-152` | `ls ~/NexusOS/.nexus`; `make-benchmark-nexus.mjs:143-152` |
| Inventory `byKey`, `columnLabel`, `NumberPart` | CORRECTED | Caller counts and test-only claim | import blocks of the listed files; `formatValue.ts:194,225` |
| Outward map, `multiSelect` row | CORRECTED | Two of four sites are registration; the others are other facts | `optionOps.ts:133`, `fileEvents.ts:528-529`, `propertyValue.ts:169`, `configReach.ts:127-128` |
| 01-01 | CORRECTED | `registersMembers` covers two sites; widths are Views layout; estimate overstated; constraint holds via `index.tsx` | `UIX/Symbols/index.tsx:206`, `engineGraph.test.ts:7-9,23-36`, `Testing/engineGraph.ts:13-40` |
| 01-02 | CORRECTED | Missed `normalizeSavedViews.test.ts` (148); counts; no `.nexus/archive` in NexusOS; NexusOS grep re-run clean | `migrateConfig.ts:20-74`, `handlers.ts:26,44-45`, `adopt.ts:28,109`, NexusOS grep |
| 01-03 | CORRECTED | `PROPERTY_TYPES` must stay keyed by column type; more fixtures; `schema.test.ts:81` | `propertiesRegistry.ts:28-36`, `schema.ts:65-66`, `valueClick.ts:27-28`, `properties.ts:60-66` |
| 01-04 | VERIFIED | — | `properties.ts:243-253`, `columnLabel.ts:4-8`, `PropertyTypes.tsx:21-77`, `VisibilityFrame.tsx:23-28`, `value.ts:19-21` |
| 01-05 | CORRECTED | One field covers both sets; single-def checks gain nothing; absorbs 01-15's restoreScrub half | `schema.ts:32-39`, `propertiesRegistry.ts:67-68`, `restoreScrub.ts:148`, `restoreProperty.ts:65`, `assignment.ts:93` |
| 01-06 | VERIFIED | — | `recipes.tsx:10-13`, `OptionChip.tsx:15-30`, `PropertyTypes.tsx:27`, `PropertiesPM.md:76` |
| 01-07 | REMOVED | Merged into 03-07, the stronger statement of the same five `defEditOp` channels; its "nothing checks the config matches the type" claim holds there | `handlers.ts:137-150,182-193`, `bridge.ts:155-171`, `registryProperty.ts:235` |
| 01-08 | CORRECTED | Two consumers sit outside Views, so the target home matters | `git grep` for `PaneTarget`/`schemaTargets`/`contextPaneTargets` |
| 01-09 | VERIFIED | — | `linkFormatOptions.ts:5-8`, `columnStyles.ts:23-51`, `DateTimeEditor.tsx:12-16`, `Settings/frames.ts:174` |
| 01-10 | CORRECTED | `KEY_REFUSAL.held` read in `registryProperty.ts:154`; `NumberPart` unused, not test-only; `itemCount` also in governedSweep | `registryProperty.ts:154`, `formatValue.ts:194`, `governedSweep.ts:60` |
| 01-11 | VERIFIED | Count 21 across 11 files confirmed | `git grep -c "PropertyType \| 'title'"` |
| 01-12 | CORRECTED | No shape-only variant; removing `'shown'` flips the default | `columnStyles.ts:100-104,118,130`, `useColumnStyles.ts:23-33` |
| 01-13 | VERIFIED | — | `columnStyles.ts:72-73`, `formatValue.ts:129` |
| 01-14 | CORRECTED | Properties keeps five other Views imports | `assignValue.ts:6`, `pageRow.ts:6`, `removeProperty.ts:14`, `value.ts:3`, `valueContext.ts:6` |
| 01-15 | REMOVED | restoreScrub half merged into 01-05; cardValueInput half isn't `fillsBlank`'s rule (it excludes stamps too) and belongs to 06-14 | `cardValueInput.ts:18-21,35` |
| Ledger (12 rows) | VERIFIED | Origins and sites confirmed | as cited per row |
| Approach A | CORRECTED | Estimate; widths stay in Views | as 01-01 |
| Approach B | CORRECTED | Record stays column-keyed; `case 'context'` decode stays | `propertyValue.ts:142-143`, `valueClick.ts:27-28` |
| Approach C | CORRECTED | Line count | as 01-02 |

##### Overlaps & Contradictions

**Overlaps (same subject, other reports):**
- 01-01 ↔ 06-09, 06-11 (`TYPE_META` into the type spec, `optionShapeFor` out of UIX), 07-02 and 07's Approach (one per-kind view spec holding the Views tables), 08 Cross-Domain (two type tables).
- 01-02 ↔ 08-03 and 09-01 (the same legacy type-id chain), 09-12 (legacy-vocabulary tests), 07 Cross-Domain and 08 Cross-Domain (the saved-view `RENAMED` half as Views residue).
- 01-03 ↔ 05-03 (registry admission doesn't refuse reserved ids either — the same `normalizeRegistry` gap), 06-04 and 06 Cross-Domain (`syntheticContextDef` into a pure pick model).
- 01-04 ↔ 06-11 (`columnLabel` and `RESERVED_LABEL` aren't cells).
- 01-05 ↔ 09 Test Inventory (`schema.test.ts` pins `linkKeysOf`).
- 01-06 ↔ 06-09 (chip rendering re-decided per surface), 05 Cross-Domain (`optionGlyph` scans `status_groups` per compact chip).
- 01-07 ↔ 03-07 (merged there), 05 Approach 2, 09 Issues (I-032).
- 01-08 ↔ 06-11, 08-11 (pane targets out of `Cells/`).
- 01-09 ↔ 05-04, 08-09 (label-to-option builders; `linkFormatOptions.ts`).
- 01-10 ↔ 08-07 (engine files carrying interface copy, `itemCount`), 09-09 (unused exports).
- 01-11 ↔ 02-15 and 07-13 (Title as a type and as a `select` value).
- 01-12 ↔ 08-10 (the Nexus date form and clock read two ways), 08 ledger L6 (Trash/Archive date styles).
- 01-14 ↔ 07-15 (Properties imports Views), 07 Inventory (`formatBucketLabel`).
- 01 ledger (fold-equal definitions hidden) ↔ 08-01 (cross-device fragment definition); 03's refusal catalog covers only write-time `validateName`, so there's no conflict.

**Contradictions:**
- **01-14 vs 07-15:** 07-15 proposes moving `formatBucketLabel` to `Views/Bands/bandModel.ts` (its only caller), 01-14 to `Views/Pipeline/group.ts` beside `dateBucketKey`. Both are Views homes and either removes the Properties→Views import; `NUMERIC_FORMATS` is read by `GroupFrame.tsx`, not `bandModel.ts`, which favors the shared Pipeline module. Not settled here (07 is Reconciler B's).
- **01-08 vs 06-11:** 06-11 puts the pane targets in `Views/Settings/paneTargets.ts`; two of six consumers (`PropertyPanel.tsx`, `previewRules.ts`) are outside Views. Flagged for the synthesis; either home works, the Views one adds two imports.
- **01-09 vs 05-04 / 08-09:** same fix, different helper names (`optionsFrom`, `labelled`, `pickerOptions`). `labelled` already names the key-as-label decoder at `properties.ts:115`, so 05-04's name collides; one name should be picked.
- **09-01 vs 01-02:** 09-01 infers `normalizeSavedViews` doesn't need `field`; confirmed (`field` is read only by `renamedRegistry`, `migrateConfig.ts:63,66`), so no conflict.
- **06 Inventory vs this report:** 06 counts `columnLabel` callers as 7 files including `PropertyTypes.tsx`; `PropertyTypes.tsx` imports only `RESERVED_LABEL` from that file, so it's 6 production callers.


---

#### Scout 02 — Values: Read, Encode, Write (Reconciled)

Baseline `d0595b22d`. "Read" = I read the code; "inferred" = reasoned from what I read, not run. One read-only node probe ran against the repo's `yaml` dependency and touched nothing (see 02-02); the reconciler re-ran it with the same result.

Inventory and write-path rows were checked against HEAD; rows corrected in place carry *(corrected)*.

##### Inventory

| File / Symbol | Lines | Responsibility (one line) | Callers Outside the File | Belongs Here? |
|---|---|---|---|---|
| `Core/Properties/propertyValue.ts` | 326 | Grab bag: the value union plus nine other jobs, listed below | ~60 files | Split (02-04) |
| · `propertyValue` (zod), `PropertyValue`, `ValueKind`, `NULL_VALUE` | 20-40 | The in-memory value union and the door's validator | `Nexus/mutateRequest.ts:60,90`, many | Yes |
| · `decodeValue` | 104-145 | File raw → `PropertyValue` by the definition's kind | `value.ts:57` (+ tests). Inside the file: `reconcilePropertyValue` | Yes |
| · `encodeValue` / `valueToWrite` | 247-281 | `PropertyValue` → raw. `valueToWrite` wraps it in a `Result` for blank and for a "refusal" | `contextResolve.ts:113`, `assignment.ts:58` / `Nexus/page.ts:28`, `setProperty.ts:43`, `Testing/propertyWrites.ts` | Yes, minus the dead refusal *(corrected)* (02-01) |
| · `wordsOf`, `findOption`, `registeredOption`, `keyOf` | 49-81 | Per-definition option label↔key cache | `findOption`: Cells, optionOps, bandModel, GroupFrame, OptionOrderList | Yes (the codec needs it) |
| · `CHECKBOX_WORDS`, `checkboxWord`, `checkedSpelling` | 83-102, 221-229 | Checkbox word vocabulary and its spelling on write | `checkboxWord`: `Views/reassign.ts:8`, `Views/Pipeline/filter.ts`, `Views/Settings/FilterFrame.tsx` | Yes (type fact, Scout 01) |
| · `unregisteredMembers` | 147-162 | Multi-Select adoption predicate | `optionOps.ts` only | No → `optionOps.ts` (03) |
| · `keepingForeignWords` | 164-179 | Multi-Select write keeps unclaimed words | `governedWrite.ts:15` only (+ internal `applyValueAtRoot`) | Encode-side, see 02-05 |
| · `Frozen`, `frozenWorld`, `gonePageEntry`, `reconcilePropertyValue` | 181-219 | Trash/Archive restore check that a Link's page is gone | `Trash/restoreProperty.ts`, `Trash/restoreScrub.ts`, `Trash/spend.ts`, `Nexus/cascade.ts:117`, `assignment.ts`, `contextResolve.ts:112` | No → restore/reconcile module (02-04) |
| · `writtenSpelling` | 231-245 | Re-spells a raw value the way the file already spells it | `contextResolve.ts:128`, `assignment.ts:61`, `governedWrite.ts:16` | Raw-YAML concern. With reconcile (02-04) |
| · `isBlankRaw`, `isBlankValue`, `selectedValues` | 283-312 | Blank predicates, option-list projection | many | Yes |
| · `applyValueAtRoot` | 314-326 | The renderer's copy of a host value write | `assignValue.ts:56`, `Views/Host/useViewCreation.ts:54` | Renderer twin of `writtenRoot` (02-05) |
| `Core/Properties/value.ts` | 66 | `declaredType`/`columnType` (column schema type), `resolveFieldValue` (memoized per-row decode), `fileName` | ~15 files | Name wrong. `fileName` → `linkValue.ts` (02-08) |
| `Core/Properties/pageValue.ts` | 45 | Raw member-list edits (`namesValue`, `stripList`, `editList`) plus `valueEditRewrite` | `Contexts/contextCascade.ts`, `Contexts/contextWrite.ts`, `Nexus/configReach.ts`, `Trash/restoreScrub.ts`, `optionOps.ts`, `propertyValue.ts` | No → `Files/rootValues.ts`. `valueEditRewrite` → `optionOps.ts` (02-08) |
| `Core/Properties/pageRow.ts` | 67 | Builds `ViewRow` for a page or Space; `fetchPageValues`/`fetchPageRow` IPC reads | PropertyPanel, entityMenuActions, matrixInput, useContainerValues, PageReaderWindow | Mostly. Name collides (02-08) |
| `Core/Properties/assignValue.ts` | 120 | Renderer write pipeline: optimistic patch, mutate, undo capture/revert, alias remember | `useViewHost.ts:187`, `PropertyPanel.tsx:205`, `entityMenuActions.ts:95` | Yes |
| `Core/Properties/setProperty.ts` | 83 | Host ops `setPagePropertyOp`/`setSpacePropertyOp`; `landPageValue`/`landSpaceValue` | `Nexus/mutate.ts:201-202`. `land*` used only by `Testing/propertyWrites.ts` and `Files/writePathRace.test.ts` | Yes. `land*` exports are test-only |
| `Core/Properties/governedWrite.ts` | 36 | `writtenRoot` (reconcile + land one key), `setGovernedRootKey` (single-file read/merge/write) | `contextWrite.ts:70` and its two `writtenRoot` calls in `setSpaceContext`, `setProperty.ts:22,34`, `Pages/setBanner.ts:29` | Yes, with 02-06 |
| `Core/Properties/propertyWrite.ts` | 30 | Schema-write round trip: replay, owed retry, refusal toast | `Schema/PropertyFrame.tsx:15`, `Schema/useOptionEdit.tsx:16` | No: schema writes, not value writes (03/04) |
| `Core/Properties/valueContext.ts` | 29 | Cell render context (`ValueContext`), `holderOf`, `buildValueContext` | Cells, Cards, Table, PropertyPanel, useViewHost | No: render context (06). *(corrected)* `buildValueContext` is a one-line repack (02-12) |
| `Core/Properties/valueOverride.ts` | 57 | Optimistic-override map with a global settle counter | PropertyPanel, useViewHost, useViewCreation, useContainerValues | Yes |
| `Core/Properties/parseEditorValue.ts` | 44 | Text field → `PropertyValue` for number/link/text; `editorText` | `Pickers/PropertyValueInput.tsx`, `cardValueInput.test.ts` | Type facts outside the type spec (01) |
| `Core/Contexts/contextResolve.ts` | 132 | `contextWorldOf`, `resolveContextKeys`; also `GovernedWorld`, `governedWorld`, `spaceWorldOf`, `reconcileGovernedRoot` | readNexus, pageRow, governedWrite, repairSweep, restoreScrub, contextWrite, setProperty | The governed-root half doesn't belong here (02-03) |
| `Core/Contexts/contextWrite.ts` | 204 | Context tag writes (`contextTarget`, `setPageContext`, `setSpaceContext`, `setContextOp`), `pageWorldOf`, `writeSpaceSidecar`, plus structural Context/Space creates and color/order writes | create.ts, setProperty.ts, mutate.ts | `pageWorldOf` belongs beside `governedWorld` |
| `Core/Contexts/spaceSidecar.ts` | 89 | Space sidecar keys, discovery, `spaceNodeFrom` (pulls `values`), `withoutOrderId` | readNexus, sweeps, contextWrite | Yes |
| `Core/Nexus/page.ts` | 88 | `createPage` (encodes seeds via `valueToWrite`), rename/move/body | create.ts | Yes |
| `Core/Nexus/containerFields.ts` | 74 | Container sidecar → node, incl. `resolveAssignedSchema`, `cachedIds` | readNexus/fileEvents | Third parser of `properties` (02-11) |
| `Core/Connections/linkValue.ts` | 285 | Link reading/resolving/writing. Value-relevant: `linkEntry` (unwraps unquoted `[[x]]`), `linkValueFromEdit`, `shownAlias` | many | Yes |
| `Core/Views/reassign.ts` | 44 | Group key → `PropertyValue` for a drag reassign (`FROM_GROUP_KEY` per-kind table) | useViewHost, useViewCreation, creationSeeds | Per-kind table outside the type spec (01) |
| `Core/Views/Host/useContainerValues.ts` | 103 | Renderer value store per container: load, epoch refetch, overrides, rename re-key | useViewHost, PropertyPanel, GroupFrame | Yes |
| `Core/Testing/pageValues.ts` | 29 | Test fixtures: `propsAtRoot`, `pageValues`, `valuesReply` | tests only | Yes. Third file with this name (02-08) |
| `Core/Testing/propertyWrites.ts` | 23 | `writePageValue`/`writeSpaceValue` test seeders | ~50 test call sites (63 hits in 9 test files) | *(corrected)* The page seeder takes a path production never takes; the Space seeder takes production's landing minus the op (02-07) |
| (adjacent) `Core/Views/pageValues.ts` | 17 | `pageValuesOf`: host-side `PageValues` builder (zod `pageFrontmatter.parse`) | loadValues, matrixGraph, previewRules, useViewCreation | Name collision (02-08) |

##### Write Paths — VERIFIED (two corrections in place)

The pipelines below are every route a value change takes to bytes on disk. The bottom-layer writers are `mergeFrontmatter`+`atomicWriteFile`, `SweptPage.merge`+`rewritePreservingTimes`, `rmwJsonStrict`→`writeJson`, and the sweep's own `jsonText`+`atomicWriteFile` for sidecars.

1. **Surface edit (panel, picker, table cell, card, menu, group drag, sort-run reassign):** surface → `commitValue`/`commit` → `assignValue` (`assignValue.ts:87`) → `write` → `applyValueAtRoot` (renderer patch, `propertyValue.ts:315`) + `mutate({op:'setProperty'})` → zod door (`mutateRequest.ts:90`) → `mutate.ts:198` → `setPagePropertyOp` (`setProperty.ts:61`): `mutableTarget` → `machine().lock(file)` → `readRegistry` (disk) → `valueToWrite` → *(corrected order)* `pageWorldOf` (`contextWrite.ts:75`: `liveTreeOf` + `assignedDefs`, evaluated as `landPageValue`'s argument at `setProperty.ts:78`) → `landPageValue` (`pathExists`) → `setGovernedRootKey` (`governedWrite.ts:19`): `readTextOrNull` → `splitFrontmatter` (parse 1) → `writtenRoot` (reconcile every other governed key, `keepingForeignWords`, `writtenSpelling`) → `changedKeys` → `mergeFrontmatter` (parse 2) → `atomicWriteFile`.
2. **Same edit on a Space:** `setSpacePropertyOp` (`setProperty.ts:49`) under `underContexts`. It reads `readRegistry` **before any file lock** (`:55`), then `landSpaceValue` → `liveTreeOf` → `spaceWorldOf` (whole registry) → `writeSpaceSidecar` → `rmwJsonStrict` (file lock, `atomicWrite.ts:141-147`) → a short-circuit for clearing an absent key (`setProperty.ts:34`) → `writtenRoot` → `writeJson`.
3. **Undo of an edit:** `assignValue`'s `revert` → `restore` (`assignValue.ts:60`) → renderer patch `landValue(fm, key, held)` (`:70`, **no** `keepingForeignWords`, unlike path 1) + `mutate({op:'restoreValue', held})` → same ops as 1/2, but `requestedValue` returns `held` unencoded (`setProperty.ts:44-45`). `held` still passes through `writtenRoot`'s `keepingForeignWords` and `writtenSpelling`. Context columns don't use `held`: they re-send `setContext` with the **decoded** prior ids (`assignValue.ts:67`).
4. **Mass assign:** `MassPropertyPicker` → `massPickCommits` → `TableView.tsx:368-370` `groupUndo(() => { for (…) commitValue(…) })`. That's N independent path-1 round trips: N registry reads, N `pageWorldOf`, N locks, N writes.
5. **Context tag pick:** `assignValue` → `{op:'setContext'}` → `setContextOp` (`contextWrite.ts:124`) → page: `setPageContext` (lock, `pathExists`, `pageWorldOf`, `contextTarget`, `setGovernedRootKey`), which replaces the whole list. Space: `setSpaceContext` does N far-sidecar `rmwJsonStrict`+`writtenRoot` edits, then its own.
6. **Create with seeds:** `useViewCreation` (`withSeeds` → `applyValueAtRoot`, renderer) → `createPageOp` (`create.ts:21`) → `createPage` (`page.ts:13`): `valueToWrite` per seed → `mergeFrontmatter('', …)` → `atomicWriteFile`. No world, no reconcile, no spelling. Then **a second write per Context seed** via `setPageContext` (`create.ts:48-49`), whose `contextTarget` already ran once at `create.ts:30-33`.
7. **Refill (re-assign cache restore, property restore from Trash, Restore Links On Deletion):** `refillValues` (`assignment.ts:49`) → `sweepRootsById` → `sweepGovernedRoots` (`governedSweep.ts:88`): per-file `guarded` lock → `sweepParse` (one parse) → `rewriteRaw` → `SweptPage.merge` → `rewritePreservingTimes`. The rewrite hand-rolls decode→gone-check→blank→encode→`writtenSpelling` (`assignment.ts:57-61`).
8. **Repair on open:** `runRepairSweep` (`repairSweep.ts:17`) → `sweepGovernedRoots({raw: reconcileGovernedRoot})`.
9. **Trash/Archive restore scrub:** `scrubReturning` (`restoreScrub.ts:136`) → `sweepGovernedRoots({text})` with `reconcileGovernedRoot(raw, world, frozen)`, then `mergeFrontmatter` again inside the text rewrite. Sidecars go through `rmwJsonStrict` with `reconcileGovernedRoot(…, {}, …)` (`:186`).
10. **Rename/format/option sweeps:** `valueEditRewrite` (`pageValue.ts:42`) and the rename/delete plans → `sweepGovernedRoots` (Scouts 03/04 own the plans).
11. **Banner (not a property):** `Pages/setBanner.ts:29` → `setGovernedRootKey(abs, 'banner', v)` with **no world**, so it goes through `landValue` only, after its own `readTextOrNull` existence check (`setBanner.ts:25`).
12. **Tests:** *(corrected)* `writePageValue` (`Testing/propertyWrites.ts:6-13`) → `valueToWrite` → `landPageValue(file, key, v)` with **no world and no lock**. `writeSpaceValue` (`:15-23`) → `landSpaceValue`, which does build `spaceWorldOf` and takes the sidecar lock, so it skips only `mutableTarget`, the definition lookup, and `underContexts`. ~50 call sites; the page half exercises a write production never makes (02-07).

**Where they diverge, and whether each divergence is required:**
- **World or no world (1/2/5 vs 6/11/12):** Required only for the banner, which isn't a property. Create-with-seeds goes to a fresh file, so reconcile has nothing to repair; the divergence is harmless but makes a second encoder. Tests: not required.
- **Lock inside the op or inside the writer (1 vs 2):** The page path resolves the definition inside the page lock on purpose (`setProperty.ts:67`). The Space path doesn't, and that's a race (02-09).
- **Two single-file frontmatter writers:** `setGovernedRootKey` parses twice and splits the envelope three times (`governedWrite.ts:25-34`). `SweptPage` does one parse (`pageFile.ts:254-260`). Not required. The mtime choice (`atomicWriteFile` vs `rewritePreservingTimes`) is required and stays a parameter.
- **Renderer encode vs host encode:** `applyValueAtRoot` matches `valueToWrite`+`keepingForeignWords` but not `writtenSpelling` or the sibling reconcile. The restore patch drops even `keepingForeignWords`. It decodes identically for display, so it's not user-visible, but it is a second implementation (02-05).
- **Context arm vs property arm of undo (3):** Not required. It's the unfixed half of I-063 (02-02).

**Read path:** `view:loadValues` → `loadValues` (`Views/loadValues.ts:18`) → `readPageRecord` (cached parse, `readNexus.ts:134`) → `pageValuesOf` (zod `pageFrontmatter.parse`) → renderer `useContainerValues` → `resolveFieldValue` decodes lazily per row/definition with a WeakMap memo (`value.ts:50-64`). The PropertyPanel seeds from `readPageDetail`/`fetchPageDetail` (raw `splitFrontmatter`, no `pageFrontmatter.parse`) and then swaps to the loadValues shape on the first epoch (`PropertyPanel.tsx:115-142`). That's two renderer sources of one page's frontmatter (inferred harmless: `pageFrontmatter` only coerces `ID`/`banner`). Spaces read from the tree's `node.values` (`spaceSidecar.ts:65-70`). **Read-Write Separation holds:** no decoder or loader writes, and the WeakMap memos (`wordsOf`, `resolvedByFm`, `contextWorldOf`) are caches. Two writes are triggered by reads but run as separate, explicit writes: the on-open repair sweep (gated by `repairOnOpen`, default off at `Settings/personalization.ts:146`) and Multi-Select adoption on file arrival (Scout 03).

##### Findings

###### 02-01 · The value encoder's refusal guards a state the door already makes impossible — VERIFIED
- **Lens:** Fix the Origin; ghosts don't need guards; Less Stuff.
- **Now:** `encodeValue`'s `default` arm returns `undefined` for "a value carrying a kind outside the union" (`propertyValue.ts:263-268`), so `valueToWrite` returns a `Result` with `fail('invalid-property', …has no shape for.)` (`:272-281`). Every caller then unwraps it: `page.ts:28-29`, `setProperty.ts:40-47,58,73-80`, `applyValueAtRoot`'s `written.ok ?` (`:324`), `Testing/propertyWrites.ts:11-12,21-22`. The guard came in `0733fded9` (09-06). Since `5f8d7e680` (09-25) every `setProperty`/`createPage` value is zod-validated at the door (`mutateRequest.ts:60,90`), and TS proves the switch exhaustive through the arm's `const _exhaustive: never = value` (`:265`). The only test reaching it casts a removed `'status'` kind past the door with `as unknown as PropertyValue` and goes through the no-world test seeder (`Nexus/page.test.ts:279-293`). Meanwhile a valid kind against the wrong definition type goes unguarded, because `encodeValue` switches on `value.kind`, not `def.type`. No path produces that today: there's no type-change op. It's reachable only through an outside edit to `properties.json` that changes a `type` while a write is in flight (inferred).
- **Better:** Drop the runtime refusal: `valueToWrite` returns `unknown` (`undefined` = blank, meaning the key drops). Delete the `Result` plumbing at the call sites, the `invalid-property` message, and the cast test. Keep the `never` check (the `default` arm reduced to it, or the arm removed so the function's return type checks the switch, as `isBlankValue`'s `boolean` return does). Otherwise a future kind falls through silently, since `undefined` fits `unknown`. If a kind/type mismatch is worth refusing, the door is where to do it once (`mutateRequest`), not the encoder.
- **Behavior:** Preserving.
- **Estimate:** −20 to −25 (code) and −15 (test) · read.

###### 02-02 · I-063 is half-fixed: context undo still reverts the decoded value, and a bare key comes back as `null` — VERIFIED
- **Lens:** Fix the Origin; One Way; Describers Get Swept.
- **Now:** The property arm captures raw `held` (`assignValue.ts:98-99`) and reverts it through `restoreValue`. **The context arm doesn't:** `restore` re-sends `setContext` with `prior`, the decoded Space ids (`assignValue.ts:67`, `prior` from `resolveFieldValue` at `:96`). A tag key naming a Space Pommora can't resolve (an Obsidian typo, a Space removed outside) decodes to no ids, so undo writes `[]` and the key is deleted, unresolved titles included. The forward pick already drops them, since `setPageContext` replaces the list (`contextWrite.ts:42-56,70`; the comment at `:134` admits it). **Bare key:** a bare `Status:` parses to `null`, so `held = null` → `restoreValue` (`z.unknown()` admits null, `mutateRequest.ts:92`) → `writtenRoot` → `landValue` keeps `null` (`rootValues.ts:6-11`) → `mergeInto`'s `written = modeled[key] !== undefined` (`pageFile.ts:172`) → `createNode(null)` writes `Status: null`. A read-only probe of the repo's `yaml` dependency shows `doc.set('Status', createNode(null))` prints `Status: null`, and an untouched `Status:` re-serializes as `Status:` (re-run by the reconciler). The IssuesPM footnote `[^63]` (`IssuesPM.md:1344`) cites `valueToWrite` at `Core/Nexus/page.ts:90-99`, but it lives at `propertyValue.ts:272` since `f19cb9d1b`; the same footnote's `mutate.ts:185` (now `:198-202`) and `propertyValue.ts:224` `isBlankRaw` (now `:284`) are stale too.
- **Better:** Undo puts back what the file held, recorded by the part of Pommora that writes the file, for the edited property only [Intended as E-1, E-2]. The host returns the landed `{before, after}` for the touched key, and undo puts that key back the way `undoSweep`/`keysPutBack` do (`governedSweep.ts:151-182`), which removes `held` capture, the `restoreValue` op, `requestedValue`'s switch, and the renderer's `restore` patch, and gives the context arm the same put-back. The siblings `writtenRoot` repaired on the same write stay repaired. `keysPutBack` re-lands parsed `was[k]` (`:169`), so a key-level put-back also needs a landing `null` spelled bare: in `nodeSpelledAs` (`pageFile.ts:146`), when `value === null` and the held node is a null scalar (or always), emit an empty scalar, a ~3-line origin fix. Rewrite `[^63]` in the same pass.
- **Behavior:** Changes behavior. Undo over unresolved tags keeps them; undo over a bare key leaves it bare.
- **Estimate:** about −30/+28 · read (null spelling probed).

###### 02-03 · The governed-root pipeline is owned by the Contexts file, in four pieces across three files — VERIFIED
- **Lens:** Clearer Boundaries; One Way; Less to Understand.
- **Now:** The single owner of "how a frontmatter/sidecar root is reconciled and one key landed" is spread out. `GovernedWorld`/`governedWorld`/`spaceWorldOf`/`reconcileGovernedRoot` sit in `Contexts/contextResolve.ts:42-132`, which imports the property codec (`:4-11`). `pageWorldOf` sits in `Contexts/contextWrite.ts:75-79`. `writtenRoot`/`setGovernedRootKey` sit in `Properties/governedWrite.ts`. `writeSpaceSidecar` sits in `contextWrite.ts:81`. The dependency runs Properties→Contexts→Properties (`governedWrite.ts:3` → `contextResolve.ts:5-11`). `contextResolve.ts` is otherwise about Context titles (`contextWorldOf`, `resolveContextKeys`).
- **Better:** One module, `Nexus/governedRoot.ts`, holding `GovernedWorld`, the three world builders (`governedWorld`, `pageWorldOf`, `spaceWorldOf`), `reconcileGovernedRoot`, `writtenRoot`, and the single-file writer from 02-06. `contextResolve.ts` keeps `contextWorldOf`/`resolveContextKeys`/`groupOf` (exported for the reconcile). *(reconciler)* `Core/Files` is ruled out by the module's imports (A-01). Nexus over Properties is the recommended home, a layering judgment rather than a code fact: the module composes the property codec and the Context world and is called from Properties, Contexts, Pages, and the Trash, and Nexus already hosts that kind of composer (`cascade.ts`, `liveTree.ts`).
- **Behavior:** Preserving.
- **Estimate:** ±0 lines (moves), and `governedWrite.ts` goes away · read.

###### 02-04 · `propertyValue.ts` does ten jobs. Split the pure codec from restore, spelling, and adoption — CORRECTED
- **Lens:** Less to Understand; Clearer Boundaries; One Vocabulary.
- **Now:** Besides the union and codec, the file holds: the option-word cache, checkbox vocabulary and spelling, the adoption predicate `unregisteredMembers` (only `optionOps` uses it), `keepingForeignWords`, the Trash oracle `Frozen`/`frozenWorld`/`gonePageEntry` (callers: Trash ×3, `cascade.ts:117` — which builds its own inline `{ holds }` — and `assignment.ts`), `reconcilePropertyValue` (a 4-line wrapper, `:211-219`), `writtenSpelling`, blank predicates, and the renderer's `applyValueAtRoot`. Decode→gone→blank→encode→`writtenSpelling` is hand-rolled twice: `contextResolve.ts:112-128` and `assignment.ts:57-61`. `Frozen` is two things at once. `{}` is a mode flag meaning "may shrink or blank" (`restoreScrub.ts:186`, `contextResolve.ts:120`, tests). `{holds}` is a page-existence oracle. *(corrected)* The comment at `:29` ("Kept while the Status tag goes") is stale: the Status tag is gone.
- **Better:** `propertyValue.ts` keeps the union, `decodeValue`, `encodeValue`/`valueToWrite`, option words, the checkbox reading, and the blank predicates. One `reencode(def, raw, frozen?)` (decode→gone→encode→`writtenSpelling`) replaces `reconcilePropertyValue` and both hand-rolled copies, and lives with the governed-root module (02-03) together with `writtenSpelling`/`checkedSpelling`. `Frozen`/`frozenWorld`/`gonePageEntry` move to the Trash/restore side. Make the reconcile's mode explicit (`mode: 'live' | 'restore'` plus an optional oracle) instead of the `{}` trick. `unregisteredMembers` moves to `optionOps.ts`. Rewrite or drop the `:29` comment.
- **Behavior:** Preserving.
- **Estimate:** −10 to −15 net (one shared re-encode, one wrapper gone) · read.

###### 02-05 · The renderer re-implements the host's value encode, and the restore patch differs from both — CORRECTED
- **Lens:** One Way; Type Facts Once; Fix the Origin.
- **Now:** The host lands `valueToWrite`→`keepingForeignWords`→`writtenSpelling` after a sibling reconcile (`governedWrite.ts:12-17`, with `keepingForeignWords` applied **even to a `restoreValue` `held`**, which already carries its words). The renderer runs `applyValueAtRoot` = `valueToWrite`+`keepingForeignWords`+`landValue` (`propertyValue.ts:315-326`) for edits and creation seeds (`useViewCreation.ts:54`), but bare `landValue(fm, key, held)` for undo (`assignValue.ts:70`). Display decodes the same (inferred). But `held` for a second edit before the epoch read is captured from the renderer copy (`assignValue.ts:95,99`), not the file's spelling. `keepingForeignWords` lives in the shared `writtenRoot` only because the property arm is folded into it. Context-key writes and restores pass through a no-op lookup (`world.defs.get(key)`, `governedWrite.ts:14`).
- **Better:** One pure `valueAtRoot(def, value, heldRaw)` = `keepingForeignWords(def, valueToWrite(def, value), heldRaw)`. The renderer's `applyValueAtRoot` calls it, and so does the host's `setProperty` arm — *(corrected)* inside the file rewrite, since `heldRaw` is the file's raw read under the lock (`governedWrite.ts:25-27`); that needs 02-06's `rewriteRootAt(file, raw => …)` shape. `writtenRoot` then drops its definition lookup and `keepingForeignWords` and becomes "reconcile siblings + land with spelling", the same for properties, contexts, and restores. A larger alternative is Approach C.
- **Behavior:** *(corrected)* Changes behavior in one edge: an undo no longer picks up a foreign word added outside the app between the edit and the undo.
- **Estimate:** −5 · read.

###### 02-06 · Two single-file frontmatter writers. One parses twice, and the banner borrows the property writer — CORRECTED
- **Lens:** One Way; Hot Paths Stay Cold; Clearer Boundaries.
- **Now:** `setGovernedRootKey` runs `readTextOrNull` → `splitFrontmatter` (parse) → `mergeFrontmatter` (parse again) → `splitEnvelope(existing).body` (a third envelope split) (`governedWrite.ts:25-34`). The sweep's `sweepParse` gives one parse with `merge` (`pageFile.ts:254-260`), and `rewriteRaw` (`governedSweep.ts:77-85`) is the same changed-keys-then-merge logic. `setGovernedRootKey`'s `world?` makes it two functions in one. Without a world it serves only `Pages/setBanner.ts:29` (not a property), the test seeder, and `governedWrite.test.ts`. *(corrected)* "Page not found" is decided twice on every write: a value write checks `landPageValue`'s `pathExists` (`setProperty.ts:21`) and then `setGovernedRootKey`'s throw on a `null` read (`governedWrite.ts:26`); a Context tag write checks `setPageContext`'s `pathExists` (`contextWrite.ts:65`) and the same throw; the banner checks its own `readTextOrNull` (`setBanner.ts:25`) and the same throw.
- **Better:** One `rewriteRootAt(file, rewrite: Rewrite, preserveTimes)` built on `sweepParse`+`rewriteRaw`, which returns `not-found` itself. `setGovernedRootKey` becomes `rewriteRootAt(file, raw => writtenRoot(raw, key, value, world))` with a required world. The banner passes `raw => landValue(raw, 'banner', v)`. `sweepGovernedRoots`' per-file body reuses the same function (minus the lock it already holds). `landPageValue` collapses into the op, and the callers' own existence checks leave.
- **Behavior:** Preserving. Inferred: `sweepParse` refuses an `unknown`-admission file that `setGovernedRootKey` would currently try, but `mutableTarget(['page'])` already requires a held page. A frontmatter that can't round-trip is refused either way (today `mergeInto` throws, `pageFile.ts:183-185`; `sweepParse` returns `null`), so only the refusal's wording changes.
- **Estimate:** −15 to −20 · read.

###### 02-07 · Test seeders write through a path production never takes — CORRECTED
- **Lens:** Describers Get Swept; zero production code as fixtures.
- **Now:** `writePageValue` = `valueToWrite` + `landPageValue(file, key, v)` with **no world, no lock** (`Testing/propertyWrites.ts:6-13`). That skips the sibling reconcile, `keepingForeignWords`, and `writtenSpelling`. *(corrected)* `writeSpaceValue` (`:15-23`) runs `landSpaceValue`, which builds `spaceWorldOf` and locks through `rmwJsonStrict`, so it skips only `mutableTarget`, the definition lookup, and `underContexts`. Their ~50 call sites (63 hits across 9 test files: `page.test.ts`, `optionOps.test.ts`, `removeProperty.test.ts`, `restoreProperty.test.ts`, …) seed or assert through them. `landPageValue`/`landSpaceValue` exist as exports only for them and `writePathRace.test.ts:82`. `landPageValue`'s optional `world` exists only for the page seeder.
- **Better:** Seeders either call `setPagePropertyOp`/`setSpacePropertyOp` (via `settledMutate`, `Testing/settledMutate.ts:13`) when the test means "a user wrote this", or write raw frontmatter directly when it means "the file holds this". Then `landPageValue`/`landSpaceValue` fold into their ops and lose their exports.
- **Behavior:** Preserving (tests only). Some tests may need their expectations re-read under the real spelling.
- **Estimate:** −15 production, test churn ±0 · read.

###### 02-08 · Five files named "value(s)" meaning five different things — VERIFIED
- **Lens:** One Vocabulary; Less to Understand.
- **Now:** `Properties/propertyValue.ts` (codec), `Properties/value.ts` (column type + per-row decode + `fileName`), `Properties/pageValue.ts` (raw list-member edits, nothing about pages), `Views/pageValues.ts` (host `PageValues` builder), `Testing/pageValues.ts` (fixtures). Plus `assignValue.ts` and `useContainerValues.ts`. `value.ts`'s header (`:1`) describes two axes that are its real contents. `fileName` (`value.ts:66`) is a link helper used by `Cells/Cell.tsx:11` and `Pipeline/sort.ts:12`.
- **Better:** `pageValue.ts`: `namesValue`/`stripList`/`editList`/`Matcher`/`ValueEdit` → `Files/rootValues.ts`, beside `memberKey`/`joinValues`/`editHeldList` that they build on (`rootValues.ts:14,17,24`). `valueEditRewrite` → `optionOps.ts`, its only caller (`optionOps.ts:203`). Delete the file. `value.ts` → `fieldValue.ts` (named for `resolveFieldValue`), with `fileName` → `linkValue.ts` beside `wikiTitle`. `Views/pageValues.ts` → fold `pageValuesOf` into `Views/loadValues.ts` or `viewRow.ts`.
- **Behavior:** Preserving.
- **Estimate:** −10 (a file's imports and header) · read.

###### 02-09 · A Space value write resolves its key outside any lock a rename sweep honors — INFERRED
- **Lens:** Fix the Origin; One Way.
- **Now:** `setPagePropertyOp` reads the definition inside the page lock, because "a rename sweeps under the schema lock, not this one" (`setProperty.ts:67`). `setSpacePropertyOp` reads it before `rmwJsonStrict` takes the sidecar lock (`setProperty.ts:55` vs `:33`, `atomicWrite.ts:141-147`), under `underContexts` only (`mutate.ts:198-202`), which a property rename doesn't take (it runs under `serializeSchemaOp`, `propertiesRegistry.ts:126-127`). A property rename's sweep reaches every Space sidecar under `guarded` → `machine().lock(file)` (`governedSweep.ts:67-70,117-119`), the same lock `rmwJsonStrict` takes. Inferred race: a Space write read before a rename and landed after the sweep passed writes the old key. The same op also reads the registry twice: `readRegistry` for the def, then `liveTreeOf`'s `config.registry` for the world (`:32`).
- **Better:** Read the definition inside the `rmwJsonStrict` mutate, or under the sidecar lock, mirroring the page path. Build both def and world from one registry read.
- **Behavior:** Changes behavior only in the race window (a value no longer lands under a dead key).
- **Estimate:** ±3 · inferred. **Settles it:** a reproduction that holds a Space write between its registry read and its sidecar lock while a property rename sweeps (lock placement itself is verified by reading).

###### 02-10 · Mass assign is N independent writes — INFERRED
- **Lens:** Hot Paths Stay Cold; One Write Path.
- **Now:** `TableView.tsx:368-370` loops `commitValue` per row inside `groupUndo`. Each commit is its own IPC mutate, disk `readRegistry`, `liveTreeOf`+`assignedDefs`, page lock, two-parse write (path 1), `pushUndo` closure, and override entry. With the Benchmark Nexuses that means hundreds to thousands of round trips (inferred, not measured).
- **Better:** A `setValues` op (or `setProperty` with `paths[]`) that reads the registry and world once per Collection and runs through `sweepGovernedRoots`/`sweepRootsById`, which already batch, lock per file, and report skipped files. It returns one result and one undo (and with Approach B, one text-level revert). **Stress:** this is net-positive and adds an op shape beside `setProperty`; it earns its place only if a measurement shows mass assign is a real lag source, and it should extend `setProperty` (`paths[]`) rather than add a second op name.
- **Behavior:** Preserving. Partial failure becomes one report instead of N silent refusals.
- **Estimate:** +20/−5 · inferred. **Settles it:** build a Benchmark Nexus (`make-benchmark-nexus.mjs large`) and time a mass assign across a few hundred rows.

###### 02-11 · A Collection's `properties` list has three parsers — VERIFIED
- **Lens:** Once Written, Once Defined; One Way.
- **Now:** `assignedIds` (`assignment.ts:28-31`, filters strings). `resolveAssignedSchema` (`containerFields.ts:29-39`, the same filter, then registry lookup). `assignedDefs`' disk fallback (`assignment.ts:43-44`, `assignedIds` + lookup again).
- **Better:** `resolveAssignedSchema` = `assignedIds(meta).flatMap(id => registry[id] ?? [])`, keeping its `undefined`-when-empty return. `assignedDefs` reuses that one resolver. (08-02's "hold ids as written" would remove `resolveAssignedSchema` outright; see Overlaps.)
- **Behavior:** Preserving.
- **Estimate:** −6 · read.

###### 02-12 · `buildValueContext` is a one-line repack with its own test — CORRECTED
- **Lens:** Less Stuff; Describers Get Swept.
- **Now:** `valueContext.ts:22-29` repacks its arguments into an object, renaming two `IdentityMaps` fields on the way (`identity.spaces` → `contextsById`, `identity.contexts` → `contexts`). Two callers (`PropertyPanel.tsx:168`, `useViewHost.ts:123`). `valueContext.test.ts` (42 lines) pins that it "bundles schema + the identity seam Space map".
- **Better:** Callers write the object literal. Delete the function and `valueContext.test.ts`. Both of its tests pin `buildValueContext`: `:30` checks the bundling and `:37` checks a `Map.get` miss. `ValueContext`/`holderOf` move to the cell surface (06). If 06-08 lands (a `defById` built once on the context), the builder earns a reason to exist and stays.
- **Behavior:** Preserving.
- **Estimate:** −45 (mostly test) · read.

###### 02-13 · `resolveFieldValue` and `assignValue` search the schema linearly on every call — INFERRED
- **Lens:** Hot Paths Stay Cold.
- **Now:** `schema.find((d) => d.id === propertyId)` runs before the memo on every cell render, filter row test, group bucket, and sort extract (`value.ts:48`; `filter.ts:85` closes over `id`, not the def). *(corrected)* `assignValue` does it three times per commit: `resolveFieldValue` at `:96` (`value.ts:48`), `:98`, and `write` at `:54`; `restore` adds a fourth on undo (`:68`). `declaredType` (`value.ts:23`) scans once more per filter rule. The cost is O(schema) per cell per pass. Inferred cost at Benchmark-XLarge: 50k rows × ~10-80 defs per filter clause.
- **Better:** Resolve the definition once per column, as `prepareRule`/`buildCriterion` already do for the type, and pass it in. Or key the memo on a per-schema `byId` map (a `byKey` analog exists in `properties.ts`). (07-01 and 06-08 make the same call; one fix serves all three.)
- **Behavior:** Preserving.
- **Estimate:** ±5 · inferred (not measured). **Settles it:** a profile of a filtered grouped view on a Benchmark Nexus.

###### 02-14 · A Space clear and a page clear repair siblings differently — VERIFIED
- **Lens:** One Way; Always Intentional.
- **Now:** `landSpaceValue` returns `null` (no write) when clearing a key the sidecar doesn't hold (`setProperty.ts:34`, introduced across `c3e3a0116` and reshaped in `1292e2132`). So no sibling reconcile happens. The page path always runs `writtenRoot` and writes whenever siblings changed (`governedWrite.ts:28-35`), so clearing an absent key on a page repairs siblings and re-dates the file.
- **Better:** One rule in the shared writer (02-06): a write that leaves its own key unchanged repairs nothing. (Or the reverse. Pick one.) Then remove the Space-only branch.
- **Behavior:** Changes behavior (an edge case: a "clear" that changes nothing no longer rewrites a page's siblings).
- **Estimate:** −1 · read.

###### 02-15 · Title is read as a `select` value, and two consumers route around it — CORRECTED
- **Lens:** Always Intentional; Type Facts Once.
- **Now:** `resolveFieldValue` returns `{kind:'select', value: row.title}` for `_title` (`value.ts:43`). `filter.ts:82-83` carries an apologetic comment and special-cases title onto `evaluateText`. Sort bypasses it (`sort.ts:78-79` `buildCriterion`: `extract: r => r.title`). `Cell.tsx`, `CardValue.tsx`, and `group.ts` don't name `_title` (grep), so they don't special-case it.
- **Better:** Return `{kind:'text', value}`, or keep title out of `resolveFieldValue` entirely, and drop `filter.ts`'s title branch. *(corrected)* `textValue`'s `select` arm (`filter.ts:140-141`) stays: `evaluatorOf` sends a real Select's substring operators to `evaluateText` (`filter.ts:125`), which reads Select values through that arm.
- **Behavior:** Preserving.
- **Estimate:** −3 · read.

###### 02-16 · Create-with-seeds writes the new file once per Context seed — VERIFIED
- **Lens:** One Write Path; Less Stuff.
- **Now:** `createPageOp` validates each context seed with `contextTarget` (`create.ts:30-33`), writes the page with property seeds (`page.ts:25-36`), then calls `setPageContext` once per context seed (`create.ts:48-49`). Each call re-takes the lock, re-runs `pathExists`, `pageWorldOf`, `contextTarget`, and a full write.
- **Better:** Fold the resolved `{key, value}` from the first `contextTarget` pass into `createPage`'s `modeled` and keys, so it's one write.
- **Behavior:** Preserving (one fewer watcher event per seed).
- **Estimate:** −4 · read.

###### A-01 · I-042 part (2) moves the governed-write machinery into `Core/Files`, which the machinery's own imports rule out — VERIFIED (new)
- **Lens:** Clearer Boundaries; Describers Get Swept.
- **Now:** `IssuesPM.md:1013` (I-042, Solution part 2) moves `governedSweep`/`governedWrite`/`journalSlot` into `Core/Files/`. `Core/Files` today imports only Nexus leaf utilities (`atomicWrite.ts:9`, `pageFile.ts:12-15`, `sidecar.ts:4`). `governedWrite.ts` imports the Contexts reconcile and the property codec (`governedWrite.ts:3-5`); `governedSweep.ts` imports `Nexus/liveTree`, `Nexus/treePatch`, `Nexus/heldPages`, `Index/indexSeed`, `Contexts/spaceSidecar`, and `properties.ts` (`governedSweep.ts:8-21`). Only `journalSlot.ts` (`:2-4`, Files/Platform/Paths) fits Files.
- **Better:** Re-scope I-042 part (2): `journalSlot` → `Core/Files`. The governed-root writer, the reconcile, and `governedSweep` stay out of `Core/Files`; `Nexus/governedRoot.ts` (02-03) with `governedSweep` beside it is the recommended home, a judgment over keeping them in Properties rather than something the imports decide.
- **Behavior:** Preserving.
- **Estimate:** ±0 (moves) · read.

##### Behavior Ledger

| Status | Behavior | Where | Code Cost | Origin | Classification |
|---|---|---|---|---|---|
| VERIFIED | Any value write re-encodes every *other* governed key (a scalar Select becomes a list, duplicates collapse, spelling is respelled) | `governedWrite.ts:13`; test `governedWorldWrite.test.ts:69` | ~40 (`reconcileGovernedRoot` live mode) | PropertiesPM *§Repairs*. Agent-built across MetadataV3 | **Nathan's Intent** [Intended as P-3]; undo leaves these tidy-ups in place [Intended as E-2] |
| VERIFIED | Select and Status store a one-element list, not a scalar | `encodeValue` `propertyValue.ts:249-250` (Status has kind `select`, `properties.ts:41`) | ~2 | PropertiesPM *§Select & Multi-Select* | **Nathan's Intent** [Intended as P-3]; Obsidian types the key as List |
| VERIFIED | Live reconcile never shrinks or blanks a value it can't resolve | `contextResolve.ts:119-123` | ~5 | `ad6ba7860`-era. *§Repairs* | Agent's choice, sound (data safety) |
| VERIFIED | A Select holding several registered words reads as the last one | `propertyValue.ts:121-126` (`.at(-1)`) | 1 | `9aeb29271` | Agent's choice; the most recently added valid option shows instead [Intended as P-1] |
| VERIFIED | A Select pick over `[foo, Done]` drops `foo`, while a Multi-Select keeps unclaimed words after the picked ones | `keepingForeignWords` `:164-179` (multiSelect only) | ~15 | `eea82f191`, `88ad37ea0` (final adversarial review: "keeps a member that isn't a plain word") | **Nathan's Intent** [Intended as P-2] |
| VERIFIED | Clearing a Multi-Select deletes its unclaimed words too | `keepingForeignWords` `:169` early return | 0 | PropertiesPM *§Identity & Values* | Agent's choice, documented |
| VERIFIED | A Context tag pick drops titles naming no Space, where a Multi-Select keeps unclaimed words | `contextTarget` `contextWrite.ts:42-56`, comment `:134` | — | Agent comment only | **Nathan's Intent** for the pick [Intended as P-2]; undo keeps the unresolved titles (02-02) |
| VERIFIED | A tick writes the partner of the file's unchecked word in its casing (`no`→`yes`, `OFF`→`ON`) | `checkedSpelling` `:222-229` | ~10 | `4264df480` | Agent's choice. Interop-protective |
| VERIFIED | A changed number keeps the file's quoting/format/decimals | `spelledNumber` via `writtenSpelling:234` | — | `65b1e8548`, `ac3219e97` | Agent's choice. Interop-protective |
| VERIFIED | Undo of a pick over a bare key writes `Key: null` | 02-02 | — | I-063 deferred | Accident [Intended as E-1] |
| VERIFIED | Undo of a context pick over unresolved tags deletes them | `assignValue.ts:67` | — | I-063 fix covered only the property arm (`e0a803028`) | Accident [Intended as E-1] |
| VERIFIED | A landed Link value showing a new alias gives the target page that alias, and undoing the value leaves the alias | `rememberedAlias` `assignValue.ts:75-85,106-107` | ~15 | Alias Management (`3fb2318d2` era). PropertiesPM *§Link* | Nathan-adjacent intent (doc). Undo not removing the alias is an accident [Intended as E-3] |
| VERIFIED | A unanimous Select mass pick clears every row; a mixed one sets the rest | `massAssign.ts:13-18` | ~6 | — | **Nathan's Intent** (toggle semantics) [Intended as P-3] |
| VERIFIED | The Text field edits only the first line; lines after it ride through | `parseEditorValue.ts:12-27` | ~12 | `b80a7b12a` | **Nathan's Intent** [Intended as P-3] |
| VERIFIED | A refused write leaves nothing to undo, and its override vanishes | `assignValue.ts:102-118`, `valueOverride.ts:31-40` | ~10 | — | Agent's choice, sound |
| VERIFIED | A Space clear of an absent key repairs no siblings; a page clear does | 02-14 | 1 | `c3e3a0116`, reshaped `1292e2132` | Accident |
| CORRECTED | Repair Properties On Open rewrites changed files behind the window; *(corrected)* it's off by default | `repairSweep.ts:20`; default `flag(false)` at `Settings/personalization.ts:146` | 45 | *§Repairs*; setting `repairOnOpen` | Setting-gated; on by default [Intended as O-3] |

##### Approaches

**A. The codec and the governed root, each with one home — CORRECTED.** `propertyValue.ts` keeps only the union, decode, encode, option words, checkbox reading, and blank predicates. One `Nexus/governedRoot.ts` *(`Core/Files` ruled out by imports; Nexus recommended over Properties, 02-03/A-01)* owns the worlds, `reconcileGovernedRoot`, `reencode`, `writtenSpelling`, `writtenRoot`, and a single `rewriteRootAt` built on `sweepParse`. It serves the value ops, Context tag writes, the banner, and (by reuse) `sweepGovernedRoots`. List edits go to `Files/rootValues.ts`, adoption to `optionOps.ts`, the Trash oracle to the restore side, and `value.ts` becomes `fieldValue.ts`. **Removes:** `governedWrite.ts`, `pageValue.ts`, `reconcilePropertyValue`, `landPageValue`/`landSpaceValue`, one parse per write, the no-world mode, the encode refusal (02-01/03/04/06/07/08). **Costs:** a wide import churn, roughly 40 files (inferred). **Risks:** low (moves plus pure merges), and the gates catch mismatches. Rough −60 to −80 (inferred; the sum of the findings' read estimates is about −75 to −90 before churn).

**B. One revert mechanism, built from file text — VERIFIED.** Value writes return (or the host retains, keyed by a token) the touched key's before/after, and undo for edits, mass assigns, and sweeps all go through `undoSweep`/`keysPutBack`, plus a null-spelling fix in `nodeSpelledAs`. **Removes:** `held` capture, the `restoreValue` op and its zod arm, `requestedValue`, `assignValue`'s `restore`, the renderer restore patch, and the context-arm divergence. **Costs:** a reply field on `MutateOutcome` or host-side undo state. Spaces need the sidecar arm of `keysPutBack` (it exists, `governedSweep.ts:179-181`). **Risks:** moderate. Undo puts back only the edited key [Intended as E-1, E-2], so sibling tidy-ups stay and the key-level put-back carries the null-spelling fix. Rough −30.

**C. The renderer stops encoding — INFERRED.** The override holds the `PropertyValue` per column (and Context ids) instead of a patched frontmatter, and `resolveFieldValue` prefers it. Or the host replies with the landed root and the override adopts it. **Removes:** `applyValueAtRoot`, `withSeeds`' encode (`useViewCreation.ts:45-58`), the spelling and foreign-word divergences, and `rekeyOverrides` (`useContainerValues.ts:17,48`; overrides keyed by property id don't need re-keying on a key rename). **Costs:** `resolveFieldValue`'s memo has to consult the override, and `PropertyPanel`'s "held" check (`Object.hasOwn(fm, key)`) reads the override too. **Risks:** moderate, since it touches the hot read memo. Rough −30, mostly in `useContainerValues`/`valueOverride`. **Settles it:** the memo cost needs a profile on a Benchmark Nexus.

##### Cross-Domain Notes

- **01:** `FROM_GROUP_KEY` (`Views/reassign.ts:6`), `SEEDS_FROM_SORT` (`useViewCreation.ts:33`), `parseEditorValue`/`editorText`, and `checkboxWord`'s home are per-kind facts outside `PROPERTY_TYPES`.
- **01:** The `context` member of `PropertyValue` decodes to `NULL_VALUE` (`propertyValue.ts:142-143`) and is real only on `row.contextValues` and in create seeds. It's a request shape posing as a value kind.
- **03:** `unregisteredMembers` lives in the codec but only adoption uses it. Adoption is the second read-triggered write (registry).
- **04:** *(corrected, per 04-05)* `sweepGovernedRoots` writes sidecars with its own `parseJsonObject`/`jsonText`/`atomicWriteFile` loop (`governedSweep.ts:116-137`), while value writes use `rmwJsonStrict`. Both take the same file lock and write the same bytes; they differ only in how a read miss is classed.
- **04/Trash:** In `scrubReturning`, `unlinked(raw)` (all registry links) and the reconcile's frozen gone-check (assigned links) check the same Link goneness twice, then `stripKeys` removes the result (`restoreScrub.ts:151-178`).
- **06:** There are three hand-built `ValueWriter`s (`useViewHost.ts:171`, `PropertyPanel.tsx:192`, `entityMenuActions.ts:84`). The menu's mutates a local `row`, ignores `contexts`, and publishes no override to an open view. The panel and the view hold separate overrides for one page. *(Not re-verified; 06-05 owns it.)*
- **06:** `PropertyPanel` seeds a page's frontmatter from `readPageDetail` (raw), then from `loadValues` (`pageFrontmatter.parse`). That's two shapes for one page.
- **Describers:** IssuesPM `[^63]` cites `Core/Nexus/page.ts:90-99`, `mutate.ts:185`, and `propertyValue.ts:224`, all stale. `propertyValue.ts:29`'s comment is stale. `Nexus/page.test.ts:279` pins a ghost through a cast. I-042 part (2) proposes a move the code rules out (A-01).
- **Sync-Ready Shapes:** `_space.json` is one flat object holding system keys (`id`, `$icon`, `$color`, `$order`, `banner`), Context links (`<Title>:` keys), and property values side by side (`spaceNodeFrom`, `spaceSidecar.ts:59-82`). A per-section merge has to partition it by key pattern itself. A page's frontmatter has the same mix (`ID` plus `<Title>:` plus property keys).
- **mutate.ts:81** claims a page value write "never shrinks or drops a key it can't resolve". That holds for siblings only. The written key itself (a context pick) does drop unresolved titles.

##### Reconciliation Log

| ID | Status | Reason | Evidence |
|---|---|---|---|
| Inventory | CORRECTED | Refusal pointer is 02-01; `buildValueContext` is a repack; seeder split | `propertyValue.ts:263-281`, `valueContext.ts:22-29`, `Testing/propertyWrites.ts:6-23` |
| Write Paths | CORRECTED (2) | Path 1 hop order; path 12's Space seeder has a world and lock; path 11's own existence check added | `setProperty.ts:74-79`, `setProperty.ts:26-36`, `setBanner.ts:25` |
| Read path | VERIFIED | `repairOnOpen` default added | `personalization.ts:146` |
| 02-01 | VERIFIED | Runtime `undefined` and compile-time `never` coexist in the arm, so both halves of the claim hold | `propertyValue.ts:247-281`, `mutateRequest.ts:60,90`, `page.test.ts:279-293`, `0733fded9`, `5f8d7e680` |
| 02-02 | VERIFIED | Context arm and null path confirmed; probe re-run; more stale footnote cites added | `assignValue.ts:60-72,95-99`, `pageFile.ts:146,172`, `rootValues.ts:6-11`, `IssuesPM.md:1344` |
| 02-03 | VERIFIED | `Core/Files` ruled out from imports; Nexus recommended over Properties (judgment) | `contextResolve.ts:4-132`, `governedWrite.ts:3`, `contextWrite.ts:75-86` |
| 02-04 | CORRECTED | Stale comment is `:29`; `cascade.ts` builds an inline oracle | `propertyValue.ts:29,181-219`, `cascade.ts:117`, `restoreScrub.ts:186` |
| 02-05 | CORRECTED | Behavior is a change; the host half needs 02-06's closure shape | `governedWrite.ts:12-27`, `assignValue.ts:70,95-99` |
| 02-06 | CORRECTED | Existence decided twice per write (three sites over two paths, plus the banner's) | `setProperty.ts:21`, `governedWrite.ts:26`, `contextWrite.ts:65`, `setBanner.ts:25`, `pageFile.ts:183-185,254-260` |
| 02-07 | CORRECTED | Only the page seeder lacks a world and lock | `Testing/propertyWrites.ts:6-23`, `setProperty.ts:26-36` |
| 02-08 | VERIFIED | — | `pageValue.ts:1-45`, `rootValues.ts:14-24`, `optionOps.ts:11,203`, `value.ts:66` |
| 02-09 | INFERRED | Lock placement verified; race needs reproduction | `setProperty.ts:33,55,67`, `mutate.ts:198-202`, `atomicWrite.ts:141-147`, `governedSweep.ts:67-70,117-119` |
| 02-10 | INFERRED | Unmeasured; net-positive; should extend `setProperty` rather than add an op | `TableView.tsx:368-370` |
| 02-11 | VERIFIED | — | `assignment.ts:28-45`, `containerFields.ts:29-39` |
| 02-12 | CORRECTED | Not an identity function: a repack with two renames | `valueContext.ts:22-29` |
| 02-13 | INFERRED | Cite corrected; cost unmeasured | `value.ts:23,48`, `assignValue.ts:54,68,96,98` |
| 02-14 | VERIFIED | Origin chain noted | `setProperty.ts:34`, `governedWrite.ts:28-35`, `git log -S` |
| 02-15 | CORRECTED | `textValue`'s `select` arm serves real Select substring filters | `filter.ts:82-83,125,140-141`, `value.ts:43` |
| 02-16 | VERIFIED | — | `create.ts:21-51`, `page.ts:13-36` |
| A-01 | VERIFIED (new) | I-042 part (2)'s Files move contradicts the machinery's imports | `IssuesPM.md:1013`, `governedWrite.ts:3-5`, `governedSweep.ts:8-21`, `journalSlot.ts:2-4`, `Core/Files` imports |
| Ledger (17 rows) | 16 VERIFIED, 1 CORRECTED | `repairOnOpen` default is off | as cited per row |
| Approach A | CORRECTED | Home narrowed (Files ruled out, Nexus recommended); estimate inferred | as 02-03, A-01 |
| Approach B | VERIFIED | — | `governedSweep.ts:151-182` |
| Approach C | INFERRED | Memo cost unmeasured | `useContainerValues.ts:17,48`, `useViewCreation.ts:45-58` |

##### Overlaps & Contradictions

**Overlaps (same subject, other reports):**
- 02-01 ↔ 08 Inventory (`mutateRequest.ts:60,90` wire shapes).
- 02-02 ↔ 09-13 (`restoreValue` beside `setProperty`; I-063 decided as E-1), 09 Issues Status (I-063), 08 Cross-Domain (`setProperty` and `restoreValue` as two encodings), 06 Cross-Domain (`ValueWriter`'s `rowOf`/`apply` exist for undo; settle I-063 before 06-05).
- 02-03 ↔ 04-14 (where the shared engine, slot, and governed-root writer live), 08-11, 08 Cross-Domain (04), 09 Issues Status (I-042).
- 02-04 ↔ 04-11 (`frozenWorld(linkWorld(...))` built three times; do it alongside the `Frozen` move), 03-14 (`refillValues` hand-rolls the re-encode).
- 02-05 ↔ 07-14 (`withSeeds` copies `assignValue`'s Context-vs-property split).
- 02-06 ↔ 04-05 (the sweep's sidecar arm folds into the same engine).
- 02-07 ↔ 09-02 (the same seeder; 09 proposes `settledMutate`, matching this Better), 09-03.
- 02-08 ↔ 08 Engine/Interface Split (seven value-named files).
- 02-09 ↔ 03-04 and 04-02/04 A-01 (value writes resolving the definition outside the lock a sweep honors; A-01 is the page-side twin for deletes).
- 02-09's double registry read ↔ 08-05 (every value write re-reads and re-validates the registry from disk), 08 Inventory (`create.ts` reads the registry while a tree is in hand).
- 02-10 ↔ 06-04 (the pick rule written for one row and for N rows).
- 02-11 ↔ 03-14, 04-10, 08-13 (one schema-a-holder-carries resolver), 08-02 (hold ids as written, which removes `resolveAssignedSchema`).
- 02-12 ↔ 06-08 (put `defById` on `ValueContext`, built once in `buildValueContext`).
- 02-13 ↔ 07-01, 06-08 (the per-cell `schema.find`).
- 02-15 ↔ 01-11, 07-13 (Title as a `select` value), 07-04 (`textValue` and `sortText` as two text projections).
- Write path 8 ↔ 04-10 (`runRepairSweep` hand-rolls `pageWorldOf`). Write paths 9-10 ↔ 04-05, 03-06/04-09 (sidecar scans and holder reads per sweep).
- Sync-Ready Shapes note ↔ 08 Sync Shapes (`_space.json` merges per root key).

**Contradictions:**
- **02-03 vs 04-14 / I-042 part (2) / 09 Issues Status — `Core/Files` half settled from code.** 04-14 and I-042 move `governedWrite`/`governedSweep`/`journalSlot` into `Core/Files`; 02-03 proposed Properties or Nexus. `Core/Files` imports nothing above Nexus leaf utilities, while `governedWrite.ts:3-5` imports the Contexts reconcile and property codec and `governedSweep.ts:8-21` imports the Nexus tree, the Index, and Contexts. Only `journalSlot.ts:2-4` fits Files. Settled from code: `journalSlot` → `Core/Files`, and the two writers stay out of it. Recommended, not code-settled: the governed-root module and `governedSweep` → `Core/Nexus` rather than staying in Properties (A-01). 04-14's Better and 09's Issues Status carry this narrowing.
- **02-12 vs 06-08:** 02-12 deletes `buildValueContext`; 06-08 gives it a job (`defById` built once). If 06-08 lands, the builder stays; 02-12 is conditional on 06-08 being rejected.
- **02-15 vs 07-04:** 07-04 replaces `textValue` and `sortText` with one `shownText`; 02-15's original "drop the `select` arm" would have broken Select substring filtering (`filter.ts:125`), so any merged projection keeps a `select` arm.
- **02-07 vs 09-02:** no conflict; 09-02 describes the Space seeder as skipping `mutableTarget`, which matches the corrected 02-07.


---

#### Scout 03 — Schema Mutations (Reconciled)

Baseline `d0595b22d` (`active`). Every citation is `path:line (symbol)`. **[read]** means read in the code; **[inferred]** means reasoned from the code without running anything. Reconciler A re-opened every cited site at HEAD; statuses sit on each heading, catalog row, and ledger entry. 03 and 04 describe one machinery, so their duplicates are merged here or there with both IDs kept (see *§Reconciliation Log*).

**F-042 Is I-036:** the "F-042" the Phase 7A/9 commit subjects cite (`cf4dee4e6`, `f8aa48665`) is the old id for today's **I-036**. The issues index moved from F to I in `fea03ca3b`. Its claim now sits in `.claude/IssuesPM.md:755` (I-036 *Solution*). Today's I-042 covers the host/window file taxonomy.

**Live Nexus (reconciler probe):** NexusOS holds no `property_cache` block in any sidecar (7 Collections), no property Trash record, and no `.nexus/property-cascade.json`. `~/Test`, rebuilt at `156264f2f` by `make-benchmark-nexus.mjs test`, holds an empty registry and no property data, and no `~/Benchmark-*` is on disk.

##### Inventory

| File / Symbol | Lines | Responsibility (One Line) | Callers Outside the File | Belongs Here? |
|---|---|---|---|---|
| `Core/Properties/registryProperty.ts` | 267 | Registry-level create, rename, Key Format, def edit, removal, and nexus order | — | Mostly; see the rows below |
| ↳ `createProperty` | 72-102 | Mints a def: label step-aside (`freeLabel`), option seed, delete-record consumption | `handlers.ts:158` (**unlocked**), `Trash/restoreProperty.ts:40` | Yes; only the lock wrapping is inconsistent (03-04) |
| ↳ `renameProperty` / `setKeyFormat` → `rekeyProperty` | 171-220 | Journaled rekey: plan → journal → commit → sweep → clear | `handlers.ts:173-174` | Yes |
| ↳ `keyFormatHolders`, `rekeyPlan`, `bothKeyHolders`, `renamePlan` | 106-168 | Plan and dry-run count for a rekey | `handlers.ts:204` | Yes |
| ↳ `renameSweep` | 118-121 | The rekey sweep | `replaySchemaCascade.ts:49` only (replay-only export) | Yes |
| ↳ `editProperty` | 223-242 | Non-identity def-field patch (locked) | `handlers.ts:149` | Yes |
| ↳ `removeFromRegistry` | 244-254 | Drops a def (unlocked) | `deleteProperty.ts:159`, `handlers.ts:162` (`schema:add` rollback) | Yes |
| ↳ `reorderRegistry` | 256-267 | Nexus-wide display order (unlocked) | `handlers.ts:172` | Yes |
| ↳ `PropertyRename` (type) | 123 | Rename reply | `bridge.ts`, `PropertyFrame.tsx` (type-only) | Yes |
| `Core/Properties/optionOps.ts` | 386 | Every option mutation, adoption of held Multi-Select words, and the option cascade | — | Mostly |
| ↳ `editOption` | 88-110 | Registry-only option edits (add, recolor, reorder, relabel group), owed-key check | `handlers.ts:194` | Yes |
| ↳ `registerHeldOptions` | 113-166 | Adopts unknown Multi-Select members (open, settle) | `Nexus/handlers.ts:114`, `Nexus/settle.ts:163` | Arguably Values (02); stays near option writes |
| ↳ `renameOption` / `setValueFormat` → `rekeyOptions` | 236-325 | Journaled option rekey, registry-first | `handlers.ts:195-196` | Yes |
| ↳ `removeOption` | 367-386 | Journaled option strip, registry-last | `handlers.ts:197` | Yes |
| ↳ `clearOption` | 340-354 | Unjournaled value strip, option kept | `handlers.ts:198` | Yes |
| ↳ `optionHolders`, `valueFormatHolders` | 327-365 | Dry-run counts | `handlers.ts:202,206` | Yes |
| ↳ `optionCascade`, `dropOptionFromDef` | 168-234 | Files → caches → config pass; def drop (unlocked) | `replaySchemaCascade.ts:73,82,87` only (replay-only exports) | Yes |
| `Core/Properties/assignment.ts` | 162 | Assignment reads and writes, plus the refill-by-id helper | — | Mixed |
| ↳ `assignedIds` | 28-31 | Reads a sidecar's `properties` | `removeProperty.ts`, `deleteProperty.ts` (siblings only; `PropertyFrame.tsx:203` is a local variable of the same name) | Yes |
| ↳ `assignedDefs` | 33-46 | A Collection's schema from the held tree, falling back to disk | `Contexts/contextWrite.ts:78`, `repairSweep.ts:31`, `Trash/restoreScrub.ts:145` | **No.** It's schema resolution beside `containerSchema` (`Nexus/treePatch.ts:128`), not a mutation |
| ↳ `refillValues` | 49-63 | Lands values by ID where the root reads blank | `Trash/restoreProperty.ts:71`, `Trash/spend.ts:237` | **No.** It's a values primitive, beside `sweepRootsById` (`governedSweep.ts:185`) or 02's write module |
| ↳ `restoreCachedValues` | 65-107 | Re-assign refill from `property_cache` | — | Yes |
| ↳ `assignInner` / `assignProperty` / `reorderAssignment` | 110-162 | Assign (+ refill), reorder | `handlers.ts:160,168,170`; `assignInner` also called from `restoreProperty.ts:48` | Yes |
| `Core/Properties/removeProperty.ts` | 62 | Per-Collection Remove: cache + unassign + view clear, then config reach, then page strip (no journal) | `handlers.ts:169` only | Yes; the name collides with "remove" meaning a global op elsewhere (03-10) |
| `Core/Properties/deleteProperty.ts` | 172 | Global delete: snapshot bundle → journal → strip → unassign and purge every cache → config → registry | — | Yes |
| ↳ `writePropertyBundle` | 42-49 | Mints a `.trash` bundle | **Tests only** (4 files) | Should stop being exported |
| ↳ `snapshot` | 51-94 | Builds the Trash record, including the write-only `partial` flag (03-09) | — | Yes |
| ↳ `propertyHolders` | 98-103 | Dry-run count | `handlers.ts:201` | Yes |
| ↳ `deletePlan`, `stripAndRemove` | 136-161 | Plan and tail shared with the replay | `replaySchemaCascade.ts:58-63` only (replay-only exports) | Yes |
| ↳ `PropertyDeletion` (type) | 96 | Delete reply | `bridge.ts` (type-only) | Yes |
| `Core/Properties/propertyCache.ts` | 68 | Reads and writes `property_cache` blocks; edits caches across Collections | `Nexus/cascade.ts:274` (`editCaches`) | Yes; planning may give the stash a better home [Intended as C-2] |
| `Core/Properties/keyHolders.ts` | 66 | Files holding a key confirmed from disk (`confirmedKeyHolders`); values filed by ID (`keyedHolders`) | `registryProperty.ts:126-128` (sole caller of `confirmedKeyHolders`); `removeProperty.ts`, `deleteProperty.ts` | Two readers of one fact (03-06); I-042 moves the file to `Core/Index/` |
| ↳ `KeyedHolders` (type) | 31-35 | — | `deleteProperty.ts` (type-only, sibling) | — |
| `Core/Properties/handlers.ts` | 209 | 20 property and schema IPC handlers, their narrowers, and 3 reply shapes | `Contract` wiring | Yes; the channel count is the issue (03-07) |
| `Core/Contract/bridge.ts:131-189` | ~58 | 20 channel declarations | — | Yes |
| `Core/Interface/Confirm/confirmations.ts:177-228` | 52 | `askHolding` + 4 counted confirmations | `Schema/PropertyFrame.tsx:250,294`, `Schema/useOptionEdit.tsx:111,115` | Yes |
| `Core/Trash/restoreProperty.ts` | 78 | Property restore: create → assign → caches → refill | `Trash/spend.ts:103` | Yes |
| `Core/Trash/holdings.ts` | 86 | Link values the Trash parks or refills (`parkLinks`, `refillTrashed`) | `assignment.ts:100`, `spend.ts:86,108,244` | Yes, but it's Link/Trash work, not schema; the file name says nothing of Links (03-10) |
| `Core/Properties/propertyWrite.ts` | 30 | Renderer round trip: owed → Try Again, `retryOwed`, `warnOwed` | `PropertyFrame.tsx`, `useOptionEdit.tsx` | Yes (05's surface) |

**Test Mass:** this domain carries about 5,900 test lines (5,928 across the 15 files below, read by `wc -l`) against about 1,600 production lines:

| Test File | Lines |
|---|---|
| `optionOps.test.ts` | 1,521 (21 `describe`, 95 `it`) |
| `replaySchemaCascade.test.ts` | 713 |
| `registryProperty.test.ts` | 626 |
| `confirmations.test.ts` | 437 |
| `deleteProperty.test.ts` | 430 |
| `handlers.test.ts` | 410 |
| `removeProperty.test.ts` | 407 |
| `journalWiring.test.ts` | 372 |
| `keyHolders.test.ts` | 312 |
| `restoreValue.test.ts` | 193 |
| `assignment.test.ts` | 168 |
| `renameSweep.test.ts` | 132 |
| `propertyJournal.test.ts` | 102 |
| `cascadeRace.test.ts` | 85 |

The scout read the `describe` and `it` names only, not the bodies of `optionOps.test.ts` or `handlers.test.ts`. So any collapse claim below is **[inferred]**.

##### Refusal & Guard Catalog

| Status | Guard | Where | State That Produces It | Reachable? | Folds Into |
|---|---|---|---|---|---|
| VERIFIED | Rename, Key Format, or delete runs **unjournaled** when the slot holds another record (the `writeSchemaJournal` boolean is discarded) | `registryProperty.ts:183`, `deleteProperty.ts:123` | Any property's cascade still owed, or an unreadable slot (`journalSlot.ts:36`) | Yes, after any skipped file | Per-property record (03-01). Nothing is left to guard |
| VERIFIED | Option rename or Value Format change refused, `OWED` | `optionOps.ts:242` (`rekeyOptions`) | **Any** property's record held, or the slot unreadable | Yes; also shows the misleading "earlier change" copy when the slot is unreadable (`journalSlot.ts:36`) | Per-property: wait only on its own record |
| VERIFIED | Option Remove refused, `OWED` | `optionOps.ts:377` | Same | Yes; the confirmation already asked (`confirmations.ts:196`) | Same |
| VERIFIED | Clear waits on its own property's option record | `optionOps.ts:346-348` | Same property's option-rename or option-remove owed | Yes | Rule clause 1 ("an op waits on its property's record") |
| VERIFIED | Option edit refused when it re-takes an owed old key | `optionOps.ts:79-84` (`owedKeys`), `:103` | Same property's option-rename owed | Yes | Rule clause 2 ("owed old keys count as held"). Clause 1 must **not** apply here, or a recolor would wait (03-01) |
| VERIFIED | Adoption skips an owed rename's old keys | `optionOps.ts:150-151` | Same | Yes | Clause 2 |
| VERIFIED | Create steps aside from an owed rename's old key | `registryProperty.ts:77-81` (`freeLabel` with `owed`) | Any rename owed | Yes | Clause 2 |
| VERIFIED | Create consumes a journaled delete whose key or id it wears | `registryProperty.ts:94-100` | Delete owed, then a same-key create or a restore | Yes | By key: a create on an owed delete's key is refused with the general unfinished-change message, and its Try Again re-runs the cleanup [Intended as B-4]. By id (restore): the replay's `crashed` arm needs it today (04-02); under list-first commits it leaves too [Intended as B-2] |
| VERIFIED | Rename refused when a live file holds both keys (`KEY_REFUSAL.held`) | `registryProperty.ts:152-154`, `keyHolders.ts:14-29` | An Obsidian or hand-edited page holding both | Yes. Archived files are excluded by design (Archive C-4), so they lose the old value under `prefer-new` | Keep |
| VERIFIED | Name or key case-fold collision (`validateName`) | `registryProperty.ts:149`, re-run at `:190` | A taken label or key; the second check covers a registry write landing between plan and commit | Yes (hand edits, Sync arrivals, the unlocked `schema:add`) | Keep both until the lock rule (03-04) and the external-writer question settle |
| INFERRED | `CROSSED`: one option's new key is another's old key | `optionOps.ts:47-50`, `:305-307` | A Value Format change under hand-edited or legacy keys | Rare; reproduction would settle it | Keep; it guards replay idempotence |
| VERIFIED | Two options would share a key | `optionOps.ts:297-300` | Format collapses two labels | Yes | Keep |
| VERIFIED | `NO_OPTION`, `NO_GROUP`, blank group label, `NO_OPTIONS` | `optionOps.ts:43-76` | Stale renderer, wrong type | Stale-renderer only | Keep (boundary) |
| VERIFIED | Remove no-ops when not assigned or the def is missing | `removeProperty.ts:33,36` | Stale renderer, **or a second Remove after a partial one** | Yes | That second state makes Remove non-retriable (03-03) |
| VERIFIED | Remove halts when its strip skipped | `optionCascade` `optionOps.ts:229` (`labels?.[1] === null`) | Option Remove skip | Yes | Keep the behavior; encode it as a union (03-11) |
| VERIFIED | Restore refused, `'exists'` | `restoreProperty.ts:35-36` | Id already in the registry | Yes | **Duplicate** of `validateDefinition`'s id check (`schema.ts:67-68`) (03-08) |
| VERIFIED | Restore: "could not be read back" | `restoreProperty.ts:42-43` | Def vanishing between commit and re-read inside the schema lock | No in-app path; only an outside writer to `properties.json` in that window | Ghost guard (03-08) |
| VERIFIED | Reorder refused: "Property not assigned." | `assignment.ts:136` | Stale renderer | Stale-only | Keep |
| VERIFIED | `schema:add` rollback (`removeFromRegistry` on assign failure, unlocked) | `handlers.ts:160-163` | Sidecar write failed | Yes | One locked hold (03-04) |
| VERIFIED | Replay `answered` branches | `replaySchemaCascade.ts:54` (delete), `:78` (option-remove) | A renderer-held record that the slot never took or no longer holds | Yes, because of the unjournaled path | Per-property record (03-01) |
| VERIFIED | `journalRecord` narrower on `property:replay` | `handlers.ts:105-109` | The renderer sends a record back | Yes | Per-property record: replay by id (03-01) |
| CORRECTED | Confirmation thresholds: delete and option Remove always ask (even at 0 holders); Clear and format change ask past one; Remove never asks; Confirm Before Deletion governs none of them | `confirmations.ts:177-228` (`askHolding`'s `asksPastOne`) | — | — | Behavior Ledger L-04; counting and wording move to one shared home [Intended as O-2] |

##### Findings

###### 03-01 / 04-01 / 04-03 · One Global Journal Slot Forces Seven Hand-Placed Guards and Two Contradictory Journal Shapes — CORRECTED
- **Lens:** Fix the Origin, One Way, One Write Path, Behavior Is a Decision
- **Now:**
  - The schema journal is one Nexus-wide record (`propertyJournal.ts:42`, `journalSlot.ts:33-41`). A write against a different held record, or against an unreadable slot, returns `false` (`journalSlot.ts:36-37`).
  - Three policies meet that `false`. `rekeyProperty` (`registryProperty.ts:183`) and `deleteInner` (`deleteProperty.ts:123`) discard it and proceed with no crash recovery. `rekeyOptions` (`optionOps.ts:242`) and `removeOption` (`:377`) refuse with `OWED`. Context and Space renames also discard it and proceed (`contextCascade.ts:217`, `renameSpaceOp`'s `writeJournal`), and Contexts alone pass `supersedes` (`contextJournal.ts:42-45`, `journalSlot.ts:19,37`), which lets a later rename of the same entity overwrite an earlier rename's owed record.
  - Both property arms still attach `owed: record` through `schemaCascade` (`propertyJournal.ts:51-54`, called at `registryProperty.ts:205` and `deleteProperty.ts:128`), whether or not the slot took the record. So the renderer carries a record that may exist nowhere on disk (`propertyWrite.ts:6,22-23`, `PropertyFrame.tsx:300`).
  - That is the reason `property:replay` accepts a record over IPC (`handlers.ts:105-109,176-180`, `bridge.ts:154`). It is also the reason the replay grew `answered` logic: `replaySchemaCascade.ts:54` (`crashed = !answered && …`) and `:78` (an option-remove's answered record is owed "only while the slot still holds it").
  - The guards then patch around the shared slot (catalog rows 2-8): `owedKeys` (`optionOps.ts:79-84`), Clear's wait (`:346-348`), adoption's owed filter (`:144,150-151`), create's step-aside (`registryProperty.ts:77-81`), and create's delete consumption (`:94-100`).
  - I-036's claim (`IssuesPM.md:755`) is that per-property records fold these guards into one rule: "an operation on a property waits on that property's owed record, and every owed record's old keys count as held."
- **Better:** key the owed work by entity (`propertyId` / `contextId` / `spaceId`), one record each [Intended as B-1], in one `.nexus/` file or a keyed slot, which I-036 asks for anyway for Contexts. Then:
  - Every cascading op always journals. The unjournaled paths, `supersedes`, `answered`, the renderer-carried record, and `journalRecord` all go. `SchemaCascade.owed` shrinks to the property id, and Try Again becomes `property:replay(id)` read from disk.
  - `OWED` scopes to the op's own property, so an owed record on property A no longer blocks option renames, Value Format changes, or option Removes on property B Nexus-wide. (`editOption` isn't blocked by another property's record today; `owedKeys` filters by id, `optionOps.ts:81`.)
  - `owedKeys`, the adoption filter, and the create step-aside become one `owedKeys(root)` read: the union of every held record's old keys.
  - An op on an entity with a record of its own replays that record before it runs (04-01's form), rather than refusing while held, so a restored property's option ops don't stall until the next open.
  - **Where the I-036 claim doesn't hold as worded:**
    - Clause 1 ("waits") must cover only *cascading* ops. Applied to `editOption`, it would make a recolor wait on an owed rename, which is a regression. `editOption` needs clause 2 alone.
    - Create's delete-record consumption by **key** contradicts clause 2. Under the rule, an owed delete's key counts as held, so a create on that key is refused with the general unfinished-change message, and its Try Again re-runs the delete's cleanup [Intended as B-4] (Ledger L-06). Consumption by **id** (restore) leaves with 04-02's registry-first order [Intended as B-2].
    - A second rename on an entity whose rename is owed must either wait or compose old keys into one record. The property replay already sweeps "to the key the def holds now, however many renames have followed" (`replaySchemaCascade.ts:46`), and the Context Try Again re-derives from→current the same way (`contextCascade.ts:206-211`), so composing is the smaller rule.
- **Behavior:** changes behavior.
  - Option renames, Value Format changes, and option Removes on other properties stop being refused ("An earlier change hasn't reached every file yet.").
  - A rename, Key Format change, or delete gains crash recovery while another record is owed.
  - A same-key create on an owed delete is refused with a Try Again that re-runs the cleanup, instead of adopting its skipped files.
  - A second rename on an entity whose rename is owed composes with it, so a Context's first rename's leftovers survive a restart (they're lost today, see 04 ledger).
- **Estimate:** about −60 to −100 production lines across `optionOps.ts`, `registryProperty.ts`, `replaySchemaCascade.ts`, `handlers.ts`, `propertyWrite.ts`, `propertyJournal.ts`, and `journalSlot.ts`, plus a keyed slot (+15 to +25, shared with Contexts). Rewrites `journalWiring.test.ts:274-319` ("the create-side consumer", "the slot protects a stranded record") and parts of `optionOps.test.ts:707` ("an owed record holds option changes") · inferred
- **Reconciler:** merged 04-01 (Contexts' `supersedes`, replay-before-op, Try Again by id) and 04-03 (the three policies; its doc half is in 03-15). Corrected "option edits on other properties" to the three cascading option ops.

###### 03-02 · `property_cache` and the Assignment List Each Merge as One Field Under Sync, and Losing the Cache Loses Data — VERIFIED
- **Lens:** Sync-Ready Shapes, The Data Layer
- **Now:**
  - `mergeDepthFor` (`Core/Sync/Arrival/mergePolicy.ts:25-40`) returns `{}` for every sidecar, so a Collection's `property_cache` and its `properties` list each merge as one top-level key.
  - Remove strips page values *after* moving them into the cache (`removeProperty.ts:47-60`). Suppose two devices each Remove a different property from one Collection inside a sync window. The newer writer's `property_cache` wins whole, and the loser's stripped values exist nowhere, because the pages were already stripped [inferred from `mergeKeys`, `jsonMerge.ts:35-44`].
  - Concurrent assigns lose one assignment the same way. That's recoverable by hand, not data loss.
  - NexusOS holds no `property_cache` today, so the loss is prospective.
- **Better:** The stash stays [Intended as C-1] and is meant to lose nothing under sync [Intended as C-2], while Sync's merge rules stay as they are [Intended as H-1]. Per-property, per-page merging (`{ property_cache: 2 }` over `<propId>.<pageId>` with 08-06's flattening) and an order-aware `properties` merge are Sync rebuild inputs, unless planning's placement for the stash achieves the same without a Sync rule [Intended as H-2].
- **Behavior:** preserving locally; the cross-device loss closes through the stash's placement or the Sync rebuild.
- **Estimate:** set by the stash's placement (C-2) · read (merge policy), inferred (loss scenario)

###### 03-03 / 04-13 · Remove's Partial Run Can't Be Retried, Is Reported as a Refusal, and the Docs Claim the Opposite — VERIFIED
- **Lens:** Fix the Origin, One Way (skip reporting), Describers Get Swept, Behavior Is a Decision
- **Now:**
  - Remove has no journal. Its sidecar write unassigns and caches first (`removeProperty.ts:47-57`), then runs the config reach (`:59`), then strips (`:60`).
  - Files the strip skipped come back as `fault(unsweptLine)` through `unsweptReply` (`handlers.ts:62-65,169`). The renderer treats that as a refusal: `PropertyFrame.tsx:255-257` calls `backToList()` only when `reportRefusal` passes, so the editor stays open on a property that's no longer assigned. `propertyWrite.ts:14` offers Try Again only for code `'owed'`.
  - A second Remove returns `NOTHING_TO_REMOVE` (`removeProperty.ts:33`), so the skipped pages keep values the Collection no longer governs.
  - Clear has the same reply (`optionOps.ts:352`, a fault without Try Again), though re-running Clear works.
  - Skip reporting therefore has four shapes:
    - `SchemaCascade` with a record (rename, delete, option rename/remove)
    - `fault` (Remove, Clear, replay)
    - `asIs` around a `SchemaCascade`: rename and Key Format pass `PropertyRename` through `asIs`, not `cascadeReply` (`handlers.ts:173-174`); harmless today since a rename's `hosts` is always `[]` (`registryProperty.ts:205`)
    - Silence: a re-assign refill skip stays cached unreported (`assignment.ts:99-105`)
  - PropertiesPM claims both Remove and the delete "re-run cleanly after a partial run" (`.claude/Features/PropertiesPM.md:136`). That's false for Remove.
- **Better:**
  - Every op that sweeps answers one `SchemaCascade` and lands through `warnOwed`.
  - Remove's retry re-runs the strip against the cache it already wrote [Intended as C-2]. Either it journals a `{ op: 'unassign', id, folder }` record under 03-01's keyed records, or Remove's guard keys on "the cache block exists or a file still holds the key" instead of "assigned" (the latter still needs a Try Again to reach it, since an unassigned property has no Remove in the panel).
  - The doc line is rewritten to what holds.
- **Behavior:** changes behavior. Remove and Clear skips gain Try Again, and the frame leaves the editor once Remove lands.
- **Estimate:** about −5 to +10 · read
- **Reconciler:** merged 04-13 (same finding, narrower).

###### 03-04 · The Schema Lock Wraps Some Registry Writers and Not Others, and `schema:add` Runs Create, Assign, and Rollback in Three Holds — CORRECTED
- **Lens:** One Way, Clearer Boundaries, Fix the Origin
- **Now:** `serializeSchemaOp`'s comment (`propertiesRegistry.ts:125`) says ops that *cascade to pages* queue on it. In practice:
  - `editProperty` (registry-only) is wrapped (`registryProperty.ts:231`).
  - `reorderRegistry` and `removeFromRegistry` are not (`:244-267`).
  - `createProperty` is not, when `schema:add` calls it (`handlers.ts:158`).
  - `restoreProperty` wraps it (`restoreProperty.ts:28`).
  - `schema:add` creates (unlocked), then `assignProperty` (locked), then a rollback `removeFromRegistry` on failure (unlocked) (`handlers.ts:153-166`).
  - `rekeyProperty`'s docblock names the race this opens: "since a create can land between the two" (`registryProperty.ts:170`). Every registry write is still atomic under the registry file's own lock (`mutateRegistry` → `updateNexusFile`, `propertiesRegistry.ts:92`), and the in-commit `validateName` (`:190`) already catches the create the comment names, so the race produces no wrong state today.
- **Better:** one rule: every entry point that writes the registry or a schema sidecar takes the schema lock. `schema:add` becomes one hold, `createProperty` + `assignInner` with an in-hold rollback, which removes the app-side cause of the comment's race. Whether `rekeyProperty`'s in-`mutateRegistry` `validateName` (`:190`) stays then depends only on external writers to `properties.json` (Sync arrivals, hand edits), which don't take this lock. Decide that, then rewrite the comment to the real reason. Don't assert the second check is removable.
- **Behavior:** preserving.
- **Estimate:** about ±0 · read
- **Reconciler:** "It closes a race" corrected: the race is already caught by the second check; the change is a consistency rule, not a bug fix.

###### 03-05 · Each Mutation Hand-Rolls Its Own Plan, Count, Journal, Commit, Sweep, and Report Shape — INFERRED
- **Lens:** One Way, Less to Understand, Type Facts Once
- **Now:** ten entry points in eight rows, seven distinct shapes [read, each row re-checked]:

  | Op | Lock | Journal | Commit Order | Count Fn | Reply |
  |---|---|---|---|---|---|
  | create | partial (03-04) | reads | registry | — | `{ id }` |
  | rename / Key Format | yes | written; result ignored | registry, then files | `keyFormatHolders` (`registryProperty.ts:158`) | `asIs(PropertyRename)` |
  | delete | yes | after bundle; result ignored | files and Space sidecars, then Collection sidecars, then config, then registry | `propertyHolders` (`deleteProperty.ts:98`) | `cascadeReply` |
  | Remove | yes | none | sidecar, then config, then files | — | `unsweptReply` |
  | assign | yes | none | sidecar, then refill | — | `asIs` |
  | option rename / Value Format | yes | refuses | registry, then files, then caches, then config | `valueFormatHolders` (`optionOps.ts:327`) | `cascadeReply` |
  | option Remove | yes | refuses | files, then caches, then config, then registry | `optionHolders` (`:356`) | `cascadeReply` |
  | Clear | yes | reads | files, then caches | `optionHolders` | `asIs` / fault |

  - Each count re-derives its op's plan through its own function: `rekeyPlan`/`renamePlan`, `valueFormatPlan`/`valueEditPlan`, `resolveForCascade`, `deletePlan`. Every count already ends in `sweepCount(files, plan)` over its op's own plan (`c5dccd62b`, "Clear's and Remove's counts are their strip's dry run").
  - `property:holders` multiplexes four counts by argument shape (`handlers.ts:199-208`). The MetadataV3 plan left this as an open ruling: "One Holders Shape" (`.claude/Planning/Completed/MetadataV3/MetadataV3 — Implementation Plan.md:5828`).
- **Better:** each op is one descriptor. `plan(root, args)` returns `{ record?, files, sweep, commit, commitFirst }`; one runner does journal → commit/sweep in its declared order → clear → `SchemaCascade`; and `holders` is `sweepCount(plan)` for any op. That folds the four count functions and the shape-sniffing `property:holders`. Every op commits the list first and the files second [Intended as B-2]. An option removal keeps the def until the strip lands so its replay can find the option (`replaySchemaCascade.ts:76`), so its record carries what the replay needs instead; a property delete's record already carries its key (04-02).
- **Stress:** a generic runner is a new layer; it earns its place only after 03-01 (keyed records) and 03-03 (one reply shape) have removed most of the per-op variation, at which point the remaining difference is the commit order. Landing the runner first would build on the guards it's meant to remove.
- **Behavior:** preserving.
- **Estimate:** about −40 to −80 · inferred (the net depends on how much 03-01 and 03-03 already removed; measure after them)
- **Reconciler:** statused INFERRED: the table holds as read, but the net and the runner's shape can't be settled by reading.

###### 03-06 / 04-09 · "Which Files Hold This Key" Is Read Three Ways, With Repeated Full Disk Passes Per Op — VERIFIED
- **Lens:** One Way, Hot Paths Stay Cold (per op, not per render), Less Stuff
- **Now:**
  - `confirmedKeyHolders` (`keyHolders.ts:14-29`) reads every holder and then **every** Space sidecar from disk.
  - `bothKeyHolders` (`registryProperty.ts:125-130`) runs it twice, once for `from` and once for `to` (the `to` pass only when `from` has holders). So a Key Format **count** (`keyFormatHolders` → `rekeyPlan` → `bothKeyHolders`, then `sweepCount`'s dry sweep, which re-reads the holders and all Space sidecars, `governedSweep.ts:116-137`) makes three disk passes. The rename itself repeats `rekeyPlan` (`:177`) plus the real sweep (`:203`), so the `from` holders are read four times across a confirmed Key Format change.
  - `keyedHolders` (`keyHolders.ts:38-66`) reads pages only. The delete's `snapshot` then re-walks every Space sidecar on its own (`deleteProperty.ts:74-84`), and the strip's sidecar arm scans them again (`deleteProperty.ts:144` → `governedSweep.ts:118`), so one delete scans every Space sidecar three times counting its preview (04-05).
- **Better:**
  - The clash needs no `to` scan: a file holds both keys only if it holds `from`, so one pass over the `from` holders checks each root for `to` as well (04-09).
  - One `keyHolders(root, keys[])` pass that reads each candidate once and answers per file which of the keys it holds, plus values by ID for pages *and* Spaces (plus `partial`, which the Trash entry shows [Intended as N-1]).
  - `bothKeyHolders` becomes a filter over that pass; `snapshot` drops its Space loop; `confirmedKeyHolders` folds in.
- **Behavior:** preserving. These are user-paced ops, so this is efficiency and clarity, not a Hard Rule violation.
- **Estimate:** about −20 · read
- **Reconciler:** merged 04-09 (the four-read count and the one-pass clash).

###### 03-07 / 01-07 · Five `defEditOp` Channels Are One Operation — VERIFIED
- **Lens:** Less Stuff, One Way (I-032)
- **Now:**
  - `property:setLinkConfig`, `setCheckboxColor`, `setIcon`, `setNumberFormat`, and `setFileDirectory` (`bridge.ts:155-171`, `handlers.ts:182-193`) all call `editProperty` through per-field narrowers (`properties.ts:219-229` for three; `handlers.ts:183-186` inline for checkbox color and icon, each accepting any string).
  - Each has one renderer caller (`PropertyFrame.tsx:259,353,363,371,516`).
  - Nothing checks that a patch fits the def's type: `editProperty` spreads any narrowed patch onto any def (`registryProperty.ts:235`), so a number format can land on a Link.
  - `property:rename` and `property:setKeyFormat` likewise share `rekeyProperty`.
- **Better:** one `property:configure(id, patch)` whose narrower is one zod `partial()` pick of `propertyDefinitionFields` over the editable non-identity fields, with the file-directory normalization and `validPropertyDir` check inline. Optionally one `property:setFormat(id, FormatChange)` for both formats, which answers the open "One Holders Shape" ruling's other half; note it dispatches by the change's shape as `property:holders` already does.
- **Behavior:** preserving (a type-mismatch refusal, if added, changes nothing a UI path reaches).
- **Estimate:** about −25 to −35 · read

###### 03-08 · The Trash Restore Re-Checks What `createProperty` Already Refuses and Guards a State Nothing Produces — VERIFIED
- **Lens:** Fix the Origin, Less Stuff
- **Now:**
  - `restoreInner` refuses `'exists'` (`restoreProperty.ts:35-36`). `createProperty`'s `validateDefinition` already refuses the same state (`schema.ts:67-68`), after `freeLabel` has stepped the label aside.
  - It re-reads the registry to fetch the def it just wrote and faults "could not be read back" (`:42-43`), inside the schema lock.
  - It calls `liveTreeOf` twice (`:45`, `:56`).
  - `createProperty` returns only `{ id }` (`registryProperty.ts:91`).
- **Better:** `createProperty` returns the landed def. Drop the pre-check (no caller branches on the `'exists'` code; `spend.ts:103-104` passes the refusal through) and drop the read-back. One tree read [inferred: the assignments in between don't change the pages `nexusPages` reads].
- **Behavior:** preserving, except the refusal copy changes from "Something in the nexus already carries this identity." to "That property id already exists.", unless the message is kept.
- **Estimate:** about −8 · read

###### 03-09 · A Record's `partial` Flag Is Computed in Five Branches and Read by Nothing — CORRECTED
- **Lens:** Less Stuff, Real Purpose
- **Now:**
  - `snapshot` sets `partial` at `deleteProperty.ts:62,66,70,77,82` and writes it (`:92`), fed by `KeyedHolders.partial` (`keyHolders.ts:34,64`).
  - No production code reads `partial` on **any** record kind. Page, Set, Collection, Space, and Context deletes write it too (`Trash/delete.ts:142,159`, `Trash/gather.ts:83-91,127-133`), the schema declares it on four record shapes (`Bundles/record.ts:54,70,80,88`), and the only consumer destructures it away (`spend.ts:156`). `git grep '\.partial\b'` finds only `deleteProperty.ts:62`.
  - `NexusRecordPM.md:12` describes `partial` as the record saying it's thinner than the truth.
- **Better:** surface it for every record kind: the Trash entry shows the mark, and a restore that comes back partial tells the user so [Intended as N-1]. A property-only treatment would leave the other kinds as odd ones out.
- **Behavior:** changes behavior; the mark becomes visible.
- **Estimate:** about +5 · read
- **Reconciler:** widened from the property record to every record kind; the decision is Bundles-wide.

###### 03-10 · One Vocabulary: "Remove", "Held", and the Channel Prefixes Each Mean Several Things — VERIFIED
- **Lens:** One Vocabulary, Less to Understand
- **Now:**
  - **"Remove":**
    - `removeProperty` / `schema:unassign` / the `property:remove` menu action (`PropertyFrame.tsx:293`) is a per-Collection unassign.
    - `removeFromRegistry` is the global delete's registry step.
    - `removeOption` is a **global, destructive** option delete with no Trash, the option-level twin of the property-level *Delete*.
    - The user reads "Remove" on a property as restorable and on an option as permanent (`confirmations.ts:196-201`).
  - **"Held":**
    - `heldTreeOf` (the in-memory tree)
    - `confirmedKeyHolders`/`keyedHolders` (files holding a key)
    - `holdings.ts` (the Trash's parked Link values)
    - `registerHeldOptions` (Multi-Select words on files)
    - `editHeldList`/`rekeyHeld` (a root's values)
    - the journal slot's "held" record
  - **Prefixes:** `schema:*` is per-Collection, except `schema:add`, which also creates globally. `registry:reorder` sits beside `property:*` for the same registry.
- **Better:**
  - Rename `removeProperty` → `unassignProperty`, matching its channel.
  - Rename `holdings.ts` for what it holds (for example `trashLinks.ts`).
  - Fold `registry:reorder` into `property:reorder`.
  - An option's Remove reads Delete, so Remove only names something restorable [Intended as O-1].
- **Behavior:** preserving in code; the option's label changes.
- **Estimate:** ±0 · read

###### 03-11 · `optionCascade` Encodes "Remove" as a `null` in a Label Tuple — VERIFIED
- **Lens:** Hard Rule (finite states are unions + switch)
- **Now:** `labels?: readonly [string, string | null]`, with `labels?.[1] === null` meaning a Remove whose skip halts the cascade (`optionOps.ts:218-234`). Callers pass `[label, null]` (`:378`, `replaySchemaCascade.ts:82-85`); Clear passes no labels (`:351`). `ValueEdit`'s `null` means "strip" (`pageValue.ts`, 02's territory).
- **Better:** `edit: { kind: 'rename'; keys; labels? } | { kind: 'remove'; key; label } | { kind: 'clear'; key }`, matched by `switch`. Clear's no-config pass and Remove's halt become explicit arms.
- **Behavior:** preserving.
- **Estimate:** about ±0 · read

###### 03-13 · Remove Clears the Collection's Own Views Twice — VERIFIED
- **Lens:** Logic Stated Twice
- **Now:**
  - Remove's single sidecar patch runs `mapViews(cur, clear)` with `clear = propertyClear(propertyId)` (`removeProperty.ts:45,51`).
  - `reachConfig(…, collectionFolder)` (`:59`) then applies the same edit (`configReach.ts:258`) to that same sidecar again, because `within(node)` includes the node itself and `reaches` admits the folder itself (`Nexus/configReach.ts:278-281,323,370-379`). The second write is a no-op.
  - The inline comment's rationale (one write so the page-read window can't revert a concurrent sidecar write) needs the *cache and assignment* in one write, not the views; `reachConfig`'s `editJsonStrict` is itself a locked read-modify-write. The inline clear came in `874f687d2` ("clears its own views inside its cache-and-unassign write and then its Sets and the tiles").
- **Better:** drop the inline `mapViews` and let `reachConfig` own every view edit, as the delete already does (`deleteProperty.ts:154-155`). `propertyClear` then has only a test importer (`configReach.test.ts:13`) and unexports.
- **Behavior:** preserving [inferred].
- **Estimate:** −3 · read

###### 03-14 · Misplaced and Over-Exported Symbols — CORRECTED
- **Lens:** Clearer Boundaries
- **Now:**
  - `refillValues` (`assignment.ts:49`) is a value-landing primitive used by two Trash paths.
  - `assignedDefs` (`assignment.ts:33`) is schema resolution, beside `containerSchema`.
  - `writePropertyBundle` is exported for tests only (`deleteProperty.ts:42`; importers `Bundles/handlers.test.ts`, `Bundles/rows.test.ts`, `replaySchemaCascade.test.ts`, `Trash/spend.test.ts`).
  - Five functions are exported only for the replay (`renameSweep`, `deletePlan`, `stripAndRemove`, `dropOptionFromDef`, `optionCascade`; `replaySchemaCascade.ts:8-10`). Expected, but under 03-01/03-05 they become the descriptor's internals.
- **Better:**
  - Move `refillValues` beside `sweepRootsById` (`governedSweep.ts:185`) or into 02's write module.
  - Fold `assignedDefs` into `containerSchema` (`treePatch.ts:128`): its held-tree arm is `containerSchema` by another route, and its disk fallback is unreachable wherever a tree is already in hand (04-10).
  - Un-export `writePropertyBundle` and drive its tests through `deleteProperty`.
- **Behavior:** preserving.
- **Estimate:** about ±0 · read
- **Reconciler:** six replay-only exports corrected to five.

###### 03-15 · PropertiesPM's Schema-Mutation Claims That the Code Makes False — CORRECTED
- **Lens:** Describers Get Swept
- **Now:**
  - `PropertiesPM.md:123`: "their entry points queue on one lock" is false for `schema:add`'s create, `registry:reorder`, and the rollback (03-04); "every operation that writes both the registry and pages states its intent in a journal first" is false while another record is held or the slot is unreadable (03-01), and by design for Clear (`journalWiring.test.ts:257`) and Remove.
  - `:136`: "re-runs cleanly after a partial run." False for Remove (03-03).
  - Neither the Change-a-Format row (`:131`, which does state the Value Format refusal) nor the Delete row says a Key Format change or delete proceeds unjournaled when another record is owed.
  - `registryProperty.ts:170`'s race rationale (03-04).
  - `keyHolders.test.ts:80-216` (`describe('governedReach')`) describes `governedReach` and `collectionFolders`, which live in `governedSweep.ts`.
  - `cascadeRace.test.ts:58` still carries the label "F1 —".
- **Better:** rewrite each line in the same pass as 03-01, 03-03, and 03-04.
- **Behavior:** preserving.
- **Estimate:** docs and tests only · read
- **Reconciler:** `:122` corrected to `:123`, and the paragraph's lock claim added; carries 04-03's doc half. 09's Doc Claims table marks `:123` as holding, which the code contradicts (see *§Overlaps & Contradictions*).

##### Behavior Ledger

**L-01 · Remove Strips Values Into the Cache — VERIFIED**
- **Behavior:** Remove strips a Collection's values off its pages into `property_cache`, and re-assigning puts them back.
- **Where:** `removeProperty.ts`, `assignment.ts:65-107`, `propertyCache.ts`, `deleteProperty.ts:60-72,163-172`, `restoreProperty.ts:50-54`, `optionOps.ts:207-215`, `Nexus/cascade.ts:271-274`, `Nexus/containerFields.ts:24-27`, `Nexus/tree.ts:66-67`, `Bundles/record.ts:79`.
- **Code Cost:** about 170 production lines across 11 files, plus the cache arms in at least 5 test files.
- **Origin:** the 7-2 Decision Log, C-3 and C-6 (committed in `052ceec63`, 07-02-2026, since removed from the tree), implemented in `f85ccf2b3` (07-02-2026). C-3 reopened the earlier leave-in-frontmatter ruling; C-6's cache shape is marked "signed approach 1".
- **Archive Interaction [read]:** Remove reaches the Collection's own Archive through `governedReach(…, only)` → `archiveReach` (`governedSweep.ts:43-57`, `treePatch.ts:119-123`), so archived pages are stripped and cached under their ids. Re-assign's member filter refills them, because `owningCollection` resolves archive paths (`treePatch.ts:113-115`). The delete's `snapshot` captures archived holders' values, since `deletePlan` runs `governedReach` with no `only` (`deleteProperty.ts:142`).
- **Classification:** **Nathan's intent**, ruled before Sync existed and kept [Intended as C-1].

**L-02 · Stale Cache Entries Live Until a Global Delete — VERIFIED**
- **Behavior:** cache entries for pages that left the Collection (moved, or emptied from the Trash) stay until the property is globally deleted.
- **Where:** `assignment.ts:101-104` (only spent and gone-link ids leave) and `removeProperty.ts:46,48`.
- **Code Cost:** none to keep; unbounded sidecar growth.
- **Origin:** C-6's recommended approach specified "stale page-ids dropped" on re-assign (`052ceec63`). The current comment chose to keep "what a refill cut short left".
- **Classification:** **agent's choice** that drifted from Nathan's C-6; stale entries are meant to drop [Intended as C-2].

**L-03 · A Rename Adopts Existing Holders of the New Key — VERIFIED**
- **Behavior:** a rename or Key Format change onto a key that files already hold adopts their values. It's refused only where a live file holds both keys. An archived file holding both keeps the new key's value and silently loses the old one.
- **Where:** `registryProperty.ts:151-154`, `keyHolders.ts:18`.
- **Code Cost:** about 15 lines.
- **Origin:** `da190d039` (10-08). The Archive exclusion is Archive C-4 [CONFIRMED] (`Archive — Decisions & Intention.md:62`), although Archive's Planning Findings 1.7 (`:116`) recommended that `bothKeyHolders` keep archived holders to avoid the loss.
- **Classification:** adoption is an agent's choice consistent with the documented "registering makes values live". The Archive half is settled ground truth, listed only so the loss is visible.

**L-04 · Confirmation Thresholds — CORRECTED**
- **Behavior:**
  - Property delete and option Remove always ask, even at 0 holders ("stripped from 0 Items").
  - Clear and format changes ask only past one Item.
  - Remove never asks.
  - The Confirm Before Deletion switch governs none of these.
- **Where:** `confirmations.ts:177-228`.
- **Code Cost:** about 50 lines.
- **Origin:** the past-one threshold entered for format changes in `96ca4cdba` (Task 7B-4) and was extended to Clear in `5e3aee180`, which removed the open ruling from the plan. That resolution (Clear matches the format change) wasn't one of the two options the ruling offered. Always-asks predates MetadataV3 (the 7-2 decision log already calls Delete "pane-gated, confirm-gated").
- **Classification:** the threshold is **Nathan's ruling** [inferred from the ruling's removal]. Remove asking nothing follows from C-3's "restorable". The zero-count "0 Items" wording was routed to a copy review by Nathan's answer to the Archive questions ("C-4 stays, the zero-count wording set at the copy review", `Archive — Planning Findings.md:12`), and every such confirmation is meant to count its Items correctly, zero included, in one vocabulary from one home shared with the Archive's and the Trash's confirmations [Intended as O-2].

**L-05 · Create Steps Aside Silently — VERIFIED**
- **Behavior:** a create whose label or key is taken, or matches an owed rename's old key, silently becomes "Label 2". A Trash restore whose label is now taken comes back under "Label 2" and writes its values under the new key.
- **Where:** `registryProperty.ts:56-81`, `restoreProperty.ts:40`.
- **Code Cost:** about 20 lines.
- **Origin:** `59a8f0586` (Task 7A-2), `cf4dee4e6` (Phase 9 review, the owed-key half).
- **Classification:** **agent's choice**, kept; the user is meant to be told it took a numbered name [Intended as O-4].

**L-06 · A Same-Key Create Adopts an Owed Delete's Leftovers — VERIFIED**
- **Behavior:** a create wearing an owed delete's key adopts the files the delete skipped and cancels that delete's Try Again.
- **Where:** `registryProperty.ts:94-100`.
- **Code Cost:** 7 lines.
- **Origin:** present at the monorepo move `759a2dbef` (09-05); not traced further.
- **Classification:** **accident**. A create on an owed delete's key is meant to be refused with the general unfinished-change message, and its Try Again re-runs the cleanup [Intended as B-4].

**L-07 · Option Ops Refuse Nexus-Wide Over Any Owed Record — VERIFIED**
- **Behavior:** an option rename, Value Format change, or option Remove is refused while *any* property's record is owed, or the slot can't be read. The refusal comes after the confirmation has already asked.
- **Where:** `optionOps.ts:242,377`.
- **Code Cost:** about 6 lines.
- **Origin:** `cb2f3a8a0` (Task 6-4, 10-18).
- **Classification:** **agent's choice**, forced by the single slot [Intended as B-1].

**L-08 · Rekeys and Deletes Run Without Crash Recovery While the Slot Is Taken — VERIFIED**
- **Behavior:** a rename, Key Format change, or delete runs with no crash recovery while another record is owed.
- **Where:** `registryProperty.ts:183`, `deleteProperty.ts:123`.
- **Code Cost:** none.
- **Origin:** the journal-slot refusal (`e744714fc`); I-036 names it.
- **Classification:** **accident** [Intended as B-1].

**L-09 · Remove and Clear Skips Offer No Retry — VERIFIED**
- **Behavior:** Remove's skipped files read as an error with no Try Again, the editor stays open on a property that's no longer assigned, and those pages keep values nothing governs. Clear's skips also offer no Try Again.
- **Where:** `handlers.ts:62-65`, `PropertyFrame.tsx:255-257`, `removeProperty.ts:33`.
- **Code Cost:** none.
- **Origin:** `874f687d2` ("answer a skip as the unswept fault").
- **Classification:** **accident**; Remove is meant to be retryable [Intended as C-2].

**L-10 · Re-Assign Never Overwrites a Value on the Page — VERIFIED**
- **Behavior:** a re-assign refill skips any page whose key holds anything, and the cached value stays cached.
- **Where:** `assignment.ts:60`.
- **Code Cost:** 1 line.
- **Origin:** MetadataV3 Phase 3 review deviation ("A Refill Never Replaces Words").
- **Classification:** **agent's choice**, sound.

**L-11 · Property Delete Ignores Trash Mode — VERIFIED**
- **Behavior:** a property delete always writes a `.trash` bundle, even in system-trash mode, where the documented rule is "records nothing".
- **Where:** `deleteProperty.ts:46` (`mintBundle(root, { kind: 'trash' }, …)` with no mode check), `NexusRecordPM.md:12`.
- **Code Cost:** none.
- **Origin:** —
- **Classification:** **Nathan's intent** (no artifact to send to the OS trash) [Intended as N-2]. Whether the Trash pane shows it in system mode is unverified [inferred].

**L-12 · The `partial` Flag Is Never Surfaced — CORRECTED**
- **Behavior:** every record kind's `partial` flag is written and never shown (03-09).
- **Where:** `deleteProperty.ts:62-92`, `Trash/delete.ts:142,159`, `Trash/gather.ts:83-91,127-133`.
- **Code Cost:** about 12 lines in the property arm.
- **Origin:** —
- **Classification:** **agent's choice**; the mark is meant to show on the Trash entry and on a partial restore [Intended as N-1].

##### Approaches

**A · Keyed Journal + One Mutation Runner (03-01 + 03-05 + 03-03) — INFERRED**
- **Shape:** each op is a descriptor `{ plan, record, order, commit }`, run by one runner over a per-entity record store shared with Contexts (I-036). `holders` is `sweepCount` of any plan.
- **Removes:**
  - the unjournaled paths and `supersedes`
  - the `answered` replay branches
  - the renderer-carried record and the `journalRecord` narrower
  - `owedKeys` and its two siblings, which become one held-keys read
  - Clear's special check
  - the four count functions and the shape-sniffing `property:holders`
  - three of the four reply shapes
- **Costs:** a keyed record format, a rewrite of about 1,190 journal/replay/wiring test lines (`replaySchemaCascade` 713, `journalWiring` 372, `propertyJournal` 102), and the chained-rename rule planning settles under B-1.
- **Risk:** crash-order semantics move. Every op commits list-first [Intended as B-2], and each is replay-tested again. Land the keyed records and one reply shape first; the runner only after (03-05's stress).
- **Estimate:** −100 to −150 net [inferred].

**B · The Stash, Fixed (Nathan's C-3 and C-6) — CORRECTED**
- **Shape:** Remove keeps stripping a Collection's values into the stash, and re-assign keeps putting them back [Intended as C-1]. The stash drops entries for pages that left the Collection (L-02), a Remove that missed pages can be retried (03-03), and its vestigial `values` wrapper flattens under a name that says what it holds (08-06) [Intended as C-2]. It loses nothing under sync where its placement or shape achieves that without a Sync rule; otherwise per-property, per-page merging is a Sync rebuild input (03-02) [Intended as H-2]. Planning proposes a better home than the Collection's settings file where it finds one.
- **Removes:** L-02's unbounded growth, 03-03's non-retriable strip, and the `values` wrapper.
- **Costs:** no live Nexus needs a migration: NexusOS holds no `property_cache` block and no property Trash record, and `~/Test` holds no property data. A relocation moves the stash's readers and writers (about 170 production lines across 11 files, L-01).
- **Risk:** low for the fixes; a relocation's risk depends on the home planning picks.
- **Estimate:** small for the fixes; a relocation is sized by its design [inferred].

**C · Fold the Property Channels (03-07 + 03-04 + I-032) — CORRECTED**
- **Shape:**
  - `property:configure` replaces the five `defEditOp` channels.
  - `property:setFormat` replaces two setters.
  - `property:reorder` absorbs `registry:reorder`.
  - `schema:add` runs as one locked hold.
  - Optionally all of it folds into `mutate`'s op union per I-032.
- **Removes:** five bridge entries and their handlers (four from the `defEditOp` fold, one from the format fold; `registry:reorder` → `property:reorder` is a rename).
- **Costs:** churn in the renderer callers in `PropertyFrame.tsx`.
- **Risk:** low.
- **Estimate:** −25 to −40 [read].

##### Cross-Domain Notes
- **04:** `journalSlot`'s `supersedes` exists for Contexts only (`Contexts/contextJournal.ts:45`). Keyed records (03-01) serve both, and list-first commits [Intended as B-2] set Approach A's runner order.
- **04:** `writeSchemaJournal` returns `false` for an *unreadable* slot as well (`journalSlot.ts:36`), so option ops then show "An earlier change hasn't reached every file yet." when no change is owed.
- **04:** `governedSweep.ts`, `journalSlot.ts`, and `keyHolders.ts` are Nexus-wide machinery filed in Properties (I-042 part 2).
- **02:** `assignedDefs` duplicates `containerSchema` with a disk fallback (02-11, 04-10); `refillValues` and `ValueEdit`'s `null`-means-strip belong to the values write path.
- **05:** `PropertyFrame.tsx:255-257,295-300` and `useOptionEdit.tsx:93,111-116` hold the renderer half of the four reply shapes (03-03).
- **Trash:** `holdings.ts` is Link-value work (I-033, I-068) that this domain touches only through `parkLinks` in `restoreCachedValues`.

##### Reconciliation Log

| ID | Status | Reason | Evidence |
|---|---|---|---|
| 03-01 | CORRECTED | Merged 04-01 and 04-03 into it; "option edits on other properties" narrowed to the three cascading option ops, since `editOption` filters owed keys by its own id; added the unreadable-slot producer and Context renames' discarded refusal | `optionOps.ts:79-84,242,377`; `journalSlot.ts:19,36-37`; `contextCascade.ts:217`; `contextJournal.ts:42-45` |
| 03-02 | VERIFIED | Sidecars merge at depth `{}`; NexusOS holds no cache today | `mergePolicy.ts:25-40`; NexusOS grep for `property_cache` (none) |
| 03-03 | VERIFIED | Merged 04-13; added the config reach between unassign and strip | `removeProperty.ts:33,47-60`; `handlers.ts:62-65,169`; `PropertyFrame.tsx:255-257`; `PropertiesPM.md:136` |
| 03-04 | CORRECTED | The named race is already caught by the in-commit `validateName`, and every registry write is file-locked; the change is a consistency rule | `registryProperty.ts:170,190`; `propertiesRegistry.ts:92,125-127` |
| 03-05 | INFERRED | Table holds as read; the runner's net and shape need 03-01/03-03 landed first to measure; corrected "eleven entry points" to ten in eight rows and the commit-order reason to the option removal alone | `handlers.ts:153-208`; `replaySchemaCascade.ts:52,76` |
| 03-06 | VERIFIED | Merged 04-09 (four reads across a confirmed Key Format change; one-pass clash) | `registryProperty.ts:125-130,158-168,177,203`; `keyHolders.ts:14-29`; `deleteProperty.ts:74-84,144` |
| 03-07 | VERIFIED | Five channels, five callers; no type check on the patch (confirms 01-07) | `handlers.ts:137-150,182-193`; `bridge.ts:155-171`; `registryProperty.ts:235` |
| 03-08 | VERIFIED | Pre-check duplicates `validateDefinition`; no caller branches on `'exists'` | `restoreProperty.ts:35-45,56`; `schema.ts:67-68`; `spend.ts:103-104` |
| 03-09 | CORRECTED | `partial` is unread for every record kind, not only properties | `Bundles/record.ts:54,70,80,88`; `Trash/delete.ts:142,159`; `Trash/gather.ts:83,127`; `spend.ts:156` |
| 03-10 | VERIFIED | — | `confirmations.ts:196-201`; `handlers.ts:153-172` |
| 03-11 | VERIFIED | — | `optionOps.ts:218-234,351,378`; `replaySchemaCascade.ts:82-85` |
| 03-12 | REMOVED | Merged into 04-06, whose index-read direction removes the walk where 03-12's key-holder query still reads files; 04-06 also corrects the per-page cost (stat plus cached parse) | `optionOps.ts:125-141`; `readNexus.ts:134-140` (`cachedParse`) |
| 03-13 | VERIFIED | Same `propertyClear` edit applied twice; origin `874f687d2`; `propertyClear` becomes test-only | `removeProperty.ts:45,51,59`; `configReach.ts:251,258,278-281,370-379` |
| 03-14 | CORRECTED | Five replay-only exports, not six; `assignedDefs` folds into `containerSchema` | `replaySchemaCascade.ts:8-10`; `treePatch.ts:126-129`; `assignment.ts:33-46` |
| 03-15 | CORRECTED | `:122` → `:123`; added the false "queue on one lock" claim; carries 04-03's doc half | `PropertiesPM.md:123,131,136` |
| Catalog, row "Confirmation thresholds" | CORRECTED | Zero-count wording is a pending copy decision | `Archive — Planning Findings.md:12` |
| L-04 | CORRECTED | Same | Same |
| L-12 | CORRECTED | Widened to every record kind | as 03-09 |
| Approach B | CORRECTED | No live Nexus holds a cache or a property record, so no migration; dormant values aren't adopted or repaired while unassigned | NexusOS grep; `optionOps.ts:132`; `repairSweep.ts:31` |
| Approach C | CORRECTED | Five bridge entries leave, not eight | `bridge.ts:144,149,155-171,177` |
| Cross-Domain Note "01: `uniqueOptionGroups` dedupes exactly while `validateOptionValues` folds case" | REMOVED | Wrong: both compare through `normalizeTitle`, so they state one rule | `schema.ts:77-90,100-112` |

##### Overlaps & Contradictions

**Overlaps within Reconciler A's four (merged):**
- 03-01 ← 04-01, 04-03 (one slot and its guards; host here).
- 03-03 ← 04-13 (Remove's non-retriable partial run).
- 03-06 ← 04-09 (holder reads per rekey).
- 04-06 ← 03-12 (open-time Multi-Select walk; host in 04).

**Cross-report overlaps:**
- 03-07 ↔ 01-07, 05 Approach 2, 08 Cross-Domain (01), 09 Issues (I-032): the five `defEditOp` channels. 03-07 is the stronger statement; 01-07's "nothing checks that the config matches the def's type" is true (`registryProperty.ts:235`).
- 03-02 ↔ 08-06, 08 Sync Shapes (`property_cache` row): the cache merges whole. 08-06 adds the vestigial `values` layer; the two Betters compose.
- 03-02 ↔ 09-14 / I-006: option-list and cache merge losses under Sync.
- 03-14 (`assignedDefs`) ↔ 02-11, 04-10, 08-13: one "schema a holder carries" resolution.
- 03-14 (`refillValues`) ↔ 02-04, 02's write paths 7: the refill hand-rolls decode→gone→encode.
- 03-01 ↔ 09-10, 09 ledger (owed-record refusals): the guard tests leave with the guards.
- 03-15 ↔ 09-05, 09-06 (`cascadeRace` "F1" tag), 04-16.
- 03-03 ↔ 04-08 (four Try Again forms), 05-05 (the frame's hand-rolled delete flow).
- 03-09 ↔ Trash/Bundles (all record kinds).
- 03-13 ↔ 07 (saved-view clear).
- 03-04 ↔ 02-09 (lock placement for value writes against rename sweeps).
- 01 ledger row "a registry read hides every later fold-equal def" (`propertiesRegistry.ts:28-36`) ↔ this catalog: the catalog covers the write-time `validateName` refusals only; the read-time admission is a separate guard 01 owns. No contradiction. 08-01's cross-device fragment def lands in the same `unadmitted` bucket.

**Contradictions:**
- 09's Doc Claims table marks `PropertiesPM.md:123` as holding (inferred from `handlers.test`). Settled from code against it: `registryProperty.ts:183` and `deleteProperty.ts:123` discard the slot's refusal and proceed unjournaled, and `schema:add`'s create runs outside the lock (`handlers.ts:158`).
- 03-01 ("an op waits on its property's record") vs 04-01 ("replay the entity's own record before the op"): compatible; the merged 03-01 keeps waiting/composing for cascading ops and replay-before-op for an entity's own record, with `editOption` exempt from waiting.
- 02-03 proposes moving `governedWrite.ts` into a `governedRoot.ts` module (Properties or Nexus), while I-042 part (2) and 04-14 move `governedWrite`/`governedSweep`/`journalSlot` into `Core/Files`. Reconciled in 02 (02 A-01): `journalSlot` → `Core/Files` (settled from imports); the governed-root writer and `governedSweep` stay out of `Core/Files`, with `Core/Nexus` recommended over Properties.


---

#### Scout 04 — Journals, Replays & Sweeps (Reconciled)

Baseline `d0595b22d`. "Read" means seen in code at the cited line; "inferred" is marked where it applies. Reconciler A re-opened every cited site at HEAD; statuses sit on each heading, ledger row, and approach. 03 and 04 describe one machinery, so their duplicates are merged with both IDs kept (see *§Reconciliation Log*).

**Live Nexus — VERIFIED:** NexusOS's `.nexus/` holds no `property-cascade.json` or `context-rename.json` (listed directly). `~/Test`, rebuilt at `156264f2f` by `make-benchmark-nexus.mjs test`, holds an empty registry and no property data, and no `~/Benchmark-*` Nexus is on disk. So no stranded record constrains a redesign.

##### Inventory

| File / Symbol | Lines | Responsibility (one line) | Callers Outside the File | Belongs Here? |
|---|---|---|---|---|
| `Core/Properties/journalSlot.ts` · `journalSlot` | 49 | A one-record JSON slot in `.nexus/`: lock, strict read, refuse-or-displace, set aside a corrupt file, clear only its own record | `propertyJournal.ts`, `Contexts/contextJournal.ts` | No. It's generic infrastructure Contexts imports from Properties, so it belongs in `Core/Files` (I-042 part 2 still holds). The `supersedes` param has one caller (Contexts) |
| `Core/Properties/propertyJournal.ts` | 54 | The `SchemaJournal` union (4 ops), its decoder, the slot binding, and `schemaCascade` (the answer shape that carries `owed`) | `registryProperty`, `deleteProperty`, `optionOps`, `replaySchemaCascade`, `Properties/handlers` (`decodeSchemaJournal` as the channel narrow), `propertyWrite`, `Contract/bridge.ts:154` | Yes |
| `Core/Properties/replaySchemaCascade.ts` | 92 | Open-time and Try Again replay of the one property record, with a per-op "does current disk still match" law and an `answered` branch for renderer-handed records | `Nexus/handlers.ts:111`, `Properties/handlers.ts:176` | Yes |
| `Core/Properties/governedSweep.ts` | 212 | The shared multi-file engine: candidate reach, page + Space-sidecar sweep, dry-run count, undo, by-id sweep, the skipped-line string | 19 non-test importers, 8 outside Properties (Contexts ×2, Nexus ×2, Trash ×3, Settings ×1) | No. It's Nexus-wide (I-042), so it belongs in `Core/Files` |
| ↳ `collectionFolders` | 36-40 | The folders a schema governs | `deleteProperty`, `replaySchemaCascade` | — |
| ↳ `governedReach` | 43-57 | Index candidates or the whole corpus, filtered to Collections + Archive | 7 files | — |
| ↳ `sweepGovernedRoots` | 88-139 | Lock → read → parse → rewrite → write per file; a second arm reads **every** Space sidecar found by disk scan | 11 files | — |
| ↳ `undoSweep` / `keysPutBack` | 151-182 | Put back what a sweep changed | `contextCascade.ts:179` only | — |
| ↳ `sweepRootsById` | 185-212 | Sweep by ID through `nexusPages().byId` | `assignment.ts:56`, `Trash/spend.ts:265` | — |
| ↳ `changedKeys`, `governedRoot`, `outsideArchive`, `unsweptLine`, `sweepCount` | — | Small helpers | `changedKeys`: `governedWrite.ts` only. `governedRoot`: `Nexus/cascade.ts` only. `outsideArchive`: `cascade.ts`, `keyHolders.ts`. `unsweptLine` is user copy imported by 7 files | `unsweptLine` is a notification string living in an engine file |
| `Core/Properties/repairSweep.ts` · `runRepairSweep` | 45 | On open, behind Repair Properties On Open (default off, `personalization.ts:146`), reconciles exactly the files the index seed re-read | `Nexus/handlers.ts:113` | Yes. It hand-rolls `pageWorldOf` (see 04-10) |
| `Core/Properties/propertyWrite.ts` | 30 | Window-side round trip: `write`, `replay(record?)`, `retryOwed`, `warnOwed` | `Schema/PropertyFrame.tsx`, `Schema/useOptionEdit.tsx` | It's window-side in a host-mixed folder (I-042) |
| `Core/Properties/keyHolders.ts` · `confirmedKeyHolders`, `keyedHolders` | 66 | Read-only holder enumerators: a disk-confirmed holder list (pages + every Space sidecar), and values-by-ID for a strip | `registryProperty.ts:126-128`, `deleteProperty.ts:142`, `removeProperty.ts:40` | No. It's index-adjacent (I-042 proposes `Core/Index`) |
| `Core/Properties/registryProperty.ts` (journal parts) | 77-100, 170-207 | `createProperty`'s two journal guards; `rekeyProperty` writes the record and ignores the slot's refusal | 03's territory | — |
| `Core/Properties/deleteProperty.ts` (journal parts) | 112-161 | Bundle snapshot → journal (refusal ignored) → strip → unassign → config reach → registry **last** | 03 | — |
| `Core/Properties/optionOps.ts` (journal parts) | 78-110, 144-151, 236-266, 340-386 | `owedKeys` guard, `OWED` refusals when the slot refuses, Clear's own-property refusal | 03 | — |
| `Core/Contexts/contextJournal.ts` | 49 | The `RenameJournal` record, its decoder, and same/sameEntity | `contextCascade.ts` only | It's the Contexts twin of `propertyJournal.ts` |
| `Core/Contexts/contextCascade.ts` | 352 | Context and Space rename ops (+ a `from` Try Again path), `replayPendingRename`, and the unlink sweeps the Trash delete uses | `Nexus/handlers.ts:86`, `Nexus/mutate.ts`, `Trash/delete.ts` (`unlinkContextKey`, `unlinkSpaceValue`), `Trash/spend.ts` (`rekeyContext`) | Mostly. The unlink sweeps are the Trash's delete half |
| `Core/Nexus/handlers.ts` · `openNexusSequence` | 57-118 | The open path, with two replays at two points (:86, :111), the repair sweep, and whole-Nexus option registration (:113-115) | — | Yes |
| `Core/Nexus/configReach.ts` | 420 | Rewrites saved views, View Tiles, the Matrix filter, and Open In Preview for an option, property, or container edit (a `ROLES` table over `SavedView`) | `deleteProperty`, `removeProperty`, `optionOps`, `Trash/delete`, `Trash/spend`, `replaySchemaCascade` (via ops) | Inferred: mostly Views knowledge (roles over `SavedView` fields), so it may belong beside `Core/Views` |
| `Core/Nexus/cascade.ts` (property parts) | 64-68, 96-169, 271-274 | `spaceArm` (tree-gated sidecar arm), `deleteCascade`'s Link strip, Link-cache edits on a re-spell | Trash, settle, mutate | Yes |
| `Core/Nexus/settle.ts` (property parts) | 161-168, 282-305 | Registers held Multi-Select options at each settle, plus `returningCascade` for a restore | — | `returningNames` (269) is exported only for `settle.test.ts` |
| `Core/Trash/restoreScrub.ts` | 213 | Reconciles returning content against the live world (`currentKeys`, `scrubReturning`) and repairs a landed artifact's links (`repairLanded`) | `spend.ts`, `settle.ts:302` | Yes. It has two hand-rolled sidecar loops |
| `Core/Trash/spend.ts` (property parts) | 101-109, 191-245 | The property-bundle restore arm, the Context re-key loop (194-197), and Link refill | `Nexus/mutate.ts` | Yes |
| `Core/Trash/holdings.ts` · `refillTrashed` | 68-86 | Writes Link values back into trashed copies, one file per sweep call | `spend.ts` | Yes |
| `Core/Trash/restoreProperty.ts` | 78 | Re-creates a property from its bundle (via `createProperty`, which consumes a journaled delete) | `spend.ts:103` | Yes |
| `Core/Trash/delete.ts` (write-ahead block) | 84-140 | The bundle record written before any sweep. No open-time replayer ("delete again finishes it", I-036) | `Nexus/mutate.ts` | Yes |
| `Core/Bundles/record.ts` (property entity) | 73, 94 | The property bundle is artifact-less: def, values by ID, assignments, caches, `partial` | Trash | Yes |

**Describers:** `propertyJournal.test.ts:47` ("never displaced") and `journalWiring.test.ts:306-319` ("an unrelated op neither displaces") pin the same slot rule twice. The generic slot's unreadable/corrupt behavior is tested only through the property binding (`journalWiring.test.ts:321-345`). `cascadeRace.test.ts` is one 85-line test whose `describe` still carries a review label ("F1 —", line 58). `contextJournal.test.ts` is one 20-line test of the decoder's title check.

##### Mechanism Map — VERIFIED (spot-checked; one correction)

**Journals (write-ahead records): 3 in kind, 2 replayed.**
- **J1 `property-cascade.json`** (`propertyJournal.ts:42`): rename, delete, option-rename, and option-remove, in **one slot**.
- **J2 `context-rename.json`** (`contextJournal.ts:45`): Context and Space renames, in one slot that supersedes for the same entity.
- **J3 the Trash bundle record** (`Trash/delete.ts:84` "Write-ahead:"; for a property, `deleteProperty.ts:120` `snapshot`). This is a snapshot rather than an intent, and nothing replays it.

A property delete writes **both** J3 and J1 (`deleteProperty.ts:120-123`).

**Replayers: 4 entry points.**
- **R1 `replaySchemaCascade`:** runs at open (`handlers.ts:111`, after the index seed, only for a new root) and as Try Again (`Properties/handlers.ts:176`, taking a record the renderer hands back, `answered = true`).
- **R2 `replayPendingRename`:** runs at open (`handlers.ts:86`), before the tree and before the index seed, on every open including a re-point.
- **R3 `renameContextOp` / `renameSpaceOp` with `from`:** the Context Try Again (`contextCascade.ts:207-211, 260-264`; `mutate.ts:68-76`). It re-derives the sweep and bypasses the journal.
- **R4 the `'owed'` refusal → `replay()` with no record:** replays whatever the slot holds (`propertyWrite.ts:14-15`).

**What each journal defends, and whether it's reachable:**
- **J1 rename / option-rename:** the window between the registry commit and the end of the sweep. Without the record, files still holding the old key become foreign once the registry names only the new one (`registryProperty.ts:170` docblock; `optionOps.ts:241`).
- **J1 delete / option-remove:** a strip cut short. For option-remove the def's option list still holds the key and the record says to finish the strip (`replaySchemaCascade.ts:76`); for delete the record carries the key itself and the registry drop lands regardless of skips (`deleteProperty.ts:159`; replay's freed arm, `replaySchemaCascade.ts:55`).
- **J2:** the window between the folder relocate and the registry title commit (`contextCascade.ts:193`). The replay finishes the relocate, the cascade, and the commit (`:304-320`).
- **J3:** nothing at open, since no replayer exists. A delete cut short leaves its bundle, and deleting again finishes the delete.
- **Reachability:** The common producer isn't a crash, it's a **skipped file**. Examples: a lock or write that throws (`governedSweep.ts:66-70`), a file unreadable at read time (`:99-101`), or an evicted cloud placeholder (`atomicWrite.ts:140` comment). Each leaves a record owed for Try Again or the next open, and it's reachable on any iCloud-backed Nexus. The crash case proper is a force-quit or power loss during a long sweep. Inferred: plausible at Benchmark scale and rare at NexusOS scale. The corrupt-slot and unreadable-slot guards (`journalSlot.ts:36-38`) defend a damaged `.nexus/` file, which is reachable but rare.

**Write loops (enumerate → lock → read → decide → write): 13 loops in 10 functions.**
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
12. `refillTrashed` (`holdings.ts:83`, one `sweepGovernedRoots` call **per file**)
13. `rewriteTileConnections` (`tilesFile.ts:304`)

`assetMigrate.ts:117` is a 14th, outside the domain. Loops 9-12 are hand-rolled sidecar writers beside an engine that has a sidecar arm.

**Read-only enumerators (candidate lists and reads): 12.**
- `nexusCorpus` (`indexSeed.ts:73`)
- `governedReach` (`governedSweep.ts:43`)
- `collectionFolders` (`:36`)
- `spaceSidecars` (`spaceSidecar.ts:50`, a disk scan)
- `sweepMembers` (`contextCascade.ts:65`): index or corpus, **not** through `governedReach`
- `confirmedKeyHolders` (`keyHolders.ts:14`): two loops, all Space sidecars again
- `keyedHolders` (`:38`)
- `snapshot` (`deleteProperty.ts:63, 74`): all Space sidecars again
- `registerHeldOptions` (`optionOps.ts:125-141`)
- `artifactFiles` (`restoreScrub.ts:123`)
- `trashedHolders` (`holdings.ts`)
- `archivedSets` / `archivedSetIds` (`configReach.ts:325-345`)

**Frozen and live world builders: 9.**
- `contextWorldOf` (`contextResolve.ts:27`, memoized)
- `governedWorld` (`:47`)
- `spaceWorldOf` (`:56`)
- `pageWorldOf` (`contextWrite.ts:75`)
- `runRepairSweep`'s per-folder world map (`repairSweep.ts:22-35`, a hand-rolled `pageWorldOf`)
- `scrubReturning`'s destination world (`restoreScrub.ts:145`, the same shape again)
- `currentKeys` (`restoreScrub.ts:54`, a key/word matching world)
- `linkWorld` + `frozenWorld` after `nexusPages`, built fresh at 3 sites (`assignment.ts:81,90`, `restoreProperty.ts:57-58`, `spend.ts:114,129-130`), with `spend.ts:229` re-wrapping either that `world` or a settled tree's (04-11)
- `deleteCascade`'s `after` index (`cascade.ts:111`, `linkWorld` minus the deleted subtree)

**Which are one pattern:**
- J1/J2 and R1/R2/R3/R4 are one "intent record → finish forward" pattern split across two vocabularies, two open points, and three Try Again forms.
- Write loops 2 and 9-12 are one pattern: rewrite named Space sidecars.
- `pageWorldOf`, the repair map, and `scrubReturning`'s world are one builder.
- The `frozenWorld(linkWorld(...))` sites are one builder.

I-036's footnote source (`.claude/Planning/Data Layer — Investigation Reports/E — Governed Data Sweeps.md`) **doesn't exist** at HEAD, so its "nine loops and five enumerators" can't be checked. The count above replaces it.

##### Findings

###### 04-02 · A property delete commits the registry last for no reason the record needs, and that order creates the crash/restore ambiguity — CORRECTED
- **Lens:** Fix the Origin, One Way
- **Now:**
  - `stripAndRemove` removes the definition unconditionally after the strip (`deleteProperty.ts:159`).
  - The replay's delete arm then has to tell "the def still present = crash" from "the def present = a restore". It does that with `crashed = !answered && def.key === journal.key` vs `freed` (`replaySchemaCascade.ts:52-56`), plus `createProperty` consuming the record on a restore (`registryProperty.ts:94-100`, tested at `journalWiring.test.ts:274-304`), without which the `crashed` arm would strip a restored living property at the next open (`registryProperty.ts:94` comment).
  - No deferral rationale applies to the property delete. The "a strip that could not read every holder defers the registry drop" sentence the scout attributed to the delete belonged to the option removal (`13d7215d2`, `removeOption`'s docblock; last seen in `e5c619124`), which still defers (`optionOps.ts:228-229`). The property delete has dropped its def regardless of skips since `13d7215d2` ("with the def now gone and the name free, the replay's freed-name arm re-strips the stragglers").
  - The record carries the key (`propertyJournal.ts:11`), so the replay never needs the def to find it.
  - Registry-last also leaves a window where an app value write lands behind the strip (A-01).
- **Better:** Registry first, the way rename already commits (`registryProperty.ts:170` docblock) [Intended as B-2]. The replay keeps only the `freed` arm. The `crashed`/`answered` logic and the create-side consumer go, because a restored or re-created def under the key makes `freed` false on its own and the replay clears the record. Removing the consumer before 03-01's keyed records leaves a re-created property's record holding the single slot until the next open or Try Again, which blocks other properties' option ops (L-07), so land it with 03-01.
- **Behavior:** Changes behavior only inside the crash window: a crashed delete's property is gone from the panel at once instead of lingering until the next open. A crash between the bundle mint and the registry drop leaves a Trash record for a property still alive (also true today for a crash before the journal write).
- **Estimate:** −15 · read (the order and the record's key), inferred (the replay simplification)

###### 04-04 · `RenameJournal.skipped` is written and decoded but never read — VERIFIED
- **Lens:** Less Stuff, Real Purpose
- **Now:** `settleJournal` rewrites the record with the skip list (`contextCascade.ts:183-186`), and the decoder parses it (`contextJournal.ts:30-32`). But every replay re-derives members from `queryMembers ?? nexusCorpus` (`contextCascade.ts:72`), and nothing reads `j.skipped`. The header's "persisting the skip list updates the held record" (`contextJournal.ts:1`) is the only reason `same` excludes it (`:36-40`).
- **Better:** Drop the field. `settleJournal` becomes "clear if nothing skipped", as the property ops already do (`registryProperty.ts:204`). Rewrite the header.
- **Behavior:** Preserving
- **Estimate:** −12 · read

###### 04-05 · Space sidecars are found by disk scan on every property sweep and written by four hand loops; the tree already knows them — VERIFIED
- **Lens:** Hot Paths Stay Cold, One Write Path, Look Outward
- **Now:**
  - `sweepGovernedRoots`' sidecar arm reads **every** Space sidecar found by `spaceSidecars`' folder scan (`governedSweep.ts:116-137`; `spaceSidecar.ts:50-57`). Property plans set that arm unconditionally (`registryProperty.ts:115`, `optionOps.ts:204`, `deleteProperty.ts:144`, `contextCascade.ts:76`), while `cascade.ts:65-68` (`spaceArm`) and `sweepRootsById` (`governedSweep.ts:208`) gate it from the tree.
  - `confirmedKeyHolders` (`keyHolders.ts:24`) and the delete `snapshot` (`deleteProperty.ts:74`) scan all sidecars again. One property delete scans them three times: the count preview, the snapshot, and the strip.
  - Separately, `scrubReturning` (`restoreScrub.ts:183-192`), `repairLanded` (`:208-211`), the Context re-key (`spend.ts:194-197`), and `refillTrashed` (`holdings.ts:83-85`) each hand-roll `rmwJsonStrict` over named sidecars, with three failure accountings. `scrubReturning` and `refillTrashed` discard the result, so a failed sidecar write is silent; the other two count it. `scrubReturning` meanwhile refuses the whole restore when a *page* skips (`restoreScrub.ts:180`).
  - The writers themselves agree: `rmwJsonStrict` → `writeJson` → `atomicWriteFile(jsonText)` (`atomicWrite.ts:97, 141-160`) is the same lock, echo, and re-dating as the sweep arm (`governedSweep.ts:119,133-134`). They differ only in how a read miss is classed (`readJsonStrictly`'s absent/unreadable/corrupt vs `readTextOrNull` + `parseJsonObject`).
- **Better:** `sweepGovernedRoots` takes sidecar paths in its `files` list and dispatches by basename, as `governedRoot` (`:63`) and `keysPutBack` (`:174`) already do. Property and Context sweeps pass the Spaces the tree says hold the key (`s.values`, as `spaceArm` reads); loops 9-12 pass the artifact's own sidecar paths (`artifactFiles`, `spaceSidecarsIn`). That retires `spaceSidecars`, `spaceArm`, the separate `sidecars` plan field, and loops 9-12, with one skip accounting. I-036's *Solution* already proposes the tree-sourced half, conditioned on one commit order and a replay that runs once the tree is held (04-07).
- **Behavior:** Changes behavior.
  - A sidecar write failure in a restore scrub or refill becomes a counted skip reported as a warning, so the restore still lands [Intended as G-3].
  - Pages and Spaces find their holders through one shared mechanism, the best available scan for both [Intended as G-1]. Sourcing Space candidates from the tree's `s.values` trades away the disk truth `keyHolders.ts:13` and `spaceSidecar.ts:49` defend (an outside edit not yet settled; a Context folder a rename moved ahead of the tree); pages already trust the index through `queryKeyHolders`, so tree-sourcing makes the two consistent, and planning weighs that trade when it picks the scan.
- **Estimate:** −35 · read (sites), inferred (delta)

###### 04-06 / 03-12 · Every open re-checks every page under every Multi-Select Collection — CORRECTED
- **Lens:** Hot Paths Stay Cold
- **Now:** `handlers.ts:113-114` runs `registerHeldOptions(root)` with no `rels`, and that is the only caller doing so (`settle.ts:163` passes changed paths). It walks `everywhere` (`optionOps.ts:125-141`): every Collection and Set carrying a Multi-Select, a `readPageRecord` per page whether the page holds the key or not, under the schema lock, on every open. `readPageRecord` is a `cachedParse` (`readNexus.ts:134-140`), so after the open walk has parsed every page the per-page cost is one `stat`, plus a fresh read only where the file changed since; Spaces come from the tree with no disk read (`optionOps.ts:136`). The settle already registers changed files incrementally, and the index holds every page's values (`Platform/stores.ts:45-48`, `readPageRelations`). Added in `7a4452592` (10-04) and documented at `PropertiesPM.md:74` ("for every file once the Nexus opens"). NexusOS holds 3 Multi-Select defs.
- **Better:** Read members from the index (`readPageRelations(paths).pages[*].values`), which is ready at that point (the seed has run, `handlers.ts:108`). That preserves behavior and costs one query in place of N stats. Or narrow it to `reread.rels`, which drops the catch for a registry edited while closed and is a decision (see the Ledger). 03-12's narrower direction (read only `queryKeyHolders(def.key)` per Multi-Select def) still reads files and is subsumed.
- **Behavior:** Preserving, via the index
- **Estimate:** −5 · read (the walk). Inferred: that `PageRelations.pages[*].values` holds every frontmatter value comes from the type (`stores.ts:47`) and `indexSeed.ts:63`'s "same latitude page_values gives" comment. Scale is unmeasured (no Benchmark Nexus on disk).
- **Reconciler:** merged 03-12; "reads each from disk" corrected to a stat plus cached parse per page.

###### 04-07 · Two replays at two points of the open, and the Context one runs blind — CORRECTED
- **Lens:** One Way, Hot Paths Stay Cold
- **Now:** `replayPendingRename` (`handlers.ts:86`) runs right after `ctx.openStores` binds a fresh store (`:85`), before `readNexus` (`:89`) and before `seedContentIndex` (`:108`). `indexReady()` compares the bound store with the one the last seed marked (`contentIndex.ts:43-50`; `indexSeed.ts:243`), so `queryMembers` returns null and the replay sweeps the whole corpus (`contextCascade.ts:72`). It also runs on a re-point, where `replaySchemaCascade` (`:111`) doesn't.
- **Better:** One replay step after the seed, inside the `root !== priorRoot` block, dispatching every owed record (with 03-01). The Context folder relocation the replay does (`contextCascade.ts:312-313, 342-348`) would then need the tree read again after it. Inferred: that's the reason it sits early, and it's the commit-order question in *§Approaches*.
- **Behavior:** Preserving
- **Estimate:** ±0 (the move saves the blind corpus pass but adds a tree read when a relocation is owed) · read

###### 04-08 · Four Try Again vocabularies — VERIFIED
- **Lens:** One Way, Less to Understand
- **Now:**
  - A property cascade replays a carried record (`propertyWrite.ts:6, 22-23`; `PropertyFrame.tsx:244, 300`).
  - The `'owed'` refusal replays whatever the slot holds (`propertyWrite.ts:14-15`).
  - A Context or Space rename resends the request with `from` (`mutate.ts:68-76`, `nexusSlice.ts:255-257`), through a second op path (`contextCascade.ts:206-211, 259-264`, `sweepAgain` at `:101-109`). `MutateOutcome.retry` (`mutateRequest.ts:22`) has this one producer (`mutate.ts:76`).
  - Remove and Clear offer no Try Again at all: a plain `fault` (`handlers.ts:62-65` `unsweptReply`; `optionOps.ts:352`).
- **Better:** With 03-01, there's one `replay(entityId)` everywhere. The `from` branches, `sweepAgain`, and `MutateOutcome.retry` leave.
- **Behavior:** Changes behavior. Remove and Clear gain Try Again (03-03) [Intended as B-1, C-2].
- **Estimate:** −30 · inferred

###### 04-10 · `runRepairSweep` hand-rolls `pageWorldOf` with an async memo the tree makes unnecessary — VERIFIED
- **Lens:** Look Outward, Less Stuff
- **Now:** `repairSweep.ts:22-35` keeps a `defsByFolder` map and awaits `assignedDefs` per folder. `assignedDefs` answers from the held tree when it can (`assignment.ts:38-41`), and `liveTreeOf` already returned that tree (`repairSweep.ts:24`); the folder it's handed comes from `owningCollection` on that same tree (`:27-28`), so its disk fallback is unreachable here. `pageWorldOf` (`contextWrite.ts:75-79`) and `scrubReturning` (`restoreScrub.ts:145`) build the same world.
- **Better:** A synchronous `governedWorld(tree, byKey(containerSchema(tree, rel)))` per file (`treePatch.ts:126-129`), as `registerHeldOptions` already reads the schema (`optionOps.ts:132`). One shared builder replaces the three sites.
- **Behavior:** Preserving
- **Estimate:** −12 · read

###### 04-11 · `frozenWorld(linkWorld(tree, archived))` after `nexusPages` is built three times — CORRECTED
- **Lens:** One Way
- **Now:** The fresh chain appears at `assignment.ts:81,90`, `restoreProperty.ts:57-58`, and `spend.ts:114,129-130` (the last with `back` and `targets`). `spend.ts:229` doesn't rebuild it: it re-wraps the existing `world` or a settled tree's `linkWorld`. `deleteCascade` builds the same index minus the deleted subtree (`cascade.ts:110-111`).
- **Better:** One `frozenOf(root, tree, { more, targets })` in `heldPages.ts` returning `{ byId, archived, frozen }`, if it nets negative; with three two-line sites against a new helper it's close to even, so it's worth doing only alongside 02-04's move of `Frozen`/`frozenWorld` out of the codec.
- **Behavior:** Preserving
- **Estimate:** −2 to −4 · read
- **Reconciler:** four sites corrected to three fresh builds; estimate lowered from −6.

###### 04-12 · I-039's race is closed for the `mutate` ops — VERIFIED
- **Lens:** Describers Get Swept
- **Now:** Since `c8e4b18ca` (10-17), `rename` and `movePage` run through `addressed` → `inSettleTurn` (`mutate.ts:91-96, 125-126, 210-211`), and a Space or Context delete runs through `underContexts(() => inSettleTurn(...))` (`:131-134`). Both chain on the one `inTurn` queue (`settle.ts:65, 241-245`). I-039's "nothing orders them" (`IssuesPM.md:839`) no longer holds for the app's page rename and move. Two other page-moving paths aren't on that queue: Sync's arrival rename (`Sync/Arrival/land.ts:135`) and adoption's renames (`Nexus/adopt.ts:56, 126`). Neither of those, nor an outside move, is ordered against the delete, and `undoSweep`'s `now === null` pass-over (`governedSweep.ts:156`) still applies to them.
- **Better:** Re-scope I-039 to Sync arrivals, adoption renames, and outside moves during a refused delete.
- **Behavior:** Preserving
- **Estimate:** 0 code; one Issues edit · read

###### 04-14 · The shared engine and slot live in Properties — CORRECTED
- **Lens:** Clearer Boundaries (I-042)
- **Now:** `governedSweep.ts` is imported by Contexts (`contextCascade.ts`, `spaceSidecar.ts` type-only), Nexus (`cascade.ts`, `configReach.ts`), Trash (`holdings`, `restoreScrub`, `spend`), and Settings (`exclusionScan.ts`): 8 files outside Properties. `journalSlot.ts` is imported by Contexts. `unsweptLine`, a user-facing string, lives in the engine and is imported by `configReach.ts:25` among others.
- **Better:** Move `journalSlot.ts` to `Core/Files` (its imports are Files, Platform, and Paths, `journalSlot.ts:2-4`). *(reconciled with 02-03/02 A-01)* `governedSweep.ts` doesn't fit `Core/Files`, which imports nothing above Nexus leaf utilities, since it reads the Nexus tree, the Index, and Contexts (`governedSweep.ts:8-21`); `Core/Nexus` beside the governed-root module (`Nexus/governedRoot.ts`) is the recommended home over staying in Properties (a judgment, not settled by the imports). Move `unsweptLine` beside the notification copy or `CascadeReport`. I-042's part (2) (`IssuesPM.md:1013`) is re-scoped to match.
- **Behavior:** Preserving
- **Estimate:** ±0 · read

###### 04-15 · Context sweeps choose their candidates differently from property sweeps — CORRECTED
- **Lens:** One Way, Behavior Is a Decision
- **Now:** `sweepMembers` uses `queryMembers ?? nexusCorpus` (`contextCascade.ts:72`) directly, over every content file in the watch scope (`indexSeed.ts:73-75`). Property sweeps filter through `governedReach` to Collections + Archive (`governedSweep.ts:43-57`), and `deleteCascade` uses `governedReach` too (`cascade.ts:129`). The scout's inference that loose files are refused by `sweepParse` anyway is wrong: `sweepParse` admits any identity short of unknown, identity-less pages included, regardless of location (`pageFile.ts:252-260`). So a Context rename or delete rewrites a tag on a page outside every Collection, and a property sweep doesn't. NexusOS has such files: `Agenda/II. Tasks/PM-QuickFilter.md` sits outside its 6 live Collections and holds a Context-titled key.
- **Better:** One reach mechanism for properties and Contexts [Intended as G-1] whose stated rule is "a change reaches every file where its key means something": a property key on the pages of Collections and the Archive, and a Context tag on any content file, loose pages included [Intended as G-2]. The rule is written where the shared mechanism reads it.
- **Behavior:** Preserving
- **Estimate:** −2 or +1 (a comment) · read
- **Reconciler:** outcome difference established; Behavior corrected from Preserving.

###### 04-16 · Slot tests are duplicated and filed under the property binding — VERIFIED
- **Lens:** Describers Get Swept
- **Now:** `propertyJournal.test.ts:47-58` overlaps `journalWiring.test.ts:306-319`. The generic slot's unreadable/corrupt rules are tested only through `writeSchemaJournal` (`journalWiring.test.ts:321-345`). `cascadeRace.test.ts:58` carries the review label "F1 —".
- **Better:** Put one slot test file beside the slot, wherever 03-01 lands it, and keep the op-wiring tests op-specific.
- **Behavior:** Preserving
- **Estimate:** −30 test lines · read

###### A-01 · A property delete's registry-last order lets an app value write land on a page its strip already passed — INFERRED
- **Lens:** Fix the Origin
- **Now:** A page value write reads the definition inside the page's own lock, outside the schema lock (`setProperty.ts:67-71`; `mutate.ts:198-202`). During a delete, the def stays in the registry until after the strip and the config reach (`deleteProperty.ts:153-159`). A write to that property on a page the strip has already rewritten finds the def, lands the key, and is left behind once the def drops: a value of a deleted property, outside every schema, that no record owes. Rename avoids this by committing registry-first, which the page-lock comment relies on (`setProperty.ts:67`).
- **Better:** 04-02's registry-first order: the write then answers `NO_PROPERTY`.
- **Behavior:** Changes behavior only in the race window.
- **Estimate:** 0 beyond 04-02 · inferred (reproduction would settle it)

##### Behavior Ledger

| Status | Behavior | Where | Code Cost | Origin | Classification |
|---|---|---|---|---|---|
| VERIFIED | Option rename or remove is refused while **any** other change's record is owed | `optionOps.ts:242, 377`; `propertyWrite.ts:14-15` | ~15 lines + an `'owed'` error code | `cb2f3a8a0` (MetadataV3 Task 6-4) | **Agent's choice.** It exists to protect the one slot (03-01) |
| VERIFIED | Clear is refused while its own property's option record is owed | `optionOps.ts:346-348` | 3 | `cf4dee4e6` (Phase 9 review) | **Agent's choice.** Reasonable per-entity, and it survives 03-01 as the general rule |
| VERIFIED | Rename, Key Format change, and delete run **unjournaled** while the slot holds another record | `registryProperty.ts:183`, `deleteProperty.ts:123` | 0 (an ignored return) | The `e744714fc` slot refusal plus the `journalSlot.ts:1` header | **Accident.** Crash safety silently lapses |
| VERIFIED | Option remove offers Try Again only while its record holds the slot | `replaySchemaCascade.ts:76-79`; `PropertiesPM.md:123` | ~4 | `6e2d61669` | **Agent's choice** forced by the single slot |
| CORRECTED | A create steps aside from an owed rename's old key | `registryProperty.ts:63,77-78` (`freeLabel` `owed`) | ~4 | `cf4dee4e6` (Phase 9 review) | **Agent's choice.** It survives as "owed old keys count as held" |
| CORRECTED | A later rename of the same Context or Space displaces the earlier rename's owed record, so after a restart the first rename's leftovers are never swept (the in-session Try Again's `from` still covers them until then) | `journalSlot.ts:18-19, 37`; `contextJournal.ts:42-45`; `mutate.ts:68` | ~6 | `supersedes` predates the `759a2dbef` monorepo move | **Agent's choice with a stated reason** (a replay that trusts the record's before-state, `journalSlot.ts:18`); the lost leftovers after a restart are the **accident** |
| VERIFIED | A Space or Context delete that misses a member puts everything back and refuses, while every property op proceeds and owes | `contextCascade.ts:166-181`; `optionOps.ts:228-229`; `deleteProperty.ts:125-128` | `undoSweep` + `keysPutBack`, ~35 | `contextCascade.ts:166` comment ("A refused delete leaves no record to restore from") | **Agent's choice.** Every delete is meant to finish what it can and offer Try Again for the rest, Contexts and Spaces included [Intended as B-3] |
| CORRECTED | A property delete with skipped files still removes the definition, leaving the stragglers to the replay's freed arm | `deleteProperty.ts:159`; `replaySchemaCascade.ts:55` | 0 | The shape since `13d7215d2`; it was never deferred (the deferral belonged to option removal) | **Agent's choice** |
| VERIFIED | An option remove that skipped a file leaves the option and every view reference in place | `optionOps.ts:228-229` | 1 | MetadataV3 Task 6 | **Agent's choice.** Coherent with pages-first |
| VERIFIED | Remove-from-Collection with skipped files: no Try Again, and a re-run does nothing | `removeProperty.ts:33, 60-61`; `handlers.ts:62-65` | 0 | `874f687d2` | **Accident** (03-03; same as 03's L-09) |
| VERIFIED | A Context or Space delete cut short by a crash has no recovery until the user deletes again | `Trash/delete.ts:84` | 0 | I-036 | **Agent's choice** |
| VERIFIED | Every open registers held Multi-Select members from every file | `handlers.ts:114`; `optionOps.ts:125-141` | ~10 | `7a4452592`; `PropertiesPM.md:74` | **Agent's choice.** It's the only catch for a registry edited while closed; the cost (N stats under the schema lock) is the issue (04-06) |
| CORRECTED | A corrupt journal is set aside as `.property-cascade.json.bad-<id>` in `.nexus/` and never cleaned | `journalSlot.ts:38`; `atomicWrite.ts:220-221` | 1 | `e744714fc` (F-051) | **Agent's choice**, and the shared policy for Pommora's strict JSON files (`updateNexusFile` sets aside the same way, `atomicWrite.ts:225`), so any cleanup rule is Nexus-wide, not journal-specific. It leaves litter in a user-legible folder |
| VERIFIED | A Context replay that finds the freed old title re-minted by another Space discards the record | `contextCascade.ts:337-340` | 4 | Contexts journal arc | **Agent's choice.** Defensible |

##### Approaches

**A · One owed-work ledger — INFERRED.** This is I-036's shape: every property, Context, and Space keeps its own record, and every change that rewrites many files writes one [Intended as B-1]. Planning presents today's recovery files, their owners, and how a change flows through them beside the proposed structure before designing it.
- **Shape:** One `.nexus/` file maps entity → record, with record kinds rename, delete, option-rename, and option-remove for properties, and rename for Contexts and Spaces. One decoder, one `op`-dispatched replay at one open point after the seed (04-07), one Try Again (`replay(entityId)`), and one rule: an op on an entity waits on or composes with its own record, and every record's old keys count as held (03-01). A create on an owed delete's key is refused with the general unfinished-change message, and its Try Again re-runs that cleanup [Intended as B-4].
- **Removes:**
  - `contextJournal.ts`, folded into a record kind
  - `supersedes`, and the `answered` branches
  - Both `OWED` refusals, and the unjournaled paths
  - The `record?` channel argument and its narrow
  - The `from` Try Again path and `sweepAgain`, plus `MutateOutcome.retry`
  - The `createProperty` consumer (with 04-02), and the `RenameJournal.skipped` field
- **Estimate:** about −120 to −180 lines of code, with comparable test shrinkage.
- **Costs:** One commit order must be chosen. Property rename commits registry-first, so a value written mid-sweep lands under the new key: page value writes resolve the def inside the page lock (`setProperty.ts:67`), and `NEW_KEY_IS_FRESHER` resolves collisions. Context rename commits registry-last, so a tag written mid-cascade lands under the old key with a `'merge'` collision rule (`contextCascade.ts:32-33`); app tag writes already serialize under `underContexts` (`mutate.ts:81-89`), so the order mostly matters for outside writes. Registry-first everywhere, the order every multi-file change follows [Intended as B-2], makes every replay "sweep only" and moves Context rename off its registry-last order and its `'merge'` rule.
- **Risks:** The replay must still run before the tree is trusted if a Context folder relocation is owed. Sync excludes both journal files (`exclusion.ts:58`), so the ledger stays per-device, which is unchanged.

**B · The Trash bundle as every delete's write-ahead record — CORRECTED.**
- **Shape:** A bundle record gains a `pending` phase that its op clears once its sweep lands. The open replays pending bundles, finishing a property, Context, or Space delete's strip, folder move, and config reach.
- **Removes:** J1's delete kind and its replay arm, plus the double write-ahead in `deleteInner` (bundle and journal).
- **Adds:** The crash recovery Context and Space deletes lack today (I-036).
- **Costs:** An open-time scan of `.trash` records (O(bundles), unless indexed). The System Trash mode mints no bundle for content deletes (`delete.ts:79-82`), so those still need a ledger entry, which means B composes with A rather than replacing it. A property delete mints its bundle in every mode (`deleteProperty.ts:46`, 03's L-11), so B covers it in both.

**C · No crash journaling; in-session owed records plus idempotent re-run — INFERRED.**
- **Shape:** Keep `skipped` → Try Again in memory only, and make every op idempotent so re-issuing it finishes the work.
- **Removes:** Both journal files, both replayers, the slot, and every guard in 03-01 (about −300).
- **Costs and risks:** A crash during a long sweep leaves keys orphaned until the user notices and redoes the rename or delete. A rename re-run can't recover, because the old key no longer appears in the registry. This contradicts the documented forward-replay promise (`PropertiesPM.md:123`), and the crash window is real on large sweeps, so the decision log rejects it (*§Rejected*).

##### Cross-Domain Notes
- **03:** `rekeyProperty`, `deleteInner`, and the option ops own the journal call sites (03-01). The commit-order decision lands in their code.
- **03:** `configReach.ts` is mostly Views knowledge (the `ROLES` over `SavedView`) living in `Core/Nexus` (inferred).
- **02:** `registerHeldOptions`' open pass (04-06) and `owedKeys` filtering in adoption are Values behavior gated by this domain's slot.
- **02:** `reconcileGovernedRoot`'s `skip` param exists for `governedWrite.ts:13` and `restoreScrub.ts:186`, the in-transit Context key.
- **02:** the sweep's sidecar arm (`governedSweep.ts:116-137`, `parseJsonObject`/`jsonText`/`atomicWriteFile`) and the value writes' `rmwJsonStrict` (`contextWrite.ts:85`, `atomicWrite.ts:141-160`) are two sidecar read-modify-write paths with the same lock and write; 04-05's dispatch-by-basename folds loops 9-12 and leaves the value write on `rmwJsonStrict`.
- **08:** `repairOnOpen` defaults off (`personalization.ts:146`). The open sequence runs `settleNow` twice around the repair sweep (`handlers.ts:112, 115`).
- **08:** `replayPendingRename` running on a re-point while `replaySchemaCascade` doesn't is an open-path asymmetry (`handlers.ts:86` vs `:87-116`).
- **Trash:** `scrubReturning` and `refillTrashed` drop sidecar write failures silently (`restoreScrub.ts:184`, `holdings.ts:84`).
- **Settle:** `returningNames` (`settle.ts:269`) is exported only for its test.
- **Issues:**
  - I-036 still holds, and its footnote's report path is missing; its two-replay citation reads `handlers.ts:82,102`, now `:86,:111`.
  - I-039 is closed for the `mutate` ops; Sync arrivals and adoption renames remain (04-12).
  - I-042 still holds for `governedSweep`, `journalSlot`, and `keyHolders`.

##### Reconciliation Log

| ID | Status | Reason | Evidence |
|---|---|---|---|
| Inventory (`governedSweep` callers) | CORRECTED | "12 files" → 19 non-test importers, 8 outside Properties; `unsweptLine` imported by 7 | `git grep -l "governedSweep'"`; `git grep -l unsweptLine` |
| Mechanism Map | VERIFIED | Spot-checked every loop and replayer site; the J1 delete line and the `frozenWorld` count corrected | `deleteProperty.ts:159`; `replaySchemaCascade.ts:55`; `spend.ts:229` |
| 04-01 | REMOVED | Merged into 03-01 (same origin; 03-01 carries the guard catalog and I-036's clause analysis); its `supersedes`, replay-before-op, and Try-Again-by-id parts moved there | `journalSlot.ts:19,33-41`; `contextJournal.ts:42-45`; `replaySchemaCascade.ts:54,78` |
| 04-02 | CORRECTED | The registry-last rationale quoted was option removal's, never the property delete's; the delete has dropped its def regardless of skips since `13d7215d2`; the record carries the key | `git show 13d7215d2` (`removeOption` docblock, `deleteProperty.ts` diff); `e5c619124`; `propertyJournal.ts:11` |
| 04-03 | REMOVED | Merged into 03-01 (the three policies, plus Context renames at `contextCascade.ts:217`) and 03-15 (the `PropertiesPM.md:123` sentence) | `registryProperty.ts:183`; `deleteProperty.ts:123`; `optionOps.ts:242,377` |
| 04-04 | VERIFIED | Nothing reads `j.skipped` | `contextCascade.ts:72,183-186`; `contextJournal.ts:1,30-40` |
| 04-05 | VERIFIED | Behavior sharpened: `scrubReturning` refuses on page skips, so how sidecar skips count is a decision; I-036's *Solution* already proposes the tree-sourced half | `restoreScrub.ts:180,183-192`; `IssuesPM.md:755` |
| 04-06 | CORRECTED | Hosts 03-12; per-page cost is a stat plus a cached parse, not a full read | `readNexus.ts:134-140`; `optionOps.ts:136-140` |
| 04-07 | CORRECTED | Estimate −5 → ±0: moving the replay needs a tree read after an owed relocation | `handlers.ts:85-111`; `contextCascade.ts:312-313` |
| 04-08 | VERIFIED | `MutateOutcome.retry` has one producer | `mutate.ts:76`; `mutateRequest.ts:22` |
| 04-09 | REMOVED | Merged into 03-06 (same holder reads; its one-pass clash is carried there) | `registryProperty.ts:125-130,158-168` |
| 04-10 | VERIFIED | `assignedDefs`' disk fallback is unreachable where the folder came from the same tree | `repairSweep.ts:24-34`; `assignment.ts:38-45`; `treePatch.ts:106-129` |
| 04-11 | CORRECTED | Three fresh builds, not four; estimate lowered | `assignment.ts:81,90`; `restoreProperty.ts:57-58`; `spend.ts:114,129-130,229` |
| 04-12 | VERIFIED | — | `mutate.ts:91-96,125-134,210-211`; `settle.ts:65,241-245` |
| 04-13 | REMOVED | Merged into 03-03 (same finding; 03-03 adds Clear and the four reply shapes) | `removeProperty.ts:33,47-60`; `handlers.ts:62-65` |
| 04-14 | CORRECTED | Importer count; Better narrowed: `journalSlot` → `Core/Files` (code), `governedSweep` → `Core/Nexus` (recommended), per 02-03/02 A-01 | `IssuesPM.md:1013`, `journalSlot.ts:2-4`, `governedSweep.ts:8-21` |
| 04-15 | CORRECTED | `sweepParse` admits loose files, so the reach difference changes outcome; NexusOS has an affected file | `pageFile.ts:252-260`; `indexSeed.ts:73-75`; `~/NexusOS/Agenda/II. Tasks/PM-QuickFilter.md` |
| 04-16 | VERIFIED | — | `propertyJournal.test.ts:47`; `journalWiring.test.ts:306-345`; `cascadeRace.test.ts:58` |
| A-01 | INFERRED (new) | Value write behind a registry-last strip; reproduction would settle it | `setProperty.ts:67-71`; `deleteProperty.ts:153-159` |
| Ledger, create step-aside | CORRECTED | Lines and origin | `registryProperty.ts:63,77-78`; `cf4dee4e6` |
| Ledger, later Context rename displaces | CORRECTED | `supersedes` is deliberate with a stated reason; only the post-restart loss is the accident | `journalSlot.ts:18`; `mutate.ts:68` |
| Ledger, delete removes the def with skips | CORRECTED | Never deferred | as 04-02 |
| Ledger, corrupt journal set aside | CORRECTED | Shared set-aside policy for strict JSON files | `atomicWrite.ts:220-225` |
| Approach B | CORRECTED | System-trash mode skips bundles for content deletes only; a property delete always mints one | `delete.ts:79-82`; `deleteProperty.ts:46` |

##### Overlaps & Contradictions

**Overlaps within Reconciler A's four (merged):**
- 03-01 ← 04-01, 04-03; 03-03 ← 04-13; 03-06 ← 04-09; 04-06 ← 03-12.

**Cross-report overlaps:**
- 04-14 ↔ 02-03, 08-11, 08 Cross-Domain (04), 09 Issues (I-042): where the shared engine, slot, and governed-root writer live.
- 04-05 ↔ 02 Cross-Domain (04: two sidecar RMW paths), 02's write paths 7-10, I-036 *Solution*, 09 Cross-Domain (`spaceSidecars` has a fourth caller, `assetMigrate.ts:117`).
- 04-10 ↔ 02-11, 03-14, 08-13: one world/schema builder.
- 04-11 ↔ 02-04 (`Frozen`/`frozenWorld` leave the codec): one move.
- 04-06 ↔ 08 Inventory and Cross-Domain (04), 09 Doc Claims (`PropertiesPM:74`).
- 04-07 ↔ 08 Cross-Domain (re-point asymmetry), 09 Issues (I-036 line refs).
- 04-08 ↔ 03-03, 05-05.
- 04-12 ↔ 09 Issues (I-039).
- 04-16 ↔ 09-10, 09-06, 03-15.
- 04-02 / A-01 ↔ 02-09 (value writes resolving the def outside the lock a sweep honors).

**Contradictions:**
- 03-12 vs 04-06 on the open-time walk's direction: settled for 04-06 (index read removes the walk; 03-12's still reads files).
- 04-02 vs its own cited history: settled from `git show 13d7215d2` and `e5c619124`: the deferral was option removal's.
- 04-15's inference vs `sweepParse`: settled from `pageFile.ts:252-260`.
- 09's Doc Claims marks `PropertiesPM:123` as holding; 03-01/03-15 show it doesn't (`registryProperty.ts:183`, `deleteProperty.ts:123`, `handlers.ts:158`).
- 02-03 (`governedWrite` → `governedRoot.ts` in Properties or Nexus) vs 04-14 / I-042 part (2) (`governedWrite` → `Core/Files`): the `Core/Files` half is settled from code in 02's *§Overlaps & Contradictions*: `journalSlot` → `Core/Files`, while the governed-root writer and `governedSweep` stay out of it, because `Core/Files` imports nothing above Nexus leaf utilities and both writers import the codec, Contexts, and the Nexus tree (`governedWrite.ts:3-5`, `governedSweep.ts:8-21`). `Core/Nexus` over Properties for those two is a recommendation.


---

#### Scout 05 — Schema Surfaces (Reconciled)

Baseline `d0595b22d`. All paths are relative to `~/The Studio/Projects/Project Pommora`. Every citation below was re-opened at HEAD by Reconciler B. A drift of a line or two is re-cited silently under VERIFIED; anything more (a mechanism, a count, an origin, an estimate) is CORRECTED and says what changed.

##### Inventory

Spot-checked at HEAD: every line count, caller list, and "exported but unread" claim below holds (`git grep` of `useOptionEdit`, `OptionDraft`, `OptionEditApi`, `OptionDef`, `CheckboxLook`, `useGhostOptionAnchor`, `nexusReorderIndex`, `LINK_FORMAT_OPTIONS`). Test sizes: `OptionOrderList.test.tsx` 133, `paneDrop.test.ts` 200.

| File / Symbol | Lines | Responsibility (one line) | Callers Outside the File | Belongs Here? |
|---|---|---|---|---|
| `Core/Properties/Schema/PropertyFrame.tsx` | 521 | The Collection Settings ▸ Properties pane: the list, the type picker, and each property's editor | `Core/Views/Settings/SettingsFrame.tsx:13,158` | Yes, but it also writes view `column_styles` (`:260-262`) and the rename store slice (see 05-09) |
| ↳ `ListGroups` | `:77-175` | The assigned rows and the All Properties disclosure | Itself only | Yes |
| ↳ `SETTINGS` record | `:341-394` | Dispatches each property type to its editor | Itself only | Yes. It's the right shape, but every editor has its own structure (05-01) |
| ↳ `create`, `rename`, `setFormat`, `remove`, `handleDrop`, `editorMenu`, `rowMenu` | `:234-307` | The writes the pane sends through `dialer()` | Itself only | Mostly yes. `editorMenu`'s delete flow belongs in `confirmations.ts` (05-05) |
| `Schema/OptionEditor.tsx` | 122 | The grouped option list in the editor: drag, ghost create, + per group, and group relabel | `PropertyFrame.tsx:328` | Yes |
| `Schema/useOptionEdit.tsx` | 216 | The one option-edit hook: popup state, rename keys, the draft, the menu, moves, and writes. It also holds `OptionDraft` | `PropertyPicker.tsx:14,311`, `MassPropertyPicker.tsx:4` (type only), `OptionEditor.tsx` | Yes. `OptionDraft` is a component in a hook file. `OptionEditApi` and `OptionDef` are exported but nothing outside the file imports them |
| `Schema/OptionEditPopup.tsx` | 107 | The per-option popup: icon, title, color grid, and Appearance | `useOptionEdit.tsx:158` only | Yes, but its icon-plus-title row and footing row restate kit shapes (05-07) |
| `Schema/option-edit-popup.css.ts` | 69 | The popup's field row, icon seat, and footing row | `OptionEditPopup.tsx` | Mostly restates kit styles (05-07) |
| `Schema/OptionRow.tsx` | 57 | Exports `OptionSlot`, one option row: chip, compact title, and pen | `OptionEditor.tsx:11,101` only | The file name doesn't match its export |
| `Schema/option-row.css.ts` | 8 | One class (`compactTitle`) | `OptionRow.tsx` | Should sit beside `optionLead` in `UIX/Menus/frames.css.ts` or merge into OptionRow's file |
| `Schema/GhostOptionChip.tsx` | 59 | The "New Option" ghost chip, plus `useGhostOptionAnchor` | `OptionEditor.tsx`. `PropertyPanel.tsx:45,282` uses the hook for *property* add rows, not options | The hook name is wrong for its second caller, and the hook itself is redundant (05-06) |
| `Schema/FormatRows.tsx` | 56 | The Label Format and Value Format picker rows | `PropertyFrame.tsx:447` | Yes |
| `Schema/NumberEditor.tsx` | 146 | Number family, currency, separators, decimals, fraction, and the per-view Style row | `PropertyFrame.tsx:368` | Yes. It has its own container and spacing (05-01, B-05-01) |
| `Schema/number-editor.css.ts` | 9 | A spacing rhythm meant to stay correct when a row collapses | `NumberEditor.tsx` | Should be the shared editor container's rule, once the rule works (05-01, B-05-01) |
| `Schema/CheckboxEditor.tsx` | 52 | Checkbox color (definition) and Style (view) | `PropertyFrame.tsx:360` | Yes. `CheckboxLook` is exported but only its test imports it |
| `Schema/DateTimeEditor.tsx` | 65 | Date, Day, and Time rows (all view `column_styles`) | `PropertyFrame.tsx:357` | Yes. Its inline layout `style` is the only static one in the domain (05-01) |
| `Schema/LinkEditor.tsx` | 63 | Underline, Color, and Format, all on the definition | `PropertyFrame.tsx:349` | Yes |
| `Schema/FileEditor.tsx` | 46 | The file directory field | `PropertyFrame.tsx:376` | It reads `useSession` itself while its Browse logic lives in the parent (05-12) |
| `Schema/linkFormatOptions.ts` | 8 | `LINK_FORMAT_OPTIONS` | `LinkEditor.tsx:4`, `Core/Settings/frames.ts:13,552` | No. Its sibling `DATE_FORMAT_OPTIONS` lives in `columnStyles.ts:48`, and `lookOptions(LINK_DISPLAYS)` already builds it (08-09 / 05-04, in `08-nexus.md`) |
| `Core/Properties/paneDrop.tsx` | 118 | The two-zone membership drag spec (`paneSpec`, `PaneAllGroup`, `PaneDrop`) plus `nexusReorderIndex` | `PropertyFrame.tsx:53`, `Views/Settings/VisibilityFrame.tsx:15`, `PropertyPanel.tsx:9` (`nexusReorderIndex` only) | No. It imports nothing from Properties (05-08) |
| `Core/Views/Settings/OptionOrderList.tsx` | 107 | A view's bucket order for an option-typed group or sort, plus `rowEye`, `SUB_LOOK`, and `HideControls` | `GroupFrame.tsx:72,319,415,528`, `SortFrame.tsx:14,220` | The list belongs in Views. The three helpers don't belong in a file named for options (05-10) |
| Tests: `PropertyFrame.test.tsx` 614, `PropertyFrame.dateTime.test.tsx` 108, `OptionEditor.test.tsx` 572, `NumberEditor.test.tsx` 71, `CheckboxEditor.test.tsx` 93, `DateTimeEditor.test.tsx` 77, `paneDrop.test.ts` 200 (Properties root), `OptionOrderList.test.tsx` 133 | — | — | — | See 05-13 |

**UIX use (the question asked).** The surfaces do use the kit: `FrameSlide`, `MenuScrollFrame`, `MenuTopRow`, `MenuFooting`, `FootingItem`, `MenuIndex`, `pickerRow`, `MenuRowView`, `PickerMenu`, `ColorGrid`, `PickerControl`, `LineZone`/`LineGroup`/`LineRow`/`lineList`, `useGhostAnchor`, `useRenameKeys`, `RenamableLabel`, `InlineEditHeader`, and `Reveal`. There are three places where they restate kit shapes: the popup's icon-plus-title row (05-07), the popup's footing row (05-07), and the spacing of the editors' row stacks (05-01). Neither popup piece maps onto the kit without a kit change (05-07).

##### Findings

###### 05-01 · Five type editors, four containers, and the spacing bug the Number editor exists to avoid — CORRECTED
- **Lens:** Type Facts Once, One Way, Always Intentional, Look Outward
- **Now (read):**
  - The editors sit in four different containers:
    - Checkbox, Link, and File use `MenuIndex` inside `s.configEditor` (`UIX/Menus/frames.css.ts:180-185`, flex column, `gap: 8px`).
    - FormatRows uses `MenuIndex` inside `s.ruleFrame` (`frames.css.ts:126`).
    - NumberEditor stacks bare `MenuRowView`s in its own `number-editor.css.ts` (section plus `rowRhythm` margins).
    - DateTimeEditor stacks bare `MenuRowView`s in an inline `style={{ display: 'flex', flexDirection: 'column', gap: 4 }}` (`DateTimeEditor.tsx:31`). That is the only static inline layout style in the domain (the others, e.g. `LinkCell.tsx:67`, carry computed colors).
  - `number-editor.css.ts:3` explains why it avoids flex `gap`: "a collapsed Reveal would still consume one on each side." That holds: `Reveal`'s outer grid `div` stays mounted while collapsed (`UIX/Animations/Reveal.tsx:42-65`; only the children unmount), so it occupies a flex slot. DateTimeEditor uses `gap: 4` and reveals its Day row (`:50`, `reveal: showDay`), so hiding Day leaves an extra 4px between Date and Time. *(Corrected: settled by reading Reveal; the scout had it as inferred.)*
  - **The Number editor's own workaround doesn't work either (B-05-01):** `rowRhythm`'s `'&:first-child': { marginTop: 0 }` (`number-editor.css.ts:6-9`) is applied to the `MenuItem` root (`UIX/Menus/MenuRows.tsx:129-140`), and every revealed row's `MenuItem` is the sole child of its `Reveal`'s inner `div` (`MenuIndex.tsx:122-130`, `Reveal.tsx:62-63`). So every revealed row (Currency, Separators, Fraction, Value, Style) matches `:first-child` and loses its margin; only Decimals (`NumberEditor.tsx:98-107`, no `reveal`) carries the 8px.
  - `MenuIndex` already renders each row through `MenuRowView` (`UIX/Menus/MenuIndex.tsx:161-176`), and `MenuRowView` already wraps a `reveal` row in `Reveal` (`:122-130`). The only thing keeping Number and DateTime off `MenuIndex` is that `configEditor`'s `gap` spacing breaks when a row collapses.
  - Glyphs are inconsistent: DateTimeEditor rows carry icons at `iconSize: 'headline'` (`DateTimeEditor.tsx:18`), FormatRows uses the default `'body'` size (`FormatRows.tsx:40,45`, `MenuIndex.tsx:63`), and Number, Checkbox, Link, and File rows carry none.
- **Better:**
  - Give `s.configEditor` one collapse-safe rhythm and put every editor in it. The rule can't be `number-editor.css.ts`'s as written (moving it would spread B-05-01 to every editor); it needs a selector that doesn't read a revealed row as its list's first child, e.g. a margin on the `[data-reveal]` wrapper / non-revealed row rather than on the `MenuItem` (`Reveal.tsx:45` already exposes `data-reveal` for exactly this kind of sibling rule).
  - Have every editor return `MenuSection`/`MenuRow[]` rendered by one `<MenuIndex>` in that container. Delete `number-editor.css.ts` and the inline style.
  - Each editor shrinks to its row list. `SETTINGS` (`PropertyFrame.tsx:341`) could hold the row builders directly as `(def, style) => MenuRow[]`, so the five editor components become row functions (FileEditor's `useSession` read moves to the frame, since a row function can't call a hook; see 05-12).
- **Behavior:** Changes what a user sees, as accident fixes: the stray 4px under a hidden Day row goes, and the Number editor gains the 8px between rows it currently lacks (B-05-01). Every editor shares one layout with even spacing [Intended as L-1], and every editor's rows carry icons as the Date editor's do [Intended as L-2].
- **Estimate:** about −90 to −130 lines across six files · read

###### 05-02 · One "look" concept placed three ways in the frame, and the frame's "Format" and the column menu's "Format" write different layers for Link and Number — CORRECTED
- **Lens:** Type Facts Once, One Vocabulary, Behavior Is a Decision
- **Now (read):**
  - The per-view look (`ColumnStyle.look`) appears in three different places:
    - Option types get a `MenuFooting` with a Style `PickerControl` (`PropertyFrame.tsx:409-426`). The same look is offered again in the option row's right-click Style submenu (`useOptionEdit.tsx:98-123` → `optionMenuModel` → `styleBranch`, `Actions/optionMenu.ts:16`), so the frame has two controls for one setting.
    - Checkbox and Number each build a Style row inside their editor from their own `STYLE_OPTIONS` (`CheckboxEditor.tsx:8,42`, `NumberEditor.tsx:25,137-143`).
    - Link offers no per-view look in the frame at all.
  - **The label collision covers Link and Number** *(corrected: the scout named Link only)*. The column menu labels the look submenu "Format" for both (`Actions/columnMenu.ts:40-42`), writing the view's `look`. In the frame, Link's "Format" row writes `def.link_display`, a nexus-wide definition field (`LinkEditor.tsx:49-56`, `PropertyFrame.tsx:353`), and Number's "Format" row writes `def.number_family` (`NumberEditor.tsx:63-72`) while Number's view look sits under "Style" (`:137-143`). For Link, the view's look wins over the definition (`columnStyles.ts:143-145`, `Cells/LinkCell.tsx:39`).
  - The frame re-narrows the all-types `ColumnLook` union by hand three times (`PropertyFrame.tsx:362`, `:370`, `:408`). Those rules are already stated per type in `styleMenuItems` (`columnMenu.ts:54-94`) and `defaultStyleFor` (`columnStyles.ts:133-155`).
  - The definition-versus-view split is written down only in a component comment (`CheckboxEditor.tsx:10`) and a decoder comment (`properties.ts:174`). Nothing tells the user that one Collection's pane edits nexus-wide settings and this view's look side by side.
- **Better:**
  - State each type's looks once, as one `Record<PropertyType, readonly ColumnLook[]>` in `columnStyles.ts` beside `OPTION_LOOKS`/`CHECKBOX_LOOKS`/`NUMBER_LOOKS` (`columnStyles.ts:12-14`; `LINK_DISPLAYS` is defined in `properties.ts:90` and spread into `COLUMN_LOOKS` at `columnStyles.ts:18`). *Settled by Reconciler B with 07-02:* not on `TypeSpec`, since `columnStyles.ts` already imports `properties.ts` (`columnStyles.ts:3-10`) and `properties.ts` holding `ColumnLook` would cycle or pull view vocabulary into the definition catalog; keying by `PropertyType` still makes the compiler demand one entry per type. `styleMenuItems`, `defaultStyleFor`, and the frame would all read it.
  - The frame then renders one Style row for every type with more than one look. That replaces the option footing, the Checkbox and Number Style rows, and the three narrowings.
  - Settings that apply only to the current view share one word [Intended as I-1]. A Date property carries its own format, which its columns follow unless a column overrides how it displays [Intended as I-2], and Number and Link follow the same pattern [Intended as I-3], so Link's and Number's frame "Format" rows stay on the property and the column menu's control is the per-view display override.
- **Behavior:** Changes behavior. Where Style sits moves, the option frame loses one of its two Style controls, the column menu's "Format" label takes the view-only word, and dates gain a format on the property [Intended as I-1, I-2, I-3].
- **Estimate:** about −30 to −50 lines · read

###### 05-03 · The frame filters reserved ids because registry admission doesn't refuse them — VERIFIED
- **Lens:** Fix the Origin, Clearer Boundaries
- **Now (read):**
  - `PropertyFrame.tsx:202` and `:204` filter `isReservedPropertyId` out of the assigned and All lists, and `Views/visibilityModel.ts:17` does the same. These are the only two non-test callers besides `schema.ts:64`.
  - Creates refuse reserved ids (`Properties/schema.ts:64`, `validateDefinition`) and non-user types (`:65-66`). Registry admission doesn't: `normalizeRegistry` (`propertiesRegistry.ts:21-45`) runs the shape decode, `validateName`, and `withUniqueOptions` (`:30-33`), none of which check ids or `origin`.
  - A Collection's schema is resolved straight from the registry by id (`Nexus/containerFields.ts:29-39`), so a hand-edited `properties.json` holding `_title` (or a `context`/`createdTime`-typed definition) is admitted and reaches the frame; the UI filter is the only thing guarding against it. `PropertyFrame.test.tsx:174,177-187` pins the UI filter using exactly that unadmittable state.
  - NexusOS's registry holds 15 definitions, none with a `_` id or a non-user type (read `~/NexusOS/.nexus/properties.json`).
- **Better:** Admission refuses what `validateDefinition` refuses on identity and origin (reserved id, and `origin !== 'user'`), and sends the definition to `unadmitted` the way it already does for a parse failure. The two UI filters and the test's `titleDef` case then go away, along with the `paneDrop.tsx:17` comment that describes the frame's filter. Context stays a property type [Intended as F-1], while Created Time and Last Modified Time leave the property types for file-derived fields [Intended as F-2], and Title and Icon aren't property types [Intended as F-3]; a stored `createdTime`/`lastEditedTime` definition then fails its decode, and `SETTINGS`' two stamp arms (`:389-393`) go. Planning settles how a stored `context`-typed definition reads and what its `SETTINGS` arm holds.
- **Behavior:** Preserving for every Nexus Pommora wrote (NexusOS read). A hand-edited reserved-id definition would move from "silently hidden in the frame" to "unadmitted and carried through", which matches how other bad definitions are handled.
- **Estimate:** about −6 lines in the UI and +2 at admission · read

###### 05-05 · The property delete flow is hand-rolled in the frame, including the only `storesChanged` emit tied to a single write outside `mutate` — CORRECTED
- **Lens:** Clearer Boundaries, One Way, Fix the Origin
- **Now (read):**
  - `editorMenu` (`PropertyFrame.tsx:291-301`) runs ask → `property:delete` → `storesChanged.emit()` → back to the list → `notifyTrashed(..., replay(owed))`.
  - Every other trash-bound delete goes through `confirmDelete` (`Interface/Confirm/confirmations.ts:121-133`; callers `Bundles/browser.ts:175`, `entityMenuActions.ts:137`, `pageMenuActions.ts:70`), and its `storesChanged` comes from the `mutate` pipeline (`nexusSlice.ts:258`, `changesStores`). *(Corrected:)* All three emitters are renderer-side, so "the only UI-fired" doesn't distinguish it; the other non-pipeline emitter is the Trash/Archive browser's batch (`Bundles/browser.ts:320`). The frame's emit exists because `property:delete` is a direct channel, not a `mutate` op.
  - The frame is the one surface that knows a property delete changes the Trash listing.
- **Better:** Add a `confirmDeleteProperty(def)` beside `confirmDelete` that owns the ask, the write, the signal, and the notification, and returns whether the delete landed. The frame keeps only `if (await confirmDeleteProperty(def)) backToList()`. The ask's counting and wording come from the one confirmation home the Archive's and the Trash's confirmations share [Intended as O-2]. The deeper origin is the channel shape (a registry delete outside `mutate`), which is 03's ground; if 03 routes it through `mutate`, the hand emit leaves with no new function.
- **Behavior:** Preserving.
- **Estimate:** about −5 lines in the frame and +9 in confirmations, so net about +4. The point is ownership, not line count · read

###### 05-06 · `useGhostOptionAnchor` repeats what `useGhostAnchor` already does, and its name is wrong for its second caller — CORRECTED
- **Lens:** Less Stuff, One Vocabulary, Fix the Origin
- **Now (read):**
  - `GhostOptionChip.tsx:13-21` wraps `useGhostAnchor` to "latch `busy` in a ref" so the dwell re-reads it at fire time.
  - `useGhostAnchor` already keeps `optsRef = useLatest(opts)` (`UIX/Interactions/ghostCreate.ts:38`) and its `blocked()` calls `optsRef.current.suppressed()` (`:49`), read again when the dwell fires (`:65`). So `suppressed: () => busy` would already be read fresh at fire time, and the extra `useLatest` does nothing. TileGrid already passes a render closure that way (`Tiles/TileGrid.tsx:510-514`, `suppressed: () => inserting !== null`).
  - Sidebar, TileGrid, and useViewInteractions call `useGhostAnchor` directly (`Sidebar.tsx:325`, `TileGrid.tsx:510`, `useViewInteractions.tsx:436`).
  - `PropertyPanel.tsx:282` uses `useGhostOptionAnchor` for its Add Property rows, not options.
- **Better:** Delete the wrapper and the `GHOST_GRACE_MS` constant; both sites call `useGhostAnchor({ dwellMs: REVEAL_DWELL_MS, graceMs: 0, suppressed: () => busy })`. The constant's comment (`GhostOptionChip.tsx:10`) is the reason for the zero grace, so it rides to the call. *Inferred:* the three other consumers also call `useClearStrandedGhost` (`ghostCreate.ts:183-192`; `Sidebar.tsx:341`, `TileGrid.tsx:517`, `useViewInteractions.tsx:442`) while the two Properties sites don't. A stranded anchor id renders nothing (`GhostOptionChip.tsx:35`), but the state stays set, so an option re-added under the same label could show its ghost with no dwell; one check settles whether that's reachable.
- **Behavior:** Preserving.
- **Estimate:** about −4 lines net (the wrapper's 14 go, each call site grows by about 4 and gains two imports) *(corrected from −12)* · read (the stranded-ghost point is inferred)

###### 05-07 · OptionEditPopup restates the kit's icon-plus-title header and footing row, and neither kit piece fits as-is — CORRECTED
- **Lens:** Look Outward, One Way
- **Now (read):**
  - `OptionEditPopup.tsx:59-79` builds an icon "seat" button plus a boxed, always-live `EditableInput` (`autoFocus={false}`, `required`), styled by `option-edit-popup.css.ts:21-57`: `iconSeat` (a field with a 28px seat), `iconSeatActive`, `titleField`, `restingRing`, and `focusRing`.
  - `UIX/Menus/InlineEditHeader.tsx:7-63` draws the same composition (icon `Button` plus title field, with `iconOpen` pressed state) for five surfaces (`SpaceMenu.tsx:87`, `PageMenu.tsx:59`, `PropertyFrame.tsx:438`, `LayoutFrame.tsx:220`, `SettingsFrame.tsx:91`). *(Corrected:)* its title is an `InputField` that rests as text and enters editing on demand (`:54-60`), not an always-live boxed input, so the popup can't adopt it without a kit variant that changes either the popup's interaction or the header's.
  - The popup's `footRow` (`option-edit-popup.css.ts:61-69`, `footingBar` plus a `footingLabel` span plus `PickerControl`, `OptionEditPopup.tsx:87-95`) restates `FootingItem`/`MenuFooting` (`UIX/Menus/MenuRows.tsx:189-230`), which the frame's Style footing uses. *(Corrected:)* `FootingItem` requires an `icon` (`:193-196`), and the popup's row has none.
  - The two aria-labels differ: "Edit Icon" (popup `:63`) versus "Edit icon" (`InlineEditHeader.tsx:47`, queried by `PropertyFrame.test.tsx:224`). Title-case, the kit's is the odd one.
- **Better:** The popup's title field and footer stay as they are [Intended as L-4], and planning raises where they differ from `InlineEditHeader` and `FootingItem`. The aria-label settles on one spelling in the kit.
- **Behavior:** Preserving, apart from the aria-label's spelling.
- **Estimate:** about ±0 · read

###### 05-08 · `paneDrop.tsx` is a kit-only drag model filed at the Properties root and named in schema words — VERIFIED
- **Lens:** Clearer Boundaries, One Vocabulary, Less to Understand
- **Now (read):**
  - `paneDrop.tsx` imports only React and UIX (`:3-14`).
  - Its header comment explains two hosts (`:16-17`).
  - `VisibilityFrame.tsx:119-123` maps `assign`/`unassign`/`reorder-assigned` to show and hide, with the lane ids `'assigned'`/`'all'` standing for Shown and Hidden.
  - `nexusReorderIndex` (`:28-40`) is order arithmetic (a visible slot to a full-order index) unrelated to drag. `PropertyPanel.tsx:257,271` uses it for the Contexts order and a Collection's schema order, where "nexus" is wrong.
  - `PropertyFrame.handleDrop` (`:263-281`) dispatches the `PaneDrop` union with a three-level nested ternary, against the Hard Rule "Finite states are unions + switch".
- **Better:**
  - Move the pane model to `UIX/Menus` (it already imports `menuDropLine` and `allHighlight` from there), with neutral kind names (for example `reorder-members`/`reorder-rest`/`join`/`leave`).
  - Move `nexusReorderIndex` beside `moveBefore`/`nextOrder` in `UIX/Utilities/moveItem.ts` as `fullOrderIndex` (the same file 08-11 sends `resolveRowOrder` to).
  - Rewrite `handleDrop` as a `switch`, and move `paneDrop.test.ts` with the model.
- **Behavior:** Preserving.
- **Estimate:** about ±0 lines (a move and rename) · read

###### 05-09 · The inline-rename session slice has one reader and one writer — CORRECTED
- **Lens:** Fix the Origin, Less Stuff, Clearer Boundaries
- **Now (read):**
  - `renamingProperty`, `beginPropertyRename`, and `cancelPropertyRename` live in the global store (`Session/editSlice.ts:42-44,66,162-163`), and the only production consumer is `PropertyFrame.tsx:194-196,304,482,489,492` (`git grep`). The other references are test stubs (`PropertyFrame.test.tsx:103`, `PropertyFrame.dateTime.test.tsx:41`) and the Nexus-switch reset test (`Session/store.test.tsx:1233,1241`), which pins its place in `PER_NEXUS` (`editSlice.ts:59-67`).
  - *(Corrected origin:)* the slice was a store channel from the start, `3ce8532da` (07-02-2026, "renamingProperty is a net-new store channel — properties are registry ids, not paths"), long before create used it. `af1fd00cd` borrowed it for create → inline rename, and `bb6ac59d1` reverted that so a create opens the editor; neither touched `editSlice.ts`. Nothing outside the frame has ever set it.
- **Better:** Replace it with `useState<string | null>` in `PropertyFrame`. That also drops the `collectionPath` match at `:482`, the editSlice entries, its `PER_NEXUS` line, and the store test's assertion; a Nexus switch clears it by unmounting the frame.
- **Behavior:** Preserving. *Inferred:* the rename no longer survives the frame unmounting, but nothing re-enters it from outside.
- **Estimate:** about −12 lines · read

###### 05-10 · OptionOrderList is a grab-bag, and GroupFrame hand-rolls its row — CORRECTED
- **Lens:** One Vocabulary (file names say what's inside), One Way
- **Now (read):**
  - `OptionOrderList.tsx:14-39` exports `SUB_LOOK`, `HideControls`, and `rowEye`. GroupFrame uses them for date buckets and Set rows (`GroupFrame.tsx:72,138,145,415,528`) and SortFrame uses `SUB_LOOK` (`SortFrame.tsx:14,173,191,212`). These aren't option concerns.
  - `GroupFrame.tsx:408-417` (`subChipRow`) re-draws OptionOrderList's chip-plus-eye row (`OptionOrderList.tsx:96-99`), and the date list's row (`GroupFrame.tsx:524-529`) is the same row with a text label in place of the chip.
  - `findOption(def, v)` runs twice per row (`:74` inside `chip`, `:94`), which is quadratic in options. That's small but needless.
- **Answer to the brief's question:** OptionOrderList is correctly *not* `useOptionEdit`. It writes a view's bucket order, not the definition.
- **Better:** Move `rowEye`, `SUB_LOOK`, and `HideControls` into a Views/Settings pane-row module. Export one order row that GroupFrame's `subChipRow` and date row reuse. Resolve each option once.
- **Behavior:** Preserving.
- **Estimate:** about −12 lines · read

###### 05-11 · Option editing is one hook, but OptionEditor rebuilds a definition that misstates a Select — CORRECTED
- **Lens:** One Way, Less to Understand
- **Now (read):**
  - The frame and the value picker share `useOptionEdit` (`OptionEditor.tsx:35`, `PropertyPicker.tsx:311`), so the brief's "one implementation or several" is answered as one hook with two renderers. The renderers differ by design: a grouped, ghost-creating, destructive list versus a flat, pickable list with footer create.
  - `PropertyFrame` hands OptionEditor `optionGroupsOf(def)` (`:331`), and OptionEditor reconstructs `def = { id, type, status_groups: groups }` (`:31-34`). For a Select that is a definition carrying a synthetic `status_groups` (`properties.ts:304-305`). *(Corrected:)* it's harmless today, since every reader gates `status_groups` on the declared type (`Cells/OptionChip.tsx:26`, `properties.ts:290`), but it is a shape a real Select never has.
  - `type` is threaded as its own prop into `OptionSlot`, `OptionDraft`, `GhostOptionChip`, `OptionEditPopup`, and `OptionChip`. *(Corrected:)* only `OptionSlot`, `OptionEditPopup`, and `OptionChip` also take a `def`, and each narrows it to `Pick<PropertyDefinition, 'status_groups'>` (`OptionRow.tsx:23`, `OptionEditPopup.tsx:38`, `OptionChip.tsx:24,43`), so reading `def.type` means widening that pick; `OptionDraft` and `GhostOptionChip` take no `def`. `OptionChip` has ten callers, some with no definition in hand (`GroupFrame.tsx:414`), so its signature change reaches 06's surfaces.
  - Files that don't match their contents:
    - `OptionRow.tsx` exports `OptionSlot`.
    - `OptionDraft` (a component) lives in `useOptionEdit.tsx`.
    - `option-row.css.ts` holds one class.
    - `OptionEditApi` and `OptionDef` are exported but used only inside the file.
- **Better:** OptionEditor takes `def` and derives groups. The three def-taking components widen their pick to include `type` and drop the separate prop. Rename `OptionRow.tsx` to `OptionSlot.tsx`, folding in `OptionDraft` and `compactTitle`. Stop exporting the internal types.
- **Behavior:** Preserving.
- **Estimate:** about −15 lines and −1 file · read

###### 05-12 · Smaller data-layer decisions held in the UI — CORRECTED
- **Lens:** Fix the Origin, Clearer Boundaries
- **Now (read):**
  - **Decimals:** `decimalsToPicker` (`NumberEditor.tsx:31-32`) shows "Hidden" for an *unset* `number_decimals`, but the formatter renders unset as Intl's default (`formatValue.ts:186-191`: up to 3 digits for a plain or percent number, the currency's own minor digits for currency *(corrected detail)*) and only `'hidden'` as 0 digits. So the picker says Hidden while cells show decimals. The decoder also lets two spellings mean "no decimals": `'hidden'` and `0` (`properties.ts:185-188`). The UI can't produce `0`, but a value read from disk can hold it.
  - **Denominator:** the UI's Value row accepts any parsed number (`NumberEditor.tsx:129-132`), and the decoder takes any number (`properties.ts:190`). `fractionDenominator` drops anything ≤0 at render time (`formatValue.ts:220-223`), so a 0 or negative denominator persists and silently does nothing. The origin is the decoder: `z.number().positive()`. Because `narrowNumberFormat` decodes writes through the same field (`properties.ts:211-222`), that one change also stops the write. The render guard then only checks the fraction flag, the family, and presence.
  - **Create:** `PropertyFrame.create` sends `id: ''` (`:236`) to satisfy `propertyDraft`'s required id (`properties.ts:197-200`), and the host reads `def.id || mintPropertyId()` (`registryProperty.ts:83`). The only caller that passes an id is the Trash restore (`Trash/restoreProperty.ts:40`). The draft should make `id` optional.
  - **FileEditor** reads the asset root from the store (`FileEditor.tsx:16`), while its Browse round trip lives in the parent (`PropertyFrame.tsx:379-386`). One owner should hold both.
  - **Two spellings of one write:** `PropertyFrame` sends non-option writes through `write()` (assign, drops, config, icon), whose only addition over `reportRefusal` is an `'owed'` branch (`propertyWrite.ts:13-20`). Only option ops return `'owed'` (`optionOps.ts:45,103,242,348,377`). Meanwhile `schema:add`, `schema:unassign` from menus, and `property:delete` use `reportRefusal`, so the same channel (`schema:unassign`) is called both ways (`:256`, `:306` versus `:280`).
- **Better:** The Decimals picker keeps reading "Hidden" when unset, and the denominator decodes positive, so a zero or negative one is refused [Intended as L-3]. Make the draft id optional. Give FileEditor one owner. Pick one write spelling per channel family.
- **Behavior:** The refused denominator is the one visible change; the rest are preserving.
- **Estimate:** about −10 lines · read

###### 05-13 · The describers: stale tags, false test names, history-pinning tests, two harnesses, and a drifted I-064 — CORRECTED
- **Lens:** Describers Get Swept
- **Now (read):**
  - **Planning tags** survived the F-ID strip (`33242d8a9`): `(A-7)` `:134`, `(T5)` `:176`, `(A-4/E-5)` and `(B-1)` `:177`, `(A-9)` `:202`, `(T6)` `:235,243`, `(T7)` `:430`, `(A-8)` `:438` *(added; the scout's list missed it)*, `(A-8/D-1)` `:451`, `(A-10)` `:486` in `PropertyFrame.test.tsx`; `(A-3)` in `PropertyFrame.dateTime.test.tsx:77`; `(C-1…C-5)` and `(breaker M-1)` in `paneDrop.test.ts:63-82,180`. *Reconciler:* the strip is carried once, codebase-wide, by 09-06; these occurrences are its PropertyFrame and paneDrop share (09-06's tag roster gains `A-4`, `PropertyFrame.test.tsx:177`).
  - **False names:**
    - `:202` "header ⊕ opens the type picker; the footer create-row is gone". The button it clicks is the footer's `FootingCreate` (`PropertyFrame.tsx:458-462`, aria-label "New Property").
    - `:255` "commits the Remove (schema.delete)" and `:438` "routes through schema.delete". The channel is `schema:unassign`, and the test's own helper is misnamed too: `deleteSpy` returns `unassignSpy` (`PropertyFrame.test.tsx:244`).
    - `:486` "commits schema.rename". The channel is `property:rename`.
  - **Tests pinning history:** `:454` asserts a removed "Delete Property" row is absent, and `:199` asserts `loadSpy` was never called ("not a reload"). `loadSpy` exists only for that (`:51,65,101`).
  - **Two harnesses:** `PropertyFrame.test.tsx` and `PropertyFrame.dateTime.test.tsx` each have their own stubs and menu door (`setMenuDoor`, `PropertyFrame.test.tsx:18,25`, versus `MenuDoorHost`, `PropertyFrame.dateTime.test.tsx:11,61`).
  - **`row-title-input`** (`PropertyFrame.tsx:107`) is a test hook in this frame. The CSS that styles it is scoped to the sidebar's `.row` (`Interface/Sidebar/sidebar.css:178-192`), whose comment already calls the class "the query hook only"; the sidebar sets it too (`sidebarRows.tsx:32`).
  - **I-064** *(corrected)*: its premise stands. `FrameSlide`'s `maxWidth` (`UIX/Menus/FrameSlide.tsx:22,83`) predates the issue (present by `d9dfc1a52`, 09-25-2026; I-064 written in `739730c5e`, 10-18-2026), and the issue's Solution asks for one rule "set once for every such pane", which a per-host `maxWidth` isn't. What's stale is the wording and the footnote: it names "Key Format" for the row that now reads "Label Format" (`143298503`, the same evening), and its footnote cites `PropertyFrame.tsx:500-506` (now `:503-509`), `MenuRows.tsx:153` (the hint is now `:156`), and `SettingsWindow.tsx:47-52` (`settingsRow` is now `:54`) (`.claude/IssuesPM.md:1073-1085,1345`).
  - **PropertiesPM.md:76** says the option editor sits "under a Style toggle", but the toggle is the footing below the list. It doesn't mention the ghost "New Option" chip.
- **Better:**
  - Correct the names, including `deleteSpy` (the tag strip rides 09-06).
  - Drop the two history assertions and `loadSpy`.
  - Merge the dateTime suite into the main suite.
  - Either drop the frame's `row-title-input` hook (query the input another way) or keep it with the sidebar's reason.
  - Correct I-064's row name and footnote lines in place; its Solution stays.
  - Correct PropertiesPM line 76.
- **Behavior:** Preserving.
- **Estimate:** about −40 lines in tests · read

###### B-05-01 · The Number editor's collapse-safe rhythm zeroes the margin of every revealed row — VERIFIED
- **Lens:** Fix the Origin, Always Intentional
- **Now (read):** `rowRhythm` (`number-editor.css.ts:6-9`) gives each row `marginTop: 8px` except `:first-child`. The class lands on the `MenuItem` root `div` (`UIX/Menus/MenuRows.tsx:129-140`). `MenuRowView` wraps any row with a defined `reveal` in `Reveal` (`MenuIndex.tsx:122-130`), whose inner `div` holds that row alone (`Reveal.tsx:62-63`), so the row is its parent's first child. Five of the seven rows pass a boolean `reveal` (`NumberEditor.tsx:81,94,118,126,141`), so all five render with no top margin; only Decimals (`:98-107`) carries the 8px. The file's comment (`:3`) describes a rhythm the selector doesn't deliver.
- **Better:** Folds into 05-01: the shared container's rhythm is written so a revealed row isn't read as its list's first child, and `number-editor.css.ts` goes.
- **Behavior:** Changes what a user sees (the Number editor's rows gain even spacing); an accident fix. *Inferred* as a visual: a screenshot of a Number property's editor settles how it reads today.
- **Estimate:** folds into 05-01 · read

##### Behavior Ledger

| Behavior | Where | Code Cost | Origin | Classification | Status |
|---|---|---|---|---|---|
| The Property Frame mixes nexus-wide definition edits (formats, checkbox and link color, number format, file dir, icon, options) with this view's `column_styles` (Style, date forms) and gives no visual cue | `PropertyFrame.tsx:260-262,341-394`; `CheckboxEditor.tsx:10` | Small, but it confuses users | Accreted per type before the monorepo move (`0cdb92cd2`); `dc7780ca7` (date following) and `c37467bb3` (naming) only touched the frame later | Agent's choice. Settings that apply only to the current view share one word, with one Style row [Intended as I-1] | CORRECTED (origin: neither cited commit introduced the mix) |
| Link's and Number's frame "Format" set definition fields, while the column menu's "Format" sets the per-view look with the same label | `LinkEditor.tsx:49-56`, `NumberEditor.tsx:63-72`, `columnMenu.ts:40-42,71-76`, `columnStyles.ts:143-145` | Two layers plus a re-resolution in `LinkCell.tsx:39` | Link's view looks: `4d447dd40` (08-15-2026, "a url column's looks are the link forms") | Agent's choice, close to an accident in naming; the view-only setting takes one word [Intended as I-1] | CORRECTED (Number shares it; origin was `dc7780ca7`) |
| A date's format is per view, but a number's format is per definition ("rides as an inert foreign key", `properties.ts:176`) | `DateTimeEditor.tsx`, `NumberEditor.tsx` | Two storage models for display formats | `properties.ts:176` comment | Agent's choice. The rationale is stated for numbers only; dates, numbers, and links are meant to carry their format on the property with per-column display overrides [Intended as I-2, I-3] | VERIFIED |
| An option's Style is offered twice in the frame: the footing picker and the row's right-click Style submenu | `PropertyFrame.tsx:409-426`, `useOptionEdit.tsx:98-123` | About 15 lines | The footing first (`39a62437f`, 08-25-2026), then the submenu reached the frame with the one option menu (`8bacf4073`, 10-05-2026) | Accident (duplication); one Style row [Intended as I-1] | CORRECTED (order: the footing came first) |
| Decimals shows "Hidden" when unset, though cells render Intl's default digits | `NumberEditor.tsx:31-32`, `formatValue.ts:186-191` | 2 lines | Unclear | **Nathan's Intent** [Intended as L-3] | CORRECTED (the default is up to 3 digits, or the currency's minor digits) |
| Decimals offers 1–10 and Hidden, while the decoder admits 0–100 | `NumberEditor.tsx:26-29`, `properties.ts:185-188` | — | `properties.ts:178` comment (Intl bounds) | Agent's choice | VERIFIED |
| A 0 or negative fraction denominator is stored but ignored | `NumberEditor.tsx:129-132`, `formatValue.ts:220-223` | Guard at render | Unclear | Accident; refused [Intended as L-3] | VERIFIED |
| The value picker's option menu has no Clear or Remove (`destructive` only in the frame) | `useOptionEdit.tsx:58,102`; `optionMenu.ts:18` | One flag | `7ee3d1b6d` | Agent's choice. Plausibly Nathan's intent, unconfirmed | VERIFIED |
| The value picker can create options for Select and Multi-Select but not Status | `PropertyPicker.tsx:312` | One line | PropertiesPM.md:117 states it | Agent's choice; planning recommends [Intended as J-8] | VERIFIED |
| Clear asks only past one Item, while Remove always asks | `confirmations.ts:177-200` via `useOptionEdit.tsx:110-117` | — | `c7c232664` | Agent's choice; confirmations count correctly, zero included, from one home [Intended as O-2] | VERIFIED |
| Creating a property opens its editor (it briefly opened an inline list rename) | `PropertyFrame.tsx:240` | The store slice (05-09) | `af1fd00cd` → `bb6ac59d1` reversal; the slice itself dates from `3ce8532da` | Likely Nathan's intent (a reversal reads as feedback) | CORRECTED (the slice wasn't orphaned by the reversal) |
| Delete exists only behind the editor's ⋮ menu. The row menu offers only Rename and Remove | `propertyMenu.ts:19-30` | — | `propertyMenu.ts:3` comment (`bea36e407`) | Agent's choice | VERIFIED |
| The ghost "New Option" chip appears after a 1500ms hover dwell with 0 grace | `GhostOptionChip.tsx:11,17`, `hoverReveal.ts:12` | — | KNOB constants | Agent's choice (a tuned knob) | VERIFIED |
| The format rows carry no hints | `FormatRows.tsx` | Caption removed from `pickerRow` | `739730c5e`, I-064 | Agent's choice, deferred | VERIFIED |
| All Properties starts collapsed on every mount | `PropertyFrame.tsx:200` | — | — | Agent's choice | VERIFIED |
| "Property not found." caption, reachable when the definition vanishes or leaves this Collection's schema under an open editor (the editor reads assigned `props`, `:397`) | `PropertyFrame.tsx:396-405` | 8 lines | — | Agent's choice. The editor is meant to return to the property list [Intended as O-5] | VERIFIED |
| All Properties rows open no context menu | `PropertyFrame.tsx:151`, test `:601` | — | `af1fd00cd` | Agent's choice | VERIFIED |

##### Approaches

1. **Type editors as row specifications — CORRECTED.** `SETTINGS: Record<PropertyType, (def, style, write) => MenuRow[]>` replaces the five editor components. One `<MenuIndex>` in a collapse-safe `configEditor` renders them, and the per-type looks (05-02) add the Style row for every type with more than one look.
   - **Removes:** five components, `number-editor.css.ts`, the inline style, three look narrowings, the option-only footing, and two `STYLE_OPTIONS`.
   - **Costs:** rewriting the editor tests to target rows (about −150 to −200 lines overall).
   - **Risks:** FileEditor's `PathField` and Number's typeable Value row have to fit `Trailing`. Both already do (`kind: 'field'`, `typeable`). FileEditor's `useSession` read moves to the frame, since row builders can't call hooks. The collapse-safe rule has to be a new one, not `number-editor.css.ts`'s (B-05-01). One Style row serves every type with more than one look [Intended as I-1], and every editor's rows carry icons [Intended as L-2].
2. **One definition-config channel — VERIFIED.** `property:setLinkConfig`, `setCheckboxColor`, `setIcon`, `setNumberFormat`, and `setFileDirectory` are five `defEditOp` entries (`Properties/handlers.ts:182-193`, `Contract/bridge.ts:155-171`), each called from one frame site (`PropertyFrame.tsx:259,353,363,371,516`). One `property:configure(id, patch)` that narrows against a display-fields pick, keeping the file-directory check as the patch's one `check`, collapses four bridge entries, four handlers, and the per-editor callback shapes into one `onConfigure(patch)`.
   - **Costs:** about −30 lines.
   - **Risks:** the narrowing loses per-channel field isolation unless the pick is exact. Same proposal as 01-07 and 03-07; 03 owns it.
3. **Move the pane model to the kit and keep Views panes in Views — CORRECTED.** Move `paneDrop` to `UIX/Menus` with neutral names, `nexusReorderIndex` to `UIX/Utilities/moveItem.ts`, and OptionOrderList's `rowEye`/`SUB_LOOK`/`HideControls` to a Views/Settings pane-rows module.
   - **Removes:** a mis-filed module, schema vocabulary in a view pane, and a grab-bag export file.
   - **Costs:** import churn across about 6 files.
   - **Risks:** low and structural. *Reconciler:* the scout's conflict with 06-03's `panelOrder.ts` is gone; the cleaned 06-03 drops that file (a move with no consolidation), so order arithmetic has one destination, `moveItem.ts`, shared with 08-11's `resolveRowOrder`.

##### Cross-Domain Notes

- **01 — VERIFIED:** `optionGlyph` (`Cells/OptionChip.tsx:21-30`) scans `def.status_groups` per compact Status chip even though a `StatusOption` carries `group_id` (`properties.ts:144`); `OptionChipData` (`OptionChip.tsx:8-13`) doesn't declare it. That's per-cell work on a hot path, though only under the Compact look (`:54-56`); its cost is unmeasured (a Status list is a handful of options), so it's INFERRED as a cost. *Settled by Reconciler B against 08-04:* `optionGlyph` should keep resolving the group from the nesting, and `group_id` leaves (08-04). Nesting is the one source of an option's group (`properties.ts:149-155`); `group_id` is written by `optionModel.ts:35,49` and the seed and read nowhere, so reading it would make a redundant stored copy load-bearing. If the scan ever measures, a label→group map memoized on the definition answers it without the stored field.
- **01 — VERIFIED:** `ColumnStyle.look` is the all-types union (`columnStyles.ts:15-21,95`), which makes every surface re-narrow it. A per-type look table belongs in the catalog or `columnStyles.ts`.
- **01/03 — VERIFIED:** registry admission (`propertiesRegistry.ts:21-45`) skips the identity and origin checks that `validateDefinition` enforces (05-03).
- **03 — VERIFIED:** `propertyDraft` requires an `id` that creates fill with `''` (05-12; `registryProperty.ts:83`). Five definition-config channels could be one (Approach 2).
- **03 — VERIFIED:** `number_denominator` should decode as positive, and the two "no decimals" spellings (`'hidden'` and `0`, both 0 digits at `formatValue.ts:187-189`) should fold into one.
- **06 — VERIFIED:** `PropertyPanel.tsx:282` borrows `useGhostOptionAnchor` for property rows (05-06), and `PropertyPanel.tsx:257,271` uses `nexusReorderIndex` for non-nexus orders (05-08).
- **06 — CORRECTED:** `LinkCell.tsx:39`'s fallback to `def.link_display` is load-bearing, not a re-resolution: the Properties panel hands every cell `look: 'standard'` (`PropertyPanel.tsx:419-420`), which isn't a link display. The origin is the panel's hand-built style instead of `defaultStyleFor`; fixing that would let the fallback go.
- **Views — VERIFIED:** `GroupFrame.tsx:511-512` reads "a legacy bare key" (`/^\d{4}/`) from `hidden_groups`. NexusOS's only `hidden_groups` (`~/NexusOS/Studio/_pagecollection.json`) is `[]`, so it's migration residue with no live holder (07-06).
- **Trash — VERIFIED:** a property delete's store signal should move into the delete flow (05-05).
- **UIX — VERIFIED:** `useRenameKeys` has no test of its own. Its behavior is pinned only through `OptionEditor.test.tsx:267-448`, though it has a second caller (`UIX/Menus/useListEdit.ts:28`).

##### Overlaps & Contradictions

###### Merged Within Reports 05–09
- **05-04 → 08-09:** the labels-to-options builders and `linkFormatOptions.ts` are one finding, carried as 08-09 / 05-04 in `08-nexus.md` (codebase-wide statement; 05-04's `lookOptions(LINK_DISPLAYS)` route and the `labelled` name clash ride along).
- **05-13 (tag bullet) → 09-06:** the planning-tag strip in `PropertyFrame.test.tsx`, `PropertyFrame.dateTime.test.tsx`, and `paneDrop.test.ts` is carried once by 09-06; 05-13 keeps the false names, history pins, harness merge, `row-title-input`, I-064, and PropertiesPM:76.

###### Cross-Report Overlaps
- **05-02 ↔ 07-09, 07-02, 01-01:** the per-type looks record; 07-09 consolidates how a resolved style is fetched.
- **05-02 ↔ 08-08:** moving the link-display vocabulary to Connections changes where `COLUMN_LOOKS` gets its link looks.
- **05-02 ↔ 09-05:** unifying "Format"/"Style" in UI copy is one wording change [Intended as I-1].
- **05-03 ↔ 01-03, 01-04:** the stamps leaving the property types makes their origin check a decode failure; one reserved-column table.
- **05-05 ↔ 03-03:** the frame's hand-rolled delete flow; `property:delete` is called outside `mutate`.
- **05-06 ↔ 06-03:** `PropertyPanel.tsx:282` borrows `useGhostOptionAnchor`.
- **05-08 ↔ 08-11, 06-03:** order arithmetic goes to `UIX/Utilities/moveItem.ts` (`nexusReorderIndex` here, `resolveRowOrder` in 08-11).
- **05-11 ↔ 09-09:** the unused `OptionDef`/`OptionEditApi` exports.
- **05-12 (draft id), Approach 2 ↔ 03-07, 01-07:** one definition-config channel; 03 owns it.
- **05-13 ↔ 06-15, 08-14, 09-05:** PropertiesPM drift in other sections.
- **Cross-domain `GroupFrame.tsx:511-512` note ↔ 07-06:** the same legacy bare `hidden_groups` read; 07-06 carries it.
- **Cross-domain `optionGlyph` note ↔ 08-04, 06-08:** see below.

###### Contradictions
- **05-02 vs 07-02 (where the looks record sits):** the 05 fork's cleaned Better pointed it at the catalog's per-type record; 07-02 showed a `TypeSpec` field would cycle with `columnStyles.ts` (`columnStyles.ts:3-10`). Settled for 07-02: a `PropertyType`-keyed record in `columnStyles.ts`, corrected in 05-02 in place.
- **05-13 vs Scout 09's Issues Status (I-064):** settled for 09 from source; `FrameSlide.maxWidth` predates I-064 (`d9dfc1a52`, 09-25 vs `739730c5e`, 10-18), so the issue stays open with only its wording and footnote lines corrected.
- **05 `optionGlyph` note vs 08-04 (`group_id`):** settled for 08-04. `group_id` has no reader and duplicates the nesting (`properties.ts:144,149-155`; writers `optionModel.ts:35,49`); `optionGlyph` keeps scanning the nesting (`Cells/OptionChip.tsx:27-28`), and the per-chip cost stays INFERRED.
- **05 Approach 3 vs 06-03 (`panelOrder.ts`):** dissolved; the cleaned 06-03 drops `panelOrder.ts`, leaving `moveItem.ts` as the one destination.
- **05-04 vs 08-09 vs 01-09 (helper name):** `labelled` is taken (`properties.ts:115-120`); the merged 08-09 names it `pickerOptions`. 01-09's `optionsFrom` is Reconciler A's to align.

##### Reconciliation Log

| ID | Status | Reason | Evidence |
|---|---|---|---|
| 05-10 (sub-claim) | REMOVED | "`sectionsOf` re-derives Status grouping where `optionGroupsOf` already returns the groups": the branch is already Status-only, where `optionGroupsOf` returns `def.status_groups ?? []` verbatim, so the swap changes nothing | `OptionOrderList.tsx:48-53`, `properties.ts:303` |
| 05-13 (sub-claim) | REMOVED | "I-064's premise ('no rule yet') no longer holds": `FrameSlide.maxWidth` predates the issue, and the issue asks for one rule for every pane, which a per-host prop isn't | `UIX/Menus/FrameSlide.tsx:22,83`; `git log -S maxWidth` → `d9dfc1a52` (09-25); `739730c5e` (10-18); `.claude/IssuesPM.md:1083-1085` |
| 05-11 (sub-claim) | REMOVED | "the same lie `OptionOrderList.test.tsx:91` guards against": that test guards a stale `status_groups` being read for a Select; the synthetic def is never read that way | `OptionOrderList.test.tsx:91-100`; `OptionChip.tsx:26`; `properties.ts:290` |
| 05-01 Better (original) | CORRECTED | "Move `number-editor.css.ts`'s margin rhythm into `configEditor`" would spread a broken rule | B-05-01; `number-editor.css.ts:6-9`; `Reveal.tsx:62-63` |
| 05-04 | MERGED into 08-09 | Same finding as 08-09 (`08-nexus.md`), the codebase-wide statement; 05-04's corrections are carried there | `columnStyles.ts:28,33-35`; `FormatRows.tsx:8-11`; `NumberEditor.tsx:16-29` |
| 05-04 Better (original) | CORRECTED | A `labelled` helper would reuse a name that already means the option-label transform, and `LINK_FORMAT_OPTIONS` needs no helper at all | `properties.ts:115`; `columnStyles.ts:28,33-35` |


---

#### Scout 06 — Value Surfaces (Reconciled)

Baseline `d0595b22d`. Every status below was settled by opening the cited source at HEAD; line numbers are re-cited from HEAD. "CORRECTED (lines)" marks an entry whose only fault was line drift. Paths are relative to `~/The Studio/Projects/Project Pommora`.

**The Brief's Counts:** (VERIFIED, lines re-cited)
- **Render Sites:** 9 places draw a property value. `Cell` (`Core/Properties/Cells/Cell.tsx:22`) is the shared renderer behind three hosts: `TableView.DataRow` (`Core/Views/Table/TableView.tsx:619`), `CardValue` (`Core/Views/Cards/CardValue.tsx:154`), and `PropertyPanel` (`Core/Properties/PropertyPanel.tsx:416`). Six more surfaces draw values themselves: the `PropertyPicker`/`MassPropertyPicker` option rows (`PropertyPicker.tsx:257-264`, `:350-365`), `FilterFrame.ChipsField` (`Core/Views/Settings/FilterFrame.tsx:165-183`), the FilterFrame checkbox operator glyph (`FilterFrame.tsx:411-417`), the `GroupBand` option face (`Core/Views/Bands/GroupBand.tsx:258`), `OptionOrderList` (`Core/Views/Settings/OptionOrderList.tsx:74`), and the native menu's checkbox and option rows (`Core/Interface/Menus/propertyMenuActions.ts:46-66`). GroupBand and OptionOrderList draw through the shared `OptionChip`, so they re-decide only which props to pass, not the rendering.
- **Editor-Opening Sites:** 6 places open a value editor. Three map `ValueIntent` to their own widgets: `TableView.runIntent` (`TableView.tsx:134-156`), `CardValue.runIntent` plus `CardsView`'s pickers (`CardValue.tsx:74-94`, `CardsView.tsx:486-537`), and `PropertyPanel.runIntent` (`PropertyPanel.tsx:286-304`). Two route without `valueClick` at all: `runPropertyAction` → `requestPick` → `ValuePickPresenter` (`propertyMenuActions.ts:100-111`, `ValuePickPresenter.tsx:19-48`) and `CardsView`'s add-chooser `onReveal` (`CardsView.tsx:520-532`). `FilterFrame` opens its own `PickerMenu` and `CalendarPicker` for operands (`FilterFrame.tsx:187-198`, `:352-371`).
- **Writers:** UI code never writes a value file directly. Every value surface reaches `assignValue` (`Core/Properties/assignValue.ts:87`), but the `ValueWriter` it needs is assembled three ways (06-05).

##### Inventory

Verified against `wc -l` and `git grep` at HEAD; line counts all match. Two caller counts corrected: `Cells/PropertyTypes.tsx` has 12 non-test importers (not 13), and `TextCell`'s second caller `LinkCell` is a production caller (`LinkCell.tsx:43`), not a test-only one.

| File / Symbol | Lines | Responsibility (One Line) | Callers Outside the File | Belongs Here? |
|---|---|---|---|---|
| `Core/Properties/Cells/Cell.tsx` · `Cell` | 242 | Per-type resting renderer for one value | TableView, CardValue, PropertyPanel | Yes |
| ↳ `Chips`, `SortableChip` | (183-242) | Chip run with drag-reorder for multi/context/file | — | Yes |
| `Cells/TextCell.tsx` · `TextCell` | 100 | Text value with live inline links, link gestures, and pen | Cell, LinkCell | Yes |
| `Cells/LinkCell.tsx` · `LinkCell` | 87 | Link value: page link via TextCell, address as an anchor | Cell | Yes |
| `Cells/OptionChip.tsx` · `OptionChip`, `optionGlyph`, `OptionChipData`, `STATUS_GROUP_GLYPH` | 60 | Option chip, compact glyph, and status-group glyph table | 9 files outside Cells (Schema ×3, Views ×5 incl. `bandModel.ts` type-only, PropertyPicker); `optionGlyph` used only by `Schema/OptionEditPopup.tsx:67` | Chip yes; `STATUS_GROUP_GLYPH` is a type fact (01) |
| `Cells/CheckboxGlyph.tsx` | 22 | Display-only checkbox/switch in the property's color | Cell, FilterFrame | Yes |
| `Cells/valueMenuTarget.ts` | 18 | One-call wrapper: `linkMenuTarget(resolveLink(readLinkText(raw)…))` | PropertyPanel, CardValue, TableView | Wrapper only; see 06-01 |
| `Cells/PropertyTypes.tsx` · `TYPE_META`, `propertyTypeLabel`, `propertyTypeIconName`, `propertyIcon`, `PropertyTypeIcon`, `CREATABLE_TYPES` | 97 (15-57) | Per-type label and icon table plus creatable list | 12 non-test files: Archive, Trash, PropertyFrame, Table, Cards, Visibility, … | **No.** It's catalog data (01), and no cell reads it |
| ↳ `PaneTarget`, `TITLE_TARGET`, `LOCATION_TARGET`, `STAMP_TARGETS`, `contextPaneTargets`, `schemaTargets`, `targetOption` | (59-97) | Target lists for the Filter, Sort, Group, and preview-rules panes and the panel | filterModel, SortFrame, GroupFrame, previewRules, PropertyPanel, FilterFrame | **No.** Views/Settings vocabulary |
| `Cells/columnLabel.ts` · `RESERVED_LABEL`, `columnLabel` | 19 | Display name for a column id | 7 files (Views ×5, propertyMenuActions, PropertyTypes) | **No.** It's a name fact, not a cell |
| `Pickers/PropertyPicker.tsx` · `PropertyPicker` | 401 (89-222) | Popover for options, dateTime, or file, plus the add-property chooser slide | PropertyPanel, TableView, CardsView, ValuePickPresenter | Partly; see 06-07 |
| ↳ `PickTarget`, `PickEntry` | (41-58) | Picker target union and chooser entry | useViewHost, CardsView, PropertyPanel | Yes |
| ↳ `pickGroups`, `pickShape`, `toggleValue`, `syntheticContextDef`, `pickedValue` | (60-87, 391-401) | Pure pick model | propertyMenuActions, FilterFrame, valueField, useViewHost, MassPropertyPicker | **No.** A pure module living in a component file |
| ↳ `PropertyOptionRows`, `OptionGroups`, `EditableOptionRows`, `pickSemantics` | (224-389) | Option rows, groups, and in-place option editing | MassPropertyPicker, FilterFrame | Yes (option editing is 05's) |
| `Pickers/ValueEditor.tsx` | 206 | The one CodeMirror value editor (pane and one-line field) | PropertyValueInput, TextPane | Yes |
| `Pickers/PropertyValueInput.tsx` | 124 | Routes a typed value: Number input, TextPane, or one-line editor, inline or popover | PropertyPanel, TableView, CardValue, CardsView, ValuePickPresenter | Yes |
| `Pickers/TextPane.tsx` | 59 | Text value's multi-line popover | PropertyValueInput | Yes; encodes its own value (06-10) |
| `Pickers/DateTimeValuePicker.tsx` | 33 | Calendar for a dateTime value | PropertyPicker | Yes; duplicated by FilterFrame (06-09) |
| `Pickers/MassPropertyPicker.tsx` | 50 | Option picker over a swept run of cells | TableView | Yes |
| `Pickers/massAssign.ts` · `massSelected`, `massPickCommits` | 26 | N-row pick rule | MassPropertyPicker | Merges with `pickedValue` (06-04) |
| `Pickers/filePick.ts` · `FILE_CHIP_INDEX_ATTR`, `fileChipIndex`, `fileValueWithout`, `pickFileInto`, `adoptPathInto`, `runFileMenuAction`, `fileValueMenu` | 125 | File value effects: OS dialog, adopt, chip index, file menu | Cell, PropertyPanel, TableView, CardValue, propertyMenuActions, PropertyPicker | Yes; `runFilePick` is exported but used only in-file and by its test; `fileValueMenu` has one caller (`PropertyPanel.tsx:335`, see B-06-01) |
| `Pickers/valueClick.ts` | 71 | Click and menu → `ValueIntent`, and `runValueIntent` | PropertyPanel, TableView, CardValue | Yes; see 06-01 |
| `Pickers/property-picker.css.ts` | 7 | `chooserTop`, `emptyPane` | PropertyPicker | Yes |
| `Pickers/text-pane.css` | 39 | Global CSS for `.text-pane`, `.text-pane-close`, **and** `.value-field` | ValueEditor | See 06-12 |
| `Core/Properties/PropertyPanel.tsx` | 577 | Panel: subject load, override, writer, intents, menus, row order, add/ghost, layout | PageMenu, SpaceMenu, WindowTabBody | Partly; see 06-03 |
| `Core/Properties/property-panel.css.ts` | 63 | Panel styles | PropertyPanel | Yes |
| `Core/Interface/Menus/propertyMenuActions.ts` · `propertyMenuBranches`, `runPropertyAction` | 117 | Builds the Spaces/Properties menu rows and runs a pick | entityMenuActions, useViewInteractions | Row builder belongs in `Core/Actions` (06-11) |
| `Core/Interface/Menus/ValuePickPresenter.tsx` | 49 | App-level presenter for the menu's non-option value picks | App.tsx | Removable (06-02) |
| `Core/Interface/Menus/entityMenuActions.ts` · `showEntityMenu`, `valueCommitFor` | 152 | Entity menu; `valueCommitFor` builds a throwaway writer (79-97) | Sidebar, Matrix, GroupBand | `valueCommitFor` (06-05) |
| `Core/Actions/cellMenu.ts` | 149 | Cell menu context and model | TableView, CardValue, PropertyPanel, filePick, valueClick | Yes |
| `Core/Actions/columnMenu.ts` | 129 | Column and style menu rows | useColumns, CardValue, useOptionEdit, Bundles/browser, tableMenu | Yes |
| `Core/Views/Cards/CardValue.tsx` | 171 | Card value seat: intents, menu, inline editor | CardsView | Yes; it's one of three seat copies (06-01) |
| `Core/Views/Cards/cardValueInput.ts` · `fillsBlank`, `shownColumnsFor`, `addEntriesFor`, `addColumn`, `orderAddableEntries` | 86 | Card column visibility and the add-property entries | CardsView, CardValue | Misnamed: nothing here is an "input" |
| `Core/Views/Settings/valueField.tsx` · `emptyPicker`, `useMultiValue` | 21 | A one-line `MenuCaption` wrapper and an optimistic multi toggle for filter fields | FilterFrame, LocationField | Misnamed; holds no field |
| `Core/Pages/PageMenu.tsx` | 99 | Page settings dropdown hosting the panel | SettingsMenu | Yes |
| `Core/Contexts/SpaceMenu.tsx` | 135 | Space settings dropdown hosting the panel | SettingsMenu | Yes |

**Tests in Domain:** `Cell.test.tsx` 339, `LinkCell.test.tsx` 148, `TextCell.test.tsx` 185, `OptionChip.test.tsx` 48, `PropertyTypes.test.ts` 18, `columnLabel.test.ts` 43, `PropertyPicker.pane.test.tsx` 382, `ValueEditor.test.tsx` 354, `PropertyValueInput.test.tsx` 411, `TextPane.test.tsx` 314, `filePick.test.ts` 202, `massAssign.test.ts` 46, `valueClick.test.ts` 100, `PropertyPanel.test.tsx` 472, and `ValuePickPresenter.test.tsx`.

##### Findings

###### 06-01 · Three Hand-Wired Copies of One Value Seat — CORRECTED
- **Lens:** One Way, Clearer Boundaries, Fix the Origin, Less Stuff.
- **Now:** `valueClick.ts` unified the *decision* (commit `b9624265e`: "one intent in valueClick that the Table, Cards, and the Properties panel each map to their own widget"), but the *dispatch* is still written out once per surface:
  - **Intent Maps:** `TableView.tsx:134-156`, `CardValue.tsx:74-94`, and `PropertyPanel.tsx:286-304` each give the same eight intent kinds near-identical bodies. All three map `rename` and `popover` to one popover mode; Table and the panel map `picker` and `dateTime` to one `'picker'` mode, while Cards keeps them apart (`CardValue.tsx:87-88`) only so a `'picker'` request carries the click's x for centering and a calendar doesn't (`CardsView.tsx:518`). All three `file` arms are the same one-line call, `pickFileInto(def, current, fileChipIndex(target), commit)` (`TableView.tsx:147`, `CardValue.tsx:85`, `PropertyPanel.tsx:296`); the async effect itself is already shared, as `filePick.ts:1` intends, so what repeats is the arm, not the drift.
  - **Right-Click Chains:** Table and Cards re-orchestrate the same sequence at `TableView.tsx:269-309` and `CardValue.tsx:106-131`: link → `valueMenuTarget` → `showConnectionMenu`, otherwise `cellMenuContextFor` → `popMenu(cellMenuModel)` → `runFileMenuAction` → `valueMenuIntent` → style action. The panel's value seat (`PropertyPanel.tsx:332-346`) runs only the link half plus a separate file entry (`fileValueMenu`), and every other type falls through to the row's own `propertyMenuModel` menu (`:388-391`, 06-06), so the panel is a third, differently shaped chain.
  - **Editing State:** three spellings of the same `picker | editor | popover` mode: `TableView.tsx:99-106` `Editing`, `PropertyPanel.tsx:66` `Editing`, and `CardsView.tsx:79-86` `ValuePickerRequest` plus `CardPickerKind` (`CardValue.tsx:30`).
  - **Link Seat Rule:** `seat={def.type === 'link' ? 'rename' : undefined}` appears three times (`TableView.tsx:260`, `CardsView.tsx:494`, `PropertyPanel.tsx:539`).
  - **Redundant Intent Kinds:** `rename` is reachable only for links (its only sources are the connection menu's and the link cell menu's Rename, `valueClick.ts:53`, `Actions/cellMenu.ts:131`), so it could be `popover` carrying a seat. `dateTime` is collapsed by Table and the panel; Cards reads it (above).
- **Better:** One seat module in `Core/Properties` (for example `useValueSeat`) that owns the handler table, the menu chain, and the mode state, plus one `<ValueSeat>` overlay renderer. Each host passes only its genuine differences: where a popover anchors, whether `hide` exists, how a commit is spelled, and (for the panel) its row-level menu. `ValueIntent` loses `rename`; it loses `dateTime` only if Cards derives "no click-x" from the column type instead. `valueMenuTarget.ts` folds into the chain.
- **Behavior:** Preserving, with two checks: the table passes no `hideable` (`TableView.tsx:288`, `:296`) while cards and the panel pass `true`; and collapsing `dateTime` into `picker` without a type check would start centering Cards' calendar on the click (`CardsView.tsx:518`).
- **Estimate:** −150 to −220 lines across TableView, CardValue, CardsView, and PropertyPanel, against roughly +90 for the seat · confidence: read for the duplication, inferred for the delta.
- **Corrected:** lines (`TableView.tsx` 134-156, 99-106, 260, 269-309); the panel's chain isn't the same sequence; Cards does use `dateTime`; the `file` arms are a shared call, not drift.

###### 06-02 · The Native Menu's Value Picks Run a Fourth Router Through the Session Store — CORRECTED
- **Lens:** One Way, Clearer Boundaries, Less Stuff.
- **Now:** `runPropertyAction` (`propertyMenuActions.ts:100-111`) decides by type on its own: File → `pickFileInto`; anything else → `useSession.getState().requestPick(...)`. That writes `pendingPick` into the chrome slice (`Core/Session/chromeSlice.ts:17-37`, `:74-76`), where the app-level `ValuePickPresenter` (`ValuePickPresenter.tsx:19-48`) decides again (dateTime → `PropertyPicker`; else → `PropertyValueInput` popover) and keeps its own `picked` echo state (`:15`, `:18`), used only by the dateTime arm. `MatrixView.tsx:45` and `:82` also read `pendingPick` to hold its menu. The checkbox rule is restated as well: `CHECKBOX_OPTIONS` (`propertyMenuActions.ts:20-23`) and `value === 'true' ? {…true} : null` (`:113-114`) restate `valueClickIntent`'s checkbox arm (`valueClick.ts:30-33`) that "unchecked" is a removed key. The "which properties does this surface treat as editable" question is answered with two different predicates across nine non-test sites: `origin === 'user'` (user-made only, so Contexts are excluded — `propertyMenuActions.ts:69`, `Cells/PropertyTypes.tsx:45`, `Properties/schema.ts:65`, `Views/Host/useViewCreation.ts:246`, `Views/Settings/SortFrame.tsx:92`, `Actions/cellMenu.ts:76`, `Views/Host/useViewHost.ts:217`) and `origin !== 'stamp'` (Contexts included — `valueClick.ts:28`, `Views/Cards/cardValueInput.ts:20`). The two answer different questions, so they don't fold into one predicate.
- **Better:** The menu leaf asks the seat from 06-01 for a "fill from away" intent, which is a popover anchored at the menu trigger. The presenter then becomes one more seat mount, or its channel stays but carries a `ValueIntent` instead of re-deciding by type. Checkbox Check/Uncheck derives from the intent's commit value. The pure row builder moves to `Core/Actions` (06-11). If the catalog gains editability facts (01), it carries both "user-made" and "fillable" rather than one.
- **Behavior:** Preserving.
- **Estimate:** −40 to −60 lines · confidence: read.
- **Corrected:** the "fifth spelling of one predicate" is two predicates over nine sites; `useViewHost.ts` lives at `Core/Views/Host/`.

###### 06-03 · `PropertyPanel.tsx` Holds Five Jobs — CORRECTED
- **Lens:** Clearer Boundaries, Less to Understand.
- **Now:** The 577 lines hold:
  1. **Subject Loading:** the page-detail read, `base` state, the `useValuesEpoch` subscription, and override retirement (`:101-149`). It reads the shared page-detail cache (`readPageDetail`/`fetchPageDetail`, `Core/Session/pageDetailCache.ts:36`, `:118`), the same cache GlancePane, PageTile, windowTabBanner, and navigation use; `fetchPageRow` (`Core/Properties/pageRow.ts:60-67`, used by `entityMenuActions.ts:57`) reads `view:loadValues` instead, deliberately so the menu doesn't build on the cache (`832970031`: "The sidebar branch read the page-detail cache and wrote from it, so a second pick built on pre-write frontmatter").
  2. **The Writer:** `:192-206`.
  3. **Value Seating:** intents and menus (`:286-358`), the copy covered in 06-01.
  4. **Row Ordering:** three different writes behind one drag (`commitOrder`, `:240-274`): `setSpaceRowOrder`, `reorderPanelContexts`, and `dialer().ask('schema:reorder')`. The last bypasses `mutate` (no `mutate` op exists for it; `PropertyFrame.tsx:266` uses the same channel) and wraps a hand-rolled `sendWithUndo` (`:232-239`).
  5. **Add Rows:** the add row, ghost, and held presence (`:448-529`).

  It also carries a second menu vocabulary (06-06) and the `revealed` set that outlives subject changes (Ledger L-05).
- **Better:** (1) can become a `useSubjectRow(subject)` hook beside the panel; it has no twin to merge with, since `showEntityMenu` is a non-hook one-shot that intentionally reads a different channel. (2) and (3) go to the seat from 06-01. (4) stays in the panel or moves as a unit; a new `panelOrder.ts` would be a move with no consolidation, and routing `schema:reorder` through `mutate` is I-032's fold, not a panel change. The panel keeps layout and add rows.
- **Behavior:** Preserving.
- **Estimate:** The panel drops to about 350 lines through 06-01/06-05/06-06; net −40 to −80 comes from those, not from (1) or (4) · confidence: read for structure, inferred for the delta.
- **Corrected:** (1) isn't a second `fetchPageRow`; the hook/twin reuse and `panelOrder.ts` add a file without removing anything.

###### 06-04 · The Pick Rule Is Written Twice: Single Row and Mass — VERIFIED
- **Lens:** One Way, Less Stuff.
- **Now:** `pickedValue` (`PropertyPicker.tsx:391-401`): a repeat Select clears, and every other kind toggles. `massPickCommits` (`massAssign.ts:8-26`): all-hold clears all, otherwise non-holders are set; for multi, the unanimity toggle. For one row, `massPickCommits([selectedValues(current)], v, kind)` produces exactly `pickedValue`'s result (re-traced: a Select's `selectedValues` has at most one entry, so `holds` equals `includes`; the multi branch's `own.includes(value) !== unanimous` is always false for one row). The "Select closes after a pick" rule is also duplicated: `PropertyPicker.tsx:386` and `MassPropertyPicker.tsx:36`. `toggleValue` (`PropertyPicker.tsx:79`) is imported by `Views/Settings/valueField.tsx:4`.
- **Better:** One pure `pickModel.ts` holding `pickGroups`, `pickShape`, `toggleValue`, `syntheticContextDef`, the N-row rule, and `pickedValue` as its one-row case. `massAssign.ts` merges into it, and `PropertyPicker.tsx` keeps only components. *(inferred)* `MassPropertyPicker` (a `PickerMenu` around `PropertyOptionRows`, `MassPropertyPicker.tsx:38-49`) can become a `currents` prop on `PropertyPicker`.
- **Behavior:** Preserving.
- **Estimate:** −40 to −60 · confidence: read.

###### 06-05 · `ValueWriter` Is Assembled Three Ways — CORRECTED
- **Lens:** One Write Path, One Way.
- **Now:** `assignValue` is the one pipeline, but its writer is hand-built at each host:
  - `Core/Views/Host/useViewHost.ts:171-182`: a ref plus effect, `rows.find`, and `patchOverride`.
  - `PropertyPanel.tsx:192-203`: the same shape, reading one row.
  - `entityMenuActions.ts:79-97` `valueCommitFor`: a fake ref whose `apply` reassigns a closure-local `row` and drops the `write` and `contexts` arguments. The dropped `contexts` is inert: a context restore writes `prior` without reading the row (`assignValue.ts:67`), and a native-menu Context pick is a single commit per writer (`propertyMenuActions.ts:115`).

  `ValueWriter.apply` is the optimistic-override patch every write lands through (`assignValue.ts:34`); `rowOf` serves both the assign-time live row (`:95`) and undo's live-row read (`:109-113`).
- **Better:** One `useValueWriter(schema, rowsById, setOverride)` hook for the two React hosts, plus one exported `oneShotWriter(schema, row)` beside `assignValue` for menus, so no caller re-spells the interface. If 06-02 lands, the menu path uses the seat's writer and `valueCommitFor` goes away.
- **Behavior:** Preserving.
- **Estimate:** −20 to −30 · confidence: read.
- **Corrected:** `rowOf`/`apply` aren't undo-only; the dropped `contexts` is inert rather than load-bearing on luck.

###### 06-06 · The Panel's Row Menu Is a Parallel Vocabulary — CORRECTED
- **Lens:** One Vocabulary, One Way.
- **Now:** `PropertyPanel.rowMenu` (`:319-331`) pops `propertyMenuModel({kind:'page-value'})` (`Core/Actions/propertyMenu.ts:9`, `:15-17`, `:31-38`), whose actions are `value:edit`, `value:clear`, and `value:remove`, and hand-maps them. It fires for every row's label and, through bubbling, for every value seat that isn't a link or file (`PropertyPanel.tsx:388-402`). The link value seat instead uses `cellMenuModel({kind:'link', …, hideable:true})` (`:344`), whose `cell:clear` and `cell:hide` map through `valueMenuIntent`. That's two models and two action sets for "Clear · Remove" on one panel. Commit `eb82f1234` states the goal for Text only ("a Text value's right-click reads Edit · Clear · Remove on every surface").
- **Better:** Delete the `page-value` kind and its three actions. The panel row maps through `cellMenuModel` and `valueMenuIntent`, so `hide` → the panel's `emptyRow(id, false)` and `commit null` → `emptyRow(id, true)`. It can't call `cellMenuContextFor` as-is: that returns `style-only` for Select, Multi-Select, Status, Date, Number, and Checkbox (`cellMenu.ts:73-84`), which would add Style submenus with no view to style and drop Clear from Checkbox (`clearable` is unset for it, `:77-84`). The panel passes `{ kind: 'bare', clearable: filled, hideable: true }` for those types (an existing kind, `cellMenu.ts:26`) and the text/link kinds otherwise.
- **Behavior:** Preserving for every type under the `bare` mapping, apart from one addition: a Link row's label right-click gains Edit and Rename, which its value seat already offers, where planning finds that's the cohesive move [Intended as J-3].
- **Estimate:** −20 · confidence: read.
- **Corrected:** the panel's value seat uses `cellMenuModel` only for links; the commit's goal is Text-specific; the Better's `cellMenuContextFor` route would change the menu, so it routes through `bare`.

###### 06-07 · `PropertyPicker`'s File Pane Is Reachable From One Surface, and It Gives a Different UI — CORRECTED
- **Lens:** Always Intentional, One Way, Behavior Is a Decision.
- **Now:** Every click, menu, and panel route for a File value opens the OS dialog directly through `pickFileInto` (`TableView.tsx:147`, `CardValue.tsx:85`, `PropertyPanel.tsx:296`, `propertyMenuActions.ts:101`). `PropertyPicker`'s `kind:'file'` pane (`PropertyPicker.tsx:142-158`) instead renders a `PathField` ("Choose a file" plus a Browse button and a typed-path commit through `adoptPathInto`, `filePick.ts:62-69`, whose only caller is that pane). It's reachable only through `CardsView`'s add-chooser: File isn't drillable (`pickKindOf('file')` is `null`, `properties.ts:71`; `CardsView.tsx:509`), so `onReveal` sets `kind: 'file'` (`CardsView.tsx:528`), and `PROPERTY_PICKER_KINDS` includes `'file'` (`:88`). The table's picker opens only on `picker`/`dateTime` intents, and the panel's `panelTarget` (`PropertyPanel.tsx:361-377`) never builds `file`. `useViewHost.pickTarget`'s `file` arm (`Core/Views/Host/useViewHost.ts:225`) exists for this one route.
- **Better:** Cards' add-chooser keeps its typed-path File pane, as cards' file handling is intended [Intended as J-7], so the pane, `adoptPathInto`, `PickTarget`'s `file` member, and the `pickTarget` arm stay; the shared value seat (Approach A) carries the route as Cards' one genuine difference. See Ledger L-01.
- **Behavior:** Preserving.
- **Estimate:** ±0 · confidence: read.

###### 06-08 · Per-Cell Subscriptions and Lookups Ignore the Pattern `ValueContext` Set — INFERRED
- **Lens:** Hot Paths Stay Cold.
- **Now (mechanism read):** `ValueContext.assets` exists so that "one subscription serves the whole view instead of one per rendered value" (`Core/Properties/valueContext.ts:12`). Yet:
  - `TextCell` opens three store subscriptions per instance (`TextCell.tsx:31-34`: `useSetting('headingLinkStyle')`, `useSetting('inPageHeadingResolution')`, and `useSession(s.headings[ownPath])`, which still subscribes when `ownPath` is null).
  - `LinkCell` opens two through `useLinkTitle` (`Core/Web/useLinkTitle.ts:5-6`) even when the display isn't `link-title` (the hook is called before the page-link early return, `LinkCell.tsx:40-41`), and a page link nests a `TextCell` for three more.
  - Every `TextCell` render re-splits the text, recomputes line offsets, and re-runs `renderCellContent` per line (`TextCell.tsx:56-57`, `:78`) and rebuilds `linkGestures` closures (`:40-45`).
  - `Cell` scans `ctx.schema.find` (`Cell.tsx:45`) right after `resolveFieldValue` did the same scan (`Core/Properties/value.ts:48`). `schema.find((d) => d.id === …)` appears 6× in TableView, 4× in PropertyPanel, and 3× in assignValue (`git grep -c`).
  - Compact status chips run `status_groups.find(g => g.options.some(...))` per chip (`OptionChip.tsx:28`).

  `Cell` isn't memoized; `DataRow` is (`TableView.tsx:619`).
- **Unsettled:** whether any of this costs a frame. Any change to `ctx` or `styleByCol` re-renders every visible cell's markdown, and N text columns × M visible rows hold about 3·N·M selectors that every store write evaluates. Settling it needs a React profiler trace of a store write (and of a scroll) on a text-heavy Table at benchmark scale; `~/Benchmark-*` doesn't exist right now, so it has to be rebuilt first (`.claude/scripts/make-benchmark-nexus.mjs`).
- **Better:** Put the two heading settings on `ValueContext` (built once in `buildValueContext`, `valueContext.ts:22-29`). `TextCell` reads `headings` only when `mayNameOwnHeading`. Split `LinkCell` into `PageLinkCell` and `AddressCell` so `useLinkTitle` runs only for addresses. Memoize the parsed lines on `text`. For the definition lookup, *settled by Reconciler B for 07-01:* the column carries `def` and `type` (07-01), and no `defById` goes on `ValueContext`. The scan's origin is `resolveFieldValue` (`value.ts:48`), which the pipeline calls with an id and no `ValueContext` (`filter.ts:85`, `sort.ts:34`, `group.ts:178`), so a context-held map would serve cells only and leave a second way beside 07-01's compiled `fieldOf` reader.
- **Behavior:** Preserving.
- **Estimate:** ±0 to −10 · confidence: read for the mechanism, unmeasured for the cost.

###### 06-09 · Chip and Date-Pane Rendering Re-Decided per Surface — CORRECTED
- **Lens:** Type Facts Once.
- **Now:**
  - **Context vs. Option Chips:** `contextOptions ? <NeutralChip color={colorNameFor(o.color)} title icon/> : <OptionChip type def option/>` is forked at `Cell.tsx:96-116` (with `:64-95`), `PropertyPicker.tsx:259-263`, and `FilterFrame.tsx:167-182`. The `OptionChip` prop subsets differ (`Cell.tsx:82-92` passes no `def` for multi while `:68-74` does for select; `GroupFrame.tsx:414` passes `type={subDef?.type ?? ''}`), but the differences are inert: `def` feeds only the compact Status glyph (`OptionChip.tsx:24-29`), and the GroupFrame chip passes no `look`, so no glyph is drawn.
  - **Stringly Typed:** `OptionChip.type` is `string` (`OptionChip.tsx:22`, `:40`), not `PropertyType`.
  - **Type Knowledge in UIX:** `optionShapeFor(type: string)` returns `type === 'status' ? 'pill' : 'tag'` (`UIX/Labels/recipes.tsx:11-13`), called from three Core files. That's a property-type fact in the kit, which "reaches nothing outside itself".
  - **Duplicated Date Pane:** `DateTimeValuePicker.tsx:18-31` and `FilterFrame.tsx:352-371` both do `fmt === 'relative' ? 'short' : fmt` → `CalendarPicker` with `formatDate(k, fmt, 'none')`. They resolve the clock differently: the filter always uses the Nexus clock (`FilterFrame.tsx:235`, `:365`), while the value picker uses the column's clock (`DateTimeValuePicker.tsx:20`).
- **Better:** One `ValueChip({def, option, look, onRemove})` that picks neutral, tag, or pill from the type spec, and `optionShapeFor` leaves UIX in favor of a `shape` in the type facts (01). FilterFrame's date slot mounts `DateTimeValuePicker`.
- **Behavior:** Preserving, except that the filter's date picker follows the column's clock [Intended as J-1].
- **Estimate:** −25 · confidence: read.
- **Corrected:** the prop "drift" changes nothing a user sees; lines.

###### 06-10 · Text Values Have Two Encoders — VERIFIED
- **Lens:** One Way, Type Facts Once.
- **Now:** `PropertyValueInput` builds Text values through `parseEditorValue` → `textFromEdit` (`Core/Properties/parseEditorValue.ts:20-27`, first line only, lines behind it kept). `TextPane` builds its own: `text === '' ? null : { kind: 'text', value: text }` (`TextPane.tsx:47`), with no trim rule. `TextPane` also opens on `current.value` (`:43`) while the field opens on `editorText` (`parseEditorValue.ts:15`). The blank checks differ too: `''` versus `value.trim() === ''`.
- **Better:** `parseEditorValue` gains a whole-text mode (or `TextPane` calls a `textFromPane` sibling in the same file), so one module states how a typed Text becomes a value.
- **Behavior:** A whitespace-only pane clears instead of writing spaces, since text holding only spaces counts as empty on every surface [Intended as J-1].
- **Estimate:** ±0 · confidence: read.

###### 06-11 · Non-Cell and Non-Picker Facts Live in `Cells/` and `Pickers/` — CORRECTED
- **Lens:** Clearer Boundaries, Less to Understand, Type Facts Once.
- **Now:**
  - **Type Table:** `Cells/PropertyTypes.tsx` `TYPE_META` (`:21-35`) is a second per-type table beside `PROPERTY_TYPES` (`Core/Properties/properties.ts:34-47`). Its other half, `PaneTarget` and related (`:59-97`), serves filterModel, SortFrame, GroupFrame, previewRules, FilterFrame, and the panel. 'Title' is spelled twice (`PropertyTypes.tsx:22` and `columnLabel.ts:5`); the stamp labels are already shared (`PropertyTypes.tsx:33-34` reads `RESERVED_LABEL`).
  - **Column Names:** `Cells/columnLabel.ts` is a display-name rule used by Views and menus.
  - **Pure Model in a Component File:** `PropertyPicker.tsx` exports five pure model functions (06-04).
  - **Misplaced Row Builder:** `Interface/Menus/propertyMenuActions.ts:38-75` `propertyMenuBranches` is a pure row builder, but the Codebase Structure puts "row builders" in `Core/Actions`, where its other half, `propertyRows.ts`, already lives. `runPropertyAction` (`:77-117`) reaches the session store and stays in `Interface/Menus`.
  - **Misnamed Files:** `Views/Cards/cardValueInput.ts` holds card visibility and add entries, not input. `Views/Settings/valueField.tsx` holds a `MenuCaption` one-liner and a multi-toggle hook, not a field; it's already the one module its two callers share (`FilterFrame.tsx:55`, `LocationField.tsx:13`).
  - **Unused Exports:** `runFilePick` is exported only for its test, and `optionGlyph` has one external caller.
- **Better:** `TYPE_META` (label, icon, and shape from 06-09) moves into the type spec (01's call). `PaneTarget` and related move to one Views-root `.ts` beside `filterModel.ts` (*settled by Reconciler B:* not under `Views/Settings/`, since `Views/filterModel.ts` and `Navigation/previewRules.ts` are consumers outside Settings and `filterModel.ts` imports nothing from Settings). `columnLabel` moves beside `declaredType` in `value.ts`, or into the catalog. The pick model moves to `Pickers/pickModel.ts`. `propertyMenuBranches` moves into `Actions/propertyRows.ts`. Rename `cardValueInput.ts` → `cardColumns.ts`, and give `valueField.tsx` a name for what it holds (it stays the shared module). `Cells/` then holds cells only.
- **Behavior:** Preserving.
- **Estimate:** −10 (moves mostly) · confidence: read.
- **Corrected:** `useMultiValue`/`emptyPicker` already sit in their callers' shared file, so the Better is a rename, not a move or inline.

###### 06-12 · `text-pane.css` Is Named for One of the Two Components It Styles — CORRECTED
- **Lens:** Always Intentional, Less to Understand.
- **Now:** `Pickers/text-pane.css` (39 lines, side-effect imported at `ValueEditor.tsx:23`) styles TextPane's `.text-pane` and `.text-pane-close` (`:2-22`; set by `TextPane.tsx:40`, `:54`) **and** ValueEditor's one-line `.value-field` (`:24-39`; toggled at `ValueEditor.tsx:197`). It's the only plain `.css` in `Core/Properties`, but plain global CSS is Core's majority convention (29 `.css` files versus 20 `.css.ts`, `git ls-files`), and MarkdownPM's own surfaces are global (`Core/MarkdownPM/markdown-pm.css`); these rules override `.mdpm-editor .cm-content`, which is that pattern.
- **Better:** Optional: name it for both (for example `value-editor.css`, imported by both components) or leave it. Converting to `.css.ts` would make it the odd one out among editor overrides.
- **Behavior:** Preserving.
- **Estimate:** ±0 · confidence: read.
- **Corrected:** "the one global stylesheet among `.css.ts` siblings" is true only within `Core/Properties`; the codebase convention favors it, so the finding reduces to a name.

###### 06-14 · The Checkbox "Blank Still Renders" Rule Is Stated Four Times — VERIFIED
- **Lens:** Type Facts Once.
- **Now:** `Cell.tsx:50-58` checks for a checkbox before the blank test. `cardValueInput.ts:18-21` `fillsBlank` excludes checkbox. `cardValueInput.ts:35` keeps a blank checkbox in compact. `CardsView.tsx:217-218` keeps the picker open for a blank checkbox.
- **Better:** One spec fact, for example `PROPERTY_TYPES[t].blankDraws: true` (01), read at those four sites.
- **Behavior:** Preserving.
- **Estimate:** ±0 · confidence: read.

###### 06-15 · Describers: Doc Claims the Code Contradicts, and Overlapping Tests — CORRECTED
- **Lens:** Describers Get Swept.
- **Now:**
  - **Doc:** *§The Value Picker* (`.claude/Features/PropertiesPM.md:117`) says that setting a value "runs through one control (`PropertyPicker.tsx`) across every surface" and offers "a file field for File". In the code, typed values go through `PropertyValueInput` (the same paragraph's later sentence half-admits this), File goes through the OS dialog everywhere but Cards' add path (06-07), and the menu goes through `ValuePickPresenter`. The same paragraph re-describes the panel, which *§The Properties Panel* (`:119`) covers again.
  - **Tests:** the overlap is narrower than "three files pin the same mechanics". `ValueEditor.test.tsx` covers only the one-line mode (`:83`); `TextPane.test.tsx` is in effect the pane mode's coverage, and its Escape test (`:179`, "Escape commits the typed text once") pins the opposite of the one-line Escape (`ValueEditor.test.tsx:157`, "cancels without a commit"). The alias-memory tests pin each wrapper's `remembers` routing (`PropertyValueInput.test.tsx:363` link → never, `:400` one-line Text → flush, `TextPane.test.tsx:150` the pane's default) beside the mechanism (`ValueEditor.test.tsx:306-350`). The real duplicates are the outside-write pair (`ValueEditor.test.tsx:240`, `TextPane.test.tsx:223`) and the one-line no-commit Escape (`ValueEditor.test.tsx:157` versus `PropertyValueInput.test.tsx:340`). `PropertyPicker.pane.test.tsx:140` pins the file pane from 06-07.
- **Better:** Rewrite §The Value Picker to name the real controls: `PropertyPicker` for options and dates, `PropertyValueInput` for typed values, the OS dialog for files, and the path field on Cards' add-chooser. Remove the duplicated panel sentence. Collapse the two duplicate pairs, keeping each wrapper's routing tests.
- **Behavior:** Preserving.
- **Estimate:** about −15 to −30 test lines · confidence: read.
- **Corrected:** the test overlap and its estimate (−80 to −120 → −15 to −30).

###### B-06-01 · The Panel's File Value Seat Swallows the Row Menu — VERIFIED
- **Lens:** One Way, Always Intentional.
- **Now:** A right-click on a File value in the panel calls `fileValueMenu` (`PropertyPanel.tsx:334-336`), which pops `cellMenuModel({ kind: 'file', onChip })` with no `hideable` (`filePick.ts:116-125`) and then prevents the event (`PropertyPanel.tsx:399-401`), so the row's Clear · Remove menu never opens there. A right-click on every other non-link value bubbles to that row menu (`:388-391`), and Cards' file menu passes `hideable: true` and offers "Remove from View" (`CardValue.tsx:120-124`, `cellMenu.ts:94`). `fileValueMenu` has this one caller.
- **Better:** If Nathan takes the change, it falls out of 06-01/06-06: the panel seat maps a File value through `cellMenuModel({ kind: 'file', onChip, hideable: true })` like Cards, and `fileValueMenu` leaves `filePick.ts`.
- **Behavior:** Changes slightly: a panel File value's right-click gains the row's Remove. Agent's choice or accident (dates to the monorepo move, `0cdb92cd2`); it's open for Nathan under the decision log's *§Open Items*.
- **Estimate:** −10 · confidence: read.

##### Behavior Ledger

| # | Behavior | Where | Code Cost | Origin | Classification | Status |
|---|---|---|---|---|---|---|
| L-01 | Adding a File property from a card's chooser shows a path field (Browse plus typed path); every other route opens the OS dialog | `PropertyPicker.tsx:142-158`, `CardsView.tsx:528` | ~35 lines | The direct dialog routes date from `a22317e3b` (08-22, "a file value fills, replaces and clears everywhere"); `4d0a63975` (09-06) folded the Cards chooser's own file popup into `PropertyPicker`'s target union and kept its pane | **Nathan's Intent** [Intended as J-7]: cards' file handling is intended | CORRECTED (origin: the pane didn't predate the direct routes) |
| L-02 | Unchecking removes the key; the app never writes a stored "false" | `valueClick.ts:1`, `:30-33`, `propertyMenuActions.ts:114`, `propertyValue.ts:315-325` | Small | `4264df480` (checkbox word pairs) and the valueClick header | **Nathan's Intent** [Intended as J-2]; a per-property choice to write `false` is a prospect | VERIFIED |
| L-03 | A repeat pick on a Select clears it; on a mass run, all-holding clears every row, otherwise only non-holders are set | `PropertyPicker.tsx:391-401`, `massAssign.ts:13-19` | Two rules (06-04) | Docstring "a repeat select clears" from `d6829a48c` (09-11) | **Agent's Choice** | CORRECTED (origin was `b9624265e`-era) |
| L-04 | Clicking a Link value edits it; only its text follows | `valueClick.ts:20`, `:44-46` | — | `a1ada0fc1` "a click on a Link value edits it while its text follows on its own" | **Agent's Choice**, an explicit refactor | VERIFIED |
| L-05 | A row revealed in the Properties panel stays shown, empty, after moving to another page or Space, until the Nexus changes | `PropertyPanel.tsx:151-157` (comment "KNOB — a row added this session outlives a subject change") | ~7 lines | KNOB added in `268f14691` (09-21); the doc echoes it ("was added in the session", `PropertiesPM.md:119`) | **Agent's Choice**, flagged by its own author as a knob. Nathan's words keep an added row shown until it resets on another page [Intended as J-5], which differs from today's Nexus-change reset (the decision log's *§Open Items*) | CORRECTED (dated) |
| L-06 | The panel's Clear empties the value and keeps the row; Remove empties it and hides the row | `PropertyPanel.tsx:314-318`, `:329-330` | — | `eb82f1234` | **Agent's Choice**, consistent with the menu copy | VERIFIED |
| L-07 | A number drawn as a bar opens a popover on click instead of an inline field | `valueClick.ts:43` | — | `b9624265e` "a number drawn as a bar opens the number picker on every surface" | **Agent's Choice**, reasonable since a bar has no text seat | VERIFIED |
| L-08 | A number popover shows a leading `#` when the format names no symbol | `PropertyValueInput.tsx:56-62` | 1 line | `e629012b3` (10-19) "the picker named only a symbol-less number with #" | **Agent's Choice**, made explicitly | CORRECTED (origin found) |
| L-09 | An inline Text field edits only the first line, and the lines behind it ride through | `parseEditorValue.ts:12-27` | ~10 lines | `b80a7b12a` "edits its first line in the shared field" | **Agent's Choice**. Surprising to a user who edits a multi-line value inline | VERIFIED |
| L-10 | Compact Cards drop blank values (except checkboxes) and close an open picker when the value goes blank | `cardValueInput.ts:23-36`, `CardsView.tsx:211-219` | ~12 lines | Comment only | **Agent's Choice** | VERIFIED |
| L-11 | Cards hide the chip × below 80% zoom | `CardsView.tsx:460` `allowInlineRemove={effectiveZoom >= 0.8}` | 1 line | Predates the 09-06 monorepo move; no commit isolated it | **Nathan's Intent** [Intended as J-6] | VERIFIED |
| L-12 | A Status picker can reorder and edit options but can't create one | `PropertyPicker.tsx:312` (`creates = … options === 'select'`) | — | `033a3d86d` "the + footer stays Select's and Multi-Select's"; test `PropertyPicker.pane.test.tsx:325` | **Agent's Choice.** A new Status option would need a group; planning recommends whether the picker creates one [Intended as J-8] | CORRECTED (origin found) |
| L-13 | The native Properties menu lists option-holding properties first, then leaves | `propertyMenuActions.ts:73` | 1 line | `832970031` "Option-bearing properties lead the schema group ahead of the leaves" | **Agent's Choice**, made explicitly | CORRECTED (origin found) |
| L-14 | The text pen's accessible name reads "Open in TextPane", a component name exposed to users and VoiceOver | `TextCell.tsx:89` | 1 line | `f1bf08f74` | **Accident**; the label reads "Open In Editor" [Intended as J-4] | VERIFIED |
| L-15 | Filter date operands use the Nexus clock; value pickers use the column's clock | `FilterFrame.tsx:365` vs `DateTimeValuePicker.tsx:20` | (06-09) | No commit isolated it | **Accident** *(classification inferred)*; filters follow the column's clock [Intended as J-1] | VERIFIED |

##### Approaches

**A · One Value Seat (06-01 + 06-03 + 06-05 + 06-06 + B-06-01) — INFERRED**
- **Removes:** three intent maps, two identical right-click chains plus the panel's third, three editing-state types, three link-seat lines, the panel's `page-value` menu kind, the `rename` intent kind (and `dateTime` if Cards derives its no-click-x rule from type), `valueMenuTarget.ts`, two writer assemblies, and `fileValueMenu` if B-06-01 lands.
- **Costs:** one `useValueSeat` and `<ValueSeat>` module (about 120 lines) and a hosts' parameter shape: anchor, hideable, commit, and the panel's row-menu mapping (06-06's `bare` context).
- **Risks:** The panel's Space subject has no `holder` and has `hideable`-as-unreveal semantics. Cards' ghost hold (`holdGhost`, `CardValue.tsx:61-67`) and the table's `interactions.runTitleAction` (`TableView.tsx:306`) interleave with the menu chain, so the seat needs a "before/after menu" hook or a title-action passthrough. The table's lingering `lastOpened` popover keying (`TableView.tsx:110-111`, `:226-265`) has to survive. Estimated net −150 to −250, unmeasured until designed.

**B · Fold the Menu Path Into the Seat (06-02) — VERIFIED**
- **Removes:** `ValuePickPresenter.tsx`, the `pendingPick`/`requestPick`/`dismissPick` channel (or its type-deciding half), `CHECKBOX_OPTIONS`, the presenter's echo state, and `valueCommitFor`.
- **Costs:** An app-level seat instance must exist for menus that open off-surface (sidebar, Matrix), so the session channel may stay as "open seat at trigger with intent". Matrix's `pendingPick` hold (`MatrixView.tsx:45`, `:82`) must follow it.
- **Risks:** Low; it depends on A. Cards' file pane route stays [Intended as J-7].

**C · Relocate the Facts (06-09 + 06-11 + 06-14) — CORRECTED**
- **Removes:** `TYPE_META` as a separate table, `optionShapeFor` from UIX, 'Title' spelled twice, the four-site checkbox blank rule (as a spec field), `PropertyTypes.tsx`'s PaneTarget half, and misnamed files. The editability predicates become two named spec facts ("user-made" and "fillable", 06-02), not one.
- **Costs:** It touches 01's catalog shape, so it's coordinated with Scout 01. It's mostly moves and renames across about 20 import sites.
- **Risks:** It's churn-heavy for a small line delta. Its value is *Less to Understand*, not lines. Best landed in the same pass as 01's type-spec rewrite so imports move once.
- **Corrected:** the "five-site `origin === 'user'` restatement" is two predicates over nine sites.

##### Cross-Domain Notes

- **01 Catalog — CORRECTED:** `TYPE_META`, `STATUS_GROUP_GLYPH`, `optionShapeFor`, a "blank draws" fact, and two editability facts ("user-made", `origin === 'user'`; "fillable", `origin !== 'stamp'`) all want to be `TypeSpec` fields (`properties.ts:27-47`).
- **01/03 — VERIFIED:** `syntheticContextDef` (`PropertyPicker.tsx:82-87`) fabricates a definition with empty `label` and `key` at six call sites (`propertyMenuActions.ts:72,96`, `PropertyPanel.tsx:364,403`, `useViewHost.ts:212`, `FilterFrame.tsx:378`) so that Contexts fit Property APIs, a sentinel worth judging at the model level.
- **02 Values — CORRECTED:** `ValueWriter.apply` is the optimistic patch every write lands through (`assignValue.ts:34`) and `rowOf` seeds both the assign (`:95`) and undo's live-row read (`:109-113`). I-063's raw-first question would reshape the undo half, so settle that before 06-05.
- **02 Values — VERIFIED:** `editorText` and `parseEditorValue` (`parseEditorValue.ts`) are the typed-value codec. TextPane's bypass (06-10) belongs to that codec.
- **05 Schema Surfaces — VERIFIED:** `EditableOptionRows` (`PropertyPicker.tsx:296-372`) embeds the `useOptionEdit` option editor inside the value picker, so option-edit changes there land in a value-surface file.
- **07 Views — VERIFIED:** `useViewHost.pickTarget` (`useViewHost.ts:211-234`) and `PropertyPanel.panelTarget` (`PropertyPanel.tsx:361-377`) are two `PickTarget` builders. The panel's version omits `style`, and with it the look, so its option chips always render standard (`PropertyPicker.tsx:251`).
- **07 Views — VERIFIED:** `CardsView.onReveal`'s `src.type === 'dateTime' || 'file' ? … : 'popover'` (`CardsView.tsx:528`) is a third type router for "fill from away".
- **I-032 — VERIFIED:** `PropertyPanel.commitOrder` writes the schema order through `dialer().ask('schema:reorder')` (`PropertyPanel.tsx:270`), beside `mutate`, while its two sibling reorders use `mutate`.
- **Hot-path follow-up — VERIFIED:** `schema.find((d) => d.id === …)` appears 35 times across non-test Core (`git grep -c`). One shared lookup would serve Views' pipeline as well; 07-01 proposes carrying it on `ResolvedColumn`, which competes with a `ValueContext.defById` (06-08).

##### Overlaps & Contradictions

###### Merged Within Reports 05–09
- None merged whole. 06-15's PropertiesPM:117/:119 duplicate-panel point is also a row in 09's Doc Claims table and part of 09-05; the plan carries it once under 09-05's PropertiesPM rewrite, with 06-15's Value Picker correction as its content.

###### Cross-Report Overlaps
- **06-01 ↔ 07 Per-Type Branch Map (Link `seat`):** three copies confirmed by both (`TableView.tsx:260`, `CardsView.tsx:494`, `PropertyPanel.tsx:539`).
- **06-03 ↔ 05-06, 05-08:** the panel's borrowed ghost hook and `nexusReorderIndex`; ↔ I-032 and 03 for `schema:reorder` outside `mutate`.
- **06-04 ↔ 02-10:** mass assign is N writes.
- **06-05 ↔ 02 Write Paths, 02-02 / I-063, 09-13:** the undo half of `ValueWriter` and `restoreValue`.
- **06-08 ↔ 07-01, 07-05, 02-13:** the per-cell `schema.find` and hot-path recompute; ↔ 08-04 and 05's `optionGlyph` note for the per-chip `status_groups` scan.
- **06-09 ↔ 01-06:** `optionShapeFor` in UIX; 01-06 adds the Select glyph mismatch.
- **06-10 ↔ 02-05:** one value encoder.
- **06-11 ↔ 01-08, 08-11:** `PaneTarget`'s home; ↔ 01-01 for `TYPE_META`.
- **06-12 ↔ 08-12, 02-08:** file names that don't say what's inside.
- **06-14 ↔ 01-15:** `cardValueInput.ts:35` re-asks `fillsBlank`'s checkbox rule.
- **06-15 ↔ 05-13, 09-06:** test-title sweep; ↔ 08-14, 09-05 for PropertiesPM.

###### Contradictions
- **06-08 vs 07-01 (definition lookup):** settled for 07-01; the column carries `def`/`type` and the pipeline compiles one reader, since the pipeline resolves by id with no `ValueContext` (`value.ts:48`, `filter.ts:85`, `sort.ts:34`, `group.ts:178`). 02-13's per-schema `byId` alternative is Reconciler A's; it should land as 07-01's single route or not at all.
- **06-11 vs 08-11 vs 01-08 (pane targets):** settled for a Views-root module beside `filterModel.ts` (consumers `Views/filterModel.ts` and `Navigation/previewRules.ts` sit outside `Views/Settings/`). Whether it's `filterModel.ts` itself (01-08) is Reconciler A's.

##### Reconciliation Log

| ID | Status | Reason | Evidence |
|---|---|---|---|
| 06-13 | REMOVED | Compact is an option-only look, and context chips have no compact form, so the ungated context × isn't an inconsistency; the Better's "drop `removesOption`" would put × back on compact option chips. A context column reaches `'compact'` only through a hand-edited `column_styles` entry | `Core/Properties/columnStyles.ts:12,15-21`, `Core/Actions/columnMenu.ts:89-92`, `columnStyles.ts:149` (context default `{}`), `Cell.tsx:96-116` (`NeutralChip` draws title always) |
| 06-08 (lookup bullet) | CORRECTED (Reconciler B) | `defById` on `ValueContext` dropped in favor of 07-01's column-carried `def`; the pipeline resolves by id without a `ValueContext`, so a context map would be a second way | `Properties/value.ts:48`; `Views/Pipeline/filter.ts:85`; `sort.ts:34`; `group.ts:178` |
| 06-11 (pane targets) | CORRECTED (Reconciler B) | Destination settled at the Views root beside `filterModel.ts`, not `Views/Settings/`, matching 08-11 | `Views/filterModel.ts`; `Navigation/previewRules.ts` |


---

#### Scout 07 — Views Integration

Baseline `d0595b22d`. Every claim cites `path:line` read at that commit. Anything marked **(inferred)** is reasoning from the code, not something measured or run. Reconciler B re-opened every cited line at HEAD; corrections are written in place and marked *Reconciled:*.

**Live-data check:** NexusOS's sidecars and tile documents were surveyed read-only (20 view-bearing files: every `_pagecollection.json`, `_pageset.json`, `_tiles.json`, and `matrix.json`). `~/Test`, rebuilt at `156264f2f` by `make-benchmark-nexus.mjs test`, holds an empty registry and no property data, and no `~/Benchmark-*` is on disk, so any "no Nexus holds X" claim below covers NexusOS and `~/Test`.

**How saved views name things (NexusOS survey + code) — VERIFIED:**
- **Properties:** by `prop_` id (`sort[].property_id`, `filter` rules, `group`, `sub_group`, `property_order`, `hidden_properties`, `column_widths`, `column_alignments`, `column_styles`).
- **Options:** by **label**. Examples are `sort[].order: ['Active','Open',…]` in `Ideas/_pagecollection.json` (`views[0].sort[0].order`), in the homepage `_tiles.json` (`tiles[0].views[0..1]`), and in `.nexus/contexts/Projects/Pommora/_tiles.json` (`tiles[2]`); the filter `values: ['Complete','Closed','Archived','Revisit']` (homepage tile); and `group.order` (`Ideas` views 0 and 1). `hidden_groups` stores `<prop>/<label>` or `sub/<prop>/<label>`. `collapsed_groups` stores a bare `<label>` for top-level buckets and `<setId>/<label>` for sub-buckets.
- **Spaces:** by id (a `contains_any` rule in `.nexus/contexts/Projects/Pommora/_tiles.json`, `tiles[2].views[0].config.filter`).
- **Locations:** by Set id, or by a typed folder name.
- **Dates:** by bucket key, which depends on granularity.

`PropertiesPM.md:131` confirms that options are named by label. So an option rename or delete has to sweep six view roles across every sidecar, tile document, `matrix.json`, and `settings.openInPreview` (`Core/Nexus/configReach.ts:182-196`, `:378-417`).

##### Inventory

| File / Symbol | Lines | Property Responsibility Held (one line) | Belongs In Views? | If Not, Where |
|---|---|---|---|---|
| `Views/Pipeline/filter.ts` `prepareRule`, `evaluatorOf`, `evaluate*`, `textValue` | 1-301 | Per-kind filter semantics: operand parsing, comparison, text projection | Compilation yes. The per-kind evaluators are type facts | Evaluators go into a per-kind view spec (07-02). `textValue` goes into Properties (07-04) |
| `Views/Pipeline/filter.ts` `prepareLocation` | 89-115 | Location (Set tree) matching | Yes | — |
| `Views/Pipeline/sort.ts` `buildCriterion`, `rank`, `numberOf`, `dateOf`, `boolRank`, `sortText`, `resolvedSortCount` | 1-159 | Per-kind sort keys and comparators, and Custom option order | Comparator composition yes. Key extraction per kind no | Per-kind spec. `sortText` goes into Properties (07-04) |
| `Views/Pipeline/group.ts` `bucketKey`, `dateBucketKey`, `isoWeek`, `bucketOrder`, `liveBucketOrder`, `configuredOrder`, `readable`, `groupPlan` | 143-405 | Per-kind bucket keys, option-order buckets, date bucketing, guard against manual date order | Mostly yes. `bucketKey`'s kind switch is a type fact | Per-kind spec (`bucket`) |
| `Views/Pipeline/group.ts` `flattenContainer`, `toRow`, `frontmatterOf` | 100-140 | Builds `ViewRow` from page plus values | Yes (the row shape is consumed by Properties, see 07-15) | — |
| `Views/Pipeline/columns.ts` `resolveColumns`, `columnKind` | 1-46 | Column allowlist; classifies title/stamp/context/property | Yes | Should also carry the resolved type and def (07-01) |
| `Views/Pipeline/creationSeeds.ts` `ruleSeed`, `mergeSeeds`, `filterSeeds` | 1-104 | Filter → seed values per kind | Yes (a view gesture). Its kind switch is a type fact | Per-kind spec (`seedsFromFilter`) |
| `Views/Pipeline/resolveView.ts` | 1-56 | Composes filter, sort, group | Yes | — |
| `Views/Pipeline/pickView.ts` | 1-19 | Default view minted once per schema | Yes (schema key is redundant, 07-08) | — |
| `Views/filterModel.ts` `KIND_OPS`, `operatorsFor`, `filterTargets`, `decodeFilter` | 1-147 | Per-kind operator menus and value slots | Model yes. `KIND_OPS` is a type fact | Per-kind spec. I-042 already moves the file to `Views/Settings/` |
| `Views/filterRules.ts` `FILTER_OPS`, `SUBSTRING_OPS`, `OPERANDLESS_OPS` | 29-60 | Operator vocabulary | Yes | — |
| `Views/reassign.ts` `FROM_GROUP_KEY`, `reassignable`, `groupKeyToValue` | 1-31 | Bucket key → value per kind (drag reassign, seeds) | Type fact | Per-kind spec (`fromBucket`) |
| `Views/visibilityModel.ts` | 1-52 | Show and hide of property ids in a view | Yes | `Views/Settings/` (I-042) |
| `Views/views.ts` `savedView`, `SubGroupConfig`, `hiddenBucketKey`, `legacyBucketKey`, `isBucketHidden`, `toggleHiddenBucket`, `editHiddenBucket`, `clearHiddenBuckets`, `mintNewView` | 62-447 | Stored view shape that names properties and options; hidden-bucket key scheme; legacy key reads | Yes, except the legacy reads (07-06) | — |
| `Views/Bands/bandModel.ts` `headContextOf`, `dateLabeller`, `draggable` | 44-151 | Date face vs option face of a bucket (`def.type === 'dateTime'`) | Yes; the branch belongs to the spec | Per-kind spec (`groups: 'date'`) |
| `Views/Bands/bandRouter.ts` `routeBucket` | 112-133 | Bucket drag rewrites group or sub-group order by label | Yes | — |
| `Views/Bands/GroupBand.tsx` | 77, 224-237 | Draws OptionChip or date glyph per face | Yes | — |
| `Views/Host/useViewHost.ts` `pickTarget`, `sortReassign`, `reassignBySortRun`, `commitGroupValue`, `styleOf` | 60-234 | Picker kind per type; reassign by sort run; column style accessor | Host wiring yes. `pickTarget`'s type dispatch is a type fact | Per-type spec (06's territory) |
| `Views/Host/useViewCreation.ts` `SEEDS_FROM_SORT`, `withSeeds`, `createAdjacent` | 32-57, 235-256 | Which kinds a new page inherits from its sort anchor; seed frontmatter patch | The gesture yes. The table is a type fact. `withSeeds` duplicates `assignValue` | Spec, plus `Properties/assignValue` (07-14) |
| `Views/Host/useColumnStyles.ts` `styleFor`, `pickedStyle`, `columnStylePatch`, `useStyleFor`, `useColumnStyleMap` | 23-102 | Resolves a column's per-view look over the type default | Yes. Four accessors (07-09) | — |
| `Views/Host/useBandHeads.ts`, `useActiveView.ts` | 1-35, 1-15 | Band heads with date labels; active view pick | Yes | — |
| `Views/Table/useColumns.ts` `WIDTHS`, `STYLE_MIN`, `DEFAULT_ALIGN`, `widthFor`, `minWidthFor`, `clampWidth`, `defaultAlignFor`, `openHeaderMenu`, `commitHide` | 30-136, 288-330 | Per-type widths, min-by-look, and alignment; header style menu; hide | Table layout yes. Per-type tables are type facts | Spec (`column: {width, align}`) |
| `Views/Table/TableView.tsx` `runIntent`, `onCellClick`, `popoverField`, `openCellMenu`, `massPicker`, `headerIcon`, `startSweep` | 133-430 | Cell intent dispatch, `seat` for Link, mass-assign, header icon per column | Host yes. The type branches belong to 06 | 06 Value Surfaces |
| `Views/Cards/CardsView.tsx` `PROPERTY_PICKER_KINDS`, checkbox exception, `seat`, add-picker kind routing, text-value class | 88, 211-219, 494, 528, 718 | Picker routing per type | Host yes. The branches belong to 06 | 06 Value Surfaces |
| `Views/Settings/FilterFrame.tsx` `mintRule`, `ChipsField`, `valueCell`, `ruleRow` | 120-460 | Operator and value UI by slot; Context vs option chip; checkbox lead glyph | Yes | — |
| `Views/Settings/GroupFrame.tsx` `orderOptionsFor`, `pickOrder`, `DateBucketList`, `LocationHierarchy` | 105-534 | Option vs date ordering UI; date bucket list (refetches values) | Yes. Six `type === 'dateTime'` branches | Spec (`groups: 'date'`) |
| `Views/Settings/SortFrame.tsx` `directionOptions` | 48-69 | Direction labels per kind | Type fact | Spec (`sort.directions`) |
| `Views/Settings/OptionOrderList.tsx` | 55-107 | Option-order list for group or sort | Yes | — |
| `Views/Settings/VisibilityFrame.tsx` `rowGlyph` | 23-28 | Column icon resolution, a third copy | Belongs with one column-icon resolver | 06 (`Properties/Cells/PropertyTypes`) |
| `Views/Settings/SettingsFrame.tsx` | 76 | Derives schema by hand | Should use `containerSchema` | — |
| `Views/Settings/LayoutFrame.tsx`, `ViewFrame.tsx`, `ViewLeaf.tsx`, `valueField.tsx` | — | Pass `schema` through; `ViewFrame:80` mints a view with the schema | Yes | — |
| `Tiles/Surfaces/ViewTile.tsx` `coerceEmbeddedView`, `schema` | 71, 258, 359 | Schema for the embed; fallback default view | Yes | — |
| `Matrix/matrixInput.ts` `answers`, `matrixVisible` | 80-135 | Prunes rules a Space can't answer (per origin); runs the view filter over pages and Spaces | Yes | — |
| `Properties/columnStyles.ts` | 1-155 | Look and date-format vocabulary; `columnStyle` codec; `resolveStyle`, `storedPick`, `defaultStyleFor` | **Stays in Properties.** It's consumed by `Settings/personalization.ts:3`, `Settings/frames.ts:41`, `Properties/formatValue.ts:3`, `Bundles/browser.ts:30`, and the Schema editors. That makes it Nexus-wide type-look vocabulary, not view state. `defaultStyleFor` belongs in the per-type spec | Spec (`looks`) |
| `Properties/value.ts` `declaredType`, `columnType`, `resolveFieldValue` | 14-61 | Column type classifier ×2; memoized value read | Properties | Imports `ViewRow`, `ResolvedColumn` from Views (07-15) |
| `Properties/formatValue.ts` `formatBucketLabel` | 155-184 | Group-bucket labels | Views' concern living in Properties; imports `DateGranularity`/`DateSeparator` from `Views/views` (`formatValue.ts:4`) | `Views/Pipeline/group.ts` or `Bands/bandModel.ts` |
| `Nexus/configReach.ts` `ROLES`, `RENAME`, `CLEAR`, `GONE`, `wholeValues`, `collapsedKeys` | 47-262 | The sweep of saved-view property and option references | Belongs to Views (it edits `SavedView` fields; `ROLES` is `satisfies Record<keyof SavedView, Role>`, `:95`); it sits in Nexus | `Views/` beside `views.ts` (see Cross-Domain) |

*Reconciled:* line ranges for `group.ts` bucket code (`143-405`), `useViewCreation.ts` (`32-57`), `TableView.tsx` (`133-429`), and `formatBucketLabel` (`155-184`) re-cited from HEAD; `personalization.ts:196` doesn't import `columnStyles` (only `:3` does), and `Bundles/browser.ts:30` is an added consumer.

##### Per-Type Branch Map — CORRECTED

Every site in the domain that switches on, or tables by, property type or value kind. *Reconciled:* line numbers corrected for `GroupFrame.tsx`, `FilterFrame.tsx`, `useViewCreation.ts`, `bandModel.ts`, and `TableView.tsx`; the Link `seat` rule has a third copy in `PropertyPanel.tsx:539`.

| Site | Keyed by | Decides |
|---|---|---|
| `Views/Pipeline/filter.ts:83` | `t === 'title'` | Title uses the text evaluator |
| `Views/Pipeline/filter.ts:117-136` `evaluatorOf` | `ValueKind` + op | Evaluator per kind; Select splits on is/isNot → members, else text |
| `Views/Pipeline/filter.ts:138-155` `textValue` | `ValueKind` | Text projection: select / text (`shownProse`) / link (`linkDisplayText`) |
| `Views/Pipeline/filter.ts:157-300` `evaluate*` | op per kind | Operand parsing and comparison (number, date, checkbox, text, members, presence) |
| `Views/Pipeline/sort.ts:79-80` | `RESERVED_PROPERTY_ID.title` | Title sorts by `r.title` with case-insensitive comparison |
| `Views/Pipeline/sort.ts:81-109` `buildCriterion` | `ValueKind` | Key extractor plus `less`: rank / numeric / date / bool / text; context and unknown → no criterion |
| `Views/Pipeline/sort.ts:55-75` `sortText` | `ValueKind` | Text projection: text / link / multiSelect joined / file `fileName` joined |
| `Views/Pipeline/group.ts:172-195` `bucketKey` | `ValueKind` | Bucket key: select → label, checkbox → `'true'`, dateTime → date bucket, rest → none |
| `Views/Pipeline/group.ts:382-385` `readable` | `declaredType === 'dateTime'` | Manual order coerced to configured |
| `Views/Pipeline/group.ts:398, 401` | `groupable()` = `TypeSpec.groups` | Whether a group or sub-group applies (dateTime, select, status) |
| `Views/Pipeline/columns.ts:11-15` `columnKind` | reserved / stamp / contextIds | Column kind |
| `Views/Pipeline/creationSeeds.ts:20-43` `ruleSeed` | `ValueKind` + op | context/multiSelect seed on Is Any or Is All; else Is → `groupKeyToValue` (only select and checkbox yield); a rule must name exactly one operand (`:26`) |
| `Views/Pipeline/creationSeeds.ts:52` `mergeSeeds` | `kind` | Unions list kinds |
| `Views/filterModel.ts:110-120` `KIND_OPS` | `ValueKind` | Operator menu plus value slot per kind |
| `Views/filterModel.ts:127-128` | title / location | Title and Location op sets |
| `Views/reassign.ts:6-16` `FROM_GROUP_KEY` | `ValueKind` | Bucket key → value (select, checkbox) |
| `Views/Host/useViewCreation.ts:32-42` `SEEDS_FROM_SORT` | `ValueKind` | New Page Above/Below inherits the anchor's sort value (select, checkbox, number, dateTime) |
| `Views/Host/useViewCreation.ts:245-246` | `spec.origin !== 'user'` | Stamps don't seed |
| `Views/Host/useViewHost.ts:211-234` `pickTarget` | `kind === 'dateTime' && origin === 'user'`, `type === 'file'` | Picker kind: date / file / options |
| `Views/Host/useViewHost.ts:72, 114` | `reassignable()` | Cross-band reassign and sort-run reassign |
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

**The table-of-tables — VERIFIED:** five sites answer "can this type do X?" with five different membership sets:

| Question | Members |
|---|---|
| `groupable` (`properties.ts:38-41,55-56`) | dateTime, select, status |
| `reassignable` / `FROM_GROUP_KEY` (`reassign.ts:6-24`) | select, status, checkbox |
| `SEEDS_FROM_SORT` (`useViewCreation.ts:32-42`) | select, status, checkbox, number, dateTime |
| `pickKindOf` (`properties.ts:60-76`) | select, status, multiSelect, context |
| `ruleSeed` (`creationSeeds.ts:29-42`) | select, status, checkbox, multiSelect, context |

Each is right in itself, but none reads the others or one shared declaration.

##### Findings

###### 07-01 · A column's type and definition are re-resolved per cell instead of once per view — CORRECTED
- **Lens:** Hot Paths Stay Cold, One Way, Type Facts Once
- **Now:**
  - **The scan runs before the memo:** `resolveFieldValue` does a linear `schema.find((d) => d.id === propertyId)` (`Properties/value.ts:48`) *before* its memo lookup (`:50-59`). The WeakMap is keyed on the definition, so it saves the decode but never the scan. That runs per row × per filter rule (`filter.ts:85`), per row × per sort criterion (`sort.ts:34,40,45,51,56`), per row for each grouping (`group.ts:178`), and per cell in Table and Cards.
  - **Two classifiers for one question:** `declaredType` scans again (`value.ts:23`) and checks `contextIds.includes` (`:22`). `columnType` (`value.ts:27-31`) is a second classifier that exists because `contextIds` is optional.
  - **An optional `contextIds` is a footgun the comments keep warning about:** it defaults to `[]` in `declaredType` (`value.ts:17`), `widthFor`, `minWidthFor`, `clampWidth`, `defaultAlignFor`, `alignFor` (`useColumns.ts:65,76,93,123,133`), `operatorsFor` (`filterModel.ts:125`), `resolveColumns` (`columns.ts:40`), `hiddenListIds` (`visibilityModel.ts:10`), `applyFilter` (`filter.ts:41`), and `resolveView` (`resolveView.ts:29,31`). Comments warn at `useColumns.ts:61,119`, and `Properties/Cells/columnLabel.ts:10` calls the same parameter "deliberately un-defaulted". `declaredType` calls omit it at `useColumns.ts:310`, `TableView.tsx:424`, `sort.ts:81`, `useViewHost.ts:71,113`, `useViewCreation.ts:245`, `SortFrame.tsx:52`, `useColumnStyles.ts:30`, and `group.ts:383,398,401`.
  - **Scale of repetition:** there are 23 `schema.find((d) => d.id === …)` id lookups across Views and Matrix non-test files (`TableView.tsx` alone has 6: `:145,172,211,249,280,416`), 25 counting `value.ts:23,48`, and 21 `declaredType(` calls in Views and Matrix.
  - *Reconciled:* the lookup count was "about 27" (it's 23, or 25 with `value.ts`); `resolveView`'s default and the `useColumnStyles`/`group.ts` omissions were missing.
- **Better:**
  - **Carry the answer on the column:** `resolveColumns` already classifies each column once per view (`columns.ts:18-34`). Have it return `ResolvedColumn = { id, kind, type, def }`, with the Context classification done there, once. Cells, menus, width, align, and the picker read `col.type` and `col.def`. *Reconciled:* `ResolvedColumn` is also built by hand outside `resolveColumns` — `PropertyPanel.tsx:382`, `cardValueInput.ts:71` (`addColumn`), and `useViewHost.ts:196` (`commitGroupValue`) — so each of those resolves type and def too, or a second, narrower column type remains; the estimate has to carry those sites.
  - **Compile one reader for the pipeline:** add `fieldOf(id, schema, contextIds)` → `{ type, spec, def, read(row) }`, compiled once in `prepareRule`, `buildCriterion`, and `property()`/`structuralSubGrouped()`. `read` skips the scan and goes straight to the memo.
  - **What leaves:** `columnType`, the scan inside `resolveFieldValue`'s hot path, and every optional `contextIds` default.
- **Behavior:** Preserving. Two exceptions: `useColumns.ts:310` and `TableView.tsx:424` would now classify Context columns correctly. Neither changes visible output today: `useColumns.ts:312-314` excludes context and unknown alike, and `TableView.tsx:406-430` returns a Context's own icon at `:408-414` before `:424` is reached whenever the value context exists (`ContextIdentity.icon` is always resolved, `contextIdentity.ts:8,41`).
- **Estimate:** −60 to −100 · read (call sites); inferred (delta)

###### 07-02 · Views states each type's behavior in about 15 separate switches; one per-kind view spec would hold them — CORRECTED
- **Lens:** Type Facts Once, Clearer Boundaries, Less to Understand
- **Now:** See the Per-Type Branch Map.
  - **Grouping:** `TypeSpec.groups?: true` (`properties.ts:30`) says *whether* a type groups but not *how*. So the date-vs-option family is re-decided by `=== 'dateTime'` in `group.ts:383`, `bandModel.ts:66`, and `GroupFrame.tsx:106,159,236,279,304,309` — eight checks.
  - **Sort:** the comparator class is picked in `sort.ts:81-109`, and its direction labels are picked again in `SortFrame.tsx:48-69`, over the same partition.
  - **Filter:** operators come from `filterModel.ts:110-120`, evaluators from `filter.ts:117-136`, and the "operands are option words" fact a third time in `configReach.ts:127-128` (07-11).
  - **Looks:** stated in `columnStyles.ts:133-155` (default look), in `columnMenu.ts:64-93` (offered looks), and in each Schema editor's style options (`CheckboxEditor.tsx:8`, `NumberEditor.tsx:25`, `PropertyFrame.tsx:72` `OPTION_STYLE_OPTIONS`). The defaults are always `looks[0]`, except Link, which reads `def.link_display`.
  - *Reconciled:* the `GroupFrame.tsx` lines were `163,241,276,301,303` and the count "9"; it's eight checks at the lines above.
- **Better:**
  - **Smallest step:** change `groups?: true` to `groups?: 'option' | 'date'`. The eight date branches then read `spec.groups === 'date'`. *Reconciled:* this re-spells the eight checks rather than removing them (a `specOf(...)?.groups === 'date'` test replaces each `=== 'dateTime'` test); its gain is one declaration of the date family, not fewer branches. Putting `looks` on `TypeSpec` would make `properties.ts` import `ColumnLook` from `columnStyles.ts`, which already imports `properties.ts` (`columnStyles.ts:3-10`); a per-type looks record in `columnStyles.ts` beside `OPTION_LOOKS`/`CHECKBOX_LOOKS`/`NUMBER_LOOKS` (05-02's placement) avoids that cycle, and `defaultStyleFor`, `styleMenuItems`, and the editors read it.
  - **Fuller step:** one `Views/viewKinds.ts` `Record<ValueKind, ViewKindSpec>` holding `{ ops, evaluate, sortKey, less, directions, bucket?, fromBucket?, seedsFromSort, seedsFromFilter }`. `filter.ts`, `sort.ts`, `group.ts`, `reassign.ts`, `creationSeeds.ts`, `filterModel.ts`, `SortFrame.tsx`, and `useViewCreation.ts` would then ask the spec. It belongs in Views, not Properties, because every field answers a view question; Properties' `TypeSpec` keeps decoding and identity. This adds a third per-type record beside 01-01's engine and renderer records, keyed by `ValueKind` rather than `PropertyType` — that's the cost to weigh against 01-01.
  - **Host-graph check:** `filter.ts`, `sort.ts`, and `group.ts` are React-free. *Reconciled:* `matrixInput.ts` isn't host evidence — it's renderer-side, reached through `Matrix/matrixRuntime.ts`. The real host constraint is `Nexus/configReach.ts`, which runs from `Core/Contract/serve.ts`'s graph and already imports `Views/views` and `Views/filterRules` (`configReach.ts:9,18`); if it asks the spec (07-11), `viewKinds.ts` must stay a `.ts` that imports no `.tsx` — `filterModel.ts` imports `Properties/Cells/PropertyTypes` (`filterModel.ts:15-22`), so `KIND_OPS` moves without the pane targets (`Core/Contract/engineGraph.test.ts:7-9`).
- **Behavior:** Preserving
- **Estimate:** −80 to −150 for the fuller step · read (branches); inferred (delta). The smallest step is about ±0.

###### 07-03 · The filter re-parses its constant operand on every row, and an unreadable operand passes every row instead of abstaining — CORRECTED
- **Lens:** Hot Paths Stay Cold, Fix the Origin, Behavior Is a Decision
- **Now:**
  - **Per-row parsing:** `readNumber(want[0])` (`filter.ts:165`), `readDate(want[0])` (`:194`, a regex plus a `Date` built per row), and `checkboxWord(want[0])` (`:235`) all run inside the per-row evaluators. `prepareRule` already hoists `foldKey` for text operands (`:84`), so the precedent exists and the other three kinds don't follow it.
  - **Unreadable operands:** these return `true` for every row (`:166, :195, :236`), and every evaluator's `default:` does the same (`:181, :224, :240, :266, :287, :298`). `FILTER_OP_SET` (`:31,78`) only checks that an op is a known filter op, so a known op the kind lacks (for example `greater_than` on a Checkbox) also lands in `default: true`. Inside an `any` group, one such rule makes the whole group match everything. `prepareRule` already defines "abstain" as returning `undefined` (`:69`) for unknown ops and dead properties.
- **Better:**
  - **Compile once:** each kind's `prepare(op, operands)` returns `RowTest | undefined`. Operands are parsed once, and an unparseable operand or an op the kind lacks abstains at prepare time.
  - **What leaves:** the `default: return true` arms and the per-row parsing.
- **Behavior:** Changes behavior. Today, a hand-authored or typed-garbage operand in an Any group shows every row. After the change, the rule is ignored. In an All group the result is identical. The pane's number field is a free-text `EditableInput` (`FilterFrame.tsx:336-349`), so a user can reach this; the date slot is a `CalendarPicker` and the checkbox slot carries an implied value, so neither is reachable from the pane. *Reconciled:* `filterSeeds` reads `prepareRule`'s pass-or-abstain to decide what a new page is seeded with (`creationSeeds.ts:75-103`), so the change also alters creation seeds: an Any group holding a garbage rule seeds nothing today (the group passes a blank page, `:97`), and after the change it can seed from its first satisfiable rule. Ignoring the rule is intended [Intended as K-1].
- **Estimate:** −10 to −20 · read

###### 07-04 · The "value as shown text" projection is written twice, and the two copies differ — VERIFIED
- **Lens:** One Way, One Vocabulary
- **Now:**
  - **The two copies:** `filter.ts:138-155 textValue` and `sort.ts:55-75 sortText` both map a value to a string through `shownProse` and `linkDisplayText`. They disagree on members: filter returns `null` for `multiSelect` and `file`, while sort joins them (`v.value.join(',')`, `v.value.map(fileName).join(',')`).
  - **Why it hasn't surfaced:** the filter's text evaluator is never handed those kinds today (`evaluatorOf` routes them to members or presence, `filter.ts:130-134`).
  - **Title:** handled a third way in each (`filter.ts:82-83` via the select pun, `sort.ts:79-80` via `r.title`).
- **Better:** One `shownText(value): string | null` in `Properties/formatValue.ts` covering select, text, link, multiSelect, and file. `textValue` and `sortText` go, along with their two 10-arm switches. These two are the only callers of `shownProse`/`linkDisplayText` for a property value (`git grep`).
- **Behavior:** Preserving
- **Estimate:** −15 · read

###### 07-05 · Every value write re-runs the whole pipeline, and per-row derived keys are recomputed each run — VERIFIED
- **Lens:** Hot Paths Stay Cold (the Hard Rule), Sync-Ready Shapes
- **Now:**
  - **Why one write rebuilds everything:** one optimistic write calls `setValueOverride`, which rebuilds `effectiveValues` by shallow-copying the whole values map (`useContainerValues.ts:88-101`). That re-runs the single `useMemo` in `useViewHost.ts:84-90`: `flattenContainer` builds a new `ViewRow` for every page (`group.ts:105-140`), then the full filter, the full sort (decorate plus N log N), and the full grouping.
  - **What the memo covers and what it doesn't:** `resolveFieldValue`'s memo (`value.ts:50-64`) keeps the decode cheap for untouched rows, since their frontmatter objects keep their identity through the copy. It doesn't cover the derived keys, which are recomputed for every row on every run:
    - `readDate` in `sort.ts:46`, `group.ts:153`, and `filter.ts:187`
    - `shownProse` / `linkDisplayText` in `sort.ts:59-61` and `filter.ts:143-145`
    - `foldKey` in `filter.ts:253`
    - the operand parses from 07-03
  - **The same happens on landing:** a value read landing (`useContainerValues.ts:85`) repeats it.
  - **Cost (inferred, not measured):** on a 50k-page Benchmark, that's 50k regex date parses plus a 50k sort per cell commit. The Benchmark Nexuses aren't on disk; a commit-latency trace on `~/Benchmark-Large` with a date-sorted, date-grouped Table would settle it.
- **Better:**
  - **Remember derived keys:** cache them per (frontmatter, def) beside the decode memo (for example `resolvedKeys(row, def, granularity)`), or at minimum memoize `readDate` per ISO string.
  - **Keep row identity:** memoize `toRow` per (`PageNode`, `RowValues` entry) identity so untouched rows keep their object, and stages keyed on rows can short-circuit. *Reconciled:* no stage is keyed on row identity today, so this step saves nothing until Approach B exists; it belongs to B, not to the cheap first step.
  - **Larger option:** see Approach B.
- **Behavior:** Preserving
- **Estimate:** +15 / −5 · inferred (cost); read (mechanism). Under Less Stuff, the memo lands only once the benchmark shows the cost.

###### 07-06 · Legacy bare hidden-group keys are still read — VERIFIED
- **Lens:** Legacy Versus Interop, Always Intentional
- **Now:**
  - **Origin:** `38df2a0d0` (F-383) moved hidden-bucket keys to `<prop>/<bucket>` and `sub/<prop>/<bucket>` but kept reading the old bare `<bucket>` and `sub/<bucket>` spellings.
  - **Code that still reads them:**
    - `legacyBucketKey` (`views.ts:317-323`), used by `isBucketHidden` (`:332-336`), `toggleHiddenBucket` (`:347-348`), and `editHiddenBucket` (`:369-370`)
    - the bare-`sub/` clause of `clearHiddenBuckets` (`views.ts:382`)
    - the `/^\d{4}/` year sniff in `DateBucketList` (`GroupFrame.tsx:510-511`, from `247994ded`)
  - **Tests that pin them:** `resolveView.test.ts:561,593,619`, `views.test.ts:553,562,600,604`, `GroupFrame.test.tsx:268`.
  - **Live data:** NexusOS holds one `hidden_groups`, and it's `[]` (`Studio/_pagecollection.json` `views[0]`); every other view lacks the key. `~/Test` holds no `hidden_groups`, and no Benchmark Nexus is on disk.
- **Better:** Delete `legacyBucketKey`, its three call branches, the year sniff, the legacy clause in `clearHiddenBuckets`, and the eight tests.
- **Behavior:** Preserving for every Nexus surveyed
- **Estimate:** −35 code / −60 tests · read

###### 07-07 · Collapsed bucket keys are a bare label, while hidden bucket keys are scoped by property, so collapse leaks across groupings — CORRECTED
- **Lens:** One Way, Fix the Origin
- **Now:**
  - **Collapse keys aren't scoped:** a top-level property bucket's band key is its bare label (`group.ts:253`, `key = value = label`), and that's what `collapsed_groups` stores (`useViewHost.ts:149-155`, the only writer). F-383's property scoping reached `hidden_groups` only (`views.ts:314-315`).
  - **Leak:** a "Done" collapsed under Status stays collapsed when the view regroups by another property with a "Done"; nothing clears `collapsed_groups` on a Group By change.
  - **A second handler:** the sweep needs its own `collapsedKeys` (`configReach.ts:167-178`) beside `editHiddenBucket`.
  - **Over-broad delete:** deleting the grouped property clears *every* collapsed key, including Set ids remembered from an earlier structural grouping (`configReach.ts:212-214`).
- **Better:**
  - **Scope the keys the same way:** key property buckets with the scheme hidden keys use (`<prop>/<bucket>` top-level; `<setId>/<prop>/<bucket>` under a Set, replacing `subGroupKey`, `group.ts:311`).
  - **Share the sweep:** RENAME and CLEAR reuse `editHiddenBucket` and `clearHiddenBuckets` for both fields. `collapsedKeys` and the bespoke `bandKeys` handlers go.
  - **Migration:** *Reconciled:* the scout's "NexusOS's `collapsed_groups` hold only Set ids" is wrong. `Ideas/_pagecollection.json` holds bare labels under its Status grouping (`views[0]`: `open`, `closed`, `Archived`, `Paused`, `Closed`, `Complete`; `views[1]`: `open`, `Paused`, `Revisit`, `Closed`), and `.nexus/contexts/Projects/Pommora/_tiles.json` `tiles[2]` holds the same kind of labels under a now-structural grouping — a live instance of the leak. The lowercase `open`/`closed` match no current option label (the group's `order` holds `Open`/`Closed`), so they're already dead. Rescoping converts these keys under their property once [Intended as D-2].
- **Behavior:** Changes behavior as intended [Intended as D-2, K-1]. Collapse no longer carries across a Group By switch, deleting the grouped property keeps structural collapse memory, and the Ideas views' current collapsed buckets carry over through the one-time conversion.
- **Estimate:** −15 · read

###### 07-08 · A new view seeds `hidden_properties` with every schema id, which duplicates what the `property_order` allowlist already does — VERIFIED
- **Lens:** Less Stuff, Fix the Origin
- **Now:**
  - **The seed:** `mintNewView` writes `hidden_properties: schema.map((d) => d.id)` (`views.ts:441`), with `property_order: [title]` (`:440`).
  - **Why it's redundant:** every reader already treats "absent from `property_order`" as hidden:
    - `resolveColumns` iterates `property_order` only (`columns.ts:26`)
    - `hiddenListIds` hides on `set.has(id) || !shown.has(id)` (`visibilityModel.ts:14`)
    - `unhide` and `placeInShown` add the id to the order and remove it from hidden (`visibilityModel.ts:22-51`)
    - `reorderColumns` keeps only `property_order` ids (`useColumns.ts:141-150`)

    So the seed is redundant state on disk, and it also enlarges what the property-delete CLEAR has to sweep (`configReach.ts:67`).
  - **What the schema parameter costs:** it's the only reason `mintNewView`/`mintDefaultView` take a schema, which in turn makes `pickView` key its default by schema in a WeakMap (`pickView.ts:5-18`), and makes `tilesFile.ts:84`, `ViewTile.tsx:71,359`, and `ViewFrame.tsx:80` pass one (`Nexus/create.ts:66` already passes `[]`).
- **Better:**
  - **Drop the seed:** mint `hidden_properties: []`, remove the `schema` parameter from both mints, and make `pickView`'s fallback one module-level default view with `DEFAULT_VIEW_ID`. The WeakMap goes.
  - **Knock-on:** this also makes 07-12 moot.
- **Behavior:** Preserving. A new view renders identically; existing views keep what they hold.
- **Estimate:** −15 · read

###### 07-09 · There are four ways to get a column's resolved style — CORRECTED
- **Lens:** One Way, Hot Paths Stay Cold
- **Now:**
  - **The four ways:**
    - `styleFor(columnId, schema, view, nexus)` (`useColumnStyles.ts:35`)
    - `useStyleFor()` (`:83`)
    - `useColumnStyleMap(host)` (`:93`), the memoized one used by Table (`useColumns.ts:186`) and Cards (`CardsView.tsx:208`)
    - `host.styleOf` (`useViewHost.ts:210`), unmemoized, which allocates on each call and is handed to `runPropertyAction` (`useViewInteractions.tsx:412`)
  - **Extra callers:** `useBandHeads.ts:29` builds its own closure. `GroupFrame.tsx:210,519` call the raw form. *Reconciled:* `FilterFrame.tsx:353,410` call `useStyleFor`'s function (`:234`), not the raw form, and `Properties/Schema/PropertyFrame.tsx:188,406` is a second `useStyleFor` consumer.
  - **Hidden scan:** each call also runs `declaredType` and `schema.find` (`useColumnStyles.ts:29-31`).
- **Better:**
  - **For view hosts:** the host owns one memoized style map, and `host.styleOf` reads it. `useColumnStyleMap` folds into the host.
  - **For panes outside a host:** keep `styleFor` (pure) for the Settings panes, which have no host, and drop `useStyleFor`; `FilterFrame` and `PropertyFrame` then call `styleFor` with `useNexusForms()` as `GroupFrame` does. Once 07-01 lands, `columnDefaults` reads `col.type` and `col.def`.
- **Behavior:** Preserving
- **Estimate:** −20 · read

###### 07-10 · The Matrix filter compiles the whole filter once per Space — INFERRED
- **Lens:** Hot Paths Stay Cold
- **Now:**
  - **Per-Space compile:** `matrixVisible` runs `mapRules` plus `applyFilter([row], pruned, …)` for every Space (`matrixInput.ts:118-132`), and each call compiles the filter (`prepareGroup`) again.
  - **Per-reply rebuild:** page rows are rebuilt from every seat on every values reply (`:113`).
- **Better:** Group Spaces by their answerable-rule signature. A Space's prune depends only on which rules its own sidecar keys answer (`answers`, `:80-100`; only the `user`-origin arm reads the row, `:94-98`), so the pruned filter can be compiled once per distinct prune.
- **Behavior:** Preserving
- **Estimate:** ±0 · *Reconciled:* the mechanism is read; whether it costs anything is unmeasured. It scales with Spaces × rules and runs only while a Matrix filter is set (`:108`). A Matrix filter timing on a Nexus with hundreds of Spaces would settle it; until then the signature cache is new machinery without evidence (Less Stuff).

###### 07-11 · Whether a rule's operands name whole options is decided in three places — VERIFIED
- **Lens:** Type Facts Once, One Way
- **Now:**
  - **Three deciders:**
    - The evaluator picks "members" for multiSelect/context and for Select's is/isNot (`filter.ts:125-132`).
    - The pane assigns `slot: 'chips'` (`filterModel.ts:70-92`).
    - The option-rename sweep re-derives it as `kind === 'multiSelect' || !SUBSTRING_OPS.has(op)` (`configReach.ts:127-128`).
  - **The overload that causes it:** `does_not_contain` and `contains` mean substring on text but membership on sets (`filter.ts:259-262` vs `:280-285`). That overload is why the sweep needs `wholeValues`.
- **Better:** The per-kind op table (07-02) carries `operands: 'words' | 'text' | 'date' | …`, and `configReach.optionRule` asks it. `configReach.ts` runs host-side, so the table it reads stays free of renderer imports (see 07-02's host-graph note).
- **Behavior:** Preserving
- **Estimate:** −5 · read

###### 07-12 · SettingsFrame derives the schema by hand — VERIFIED
- **Lens:** One Way
- **Now:** `SettingsFrame.tsx:76` uses `schemaCollection.properties ?? []` (`CollectionNode.properties` is optional, `Nexus/tree.ts:65`), while every other surface uses `containerSchema` and its shared `NO_SCHEMA` (`treePatch.ts:125-131`). The fresh `[]` on each render misses `pickView`'s per-schema mint cache (`pickView.ts:16`), so a property-less, view-less Collection mints a new default view every render.
- **Better:** Use `containerSchema(tree, node)`. This becomes moot under 07-08.
- **Behavior:** Preserving
- **Estimate:** −1 · read

###### 07-13 · Title passes as a Select value and is special-cased wherever a type is asked — CORRECTED
- **Lens:** One Vocabulary, Type Facts Once
- **Now:**
  - **The pun:** `resolveFieldValue` returns Title as `{ kind: 'select', value: row.title }` (`value.ts:43`), which `filter.ts:82` has to explain.
  - **The pseudo-type:** `declaredType` returns a `'title'` pseudo-type (`value.ts:19`), and `specOf('title')` returns `undefined` (`properties.ts:52-53`). Every `specOf(...)?.kind` switch therefore carries a `case undefined` that lumps Title with unknown properties (`sort.ts:107`, `SortFrame.tsx:66`, `columnStyles.ts:152`, `properties.ts:73`).
  - **Special cases:** Title is then handled ad hoc in `filter.ts:83`, `sort.ts:79-80`, `filterModel.ts:107-108,127`, `SortFrame.tsx:53`, and `useColumns.ts:33,104`. *Reconciled:* `columnLabel.ts:4-8` is the reserved-label table for Title and both stamps; it isn't a type question and stays under any Title spec.
- **Better:** Give Title a real `TypeSpec` entry (`{ kind: 'text', origin: 'reserved' }`), with its value read as `{ kind: 'text' }`. The filter, sort, and SortFrame special cases go, and the spec's text arms serve it. *Reconciled:* two things stay or change shape. `TITLE_OPS` (`filterModel.ts:107-108`) still differs from text's ops — Title offers no empty ops — so that exception remains. And `PROPERTY_TYPES` is keyed by the stored-definition enum (`properties.ts:10-24,34`), so a `title` entry there would make `type: 'title'` a decodable definition type. Title is a built-in field rather than a property type [Intended as F-3], so its entry belongs on the record for built-in columns, beside a stored-definition enum that keeps Context [Intended as F-1].
- **Behavior:** Effectively preserving (inferred). Text reads through `shownProse`, so a title containing literal `[[…]]` would filter and sort on its shown text. Titles are filenames and rarely hold that.
- **Estimate:** −15 · read (sites); inferred (edge)

###### 07-14 · The creation seeds copy `assignValue`'s Context-vs-property split — CORRECTED
- **Lens:** One Write Path
- **Now:** `withSeeds` (`useViewCreation.ts:44-57`) re-implements the split in `assignValue.write` (`assignValue.ts:38-57`): a Context value goes to `contexts`, and anything else goes through `applyValueAtRoot`. It feeds the optimistic patch for a created page (`useViewCreation.ts:127-136`). The two split on different facts — `write` on `column.kind` (`assignValue.ts:44`), `withSeeds` on whether the schema holds the id (`useViewCreation.ts:52-54`).
- **Better:** One exported `patchedValues(schema, frontmatter, seeds)` in `assignValue.ts` used by both. The host side of seeds (`Nexus/create.ts:35-41`) is 02's domain. *Reconciled:* `write` also builds the `setContext`/`setProperty` request and calls `send` per value, so only the two-branch patch is shared; the gain is one statement of the split, not lines.
- **Behavior:** Preserving
- **Estimate:** *Reconciled:* about −3 (was −8) · read

###### 07-15 · Properties imports the Views row shape — CORRECTED
- **Lens:** Clearer Boundaries
- **Now:**
  - **The imports:** `value.ts:3`, `assignValue.ts:6`, `pageRow.ts:6`, `valueContext.ts:6`, `Cells/Cell.tsx:4`, `Cells/valueMenuTarget.ts:4`, and `PropertyPanel.tsx:20` import `ViewRow`, `ResolvedColumn`, or `PageValues` from `Views/viewRow`. `formatValue.ts:4` imports `DateGranularity` and `DateSeparator` from `Views/views` for `formatBucketLabel`, which is a group-bucket label. *Reconciled:* `removeProperty.ts:14` also imports `mapViews` from `Views/views` — a runtime import, where the others are type-only.
  - **Why it matters:** a value read and a value write are Properties operations on "an entity's values", yet their argument type lives in Views.
- **Better:**
  - **Move the shape — REMOVED by Reconciler B (settled for 08-11):** the scout proposed moving `PageValues`, `RowValues`, and `ViewRow` into Properties. `ViewRow` is the pipeline's row (`parentSetId`, `ResolvedGroup.items`, `Views/viewRow.ts:17-45`) and 22 non-Properties files import the row types (`Contract/bridge.ts:18`, Matrix, Tiles, the whole Pipeline), against 7 Properties files, so the move would flip far more imports than it fixes. 08-11's direction holds instead: `pageRow.ts`, which builds `ViewRow`s and calls `view:loadValues` (`pageRow.ts:11-67`), moves to Views, and the remaining Properties imports are type-only reads of the row a value belongs to.
  - **Move the label:** move `formatBucketLabel` (`formatValue.ts:155-184`) out of `formatValue.ts` to `Views/Bands/bandModel.ts`, its only consumer (`bandModel.ts:11,51`), with `Properties/formatBucketLabel.test.ts`. `NUMERIC_FORMATS` (`formatValue.ts:153`, read by `GroupFrame.tsx:52,210`) types on `DateFormat` alone and can stay. 01-14 proposes `Views/Pipeline` beside `dateBucketKey` instead.
- **Behavior:** Preserving
- **Estimate:** ±0 (moves) · read

###### 07-16 · Hiding a column has two write paths — VERIFIED
- **Lens:** One Way
- **Now:** `useColumns.commitHide` writes `[...view.hidden_properties, collapsing]` itself (`useColumns.ts:291-296`), without the dedupe in `visibilityModel.hideShown` (`visibilityModel.ts:37-43`), which `useViewHost.hideProperty` (`:166-169`) and VisibilityFrame use. `useViewHost.revealProperty:162` also re-derives "is shown" beside `resolveColumns`. The header hides only a rendered column, which `resolveColumns` has already excluded from `hidden_properties` (`columns.ts:27`), so the missing dedupe is unreachable; the fold is One Way, not a bug fix.
- **Better:** `commitHide` calls `hideShown`.
- **Behavior:** Preserving
- **Estimate:** −2 · read

###### 07-17 · `GroupFrame`'s date list fetches the container's values a second time — INFERRED
- **Lens:** Hot Paths Stay Cold, One Way
- **Now:** `DateBucketList` mounts its own `useContainerValues(source.path)` (`GroupFrame.tsx:499`). That's a second `fetchPageValues` IPC read of every page, plus its own value-epoch subscription. It then flattens and buckets every row (`:503-512`) to list the present date buckets, which a mounted view host has already flattened.
- **Better:** *Reconciled:* read the host's flattened, pre-filter `rows` (`useViewHost.ts:84-90`) when one is mounted, not its resolved groups — the resolved groups are post-filter and post-hide (`resolveView.ts:34-51`), so reading them would drop a filtered-out date bucket from the pane, a visible change. The Settings frame mounts from the toolbar (`Interface/Toolbar/SettingsMenu.tsx:15`) and from `ViewTile.tsx:654`, outside the view host's component tree, so reaching the host needs a seam that doesn't exist yet; a "shared container-values cache" doesn't exist either and would be new machinery.
- **Behavior:** Preserving only if the pre-filter rows are read
- **Estimate:** −10 · read (mechanism); inferred (whether a host seam costs less than the second read)

##### Behavior Ledger

| Behavior | Where | Code Cost | Origin | Classification | Status |
|---|---|---|---|---|---|
| A Custom option sort always reads ascending, and Default/Reversed is ignored once Custom is set | `sort.ts:83-92`; `SortFrame.tsx:181-190` | ~6 lines | `sort.ts` comment (`:83`) | Agent's choice; reasonable | VERIFIED |
| Where empty values sort depends on type and direction: number and date empties come first ascending (`-Infinity`), Select empties come last ascending but **first** when Reversed (`MAX_SAFE_INTEGER`), text empties come first, and unchecked comes first | `sort.ts:36,41,47,52,73` | Spread over 5 extractors | No doc | **Accident.** No single rule; groups have `ungrouped_placement`, sort has nothing. Empty values sort last for every type [Intended as K-2] | VERIFIED |
| Manual group order is coerced to configured for a Date property (a type changed under a saved manual order) | `group.ts:382-385` | 4 lines plus a test | `47c16173d` | Agent's choice; a guard against type-change residue. The origin is the type change not sweeping `group.order` (Catalog 01) | VERIFIED |
| Only live option keys earn an empty band; a stale manual key never renders | `group.ts:248-253` | 3 lines | `c81dca38c` (*Reconciled:* was `ab86b19ce`, which touched `group.ts` for the per-band eye) | Agent's choice; sensible | CORRECTED |
| Value-less rows form a header-less tail, with no "None" band | `group.ts:255`; `views.ts:231` | — | Design comments | Likely Nathan's intent (the Ungrouped Top/Bottom knob is user-facing) | VERIFIED |
| Row drag is off with 2 or more live sorts. With one sort, a drop inside another value run rewrites the sorted property (Select, Status, Checkbox only, and only if the column is shown) | `useViewHost.ts:75,109-119,199-209` | ~25 lines | `2c15c767f` ("a reorder into another sort run rewrites the value"); `73668f9fc` gated drag on effective sorts; comment `:109` | Agent's choice, kept: drag-to-reassign stays [Intended as K-2] | CORRECTED |
| New Page Above/Below inherits the anchor's Select, Status, Checkbox, Number, and Date sort values | `useViewCreation.ts:32-42,244-249` | ~15 lines | `e93ed66de` | Agent's choice | VERIFIED |
| A new page takes the values a filter implies (Is on Select/Status/Checkbox; Is Any/All on Multi-Select/Context, each rule naming exactly one value, `creationSeeds.ts:26`), and the gesture wins on conflict | `creationSeeds.ts:1-104` | 104 lines plus 307 test lines | File comment | Agent's choice; probably welcome | CORRECTED |
| An unreadable operand passes every row (an Any group then matches everything) | `filter.ts:166,195,236` | 3 lines | No doc | **Accident** (07-03); the rule is ignored [Intended as K-1] | VERIFIED |
| Checkbox `is_empty` is evaluated but never offered, and `is_not_empty` falls to `default: true` (every row passes) | `filter.ts:231-232,239-240`; `filterModel.ts:94-97` | 3 lines | No doc | Accident (half a pair); `is_not_empty` works [Intended as K-1] | VERIFIED |
| Strict date ops, text ops on a Select, and other hand-authored ops evaluate but aren't offered | `filterModel.ts:60`; `filter.ts:126` | ~10 lines | Comment | Agent's choice; consistent with agent-legible hand authoring | VERIFIED |
| Title offers no empty ops | `filterModel.ts:107-108` | 1 line | Comment | Agent's choice | VERIFIED |
| A new view shows Title only; properties and Contexts created later stay hidden until revealed | `columns.ts:1,36`; `views.ts:440-441` | — | Comments | Plausibly Nathan's intent ("creation never visually changes an existing view"); confirm | VERIFIED |
| Collapse state carries across a Group By switch for buckets sharing a label | `group.ts:253`; `useViewHost.ts:149-155` | — | F-383 scoped hidden only | **Accident** (07-07); NexusOS's Pommora tile shows it live. Collapse is remembered per property [Intended as D-2] | VERIFIED |
| Deleting the grouped property clears all collapsed keys, including remembered Set collapses | `configReach.ts:212-214` | 3 lines | No doc | Accident; structural collapse is kept [Intended as K-1] | VERIFIED |
| Date buckets can't be dragged or custom-ordered; date order is Ascending/Descending only | `bandModel.ts:147`; `GroupFrame.tsx:85-88,105-106` | ~8 lines | No doc | Agent's choice | VERIFIED |
| Date grouping defaults to Month | `views.ts:241-243` | 1 line | No doc | Agent's choice | VERIFIED |
| Link and Text filter and sort read the raw address or alias, not the column's chosen look | `linkValue.ts:198` doc; `filter.ts:145`; `sort.ts:61` | — | Documented | Agent's choice; deliberate, so sort never moves on a look change | VERIFIED |
| Location "Contains" also matches a typed folder name; a filter naming only dead Set ids is ignored | `filter.ts:88-111`; `filterModel.ts:99-105` | ~25 lines | Comments | Agent's choice | VERIFIED |
| Compact Cards close the value picker on a blank value, except for Checkbox | `CardsView.tsx:211-219` | 4 lines | No doc | Agent's choice (06's territory) | VERIFIED |

##### Approaches

**A. One compiled-field plus per-kind view spec (07-01, 07-02, 07-03, 07-04, 07-11 together) — CORRECTED**
- **The change:**
  - **Spec:** `Views/viewKinds.ts` holds one record per `ValueKind`: operators with slot and operand class, `prepare(op, operands)` → test or abstain, `sortKey` plus `less` plus `directions`, `bucket` plus `fromBucket` plus a date/option family, `seedsFromSort`, and `seedsFromFilter`.
  - **Compiled columns:** `resolveColumns` and a `fieldOf` compile each column, rule, criterion, and grouping once per view into `{ type, def, spec, read }`.
- **What it removes:** about 15 switches; `columnType`; the scan inside `resolveFieldValue`'s hot path; `textValue` and `sortText`; `SEEDS_FROM_SORT`, `FROM_GROUP_KEY`, and `KIND_OPS` as freestanding tables; `wholeValues`; and every optional `contextIds`.
- **Cost:** one new file of about 150 lines, offset by about 250 deleted (inferred), and a test reshuffle in which the filter, sort, and group tests become per-kind spec tests. The hand-built `ResolvedColumn`s (`PropertyPanel.tsx:382`, `cardValueInput.ts:71`, `useViewHost.ts:196`) also have to resolve type and def.
- **Risk:** the large test surface (`filter.test` 906, `group.test` 759, `sort.test` 502 lines), and Title's special cases (07-13) need settling in the same pass, with Title leaving the property types [Intended as F-3]. *Reconciled:* the host graph isn't untouched by construction — `configReach.ts` is host-side and would read the spec's operand class, so `viewKinds.ts` stays a renderer-free `.ts` (07-02). The pass also changes behavior through 07-03's abstain rule, so it can't ship as purely preserving. This is a third per-type record beside 01-01's two.

**B. An incremental view pipeline — INFERRED**
- **The change:**
  - **Stable rows and keys:** keep `ViewRow` identity per page (07-05) and add per-(frontmatter, def) derived-key memos.
  - **Patch, don't rebuild:** split `resolveView` so a single-row value change re-tests that row against the compiled filter, re-buckets it, and moves it by binary insertion within its band, instead of re-running flatten, filter, sort, and group.
- **What it removes:** the per-edit O(N log N) rebuild the Hard Rule names.
- **Cost:** a real state machine (prior groups plus a diff of changed rows), plus a reconciliation fallback when the view or schema changes.
- **Risk:** a new class of drift bugs between incremental and full results. Only worth it if the Benchmark Nexuses show commit latency; they aren't on disk, so it's unsettled. 07-05's memos are the cheap first step and may be enough.

**C. Stable option identity in saved views (data shape belongs to 01/02; the Views consequence is here) — VERIFIED**
- **The change:** views would reference an option by a stable id instead of its label in `sort.order`, `group.order`, `sub_group.order`, filter operands, `hidden_groups`, and `collapsed_groups`.
- **What it removes:**
  - **The rename half of the sweep:** the entire RENAME role table (`configReach.ts:148-196`): `optionRule`, `scopedOrder`, `collapsedKeys`, and the rename half of `editHiddenBucket` (`views.ts:359-375`). An option rename then touches the registry only.
  - **A sync loss:** today, a rename on one device racing an unsynced view edit on another brings back the old label, and the filter or order silently stops matching.
- **Cost:**
  - **An option id:** a new id on `select_options` and `status_groups` entries.
  - **Migrating NexusOS's label-keyed views:** `Ideas/_pagecollection.json` (`group.order`, `sort.order`, `collapsed_groups`), the homepage `_tiles.json` (`sort.order`, filter `values`), and `.nexus/contexts/Projects/Pommora/_tiles.json` (`sort.order`, `collapsed_groups`).
  - **Rewiring readers:** `decodeValue` would have to yield ids or the pipeline would map labels to ids.
- **Risk:** Legibility, because a hand-read view JSON shows ids instead of words. Views already name properties by `prop_` id, so this is precedent rather than a new departure. Option delete still needs a sweep. Option ids are intended, with NexusOS's label-keyed views converted once [Intended as D-1].

##### Cross-Domain Notes
- **02 Values — VERIFIED:** a `dateTime` `PropertyValue` holds the raw ISO string (`propertyValue.ts:25-26,118-119`), so filter, sort, group, and the picker each re-parse it with `readDate`. A parsed form, or a per-string memo, belongs at the decode.
- **02 Values — VERIFIED:** `Nexus/create.ts:35-41` resolves creation seeds against the whole registry (`readRegistry(root)`) rather than the Collection's schema.
- **01 Catalog — CORRECTED:** `properties.ts` has `byKey` (`:49-50`) but no `byId`. 23 view-side `schema.find(id)` calls (was "about 27"), plus FilterFrame's private `defById` (`FilterFrame.tsx:265`), want it, or want 07-01.
- **01 Catalog — VERIFIED:** a type change leaves `group.order`, `sort.order`, and option-word operands on a property that no longer has options. `group.ts:382` guards against one symptom.
- **06 Value Surfaces — CORRECTED:** the column header and row glyph are resolved three ways (`TableView.tsx:406-430` uses a Context's own icon; `VisibilityFrame.tsx:23-28` uses the generic Context type icon; `CardsView.tsx:507` uses `propertyTypeIconName(e.type)`, the generic one). The Context icon is inconsistent between them.
- **06 Value Surfaces — CORRECTED:**
  - **Picker dispatch is stated three times:** `useViewHost.pickTarget:211-234`, `CardsView.tsx:88,528`, and `TableView.runIntent:133-156`.
  - **`seat='rename'` for Link is stated three times:** `TableView.tsx:260`, `CardsView.tsx:494`, and `PropertyPanel.tsx:539` (was "duplicated", two).
- **Nexus — VERIFIED:** `configReach.ts`'s ROLES, RENAME, CLEAR, and GONE edit `SavedView` fields field by field (`:60-95` is `satisfies Record<keyof SavedView, Role>`). The table belongs beside `views.ts` (Views owns the stored shape), with Nexus keeping only the walk (`reachConfig`). Both are host-side, so the move keeps the table renderer-free.
- **Docs — VERIFIED:** `PropertiesPM.md:150`'s Pending "Per-view link styling" is stale. Format is already per-view through `column_styles.look` (`LinkCell.tsx:39`; `columnMenu.ts:71-72`); only Underline and Color remain property-level.
- **Issues — VERIFIED:** I-042 already lists `filterModel.ts` and `visibilityModel.ts` among misfiled files (`IssuesPM.md:1323`, footnote 42), so that move belongs to it and isn't re-proposed here. I-006's `select_options`/`status_groups` single-field merge also hits view references, because options are named by label (Approach C).
- **Nexus — CORRECTED:** `migrateConfig.ts:17-23`'s `RENAMED` normalizations (`card_banner: image`, `icon: table`) are view residue, not property residue. NexusOS holds neither spelling in any `.json` outside `.obsidian/` (checked), and neither does `~/Test`, so under the settled rule they're removable now.

##### Overlaps & Contradictions

###### Merged Within Reports 05–09
- None merged whole. 05's cross-domain `GroupFrame.tsx:511` note is the same legacy read as 07-06, and 07-06 carries it.

###### Cross-Report Overlaps
- **07-01 ↔ 02-13, 06-08:** the `value.ts:48` scan before the memo; 06-08's TableView 6× count matches.
- **07-02 ↔ 01-01:** per-type records; 07-02's Views-side `ValueKind` spec would be a third record beside 01-01's two.
- **07-02 (looks) ↔ 05-02:** the per-type looks entry; both place it in `columnStyles.ts`.
- **07-04, 07-13 ↔ 02-15, 01-11:** the Title-as-Select pun and the hand-spelled `'title'` unions.
- **07-06 ↔ 01-02, 08-03 / 09-01:** migration residue, different shapes; NexusOS's only `hidden_groups` is `[]`.
- **07-07 ↔ 09-14, I-006:** collapse and order keys by mutable label.
- **07-09 ↔ 05-02, 08-08.**
- **07-11 ↔ 03-11:** both concern option-rename cascade encoding, through different mechanisms.
- **07-12 ↔ 08-02:** 08-02's resolver routes `SettingsFrame.tsx:76` through `containerSchema`, which subsumes 07-12's one-line fix; 07-12's per-render default-view mint is its own evidence.
- **07-14 ↔ 02-16:** adjacent (renderer optimistic patch vs host write count), distinct.
- **07-15 ↔ 01-14 (`formatBucketLabel`), 08-11 (`pageRow.ts`).**
- **Approach C ↔ 09-14, 03-02, 08 Approach B, I-006:** no stable option identity under label-keyed refs.
- **`migrateConfig` cross-note ↔ 01-02, 08-03:** `RENAMED` has no NexusOS holder.

###### Contradictions
- **07-15 vs 08-11 (direction):** settled for 08-11; `ViewRow` stays in Views and `pageRow.ts` moves there (`Views/viewRow.ts:17-45`, 22 non-Properties importers including `Contract/bridge.ts:18`). 07-15's shape move is removed.
- **07-15 vs 01-14 (`formatBucketLabel` destination):** `Views/Bands/bandModel.ts`, its only caller (`bandModel.ts:11,51`), vs 01-14's `Views/Pipeline` beside `dateBucketKey`; reading doesn't decide it, and either is a pure move. Left to the synthesis.
- **07-04/07-13 vs 02-15 ("the `select` arm of `textValue` exists for Title"):** source sides with 07; `filter.ts:126` routes Select's `contains`/`starts_with` to `evaluateText`, so the arm stays after Title moves to `text`. Reconciler A owns 02-15.
- **07-02 vs 01-01 (how many per-type records):** unsettled by reading; the process boundary justifies two, and 07-02's third (`ValueKind`) needs a decision.

##### Reconciliation Log

| ID | Status | Reason | Evidence |
|---|---|---|---|
| 07-18 | REMOVED | `resolvedSortCount` is memoized on `[view.sort, schema]`, so criteria are built twice only when the sort or schema changes, never per render or per value write; and the proposed fix (count rides `resolveView`'s result) is circular, because the count feeds `pageOrderOf` → `manualOrder`, which is an input to `resolveView` | `useViewHost.ts:66-67,74,87`; `group.ts:421-425`; `resolveView.ts:27,41` |
| 07-01 | CORRECTED | Lookup count 23 (25 with `value.ts`), not ~27; `resolveView` default and `useColumnStyles`/`group.ts` omissions added; hand-built `ResolvedColumn`s added to the Better's cost | `git grep` over `Core/Views`, `Core/Matrix`; `resolveView.ts:29,31`; `PropertyPanel.tsx:382`; `cardValueInput.ts:71`; `useViewHost.ts:196` |
| 07-02 | CORRECTED | `GroupFrame` lines and count (8, not 9); smallest step re-spells rather than removes; `looks` on `TypeSpec` would cycle with `columnStyles.ts`; host-graph evidence was `matrixInput.ts`, which is renderer-side — the host consumer is `configReach.ts` | `GroupFrame.tsx:106,159,236,279,304,309`; `columnStyles.ts:3-10`; `Matrix/matrixRuntime.ts`; `configReach.ts:9,18`; `engineGraph.test.ts:4-9` |
| 07-03 | CORRECTED | Behavior field gains the creation-seed knock-on; known-but-inapplicable ops also hit `default: true` | `creationSeeds.ts:75-103`; `filter.ts:31,78` |
| 07-07 | CORRECTED | NexusOS's `collapsed_groups` hold bare option labels, not only Set ids, so rescoping needs a migration or drops collapse state | `~/NexusOS/Ideas/_pagecollection.json` views 0–1; `~/NexusOS/.nexus/contexts/Projects/Pommora/_tiles.json` tiles[2] |
| 07-09 | CORRECTED | `FilterFrame` uses `useStyleFor`, not the raw form; `PropertyFrame` is a second `useStyleFor` consumer | `FilterFrame.tsx:234,353,410`; `PropertyFrame.tsx:188,406` |
| 07-10 | INFERRED | Mechanism read; cost unmeasured and the cache is new machinery | `matrixInput.ts:108-132` |
| 07-13 | CORRECTED | `columnLabel`'s reserved-label table and `TITLE_OPS` stay; a `title` entry in `PROPERTY_TYPES` would widen the stored-definition enum | `columnLabel.ts:4-8`; `filterModel.ts:107-108`; `properties.ts:10-24,34` |
| 07-14 | CORRECTED | Only the two-branch patch is shareable; estimate about −3, not −8 | `assignValue.ts:38-57`; `useViewCreation.ts:44-57` |
| 07-15 | CORRECTED | `removeProperty.ts:14`'s runtime `mapViews` import added; the move carries the test file; `NUMERIC_FORMATS` can stay | `removeProperty.ts:14`; `Properties/formatBucketLabel.test.ts`; `GroupFrame.tsx:52` |
| 07-15 (Move the shape) | REMOVED (Reconciler B) | Contradicted 08-11; `ViewRow` is the pipeline's row with 22 non-Properties importers, so 08-11's `pageRow.ts`-to-Views direction holds | `Views/viewRow.ts:17-45`; `Contract/bridge.ts:18`; `Properties/pageRow.ts:11-67` |
| 07-17 | INFERRED | Host availability unsettled; the Better as written (resolved groups) would change the pane, so it reads the host's pre-filter rows instead | `resolveView.ts:34-51`; `useViewHost.ts:84-90`; `SettingsMenu.tsx:15`; `ViewTile.tsx:654` |
| Ledger "live option keys" | CORRECTED | Origin is `c81dca38c` | `git log -S liveKeys` |
| Ledger "row drag / sort-run reassign" | CORRECTED | Origin is `2c15c767f`; `73668f9fc` added the effective-sort gate | `git show --stat 2c15c767f` |
| Ledger "filter-implied seeds" | CORRECTED | Each rule must name exactly one value | `creationSeeds.ts:26` |
| Approach A | CORRECTED | Host-graph risk restated; behavior change through 07-03; extra `ResolvedColumn` sites | as for 07-01, 07-02, 07-03 |
| Approach B | INFERRED | Rests on unmeasured commit latency; Benchmarks absent | — |
| Per-Type Branch Map | CORRECTED | Line numbers re-cited; third Link `seat` copy | `GroupFrame.tsx`, `FilterFrame.tsx:380,408-410`, `TableView.tsx:406-430`, `PropertyPanel.tsx:539` |


---

#### Scout 08 — Nexus, Settings & Seams (Reconciled)

Baseline `d0595b22d`. "Read" means the code was read or a read-only check was run. "Inferred" means reasoned from code without running the app. The engine/renderer split was re-run by the reconciler with a read-only `vite-node` call to `Core/Testing/engineGraph.ts`, rooted at `Core/Contract/serve.ts` (the same walk `engineGraph.test.ts:4` runs).

**Live Nexus State (read, re-checked):** `~/NexusOS/.nexus/properties.json` holds 15 defs, every type camelCase, top-level keys `defs` and `order` only. No JSON under `~/NexusOS` (including `.nexus`, `.trash`, and the one `.deleted` bundle, `.trash/2026-09-18T02-31-49-204Z__Knowledge.deleted`) holds `multi_select`, `url`, or `datetime` as a type, and no `_pagecollection.json` (six live, one trashed) holds `property_cache`. NexusOS holds no property Trash record at all. Every NexusOS status option carries `group_id` equal to its parent group's id. `~/Test`, rebuilt at `156264f2f`, holds an empty registry and no property data, and no `~/Benchmark-*` is on disk, so NexusOS is the only live Nexus whose property shapes constrain removal.

##### Inventory — CORRECTED

Rows hold as written except these, corrected in place: `readContainer` is `readNexus.ts:173-192` and `readFolder` `:226-245` (its `registryOf` at `:238`); the open pass is `Nexus/handlers.ts:45, 111-115`; the bridge declares **20** `schema:`/`registry:`/`property:` channels (4 + 1 + 15), at `bridge.ts:131-189`, not 22; `Bundles/rows.ts` property arm is `:90-101`.

| File / Symbol | Lines | Property Responsibility Held (one line) | Belongs Here? | If Not, Where |
|---|---|---|---|---|
| `Core/Nexus/readNexus.ts` `readNexusConfig` / `walkNexus` | 287-288, 330-356 | Reads the registry through `readKeptRegistry`, orders it into `config.registry`, and hands `registry.defs` to the walk (`:333`) | Yes | — |
| `Core/Nexus/readNexus.ts` `readContainer` / `readFolder` | 173-192, 226-245 | Passes `registryOf(tree.config.registry)` (`:238`) into `containerNodeFrom` so each Collection resolves its schema | Yes, but see 08-02 | — |
| `Core/Nexus/containerFields.ts` `resolveAssignedSchema`, `cachedIds` | 24-39, 71-72 | Resolves a sidecar's `properties` ids to full defs, **dropping ids the registry lacks**; lists `property_cache` ids | The resolution belongs at read time (08-02) | `containerSchema` |
| `Core/Nexus/tree.ts` `CollectionNode.properties`, `.cached`, `NexusConfig.registry`, `Unreadable{kind:'registry'}` | 65-67, 104, 111 | Each def has two homes (registry plus each Collection's resolved copy) | Ids belong; copies don't (08-02) | `propertyIds: string[]` |
| `Core/Nexus/treePatch.ts` `containerSchema`, `NO_SCHEMA`, `repointRegistryInTree` | 125-131, 151-170 | The schema lookup; keeps both homes reference-identical on every registry change | `containerSchema` yes; `repointRegistryInTree` goes (08-02) | — |
| `Core/Nexus/fileEvents.ts` `applyRegistry` | 488-500 | Patches the registry into the tree; **walks the whole Nexus when a watched edit adds a def** | Yes, but the walk goes (08-02) | — |
| `Core/Nexus/fileEvents.ts` `applyContainer` | 405-437 | Re-resolves a sidecar's schema and owes options registration when it gains a property | Yes | — |
| `Core/Nexus/fileEvents.ts` `oweNamedKeys` | 521-538 | A Multi-Select whose key, type or format changed owes its Collections and every Space to registration | Yes (settled behavior) | — |
| `Core/Nexus/settle.ts` `settle` | 159-166 | Runs `registerHeldOptions` (`:163`) over owed holders plus every non-body-only changed page | Yes | — |
| `Core/Nexus/handlers.ts` open pass | 45, 111-115 | `normalizePropertyTypes` before the walk; `replaySchemaCascade`; then `runRepairSweep` → `registerHeldOptions(root)` | 45 goes (08-03); the rest is Scout 04's | — |
| `Core/Nexus/migrateConfig.ts` `respelled`, `renamedRegistry`, `normalizePropertyTypes` | 14, 57-74 | Reads `properties.json` at every open and rewrites it only when a legacy type id is present | No: migration residue (08-03) | Delete |
| `Core/Nexus/create.ts` `createPageOp` | 34-41 | Resolves create-time `seeds` against `readRegistry` (a disk re-parse) while `liveTreeOf` is already in hand at :29 | Yes; the read path is 08-05 | — |
| `Core/Nexus/mutate.ts` `'setProperty'` dispatch | 198-202 | Routes value writes to `setPagePropertyOp` / `setSpacePropertyOp` | Yes | — |
| `Core/Nexus/mutateRequest.ts` `seeds`, `setProperty`, `restoreValue` | 60, 90-92 | The wire shapes of value writes | Yes | — |
| `Core/Properties/setProperty.ts` `setPagePropertyOp` | 61-83 | Reads and re-parses the whole registry from disk inside the page lock (`:70`) on **every value write** | Yes; the cost is 08-05 | — |
| `Core/Index/indexSeed.ts` `extractPageIndex` | 41-61 | Stores every frontmatter root key as `page_values` rows and Link/Text values as `value` relations | Yes | — |
| `Core/Index/contentIndex.ts` `queryKeyHolders` | 74-76 | Used by five property sweeps (delete, keyHolders, optionOps, registryProperty, removeProperty) | Yes | — |
| `Core/Settings/personalization.ts` `checkboxColor`, `repairOnOpen`, `restoreLinksOnDeletion`, `dateFormat`, `timeFormat`, `trashColumnStyle`, `archiveColumnStyle` | 3, 22-26, 140-146, 195-199 | The settings that govern properties; imports `columnStyle`, `DATE_FORMATS` and `TimeFormat` from Properties | Yes | — |
| `Core/Settings/frames.ts` property rows | 13-14, 173-183, 197-211, 236-243, 546-553, 636-640, 855-870 | Rows for Date/Time Format, Repair On Open, Default Link Format, Restore Links, Checkbox Color; hand-rolls picker options | Yes; options in 08-09 | — |
| `Core/Settings/devicePrefs.ts` `defaultLinkFormat` | 7, 41, 63 | A device pref typed by the Link property's `LINK_DISPLAYS` | The vocabulary's owner is wrong (08-08) | — |
| `Core/Settings/applyPersonalization.ts` `checkboxColor` | 42-46 | Turns Checkbox Color into CSS variables once, with zero per-cell cost | Yes | — |
| `Core/Settings/exclusionScan.ts` `clearRewrite` | 8, 54-87 | Clear Exclusion Data strips the ID and Context keys through `sweepGovernedRoots` (`:83`) | Yes; the sweep's home is cross-domain | — |
| `Core/Settings/TrashFrame.tsx` property row icon | 15, 64-68, 101 | The type icon for a trashed property, falling back to `'tag'` | Yes | — |
| `Core/Settings/NexusRows.tsx` | 10, 36, 57 | Only `clockOf` and `timeFormat` for the sync caption | Yes | — |
| `Core/Bundles/browser.ts` `useDateColumn`, `widestDate` | 89-148 | The Trash/Archive date column style over the Nexus date and clock | Yes | — |
| `Core/Bundles/rows.ts` `bundleRowOf` property arm | 90-101 | A trashed property's title and type | Yes (ledger L7) | — |
| `Core/Archive/ArchiveView.tsx` | 24, 127, 138 | Header glyphs from `PropertyTypeIcon` | Yes | — |
| `Core/Session/chromeSlice.ts` `ValuePickRequest` | 17-24, 35-36 | The value-pick request's shape | Yes | — |
| `Core/Interface/Windows/PageReaderWindow.tsx` `HistoryReader` | 128-164 | Calls `view:loadValues` (through `fetchPageValues`) for one page's `modifiedAt`; reads date and clock directly | Partly (see Cross-Domain) | — |
| `Core/Interface/Windows/WindowTabBody.tsx` | 10, 221 | Mounts `PropertyPanel` | Yes | — |
| `Core/MarkdownPM/Links/linkEdit.ts`, `pasteLink.ts` | 7 / 12 | Use the Link property's `LinkDisplay` vocabulary for pasted links | The vocabulary is misplaced (08-08) | `Core/Connections/linkValue.ts` |
| `Core/Navigation/previewRules.ts` `previewTargets` | 5-12, 31-37 | Builds filter targets from `Properties/Cells/PropertyTypes.tsx` | The targets are misplaced (08-11) | A Views module |
| `Core/Contract/serve.ts` / `bridge.ts` | serve 9, 21; bridge 131-189 | 20 `schema:`/`registry:`/`property:` channels | Yes | — |
| `Core/Sync/Arrival/mergePolicy.ts` `mergeDepthFor` | 25-41 | `properties.json → {defs: 2}` (`:32-33`); sidecars fall to `{}` (`:38-39`) | Yes (08-01, 08-06) | — |
| `Core/Files/jsonMerge.ts` `mergeKeys` | 15-46 | The "a deleted side merges as empty" rule at :36-42 | Yes, but it mis-merges defs (08-01) | — |
| `Core/Properties/rowOrder.ts` `resolveRowOrder` | 1-13 | A generic "listed first, the rest in arrival order" helper; 3 Views callers, 2 Properties callers | No (08-11) | `UIX/Utilities/moveItem.ts` |
| `Core/Properties/pageRow.ts` | 1-67 | ViewRow builders plus a `view:loadValues` client | No (08-11) | `Core/Views/` |
| `Core/Properties/propertyCache.ts` | 1-68 | The `property_cache` reader and writer | Yes; the shape is 08-06 | — |

##### Engine / Interface Split — CORRECTED

Re-run at HEAD (read). **ENGINE** means the host graph reaches the file. **Renderer** means it reaches `.tsx` or `.css.ts`, imports React, or reaches the host through `dialer`/notifications. **Shared-pure** means neither graph forbids it, but only the renderer imports it.

- **Engine (25, not 23; all pure, none imports React):** `assignment`, `columnStyles`, `deleteProperty`, `formatValue`, `governedSweep`, `governedWrite`, `handlers`, `journalSlot`, `keyFormat`, `keyHolders`, `optionModel`, `optionOps`, `pageValue`, `properties`, `propertiesRegistry`, `propertyCache`, `propertyJournal`, `propertyValue`, `registryProperty`, `removeProperty`, `repairSweep`, `replaySchemaCascade`, `rowOrder`, `schema`, `setProperty`. (The scout's own list named these 25.)
- **Renderer, root folder:** `PropertyPanel.tsx`, `paneDrop.tsx`, `property-panel.css.ts`, `assignValue.ts` (React types and the session store, `:1,10-11`), `valueOverride.ts` (React types, `:1`), `pageRow.ts` (`dialer`, `:9`), `propertyWrite.ts` (notifications, `:2`).
- **Shared-pure, root folder, renderer-only today:** `value.ts`, `parseEditorValue.ts`, and `valueContext.ts` (type-only imports, `valueContext.ts:1-6`; the scout filed it as renderer).
- **Renderer, subfolders:** all of `Cells/`, `Pickers/` and `Schema/`. `Pickers/massAssign.ts` and `Pickers/valueClick.ts` are pure, but only the renderer imports them.
- **Mixed files: none.** Three engine files carry interface copy: `columnStyles.ts:23-69` (`LOOK_LABELS`, `DATE_FORMAT_LABELS`, `TIME_FORMAT_LABELS`, `WEEKDAY_FORMAT_LABELS`, `lookOptions`, `DATE_FORMAT_OPTIONS`), `properties.ts:98-102` (`LINK_DISPLAY_LABELS`) and `properties.ts:263-274` (`itemCount`, `KEY_REFUSAL`). `formatValue.ts` is engine only because `propertyValue.ts:16` imports `readNumber`/`spelledNumber` (no other engine file imports it; the Views pipeline importers aren't host-reached). `columnStyles.ts` is engine because `Settings/personalization.ts:3` and `Views/views.ts` import its decoder.
- **What the tests enforce (read):** `engineGraph.test.ts:7-8` (no `.tsx`/`.css.ts`), `:11-20` (an exact external allowlist without `react`), and `:23-37` (the exact UIX leaves, which already include `UIX/Utilities/moveItem.ts`). Nothing in either graph test is property-specific, and nothing ties a folder to a seam.
- **What the layout tells a reader:** the subfolders are cleanly renderer, but the root interleaves 25 engine files with 10 renderer or renderer-only files. Seven value-named files (`value`, `pageValue`, `propertyValue`, `assignValue`, `valueContext`, `valueOverride`, `parseEditorValue`) give no hint which side they're on. "Schema" means three things: `Schema/` holds the renderer's definition editors, `schema.ts` holds engine name and option validators, and `schema:*` channels plus `containerSchema` mean a Collection's assignment list (08-12).

##### Sync Shapes — CORRECTED

Merge mechanics re-traced through `mergeKeys` (`jsonMerge.ts:15-46`), `mergeDepthFor` (`mergePolicy.ts:25-41`), `bytesToLand` (`land.ts:45-64`), and `base.ts:57` (base bytes kept only for merged JSON). Landings write through `landBytes` (`atomicWrite.ts:42-52`) with no write echo, so the watcher sees them as `'watched'` (NexusSyncPM.md:61).

| Shape | Merges As | Loses Under | Shape Change That Fixes It | Status |
|---|---|---|---|---|
| `properties.json` `defs.<id>.<field>` | Per def, per field (`{defs: 2}`, `mergePolicy.ts:32-33`) | **One device deletes a def while the other edits it, and the edit is newer: the result is a fragment def holding only the edited fields, with no id, key or type.** `normalizeRegistry` puts it in `unadmitted` (`propertiesRegistry.ts:35`), and `mutateRegistry` re-writes it and appends it to `order` on every registry write (`:101, 112-116`). A test pins this (`mergePolicy.test.ts:130-136`). | No shape change; a whole-on-absent rule for a delete-versus-edit conflict is a Sync rebuild input (08-01) [Intended as H-1] | VERIFIED |
| `properties.json` `defs.<id>.select_options` | Whole field | One option added per device on the same property: one add is lost (I-006, `IssuesPM.md:189`) | 09-14's stable option id [Intended as D-1]; merging per option is a Sync rebuild input [Intended as H-2] | VERIFIED |
| `properties.json` `defs.<id>.status_groups` | Whole field, with options nested inside | The same, plus a group relabel on one device against an option add on the other loses one | As for `select_options`; the nested `group_id` is unread and leaves (08-04) [Intended as D-3] | VERIFIED |
| `properties.json` `order` | Whole (level 0) | A reorder on each device: one loses, and `resolveRowOrder` appends what's missing | None needed | VERIFIED |
| Collection sidecar `properties` (assigned ids) | Whole (sidecars fall to `{}`, `mergePolicy.ts:38-39`) | Assigning a different property on each device drops one (I-006, `IssuesPM.md:188`) | A Sync rebuild input: merge as a set (I-006's proposal) [Intended as H-1] | VERIFIED |
| Collection sidecar `property_cache.<propId>.values.<pageId>` | Whole | **Removing a different property from one Collection on each device loses one device's stash, and that's the only copy of the stripped values. I-006 doesn't list it.** Because `properties` also merges whole, the losing device's Remove is undone too: the property returns assigned while its values are already stripped from the pages. | `{property_cache: 2}` would merge per property with today's shape; per page needs depth 3, or the `values` wrapper flattened plus depth 2 (08-06), and `mergeDepthFor` has no sidecar arm today. A Sync rebuild input, unless the stash's placement removes the loss without a Sync rule [Intended as C-2, H-2] | CORRECTED (depth arithmetic; compounding `properties` loss) |
| Collection sidecar `views[].column_styles` | Whole with `views` | A style picked on each device in one view loses one (I-006's `views`) | A Sync rebuild input: I-006's per-view item merge [Intended as H-1] | VERIFIED |
| `_space.json` value keys | Per root key (each value is a top-level key at level 0) | Only a both-sides edit of one key; multi-value arrays go whole | None. This is the one property shape that already merges finely | VERIFIED |
| Page frontmatter values | **Not merged.** `.md` isn't merged JSON (`mergePolicy.ts:20-21`), and `base.ts:57` keeps no base bytes for it. Newer side wins the whole file; the loser lands in the capture store (NexusSyncPM.md:55) | **Two devices setting different properties on one page lose one, and the value is visible only in the capture store** | No on-disk shape change is possible (Legibility). The only fix is a YAML-aware per-root-key merge at landing, which needs page base bytes (Approach D), a Sync rebuild input [Intended as H-1] | VERIFIED |
| `state.json` `order.contexts` (Properties panel's Context order) | Whole per list (`order: 1`, `mergePolicy.ts:31`) | One reorder loses; it self-repairs | None | VERIFIED |
| `settings.json` `personalization.trashColumnStyle` / `archiveColumnStyle` / `checkboxColor` / `dateFormat` / `timeFormat` / `repairOnOpen` | Per setting, per field (`{personalization: 2}`, `mergePolicy.ts:29`) | None that matter | None | VERIFIED |

##### Findings

###### 08-01 · A property deleted on one device and edited on another leaves a corrupt fragment def, and a test pins it as intended — CORRECTED
- **Lens:** Fix the Origin · Sync-Ready Shapes · Describers Get Swept · Behavior Is a Decision
- **Now:** `mergeKeys` treats a deleted side as an empty object (`Core/Files/jsonMerge.ts:36-42`). That suits metadata month files, where one device clearing a page and another setting a field should keep the field (stated as intended in `NexusSyncPM.md:63`). `{defs: 2}` (`mergePolicy.ts:32-33`) applies the same rule to registry definitions. Base `P{id,name,type}`, local deleted, remote renamed and newer gives `{defs:{P:{name:'New'}}}`: `id` and `type` take the deleting side because only it changed them, and `name` goes to `pick()`. `mergePolicy.test.ts:130-136` asserts exactly this, under the title "keeps only the edited fields of a def one side deleted and the other edited". On disk, `normalizeRegistry` puts the fragment in `unadmitted` (`propertiesRegistry.ts:35`), and `mutateRegistry` re-writes it and appends it to `order` on every registry write (`:101, 112-116`). It never shows, and it's never cleaned up unless that property is restored from the Trash (the restore's `createProperty` writes the id over it, `:101-110`). The test, from `686ac2a08`, uses a `name` field the schema doesn't have; the real field is `label` (`properties.ts:163`), and neither registry test (`mergePolicy.test.ts:120-136`) carries `key`.
- **Better:** Sync's merge rules stay as they are until its rebuild, so the fix is a rebuild input [Intended as H-1]: a record semantic for `defs`, where a side that deleted the entry and a side that changed it resolve by `pick()` to one whole side, either deleted or the complete edited def, while both-present conflicts keep merging per field. *Corrected:* it can't be an unconditional branch in `mergeKeys`, because the metadata shards rely on the keep-the-field rule (`mergePolicy.ts:26`, `NexusSyncPM.md:63`); it has to be a policy-scoped option (e.g. a `{defs: {depth: 2, whole: 'absent'}}` entry, which widens `Depth` from `Record<string, number>` at `jsonMerge.ts:4`). Reverting to the pre-`686ac2a08` `{defs: 1}` would also remove the fragment, but it would lose a rename racing another field's edit, leaving pages swept to the new key under a registry holding the old one (see B-08-01). In this deepclean, both registry tests change `name` to `label`.
- **Behavior:** Preserving; the fragment stays until the Sync rebuild. Under the rule, the newer side would win whole: either the property stays deleted (with its Trash record) or it comes back complete, and when the edit wins, the deleting device's Trash record still exists and its restore refuses because the id is present (`restoreProperty.ts:34-35`).
- **Estimate:** one test's field name here; the rule's own cost (about +6 / −2 plus the `Depth` widening and a test rewrite) belongs to the rebuild · read (merge and test), inferred (downstream ride-along)

###### 08-02 · Collections hold resolved copies of defs, so a definition arriving by sync forces a full Nexus walk — CORRECTED
- **Lens:** Hot Paths Stay Cold · Fix the Origin · One Way (one home per def) · Less Stuff
- **Now:** `resolveAssignedSchema` (`containerFields.ts:29-39`, called at `:71`) turns a sidecar's `properties` ids into def objects and **drops ids the registry doesn't hold**. The tree then keeps every def in two homes, `config.registry` and each `CollectionNode.properties` (`tree.ts:65, 104`). `repointRegistryInTree` (`treePatch.ts:151-170`) exists only to keep the two reference-identical; *corrected:* `stabilize` is the general identity-recycler used across the tree, sessions, and assets (`treeStabilize.ts:1-5`, a dozen callers), not a two-homes mechanism. Because the tree has forgotten unresolved ids, `applyRegistry` can't place a def that arrives from outside, and for a `'watched'` event it returns `null` → walk (`fileEvents.ts:491-495`, comment "only a read of the sidecars finds"; `applyPatch` maps `null` to `'walk'`, `:313-316`). Sync landings are `'watched'` because `landBytes` records no echo (`atomicWrite.ts:42-52`), so every synced `properties.json` that adds a property created on another device re-walks the whole Nexus. The walk's cost at 50k pages is inferred; no Benchmark Nexus exists. `applyContainer` and `readFolder` also rebuild `registryOf(...)` per event (`fileEvents.ts:430`, `readNexus.ts:238`).
- **Better:** `CollectionNode` holds `propertyIds: string[]` exactly as written. `containerSchema(tree, of)` (`treePatch.ts:128-131`), which already fronts nine call sites in eight files, resolves ids against a registry map built once per `config.registry` identity (`entityMemo`, `tree.ts:132`, or a WeakMap). The direct `.properties` readers (`fileEvents.ts:536`, `assignment.ts:41`, `Views/Settings/SettingsFrame.tsx:76`) go through it; the `Actions/*` `properties` fields are menu-context fields already filled from `containerSchema` (`entityMenuActions.ts:60-64`), so they need no change. `applyRegistry` then always patches, and `repointRegistryInTree`, the `arrived` walk branch and `resolveAssignedSchema` are deleted. `registryOf` per event goes too.
- **Behavior:** Preserves behavior, except that a synced or hand-added property shows with no re-walk lag.
- **Estimate:** about −45 / +15 production lines · read (mechanism), inferred (walk cost)

###### 08-03 / 09-01 · Legacy type ids and the open-time respell are migration residue — CORRECTED
- **Lens:** Legacy Versus Interop · Removal First · Always Intentional · Comments Aren't Authoritative
- **Now:** `LEGACY_TYPE_IDS` and the `propertyType` preprocess (`properties.ts:78-88`) justify themselves with "a Trash record and an older build's synced file keep them, so they read forever". `normalizePropertyTypes` with `respelled`, `renamedRegistry`, and the `field` helper (`migrateConfig.ts:14, 30-38, 57-74`; `field` has no reader outside `renamedRegistry`, `:63,66`) runs at every open (`Nexus/handlers.ts:26, 45`). *Corrected:* it reads `properties.json` under its lock at every open but rewrites it only when a legacy id is present, since `rmwJsonStrict` skips the write when the mutate returns `null` (`atomicWrite.ts` `rmwLocked`, "neither rewrites nor re-dates it"). NexusOS holds no legacy id in the registry, the Trash or `.nexus` (its registry's types are `checkbox, dateTime, file, link, multiSelect, number, select, status, text`; the only hits are prose `.md` mirrors), and holds no property Trash record (read). Scout 09's `~/Test` grep ran while `~/Test` was absent; the rebuilt `~/Test` (`156264f2f`) holds no property data, and `make-benchmark-nexus.mjs:128-137` writes camelCase. The camelCase ids came in `31b2e8481` (09-25). Tests and docs that carry it: `migrateConfig.test.ts` (all 74 lines are the `normalizePropertyTypes` block, `:19-74`), `properties.test.ts:3, 44-47`, `optionOps.test.ts:416-435` (pins that ordinary writes *preserve* the legacy spelling, the reason the open-time rewrite exists), `mergePolicy.test.ts:120-128`, `Nexus/handlers.test.ts:165-178` (a whole test, "respells a legacy property type in the registry it opens"), `Trash/restoreScrub.test.ts:287, 310`, `PropertiesPM.md:8` ("still read, and are rewritten"), and `NexusSyncPM.md:63` ("a type respelled on one device and a rename made on another both survive").
- **Better:** `propertyType = typeIds`, then delete the legacy map, `respelled`/`renamedRegistry`/`field`/`normalizePropertyTypes`, the `propertyType` import, the open call, and their pinning tests (`migrateConfig.test.ts` whole, `properties.test.ts:44-47`, `optionOps.test.ts:416-435`, `handlers.test.ts:165-178`), plus both doc clauses. *Corrected:* `restoreScrub.test.ts:287, 310` use `multi_select` incidentally and get respelled to `multiSelect`, not deleted. Re-base the `mergePolicy` test on a field edit racing a rename so the per-field merge stays covered (B-08-01). The comment's "older build's synced file" (a Sync peer still on a pre-09-25 build) is the only remaining reader it names; that's a Sync-Ready Shapes note, not a reason to keep the code. `migrateConfig.ts`'s saved-view `RENAMED` (`:20-23`) is the same kind of residue; NexusOS holds neither `card_banner: image` nor `icon: table` (01-02, confirmed by the 07 and 09 checks). It isn't property scope.
- **Behavior:** Preserving for every live Nexus. *Corrected:* nothing visible changes, since no live registry is being rewritten today; the open just stops a locked read. A registry still holding a legacy id would read that def as unadmitted (carried through writes, hidden from the UI; `propertiesRegistry.ts:32-35`), not dropped, and none exists.
- **Estimate:** about −38 production (`properties.ts` −11, `migrateConfig.ts` −25, `handlers.ts` −2) / −70 to −110 test lines · read
- **Merged:** 09-01 (Tests & Describers) is the same removal; its `field` helper, whole-file test deletion, and `handlers.test.ts` whole-test point are carried here. Its claims that the app "stops rewriting `properties.json` at open" and that a legacy def would be "dropped as invalid" don't hold (see above).

###### 08-04 · `group_id` on a status option is required and written, but nothing reads it — CORRECTED
- **Lens:** Less Stuff · Fix the Origin · Legibility · Sync-Ready Shapes
- **Now:** Options nest inside their group (`properties.ts:149-155`), yet each one also carries `group_id: statusGroupId` as a **required** field with no catch (`:144`). `git grep group_id` across Core, UIX, Desktop and Sync finds no reader; `optionGlyph` resolves an option's group by scanning `status_groups` for its label (`Cells/OptionChip.tsx:27-28`). The writers are `optionModel.ts:35, 49`, `properties.ts:304` (stamped on Select options as a temporary value) and `:313` (stripped again), the seed at `:323-335`, and the fixtures `Testing/fixtures/registry.json:13-34` and `Testing/viewHarness.tsx:68, 74`. NexusOS writes it on every status option, always equal to the parent's id (read). A hand edit that omits it fails `statusOption`, then `statusGroup`, then the def (`status_groups` has no catch, `:169`), so the property silently becomes unadmitted. *Corrected:* it doesn't date from a flat model; options were already nested under groups, with `group_id` beside them, in the field's first commit (`2a5936603`, 06-14, "mirroring Swift's PropertyDefinition").
- **Better:** Remove `group_id` from `statusOption`, stop `optionModel` stamping it, and drop the add-and-strip in `optionGroupsOf`/`withOptionGroups`. *Corrected:* existing values won't fade on their own. Option writes start from the raw stored entry so every unknown key rides through (`optionOps.ts:59-66`), and `moveOption` spreads the stored option (`optionModel.ts:49`), so after the removal a moved option would keep writing its *former* group's id. The plan therefore strips NexusOS's `group_id`s once (one file) [Intended as D-3]. Overlaps Scout 01.
- **Behavior:** Preserving, except that a hand-edited option without the field now reads.
- **Estimate:** about −10 production lines plus fixtures · read

###### 08-05 · Every value write re-reads and re-validates the whole registry from disk — VERIFIED
- **Lens:** Hot Paths Stay Cold · One Way (one registry read path)
- **Now:** `readRegistry` (`propertiesRegistry.ts:50-54`) is `readJsonStrict` plus `normalizeRegistry`, which zod-parses every def and runs `validateName` against all earlier defs. That's O(R²) `normalizeTitle` calls (`:28-33`; `schema.ts:42-56`) plus option uniqueness per def. It runs at 14 call sites, including `setPagePropertyOp` inside the page lock (`setProperty.ts:70`), `setSpacePropertyOp` (`:55`), `createPageOp` (`create.ts:36`) and `assignedDefs`' fallback (`assignment.ts:43`). The in-lock read is deliberate, to avoid racing a rename sweep (`setProperty.ts:67`). Sidecars and pages already get "fresh but not reparsed" reads through `cachedParse` (`Files/walkCache.ts:34-58`, used by `readSidecar` at `readNexus.ts:86-87`), and every atomic write calls `forgetParse` (`atomicWrite.ts:36, 51`).
- **Better:** Wrap the strict read's parse in `cachedParse` keyed on the registry path. Each write still stats the file under the lock, and `cachedParse` refuses an entry inside its racy window (`walkCache.ts:44-48`), so the race guarantee holds, but stops re-parsing it. One reader serves all 14 call sites.
- **Behavior:** Preserving.
- **Estimate:** about +4 / −0 · read (cost is one disk read, parse, and O(R²) validation per write; negligible at NexusOS's 15 defs, multiplied by mass assign's N writes, 02-10)

###### 08-06 · `property_cache` has a vestigial `values` layer, merges whole across devices, and its name misdescribes it — CORRECTED
- **Lens:** Sync-Ready Shapes · One Vocabulary · Less Stuff
- **Now:** The shape is `property_cache.<propId>.values.<pageId>`. Every writer passes `{ values }` and nothing else (`assignment.ts:104`, `removeProperty.ts:48-55`, `propertyCache.ts:45`, `Trash/restoreProperty.ts:53`). `cachedValues` (`propertyCache.ts:8-14`) unwraps it. Sidecars merge at `{}`, so concurrent Removes of different properties on one Collection keep one device's block; the `properties` list merges whole too, so the losing device's property also comes back assigned. A Remove writes no Trash record (`removeProperty.ts:27-61`), so this block is the **only** copy of the stripped values. It isn't regenerable, which is the opposite of a cache. I-006 (`IssuesPM.md:183-189`) doesn't list it, and `PropertiesPM.md:27, 128-134` call it a "restore cache" and "value caches".
- **Better:** The stash stays and is meant to lose nothing under sync, drop entries for pages that have left the Collection, and let a Remove that missed pages be retried, with planning free to give it a better home than the Collection's settings file [Intended as C-1, C-2]. Flattening it to `property_cache.<propId>.<pageId>` is its own Less Stuff change, and a name that says what it holds (e.g. `removed_values`) is on-disk vocabulary that reaches Nathan with planning's placement. A Collection-sidecar arm in `mergeDepthFor` is a Sync rebuild input unless the placement removes the loss without a Sync rule [Intended as H-2]. *Corrected:* that merge doesn't depend on the flattening; with today's shape `{property_cache: 2}` merges per property, and per page needs 3. Add the loss to I-006. NexusOS and `~/Test` hold no `property_cache` (read), so no migration is needed.
- **Behavior:** Preserving locally; the sync loss stays until the rebuild or a placement that removes it.
- **Estimate:** about −6 / +4 · read

###### 08-07 · Engine modules carry interface copy, and a value codec lives in the display formatter — CORRECTED
- **Lens:** Clearer Boundaries · Less to Understand
- **Now:** `formatValue.ts` (303 lines, mostly display) enters the engine graph only because `readNumber`/`spelledNumber` (`:287-303`) are the value codec that `propertyValue.ts:16` needs (re-run graph). `columnStyles.ts` is engine for its `columnStyle` decoder (`:76-86`), yet holds the label tables and `lookOptions`/`DATE_FORMAT_OPTIONS` (`:23-69`). `properties.ts:98-102` holds `LINK_DISPLAY_LABELS`. `Settings/personalization.ts:3` reaches into Properties for `DATE_FORMATS`. *Corrected:* `itemCount` (`properties.ts:263`) isn't renderer copy; the engine uses it in `KEY_REFUSAL.held` (`:272-273`) and `governedSweep.ts:21, 60`, and the engine also carries other wire-crossing refusal text (`optionOps.ts` `NO_OPTION`, `OWED`, `CROSSED`).
- **Better:** Move `numberShape`/`readNumber`/`spelledNumber` next to `decodeValue` and `encodeValue` in `propertyValue.ts`. Leave the enums and decoders in the engine files, and move the display label tables and option lists to one renderer `.ts` module (a `.tsx` beside `TYPE_META` would make `Settings/frames.ts` and `Actions/*.ts` import a component file). `itemCount` stays with the refusal text. After that, the engine holds no display labels in Properties, while error text that crosses the wire stays. The payoff is reader clarity only; label strings in the host cost nothing at runtime, and the engine tests don't forbid them.
- **Behavior:** Preserving.
- **Estimate:** about ±0 (moves, possibly +1 file) · read

###### 08-08 · The link-display vocabulary belongs to Connections, not the Link property — CORRECTED
- **Lens:** Clearer Boundaries · One Vocabulary
- **Now:** `LINK_DISPLAYS`, `LinkDisplay`, `isLinkDisplay`, `DEFAULT_LINK_DISPLAY` and `LINK_DISPLAY_LABELS` live in `properties.ts:90-102`. *Corrected importer list:* outside Properties they're imported by `Connections/linkValue.ts:26` (which owns `linkDisplayText`, `linkMarkdown` and `linkPaste`, `:199-279`), `MarkdownPM/Links/linkEdit.ts:7`, `pasteLink.ts:12`, `Actions/pasteAsMenu.ts:14`, `Actions/connectionMenu.ts:9`, `Actions/columnMenu.ts:17`, `Settings/devicePrefs.ts:7` and `Settings/frames.ts:14`; inside, by `Cells/LinkCell.tsx:1`, `Schema/LinkEditor.tsx:2`, `Schema/linkFormatOptions.ts:1` and `columnStyles.ts:4-6`. `Tiles/Surfaces/WebTile.tsx` doesn't import it; it reads the device pref and calls `linkDisplayText` (`:23-25`). This is how a URL is written anywhere, and the Link property is one consumer of it.
- **Better:** Move the enum, type, guard, and default into `Connections/linkValue.ts`. `properties.ts` keeps only the `link_display` field's decoder, typed from there. `LINK_DISPLAY_LABELS` follows 08-07's label placement rather than landing in `linkValue.ts`, which is engine. Six outside importers stop reaching into Properties for it; `columnMenu.ts` still imports `PROPERTY_TYPES`, and `linkValue.ts` still imports `PropertyValue` (`:27`).
- **Behavior:** Preserving.
- **Estimate:** about ±0 · read

###### 08-09 / 05-04 · "Labels map → picker options" is hand-rolled eight times, and one file exists only for that — CORRECTED
- **Lens:** One Way · Look Outward · Less Stuff · Clearer Boundaries
- **Now:** *Corrected count (reconciler):* eight label-record maps, not nine. They are `columnStyles.ts:33-35` (`lookOptions`) and `:48-51` (`DATE_FORMAT_OPTIONS`), `Schema/DateTimeEditor.tsx:12-16` (`WEEKDAY_OPTIONS`, `TIME_OPTIONS`), `Schema/linkFormatOptions.ts:5-8` (an 8-line file holding one export), and `Settings/frames.ts:173-183` (`timeFormatOptions`, `headingLinkStyleOptions`, `inPageHeadingResolutionOptions`). `Schema/FormatRows.tsx:8-11` uses each value as its own label, so it's an identity map rather than a ninth label map; NumberEditor's `FAMILY_OPTIONS` is a hand-written literal that restates labels for `NUMBER_FAMILIES` (`properties.ts:105`), and `DECIMAL_OPTIONS` is a generated range (`NumberEditor.tsx:16-29`) (from 05-04). `DateTimeEditor`'s `TIME_OPTIONS` and `frames.ts`'s `timeFormatOptions` map the same `TIME_FORMAT_LABELS`. `LINK_FORMAT_OPTIONS` already equals `lookOptions(LINK_DISPLAYS)`, since `LOOK_LABELS` spreads `LINK_DISPLAY_LABELS` (`columnStyles.ts:28`), and its "Default first" ordering is `LINK_DISPLAYS`' own. Settings has to import it from a Schema UI file (`Settings/frames.ts:13,552`), while the date list sits beside its tuple in `columnStyles.ts`.
- **Better:** Delete `linkFormatOptions.ts` and use `lookOptions(LINK_DISPLAYS)` at both callers (no new helper needed for it). One `pickerOptions(values, labels)` in the renderer label module 08-07 creates serves the remaining label-record maps once the label tables move there, and `lookOptions` becomes a call of it. It can't sit beside `PickerOption` in `UIX/Pickers/PickerControl.tsx:10` while `lookOptions` stays in `columnStyles.ts`, since that file is in the engine graph and `engineGraph.test.ts` forbids any `.tsx` and pins an exact UIX leaf list (`:23-37`). The helper's name must not be `labelled`, which `properties.ts:115-120` already uses for the label-or-key rule (05-04's original proposal). Add a `NUMBER_FAMILY_LABELS` beside `NUMBER_FAMILIES` only if Number's options go through the helper.
- **Behavior:** Preserving.
- **Estimate:** about −25 / +4 · read
- **Merged:** 05-04 (Schema Surfaces) is the same finding seen from the editors; its corrections (the `lookOptions` route, the `labelled` name clash, `FAMILY_OPTIONS`/`FORMAT_OPTIONS` not being label maps) are carried here.

###### 08-11 · Generic modules sit in Properties because Properties wrote them first — CORRECTED
- **Lens:** Clearer Boundaries · Look Outward
- **Now:**
  - `rowOrder.ts` (`resolveRowOrder`) has three Views callers (`Bands/bandRouter.ts:69-70, 88`, `Pipeline/bandOrder.ts:13`, `Pipeline/group.ts:436`), and its semantics differ from `Nexus/order.ts:11-28` `resolveOrder`, which sorts the unlisted by ULID (no order) or title.
  - `pageRow.ts` builds `ViewRow`s (it imports `Views/viewRow`, `:6`) and calls a Views channel (`:52-58`).
  - `PropertyTypes.tsx:59-97` holds `PaneTarget`, `TITLE_/LOCATION_/STAMP_TARGETS`, `contextPaneTargets`, `schemaTargets` and `targetOption`. *Corrected consumers:* `Views/filterModel.ts`, `Views/Settings/SortFrame.tsx`, `GroupFrame.tsx:62`, `FilterFrame.tsx:11`, `Properties/PropertyPanel.tsx:44` and `Navigation/previewRules.ts`. They sit in a `.tsx` under `Cells/`, so `previewRules.ts` is renderer-only for data it doesn't render.
- **Better:** Move `resolveRowOrder` to `UIX/Utilities/moveItem.ts`; *corrected:* that file is already in the engine graph's pinned UIX leaves (`engineGraph.test.ts:31`), so the test needs no change. Move `pageRow.ts` to `Core/Views/`. Move the pane targets to one Views-root `.ts` module beside `filterModel.ts`, leaving `PropertyTypes.tsx` holding type glyphs only (*settled by Reconciler B* with 06-11: Views root rather than `Views/Settings/`, since `filterModel.ts` and `Navigation/previewRules.ts` consume them from outside Settings; 01-08's "into `filterModel.ts` itself" is Reconciler A's to weigh). *Settled by Reconciler B against 07-15:* `pageRow.ts` moves to Views and `ViewRow` stays there; `ViewRow` is imported by 22 non-Properties files, `Contract/bridge.ts:18` among them, and carries the pipeline's `parentSetId` (`Views/viewRow.ts:17-27`), while `pageRow.ts`'s exports build `ViewRow`s and call `view:loadValues` (`pageRow.ts:11-67`).
- **Behavior:** Preserving.
- **Estimate:** about ±0 (moves) · read

###### 08-12 · Nothing in the root folder's layout or names tells a reader which side a file runs on — CORRECTED
- **Lens:** Less to Understand · One Vocabulary
- **Now:** See *§Engine / Interface Split*. *Corrected counts:* ten renderer or renderer-only files sit among 25 engine files at the root. "Schema" names three different things, and seven files are value-named.
- **Better:** Keep the engine at the root and put the renderer files in subfolders, which matches how `Cells/`, `Pickers/` and `Schema/` already work. The root renderer stragglers (`PropertyPanel.tsx`, `paneDrop.tsx`, `property-panel.css.ts`, `assignValue.ts`, `valueOverride.ts`, `valueContext.ts`, `propertyWrite.ts`, `value.ts`, `parseEditorValue.ts`, plus `pageRow.ts` unless 08-11 moves it) move into a `Panel/` folder or the existing subfolders. Rename `Schema/` to `Definitions/`, or rename `schema.ts` to `validation.ts`, so "schema" keeps one meaning: a Collection's assignment, as `containerSchema` and the `schema:*` channels use it. No sibling folder sets a precedent: `Core/Views` splits by feature (`Bands/`, `Cards/`, `Host/`, `Pipeline/`, `Settings/`, `Table/`), and `Core/Contexts` is flat (read).
- **Behavior:** Preserving.
- **Estimate:** ±0 lines; renames only · read

###### 08-13 · "The schema a holder carries" is stated three times — CORRECTED
- **Lens:** One Way · Type Facts Once
- **Now:** `PropertyPanel.tsx:161` (`isSpace ? tree.config.registry : containerSchema(tree, path)`), `optionOps.ts:132` (`space ? tree.config.registry : containerSchema(tree, rel)`) and, *missed by the scout*, `Interface/Menus/entityMenuActions.ts:60-64` (`node ? registry : containerSchema(s.tree, target.path)`) each decide that a Space reads the whole registry and a page reads its Collection's schema. `assignedDefs` (`assignment.ts:33-46`) is a fourth schema resolver, with a disk fallback (03-14).
- **Better:** A `holderSchema(tree, rel)` in `treePatch.ts`, next to `containerSchema`, that all three call. This fits 08-02's resolver.
- **Behavior:** Preserving.
- **Estimate:** about −3 / +4 · read

###### 08-14 · Describers that go stale with this domain's changes — VERIFIED
- **Lens:** Describers Get Swept
- **Now:**
  - `NexusSyncPM.md:63`'s respelling example (08-03, B-08-01).
  - `PropertiesPM.md:8`, the legacy clause (08-03).
  - `PropertiesPM.md:53` ("Every option references its group by id, so status semantics resolve by id") describes `group_id` as read, which nothing does (08-04).
  - `PropertiesPM.md:27, 128-134`: "restore cache" and "value caches" (08-06).
  - I-006 (`IssuesPM.md:213`) says "Option lists key on `value`", but options now key on `key` (`properties.ts:122-130`). It also leaves out `property_cache` (`:183-189`).
  - `mergePolicy.test.ts:120-136` uses a `name` field (08-01).
  - `ContextPM.md` has 91 lines, not the ~200 the brief cites. The merge-loss notes are in `IssuesPM.md` I-006 and `NexusSyncPM.md:55, 63`.
- **Better:** Rewrite each in the same pass as its finding.
- **Behavior:** n/a
- **Estimate:** docs only · read

###### B-08-01 · The registry's per-field merge depth has only a respelling rationale on record; its live reason is a rename racing another field's edit — VERIFIED
- **Lens:** Describers Get Swept · Sync-Ready Shapes · Behavior Is a Decision
- **Now:** `686ac2a08` changed `mergeDepthFor('properties')` from `{defs: 1}` to `{defs: 2}` (its diff of `mergePolicy.ts`), and the only stated reason anywhere is the respelling: the test "keeps one side's type respelling and the other side's rename of the same def" (`mergePolicy.test.ts:120-128`) and `NexusSyncPM.md:63`'s example. 08-03 deletes both, which would leave the per-field depth reading as residue of the migration. It isn't: under `{defs: 1}` a Key rename on one device racing any other edit of that def on the other would keep the newer def whole, so a losing rename leaves pages swept to the new key under a registry still holding the old key.
- **Better:** In 08-03's pass, keep `{defs: 2}`, re-base the test on a rename racing an option or icon edit, and rewrite `NexusSyncPM.md:63`'s example to that case. 08-01's absent-side rule is a Sync rebuild input [Intended as H-1].
- **Behavior:** Preserving.
- **Estimate:** docs and one test · read (history), inferred (rename-loss scenario)

##### Behavior Ledger

| ID | Behavior | Where | Origin | Classification | Status |
|---|---|---|---|---|---|
| L1 | A delete raced by a newer edit leaves an invisible fragment def in `properties.json` forever | `jsonMerge.ts:36-42` with `mergePolicy.ts:33`, pinned by `mergePolicy.test.ts:130-136` | `686ac2a08` (09-25), which changed `defs: 1` → `defs: 2` for the legacy respelling and carried over the metadata-file rule (confirmed in its diff) | **Accident:** the test title states the mechanism and never weighs whether the resulting def is usable. A Sync rebuild input [Intended as H-1] | VERIFIED |
| L2 | Every open reads `properties.json` under its lock and rewrites it only when a legacy type spelling is present | `handlers.ts:45`, `migrateConfig.ts:57-74` | F-221 Phase 3 (`686ac2a08`) | **Agent's choice**, with nothing left to rewrite in any live Nexus | CORRECTED (no write happens when nothing needs respelling) |
| L3 | A definition added from outside (sync or hand edit) re-walks the whole Nexus | `fileEvents.ts:491-495`; a consequence of eager resolution | — | **Agent's choice / accident:** a correctness patch over the tree having forgotten unresolved ids. Users see only lag | VERIFIED |
| L4 | A damaged `properties.json` that this session never read fails the whole open, while a damaged Contexts registry blanks its layer and is listed unreadable | `readKept` throws (`atomicWrite.ts:201-205`) inside `readNexusConfig` (`readNexus.ts:287-288`), and the open waits on the error (`Nexus/handlers.ts:74-80`); the Contexts arm is `readNexus.ts:313-322`, and `Unreadable{kind:'registry'}` (`tree.ts:111`) serves only Contexts | — | **Agent's choice, inconsistent:** the properties registry is grouped with identity and settings as "the three hand-authored files every read rests on" (`readNexus.ts:286`). A damaged property list is meant to open the Nexus with Properties marked unreadable, as Contexts do [Intended as O-6] | VERIFIED |
| L5 | Repair Properties On Open defaults to off | `personalization.ts:146` | `4c1faf1ef` (09-01; added `repairSweep.ts` and the toggle) | **Agent's choice** of default. Nathan has it on in NexusOS (`settings.json` `repairOnOpen: true`). Its cost is one reconcile write per page changed while the app was closed (Scout 04's). On by default [Intended as O-3] | VERIFIED |
| L6 | The Trash and Archive date-column styles are synced Nexus personalization, while view column styles live in sidecars | `personalization.ts:198-199`, `browser.ts:89-148` | `dc7780ca7` (09-25; touched `personalization.ts`) | **Agent's choice**; consistent enough to keep. NexusOS holds `trashColumnStyle: {time_format: 'none'}` | VERIFIED |
| L7 | A trashed property whose record has no `label` would be titled by its id rather than its key | `Bundles/rows.ts:91-96` | — | *Corrected:* unreachable from Pommora's writes. The delete records the parsed def (`deleteProperty.ts:84-88`), whose `labelled` transform always sets `label` (`properties.ts:115-120, 194`), so only a hand-built record reaches the id fallback. The finding that holds is that the row hand-decodes `label` and `type` where `propertyDefinition.safeParse` (as `restoreProperty.ts:36` does) would give both; that's a consolidation, not a behavior fix | CORRECTED |
| L8 | A hand-edited status option without `group_id` makes its whole property disappear | `properties.ts:144, 169` | `2a5936603` (06-14) | **Accident** (08-04); `group_id` leaves [Intended as D-3] | VERIFIED |
| L9 | A Remove's stashed values exist only in the Collection sidecar, and two devices removing different properties lose one stash | `mergePolicy.ts:38-39`, `removeProperty.ts:47-56` | — | **Accident** of the sidecar's default merge depth (08-06). The losing device's property also comes back assigned. The stash stays and is meant to lose nothing under sync [Intended as C-2, H-2] | VERIFIED |

##### Approaches

- **A. One home per definition — VERIFIED.** Collections hold `propertyIds`, and every schema read goes through `containerSchema`/`holderSchema`, resolved against a memoized registry map (08-02 plus 08-13).
  - **Removes:** `repointRegistryInTree`, `resolveAssignedSchema`, the walk-on-arrival branch, per-event `registryOf`, and def duplication in tree deltas.
  - **Costs:** touches about 15 consumers (nine `containerSchema` sites, three direct `.properties` readers, three holder-schema copies).
  - **Risks:** a render-path consumer that holds `.properties` by reference must switch to the memoized resolver, or it loses the reference identity `repointRegistryInTree` gave it. The memo has to key on `config.registry` identity.
- **B. One option shape on disk — INFERRED.** Select and Status share `options: {<key>: {label, color, icon, appearance, group?}}` plus `option_order: [...]`, and Status adds `status_groups: {<id>: {label, color}}` plus `group_order`.
  - **Removes:** `optionGroupsOf`/`withOptionGroups`/`SELECT_GROUP` (`properties.ts:298-315`), the nested `group_id`, and the declared-type branching in `optionsOf`. `groupOptions` (`:277-278`, the group-color fallback) survives in some form.
  - **Gains:** the shape would let `mergeDepthFor` go to `{defs: 3}` and merge per option, closing I-006's `select_options`/`status_groups` loss down to a rename racing an edit of that same option; that merge rule is a Sync rebuild input [Intended as H-2].
  - **Costs:** a one-time NexusOS rewrite (one file, 15 defs) whose reader is removed afterwards, plus wide edits in `optionModel`/`optionOps` (Scout 01/02/03 territory).
  - **Risks:** Legibility, and the Concurrency locked decision. Keying by `key` keeps the rename-is-delete-plus-add loss that 09-14's stable option id closes, and option ids are intended [Intended as D-1], so the shape is weighed against them and lands only where it removes code without adding a Sync rule.
- **C. Seam-shaped Properties folder, with generics moved out — CORRECTED** (08-07, 08-08, 08-11, 08-12). The engine stays at the root and the renderer goes to subfolders.
  - **Moves out:** `rowOrder` to UIX, `pageRow` and the pane targets to Views, the link vocabulary to Connections, and display labels out of engine files (`itemCount` and refusal text stay). `governedSweep` and the governed-root module, used by non-property modules in Contexts, Nexus, Trash, Settings and Pages, move to `Core/Nexus`, since their imports rule out `Core/Files` (02 A-01).
  - **Removes:** cross-domain imports into Properties and the guesswork about which side a file runs on.
  - **Costs:** about 25 file moves.
  - **Risks:** churn alone. It's line-neutral and best done last, in one sweep.
- **D. Frontmatter merge at landing (a Sync rebuild input) — VERIFIED.** A per-root-key YAML merge for `.md` arrivals, which needs `base.ts:57` to keep page base bytes (it keeps them only for merged JSON).
  - **Removes:** the largest property-value loss under sync.
  - **Costs:** a database that grows by every page's bytes, and a YAML-aware merger.
  - **Risks:** high, and Sync is desktop-only today. It gates Mobile sync and is recorded among the Sync rebuild inputs [Intended as H-1].

##### Cross-Domain Notes

- **04 — VERIFIED (cost inferred):** `registerHeldOptions(root)` at open (`Nexus/handlers.ts:113-114` → `optionOps.ts:112-148`) runs under `serializeSchemaOp`, the `.nexus` lock (`propertiesRegistry.ts:126-127`), while it reads every page of every Collection that assigns a Multi-Select through `readPageRecord` (cached parse aside). That's O(N) per open.
- **04 — VERIFIED:** `governedSweep`/`governedWrite` are the generic frontmatter root-key pipeline for Contexts, Pages (`setBanner`), the Trash, Settings (`exclusionScan.ts:8`) and Nexus. Their home in Properties is a boundary question (04-14).
- **01/03 — VERIFIED:** `property:setLinkConfig`, `setCheckboxColor`, `setIcon`, `setNumberFormat` and `setFileDirectory` (`bridge.ts:155-171`; `Properties/handlers.ts:182-193`) are five channels over one `defEditOp`. One `property:configure` with one narrower could replace them (01-07, 03-07).
- **01 — VERIFIED:** `TYPE_META` (`Cells/PropertyTypes.tsx:21-35`) and `PROPERTY_TYPES` (`properties.ts:34-47`) state type facts in two tables.
- **02 — VERIFIED:** `setProperty` and `restoreValue` are two encodings into one landing (`setProperty.ts:40-47`). Check whether undo needs both.
- **Pages — VERIFIED:** `HistoryReader` calls `view:loadValues` through `fetchPageValues` (`PageReaderWindow.tsx:154-164`, `Properties/pageRow.ts:52-58`) only to learn one page's `modifiedAt`. Whether it should take the stamp from `history:list` or `page:open` is the Pages domain's question. (Kept from the removed 08-10.)
- **Reconcilers — VERIFIED:** `migrateConfig.ts`'s saved-view `RENAMED` normalizations (`:17-28`) are residue NexusOS doesn't hold (outside property scope; 01-02).
- **Synthesis — VERIFIED:** no Benchmark Nexus exists, so any scale claim in the plan has to build one first.

##### Overlaps & Contradictions

###### Merged Within Reports 05–09
- **08-03 / 09-01:** the legacy type-id removal; 08-03 is the stronger statement (open-time behavior, unadmitted-not-dropped), with 09-01's `field`, whole-test, and doc items carried in.
- **08-09 / 05-04:** the labels-to-options builders; 05-04's editor-side corrections carried in.
- **08-14 (I-006 vocabulary row):** the same stale "key on `value`" sentence is a row in 09's Issues Status table; 08-14's cite `IssuesPM.md:213` is correct (Scout 09's fork placed it near `:211`). The plan rewrites it once, with 09-14's option ids [Intended as D-1].

###### Cross-Report Overlaps
- **08-01 ↔ B-08-01, 01 ledger (read-time admission):** the fragment def lands in admission; the merge-policy fix is scoped to the registry.
- **08-02 ↔ 07-12, 08-13, 03-14, 04-05 (weak):** one schema resolver; 07-12's `SettingsFrame.tsx:76` fix is a sub-step of 08-02.
- **08-03 ↔ 01-02, 07-06:** migration residue (01-02 also deletes `RENAMED`; 07-06 is a different shape).
- **08-04 ↔ 01 catalog, 06-08, 05's `optionGlyph` note.**
- **08-05 ↔ 02-09, 02-10; weak with 04-09** (registry reads vs holder reads).
- **08-06, L9, Sync Shapes ↔ 03-02, 09-14:** the stash's merge loss.
- **08-07 ↔ 01-10.**
- **08-08 ↔ 05-02, 07-09.**
- **08-11 ↔ 05-08 (`moveItem.ts`), 01-08 and 06-11 (pane targets), 04-14 (`governedSweep`'s home), 07-15 (`pageRow.ts`).**
- **08-12 ↔ 02-08, 06-12:** value-named and misnamed files.
- **08-14 ↔ 05-13, 06-15, 09-05, 09 Doc Claims.**
- **Approach B ↔ 09-14, 07 Approach C, I-006.**

###### Contradictions
- **08-04 vs 05's `optionGlyph` note:** settled for 08-04 (no reader, nesting is the one source; `properties.ts:144,149-155`, `optionModel.ts:35,49`).
- **08-11 vs 07-15 (direction of the row move):** settled for 08-11 (`Views/viewRow.ts:17-45`; 22 non-Properties importers).
- **08-11 vs 06-11 vs 01-08 (pane targets):** settled for a Views-root module beside `filterModel.ts`; 01-08's in-`filterModel.ts` variant is Reconciler A's.
- **08-06 vs 03-02 (`property_cache` merge depth):** from source, `{property_cache: 2}` merges per property only with today's `values` wrapper; per page needs depth 3 or flattening, and `mergeDepthFor` has no sidecar arm (`jsonMerge.ts:32-41`, `mergePolicy.ts:38-39`). Settled for 08-06.
- **08-07 vs 01-10 (`itemCount`):** the engine uses it (`governedSweep.ts:21,60`; `properties.ts:272-273`), so it stays. Settled for 08-07.
- **08-09 vs 01-09 (helper name):** `pickerOptions` here; `labelled` is taken.
- **Approach B vs 09-14 (option identity):** settled for 09-14's stable id [Intended as D-1]; keying by `key` leaves rename-as-delete-plus-add.
- **08-07 vs 08-08 (inside 08):** resolved by the fork; link-display labels follow 08-07's renderer placement.

##### Reconciliation Log

| ID | Status | Reason | Evidence |
|---|---|---|---|
| Inventory | CORRECTED | Channel count is 20, not 22; several line ranges re-cited | `Core/Contract/bridge.ts:131-189`; `readNexus.ts:173-192, 226-245`; `Nexus/handlers.ts:111-115` |
| Engine/Interface Split | CORRECTED | 25 engine files (the scout's own list), not 23; `valueContext.ts` is shared-pure; UIX leaves list already holds `moveItem.ts` | Re-run `engineGraph(['Core/Contract/serve.ts'])`; `valueContext.ts:1-6`; `engineGraph.test.ts:23-37` |
| Sync Shapes · `property_cache` row | CORRECTED | Depth 2 merges per property with today's shape; per page needs 3 or flattening; the `properties` list loss compounds it | `jsonMerge.ts:32-41`; `mergePolicy.ts:38-39`; `propertyCache.ts:8-14` |
| 08-01 | CORRECTED | The fix can't be an unconditional `mergeKeys` branch, since metadata shards rely on the keep-the-field rule; `{defs: 1}` is rejected for the rename-orphaning case | `jsonMerge.ts:36-42`; `mergePolicy.ts:26`; `NexusSyncPM.md:63`; `git show 686ac2a08 -- Core/Sync/Arrival/mergePolicy.ts` |
| 08-02 | CORRECTED | `stabilize` is a general mechanism, not a two-homes helper; the walk is for `'watched'` events, which sync landings are; `Actions/*` contexts need no change | `treeStabilize.ts:1-5`; `fileEvents.ts:313-316, 495`; `atomicWrite.ts:42-52`; `entityMenuActions.ts:60-64` |
| 08-03 / 09-01 | CORRECTED · MERGED | No write happens at open unless a legacy id is present, so nothing visible changes; `restoreScrub.test.ts` gets respelled, not deleted. Reconciler: 09-01 merged in (adds `field`, whole `migrateConfig.test.ts`, whole `handlers.test.ts:165-178`); a legacy def would go unadmitted, not be dropped | `migrateConfig.ts:57-74`; `atomicWrite.ts` `rmwLocked`; `restoreScrub.test.ts:287, 310` |
| 08-04 | CORRECTED | Options were nested with `group_id` from the first commit; removal needs a one-time strip because raw-preserving writes would carry a stale `group_id` through moves | `git show 2a5936603`; `optionOps.ts:59-66`; `optionModel.ts:49` |
| 08-06 | CORRECTED | Depth arithmetic: flattening isn't required for the per-property merge; `mergeDepthFor` needs a sidecar arm | `jsonMerge.ts:32-41`; `mergePolicy.ts:25-41` |
| 08-07 | CORRECTED | `itemCount` is engine-used and stays; refusal text stays in the engine; labels go to a renderer `.ts`, not beside `TYPE_META` in a `.tsx` | `governedSweep.ts:21, 60`; `properties.ts:272-273`; `Settings/frames.ts:13-14` |
| 08-08 | CORRECTED | `WebTile.tsx` doesn't import the vocabulary; `Actions/connectionMenu.ts` and `columnMenu.ts` do; labels shouldn't land in engine `linkValue.ts` | `Tiles/Surfaces/WebTile.tsx:23-25`; `Actions/connectionMenu.ts:9`; `Actions/columnMenu.ts:17` |
| 08-09 / 05-04 | CORRECTED · MERGED | Reconciler: eight label-record maps, not nine (`FormatRows` is value-as-label); 05-04 merged in | `FormatRows.tsx:8-11`; `columnStyles.ts:33-35,48-51`; `DateTimeEditor.tsx:12-16`; `linkFormatOptions.ts:5-8`; `Settings/frames.ts:173-183` |
| 08-10 | REMOVED | The five "direct" readers use single scalars (`useSetting` is the one way); `useNexusForms` exists to hand `styleFor` a stable pair and already lives beside it, with six callers. Routing scalar readers through a pair hook adds indirection and re-renders. The `HistoryReader` point moved to Cross-Domain | `Views/Host/useColumnStyles.ts:18, 77-81, 88`; `useBandHeads.ts:19`; `GroupFrame.tsx:132, 500`; `PropertyPanel.tsx:177`; `FilterFrame.tsx:235`; `NexusRows.tsx:57` |
| 08-11 | CORRECTED | No `engineGraph.test.ts` change is needed; the pane-target consumers also include PropertyPanel, GroupFrame, and FilterFrame | `engineGraph.test.ts:31`; `PropertyPanel.tsx:44`; `GroupFrame.tsx:62`; `FilterFrame.tsx:11` |
| 08-12 | CORRECTED | Counts are 25 engine and 10 renderer or renderer-only | Re-run engine graph; `git ls-files Core/Properties` |
| 08-13 | CORRECTED | Three copies, not two (`entityMenuActions.ts`) | `Interface/Menus/entityMenuActions.ts:60-64` |
| L2 | CORRECTED | Open doesn't rewrite without a legacy id | `atomicWrite.ts` `rmwLocked` |
| L7 | CORRECTED | Unreachable from Pommora's writes; reframed as a decode consolidation | `deleteProperty.ts:84-88`; `properties.ts:115-120, 194`; `restoreProperty.ts:36` |
| Approach B | INFERRED | A shape decision for Nathan under Legibility and Concurrency; keyed-by-`key` versus 09-14's stable id unresolved by reading | `properties.ts:122-155`; `IssuesPM.md:213` |
| Approach C | CORRECTED | `itemCount` and refusal text stay in the engine | `governedSweep.ts:60` |
| B-08-01 | NEW | The per-field depth's only recorded rationale is the respelling 08-03 deletes | `git show 686ac2a08 -- Core/Sync/Arrival/mergePolicy.ts`; `mergePolicy.test.ts:120-128`; `NexusSyncPM.md:63` |


---

#### Scout 09 — Tests & Describers (Reconciled)

Baseline `d0595b22d`. **Read** means I read it at that path and line. **Inferred** means I reasoned from what I read and didn't trace it to the end. `Core/Properties` holds **56** test files (14,657 lines) next to about 8.1k lines of source (*corrected from 75 test files:* `git ls-files Core/Properties | grep -cE '\.test\.tsx?$'` → 56; the line totals hold). About 53 test files outside it import Properties. I inventoried the ones that are about properties and treated the rest as incidental importers.

Reconciler note: the scout's `~/Test` grep in 09-01 (merged into 08-03) ran while `~/Test` was absent; every legacy-shape claim below was re-checked against `~/NexusOS` (read-only) and the `~/Test` rebuilt at `156264f2f`, which holds an empty registry and no property data.

##### Test Inventory

Each row says what the file pins. **B** pins behavior, **S** pins implementation shape (a literal list, a call order, DOM nesting, object identity), and **B/S** mixes both. **Status** covers the Lines and Legacy? cells, each re-read at HEAD (`wc -l`, the cited line). The Overlaps With cells are the scout's; the ones findings rest on (configReach, optionOps views block, columnStyles, OptionOrderList, pageValue) were opened, the rest were not individually re-traced.

| Test File | Lines | What It Pins | Behavior or Shape? | Overlaps With | Legacy? | Status |
|---|---|---|---|---|---|---|
| `Properties/optionOps.test.ts` | 1521 | Option add, rename, remove, clear, Value Format; owed-record guards; cascades into Spaces, caches, saved views | B | `configReach.test.ts` (views block :1112-1323), `replaySchemaCascade`, `journalWiring`, `handlers` | `:416-434` pins the legacy type spelling surviving writes | VERIFIED |
| `Properties/replaySchemaCascade.test.ts` | 713 | Open-time replay of rename, delete, and option records; idempotence; unreadable holders | B | `optionOps` (Space and views reach), `deleteProperty`, `keyHolders` (index seam) | no | VERIFIED |
| `Properties/registryProperty.test.ts` | 626 | Create (step-aside, Key Format, seeds), rename, Key Format, holders, reorder | B | `schema.test` (name refusals), `keyHolders:96` (rename refused onto a held key) | no | VERIFIED |
| `Properties/Schema/PropertyFrame.test.tsx` | 614 | Assign surface: slides, All Properties, two-region drag, ⋮ menu, format rows | B/S | `paneDrop.test` (drop resolution) | Titles tagged A-7, T5, T6, T7, A-8, D-1, A-10 (`:134,176,177,202,243,430,438,451,486`) | VERIFIED |
| `Properties/propertyValue.test.ts` | 602 | Decode by declared type, encode, no-empties, frozen world, spellings, exact options | B | `value.test` (declared type), `governedWrite` (spellings, foreign words), `pageValue` | `:245` "legacy object shape" (File) | VERIFIED |
| `Properties/Schema/OptionEditor.test.tsx` | 572 | Option menu, create draft, popup survival through renames, group heading, drag | B | `PropertyPicker.pane` (draft add), `optionMenu.test` | no | VERIFIED |
| `Properties/PropertyPanel.test.tsx` | 472 | Row visibility, Remove, pushes, Space subject, order, Add row, drag | B | `rowOrder.test` | no | VERIFIED |
| `Properties/deleteProperty.test.ts` | 430 | Global delete: scrub, snapshot, cache purge, Space reach, views reach, replay | B | `configReach:277`, `replaySchemaCascade` (delete), `keyHolders:304` | `:303` "icon" survives the old `icon` reservation; `:124` D-6 tag | VERIFIED |
| `Properties/Pickers/PropertyValueInput.test.tsx` | 411 | Number, Link, and Text single-line fields; Rename alias; commit rules | B | `ValueEditor.test` (Return/Escape/blur), `assignValue:212` (alias memory) | no | VERIFIED |
| `Properties/handlers.test.ts` | 410 | Channel replies, warnings and replay, owed-record refusals, unparseable sidecars | B | `optionOps:707`, `journalWiring:306`, `propertyJournal:47` | no | VERIFIED |
| `Properties/removeProperty.test.ts` | 407 | Remove: strip and cache, ID-less holders, archive, views reach, refill on re-assign | B | `assignment.test:84` (refill), `configReach:428` | Titles tagged C-3, C-6, E-6, B-6, breaker H-1 (`:93,178,217,261,361`) | VERIFIED |
| `Properties/Pickers/PropertyPicker.pane.test.tsx` | 382 | Pane routing per type, chooser, New Option draft, Status groups | B | `OptionEditor` (draft) | B28 tags (`:145,150`) | VERIFIED |
| `Properties/properties.test.ts` | 375 | Def decoding, loose keys, PROPERTY_TYPES facts, optionsOf, seeds | B/S | `optionOps:416` | `:44-47` legacy spellings | VERIFIED |
| `Properties/journalWiring.test.ts` | 372 | Each writer stages and clears its journal record; create-side consumer; slot protection | B/S (call order) | `propertyJournal`, `handlers:301` | no | VERIFIED |
| `Properties/Pickers/ValueEditor.test.tsx` | 354 | One-line editor keys, seat, alias slot, alias memory | B | `PropertyValueInput`, `TextPane` | no | VERIFIED |
| `Properties/Cells/Cell.test.tsx` | 339 | Status, checkbox, and format looks; file chips; chip list drag; text links | B | `CheckboxEditor` (color var) | no | VERIFIED |
| `Properties/value.test.ts` | 339 | declaredType, resolveFieldValue, memoization, type never inferred | B/S (memo identity) | `propertyValue:59-147` | `:81` title says "snake_case PropertyType" (stale) | VERIFIED |
| `Properties/propertiesRegistry.test.ts` | 336 | Read strictness, junk tolerance, fold-alike first-wins, serialization, byte preservation | B | `registryProperty:56`, `optionOps:207-245` | breaker M-2/L-1 (`:148`), B-3 (`:204`), C-3 (`:123`) tags | VERIFIED |
| `Properties/formatValue.test.ts` | 332 | Date, number, span formatting; readDate; readNumber; spelledNumber | B | `governedWrite:232` (number spelling) | no | VERIFIED |
| `Properties/Pickers/TextPane.test.tsx` | 314 | TextPane keys, saves on every exit, outside change, headings | B | `ValueEditor` | no | VERIFIED |
| `Properties/keyHolders.test.ts` | 312 | governedReach, confirmedKeyHolders, keyedHolders, exclusion, mtime | B | `renameSweep`, `deleteProperty:150`, `removeProperty` | "Requirement 9" tag (`:270`) | VERIFIED |
| `Properties/schema.test.ts` | 295 | validateName, validateDefinition, option uniqueness, linkKeysOf | B | `registryProperty:250-271` | no | VERIFIED |
| `Properties/assignValue.test.ts` | 294 | Optimistic patch, revert via held raw, refused writes, alias memory | B | `valueOverride.test`, `restoreValue.test` | no | VERIFIED |
| `Properties/governedWrite.test.ts` | 277 | setGovernedRootKey: foreign keys, clears, precedence, spellings | B | `propertyValue:430-490`, `setSpaceProperty`, `governedWorldWrite` | `:70` legacy `modified_at` kept as foreign (interop-fine) | VERIFIED |
| `Properties/paneDrop.test.ts` | 200 | Drop resolution for the schema and visibility panes; nexus reorder index | B | `PropertyFrame:243-412` | C-1..C-5 (`:63-82`), breaker M-1 (`:180`) tags | VERIFIED |
| `Properties/repairSweep.test.ts` | 203 | On-open repair over re-read pages; never removes; toggle; cold index | B | `governedWrite:89-155` (reconcile rules) | no | VERIFIED |
| `Properties/Pickers/filePick.test.ts` | 202 | File value edit helpers, dialog start folder, file value menu | B | `valueClick:32` | no | VERIFIED |
| `Properties/restoreValue.test.ts` | 193 | `describe.each`/`it.each` matrix (`:174,178`): set, then restore the raw held value, page and Space | B | `assignValue:72` | no | VERIFIED |
| `Properties/Cells/TextCell.test.tsx` | 185 | Text value links, § runs, menus, heading redraw | B | `Cell.test:267` | no | VERIFIED |
| `Properties/governedWorldWrite.test.ts` | 181 | Whole-file reconcile on write; unheld Space; managed-key defs | B | `governedWrite:89` | no | VERIFIED |
| `Properties/setSpaceProperty.test.ts` | 177 | Space value writes, reconcile, exact key, 0 | B | `governedWrite`, `restoreValue` | no | VERIFIED |
| `Properties/assignment.test.ts` | 168 | Assign idempotence, reorder, race, refill from cache | B | `removeProperty:261`, `Trash/restoreProperty` | breaker H-2 tag (`:49`) | VERIFIED |
| `Properties/optionModel.test.ts` | 153 | Pure option edits; group round-trip | B | `optionOps:277-436` | no | VERIFIED |
| `Properties/pageValue.test.ts` | 154 | valueEditRewrite, editList, namesValue, stripList | B | `optionOps` cascades, `Files/rootValues.test` | `:20`, `:58` "status" tests run as Select | VERIFIED |
| `Properties/governedSweep.test.ts` | 143 | Unparseable sidecar refused; dry run; sweepCount excludes Archive | B | `keyHolders` | no | VERIFIED |
| `Properties/Cells/LinkCell.test.tsx` | 148 | Link value as connection vs. address look | B | `TextCell` | no | VERIFIED |
| `Properties/renameSweep.test.ts` | 132 | Key move in place, idempotent, exact key, Space sidecar | B | `keyHolders:261`, `registryProperty:321` | no | VERIFIED |
| `Properties/keyFormat.test.ts` | 115 | Ten formats, word splitting, Unicode | B | `registryProperty:90` | no | VERIFIED |
| `Properties/Schema/PropertyFrame.dateTime.test.tsx` | 108 | Date format writes the active view's column_styles | B | `DateTimeEditor.test` | A-3 tag (`:77`) | VERIFIED |
| `Properties/propertyJournal.test.ts` | 102 | Record round-trip; non-displacement; validator; clear | B | `journalWiring:306-345` | no | VERIFIED |
| `Properties/valueOverride.test.ts` | 101 | Optimistic override retire and settle | B | `assignValue` | no | VERIFIED |
| `Properties/columnStyles.test.ts` | 101 | Look vocabulary; defaults; codec | B/S | itself (`:34`, `:39` duplicate `:78`) | `:34` and `:39` pin dropped legacy looks; NexusOS saved views hold none of them (only `bar`, `checkbox`, `compact`, `standard`) | VERIFIED |
| `Properties/Pickers/valueClick.test.ts` | 100 | Click and menu intent per type | B | `cellMenu.test` | no | VERIFIED |
| `Properties/Schema/CheckboxEditor.test.tsx` | 93 | Color and Style rows | B | `Cell.test:144-176` | no | VERIFIED |
| `Properties/cascadeRace.test.ts` | 85 | Rename cascade queues behind a cell-write lock | B | — | "F1" tag (`:58`) | VERIFIED |
| `Properties/governedWorld.test.ts` | 84 | assignedDefs, pageWorldOf | B | — | no | VERIFIED |
| `Properties/Schema/DateTimeEditor.test.tsx` | 77 | Day row gating; patches | B | `columnMenu:87` | no | VERIFIED |
| `Properties/Schema/NumberEditor.test.tsx` | 71 | Row gating; Value row parse | B | — | no | VERIFIED |
| `Properties/Cells/OptionChip.test.tsx` | 48 | Glyph fallback | B | — | no | VERIFIED |
| `Properties/Pickers/massAssign.test.ts` | 46 | Mass pick commits | B | `propertyMenuActions:200-212` | no | VERIFIED |
| `Properties/Cells/columnLabel.test.ts` | 43 | Column label resolution | B | — | no | VERIFIED |
| `Properties/valueContext.test.ts` | 42 | buildValueContext | B | — | no | VERIFIED |
| `Properties/formatBucketLabel.test.ts` | 33 | Bucket labels | B | could sit in `formatValue.test` (same module, `formatValue.ts:155`) | no | VERIFIED |
| `Properties/pageRow.test.ts` | 32 | spaceRowOf | B | — | no | VERIFIED |
| `Properties/rowOrder.test.ts` | 20 | resolveRowOrder | B | — | no | VERIFIED |
| `Properties/Cells/PropertyTypes.test.ts` | 18 | `CREATABLE_TYPES` equals a literal list, which is also the New Property picker's order | B/S (*corrected from S:* the literal list is the only pin of the type order the user sees) | `properties.test:209` (origins only, not order) | no | CORRECTED |
| `Trash/restoreProperty.test.ts` | 468 | Property restore from the Trash: refill, step-aside, Link parking, archive | B | `removeProperty:261-407`, `assignment:84` | no | VERIFIED |
| `Nexus/configReach.test.ts` | 714 | The configuration pass: option rename, removal, and clear across views, tiles, Matrix; skips; scoping | B | `optionOps:1112`, `deleteProperty:356`, `removeProperty:217`, `replaySchemaCascade:448` | no | VERIFIED |
| `Interface/Menus/propertyMenuActions.test.ts` | 287 | Spaces ▸ / Properties ▸ branches and picks | B | `massAssign`, `PropertyPicker.tsx:391` toggle rule | no | VERIFIED |
| `Actions/columnMenu.test.ts` | 182 | Style items per type | B | `columnStyles` | `:39` title says "file Filename/Full Path" while `:49` asserts `[]` | VERIFIED |
| `Actions/cellMenu.test.ts` | 273 | Cell menu per type | B | `valueClick` | `:100` "(its look is per-property)" contradicts `columnMenu:44-48` | VERIFIED |
| `Actions/optionMenu.test.ts` | 29 | Option menu rows | B | `OptionEditor:131` | no | VERIFIED |
| `Views/Settings/OptionOrderList.test.tsx` | 133 | Group-order list | B | `properties.test:267` (stale `select_options`) | no | VERIFIED |
| `Files/rootValues.test.ts` | 54 | joinValues, editHeldList, rekeyHeld | B | `pageValue.test` (editList) | no | VERIFIED |
| `Nexus/migrateConfig.test.ts` | 74 | normalizePropertyTypes respelling | B | `properties.test:44`, `optionOps:416` | **wholly legacy** (imports only `normalizePropertyTypes`, `:7`) | VERIFIED |
| `Nexus/handlers.test.ts:165-178` | — | *Corrected:* a dedicated test, "respells a legacy property type in the registry it opens", pinning the open-time respell end to end | B | `migrateConfig.test` | **wholly legacy** | CORRECTED |
| `Trash/restoreScrub.test.ts:287,310` | — | *Added:* `type: 'multi_select'` as incidental fixture data that only decodes through the legacy preprocess | — | — | legacy spelling in a fixture | CORRECTED |
| `Sync/Arrival/mergePolicy.test.ts:122-124` | — | *Added:* `multi_select` vs `multiSelect` as the two sides of a per-field JSON merge; the merge never decodes the type | — | — | legacy spelling as the example | CORRECTED |

##### Doc Claims

| Doc:Line | Claim | Holds at HEAD? | Overview-Level or Implementation Note? | Status |
|---|---|---|---|---|
| PropertiesPM:8 | Earlier spellings (`multi_select`, `url`, `datetime`) still read and are rewritten at open | Holds (`properties.ts:79-88`, `migrateConfig.ts:57-74`, `handlers.ts:45`). Removable: NexusOS's registry holds only current ids, and neither `.nexus` nor `.trash` holds a legacy id (read) | Implementation (migration residue) | VERIFIED |
| PropertiesPM:8 | "A definition names its type by the displayed name in camelCase — … `dateTime`, `createdTime`, `lastEditedTime`" | **False** for three ids. `PropertyTypes.tsx:26,33-34` displays them as "Date", "Creation Time", and "Last Modified" (`columnLabel.ts:4-8`); the doc's own table calls them Date, Creation Time, and Last Modified | Overview | VERIFIED |
| PropertiesPM:15 vs :68 | The table row says "Date" and the section heading says "Date & Time" | Vocabulary split: one type, two names | Overview | VERIFIED |
| PropertiesPM:27 | Built-ins use `_title`, `_created_at`, `_modified_at`, `_location` | Holds (`properties.ts:243-248`) | Overview | VERIFIED |
| PropertiesPM:27 | Label and key are trimmed and NFC-normalized once at write | Holds for both. *Corrected:* the label path is traced: create and rename pass the label through `exactTitle` (`registryProperty.ts:81,214`), which trims and NFC-normalizes (`Paths/caseFold.ts:16-17`); the key through `formatKey` (`keyFormat.ts:73-74`) | Implementation | CORRECTED |
| PropertiesPM:29 | Checkbox reads `true/false`, `yes/no`, `on/off`, `y/n` in any casing | Holds (`propertyValue.ts:83-88`) | Overview | VERIFIED |
| PropertiesPM:66 | "a number with no bar to fill offers no Format choice" | Holds, but the vocabulary is mixed. The doc calls it a "look", and the UI calls it **Style** (`NumberEditor.test:41-46`), or **Format** only when it's a branch of one row (`columnMenu.test:171-175`, a deliberate `styleBranch` rule) | Overview | VERIFIED |
| PropertiesPM:74 | Multi-Select registration triggers: a file change or arrival in reach, an assign, the registry gaining a key, a Key/Value Format change, and every file at open | Holds. `registerHeldOptions` is called from `settle.ts:163` and `handlers.ts:114`, and `owed.options` is fed by `fileEvents.ts:434,440,536-537` (`oweNamedKeys`) | **Implementation**: a list of trigger points | VERIFIED |
| PropertiesPM:76 | Clear asks first past one Item; Remove always asks | Holds (`confirmations.ts:185`). *Corrected:* `asksPastOne` is passed by `askClearOption` (`:214`) **and** `askFormatChange` (`:227`), which `5e3aee180` made share one threshold | Overview | CORRECTED |
| ConfigurationPM:115 | A property's delete "and an option's Clear and Remove" **ask regardless** of Confirm Before Deletion | **False for Clear**: it asks only past one Item (`confirmations.ts:185,214`). Stale since `5e3aee180` (10-19), which updated PropertiesPM but not ConfigurationPM | Overview | VERIFIED |
| PropertiesPM:94 | Basename index lives in `Core/Assets/assetMap.ts` | Holds | Implementation (path) | VERIFIED |
| PropertiesPM:117/:119 | Two adjacent paragraphs both introduce the Properties panel with the same file path | Holds: `:117`'s second-to-last sentence describes `Core/Properties/PropertyPanel.tsx`, which `:119` introduces again | Overview, duplicated | VERIFIED |
| PropertiesPM:121 | "**The Properties Menu.**" | The label ends in a period, which breaks the `**Label:**` rule every sibling follows | Formatting | VERIFIED |
| PropertiesPM:123 | The Schema Mutations paragraph: "every operation that writes both the registry and pages states its intent in a journal first" | *Corrected from "Holds (inferred)":* **false while another record holds the slot**. `journalSlot.write` returns `false` for a different held record (`journalSlot.ts:34-36`), and `rekeyProperty` ignores that return and commits unjournaled (`registryProperty.ts:183`) | **Implementation** | CORRECTED |
| PropertiesPM:125-134 | Mutation table (Remove caches before strip, delete record first, refusals while a record is owed) | Holds per tests (`removeProperty:93-216`, `deleteProperty:67`, `optionOps:707`, `:1425`) | **Implementation**: each row is a mechanism spec | VERIFIED |
| PropertiesPM:136 | *Added:* Remove and the global delete each "re-run cleanly after a partial run" | **False for Remove**: a second Remove finds the property unassigned and returns `NOTHING_TO_REMOVE` (`removeProperty.ts:33`), so skipped pages keep the key | Overview | CORRECTED |
| PropertiesPM:138 | Repairs: `reconcileGovernedRoot` in `Core/Contexts/contextResolve.ts`; the on-open sweep sits behind Repair Properties On Open | Holds (`contextResolve.ts:96`, `repairSweep.ts:20`, `frames.ts:239-240`) | **Implementation** | VERIFIED |
| PropertiesPM:140 | Reserved names are `ID`, `banner`, `heading_icon_hidden` in any casing, plus `constructor`/`toString` exactly | Holds (`schema.ts:18-30`, `identityMark.ts:11`, `spaceSidecar.ts:16-23`). The doc leaves out `$`-prefixed Space keys (`$icon`, `$color`, `$order`, `spaceSidecar.ts:11-13`), which the `$` rule already covers | **Implementation** | VERIFIED |
| PropertiesPM:140 | "two options whose labels or keys fold alike read as the first, and the second leaves the file on that property's next option edit" | Holds (`propertiesRegistry.test:71`, `optionOps.test:224`) | Implementation (a repair-on-write rule) | VERIFIED |
| PropertiesPM:149 | Pending: "Calendar Picker — range values, keyboard stepping on the time parts" | *Corrected:* **stale in part.** Spans ship (`:70` describes End Date; `formatValue.test:126-176`), but keyboard stepping is still absent (no arrow-key handling anywhere in `UIX/Pickers`), so that half stays Pending | — | CORRECTED |
| PropertiesPM:150 | Pending: "Per-view link styling … a prospect" | **Stale in part.** A view's column already overrides the link Format (`:80`; `columnStyles.ts:15-18` puts `LINK_DISPLAYS` in `COLUMN_LOOKS`; `columnMenu.test:44-48`). Only Underline and Color are still property-level | — | VERIFIED |
| ContextsPM:25 | A Space takes a value for any registry property through the same operation a page's does | Holds (`setProperty.ts:38-83`, which shares one `ValueRequest`) | Overview | VERIFIED |
| CollectionsPM:14 | `property_cache` appears while a removed property's values are held | Holds (`propertyCache.ts:1`) | Implementation | VERIFIED |
| IssuesPM I-036 | "two replayers at two points of the open (`Core/Nexus/handlers.ts:82`, `:102`)" | Substance holds. *Corrected:* the lines are now `:86` (`replayPendingRename`) and `:111` (`replaySchemaCascade`) | — | CORRECTED |
| IssuesPM I-006 | "Option lists key on `value`, which a rename changes" | **Stale vocabulary.** Options carry `key` and `label` (`properties.ts:122-130`), not `value`. The conclusion stands: no stable id, so they merge whole | — | VERIFIED |
| `.claude/Guidelines/*` | Nothing in Guidelines describes properties (three files hit "property" only in other senses) | n/a (`Development-Environment.md:38`, `Web-Guests.md:7`, `Editor-Internals.md:44`) | — | VERIFIED |
| `.claude/scripts/README.md` | Describes the three property drives | The three drives exist (`Option Picker Drive`, `Text Property Drive`, `Metadata Drive`; README `:10,18,29`), and `Metadata Drive/MATRIX.md` is 203 lines. The scout's "every channel the drives call resolves in `bridge.ts`" wasn't re-traced; a channel-by-channel grep of the three `live-drive.mjs` files against `bridge.ts` settles it | Overview | INFERRED |

##### Issues Status

| Issue | Still Holds? | Proposed Solution Fits the Principles? | Notes | Status |
|---|---|---|---|---|
| I-006 | Yes for `select_options`/`status_groups` merging as one field. *Corrected:* re-traced: `mergeDepthFor` gives `properties.json` `{ defs: 2 }` (`Sync/Arrival/mergePolicy.ts:37-38`), so each option list is one field under its definition; `NexusSyncPM.md:63` says the same | Partly. Item merge by `id` is One Way. The option-list exclusion is a symptom of options having no stable id | The vocabulary is stale (see Doc Claims). A stable option id is the origin fix and is intended [Intended as D-1]; merging option lists per item is a Sync rebuild input [Intended as H-2] | CORRECTED |
| I-032 | Yes. *Corrected:* the issue's "seventeen property and schema channels" is now eighteen writing channels (four `schema:*`, fourteen `property:*` writes, `bridge.ts:131-185`) plus the `property:holders` read (`:186`); `property:setValueFormat` (MetadataV3 7B-1, 10-18) landed after the issue's 10-16 update. `setProperty` and `restoreValue` ride `mutate` (`mutateRequest.ts:90,92`) | Yes. Folding the five `defEditOp` channels into one op is a Properties-local slice | The property slice can land inside this deepclean without waiting for the whole fold; the issue's count gets rewritten with it | CORRECTED |
| I-035 | Not re-verified (Contexts settle) | Yes | Not Properties-owned; listed because tags are values. Reading I-035's cited `applySpace`/`renameSpaceOp` settles it | INFERRED |
| I-036 | Yes: `propertyJournal.ts` and `contextJournal.ts` share `journalSlot.ts`; two replayers at `handlers.ts:86` and `:111` | Yes, and it's the origin of a large share of the property test corpus (see 09-07, 09-10) | The line citations are stale. Unifying collapses about four test files' owed-record coverage into one | CORRECTED |
| I-039 | Yes: `undoSweep` returns on `now === null` (`Properties/governedSweep.ts:156`) | Yes | `undoSweep` (`governedSweep.ts:151`) lives in Properties, but its only caller is `Contexts/contextCascade.ts:179`. That's an instance of I-042 | VERIFIED |
| I-042 | Yes: `governedSweep.ts`, `governedWrite.ts`, `journalSlot.ts`, and `keyHolders.ts` are still in `Core/Properties` | Part (2) fits Clearer Boundaries only for `journalSlot`; `governedSweep`/`governedWrite`'s imports rule out `Core/Files` (02 A-01). Part (1) is Nathan's call | Moving them relocates about six test files (`governedSweep`, `governedWrite`, `governedWorld*`, `keyHolders`, `propertyJournal`) | VERIFIED |
| I-063 | Yes: `assignValue.ts:71` sends `restoreValue`, `setProperty.ts:44-45` lands `req.held` raw, and `assignment.ts:60` uses `isBlankRaw` | The Deferred question ("whether the file's raw value should be what every write and revert is built from") **is this deepclean's question**, answered by undo putting back what the file held [Intended as E-1] | Re-scope it here. Two value ops (`setProperty` encodes, `restoreValue` lands raw) over one `requestedValue` switch (`setProperty.ts:40-47`) is the visible seam | VERIFIED |
| I-064 | Yes: `Schema/FormatRows.tsx` carries no hint (no `hint`/`caption` in the file) | Yes (one rule for every pane) | UIX-owned; Properties rows are the waiting consumer | VERIFIED |
| I-033 / I-068 / I-072 | Trash Link-value parking; not re-verified | n/a | Touch Link values only through the Trash; Properties-adjacent. Reading their footnoted `Bundles/` and `Trash/holdings.ts` sites settles it | INFERRED |

##### Findings

###### 09-02 · `Core/Testing/propertyWrites.ts` is a second value-write path that exists only for tests — CORRECTED
- **Lens:** One Write Path, Zero Production Code For Tests
- **Now:** `writePageValue` and `writeSpaceValue` (`Core/Testing/propertyWrites.ts:6-23`) encode with `valueToWrite`, then call `landPageValue` and `landSpaceValue` directly. They skip `mutableTarget`, the page lock, and the registry read; `writePageValue` also skips `pageWorldOf` and passes **no world**, so `setGovernedRootKey` runs without the reconcile the production page write always runs (`setProperty.ts:68-82`). (`landSpaceValue` builds its own world, `setProperty.ts:32`, so the Space seed does reconcile.) `landPageValue` and `landSpaceValue` are exported from `setProperty.ts:15,26`; *corrected:* their outside readers are this fixture **and** `Core/Files/writePathRace.test.ts:7,82`, which pins `landPageValue`'s lock-free contract. *Corrected counts:* 9 test files use the fixture with 54 calls: `Trash/restoreProperty` ×19, `optionOps` ×8, `Nexus/page` ×8, `removeProperty` ×7, `deleteProperty` ×6, `handlers` ×3, and `assignment`, `cascadeRace`, `registryProperty` ×1 each. The tests that seed values this way therefore seed through a write the app never makes.
- **Better:** Pick one, and Nathan doesn't need to decide this. (a) Route seeding through `settledMutate(root, { op: 'setProperty', path, propertyId, value }, deps)`, the shared fixture that already runs a mutation as the host does (`Core/Testing/settledMutate.ts:13`). Then drop `propertyWrites.ts`. (b) Seed raw YAML or JSON through the Files layer (`putJson` and `seedSpaceSidecar` already exist in `Core/Testing/hostFs.ts:22-36`), since a seed is file state and not a write under test. Either way, the `land*` exports leave only once `writePathRace.test.ts:75-82` either pins the lock rule through `setPagePropertyOp` or leaves with the export. Option (a) also makes every seeded value pass the reconcile, which could change what some legacy-shape tests start from, and it costs a tree read and settle per seed. That makes it a test-correctness gain.
- **Behavior:** Preserving (tests only).
- **Estimate:** −23 fixture, −2 export keywords, test call sites roughly ±0 · read

###### 09-03 · Configuration reach is pinned once in its unit and again in every caller — CORRECTED
- **Lens:** Describers Get Swept (duplicate coverage), One Way
- **Now:** The configuration pass is tested on its own in `Core/Nexus/configReach.test.ts`: `:157` (option rename across Collection, Set, tile, and Matrix), `:253` (option removal), `:277` (property clear), and `:427` (scoped under one Collection). Each caller then re-seeds the same surfaces through `seedConfigSurfaces` and re-asserts the same fields. That happens in `optionOps.test.ts:1112-1323` (*corrected:* about 210 lines; `:1325-1364` is the Value Format block's `tones()` helper), where "a rename reaches the Collection, the Set, the tile, and the Matrix" at `:1142` mirrors `configReach:158`; `deleteProperty.test.ts:356-411` (`:394` mirrors `configReach:278`); `removeProperty.test.ts:217-259` (`:230` mirrors `configReach:428`); and `replaySchemaCascade.test.ts:448-579`.
- **Better:** Let `configReach.test.ts` own every field-level expectation. In each caller, keep one test that pins the decision it makes: that it invokes the pass with the right scope, label, and kind, plus whatever is unique to it. *Corrected:* more of each block is unique than the scout counted: `optionOps:1172-1222` (a page skip holds the views and the journal), `:1224` (a rename onto its own key), `:1240`, `:1258`, `:1274` (files by key, views by label), `:1294`; `deleteProperty:412` (a failed registry write keeps its record); `removeProperty:230`'s single own-sidecar write; and `replaySchemaCascade:467,493,530` (replay idempotence and label-less records). Drop only the per-surface re-assertions.
- **Behavior:** Preserving.
- **Estimate:** *corrected:* tests about −100 to −150 (the scout's −300 counted whole block spans that are mostly unique decisions) · read (the overlap); inferred (the per-caller size)

###### 09-04 · Each file hand-rolls its own Nexus seed and its own definitions — CORRECTED
- **Lens:** Look Outward, Less Stuff
- **Now:** *Corrected counts:* 35 test files (72 lines) name `.nexus/nexus.json`, most writing it by hand, and 9 use the exact `JSON.stringify({ id: 'nx', createdAt: 'x' })`. In Properties alone that's `governedWorld:22`, `governedWorldWrite:31`, `journalWiring:48`, `keyHolders:52`, `repairSweep:39`, `replaySchemaCascade:42`, `restoreValue:36`, and `setSpaceProperty:99`. `Core/Testing/hostFs.ts` provides `tempRoot`, `putJson`, and `seedSpaceSidecar`, but nothing that seeds a Nexus. Separately, 25 test files inline a `status_groups: [` literal while `viewHarness.tsx:58` already exports `STATUS_DEF`, and *added:* `Core/Testing/fixtures/registry.json` already holds a shared Status definition (`prop_status`), read by `Views/Pipeline/columns.test.ts:3` and `resolveView.test.ts:4`. Files also wrap `createProperty` in their own helpers (`restoreValue.test.ts:26` `property`, `deleteProperty.test.ts:238` `mkProperty`).
- **Better:** Add one `seedNexus(root)` to `hostFs.ts` (identity file, contexts registry). For definitions, build on what's there instead of adding a third source: one shared definitions module (or `fixtures/registry.json` itself) holding the Status, a Select, a Multi-Select, and a `createProperty`-and-throw helper, with `STATUS_DEF` and the JSON fixture both reading from it. Then sweep the call sites. `STATUS_DEF` should move out of `viewHarness.tsx`, which is a React mount harness, so host-side tests don't import a `.tsx` view harness to get a definition.
- **Behavior:** Preserving.
- **Estimate:** tests about −80 (+25 fixture) · read (counts); per-file savings inferred

###### 09-05 · PropertiesPM mixes overview description with mechanism specs, and seven claims are wrong or stale — CORRECTED
- **Lens:** Describers Get Swept, the Documentation rule (overview-level, encyclopedic-neutral)
- **Now:** *§Shared Mechanisms* reads as implementation notes throughout. The Schema Mutations paragraph and table (`:123-136`) list lock, journal, cache-before-strip ordering, and per-op refusal rules. Repairs (`:138`) names `reconcileGovernedRoot` and its file. Validation (`:140`) lists reserved words and the fold-alike repair-on-write. `:74` lists the trigger points of Multi-Select registration. Wrong or stale: `:8` (the camelCase-of-displayed-name claim, false for three ids), `:149` (half shipped: range values ship, keyboard stepping doesn't) and `:150` (Pending entries that have shipped), ConfigurationPM:115 (Clear "asks regardless", stale since `5e3aee180`), the Properties panel defined twice (`:117` and `:119`), and *added:* `:123` ("states its intent in a journal first", false while another record holds the slot, `registryProperty.ts:183`) and `:136` ("re-runs cleanly after a partial run", false for Remove, `removeProperty.ts:33`). Smaller problems: "Date" vs "Date & Time", "look" vs "Style" vs "Format", and the `**The Properties Menu.**` label.
- **Better:** Rewrite *§Shared Mechanisms* at overview level: what each mutation does to existing values, in one line each, with refusals named as user-visible outcomes and no lock or journal choreography. The ordering and journal guarantees go to the code. Correct or remove the stale claims in the same pass (`:123` and `:136` are rewritten with 03-01/03-03's decisions, since what holds depends on them). Settle on one name for the Date type and one for the per-view look across PropertiesPM, ViewTypesPM, and the tests. *Corrected:* the UI's "Format" for Link and a bar-capable Number is a deliberate `styleBranch` rule (`columnMenu.test:171-175`), so "UI copy says Style" holds only outside those two.
- **Behavior:** Preserving for docs. Settings that apply only to the current view share one word [Intended as I-1], so the per-view look's name is unified in UI copy too, a visible copy change that lands with 05-02.
- **Estimate:** doc about −40 lines · read

###### 09-06 · Test titles carry plan-round tags and four stale claims — CORRECTED
- **Lens:** One Vocabulary, Less to Understand, Fix the Origin
- **Now:** *Corrected count:* about 31 test or describe titles in `Core/Properties` (29 matched lines plus the two `B28` titles) cite plan or review ids that a reader can't resolve: `A-3`, `A-4` (*Reconciler B:* `PropertyFrame.test.tsx:177`, missed), `A-7`..`A-10`, `B-1`, `B-3`, `B-6`, `B28`, `C-1`..`C-6`, `D-1`, `D-6`, `E-5`, `E-6`, `T5`..`T7`, `F1`, `Requirement 9`, and **`breaker H-1`, `H-2`, `M-1`, `M-2`, `L-1`** (`removeProperty:361`, `assignment:49`, `paneDrop:180`, `propertiesRegistry:148`). The `breaker` tags mark adversarial-review fixes, which makes them prime *Fix the Origin* leads for the code scouts. The stale ones: `value.test.ts:81` "(snake_case PropertyType)", stale since `31b2e8481`; `Actions/columnMenu.test.ts:39` "file Filename/Full Path" while `:49` asserts `[]`; `Actions/cellMenu.test.ts:100` "(its look is per-property)" while a column overrides it (`columnMenu.test:44-48`); and `pageValue.test.ts:20,58` (see 09-08).
- **Better:** Strip every tag from titles, and rewrite each stale title to say what it asserts. Hand the `breaker` list to the reconcilers, so each guard those tests pin gets traced to the state that produces it.
- **Behavior:** Preserving.
- **Estimate:** ±0 lines · read

###### 09-07 · The exact-key rule is pinned 17 times across 12 files, because each layer decides it for itself — CORRECTED
- **Lens:** One Way, Type Facts Once, I-036
- **Now:** "The exact key; another casing is foreign" is asserted in `renameSweep:82,90,98`, `keyHolders:155,219`, `governedWrite:217,270`, `repairSweep:182,190`, `deleteProperty:278`, `removeProperty:117`, `optionOps:530`, `propertyValue:431`, `value:128`, `PropertyPanel:146`, `setSpaceProperty:165`, and `assignment:113` (*corrected count:* 17 pins in 12 files; `repairSweep:190` pins a Context key's spelling, a sibling rule). "Reaches a Space sidecar" and "reaches saved views" each recur in about five files. "Never re-dates a page" recurs in four (`renameSweep:67`, `keyHolders:287`, `removeProperty:262`, `governedWrite:37`).
- **Better:** Don't edit these alone. *Corrected:* only the sweep-side pins are the test-side cost of I-036's nine enumerate-lock-read-decide-write loops (`renameSweep` ×3, `keyHolders` ×2, `repairSweep` ×2, `deleteProperty`, `removeProperty`, `optionOps`: 10 pins). Under one sweep loop, the rule gets pinned once at the shared walk (exact key, Space reach, mtime), and each op's tests pin only its own decision. The write-path pins (`governedWrite` ×2, `propertyValue:431`, `setSpaceProperty:165`, `assignment:113`) collapse with 02's one write path, not I-036. The read-side pins (`value.test:128`, `PropertyPanel:146`) pin a different layer (decode and row visibility) and each stays.
- **Behavior:** Preserving.
- **Estimate:** *corrected:* tests about −100 once I-036 and the write-path fold land · inferred

###### 09-08 · `pageValue.test.ts`'s "status" tests run as Select and duplicate their neighbors — VERIFIED
- **Lens:** A Test Pins One Behavior
- **Now:** `defOf` (`Core/Properties/pageValue.test.ts:5`) builds only `'multiSelect'` or `'select'`. "status: strips the bare label, same as select" (`:20`) and "status: swaps the bare label, same as select" (`:58`) therefore exercise Select. They repeat `:14` and `:54`, and `:34-50` "the option list is the one shape" covers the same ground again. "Bare label" is also stale: values are option keys in one-element lists.
- **Better:** Delete `:20-22` and `:58-60`, or make `defOf` produce a real Status if Status ever diverges (it doesn't: `PROPERTY_TYPES.status.kind === 'select'`, `properties.ts:41`). Merge `:13-31` and `:53-77` into the one-shape block.
- **Behavior:** Preserving.
- **Estimate:** tests about −15 · read

###### 09-09 · Exports with no outside reader, or only a test reader — CORRECTED
- **Lens:** Less Stuff, Clearer Boundaries (a module exports what other modules use)
- **Now:** Nothing reads these outside their own file: `OptionDef` and `OptionEditApi` (`Schema/useOptionEdit.tsx`), `NumberPart` (*corrected line:* `formatValue.ts:194`; it's the return element of the exported `formatNumber`, `:225`), `TypeSpec` (`properties.ts:27`), `NUMBER_FAMILIES` (`properties.ts:105`, read at `:177`). Only tests or fixtures read these: `landPageValue`/`landSpaceValue` (09-02), `writePropertyBundle` (`deleteProperty.ts:42`, used inside at `:85` and by 4 tests: `Bundles/handlers.test.ts`, `Bundles/rows.test.ts`, `replaySchemaCascade.test.ts`, and `Trash/spend.test.ts:663`, a whole describe on "the artifact-less shape"), `runFilePick` (`Pickers/filePick.ts:32`, used inside at `:97`), `numberDivisor` (`formatValue.ts:237`), `LEGACY_TYPE_IDS`, `CheckboxLook`, `StoredColumnStyle` (`columnStyles.ts:87`), `ValueIntentHandlers` (`valueClick.ts:61`).
- **Better:** Drop the `export` keyword on the zero-reader names now. For the test-only ones, have the tests go through the public entry the app calls: `deleteProperty` for the bundle, `pickFileInto` or `fileValueMenu` for `runFilePick`, and the two `formatValue.ts:243,246` wrappers for `numberDivisor`. Where a test can't do that, it is testing implementation shape. `LEGACY_TYPE_IDS` leaves outright with 08-03 / 09-01.
- **Behavior:** Preserving.
- **Estimate:** ±0 lines; about 13 export keywords · read

###### 09-10 · The journal slot's non-displacement rule is pinned in four files — VERIFIED
- **Lens:** Duplicate Coverage, I-036
- **Now:** "A held record isn't displaced by a new op" appears in `propertyJournal.test.ts:47`, `journalWiring.test.ts:306-319`, `handlers.test.ts:216,230,301-376`, and `optionOps.test.ts:707-836` (four owed-record cases, plus `:1425` for the Value Format). The guards they pin are the ones I-036 lists as folding into "an operation on a property waits on that property's owed record" (`IssuesPM.md` I-036 Solution).
- **Better:** Keep one unit pin on the slot (`propertyJournal`) and one per-op refusal pin wherever the op's reply differs. Mark the rest for removal when I-036's held-record rule lands, because each guard's test leaves with the guard.
- **Behavior:** Preserving. Every property, Context, and Space is meant to keep its own crash-recovery note [Intended as B-1], so the guards and their pins leave with the one slot.
- **Estimate:** tests about −150 under I-036 · inferred

###### 09-11 · Comments that claim constraints, or restate the code — CORRECTED
- **Lens:** Comments Aren't Authoritative, Fix the Origin
- **Now:**
  - `properties.ts:78`: "so they read forever". A constraint no live Nexus needs (08-03 / 09-01).
  - `columnLabel.ts:10`: "`contexts` is REQUIRED and deliberately un-defaulted". The type signature already says so.
  - `paneDrop.tsx:16-17`: "refuse drops differently by design". A design claim with no owner; `paneDrop.test:132-136` pins it.
  - `pageValue.ts:1`: "never decode-to-strings→re-encode". A rule that I-063's raw-versus-decoded question reopens.
  - `setProperty.ts:14`: "callers hold the page's lock … a re-take would be refused". Once 09-02 removes the fixture, the only production caller is in the file (`:69-79`); `writePathRace.test.ts:75` restates the same rule.
  - `property-panel.css.ts:8`: "KNOB —", tuning jargon.
  - `formatValue.ts:1` and `:10`: en-US pinned, plus a formatter cache justification. Fine as written.
  - `registryProperty.ts:170`: an ordering argument of about 290 characters that belongs to the I-036 design.
  - `value.ts:1`: "Two axes that must not be confused" is accurate. *Corrected:* `:26`, `:36`, and `:63` don't repeat it; they cover Context-column classification and the decode memo, so `:1` stands alone.
- **Better:** Remove `:78` with 08-03 / 09-01. Delete the `columnLabel.ts:10` and `setProperty.ts:14` comments (the types and the call sites say it). Rewrite `paneDrop.tsx:16-17` as one line naming the two panes' different bottom zones. Fold the `registryProperty.ts:170` argument into the per-property notes [Intended as B-1]. Leave the rest.
- **Behavior:** Preserving.
- **Estimate:** about −8 lines · read

###### 09-12 · Change-detector and legacy-vocabulary tests — CORRECTED
- **Lens:** A Test Pins Behavior, Not Shape
- **Now:** `Cells/PropertyTypes.test.ts` (18 lines) asserts `CREATABLE_TYPES` equals a literal array, titled "lists the user types in the New Property order". *Corrected:* that order is the type picker's visible order, derived from `PROPERTY_TYPES`' key order (`PropertyTypes.tsx:44-46`), and nothing else pins it; `properties.test.ts:209` pins only the origins. `properties.test.ts:25` checks "accepts the 12 type ids". `columnStyles.test.ts:13` checks "COLUMN_LOOKS includes the number looks". `columnStyles.test.ts:34-43` pins that two retired look vocabularies (`full`/`title`, `filename`/`path`) drop, which is the same assertion as `:78` "drops an unknown enum value"; NexusOS's saved views hold none of them (read). `PropertyFrame.test.tsx:135` and `:235` pin DOM nesting ("inner FrameSlide keeps them mounted", "renders inside its region wrapper (T6 hangs rects on it)").
- **Better:** Keep `PropertyTypes.test.ts` only as the order pin it is (retitled as such), or fold it into one `properties.test` assertion if the New Property order is declared to follow `PROPERTY_TYPES` and needs no pin. Delete `columnStyles:13-16` and `:34-43`, keeping `:39-43`'s `defaultStyleFor('file')` line inside `:22`. Rewrite the two DOM-nesting pins as the user-visible outcome they protect, or drop them.
- **Behavior:** Preserving.
- **Estimate:** tests about −30 to −45 · read

###### 09-13 · `restoreValue` sits beside `setProperty` as a second value op; I-063 should be decided here — VERIFIED
- **Lens:** One Write Path, Behavior Is a Decision
- **Now:** `mutateRequest.ts:92` declares `restoreValue { path, propertyId, held }`, and `setProperty.ts:38-47` switches between encoding (`setProperty`) and landing the raw held value (`restoreValue`). `assignValue.ts:71` sends it for undo. `restoreValue.test.ts` (193 lines, a `describe.each`/`it.each` matrix at `:174-178`) pins it. I-063 is still Deferred, and its question (whether the file's raw value is what every write and revert is built from) is exactly this deepclean's scope.
- **Better:** Undo is meant to put back what the file held, recorded by the part of Pommora that writes the file [Intended as E-1]; the design belongs to the write-path scout. As a describer: `restoreValue` stops being a second value op, its test matrix merges into the `setProperty` tests, and I-063 closes.
- **Behavior:** Changes undo behavior as intended [Intended as E-1, E-2, E-3].
- **Estimate:** n/a · read

###### 09-14 · Option lists have no stable identity, which is the origin of I-006's option exclusion and of the rename-popup tests — INFERRED
- **Lens:** Sync-Ready Shapes, Fix the Origin
- **Now:** Options are `{ key, label, … }` with no id (`properties.ts:122-130`). I-006 excludes them from per-item merge because "a rename changes" the key (the issue still says `value`). `OptionEditor.test.tsx:267-448` spends about 180 lines keeping a popup addressed through renames ("re-keys the popup", "two renames before a refresh", "a later option taking an intermediate name keys apart"), and `optionOps.test.ts:245-276` pins "an edit still addressed to the old value is refused". Inferred: both are compensations for addressing an option by a mutable name. The facts read true; whether a stable id actually retires the popup re-keying (rather than moving it to id lookups) is settled only by sketching `useOptionEdit`'s addressing against an id.
- **Better:** A stable option id is intended [Intended as D-1]. It collapses the popup re-keying machinery and its tests where a sketch of `useOptionEdit`'s addressing confirms it, and lets I-006 merge option lists per item once the Sync rebuild takes that input [Intended as H-2].
- **Behavior:** Changes the on-disk shape (adds a field). A user would see no difference.
- **Estimate:** tests about −150 if adopted; code unknown · inferred

###### 09-15 · Minor describer residue — VERIFIED
- **Lens:** Always Intentional
- **Now:** `formatBucketLabel.test.ts` (33 lines) is a separate file for one export of `formatValue.ts` (`:155`), which already has `formatValue.test.ts`. `propertyValue.test.ts:245` "the legacy object shape reads as null" pins a File shape `{ path }` from before `820192976` (the test arrived with that move; NexusOS has one File property, key `File`, and no page frontmatter holding an object shape). It reduces to "a non-wikilink entry reads as nothing", which `:249` nearly covers (it pins a null entry dropped). `deleteProperty.test.ts:303` "a property named icon … leaving every Space its glyph" pins the move of the Space icon to `$icon` (`96fc1b343`, which introduced `$icon` and this test together). Today `icon` is an ordinary word, so the test pins nothing a reader would expect to break.
- **Better:** Merge `formatBucketLabel.test` into `formatValue.test` (unless 01-14 moves `formatBucketLabel` to Views, in which case the test moves with it). Delete `propertyValue:245-247` and `deleteProperty:303-332`.
- **Behavior:** Preserving.
- **Estimate:** tests about −40 · read

##### Behavior Ledger

| Behavior | Pinned At | Origin | Classification | Status |
|---|---|---|---|---|
| A Select or Status list holding several elements reads as its **last** registered option, and removing that option reveals the one before it | `propertyValue.test.ts:168-190`, PropertiesPM:16,74 | *Corrected:* predates MetadataV3 — in PropertiesPM by `f5ea8a144` (09-01); the test's describe arrived with `820192976` (09-05) | An earlier agent's choice. The intended rule ignores words no option names, shows the most recently added valid option, and tidies to it on the next change [Intended as P-1] | CORRECTED |
| A re-assign's refill skips a page whose key holds only words no option names | `assignment.test.ts:130` | `a4d4c7ab4` "MetadataV3 Phase 3 review" | A review-round fix. Probably correct (never overwrite user words), but it's a symptom-level guard in the I-063 family | VERIFIED |
| A cached member naming no option exactly doesn't come back on re-assign | `assignment.test.ts:126`, `removeProperty.test.ts:320,385`, `Trash/restoreProperty.test.ts:232,447` | MetadataV3 (`9aeb29271`, Task 3-2, exact option words) | An agent's choice, kept: a user who removes and re-adds a property loses values whose option was renamed or deleted meanwhile [Intended as P-3] | VERIFIED |
| A restored Space loses an option deleted while it sat in the Trash | `setSpaceProperty.test.ts:151` | `0134cc02d` | An agent's choice, consistent with the frozen-world rule, kept [Intended as P-3] | VERIFIED |
| An adopted word renamed onto the key its Value Format writes keeps its key and leaves its pages | `optionOps.test.ts:583` | `e3dd70939` (MetadataV3 7B-1) | An edge rule. Accident-adjacent: it falls out of "a rename to its own key writes nothing" | VERIFIED |
| A sibling write withholds an own Multi-Select that would reconcile smaller, keeping the original list | `governedWrite.test.ts:155` | `3d28c836f` "feat(audit): clear seven findings" | An audit-round guard. The Fix the Origin question is why a sibling write reconciles another key at all | VERIFIED |
| Clear asks only past one Item; Remove and Delete always ask | `OptionEditor.test.tsx:146-168`, `confirmations.ts:185,214` | *Corrected:* `5e3aee180` (10-19), which closed the MetadataV3 plan's open ruling "The Format Change's Quiet Threshold" by giving Clear the format change's past-one threshold (earlier: `745f33edb` asked past none) | An agent's resolution of a listed open ruling. Every property and option confirmation is meant to count the Items it affects correctly, zero included, from one home the Archive's and the Trash's confirmations share [Intended as O-2]. ConfigurationPM:115 is stale against it rather than evidence of a different intent | CORRECTED |
| Two options or definitions whose names fold alike read as the first, and the second is silently dropped on the next option edit | `propertiesRegistry.test.ts:71`, `optionOps.test.ts:224`, PropertiesPM:140 | *Corrected:* `9c2850b3b` (10-04), before MetadataV3 | An agent's choice, kept: a silent write-time repair of a hand-edited file [Intended as P-3] | CORRECTED |
| Names compare case-folded nexus-wide because Obsidian merges keys that differ only in case | `schema.test.ts:29,37`, PropertiesPM:140 | *Corrected:* predates MetadataV3 (present by `759a2dbef`, 09-05) | Interop (Legibility); likely Nathan's intent | CORRECTED |
| A checkbox reads `yes/no/on/off/y/n` in any casing, while options match exactly | `propertyValue.test.ts:494-536` | Option exactness: MetadataV3 (`9aeb29271`) | Interop for checkboxes. The exactness of options is a MetadataV3 decision (likely Nathan's) | VERIFIED |
| Repair Properties On Open defaults to Off | `personalization.ts:146`, `repairSweep.test.ts:110` | — | An agent's choice, with no stated reason. On by default [Intended as O-3] | VERIFIED |
| The value picker offers `+ New Option` for Select and Multi-Select, but not Status | `PropertyPicker.pane.test.tsx:277,325` | — | An agent's choice (inferred: Status needs a group). Planning recommends whether Status gains it [Intended as J-8] | VERIFIED |
| A Value Format change, an option rename, or an option removal is refused while another journal record is owed | `optionOps.test.ts:707,1425`, `handlers.test.ts:230` | I-036 guard set | An accident of the single journal slot (I-036 says so); per-property notes remove it [Intended as B-1] | VERIFIED |
| A delete's record is replayed after the property is restored and leaves it alone | `handlers.test.ts:196` | — | Correct and defensive; it falls out of the slot design | VERIFIED |
| A File value in the old `{ path }` object shape reads as nothing | `propertyValue.test.ts:245` | before `820192976` | Legacy residue (09-15) | VERIFIED |

##### Cross-Domain Notes

- `undoSweep` lives in `Core/Properties/governedSweep.ts:151`, but its only caller is `Contexts/contextCascade.ts:179` (I-042, I-039). — VERIFIED
- `spaceSidecars`' disk scan is still used by `deleteProperty.ts:74`, `governedSweep.ts:118`, `keyHolders.ts:24`, and `Assets/assetMigrate.ts:117`. *Corrected:* I-036's footnote already lists the `assetMigrate.ts` caller (at a stale `:162`), so it isn't a missed fourth caller; all four footnote lines are stale. — CORRECTED
- `setPagePropertyOp` passes a world to `landPageValue`, while the test fixture doesn't (09-02). *Corrected:* `writePathRace.test.ts:82` is a second world-less caller; both are tests, so production never writes a page value world-less. — CORRECTED
- `handlers.ts:44-45` runs both migration normalizers on every open. `normalizeSavedViews`'s own `RENAMED` entries (`migrateConfig.ts:20-23`) are the same kind of residue; NexusOS's sidecars and tile documents hold neither `card_banner: "image"` nor `icon: "table"` (read), so the Views scout's check finds nothing to keep. — VERIFIED
- `cellMenu.test.ts:100` and `columnMenu.test.ts:44-48` disagree on whether a Link's look is per-property. The code offers it per column, so the cell menu's lack of Style may be an inconsistency rather than a rule. — VERIFIED
- `viewHarness.tsx:58` `STATUS_DEF` sits in a React mount harness. *Corrected:* it isn't the only shared definition fixture: `Core/Testing/fixtures/registry.json` holds `prop_status` and more, read by three Views tests. — CORRECTED

##### Overlaps & Contradictions

###### Merged Within Reports 05–09
- **09-01 → 08-03:** carried as 08-03 / 09-01 in `08-nexus.md`.
- **09-06 ← 05-13 (tag bullet):** 09-06 carries the PropertyFrame/paneDrop tag strip; `A-4` (`PropertyFrame.test.tsx:177`) added to its roster.
- **Issues Status I-006 row ↔ 08-14:** one rewrite; 08-14's `IssuesPM.md:213` cite is the correct line.
- **09-05 (`:117`/`:119`) ↔ 06-15:** one PropertiesPM rewrite, with 06-15's Value Picker correction as its content.

###### Cross-Report Overlaps
- **09-02 ↔ 02-07:** the test-only write path.
- **09-03 ↔ I-036:** caller-level reach pins.
- **09-05 ↔ 03-15 (PM:123, :136), 08-14 (PM:8, :53, I-006), 05-02 (look naming as a visible change).**
- **09-06 ↔ 03-15, 04-16 (`cascadeRace` "F1").**
- **09-07 ↔ I-036, 02's write-path fold:** only the 10 sweep-side pins belong to I-036.
- **09-09 ↔ 01-10, 03-14, 05-11 (`OptionDef`/`OptionEditApi`), 06-11 (`runFilePick`).**
- **09-10 ↔ 03-01, 04-16:** the slot's non-displacement pins leave with the guards.
- **09-13 ↔ 02-02 (I-063), 06-05:** 02-02 is the stronger statement.
- **09-14 ↔ 03-02, 08-06, 08 Approach B, 07 Approach C, I-006.**
- **09-15 ↔ 01-14:** `formatBucketLabel`'s test moves with it.

###### Contradictions
- **Doc Claims PM:123 vs 03-15:** settled for 03-15 (`registryProperty.ts:183`, `journalSlot.ts:34-36`); 03-15's own cite is `:122` where the line is `:123`.
- **09-09 vs 01-10 (`NumberPart`):** no reader outside `formatValue.ts:194`, test or otherwise; 01-10 is Reconciler A's.
- **Issues Status I-064 vs 05-13:** settled for 09 (the issue stays open).
- **09-14 vs 08 Approach B:** settled for 09-14's stable id [Intended as D-1]; see Scout 08.

##### Reconciliation Log

No finding or row was removed as wrong; 09-01 was merged into 08-03 (Reconciler B). Corrections of note, each written in place above:

| ID | Status | Reason | Evidence |
|---|---|---|---|
| Intro | CORRECTED | 56 test files in `Core/Properties`, not 75 | `git ls-files Core/Properties \| grep -cE '\.test\.tsx?$'` |
| 09-01 | MERGED into 08-03 | Same removal as 08-03, which is the stronger statement (its open-time behavior and unadmitted-not-dropped reading hold where 09-01's didn't); 09-01's added test and doc items are carried there. Original corrections: `~/Test` absent, NexusOS settles it; `Nexus/handlers.test.ts:165-178` is a whole respell test; `restoreScrub.test.ts:287,310`, `mergePolicy.test.ts:122-124`, and `NexusSyncPM.md:63` were missed; `field` leaves (read) | `Core/Nexus/handlers.test.ts:165`, `Core/Trash/restoreScrub.test.ts:287`, `Core/Nexus/migrateConfig.ts:63,66` |
| 09-02 | CORRECTED | `landPageValue` has a second test reader; 9 files / 54 calls, not 12 | `Core/Files/writePathRace.test.ts:7,82` |
| 09-03 | CORRECTED | Most of each caller block pins unique decisions; −100 to −150, not −300 | `Core/Properties/optionOps.test.ts:1172-1294`, `replaySchemaCascade.test.ts:467-561` |
| 09-04 | CORRECTED | 35 files / 72 lines; `fixtures/registry.json` already shares a Status def | `Core/Testing/fixtures/registry.json`, `Core/Views/Pipeline/columns.test.ts:3` |
| 09-05 | CORRECTED | Adds `:123` and `:136` false claims; `:149` only half stale; UI "Format" is deliberate | `Core/Properties/registryProperty.ts:183`, `removeProperty.ts:33`, `columnMenu.test.ts:171-175` |
| 09-06 | CORRECTED | About 31 tagged titles, not 33 | `git grep` over `Core/Properties` test titles |
| 09-07 | CORRECTED | 17 pins / 12 files; only 10 are I-036 sweep pins | `Core/Properties/value.test.ts:128`, `PropertyPanel.test.tsx:146` |
| 09-09 | CORRECTED | `NumberPart` at `:194` | `Core/Properties/formatValue.ts:194` |
| 09-11 | CORRECTED | `value.ts:26,36,63` don't restate `:1` | `Core/Properties/value.ts:26,36,63` |
| 09-12 | CORRECTED | `PropertyTypes.test` is the only pin of the New Property order | `Core/Properties/Cells/PropertyTypes.test.ts:5`, `PropertyTypes.tsx:44-46` |
| 09-14 | INFERRED | Facts read true; the payoff needs an id-addressing sketch | `Core/Properties/properties.ts:122-130` |
| Doc PM:123 | CORRECTED | Journal-first is false while another record holds the slot | `Core/Properties/journalSlot.ts:34-36`, `registryProperty.ts:183` |
| Doc PM:136 | CORRECTED (row added) | Remove can't re-run | `Core/Properties/removeProperty.ts:33` |
| Doc PM:76 | CORRECTED | `askFormatChange` also passes `asksPastOne` | `Core/Interface/Confirm/confirmations.ts:227` |
| Issue I-032 | CORRECTED | 18 writing channels now | `Core/Contract/bridge.ts:131-185` |
| Ledger: Clear | CORRECTED | Origin `5e3aee180`; ConfigurationPM stale, not a conflicting intent | `git show 5e3aee180` |
| Ledger: last option, fold-alike, case-fold | CORRECTED | Origins predate MetadataV3 | `f5ea8a144`, `9c2850b3b`, `759a2dbef` |


