**Re-grounded:** 10-07-2026 at `32d3fa62c`

### H: Views Pipeline

The slice covers filter, sort, group, creation seeds, the saved-view schema, column styles, and the settings frames that enumerate types. The premise under test is a `text` property type carrying a new `ValueKind` `text`.

`ValueKind` is derived from the `propertyValue` zod union (`Core/Properties/propertyValue.ts:15-30`, `:30`), so a `text` kind begins as one zod branch there. Core compiles under `strict: true` (`Core/tsconfig.json:8`), so every `Record<ValueKind, …>` or `Record<PropertyType, …>` fails on the missing key, and every switch over `.kind` whose function returns a non-`undefined` type without a `default` fails with "Function lacks ending return statement" until it gains an arm. Most of this slice's touches are of that kind: required by typecheck, with the behavior decided by which existing arm the new case joins.

#### Cascade Table

| Site | Shape | Requirement | Text Arm Joins |
| --- | --- | --- | --- |
| `Core/Views/filterModel.ts:155-164` `KIND_OPS` | `Record<ValueKind, OperatorChoice[]>` | Compile | Whatever op list is chosen |
| `Core/Views/Pipeline/filter.ts:106-124` `evaluatorOf` | Switch over `ValueKind` | Compile | `select`/`link` → `evaluateText` |
| `Core/Views/Pipeline/filter.ts:141-157` `textValue` | Switch over `PropertyValue['kind']` | Compile | Returns the string |
| `Core/Views/Pipeline/sort.ts:55-74` `sortText` | Switch over `PropertyValue['kind']` | Compile | `link` (returns the string) or the `''` group |
| `Core/Views/Pipeline/sort.ts:76-108` `buildCriterion` | Switch over `specOf(...)?.kind` | Compile | `link` group (sorts) or `context` group (`null`) |
| `Core/Views/Settings/SortFrame.tsx:42-62` `directionOptions` | Switch over `specOf(t)?.kind` | Compile | `TEXT_DIRECTIONS` or `VALUE_DIRECTIONS` |
| `Core/Views/Pipeline/group.ts:174-195` `bucketKey` | Switch over `PropertyValue['kind']` | Compile | `null` group |
| `Core/Views/Pipeline/creationSeeds.ts:11-33` `ruleSeed` | Switch over `specOf(type)?.kind` | Compile | Scalar group (routes through `groupKeyToValue`) |
| `Core/Views/reassign.ts:6-15` `FROM_GROUP_KEY` | `Record<ValueKind, …>` | Compile | `null` or a function (see *§Creation Seeds*) |
| `Core/Views/Host/useViewCreation.ts:31-40` `SEEDS_FROM_SORT` | `Record<ValueKind, boolean>` | Compile | `true` or `false` |
| `Core/Properties/columnStyles.ts:133-154` `defaultStyleFor` | Switch over `specOf(type)?.kind` | Compile | `{}` group |
| `Core/Actions/columnMenu.ts:54-93` `styleMenuItems` | Switch over `PROPERTY_TYPES[type].kind` | Compile | `[]` group |
| `Core/Views/Table/useColumns.ts:32-45` `WIDTHS` | `Record<PropertyType \| 'title', ColumnWidth>` | Compile | New min/default/max |
| `Core/Views/Table/useColumns.ts:102-115` `DEFAULT_ALIGN` | `Record<PropertyType \| 'title', ColumnAlign>` | Compile | `'left'` like Link |
| `Core/Properties/Cells/PropertyTypes.tsx:21-34` `TYPE_META` | `Record<PropertyType \| 'title', TypeMeta>` | Compile | Label + icon name |
| `Core/Properties/properties.ts:33-45` `PROPERTY_TYPES` | `Record<PropertyType, TypeSpec>` | Compile | `{ kind: 'text', origin: 'user' }` |
| `Core/Views/Table/useColumns.ts:51-56` `STYLE_MIN` | `Partial<Record<…>>` | None | Omitted entry is valid |

**Adjacent, Out of Slice:** these also need an arm under the same compile rule and aren't examined here: `pickKindOf` (`Core/Properties/properties.ts:77`), the cell renderer (`Core/Properties/Cells/Cell.tsx:42`), `valueClickIntent` (`Core/Properties/Pickers/valueClick.ts:27`), the property editor's `SETTINGS` (`Core/Properties/Schema/PropertyFrame.tsx:333`), `decodeValue` / `encodeValue` / `isBlankValue` (`Core/Properties/propertyValue.ts:69-105`, `:151-172`, `:178-195`), and `baseCellMenu`'s switch (`Core/Actions/cellMenu.ts:65`).

#### Task 1: Filter

`operatorsFor` resolves a property through `declaredType` → `specOf(...).kind` → `KIND_OPS[kind]` (`Core/Views/filterModel.ts:166-175`). Title short-circuits to `TITLE_OPS` (`:171`), which is `TEXT_OPS` itself (`:153`). Link's entry is `[...TEXT_OPS, ...EMPTIES]` (`:162`).

| Touch | Location | Effect |
| --- | --- | --- |
| `text: [...TEXT_OPS, ...EMPTIES]` | `filterModel.ts:155-164` | Text offers Is · Isn't · Starts With · Contains · Doesn't Contain · Is Empty · Isn't Empty, identical to Link |
| `filterTargets` | `filterModel.ts:177-193` | No edit: `schemaTargets` admits any def whose `operatorsFor` is non-empty (`:191`) |
| `case 'text'` → `evaluateText` | `filter.ts:106-124` | Joins `select`/`link` at `:114-116` |
| `case 'text'` → `v.value` | `filter.ts:141-157` | Link's arm runs `linkDisplayText` (`:145-147`); Text would return the raw string |
| `prepareRule` | `filter.ts:62-77` | No edit: dispatches via `PROPERTY_TYPES[t].kind` (`:75`) |
| Mint default op | `Core/Views/Settings/FilterFrame.tsx:125-136` | `mintRule` takes `operatorsFor(...)[0]`; with `TEXT_OPS` first, a new Text rule opens on **Is** |

A narrower Text list (Nathan's Is Empty · Isn't Empty · Contains · Doesn't Contain) would be a new `OperatorChoice[]` constant beside `TEXT_OPS`; nothing else in the filter path distinguishes Text from Link. Its first entry would become the minted default, so ordering it with `Is Empty` first mints an operandless rule that filters immediately.

**Case Handling:** `evaluateText` (`filter.ts:246-266`) compares `is` / `isNot` exactly through `want.includes(s)` (`:253-256`), while `contains`, `doesNotContain`, and `startsWith` fold both sides through `foldKey` (`:257-262`). The exact path serves Select correctly, since its operands are canonical option spellings written by chips. For Link and Title, which share the free-typed `slot: 'text'` operand, the split is a standing inconsistency: Title `Is "notes"` misses a page titled "Notes" while Title `Contains "notes"` finds it. A Text arm joining `evaluateText` inherits the same split.

**Operand Shape:** `ruleOperands` returns `values` when non-empty, else `[value]` when a value is set, else `[]` (`Core/Views/views.ts:138-139`). `is` / `isNot` honor every operand in that list; `contains`, `doesNotContain`, and `startsWith` read `want[0]` alone (`filter.ts:258-262`). The schema types the operand as `value: z.string().optional()` and `values: idArray.optional()` (`views.ts:85-90`), untyped beyond string. The pane's `'text'` slot renders `EditableInput` (`FilterFrame.tsx:479-493`), writes `value: text || undefined` (`:489`) from the field's commit, which trims on blur (`UIX/Fields/EditableInput.tsx:97`), so an emptied field drops the operand and `answerable` (`views.ts:141-142`) makes the rule abstain. `'text'` and `'number'` share that one input (`:479`).

**Multi-Line Values:** `foldKey` is `toLowerCase().normalize('NFC')` (`Core/Paths/caseFold.ts:7-9`) and leaves `\n` intact. `startsWith` therefore tests the start of the whole value (the first line), and `contains` matches within any line. `EditableInput` is a single-line `<input>` whose Enter blurs to commit (`UIX/Fields/EditableInput.tsx:49-83`), so a pane-authored operand never holds a newline; `contains` can't match across a line break, and `is` can never match a multi-line value except through a hand-authored rule.

**Empty Semantics:** `isEmpty` is `s === null || s === ''` (`filter.ts:250`); a whitespace-only string reads as non-empty. A row with no value matches `isNot` and `doesNotContain` (`:256`, `:260`) and fails every positive comparison.

#### Task 2: Sort

`buildCriterion` (`Core/Views/Pipeline/sort.ts:76-108`) sends Title through `ciLess` on `r.title` (`:78-79`) and sends `link`, `multiSelect`, and `file` through `sortText` with `ciLess` (`:100-103`). `ciLess` is `compareTitles` (`:26`), an `en` collator at `sensitivity: 'accent'` (`Core/Paths/caseFold.ts:4`, `:24-26`). `context` and an unresolved type return `null` (`:104-106`); `declaredType` is called without `contextIds` here (`:80`), so a Context criterion already resolves to `undefined`.

| Touch | Location | "Text Sorts" | "Text Doesn't Sort" |
| --- | --- | --- | --- |
| `sortText` | `sort.ts:55-74` | `case 'text': return v.value` | `case 'text'` in the `''` group (still required) |
| `buildCriterion` | `sort.ts:76-108` | Join `link`/`multiSelect`/`file` at `:100-103` | Join `context`/`undefined` at `:104-106` |
| `directionOptions` | `SortFrame.tsx:42-62` | Join `TEXT_DIRECTIONS` (A → Z / Z → A) at `:51-54` | Join `VALUE_DIRECTIONS` (never shown) |
| Sort By targets | `SortFrame.tsx:82-86` | No edit | **New exclusion**: `targets` admits `PROPERTY_TYPES[d.type].origin === 'user'` (`:85`), which lists Text |
| `resolvedSortCount` | `sort.ts:111-116` | Counts it | Drops it, so a hand-authored Text criterion neither sorts nor retires drag |

"Text sorts" is one arm in each of three exhaustive switches. "Text doesn't sort" still needs the same three arms and adds a type predicate to SortFrame's target filter, because the Sort By list is keyed on origin rather than on sortability. Context is the existing unsortable kind, and it escapes the list through its `'context'` origin, a route unavailable to a user-origin Text. Empty values sort as `''` (`:71-72`), ahead of every string ascending, matching Link.

The Order picker shows Custom only for a `select`-kind primary (`SortFrame.tsx:110-112`, `:172-175`); Text would read `directionOptions` like Link. The doc's "text case-insensitive" claim (`.claude/Features/ViewTypesPM.md:52`) matches the code.

#### Task 3: Group

`groupable(t)` is `specOf(t)?.groups === true` (`Core/Properties/properties.ts:72-73`), set only on `dateTime`, `select`, and `status` (`:36-39`). GroupFrame lists `schemaTargets(schema, (d) => groupable(d.type))` (`Core/Views/Settings/GroupFrame.tsx:152`), and `groupPlan` falls back to structural when a saved `group` or `sub_group` names a non-groupable property (`Core/Views/Pipeline/group.ts:388-405`, `:399-404`). A Text spec with no `groups` flag is therefore excluded from Group By and Sub-Group with no frame edit.

`bucketKey` (`group.ts:174-195`) returns `null` for `number`, `multiSelect`, `context`, `link`, `file`, and `null` (`:188-194`). It is reached even without grouping: `reassignBySortRun` keys sort runs through `bucketKey(row, ..., 'day')` (`Core/Views/Host/useViewHost.ts:188-196`). A Text arm is compile-required; "carries no `groups` flag" holds for behavior, not for typecheck.

#### Task 4: Creation Seeds

Two separate gates seed a new page's values.

| Gate | Location | Trigger | Kinds That Seed |
| --- | --- | --- | --- |
| Filter seeds | `creationSeeds.ts:11-62`, called at `useViewCreation.ts:85-88` | Every create in a filtered view | `multiSelect`/`context` on `containsAny`/`containsAll` (Multi-Select's Is Any / Is All, Context's Contains); any kind whose `FROM_GROUP_KEY` entry is a function on `is` |
| Sort seeds | `useViewCreation.ts:31-40`, applied at `:214-219` | New Page Above / Below only | `SEEDS_FROM_SORT` true: `select`, `checkbox`, `number`, `dateTime` |

`ruleSeed` routes every scalar kind's `is` rule through `groupKeyToValue(operands[0], type)` (`creationSeeds.ts:24-31`), and `groupKeyToValue` returns `FROM_GROUP_KEY[kind]?.(key) ?? null` (`Core/Views/reassign.ts:17-30`). `FROM_GROUP_KEY` holds functions for `select` and `checkbox` only (`reassign.ts:6-15`); `number`, `dateTime`, and `link` are `null`. A Number `Is` filter rule therefore seeds nothing. The "Select, Status, Checkbox, Number, Date" list in the doc (`ViewTypesPM.md:14`) describes the sort gate, which copies the anchor row's existing value (`useViewCreation.ts:216-218`), and the doc's own filter sentence on the same line lists Select, Status, Checkbox, Multi-Select, and Context, which matches the code.

**What the Code Would Allow:** a Text `Is` rule seeds exactly when `FROM_GROUP_KEY.text` is a function, which is Select's route, with no Number precedent behind it. `FROM_GROUP_KEY` also backs `reassignable` (`reassign.ts:22-23`), which gates band reassign (`useViewHost.ts:70`) and arms `sortReassign` (`useViewHost.ts:99-108`) for a single sort key whose column is shown; a function entry would let a row drag inside a Text-sorted run rewrite that row's Text value, keyed by `bucketKey`, which returns `null` for Text unless it also gains a real arm. `SEEDS_FROM_SORT.text = true` would copy the neighbor's full string into the newborn on New Page Above / Below; Link sits at `false` (`useViewCreation.ts:38`).

#### Task 5: Saved-View Schema, Column Styles, and Frames

**Column Styles:** `column_styles` is a per-column-id map (`Core/Views/views.ts:252`) whose entry is `columnStyle` (`Core/Properties/columnStyles.ts:76-86`): `look` from the union `COLUMN_LOOKS` (option, checkbox, link display, number looks at `:15-20`) plus three date fields. The decoder doesn't validate a look against the column's type. `defaultStyleFor` gives looks to `select`/`multiSelect`, `checkbox`, `link` (the def's `link_display`), and `number`, and `{}` to `dateTime`, `context`, and `file` (`:133-154`). A Text type with no look of its own needs no schema or enum change; it needs a `case 'text'` in the `{}` group.

**Style Submenu:** `openHeaderMenu` builds a style context for every declared type except Title and Context (`Core/Views/Table/useColumns.ts:310-314`). `styleMenuItems` returns `[]` for `context` and `file` (`Core/Actions/columnMenu.ts:89-91`), and `styleBranch` drops the row when the submenu is empty (`:95-98`), so a `[]` Text arm shows no Style entry, only Align, Icon, and Hide (`:100-109`). `styleMenuLabel` names the row Format for `link` and `number` and Style otherwise (`:40-42`).

**Widths and Alignment:** `WIDTHS` (`useColumns.ts:32-45`) and `DEFAULT_ALIGN` (`:102-115`) are complete records that need a Text entry; Link is `{ min: 100, default: 140, max: 350 }` and `'left'`. Only Title is uncapped (`:30-33`). `STYLE_MIN` is `Partial` (`:51-56`) and needs nothing.

**`wrap_titles` End to End:**

| Step | Location |
| --- | --- |
| Schema | `views.ts:261` (`z.boolean().optional()`) |
| Default | `VIEW_DEFAULTS.wrap_titles: false` (`views.ts:299`) |
| Cascade role | `ROLES.wrap_titles: 'none'` (`Core/Nexus/configReach.ts:70`) |
| Frame | Cards switches only (`Core/Views/Settings/LayoutFrame.tsx:55-64`, `:58`); `TABLE_LAYOUT` holds Column Icons, Hide Borders, Page Icons (`:43-51`) |
| Renderer | `CardTitle mode={... ? 'wrap' : 'scroll'}` (`Core/Views/Cards/CardsView.tsx:776`) |
| CSS | `is-wrap` class (`UIX/Cards/Card.tsx:72`) → `.card-title.is-wrap { display: inline }` (`UIX/Cards/cards.css:143-145`) |

A Table wrap toggle as a new `SavedView` boolean registers in four places, two of them compile-enforced: the zod schema (`views.ts:241-278`); `VIEW_DEFAULTS`, since `ViewFlag` maps every boolean field into `DefaultedOption` and `ViewDefaults` requires each key (`views.ts:281-311`); `ROLES`, declared `satisfies Record<keyof SavedView, Role>` (`configReach.ts:86`); and the `TABLE_LAYOUT` switch list, whose `SwitchEntry.key` is typed `ViewFlag` (`Core/Views/Settings/switchRows.tsx:9`) and so admits the new key without requiring it. Reusing `wrap_titles` for Table registers only in `TABLE_LAYOUT`; the Table renderer reading the flag and a cell rule overriding `.data-cell`'s `nowrap` are needed under either key.

Table cells are `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` (`UIX/Table/table.css:70-77`); `nowrap` collapses an embedded `\n` to a single space, so a multi-line value renders as one line today, and a plain `normal` wrap would also collapse it (keeping line breaks needs `pre-line` or `pre-wrap`). No row-height token exists (`UIX/Table/table-tokens.css:2-28`), and no virtualizer appears under `Core/Views` or `UIX/Table` (the only `useVirtualizer` hit is `UIX/Pickers/IconPicker.tsx`), so variable-height rows meet no fixed layout contract in this slice.

**Type Enumerations:** beyond the cascade table, the frames enumerate by predicate: Filter by `operatorsFor(...).length > 0` (`filterModel.ts:191`), Sort by `origin === 'user'` (`SortFrame.tsx:85`), Group by `groupable` (`GroupFrame.tsx:152`). Column resolution is type-agnostic (`Core/Views/Pipeline/columns.ts:11-47`). The saved-view schema holds no per-type field; a Text type registers with no `SavedView` key.

**Matrix:** the Matrix mounts the same `FilterFrame` over the nexus-wide registry (`Core/Matrix/MatrixMenu.tsx:128-134`) and runs `applyFilter` over every page row (`Core/Matrix/matrixInput.ts:104`). For Space rows, `answers` keeps a rule by property origin (`matrixInput.ts:68-88`): a user-origin rule answers when it is operandless or the Space's sidecar holds the key (`:82-86`), so a Text property set on a Space participates.

**View Search:** search matches `matchScore` against `foldKey(row.title)` only (`Core/Views/Pipeline/search.ts:4-14`, `Core/Views/Host/useViewHost.ts:89-96`); a Text value plays no part in it.

#### Tensions

| # | Tension | Finding |
| --- | --- | --- |
| 1 | Unsortable Text would be the one type behaving differently | **Confirmed, with nuance:** Context already returns `null` in `buildCriterion` (`sort.ts:104-106`), but escapes Sort By through its origin; an unsortable user-origin Text needs a new exclusion predicate at `SortFrame.tsx:85`, while a sortable one is one arm each in three switches |
| 2 | Text getting fewer ops than Link | **Confirmed:** the only difference would be a new op array; evaluator, value slot, and targets are shared. The is/isNot exact vs substring-folded split already applies to Link and Title |
| 3 | Cascade | **Confirmed in slice:** sixteen compile-required sites (*§Cascade Table*), including `bucketKey` and `directionOptions`, which a "Text doesn't group / doesn't sort" design still has to fill. Option-rename and gone-cascades (`configReach.ts:137-148`) key on options and Sets and never reach a Text rule; no property-type change exists to re-validate rules |
| 4 | Validation | **Can't speak** beyond the filter operand being any string (`views.ts:88`), trimmed when the pane writes it (`FilterFrame.tsx:489`, `EditableInput.tsx:97`) |
| 5 | Single vs multi-line | `foldKey` keeps newlines; `startsWith` tests the first line; pane operands are single-line; Table cells collapse `\n` to a space under `nowrap` (`table.css:76`) |
| 6 | Table glyph | `TYPE_META` needs an icon for Text; Title holds `text-align-justify` (`PropertyTypes.tsx:22`) |
| 7 | Native menu | A `[]` arm in `styleMenuItems` shows no Style row, the Context/File precedent (`columnMenu.ts:89-98`); `baseCellMenu` (`cellMenu.ts:65`) sits outside this slice |
| 8 | Non-string adoption | **Can't speak** to the decode; downstream, a value that decodes to `NULL_VALUE` reads as Is Empty in filters and `''` in sort, as Link's string-only arm does today (`propertyValue.ts:77-79`) |
| 9 | Foreign recognition | **Can't speak** |

#### Missing

- No narrower text op list exists; `TEXT_OPS` (`filterModel.ts:91-97`) and `EMPTIES` (`:86-89`) are the only text-family constants.
- No case-folded `is` / `isNot` path exists for free-typed strings; `evaluateText` folds only the substring ops (`filter.ts:253-262`).
- No `contains` operand list: substring ops read `want[0]` alone (`filter.ts:258-262`).
- No sortability predicate exists; Sort By lists by origin (`SortFrame.tsx:85`).
- No filter-rule seed exists for a free-typed value; `FROM_GROUP_KEY` holds functions for `select` and `checkbox` only (`reassign.ts:6-15`).
- No Table wrap option exists; `wrap_titles` is Cards-only (`LayoutFrame.tsx:58`) and table cells are `nowrap` (`table.css:76`).
- View search covers titles only (`search.ts:4-14`).
- The doc's filter table (`.claude/Features/ViewTypesPM.md:28-39`) has no Link row, though Link carries `[...TEXT_OPS, ...EMPTIES]` (`filterModel.ts:162`).
