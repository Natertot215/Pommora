### Phase 10 — Text Properties — Notes

**Commits:** `3a7bedaf1` (What Leaves and The Pane, folded), `6e1d42716` (At Rest), and `b380728f4` (G-13) on `lc-w2`, over `33b84adb6`, the finished Phases 1 to 9. **Delivers:** G-1 to G-13.

#### Measured

| Measure | What Leaves and The Pane | At Rest | G-13 | Whole Phase |
|---|---|---|---|---|
| Actionable | ±0 (+27 / -27) | +18 (+54 / -36) | +4 (+5 / -1) | **+22 (+86 / -64)** |
| All-Inclusive | +87 (+126 / -39) | +90 (+151 / -61) | +10 (+17 / -7) | +187 (+294 / -107) |
| Comments, by view-delta | +1 (+4 / -3) | 0 (+2 / -2) | 0 (+2 / -2) | +1 (+8 / -7) |
| Tests | +86 (+95 / -9) | +72 (+95 / -23) | +6 (+10 / -4) | +164 (+200 / -36) |
| Documentation | 0 | 0 | 0 | 0 |
| Production comment count | 3,508 | 3,508 | 3,508 | **3,507 → 3,508** |
| Typecheck | Clean | Clean | Clean | Clean |
| Lint | Clean | Clean | Clean | Clean |
| Suite | | | 9,219 passed, 2 skipped (9,221) | Green in 550 files, no reruns needed |

The Investigation's estimate was about +20, and the prototype's reading with G-10 and G-13 about +13. The difference from +13 is G-3's mute, the box's rule and alignment, which the prototype left out, and `renderRestingLine`'s signature. The rationale for a positive number: G-1 delivers behavior that didn't exist, and each added line is that behavior in its smallest form or a shared line that replaced a surface's own.

**The Rebase:** the first build sat on `6e92fd3d1`. On `5f48aab88`, `detect.ts`'s scope comment was the only conflict. The stack had shortened it to name no surface, so it stays true after the flip and this phase's rewording left. Everything else applied clean.

#### What Leaves

**In Plain Terms:** a value's one-line field and its pane were told apart by a flag running beside the scope, and a resting value drew every line and hid all but the first. The flag leaves, since the scope says the same thing, and a resting value now reads and draws its first line alone.

**Leaves:** `oneLine` through `editorBase` and `sharedSurface`.

**`Core/MarkdownPM/surface.ts`:**

```diff
-const sharedSurface = (
-  scope: MarkdownScope,
-  { oneLine = false, remembers = 'leave' }: { oneLine?: boolean; remembers?: Remembers } = {},
-): Extension => [
+const sharedSurface = (scope: MarkdownScope, remembers: Remembers = 'leave'): Extension => [
@@
-  oneLine ? [] : EditorView.lineWrapping,
+  scope === 'inline' ? [] : EditorView.lineWrapping,
@@
-    spellcheck: oneLine ? 'false' : 'true',
+    spellcheck: scope === 'inline' ? 'false' : 'true',
@@ editorBase
-  oneLine,
-  oneLine?: boolean
-  sharedSurface(scope, { oneLine, remembers }),
+  sharedSurface(scope, remembers),
```

**`Core/Properties/Pickers/ValueEditor.tsx`:** `blanked` becomes `docText`, which also reads `\r\n` as CodeMirror's document does, and `committed` holds that text at `:57`, at the commit, and in the outside-write effect, so a pane closed untouched leaves a `\r\n` value on disk as it was:

```diff
-const blanked = (doc: string): string => (doc.trim() === '' ? '' : doc)
+// CodeMirror reads `\r\n` as one break, so a value a tool wrote that way compares as the document holds it, and a pane closed untouched leaves it as it was.
+const docText = (text: string): string => (text.trim() === '' ? '' : text.replace(/\r\n?/g, '\n'))
@@ the outside write
+    const next = docText(initial)
     if (
       view &&
-      blanked(view.state.doc.toString()) === committed.current &&
-      initial !== committed.current
+      docText(view.state.doc.toString()) === committed.current &&
+      next !== committed.current
     ) {
-      committed.current = initial
+      committed.current = next
-      mirrorBody(view, initial)
+      mirrorBody(view, next)
     }
```

**One Commit With The Pane:** removing `oneLine` before the flip would leave the pane at `'inline'`, neither wrapping nor spellchecking, for a step. So What Leaves and The Pane are one commit, with the removal first inside it.

#### The Pane

**In Plain Terms:** the pane now reads what a table cell reads. Enter makes the next line, Escape and the × save and close, and Tab and Shift-Tab nest and outdent. The grip, glyph menu, drag, rails, and Lists ▸ arrive through the surface's `readsLists` arm and `editorBase` with no pane code.

**`Core/Properties/Pickers/ValueEditor.tsx`:**

```diff
+  const scope = oneLine ? 'inline' : 'lists'
   const ac = useConnectionAutocomplete(viewRef, host)
@@
-          editorBase({ host, scope: 'inline', panes: [ac], formatExt, oneLine, remembers }),
+          editorBase({ host, scope, panes: [ac], formatExt, remembers }),
@@
-            keymap.of([
-              { key: 'Enter', run: leave },
-              { key: 'Shift-Enter', run: oneLine ? () => true : insertNewline },
-              ...(oneLine
+            keymap.of(
+              oneLine
                 ? [
+                    { key: 'Enter', run: leave },
+                    { key: 'Shift-Enter', run: () => true },
                     { key: 'Mod-Enter', run: () => true },
                     { key: 'Escape', run: cancel },
                   ]
                 : [
+                    { key: 'Enter', run: insertNewline, shift: insertNewline },
+                    { key: 'Escape', run: leave },
                     // A field lets Tab move the focus as a plain field does; the pane keeps it, and Shift-Tab stops short of its focus trap, which would carry it to the ×.
                     { key: 'Tab', run: () => true },
                     { key: 'Shift-Tab', run: () => true, stopPropagation: true },
-                  ]),
-            ]),
+                  ],
+            ),
```

The keymap is one ternary rather than two ternaries and a spread: each surface's keys now read as one list, and `shift:` states the pane's Shift-Enter in the same binding as its Enter.

**`markdown-tables.css` to `markdown-pm.css`:**

```diff
+/* A cell and a Text pane have no gutter, so the block grip sits in the inset the list already reserves, and the press band reaches that far into the line rather than staying left of it. */
+:is(.mdpm-tbl-cell-editor, .text-pane-body) .cm-line.md-block-handle {
+  --grip-strip: var(--list-indent);
+  --grip-left: calc((var(--list-indent) - var(--icon-body) * var(--glyph-scale)) / 2);
+}
```

**The Reading Confirmed:** each of the three mechanisms the mandate asked about stays, and each now describes the field alone.

| Mechanism | Why It Stays |
|---|---|
| `readsLists` | `literalLines` reads it for `markers`, `intents.ts:627` for its own line reading, and `edits.ts:251` for the `- [] ` shorthand. At `'inline'` all three must answer no, or the field draws a list where G-5 and G-12 want a dash |
| `readsLists(scope)`'s empty arm | A field has nothing to drag or grip, and mounting those six extensions on every field would add cost to reach the same nothing |
| The menu's third arm | The field offers Format ▸ without Lists ▸, by G-5 |

**Tests:**

| Test | Change | Red Run Against the Previous Commit |
|---|---|---|
| `TextPane.test.tsx:117` | Now "Enter and Shift-Enter each write a line break; Tab stays…"; the close becomes a break, the pane stays, nothing commits | `expected 'x\na' to be 'x\na\n'` |
| `TextPane.test.tsx:137` | Now "…and a second Enter breaks the line" | `expected 'see [[Alpha\|al]] x' to be 'see [[Alpha\|al]]\n x'` |
| `TextPane.test.tsx:150` | Title reads "closed by Escape"; both closing `press('Enter')` become `press('Escape')`; alias assertions hold | Held, as *6-T37* says |
| New: "Escape over a selection saves and closes in one press" | G-10 | `expected "vi.fn()" to be called once with arguments` |
| New `describe('a list in the pane')`: "wraps and spellchecks as a body does" | Step 1's `scope === 'inline'` | Run red with `lineWrapping` taken off `sharedSurface`: `expected false to be true` |
| New: "leaves a value a tool wrote with \r\n as it was when closed untouched, and saves it as written once edited" | G-4 | Run red with `docText`'s replace removed: `onCommit` called once, 1 failed of 22 |
| New: "takes an outside write with \r\n as the document holds it, and closes with nothing to save" | G-4 | Run red with `mirrorBody(view, initial)`: `c\n\nd` against `c\nd`, 1 failed of 23 |
| New: "reads a first-line marker as a list, and draws its grip" | G-1, G-2 | `expected null not to be null` |
| New: "Enter continues an item and breaks a plain line flush, Tab and Shift-Tab nest and outdent, and Shift-Enter stays a plain break" | G-10 | `expected '- milk' to be '- milk\n- '` |
| New: "renumbers a run around a removed item" | G-1 | `expected '1. a\n3. c' to be '1. a\n2. c'` |
| New: "holds no `/` menu" | G-10 | Green by construction, so run red by mounting `blockQuery` in `ValueEditor`: `expected null to be undefined` |
| New: "leaves a heading, a quote, and a fence as literal text" | G-9 | Green at `'inline'`, so run red with the pane at `'page'`: `expected <span class="md-h1"></span> to be null` |

`TextPane.test.tsx:179`, `:193`, and `:236` hold unchanged, and `inlineScope.test.tsx`'s negatives hold for the field unchanged.

#### At Rest

**In Plain Terms:** a resting value draws its first line the way a table cell draws a line, so a list shows its glyph and first item. One `…` marks a value running onto another line, a checked item mutes, and a box takes no press.

**`Core/MarkdownPM/Tables/cellStatic.tsx`:** `renderCellContent` loses its export, since production reads it inside this file alone, and `mdLinkTarget.test.tsx`, `aliasSites.test.tsx`, and `cellStatic.test.tsx` call `renderRestingLine`, as `TextCell` does. `renderRestingLine` is the body of `renderCellBody`'s line, rebased on `markers` as *§Where the Phases Could Break Each Other* asks. `restingItem` doesn't arrive: `TextCell` calls `parseListMarker(first)`, which is exactly what `literalLines` reads for a `'lists'` line, and a whole `scanDoc` for one line would build the rest of a scan for nothing.

```tsx
/** One resting line, its marker drawn as its glyph: a cell's line, and a Text value's first. */
export function renderRestingLine(
  line: string,
  lm: ListMarker | null,
  connections: () => ConnectionsApi | undefined,
  { base = 0, ...rest }: { base?: number; around?: CellPage; headingLinkStyle?: HeadingLinkStyle },
): React.ReactNode {
  const content = lm ? line.slice(lm.contentStart) : line
  const rendered = renderCellContent(content, connections, {
    ...rest,
    base: base + (lm?.contentStart ?? 0),
  })
  return (
    <>
      {lm && <MarkerGlyph lm={lm} line={line} at={base} />}
      {lm ? <span className="md-list-text">{rendered}</span> : rendered}
      {content === '' && '​'}
    </>
  )
}
```

**`Core/Properties/Cells/TextCell.tsx`:** `const [first] = text.split('\n', 1)` sits at the top, and `first` replaces `text` in `mayNameOwnHeading` and `linkGestures`, so a resting value no longer tokenizes or fetches headings for lines nobody sees. The loop becomes one span here, and At Rest folds that span away. Its per-line loop and `lineOffsetsOf` import leave, and `table.css`' `.cell-text-line + .cell-text-line` goes with its comment, so a value's first line is drawn once, from this commit.

```tsx
<div
  className={cx(
    'cell-text',
    overScrollEllipsis,
    lm && listLineClass(lm),
    text.slice(first.length).trim() !== '' && 'is-continued',
  )}
>
  {renderRestingLine(first, lm, connections, { around, headingLinkStyle })}
</div>
```

**`.cell-text-line` Folded:** with one line drawn, the span held nothing a line needed. `.cell-text` carries the cap, the fades, and now the list classes and the mark, and neither `over-scroll.css` nor `scroll-fade.css` uses `::after` there. `Cell.test.tsx` and `TextCell.test.tsx` read `.cell-text` in turn.

**`UIX/Table/table.css`:**

```css
.cell-text.is-continued::after {
  content: "…";
}
```

**`Core/MarkdownPM/markdown-pm.css`:**

- `--list-gap`, `--number-zone`, `--task-zone`, and `--bullet-size` lift to `:root`, since a resting glyph sits outside `.mdpm-editor`, and `--list-indent` and `--bullet-zone` join them, so the list's knobs sit in one home, net 0 lines.
- `.md-list-glyph:not(.mdpm-tbl-cell-static *)` becomes `.cm-line .md-list-glyph`, naming where a glyph drags rather than listing where it doesn't. A table is a block widget (`Tables/widget.tsx:461`), so a static cell sits outside any `.cm-line`.
- The mute selector drops from four lines to `:root.mute-checked .md-list-done .md-list-text`. `.md-list-done` comes only from `listLineClass`, so the selector names every surface that draws one.
- `vertical-align` widens to `:is(.mdpm-editor, .cell-text) .checkbox`.
- `.cell-text .checkbox { pointer-events: none; }` is new; see *§Calls*.
- `.md-list-checkbox-seat` gains `text-align: start`. A Standard card right-aligns its value, and the seat inherited that, so the box sat at the seat's right end against the text. Only the screenshots showed this; see *§The Live Probe*.

**`Cell.test.tsx`:** "renders every line of the value…" reads "renders the value's first line alone", by G-7, and "marks a link on a later line…" reads "draws no link a later line holds", by G-7 and row 58, its offsets moving to a list item's link in `TextCell.test.tsx`.

**Tests**, all in a new `describe('a list value at rest')` in `TextCell.test.tsx` unless named:

| Test | Decision | Red Run |
|---|---|---|
| "draws one glyph and the first item, marking what runs on" | G-3, G-7 | `expected to have a length of 1 but got +0` |
| "marks a plain value running on, and no value that ends in blank lines" | G-7, row 57 | `expected false to be true` |
| "draws a number with its written text" | G-3 | `expected undefined to be '3.'` |
| "draws a checked item done, and a press on its box falls through to the value" | G-8, 6-T32 | `expected false to be true` |
| "marks an item's link with its span in the whole value, and a click follows it" | The gesture offsets `Cell.test.tsx:288` pinned | Green before the change, so run red with `base` left out of `renderRestingLine`'s content: `expected '4,14' to be '6,16'` |
| `ValueEditor.test.tsx`, "reads a list's first line as its written dash, with no grip" | G-5, G-12 | Green by construction, so run red with the field at `'lists'`: `expected <div …> to be null` |
| `parseEditorValue.test.ts`, `editorText` of `- milk\n- eggs` | G-12 | Green by construction, so run red by stripping `- ` in `editorText`: `expected 'milk' to be '- milk'` |

#### G-13

**In Plain Terms:** a real YAML list under a Text key reads as its items' lines, so it draws as a list. It keeps its shape on disk until the first edit, because `writtenSpelling`'s existing compare holds it.

**`Core/Properties/propertyValue.ts`:**

```ts
const inlineText = (raw: unknown): string => linkEntry(raw, 2) ?? yamlInline(raw)

/** A held value as text: a string as itself, an unquoted `[[x]]` as the connection it spells, a list as one item's line per member, anything else as the yaml that spells it. */
export const asText = (raw: unknown): string =>
  linkEntry(raw, 2) ??
  (Array.isArray(raw) ? raw.map((item) => `- ${inlineText(item)}`).join('\n') : yamlInline(raw))
```

**`Core/Nexus/governedRoot.ts`:** `writtenSpelling`'s doc reads "whose `asText` reads as that string" where it read "whose inline yaml reads", which the change made untrue.

`[]` needs nothing: `decodeValue` already reads it as null, which the test at `propertyValue.test.ts` still pins. `yamlInline` and its doc are untouched, as *6-T35* says.

**Tests:**

| Test | Change | Red Run |
|---|---|---|
| `propertyValue.test.ts:55` | Title gains "a list as its items' lines" | With the rows below |
| `propertyValue.test.ts:62` | `['a\nb', 'c']` reads `- a\nb\n- c` | `expected { Object (kind, value) } to deeply equal { kind: 'text', value: '- a\nb\n- c' }` |
| `propertyValue.test.ts:66-69` | `[milk, eggs, bread]` reads its lines; new rows for `['milk']` and for `['a', ['b', 'c'], [['Page']]]`, which reads `- a\n- [b, c]\n- [[Page]]` | Same run |
| `governedRoot.test.ts:278` | `next` becomes `- milk\n- eggs`; a new row pins that a changed list lands as a string | `expected '- milk\n- eggs' to deeply equal [ 'milk', 'eggs' ]` |

`governedRoot.test.ts:633`, the write of a value a flow list already holds, holds unchanged and stays the file-level pin for "keeping its shape".

#### The Live Probe

**How It Ran:** one full probe from `ecbdb6bae`'s own build under the drive lock, through `drive-harness.mjs` with `POMMORA_DRIVE_REPO`, on a Collection A table, Standard and Compact cards, and a page's panel. It printed 26 of 27 checks. The one fail is a stale label in the probe: the stack renamed the grip menu's `Type` to `Format`, and all five types sit under it. The run then stopped at the harness's `openPanel`, which waits for an `Add Property` row this seed doesn't show, after the panel had opened; the stop's screenshot is the panel's. The probe, its log, and its screenshots are removed, and the harness restored `~/Test`. Earlier runs on `6e92fd3d1` agreed with all of this.

| Behavior | Result |
|---|---|
| Typed `- milk` draws a list line, a bullet, and a grip line | Held |
| Enter reads `- milk\n- `, Tab reads `- milk\n\t- `, focus stays in the pane | Held |
| The grip draws inside the pane, left of the glyph, on hover | Held: `--grip-strip` 20px, grip left 3.5px on a line at 948.5, the pane's edge 934.0, the glyph 968.5, opacity 1 |
| Rails draw | Held, with `outline-lines` turned on |
| Escape saves and closes, in one press over a selection too | Held |
| A resting value reads `•milk` with `"…"` on `::after`, one line tall | Held in the table and both card formats; 17.7px, with `text-overflow: ellipsis` still on the folded element |
| The glyph takes its size and gap off an editor, with no grab cursor | Held: 16.25px, a 4px gap, `cursor: default` |
| A click opens the plain field on `- milk` | Held, with no list class or grip in it |
| A box at rest takes no press, and a press writes nothing | Held |
| A checked item mutes | Held: `line-through`, reduced opacity |
| A plain value running on marks; a one-line number and a one-line box don't | Held |
| `[milk, eggs]` draws `•milk…`, its pane holds its lines, an untouched pane keeps the flow list, and the first edit lands a string | Held |
| A glyph drag moves an item, and the pane stays | Held: `- three\n- one\n- two` |
| A grip drag moves a block, and the pane stays | Held: `- a\n\t- b\nplain\n- c` became `- c\n\n- a\n\t- b\nplain`. The blank is `moveRange`'s, by design (`blockMove.test.ts:63`), so two lists stay two |
| The glyph menu, the grip's menu, and Lists ▸ open | Held: `Bulleted · Numbered · Alphabetical · Checklist · Arrowed`, `Format · Delete`, and `Lists` beside `Format` |
| Preserve List-Level Formatting | Held: Numbered from B changes B and E alone |
| A nested value reopens as written | Held on `6e92fd3d1`, and unchanged since. On disk it reads `Drive Notes: \|-` over `  - milk` and `  \t- eggs` |

**Screenshots Read, All Nine:** the pane with its grip and rail, the table at rest, the open field on `- milk`, the held grip drag with its drop line, the numbered tree in the pane, the table after the drags, Standard cards, Compact cards, and the Properties panel, which draws `• milk…` right-aligned in its row. The table shows `• milk…`, `1. first` with no mark, `milk…`, and a checked box beside muted, struck text clipping as `bought a ver…`, one `…` in every case. Standard cards hold the box's gap. **Not Seen:** a box in the Properties panel, which right-aligns as a Standard card does and takes the same seat rule, and a box in a right-aligned table column.

**The One Defect Screenshots Found:** on the first build, Standard cards drew the box against its text, as `☑bought…` and `☐open`, with every DOM check passing. `text-align: start` on the seat fixed it.

#### Comments, Line by Line

| Site | Change | Net |
|---|---|---|
| `UIX/Table/table.css:246` | "Every line is drawn on its own…" removed | -1 |
| `Core/MarkdownPM/markdown-tables.css:193` | The grip's comment left, moved below | -1 |
| `Core/MarkdownPM/markdown-pm.css`, grip rule | That comment arrives, reading "A cell and a Text pane have no gutter…" | +1 |
| `Core/MarkdownPM/Tables/cellStatic.tsx` | `renderRestingLine`'s doc added | +1 |
| `Core/MarkdownPM/surface.ts` | `sharedSurface`'s doc: "`oneLine` is a value field's surface" becomes "An `inline` surface is a value's one-line field" | 0 |
| `Core/MarkdownPM/markdown-pm.css:376` | The KNOBS comment says where the tokens now sit: "They sit above .md-list-item, on :root, so a resting value's glyph, a citation row, and a blank line a rail crosses, which sit in the same columns but aren't list lines, still get them." | 0 |
| `Core/Properties/Pickers/ValueEditor.tsx` | **+** `docText`'s comment, as in the hunk above | +1 |
| `Core/Properties/Pickers/text-pane.css:17` | "a rail" becomes "a gutter", since the pane now holds list rails | 0 |
| `Core/Properties/propertyValue.ts:39` | `asText`'s doc names a list | 0 |
| `Core/Nexus/governedRoot.ts` | `writtenSpelling`'s doc | 0 |

Net +1, reading 3,508. `detect.ts`'s scope comment needs no change on the stack, since it names no surface. The prototype's `/* The value runs on below its first line. */` was left out, since `is-continued` says it. `ValueEditor.tsx:134`, which the Reconciliation List flagged, stays word for word and still reads true.

#### Differences From the Investigation

- **`restingItem`** doesn't arrive, and `TextCell` reads `parseListMarker` directly.
- **`ValueEditor`'s `scope` Stays a Local:** inlined, the `editorBase` call reaches 102 columns and opens to seven lines, so the one-line read costs less.
- **`first` Reaches `mayNameOwnHeading` and `linkGestures`:** the prototype left both reading the whole value.
- **The Mute Selector Shrinks** rather than gaining `.cell-text`, and the grab rule states `.cm-line` rather than growing its exclusion list.
- **`.cell-text .checkbox` Is New:** *6-T33* read G-8 as free. It is for the press, but not for the look.
- **The Seat's `text-align` Is New:** nothing in the Investigation reads a right-aligned surface's box.
- **The Pane's Keymap Is One Ternary,** where *6-T36* adds to the existing shape.

#### Calls

- **The Order Within:** What Leaves and The Pane are folded, since the removal alone leaves the pane worse for a step. The removal comes first inside the commit.
- **`pointer-events: none` on a Resting Box:** `.checkbox:not(.checkbox-static):hover` washes the box and `.checkbox` sets `cursor: pointer`, so a box G-8 calls unclickable would hover as a control. `checkbox-static` is the kit's answer, but `MarkerGlyph` serves `StaticCell` too, whose box does toggle, so using it would take a parameter through two functions. One CSS rule also makes the press land on the value itself.
- **`const scope`** in `ValueEditor`, because the inline ternary forced `editorBase`'s call onto seven lines.

- **A Link Value at Rest:** nothing guards it, since none is needed. `LinkCell` reaches `TextCell` only with a whole link, which opens with `[`, and a bare address takes the `url` path (`readLinkText`).

#### Concerns

- **Two Drives the Reconciliation List Doesn't Name:** the Path Links and Metadata drives read a Text value's lines at rest, and later lines no longer exist. Neither drive ran here, so what flips beyond the selector needs a run; see *§For Phase 11's Rewrite*.
- **Red Runs Predate the Rebase:** each ran on `lc-text`, over `6e92fd3d1`. The pins are unchanged since, apart from `.cell-text-line` reading `.cell-text`.
- **An Empty Last Item:** as *6-T12* says, Enter on an empty item continues rather than ends the list, so a pane user leaves a list by Backspace on the marker or Shift-Enter.

#### For Phase 11's Rewrite

**Docs:** `MarkdownPM.md:10`, `:105`, and `PropertiesPM.md:60` take the pane's lists and the resting mark. **New Fact:** a resting box takes no pointer events, so a press lands on the value.

**`.cell-text-line` Is Gone, So These Lines Follow:** `git grep` finds seven, all in `.claude/scripts`, and none in the docs. Each reads `.cell-text` itself now; the drive builder takes them.

| Line | What It Does Today | What Follows |
|---|---|---|
| `Metadata Drive/live-drive.mjs:237` | Joins a value's `.cell-text-line`s | Read `.cell-text`'s `textContent`; a multi-line expectation becomes the first line |
| `Path Links Drive/live-drive.mjs:364` | Finds a line starting with a tag in the table cell | Read `.cell-text`; a tag past the first line no longer draws at rest, so that seed needs the tag on line one |
| `Path Links Drive/live-drive.mjs:408` | The same for `c02` in the panel row | Same |
| `Text Property Drive/live-drive.mjs:115` | `cellText` maps every line | Read `.cell-text`'s `textContent` |
| `Text Property Drive/live-drive.mjs:118` | `oneLine` checks later lines draw no box | That half leaves; the height check stands |
| `Text Property Drive/live-drive.mjs:150` | `Drive Items`' first line and list marks | Read `.cell-text`; `.cell-text` itself now carries `md-list-item`, so a count of `[class*="md-list-"]` under it starts below that |
| `Text Property Drive/live-drive.mjs:338` | Sizes the first line's box to bound the hover scroll | No element holds that width now, so measure a range over `.cell-text`'s contents; the `::after` mark adds to `scrollWidth` |

**The Text Property Drive's Assertions, Against This Tree:**

| Lines | What Flips |
|---|---|
| `:145-146` | `Drive List` reads `•milk` with the mark, rather than its flow list |
| `:147-149` | `Drive Prose`'s cell draws one line, not every line |
| `:150-151` | `Drive Items` draws a glyph, reading `•milk`, where it read a literal `- milk` with no list classes |
| `:532-533` | The pane may draw a list; the "no list" half goes |
| `:542` | Holds off a list; a list line now nests, so the check names which line it's on |
| `:578` | The pane's menu now holds Lists |
| `:596-597` | Enter breaks the line; Escape saves and closes |
| `:634` | `Drive Items`' lines draw as a list in the pane |
| `:649` | The reopened value draws lists, so `back.lists` is no longer zero for list-spelled values |
| `:37`, `:40`, `:213`, `:217` | `inline` and `shown` read a list as its lines, since sort and filter read that string |

`:157-160`, the adjacent write keeping the flow list byte for byte, holds. `Drive List` wants one new check, that the first edit lands a string, and a pane grip drag belongs in the rewrite per *§Where the Phases Could Break Each Other*: press the first line's strip, and expect the blank `moveRange` seats.
