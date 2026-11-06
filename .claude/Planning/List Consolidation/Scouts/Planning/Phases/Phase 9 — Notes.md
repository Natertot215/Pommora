### Phase 9 — Notes

**Branch:** `lc-w2`, on Phase 8's `65b3ae617`. Line references inside the task sections read against `a37d2d7b2`, where the work was first built; *§The Rebase* lists what moved.

**Commits, in order:**

| Commit | Task | Actionable | All-Inclusive | Comments | Tests |
|---|---|---|---|---|---|
| `7c8c20c03` | 1 · Removal That Stands Alone | -11 (+13 / -24) | -41 | -2 | -28 |
| `c38022cbe` | 2 · D-5 | +7 (+42 / -35) | +44 | ±0 | +37 |
| `e3833a5c4` | 3 · E-4 | -4 (+116 / -120) | +62 | ±0 | +66 |
| `26a384c57` | 4 · E-2, E-3, and the scope compare | +11 (+70 / -59) | +24 | ±0 | +13 |
| `33b84adb6` | 5 · The Marker Seat (live answer (b)) | -4 (+20 / -24) | +12 | ±0 | +16 |
| **Whole phase** | | **-1 (+229 / -230)** | +101 | **-2 (+9 / -11)** | +104 |

**Gates at the head:** typecheck, lint, and vitest all green: 9,204 passed, 2 skipped (9,206), 550 files, none red, and `biome check` reports nothing.

**Comment count:** 3,507 at the head, from 3,509 at `65b3ae617`.

---

#### The Rebase

**Clean Picks:** Tasks 1 and 4 applied with no conflict. Task 2 conflicted only in `listReach`'s doc, and Tasks 3 and 5 as below.

**What Moved on the New Shape:**

- **`listReach`'s Doc:** Phase 7 reads "the siblings of its type". D-5's wording went onto that sentence.
- **`editorMenuRequest`:** `menu` sits under `scope: z.enum(['page', 'lists', 'inline'])`, and the tests' `scope: 'cell'` became `'lists'`.
- **`cellStatic.tsx`:** imports `contractions` beside `wordAt`, and the lifted `word` thunk keeps Phase 8's call:

```ts
word: () => {
  const side = caret && sideOf(caret, e.clientX, e.clientY)
  return side
    ? wordAt(EditorState.create({ doc: text, extensions: contractions }), at, side)
    : null
},
```

- **`seatPastMarker`:** the condition that left reads `scan.scope === 'lists'` on the stack, so the arm goes from serving `'lists'` to every scope. `'inline'` holds no markers, and `scan.markers[k]` answers null there.

**The Duplicate Check:** read against Phases 5 to 8.

- **Found and Taken:** `editorMenu(scope)` carried its own scope beside the `surfaceScope` facet. It's now a plain `Extension`, and the handler reads `scan.scope`. `surface.ts:77` reads `editorMenu`, as `linkPointer()` and its neighbors read no scope of their own, and the `MarkdownScope` import leaves `menu.ts`. The whole handler reindents, which conflicts with Task 3's hunks, so this rides Task 4's commit, and that's why Task 4 reads +67 / -57.

```diff
-export const editorMenu = (scope: MarkdownScope): Extension =>
-  Prec.lowest(
+export const editorMenu: Extension = Prec.lowest(
...
-        const page = scope === 'page'
+        const scan = docScan(view.state)
+        const page = scan.scope === 'page'
```

- **Clear:** one word read per surface, through `wordAt`, `state.wordAt` underneath; `restingRows` and `shortRows` hold no list rows, which stay `LIST_ROWS` off `LIST_KINDS`; and `format.ts`' scope-free `editFor` and `listReach` took D-5's change unchanged.

**The Drives:** the readings in *§The Live Answers* were taken on `a37d2d7b2`, and that section closes with the rerun on the rebased tree.

---

#### Task 1 · Removal That Stands Alone

Takes out what nothing reaches, with one visible change: a glyph right-clicked inside a selection acts on its own group rather than the selection (Behavior Row 40).

**Leaves:** rows 2, 3, 6, 10, 12, and 14's capture, and `clickInside`'s `glyph` parameter with `lineStartAt`'s import. Row 16's comment was rewritten in this commit, since it stands alone.

**Per File:**

- **`Menus/menu.ts`:**

```diff
-const clickInside = (doc: string, at: number, from: number, to: number, glyph: boolean): boolean =>
-  (glyph || from < to) &&
-  at >= (glyph ? lineStartAt(doc, from) : from) &&
-  at <= reachEnd(doc, from, to)
+const clickInside = (doc: string, at: number, from: number, to: number): boolean =>
+  from < to && at >= from && at <= reachEnd(doc, from, to)
```

```diff
 function keepSeatedSelection(): void {
-  document.dispatchEvent(new Event('selectionchange'))
   const refuse = (e: Event): void => e.preventDefault()
```

```diff
-        const hit = glyph ? null : view.posAndSideAtCoords(event)
+        const hit = view.posAndSideAtCoords(event, false)
```

- **`Links/pasteLink.ts`:** `if (text && view.dom.isConnected)` becomes `if (text)`, and the comment above goes.
- **`Tables/CellEditor.tsx`:** `posAt` and its `try`/`catch` go; `seatSelection` takes `(p) => view.posAtCoords(p)`.
- **`Tables/cellStatic.tsx`:** `e.stopPropagation()` at `:606` goes. `:678` stands.
- **`Tables/MarkdownTable.tsx`:** `onContextMenuCapture` becomes `onContextMenu`, and its comment goes. Biome's `noStaticElementInteractions` then flags the wrap, which it didn't for a capture prop, so a suppression sits above the element (*§Calls Taken*).
- **`Gestures/pointerPath.ts:48`:** reads "a fallthrough seats a caret on every right-press, which would leave it inside the link once the menu closes."

**Tests:**

- **Left:** `editorMenu.test.tsx:235`, "keeps the page caret and a resting cell's seated word when the table redraws", by row 6.
- **Changed:** `editorMenu.test.tsx:116` is now "acts on the glyph's group, whatever the selection touches": the `drag` case reads `1. a\n2. b\n3. c\n4. d` where it read `- a\n1. b\n2. c\n- d`, and its stale pick `x1. a\n2. b\n3. c\n4. d`. `cellRestingMenu.test.tsx:311`'s second half reads `- a\n- b\n- c\n- d`.
- **Red Run:** both fail on `a37d2d7b2`'s `menu.ts`.

---

#### Task 2 · D-5

A right-click now has one range. The surface seats it and hands it back, rows act on what's seated, and `listReach` decides how far a list pick goes. Closes 3-T14, 3-T15, and 3-T32.

**Leaves:** `[start, end]`, `word` beside `from, to`, `request`'s four arguments, `list ? from : start`, the doc at `menu.ts:49`, and `embedSeatAt`'s and `citationSeatAt`'s `at`.

**Arrives:** nothing of its own: the shape is said four times in one signature, and `BlockSpan` in `Engine/detect.ts` is that shape, so `menu.ts` and `pasteLink.ts`' two inline spellings read it. It reads a little oddly on a selection, and it spares a third name for `{ from, to }`.

**Per File:**

- **`Citations/citationActions.ts`** (first, as *§Phases* orders):

```diff
-export function citationSeatAt(state: EditorState, at = state.selection.main.to): boolean {
+export function citationSeatAt(state: EditorState): boolean {
+  const { to, empty } = state.selection.main
+  const at = empty ? to : to - 1
```

- **`Embeds/embedInsert.ts`:** `embedSeatAt(state)` reads `state.selection.main.from`.
- **`Menus/menu.ts`:**

```diff
+  const point = { from: at, to: at }
+  const inside = !glyph && clickInside(scan.text, at, sel.from, sel.to)
+  const { from, to } = glyph ? point : inside ? sel : surface.seat(word() ?? point)
+  if (!inside && !glyph) keepSeatedSelection()
```

```diff
-            seat: (from, to) => view.dispatch({ selection: EditorSelection.range(from, to) }),
+            seat: ({ from, to }) => {
+              view.dispatch({
+                selection: EditorSelection.range(from, to),
+                userEvent: 'select.pointer',
+              })
+              return view.state.selection.main
+            },
```

```diff
             apply: (action, from, to) => {
-              if (view.dom.isConnected && view.state.doc === opened)
-                applyEditorAction(view, action, { from, to })
+              if (!glyph) applyEditorAction(view, action)
+              else if (view.state.doc === opened) applyEditorAction(view, action, { from, to })
             },
```

- **`Input/format.ts`:**

```diff
+  const ls = scan.lineStarts[anchor]
+  const holdsLine = from < to && from === ls && to >= ls + scan.lines[anchor].length
-  if (from === to) {
+  if (anchor === upTo && !holdsLine) {
```

`from < to` keeps a caret on an empty line on the caret's path, since the range path adds no blank line. `upTo` runs through `reachEnd`, so a selection ending at the next line's start counts as one line.

**Tests:**

- **Changed:** `listRenumber.test.ts:83` selects the whole line, `doc.indexOf('\t2.')` to `b + 1`. It was the only pin the rule moved.
- **Arrived, with Red Runs on the previous route:**
  - "seats as a press does, so a row writes past a marker rather than into it": red. `1. one`, Bold at the number's end, writes `1. ****one`.
  - "follows the seated word through an edit under the menu": red. `xone **two**`.
  - "reads the flags over the seat, so a mark's outer edge checks it": red. `_it_ x` at 0 checks Italic. At 1 it passed on the old route, so the pin sits at 0.
  - "offers no footnote on a word ending an inline code span": red with `at = to`.
  - `format.test.ts`, "takes a selection inside one line as a caret, and narrows one holding the line to its item": red with `if (from === to)` restored.

---

#### Task 3 · E-4

Every read-only surface asks one short menu, and that lets the guards built around "not every surface asks" go.

**Leaves:** `if (view.state.readOnly) return false`, `readOnly()` at `cellStatic.tsx:605`, `if (!ask) return`, the `click` thunk, `format?`, `format: inert ? undefined`, `atClick`, `takeEditorMenu`, `x`, `y`, and the mismatch's `resolve(null)`.

**Arrives:**

- **`menu`:** `z.enum(['live', 'resting', 'short'])` on the request.
- **`selection`:** `z.string().nullable()` in place of `resting: { selection }`. Null means Chromium's selection answers.
- **`edit:selectAll`:** in `SURFACE_EDITS`, renamed from `RESTING_EDITS`, since a read-only page answers from it too.
- **`restingRows(selected, canPaste)`, `shortRows(selected)`:** two row lists sharing `copyRow`, in place of `restingEditItems`. Both callers already branch on the menu, so a switch would select nothing.
- **The bubble stop:** `MarkdownEditor`'s shell stops `contextmenu`.

**Per File:**

- **`Core/Actions/editorMenu.ts`:**

```diff
+const copyRow = (selected: boolean): ActionItem<string> => ({
+  label: 'Copy',
+  action: SURFACE_EDITS.copy,
+  chord: 'cmd+c',
+  disabled: !selected,
+})
+
+export const restingRows = (selected: boolean, canPaste: boolean): ActionItem<string>[] => [
+  { label: 'Cut', action: SURFACE_EDITS.cut, chord: 'cmd+x', disabled: !selected },
+  copyRow(selected),
+  { label: 'Paste', action: SURFACE_EDITS.paste, chord: 'cmd+v', disabled: !canPaste },
+]
+
+export const shortRows = (selected: boolean): ActionItem<string>[] => [
+  copyRow(selected),
+  { label: 'Select All', action: SURFACE_EDITS.selectAll, chord: 'cmd+a' },
+]
```

- **`Desktop/Actions/editorMenu.ts`:**

```diff
-    const editor = takeEditorMenu(win, params)
-    if (!params.isEditable && !editor?.req.resting) return editor?.resolve(null)
-    const items = systemItems(win.webContents, params, editor)
-    const selection = editor?.req.resting?.selection ?? params.selectionText
+    const editor = pending
+    pending = null
+    if (!params.isEditable && !editor) return
+    const selection = editor?.req.selection ?? params.selectionText
+    const items =
+      editor?.req.menu === 'short'
+        ? editorRows(editor, shortRows(selection !== ''))
+        : [
+            ...systemItems(win.webContents, params, editor),
+            ...(editor
+              ? [
+                  { type: 'separator' } as const,
+                  ...editorRows(editor, editorContextItems(editor.req, heldCommands(), selection)),
+                ]
+              : []),
+            ...speechShareItems(selection),
+          ]
```

`systemItems` reads `const resting = editor?.req.menu === 'resting' ? editor : null`.

- **`Menus/menu.ts`:** `applyEditorAction` takes Copy and Select All, and Select All focuses the view, so a press on a read-only cell, which leaves focus outside the editor, still gives ⌘C a real selection:

```diff
+  else if (action === SURFACE_EDITS.copy) void host.clipboard.write(view.state.sliceDoc(from, to))
+  else if (action === SURFACE_EDITS.selectAll) {
+    selectAll(view)
+    view.focus()
+  }
```

```diff
-        if (view.state.readOnly) return false
-        const glyph = glyphAt(event)
+        const { readOnly } = view.state
+        const glyph = readOnly ? null : glyphAt(event)
```

```diff
+              menu: readOnly ? 'short' : 'live',
+              selection: readOnly ? view.state.sliceDoc(from, to) : null,
```

- **`Tables/cellStatic.tsx`:** the thunk's body lifts into `restingMenu`, `restingSelection` returns a `BlockSpan`, `glyph` reads `readOnly() ? null : glyphAt(e)`, and the handler reads `if (!onContextMenu(e)) restingMenu(e)`:

```diff
+        request: (from, to) => ({
+          menu: readOnly() ? 'short' : 'resting',
+          selection: text.slice(from, to),
+          embedSeat: false,
+          citeSeat: false,
+        }),
+        apply: (action, from, to) => {
+          if (action === SURFACE_EDITS.selectAll) applyEditorAction(pageEditorAt(cell).view!, action)
+          else void restingAction(action, from, to)
+        },
```

- **`MarkdownEditor.tsx`:**

```diff
+    // biome-ignore lint/a11y/noStaticElementInteractions: a bubble guard, not a control: a right-click here has asked its menu, and a glance's or an info pane's layer would cancel it
-    <div ref={shellRef} className="mdpm-shell mdpm-fill">
+    <div ref={shellRef} className="mdpm-shell mdpm-fill" onContextMenu={(e) => e.stopPropagation()}>
```

- **`Input/formatState.ts`:** the `Omit` lists `'scope' | 'menu' | 'embedSeat' | 'citeSeat' | 'selection'`.
- **`api.ts`, `Pages/editorHost.tsx`, `Testing/editorHarness.ts`:** `format` goes required, and the harness gains one line.
- **`Actions/pasteAsMenu.ts`:** the rename.

**Tests:**

- **Left:** `Desktop/Actions/editorMenu.test.ts:45-59`'s `atClick` block, "answers null to an ask whose click lands elsewhere", and the stub's `getZoomFactor`, `x`, and `y`.
- **Changed:** "answers null and pops nothing over a field that isn't editable" became "pops nothing over a field that isn't editable when nothing asked", since an ask with `isEditable: false` now pops a menu. `editorMenu.test.tsx`'s "never asks from a read-only editor" and `cellRestingMenu.test.tsx:221` are overturned and rewritten to assert the short menu. `cellStatic.test.tsx:113` stubs `caretPositionFromPoint`, since it now runs the menu for real, a test change beyond *§The Reconciliation List*'s harness line. `req(x, y)` became `req()`, and `resting: { selection }` became `selection`.
- **Arrived, with Red Runs:**
  - "asks the short menu from a read-only editor, with Copy over the seat and Select All": red with the read-only return restored.
  - "reads a glyph on a read-only editor as text": red with `glyphAt` read unconditionally, and with the return restored.
  - "selects and focuses the page from a read-only table's Select All, so ⌘C reads it": red with the return restored, and its focus assertion red without `view.focus()`, 1 failed of 16.
  - "asks the short menu of a read-only cell" and "reads a glyph on a read-only cell as text": red on both.
  - "keeps a right-click from the layers above, whose cancelling would strand the ask": red without the shell's stop.
  - `GlancePane.test.tsx`, "hands focus back after a right press, whose row can ask for focus": red with `if (e.button !== 0) return` back, `document.activeElement` reading `body`, 1 failed of 49.
  - Desktop's "offers Copy and Select All alone, the renderer answering each" and "turns Copy off with nothing selected": written against the new rows, with no earlier form to run against.

---

#### Task 4 · E-2, E-3

The seat stops being the document's selection, so nothing has to give it back.

**Per File:**

- **`Tables/cellStatic.tsx`:**

```diff
-  if (a && b) window.getSelection()?.setBaseAndExtent(a[0], a[1], b[0], b[1])
+  if (!a || !b) return
+  const range = new Range()
+  range.setStart(...a)
+  range.setEnd(...b)
+  CSS.highlights.set('mdpm-seat', new Highlight(range))
```

```diff
-    routeRightClick(
+    void routeRightClick(
...
-    )
+    ).then(() => CSS.highlights.delete('mdpm-seat'))
```

- **`Menus/menu.ts`:** `routeRightClick` returns `pick.then(...)`, as `Promise<void>`, which is the one signal: main resolves on a row and on the popup's close. The page's call is `void`.
- **`markdown-tables.css`:**

```diff
+::highlight(mdpm-seat) {
+  background-color: var(--text-selection);
+}
```

- **`Testing/editorHarness.ts`:**

```diff
+Object.assign(globalThis, { CSS: { ...globalThis.CSS, highlights: new Map() }, Highlight: Array })
+
+export const seatedText = (): string => [...(CSS.highlights.get('mdpm-seat') ?? [])].join('')
```

`new Array(range)` holds its one range, which is all the stub has to do.

Production's only `CSS.highlights` readers are `cellStatic.tsx:444` and `:593`. `CSS.escape` is read at `tabRows.tsx:145` and four Views sites, and `viewHarness.tsx:15` stubs it with `??=`, so the spread keeps whatever stands. A suite importing `editorHarness` before `mountEachTest` runs would see no `escape`; the full suite shows none does.

**Tests:**

- **Changed:** `cellRestingMenu.test.tsx`'s word cases read `seatedText()` where they read `window.getSelection()?.toString()`.
- **Arrived:** "seats its word apart from the document's selection, and clears it on every reply", over a dismissal, Copy, a pick, and an empty paste. Red without the `.then`.

---

#### Task 5 · The Marker Seat

Live answer (b) came back yes, so *§Caution Code*'s condition is met and the arm widened. This commit is the phase's fifth, with the drive's reading as its named cause.

**Per File:**

- **`Engine/intents.ts`, `seatPastMarker`:** the scope test leaves, and the walk starts from the line's start rather than from `pos`:

```diff
-  const line = cached.perLine[lineIndexAt(scan, pos)]
+  const k = lineIndexAt(scan, pos)
+  const line = cached.perLine[k]
...
-  if (scan.scope === 'cell') {
-    let end = pos
-    for (...) ...
-    if (end !== pos) return end
-  }
+  const lead = leadEnd(line, scan.lineStarts[k], true)
+  if (scan.markers[k] && pos < lead) return lead
```

Walking from `pos`, as the cell's arm did, would seat a page press past any atomic it landed before, and a footnote reference is atomic (`intents.ts:353`). Starting at the line's start confines the walk to what leads the line, and `scan.markers[k]` keeps a footnote leading a plain line out of it.

- **`decorations.ts`:** a seat inside a hidden prefix returned before `seatPastMarker` ran, so a nested box seated at its marker's start:

```diff
-    const visible = prefixEndAt(intents, scan, head)
+    const visible = head > anchor ? head : Math.max(head, prefixEndAt(intents, scan, head))
     const seat =
-      (head < visible && head <= anchor
-        ? visible
-        : empty && tr.isUserEvent('select.pointer')
-          ? seatPastMarker(intents, scan, head)
-          : null) ?? head
+      (empty && tr.isUserEvent('select.pointer') ? seatPastMarker(intents, scan, visible) : null) ??
+      visible
```

- **`Engine/intents.ts`, `leadEnd`:** the walk `seatPastMarker` now starts from the line's start is the walk `prefixEndAt` holds, so one private `leadEnd(line, start, atomics)` serves both. `prefixEndAt`'s test moves from `it.from === end` to `end >= it.from && end < it.to`; a throwaway differential over 150,000 documents read 2,244,876 line positions, 869,784 of them holding a prefix, with 0 differences.

**Tests:**

- **Arrived:** `listMarkerSeats.test.tsx`, "a pointer seat left of a replaced marker lands past it, and short of a footnote leading a line": red on the old arm, and red with the `scan.markers[k]` condition dropped. `editorMenu.test.tsx`'s marker pin gained `- one`, writing `- ****one`: red on the old arm.

---

#### The Live Answers

Both drives ran from `wt-click` under the lock, built with `npm run build`, on a throwaway page in `~/Test`, which the harness restored. The clipboard was read first and written back. Scripts and logs are removed. Screenshots stay at `$SP/lc/p9-shots/`, the rerun's under a `rebased-` prefix.

##### (a) Does `::highlight()` Paint in a Resting Cell

**Yes, so fallback (a) wasn't taken.** Read from the screenshots:

- **`02-a1-during-menu.png`:** `apple` drawn on the accent-tinted `--text-selection` fill, with the page's caret still at the tail.
- **`04-a3-native-on.png`:** `pear` in the same color with Use Native Highlighting's class on, so the setting stops mattering.
- **`03-a2-after-dismissal.png`:** nothing painted once the menu closes.
- **`01-g2-glance-cell-seated.png`:** `words` painted in a read-only cell inside a glance, a portal rather than `.cm-content`'s own page.

Its edges are square, since a highlight can't take `border-radius`, which E-3 expected.

##### (b) Does a Press Left of a Glyph Seat at the Line's Start

**Yes, before Task 5.** Readings after D-5 and before the arm widened, Bold picked:

| Line | Press | Seat | Wrote |
|---|---|---|---|
| `- First item here` | 2 px left of the glyph, and at the line's left edge | Line start | `****- First item here` |
| `\t- Nested item here` | Same | Line start | `****\t- Nested item here` |
| `- [ ] Box item here` | 2 px left of the box | Start + 2 | `- ****[ ] Box item here`, inside the marker |
| `- [ ] Box item here` | The line's left edge | Line start | `****- [ ] Box item here` |
| `1. numbered one` | Both | Past the gap | `1. ****numbered one`, which is 3-T15 closing live |

After Task 5, every press on all five shapes, a nested box among them, seats at the content and Bold writes `- ****First item here`, `\t- ****Nested item here`, `- [ ] ****Box item here`, `\t- [ ] ****Nested box here`, and `1. ****numbered one`.

##### What Else the Drives Read

- **E-2:** after a dismissal the seat reads null, `getSelection()` never held the word, the page's selection and focus are untouched, and typing lands at the tail. The same after Copy (`plum` on the clipboard).
- **A Standing Page Selection:** `Alpha` stayed selected through a resting menu, and typing replaced it.
- **A Live Cell:** stayed live and focused through another cell's menu, and typing landed in it (`Cell plLCum fig`).
- **Resting Bold:** `Cell **apple** pear`, seat cleared.
- **Resting Rows:** Cut, Copy, Paste, Paste Without Formatting, Lists, Format, Speech, Share. E-1 unchanged.
- **The Glance:** `Copy`, `Select All` on text, with `words` seated and copied, and the pane staying open. A glyph there reads as text, with Copy off. Its resting cell offers `Copy`, `Select All`, copies `words`, and Select All selects the glance's whole document, leaving the page's selection alone.
- **The Next Click:** a page right-click after the glance popped the full 18 entries, so no ask was left stranded.
- **A Glyph on a Page:** still the type menu, Bulleted to Arrowed.
- **A Left Press Left of a Bullet:** seats at the content, and typing wrote `- XFirst item here`.

##### The Rerun on the Rebased Tree

The grammar, the intents, and the word rule all moved under the rebase, so both answers ran again from `lc-click2` at `5f48aab88`, under the lock, and read the same.

- **(a):** `rebased-01-a1-during-menu.png` shows `apple` painted in `--text-selection`, the seat is gone after dismissal (`rebased-02-a2-after-dismissal.png`), typing lands at the tail, and `pear` paints with the native class on (`rebased-03-a3-native-on.png`).
- **(b):** all five shapes seat at the content and Bold writes `- ****First item here`, `\t- ****Nested item here`, `- [ ] ****Box item here`, `\t- [ ] ****Nested box here`, and `1. ****numbered one`.
- **Phase 8's Word in a Resting Cell:** a press on `don't` seats `don't`, and Bold writes `**don't**`.
- **Also Held:** a glyph's five type rows, one name per type; a left press left of a bullet (`- XFirst item here`); a glance's Copy and Select All on text and in its cell (`[0, 113]` of 113); and 18 entries on the next page right-click.

**Not Driven:** the page reader, a window tab, an unentered tile or embed, and the info pane. The harness records the native menu rather than drawing it, so real popup timing on `pick.then` stands as Scout 5 left it.

---

#### Comment Changes

3,509 to 3,507, by the log's command; view-delta reads +9 / -11.

**Removed (4):**

- `MarkdownTable.tsx:494`, "Captured, because a cell's own menu handler claims the event".
- `pasteLink.ts:128`, "The clipboard read is a round trip through main".
- `CellEditor.tsx`, "posAtCoords can throw before the view has measured".
- `Desktop/Actions/editorMenu.ts:37`, `atClick`'s doc.

**Added (2):** both are lint suppressions, required once the handlers became plain `onContextMenu`:

- `MarkdownTable.tsx`, above the wrap: "a right-click's glance close, not a control".
- `MarkdownEditor.tsx`, above the shell: "a bubble guard, not a control: a right-click here has asked its menu, and a glance's or an info pane's layer would cancel it".

**Rewritten in place (8):**

- `menu.ts:41`, `keepSeatedSelection`'s doc, narrowed to the Menu Seat, with the announced event gone: "so a surface that seated its own range refuses it", since a resting cell's seat is no longer the selection.
- `menu.ts:49`, `routeRightClick`'s doc, for one range.
- `pointerPath.ts:48`, to 5-T40's reason.
- `citationActions.ts:35`, `citationSeatAt`'s doc gains "read at a range's last character".
- `format.ts:312`, `listReach`'s doc gains D-5's rule.
- `GlancePane.tsx:38`, the pane's contract: "…must never eat the next click or pull focus out of its host unless a row asks for it, as Select All does."
- `GlancePane.tsx`, `keepFocus`' comment reads "the pane's focus contract", and its two suppressions "the pane takes no focus of its own by contract", since each restated the absolute.

`gripMenu.ts:139` stands untouched (row 17).

---

#### Differences From the Investigation

- **The Glance Sits Under the Same Layer as the Info Pane:** *§E-4: The Surfaces* lists a glance as "System rows", and V-53 names only the info pane. `GlancePane.tsx:350` and `:411` both mount their tile inside `PickerMenu`, so `:332` cancels there too, and row 9 would have stranded a glance's ask. `InfoButton`'s `Entry` wrap therefore wasn't enough, and the stop went to `MarkdownEditor`'s shell, which covers the info pane, a glance, a pin, and any surface mounted through it, in one line.
- **The Info Pane Has No Caller:** `infoFor` and `InfoButton` are referenced only inside `Core/Info/InfoButton.tsx`, so no surface draws one today. It can't be driven until something mounts it. `Entry` is unchanged.
- **`resting` Became `selection`:** the Investigation kept `resting` holding its `selection`. A read-only page sends one too, and a page isn't resting, so the field flattened to a nullable `selection`, and `RESTING_EDITS` and `restingEditItems` took the names `SURFACE_EDITS` and `surfaceEditItems`.
- **`takeEditorMenu` Left Whole:** with the compare gone it was three lines read once, so `pending`'s take sits in the installer.
- **Row 14 Keeps a Comment Line:** the old comment left, but biome flags a plain `onContextMenu` on the wrap, so a suppression stands there.
- **Select All in a Read-Only Table:** reaches the page through the existing `pageEditorAt(cell).view` rather than a new prop down `MarkdownTable`.
- **The Arm's Shape:** it widened further than `scan.scope` alone, as Task 5 records, and `decorations.ts` changed with it.
- **The Estimate:** +12 came in at -2 on the stack, with E-4 itself at -6 rather than +30.

---

#### Calls Taken

- **A Glyph's `state`:** read at its point, so `current` names the glyph's own type whatever the selection holds.
- **`holdsLine`:** a selection must start at the line's own start, so a backward drag whose head the prefix filter moved past an indent reads as inside the line and takes the group. Simplest reading of "a selection holding a whole line".
- **Short Menu's `selection`:** sent from the renderer rather than read from `params.selectionText`, since Chromium's selection doesn't hold a word on an unfocused view or in a resting cell.
- **Copy on a Read-Only Surface:** writes the source, as a resting cell's Copy does.
- **The Suppression at the Wrap Over Keeping a Capture:** a capture without its reason reads as needless, and the verdict says bubble.
- **Glyph Hit at a Number's Gap:** a press on `1.`'s gap reads as the glyph, so the type menu opens. Unchanged, recorded because the drive's first aim at a number's end landed there.

---

#### Concerns

- **A New Behavior Row:** a left press left of a bullet or box on a page now seats at the content, where it seated at the line's start. That's the same seat a number and a cell already give, and the same path the right-click takes, but it isn't in *§Behavior Changes*. Flag it for the morning report.
- **A Cell's Press Before a Mid-Line Footnote:** anchoring the walk means a cell stops jumping a footnote the old arm jumped by accident. Read from the code; no pin holds the cell's side.
- **`- [^1] x`:** a press in the marker walks across an adjacent footnote and seats past it, as the chain has no marker bound. Rare, and the cell's arm always did.
- **Select All From a Cell:** the view takes focus, so the selection paints and ⌘C copies the whole Markdown source on every read-only route. With a page range held, ⌘C copies the tile's source rather than the page's range. The Copy row still copies the pressed cell's text alone, since the press points at the cell.
- **Select All From a Cell in a Glance:** the same `view.focus()` reaches a glance's tile, which `GlancePane.tsx:38` now states as the one case a row asks for focus. `onPointerDownCapture` records `focusBefore` on any button, so a right press hands focus back on close as a left one does; before that it recorded nothing and `document.activeElement` fell to `body`. This route wasn't driven live.
- **The Stranded Ask Has No Guard Now:** every ask relies on reaching Chromium's `context-menu`. Today `MarkdownEditor`'s shell and `ValueEditor` stop the bubble and nothing else cancels above an editor. A new mount under a cancelling layer would strand an ask, and the next `context-menu` would take it. The first symptom would be a seat that vanishes: `askEditorMenu`'s `pending?.resolve(null)` runs the stale promise's `.then`, which deletes `mdpm-seat` under the next resting menu. A right-click outside an open menu on Windows, which dismisses it and asks again in one gesture, has the same shape and wasn't driven.

---

#### For Phase 11

**For Phase 11's Docs:** `MarkdownPM.md:146` gets one range, the short menu, and the seat as a CSS highlight named `mdpm-seat`. The rewritten List Types Drive reads `CSS.highlights.get('mdpm-seat')` for `shown`, with a screenshot for paint (5-T53, 5-T54), and should press left of each glyph.
