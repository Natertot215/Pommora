## Codeblock Paths — Implementation Plan

**DATE:** 10-08-2026
**STATUS:** Ratified 10-08-2026
**SOURCE:** The 10-08-2026 session's conversation with Nathan: a fence's info word may be a file path or filename, which names its language by its extension, as the language-recognition baseline a later filename heading builds on.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `975f715a4` | 7489 | 10-08-2026 10:46 PM | |

### Context

Every reading of a fence's info string goes through `codeFence` in `Core/MarkdownPM/Engine/codeLangs.ts`, which answers the language a block colors as and whether it draws as a diff. Its three consumers take that answer whole: `scanFencedCode` (`Engine/detect.ts`) for the language tag and the diff tally, `codeLanguage` (`codeHighlight.ts`) for the colors and the language-aware Enter, and `pageCode` for the page's own nested parse. `nestedCode` hands the resolver the whole info string, so no second first-word resolver exists to teach.

`codeFence` first tries `DIFF_WORD`, which finds `diff` or `patch` alone or joined to a language by `-`, `/`, `|`, or a space, and otherwise takes the first word. The resulting word must equal a roster name or alias (`CODE_LANGS`), so `ts` resolves while `src/app.ts`, `/src/app.ts`, `app.ts`, and `\src\app.ts` resolve to nothing. `DIFF_WORD` already isolates the right word for every path shape: `diff/app.ts` yields `app.ts`, `src/app.ts diff` yields `src/app.ts`, and `src/diff/app.ts` and `diff.ts` match no diff.

### Overview

A fence word that is a path or filename resolves through its file: the text past its last `/` or `\`, then that file's final extension, or the whole filename when it has none (`docker/Dockerfile`), so `app.test.ts` reads as `ts`. Every existing roster word carries no `/`, `\`, or `.`, so each reaches the roster exactly as it does today. A backslash joins `diff` to its language the way `/` does, so `diff\app.ts` reads as a TypeScript diff. The roster gains the common extensions it lacks as aliases, which typed alone resolve too, and JSON's parser becomes one that also reads comments and trailing commas, so a `jsonc` block colors its comments as comments. The language tag still names the language; the filename itself isn't surfaced yet.

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `fileTerm` • Function | Reduces a fence word to the part that names its language: a path's file, then that file's final extension, or the file whole when it has none. | `Core/MarkdownPM/Engine/codeLangs.ts` |
| `@shopify/lang-jsonc` • Dependency | JSON's grammar with line and block comments and trailing commas, under the same highlight tags as `@lezer/json`; JSON's loader. | `Core/package.json` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `@codemirror/lang-json` • Dependency | JSON's loader until now; `codeHighlight.ts` was its only importer. | `Core/package.json` |

#### Constraints

- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint` from the repo root; lint runs clean.
- **Frozen:** `codeFence`'s signature and return shape; no `file` field is added until the filename heading needs one.
- **Conventions:** No new comments beyond the docstrings `codeLangs.ts` already carries per export; one resolver, no second parse of the info string.
- **Out of Scope:** Paths containing spaces (the first-word rule stands), and the filename heading itself.

#### Process Overview

- [ ] **Phase 1** — Path Resolution
  - [ ] Task 1-1
  - [ ] Task 1-2
  - [ ] Task 1-3
  - [ ] Task 1-4

---

### Phase 1 — Path Resolution

**GOAL:** A path or filename in a fence's info string colors, tags, and indents the block as its extension's language, through the one resolver every consumer already reads.

#### Task 1-1

**TASK:** Resolve a fence word through its file, let a backslash join a diff to its language, and read a `.diff` or `.patch` file as a diff.

**NOW:** The word reaches the roster lookup as written; `DIFF_WORD`'s joiners are `-`, `/`, and `|`.

**CHANGE**

- [ ] Write the path tests in Task 1-3 and watch them fail.
- [ ] Add `fileTerm`, route the lookup through it, and add `\\` to both joiner classes.

**AFTER**

```diff ts
--- a/Core/MarkdownPM/Engine/codeLangs.ts
+++ b/Core/MarkdownPM/Engine/codeLangs.ts
@@ DIFF_WORD @@
 const DIFF_WORD =
-  /^(?:(?:diff|patch)(?:(?:[-/|]|\s+)(\S+))?|(\S+?)(?:[-/|]|\s+)(?:diff|patch))(?:\s|$)/
+  /^(?:(?:diff|patch)(?:(?:[-/|\\]|\s+)(\S+))?|(\S+?)(?:[-/|\\]|\s+)(?:diff|patch))(?:\s|$)/
+
+/** A path names its language through its file, and a file through its extension, or through its whole name when it has none, as `Dockerfile` does. */
+function fileTerm(word: string): string {
+  const file = word.slice(Math.max(word.lastIndexOf('/'), word.lastIndexOf('\\')) + 1)
+  return file.slice(file.lastIndexOf('.') + 1)
+}
 
-/** The one reading of a fence's info string: the language its code colors as, and whether it draws as a diff — `diff` or `patch` alone, or joined to a language by `-`, `/`, `|`, or a space on either side. Past that, only the first word counts. A null name selects no parse, and the fence wears no language tag. */
+/** The one reading of a fence's info string: the language its code colors as, and whether it draws as a diff — `diff` or `patch` alone, or joined to a language by `-`, `/`, `\`, `|`, or a space on either side. Past that, only the first word counts, and a path or filename there names its language by its extension, a `.diff` or `.patch` file drawing as a diff. A null name selects no parse, and the fence wears no language tag. */
 export function codeFence(info: string): { name: CodeLangName | null; diff: boolean } {
   const text = info.trim().toLowerCase()
   const m = DIFF_WORD.exec(text)
-  const lang = m ? (m[1] ?? m[2]) : text.split(/\s/, 1)[0]
+  const lang = fileTerm(m?.[1] ?? m?.[2] ?? text.split(/\s/, 1)[0])
   const named = CODE_LANGS.find(
     (l) => l.name.toLowerCase() === lang || l.alias.some((a) => a === lang),
   )
-  return { name: named?.name ?? null, diff: m !== null }
+  return { name: named?.name ?? null, diff: m !== null || lang === 'diff' || lang === 'patch' }
```

A bare `diff` leaves both captures empty, so it falls through to its first word, which names no language, as today. A `.diff` or `.patch` file draws as a diff with no colors, its extension being the diff marker itself.

Only the final extension counts, so `app.test.ts` and `app.d.ts` read as `ts`. `lastIndexOf('.')` answering `-1` makes `slice(0)`, so a dotless file passes whole; `file.` and `src/` resolve to the empty word and name nothing.

**VERIFY**

- [ ] Task 1-3's tests pass, and every existing `codeLangs.test.ts` case passes unchanged.

#### Task 1-2

**TASK:** Add the common extensions the roster lacks as aliases.

**NOW:** `app.mjs`, `app.h`, `index.htm`, `build.gradle.kts`, and `tsconfig.jsonc` would resolve to nothing.

**AFTER**

```diff ts
--- a/Core/MarkdownPM/Engine/codeLangs.ts
+++ b/Core/MarkdownPM/Engine/codeLangs.ts
@@ CODE_LANGS @@
-  { name: 'JavaScript', alias: ['js', 'javascript', 'jsx'] },
-  { name: 'TypeScript', alias: ['ts', 'typescript', 'tsx'] },
-  { name: 'JSON', alias: ['json'] },
+  { name: 'JavaScript', alias: ['js', 'javascript', 'jsx', 'mjs', 'cjs'] },
+  { name: 'TypeScript', alias: ['ts', 'typescript', 'tsx', 'mts', 'cts'] },
+  { name: 'JSON', alias: ['json', 'jsonc'] },
 …
-  { name: 'HTML', alias: ['html'] },
+  { name: 'HTML', alias: ['html', 'htm'] },
 …
-  { name: 'Kotlin', alias: ['kotlin', 'kt'] },
+  { name: 'Kotlin', alias: ['kotlin', 'kt', 'kts'] },
 …
-  { name: 'C', alias: ['c'] },
-  { name: 'C++', alias: ['cpp', 'c++'] },
+  { name: 'C', alias: ['c', 'h'] },
+  { name: 'C++', alias: ['cpp', 'c++', 'cc', 'cxx', 'hpp', 'hh'] },
 …
-  { name: 'XML', alias: ['xml'] },
+  { name: 'XML', alias: ['xml', 'svg'] },
 …
-  { name: 'Perl', alias: ['perl', 'pl'] },
+  { name: 'Perl', alias: ['perl', 'pl', 'pm'] },
 …
-  { name: 'Clojure', alias: ['clojure', 'clj'] },
+  { name: 'Clojure', alias: ['clojure', 'clj', 'cljs', 'cljc', 'edn'] },
 …
-  { name: 'Groovy', alias: ['groovy'] },
+  { name: 'Groovy', alias: ['groovy', 'gradle'] },
```

**VERIFY**

- [ ] `lets no word name two languages` passes.

#### Task 1-3

**TASK:** Pin the path readings, and rewrite the Code-blocks entry's language claim.

**AFTER**

```diff ts
--- a/Core/MarkdownPM/Engine/codeLangs.test.ts
+++ b/Core/MarkdownPM/Engine/codeLangs.test.ts
@@ describe('a fence word') @@
+  it('resolves a path or filename by its extension, however its folders are written', () => {
+    for (const word of ['app.ts', '.ts', 'src/app.ts', '/src/app.ts', '\\src\\app.ts', 'C:\\src\\app.ts'])
+      expect(codeFence(word)).toEqual({ name: 'TypeScript', diff: false })
+  })
+  it('reads only a filename’s final extension', () => {
+    expect(codeFence('app.test.ts').name).toBe('TypeScript')
+  })
+  it('resolves a filename with no extension by its whole name', () => {
+    expect(codeFence('docker/Dockerfile').name).toBe('Dockerfile')
+  })
+  it('answers nothing for a path whose file names no language', () => {
+    expect(codeFence('src/')).toEqual({ name: null, diff: false })
+    expect(codeFence('app.')).toEqual({ name: null, diff: false })
+    expect(codeFence('src/app.foo')).toEqual({ name: null, diff: false })
+  })
+  it('reads a diff joined to a path, and no diff in a path through a diff folder or file', () => {
+    for (const word of ['diff/app.ts', 'diff\\app.ts', 'diff src/app.ts', 'src/app.ts diff', 'ts\\diff'])
+      expect(codeFence(word)).toEqual({ name: 'TypeScript', diff: true })
+    expect(codeFence('src/diff/app.ts')).toEqual({ name: 'TypeScript', diff: false })
+    expect(codeFence('diff.ts')).toEqual({ name: 'TypeScript', diff: false })
+  })
+  it('reads a diff or patch file as a diff with no colors', () => {
+    expect(codeFence('changes.diff')).toEqual({ name: null, diff: true })
+    expect(codeFence('src\\fix.patch')).toEqual({ name: null, diff: true })
+  })
@@ describe('a code block’s colors') @@
+  it('come from the language a path’s extension names', async () => {
+    expect(await painted('```src/app.js\nconst a = 1\n```')).toEqual(['const'])
+  })
```

```diff md
--- a/.claude/Features/MarkdownPM.md
+++ b/.claude/Features/MarkdownPM.md
@@ Code-blocks @@
-… Its info word sets the language, with any of the thirty-seven in the roster …
+… Its info word sets the language — by name, by alias, or as a file path or filename that names it through its extension (`src/app.ts`, `\src\app.ts`) — with any of the thirty-seven in the roster …
-… alone or joined to a language by `-`, `/`, `|`, or a space (`diff-ts`, `ts|diff`, `ts diff`), …
+… alone or joined to a language by `-`, `/`, `\`, `|`, or a space (`diff-ts`, `ts|diff`, `diff/app.ts`), or a `.diff` or `.patch` file, …
```

**VERIFY**

- [ ] Run the gates.
- [ ] Live: in `~/Test`, ` ```src/app.ts `, ` ```\src\app.ts `, and ` ```diff/app.ts ` each color as TypeScript and wear its tag (the last as a tally).

#### Task 1-4

**TASK:** Swap JSON's loader to `@shopify/lang-jsonc`, so JSON and JSONC blocks color their comments and keep their trailing commas whole.

**NOW:** `@codemirror/lang-json` parses JSON strictly; a comment becomes an error node that draws uncolored. Its grammar and `@shopify/lang-jsonc`'s differ only by the comment and trailing-comma rules, and both tag `PropertyName`, `String`, `Number`, `True False`, and `Null` identically, so every valid JSON block colors exactly as before.

**CHANGE**

- [ ] Write the comment test and watch it fail.
- [ ] `npm uninstall @codemirror/lang-json -w Core` then `npm install @shopify/lang-jsonc@^1.0.1 -w Core`.
- [ ] Repoint the loader.

**AFTER**

```diff ts
--- a/Core/MarkdownPM/codeHighlight.ts
+++ b/Core/MarkdownPM/codeHighlight.ts
@@ LOADERS @@
-  JSON: () => import('@codemirror/lang-json').then((m) => m.json()),
+  JSON: () => import('@shopify/lang-jsonc').then((m) => m.jsonc()),
```

```diff ts
--- a/Core/MarkdownPM/Engine/codeLangs.test.ts
+++ b/Core/MarkdownPM/Engine/codeLangs.test.ts
@@ describe('a code block’s colors') @@
+  it('color a JSON block’s comments as comments', async () => {
+    expect(
+      await painted('```tsconfig.jsonc\n{ // a\n  "b": 1, /* c */\n}\n```', 'json', 'syntax-comment'),
+    ).toEqual(['// a', '/* c */'])
+  })
```

**VERIFY**

- [ ] `grep -rn "lang-json" Core` returns nothing outside `node_modules`.
- [ ] Run the gates.
- [ ] Live: a ` ```json ` block with keys, strings, numbers, `true`, and `null` colors as it did before the swap.

---

### Completion Criteria

Every notation from the ask — `path/file.ts`, `/folder/path.ts`, `file.ts`, `\path\file.ts`, and `diff/file.ts` as a diff — colors, tags, and indents its block as the extension's language; every pre-existing fence word resolves exactly as before; the gates run green.

#### Final Verification

- [ ] Own pass: gates · diff · criteria
- [ ] `/closeout-review` taken
- [ ] Reconciliation walked
- [ ] Report delivered through `/view-changes`

#### Reconciliation

- `Core/MarkdownPM/Engine/codeLangs.ts` — `codeFence`'s docstring: "joined … by `-`, `/`, `|`" and "only the first word counts" — Task 1-1
- `.claude/Features/MarkdownPM.md` — Code-blocks: "Its info word sets the language" and the diff joiner list — Task 1-3
- `Core/package.json` — `@codemirror/lang-json` among the dependencies — Task 1-4

#### Open Items


#### Deviations
