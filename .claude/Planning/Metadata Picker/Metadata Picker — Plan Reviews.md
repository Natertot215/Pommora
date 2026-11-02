### Metadata Picker — Plan Reviews

Each wave's findings, what folded into *Metadata Picker — Implementation Plan*, and what didn't, with the reason. After the third wave, the Investigation and the six reports in `Scouts/Planning/` were brought into agreement with the plan.

#### Wave One · Outward (`opus-xhigh`)

**Simplification:** 23 findings (2 High, 8 Medium, 13 Low). **Adversarial:** 9 findings (4 High, 1 Medium, 4 Low). The adversarial reviewer built Phases 5, 6, and 7 and Tasks 2-6 and 3-2 in a scratch export, so its findings were executed rather than read. Each finding below was checked against the tree before it folded.

**Folded:**

- **`MetadataAction`:** it moves to `pageMenu.ts`. The engine graph counts `import type`, and `pageMenu.ts` is on the engine path, so the plan's import failed `engineGraph.test.ts` 3 of 3. Task 7-1.
- **Phase 6's Tests:** `PageView.test.tsx`, `cardGestures.test.tsx`, and `DetailTitleHeader.test.tsx` went red with no task naming them; each is now named, and `cardGestures`' `beforeEach` resets both pick slots. Tasks 6-2, 6-3, 6-4.
- **`LayoutFrame`'s Prop:** Tasks 5-2 and 5-3 disagreed; it lands once, in Task 5-3. `viewWrite.test.tsx` joins Task 5-2.
- **`suppressReleaseClick`'s Import:** `../Interactions/shared`, not `dismissalStack`. Task 2-6.
- **`editIcon`:** one closure in both hosts, so `showPageMenu` answers `title:icon` itself and takes `trigger`. Task 7-1.
- **`GhostSuppress`:** it leaves the kit, since Task 7-1 stranded one dead read, one false comment, and one private user.
- **`ViewTile`'s Selector:** `useChoiceOpen(menuAnchorRef)` replaces a DOM-reading selector that also missed portalled rows. Task 6-3.
- **`PinnedGlance`:** its anchor is session state, not persisted as the plan said, so it takes `at`. Task 2-1.
- **`swept`:** off `ValueIntent`, through `run`'s last parameter. Task 4-1.
- **`useHeld`:** leaves `PropertyPicker`, which `PickerMenu` already holds, and joins `IdentityChoice`, whose `triggerRef` the dismissal stack reads through the exit. Tasks 4-1, 6-1.
- **`cellMenu.ts:64-65`:** deleted rather than rewritten, since neither term can be true. Task 7-1.
- **`NexusIconEditors.tsx`:** deleted rather than renamed; `useNexusIcon` returns the cropper as `editor`, as `useBannerMenu` does. This changes Call 10's sixth placement. Task 6-3.
- **`iconFavorites.ts`:** folds into `IdentityChoice.tsx`. Task 6-1.
- **Smaller Folds:** five needless exports; `entryOutcome`'s impossible `!intent`; `GroupKey` and `columnById`; `showEntityMenu`'s null bridge; `ValuePickRequest` picking from `MetadataTarget`; `MenuDoorHost`'s unused mount; `FieldPicker.tsx`'s path; `PropertyValueInput.tsx:38`; `dismissRef`'s placement; `rowEl`'s no-op; `tree`'s dead destructure; five VERIFY lines that couldn't pass; the Feel row, `ViewTypesPM.md:122`, and `CardsView.tsx:261` in *§Reconciliation*; the Adherence overclaim.

**Not Taken:**

- **Simplification Finding 1's Test Approach:** asserting `pendingChoice` in place of mounting `IdentityChoice`. The adversarial reviewer's mount was executed and keeps those tests proving a real picker opens.

**Net Effect:** 9 files leave rather than 7, so five fewer production files rather than three, and the comment budget reads 4 added against 13 removed.

#### Wave Two · Inward (`opus-xhigh`)

**Executor Read:** 32 findings (1 High, 11 Medium, 20 Low), with the barrel codemod and `uixgraph.mjs` executed on a scratch export. **Simplification:** 13 findings (1 High, 4 Medium, 8 Low).

**Folded:**

- **Task 0-1:** four decisions take their restatement whole and nine take it in place of the one clause it corrects, since a literal rewrite would have gutted E-6's fold list, E-2's moves, and D-3's `MenuSeat` clause. Calls map to the decisions they'd change, and a VERIFY line checks every entry still says what it said.
- **`ColorSwatch`:** it reports its press to the one color request, as `PickerControl` already reaches an App-level pane through a door Core sets. Task 1-3 leaves, `Trailing`'s `color` keeps its kind, `ColorPicker` ends with one mount, and the third path from Menus to Pickers is cut in Task 6-3.
- **Task 4-1:** its AFTER no longer restates the patch it applies; the patch plus *Differences From the Patch* is the one statement, and the differences now list `entryOutcome`, `PropertyPicker`'s derived `open`, and Pin 1's settle.
- **Merges:** Task 7-2 into Task 7-1, so `ValuePickRequest.holder` never stands unwritten for a commit; Tasks 5-2 and 5-3, so `LayoutFrame`'s interim props never land.
- **`BASE_FEEL`:** the slide's timing names the base feel `NavWindow` and `PageWindow` already hand-write, and both point at it.
- **Execution Mechanics:** a Run Start block ahead of Task 0-1; drives run after their task's commit; three VERIFY lines moved to the tasks that open their groups; the Net Ledger reads cumulative with each phase's own delta held against its estimate; a Teardown step before the Cold-Machine Check; the codemod's path, roots, and format step; the drives' explicit groups; Task 4-4's Nexus copy and port.
- **Smaller Folds:** `ViewItemAction` and `ViewItemContext` collapse into HEAD's types; `point`'s dead `right`; `ownIconOf`'s page arm after Phase 7; Phase 2's GOAL itemizes its +79; *Adherence* and *Overview* claim only what the tasks deliver; Planning rule 5's "should" on seven lines; `Not Feature-Level` names the trigger rule and the sweep; `store.test.tsx`, `Banner`'s `iconOpen`, `menuAnchorRef`'s owner, the D-2 pin's red watch, `MATRIX.md:154`'s cells, three declaring VERIFY lines, README's group count per task, and four stale anchors.

**Not Taken:**

- **`metadataBranches` Reading the Store:** it keeps HEAD's pure builder, taking `tree`, so its tests need no store.
- **Cutting *§Overview*'s Phase Walk:** it's the summary Nathan reads first.
- **Cutting *Why It Can't Flip-Flop*:** it stops an executor from adding a guard for a state the rule can't produce.

#### Wave Three · Both Ways (`fable-high`)

**Findings:** 5 (1 Medium, 4 Low). The reviewer traced every fold from Waves One and Two into the code it lands on and found each holds; an `engineGraph` run confirmed which `Actions/` files sit on the engine path.

**Folded:**

- **The Matrix Through a Choice:** `MatrixView.tsx:45,82`'s `pickOpen` reads move from Task 6-4 into Task 6-3, since Task 6-3's `:120` needs `menuId` to hold through a choice, and without them the label's anchor unmounts and the trigger rule closes the picker for one commit.
- **Task 7-1's Anchors:** `cellMenu.ts:3-9`, since line 2's import stays, and `pageMenu.ts:2`'s import from `./propertyRows` named as leaving.
- **`IdentityChoice`:** `greyscale` reads `pending`, so `shown` has one reader, the trigger.
- **Smaller:** *Adherence · Reads as Designed*'s clause order; a *§Concepts* row for `ColorSwatch`'s `onPress`.

**Verdict, Quoted:** "Ratify once Findings 1 and 2 fold … a neutral before-and-after reader would prefer the after."
