# Scout C — The Kit and the Menu Presenter

Baseline `69db9942e` on `active`. Read-only. Paths are repo-relative to `~/The Studio/Projects/Project Pommora`.

## 1. Map

### UIX/Pickers

| Item | What It Does | Called From |
|---|---|---|
| `PickerMenu.tsx` `PickerMenu` (365 lines, 20 props) | The portal pane: exit presence, dismissal registration + shield, DEV unmount guard, `onExited`, held children, placement (flip/center/edge/clamp/origin) in a layout effect, a second pane-size observer, a post-effect re-decide, focus trap, `keep`-focus press guard, glass shell choice, resize edges | 15 Core files + `FieldPicker`, `IconPicker`, `ColorPicker`, `CalendarPicker` (×2), `ManageRow` |
| `PICKER_PORTAL_ATTR` | Marks the portal layer for containment | `GlancePane`, `PageTile`, `ValueEditor` |
| `VIEWPORT_MARGIN` | Placement edge margin | `usePaneResize.tsx:9`, `MatrixLabel.tsx:6` |
| `PickerDirection` | `'down' \| 'up'` | `usePaneResize` only |
| `usePaneResize.tsx` `usePaneResize`, `PaneBounds`, `PaneResize` | User-resizable pane size, edges, remembered geometry; PickerMenu calls its `place` from inside `measure` (`PickerMenu.tsx:216`) | `GlancePane`, `caretPane` (→ `AutocompletePane`, `BlockMenuPane`) |
| `PickerControl.tsx` `PickerControl` | Inline trigger showing the current option; 2 options toggle, 0 options type, else opens a list through the module-global `door` | `MenuIndex.tsx:112` (trailing `picker`), `OptionEditPopup`, `ScalePicker`, `SettingsWindow` |
| `pickerOptions`, `PickerOption` | Values+labels → options | `Settings/frames.ts`, `displayLabels.ts`, `typeRows.tsx`, many type imports |
| `steppedPickerProps` | Numeric stepped list + typeable field | `MenuIndex.tsx:86` (`steppedRow`), `ScalePicker`, `SettingsWindow` |
| `MenuDoor`, `setMenuDoor` | UIX→Core inversion seam so `PickerControl` can call Core's `popMenu` | `Core/Interface/mount.tsx:19`, `Core/Testing/MenuDoorHost.tsx:5` |
| `FieldPicker.tsx` `FieldPicker` | PickerMenu (down/center) + field chrome around `EditableInput` or hosted children | `PropertyValueInput.tsx:59,118`, `FilterFrame` |
| `IconPicker.tsx` `IconPicker`, `IconFavorites`, `IconPickerProps` | PickerMenu + search + virtual grid + sortable favorites | `Core/Assets/IconChoice.tsx`, `iconFavorites.ts` |
| `ColorPicker.tsx` `ColorPicker`, `ColorGrid` | PickerMenu around `ColorGrid`; `ColorGrid` bare | ColorPicker: `SpaceMenu`, `ViewTile`, `ViewFrame`, `MatrixLabel`; ColorGrid: `OptionEditPopup` only |
| `CalendarPicker.tsx` (551) | Pane *content* (no outer PickerMenu); owns two hand-rolled dropdowns (month/year `:415-429`, hour/minute `:396-409` region) each a PickerMenu + `MenuScrollFrame` + `MenuItem picked='solo'` | `DateTimeValuePicker.tsx` |
| `picker-base.css.ts` | `PICKER_MAX_HEIGHT`, `treePane`, `optionRing`, `layer`, `shield`, `PANE_RADIUS`, `pane`, `surface`, `resizing` | `treePane` → `LocationField` only; `optionRing` → `CalendarPicker` only |
| `picker-control.css.ts`, `field-picker.css.ts`, `color-picker.css.ts`, `icon-picker.css.ts`, `calendar-picker.css.ts` | Per-component styles | their component |

### UIX/Menus

| Item | What It Does | Called From |
|---|---|---|
| `FrameSlide.tsx` `FrameSlide` | Two-slot slide; holds `detail` through slide-out; measures both slots | `MenuPresenter`, `PropertyPicker`, `PropertyFrame`, `AutocompletePane`, `ViewFrame`, `LayoutFrame`, `SettingsFrame`, `MatrixMenu` |
| `MenuRows.tsx` `MenuTopRow` | Back bar (`‹ label · current`), `keepFocus` on press | 9 Core files; `className` used only by `PropertyPicker.tsx:175` |
| `MenuRows.tsx` `MenuItem`, `MenuSeparator`, `MenuDesc`, `FootingItem`, `MenuFooting`, `FootingCreate`, `RowRemove`, `AccessoryButton`, `FooterIconButton`, `FooterLockButton`, `Menu`, `MenuScrollFrame`, `menuDropLine` | Row kit | widely used |
| `MenuIndex.tsx` `MenuIndex`, `MenuRowView`, `pickerRow`, `steppedRow`, `MenuRow`, `Trailing`, `MenuSection`, `PickerRowLook` | Declarative settings-row model → `MenuItem`; `Trailing.picker` mounts `PickerControl` | Settings/View/Property frames |
| `pickRuns.ts` | Picked-row ring runs | `MenuPresenter.tsx:32`, `PropertyPicker` |
| `DisclosureRow.tsx`, `ManageRow.tsx`, `InlineEditHeader.tsx`, `useListEdit.ts`, `paneDrop.tsx`, `MenuDropdown.tsx`, `MenuSurface.tsx`, `menuAnchor.ts`, `frameGrowth.ts` | Assorted pane pieces | each 2–6 Core consumers |
| `frames.css.ts` (197) | "ViewFrame tunables": option-editor, status groups, assigned fill, middle region, `VIEW_SETTINGS_MAX_HEIGHT` | ~20 Core files (`Properties/Schema`, `Views/Settings`); in UIX only `InlineEditHeader`, `paneDrop` |
| `menu-row.css.ts` (320) | Row tokens, `MENU_MAX_HEIGHT`, top-row, picked runs, footing, scroll frame | kit + Core |
| `frame-slide.css.ts` | Slide styles + `PANE_MIN_W` 225 / `PANE_MIN_H` 245 | FrameSlide + 5 Core frames |
| `index.ts` | Partial barrel (MenuRows, MenuIndex, DisclosureRow, pickRuns, 3 CSS classes, MenuSurface, MenuDropdown) | 49 Core files |

### Core Presenter Path

| Item | What It Does | Called From |
|---|---|---|
| `Core/Actions/menuActions.ts:6` `popMenu` | Native menu when no trigger or `nativeMenus` pref; else `presentMenu` | 34 call sites; only `TileHost.tsx:243,301` and `PickerControl`'s door pass a trigger, so only those reach `MenuPresenter` |
| `Core/Session/chromeSlice.ts:62-71` `pendingMenu`/`presentMenu` | Promise + identity-guarded `settle`, `menuSeq` id | `popMenu`, `MenuPresenter` |
| `chromeSlice.ts:73-75` `pendingPick`/`requestPick`/`dismissPick` | Fire-and-forget value-pick request | `propertyMenuActions.ts:90`, `MenuSeat` |
| `Core/Interface/Menus/MenuPresenter.tsx:17-83` `Level` | Recursive drill: `menuRows` → `MenuItem`s in `MenuScrollFrame` (`PICKER_MAX_HEIGHT`) with back bar in its `header`; branch → nested `Level` in a nested `FrameSlide` | itself |
| `MenuPresenter.tsx:85-117` `MenuPresenter` | One global PickerMenu fed by `pendingMenu`; `stay` redraw via `live` state | `App.tsx:196`, `MenuDoorHost` (tests) |
| `Core/Interface/Menus/menuRows.ts` `menuRows`, `PresenterRow` | `ActionItem[]` → rows with separators; greys empty branches | `MenuPresenter`, `Desktop/Actions/menu.test.ts:4,136` (parity test) |
| `Core/Actions/menuModel.ts` `ActionItem`, `MenuOptions` (`solid`, `stay`, `compact`, `at`) | The one menu model + zod schema for the native channel | everywhere; `compact`/`solid` set only by the door (`PickerControl.tsx:118`), `at` only by `TileHost.tsx:303`, `stay` only by `TileHost.tsx:244` |

## 2. Findings

### C1 • Two Drill Implementations, and the Chooser Is the Odd One Out
**Category:** Parallel Definition · Inconsistency
**Evidence:** `MenuPresenter.tsx:56-81` puts the back bar inside the child level's `MenuScrollFrame header` and caps the level at `PICKER_MAX_HEIGHT`. Every Settings frame does the same (`GroupFrame.tsx:228`, `SortFrame.tsx:111`, `FilterFrame.tsx:494`, `VisibilityFrame.tsx:122`, `LayoutFrame.tsx:200`, `PropertyFrame.tsx:355`). `PropertyPicker.tsx:152-184` instead renders root rows in a bare `<div>`, which has no scroll frame and no cap, and puts `MenuTopRow` in a bare `<div>` above the pane with `className={chooserTop}`. `chooserTop` (`property-picker.css.ts:4`) zeroes `--row-pad-y`. It's the **only** user of `MenuTopRow`'s `className` prop (`MenuRows.tsx:35,51`). The commit that added it (`4d0a63975`) gave only "keep the chooser header flat" as its reason.
**Remove/Merge:** the chooser takes the canonical shape: root rows in a `MenuScrollFrame` capped at `PICKER_MAX_HEIGHT`, and the back bar as the detail's `MenuScrollFrame header`. That deletes `chooserTop` and `MenuTopRow.className`, and the root list gets a height cap it currently lacks. A card with many Spaces and Properties grows the pane without limit; FrameSlide's own doc (`FrameSlide.tsx:9`) says a slot needing a ceiling wraps in `MenuScrollFrame`. The `minHeight={0}` at `PropertyPicker.tsx:156` looks like a no-op, because the default is unset and `slotContent` is `flex: 0 0 auto`.
**Effect:** −1 style, −1 prop, −~6 lines. Visible change: the chooser's back bar gets the same padding as every other back bar.
**Confidence:** Verified (shape and single-use prop); Likely (missing cap is user-visible on large schemas).

### C2 • MenuPresenter's `Level` and the Chooser Can't Share One Component Today, and Shouldn't Be Forced To
**Category:** Unjustified Separation (partial)
**Evidence:** `Level` drills `ActionItem` trees whose leaves resolve a string (`MenuPresenter.tsx:48`). The chooser's leaves are live value panes (`PropertyPicker.tsx:94-123`) that commit `PropertyValue` and may stay open for multi-select (`pickOver`). Both share only the mechanics: `FrameSlide` + `MenuTopRow` + `MenuScrollFrame` + `MenuItem` (+ `pickRuns`). Each FrameSlide user hand-rolls 2–3 lines of `useState<X|null>` / `open={x!==null}` / `onBack={() => set(null)}`. That's too little to justify a `useDrill` wrapper.
**Assessment:** the shared part already lives in UIX. What diverges is C1's layout, and fixing that removes the inconsistency. A generic "drill level" component would add a layer to save about 3 lines per site, so it doesn't earn its place.
**Confidence:** Verified.

### C3 • I-027 Holds at HEAD; Citations Drifted
**Category:** Bug · Doc–Code Mismatch
**Evidence:** the mechanism is intact. `MenuPresenter` mounts one `PickerMenu` (`MenuPresenter.tsx:98`). `presentMenu` settles the previous menu and sets the next in one tick (`chromeSlice.ts:63-71`). `useExitPresence` clears `closing` the moment `open` returns true (`useExitPresence.ts:11-14`). `dismissalStack.ts:68-83,122` matches the issue. Drifted citations: `PickerControl.tsx:91-114,144-148` is now `:100-124,160-167`; `MenuPresenter.tsx:84-103` is now `:85-117`; `menuActions.ts:20-23` is now `:23-26`. The issue's option B ("each presented menu in its own `PickerMenu` until `onExited`") has a working precedent: pinned glances (`GlancePane.tsx:408-420`, `enter={false}`, `onExited={() => removePin(...)}`). `onExited` has no other caller.
**Scope Note:** after the correction, I-027 sits on the action-menu side, since `PickerControl` dropdowns and tile menus are outside the metadata picker. It touches the picker only through `OptionEditPopup`'s `PickerControl` (`OptionEditPopup.tsx:90`), which opens from inside a value pane's editable options.
**Confidence:** Verified.

### C4 • I-042 Holds; Its Solution Text Names a Setter That No Longer Exists
**Category:** Over-Engineering · Doc–Code Mismatch
**Evidence:** `measure` is `PickerMenu.tsx:201-244` (44 lines) inside the layout effect `:184-277`. Placement is actually spread over **three** effects plus a render-phase reset: the pane-size observer `:170-182`, the main effect `:184-277`, the post-children re-decide `:280-286`, and a render-body ref reset `:165-168`. `measure` also *calls out* into `usePaneResize` (`placeResize?.({dir, room})`, `:216`), so it isn't fully pure as written. The issue's proposed `setPos`/`setEffDir` refers to `setEffDir`, which is gone; the effective direction now leaves only through `placeResize`. Footnote lines `184-277` still match.
**Remove/Merge:** a pure `placePane(...) → { pos, dir, decided }` beside the component, with the effect latching and forwarding `dir` to `resize.place`. Tests `PickerMenu.test.tsx:452-520` would become plain function tests. This is structural only, roughly net 0 to +10 lines. It's the right shape, but it doesn't make the codebase smaller.
**Confidence:** Verified.

### C5 • I-051 Holds; It's Peripheral to the Metadata Picker
**Category:** Doc–Code Mismatch (none) · Inconsistency
**Evidence:** `MenuRows.tsx:163` caption has no measure, and `menu-row.css.ts:214` has no `maxWidth`. `PropertyFrame.tsx:399-405` passes no `maxWidth`. `formatRows.ts:12-39` carries no captions, as the issue says. Width ceilings are set per caller: `MenuPresenter` 120/180 (`:58-59`), `AutocompletePane` `AC_FIT_MAX`, none on Settings frames.
**Assessment:** the issue is about the property *schema* pane, which isn't entity metadata. It's in scope only if the cleanup also settles one "pane width ceiling" rule for `FrameSlide` users.
**Confidence:** Verified.

### C6 • `PickerMenu`'s `anchorX` Carries Two Meanings, and the DEV Guard Keys on the Wrong One
**Category:** Inconsistency · Patch-On Residue
**Evidence:** with `anchorY`, `anchorX` makes a point anchor (`PickerMenu.tsx:187-197`). Alone, it overrides only the horizontal center (`:203`). `PropertyPicker` passes `anchorX` alone (`PropertyPicker.tsx:150`, from `ValueSeat.tsx:295`). The DEV guard skips whenever `anchorX !== undefined` (`:137`), and its comment says the exemption is for "a pinned glance". That exempts PropertyPicker's cell-click pane, `CalendarPicker`'s dropdowns, `caretPane`, and `MenuPresenter`'s `at` menus too.
**Replace:** one anchor prop, `anchor?: { x; y?; h? }`, with the guard keyed on what actually unmounts by design (`onExited`/`enter={false}`, the pinned-glance contract). Net −2 props.
**Confidence:** Verified (semantics); Likely (the guard scope is unintended).

### C7 • `CalendarPicker` Hand-Rolls Two Pick-One Dropdowns the Kit Already Owns
**Category:** Duplication · Inconsistency
**Evidence:** month/year (`CalendarPicker.tsx` ~`:415-429`) and hour/minute (`:396-409`) each repeat PickerMenu `solid` + `anchorX/Y/Height` from a hand-made `anchorOf` (`:36-40`), `MenuScrollFrame maxHeight={DROPDOWN_MAX_HEIGHT}` (136, a fourth height ceiling), and `MenuItem picked={... 'solo'}`. That's what `PickerControl`'s door does (`PickerControl.tsx:109-123`). These lists ignore the `nativeMenus` pref that `PickerControl` lists honor (`menuActions.ts:12`), so two kinds of dropdown answer that pref differently. `anchorX/Y/Height` and `triggerRef` are both passed, so the point snapshot overrides the live trigger rect.
**Replace:** export one `pickFrom(rows, trigger, opts)` from `PickerControl.tsx` (the door's caller) and route both lists through it. That removes 2 PickerMenu mounts, `Anchor`/`anchorOf`, `menu`/`timeMenu` state, `DROPDOWN_MAX_HEIGHT`, and `menuList` CSS, likely −50 to −70 lines. **Trade-off:** the presenter has no `direction: 'up'` (the clock list opens up, `:397`), and the list cap changes from 136 to 240. Both are visible.
**Confidence:** Likely. CalendarPicker sits under `DateTimeValuePicker`, so it's inside the metadata picker's value pane.

### C8 • `MenuDoor` Restates the Leaf Row Model
**Category:** Parallel Definition
**Evidence:** `PickerControl.tsx:23-27` declares rows `{label, action, checked, icon?, disabled?}` and options `{solid?, compact?}`. That's a subset of `LeafItem<string>` and `MenuOptions` (`menuModel.ts:3-15,101-107`). UIX can't import Core (hard rule), so the duplication is forced by the boundary.
**Assessment:** accept it, but `MenuDoor` is exported with zero production importers (only tests), so un-export it. `compact` exists only for this door, and `MenuPresenter.tsx:58-59` reads it to drop the 120/180 floor and cap. It could be dropped if presenter levels took one width rule.
**Confidence:** Verified.

### C9 • Two "In-App Pane Opened From Afar" Session Channels With Different Contracts
**Category:** Inconsistency · Parallel Definition
**Evidence:** `presentMenu` (`chromeSlice.ts:63-71`) is a Promise with an identity-guarded `settle`, an id, and a settle-on-displace; `resetChrome` settles it (`:91`). `requestPick` (`:74`) is a bare overwrite with no id, no displacement notice, and no promise. They have two App-level mounts (`App.tsx:196-197`: `<MenuPresenter/>`, `<MenuSeat/>`), each with its own PickerMenu.
**Assessment (post-correction):** these *should* stay two channels, since action menus aren't the metadata picker. `pendingPick` is the metadata picker's channel and should be the **only** way an off-surface request reaches it. Today the card chooser reaches `PropertyPicker` through a per-surface `ValueSeat` prop (`ValueSeat.tsx:262,284`) instead.
**Confidence:** Verified.

### C10 • `menuRows.ts` Is a 10-Line File That Exists for a Test
**Category:** Test Burden · Unjustified Separation
**Evidence:** `menuRows`/`PresenterRow` have one production caller (`MenuPresenter.tsx:11,31`). The file exists so `Desktop/Actions/menu.test.ts:4,136` can assert native and in-app parity, and it has its own 3-case test file (`menuRows.test.ts`). `Desktop/Actions/menu.ts:52` guards `template.length === 0`, which is unreachable because `popMenu` already returns on `items.length === 0` (`menuActions.ts:11`), every item yields a row, and `popMenu` is the only sender on the `menu` channel.
**Remove:** inline `menuRows` into `MenuPresenter` and fold `menuRows.test.ts` into `MenuPresenter.test.tsx`. The parity test would then need another seam, though, so this is a judgment call. The Desktop empty guard is a ghost guard (outside this domain).
**Confidence:** Verified (reachability); Speculative (whether parity is worth the file).

### C11 • UIX/Pickers ↔ UIX/Menus Is a Bidirectional Tangle
**Category:** Unjustified Separation · Misplaced Ownership
**Evidence:**
- Pickers import Menus: `PickerMenu.tsx:21` (`MENU_GAP`), `picker-base.css.ts:4-5` (`menuCompact`, `frameViewport`), `picker-control.css.ts:4` (`footingBar`), `CalendarPicker.tsx:12,15,16` (`MenuItem`, `rowBox`, `MenuScrollFrame`).
- Menus import Pickers: `ManageRow.tsx:3` (`PickerMenu`), `MenuIndex.tsx:7` (`PickerControl`).
- There are four height ceilings in four files: `PICKER_MAX_HEIGHT` 240 (`picker-base.css.ts:8`), `MENU_MAX_HEIGHT` 320 (`menu-row.css.ts:302`), `VIEW_SETTINGS_MAX_HEIGHT` 440 (`frames.css.ts:130`), `DROPDOWN_MAX_HEIGHT` 136 (`CalendarPicker.tsx:29`).
- The minimum width 225 is written three times: `PANE_MIN_W` (`frame-slide.css.ts:5`), `PANE_SQUARE` (`ViewFrame.tsx:41`), and `minWidth: '225px'` (`menu-surface.css.ts:13`).
- The value 120 is repeated: `MenuPresenter.tsx:58`, `PropertyPicker.tsx:155`.

**Assessment:** the folder split doesn't reflect a dependency boundary. One `UIX/Menus` (or one `UIX/Panes`) owning pane, rows, slide, and size tokens in one file would remove the cross-imports and collect the ceilings.
**Confidence:** Verified.

### C12 • UIX Holds Core-Only Styles
**Category:** Misplaced Ownership
**Evidence:**
- `frames.css.ts` (197 lines, "ViewFrame tunables", `:23`): `assignedFill*`, `allHeading`, `allRow`, `configEditor`, `optionLead`, `compactTitle`, `ghostOptionRow`, `ghostChip`, `optionEditButton`, `statusGroups`, `optionList`, `middleRegion`, `chipRegion`, and `VIEW_SETTINGS_MAX_HEIGHT` are consumed only by `Core/Properties/Schema/*` and `Core/Views/Settings/*`. Inside UIX only `header`/`iconButton`/`titleField` (`InlineEditHeader`) and `restHighlight` (`paneDrop`) are used.
- `treePane` (`picker-base.css.ts:10`) → `LocationField` only.
- `actionRow` (`menu-row.css.ts:216`) → `PropertyFrame` only.
- `hostedGutter` (`menu-surface.css.ts:16`) → `ViewTile` only.

**Assessment:** this is adjacent to the picker work rather than inside it. Moving these to Core shrinks UIX's surface, but none of it is metadata-picker code.
**Confidence:** Verified.

### C13 • Barrel Versus Direct Imports: Two Ways
**Category:** Inconsistency
**Evidence:**
- 49 Core files import `@pommora/uix/Menus`, while `ExcludedDirectoriesRow.tsx:7` and `ImagePicker.tsx:14` import `MenuRows` directly.
- `titleInput` comes through the barrel in `RenamableTitle`, `sidebarRows`, `CardsView`, `MatrixLabel`, and `OutlineMenu`, but directly from `menu-row.css` in `ViewTile.tsx:24`, `PropertyFrame.tsx:33`, `AliasList.tsx:15`, and `ViewFrame.tsx:20`.
- The barrel omits `FrameSlide`, `ManageRow`, `InlineEditHeader`, `paneDrop`, `useListEdit`, `menuAnchor`, and `frameGrowth`, so `MenuPresenter.tsx:5-6` imports `FrameSlide` directly and `MenuItem` via the barrel on adjacent lines.
- `UIX/Pickers` has no barrel; the only other UIX barrels are `Theme` and `Symbols`.

**Replace:** pick one. Dropping the barrel (−31 lines, direct imports everywhere, matching Pickers) is the smaller rule. Completing it means re-exporting the 7 missing modules and every CSS class consumed outside.
**Confidence:** Verified.

### C14 • PickerMenu Wrappers Multiply Around One Value
**Category:** Duplication · Over-Engineering (crossing into Domains A/B)
**Evidence:** an entity's value editing mounts PickerMenu through five wrappers:
- `PropertyPicker` (`:144`, `solid`)
- `MassPropertyPicker` (`:24`, `solid`, same `PropertyOptionRows`)
- `FieldPicker` typed (`PropertyValueInput.tsx:59`)
- `FieldPicker` hosted (`PropertyValueInput.tsx:118`)
- `TextPane` (`TextPane.tsx:34`, `direction="down" origin="center"`, the same props as `FieldPicker.tsx:40-41`)

`direction="down"` is the default but is passed explicitly at `FieldPicker.tsx:40`, `ColorPicker.tsx:25`, `TextPane.tsx:38`, and `OptionEditPopup.tsx:55`.
**Assessment:** the metadata picker's honest unit is **one pane host per value request**, with a body switch over options, date, text, or field. The kit already has that host in `PickerMenu`, so the wrappers are the residue. `FieldPicker`'s hosted mode and `TextPane` are the same shell with different chrome.
**Confidence:** Verified (counts); Likely (the merge is clean).

### C15 • Small Dead or Test-Only Surface
**Category:** Dead or Unreachable · Test Burden
**Evidence:**
- `MenuDoor` is exported with 0 production importers (C8).
- `PickerControl.options.test.ts` is a 16-line file holding one test of `pickerOptions` beside `PickerControl.typeable.test.tsx`.
- `Core/Testing/MenuDoorHost.tsx:5` repeats `setMenuDoor(popMenu)` from `mount.tsx:19`. That's a legitimate harness, but a second registration site.
- `PickerMenu.tsx`'s `bounds` prop has one caller (`caretPane.tsx:84`).
- `glass`, `enter`, `onExited`, `modal`, and `style` serve Glance and caret panes only. Of `PickerMenu`'s 20 props, 9 serve ≤2 callers.

**Confidence:** Verified.

## 3. Approaches

### A. The One Metadata Picker (Post-Correction Boundary)
**In:**
- Add chooser
- `MenuSeat`
- the cell-click picker
- the value panes: options rows, `DateTimeValuePicker` + `CalendarPicker`, typed field, text pane
- `MassPropertyPicker`

**Out (beside it):**
- `MenuPresenter`
- tile menus
- `PickerControl` lists
- `popMenu`/`presentMenu`

These share only the kit (`PickerMenu`, `FrameSlide`, `MenuTopRow`, `MenuScrollFrame`, `MenuItem`, `pickRuns`).

**What Each Contributes From This Domain:**
- **Chooser:** the only real drill. It uses `FrameSlide` with root = entries and detail = the value pane, in a non-canonical layout (C1).
- **MenuSeat:** no drill. It opens the value pane directly at a trigger via `pendingPick` (C9). The system menu replaces the chooser's root.
- **MenuPresenter:** nothing entity-specific. Its `Level` is the reference layout for a drill level (back bar in `MenuScrollFrame` header, `PICKER_MAX_HEIGHT`), and the chooser should copy that layout rather than share the component (C2).

**What's Genuinely Different:**
- Entry point: a surface click, a system-menu leaf, or a cell click.
- Whether a root list exists: chooser yes, MenuSeat no.
- The value pane's anchor: a cell column `x` versus a trigger.

The body (value pane) and commit (`PropertyValue`) are the same, so one host with a two-level drill fits all of them, where MenuSeat and cell-click open at depth 1 with no back bar.

**What a Single Picker Removes (Kit-Side):**
- `chooserTop` + `MenuTopRow.className`
- the bare-div chooser layout
- up to 4 of 5 PickerMenu wrappers (C14)
- the per-surface chooser prop path, if the chooser also enters through `pendingPick` (C9; domain A's call)
- CalendarPicker's two private dropdowns, if C7 is taken

**Lifetime Rule:** the picker must not inherit I-027's single-instance flaw. Hold each request in its own PickerMenu until `onExited`, as pinned glances do (C3). `ValueSeat.tsx:278` currently re-keys `PropertyPicker` per `rowId:columnId`, which unmounts an open or exiting pane outright. PickerMenu calls that out as an error (`:134-143`), and C6's guard scope hides it. This is Speculative; domain A should confirm.

### B. Kit Consolidation Independent of the Picker
Merge `UIX/Pickers` + `UIX/Menus` concerns (C11), move Core-only styles out of UIX (C12), settle the barrel (C13), collapse `anchorX/anchorY/anchorHeight` into one `anchor` (C6), and extract `placePane` (C4). Mostly lines moved rather than removed, but fewer files to search and no circular folder imports. Risk: a broad import churn, roughly 70 files touched.

### C. Route Pick-One Lists Through One Door (C7)
`CalendarPicker`'s lists plus `PickerControl` would share one function. Gains: one dropdown behavior and consistent `nativeMenus`. Costs: the presenter needs `direction`, or the clock list stops opening upward, and CalendarPicker's list cap changes from 136 to 240.

## 4. Concerns and Insights

**Correct Separations:**
- `setMenuDoor` is the right inversion. UIX can't reach Core, and the door is what lets `PickerControl` honor the native-menu pref.
- `usePaneResize` beside `PickerMenu` is right; it's PickerMenu's companion, and all four consumers mount through it.
- `FrameSlide` holding `detail` itself (`:41-44`) is why per-site drill state stays at about 3 lines.

**Risks:**
- Unifying the two session channels would pull action menus into the picker, which the correction rules out.
- Folding the chooser into MenuPresenter's `Level` would require Level to render ReactNode leaves and commit non-string values. That's more mechanism, not less.

**I-027 Decision Still Open:** Nathan's "Your call" (whether a press that closes a list should also act on what it lands on) is still pending, and the one-instance-per-request rule in Approach A depends on it.

**Native Menu Behavior:** `stay` rows reach the native channel (zod accepts `stay`, `menuModel.ts:86`), but Electron ignores them, so under `nativeMenus` the tile style rows close the menu. It degrades acceptably, but nothing documents it.

**Test Coverage:** `PickerMenu.test.tsx` is 611 lines and covers focus, dismissal, centering, and close render. Any change to PickerMenu's responsibilities moves through it, and the 9 centering cases are I-042's beneficiaries.
