## CalendarPicker Delegates to PickerMenu

> **Status:** decision log, rulings taken 09-03-2026; the plan is `CalendarPicker Delegation — Implementation Plan.md`. · **Scope:** `Pommora/src/renderer/DesignSystem/Pickers/CalendarPicker/` and `picker-base.tsx`/`picker-base.css.ts`; the RendererRework §2 Recipes row this answers. · **Verification:** live, the three dropdowns and the height change, over CDP or by Nathan.

#### What Was Read

CalendarPicker (692 lines), PickerMenu (437), their stylesheets, `FrameSlide`, `Reveal`, `useExitPresence`, `useHeld`, `useDismiss`, `stack`, every CalendarPicker mount, every `closing=` and `anchorX` caller, and the PickerMenu test file. One probe test was run against PickerMenu and deleted; its finding is under Fixes below.

---

### 1. The Findings That Shape the Design

**F1. PickerMenu's own children-hold is one render late.** `body = useHeld(children, !closing)` (picker-base.tsx:110). When a caller nulls its children in the same tick that `open` flips false, that render still has `closing === false`, so the hold overwrites itself with `null` before `useExitPresence` turns `closing` on. Probe: a self-managed PickerMenu whose children are `{open ? <span/> : null}` renders an empty pane through its Bloom-out. Callers doing exactly this today: FilterFrame's `FieldPicker` (`{open ? children(...) : null}`), PageProperties and PageWindow's date panes (`{editing?.mode === 'date' && ...}`). TableView survives by holding `lastPicker` itself; CardPickerHost renders its child unconditionally. This is also why CalendarPicker's 954b709d fold to `useHeld` was necessary: the primitive it sits in doesn't hold.

**F2. A nested picker's backdrop sits under its parent pane.** `stack.top.menuBackdrop` (1099) is one step under `stack.top.menu` (1100). Both panes are body-portalled into the root context, so a child picker's click-catching backdrop can never cover the pane that opened it. Two hand-rolls exist for exactly this: OptionEditPopup's capture `pointerdown` (dismissing the IconPicker on a click into the popup) and CalendarPicker's three-mode dismiss effect. Separable from this plan; filed as an open ruling in §5.

**F3. A default-on, measured height morph is already ruled out by the codebase.** `frame-slide.css.ts` documents "the bounce": a container transitioning its height off a ResizeObserver lag-chases any child that animates its own height, because the RO re-targets the transition every frame. Children that animate their own height live inside PickerMenus today: AutocompletePane's `FrameSlide`, the `Reveal`s in FilterFrame, PageProperties and CardAddPicker, and `menu-disclosure`'s `Reveal`. FrameSlide's answer was to ease height only across its own navigation window and track live otherwise.

**F4. CalendarPicker's height changes are two, and both have a house primitive.** In single mode, **Use Time** adds a horizontal sibling inside the one field row: no height change. Only the second field row (`endOn && timeOn`) appears and disappears, which is `Reveal`'s pattern ("one primitive per pattern", InteractionPM Principles). The 5↔6-week grid already sets a fixed pixel `height` on `s.viewport`, which a plain CSS `transition: height` animates with zero JavaScript, on the same `base` token as the month slide (the `track` comment already describes that contract).

**F5. Scroll-dismiss is unreachable in production.** With a dropdown's backdrop up, a wheel over the calendar pane scroll-chains to the fixed layer, then the viewport; no ancestor scroller moves, and the grid's horizontal swipe calls `nav()`, which closes the menus itself. The one host that scrolls its document is the showcase page.

---

### 2. Part A: The Dropdowns Delegate

#### The Template (Month/Year; the Time Menu Follows It)

State keeps the frozen click-time rect but reshaped to what PickerMenu's point anchor needs:

```tsx
type Anchor = { x: number; y: number; h: number }
const anchorOf = (el: HTMLElement): Anchor => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top, h: r.height }
}
const [menu, setMenu] = useState<{ kind: 'month' | 'year'; at: Anchor } | null>(null)
```

One PickerMenu per dropdown family, mounted **once at the root** (persistently, riding `open`), never inside the trigger button:

```tsx
<PickerMenu
  solid
  open={menu !== null}
  onDismiss={() => setMenu(null)}
  anchorX={menu?.at.x}
  anchorY={menu?.at.y}
  anchorHeight={menu?.at.h}
  maxHeight={DROPDOWN_MAX_HEIGHT}
>
  {menu && (menu.kind === 'month' ? monthRows : yearRows)}
</PickerMenu>
```

- **Frozen coordinates:** the point path (`picker-base.tsx:153-166`) builds `t` from `anchorX`/`anchorY`/`anchorHeight`, and the flip test reads `t.top`/`t.bottom` plus the pane's measured size, so a frozen point still edge-flips. Scroll and resize re-run `measure()` against the same point, which is the freeze. While `closing`, the placement effect returns early and `pos` is untouched, so the anchors may go `undefined` during the exit without moving the pane.
- **Month↔year swap while open:** `setMenu` to the other kind keeps `open` true; the anchor props change, the placement effect re-runs, and the rows swap in place with no exit, which is today's behavior. `decidedDir`/`decidedCenter` only reset on `open === false`, so the flip decision sticks across the swap; both triggers share a row, so this is harmless. Same for the h↔m swap.
- **Children through the exit:** with Fix 1 below, PickerMenu holds them; CalendarPicker computes rows from live `menu` and drops `lastMenu`/`lastTimeMenu`.
- **The time menu** is the same shape with `direction="up"`, state `{ which, part, at }`, and rows from `HOURS_12`/`HOURS_24`/`MINUTES`.
- **The list cap:** `menuList`'s own `maxHeight: 136px` + `overflowY` become PickerMenu's `maxHeight={DROPDOWN_MAX_HEIGHT}` (a KNOB, 136) through the shared `MenuScrollFrame`; `menuList` keeps only `gap` and `minWidth`.
- **`origin`:** today's CSS anchors always center. PickerMenu's default `auto` centers when the pane fits and edge-anchors otherwise. Recommended: take `auto` (collision-aware). `origin="center"` is the exact-parity alternative. **Nathan's call.**

#### Preserved Behaviors and How

| Behavior | How it is kept |
| --- | --- |
| Rect frozen at click time | `anchorOf(e.currentTarget)` stored in state; PickerMenu's point path never observes the trigger |
| One menu at a time | `menu` and `timeMenu` are separate states; each opener nulls the other through one `closeMenus()` (also used by `nav`, `jump`, and both switch handlers, see Changes) |
| Single-click opens, double-click edits inline | unchanged: `e.detail > 1` returns, `onDoubleClick` sets `segEdit`; PickerMenu's focus-return skips because the seg button is replaced by the input (`isConnected` false) |
| AM/PM toggle | untouched |
| Escape peels the dropdown, not the calendar's pane | the dropdown's portal is DOM-last, so it is the last `[data-picker-live]` and takes the press; the outer pane is next |
| Click-off | the dropdown's backdrop is DOM-later than the outer pane at the same step, so an outside click catches on it |
| Scroll closes the dropdown | **dropped** (F5). Fallback if wanted: a `dismissOnScroll?: boolean` prop (default `false`) that calls `onDismiss` from the existing capture scroll listener at `picker-base.tsx:231`, three lines, no fork |

#### Behaviors That Change Hands (Verify Live)

1. **Outside click.** Today the capture listener closes the dropdown *and* the click lands on the outer pane's backdrop, closing both. After delegation only the dropdown closes; a second click closes the calendar. This matches the Escape peel-one contract.
2. **Clicks inside the calendar** while a dropdown is open still don't dismiss it (F2, parity). Changes if the §5 z-order ruling lands.
3. **Focus.** The dropdown now takes `manageFocus` (default true): first row focused on open, Tab wraps, focus returns to the title/segment button on close. Today the dropdown manages no focus. Recommended: keep the default. `manageFocus={false}` is the parity alternative. **Nathan's call.**
4. **Placement near a viewport edge** under `origin="auto"` edge-anchors instead of centering and overflowing.

#### Demolition (CalendarPicker.tsx, Current Line Numbers)

| Lines | What | Δ |
| --- | --- | --- |
| 2, 4, 10, 11, 12 | `type ReactNode`, `createPortal`, `useExitPresence`, `useHeld`, `stack` imports | −4 |
| 24-28 | `TriggerRect` + `rectOf` → `Anchor` + `anchorOf` | 0 |
| 30-54 | `PortalMenu` | −25 |
| 56-75 | `SizeMorph` (Part B) | −20 |
| 111-120 | `menu`/`timeMenu` state reshaped; `menuPresence`, `timeMenuPresence`, `lastMenu`, `lastTimeMenu` | −4 |
| 126, 542 | `rootRef` and its `ref=` | −2 |
| 127-155 | the three-mode dismiss effect | −29 |
| 369-398 | `timeOptions` → root-level time PickerMenu | −8 |
| 451-454 | the time render gate inside the seg button | −4 |
| 505-539 | `selectionMenu` → root-level month/year PickerMenu | −6 |
| 557, 570 | the month/year render gates inside the title buttons | −2 |
| 543, 689 | `<SizeMorph>` wrapper → fragment/plain div | −1 |

`calendar-picker.css.ts`: `morph`, `morphAnimated` (24-25), `ddWrap` + its `globalStyle` (45-46), `menuList`'s `maxHeight`/`overflowY`/`scrollbarWidth` (52-54), the `stack` import (8): −8. `stack.ts`: `top.menuOverlay` loses its only consumer and is deleted: −1.

#### PickerMenu Changes (picker-base.tsx)

- **Fix 1 (behavioral, a fix not an addition):** `useHeld(children, open !== false)` in place of `!closing`. The hold captures the last children rendered while open; every conditional-children caller (F1) stops exiting empty. Manual mode (`open === undefined`) holds nothing, as now. The probe becomes a test in `picker-base.test.tsx`: children `{open ? <span data-id="body"/> : null}`, flip `open` false, assert the body text is still in the portal.
- **Delete the `closing` prop** (52, 75) and collapse `closing = selfManaged ? exitClosing : closingProp` (94) and `liveRef.current` (100) to the self-managed expressions. CalendarPicker was its only caller; manual mode stays for the showcase's `<PickerMenu solid>` and the 'manual' test. −3.
- **No morph prop, no scroll-dismiss prop** under the recommended design (§3, F5).

---

### 3. Part B: The Height Change

**Recommendation: no PickerMenu morph capability. SizeMorph is deleted and not relocated.** This declines the brief's "SizeMorph moves INTO PickerMenu" and is the one place this plan pushes back.

**Why:** F3 rules out default-on; a measured wrapper cannot coexist with the `Reveal`/`FrameSlide` children PickerMenus already carry without the bounce, and it would re-target on every keystroke in the filter lists (IconPicker, PropertyPicker, ConnectionPane), where a snap is the wanted behavior. An opt-in prop with one caller is SizeMorph moved, not made reusable; it would also lose the morph in any non-PickerMenu mount. F4 shows CalendarPicker doesn't need a container morph at all: its content can own its two height changes with the primitives InteractionPM already names, and the pane follows frame-by-frame exactly as it does today for every Reveal-bearing menu.

#### Design (Option 1, Recommended)

- **The second field row** wraps in `<Reveal open={endOn && timeOn} duration={duration.base}>`. `Reveal` mounts on open and unmounts on collapse, so the row's conditional render goes away. The `fields` container's `gap: 6px` would leave a phantom gap on a collapsed Reveal wrapper, so the gap moves inside: `fields` drops `gap`, and the stacked row carries `paddingTop: 6px` (clipped and eased with it).
- **The grid viewport** adds `transition: height ${duration.base} ${easing.baseEase}` to `s.viewport`. The inline pixel height already changes on nav and jump; the transition lands with the slide on one beat. No first-paint arming needed (no prior value, no transition).
- **The `range` switch row** is static per mount; nothing to animate.
- **PickerMenu's re-anchor RO** (144) already follows a growing pane per frame today (SizeMorph + RO); the Reveal path is the same stream. Pre-existing and out of scope: `measure()` calls `setPos` with a fresh object every RO tick, so the pane re-renders per animated frame; a same-values gate would be a one-line follow-up.
- **Beat:** `Reveal` defaults to `fast` (180ms); SizeMorph ran on `base` (280ms). Recommended `base`, matching the slide and the grid. **Nathan's knob.**

Δ: −20 (SizeMorph) −2 (css) +4 (Reveal wrapper + stacked-row style + viewport transition).

#### Mount-by-Mount

| Mount | Host | Morph under Option 1 | Under a PickerMenu-hosted morph |
| --- | --- | --- | --- |
| `Properties/PageProperties.tsx:323` | PickerMenu → DatetimeValuePicker | yes | yes |
| `Windows/PageWindow.tsx:541` | PickerMenu → DatetimeValuePicker | yes | yes |
| `Views/TableView/TableView.tsx:680` | `DatetimeCellPicker` (a PickerMenu) → DatetimeValuePicker | yes | yes |
| `Views/CardView/CardPickerHost.tsx:166` | PickerMenu → DatetimeValuePicker | yes | yes |
| `Frames/FilterFrame.tsx:527` | `FieldPicker` (a PickerMenu, inside the filter Frame) → CalendarPicker | yes | yes |
| `Showcase/Leaves/ComponentsLeaf.tsx:82` | `PopupButton`, a plain div | yes | **lost** |

DatetimeValuePicker's doc says the caller mounts it in "a PickerMenu or a pane row"; no pane-row caller exists. The clause is removed, not amended.

#### Option 2 (Not Recommended): A Coordinated Default-On Morph

For the record, the only default-on shape that survives F3: PickerMenu wraps `body` in a measured `height` div with `transition: height`, and the transition is suppressed by a `:has([data-animating])` rule while any descendant `Reveal` (during `!settled`) or `FrameSlide` (during `navigating`) stamps that attribute. Costs: a structural div in ~30 mounts; edits to two Animation primitives; per-keystroke re-targeting on filter lists unless they opt out (which reintroduces a prop); first-paint arming; and the showcase mount still loses it. It buys nothing for CalendarPicker that Option 1 doesn't.

---

### 4. Phases and Gates

**Phase 1: PickerMenu.** Fix 1 + its test; delete `closing`. Gates: `npm run typecheck`, full `npm run test`, `npm run lint`, `npm run build:showcase`. Commit.

**Phase 2: CalendarPicker.** The two root-level PickerMenus per the template; the demolition list; `closeMenus()`; `menuList` → `maxHeight`; delete `menuOverlay`. Gates as above. Commit.

**Phase 3: The height change.** Reveal + viewport transition; delete SizeMorph and its styles; DatetimeValuePicker doc clause. Gates as above. Simplification pass, then commit.

**Live verification (Nathan, or CDP on 9333):** month, year, hour, minute dropdowns open at their triggers, exit with a Bloom-out showing their rows, and flip near the bottom/top edge · Escape peels dropdown then calendar · outside click peels only the dropdown · double-click a segment edits inline · End Date on/off and Use Time on/off with End Date on ease the pane's height · navigating between a 5- and 6-week month eases with the slide · in TableView, PageWindow, FilterFrame, and the showcase · the F1 exit: open a filter date picker, click off, the exit is no longer an empty pane.

**Estimated code delta:** CalendarPicker.tsx ≈ −105, calendar-picker.css.ts −8, picker-base.tsx −3, stack.ts −1, test +≈20 (excluded). **≈ −115 lines of code.**

---

### 5. Rulings (Nathan, 09-03-2026)

1. **Part B design:** the **opt-in PickerMenu prop** (`morph`), over the recommended Option 1. SizeMorph's mechanism moves into PickerMenu behind a prop defaulting off; the five PickerMenu hosts of CalendarPicker opt in; the showcase's plain-div mount loses the morph.
2. **Nested backdrop z-order (F2):** not ruled; left as is, filed in the plan's Sequenced After.
3. **`origin`:** `auto`.
4. **`manageFocus`:** not ruled; the default (true) stands.
5. **Beat:** `fast`, applied to the morph's transition. The 5↔6-week grid resize on a month nav lands 100ms before the slide (both were `base` under SizeMorph); flagged in the go-ahead ping.
6. **Scroll-dismiss:** dropped.
