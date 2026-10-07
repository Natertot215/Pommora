## Codeblock Deltas — Implementation Plan

### Context

MarkdownPM draws fenced codeblocks with a language tag, syntax colors, and optional line numbers, and its roster already lists `Diff` as a language: CodeMirror's legacy diff mode tints the whole line's text. This plan makes a diff a property of the fence instead of a language. `diff` and `patch`, alone or joined to a language by `-`, `/`, or `|` on either side, draw added and removed lines as blockquote-style bars over a tinted fill, color the code past each sign in the named language, and replace the top-right tag with a tally pill. The work touches the fence scan (`Engine/detect.ts`, `Engine/docScan.ts`), the word resolver (`Engine/codeLangs.ts`), block colors (`codeHighlight.ts`, `MarkdownEditor.tsx`), line intents and the caret seam (`Engine/intents.ts`), the tag widget (`decorations.ts`), and `markdown-pm.css`, along with `MarkdownPM.md`, `Editor-Internals.md`, and `HistoryPM.md`.

It leaves copy alone: the tag still copies the block's raw text, signs included. Nothing outside MarkdownPM changes, and UIX is only read from: the pill wears its existing button and segment classes.

### Summary

A codeblock opened with ```` ```diff ```` (or ```` ```diff-ts ````, ```` ```ts|diff ````, and the other spellings) shows each added line with a green bar and fill and each removed line with a red one. The bar takes the place of the `+` or `−`, so the code lines up cleanly. Clicking into the block swaps the bars back to the raw `+` and `−` so they can be edited, while the fills stay. When a language is named, the code keeps that language's colors. File and hunk headers read in a quieter gray. The top-right corner shows the same pill as the change viewer, with the net change and then added over removed, and clicking it copies the block as before.

The plan also tidies what it touches. The old diff highlighter retires, the tag and the colors start reading fence words through one resolver (today they disagree), and the three places that each recompute a codeblock's left padding collapse into one.

#### Constraints

- **Gates:** `npm run typecheck` · `npm run test` · `npm run lint`, run from the repo root; each exits 0, and the test run ends in a passing count. Biome formats every TS/CSS write, so an Edit that fails on whitespace means the file was reformatted: re-read it and retry.
- **One reading per fact:** a fence word resolves only through `codeFence`, a line's diff kind is decided only in `scanFencedCode`, and the tally is counted only there. Paint, intents, and the widget read the stored result.
- **Hot path:** nothing counts, classifies, or walks a fence on a draw or a caret move. The only per-move cost added is re-deriving the on-screen lines of the diff fence the caret sits in (Task 3.2).
- **Copy stays raw:** `codeBlockTextAt` is untouched.
- **Frozen:** the `.codeblock-language` class name, which `Menus/blockHandles.test.ts` queries, and the `CodeTagWidget` copy and reveal behavior for every non-diff fence.
- **Fuzzy matching retires on purpose:** a word only a fuzzy match reached (`jsx-foo`) loses its colors, so the colors and the tag always agree.
- **Comments:** only where the code can't say it; match the surrounding doc-comment density. No trial-and-error code survives a task.
- **Commits:** each phase commits on `active` once its gates are green; a doc a task falsifies is rewritten in that task's commit.
- **Diff blocks in this plan:** every file change below is written in the syntax this plan builds, so the plan renders its own feature once Phase 4 lands. Context lines carry a leading space, `@@ name @@` names the function or rule a hunk sits in, and the `--- a/` / `+++ b/` pair names the file.

#### Baseline

- Gates: green at `a356034e5` — `npm run typecheck` exit 0 · `npm run lint` exit 0, 1416 files, no fixes · `npm run test` exit 0.
- `npm run test` → 516 files · 7350 passed, 2 skipped (7352) — adds the tests below.
- `grep -c "name: 'Diff'" Core/MarkdownPM/Engine/codeLangs.ts` → 1 — retires
- `grep -c "mode/diff" Core/MarkdownPM/codeHighlight.ts` → 1 — retires
- `grep -rn "matchLanguageName" Core --include='*.ts' --include='*.tsx' | wc -l` → 1 — retires
- `grep -cE "export (const indentWidth|function fenceBodyStart)" Core/MarkdownPM/Engine/docScan.ts` → 2 — moves to `detect.ts`
- `grep -c "padding-left" Core/MarkdownPM/markdown-pm.css` → 11 — drops to 10 (the line-count rule)

**START:** 2026-10-07T02:00:51Z
**END:** <same command as the report is given>

#### Implementation Process

- [x] **Phase 1** — One Fence Reading
  - [x] Task 1.1
  - [x] Task 1.2
- [x] **Phase 2** — Colors Past The Sign
  - [x] Task 2.1
- [ ] **Phase 3** — Bars, Fills, And The Caret
  - [x] Task 3.1
  - [x] Task 3.2
  - [x] Task 3.3
  - [ ] Review Checkpoint
- [ ] **Phase 4** — The Tally Pill
  - [x] Task 4.1
  - [x] Task 4.2
  - [ ] Review Checkpoint
  - [ ] `[Stop: Nathan's visual pass on bars, corners, insets, and the pill before the history entry]`
  - [ ] Task 4.3

### Phase 1 — One Fence Reading

**GOAL:** Give every layer one answer to "is this a diff fence, and in what language", and have the scan record each line's diff kind and the fence's totals in the pass that already numbers its lines. Every later phase reads these, so this phase lands first and alone.

#### Task 1.1

**TASK**

- [x] Write the `codeFence` tests first and watch them fail.
- [x] Retire `Diff` from the roster and its loader.
- [x] Replace `codeLanguageName` with `codeFence`, which reads the diff word and the language in one lookup.
- [x] Point `intents.ts` at `codeFence`.
- [x] Rewrite *MarkdownPM.md*'s language count.

```diff-ts
--- a/Core/MarkdownPM/Engine/codeLangs.ts
+++ b/Core/MarkdownPM/Engine/codeLangs.ts
@@ CODE_LANGS @@
   { name: 'Dockerfile', alias: ['dockerfile', 'docker'] },
-  { name: 'Diff', alias: ['diff', 'patch'] },
   { name: 'Lua', alias: ['lua'] },
@@ codeLanguageName @@-/** Null where no language answers to the word: a fence that selected no parse wears no tag. */
-export function codeLanguageName(info: string): string | null {
+const DIFF_WORD = /^(?:(?:diff|patch)(?:[-/|](.+))?|(.+)[-/|](?:diff|patch))$/
+
+/** The one reading of a fence word: the language its code colors as, and whether it draws as a diff — `diff` or `patch` alone, or joined to a language by `-`, `/`, or `|` on either side. A null name selects no parse, and the fence wears no language tag. */
+export function codeFence(info: string): { name: CodeLangName | null; diff: boolean } {
   const word = info.trim().toLowerCase()
-  if (!word) return null
-  return (
-    CODE_LANGS.find((l) => l.name.toLowerCase() === word || l.alias.some((a) => a === word))
-      ?.name ?? null
-  )
+  const m = DIFF_WORD.exec(word)
+  const lang = m ? (m[1] ?? m[2]) : word
+  const named = CODE_LANGS.find((l) => l.name.toLowerCase() === lang || l.alias.some((a) => a === lang))
+  return { name: named?.name ?? null, diff: m !== null }
 }
```

```ts/diff
--- a/Core/MarkdownPM/codeHighlight.ts
+++ b/Core/MarkdownPM/codeHighlight.ts
@@ LOADERS @@
   Dockerfile: () =>
     stream(import('@codemirror/legacy-modes/mode/dockerfile').then((m) => m.dockerFile)),
-  Diff: () => stream(import('@codemirror/legacy-modes/mode/diff').then((m) => m.diff)),
   Lua: () => stream(import('@codemirror/legacy-modes/mode/lua').then((m) => m.lua)),
```

```diff/ts
--- a/Core/MarkdownPM/Engine/intents.ts
+++ b/Core/MarkdownPM/Engine/intents.ts
@@ imports @@
-import { codeLanguageName } from './codeLangs'
+import { codeFence } from './codeLangs'
@@ pageChrome @@
     const infoStart = ls + fence.markerEnd
-    const named = fence.lang ? codeLanguageName(fence.lang) : null
+    const named = fence.lang ? codeFence(fence.lang).name : null
```

```ts|diff
--- a/Core/MarkdownPM/Engine/codeLangs.test.ts
+++ b/Core/MarkdownPM/Engine/codeLangs.test.ts
@@ imports @@
-import { CODE_LANGS, codeLanguageName } from './codeLangs'
+import { CODE_LANGS, codeFence } from './codeLangs'
@@ a fence word @@
 describe('a fence word', () => {
   it('resolves to the language it names, whichever spelling it used', () => {
-    expect(codeLanguageName('ts')).toBe('TypeScript')
-    expect(codeLanguageName('tsx')).toBe('TypeScript')
-    expect(codeLanguageName('TypeScript')).toBe('TypeScript')
-    expect(codeLanguageName('bash')).toBe('Shell')
+    expect(codeFence('ts')).toEqual({ name: 'TypeScript', diff: false })
+    expect(codeFence('tsx').name).toBe('TypeScript')
+    expect(codeFence('TypeScript').name).toBe('TypeScript')
+    expect(codeFence('bash').name).toBe('Shell')
   })
   it('reads the same however it was cased or spaced', () => {
-    expect(codeLanguageName('  PYTHON ')).toBe('Python')
+    expect(codeFence('  PYTHON ').name).toBe('Python')
   })
   it('answers nothing for a word no language carries', () => {
-    expect(codeLanguageName('brainfuck')).toBeNull()
-    expect(codeLanguageName('')).toBeNull()
+    expect(codeFence('brainfuck')).toEqual({ name: null, diff: false })
+    expect(codeFence('')).toEqual({ name: null, diff: false })
   })
+  it('reads a diff joined to its language by any separator, on either side', () => {
+    for (const word of ['diff-ts', 'diff/ts', 'diff|ts', 'ts-diff', 'ts/diff', 'ts|diff', 'patch-ts'])
+      expect(codeFence(word)).toEqual({ name: 'TypeScript', diff: true })
+  })
+  it('reads a bare diff, and a diff in a language no roster entry names, as a diff with no colors', () => {
+    expect(codeFence('diff')).toEqual({ name: null, diff: true })
+    expect(codeFence('PATCH')).toEqual({ name: null, diff: true })
+    expect(codeFence('diff-foo')).toEqual({ name: null, diff: true })
+  })
+  it('reads no diff in a word that only begins with one', () => {
+    expect(codeFence('diffts')).toEqual({ name: null, diff: false })
+    expect(codeFence('diff-')).toEqual({ name: null, diff: false })
+  })
 })
```

```diff/md
--- a/.claude/Features/MarkdownPM.md
+++ b/.claude/Features/MarkdownPM.md
@@ Code @@
-… A fence's info word sets its language. Any of the thirty-eight languages in the roster gets a syntax-colored parse, …
+… A fence's info word sets its language. Any of the thirty-seven languages in the roster gets a syntax-colored parse, …
```

**VERIFY**

- [x] The new `codeFence` cases fail before `codeFence` exists and pass after; read the run.
- [x] Run the gates. `grep -rn "codeLanguageName" Core --include='*.ts' --include='*.tsx'` → nothing.
- [x] `grep -c "name: 'Diff'" Core/MarkdownPM/Engine/codeLangs.ts` → 0; `grep -c "mode/diff" Core/MarkdownPM/codeHighlight.ts` → 0.
- [x] Check the work for unnecessary code or obvious mistakes.

#### Task 1.2

**TASK**

- [x] Write the diff-fence scan tests and add diff lines to the stepped-scan soup; watch the scan tests fail.
- [x] Move `indentWidth` and `fenceBodyStart` from `docScan.ts` into `detect.ts`, beside the `FenceInfo` they read. The scan needs them there, and `docScan.ts` already imports `detect.ts`.
- [x] Add `DiffTally`, `DiffLine`, and the two optional `FenceInfo` fields.
- [x] Have `scanFencedCode` read each diff fence's signs and totals in its existing per-span loop.
- [x] Repoint the four importers of the moved helpers.

```ts-diff
--- a/Core/MarkdownPM/Engine/detect.ts
+++ b/Core/MarkdownPM/Engine/detect.ts
@@ imports @@
 import { perText } from './perText'
 import { parse } from './parser'
+import { codeFence } from './codeLangs'
 import {
@@ FenceInfo @@
+/** A diff fence's totals: one object every line of the fence shares, so a line the scan moves still carries it. */
+export interface DiffTally {
+  add: number
+  del: number
+}
+
+/** Every kind but `head` carries a one-character sign column. */
+export type DiffLine = 'add' | 'del' | 'same' | 'head'
+
 export interface FenceInfo {
   role: 'open' | 'content' | 'close'
   from: number
   to: number
   depth: number
   lang?: string
   indent: number
   markerEnd: number
   ordinal?: number
+  tally?: DiffTally
+  diff?: DiffLine
 }
@@ scanFencedCode @@
 export function scanFencedCode(lines: string[], lineStarts: number[]): (FenceInfo | undefined)[] {
   const out: (FenceInfo | undefined)[] = new Array(lines.length)
   for (const span of fenceSpans(lines)) {
     const { open, close } = span
+    const lang = fenceLang(span.fence) || undefined
+    const tally = lang && codeFence(lang).diff ? { add: 0, del: 0 } : undefined
     const base = {
       from: lineStarts[open],
       to: lineEndOf({ lines, lineStarts }, close),
       depth: span.fence.depth,
-      lang: fenceLang(span.fence) || undefined,
+      lang,
       indent: span.fence.indent,
       markerEnd: span.fence.markerEnd,
+      tally,
     }
     out[open] = { role: 'open', ...base }
     for (let k = open + 1; k < close; k++) out[k] = { role: 'content', ...base, ordinal: k - open }
     out[close] = { role: 'close', ...base }
+    if (tally) readDiff(lines, out, open, close, tally)
   }
   return out
 }
+
+/** Git writes a file header as a `--- ` line over a `+++ ` line, so a lone `--- ` is a removed line that begins with dashes. */
+function readDiff(
+  lines: string[],
+  out: (FenceInfo | undefined)[],
+  open: number,
+  close: number,
+  tally: DiffTally,
+): void {
+  const body = (k: number): string => lines[k].slice(fenceBodyStart(lines[k], out[k]!))
+  for (let k = open + 1; k < close; k++) {
+    const f = out[k]!
+    const text = body(k)
+    if (text.startsWith('@@')) f.diff = 'head'
+    else if (text.startsWith('--- ') && k + 1 < close && body(k + 1).startsWith('+++ ')) {
+      f.diff = 'head'
+      out[++k]!.diff = 'head'
+    } else if (text[0] === '+') {
+      f.diff = 'add'
+      tally.add++
+    } else if (text[0] === '-') {
+      f.diff = 'del'
+      tally.del++
+    } else if (text[0] === ' ') f.diff = 'same'
+  }
+}
+
+export const indentWidth = (line: string): number => /^[ \t]*/.exec(line)![0].length
+
+export function fenceBodyStart(line: string, f: FenceInfo): number {
+  const quote = quotePrefixWidth(line, f.depth)
+  return quote + Math.min(f.indent, indentWidth(line.slice(quote)))
+}
```

```diff-ts
--- a/Core/MarkdownPM/Engine/docScan.ts
+++ b/Core/MarkdownPM/Engine/docScan.ts
@@ imports @@
 import {
   codeAt,
   fenceAt,
   isBlockquoteLine,
   lineEndOf,
   lineIndexAt,
-  quotePrefixWidth,
   type CodeMask,
 } from './markdownCode'
 import {
   assembleCitations,
   blockEmbedLines,
   blockMathRanges,
   blockWebpageLines,
   calloutLines,
+  fenceBodyStart,
   fenceRangesOf,
@@ Queries @@
-export const indentWidth = (line: string): number => /^[ \t]*/.exec(line)![0].length
-
-export function fenceBodyStart(line: string, f: FenceInfo): number {
-  const quote = quotePrefixWidth(line, f.depth)
-  return quote + Math.min(f.indent, indentWidth(line.slice(quote)))
-}
-
 export function codeBlockTextAt(scan: DocScan, pos: number): string {
```

```ts-diff
--- a/Core/MarkdownPM/Engine/intents.ts
+++ b/Core/MarkdownPM/Engine/intents.ts
@@ imports @@
   headingParts,
+  fenceBodyStart,
   type CalloutLine,
   type CitationEntry,
   type ListMarker,
   type MarkdownScope,
 } from './detect'
 import { codeFence } from './codeLangs'
-import { carriedFrom, type DocScan, fenceBodyStart, spanAt } from './docScan'
+import { carriedFrom, type DocScan, spanAt } from './docScan'
```

```diff|ts
--- a/Core/MarkdownPM/codeHighlight.ts
+++ b/Core/MarkdownPM/codeHighlight.ts
@@ imports @@
-import type { FenceInfo } from './Engine/detect'
-import { type DocScan, fenceBodyStart } from './Engine/docScan'
+import { fenceBodyStart, type FenceInfo } from './Engine/detect'
+import type { DocScan } from './Engine/docScan'
```

```ts|diff
--- a/Core/MarkdownPM/Input/edits.ts
+++ b/Core/MarkdownPM/Input/edits.ts
@@ imports @@
 import {
-  fenceBodyStart,
   inCalloutAt,
   inCodeAt,
   inFenceAt,
   spanAt,
   type DocScan,
 } from '../Engine/docScan'
@@ imports — detect @@
   calloutHeadPrefixLen,
   headingParts,
+  fenceBodyStart,
   type ListMarker,
   type MarkdownScope,
 } from '../Engine/detect'
```

```ts-diff
--- a/Core/MarkdownPM/Engine/listDragModel.ts
+++ b/Core/MarkdownPM/Engine/listDragModel.ts
@@ imports @@
 import {
+  indentWidth,
   isSequenced,
   nestedUnder,
   ordinalOf,
   ordinalText,
   parseListMarkerPrefixed as parseListMarker,
   type ListMarker,
 } from './detect'
@@ imports — docScan @@
-import { type DocScan, indentWidth, inJoinedMath } from './docScan'
+import { type DocScan, inJoinedMath } from './docScan'
```

```diff/ts
--- a/Core/MarkdownPM/Engine/detect.test.ts
+++ b/Core/MarkdownPM/Engine/detect.test.ts
@@ fence language capture @@
     expect(scan('> `````yaml\n> x\n> `````')[0]?.markerEnd).toBe(7)
   })
 })
+
+describe('a diff fence', () => {
+  const scan = (text: string) => {
+    const { lines, lineStarts } = splitWithOffsets(text)
+    return scanFencedCode(lines, lineStarts)
+  }
+  it('reads each line’s sign and the fence’s totals, which every line shares', () => {
+    const f = scan('```diff-ts\n--- a/x\n+++ b/x\n@@ run @@\n const a\n-let b\n+let c\n+let d\nplain\n```')
+    expect(f.slice(1, 9).map((l) => l?.diff)).toEqual([
+      'head', 'head', 'head', 'same', 'del', 'add', 'add', undefined,
+    ])
+    expect(f[0]?.tally).toEqual({ add: 2, del: 1 })
+    expect(f[9]?.tally).toBe(f[0]?.tally)
+  })
+  it('reads a lone `--- ` as a removed line', () => {
+    expect(scan('```sql|diff\n--- old comment\n+select 1\n```')[1]?.diff).toBe('del')
+  })
+  it('reads the sign past a quote prefix', () => {
+    expect(scan('> ```diff\n> +x\n> ```')[1]?.diff).toBe('add')
+  })
+  it('leaves a fence that names no diff without signs or totals', () => {
+    const f = scan('```ts\n+x\n```')
+    expect(f[1]?.diff).toBeUndefined()
+    expect(f[0]?.tally).toBeUndefined()
+  })
+})
```

```ts/diff
--- a/Core/MarkdownPM/Engine/docScan.test.ts
+++ b/Core/MarkdownPM/Engine/docScan.test.ts
@@ soup @@
   '```',
   '```js',
+  '```diff',
+  '```ts|diff',
+  '-removed',
+  '--- a/x',
+  '+++ b/x',
+  '@@ hunk @@',
+  ' context',
   '````',
```

**VERIFY**

- [x] The `a diff fence` cases fail before `readDiff` exists and pass after.
- [x] Run the gates; the stepped-scan property tests in `docScan.test.ts` stay green with the new soup lines.
- [x] `grep -cE "export (const indentWidth|function fenceBodyStart)" Core/MarkdownPM/Engine/docScan.ts` → 0; `grep -rnE "(indentWidth|fenceBodyStart).*from '\.\.?/(Engine/)?docScan'" Core` → nothing.
- [x] Check the work for unnecessary code or obvious mistakes.

### Phase 2 — Colors Past The Sign

**GOAL:** Route both the page's own nested parse and the block colors through `codeFence`, and parse a diff block past its sign column so `+const` colors as `const`. It's separate from Phase 3 because it touches only the color layer; the two run in sequence because both rewrite a sentence of *Editor-Internals*.

#### Task 2.1

**TASK**

- [x] Generalize the `painted` test helper, write the diff paint tests, and watch them fail.
- [x] Replace the exported `codeLanguages` array with a `codeLanguage` resolver built on `codeFence`, and hand it to both `markdown()` calls.
- [x] Have `paint` drop the sign column and blank header lines.
- [x] Rewrite *Editor-Internals*'s code-colors sentence.

```diff|ts
--- a/Core/MarkdownPM/codeHighlight.ts
+++ b/Core/MarkdownPM/codeHighlight.ts
@@ imports @@
-import { CODE_LANGS, type CodeLangName } from './Engine/codeLangs'
+import { CODE_LANGS, type CodeLangName, codeFence } from './Engine/codeLangs'
@@ codeLanguages @@
 /** A name the loaders don't know would be a language the fence recognizes and then fails to parse, so LOADERS is keyed by the roster's names. */
-export const codeLanguages = CODE_LANGS.map(({ name, alias }) =>
-  LanguageDescription.of({ name, alias: [...alias], load: LOADERS[name] }),
-)
+const described = new Map(
+  CODE_LANGS.map(({ name }) => [name, LanguageDescription.of({ name, load: LOADERS[name] })]),
+)
 
-const blockParser = markdown({ codeLanguages }).language.parser
+/** The page's own parse and the block colors both read a fence through this, so a fence colors as exactly the language its tag names. */
+export const codeLanguage = (info: string): LanguageDescription | null => {
+  const { name } = codeFence(info)
+  return name ? (described.get(name) ?? null) : null
+}
+
+const blockParser = markdown({ codeLanguages: codeLanguage }).language.parser
@@ paint @@
   const open = lineIndexAt(scan, f.from)
   const close = lineIndexAt(scan, f.to)
-  const lines = scan.lines.slice(open, close + 1).map((line) => line.slice(fenceBodyStart(line, f)))
-  const desc = f.lang ? LanguageDescription.matchLanguageName(codeLanguages, f.lang, true) : null
+  // A diff line parses past its sign, and a header as nothing; marks map back by line end, so the trimmed start costs no offset math.
+  const lines = scan.lines.slice(open, close + 1).map((line, k) => {
+    const body = line.slice(fenceBodyStart(line, f))
+    const sign = scan.fences[open + k]?.diff
+    return sign === 'head' ? '' : sign ? body.slice(1) : body
+  })
+  const desc = f.lang ? codeLanguage(f.lang) : null
```

```tsx|diff
--- a/Core/MarkdownPM/MarkdownEditor.tsx
+++ b/Core/MarkdownPM/MarkdownEditor.tsx
@@ imports @@
-import { codeHighlight, codeLanguages } from './codeHighlight'
+import { codeHighlight, codeLanguage } from './codeHighlight'
@@ extensions @@
         htmlTagLanguage: htmlTags,
-        codeLanguages,
+        codeLanguages: codeLanguage,
       }),
```

```diff-ts
--- a/Core/MarkdownPM/Engine/codeLangs.test.ts
+++ b/Core/MarkdownPM/Engine/codeLangs.test.ts
@@ imports @@
-import { codeHighlight, codeLanguages } from '../codeHighlight'
+import { codeHighlight, codeLanguage } from '../codeHighlight'
@@ a code block’s colors @@
-  const painted = async (doc: string): Promise<string[]> => {
+  const painted = async (doc: string, word = 'js', cls = 'syntax-keyword'): Promise<string[]> => {
     const view = new EditorView({
       state: EditorState.create({ doc, extensions: [codeHighlight] }),
       parent: document.body,
     })
-    await codeLanguages.find((l) => l.name === 'JavaScript')?.load()
+    await codeLanguage(word)?.load()
     await new Promise((r) => setTimeout(r, 0))
-    const words = [...view.contentDOM.querySelectorAll('.syntax-keyword')].map(
+    const words = [...view.contentDOM.querySelectorAll(`.${cls}`)].map(
       (e) => e.textContent ?? '',
     )
@@ stay off prose the fences don’t hold @@
     expect(await painted('```js\nconst a = 1')).toEqual([])
   })
+
+  it('color a diff block as the language it names, past each sign', async () => {
+    expect(await painted('```diff-yaml\n+key: 1\n-old: 2\n```', 'yaml', 'syntax-key')).toEqual([
+      'key',
+      'old',
+    ])
+  })
+
+  it('leave a diff block’s headers, and a bare diff, uncolored', async () => {
+    expect(await painted('```js|diff\n--- a/x.js\n+++ b/x.js\n@@ const @@\n+let a\n```')).toEqual(['let'])
+    expect(await painted('```diff\n+const a = 1\n```')).toEqual([])
+  })
 })
```

```md-diff
--- a/.claude/Guidelines/Editor-Internals.md
+++ b/.claude/Guidelines/Editor-Internals.md
@@ Fence pairing is one shared pass @@
-… Code colors read the same blocks: each block the scan found is parsed alone with its language, and the page's Markdown language paints nothing.
+… Code colors read the same blocks: each block the scan found is parsed alone with its language — a diff block past its sign column, its headers as blank lines — and the page's Markdown language paints nothing. The page's parse and the colors resolve a fence word through the same reading, so a word only a fuzzy match would reach colors as nothing.
```

**VERIFY**

- [x] The two new color tests fail before the `paint` change (YAML reads `+key`, the header's `const` paints) and pass after.
- [x] Run the gates. `grep -rn "matchLanguageName\|codeLanguages\b" Core --include='*.ts' --include='*.tsx'` → only the `codeLanguages:` option key in `MarkdownEditor.tsx` and `codeHighlight.ts`.
- [x] Check the work for unnecessary code or obvious mistakes.

### Phase 3 — Bars, Fills, And The Caret

**GOAL:** Draw each added and removed line's bar and fill, hide the sign column while the caret is away, and reveal every sign at once when the caret enters the fence. This is the surface Nathan redirects if it reads wrong, so it closes on a checkpoint.

#### Task 3.1

**TASK**

- [x] Write the line-chrome intent tests and watch them fail.
- [x] Give every diff fence line `codeblock-diff`, a header line `codeblock-diff-head`, and a signed line in the caret's fence `codeblock-diff-raw`.
- [x] Push one `md-diff` line widget per added or removed line, flagged `md-diff-first` or `md-diff-last` where its neighbor carries no bar.
- [x] Hide the sign while the caret is outside the fence, wrap it as a glyph reserving its zone while the caret is inside, and seat the line number past the sign.

```diff-ts
--- a/Core/MarkdownPM/Engine/intents.ts
+++ b/Core/MarkdownPM/Engine/intents.ts
@@ imports @@
   headingParts,
   fenceBodyStart,
   type CalloutLine,
   type CitationEntry,
+  type FenceInfo,
   type ListMarker,
   type MarkdownScope,
 } from './detect'
@@ pageChrome @@
+const barred = (f: FenceInfo | undefined): boolean => f?.diff === 'add' || f?.diff === 'del'
+
 // A cell holds no box, no fence, no math and no citation row, and its own extension draws the footnote markers, so none of this is walked there.
 function pageChrome(
@@ pageChrome — the fence branch @@
   if (fence) {
     const innerStart = ls + fenceBodyStart(line, fence)
     const caretOnLine = selStart >= ls && selStart <= le
+    const signed = fence.diff !== undefined && fence.diff !== 'head'
+    const raw = signed && selStart >= fence.from && selStart <= fence.to
     intents.push({
       kind: 'line',
       from: ls,
       className: cx(
         'codeblock',
         fence.role === 'open' && 'codeblock-first',
         fence.role === 'close' && 'codeblock-last',
+        fence.tally && 'codeblock-diff',
+        fence.diff === 'head' && 'codeblock-diff-head',
+        raw && 'codeblock-diff-raw',
       ),
     })
     pushPrefix(intents, ls, innerStart)
+    if (barred(fence))
+      intents.push({
+        kind: 'lineWidget',
+        from: ls,
+        className: cx(
+          'md-diff',
+          `md-diff-${fence.diff}`,
+          !barred(fences[i - 1]) && 'md-diff-first',
+          !barred(fences[i + 1]) && 'md-diff-last',
+        ),
+      })
+    // The sign is the line's own prefix: the caret floors past it as it does past a quote marker, and stays where the sign shows.
+    if (signed) {
+      pushPrefix(intents, innerStart, innerStart + 1, true)
+      intents.push(
+        raw
+          ? { kind: 'class', from: innerStart, to: innerStart + 1, className: 'md-diff-sign' }
+          : { kind: 'hide', from: innerStart, to: innerStart + 1 },
+      )
+    }
     // The offset comes from the fence grammar itself (markerEnd), so an indented or quoted fence never hides its own marker.
     const infoStart = ls + fence.markerEnd
@@ pageChrome — the line number @@
     if (fence.ordinal !== undefined)
       intents.push({
         kind: 'lineWidget',
-        from: ls,
+        from: signed ? innerStart + 1 : ls,
         className: 'codeblock-line-number',
         text: String(fence.ordinal),
+        side: signed ? 1 : undefined,
       })
```

```ts-diff
--- a/Core/MarkdownPM/Engine/intents.test.ts
+++ b/Core/MarkdownPM/Engine/intents.test.ts
@@ the fence intent tests @@
   it('a quoted fence hides its quote prefix as a line prefix', () => {
     …
   })
+
+  describe('a diff fence', () => {
+    const t = '```diff-ts\n@@ run @@\n const a\n-let b\n+let c\nplain\n```'
+    const scan = scanDoc(t)
+    const at = (caret: number) => assembleLineIntents(scan, docLineIntents(scan), caret)
+    const of = <K extends DecoIntent['kind']>(intents: DecoIntent[], kind: K) =>
+      intents.filter((d): d is Extract<DecoIntent, { kind: K }> => d.kind === kind)
+    const hidden = (intents: DecoIntent[]) => of(intents, 'hide').map((d) => t.slice(d.from, d.to))
+
+    it('stands a bar in each sign’s place while the caret is away, a red run meeting a green one flat', () => {
+      const intents = at(NO_CARET)
+      expect(hidden(intents)).toEqual(['diff-ts', ' ', '-', '+'])
+      expect(
+        of(intents, 'lineWidget')
+          .filter((w) => w.className.startsWith('md-diff'))
+          .map((w) => w.className),
+      ).toEqual(['md-diff md-diff-del md-diff-first', 'md-diff md-diff-add md-diff-last'])
+    })
+    it('marks every line of the fence, and its header apart', () => {
+      expect(of(at(NO_CARET), 'line').map((d) => d.className)).toEqual([
+        'codeblock codeblock-first codeblock-diff',
+        'codeblock codeblock-diff codeblock-diff-head',
+        'codeblock codeblock-diff',
+        'codeblock codeblock-diff',
+        'codeblock codeblock-diff',
+        'codeblock codeblock-diff',
+        'codeblock codeblock-last codeblock-diff',
+      ])
+    })
+    it('seats a signed line’s number past its sign', () => {
+      const numbers = of(at(NO_CARET), 'lineWidget').filter((w) => w.className === 'codeblock-line-number')
+      expect(numbers.map((w) => w.from)).toEqual([
+        t.indexOf('@@'),
+        t.indexOf(' const') + 1,
+        t.indexOf('-let') + 1,
+        t.indexOf('+let') + 1,
+        t.indexOf('plain'),
+      ])
+    })
+    it('trades the bar for the raw sign on the caret’s own line', () => {
+      expect(hidden(at(t.indexOf('let b')))).not.toContain('-')
+    })
+  })
```

**VERIFY**

- [x] The four `a diff fence` cases fail before the intents change and pass after.
- [x] Run the gates.
- [x] Check the work for unnecessary code or obvious mistakes.

#### Task 3.2

**DEPENDENCIES:** Reads the `raw` state Task 3.1 derives.

**TASK**

- [x] Make `decorationsFor` a true whole-document reference: every line derived against the caret, through the now-exported `lineIntentsInto`. Today it calls the same `assembleLineIntents` the suite compares it to, so the equivalence suite can't go red. A probe at `a356034e5` showed the existing corpus already matches a true reference at every caret.
- [x] Add a diff fence to the equivalence corpus and watch the suite go red.
- [x] Fold `caretLine` into `liveLines`, which widens what a caret move re-derives from the caret's line to every on-screen line of the diff fence it sits in.
- [x] Rewrite the comments and the *Editor-Internals* rule this makes false.

```diff/ts
--- a/Core/MarkdownPM/Engine/intents.ts
+++ b/Core/MarkdownPM/Engine/intents.ts
@@ CachedLineIntents @@
 interface CachedLineIntents {
   perLine: DecoIntent[][]
-  /** Held apart from `perLine` because the caret's own line re-derives, and a rail folded in there would go with it. */
+  /** Held apart from `perLine` because the lines a caret move re-derives would take a rail folded in there with them. */
   rails: RailIntent[][]
@@ lineIntentsInto @@
-function lineIntentsInto(
+export function lineIntentsInto(
   scan: DocScan,
@@ caretLine @@
-function caretLine(scan: DocScan, selStart: number): number {
-  return selStart < 0 ? NO_CARET : lineIndexAt(scan, selStart)
+/** The lines a caret move re-derives: its own, or every line of the diff fence it sits in, whose signs it reveals at once. */
+function liveLines(scan: DocScan, selStart: number): [number, number] {
+  if (selStart < 0) return [NO_CARET, NO_CARET]
+  const i = lineIndexAt(scan, selStart)
+  const f = scan.fences[i]
+  return f?.tally ? [lineIndexAt(scan, f.from), lineIndexAt(scan, f.to)] : [i, i]
 }
@@ assembleLineIntents @@
-  const caret = caretLine(scan, selStart)
+  const [top, bottom] = liveLines(scan, selStart)
   const first = window ? lineIndexAt(scan, window.from) : 0
   const last = window ? lineIndexAt(scan, window.to) : scan.lines.length - 1
   const intents: DecoIntent[] = []
   for (let i = first; i <= last; i++) {
-    if (i === caret) lineIntentsInto(scan, i, selStart, intents, scope, ranged)
+    if (i >= top && i <= bottom) lineIntentsInto(scan, i, selStart, intents, scope, ranged)
     else for (const it of cached.perLine[i]) intents.push(it)
   }
```

```ts-diff
--- a/Core/Testing/markdownEngine.ts
+++ b/Core/Testing/markdownEngine.ts
@@ imports @@
 import {
-  assembleLineIntents,
   type DecoIntent,
   docLineIntents,
+  lineIntentsInto,
   tokenIntents,
 } from '../MarkdownPM/Engine/intents'
@@ decorationsFor @@
+/** The whole-document reference the cached assembly is held to: every line derived against the caret, so a caret dependency the live path doesn't re-derive shows as a difference. */
 export function decorationsFor(
@@ decorationsFor — body @@
   const s = scan ?? scanDoc(text)
   const intents: DecoIntent[] = tokenIntents(tokens, active)
-  for (const it of assembleLineIntents(s, docLineIntents(s, scope), selStart, undefined, scope))
-    intents.push(it)
+  for (let i = 0; i < s.lines.length; i++) lineIntentsInto(s, i, selStart, intents, scope)
+  for (const rails of docLineIntents(s, scope).rails) if (rails) for (const it of rails) intents.push(it)
   return intents
 }
```

```diff-ts
--- a/Core/MarkdownPM/Engine/intents.test.ts
+++ b/Core/MarkdownPM/Engine/intents.test.ts
@@ cached assembly ≡ pure derivation @@
-// The live build assembles line intents from the per-version cache, re-deriving only the caret-affected lines; this holds it byte-equivalent to the pure whole-doc reference at EVERY caret position, so a construct that gains a caret dependency without joining caretAffectedLines goes red here.
+// The live build assembles line intents from the per-version cache, re-deriving only the lines a caret move reaches (`liveLines`); this holds it byte-equivalent to the whole-doc reference, which derives every line against the caret, at EVERY caret position, so a construct that gains a caret dependency without joining `liveLines` goes red here.
 describe('cached assembly ≡ pure derivation', () => {
   const corpus = [
@@ corpus @@
     'body [^2] and [^1]\n\n[^1]: one\n[^2]: two\ncontinued',
+    '```diff-ts\n@@ h @@\n a\n-b\n+c\n```\ntail',
   ]
@@ a diff fence @@
     it('trades the bar for the raw sign on the caret’s own line', () => {
       expect(hidden(at(t.indexOf('let b')))).not.toContain('-')
     })
+    it('reveals every sign at once from anywhere in the fence', () => {
+      const intents = at(t.indexOf('plain'))
+      expect(hidden(intents)).toEqual(['diff-ts'])
+      expect(
+        of(intents, 'class')
+          .filter((d) => d.className === 'md-diff-sign')
+          .map((d) => t.slice(d.from, d.to)),
+      ).toEqual([' ', '-', '+'])
+      expect(of(intents, 'line').filter((d) => d.className.includes('codeblock-diff-raw'))).toHaveLength(3)
+    })
```

```diff/md
--- a/.claude/Guidelines/Editor-Internals.md
+++ b/.claude/Guidelines/Editor-Internals.md
@@ Hot-path reads step from the version before @@
-… A caret move re-derives only the line the caret sits on. …
+… A caret move re-derives only the line the caret sits on, or every on-screen line of the diff fence it sits in, whose signs it reveals at once. …
```

**VERIFY**

- [x] With the true reference and the diff corpus doc in place, the `cached assembly ≡ pure derivation` suite goes red on that doc before `liveLines`, and green after. The other nine docs stay green throughout, and so does `Tables/cellLists.test.tsx`, the other `decorationsFor` consumer.
- [x] `reveals every sign at once` fails before `liveLines` and passes after.
- [x] Run the gates.
- [x] Check the work for unnecessary code or obvious mistakes.

#### Task 3.3

**TASK**

- [x] Collapse the codeblock's three `padding-left` formulas into one `--codeblock-indent` that the nested rule reuses, with the line-count rule setting only its zone.
- [x] Add the diff zone, the raw-sign pull, and the header color.
- [x] Draw `md-diff`: a fill whose left edge is the sign column, with its right edge mirroring it, and a bar at that edge that lies over the fill and caps its own run ends, as a quote's does, so the bar stands exactly where the sign appears. The bar hides on raw lines, and the fill's left corners round in its place.
- [x] Add the *Diff Lines* knob row to *MarkdownPM.md*.

```css-diff
--- a/Core/MarkdownPM/markdown-pm.css
+++ b/Core/MarkdownPM/markdown-pm.css
@@ .md-callout.codeblock, .md-blockquote-nested.codeblock, .md-blockquote.codeblock @@
   --box-radius-l: var(--codeblock-radius);
   --box-radius-r: var(--codeblock-radius);
-  padding-left: calc(var(--codeblock-inset) + var(--codeblock-pad));
+  padding-left: var(--codeblock-indent);
   padding-right: calc(var(--codeblock-inset) + var(--codeblock-pad));
 }
@@ .cm-line.codeblock @@
   --box-gap: var(--md-box-gap);
   --box-pad: 6px;
+  --codeblock-indent: calc(
+    var(--codeblock-inset) + var(--codeblock-pad) + var(--diff-zone, 0px) +
+      var(--codeblock-line-zone, 0px)
+  );
   font-family: var(--font-mono);
   font-size: 0.85em;
-  padding-left: calc(var(--codeblock-inset) + var(--codeblock-pad));
+  padding-left: var(--codeblock-indent);
   padding-right: calc(var(--codeblock-inset) + var(--codeblock-pad));
+  text-indent: calc(-1 * (var(--codeblock-line-zone, 0px) + var(--diff-sign, 0px)));
   word-break: break-all;
 }
@@ .cm-line.codeblock-last::after @@
 .mdpm-editor .cm-line.codeblock-last::after {
   border-bottom: var(--codeblock-border);
 }
+
+/* The code holds one column whether its sign shows or not: the sign reserves a zone before it as a list marker does, its gap included, a raw sign is pulled back into that zone, and the bar stands in the same column the sign does. */
+.mdpm-editor .cm-line.codeblock-diff {
+  --diff-zone: calc(1ch + var(--list-gap));
+  --diff-bar: 3px;
+  --diff-radius: 4px;
+  --diff-radius-l: 0px;
+  --box-z: -2;
+}
+.mdpm-editor .cm-line.codeblock-diff-raw {
+  --diff-sign: var(--diff-zone);
+  --diff-radius-l: var(--diff-radius);
+}
+.mdpm-editor .md-diff-sign {
+  display: inline-block;
+  min-width: var(--diff-zone);
+  text-indent: 0;
+}
+.mdpm-editor .cm-line.codeblock-diff-head {
+  color: var(--label-secondary);
+}
+.mdpm-editor .md-diff {
+  position: absolute;
+  inset: 0 calc(var(--codeblock-inset) + var(--codeblock-pad));
+  z-index: -1;
+  background: color-mix(in srgb, var(--diff-color) var(--tint-quinary), transparent);
+  pointer-events: none;
+}
+.mdpm-editor .md-diff::before {
+  content: "";
+  position: absolute;
+  inset: 0 auto 0 0;
+  width: var(--diff-bar);
+  background: color-mix(in srgb, var(--diff-color) var(--tint-secondary), transparent);
+}
+.mdpm-editor .md-diff-add {
+  --diff-color: var(--solid-green);
+}
+.mdpm-editor .md-diff-del {
+  --diff-color: var(--solid-red);
+}
+.mdpm-editor .md-diff-first {
+  border-top-left-radius: var(--diff-radius-l);
+  border-top-right-radius: var(--diff-radius);
+}
+.mdpm-editor .md-diff-last {
+  border-bottom-left-radius: var(--diff-radius-l);
+  border-bottom-right-radius: var(--diff-radius);
+}
+.mdpm-editor .md-diff-first::before {
+  border-top-left-radius: var(--diff-radius);
+  border-top-right-radius: var(--diff-radius);
+}
+.mdpm-editor .md-diff-last::before {
+  border-bottom-left-radius: var(--diff-radius);
+  border-bottom-right-radius: var(--diff-radius);
+}
+.mdpm-editor .codeblock-diff-raw .md-diff::before {
+  display: none;
+}
@@ :root.codeblock-line-count .cm-line.codeblock @@
 :root.codeblock-line-count .mdpm-editor .cm-line.codeblock {
   --codeblock-line-zone: calc(3ch + var(--list-gap));
-  padding-left: calc(var(--codeblock-inset) + var(--codeblock-pad) + var(--codeblock-line-zone));
-  text-indent: calc(-1 * var(--codeblock-line-zone));
 }
```

```md-diff
--- a/.claude/Features/MarkdownPM.md
+++ b/.claude/Features/MarkdownPM.md
@@ II. Knobs — Code Block @@
 | Code Block | `--box-fill` / `--codeblock-radius` / `--box-pad` / `--codeblock-pad` | fill-quaternary / → box corner / `6px` / `12px` (`10px` inside quotes and callouts) · `.codeblock`, whose text is a bare `font-size: 0.85em` |
+| Diff Lines | `--diff-bar` / `--diff-radius` | `3px` / `4px` · `.codeblock-diff` — the bar green or red at tint-secondary over its fill at tint-quinary, both opening at the sign's column, which reserves the sign and a list gap |
```

**VERIFY**

- [x] Run the gates. `grep -c "padding-left" Core/MarkdownPM/markdown-pm.css` → one fewer than *§Baseline*.
- [x] Live drive per *Development-Environment*: a plain fence, a quoted fence, and a callout fence keep their code column with **Show Line Count In Code Blocks** both on and off, matching `a356034e5`.
- [x] Live drive: an added line holding only `+` keeps a full line's height with its sign hidden.
- [ ] User confirms: bars and fills read as one box per run, a red run meeting a green one is flat, the corners round only at a run's ends, the bar stands exactly where the sign appears, and line numbers sit right of the bar.
- [ ] User confirms: clicking into the block swaps every bar for its sign with the code staying put, and the fills stay.
- [x] Check the work for unnecessary code or obvious mistakes.

#### Review Checkpoint

- [x] Every Phase 3 test passes, along with the `cached assembly ≡ pure derivation` suite.
- [x] A non-diff fence, both top-level and quoted, renders the same as at `a356034e5`, with line numbers on and off.
- [ ] Nathan's two Task 3.3 checks are recorded in his words.

### Phase 4 — The Tally Pill

**GOAL:** Hand the fence's totals to its tag and draw them as the change viewer's pill, net then added over removed, still click-to-copy. It follows Phase 3 because both edit `intents.ts` and `markdown-pm.css`.

#### Task 4.1

**TASK**

- [x] Write the tag intent tests and watch them fail.
- [x] Carry `tally` on the `codeTag` intent, name no language on a diff fence's tag, and hide a bare `diff` word behind it.

```ts|diff
--- a/Core/MarkdownPM/Engine/intents.ts
+++ b/Core/MarkdownPM/Engine/intents.ts
@@ imports @@
   type CitationEntry,
+  type DiffTally,
   type FenceInfo,
@@ DecoIntent @@
-  | { kind: 'codeTag'; from: number; name?: string }
+  | { kind: 'codeTag'; from: number; name?: string; tally?: DiffTally }
@@ pageChrome — the fence branch @@
     const infoStart = ls + fence.markerEnd
-    const named = fence.lang ? codeFence(fence.lang).name : null
+    const named = !fence.tally && fence.lang ? codeFence(fence.lang).name : null
     if (fence.role === 'open' && !caretOnLine) {
-      intents.push({ kind: 'codeTag', from: infoStart, name: named ?? undefined })
-      if (named && infoStart < le) intents.push({ kind: 'hide', from: infoStart, to: le })
+      intents.push({ kind: 'codeTag', from: infoStart, name: named ?? undefined, tally: fence.tally })
+      if ((named || fence.tally) && infoStart < le) intents.push({ kind: 'hide', from: infoStart, to: le })
     }
```

```diff|ts
--- a/Core/MarkdownPM/Engine/intents.test.ts
+++ b/Core/MarkdownPM/Engine/intents.test.ts
@@ a diff fence @@
+    it('hands its tag the fence’s totals and no language name', () => {
+      const [tag] = of(at(NO_CARET), 'codeTag')
+      expect(tag.name).toBeUndefined()
+      expect(tag.tally).toEqual({ add: 1, del: 1 })
+    })
+    it('hides a bare diff word behind its tag', () => {
+      const bare = '```diff\n+a\n```'
+      const s = scanDoc(bare)
+      const hides = of(assembleLineIntents(s, docLineIntents(s), NO_CARET), 'hide')
+      expect(hides.map((d) => bare.slice(d.from, d.to))).toEqual(['diff', '+'])
+    })
```

**VERIFY**

- [x] Both cases fail before the change and pass after.
- [x] Run the gates.
- [x] Check the work for unnecessary code or obvious mistakes.

#### Task 4.2

**DEPENDENCIES:** Reads the `tally` Task 4.1 puts on the intent.

**TASK**

- [x] Write the pill DOM tests in a new `Core/MarkdownPM/codeTally.test.tsx` and watch them fail.
- [x] Have `CodeTagWidget` take the tally and append the pill, built from Segmented's classes on plain DOM: the container, a `button-inline` run, and a segment divider, outlined in place of glass. A count change fails `eq` and re-creates the tag, the same as every other plain widget in `decorations.ts`.
- [x] Make the pill a copy target and swap it for "Copied" during the flash.
- [x] Color its counts through the `--diff-color` that `.md-diff-add` and `.md-diff-del` already carry, at tint-primary.
- [x] Add the diff paragraph and the pill to *MarkdownPM.md*.

```diff-ts
--- a/Core/MarkdownPM/decorations.ts
+++ b/Core/MarkdownPM/decorations.ts
@@ imports @@
 import { CHECK_GLYPH, CODE_TAGS, COPY_GLYPH } from './codeGlyphs'
+import type { DiffTally } from './Engine/detect'
@@ imports — UIX @@
 import { checkMarkSvg, checkboxClass } from '@pommora/uix/Controls/Checkbox'
+import * as btn from '@pommora/uix/Buttons/button-base.css'
+import { segment } from '@pommora/uix/Elements/segment.css'
 import { svgFrame } from '@pommora/uix/Symbols/svgFrame'
@@ COPIED_MS @@
 const COPIED_MS = 1000
+
+function tallyPill({ add, del }: DiffTally): HTMLElement {
+  const n = add - del
+  const net = n > 0 ? `<b class="md-diff-add">+${n}</b>` : n < 0 ? `<b class="md-diff-del">−${-n}</b>` : '<b>±0</b>'
+  const run = cx(btn.button, btn.type.base, btn.size['button-inline'], btn.inRun, btn.labeled, btn.labelOnly)
+  const pill = document.createElement('span')
+  pill.className = cx('codeblock-tally', btn.container, btn.size['button-inline'], btn.type.base, btn.outlined)
+  pill.innerHTML = `<span class="${run}">${net}</span><span class="${cx('codeblock-tally-segment', segment, btn.dividerBar)}"></span><span class="${run}"><span><b class="md-diff-add">+${add}</b> / <b class="md-diff-del">−${del}</b></span></span>`
+  return pill
+}
@@ CodeTagWidget @@
 class CodeTagWidget extends WidgetType {
-  constructor(readonly name?: string) {
+  constructor(
+    readonly name?: string,
+    readonly tally?: DiffTally,
+  ) {
     super()
   }
   eq(o: CodeTagWidget): boolean {
-    return o.name === this.name
+    return o.name === this.name && o.tally?.add === this.tally?.add && o.tally?.del === this.tally?.del
   }
@@ CodeTagWidget.toDOM @@
     const name = el.appendChild(document.createElement('span'))
     name.className = 'codeblock-name'
     name.textContent = resting
+    const pill = this.tally ? el.appendChild(tallyPill(this.tally)) : null
 
     let timer: number | undefined
     const copy = (e: MouseEvent): void => {
       e.preventDefault()
       const text = codeBlockTextAt(docScan(view.state.doc), view.posAtDOM(el))
       if (!text) return
       void view.state.facet(editorHost).clipboard.write(text)
       el.classList.add('is-copied')
-      if (resting) name.textContent = 'Copied'
+      if (resting || pill) name.textContent = 'Copied'
@@ CodeTagWidget.toDOM — targets @@
     // Swallowed: a caret on the fence line trades the tag back for the raw info word, unmounting what is being pressed.
-    for (const target of [slot, name]) {
+    for (const target of pill ? [slot, name, pill] : [slot, name]) {
       target.addEventListener('mousedown', (e) => e.preventDefault())
       target.addEventListener('click', copy)
     }
@@ build — codeTag @@
     if (it.kind === 'codeTag') {
       ranges.push(
-        Decoration.widget({ widget: new CodeTagWidget(it.name), side: -1 }).range(it.from),
+        Decoration.widget({ widget: new CodeTagWidget(it.name, it.tally), side: -1 }).range(it.from),
       )
       continue
     }
```

```diff-css
--- a/Core/MarkdownPM/markdown-pm.css
+++ b/Core/MarkdownPM/markdown-pm.css
@@ .codeblock-language .codeblock-name:empty @@
 .mdpm-editor .codeblock .codeblock-language .codeblock-name:empty {
   display: none;
 }
+/* Segmented's own pill, outlined where the change viewer's is glass. */
+.mdpm-editor .codeblock .codeblock-language .codeblock-tally {
+  --btn-radius: var(--radius-full);
+  height: auto;
+  padding: 2px;
+  box-shadow: inset 0 0 0 var(--width-175) var(--button-outline);
+  color: var(--label-secondary);
+  font-variant-numeric: tabular-nums;
+}
+.mdpm-editor .codeblock-tally .codeblock-tally-segment {
+  background: var(--border-strong);
+}
+.mdpm-editor .codeblock-tally :is(.md-diff-add, .md-diff-del) {
+  color: color-mix(in srgb, var(--diff-color) var(--tint-primary), var(--label-secondary));
+}
+.mdpm-editor .codeblock .codeblock-language.is-copied .codeblock-tally {
+  display: none;
+}
@@ cursor @@
 .mdpm-editor .codeblock .codeblock-language .codeblock-mark-slot,
-.mdpm-editor .codeblock .codeblock-language .codeblock-name {
+.mdpm-editor .codeblock .codeblock-language .codeblock-name,
+.mdpm-editor .codeblock .codeblock-language .codeblock-tally {
   cursor: pointer;
 }
```

```tsx-diff
--- /dev/null
+++ b/Core/MarkdownPM/codeTally.test.tsx
@@ new file @@
+// @vitest-environment jsdom
+import { afterEach, describe, expect, it } from 'vitest'
+import { act } from 'react'
+import { cleanupEditor, mountEditor, stubEditorBridge } from '../Testing/editorHarness'
+
+class ResizeObserverStub {
+  observe(): void {}
+  unobserve(): void {}
+  disconnect(): void {}
+}
+;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
+stubEditorBridge()
+afterEach(async () => {
+  await cleanupEditor()
+})
+
+describe('a diff fence’s tally', () => {
+  const doc = '```diff\n+a\n+b\n-c\n```'
+  const pill = (view: { contentDOM: HTMLElement }) => view.contentDOM.querySelector('.codeblock-tally')
+
+  it('reads its net change, then added over removed', async () => {
+    expect(pill(await mountEditor({ initialBody: doc }))?.textContent).toBe('+1+2 / −1')
+  })
+
+  it('recounts when a line changes sign', async () => {
+    const view = await mountEditor({ initialBody: doc })
+    const at = view.state.doc.toString().indexOf('-c')
+    await act(async () => view.dispatch({ changes: { from: at, to: at + 1, insert: '+' } }))
+    expect(pill(view)?.textContent).toBe('+3+3 / −0')
+  })
+})
```

```md-diff
--- a/.claude/Features/MarkdownPM.md
+++ b/.claude/Features/MarkdownPM.md
@@ Code @@
-… That tag is also the block's copy control. A fence written behind quote markers … **Show Line Count In Code Blocks** numbers the content lines.
+… That tag is also the block's copy control. A `diff` or `patch` fence — alone, or joined to a language by `-`, `/`, or `|` on either side, as in `diff-ts` or `ts|diff` — draws each added line with a green bar over a green fill and each removed line in red, colors the code past each sign in the language it names, and sets its file and hunk headers in the secondary label. The bar stands in its sign's place while the caret is elsewhere; entering the block trades every bar for its raw sign, the code holding its column and the fills staying. Its tag is a pill reading the block's net change, then its added over removed lines, counted when the block's text changes. A fence written behind quote markers … **Show Line Count In Code Blocks** numbers the content lines, to the right of a diff line's bar.
@@ II. Knobs — Language Tag @@
-| Language Tag | `.codeblock-language` | name at → label-control, its mark at → label-secondary, `1.15em` — fifteen languages carry a mark; the tag is the block's copy control |
+| Language Tag | `.codeblock-language` | name at → label-control, its mark at → label-secondary, `1.15em` — fifteen languages carry a mark; the tag is the block's copy control, and a diff block's is Segmented's outlined `button-inline` pill (`.codeblock-tally`), its counts green and red at tint-primary |
```

**VERIFY**

- [x] Both pill tests fail before the widget change and pass after.
- [x] Run the gates.
- [x] Live drive: hovering the tag reveals the copy glyph, clicking the pill copies the raw block with its signs, and the pill gives way to "Copied" for a second.
- [ ] User confirms: the pill reads like the change viewer's, apart from the glass: net, divider, then `+added / −removed`, with the counts in the tinted green and red.
- [x] Check the work for unnecessary code or obvious mistakes.

#### Review Checkpoint

- [ ] This plan file, opened in Pommora, renders every block below with bars, headers, language colors, and a pill. That's the end-to-end proof.
- [ ] A non-diff tag (`js`, `ruby`, a bare fence) is unchanged: glyph, name, reveal, copy, and "Copied".
- [ ] Nathan's Task 4.2 check is recorded in his words.

#### Task 4.3

**DEPENDENCIES:** Runs after the stop, once *§Final Verification*'s closeout has the commit range and the diff.

**TASK**

- [ ] Add the index row and the **PM-147 || Codeblock Deltas** entry to *HistoryPM.md*, per *§History-Format*: past tense and feature-level, with the commit range and the closeout's diff.

```diff/md
--- a/.claude/HistoryPM.md
+++ b/.claude/HistoryPM.md
@@ Pommora History Index @@
 | Date                    | ID     | Entry                                                |
 | ----------------------- | ------ | ---------------------------------------------------- |
+| <MM-DD-YYYY>            | PM-147 | Codeblock Deltas                                     |
 | 09-29-2026              | PM-146 | Interface Scrollbars                                 |
@@ entries @@
+#### PM-147 || Codeblock Deltas
+**DATE:** <MM-DD-YYYY>
+
+Codeblock Deltas made a diff a property of any fenced codeblock: `diff` or `patch`, alone or joined to a language on either side, draws added and removed lines as green and red bars over a tinted fill while the code keeps its own language's colors. A sign stays hidden behind its bar until the caret enters the block, which reveals every sign at once without moving the code, and file and hunk headers read in the secondary label. The block's tag became the change viewer's pill, counting net, added, and removed lines in the same pass that numbers them. Fence words now resolve through one reading shared by the tag, the colors, and the page's own parse, which retired the legacy diff highlighter and its fuzzy matches, and the codeblock's left padding collapsed into one formula.
+
+- **Commits:** `<first>^..<last>`
+- **Diff:** Net ±N | +<added> / -<removed>
+
 #### PM-146 || Interface Scrollbars
```

**VERIFY**

- [ ] The entry's commit range resolves (`git log --oneline <first>^..<last>`), and its diff matches the closeout's figures.

### Completion Criteria

**Conformance**

- [ ] One resolver: `grep -rn "matchLanguageName\|codeLanguageName" Core --include='*.ts' --include='*.tsx'` → nothing; every fence word reads through `codeFence`.
- [ ] One classifier: the `'add'`, `'del'`, `'same'`, and `'head'` kinds are assigned only in `detect.ts:readDiff`, and the tally is counted nowhere else.
- [ ] Nothing changed outside what the plan named: `git diff --name-only <baseline>..HEAD` matches the files in this plan's diff blocks.

**Correctness**

- [ ] All six spellings, plus `patch` and a bare `diff`, draw as diffs; `diffts` doesn't.
- [ ] Added lines draw green and removed lines red, bar at tint-primary over fill at tint-secondary, the bar in the sign's own column, rounded only at a run's ends, flat where red meets green.
- [ ] With the caret outside, the signs are hidden and the code aligns; inside, every sign shows, the bars hide, the fills stay, and the code doesn't move.
- [ ] Headers (`--- `/`+++ ` pairs, `@@`) carry no bar, aren't counted, and read in the secondary label.
- [ ] A named language colors the code past each sign; a bare diff colors nothing.
- [ ] The pill reads net │ `+added / −removed`, recounts as signs change, and copies the raw block.
- [ ] Line numbers sit right of the bar with **Show Line Count In Code Blocks** on.
- [ ] End to end: this plan file renders its own diff blocks in Pommora.

**Completeness**

- [ ] Every task is ticked, and `<baseline>..HEAD` holds no scaffolding, debug output, or unauthorized TODO.

**Confirmation**

- [ ] Every new test goes red with its change reverted, the equivalence suite included (it now derives a true reference), and every verification result was read.
- [ ] User: the bars and corners check (3.3) · the caret swap (3.3) · the pill (4.2).

**Continuity**

- [ ] *§Reconciliation* complete, the living documents read true, and each *§Deviations* entry is fixed or ruled on.

**Confidence**

- [ ] Gates are green from clean on `a356034e5..HEAD`, and the *§Baseline* counts moved as planned.
- [ ] Diff size is roughly +150 / −35 production lines, comments and tests excluded; report the real figure.

### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct: nothing carried as a concern, nothing deferred where the fix is known, and nothing declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution takes the simplest reading and is recorded rather than stopping the run. Edits found in adjacent files that no task made belong to Nathan, and are folded into the commit at hand rather than reverted.

- [ ] Phase review dispatched: Phase 1 · Phase 2 · Phase 3 · Phase 4
- [ ] All findings fixed or ruled on
- [ ] Neutral verification passed on `a356034e5..HEAD`
- [ ] Final pass: gates · baseline · diff · deviations · criteria
- [ ] Reconciliation walked; living documents read
- [ ] Report delivered

#### Reconciliation

- `.claude/Features/MarkdownPM.md` — "thirty-eight languages" — Task 1.1
- `.claude/Guidelines/Editor-Internals.md` — "each block the scan found is parsed alone with its language" (no sign column, no shared word reading) — Task 2.1
- `.claude/Guidelines/Editor-Internals.md` — "A caret move re-derives only the line the caret sits on." — Task 3.2
- `Core/MarkdownPM/Engine/intents.ts` — `CachedLineIntents.rails`: "the caret's own line re-derives" — Task 3.2
- `Core/MarkdownPM/Engine/intents.test.ts` — the equivalence suite's comment naming the nonexistent `caretAffectedLines` — Task 3.2
- `Core/Testing/markdownEngine.ts` — `decorationsFor` as "the pure whole-doc reference", while it runs the cached assembly it's compared to — Task 3.2
- `.claude/Features/MarkdownPM.md` — the Code Block knobs, with no diff row — Task 3.3
- `.claude/Features/MarkdownPM.md` — the Code bullet and the Language Tag row, with no diff block or pill — Task 4.2
- `.claude/HistoryPM.md` — no PM-147 — Task 4.3

#### Report & Closure

Per *§5.5* of the planning standard: the report goes to Nathan in plain language, with the real gate output, the baseline counts, and the line-count difference with comments and tests excluded.

### Open Items

- ⌘/ inside a diff block comments the line as `<!-- -->`, as in a bare block, wrapping the line's sign with its code. Toggling comments inside a diff is rare, and this plan leaves it as-is.

### Deviations

Nathan ruled each of these during the live pass; the plan's hunks above show the original design, and the commits carry what landed.

- **Bar over the fill (Task 3.3):** the bar lies over the fill as a quote's does, capping its own run ends, with the fill's left corners square beneath it; a raw line, which has no bar, rounds them (`--diff-radius-l`).
- **Tints (Task 3.3):** the bar sits at tint-secondary and the fill at tint-quinary. `--tint-quinary` joined `TINT_STEPS` at 10%, with its row in *PommoraUIX.md* and its column on the Dashboard's colors page.
- **The margin (Tasks 3.1 and 3.3):** a diff line's sign and number form one margin before its code. The sign reserves `1ch + --list-gap`, the way a list glyph reserves its zone, and a diff line's number stands out of the text's flow at the sign zone's end, so the open fence pulls each content line back across the whole margin while the code holds its column. Fence lines keep the number column, as in any codeblock.
- **Two seats (Task 3.1):** each sign is a drawn-over `prefix`, so the caret never sits before it. The one position between margin and code draws as two seats: the code's start, where every motion, Home, and a press on the code land, and the margin, reached by stepping left from the code or pressing left of it, where a drag selects from the margin. `signSeatAt` names the position, `caretSeat` holds the side, and an edit made from the margin stays there while the caret keeps its line. A line with no sign keeps a zero-width slot at its margin while the fence is open, and an open line with no code anchors the code's seat, so the caret always draws against something its own height.
- **Margin input (new):** the margin takes only `+` or `-`, which become the line's sign (`marginSign`), and the sign a line already wears changes nothing; Backspace there removes the sign and leaves the caret in the margin. A paste or a drop there lands nothing, and an IME composition lands as code at the margin's position.
- **The page's parse (Task 2.1):** the page nests no language under a diff fence, whose raw lines carry their signs, so ⌘/ there acts as in a bare block; the colors and a signed line's Enter parse past the signs.
- **Enter, Mod-Enter, and Shift-Enter (new):** on a signed diff line, Enter carries the sign to the new line as a list item carries its marker, with the language's indentation past it; Mod-Enter opens an unchanged line below at that indentation; Shift-Enter breaks to a bare line with neither, keeping the fence's quote or list indent as it now does in any code block. Enter and Mod-Enter run CodeMirror's own command on the block as its language reads it, and the result lands back behind the line's prefix.
- **Fence words (Task 1.1):** a space joins a diff word to its language too (`diff ts`, `ts diff`). `codeFence` reads the whole info string, past which only the first word counts, and the scan hands it that string, so `fenceLang` retired. The colors and the page's parse nest a fence's language through lezer's `parseCode` (`nestedCode`) rather than Markdown's `codeLanguages`, which hands a resolver only the first word, so the tag, the colors, and the page's parse agree on a multi-word info string; `@lezer/markdown` became a declared dependency at the version already installed.
- **Caret height beside a line number (Task 3.3):** a codeblock's number sets `line-height: normal`, so a caret seated against it is as tall as the code's text.
- **Pill (Task 4.2):** the counts mix toward the secondary label; the pill has 2px of inner padding, a `--width-175` outline through UIX's new `--button-outline-width` knob, and a divider in `--border-strong` through segment's new `--segment-color` knob. Its segments come from UIX's exported `buttonClass` and `segmentDivider`, which `Button` and `Segmented` use themselves. A copy keeps the pill's size: the counts fade out as "Copied" fades in over them.
- **Visual pass waived:** Nathan's words: "Assume the visuals look good but the interaction needs true testing to confirm absolute perfection." The 3.3 and 4.2 hand-checks are closed by that ruling, and the interaction testing in the closeout replaces them.
- **Final verification:** run as Nathan specified: an interaction-testing agent over every churn item, then simplification and adversarial reviewers, then a neutral verification over the plan's commit and HEAD, then the orchestrator's own pass.
