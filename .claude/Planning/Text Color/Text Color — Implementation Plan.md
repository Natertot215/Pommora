## Text Color — Implementation Plan

**DATE:** 10-15-2026
**STATUS:** Ratified 10-15-2026
**SOURCE:** The 10-15-2026 conversation with Nathan: the request (highlights written `==🔴text==` with one leading emoji, a new Text Color written `=🔴text=` above Highlight in Format ▸, sharing Change Color ▸ and the color registry, done as a consolidation where the paint differs and the spelling doesn't) and his answers. Text Color has no Accent, no chord, and no default. A span wears one color (Notion's model). Sapphire also displays both in Obsidian, display only. Text Color excludes black and white. Nathan takes the Pommora visual pass himself.

**BASELINE** {Filled after ratification; end logged during final report}

| Repo | Head | Tests | Start | End |
|------|------|-------|-------|-----|
| Pommora | `f94fc0af3` | 7,897 passed, 2 skipped (536 files) | 10-15-2026 07:15 PM | {MM-DD-YYYY hh:mm AM/PM} |
| Sapphire | `9053a546` | 617 passed | — | — |

### Context

MarkdownPM colors a highlight with a color emoji just inside each `==` (`==🔴words🔴==`). Keeping both emoji in step drives several mechanisms: the tokenizer requires the two to match, and `Input/edits.ts` mirrors a typed emoji ahead of the closer (`pairColorMark`), deletes an empty pair together (`autoDelete`'s color branch), and steps Enter over the closing emoji (`closerEndAt`). The colors live in `Core/MarkdownPM/Engine/highlightColors.ts` (9 colors, every shape of a color, the circle written). `highlights.css.ts` turns each color into `.md-highlight-<color>`, which sets `--highlight`. The right-click menu reads the highlight under the caret through `readFormatState` into the `editorMenuRequest` schema, which main validates, and builds Format ▸ Highlight ▸ and Change Color ▸ from `highlightRows` in `Core/Actions/editorMenu.ts`.

Obsidian 1.14.4 natively reads `==🔴words==`, the leading-emoji form, for six colors in circles and squares. It paints the editor through `cm-highlight-<color>` classes its style builder takes from `state.highlightColor`, and paints Reading view through `mark[data-highlight="<color>"]`. It knows no brown, black, white, diamonds, hearts, or variation selectors, and never parses a single `=`. Sapphire (`~/The Studio/Projects/Sapphire`) already wraps Obsidian's markdown tokenizer (`wrapMarkdownToken`), decorates the editor with ViewPlugins (`headingLinks.ts`), and post-processes Reading view. Nothing in it touches highlights today.

### Overview

Pommora's registry becomes the paint-neutral source, `Engine/paints.ts`. A **paint** is how a span wears its color: a highlight washes behind its words and a text color inks them. Both kinds read one leading color mark through one fold in the tokenizer, both are written by one `toggleInline` rule, and the menu builds both submenus and Change Color from one rows builder. A single CSS var, `--paint`, carries the color; `.md-highlight` washes with it and `.md-text-color` inks with it.

The typed-pairing machinery for the trailing emoji is deleted. A span holds at most one paint: the tokenizer drops a text color inside a highlight, and a color picked over a painted span recolors it, converts it to the other paint, or removes it. Text Color uses seven colors; black and white only wash. Sapphire re-types the registry (as it did Pommora's fence roster). It extends Obsidian's own highlight parse to the colors and shapes Obsidian lacks, paints text color with a ViewPlugin in the editor and a post-processor in Reading view, and is always on.

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `paints.ts` • File | The paint and color registry, replacing `highlightColors.ts`. | `Core/MarkdownPM/Engine/` |
| `paints.css.ts` • File | One `--paint` var per color, replacing `highlights.css.ts`. | `Core/MarkdownPM/` |
| `PAINTS` / `Paint` / `isPaint` • Const, Type, Function | The two paints, `highlight` and `textColor`, which are also their token kinds and menu action groups. | `paints.ts` |
| `PAINT_COLORS` / `PaintColor` / `PAINT_COLOR_NAMES` • Const, Type, Const | The renamed color table. | `paints.ts` |
| `colorsOf` • Function | The colors a paint takes: all nine for a highlight, seven for a text color, black and white only washing. | `paints.ts` |
| `leadingMark` • Function | The regex source of a mark that opens a span of a paint. | `paints.ts` |
| `textColor` • Token kind | A span inked in a color: `=🔴words=`. | `Engine/tokens.ts` |
| `textColorRegex` • Function | The text color's grammar: a lone `=` that opens only on a mark. | `Engine/detect.ts` |
| `foldColor` • Function | Folds a leading color mark into the opener of either paint. | `Engine/tokens.ts` |
| `textColorEndAt` • Function | Where Enter steps to past a text color's closing `=`, read from its token. | `Input/edits.ts` |
| `painted` • Request field | The one paint under a right-click, `{ paint, color } \| null`, replacing `highlight`. | `Core/Actions/editorMenu.ts` |
| `colorRows` • Function | The rows of either paint's submenu and of Change Color. | `Core/Actions/editorMenu.ts` |
| `.md-text-color` / `.md-paint-<color>` / `--paint` • CSS | Ink class, per-color class, and the var both paints read. | `markdown-pm.css`, `paints.css.ts` |
| `colorMarks.ts` • File | Sapphire's color marks: the table, the highlight wrap, the text-color ViewPlugin, and the Reading-view pass. | `Sapphire/src/markdown/` |
| `markAt` / `textColorRuns` • Function | Sapphire's mark reader and text-color scanner. | `colorMarks.ts` |
| `installColorMarks` • Function | Installs the wrap, the ViewPlugin, and the post-processor. | `colorMarks.ts` |
| `--sapphire-color-*` / `.sapphire-ink-<color>` • CSS | Derived brown, black, and white, plus the ink classes. | `Sapphire/src/markdown/markdown.css` |
| `colorMarks.test.ts` • File | Sapphire's tests for the reader, the scanner, and the wrap. | `Sapphire/tests/markdown/` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `highlightColors.ts` / `highlights.css.ts` • File | Replaced by `paints.ts` and `paints.css.ts`. | `Core/MarkdownPM/` |
| `HIGHLIGHT_COLORS` / `HighlightColor` / `HIGHLIGHT_COLOR_NAMES` • Const, Type | Renamed into the paint vocabulary. | `highlightColors.ts` |
| `markBefore` / `TRAILING` / `isColorMark` • Function, Const | The trailing-mark reader and the typed-emoji test. | `highlightColors.ts` |
| `pairColorMark` / `highlightCloseAt` • Function | The typed mirror of a color mark ahead of the closer. | `Input/edits.ts` |
| `colorHighlight` • Function | The both-sides-must-match fold. | `Engine/tokens.ts` |
| `highlightRows` • Function | Highlight's own rows builder. | `Core/Actions/editorMenu.ts` |
| `highlight` • Request field | Replaced by `painted`. | `Core/Actions/editorMenu.ts` |
| `.md-highlight-<color>` • CSS | Replaced by `.md-paint-<color>`. | `highlights.css.ts` |

#### Constraints

- **Gates:**
  - **Pommora:** `npm run typecheck`, `npm run test`, and `npm run lint`, from the repo root; lint runs clean. Biome formats every TS/CSS/JSON write, so re-read before retrying a failed Edit.
  - **Sapphire:** `npx tsc -noEmit -skipLibCheck` and `npm test`, from its root. `npm run build` and `npm run dev` copy the bundle into NexusOS's live plugin folder, which Obsidian Sync carries to the phone, so a build is a publish. Build only in Task 4-5's live check.
- **Frozen:**
  - `format:highlight` and its ⌘L chord stay the accent highlight.
  - `DEFAULT_COMMANDS` gains no Text Color command.
  - `PAIRS`, `DOUBLED_ONLY`, `WRAP_CYCLES`, and `CLOSERS` in `edits.ts` don't change: a bare `=` keeps never pairing, and no single-`=` closer joins `CLOSERS`.
  - The highlight regex (`detect.ts:18`) and `Desktop/Actions/editorMenu.ts` stay as they are. `--highlight` stays the accent's theme token (`PommoraUIX.md:137`).
- **Conventions:**
  - **No New Comments:** No new code comments beyond the doc comments this plan writes out. A comment the change makes false is rewritten in the task that falsifies it.
  - **User-Facing Copy:** The only new copy is the `Text Color` label; color labels come from `capitalize(color)`.
  - **Commits:** Commit messages are past-tense and short, on `active` in each repo, one commit per phase once the phase (and its checkpoint, where it has one) closes.
  - **Agents:** Execution agents run opus-medium and review agents opus-high.
  - **Sapphire Rules:** Obsidian CSS variables only, `sapphire-` prefixes except the native highlight classes recorded in Task 5-2, and the Live-Verification round trip for any live check.
- **Shape:**
  - **Removal Comes First:** Phase 1 deletes before Phase 2 adds. Never delete the bare-`==` behaviors: accent highlight, `==|==` pairing, empty-pair Backspace, and Enter past `==`.
  - **Refactor Baseline:** Every accent-highlight test passes unchanged through every phase. Only tests that assert the trailing mark or the `highlight` request field are rewritten, each named in its task.
  - **Sweep of Old Consumers:** Every reader of `kind === 'highlight'`, `.color`, `wrappedSpan`, `HighlightColor`, or `s.highlight` is listed in a task below. The scouts found none outside them: `subfieldStats.ts`, `cellStatic.tsx`'s render, `TextCell.tsx`, and `Core/Testing/markdownEngine.ts` work generically through `markerRanges` and `contentClass`.

#### Process Overview

- [ ] **Phase 1:** Retire Typed Mark Pairing
  - [ ] Task 1-1
- [ ] **Phase 2:** Paints in the Engine
  - [ ] Task 2-1
  - [ ] Task 2-2
  - [ ] Task 2-3
  - [ ] Task 2-4
  - [ ] Review Checkpoint
- [ ] **Phase 3:** The Menus
  - [ ] Task 3-1
  - [ ] Review Checkpoint
- [ ] `[Stop: Nathan's Pommora visual pass — Task 3-1's last VERIFY]`
- [ ] **Phase 4:** Sapphire `[Parallel with Phases 1–3]`
  - [ ] Task 4-1
  - [ ] Task 4-2
  - [ ] Task 4-3
  - [ ] Task 4-4
  - [ ] Task 4-5
  - [ ] Review Checkpoint
- [ ] **Phase 5:** Documentation
  - [ ] Task 5-1
  - [ ] Task 5-2

---

### Phase 1 — Retire Typed Mark Pairing

**GOAL:** Delete everything that kept a closing color emoji in step with the opening one, before anything new is built. A typed emoji after `==` becomes an ordinary insert, which already writes the new spelling (`==|==` plus 🔴 gives `==🔴|==`).

#### Task 1-1

**TASK:** Remove `pairColorMark`, `highlightCloseAt`, `autoDelete`'s color branch, `closerEndAt`'s closing-mark skip, and the input gate's emoji exemption.

**NOW:**
- `typedInput` lets a typed color emoji through its single-character gate and tries `pairColorMark` first.
- `autoDelete` removes an empty `==🔴|🔴==` pair together.
- `closerEndAt` steps the caret past a closing emoji to reach `==`.

**CHANGE**

- [ ] Delete `describe('color marks in a highlight')` (`edits.test.ts:927-959`) and `pairColorMark` from the test's import list. `['==h==', 4]` already freezes Enter past `==`, which an emoji inside changes nothing about.
- [ ] Delete `isColorMark` and its doc comment from `highlightColors.ts`, since its last caller goes below.
- [ ] Delete `pairColorMark`, `highlightCloseAt`, and `autoDelete`'s color branch. Remove the closing-mark skip from `closerEndAt` and rename its `c` back to `caret`. Remove the `highlightColors` and `tokenize` imports, since `tokenize` was used only by `highlightCloseAt` and Task 2-4 brings it back.
- [ ] In `markdownInput.ts`, restore the gate to `text.length !== 1` and remove `pairColorMark` from the chain and both imports.

**AFTER**

```Core/MarkdownPM/Input/edits.test.ts diff
@@ imports @@
   inAliasAt,
-  pairColorMark,
   autoDelete,
@@ describe('color marks in a highlight') @@
-describe('color marks in a highlight', () => { … six tests … })
```

```Core/MarkdownPM/Engine/highlightColors.ts diff
-/** True when `text` is exactly one color mark, as a typed emoji arrives. */
-export const isColorMark = (text: string): boolean => markAfter(text, 0)?.length === text.length
```

```Core/MarkdownPM/Input/edits.ts diff
@@ imports @@
-import { isColorMark, markAfter, markBefore } from '../Engine/highlightColors'
-import { tokenize } from '../Engine/tokens'
@@ pairColorMark, highlightCloseAt @@
-export function pairColorMark( … ) { … }
-
-/** Where the uncolored highlight opening at `open` starts its closing `==`. */
-function highlightCloseAt( … ) { … }
@@ autoDelete @@
   if (selStart !== selEnd || selStart === 0 || inCodeAt(scan, selStart)) return null
   const doc = scan.text
-  const before = markBefore(doc, selStart)
-  const after = markAfter(doc, selStart)
-  if (before && before.color === after?.color) { … }
   const close = PAIRS[doc[selStart - 1]]?.close
@@ closerEndAt @@
 function closerEndAt(scan: DocScan, caret: number): number | null {
   if (inCodeAt(scan, caret)) return null
   const doc = scan.text
-  // A highlight's closing color mark is part of its closer.
-  const mark = markAfter(doc, caret)
-  const c = mark && doc.startsWith('==', caret + mark.length) ? caret + mark.length : caret
-  const before = doc.slice(lineStartAt(doc, c), c)
+  const before = doc.slice(lineStartAt(doc, caret), caret)
~  (every later `c` in the function reads `caret`)
```

```Core/MarkdownPM/Input/markdownInput.ts diff
@@ imports @@
   autoPair,
-  pairColorMark,
   autoDelete,
-import { isColorMark } from '../Engine/highlightColors'
@@ typedInput @@
-    if (text.length !== 1 && !isColorMark(text)) return false
+    if (text.length !== 1) return false
@@ typedInput chain @@
-      pairColorMark(scan, from, text, settings) ??
-        headingHash(scan, from, from, text) ??
+      headingHash(scan, from, from, text) ??
```

**VERIFY**

- [ ] `git grep -nE "pairColorMark|highlightCloseAt|isColorMark" -- Core` returns nothing.
- [ ] Run the gates. The existing `==` tests stay green: `['==h==', 4]`, the `=` wrap cycle, and empty-pair Backspace.
- [ ] Check for unnecessary code or mistakes.

---

### Phase 2 — Paints in the Engine

**GOAL:** Build both paints out of one registry, one fold, and one write rule. Highlights move to the leading-mark spelling, text color gets its grammar, painting, toggle, and Enter, and the color var turns paint-neutral. Nothing here touches the menu boundary, so `readFormatState` still reports `highlight` until Phase 3.

#### Task 2-1

**TASK:** Rename the registry into the paint vocabulary, and make highlights read and write only the leading mark.

**NOW:**
- `highlightColors.ts` exports `HIGHLIGHT_COLORS`, `markAfter`/`markBefore`, `isColorMark`, and `writtenMark`.
- `colorHighlight` folds a matching mark on each side.
- `wrappedSpan` hard-codes `[+2, -2]`.
- `toggleInline` writes the mark on both sides.
- `.md-highlight-<color>` sets `--highlight`.

**CHANGE**

- [ ] Rewrite `highlight.test.ts`'s `describe('a colored highlight')` and `format.test.ts`'s `describe('highlight colors')` as below, and watch them fail.
- [ ] `git mv` `Engine/highlightColors.ts` to `Engine/paints.ts`, and `highlights.css.ts` to `paints.css.ts`. Write both as below and repoint every importer: `tokens.ts`, `format.ts`, `editorMenu.ts`, and `MarkdownEditor.tsx:35`.
- [ ] In `tokens.ts`, replace `colorHighlight` with `foldColor` and rewrite `wrappedSpan`.
- [ ] In `format.ts`, write the closer bare.
- [ ] In `intents.ts`, emit `md-paint-<color>`.
- [ ] In `markdown-pm.css`, have `.md-highlight` wash with `--paint`, falling back to the accent.

**AFTER**

```Core/MarkdownPM/Engine/paints.ts diff
 import type { CellKey } from '@pommora/uix/Theme/colors'

-/** A highlight's color rides in the file as a color emoji inside each `==`; the circle is the one written, and every other shape reads as the same color. */
-export const HIGHLIGHT_COLORS = {
+/** A painted span's color rides in the file as a color emoji right after its opener; the circle is the one written, and every other shape reads as the same color. */
+export const PAINT_COLORS = {
   red: { cell: 'red-3', marks: ['🔴', '🟥', '❤'] },
   … (rows unchanged) …
 } as const satisfies Record<string, { cell: CellKey; marks: readonly string[] }>

-export type HighlightColor = keyof typeof HIGHLIGHT_COLORS
-export const HIGHLIGHT_COLOR_NAMES = Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]
-export const writtenMark = (color: HighlightColor): string => HIGHLIGHT_COLORS[color].marks[0]
+export type PaintColor = keyof typeof PAINT_COLORS
+export const PAINT_COLOR_NAMES = Object.keys(PAINT_COLORS) as PaintColor[]
+export const writtenMark = (color: PaintColor): string => PAINT_COLORS[color].marks[0]

~const COLOR_OF = new Map<string, PaintColor>( … PAINT_COLOR_NAMES … PAINT_COLORS … )

 // A mark is at most a surrogate pair and its variation selector; one unit past it tells whether it joins a longer emoji.
 const VARIATION_SELECTOR = '\uFE0F'
 const MARK_WIDTH = 4
 const MARK = `(?:${[...COLOR_OF.keys()].join('|')})${VARIATION_SELECTOR}?`
-// A mark joined into a longer emoji (`❤️‍🔥`, `🐈‍⬛`) belongs to that emoji.
+// A mark joined into a longer emoji (`❤️‍🔥`) belongs to that emoji.
 const LEADING = new RegExp(`^${MARK}(?![${VARIATION_SELECTOR}\u200D])`, 'u')
-const TRAILING = new RegExp(`(?<!\u200D)${MARK}$`, 'u')
-interface ColorMark { … }
-function markOf( … ) { … }
-export const markAfter = …
-export const markBefore = …
+export function markAfter(text: string, at: number): { color: PaintColor; length: number } | null {
+  const m = LEADING.exec(text.slice(at, at + MARK_WIDTH))
+  return m && { color: COLOR_OF.get(m[0].replace(VARIATION_SELECTOR, ''))!, length: m[0].length }
+}
```

```Core/MarkdownPM/paints.css.ts diff
 import { globalStyle } from '@vanilla-extract/css'
 import { cellColor } from '@pommora/uix/Theme/ramp'
-import { HIGHLIGHT_COLOR_NAMES, HIGHLIGHT_COLORS } from './Engine/highlightColors'
+import { PAINT_COLOR_NAMES, PAINT_COLORS } from './Engine/paints'

-for (const color of HIGHLIGHT_COLOR_NAMES)
-  globalStyle(`.md-highlight-${color}`, {
-    vars: { '--highlight': cellColor(HIGHLIGHT_COLORS[color].cell) },
+for (const color of PAINT_COLOR_NAMES)
+  globalStyle(`.md-paint-${color}`, {
+    vars: { '--paint': cellColor(PAINT_COLORS[color].cell) },
   })
```

```Core/MarkdownPM/Engine/tokens.ts diff
@@ imports @@
-import { type HighlightColor, markAfter, markBefore } from './highlightColors'
+import { markAfter, type PaintColor } from './paints'
@@ TokenBase @@
-  color?: HighlightColor
+  color?: PaintColor
@@ wrappedSpan @@
-/** What a mark wraps, seen from outside it: a highlight's color marks sit inside its `==`, so a caret on them is still inside the highlight. */
-export const wrappedSpan = (tk: Token): [number, number] =>
-  tk.kind === 'highlight' ? [tk.range[0] + 2, tk.range[1] - 2] : tk.contentRange
+/** What a mark wraps, seen from outside it: a color mark sits inside its opener, past a run as wide as the closer, so a caret on it is still inside the span. */
+export const wrappedSpan = ({ range: [s, e], contentRange: [cs, ce], color }: Token): Span =>
+  color ? [s + e - ce, ce] : [cs, ce]
@@ colorHighlight → foldColor @@
-/** A matching color mark inside each `==` joins the markers, so it hides and reveals with them; a lone or mismatched one stays text. */
-function colorHighlight(text: string, tk: Token): Token { … }
+/** A color mark right after the opener joins it, so it hides and reveals with the marker; one with no words after it stays text. */
+function foldColor(text: string, tk: Token): Token {
+  const [cs, ce] = tk.contentRange
+  const mark = markAfter(text, cs)
+  if (!mark || mark.length >= ce - cs) return tk
+  const content: Span = [cs + mark.length, ce]
+  return {
+    ...tk,
+    contentRange: content,
+    markerRanges: [[tk.range[0], content[0]], tk.markerRanges[1]],
+    color: mark.color,
+  }
+}
@@ tokenizeChunk @@
   const highlights = matches({ … })
     .filter(notOverlapping([...code, ...links]))
-    .map((tk) => colorHighlight(text, tk))
+    .map((tk) => foldColor(text, tk))
```

```Core/MarkdownPM/Input/format.ts diff
@@ imports @@
-import { type HighlightColor, writtenMark } from '../Engine/highlightColors'
+import { type PaintColor, writtenMark } from '../Engine/paints'
@@ toggleInline @@
-  color: HighlightColor | null = null,
+  color: PaintColor | null = null,
 ): FormatEdit | null {
   …
-  const w = WRAP[kind]
-  const mark = color ? writtenMark(color) : ''
-  const open = w + mark
-  const close = mark + w
+  const close = WRAP[kind]
+  const open = color ? close + writtenMark(color) : close
@@ editFor @@
-      return toggleInline(scan, from, to, 'highlight', value as HighlightColor)
+      return toggleInline(scan, from, to, 'highlight', value as PaintColor)
```

```Core/MarkdownPM/Engine/intents.ts diff
 export const contentClass = (tk: TokenOf<ContentKind>): string =>
-  tk.color ? `${CONTENT_CLASS.highlight} md-highlight-${tk.color}` : CONTENT_CLASS[tk.kind]
+  tk.color ? `${CONTENT_CLASS[tk.kind]} md-paint-${tk.color}` : CONTENT_CLASS[tk.kind]
```

```Core/MarkdownPM/markdown-pm.css diff
 .md-highlight {
   --highlight-bleed: 0.1em; /* KNOB — how far the wash bleeds past the words */
-  background: color-mix(in srgb, var(--highlight) var(--tint-secondary), transparent);
+  background: color-mix(in srgb, var(--paint, var(--highlight)) var(--tint-secondary), transparent);
```

`editorMenu.ts` renames only its import and the two type and const references (`HighlightColor` → `PaintColor`, `HIGHLIGHT_COLOR_NAMES` → `PAINT_COLOR_NAMES`). Phase 3 rewrites the rest.

```Core/MarkdownPM/Engine/highlight.test.ts diff
@@ describe('a colored highlight') @@
+  it('reads a color mark right after the opening == as its color, outside the content', () => {
+    expect(colored('a ==🔴two words== b')).toEqual([{ content: 'two words', color: 'red' }])
+  })
+  it('reads every shape of one color the same, with or without a variation selector', () => {
+    expect(colored('==🟥x==')).toEqual([{ content: 'x', color: 'red' }])
+    expect(colored('==❤️x==')).toEqual([{ content: 'x', color: 'red' }])
+    expect(colored('==🔷x==')).toEqual([{ content: 'x', color: 'blue' }])
+    expect(colored('==⚫️x==')).toEqual([{ content: 'x', color: 'black' }])
+  })
+  it('folds the mark into the opening marker, so it hides and reveals with the ==', () => {
+    const text = '==🟢go=='
+    const [tk] = tokenize(text)
+    expect(tk.markerRanges.map((r) => text.slice(...r))).toEqual(['==🟢', '=='])
+  })
+  it('reads only the leading mark, so a trailing one is words', () => {
+    expect(colored('==🔴x🔴==')).toEqual([{ content: 'x🔴', color: 'red' }])
+    expect(colored('==x🔴==')).toEqual([{ content: 'x🔴', color: undefined }])
+    expect(colored('==🔴 Red alert==')).toEqual([{ content: ' Red alert', color: 'red' }])
+  })
+  it('needs words after the mark', () => {
+    expect(colored('==🔴==')).toEqual([{ content: '🔴', color: undefined }])
+  })
+  it('leaves a mark joined into a longer emoji to that emoji', () => {
+    expect(colored('==❤️‍🔥 fire==')).toEqual([{ content: '❤️‍🔥 fire', color: undefined }])
+  })
-  (the six both-sides tests)
```

```Core/MarkdownPM/Input/format.test.ts diff
@@ describe('highlight colors') @@
+  it('wraps with the written circle after the opening ==, caret after the content', () => {
+    const e = toggleInline(scanDoc('hi'), 0, 2, 'highlight', 'red')
+    expect(apply('hi', e)).toBe('==🔴hi==')
+    expect(e?.selection).toBe(6)
+  })
+  it('recolors a highlight of another color, the accent included', () => {
+    expect(apply('==hi==', toggleInline(scanDoc('==hi=='), 3, 3, 'highlight', 'blue'))).toBe('==🔵hi==')
+    expect(apply('==🟥hi==', toggleInline(scanDoc('==🟥hi=='), 5, 5, 'highlight', 'green'))).toBe('==🟢hi==')
+    expect(apply('==🔴hi==', toggleInline(scanDoc('==🔴hi=='), 5, 5, 'highlight'))).toBe('==hi==')
+  })
+  it('removes a highlight already in the picked color', () => {
+    expect(apply('==🔴hi==', toggleInline(scanDoc('==🔴hi=='), 5, 5, 'highlight', 'red'))).toBe('hi')
+    expect(apply('==hi==', toggleInline(scanDoc('==hi=='), 3, 3, 'highlight'))).toBe('hi')
+  })
+  it('reaches a colored highlight from its revealed color mark', () => {
+    const doc = 'a ==🔴text== b'
+    expect(apply(doc, toggleInline(scanDoc(doc), 4, 4, 'highlight'))).toBe('a ==text== b')
+    expect(apply(doc, toggleInline(scanDoc(doc), 10, 10, 'highlight', 'red'))).toBe('a text b')
+    expect(apply(doc, toggleInline(scanDoc(doc), 2, 12, 'highlight', 'green'))).toBe('a ==🟢text== b')
+    expect(apply(doc, toggleInline(scanDoc(doc), 4, 10, 'highlight'))).toBe('a ==text== b')
+  })
-  (the four both-sides tests)
```

**VERIFY**

- [ ] `git grep -nE "highlightColors|HIGHLIGHT_COLOR|HighlightColor|md-highlight-|highlights\.css" -- Core Desktop` returns nothing.
- [ ] `formatState.test.ts`'s `'the highlight a right-click reads'` still passes unchanged: its old-spelling doc reads red at 4, 6, and 12, accent at 18, and null at 0.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-2

**TASK:** Add the paint vocabulary and the `textColor` kind: its grammar, its place in the tokenizer, and its ink.

**NOW:** No single-`=` token exists. `CONTENT_CLASS` covers the current kinds, and only `.md-highlight` reads a color.

**CHANGE**

- [ ] Add `describe('a text color')` to `highlight.test.ts` as below, and watch it fail.
- [ ] Add `PAINTS`, `Paint`, `isPaint`, `colorsOf`, and `leadingMark` to `paints.ts`, keeping the order shown: `detect.ts` builds `TEXT_COLOR` at import time, so `VARIATION_SELECTOR` stays declared above `leadingMark` and `LEADING` below it.
- [ ] Add `textColorRegex` to `detect.ts`.
- [ ] Add `Paint` to `TokenKind` and the text-color pass to `tokenizeChunk`.
- [ ] Add `textColor` to `CONTENT_CLASS`, and `.md-text-color` to `markdown-pm.css`.

**AFTER**

```Core/MarkdownPM/Engine/paints.ts diff
 import type { CellKey } from '@pommora/uix/Theme/colors'

+/** How a span wears its color: a highlight washes behind its words, a text color inks them. */
+export const PAINTS = ['highlight', 'textColor'] as const
+
+export type Paint = (typeof PAINTS)[number]
+
+export const isPaint = (kind: string): kind is Paint => (PAINTS as readonly string[]).includes(kind)
+
 export const PAINT_COLORS = { … unchanged … }
 …
+/** The colors a paint takes: black and white only wash, since on the dark theme one inks too dim to read and the other inks as plain text. */
+export const colorsOf = (paint: Paint): PaintColor[] =>
+  paint === 'highlight'
+    ? PAINT_COLOR_NAMES
+    : PAINT_COLOR_NAMES.filter((color) => color !== 'black' && color !== 'white')
 …
 const VARIATION_SELECTOR = '️'
 const MARK_WIDTH = 4
-const MARK = `(?:${[...COLOR_OF.keys()].join('|')})${VARIATION_SELECTOR}?`
-// A mark joined into a longer emoji (`❤️‍🔥`) belongs to that emoji.
-const LEADING = new RegExp(`^${MARK}(?![${VARIATION_SELECTOR}‍])`, 'u')
+/** The mark that opens a span of `paint`, as a regex source: one joined into a longer emoji (`❤️‍🔥`) belongs to that emoji. */
+export const leadingMark = (paint: Paint): string =>
+  `(?:${colorsOf(paint).flatMap((color) => PAINT_COLORS[color].marks).join('|')})${VARIATION_SELECTOR}?(?![${VARIATION_SELECTOR}‍])`
+
+const LEADING = new RegExp(`^${leadingMark('highlight')}`, 'u')
```

```Core/MarkdownPM/Engine/detect.ts diff
+import { leadingMark } from './paints'
 …
 export const highlightRegex = (): RegExp => /(?<!=)==(?!=)((?:[^=\n]|=(?!=))+)==(?!=)/dg
+/** A lone `=` opens a text color only on a color mark, since a bare `=…=` is prose; its words hold no `=`, which would close it. */
+const TEXT_COLOR = `(?<!=)=(${leadingMark('textColor')}[^=\\n]+)=(?!=)`
+export const textColorRegex = (): RegExp => new RegExp(TEXT_COLOR, 'dgu')
```

```Core/MarkdownPM/Engine/tokens.ts diff
@@ imports @@
   highlightRegex,
+  textColorRegex,
@@
-import { markAfter, type PaintColor } from './paints'
+import { markAfter, type Paint, type PaintColor } from './paints'
@@ TokenKind @@
   | 'inlineCode'
-  | 'highlight'
+  | Paint
   | 'blockLatex'
@@ tokenizeChunk @@
-  const highlights = matches({
-    kind: 'highlight',
-    re: highlightRegex(),
-    open: 2,
-    close: 2,
-  })
-    .filter(notOverlapping([...code, ...links]))
-    .map((tk) => foldColor(text, tk))
+  const painted = (spec: RegexSpec): Token[] => matches(spec).map((tk) => foldColor(text, tk))
+  const highlights = painted({ kind: 'highlight', re: highlightRegex(), open: 2, close: 2 }).filter(
+    notOverlapping([...code, ...links]),
+  )
+  // A span wears one color, so a text color inside a highlight stays that highlight's words.
+  const inks = painted({ kind: 'textColor', re: textColorRegex(), open: 1, close: 1 }).filter(
+    notOverlapping([...code, ...links, ...highlights]),
+  )
 …
-  tokens.push(...links, ...code, ...cites, ...highlights, ...blockTex, ...inlineTex)
+  tokens.push(...links, ...code, ...cites, ...highlights, ...inks, ...blockTex, ...inlineTex)
```

```Core/MarkdownPM/Engine/intents.ts diff
   highlight: 'md-highlight',
+  textColor: 'md-text-color',
   inlineLatex: 'md-latex',
```

```Core/MarkdownPM/markdown-pm.css diff
   margin-inline: calc(-1 * var(--highlight-bleed));
 }
+.md-text-color {
+  color: var(--paint);
+}
 .md-code {
```

```Core/MarkdownPM/Engine/highlight.test.ts diff
+const inked = (text: string) =>
+  tokenize(text)
+    .filter((tk) => tk.kind === 'textColor')
+    .map((tk) => ({ content: text.slice(...tk.contentRange), color: tk.color }))
+
+describe('a text color', () => {
+  it('reads a color mark right after a lone = as its color, up to the next =', () => {
+    expect(inked('a =🔴two words= b')).toEqual([{ content: 'two words', color: 'red' }])
+    const text = '=🟢go='
+    expect(tokenize(text)[0].markerRanges.map((r) => text.slice(...r))).toEqual(['=🟢', '='])
+  })
+  it('reads every shape of a color text takes', () => {
+    expect(inked('=🟥x= =❤️y= =🔷z=')).toEqual([
+      { content: 'x', color: 'red' },
+      { content: 'y', color: 'red' },
+      { content: 'z', color: 'blue' },
+    ])
+  })
+  it('needs a color mark and words, so a bare = pair stays prose', () => {
+    for (const text of ['=words=', 'a=b=c', 'x=1 and y=2', '=🔴=', '= 🔴x='])
+      expect(inked(text)).toEqual([])
+  })
+  it('leaves black and white to highlights', () => {
+    expect(inked('=⚫x= =⬜y=')).toEqual([])
+  })
+  it('stays apart from == and longer runs', () => {
+    expect(inked('==🔴x==')).toEqual([])
+    expect(inked('===🔴x===')).toEqual([])
+    expect(inked('=🔴x==')).toEqual([])
+  })
+  it('leaves a mark joined into a longer emoji to that emoji', () => {
+    expect(inked('=❤️‍🔥 x=')).toEqual([])
+  })
+  it('stays a highlight’s words inside a highlight', () => {
+    expect(inked('==a =🔴b= c==')).toEqual([])
+    expect(colored('==a =🔴b= c==')).toEqual([{ content: 'a =🔴b= c', color: undefined }])
+  })
+  it('is literal text inside a code span', () => {
+    expect(inked('`=🔴x=`')).toEqual([])
+  })
+})
```

**VERIFY**

- [ ] `git grep -n "| 'highlight'" -- Core/MarkdownPM/Engine/tokens.ts` returns nothing. `TokenKind` names the paints only through `Paint`.
- [ ] Run the gates. The accent `highlight.test.ts` describe and `tokens.test.ts` stay green unchanged.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-3

**TASK:** Write text color, and make every color pick act on the one paint a span wears.

**NOW:**
- `toggleInline` finds a covering token of the same kind, or applies bold and italic's `SWAPS`.
- `editFor` routes `highlight:<color>` only.

**CHANGE**

- [ ] Add `describe('text colors')` to `format.test.ts` as below, and watch it fail.
- [ ] Add `textColor: '='` to `WRAP`.
- [ ] Let either paint answer a paint format wherever the selection sits in it.
- [ ] Refuse a text color over words holding an `=`.
- [ ] Route both paints' actions through one `editFor` case.

**AFTER**

```Core/MarkdownPM/Input/format.ts diff
@@ imports @@
-import { type PaintColor, writtenMark } from '../Engine/paints'
+import { isPaint, type PaintColor, writtenMark } from '../Engine/paints'
@@ WRAP @@
   highlight: '==',
+  textColor: '=',
   inlineCode: '`',
@@ toggleInline @@
-/** A highlight's `color` is null for the accent; one already highlighted in another color is recolored rather than removed. */
+/** A paint's `color` is null for the accent highlight. A span wears one color, so a paint picked anywhere in it recolors it, turns it into the other paint, or, in its own paint and color, removes it. */
 export function toggleInline( … ) {
   …
   const found =
-    covering.find((tk) => tk.kind === kind) ??
+    covering.find((tk) => tk.kind === kind || (isPaint(kind) && isPaint(tk.kind))) ??
     covering.find( … SWAPS rule unchanged … )
+  if (kind === 'textColor' && (found ? line.slice(...found.contentRange) : doc.slice(from, to)).includes('='))
+    return null
   if (found) {
@@ editFor @@
-    case 'highlight':
-      return toggleInline(scan, from, to, 'highlight', value as PaintColor)
+    case 'highlight':
+    case 'textColor':
+      return toggleInline(scan, from, to, group, value as PaintColor)
```

```Core/MarkdownPM/Input/format.test.ts diff
+describe('text colors', () => {
+  it('wraps with the written circle after a lone =, caret after the content', () => {
+    const e = toggleInline(scanDoc('hi'), 0, 2, 'textColor', 'red')
+    expect(apply('hi', e)).toBe('=🔴hi=')
+    expect(e?.selection).toBe(5)
+  })
+  it('wraps a bare caret, which reads as a text color once words follow its mark', () => {
+    const e = toggleInline(scanDoc('a  b'), 2, 2, 'textColor', 'red')!
+    expect(apply('a  b', e)).toBe('a =🔴= b')
+    expect(e.selection).toBe(5)
+  })
+  it('turns a highlight into a text color and back, the span keeping one color', () => {
+    expect(apply('==🔴hi==', toggleInline(scanDoc('==🔴hi=='), 5, 5, 'textColor', 'blue'))).toBe('=🔵hi=')
+    expect(apply('==hi==', toggleInline(scanDoc('==hi=='), 3, 3, 'textColor', 'red'))).toBe('=🔴hi=')
+    expect(apply('=🔴hi=', toggleInline(scanDoc('=🔴hi='), 4, 4, 'highlight', 'green'))).toBe('==🟢hi==')
+    expect(apply('=🔴hi=', toggleInline(scanDoc('=🔴hi='), 4, 4, 'highlight', 'red'))).toBe('==🔴hi==')
+    expect(apply('=🔴hi=', toggleInline(scanDoc('=🔴hi='), 4, 4, 'highlight'))).toBe('==hi==')
+  })
+  it('recolors a text color, and removes one already in the picked color', () => {
+    expect(apply('=🔵hi=', toggleInline(scanDoc('=🔵hi='), 4, 4, 'textColor', 'green'))).toBe('=🟢hi=')
+    expect(apply('=🔵hi=', toggleInline(scanDoc('=🔵hi='), 4, 4, 'textColor', 'blue'))).toBe('hi')
+  })
+  it('acts on the whole span from a selection inside it or a caret on its revealed mark', () => {
+    const doc = 'a ==🔴two words== b'
+    expect(apply(doc, toggleInline(scanDoc(doc), 6, 9, 'textColor', 'blue'))).toBe('a =🔵two words= b')
+    expect(apply('a =🔴x= b', toggleInline(scanDoc('a =🔴x= b'), 3, 3, 'textColor', 'red'))).toBe('a x b')
+  })
+  it('refuses words holding an =, which would close the text color early', () => {
+    expect(toggleInline(scanDoc('x=1'), 0, 3, 'textColor', 'red')).toBeNull()
+    expect(toggleInline(scanDoc('==a=b=='), 3, 3, 'textColor', 'red')).toBeNull()
+  })
+  it('routes each paint’s menu action', () => {
+    expect(apply('hi', editFor('textColor:red', scanDoc('hi'), 0, 2))).toBe('=🔴hi=')
+    expect(apply('hi', editFor('highlight:red', scanDoc('hi'), 0, 2))).toBe('==🔴hi==')
+  })
+})
```

**VERIFY**

- [ ] The bold and italic swap tests and every `describe('highlight colors')` test pass unchanged.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-4

**TASK:** Let Enter and Shift+Enter step past a text color's closing `=`, read from its token. Parity can't read it, since `=` is everyday prose.

**NOW:**
- `closerEndAt` finds closers by parity over `CLOSERS`, which has no single `=`.
- A fresh Text Color wrap leaves the caret right before its closer, where Enter would split the span.

**CHANGE**

- [ ] Add the test below to `edits.test.ts`, and watch it fail.
- [ ] Add `textColorEndAt`, call it from `closerEndAt` only when a lone `=` is ahead, and restore the `tokenize` import.

**AFTER**

```Core/MarkdownPM/Input/edits.ts diff
+import { tokenize } from '../Engine/tokens'
@@ closerEndAt @@
 function closerEndAt(scan: DocScan, caret: number): number | null {
   if (inCodeAt(scan, caret)) return null
   const doc = scan.text
+  if (doc[caret] === '=' && doc[caret + 1] !== '=') return textColorEndAt(doc, caret)
   const before = doc.slice(lineStartAt(doc, caret), caret)
@@ after closerEndAt @@
+/** Where the text color whose words end at `caret` ends, past its closing `=`: a lone `=` is too often prose for parity to read. */
+function textColorEndAt(doc: string, caret: number): number | null {
+  const ls = lineStartAt(doc, caret)
+  const tk = tokenize(doc.slice(ls, lineEndAt(doc, caret))).find(
+    (tk) => tk.kind === 'textColor' && tk.contentRange[1] === caret - ls,
+  )
+  return tk ? ls + tk.range[1] : null
+}
```

```Core/MarkdownPM/Input/edits.test.ts diff
+describe('Enter past a text color', () => {
+  it('steps past its closing =, read from its token, and leaves a prose = alone', () => {
+    expect(closeConstructOnEnter(scanDoc('=🔴hi='), 5, 5)!.selection).toBe(6)
+    expect(closeConstructOnShiftEnter(scanDoc('=🔴hi='), 5, 5)).not.toBeNull()
+    expect(closeConstructOnEnter(scanDoc('x = 1, y = 2'), 9, 9)).toBeNull()
+    expect(closeConstructOnEnter(scanDoc('a=b'), 1, 1)).toBeNull()
+    expect(closeConstructOnEnter(scanDoc('=🔴='), 3, 3)).toBeNull()
+  })
+})
```

**VERIFY**

- [ ] The parity tests for `**`, `==`, and `~~` pass unchanged.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Accent highlights behave exactly as at the baseline, shown by every untouched highlight, pairing, and Enter test.
- [ ] One registry, one fold, one write rule, and one var serve both paints. Nothing treats the paints differently except their marker width, `colorsOf` (black and white), the bare `==` accent, and the `=` refusal.
- [ ] `textColorRegex` admits no bare `=…=`, no black or white, and nothing inside `==` or `===`.
- [ ] Phases 1–2 are committed on `active`.

---

### Phase 3 — The Menus

**GOAL:** One request field and one rows builder carry both paints across the host boundary: Format ▸ gains Text Color ▸ above Highlight ▸, and Change Color ▸ appears over either paint with its own rows.

#### Task 3-1

**TASK:** Replace the `highlight` request field with `painted`, build both submenus and Change Color from `colorRows`, and let a resting cell enter at a Text Color slot.

**NOW:**
- The request carries `highlight: 'accent' | color | null`.
- `highlightRows` builds Highlight ▸ and Change Color ▸.
- `cellStatic.tsx:476` matches `/^(format|highlight):/`.

**CHANGE**

- [ ] Rewrite the tests below, and watch them fail.
- [ ] Rewrite `readFormatState`'s mark reads around one `covers`.
- [ ] Rewrite the schema, `EditorMenuAction`, `colorRows`, `changeColorItems`, and the Format submenu.
- [ ] Derive `cellStatic`'s slot check from `isPaint`.
- [ ] Update both fixtures (`Core/Actions/editorMenu.test.ts:12` and `Desktop/Actions/editorMenu.test.ts:31`) to `painted: null`.

**AFTER**

```Core/MarkdownPM/Input/formatState.ts diff
-import { tokenize, wrappedSpan } from '../Engine/tokens'
+import { type Token, type TokenOf, tokenize, wrappedSpan } from '../Engine/tokens'
+import { isPaint, type Paint } from '../Engine/paints'
 …
-  const wrapping = (kind: string) =>
-    tokens.find((tk) => {
-      const [s, e] = wrappedSpan(tk)
-      return tk.kind === kind && s <= f && t <= e
-    })
-  const wraps = (kind: string): boolean => wrapping(kind) !== undefined
-  const highlight = wrapping('highlight')
+  const covers = (tk: Token): boolean => {
+    const [s, e] = wrappedSpan(tk)
+    return s <= f && t <= e
+  }
+  const wraps = (kind: string): boolean => tokens.some((tk) => tk.kind === kind && covers(tk))
+  const painted = tokens.find((tk): tk is TokenOf<Paint> => isPaint(tk.kind) && covers(tk))
 …
-    highlight: highlight ? (highlight.color ?? 'accent') : null,
+    painted: painted ? { paint: painted.kind, color: painted.color ?? 'accent' } : null,
```

```Core/Actions/editorMenu.ts diff
@@ imports @@
-import type { ActionItem, LeafItem } from './menuModel'
+import { type ActionItem, joinGroups, type LeafItem } from './menuModel'
-import { PAINT_COLOR_NAMES, type PaintColor } from '../MarkdownPM/Engine/paints'
+import { colorsOf, PAINT_COLOR_NAMES, PAINTS, type Paint, type PaintColor } from '../MarkdownPM/Engine/paints'
@@ editorMenuRequest @@
   strikethrough: z.boolean(),
-  highlight: z
-    .enum(['accent', ...PAINT_COLOR_NAMES] as ['accent', ...PaintColor[]])
-    .nullable(),
+  painted: z
+    .object({
+      paint: z.enum(PAINTS),
+      color: z.enum(['accent', ...PAINT_COLOR_NAMES] as ['accent', ...PaintColor[]]),
+    })
+    .nullable(),
   inlineCode: z.boolean(),
@@ EditorMenuAction @@
-  | `highlight:${PaintColor}`
+  | `${Paint}:${PaintColor}`
@@ highlightRows → colorRows @@
-/** The accent is the bare `==`, so it carries the highlight chord; a checked row clicked again removes the highlight. */
-function highlightRows(s: EditorMenuRequest, commands: Commands): LeafItem<EditorMenuAction>[] { … }
+/** Each paint's rows, and Change Color's: only a highlight has the accent, the bare `==` on its chord, set apart above the colors. */
+function colorRows(
+  paint: Paint,
+  s: EditorMenuRequest,
+  commands: Commands,
+): ActionItem<EditorMenuAction>[] {
+  const checked = (color: 'accent' | PaintColor): boolean =>
+    s.painted?.paint === paint && s.painted.color === color
+  const accent: LeafItem<EditorMenuAction>[] =
+    paint === 'highlight'
+      ? [
+          {
+            label: 'Accent',
+            action: 'format:highlight',
+            checked: checked('accent'),
+            chord: commands['format:highlight'],
+          },
+        ]
+      : []
+  return joinGroups([
+    accent,
+    colorsOf(paint).map(
+      (color): LeafItem<EditorMenuAction> => ({
+        label: capitalize(color),
+        action: `${paint}:${color}`,
+        checked: checked(color),
+      }),
+    ),
+  ])
+}
@@ changeColorItems @@
-/** Offered only over a highlight, seated with the edit items rather than in the formatting block. */
+/** Offered over a painted span, with its own paint's rows, seated with the edit items rather than in the formatting block. */
 export function changeColorItems( … ) {
-  return s.highlight ? [{ label: 'Change Color', submenu: highlightRows(s, commands) }] : []
+  return s.painted
+    ? [{ label: 'Change Color', submenu: colorRows(s.painted.paint, s, commands) }]
+    : []
 }
@@ editorContextItems → format @@
       ...formatRows(MARK_ROWS),
-      { label: 'Highlight', submenu: highlightRows(s, commands) },
+      { label: 'Text Color', submenu: colorRows('textColor', s, commands) },
+      { label: 'Highlight', submenu: colorRows('highlight', s, commands) },
       ...formatRows(LINK_ROWS),
```

```Core/MarkdownPM/Tables/cellStatic.tsx diff
+import { isPaint } from '../Engine/paints'
 …
-    const slot = /^(format|highlight):/.test(action) && (from === to || action === 'format:link')
+    const [group] = action.split(':')
+    const slot = (group === 'format' || isPaint(group)) && (from === to || action === 'format:link')
```

```Core/MarkdownPM/Input/formatState.test.ts diff
-describe('the highlight a right-click reads', () => { … })
+describe('the paint a right-click reads', () => {
+  it('names a highlight’s color, the accent for a bare one, and none outside', () => {
+    const doc = 'a ==🔴warm== ==plain== b'
+    const painted = (at: number) => readFormatState(scanDoc(doc), at, at).painted
+    expect(painted(6)).toEqual({ paint: 'highlight', color: 'red' })
+    expect(painted(4)).toEqual({ paint: 'highlight', color: 'red' })
+    expect(painted(10)).toEqual({ paint: 'highlight', color: 'red' })
+    expect(painted(16)).toEqual({ paint: 'highlight', color: 'accent' })
+    expect(painted(0)).toBeNull()
+  })
+  it('names a text color’s, from its mark through its words', () => {
+    const doc = 'a =🔴warm= b'
+    expect(readFormatState(scanDoc(doc), 3, 3).painted).toEqual({ paint: 'textColor', color: 'red' })
+    expect(readFormatState(scanDoc(doc), 5, 9).painted).toEqual({ paint: 'textColor', color: 'red' })
+  })
+})
```

```Core/Actions/editorMenu.test.ts diff
@@ fixture @@
-  highlight: null,
+  painted: null,
@@ describe('the highlight rows') → describe('the color rows') @@
+  const rowsOf = (label: string, s: EditorMenuRequest) =>
+    editorContextItems(s, DEFAULT_COMMANDS, '')
+      .find((i) => i.label === 'Format')
+      ?.submenu?.find((r) => r.label === label)?.submenu ?? []
+  const highlight = (s: EditorMenuRequest) => rowsOf('Highlight', s)
+  const textColor = (s: EditorMenuRequest) => rowsOf('Text Color', s)
+  const lit = { ...state, painted: { paint: 'highlight', color: 'red' } } as const
+  const inked = { ...state, painted: { paint: 'textColor', color: 'green' } } as const
+
+  it('seat Text Color above Highlight in Format', () => {
+    expect(branch('Format').map((r) => r.label)).toEqual([
+      'Italic', 'Inline Code', 'Bold', 'Strikethrough', 'Text Color', 'Highlight', 'Connection', 'External Link',
+    ])
+  })
   it('lead with the accent on the highlight chord, the colors set apart under it', () => { … unchanged … })
+  it('give Text Color the colors text takes, with no accent, chord, or divider', () => {
+    const rows = textColor(state)
+    expect(rows.map((r) => r.label)).toEqual(['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Brown'])
+    expect(rows[0]).toMatchObject({ action: 'textColor:red' })
+    expect(rows.some((r) => 'chord' in r || r.separatorBefore)).toBe(false)
+  })
~  it('check the color the caret sits in, under its own paint alone', () => {
~    expect(highlight({ ...state, painted: { paint: 'highlight', color: 'accent' } }).find((r) => r.checked)?.label).toBe('Accent')
~    expect(highlight(lit).find((r) => r.checked)?.label).toBe('Red')
+    expect(textColor(inked).find((r) => r.checked)?.label).toBe('Green')
+    expect(highlight(inked).filter((r) => r.checked)).toEqual([])
   })
~  it('offer Change Color over a painted span, with its own paint’s rows', () => {
     expect(changeColorItems(state, DEFAULT_COMMANDS)).toEqual([])
~    const [row] = changeColorItems(lit, DEFAULT_COMMANDS)
     expect(row.label).toBe('Change Color')
~    expect(row.submenu).toEqual(highlight(lit))
+    expect(changeColorItems(inked, DEFAULT_COMMANDS)[0].submenu).toEqual(textColor(inked))
   })
```

```Desktop/Actions/editorMenu.test.ts diff
@@ fixture @@
-  highlight: null,
+  painted: null,
@@ it('seats Change Color under Select All…') @@
-    const asked = askEditorMenu({ ...req(10, 10), highlight: 'accent' })
+    const asked = askEditorMenu({ ...req(10, 10), painted: { paint: 'highlight', color: 'accent' } })
```

```Core/MarkdownPM/Tables/cellRestingMenu.test.tsx diff
@@ describe('a row chosen at rest') @@
+  it('enters the cell with the caret in the slot Text Color writes at a point', async () => {
+    await mount('ab cd')
+    await rightClick('ab cd', 3)
+    await choose('textColor:red')
+    expect(committed).toHaveBeenLastCalledWith(1, 0, 'ab =🔴=cd')
+    expect(liveCell()?.state.selection.main.head).toBe(6)
+  })
```

**VERIFY**

- [ ] `git grep -nE "highlightRows|highlight: (null|'accent'|z\.)" -- Core Desktop` returns nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.
- [ ] **Nathan's Pommora Visual Pass:**
  - [ ] **Setup:** Restart the dev process, because main doesn't hot-reload the schema (`env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`). Open a scratch page in `~/Test` seeded with one line per color, both spellings.
  - [ ] **Nathan's Checks:**
    - Apply each Text Color and Highlight from Format ▸ and from Change Color ▸.
    - Convert a span between the two paints.
    - Judge how the seven inks and nine washes read.
  - [ ] **Cleanup:** Remove the scratch page and stop the dev process by exact PID.

#### Review Checkpoint

- [ ] `painted` is the only paint field crossing the boundary; main's `safeParse` accepts both paints and rejects `{ paint: 'textColor', color: 'pink' }`.
- [ ] Text Color ▸ and Change Color ▸ over text color list seven rows. Highlight ▸ lists Accent, a divider, then nine rows.
- [ ] Nathan's visual pass is signed off. Phase 3 is committed.

---

### Phase 4 — Sapphire `[Parallel with Phases 1–3]`

**GOAL:** Obsidian reads every color Pommora writes:
- Highlights take every color and shape through Obsidian's own parse, hide, reveal, and CSS.
- Text color paints in Live Preview, Source mode, and Reading view, with its markers hiding as a highlight's do.

It runs in `~/The Studio/Projects/Sapphire` against Pommora's settled grammar, not its code.

#### Task 4-1

**TASK:** Add `colorMarks.ts` with the ported table, `markAt`, and `textColorRuns`, matching Pommora's grammar exactly: no backslash exclusion, black and white wash only, joined emoji refused.

**NOW:** Sapphire has no color-mark code. `codeFences.ts:1` is the precedent for a ported table.

**CHANGE**

- [ ] Write `tests/markdown/colorMarks.test.ts`'s reader and scanner tests, and watch them fail.
- [ ] Write the module head below.

**AFTER**

```src/markdown/colorMarks.ts diff
+// Pommora's colors, ported from its MarkdownPM so a note colors alike in both: a color emoji right after `==` colors a highlight, and one right after a lone `=` colors the words up to the next `=`. Every shape of a color reads the same, and black and white only highlight.
+
+const MARKS = {
+  red: ["🔴", "🟥", "❤"],
+  orange: ["🟠", "🟧", "🔶", "🔸", "🧡"],
+  yellow: ["🟡", "🟨", "💛"],
+  green: ["🟢", "🟩", "💚"],
+  blue: ["🔵", "🟦", "🔷", "🔹", "💙"],
+  purple: ["🟣", "🟪", "💜"],
+  brown: ["🟤", "🟫", "🤎"],
+  black: ["⚫", "⬛", "🖤"],
+  white: ["⚪", "⬜", "🤍"],
+} as const;
+
+type Color = keyof typeof MARKS;
+
+const COLORS = Object.keys(MARKS) as Color[];
+const INKS = COLORS.filter((c) => c !== "black" && c !== "white");
+const COLOR_OF = new Map<string, Color>(COLORS.flatMap((c) => MARKS[c].map((m) => [m, c] as const)));
+
+// A mark is at most a surrogate pair and its variation selector; one joined into a longer emoji (`❤️‍🔥`) belongs to that emoji.
+const VS = "\uFE0F";
+const markOf = (colors: readonly Color[]): string => `(?:${colors.flatMap((c) => MARKS[c]).join("|")})${VS}?(?![${VS}\u200D])`;
+const LEADING = new RegExp(`^${markOf(COLORS)}`, "u");
+const RUN = new RegExp(`(?<!=)=(${markOf(INKS)})([^=\\n]+)=(?!=)`, "gu");
+
+export function markAt(text: string, at: number): { color: Color; length: number } | null {
+  const m = LEADING.exec(text.slice(at, at + 4));
+  return m && { color: COLOR_OF.get(m[0].replace(VS, ""))!, length: m[0].length };
+}
+
+export interface TextColorRun {
+  from: number;
+  open: number;
+  close: number;
+  to: number;
+  color: Color;
+}
+
+export function textColorRuns(text: string, skip: (at: number) => boolean = () => false): TextColorRun[] {
+  const runs: TextColorRun[] = [];
+  for (const m of text.matchAll(RUN)) {
+    if (skip(m.index)) continue;
+    const to = m.index + m[0].length;
+    runs.push({ from: m.index, open: m.index + 1 + m[1].length, close: to - 1, to, color: COLOR_OF.get(m[1].replace(VS, ""))! });
+  }
+  return runs;
+}
```

Tests (node:test, `assert.deepEqual`):
- **`markAt`:**
  - every shape of red, orange, and blue, ± U+FE0F, gives its color and length.
  - `❤️‍🔥` and `🐈` give null.
  - an offset into a string reads there.
- **`textColorRuns`:**
  - `a =🔴b= c` gives one run `{from 2, open 5, close 6, to 7, color red}`.
  - `==🔴b==`, `=b=`, `a=b=c`, `=⚫b=`, and `=🔴=` give none.
  - two runs on one line give two.
  - a U+FFFC inside a run keeps it whole.
  - `skip` returning true at the opener drops the run.

**VERIFY**

- [ ] `npm test` and `npx tsc -noEmit -skipLibCheck` pass. Each later task brings its own imports.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-2

**TASK:** Extend Obsidian's highlight parse to Pommora's other marks with a token wrap. Native sets `state.highlightColor` only from its six two-unit keys (`markdown.js` 699-705), and its style builder turns that state into `highlight-<color>` (417-420).

**NOW:** A `==🟤x==`, `==🔶x==`, or `==❤️x==` reads as a plain `cm-highlight` with the emoji shown.

**CHANGE**

- [ ] Add wrap tests through a fake plugin of the test's own: unlike `ignoreHtml.test.ts`'s, it collects every editor extension into an array and stubs `registerMarkdownPostProcessor`, since `installColorMarks` registers three things by Task 4-4. Write a fake markdown mode that emulates native's `==` branch: six circles and squares, the `pos += 2` advance, and a builder that appends `highlight-<color>` to every token while `state.highlightColor` is set, which the `["x", "highlight highlight-brown"]` expectation depends on. Watch the tests fail.
- [ ] Add `wrapHighlights` below, with `installColorMarks` holding only its `wrapMarkdownToken` line so the tests install through it; Task 4-4 completes the install.

**AFTER**

```src/markdown/colorMarks.ts diff
+import type { Plugin } from "obsidian";
+import { wrapMarkdownToken, type Token } from "./markdownMode.ts";
 …
+type HighlightState = { highlight?: boolean; highlightColor?: string };
+
+// Native colors a highlight from its own six circles and squares; the rest of Pommora's marks join the opening `==` the same way, and the style builder carries the color on as `highlight-<color>`.
+function wrapHighlights(native: Token<HighlightState>): Token<HighlightState> {
+  return (stream, state) => {
+    const was = state.highlight;
+    const style = native(stream, state);
+    if (was || !state.highlight || state.highlightColor) return style;
+    const mark = markAt(stream.string, stream.pos);
+    if (!mark) return style;
+    stream.pos += mark.length;
+    state.highlightColor = mark.color;
+    return `${style} highlight-${mark.color}`;
+  };
+}
+
+export function installColorMarks(plugin: Plugin): void {
+  wrapMarkdownToken(plugin, "color-highlights", wrapHighlights);
+}
```

Tests:
- `==🟤x==` gives `["==🟤", "… highlight highlight-brown"]` and then `["x", "highlight highlight-brown"]`.
- `==🔶x==` carries `highlight-orange`.
- `==❤️x==` carries `highlight-red` and swallows both units.
- Native `==🔴x==` comes out unchanged.
- `==x==` stays uncolored.

**VERIFY**

- [ ] `npm test` and `npx tsc -noEmit -skipLibCheck` pass.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-3

**TASK:** Paint text color in the editor with a ViewPlugin, following the `headingLinks.ts` precedent: ink in both modes, with the markers replaced in Live Preview unless a focused selection touches the run, as native does for highlights.

**NOW:** `=🔴x=` reads as plain text in every mode.

**CHANGE**

- [ ] Add `TextColors` below, and register it in `installColorMarks`. Live Preview gating has no unit seam in the test mock (`editorLivePreviewField` is `{}`), so Task 4-5's live check proves it, along with `verbatim`'s premise that a lone `=` inside a native highlight resolves to a tree node named with `highlight`. If that probe fails, read the highlight from the token's own style rather than matching the line's text.

**AFTER**

```src/markdown/colorMarks.ts diff
-import type { Plugin } from "obsidian";
+import { editorLivePreviewField, type Plugin } from "obsidian";
+import { syntaxTree } from "@codemirror/language";
+import { type EditorState, RangeSetBuilder } from "@codemirror/state";
+import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
+import { codeContext } from "./code/codeBlocks.ts";
+import { inLinkSyntax } from "./headingLinks.ts";
 …
+const HIDE = Decoration.replace({});
+const INK = Object.fromEntries(INKS.map((c) => [c, Decoration.mark({ class: `sapphire-ink-${c}` })])) as Record<Color, Decoration>;
+
+const livePreview = (state: EditorState): boolean => state.field(editorLivePreviewField, false) === true;
+
+// Scanned on doc, viewport, or parse change; a selection, focus, or mode change only rebuilds.
+class TextColors {
+  decorations: DecorationSet = Decoration.none;
+  private runs: TextColorRun[] = [];
+
+  constructor(view: EditorView) {
+    this.scan(view);
+    this.decorations = this.build(view);
+  }
+
+  update(u: ViewUpdate): void {
+    const rescan = u.docChanged || u.viewportChanged || syntaxTree(u.startState) !== syntaxTree(u.state);
+    if (rescan) this.scan(u.view);
+    if (rescan || u.selectionSet || u.focusChanged || livePreview(u.startState) !== livePreview(u.state)) this.decorations = this.build(u.view);
+  }
+
+  // A span wears one color, so a run inside a highlight stays that highlight's words; a long line split across visible ranges is read once.
+  private scan(view: EditorView): void {
+    const isCode = codeContext(view.state);
+    const tree = syntaxTree(view.state);
+    const verbatim = (pos: number): boolean => isCode(pos) || /highlight/.test(tree.resolveInner(pos, 1).type.name);
+    this.runs = [];
+    let next = 0;
+    for (const { from, to } of view.visibleRanges) {
+      for (let pos = Math.max(from, next); pos <= to; pos = next) {
+        const line = view.state.doc.lineAt(pos);
+        for (const r of textColorRuns(line.text, (i) => verbatim(line.from + i) || inLinkSyntax(line.text, i)))
+          this.runs.push({ ...r, from: line.from + r.from, open: line.from + r.open, close: line.from + r.close, to: line.from + r.to });
+        next = line.to + 1;
+      }
+    }
+  }
+
+  private build(view: EditorView): DecorationSet {
+    const live = livePreview(view.state);
+    const ranges = view.hasFocus ? view.state.selection.ranges : [];
+    const marks = new RangeSetBuilder<Decoration>();
+    for (const r of this.runs) {
+      const hide = live && !ranges.some((s) => s.from <= r.to && s.to >= r.from);
+      if (hide) marks.add(r.from, r.open, HIDE);
+      marks.add(r.open, r.close, INK[r.color]);
+      if (hide) marks.add(r.close, r.to, HIDE);
+    }
+    return marks.finish();
+  }
+}
+
+const textColors = ViewPlugin.fromClass(TextColors, { decorations: (v) => v.decorations });
 …
 export function installColorMarks(plugin: Plugin): void {
   wrapMarkdownToken(plugin, "color-highlights", wrapHighlights);
+  plugin.registerEditorExtension(textColors);
 }
```

**VERIFY**

- [ ] `npx tsc -noEmit -skipLibCheck` passes.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-4

**TASK:** Paint both in Reading view with one post-processor, and install all three pieces:
- Set `data-highlight` on a native `<mark>` Obsidian left uncolored, and drop its leading mark.
- Wrap each text color's words in `sapphire-ink-<color>`, reading a run across inline children (bold, italic) one parent at a time.

**NOW:**
- Remark renders an unknown mark as `<mark>` with an empty or missing `data-highlight` and the emoji in its text.
- `=🔴x=` renders as text.

**CHANGE**

- [ ] Add the Reading-view pass below, and complete `installColorMarks` with its post-processor.
- [ ] Call `installColorMarks(this)` in `src/main.ts` directly after `installHeadingLinks(this, this.store)`.

**AFTER**

```src/markdown/colorMarks.ts diff
+// Native colors a rendered highlight from its own six circles and squares, so the rest are read here.
+function readMarkColor(mark: HTMLElement): void {
+  const first = mark.firstChild;
+  if (mark.dataset.highlight || first?.nodeType !== Node.TEXT_NODE) return;
+  const text = first as Text;
+  const found = markAt(text.data, 0);
+  if (!found) return;
+  text.deleteData(0, found.length);
+  mark.dataset.highlight = found.color;
+}
+
+// A run reads within one element's own text, each inline child standing in as one character; code, math, link, and highlighted text stay as written, since a span wears one color.
+const VERBATIM = "a, code, pre, .math, mark";
+
+function paintTextColors(el: HTMLElement): void {
+  const parents = new Set<Element>();
+  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
+  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
+    const parent = n.parentElement;
+    if (parent && (n as Text).data.includes("=") && !parent.closest(VERBATIM)) parents.add(parent);
+  }
+  for (const parent of parents) paintRuns(parent);
+}
+
+function paintRuns(parent: Element): void {
+  const isText = (n: Node): n is Text => n.nodeType === Node.TEXT_NODE;
+  const flat = Array.from(parent.childNodes, (n) => (isText(n) ? n.data : "\uFFFC")).join("");
+  const point = (at: number): [Node, number] => {
+    let start = 0;
+    for (const [i, n] of Array.from(parent.childNodes).entries()) {
+      const end = start + (isText(n) ? n.data.length : 1);
+      if (at < end || (at === end && isText(n))) return isText(n) ? [n, at - start] : [parent, i];
+      start = end;
+    }
+    return [parent, parent.childNodes.length];
+  };
+  const doc = parent.ownerDocument;
+  const span = (from: number, to: number): Range => {
+    const r = doc.createRange();
+    r.setStart(...point(from));
+    r.setEnd(...point(to));
+    return r;
+  };
+  for (const run of textColorRuns(flat).reverse()) {
+    const [opener, words, closer] = [span(run.from, run.open), span(run.open, run.close), span(run.close, run.to)];
+    closer.deleteContents();
+    const ink = doc.createElement("span");
+    ink.className = `sapphire-ink-${run.color}`;
+    ink.append(words.extractContents());
+    words.insertNode(ink);
+    opener.deleteContents();
+  }
+}
+
 export function installColorMarks(plugin: Plugin): void {
   wrapMarkdownToken(plugin, "color-highlights", wrapHighlights);
   plugin.registerEditorExtension(textColors);
+  plugin.registerMarkdownPostProcessor((el) => {
+    el.querySelectorAll<HTMLElement>("mark").forEach(readMarkColor);
+    paintTextColors(el);
+  });
 }
```

The runs are applied last to first, so each run's mutations sit past every earlier run's offsets. `point` reads the live child list, and DOM ranges follow the splits.

**VERIFY**

- [ ] `npm test` and `npx tsc -noEmit -skipLibCheck` pass.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-5

**TASK:** Style the colors Obsidian lacks, then prove both views live.

**NOW:** Obsidian has `--highlight-background-<color>` and per-color rules for its six only (`app.css` 2372-2379 and 14563-14603), and no brown, black, or white.

**CHANGE**

- [ ] Append the rules below to `src/markdown/markdown.css`.
- [ ] Run the live check per `.claude/Guidelines/Live-Verification.md`'s round trip:
  1. Commit the NexusOS vault, and say in chat that Obsidian is about to quit, since Sync disconnects until the plain instance returns.
  2. Quit Obsidian and relaunch it with `open -a Obsidian --args --remote-debugging-port=9222`.
  3. `npm run build`, then reload the plugin.
  4. Create the probe note `Sapphire Color Probe.md`, holding one line per case: `==🟤brown==`, `==⚫black==`, `==⬜white==`, `==🔶orange==`, `==❤️red==`, `=🔴ink=`, `=🟤ink=`, `=🔴a **b** c=`, `==a =🔴b= c==`, `=⚫raw=`, and `` `=🔴code=` ``.
  5. Over CDP, scoped to the leaf, assert:
     - **Live Preview:** `.cm-highlight-brown`, `-black`, `-white`, `-orange`, and `-red` exist, and the emoji text is hidden away from the caret. `.sapphire-ink-red` and `.sapphire-ink-brown` cover only the words. The markers are hidden with the caret elsewhere and shown with the caret inside. `=⚫raw=` and the code span carry no ink, and no `.sapphire-ink-*` sits inside a `.cm-highlight`.
     - **Source Mode:** ink is present and markers are visible.
     - **Reading View:** each `mark[data-highlight]` names its color with no emoji left in its text, `span.sapphire-ink-red` wraps `a <strong>b</strong> c`, and `=⚫raw=` and the run inside the highlight stay text.
  6. Screenshot both views.
  7. Delete the probe note, quit, relaunch plain Obsidian, confirm Sapphire is enabled with the debug port closed, and commit the vault if the check touched it.

**AFTER**

```src/markdown/markdown.css diff
+/* Pommora's colors past native's six: brown mixes from orange, and black and white sit on the base scale, which each theme flips. */
+body {
+  --sapphire-color-brown: color-mix(in oklch, var(--color-orange) 55%, var(--color-base-70));
+}
+body.theme-dark {
+  --sapphire-color-black: var(--color-base-40);
+  --sapphire-color-white: var(--color-base-100);
+}
+body.theme-light {
+  --sapphire-color-black: var(--color-base-100);
+  --sapphire-color-white: var(--color-base-40);
+}
+.cm-s-obsidian span.cm-highlight-brown,
+.markdown-rendered mark[data-highlight="brown"] {
+  --highlight-background: color-mix(in oklch, var(--sapphire-color-brown) var(--highlight-opacity), transparent);
+}
+.cm-s-obsidian span.cm-highlight-black,
+.markdown-rendered mark[data-highlight="black"] {
+  --highlight-background: color-mix(in oklch, var(--sapphire-color-black) var(--highlight-opacity), transparent);
+}
+.cm-s-obsidian span.cm-highlight-white,
+.markdown-rendered mark[data-highlight="white"] {
+  --highlight-background: color-mix(in oklch, var(--sapphire-color-white) var(--highlight-opacity), transparent);
+}
+.sapphire-ink-red { color: var(--color-red); }
+.sapphire-ink-orange { color: var(--color-orange); }
+.sapphire-ink-yellow { color: var(--color-yellow); }
+.sapphire-ink-green { color: var(--color-green); }
+.sapphire-ink-blue { color: var(--color-blue); }
+.sapphire-ink-purple { color: var(--color-purple); }
+.sapphire-ink-brown { color: var(--sapphire-color-brown); }
```

**VERIFY**

- [ ] Every live assertion above passed, and the screenshots were read.
- [ ] The baseline instance is restored and the probe note is gone.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Sapphire's grammar matches Pommora's on Task 2-2's text-color list and Task 2-1's highlight list, except an emoji-only highlight (`==🔴==`), which Obsidian colors natively.
- [ ] No setting, schema, or settings-tab change was added: the feature is always on, as fences and `§` joins are.
- [ ] Phase 4 is committed on Sapphire's `active`.

---

### Phase 5 — Documentation

**GOAL:** Every living document in both repos describes the shipped behavior, and the drive script seeds the new spelling.

#### Task 5-1

**TASK:** Rewrite Pommora's claims surgically.

**CHANGE**

- [ ] `MarkdownPM.md:21`: add "text color" to the Inline Marks list after "highlight", and make its reach read "All of them are reachable from the context menu's Format submenu, and all but text color have a ⌘ shortcut and auto-pair as you type."
- [ ] `MarkdownPM.md:22`: replace the Highlight Colors bullet with the following.
  > - **Colors** — a highlight washes behind its words and a text color inks them, and both take a color from a color emoji right after the opener: `==🔴words==` highlights in red and `=🔴words=` colors the words red. A bare `==highlight==` paints in the accent, while a text color always names its color, since a bare `=…=` is prose. Every shape of a color reads the same (circle, square, diamond, or heart), and Pommora writes the circle. Red, orange, yellow, green, blue, purple, brown, black, and white each have one, held in `Core/MarkdownPM/Engine/paints.ts`; black and white only highlight, since on the dark theme one inks too dim to read and the other inks as plain text. A span wears one color, so a text color inside a highlight stays that highlight's words, and words holding an `=` can't take a text color, which would close at it. The emoji hides and reveals with the marker it follows, and Enter steps past either closer.
- [ ] `MarkdownPM.md:150`: replace the Change Color bullet with the following.
  > - **Change Color ▸** — Over a highlight or a text color, the same rows as its own Format submenu, seated under Select All above the Pommora items.
- [ ] `MarkdownPM.md:151`: replace the Format bullet with the following.
  > - **Format ▸** — The inline marks, plus Connection and External Link. **Text Color ▸** lists the seven colors text takes, and **Highlight ▸** below it lists Accent on the highlight chord, then all nine colors below a divider. The checked row is the span's own color; a row in another color recolors it, a row of the other submenu turns a highlight into a text color or back, and the checked row clicked again removes it.
- [ ] `MarkdownPM.md:219`: rewrite the Highlight row.
  > | Highlight | `--paint` / `--highlight` / `--highlight-bleed` | the span's color, or the accent without one, at tint-secondary / `0.1em` · `.md-highlight` |
- [ ] `PropertiesPM.md:62`: change "takes bold, italic, highlights, code, and connections" to "takes bold, italic, highlights, text colors, code, and connections".
- [ ] `.claude/scripts/Text Property Drive/live-drive.mjs`:
  - `:51`: seed `'eggs with ==🔴a highlight=='`.
  - `:546`: check `includes('highlight==\n\na third line')`.
  - `:560`: check `includes('highlight==\n[[Drive Target]]')`.

**VERIFY**

- [ ] `git grep -n -e "🔴==" -e "Both sides must name" -e "inside each \`==\`" -- .claude/Features .claude/Guidelines .claude/scripts` returns nothing.
- [ ] `node --check ".claude/scripts/Text Property Drive/live-drive.mjs"` passes.

#### Task 5-2

**TASK:** Document Sapphire's colors, its seams, and its exceptions.

**CHANGE**

- [ ] `MarkdownSPH.md:3`: add "colors written Pommora's way" to the intro's list.
- [ ] Add a `#### Colors` section after Code Blocks, written as follows.
  > A color emoji right after a highlight's `==` colors it as Pommora does, in every color and shape Pommora reads, including brown, black, white, diamonds, and hearts, so the highlight hides, reveals, and paints through Obsidian's own highlight. A color emoji right after a lone `=` colors the words up to the next `=` (`=🔴words=`) in red, orange, yellow, green, blue, purple, or brown. In Live Preview its markers hide unless a focused selection touches the run; Source mode shows them, and Reading view paints the words with the markers gone. **Settings:** always on.
- [ ] Add the following items to MarkdownSPH's Accepted Limitations:
  - Obsidian's color swatch, color menu, `editor:toggle-highlight-*` commands, and `==` color picker offer its six colors only, and Pommora's others show their emoji when revealed. An emoji-only highlight (`==🔴==`) takes its color, where Pommora shows the emoji.
  - A text color run around a link or inline code paints, where Pommora leaves it as written.
  - A Reading-view run whose markers sit under different parents stays as written.
- [ ] `Native-Integration-Seams.md` §The Markdown Parser: add a bullet recording:
  - **The Highlight Branch:** `==` opens on a following non-space and sets `state.highlightColor` from a two-unit key over six colors; the style builder adds `highlight-<color>` while it's set; closing `==` clears it.
  - **Live Preview's Hide:** it hides formatting only for the `F5` and `R5` class sets, so a `formatting-*` class of a plugin's own doesn't hide.
  - **Reading View's Mark:** remark's `mark[data-highlight]`.

  Add `src/markdown/colorMarks.ts` to the section's file list, and extend its breakage profile.
- [ ] `Rendering-And-Colors.md` §Unprefixed by Design: add the native highlight classes (`cm-highlight-<color>`, `mark[data-highlight]`) as a third exception, since Obsidian's builder and renderer name them, and note the derived `--sapphire-color-*` palette.
- [ ] `QuickFixesSPH.md`: under Editing, add the following line.
  > - **Colors written Pommora's way:** highlights take every Pommora color and shape, and `=🔴words=` colors text.[^n]

  Its footnote cites MarkdownSPH §Colors.
- [ ] `FrameworkSPH.md:12`: add "colors read Pommora's way" to the Markdown line.

**VERIFY**

- [ ] Each edited claim reads true against the shipped code, and nothing describes a toggle.

---

### Completion Criteria

- **Conformance:**
  - Both repos follow their own CLAUDE.md rules and *§Constraints*.
  - No second color table, rows builder, or fold exists in Pommora.
  - Sapphire's one re-typed table is marked as ported.
- **Correctness:**
  - `==🔴words==` and `=🔴words=` render, convert, recolor, and remove through every menu path, in pages, resting cells, and TextPane.
  - Obsidian shows the same colors in both views.
- **Completeness:**
  - Every task is ticked and the trailing-mark machinery is gone.
  - Text Color has no Accent, chord, black, or white anywhere: menu, grammar, or Sapphire.
- **Confirmation:**
  - Every new test went red first.
  - Nathan's visual pass carries his word.
  - Sapphire's live check read its own screenshots.
- **Continuity:**
  - *§Reconciliation* is walked.
  - No doc in either repo describes the old spelling or pairing.
- **Confidence:**
  - Gates are green from a clean state in both repos across their full ranges.
  - Pommora's diff nets close to even: deletions of about 60 lines against the text color's additions. Sapphire's adds one module and its stylesheet block.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

- [ ] Phase review (opus-high): Phase 1 · Phase 2 · Phase 3 · Phase 4 · Phase 5
- [ ] Simplification lens → adversarial lens (opus-high) over `{baseline}..HEAD` in each repo
- [ ] Neutral verification (opus-high) over `{baseline}..HEAD` in each repo
- [ ] Own pass: gates · diff · deviations · criteria
- [ ] Reconciliation walked
- [ ] `c/view-delta` over each repo's range, whose delta the report and the history entry carry
- [ ] HistoryPM: PM-152 "Text Colors & Highlighting", written per `r/history-format` with a brief citation of PM-113
- [ ] Report delivered

#### Reconciliation

**Pommora: Code Comments**

| Source | Claim | Task |
| --- | --- | --- |
| `Engine/highlightColors.ts:3` | "a color emoji inside each `==`" | 2-1 |
| `Engine/highlightColors.ts:32` | the `🐈‍⬛` trailing example | 2-1 |
| `Engine/highlightColors.ts:52` | `isColorMark` "as a typed emoji arrives" | 1-1 |
| `Engine/tokens.ts:72` | "a highlight's color marks sit inside its `==`" | 2-1 |
| `Engine/tokens.ts:186` | "A matching color mark inside each `==`… a lone or mismatched one stays text" | 2-1 |
| `Input/edits.ts:430` | `highlightCloseAt`'s doc | 1-1 |
| `Input/edits.ts:535` | "A highlight's closing color mark is part of its closer." | 1-1 |
| `Input/format.ts:67` | "one already highlighted in another color is recolored rather than removed" | 2-3 |
| `Core/Actions/editorMenu.ts:71` | "The accent is the bare `==`, so it carries the highlight chord" | 3-1 |
| `Core/Actions/editorMenu.ts:91` | "Offered only over a highlight" | 3-1 |

**Pommora: Tests**

| Test | Claim | Task |
| --- | --- | --- |
| `Engine/highlight.test.ts:39-63` | the both-sides reads | 2-1 |
| `Input/format.test.ts:337-367` | the both-sides writes | 2-1 |
| `Input/edits.test.ts:927-959` | pairing, paired Backspace, and the closing-mark Enter | 1-1 |
| `Input/formatState.test.ts:28-37` | the `highlight` field | 3-1 |
| `Core/Actions/editorMenu.test.ts:12, 89-125` | the `highlight` field, its rows, and "Change Color over a highlight alone" | 3-1 |
| `Desktop/Actions/editorMenu.test.ts:31, 226` | the `highlight` field | 3-1 |

**Pommora: Docs and Scripts**

| Source | Claim | Task |
| --- | --- | --- |
| `MarkdownPM.md:21` | "All of them are reachable from the context menu's Format submenu and their ⌘ shortcuts, and each auto-pairs as you type" (no text color) | 5-1 |
| `MarkdownPM.md:22` | "a color emoji just inside each `==`… `==🔴words🔴==`… Both sides must name the same color… one typed right after an opening `==` pairs ahead of the closing one, Backspace inside an empty pair removes both" | 5-1 |
| `MarkdownPM.md:150` | "Change Color ▸ — Over a highlight, the same rows as Format ▸ Highlight ▸" | 5-1 |
| `MarkdownPM.md:151` | "Format ▸ … **Highlight ▸** lists Accent…" (no Text Color) | 5-1 |
| `MarkdownPM.md:219` | "Highlight · `--highlight` / `--highlight-bleed` · the accent, or the highlight's own color" | 5-1 |
| `PropertiesPM.md:62` | "takes bold, italic, highlights, code, and connections" | 5-1 |
| `live-drive.mjs:51, 546, 560` | the `==🔴a highlight🔴==` seed and its `🔴==` checks | 5-1 |

**Sapphire**

| Source | Claim | Task |
| --- | --- | --- |
| `MarkdownSPH.md:3` | intro list without colors | 5-2 |
| `MarkdownSPH.md` Accepted Limitations | no color entries | 5-2 |
| `Native-Integration-Seams.md:173-185` | file list and breakage profile without highlights | 5-2 |
| `Rendering-And-Colors.md:21-27` | "two deliberate exceptions" | 5-2 |
| `QuickFixesSPH.md` Editing | no colors entry | 5-2 |
| `FrameworkSPH.md:12` | Markdown line without colors | 5-2 |

#### Open Items

- None.

#### Deviations
