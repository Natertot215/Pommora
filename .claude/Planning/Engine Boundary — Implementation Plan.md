## Engine Boundary — Implementation Plan

> **Status:** ratified 09-07-2026 (A1) · Spec: audit topic 3 (R-13, R-14, R-15, R-16), 09-07-2026 · Three phases, each closed by `/closeout` and its own commit · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. Sequenced after State Placement Phase One.

**Goal**

Core is two programs in one tree: an engine the host runs (163 files reachable from `Core/Contract/serve.ts` and the host's own Core imports, zero `.tsx`, three external packages) and a renderer the window runs. The split is clean today and nothing holds it that way. At the end, three gates fail the moment the engine reaches for React, a `.tsx` file, a DOM global, or an undeclared package; every channel across the bridge answers the same `Result` envelope with no exception to remember; and Core's test suite runs with no import from Desktop, while Desktop proves its own filesystem and SQLite implementations against contract suites a second host can run unchanged.

The alternative weighed was leaving the property implicit and catching drift in review. It was rejected because the drift is silent: an engine file that imports React compiles, tests, and ships, and the failure surfaces months later as a second host that cannot build. A guard is forty lines; the discovery is a rewrite.

Bounded to the four findings. Refiling the 26 engine files that sit inside interface folders (R-13's filing half) is not in scope; the guard makes the property checkable without moving anything.

**Requirements**

1. A Vitest guard walks the engine graph and fails on any `.tsx` or `.css.ts` file, any external package outside a named allowlist, and any UIX file outside the three pure utilities it reaches today.
2. The main-process typecheck rejects a DOM global inside an engine file.
3. Core's manifest declares every package Core imports and nothing it does not; a guard keeps it that way.
4. Every Ask in `bridge.ts` answers `Result`. No channel is a declared exception, and no handler catches its own throw to hand back a bare value.
5. The IPC serve loop has a test proving a throw arrives as a failed envelope.
6. Core's tests import nothing from `@pommora/desktop`; the devDependency is gone.
7. A Machine contract suite and a Stores contract suite live in `Core/Testing`, run in Core against the test implementations and in Desktop against `nodeMachine` and the SQLite stores.
8. `writeRaw` is gone from the Machine interface and both implementations.

**Acceptance — the whole thing working:** Add `import { useState } from 'react'` to `Core/Nexus/session.ts` and a `document.title` read to `Core/Files/walk.ts`; `npm run test` and `npm run typecheck` both go red, and revert. Delete `@codemirror/lang-css` from `Core/package.json`; the manifest test goes red, and revert. Run `cd Core && npx vitest run` with `Desktop/` renamed away; the Core project passes. Every `reply:` in `bridge.ts` is a `Result`, checked by a search with `nexus:state` as its control token.

**Forced By** *(what each grounded fact makes mandatory or impossible)*

- `Desktop/tsconfig.node.json` sets `"types": ["node"]` and no `"lib"`, so `target: ES2022` supplies the DOM lib by default; `tsc -p Desktop/tsconfig.node.json --lib es2022` passes today with no edits → the one-line fix is safe now and a probe that costs nothing. → Task 1.
- The engine graph from `serve.ts` is 156 files; the union with Desktop's 37 direct Core imports is 163. The seven host-only modules (`Actions/pasteAsMenu`, `MarkdownPM/Embeds/webpageEmbed`, `MarkdownPM/Links/pasteDecision`, `Nexus/watchSettle`, `Platform/assetScheme`, `Web/partition`, `Web/titleScan`) are engine code too → the walker takes roots, and two tests call it: Core from `serve.ts`, Desktop from its own Core imports. → Tasks 2, 3.
- The engine reaches three UIX files — `Theme/colors.ts`, `Utilities/clamp.ts`, `Utilities/moveItem.ts` — all pure TypeScript → the guard names them exactly, so a fourth is a deliberate edit rather than a silent widening. → Task 2.
- Core imports eight packages no Core manifest declares (`@codemirror/lang-javascript`, `@codemirror/lang-css`, `@codemirror/lang-html`, `@lezer/highlight`, `@vanilla-extract/css`, and the type packages behind `mdast`, `react`, `react-dom`) and declares one it never imports (`write-file-atomic`, with its types) → the fix is eight in and two out, not five and two. → Task 4.
- `Desktop/Bridge/ipc.ts:18-24` wraps every Ask in `try { … } catch { return fail(…) }` → 25 channels typed as bare values already deliver `{ ok: false }` on a throw; the type is the lie, not the runtime. → Task 6.
- No caller of the five reply-less channels (`clipboard:write` ×7, `path:reveal` ×2, `trash:report` ×2, `error:show` ×15, `link:open` ×3) reads the reply → `Result<null>` costs zero caller edits, so there is no reason to keep an exception. → Task 6.
- `stubDialer` (`Core/vitest.setup.ts`) answers `undefined` for an unstubbed channel → after the envelope, a renderer test hitting an unstubbed channel throws on `.ok` of `undefined`. That is the correct loud failure; the default stays. → Task 7.
- The State Placement plan removes the `activeViews` and `viewOrders` channel pairs (its Phase 1 removes the former) → the channel list is re-derived at execution by the enumeration in Task 6, never copied from this document.
- A memory Machine installed globally breaks 63 of Core's 304 test files (measured 09-07-2026): 68 files seed fixtures through `node:fs` and read Core's results back the same way → Core's integration suite runs over a real disk, and the test Machine is disk-backed. → Decision A, Task 9.
- `Desktop/vitest.config.ts` names `../Core/vitest.setup.ts` as its setup file → the moment Core's setup stops installing `nodeMachine`, Desktop's nine tests lose their Machine; Desktop needs its own setup. → Task 9.
- The SQL in `Desktop/Store/stores.ts` is covered only through `Core/Index/*.test.ts` and `Core/Platform/localState.test.ts` → when those go to memory stores, the SQL loses every test unless Desktop runs the contract suites. → Tasks 10, 11.
- Four test sites drive SQLite directly through `sessionDb()`: the "missing tables" case (`contentIndex.test.ts:100`) is SQLite-specific and moves to Desktop; `dump()` and the two sabotage sites (`indexMaintenance.test.ts:25,38`, `indexSeed.test.ts:64`) need the memory store to expose its tables. → Tasks 10, 12.
- The in-memory Machine in `Core/Platform/machine.test.ts:26-95` fakes `sha256Hex` as `sha256:${text}` and its `lock` refuses a *concurrent* same-key take (`held.has(key)` is checked synchronously at call time) where `serializeOnFile` queues it and refuses only a nested re-take → both are fixed in the hoist, and the contract suite is what catches the next divergence. → Tasks 9, 10.

**Inherited Reasoning**

- A second host's proof is the contract suite, not Core's integration suite. Whether Core's 300 files run over memory or over a disk, what a new host runs against its own `Machine` and stores is `describeMachine` and `describeStores`. That is the deliverable every option below shares.
- Every Ask answers `Result`, with no fire-and-forget carve-out. A uniform rule with zero cost beats a named exception that has to be remembered per channel.
- `NexusState` keeps no `error` arm once the envelope carries failure; two ways to say "the tree could not be read" is the kind of duplication the envelope exists to remove.
- The walker is a regex over source, not Vite's module graph. It has to resolve `@pommora/core/`, `@pommora/uix/`, relative paths, and `import()`; type-only imports count, because the boundary is about what a file names, not only what it loads.
- The 26 engine files inside interface folders stay where they are. The guard makes the property checkable; the refiling is a separate, larger decision the audit priced at L.

**Decisions — ratify before Phase Three**

**Decision A — what Machine Core's tests run over.** The audit's "build an in-memory machine" is not the M it was priced at: a memory Machine installed globally breaks 63 files, and the fake would have to grow real directory rename and remove semantics to pass them. Three real options:

| Option | Cost | What Remains |
| --- | --- | --- |
| **A1 (recommended).** `Core/Testing/machines.ts` holds `memoryMachine()` (hoisted) and `diskMachine()` (about 45 lines over `node:fs`, plain writes, a chain lock on `AsyncLocalStorage`). Core's setup installs `diskMachine()`. | Zero test rewrites; `diskMachine` duplicates `nodeMachine`'s read side nearly line for line. The plan names it as a duplicate. | Nothing. Core's suite runs with no Desktop. |
| **A2.** Memory everywhere: 63 files rewritten off `node:fs`, the memory Machine grown into a real filesystem fake. | L. Fails the regret test on churn alone. | Nothing. |
| **A3.** Keep the single `nodeMachine` import in `Core/vitest.setup.ts`; fix only the stores. | Zero duplication. | The `@pommora/desktop` devDependency and one import. R-14 half-open. |

A1 is the least-regret path because no zero-duplication path also removes the dependency: a shared Node adapter package reproduces the Core → adapter → Core arrow. The tasks below are written for A1; under A3, Task 9 shrinks to the stores half and Requirement 6 is struck.

**Grounding** *(re-open these; don't cite them)*

- `Core/Contract/serve.ts` · `Core/Contract/handlers.ts` · `Core/Contract/result.ts` · `Desktop/Bridge/ipc.ts` · `Desktop/Bridge/preload.ts` — the bridge, both ends.
- `Core/Contract/bridge.ts` — 116 declared channels; 25 `reply:` types are not `Result` (enumerated in Task 6).
- `Core/Interface/handlers.ts:24-32` (`scopeGet`) · `Core/Nexus/handlers.ts:102-112` (`nexus:state`) · `Core/Trash/handlers.ts:15-28` (`delete:facts`) — the three self-catches.
- `Core/Platform/machine.ts` · `Core/Platform/stores.ts` · `Core/Platform/localState.ts` · `Desktop/Platform/nodeMachine.ts` · `Desktop/Platform/fileLock.ts` · `Desktop/Store/stores.ts` · `Desktop/Store/sessionDb.ts` · `Desktop/Store/ddl.ts`.
- `Core/Platform/machine.test.ts` — the memory Machine to hoist. `Core/vitest.setup.ts` · `Core/vitest.config.ts` · `Desktop/vitest.config.ts`.
- `Core/package.json` · `Desktop/tsconfig.node.json` · `Core/tsconfig.src.json` (excludes `Testing/**`).
- `Core/MarkdownPM/codeHighlight.ts:9,18,25,26` · `Core/MarkdownPM/Engine/parser.ts:4` — the undeclared imports.
- The 18 Desktop-importing test files: `grep -rl '@pommora/desktop' Core --include='*.test.ts'` plus `Core/vitest.setup.ts`.
- `.claude/Features/DesktopPM.md:12` · `.claude/Features/CorePM.md:180` · `.claude/CLAUDE.md:29` · `.claude/Guidelines/Development-Environment.md:51` · `.claude/ContextPM.md` (the `linkTitles:get` Known Issue) — the documents this makes false.

**Baseline** *(the numbers no phase may move except as named)*

| Gate | 09-07-2026 |
| --- | --- |
| `npm run test` | 341 files · 4,147 tests · all green |
| Core project alone | 304 files · 3,807 tests |
| `npm run typecheck` · `npm run lint` | clean |
| Engine graph from `serve.ts` | 156 files · 0 `.tsx` · externals `ulidx`, `yaml`, `zod` · UIX reach 3 files |
| Engine graph, union with Desktop's 37 Core imports | 163 files · 0 `.tsx` |

Expected deltas: Phase One adds three test files (two graph guards, one manifest guard). Phase Two adds one (`ipc.test.ts`) and changes assertions inside existing stubs. Phase Three adds the contract suites in Core and Desktop and moves one SQLite-specific case from Core to Desktop; the Core file count is otherwise unchanged.

---

#### Phase One: Declare And Guard The Boundary

Closes with `/closeout` and one commit. No behavior changes.

##### Task 1 — The main-process lib

**Why:** Requirement 2. A DOM global inside an engine file is a type error from here on.

**Now** — `Desktop/tsconfig.node.json`:

```json
"target": "ES2022",
"strict": true,
"types": ["node"],
```

**Becomes:**

```json
"target": "ES2022",
"lib": ["ES2022"],
"strict": true,
"types": ["node"],
```

**Verify:**
- automated: `npm run typecheck` green. Red-green: add `const t = document.title` to `Core/Files/walk.ts`, run `tsc -p Desktop/tsconfig.node.json`, read `Cannot find name 'document'`, revert.
- user: none.

##### Task 2 — The engine-graph walker and Core's guard

**Why:** Requirement 1. The property the codebase already has becomes a failing test the first time it is broken.

**Now** — `Core/Testing/` holds `testTree.ts` only. No test walks imports.

**Becomes** — `Core/Testing/engineGraph.ts`:

```ts
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

export interface EngineGraph {
  files: string[]       // repo-relative, sorted
  externals: string[]   // bare package names, sorted
}

// Every `from '…'`, `import '…'`, and `import('…')` in the closure of `roots`, matched anywhere in the file so a Biome-wrapped multi-line import counts, resolved the way the bundler resolves them: `@pommora/core/`, `@pommora/uix/`, relative; `.ts`, `.tsx`, `.css.ts`, `index.ts`. Type-only imports count.
export function engineGraph(repoRoot: string, roots: string[]): EngineGraph
```

`Core/Contract/engineGraph.test.ts`:

```ts
const graph = engineGraph(REPO, ['Core/Contract/serve.ts'])

it('reaches no renderer file', () => {
  expect(graph.files.filter((f) => f.endsWith('.tsx') || f.endsWith('.css.ts'))).toEqual([])
})
it('depends on nothing outside the engine allowlist', () => {
  expect(graph.externals).toEqual(['ulidx', 'yaml', 'zod'])
})
it('reaches exactly the three pure UIX utilities', () => {
  expect(graph.files.filter((f) => f.startsWith('UIX/'))).toEqual([
    'UIX/Theme/colors.ts',
    'UIX/Utilities/clamp.ts',
    'UIX/Utilities/moveItem.ts',
  ])
})
```

**Verify:**
- automated: the three assertions pass at 156 files. Red-green: add `import { useState } from 'react'` to `Core/Nexus/session.ts`, the externals assertion reads `['react', 'ulidx', 'yaml', 'zod']`, revert. Add `import './PageWindow'` beside `windowState.ts`'s imports, the `.tsx` assertion fails, revert.
- degenerate: a root that does not exist throws with the path in the message; a specifier that resolves to nothing is reported as an external, so a typo'd path surfaces as an allowlist failure rather than vanishing.
- user: none.

**Assumed by:** Task 3, Task 5.

##### Task 3 — Desktop's host guard

**Why:** Requirement 1, from the host's side: "which Core modules may a host import" gets the answer a second host copies.

**Now** — Desktop's node-side files import 37 Core modules directly (`grep -rhoE "@pommora/core/[A-Za-z/]+" Desktop --include='*.ts' --exclude-dir=out --exclude-dir=Renderer | sort -u`).

**Becomes** — `Desktop/hostGraph.test.ts`:

```ts
// Roots: every `@pommora/core/…` specifier in the files `tsconfig.node.json` includes.
const graph = engineGraph(REPO, hostCoreImports())
it('the host embeds only engine code', () => {
  expect(graph.files.filter((f) => f.endsWith('.tsx') || f.endsWith('.css.ts'))).toEqual([])
  expect(graph.externals).toEqual(['ulidx', 'yaml', 'zod'])
})
```

**Verify:**
- automated: passes at 163 files. Red-green: import `@pommora/core/Interface/App` from `Desktop/main.ts`, fails, revert.
- user: none.

##### Task 4 — Core's manifest

**Why:** Requirement 3. A minor bump that drops a transitive package stops being a silent break of syntax highlighting.

**Now** — `Core/package.json` (18 dependencies, 4 devDependencies; a scan of every bare specifier in Core finds 8 packages undeclared and 1 declared but never imported):

```json
"dependencies": { …, "write-file-atomic": "^8.0.0" },
"devDependencies": {
  "@pommora/desktop": "*",
  "@pommora/uix": "*",
  "@types/node": "^25.9.3",
  "@types/write-file-atomic": "^4.0.3"
}
```

**Becomes** — pinned to the installed versions `npm ls` reports:

```json
"dependencies": {
  "@codemirror/lang-css": "^6.3.1",
  "@codemirror/lang-html": "^6.4.11",
  "@codemirror/lang-javascript": "^6.2.5",
  "@lezer/highlight": "^1.2.3",
  "@vanilla-extract/css": "^1.20.1",
  …existing entries, minus write-file-atomic
},
"devDependencies": {
  "@pommora/uix": "*",
  "@types/mdast": "^4.0.4",
  "@types/node": "^25.9.3",
  "@types/react": "^19.2.17",
  "@types/react-dom": "^19.2.3"
}
```

`@pommora/desktop` leaves here in Task 9, not now: Core's tests still import it until Phase Three.

`Core/manifest.test.ts`:

```ts
// Every bare specifier in a non-test, non-config Core file resolves to a dependency, a devDependency, or a `@types/` devDependency of the same name; a `@pommora/uix/…` specifier counts as `@pommora/uix`. Unused is judged over dependencies and devDependencies with `@types/*` and `@pommora/*` exempt, since nothing imports a type package by name and the workspace entry is the path alias.
it('declares what it imports and nothing else', () => {
  expect(undeclared).toEqual([])
  expect(unused).toEqual([])
})
```

**Verify:**
- automated: `npm install` after the edit; `git diff --stat package-lock.json` shows only the Core workspace entry moving. `npm run typecheck`, `npm run test` green. Red-green: delete the `@codemirror/lang-css` line, the test names it, revert.
- control token: `@codemirror/state` (51 importers) appears in the scanner's declared set.
- user: none.

##### Task 5 — `writeRaw`

**Why:** Requirement 8. An interface method with no caller is a cost on every implementation, including the two Phase Three adds.

**Now** — `Core/Platform/machine.ts:19`, `Desktop/Platform/nodeMachine.ts:32-35`, `Core/Platform/machine.test.ts:40-42` (0 callers: `grep -rn "writeRaw" Core Desktop UIX --include='*.ts'` returns the three definitions).

**Becomes:** none of the three.

**Verify:**
- automated: `npm run typecheck` green; the grep returns nothing, with `writeText` as the control token.
- user: none.

**Phase One gate:** `npm run typecheck` · `npm run test` · `npm run lint`, each read from its summary line under `set -o pipefail`. Then `/closeout`.

---

#### Phase Two: One Envelope

Closes with `/closeout` and one commit.

##### Task 6 — Every Ask answers `Result`

**Why:** Requirement 4. The bridge's type stops contradicting its runtime, the three self-catches come out, and the `linkTitles:get` Known Issue closes.

**Now** — 25 channels typed as bare replies, enumerated at execution (this run's list; State Placement Phase One removes `activeViews:get` and `viewOrders:get` before this executes):

```
python3 - <<'EOF'
import re; s=open('Core/Contract/bridge.ts').read()
for m in re.finditer(r"'([^']+)':\s*\{([^}]*?)\}", s, re.S):
    r=re.search(r"reply:\s*(.+?)(?:;|\n|$)", m.group(2))
    if r and not r.group(1).strip().startswith('Result'): print(m.group(1), '→', r.group(1).strip())
EOF
```

```
nexus:state → NexusState                      subfield:get → SubfieldConfig | null
clipboard:read → string                       navViewModes:get → NavViewModes | null
assets:map → AssetMap                         theme:systemAccent → string | null
folds:get · embedHeights:get · embedZooms:get delete:facts → { trashMode; permanentDelete }
  tableHeadingCols:get · headingIcon:get      linkTitles:get → Record<string, string>
  citations:get · aliases:get                 nexus:pickFile · nexus:pasteImage → string | null
  activeViews:get · viewOrders:get            row-menu → string | null
  → Record<string, …>                         clipboard:write · path:reveal → undefined
                                              trash:report · error:show · link:open → void
```

The three self-catches:

```ts
// Core/Interface/handlers.ts:24-32
export function scopeGet<T>(scope: Scope): () => Record<string, T> {
  return () => { try { return readScope<T>(scope) } catch { return {} } }
}
// Core/Nexus/handlers.ts:102-112 — catches into { status: 'error', error: caught(e) }
// Core/Trash/handlers.ts:15-28 — catches into { trashMode: DEFAULT_TRASH_MODE, permanentDelete: false }
```

`Core/Nexus/tree.ts:111-114`:

```ts
export type NexusState =
  | { status: 'empty' }
  | { status: 'open'; tree: NexusTree }
  | { status: 'error'; error: PommoraError }
```

Renderer sites reading a bare reply, 27 (`grep -rn "'<channel>'" Core --include='*.ts' --include='*.tsx' | grep -v "bridge.ts\|/handlers.ts\|\.test\."` per channel): `nexusSlice.ts:84,89,95,100,105,108,111,114,154,157` · `PageView.tsx:65,145,149,153,157` · `useViewOrders.ts:16` · `useBridgeSubscriptions.ts:26` · `editorHost.tsx:82` · `confirmations.ts:28,101` · `useBannerMenu.ts:48` · `filePick.ts:36` · `ImagePicker.tsx:123,187` · `useNexusIcon.ts:24` · `nativeMenus.ts:15`. Existing `res.ok ? res.value : …` sites: 14.

**Becomes** — `Core/Contract/result.ts` gains one reader, used by the 14 existing sites and the new ones:

```ts
export const valueOr = <T>(r: Result<T>, fallback: T): T => (r.ok ? r.value : fallback)
```

`bridge.ts`: every `reply:` above becomes `Result<…>`; the five reply-less channels become `Result<null>`. `NexusState` loses its `error` arm. Handlers return `ok(…)`; `scopeGet` is `() => ok(readScope<T>(scope))`; `delete:facts` and `nexus:state` return `ok(…)` with no try. `nexusSlice.load` reads `const res = await host().ask('nexus:state'); if (!res.ok) { set({ status: 'error', error: res.error }); return }` and switches on `res.value.status` with two arms. Each renderer site takes `valueOr(res, <the fallback the self-catch used to supply>)`: `{}` for the scope reads, `''` for `clipboard:read`, `null` for the pickers and the accent, `EMPTY_ASSET_MAP` for `assets:map`, `{ trashMode: DEFAULT_TRASH_MODE, permanentDelete: false }` for `delete:facts`.

**Verify:**
- automated: the enumeration above prints nothing, with `'nexus:state'` present in the file as the control token. `npm run typecheck` green (a missed caller is a type error on `.ok`). Red-green for the closed Known Issue: a new `Core/Web/handlers.test.ts` makes `readScope` throw and asserts `linkTitles:get` answers `{ ok: false }` rather than a rejection or a bare object.
- automated: `grep -rn "try {" Core/Interface/handlers.ts Core/Trash/handlers.ts` returns nothing for the removed sites, with `Core/Assets/handlers.ts:61` (the migration catch, unchanged) as the control token.
- user: none.

**Assumed by:** Task 7, Task 8.

##### Task 7 — The test stubs

**Why:** Requirement 4's blast radius. 59 tests build a dialer through `stubDialer`; those stubbing an envelope channel with a bare value now answer the wrong shape.

**Now** — stubs of the 25 channels across 16 files, 44 sites (`row-menu` 17, `nexus:pickFile` 6, `link:open` 4, `activeViews:get` 3, `viewOrders:get` 3, `error:show` 3, `clipboard:write` 2, seven more at 1 each). `stubDialer`'s unstubbed default is `undefined`.

**Becomes:** each stub returns `ok(<what it returned>)`. The default stays `undefined`: a renderer test that reaches an unstubbed envelope channel fails with `TypeError: Cannot read properties of undefined (reading 'ok')`, which names the missing stub. A failed envelope as the default would pass silently through every `valueOr`.

**Verify:**
- automated: `npm run test` green at 341 files. Expected failure class before the stubs are updated: the `TypeError` above, and only that class.
- user: none.

##### Task 8 — The serve loop's test

**Why:** Requirement 5. The one test that would have caught R-16 at the time.

**Now** — `Desktop/Bridge/ipc.ts` has no test (`grep -rl serveIpc --include='*.test.ts' Desktop` is empty).

**Becomes** — `Desktop/Bridge/ipc.test.ts`, with `electron` mocked to capture `ipcMain.handle` and `ipcMain.on` registrations:

```ts
it('registers one handler per Ask and one listener per Tell', …)
it('a handler that throws answers { ok: false, error: { code: "operation-failed" } }', …)
it('a handler that returns a Result passes it through untouched', …)
it('a Tell reaches its handler with the sender window', …)
```

**Verify:**
- automated: the four pass; the throw case goes red with the `try` in `serveIpc` removed.
- user: none.

**Phase Two documents** (reconciled in the closeout, replaced not amended): `DesktopPM.md:12` drops "a few channels answer more plainly …"; `CorePM.md:180` and `.claude/CLAUDE.md:29` read "every channel answers with the `Result` envelope"; `Development-Environment.md:51` (the `window`-kind handler line describes a mechanism `serveIpc` no longer has) is rewritten as "every Ask answers through `serveIpc`'s one catch, and a handler never catches its own throw to hand back a bare value"; `ContextPM.md`'s `linkTitles:get` Known Issue is removed.

**Phase Two gate:** `npm run typecheck` · `npm run test` · `npm run lint`. Then `/closeout`.

---

#### Phase Three: Core's Tests Stand Alone

Closes with `/closeout` and one commit. Executed under Decision A1 unless ruled otherwise.

##### Task 9 — The test machines

**Why:** Requirement 6. Core's suite installs a Machine that Core owns; Desktop's suite installs the real one.

**Now** — `Core/vitest.setup.ts:2,5`:

```ts
import { nodeMachine } from '@pommora/desktop/Platform/nodeMachine'
installMachine(nodeMachine)
```

`Core/Platform/machine.test.ts:26-95` — `memoryMachine()` inline, with the two divergences named under Forced By. `Desktop/vitest.config.ts:5` — `setupFiles: ['../Core/vitest.setup.ts']`. `Core/package.json` — `"@pommora/desktop": "*"`.

**Becomes** — `Core/Testing/machines.ts`:

```ts
import { createHash } from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import type { Machine } from '../Platform/machine'

// The lock both test machines share: overlapping takes of one key queue in call order; a nested re-take of a held key rejects. The same contract `Desktop/Platform/fileLock.ts` implements for the host.
export function chainLock(): Machine['lock']

export interface MemoryFs { files: Map<string, { text: string; mtimeMs: number }>; dirs: Set<string> }
// A Machine over two maps. `fs` is handed back so a test can seed and inspect without the Machine.
export function memoryMachine(): { machine: Machine; fs: MemoryFs }

// A Machine over `node:fs` for the suites that seed a real temp directory. Plain writes: nothing under test observes atomicity. Reads mirror `nodeMachine`; this is the one deliberate duplicate in the plan.
export function diskMachine(): Machine
```

`Core/vitest.setup.ts`: `installMachine(diskMachine())`. `Desktop/vitest.setup.ts` (new): imports `../Core/vitest.setup` for `stubDialer` and the jsdom shims, then `installMachine(nodeMachine)`; `Desktop/vitest.config.ts` names it. `machine.test.ts` imports `memoryMachine` and keeps its four cases over `fs`. `Core/package.json` drops `@pommora/desktop`.

**Verify:**
- automated: `npm run test` green at the baseline counts. `grep -rl '@pommora/desktop' Core` returns `Core/package.json` only until Task 12, with `@pommora/uix` as the control token.
- red-green for the lock fix: a contract case (Task 10) issues two concurrent `lock('a', …)` calls and expects both to resolve in order; it fails against the old memory lock and passes against `chainLock`.
- user: none.

**Assumed by:** Tasks 10, 11, 12.

##### Task 10 — The contract suites

**Why:** Requirement 7. The proof a second host runs, and the crossing test between Core's test implementations and Desktop's real ones.

**Now** — no shared suite; `Desktop/Store/stores.ts`'s SQL is tested only through Core's Index and localState tests.

**Becomes** — `Core/Testing/machineContract.ts` and `Core/Testing/storesContract.ts`:

```ts
export function describeMachine(name: string, make: () => Promise<{ machine: Machine; root: string }>): void
// readText/readBytes absent → null · write then read · stat fields and isDirectory · readDir kinds and absent → [] · mkdir created/exists · rename · remove · utimes moves mtimeMs · realpath · sha256Hex of '' is e3b0c442… · lock: order, concurrency, re-entrant rejection, nested different keys

export function describeKeyValueStore(name: string, make: () => KeyValueStore): void
export function describeContentIndexStore(name: string, make: () => ContentIndexStore): void
// upsert then every query · null-value serialization · removePathIndex · rename and prefix rename, including the '%' folder name and an astral character · the stat gate row lands last
export function describeSnapshotStore(name: string, make: () => SnapshotStore): void
```

`Core/Testing/memoryStores.ts`:

```ts
export interface MemoryIndex { mentions; values; memberships; stats }  // the four tables as Maps, exposed for dump and sabotage
export function memoryStores(): { stores: Stores; index: MemoryIndex }
```

`Core/Platform/stores.ts` exports `NO_STORES` (the `{ keyValue: null, contentIndex: null, snapshots: null }` literal spelled at `stores.ts:55` and `sessionDb.ts:57`); both use it.

Core runs the suites in `Core/Testing/contracts.test.ts` against `memoryMachine`, `diskMachine`, and `memoryStores`. Desktop runs them in `Desktop/Platform/nodeMachine.test.ts` and `Desktop/Store/stores.test.ts` against `nodeMachine` and the three SQLite stores over a temp `nexus.db`; the "missing tables answer like a null Db" case from `contentIndex.test.ts:100` moves into `stores.test.ts`.

**Verify:**
- automated: every suite green against all five implementations. Red-green: reintroduce the `sha256:${text}` fake in `memoryMachine`, the digest case fails, revert.
- crossing: the `%` folder name and astral-character prefix-rename cases (`stores.ts:41,84` comments describe them) pass against both SQLite and the Map implementation.
- user: none.

##### Task 11 — Nothing in Core's tests opens SQLite

**Why:** Requirement 6. The 18 tests that opened Desktop's database open Core's memory stores instead.

**Now** — 18 files, each with

```ts
import { openSessionDb, closeSessionDb } from '@pommora/desktop/Store/sessionDb'
beforeEach(… openSessionDb(root) …)   afterEach(… closeSessionDb() …)
```

Two of them pass with no store installed at all (`contextWrite`, `tilesFile`; measured by replacing `openSessionDb(root)` with nothing and running the 18); the other 16 need the key-value store, the content index, or the snapshot store through the code they exercise.

**Becomes:** the import is `import { memoryStores } from '../Testing/memoryStores'` (path per file); `beforeEach` calls `installStores(memoryStores().stores)` and `afterEach` calls `installStores(NO_STORES)`. The two that need no store drop the calls entirely. `indexMaintenance.test.ts`'s `dump()` and the two sabotage sites read and edit `memoryStores().index` instead of `sessionDb()`.

**Verify:**
- automated: `grep -rl '@pommora/desktop' Core` returns nothing, with `@pommora/uix` as the control token. Core alone: the file count at the start of Phase Three plus the contract file, the test count minus the one case that moved to Desktop.
- automated: `cd Core && npx vitest run` passes with `Desktop/` temporarily renamed (the acceptance criterion).
- user: none.

##### Task 12 — Residue

**Why:** Requirement 6 closes; nothing points at what Phase Three retired.

**Now:** `Core/package.json` still lists `@pommora/desktop`; `DesktopPM.md:10` describes `nodeMachine` and `fileLock` as the implementation of Core's `Machine` interface.

**Becomes:** the devDependency line gone, `npm install` run, the lockfile diff read. `DesktopPM.md:10` adds that Desktop proves both against the contract suites in `Core/Testing`. `CorePM.md`'s Host Boundary paragraph names `Core/Testing` as where a host's proof lives.

**Verify:**
- automated: `npm run typecheck` · `npm run test` · `npm run lint` green.
- user: none.

**Phase Three gate:** the three commands, then `/closeout`.

---

#### What Is Removed

- `writeRaw` from the interface and two implementations (Task 5).
- `write-file-atomic` and `@types/write-file-atomic` from Core's manifest (Task 4); `@pommora/desktop` (Task 12).
- Three handler self-catches and `NexusState`'s `error` arm (Task 6); 14 spelled-out `res.ok ? res.value : …` reads fold onto `valueOr`.
- The inline memory Machine in `machine.test.ts` (Task 9, moved).
- 18 `openSessionDb`/`closeSessionDb` pairs and their imports (Task 11); one duplicated `NO_STORES` literal (Task 10).
- Four documentation claims that stop being true in Phase Two.

#### Completion Criteria

- [x] Requirement 1: the two graph guards exist and go red under the named probes.
- [x] Requirement 2: `"lib": ["ES2022"]` is in the main-process tsconfig and the `document.title` probe goes red.
- [x] Requirement 3: the manifest guard reports zero undeclared and zero unused, and goes red when a declared line is removed.
- [x] Requirement 4: the enumeration prints nothing; no handler self-catches; `NexusState` has two arms.
- [x] Requirement 5: `ipc.test.ts` proves a throw arrives as a failed envelope.
- [x] Requirement 6: `grep -rl '@pommora/desktop' Core` is empty and Core's project passes with `Desktop/` renamed away.
- [x] Requirement 7: five implementations pass the contract suites.
- [x] Requirement 8: `writeRaw` has no definition.
- [x] Every document under Grounding's last line reads true, and `ContextPM.md` no longer lists the `linkTitles:get` issue.
- [x] Three closeouts, each with its regret test answered and its commit named under Progress.

#### Log

**Rulings**

- 09-07-2026 — "This must be done after the first phase" read as: this plan executes after State Placement Phase One lands, which is why Task 6 re-derives the channel list rather than freezing it. Confirm the reading at ratification.
- 09-07-2026 — Each phase closes with `/closeout` and its own commit.
- 09-07-2026 — Decision A ruled **A1**: `diskMachine()` in `Core/Testing/machines.ts`; Core's setup installs it, Desktop's setup installs `nodeMachine`.
- 09-07-2026 — Execution is by Opus subagents; no code comments are added by any task.

**Progress**

- [x] Phase One — Tasks 1–5 · commit `1721d8b80` · gates green, 344 files. Regret test: removing it leaves the engine/renderer boundary unguarded and `writeRaw` dead — keep.
- [x] Phase Two — Tasks 6–8 · commit `72fee60ab` · gates green, 350 files. Regret test: removing it restores the bridge type-lie, three self-catches, and the `NexusState` error arm — keep.
- [x] Phase Three — Tasks 9–12 · commit `588b37bcf`, cleanup `a11daf6ad` · gates green, 356 files; Core passes with `Desktop/` renamed away (313 files). Regret test: removing it re-inverts the layering and drops the second-host contract proof — keep.

**Deviations**

- 09-07-2026 — Executed concurrently with the State Placement plan in the same shared working tree. Coordination held throughout by committing each phase with `git commit --only -- <explicit paths>` so neither arc swept the other's files. Phase One committed disjointly before State Placement's first commit; Phases Two and Three were sequenced with the State Placement session (it held the `viewOrders` channels and the `remint`/`importPlacedState` tests while this plan landed, then rebased onto the commits). The five Features-doc/CLAUDE.md corrections were nonetheless swept into State Placement commits (`e5bccd57e`, `4d6f206a9`) via the shared git index — the content is exactly this plan's, so the edits are correct though attributed to another commit.
- 09-07-2026 — Task 6 enumerated 24 off-envelope channels at execution, not the plan's 25: State Placement had already removed `activeViews:get` but not `viewOrders:get`, which this plan enveloped (State Placement deletes the enveloped version later). The five reply-less channels cost one caller edit, not zero: `editorHost.tsx`'s `clipboard:write` slot was typed `Promise<void>` and needed a one-line discard wrapper. `valueOr` folded 36 read sites, not the plan's 14.
- 09-07-2026 — Task 9 `diskMachine` writes atomically (temp+rename), not the plan's "plain writes": two tests force a write failure through a read-only directory, which only an in-directory temp file trips, so plain writes broke them. Atomic mirrors `nodeMachine`'s observable behavior. Task 11 moved two SQLite-specific cases to Desktop (the planned missing-tables case plus a read-only-media case with no memory analog). The engine-graph walker is AST-based (`ts.createSourceFile`), not the regex the plan's Inherited Reasoning named, because a regex mis-read JSX text as an import specifier.
- 09-07-2026 — Scope clarification for the two graph roots. Task 3's `hostCoreImports()` and Task 4's manifest scanner take production host/source code only: `*.test.ts`, `vitest.setup.ts`, and `vitest.config.ts` are excluded as roots and from the manifest scan. Task 4's scan follows `tsconfig.src.json`'s include/exclude (which already excludes `Testing/**`) minus `*.test.ts`. Without this, the new test files' own `node:*` imports (`Testing/engineGraph.ts`, and in Phase Three `Testing/machines.ts`/`machineContract.ts`) would fail the externals and manifest guards for the wrong reason.

**Sequenced After**

- Refiling the 26 engine files that sit inside interface folders (`Interface/Windows/windowState.ts`, `Navigation/tabsState.ts`, `Tiles/tilesFile.ts`, and the rest), so the folder tree states the split the guard now enforces. The audit priced it at L; the guard makes it safe to defer.
- `ContextPM.md`'s fire-and-forget writes item — a `persist()` wrapper over the sixteen `void host().ask(…)` write sites. Adjacent to Task 6, not part of it: the envelope changes what those channels answer, not whether anyone reads it.
