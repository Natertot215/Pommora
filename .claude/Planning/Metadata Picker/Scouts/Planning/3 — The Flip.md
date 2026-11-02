### Scout 3 — The Flip and Placement (E-1, E-4, Open Item 4)

**DATE:** 11-01-2026
**BASE:** `8824cce29`
**RESULT:** The flip works and reads as a move, proven live. It should be decided at the head of a slide and travel with it. Applied to in-place growth it is worse than nudging the pane, so one call goes to Nathan (*§Contradictions*, X-1).

Every number below comes from a real drive of the built app in a throwaway worktree, sampled per animation frame (about 16 ms) from the portal layer's `getBoundingClientRect`. The key screenshots are in `Crops/` beside this report.

---

#### 1. Contradictions

**X-1 — E-1's Flip Is Wrong for Small In-Place Growth (Reconsider, With Evidence):** E-1 says a pane that grows after opening flips above its trigger when the window constrains it. For a slide that holds. For in-place growth, a flip sends the whole pane across its trigger to fix a few pixels, and it takes the control under the pointer with it.

| In-Place Case | Overflow Today | If It Flips | If It Stays Inside the Window (The Fence) |
|---|---|---|---|
| End Date on a popped calendar (Bee 2, window 872) | 7.8px past the window | Pane travels 362px; the switch goes from y 831 to y 500 | Pane rises 16px; switch goes from y 830 to y 846; pane covers the trigger by 11px |
| End Date on a slid calendar (Bee 1, window 915) | 1.1px past the window | Pane travels 428px | Pane rises 9px; switch moves 23px, less than the row's own 32px growth |
| TextPane while typing (low card) | 125px past the window | Pane travels 428px while the text is being typed | Pane rises line by line to 632–953 and stays put |

*Question for Nathan, in plain terms:* when a pane grows a little where it stands (the End Date switch, a line of typing, a New Option row) and the window's edge is close, should it (A) rise just enough to stay on screen, briefly overlapping its trigger, or (B) leave for the other side of the trigger, as it does on a slide? **My call is A:** only a slide flips, since a slide is already moving everything and the pointer has no target to lose. With B, clicking End Date on a low calendar sends the calendar 360px away from the pointer to fix 8px. The proposed change is written for A; *§Approaches* gives B's exact difference, which is one clause. See `Crops/18-popped-enddate-cross-move.png` against `Crops/18-popped-enddate-slide.png`.

**X-2 — "As Every Other Menu Does" Has Nothing to Match:** no menu re-decides after opening. `PickerMenu` decides its side once (`UIX/Pickers/PickerMenu.tsx:207-217`), once more for content a child builds in an effect (`:279-286`), and keeps it. System menus are the OS's. The intent stands; the behavior is new rather than copied.

**X-3 — The Live Check's Numbers Depend on List Length:** at 1422×924 the seeded 8-row list (204px) exceeds the 188px below Bee 7 and opens upward, so nothing grows past the window. The 60px figure needs a shorter list. I drove at 1422×961 to reproduce it, where today's overflow is 93px. C-6 drops two rows from a card's Add, so more low lists will open below and flip.

**X-4 — `InfoButton` Has No Production Mount at HEAD:** `186726aed` was motivated by an InfoPane, but `infoFor` and `InfoButton` appear only in `Core/Info/` and its test. The `:279-286` effect is still needed for what it does (*§Removal Inventory*).

**E-1's Other Claims Hold:** the low-card overflow is real, and the Live Check's fear is real: switching edges mid-slide moves the pane 321px in one frame.

---

#### 2. What's True

**The Slide's Timeline (`UIX/Menus/FrameSlide.tsx`):**

1. A click sets `open`; the detail mounts in slot B (`:42-44`). A `requestAnimationFrame` then flips `active` (`:37`).
2. The `ResizeObserver` measures B into `size` (`:51-56`). That state lands in the same commit as `active`, so `size.bh` is first known in that commit, not a frame earlier. `InteractionPM.md:48`'s "known the instant the active slot flips" is exact.
3. The commit that changes `active` writes the new height inline while only the width transition is on. The layout effect at `:67-75` then sets `navigating`, adding `viewportNav` before paint.
4. **The Trap:** a layout read between step 3's two commits flushes styles with no height transition, and the height snaps. Proven live by moving the read ahead of `setNavigating`: the pane went from 204 to 327 in one frame, flip or no flip. A pane may read layout only in the `navigating` commit or later.
5. The height eases over 280 ms on `ease`. The pane's own observer (`PickerMenu.tsx:172-182`) reports each eased height, and `setPos` lands a commit late, so position lags height by a frame.

**The Side Today (`PickerMenu.tsx`):** `decidedDir` latches at `:207-217` and clears on close (`:165-168`). `:279-286` clears it once after children's effects. `measure` also runs on trigger resize, scroll, and window resize (`:255-258`).

**Consumers of `PickerMenu` That Can Grow After Opening:**

| Consumer | Site | What Grows | Change Under the Proposal |
|---|---|---|---|
| Value and Add picker | `Core/Properties/Pickers/PropertyPicker.tsx:144` | Slide to option list or calendar; End Date in place | Slide flips; End Date fenced |
| `MetadataPicker` | Not yet built | Same slide | Inherits with no wiring |
| Menu stand-in | `Core/Interface/Menus/MenuPresenter.tsx:56,98` | Submenu slide | Slide flips (read, not driven) |
| View Tile settings | `Core/Tiles/Surfaces/ViewTile.tsx:644` | `SettingsFrame` slide | Driven: Visibility flips 644→288, Back stays up |
| TextPane | `Core/Properties/Pickers/TextPane.tsx:34` | Typing, to `max-height: 320px` | Fenced |
| Autocomplete, Block Menu | `Core/MarkdownPM/Menus/caretPane.tsx:78` | Height bounded by `usePaneResize`'s room | No flip (`resize` withholds the channel) |
| Glance | `Core/Interface/Glance/GlancePane.tsx:352,413` | Nothing; its size is held | Fence only, at open |
| IconPicker, ColorPicker, FieldPicker, option popups | Various | Little or none | Fence only |

**Settings Frames Mostly Sit Outside This:** the toolbar's frames mount in `MenuDropdown` (`Core/Views/Settings/ViewMenu.tsx:43`, `Core/Interface/Toolbar/OutlineMenu.tsx:41`) or directly in `MenuSurface` (`Core/Interface/Toolbar/SettingsMenu.tsx:38`, which holds `SettingsFrame` and `MatrixMenu`). Neither is `PickerMenu`, so those frames hear nothing and don't change. The one `PickerMenu` host is the View Tile.

**The Resize Path:** `usePaneResize` caps a pane's content height at the room it opened into (`UIX/Pickers/usePaneResize.tsx:67`), and the pane adds 9px of chrome (autocomplete measured 249 for 240 of content). So a pane at its ceiling reads as overrunning its room by 9px. A size-driven flip rule would therefore flip such a pane mid-drag. This is derived from the code; I didn't drive it.

**Existing Pieces Reused:** the side rule is stated twice today (`PickerMenu.tsx:209-214`, `Core/Matrix/MatrixLabel.tsx:107-108`, whose comment calls it "the pickers' rule"). The horizontal fence is the pattern at `PickerMenu.tsx:233`. `el.animate` FLIPs exist at `Core/Views/Cards/useGhostFlip.ts:50`, `Core/Interface/Windows/NavWindow.tsx:60`, and `UIX/Animations/motion.ts:70`. `flipTransform` (`motion.ts:59`) needs both rects, so it doesn't fit before the commit. Kit contexts have precedent in `UIX/Interactions/ghostCreate.ts:11`. `feel.ts` holds the named timings.

---

#### 3. Removal Inventory

| Item | Site | Fate |
|---|---|---|
| Body of `measure` (`room`, `other`, `edge`, `near`, `vertical`, `iw`, center and edge branches) | `UIX/Pickers/PickerMenu.tsx:202-243` | Moves to `placePane`, `sideFor`, `roomAround` |
| `VIEWPORT_MARGIN` | `:28` | Moves to `panePlacement.ts` |
| `PickerDirection` | `:39` | Moves |
| `ANCHOR_RESERVE`, `CORNER_CLEAR` | `:41-44` | Move |
| `Pos` | `:46-52` | Moves, renamed `PanePos` |
| `clamp`, `GAP` imports | `:20-21` | Leave `PickerMenu.tsx` |
| The `usePaneResize` ↔ `PickerMenu` import loop | `usePaneResize.tsx:9`, `PickerMenu.tsx:22` | Ends |
| `MatrixLabel`'s hand copy of the side rule and its import from a component file | `Core/Matrix/MatrixLabel.tsx:6,108` | Replaced by `sideFor` |
| `SLIDE_MS` and the `duration, ms` import | `UIX/Menus/FrameSlide.tsx:3,7` | Replaced by `BASE_FEEL` |
| The base feel written inline | `Core/Interface/Windows/NavWindow.tsx:62`, `PageWindow.tsx:83` | Replaced by `BASE_FEEL` |
| The `PickerMenu auto-centering` test block and its DOM faking | `UIX/Pickers/PickerMenu.test.tsx:452-520` | Becomes plain calls in `panePlacement.test.ts` |

**Considered and Kept — The `:279-286` Effect:** I expected the new rule to absorb it. It can't, because it's the only path that re-decides a pane built by its children before first paint, silently, with no move. Under the proposal nothing else re-decides on a size change, and `PickerMenu.test.tsx:588` pins it.

---

#### 4. Approaches

**Low Card, Date (window 1422×961, room below 225, list 204, calendar 327):**

| Candidate | Largest Move in One Frame | Settled After Click | Past the Window | Ends At |
|---|---|---|---|---|
| Today | 16.6px | 307 ms | **93px** | 727–1054 |
| Clamp | 17px | 314 ms | 9px for one frame | 626–953, over its card |
| Crossing, edge switch | **321px** | 310 ms | 0.5px | 330–657 |
| Crossing + move, 280 ms | 49.5px | 397 ms | 0.2px | 330–657 |
| Crossing + move, 225 ms | 59px | 352 ms | 1.3px | 330–657 |
| Crossing + move, 180 ms | 72px | 309 ms | 0.5px | 330–657 |
| Slide decides, edge switch | **275px** | 309 ms | None | 330–657 |
| **Slide decides + move** | 53.8px | 311 ms | None | 330–657 |

**What Each Looks Like (`Crops/50-filmstrip-three-approaches.png`):**

- **Clamp:** a true move and the cheapest, but the calendar ends sitting on its own card, and E-1 asked for a flip.
- **Either Edge Switch:** a teleport, as feared. Deciding before the slide moves the jump, it doesn't remove it.
- **Crossing + Move:** no jump, but the pane first grows downward for about 50 ms, hesitates at the window's edge, then sails, finishing 90 ms after the slide unless shortened to 180 ms.
- **Slide Decides + Move:** the pane rises from the slide's first frame and settles with it. It's the only one where height and position read as one gesture. It's still a big motion, about 400px in 280 ms crossing its own card while the content slides sideways. It reads as a move; whether it's tasteful is Nathan's eye to judge, and a filmstrip isn't the same as seeing it.

**Simpler Things Weighed:**

- **Reserve Room at Open:** the list opens above whenever a date is listed, so nothing flips. "Tall list already up" measures this outcome (16.6px steps, no travel), and it's visually calmest. It needs `PropertyPicker` to know a calendar's height, no constant states that height today, it opens the list upward for people who never drill, and it does nothing for option lists or other slides. Rejected.
- **Reading the Running Transition:** `getAnimations({ subtree: true })` can find the slide's target with no channel. It's a hidden dependency on a CSS detail, read on a hot path. Rejected.
- **A `FrameSlide` Callback Prop:** every consumer would wire it. The context needs no consumer change and is inert under `MenuDropdown`. Rejected.

**Option A (Recommended) — Slide Flips, Growth Fences:** the proposal below. Each kind of growth gets the right response, and the near-top case is solved by the same fence. It costs a channel from `FrameSlide`.

**Option B — In-Place Growth Flips Too:** one clause on Option A. The slide keeps its decision at its head, and every later size change may flip as well:

```diff
-    if (held === null || growth > 0) {
+    if (held === null || growth > 0 || !placeResize) {
```

The `!placeResize` exclusion is required (*§What's True*, The Resize Path). It behaves as X-1's middle column shows. Built beside Option A in a merged copy, a 300px pane over 234px of room stays below and rises from `top` 526 to 460 under A, and flips to `bottom` 274 under B.

**Option C — Fence Only:** one expression, no flip. Reads as a move and always stays on screen, but a low card's calendar covers its card. Nathan has ruled it out for slides, and the fence sits inside Option A anyway, for a pane neither side can hold.

**I-042 — Extract, as `placePane`:** this was a real question, so here's the honest cost. Against the same behavior written inside `measure`, extraction adds about 58 lines (a signature, imports, and a return shape) and one file. A test of E-1 alone doesn't need it: a child can call `SlideGrowth` under the existing faked measurements. It earns its place for other reasons: E-4 confirms it, `measure` is being rewritten here anyway, the issue's stated fix is exactly this function, `PickerMenu.tsx` shrinks by 21 lines alone, and by 27 with K-4, with the loop to `usePaneResize` gone, `MatrixLabel` shares one rule, and the centering tests lose their faked DOM. It should land first as a pure move. If Nathan declines the new file, the same pure functions can sit at module level in `PickerMenu.tsx`, saving about 8 lines and keeping the import loop.

---

#### 5. The Proposed Change

All of this ran in the worktree on the final code. Six of the seven type projects passed; the dashboard project can't resolve from a worktree. Lint is clean on `UIX` and `Core/Matrix`. The full suite ran twice: 9,067 of 9,082 passed on the second run, with 13 failures (14 on the first run) all in `citationBreakage.test.tsx` and `embedAbsorb.test.tsx`. Those are keystroke sweeps that hit vitest's timeout at 5 to 8 seconds under full-suite load. Neither file touches this code, and alone they pass 49 of 49. The hunks below are what was driven, except the comment choices noted in Tasks 1 and 3, K-4's `centerX`, which replaces `anchorX` here, and the timing's name, `BASE_FEEL`, which the two windows share.

**Placement for Nathan's Approval:** new files `UIX/Pickers/panePlacement.ts` and `UIX/Pickers/panePlacement.test.ts`, beside `PickerMenu`.

##### Task 1 — Extract Placement (No Behavior Change)

`UIX/Pickers/panePlacement.ts` takes everything in *§Removal Inventory*'s first five rows. `sideFor` should carry no doc comment, since its name and tests state it; this differs from the driven file only there.

```ts
export const roomAround = (t: TriggerBox, viewH: number): Record<PickerDirection, number> => ({
  up: t.top - GAP - VIEWPORT_MARGIN,
  down: viewH - t.bottom - GAP - VIEWPORT_MARGIN,
})

export function sideFor(
  side: PickerDirection,
  height: number,
  room: Record<PickerDirection, number>,
): PickerDirection {
  const other = side === 'up' ? 'down' : 'up'
  return height > room[side] && room[other] > room[side] ? other : side
}

export function placePane({ t, pane, view, side, centered, origin, centerX, bounds }: {
  t: TriggerBox
  pane: { w: number; h: number }
  view: { w: number; h: number }
  side: PickerDirection
  centered: boolean | null
  origin: 'auto' | 'right' | 'center' | 'left'
  centerX?: number
  bounds?: { left: number; right: number }
}): { pos: PanePos; centered: boolean }
```

`placePane`'s body is `PickerMenu.tsx:203-243`'s logic unchanged, returning instead of calling `setPos`, with `TriggerBox = Pick<DOMRect, 'left' | 'top' | 'bottom' | 'width' | 'height'>`. Imports update at `usePaneResize.tsx:9` and `MatrixLabel.tsx:6`, and `MatrixLabel.tsx:108` becomes:

```ts
const above = sy - r - st.y - VIEWPORT_MARGIN
const up = sideFor('down', box.h, { down: below, up: above }) === 'up'
```

##### Task 2 — The Fence

In `placePane`, replacing `:221-222`, so no pane leaves the window on any path, including a pane neither side can hold:

```ts
const fenced = (at: number): number =>
  clamp(at, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, view.h - VIEWPORT_MARGIN - ph))
const vertical =
  side === 'up' ? { bottom: fenced(view.h - t.top + GAP) } : { top: fenced(t.bottom + GAP) }
```

##### Task 3 — The Slide Decides, and the Pane Travels

`UIX/Animations/feel.ts`:

```ts
export const BASE_FEEL: Feel = { duration: ms(duration.base), easing: easing.baseEase }
```

The slide's timing names the base feel `NavWindow` and `PageWindow` already hand-write, so both point at it: `NavWindow.tsx:62` reads `BASE_FEEL` and `PageWindow.tsx:83` reads `{ ...BASE_FEEL, fill: 'forwards' }`, and `duration`, `easing`, and `ms` leave their `motion` imports where nothing else reads them.

`UIX/Menus/FrameSlide.tsx`, with `SLIDE_MS` at `:73` becoming `BASE_FEEL.duration`:

```ts
export const SlideGrowth = createContext<((by: number) => void) | null>(null)
```

`SlideGrowth` carries no doc comment. The height-snap reason joins the existing comment at `FrameSlide.tsx:63`, and `FrameSlide.test.tsx` pins it.

```ts
const grew = useContext(SlideGrowth)
useLayoutEffect(() => {
  if (navigating) grew?.(open ? size.bh - size.ah : size.ah - size.bh)
}, [navigating, active])
```

`panePlacement.ts`:

```ts
export const crossing = (from: PickerDirection, height: number, t: TriggerBox): number =>
  (from === 'down' ? 1 : -1) * (t.height + 2 * GAP + height)
```

`UIX/Pickers/PickerMenu.tsx`:

```ts
const place = useRef<((growth?: number) => void) | null>(null)
const slideGrew = useRef((by: number): void => place.current?.(by)).current
```

```ts
const measure = (growth = 0): void => {
  const t = rectOf()
  const pane = paneBox.current
  const view = { w: window.innerWidth, h: window.innerHeight }
  const held = decidedDir.current
  let side = held ?? direction
  if (held === null || growth > 0) {
    const room = roomAround(t, view.h)
    side = sideFor(side, pane.h + growth, room)
    if (held === null) placeResize?.({ dir: side, room: room[side] })
    else if (side !== held)
      paneRef.current?.animate(
        [{ transform: `translateY(${crossing(held, pane.h, t)}px)` }, { transform: 'none' }],
        BASE_FEEL,
      )
  }
  decidedDir.current = side
  const { pos: next, centered } = placePane({
    t, pane, view, side, centered: decidedCenter.current, origin, centerX, bounds,
  })
  decidedCenter.current = centered
  setPos(next)
}
```

`:255` becomes `new ResizeObserver(() => measure())`, since the observer would otherwise pass its entries as `growth`. `:314` becomes:

```tsx
<SlideGrowth.Provider value={resize ? null : slideGrew}>{body}</SlideGrowth.Provider>
```

**Why It Can't Flip-Flop:** a flip needs the pane to overrun its side and the other side to have strictly more room, so a stationary trigger allows at most one flip per open. The side re-decides only when a slide grows the pane, so a Back, a shrink, a scroll, or a window resize never moves it. Driven: Back kept the pane above (top 330→453, bottom fixed at 657, 16.6px steps), drilling again stayed put, reversing mid-slide both ways stayed put, and reopening decided afresh from below.

**Driven on the Final Code:**

| Scenario | Result |
|---|---|
| Low card, date | 727–931 → 330–657, largest step 53.8px, settled 311 ms, never past the window |
| Low card, long option list | 728–932 → 381–657, largest step 46.8px, settled 299 ms (today 42px past the window) |
| End Date, slid calendar | Rises 9px to 548–907 |
| Back from the flipped calendar | Stays above; no flip, no jump |
| Near the top (room above 95, below 249) | Refuses to flip, stays below, fenced to 95–422 (today 70px past the window) |
| List already above | Grows in place, no flip |
| Card with enough room | Stays below; nothing moves |
| Popped calendar, End Date | Rises 16px to 532–864 |
| TextPane typing | Rises to 632–953 |
| View Tile settings, Visibility | Flips, 644→288, largest step 50px, settled 332 ms; Back stays up |
| Low Glance, `[[` autocomplete | Placed normally (glance below its link, autocomplete above the caret), no console errors in that flow; not compared frame by frame against today |

**Tests to Add:** `panePlacement.test.ts` (driven version: keeps a side that fits; takes the other side when overrun; stays when the other side has less room; never returns; `crossing`'s sign; hangs off the trigger; fences; pins a pane taller than the window). `PickerMenu.test.tsx` should gain a child calling `SlideGrowth`, proving growth past the room flips and a shrink doesn't; it must stub `Element.prototype.animate`, which jsdom lacks, and install its own `ResizeObserver`, since `UIX/vitest.setup.ts:12` stubs the observer as a no-op. `FrameSlide.test.tsx` should prove `grew` fires only once `navigating` is on. A flip group belongs in *Properties Drive*, per the Testing constraint.

**Line Delta:** alone, `+86 (+158 / -72)` in code, excluding comments, tests, and `CardsView`'s drillable line, which belongs to C-1. Of that, Task 1 is about +58 and Tasks 2 and 3 about +30. Merged with K-4, K-5, and Scout 5's trigger rule, which K-4's prop savings help pay for, the built total is `+72 (+188 / -116)`. This is net-positive; the rationale is a delivered behavior in its minimal form (Task 3), one fence stated once (Task 2), and a confirmed issue with the side rule now stated once (Task 1).

**Comments:** this work adds none: the moved `KNOB` is neutral, `SlideGrowth`'s reason joins `FrameSlide.tsx:63`, and E-6's rework of the warning at `PickerMenu.tsx:136` is a rewrite in place.

---

#### 6. Goes False

- `.claude/Resources/PommoraUIX.md:380`: "the collision flip decided per open once its content is in" should read "deciding its side per open once its content is in and again at the head of a slide, held inside the window".
- `.claude/Features/InteractionPM.md:16`: "A menu's placement and collision flip are decided per open once its content is in" should add "and again at the head of a slide".
- `.claude/Features/InteractionPM.md:48` (FrameSlide): true as written, and it stays.
- `.claude/IssuesPM.md:93,1052-1062`, `[^42]` at `:1313`: I-042 closes.
- `.claude/IssuesPM.md` `[^27]` at `:1298` leaves with I-027, and `[^75]` at `:1346` re-anchors its `PickerMenu.tsx` citation.
- `.claude/IssuesPM.md` `[^51]` at `:1322`: cites `UIX/Menus/FrameSlide.tsx:83` (`slotBox`), which shifts, so it's re-anchored with the rest of I-051's citations this work moves (E-4).
- *Decisions & Intention* E-1: should be restated to Option A, a slide deciding at its head and travelling with it, with every pane staying inside the window. Open Item 4 closes: the flip doesn't land mid-slide; it starts with the slide and travels with it.
- `UIX/Pickers/PickerMenu.test.tsx:452-520`: moves to plain tests. `:588` and `:605` stay and stay true.
- `UIX/Menus/FrameSlide.tsx:7`: `SLIDE_MS` leaves.
- `.claude/Resources/PommoraUIX.md:210`: the Feel row's "Duration + snap … for the drag engine" should take in `BASE_FEEL`, the `base` rung on `baseEase`.
- `Core/Matrix/MatrixLabel.tsx:106`: stays true, and becomes literal.

---

#### 7. Risks and Order

**Order:** this work lands after the kit's imports and before the pickers: K-4, then Task 1, then Tasks 2 and 3, in one ordered pass over `PickerMenu.tsx:184-277`. Task 3 is first visible on the View Tile's settings, and `MetadataPicker` then mounts its `FrameSlide` under `PickerMenu` and inherits this with no wiring.

**What Can Break:**

- **The Height Snap:** `grew` must stay behind `navigating`. Reading layout earlier silently kills the height's easing, as measured in *§What's True*. The comment at `FrameSlide.tsx:63` carries this, and `FrameSlide.test.tsx` should pin it.
- **The Fence Reaches Every Pane:** it also applies at open. A pane neither side can hold now stays in the window, overlapping its trigger, and a pane taller than the window pins to the top margin. An autocomplete at its ceiling sits up to 3px over the caret line (9px of chrome less the 6px gap). A pane whose trigger scrolled off stops at the window's edge rather than following it out.
- **One-Frame Overshoot:** a fenced pane's position lags its height by a frame, so stepped growth briefly passes the edge: 7px near the top, 39px once when my drive pasted two wrapped lines at once. Ordinary typing adds one line. Panes above their trigger don't show it. The lag exists today; it's only newly visible against the edge.
- **Reduced Motion:** the move ignores `prefersReducedMotion`, as `FrameSlide`'s own transitions and `slideIn` do.

**Not Driven:** `MenuPresenter`'s submenu slide, the Properties panel's Add (it needs `MetadataPicker`), a card at the window's right edge, a flip with `direction="up"` (only `CalendarPicker.tsx:537` passes it, with no slide), a live drag at a resize pane's ceiling, and dev mode, so the DEV warning wasn't watched. The console was watched only across the Glance and autocomplete flow.

**In-Flight Calls Disclosed:**

- I drove the built app rather than dev, for frame timing and the Content-Security-Policy.
- Properties were added through the app's `mutate` channel, on a scratch Collection B seeded with cards.
- I edited the scratch sidecar directly to hide drive properties, since `views:save` kept them.
- The app runs at a 0.9 zoom, so a 1280×865 window is a 1422×961 viewport.
- The View Tiles were written into the scratch homepage's `_tiles.json`.
- I folded `MatrixLabel`'s copy of the side rule into `sideFor`, which is beyond the brief's list, under *Picker Cleanup*.

**Key Screenshots, in `Crops/`:** `50-filmstrip-three-approaches.png`, `31-final-date-flipped.png`, `18-popped-enddate-cross-move.png`, `18-popped-enddate-slide.png`.
