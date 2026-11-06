### Phase 5 — One Marker Grammar — Notes

**Commit:** `b36d3177b` on `lc-w2`, on Phase 4's `1ea13c25e`. **Delivers:** B-1, B-2, B-3, B-4, B-9, and F-1's `2. [x] foo`.

#### Measured

| Measure | Reads |
|---|---|
| Actionable | **-49 (+49 / -98)** |
| All-Inclusive | +9 (+147 / -138) |
| Comments | -4 (+5 / -9) by view-delta, of which 5 are rewordings |
| Tests | +62 (+93 / -31) |
| Documentation | 0 |
| Files | 0 added or removed; 14 changed, 8 production and 6 test |
| Production comment count | 3,515 → **3,511**, at the cap |
| Typecheck | Clean |
| Lint | Clean |
| Suite | 9,184 passed, 2 skipped (9,186), 550 files, a clean full run |

The Investigation's recipe read -32 (+41 / -73), comments -3. The difference is the arrow fold (*§The Grammar*), which removes the early return, `bullet` and `arrow` sharing one union member, and `parseListMarkerPrefixed` folding into `lineMarker`. `listMarkerText` and Enter's call to it had already landed in Phase 3, so the recipe's hunks for them don't apply, and a plan writer should drop them from the recipe.

#### The Grammar

**In Plain Terms:** a list marker now has one reading, the parser's `kind`. What it draws as and what a menu calls it both follow from that. A box reads only after a bullet and a space, and the arrow is one more alternative in the same regex.

**Leaves:** `ARROW_MARKER_RE`, `parseListMarker`'s early return, `ListMarker`'s `bullet`, the bullet's `box?`, `Box.inner`, the regex's `(.*)$`, and `parseListMarkerPrefixed`, which folds into `lineMarker`.

**Arrives:** nothing. The regex's groups read indent 1, ordinal 2, box 3, inner 4, gap 5, and they match the recipe's, because `→` sits in the alternation uncaptured and nothing read the rest of the line. An ordinal holds up to nine digits, as standard Markdown and `LIST_LINE` beside the scan read one. The Investigation's *§Where the Phases Could Break Each Other* row "7, 5" no longer applies: Phase 7 moves no group index and re-pins nothing in `detect.test.ts` for this.

**`Core/MarkdownPM/Engine/detect.ts`:**

```diff
-type Box = { start: number; end: number; inner: string }
+type Box = { start: number; end: number }
@@
-  | (MarkerSpan & { kind: 'checkbox'; bullet: string; box: Box; checked: boolean })
-  | (MarkerSpan & { kind: 'bullet'; bullet: string; box?: Box })
-  | (MarkerSpan & { kind: 'arrow'; bullet: '→' })
+  | (MarkerSpan & { kind: 'checkbox'; box: Box; checked: boolean })
+  | (MarkerSpan & { kind: 'bullet' | 'arrow' })
 
-// `-` and `+` are the only bullet characters: `*` and `•` stay prose, or the drag layer is handed items nothing draws.
-const LIST_MARKER_RE = /^([ \t]*)(?:(\d+|[A-Z])\.|([-+]))(?:[ \t]*(\[([ xX]?)\]))?([ \t]+)(.*)$/d
-const ARROW_MARKER_RE = /^([ \t]*)→([ \t]+)/
+// `-` and `+` are the only bullet characters: `*` and `•` stay prose.
+const LIST_MARKER_RE = /^([ \t]*)(?:(\d{1,9}|[A-Z])\.|→|[-+](?:[ \t]+(\[([ xX])\]))?)([ \t]+)/d
@@ parseListMarker
-  const arrow = ARROW_MARKER_RE.exec(line)
-  if (arrow) {
-    const markerStart = offset + arrow[1].length
-    return {
-      kind: 'arrow',
-      bullet: '→',
-      level: indentLevel(arrow[1]),
-      markerStart,
-      markerEnd: markerStart + 1,
-      contentStart: markerStart + 1 + arrow[2].length,
-    }
-  }
   const m = LIST_MARKER_RE.exec(line)
   const idx = m?.indices
-  const ws = idx?.[6]
+  const ws = idx?.[5]
@@
-  const b = idx[4]
-  const box = b ? { start: offset + b[0], end: offset + b[1], inner: m[5] ?? '' } : undefined
+  const b = idx[3]
@@
-  const bullet = m[3]
-  if (box && box.inner !== '') {
+  if (b) {
+    const box = { start: offset + b[0], end: offset + b[1] }
     return {
       kind: 'checkbox',
-      bullet,
       level,
       markerStart,
       markerEnd: box.end,
       contentStart,
       box,
-      checked: box.inner !== ' ',
+      checked: m[4] !== ' ',
     }
   }
   return {
-    kind: 'bullet',
-    bullet,
+    kind: line[indent.length] === '→' ? 'arrow' : 'bullet',
     level,
     markerStart,
     markerEnd: markerStart + 1,
     contentStart,
-    box,
   }
```

```diff
--- a/Core/MarkdownPM/Engine/detect.ts, lineMarker
-export function parseListMarkerPrefixed(line: string): ListMarker | null {
-  const offset = quotePrefix(line).length
-  return parseListMarker(line.slice(offset), offset)
-}
@@
-  if (f === undefined) return parseListMarkerPrefixed(line)
-  if (!readsListsIn(f)) return null
-  const body = fenceBodyStart(line, f)
+  if (f !== undefined && !readsListsIn(f)) return null
+  const body = f === undefined ? quotePrefix(line).length : fenceBodyStart(line, f)
   return parseListMarker(line.slice(body), body)
```

```diff
--- a/Core/MarkdownPM/Engine/listModel.ts
-export function checkboxToggleChange(doc: string, pos: number): TextEdit | null {
-  const ls = lineStartAt(doc, pos)
-  const lm = parseListMarkerPrefixed(doc.slice(ls, lineEndAt(doc, pos)))
+export function checkboxToggleChange(scan: DocScan, pos: number): TextEdit | null {
+  const k = lineIndexAt(scan, pos)
+  const lm = scan.markers[k]
   if (lm?.kind !== 'checkbox') return null
+  const ls = scan.lineStarts[k]
```

`listModel.ts`' `lineStartAt`, `lineEndAt`, and parser imports leave, `listDrag.ts`' `docString` leaves, and `Tables/cellStatic.tsx` hands the toggle `scanDoc(text, 'cell')` at the press. It was the last caller of the quote-prefixed parse outside the scan, and in a cell it read a quote prefix the cell's scan doesn't. No glyph draws on such a line, so nothing changes for a user.

`- [] x` and `- [ ]` with no trailing space reach the bullet by backtracking: the optional box group fails, and the gap takes the single space. `-[ ] x` and `1.[ ] a` fail the required gap and return null.

#### The Classifications

**In Plain Terms:** the two extra readings of a marker leave, and each reader asks `kind`.

**Leaves:** `ListGlyph`, `listGlyphOf`, `drawnKind`, the `ListKind` import in `intents.ts`, `format.ts`' import from `Engine/intents`, and the `{ lm, glyph }` projection with `MarkerGlyph`'s `glyph` prop.

**Arrives:** `textMarkerClass`, one line, the class a text marker and a resting glyph share. It's the one name in this phase that's new, and it replaces the template string both drawers held.

**`Core/MarkdownPM/Engine/intents.ts`:**

```diff
-// The rail's x sits on its ANCESTOR's glyph center; ordered / arrow / `+` return null, so no rail is drawn under one.
+// The rail's x sits on its ANCESTOR's glyph center; ordered and arrow return null, so no rail is drawn under one.
 export function railTypeClass(m: ListMarker): string | null {
   if (m.kind === 'checkbox') return 'md-outline-task'
-  if (m.kind === 'bullet' && m.bullet === '-') return 'md-outline-bullet'
+  if (m.kind === 'bullet') return 'md-outline-bullet'
@@
-// The form a marker is DRAWN as, ...
-// Null where the source parses as a marker but nothing draws one: ...
-export type ListGlyph = 'checkbox' | 'bullet' | 'arrow' | 'number'
-
-export function listGlyphOf(lm: ListMarker): ListGlyph | null { ... }
-
-export function drawnKind(lm: ListMarker): ListKind | null { ... }
+export const textMarkerClass = (lm: ListMarker): string =>
+  `md-list-${lm.kind === 'arrow' ? 'arrow' : 'number'} md-control ${GLYPH_CLASS}`
@@ pushConstruct
-  const glyph = lm && listGlyphOf(lm)
-  const bulletAbsorbs = base > 0 && !onMarker && glyph === 'bullet'
+  const bulletAbsorbs = base > 0 && !onMarker && lm?.kind === 'bullet'
-  } else if (lm && glyph === 'bullet') {
+  } else if (lm?.kind === 'bullet') {
-  } else if (lm && (glyph === 'arrow' || glyph === 'number')) {
+  } else if (lm) {
-      className: `md-list-${glyph} md-control ${GLYPH_CLASS}`,
+      className: textMarkerClass(lm),
```

**`Core/MarkdownPM/Input/format.ts`:** `drawnKind(x)` becomes `x.kind` at four sites, in `listReach` twice, `listKindOf`, and `setList`. `listKindOf`'s map reads `lm?.kind ?? null` rather than the recipe's `lm && lm.kind`, which Biome warns on and which `lm?.kind` alone can't replace, since a plain line has to stay `null`. Two doc comments lose "drawn as".

**`Core/MarkdownPM/Tables/CellEditor.tsx`:** these two already read `scan.markers` on the stack, so only the gate leaves.

```diff
-// The glyph, not the parse: a marker nothing draws is prose on both surfaces, ...
 const listLineAt = (view: EditorView): ListMarker | null => {
   const scan = docScan(view.state)
-  const lm = scan.markers[lineIndexAt(scan, view.state.selection.main.from)]
-  return lm && listGlyphOf(lm) ? lm : null
+  return scan.markers[lineIndexAt(scan, view.state.selection.main.from)]
 }
@@ atListEnd
-    const lm = scan.markers[i]
-    if (lm && listGlyphOf(lm)) return false
+    if (scan.markers[i]) return false
```

**`Core/MarkdownPM/Tables/cellStatic.tsx`:** `renderCellBody` reads `markers` directly, with `lm` in place of `it.lm` throughout, and `MarkerGlyph` tests `lm.kind === 'bullet'` and calls `textMarkerClass(lm)`.

```diff
-  // A marker nothing draws is prose here exactly as it is in the editor, ...
-  const items = markers.map((lm) => {
-    const glyph = lm && listGlyphOf(lm)
-    return lm && glyph ? { lm, glyph } : null
-  })
-  if (items.every((it) => it === null))
+  if (markers.every((lm) => lm === null))
```

#### The Shorthand and Enter

**In Plain Terms:** Pommora writes only `-`. Typing `+[]` and a space writes `- [ ] `, and Enter under any `+` item writes a dash.

**`Core/MarkdownPM/Input/edits.ts`:**

```diff
-const shorthandCheckboxRe = /^([ \t]*)([-+])\[([ xX]?)\]$/
+const shorthandCheckboxRe = /^([ \t]*)[-+]\[([ xX]?)\]$/
@@ canonicalizeCheckbox
-  const [, ws, marker, inner] = m
-  // ... without it the line parses as plain text.
-  const gfm = `${ws}${marker} [${inner.toLowerCase() === 'x' ? 'x' : ' '}] `
+  const [, ws, inner] = m
+  // ... without it the line reads as a bullet holding `[ ]`.
+  const gfm = `${ws}- [${inner.toLowerCase() === 'x' ? 'x' : ' '}] `
```

Enter needed no production change: Phase 3's `listMarkerText(lm.kind)` already writes it. This phase adds its pin.

#### Tests

**Run Red:** the rewrites and pins were written first and run against the unchanged production tree at `a37d2d7b2`, across `detect`, `intents`, `cellLists`, `edits`, and `format`: 16 failed, 2 of them *8-T31*'s and 14 this phase's, all listed below as Red. After the production change the same five files read 2 failed, the same two of *8-T31*'s.

| File | Test | Change | Decision | Red Run |
|---|---|---|---|---|
| `Engine/detect.test.ts` | "bullet: ranges + level" | `bullet` leaves the expected record | Shape | Red |
| `Engine/detect.test.ts` | "checkbox: bracket span" | `bullet` and `Box.inner` leave | Shape | Red |
| `Engine/detect.test.ts` | "arrow: `→ ` is a list marker" | `bullet` leaves | Shape | Red |
| `Engine/detect.test.ts` | "empty [] is a bullet (box present…)" | Left, replaced by the two below | B-1, B-2 | n/a |
| `Engine/detect.test.ts` | "a box reads only after a bullet and its space, and only holding a space or an x" | Arrived | B-1, B-3 | Red |
| `Engine/detect.test.ts` | "a box with no space ahead of it reads as plain text" | Arrived | B-2 | Red |
| `Engine/detect.test.ts` | "only `-` and `+` bullet…" | `1) a` added | B-1 | Passed; the row already held |
| `Engine/detect.test.ts` | "reads an item whatever ends its line, a carriage return or a line separator included" | Arrived, on `- a\r` and `- x` with U+2028 | G-3 | Red with `(.*)$` back: 1 failed of 68 |
| `Engine/detect.test.ts` | "reads up to nine digits as an ordinal, as standard Markdown does" | Arrived, on nine and ten digits | B-1 | Red with `\d+` back: 1 failed of 68 |
| `Engine/detect.test.ts` | `describe('parseListMarkerPrefixed…')` | Became `describe('lineMarker…')`, reading `lineMarker(line, undefined)` | Shape | n/a |
| `Engine/listModel.test.ts` | "click (no drag past threshold) toggles a checkbox…", three | Take a scan | Shape | n/a |
| `Engine/intents.test.ts` | "plus item with no text" | The `plus` row left the `it.each`, whose `ordered` and `arrow` rows stand | B-1 | n/a |
| `Engine/intents.test.ts` | "plus list → marker kept as literal source" | Became the plain `it` "arrow list → marker kept…", its `plus` row gone | B-1 | Passed |
| `Engine/intents.test.ts` | "a plus item takes a dash's • widget", on `+ item` and `+ ` | Arrived, holding the two `plus` rows' replacement | B-1 | Red, both |
| `Engine/intents.test.ts` | "rails are scoped to bullets, checkboxes, and letters…" | Rewritten: a `+` parent takes `md-outline-bullet` | B-9 | Red |
| `Tables/cellLists.test.tsx` | "calls a bullet carrying an empty box prose…" | Rewritten as "reads an empty box as a bullet's text and a plus as a bullet, at rest exactly as when live", over `- [] x` and `+ a` | B-1 | Red |
| `Tables/cellLists.test.tsx` | "treats a marker nothing draws as prose…" (`:349`) | Rewritten as "continues a bullet holding an empty box…": Enter writes `- [] x\n- ` | B-1 | Red |
| `Input/edits.test.ts` | "writes a dash whichever bullet typed the box, keeping the indent", on `+[]` and `  +[x]` | Arrived, the Investigation's named pin | B-2 | Red |
| `Input/edits.test.ts` | "writes a dash under a plus, whichever item it continues" | Arrived | B-4 | Passed at `a37d2d7b2`, since Phase 3 delivered it; red under a mutation restoring the old write (`'+ a\n+ '` against `'+ a\n- '`), reverted |
| `Input/format.test.ts` | "keeps an ordered item's box text, which a bullet then reads as a box" | Arrived | B-3, F-1 | Red |
| `Input/format.test.ts` | "leaves a plus as a bullet already, and a checklist pick keeps an empty box as text" | Arrived | B-1, D-4 | Red |
| `Input/format.test.ts` | "reads the kind a whole block's items agree on…" | `+ a\n- b` and `- [] x` read `bullet` | B-1 | Red |

**The Behavior Contract, Row by Row:**

| *Observed on That Build* Row | Pin |
|---|---|
| `+ x`: bullet, content at 2, checks Bulleted | Pinned: `format.test.ts:275` for the check, `intents.test.ts:211` for the span 0 to 2. Already pinned: `detect.test.ts:104` for the kind |
| `- [] x`: bullet, content at 2, checks Bulleted | Pinned: `detect.test.ts:86`, `format.test.ts:275` |
| `-[] x`, `-[ ] x`, `-[x] x`, `1.[ ] a`: plain text | Pinned: `detect.test.ts:98` |
| `1. [ ] a`, `2. [x] foo`: ordered, content at 3 | Pinned: `detect.test.ts:86` |
| `- [ ] a`, `+ [x] a`: checkbox, content at 6 | Pinned: `detect.test.ts:86` |
| `* a`, `1) a`: plain text | Already pinned: `* a`, `detect.test.ts:102`. Pinned: `1) a` in the same test |
| `→ a`, `A. a`: arrow, alphabetical | Already pinned: `detect.test.ts:110`, `:63` |
| `+[]`, `  +[x]` plus a space | Pinned: `edits.test.ts:179` |
| `-[]`, `-[x]` plus a space | Already pinned: `edits.test.ts`, *checkbox canonicalization* |
| Enter on `+ a`, `+ [ ] a` | Pinned: `edits.test.ts:73` |
| Enter on `9. a` | Already pinned: `listRenumber.test.ts:135` |
| `2. [x] foo` picked Bulleted | Pinned: `format.test.ts:212` |
| `+ a` picked Bulleted, `- [] x` picked Checklist | Pinned: `format.test.ts:215` |

#### Comments

Production count 3,515 → 3,511. Four left and five were reworded, and nothing was added.

| Site | Change |
|---|---|
| `intents.ts:128` "The form a marker is DRAWN as…" | Left |
| `intents.ts:129` "Null where the source parses as a marker…" | Left |
| `CellEditor.tsx:53` "The glyph, not the parse…" | Left |
| `cellStatic.tsx:286` "A marker nothing draws is prose here…" | Left |
| `intents.ts:103` | Reworded: `+` leaves the rail-less |
| `detect.ts:551` | Reworded, shorter: "or the drag layer is handed items nothing draws" no longer applies, since every marker draws |
| `edits.ts`, `canonicalizeCheckbox` | Reworded: without the trailing space the line reads as a bullet holding `[ ]`, where it said plain text |
| `format.ts:312`, `listReach`'s doc | Reworded: "the siblings of its type" |
| `format.ts:373`, `setList`'s doc | Reworded: "already of the type" |

#### Removal Pass

Searched production `Core` for `glyph`, `.bullet`, `.inner`, `.box`, `kind ===` on markers, second parses, literal bullets, and restatements of the grammar. What's taken is above. What stands:

- **`gripMenu.ts`'s `kind: 'glyph'`, `listDrag.ts`' `glyphAt`:** the DOM glyph and the menu's trigger, which aren't a classification.
- **`lm.box` readers (`listModel.ts:29`, `intents.ts`, `cellStatic.tsx`):** a box is real state one type holds, as *1-T6.2* says.
- **`codeHighlight.ts:55`:** *§Contradictions* keeps it standing.
- **`Tables/codec.ts`' `BARE_MARKER`, `BARE_TASK`:** Phase 7's. `BARE_TASK` still admits `-[ ]`, which appends a space to a line that now reads as plain text. Harmless until Phase 7 takes it.
- **`pushConstruct`'s `parseListMarker(inner)`, `listLevels`, `listKinds`:** Phase 7's list. Every branch now returns its marker, so nothing blocks the optional step there.
- **`parseListMarker` in `readLine` and `stripInnerMarkers`:** each reads a quote-stripped body rather than a scan line.

#### Differences From the Investigation

- **The Arrow Fold:** taken here as the brief directs. `ARROW_MARKER_RE` and the early return should leave Phase 7's *§What Leaves* table, and Phase 7's "7, 5" row should leave.
- **A Line Separator:** with `(.*)$` gone, `- a\r`, `→ a\r`, and a line holding U+2028 read as items, as standard Markdown reads them, where `.` stopped at each. A value holding `\r\n` draws its glyph at rest as the pane does.
- **`textMarkerClass` Carries No Comment:** the recipe gave it one, and the name and two call sites read without it. That's why comments read -4 rather than -3.
- **Recipe Hunks Already Landed:** `listMarkerText`'s move and Enter's write came with Phase 3, and `listLineAt` and `atListEnd`'s `scan.markers` read came with the stack.
- **`cellLists.test.tsx`'s First Rewrite Also Pins `+ a`:** the Reds table named it for `- [] x` alone. A `+` drawing `•` at rest had no pin, and it's the same test's claim.

#### Calls Taken

- **`→` Uncaptured:** `line[indent.length] === '→'` tells it from a bullet, which keeps the recipe's group numbers and adds no group.
- **`bullet` and `arrow` Share One Union Member:** with the fold they're built by one return, and neither carries anything else. Phase 7's record may read them apart if it wants; nothing here depends on it.
- **`(.*)$` Leaves:** the last group is read by nothing, and dropping it reads `\r` and U+2028 lines as items, which G-3 needs at rest.
- **`\d{1,9}`, With `LIST_LINE` Apart:** one spelling of the ordinal stands, and past nine digits a recount would lose digits. The two regexes can't become one definition: `LIST_LINE` and `LIST_ITEM` read what a parser reads as a list's start, `*` and `1)` included, and B-1 keeps those out of the grammar.
- **`checkboxToggleChange` Lands Here:** `lineMarker` exists from Phase 2, so the signature and the fold land together, in the phase that settles the grammar.
- **`Box` Stays:** `box.end` always equals `markerEnd`, so `box` could shrink to a `boxStart` number and `Box` could leave. The brief names only `Box.inner`, and `listModel.ts`, `intents.ts`, and two test records would change, so it's left as an option for Phase 7.
- **`detect.ts:551`, `edits.ts`' Comment, and the Two `format.ts` Docs Reworded:** not on the Investigation's list, but each sat on a changed line or stated what this phase turned false.

#### Facts for Phase 11's Rewrite

- `MarkdownPM.md:25`, `:257`: a `+` item takes a bullet's rail, by being a bullet.
- `MarkdownPM.md:88`: the shorthand writes `- [ ] `, whichever bullet typed it.
- A text marker's class comes from `textMarkerClass`, and only `→` and the sequenced kinds reach it.

#### Concerns

- **Not Driven Live:** the brief's gate is pins, so no app instance ran. A `+` item taking the bullet widget, `atomic` ranges, and the caret-on-marker reveal are the dash's path exactly, and `intents.test.ts:211` holds the widget, but the rewritten List Types Drive is what proves it in the app.
- **Phase 10's Rebase:** `renderCellBody`'s `items` is gone, as *§Where the Phases Could Break Each Other* expects, so `renderRestingLine` has to rebase on `markers`.
- **Cap Margin:** this phase lands exactly on 3,511, with Phase 3's one line of margin still undecided. Any later phase adding a comment net crosses it until Phase 7's `intents.ts:104` leaves.

#### By Hand

Nothing. The commit replays as it stands once rebased; its files overlap Phases 1 to 4 only at the lines named above.
