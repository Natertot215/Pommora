### Properties Restructure — Execution Log

**SOURCE:** *Properties Restructure — Implementation Plan*

What the plan's rules record while it runs, so the plan file stays as `plan_replay.py apply` reads it. The closing report draws on each section.

#### Deferred Folds

One line per fold found in a file a later task touches: the file, what folds, and why. Post-Plan Wave One's outward pass starts here.

- **`.claude/scripts/drive-harness.mjs` and the Properties, Archive, and Path Links Drives (Closeout P1–P2):** the result ledger and per-group tally (`item`) are copied word for word across the drives beside the harness's own `check()`, `viewFrame` repeats the first half of the Metadata Drive's `openEditor`, and `PORTAL_ROWS` is its `FORMAT_ROWS`; they fold into the harness, about −20 lines a drive, deferred since later tasks grow the Properties Drive.
- **`Core/Views/viewRow.ts:29`, `Core/Views/Pipeline/columns.ts:9` (Closeout P1–P2):** the column kind still reads `'stamp'` for the two time columns while the type record's origin reads `'filedata'` with Title inside it, and the comments at `value.ts:36` and `valueClick.ts:1,20` and the test title at `cardValueInput.test.ts:115` still say "the stamps"; one name per set, deferred since Phase 13 rewrites these readers.
- **`schemaTargets` (Closeout P1–P2):** `schemaTargets(schema, () => true)` at `SortFrame.tsx:86` and `PropertyPanel.tsx:208` is what's left of the removed user-origin filter, and the stamp pair is spelled by hand at `visibilityModel.ts:18`, `SortFrame.tsx:83-85`, and `filterModel.ts:140-141` (with `previewRules.ts:30`) where one derived list served before; an optional `qualifies` and one list from `FILEDATA` fold them, deferred since Phase 3 moves `schemaTargets` and later phases rewrite these frames.
- **`Core/Properties/registryProperty.ts:33` (Closeout P1–P2):** `defaultStatusSeed` is exported only for tests, as `numberDivisor` was before 1-7 closed it; deferred since Phase 8 touches the seed.
- **`Core/Properties/validation.ts:73` (Closeout P1–P2):** `isReservedPropertyId` has one production reader left and could inline; deferred since later phases touch the gates.
- **`Core/Properties/Schema/PropertyFrame.tsx:281-282` (Closeout P1–P2):** `schema.find(…) ?? unassigned.find(…)` is `registry.find(…)` now that `props` is gone, −1; deferred since later tasks rewrite PropertyFrame.
- **`Core/Properties/properties.ts:55-58` (Closeouts P1–P2 and P3):** `isUserType` narrows to a `PropertyType` that still holds `'context'`, so `CREATABLE_TYPES` admits it by type and `properties.test.ts:185-188` casts around it; `isUserType = (t: PropertyType): t is Exclude<PropertyType, 'context'> => PROPERTY_TYPES[t].origin === 'user'` with `CREATABLE_TYPES = typeIds.options.filter(isUserType)` makes the name true, drops the cast and the `isKeyOf` import, about −1, deferred since later blocks touch `properties.ts`.

- **`Core/Properties/displayLabels.ts:12-15` (Closeout P3):** `pickerOptions` is a generic values-and-labels builder typed on UIX's `PickerOption`, read by `Settings/frames.ts:198,875,881` for Settings-only pickers; it belongs beside `PickerOption` in `UIX/Pickers/PickerControl.tsx` with its test, ±0, deferred since later blocks touch both files.
- **`Core/Views/Cards/CardsView.tsx:216-218`, `cardValueInput.ts:28-30` (Closeout P3):** the compact-card blank rule is written twice, each hand-rolling `specOf(ctx.schema.find(…)?.type)?.blankDraws`; one predicate, or CardsView asking `shownColumnsFor`, about −2, taken where Task 9-2 re-points CardsView, after checking a Title column can't reach the value picker.
- **`propertiesRegistry.ts:72`, `assignment.ts:93`, `restoreProperty.ts:66` (Closeout P3):** "is this a link definition" is `linkDefsOf` in one place and inlined `PROPERTY_TYPES[def.type].connections === 'value'` in two; one per-definition predicate beside `linkDefsOf`, about −1, deferred.
- **`LinkEditor.tsx:52`, `NumberEditor.tsx:139`, `CheckboxEditor.tsx:43`, `PropertyFrame.tsx:413` (Closeout P3):** the pane spells "Style" and "Format" as literals where `styleLabel(type)` states the look-menu name; Phase 17's `typeRows.tsx` reads `styleLabel`, words unchanged.
- **`Core/Properties/columnStyles.ts:6-8,18-31` (Closeout P3):** `CHECKBOX_LOOKS`, `NUMBER_LOOKS`, and `OPTION_LOOKS` are second names for `LOOKS.checkbox`, `.number`, and `.select`, kept alive by three editors and four `PropertyFrame` sites; read through `LOOKS` and keep the lists module-private, with Task 14-3's blocks adjusted, since they bring the named lists back.
- **`Core/Nexus/fileEvents.ts:528-532` (Closeout P3):** `!p || PROPERTY_TYPES[p.type].registersMembers !== true` is `!specOf(p?.type)?.registersMembers`, as `optionOps.ts:133` reads it, about −2, deferred.
- **`Core/Properties/Cells/OptionChip.test.tsx:33-47` (Closeout P3):** "falls back to the upcoming glyph" now misdescribes `optionGlyph`, whose fallback reads `chipOf(type).glyph`, and `:33-35` repeats `typeDisplay.test.ts`' glyph checks; retitle and collapse where Task 4A-3 edits `optionGlyph`, if no later task touches the test file.
- **`.claude/scripts/Properties Drive/live-drive.mjs:104,135` (Closeout P3):** group 1 leaves the view settings panel open and group 2 closes it; group 1 closing what it opened drops group 2's line, deferred since later tasks grow the drive.
- **"Display" (Closeout P3):** the word names a link's look (`LinkDisplay`), the renderer type record (`typeDisplay.ts`), and the renderer label tables (`displayLabels.ts`); one meaning per name is Post-Plan Wave One's to settle.

#### Measurement Outcomes

#### Scan and Conversion Records

#### Executor Insights

- **Phase 2, Task 2-4:** the AFTER removed `RESERVED_PROPERTY_ID` while leaving `Core/Views/Pipeline/sort.ts` importing it until Task 2-5, so 2-4's head failed typecheck; 2-4 pointed `sort.ts` at `FILEDATA.title.id`, and 2-5 completed its two `sort.ts` hunks by hand.
- **Phase 2, Task 2-8:** the drive's `Drive Filedata` view sets `hide_column_icons: false`, since the view default hides header glyphs and the header check found none; `viewFrame` clicks the Settings button only while it's unpressed, since the button toggles the panel and the frame row list stays visible inside a frame.
- **Phase 3, Task 3-5:** `Core/Actions/cellMenu.test.ts`' "style-only: the per-type Format ▸ row alone" pinned a Number cell's look menu as Format, which I-4 changes, though VERIFY listed the file as passing unchanged; it reads "the per-type Style ▸ row alone" with `['Style']`, and committed with 3-5. `apply` refused `PropertyFrame.tsx`' import hunk, since Biome had joined the import onto one line in 3-4; it was finished by hand.
- **Phase 3, Task 3-9:** group 2 closes the view settings panel after opening Collection A, since group 1 leaves it open over the right-hand headers and the Link header's right-click popped no menu when both groups ran together. At the phase base, the Number check failed (`Format`) and the Link and tag-glyph checks passed, so those two are regression guards.
