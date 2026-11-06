### Phase 6 — One Set of List Keys, and the Scope's Name — Notes

**Commits:** `246f39199` (The Name) and `e9674162f` (`listKeys`) on `lc-w2`, over Phase 5's `b36d3177b`. **Delivers:** G-9's rename and key merge, and 6-T10's drift.

#### Measured

| Measure | The Name | `listKeys` | Whole Phase |
|---|---|---|---|
| Actionable | 0 (+22 / -22) | -28 (+69 / -97) | **-28 (+91 / -119)** |
| All-Inclusive | +2 (+63 / -61) | -17 (+90 / -107) | -15 (+153 / -168) |
| Comments, by view-delta | 0 (+4 / -4) | -1 (+8 / -9) | -1 (+12 / -13) |
| Tests | +2 (+37 / -35) | +12 (+13 / -1) | +14 (+50 / -36) |
| Documentation | 0 | 0 | 0 |
| Files added or removed | 0 | 0 | 0, with one test file renamed and 29 changed: 15 production, 14 test |
| Production comment count | 3,511 | 3,510 | **3,511 → 3,510** |
| Typecheck | Clean | Clean | Clean |
| Lint | Clean at the head | | Clean |
| Suite | | 9,185 passed, 2 skipped (9,187), 550 files | A clean full run at the head |

#### The Name

**In Plain Terms:** a scope now says what its surface reads. `'cell'` became `'lists'` and `'text'` became `'inline'`. The word `cell` stays wherever it means a table cell, so `cellHidden`, `cellTokens`, and "a cell" in prose are untouched.

**Leaves:** the values `'cell'` and `'text'`, and `autocomplete.ts`'s `!== 'cell'`. **Arrives:** nothing. Now that `inline` means what a one-line field reads, two names that said otherwise follow: `inlineSurface` becomes `sharedSurface`, and `textScope.test.tsx` becomes `inlineScope.test.tsx`.

**Production Sites, Enumerated by the Compiler:**

| File | Sites |
|---|---|
| `Core/MarkdownPM/Engine/detect.ts` | The union, `readsLists`' two arms, and the comment above the union |
| `Core/Actions/editorMenu.ts` | The zod enum at `:26`, and `editorContextItems`' arms at `:166` and `:168` |
| `Core/MarkdownPM/Autocomplete/autocomplete.ts` | 6-T10 |
| `Core/MarkdownPM/Engine/intents.ts` | `seatPastMarker`'s compare at `:588` |
| `Core/MarkdownPM/Engine/subfieldStats.ts` | `tokenHidden('lists')` at `:66` |
| `Core/MarkdownPM/Menus/blockHandles.ts` | `cheapMiss`'s compare and the list-only comment |
| `Core/MarkdownPM/Tables/CellEditor.tsx` | The mount's `scope` |
| `Core/MarkdownPM/Tables/cellStatic.tsx` | `tokenize`, `scanDoc` ×4, and `landEdit` |
| `Core/MarkdownPM/docCache.ts` | `perScopedDoc`'s record, keys and values |
| `Core/Properties/Pickers/ValueEditor.tsx` | The mount's `scope`, which stays `'inline'` for the pane and the field alike until Phase 10 |

No bridge channel changes. The zod enum crosses to `Desktop` and changes in the same commit, which `Desktop/Actions/editorMenu.test.ts` covers.

**Key Hunks:**

```diff
-// A page reads every block; a table cell reads the list vocabulary and nothing else of them, so a `#`, a fence, a quote marker and a rule are literal text there; a Text value reads the inline marks alone, so a list marker is literal text too. Every reader that walks a line takes the scope it is walking for.
-export type MarkdownScope = 'page' | 'cell' | 'text'
+// `page` reads every block; `lists`, a table cell's scope, reads the list vocabulary and nothing else of them, so a `#`, a fence, a quote marker and a rule are literal text there; `inline`, a Text value's scope, reads the inline marks alone, so a list marker is literal text too. Every reader that walks a line takes the scope it is walking for.
+export type MarkdownScope = 'page' | 'lists' | 'inline'
```

```diff
     embed:
-      scan.scope !== 'cell' &&
+      scan.scope === 'page' &&
       o.syntax === 'wiki' &&
```

```diff
--- a/Core/MarkdownPM/Menus/blockHandles.ts
-    // A cell speaks the list vocabulary alone, so a list is the only block there with anything for a grip to move or a menu to offer.
+    // `lists` speaks the list vocabulary alone, so a list is the only block there with anything for a grip to move or a menu to offer.
@@
-          view.state.facet(surfaceScope) === 'cell'
+          view.state.facet(surfaceScope) === 'lists'
```

**Tests Changed, Literals Only:** `Core/Actions/editorMenu.test.ts` ×4, `Autocomplete/acQuery.test.ts` ×1, `Engine/docScan.test.ts` ×2, `Input/edits.test.ts` ×1, `Input/formatState.test.ts` ×1, `Menus/editorMenu.test.tsx` ×1, `Tables/cellLists.test.tsx` ×3, `Tables/cellRestingMenu.test.tsx` ×1, `codeDiff.test.tsx` ×2, `docCache.test.ts` ×1, `inlineScope.test.tsx` ×8 and its `describe`, now "the inline scope", and `Desktop/Actions/editorMenu.test.ts` ×1.

**Test Rewritten:** `autocomplete.test.ts`'s "a table cell draws no embed…" became "only a page draws an embed, so one alone in a cell or a value keeps the title alias", looping over `'lists'` and `'inline'`. **Red Run:** with the compare at `!== 'lists'`, it failed with `expected '![[A/Notes]]' to be '![[A/Notes|Notes]]'`, and passed at `=== 'page'`.

#### `listKeys`

**In Plain Terms:** a page and a table cell each wrote their own list keys around the same transforms. One `listKeys` now sits in `editorBase`, right after `smartDelete`, and claims what a list owns. Every surface then binds what's left, in the ordinary way: a later binding for the same key runs only when no list claimed it.

| Surface | What It States When No List Claims the Key |
|---|---|
| Page | Tab and Shift-Tab hold; Enter runs its own chain at `Prec.high`, which still calls `continueListOnEnter` between its closers and its quotes |
| Table Cell | Tab, Shift-Tab, and Enter navigate; Shift-Enter stays the cell's own |
| One-Line Field | Enter leaves; Tab is unbound, so the focus moves |
| Pane, Today | Enter leaves; Tab and Shift-Tab hold |

**Leaves `CellEditor.tsx`:** `listEdit`, `continueList`, `nestList`, `unnestList`, `listLineAt`, `listClaims`, the bodies of Tab, Shift-Tab, and Enter, the Backspace and Delete bindings, and eleven imports. The file drops from 289 lines to 205.

**Moves to `markdownInput.ts`:** `seatPastMarkerNow`, exported for the cell's mount, and `joinEmptyHead`, private. The page's two list bindings move into `listKeys`.

**Arrives in `markdownInput.ts`:** `listKeys`, `onItemEnter`, `seated`, and `onItem`.

**`Core/MarkdownPM/Input/markdownInput.ts`:**

```diff
+const onItem = (scan: DocScan, at: number): boolean => scan.markers[lineIndexAt(scan, at)] !== null
+
+// From a caret on an item, Tab and Shift-Tab are the list's, holding at either end; over a range or off an item the key is the surface's.
 const nest =
   (transform: (scan: DocScan, selStart: number, selEnd: number) => Edit | null) =>
   (view: EditorView): boolean => {
     const s = view.state.selection.main
-    apply(view, transform(docScan(view.state), s.from, s.to))
+    const scan = docScan(view.state)
+    if (!s.empty || !onItem(scan, s.from)) return false
+    apply(view, transform(scan, s.from, s.to))
     return true
   }
@@ after smartDelete
+// Enter on an item is the list's, a break wherever it can't continue: before the marker, or over a selection.
+const onItemEnter = (view: EditorView): boolean => {
+  const { from, to } = view.state.selection.main
+  const scan = docScan(view.state)
+  if (!onItem(scan, from)) return false
+  return apply(view, continueListOnEnter(scan, from, to)) || insertNewline(view)
+}
+
+// A marker the caret lands INSIDE after an edit reads as a caret that went nowhere, so it takes the seat the marker hands it — the one a pointer press already gets.
+export const seatPastMarkerNow = (view: EditorView): void => {
+  const s = view.state.selection.main
+  if (!s.empty) return
+  const seat = seatPastMarker(docLineIntentsOf(view.state), docScan(view.state), s.head)
+  if (seat !== null && seat !== s.head) view.dispatch({ selection: EditorSelection.cursor(seat) })
+}
+
+const seated =
+  (command: Command): Command =>
+  (view) => {
+    if (!command(view)) return false
+    seatPastMarkerNow(view)
+    return true
+  }
+
+// Nothing sits above a first line, so a Backspace on an empty one takes the break ahead rather than refusing, and the content below comes up to meet the caret.
+const joinEmptyHead = (view: EditorView): boolean => {
+  const s = view.state.selection.main
+  const doc = view.state.doc
+  if (!s.empty || s.from !== 0 || doc.lines < 2 || doc.line(1).length !== 0) return false
+  view.dispatch({ changes: { from: 0, to: 1 }, userEvent: 'delete' })
+  return true
+}
+
+/** What a list claims on every surface, ahead of what each surface binds for a key no list claims. A page's Enter and deletes hold closers, citations, and quotes a list doesn't, so its own chain keeps them. */
+export const listKeys = (scope: MarkdownScope): KeyBinding[] => [
+  { key: 'Tab', run: nest(indentListOnTab) },
+  { key: 'Shift-Tab', run: nest(outdentListOnShiftTab) },
+  ...(scope === 'page'
+    ? []
+    : [
+        { key: 'Enter', run: onItemEnter },
+        { key: 'Backspace', run: seated(joinEmptyHead) },
+        { key: 'Delete', run: seated(deleteCharForward) },
+      ]),
+]
@@ markdownInput's keymap
-      { key: 'Tab', run: nest(indentListOnTab) },
-      { key: 'Shift-Tab', run: nest(outdentListOnShiftTab) },
+      { key: 'Tab', run: () => true },
+      { key: 'Shift-Tab', run: () => true },
```

Imports gain `deleteCharForward`, `insertNewline`, `type MarkdownScope`, and `seatPastMarker`.

**`Core/MarkdownPM/surface.ts`:** imports `listKeys`, and `editorBase` gains the one line, with its doc naming the list keys.

```diff
       { key: 'Enter', run: commitAliasOnEnter },
       { key: 'Backspace', run: smartDelete },
+      ...listKeys(scope),
```

**`Core/MarkdownPM/Tables/CellEditor.tsx`:**

```diff
-/** The item nothing further down the cell belongs to — a nested item below still carries the list on. */
+/** A caret on the cell's last item — a nested item below still carries the list on. */
 const atListEnd = (view: EditorView): boolean => {
   const scan = docScan(view.state)
-  for (let i = lineIndexAt(scan, view.state.selection.main.from) + 1; i < scan.lines.length; i++) {
-    if (scan.markers[i]) return false
-  }
-  return true
+  const s = view.state.selection.main
+  const k = lineIndexAt(scan, s.from)
+  return s.empty && scan.markers[k] !== null && scan.markers.slice(k + 1).every((m) => m === null)
 }
@@ the keymap
+              { key: 'Tab', run: consume(() => onNavigateRef.current('next')) },
+              { key: 'Shift-Tab', run: consume(() => onNavigateRef.current('prev')) },
+              { key: 'Enter', run: consume(() => onNavigateRef.current('down')) },
@@ Shift-Enter
-                  if (listClaims(view) && atListEnd(view)) return onNavigateRef.current('down')
+                  if (atListEnd(view)) return onNavigateRef.current('down')
```

**Test Arrived:** `Tables/cellLists.test.tsx`, "a page holds Tab off an item and over a range, where a cell moves on", with `runScopeHandlers` added to the file's import. It sits in a cell test file because no page-level key test file exists and the cell's navigation is the hold's contrast. The merge turns the page's hold from a side effect of `nest` into two explicit bindings that nothing pinned: with both removed, `Core/MarkdownPM` failed no Tab test. That run's five extra failures were Enter, Backspace, and typing seats in `citationBreakage` and `embedAbsorb`, the two known load-timeout files. **Red Run:** with both bindings removed, it failed with `expected false to be true`.

**Tests Left or Changed Otherwise:** none. `Tables/cellLists.test.tsx`, `Input/edits.test.ts`, `inlineScope.test.tsx`, `Properties/Pickers/ValueEditor.test.tsx`, and `TextPane.test.tsx` hold unchanged.

**`takeMarker`:** takes `k`, which its one caller holds, in place of `ls`, which it reads from the scan.

#### Phase 10's Pane

The pane's existing bindings already are its fallbacks, because `ValueEditor`'s `Prec.highest` keymap follows `editorBase`, and CodeMirror runs bindings of one key in that order. So `listKeys` takes no parameter or hook for it. The flip is the scope and one Enter line:

```diff
-          editorBase({ host, scope: 'inline', panes: [ac], formatExt, oneLine, remembers }),
+          editorBase({ host, scope: oneLine ? 'inline' : 'lists', panes: [ac], formatExt, oneLine, remembers }),
@@
-              { key: 'Enter', run: leave },
+              { key: 'Enter', run: oneLine ? leave : insertNewline },
```

**Trial, Reverted, in jsdom Through `ValueEditor`:** with those two lines, starting from `- a\nplain`:

| Step | Reads |
|---|---|
| Enter at the end of `- a` | `- a\n- \nplain` |
| Tab on the new item | `- a\n\t- \nplain` |
| Shift-Tab | `- a\n- \nplain` |
| Enter on the plain last line | `- a\n- \nplain\n`, a plain break |
| Tab on that line | Held |
| Shift-Enter at the end of `- a` | `- a\n\n- \nplain\n`, a plain break |
| Enter over a selection of the marker | A plain break |

`onClose` never fired. The field's own case is unchanged by construction, since an `'inline'` scan's markers are all null (`docScan.ts:86`), and `ValueEditor.test.tsx`'s "Tab is not the field's" pins it. G-10's Escape binding stays Phase 10's, as 6-T36 states.

Phase 10 should drop the prototype's `markdownInput.ts`, `CellEditor.tsx`, and `autocomplete.ts` hunks and `surface.ts`' `listKeys` lines, all landed here. `oneLine` leaving `editorBase` is still Phase 10's.

#### Comments, Line by Line

Production count 3,511 → 3,510.

| Change | File | Comment |
|---|---|---|
| Reworded | `detect.ts` | "`page` reads every block; `lists`, a table cell's scope…" |
| Reworded | `blockHandles.ts` | "`lists` speaks the list vocabulary alone…" |
| Reworded | `blockHandles.ts` | `cheapMiss`'s: "At `lists` a grip lives inside the text column…" |
| Reworded | `docScan.ts` | `literalLines`' doc: "A scope reading only inline marks and, at `lists`, the list vocabulary…" |
| Reworded | `surface.ts` | `editorBase`'s doc names the list keys |
| Reworded | `CellEditor.tsx` | `atListEnd`'s doc: "A caret on the cell's last item…" |
| Moved | `CellEditor.tsx` → `markdownInput.ts` | "A marker the caret lands INSIDE…", unchanged |
| Moved | `CellEditor.tsx` → `markdownInput.ts` | "Nothing sits above a first line…", "a cell's" became "a" |
| Removed | `CellEditor.tsx` | "The list transforms are pure over the cell's own document…" |
| Removed | `CellEditor.tsx` | "A key the list holds has to be one a transform could act on…" |
| Removed | `CellEditor.tsx` | "In a list Tab is nest and nothing else…" |
| Removed | `CellEditor.tsx` | "The cell is left from a line no list owns…" |
| Added | `markdownInput.ts` | "From a caret on an item, Tab and Shift-Tab are the list's…" |
| Added | `markdownInput.ts` | "Enter on an item is the list's…" |
| Added | `markdownInput.ts` | `listKeys`' doc |
| Reworded | `markdownInput.ts` | `typedInput`'s doc: "Every typed character on every surface: only a page takes the callout shorthand and the citation seed, which write page constructs." |

#### Differences From the Investigation and the Prototype

- **No `scope` Parameters but One:** the prototype threads `scope` through `nest`, `onItem`, `onItemEnter`, `seatPastMarkerNow`, and `seated`. Under B-11 each reads the scan, so only `listKeys` takes it, for its one branch. The Investigation expected this shrink.
- **`insertNewline` Instead of a Literal Edit:** the prototype's `onItemEnter` wrote `{ from, to, insert: '\n', selection: from + 1 }`. CodeMirror's `insertNewline` is the same break, shorter, and the one Phase 10's fallback and the pane's Shift-Enter already run, so a break reads one way on all of them.
- **`listLineAt` and `listClaims` Left `CellEditor`:** the prototype kept both for Shift-Enter. Their last reader was the exit, so `atListEnd` absorbed them.
- **`onItem` Stays Private:** with `atListEnd` holding its own read, nothing outside `markdownInput.ts` needs it. `seatPastMarkerNow` is the only new export beside `listKeys`.
- **`findLastIndex` Isn't Available:** Core's `lib` stops short of ES2023, so `atListEnd` reads `slice(k + 1).every(...)`.

#### Calls Taken

- **`inlineScope.test.tsx`:** the file holds the `inline` scope's pins, so it takes that name here, and *§Constraints · Placements* names the move.
- **`seated` and `onItemEnter` Stay:** the Investigation asked that they earn their place. `seated` replaces two five-line bodies and has two readers. `onItemEnter` is the one statement of what Enter on an item does off a page, and it matches `onEnter`, `onShiftEnter`, and `onForwardDelete` beside it.
- **`joinEmptyHead` Stayed a Command:** folding it into `smartBackspace`'s non-page arm would drop the Backspace binding, but its seat needs line intents an `Edit` can't reach from the scan alone, since `seatPastMarker` also walks past an opening token's hidden range.
- **The Branch Stays `scope === 'page'`:** a mutation shows it's load-bearing for deletes as well as Enter. With the three bindings mounted on a page, `prefixSeat.test.tsx`'s four "Delete at a line end joins the next line by its visible text" tests went red, since `seated(deleteCharForward)` runs ahead of `onForwardDelete`. Why it isn't `=== 'lists'` is the first concern below.
- **The Cell's Shift-Enter Is Untouched:** it still writes `view.dispatch(view.state.replaceSelection('\n'))`. It wasn't in this phase, and the cell's exit stays the cell's.

#### Behavior

**Intended:** 6-T10. A lone `![[Notes` in a Text value now keeps its title alias on a pick, as in a cell.

**Other Differences, Each Checked:**

- **The Pane's Empty First Line [Observed]:** see the first concern below.
- **A Cell's List Keys Scroll:** `nest` and `onItemEnter` run through `apply`, which sets `scrollIntoView`. The cell's `listEdit` didn't. A caret already in view doesn't move, and typing in a cell already scrolls.
- **A Cell's Break Carries `input` [Read]:** the break under Enter before a marker or over a selection had no user event, and `insertNewline` sets `input`. Of that event's readers, `listRenumber` lets it pass as it did, `acQuery`'s `armedBy` answers only to a typed `§`, `typedLine` and `blockQuery` are the page's, and `linkWriting` now arms when the selection being broken reaches into a link, as any typed replacement there does.
- **A Page's Tab Moved From `Prec.high` to `Prec.highest` [Read]:** the only other Tab bindings in `Core/MarkdownPM` are `paneKeys`' and they sit first in the same keymap, so the order is unchanged.

#### Concerns

- **One Contradiction in the Brief:** "nothing should change for a user apart from 6-T10" and "the field mounts the same keys" can't both hold for the pane. *§`listKeys`* reasons about the one-line field, whose `joinEmptyHead` needs two lines, but the pane also sits at `'inline'` until Phase 10 and it has two lines. So from this phase a Backspace on the pane's empty first line takes the break, where it used to refuse. It's observed: a throwaway test on `\n- a` failed at `e978c9c1c`'s keys and passed at `6e92fd3d1`. Phase 10 brings the same behavior anyway, so only the phases between differ. I followed the Investigation and kept `scope === 'page'`, since writing `scope === 'lists'` for a transitional state is a shape designed around what's going to change. If the plan wants the phase strictly silent, that one compare holds it, at the cost of the field no longer mounting all five keys.
- **Rebase Against Phase 7:** my hunks in `detect.ts` sit at `:508-516`, and in `Core/Actions/editorMenu.ts` at `:26`, `:166`, and `:168`, literal substitutions only.
- **Not Run Live:** everything here rests on jsdom and the suite. I took no live run. The cell's keys, the page's Tab hold, and the pane's trial wait on the closing drives.

#### For the Executor

- Nothing by hand. The two commits replay in order, after Phases 1 to 5.
- *8-T31*'s five reds and `Input/listRenumber.test.ts:252` are outside this phase.

#### Facts for Phase 11

- `.claude/Features/MarkdownPM.md` and `PropertiesPM.md`, wherever they name the scopes, take `lists` and `inline`.
- 6-T10 swapped one compare for another, so `.claude/IssuesPM.md`'s I-036 count shouldn't move on its account. `seatPastMarkerNow` and `joinEmptyHead` now live in `Input/markdownInput.ts`.
- Each surface's keys now read as *§`listKeys`*'s table states: a list's answer first, then the surface's own.
