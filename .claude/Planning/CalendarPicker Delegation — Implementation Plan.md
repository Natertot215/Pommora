## CalendarPicker Delegation — Implementation Plan

> **Status:** closed 09-04-2026 · Spec: `CalendarPicker Delegation.md` (the decision log; its §5 carries Nathan's rulings of 09-03-2026) · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. Paths are relative to `Pommora/`.

**Goal**

CalendarPicker's month, year, and time dropdowns become three ordinary PickerMenu mounts, and PickerMenu gains an opt-in smooth height change (`morph`) that CalendarPicker's hosts turn on. At the end, CalendarPicker owns no portal, no positioning, no exit presence, no dismissal listener, and no size animation of its own; PickerMenu's `closing` prop is gone; and PickerMenu's close render is correct: a caller that nulls its children or its anchor in the closing tick still gets a pane that shows its content and holds its place through the Bloom-out.

The shape was settled by the decision log: delegation rides PickerMenu's existing point anchor (`anchorX`/`anchorY`/`anchorHeight`) with the click-time rect frozen in state, because the trigger sits inside a container whose height animates. The height change moves into PickerMenu as a prop defaulting off; a default-on morph was ruled out by the codebase's record of "the bounce" (a measured container re-targeting its transition every frame a self-animating child resizes) and the Reveal/FrameSlide children PickerMenus already carry; a content-owned Reveal was declined by Nathan for the opt-in prop. Scroll-dismiss is dropped as unreachable behind a backdrop. The nested-backdrop z-order finding is deliberately not in scope. The arc's net code delta must be negative; no comment is added that the code doesn't need.

**Requirements**

1. PickerMenu's close render holds: children captured from the last open render, and the placement effect does not re-run once `open` is false (`closing` is one effect late for both).
2. ~~PickerMenu gains `morph`~~ (withdrawn 09-04-2026, see Rulings). PickerMenu's placement re-renders only when its values change; CalendarPicker owns its height changes: a `base` CSS transition on the grid viewport and a `Reveal` on the second field row.
3. CalendarPicker's month/year dropdown and its time dropdown are two root-mounted, self-managed PickerMenus anchored to the frozen click-time point, `origin` at `auto`, `manageFocus` at its default, list capped through `maxHeight`.
4. CalendarPicker's `PortalMenu`, `rectOf`/`TriggerRect`, both `useExitPresence`, both `useHeld`, the three-mode dismiss effect, `SizeMorph`, `ddWrap`, and `stack.top.menuOverlay` are deleted; no host changes.
5. PickerMenu's `closing` prop is deleted after its last caller is gone; manual mode (`open` undefined) survives for the showcase.
6. Every behavior in the decision log's Preserved table holds; the changes-of-hands are the ones it lists plus the two Task 3 adds.
7. Documents that go false are rewritten in the commit that falsifies them.

**Acceptance — the whole thing working:** in the running app, open a datetime cell in TableView; the calendar pane blooms in; the Month title opens a dropdown at the title that Escape peels alone; the hour segment opens a dropdown above it whose rows are visible and whose position holds through its Bloom-out; navigating from a 5-week month to a 6-week month eases the calendar pane's height instead of snapping it; and `rg -F "SizeMorph" src`, `rg -F "closingProp" src` both return zero.

Every app host passes `range={false}` (`DatetimeValuePicker.tsx:23`, `FilterFrame.tsx:528`), so the End Date row and the second field row never exist in the app; the morph's app-visible work is the 5↔6-week grid (and whatever sub-pixel change Use Time makes to the one field row). The showcase, the one `range` mount, is the mount the ruling leaves without the morph.

**Forced By**

- `useExitPresence` sets `closing` in a passive effect → in the render where `open` flips false, `closing` is still false; both `useHeld(children, !closing)` (110) and the placement guard `|| closing` (152) act one render late. With Task 3's `anchorX={menu?.at.x}` going `undefined` in that render, the placement effect re-runs, finds no point and no `triggerRef`, falls back to the marker's parent (the whole calendar root), re-decides direction (126 has just reset it), and moves the exiting dropdown. Both guards gate on `open` (Task 1). Latent today: CardPickerHost passes `anchorX` plus a live `triggerRef`, so its exit re-places near the right spot.
- `menuBackdrop` (1099) sits under `menu` (1100) → a click inside the calendar never reaches a dropdown's backdrop; the switches stay clickable while a dropdown is open (Task 3's `closeMenus` in the switch handlers; Sequenced After).
- Both the outer pane and the dropdown portal into `document.body`; the dropdown mounts later → it is the last `[data-picker-live]` and takes Escape first; its backdrop, DOM-later at the same step, catches the outside click → an outside click now peels only the dropdown (Task 3, user-verify).
- The showcase's `PopupButton` mounts CalendarPicker in a plain div → that mount loses the morph under the ruling (Task 4, recorded).
- Biome reports `noUnusedImports` as a warning and `noUnusedLocals` is off → a stranded import passes every gate; each removal task names its imports.

**Inherited Reasoning**

- Commit 954b709d folded `lastMenu`/`lastTimeMenu` onto `useHeld` and moved the month/year render gate to the held kind; both were necessary because PickerMenu's own hold is one render late. Task 1 fixes the primitive, so Task 3 removes them as redundant, not as wrong.
- Option 1 of the decision log (Reveal on the second field row plus a CSS transition on the grid viewport, no PickerMenu change) was recommended and declined; Option 2 (default-on morph coordinated by a `data-animating` stamp) was rejected on cost. Neither is retried.
- The morph helper stays file-private in `picker-base.tsx`: one writer, one reader, no export, no Animation primitive entry. If a second shell wants it, that is the moment it moves to `Animation/`.
- `PointMenu` was deleted in 2fb2fadd; DesignSystemPM's PickerMenu row still names it (pre-existing, Sequenced After).

**Grounding**

- `src/renderer/DesignSystem/Pickers/picker-base.tsx` — 92-110 presence/hold, 126 the direction reset, 149-252 placement, 254-269 Escape, 317-347 the shell.
- `src/renderer/DesignSystem/Pickers/CalendarPicker/CalendarPicker.tsx` — 24-75 the hand-rolls, 111-155 state and the dismiss effect, 369-398 and 505-539 the two dropdown builders, 426-429 the seg input's Escape, 671-673 and 684-686 the switch handlers.
- `src/renderer/DesignSystem/Pickers/CalendarPicker/calendar-picker.css.ts` — 3 the `duration`/`easing` import (`morphAnimated` is its only consumer), 24-25 morph styles, 45-55 `ddWrap`/`menuList`, 87-90 the `track` comment naming SizeMorph.
- `src/renderer/DesignSystem/Tokens/stack.ts` — `top.menuOverlay` and its comment.
- `src/renderer/DesignSystem/Menus/frame-slide.css.ts:7-19` — the bounce.
- `src/renderer/Interactions/useHeld.ts`, `src/renderer/Animation/useExitPresence.ts`, `src/renderer/Animation/motion.ts`.
- `src/renderer/Properties/Assignment/DatetimeValuePicker.tsx:7-9` — the doc comment naming a "pane row" host that doesn't exist.
- `src/renderer/Frames/FilterFrame.tsx` — `FieldPicker` 69-117 (its PickerMenu at 111), the date branch opening at 519.
- `src/renderer/Testing/setup.ts:15-20`; `picker-base.test.tsx` (its own RO stub, its `getBoundingClientRect`/`offset*` stubs at 296-318).
- `.claude/Features/DesignSystemPM.md:302`, `.claude/Planning/RendererRework.md:126`.

**Environment:** plan directory `.claude/Planning/` · spec `CalendarPicker Delegation.md` · code reviewer: `feature-dev:code-reviewer` · attack reviewer: `build-breaking-agent` · simplification: `code-simplifier` (dual-briefed to report bugs) · comment pass: `comment-killer-agent`, no sub-agents, no worktree · gates from `Pommora/package.json`: `npm run typecheck` · `npm run test` · `npm run lint` · `npm run build:showcase` · rules directory `.claude/Guidelines/` (nothing there governs pickers or motion) · live: `env -u ELECTRON_RUN_AS_NODE npm run dev -- --remote-debugging-port=9333`; the iteration window (⌘⇧T, `renderer/Utilities/iteration-window`) may mount CalendarPicker behind a button for driving, reverted before closeout.

**Shapes:** fix (Task 1) · additive (Task 2) · refactor + removal (Task 3) · removal (Tasks 4, 5) · user-visible (Tasks 2, 3, 4).

**Global Constraints (every task inherits these):**

- Gates from `Pommora/` with `set -o pipefail`, exit codes read directly: `npm run typecheck && npm run test && npm run lint && npm run build:showcase`. Baseline: 317 files / 3942 tests, typecheck clean, biome clean.
- One tree-touching writer at a time. Stage explicit paths, never `git add -A`. `.claude/` edits are hook-pre-staged and ride the next commit; commit them along.
- No new comments except the one `KNOB` marker Task 3 mints; the comment pass strips anything inferable in touched files. `KNOB` markers survive.
- No new dependency. No keyboard shortcuts. No change to PickerMenu's default behavior for any caller not named here; a fence that would change one is a plan defect, stop and say so.
- Out of scope everywhere: `stack.top.menuBackdrop`, OptionEditPopup's capture listener, TableView's `lastPicker` hold, Reveal, FrameSlide, the filter lists' snapping, History, Handoff.

**Made False**

| Doc                              | The specific claim                                                                  | What makes it false                                   | Task     |
| -------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------- | -------- |
| `DatetimeValuePicker.tsx:7-9`    | "(a PickerMenu or a pane row)"                                                      | five PickerMenu hosts, no pane row                    | 4        |
| `calendar-picker.css.ts:87-89`   | "SizeMorph animates the change WITH the slide (one beat, the FrameSlide contract…)" | SizeMorph is gone; the host's `morph` eases on `base` | 4        |
| `stack.ts` `menuOverlay` comment | "a portalled host that has to clear a menu AND its backdrop"                        | the step is deleted                                   | 4        |
| `RendererRework.md:126`          | the CalendarPicker checklist row                                                    | the row landed                                        | closeout |

**Dead Vocabulary**

- `SizeMorph` · `PortalMenu` · `data-calmenu` · `ddWrap` · `menuOverlay` · `closingProp` · `menuPresence` · `lastTimeMenu` · `TriggerRect` · `morphAnimated` · `paneMorph` · `PaneMorph` → each 0 under `rg -F <token> src`. No allowlist.
- Control: `rg -F "PickerMenu" src` → 113. Zero here means the sweep never ran.

---

### Phase 1 — PickerMenu

#### Task 1: The close render gates on `open`

**Requirement:** 1

**Why:** A pane that empties itself or re-anchors onto its host for its Bloom-out is the defect the hold and the freeze exist to prevent; three callers exit empty today, and Task 3's nulling anchors would make the re-anchor visible.

**Now** — `rg -F "useHeld(children" src` → 1 · `rg -F "|| closing) return" src/renderer/DesignSystem/Pickers/picker-base.tsx` → 1:

```ts
// src/renderer/DesignSystem/Pickers/picker-base.tsx:110, 152
const body = useHeld(children, !closing)
if (!selfManaged || !mounted || closing) return
```

**Becomes**

```ts
// src/renderer/DesignSystem/Pickers/picker-base.tsx
const body = useHeld(children, open !== false)
if (!selfManaged || !mounted || open !== true) return
```

`!mounted` stays: `mounted` turns true one passive effect after `open`, and that render has no pane yet (`paneBox` is 0×0); a placement decided there sticks for the whole open (126 resets only on `open === false`) and flips the wrong way. In the dependency list at 240-252, `closing` is replaced by `open` (no longer read; `open` now is). `useExhaustiveDependencies` is off in `biome.json`, so no tool enforces this either way; a review pass must not add `open` without keeping `!mounted`.

**Assumed by:** Task 3 (drops `lastMenu`/`lastTimeMenu`; passes anchors that null on close).

**Verify — automated**

- [x] Red first, two tests in `picker-base.test.tsx`: (a) children `{open ? <span data-id="body">BODY</span> : null}`, re-render `open={false}`, assert `[data-picker-portal]` exists and `[data-id="body"]` reads `BODY` (fails: `expected undefined to be 'BODY'`); (b) inside the auto-centering describe's stubs, render `open anchorX={400} anchorY={300} anchorHeight={20}`, read the layer's `left`/`top`, re-render `open={false}` with all three anchors omitted, assert both unchanged (fails: the layer moves to the stubbed trigger rect); (c) the flip still measures a real pane: `direction="up"`, `anchorX={400} anchorY={100} anchorHeight={20}`, `offsetHeight` stubbed to 300, assert the layer has `top` (flipped down) and no `bottom` — this test goes red if `!mounted` is dropped from the guard. Then green.
- [x] Full gate green; 3945 tests.

**Verify — user**

- [x] In FilterFrame, open a date filter's calendar and click off: the pane retracts showing the calendar, not an empty rounded rectangle.

#### Task 2: `morph`, the opt-in height ease

**Requirement:** 2

**Why:** The pane's content can change height in place; the ruling puts the ease in the shell every picker mounts, behind a prop, so no content component measures itself.

**Now** — the shell renders `body` or a `MenuScrollFrame` directly; `measure()` calls `setPos` unconditionally:

```tsx
// src/renderer/DesignSystem/Pickers/picker-base.tsx:335-345
{maxHeight === undefined && !header && !footer ? (
  body
) : (
  <MenuScrollFrame maxHeight={maxHeight ?? s.PICKER_MAX_HEIGHT} header={header} footer={footer}>
    {body}
  </MenuScrollFrame>
)}
// :115-122 · :191-192, 204, 209, 217 — six setPos({...}) calls, a fresh object each RO tick
```

**Becomes**

```tsx
// src/renderer/DesignSystem/Pickers/picker-base.tsx
morph = false,
…
morph?: boolean
…
type Pos = { top?: number; bottom?: number; right?: number; left?: number; origin?: string; centered?: boolean }
const [pos, setPosState] = useState<Pos | null>(null)
const setPos = (next: Pos): void =>
  setPosState((prev) =>
    prev && (Object.keys(next) as (keyof Pos)[]).every((k) => prev[k] === next[k]) && Object.keys(prev).length === Object.keys(next).length ? prev : next,
  )
…
const content = maxHeight === undefined && !header && !footer ? body : (<MenuScrollFrame …>{body}</MenuScrollFrame>)
{morph ? <PaneMorph>{content}</PaneMorph> : content}

function PaneMorph({ children }: { children: ReactNode }): React.JSX.Element {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [armed, setArmed] = useState(false)
  useLayoutEffect(() => {
    const o = outer.current
    const i = inner.current
    if (!o || !i) return
    const fit = (): void => {
      o.style.height = `${i.offsetHeight}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(i)
    return () => ro.disconnect()
  }, [])
  useEffect(() => setArmed(true), [])
  return (
    <div ref={outer} className={cx(s.paneMorph, armed && s.paneMorphArmed)}>
      <div ref={inner} className={s.paneMorphBody}>
        {children}
      </div>
    </div>
  )
}
```

```ts
// src/renderer/DesignSystem/Pickers/picker-base.css.ts
import { duration, easing } from '@renderer/Animation/motion'
export const paneMorph = style({ overflow: 'hidden' })
export const paneMorphArmed = style({ transition: `height ${duration.base} ${easing.baseEase}` })
export const paneMorphBody = style({ display: 'flex', flexDirection: 'column' })
```

`paneMorphBody` keeps the pane's flex column for the content, so `morph` is purely additive. The existing pane ResizeObserver (144) observes the shell, which grows with `outer`; placement follows it per frame as it does today for a Reveal-bearing pane, and the `setPos` gate stops the per-frame re-render when the values don't change (the common `down` case).

**Assumed by:** Task 4 (five hosts pass `morph`).

**Verify — automated**

- [x] Red first: a test renders a self-managed PickerMenu with `morph` and asserts the body's closest `[data-picker-portal]` contains an element whose class list includes the `paneMorph` class; a second asserts the default renders none (import the class names from `./picker-base.css`). Expect two failures. Then green.
- [x] `rg -F "paneMorph" src` → ≥ 6. Control: `rg -F "MenuScrollFrame" src/renderer/DesignSystem/Pickers/picker-base.tsx` → 2.
- [x] Full gate green; 3947 tests.
- [x] `DesignSystemPM.md:302` PickerMenu row (withdrawn with the prop in Task 4).

**Verify — user**

- [x] (surfaces in Task 4)

#### Gate 1 — PickerMenu, no caller moved

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked against a result just watched.
- [ ] Simplification, comment pass, and code review dispatched against `b561f10b..HEAD` scoped to `src/renderer/DesignSystem/Pickers/picker-base*` and `DesignSystemPM.md`; reports cite files inside it.
- [ ] Every concern fixed, or carrying a ruling in the Log.
- [ ] Progress hashes filled in.
- [ ] Not a declared stop; Phase 2 opens.

---

### Phase 2 — CalendarPicker

#### Task 3: Two root PickerMenus replace the hand-rolled dropdowns

**Requirement:** 3, 4, 6

**Why:** The anchored-dropdown lifecycle exists once, in PickerMenu; CalendarPicker re-implements it in ~90 lines that also carry its own Escape and outside-click listeners.

**Now** — `rg -F "PortalMenu" src` → 5 · `rg -F "rectOf" src` → 7 · `rg -F "menuPresence" src` → 4:

```tsx
// src/renderer/DesignSystem/Pickers/CalendarPicker/CalendarPicker.tsx
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'   // 2
import { createPortal } from 'react-dom'                                              // 4
import { useExitPresence } from '@renderer/Animation/useExitPresence'                // 10
import { useHeld } from '@renderer/Interactions/useHeld'                              // 11
import { stack } from '@renderer/DesignSystem/Tokens/stack'                           // 12
type TriggerRect = { x: number; y: number; w: number; h: number }                     // 24
const rectOf = (el: HTMLElement): TriggerRect => …                                   // 25-28
function PortalMenu({ rect, children }) …                                             // 30-54
const [menu, setMenu] = useState<{ kind: 'month' | 'year'; rect: TriggerRect } | null>(null)          // 111
const [timeMenu, setTimeMenu] = useState<{ which; part; rect: TriggerRect } | null>(null)              // 112-116
const menuPresence = useExitPresence(menu !== null)                                  // 117
const timeMenuPresence = useExitPresence(timeMenu !== null)                          // 118
const lastMenu = useHeld(menu, menu !== null)                                        // 119
const lastTimeMenu = useHeld(timeMenu, timeMenu !== null)                            // 120
const rootRef = useRef<HTMLDivElement>(null)                                         // 126
useEffect(() => { … pointerdown / scroll / keydown capture listeners … }, [menu, timeMenu])  // 127-155
const timeOptions = (which, part) => … <PortalMenu rect={lastTimeMenu.rect}>…<PickerMenu solid direction="up" closing={timeMenuPresence.closing}>…  // 369-398
else if (e.key === 'Escape') setSegEdit(null)                                        // 428
{timeMenuPresence.mounted && lastTimeMenu?.which === which && lastTimeMenu.part === part && timeOptions(which, part)}  // 451-454
const selectionMenu = (kind) => … <PortalMenu rect={lastMenu.rect}>…<PickerMenu solid closing={menuPresence.closing}>…  // 505-539
<div className={s.root} ref={rootRef}>                                               // 542
{lastMenu?.kind === 'month' && selectionMenu('month')}                               // 557
{lastMenu?.kind === 'year' && selectionMenu('year')}                                 // 570
onChange={(v) => { setEndOn(v); if (!v) setEnd(null); setSegEdit(null); setTimeMenu(null) }}   // 668-673
onChange={(v) => { setTimeOn(v); setSegEdit(null); setTimeMenu(null) }}             // 682-686
```

```ts
// calendar-picker.css.ts:8, 45-55
import { stack } from '@renderer/DesignSystem/Tokens/stack'
export const ddWrap = style({ display: 'contents' })
globalStyle(`${ddWrap} > div`, { zIndex: stack.top.menuOverlay, pointerEvents: 'auto' })
export const menuList = style({ display:'flex', flexDirection:'column', gap:'2px', minWidth:'56px', maxHeight:'136px', overflowY:'auto', scrollbarWidth:'none' })
```

**Becomes**

```tsx
// src/renderer/DesignSystem/Pickers/CalendarPicker/CalendarPicker.tsx
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
type Anchor = { x: number; y: number; h: number }
const anchorOf = (el: HTMLElement): Anchor => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top, h: r.height }
}
/** KNOB — the dropdown list's ceiling. */
const DROPDOWN_MAX_HEIGHT = 136

const [menu, setMenu] = useState<{ kind: 'month' | 'year'; at: Anchor } | null>(null)
const [timeMenu, setTimeMenu] = useState<{ which: 'start' | 'end'; part: 'h' | 'm'; at: Anchor } | null>(null)
const closeMenus = (): void => {
  setMenu(null)
  setTimeMenu(null)
}

onClick={(e) => { setTimeMenu(null); setMenu(menu?.kind === 'month' ? null : { kind: 'month', at: anchorOf(e.currentTarget) }) }}
onClick={(e) => { if (e.detail > 1) return; setMenu(null); setTimeMenu(timeMenu?.which === which && timeMenu.part === part ? null : { which, part, at: anchorOf(e.currentTarget) }) }}
else if (e.key === 'Escape') { e.preventDefault(); setSegEdit(null) }

<div className={s.root}>
  …
  <PickerMenu solid open={menu !== null} onDismiss={() => setMenu(null)} anchorX={menu?.at.x} anchorY={menu?.at.y} anchorHeight={menu?.at.h} maxHeight={DROPDOWN_MAX_HEIGHT}>
    {menu && <div className={s.menuList}>{menu.kind === 'month' ? monthRows() : yearRows()}</div>}
  </PickerMenu>
  <PickerMenu solid direction="up" open={timeMenu !== null} onDismiss={() => setTimeMenu(null)} anchorX={timeMenu?.at.x} anchorY={timeMenu?.at.y} anchorHeight={timeMenu?.at.h} maxHeight={DROPDOWN_MAX_HEIGHT}>
    {timeMenu && <div className={s.menuList}>{timeRows(timeMenu.which, timeMenu.part)}</div>}
  </PickerMenu>
</div>
```

`monthRows`/`yearRows`/`timeRows` are the existing `PickerRow` maps (516-534, 388-392) lifted out of their wrappers as thunks, so a closed dropdown builds nothing on the calendar's per-pointermove renders. `nav` (206-207) and both switch handlers call `closeMenus()`; `jump` keeps `setMenu(null)`. `useLayoutEffect` and `type ReactNode` stay imported until Task 4 deletes `SizeMorph`.

```ts
// calendar-picker.css.ts
export const menuList = style({ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '56px' })
```

`ddWrap`, its `globalStyle`, and the `stack` import are deleted.

**Verify — automated**

- [x] `rg -F "PortalMenu" src` → 0 · `rg -F "data-calmenu" src` → 0 · `rg -F "ddWrap" src` → 0 · `rg -F "menuPresence" src` → 0 · `rg -F "lastTimeMenu" src` → 0 · `rg -F "TriggerRect" src` → 0 · `rg -F "createPortal" src/renderer/DesignSystem/Pickers/CalendarPicker` → 0. Control: `rg -F "anchorOf" src` → ≥ 3.
- [x] `rg -F "closeMenus" src/renderer/DesignSystem/Pickers/CalendarPicker/CalendarPicker.tsx` → 4 (definition, nav, two switches).
- [x] `npm run lint` output read in full: no `noUnusedImports` warning in the two files.
- [x] Full gate green.
- [x] Code-only delta for the file reported at the gate (target ≈ −70 before Task 4).

**Verify — user** (each in TableView, then once each in PageWindow and FilterFrame)

- [ ] Month dropdown opens under the Month title, centered when it fits; Year likewise; clicking Year while Month is open swaps the list in place.
- [ ] Hour and minute dropdowns open above their segment; near the top of the window they flip below.
- [ ] Escape closes the dropdown and leaves the calendar; a second Escape closes the calendar.
- [ ] An outside click closes only the dropdown (changed: today it closed both).
- [ ] Toggling Use Time closes an open Month/Year dropdown (changed: today only the time dropdown closed).
- [ ] Opening the hour dropdown while the Month dropdown is open closes the Month dropdown (changed: today both could stand at once).
- [ ] A click on a day while a dropdown is open picks the day and leaves the dropdown (parity).
- [ ] Single-click a segment opens; double-click edits inline with the caret in the field; Enter commits; Escape abandons the field and leaves the calendar open (changed: today the Escape also dismissed the calendar).
- [ ] The dropdown's rows are visible, and its position holds, through its Bloom-out.
- [ ] Tab inside the dropdown wraps; closing returns focus to the title/segment (changed: default focus management).
- [ ] Wheel over the calendar pane with a dropdown open: nothing scrolls, the dropdown stays.

#### Task 4: SizeMorph goes; the calendar owns its height changes

**Requirement:** 2, 4, 6, 7

**Why:** The pane already follows its content's height; only the ease was missing, and the two things that change height already have a house primitive each (a fixed-pixel viewport → a CSS transition; a row appearing → `Reveal`, the same primitive the menu recipe's `reveal` row option wraps).

**Now** — `rg -F "SizeMorph" src` → 4 · `rg -F "menuOverlay" src` → 1 · `rg -F "paneMorph" src` → 7 (Task 2's prop, withdrawn):

```tsx
// CalendarPicker.tsx:29-48 SizeMorph; 450 + 596 its tags; 552-557 the second time row behind `timeOn &&`
// calendar-picker.css.ts:23-24 morph/morphAnimated; 80 viewport; 81-83 the track comment naming SizeMorph; 140-147 fields gap 6px
// picker-base.tsx PaneMorph + `morph` prop; picker-base.css.ts paneMorph*; picker-base.test.tsx 'PickerMenu morph'
// stack.ts menuOverlay · DatetimeValuePicker.tsx:9 "(a PickerMenu or a pane row)" · DesignSystemPM.md:302 the morph clause
```

**Becomes**

```tsx
// CalendarPicker.tsx
import { Reveal } from '@renderer/Animation/Reveal'
<Reveal open={timeOn} fill>
  <div className={cx(s.fieldRow, s.fieldRowStacked)}>…</div>
</Reveal>
// calendar-picker.css.ts
export const viewport = style({ overflow: 'hidden', transition: `height ${duration.base} ${easing.baseEase}` })
export const fieldRowStacked = style({ paddingTop: '6px' })
// fields drops its gap: a collapsed Reveal wrapper would otherwise hold a phantom 6px
// picker-base.tsx / .css.ts / .test.tsx — Task 2's morph removed; the setPos gate stays
// stack.ts — menuOverlay deleted · DatetimeValuePicker doc → "(a PickerMenu)" · DesignSystemPM row → no morph clause
```

**Verify — automated**

- [x] `rg -F "SizeMorph" src` → 0 · `rg -F "menuOverlay" src` → 0 · `rg -F "morphAnimated" src` → 0 · `rg -F "pane row" src` → 0 · `rg -F "paneMorph" src` → 0 · `rg -F "PaneMorph" src` → 0.
- [x] Scoped gates green (biome on the touched dirs, typecheck shows no error in a touched file, vitest over DesignSystem/Views/Properties: 57 files, 592 tests). The whole-tree gates are red on the peer session's in-flight Glance rename, not on this range (see Deviations).

**Verify — user**

- [ ] TableView datetime cell: navigate from a 5-week month to a 6-week month; the grid slides and the pane grows on one beat.
- [ ] Toggle Use Time in single mode: the one field row changes by ~2px (the time field is taller than the date field), instantly; nothing eases a 2px sibling swap.
- [ ] Showcase CalendarPicker (`range`): with Use Time already on, End Date on unfolds the second time row and End Date off folds it (both directions, menu-recipe beat); Use Time on/off with End Date on does the same.
- [ ] The grid ease reads correctly with the pane flipped upward.

#### Task 5: Delete the `closing` prop

**Requirement:** 5

**Why:** The externally-managed exit's only two callers are gone; a mode with no caller is a mode a future caller misuses.

**Now** — `rg -F "closingProp" src` → 3:

```ts
// src/renderer/DesignSystem/Pickers/picker-base.tsx:52, 74, 94, 100
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
```

**Verify — automated**

- [x] `rg -F "closingProp" src` → 0. Control: `rg -F "exitClosing" src` → ≥ 3.
- [x] Full gate green; showcase builds (manual-mode `<PickerMenu solid>` in ComponentsLeaf).

**Verify — user**

- [x] (none)

#### Gate 2 — CalendarPicker, three dropdowns, one morph

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** ticked; every Now count re-run.
- [ ] Simplification, comment pass, and code review dispatched against Phase 2's base..HEAD scoped to `src/renderer/DesignSystem/Pickers/**`, `src/renderer/DesignSystem/Tokens/stack.ts`, the five host files, `DatetimeValuePicker.tsx`.
- [ ] Attack review dispatched (build-breaking-agent) against `b561f10b..HEAD`.
- [ ] Every concern fixed, or carrying a ruling in the Log.
- [ ] Code-only delta for the arc computed and negative.
- [ ] Progress hashes filled in.
- [ ] Not a declared stop; `/closeout` follows (no History entry, no Handoff).

---

## Implementation Log

### Progress

- [x] **Phase 1** — PickerMenu · base `b561f10b`
  - [x] Task 1 — the close render gates on `open` · `f66cf8ab`
  - [x] Task 2 — `morph` opt-in · `43f87590` (+ `46efc7d8` simplification)
- [x] **Phase 2** — CalendarPicker · base `46efc7d8`
  - [x] Task 3 — two root PickerMenus · `ecc20fe5`
  - [x] Task 4 — SizeMorph goes, the calendar owns its height changes · `b313ae08`
  - [x] Task 5 — delete the `closing` prop · `41cb479a`
  - [x] Gate 2 folds — `7754b058` (simplification), `c457d17f` (45px list), `bcadb531` (attack fold), `dc9326c9` (simplification rerun + comment pass)

### Rulings

- 09-04-2026, Nathan (mid-execution, after Task 3): the opt-in `morph` prop is withdrawn — "does size morph even need to exist if a picker is height adjustable anyways? If content shift is simpler, why don't we redo this with that instead?" — and the Menu recipe's reveal (a `Reveal`-wrapped row) is the pattern to follow. Task 4 is rewritten to the decision log's Option 1: SizeMorph deleted, the grid viewport eases on `base`, the second field row rides `Reveal` on the recipe's default beat. Task 2's `PaneMorph`, its styles, tests, and doc clause are removed in Task 4; the `setPos` gate stays (it stops per-frame re-renders for every Reveal-bearing pane, FilterFrame's included).
- 09-03-2026, Nathan: opt-in `morph` over the recommended content-owned Reveal · `origin` auto · morph beat `base` (first ruled `fast`, changed at the go) · the final shape of `picker-base.tsx` and `CalendarPicker.tsx` must read legibly with clear structure · scroll-dismiss dropped · no History, no Handoff · net code delta negative · iteration window available for driving. Unruled, defaults taken by Claude: `manageFocus` default; nested-backdrop z-order untouched; the morph helper stays private to `picker-base.tsx`; the seg input's Escape gains `preventDefault` (pre-existing: it dismissed the calendar too); the switches close the Month/Year dropdown.

### Open Against Later Tasks

- Gate 1 code review (Unproven, all three): a `header`/`footer`/`maxHeight` that flips in the closing tick would change the scroll-frame wrap mid-exit (no caller does); the backdrop, `data-picker-live`, and `pointerEvents: none` still gate on `closing` rather than `open`, a one-frame inconsistency only a non-discrete close could reach; `TileHandleMenu` mints `triggerRef={{ current }}` per render (pre-existing, neutralized by the `setPos` gate).
### Deviations

- Gate 2 attack review folded: the second time row's `Reveal` moved outside the `endOn` branch (`open={endOn && timeOn}`) so it unfolds and folds in both toggle orders instead of mounting expanded; `scrollFrameBody` (`menu-base.css.ts`) gained `scrollbarWidth: 'none'`, which the deleted `menuList` rule used to carry and which the showcase bundle's missing global `::-webkit-scrollbar` rule had exposed for every menu there; the Sequenced After line proposing to fold TableView's `lastPicker` was wrong (that hold is what keeps the picker element rendered through its exit; PickerMenu's hold covers only a rendered pane) and was removed here and from RendererRework §3.
- Use Time in single mode moves the pane by 2px instantly (measured 275→273); the acceptance line claiming it never snaps was rewritten to the measured fact.
- A peer session works this branch concurrently (the Glance rename). Its staged renames rode Task 3's commit `ecc20fe5` (both `git add <paths>` and `git commit --only <paths>` swept the already-staged index entries); that commit's tree is broken by the peer's half-landed rename, not by this range. From Task 4 on, foreign staged paths are unstaged before each commit and re-staged after.
- The same peer session ran `git stash` mid-Task 4 (`stash@{0}` on `ecc20fe5`), which carried away half of this plan's uncommitted Task 4 edits; they were re-applied idempotently on the current tree. That stash is the peer's and was left untouched; it still holds a copy of those edits.
- Whole-tree `npm run typecheck` and `npm run test` are red during execution on the peer's in-flight files (`Interface/Glance/*`, `PageView`, `MarkdownPM/*`); every gate here is read scoped to this plan's files, with the failing paths recorded.
### Lessons

### Sequenced After

- **Nested backdrop z-order** (decision log F2): `backdrop` at `stack.top.menu` so DOM order sorts nesting; would delete OptionEditPopup's capture listener. Needs Nathan's ruling on the swallowed click.
- **CardPickerHost** passes `anchorX` plus a live `triggerRef`; after Task 1 the exit no longer re-places, so the `triggerRef` may be dispensable for that mount.(sweep on closeout)

### Closeout

**Closed 09-04-2026.** Gate 1: simplifier (a block move, one test helper) and code review (three Unproven notes, filed above). Gate 2: simplifier reordered CalendarPicker into one spine and lifted its module-level helpers; code review found nothing reachable (two pre-existing cosmetic notes: a month jump mid-slide, the drag ref's reliance on pointer capture); the attack review's three Lows were folded (`bcadb531`); the simplifier rerun trimmed the guards to `open` alone (`dc9326c9`); the manual comment pass removed one test comment. Neutral verifier's adjudication of the Delivery Claim follows in the report. Dead-vocabulary sweep: every retired token at 0 against control `PickerMenu` → 116. Delta over this plan's paths, tests excluded: raw numstat **+295 −387 = −92**, of which the peer's lines are picker-base `+9 −5` and TableView `+6 −7`; this plan alone ≈ +280 −375 = −95, and with comments and blank lines stripped ≈ **−102**. The whole-tree gates were red during execution on the peer session's in-flight files and green on this plan's paths throughout; at closeout (`dc9326c9`) `typecheck`, `test`, `lint`, and `build:showcase` are all green tree-wide, the peer's stash is gone, and no worktree exists. The neutral verifier held every assertion of the Delivery Claim, with two wordings corrected here: the retired-token sweep is the Dead Vocabulary list (not `useHeld`/`useExitPresence`, which live on elsewhere), and the changes of hands also include End Date closing an open Month/Year dropdown and the dropped scroll-dismiss. RendererRework's §2/§3 edits rode the peer's commit `a3ce42eb` through the auto-stage hook, and its Settled-5 line left in `e7e3bd17` ahead of the prop's deletion in `41cb479a`. The dev instance on 9333 predates this session's driving and was left running.

**Live drive, 09-04-2026, over CDP on 9333** (the iteration window mounted CalendarPicker behind two buttons: a `range={false}` mount opening downward mid-window, a `range` mount opening near the bottom edge; scaffolding reverted at closeout; 14 screenshots in the session scratchpad):

- Month dropdown opened under the Month title (12 rows, capped list); clicking Year swapped the list in place (21 rows) without an exit; Escape peeled the dropdown alone, the rows visible through the exit (`data-picker-live` gone, 21 rows still rendered), and the calendar pane stayed.
- Minute dropdown opened above its segment (`direction="up"`, pane bottom 413 against a segment at ~430), first row focused; Tab moved focus 00→05 inside the dropdown; an outside click at (40,40) peeled only the dropdown; the calendar stayed.
- Double-click on a segment produced the inline input with focus; Escape abandoned it and the calendar pane stayed open.
- With the Month dropdown open, toggling Use Time closed it (the pane's height moved 275→273 on the sub-pixel row change).
- Nav from February 2026 (4 rows) to March (5 rows): pane height sampled 274→278→288→294→298→300 across ~280ms, the viewport's computed `transition: height 0.28s`.
- Range mount near the bottom: End Date on left the height at 274 (the row swaps content); Use Time on revealed the second time row (274→308, 34→37 buttons). The pane had decided `down` at open (it fit at 274) and grew past the viewport bottom (1050 vs 1027) — pre-existing behavior of the once-per-open flip decision, identical under SizeMorph; noted for Nathan, not changed.
- End Date path (Nathan's ask, driven on the `range` mount): End Date on filled the second date field with a placeholder; picking Feb 12 set both fields (`2026-02-01`, `2026-02-12`) and painted the 10-cell band; Use Time on revealed the second time row (274→308) with start 9:00 AM and end 5:00 PM; the end-hour segment opened its dropdown above itself with the current hour checked, and a pick landed; End Date off cleared the end field and the band and the pane returned to one row (276).
- Code-only delta is stated once, in the Closeout entry.
---

## Completion Criteria

**The directive**

```
Execute "CalendarPicker Delegation — Implementation Plan.md". Unattended overnight.
Live-verify: the Verify — user lists of Tasks 1, 3, 4 (Nathan, next session); drive them over CDP on 9333 first and screenshot each dropdown open and the pane mid-morph.
Screenshots: Phase 2 — month dropdown open, hour dropdown open (flipped and unflipped), the pane before and after Use Time.
Pings: at completion only.
Record: no History entry, no Handoff; RendererRework.md:126 row removed, Sequenced After carried to its §3.
Also: progress artifact republished at every task and gate; iteration-window scaffolding reverted; dev instance killed; scratch data reverted.
Everything else is the standard below.
```

**The Standard**

- **The bar.** Not doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong.
- **Only the live confirmation may be pending.** No concerns carried; where an item genuinely can't get there, the Log names which and why.
- **Reusability first.** A second resolver, cache, or validator means the plan is wrong, or you are — log it before proceeding.
- **Fix at the source**, never down-river.
- **Ambiguity:** simplest reading, recorded under Rulings or Deviations, continue.
- **Per phase:** implement → simplify → comment pass → gates → code review → attack review → every finding fixed or ruled → commit. "Done with concerns" is unfinished work.
- **Comments** only where the why can't be inferred; none added beyond the one KNOB. **Docs** rewritten, not amended. Unattributed doc or style edits mid-run are Nathan's; fold them in.

**The deliverable**

- [x] Every numbered requirement traces to a landed task.
- [x] The acceptance criterion observed running over CDP, clause by clause.
- [x] No PickerMenu mount outside this plan's paths appears in the diff (no host changed at all after the morph was withdrawn).
- [x] Net code delta negative, comments and tests excluded.

**The passes**

- [x] Simplification + comment pass over the whole range, not only per phase.
- [x] Simplification → code review over the full implementation, in that order.
- [x] Delivery Claim written, then checked by a neutral verifier against the decision log.
- [x] Attack review over the full range; every finding fixed or ruled.

**The user's own pass**

- [ ] Tasks 1, 3, 4 **Verify — user** lists, in TableView, PageWindow, FilterFrame, and the showcase.
- [ ] In-flight: the outside click peeling only the dropdown; the dropdown taking focus; Use Time closing the Month/Year dropdown; one dropdown at a time; the seg Escape no longer dismissing the calendar; the morph's app-visible work being the grid only (every app host is `range={false}`).

**The record**

- [x] Made False rewritten in the falsifying commits.
- [x] Dead Vocabulary sweep at zero against its control (116 at closeout).
- [x] RendererRework §2 row removed; Sequenced After carried to §3.

**The report**, in plain English — what shipped and why it matters · what happened along the way · what each screenshot showed · every gate's real output · in-flight decisions · what's left for the live pass · final +/- line count, comments and tests excluded.
