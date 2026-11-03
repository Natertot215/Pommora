#### Scout A — The Picker and the Seat

**Baseline:** `69db9942e` on `active`. Every path is relative to the repo root. Nothing was edited.

#### 1. Map

##### `Core/Properties/Pickers/`

- **`PropertyPicker.tsx` (338)**
  - `PickTarget` (`:41`): `{ current }` & (`options` {column, pick, style?, contextOptions?} | `dateTime` {dateFormat?, timeFormat?}). Built only by `useValueSeat().target` (`ValueSeat.tsx:222`), and consumed by `PropertyPicker` and `MassPropertyPicker`.
  - `PickEntry` (`:56`): {id, name, icon, revealOnly, drillable, group?}. Built by `CardsView.tsx:481` and `PropertyPanel.tsx:183-186`.
  - `PropertyPicker` (`:65`) has three modes: **target** (`target` set, no `chooser`) shows one options or calendar pane. **Flat chooser** (panel) lists entries that are all `revealOnly`. **Grouped drill chooser** (cards) uses Spaces, a divider, then Properties, and a drillable entry slides to its pane under `MenuTopRow`. Holds `held = useHeld(target, open)` (`:86`) and `picked` (`:87`), and sets `t = picked ? resolveTarget(picked) : held` (`:92`). Its only caller is `ValueSeat` (`ValueSeat.tsx:277`).
  - `PropertyOptionRows` (`:189`) shows option rows, which are editable when `editable && def && options`. Callers are `PropertyPicker:106`, `MassPropertyPicker:25`, and `FilterFrame.tsx:181` (not editable).
  - `OptionGroups` (`:236`) and `EditableOptionRows` (`:261`) are internal. The latter uses `useOptionEdit` for drag, the option menu, and the New Option draft.
- **`MassPropertyPicker.tsx` (35)** is a `PickerMenu` plus `PropertyOptionRows` over `pickOver(currents[])`. Its only caller is `TableView.tsx:209`, with the target taken from `seat.target(rows[0], col)` (`TableView.tsx:206`).
- **`pickModel.ts` (51)**
  - `pickGroups` (`:8`) turns a column into `PickGroup[]` (Spaces, or `SelectOption` re-keyed `id→value`). Callers: `PropertyPicker:204`, `FilterFrame:139`, `propertyMenuActions.ts:48`.
  - `toggleValue` (`:17`): `useMultiValue.ts:13`.
  - `pickOver` (`:31`): `PropertyPicker:99`, `MassPropertyPicker:22`.
  - `pickedValue` (`:47`): `propertyMenuActions.ts:99` (the OS submenu's option pick).
- **`valueClick.ts` (58):** `ValueIntent` has seven kinds (`:10`). `valueClickIntent` (`:20`) and `valueMenuIntent` (`:57`) are called only from `ValueSeat.tsx:93,170`.
- **`filePick.ts` (103)**
  - `FILE_CHIP_INDEX_ATTR` and `fileValueWithout` are used by `Cell.tsx:10,163,168`.
  - `fileChipIndex`, `pickFileInto`, and `runFileMenuAction` are used by `ValueSeat.tsx:124,166,193`.
  - `runFilePick` is internal and tested.
- **`PropertyValueInput.tsx` (124)** is the typed-value router. A Number goes to `FieldPicker` or `EditableInput`, a popover Text value to `TextPane`, and everything else to the one-line `ValueEditor`, wrapped in `FieldPicker` when it's a popover. Its only caller is `ValueSeat.tsx:202`.
- **`DateTimeValuePicker.tsx` (38):** `dateFormFor` plus a `CalendarPicker` adapter. Callers are `PropertyPicker:117` and `FilterFrame:342,351`.
- **`TextPane.tsx` (59)** is a Text popover holding `ValueEditor` with save-on-close. Its only caller is `PropertyValueInput:86`.
- **`ValueEditor.tsx` (206)** is the CodeMirror value editor (pane or `oneLine`). It imports `./text-pane.css` (`:23`). Callers are `TextPane:42` and `PropertyValueInput:96`.
- **`property-picker.css.ts` (7)** holds `chooserTop` and `emptyPane`, both used only by PropertyPicker.
- **`text-pane.css` (39)** holds `.text-pane*`, which belongs to TextPane, and `.value-field*`, which belongs to ValueEditor's one-line mode.

##### `Core/Properties/Cells/ValueSeat.tsx` (353)

- **`SeatHost` (`:34`):** required members are rowOf, columnOf, commit, anchor, holder, and style. Optional members are connections, setStyle, centered, hold, hide, clear, and onClose.
- **`useValueSeat` (`:76`)** returns `{open, anchor, host, close, intentOf, run, click, pane, menu, input, editor, target}`. Hosts: `TableView.tsx:95`, `CardsView.tsx:198`, `PropertyPanel.tsx:79`, and `MenuSeat` (`:320`).
- **`ValueSeat` (`:260`)** draws the floating panes: one `PropertyPicker`, which is shared with the add chooser, and one typed popover. Mounted by `TableView.tsx:378`, `CardsView.tsx:474`, `PropertyPanel.tsx:403`, and `MenuSeat:352`.
- **`MenuSeat` (`:313`)** is the app-level seat for `pendingPick`. It's mounted once at `App.tsx:197`.
- **`SeatOpen`/`Mode` (`:58,63`):** `picker | editor | popover`, with a nonce.

##### What My Domain Pulls In

- **`Schema/useOptionEdit.tsx`:** shared by `EditableOptionRows` and `OptionEditor`. Every member of its API has a user (`edit.*` grep), so this sharing is genuine.
- **`Schema/OptionSlot.tsx`:** the picker uses only `OptionDraft`.
- **`Cells/OptionChip.tsx`:** used widely, by Views and Settings as well as Schema.

##### Surrounding Wiring (Other Domains, Read for Routes)

- **`requestPick`:** `chromeSlice.ts:17-24,73-75` holds `ValuePickRequest`. It's raised only by `runPropertyAction` (`propertyMenuActions.ts:90`), whose callers are `entityMenuActions.ts:68` (sidebar/entity right-click) and `useViewInteractions.tsx:408` (card/table title menu).
- **Property branches in menus:** `propertyBranchRows` (`Actions/propertyRows.ts:42`) feeds only `entityMenu.ts:88` and `pageMenu.ts:132`. Both pop with no trigger (`entityMenuActions.ts:64`, `CardsView.tsx:928`, `TableView.tsx:155`), so they always render as **OS** menus (`menuActions.ts:12`).
- **`MenuPresenter`:** reached only through `popMenu(items, trigger)`. Its only trigger-passing callers are `TileHost.tsx:243,301` (the tile menu and the insert menu). **No in-app menu ever renders Spaces or Properties branches.**

#### 2. Findings

##### F1 — The Add Chooser Behaves Two Ways on Two Surfaces

- **Category:** Inconsistency
- **Confidence:** Verified
- **Evidence:**
  - The panel marks every entry `revealOnly: true, drillable: false` (`PropertyPanel.tsx:186`), yet its `onReveal` is `revealAndEdit` (`:260-269`). That closes the chooser, reveals the row, and then a `requestAnimationFrame` later runs the seat's click intent at the row. Stage (Select) chosen from the panel therefore closes the chooser and opens a second picker at the row.
  - On cards, Stage drills inside the chooser with the "‹ Properties · Stage" back bar (`CardsView.tsx:486`, `PropertyPicker.tsx:132,168-179`).
  - Because `revealOnly` controls both "no chevron" and "dismiss after" (`PropertyPicker.tsx:130,134`), panel entries show no chevron and then open a value editor anyway. In the panel, `revealOnly` is effectively a misnomer.
- **Fix:** One chooser behavior across both surfaces (see Approach A). The panel's `rowEl ?? addRefs` anchoring fallback and the rAF hop then exist only to land an inline `editor`.
- **Effect:** One behavior removed, and about 10 lines in `revealAndEdit`.

##### F2 — Date, Text, Number, and Link Picked From the Card Chooser Don't Slide

- **Category:** Inconsistency, plus a Dead or Unreachable arm
- **Confidence:** Verified
- **Evidence:**
  - `drillable` is true only when `pickKindOf(type) !== null` (`CardsView.tsx:486`), and the panel never drills.
  - The drilled `pane`'s `dateTime` arm (`PropertyPicker.tsx:116-123`, reached through `resolveTarget` in `ValueSeat.tsx:285-292`) is therefore unreachable inside the chooser, though it's live in target mode.
  - Every other blank type takes the card's `onReveal` (`CardsView.tsx:490-500`): `setAddPicker(null)`, then `seat.run(...)`. That switches the picker's key from `'none'` to `row:col` (`ValueSeat.tsx:278`), so the pane remounts at the same anchor with no back bar.
  - A checkbox entry carries a chevron (`!revealOnly`) but commits on click.
- **Fix:** Drill every fillable kind, or define the chevron by what actually slides.
- **Effect:** A visible correction (Date gains the slide and back bar). `drillable` disappears as a separate flag.

##### F3 — Two Booleans Encode Three Entry Outcomes

- **Category:** Over-Engineering, against the hard rule "finite states are unions + switch"
- **Confidence:** Verified
- **Evidence:**
  - `PickEntry.revealOnly` and `drillable` (`PropertyPicker.tsx:60-61`) encode reveal, drill, or hand-back. The `revealOnly && drillable` combination is impossible.
  - Branching sits at `:130-134` and again in `CardsView.tsx:491`.
  - The test name "a dependent entry hands back without dismissing (its caller reopens on this mount)" (`PropertyPicker.pane.test.tsx:171`) documents the hand-back as a workaround.
- **Fix:** Collapse into one union, or into a single outcome under Approach A.
- **Effect:** One field gone, and one test reframed.

##### F4 — "Open a Value Away From Its Seat" Is Written Out Three Times

- **Category:** Duplication
- **Confidence:** Verified
- **Evidence:**
  - `intent?.kind === 'edit' ? { kind: 'popover' } : intent` appears at `ValueSeat.tsx:346` (MenuSeat) and `CardsView.tsx:494-498` (chooser hand-back).
  - `PropertyPanel.tsx:267` runs the same `seat.run(row, column, seat.intentOf(row, column), el)` without the mapping, because it reveals an inline seat first.
  - Each caller reaches into `seat.intentOf` plus `seat.run`, which is why both are exported (`:248`).
- **Fix:** A single seat verb, such as `seat.open(row, column, el)`, owning the edit→popover rule. `intentOf` stops being public.
- **Effect:** About −10 lines and one concept, and `run`'s six positional parameters (`:101-108`) no longer leak.

##### F5 — `PropertyPicker` Carries Two Mutually Exclusive Inputs and a Dual-Shaped Commit

- **Category:** Over-Engineering, Patch-On Residue
- **Confidence:** Verified
- **Evidence:**
  - `target` and `chooser` are exclusive only by `ValueSeat`'s convention: `target={!chooser && …}` (`ValueSeat.tsx:279-283`).
  - `t = picked ? resolveTarget?.(picked) : held` (`PropertyPicker.tsx:92`).
  - `commit` passes `picked` back (`:93`), so `onCommit(value, entry?)` (`:81`) forces `ValueSeat`'s commit to branch on `entry` for both row and column (`ValueSeat.tsx:296-300`).
  - `picked` resets on every `open` change in an effect (`:88-90`).
  - `resolveTarget` is just `seat.target(chooser.row, host.columnOf(id))`. That's the same computation as the target-mode target, through a second path.
  - `MenuTopRow label={picked.group ?? 'Properties'}` (`:172`): the fallback is hit only by a test whose entry has no group (`PropertyPicker.pane.test.tsx:219-249`). The panel never drills.
- **Fix:** Approach A removes `picked`, `resolveTarget`, the `entry` commit parameter, the reset effect, and the `?? 'Properties'` fallback.
- **Effect:** About −35 to −45 lines across PropertyPicker and ValueSeat, and two props.

##### F6 — `MenuSeat` Adapts a One-Value Request to a Many-Row Host

- **Category:** Parallel Definition
- **Confidence:** Verified
- **Evidence:**
  - `ValuePickRequest` (`chromeSlice.ts:17-24`: rowOf, column, holder, trigger, commit, style) is a reduced `SeatHost` snapshot.
  - `MenuSeat` then rebuilds a host from it. `rowOf` ignores its id, and `commit` ignores its row (`ValueSeat.tsx:321,328`).
  - `columnOf` re-resolves a property through `registry.find` plus `propertyColumn` (`:323-327`), where every other host uses `resolveColumn(id, schema, contextIds)` (`useViewHost.ts:208`, `PropertyPanel.tsx:81`).
  - A `useReducer` forces a re-read after commit (`:319,330`).
  - The file-intent dismiss special case (`:350`) exists because `run` returns `true` for file without opening a pane.
- **Fix:** If the request simply *were* `{row id, column id, host}`, or `requestPick` carried a `SeatHost` plus the target, MenuSeat would shrink to "run the open". The request must carry a *live* column resolver, or a holder path the seat re-resolves from the live tree. Swapping in `resolveColumn` over a schema snapshot would regress `ValueSeat.test.tsx:302` ("an option created while its picker is open joins its list", commit `3d876a810`), which is why the registry lookup exists. The store holding closures (`rowOf`, `commit`) is the established pattern here (`pendingMenu.settle` does the same), so the issue is the shape mismatch, not closures in the store.
- **Effect:** About −15 lines and one parallel column resolution.

##### F7 — Two Separate Builders Feed `PickEntry`, and a Third Builds the Same Holder's Spaces and Properties for the OS Menu

- **Category:** Parallel Definition, Inconsistency
- **Confidence:** Verified for the builders; Likely for the ordering mismatch mattering
- **Evidence:**
  - Panel: `contextPaneTargets` and `schemaTargets` → `Field` → `hidden()` (`PropertyPanel.tsx:164-186`).
  - Cards: `addEntriesFor` → `AddEntry` → mapped to `PickEntry` inline (`cardColumns.ts:31-65`, `CardsView.tsx:479-489`).
  - OS menu: `propertyMenuBranches` → `PropertyMenuRow` → `ActionItem` (`propertyMenuActions.ts:27-62`, `propertyRows.ts:9-50`).
  - Three orderings: cards put fillable entries first (`cardColumns.ts:67-69`), the OS menu puts option kinds first (`propertyMenuActions.ts:60`), and the panel uses row order (`PropertyPanel.tsx:174-177`).
  - The `'Spaces' | 'Properties'` vocabulary is typed in the picker (`PropertyPicker.tsx:62`) but chosen by `CardsView:487`. `propertyRows.ts:47-48` spells the same two labels independently.
- **Fix:** One "a holder's assignable Spaces and Properties" model owned by the MetadataPicker, with each surface supplying only what's shown. The `group` label then comes from the column kind in one place.
- **Effect:** Two types gone (`AddEntry` or `PickEntry`, and `PropertyMenuRow` if the OS path adopts it). Line effect is Speculative until domain owners weigh in.

##### F8 — `PickEntry` Re-Declares Most of `ActionItem`

- **Category:** Parallel Definition
- **Confidence:** Verified for the shape; Speculative as a merge
- **Evidence:**
  - `ActionItem` has label, icon, separatorBefore, action, and submenu (`menuModel.ts:3-26`). `PickEntry` has name, icon, group (rendered as a separator, `PropertyPicker.tsx:163`), id, and drillable.
  - `PropertyPicker.entryRow` (`:126-139`) plus the FrameSlide with `MenuTopRow` (`:153-181`) is `MenuPresenter`'s `Level` (`MenuPresenter.tsx:17-83`) at one level, with a value pane as the leaf.
- **Note:** This is the one honest overlap with MenuPresenter. It's mechanical only (see §4).

##### F9 — `MassPropertyPicker` Is the Options Pane With Many Values

- **Category:** Unjustified Separation
- **Confidence:** Likely
- **Evidence:** It's the same `pickOver` and the same `PropertyOptionRows editable` in its own `PickerMenu` (`MassPropertyPicker.tsx:22-33`, versus `PropertyPicker.tsx:99-114`). It borrows `seat.target(rows[0], col)` only for column, style, and contextOptions, ignoring `current` (`TableView.tsx:206-207`).
- **Fix:** If `PickTarget`'s options arm took `currents[]`, as `pickOver` already does, `PropertyPicker`'s target mode would serve the table's mass pick, and the file and its import would go.
- **Effect:** About −30 lines and one file, plus an `onCommit` that takes `PickCommit[]` (or a single value when there's one row).

##### F10 — `'dateTime'` Intent Duplicates `'picker'`

- **Category:** Parallel Definition
- **Confidence:** Verified
- **Evidence:**
  - Both float mode `'picker'` (`ValueSeat.tsx:128-131`). The only difference is that `'picker'` carries the click's `x`.
  - `PropertyPicker` already decides origin by kind (`:95`) but passes `anchorX` unconditionally (`:150`). That's why the seat withholds `x` for dates.
- **Fix:** Drop `anchorX` for non-options inside the picker and merge the intent.
- **Effect:** −1 `ValueIntent` member, −1 switch arm, and a test line in `valueClick.test.ts:21`.

##### F11 — Optional `SeatHost` Members That Are Never Absent, and Knobs Used Once

- **Category:** Over-Engineering
- **Confidence:** Verified for the knob table; Likely for `connections`
- **Evidence:**
  - `connections?` (`ValueSeat.tsx:42`) is supplied by all four hosts (`useViewHost.ts:212`, `PropertyPanel.tsx:86`, `ValueSeat.tsx:334`). The views pass `ctx.connections`, which `ValueContext` also types as optional (`valueContext.ts:19`), but `useValueContext` always sets it (`valueContext.ts:45`). Making it required means tightening both types together.
  - Single-surface knobs:
    - `centered` is cards only (`CardsView.tsx:202`), where it's the picker's `x`.
    - `clear` is panel only (`PropertyPanel.tsx:88`).
    - `onClose` is MenuSeat only (`:336`).
    - `hold` is table and cards.
    - `hide` is cards and panel.
    - `setStyle` is table and cards, through `seatHost`.
  - Each knob has a stated reason in its doc comment. They're honest per-surface differences, but `onClose` exists only because MenuSeat must clear `pendingPick`.

| Knob | Table | Cards | Panel | MenuSeat |
|---|---|---|---|---|
| `connections` | ✓ | ✓ | ✓ | ✓ |
| `setStyle` | ✓ | ✓ | | |
| `centered` | | ✓ | | |
| `hold` | ✓ | ✓ | | |
| `hide` | | ✓ (view) | ✓ (row) | |
| `clear` | | | ✓ | |
| `onClose` | | | | ✓ |

##### F12 — The Space-Chip Decision Is Written Three Times

- **Category:** Duplication
- **Confidence:** Verified
- **Evidence:** The `contextOptions ? <NeutralChip …> : <OptionChip …>` choice appears at `PropertyPicker.tsx:224-228` and `FilterFrame.tsx:157-173`. `Cell.tsx:96-114` draws a Space as `NeutralChip` too.
- **Fix:** If `OptionChip` drew `type === 'context'` as the neutral chip, both ternaries would go.
- **Effect:** About −15 lines. This crosses into Cells and Views.

##### F13 — `PickOption.value` Versus `SelectOption.id`

- **Category:** Parallel Definition
- **Confidence:** Verified (minor)
- **Evidence:** `pickGroups` re-keys every option with `{ ...o, value: o.id }` (`pickModel.ts:13`). `EditableOptionRows` then calls `optionGroupsOf(def)` a second time (`PropertyPicker.tsx:275`) beside the groups `pickGroups` already built (`:204`).
- **Fix:** One identity key (`id`) for pick options would remove the re-key and the second walk.
- **Effect:** `PickOption` lives in `properties.ts:237`; Contexts build it in `contextOptions.ts:33-38`.

##### F14 — File Placement Doesn't Match Responsibility

- **Category:** Misplaced Ownership
- **Confidence:** Verified
- **Evidence:**
  - `ValueSeat.tsx` lives in `Cells/` but is the surface-agnostic seat for the panel and the App-level `MenuSeat` (`App.tsx:29`).
  - `valueClick.ts` is seat-only (its only importer is `ValueSeat.tsx:31`) but lives in `Pickers/`.
  - `filePick.ts` is a seat effect plus a Cell attribute.
  - `text-pane.css` is imported by `ValueEditor` (`:23`) and holds `.value-field` (`:23-39`), which isn't TextPane's.
  - `dateFormFor` is a format rule living in a component file and imported by `FilterFrame:32`.
- **Fix:** A `MetadataPicker/` home for the seat, the intents, and the panes, with `Cells/` left as display only.
- **Effect:** File moves; no line change.

##### F15 — Feature Doc Describes Things the Code Doesn't Do

- **Category:** Doc–Code Mismatch
- **Confidence:** Verified
- **Evidence:** `.claude/Features/PropertiesPM.md:115`:
  - It says PropertyPicker renders "the operating system's file dialog for File". `PickTarget` has no `file` arm; File runs from the seat through `filePick`.
  - It says it "can open on a chooser pane that adds a property and drills straight into its value". That's cards and option kinds only.
  - It lists "the Properties panel" as a surface without noting that the panel's chooser never drills.
  - `MenuSeat` isn't described anywhere in Features.

##### F16 — Test Burden Under Restructuring

- **Category:** Test Burden
- **Confidence:** Verified
- **Evidence:**
  - These tests pin today's mode split and would merge or move:
    - The four chooser tests in `PropertyPicker.pane.test.tsx:151-249`, two of them on `revealOnly`/`drillable` mechanics.
    - "The menu seat" block in `ValueSeat.test.tsx:283-345`.
    - `cardGestures.test.tsx:236` ("the card's Add chooser").
  - The remaining pane tests (options look, calendar, centering, option editing at `:251-375`) pin real behavior and survive as they are.

#### 3. Approaches

##### A — The Drill Is a Seat Open (Lead Recommendation)

- **The change:** The chooser becomes the PickerMenu's root slot inside `ValueSeat`. Choosing any fillable entry calls the seat's single "open" verb (F4) with the chooser's anchor. The FrameSlide detail is whatever the seat now has open: the options or calendar target, or (see the boundary question below) the typed input. The back bar calls `seat.close()` and returns to the root.
- **What it removes:**
  - From PropertyPicker: `picked`, its reset effect, `resolveTarget`, the `entry` parameter on `onCommit`, and `PickEntry.drillable`.
  - From ValueSeat: the `!chooser &&` gate, the dual commit, and the `resolveTarget` lambda.
  - From cards and panel: the hand-back `onReveal`, and the panel's rAF `revealAndEdit` path for anything not inline.
  - Panel, cards, and the menu-leaf request then share one entry path.
- **What it costs:**
  - The chooser must stay mounted while the seat opens, so `ValueSeat` holds both. The picker's key (`ValueSeat.tsx:278`) must not change when the open comes from the chooser, or the slide remounts.
  - Today the panel reveals the row *before* the edit (`PropertyPanel.tsx:254,262`), so a Date chosen from Add Property and then dismissed leaves a blank revealed row. Under A, a drill dismissed without a pick leaves nothing; reveal happens only on commit, as cards do through `commitOnCard` (`CardsView.tsx:194-197`). That changes what the panel's "added this session" rows mean, and Nathan should rule on it.
  - The panel's "reveal the row, then edit inline" must decide whether it keeps inline editing for typed values or adopts the drilled pane like cards. That's a Nathan-visible choice.
- **Estimate:** Net about −50 to −70 lines in Core (Speculative until it's drafted). Concepts drop from three chooser outcomes to one.
- **The boundary question:** whether typed values (`PropertyValueInput`'s Number, Link, and one-line editor) become drill details too. Today a chooser-picked Text or Number opens as a separate popover. Making them details gives one behavior for every kind (F2). `TextPane` (480px wide, `text-pane.css:3`) doesn't fit a slide frame, so Text likely stays a popover. That's an exception carrying its reason.

##### B — One Model for a Holder's Assignable Metadata (Crosses Into Views and Interface)

- One builder produces `{column, label, icon, group, state}` for a holder: shown or hidden, blank or not. The card's chooser, the panel's chooser, and `propertyMenuBranches` all read it, so F7's three builders, three orderings, and the duplicated group labels collapse.
- The OS submenu keeps `propertyBranchRows`, `pickedValue`, and the option checkmarks, because an OS menu can't host chips or a calendar. That submenu is a renderer of the same model.
- **Risk:** cards' "hidden but non-blank → reveal in view" (`cardColumns.ts:55`, `useViewHost.ts:161`) is a view-visibility act the panel doesn't have. The model needs a per-surface "what reveal means" hook, which is genuine variance.

##### C — Fold `MassPropertyPicker` Into the Target Pane (F9)

- `currents[]` on the options target. This is small and independent of A.

##### D — Move Files to Match the Boundary (F14)

- Proposed `Core/Properties/MetadataPicker/` containing:
  - `MetadataPicker.tsx` (PropertyPicker plus the chooser root)
  - `useValueSeat.ts` (the seat, intents, and the MenuSeat entry)
  - `OptionRows.tsx` (`PropertyOptionRows`, `EditableOptionRows`, `OptionGroups`)
  - `pickModel.ts`
  - `filePick.ts`
  - the typed-input trio: `PropertyValueInput`, `ValueEditor`, `TextPane`, with `text-pane.css` split or renamed to its two real owners
- `valueClick.ts` would fold into the seat file, which is its only caller. `Cells/` keeps display only.

##### E — Merge the `'dateTime'` and `'picker'` Intents (F10)

- Trivial and independent.

#### 4. Concerns and Insights

- **Nathan's update, from my side:** "unify the Add chooser, MenuSeat, and MenuPresenter into one picker."
  - **Add chooser:** contributes the root list, the Spaces | Properties grouping, the drill, and the "‹ Group · Name" back bar.
  - **MenuSeat:** contributes the "open at a trigger directly on a value" entry point, which is the only bridge from an OS menu leaf into an in-app pane.
  - **MenuPresenter:** contributes nothing entity-specific. It's reached only by `TileHost`'s tile and insert menus (`TileHost.tsx:243,301`). Every menu carrying Spaces or Properties branches (`entityMenu.ts:88`, `pageMenu.ts:132`) is popped without a trigger and is always native (`menuActions.ts:12`). Its overlap is purely mechanical: `Level` is `FrameSlide`, `MenuTopRow`, and rows with `pickRuns` (`MenuPresenter.tsx:17-83`), which is the shape PropertyPicker's chooser hand-rolls (`PropertyPicker.tsx:126-181`).
  - **The honest boundary:** MetadataPicker equals one seat host, plus the chooser root, plus the value panes. MenuSeat becomes "MetadataPicker opened at its leaf" rather than a second `useValueSeat` host with a reduced-copy request. Generic action menus stay beside it.
  - **Mechanics worth sharing:** one list-level renderer (rows, separator, chevron, slide, back bar), which `Level` and the chooser could both use. This is only if it removes more than it adds.
  - **One genuine difference:** the chooser's back label is the entry's *group* ("Spaces" or "Properties"), while `Level`'s is the *parent title*, and the presenter's root is literally "Menu" (`MenuPresenter.tsx:111`). Sharing the level needs a row-supplied back label, or the chooser would read "‹ Menu · Stage".
- **Separations that are correct:**
  - `useOptionEdit` is genuinely shared between the picker and `OptionEditor`; every API member has a user.
  - `ValueEditor` is the one editor for every typed value, and it's correct for it to stay a single component. Its two modes share commit, settle, and alias logic.
  - `filePick` exists because a file fill is an async three-step effect and `valueClickIntent` is pure (`filePick.ts:1`). That reason holds.
  - The `requestPick` → app-level presenter route matches `presentMenu` → `MenuPresenter` and `askConfirm`. The store-request-plus-presenter pattern is consistent; F6 is about its payload shape only.
  - `SeatHost`'s per-surface knobs are each a real surface difference (F11). The fat isn't there; it's in `PropertyPicker`'s mode split and the three hand-off paths.
- **Risks:**
  - Approach A changes when the `PropertyPicker` key remounts. Today's keying (`ValueSeat.tsx:278`) exists so that another value's picker mounts fresh and options-created-while-open stay live (`ValueSeat.test.tsx:125`). Those behaviors need re-pinning.
  - `useHeld` in three layers (PropertyPicker `:86`, ValueSeat `last` ref `:268-269`, MenuSeat `:317`) each hold through exit animations. A restructure should hold once, at the seat.
- **Naming:** "picked" means three things in this surface: ValueSeat's last picker open (`:270`), PropertyPicker's drilled entry (`:87`), and `row.picked` override values (`PropertyPanel.tsx:150,167`).
