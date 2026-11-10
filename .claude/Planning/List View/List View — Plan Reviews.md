### List View — Plan Reviews

Each wave's findings, what folded into *List View — Implementation Plan*, and what didn't, with the reason. Each finding was checked against the tree before it folded.

#### Wave One · Outward (`opus-xhigh`)

**Simplification:** 20 findings (1 High, 7 Medium, 12 Low), read against the tree with one compile (the reshaped frame file under `Core/tsconfig.src.json`) and a scripted count of the plan's diff blocks.

**Folded:**

- **`SidesFrame`'s Derivation (H1):** it restated `VisibilityFrame`'s column resolution, hidden set, labels, and hide toggle, sharing only the row. `VisibilityFrame.tsx` now exports `propertyPane`, the one derivation both panes read; `VisibilityGroups` and the inline derivation leave; `PropertyPaneProps` names the pane's props once in `ViewPane.tsx`. Tasks 5-2, 6-1.
- **The Ghost Row (M1):** both kinds wired `GhostRow` identically, so the shell stays inside `BandRows`, which already holds what it wires, and a kind hands the walk its ghost's cells. The frame keeps seven exports with `rowOpen` in. Tasks 2-2, 6-2.
- **The Title's Open (M2):** `rowOpen` beside `rowMenu`, called by Table's title cell and List's title. Tasks 2-2, 6-2.
- **`switchesAtRoot` (M4):** it overlapped `leaf` and let a record spell a Layout leaf that draws nothing. `leaf` takes a third member, `'pane'`, in its place. Task 6-3.
- **`held` (M5):** eight sites write `data-reveal-held` raw, so `AccessoryButton` forwards that attribute and `tabIndex` under their own names. Tasks 4-1, 6-2.
- **`SeatedValue`'s `commit` (M6):** every caller passed its seat's own commit; `useValueSeat` answers `commit` and the prop leaves. Its props no longer name the panel's `data-property-row`, and Task 3-1's NOW no longer says a test alone reads it (`PropertyPanel.tsx:76-77,83` does). Task 3-1.
- **The Seat's Anchor (L1):** `seatOf` in `SeatedValue.tsx`, read by Cards and List. Tasks 3-1, 6-2.
- **The Add Count (M3, in part):** `addable` sits beside `addColumns` in the pipeline, with a case pinning it to that list. Tasks 3-2, 6-2.
- **Smaller Folds:** the grip's `top` and `height` join the existing `.row-grip, .row-check` block (L4); `connectionMenuModel` keeps `format` and adds a flat `look` (L5); the pane's sheet composes `frameZone` and reads `--drag-floor` (L6); `COLUMN` and `DEFAULT_SIDE` replace two of three things named `SIDES`, and List's knobs take `--list-view-*`, clear of the theme's `--list-outline-*` (L7); Task 5-1's title claims what it does (L8); three comments the work makes false join *§Reconciliation* with their edits (L9); the segment's height carries its reason, and *§Constraints* stops calling it a token (L3); `.card-value` is named as Cards' scope (L12); the file is `RowFrame.tsx`; *The Number* is recounted and the underived "330" is gone (L11); Open Item 2 states I-5's real obstacle.

**Not Taken:**

- **A Host `drawn` and `canAdd` on `ItemApi` (M3):** Cards' drag overlay draws a card through an inert API, so the row itself holds the draw rule, and a host `drawn` would have one reader. A `canAdd` read through the stable API wouldn't re-render a memoized row when the schema gains a property; the `fields` prop does.
- **`growToContent` on the Pane (M7):** the live check measured the pane at 408px through `FrameSlide`, which sizes a slot to its content; the two tracks' maxima set that width. `growToContent` serves a pane whose rows would otherwise collapse onto its widest one.
- **The Rail as One Implementation (L2):** a band's body takes no class from its kind, so List's `::before` stays a third reader of the outline tokens; the Phase 6 checkpoint names it as deliberate.
- **Fewer Doc Comments (L10):** the two that restated a name left with their code; the rest state a rule the code doesn't (`sideColumn`, `sideDrop`, the title's floor).
- **`// PLACEHOLDER` on Title's Eye:** it's the tree's marker and moves with its code.

**Adversarial:** 7 findings (0 High, 3 Medium, 4 Low). The reviewer applied every AFTER block of Phases 1 to 6 to an export of `4b18149ac`, one commit per phase, and ran the gates there: five in-repo type projects clean, `electron-vite build` passing, 9,267 tests passing with 2 failing, and 2 lint errors; so its Medium findings were executed rather than read. No import cycle runs through `viewKinds.ts`, `listKind.ts`, `SidesFrame.tsx`, or the frame.

**Folded:**

- **Two Red Suites (M1):** `cardGestures.test.tsx:344` and `cellGestures.test.tsx:453` assert a link value's whole menu, which gains the Format row; both are named in Task 4-3 as written-first cases and in *§Reconciliation*.
- **`SidesFrame`'s Lint (M2):** its two `div`s holding a context menu take the tree's own `biome-ignore` reason (`TableView.tsx:179`). Task 6-1.
- **The Grip's First Line (M3):** `height: 1lh` assumed a line of text, and a first line holding a 20px chip or **+** is taller, so the grip sat 2px high on nearly every List row and moved on Table's chip rows and the Archive's first row. The shared rule now reads `--row-first-line`, falling back to the cell's content box, which is today's center exactly; List's sheet states the token at 20px and stands each of its lines that tall. Nothing outside List moves, so the plan names four behavior changes rather than five, and every List row is one height whether or not it draws a **+**. Tasks 4-4, 6-2.
- **`Segments`' Consumers and Keys (L1 and an observation):** its real consumers are the notification bar and a page-history caption, which Task 4-2's VERIFY now measures. The component keyed its parts by index, so a value appearing ahead of others on a List row would remount every later one; a part now keeps its own key. Task 4-2.
- **Smaller Folds:** the Views Drive's selector drops `.group-band-add` (L2); three VERIFY greps read as they run (L3); `TableView`'s destructure loses `groups`, `bands`, and `disclosure`, and its import of the frame is shown (L4); two edges of the scrolling left group, the **+** clipped with its tail and a mouse wheel over a value, are stated under *§Open Items* for the Stop.

**Not Taken:** nothing.

**Net Effect:** the frame file is `RowFrame.tsx` with seven exports; the two property panes read one derivation; `leaf` is one three-member union; four behavior changes are named outside List rather than five; the estimate reads about +1,120 / −485.

#### Wave Two · Inward (`opus-xhigh`)

**Executor Read:** 23 findings (2 High, 10 Medium, 11 Low). The reviewer applied every AFTER block of Tasks 1-1 to 6-3 in order in an export of `4b18149ac`, one commit per task, and ran the gates after each: every block applies, and the gates end green at 6-3 (548 files, 9,296 tests, the build passing), with five tasks ending red or unable to meet their own VERIFY along the way. **Simplification:** 12 findings (0 High, 5 Medium, 7 Low).

**Folded:**

- **List's Tests (executor H1, H2):** `ListView.test.tsx` mounts through the harness, which draws a List view as a Table until the record registers, so its cases couldn't go red-then-green in Task 6-2; they move to Task 6-3. List's `ViewFrame` case was a row in a table whose body passed with or without the registration; it's its own `it`, asserting the switches at the root and the two headings under Layout.
- **Phase 3's Tasks (executor M1, M2 · simplification 3):** Task 3-1 imported `seatOf` two tasks before Cards used it, and Task 3-2 deleted helpers the policy still called. Cards' `anchor: seatOf` line lands in Task 3-1, and Tasks 3-2 and 3-3 are one task, so every task ends green.
- **`propertyPane`'s Lookups (simplification 1):** Wave One's fold left both panes building an id-to-column map to feed the drag kit. `label` and `icon` stay id-keyed, as today's file has them, and both maps leave. Task 6-1.
- **`addable` (simplification 2):** half its rule, the count of an item's fields, sat in `ListView` where no test could pin it. It takes the schema and the Contexts map a row's `ctx` already holds, lands in Task 6-2 beside its one reader, and `fields` and `identity` leave `ListView`.
- **Comments (simplification 4 · executor L8):** nine doc comments that restated a name leave, and *§Constraints · Comments* states the rule the blocks follow rather than "fewer than the tree holds", which measurement contradicted.
- **The Documentation Phase (simplification 5 · executor L7):** *§List* states sides as a rule rather than per type, drops the Title Icons sentence, and leaves the switches' place to the Layout bullet, whose second sentence was already untrue of Cards. The drag exception moves to the sentence it would make false, `PommoraDND.md:38`. Two clauses the work makes stale (`ViewTypesPM.md:79`, `:95`) and one repeated one (`:161`) leave, so the edits outside *§List* cut about what they add. `PropertiesPM.md:115` joins.
- **The Drive (executor M9):** group 11 needs its dispatch entry, a `bc` or `reg` owner per case, token reads in place of tuned literals, a baseline tally recorded before Phase 1, and a review checkpoint of its own. Task 7-1.
- **Process (executor M6, M7, M8, M10, L9, L10):** the view-delta command takes `--save`, which is where the Actionable column prints; each task commits on green; the executor's brief carries *§Constraints*, the settled items, and the Decisions' path; Live Driving names the fixture a check seeds and that a comparison captures its "before" first; the Stop says who writes the tuned values and that they commit inside Phase 6.
- **Smaller Folds:** `ListRow` reads `sideFor` from the view rather than a memoized map (simplification 6); Task 5-2 writes the Layout leaf's final order, so Task 6-3 touches its footer alone (7); *§Concepts* gains `--row-first-line` (8); the A-4 absence test leaves (9 · executor L6); `sideDrop` runs `nextOrder` for Right alone, and its Right case and doc say "just before the row drawn above it in the order" (11 · executor M4); the shell sheet is `table-shell.css`, after its class (12); `Segments`' index-key suppression leaves and its test names the jsdom environment (executor M3, L3); Task 1-1's live check uses four properties, which tells the old body from the new (executor M5); `configReach.test.ts` asserts the side's cleanup (executor L4); the estimate is the executor's measurement, about +1,120 / −505.

**Not Taken:**

- **Reading the Tree at Call Time in `add.columns`:** the hook's subscription keeps an open Add list live as the tree changes, at the cost of one selector beside the two already in that hook tree.
- **Folding `editor` into `SeatedValue`:** a row holds `editing` to re-render when its field opens; the reviewer raised it and advised leaving it.

**Net Effect:** 17 tasks across 8 phases, each ending green; the two panes share one derivation with no lookup of their own; the estimate is measured rather than counted.

#### Wave Three · Both Ways (`fable-high`)

**Findings:** 10 (3 Medium, 7 Low). The reviewer traced each of the roughly 45 folds from Waves One and Two into the plan and the code it lands on; 42 hold with no residue, and no declined item was overturned. Every decision from A-1 to J-6 has a task that delivers it as written, apart from the three the plan discloses.

**Folded:**

- **I-5 as Written (findings 2, 3):** Wave One's fold put List's switch placement on a third `leaf` member, which three sites then read by one-member tests against the project's "unions plus exhaustive switches" rule. The reviewer showed the decision is deliverable as ratified at the cost of one small file: `switchRows`, the mapping from a kind's switch entries to their rows, in `Core/Views/Settings/switchRows.ts`, off the registry's import path. List's `switches` is empty, its three switches ride `rows`, `leaf` keeps two members, and `kindRows` is untouched. The deviation leaves *§Open Items*, and the file joins *Placements for Nathan* with the no-new-file alternative beside it. Tasks 5-2, 6-3.
- **The Ghost's Height (finding 1):** List's ghost title sat outside the group that floors a line at 20px, so the hover and standing ghosts would have stood 2 to 4px short of a row. The title sits in a `.list-view-group`, and Task 6-3's width check reads the ghosts' height. Task 6-2.
- **H-3's Chevron (finding 4):** the plan anchors the grip and the check and leaves the chevron centered; that's now stated under *Open at Ratification*.
- **Smaller Folds:** the Frozen list's "apart from nothing" (5); the pen's room is named once in `cells.css` as `--pen-box`, which List reads whole (6); the bar-look width is a KNOB tuned at the Stop (7); the Properties, Text Property, Option Picker, and Archive Drives take baseline tallies and re-run at the Own pass (8); the Neutral Gate's intention names the two I-7 deferrals (9); `ViewTypesPM.md:113`'s Right Inset row joins Task 8-1 (10); List's classes take the `list-view-` prefix, and the pane's knob and side list are `PANE` and `SIDE_COLUMNS`; the sheet's pen comment says a List value takes Table's in-cell form.
- **From the Cross-Check of the Investigation and Scout Findings:** the row component is `ListPageRow`, since `UIX/Menus/useListEdit.ts:4` exports a `ListRow`; `PommoraUIX.md:393` gains ListView; Task 6-3 reads a wrapped row inside its band; the Decisions' settled Open Items are listed under *§Reconciliation* for removal at ratification.

**Not Taken:**

- **Pruning `column_sides` to Non-Default Picks:** the map follows `column_alignments`, the shape it's modeled on, which keeps a stored pick that equals its default; Task 6-1 says so.
- **Naming `leaf`'s Members for What Layout Opens:** the union keeps its two members and one reader, so the names stay.

**Verdict, Quoted:** "Ratify once the listed findings fold. … a reader who saw both would prefer the after, and I'd inherit it. Table stops owning the row, the Archive stops importing a kind's sheet, the clickable value and the add, show, and hide rules each exist once, a hidden property keeps the place `hideShown`'s comment already promised, and List arrives as presentation over shared pieces rather than a third copy."

**The Confirming Read (`fable-high`):** because finding 3's fold changed a mechanism after the read, a second neutral reviewer traced the 16 Wave Three folds and built the changed slice in an export (Tasks 1-1, 5-1, 5-2, 6-1, 6-3, and Task 6-2's saved-view fields): six type projects clean, the build passing, 9,274 tests passing with five List cases of its own through both doors, and no import cycle through `viewKinds.ts`. 13 folds held with no residue and 3 with residue. **Findings:** 6 (1 Medium, 5 Low), all folded: Task 6-3's `LayoutFrame.tsx` hunk left `viewOption` imported and unused, which lint prints as a warning; *The Number*'s Phase 6 figures follow the blocks as written; the `switchRows.ts` placement bullet and its heading read exactly; the Decisions' Open Item 2 is carried rather than settled; the pen's room is `--pen-span`; Task 6-3's VERIFY repeats the cycle scan.

**Verdict, Quoted:** "Ratify once the listed findings fold. … The fold that changed a mechanism holds: with `switchRows`, List's record states I-5 as ratified, `leaf` stays a two-member union with one reader, and the slice I built from the plan's blocks typechecks, builds, and passes every existing test plus five List cases through both doors. A reader who saw the codebase before this work and after it would prefer the after, and I'd inherit it."

**After the Third Wave:** *List View — Investigation* and *List View — Scout Findings* were brought into agreement with the plan from an `opus-high` cross-check: 70 statements (16 and 54) replaced or removed in place.

#### What the Reviews Did and Didn't Prove

- **Executed:** the plan as it stood after Wave One was applied whole, Tasks 1-1 to 6-3 in order, and ended green. The plan as it stood after Wave Three's folds was applied for Tasks 1-1, 5-1, 5-2, 6-1, 6-3, and Task 6-2's saved-view fields, and ended green.
- **Read, Not Compiled, in Its Final Form:** Task 6-2's renderer and sheet, which changed after its one build (the `view` prop in place of the side map, `addable`'s signature, the ghost's wrapper, the `list-view-` class names, `--pen-span`), and Wave Two's reshaping of Phases 3 and 4.
- **Read by No Reviewer:** the confirming read's own six folds, each a line or a sentence, and the 11-10-2026 fold of B-12 on the owner's word: the row padding and the wrapped line's gap on List's sheet, with their VERIFY and drive lines. The padding was measured on a Table (*List View — Live Checks*).
- **Both Neutral Verdicts Were Conditional,** "Ratify once the listed findings fold", and the listed findings folded. No third neutral read ran.

