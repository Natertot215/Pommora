## Metadata Picker — Implementation Plan

**DATE:** 11-02-2026
**STATUS:** Ratified 11-02-2026
**SOURCE:** *Metadata Picker — Decisions & Intention* (ratified 11-01-2026, Decisions A-1 to G-2 and its *§Rejected*), *Metadata Picker — Investigation* and the six reports and `1 — Two Pickers.patch` in `Scouts/Planning/`, all in `.claude/Planning/Metadata Picker/`.

**PLAN REVIEWS:** three waves, folded (*Metadata Picker — Plan Reviews*): Wave One outward, 32 findings; Wave Two inward, 45; Wave Three both ways, 5.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `cb9620327` | 9,078 passed, 2 skipped (548 files) | 11-02-2026 11:31 AM | |

**`~/Test` Hash:** `e5a32a5d30d6a11310cd559ee2b1b84b261c3265` at Run Start.

**Net Ledger** (Actionable column of `view-delta --exclude .claude`; Measured is cumulative from the BASELINE head, and a phase's own delta, its Measured less the row above, is held against its per-phase Estimate):

| Phase | Estimate | Measured |
|---|---|---|
| 0 · Drives and Pins | 0 | 0 (the BASELINE head) |
| 1 · Kit Imports | about −54; −54 built for the barrel | −54 (+101 / −155) |
| 2 · The Pane Shell | about +79 (+195 / −116); +72 built | |
| 3 · Small Folds | about −16; −4 built | |
| 4 · The Two Pickers | about −95; −96 (+386 / −482) built, and the back bar's label +1 | |
| 5 · Settings Panes | about −70 (+46 / −116) | |
| 6 · One Icon and Color Request | about −170 | |
| 7 · Right-Click | about −140 (−125 to −155) | |
| 8 · Closeout | 0 | |
| **Total** | **about −470; 9 files leave, 4 arrive** | |

### Context

Every in-app pane that sets an item's Spaces or property values runs through one value seat (`useValueSeat` and `ValueSeat`), hosted by the Table, Cards, the Properties panel, and the App-level `MenuSeat`. That route grew by patches. The Add list is a prop-switched `chooser` mode inside `PropertyPicker`, reached through `resolveTarget`, `PickEntry`, and two-way commits. What an item can list is decided three times in three orders. The Table's multi-row pick runs its own parallel seat, a page's right-click menu is built and run twice, icon and color pickers keep two summon models across 18 mounts, and a pane that grows keeps the side it first chose, so a calendar on a low card runs past the window. Around these sit a two-way import between `UIX/Menus` and `UIX/Pickers`, a half-used barrel, four back-bar shapes, and settings panes whose height depends on their route.

*§What's True* and *§What's Reusable* in the Investigation state how the code works today, and each was re-read at `16d932567`. The hunks in this plan and the reports were written against that head. Scout 1's patch, the kit's K-4 and K-5, I-042's extraction, the fence, the flip, the trigger rule, Open Item 2, and the panel's commit fold were built together on it: 548 test files, 9,074 passed, 2 skipped, four type projects clean. Scout 4 built K-2, K-6, K-8, K-9, and K-11 in its own copy. Phases 5, 6, and 7, apart from the trigger rule, were read from the code and carry estimates, and Wave One's adversarial reviewer then built them, with Task 2-6, in a scratch export: production code typechecked and linted clean. `ColorSwatch`'s press (Task 6-3) was read from the code.

### Overview

Nine phases should leave one place to start from when assigning an item's metadata. `MetadataPicker` should be the one Add list on cards and in the Properties panel, sliding option lists and the calendar in under one back bar, while `PropertyPicker` should be one value's own picker, and both should draw one `ValuePane`. One builder (`itemColumns`) should decide what an item lists on every surface; a sweep across Table cells should be a seat open; one `showPageMenu` should build and run a page's right-click menu on the sidebar, cards, the Table, and the Matrix; one `metadataMenu.ts` should own the Spaces and Properties branches; one request should summon every icon and color picker, `ColorSwatch`'s included. The kit should import one way, its panes should stay inside the window and flip above their trigger on a slide, and a settings pane's height should stop depending on its route.

The order is what makes each step land once. Phase 0 readies the drives and pins what's unpinned. Phases 1 to 3 finish the kit's imports, the pane shell, and the small folds, so Phase 4 lands on final imports and a shell that already flips. Phases 5 and 6 settle the settings panes and the one request, Phase 7 builds the page menu on them, and Phase 8 moves the seat last and corrects the docs. The plan should end about 470 production lines lighter with five fewer production files. Phase 2 is the one net-positive phase: most of it is I-042's extraction, and the rest delivers E-1, the fence, the trigger rule, and I-027 (its GOAL itemizes it).

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `MetadataPicker` • Component | The one Add list, taking only `seat`, sliding into `ValuePane`. Replaces the chooser mode. | `Core/Properties/Pickers/MetadataPicker.tsx` |
| `ValuePane` • Component | The one pane body both pickers draw: option rows or a calendar. | `Core/Properties/Pickers/PropertyPicker.tsx` |
| `EntryOutcome`, `entryOutcome` • Type, Function | An Add entry's one finite outcome, derived from what a click means. Replaces `revealOnly` and `drillable`. | `Core/Properties/Pickers/valueClick.ts` |
| `PaneOpen` • Type | The seat's open pane; `SeatOpen` becomes it or the Add list's open. | `Core/Properties/Cells/ValueSeat.tsx` |
| `SeatHost.add` • Field | What a surface's Add list holds, how a held value shows, and whether a typed value edits in place. Replaces `AddPickerRequest` and the panel's `addOpen`. | `ValueSeat.tsx` |
| `sweep`, `openAway`, `openAdd`, `slide`, `commitPicks` • Seat Methods | A sweep as a seat open, the open-away rule stated once, the Add list's state, and the one commit fan-out. | `ValueSeat.tsx` |
| `ItemColumns`, `itemColumns` • Type, Function | The one entry builder. Replaces `addEntriesFor`, the panel's fields, and `propertyMenuBranches`' order. | `Core/Views/Pipeline/columns.ts` |
| `holdsValue` • Function | Whether a column has a value to show. | `Core/Properties/fieldValue.ts` |
| `GROUP_LABELS` • Constant | "Spaces" and "Properties", stated once. | `Core/Properties/columnDisplay.ts` |
| `cardAddColumns` • Function | A card's filter over `itemColumns`, with show-only rows last. | `Core/Views/Cards/cardColumns.ts` |
| `panePlacement.ts` • File | `placePane`, `sideFor`, `roomAround`, `VIEWPORT_MARGIN`, `PickerDirection`, `PanePos`, `PanePoint`, `TriggerBox`. Placement math out of a component. | `UIX/Pickers/panePlacement.ts` |
| `SlideGrowth` • Context | Tells a pane how much a slide is about to grow it. | `UIX/Menus/FrameSlide.tsx` |
| `BASE_FEEL` • Constant | The base timing, shared by the slide's timeout, the pane's move, and the windows' morphs. Replaces `SLIDE_MS` and two inline copies. | `UIX/Animations/feel.ts` |
| `at`, `centerX` • Props | One meaning each. Replace `anchorX`, `anchorY`, `anchorHeight`. | `UIX/Pickers/PickerMenu.tsx` |
| `ownShield` • Prop | A dropdown list draws its own shield over a pane. | `UIX/Pickers/PickerMenu.tsx` |
| `MenuBack` • Type | The one back shape. | `UIX/Menus/MenuRows.tsx` |
| `SETTINGS_PANE_FLOOR`, `SETTINGS_PANE_MAX_HEIGHT` • Constants | One home for the floor and ceiling. Replace `PANE_MIN_*`, `PANE_SQUARE`, `VIEW_SETTINGS_MAX_HEIGHT`. | `UIX/Menus/frames.css.ts` |
| `viewItemMenuItems`, `itemRows` • Function, Helper | The ⋮'s rows, shared with the row menu, on HEAD's `ViewRowAction` and `ViewRowMenuContext`. Replaces `ViewItemMenu.tsx`. | `Core/Actions/viewRowMenu.ts` |
| `onPress` on `ColorSwatch` • Prop | The swatch reports its press, and its two Core callers call `chooseColor`. Replaces its own `ColorPicker`. | `UIX/Controls/ColorSwatch.tsx` |
| `RuleField` • Component | `FilterFrame`'s local `FieldPicker`, renamed. | `Core/Views/Settings/FilterFrame.tsx` |
| `ChoiceRequest`, `pendingChoice`, `requestChoice`, `dismissChoice` • Type, Slot | The one icon and color request. Replaces eight store fields and 11 local states. | `Core/Session/chromeSlice.ts` |
| `pickOpen` • Function | One test for a pick or choice standing open. Replaces four copies. | `Core/Session/chromeSlice.ts` |
| `IdentityChoice.tsx` • File | `IdentityChoice`, `chooseIcon`, `chooseColor`, `useChoiceOpen`, `useIconChoice`, and `useIconFavorites`, folded in. Replaces `IconChoice.tsx` and `iconFavorites.ts`. | `Core/Assets/IdentityChoice.tsx` |
| `ownIconOf` • Function | `Sidebar.tsx:294-297`'s read of a Space's or Context's own icon, moved. | `Core/Interface/Menus/entityMenuActions.ts` |
| `metadataMenu.ts` • File | `MetadataTarget`, `metadataBranches`, `runMetadataAction`. Replaces two files. | `Core/Actions/metadataMenu.ts` |
| `PageMoveContext`, `NewPageRows`, `MetadataAction`, `pageMenuItems` • Types, Function | `PageMenuContext` narrowed to moves; `pageMetaMenuItems` renamed, taking one `metadata` list. `MetadataAction` sits here because this file is on the engine path and `metadataMenu.ts` isn't. | `Core/Actions/pageMenu.ts` |
| `PageMenuHost`, `showPageMenu` • Interface, Function | The one page menu and runner. Replaces `titleMenuContext`, `runTitleAction`, and `showEntityMenu`'s page assembly. | `Core/Interface/Menus/pageMenuActions.ts` |
| `readTarget` • Function | `showEntityMenu`'s row, schema, and writer assembly, stated once. | `Core/Interface/Menus/entityMenuActions.ts` |
| `pageMenu`, `newPages` • Hook Member, Policy Field | A view's way to the one menu. | `Core/Views/Host/useViewInteractions.tsx` |
| `inMain`, `shot`'s `around`, `dialog` and `shell` stubs • Harness | What an overnight run can't show, recorded. | `.claude/scripts/drive-harness.mjs` |
| Groups 16 to 19, `stepSlides`, `stepMassPicks` • Drive Cases | The Add list, right-click, placement, and settings panes. | `.claude/scripts/Properties Drive/`, `Option Picker Drive/` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `UIX/Menus/index.ts`, `"./Menus"` • File, Export | The half-used barrel. | `UIX/` |
| `PickerControl.options.test.ts` • File | Folds into `PickerControl.test.tsx`. | `UIX/Pickers/` |
| `anchorX`, `anchorY`, `anchorHeight` on `PickerMenu` • Props | Two meanings under one name. | `UIX/Pickers/PickerMenu.tsx` |
| `SLIDE_MS` • Constant | Replaced by `BASE_FEEL`. | `UIX/Menus/FrameSlide.tsx` |
| `PickEntry`, `chooser`, `onReveal`, `resolveTarget`, `revealOnly`, `drillable` • Type, Props | The chooser mode. | `Core/Properties/Pickers/PropertyPicker.tsx` |
| `chooserTop` • Style | The 14px bar. | `Core/Properties/Pickers/property-picker.css.ts` |
| `MenuTopRow`'s `className` • Prop | Its one user leaves. | `UIX/Menus/MenuRows.tsx` |
| `MassPropertyPicker.tsx` • File | A sweep is a seat open. | `Core/Properties/Pickers/` |
| `mass`, `massOpen`, `massTriggerRef`, `massDegraded`, `massPicker()` • State, Function | The Table's parallel seat. | `Core/Views/Table/TableView.tsx` |
| `SeatChooser`, `'dateTime'` intent, public `run` and `intentOf` • Type, Member | The seat's two-way commit and second date route. | `ValueSeat.tsx`, `valueClick.ts` |
| `AddPickerRequest`, `openAddPicker`, `addableFor`, `addPicker`, `addRow`, `addEntries` • Type, State | The card's Add state. | `Core/Views/Cards/CardsView.tsx` |
| `addEntriesFor`, `AddEntry`, `orderAddableEntries` • Functions, Type | The card's builder. | `Core/Views/Cards/cardColumns.ts` |
| `addOpen`, `hidden()`, `revealAndEdit`, `Field`, `GroupKey`, `contextFields`, `schemaFields`, `nexusWide`, `fieldOf`, `contextValues` • State, Types | The panel's builder and rAF hand-off. | `Core/Properties/PropertyPanel.tsx` |
| `PickOption.value` • Field | Renamed `id`, with its re-key gone. | `Core/Properties/properties.ts`, `pickModel.ts` |
| `commit` • Function | The panel's second commit. | `Core/Properties/PropertyPanel.tsx` |
| `ViewItemMenu.tsx` • File | Onto `popMenu`. | `Core/Views/Settings/` |
| `PANE_SQUARE`, `PANE_MIN_W`, `PANE_MIN_H`, `VIEW_SETTINGS_MAX_HEIGHT` • Constants | Replaced by one home. | `UIX/Menus/`, `ViewFrame.tsx` |
| `maxHeight` on Visibility and Filter • Props | The route-dependent height. | `Core/Views/Settings/` |
| `IconChoice.tsx`, `iconFavorites.ts`, `NexusIconEditors.tsx`, `IconPickerProps`' export • Files, Export | Replaced by `IdentityChoice.tsx`, with the photo cropper in `useNexusIcon`'s `editor`, as `useBannerMenu`'s is. | `Core/Assets/`, `UIX/Pickers/` |
| `iconPath`, `iconHost`, `beginIcon`, `endIcon`, `colorPath`, `colorHost`, `beginColor`, `endColor` • Store Fields | The store's summon model. | `Core/Session/editSlice.ts` |
| `SidebarIconChoice`, `iconFor`, `colorFor`, `iconTarget`, `pickingId`, `picking` • Component, State | The local summon models. | `Sidebar`, `ViewFrame`, `ViewTile`, `useViewInteractions`, `Matrix*` |
| `cardMenu.ts`, `cardMenu.test.ts`, `CardMenuAction` • Files, Type | One conditional row around one call. | `Core/Actions/` |
| `propertyRows.ts`, `propertyMenuActions.ts`, `PropertyMenuRow`, `PropertyMenuOption`, `PropertyMenuTarget`, `propertyMenuBranches` • Files, Types | Merged into `metadataMenu.ts`. | `Core/Actions/`, `Core/Interface/Menus/` |
| `{ kind: 'title' }` • Arm | Dead in production. | `Core/Actions/cellMenu.ts` |
| `titleMenuContext`, `runTitleAction`, `TitleMenuContext`, `PageMenuContext` • Functions, Types | The second build and run. | `Core/Views/Host/useViewInteractions.tsx`, `pageMenu.ts` |
| `ValuePickRequest.holder` • Field | Replaced by `holderOf`. | `Core/Session/chromeSlice.ts` |
| `ColorSwatch`'s `ColorPicker`, `onPick`, `greyscale` • Mount, Props | Its press goes to the one color request, which cuts the third path from Menus to Pickers. | `UIX/Controls/ColorSwatch.tsx` |
| `open` on `PropertyPicker` • Prop | The chooser's residue; it's `target !== null`. | `Core/Properties/Pickers/PropertyPicker.tsx` |
| `GhostSuppress` • Context | A kit export with one private user, whose readers already hold `SidebarGhostApi`. | `UIX/Interactions/ghostCreate.ts` |
| `anchorX`, `anchorY`, `anchorHeight` on `PinnedGlance` • Fields | Session state, replaced by `at`. | `Core/Session/glanceSlice.ts` |

#### Constraints

- **Mandate (Nathan's, verbatim from *Metadata Picker — Decisions & Intention · §Constraints*):**
  - **Approach:**
    - Any approaches being considered here must first assess what’s true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We’re not going to design based on what’s currently there and simply adjust course, we’re ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what’s ultimately going to be replaced.
    - We’re approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
    - We shouldn’t adding anything new unless there’s evidence that it’s required. We’d approach this through the perspective of ending up with cumulatively “less stuff” in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and less headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our <principles>.
    - Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebases' resulting shape — not just maintaining remnants or adherence to what’s true *now* that’s ultimately going to change. The approach should reflect the outcome and shouldn’t be bound to constraints that were only relevant before.
    - Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we’re not starting from scratch.
    - The complex data-level mechanics of the codebase are what least reflect *Nathan’s* intentions and are primarily reflective of what’s determined appropriate via past session agents. Treat it with care and respect, but don’t assume it’s beyond changing within reason, where simply presenting the approach to Nathan may be all that’s required to genuinely change the codebase for the betterment of everything within it and future iterations.
  - **Principles:**
    - **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
    - **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
    - **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
    - **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
    - **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
    - **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
    - Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements.
    - Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
    - Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.
  - **Planning:**
    1. **Look Outward First:** before designing any piece, name every function, field, file, or rule it would add, and scout what already exists for each.
    2. **Verify Nathan's Claims:** check every architectural claim he makes against the tree and report what contradicts it, plainly; he wants it. Many previous plans had corrections that were  flagged against what went unnoticed during the brainstorming process, and each correction changed the design.
    3. **Ask, With a Read Attached:** where an answer reads more than one way, stop and ask, with what was found, what it implies, and the call put up for correction; Nathan isn't technical, so each question is explained in plain terms.
    4. **Disclose In-Flight Calls:** a judgment made during planning or execution is stated in chat when it's made, and recorded where it changes an outcome.
    5. **Write With Intent:** decisions and plans state intended behavior as intent ("should"), separate from statements of how the code works today, so a future reader never takes a decision for a fact or a fact for a decision.
- **Adherence:** how the plan holds to each principle, so a reviewer can test the plan against it:
  - **Less to Carry:** `chooser`, `PickEntry`, `resolveTarget`, `MassPropertyPicker`, the Table's parallel seat, `addEntriesFor`, the panel's `hidden()`, `propertyMenuBranches`, `runTitleAction`, `titleMenuContext`, `cardMenu.ts`, `IconChoice` and its 13 mounts, five of six `ColorPicker` mounts, eight store fields, the barrel, and `ViewItemMenu` leave whole. Each addition either delivers a decided behavior or names what it removes (*Investigation · §What Was Challenged*).
  - **Less to Understand:** "where does an item's value open from" has one answer (the seat), "what can an item list" has one answer (`itemColumns`), and "what runs a page's right-click menu on the sidebar, cards, the Table, and the Matrix" has one answer (`showPageMenu`). `Cells/` returns to drawing values.
  - **Clearer Boundaries:** the seat owns open state, anchor, and the open-away rule; `panePlacement.ts` owns placement math; the kit imports Pickers → Menus; `metadataMenu.ts` owns the metadata branches. Every new or moved file is one Nathan approves (*§Placements*).
  - **Reads as Designed:** no phase leaves a transitional form behind. Phase 2's guard logs two more console errors until Phase 4 removes the masked unmounts, which fails nothing, and the third path from Menus to Pickers stands until Task 6-3 cuts it at `ColorSwatch`.
  - **One Way:** one pane body, one back shape (`MenuBack`), one anchor meaning per prop, one side rule, one home for the settings panes' floor and ceiling, one summon model for icons and colors, one rule for kit imports.
  - **Real Purpose:** Phase 2's +79 is itemized in its GOAL.
  - **Reflected Everywhere:** D-3's ghost reads `pickOpen` on Cards, the Table, the sidebar, and the Matrix, the surfaces a page menu opens from, the flip reaches every slide under a `PickerMenu` the user can't resize, and C-7's order holds on every list.
- **Briefs:** every agent brief on this plan (executors, checkpoint reviewers, the final waves, and every compaction continuation) carries the Approach and Principles above in full and has its agent read *§Constraints* whole from this file before anything else. The neutral gate's brief carries them and nothing else from this plan.
- **Rulings (Not Re-Raised):** the entries in *Decisions & Intention* and its *§Rejected* aren't re-raised. The Investigation's *§Rejected*, *§Resolved Seams*, and *§What Was Challenged* verdicts stand, and a reviewer's disagreement with one is noted rather than raised, unless it names a mechanism they missed. A decision's "how" that isn't its core may change where another way produces the cleaner outcome, with the reason stated in the task and the departure listed under *§Deviations*.
- **Restated Decisions:** the evidence restated these decisions, and this plan implements the restated form. Nathan's ratification of this plan ratifies each, and Task 0-1 rewrites its entry in the log in place, so the log and the plan never disagree (*Investigation · §What Contradicts the Source*):
  - **A-4:** the work should run as one plan in phases, with the kit's imports and the pane shell landing first, so the pickers arrive on final imports and a shell that already flips.
  - **B-7:** a multi-row pick should be a seat open, drawn by the one `PropertyPicker`, with `MassPropertyPicker.tsx` gone.
  - **C-3:** the back bar should take the one layout every other bar takes, 18px tall, by removing `chooserTop`, and on a picker's surface its right-hand label should keep the row's trailing pad, sitting as far in as the chevron opposite; a settings pane's label stays flush with the controls beneath it.
  - **C-4:** the Add window's spacing, icon size, height ceiling, and width floor should match every other menu; its width ceiling doesn't, since `maxWidth={180}` would clip the 215px calendar through `FrameSlide`'s shared slot box.
  - **D-3:** every surface's hover ghost should stand down while a leaf is open, not only a card's.
  - **E-1:** a pane that grows on a slide should flip above its trigger when the other side has more room, deciding at the slide's head and travelling with it, and every pane should stay inside the window, overlapping its trigger only where neither side holds it.
  - **E-2:** "one way" names the pair `UIX/Pickers` → `UIX/Menus` alone. The third path is cut at `ColorSwatch`, which reports its press to the one color request (Task 6-3), so `Trailing`'s `color` keeps its kind.
  - **E-3:** the clock list should drop the release in place of a shield, as its one reasoned exception, since a shield takes a double-click's second press.
  - **E-4:** `[^51]`'s citations are accurate at HEAD, so they're re-anchored only where this work moves them.
  - **E-6:** the development warning should key on `onDismiss`, since a pane nothing dismisses leaves with its host.
  - **F-6:** the ⋮ looks the same in rows, order, separator, width, and in-app draw, taking the shared menu's glyph size and origin.
  - **G-1:** the second date's click half lands before the restructure and its slide half lands in the commit that makes a date slide; the seed-status mount is deleted as a duplicate and only `cellGestures.test.tsx:595-628` moves.
  - **G-2:** *§Reconciliation* is the list, and I-027 and I-042 are deleted, with `index-issues.py` run last.
  - **§Rejected:** gains "A Slide Rising Over Its Trigger: the calendar would end sitting on its own card."
- **Calls Taken for Ratification:** these are the ten calls of *Investigation · §For Nathan*. The plan is written to the answer beside each, and Nathan's answer at ratification replaces it. Each line names what changes if he answers otherwise:
  - **Call 1 (In-Place Growth):** only a slide flips; small growth rises just enough. Otherwise: one clause in Task 2-4 (`|| !placeResize`), and group 18's End Date and TextPane rows flip.
  - **Call 2 (The Back Bar):** answered 11-02-2026: the label sat too close to the right edge, and the fix holds to pickers. The bar takes the common 18px layout, and on a picker's surface its label takes the row's trailing pad (Task 4-1, *§The Back Bar's Label*).
  - **Call 3 (The Sweep):** a sweep is a seat open, and it stays open over the rows that remain. Otherwise: Task 4-1 keeps `mass` and folds only the file.
  - **Call 4 (Four Add-List Behaviors):** Escape in a slid pane closes everything; a Select's pick in a slid pane closes everything; a property with nothing to pick still slides; cancelling a File pick from the panel's Add leaves no row. Otherwise: group 16's rows and Task 4-1's outcomes for the one he changes.
  - **Call 5 (Clicks Beside Other Pop-Ups):** E-3 stands as ratified, dropdown lists only. Otherwise: Task 2-6 becomes the every-pane rule (`dismissalStack.ts` +2/−13, `PickerMenu.tsx` +2/−5, one opt-out on the clock list, about −14 lines) and `ownShield` never lands.
  - **Call 6 (The ⋮):** all three small changes are accepted (12px glyphs, `center` origin, Use Native Menus reaching it). Otherwise: Task 5-2 stays on an in-app draw with its own glyph size, and `viewItemMenuItems` keeps a second caller shape.
  - **Call 7 (The Folder Lines):** the project `CLAUDE.md`'s `// Menus` and `// Pickers` lines stay, since neither claims totality and I-075 cites one. Otherwise: one line each in Task 8-3.
  - **Call 8 (A One-Line Field):** the check runs once on a scratch instance in Task 4-4, and the two-line fix lands only if it reproduces.
  - **Call 9 (`reveal-parity`):** it stays out of this plan and is filed as its own issue in Task 8-3; its one relevant sample runs in group 16.
  - **Call 10 (Placements):** all nine are approved as *§Placements* lists them.
- **Placements:** every new, moved, renamed, or deleted file is one of these, and no other file is created.
  - **Approved in the Log:** `Core/Properties/Pickers/MetadataPicker.tsx` (B-3); `UIX/Pickers/ManageRow.tsx` and `manage-row.css.ts`, moved from `UIX/Menus/`; `UIX/Menus/PickerControl.tsx` and `picker-control.css.ts`, moved from `UIX/Pickers/` (E-2).
  - **Awaiting Nathan (Call 10):** `Core/Properties/Pickers/ValueSeat.tsx` and `ValueSeat.test.tsx`, moved from `Core/Properties/Cells/`; `UIX/Pickers/panePlacement.ts` and `panePlacement.test.ts`, new; `Core/Actions/metadataMenu.ts` and `metadataMenu.test.ts`, new; `Core/Assets/IdentityChoice.tsx` and `IdentityChoice.test.tsx`, new; `Core/Assets/useNexusIcon.tsx`, renamed from `useNexusIcon.ts`; `UIX/Menus/PickerControl.test.tsx`, renamed from `UIX/Pickers/PickerControl.typeable.test.tsx`; `Core/Properties/parseEditorValue.test.ts`, new; `Core/Interface/Menus/pageMenuActions.test.ts`, new; and `itemColumns` inside the existing `Core/Views/Pipeline/columns.ts`.
  - **Deleted:** `UIX/Menus/index.ts`, `UIX/Pickers/PickerControl.options.test.ts`, `Core/Properties/Pickers/MassPropertyPicker.tsx`, `Core/Views/Settings/ViewItemMenu.tsx`, `Core/Assets/IconChoice.tsx`, `Core/Assets/NexusIconEditors.tsx`, `Core/Assets/iconFavorites.ts`, `Core/Actions/cardMenu.ts`, `cardMenu.test.ts`, `propertyRows.ts`, `propertyRows.test.ts`, `Core/Interface/Menus/propertyMenuActions.ts`, and `propertyMenuActions.test.ts`.
- **Plan Rules:** removal comes first in every phase. In an AFTER, a `-` line reads the tree as the tasks before it leave it, so an executor meets exactly that line. A `:line` cites `16d932567`; where an earlier task moved it, the named symbol or quoted text is the anchor. Tasks are written to their result, so no executor reads an opening to do more than they say. A cited hunk in `Scouts/Planning/` or `1 — Two Pickers.patch` is that task's AFTER as if inlined, with the differences the task names, and this plan stands wherever it and the Investigation or a report differ. A test that changes asserts the behavior a decision names rather than being bent to pass. Consolidation that's unambiguously right needs no sign-off, and dead or dormant code inside the surface leaves. An obvious fold Nathan would answer "fix it here" to, with no architectural risk or domino effect, is included without asking and recorded under *§Deviations*; anything larger is recorded there for him.
- **Comments:** no task adds more comments than it removes, so the codebase's comment count doesn't grow. The budget is *Investigation · §The Comment Ledger* with this plan's three further removals (`NexusIconEditors.tsx:6`, `CardsView.tsx:261`, `ghostCreate.ts:10`): 4 added against 13 removed, and an executor adds none beyond it. A rewrite in place counts zero.
- **Documentation:** changes are light and replacive under `r/studio-documentation`, with no new sections. *§Reconciliation* is the list. Docs land in Task 8-3, after the final drives, except `scripts/README.md` and `Properties Drive/MATRIX.md`, whose rows land with each drive edit. Issues are closed by deleting block, index row, and footnote, and `index-issues.py` runs once, last among the docs.
- **Not Feature-Level:** nothing here is a new feature (A-1). A user should see only these corrections: the Add list's slides and one window (B-1, C-1 to C-7), the panel's rows appearing on pick (C-2), a card's right-click gaining Preview and Reveal Location and the Table's gaining Reveal Location (D-4), panes staying inside the window and flipping on a slide (E-1), a press beside an open dropdown only closing it (E-3), the settings panes' heights (F-7), the view editor's header icon (F-5), and the ⋮'s three small changes (Call 6), a pane closing when its trigger leaves the page (Task 2-5), and a sweep's pane staying open over the rows that remain (Call 3). Anything else that would change what a user sees is taken at its simplest reading that changes nothing visible and recorded under *§Deviations*.
- **Sync:** nothing here makes decisions for future sync work. `git diff --stat <BASELINE>..HEAD -- Core/Sync Sync` prints nothing at the end. No persisted shape changes.
- **Gates:** "Run the gates" in a task means `npm run typecheck`, `npm run test`, and `npm run lint` from the repo root, lint clean. A file written by a shell command skips Biome's hook, so `npm run format` follows any scripted edit. `npm run build`, confirming `✓ built in`, runs from a clean state at the final head.
- **Commits:** each task commits once its VERIFY passes, through `git commit --only -m "…" -- <paths>` after `git add` for new files (*Development-Environment · §Gates & Commits*). Messages are past tense, one to three sentences, and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The post-commit hook pushes `active`. A Bash command carrying `git` can't contain a personal name anywhere, paths included. A drive in a VERIFY runs after the task's gates pass and it commits, from a worktree of that commit; a red drive is fixed in a further commit within the task. The plan file itself commits with `--only` whenever its BASELINE, Net Ledger, ticks, or *§Deviations* change.
- **The Studio Commit:** `npm run typecheck` ends in `tsc -p ../../.claude/dashboard`, which is committed in The Studio's repo. Tasks 1-1 and 1-2 each pair their Pommora commit with an adjacent Studio commit from `~/The Studio`, with `--only` and explicit paths.
- **Tests:** each new behavior gets a test that fails without its change, run once against the code with the change reverted and watched red; a rewritten case counts as that test. A test pinning behavior a decision removes is rewritten to the decided behavior or leaves with the code it pinned, as its task names.
- **The Number:** every phase's VERIFY runs `python3 ~/"The Studio/.claude/scripts/view-delta/view-delta.py" <BASELINE>..HEAD --exclude .claude` and records the **Actionable** column in the Net Ledger's Measured, cumulative. A phase whose own delta lands above its estimate is reported in chat before the next opens, with what the increase buys.
- **Live Drives:** Nathan takes no hand checks. Every outcome and interaction runs through the existing drives in `.claude/scripts/`, extended where a case is missing (*6 — Testing and Docs · §The Outcome Matrix*). Every drive runs from a worktree cut at `16d932567` or later, with `POMMORA_DRIVE_REPO="$WT"`, `POMMORA_DRIVE_SHOTS="$SHOTS/<phase>-<drive>"`, and `run_in_background`, where `Desktop/main.ts:78-81` gives its `POMMORA_USERDATA` launch a mock keychain. `git -C "$WT" checkout --detach <sha>` precedes each phase's drive. `POMMORA_PL_LANDED=9` goes on every Path Links run. Drives run one chain at a time, since `sweepStrays` kills any other; no agent starts one while one runs, and a wait never greps `ps` for its own command's text. The app is never launched from the main checkout, where Nathan's instance runs, and that instance is never stopped.
- **When Drives Run:**

  | When | Run | Time |
  |---|---|---|
  | Task 0-5 | All seven, the groups Task 0-5 names | about 29 min |
  | A picker or Add phase's checkpoint | Properties `14 16 18`, Option Picker, Text `1 4` | 4-6 min |
  | A menu phase's checkpoint | Properties `14 17`, Text `4` | about 3 min |
  | A kit or settings phase's checkpoint | Properties `14 18 19`, Option Picker, Alias `2 3 4` | 4-6 min |
  | Every task | The three gates | under 2 min |
  | Task 8-2 and after each folded implementation wave | All seven, Task 0-5's groups with Properties `1`–`19`, from a worktree of the head | about 35 min |

- **Screenshots:** Remote Control shows what the session reads, so the orchestrator itself runs `Read` on six to ten named shots per phase, any `failure` shot first, with one caption line each: what it shows and whether it's right. Each phase's VERIFY names them. A full window shows position; `shot`'s `around` crops a pane for a phone. Shots live in the session scratchpad, with a fresh `POMMORA_DRIVE_SHOTS` per run.
- **Execution:** the plan runs end to end through `c/plan-execution` from the session that holds PushNotification, overnight once Nathan ratifies it, and no step waits on him; a message from him during the run is input to fold in, not a stop. An ambiguity is taken at its simplest reading and recorded under *§Deviations*. Each task goes to an `execution-agent` (`opus-medium`) informed of *§Context* and *§Overview*, which applies the task's AFTER as written and reports insights, concerns, and suggestions rather than diverging; the orchestrator checks its result against AFTER and VERIFY. PushNotification marks each phase's end. Compaction checkpoints prepare the continuation and carry on without a stop.
- **Reviews:** a review checkpoint is two read-only agents at `opus-xhigh`, one under `code-simplification` and one under `adversarial-review`, each weighing the phase against these constraints and its place in the plan, reading outward rather than in isolation; what holds is folded before the next phase opens. *§Final Verification* holds the implementation waves.
- **Cold Machine:** the run should end ice-cold, proven by *§Final Verification · The Teardown* and *The Cold-Machine Check*. An instance Nathan launched himself isn't the run's, and it's left alone.
- **Neutral Gate:** the post-implementation neutral reviewer (`opus-xhigh`) gets only the BASELINE head, HEAD, the Approach and Principles, and this intention: *"Pommora's way of assigning an item's metadata grew by patches. The Add list was a prop-switched mode inside the one-value picker, what an item can list was decided three times in three orders, the Table's multi-row pick ran its own copy of the seat, a page's right-click menu was built and run twice, icon and color pickers kept two summon models, the design kit's Menus and Pickers imported each other, and a pane that grew kept its first side and ran off the window. This work leaves one Add list beside one value's own picker drawing one pane body, one list builder, one seat, one page menu and runner, one metadata menu, one icon and color request, one-way kit imports, and panes that stay inside the window and flip on a slide. It adds no feature."*
- **Out of Scope Everywhere:** `PickerMenu`'s name and home (I-075); right-click on mobile; `reveal-parity`'s repair (Call 9); I-051's fix, which stays its own issue (E-4); merging `tabMenu`, `navRowMenu`, `connectionMenu`, or `popPageActions` into the page menu (D-5); the calendar's nested lists joining the standard dropdown (E-5); the settings panes' titles (F-4).

#### Process Overview

- [x] `[Stop: Nathan ratifies; no code changes before this]`
- [x] **Phase 0** — Drives and Pins
  - [x] Run Start
  - [x] Task 0-1 · The log reads as ratified
  - [x] Task 0-2 · Group 15's repair
  - [x] Task 0-3 · The harness additions
  - [x] Task 0-4 · The pins
  - [x] Task 0-5 · The baseline and all seven drives
- [x] **Phase 1** — Kit Imports
  - [x] Task 1-1 · The barrel leaves
  - [x] Task 1-2 · `ManageRow` and `PickerControl` swap folders
- [ ] **Phase 2** — The Pane Shell
  - [x] Task 2-1 · One meaning per anchor prop, and the guard
  - [x] Task 2-2 · `panePlacement.ts`
  - [x] Task 2-3 · The fence
  - [x] Task 2-4 · The slide decides and the pane travels
  - [x] Task 2-5 · The trigger rule
  - [x] Task 2-6 · A list only closes
  - [ ] Task 2-7 · Groups 18 and 19 open
  - [ ] Review Checkpoint
- [ ] **Phase 3** — Small Folds
  - [ ] Task 3-1 · The Space chip
  - [ ] Task 3-2 · `PickOption`'s `id`
  - [ ] Task 3-3 · `direction="down"` and a duplicate import
  - [ ] Task 3-4 · `connections` required
  - [ ] Task 3-5 · The panel's commits
  - [ ] Compaction Checkpoint
- [ ] **Phase 4** — The Two Pickers
  - [ ] Task 4-1 · The two pickers, the seat, and the builder
  - [ ] Task 4-2 · Tests beside their modules
  - [ ] Task 4-3 · Group 16, group 18's slides, and the Option Picker steps
  - [ ] Task 4-4 · Call 8's check
  - [ ] Review Checkpoint
  - [ ] Compaction Checkpoint
- [ ] **Phase 5** — Settings Panes
  - [ ] Task 5-1 · One floor and ceiling
  - [ ] Task 5-2 · One back shape, the ⋮, and `LayoutFrame`'s flat form
  - [ ] Task 5-3 · `RuleField`
  - [ ] Task 5-4 · Group 19 gains the panes
  - [ ] Review Checkpoint
  - [ ] Compaction Checkpoint
- [ ] **Phase 6** — One Icon and Color Request
  - [ ] Task 6-1 · The request and its one mount
  - [ ] Task 6-2 · The header sites and F-5
  - [ ] Task 6-3 · The row sites, `ColorSwatch`, and the store's fields
  - [ ] Task 6-4 · The ghost
  - [ ] Task 6-5 · Group 19 gains the choices
  - [ ] Review Checkpoint
- [ ] **Phase 7** — Right-Click
  - [ ] Task 7-1 · One metadata menu, one page menu, and `MenuSeat`'s route
  - [ ] Task 7-2 · Group 17
  - [ ] Review Checkpoint
- [ ] **Phase 8** — Closeout
  - [ ] Task 8-1 · The seat's move
  - [ ] Task 8-2 · All seven drives
  - [ ] Task 8-3 · Docs and issues
- [ ] *§Final Verification* over `<BASELINE>..HEAD`
- [ ] `[Stop: the final report, per §Final Verification]`

---

### Phase 0 — Drives and Pins

**GOAL:** The harness should run every case overnight, the baseline should be known, and the behaviors this work must keep should have tests before anything moves. It's its own phase because no production code changes here, so any later red belongs to this work.

**RUN START** (before Task 0-1):

1. Start `caffeinate -dims` with `run_in_background`, since rendering stops on a sleeping display and a capture fails after the 60-second CDP timeout.
2. Record `find ~/Test -type f -print0 | sort -z | xargs -0 shasum | shasum` under *§Deviations* as the start hash.
3. Cut the run's worktree in the scratchpad with `.claude/scripts/editor-parity/worktree.sh <HEAD> "$WT"`, and set `SHOTS` to a fresh folder in the scratchpad. Each later drive checks the worktree out at its task's commit.

#### Task 0-1

The decision log should read what Nathan ratified, with no note that anything changed. The planning folder then commits.

**PROCEDURE**

1. Fold each restatement under *§Constraints · Restated Decisions* into its entry, keeping the tag. A-4, B-7, C-4, and E-1 take the restated text whole. C-3, D-3, E-2, E-3, E-4, E-6, F-6, G-1, and G-2 take it in place of the one clause it corrects, and the rest of each entry stands. Add the one line to *§Rejected*, and correct *§Concepts*' `MetadataPicker` entry (`:20`), which says today's chooser mode.
2. Where Nathan's answer to a call differs from the plan's, fold it into the decision it changes: Call 1 → E-1, 2 → C-3, 3 → B-7, 4 → C-1 and C-2, 5 → E-3, 6 → F-6, 7 → G-2, 10 → B-3. Calls 8 and 9 change no decision.
3. Close the log's *§Open Items* by removing them, since *Investigation · §The Open Items, Closed* answers all eight.
4. `git add ".claude/Planning/Metadata Picker"` and commit with `--only`.

**VERIFY**

- [ ] `git grep -n "chooser mode\|Open Items" -- ".claude/Planning/Metadata Picker/Metadata Picker — Decisions & Intention.md"` prints nothing.
- [ ] Every entry A-1 to G-2 still states what it stated before this task, apart from the clause its restatement corrects.
- [ ] The commit touches only `.claude/Planning/Metadata Picker/`.

#### Task 0-2

Properties Drive's group 15 crashes at HEAD because `27500c110` dropped the `Date format` labels and the Date editor's heading row. The repair should correct its labels and its gap counts.

**AFTER**

```.claude/scripts/Properties Drive/live-drive.mjs diff
@@ group15 @@

-      await pickIn(cdp, 'Date format', 'Full Date')
-      const shown = await rowGaps(cdp, 'Date format', 'Time format')
-      item(15, 'L-1', 'a Date editor with its Day row shown keeps 8px between its heading and every row', even(shown, 3), show(shown))
+      await pickIn(cdp, 'Date Format', 'Full Date')
+      const shown = await rowGaps(cdp, 'Date Format', 'Time Format')
+      item(15, 'L-1', 'a Date editor with its Day row shown keeps 8px between every row', even(shown, 2), show(shown))
-      await pickIn(cdp, 'Date format', 'MM/DD/YYYY')
-      const hidden = await rowGaps(cdp, 'Date format', 'Time format')
-      item(15, 'L-1', 'a collapsed Day row leaves no gap: Date to Time is 8px', even(hidden, 2), show(hidden))
+      await pickIn(cdp, 'Date Format', 'MM/DD/YYYY')
+      const hidden = await rowGaps(cdp, 'Date Format', 'Time Format')
+      item(15, 'L-1', 'a collapsed Day row leaves no gap: Date to Time is 8px', even(hidden, 1), show(hidden))
```

`Properties Drive/MATRIX.md:154`'s action and expected cells should read "Date Format Full Date, then MM/DD/YYYY" and "8px through Date, Day, and Time; with Day collapsed, Date to Time is 8px; screenshots `g15-date-revealed`, `g15-date-collapsed`", its L-1 cell unchanged.

**VERIFY**

- [ ] Group 15 alone reads 11 of 11 from a worktree of this commit.

#### Task 0-3

The harness should record what an overnight run can't show: a file dialog and Reveal Location, either of which would otherwise hang or take focus with nobody there. It should also reach main-process state from a case, crop a shot for a phone, and restore its backup on a plain stop.

**AFTER**

```.claude/scripts/drive-harness.mjs diff
@@ PATCHES @@

-  const { app, BrowserWindow, Menu } = require('electron')
+  const { app, BrowserWindow, Menu, dialog, shell } = require('electron')
-  const drive = { popup: null, seq: 0 }
+  const drive = { popup: null, seq: 0, dialogs: 0, picks: [], revealed: [] }
+  dialog.showOpenDialog = async () => {
+    drive.dialogs++
+    const picked = drive.picks.shift()
+    return picked ? { canceled: false, filePaths: [picked] } : { canceled: true, filePaths: [] }
+  }
+  shell.showItemInFolder = (path) => { drive.revealed.push(path) }

@@ beside nativeRows @@

+export const inMain = (expr) => main.evaluate(expr)

@@ shot @@

-export async function shot(cdp, name) {
-  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
+export async function shot(cdp, name, around) {
+  const clip = around && (await cdp.evaluate(`(() => { const b = (${around}).getBoundingClientRect(); const x = Math.max(0, b.left - 100), y = Math.max(0, b.top - 100); return { x, y, width: Math.min(innerWidth - x, b.width + 200), height: Math.min(innerHeight - y, b.height + 200), scale: 1 } })()`))
+  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', ...(clip && { clip }) })

@@ launch @@

-  process.once('SIGINT', () => restore().then(() => process.exit(130)))
+  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => restore().then(() => process.exit(130)))
```

A case reads `await inMain('__drive.revealed')`, and hands the dialog a path with `` await inMain(`__drive.picks.push(${JSON.stringify(path)})`) ``. `scripts/README.md:99-107` gains one clause: a file dialog and Reveal Location are recorded rather than shown.

**VERIFY**

- [ ] A throwaway scratchpad script launched through the harness: `await ask(cdp, 'nexus:pickFile')` answers `null` and leaves `await inMain('__drive.dialogs')` at 1, and `await ask(cdp, 'path:reveal', <a seeded page's path>)` leaves `__drive.revealed` holding that path, with no Finder window (both channels are declared in `Core/Contract/bridge.ts`). The script is deleted afterward.
- [ ] `shot` with `around` writes a cropped PNG.

#### Task 0-4

Four behaviors should gain tests while the old code stands: picking from the panel's Add (G-1), a second date's click showing its own date (G-1), a right-click value leaving the saved view alone (D-2), and a file naming a property with nothing readable (C-9). Each is written at behavior level, so it holds across the restructure.

**AFTER**

```Core/Properties/PropertyPanel.test.tsx diff
@@ before describe('the property row drag' @@

+describe('picking from the Add list', () => {
+  const entry = (name: string): HTMLElement | undefined =>
+    [...document.querySelectorAll<HTMLElement>('[data-picker-portal] [role="button"]')].find(
+      (e) => e.textContent?.trim() === name,
+    )
+  const press = async (el: HTMLElement | null | undefined): Promise<void> => {
+    await act(async () => {
+      el?.click()
+    })
+    await act(async () => {
+      await new Promise((r) => setTimeout(r, 30))
+    })
+  }
+  const add = (): HTMLElement | null => host.querySelector('[aria-label="Add Property"]')
+  const row = (id: string): HTMLElement | null => host.querySelector(`[data-property-row="${id}"]`)
+
+  it('a typed entry shows its row with its field open in it', async () => {
+    cachePageDetail(detail({ path: 'Col/Page.md' }))
+    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
+    await press(add())
+    await press(entry('Note'))
+    expect(row('prop_note')?.querySelector('input')).not.toBeNull()
+  })
+
+  it('an option entry lands the picked option on the page and shows its row', async () => {
+    cachePageDetail(detail({ path: 'Col/Page.md' }))
+    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
+    await press(add())
+    await press(entry('Stage'))
+    await press(entry('Alpha'))
+    expect(useSession.getState().mutate).toHaveBeenCalledWith(
+      {
+        op: 'setProperty',
+        path: 'Col/Page.md',
+        propertyId: 'prop_stage',
+        value: { kind: 'select', value: 'opt_Alpha' },
+      },
+      expect.anything(),
+    )
+    expect(row('prop_stage')).not.toBeNull()
+  })
+})
```

```Core/Views/Cards/cardGestures.test.tsx diff
@@ after describe('the card menu' @@

+describe('a card’s dates', () => {
+  const dueDef: PropertyDefinition = { id: 'prop_due', label: 'Due', key: 'Due', type: 'dateTime' }
+  const startDef: PropertyDefinition = {
+    id: 'prop_start',
+    label: 'Start',
+    key: 'Start',
+    type: 'dateTime',
+  }
+  const pane = (): string =>
+    [...document.querySelectorAll('[data-picker-portal]')].map((e) => e.textContent).join('')
+
+  it('a second date’s click shows its own date, even as the first’s pane leaves', async () => {
+    useSession.setState({ tree: makeTree({ registry: [dueDef, startDef] }) })
+    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
+      'view:loadValues': async () =>
+        valuesReply({
+          p1: {
+            [ID_KEY]: 'p1',
+            ...propsAtRoot({ prop_due: '2026-03-09', prop_start: '2026-07-21' }, [dueDef, startDef]),
+          },
+          p2: { [ID_KEY]: 'p2' },
+        }),
+      menu: menuSpy,
+    })
+    const base = source()
+    await renderView(root, {
+      ...base,
+      propertyIds: [dueDef.id, startDef.id],
+      views: base.views?.map((v) => ({
+        ...v,
+        property_order: ['_title', 'prop_due', 'prop_start'],
+      })),
+    } as CollectionNode)
+    const values = (): HTMLElement[] => [...card('p1').querySelectorAll<HTMLElement>('.card-value')]
+    await act(async () => {
+      values()[0].click()
+    })
+    expect(pane()).toContain('March')
+    await act(async () => {
+      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
+    })
+    await act(async () => {
+      values()[1].click()
+    })
+    expect(pane()).toContain('July')
+    expect(pane()).not.toContain('March')
+  })
+})
```

The D-2 and C-9 pins follow the same helpers:

- **D-2 (`cardGestures.test.tsx`, *the card menu*):** "a value set from a card's right-click leaves a hidden property hidden". A Select hidden from the view's `property_order`; `rightClick('p1', 'prop:<id>:<option>')` answered through `menuSpy`; `'views:save'` a `vi.fn` in that test's own `stubDialer`. It should assert `setProperty` was mutated and `views:save` was not called.
- **C-9 (`PropertyPanel.test.tsx`):** "a file naming a Checkbox with `false` shows its row and leaves the Add list". A Checkbox property, `frontmatter: { Done: false }`: the row is present and the `+` for Properties doesn't list Done.
- **C-9 (`cardGestures.test.tsx`):** "a card's Add lists a file's unticked Checkbox and fills it". The same frontmatter on `p1`: Add lists Done, and pressing it writes `true`.

**VERIFY**

- [ ] Run the gates; all new tests pass at HEAD.
- [ ] Each is watched red once: Pin 1 with the panel's `seat.run` removed, Pin 2 with `ValueSeat.tsx:278`'s per-value key removed, D-2 with `CardsView` handing `useViewInteractions` `{ ...host, commitValue: (r, c, v) => commitOnCard(r, c, v) }`, and C-9's panel pin with `Object.hasOwn` removed.
- [ ] `git diff --stat` touches test files alone.

#### Task 0-5

All seven drives should pass at Phase 0's head, so any later red belongs to this work.

**PROCEDURE**

1. Fill BASELINE's Head, Tests, and Start at Phase 0's head, and commit the plan.
2. Run in series, as one background chain, each drive's groups passed as separate arguments (`1`–`15` means `1 2 3 … 15`): Option Picker (no groups); Properties `1`–`15`; Text Property `1 2 3 4`; Metadata `1`–`9`; Alias `1 2 3 4 5`; Path Links `1`–`9` with `POMMORA_PL_LANDED=9`; Archive `1 2 3 4 5 6A 6B 7 7B 7C 7D`.

**VERIFY**

- [ ] Option Picker 46; Properties 78; Text Property 115; Metadata 261; Alias 339; Path Links 817 with `POMMORA_PL_LANDED=9`; Archive 159; none failing.
- [ ] The orchestrator reads `0-properties`'s group 15 shot and writes its caption.

---

### Phase 1 — Kit Imports

**GOAL:** Kit files should be imported by path, `ManageRow` and `PickerControl` should sit in the folders that make Menus stop importing Pickers directly, and every later hunk's imports should be final. Task 6-3 cuts the one remaining path, through `ColorSwatch`. It's its own phase because it's mechanical and touches only import lines in what later phases edit, so landing it first means the codemod runs once over a clean tree.

#### Task 1-1

The barrel should leave, with one rule in its place: a kit file is imported by its path, with `Theme` and `Symbols` as the two exceptions that are real modules. `UIX/Menus/index.ts` and the `"./Menus"` entry in `UIX/package.json:5` are deleted, and every `from '@pommora/uix/Menus'` splits by module, merging into an existing named import of that module.

**PROCEDURE**

1. From the repo root, run `node ".claude/Planning/Metadata Picker/Scouts/Planning/Scripts/barrel-codemod.mjs" Core UIX`, which prints `{ changed: 51 }`, then `npm run format`. From `~/The Studio/.claude/dashboard`, run the same script with `src`, then `npx biome format --write src`.
2. Delete the file and the export entry.
3. Commit Pommora, then commit The Studio's six dashboard files adjacently.

**AFTER**

| Module (`@pommora/uix/Menus/…`) | Names |
|---|---|
| `MenuRows` | `MenuItem` `MenuSeparator` `MenuDesc` `MenuTopRow` `Menu` `AccessoryButton` `FootingCreate` `RowRemove` `FooterLockButton` `FooterIconButton` `MenuFooting` `FootingItem` `MenuScrollFrame` `menuDropLine` |
| `MenuIndex` | `MenuIndex` `MenuRowView` `steppedRow` `pickerRow` `PickerRowLook` `MenuRow` `MenuSection` `Trailing` |
| `DisclosureRow` | `DisclosureRow` `DropOutline` `useDisclosureSet` |
| `pickRuns` | `pickRuns` `PickRun` |
| `menu-row.css` | `heading` `itemEmphasized` `titleInput` |
| `MenuSurface` | `MenuSurface` |
| `MenuDropdown` | `MenuDropdown` |

*4 — Kit Structure · Appendix* lists all 51 Core files and six dashboard files.

**VERIFY**

- [ ] Run the gates; `git grep "from '@pommora/uix/Menus'" -- Core UIX` prints nothing, and neither does the same grep in `~/The Studio/.claude/dashboard/src`.
- [ ] The Actionable delta for this commit reads −54 (+75 / −129).

#### Task 1-2

`ManageRow` and `PickerControl` should swap folders, so Menus stops importing Pickers directly, and the two `PickerControl` test files should become one, since the typeable suite already covers lists and steps.

**PROCEDURE**

1. `git mv UIX/Menus/ManageRow.tsx UIX/Pickers/ManageRow.tsx`; `git mv UIX/Menus/manage-row.css.ts UIX/Pickers/manage-row.css.ts`; `git mv UIX/Pickers/PickerControl.tsx UIX/Menus/PickerControl.tsx`; `git mv UIX/Pickers/picker-control.css.ts UIX/Menus/picker-control.css.ts`; `git mv UIX/Pickers/PickerControl.typeable.test.tsx UIX/Menus/PickerControl.test.tsx`.
2. Fold `PickerControl.options.test.ts`'s one `describe` into `PickerControl.test.tsx` and delete the file.
3. Re-point every importer. `Core/Interface/mount.test.tsx:10` is a `vi.mock` string, which a typed search misses.
4. Commit Pommora, then commit The Studio's `src/shell/MenuDoor.tsx:4` and `src/claude-code/layout.tsx:2` adjacently.

**AFTER**

```UIX/Pickers/ManageRow.tsx diff
@@ imports @@

-import { PickerMenu } from '../Pickers/PickerMenu'
+import { PickerMenu } from './PickerMenu'
-import { MenuRowView } from './MenuIndex'
-import { trailingCluster, trailingFigure } from './menu-row.css'
+import { MenuRowView } from '../Menus/MenuIndex'
+import { trailingCluster, trailingFigure } from '../Menus/menu-row.css'
```

```UIX/Menus/picker-control.css.ts diff
@@ imports @@

-import { footingBar } from '../Menus/menu-row.css'
+import { footingBar } from './menu-row.css'
```

```UIX/Menus/MenuIndex.tsx diff
@@ imports @@

-import { steppedPickerProps, PickerControl, type PickerOption } from '../Pickers/PickerControl'
+import { steppedPickerProps, PickerControl, type PickerOption } from './PickerControl'
```

**Re-point `@pommora/uix/Pickers/PickerControl` → `@pommora/uix/Menus/PickerControl` (20 Core files):** `Interface/mount.tsx:5`, `Interface/mount.test.tsx:4,10`, `Matrix/MatrixMenu.tsx:15`, `Matrix/MatrixMenu.test.tsx:5`, `Properties/displayLabels.ts:2`, `Properties/Schema/OptionEditPopup.tsx:5`, `PropertyFrame.tsx:40`, `PropertyFrame.test.tsx:20`, `formatRows.ts:2`, `typeRows.tsx:3`, `Settings/ScalePicker.tsx:1`, `SettingsWindow.tsx:10`, `frames.ts:10`, `Testing/MenuDoorHost.tsx:1`, `Views/paneTargets.ts:4`, `Views/Settings/FilterFrame.tsx:42`, `GroupFrame.tsx:62`, `LayoutFrame.tsx:27`, `SortFrame.tsx:15`, `paneRows.tsx:4`. **`picker-control.css`:** `SettingsWindow.tsx:2`. **`ManageRow`:** `Pages/AliasesRow.tsx:2`, `Settings/ExcludedDirectoriesRow.tsx:6`, `PreviewRulesRow.tsx:5`.

**VERIFY**

- [ ] Run the gates; `UIX/Pickers/PickerControl.*` and `UIX/Menus/ManageRow.tsx` no longer exist.
- [ ] `PickerControl.test.tsx` carries the options `describe`, and the test count holds at this task's start count.
- [ ] The Number recorded for Phase 1; Option Picker and Alias `2 3 4` pass from a worktree of this commit, since `ManageRow` and `PickerControl` ride them.

---

### Phase 2 — The Pane Shell

**GOAL:** One placement module, panes that stay inside the window, a slide that flips as a move, a pane that closes when its trigger leaves, and a dropdown list that only closes. This phase is net-positive on purpose: most of it is I-042's extraction (about +55), which ends the `usePaneResize` ↔ `PickerMenu` loop, states the side rule once for `MatrixLabel`, and turns the centering tests into plain calls; E-1's flip, the fence, and the trigger rule add about +30 and I-027 about +7, against `at`'s −14. It lands before the pickers, so `MetadataPicker` inherits the flip with no wiring.

#### Task 2-1

`anchorX` means a point's x beside `anchorY` and a horizontal override without it. Each meaning should get its own prop: `at` for a point and `centerX` for the override. The development warning should key on `onDismiss` in the same commit, since this task removes the `anchorX` it reads and a pane nothing dismisses leaves with its host.

**AFTER**

```UIX/Pickers/PickerMenu.tsx diff
@@ props @@

-  anchorX,
-  anchorY,
-  anchorHeight = 0,
+  at,
+  centerX,
-  anchorX?: number
-  anchorY?: number
-  anchorHeight?: number
+  at?: { x: number; y: number; height?: number }
+  centerX?: number

@@ the guard @@

-      // Point-anchored menus (a pinned glance) close by design through an instant unmount — no Bloom-out to skip, so the guard would be a false positive.
-      if (import.meta.env.DEV && liveRef.current && anchorX === undefined)
+      // A pane nothing dismisses leaves with its host, as a pinned glance does with its tab, so only a dismissable one has a Bloom-out to lose.
+      if (import.meta.env.DEV && liveRef.current && onDismiss !== undefined)

@@ the placing effect @@

-    const point =
-      anchorX !== undefined && anchorY !== undefined
-        ? {
-            left: anchorX,
-            right: anchorX,
-            top: anchorY,
-            bottom: anchorY + anchorHeight,
-            width: 0,
-            height: anchorHeight,
-          }
-        : null
+    const height = at?.height ?? 0
+    const point = at ? { left: at.x, top: at.y, bottom: at.y + height, width: 0, height } : null
-      const c = anchorX ?? t.left + t.width / 2
+      const c = centerX ?? t.left + t.width / 2

@@ the dependency array @@

-    anchorX,
-    anchorHeight,
-    bounds,
-    anchorY,
+    at?.x,
+    at?.y,
+    at?.height,
+    centerX,
+    bounds,
```

The dependency array names `at`'s fields, since `caretPane` and `GlancePane` build a fresh object each render.

```Core/Interface/Menus/MenuPresenter.tsx diff
@@ MenuPresenter @@

-      anchorX={shown?.at?.x}
-      anchorY={shown?.at?.y}
+      at={shown?.at}
```

```Core/MarkdownPM/Menus/caretPane.tsx diff
@@ CaretPane @@

-      anchorX={at.caretX}
-      anchorY={at.caretTop}
-      anchorHeight={at.caretBottom - at.caretTop}
+      at={{ x: at.caretX, y: at.caretTop, height: at.caretBottom - at.caretTop }}
```

```Core/Interface/Glance/GlancePane.tsx diff
@@ pinning @@

-      anchorX: a.left + a.width / 2,
-      anchorY: a.top,
-      anchorHeight: a.height,
+      at: { x: a.left + a.width / 2, y: a.top, height: a.height },

@@ the pinned pane @@

-              anchorX={p.anchorX}
-              anchorY={p.anchorY}
-              anchorHeight={p.anchorHeight}
+              at={p.at}
```

```Core/Session/glanceSlice.ts diff
@@ PinnedGlance @@

-  anchorX: number
-  anchorY: number
-  anchorHeight: number
+  at: { x: number; y: number; height: number }
```

```UIX/Pickers/CalendarPicker.tsx diff
@@ Anchor @@

-type Anchor = { x: number; y: number; h: number; el: HTMLElement }
+type Anchor = { x: number; y: number; height: number; el: HTMLElement }
-  return { x: r.left + r.width / 2, y: r.top, h: r.height, el }
+  return { x: r.left + r.width / 2, y: r.top, height: r.height, el }

@@ the two lists @@

-        anchorX={menu?.at.x}
-        anchorY={menu?.at.y}
-        anchorHeight={menu?.at.h}
+        at={menu?.at}
-        anchorX={timeMenu?.at.x}
-        anchorY={timeMenu?.at.y}
-        anchorHeight={timeMenu?.at.h}
+        at={timeMenu?.at}
```

`PropertyPicker`'s `anchorX` prop renames to `centerX` at `:70,:80,:95,:150`, and `Core/Properties/Cells/ValueSeat.tsx:295` reads `centerX={open?.mode === 'picker' ? open.x : undefined}`. A pinned glance's anchor is session state rather than anything persisted, so it takes the same `at`. **Tests:** `PickerMenu.test.tsx:561-563` takes `at={at ? { ...at, height: 20 } : undefined}`, `:597`, `usePaneResize.test.tsx:45-46`, and `PropertyPicker.pane.test.tsx:39,56,142` follow the names, and `GlancePane.test.tsx:597`'s control pane becomes `<PickerMenu open onDismiss={() => {}}>`. `PinnedGlance` fixtures take `at` at `GlancePane.test.tsx:373-375,420,517,529,552,570`, `glanceSlice.test.ts:13-15`, `devicePrefsSeed.test.tsx:234-236`, and `store.test.tsx:751-753,894-896`.

**VERIFY**

- [ ] Run the gates; `git grep -n "anchorX\|anchorY\|anchorHeight" -- UIX Core` prints nothing.
- [ ] `npx vitest run Core/Views/Cards/cardGestures.test.tsx --reporter=default 2>&1 | grep -c 'unmounted while open/exiting'` reads two above its count at the prior commit, the masked unmounts Phase 4 removes, and no test fails on them.

#### Task 2-2

`measure`'s placement math should move, unchanged, into a pure module, as I-042 proposed, which ends the `usePaneResize` ↔ `PickerMenu` import loop and lets `MatrixLabel` share the one side rule. This task changes no behavior.

**AFTER**

```UIX/Pickers/panePlacement.ts diff
@@ new file @@

+import { MENU_GAP as GAP } from '../Menus/menuAnchor'
+import { clamp } from '../Utilities/clamp'
+import { PANE_RADIUS } from './picker-base.css'
+
+export const VIEWPORT_MARGIN = 8
+
+export type PickerDirection = 'down' | 'up'
+
+export type PanePos = {
+  top?: number
+  bottom?: number
+  right?: number
+  left?: number
+  origin?: string
+}
+
+export type TriggerBox = Pick<DOMRect, 'left' | 'top' | 'bottom' | 'width' | 'height'>
+
+/** KNOB — how far past the trigger's center the near edge and the Bloom's origin sit. */
+const ANCHOR_RESERVE = 30
+
+const CORNER_CLEAR = PANE_RADIUS + 2
+
+export const roomAround = (t: TriggerBox, viewH: number): Record<PickerDirection, number> => ({
+  up: t.top - GAP - VIEWPORT_MARGIN,
+  down: viewH - t.bottom - GAP - VIEWPORT_MARGIN,
+})
+
+export function sideFor(
+  side: PickerDirection,
+  height: number,
+  room: Record<PickerDirection, number>,
+): PickerDirection {
+  const other = side === 'up' ? 'down' : 'up'
+  return height > room[side] && room[other] > room[side] ? other : side
+}
+
+export function placePane({
+  t,
+  pane,
+  view,
+  side,
+  centered,
+  origin,
+  centerX,
+  bounds,
+}: {
+  t: TriggerBox
+  pane: { w: number; h: number }
+  view: { w: number; h: number }
+  side: PickerDirection
+  centered: boolean | null
+  origin: 'auto' | 'right' | 'center' | 'left'
+  centerX?: number
+  bounds?: { left: number; right: number }
+}): { pos: PanePos; centered: boolean } {
+  const c = centerX ?? t.left + t.width / 2
+  const edgeL = (bounds?.left ?? 0) + VIEWPORT_MARGIN
+  const edgeR = (bounds?.right ?? view.w) - VIEWPORT_MARGIN
+  const { w: pw, h: ph } = pane
+  const edge = (along: number, at: number): number =>
+    clamp(at, CORNER_CLEAR, Math.max(CORNER_CLEAR, along - CORNER_CLEAR))
+  const near = (x: number): string => `${edge(pw, x)}px ${side === 'up' ? ph : 0}px`
+  const vertical = side === 'up' ? { bottom: view.h - t.top + GAP } : { top: t.bottom + GAP }
+  const center =
+    centered ??
+    (origin === 'center' || (origin === 'auto' && c - pw / 2 >= edgeL && c + pw / 2 <= edgeR))
+  if (center) {
+    const half = pw / 2
+    const left = Math.min(Math.max(c, edgeL + half), edgeR - half)
+    return { pos: { ...vertical, left: left - half, origin: near(c - (left - half)) }, centered: true }
+  }
+  if (origin === 'left') {
+    const left = clamp(c - ANCHOR_RESERVE, edgeL, Math.max(edgeL, edgeR - pw))
+    return { pos: { ...vertical, left, origin: near(ANCHOR_RESERVE) }, centered: false }
+  }
+  const right = clamp(
+    view.w - c - ANCHOR_RESERVE,
+    view.w - edgeR,
+    Math.max(view.w - edgeR, view.w - edgeL - pw),
+  )
+  return { pos: { ...vertical, right, origin: near(pw - ANCHOR_RESERVE) }, centered: false }
+}
```

```UIX/Pickers/PickerMenu.tsx diff
@@ imports @@

-import { clamp } from '../Utilities/clamp'
-import { MENU_GAP as GAP } from '../Menus/menuAnchor'
+import {
+  placePane,
+  roomAround,
+  sideFor,
+  type PanePos,
+  type PickerDirection,
+} from './panePlacement'

@@ module scope @@

-export const VIEWPORT_MARGIN = 8
-
-export type PickerDirection = 'down' | 'up'
-
-/** KNOB — how far past the trigger's center the near edge and the Bloom's origin sit. */
-const ANCHOR_RESERVE = 30
-
-const CORNER_CLEAR = s.PANE_RADIUS + 2
-
-type Pos = {
-  top?: number
-  bottom?: number
-  right?: number
-  left?: number
-  origin?: string
-}
-const samePos = (a: Pos | null, b: Pos): boolean =>
+const samePos = (a: PanePos | null, b: PanePos): boolean =>
-const snapped = (p: Pos): Pos => ({
+const snapped = (p: PanePos): PanePos => ({
-  const [pos, setPosState] = useState<Pos | null>(null)
+  const [pos, setPosState] = useState<PanePos | null>(null)
-  const setPos = (raw: Pos): void => {
+  const setPos = (raw: PanePos): void => {

@@ measure @@

     const measure = (): void => {
       const t = rectOf()
-      const c = centerX ?? t.left + t.width / 2
-      const edgeL = (bounds?.left ?? 0) + VIEWPORT_MARGIN
-      const edgeR = (bounds?.right ?? window.innerWidth) - VIEWPORT_MARGIN
-      const { w: pw, h: ph } = paneBox.current
-      let eff = decidedDir.current ?? direction
-      if (decidedDir.current === null) {
-        const room = (side: PickerDirection): number =>
-          side === 'up'
-            ? t.top - GAP - VIEWPORT_MARGIN
-            : window.innerHeight - t.bottom - GAP - VIEWPORT_MARGIN
-        const other = direction === 'up' ? 'down' : 'up'
-        if (ph > room(direction) && room(other) > room(direction)) eff = other
-        decidedDir.current = eff
-        placeResize?.({ dir: eff, room: room(eff) })
-      }
-      const edge = (along: number, at: number): number =>
-        clamp(at, CORNER_CLEAR, Math.max(CORNER_CLEAR, along - CORNER_CLEAR))
-      const near = (x: number): string => `${edge(pw, x)}px ${eff === 'up' ? ph : 0}px`
-      const vertical =
-        eff === 'up' ? { bottom: window.innerHeight - t.top + GAP } : { top: t.bottom + GAP }
-      if (decidedCenter.current === null)
-        decidedCenter.current =
-          origin === 'center' || (origin === 'auto' && c - pw / 2 >= edgeL && c + pw / 2 <= edgeR)
-      if (decidedCenter.current) {
-        const half = pw / 2
-        const left = Math.min(Math.max(c, edgeL + half), edgeR - half)
-        setPos({ ...vertical, left: left - half, origin: near(c - (left - half)) })
-        return
-      }
-      if (origin === 'left') {
-        const left = clamp(c - ANCHOR_RESERVE, edgeL, Math.max(edgeL, edgeR - pw))
-        setPos({ ...vertical, left, origin: near(ANCHOR_RESERVE) })
-        return
-      }
-      const iw = window.innerWidth
-      const right = clamp(
-        iw - c - ANCHOR_RESERVE,
-        iw - edgeR,
-        Math.max(iw - edgeR, iw - edgeL - pw),
-      )
-      setPos({ ...vertical, right, origin: near(pw - ANCHOR_RESERVE) })
+      const pane = paneBox.current
+      const view = { w: window.innerWidth, h: window.innerHeight }
+      let side = decidedDir.current ?? direction
+      if (decidedDir.current === null) {
+        const room = roomAround(t, view.h)
+        side = sideFor(side, pane.h, room)
+        decidedDir.current = side
+        placeResize?.({ dir: side, room: room[side] })
+      }
+      const { pos: next, centered } = placePane({
+        t,
+        pane,
+        view,
+        side,
+        centered: decidedCenter.current,
+        origin,
+        centerX,
+        bounds,
+      })
+      decidedCenter.current = centered
+      setPos(next)
     }
```

```UIX/Pickers/usePaneResize.tsx diff
@@ imports @@

-import { VIEWPORT_MARGIN, type PickerDirection } from './PickerMenu'
+import { VIEWPORT_MARGIN, type PickerDirection } from './panePlacement'
```

```Core/Matrix/MatrixLabel.tsx diff
@@ imports @@

-import { VIEWPORT_MARGIN } from '@pommora/uix/Pickers/PickerMenu'
+import { sideFor, VIEWPORT_MARGIN } from '@pommora/uix/Pickers/panePlacement'

@@ the label's side @@

-      const up = box.h > below && sy - r - st.y - VIEWPORT_MARGIN > below
+      const above = sy - r - st.y - VIEWPORT_MARGIN
+      const up = sideFor('down', box.h, { down: below, up: above }) === 'up'
```

`PickerDirection`'s other importers follow `git grep -n "PickerDirection\|VIEWPORT_MARGIN" -- UIX Core`. `PickerMenu.test.tsx:452-520`'s *auto-centering* block moves to plain calls in `UIX/Pickers/panePlacement.test.ts`, its DOM faking gone: a pane centered when it fits, a pane that doesn't center hanging from its right, `origin="left"`, `bounds`, `sideFor` keeping a side that fits, taking the other when overrun, and staying when the other has less room.

**VERIFY**

- [ ] Run the gates; `PickerMenu.test.tsx:588,605` pass unchanged, since `:279-286` stays.
- [ ] Watch `panePlacement.test.ts` red once with `sideFor`'s `room[other] > room[side]` removed.

#### Task 2-3

Every pane should stay inside the window on every path, including one neither side can hold, which then overlaps its trigger. Today a pane reaches 93px past the bottom and 70px past the top.

**AFTER**

```UIX/Pickers/panePlacement.ts diff
@@ placePane @@

-  const vertical = side === 'up' ? { bottom: view.h - t.top + GAP } : { top: t.bottom + GAP }
+  const fenced = (at: number): number =>
+    clamp(at, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, view.h - VIEWPORT_MARGIN - ph))
+  const vertical =
+    side === 'up' ? { bottom: fenced(view.h - t.top + GAP) } : { top: fenced(t.bottom + GAP) }
```

**Tests:** `panePlacement.test.ts` gains: hangs off the trigger when it fits, fences a pane neither side holds, and pins a pane taller than the window to the top margin.

**VERIFY**

- [ ] Run the gates; each fenced case is watched red without `fenced`, and the case that fits pins the fence's no-op range.

#### Task 2-4

A slide should decide its side at its head and the pane should travel with it. `FrameSlide` should tell its pane how much it's about to grow, and `PickerMenu` should re-decide once, on that number, playing the crossing over the slide's own timing. The pane should rise from the slide's first frame and settle with it, where an edge switch would jump 275 to 321px in one frame. A resizable pane should never flip, since `usePaneResize` caps its content at the room it opened into, and a size-driven rule would flip it mid-drag. In-place growth should keep its side and rise inside the fence (Call 1). The slide's timing gets a name, `BASE_FEEL`, which the two windows' morphs already hand-write.

**AFTER**

```UIX/Animations/feel.ts diff
@@ the named feels @@

+export const BASE_FEEL: Feel = { duration: ms(duration.base), easing: easing.baseEase }
```

```Core/Interface/Windows/NavWindow.tsx diff
@@ the morph-in @@

-      { duration: ms(duration.base), easing: easing.baseEase },
+      BASE_FEEL,
```

```Core/Interface/Windows/PageWindow.tsx diff
@@ the engulf @@

-      { duration: ms(duration.base), easing: easing.baseEase, fill: 'forwards' },
+      { ...BASE_FEEL, fill: 'forwards' },
```

Both windows import `BASE_FEEL` from `@pommora/uix/Animations/feel`, and `duration`, `easing`, and `ms` leave their `motion` imports where nothing else reads them.

```UIX/Pickers/panePlacement.ts diff
@@ after sideFor @@

+export const crossing = (from: PickerDirection, height: number, t: TriggerBox): number =>
+  (from === 'down' ? 1 : -1) * (t.height + 2 * GAP + height)
```

```UIX/Menus/FrameSlide.tsx diff
@@ module scope @@

-import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
+import {
+  createContext,
+  useContext,
+  useEffect,
+  useLayoutEffect,
+  useRef,
+  useState,
+  type ReactNode,
+} from 'react'
-import { duration, ms } from '../Animations/motion'
+import { BASE_FEEL } from '../Animations/feel'
-const SLIDE_MS = ms(duration.base)
+export const SlideGrowth = createContext<((by: number) => void) | null>(null)

@@ the flip's timing @@

-  // Height eases only across a flip; an in-place resize tracks content live.
+  // Height eases only across a flip; an in-place resize tracks content live, and a layout read before `navigating` flushes styles with no height transition and snaps the height.
   const [navigating, setNavigating] = useState(false)
-    const t = setTimeout(() => setNavigating(false), SLIDE_MS)
+    const t = setTimeout(() => setNavigating(false), BASE_FEEL.duration)

@@ after the flip's effect @@

+  const grew = useContext(SlideGrowth)
+  useLayoutEffect(() => {
+    if (navigating) grew?.(open ? size.bh - size.ah : size.ah - size.bh)
+  }, [navigating, active])
```

```UIX/Pickers/PickerMenu.tsx diff
@@ imports @@

+import { BASE_FEEL } from '../Animations/feel'
+import { SlideGrowth } from '../Menus/FrameSlide'
 import {
+  crossing,
   placePane,

@@ the pane's box @@

-  const place = useRef<(() => void) | null>(null)
+  const place = useRef<((growth?: number) => void) | null>(null)
+  const slideGrew = useRef((by: number): void => place.current?.(by)).current

@@ measure @@

-    const measure = (): void => {
+    const measure = (growth = 0): void => {
       const t = rectOf()
       const pane = paneBox.current
       const view = { w: window.innerWidth, h: window.innerHeight }
-      let side = decidedDir.current ?? direction
-      if (decidedDir.current === null) {
-        const room = roomAround(t, view.h)
-        side = sideFor(side, pane.h, room)
-        decidedDir.current = side
-        placeResize?.({ dir: side, room: room[side] })
-      }
+      const held = decidedDir.current
+      let side = held ?? direction
+      if (held === null || growth > 0) {
+        const room = roomAround(t, view.h)
+        side = sideFor(side, pane.h + growth, room)
+        if (held === null) placeResize?.({ dir: side, room: room[side] })
+        else if (side !== held)
+          paneRef.current?.animate(
+            [{ transform: `translateY(${crossing(held, pane.h, t)}px)` }, { transform: 'none' }],
+            BASE_FEEL,
+          )
+      }
+      decidedDir.current = side

@@ the observer @@

-    const ro = new ResizeObserver(measure)
-    if (trigger && !point) ro.observe(trigger)
+    const ro = new ResizeObserver(() => measure())
+    if (trigger && !point) ro.observe(trigger)

@@ Shell @@

-      {body}
+      <SlideGrowth.Provider value={resize ? null : slideGrew}>{body}</SlideGrowth.Provider>
```

**Why It Can't Flip-Flop:** a flip needs the pane to overrun its side and the other side to have strictly more room, so a stationary trigger allows at most one flip per open. A Back, a shrink, a scroll, or a window resize never moves the side, and reopening decides afresh.

**Tests:**

- `panePlacement.test.ts`: `crossing`'s sign.
- `PickerMenu.test.tsx`: a child calling `SlideGrowth` flips past the room and a shrink doesn't, with `Element.prototype.animate` and `ResizeObserver` stubbed (`UIX/vitest.setup.ts:12` stubs the observer as a no-op, so the test installs its own).
- `FrameSlide.test.tsx`: `grew` fires only with `navigating` on, which pins the height snap.

**VERIFY**

- [ ] Run the gates; the new tests are watched red, the `FrameSlide` pin with `grew`'s call moved ahead of `setNavigating`.

#### Task 2-5

A `PickerMenu` whose trigger leaves the page should dismiss itself, through the `ResizeObserver` it already holds on the trigger. A real Electron 42 probe proved the observer fires on removal, for HTML and SVG alike, with `isConnected` already false. The seat's check at `ValueSeat.tsx:87-90` stays, since it also closes inline editors, which have no shell.

**AFTER**

```UIX/Pickers/PickerMenu.tsx diff
@@ the component body, beside liveRef @@

+  const dismissRef = useLatest(onDismiss)

@@ the placing effect @@

     const measure = (growth = 0): void => {
+      if (trigger && !point && !trigger.isConnected) return dismissRef.current?.()
       const t = rectOf()
```

**Tests:** `PickerMenu.test.tsx`: a detached trigger dismisses, with a `ResizeObserver` that fires on demand.

**VERIFY**

- [ ] Run the gates; the test is watched red without the line.

#### Task 2-6

A press beside an open dropdown list inside a pane should only close that list (E-3). Only the lowest shielded layer draws a shield (`dismissalStack.ts:122`), so a list over a shielded pane draws none and its press lands. A list should draw its own, as it does over the toolbar. `MenuPresenter`, `CalendarPicker`'s month and year list, and `FilterFrame`'s two lists pass `ownShield`. The clock list is the one reasoned exception: a part opens on click and types on double-click, a shield takes that second press, so it drops the release instead. Two toggle arms that can't run leave with this, since a press on a list's own trigger is swallowed by the stack.

**AFTER**

```UIX/Pickers/PickerMenu.tsx diff
@@ props @@

+  ownShield = false,
+  ownShield?: boolean

@@ the shield @@

-          {drawsShield && !closing ? (
+          {(drawsShield || ownShield) && !closing ? (
```

```Core/Interface/Menus/MenuPresenter.tsx diff
@@ MenuPresenter @@

     <PickerMenu
+      ownShield
       open={pending !== null}
```

```UIX/Pickers/CalendarPicker.tsx diff
@@ the month and year list @@

       <PickerMenu
+        ownShield
         solid

@@ the hour and minute list @@

-        onDismiss={() => setTimeMenu(null)}
+        // A second press on a part is its double-click, which a shield would take, so this list drops the release instead.
+        onDismiss={() => {
+          suppressReleaseClick()
+          setTimeMenu(null)
+        }}

@@ the arms that can't run @@

-  const toggleTitleMenu =
+  const openTitleMenu =
-      setMenu(menu?.kind === kind ? null : { kind, at: anchorOf(e.currentTarget) })
+      setMenu({ kind, at: anchorOf(e.currentTarget) })
-          setTimeMenu(timeMenu?.part === part ? null : { part, at: anchorOf(e.currentTarget) })
+          setTimeMenu({ part, at: anchorOf(e.currentTarget) })
```

```Core/Views/Settings/FilterFrame.tsx diff
@@ the two lists, at :105 and :179 @@

-      <PickerMenu open={open} onDismiss={() => setOpen(false)} triggerRef={ref}>
-        {open ? children(() => setOpen(false)) : null}
+      <PickerMenu ownShield open={open} onDismiss={() => setOpen(false)} triggerRef={ref}>
+        {open ? children(() => setOpen(false)) : null}
-      <PickerMenu open={open} onDismiss={() => setOpen(false)} triggerRef={ref}>
-        {open && (
+      <PickerMenu ownShield open={open} onDismiss={() => setOpen(false)} triggerRef={ref}>
+        {open && (
```

```UIX/Menus/PickerControl.tsx diff
@@ the trigger @@

-          // Reaches the trigger even when the menu took the left press.
```

`CalendarPicker.tsx:492`'s `if (e.detail > 1) return` stays: it's reached when a double-click starts with the list already open. `toggleTitleMenu`'s callers follow its rename, and `suppressReleaseClick` imports from `../Interactions/shared`. `ownShield` carries no doc comment; its reason sits in `PommoraUIX.md`'s `PickerMenu` row.

**Tests:**

- `PickerMenu.test.tsx`: "a dropdown list shields the pane beneath it, so a press on that pane closes only the list": two shields drawn, `elementsFromPoint` stubbed as `MenuPresenter.test.tsx:86` does.
- `CalendarPicker.test.tsx`: a press on a part while the other's list is open, with its release and click, closes the list and opens nothing.

`PickerMenu.test.tsx:190-227` logs at `pointerdown`, so only a real press proves E-3, which group 19 runs in Task 2-7. `:230` is `focus="keep"`'s carve-out and stays true.

**VERIFY**

- [ ] Run the gates; each new test is watched red.

#### Task 2-7

The shell's outcomes should run against the real app. Group 18 (Placement) and group 19 (Settings Panes) open in `Properties Drive/live-drive.mjs` with what this phase delivers, printing `MP-` letters so they can't be misread against that drive's Restructure letters. Each new group joins the drive's `LANDED` list in the task that opens it, or the drive refuses its number. Task 4-3 extends group 18 with the Add list's slides, and Tasks 5-4 and 6-5 extend group 19.

**CASES**

- **Group 18 (Now):** a low window through `Emulation.setDeviceMetricsOverride`, read back through `innerHeight`; a View Tile's Visibility flips and an rAF sampler sees no frame past the window, with its largest step recorded; Back returns with no jump; a tall list near the bottom is flipped from the start with no second move; a popped calendar's End Date at the edge rises rather than flips; TextPane on a low card rises line by line; Month, Year, Hour, and Minute open nested; the 24-hour clock draws with no AM/PM.
- **Group 19 (Now):** two `PickerControl`s in a tile's Layout pane: open one, press the other, and assert on rects and a real `click` listener rather than `pointerdown`; the same in the toolbar's settings; Month open and a press on Year; Hour open and a press on Minute; a double-click on Hour landing in its field; a filter's field list and a press on a second; a press on a slider row with a list open; a `LocationField` press still landing beneath its `focus="keep"` pane; a tile's menu still drawing in `[data-picker-portal]` and recording no `Menu.popup` (D-6).

`MATRIX.md` gains each group's rows, `:3` names the second source and the `MP-` letters, and `scripts/README.md:93-97`'s "in fifteen groups" reads "in seventeen groups".

**VERIFY**

- [ ] Both groups pass from a worktree of this commit, and a View Tile's Visibility flips with its largest per-frame step under 60px, Back stays above, and nothing passes the window.

#### Review Checkpoint

- [ ] Two reviewers per *§Constraints · Reviews*, reading `measure`, `SlideGrowth`, and the trigger rule outward against every `PickerMenu` consumer.
- [ ] Drives per *§When Drives Run* (kit), from a worktree of this head; `CaretPane`'s and `ManageRow`'s drives are green.
- [ ] The Number recorded. The orchestrator reads and captions six shots: Visibility flipped, Back from it, End Date risen, a list only closing in a tile, Month nested, the fence near the top.

---

### Phase 3 — Small Folds

**GOAL:** The option rows, the panel's commits, and the seat's `connections` should already be clean when the picker splits, so Phase 4's hunks land on their final shapes. Each task is small and independent.

#### Task 3-1

The Space chip's choice should be stated once, in `OptionChip`, which `PropertyPicker`, `FilterFrame`, and `Cell` stop deciding.

**AFTER**

```Core/Properties/Cells/OptionChip.tsx diff
@@ imports @@

+import { NeutralChip } from '@pommora/uix/Labels/recipes'

@@ OptionChip @@

   const label = option?.label ?? ''
+  const color = colorNameFor(option?.color)
+  const removal = onRemove ? { onRemove } : {}
+  if (type === 'context')
+    return (
+      <NeutralChip color={color} title={label} icon={option?.icon} className={className} {...removal} />
+    )
   return (
     <Label
       shape={chipOf(type).shape}
-      color={colorNameFor(option?.color)}
+      color={color}
-      {...(onRemove ? { onRemove } : {})}
+      {...removal}
```

```Core/Properties/Pickers/PropertyPicker.tsx diff
@@ OptionRows @@

-            {contextOptions ? (
-              <NeutralChip color={colorNameFor(o.color)} title={o.label} icon={o.icon} />
-            ) : (
-              <OptionChip type={column.type} look={look} option={o} def={column.def} />
-            )}
+            <OptionChip type={column.type} look={look} option={o} def={column.def} />
```

```Core/Properties/Cells/Cell.tsx diff
@@ the Space chips @@

-              <NeutralChip
-                color={colorNameFor(c?.color)}
-                title={c?.title ?? id}
-                icon={c?.icon}
+              <OptionChip
+                type="context"
+                option={{ label: c?.title ?? id, color: c?.color, icon: c?.icon }}
```

`FilterFrame.tsx:157-175` becomes:

```tsx
{shown.map((v) => (
  <OptionChip
    key={v}
    type={column.type}
    option={byValue.get(v) ?? { label: v }}
    onRemove={() => toggle(v)}
  />
))}
```

The `NeutralChip` and `colorNameFor` imports leave `PropertyPicker.tsx:18-19`, `FilterFrame.tsx:14,48`, and `Cell.tsx:6,19`. `contextOptions` stays a prop in both pickers, since `pickGroups` reads it.

**VERIFY**

- [ ] Run the gates; `git grep -n NeutralChip -- Core` prints `OptionChip.tsx` alone.

#### Task 3-2

`PickOption.value` should become `id`, which removes the re-key at `pickModel.ts:13`. The kit's `PickerOption.value` is a separate type and stays.

**AFTER**

```Core/Properties/properties.ts diff
@@ PickOption @@

-export type PickOption = { value: string; label: string; color?: string; icon?: string }
+export type PickOption = Omit<SelectOption, 'key'>
```

```Core/Properties/Pickers/pickModel.ts diff
@@ pickGroups @@

-          .map((g) => ({ id: g.id, options: groupOptions(g).map((o) => ({ ...o, value: o.id })) }))
+          .map((g) => ({ id: g.id, options: groupOptions(g) }))
```

```Core/Contexts/contextOptions.ts diff
@@ contextOptions @@

-  return excludeId ? opts.filter((o) => o.value !== excludeId) : opts
+  return excludeId ? opts.filter((o) => o.id !== excludeId) : opts
-      value: id,
+      id,
```

```Core/Interface/Menus/propertyMenuActions.ts diff
@@ the option rows @@

-          value: o.value,
+          value: o.id,
-          checked: selected.includes(o.value),
+          checked: selected.includes(o.id),
```

`o.value` becomes `o.id` at `PropertyPicker.tsx:223,249,317,319,320,323,326`, and `FilterFrame.tsx:140`'s `byValue` becomes `byId`, with Task 3-1's `FilterFrame` line following. **Tests:** `contextOptions.test.ts:26,27,31,35`, `pickModel.test.ts:37`, and `PropertyPicker.pane.test.tsx:347`, a fixture `value:` that passes at runtime but fails typecheck.

**VERIFY**

- [ ] Run the gates.

#### Task 3-3

`direction="down"`, the default, should leave its four sites, and `CalendarPicker`'s two imports from `../Menus/MenuRows` should become one.

**AFTER**

`direction="down"` should leave at `UIX/Pickers/FieldPicker.tsx:40`, `UIX/Pickers/ColorPicker.tsx:25`, `Core/Properties/Pickers/TextPane.tsx:38`, and `Core/Properties/Schema/OptionEditPopup.tsx:55`. `CalendarPicker.tsx:12,16` become `import { MenuItem, MenuScrollFrame } from '../Menus/MenuRows'`.

**VERIFY**

- [ ] Run the gates; `git grep -n 'direction="down"' -- UIX Core` prints nothing.

#### Task 3-4

`connections` should be required on `ValueContext` and `SeatHost`, since `useValueContext`, the only production builder, always sets it, and the two test builders are casts (Open Item 2).

**AFTER**

Its optional marks leave at `Core/Properties/valueContext.ts:19`, `ValueSeat.tsx:42,174`, `PropertyValueInput.tsx:32,38,41`, `LinkCell.tsx:42`, and `TextCell.tsx:50`. `PropertyPanel.tsx:86` becomes `() => ctx?.connections()`. `Cell.test.tsx:68` and `ValueSeat.test.tsx:71` gain `connections: () => undefined`.

**VERIFY**

- [ ] Run the gates.

#### Task 3-5

The panel's two commit functions should become one (E-6). `Cell`'s `commit` assigns directly, and clearing or hiding a row runs one `emptyRow`, which keeps or forgets the row's reveal.

**AFTER**

```Core/Properties/PropertyPanel.tsx diff
@@ the seat @@

-    clear: (_, column) => emptyRow(column.id, true),
-    hide: { from: 'row', run: (_, column) => emptyRow(column.id, false) },
+    clear: (r, column) => emptyRow(r, column, true),
+    hide: { from: 'row', run: (r, column) => emptyRow(r, column, false) },

@@ commit @@

-  const commit = (id: string, next: PropertyValue | null): void => {
-    const column = resolveColumn(id, schema, contextIds)
-    if (row && column) assignValue(writer, row, column, next)
-  }

@@ emptyRow @@

-  const emptyRow = (id: string, keep: boolean): void => {
-    commit(id, null)
-    if (keep) reveal(id)
-    else setRevealed((prev) => new Set([...prev].filter((r) => r !== id)))
-  }
+  const emptyRow = (at: ViewRow, column: ResolvedColumn, keep: boolean): void => {
+    assignValue(writer, at, column, null)
+    if (keep) reveal(column.id)
+    else setRevealed((prev) => new Set([...prev].filter((id) => id !== column.id)))
+  }

@@ renderRow @@

-                  commit={(next) => commit(id, next)}
+                  commit={(next) => assignValue(writer, row, column, next)}
```

**VERIFY**

- [ ] Run the gates; `PropertyPanel.test.tsx`'s row-menu cases pass unchanged.
- [ ] The Number recorded for Phase 3; its own delta about −16.

#### Compaction Checkpoint

- [ ] The orchestrator prepares its continuation per *§Constraints · Execution* and carries on.

---

### Phase 4 — The Two Pickers

**GOAL:** One Add list, one value pane, one seat, one builder for the in-app lists, and the sweep as a seat open. Its core is one commit, since `ValuePane`'s commit shape, the seat's union, and the hosts only typecheck as a set. Every design point here was built on HEAD and passed the full suite, so this phase's risk is the merge onto Phases 1 to 3, which Task 4-1 lists exactly.

#### Task 4-1

`PropertyPicker` should lose its `chooser` mode and become one value's own pane; `MetadataPicker` should become the Add list, taking only `seat`; the seat should hold the Add list's open state, its anchor, the open-away rule, and the sweep; and `itemColumns` should replace `addEntriesFor`, `orderAddableEntries`, and the panel's `Field` derivation. `1 — Two Pickers.patch` is this task's AFTER, with the differences listed here.

**PROCEDURE**

1. `git apply --3way ".claude/Planning/Metadata Picker/Scouts/Planning/1 — Two Pickers.patch"`, whose base blobs are in the repo, and resolve each conflict to the differences below. The AFTER here is the authority where it and the patch differ.
2. Apply *Differences From the Patch*, *The Back Bar's Label*, and *The Panel*.
3. Delete `Core/Properties/Pickers/MassPropertyPicker.tsx`, which the patch does, and confirm `property-picker.css.ts` loses `chooserTop` and its `topRow` import.
4. Run the gates, `git add` the patch's paths, since `--3way` writes the index and resolved paths must be staged, and commit once with `--only`, naming each path.

**DIFFERENCES FROM THE PATCH**

- **Imports:** kit imports go by path. `MetadataPicker.tsx` takes `MenuItem`, `MenuScrollFrame`, `MenuSeparator`, and `MenuTopRow` from `@pommora/uix/Menus/MenuRows`.
- **Names:** every `anchorX` in the patch reads `centerX`, on `PropertyPicker` and at the seat's mount, as Task 2-1 landed.
- **`pickGroups`:** after Task 3-2 its body reads `(contextOptions ? [{ id: column.id, options: contextOptions }] : column.def ? optionGroupsOf(column.def).map((g) => ({ id: g.id, options: groupOptions(g) })) : []).filter((g) => g.options.length > 0)`, so a Context with no Spaces draws `emptyPane`.
- **`PropertyOptionRows`:** keeps Task 3-1's one `OptionChip` and Task 3-2's `o.id`.
- **Doc Comments:** `MetadataPicker` and `openAway` carry none, so the patch's two leave. `SeatHost.add`'s stays.
- **`CardsView.tsx:193`:** reads "A value from a card's Add shows its property; a right-click pick runs through `MenuSeat` and leaves the view alone."
- **`valueClick.ts:1`:** the head comment gains one sentence, "An Add entry shows a value it holds, slides into a picker, or acts as that click."
- **Tests:** the patch's typed case in `PropertyPanel.test.tsx` isn't added; Pin 1's typed case gains, after its last assertion, a 400ms settle inside `act`, then `expect(entry('Note')).toBeUndefined()` for "the list gone", since the list's Bloom-out holds its rows for 250ms.
- **`entryOutcome`:** `type EntryOutcome = 'show' | 'slide' | 'click'` isn't exported, and the body reads `if (!isBlankValue(value)) return 'show'`, then `return valueClickIntent(type, value)?.kind === 'picker' ? 'slide' : 'click'`, since stamps can't reach it.
- **`PropertyPicker`:** takes no `open` and no `useHeld`. It reads `target` itself (`const options = target?.kind === 'options'`, `{target && <ValuePane target={target} … />}`) and passes `open={target !== null}` to `PickerMenu`, which holds its children and freezes placement through the exit; the seat's mount drops `open=`.
- **`swept`:** stays off `ValueIntent`, since no click or menu can produce it. `run`'s last parameter becomes `at?: Pick<PaneOpen, 'x' | 'swept'>`, `float` spreads it into the open, `click` passes `{ x }`, and `sweep` passes `{ swept: rowIds }`. `run`'s doc comment is rewritten in place.
- **The Panel's Names:** `GroupKey` gives way to `keyof ItemColumns`, and `glyphOf` and the line zone's `label` read `seat.host.columnOf`, so no `columnById` lands.
- **Fixtures:** `ValueSeat.test.tsx:71` keeps Task 3-4's `connections: () => undefined`.
- **Comments:** this task adds two (`SeatHost.add`, `itemColumns`) and removes two (`ValueSeat.tsx:251`, `CardsView.tsx:215`), rewriting `ValueSeat.tsx:259`, `valueClick.ts:1`, and `CardsView.tsx:193` in place.

**THE BACK BAR'S LABEL (CALL 2)**

`MenuItem` zeroes its trailing pad for anything in `trailing` (`MenuRows.tsx:122`), since a button or glyph there carries its own box, and `MenuTopRow` puts its text label in that slot. On a picker's 4px surface the label therefore ends 4.5px from the pane's edge, while the chevron opposite draws 8px in and the calendar's head 8px in beneath it. A settings pane's label stays flush, where it lines up with the controls beneath it, so the fix should hold to the picker's own surface (Nathan, 11-02-2026): every pane `PickerMenu` draws on that surface, which is the Add list's slid panes, the editor's Links slide, and an in-app menu's branches. A settings frame hosted in a tile's `PickerMenu` takes `bareSurface` and stays as it is.

```UIX/Pickers/picker-base.css.ts diff
@@ imports @@

-import { menuCompact } from '../Menus/menu-row.css'
+import { menuCompact, topBarTrailingLabel } from '../Menus/menu-row.css'

@@ surface @@

 export const surface = style({
   padding: '4px',
   display: 'flex',
   flexDirection: 'column',
   gap: '0px',
 })
+
+/** On a picker's surface a back bar's label keeps the row's trailing pad, which `MenuItem` drops for its trailing slot, so it sits as far in as the chevron opposite; a settings pane's stays flush with the controls beneath it. */
+globalStyle(`${surface} ${topBarTrailingLabel}`, { marginRight: 'var(--row-pad-x)' })
```

**AFTER**

`1 — Two Pickers.patch`, with the differences above. What it lands, for a reader who hasn't opened it:

- **`valueClick.ts`:** `'dateTime'` merges into `'picker'`, and `entryOutcome(type, value)` derives an Add entry's outcome from what a click on the value means.
- **`PropertyPicker.tsx:41-187`:** becomes `PickTarget` (`currents` on the options arm, `current` on the date arm), `ValuePane({ target, header, onCommit, onClose })`, the one pane body both pickers draw, and a thin `PropertyPicker`. `header` threads into both `MenuScrollFrame`s, which puts the bar inside the 240 limit, and the calendar takes it above itself, uncapped.
- **`MetadataPicker.tsx`:** new in `Core/Properties/Pickers/`, taking only `seat`. Its rows draw `columnIcon` and `columnLabel` at `size="control"`, with a `chevron-right` only on a `'slide'` row; its back bar reads `GROUP_LABELS[column.kind === 'context' ? 'contexts' : 'properties']`, so "Spaces" holds on both surfaces (B-4). `key={column.id}` on `ValuePane` gives a second date its own value (Open Item 8), and `slid` holds a column id, so a property deleted while slid falls back to the list through `columnOf`. The list keeps `minWidth={120}` alone, since `FrameSlide` applies its box to both slots and `maxWidth={180}` would clip the 215px calendar.
- **The Seat:** `SeatHost` gains `add?: { columns, show, inPlace? }` with its doc comment; `SeatOpen` becomes `PaneOpen | { mode: 'add'; rowId; group?; slid? }`; the API ends as `open, anchor, host, close, click, pane, menu, input, editor, target, sweep, openAway, openAdd, slide, commitPicks`, with `intentOf` and `run` private; `target` takes `rows: ViewRow[]`; `commitPicks` wraps `groupUndo`, so a single value is a group of one. `add.show` is required on `add`: a card's list calls it for a `'show'` outcome, and `openAway` calls it for a typed value, which is how the panel reaches it, since the panel's list never yields `'show'`. `ValueSeat` loses `chooser` and `SeatChooser`, reads `(picked.swept ?? [picked.rowId]).flatMap((id) => host.rowOf(id) ?? [])`, and draws `{host.add && <MetadataPicker seat={seat} />}`. `MenuSeat`'s effect becomes `seat.openAway(row, pending.column, pending.trigger)` then `if (pending.column.type === 'file') dismiss()`. The closing rule reads `if (!open) return`, then closes on a disconnected anchor or, outside `add`, a column that no longer resolves.
- **The Builder:** `itemColumns(tree, schema, itemId)` and `ItemColumns` sit after `resolveColumn` in `Core/Views/Pipeline/columns.ts`, with its one doc comment; `holdsValue(row, column)` sits in `Core/Properties/fieldValue.ts`, and `GROUP_LABELS` in `Core/Properties/columnDisplay.ts`. Stamps can't enter `itemColumns`, so C-6 needs no filter, and `hiddenListIds` stays for Visibility.
- **The Card:** `cardAddColumns(item, row, shown)` replaces `cardColumns.ts:31-69`, listing what the card doesn't draw with held rows last (C-7's exception); `:26` reads `holdsValue(row, c) ||`. The seat's `add` is `{ columns: (row) => cardAddColumns(itemColumns(tree, ctx.schema, row.id), row, shownColumnsFor(row, columns, isCompact(view))), show: (column) => revealProperty(column.id) }`, `CardApi.openAdd` is `seat.openAdd`, and `PageCard` calls `api.openAdd(row, textRef.current)` (`:914-915`), the gate now in `openAdd`.

**The Panel:** this replaces the patch's `Field` mapping, so no `Field` survives.

```Core/Properties/PropertyPanel.tsx diff
@@ the fields (:164-186) @@

-  const contextFields: Field[] = contextPaneTargets(tree).map((t) => ({ ...t, def: null }))
-  const schemaFields: Field[] = schemaTargets(schema, () => true)
-  const held = (f: Field): boolean => {
-    const picked = row?.picked?.[f.id]
-    if (picked) return !isBlankValue(picked)
-    return f.def
-      ? fm !== null && Object.hasOwn(fm, f.def.key)
-      : (contextValues?.[f.id]?.length ?? 0) > 0
-  }
-  const isShown = (f: Field): boolean => held(f) || revealed.has(f.id)
-  const nexusWide = resolveRowOrder(contextFields, (f) => f.id, tree?.config.order.contexts)
-  const fields: Record<GroupKey, Field[]> = {
-    contexts: resolveRowOrder(nexusWide, (f) => f.id, spaceNode?.rowOrder),
-    properties: resolveRowOrder(schemaFields, (f) => f.id, spaceNode?.rowOrder),
-  }
-  const shown: Record<GroupKey, Field[]> = {
+  const fields = itemColumns(tree, schema, subjectId)
+  const held = (c: ResolvedColumn): boolean =>
+    row !== null &&
+    (holdsValue(row, c) ||
+      (c.def !== undefined && !row.picked?.[c.id] && Object.hasOwn(row.frontmatter, c.def.key)))
+  const isShown = (c: ResolvedColumn): boolean => held(c) || revealed.has(c.id)
+  const shown: ItemColumns = {
     contexts: fields.contexts.filter(isShown),
     properties: fields.properties.filter(isShown),
   }
-  const hidden = (key: GroupKey): PickEntry[] =>
-    fields[key]
-      .filter((f) => !isShown(f))
-      .map((f) => ({ id: f.id, name: f.label, icon: f.icon, revealOnly: true, drillable: false }))
+  const unshown = (key: keyof ItemColumns): ResolvedColumn[] => fields[key].filter((c) => !isShown(c))
```

`renderRow` takes `column: ResolvedColumn`, opens with `const { id } = column`, and draws `columnIcon(column, ctx.contexts)` and `columnLabel(column, ctx.contexts)`. `glyphOf` and the line zone's `label` read `seat.host.columnOf`. `contextValues`, `fieldOf`, and `GroupKey` leave. Both anchors survive (Open Item 6): `{(addable || opened) && <AccessoryButton…`, and one JSX slot for the Add row, as the patch writes it. `addFromRow` compares anchors (`seat.anchor.current !== addRefs.current[addKey]`), so no Add state stays in the panel. The rAF leaves entirely through `flushSync` (Open Item 1).

**The Table:** `onClose: () => cellSweep.clear()` on the seat, and `onSettle` ends in `seat.sweep(row, columns[at], rowIds, cell)`. `activeCell` narrows (`open?.mode === 'picker' ? {…} : popoverTarget`), since `seat.open` is a union. `mass`, `massOpen`, `massTriggerRef`, `massDegraded` and its effect, `massPicker()`, and the `groupUndo` loop leave. A sweep should close as every pane does, when its cell leaves, and pick over whatever rows remain (Call 3).

**Tests, in This Commit:**

- `PropertyPicker.pane.test.tsx:151-248` and their fixtures (`:13,37-43,55,58,60,66-70,103-105`) leave with the mode; its `Host` stops passing `open`; `:32,125,332,346` take `currents`; "Enter on a focused row" asserts `PickCommit[]`; a new pin: a date target given `centerX` doesn't centre its pane.
- `valueClick.test.ts:21-25`: a Date's intent reads `picker`.
- `cardColumns.test.ts:6-12,62-81,109-121` are replaced by `cardAddColumns` cases, stamps absent, and gain C-5's two cases: a hidden held property is listed, and a Compact blank is listed.
- `cardGestures.test.tsx:275` becomes "a Date entry slides into its calendar under ‹ Properties, in the same pane"; `:236`'s title drops "chooser"; the patch's "a second date slides in on its own value, not the one the last calendar held" lands here, G-1's slide half.
- `ValueSeat.test.tsx:155,159` read through `toMatchObject`, since `x` isn't on the `add` arm; the patch's *a sweep* cases land.
- `PropertyPanel.test.tsx:467,478`'s titles drop "chooser"; *the Add list*: a Select slides and cancelling leaves no row; a first pick from a group's last entry keeps its `+` and pane; a pick from a standing row keeps that row's element and pane.
- `columns.test.ts` gains page order, Space `rowOrder` over both groups, and no stamps.

**VERIFY**

- [ ] Run the gates; the test count reads the prior commit's, plus this task's additions, less the cases its Tests list removes.
- [ ] `git grep -n "chooser\|PickEntry\|resolveTarget\|revealOnly\|drillable\|addOpen\|AddPickerRequest\|MassPropertyPicker\|massPicker" -- Core UIX ':!Core/Settings/assetDirValidate.test.ts'` prints nothing; that test's chooser is a folder chooser.
- [ ] The second-date pin goes red with `key={column.id}` removed.
- [ ] Line counts land near the built ones: `ValueSeat.tsx` about 392, `PropertyPicker.tsx` about 278, `TableView.tsx` about 507, `CardsView.tsx` about 926, `PropertyPanel.tsx` under 395.

#### Task 4-2

G-1's misfiled tests should sit beside their modules, and the one weak pin should leave.

**AFTER**

- `cardColumns.test.ts:18-60`'s `parseEditorValue` cases and the `:13` import move to `Core/Properties/parseEditorValue.test.ts`.
- `cellGestures.test.tsx:564-593`, the seed-status mount, is deleted as a duplicate of `PropertyPicker.pane.test.tsx:322`.
- `cellGestures.test.tsx:595-628`, the multi-select mount, moves to `PropertyPicker.pane.test.tsx` on its `Host`, and `:10-11`'s imports leave.
- `ValueSeat.test.tsx:125-131` leaves: `:302` proves the menu seat and `cardGestures.test.tsx:155` the real host, while `:125` feeds its own column.

**VERIFY**

- [ ] Run the gates; the test count falls by exactly the deleted cases.

#### Task 4-3

Every Add outcome should run against the real app. Group 16 (The Add List) opens in the Properties Drive, group 18 gains the slides, and the Option Picker Drive gains `stepSlides` and `stepMassPicks`. *6 — Testing and Docs* holds the cases: *§The Outcome Matrix*, *§Group 16*, and *§Group 18*.

**CASES**

- **Group 16:** seeds by group 14's route: one property of each type, a Select with no options, and a Context with no Spaces; pages `Add Blank` and `Add Held`; views `Add Standard` and `Add Compact`. Surfaces, each crossed with every row of *§Group 16*'s table: Standard card, Compact card, page dropdown, SidePane, Space dropdown. A Table's empty cell opens no list. C-3 and C-4 are measured: bar height, padding, icon size, and label inset equal across Select, Multi, Status, Context, and Date, with the label's right inset at 8px from the pane's edge, matching the chevron's left, and a settings pane's label unmoved; a long list scrolls at 240; the calendar doesn't scroll. Under Call 4: Escape in a slid pane closes everything; a Select's pick closes everything; an empty Select slides to New Option and an empty Status or Context slides to an empty pane; a File cancelled from the panel's Add leaves no row. The `+` stays held while its list is open, replacing `reveal-parity`'s sample. Filter `!e.closest('[inert]')` in new helpers, since the list stays in the DOM behind a slid pane.
- **Group 18 Gains:** a low card's calendar ends inside the window above its trigger, the list being short enough to fit below; a 40-option list on a low card; End Date on a slid calendar rises; Back after a flip; the last card in a row stays inside; Add at a panel's end in a dropdown and the SidePane; a sweep's **last** cell against a single click there, with long option labels, opening the same rect (B-8).
- **`stepSlides` (Option Picker):** New Option, drag, right-click, and Status groups inside a slid pane; a click and a leaf open the same rows with no back bar (B-2).
- **`stepMassPicks` (Option Picker):** a mass Select writes every row and closes; a Multi toggles and stays; a value held by some rows isn't ringed; one ⌘Z undoes all; create, drag, and menu in the folded pane.
- **Rewordings:** `Properties Drive:870,974,975,979` and `MATRIX.md:143`, `Text Property Drive:256,679,682,684,685,688` and its shot `pane-from-chooser`, and `reveal-parity/run.mjs:545`'s comment lose "chooser". `scripts/README.md:10-16` gains the slid-in and mass-pick surfaces and reads "both pickers", and `:93-97` reads "the Properties Restructure's and the Metadata Picker's visible surfaces … in eighteen groups". 
**VERIFY**

- [ ] Group 16, group 18, and the Option Picker Drive pass from a worktree of this commit, and group 16's `›`, stamp, back-bar, and 240px-ceiling cases print the values *§Group 16* measured at HEAD beside their new ones.

#### Task 4-4

Call 8's check. A scout saw a one-line Link or Text field close itself on mount in dev, traced to `view.destroy()` under StrictMode firing the blur that calls `leave` (`ValueEditor.tsx:117`), and its focus was emulated. This task settles it on a dev scratch instance borrowing a worktree's renderer, never Nathan's live one, since a Text edit there writes to his files.

**PROCEDURE**

1. Copy `~/Test` to `$SP/call8/nexus`, and write `$SP/call8/ud/pommora.json` as `{"lastNexusPath":"<that absolute path>"}`, as `drive-harness.mjs:25` does. From `$WT`, run `env -u ELECTRON_RUN_AS_NODE POMMORA_USERDATA="$SP/call8/ud" POMMORA_DEBUG_PORT=9358 npm run dev` in the background. `Desktop/electron.vite.config.ts` sets no `strictPort`, so its Vite server takes the next free port beside the main checkout's and hands it to its own Electron; read the renderer's URL in the log before driving. If it can't start beside the main checkout's dev process, the check runs as a `StrictMode` unit test of `ValueEditor` instead, recorded with that caveat.
2. Bring the window forward, click a one-line Link value, and read whether its field stays open with real focus.
3. If it closes itself, land the fix: `viewRef.current = null` before `view.destroy()` in the effect's cleanup, with the blur handler stopping when `viewRef.current` is null. A test mounting under `StrictMode` pins it, and it's recorded under *§Deviations*.
4. Stop the instance by exact PID and remove its scratch folders.

**VERIFY**

- [ ] The result is recorded under *§Deviations*, whichever way it lands.
- [ ] No scratch instance or folder remains.

#### Review Checkpoint

- [ ] Two reviewers per *§Constraints · Reviews*, covering Phases 3 and 4 together and reading the seat's union and `openAway` outward against the Table, Cards, panel, and `MenuSeat`.
- [ ] Drives per *§When Drives Run* (picker), including the Text Property Drive's group 4 on the built app.
- [ ] The Number recorded. The orchestrator reads and captions eight shots: the Add list with its "›" rows, a slid Select, a slid calendar, ‹ Spaces on a panel, a low card's flip, a sweep's pane, a typed entry in the panel's row, and the row-anchored hop (*Investigation · §Risks*).

#### Compaction Checkpoint

- [ ] The orchestrator prepares its continuation per *§Constraints · Execution* and carries on.

---

### Phase 5 — Settings Panes

**GOAL:** A settings pane's height should stop depending on its route or on which pane it is, one back shape should replace four, and no menu should be hand-built. Frames that state their own ceiling can't vary by route, and the two that take it from a caller do, so the prop is the defect and removing it is the fix (Decisions F-1, F-3, F-4, F-6, F-7). It lands after Phase 4, since `MenuTopRow`'s `className` is gone by then. Group, Sort, Filter, and Property keep their hard-coded titles (F-4).

#### Task 5-1

The floor and ceiling should have one home, and every settings pane with a back bar should state the ceiling itself. The Properties list and Preview Rules should rise to 440px, and the view list's floor to 245px (F-7). Roots with no back bar (`SettingsFrame`, `ViewFrame`'s list, `MatrixMenu`) should stay at 320, since they're index menus.

**AFTER**

```UIX/Menus/frames.css.ts diff
@@ the ceiling @@

-/** KNOB — a settings pane's height ceiling, for a View pane or a property's editor; above MENU_MAX_HEIGHT so the middle region's rows sit beneath the tallest stack of controls. */
-export const VIEW_SETTINGS_MAX_HEIGHT = 440
+/** KNOB — a settings pane's box: the floor it keeps under its slides, and a ceiling above MENU_MAX_HEIGHT so the middle region's rows sit beneath the tallest stack of controls. */
+export const SETTINGS_PANE_FLOOR = { minWidth: 225, minHeight: 245 }
+export const SETTINGS_PANE_MAX_HEIGHT = 440
```

```UIX/Menus/frame-slide.css.ts diff
@@ the floor @@

-// KNOB — the floor a settings pane keeps under its slides.
-export const PANE_MIN_W = 225
-export const PANE_MIN_H = 245
-
```

```Core/Views/Settings/ViewFrame.tsx diff
@@ the slide @@

-      <FrameSlide
-        open={!!editing}
-        root={list}
-        detail={detail}
-        minWidth={PANE_SQUARE}
-        minHeight={PANE_SQUARE}
-      />
+      <FrameSlide {...SETTINGS_PANE_FLOOR} open={!!editing} root={list} detail={detail} />
```

The other four slides (`SettingsFrame.tsx:202`, `LayoutFrame.tsx:278`, `PropertyFrame.tsx:399`, `MatrixMenu.tsx:117`) take the same spread, and `ViewFrame.tsx:41`'s `PANE_SQUARE` is deleted. `Core/Views/Settings/filter-frame.css.ts:7,20` reads `SETTINGS_PANE_FLOOR.minHeight` from its `frames.css` import. Every remaining `VIEW_SETTINGS_MAX_HEIGHT` becomes `SETTINGS_PANE_MAX_HEIGHT`. `VisibilityFrame.tsx:124` and `FilterFrame.tsx:493` read `maxHeight={SETTINGS_PANE_MAX_HEIGHT}`, both `maxHeight` props leave (`VisibilityFrame.tsx:84,93`, `FilterFrame.tsx:211,221`), the callers' passes leave (`ViewLeaf.tsx:10,48`, `MatrixMenu.tsx:14,129`, `LayoutFrame.tsx:213`), and `PropertyFrame.tsx:354` gains `maxHeight={s.SETTINGS_PANE_MAX_HEIGHT}`.

This removes the comment at `frame-slide.css.ts:4` and rewrites `frames.css.ts:129` in place.

**VERIFY**

- [ ] Run the gates; `git grep -n "PANE_MIN_\|PANE_SQUARE\|VIEW_SETTINGS_MAX_HEIGHT" -- UIX Core` prints nothing.

#### Task 5-2

One back shape should replace four: `MenuBack` exported from `MenuRows`, every frame's back bar spreading it, and `MenuPresenter`'s `Level` taking the same shape.

**AFTER**

```UIX/Menus/MenuRows.tsx diff
@@ MenuTopRow @@

+export type MenuBack = { label: string; onBack: () => void }
+
 export function MenuTopRow({
   label,
   onBack,
   trailing,
   current,
-}: {
-  label: string
-  onBack: () => void
+}: MenuBack & {
   trailing?: ReactNode
   current?: string
 }): React.JSX.Element {
```

| Site | Should Say |
|---|---|
| `GroupFrame.tsx:228` | `<MenuTopRow {...back} current="Grouping" />` |
| `SortFrame.tsx:111` | `<MenuTopRow {...back} current="Sorting" />` |
| `FilterFrame.tsx:494` | `back && <MenuTopRow {...back} current="Filtering" />` |
| `VisibilityFrame.tsx:122` | `<MenuTopRow {...back} current={current} />` |
| `PropertyFrame.tsx:355` | `<MenuTopRow {...back} current="Properties" />` |
| `ViewLeaf.tsx:34,37,47` | `back={back}` at all three |

`back: MenuBack` replaces `label` and `onBack` on Group, Sort, Visibility, Property, `ViewLeaf`, and `LayoutFrame`; `back?: MenuBack` stays on Filter; `current: string` becomes required on Visibility, and its default leaves, since its title alone varies by route.

`SettingsFrame.tsx:81` reads `const toRoot: MenuBack = { label: 'Settings', onBack: () => setPane('root') }`, with `back={toRoot}` at each of its children. `LayoutFrame.tsx:184` reads `const toView: MenuBack = { label: 'Views', onBack: () => setFrame(null) }`, with `back={toView}` at `:193,:211` and `<MenuTopRow {...toView} current="Layout" />` at `:200`.

`MenuPresenter.tsx:20,26,64,75` takes `back?: MenuBack`, `<MenuTopRow {...back} current={title} />`, and `back={{ label: title, onBack: () => setBranchAt(null) }}`.

**Tests:** `VisibilityFrame.test.tsx:53,109`, `SortFrame.test.tsx:82`, `GroupFrame.test.tsx:72,182-183,205-206,386-387`, `Core/Views/viewWrite.test.tsx:159-165`, and `PropertyFrame.test.tsx:96` take `back` and `current`.

In the same commit, `ViewItemMenu.tsx` should leave for `popMenu`, as `viewRowMenu.ts` already models both actions, and `LayoutFrame`'s flat mode should stop mounting a slide that can't open, since the full door's `onMenu` is what replaces `ViewItemMenu`'s mount and `LayoutFrame` takes `back` with its `door` union. `door` branches four times today; one early return states the flat form once, and everything after it reads as the view editor.

```Core/Actions/viewRowMenu.ts diff
@@ imports @@

-import type { ActionItem } from './menuModel'
+import { type ActionItem, joinGroups } from './menuModel'

@@ after ViewRowMenuContext @@

+const itemRows = (ctx: ViewRowMenuContext): ActionItem<ViewRowAction>[] => [
+  { label: 'Duplicate', action: 'duplicate', icon: 'copy', disabled: !ctx.duplicable },
+  { label: 'Delete', action: 'delete', icon: 'trash', disabled: !ctx.deletable },
+]
+
+export const viewItemMenuItems = (ctx: ViewRowMenuContext): ActionItem<ViewRowAction>[] =>
+  joinGroups(itemRows(ctx).map((row) => [row]))

@@ viewRowMenuItems @@

 export function viewRowMenuItems(ctx: ViewRowMenuContext): ActionItem<ViewRowAction>[] {
-  return [
-    { label: 'Rename', action: 'rename' },
-    { label: 'Edit Icon', action: 'icon' },
-    { label: 'Edit Color', action: 'color' },
-    ...(ctx.titlesShown === undefined
-      ? []
-      : [{ label: ctx.titlesShown ? 'Hide Titles' : 'Show Titles', action: 'titles' as const }]),
-    {
-      label: 'Duplicate',
-      action: 'duplicate',
-      separatorBefore: true,
-      disabled: !ctx.duplicable,
-    },
-    { label: 'Delete', action: 'delete', disabled: !ctx.deletable },
-  ]
+  return joinGroups<ViewRowAction>([
+    [
+      { label: 'Rename', action: 'rename' },
+      { label: 'Edit Icon', action: 'icon' },
+      { label: 'Edit Color', action: 'color' },
+      ...(ctx.titlesShown === undefined
+        ? []
+        : [{ label: ctx.titlesShown ? 'Hide Titles' : 'Show Titles', action: 'titles' as const }]),
+    ],
+    itemRows(ctx),
+  ])
 }
```

```Core/Views/Settings/ViewFrame.tsx diff
@@ beside rowMenu @@

+  const itemContext = { deletable: views.length > 1, duplicable: views.length > 0 }
+  const duplicate = (v: SavedView): void =>
+    void dialer().ask('views:duplicate', node.path, node.kind, v.id).then(reportRefusal)
+  const editorMenu = async (v: SavedView, trigger: HTMLElement): Promise<void> => {
+    const action = await popMenu(viewItemMenuItems(itemContext), trigger, {
+      solid: true,
+      compact: true,
+    })
+    if (action === 'duplicate') duplicate(v)
+    else if (action === 'delete' && (await deleteViewWithUndo(node, v))) onClose()
+  }

@@ detail @@

-      view={editingLive}
-      schema={schema}
-      door="full"
-      onBack={() => setEditingId(null)}
-      onClose={onClose}
+      door="full"
+      view={editingLive}
+      schema={schema}
+      back={{ label: 'Views', onBack: () => setEditingId(null) }}
+      onMenu={(trigger) => void editorMenu(editingLive, trigger)}
```

`ViewFrame.tsx:94` passes `itemContext`, and `:104` calls `duplicate(v)`. `ViewFrame` keeps `onClose`, so deleting a view from its editor still closes the dropdown (F-6).

```Core/Views/Settings/LayoutFrame.tsx diff
@@ props @@

-export function LayoutFrame({
-  source,
-  view,
-  schema,
-  door,
-  onBack,
-  onClose,
-}: {
-  source: CollectionNode | SetNode
-  view: SavedView
-  schema: PropertyDefinition[]
-  door: 'full' | 'flat'
-  onBack: () => void
-  onClose: () => void
-}): React.JSX.Element {
+export function LayoutFrame(
+  props: {
+    source: CollectionNode | SetNode
+    view: SavedView
+    back: MenuBack
+  } & (
+    | { door: 'flat' }
+    | { door: 'full'; schema: PropertyDefinition[]; onMenu: (trigger: HTMLElement) => void }
+  ),
+): React.JSX.Element {
+  const { source, view, back } = props
+  const menuRef = useRef<HTMLButtonElement>(null)

@@ after grid (:237-275) @@

+  if (props.door === 'flat')
+    return (
+      <MenuScrollFrame
+        header={<MenuTopRow {...back} current="Layout" />}
+        footer={cardsRows}
+        maxHeight={SETTINGS_PANE_MAX_HEIGHT}
+      >
+        {grid}
+        <ViewSwitches source={source} view={view} switches={options.switches} separated />
+      </MenuScrollFrame>
+    )
+
+  const mainFrame = (
+    <MenuScrollFrame
+      header={
+        <MenuTopRow
+          {...back}
+          trailing={
+            <AccessoryButton
+              ref={menuRef}
+              icon="ellipsis-vertical"
+              size="body"
+              ariaLabel="View menu"
+              onClick={() => menuRef.current && props.onMenu(menuRef.current)}
+            />
+          }
+        />
+      }
+      footer={cardsRows}
+      maxHeight={SETTINGS_PANE_MAX_HEIGHT}
+    >
+      {title}
+      <MenuSeparator flush />
+      {grid}
+      <MenuIndex
+        sections={[
+          {
+            rows: VIEW_ROWS.map((r) => ({
+              kind: 'item',
+              icon: <Icon name={r.icon} size={ICON.rootEntry} />,
+              label: r.label,
+              trailing: { kind: 'chevron' },
+              onSelect: () => setFrame(r.id),
+            })),
+          },
+        ]}
+      />
+    </MenuScrollFrame>
+  )
```

`SettingsFrame.tsx:177-184` becomes `<LayoutFrame door="flat" source={node} view={view} back={toRoot} />`. `toView` and `leafFor` (`:184-218`) move below the early return, since only the full form calls them and `props` narrows there, so `leafFor` reads `props.schema`. `ViewItemMenu`'s import at `LayoutFrame.tsx:32` leaves, and `useRef` joins `:1`. The button keeps `ariaLabel="View menu"`. The row menu's two rows carry the icons too, where they never draw, since it's always a system menu (`Desktop/Actions/menu.ts:19`).

**Tests:** `viewRowMenu.test.ts` gains `viewItemMenuItems`: rows, disabled states, its separator, and no leading separator. `ViewFrame` gains: deleting from the editor closes the dropdown.

**VERIFY**

- [ ] Run the gates; `Core/Views/Settings/ViewItemMenu.tsx` no longer exists.

#### Task 5-3

`FilterFrame`'s local `FieldPicker` shares the kit's name and should become `RuleField`, the sibling of `ChipsField`, at `FilterFrame.tsx:62,407,421,422,463,475,482`. No symbol by that name exists today.

**VERIFY**

- [ ] Run the gates; `git grep -n "FieldPicker" -- Core/Views/Settings/FilterFrame.tsx` prints nothing.

#### Task 5-4

Group 19 gains this phase's outcomes.

**CASES**

Visibility's height is equal by both routes; Group opens "Grouping", Sort "Sorting", Filter "Filtering" (F-4); a view list with few rows holds 245 across the slide; the Properties list and Preview Rules scroll at 440; Layout's flat form opens no slide; the ⋮'s Duplicate and Delete run, and Delete closes the dropdown, with Use Native Menus on and off.

**VERIFY**

- [ ] Group 19 passes from a worktree of this commit, the ⋮ drawing in-app with Use Native Menus off and as a system menu with it on.

#### Review Checkpoint

- [ ] Two reviewers per *§Constraints · Reviews*, reading `MenuBack` and `SETTINGS_PANE_*` outward against every pane and `LayoutFrame`'s props outward against both of its callers.
- [ ] Drives per *§When Drives Run* (settings).
- [ ] The Number recorded. The orchestrator reads and captions six shots: Visibility by each route, the Properties list at 440, the view list's floor, the ⋮ open, and Layout's flat form.

#### Compaction Checkpoint

- [ ] The orchestrator prepares its continuation per *§Constraints · Execution* and carries on.

---

### Phase 6 — One Icon and Color Request

**GOAL:** One way to pick an icon or a color, `ColorSwatch`'s included. Eleven of 13 icon sites hold local open state, two read store fields that exist because `runEntityAction` is a module function with no component, and a site can forget its anchor, which is F-1's bug. Every site is really one trigger, one current value, and one write on pick. One `pendingChoice` slot and one App-level `IdentityChoice`, on the pattern `presentMenu`/`MenuPresenter` and `requestPick`/`MenuSeat` already set, remove both models and make the anchor a required argument. It lands before Phase 7, so the page runner's Edit Icon lands on `chooseIcon`.

#### Task 6-1

The request and its one mount should land. `IdentityChoice` reads the slot and draws the one `IconPicker` and one `ColorPicker`, and `chooseIcon`, `chooseColor`, `useChoiceOpen`, and `useIconChoice` are every site's way in. It must live in Core, since favorites need the session.

**AFTER**

```Core/Session/chromeSlice.ts diff
@@ after ValuePickRequest @@

+type ChoiceRequest = { trigger: Element; value?: string } & (
+  | { of: 'icon'; onPick: (icon: string) => void }
+  | { of: 'color'; onPick: (color: string | undefined) => void; greyscale?: boolean }
+)

@@ ChromeSlice @@

+  pendingChoice: ChoiceRequest | null
+  requestChoice: (req: ChoiceRequest) => void
+  dismissChoice: () => void

@@ createChromeSlice @@

+  pendingChoice: null,
+  requestChoice: (req) => set({ pendingChoice: req }),
+  dismissChoice: () => set({ pendingChoice: null }),

@@ module scope @@

+export const pickOpen = (s: Pick<ChromeSlice, 'pendingPick' | 'pendingChoice'>): boolean =>
+  s.pendingPick !== null || s.pendingChoice !== null
```

`resetChrome` gains `pendingChoice: null`, and `nexusSlice.ts:93` already calls it.

```Core/Assets/IdentityChoice.tsx diff
@@ new file @@

+import { type RefObject, useCallback, useRef } from 'react'
+import { useHeld } from '@pommora/uix/Animations/useExitPresence'
+import { ColorPicker } from '@pommora/uix/Pickers/ColorPicker'
+import { type IconFavorites, IconPicker } from '@pommora/uix/Pickers/IconPicker'
+import { colorNameFor } from '@pommora/uix/Theme/ramp'
+import { useLatest } from '@pommora/uix/Utilities/stableApi'
+import { iconFavoriteMenuItems } from '../Actions/identityMenus'
+import { popMenu } from '../Actions/menuActions'
+import { personalizationOf } from '../Session/configSlice'
+import { useSession } from '../Session/store'
+
+const NO_FAVORITES: string[] = []
+
+function useIconFavorites(): IconFavorites {
+  const ids = useSession((st) => personalizationOf(st).iconFavorites) ?? NO_FAVORITES
+  const setPersonalization = useSession((st) => st.setPersonalization)
+  const onChange = useCallback(
+    (next: string[]) => setPersonalization('iconFavorites', next.length ? next : undefined),
+    [setPersonalization],
+  )
+  return {
+    ids,
+    onChange,
+    onMenu: (isIconFavorite) => popMenu(iconFavoriteMenuItems(isIconFavorite)),
+  }
+}
+
+export function chooseIcon(
+  trigger: Element | null,
+  value: string | undefined,
+  onPick: (icon: string) => void,
+): void {
+  if (trigger) useSession.getState().requestChoice({ of: 'icon', trigger, value, onPick })
+}
+
+export function chooseColor(
+  trigger: Element | null,
+  value: string | undefined,
+  onPick: (color: string | undefined) => void,
+  greyscale?: boolean,
+): void {
+  if (trigger) useSession.getState().requestChoice({ of: 'color', trigger, value, onPick, greyscale })
+}
+
+export const useChoiceOpen = (trigger: RefObject<Element | null>): boolean =>
+  useSession((st) => st.pendingChoice !== null && st.pendingChoice.trigger === trigger.current)
+
+export function useIconChoice<E extends Element = HTMLButtonElement>(
+  value: string | undefined,
+  onPick: (icon: string) => void,
+) {
+  const iconRef = useRef<E>(null)
+  return {
+    iconRef,
+    iconOpen: useChoiceOpen(iconRef),
+    onIconClick: () => chooseIcon(iconRef.current, value, onPick),
+  }
+}
+
+export function IdentityChoice(): React.JSX.Element {
+  const pending = useSession((st) => st.pendingChoice)
+  const dismiss = useSession((st) => st.dismissChoice)
+  const shown = useHeld(pending, pending !== null)
+  const triggerRef = useLatest(shown?.trigger ?? null)
+  const iconFavorites = useIconFavorites()
+  return (
+    <>
+      <IconPicker
+        open={pending?.of === 'icon'}
+        onClose={dismiss}
+        triggerRef={triggerRef}
+        value={pending?.value}
+        onSelect={pending?.of === 'icon' ? pending.onPick : undefined}
+        iconFavorites={iconFavorites}
+      />
+      <ColorPicker
+        greyscale={pending?.of === 'color' ? pending.greyscale : undefined}
+        open={pending?.of === 'color'}
+        selected={colorNameFor(pending?.value)}
+        onPick={(color) => {
+          if (pending?.of === 'color') pending.onPick(color)
+          dismiss()
+        }}
+        onDismiss={dismiss}
+        triggerRef={triggerRef}
+      />
+    </>
+  )
+}
```

`useHeld` keeps the trigger through the exit, as `MenuPresenter.tsx:87-88` does, since the dismissal stack reads it then and a null ref falls back to the App root. `useLatest` assigns during render, so the ref is current before the child's layout effect reads it. `useIconFavorites` folds in, since `IconChoice` was its only reader, and `iconFavorites.ts` leaves in Task 6-3. `App.tsx:197` mounts `<IdentityChoice />` once, beside `MenuPresenter` and `MenuSeat`.

**Tests:** `Core/Assets/IdentityChoice.test.tsx`: a pick lands and closes; a re-picked color lands `undefined`; a dismissal lands nothing; `useChoiceOpen` reads true only for its own trigger. `store.test.tsx:1378-1393` asserts `pendingChoice: null` through `resetChrome`.

**VERIFY**

- [ ] Run the gates; each new test is watched red.

#### Task 6-2

The seven header sites should spread `useIconChoice`, and the view editor's header should show the view's icon and open the picker (F-5).

**AFTER**

| Site | Should Say |
|---|---|
| `SettingsFrame.tsx`, after `:77` | `const iconChoice = useIconChoice(scope ? view.icon : node.icon, (icon) => { if (scope) void saveView(view, { icon }); else void mutate({ op: 'setIcon', path: node.path, kind: node.kind, icon }) })`, with `:95-97` becoming `{...iconChoice}` |
| `PageMenu.tsx`, before its early return | `const iconChoice = useIconChoice(ownIcon, (icon) => { if (pageDetail) void mutate({ op: 'setIcon', path: pageDetail.path, kind: 'page', icon }) })` |
| `PropertyFrame.tsx`, after `configure` | `const iconChoice = useIconChoice(editing?.icon, (icon) => { if (editing) configure(editing.id, { icon }) })` |
| `OptionEditPopup.tsx:46-47` | `const { iconRef, iconOpen, onIconClick } = useIconChoice(option.icon, onPickIcon)` |
| `SpaceMenu.tsx` | `colorRef`, `colorOpen = useChoiceOpen(colorRef)`, and `iconChoice`; after its early return, `openColor = (anchor) => chooseColor(anchor, node.color, (color) => void mutate({ op: 'setSpaceColor', spaceId: id, color }))`; `:62` calls `iconChoice.onIconClick()`, `:77` is `pressed={colorOpen}`, and both mounts and the fragment leave |
| `Banner.tsx`, `PageHeader.tsx` | Spread `useIconChoice<Element>(…)` onto `DetailTitleHeader`, whose `iconEditing` and `onEditIcon` become `iconOpen` and `onIconClick`. `Banner` reads `iconOpen={iconChoice.iconOpen \|\| (home && nexusIcon.editor !== null)}` after the spread |
| `LayoutFrame.tsx` | `const iconChoice = useIconChoice(view.icon, (icon) => write({ icon }))` beside its other hooks, above the flat door's return; `title` reads `<InlineEditHeader value={view.name} icon={viewGlyph(view)} onCommit={rename} {...iconChoice} />` |

`InlineEditHeader`'s `icon`, `iconRef`, `iconOpen`, and `onIconClick` are what `useIconChoice` returns, so F-5 needs no kit change. `PropertyFrame` takes no extra dismiss: the slide's held detail keeps the trigger connected for its 305ms exit, after which the trigger rule closes the picker, so `PropertyFrame.test.tsx:711-727` leaves and `PickerMenu.test.tsx` already pins a detached trigger dismissing.

*5 — Adjacent Fixes · §5 Step 6* holds each site's hunk.

**Tests:** `PageView.test.tsx`'s `mount` renders `<IdentityChoice />` beside `PageView`, and `DetailTitleHeader.test.tsx:39,136` take `onIconClick`.

**VERIFY**

- [ ] Run the gates; `git grep -n "<IconChoice" -- Core` lists only the row sites Task 6-3 takes.

#### Task 6-3

The row sites, the store's fields, `ColorSwatch`'s own picker, and both shells' last differences should leave. Every row flow should capture its trigger at the gesture, which leaves `iconFor`, `colorFor`, `ViewFrame`'s `menuAnchorRef`, `iconTarget`, and the store's `iconPath` and `colorPath` with nothing to do. `ColorSwatch` should report its press rather than mount a `ColorPicker`, as `PickerControl` already reaches an App-level pane through a door Core sets, which cuts the last path from Menus to Pickers. `IconChoice.tsx` is deleted, `IconPicker`'s `onClose` becomes `onDismiss` and its `triggerRef` becomes required, and `NexusIconEditors.tsx` leaves, since only the cropper remains and `useNexusIcon` can return it as `editor`, as `useBannerMenu` already does.

**AFTER**

```Core/Views/Settings/ViewFrame.tsx diff
@@ rowMenu (:90-110) @@

+  const rowMenu = async (v: SavedView, e: React.MouseEvent<HTMLElement>): Promise<void> => {
+    e.preventDefault()
+    const anchor = e.currentTarget
+    const action = await popMenu(viewRowMenuItems(itemContext))
+    switch (action) {
+      case 'rename':
+        return setRenamingId(v.id)
+      case 'icon':
+        return chooseIcon(anchor, v.icon, (icon) => void saveView(v, { icon }))
+      case 'color':
+        return chooseColor(anchor, v.color, (color) => void saveView(v, { color }))
+      case 'duplicate':
+        return duplicate(v)
+      case 'delete':
+        return void deleteViewWithUndo(node, v)
+      default:
+        return
+    }
+  }
```

```Core/Interface/Menus/entityMenuActions.ts diff
@@ runEntityAction (:102-108), taking trigger from showEntityMenu @@

+    case 'title:icon':
+    case 'editIcon':
+      chooseIcon(trigger, ownIconOf(s.tree, target), (icon) =>
+        void s.mutate({ op: 'setIcon', path, kind, icon }),
+      )
+      return
+    case 'changeColor':
+      if (id)
+        chooseColor(trigger, spaceNodeOf(s.tree, id)?.color, (color) =>
+          void s.mutate({ op: 'setSpaceColor', spaceId: id, color }),
+        )
+      return

@@ module scope @@

+const ownIconOf = (tree: NexusTree | null, target: EntityMenuTarget): string | undefined =>
+  target.kind === 'context'
+    ? tree?.contexts.find((g) => g.def.title === target.title)?.def.icon
+    : target.id && tree
+      ? nodesByIdOf(tree).get(target.id)?.ownIcon
+      : undefined
```

| Site | Should Say |
|---|---|
| `useViewInteractions.tsx` | `case 'title:icon'` in `runTitleAction` calls `chooseIcon(anchor, row.icon, (icon) => void mutate({ op: 'setIcon', path: row.path, kind: 'page', icon }))`; `iconOpen`, `iconTarget`, `iconAnchor`, `openIconPicker`, and `iconPicker` leave, with `TableView.tsx:337` and `CardsView.tsx:472`'s mounts; `:442`, which read `iconOpen`, becomes `suppressed: () => pickOpen(useSession.getState()) \|\| policy.ghost.suppressed(),`, covering Cards and the Table in one place |
| `ViewTile.tsx` | `titleIconOpen = useChoiceOpen(titleIconRef)` and `rowChoiceOpen = useChoiceOpen(menuAnchorRef)`; `anchoredOpen` (`:273-274`) reads `rowChoiceOpen \|\| titleIconOpen`; `:598` reads `!titleIconOpen`; `:433-435` call `chooseIcon(titleIconRef.current, entry.display_icon ?? source.icon, (icon) => patchEntry({ display_icon: icon }))`; `:470-473` become `chooseIcon`/`chooseColor` at `menuAnchorRef.current`, the ref `rowMenu` already writes |
| `Sidebar.tsx` | `SidebarIconChoice` leaves (`:284-315,370`); `ContextGroupDisclosure` takes `const rowEl = useLineEl()` and passes `rowEl(group.def.id)` to `showEntityMenu` at `:263`; `:93`'s `trigger ?? undefined` leaves |
| `entityMenuActions.ts` | `showEntityMenu(target, trigger: HTMLElement \| null = null)`, so `chooseIcon` and `chooseColor` take it with no bridge, and `MatrixView.tsx:69` ends in `null` |
| `MatrixView.tsx` | `iconPath`, `colorPath`, `pickingId`, `pickKind`, and `picker` leave; `:45` reads `useSession(pickOpen)` and `:82` reads `if (!pickOpen(useSession.getState())) setMenuId(null)`, so `menuId` holds the node through a choice as it does through a pick; `:120` reads `((mine ? menuId : null) ?? hoveredId)` |
| `MatrixLabel.tsx` | `picking`, both pickers, `endIcon`, `endColor`, and `mutate` leave |
| `useNexusIcon(trigger)` | Renames to `.tsx`. `editIcon` calls `chooseIcon(trigger.current, profileIcon, selectGlyph)`; its state renames to `editing`, drops `'glyph'`, and it returns the `ImagePicker` as `editor`, as `useBannerMenu` does; `selectGlyph` drops `closeEditor()` and its export. `NexusPhoto.tsx:15,39` and `HomepageMenu.tsx:18,45` pass their refs and draw `{icon.editor}` |
| `Banner.tsx` | `const nexusIcon = useNexusIcon(iconChoice.iconRef)`; `iconOpen` reads `iconChoice.iconOpen \|\| (home && nexusIcon.editing !== null)`; `:156-173` become `{home && nexusIcon.editor}` |
| `editSlice.ts` | `iconPath`, `iconHost`, `beginIcon`, `endIcon`, `colorPath`, `colorHost`, `beginColor`, and `endColor` leave (`:34-41,59-62,153-156`) |
| `IconPicker.tsx` | `onClose` becomes `onDismiss` at `:26,42,61,90`; `triggerRef: RefObject<Element \| null>` is required under the doc "An SVG glyph, so `Element`."; `IconPickerProps` stops being exported |
| `IdentityChoice.tsx` | `onDismiss={dismiss}` |
| `UIX/Controls/ColorSwatch.tsx` | `onPick` and `greyscale` become `onPress: (chip: HTMLElement) => void`; the button reads `onClick={(e) => onPress(e.currentTarget)}`; `useState`, `useRef`, `chipRef`, the `ColorPicker` mount, and its import leave |
| `typeRows.tsx:82` | `item('Color', { kind: 'color', label: 'Color', selected: name, css, onPress: (chip) => chooseColor(chip, name, onPick, false) })` |
| `SettingsWindow.tsx:206-213` | The row passes `onPress: (chip) => chooseColor(chip, name, (next) => setPersonalization(row.key, next as never), row.greyscale ?? false)` in place of `greyscale` and `onPick`, since the swatch defaulted `greyscale` to false where the picker defaults it to true |

`ColorPicker`'s `open`/`onDismiss`/`triggerRef` contract serves `IdentityChoice` alone. `Sidebar.tsx:284`'s and `MatrixView.tsx:111`'s comments leave, `NexusIconEditors.tsx:6`'s with its file; `IconPicker.tsx:27` and `useViewInteractions.tsx:1` are rewritten in place. *5 — Adjacent Fixes · §5 Step 6* holds each site's hunk.

**Tests:** `IconPicker.test.tsx:27,51` take `onDismiss` and a `triggerRef`. `cardGestures.test.tsx:183` becomes `renderView(root, source(), <IdentityChoice />)`. `store.test.tsx:1383-1384,1388-1391` drop `beginIcon`, `beginColor`, and the four fields. `MenuIndex.test.tsx:103-113`'s `color` case and `typeRows.test.ts:117-120` take `onPress`. `IdentityChoice.test.tsx` gains "a swatch's press opens the color picker at its chip and lands the pick", with `IdentityChoice` mounted beside a `ColorSwatch`. `sidebarIconChoice.test.tsx:75-92,104-146` rewrite through `showEntityMenu` and `IdentityChoice`, and the Collection case leaves, since it drives the store directly and can't happen in the app. `ViewFrame` gains: Edit Icon and Edit Color hang from the row.

**VERIFY**

- [ ] Run the gates; `Core/Assets/IconChoice.tsx`, `iconFavorites.ts`, and `NexusIconEditors.tsx` no longer exist, and `git grep -n "beginIcon\|beginColor\|iconPath\|colorPath\|setIconFor\|setColorFor\|<IconChoice" -- Core UIX` prints nothing.
- [ ] A view's icon picker opens at its row, not the dropdown (F-1).
- [ ] `git grep -n "<ColorPicker" -- Core UIX ':!*.test.*'` lists `IdentityChoice.tsx` alone.
- [ ] From the repo root, `node ".claude/Planning/Metadata Picker/Scouts/Planning/Scripts/uixgraph.mjs" UIX` lists no path under its `MENUS ~> PICKERS` heading.

#### Task 6-4

The hover ghost should stand down while a leaf or a choice is open, on every surface, through one `pickOpen`. Today it never names the pending pick, so a dwell armed between the menu closing and the pane mounting fires under the pane. Task 6-3 already moved `useViewInteractions.tsx:442`, which reaches Cards and the Table, and the Matrix's two reads; the sidebar follows here.

**AFTER**

```Core/Interface/Sidebar/Sidebar.tsx diff
@@ the ghost @@

-    suppressed: () => useSession.getState().renamingPath !== null || glanceShown(),
+    suppressed: () => {
+      const s = useSession.getState()
+      return s.renamingPath !== null || pickOpen(s) || glanceShown()
+    },
```

**Tests:** `cardGestures.test.tsx`'s `beforeEach` adds `pendingPick: null, pendingChoice: null`, since a slot left by an earlier test keeps `pickOpen` true; a new case: answer a leaf, hover a second card past the dwell, and no `.ghost-card` appears until the pane closes.

**VERIFY**

- [ ] Run the gates; the pin is watched red without `pickOpen`.

#### Task 6-5

Group 19 gains this phase's outcomes.

**CASES**

Edit Icon from all 13 sites and Change Color from all 6 (a property's Color row and a Settings color row among them), each landing in its file; F-5's header draws the view's glyph and opens the picker at it; a tile's strip stays revealed through a pick from a strip row; a Matrix label stays through an icon pick; a pane's picker closes when its row leaves; F-5's header icon opens and saves.

**VERIFY**

- [ ] Group 19 passes from a worktree of this commit.

#### Review Checkpoint

- [ ] Two reviewers per *§Constraints · Reviews*, reading `pendingChoice` and the trigger rule outward against every shell.
- [ ] Drives per *§When Drives Run* (settings), plus the Option Picker Drive.
- [ ] The Number recorded. The orchestrator reads and captions six shots: an icon picker at a view row, F-5's header, a color pick on a Space, a Matrix node's pick, a tile's strip through a pick, and an option's icon popup.

---

### Phase 7 — Right-Click

**GOAL:** One page menu, one runner, and one metadata menu file. A page's menu is built and run twice today; what a host must supply is only rename, new page, and its row with a writer, since each of those depends on where its state lives. A row should exist exactly when its handler does, so "no New Page on the Matrix" lives in one place. This phase lands last among the code because `showPageMenu` builds on `itemColumns` (Phase 4) and `chooseIcon` (Phase 6). Menus stay system menus (D-1).

#### Task 7-1

`propertyRows.ts` and `propertyMenuActions.ts` should become one `Core/Actions/metadataMenu.ts`, and `titleMenuContext`, `runTitleAction`, `cardMenu.ts`, the `'title'` arm of `cellMenu`, and the page branch of `entityMenuItems` should give way to `showPageMenu`. These land as one commit, since the rows, the runner, and the hosts only typecheck as a set. `pageMetaMenuItems` renames to `pageMenuItems`, joining `tabMenuItems`, `navRowMenuItems`, and `entityMenuItems`, and it takes one `metadata` list, so E-6's "branches twice" can't recur.

**AFTER**

```Core/Actions/metadataMenu.ts diff
@@ new file, replacing propertyRows.ts and propertyMenuActions.ts @@

+const PREFIX = 'prop:'
+
+const CHECKBOX_OPTIONS = [
+  { id: 'true', label: 'Check' },
+  { id: '', label: 'Uncheck' },
+] as const
+
+export interface MetadataTarget {
+  row: ViewRow
+  schema: PropertyDefinition[]
+  rowOf: () => ViewRow | undefined
+  commit: (column: ResolvedColumn, value: PropertyValue | null) => void
+  trigger: HTMLElement
+  styleOf?: (column: ResolvedColumn) => ColumnStyle
+}
+
+export function metadataBranches(
+  { row, schema }: MetadataTarget,
+  tree: NexusTree | null,
+): ActionItem<MetadataAction>[] {
+  const contexts = contextsByIdOf(tree)
+  const branchRow = (column: ResolvedColumn): ActionItem<MetadataAction> => {
+    const label = columnLabel(column, contexts)
+    const leaf = `${PREFIX}${column.id}` as const
+    const option = (
+      o: { id: string; label: string },
+      checked: boolean,
+    ): ActionItem<MetadataAction> => ({ label: o.label, action: `${leaf}:${o.id}`, checked })
+    const current = resolveFieldValue(row, column)
+    if (column.type === 'checkbox') {
+      const checked = current.kind === 'checkbox' && current.value
+      return {
+        label,
+        submenu: CHECKBOX_OPTIONS.map((o) => option(o, (o.id === 'true') === checked)),
+      }
+    }
+    if (pickKindOf(column.type) === null) return { label, action: leaf }
+    const selected = selectedValues(current)
+    return {
+      label,
+      submenu: joinGroups(
+        pickGroups(column, contextOptionsFor(column, tree, row.id)).map((g) =>
+          g.options.map((o) => option(o, selected.includes(o.id))),
+        ),
+      ),
+    }
+  }
+  const item = itemColumns(tree, schema, row.id)
+  return (['contexts', 'properties'] as const).flatMap((key) =>
+    item[key].length > 0 ? [{ label: GROUP_LABELS[key], submenu: item[key].map(branchRow) }] : [],
+  )
+}
+
+export function runMetadataAction(
+  action: string,
+  { row, schema, rowOf, commit, trigger, styleOf }: MetadataTarget,
+): boolean {
+  const parsed = parseAction(action)
+  if (!parsed) return false
+  const { id, value } = parsed
+  const s = useSession.getState()
+  const column = resolveColumn(id, schema, contextIdsOf(s.tree))
+  // The property can leave between the menu opening and the pick; the pick then writes nothing.
+  if (!column) return true
+  const pick = pickKindOf(column.type)
+  if (value === null) s.requestPick({ rowOf, column, trigger, commit, style: styleOf?.(column) })
+  else if (column.type === 'checkbox') commit(column, checkboxValue(value === 'true'))
+  else if (pick) commit(column, pickedValue(pick, resolveFieldValue(row, column), value))
+  return true
+}
```

`metadataMenu.ts` takes `MetadataAction` from `./pageMenu` as a type, since `Core/Testing/engineGraph.ts` counts `import type` too and `pageMenu.ts` sits on the engine path through `Actions/handlers.ts`, `editorMenu.ts`, and `gripMenu.ts`, while `metadataMenu.ts` reaches the store. `parseAction` is `parsePropertyAction` (`propertyRows.ts:52-59`) unchanged and private. `itemColumns` gives it C-7's order with no sort, so `propertyMenuBranches`' option-first line leaves. An empty option list stays `{ label, submenu: [] }`, which both renderers grey (`Desktop/Actions/menu.ts:25-28`, `menuRows.ts:8`), as D-7 keeps it. "The property can leave…" moves unchanged. `runMetadataAction`'s request carries no `holder`, and `MenuSeat` takes it from `holderOf` below.

```Core/Actions/pageMenu.ts diff
@@ PageMenuContext (:29-34) @@

-export interface PageMenuContext {
+export interface PageMoveContext {
   moveTargets?: MoveTarget[]
   currentParentPath?: string
-  spaces?: PropertyMenuRow[]
-  properties?: PropertyMenuRow[]
 }

@@ the types @@

+export type MetadataAction = `prop:${string}`
+export type NewPageRows = keyof typeof NEW_PAGE_ROWS
+type PageMenuAction = PageMetaAction | PageMoveAction | MetadataAction | 'image:edit'

@@ replacing pageMetaMenuItems @@

+export function pageMenuItems(
+  ctx: PageMoveContext & {
+    alreadyOpen?: boolean
+    newPages?: NewPageRows
+    editImage?: boolean
+    metadata?: readonly ActionItem<MetadataAction>[]
+  },
+): ActionItem<PageMenuAction>[] {
+  return joinGroups<PageMenuAction>([
+    [
+      ...(ctx.editImage ? [{ label: 'Edit Image', action: 'image:edit' as const }] : []),
+      ...pageOpenRows({ alreadyOpen: ctx.alreadyOpen, window: true }),
+    ],
+    [RENAME_ROW, { label: 'Edit Icon', action: 'title:icon' }, ...(ctx.metadata ?? [])],
+    ctx.newPages ? NEW_PAGE_ROWS[ctx.newPages] : [],
+    ...pageSendGroups(ctx, true),
+    REMOVAL_ROWS,
+  ])
+}
```

`pageMenu.ts:2`'s import from `./propertyRows` leaves with that file. `tabMenu.ts:6,13,21`, `navRowMenu.ts:4,11`, `pageMenuActions.ts:2,13`, and `pageSendGroups` (`pageMenu.ts:83`) take `PageMoveContext`.

`Core/Actions/entityMenu.ts`: `EntityMenuTarget` drops `PageMenuContext` and gains `metadata?`; its union splits `page` so an `id` is required there; `entityMenuItems` loses `:44-52`; `:88` reads `...(target.metadata ?? [])`; `EntityMenuAction` takes `Extract<PageMetaAction, 'title:rename' | 'title:copypath' | 'title:reveal' | 'title:archive' | 'title:delete'>` in place of the whole union and drops `PageMoveAction`.

`Core/Actions/cellMenu.ts` loses `{ kind: 'title' }` and its arms (`:3-9,15,32-34,95,109,117-126`). `:64-65` are deleted, and `cellMenuContextFor` and `baseCellMenu` take `type: ColumnType` (`:46,58`): the seat is the only production caller, a title never reaches `seat.menu` (the Table routes it away at `TableView.tsx:233`, cards drop it at `cardColumns.ts:24`, and the panel lists only properties and Contexts), and `column.type` is never undefined. `cardMenu.ts` is deleted.

```Core/Interface/Menus/pageMenuActions.ts diff
@@ new, beside popPageActions @@

+interface PageMenuHost {
+  trigger: HTMLElement | null
+  rename: () => void
+  newPage?: { rows: NewPageRows; create: (where: 'above' | 'below') => void }
+  editImage?: () => void
+  values?: MetadataTarget | null
+}
+
+export async function showPageMenu(
+  page: { id: string; path: string; title: string },
+  { trigger, rename, newPage, editImage, values }: PageMenuHost,
+): Promise<void> {
+  const { tree, tabs, pinned, mutate } = useSession.getState()
+  const action = await popMenu(
+    pageMenuItems({
+      ...pageMoveContext(tree, page.path),
+      alreadyOpen: isOpenInTabs(tabs, pinned, { kind: 'page', id: page.id, path: page.path }),
+      newPages: newPage?.rows,
+      editImage: editImage !== undefined,
+      metadata: values ? metadataBranches(values, tree) : undefined,
+    }),
+  )
+  if (!action || (values && runMetadataAction(action, values)) || runPageAction(action, page))
+    return
+  switch (action) {
+    case 'title:rename':
+      return rename()
+    case 'title:icon':
+      return chooseIcon(trigger, tree?.config.pageMetadata[page.id]?.icon, (icon) =>
+        void mutate({ op: 'setIcon', path: page.path, kind: 'page', icon }),
+      )
+    case 'title:newabove':
+      return newPage?.create('above')
+    case 'title:newbelow':
+      return newPage?.create('below')
+    case 'image:edit':
+      return editImage?.()
+  }
+}
```

```Core/Interface/Menus/entityMenuActions.ts diff
@@ replacing showEntityMenu's assembly (:49-75) @@

+async function readTarget(
+  target: EntityMenuTarget,
+  trigger: HTMLElement,
+): Promise<MetadataTarget | null> {
+  const { tree } = useSession.getState()
+  const node = target.kind === 'space' && target.id ? spaceNodeOf(tree, target.id) : null
+  const row =
+    node && tree
+      ? spaceRowOf(tree, node)
+      : target.kind === 'page'
+        ? await fetchPageRow(tree, target)
+        : null
+  if (!row) return null
+  const writer = oneShotWriter(row)
+  return {
+    row,
+    schema: holderSchema(tree, node ?? target.path),
+    rowOf: () => writer.current.rowOf(row.id),
+    commit: (column, value) => void assignValue(writer, row, column, value),
+    trigger,
+  }
+}
+
+export async function showEntityMenu(
+  target: EntityMenuTarget,
+  trigger: HTMLElement | null = null,
+): Promise<void> {
+  const values = trigger && target.id ? await readTarget(target, trigger) : null
+  const s = useSession.getState()
+  const { path, host } = target
+  if (target.kind === 'page')
+    return showPageMenu(target, {
+      trigger,
+      rename: () => s.beginRename(path, false, host),
+      // A graph holds no slot for a sibling to land in.
+      newPage:
+        host === 'matrix'
+          ? undefined
+          : { rows: 'pair', create: (where) => void newPageAdjacent(path, where, host) },
+      values,
+    })
+  const creators = creatorsFor(target)
+  const shown = {
+    ...target,
+    alreadyOpen:
+      target.kind !== 'context' &&
+      target.id !== undefined &&
+      isOpenInTabs(s.tabs, s.pinned, selectTargetOf({ ...target, id: target.id })),
+    metadata: values ? metadataBranches(values, s.tree) : undefined,
+  }
+  const action = await popMenu(entityMenuItems(shown, creators))
+  if (action === null || (values && runMetadataAction(action, values))) return
+  runEntityAction(shown, creators, action, trigger)
+}
```

`showEntityMenu`'s existing doc comment stays in place. `runEntityAction` loses `:86`, `case 'title:icon'` (`:102`), and `:109-112`, keeping `title:rename` and `title:delete` for containers, `title:archive` for a Set, and `rename` and `editIcon` for Spaces and Contexts. `showEntityMenu` takes over `alreadyOpen` and the move list, so `Sidebar.tsx:70-95` passes only `{ kind, id, path, title, disclosureLocked, host: 'sidebar' }` and `MatrixView.tsx:63,70-81` passes `{ kind, id, path, title, host: 'matrix' }`.

```Core/Views/Host/useViewInteractions.tsx diff
@@ replacing titleMenuContext and runTitleAction (:395-435) @@

+  const liveRows = useLatest(rowById)
+  const pageMenu = (row: ViewRow, anchor: HTMLElement, editImage?: () => void): Promise<void> =>
+    ghost.suppressWrap(() =>
+      showPageMenu(row, {
+        trigger: anchor,
+        rename: () => policy.rename(row, false),
+        newPage: {
+          rows: policy.newPages,
+          create: (where) => void creation.createAdjacent(row, where),
+        },
+        editImage,
+        values: {
+          row,
+          schema,
+          rowOf: () => liveRows.current.get(row.id) ?? row,
+          commit: (column, value) => void commitValue(row, column, value),
+          trigger: anchor,
+          styleOf,
+        },
+      }),
+    )
```

`ViewInteractionPolicy` gains `newPages: NewPageRows`: `'pair'` at `TableView.tsx:87`, `'single'` at `CardsView.tsx:172`. The return swaps `titleMenuContext, runTitleAction` for `pageMenu`, `chooseIcon`'s import leaves, `tree` leaves the destructure at `:91`, which lint would otherwise flag, and the head comment (`:1`) reads "the page menu" in place of "the title menu's page actions". `ownIconOf` stops serving pages, so its second arm reads `target.id ? spaceNodeOf(tree, target.id)?.icon : undefined`, as `changeColor` reads beside it, and `nodesByIdOf` leaves the imports. `pageMenu` must go through `useStableApi` on cards (`CardsView.tsx:268`) and the Table (`TableView.tsx:231`), as `runTitleAction` did. D-2 holds because `commitValue`, not `commitOnCard`, sits in `values`.

```Core/Views/Table/TableView.tsx diff
@@ openTitleMenu (:147-159) @@

+const openTitleMenu = (row: ViewRow, e: React.MouseEvent): void => {
+  e.preventDefault()
+  e.stopPropagation()
+  const el = e.currentTarget as HTMLElement
+  const cell = el.closest<HTMLElement>('.data-cell') ?? el
+  void interactions.pageMenu(
+    row,
+    cell.querySelector<HTMLElement>('.cell-title > :first-child') ?? cell,
+  )
+}
```

```Core/Views/Cards/CardsView.tsx diff
@@ onCardContextMenu (:922-939) @@

+const onCardContextMenu = (e: React.MouseEvent): void => {
+  e.preventDefault()
+  e.stopPropagation()
+  if (drag.isDragging) return
+  const anchor = textRef.current ?? (e.currentTarget as HTMLElement)
+  void api.pageMenu(
+    row,
+    anchor,
+    banner === 'banner' && cover
+      ? () => api.banner({ id: row.id, kind: 'page', frame: thumbRef.current ?? anchor, mode: 'edit' })
+      : undefined,
+  )
+}
```

`CardApi` swaps `titleMenuContext` and `titleAction` for `pageMenu: (row: ViewRow, anchor: HTMLElement, editImage?: () => void) => Promise<void>`. `holdGhost` and `GhostSuppress.Provider` leave with their one reader at `CardsView.tsx:919`. `interactions.holdGhost` stays for the banner menu at `:262`, and `:261`'s comment leaves.

`GhostSuppress` should leave the kit with this. `useBannerMenu`'s read only ever returns the default passthrough, since its callers sit above that Provider or under none, and the sidebar's two readers already hold `SidebarGhostApi`. `sidebarGhostApi` gains `suppressWrap` (`Sidebar.tsx:163-169,342`); `:115,250` leave and `:145,262` read `void api?.suppressWrap(…)`. `GhostSuppress` leaves `UIX/Interactions/ghostCreate.ts:10-11` and `Sidebar.tsx:12,413,441`. `useBannerMenu.tsx:6,33` leave, and `:66` calls `popMenu` directly. Cards and the Table gain Preview and Reveal Location with no runner work, since `runPageAction` already answers both.

**The Route:** `MenuSeat` should resolve columns as every other seat host does, stop reading its registry through a kind branch, and take `holder` from `holderOf`.

```Core/Properties/Cells/ValueSeat.tsx diff
@@ MenuSeat @@

-  const registry = useSession((s) => s.tree?.config.registry)
+  const tree = useSession((s) => s.tree)
-    // A definition can change under its open picker, so a property's column resolves from the live registry.
-    columnOf: (id) => {
-      if (held?.column.kind !== 'property') return held?.column
-      const def = registry?.find((d) => d.id === id)
-      return def && propertyColumn(def)
-    },
+    columnOf: (id) => resolveColumn(id, tree?.config.registry ?? NO_SCHEMA, contextIdsOf(tree)),
-    holder: () => held?.holder,
+    holder: (row) => holderOf(row, identityOf(tree)),
```

`propertyColumn`'s import leaves `ValueSeat.tsx:6`, and `resolveColumn`, `contextIdsOf`, `identityOf`, `holderOf`, and `NO_SCHEMA` (`Core/Nexus/treePatch`) join its imports. `holderOf` narrows to `(row, { spaces }: Pick<ValueContext, 'spaces'>)` at `valueContext.ts:25`. `ValuePickRequest` becomes `Pick<MetadataTarget, 'rowOf' | 'commit' | 'trigger'> & { column: ResolvedColumn; style?: ColumnStyle }`, a type-only import, so three fields are stated once and `holder` leaves `chromeSlice.ts:20`. The comment at `ValueSeat.tsx:322` leaves, since `columnOf` reads like every other host's, and `MenuSeat`'s comment at `:312` keeps stating the open-away rule.

**Tests:**

- `ValueSeat.test.tsx`: the menu seat resolves a Context and a stamp through the shared route. `:302-309` stays green, since it grows the store's registry.
- `propertyMenuActions.test.ts` and `propertyRows.test.ts` merge into `Core/Actions/metadataMenu.test.ts`; `:90-99` flips to schema order, `stage, Tags, Count, Done`; `:50-87,171,270`'s harness takes `MetadataTarget`; new cases: `order.contexts` honored, and an empty Select reads `{ label: 'Stage', submenu: [] }`.
- `cardMenu.test.ts` and `cellMenu.test.ts:8-28` are reborn in `pageMenu.test.ts` with Preview and Reveal Location; `pageMenu.test.ts:17,60,79` take the signature and `:37` leaves; `pageMenuItems`' three knobs gain cases.
- `cellMenu.test.ts:30-43,159-162,166-170,259` leave; `:272` moves its `hideable` case onto an empty Context.
- `useBannerMenu.test.tsx:8,42-53` and `:78-88`'s ghost assertion leave.
- `entityMenu.test.ts:20-40,126-140,143-149` move to `pageMenu.test.ts`, the Matrix case pinned through `showEntityMenu`; `:91-92`'s `spaces` and `properties` become `metadata`.
- `Core/Interface/Menus/pageMenuActions.test.ts`, new: each host handler runs on its action, and an absent `newPage` draws no row.
- `MatrixView.test.tsx:185-189`, `cardGestures.test.tsx:173-181,188-193`, `cellGestures.test.tsx:500-519`, and `Desktop/Actions/menu.test.ts:73` stay green untouched.

**VERIFY**

- [ ] Run the gates; Phase 0's D-2 pin passes unchanged.
- [ ] `git grep -n "titleMenuContext\|runTitleAction\|pageMetaMenuItems\|propertyMenuBranches\|PropertyMenuRow\|cardMenuModel" -- Core` prints nothing.
- [ ] `Core/Actions/metadataMenu.ts` stands near 100 lines against the 160 it replaces.
- [ ] `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` pass, which fails if `MetadataAction` moves back to `metadataMenu.ts`.
- [ ] `git grep -n "GhostSuppress" -- Core UIX` prints nothing.

#### Task 7-2

Every right-click outcome should run against the real app. Group 17 (Right-Click) opens in the Properties Drive, and `scripts/README.md:93-97` reads "in nineteen groups". *6 — Testing and Docs · §Group 17* holds the cases.

**CASES**

- **Surfaces:** sidebar page, sidebar Space, Table title, Table grip, card, Matrix node. Each reads `labels(rows)` against one expected list with its reasons: a card's single New Page and Edit Image, no New Page on the Matrix. Every row runs on each surface: Rename, Edit Icon, New Page, Preview, Reveal Location through `__drive.revealed`, Move To, Copy Link, Copy Path, View History, Archive, Delete.
- **Value Rows:** Select, Multi, Status, Context, Checkbox Check and Uncheck, Date, Number, Text, Link, File through `__drive.dialogs`, and an empty Select reading `{ label, enabled: false }` (D-7).
- **D-1:** every metadata menu is recorded by `Menu.popup`; none draws in `MenuPresenter`.
- **D-2:** sidecar bytes unchanged after a right-click value on a hidden property, and the column stays hidden.
- **D-3:** an option created mid-pick joins; no `.ghost-card` while a leaf is open, with a glance read as its control (the recipe: park off the card, step `mouseMoved` across `.card-text` four times at 60 ms, dwell 1.5 s).
- **C-7:** after reordering Contexts and the schema, a card's Add, the panel, and both system branches read one order, and a Space uses its `$order`.
- **The Matrix:** step the pointer over the canvas in 24px increments until `[data-node-id]` appears, then right-click there; confirm `Move To` is present, since the first node hit may not be a page; a label stays through an icon pick.

**VERIFY**

- [ ] Group 17 passes from a worktree of this commit.

#### Review Checkpoint

- [ ] Two reviewers per *§Constraints · Reviews*, reading `showPageMenu` outward against `tabMenu`, `navRowMenu`, `connectionMenu`, and `popPageActions`, which D-5 keeps separate, and against the Matrix.
- [ ] Drives per *§When Drives Run* (menu).
- [ ] The Number recorded. The orchestrator reads and captions six shots: a card's menu, the Table's menu, the Matrix node's menu, a Date leaf's pane, a Spaces branch in the panel's order, and a hidden property staying hidden.

---

### Phase 8 — Closeout

**GOAL:** The seat should sit with what it routes to, every doc should read true, and the run should hand over to *§Final Verification*. It holds no production delta. The seat moves last so its file moves once, and docs land after the final drives so nothing they describe is still changing.

#### Task 8-1

`Cells/` should return to drawing values (B-3), with the seat beside everything it opens.

**PROCEDURE**

1. `git mv Core/Properties/Cells/ValueSeat.tsx Core/Properties/Pickers/ValueSeat.tsx` and `git mv Core/Properties/Cells/ValueSeat.test.tsx Core/Properties/Pickers/ValueSeat.test.tsx`.
2. Re-point `App.tsx:29`, `PropertyPanel.tsx:20`, `useViewHost.ts:36`, `CardsView.tsx:56`, `TableView.tsx:13`, `MetadataPicker.tsx`'s type import, and the test's import, and shorten the moved file's own `../Pickers/…` imports to `./…`.

**VERIFY**

- [ ] Run the gates; `ls Core/Properties/Cells` lists `Cell`, `CheckboxGlyph`, `LinkCell`, `OptionChip`, and `TextCell` with their tests and styles alone.
- [ ] `git log --follow --oneline -2 -- Core/Properties/Pickers/ValueSeat.tsx` reaches this plan's earlier commits.

#### Task 8-2

All seven drives should pass, every group, from a worktree of this head, before anything is written about them.

**VERIFY**

- [ ] All seven pass on Task 0-5's groups with Properties `1`–`19`. A CSS-order visual pass, since vanilla-extract emits in import order and this work reorders 94 module pairs: one `shot` each of the Add list, a slid calendar, and Visibility under each Appearance setting (`Core/Settings/frames.ts:514`), captioned against the same three from Task 0-5's run.
- [ ] The orchestrator reads and captions one shot per decision group.

#### Task 8-3

Every doc should read true, replacively, under `r/studio-documentation`. *§Reconciliation* is the list, and *Investigation · §What Becomes False · §Docs* holds each row's exact wording.

**PROCEDURE**

1. Apply every doc row, each as a replacement in place, adding no section.
2. In `IssuesPM.md`: delete I-027's and I-042's blocks, index rows, and footnotes; rewrite I-075's `:1120` sentence and `[^75]`; re-anchor `[^51]` for whatever moved, in `~#-#` ranges.
3. File `reveal-parity`'s missing fixtures as a new issue at the index's bar: cited, graded, reviewed by a read-only agent other than its finder, and placed in the Area it belongs to.
4. Run `python3 ~/"The Studio/.claude/scripts/index-issues/index-issues.py" .claude/IssuesPM.md` last. I-051 becomes I-049 and I-075 becomes I-073 before the new issue lands; the final report gives every changed number.

**VERIFY**

- [ ] Run the gates; `node .claude/scripts/check-atlas.mjs` exits 0.
- [ ] `git grep -n "chooser\|add-picker\|behind one barrel" -- .claude/Features .claude/Resources .claude/Guidelines .claude/scripts` prints nothing.
- [ ] The Number recorded for Phase 8; its own delta ±0 in production.

---

### Completion Criteria

- **Conformance:** the implementation adheres to the project's guidelines, Nathan's stated preferences, and *§Constraints*; no mechanism landed that an existing one already provided, every file created, moved, or deleted is one *§Constraints · Placements* names, and nothing changed outside what the plan named.
- **Correctness:** each decision is observably true: the Add list works one way on cards and in the panel on every entry type; a right-click value leaves the saved view alone; every page menu carries one row list with its reasoned differences; a low card's calendar ends above its trigger, inside the window; a press beside a dropdown in a pane only closes it; and the whole works end to end as a user would use it, driven live.
- **Completeness:** every task landed and is ticked; nothing was deferred, narrowed, or left as scaffolding, debug output, or an unauthorized TODO.
- **Confirmation:** every verification ran and its result was read; every new test goes red without its change.
- **Continuity:** *§Reconciliation* is walked, the project's living documents read true, and every deviation is fixed or ruled on.
- **Confidence:** gates are green from a clean state across the full range from the BASELINE head, and the diff is the size the Net Ledger implied.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

The reviews run over `<BASELINE>..HEAD`, each wave closed before the next opens. Every reviewer brief carries the Approach and Principles verbatim and has its agent read *§Constraints* whole, except the neutral gate's. Every agent here runs at `opus-xhigh`.

- [ ] **Wave One:** two read-only reviewers briefed with `code-simplification`, one reading inward at the diff and one reading outward against the rest of Core, Desktop, and UIX; one fix agent folds what holds as numbered fixes beside a Not Taken list with reasons; the fold commits, and all seven drives run from a worktree of that head.
- [ ] **Wave Two:** two fresh reviewers briefed with `adversarial-review`, one inward and one outward, over the folded range and given the Not Taken list, so a fold left out returns only on new evidence; folded, committed, and driven the same way.
- [ ] **Wave Three, Only If It Helps:** run it where Wave Two's folds were structural, as a final look rather than churn for its own sake. The orchestrator states in chat why it ran or didn't.
- [ ] **The Neutral Gate:** one agent given only `<BASELINE>..HEAD`, the Approach and Principles, and the intention under *§Constraints · Neutral Gate*. It answers *§The Measure*: is the result concretely less, and does a before-and-after assessment prefer the after? A yes-or-no verdict, its corrections, and the strengths to keep, re-run after a fold.
- [ ] **The Own Pass:** the gates from a clean state and `npm run build`; the diff read once; `git diff --stat <BASELINE>..HEAD -- Core/Sync Sync` prints nothing; a comment count at both ends shows no growth; *§Completion Criteria* ticked.
- [ ] **The Teardown:** `git worktree remove --force "$WT"` and `git worktree prune`; Run Start's `caffeinate` stopped by its task; every scratch Nexus, userData, and script the run made removed, apart from `$SHOTS`, which the report cites.
- [ ] **The Cold-Machine Check:** each of these prints nothing, or only what it names: `git worktree list` (the main checkout alone); `ls -d "$TMPDIR"/pommora-drive-* 2>/dev/null`; `ls -d ~/Benchmark-* 2>/dev/null`; a process listing for Electron or Node carrying a worktree or scratch path; `pgrep caffeinate`; and the `~/Test` hash matching Task 0-5's. Nathan's own instance isn't the run's and stays.
- [ ] **Reconciliation:** *§Reconciliation* walked; *§Deviations* ruled on; STATUS and BASELINE's End filled, and the plan commits with `--only`.
- [ ] **The Report:** in `closeout-review`'s closeout format, with the range presented through `view-delta`, `<net> (+<added> / -<removed>)` per phase and in total, every deviation, the issue renumbering, the Cold-Machine Check's result, the screenshots' session, and the neutral gate's answer verbatim. PushNotification tells Nathan it's ready.

#### Reconciliation

Each row's exact wording is in *Investigation · §What Becomes False*.

- `.claude/Features/PropertiesPM.md:115,117,119` — "one control … can open on a chooser pane"; "opens that group's chooser"; "A row shows once it holds a value"; "registry order" — Task 8-3
- `.claude/Features/ViewTypesPM.md:122` — "A two-stage **add-picker**"; "The value, add, icon, and image pickers mount at the grid level", which drops "icon" — Task 8-3
- `.claude/Features/ViewTypesPM.md:130` — a card's row list, already false — Task 8-3
- `.claude/Features/InterfacePM.md:34,38,41` — the surfaces, the Open row, and New Page — Task 8-3
- `.claude/Features/InteractionPM.md:16` — "decided per open once its content is in" — Task 8-3
- `.claude/Resources/PommoraUIX.md:293` — "behind one barrel" — Task 8-3
- `.claude/Resources/PommoraUIX.md:210` — the Feel row, "Duration + snap … for the drag engine", with `BASE_FEEL` on `baseEase` — Task 8-3
- `.claude/Resources/PommoraUIX.md:255` — "The switch shape holding a color, anchoring a ColorPicker" — Task 8-3
- `.claude/Resources/PommoraUIX.md:357,364,373,380,383,385` — the folder sentence; the `Manage` and `PickerControl` rows' tables; "measured height"; the `PickerMenu` row; icon favorites' binding — Task 8-3
- `.claude/IssuesPM.md` — I-027, I-042 (blocks, index rows, `[^27]`, `[^42]`); `:1120`; `[^75]`; `[^51]` — Task 8-3
- `.claude/scripts/README.md:10-16,93-97,99-107` — the surface list, "in fifteen groups", the focus claim — Tasks 0-3, 2-7, 4-3, 7-2
- `.claude/scripts/Properties Drive/MATRIX.md:3,143,154` — the source, "chooser", group 15's row — Tasks 0-2, 2-7, 4-3
- `.claude/scripts/Properties Drive/live-drive.mjs:870,974,975,979`, `Text Property Drive/live-drive.mjs:256,679,682,684,685,688` — "chooser" — Task 4-3
- `.claude/scripts/reveal-parity/run.mjs:545` — "An open chooser holds its + shown" — Task 4-3; the drive itself stays stranded (Call 9)
- `Metadata Picker — Decisions & Intention.md` — the restated decisions and *§Open Items* — Task 0-1
- `UIX/Pickers/PickerMenu.tsx:136` — "Point-anchored menus … a false positive" — Task 2-1
- `UIX/Menus/PickerControl.tsx:159` — "Reaches the trigger even when the menu took the left press." — Task 2-6
- `UIX/Menus/FrameSlide.tsx:63` — "Height eases only across a flip" gains the snap's reason — Task 2-4
- `Core/Properties/Pickers/valueClick.ts:1` — "a Date opens the calendar" — Task 4-1
- `Core/Properties/Cells/ValueSeat.tsx:251,259` — `SeatChooser`'s doc; "one picker, which a surface's add chooser shares" — Task 4-1
- `Core/Views/Cards/CardsView.tsx:193,215` — "the Add chooser"; the emptied banner — Task 4-1
- `UIX/Menus/frame-slide.css.ts:4`, `UIX/Menus/frames.css.ts:129` — the floor's knob; the ceiling's knob — Task 5-1
- `UIX/Pickers/IconPicker.tsx:27` — "Omit ⇒ anchors to the picker's own mount point" — Task 6-3
- `Core/Assets/NexusIconEditors.tsx:6` — "The glyph picker and the photo cropper", leaving with its file — Task 6-3
- `Core/Views/Host/useViewInteractions.tsx:1` — "the icon picker seat" (Task 6-3); "the title menu's page actions" and `:404` (Task 7-1)
- `Core/Interface/Sidebar/Sidebar.tsx:284`, `Core/Matrix/MatrixView.tsx:111` — `SidebarIconChoice`'s and `pickingId`'s comments — Task 6-3
- `Core/Views/Table/TableView.tsx:147,151` — the two-step title menu's comments — Task 7-1
- `Core/Views/Cards/CardsView.tsx:261` — "The seat sits above the ghost's Provider" — Task 7-1
- `UIX/Interactions/ghostCreate.ts:10` — "For native menus popped inside memoized children" — Task 7-1
- `Core/Properties/Cells/ValueSeat.tsx:322` — `columnOf`'s kind-branch comment — Task 7-1
- `cardGestures.test.tsx:236,275`, `PropertyPicker.pane.test.tsx:151-248`, `valueClick.test.ts:21-25`, `cardColumns.test.ts:6-12,62-81,109-121` — the chooser's tests and a Date's intent — Task 4-1
- `PropertyFrame.test.tsx:711-727` — a picker dying with its host; `PageView.test.tsx:266-279` and `DetailTitleHeader.test.tsx:39,136` — a picker mounted at its site, `onEditIcon` — Task 6-2
- `cardGestures.test.tsx:182-187` — "the one root icon picker", mounted at the view — Task 6-3
- `propertyMenuActions.test.ts:90-99`, `cellMenu.test.ts:8-43,159-170,259,272`, `useBannerMenu.test.tsx:8,42-53,78-88`, `pageMenu.test.ts:37`, `entityMenu.test.ts:20-40,91-92,126-149` — option-first order, the `'title'` arm, Reveal only where asked for — Task 7-1
- **These Hold:** `InteractionPM.md:48`, `ConfigurationPM.md:32`, `MatrixPM.md:49`, `ContextsPM.md:37`, `SymbolsPM.md:67`, `ViewTypesPM.md:62,91`, `IssuesPM.md:1116`, and `.claude/CLAUDE.md:108-109` (Call 7).

#### Open Items

- Reduced motion: the flip's move ignores `prefersReducedMotion`, as `FrameSlide`'s own transitions and `slideIn` do. The plan keeps them one rule, and nothing here changes it.

#### Deviations

- **Phase 2 Review (`2a8cae9a0`):** a flip starts from the pane's measured top rather than `crossing`, which assumed an unfenced old box and jumped by the fence's correction; `crossing` and `TriggerBox.height` left, and the fence holds a too-tall pane's top on both sides. Tasks 2-3 and 2-4's AFTERs show the forms the review replaced.
