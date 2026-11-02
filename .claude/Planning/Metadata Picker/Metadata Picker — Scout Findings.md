### Reconciled Account — The Metadata Picker System

**Baseline:** `69db9942e` on `active`. Every `file:line` below was opened at HEAD for this account; paths are repo-relative. Scout IDs: A-F#, B-F#, C#, D-F#, E-#.

**Status Key:** **Verified** — the cited lines hold. **Corrected** — it holds in the form stated here. **Unverified** — code alone can't settle it; the deciding check is named. Each finding is marked **Visible** (a user would see the change) or **Code-Only**.

---

#### 1. What's True

##### Entry Points

| # | Entry | Path to a Pane or Commit |
|---|---|---|
| E1 | Value click (table, cards, panel) | `seat.click` (`Core/Properties/Cells/ValueSeat.tsx:142-148`) → `valueClickIntent` (`Core/Properties/Pickers/valueClick.ts:20-47`) → `run` (`ValueSeat.tsx:101-140`): commit, file dialog, or `float('picker' \| 'editor' \| 'popover')` |
| E2 | Value right-click | `seat.menu` (`ValueSeat.tsx:155-196`) → native `popMenu(cellMenuModel)` (no trigger) → `valueMenuIntent` (`valueClick.ts:57`) → `run` |
| E3 | Cell pane button | `seat.pane` (`ValueSeat.tsx:150-152`) → popover |
| E4 | Card Add chooser | `PageCard.openAdd` gate (`Core/Views/Cards/CardsView.tsx:911-918`) → `openAddPicker` pokes `seat.anchor` (`:275-278`) → `<ValueSeat chooser>` (`:474-507`) → option kinds drill in place (`Core/Properties/Pickers/PropertyPicker.tsx:132`); every other kind hands back through `onReveal` (`CardsView.tsx:490-502`) |
| E5 | Panel Add chooser | `openAdd` pokes `seat.anchor` (`Core/Properties/PropertyPanel.tsx:188-191`) → `<ValueSeat chooser>` (`:403-412`) → `revealAndEdit` (`:260-269`): close, reveal, then a `requestAnimationFrame` later `seat.run` on the row |
| E6 | Right-click **Spaces ▸ / Properties ▸** (always native: no trigger, `Core/Actions/menuActions.ts:12`) | Views: `titleMenuContext` / `runTitleAction` (`Core/Views/Host/useViewInteractions.tsx:395-435`). Sidebar, Matrix, band: `showEntityMenu` (`Core/Interface/Menus/entityMenuActions.ts:45-77`). Both → `runPropertyAction` (`Core/Interface/Menus/propertyMenuActions.ts:64-101`): an option leaf commits directly (`:98-99`); a bare leaf calls `requestPick` (`:89-97`) → `MenuSeat` (`ValueSeat.tsx:313-353`, mounted once at `Core/Interface/App.tsx:197`) |
| E7 | Table sweep | `massPicker` (`Core/Views/Table/TableView.tsx:196-227`) → `MassPropertyPicker` |

##### The Terminal

Every commit ends in `assignValue` through one of three writers: the view writer (`Core/Views/Host/useViewHost.ts:172-180`), the panel writer (`PropertyPanel.tsx:158`), and `oneShotWriter` for entity menus (`entityMenuActions.ts:67`).

##### Entry Builders (Who Decides What an Item Can Hold)

- **Cards:** `addEntriesFor` + `AddEntry` + `orderAddableEntries` (`Core/Views/Cards/cardColumns.ts:31-69`), mapped to `PickEntry` inline (`CardsView.tsx:480-489`).
- **Panel:** `contextPaneTargets` + `schemaTargets` → `Field` → `hidden()` (`PropertyPanel.tsx:42,164-186`).
- **Native menu:** `propertyMenuBranches` → `PropertyMenuRow` (`propertyMenuActions.ts:27-62`) → `propertyBranchRows` → `ActionItem` (`Core/Actions/propertyRows.ts:9-50`).

##### Pane Hosts

- **`useValueSeat`** (`ValueSeat.tsx:76-249`): four hosts — `TableView.tsx:95`, `CardsView.tsx:198`, `PropertyPanel.tsx:79`, `MenuSeat` (`ValueSeat.tsx:320`).
- **`ValueSeat`** (`ValueSeat.tsx:260-310`): one `PropertyPicker` (shared by chooser and value, keyed `rowId:columnId` at `:278`) plus one typed popover through `PropertyValueInput` (`Core/Properties/Pickers/PropertyValueInput.tsx`: `FieldPicker` for Number/Link/one-line, `TextPane` for Text). Inline editors render through `seat.editor` (`ValueSeat.tsx:216-219`).
- **`PropertyPicker`** (`PropertyPicker.tsx:65-187`): target mode (options or calendar) or chooser mode (`FrameSlide` root list + detail).
- **`MassPropertyPicker`** (`Core/Properties/Pickers/MassPropertyPicker.tsx:7-35`).
- **`MenuPresenter`** (`Core/Interface/Menus/MenuPresenter.tsx:85-117`): reached only by trigger-passing `popMenu` callers — `Core/Tiles/TileHost.tsx:243,301` and `PickerControl`'s door (`UIX/Pickers/PickerControl.tsx:118`). It never draws Spaces or Properties.

##### Kit Pieces in Play

`PickerMenu` (`UIX/Pickers/PickerMenu.tsx`), `FrameSlide` (`UIX/Menus/FrameSlide.tsx`, holds `detail` itself at `:42-44`), `MenuTopRow` (`UIX/Menus/MenuRows.tsx`), `MenuScrollFrame`, `MenuItem`, `pickRuns`, `FieldPicker` (`UIX/Pickers/FieldPicker.tsx`), `CalendarPicker` (`UIX/Pickers/CalendarPicker.tsx`, under `DateTimeValuePicker`), `PICKER_MAX_HEIGHT` 240 (`UIX/Pickers/picker-base.css.ts:8`).

---

#### 2. Findings, by Theme

##### The One Picker

###### M-1 • The Chooser Is a Prop-Switched Mode on the Value Picker

- **Sources:** A-F3, A-F5, B-F2, E-2, E-4. **Status:** Verified. **Code-Only.**
- **Evidence:** `PickEntry.revealOnly` + `drillable` (`PropertyPicker.tsx:60-61`) encode three outcomes (reveal, drill, hand back); `revealOnly && drillable` is meaningless. Dispatch at `:131-134`, again at `CardsView.tsx:491`. `chooser`, `onReveal`, `resolveTarget` props (`PropertyPicker.tsx:67,72,74`); `picked` + reset effect (`:87-90`); `t = picked ? resolveTarget(picked) : held` (`:92`); `commit(v, picked)` (`:93`) forcing `ValueSeat`'s dual commit (`ValueSeat.tsx:296-300`); `origin={chooser ? 'auto' : origin}` (`PropertyPicker.tsx:149`). `ValueSeat` re-threads it through `SeatChooser` (`ValueSeat.tsx:251-257`), the `!chooser &&` gate (`:279-283`), and a second target path `resolveTarget` (`:285-292`) computing what `seat.target` already computes. `group?` is optional only because the panel omits it; its `?? 'Properties'` fallback (`PropertyPicker.tsx:172`) is reached only by the test at `PropertyPicker.pane.test.tsx:219-249`. History: added 09-06-2026 as an "optional chooser pane" (`4d0a63975`); `drillable` + `resolveTarget` were the same session's fix for the drill snapping back (`.claude/sessions/09-06-2026-PropertyPicker-+-Panel.md:662`).
- **Change:** The chooser becomes the root level of the seat's one pane; a drill is a seat open (§5, Option 1).
- **Removes:** `PickEntry.revealOnly`, `.drillable`, optional `group`; `chooser`/`onReveal`/`resolveTarget` props; `picked` state and effect; the `entry` commit parameter; `SeatChooser`; the dual commit; the `?? 'Properties'` fallback.

###### M-2 • The Hand-Back Remounts the Picker, and Date Doesn't Drill

- **Sources:** A-F2, B-F3, C §3-A "Lifetime Rule", A §4 risk, E-6. **Status:** Verified (mechanism); Corrected (A's re-pin claim, E's history claim). **Visible.**
- **Evidence:**
  - Card `drillable = !revealOnly && pickKindOf(type) !== null` (`CardsView.tsx:486`); `pickKindOf('dateTime')` is null (`Core/Properties/properties.ts:66-80`), so Date takes the hand-back: `setAddPicker(null)` + `seat.run` in one handler (`CardsView.tsx:494-501`).
  - Before the pick, the key is `'none'` or a prior value's (`ValueSeat.tsx:278`); the batched render makes it `row:col`, so React unmounts the chooser's `PropertyPicker` while its `PickerMenu` is open (no Bloom-out) and mounts a fresh one at the same anchor with no back bar. The panel does the same one frame later through `revealAndEdit`'s rAF, unmounting the chooser mid-exit (`PropertyPanel.tsx:260-269`). A second value opened while the first is still exiting is cut the same way.
  - `PickerMenu`'s DEV guard (`PickerMenu.tsx:134-143`) logs on exactly this unmount, but keys on the *mount-time* `anchorX`: it fires for table and panel instances and for a card's first `'none'` instance, and is silent for card instances first mounted from a centered click (`ValueSeat.tsx:295`, `:146`). Core's test setup doesn't fail on `console.error` (`Core/vitest.config.ts`, `Core/vitest.setup.ts`), so `cardGestures.test.tsx:275` passes through it silently.
  - Checkbox, File, Text, Number, and Link entries show a chevron (`PropertyPicker.tsx:130`, any `!revealOnly`) though none slides: Checkbox commits (`valueClick.ts:29-32`), File opens the OS dialog, the rest open a popover.
  - **Why the key exists:** the 09-06 session restored "the per-cell remount" so a quickly reopened *different* Date cell shows its own date (`09-06-2026-PropertyPicker-+-Panel.md:638`); `CalendarPicker` seeds its state from `value` at mount (`CalendarPicker.tsx:71-85`). No test pins it — only the popover's remount is pinned (`ValueSeat.test.tsx:259`).
  - **History correction:** E-6 calls Date-leaves-the-chooser "intended on 09-06"; the cited line (`09-06…md:634`) is the agent describing its own outcome and asking Nathan to confirm, not a recorded decision.
- **Change:** Drillability derives from whether `seat.target` yields a pane (options or calendar), so Date drills and the chevron means "slides." Under Option 1 the seat owns the request, so the shell is keyed by *request* rather than by `rowId:columnId`: a drill inside a chooser request keeps its shell (no remount, back bar intact), and each new request still mounts fresh, so the calendar's per-value freshness holds. A second request opened while the first is still exiting keeps today's cut-short exit; removing that needs one shell per request held until `onExited` (the pinned-glance precedent, `Core/Interface/Glance/GlancePane.tsx:408-420`), which is new mechanism and stays outside this cleanup unless I-027 takes that route (M-25, R-10).
- **Effect:** Date gains the slide and back bar; the chooser-to-value hand-off stops remounting; `drillable` goes.

###### M-3 • Add Behaves Two Ways on Two Surfaces

- **Sources:** A-F1, B-F4, E-6. **Status:** Verified. **Visible.**
- **Evidence:** Panel entries are all `revealOnly: true, drillable: false` (`PropertyPanel.tsx:186`), yet `onReveal` is `revealAndEdit`, which also opens the value (`:260-269`). So picking Stage from the panel's Add closes the chooser and opens a second picker at the row; on cards it slides in place under "‹ Properties · Stage." The rAF exists because the chooser's own dismiss calls `seat.close()` synchronously after `onReveal` (`ValueSeat.tsx:302-305`, `PropertyPicker.tsx:134`). The panel reveals *before* the edit (`PropertyPanel.tsx:262`), so a Date chosen and dismissed leaves a blank revealed row; cards reveal only on a non-blank commit (`CardsView.tsx:194-197`).
- **Genuine difference:** the panel has a row to edit Text/Number/Link inline; a card has none, so those open a popover.
- **Change:** Option and Date entries drill in both; the panel keeps reveal-then-edit-in-row only for typed values. Ruling R-1, R-4.
- **Effect:** One behavior for list-and-date kinds; the rAF goes for them. Whether it goes entirely is **Unverified**: the inline editor anchors on `rowEl(id)` (`PropertyPanel.tsx:265-266`), which exists only after the reveal renders, and the seat closes any pane whose anchor isn't connected (`ValueSeat.tsx:88-90`); a seat-owned "reveal then edit" must resolve the anchor after that render.

###### M-4 • "Open a Value Away From Its Seat" Is Written Out Three Times

- **Sources:** A-F4, B-F6 (rule part), E-3. **Status:** Verified. **Code-Only.**
- **Evidence:** `intent?.kind === 'edit' ? { kind: 'popover' } : intent` at `ValueSeat.tsx:342-347` (MenuSeat) and `CardsView.tsx:495-500`; the panel runs `seat.run(row, column, seat.intentOf(row, column), el)` without the mapping (`PropertyPanel.tsx:267`) because it edits inline. These three are the only external callers of `seat.run` and `seat.intentOf` (grep), which is why both are public (`ValueSeat.tsx:248`). Task 16B-1 of the restructure plan prescribed the copy (`~/NexusOS/.trash/Properties Restructure — Implementation Plan.md`).
- **Change:** One seat verb (`openAway(row, column, anchor)`) owning the edit→popover rule; `run` and `intentOf` leave the public API.
- **Effect:** About −10 lines; MenuSeat's effect shrinks to one call.

###### M-5 • Hosts Poke the Seat's Anchor, and Cards Compute Add Entries Twice

- **Sources:** B-F9, E-18. **Status:** Verified. **Code-Only.**
- **Evidence:** `seat.anchor.current = …` at `CardsView.tsx:276` and `PropertyPanel.tsx:189`. `CardApi.addableFor` (`CardsView.tsx:101,282`) exists only for the `.length > 0` gate at `:914`; `:222-225` recomputes and orders the same entries while open. `AddPickerRequest` (`:76-79`) and `addPicker` state (`:162`, `:219-220`) hold what the seat could hold.
- **Change:** The seat owns chooser state (`openChooser(row, entries, anchor)`); an empty chooser already draws `emptyPane` (`PropertyPicker.tsx:158-159`), or the gate reads the builder once.
- **Removes:** `AddPickerRequest`, `addableFor`, `addPicker`/`setAddPicker` and its orphan effect, two anchor pokes, the `addPicker !== null` ghost check (`CardsView.tsx:177`, covered by `seat.open`).

###### M-6 • The Picker's Data Is Held Through Its Exit in Three Layers

- **Sources:** A §4, D-F8 (picker part). **Status:** Corrected. **Code-Only.**
- **Evidence:** `PropertyPicker`'s `useHeld(target, open)` (`PropertyPicker.tsx:86`) exists for the shell prop `origin` (`:95`); `PickerMenu` already holds children (`PickerMenu.tsx:154`). `ValueSeat`'s `last` ref (`ValueSeat.tsx:268-274`) is load-bearing beyond holding: it drives the key (`:278`) and the row and column a late commit writes to. `MenuSeat`'s `useHeld(pending)` (`:317`) keeps the host alive through the exit.
- **Correction to D:** a kit-level shell-prop hold would retire `PropertyPicker.tsx:86`, not `ValueSeat`'s `last` ref.
- **Change:** Under Option 1, hold once at the seat.

##### Entry Builders

###### M-7 • Three Builders Answer "What Can This Item Hold," in Three Orders

- **Sources:** A-F7, B-F1, E-1. **Status:** Verified; B's union claim Corrected. **Visible** (ordering).
- **Evidence:**
  - **Contents:** cards union `hiddenListIds` + schema + shown Contexts minus shown (`cardColumns.ts:38-58`); `hiddenListIds` adds Created/Modified stamps (`Core/Views/visibilityModel.ts:18`), which surface as reveal-only Properties (`cardColumns.ts:55`, `fillsBlank` false for filedata `:14`). Panel: all Contexts + schema, no stamps (`PropertyPanel.tsx:164-165`). Menu: all Contexts + schema, no stamps, no shown filter (`propertyMenuActions.ts:57-60`).
  - **Spaces order:** panel honors the user's `config.order.contexts` then `spaceNode.rowOrder` (`PropertyPanel.tsx:174-176`); menu uses registry order (`propertyMenuActions.ts:59`, documented at `.claude/Features/PropertiesPM.md:119`); cards put view-hidden Contexts first, then partition fillable-first (`cardColumns.ts:42-44,67-69`).
  - **Properties order:** menu puts option kinds first (`propertyMenuActions.ts:60`); cards put fillable first (`cardColumns.ts:67-69`); panel uses schema/`rowOrder` (`PropertyPanel.tsx:177`).
  - **B corrected:** the three spreads reduce to all Contexts ∪ schema ∪ unshown stamps before the `shownIds` filter (`resolveColumns`, `Core/Views/Pipeline/columns.ts:37-50`, is `hiddenListIds`' exact complement); the third spread contributes only order.
  - Group vocabulary: `'Spaces' | 'Properties'` typed at `PropertyPicker.tsx:62`, chosen at `CardsView.tsx:487`, spelled again at `propertyRows.ts:38,47`.
- **Change:** One builder returning `{column, label, icon, group, held}` per item in one order; hosts filter (cards: unshown in view; panel: not shown; menu: all) and map. Ruling R-6, R-7.
- **Removes:** `addEntriesFor`'s union, `AddEntry`, `orderAddableEntries`, the panel's `Field`/`hidden()` mapping, the menu's reordering line.
- **Effect:** About −20 to −30 net; ships independently of Option 1.

###### M-8 • Four Row Models and Two Label/Icon Derivations

- **Sources:** B-F2, B-F1 (label part), A-F8. **Status:** Verified (shapes); A-F8's merge with `ActionItem` Rejected (§3). **Code-Only.**
- **Evidence:** `AddEntry` (`cardColumns.ts:61-65`), `Field` (`PropertyPanel.tsx:42`), `PropertyMenuRow`/`PropertyMenuOption` (`propertyRows.ts:3-13`), `PickEntry` (`PropertyPicker.tsx:56-63`). Label and icon come from `columnLabel`/`columnIcon` (`Core/Properties/columnDisplay.ts:6-18`, cards and menu) and from `PaneTarget` (`Core/Views/paneTargets.ts:26-38`, panel); they agree today.
- **Change:** M-7's builder output is the one row model for both in-app choosers; the native mapping keeps `PropertyMenuRow` only if it still earns a separate shape (it carries checked option runs the in-app rows don't).

###### M-9 • `pageMetaMenuItems` Takes the Same Branches Twice

- **Sources:** B-F7. **Status:** Verified. **Code-Only.**
- **Evidence:** `PageMenuContext` holds `spaces`/`properties` (`Core/Actions/pageMenu.ts:29-34`); `pageMetaMenuItems` takes `move` *and* separate `spaces`/`properties` (`:124-126`). All three callers pass the same object both ways: `cardMenu.ts:19-21`, `cellMenu.ts:122-123`, `entityMenu.ts:48-50`. `cardMenu.ts:22` casts to `CardMenuAction` (`:9`), which omits `PropertyAction`.
- **Effect:** About −8 lines; the cast becomes honest.

###### M-10 • Three `property*Menu*` Files in Two Folders

- **Sources:** B-F15. **Status:** Verified. **Code-Only.**
- **Evidence:** `Core/Actions/propertyRows.ts` (branch rows + `prop:` encode/parse), `Core/Interface/Menus/propertyMenuActions.ts` (build + run), and the unrelated `Core/Actions/propertyMenu.ts` (the Property Frame's ⋮ menu).
- **Change:** If M-7's builder lands, its native mapping and `propertyRows.ts`'s encode/parse sit in one file beside it. The `prop:` encoding itself must remain for the native route.

##### Routes and Seats

###### M-11 • View Title Menus Route Picks Through the Global `MenuSeat` and Lose the View's Host

- **Sources:** B-F5, B §3-C. **Status:** Verified (code); whether the lost behaviors are wanted is Ruling R-5. **Visible.**
- **Evidence:** `runTitleAction` → `runPropertyAction` with `commit: commitValue` (`useViewInteractions.tsx:414`, `useViewHost.ts:176-180`), so neither a menu-picked value (via `MenuSeat`) nor a direct option leaf (`propertyMenuActions.ts:98-99`) goes through `commitOnCard`; a value set from a card's right-click menu doesn't reveal a property hidden from the view (`revealProperty` exits early only when shown, `useViewHost.ts:163`), contradicting the comment at `CardsView.tsx:193`. `MenuSeat` has no `setStyle` (`ValueSeat.tsx:320-337`), so `seat.target` yields no `style` control (`:240-243`) and option looks can't be edited from a menu-opened picker. The card ghost's suppression checks `seat.open` and `addPicker`, never `pendingPick` (`CardsView.tsx:175-179`).
- **Change:** `runPropertyAction` takes an `open(column)` callback instead of calling `requestPick`; views pass their own seat's `openAway`, and their `commit` becomes the seat host's; `showEntityMenu` passes the `requestPick` path.
- **Effect:** About ±0 lines; three divergences close; `MenuSeat` serves only surfaces with no seat (sidebar, Matrix, band).

###### M-12 • `MenuSeat` Re-Resolves Columns Its Own Way

- **Sources:** A-F6, E-10. **Status:** Verified; Corrected (the fix is simpler than either scout states). **Code-Only.**
- **Evidence:** `columnOf` branches on `held.column.kind` and runs `registry.find` + `propertyColumn` (`ValueSeat.tsx:323-327`); every other host uses `resolveColumn(id, schema, contextIds)` (`useViewHost.ts:207`, `PropertyPanel.tsx:81`). The registry lookup exists for `3d876a810` (an option created mid-pick joins the list), pinned at `ValueSeat.test.tsx:302`. `rowOf` ignores its id and `commit` ignores its row (`:321,328`); a `useReducer` forces a re-read (`:319,330`).
- **Change:** `columnOf: (id) => resolveColumn(id, registry, contextIds)` — the registry is the live superset schema, so the branch goes. Likely to keep the live-option pin passing: that test grows the option list by replacing the tree's registry (`ValueSeat.test.tsx:302-308`), which the store-read `registry` already follows.
- **Effect:** About −4 lines and one parallel resolution.

###### M-13 • `requestPick` Has a Different Contract From `presentMenu` and `askConfirm`

- **Sources:** B-F6, C9, D-F12. **Status:** Verified; the merge proposals are Rejected (§3). **Code-Only.**
- **Evidence:** `askConfirm`/`presentMenu` settle displaced requests behind identity guards (`Core/Session/chromeSlice.ts:51-71`); `requestPick` overwrites (`:74`). `MatrixView` reads `pendingPick` as a "someone is picking" flag (`Core/Matrix/MatrixView.tsx:45-48,82`), and `showEntityMenu` resolves on close, before the pick (`entityMenuActions.ts:44`). The file-only `dismiss()` (`ValueSeat.tsx:350`) exists because `run` returns true for File without opening a pane.
- **Change:** Keep the two channels (decision 9). After M-11, `requestPick` serves only entity menus; reshaping it into a settling request is optional and must keep Matrix's signal.

###### M-14 • The Panel Has Two Commit Functions

- **Sources:** B-F8. **Status:** Verified. **Code-Only.**
- **Evidence:** Seat host `commit` (`PropertyPanel.tsx:82`) and `commit(id, next)` (`:159-162`), which re-resolves a column `renderRow` already holds (`:274`, used at `:294`); `emptyRow` (`:255-259`) is the only id-based caller.
- **Effect:** About −4 lines.

###### M-15 • The `'dateTime'` Intent Duplicates `'picker'`

- **Sources:** A-F10, B §4. **Status:** Verified. **Code-Only.**
- **Evidence:** Both float mode `'picker'` (`ValueSeat.tsx:128-131`); the only difference is withholding `x`, because `PropertyPicker` passes `anchorX` unconditionally (`PropertyPicker.tsx:150`) though only option panes use it for origin (`:95`).
- **Change:** Pass `anchorX` only for option panes; merge the intent.
- **Removes:** `valueClick.ts:13`, `:37-38`, `ValueSeat.tsx:130-131`, the assertion at `valueClick.test.ts:24`.

###### M-16 • `SeatHost`'s Knobs Are Real Differences; `connections?` Isn't

- **Sources:** A-F11, B-F11. **Status:** Verified (knob table); `connections` Likely. **Code-Only.**
- **Evidence:** `centered` cards only (`CardsView.tsx:202`), `clear` panel only (`PropertyPanel.tsx:88`), `onClose` MenuSeat only (`ValueSeat.tsx:336`), `hold` table+cards, `hide` cards (`view`) + panel (`row`), `setStyle` views via `seatHost` (`useViewHost.ts:212`). `connections?` (`ValueSeat.tsx:42`) is supplied by all four hosts; `ValueContext.connections` is typed optional (`Core/Properties/valueContext.ts:19`) but `useValueContext` always sets it (`:45`).
- **Change:** Tighten `connections` to required in both types if no other `ValueContext` builder omits it (**Unverified:** grep every `ValueContext` construction, including `Core/Testing`). After M-11, `onClose` remains MenuSeat's only.

##### Value Panes

###### M-17 • `MassPropertyPicker` Is the Options Pane With Many Values — and Opens in a Different Spot

- **Sources:** A-F9, B-F10, E-7, C14 (part). **Status:** Verified; placement divergence added here. **Visible** (placement).
- **Evidence:** `pickOver(target.pick, currents, …)` + `PropertyOptionRows editable` in `PickerMenu solid` (`MassPropertyPicker.tsx:22-33`) versus the same with `[t.current]` (`PropertyPicker.tsx:97-115`). It borrows `seat.target(rows[0], col)` for column, style, and contextOptions (`TableView.tsx:205-207`). The single table picker opens `origin='right'` (no `anchorX`, `PropertyPicker.tsx:95`); the mass picker passes no origin, so `'auto'` (`MassPropertyPicker.tsx:24`, default at `PickerMenu.tsx:84`).
- **Change:** The options target carries `currents[]`; the one picker serves the sweep.
- **Removes:** `MassPropertyPicker.tsx` (35 lines) and its import; `TableView.tsx:209-225` rewires. About −30 net.

###### M-18 • The Space-Chip Choice Is Written Twice

- **Sources:** A-F12. **Status:** Verified; merge Likely. **Code-Only.**
- **Evidence:** `contextOptions ? <NeutralChip …> : <OptionChip …>` at `PropertyPicker.tsx:224-228` and `Core/Views/Settings/FilterFrame.tsx:159-173`; `Cell.tsx:96-114` draws a Space as `NeutralChip` in its own `context` arm.
- **Change:** `OptionChip` draws `type === 'context'` as the neutral chip; both ternaries go. About −12 lines; crosses into Cells and Views.

###### M-19 • `PickOption.value` Re-Keys `SelectOption.id`

- **Sources:** A-F13. **Status:** Verified. **Code-Only.**
- **Evidence:** `pickGroups` maps `{ ...o, value: o.id }` (`Core/Properties/Pickers/pickModel.ts:13`); `EditableOptionRows` walks `optionGroupsOf(def)` again (`PropertyPicker.tsx:275-276`) beside the groups already built (`:204`).
- **Change:** One identity key. Low priority; touches `PickOption` (`properties.ts`) and `contextOptions.ts`.

###### M-20 • `FieldPicker` Hosted Mode and `TextPane` Are One Shell

- **Sources:** C14. **Status:** Verified (shells); merge Likely. **Code-Only.**
- **Evidence:** Both are `PickerMenu direction="down" origin="center"` with a content class (`UIX/Pickers/FieldPicker.tsx:36-42`, `Core/Properties/Pickers/TextPane.tsx:33-40`); `direction="down"` is the default (`PickerMenu.tsx:83`). TextPane adds save-on-close and a close button.
- **Change:** TextPane hosts its editor in `FieldPicker`'s hosted mode with its own content class. Small; optional.

###### M-21 • `CalendarPicker` Hand-Rolls Two Pick-One Dropdowns

- **Sources:** C7. **Status:** Corrected (line numbers); route change is Ruling R-9. **Visible** if changed.
- **Evidence:** Month/year `PickerMenu` at `CalendarPicker.tsx:415-429`, hour/minute at `:535-548` (`direction="up"` `:537`), each with `anchorOf` (`:35-39`), `DROPDOWN_MAX_HEIGHT` 136 (`:30`), and both `triggerRef` and a point anchor. `PickerControl` lists go through the door (`PickerControl.tsx:110-123`) and honor `nativeMenus` (`menuActions.ts:12`); these don't.
- **Cost of routing through the door:** the lists would turn native under Use Native Menus, lose the upward clock list (the presenter has no `direction`), grow from 136 to 240, and inherit I-027's single-pane flaw (M-25).

##### The Kit and Drill Mechanics

###### M-22 • The Chooser's Layout Is Off the Canonical Drill Shape

- **Sources:** C1, E-5, D-F15 (part), D-F1 (glyph part). **Status:** Verified; Corrected ("only" claim). **Visible.**
- **Evidence:** Root rows sit in a bare `<div>` with no scroll frame or cap (`PropertyPicker.tsx:161-165`), and `PickerMenu`'s pane has no height ceiling of its own (`picker-base.css.ts:27-41`); `FrameSlide` says a slot needing a ceiling wraps in `MenuScrollFrame` (`FrameSlide.tsx:9`). The back bar sits in a bare `<div>` above the pane with `className={chooserTop}` (`PropertyPicker.tsx:170-176`), `chooserTop` zeroing `--row-pad-y` (`Core/Properties/Pickers/property-picker.css.ts:4`) — the only user of `MenuTopRow.className` (`MenuRows.tsx:35,51`; grep of all `<MenuTopRow` sites). Entry glyphs are `size="body"` (`PropertyPicker.tsx:129`) where `MenuPresenter` uses `control` (`MenuPresenter.tsx:13-15`). `minHeight={0}` (`PropertyPicker.tsx:156`) is Likely a no-op: it lands on the slot (`FrameSlide.tsx:83`), which is `flex: '0 0 auto'` and never shrinks (`UIX/Menus/frame-slide.css.ts:24`).
- **Correction:** the chooser isn't the only bar outside a `MenuScrollFrame` header — `PropertyFrame`'s type picker seats one in a fragment (`Core/Properties/Schema/PropertyFrame.tsx:256-258`). It is the only restyled one.
- **Change:** Root rows in `MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT}`; the back bar as the detail's `header`, as `Level` does (`MenuPresenter.tsx:61-65`). Ruling R-8.
- **Removes:** `chooserTop`, `MenuTopRow.className`, `minHeight={0}`. `property-picker.css.ts` keeps `emptyPane` (`OptionGroups` uses it, `PropertyPicker.tsx:245`).

###### M-23 • A Shared Drill Component Doesn't Earn Its Place (Tension A)

- **Sources:** C2 versus D-F1 / D §3-A, B-F13, E-8. **Status:** Verified — C's position holds. **Code-Only.**
- **Evidence:** Of D's eight hand-wirings, six are settings frames outside the boundary (decision 9), and their back bars live inside each *child* frame's `MenuScrollFrame header` with its own footer and ceiling (`GroupFrame.tsx:228`, `SortFrame.tsx:111`, `FilterFrame.tsx:494`, `VisibilityFrame.tsx:122`, `PropertyFrame.tsx:315-331`, `LayoutFrame.tsx:249`), not at the `FrameSlide` site. Each site's drill wiring is ~3 lines because `FrameSlide` already holds `detail` (`FrameSlide.tsx:42-44`). `Level`'s leaves resolve strings (`MenuPresenter.tsx:48`); the chooser's leaves are live value panes, so sharing `Level` would grow it.
- **Ruling on evidence:** no `DrillPane`. The chooser adopts `Level`'s layout (M-22). D's four drill-row glyph recipes (D-F1) are a real adjacent divergence for settings frames, not picker work.

###### M-24 • `anchorX` Carries Two Meanings, and the DEV Guard Keys on It

- **Sources:** C6. **Status:** Verified (semantics); guard scope Likely unintended. **Code-Only.**
- **Evidence:** With `anchorY`, `anchorX` makes a point anchor (`PickerMenu.tsx:187-197`); alone it moves only the horizontal center (`:203`). The guard skips whenever mount-time `anchorX` is defined (`:137`), and its comment names only pinned glances (`:136`), yet `PropertyPicker`, `CalendarPicker`'s lists, `caretPane`, and `MenuPresenter`'s `at` menus all pass it. This is what masks M-2 on cards.
- **Change:** Key the guard on what unmounts by design (`enter={false}` / `onExited`, the pinned-glance contract). Collapsing the three anchor props into one is optional churn.

###### M-25 • I-027 Holds; It Sits Beside the Picker and Shapes Its Lifetime Rule

- **Sources:** C3, E §4. **Status:** Verified; footnote Corrected. **Visible.**
- **Evidence:** One `PickerMenu` in `MenuPresenter` (`MenuPresenter.tsx:98`); `presentMenu` settles and replaces in one tick (`chromeSlice.ts:63-71`). Stale citations in `[^27]` (`.claude/IssuesPM.md:1283`): `MenuPresenter.tsx:84-103` → `:85-117`, `menuActions.ts:20-23` → `:23-26`, `chromeSlice.ts:62-70` → `:63-71`, `PickerControl.tsx:91-114` → `:100-124`. It reaches the picker through `OptionEditPopup`'s `PickerControl` (option editing inside a value pane) and would reach it through M-21 if the calendar lists took the door.
- **Bearing:** M-2's fast-reopen case is the seat's own form of I-027 (a remount cuts the exit short; a shared shell would jump instead). I-027's Option A (a press that closes a list only closes it, via `suppressReleaseClick`) is the smaller fix and adds no mechanism; Option B (one pane per request until `onExited`) would answer both cases but adds a held list of panes to `MenuPresenter` and the seat. Option 1 doesn't depend on either. Ruling R-10.

###### M-26 • I-042 Holds; Its Solution Names a Setter That's Gone

- **Sources:** C4, E-17 (part). **Status:** Verified; E's "footnote stale" Corrected. **Code-Only.**
- **Evidence:** `measure` is `PickerMenu.tsx:201-244` inside the effect `:184-277`; placement also spans the size observer `:170-182`, the re-decide `:280-286`, and the render-phase reset `:165-168`; `measure` calls out to `placeResize` (`:216`). The Solution's `setEffDir` (`IssuesPM.md`, I-042 Solution) no longer exists. `[^42]`'s `:184-277` and `:279-286` still match.
- **Effect:** Structural; about net 0 to +10. Not a removal; independent of the picker. D-F11 (`MatrixLabel` restating the placement rule) would share the extracted function — Speculative.

###### M-27 • I-051 Holds; It's Not Picker Work

- **Sources:** C5. **Status:** Verified. **Visible** if acted on.
- **Evidence:** `MenuItem`'s caption has no measure (`MenuRows.tsx:163`), `menu-row.css.ts:214` no `maxWidth`; the issue is the property *schema* pane and is marked Deferred. In scope only if the cleanup settles one pane-width ceiling rule for `FrameSlide` users.

###### M-28 • UIX/Pickers and UIX/Menus Import Each Other

- **Sources:** C11. **Status:** Verified. **Code-Only.**
- **Evidence:** Pickers → Menus: `PickerMenu.tsx:21`, `picker-base.css.ts:4-5`, `CalendarPicker.tsx`; Menus → Pickers: `ManageRow.tsx:3`, `MenuIndex.tsx:7`. Height ceilings in four files: 240 (`picker-base.css.ts:8`), 320 (`menu-row.css.ts:302`), 440 (`frames.css.ts:130`), 136 (`CalendarPicker.tsx:30`). Width 120 at `MenuPresenter.tsx:58` and `PropertyPicker.tsx:155`.
- **Effect:** Folder consolidation moves lines rather than removing them (~70 files touched). Adjacent; sequence separately.

###### M-29 • The `UIX/Menus` Barrel Is Half-Used

- **Sources:** C13, D-F15. **Status:** Verified. **Code-Only.**
- **Evidence:** `MenuPresenter.tsx:5-6` imports `FrameSlide` by path and `MenuItem` via the barrel on adjacent lines; `PropertyPicker.tsx:20-31` does the same. The barrel omits `FrameSlide`, `ManageRow`, `InlineEditHeader`, `paneDrop`, `useListEdit`, `menuAnchor`, `frameGrowth`; `UIX/Pickers` has none.
- **Change:** Pick one rule repo-wide. Adjacent.

###### M-30 • UIX Holds Core-Only Styles

- **Sources:** C12. **Status:** Verified (`treePane` → `LocationField` only; `frames.css.ts` consumed mainly by `Core/Properties/Schema` and `Core/Views/Settings`). **Code-Only.** Adjacent; none is picker code.

###### M-31 • `menuRows.ts` Is a 10-Line File

- **Sources:** C10. **Status:** Verified (`Core/Interface/Menus/menuRows.ts`, one production caller `MenuPresenter.tsx:11,31`; imported by `Desktop/Actions/menu.test.ts` for native/in-app parity). **Code-Only.** Keeping the file buys the parity test a seam; folding it costs that seam. Adjacent; no recommendation either way.

##### Adjacent Consumers (Outside the One Picker by Decision 9)

Listed so the plan can bundle or defer them knowingly; none is required by the picker work.

- **M-32 • Settings Ceilings Depend on the Route (D-F3).** Verified. `LayoutFrame.tsx:207-213` passes 440 to `VisibilityFrame`; `SettingsFrame.tsx:167-173` passes nothing, so 320 (`MenuRows.tsx:404`). **Visible.**
- **M-33 • Pane Floors Use Two Constants (D-F14).** Verified. `PANE_MIN_W/H` 225×245 at four slides; `ViewFrame.tsx:41,223-224` uses `PANE_SQUARE` 225×225. **Visible** (20px).
- **M-34 • LayoutFrame's Flat Mode Mounts an Inert Slide (D-F9).** Verified. `setFrame` is reachable only in the `'full'` branch (`LayoutFrame.tsx:258-270`); `SettingsFrame.tsx:181-183` uses `'flat'` and passes `onClose={back}` beside `onBack={back}`. **Code-Only.**
- **M-35 • ViewFrame's Icon Picker Isn't Anchored to the Row (D-F4).** Verified in code. `ColorPicker` gets `triggerRef={menuAnchorRef}` (`ViewFrame.tsx:242`); `IconChoice` gets none (`:226-233`); `ViewTile.tsx` passes it to both. One-line fix. **Visible** (not run).
- **M-36 • ViewItemMenu Hand-Rolls an Action Menu (D-F5).** Verified. `ViewItemMenu.tsx:20-62` builds `PickerMenu solid` + two rows that `popMenu(items, trigger, {solid})` already renders; its handlers repeat `ViewFrame.tsx:104,106`. Moving it makes it native under Use Native Menus. **Visible.** About −30.
- **M-37 • Identity Editors Wired Several Times (D-F6, D-F7).** Likely. Row-menu → icon/color at `ViewFrame`, `ViewTile`, `SpaceMenu`; header + `IconChoice` at `SettingsFrame`, `PageMenu`, `SpaceMenu`, `PropertyFrame`. Biggest pure deletion in D's domain; not metadata.
- **M-38 • FilterFrame's Local `FieldPicker` Shadows the Kit's (D-F10).** Verified (`FilterFrame.tsx:62` vs `UIX/Pickers/FieldPicker.tsx`). Rename. **Code-Only.**
- **M-39 • Back-Bar Inputs Have Four Signatures (D-F2, code part only).** Verified: required `label`+`onBack` (`GroupFrame`, `SortFrame`), defaulted `label` + `current?` (`VisibilityFrame.tsx:80-93`), `back?: {label, onBack}` (`FilterFrame.tsx:219`, re-wrapped at `ViewLeaf.tsx:47`), hard-coded. **Code-Only.** D's "title from the opening row" proposal is withdrawn (§4).
- **M-40 • Dismiss Prop Has Two Names (D-F15).** Verified: `IconPicker`'s `onClose` (`IconPicker.tsx:25`) beside `onDismiss` elsewhere. **Code-Only.**

##### Docs

###### M-41 • The Value Picker's Feature Doc Describes What the Code Doesn't Do

- **Sources:** A-F15, B-F16, E-16, E-17. **Status:** Verified; B-F16's `ViewTypesPM` reading Corrected. **Code-Only** (docs).
- **Evidence:** `PropertiesPM.md:115` names `PropertyPicker.tsx` as the one control including "the operating system's file dialog for File" — File runs from the seat through `filePick` (`ValueSeat.tsx:122-127`; the File pane left in `7536e67e9`); fields come from `PropertyValueInput`; "drills straight into its value" holds only for card option kinds; "the page window's SidePane, the Properties panel" double-counts (the SidePane *is* the panel, `:117`); the seat, `MenuSeat`, and the table's mass pick appear in no Features doc. `:119` omits option-kinds-first. `ViewTypesPM.md:122` omits the stamps (M-7); its reveal sentence is about the add-picker and is accurate — the menu-path contradiction (M-11) is with the comment at `CardsView.tsx:193`, not the doc. `[^27]` is stale (M-25); `[^42]` isn't (M-26). `PommoraUIX.md`'s claims (E-17) are **Unverified** here — open `PommoraUIX.md:357-380` and `InteractionPM.md:48` before rewriting.
- **Change:** Rewrite *§The Value Picker* around the one seat once the restructure lands.

##### Tests

###### M-42 • Chooser Tests Pin Prop Plumbing

- **Sources:** A-F16, E-12. **Status:** Verified. **Code-Only.**
- **Evidence:** `PropertyPicker.pane.test.tsx:150-249` drives `chooser`/`resolveTarget`/`onReveal`/`revealOnly`/`drillable` directly, with a hand-rolled remount (`:184-187`). Its title "a dependent entry hands back without dismissing (its caller reopens on this mount)" (`:171`) asserts a same-mount reopen the seat contradicts (M-2: the key changes). Integration pins exist at `cardGestures.test.tsx:268-320`.
- **Change:** Delete with M-1; pin "an option or date entry slides under ‹ Group · Name" and "a typed entry opens away" once at the picker level.

###### M-43 • Two Behaviors a Restructure Will Trip On Are Unpinned

- **Sources:** E-13, plus this reconciliation. **Status:** Verified. **Code-Only.**
- **Evidence:** No panel case picks a chooser entry (`PropertyPanel.test.tsx:446-495` pins only the Add row's held wash). No case pins the picker's per-value freshness (a second Date shows its own date, M-2); only the popover's remount is pinned (`ValueSeat.test.tsx:259`).
- **Change:** Write both pins *before* the restructure.

###### M-44 • Misfiled and Overlapping Tests

- **Sources:** E-11, B-F14, E-15, E-10, E-14. **Status:** Verified. **Code-Only.**
- **Evidence:** `cellGestures.test.tsx:564-628` mounts `PropertyPicker` directly (import `:10`), overlapping `PropertyPicker.pane.test.tsx` and `pickModel.test.ts`. `cardColumns.test.ts:13,18-60` tests `parseEditorValue` (no `Core/Properties/parseEditorValue.test.ts` exists). The live-option fix is pinned three times (`ValueSeat.test.tsx:125,302`, `cardGestures.test.tsx:155`). Portal query helpers are re-rolled per suite (`PropertyPicker.pane.test.tsx:66,100-105`, `ValueSeat.test.tsx:97`, `cardGestures.test.tsx:83`, `cellGestures.test.tsx:202`).
- **Change:** Move the one non-overlapping direct-mount assertion into the picker suite and delete the rest; move `parseEditorValue` tests beside their module; keep one live-option pin at the seat plus one integration pin.

##### Placement and Naming

###### M-45 • File Placement Doesn't Match Responsibility

- **Sources:** A-F14, A §3-D. **Status:** Verified. **Code-Only.**
- **Evidence:** `ValueSeat.tsx` lives in `Cells/` but seats the panel and the App-level `MenuSeat` (`App.tsx:29`). `valueClick.ts`'s only importer is `ValueSeat.tsx:31`. `text-pane.css` holds `.value-field*` for `ValueEditor`'s one-line mode, which imports it (`ValueEditor.tsx:23`). `dateFormFor` lives in `DateTimeValuePicker.tsx` and is imported by `FilterFrame.tsx:32`.
- **Change:** One `Core/Properties/MetadataPicker/` home for the seat, intents, picker, option rows, and typed inputs; `Cells/` stays display-only; `valueClick.ts` folds into the seat file.

###### M-46 • "Picked" Means Three Things

- **Sources:** A §4. **Status:** Verified. **Code-Only.** `ValueSeat`'s last picker open (`ValueSeat.tsx:270`), the drilled entry (`PropertyPicker.tsx:87`), and override values (`PropertyPanel.tsx:150,167`). Two go with M-1 and M-6.

---

#### 3. Rejected

- **A-F8 / E-8 merge of `PickEntry` with `ActionItem` or sharing `Level`:** `Level` resolves string leaves (`MenuPresenter.tsx:48`); the chooser's leaves are live value panes. Shape overlap is real; a merge adds mechanism (M-23).
- **A §4 "keying exists so options-created-while-open stay live (`ValueSeat.test.tsx:125`)":** that test depends on `columnOf` read each render (`ValueSeat.tsx:36,272`), not the key. The key exists for per-value calendar freshness (M-2).
- **A-F16 / A §4 "the remount key must be re-pinned":** there's no pin to re-pin (M-43).
- **E-6 "Date leaving the chooser was intended on 09-06":** `09-06…md:634` is the agent's outcome awaiting confirmation.
- **E-5 / C1 "the chooser is the only `MenuTopRow` outside a `MenuScrollFrame` header":** `PropertyFrame.tsx:256-258` is another (M-22).
- **B-F1 "the card's union is just `contextIds`":** it's all Contexts ∪ schema ∪ unshown stamps (M-7).
- **B-F16 "`ViewTypesPM.md:122` claims card values reveal on commit":** the sentence covers the add-picker only (M-41).
- **C8 "un-export `MenuDoor`":** three test files import the type (`PropertyFrame.test.tsx:20`, `MatrixMenu.test.tsx:5`, `PickerControl.typeable.test.tsx:5`).
- **C9 "`pendingPick` should be the only way a request reaches the picker, including the card chooser":** cards and the panel own seats with host policy (`commitOnCard`, `setStyle`, `centered`, `hide`); routing through the global slot is what loses that policy today (M-11).
- **D §3 "one request slot as a union over kinds; remove `pendingPick` as separate; remove `MenuSeat`'s App mount":** contradicts decision 9, and sidebar/Matrix/band have no seat (`entityMenuActions.ts:45-77`), so an App-level seat is required.
- **D §3 "the kit-level hold retires `ValueSeat`'s `last` ref":** the ref also drives the key and late commits (M-6).
- **D-F2 title mismatch (Group/Grouping, Sort/Sorting, Filter/Filtering):** a deliberate earlier decision (§4).
- **D-F1 / D §3-A shared `DrillPane`:** removes ~1-2 lines per site at the cost of a new kit concept; the settings back bars live in child frames (M-23).
- **E §3-A estimate "−200 to −300 production lines":** counts whole files that partly survive (`propertyRows.ts`'s `prop:` encoding, `property-picker.css.ts`'s `emptyPane`) and doesn't net out what the seat gains. See §5.
- **E-17 "`[^42]` is stale":** its ranges still match (M-26).
- **Out of boundary, true but not taken:** C10's Desktop empty-template guard (`Desktop/Actions/menu.ts:52`) is a ghost guard — `popMenu` returns on empty (`menuActions.ts:11`) and is the channel's only sender — but it's Desktop menu code, not picker code.

---

#### 4. Separations That Should Stay

- **Three writers ending in `assignValue`** (view, panel, `oneShotWriter`): each surface's override state differs.
- **`hide: 'view'` vs `hide: 'row'`, panel-only `clear`, panel `style: () => null`** (`ValueSeat.tsx:43` documents why): real surface differences.
- **`MenuSeat` as an App-level seat for entity menus:** a native leaf can't drill into an in-app frame, so the pane opens after the menu closes, and sidebar/Matrix/band have no seat. Its *component* shrinks (M-4, M-12); its existence stays.
- **`presentMenu` and `requestPick` as two channels:** action menus aren't the metadata picker (decision 9); the pick channel has no native form.
- **`MenuPresenter.Level` and the chooser as separate components:** string leaves versus live panes (M-23).
- **`MenuDoor` restating the leaf row in UIX:** forced by "UIX reaches nothing outside itself."
- **`useOptionEdit` shared by the picker and `OptionEditor`; `ValueEditor` as one editor with two modes; `filePick` beside the pure `valueClickIntent`** (`filePick.ts:1`).
- **`PropertyOptionRows` exported for `FilterFrame`'s `ChipsField`** (`FilterFrame.tsx:181`): pick-only operands, correctly shared.
- **The native menu's Check/Uncheck versus a click's toggle** (`propertyMenuActions.ts:16-19`): platform-shaped.
- **The native menu listing every property, shown or not:** it sets values rather than adding them.
- **No add chooser on the Table:** its columns are view-level.
- **Text staying a popover from any chooser:** `TextPane` is 480px wide (`text-pane.css:3`) and doesn't fit a slide frame — an exception that carries its reason (pending R-1).
- **The toolbar's settings dropdown lifecycle** (D-F13; `MenuDropdown.tsx:7` documents the shared dismiss region), **caret panes, Glance, and Info:** different focus and lifecycle contracts.
- **The picker group label "Spaces" and the panel heading "Contexts":** each intended (decision 4).
- **Settings pane titles that differ from their rows** — Group/Grouping (`GroupFrame.tsx:228`), Sort/Sorting (`SortFrame.tsx:111`), Filter/Filtering (`FilterFrame.tsx:494`): an earlier deliberate decision of Nathan's.

---

#### 5. Approaches

##### Option 1 — The Chooser Is the Seat's Root Level (Recommended)

`ValueSeat` owns one pane per request with two entry depths: a list entry (card or panel Add) opens at the root level; a value entry (click, menu leaf) opens at the value level with no root. Choosing an option or date entry is a seat open rendered as the `FrameSlide` detail under the canonical back bar; a typed entry opens away (cards) or edits in its row (panel); Checkbox commits; File opens its dialog.

- **Removes:** all of M-1; M-2's hand-back and `drillable`; M-4's two copies and the public `run`/`intentOf`; M-5's `AddPickerRequest`, `addableFor`, `addPicker` state, anchor pokes; the panel's `hidden()` mapping and, for list and date kinds, the rAF (M-3); `chooserTop` and `MenuTopRow.className` (M-22); two of three exit holds (M-6).
- **Adds:** `openChooser` and `openAway` on the seat, chooser state on `SeatOpen`, and a per-request key in place of the `rowId:columnId` key — roughly +20 to +30 lines.
- **Pairs with:** M-11 (views use their own seat for title-menu picks), M-12, M-15, M-17, and M-7's builder as an independent precursor.
- **Cost:** the panel's reveal moves to "on pick" for list and date kinds (R-4). The shell is keyed per request (M-2), so a second request opened mid-exit still cuts the first short, as today; fixing that is I-027's Option B and not part of this option.

##### Option 2 — Keep the Mode, Fix the Seams (E §3-B)

Keep `PropertyPicker`'s chooser mode; collapse the booleans into one outcome union, add `openAway`, move the back bar into the header, merge the builders.

- **Removes:** about half of Option 1's list. **Leaves:** the prop-switched mode, `resolveTarget`'s second target path, the dual commit, the hand-back remount. Fails *Reads as Designed*.

##### Option 3 — The Chooser Becomes a Trigger-Anchored Menu (Rejected)

Card and panel Add pop `propertyMenuBranches` through `popMenu(items, trigger)`; leaves call the pick route. One builder, no chooser mode.

- **Why not:** option lists become plain action rows (no chips, no New Option, no reordering), the list turns into an OS menu under Use Native Menus (`menuActions.ts:12`), and metadata enters `MenuPresenter` against decision 9.

##### Recommendation

Option 1, sequenced: (1) the two pins from M-43; (2) M-7's builder; (3) Option 1 with M-4, M-5, M-12, M-15, M-22; (4) M-11; (5) M-17; (6) M-9, M-14; (7) placement (M-45) and docs (M-41) last, so files move once.

**Estimate (Speculative until drafted; built from §7):**

| Piece | Gross Removed | Added Back | Net |
|---|---|---|---|
| Option 1 core (M-1, M-2, M-4, M-5, M-6, M-22) | ~110 | ~30-40 | ~−70 to −80 |
| Entry builder (M-7, M-8) | ~55 | ~30 | ~−20 to −30 |
| Mass pick fold (M-17) | ~38 | ~5 | ~−30 |
| M-9, M-12, M-14, M-15 | ~22 | ~2 | ~−20 |
| M-11 route | ~5 | ~5 | ~0 |
| **Production total** | | | **~−140 to −160** |
| Tests (M-42, M-44) | ~200 | ~60-80 | ~−120 to −140 |

Against the scouts: A's −50 to −70 covers only the core; E's −200 to −300 double-counts surviving files; B gave none for the whole.

---

#### 6. Rulings for Nathan

Each asks about something you'd see or decide; the recommendation is mine.

- **R-1 • One Add Behavior:** On a card, picking a list property (like Stage) from **Add** slides into its choices inside the same little window, with a "‹ Properties · Stage" back arrow. In a page's Properties panel, the same pick closes the Add window and opens a second window at the row. Should both slide? **Recommend:** yes, for list properties and dates. Text, numbers, and links keep editing right in the panel's row, since the panel has a row and a card doesn't.
- **R-2 • Dates Slide Too:** Picking a date from a card's Add today closes Add and pops a separate calendar with no back arrow. **Recommend:** the calendar slides in under a back arrow, like a list does.
- **R-3 • What the Arrow on an Add Row Means:** Checkbox, File, Text, Number, and Link rows show a "›" arrow even though nothing slides — a checkbox just checks. **Recommend:** the arrow appears only on rows that slide.
- **R-4 • An Abandoned Add in the Panel:** Today, choosing a date from the panel's Add and then cancelling still leaves an empty row on the panel. **Recommend:** a list or date row appears once you pick a value (as cards do); text, number, and link rows still appear immediately, since you type into them.
- **R-5 • Right-Click Values on Cards:** Setting a value through a card's right-click **Properties ▸** doesn't make a hidden property appear on the card (Add does), and the window it opens can't change how options look (a click-opened one can). **Recommend:** the right-click route behaves exactly like a click on that card.
- **R-6 • One Order for Spaces and Properties:** The same lists appear in three orders — the panel uses the order you drag them into, right-click menus use the Nexus's stored order with list properties first, and a card's Add puts fillable ones first. One catch: a card's Add also lists properties that already hold a value but are hidden on that card — choosing one only shows it — and "fillable first" is what keeps those at the bottom. **Recommend:** your panel order for Spaces and the Collection's order for Properties, everywhere, with one stated exception: on a card, the already-filled rows stay last, since they show something rather than add it.
- **R-7 • Created and Modified in a Card's Add:** A card's Add lists Created and Modified (choosing one shows it on the card); the panel and menus don't. The view's Visibility settings also do this. **Recommend:** keep them in the card's Add and say so in the docs, or drop them and leave it to Visibility — your preference; I lean keep.
- **R-8 • The Add Window's Look:** Its back arrow sits tighter and its icons are a size larger than every other menu, and a long list grows without scrolling. **Recommend:** match every other menu, with the same scrolling height limit.
- **R-9 • The Calendar's Month, Year, Hour, and Minute Lists:** These could become the app's standard dropdown, which would turn them into Mac menus when **Use Native Menus** is on, open the hour list downward instead of upward, and make the lists taller. **Recommend:** leave them as they are.
- **R-10 • I-027's Open Question:** When a dropdown list is open inside a settings window and you click a different dropdown, should that click only close the first list, or also open the second? **Recommend:** only close it — that matches the toolbar's settings today, and every pop-up then closes fully before another opens.
- **R-11 • Multi-Row Picks Open in a Different Spot:** Picking for several table rows at once opens its window centered when it fits; one row's opens right-aligned. **Recommend:** one placement for both.
- **R-12 • The Old Restructure Plan:** The written reasoning behind the 10-21-2026 Properties Restructure exists only in NexusOS's trash (`~/NexusOS/.trash/Properties Restructure — *.md`, ten files). **Recommend:** keep *Decisions & Intention* by moving it into `.claude/Planning/` before trash is emptied; let the rest go.

---

#### 7. Removal Inventory

##### Removed or Merged — Production

| Item | Location | By |
|---|---|---|
| `PickEntry.revealOnly`, `.drillable`; optional `group?` | `Core/Properties/Pickers/PropertyPicker.tsx:60-62` | M-1, M-2 |
| `chooser`, `onReveal`, `resolveTarget` props; `onCommit`'s `entry` param | `PropertyPicker.tsx:67,72,74,77,81-82,84` | M-1 |
| `picked` state + reset effect; `t`/`commit` dual | `PropertyPicker.tsx:87-93` | M-1 |
| `origin={chooser ? 'auto' : origin}` | `PropertyPicker.tsx:149` | M-1 |
| Chooser `FrameSlide` branch, bare root `<div>`, `minHeight={0}`, `?? 'Properties'`, `className={chooserTop}` (rewritten as the seat's root level) | `PropertyPicker.tsx:126-141,152-184` | M-1, M-22 |
| `chooserTop` + its `topRow` import | `Core/Properties/Pickers/property-picker.css.ts:2,4` | M-22 |
| `MenuTopRow`'s `className` prop | `UIX/Menus/MenuRows.tsx:35,51` | M-22 |
| `useHeld(target, open)` in the picker | `PropertyPicker.tsx:86` | M-6 |
| `SeatChooser` type; `chooser` prop | `Core/Properties/Cells/ValueSeat.tsx:251-257,262,265` | M-1 |
| `!chooser &&` gate; `chooser`/`resolveTarget` lambda; `chooser != null`; dual `onCommit`; `chooser?.onReveal` / `onDismiss` | `ValueSeat.tsx:279-305` | M-1 |
| Public `intentOf`, `run` (become internal behind `openAway`) | `ValueSeat.tsx:248` | M-4 |
| `'dateTime'` arm | `ValueSeat.tsx:130-131` | M-15 |
| MenuSeat `columnOf` branch → one `resolveColumn` | `ValueSeat.tsx:323-327` | M-12 |
| MenuSeat effect's intent mapping (→ `openAway`) | `ValueSeat.tsx:342-348` | M-4 |
| `'dateTime'` intent member and case | `Core/Properties/Pickers/valueClick.ts:13,37-38` | M-15 |
| `AddPickerRequest` | `Core/Views/Cards/CardsView.tsx:76-79` | M-5 |
| `CardApi.openAddPicker` (→ seat), `CardApi.addableFor` | `CardsView.tsx:97,101,275-278,282` | M-5 |
| `addPicker` state, orphan effect, `addRow`/`addEntries` | `CardsView.tsx:162,218-225` | M-5 |
| `addPicker !== null` ghost check | `CardsView.tsx:177` | M-5 |
| Chooser `PickEntry` mapping + hand-back `onReveal` | `CardsView.tsx:476-506` | M-1, M-2, M-4 |
| Zone-click gate on `addableFor` | `CardsView.tsx:914` | M-5 |
| `addEntriesFor` union, `AddEntry`, `orderAddableEntries` (→ one builder) | `Core/Views/Cards/cardColumns.ts:31-69` | M-7 |
| `Field` type, `fields`/`hidden()` derivation (→ builder) | `Core/Properties/PropertyPanel.tsx:42,164-186` | M-7 |
| Anchor poke | `PropertyPanel.tsx:189` | M-5 |
| `revealAndEdit`'s rAF hand-off (for list and date kinds) | `PropertyPanel.tsx:260-269` | M-3 |
| `chooser` prop object | `PropertyPanel.tsx:405-412` | M-1 |
| Second `commit(id, next)` | `PropertyPanel.tsx:159-162` | M-14 |
| Menu reordering line (→ builder order) | `Core/Interface/Menus/propertyMenuActions.ts:59-60` | M-7 |
| Direct `requestPick` call (→ `open` callback) | `propertyMenuActions.ts:89-97` | M-11 |
| `pageMetaMenuItems`' `spaces`/`properties` opts; callers' duplicate args; the card cast | `Core/Actions/pageMenu.ts:124-126`; `cardMenu.ts:20-22`; `cellMenu.ts:122-123`; `entityMenu.ts:49-50` | M-9 |
| `MassPropertyPicker.tsx` (file) and its import; table rewire | `Core/Properties/Pickers/MassPropertyPicker.tsx:1-35`; `Core/Views/Table/TableView.tsx:205-225` | M-17 |
| Space-chip ternaries | `PropertyPicker.tsx:224-228`; `Core/Views/Settings/FilterFrame.tsx:159-173` | M-18 |
| `connections?` optionality (if confirmed) | `ValueSeat.tsx:42`; `Core/Properties/valueContext.ts:19` | M-16 |
| `valueClick.ts` as a file (folds into the seat; `valueClick.test.ts` follows into the seat's test file) | `Core/Properties/Pickers/valueClick.ts`, `valueClick.test.ts` | M-45 |

##### Removed or Merged — Tests

| Item | Location | By |
|---|---|---|
| Four chooser-plumbing cases (rewritten as two behavior pins) | `Core/Properties/Pickers/PropertyPicker.pane.test.tsx:150-249` | M-42 |
| Direct-mount `PropertyPicker` blocks and import | `Core/Views/Table/cellGestures.test.tsx:10,564-628` | M-44 |
| `parseEditorValue` cases (move beside the module) | `Core/Views/Cards/cardColumns.test.ts:13,18-60` | M-44 |
| `'dateTime'` intent assertion | `Core/Properties/Pickers/valueClick.test.ts:24` | M-15 |
| One of three live-option pins | `ValueSeat.test.tsx:125` or `cardGestures.test.tsx:155` | M-44 |
| `MenuSeat` block (partial move under M-11/M-12) | `Core/Properties/Cells/ValueSeat.test.tsx:283-345` | M-11, M-12 |

##### Added (Each Justified by What It Removes)

- `seat.openChooser` and `seat.openAway`: replace two anchor pokes, three open-away copies, and the chooser prop path.
- One metadata entry builder: replaces three builders and three orders.
- Two test pins (M-43): required before the restructure.

##### Docs to Rewrite

`.claude/Features/PropertiesPM.md:115,119`; `.claude/Features/ViewTypesPM.md:122` (stamps); `.claude/IssuesPM.md:1283` (`[^27]`) and I-042's Solution text (`setEffDir`).
