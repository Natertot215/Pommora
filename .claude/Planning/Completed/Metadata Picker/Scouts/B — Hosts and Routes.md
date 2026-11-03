### Scout B — The Hosts and the Routes In

**Baseline:** `69db9942e` on `active`. All paths are repo-relative to `~/The Studio/Projects/Project Pommora`. Read-only; nothing launched.

#### Headline Facts

- **MenuPresenter Shows No Entity Management Today:** `popMenu` routes to the in-app presenter only when a trigger is passed and `nativeMenus` is off (`Core/Actions/menuActions.ts:12` — `if (!trigger || useSession.getState().devicePrefs.nativeMenus)` → system menu). The only callers passing a trigger are the tile menus (`Core/Tiles/TileHost.tsx:243`, `:301`). Every menu carrying **Spaces ▸ / Properties ▸** (`entityMenuActions.ts:64`, `CardsView.tsx:928`, `TableView.tsx:155`) calls `popMenu` without one, so those branches always render natively. The brief's "standing in for system menus when a menu opens from a button" describes the mechanism, but in practice it's the tile menus' presenter. Per Nathan's correction, MenuPresenter matters to this work only for the drill mechanics it shares (Finding 13).
- **Every Value Ends in One Terminal:** all commit routes converge on `assignValue` (`Core/Properties/assignValue.ts:100`) through one of three writers: the view writer (`useViewHost.ts:172-180`), the panel writer (`PropertyPanel.tsx:158`), and `oneShotWriter` for menus opened where no surface shows the row (`assignValue.ts:36`, `entityMenuActions.ts:67`). This split is correct and is the anchor any consolidation should keep.
- **Glance Holds Nothing in This Domain:** `Core/Interface/Glance/GlancePane.tsx` mounts `PickerMenu` (`:352`, `:413`) for its location pane only. It has no seat, value picker, or metadata rows.

---

#### 1. Map

##### Cards — `Core/Views/Cards/`

| Item | What It Does | Called From |
|---|---|---|
| `cardColumns.ts:14` `fillsBlank` | Type can fill a blank in place (everything except filedata) | `cardColumns.ts:55`, `CardsView.tsx:684` |
| `cardColumns.ts:17` `shownColumnsFor` | The columns a card draws (compact drops blanks unless `blankDraws`) | `cardColumns.ts:39`, `CardsView.tsx:764` |
| `cardColumns.ts:31` `addEntriesFor` | Card's addable entries: union of `hiddenListIds` + schema + view context columns, minus shown; sets `revealOnly` | `CardsView.tsx:224`, `:282` |
| `cardColumns.ts:61` `AddEntry` | `{column, name, revealOnly}` | `CardsView.tsx:101`, `cardColumns.ts` |
| `cardColumns.ts:67` `orderAddableEntries` | Fillable first, reveal-only last | `CardsView.tsx:224` |
| `CardsView.tsx:76` `AddPickerRequest` | `{rowId, anchor}` state for the open chooser | `:97`, `:162` |
| `CardsView.tsx:90` `CardApi` | Stable per-card gesture bag, including `openAddPicker`, `addableFor`, `titleMenuContext`, `titleAction` | `PageCard` `:904-955` |
| `CardsView.tsx:194` `commitOnCard` | Reveals the property in the view on a non-blank commit, then `host.commitValue` | seat host `:200`, `cardApi.commitValue` `:269` |
| `CardsView.tsx:198` `seat` | `useValueSeat({...host.seatHost, commit: commitOnCard, anchor, centered, hold, hide:'view'})` | `:270-273`, `:474` |
| `CardsView.tsx:222-225` `addRow` / `addEntries` | Builds the chooser's entries each render while open | `:476-504` |
| `CardsView.tsx:474-507` `<ValueSeat chooser>` | Maps `AddEntry`→`PickEntry` (icon, `drillable`, `group`) and defines `onReveal` | — |
| `CardsView.tsx:911-918` `openAdd` | Text-zone click: gates on `api.addableFor(row).length > 0`, then `openAddPicker` | `CardFace onZoneClick` `:975` |
| `CardsView.tsx:922-939` `onCardContextMenu` | Native card menu through `cardMenuModel` + `titleMenuContext`; answer goes to `titleAction` | `CardRoot` `:955` |

##### The Properties Panel — `Core/Properties/PropertyPanel.tsx`

| Item | What It Does | Called From |
|---|---|---|
| `:42` `Field` | `PaneTarget & {def}` | `:164-186` |
| `:44-47` `GROUPS` | Contexts / Properties with Add labels | `:314` |
| `:79-90` `seat` | Its own full `SeatHost` (`style: () => null`, `clear`, `hide:'row'`) | `:279-296`, `:403` |
| `:159-162` `commit(id, next)` | Re-resolves the column, then `assignValue` | Cell `:294`, `emptyRow` `:256` |
| `:164-182` `fields` / `shown` | All Contexts (ordered by `config.order.contexts`, then `spaceNode.rowOrder`) + schema; shown = held ∨ revealed | `:183-191`, `:314` |
| `:183-186` `hidden(key)` | Unshown fields → `PickEntry{revealOnly:true, drillable:false}` | `:408` |
| `:188-191` `openAdd` | Seats `seat.anchor`, sets `addOpen` | `:356`, `:372`, `:382` |
| `:260-269` `revealAndEdit` | Closes Add, reveals, then on the next frame `seat.run(...)` on the new row | `:409` |
| Hosts | `PageMenu.tsx:70` (dropdown), `SpaceMenu.tsx:103` (dropdown), `WindowTabBody.tsx:221` (side pane, passes `connections`) | — |

##### Table, Matrix, and Filters

| Item | What It Does | Called From |
|---|---|---|
| `TableView.tsx:95-99` `seat` | `{...host.seatHost, anchor: .data-cell, hold}`; no `hide`, no `centered` | `:111`, `:233-237`, `:378` |
| `TableView.tsx:148-159` `openTitleMenu` | Native title-cell menu → `runTitleAction` | `:233`, `:239` |
| `TableView.tsx:196-227` `massPicker` | Sweep → `MassPropertyPicker` built from `seat.target(rows[0], col)` | — |
| `Pickers/MassPropertyPicker.tsx:7-35` | `PickerMenu` + `pickOver(currents)` + `PropertyOptionRows editable` | `TableView.tsx:209` |
| `MatrixView.tsx:45-48`, `:82` | Reads global `pendingPick !== null` to hold the node label while `MenuSeat` is open | — |
| `FilterFrame.tsx:125-191` `ChipsField` | Its own `PickerMenu` + non-editable `PropertyOptionRows` for filter operands | `FilterFrame.tsx:362-369` |

##### The System-Menu Route

| Item | What It Does | Called From |
|---|---|---|
| `Actions/propertyRows.ts:3-13` `PropertyMenuOption` / `PropertyMenuRow` | Menu row model | `propertyMenuActions.ts`, `pageMenu.ts:32-33,125-126` |
| `propertyRows.ts:42` `propertyBranchRows` | Rows → `Spaces ▸` / `Properties ▸` `ActionItem`s (`prop:id[:value]`) | `pageMenu.ts:132`, `entityMenu.ts:88` |
| `propertyRows.ts:52` `parsePropertyAction` | Decodes `prop:` | `propertyMenuActions.ts:81` |
| `Interface/Menus/propertyMenuActions.ts:27` `propertyMenuBranches` | Every Context + whole schema → rows with checked options; checkbox gets Check/Uncheck | `useViewInteractions.tsx:400`, `entityMenuActions.ts:62` |
| `propertyMenuActions.ts:64` `runPropertyAction` | Option leaf → commit directly; bare leaf → `requestPick` | `useViewInteractions.tsx:408`, `entityMenuActions.ts:68` |
| `entityMenuActions.ts:45` `showEntityMenu` | Sidebar / Matrix / band: fetches the row, builds branches, commits through `oneShotWriter` | `Sidebar.tsx:82,263`, `MatrixView.tsx:70`, `GroupBand.tsx:167` |
| `Views/Host/useViewInteractions.tsx:395-402` `titleMenuContext` | Tabs state + move targets + `propertyMenuBranches` | `CardsView.tsx:280`, `TableView.tsx:155` |
| `useViewInteractions.tsx:405-435` `runTitleAction` | Page actions, then `runPropertyAction` with `commit: host.commitValue` | `CardsView.tsx:281`, `TableView.tsx:158` |
| `Actions/pageMenu.ts:119` `pageMetaMenuItems` | Page menu with property branches | `cardMenu.ts:17`, `cellMenu.ts:119`, `entityMenu.ts:45` |
| `Session/chromeSlice.ts:17-24,73-75` `ValuePickRequest` / `requestPick` / `dismissPick` | Global slot carrying closures (`rowOf`, `commit`) to `MenuSeat` | `propertyMenuActions.ts:90`, `ValueSeat.tsx:315` |
| `Properties/Cells/ValueSeat.tsx:313-353` `MenuSeat` | One app-level seat (`App.tsx:197`, beside `MenuPresenter` at `:196`) that runs the leaf's intent at the menu's trigger | — |

---

#### 2. Findings

##### F1 • Three Builders Answer "What Can This Item Hold," and They Disagree

**Category:** Parallel Definition · Inconsistency — **Confidence:** Verified

- **Card:** `cardColumns.ts:40-46` unions `hiddenListIds(view, ctx.schema, contextIds)` + `ctx.schema` + `columns.filter(kind==='context')`, minus shown. `hiddenListIds` adds Created/Modified stamps (`visibilityModel.ts:18`), so the card chooser lists them as reveal-only Properties.
- **Panel:** `PropertyPanel.tsx:164-165`: `contextPaneTargets(tree)` + `schemaTargets(schema, () => true)`; no stamps.
- **Menu:** `propertyMenuActions.ts:57-60`: `[...contexts.keys()]` + `schema`; no stamps, no shown/hidden filtering (correct for "set any").
- **Spaces Order Differs Three Ways:** the panel honors the user's panel order (`:174` `tree?.config.order.contexts`). The menu uses registry order (`:59`). The card puts view-hidden Contexts before view-shown ones (the order of the union at `cardColumns.ts:42-44`), then partitions by `revealOnly`. A user who reorders Contexts in the panel sees a different order under **Spaces ▸** and in the card chooser.
- **Properties Order Differs Three Ways:** the menu puts option-bearing rows first (`:60` `built.filter((r) => r.options)`). The card puts fillable rows first (`orderAddableEntries`, `cardColumns.ts:67-69`). The panel uses schema/`rowOrder` (`:177`).
- **The Card's Third Spread Is Redundant:** `hiddenListIds` already returns every non-shown Context, and the view's shown Contexts are exactly `columns.filter(kind==='context')`, so the union is just `contextIds` (`resolveColumns`, `Pipeline/columns.ts:37-50`, builds `columns` from `property_order` minus `hidden_properties`, the exact complement of `hiddenListIds`' Context test). Only the ordering side effect remains.
- **Label and Icon Have Two Derivations:** `columnLabel`/`columnIcon` (`columnDisplay.ts:6-18`, card and menu) versus `PaneTarget` (`paneTargets.ts:26-38`, panel). They agree today but are defined twice.
- **Remove/Merge:** one entry builder that returns `{column, label, icon, group, held}` per item in one canonical order; hosts filter it (card: unshown; panel: hidden; menu: all) and map it. This deletes the `addEntriesFor` union and `orderAddableEntries`, the panel's `fields`/`hidden()` derivation, and the ordering in `propertyMenuBranches`.
- **Effect:** about −40 to −60 lines, one concept instead of three. **Open for Nathan:** which order is canonical. The panel's `order.contexts` is the only user-authored one.

##### F2 • Four Row Models for One Row

**Category:** Parallel Definition — **Confidence:** Verified

- **The Four Models:**
  - `AddEntry` (`cardColumns.ts:61-65`) is mapped to `PickEntry` at `CardsView.tsx:480-489`.
  - `Field` (`PropertyPanel.tsx:42`, which is `PaneTarget + def`) is mapped to `PickEntry` at `:186`.
  - `PropertyMenuRow` + `PropertyMenuOption` (`propertyRows.ts:3-13`) are mapped to `ActionItem` at `:19-33`.
  - `PickEntry` itself (`PropertyPicker.tsx:56-63`).
- **`PickEntry` Carries Host-Computed Flags:**
  - **`drillable`:** the picker could derive it. The card sets `drillable = !e.revealOnly && pickKindOf(...) !== null` (`CardsView.tsx:486`), yet `resolveTarget` (`ValueSeat.tsx:285-291`) already returns a target for both options *and* `dateTime` (`ValueSeat.tsx:225-231`).
  - **`revealOnly` Means Two Things:** in the card it means "this entry only reveals." In the panel it's set `true` on every entry (`:186`) even though those entries reveal *and edit*. The panel needs it only to trigger `onDismiss` before `revealAndEdit`'s deferred `seat.run` (`PropertyPicker.tsx:134` `if (e.revealOnly) onDismiss()`).
  - **`group?`:** optional only because the panel omits it. The panel never drills, so the `?? 'Properties'` fallback (`PropertyPicker.tsx:172`) is unreachable.
- **Remove/Merge:** `AddEntry` and the panel's `PickEntry` mapping fold into F1's single entry type. `drillable` goes away (derive it from `resolveTarget(entry) !== null`). `revealOnly` becomes the host's own `onPick` decision. `group` becomes required.
- **Effect:** −1 to −2 types, about −20 lines.

##### F3 • Date & Time Doesn't Drill in the Card Chooser; Checkbox Shows a Chevron but Commits

**Category:** Inconsistency (visible) — **Confidence:** Verified

- `pickKindOf('dateTime')` returns null (`properties.ts:75-80`), so a Date entry isn't drillable (`CardsView.tsx:486`).
- Clicking it runs `onReveal` → `setAddPicker(null)` + `seat.run(... 'dateTime')` (`:494-501`). The chooser closes and a fresh picker reopens without the "‹ Properties · Due" back bar, while a Select slides in place.
- Checkbox, File, Text, Number, and Link entries all show a trailing chevron (`PropertyPicker.tsx:130` shows it for any `!revealOnly` entry). Yet a Checkbox commits immediately (`valueClick.ts:29-32`), File opens the OS dialog, and the rest open a popover.
- **Fix Is Subtractive:** derive drillability from `resolveTarget` (see F2). Date then drills like Select, and the chevron means "slides."
- **Effect:** −1 flag; Date gains the back bar.

##### F4 • The Same "Add → Pick → Set" Gesture Behaves Two Ways

**Category:** Inconsistency — **Confidence:** Verified

- **Card:** drills in the same pane (`PropertyPicker.tsx:132` `setPicked`) and reveals on commit (`CardsView.tsx:194-197`).
- **Panel:** closes Add, reveals a blank row, and on the next frame reopens the seat on that row (`PropertyPanel.tsx:260-269`, `requestAnimationFrame`). That's a second open plus a frame-timed handoff that depends on `revealOnly: true` to dismiss first (F2).
- **Genuine Difference:** the panel shows a blank row added in the session (doc: `PropertiesPM.md:117` "A row shows once it holds a value or was added in the session"), and Text/Number/Link values edit inline on that row. The card has no blank row to edit into.
- **Possible Unification:** the panel drills like the card for option and date types and reveals on pick, keeping `revealAndEdit` only for inline-edit types. That would remove the `rAF` for option types.
- **For Nathan:** whether Add should behave the same in both places.
- **Effect:** 0 until Nathan decides; if unified, about −10 lines and one fewer frame-timed handoff.

##### F5 • View Title Menus Route Through the Global `MenuSeat` Although the View Already Mounts a Seat with the Same Host

**Category:** Unjustified Separation · Bug — **Confidence:** Verified (code); behavior Likely

- `runTitleAction` → `runPropertyAction` → `requestPick` (`useViewInteractions.tsx:408-416`, `propertyMenuActions.ts:90-97`). The Cards and Table views each mount a `ValueSeat` built on the same `host.seatHost` (`CardsView.tsx:198`, `TableView.tsx:95`), yet the pick opens in `MenuSeat`, which lacks the view's additions:
  - **Commit Path:** the menu commits through `host.commitValue` (`useViewInteractions.tsx:414`), not `commitOnCard`. A value set from a card's right-click **Properties ▸** doesn't reveal the property on the card. This only bites when the property is hidden from the view, since `revealProperty` returns early otherwise (`useViewHost.ts:163`). That contradicts the comment at `CardsView.tsx:193` ("A value landing on a card shows its property…") and `ViewTypesPM.md:122`.
  - **Ghost Suppression:** the card ghost's suppression (`CardsView.tsx:175-179`) checks `seat.open` and `addPicker`, never `pendingPick`, so the hover ghost isn't held down while a menu-opened pane stands.
  - **Option Styling:** `MenuSeat` has no `setStyle` (`ValueSeat.tsx:320-337`), so option looks can't be edited from a menu-opened picker. A cell-opened one can (`ValueSeat.tsx:240-243`).
- **Remove/Merge:** in views, the title-menu pick runs on the view's own seat (`seat.run(row, column, edit→popover, anchor)`). `runPropertyAction` takes an "open a pick" callback instead of calling `requestPick` itself. `MenuSeat` stays only for `showEntityMenu` (sidebar, Matrix, band), where no seat exists.
- **Effect:** about ±0 lines. Fixes three visible divergences and removes a cross-surface route.

##### F6 • `requestPick` Is the Odd One Among the App-Level Presenters

**Category:** Inconsistency · Over-Engineering — **Confidence:** Verified

- `askConfirm` and `presentMenu` settle any displaced request and guard on identity (`chromeSlice.ts:53-58`, `:65-69`). `requestPick` just overwrites (`:74`), with no promise and no settle.
- Glance uses a third pattern, a module-level presenter (`glanceAction.ts:36` `setGlancePresenter`).
- The request stores live closures (`rowOf`, `commit`) in session state (`:17-24`). `MatrixView` then couples to the slot as a "someone is picking" flag (`:45-48`, `:82`).
- `MenuSeat` re-implements the edit→popover rule that the card chooser also states (`ValueSeat.tsx:342-348` and `CardsView.tsx:495-501` are the same five lines). The rule is "a value opened away from its cell edits in a popover."
- **Remove/Merge:** hoist the edit→popover rule into the seat (for example, a `run(..., {away: true})` or an `openAway` on the seat API). This deletes both copies.
- If `MenuSeat` survives only for entity menus (F5), its slot could become a `presentMenu`-shaped request that settles on close. That would replace the Matrix's `pendingPick` read with an awaited `showEntityMenu` that resolves after the pick closes. This is behavior-sensitive: today `showEntityMenu` resolves "on close, before the pick runs" (`entityMenuActions.ts:44`).

##### F7 • `pageMetaMenuItems` Takes the Same Branches Twice

**Category:** Duplication — **Confidence:** Verified

- `PageMenuContext` already holds `spaces` / `properties` (`pageMenu.ts:29-34`).
- `pageMetaMenuItems` takes `move?: PageMenuContext` *and* separate `spaces` / `properties` (`:124-126`). All three callers pass the same object both ways: `cardMenu.ts:19-21`, `cellMenu.ts:122-124`, `entityMenu.ts:48-50` (`move: ctx, spaces: ctx.spaces, properties: ctx.properties`).
- `cardMenu.ts:22` casts with `as ActionItem<CardMenuAction>[]`, but `CardMenuAction` (`:9`) omits `PropertyAction`. The type therefore hides that the card menu returns `prop:` actions.
- **Effect:** about −10 lines; the cast becomes honest.

##### F8 • The Panel Has Two Commit Functions

**Category:** Duplication — **Confidence:** Verified

- The seat host's `commit: (r, column, next) => assignValue(writer, r, column, next)` (`PropertyPanel.tsx:82`) and `commit(id, next)` (`:159-162`) re-resolve a column that `renderRow` already holds (`:274`, `:294`).
- `emptyRow` (`:255-259`) is the only id-based caller.
- **Effect:** about −4 lines; one commit.

##### F9 • Card Add Entries Are Computed for the Gate and Again for the Chooser

**Category:** Over-Engineering · Misplaced Ownership — **Confidence:** Verified

- `CardApi.addableFor` (`CardsView.tsx:101`, `:282`) exists only so `PageCard` can gate the zone click (`:914`). `CardsView` then recomputes and orders the same entries while open (`:223-225`).
- `openAddPicker` also pokes `seat.anchor.current` directly (`:276`), as `PropertyPanel.tsx:189` does. Both hosts mutate the seat's private anchor ref to seat a chooser.
- **Remove/Merge:**
  - Open unconditionally and let an empty chooser close itself (`PropertyPicker.tsx:158` already renders `emptyPane`), or gate inside the seat.
  - Give the seat an `openChooser(row, entries, anchor)` so neither host touches its ref.
- **Effect:** removes `addableFor` and the `AddPickerRequest` type (about −10 lines) and turns two hand-written anchor seatings into one.

##### F10 • `MassPropertyPicker` Is `PropertyPicker`'s Options Pane with `currents[]`

**Category:** Duplication — **Confidence:** Verified

- `MassPropertyPicker.tsx:22-33` is `pickOver(target.pick, currents, …)` + `PropertyOptionRows editable` inside `PickerMenu solid`.
- `PropertyPicker.tsx:99-114` is the same with `[t.current]`.
- **Merge:** `PickTarget` carries `currents`. `TableView.tsx:205-218` passes the sweep's rows to the one picker.
- **Effect:** −1 file (35 lines), about +5 lines in the picker. Mostly Domain A's call; noted here because the host is the Table.

##### F11 • `SeatHost` Has Five Shapes and Six Single-User Fields

**Category:** Over-Engineering — **Confidence:** Verified

- **Hosts:** the view base (`useViewHost.ts:205-213`); Cards (`CardsView.tsx:198-205`); Table (`TableView.tsx:95-99`); the panel (`PropertyPanel.tsx:79-90`, written whole); `MenuSeat` (`ValueSeat.tsx:320-337`, written whole).
- **Single-User Fields:**
  - `centered`: Cards only.
  - `clear`: panel only.
  - `onClose`: `MenuSeat` only.
  - `setStyle`: views only.
  - `hold`: Cards and Table.
  - `hide`: Cards (`view`) and the panel (`row`).
- These are genuine per-surface differences, mostly correct (see Concerns). F5 would drop one shape (views stop sharing a route with `MenuSeat`). F6's hoist would remove `MenuSeat`'s need for `onClose`-to-dismiss if the slot settles.
- **Effect:** 0 until F5/F6 land; then −1 host shape and possibly `onClose`.

##### F12 • Option Rows Are Correctly Shared by Three Callers

**Category:** none (load-bearing correctness) — **Confidence:** Verified

- `PropertyOptionRows` serves `PropertyPicker` (`:106`), `MassPropertyPicker` (`:25`), and `FilterFrame.ChipsField` (`:181`, non-editable, as filters edit operands rather than options).
- `ChipsField` (`FilterFrame.tsx:139`) re-derives `pickGroups` for chip lookup, which is fine.

##### F13 • Two Hand-Built Drill Frames

**Category:** Parallel Definition — **Confidence:** Verified

- `PropertyPicker`'s chooser: `FrameSlide minWidth={120} minHeight={0}` + `MenuTopRow label={group} current={name}` (`PropertyPicker.tsx:153-176`).
- `MenuPresenter`'s `Level`: `FrameSlide minWidth 120 / maxWidth 180` + `MenuTopRow label={title} current={branch}` inside `MenuScrollFrame` (`MenuPresenter.tsx:55-69`), with `title="Menu"` at the root (`:111`).
- These are the same drill (root list → detail under a back bar) with different sizing and placement of the back bar. This is the only mechanic MenuPresenter shares with the metadata picker. Domain C owns the UIX side.
- **Effect:** −1 hand-built drill if Approach D lands, else 0.

##### F14 • `parseEditorValue` Tests Live in `cardColumns.test.ts`

**Category:** Test Burden · Patch-On Residue — **Confidence:** Verified

- `cardColumns.test.ts:13` imports `Properties/parseEditorValue`. `:18-60` tests it under the card file. Those tests belong beside `Core/Properties/parseEditorValue.ts`.
- **Effect:** about 40 test lines move, 0 net.

##### F15 • Three `property*Menu*` Files in Two Folders

**Category:** Less to Understand — **Confidence:** Verified

- `Actions/propertyRows.ts`: `ActionItem` rows for the value branches.
- `Interface/Menus/propertyMenuActions.ts`: builds and runs those branches.
- `Actions/propertyMenu.ts`: the unrelated ⋮ menu in the Property Frame editor (`PropertyFrame.tsx:242`, `:251`).
- `propertyRows.ts` (59 lines) exists to serve `propertyMenuActions.ts` and `pageMenu.ts`. Its `PropertyMenuRow` exists only to be produced by the latter and consumed by the former.
- **Merge Option:** if F1's entry builder becomes the source, the `prop:` encode/parse could sit with the builder's menu mapping in one file. That would leave `propertyMenu.ts` as the only file with that name pattern.
- **Effect:** −1 file if F1's builder absorbs `propertyRows.ts`.

##### F16 • Doc–Code Mismatches

**Category:** Doc–Code Mismatch — **Confidence:** Verified

- **`PropertiesPM.md:115` Claims the Chooser "Drills Straight Into Its Value":** that's true for option types on cards only. The panel's chooser never drills (F4), and Date doesn't drill on cards (F3).
- **`ViewTypesPM.md:122` and `CardsView.tsx:193` Claim Card Values Reveal on Commit:** a menu-set value doesn't (F5).
- **`ViewTypesPM.md:122` Omits Stamps:** the doc says the chooser "lists the Contexts not shown on the card, then the properties," but it also lists Created/Modified stamps as reveal-only rows (F1).
- **Effect:** three doc sentences rewritten alongside whichever fixes land.

---

#### 3. Approaches

##### A • One `MetadataPicker` with Two Entry Points, Hosts Reduced to Policy

The Add chooser, the cell-click value picker, and `MenuSeat` are already the same machinery: `ValueSeat` renders one `PropertyPicker` that serves both chooser and value (`ValueSeat.tsx:277-306`). What separates them is how they're entered.

- **Root Entry:** a list of entries (card Add, panel Add).
- **Leaf Entry:** a value pane opened directly (cell click, or a system-menu leaf through `MenuSeat`).
- **Value Panes:** options (editable), calendar, typed popover, file dialog.

**What Each Contributes and What's Genuinely Different:**

- **Add Chooser:** the root list, grouping Spaces/Properties, and the slide-to-value. Different only in which entries it lists (card: unshown in view; panel: not held/revealed) and what a reveal means (view config versus a session row).
- **`MenuSeat`:** leaf entry anchored at a menu trigger, and the edit→popover rule. It must exist as long as right-click stays native: a native leaf can't drill into an in-app frame, so the value pane opens after the menu closes (`ValueSeat.tsx:312` comment). That separation is real; a separate *component* for it isn't. It's `useValueSeat` + `ValueSeat` with a host built from a request.
- **MenuPresenter:** contributes no entity management (Headline Facts) and stays outside per Nathan. Its overlap is the drill frame (F13).

**What a Single Picker Removes:**

- `PickEntry`'s `drillable` / `revealOnly` / optional `group` (F2).
- `AddEntry`, `AddPickerRequest`, and `addableFor` (F2, F9).
- The duplicated edit→popover rule (F6).
- The panel's frame-timed `revealAndEdit` handoff for option and date types (F4).
- `MassPropertyPicker` as a file (F10).
- The global route for view title menus (F5).
- Hosts stop poking `seat.anchor.current` (F9).

**Honest Boundary:**

- **Inside:** the entry list's shape and order (F1), the picker frame and value panes, the seat state, and the away-from-value entry.
- **Outside, as Host Policy:** which entries qualify (unshown in a view versus not held in the panel), what reveal writes (`revealProperty` view patch versus panel `revealed` state), `hide`/`clear` semantics, `centered`/`hold` presentation, and the writer (`assignValue` with the host's writer).
- **Native Menu Building:** `propertyMenuBranches` / `propertyBranchRows` is the native rendering of the same entry list. It belongs beside the picker as a second presenter of F1's builder, not inside it, because native menus can't show the editable panes.
- **Trade-Off:** `ValueSeat.tsx` (353 lines) and `PropertyPicker.tsx` (338 lines) are already dense. Merging their state into one component needs care around the `useHeld` exit holds (`ValueSeat.tsx:268-274`).

##### B • One Entry Builder Feeding Three Presenters

This is F1's builder alone: `metadataEntries(row, schema, tree) → {column, label, icon, group, held}[]` in one canonical order. The card filters by view visibility, the panel by held/revealed, and the native menu maps to `ActionItem` with options.

- **Smallest Change:** the largest consistency gain for the smallest diff. It fixes the three-way ordering divergence and deletes three derivations.
- **Can Ship Independently:** it doesn't depend on A.
- **Risk:** the card's "reveal-only" for a property that holds a value but is hidden from the view has no panel analog. That stays a card-side filter flag.

##### C • Views Use Their Own Seat for Title-Menu Picks; `MenuSeat` Shrinks to Entity Menus

This is F5 as an approach.

- **Change:** `runPropertyAction` takes `open(column)` instead of calling `requestPick`. Views pass `seat.run`. `showEntityMenu` passes the `MenuSeat` path.
- **Result:** fixes reveal-on-commit, ghost hold, and option styling from menus, and limits the global slot to surfaces that genuinely have no seat.
- **Further Option:** pair it with F6 so the slot settles like `presentMenu`, and drop Matrix's `pendingPick` read for an awaited result. That last part is behavior-sensitive (see F6).

##### D • Shared Drill Frame Beside the Picker (Crosses Into Domain C/UIX)

`MenuPresenter.Level` and the picker's chooser both build "root list + `FrameSlide` + `MenuTopRow` back bar." One drill-level primitive would remove one hand-built copy and reconcile the sizing (`minHeight 0` versus `maxWidth 180`) and the placement of the back bar (header of a scroll frame versus in-flow). Generic action menus stay in `MenuPresenter`, as Nathan's correction says; only the mechanic is shared. **Trade-Off:** an added primitive is justified only if both callers delete their copies.

---

#### 4. Concerns and Insights

- **Correct Separations Worth Keeping:**
  - The three writers (view, panel, `oneShotWriter`) all ending in `assignValue`.
  - `hide: 'view'` versus `hide: 'row'` (`cellMenu.ts:28`). A view's Remove hides a column; the panel's empties a row.
  - The panel's `style: () => null` (`ValueSeat.tsx:43` documents why).
  - The Table's lack of an add chooser, since its columns are view-level.
  - The menu listing every property, including shown ones, because it sets values rather than adding them.
- **Unreachable Branch in `MenuSeat`:** a null intent (filedata) would leave `pendingPick` set and keep Matrix's label held (`ValueSeat.tsx:342-350` dismisses only on `file`). It's unreachable today because `propertyMenuBranches` never lists filedata and checkbox/option leaves always carry values. If F1's builder ever feeds stamps to the menu, it becomes live.
- **Empty Option Lists:** a Select or Context with no options yields an empty submenu (`propertyRows.ts:23`). The tests assert both renderers grey it out (`propertyRows.test.ts:58`), so it's intentional, but such a value can't be set from the menu at all, and there's no route to the picker's New Option.
- **Three Checkbox Behaviors:** the native menu offers Check/Uncheck (`propertyMenuActions.ts:16-19`), while clicks and choosers toggle. That's a platform-shaped difference, probably correct.
- **Matrix Coupling:** `MatrixView.tsx:45` treats any app-wide `pendingPick` as its own. That's harmless with one Matrix surface, but it's a global flag doing local work.
- **Test Burden:** `propertyMenuActions.test.ts` (289 lines) and `ValueSeat.test.tsx`'s `MenuSeat` block (`:283-350`) would partly move under A or C. `PropertyPanel.test.tsx` (541 lines) likely pins `revealAndEdit`'s timing; read it before changing F4.
- **Out of Mandate:** `valueClick.ts` keeps separate `picker` and `dateTime` intents only so `x` isn't passed to the calendar (`ValueSeat.tsx:128-131`). That's Domain A's to judge.
