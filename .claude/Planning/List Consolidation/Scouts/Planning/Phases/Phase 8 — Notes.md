#### Phase 8 — Notes

**Commit:** `65b3ae617` on `lc-w2`, on Phase 7's `9e657f17e`. **Actionable:** -47 (+19 / -66). **All-Inclusive:** +7 (+89 / -82). **Comments:** ±0 (+1 / -1), 3,509 before and after. **Tests:** +54 (+69 / -15). **Gates:** typecheck 0, lint 0, 9,196 passed, 2 skipped (9,198), 550 files, a clean full run.

##### The Task

An apostrophe with a letter or digit on both sides now belongs to its word through CodeMirror's own word characters, answered by position. The joined-word atoms and the wrapped commands leave, so every word gesture, present and future, reads one provider.

**What Leaves (`Input/markdownInput.ts`):** `joins`, `JOINED`, `grouping`, `wordPress`, `joinedWords`, `wordGestures`, `DELETES`, `GROUPS`, `byWords`, `wordAt`'s two `while` loops, and the imports `Command`, `Decoration`, the six group commands, and `isWordChar`. `isWordChar` itself stays, since `Input/edits.ts` and `Connections/scan.ts` use it.

**What Arrives:** `CONTRACTION_REACH` and `contractions`, exactly as *§The Word Rule* states them, and `editorKeymap` as a `filter`. `surface.ts` mounts `Prec.high(contractions)` where `wordGestures` stood, which is the one difference from *§The Word Rule* (see *§Differences From the Investigation*). `cellStatic.tsx` passes `extensions: contractions`.

##### Per File

**`Core/MarkdownPM/Input/markdownInput.ts`** (+14 / -63): the imports narrow, and everything from `joins` to the file's end becomes:

```ts
/** A position reads an apostrophe as a word character when a walk from it, either way across any space and over letters, digits, and `_`, reaches one with a letter or digit on both sides. CodeMirror asks once per gesture and takes the first answer, so a quote touching that gesture's run rides with it, as `'don't'` reads whole, and a surface mounts this ahead of a fence's language. */
const CONTRACTION_REACH =
  /(?=\s*[\p{L}\p{N}_]*(?<=[\p{L}\p{N}])['’][\p{L}\p{N}])|(?<=[\p{L}\p{N}]['’](?=[\p{L}\p{N}])[\p{L}\p{N}_]*\s*)/uy

export const contractions = EditorState.languageData.of((state, pos) => {
  const { from, text } = state.doc.lineAt(pos)
  CONTRACTION_REACH.lastIndex = pos - from
  return CONTRACTION_REACH.test(text) ? [{ wordChars: "'’" }] : []
})

export function wordAt(state: EditorState, pos: number, side: -1 | 1): SelectionRange | null {
  const word = state.wordAt(pos)
  return word && (side < 0 ? word.from < pos : word.to > pos) ? word : null
}

export const editorKeymap = defaultKeymap.filter(
  (b) => b.run !== toggleComment && b.run !== toggleBlockComment,
)
```

**`Core/MarkdownPM/surface.ts`** (+2 / -2):

```diff
 import {
+  contractions,
   editorKeymap,
   smartDelete,
   typedInput,
-  wordGestures,
   wrapChords,
 } from './Input/markdownInput'
@@ inlineSurface
   typedInput,
-  wordGestures,
+  Prec.high(contractions),
   editorMenu(scope),
```

**`Core/MarkdownPM/Tables/cellStatic.tsx`** (+4 / -2): Biome wraps the call site to three lines.

```diff
-import { wordAt } from '../Input/markdownInput'
+import { contractions, wordAt } from '../Input/markdownInput'
@@ the resting word
-            return side ? wordAt(EditorState.create({ doc: text }), at, side) : null
+            return side
+              ? wordAt(EditorState.create({ doc: text, extensions: contractions }), at, side)
+              : null
```

**Rebase Points:** `surface.ts` reads bare `typedInput` here and the Investigation's stack read `typedInput(scope)`, so that line's context may need a hand resolve. Phase 9 reworks the `cellStatic.tsx` resting word next to this hunk.

##### Tests

All in `Core/MarkdownPM/inlineScope.test.tsx`, `describe('a word')`. Nothing left and no assertion changed. The existing test's press loop folded into the new `doubleClick` helper, and `mount`'s `editorBase` call moved into a `base()` helper so the fence pin can list `markdown()` ahead of it, as `MarkdownEditor.tsx` does. Helpers added: `base`, `doubleClick`, `groupFrom`, `wordIn`. The existing test passes unchanged in its assertions, and the word tests in `editorMenu.test.tsx` and `cellRestingMenu.test.tsx` pass untouched.

Each pin ran with its assertions as `expect.soft`, so every assertion reports on its own.

| Test | Assertion | Source | Run A: Production at `a37d2d7b2` | Run B: Saved Prototype's Body | Run C: No `Prec.high` |
|---|---|---|---|---|---|
| *takes a quote touching a contraction* | `say 'don't' now`, `wordAt` at 5 reads `'don't'` | Reconciliation pin 1, row 50 | Red: `don't` | Green | Green |
| | Double-click at 5 reads 4 to 11 | Reconciliation pin 1, row 50 | Red: `[5, 10]` | Green | Green |
| | `'I don't'` at 4 reads `don't'` | Row 50 | Red: `don't` | Green | Green |
| *carries a neighbor's quote across a contraction's gap* | `students' don't`, group left from 10 lands at 0 | Reconciliation pin 2, row 51 | Red: 8 | Green | Green |
| | `don't 'quoted'`, group right from 5 lands at 14 | Reconciliation pin 2, row 51 | Red: 7 | Green | Green |
| | Double-click at 6 of `don't 'quoted'` reads 6 to 14 | Row 51 | Red: `[6, 7]` | Green | Green |
| | `'tis don't`, `wordAt` at 4, side -1, reads `'tis` | Row 51 | Red: `tis` | Green | Green |
| *leaves a quote no walk reaches a contraction from* | `'don't'`, group right from 0 lands at 1 | Mandate pin | Green, as today | Red: 7 | Green |
| | `x 'don't`, group right from 1 lands at 3 | Mandate pin | Green, as today | Red: 8 | Green |
| *joins only a letter or digit on both sides, astral letters included* | `a'_b` reads `a` | Reconciliation pin 3, row 52 | Red: `a'_b` | Red: `a'_b` | Green |
| | `𝒶'b` reads whole | Row 52 | Red: `𝒶` | Green | Green |
| *answers ahead of a fence's language* | `don't` in a `js` fence, markdown listed first, reads `don't` | Added here | Green, as today | Green | Red: `don` |

Every pin has a red. Run B swapped in the prototype's `before`/`after` window for `contractions`' body. The resting call site is already pinned: dropping `extensions: contractions` turns `cellRestingMenu.test.tsx` "highlights and commits Bold over the word under an unselected click, at rest" red with `don`, so no pin arrived for it.

##### Comment Changes

**Removed:** the doc comment above `wordAt`, beginning "Every word gesture reads `wordAt`'s word, the one holding the character on `side` of `pos`".

**Added:** the doc comment above `CONTRACTION_REACH`, quoted in *§Per File*.

The prototype's second comment, "The word holding the character on `side` of `pos`.", stayed out, since `wordAt`'s signature and its one line read clearly. The net is ±0, against the Investigation's +1. Its last clause, on the mount order, states the reason `Prec.high` exists and replaces the old comment's clause on a fence's language.

##### Measured Numbers

**The 100,000-Character Line:** yes. The provider's read sits under a millisecond, at 0.21 to 0.37 ms. Each row is the median of 25 runs of `state.languageDataAt('wordChars', pos)` under vitest with `contractions` mounted, and `state.wordAt` is CodeMirror's whole word read beside it.

| Line | Position | Provider's Read | `state.wordAt` |
|---|---|---|---|
| 100,000 letters ending `)` | Middle | 0.212 ms | 3.765 ms |
| 100,000 letters ending `)` | Last letter's end | 0.351 ms | 4.407 ms |
| 100,000 spaces | Middle | 0.373 ms | 0.381 ms |
| 100,000 spaces, then `x` | Middle | 0.359 ms | 0.357 ms |
| `ab ` repeated | Middle | 0.000 ms | 0.000 ms |
| `'` repeated | Middle | 0.000 ms | 0.000 ms |
| `a' ` repeated | Middle | 0.000 ms | 0.000 ms |
| 100,000 letters, then `'t` | 5 | 0.057 ms | 3.381 ms |
| `don't`, then 100,000 letters | End | 0.061 ms | 4.101 ms |

The 3 to 4 ms in `state.wordAt` is CodeMirror's own cluster walk over a 100,000-letter word, which the regex doesn't add to.

**Line Delta Against the Investigation:** -47 (+19 / -66) against its -50 (+16 / -66). Two of the three lines are Biome's wrap at `cellStatic.tsx`. The third isn't attributed, since the Investigation's stack wasn't saved as a patch. The removal side matches exactly.

##### Differences From the Investigation

**The Rule Doesn't Hold in Code as Written:** The Investigation's *§Calls Taken* line "Does the rule hold in code: yes, as today" fails for *§The Word Rule*'s mount on a page. `charCategorizer` takes `languageDataAt('wordChars', at)[0]` (`@codemirror/state` `index.cjs:2831-2833`, read), and `MarkdownEditor.tsx` lists `markdown()` ahead of `editorBase()`, so a fence's language answers first wherever it has word characters of its own. Today's `wordAt` loops are language-blind, so this was a regression the prototype and the differential both missed, since neither mounted a fence with a language. Observed with `wordAt`:

| Line in a Fence | Language First (the Plain Mount) | Contractions First (`Prec.high`) |
|---|---|---|
| `// don't stop` in `js` | `don` | `don't` |
| `/* don't stop */` in `css` | `don` | `don't` |
| `font-family: don't` in `css`, on `font` | `font-family` | `font-family` |
| `font-family: x` in `css`, on `font` | `font-family` | `font-family` |
| `var $a = don't` in `js`, on `$a` | `$a` | `$a` |
| `plain don't`, outside a fence | `don't` | `don't` |

Languages with `wordChars` include JavaScript's `$` and CSS's `-`, and the same order governs HTML. A cell and a Text value mount no language, so only a page differs.

**The Call:** `Prec.high(contractions)` at `inlineSurface`, one token beside the existing `Prec.high(keymap.of(wrapChords))`, so E-5's "every word gesture" holds in a fence. The alternative was a flagged departure leaving contractions broken in every JS, CSS, and HTML block.

**A New, Small Departure It Brings:** where `contractions` answers inside such a fence, the language's characters don't apply for that gesture. On `// $a's` in `js`, a word read on the `a` gives `a's` (observed), where today gives `$a's`. By the same mechanism `family's` should read without `font-` from a position on `family` in `font-family's` (inferred; a position on `font` reads `font-family`, observed). It needs a contraction glued to a `$` or `-` run inside a language fence. It isn't in *§Behavior Changes*, and the plan's row 50 or 51 should carry it.

##### Calls Taken

- **Comment:** one rather than the prototype's two, per the mandate's request to hold at 0.
- **`Prec.high` at the Mount Rather Than in `contractions`:** this keeps `contractions` as *§The Word Rule* states it, and sits beside the file's other `Prec.high`. The resting cell needs no order.
- **A Pin Beyond the Mandate's List:** *answers ahead of a fence's language*, since `Prec.high` carries behavior nothing else guards.
- **Test Helpers:** four added, which the mandate didn't name, so a dozen pins don't each restate a press or a chord.

##### Concerns

- **Left Unchanged:** `\p{L}\p{N}` excludes combining marks, so a decomposed `é's` doesn't join. `isWordChar` read the same way, so this isn't a change (read, not run).
- **For Phase 11:** a search of `.claude/Features`, `.claude/Guidelines`, and `.claude/IssuesPM.md` finds no mention of `wordGestures`, `byWords`, `joinedWords`, or joined words, so nothing names the removed mechanism by name, and the one passage on the rule is `.claude/Features/MarkdownPM.md:146`. The rule's home is `contractions` in `Input/markdownInput.ts`, a surface mounts it at `Prec.high`, and a resting cell passes it to its bare state.
- **A Mid-Run Slip:** a shell loop's failed backup during the red runs overwrote the production edits with `a37d2d7b2`'s files. They were reapplied from the same text, Run A's results stand since it wanted those files, and Runs B and C and the gates ran on the reapplied tree.

##### By Hand

Nothing, past the `surface.ts` context noted in *§Per File*.
