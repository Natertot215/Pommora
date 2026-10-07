**Re-grounded:** 10-07-2026 at `32d3fa62c`

### A — Registry & Value Path

Slice: the Properties registry, the type catalog, and how a value is read, reconciled, and written for pages and Spaces. Line numbers cite the main tree at `32d3fa62c`. Runtime facts about the `yaml` package come from `node -e` runs against the installed `yaml@2.9.0`.

#### Task 1: The Catalog Seam

**The Three Declarations**

- `typeIds` is a `z.enum` (`Core/Properties/properties.ts:10-22`); `PropertyType` is inferred from it (`:23`).
- `PROPERTY_TYPES` is `Readonly<Record<PropertyType, TypeSpec>>` (`properties.ts:33-45`), so a missing entry for a new id is a compile error at the declaration itself.
- `ValueKind` is `Exclude<PropertyValue['kind'], 'null'>` (`Core/Properties/propertyValue.ts:30`), derived from the `propertyValue` discriminated union (`propertyValue.ts:15-28`). The same zod union validates the wire: `mutateRequest.ts:56` (creation `seeds`) and `mutateRequest.ts:85` (`setProperty`'s `value`), so a new union member is admitted across the interface ↔ host boundary with no further edit.

**What a Text `TypeSpec` Would Carry**

| Field | Text Would Carry | Evidence |
| --- | --- | --- |
| `kind` | A kind of its own (`'text'`) or a reused one; see below | `properties.ts:27` |
| `origin` | `'user'` | `validateDefinition` refuses any non-`user` origin at create (`Core/Properties/schema.ts:49-50`); `CREATABLE_TYPES` filters on `origin === 'user'` (`Core/Properties/Cells/PropertyTypes.tsx:43-45`), so the type picker (`Core/Properties/Schema/PropertyFrame.tsx:306-315`) lists it with no further edit |
| `groups` | Absent unless grouping is decided | `groupable` reads it (`properties.ts:72-73`). Today `dateTime`, `select`, and `status` carry it (`:36-39`); `link`, the other free string, doesn't (`:40`). `bucketKey` returns `null` for `link` (`Core/Views/Pipeline/group.ts:191`) |
| `options` | Absent | It names where an option list lives, `select_options` or `status_groups` (`properties.ts:25, 30`). Absent, `optionsOf` falls back to `select_options ?? []` (`:284-289`), `seeded` returns the def untouched (`Core/Properties/registryProperty.ts:41-42`), and `withUniqueOptions` passes it through (`schema.ts:62-65`) |

**Reusing a Kind vs a Kind of Its Own**

Three existing kinds already carry `value: z.string()` (`propertyValue.ts:19, 20, 24`), but each binds behavior a free string wouldn't want: `select` encodes as a one-element list (`propertyValue.ts:153-154`) and decodes only registered options (`:80-86`); `link` reconciles against gone pages (`:134`), sorts and filters by `linkDisplayText` (`Core/Views/Pipeline/sort.ts:58-60`, `Core/Views/Pipeline/filter.ts:145-147`), and opens URLs on click (`Core/Properties/Pickers/valueClick.ts:45-50`); `dateTime` is parsed as a date for sort and filter (`sort.ts:44-47`, `filter.ts:189`). A reused kind inherits all of that silently; a new kind surfaces every site as a compile error (Task 3).

**Exhaustive vs Silent**

Compile-enforced sites are listed in Task 3. Sites in or near this slice that branch on type or kind without exhaustiveness, so `text` falls through with no error:

| Site | What Text Gets |
| --- | --- |
| `parseEditorValue` (`Core/Properties/parseEditorValue.ts:14-31`) | An `if` chain over `number` and `link`; any other type returns `undefined`, the "invalid, don't commit" answer (`:13`). A text edit would never commit, and `PropertyValueInput`'s `invalid` (`Core/Properties/Pickers/PropertyValueInput.tsx:41`) would dim every keystroke |
| `editorText` (`parseEditorValue.ts:7-11`) | `''`: the field opens empty over an existing value |
| `PropertyValueInput` (`PropertyValueInput.tsx:27, 37, 47`) | Number's popover branch and Link's alias/accent branches skip it; it gets the bare `EditableInput` |
| `holdsList` (`properties.ts:64-67`) | `false`: one key read, spellings not joined (correct for a scalar) |
| `reconcilePropertyValue` (`propertyValue.ts:132-137`) | Returns the decode unchanged (only `link` and `multiSelect` have arms) |
| `writtenSpelling` (`propertyValue.ts:141-149`) | Returns the next value verbatim; no raw-spelling preservation (see Task 2) |
| `unregisteredMembers` (`propertyValue.ts:108-113`) | `[]` |
| `fillsBlank` (`Core/Views/Cards/cardValueInput.ts:18-21`) | `true`: a blank Text value is fillable in place on cards |
| `columnMenu` label (`Core/Actions/columnMenu.ts:41`) | `'Style'`, not `'Format'` |
| `pickTarget` fallbacks (`Core/Views/Host/useViewHost.ts:200-223`; `Core/Properties/PropertyPanel.tsx:339-356`) | `{ kind: 'options' }` for anything not `dateTime` (or, in the view host, `file`). Reached only if `valueClickIntent` answers `'picker'`, which is compile-enforced |
| `restoreScrub` and `deleteCascade` link filters (`Core/Trash/restoreScrub.ts:35`, `Core/Nexus/cascade.ts:93, 228`, `Core/Properties/propertiesRegistry.ts:71-72`) | Excluded: the value cascade reaches only `type === 'link'` definitions |

**`LEGACY_TYPE_IDS` and an Older Build Reading `text`**

- `LEGACY_TYPE_IDS` maps three pre-camelCase spellings to current ids (`properties.ts:95-99`). `propertyType` preprocesses through it and then validates against `typeIds` (`:101-104`), so an id that's neither legacy nor known fails the parse.
- In an older build, `propertyDefinition.safeParse` fails on `type: 'text'` (`properties.ts:169, 197`), and `normalizeRegistry` files the def under `unadmitted` (`Core/Properties/propertiesRegistry.ts:30-39`). Every `mutateRegistry` write carries `unadmitted` back verbatim (`:104-105`) and keeps its `order` membership, appended (`:115-119`). The def is invisible to that build but survives its writes.
- The on-open registry rewrite, `normalizePropertyTypes` (`Core/Nexus/migrateConfig.ts:60-72`, called at `Core/Nexus/handlers.ts:43`), respells through `propertyType.safeParse(...).data`; for `'text'` that's `undefined`, so `respelled` returns `undefined` (`migrateConfig.ts:55-58`) and `field` writes nothing for a falsy result (`:29-36`). The id is left alone.
- Page keys under the unadmitted def are foreign to the older build: `governorOf` finds no def (`Core/Contexts/contextResolve.ts:95-100`) and `reconcileGovernedRoot` passes them through verbatim (`:123-126`).
- Edge: the older build's name gate checks admitted defs only (`schema.ts:29-39` via `registryProperty.ts:52-58`), so it can create a second property under the Text def's name. The newer build then admits whichever the object order reaches first and files the other as unadmitted (`propertiesRegistry.ts:33-37`).
- A Trash record of a Text property reads in an older build without a `propertyType` (`Core/Trash/trashRows.ts:55-60`), and its restore refuses with "That deleted property's definition no longer reads." (`Core/Trash/restoreProperty.ts:38-39`).

#### Task 2: Reading Non-String Raws (Tension 8)

**What `parseDocument(...).toJSON()` Yields**

`splitFrontmatter` calls `parseDocument` with no options (`Core/Files/pageFile.ts:40-41`), so the YAML 1.2 core schema applies.

| Written in the File | Parses As | `String()` of It |
| --- | --- | --- |
| `2026-01-01`, `2026-01-01T10:00:00Z` | string, unchanged | same |
| `yes`, `no`, `on` | string | same |
| `12:30`, `1_000` | string | same |
| `true`, `True` | boolean `true` | `"true"` |
| `42`, `007`, `0x1F`, `1e3`, `3.10` | number `42`, `7`, `31`, `1000`, `3.1` | `"42"`, `"7"`, `"31"`, `"1000"`, `"3.1"`: spelling lost |
| `.inf`, `.nan` | `Infinity`, `NaN` | `"Infinity"`, `"NaN"` |
| `~`, `Null`, an empty value | `null` | (decoded as blank before any arm, `propertyValue.ts:70`) |
| `[a, b]` | `["a","b"]` | `"a,b"` |
| `[[Page]]` unquoted | `[["Page"]]` (nested flow sequence) | `"Page"` |
| `"[[Page]]"` quoted | string `"[[Page]]"` | same |
| `{x: 1}` | object | `"[object Object]"` |
| `\|` block | string with a trailing `\n` (clip) | same |

So dates and `yes` aren't the problem; numbers, booleans, lists, and the unquoted wikilink are.

**The Precedents in `decodeValue`**

| Kind | Rule | Site |
| --- | --- | --- |
| `link`, `dateTime` | String only; anything else is `NULL_VALUE` | `propertyValue.ts:77-79` |
| `number` | `typeof === 'number'` only | `:73-74` |
| `checkbox` | `true`, or the string `true`/`yes` in any casing; `writtenSpelling` keeps the raw's own checked word on write | `:66-67, 75-76, 142` |
| `select`, `multiSelect` | `optionList`: scalars only (`isScalar` excludes objects, `Core/Contract/validators.ts:9-10`), each `String()`'d, blanks dropped | `:43-47` |
| `file` | Lists element by element; a nested single-element array unwraps to `[[inner]]`, the unquoted-wikilink repair | `:33-38, 93-101` |

**The Options and Their Consequences**

All three share two facts: `holdsList` is `false`, so only the `heldKey` spelling is read and other spellings pass through as foreign (`Core/Files/heldKeys.ts:15-19`, `contextResolve.ts:112`); and `reconcileGovernedRoot` runs on more than explicit writes. It runs on every governed key except the target whenever any other property on the page or Space is written (`Core/Properties/governedWrite.ts:16-21`), across reread pages on open when `repairOnOpen` is set (`Core/Properties/repairSweep.ts:20, 37-41`), and with a `frozen` world on Trash restore of pages and Spaces (`restoreScrub.ts:50, 71`).

**String Only, Otherwise Null (the Link Precedent)**

- **Read:** `42`, `true`, lists, and unquoted `[[Page]]` show as blank although the key holds a value.
- **Live Reconcile:** `next` stays `undefined`, so the raw is kept verbatim, every spelling (`contextResolve.ts:142-146`). Nothing on disk changes on open or on adjacent writes.
- **User Write:** `writtenRoot` lands the typed string over the raw (`governedWrite.ts:16-21`, `heldKeys.ts:42-48`).
- **Trash Restore:** With `frozen`, the guard at `contextResolve.ts:143` is skipped and an undecodable key is retired (`:148-151`): a restored page holding `Notes: 42` under a Text `Notes` loses the key. A property restore's `refillValues` gets `encoded === undefined` and skips the root (`Core/Properties/assignment.ts:57-59`), so it's reported `unrestored` (`restoreProperty.ts:70-73`). Separately, `refillValues`' "already holds a value" check decodes the root's current raw (`assignment.ts:60`); a root holding `42` reads as blank there, so a restore overwrites it.

**`String()` Scalars (the `optionList` Precedent)**

- **Read:** Every scalar shows, with numeric spelling normalized (`3.10` → `3.1`, `007` → `7`, `0x1F` → `31`, `.inf` → `Infinity`). Lists and objects still need a rule; `optionList`'s `isScalar` filter would read a list's scalar members, which isn't a single string.
- **Live Reconcile:** `next = "42"`; `memberCount` is 1 on both sides (`contextResolve.ts:110, 143`), so the guard passes. `writtenSpelling` returns `"42"` (`propertyValue.ts:143`), `JSON.stringify` differs from `42`, and the key is marked changed (`contextResolve.ts:154-155`). The yaml serializer then writes `Notes: "42"` and `B: "true"` (verified). The rewrite fires on open via the repair sweep and on any adjacent property write. No string-spelling arm exists in `writtenSpelling`; the only raw-preserving precedent is checkbox's (`:142`).
- **Spaces:** The same rewrite happens to a sidecar's JSON `42` through `writtenRoot` (`Core/Properties/setProperty.ts:24-29`) and `restoreScrub.ts:71`.
- **Trash Restore:** `42` comes back as `"42"`.

**Joining Arrays**

- **Read:** `["a","b"]` reads as one string under a chosen separator; unquoted `[["Page"]]` would need `fileEntry`'s unwrap to read as `[[Page]]`.
- **Live Reconcile:** A joined string counts 1 member against the list's 2, so the never-shrink guard keeps the raw list (`contextResolve.ts:143-146`). Joining is display-only on live paths. The nested `[["Page"]]` counts 1 on both sides (`listOf` takes the outer array as a one-member list, `validators.ts:7`; `normalizeTitle` `String()`s the inner array, `Core/Paths/caseFold.ts:12-14`), so it is rewritten to the quoted `"[[Page]]"`.
- **User Write:** The first edit replaces the list with the joined, edited string.
- **Trash Restore:** `frozen` skips the guard, so a restore writes the joined string and the list is gone for good.

Combinations are possible, such as `String()` for numbers and booleans with lists left null. Each combination takes the consequences of the option it applies to that raw.

#### Task 3: The Switch Census

**Method:** This was a probe, not a build. A detached worktree at `32d3fa62c` was created in the scratchpad, with dependencies symlinked and `@pommora/*` re-pointed at the worktree's own workspaces. Three lines were added: `'text'` in `typeIds`, `text: { kind: 'text', origin: 'user' }` in `PROPERTY_TYPES`, and `{ kind: z.literal('text'), value: z.string() }` in the union. `npm run typecheck` short-circuits on the first failing project (`package.json` chains with `&&`), so each `tsc -p` project then ran separately. `Core`, `Core/tsconfig.src.json`, and `Desktop/tsconfig.web.json` each report the same 23 errors; `Desktop/tsconfig.node.json` reports 5 of them (the host-run subset, marked **H**); `UIX`, `Sync`, and `Dashboard` are clean. No test file errors. The worktree was removed with `git worktree remove --force`, and `git worktree list` afterwards shows only the main tree.

The probe shifts some lines in `properties.ts` (+1 after line 21, +2 after line 44) and `propertyValue.ts` (+1 after line 27). The table cites main-tree lines.

| # | Site | Construct | Reason |
| --- | --- | --- | --- |
| 1 | `Core/Actions/cellMenu.ts:61` | `switch (kind)` in `baseCellMenu` | No arm decides a Text cell's context menu |
| 2 | `Core/Actions/columnMenu.ts:54` | `switch` in `styleMenuItems` | No arm decides the column's Style/Format items |
| 3 | `Core/Properties/Cells/Cell.tsx:42` | `switch (v.kind)` in the cell renderer | No arm renders a Text value |
| 4 | `Core/Properties/Cells/PropertyTypes.tsx:21` | `TYPE_META: Record<PropertyType \| 'title', TypeMeta>` | No label or icon |
| 5 | `Core/Properties/columnStyles.ts:136` **H** | `switch` in `defaultStyleFor` | No default column look |
| 6 | `Core/Properties/Pickers/valueClick.ts:27` | `switch (spec.kind)` in `valueClickIntent` | No click intent (edit, picker, or none) |
| 7 | `Core/Properties/properties.ts:77` **H** | `switch` in `pickKindOf` | Must answer whether Text is an option-pick kind |
| 8 | `Core/Properties/propertyValue.ts:69` **H** | `switch (kind)` in `decodeValue` | No decoder (Task 2) |
| 9 | `Core/Properties/propertyValue.ts:167` **H** | `never` guard in `encodeValue`'s `default` | No encoder arm |
| 10 | `Core/Properties/propertyValue.ts:178` **H** | `switch` in `isBlankValue` | No blankness rule |
| 11 | `Core/Properties/Schema/PropertyFrame.tsx:333` | `SETTINGS: Record<PropertyType, …>` | No settings frame in the property editor |
| 12 | `Core/Views/filterModel.ts:155` | `KIND_OPS: Record<ValueKind, OperatorChoice[]>` | No filter operators |
| 13 | `Core/Views/Host/useViewCreation.ts:31` | `SEEDS_FROM_SORT: Record<ValueKind, boolean>` | Must answer whether a new page inherits a Text sort value |
| 14 | `Core/Views/Pipeline/creationSeeds.ts:15` | `switch` in `ruleSeed` | Must answer whether an `Is` filter seeds new pages |
| 15 | `Core/Views/Pipeline/filter.ts:106` | `switch` in `evaluatorOf` | No filter evaluator |
| 16 | `Core/Views/Pipeline/filter.ts:141` | `switch (v.kind)` in `textValue` | No text extraction for the text evaluator |
| 17 | `Core/Views/Pipeline/group.ts:179` | `switch (v.kind)` in `bucketKey` | No group bucket rule |
| 18 | `Core/Views/Pipeline/sort.ts:55` | `switch (v.kind)` in `sortText` | No sort string |
| 19 | `Core/Views/Pipeline/sort.ts:76` | `switch` in `buildCriterion` | No sort comparator |
| 20 | `Core/Views/reassign.ts:6` | `FROM_GROUP_KEY: Record<ValueKind, …>` | Must answer whether a drag between groups reassigns |
| 21 | `Core/Views/Settings/SortFrame.tsx:45` | `switch` in `directionOptions` | No direction labels (A → Z vs value) |
| 22 | `Core/Views/Table/useColumns.ts:32` | `WIDTHS: Record<PropertyType \| 'title', …>` | No column width bounds |
| 23 | `Core/Views/Table/useColumns.ts:102` | `DEFAULT_ALIGN: Record<PropertyType \| 'title', …>` | No default alignment |

**Total:** 23 error sites in 18 files. Measured against the main session's `case 'link'` grep (13 files): 12 of those 13 appear above. The thirteenth, `Core/MarkdownPM/Autocomplete/autocomplete.ts:200`, switches over a connection-insert form, not a property type, so it's a false positive. Six files the grep can't see appear here: the `Record`-typed maps at #4, #11, #12, #13, #20, #22, and #23. The census covers only constructs `tsc` enforces. The silent sites are in Task 1's table, and a value-bearing implementation can surface a second wave once these arms exist.

#### Task 4: Validation (Tension 4)

| Refusal | What It Guards | Applies to a Text Value? |
| --- | --- | --- |
| `linkValueFromEdit` (`Core/Connections/linkValue.ts:67-80`) | Typed text that's neither a pasted link nor `isValidLink` returns `undefined` (`:76`); a pasted `[[…]]` resolves through `resolveTitle` (`Core/Properties/Cells/linkResolve.ts:7-8`) | No: a Link's value must name a target; a free string has none |
| `numberFrom` (`UIX/Pickers/numberUnit.ts:12-15`) via `parseEditorValue.ts:19-23` | Non-finite input returns `undefined` | No |
| `KEY_REFUSAL` (`properties.ts:260-267`), `keyRefusal` and `validateName` (`schema.ts:21-40`) | Property names: empty, reserved prefix, managed key, duplicate, held | No: names, not values |
| `mergeInto`'s throw (`Core/Files/pageFile.ts:117-119`), `frontmatterWritable` (`:76-77`), `sweepParse`'s skip (`:198`) | The page's existing frontmatter has parse errors, isn't a map, or fails to serialize (`:55-56, 58-74`) | Equally to every type: the refusal belongs to the file, not to the value written |
| Wire validation (`mutateRequest.ts:85`) | `z.string()` admits any string | Admits all |
| `encodeValue`'s `undefined` refusal (`propertyValue.ts:165-170`) and `noShape` (`Core/Nexus/page.ts:15-16, 105`) | A kind outside the union | Never reached by a union member |

Beyond the cases the main session tested, these strings were checked through `doc.set` → `toString({ lineWidth: 0 })` → `parseDocument`, and through the `---` envelope split regex (`pageFile.ts:21`): NUL, BEL, a lone surrogate, CRLF, U+2028, BOM, a 5,000-character line, `*alias`, `&anchor x`, `!tag x`, `%directive`, `|`, `...`, and values with a line that's exactly `---`. Every one round-trips with no parse error and leaves the envelope intact (a `---` line inside a value is either indented in a block scalar or stays on the key's line). `serialized`'s `catch` (`pageFile.ts:69-71`) wasn't triggered by any of them.

**Verdict:** Within this slice, "invalid text" doesn't exist as a category: no string fails to encode, serialize, or round-trip, and the only commit-time refusal that can fire is the file-level broken-frontmatter one every type shares. If `EditableInput`'s `invalid` prop (`UIX/Fields/EditableInput.tsx:35-36, 56, 65, 77`) were wired for Text, it could guard only something chosen by design (a length cap, a non-blank rule) or nothing. As it stands, `parseEditorValue` answers `undefined` for Text and would mark every input invalid (Task 1). `errorRing()` (`UIX/Fields/fieldRing.ts:15-17`) has no consumer in `Core` or `UIX`; its only use is the Dashboard showcase (`Dashboard/Leaves/fields-leaf.css.ts:2, 5`). The `invalid` styling in use is `invalidInput`, an opacity dim on `aria-invalid="true"` (`UIX/Fields/fields.css.ts:122-124`), not the ring.

#### Task 5: Spaces and the Write Path

**Page vs Space**

| Step | Page | Space |
| --- | --- | --- |
| Entry | `setPagePropertyOp` under the page's lock (`setProperty.ts:43-62`) → `updatePageProperty` (`Core/Nexus/page.ts:96-108`) | `setSpacePropertyOp` (`setProperty.ts:32-41`) → `setSpaceProperty` (`:15-30`) |
| Blank and Encode | `isBlankValue` then `encodeValue`, with `noShape` on `undefined` (`page.ts:103-105`) | Same rule, inline (`setProperty.ts:21-23`) |
| World | `pageWorldOf`: the owning Collection's assigned defs (`Core/Contexts/contextWrite.ts:70-74`) | `spaceWorldOf`: every registry def, since a Space holds any registry property (`contextResolve.ts:57-59`) |
| Root Write | `setGovernedRootKey` → `writtenRoot` (`governedWrite.ts:16-42`) | `writeSpaceSidecar` → `writtenRoot` (`setProperty.ts:25-29`, `contextWrite.ts:76-82`) |
| Serialize | `mergeFrontmatter` → yaml `doc.set` only when the JSON differs (`pageFile.ts:107-113, 122-132`) | `rmwJsonStrict` → `JSON.stringify` with sorted keys (`Core/Files/stableJson.ts:4-6`) |
| Read Back | `resolveFieldValue` → `decodeValue` (`Core/Properties/value.ts:37-61`) | The Space's non-modeled keys become `values` (`Core/Contexts/spaceSidecar.ts:65-87`), which `pageRow` lays out as a row's frontmatter (`Core/Properties/pageRow.ts:37`), so it's the same `resolveFieldValue` path |

A Text value takes no Space-specific path. The two differences are the world (assigned vs every registry def) and the serializer (YAML vs JSON). JSON keeps a string verbatim, including newlines; it also keeps a number as a number, so Task 2's reconcile consequences hit sidecars just as they hit pages. The renderer's optimistic copy, `applyValueAtRoot` (`propertyValue.ts:204-213`, used at `Core/Properties/assignValue.ts:38`), lands the encoded value through the same `writeTarget`/`landValue` pair without reconciling other keys.

**Where a String Is Trimmed, Normalized, or Coerced**

| Site | Effect on a Value |
| --- | --- |
| `EditableInput` `onBlur` (`EditableInput.tsx:97`) | `.trim()` before `onCommit`: leading and trailing whitespace never reaches a commit from this field |
| `EditableInput` renders an `<input>` (`EditableInput.tsx:49-104`) | Single-line. HTML's value sanitization for text inputs strips line breaks, so a multi-line value loaded as `defaultValue` would show flattened. Because `PropertyValueInput`'s commit compares the text against `initial` (`PropertyValueInput.tsx:44`), an untouched blur on such a value would differ from `initial` and write the flattened, trimmed string back |
| `TextPicker` (`UIX/Pickers/TextPicker.tsx:29-39`) | Wraps the same `EditableInput`, so it behaves the same |
| `linkValueFromEdit` / `linkValueFromRename` (`linkValue.ts:72, 83`) | Trim; Link only |
| `normalizePropertyName` (`properties.ts:269-271`) | Trim + NFC on names only; no value path calls it |
| `normalizeTitle` (`caseFold.ts:12-14`) | Used to compare option and member titles (`propertyValue.ts:47, 63, 146`); a Text value would pass none of those sites |
| `isBlankValue` (`propertyValue.ts:178-195`) | `""` is blank and clears the key (`page.ts:103`, `setProperty.ts:21`); `"   "` is non-blank unless a parser trims it first |
| Wire (`mutateRequest.ts:85`), `encodeValue`, `writtenSpelling` (`:143`), `landValue` (`heldKeys.ts:42-48`) | Verbatim |
| `assembleEnvelope`'s `lf()` (`pageFile.ts:81, 86`) | Converts CRLF to LF across the frontmatter text. A value holding `\r` serializes double-quoted with escapes (verified), so its CR survives |
| yaml serialization | Round-trips exactly (main session's facts plus Task 4's additions) |

**Net:** Below the editor, a multi-line or whitespace-bearing value survives every layer on both pages and Spaces. The current single-line editor is the only layer that trims and flattens.

#### Tensions

| # | Tension | Verdict From This Slice |
| --- | --- | --- |
| 1 | Sort | **Confirms it's open:** `sortText` and `buildCriterion` need arms (`sort.ts:55, 76`), and `SortFrame` needs direction labels (`SortFrame.tsx:45`) |
| 2 | Filters | **Confirms it's open:** `KIND_OPS`, `evaluatorOf`, and `textValue` (`filterModel.ts:155`, `filter.ts:106, 141`) need arms. `evaluateText` exists and already serves `select` and `link` |
| 3 | Cascade (links inside text) | **Partial:** the delete cascade and the Trash link scrub reach only `type === 'link'` defs (`cascade.ts:93, 104-107, 228`; `restoreScrub.ts:35`; `propertiesRegistry.ts:71-72`). Nothing in this slice rewrites a `[[Page]]` inside another type's value. The rename cascade wasn't traced |
| 4 | Validation | **Confirms:** no "invalid text" category exists at commit (Task 4). The one refusal that fires is file-level and shared by every type |
| 5 | Single- vs Multi-Line | **Confirms the gap:** the storage and wire layers carry multi-line verbatim; the only editor (`EditableInput`) is a trimming single-line `<input>` (Task 5) |
| 6 | Table Glyph | **Partial:** `TYPE_META` needs a label and icon (`PropertyTypes.tsx:21`); `Cell.tsx:42` needs a renderer arm. No icon was chosen here |
| 7 | Native Menu | **Partial:** `baseCellMenu` (`cellMenu.ts:61`) and `styleMenuItems` (`columnMenu.ts:54`) need arms. Native menu presentation is outside this slice |
| 8 | Adoption of Non-String Raws | **Confirms, and sharpens it:** registration adopts foreign keys with no sweep (`createProperty` doesn't consult key holders, `registryProperty.ts:46-78`), but the reconcile then runs on open (`repairSweep.ts`), on adjacent writes (`governedWrite.ts:18`), and on restore (`restoreScrub.ts`). The decoder therefore chooses between a value that shows blank but stays untouched (string-only) and a value that shows but is silently re-typed on disk (`String()`); joining is held back by the never-shrink guard everywhere except Trash restore (Task 2) |
| 9 | Foreign Recognition | **Partial:** an older build keeps a `text` def unadmitted but intact, keeps its keys foreign, and can create a same-named rival (Task 1). Recognizing foreign frontmatter as Text-shaped is outside this slice |

#### Missing

- **Type Id and Catalog Entry:** No `text` in `typeIds` or `PROPERTY_TYPES`, and no `text` member in the `propertyValue` union.
- **Decoder Rule:** None for a free string beyond the Link precedent; no decision on numbers, booleans, lists, or unquoted `[[Page]]`.
- **Spelling Preservation:** `writtenSpelling` has no arm that keeps a non-string raw's own spelling for a string-typed value; only checkbox words and list members have one.
- **Text Edit Parser:** `parseEditorValue` and `editorText` have no Text arm; a Text edit would never commit.
- **Multi-Line Editor:** The only value editor is a single-line `<input>` that trims on blur.
- **Exhaustive Arms:** The 23 compile-enforced sites in Task 3.
- **Catalog Metadata:** No Text label, icon, column width, default alignment, or settings frame.
- **Group and Sort Decisions:** No `groups` decision on the `TypeSpec`, and no `SEEDS_FROM_SORT`, `FROM_GROUP_KEY`, or `ruleSeed` decision.
- **Wired Error Ring:** `errorRing()` has no app-side consumer, and no value-level validation for free strings exists for it to show.
