### Phase 7 — One Definition Per Type — Notes

**Commits:** four on `lc-w2`, over Phase 6's `e9674162f`. **Delivers:** B-7, D-3, D-6, and F-1's callout head, plus *1-T6.6*'s optional rail read.

| Commit | Task | Actionable | Comments | Tests |
|---|---|---|---|---|
| `79cdcab2c` | The Record | -18 (+28 / -46) | -1 | +5 (+7 / -2) |
| `3bc63fc17` | One Name | -6 (+8 / -14) | 0 | +12 (+28 / -16) |
| `0c968d586` | The Callout Head | -20 (+37 / -57) | 0 | +19 (+36 / -17) |
| `9e657f17e` | Rails Read the Scan (optional) | -15 (+21 / -36) | 0 | +8 (+8 / 0) |

#### Measured

| Measure | Reads |
|---|---|
| Actionable | **-59 (+84 / -143)** |
| All-Inclusive | -16 (+164 / -180) |
| Comments | -1 (+1 / -2) |
| Tests | +44 (+79 / -35) |
| Documentation | 0 |
| Files | 0 added or removed; 22 changed, 10 production and 12 test |
| Production comment count | 3,510 → **3,509** |
| Typecheck | Clean at every commit |
| Lint | Clean |
| Suite at head | 9,191 passed, 2 skipped (9,193), 550 files, a clean full run |

#### The Record

**In Plain Terms:** the two small functions that answered "what does this type write" and "what rail does this type draw" become one table in `detect.ts`, next to the list of types. The table cell parser reads the real grammar rather than its own copy.

**Leaves:** `listMarkerText`, `railTypeClass` and its comment, `BARE_MARKER`, `BARE_TASK`, and `type Box`.

**Arrives:** `LIST_TYPES`.

**What Was Found:** the Investigation's fallback was to drop the record if the built delta read positive. The record alone reads negative: `listMarkerText` is 12 lines, `railTypeClass` 7, and the record 7. The commit as a whole reads -18 with `codec.ts` and `Box` in it, so the recommended shape stands and the fallback wasn't needed.

**`Core/MarkdownPM/Engine/detect.ts`:**

```diff
-type Box = { start: number; end: number }
-
 export type ListKind = 'ordered' | 'alphabetical' | 'bullet' | 'checkbox' | 'arrow'
 
+export const LIST_TYPES: Record<ListKind, { marker: string; rail?: string }> = {
+  ordered: { marker: '1. ' },
+  alphabetical: { marker: 'A. ', rail: 'md-outline-alpha' },
+  bullet: { marker: '- ', rail: 'md-outline-bullet' },
+  checkbox: { marker: '- [ ] ', rail: 'md-outline-task' },
+  arrow: { marker: '→ ' },
+}
+
@@
-  | (MarkerSpan & { kind: 'checkbox'; box: Box; checked: boolean })
+  | (MarkerSpan & { kind: 'checkbox'; boxStart: number; checked: boolean })
@@
-export function listMarkerText(kind: ListKind): string { … }
@@ parseListMarker
   if (b) {
-    const box = { start: offset + b[0], end: offset + b[1] }
     return {
       kind: 'checkbox',
       level,
       markerStart,
-      markerEnd: box.end,
+      markerEnd: offset + b[1],
       contentStart,
-      box,
+      boxStart: offset + b[0],
       checked: m[4] !== ' ',
     }
   }
```

**`Core/MarkdownPM/Engine/Tables/codec.ts`:**

```diff
-const BARE_MARKER = /^[ \t]*(?:(?:\d+|[A-Z])\.|[-+→])$/
-const BARE_TASK = /^[ \t]*[-+][ \t]*\[[ xX]\]$/
 const restoreTrailingItem = (display: string): string => {
   const cut = display.lastIndexOf('\n')
   const last = display.slice(cut + 1)
-  if (BARE_TASK.test(last)) return `${display} `
-  if (cut === -1 || !BARE_MARKER.test(last)) return display
-  const above = display.slice(lineStartAt(display, cut), cut)
-  return parseListMarker(above) ? `${display} ` : display
+  const lm = parseListMarker(`${last} `)
+  if (lm?.markerEnd !== last.length) return display
+  const above = cut === -1 ? '' : display.slice(lineStartAt(display, cut), cut)
+  return lm.kind === 'checkbox' || parseListMarker(above) ? `${display} ` : display
 }
```

The bare test is `markerEnd === last.length`, "the marker ends the line", rather than `contentStart === last.length + 1`: a `last` of `- ` holding its own space would pass the second and grow a space. `codec.ts`' two-line comment stays, since "a box is restored wherever it sits" still describes the `checkbox` clause.

**Other Files:**

- `Input/edits.ts`: `listMarkerText(lm.kind)` → `LIST_TYPES[lm.kind].marker`.
- `Input/format.ts`: `const marker = listMarkerText(kind)` → `const { marker } = LIST_TYPES[kind]`.
- `Engine/intents.ts`: `railTypeClass` and its comment leave; `lm.box.start` → `lm.boxStart`, `lm.box.end` → `lm.markerEnd`.
- `Engine/listModel.ts`, `checkboxToggleChange`: the same two reads.
- `Tables/cellStatic.tsx`: read `LIST_TYPES` here; the optional step took this call away again.

**Phase 5's Two Options:**

- **`Box`, Taken:** `box.end` always equalled `markerEnd`, so the type and an object per checkbox line leave, at seven sites.
- **`(.*)$`, Declined:** no line leaves, and it changes what reads as an item on any line holding `\r`, U+2028, or U+2029. The raw-string routes into `scanDoc` remain untraced, which fails "clear win". The Build Log's `→ a` note stands.

**Tests:**

| Test | Change | Red Run |
|---|---|---|
| `codec.test.ts` "leaves a box with no space after its bullet as the plain text it reads as" | Arrived; `-[ ]` alone and under a list | Red with the old `codec.ts`: `expected '-[ ] ' to be '-[ ]'` |
| `detect.test.ts:82`, `:231` | `box: …` → `boxStart: …` | Shape pins, rewritten with the shape |

#### One Name

**In Plain Terms:** each list type had a long name and a short name depending on the menu. Now it has the short one everywhere, and a list grip's submenu says Format rather than Type.

**Leaves:** `LIST_KINDS`' `short` field, the long labels, and the `Type` string. **Arrives:** nothing.

**`Core/Actions/gripMenu.ts`:**

```diff
 export const LIST_KINDS: readonly {
   kind: ListKind
   label: string
-  short: string
   icon: string
 }[] = [
-  { kind: 'bullet', label: 'Bullet List', short: 'Bulleted', icon: 'list' },
-  { kind: 'ordered', label: 'Numbered List', short: 'Numbered', icon: 'list-ordered' },
-  {
-    kind: 'alphabetical',
-    label: 'Alphabetical List',
-    short: 'Alphabetical',
-    icon: 'arrow-down-az',
-  },
-  { kind: 'checkbox', label: 'Task List', short: 'Checklist', icon: 'list-todo' },
-  { kind: 'arrow', label: 'Arrowed List', short: 'Arrowed', icon: 'arrow-right' },
+  { kind: 'bullet', label: 'Bulleted', icon: 'list' },
+  { kind: 'ordered', label: 'Numbered', icon: 'list-ordered' },
+  { kind: 'alphabetical', label: 'Alphabetical', icon: 'arrow-down-az' },
+  { kind: 'checkbox', label: 'Checklist', icon: 'list-todo' },
+  { kind: 'arrow', label: 'Arrowed', icon: 'arrow-right' },
 ]
@@ listRows
-  LIST_KINDS.map(({ kind, short }) => ({
-    label: short,
+  LIST_KINDS.map(({ kind, label }) => ({
+    label,
@@ ownRows
-      return [{ label: 'Type', submenu: listRows(ctx.current) }]
+      return [{ label: 'Format', submenu: listRows(ctx.current) }]
```

`blockMenu.ts` and `editorMenu.ts` don't change: both already read `label`, so the `/` menu and Lists ▸ follow. The general menu's Lists ▸ stays as it stood.

**The `/` Filter, Read and Run:** `matchKey(row.label, s.title)` holds a name and a section place, and a query matches letters in order. No keyword or alias concept exists on a row, so none was added.

| Typed | Finds |
|---|---|
| `bullet` | Bulleted |
| `number` | Numbered |
| `alpha` | Alphabetical |
| `check` | Checklist |
| `arrow` | Arrowed |
| `list` | All five, by section: Checklist, Arrowed, Bulleted, Numbered, Alphabetical |
| `task` | **Nothing** |
| `bullet list`, `numbered list` | **Nothing** |
| `todo` | Code Block alone, by scattered letters |

Row 39 decides the rename, so these read as its consequence. The brief set the bar for a keyword at the filter already having the concept, and it doesn't.

**One Table or Two, Measured:** see *§Calls Taken*.

**Tests:**

| Test | Change | Red Run |
|---|---|---|
| `blockMenu.test.ts:19-23`, `:60`, `:68` | Rewritten to the one names; `bl` now finds Bulleted and Alphabetical, since Numbered held its `bl` in "List" | Red on the old labels |
| `blockMenu.test.ts` "ranks by the name alone…" | Retitled "ranks a name match above a section match, the shorter label first on a tie"; the order pinned from the filter's own output | Red on the old labels |
| `blockMenu.test.ts` "finds a list type by its one name" | Arrived | Red on the old labels: `bullet` and four others |
| `editorMenu.test.ts:71` | `'Arrowed List'` → `'Arrowed'`; not on the brief's list | Red on the old labels |
| `gripMenu.test.ts:51` | Retitled, and asserts `items[0].label` is `Format` | Red with `'Type'` |
| `gripMenuFlow.test.tsx:85` | The describe retitled; its rows compare against `gripMenuItems`, so they follow | No claim to redden |

Seven tests went red together with `gripMenu.ts` at its old form, and all green after.

#### The Callout Head

**In Plain Terms:** a callout's first line drew a list glyph that did nothing, because the drawing code parsed its own marker past the callout tag where the rest of the app saw none. The drawing code now asks the scan, so a head draws no glyph and `- foo` shows as text. Turning a quoted list line into a callout now takes the marker off, so the app stops writing such heads.

**Took:** reading the scan, the recommended route. It stayed a change rather than a design, so the one-condition fallback wasn't needed. `cached assembly ≡ pure derivation` held, with a head added to its corpus.

**Leaves:** `pushConstruct`'s `parseListMarker(inner)`, its `readsLists(scan.scope)`, its return value and three `return lm` lines, its `lm`, `line`, and `ls` parameters, `lineIntentsInto`'s `li`, `base` offset, and own reads, `setBlock`'s ternary with `own` and `body`, `subfieldStats.ts`' second parse, and `subBlockAt`'s null, whose one producer was a head's glyph with no marker. **Arrives:** nothing.

**`Core/MarkdownPM/Engine/intents.ts`:** `pushConstruct` takes `i`, reads `line`, `ls`, and `lm` from the scan, pushes `md-list-text` itself, and returns `void`, since a non-null marker always reaches a list branch: a heading line never parses as a marker. Every `innerStart + lm.x` becomes `ls + lm.x`, in `pushConstruct` and `pushListLine`, across 21 lines. `innerStart` stays for the prefix, the heading, and the rule.

```diff
-  const line = scan.lines[i]
-  const ls = scan.lineStarts[i]
-  const le = ls + line.length
   const base = lineChrome(scan, i, selStart, intents)
   if (base === null) return null
-
-  const li = pushConstruct(intents, scan, line, ls, base, selStart, ranged)
-  if (li) {
-    const contentFrom = ls + base + li.contentStart
-    if (contentFrom < le)
-      intents.push({ kind: 'class', from: contentFrom, to: le, className: 'md-list-text' })
-  }
-  return li
+  pushConstruct(intents, scan, i, base, selStart, ranged)
+  return scan.markers[i]
@@ pushConstruct
+  const line = scan.lines[i]
+  const ls = scan.lineStarts[i]
+  const lm = scan.markers[i]
-  const lm = readsLists(scan.scope) ? parseListMarker(inner) : null
@@ its end
+  if (lm && ls + lm.contentStart < le)
+    intents.push({ kind: 'class', from: ls + lm.contentStart, to: le, className: 'md-list-text' })
```

**Why the Offsets Agree:** a line reaching `pushConstruct` is outside fences, math, and citations. There `scan.markers[i]` is `lineMarker(line, undefined)`, whose offsets carry the full quote prefix, since `QUOTE_MARKERS` matches every level, and `base` is that same prefix on quoted and callout body lines. A cell's base is 0. I diffed the drawn intents between `ee21a3d4f` and head on 14 documents covering nested quotes, callout bodies at depth two and three, `>>`, tabs, wide gaps, and indented quotes. Thirteen read identically. The one that differs is below, under *§Behavior Departures to Record*.

**`Core/MarkdownPM/Input/format.ts`:**

```diff
       const at = signSeatAt(scan, ls) ?? ls
-      const own = doc.slice(at, le)
-      const body = stripInnerMarkers(own)
-      const next = `> [!callout] ${parseListMarker(own) ? body : stripQuotePrefix(body)}`
+      const next = `> [!callout] ${stripInnerMarkers(stripQuotePrefix(doc.slice(at, le)))}`
```

**`Core/MarkdownPM/Engine/listModel.ts`:** `subBlockAt` returns `BlockSpan`. Its null guarded a glyph with no marker, and every glyph left comes from a `pushConstruct` branch holding `lm`; `ReactWidget` keeps `ignoreEvent`'s default, so an outer view never sees a table's or tile's glyph. Its check, `listDrag`'s `if (!block)` and local `scan`, `ownersOf`'s and `listReach`'s `!`, and `listDrag`'s comment's last clause leave.

**`Core/MarkdownPM/Engine/subfieldStats.ts`:** not on the brief's list. Row 42 says the head's `- foo` shows as text, and `proseStart` kept stripping it as a marker, so the footer would count something other than what's drawn.

```diff
-function proseStart(line: string): number {
+function proseStart(scan: DocScan, i: number): number {
+  const line = scan.lines[i]
@@
-  return base + (headingParts(inner)?.contentStart ?? parseListMarker(inner)?.contentStart ?? 0)
+  return scan.markers[i]?.contentStart ?? base + (headingParts(inner)?.contentStart ?? 0)
@@ rangeStats
-    const start = ls + Math.max(proseStart(lines[i]), from - ls)
+    const start = ls + Math.max(proseStart(scan, i), from - ls)
```

**Tests:**

| Test | Change | Red Run |
|---|---|---|
| `intents.test.ts` "a head draws no list marker, its `- foo` showing as text" | Arrived; six markers, with the caret away and on the line | Red without the change: `expected [ …(5) ] to deeply equal []` |
| `intents.test.ts`, `cached assembly`'s corpus | `'> [!note] - foo\n> - inner\n> [!tip] 1. bar'` arrived | A guard on the rebase rather than a claim of this fix; green either side |
| `format.test.ts` "callout takes a heading's or quote's marker, and a list's alone" | `> - foo`, `> 1. foo`, and `> ## hi` rows arrived | Red: `expected '> [!callout] - foo' to be '> [!callout] foo'` |
| `subfieldStats.test.ts` "a callout head's `- foo` counts as the text it shows" | Arrived | Red: `words: 1` against `words: 2, characters: 5` |
| `listModel.test.ts` "returns null off a list line" | Left, and `drop`'s throw with it, since `subBlockAt` holds no null | n/a |
| `listModel.test.ts`, `blockModel.test.ts`, `prefixSeat.test.tsx` | Their `!` and `?.` on `subBlockAt` left | n/a |

#### Rails Read the Scan

**In Plain Terms:** the outliner rails used to learn where the list items were from arrays the drawing pass filled in as a side effect. They now read the scan directly, so those two arrays, and the drawing pass's return value, leave.

**Judged:** the Investigation offered this only if it paid, and the risk was that `scan.markers` holds items inside Markdown code blocks, which `lineChrome` keeps from drawing. Built, it reads -15 with that mask in it, so it was taken. `quoteDepths` stays.

**Leaves:** `listLevels` and `listKinds` from `CachedLineIntents`, `LineFacts`, `deriveLines`, `docLineIntents`, and `stepLineIntents`; `lineIntentsInto`'s return value; two parameters of `railIntents`; `cellStatic.tsx`'s two `.map`s and its `LIST_TYPES` import; and the `?? ''` the record's `rail?` needed at two sites. `LIST_TYPES[…].rail` now has one reader.

**Arrives:** `levelAt`, one line, which reads a line's level from the scan through `markerIn`, and `open`, a flag so that a list-free line pays no `ridesList`.

```diff
-export function railIntents(
-  scan: DocScan,
-  listLevels: number[],
-  listKinds: string[],
-  quoteDepths: number[],
-): RailIntent[][] {
-  const n = listLevels.length
+export function railIntents(scan: DocScan, quoteDepths: number[]): RailIntent[][] {
+  const n = scan.lines.length
+  const levelAt = (i: number): number => markerIn(scan, i, undefined)?.level ?? -1
@@ the first loop
-  for (let i = 0, depth = 0; i < n; i++) {
+  for (let i = 0, depth = 0, open = false; i < n; i++) {
     const own = quoteDepths[i]
-    if (listLevels[i] >= 0 && own === depth) shown[i] = listLevels[i]
-    else if (own >= depth && ridesList(scan, i, depth)) shown[i] = CARRIES
+    const level = levelAt(i)
+    if (level >= 0 && own === depth) shown[i] = level
+    else if (open && own >= depth && ridesList(scan, i, depth)) shown[i] = CARRIES
@@
-      if (listLevels[i] >= 0) depth = own
+      if (level >= 0) depth = own
     }
+    open = level >= 0 || shown[i] === CARRIES
@@
-  const railKind: string[] = []
+  const railKind: (string | undefined)[] = []
@@ the third loop
-    const level = carries ? -1 : listLevels[i]
+    const level = carries ? -1 : levelAt(i)
@@
-      railKind[level] = listKinds[i]
+      railKind[level] = LIST_TYPES[scan.markers[i]!.kind].rail
```

`cellStatic.tsx`' call reads `railIntents(scan, lines.map(quoteDepthOf))`. `Core/Testing/markdownEngine.ts` needs nothing, against *1-T6.6*: it never read the return value.

**The Mask Is One Clause:** `lineChrome` keeps a list from drawing on fence, math, and citation lines. Math lines already read `null` in `scan.markers`. A citation line can't hold a marker either, since `citationEntries`' `breaks` ends the section at any line `parseListMarker` accepts, so a citation clause would guard nothing. I built that clause first, the pin for it couldn't be made to fail honestly, and a probe showed `[^1]: note\n- a` holding no citation section at all, old code and new alike. It left. If `breaks` ever stops reading markers, rails would draw there.

**Cost per Edit:** nothing new is allocated: `levelAt` is a closure over the scan, and two `carry` array rebuilds leave `stepLineIntents`, so an edit allocates less than before. The rail pass was already whole-document per edit, and its order doesn't change. `open` keeps `ridesList`, two binary searches and a regex, off every line no list holds, so a list-free document costs what it did:

| Per Keystroke, Median of 400 | `b7f2f17a5` | Without `open` | With `open` |
|---|---|---|---|
| 20,000 lines, every other blank | 1.32 ms | 1.86 ms | 1.35 ms |
| 5,000 tables of 4 lines | 1.71 ms | 3.00 ms | 1.61 ms |
| 20,000 bullets | 1.62 ms | 1.73 ms | 1.95 ms |

The bullets row's rise is vitest's per-call import getter on `markerIn`, not the code: the binding hoisted to a local reads 1.75 ms, and `levelAt` spelled inline 1.76 ms, on that row. `open` holds equivalence but for one shape, by a throwaway differential of `railIntents`' drawn output against the ungated walk: 240,000 strings at the page and `lists` scopes, 480,000 documents, half of them nested lists with quote prefixes, wraps, and carried blocks, 55,754 drawing rails. That shape is a list behind an indented quote, which the ungated walk read as a carried line and so drew no rails. It now draws as a flush quote's does, by B-9: `  > - u\n> \t- r` reads `> - u\n> \t- r`'s two rails exactly, `  > - a` draws none as `> - a` does, and *cached assembly ≡ pure derivation* and the rail cases hold.

**Tests:**

| Test | Change | Red Run |
|---|---|---|
| `intents.test.ts` "an item inside a Markdown code block takes no rail" | Arrived; nothing pinned this, since the whole of `Engine` and `Tables` stayed green with the mask removed | Red with `levelAt` reading `scan.markers[i]` bare: 1 failed of 99 |
| `intents.test.ts` "a wrapped line carries the rail…", a row on `  > - u\n> \t- r` | Arrived | Red with `open || level >= 0` as the gate: `expected [] to deeply equal [ Array(2) ]`, 1 failed of 99 |

#### Comment Changes

| Comment | Change |
|---|---|
| `intents.ts:103` "The rail's x sits on its ANCESTOR's glyph center…" | Left with `railTypeClass`. Its first clause, about the rail's x, has no new home; `railStyle` and the CSS state that position |

| `listDrag.ts`' glyph comment | Shortened: ", which mousedown still starts when the pointerdown resolves no block" leaves with the null it described |

No comment arrived or grew. `LIST_TYPES` and `levelAt` carry none.

#### Removal Pass

Searched production `Core` and `Desktop` for literal markers, `kind ===` and `case` on each type, and the type names as strings. What stands, and why:

- **`textMarkerClass`, `listLineClass` (`intents.ts`), `cellStatic.tsx:253`, `:259`, `decorations.ts:352`:** drawing, which B-8 keeps and the brief keeps out.
- **`isSequenced`, `ordinalOf`, `ordinalText`:** counting, one of the two behaviors B-7 lets differ.
- **`bulletAbsorbs`, `pushConstruct`'s branches:** a bullet and a box are replaced by widgets, a number and an arrow aren't; that's B-8 again.
- **`listModel.ts:28`, `codec.ts`' `checkbox`:** checking, the other allowed difference.
- **`edits.ts`' `shorthandCheckboxRe` and its `gfm`, and the `→` writes at `:815`, `:836`:** typing gestures. The shorthand carries a checked state the record's `marker` doesn't.
- **`format.ts:288` `readLine`, `:482` `stripInnerMarkers`:** read quote-stripped strings, as Phase 5 recorded.

`'1. '` and `'A. '` in the record restate `ordinalText(kind, 1)`. A row reading as a literal outweighs a function field holding one character.

#### Differences From the Investigation

- **`ARROW_MARKER_RE` and the early return:** left in Phase 5, as the brief says. Both rows leave Phase 7's *§What Leaves*, and "7, 5" leaves *§Where the Phases Could Break Each Other*.
- **`LIST_KINDS`:** `short` left and `label` took its values, so `blockMenu.ts:28` and `editorMenu.ts:43` need no change, where the table lists them as consumers.
- **`railTypeClass`' Consumers:** `intents.ts:460` and `cellStatic.tsx:288` at this base. After the optional step, one site reads `rail`.
- **"About Ten Sites":** 21 lines, all one substitution.
- **`Core/Testing/markdownEngine.ts`:** unchanged.
- **`subfieldStats.ts`:** added; see *§The Callout Head*.
- **`gripMenu.test.ts:51` Grew an Assertion:** the old test read `items[0].submenu` and never the label, so D-3 had no pin.
- **`editorMenu.test.ts:71`:** missing from *§The Reconciliation List*'s row.

#### Calls Taken

- **Two Tables, Where the Brief Asks for One:** the brief says a type's definition should live in one place and a new type be one row. I built that as a trial: `LIST_TYPES` holding `label`, `icon`, `marker`, and `rail`, with `ListKind = keyof typeof LIST_TYPES`, `LIST_KINDS = Object.keys(…)`, and `gripMenu.ts`' table gone. It typechecked, `hostGraph` stayed green, and Task 2 read -9 (+32 / -41) against the built -6 (+8 / -14). I reverted it and kept the Investigation's shape, for these reasons: menu copy and UIX icon names would sit in the grammar module the host embeds, *§B-7's Record* already weighed that and placed wording in Actions, `gripMenu.ts` holds `HEADING_LEVELS` the same way, it needed `rail: ''` as a sentinel and menu order riding key order, and it would edit `editorMenu.ts` while Phase 6 is in that file. **The honest result:** a type's behavior lives in one row of `LIST_TYPES`, and its wording in one row of `LIST_KINDS`, so a new type takes a union member, a row in each table, and a grammar alternative. `LIST_TYPES` missing a row is a compile error; `LIST_KINDS` missing one isn't. A reviewer preferring the single table can flip this in a few minutes: it's about 40 lines across six files.
- **`markerEnd`, Not `contentStart`:** see *§The Record*.
- **`pushConstruct` Takes `i`:** it derives `line`, `ls`, and `lm`, and the `md-list-text` push moves in with them, so `lineIntentsInto` is its chrome and one call.
- **`proseStart` Reads the Scan:** over re-parsing the line, which would have changed the head alone. `rangeStats`' doc already says every line keeps the construct the scan gives it.
- **`stripQuotePrefix` Stays One Level:** see *§Concerns*.
- **The Optional Step Is Its Own Commit:** so the plan can drop it alone.

#### Behavior Departures to Record

- **Row 42:** as decided.
- **`-[ ]` in a Cell:** stops gaining a trailing space, by B-2.
- **`# > a` to a Callout:** read `> [!callout] a`, now `> [!callout] > a`, as `- > a` already did. `> # a` read `> [!callout] # a`, now `> [!callout] a`.
- **Stats:** a `- b` line in a math block, or in a Text value's scope, now counts its dash, because nothing reads a marker there. Neither has a pin. The Text claim comes from reading `readsLists`, and I didn't trace whether stats are taken on a Text scan.
- **A Wide Gap Between Quote Markers in a Callout Body:** in `> [!note] h\n >  > - z`, `QUOTE_MARKERS` stops at the two spaces, so the scan reads no marker, while `lineChrome` peeled a second level and the old parse drew a bullet. That bullet was the same dead glyph as the head's, since every walk and key reads the scan. It now shows as text. Outside a callout, this line already read as text.
- **Table Lines:** `scan.markers` is null in a table region where `parseListMarker(inner)` wasn't, so a pipe-less row like `- a | b` stops taking list intents and a rail. The table draws over those lines; I didn't trace whether the old intents were visible.

#### Facts for Phase 11's Rewrite

- `MarkdownPM.md:138`: a list grip reads Format ▸.
- `MarkdownPM.md:153`: Lists ▸ reads Bulleted, Numbered, Alphabetical, Checklist, Arrowed.
- `MarkdownPM.md:258`: "following the list's Type ▸" reads Format ▸.
- `MarkdownPM.md:24`: Format ▸, as *§The Reconciliation List* already holds.
- A callout head draws no list marker, and its `- foo` is text.
- Rails read `scan.markers`, and a list type's marker and rail live in `LIST_TYPES`.
- `.claude/scripts/List Types Drive/live-drive.mjs` names `Bullet List`, `Numbered List`, `Task List`, and `Type` throughout (lines 128 to 328), and `.claude/scripts/README.md:107` names Type ▸. Neither changed here.

#### Concerns

- **`task` Finds Nothing:** a person who thinks of these as task lists gets an empty `/` menu, and `bullet list` gets the same. It follows from D-6, but it's a real loss worth Nathan's eye.
- **Depth-Two Quotes:** `> > - foo` to a callout writes `> [!callout] > - foo`, because `stripQuotePrefix` takes one level, as it did before. No dead glyph results, since the scan reads no marker there, and the `- foo` shows as text inside a nested quote. It's a head holding an unstripped marker, so F-1's producer is closed for depth one only.
- **Existing Heads:** a saved `> [!note] - foo` now shows its dash. That's row 42, and nothing migrates it.
- **Not Driven Live:** the gates are pins, so no app instance ran. A head's caret seat, with its prefix no longer drawn over, is worth a look in the rewritten drive.
- **Lean on the Mask:** the rail read depends on `citationEntries` ending a section at a marker.

#### By Hand

- **Phase 6 Rebase:** this phase removes `readsLists(scan.scope)` and the `readsLists` import from `intents.ts`, and doesn't touch `detect.ts`' `MarkdownScope` zone, `editorMenu.ts`, or any scope string. The `cellStatic.tsx` hunk sits a few lines under `scanDoc(text, 'cell')`, beyond its context. I didn't trial the rebase, because no Phase 6 branch was named to me.
- **Phase 10 Rebase:** `renderCellBody`'s `railIntents` call is one line now, and `markers` is still destructured.
- Nothing else. The commits replay as they stand once rebased.
