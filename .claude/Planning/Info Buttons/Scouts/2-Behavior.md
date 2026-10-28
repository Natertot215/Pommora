### Scout 2 — Behavior

**DATE:** 10-27-2026
**SCOPE:** the InfoButton's glyph, hover, hold, close, touch, one-open slot, click containment, disabled rows, and the pane's frame (A-1 to A-5, B-1 to B-4, C-4, the Default Look and Pane Width rulings). Read at `active` (`6f283376f`); cleaned against *Info Buttons — Investigation*.

---

#### Contradictions With the Log

1. **B-2's Mechanism:** the log says `useHoverReveal` "takes its dwell per caller." It doesn't: the open timer reads the module constant, `open ? REVEAL_DWELL_MS : REVEAL_GRACE_MS` (`UIX/Interactions/hoverReveal.ts:77`), and `dwell` is a boolean (`:31`, `:37`). A per-caller dwell is a change to the hook, the smallest of the set (*§The Dwell*).
2. **B-4's Opt-Out:** `on: dwell && coarse() ? active : active && on` (`hoverReveal.ts:156`) makes every dwell instance permanently on under `(hover: none)`, so an InfoButton on the hook as it stands would show its pane on every touch device as it mounts. With no dwell on a coarse screen, `settle` never opens (`:68`), the listeners never register (`:126-131`, `:140-154`), and the tap's click drives the held state. That needs `coarse` (`:18`, private) exported.
3. **B-1's Second Click and Escape:** with the pane open while `held || reveal.on`, a second click while the pointer still rests on the glyph un-holds the pane, but `reveal.on` stays true, so the pane stays open. Escape on an unheld, hover-opened pane is consumed (`UIX/Interactions/dismissalStack.ts:86-88`) and calls `onDismiss`, but `held` is already false and nothing turns the reveal off, because `reset` isn't returned (`hoverReveal.ts:156`). Two existing paths cover part of it:
   - `engaged: held` with no `press()` resets on every flip of `held` (`:133-139`; `hoverReveal.test.tsx:173`, `:258`), which fixes the second click but not Escape on an unheld pane.
   - `active: !held` resets through `useEffect(() => api.reset, [active])` (`:132`), with the same gap.
   - Returning `reset`, already built and identity-stable inside `api` (`:81-86`, `:122`), closes both: `close = () => { setHeld(false); reveal.reset() }` serves as the second click, `onDismiss`, and the one-open slot's closer.

---

#### Findings

##### The Dwell (B-2)

- **Callers:** `DetailTitleHeader.tsx:62-64` (`dwell: true`), `ViewTile.tsx:275-276` (`dwell: true`, one per tile on a homepage), and `Disclosure.tsx:84` (no dwell). `REVEAL_DWELL_MS` is also named as their own dwell by `GhostOptionChip.tsx:11` and `useViewInteractions.tsx:440`, and by `DetailTitleHeader.test.tsx:63`, `PropertyPanel.test.tsx:488`, and `cardCreation.test.tsx:100`, `:176`. All of them keep 1.5 seconds.
- **`dwell` is only tested for truthiness** (`hoverReveal.ts:68`, `:127`, `:141`, `:156`), and `live.current.dwell` refreshes every render (`:53`).
- **Shapes:**
  - **`dwellMs?: number` in place of `dwell`:** a reveal dwells when it carries one; `DetailTitleHeader` and `ViewTile` pass `REVEAL_DWELL_MS`; the kit's other dwell names its duration the same way (`UIX/Interactions/ghostCreate.ts:14-15`; callers `Sidebar.tsx:326`, `TileGrid.tsx:511`). `hoverReveal.test.tsx:54` and `:202` change with it.
  - **`dwell?: boolean | number`:** at `:77`, `typeof s.dwell === 'number' ? s.dwell : REVEAL_DWELL_MS`, with `:68` coerced; no caller changes.
  - **`dwellMs` beside `dwell: boolean`:** two options for one concept.
- **The InfoPane's Own Value:** `INFO_DWELL_MS = 500 // KNOB` in the InfoButton's file, as `GLANCE_DWELL` (`Core/Interface/Glance/glanceAction.ts:15`) sits with its owner.
- **Per-Instance Cost:** four window capture listeners (`pointerdown`, `pointerup`, `pointercancel`, `contextmenu`) for the instance's lifetime (`:140-154`), plus one `once` `pointermove` per `held` or dwell change (`:126-131`). Every primary press runs N `holdOff` → `settle` calls of a few field reads, with no allocation or layout, per press rather than per move. `ViewTile` already carries N instances, and two example rows are trivial. At Settings scale (63 captions) the consolidation is one document listener alive while any dwell instance exists, as `dismissalStack.ts:93-101` does; it changes the hook for every caller and isn't needed now.

##### Touch (B-4)

- `coarse()` is the only touch detection in the tree (`hoverReveal.ts:18`); the other hits are CSS `(hover: none)` (`UIX/Buttons/button-base.css.ts:137`, `UIX/Interactions/hover-reveal.css.ts:14`) and a reduced-motion query (`UIX/Animations/motion.ts:25`).
- **Mechanism:** the InfoButton passes no dwell when `coarse()`. On touch, `on` is then `active && on`, and `on` is set only by `settle` (which needs a dwell) or `flip` (which needs a recorded `press()` the InfoButton never makes), so it stays false; a tap's synthetic `pointerenter` does nothing, and the tap's `click` toggles `held`. Other callers keep resting open, and `hoverReveal.test.tsx:191` ("under (hover: none) it is on whenever it is active") stays true.
- **Alternative:** a hook option (`touch: 'rest' | 'tap'`), more surface for one caller beside a policy the log keeps for everyone else.

##### Opening, Holding, Closing (B-1)

- **Escape Closes the Pane First:** `onKeyDown` walks entries top-down, skips closing or non-dismissable ones, and prevents default before dismissing the first (`dismissalStack.ts:81-91`). The InfoPane is pushed last, so it's on top. For a portalled layer, `ownerWindow` resolves the window through the entry's trigger (`:31-38`), so an InfoPane inside a window passes the top-window check.
- **An Outside Press Closes It and Still Lands:** `focus="keep"` gives `shield: false` (`UIX/Pickers/PickerMenu.tsx:122`). Inside a parent pane, the parent holds the target as `'layer'`, so only the entries above it dismiss (`dismissalStack.ts:64-79`; `PickerMenu.test.tsx:230`).
- **The Trigger Counts as Inside:** `triggerInside: focus === 'keep'` (`PickerMenu.tsx:120`) makes `holds` return `'layer'` for the trigger (`dismissalStack.ts:41-48`), with no dismiss and no `suppressReleaseClick` (`:76-78`), so the glyph's own `onClick` runs and is the toggle. Under `trap` or `leave` the stack dismisses and swallows the click, which is why `ManageRow`'s `setOpen((o) => !o)` (`UIX/Menus/ManageRow.tsx:48`) works the other way round.
- **React 19 Enter and Leave Walk Through Portals** (react-dom 19.2.7): `getParent` climbs `fiber.return` and skips every fiber that isn't a host component, portals included (`node_modules/react-dom/cjs/react-dom-client.development.js:19803-19808`), so moving from the glyph into the portalled pane fires no leave on a host enclosing both in the component tree. The `onPointerEnter` and `onPointerLeave` handlers sit on a wrapper enclosing the glyph and the `<PickerMenu>`; on the `<button>` with the pane as its sibling, the crossing fires a leave. `ManageRow`'s `trailingCluster` span (`ManageRow.tsx:41-61`) is that shape. The 6px gap (`UIX/Menus/menuAnchor.ts:4`) crosses the row underneath within the 150ms grace (`hoverReveal.ts:13`; "re-entering within the grace keeps it open," `hoverReveal.test.tsx:79`).
- **The Pane Doesn't Nest Inside the `<button>`:** a synthetic `click` bubbles through the portal by the component tree, so every click in the pane would reach the glyph's toggle.
- **`pressed`:** `ManageRow` passes `pressed={open}` (`ManageRow.tsx:47`), the precedent for a toggle whose pane is open (`PommoraUIX.md:221`).
- **The Dev Guard** (`PickerMenu.tsx:125-134`) logs when the component unmounts while open or exiting and isn't point-anchored. A close takes `exitWait('menu')`, 255ms (`motion.ts:5`, `:19`). Real paths:
  - **A property's settings, Back to the list:** `PropertyFrame` switches views through `FrameSlide`, which holds the leaving detail 310ms (`UIX/Menus/FrameSlide.tsx:42`), so it doesn't trip.
  - **The view-settings pane closing with an InfoPane open:** one outside press dismisses both; both exits are 255ms, and the child's timer registers first, so it doesn't trip, by ordering rather than margin.
  - **A Settings frame switch or the Settings window closing:** the frame swaps instantly and the window exits in 210ms (`Core/Settings/SettingsWindow.tsx:63`), so both trip; they arrive with the first Settings row. `ManageRow` is exposed to the same paths today.

##### One Open Slot (B-3)

- The dismissal stack closes on presses (`dismissalStack.ts:64-79`) and Escape (`:81-91`) only, so a held pane plus a hover-open on another glyph shows two panes; a click on another glyph is an outside press and already closes the held one.
- **UIX's module-level slots:** `OverScroll.tsx:33` (`let held`), `gesture.ts:57` (`let live`), and `dragDisclose.ts:11-13`, with Core's `glanceAction.ts:24` (`let present`). None is a reusable "close the previous one" primitive.
- **The Smallest Mechanism:** `let shown: (() => void) | null = null` in the InfoButton's file and one effect on `open`: an open closes another instance's `shown` and stores its own stable `close`; a close or unmount clears it if it's its own. About six lines, with `close` the same function as the second click and `onDismiss`.
- **Generalizing Into `dismissalStack`:** an entry `group` key whose push dismisses its live peers, threaded through a new `PickerMenu` prop, gives dismissal one owner at the cost of a field, a loop, a prop, and a test for one consumer.

##### The Glyph (A-1, A-2, A-4, A-5, Default Look)

- **`Button`** (`UIX/Buttons/Button.tsx:13-33`, `:74-133`) takes `type`, `outline`, `icon`, `iconSize`, `size`, `pressed`, `ref`, and `aria-label` through its rest props with nothing to undo, and inks from `--button-ink` (`button-base.css.ts:83`), so every type reads in its own color. The Default Look's `filled` sets `fill.secondary` behind `label.primary` (`:184-190`).
- **`AccessoryButton`** (`UIX/Menus/MenuRows.tsx:276-321`) fixes `size="button-inline"` and `paddingX="0"`, stops click propagation (`:315-318`), and carries the row-height overhang, but takes no `type` or `outline`, and its class forces `color: label.tertiary` (`UIX/Menus/menu-row.css.ts:259-268`), which beats `--button-ink`, so a tinted or destructive glyph would read grey.
- **Sizing Beside the Title:** `button-inline` is 20px with a 6px radius (`button-base.css.ts:25-32`) against a 16px row line (`UIX/Theme/typography.css.ts:21`), 15px under `menuCompact` (`menu-row.css.ts:109-116`), so without an overhang the title line grows. `accessoryButton`'s `marginBlock: max(-row-pad-y, (row-line - btn-h) / 2)` scoped to `${rowBox} &` (`menu-row.css.ts:264-266`) is that overhang; hoisted into one class both wear, it's written once and the tertiary ink stays `AccessoryButton`'s.
- **Disabled (A-4):** `rowDisabled` sets opacity and `pointer-events: none` (`menu-row.css.ts:156-160`). `pointer-events` is inherited, so `pointerEvents: 'auto'` on the glyph's own class wins without a specificity fight, and the row's opacity still dims the glyph. The portalled pane is a child of `body` and isn't dimmed. The wrapper's hover handlers still fire, since enter and leave run on the hit target's ancestors whatever their own `pointer-events`. Hovering the glyph puts a non-inert disabled row under `rowShell`'s hover wash (`menu-row.css.ts:38`); inert rows don't show it.
- **Accessible Name (A-5):** `MenuRow.label` is a `ReactNode` (`UIX/Menus/MenuIndex.tsx:31`), so the InfoButton takes the title as a string and composes `` `${title} - Info` `` itself, written once in UIX. How Core passes that title is the citation call's shape (*3-Index, Body & Test · §The Citation Call*).
- **Keyboard:** a native `<button>` turns Enter and Space into `click`; the row's key handler ignores keys from descendants (`UIX/Interactions/activate.ts:7`). `focus="keep"` takes no focus on open, so focus stays on the glyph and Escape reaches the stack. `Button` draws no `:focus-visible` ring anywhere in `button-base.css.ts`, which every button shares.

##### Click Containment (A-3)

- `PickerMenu`'s layer stops `pointerdown` and `contextmenu` only (`PickerMenu.tsx:30-37`, `:328-330`). A `click` from the portal bubbles by the component tree to the row's `onClick` (`MenuRows.tsx:142`), as the glyph's own click does.
- **The InfoButton's Wrapper:** one `onClick={(e) => e.stopPropagation()}` on the wrapper that hosts the hover handlers stops the glyph's click and every click from the pane, since the pane is the wrapper's child in the component tree. `mousedown` and `keydown` from the pane still bubble; the pane takes no keys, and `MenuItem` takes `onMouseDown` only when a caller passes one.
- **`PickerMenu`'s Layer:** `onClick={stopPointerBubble}` beside `:328` makes every pane a click boundary, the higher-level fix, since `ManageRow`'s pane would deliver every inner click to an `onSelect` if its row ever took one. It touches 16 `<PickerMenu` users (`GlancePane`, `MenuPresenter`, `caretPane`, `MassPropertyPicker`, `PropertyPicker`, `TextPane`, `OptionEditPopup`, `ViewTile`, `FilterFrame`, `LocationField`, `ViewItemMenu`, `ManageRow`, `CalendarPicker`, `ColorPicker`, `FieldPicker`, `IconPicker`), none audited for a parent relying on a click bubbling out, and the glyph still needs its own stop.

##### The Pane's Frame (C-4, Pane Width)

- Without `resize`, `PickerMenu` renders no edges (`PickerMenu.tsx:301`) and no `placeResize` (`:146`), which satisfies C-4.
- **Width:** `width: 285px // KNOB` on the InfoButton's own `.css.ts` class, passed as `contentClassName` so it lands on the measured shell (`:283-291`; `paneBox` reads `offsetWidth`, `:166-171`). Precedents: `UIX/Pickers/picker-base.css.ts:10-13`, `UIX/Menus/manage-row.css.ts`, `Core/Properties/Pickers/text-pane.css:3`. The body's max height and padding are Core's.
- **"Below the Glyph":** `direction='down'` (the default) flips up once per open when there's less room below than the pane's height and more above (`:203-211`); `origin='auto'` centers on the glyph when the pane fits and otherwise right-anchors (`:218-238`), as every other pane does.

---

#### Chain of Logic & Reuse

- **Glyph:** `Button` (type, outline, icon, `button-inline`, aria-label), wearing the shared overhang.
- **Hover:** `useHoverReveal` with a per-caller dwell, none on touch, and a returned `reset`; the handlers sit on a wrapper enclosing the glyph and the pane.
- **Pane:** `PickerMenu focus="keep"`, open while `held || reveal.on`, `onDismiss = close`, `triggerRef` on the glyph, `contentClassName` carrying the 285px knob, and no `resize`.
- **State:** one `held` boolean; one `close` serves the second click, `onDismiss`, and the slot.
- **One Slot:** a module-level closer in the same file.
- **Containment:** the wrapper's click stop.
- **Disabled:** `pointerEvents: 'auto'` on the glyph's class.
- **Reused Unchanged:** `dismissalStack`, `PickerMenu`, `Button`, the row's key guard, and `ManageRow`'s sibling shape.

---

#### Approaches

- **A. A Local InfoButton With Three Hook Edits:** `useHoverReveal` gains a per-caller dwell, returns `reset`, and exports `coarse`; the InfoButton (one `.tsx` and one `.css.ts`) holds the held state, the dwell (none on touch), the wrapper's hover and click-stop handlers, the pane, the slot, and the 285px and 500ms knobs. About 60-80 new lines and about 6 changed in `hoverReveal.ts`; nothing else in the kit shifts, and the next pane with the same needs restates containment and the slot.
- **B. As A, With Click Containment in `PickerMenu`:** one line plus an audit of 16 users; it fixes the class rather than the case.
- **C. As A or B, With the Slot in `dismissalStack`:** a field, a loop, a prop, and a test for one consumer; justified once a second group appears.

---

#### Placement Candidates

- **`UIX/Menus/InfoButton.tsx` + `info-button.css.ts`:** beside its precedent, `ManageRow.tsx` + `manage-row.css.ts`; it enters through the row recipe, and its disabled override and overhang read `menu-row.css.ts` classes without a cross-folder import. The prospects put InfoButtons on column headers and dialogs outside menus.
- **`UIX/Buttons/InfoButton.tsx` + `info-button.css.ts`:** the name says button, and `Buttons/` already depends on `Interactions/` (`Button.tsx:5`); it makes "`UIX/Buttons/` — the one button recipe" (`PommoraUIX.md:221`) false, and the overhang would be imported from `Menus/`.
- **`UIX/Pickers/`:** home of `PickerMenu`, but every member chooses a value.
- **The Slot:** inside the InfoButton's file under A and B; only C puts it in `UIX/Interactions/dismissalStack.ts`.
- **The Hook Edits:** `UIX/Interactions/hoverReveal.ts`.

---

#### What Becomes False

- `UIX/Interactions/hoverReveal.ts:28` — "A dwell opens on REVEAL_DWELL_MS and closes on the grace" becomes the caller's dwell. The `HoverReveal` interface (`:20-26`) gains `reset`; "Handlers are identity-stable" stays true.
- `UIX/Menus/menu-row.css.ts:258` — "A row's accessory overhangs into the row's padding, so an eye or × row stands as tall as a plain one" is reworded once the overhang is shared.
- `.claude/Features/InteractionPM.md:38` — "`useHoverReveal` carries the timed cases — a dwell before opening…" gains "per caller," and the InfoButton's touch exception carries its reason there.
- `.claude/Features/PommoraUIX.md:336` (Hover Reveal) stays true; the InfoButton gains its own row.
- `.claude/Features/PommoraUIX.md:221` — "the one button recipe" becomes false under the `Buttons/` placement.
- `.claude/Features/PommoraUIX.md:362` — the Row classes row and `AccessoryButton`'s description change with the shared overhang.
- `.claude/Features/PommoraUIX.md:380` — the `PickerMenu` row gains "stops click" under Approach B.
- **Already false beside the glyph's sizing:** `PommoraUIX.md:237` gives Inline a `4px` radius (code `6px`, `button-base.css.ts:29`); `:238` gives Small `padX 4px` (code `8px`, `:35`); `:409` gives the ladder as `4/6/10/12` (code `6/6/10/12`). The table's "segment" column (18, 20, 24, 28px) matches no `SIZE` field; the divider heights are 12, 14, 16, and 18px (`:30-54`).
- **Tests:** `hoverReveal.test.tsx` keeps its 1,500ms assertions and its touch cases (`:191`, `:269`), and gains cases for a per-caller dwell and for `reset`. `PickerMenu.test.tsx:230` and `dismissalStack.test.tsx:153` are the existing proofs of B-1's close behavior. `GlancePane.test.tsx:585` ("a plain menu still warns") stays true.

---

#### Risks

- **Focus Leaks Into the Pane:** under `keep`, `keepFocus` lets a mousedown through on `[contenteditable="true"]` (`UIX/Interactions/shared.ts:15-19`), and MarkdownPM's read-only body stays `contenteditable="true"` (`Core/MarkdownPM/readOnlySelection.test.tsx:12-16`), so a press in the InfoPane focuses the editor and takes focus from its owner; once focus is inside CodeMirror, an Escape its keymap prevents skips the stack (`dismissalStack.ts:82`). C-3's no-selection rule settles both (*3-Index, Body & Test · §No Selection*).
- **The Parent-and-Child Close Race:** safe by effect ordering while both exits are `'menu'`.
- **The Disabled Row's Hover Wash:** a non-inert disabled row shows the dimmed grey hover while its glyph is hovered.
- **`pointerenter` From Portal Content:** any portal rendered inside the wrapper counts as inside for the hover; harmless for the pane.
- **An Invisible Keyboard Focus:** shared with every `Button`.
