### Metadata Picker — Decisions & Intention

**DATE:** 11-01-2026
**STATUS:** RATIFIED 11-01-2026

### Context

Every in-app pane that sets an item's Spaces or property values runs through one value seat (`useValueSeat` and `ValueSeat` in `Core/Properties/Cells/ValueSeat.tsx`), which turns a click into a commit, the operating system's file dialog, an inline field, a typed popover, or the option and calendar picker (`Core/Properties/Pickers/PropertyPicker.tsx`). Four hosts mount the seat: the Table, Cards, the Properties panel, and `MenuSeat`, the App-level seat that opens a value picked from a system menu's **Spaces ▸** or **Properties ▸** leaf. The card's and the panel's **Add** choosers ride the same picker as a prop-switched mode, and every value lands through `assignValue` by one of three writers. The Table's multi-row pick has its own component (`MassPropertyPicker.tsx`).

What an item can show, add, or set is decided three times — the card's Add (`Core/Views/Cards/cardColumns.ts`), the panel's Add (`Core/Properties/PropertyPanel.tsx`), and the system menu's branches (`Core/Interface/Menus/propertyMenuActions.ts`) — in three orders. The card's Add slides into option lists only; a date or typed value closes the chooser and remounts the picker elsewhere, while the panel's Add never slides and reopens a picker a frame later. The in-app menu stand-in (`MenuPresenter`) never shows Spaces or Properties: every menu carrying those branches opens without a trigger and is always a system menu (`Core/Actions/menuActions.ts:12`).

### Overview

This work should leave one place to start from when assigning or managing an entity's metadata, `MetadataPicker`, beside one value's own picker, `PropertyPicker`, with the Add code out of `PropertyPicker`, one entry builder, one route from a system menu, one page menu, and the residue of their patched-on growth removed. The kit pieces these share with other surfaces (`PickerMenu`, `FrameSlide`, `MenuTopRow`) and the picker-related cleanup found beside them join the same line of work. *Metadata Picker — Scout Findings* records the investigation (the reconciled account, findings M-1 to M-46), with its five reports under `Scouts/`, and *Calendar in Slide — Live Check* records the calendar's trial in the slide.

#### Concepts

- **Item:** a Page or a Space; Tasks and Events join when Agenda lands.
- **Value Seat:** the one component that turns a gesture on a value into its commit or pane, and holds the open pane's row and column.
- **`MetadataPicker`:** the **Add** list of Spaces and Properties an item can show or set, opened from a card or the Properties panel, which slides into option lists and the calendar.
- **`PropertyPicker`:** one value's own picker, an option list or a calendar.
- **Value Pane:** the option list, calendar, or typed field a value opens into.
- **`MenuSeat`:** the App-level seat that opens a value picked from a system menu's leaf.
- **Entry Builder:** the code deciding which Spaces and Properties an item lists, in what order.
- **Slide:** `FrameSlide`'s push from a list into a detail and back, under a back bar (`MenuTopRow`).
- **Shell:** `PickerMenu`, the pop-up menus and pickers mount in.
- **Two-Wave and Neutral Review:** two rounds of paired reviewers, one reading inward and one outward, each folded before the next, then a reviewer given only the before, the after, and a plain statement of intent.

---

### Decisions

[CONFIRMED] marks what Nathan stated; [INFERRED] marks what follows from the investigation, which he approved as a group unless he says otherwise.

#### A - Scope and Intent

- **A-1 [CONFIRMED]:** "Not feature-level" means nothing new: correcting what exists, visible corrections included, is in bounds.
- **A-2 [CONFIRMED]:** The scope is whatever range the investigation reveals.
- **A-3 [CONFIRMED]:** The work is code-quality-driven; no user-facing complaint motivates it.
- **A-4 [INFERRED]:** The work should run as one plan in phases, with the kit's imports and the pane shell landing first, so the pickers arrive on final imports and a shell that already flips.
- **A-5 [CONFIRMED]:** The Properties Restructure and Connections & Aliases Restructure documents in NexusOS's trash are let go.

#### B - The Two Pickers

- **B-1 [CONFIRMED]:** Where an item's metadata is added from a list, on a card or in the Properties panel, it should start from one picker, `MetadataPicker`, the list of the item's Spaces and Properties, which slides into option lists and the calendar on cards. The Table has no Add, since its columns belong to the view.
- **B-2 [CONFIRMED]:** `PropertyPicker` stays separate as one value's own picker, an option list or a calendar, which a click and a right-click leaf open directly, with the Add code out of it; both pickers draw the same pane bodies.
- **B-3 [CONFIRMED]:** `MetadataPicker` should live in `Core/Properties/Pickers/`, whose name stays. Where the value seat lives is the plan's to propose, for Nathan's approval, and `Core/Properties/Cells/` should return to drawing values if the seat leaves it.
- **B-4 [CONFIRMED]:** The picker's group reads "Spaces" in a card's slide, and the Properties panel's heading reads "Contexts"; each is intended where it is.
- **B-5 [INFERRED]:** An Add entry's outcome should be one finite state rather than the two booleans `revealOnly` and `drillable`: it shows a held value, slides, or acts as a click on that value, so a Checkbox checks, a File opens its dialog, and a typed value opens its small window.
- **B-6 [INFERRED]:** The rule for opening a value away from where it sits should be stated once in the seat, which should also hold the Add list's open state and anchor, removing `AddPickerRequest`, `addableFor`, and the hosts' writes to `seat.anchor`.
- **B-7 [INFERRED]:** A multi-row pick should be a seat open, drawn by the one `PropertyPicker`, with `MassPropertyPicker.tsx` gone.
- **B-8 [CONFIRMED]:** Multi-row table picks should open in the same spot as single-row picks.

#### C - The Add List

- **C-1 [CONFIRMED]:** Add should start from the one list on cards and in the Properties panel. On a card, an option-based entry or a date slides in under a back bar, and anything else pops its own picker, closing the list. In the panel, choosing an entry reveals its row, and its value opens there, in the row's own picker or field. The "›" should appear only on rows that slide.
- **C-2 [CONFIRMED]:** In the panel, a chosen entry's row should appear at once, with its picker or field open on it; Text, Number, and Link edit in the panel's row, and on cards keep their own small window. A File cancelled from the panel's Add leaves no row.
- **C-3 [CONFIRMED]:** The back bar should take the one layout every other bar takes, 18px tall, by removing `chooserTop`, and on a picker's surface its right-hand label should keep the row's trailing pad, sitting as far in as the chevron opposite; a settings pane's label stays flush with the controls beneath it.
- **C-4 [CONFIRMED]:** The Add window's spacing, icon size, height ceiling, and width floor should match every other menu; its width ceiling doesn't, since `maxWidth={180}` would clip the 215px calendar through `FrameSlide`'s shared slot box.
- **C-5 [CONFIRMED]:** A card's Add should leave out only what's already on the card; a property hidden in the view stays listed, and picking one that holds a value shows it.
- **C-6 [CONFIRMED]:** A card's Add should stop listing Created and Modified, which can't be set; the Visibility settings stay how they're shown.
- **C-7 [CONFIRMED]:** An item's Context groups and properties should list in the order its own panel uses on every surface: for a page, the Nexus's Context order and its Collection's property order; for a Space, its own row order. One exception sits on a card's Add: rows that only show a value already held stay after the rows that can be filled, since picking one shows it rather than sets it.
- **C-8 [INFERRED]:** What an item can show, add, or set should be decided once, by one entry builder each surface filters, replacing `addEntriesFor`, the panel's `hidden()`, and the order in `propertyMenuBranches`, and giving the in-app lists one row shape.
- **C-9 [CONFIRMED]:** A file naming a property with nothing readable, such as an unticked `Done: false`, keeps the panel's empty row, and a card's Add offers to fill it.

#### D - Right-Click Menus

- **D-1 [CONFIRMED]:** Right-click menus should stay system menus.
- **D-2 [CONFIRMED]:** A value set from a right-click menu should leave the saved view alone, so it doesn't un-hide its property. What a system menu can't show, such as Text, Number, Link, and Date, opens in its own picker.
- **D-3 [INFERRED]:** `MenuSeat` should stay the one route from a system menu's leaf on every surface, resolving columns as every other seat host does, and every surface's hover ghost should stand down while a leaf is open.
- **D-4 [CONFIRMED]:** A page's right-click menu should be one menu with one action runner on the sidebar, cards, the Table, and the Matrix, keeping only the differences that carry a reason (a card's single New Page, no New Page on the Matrix, a card's Edit Image), so cards gain Preview and Reveal Location and the Table gains Reveal Location. The rows already come from `pageMetaMenuItems`, while Rename, Edit Icon, and New Page run through separate code in `runTitleAction` and `runEntityAction`.
- **D-5 [CONFIRMED]:** The smaller page menus stay separate: a tab's (`tabMenu`), a nav row's (`navRowMenu`), a link's (`connectionMenu`), and the ⋮ in a page's settings dropdown (`popPageActions`).
- **D-6 [CONFIRMED]:** Plain action menus, such as a tile's menu shown by the in-app menu stand-in (`MenuPresenter`), stay outside the pickers; `MenuPresenter` is in scope only where it shares their mechanics.
- **D-7 [CONFIRMED]:** An option property with no options stays a greyed-out row on right-click.

#### E - The Kit

- **E-1 [CONFIRMED]:** A pane that grows on a slide should flip above its trigger when the other side has more room, deciding at the slide's head and travelling with it, and every pane should stay inside the window, overlapping its trigger only where neither side holds it. This fix is a priority.
- **E-2 [CONFIRMED]:** The two-way imports between `UIX/Pickers` and `UIX/Menus` should be untangled, leaving that pair's imports running one way, from Pickers to Menus: `ManageRow.tsx` and `manage-row.css.ts` move to `UIX/Pickers/`, and `PickerControl.tsx` with `picker-control.css.ts` and their tests moves to `UIX/Menus/`. `PickerMenu` stays in `UIX/Pickers/` under its own name, and the dashboard's imports follow in a paired commit to The Studio's repo. A third path, `MenuIndex` through `ColorSwatch` to `ColorPicker`, should be cut at `ColorSwatch`, which reports its press to the one color request, so `Trailing`'s `color` keeps its kind.
- **E-3 [CONFIRMED]:** For I-027, a click on a second dropdown while a list is open should only close that list. This covers dropdown lists inside panes; a pane under `focus="keep"` still lets an outside press land, as it documents. The clock list should drop the release in place of a shield, as its one reasoned exception, since a shield takes a double-click's second press.
- **E-4 [CONFIRMED]:** I-042 is in scope; I-051 stays its own issue, with its citations re-anchored only where this work moves them.
- **E-5 [CONFIRMED]:** The calendar's month, year, hour, and minute lists stay as their own nested panes rather than joining the standard dropdown.
- **E-6 [INFERRED]:** These smaller folds join this work: the `'dateTime'` intent merging into `'picker'` with `centerX` passed only for option panes, the panel's two commit functions, `pageMenuItems` taking the Spaces and Properties branches once, the Space chip's choice stated once, `PickOption.value` renaming to `id` on the picker's side, and the `PickerMenu` development warning keyed on `onDismiss`, since a pane nothing dismisses leaves with its host.

#### F - Adjacent Fixes

- **F-1 [CONFIRMED]:** These adjacent fixes join this work: the Visibility pane's height depending on its route, a view's icon picker anchoring to the dropdown rather than its row, the hand-built `ViewItemMenu` moving onto `popMenu`, the settings frames' four ways of taking their back bar's label and handler, and `IconPicker`'s `onClose` beside the other picker shells' `onDismiss`.
- **F-2 [CONFIRMED]:** The repeated icon and color editor setups should consolidate here.
- **F-3 [INFERRED]:** These settings fixes join them: the two pane-floor constants (`PANE_MIN_*` and `PANE_SQUARE`), `LayoutFrame`'s flat mode mounting a slide that can't open, and renaming `FilterFrame`'s local `FieldPicker`, which shares the kit's name.
- **F-4 [CONFIRMED]:** The settings panes' titles differing from the rows that open them (Group and Grouping, Sort and Sorting, Filter and Filtering) are an earlier decision and stay as they are.
- **F-5 [CONFIRMED]:** The view editor's header should show the view's icon and open the icon picker, replacing its disabled square.
- **F-6 [CONFIRMED]:** Views otherwise behave as they do today: the view editor's ⋮ looks the same in rows, order, separator, width, and in-app draw, taking the shared menu's glyph size and origin, and deleting a view from its editor still closes the dropdown.
- **F-7 [CONFIRMED]:** A settings pane's height should stop depending on which pane it is: the Properties list and Preview Rules panes rise to the 440px ceiling, and the view list's floor rises to 245px.

#### G - Tests and Documentation

- **G-1 [INFERRED]:** Two unpinned behaviors should gain tests before the restructure: picking an entry from the panel's Add, and a second date showing its own date on a click, with its slide half landing in the commit that makes a date slide. The chooser tests that drive props directly leave with the mode; of `cellGestures.test.tsx`'s direct `PropertyPicker` mounts, the seed-status mount is deleted as a duplicate and only `cellGestures.test.tsx:595-628` moves beside its module, as do `cardColumns.test.ts`'s `parseEditorValue` cases.
- **G-2 [INFERRED]:** The documentation should be corrected to match what lands, with *Metadata Picker — Implementation Plan · §Reconciliation* as the list, and I-027 and I-042 are deleted, with `index-issues.py` run last.

---

#### Constraints

- **Placement:** every placement of a new or moved file comes to Nathan for approval before it's written into the codebase.
- **Removal First:** any planning leads with what can be removed, consolidated, or replaced; this is cross-feature work with room to leave less in other areas, and nothing is added unless its absence would leave a real gap.
- **Sync:** nothing here makes decisions for, or materially impacts, future cross-device sync work.
- **Not Feature-Level:** nothing here is feature-level in the broadest sense.
- **Briefs:** Nathan's *Approach* and *Principles* (below, verbatim) govern every phase and task, and every agent brief on this topic — scouts, executors, and reviewers — carries both sections in full.
- **Picker Cleanup:** any other picker-related cleanup found joins this line of work rather than being left.
- **Process:** the brainstorm ran on the draft Studio-Brainstorm-V2 and planning runs on the draft Plan-Creation (`~/NexusOS/Studio/Athena/II. Drafts/`), the installed `studio-brainstorm` and `writing-plans` skills filling their gaps, with *MetadataV3*, *Disclosable Bundles*, and *Trash & Archive Restructure* (`.claude/Planning/Completed/`) as the process references.
- **Plan Reviews:** the plan runs three review waves before ratification, each folded before the next: Wave One reads outward against the codebase as a whole, Wave Two reads inward at the plan itself, and Wave Three reads both. Every reviewer carries the *Approach* and *Principles*.
- **Implementation Reviews:** two waves run over the implementation, with a third only where it would help as a final look rather than churn for its own sake; the neutral reviewer then answers *§The Measure*.
- **Models:** every planning and wave-review agent runs at `opus-xhigh`, except the plan's Wave Three, which runs at `fable-high`.
- **Comments:** no task adds more comments than it removes, so the codebase's comment count doesn't grow.
- **Documentation:** changes stay light and largely replacive rather than additive, under `r/studio-documentation`; a feature doc that seems to need drastic rewording likely carried too much specificity to begin with.
- **Execution:** the plan runs overnight, with no step waiting on Nathan.
- **Testing:** every possible outcome and interaction is tested through the existing testing scripts in `.claude/scripts/`, such as the Option Picker and Properties Drives, which are extended where a case is missing.
- **Screenshots:** taken during execution and shown in the session, so Nathan can follow over Remote Control.
- **The Stop:** planning stops at the finished, reviewed plan, with a summary and anything needed before ratification waiting for Nathan; no code changes until he ratifies it.
- **Cold Machine:** when the plan is done, the computer is ice-cold: no Pommora instance, process, worktree, scratch Nexus, scratch userData, test fixture, or temporary script the run created remains, and the final report proves it with commands. An instance Nathan launched himself isn't the run's, and it's left alone.
- **The Measure:** the end result is concretely less — less duplication, cleaner distribution, fewer files where possible, more navigable systems — and a neutral before-and-after assessment given no context and nothing to look for prefers the after state every time.

**Planning (Nathan, verbatim):**

1. **Look Outward First:** before designing any piece, name every function, field, file, or rule it would add, and scout what already exists for each.
2. **Verify Nathan's Claims:** check every architectural claim he makes against the tree and report what contradicts it, plainly; he wants it. Many previous plans had corrections that were  flagged against what went unnoticed during the brainstorming process, and each correction changed the design.
3. **Ask, With a Read Attached:** where an answer reads more than one way, stop and ask, with what was found, what it implies, and the call put up for correction; Nathan isn't technical, so each question is explained in plain terms.
4. **Disclose In-Flight Calls:** a judgment made during planning or execution is stated in chat when it's made, and recorded where it changes an outcome.
5. **Write With Intent:** decisions and plans state intended behavior as intent ("should"), separate from statements of how the code works today, so a future reader never takes a decision for a fact or a fact for a decision.

**Approach (Nathan, verbatim):**

- Any approaches being considered here must first assess what’s true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We’re not going to design based on what’s currently there and simply adjust course, we’re ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what’s ultimately going to be replaced.
- We’re approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
- We shouldn’t adding anything new unless there’s evidence that it’s required. We’d approach this through the perspective of ending up with cumulatively “less stuff” in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and less headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our <principles>.
- Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebases' resulting shape — not just maintaining remnants or adherence to what’s true *now* that’s ultimately going to change. The approach should reflect the outcome and shouldn’t be bound to constraints that were only relevant before.
- Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we’re not starting from scratch.
- The complex data-level mechanics of the codebase are what least reflect *Nathan’s* intentions and are primarily reflective of what’s determined appropriate via past session agents. Treat it with care and respect, but don’t assume it’s beyond changing within reason, where simply presenting the approach to Nathan may be all that’s required to genuinely change the codebase for the betterment of everything within it and future iterations.

**Principles (Nathan, verbatim):**

- **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on. 
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
- **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
- **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
- Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements. 
- Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
- Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.

#### Rejected

- **The Chooser as the Seat's Root Level:** one window for the list and every value, *Scout Findings*' Option 1; a non-option entry needs its own picker, and `PropertyPicker` stays separate.
- **The Chooser as a Mode of `PropertyPicker`:** *Scout Findings*' Option 2; it keeps the second route and the prop-switched mode.
- **The Chooser as a Trigger-Anchored Menu:** option lists would lose their chips, New Option, and reordering.
- **A Right-Click Pick Un-Hiding Its Property:** un-hiding edits the saved view for every card in it, permanently.
- **Views Taking Right-Click Picks Through Their Own Seat:** with no un-hide and no option pane on that route, nothing would earn a second route.
- **Renaming `Core/Properties/Pickers/`:** the folder keeps its name.
- **Moving or Renaming `PickerMenu`:** the folder proposal and the rename to `MenuPane`; its name and home are assessed as a whole under I-075.
- **A Slide Rising Over Its Trigger:** the calendar would end sitting on its own card.

#### Prospects

- **`PickerMenu`'s Name and Home:** assessed as a whole under I-075.
- **Right-Click on Mobile:** a right-click menu opens only through the Electron host, so the mobile companion has no path to it; `MenuPresenter` could draw it there, and one page menu makes that a single change.

---

#### Sources

- `.claude/Planning/Metadata Picker/Metadata Picker — Scout Findings.md` — the reconciled account at `69db9942e`; `Scouts/` holds the five reports.
- `.claude/Planning/Metadata Picker/Metadata Picker — Fresh-Eyes Read.md` — a zero-context reader's questions on this document.
- `.claude/Planning/Metadata Picker/Calendar in Slide — Live Check.md` — the calendar's trial in the slide, with its one placement fix and what went untested.
- `Core/Properties/Cells/ValueSeat.tsx`, `Core/Properties/Pickers/PropertyPicker.tsx`, `Core/Properties/Pickers/MassPropertyPicker.tsx`, `Core/Properties/Pickers/valueClick.ts` — the seat, the picker, and its intents.
- `Core/Views/Cards/CardsView.tsx`, `Core/Views/Cards/cardColumns.ts`, `Core/Properties/PropertyPanel.tsx`, `Core/Interface/Menus/propertyMenuActions.ts`, `Core/Actions/propertyRows.ts` — the hosts and the three entry builders.
- `Core/Actions/menuActions.ts:12`, `Core/Interface/Menus/MenuPresenter.tsx`, `Core/Session/chromeSlice.ts` — menu routing and the request slots.
- `UIX/Pickers/PickerMenu.tsx`, `UIX/Menus/FrameSlide.tsx`, `UIX/Menus/MenuRows.tsx` — the kit.
- `.claude/Features/PropertiesPM.md:115-119`, `.claude/Features/ViewTypesPM.md:122`, `.claude/IssuesPM.md` (I-027, I-042, I-051).
- `.claude/Planning/Completed/MetadataV3/`, `.claude/Planning/Completed/Disclosable Bundles/`, `.claude/Planning/Completed/Trash & Archive Restructure/` — the process and constraints this work inherits.
- `~/The Studio/.claude/references/studio-documentation.md` — the documentation standard.
- `~/NexusOS/Studio/Athena/II. Drafts/Studio-Brainstorm-V2.md`, `Plan-Creation.md`.
