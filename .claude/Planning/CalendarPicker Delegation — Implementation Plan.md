## CalendarPicker Delegation — Implementation Plan

> **Status:** ratified — in execution (go 09-03-2026) · Spec: `CalendarPicker Delegation.md` (the decision log; its §5 carries Nathan's rulings of 09-03-2026) · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. Paths are relative to `Pommora/`.

**Goal**

CalendarPicker's month, year, and time dropdowns become three ordinary PickerMenu mounts, and PickerMenu gains an opt-in smooth height change (`morph`) that CalendarPicker's hosts turn on. At the end, CalendarPicker owns no portal, no positioning, no exit presence, no dismissal listener, and no size animation of its own; PickerMenu's `closing` prop is gone; and PickerMenu's close render is correct: a caller that nulls its children or its anchor in the closing tick still gets a pane that shows its content and holds its place through the Bloom-out.

The shape was settled by the decision log: delegation rides PickerMenu's existing point anchor (`anchorX`/`anchorY`/`anchorHeight`) with the click-time rect frozen in state, because the trigger sits inside a container whose height animates. The height change moves into PickerMenu as a prop defaulting off; a default-on morph was ruled out by the codebase's record of "the bounce" (a measured container re-targeting its transition every frame a self-animating child resizes) and the Reveal/FrameSlide children PickerMenus already carry; a content-owned Reveal was declined by Nathan for the opt-in prop. Scroll-dismiss is dropped as unreachable behind a backdrop. The nested-backdrop z-order finding is deliberately not in scope. The arc's net code delta must be negative; no comment is added that the code doesn't need.

**Requirements**

1. PickerMenu's close render holds: children captured from the last open render, and the placement effect does not re-run once `open` is false (`closing` is one effect late for both).
2. PickerMenu gains `morph?: boolean` (default `false`): the pane's height eases between content heights on `duration.base`, armed after first paint, height written to the element rather than through state, the pane's position re-computed only when its values change.
3. CalendarPicker's month/year dropdown and its time dropdown are two root-mounted, self-managed PickerMenus anchored to the frozen click-time point, `origin` at `auto`, `manageFocus` at its default, list capped through `maxHeight`.
4. CalendarPicker's `PortalMenu`, `rectOf`/`TriggerRect`, both `useExitPresence`, both `useHeld`, the three-mode dismiss effect, `SizeMorph`, `ddWrap`, and `stack.top.menuOverlay` are deleted; the five PickerMenu hosts of CalendarPicker pass `morph`.
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

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `DesignSystemPM.md:302` | PickerMenu row's capability list | `morph` is a capability | 2 |
| `DatetimeValuePicker.tsx:7-9` | "(a PickerMenu or a pane row)" | five PickerMenu hosts, no pane row | 4 |
| `calendar-picker.css.ts:87-89` | "SizeMorph animates the change WITH the slide (one beat, the FrameSlide contract…)" | SizeMorph is gone; the host's `morph` eases on `base` | 4 |
| `stack.ts` `menuOverlay` comment | "a portalled host that has to clear a menu AND its backdrop" | the step is deleted | 4 |
| `RendererRework.md:126` | the CalendarPicker checklist row | the row landed | closeout |

**Dead Vocabulary**

- `SizeMorph` · `PortalMenu` · `data-calmenu` · `ddWrap` · `menuOverlay` · `closingProp` · `menuPresence` · `lastTimeMenu` · `TriggerRect` · `morphAnimated` → each 0 under `rg -F <token> src`. No allowlist.
- `rg -n "^export const morph" src/renderer/DesignSystem/Pickers` → 0 (the new classes are `paneMorph`/`paneMorphArmed`).
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
- [x] `DesignSystemPM.md:302` PickerMenu row names the opt-in height morph and its one constraint: not for a pane whose content animates its own height (Reveal, FrameSlide).

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

- [ ] `rg -F "PortalMenu" src` → 0 · `rg -F "data-calmenu" src` → 0 · `rg -F "ddWrap" src` → 0 · `rg -F "menuPresence" src` → 0 · `rg -F "lastTimeMenu" src` → 0 · `rg -F "TriggerRect" src` → 0 · `rg -F "createPortal" src/renderer/DesignSystem/Pickers/CalendarPicker` → 0. Control: `rg -F "anchorOf" src` → ≥ 3.
- [ ] `rg -F "closeMenus" src/renderer/DesignSystem/Pickers/CalendarPicker/CalendarPicker.tsx` → 4 (definition, nav, two switches).
- [ ] `npm run lint` output read in full: no `noUnusedImports` warning in the two files.
- [ ] Full gate green.
- [ ] Code-only delta for the file reported at the gate (target ≈ −70 before Task 4).

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

#### Task 4: The hosts opt in; SizeMorph goes

**Requirement:** 2, 4, 6, 7

**Why:** With `morph` in the shell, a content component measuring itself is the duplication the ruling removes; the five hosts are the writers of the pane, so they opt in.

**Now** — `rg -F "SizeMorph" src` → 4 · `rg -F "menuOverlay" src` → 1 (after Task 3):

```tsx
// CalendarPicker.tsx:2 (useLayoutEffect and type ReactNode, only SizeMorph's after Task 3), 56-75 (SizeMorph), 543 + 689 (its tags)
// calendar-picker.css.ts:3 (import { duration, easing } — morphAnimated is its only consumer), 24-25
export const morph = style({ overflow: 'hidden' })
export const morphAnimated = style({ transition: `height ${duration.base} ${easing.baseEase}` })
// stack.ts
menuOverlay: 1200, // a portalled host that has to clear a menu AND its backdrop
// Hosts — src/renderer/Properties/PageProperties.tsx:324-329 · Windows/PageWindow.tsx:541-546
// · Views/TableView/TableView.tsx:102 (DatetimeCellPicker) · Views/CardView/CardPickerHost.tsx:166-171
// · Frames/FilterFrame.tsx:111 (FieldPicker, which hosts every filter value picker)
```

**Becomes**

```tsx
// CalendarPicker.tsx — SizeMorph and its two tags deleted (children sit directly in s.root); useLayoutEffect and type ReactNode imports deleted
// calendar-picker.css.ts — morph, morphAnimated, and the duration/easing import deleted
// stack.ts — menuOverlay and its comment deleted
// the five hosts each add `morph` to their PickerMenu; FieldPicker takes `morph?: boolean` and forwards it; the date branch at FilterFrame.tsx:519 passes it
// DatetimeValuePicker.tsx:7-9 → "The caller owns the mount + dismissal (a PickerMenu)."
// calendar-picker.css.ts:87-89 track comment → the viewport's computed height decides the pane; the host's morph eases the change with the slide.
```

**Verify — automated**

- [ ] `rg -F "SizeMorph" src` → 0 · `rg -F "menuOverlay" src` → 0 · `rg -F "morphAnimated" src` → 0 · `rg -F "pane row" src` → 0 · `rg -n "^export const morph" src/renderer/DesignSystem/Pickers` → 0.
- [ ] `rg -c "morph" <file>` ≥ 1 for each of the five host files; `rg -c "morph" src/renderer/Frames/FilterFrame.tsx` → ≥ 3 (prop, forward, date branch). Control: `rg -F "paneMorph" src` → ≥ 6.
- [ ] `npm run lint` output read in full: no `noUnusedImports` warning.
- [ ] Full gate green; `npm run build:showcase` green.

**Verify — user**

- [ ] Navigate from a 5-week month to a 6-week month (TableView datetime cell): the grid slides and the pane grows; the grow and the slide land together (both `base`).
- [ ] Toggle Use Time: the pane's bottom edge either holds or eases; it never snaps.
- [ ] The morph reads correctly with the pane flipped upward.
- [ ] The showcase CalendarPicker (plain div host) snaps; accepted under the ruling.
- [ ] A non-calendar filter value picker in FilterFrame (chips, location) still snaps.

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

- [ ] `rg -F "closingProp" src` → 0. Control: `rg -F "exitClosing" src` → ≥ 3.
- [ ] Full gate green; showcase builds (manual-mode `<PickerMenu solid>` in ComponentsLeaf).

**Verify — user**

- [ ] (none)

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

- [ ] **Phase 1** — PickerMenu · base `b561f10b`
  - [ ] Task 1 — the close render gates on `open` · `<commit>`
  - [ ] Task 2 — `morph` opt-in · `<commit>`
- [ ] **Phase 2** — CalendarPicker · base `<commit>`
  - [ ] Task 3 — two root PickerMenus · `<commit>`
  - [ ] Task 4 — hosts opt in, SizeMorph goes · `<commit>`
  - [ ] Task 5 — delete the `closing` prop · `<commit>`

### Rulings

- 09-03-2026, Nathan: opt-in `morph` over the recommended content-owned Reveal · `origin` auto · morph beat `base` (first ruled `fast`, changed at the go) · the final shape of `picker-base.tsx` and `CalendarPicker.tsx` must read legibly with clear structure · scroll-dismiss dropped · no History, no Handoff · net code delta negative · iteration window available for driving. Unruled, defaults taken by Claude: `manageFocus` default; nested-backdrop z-order untouched; the morph helper stays private to `picker-base.tsx`; the seg input's Escape gains `preventDefault` (pre-existing: it dismissed the calendar too); the switches close the Month/Year dropdown.

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After

- **Nested backdrop z-order** (decision log F2): `backdrop` at `stack.top.menu` so DOM order sorts nesting; would delete OptionEditPopup's capture listener. Needs Nathan's ruling on the swallowed click.
- **TableView's `lastPicker` hold** is redundant for the datetime branch once Task 1 lands; the picker branch still needs the cell for its anchor. Fold when TableView is next opened.
- **CardPickerHost** passes `anchorX` plus a live `triggerRef`; after Task 1 the exit no longer re-places, so the `triggerRef` may be dispensable for that mount.
- **DesignSystemPM.md:302** still names the deleted `PointMenu`.

### Closeout

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

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running over CDP, clause by clause.
- [ ] No PickerMenu mount outside the five hosts and FieldPicker appears in the diff.
- [ ] Net code delta negative, comments and tests excluded.

**The passes**

- [ ] Simplification + comment pass over the whole range, not only per phase.
- [ ] Simplification → code review over the full implementation, in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against the decision log.
- [ ] Attack review over the full range; every finding fixed or ruled.

**The user's own pass**

- [ ] Tasks 1, 3, 4 **Verify — user** lists, in TableView, PageWindow, FilterFrame, and the showcase.
- [ ] In-flight: the outside click peeling only the dropdown; the dropdown taking focus; Use Time closing the Month/Year dropdown; one dropdown at a time; the seg Escape no longer dismissing the calendar; the morph's app-visible work being the grid only (every app host is `range={false}`).

**The record**

- [ ] Made False rewritten in the falsifying commits.
- [ ] Dead Vocabulary sweep at zero against its control (113).
- [ ] RendererRework §2 row removed; Sequenced After carried to §3.

**The report**, in plain English — what shipped and why it matters · what happened along the way · what each screenshot showed · every gate's real output · in-flight decisions · what's left for the live pass · final +/- line count, comments and tests excluded.
