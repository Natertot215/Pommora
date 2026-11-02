### Scout E — History, Documentation, and Tests

**Baseline:** `69db9942e` on `active`. Read-only. Line numbers are at HEAD.

---

#### 1. Map

##### Timeline

| Date | Commit(s) | What Landed | Session / Source |
|---|---|---|---|
| 09-06 | `4d0a63975`, `99d79e8e7`, `dab7c28ae` | `PropertyPicker` takes a `PickTarget` union plus an optional chooser pane; `CardPickerHost` + `CardAddPicker` deleted; `PropertyPanel` replaces `Core/Properties/Page/` | `09-06-2026-PropertyPicker-+-Panel.md` |
| 09-06 | (same session, Gate-1 fix) | `PickEntry.drillable` + `resolveTarget` added as the "minimal fix" for the drill snapping back: `revealProperty` is optimistic, so a drilled entry leaves the chooser array on its first commit and the drilled pane must resolve its target live (session :538–:664) | same |
| 09-08 | `3e6db1b34` → `889886d1b`, `69e6813fc`, `80be12d4c` (11 commits in one day) | One door (`popMenu`), one channel, one in-app presenter (`MenuPresenter`); `stay` rows; `compact` for `PickerControl` | `09-08-2026-Pommora-Menus.md`, `…-Menus-4-01PM.md` |
| 09-11 | `d6829a48c`, `832970031` | Page menu gains **Properties ▸**; a leaf routes to `requestPick` → `ValuePickPresenter` | `09-11-2026-Menu-and-Properties-right-click-integration.md` — Nathan: *"'Properties >' becomes the shared vocab and source"* (:38) |
| 09-21 | `8d074b583`, `f7c07d3a6`, `881519f22`, `dbe802f2a`, `2cb3ebdea` | Card chooser opens on Spaces and Properties; page and Space menus gain **Spaces ▸**; the card menu **drops Add Property "which Properties covers"** | `09-21-2026-9-20-Space-Links-Brainstorming.md` |
| 10-05/06 | `fe5caf84b`, `033a3d86d`, `84c92007f` | Picker creates/reorders options; Status groups apart; picked rows ring | `10-05-…Picker-Option-Creation.md`, `10-06-…PickerMenu-selection-rings-unification.md` |
| 10-08 | `9c9dc588a` | Panel's held Add row is the open chooser's presence | — |
| 10-25 | `358f64d70` (P15), `dfb8d0147` + `bc40e3ebf` (P16A), `07fbbbc9c`, `eac747475` + `774b47bda` (P16B), `3d876a810`, `7536e67e9`, `a6fecbcbc` | `pickModel`; the value seat; Cards onto the seat; **`MenuSeat` replaces `ValuePickPresenter`**; card chooser "acts as a click" (I-6); panel onto the seat; dead File pane removed | `10-21-2026-Properties-Restructure.md` (10-21 → 10-25, ≥$2.7k); plan + results now only in `~/NexusOS/.trash/Properties Restructure — *.md` |
| 10-28 | `186726aed`, `14fc9d5e6`, `7c001b3b2` | `PickerMenu` re-decides its side once children's effects run; one pane-size helper; keep-focus press claim | — |

**Churn since 09-01:** `PickerMenu.tsx` 51 commits (11 fixes), `PropertyPicker.tsx` 58 (6 fixes), `MenuPresenter.tsx` 19 (5 fixes, all 09-08), `FrameSlide.tsx` 15 (4 fixes). `ValueSeat.tsx` is 5 commits, all on 10-25.

##### Docs Checked

| Doc | Lines | Family Coverage |
|---|---|---|
| `.claude/Features/PropertiesPM.md` | 146 | *The Value Picker* (:115), *The Properties Panel* (:117), *The Properties Menu* (:119) |
| `.claude/Resources/PommoraUIX.md` | 412 | Menus table (:357–:374), Pickers table (:378–:380) |
| `.claude/Features/InteractionPM.md` | 111 | FrameSlide (:48), "one primitive per pattern" (:103) |
| `.claude/Features/InterfacePM.md` | 102 | No claims about the family |
| `.claude/Features/DesktopPM.md` | — | The one door (:26) |
| `.claude/Features/ConfigurationPM.md` | — | Use Native Menus (:32) |
| `.claude/PommoraPRD.md` | 206 | No picker or menu claims in the family |

##### Test Suites

| Suite | Lines | Subject |
|---|---|---|
| `Core/Properties/Pickers/PropertyPicker.pane.test.tsx` | 375 | Panes, chooser, option editing |
| `Core/Properties/Pickers/PropertyValueInput.test.tsx` | 407 | Number/Link/Text fields, popover routes |
| `Core/Properties/Pickers/ValueEditor.test.tsx` | 355 | One-line editor |
| `Core/Properties/Pickers/TextPane.test.tsx` | 304 | TextPane |
| `Core/Properties/Pickers/filePick.test.ts` | 178 | File pick |
| `Core/Properties/Pickers/pickModel.test.ts` | 85 | Pick model |
| `Core/Properties/Pickers/valueClick.test.ts` | 72 | Intents |
| `Core/Properties/Cells/ValueSeat.test.tsx` | 350 | Seat click/menu/panes, `MenuSeat` |
| `Core/Properties/PropertyPanel.test.tsx` | 541 | Panel |
| `Core/Views/Cards/cardGestures.test.tsx` | 321 | Card values, Add chooser (:236–:320) |
| `Core/Views/Cards/cardColumns.test.ts` | 139 | Add entries, plus `parseEditorValue` |
| `Core/Views/Table/cellGestures.test.tsx` | 839 | Table cells, plus two direct `PropertyPicker` mounts |
| `Core/Interface/Menus/MenuPresenter.test.tsx` | 236 | Presenter |
| `Core/Interface/Menus/propertyMenuActions.test.ts` | 289 | Native Properties menu |
| `Core/Interface/Menus/menuRows.test.ts` | 35 | Row projection |
| `Core/Actions/propertyRows.test.ts` | 82 | Branch rows |
| `Core/Actions/menuActions.test.ts` | 83 | The door |
| `UIX/Pickers/PickerMenu.test.tsx` | 611 | Shell |
| `UIX/Menus/FrameSlide.test.tsx` | 100 | Slide |

---

#### 2. Findings

##### E-1 • Three Builders of "This Item's Metadata Entries"
**Category:** Parallel Definition
**Evidence:**
- Card chooser: `addEntriesFor` + `orderAddableEntries` (`Core/Views/Cards/cardColumns.ts:31–69`), unshown columns, fill-able first, reveal-only last.
- Native menu: `propertyMenuBranches` (`Core/Interface/Menus/propertyMenuActions.ts:27–62`), every Context and every schema property, option-bearing first, leaves last (`:60`).
- Panel chooser: `hidden()` (`Core/Properties/PropertyPanel.tsx:183–186`), unshown fields per group.
- Each one restates "Spaces then Properties" and an ordering rule. History treats them as one job. On 09-11 Nathan ruled *"'Properties >' becomes the shared vocab and source"* (`09-11-…right-click-integration.md:38`), and `2cb3ebdea` (09-21) removed the card menu's Add Property row *"which Properties covers"*.
**Change:** One entries builder over a row and its resolved columns, with a `shown` filter and one order rule. It would feed the native branch rows (`propertyBranchRows`), the card chooser, and the panel chooser.
**Effect:** −1 or 2 concepts (`AddEntry`, `orderAddableEntries`, the panel's `hidden` mapping); roughly −30 to −50 lines.
**Confidence:** Verified (the three builders); Likely (that one filter covers all three).

##### E-2 • `PickEntry` Encodes a Three-State Choice as Two Booleans
**Category:** Inconsistency (with the hard rule "finite states are unions + switch")
**Evidence:**
- `PickEntry { revealOnly: boolean; drillable: boolean }` (`PropertyPicker.tsx:56–63`), dispatched by `if (e.drillable) … onReveal; if (e.revealOnly) onDismiss()` (`:131–135`).
- The real states are reveal, drill, and run-away. `revealOnly && drillable` means nothing.
- `drillable` is derived at the call site, `!e.revealOnly && pickKindOf(...) !== null` (`CardsView.tsx:486`). The panel hard-codes `revealOnly: true, drillable: false` (`PropertyPanel.tsx:186`) but its `onReveal` (`revealAndEdit`, `:260–269`) also opens the editor, so the panel's "reveal only" isn't only a reveal.
- A test names the third state "dependent" (`PropertyPicker.pane.test.tsx:171`), a word that appears nowhere in the code.
**Change:** One `action: 'reveal' | 'drill' | 'open'` union, or derive it from the column inside the picker.
**Effect:** −1 field and −1 derived expression at each of two sites; the test vocabulary aligns.
**Confidence:** Verified.

##### E-3 • "Open a Value Away From Its Seat" Is Written Twice, by Plan
**Category:** Duplication
**Evidence:**
- `seat.run(row, column, intent?.kind === 'edit' ? { kind: 'popover' } : intent, anchor)` appears in `MenuSeat` (`ValueSeat.tsx:342–347`) and in the card chooser's `onReveal` (`CardsView.tsx:492–499`).
- The plan prescribed the copy verbatim. Task 16B-1 says the chooser *"runs the added value's intent through the seat as the menu seat does (`seat.run(… intent?.kind === 'edit' ? { kind: 'popover' } : intent …)`)"* (`~/NexusOS/.trash/Properties Restructure — Implementation Plan.md`, Task 16B-1).
- `MenuSeat` also has a File-only `dismiss()` (`:350`) that the chooser lacks. The difference is structural, not a bug: the card path calls `setAddPicker(null)` before `seat.run`, so it has nothing left to dismiss.
**Change:** One seat method, such as `openAway(row, column, anchor)`, that both call. `MenuSeat`'s effect then shrinks to a request-to-call adapter.
**Effect:** −1 copy (about 8 lines), −1 divergence (the File `dismiss`).
**Confidence:** Verified.

##### E-4 • The Chooser Is a Mode Bolted Onto the Value Picker
**Category:** Unjustified Separation / Patch-On Residue
**Evidence:**
- `PropertyPicker` carries `chooser`, `resolveTarget`, `onReveal`, `picked` state, a reset effect, `commit(v, entry?)`, an `origin` override (`chooser ? 'auto' : origin`), and a full FrameSlide branch. The component spans `PropertyPicker.tsx:65–187` (123 lines), and roughly 55–60 of those exist only for chooser mode (`:87–93`, `:126–141`, `:149`, `:152–184`), plus `PickEntry` (`:56–63`).
- `ValueSeat` re-threads all of it through `SeatChooser` (`ValueSeat.tsx:251–305`). For example, `onCommit` resolves `entry ? host.columnOf(entry.id) : pickColumn` and `entry ? chooser?.row : pickRow`.
- History shows the layering:
  - 09-06: the chooser was added as an "optional chooser pane" (`4d0a63975`).
  - The same session patched drill snap-back with `drillable` and `resolveTarget`.
  - 10-25: 16B-1 swapped `resolveTarget`/`onCommit` callbacks for `row`, and the seat resolves the column (`Implementation Plan.md`, Task 16B-1, "Closeout P15–P16A").
**Change:** Make the chooser a level of the same drill shell that hosts the value pane, so it's a parent level rather than a prop-switched mode. Both levels are owned by one component (see *Approaches*).
**Effect:** About −60 to −90 lines across `PropertyPicker` and `ValueSeat`; −`SeatChooser`, −`resolveTarget`, −the dual `onCommit` signature.
**Confidence:** Likely.

##### E-5 • The Chooser's Back Bar Is the Codebase's Only Restyled `MenuTopRow`
**Category:** Inconsistency / Patch-On Residue
**Evidence:**
- There are 14 `MenuTopRow` sites: `PropertyFrame` ×3, `LayoutFrame` ×3, `GroupFrame`, `FilterFrame`, `SortFrame`, `VisibilityFrame`, `AutocompletePane`, `MenuPresenter`, and the chooser. The multi-line ones (`PropertyFrame.tsx:317`, `LayoutFrame.tsx:239`) were read in full. Only the chooser passes a `className`: `chooserTop` = `topRow` with `--row-pad-y: 0` (`Core/Properties/Pickers/property-picker.css.ts:4`).
- Only the chooser seats the bar outside a `MenuScrollFrame` header. Every other frame, including `MenuPresenter.tsx:63–65`, uses `header=`.
- Origin: a port of the old `CardAddPicker`'s inline override (`09-06-…PropertyPicker-+-Panel.md:179`, *"I'll create `property-picker.css.ts` with `chooserTop` composing `topRow`"*).
- Its icons are `size="body"` (`PropertyPicker.tsx:129`), while `MenuPresenter` uses `size="control"` (`MenuPresenter.tsx:13–15`).
**Change:** Draw the bar through `MenuScrollFrame`'s `header`, as everywhere else. `chooserTop` then goes, and `property-picker.css.ts` keeps only `emptyPane`, or loses it to the option rows' own home.
**Effect:** −1 style, possibly −1 file; one visible correction (bar padding and icon size).
**Confidence:** Verified (the divergence); Likely (that the header slot reproduces the intended look).

##### E-6 • Card and Panel Choosers Answer the Same Gesture Differently
**Category:** Inconsistency
**Evidence:**
- Card: options drill in place under "‹ Properties · Stage". Every other type closes the chooser and opens its own pane or acts (`CardsView.tsx:476–503`). A Date leaves the chooser even though `seat.target` builds a `dateTime` target that `resolveTarget` would draw in the drill (`ValueSeat.tsx:225–231, 285–291`). This was intended on 09-06 (*"adding a Date/Number/Link/File leaves the chooser and opens its own popup"*, session :634) and pinned in `cardGestures.test.tsx:275`.
- Panel: never drills. Every entry reveals its row, then opens through `requestAnimationFrame`, timed to land after the chooser's own dismiss has closed the seat (`PropertyPanel.tsx:260–269`; `ValueSeat.tsx:302–305` calls `seat.close()` first).
- The doc says the picker *"can open on a chooser pane that adds a property and drills straight into its value"* (`PropertiesPM.md:115`), which is true only for the card's option types.
**Change:** Nathan has to decide one add behavior. With a single picker, Date is the natural case to drill as well, since it's already a picker pane.
**Effect:** −1 behavior fork, −the rAF ordering dependency.
**Confidence:** Verified (the divergence); the target behavior is a call for Nathan.

##### E-7 • `MassPropertyPicker` Is a Second Shell Around the Same Option Pane
**Category:** Parallel Definition
**Evidence:**
- `MassPropertyPicker.tsx` (35 lines) is `PickerMenu` + `pickOver(currents)` + `PropertyOptionRows editable`.
- `PropertyPicker`'s options branch is `PickerMenu` + `pickOver([current])` + `PropertyOptionRows editable` (`PropertyPicker.tsx:97–115`).
- `358f64d70` already made the model "one pure model … for one row and many" but kept two components.
- `MassPropertyPicker` borrows `PickTarget` through `Extract<…'options'>` (`:15`).
**Change:** One picker taking `currents[]`.
**Effect:** −1 file, about −30 lines.
**Confidence:** Likely.

##### E-8 • `MenuPresenter` Shows No Entity Management Today
**Category:** Misplaced Ownership (only if folded); the boundary evidence
**Evidence:**
- `popMenu` draws in-app only when it's given a trigger and Use Native Menus is off (`Core/Actions/menuActions.ts:12`).
- Every trigger-bearing caller is a generic action list. All 33 non-test `popMenu(` sites were checked, the 8 multi-line ones read in full, including `useOptionEdit.tsx:90`, the option row's menu inside the picker, which passes no trigger and so is always native. The trigger-bearing callers are: `TileHost.tsx:243` (tile handle, `stay`), `TileHost.tsx:301` (board Insert, `at`), and `PickerControl` through `setMenuDoor(popMenu)` (`Core/Interface/mount.tsx:19`; `UIX/Pickers/PickerControl.tsx:118`, passing `solid` and `compact`).
- Every **Spaces ▸ / Properties ▸** branch is a right-click, which is always native. The presenter never draws metadata.
- Its design contract is parity with the native menu: *"one test proves both renderers project the same rows"* (`3e6db1b34`), and `Desktop/Actions/menu.test.ts:4,136` imports `menuRows` for that check.
- `MenuOptions.solid` and `.compact` are live through `PickerControl`. Neither is dead.
**Change:** Keep it out of the picker. It shares only mechanics: a FrameSlide level with a `MenuTopRow` back bar (`MenuPresenter.tsx:17–83`). The chooser re-implements that level (`PropertyPicker.tsx:153–181`) with different floors (`minWidth 120 / minHeight 0`, versus `120–180`), bar placement, and icon size.
**Effect:** If both draw one shared drill level from `UIX/Menus`, −1 hand-rolled level (about 30 lines) and one look.
**Confidence:** Verified.

##### E-9 • `UIX` Declares the Door's Shape a Second Time
**Category:** Parallel Definition (justified by the boundary)
**Evidence:** `MenuDoor` in `UIX/Pickers/PickerControl.tsx:23–27` restates the row shape (`label/action/checked/icon/disabled`) and `{ solid?, compact? }` beside `ActionItem` and `MenuOptions` (`Core/Actions/menuModel.ts:101–107`). The hard rule "UIX reaches nothing outside itself" forces the copy.
**Change:** None needed inside this cleanup. It's noted so the picker doesn't add a third copy.
**Confidence:** Verified.

##### E-10 • A Fix Pinned Three Times for One Behavior
**Category:** Test Burden / Patch-On Residue
**Evidence:**
- Task 13-2 (P13) made pickers read a column snapshotted at open, and an option created mid-pick stopped joining the list. It was fixed per surface: `07fbbbc9c` (cards), the seat's per-render `columnOf` (P16A amendment), and `3d876a810` (menu seat).
- Three pins exist: `ValueSeat.test.tsx:125`, `ValueSeat.test.tsx:302`, and `cardGestures.test.tsx:155`.
- `MenuSeat`'s `columnOf` re-implements the registry lookup with its own comment (`ValueSeat.tsx:322–327`) instead of a shared resolver such as `resolveColumn(id, …)`, which the panel uses (`PropertyPanel.tsx:81`).
**Change:** With one seat, keep one pin at the seat and one integration pin. `MenuSeat`'s request should carry a resolver rather than a column, so the special branch goes.
**Effect:** −1 or 2 test cases; −1 branch.
**Confidence:** Verified.

##### E-11 • `PropertyPicker` Unit Tests Living in the Table Suite
**Category:** Test Burden
**Evidence:**
- `cellGestures.test.tsx:564–628` holds `describe('PropertyPicker (direct mount) — seed values')` and `'— multi-select'`, plus the `PropertyPicker` import at `:10`.
- The seed-Status listing overlaps `PropertyPicker.pane.test.tsx:322`. The multi-select toggle semantics overlap `pickModel.test.ts:50–68`.
**Change:** Move the one non-overlapping assertion (a multi-select stays open) into the picker suite and delete the rest.
**Effect:** About −60 test lines.
**Confidence:** Verified.

##### E-12 • Chooser Tests That Pin Prop Plumbing
**Category:** Test Burden
**Evidence:**
- `PropertyPicker.pane.test.tsx:151–248` drives `chooser` / `resolveTarget` / `onReveal` / `revealOnly` / `drillable` directly, through about 100 lines including a hand-rolled mid-test remount (`:183–187`) and two `setTimeout(30)` waits.
- `:151` is subsumed by the first half of `:171`.
- Behavior-level pins already exist at the surface (`cardGestures.test.tsx:268–320`).
**Change:** The chooser cases die with E-2 and E-4. Behavior should be pinned once at the new component's level ("an option entry slides under ‹ Group · Name"; "a non-drill entry opens away"), with the card suite keeping the integration pins.
**Effect:** About −100 lines rewritten as about 40.
**Confidence:** Verified.

##### E-13 • The Panel's Chooser Pick Is Untested
**Category:** Test Burden (a gap a consolidation will trip on)
**Evidence:** The panel's `'the Add row'` cases (`PropertyPanel.test.tsx:446–495`) pin only the Add row's held wash. No case clicks a chooser entry and asserts reveal-then-edit (`revealAndEdit`, `PropertyPanel.tsx:260–269`), the rAF ordering, or the reveal that a blank commit relies on.
**Change:** Before the restructure, add one behavior pin: picking an entry shows the row and opens its value.
**Effect:** +1 case, and it is required.
**Confidence:** Verified.

##### E-14 • Hand-Rolled Picker-Portal Queries and the Act Seat
**Category:** Test Burden
**Evidence:**
- Portal helpers are written per suite: `portal`/`portalText` (`PropertyPicker.pane.test.tsx:100–105`), `portalText` (`ValueSeat.test.tsx:97`), `portal` (`PropertyValueInput.test.tsx:76`), `portalButtons` (`cardGestures.test.tsx:83`), `pickerButtons` (`cellGestures.test.tsx:202`), and `rowButton` (`PropertyPicker.pane.test.tsx:66`).
- `Core/Testing/` has no picker query helper.
- `mountEachTest` (`Core/Testing/viewHarness.tsx:13`) is generic but filed as a view harness. Within the family, `PropertyPicker.pane`, `PropertyPanel`, `MenuPresenter`, `PickerMenu`, and `FrameSlide` re-roll `IS_REACT_ACT_ENVIRONMENT` + `createRoot`, as 96 test files do repo-wide against 19 users of `mountEachTest`.
**Change:** One `pickerPane()` query set in `Core/Testing/`. Moving the act seat out of `viewHarness` is wider than this cleanup and is for Nathan to decide.
**Effect:** About −40 lines in the family.
**Confidence:** Verified.

##### E-15 • `parseEditorValue` Tests Filed Under `cardColumns.test.ts`
**Category:** Test Burden / Misplaced Ownership
**Evidence:** `cardColumns.test.ts:13,18–60` tests `Core/Properties/parseEditorValue.ts`, residue from when `cardValueInput.ts` held it (`Implementation Plan.md`, the `cardValueInput.ts` row).
**Change:** Move the tests beside their module.
**Effect:** 0 net; it's findability.
**Confidence:** Verified.

##### E-16 • Doc Says `PropertyPicker` Is "The One Control"; the Value Seat Is Undocumented
**Category:** Doc–Code Mismatch
**Evidence:** `PropertiesPM.md:115` names `PropertyPicker.tsx` as the one control that renders *"the operating system's file dialog for File"* and the number, link, and text fields. In the code:
- `PropertyPicker` draws options and Date only.
- File runs through `filePick` from the seat (`ValueSeat.tsx:122–127`), and `7536e67e9` removed the File pane.
- Fields come from `PropertyValueInput`.
- The dispatcher (`useValueSeat`, `ValueSeat`, `MenuSeat`) appears in no Features doc (grep of `Features/*.md` for "seat" finds none in this sense).

The surface list *"the page window's SidePane, the Properties panel, and the Cards and Table views"* double-counts the SidePane, which *is* the panel (`PropertiesPM.md:117`). It also omits the menu seat (sidebar, Matrix, bands, title menus) and the Table's mass assign.
**Change:** Rewrite *§The Value Picker* around the one seat once the restructure lands.
**Confidence:** Verified.

##### E-17 • Smaller Doc Drift
**Category:** Doc–Code Mismatch
**Evidence:**
- `PropertiesPM.md:119` (*§The Properties Menu*) omits that option-bearing properties list before leaves (`propertyMenuActions.ts:60`).
- `PommoraUIX.md` *Scroll frame* names `MENU_MAX_HEIGHT`, while every picker in the family caps at `PICKER_MAX_HEIGHT` (`UIX/Pickers/picker-base.css.ts:8`, used in `PropertyPicker.tsx:218,282` and `MenuPresenter.tsx:62`), and that knob isn't listed.
- `PommoraUIX.md:380` says `PickerMenu` is *"the rectangle every menu, dropdown panel, and picker mounts"*, but `MenuDropdown` is a separate shell with 6 Core users (`UIX/Menus/MenuDropdown.tsx`).
- `InteractionPM.md:48`, *"Both slots stay mounted"*: the slot boxes do, but the detail content drops once its exit ends (`FrameSlide.tsx:41–43`; `FrameSlide.test.tsx:30`).
- `IssuesPM.md` footnotes `[^27]` (`MenuPresenter.tsx:84-103`, now `:85–118`) and `[^42]` (`PickerMenu.tsx:184-277`; since 10-28 the placement is a second `measure` at `:201–260` beside the size `measure` at `:175`) are stale.
**Confidence:** Verified.

##### E-18 • `addableFor` Computed Twice per Card
**Category:** Duplication (minor)
**Evidence:** `CardsView.tsx:282` exposes `addableFor`, and the only reader is a `.length > 0` gate at `:914`. `:223–225` recomputes the same entries for the open row.
**Change:** One entries read per open, or a boolean predicate.
**Confidence:** Verified.

---

#### 3. Approaches

##### A. One `MetadataPicker`: The Chooser, the Value Panes, and the Menu Entry
**Scope:** The card's Add chooser, `MenuSeat`, the value pickers (options, Date), `MassPropertyPicker`, and the panel's chooser.

**What each contributes:**
- **Card chooser:** the in-app entries list (Spaces · Properties), a drill into a value pane under a back bar, and drill-surviving-reveal (`drillable` + live target, from the 09-06 fix).
- **`MenuSeat`:** the entry from a native menu leaf. It runs the click intent at the menu's trigger, makes a typed value a popover (nothing sits in place), lets File skip a pane, and resolves its column from the live registry.
- **Panel chooser:** the per-group list, reveal-then-edit-in-place.
- **Value panes:** `PropertyOptionRows` (edit, reorder, create), `DateTimeValuePicker`, and `PropertyValueInput` popovers.

**What's genuinely different, and why:**
- **The root list's renderer:** the native-menu path's root list is an OS menu, which is settled to stay. Only its leaf reaches the picker, entering at the value level and skipping the entries level. The card and panel paths start at the entries level. That's one component with two entry depths, not two components.
- **Reveal-in-place:** the panel has a row to edit in place, and the cards have one only in Standard. Whether "add" ever drills is a call for Nathan (E-6).

**What it removes:**
- The `chooser` mode and props on `PropertyPicker` (E-4).
- `SeatChooser` and `PickEntry`'s booleans (E-2).
- The duplicated open-away rule (E-3).
- `chooserTop` (E-5).
- `MassPropertyPicker` (E-7).
- Two of three entry builders (E-1).
- The `MenuSeat` registry branch (E-10).
- Rough estimate: −200 to −300 production lines, −2 or 3 files, and about −150 test lines rewritten smaller.

**Honest boundary:**
- **Inside:** assigning or managing one entity's (or many rows') Spaces and property values.
- **Exported from it:** `PropertyOptionRows`, which the filter's operand uses pick-only (`Core/Views/Settings/FilterFrame.tsx:181`). The picker can't make the option rows private.
- **Beside it:** generic action menus (`MenuPresenter`: tile handle, Insert, `PickerControl`), the right-click menus themselves, and the property *schema* editors (`PropertyFrame`, `OptionEditPopup`).
- **Shared with `MenuPresenter`:** only the drill level. That's `FrameSlide` + `MenuScrollFrame header={MenuTopRow}` + uniform floors, which could be one small `UIX/Menus` level component both draw (E-8).

**Trade-off:** `MenuPresenter`'s native-parity contract must not absorb rich leaves, so the shared piece has to stay row-agnostic.

##### B. Minimum Version: Keep `PropertyPicker`, Fix the Seams
This collapses `PickEntry` to a union, adds a seat `openAway`, drops `chooserTop` for `header=`, and merges the entry builders. It's about half the removal with no new component. It leaves "chooser as a mode" in place, so the *Reads as Designed* principle isn't met.

##### C. Doc and Test Sweep
This runs alongside either A or B: E-11, E-12, E-14, E-15, and E-16/E-17. E-13's pin should be written **before** the restructure.

---

#### 4. Concerns and Insights

- **Intent that must survive:**
  - The drilled pane outlives its entry leaving the list, so a multi-select added from the chooser keeps toggling (`09-06-…PropertyPicker-+-Panel.md:546–664`).
  - I-6: a chooser-added Checkbox lands checked, and an unchecked shown Checkbox stays drawn (confirmed twice by Nathan, `10-21-…Properties-Restructure.md:11237–11245`).
  - The seat resolves its column on every render (the three-time regression in E-10).
  - The seat reads its host through `useLatest` after awaits (16B-1).
  - The dismissal shield covers a card's add zone under an open picker (`10-21-…:11243`).
- **The restructure's plan and results live only in `~/NexusOS/.trash/`.** They're the sole written record of P15–P16B's rationale (for example, *"Known disclosed divergences: Cards' Add-chooser opens Checkbox/File differently from the menus"*, `10-21-…:5190`, later resolved by I-6). If Nathan wants that record kept, it should come out of the trash before cleanup.
- **`MatrixView` reads `pendingPick`** to hold its node's menu anchor (`Core/Matrix/MatrixView.tsx:45,82`). Reshaping `requestPick` must keep that signal.
- **I-027 sits squarely in the boundary decision.** Its proposed fix, one `PickerMenu` per presented menu held until `onExited`, is how the value pickers already behave. If the drill level is shared (A), the presenter adopting per-menu panes is the consistent answer. I-042 is independent of the restructure, but its footnote is stale (E-17). I-051 touches `FrameSlide`'s `slotBox` and isn't specific to the picker.
- **`compact` and `solid` on `MenuOptions` are live through `PickerControl`.** They look unused if you grep only `popMenu(` callers. Verified at `UIX/Pickers/PickerControl.tsx:118`.
- **Out of this mandate:** 96 test files hand-roll the act environment against 19 that use `mountEachTest`. That's a repo-wide test-harness question.
