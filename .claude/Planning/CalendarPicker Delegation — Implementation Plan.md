## CalendarPicker Delegation — Implementation Plan

> **Status:** written, pending review · Spec: `CalendarPicker Delegation.md` (the decision log; its §5 carries Nathan's rulings of 09-03-2026) · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. Paths are relative to `Pommora/`.

**Goal**

CalendarPicker's month, year, and time dropdowns become three ordinary PickerMenu mounts, and PickerMenu gains an opt-in smooth height change (`morph`) that CalendarPicker's hosts turn on. At the end, CalendarPicker owns no portal, no positioning, no exit presence, no dismissal listener, and no size animation of its own; PickerMenu's `closing` prop is gone; every PickerMenu whose caller nulls its children on close still shows those children through its Bloom-out.

The shape was settled by the decision log: delegation rides PickerMenu's existing point anchor (`anchorX`/`anchorY`/`anchorHeight`) with the click-time rect frozen in state, because the trigger sits inside a container whose height animates. The height change moves into PickerMenu as a prop defaulting off; a default-on morph was ruled out by the codebase's own record of "the bounce" (a measured container lag-chasing a self-animating child) and the Reveal/FrameSlide children PickerMenus already carry, and a content-owned Reveal was declined by Nathan in favor of the opt-in prop. Scroll-dismiss is dropped as unreachable behind a backdrop. The nested-backdrop z-order finding is deliberately not in scope.

**Requirements**

1. PickerMenu holds its children through the exit even when the caller nulls them in the closing tick.
2. PickerMenu's `closing` prop is deleted; manual mode (`open` undefined) survives for the showcase.
3. PickerMenu gains `morph?: boolean` (default `false`): the pane's height eases between content heights on `duration.fast`, arming after first paint so an open never grows from zero.
4. CalendarPicker's month/year dropdown and its time dropdown are two root-mounted, self-managed PickerMenus anchored to the frozen click-time point, `origin` left at `auto`, `manageFocus` left at its default, list capped through `maxHeight`.
5. CalendarPicker's `PortalMenu`, `rectOf`/`TriggerRect`, both `useExitPresence`, both `useHeld`, the three-mode dismiss effect, `SizeMorph`, `ddWrap`, and `stack.top.menuOverlay` are deleted.
6. Every behavior in the decision log's Preserved table holds; the five PickerMenu hosts of CalendarPicker pass `morph`.
7. Documents that go false are rewritten in the commit that falsifies them.

**Acceptance — the whole thing working:** in the running app, open a datetime cell in TableView; the calendar pane blooms in; the Month title opens a dropdown at the title that Escape peels alone; the hour segment opens a dropdown above it whose rows are still visible through its Bloom-out; toggling Use Time eases the calendar pane's height instead of snapping it; and `rg -F "SizeMorph" src` and `rg -F "closingProp" src` both return zero.

**Forced By**

- `useHeld(children, !closing)` captures `null` in the render where `open` flips false because `closing` turns true one effect later → the hold must gate on `open`, not `closing` (Task 1).
- `menuBackdrop` (1099) sits under `menu` (1100) → a click inside the calendar never reaches a dropdown's backdrop; the dropdown stays open on such clicks, which is today's parity, and no task may "fix" this (Sequenced After).
- Both the outer pane and the dropdown portal into `document.body`; the dropdown mounts later → it is the last `[data-picker-live]` and takes Escape first; its backdrop, DOM-later at the same step, catches the outside click → an outside click now peels only the dropdown (behavior change, user-verify, Task 4).
- PickerMenu's placement effect returns early while `closing` → anchor props may become `undefined` during the exit without moving the pane (Task 4).
- `decidedDir`/`decidedCenter` reset only on `open === false` → a month↔year swap while open keeps its flip decision; harmless, both triggers share a row (Task 4).
- `frame-slide.css.ts` documents the bounce → `morph` is opt-in and its wrapper writes height straight to the element from the ResizeObserver, never through React state (Task 3).
- The showcase's `PopupButton` mounts CalendarPicker in a plain div → that mount loses the morph under the ruling (Task 5, recorded).

**Inherited Reasoning**

- Commit 954b709d folded `lastMenu`/`lastTimeMenu` onto `useHeld` and moved the month/year render gate to the held kind; both were necessary because PickerMenu's own hold is one render late. Task 1 fixes the primitive, so Task 4 removes them as redundant, not as wrong.
- Option 1 of the decision log (Reveal on the second field row plus a CSS transition on the grid viewport, no PickerMenu change) was recommended and declined; Option 2 (default-on morph coordinated by a `data-animating` stamp from Reveal and FrameSlide) was rejected on cost. Neither is retried here.
- `PointMenu` was deleted in 2fb2fadd; DesignSystemPM's PickerMenu row still names it (pre-existing, out of scope, Sequenced After).

**Grounding**

- `src/renderer/DesignSystem/Pickers/picker-base.tsx` — the whole primitive; lines 92-110 the presence/hold, 149-252 placement, 254-269 Escape, 317-347 the shell.
- `src/renderer/DesignSystem/Pickers/CalendarPicker/CalendarPicker.tsx` — lines 24-75 the hand-rolls, 111-155 state and the dismiss effect, 369-398 and 505-539 the two dropdown builders.
- `src/renderer/DesignSystem/Pickers/CalendarPicker/calendar-picker.css.ts` — 24-25 morph styles, 45-55 `ddWrap`/`menuList`, 87-90 the `track` comment naming SizeMorph.
- `src/renderer/DesignSystem/Tokens/stack.ts` — `top.menuOverlay` and its comment.
- `src/renderer/DesignSystem/Menus/frame-slide.css.ts` — the bounce, why the morph is opt-in.
- `src/renderer/Interactions/useHeld.ts`, `src/renderer/Animation/useExitPresence.ts`, `src/renderer/Animation/motion.ts` — the hold, the presence, `duration.fast`.
- `src/renderer/Properties/Assignment/DatetimeValuePicker.tsx` — the shared content; its doc comment names a "pane row" host that doesn't exist.
- `src/renderer/Testing/setup.ts:15-20` — the global ResizeObserver stub; `picker-base.test.tsx` overrides it with its own.
- `.claude/Features/DesignSystemPM.md:302`, `.claude/Features/InteractionPM.md` §Primitives, `.claude/Planning/RendererRework.md:126` — the docs this touches.

**Environment:** plan directory `.claude/Planning/` · spec `CalendarPicker Delegation.md` · explorer: `Explore` · code reviewer: `feature-dev:code-reviewer` (correctness, per the plain-brief rule) · attack reviewer: `build-breaking-agent` · simplification: `code-simplifier` (dual-briefed to report bugs) · comment pass: `comment-killer-agent`, no sub-agents, no worktree · gates from `Pommora/package.json`: `npm run typecheck` · `npm run test` · `npm run lint` · `npm run build:showcase` · rules directory `.claude/Guidelines/` (read; nothing there governs pickers or motion) · live: `env -u ELECTRON_RUN_AS_NODE npm run dev -- --remote-debugging-port=9333`.

**Shapes:** fix (Task 1) · removal (Tasks 2, 4, 5) · additive (Task 3) · refactor (Task 4) · user-visible (Tasks 3, 4, 5).

**Global Constraints (every task inherits these):**

- Gates run from `Pommora/` with `set -o pipefail`, exit codes read directly: `npm run typecheck && npm run test && npm run lint && npm run build:showcase`. Baseline: 317 files / 3942 tests green, typecheck clean, biome clean.
- One tree-touching writer at a time. Stage explicit paths, never `git add -A` (`.claude/` edits are hook-pre-staged and ride the next commit; commit them along).
- Comments: near zero; one load-bearing why at most; never restate a value; `KNOB` markers survive.
- No new dependency. No keyboard shortcuts. No change to PickerMenu's default behavior for any caller not named here.
- Out of scope everywhere: `stack.top.menuBackdrop`, OptionEditPopup's capture listener, TableView's `lastPicker` hold, any Reveal/FrameSlide change, the filter lists' snapping.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `DatetimeValuePicker.tsx:8-9` | "The caller owns the mount + dismissal (a PickerMenu or a pane row)." | no pane-row caller exists; five PickerMenu hosts | 5 |
| `calendar-picker.css.ts:87-89` | "SizeMorph animates the change WITH the slide (one beat, the FrameSlide contract…)" | SizeMorph is gone; the host's `morph` eases on `fast` | 5 |
| `stack.ts` `menuOverlay` comment | "a portalled host that has to clear a menu AND its backdrop" | the step is deleted | 5 |
| `DesignSystemPM.md:302` | PickerMenu row's capability list | `morph` is a capability | 3 |
| `InteractionPM.md` §Primitives | no entry for the pane height morph | a primitive exists | 3 |
| `RendererRework.md:126` | the CalendarPicker checklist row | the row landed; History carries it | closeout |

**Dead Vocabulary**

- `SizeMorph` → 0. `PortalMenu` → 0. `data-calmenu` → 0. `ddWrap` → 0. `menuOverlay` → 0. `closingProp` → 0. `menuPresence` → 0. `lastTimeMenu` → 0. `TriggerRect` → 0. No allowlist.
- Control: `rg -F "PickerMenu" src` → 113. Zero here means the sweep never ran.

---

### Phase 1 — PickerMenu

#### Task 1: The hold gates on `open`

**Requirement:** 1

**Why:** A pane that empties itself for its Bloom-out is the defect the hold exists to prevent; three callers exit empty today, and CalendarPicker's two caller-side holds exist only because the primitive's doesn't work.

**Now** — `rg -F "useHeld(children" src` → 1:

```ts
// src/renderer/DesignSystem/Pickers/picker-base.tsx:110
const body = useHeld(children, !closing)
```

**Becomes**

```ts
// src/renderer/DesignSystem/Pickers/picker-base.tsx
const body = useHeld(children, open !== false)
// manual mode (open undefined) always live · open→false keeps the last open render's children
```

**Assumed by:** Task 4 (drops `lastMenu`/`lastTimeMenu`).

**Verify — automated**

- [ ] Red first: a test in `picker-base.test.tsx` renders `<PickerMenu open onDismiss triggerRef>{open ? <span data-id="body">BODY</span> : null}</PickerMenu>`, re-renders with `open={false}`, and asserts a `[data-picker-portal]` still exists and `[data-id="body"]` reads `BODY`. Expect one failure: `expected undefined to be 'BODY'`. Then green.
- [ ] Full gate green; 3943 tests.

**Verify — user**

- [ ] In FilterFrame, open a date filter's calendar and click off: the pane retracts showing the calendar, not an empty rounded rectangle.

#### Task 2: Delete the `closing` prop

**Requirement:** 2

**Why:** The externally-managed exit had two callers, both CalendarPicker's dropdowns, which Task 4 turns self-managed; a mode with no caller is a mode a future caller misuses.

**Now** — `rg -F "closingProp" src` → 3:

```ts
// src/renderer/DesignSystem/Pickers/picker-base.tsx:52, 75, 94, 100
  closing: closingProp = false,
  closing?: boolean
const closing = selfManaged ? exitClosing : closingProp
liveRef.current = selfManaged ? (open ?? false) || exitClosing : closingProp
```

**Becomes**

```ts
// src/renderer/DesignSystem/Pickers/picker-base.tsx
const closing = selfManaged && exitClosing
liveRef.current = selfManaged && ((open ?? false) || exitClosing)
// prop and its type line deleted · manual mode never closes
```

**Verify — automated**

- [ ] Typecheck goes red on CalendarPicker's two `closing={…Presence.closing}` sites (Task 4 removes them; until then this task is ordered before Task 4 only on paper — execute Tasks 2 and 4 in one commit if the red would otherwise land on `main`, and say so in Deviations).
- [ ] `rg -F "closingProp" src` → 0. Control: `rg -F "exitClosing" src` → ≥ 3.
- [ ] Full gate green.

**Verify — user**

- [ ] The showcase's PickerMenu popup (manual mode) still renders at `npm run build:showcase`.

#### Task 3: `morph`, the opt-in height ease

**Requirement:** 3

**Why:** The pane's content can change height in place (rows toggled on, a 5↔6-week grid); the ruling puts the ease in the one shell every picker mounts, behind a prop, so no content component measures itself again.

**Now** — the shell renders `body` or a `MenuScrollFrame` directly:

```tsx
// src/renderer/DesignSystem/Pickers/picker-base.tsx:335-345
{maxHeight === undefined && !header && !footer ? (
  body
) : (
  <MenuScrollFrame maxHeight={maxHeight ?? s.PICKER_MAX_HEIGHT} header={header} footer={footer}>
    {body}
  </MenuScrollFrame>
)}
```

**Becomes**

```tsx
// src/renderer/DesignSystem/Pickers/picker-base.tsx
morph = false,            // prop; `morph?: boolean` in the type
…
const content = maxHeight === undefined && !header && !footer ? body : (<MenuScrollFrame …>{body}</MenuScrollFrame>)
{morph ? <HeightMorph>{content}</HeightMorph> : content}

function HeightMorph({ children }: { children: ReactNode }): React.JSX.Element {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const o = outer.current
    const i = inner.current
    if (!o || !i) return
    const fit = (): void => { o.style.height = `${i.offsetHeight}px` }
    fit()
    const arm = requestAnimationFrame(() => o.classList.add(s.morphArmed))
    const ro = new ResizeObserver(fit)
    ro.observe(i)
    return () => { cancelAnimationFrame(arm); ro.disconnect() }
  }, [])
  return (
    <div ref={outer} className={s.morph}>
      <div ref={inner}>{children}</div>
    </div>
  )
}
```

```ts
// src/renderer/DesignSystem/Pickers/picker-base.css.ts
export const morph = style({ overflow: 'hidden' })
export const morphArmed = style({ transition: `height ${duration.fast} ${easing.baseEase}` })
```

Height is written to the element from the observer, not through state, so a morph frame re-renders nothing. The existing pane ResizeObserver (line 144) observes the shell, which now grows with `outer`; placement follows it per frame as it does today for a Reveal-bearing pane.

**Assumed by:** Task 5 (five hosts pass `morph`).

**Verify — automated**

- [ ] Red first: a test renders a self-managed PickerMenu with `morph` and asserts the body sits inside an element carrying the `morph` class; a second asserts the default renders no such element. Expect two failures (`morph` unknown prop / class absent). Then green.
- [ ] `rg -F "morph" src/renderer/DesignSystem/Pickers/picker-base.tsx` → ≥ 4. Control: `rg -F "MenuScrollFrame" src/renderer/DesignSystem/Pickers/picker-base.tsx` → 2.
- [ ] Full gate green.
- [ ] `DesignSystemPM.md:302` PickerMenu row names the height morph; `InteractionPM.md` §Primitives gains a one-paragraph **Height morph** entry beside Reveal and FrameSlide (opt-in, why not default: the bounce).

**Verify — user**

- [ ] (surfaces in Task 5)

#### Gate 1 — PickerMenu, no caller moved

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked against a result just watched.
- [ ] Simplification and code review dispatched against `954b709d..HEAD` scoped to `src/renderer/DesignSystem/Pickers/picker-base*` and the two Features docs; reports cite files inside it.
- [ ] Every concern fixed, or carrying a ruling in the Log.
- [ ] Progress hashes filled in.
- [ ] Not a declared stop; Phase 2 opens.

---

### Phase 2 — CalendarPicker

#### Task 4: Two root PickerMenus replace the hand-rolled dropdowns

**Requirement:** 4, 5, 6

**Why:** The anchored-dropdown lifecycle exists once, in PickerMenu; CalendarPicker re-implements it in ~90 lines that also carry its own Escape and outside-click listeners, which fight the primitive's.

**Now** — `rg -F "PortalMenu" src` → 5 · `rg -F "rectOf" src` → 7 · `rg -F "menuPresence" src` → 4:

```tsx
// src/renderer/DesignSystem/Pickers/CalendarPicker/CalendarPicker.tsx
type TriggerRect = { x: number; y: number; w: number; h: number }                 // 24
const rectOf = (el: HTMLElement): TriggerRect => …                               // 25-28
function PortalMenu({ rect, children }) { return createPortal(<div data-calmenu style={{position:'fixed', …zIndex: stack.top.menuOverlay, pointerEvents:'none'}}>…) } // 30-54
const [menu, setMenu] = useState<{ kind: 'month' | 'year'; rect: TriggerRect } | null>(null)      // 111
const [timeMenu, setTimeMenu] = useState<{ which; part; rect: TriggerRect } | null>(null)          // 112-116
const menuPresence = useExitPresence(menu !== null)                              // 117
const timeMenuPresence = useExitPresence(timeMenu !== null)                      // 118
const lastMenu = useHeld(menu, menu !== null)                                    // 119
const lastTimeMenu = useHeld(timeMenu, timeMenu !== null)                        // 120
const rootRef = useRef<HTMLDivElement>(null)                                     // 126
useEffect(() => { … pointerdown / scroll / keydown capture listeners … }, [menu, timeMenu]) // 127-155
const timeOptions = (which, part) => … <PortalMenu rect={lastTimeMenu.rect}><span className={s.ddWrap} …><PickerMenu solid direction="up" closing={timeMenuPresence.closing}>…  // 369-398
{timeMenuPresence.mounted && lastTimeMenu?.which === which && lastTimeMenu.part === part && timeOptions(which, part)}  // 451-454, inside the seg <button>
const selectionMenu = (kind) => menuPresence.mounted && lastMenu ? <PortalMenu rect={lastMenu.rect}><span className={s.ddWrap} …><PickerMenu solid closing={menuPresence.closing}>… // 505-539
{lastMenu?.kind === 'month' && selectionMenu('month')}                           // 557, inside the Month <Button>
{lastMenu?.kind === 'year' && selectionMenu('year')}                             // 570, inside the Year <Button>
<div className={s.root} ref={rootRef}>                                           // 542
```

```ts
// calendar-picker.css.ts:45-55
export const ddWrap = style({ display: 'contents' })
globalStyle(`${ddWrap} > div`, { zIndex: stack.top.menuOverlay, pointerEvents: 'auto' })
export const menuList = style({ display:'flex', flexDirection:'column', gap:'2px', minWidth:'56px', maxHeight:'136px', overflowY:'auto', scrollbarWidth:'none' })
```

**Becomes**

```tsx
// src/renderer/DesignSystem/Pickers/CalendarPicker/CalendarPicker.tsx
type Anchor = { x: number; y: number; h: number }
const anchorOf = (el: HTMLElement): Anchor => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top, h: r.height }
}
/** KNOB — the dropdown list's ceiling. */
const DROPDOWN_MAX_HEIGHT = 136

const [menu, setMenu] = useState<{ kind: 'month' | 'year'; at: Anchor } | null>(null)
const [timeMenu, setTimeMenu] = useState<{ which: 'start' | 'end'; part: 'h' | 'm'; at: Anchor } | null>(null)
const closeMenus = (): void => { setMenu(null); setTimeMenu(null) }
// closeMenus replaces the setMenu(null)/setTimeMenu(null) pairs in nav (206-207) and both switch
// handlers (672, 685); jump keeps setMenu(null); each opener nulls the other family.

// Month/Year trigger onClick:
(e) => { setTimeMenu(null); setMenu(menu?.kind === 'month' ? null : { kind: 'month', at: anchorOf(e.currentTarget) }) }
// Time seg onClick (single):
(e) => { if (e.detail > 1) return; setMenu(null); setTimeMenu(same ? null : { which, part, at: anchorOf(e.currentTarget) }) }

// Both mounted once, as the last children of <div className={s.root}> (no rootRef):
<PickerMenu solid open={menu !== null} onDismiss={() => setMenu(null)}
  anchorX={menu?.at.x} anchorY={menu?.at.y} anchorHeight={menu?.at.h} maxHeight={DROPDOWN_MAX_HEIGHT}>
  {menu && <div className={s.menuList}>{menu.kind === 'month' ? monthRows : yearRows}</div>}
</PickerMenu>
<PickerMenu solid direction="up" open={timeMenu !== null} onDismiss={() => setTimeMenu(null)}
  anchorX={timeMenu?.at.x} anchorY={timeMenu?.at.y} anchorHeight={timeMenu?.at.h} maxHeight={DROPDOWN_MAX_HEIGHT}>
  {timeMenu && <div className={s.menuList}>{timeRows(timeMenu.which, timeMenu.part)}</div>}
</PickerMenu>
// monthRows/yearRows/timeRows are the existing PickerRow maps (516-534, 388-392) lifted out of
// their wrappers; `origin` stays `auto`; `manageFocus` stays default.
```

```ts
// calendar-picker.css.ts
export const menuList = style({ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '56px' })
// ddWrap + its globalStyle deleted; `stack` import deleted
```

Deleted imports: `createPortal`, `useExitPresence`, `useHeld`, `stack`, `type ReactNode` (if unused after `PortalMenu` goes).

**Verify — automated**

- [ ] `rg -F "PortalMenu" src` → 0 · `rg -F "data-calmenu" src` → 0 · `rg -F "ddWrap" src` → 0 · `rg -F "menuPresence" src` → 0 · `rg -F "lastTimeMenu" src` → 0 · `rg -F "TriggerRect" src` → 0. Control: `rg -F "anchorOf" src` → ≥ 3.
- [ ] `rg -F "closeMenus" src/renderer/DesignSystem/Pickers/CalendarPicker/CalendarPicker.tsx` → ≥ 4 (definition, nav, two switches).
- [ ] Full gate green.
- [ ] Code-only delta for the file reported at the gate (target ≈ −90).

**Verify — user** (each in TableView, then once each in PageWindow and FilterFrame)

- [ ] Month dropdown opens under the Month title, centered when it fits; Year likewise; clicking Year while Month is open swaps the list in place.
- [ ] Hour and minute dropdowns open above their segment; near the top of the window they flip below.
- [ ] Escape closes the dropdown and leaves the calendar; a second Escape closes the calendar.
- [ ] An outside click closes only the dropdown (new: today it closed both).
- [ ] A click on a day while a dropdown is open picks the day and leaves the dropdown (parity).
- [ ] Single-click a segment opens; double-click edits inline with the caret in the field; Enter commits, Escape abandons.
- [ ] The dropdown's rows are visible through its Bloom-out.
- [ ] Tab inside the dropdown wraps; closing returns focus to the title/segment (new: default focus management).
- [ ] Wheel over the calendar pane with a dropdown open: nothing scrolls, the dropdown stays.

#### Task 5: The hosts opt in; SizeMorph goes

**Requirement:** 3, 5, 6, 7

**Why:** With `morph` in the shell, a content component measuring itself is the duplication the ruling removes; the five hosts are the writers of the pane, so they opt in.

**Now** — `rg -F "SizeMorph" src` → 4 · `rg -F "menuOverlay" src` → 3 (after Task 4: 1, in `stack.ts`):

```tsx
// CalendarPicker.tsx:56-75
function SizeMorph({ children }) { … ResizeObserver → setH; armed after mount; <div className={cx(s.morph, armed && s.morphAnimated)} style={{height: h || undefined}}><div ref={ref}>{children}</div></div> }
// CalendarPicker.tsx:543, 689
<SizeMorph> … </SizeMorph>
// calendar-picker.css.ts:24-25
export const morph = style({ overflow: 'hidden' })
export const morphAnimated = style({ transition: `height ${duration.base} ${easing.baseEase}` })
// stack.ts
menuOverlay: 1200, // a portalled host that has to clear a menu AND its backdrop
// Hosts (all `<PickerMenu solid open=… onDismiss=… triggerRef=…>`):
// src/renderer/Properties/PageProperties.tsx:323 · src/renderer/Windows/PageWindow.tsx:541
// src/renderer/Views/TableView/TableView.tsx:102 (DatetimeCellPicker) · src/renderer/Views/CardView/CardPickerHost.tsx:166
// src/renderer/Frames/FilterFrame.tsx:112 (FieldPicker — hosts every filter value picker, not only the calendar)
```

**Becomes**

```tsx
// CalendarPicker.tsx — SizeMorph deleted; its two tags become a fragment; `duration`/`easing` imports
// in calendar-picker.css.ts stay (the track keyframes use the CSS vars, so check before deleting)
// The five hosts add `morph`:
<PickerMenu solid morph open=… onDismiss=… triggerRef=…>
// FieldPicker takes `morph?: boolean` and forwards it; the date branch at FilterFrame.tsx:522 passes it.
// stack.ts — `menuOverlay` and its comment deleted.
// DatetimeValuePicker.tsx:7-9 doc → "The caller owns the mount + dismissal (a PickerMenu)."
// calendar-picker.css.ts:87-89 `track` comment → the viewport's computed height decides the pane;
//   the host's morph eases the change with the slide.
```

**Verify — automated**

- [ ] `rg -F "SizeMorph" src` → 0 · `rg -F "menuOverlay" src` → 0 · `rg -F "morphAnimated" src` → 0 · `rg -F "pane row" src` → 0. Control: `rg -F "morph" src` → ≥ 10 (five hosts + FieldPicker + picker-base + css).
- [ ] `rg -F "<PickerMenu solid morph" src` → 4 and FieldPicker's forward → 1.
- [ ] Full gate green; `npm run build:showcase` green.
- [ ] `.claude/Features/DesignSystemPM.md` and `InteractionPM.md` read true against the code.

**Verify — user**

- [ ] TableView datetime cell: toggle Use Time, End Date on then Use Time; the pane's height eases on `fast`.
- [ ] Navigate from a 5-week month to a 6-week month: the grid slides and the pane grows; the grow lands ~100ms before the slide (ruled `fast`; the slide is `base`). Nathan judges whether that reads as one beat.
- [ ] The morph reads correctly with the pane flipped upward (bottom edge pinned, top edge moves).
- [ ] The showcase CalendarPicker (plain div host) snaps; accepted under the ruling.
- [ ] A filter value picker in FilterFrame that is not a calendar (chips, location) still snaps (FieldPicker forwards `morph` only for the date branch).

#### Gate 2 — CalendarPicker, three dropdowns, one morph

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** ticked; every Now count re-run.
- [ ] Simplification, comment pass, and code review dispatched against Phase 2's base..HEAD scoped to `src/renderer/DesignSystem/Pickers/**`, `src/renderer/DesignSystem/Tokens/stack.ts`, the five host files, `DatetimeValuePicker.tsx`.
- [ ] Attack review dispatched (build-breaking-agent) against the whole range `954b709d..HEAD`.
- [ ] Every concern fixed, or carrying a ruling in the Log.
- [ ] Progress hashes filled in; lessons written where they change a later step.
- [ ] Not a declared stop; closeout follows.

---

## Implementation Log

### Progress

- [ ] **Phase 1** — PickerMenu · base `954b709d`
  - [ ] Task 1 — the hold gates on `open` · `<commit>`
  - [ ] Task 2 — delete the `closing` prop · `<commit>`
  - [ ] Task 3 — `morph` opt-in · `<commit>`
- [ ] **Phase 2** — CalendarPicker · base `<commit>`
  - [ ] Task 4 — two root PickerMenus · `<commit>`
  - [ ] Task 5 — hosts opt in, SizeMorph goes · `<commit>`

### Rulings

- 09-03-2026, Nathan: opt-in `morph` over the recommended content-owned Reveal · `origin` auto · morph beat `fast` · scroll-dismiss dropped. Unruled, defaults taken: `manageFocus` default; nested-backdrop z-order untouched.

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After

- **Nested backdrop z-order** (decision log F2): `backdrop` at `stack.top.menu` so DOM order sorts nesting; would delete OptionEditPopup's capture listener. Needs Nathan's ruling on the swallowed click.
- **TableView's `lastPicker` hold** is now redundant for the datetime branch once Task 1 lands; the picker branch still needs the cell for its anchor. Fold when TableView is next opened.
- **DesignSystemPM.md:302** still names the deleted `PointMenu`.
- **PickerMenu's `measure()`** calls `setPos` with a fresh object every ResizeObserver tick; a same-values gate would stop the per-frame re-render during a morph.

### Closeout

---

## Completion Criteria

**The directive**

```
Execute "CalendarPicker Delegation — Implementation Plan.md". Unattended overnight.
Live-verify: the Verify — user lists of Tasks 1, 4, 5 (Nathan, next session); drive them over CDP on 9333 first and screenshot each dropdown open and the pane mid-morph.
Screenshots: Phase 2 — month dropdown open, hour dropdown open (flipped and unflipped), the pane before and after Use Time.
Pings: at completion only.
Record: History arc "CalendarPicker delegates to PickerMenu"; Handoff and Context updated; RendererRework.md:126 row removed.
Also: progress artifact republished at every task and gate; kill the dev instance when done and revert any scratch data.
Everything else is the standard below.
```

**The Standard**

- **The bar.** Not doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong.
- **Only the live confirmation may be pending.** No concerns carried; where an item genuinely can't get there, the Log names which and why.
- **Reusability first.** A second resolver, cache, or validator means the plan is wrong, or you are — log it before proceeding.
- **Fix at the source**, never down-river.
- **Ambiguity:** simplest reading, recorded under Rulings or Deviations, continue.
- **Per phase:** implement → simplify → comment pass → gates → code review → attack review → every finding fixed or ruled → commit. "Done with concerns" is unfinished work.
- **Comments** only where the why can't be inferred. **Docs** rewritten, not amended. Unattributed doc or style edits mid-run are Nathan's; fold them in.

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running over CDP, clause by clause.
- [ ] No caller of PickerMenu outside the five hosts changed behavior (the diff touches no other PickerMenu mount).

**The passes**

- [ ] Simplification + comment pass over the whole range, not only per phase.
- [ ] Simplification → code review over the full implementation, in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against the decision log.
- [ ] Attack review over the full range; every finding fixed or ruled.

**The user's own pass**

- [ ] Tasks 1, 4, 5 **Verify — user** lists, in TableView, PageWindow, FilterFrame, and the showcase.
- [ ] In-flight: the `fast` morph landing ahead of the `base` slide on a 5↔6-week nav; the outside click now peeling only the dropdown; the dropdown taking focus.

**The record**

- [ ] Made False rewritten in the falsifying commits.
- [ ] Dead Vocabulary sweep at zero against its control (113).
- [ ] Context and Handoff current; the History entry written to its format.
- [ ] Sequenced After carried to RendererRework §3 where it belongs.

**The report**, in plain English — what shipped and why it matters · what happened along the way · what each screenshot showed · every gate's real output · in-flight decisions · what's left for the live pass · final +/- line count, comments and tests excluded.
