### Properties Restructure — Execution Log

**SOURCE:** *Properties Restructure — Implementation Plan*

What the plan's rules record while it runs, so the plan file stays as `plan_replay.py apply` reads it. The closing report draws on each section.

#### Deferred Folds

One line per fold found in a file a later task touches: the file, what folds, and why. Post-Plan Wave One's outward pass starts here.

- **`.claude/scripts/drive-harness.mjs` and the Properties, Archive, and Path Links Drives (Closeout P1–P2):** the result ledger and per-group tally (`item`) are copied word for word across the drives beside the harness's own `check()`, `viewFrame` repeats the first half of the Metadata Drive's `openEditor`, and `PORTAL_ROWS` is its `FORMAT_ROWS`; they fold into the harness, about −20 lines a drive, deferred since later tasks grow the Properties Drive.
- **`Core/Views/viewRow.ts:29`, `Core/Views/Pipeline/columns.ts:9` (Closeout P1–P2):** the column kind still reads `'stamp'` for the two time columns while the type record's origin reads `'filedata'` with Title inside it, and comments at `value.ts:36`, `valueClick.ts:1,20`, and `cardValueInput.ts:12` still say "the stamps"; one name per set, deferred since Phase 13 rewrites these readers.
- **`schemaTargets` (Closeout P1–P2):** `schemaTargets(schema, () => true)` at `SortFrame.tsx:86` and `PropertyPanel.tsx:208` is what's left of the removed user-origin filter, and the stamp pair is spelled by hand at `visibilityModel.ts:18`, `SortFrame.tsx:83-85`, and `filterModel.ts:140-141` (with `previewRules.ts:30`) where one derived list served before; an optional `qualifies` and one list from `FILEDATA` fold them, deferred since Phase 3 moves `schemaTargets` and later phases rewrite these frames.
- **`Core/Properties/registryProperty.ts:33` (Closeout P1–P2):** `defaultStatusSeed` is exported only for tests, as `numberDivisor` was before 1-7 closed it; deferred since Phase 8 touches the seed.
- **`Core/Properties/validation.ts:73` (Closeout P1–P2):** `isReservedPropertyId` has one production reader left and could inline; deferred since later phases touch the gates.
- **`Core/Properties/Schema/PropertyFrame.tsx:281-282` (Closeout P1–P2):** `schema.find(…) ?? unassigned.find(…)` is `registry.find(…)` now that `props` is gone, −1; deferred since later tasks rewrite PropertyFrame.
- **`Core/Properties/properties.ts:50` (Closeout P1–P2):** `isUserType` narrows to a `PropertyType` that still holds `'context'`; narrowing to `Exclude<PropertyType, 'context'>` makes the name true, deferred to Phase 3's type records.

#### Measurement Outcomes

#### Scan and Conversion Records

#### Executor Insights

- **Phase 2, Task 2-4:** the AFTER removed `RESERVED_PROPERTY_ID` while leaving `Core/Views/Pipeline/sort.ts` importing it until Task 2-5, so 2-4's head failed typecheck; 2-4 pointed `sort.ts` at `FILEDATA.title.id`, and 2-5 completed its two `sort.ts` hunks by hand.
- **Phase 2, Task 2-8:** the drive's `Drive Filedata` view sets `hide_column_icons: false`, since the view default hides header glyphs and the header check found none; `viewFrame` clicks the Settings button only while it's unpressed, since the button toggles the panel and the frame row list stays visible inside a frame.
