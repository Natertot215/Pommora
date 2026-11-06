### Phase 4 — Notes

**Commit:** `1ea13c25e` on `lc-w2`, on Phase 3's `018cb5f4f`.
**Patch:** *Phase 4 — Paste.patch* (`git diff 018cb5f4f 1ea13c25e`).
**Delivers:** F-2.

#### Task: Paste

**In Plain Terms:** a paste now reaches the renumber filter. It reshapes a list when it brings a newline, or takes away a newline, or makes a line become or stop being numbered, and then both ends of the change recount, so a pasted list joins the run it lands in and a list below a pasted intro counts from its first item. Words pasted inside an item recount nothing. The recount rides the paste's transaction, so one undo takes both.

**What Leaves:** nothing.

**What Arrives:** *9-T27*'s four edits, all in `Input/listRenumber.ts`. *Paste Recount.patch* was not applied.

```diff
--- a/Core/MarkdownPM/Input/listRenumber.ts
-  if (!relist && !overLines && !tr.isUserEvent('delete')) return tr
+  if (!relist && !overLines && !tr.isUserEvent('delete') && !tr.isUserEvent('input.paste'))
+    return tr
...
-  tr.changes.iterChanges((fromA, toA, fromB) => {
+  tr.changes.iterChanges((fromA, toA, fromB, toB) => {
...
-      : left !== stands || was.text.slice(fromA, toA).includes('\n')
-    if (reshaped) at.push(fromB)
+      : left !== stands ||
+        `${was.text.slice(fromA, toA)}${scan.text.slice(fromB, toB)}`.includes('\n')
+    if (reshaped) at.push(fromB, toB)
```

**Per-File Summary:** `Input/listRenumber.ts` is the only production file.

**Tests:** `Input/listRenumber.test.ts` takes `describe('a paste into a numbered list')` as landed in *Engine Stack*, seven cases, with `history`, `undo`, and `Transaction` imported for it.

| Test | Origin |
|---|---|
| `recounts around lines it brings, whatever numbers they hold` | Stack, plus one assertion from this pass |
| `recounts a single item it writes into the gap between two lists` | Stack |
| `over a selection closes the gap the items leave` | Stack |
| `splits nothing below a flush line it brings` | Stack |
| `leaves words pasted inside an item alone, a gapped run included` | Stack |
| `counts nothing inside a code block or display math` | Stack |
| `takes one undo, its numbers with it` | Stack, with the lint fix below |

**The Lint Fix:** the undo test's helper took a block body for Biome's `noAssignInExpressions`:

```diff
-    const view = { state, dispatch: (tr: Transaction) => void (view.state = tr.state) }
+    const view = {
+      state,
+      dispatch: (tr: Transaction) => {
+        view.state = tr.state
+      },
+    }
```

**Red Runs:**

| Mutation | Result |
|---|---|
| `input.paste` leaves the gate | 3 red of 51: `recounts around lines it brings…`, `over a selection closes the gap…`, `takes one undo…` |
| The compare reads only the removed text | 2 red: `recounts around lines it brings…`, `takes one undo…` |
| `at.push(fromB)` alone, before the added assertion | 0 red: no paste test reached the lower end of a change |
| `at.push(fromB)` alone, after it | The added assertion reads `intro\n1. x\n5. a\n6. b` where `intro\n1. x\n2. a\n3. b` is right, shown by a throwaway probe both ways |

**Comment Changes:** none. Net 0.

#### Measured

- **Gates at `1ea13c25e`:** typecheck 0, lint 0. Tests 9,179 total, 2 skipped, 550 files, 9,177 passed, a clean full run.
- **Comments:** 3,515.
- **Actionable:** cumulative **-124 (+1,002 / -1,126)**, this step **+2 (+6 / -4)**. All-Inclusive cumulative +340 (+1,882 / -1,542), Tests +460 (+844 / -384), Files +2.
- **Replay:** the patches, saved from `lc-w2`, are the commits' own diffs.

#### Differences From the Investigation

- **One Added Assertion:** `expect(pasted('5. a\n6. b', 0, 0, 'intro\n1. x\n')).toBe('intro\n1. x\n2. a\n3. b')`, in the test named above. The brief asked for the tests as landed, and `toB`, one of the four edits, had no test reaching it: dropping it left the suite green. The line pins the lower end of a change, which *9-T23* states.
- **Behavior:** none from `a37d2d7b2` in this phase.

#### Calls Taken

- **The Lint Fix's Shape:** a block body, as *§The Reconciliation List* names, and Biome's formatting spreads the object.

#### Facts for the Docs Rewrite

- The filter's gate reads `input.list`, `delete`, `input.paste`, and an `input` over a selection crossing lines.
- The `Editor-Internals` entry in *Engine Stack.patch* doesn't mention paste at all, so Phase 11's rewrite adds it: a search of that hunk for "paste" reads 0.

#### Concerns

None for this phase.

#### For the Executor

Nothing by hand.
