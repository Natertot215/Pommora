### Properties Restructure — Execution Log

**SOURCE:** *Properties Restructure — Implementation Plan*

What the plan's rules record while it runs, so the plan file stays as `plan_replay.py apply` reads it. The closing report draws on each section.

#### Deferred Folds

One line per fold found in a file a later task touches: the file, what folds, and why. Post-Plan Wave One's outward pass starts here.

#### Measurement Outcomes

#### Scan and Conversion Records

#### Executor Insights

- **Phase 2, Task 2-4:** the AFTER removed `RESERVED_PROPERTY_ID` while leaving `Core/Views/Pipeline/sort.ts` importing it until Task 2-5, so 2-4's head failed typecheck; 2-4 pointed `sort.ts` at `FILEDATA.title.id`, and 2-5 completed its two `sort.ts` hunks by hand.
- **Phase 2, Task 2-8:** the drive's `Drive Filedata` view sets `hide_column_icons: false`, since the view default hides header glyphs and the header check found none; `viewFrame` clicks the Settings button only while it's unpressed, since the button toggles the panel and the frame row list stays visible inside a frame.
- **Phase 2, Task 2-1:** `check-atlas.mjs` fails from 2-1 on, since `.claude/Features/CorePM.md:111`'s SOURCE line still names `Core/Properties/schema.ts`; Task 18-2 rewrites that line, so the commit hook's drift warning stands until Phase 18 rather than drifting 18-2's block.
