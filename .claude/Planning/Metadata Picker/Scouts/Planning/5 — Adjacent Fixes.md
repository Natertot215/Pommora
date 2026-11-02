### Scout 5 — Adjacent Fixes (F-1 to F-7)

Baseline `8824cce29`. Read-only; this scout ran nothing. All paths are from the repo root. Line counts are production code only and are estimates built from the hunks below.

**The Read:**

- **F-1 and F-3** land as removals: one prop leaves two frames, one back shape replaces four, `ViewItemMenu.tsx` goes, `PANE_SQUARE` goes, and no new component is needed for any of them.
- **F-2** has one shape that removes both summon models: one icon and color request in the session, one App-level mount, and a one-line `chooseIcon`/`chooseColor` at every site, `ColorSwatch`'s two callers included, on the pattern `presentMenu`/`MenuPresenter` and `requestPick`/`MenuSeat` already set. The leads found 8 sites; there are 13 `IconChoice` mounts and 5 `ColorPicker` mounts.
- **Doesn't Earn Consolidation:** an `IdentityHeader` component, folding `HomepageMenu` into `InlineEditHeader`, and merging `PageMenu` with `SpaceMenu`.

---

#### 1. Contradictions

**With the Source:** none stops a decision from holding. These sharpen what the Source and the leads state.

- **X-1 • F-2's Extent Is Larger Than the Leads:** M-37 and D-F6/F7 name `ViewFrame`, `ViewTile`, `SpaceMenu`, `MatrixLabel`, `SettingsFrame`, `PageMenu`, `PropertyFrame`, `HomepageMenu`. Missed: `Sidebar.tsx:299`, `Banner.tsx:159`, `PageHeader.tsx:91`, `useViewInteractions.tsx:383`, `OptionEditPopup.tsx:99`, `NexusIconEditors.tsx:16`.
- **X-2 • `HomepageMenu` Isn't the Same Wiring:** D-F7 counts it as a fifth "header plus icon picker". Its button opens a *menu* (`icon.openMenu()`, `HomepageMenu.tsx:33`), its title is read-only (`:42`), and it holds a photo (`:36-40`). It rebuilds `InlineEditHeader`'s markup, but it shares no picker wiring with the other four.
- **X-3 • The Store Model Is Narrower Than It Looks:** `colorHost` is only ever `'matrix'`: `changeColor` is offered only under `host === 'matrix'` (`entityMenu.ts:85`), so `if (target.host)` (`entityMenuActions.ts:107`) and the `colorHost` test (`MatrixView.tsx:38`) guard nothing. `beginIcon`'s `?? 'sidebar'` (`editSlice.ts:153`) is unreachable: all four `showEntityMenu` callers set a host. `'detail'` never reaches it: `GroupBand.tsx:167` is a Set, and containers have no Edit Icon row (`entityMenu.ts:62-80`). The sidebar test's Collection case (`sidebarIconChoice.test.tsx:139`) drives the store directly and can't happen in the app.
- **X-4 • The Sidebar Needs No Plumbing to Pass a Trigger:** only three things reach `beginIcon` or `beginColor`: a sidebar leaf, which already passes `rowRef.current` (`Sidebar.tsx:145`); a Context group, which passes nothing (`:261-265`) but sits inside the zone `useLineEl` needs (`:385-386`), as `SidebarIconChoice` does; and the Matrix, which holds `anchor` (`MatrixView.tsx:69`). `Sidebar.tsx:231` and `GroupBand.tsx:167` pass no element, but containers have no Edit Icon, so nothing has to go through `Disclosure`.
- **X-5 • A Third Reader of the Floor:** `filter-frame.css.ts:7,20` reads `PANE_MIN_H` for the Filter pane's own floor, so the floor has a reader outside the slides.
- **X-6 • `PANE_SQUARE` Governs One Slot:** `LayoutFrame`'s inner slide already imposes 245 inside the detail slot, so 225×225 applies only to the view list.
- **X-7 • A Fifth Back Shape:** `MenuPresenter.Level`'s `onBack?: {label, back}` (`MenuPresenter.tsx:26`). F-1 names the settings frames only; the rename is four lines (see *§The Proposed Change*).
- **X-8 • The ⋮ Buttons Disagree Today:** `ViewItemMenu` is in-app always. `PropertyFrame.tsx:242` and `pageMenuActions.ts:81` omit the trigger, so theirs are system menus always, which contradicts `ConfigurationPM.md:32` ("the click-triggered lists that hang from a control").
- **X-9 • M-23 Doesn't Reach This:** it ruled out a shared *drill* pane. It didn't rule on the ceiling, but its reasoning stands, so *§Approaches* recommends no wrapper.

**The ⋮ Under F-6:** the view editor's ⋮ stays an in-app menu at its button, with its separator and content width, and deleting a view from its editor still closes the dropdown. The trigger is passed to `popMenu`, so under Use Native Menus it becomes a system menu at the button, which is what the setting's caption promises. Its glyphs take the 12px every other menu draws, against today's 13px, since `MenuPresenter` draws `control` (`MenuPresenter.tsx:15`).

**F-5:** `LayoutFrame.tsx:220` mounts `InlineEditHeader` with no icon, so it draws a disabled dashed square (`InlineEditHeader.tsx:49,52`), the only header that does. It should show the view's glyph and open the picker, which is two lines with F-2 (*§The Proposed Change*, Step 4).

**Placement for Nathan:** F-2 needs `Core/Assets/IconChoice.tsx` replaced by `Core/Assets/IdentityChoice.tsx`, which folds in `iconFavorites.ts`, since `IconChoice` was its only reader, and `useNexusIcon.ts` renamed `useNexusIcon.tsx` in the same folder, since it returns the photo cropper as `editor`, as `useBannerMenu` does, so `NexusIconEditors.tsx` leaves. Net file count: −3, from `ViewItemMenu.tsx`, `iconFavorites.ts`, and `NexusIconEditors.tsx`.

**In-Flight Calls, Disclosed:**

- F-7 sets the Properties list and the Preview Rules pane at 440, and the view list's floor at 245, which also stops its height changing across the slide on a sparse list. Roots without a back bar (`SettingsFrame`, `ViewFrame`'s list, `MatrixMenu`) stay at 320: they're index menus, and nothing asks for them to change. `manage-row.css.ts` puts no height on the Preview Rules host, so 440 fits.
- The ⋮ keeps its two glyphs through `icon` on the shared rows. The row menu carries them too, where they never draw: it's always a system menu, and `Desktop/Actions/menu.ts:19` drops icons. If the row menu ever draws in-app, as the Source's mobile prospect imagines, those two rows would need a second look.
- The sidebar test's Collection case leaves with the route (X-3).

---

#### 2. What's True

##### The Ceiling and the Floor

| Pane | Ceiling Today | Source |
|---|---|---|
| Group, Sort | 440 | Stated in the frame: `GroupFrame.tsx:230`, `SortFrame.tsx:112` |
| Layout (main, switches leaf) | 440 | Stated in the frame: `LayoutFrame.tsx:201,249` |
| Property editor | 440 | `PropertyFrame.tsx:331` |
| **Property list** | **320** | Nothing passed: `PropertyFrame.tsx:354` |
| **Visibility from Layout** | 440 | Prop: `LayoutFrame.tsx:213` |
| **Visibility from Settings** | **320** | Prop absent: `SettingsFrame.tsx:167-173`, default at `MenuRows.tsx:404` |
| Filter from a View, the Matrix | 440 | Prop: `ViewLeaf.tsx:48`, `MatrixMenu.tsx:129` |
| **Filter in Preview Rules** | **320** | Prop absent: `PreviewRulesRow.tsx:23-31` |

The defect is the prop. Frames that state their own ceiling can't vary by route; the two that take it from a caller do.

Floors: `PANE_MIN_W/H` 225×245 (`frame-slide.css.ts:5-6`) at `SettingsFrame.tsx:206-207`, `LayoutFrame.tsx:282-283`, `PropertyFrame.tsx:403-404`, `MatrixMenu.tsx:134-135`; `PANE_MIN_H` again at `filter-frame.css.ts:20`; `PANE_SQUARE` at `ViewFrame.tsx:41,223-224`. The floor lives in `frame-slide.css.ts`, the ceiling in `frames.css.ts:130`, and `FrameSlide` itself doesn't know either value.

##### The Back Bar

| Shape | Sites |
|---|---|
| Required `label` + `onBack` | `GroupFrame.tsx:115-116`, `SortFrame.tsx:33-34`, `ViewLeaf.tsx:19-20,26-27` |
| Defaulted `label='Settings'` + `current?` + `onBack` | `VisibilityFrame.tsx:80-83` |
| `back?: {label, onBack}` | `FilterFrame.tsx:219`, re-wrapped at `ViewLeaf.tsx:47`, built at `MatrixMenu.tsx:128` |
| Hard-coded label + `onBack` | `PropertyFrame.tsx:355`, `LayoutFrame.tsx:239-245` |

`SettingsFrame.tsx:193` and `LayoutFrame.tsx:193,211` each state their label per child. `SettingsFrame.tsx:182-183` passes `onBack={back}` and `onClose={back}` side by side.

`back: {label, onBack}` is the only shape that can be optional, which Filter needs under `PreviewRulesRow`, and it spreads straight onto `MenuTopRow`. Inner bars stay as they are: `PropertyFrame.tsx:258,318` and `LayoutFrame.tsx:200` are a frame's own navigation. Per F-4, Group, Sort, Filter, and Property keep their titles hard-coded. Visibility alone keeps `current` as a prop, since its title varies by route (`SettingsFrame.tsx:172` "Visibility", `LayoutFrame.tsx:212` "Layout").

##### `ViewItemMenu`

`ViewItemMenu.tsx:20-62` hand-builds what `popMenu(items, trigger, {solid: true})` renders. `viewRowMenuItems` (`Core/Actions/viewRowMenu.ts:11`) already models both actions. Duplicate repeats `ViewFrame.tsx:104`; delete repeats `:106` with a close added. The model for the button is `PropertyFrame.tsx:321-326`. `ViewTile`'s handlers don't share: they're tile-local (`persistConfig`, `presence.beginExit`, `askDeleteView('tile')`, `ViewTile.tsx:474-480`).

**What Moving It Changes (With the Trigger):**

| | Today | After, Use Native Menus Off | After, Use Native Menus On |
|---|---|---|---|
| Renderer | Own `PickerMenu solid` | `MenuPresenter`, `solid` | System menu at the button's box (`menuActions.ts:12-20`) |
| Glyphs | `body`, 13px | `control`, 12px (`MenuPresenter.tsx:15`) | None: "Icons are left behind on purpose" (`Desktop/Actions/menu.ts:19`) |
| Width | Content | Content, through `compact` (`MenuPresenter.tsx:58-59`) | The system's |
| Separator | Between its two rows | Between its two rows | Between its two rows |
| Origin | `auto` | `center` (`MenuPresenter.tsx:104`) | The system's |
| Disabled rows | Honored | Honored | Honored |

`AccessoryButton.onClick` takes no event (`MenuRows.tsx:302`), so the trigger comes from a ref.

##### `LayoutFrame`'s Flat Mode

`setFrame` is reachable only inside `door === 'full'` (`:258-270`), so in `'flat'` the `FrameSlide` at `:278` can't open, and it applies floors a second time inside `SettingsFrame`'s slot. `door` branches four times: header `:237-246`, title `:250-255`, body `:257-273`, and implicitly the slide. `schema` and `onClose` are read only by the full form.

##### `IconPicker`'s `onClose`: The True Extent

A shell here means a component that mounts `PickerMenu` and takes its dismissal from a parent.

| Shell | Prop |
|---|---|
| `IconPicker` (`IconPicker.tsx:26,42,61,90`) | **`onClose`** |
| `ColorPicker`, `FieldPicker`, `OptionEditPopup`, `PropertyPicker`, `MassPropertyPicker`, `TextPane` | `onDismiss` |

So the extent is `IconPicker` alone, plus the 13 pass-through sites and `IconPicker.test.tsx:27,51`.

**Stay as They Are:** `PropertyValueInput.onClose` (a router that adapts to shells at `:66,92,118` and also ends in-place inputs), `ValueEditor.onClose` (an editor's lifetime end), `pickOver`'s `onClose`, `ValueSeat`'s `host.onClose`, `CellEditor`, `WindowBase`, `TabItem`, and `ViewFrame.onClose`. `ImagePicker.onCancel` isn't a shell either: it mounts `ModalScrim` (`ImagePicker.tsx:19,214`).

The same origin holds the anchor bug. `triggerRef?` is optional with an "omit ⇒ mount point" fallback (`IconPicker.tsx:27-28`); `ColorPicker` requires its own (`ColorPicker.tsx:21`), and `ViewFrame.tsx:226-233` is the only production site that omits it.

##### `FilterFrame`'s `FieldPicker`

A local component (`FilterFrame.tsx:62`, used at `:407,422,475`) shadows `UIX/Pickers/FieldPicker.tsx:25`. D-F10's routing through the door isn't taken: F-3 asks for the rename, and the operator list's `CheckboxGlyph` leads (`:396-402,440`) can't ride `MenuDoor`'s string icons.

##### F-2: Every Site, Measured

| # | Site | Trigger | Who Holds "Open" | Value | Reads Open for Its Own UI |
|---|---|---|---|---|---|
| 1 | `SettingsFrame.tsx:209` | Header button | Local bool | `view.icon` or `node.icon` | `iconOpen` |
| 2 | `PageMenu.tsx:88` | Header button | Local bool | `ownIcon` | `iconOpen` |
| 3 | `SpaceMenu.tsx:113` | Header button, or a right-click | Local bool | `node.icon` | `iconOpen` |
| 4 | `PropertyFrame.tsx:406` | Header button | Local id | `editing.icon` | `iconOpen`; closes when the editor leaves |
| 5 | `Banner.tsx:159` | Title glyph | Local bool | `owner.icon` | `iconEditing` |
| 6 | `PageHeader.tsx:91` | Title glyph | Local bool | `meta.icon` | `iconEditing` |
| 7 | `OptionEditPopup.tsx:99` | Icon seat | Local bool | `option.icon` | `iconSeatActive` |
| 8 | `ViewFrame.tsx:226` | Row, from a native menu | Local view | Snapshot | None |
| 9 | `ViewTile.tsx:673` | Row, or title glyph | Local union | By id | `anchoredOpen`, title reveal |
| 10 | `useViewInteractions.tsx:383` | Row, from a native menu | Local + snapshot | Snapshot | Ghost suppression |
| 11 | `Sidebar.tsx:299` | Row, resolved by path after the fact | Store | Looked up | None |
| 12 | `MatrixLabel.tsx:159` | Node anchor | Store | `rec.icon` | Keeps the label live |
| 13 | `NexusIconEditors.tsx:16` | Passed in (3 callers) | Hook | `profileIcon` | `Banner.tsx:130` |

`ColorPicker`: `SpaceMenu.tsx:123`, `ViewTile.tsx:688`, `ViewFrame.tsx:234`, `MatrixLabel.tsx:167`, and `ColorSwatch.tsx:45` in UIX. `OptionEditPopup` inlines `ColorGrid`, which isn't a summon.

**What's Truly the Same:** every site is one trigger, one current value, and one write on pick, and every pick closes (`IconPicker.tsx:59-62`; the four Core `ColorPicker` sites and `ColorSwatch` each close by hand). Only one can be open at a time, since the shield is up. Sites differ only in what they write and where the trigger comes from.

**What's Different:**

- Eleven of the 13 sites read "is mine open" for their own UI. The request's trigger is that identity.
- The store model exists for one reason: `runEntityAction` is a module function with no component. It doesn't need a component if it's handed the trigger, and `showEntityMenu` already has one.
- Every local site holds its own target state only so the mount, far from the gesture, can find the target. A closure at the gesture needs none of it.

**A Local Mount's Hidden Job:** a picker dies with its host. `PropertyFrame.test.tsx:711-727` pins that for the editor. Other hosts get it by accident, through `return null` at `PageMenu.tsx:35`, `SpaceMenu.tsx:41`, and `MatrixLabel.tsx:141`, which is what `PickerMenu.tsx:137` warns about. Rows don't get it at all: `ViewFrame`, `ViewTile`, and `useViewInteractions` leave a picker on a detached trigger, which then measures zeros. `ValueSeat.tsx:87-90` already states the rule for its own panes: "A pane whose anchor left the page closes."

**Timing:** `FrameSlide` holds an outgoing detail through its exit (`FrameSlide.tsx:42-44`), so a trigger inside that detail stays connected for 305ms (`exitWait('base')`, `motion.ts:26-27`) after its pane leaves. Under an App-level mount, `PropertyFrame`'s picker therefore outlives its editor by up to that long, on the rare path where an editor leaves under an open picker, since the shield stops the user from causing it. The trigger rule then closes it, so that site needs no dismiss of its own.

---

#### 3. Removal Inventory

##### F-1 and F-3

| What Leaves | Where |
|---|---|
| `ViewItemMenu.tsx` (65 lines) | Whole file; import at `LayoutFrame.tsx:32` |
| `maxHeight` prop on `VisibilityFrame` | `VisibilityFrame.tsx:84,93,124` |
| `maxHeight` prop on `FilterFrame` | `FilterFrame.tsx:211,221,493` |
| The callers' `maxHeight` | `ViewLeaf.tsx:10,48`, `MatrixMenu.tsx:14,129`, `LayoutFrame.tsx:213` |
| `label` + `onBack` props | `GroupFrame.tsx:115-116`, `SortFrame.tsx:33-34`, `VisibilityFrame.tsx:80,82`, `ViewLeaf.tsx:19-20`, `PropertyFrame` `onBack`, `LayoutFrame.tsx:121,128` |
| The re-wrap | `ViewLeaf.tsx:47` |
| `door`'s three inline branches and `onClose` on `LayoutFrame`; the inert slide | `LayoutFrame.tsx:122,129,237-246,250-255,257-273` |
| `onClose={back}`, `schema`, `onBack` on the flat mount | `SettingsFrame.tsx:180-183` |
| `PANE_SQUARE` | `ViewFrame.tsx:41,223-224` |
| `PANE_MIN_W`, `PANE_MIN_H` and their knob comment | `frame-slide.css.ts:4-6`; imports at `SettingsFrame.tsx:19`, `LayoutFrame.tsx:30`, `PropertyFrame.tsx:43`, `MatrixMenu.tsx:13`, `filter-frame.css.ts:7` |
| `VIEW_SETTINGS_MAX_HEIGHT` (renamed) | `frames.css.ts:130` |
| The optional `triggerRef` and its fallback line | `IconPicker.tsx:27-28` |
| `onClose` on `IconPicker` | `IconPicker.tsx:26,42,61,90` |
| The local name `FieldPicker` | `FilterFrame.tsx:62,407,421,422,463,475,482` |

##### F-2

| What Leaves | Where |
|---|---|
| `IconChoice.tsx` | Whole file; imports at all 13 sites |
| `iconFavorites.ts` | Whole file; `useIconFavorites` folds into `IdentityChoice.tsx` |
| `iconPath`, `iconHost`, `beginIcon`, `endIcon`, `colorPath`, `colorHost`, `beginColor`, `endColor` | `editSlice.ts:34-41,59-62,153-156` |
| `SidebarIconChoice` | `Sidebar.tsx:284-315,370`; imports `:36,47` |
| `picking` prop, both pickers, `endIcon`, `endColor`, `mutate` | `MatrixLabel.tsx:38,49,56-58,159-177`; imports `:5,8,12,17` |
| `iconPath`, `colorPath`, `pickingId`, `pickKind`, `picker` | `MatrixView.tsx:37-38,112-115,124-125,162` |
| `iconOpen`, `iconTarget`, `iconAnchor`, `openIconPicker`, `iconPicker` | `useViewInteractions.tsx:374-393,477`; `TableView.tsx:337`, `CardsView.tsx:472` |
| `iconFor`, `colorFor`, `menuAnchorRef`, both mounts | `ViewFrame.tsx:58-60,226-243` |
| `iconFor`, `colorFor`, both mounts | `ViewTile.tsx:236-237,273-274,673-698` |
| `iconRef`, `colorAnchor`, `pickerOpen`, `colorOpen`, `openColor`, both mounts | `SpaceMenu.tsx:33,35-37,46-49,113-132` |
| Ref-and-state pair and mount | `SettingsFrame.tsx:71-72,209-218`; `PageMenu.tsx:29-30,88-96`; `PropertyFrame.tsx:180-181,406-414`; `Banner.tsx:99-100,156-173`; `PageHeader.tsx:39,47,91-97`; `OptionEditPopup.tsx:46-47,99-105` |
| `'glyph'` editor state, `selectGlyph`'s export | `useNexusIcon.ts:14,23,41-42,67` |
| `NexusIconEditors.tsx` | Whole file; the cropper returns from `useNexusIcon` as `editor` |
| `ColorSwatch`'s `ColorPicker` mount and import, `onPick`, `greyscale`, `open`, `chipRef` | `UIX/Controls/ColorSwatch.tsx:1-2,12-13,18-19,22-23,28,45-55` |
| `iconEditing`, `onEditIcon` (renamed `iconOpen`, `onIconClick`) | `DetailTitleHeader.tsx:35,38` |
| `key={iconTarget?.path}` | `useViewInteractions.tsx:384` |

---

#### 4. Approaches

##### The Ceiling and the Floor

**A • Remove the Prop (Recommended):** Visibility and Filter state the ceiling themselves, as Group and Sort do, and `PropertyFrame`'s list does too. Both knobs sit together in `frames.css.ts`, and the floor is one object spread onto each slide. Adds nothing and fixes the root cause, which is the prop.

**B • A `SettingsPane` Component:** a wrapper over `MenuScrollFrame` and `MenuTopRow` taking `back`, `title`, `trailing`, and `footer`. It would serve 9 sites, adds about 16 lines, and removes about 40, so it's about −25 further and leaves one place stating the ceiling. It's also a new kit concept, next to M-23's ruling against one, for a problem the prop's removal has already solved. **Not recommended.** It's the clean next step if settings panes ever need a shared behavior.

##### `LayoutFrame`

- **Bare Return:** `if (door === 'flat') return mainFrame`. One line, but three ternaries stay.
- **One Early Return (Recommended):** the flat form states itself once, at about zero net lines, and everything after it reads as the view editor with no branches. No new component.
- **Split Into Two Components:** removes `door`, but `grid` and `cardsRows` close over `view` and `write`, so they become components. About +6 lines net for the same result.

##### F-2

**(a) Local Hooks, Store Kept:** a `useIconChoice` returning button props and a picker element, plus an anchored-picker hook for row flows, with `Sidebar` and the Matrix staying on the store. About −90. Keeps both summon models with a reason, and 5 mount sites in source, and the anchor bug class remains possible at every hook call.

**(b) One Request, One Mount (Recommended):** one `pendingChoice` slot and one `IdentityChoice` at App level, beside `MenuPresenter` and `MenuSeat`. Net about −170 with F-5 and `ColorSwatch`'s press, counted site by site. One model, and a site can't forget its anchor, since the trigger is a required argument.

- **Costs:** a third App-level request slot, one new kit rule (a pane whose trigger leaves closes), and the sidebar test's rewrite.
- **Why It's Not New Mechanism:** `requestPick`/`dismissPick`/`MenuSeat` is this exact shape; `presentMenu`/`MenuPresenter` proves stacking, dismissal, and focus over dropdowns and pop-ups, since every `PickerControl` already rides it.
- **Why a Separate Slot Instead of Sharing `pendingMenu`:** `IconPicker` and `ColorPicker` carry their own `PickerMenu` shell props, so `MenuPresenter` couldn't share one shell anyway, and narrowing `pendingMenu` at each read would make the menu slot harder to read. D-6 and the door's reach also argue for leaving `MenuPresenter` alone.
- **What It Also Enables:** D-4's one page-menu runner. Edit Icon is two routes today (`runTitleAction:423`, `runEntityAction:102`); with (b) it's one `chooseIcon` on any surface. Under (a) that runner would need a host dispatch.

**(c) Headers Only:** just the hook for sites 1-7. About −50. Leaves the row flows, which are the larger duplication.

**Rejected Pieces:**

- **`IdentityHeader` Component:** `SpaceMenu`'s right-click needs to open the header's picker from outside (`SpaceMenu.tsx:62`), and sites 5-7 aren't `InlineEditHeader`. A hook serves all seven. `DetailTitleHeader` and `InlineEditHeader` stay separate; only the wiring around them consolidates.
- **`HomepageMenu` Onto `InlineEditHeader`:** needs a photo slot, an aria-label prop, and a title-only read-only state for one caller: about −6 lines for three props. It joins F-2 only through `useNexusIcon`.
- **`PageMenu` and `SpaceMenu` Merged:** after F-2, what they share is a header, a panel, and the experimental Connections row, with different footers. Not worth a component.
- **`ColorSwatch` Keeping Its Own `ColorPicker`:** UIX can't reach the session, and it doesn't need to: the swatch reports its press through `onPress`, and its two Core callers call `chooseColor`, as `PickerControl` already reaches an App-level pane through a door Core sets. That cuts the third path from Menus to Pickers and leaves `ColorPicker` one mount, whose `open`/`onDismiss`/`triggerRef` contract serves `IdentityChoice` alone.

**What Must Live in Core:** the slot, `IdentityChoice`, `chooseIcon`, `chooseColor`, `useIconChoice`, and `useIconFavorites`, since favorites need the session (`iconFavorites.ts:11`). UIX keeps `IconPicker`, `ColorPicker`, `InlineEditHeader`, and gains only the `PickerMenu` rule and `ColorSwatch`'s `onPress`.

---

#### 5. The Proposed Change

Order is removal first. Steps 1 to 5 assume nothing about F-2, apart from Step 4's icon lines, which land with Step 6, and Step 6 takes (b).

##### Step 1 • One Home for the Floor and Ceiling

`UIX/Menus/frames.css.ts:129-130` should say:

```ts
/** KNOB — a settings pane's box: the floor it keeps under its slides, and a ceiling above MENU_MAX_HEIGHT so the middle region's rows sit beneath the tallest stack of controls. */
export const SETTINGS_PANE_FLOOR = { minWidth: 225, minHeight: 245 }
export const SETTINGS_PANE_MAX_HEIGHT = 440
```

`UIX/Menus/frame-slide.css.ts:4-6` is deleted. `Core/Views/Settings/filter-frame.css.ts:7,20` reads `SETTINGS_PANE_FLOOR.minHeight` from the `frames.css` import it already has.

Each of the five slides (`SettingsFrame.tsx:202`, `LayoutFrame.tsx:278`, `ViewFrame.tsx:219`, `PropertyFrame.tsx:399`, `MatrixMenu.tsx:117`) replaces its two floor lines with the spread:

```tsx
<FrameSlide {...SETTINGS_PANE_FLOOR} open={!!editing} root={list} detail={detail} />
```

`ViewFrame.tsx:41` is deleted. Every remaining `VIEW_SETTINGS_MAX_HEIGHT` becomes `SETTINGS_PANE_MAX_HEIGHT`.

- `VisibilityFrame.tsx:124` and `FilterFrame.tsx:493` read `maxHeight={SETTINGS_PANE_MAX_HEIGHT}`; both props leave.
- `ViewLeaf.tsx:10,48`, `MatrixMenu.tsx:14,129`, `LayoutFrame.tsx:213` are deleted.
- `PropertyFrame.tsx:354` gains `maxHeight={s.SETTINGS_PANE_MAX_HEIGHT}`.

##### Step 2 • One Back Shape

`UIX/Menus/MenuRows.tsx:30-42`, imported by path:

```tsx
export type MenuBack = { label: string; onBack: () => void }

export function MenuTopRow({
  label,
  onBack,
  trailing,
  current,
}: MenuBack & {
  trailing?: ReactNode
  current?: string
}): React.JSX.Element {
```

Then:

| Site | Now | Should Say |
|---|---|---|
| `GroupFrame.tsx:228` | `<MenuTopRow label={label} current="Grouping" onBack={onBack} />` | `<MenuTopRow {...back} current="Grouping" />` |
| `SortFrame.tsx:111` | Same, `"Sorting"` | `<MenuTopRow {...back} current="Sorting" />` |
| `FilterFrame.tsx:494` | `back && <MenuTopRow label={back.label} current="Filtering" onBack={back.onBack} />` | `back && <MenuTopRow {...back} current="Filtering" />` |
| `VisibilityFrame.tsx:122` | `label={label} current={current} onBack={onBack}` | `<MenuTopRow {...back} current={current} />` |
| `PropertyFrame.tsx:355` | `label="Settings" current="Properties" onBack={onBack}` | `<MenuTopRow {...back} current="Properties" />` |
| `ViewLeaf.tsx:34,37,47` | `label={label} onBack={onBack}`; `back={{ label, onBack }}` | `back={back}` at all three |

Props: `back: MenuBack` on Group, Sort, Visibility, Property, `ViewLeaf`, and `LayoutFrame`; `back?: MenuBack` stays on Filter; `current: string` becomes required on Visibility, and its default goes.

`SettingsFrame.tsx:81` should say:

```tsx
const toRoot: MenuBack = { label: 'Settings', onBack: () => setPane('root') }
```

with `back={toRoot}` at each of the four children. `LayoutFrame.tsx:184` should say:

```tsx
const toView: MenuBack = { label: 'Views', onBack: () => setFrame(null) }
```

with `back={toView}` at `:193` and `:211`, and `<MenuTopRow {...toView} current="Layout" />` at `:200`.

`MenuPresenter.tsx:20,26,64,75` takes the same shape: `back?: MenuBack`, `<MenuTopRow {...back} current={title} />`, and `back={{ label: title, onBack: () => setBranchAt(null) }}`.

##### Step 3 • `ViewItemMenu` Onto `popMenu`

`ViewItemMenu.tsx` is deleted. `Core/Actions/viewRowMenu.ts` should say the following, with the ⋮'s rows on the file's own `ViewRowAction` and `ViewRowMenuContext`, which already cover them:

```ts
import { type ActionItem, joinGroups } from './menuModel'

type ViewRowAction = 'rename' | 'icon' | 'color' | 'titles' | 'duplicate' | 'delete'

interface ViewRowMenuContext {
  titlesShown?: boolean
  deletable: boolean
  duplicable: boolean
}

const itemRows = (ctx: ViewRowMenuContext): ActionItem<ViewRowAction>[] => [
  { label: 'Duplicate', action: 'duplicate', icon: 'copy', disabled: !ctx.duplicable },
  { label: 'Delete', action: 'delete', icon: 'trash', disabled: !ctx.deletable },
]

export const viewItemMenuItems = (ctx: ViewRowMenuContext): ActionItem<ViewRowAction>[] =>
  joinGroups(itemRows(ctx).map((row) => [row]))

export function viewRowMenuItems(ctx: ViewRowMenuContext): ActionItem<ViewRowAction>[] {
  return joinGroups<ViewRowAction>([
    [
      { label: 'Rename', action: 'rename' },
      { label: 'Edit Icon', action: 'icon' },
      { label: 'Edit Color', action: 'color' },
      ...(ctx.titlesShown === undefined
        ? []
        : [{ label: ctx.titlesShown ? 'Hide Titles' : 'Show Titles', action: 'titles' as const }]),
    ],
    itemRows(ctx),
  ])
}
```

The handlers share in `ViewFrame`, which already imports everything they need, so `LayoutFrame` imports none of it:

```tsx
const itemContext = { deletable: views.length > 1, duplicable: views.length > 0 }
const duplicate = (v: SavedView): void =>
  void dialer().ask('views:duplicate', node.path, node.kind, v.id).then(reportRefusal)
const editorMenu = async (v: SavedView, trigger: HTMLElement): Promise<void> => {
  const action = await popMenu(viewItemMenuItems(itemContext), trigger, { solid: true, compact: true })
  if (action === 'duplicate') duplicate(v)
  else if (action === 'delete' && (await deleteViewWithUndo(node, v))) onClose()
}
```

`ViewFrame.tsx:94` passes `itemContext`, `:104` calls `duplicate(v)`, and `:207-214` should say:

```tsx
<LayoutFrame
  door="full"
  source={node}
  view={editingLive}
  schema={schema}
  back={{ label: 'Views', onBack: () => setEditingId(null) }}
  onMenu={(trigger) => void editorMenu(editingLive, trigger)}
/>
```

`ViewFrame` keeps `onClose`, so deleting a view from its editor still closes the dropdown (F-6).

##### Step 4 • `LayoutFrame`'s Flat Mode

`LayoutFrame.tsx:116-130` should say:

```tsx
export function LayoutFrame(
  props: {
    source: CollectionNode | SetNode
    view: SavedView
    back: MenuBack
  } & (
    | { door: 'flat' }
    | { door: 'full'; schema: PropertyDefinition[]; onMenu: (trigger: HTMLElement) => void }
  ),
): React.JSX.Element {
  const { source, view, back } = props
  const [frame, setFrame] = useState<ViewRowId | null>(null)
  const menuRef = useRef<HTMLButtonElement>(null)
  const iconChoice = useIconChoice(view.icon, (icon) => write({ icon }))
```

`useIconChoice` lands with Step 6, and with `title`'s line below, it's the two lines F-5 asks for.

After `grid` is built, `:237-275` should say:

```tsx
if (props.door === 'flat')
  return (
    <MenuScrollFrame
      header={<MenuTopRow {...back} current="Layout" />}
      footer={cardsRows}
      maxHeight={SETTINGS_PANE_MAX_HEIGHT}
    >
      {grid}
      <ViewSwitches source={source} view={view} switches={options.switches} separated />
    </MenuScrollFrame>
  )

const mainFrame = (
  <MenuScrollFrame
    header={
      <MenuTopRow
        {...back}
        trailing={
          <AccessoryButton
            ref={menuRef}
            icon="ellipsis-vertical"
            size="body"
            ariaLabel="View menu"
            onClick={() => menuRef.current && props.onMenu(menuRef.current)}
          />
        }
      />
    }
    footer={cardsRows}
    maxHeight={SETTINGS_PANE_MAX_HEIGHT}
  >
    {title}
    <MenuSeparator flush />
    {grid}
    <MenuIndex sections={[{ rows: VIEW_ROWS.map(/* unchanged, :261-267 */) }]} />
  </MenuScrollFrame>
)
```

`title` reads `<InlineEditHeader value={view.name} icon={viewGlyph(view)} onCommit={rename} {...iconChoice} />` once Step 6 lands. `SettingsFrame.tsx:177-184` becomes `<LayoutFrame door="flat" source={node} view={view} back={toRoot} />`. `toView` and `leafFor` (`:184-218`) move below the early return, since only the full form calls them and `props` narrows there, so `leafFor` reads `props.schema`. `ViewItemMenu`'s import goes, and `useRef` joins `:1`.

##### Step 5 • Rename `FilterFrame`'s `FieldPicker`

`RuleField`, the sibling of `ChipsField`, at `FilterFrame.tsx:62,407,421,422,463,475,482`. No symbol by that name exists.

##### Step 6 • One Icon and Color Request

`Core/Session/chromeSlice.ts`, after `ValuePickRequest`:

```ts
type ChoiceRequest = { trigger: Element; value?: string } & (
  | { of: 'icon'; onPick: (icon: string) => void }
  | { of: 'color'; onPick: (color: string | undefined) => void; greyscale?: boolean }
)
```

```ts
pendingChoice: ChoiceRequest | null
requestChoice: (req: ChoiceRequest) => void
dismissChoice: () => void
```

```ts
pendingChoice: null,
requestChoice: (req) => set({ pendingChoice: req }),
dismissChoice: () => set({ pendingChoice: null }),
```

```ts
export const pickOpen = (s: Pick<ChromeSlice, 'pendingPick' | 'pendingChoice'>): boolean =>
  s.pendingPick !== null || s.pendingChoice !== null
```

`resetChrome` (`:92-98`) gains `pendingChoice: null`. `nexusSlice.ts:93` already calls it.

`Core/Assets/IdentityChoice.tsx`, replacing `IconChoice.tsx` and `iconFavorites.ts`:

```tsx
import { type RefObject, useCallback, useRef } from 'react'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { ColorPicker } from '@pommora/uix/Pickers/ColorPicker'
import { type IconFavorites, IconPicker } from '@pommora/uix/Pickers/IconPicker'
import { colorNameFor } from '@pommora/uix/Theme/ramp'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { iconFavoriteMenuItems } from '../Actions/identityMenus'
import { popMenu } from '../Actions/menuActions'
import { personalizationOf } from '../Session/configSlice'
import { useSession } from '../Session/store'

const NO_FAVORITES: string[] = []

function useIconFavorites(): IconFavorites {
  const ids = useSession((st) => personalizationOf(st).iconFavorites) ?? NO_FAVORITES
  const setPersonalization = useSession((st) => st.setPersonalization)
  const onChange = useCallback(
    (next: string[]) => setPersonalization('iconFavorites', next.length ? next : undefined),
    [setPersonalization],
  )
  return {
    ids,
    onChange,
    onMenu: (isIconFavorite) => popMenu(iconFavoriteMenuItems(isIconFavorite)),
  }
}

export function chooseIcon(
  trigger: Element | null,
  value: string | undefined,
  onPick: (icon: string) => void,
): void {
  if (trigger) useSession.getState().requestChoice({ of: 'icon', trigger, value, onPick })
}

export function chooseColor(
  trigger: Element | null,
  value: string | undefined,
  onPick: (color: string | undefined) => void,
  greyscale?: boolean,
): void {
  if (trigger) useSession.getState().requestChoice({ of: 'color', trigger, value, onPick, greyscale })
}

export const useChoiceOpen = (trigger: RefObject<Element | null>): boolean =>
  useSession((st) => st.pendingChoice !== null && st.pendingChoice.trigger === trigger.current)

export function useIconChoice<E extends Element = HTMLButtonElement>(
  value: string | undefined,
  onPick: (icon: string) => void,
) {
  const iconRef = useRef<E>(null)
  return {
    iconRef,
    iconOpen: useChoiceOpen(iconRef),
    onIconClick: () => chooseIcon(iconRef.current, value, onPick),
  }
}

export function IdentityChoice(): React.JSX.Element {
  const pending = useSession((st) => st.pendingChoice)
  const dismiss = useSession((st) => st.dismissChoice)
  const shown = useHeld(pending, pending !== null)
  const triggerRef = useLatest(shown?.trigger ?? null)
  const iconFavorites = useIconFavorites()
  return (
    <>
      <IconPicker
        open={pending?.of === 'icon'}
        onDismiss={dismiss}
        triggerRef={triggerRef}
        value={pending?.value}
        onSelect={pending?.of === 'icon' ? pending.onPick : undefined}
        iconFavorites={iconFavorites}
      />
      <ColorPicker
        greyscale={pending?.of === 'color' ? pending.greyscale : undefined}
        open={pending?.of === 'color'}
        selected={colorNameFor(pending?.value)}
        onPick={(color) => {
          if (pending?.of === 'color') pending.onPick(color)
          dismiss()
        }}
        onDismiss={dismiss}
        triggerRef={triggerRef}
      />
    </>
  )
}
```

`useHeld` keeps the trigger through the exit, as `MenuPresenter.tsx:87-88` does, since the dismissal stack reads it then and a null ref falls back to the App root. `useLatest` assigns during render (`stableApi.ts:8`), so the ref is current before the child's layout effect reads it. `useIconFavorites` folds in, since `IconChoice` was its only reader. `App.tsx:197` mounts `<IdentityChoice />` once, beside `MenuPresenter` and `MenuSeat`.

`UIX/Pickers/PickerMenu.tsx`, at the head of `measure` (`:201`), with `const dismissRef = useLatest(onDismiss)` in the component body beside `liveRef`:

```tsx
if (trigger && !point && !trigger.isConnected) return dismissRef.current?.()
```

This is the existing `ResizeObserver` on the trigger (`:256`), which fires on removal. It gives every shell the rule `ValueSeat.tsx:87` states for itself, and `ValueSeat` keeps its half, since it also closes inline editors.

`UIX/Pickers/IconPicker.tsx`: `onClose` becomes `onDismiss` at `:26,42,61,90`, `triggerRef` is required, and `IconPickerProps` stops being exported, since `IconChoice.tsx` was its only outside reader:

```tsx
/** An SVG glyph, so `Element`. */
triggerRef: RefObject<Element | null>
```

**The Sites:**

`SettingsFrame.tsx`, after `:77`:

```tsx
const iconChoice = useIconChoice(scope ? view.icon : node.icon, (icon) => {
  if (scope) void saveView(view, { icon })
  else void mutate({ op: 'setIcon', path: node.path, kind: node.kind, icon })
})
```

and `:95-97` become `{...iconChoice}`. `PageMenu`, `PropertyFrame`, and `OptionEditPopup` take the same shape:

```tsx
// PageMenu.tsx, before the early return
const iconChoice = useIconChoice(ownIcon, (icon) => {
  if (pageDetail) void mutate({ op: 'setIcon', path: pageDetail.path, kind: 'page', icon })
})

// PropertyFrame.tsx, after `configure`
const iconChoice = useIconChoice(editing?.icon, (icon) => {
  if (editing) configure(editing.id, { icon })
})

// OptionEditPopup.tsx:46-47
const { iconRef, iconOpen, onIconClick } = useIconChoice(option.icon, onPickIcon)
```

`SpaceMenu.tsx`:

```tsx
const colorRef = useRef<HTMLButtonElement>(null)
const colorOpen = useChoiceOpen(colorRef)
const iconChoice = useIconChoice(node?.icon, (icon) => {
  if (node) void mutate({ op: 'setIcon', path: node.path, kind: 'space', icon })
})
// after the early return
const openColor = (anchor: Element | null): void =>
  chooseColor(anchor, node.color, (color) => void mutate({ op: 'setSpaceColor', spaceId: id, color }))
```

`:62` calls `iconChoice.onIconClick()`, and `:77` is `pressed={colorOpen}`. Both mounts and the fragment go.

`ViewFrame.tsx:90-110`:

```tsx
const rowMenu = async (v: SavedView, e: React.MouseEvent<HTMLElement>): Promise<void> => {
  e.preventDefault()
  const anchor = e.currentTarget
  const action = await popMenu(viewRowMenuItems(itemContext))
  switch (action) {
    case 'rename':
      return setRenamingId(v.id)
    case 'icon':
      return chooseIcon(anchor, v.icon, (icon) => void saveView(v, { icon }))
    case 'color':
      return chooseColor(anchor, v.color, (color) => void saveView(v, { color }))
    case 'duplicate':
      return duplicate(v)
    case 'delete':
      return void deleteViewWithUndo(node, v)
    default:
      return
  }
}
```

This is F-1's anchor fix, and with a required trigger the bug can't return.

`ViewTile.tsx`:

```tsx
const titleIconOpen = useChoiceOpen(titleIconRef)
const rowChoiceOpen = useChoiceOpen(menuAnchorRef)
```

`anchoredOpen` (`:273-274`) reads `rowChoiceOpen || titleIconOpen`; `:598` reads `!titleIconOpen`; `:433-435` call `chooseIcon(titleIconRef.current, entry.display_icon ?? source.icon, (icon) => patchEntry({ display_icon: icon }))`; and `:470-473` become, at `menuAnchorRef.current`, the ref `rowMenu` already writes (`:459`):

```tsx
case 'icon':
  return chooseIcon(menuAnchorRef.current, viewById(id)?.icon, (icon) => persistConfig(id, { icon }))
case 'color':
  return chooseColor(menuAnchorRef.current, viewById(id)?.color, (color) => persistConfig(id, { color }))
```

`rowChoiceOpen` reads the request's own trigger rather than the tile's DOM, so a row inside the views-list pane, which sits in a portal outside the tile, holds the strip as a strip row does.

`useViewInteractions.tsx`:

```tsx
case 'title:icon':
  chooseIcon(anchor, row.icon, (icon) => void mutate({ op: 'setIcon', path: row.path, kind: 'page', icon }))
  return true
```

and `:442` reads `suppressed: () => pickOpen(useSession.getState()) || policy.ghost.suppressed()`. `runTitleAction` leaves in the right-click work that follows, where `showPageMenu` answers `title:icon` itself through `chooseIcon`, one closure for every host.

`entityMenuActions.ts`: `showEntityMenu(target, trigger: HTMLElement | null = null)` hands `runEntityAction` its `trigger`, so `chooseIcon` and `chooseColor` take it with no bridge, and `MatrixView.tsx:69` ends in `null`. `:102-108` should say the following. The right-click work then drops `case 'title:icon'` here, since a page's Edit Icon runs through `showPageMenu`, and `ownIconOf`'s second arm reads `target.id ? spaceNodeOf(tree, target.id)?.icon : undefined`, as `changeColor` reads beside it.

```ts
case 'title:icon':
case 'editIcon':
  chooseIcon(trigger, ownIconOf(s.tree, target), (icon) =>
    void s.mutate({ op: 'setIcon', path, kind, icon }),
  )
  return
case 'changeColor':
  if (id)
    chooseColor(trigger, spaceNodeOf(s.tree, id)?.color, (color) =>
      void s.mutate({ op: 'setSpaceColor', spaceId: id, color }),
    )
  return
```

with:

```ts
const ownIconOf = (tree: NexusTree | null, target: EntityMenuTarget): string | undefined =>
  target.kind === 'context'
    ? tree?.contexts.find((g) => g.def.title === target.title)?.def.icon
    : target.id && tree
      ? nodesByIdOf(tree).get(target.id)?.ownIcon
      : undefined
```

`Sidebar.tsx`: `SidebarIconChoice` leaves (`:284-315,370`); `ContextGroupDisclosure` takes `const rowEl = useLineEl()` and `:263` passes `rowEl(group.def.id)` to `showEntityMenu` as the trigger; `:93`'s `trigger ?? undefined` leaves. `:328` reads `suppressed: () => { const s = useSession.getState(); return s.renamingPath !== null || pickOpen(s) || glanceShown() }`.

`MatrixView.tsx`:

`:45` is `useSession(pickOpen)`; `:82` is `if (!pickOpen(useSession.getState())) setMenuId(null)`; and `:120` is `: ((mine ? menuId : null) ?? hoveredId)`. `menuId` already holds the node through a value pick, and these three lines hold it through a choice as well.

`Banner.tsx` and `PageHeader.tsx` spread `useIconChoice<Element>(…)` onto `DetailTitleHeader`, whose `iconEditing` and `onEditIcon` become `iconOpen` and `onIconClick`. In `Banner`:

```tsx
const iconChoice = useIconChoice<Element>(owner.icon, (icon) =>
  void mutate({ op: 'setIcon', path: owner.path, kind: owner.kind as HeldKind, icon }),
)
const nexusIcon = useNexusIcon(iconChoice.iconRef)
```

with `iconOpen={iconChoice.iconOpen || (home && nexusIcon.editing !== null)}` after the spread, and `:156-173` becoming `{home && nexusIcon.editor}`.

`useNexusIcon(trigger: RefObject<Element | null>)`, renamed `useNexusIcon.tsx`: `:23` is `if (action === 'editIcon') chooseIcon(trigger.current, profileIcon, selectGlyph)`; its state renames to `editing` and drops `'glyph'`; it returns the `ImagePicker` cropper as `editor`, as `useBannerMenu` does; `selectGlyph` drops `closeEditor()` and its export. `NexusPhoto.tsx:15,39` and `HomepageMenu.tsx:18,45` pass their refs and draw `{icon.editor}`, so `NexusIconEditors.tsx` leaves.

`UIX/Controls/ColorSwatch.tsx`: `onPick` and `greyscale` become `onPress: (chip: HTMLElement) => void`; the button reads `onClick={(e) => onPress(e.currentTarget)}`; `useState`, `useRef`, `chipRef`, the `ColorPicker` mount, and its import leave. `Trailing`'s `color` keeps its kind, since it takes `ColorSwatch`'s props (`MenuIndex.tsx:22`). Its two Core callers call `chooseColor`, as `PickerControl` already reaches an App-level pane through a door Core sets, which cuts the third path from Menus to Pickers:

```tsx
// typeRows.tsx:82
item('Color', { kind: 'color', label: 'Color', selected: name, css, onPress: (chip) => chooseColor(chip, name, onPick, false) })

// SettingsWindow.tsx:206-213, in place of `greyscale` and `onPick`
onPress: (chip) => chooseColor(chip, name, (next) => setPersonalization(row.key, next as never), row.greyscale ?? false),
```

The settings row passes `row.greyscale ?? false`, since the swatch defaulted `greyscale` to false where the picker defaults it to true.

**Delta:**

| Group | Net (+ / −) |
|---|---|
| Steps 1-2: Floors, Ceilings, Back Bars | About −25 (+12 / −37) |
| Step 3: `ViewItemMenu` | About −45 (+22 / −67) |
| Step 4: Flat Mode | About 0 (+12 / −12) |
| Step 5: Rename | 0 |
| Step 6: F-2 (b), With F-5 and `ColorSwatch` | About −170 |
| **Total** | **About −240** |

---

#### 6. Goes False

**Documents:**

- `.claude/Resources/PommoraUIX.md:383`: "the app binds icon favorites through `UIX/Pickers/IconPicker`" should name `Core/Assets/IdentityChoice`.
- `.claude/Resources/PommoraUIX.md:255`: `ColorSwatch`'s "The switch shape holding a color, anchoring a ColorPicker" should say the swatch reports its press.
- `.claude/Features/ViewTypesPM.md:122`: "The value, add, icon, and image pickers mount at the grid level" drops "icon".
- `.claude/IssuesPM.md:1322` (`[^51]`): `PropertyFrame.tsx:399-405` moves; re-cite in E-4's citation pass.
- `.claude/Features/ViewTypesPM.md:62`: "the flat door" holds.
- `.claude/Features/ConfigurationPM.md:32`, `MatrixPM.md:49`, `ContextsPM.md:37`, `InteractionPM.md:48`, and `SymbolsPM.md:67` hold. `ConfigurationPM.md:32` becomes true of this ⋮, and the Property and Page ⋮ stay system menus always, as D-5 leaves them.

**Comments:**

- `IconPicker.tsx:27`: "Omit ⇒ anchors to the picker's own mount point" leaves the comment, which keeps "An SVG glyph, so `Element`."
- `frame-slide.css.ts:4` leaves; `frames.css.ts:129` is rewritten.
- `Sidebar.tsx:284` leaves.
- `useViewInteractions.tsx:1` drops "the icon picker seat".
- `NexusIconEditors.tsx:6`: "The glyph picker and the photo cropper" leaves with its file.
- `MatrixView.tsx:111` leaves with `pickingId`.
- `PickerMenu.tsx:185` and `ValueSeat.tsx:87` hold, and `useViewInteractions.tsx:404` leaves with `runTitleAction` in the right-click work.
- Count: none added, `frames.css.ts:129`, `IconPicker.tsx:27`, and `useViewInteractions.tsx:1` rewritten in place, and four removed (`frame-slide.css.ts:4`, `Sidebar.tsx:284`, `MatrixView.tsx:111`, and `NexusIconEditors.tsx:6` with its file), so the Comments constraint holds.

**Tests:**

| Test | Change |
|---|---|
| `IconPicker.test.tsx:27,51` | `onDismiss`, and a `triggerRef` |
| `VisibilityFrame.test.tsx:53,109` | `back`, `current` |
| `SortFrame.test.tsx:82`; `GroupFrame.test.tsx:72,182-183,205-206,386-387` | `back` |
| `PropertyFrame.test.tsx:96`; `Core/Views/viewWrite.test.tsx:159-165` | `back`, `current` |
| `PropertyFrame.test.tsx:711-727` | Leaves; `PickerMenu.test.tsx` pins a detached trigger dismissing |
| `PageView.test.tsx`'s `mount` | Renders `<IdentityChoice />` beside `PageView` |
| `DetailTitleHeader.test.tsx:39,136` | `onIconClick` |
| `cardGestures.test.tsx:183` | `renderView(root, source(), <IdentityChoice />)` |
| `cardGestures.test.tsx`'s `beforeEach` | Adds `pendingPick: null, pendingChoice: null`, since a slot left by an earlier test keeps `pickOpen` true |
| `MenuIndex.test.tsx:103-113`'s `color` case; `typeRows.test.ts:117-120` | `onPress` |
| `sidebarIconChoice.test.tsx:75-92,104-146` | Rewrite through `showEntityMenu` and `IdentityChoice`; Collection case leaves |
| `store.test.tsx:1378-1393` | Assert `pendingChoice: null` through `resetChrome` |
| `viewRowMenu.test.ts`, `FilterFrame.test.tsx:120,168`, `MatrixMenu.test.tsx` | Hold |

**Tests to Add:**

- `IdentityChoice`: a pick lands and closes, a re-picked color lands `undefined`, a dismissal lands nothing, `useChoiceOpen` reads true only for its own trigger, and a swatch's press opens the color picker at its chip and lands the pick.
- `PickerMenu`: a detached trigger dismisses.
- `ViewFrame`: Edit Icon and Edit Color hang from the row, and deleting from the editor closes the dropdown.
- `viewItemMenuItems`: rows, disabled states, its separator, and no leading separator.

**Drives:** `Archive Drive/MATRIX.md:82`, `Archive Drive/live-drive.mjs:681`, `Option Picker Drive/live-drive.mjs:153`, and `Properties Drive/live-drive.mjs:359` hold by their selectors. Properties Drive group 19 carries: Edit Icon from all 13 sites, Change Color from all 6 (a property's Color row and a Settings color row among them), the ⋮ with Use Native Menus on and off, Visibility's height from both routes, and a tile's strip staying revealed through a pick.

---

#### 7. Risks and Order

**Order:**

1. Steps 1 to 5 land after the two pickers, since `MenuTopRow`'s `className` leaves there. Step 1 comes first, since the flat form uses the new constant. Steps 2 to 4 land as one commit, since `LayoutFrame` takes `back` with its `door` union and the full door's `onMenu` is what replaces `ViewItemMenu`'s mount, so `LayoutFrame`'s interim props never land.
2. Step 6 lands next, before D-4's page runner, so the runner's Edit Icon row lands on `chooseIcon`, and with F-5. The `onClose` rename lands inside it, since removal first shrinks it from 13 sites to 3.
3. The `PickerMenu` line lands earlier, in the pane shell's pass over `measure`, so Step 6 finds it in place.

**What Can Break:**

- **The Trigger Rule Is Global:** every `PickerMenu` with a trigger gains it. A pane whose trigger detaches today measures zeros, so closing is strictly better, but a row recycled mid-open now closes where it used to jump. An Electron 42 probe confirms the observer fires on removal for an SVG trigger (`Banner`'s glyph, `ViewTile`'s title icon) as for an HTML one.
- **`ViewTile`'s Reveal:** a tile with a hidden strip must stay revealed through a pick from a strip row, which `rowChoiceOpen` holds through `menuAnchorRef`. Drive it.
- **The Matrix:** `pickingId` gave the label priority through a path; `menuId` now does it. A node filtered out of the graph during a pick loses its anchor and closes, which matches today's `return null` minus the skipped exit. `MatrixView.test.tsx` should still pass, and group 17 should confirm the label stays through an icon pick.
- **`useChoiceOpen` Reads a Ref in a Selector:** the element is stable once mounted, and the selector reruns on every store change, so this is cheap. A host that remounts under an open picker reads `null` with no store change to correct it, so its button unpresses; the remount detaches the old trigger, though, so the trigger rule closes the picker in the same frame.
- **Stale Closures:** `value` and `onPick` are captured at the gesture. That's today's behavior for row flows; for headers it's stricter, and it's what replaces `PropertyFrame`'s id key.
- **Under (b), Nothing Holds a Pick Back From a Departing Host:** a pick lands through its closure after its host unmounts. Writes are path- or id-keyed, so this lands correctly or is refused.
- **Sync:** nothing here touches persisted shape. `pendingChoice` is session-only, like every slot beside it.
