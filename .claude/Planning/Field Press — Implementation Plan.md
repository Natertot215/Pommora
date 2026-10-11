## Field Press — Implementation Plan

**DATE:** 10-10-2026
**STATUS:** Draft
**SOURCE:** The 10-10-2026 session with Nathan on the Properties panel's Text values, which traced a lost drag-selection to two app-wide causes. Settled with Nathan: the fix covers every single-line text field; selecting resting (non-editing) text stays out of scope; every live check runs headless.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `HASH` | {count} | | |

### Context

**How a field's drag-selection breaks today.** Pommora's single-line text fields are native `<input>`s. Only two sites render them: `UIX/Fields/EditableInput.tsx:49` (every inline value, rename, and settings field, `type` text or password) and `UIX/Fields/SearchField.tsx:23`. Two separate failures show up when a drag-selection that starts inside one strays out of it:

- **The vertical snap:** once the pointer leaves the field's box above or below, Chromium resolves the selection's moving end against whatever sits under the pointer and clamps it to the field's start (above) or end (below). The field is 16–18px tall inside 28–29px rows, so a few pixels of wobble collapse a selection to its anchor. This was reproduced live in the dropdown panel, the window's side pane, a Table cell, and a Card, and with a bare injected input, so the cause is the engine, not any one surface.
- **The split click:** a press in the field released over anything else fires `click` on the two targets' closest shared ancestor, with `e.target === e.currentTarget`. Handlers that treat that as a click on their own background act mid-edit:
  - Cards open the page (`Core/Views/Cards/CardsView.tsx:967-971`) or the Add Property picker (`:696-697`, `:835-839`), which closes the editor.
  - A table title cell opens its page and a URL value opens its link (`Core/Views/Table/TableView.tsx:160-176`).
  - The panel's value seat re-runs its value intent (`Core/Properties/PropertyPanel.tsx:406`).
  - The property-frame and sidebar rows navigate mid-rename (`PropertyFrame.tsx:111-121`, `sidebarRows.tsx:61`, `Disclosure.tsx:167,179`).
  - A group band toggles (`GroupBand.tsx:188-190`).
  - `EditableInput`'s own `onClick` stop (`EditableInput.tsx:73`) never sees this click, because the click never starts at the input.

**What already exists.**
- `UIX/Theme/nativeCaret.ts` paints a drawn caret and selection pills over every native field from document-level listeners, started by `initNativeCaret()` in `Core/Interface/mount.tsx:26`. It reads the selection at rAF time and never writes it.
- `UIX/Interactions/shared.ts:17` holds `suppressNextClick`, which swallows the click dispatched in the same task as a release.
- `clamp` lives in `UIX/Utilities/clamp.ts`.
- The plan leaves alone: CodeMirror surfaces (MarkdownPM, TextPane), which own their own selection and already refuse a click over a non-empty selection; the app-wide `user-select: none` on resting text (`Core/Interface/styles.css:30-38`); and every per-surface click guard, each of which guards something other than a split press.

### Overview

One rule for every single-line text field: **a press that starts in a text field belongs to it until the button is released.** A new module, `UIX/Interactions/fieldPress.ts`, holds the rule from document-level listeners, started once at mount beside the drawn caret.

- **Dragging outside the field:** while the button is held, a drag that strays above or below the field keeps selecting along it, following the pointer's horizontal position. At most the first frame after leaving can show the engine's snap. The field still scrolls its text when the pointer nears its ends, as it does today.
- **Releasing elsewhere:** that release produces no click, so no card, cell, row, or band behind the field reacts to the end of a selection.

These keep the engine's own behavior, unchanged from today:
- Double-click and triple-click drags (word and line stepping).
- Shift-extended presses.
- A press on the text a focused field already has selected, which may become a text drag.

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `fieldPress.ts` • File | The press-ownership rule for native text fields: the off-band drag follow and the split-release click guard. | `UIX/Interactions/fieldPress.ts` |
| `initFieldPress` • Function | Starts the module's document-level listeners; mount calls it once. | `UIX/Interactions/fieldPress.ts` |
| `fieldPress.test.ts` • File | Pins the follow and the guard in jsdom against a stubbed hit test. | `UIX/Interactions/fieldPress.test.ts` |

#### Constraints

- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint` from the repo root; lint reports zero errors, warnings, infos, and unformatted files.
- **Frozen:** `nativeCaret.ts` behavior, `suppressNextClick`'s signature, `EditableInput`, `SearchField`, and every surface's click handlers.
- **Conventions:**
  - Finite rules stay one module.
  - Comments only where the code can't say it.
  - Mouse events, not pointer events: `pointerdown.detail` is always 0, and touch never fires `mousemove`, which keeps the mobile build out without a filter.
  - The field's rect is read once per press; the per-move work outside the band is one hit test, the same cost as the engine's own.
- **Shape (fix):** the sibling sweep is done. The ten surfaces above are fixed by the guard with no edits of their own, and no existing ad-hoc guard becomes removable.
- **Live drives:** run against a scratch instance on port 9334 opened on `~/Test`, set up and torn down as the Review Checkpoint states. Nathan's own instance on 9333 is never driven.

#### Process Overview

- [ ] **Phase 1** — The Field Press Module
  - [ ] Task 1-1
  - [ ] Task 1-2
  - [ ] Review Checkpoint
- [ ] **Phase 2** — Reconciliation
  - [ ] Task 2-1

---

### Phase 1 — The Field Press Module

**GOAL:** Land `fieldPress.ts` with its tests, start it at mount, and prove both halves live on every surface that holds a field. It's one phase because the module, its wiring, and the one comment it makes false are a single change.

#### Task 1-1

**TASK:** Write `fieldPress.ts` and its jsdom test.

**NOW:** No module tracks a press in a native field. The engine snaps an off-band drag, and a split release clicks the shared ancestor.

**CHANGE**

- [ ] Write `fieldPress.test.ts` and watch it fail against a missing module.
- [ ] Write `fieldPress.ts`.

**AFTER**

```UIX/Interactions/fieldPress.ts diff
+import { clamp } from '../Utilities/clamp'
+import { suppressNextClick } from './shared'
+
+/** A press that starts in a text field belongs to it until release: a drag that strays above or below keeps selecting along the field, and a release elsewhere is no click. */
+
+type Press = {
+  field: HTMLInputElement
+  box: { top: number; bottom: number; left: number; right: number }
+  focused: boolean
+  follows: boolean
+  anchor: number | null
+  x: number | null
+}
+
+let press: Press | null = null
+
+const isTextField = (el: EventTarget | null): el is HTMLInputElement =>
+  el instanceof HTMLInputElement && el.selectionStart !== null
+
+// The engine re-resolves an off-band pointer against whatever sits under it and snaps to an end, so the moving end is re-seated at the pointer's x along the field's text.
+function follow(): void {
+  if (press?.x == null || press.anchor === null) return
+  const { field, box, anchor } = press
+  const at = document.caretPositionFromPoint(
+    clamp(press.x, box.left + 1, box.right - 1),
+    (box.top + box.bottom) / 2,
+  )
+  if (at?.offsetNode !== field) return
+  const from = Math.min(anchor, at.offset)
+  const to = Math.max(anchor, at.offset)
+  if (field.selectionStart === from && field.selectionEnd === to) return
+  field.setSelectionRange(from, to, at.offset < anchor ? 'backward' : 'forward')
+}
+
+function stopFollowing(): void {
+  if (!press) return
+  press.follows = false
+  press.x = null
+}
+
+export function initFieldPress(): void {
+  document.addEventListener(
+    'mousedown',
+    (e) => {
+      const field = e.target
+      if (e.button !== 0 || !isTextField(field)) {
+        press = null
+        return
+      }
+      const rect = field.getBoundingClientRect()
+      const pad = getComputedStyle(field)
+      press = {
+        field,
+        // The text's own box: a hit in the padding resolves to an end, as the snap does.
+        box: {
+          top: rect.top,
+          bottom: rect.bottom,
+          left: rect.left + Number.parseFloat(pad.paddingLeft),
+          right: rect.right - Number.parseFloat(pad.paddingRight),
+        },
+        focused: document.activeElement === field,
+        follows: e.detail === 1 && !e.shiftKey,
+        anchor: null,
+        x: null,
+      }
+    },
+    true,
+  )
+  document.addEventListener(
+    'mousemove',
+    (e) => {
+      if (!press?.follows) return
+      const { field, box } = press
+      if (press.anchor === null) {
+        // A press on a selection the field already held may become a text drag, which is the engine's.
+        if (press.focused && field.selectionStart !== field.selectionEnd) return stopFollowing()
+        press.anchor = field.selectionStart
+      }
+      press.x = e.clientY < box.top || e.clientY > box.bottom ? e.clientX : null
+      follow()
+    },
+    true,
+  )
+  document.addEventListener('select', follow, true)
+  document.addEventListener('selectionchange', follow)
+  document.addEventListener(
+    'mouseup',
+    (e) => {
+      if (press && e.target !== press.field) suppressNextClick()
+      press = null
+    },
+    true,
+  )
+  document.addEventListener('keydown', stopFollowing, true)
+  window.addEventListener('blur', stopFollowing)
+}
```

Why the moving parts are the way they are:
- **The anchor is read on the first move:** `mousedown` runs before the engine places the caret.
- **x clamps to the text's box, not the field's:** the panel's and Cards' value seats pad their field (`.value-seat input`, `UIX/Table/table.css`), and a hit in that padding resolves straight to an end. Clamping inside it lets the end creep with the field's autoscroll on every surface, as the Table's unpadded field does.
- **Three triggers re-seat:**
  - **A move:** re-seats when the engine's snap didn't change and so fired no selection event.
  - **`select`:** dispatched within the frame, before the drawn caret's rAF reads, so the snap the engine writes during a move never paints. Without it, about 19 of 22 painted frames showed the snap in the adversarial review's Electron harness.
  - **`selectionchange`:** catches the engine's autoscroll ticks between moves.
- **The equality check stops the loop:** each write fires one more selection event.
- **The direction is written explicitly:** it keeps the anchor fixed as the selection's base, so the drawn caret's bar sits at the pointer's end, and a drag that comes back in-band extends from the anchor. The Review Checkpoint proves the second.
- **A press on a selection the focused field already held isn't followed:** the engine leaves that selection uncollapsed because the press may become a text drag, so its start isn't the press point. Rename fields select all on focus (`EditableInput.tsx:69`), so this is their first press. A press that focuses the field follows from wherever the engine's own drag extends.
- **A keystroke or a window blur stops following but keeps the press:** typing while the button is held, or a Cmd-Tab mid-drag, would otherwise let the next `selectionchange` re-select over the edited text. The release guard still needs the press.
- **A buttonless move is just a move:** a trackpad reports its release as a buttonless move ahead of the `mouseup` (`gesture.ts:137-141`), and the `mouseup` that follows ends the press and arms the guard.
- **Nothing else ends a press:** a stale press is harmless. With `x` null, `follow` does nothing, and every later `mouseup` follows a `mousedown` that replaces the press. A native text drag starts in-band, so it never sets `x`.
- **Why not `suppressReleaseClick` with a predicate:** the module already needs its own `mouseup` listener to end the press, and that listener holds the field. A predicate version would add pointer listeners to every field press without removing this one.

```UIX/Interactions/fieldPress.test.ts diff
+// @vitest-environment jsdom
+import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
+import { initFieldPress } from './fieldPress'
+
+const mouse = (target: EventTarget, type: string, init: MouseEventInit = {}): MouseEvent => {
+  const e = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...init })
+  target.dispatchEvent(e)
+  return e
+}
+
+let row: HTMLDivElement
+let input: HTMLInputElement
+let label: HTMLSpanElement
+const hit = vi.fn((x: number, _y: number) => ({ offsetNode: input, offset: Math.round(x / 10) }))
+const range = (): unknown[] => [input.selectionStart, input.selectionEnd, input.selectionDirection]
+const below = (clientX: number, buttons = 1): MouseEvent =>
+  mouse(label, 'mousemove', { clientX, clientY: 60, buttons })
+const snap = (type: 'select' | 'selectionchange'): void => {
+  input.setSelectionRange(3, 10)
+  ;(type === 'select' ? input : document).dispatchEvent(new Event(type, { bubbles: true }))
+}
+
+beforeAll(() => {
+  Object.assign(document, { caretPositionFromPoint: hit })
+  initFieldPress()
+})
+
+beforeEach(() => {
+  row = document.createElement('div')
+  input = document.createElement('input')
+  label = document.createElement('span')
+  input.value = 'abcdefghij'
+  input.style.padding = '0px 6px'
+  input.getBoundingClientRect = () => new DOMRect(0, 0, 100, 20)
+  row.append(input, label)
+  document.body.append(row)
+  hit.mockClear()
+})
+
+// A blur stops a lingering follow without arming the click guard, so nothing carries into the next test.
+afterEach(() => {
+  window.dispatchEvent(new Event('blur'))
+  row.remove()
+})
+
+// Stands in for the engine placing the caret at the press.
+const press = (at: number, init: MouseEventInit = {}): void => {
+  mouse(input, 'mousedown', { detail: 1, ...init })
+  input.setSelectionRange(at, at)
+}
+
+describe('a drag that strays off the field', () => {
+  it('keeps selecting along the field at the pointer x', () => {
+    press(3)
+    below(70)
+    expect(hit).toHaveBeenCalledWith(70, 10)
+    expect(range()).toEqual([3, 7, 'forward'])
+  })
+
+  it.each(['select', 'selectionchange'] as const)('re-seats the end the engine snaps, on %s', (type) => {
+    press(3)
+    below(70)
+    snap(type)
+    expect(range()).toEqual([3, 7, 'forward'])
+  })
+
+  it('selects backward from the anchor and clamps x into the field\'s text', () => {
+    press(3)
+    mouse(label, 'mousemove', { clientX: -50, clientY: -30, buttons: 1 })
+    expect(hit).toHaveBeenCalledWith(7, 10)
+    expect(range()).toEqual([1, 3, 'backward'])
+  })
+
+  it('leaves an in-band drag to the engine', () => {
+    press(3)
+    mouse(label, 'mousemove', { clientX: 70, clientY: 10, buttons: 1 })
+    expect(hit).not.toHaveBeenCalled()
+  })
+
+  it.each([
+    ['a word drag', { detail: 2 }],
+    ['a shift-extended press', { shiftKey: true }],
+  ])('leaves %s to the engine', (_, init) => {
+    press(3, init)
+    below(70)
+    expect(hit).not.toHaveBeenCalled()
+  })
+
+  it('leaves a press on the focused field\'s own selection to the engine', () => {
+    input.focus()
+    input.setSelectionRange(0, 10)
+    mouse(input, 'mousedown', { detail: 1 })
+    below(70)
+    expect(hit).not.toHaveBeenCalled()
+    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 10])
+  })
+
+  it.each([
+    ['release', () => mouse(input, 'mouseup')],
+    ['a keystroke', () => input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }))],
+    ['a window blur', () => window.dispatchEvent(new Event('blur'))],
+  ])('stops following at %s', (_, end) => {
+    press(3)
+    below(70)
+    end()
+    snap('selectionchange')
+    expect(input.selectionEnd).toBe(10)
+  })
+})
+
+describe('a release', () => {
+  const clickRow = (): MouseEvent => mouse(row, 'click')
+
+  it('outside the pressed field is no click', () => {
+    const clicked = vi.fn()
+    row.addEventListener('click', clicked)
+    press(3)
+    mouse(label, 'mouseup')
+    expect(clickRow().defaultPrevented).toBe(true)
+    expect(clicked).not.toHaveBeenCalled()
+  })
+
+  it('reported first as a buttonless move, as a trackpad does, keeps following and is no click', () => {
+    press(3)
+    below(70)
+    below(80, 0)
+    expect(range()).toEqual([3, 8, 'forward'])
+    mouse(label, 'mouseup')
+    expect(clickRow().defaultPrevented).toBe(true)
+  })
+
+  it('on the pressed field clicks', () => {
+    const clicked = vi.fn()
+    input.addEventListener('click', clicked)
+    press(3)
+    mouse(input, 'mouseup')
+    mouse(input, 'click')
+    expect(clicked).toHaveBeenCalledOnce()
+  })
+
+  it('of a press outside any field clicks', () => {
+    const clicked = vi.fn()
+    row.addEventListener('click', clicked)
+    mouse(label, 'mousedown')
+    mouse(label, 'mouseup')
+    clickRow()
+    expect(clicked).toHaveBeenCalledOnce()
+  })
+})
```

**VERIFY**

- [ ] `npx vitest run UIX/Interactions/fieldPress.test.ts` fails before `fieldPress.ts` exists and passes after.
- [ ] Each mutation turns its named test red, and each is restored after:
  - Remove the `select` listener: "re-seats the end the engine snaps, on select".
  - Remove the `selectionchange` listener: "…on selectionchange".
  - Remove `suppressNextClick()`: "outside the pressed field is no click".
  - Drop `!e.shiftKey`: "leaves a shift-extended press to the engine".
  - Remove the existing-selection check: "leaves a press on the focused field's own selection to the engine".
  - Remove the `keydown` listener: "stops following at a keystroke".
  - Remove the `blur` listener: "stops following at a window blur".
  - Clamp to the rect instead of the text's box: "selects backward from the anchor and clamps x into the field's text".
- [ ] **Is `selectionchange` needed?** After the Review Checkpoint's frame-cadence and autoscroll drives pass, rerun both with the `selectionchange` listener removed.
  - Still zero snapped frames after the first, and the end still follows the autoscroll: drop the listener, its `it.each` case, and the "catches the engine's autoscroll ticks" rationale line.
  - Otherwise keep all three.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-2

**TASK:** Start the module at mount, assert it in the mount test, and correct the caret comment the module makes false.

**NOW:** `mountApp` starts only the drawn caret. `nativeCaret.ts:123` says every macOS mouse selection reports direction `'none'`, but a followed off-band drag now reports `'forward'` or `'backward'`.

**CHANGE**

- [ ] Add the mock and assertion to `mount.test.tsx` and watch it fail.
- [ ] Wire `initFieldPress()` in `mount.tsx`.
- [ ] Correct the `nativeCaret.ts` comment.

**AFTER**

```Core/Interface/mount.tsx diff
 import { initNativeCaret } from '@pommora/uix/Theme/nativeCaret'
+import { initFieldPress } from '@pommora/uix/Interactions/fieldPress'
 import { setMenuDoor } from '@pommora/uix/Pickers/PickerControl'
@@ mountApp @@
   // One global drawn caret for every native text field (CodeMirror surfaces have their own).
   initNativeCaret()
+  initFieldPress()
 }
```

```Core/Interface/mount.test.tsx diff
 import { initNativeCaret } from '@pommora/uix/Theme/nativeCaret'
+import { initFieldPress } from '@pommora/uix/Interactions/fieldPress'
 import { setMenuDoor } from '@pommora/uix/Pickers/PickerControl'
@@
 vi.mock('@pommora/uix/Theme/nativeCaret', () => ({ initNativeCaret: vi.fn() }))
+vi.mock('@pommora/uix/Interactions/fieldPress', () => ({ initFieldPress: vi.fn() }))
 vi.mock('@pommora/uix/Pickers/PickerControl', () => ({ setMenuDoor: vi.fn() }))
@@ mountApp @@
~  it('wires the menu door, the drawn caret, and the field press, then renders the app', async () => {
     const root = document.createElement('div')
     mountApp(root)
     expect(setMenuDoor).toHaveBeenCalledWith(popMenu)
     expect(initNativeCaret).toHaveBeenCalledOnce()
+    expect(initFieldPress).toHaveBeenCalledOnce()
```

```UIX/Theme/nativeCaret.ts diff
@@ caretHead @@
~// The bar sits at the selection's moving end. A native mouse selection on macOS reports 'none', so there the head is whichever end left the last painted anchor.
```

**VERIFY**

- [ ] `npx vitest run Core/Interface/mount.test.tsx` fails before the wiring and passes after.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

Headless, on a scratch instance. Set it up first:
- **Backup:** if `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/34488cfe-a943-4f93-985c-2792baa98a7b/scratchpad/Test-backup` doesn't exist, `cp -Rp ~/Test` there before any write.
- **Launch:** write `{"lastNexusPath":"<$HOME>/Test"}` to `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/34488cfe-a943-4f93-985c-2792baa98a7b/scratchpad/ud/pommora.json`, then from `Desktop/` run `POMMORA_USERDATA=/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/34488cfe-a943-4f93-985c-2792baa98a7b/scratchpad/ud POMMORA_DEBUG_PORT=9334 ELECTRON_RENDERER_URL=http://localhost:5173 env -u ELECTRON_RUN_AS_NODE ../node_modules/.bin/electron .` (Development-Environment §Second Instances; the dev server on 5173 must be running).
- **Seed:** through `window.nexus.ask`, add a Text property `Notes` to `Collection A` (`schema:add`), and `setProperty` a 46-character value on `Collection A/Set Alpha/Page A.md`. Add a Table view showing Notes, and Notes to the Cards view, if they aren't there.
- **Helpers:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/34488cfe-a943-4f93-985c-2792baa98a7b/scratchpad/drive.mjs` exports `at`, `ev`, `shot`, `key`, and `c`. `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/34488cfe-a943-4f93-985c-2792baa98a7b/scratchpad/review/el/` has the frame-cadence sender and rAF sampler for the painted-snap drive.

Drive each with `Input.dispatchMouseEvent`: a `mousePressed` inside an editing field, `mouseMoved` with `buttons: 1`, then `mouseReleased`. Read `selectionStart`/`selectionEnd`, `document.activeElement`, and whether the editor is still mounted. Call `Page.bringToFront` first. Afterward, stop the instance by exact PID and `rsync -a --delete /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/34488cfe-a943-4f93-985c-2792baa98a7b/scratchpad/Test-backup/ ~/Test/`.

- [ ] **Dropdown panel:** press at the value's end, drag left to its middle, then 6px below the field, then out of the dropdown downward. The selection keeps tracking x and never collapses to `46,46`. Release outside: the dropdown stays open, the field keeps focus, and the selection persists.
- [ ] **Window side pane:** the same drag, plus right past the end and then up out of the window. The selection tracks x and holds after release.
- [ ] **Table view:** the same drag within the cell and down onto the next row. The selection holds. Then rename a title cell, and release a drag in that cell's padding: the page doesn't open.
- [ ] **Cards:** release a drag over the card thumbnail, the card title, and another property's label. No page opens, no picker opens, and the editor stays mounted with its selection.
- [ ] **A search field** (the sidebar's nav search): the off-band drag tracks the same way.
- [ ] **A double-click drag** leaving the field still steps by word, unchanged from today.
- [ ] **Back into the field:** press mid-value, drag up and left of the anchor off-band, then back in-band right of the anchor. The selection runs from the anchor to the pointer.
- [ ] **No painted snap:** send `mouseMoved` events back-to-back at frame cadence (16ms) below the field, while a rAF loop in the page samples `selectionStart`/`selectionEnd`. No frame after the first off-band frame reads the snapped range.
- [ ] **Autoscroll:** in the window side pane, hold the pointer below the field and past its right edge: the field's `scrollLeft` advances and the selection's end follows it.
- [ ] **Drawn selection:** a screenshot mid-drag, below the field, shows the selection pills on the followed range.

---

### Phase 2 — Reconciliation

**GOAL:** Leave the feature docs describing the new rule. Doc-only work after a proven phase, so no checkpoint follows it.

#### Task 2-1

**TASK:** Add the field press to the three feature docs that describe the interaction layer and the mount.

**NOW:** No doc mentions press ownership. The mount's description lists only the global styles, the drawn caret, and the menu door.

**CHANGE**

- [ ] Add the Interactions row in `PommoraUIX.md`.
- [ ] Extend The Caret in `InteractionPM.md`.
- [ ] Extend the mount sentence in `InterfacePM.md`.

**AFTER**

```.claude/Features/PommoraUIX.md diff
@@ ### Interactions @@
 | Gesture      | `usePointerGesture` · `beginPointerGesture` · `gestureLive` | Press, threshold, move, release.                   |
+| Field press  | `initFieldPress`                                        | A press that starts in a native text field belongs to it until release: a drag that strays above or below keeps selecting along the field, and a release elsewhere is no click. |
 | Autoscroll   | `scrollGlide` · `AUTOSCROLL`                            | Edge-proximity scrolling and the glide to a destination. |
```

```.claude/Features/InteractionPM.md diff
@@ #### II. The Caret @@
~One text-insertion identity for the whole app: … on a fresh focus the overlay settles by re-measuring each frame until the bar holds still. A press that starts in a native text field belongs to it until release: a drag-selection that strays above or below the field keeps following the pointer along it rather than snapping to an end, and a release elsewhere reaches nothing as a click (`UIX/Interactions/fieldPress.ts`).
```

```.claude/Features/InterfacePM.md diff
~… and `mount.tsx` mounts it with the app's global styles, the drawn caret, the field press, and the menu door …
```

**VERIFY**

- [ ] `node .claude/scripts/check-atlas.mjs` reports every table agreeing.
- [ ] Read each edited paragraph whole: it reads true and doesn't contradict itself.

---

### Completion Criteria

- **Conformance:** One module holds the rule. No surface's click handler, `EditableInput`, `SearchField`, or `nativeCaret.ts` behavior changed; nothing changed outside the plan's named files.
- **Correctness:** Every Review Checkpoint drive passes on the built-in surfaces, read from the live selection rather than inferred.
- **Completeness:** Both tasks of Phase 1 and Task 2-1 landed; no scaffolding or debug output remains.
- **Confirmation:** Each new test went red without its change, and each Review Checkpoint result was read live.
- **Continuity:** Reconciliation walked; the three feature docs and the caret comment read true.
- **Confidence:** Gates green over `{baseline}..HEAD`, and the counted diff is about +100: ≈95 module, 2 wiring, 1 comment changed, and 3 doc lines. Tests are excluded from the count.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

- [ ] Phase review (opus-high): Phase 1 · Phase 2
- [ ] Simplification lens → adversarial lens (opus-high) over `{baseline}..HEAD`
- [ ] Neutral verification (opus-high) over `{baseline}..HEAD`
- [ ] Own pass: gates · diff · deviations · criteria
- [ ] Reconciliation walked
- [ ] Report delivered

#### Reconciliation

- `UIX/Theme/nativeCaret.ts:123` — "A mouse selection on macOS reports 'none'" — Task 1-2
- `Core/Interface/mount.test.tsx:12` — "wires the menu door and the drawn caret" — Task 1-2
- `.claude/Features/PommoraUIX.md` §Interactions — no row for the field press — Task 2-1
- `.claude/Features/InteractionPM.md` §II. The Caret — field selection behavior undescribed — Task 2-1
- `.claude/Features/InterfacePM.md:4` — "the drawn caret, and the menu door" — Task 2-1

#### Open Items

- **A field in a scrolling pane, dragged out of the pane:** the engine scrolls the pane itself, carrying the field off-screen, where no hit test can reach it, so the selection falls back to the engine's snap. This is native, and it's reached only by leaving the pane. The only fix would be measuring text width in place of the hit test.
- **A double-click drag released outside the field** may fire `dblclick` on the shared ancestor, which `suppressNextClick` doesn't swallow. The one reachable handler is `GroupBand.tsx:191-196`, which opens the Set.
- **Windows:** `contextmenu` dispatches at release there, so a right-drag out of a field could open the menu of the surface it lands on.

#### Deviations
