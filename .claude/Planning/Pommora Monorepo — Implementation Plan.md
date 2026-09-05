## Pommora Monorepo — Implementation Plan

> **Status:** ratified — in execution · Spec: [[Pommora Monorepo — Decision Log]] · Execute tasks in order.
> Citations name files and symbols as they stood at `7c7c7542`; re-derive before editing. Every file-level claim traces to a report in `// Planning // MonorepoAudit` (A01–A20), which stays as the evidence annex.

**Goal**

The repository becomes a monorepo at its current root: `Core` (Pommora itself, one folder per thing it has, each holding that thing's logic, surfaces, and styles), `UIX` (the design kit, design only), `Desktop` (everything only true on Electron), `Mobile` and `Sync` (seated), `Showcase` (compiles). The `Pommora/` package folder and the `src/{main,preload,renderer,shared}` split by process dissolve. Every file has a home named for what it is, or its homelessness is a stated decision. Stale layers, compatibility paths, and duplicates leave during the move. Afterward, Nathan can open any folder and tell what belongs in it, a new feature knows where it slots, and a phone or a server can bundle Core without Electron.

It takes this shape because the audit found the seams already right and the filing wrong: 86% of main is host-neutral engine behind one channel table the renderer already speaks; the folders were filed by birth date; the main process fuses an engine to an Electron host; and the menu layer is 5,500 lines where the generic path exists. Disassembly by moves, with the compiler as the gate, preserves the 4,669 commits of behavior by construction. The alternatives (a rewrite; the Mobile plan's folders-only monorepo; engine-versus-interface as the top split) were weighed and rejected in the log's Considered & Rejected; Nathan ratified the axis, the names, and every open item on 09-05-2026.

The desktop app is the same app afterward. Cosmetic drift is accepted only where it unifies or fixes something Nathan would not notice; nothing fine-tuned and intentional changes. No new visible UI: a phase that needs one is a hard stop. This plan does not build Mobile, Sync, or touch handling; it seats them.

**Requirements:** (log decision in parentheses)

1. Six PascalCase workspaces at the root; `Pommora/` dissolves; root holds one Biome, one Vitest with a project per workspace, one root TypeScript file, `.claude/` untouched in place. (A-1, A-5, A-6)
2. `shared/` dissolves into Core, UIX, Desktop; `types.ts` splits into its seven files first. (A-4)
3. Core filed by the 23 domains of B-3, each with its admission rule; pure and React parts in separate subfolders where a domain exceeds about thirty files. (A-8, B-3)
4. The Platform seam: interfaces in `Core/Platform` (machine seam + interface dialer), implemented in `Desktop/Platform` and `Desktop/Renderer`; the handler literal split by domain into Core taking a context object; the preload `api` object deleted for a dialer; the renderer types against `Core/Contract`. (A-7, B-2, B-4, G-7)
5. The dispatcher's nine inline bodies become modules; the governed-key sweep is one mechanism; the two session-singleton reach-ins in primitives take the root as a parameter. (B-4, A03)
6. UIX holds the kit only, categories at its root, importing nothing from Core; the seven misfiled feature files leave; motion has one definition in `UIX/Animations`. (C-1, C-5, C-8)
7. Every list menu on one model (`Core/Actions`), one channel, one native popper (`Desktop/Actions`), one in-app presenter (`Core/Interface`); menu channels 26 → 1. (C-6)
8. The editor takes an `EditorHost` object from its mounter; the pure model lives in `Core/MarkdownPM/Model`; the 41-file `Editor/` bin dissolves. (C-7, A09)
9. Removals at high confidence per F-2 and F-3, including every compatibility path for old on-disk shapes; six dead dependencies and the dead build config gone; the two write-path bugs fixed. (F-2, F-3, B-5)
10. Tooling per G-1..G-7: npm workspaces, `exports` to source, UIX and Core as devDependencies of Desktop, Vitest projects, root Biome, no cross-workspace project references. (G)
11. Docs reconciled per H-6: 199 path citations and 120 bare folder names swept; ArchitecturePM split into a Core map and a Desktop doc; Features tagged; 38 stale claims corrected; CLAUDE.md Hard Rules restated; the Mobile plan's Task 0 and Phase 8 marked superseded with a path table. (H)
12. Names per A-9: Interface, Locations, FileWatch, Platform, Actions/Menus/Actions, SidePane, no Primitives, MarkdownPM unchanged.

**Acceptance — the whole thing working:** From the repo root, `npm run typecheck && npm run test && npm run lint && npm run build` are green; the built desktop app opens a scratch copy of NexusOS, renders the tree, opens a page, edits and saves a body, right-clicks a page row, a table cell, a tile, and the sidebar and gets the same menus as before (native and in-app both), drags a tile, opens the Page Window, Nav Window, Page History, and Settings, changes a setting and sees it apply; `find Core UIX Desktop -name '*.ts*' | xargs grep -l "from 'electron"` lists only files under `Desktop/`; `grep -rl "from '@pommora/core" UIX` → 0; the test count is 321 files / 4,006 tests minus only the tests whose subjects the kill list removed, each named in the Log; the net line delta is negative.

**Forced By**

- The renderer types against `typeof api` from `preload/index.ts:196` via `tsconfig.web.json:19` → the contract's type lives in the Electron host; Task 5 moves `Window.nexus` onto `Core/Contract` before any renderer file moves.
- `types.ts` is the import-graph root for all of `shared/` (A06 §2) → Task 3 splits it first, then dissolves the folder in the same task.
- electron-vite externalizes every runtime dependency and Electron's Node refuses TS under `node_modules` (A19 §5, verified) → Core and UIX are `devDependencies` of Desktop, never `dependencies`; Task 1.
- The Studio format hook resolves Biome upward from the hoisted binary (A17) → `biome.json` at the root; Task 1.
- TS 6 deprecates `baseUrl` and `node10`; cross-workspace `composite` fails (A19 §3) → no `paths` aliases survive; workspaces expose `exports: { "./*": ["./*.ts", "./*.tsx", "./*"] }` (verified: a bare `"./*"` resolves nothing under tsc 6 Bundler resolution, `"./*.ts"` alone misses `.tsx`) and import by package name; Task 1.
- `mutate.ts:79` imports `ipc.ts` for `NO_NEXUS` alone (A01 §3) → the constant moves to `Core/Contract/result.ts` in Task 7 so the dispatcher owes the host nothing.
- All 130 handlers sit in one literal in `main/index.ts` (A04 §3) → a phone cannot spread what it serves until Task 8 splits it; the split precedes the in-process binding sketch.
- 16 of 26 poppers already call `sharedModel(ctx)` and the in-app `useNativeMenus` path exists (A05 §2, A04 §5e) → Task 13 collapses onto `row-menu` rather than inventing a chassis.
- Two primitives call `sessionRoot()` (`journalSlot.ts:37`, `governedWrite.ts:38`) → a journal for a non-open root can never be cleared; Task 9 threads the root.
- Sidecar files have four write paths, one unlocked (`remint.ts:113-128`), and `homepage.json` bypasses `updateNexusConfig` at five sites (A20 §4) → Task 13 fixes both under the lock.
- No users exist (Nathan, F-3) → every compatibility path for old on-disk shapes is deletable; no migration task.

**Inherited Reasoning:** The Mobile plan's Task 0 (folders-only) is a phone-first sequencing choice, not a placement, and its `TreeHolder` indirection exists only because `liveTree.ts` was left in main; both superseded (A-3). The plan's Task 35 declarative api table is rejected; deleting the api object saves 205 lines against it (A-7). Engine-versus-interface as the workspace axis was rejected by Nathan because it put Views, Properties, and Tiles in two workspaces at once (A-8). A rewrite is rejected: it loses behavior no one can enumerate (A-2). The `assetMigrate` and raw-mode paths were listed low-confidence by the audit; Nathan ruled them out on the no-users fact (F-3).

**Grounding**

- `// Planning // Pommora Monorepo — Decision Log.md` — every ruling; the tree in B-3, C-1, D-1.
- `// Planning // MonorepoAudit // A01–A20` — per-file classification, importer counts, kill lists with file:line; the file tables in A01 §1, A03 §1, A06 §1, A07 §1, A09 §1, A11 §1, A13 §1, A15 §1 are the move lists.
- `Pommora/src/shared/bridge.ts` — 149 channels; `Pommora/src/preload/index.ts` — the api object; `Pommora/src/main/index.ts` — 2,071 lines, the handler literal at the ranges A04 §3 gives; `Pommora/src/main/ipc.ts` — `serveBridge` and the kind union.
- `Pommora/package.json`, `electron.vite.config.ts`, `vitest.config.ts`, `tsconfig.{,node,web}.json`, `biome.json`, `electron-builder.yml`, root and package `vercel.json`, both `.gitignore`s — the config surface (A17 §1).
- `.claude/scripts/{loc.py,check-atlas.mjs,comment-ledger.mjs,comment-manifest.mjs}` — path-bound harness (A17 §4).
- `// Guidelines // Development-Environment.md` — gates, parallel-writer rules, the CJS claim that goes half-false.

**Environment:** Plan directory `// Planning`. Spec input: the decision log. Explorer: general-purpose read-only (the audits stand in). Code reviewer and attack reviewer: `build-breaking-agent` (project-designated) on Opus; simplification: `code-simplifier` on Opus. No comment-cleanup agent by ruling. Implementers: Opus for judgment tasks, Haiku for mechanical sweeps (each task names its model). Gate commands read from `package.json` and re-read after Task 1 rewrites it: `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`, run from the root, exit codes read directly. Rules directory: `// Guidelines`. No Workflow tooling; standard agents, one implementer on the tree at a time.

**Shapes:** refactor (baseline invariant: 321 test files / 4,006 tests / 1,019 lint files / `npm run build` green, carried through Phases 1–4 unchanged except where a task names a test it moves or deletes) · removal (Phase 5 inventory per F-2 with the never-delete list below) · fix (Task 13's two write-path bugs, each with a sibling sweep and a red test) · user-visible in effect only (no new UI; every menu family re-verified by hand).

**Global Constraints (every task inherits these):**

- Gates from the repo root, chained with `&&`, exit codes read directly, never piped: `npm run typecheck && npm run test && npm run lint && npm run build`. A gate's file counts are read from its own summary line.
- **Comments:** none by default; a hard cap of twenty comment lines per file; a comment carries only a why the code cannot state. No comment names a value its own declaration holds. No "moved from", "was", "formerly", "TODO", or build-status text anywhere.
- **Scope:** a task's file list is its whole scope. No "while I'm here." No new abstraction, helper, wrapper, or type unless a task's Becomes names it. Ten lines beat a hundred; a task that grows beyond its Becomes stops and reports rather than continuing.
- **Names:** variable and function names stay as they are. The only identifier renames are the eleven same-name collisions A20 §1 lists and the file-level renames A-9 rules; each is logged under Rulings. When a file is renamed or split, its exports read coherently with the new file name.
- **Moves are `git mv`,** never delete-and-create, so history follows. Stage explicit paths; never `git add -A` or a directory. No `git stash`, `checkout .`, `clean`, or `reset` on the shared tree. One tree-touching implementer at a time; confirm the tree is still before dispatching the next.
- **Imports:** cross-workspace by package name (`@pommora/uix/...`, `@pommora/core/...`); inside a workspace, relative. No `paths` aliases survive Task 1.
- **The never-delete list:** anything under `.claude/` except the four harness scripts Task 15 rewrites; `Pommora/build/` (moves to `Desktop/build/`); every test whose subject survives; `Showcase/` (moves, compiles); the `TilesV2-Spec` and both Mobile plan documents.
- Out of scope everywhere: Mobile and Sync implementation; touch handling; any change to on-disk Nexus format; any menu's contents; Showcase beyond compiling; History entry until closeout.
- Live app: kill and relaunch freely; open only the scratch Nexus at `~/Pommora-Scratch/NexusOS` with `POMMORA_USERDATA=~/Pommora-Scratch/userData`; never the real `~/NexusOS`.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `.claude/CLAUDE.md` | "Main owns the filesystem. All fs/Node lives in `src/main`" | Core/Platform is the seam; Desktop implements it | 20 |
| `.claude/CLAUDE.md` | "`src/shared/types.ts` is the cross-process contract" | `Core/Contract` | 20 |
| `.claude/CLAUDE.md` | "run from `Pommora/`" and the launch command | root-run gates and `npm run dev -w Desktop` | 20 |
| `ArchitecturePM` | "Pommora is two programs sharing one window" as the whole shape; §Process Boundary as Pommora-wide rule | Core map / Desktop doc split | 20 |
| `Development-Environment` | "CommonJS main/preload… `require('electron')` fails on ESM" | preload stays CJS for the sandbox; the ESM claim is a transpiler caveat | 20 |
| `Mobile Companion — Implementation Plan` | Task 0's layout and Phase 8's 2,900-line move | superseded; path table appended | 20 |
| `Mobile Companion — Decision Log` | A-6 open; K-1's restatement; "list-menu generalization" as Prospect | A-6 decided; H-1; C-6 inside this plan | 20 |
| every Features doc | `Pommora/src`, `src/main|renderer|shared`, `renderer/<Folder>/` citations (199 + 120 bare) | the new tree | 19 |
| `DesignSystemPM` | spine mirrors `DesignSystem/` subfolders; `Components/` heading | UIX root categories | 20 |
| `PommoraPRD` | `PageID`/`TaskID`/`EventID` keys; `(Projects):` syntax | retired per `identity.ts:5`; corrected | 20 |

**Dead Vocabulary**

- `@shared/` → 0 in `Core UIX Desktop Showcase`. Control: `@pommora/core` → ≥ 200.
- `@renderer/` → 0. Control: `@pommora/uix` → ≥ 100.
- `window.nexus.` in `Core` outside `Core/Platform` → 0. Control: in `Core/Platform` → ≥ 1.
- `Pommora/src` in `.claude` excluding `Planning/MonorepoAudit`, `Planning/*Mobile*`, `Sessions`, `HistoryPM.md` → 0. Control: `Core/` in `ArchitecturePM.md` → ≥ 5.
- `DesignSystem/`, `renderer/Interface`, `renderer/Actions`, `renderer/Utilities`, `src/shared` in `.claude/Features` → 0. Control: `UIX/Menus` in `DesignSystemPM.md` → ≥ 1.
- `assetMigrate`, `sidecarMode`, `INVENTED`, `vite.config.app`, `dist-app`, `react-markdown`, `pngjs` → 0 across the repo excluding `.claude/Planning/MonorepoAudit` and `HistoryPM.md`. Control: `rmwJsonStrict` → ≥ 3.
- `'view-button-menu'`, `'cell-menu'`, `'card-menu'` and the other 23 retired menu channel names (A05 §1 inventory) → 0 in `Core Desktop`. Control: `'row-menu'` → ≥ 3.

---

### Phase 0 — Baseline, scratch, spike

#### Task 0: The baseline and the scratch Nexus

**Requirement:** acceptance

**Why:** Every later gate compares against these numbers and this copy; taken once, before anything moves.

**Now** — recorded 09-05-2026 at `7c7c7542`: 321 test files / 4,006 tests; `biome check` 1,019 files clean; `git worktree list` one entry; the real Nexus at `~/NexusOS`.

**Becomes**

```
~/Pommora-Scratch/NexusOS          a copy of ~/NexusOS (rsync -a, excluding .git)
~/Pommora-Scratch/userData/        an empty app-support folder; pommora.json written by the first launch
~/Pommora-Scratch/baseline/        typecheck.txt · test.txt · lint.txt · build.txt · loc.txt (python3 .claude/scripts/loc.py) · atlas.txt · tree-before.txt (git ls-files)
```

**Verify — automated**

- [ ] `diff <(ls ~/NexusOS) <(ls ~/Pommora-Scratch/NexusOS)` → empty. `test -f ~/Pommora-Scratch/NexusOS/.nexus/nexus.json`.
- [ ] Each baseline file exists and its summary line matches the Now numbers.
- [ ] `env -u ELECTRON_RUN_AS_NODE POMMORA_USERDATA=~/Pommora-Scratch/userData ./node_modules/.bin/electron . --remote-debugging-port=9333` from `Pommora/` after `npm run build` opens; the scratch Nexus is chosen through the picker once; `window.nexus.state()` over CDP returns the scratch root. Kill it.

**Verify — user** *(none.)*

#### Task 1: The root, the workspaces, and the tooling spike

**Requirement:** 1, 10

**Why:** Every move lands in a home the tooling already resolves; the three claims the research made (source through `exports`, styles across workspaces, Vitest projects) are proven on the empty skeleton before 90,000 lines depend on them.

**Now** — `Pommora/package.json` (`pommora-react`, 15 scripts, 27 deps + 15 devDeps); configs per A17 §1; root `vercel.json` cds into `Pommora`; root `node_modules/` is a 263-file vitest cache; `tsconfig.json` `references` never run.

**Becomes**

```
package.json                       { "name": "pommora", "private": true, "workspaces": ["UIX","Core","Desktop","Mobile","Sync","Showcase","Pommora"],   — Pommora leaves the list at Task 8
                                     "scripts": { "dev": "npm run dev -w Pommora", "build": "npm run build -w Pommora", "package": "npm run package -w Pommora",   — forwarded to Desktop at Task 8; Pommora/ is a seventh, temporary workspace until then
                                                  "showcase": "npm run dev -w Showcase", "build:showcase": "npm run build -w Showcase",
                                                  "typecheck": "tsc -p UIX && tsc -p Core && tsc -p Pommora/tsconfig.node.json && tsc -p Pommora/tsconfig.web.json",   — Pommora's two projects stay in the gate until Task 5 deletes them and Task 8 adds Desktop's two; Pommora/tsconfig.*.json gain paths for @pommora/core and @pommora/uix so the moved files typecheck from the old tree
                                                  "test": "vitest run", "lint": "biome check .", "format": "biome format --write .", "check": "biome check --write ." },
                                     "devDependencies": { biome, typescript, vitest, @vitejs/plugin-react, @vanilla-extract/vite-plugin, jsdom, @types/node } }
biome.json                         moved from Pommora/; files.includes gains "!**/out", "!**/release", "!**/dist"
vitest.config.ts                   { test: { projects: ["UIX","Core","./Pommora/vitest.config.ts"] } }  — UIX and Core hold vitest.config.ts with defineProject (react + vanilla-extract plugins, per-file jsdom pragma honored, Core's setupFiles Core/Testing/setup.ts once Task 5 lands it); Pommora's own config stays the third project, with its setup file and aliases, until Task 5 removes it and Desktop's replaces it
tsconfig.json                      { "files": [], "references": [{path:"UIX"},{path:"Core"},{path:"Desktop/tsconfig.node.json"},{path:"Desktop/tsconfig.web.json"}] }  — editor navigation only
vercel.json                        installCommand "npm install", buildCommand "npm run build:showcase", outputDirectory "Showcase/dist"
.gitignore                         root's + Pommora/.gitignore's entries; dist-app/ dropped; node_modules/ at any depth
UIX/package.json                   { "name": "@pommora/uix", "private": true, "exports": { "./*": ["./*.ts", "./*.tsx", "./*"] }, "dependencies": { react, react-dom, lucide-react, @tabler/icons-react, @vanilla-extract/css, @samasante/liquid-glass, @tanstack/react-virtual, @fontsource-variable/inter } }
UIX/tsconfig.json                  { compilerOptions: { module ESNext, moduleResolution Bundler, target ES2022, lib [ES2022, DOM, DOM.Iterable], jsx react-jsx, strict, noEmit, types [] }, include ["**/*"], exclude ["node_modules"] }
Core/package.json                  { "name": "@pommora/core", "private": true, "exports": { "./*": ["./*.ts", "./*.tsx", "./*"] }, "dependencies": { zod, yaml, ulidx, zustand, @codemirror/*, react, react-dom, mdast-util-from-markdown, mdast-util-gfm, micromark-extension-gfm }, "devDependencies": { "@pommora/uix": "*" } }
Core/tsconfig.json                 as UIX's plus "types": ["node"] is NOT set; Node types reach Core only through Core/Platform's interfaces
Desktop/package.json               { "name": "@pommora/desktop", "private": true, "main": "./out/main/index.js", scripts dev/build/start/package as today, "dependencies": { electron-updater? no — electron, chokidar, write-file-atomic }, "devDependencies": { "@pommora/core": "*", "@pommora/uix": "*", electron, electron-vite, electron-builder, vite, @types/react, @types/react-dom, @types/write-file-atomic } }
Desktop/electron.vite.config.ts    written at Task 8 with explicit inputs (main: Desktop/main.ts · preload: Desktop/Bridge/preload.ts · renderer: Desktop/Renderer/index.html), no externalizeDepsPlugin, plugins [react(), vanillaExtractPlugin()]; Pommora/electron.vite.config.ts stays the app's build until then. The spike uses a throwaway Desktop/electron.vite.config.ts whose inputs are the probe entries, deleted with the probe
Desktop/tsconfig.node.json         include ["main.ts","Bridge/**","Platform/**","Store/**","FileWatch/**","Actions/**","Web/**/*.ts","Capture/**","Config/**"]; types ["node"]
Desktop/tsconfig.web.json          include ["Renderer/**"]; lib DOM
Mobile/package.json                { "name": "@pommora/mobile", "private": true }
Sync/package.json                  { "name": "@pommora/sync", "private": true }   Sync/tsconfig.json: lib ["ES2022"] only — no DOM
Showcase/package.json              { "name": "@pommora/showcase", "private": true, scripts dev/build, "devDependencies": { "@pommora/uix": "*", vite, react plugins } }
Removed:                           Pommora/vite.config.app.ts, dist-app/, dev:app/build:app scripts, Pommora/vercel.json, root node_modules/, release/, out/, dist/, *.tsbuildinfo, interactions.html + Showcase/Lab/ whole (the iteration lab; its drag options and TileLab go with it), Pommora/node_modules (reinstalled at root)
Removed deps:                      pngjs, react-markdown, remark-gfm, @codemirror/lang-json, @codemirror/lang-yaml, @codemirror/legacy-modes
electron-builder.yml               moved to Desktop/ at Task 8; the better-sqlite3 provisions at :9-12,27-28 removed at Task 1 in place
```

The spike, inside this task before anything else moves: a throwaway `UIX/Probe/probe.css.ts` + `probe.tsx` and `Core/Probe/probe.ts` importing it, `Desktop/Renderer/main.tsx` importing `@pommora/core/Probe/probe`, `Core/Probe/probe.test.ts` and `UIX/Probe/probe.test.ts`. Proves: electron-vite dev and build resolve Core and UIX source through `exports` with both as devDependencies; the vanilla-extract class from UIX applies in the Desktop window; `vitest run` executes both projects. Then the Probe folders are deleted in the same task.

**Assumed by:** every task.

**Verify — automated**

- [ ] With `Pommora/src` still in place and untouched, from the root: `npm install` clean; `./node_modules/.bin/electron --version` prints; `npm run typecheck` green (Pommora's two projects + UIX + Core); `npm run test` runs the three projects → 321 files / 4,006 tests + the two probe tests; `npm run lint` → clean; the spike's throwaway Desktop dev window shows the probe class applied (screenshot over CDP) and `vite build` of the probe config is green; `npm run build` (Pommora's) green; the built Pommora app launched with `POMMORA_USERDATA=~/Pommora-Scratch/userData` (the two-line `app.setPath` seam added at the top of `Pommora/src/main/index.ts`) opens the scratch Nexus.
- [ ] `rg -F "externalizeDepsPlugin" Desktop` → 0. Control: `rg -F "vanillaExtractPlugin" Desktop/electron.vite.config.ts` → 1.
- [ ] `ls Pommora/node_modules Pommora/dist-app Pommora/release 2>&1` → all absent. `rg -F "dist-app" . -g '!node_modules' -g '!.claude/Planning/MonorepoAudit'` → 0. Control: `rg -F "build:showcase" package.json` → 1.
- [ ] Probe folders deleted: `ls UIX/Probe Core/Probe 2>&1` → absent; suite back to 321 / 4,006.

**Verify — user** *(none.)*

#### Gate 0

- [ ] Gates green from the root, exit codes read directly; 321 / 4,006 / lint clean / build green.
- [ ] Commit: `chore(monorepo): the root, six workspaces, and the tooling spike; Pommora/ configs dissolve`. Explicit paths.
- [ ] Not a declared stop: Phase 1 opens.

---

### Phase 1 — shared dissolves

Baseline invariant carried. Tests move with their subjects; counts unchanged.

#### Task 2: The Contract and the dialer type

**Requirement:** 4

**Why:** The renderer must type against the contract, not the Electron preload, before a single renderer file moves; otherwise every move drags Electron typings with it.

**Now** — `Pommora/src/shared/bridge.ts` (392, `Asks`/`Tells`/`Pushes`); `shared/result.ts` (44); `preload/index.ts:196` `export type NexusApi = typeof api`; `preload/index.d.ts` declares `Window.nexus: NexusApi`; `tsconfig.web.json:19` includes it; `main/ipc.ts` `NO_NEXUS`, `BUSY` at the top.

**Becomes**

```ts
// Core/Contract/bridge.ts        (git mv shared/bridge.ts) — unchanged content this task
// Core/Contract/result.ts        (git mv shared/result.ts) + NO_NEXUS, BUSY moved in from main/ipc.ts
// Core/Platform/dialer.ts        (new, ~25 lines; Platform is the seam folder per Requirement 4)
export interface Dialer {
  ask<K extends keyof Asks>(k: K, ...args: Asks[K]['args']): Promise<Asks[K]['reply']>
  tell<K extends keyof Tells>(k: K, ...args: Tells[K]): void
  on<K extends keyof Pushes>(k: K, cb: (p: Pushes[K]) => void): () => void
}
declare global { interface Window { nexus: Dialer & LegacyApi } }   // LegacyApi = typeof api until Task 7 narrows it to Dialer; 218 leaf call sites keep compiling meanwhile
// Pommora/src/preload/index.ts   api object stays for now; gains `ask`, `tell`, `on` on the exposed object (three lines); exports `type LegacyApi = typeof api`; index.d.ts deleted
// tsconfig.web.json              drops preload/index.d.ts; Core/Platform/dialer.ts is reached through the import graph
```

**Assumed by:** Task 5 (renderer moves), Task 8 (handler split), Task 13 (menu collapse).

**Verify — automated**

- [ ] `rg -F "NexusApi" Pommora/src Core` → 0; `rg -F "LegacyApi" Pommora/src Core` → 2 (the export and the intersection). Control: `rg -F "interface Dialer" Core/Platform/dialer.ts` → 1.
- [ ] Full gate green; counts unmoved.

**Verify — user** *(none.)*

#### Task 3: shared dissolves, types.ts first

**Requirement:** 2

**Why:** It is the import-graph root of shared (A06 §2: 106 exports, 29 renderer-only, 7 main-only, 13 unreferenced); nothing else in shared moves cleanly until it does; the rest of the folder follows in the same task so no half-split state is ever committed.

**Now** — `shared/types.ts` 654 lines, imported by 106 renderer files and 29 main files; the seven blocks at the line ranges A06 §2 tables.

**Becomes** — seven files, each beside its domain's eventual home, created directly in their final homes so nothing moves twice:

```
Core/Nexus/tree.ts             lines 304–453: NodeKind, tree nodes, NexusTree, NexusState, AssetMap, ValueChange, ValuesEpoch, PickFileOptions → PickFileOptions goes to Desktop/Config/types.ts instead
Core/Settings/personalization.ts  lines 43–302: Personalization, every *_STEPS, coerce*, clampInt, DEFAULT_COMMANDS, HISTORY_*, TAB_*; WEB_PARTITION → Desktop/Web/partition.ts; interfaceScaleZoom/INTERFACE_SCALE_* → Desktop/Config
Core/Trash/trashRow.ts         lines 57–82 + 652–654: TrashCrumb, ClearReport, TrashRow, TrashMode, DEFAULT_TRASH_MODE
Core/Navigation/navRef.ts      lines 455–499 (NavRef, toNavRef, NavigationState, SelectionState, SelectTarget, Tab, TabTarget, NewTabSentinel, WindowTabTarget); StoredTab/StoredTabSet/WindowSetRecord/WindowsFile/EMPTY_WINDOWS/GlanceSize → Core/Interface/Windows/windowRecord.ts
Core/Interface/chrome.ts       lines 554–583: ThumbRect, SubfieldConfig, NavViewMode(s)
Core/Views/viewRow.ts          lines 585–648: PageDetail → Core/Pages/pageDetail.ts; PageValues, ViewRow, ColumnKind, ResolvedColumn, GroupKind, ResolvedGroup, UNGROUPED, OpenIn, ViewButton, ViewStyle here
UIX/Theme/colorSetting.ts      lines 12–41: SOLID_COLORS, SolidColor, ColorSetting family
```

Every importer rewritten to the new file (Haiku; the compiler enumerates). The 13 exports referenced nowhere outside the file: dropped in this task (A06 §2 lists them).

**Then the rest of shared.** `Pommora/src/shared/` 86 remaining files (52 non-test modules + tests + `__fixtures__`), destinations per A06 §1 and §3.

**Becomes** — `git mv` per this table; tests travel with subjects; `__fixtures__` → `Core/Testing/fixtures/`:

```
Core/Contract         (done in Task 2)
Core/Nexus            treePatch, treeStabilize, identity (renamed identityMark.ts — collides with main/identity.ts; exports unchanged), schemas, record
Core/Locations        nexusPaths
Core/Properties       properties, propertyValue, optionModel, columnStyles (the codec half), contexts, contextResolve
Core/Views            views, cellMenu→Core/Actions, columnMenu→Core/Actions
Core/Tiles            tiles (minus MAX_INSPECTOR_TABS, INSPECTOR_STATE_KEY at :175,177 — dead), tileMenu→Core/Actions
Core/Connections      connections, links, linkValue, markdownCode
Core/Web              webpageEmbed, pasteLink
Core/Assets           cropGeometry; assetMime → Desktop/Platform/assetMime.ts (main-only)
Core/Pages            mutate → mutateRequest.ts (MutateRequest/MutateReply/containerCreators; ContextTarget/Creator/RenameHost stay; RenameHost's surface names noted in Rulings)
Core/Actions          menuModel, toggleLabels, pageMenu, cardMenu, citationMenu, connMenu, fileHistoryMenu, gripMenu, identityMenus, navRowMenu, optionMenu, propertyMenu, tableMenu, tabMenu, trashMenu, viewMenus, viewRowMenu, pasteAsMenu, editorMenu (FormatState, FORMAT_CHORDS, keyBindingFor); acceleratorFor → Desktop/Actions/accelerators.ts
Core/Settings         devicePrefs
UIX/Theme             theme (SPECTRUM, ramps, isColorKey); WINDOW_BG → Desktop/Config
Core/IO               stableJson
Core/Testing          clamp → Core/Testing? no: clamp → UIX/Theme/clamp.ts? no — clamp.ts (1 line) inlined at its call sites; module deleted
```

Duplicates collapsed in passing where both halves are in this move: `links.ts:10,14` ≡ `nexusPaths.ts:48,52` URL regexes → one in `Core/Locations/url.ts` (pure string grammar; Connections imports Locations, never the reverse); `normalizeTitle` ≡ `normalizeContextValue` → one; `OpenIn`/`ViewButton`/`ViewStyle` zod literals in `schemas.ts:10-11` and `tiles.ts:145-146` derive from the one enum.

**Assumed by:** Tasks 4–7 (every engine move imports from these homes).

**Verify — automated**

- [ ] `test ! -f Pommora/src/shared/types.ts`; `rg -F "@shared/types'" Pommora/src Core UIX Desktop` → 0. Control: `rg -F "@pommora/core/Nexus/tree'" Pommora/src` → ≥ 30.
- [ ] `test ! -d Pommora/src/shared`; `rg -F "@shared/" Pommora/src Core UIX Desktop Showcase` → 0. Control: `rg -F "@pommora/core/" Pommora/src` → ≥ 400.
- [ ] Full gate green; 321 / 4,006 (the `__fixtures__` and shared tests now run under Core's project).
- [ ] `rg -F "HAS_SCHEME =" Core` → 1 and `rg -F "WEB_ADDRESS =" Core` → 1, both in `Core/Locations/url.ts`. Control: `rg -F "pageLinkPattern" Core` → ≥ 3.

**Verify — user** *(none.)*

#### Gate 1 — shared is gone, nothing else moved

- [ ] Gates green, counts unmoved.
- [ ] Simplification (`code-simplifier`, Opus) and review (`build-breaking-agent`, Opus) against `<base>..HEAD` scoped to `Core UIX Desktop package.json`; every concern fixed or ruled.
- [ ] Commit per task; hashes into Progress.

---

### Phase 2 — The engine out of Electron

#### Task 4: Core's pure engine domains move whole

**Requirement:** 3

**Why:** The 86% of main that is host-neutral lands in its domains by `git mv`; no file content changes except import paths. The Node-only files stay for Tasks 6 and 9.

**Now** — `Pommora/src/main/*.ts` 41 root files + `CRUD/` + `IO/` + `Database/` + `Connections/` + `Properties/` (A01 §1, A03 §1 file tables).

**Becomes** — destinations (Haiku executes the table; Opus reviews the table before):

```
Core/IO               IO/atomicWrite (write+read primitives; the trash-bundle half at :186-255 → Core/Trash/bundle.ts), IO/fileLock, IO/walk, walkCache, IO/writeEcho, IO/pageFile, sidecarIO → IO/sidecar.ts
Core/Locations        paths, exclusion, pathSafety, coerce, order, disambiguate, ids
Core/Nexus            readNexus (minus the settings decoders :80-302 → Core/Settings/codec.ts), folderKind, readPage → folded into IO/pageFile as readPageDetail, liveTree, watchPatch, mutatePatch, valuesChanged, watcher's settle/classify half (the chokidar arm stays for Task 6), identity, adopt, record (shrunk per A02 §6; renamed remintLedger.ts, exports renamed coherently), remint, session (sessionRoot/openSession only), mutate, mutate's CRUD arms: CRUD/page, folderEntity, reorder, cascade, util
Core/Settings         settings, exclusionInput (folded into settings as sanitizeExclusions), exclusionScan, assetDirValidate, the readNexus decoders
Core/Assets           assetMap, assetRoots, assetWrite  (assetMigrate deleted — F-3)
Core/Tiles            tiles, tileDoc
Core/Trash            provenance (split four ways per A01 §4: record.ts, gather.ts, resolve.ts, spend.ts), CRUD/restoreScrub, restoreProperty, trashRows, the bundle primitives
Core/Index            indexSeed, Database/contentIndex (interface half; SQL body → Desktop/Store)
Core/Navigation       IO/navigationFile
Core/Contexts         contextsRegistry, CRUD/contextWrite, contextCascade, contextJournal
Core/Properties       Properties/schema, IO/propertiesRegistry, repairSweep, CRUD/registryProperty, assignment, removeProperty, deleteProperty, optionOps, pageValue, propertyJournal, keyHolders, governedSweep, governedWrite, journalSlot, schemaChain, replaySchemaCascade, reconcile, loadValues → Core/Views/loadValues
Core/Views            CRUD/views, containerConfig
Core/Connections      Connections/scan, rewrite; linkTitles' pure scanner half → Core/Web/titleScan.ts
Core/Pages            CRUD/fileHistory (capture rule; versionsDb body → Desktop/Store)
Core/Interface        IO/tabsState, windowState (row shapes; no IO)
Desktop/Platform      IO/thumbnails → Desktop/Capture; Database/driver, open, schema, versionsDb, localState SQL body, sessionDb → Desktop/Store; webGuests → Desktop/Web; appConfig + session's resolveRestorePath/pruneRecents/isTrashedPath → Desktop/Config
stays for Task 8        index.ts, ipc.ts, every *Menu.ts, menu.ts, contextMenu.ts, editorMenu.ts, styleMenu.ts, returningMenu.ts, rowMenu.ts
```

Raw mode (`sidecarMode === false`) removed across its eight files (A02 §2) in this task since readNexus moves anyway; `INVENTED` and the bare-Record `properties.json` reader at `IO/propertiesRegistry.ts:16-31` removed with it.

**Assumed by:** Tasks 6–9.

**Verify — automated**

- [ ] `rg -l "from 'electron" Core` → 0. Control: `rg -l "from 'electron" Pommora/src/main Desktop` → ≥ 25.
- [ ] `rg -l "from 'node:" Core` → the list equals the files Task 6's Platform seam will rewrite (recorded in Rulings); no file outside `Core/IO`, `Core/Locations`, `Core/Nexus`, `Core/Trash`, `Core/Assets`, `Core/Index`, `Core/Settings`, `Core/Pages`, `Core/Connections`, `Core/Web`, `Core/Contexts`, `Core/Properties`, `Core/Views`, `Core/Navigation` appears.
- [ ] `rg -F "sidecarMode" Core Pommora/src` → 0. Control: `rg -F "readNexus" Core/Nexus` → ≥ 2. `rg -F "assetMigrate" . -g '!.claude' -g '!node_modules'` → 0.
- [ ] Full gate green; tests: 321 minus the assetMigrate, raw-mode, and INVENTED test files (named in Rulings) / 4,006 minus their cases.

**Verify — user** *(none.)*

#### Task 5: The renderer moves into Core's domains and UIX

**Requirement:** 3, 6, 12

**Why:** The interface halves join their engine halves; the kit becomes UIX; every drawer dissolves. `git mv` by the tables in A07 §8–9, A11 §6–7, A13 §7–8, A15 §8–9 with the log's rulings applied (Interface not Shell; Content dissolved into Interface + Pages; Tiles a Core domain; Settings and Assets top-level; Navigation absorbs Tabs; slices with their domain; UIX categories at root).

**Now** — `Pommora/src/renderer/` 25 folders + 12 root files (A07 §1, A11 §1, A13 §1, A15 §1).

**Becomes** — Opus authors the exact file table from the four audits into `.claude/Planning/MonorepoAudit/renderer-moves.tsv` (source → destination, one line per file, every file accounted for: `wc -l` equals `git ls-files Pommora/src/renderer | grep -v test | wc -l`), Nathan-visible before execution; Haiku executes it. Destination folders:

```
UIX/Theme Animations Interactions Buttons Labels Controls Fields Elements Glass Menus Pickers Symbols Windows Cards TileGrid Table Caret
Core/Session          store.ts → Session/store.ts, treeIndex (+ Interface/scope.ts merged), sessionState, nexusSlice, configSlice (+ setAssetDirectory/setExclusions), cacheSlice, renameSlice → mutationSlice.ts, chromeSlice's neutral half, tabState's detail half → pageDetailCache.ts, selection, destinationTree, Interface/pageFlush + Tiles/pageTileWrite → saveScheduler.ts, Tokens/personalization.ts
Core/Interface        App.tsx, ContentView, InterfaceScaffold, InspectorPane → SidePane/, Subfield/, NotificationLabel + notifications, ConfirmationWindow + confirmations, Glance/ (page branch, glanceAction, glanceLink from MarkdownPM/Connections), Sidebar/, Toolbar/ (Toolbar, ToolbarTrio, NavMenu, SettingsMenu), Windows/ (PageWindow minus PagePanel, NavWindow, PageHistoryWindow, WindowTabStrip, useWindowWarm, windowMorph, windowTabs, windowCache, windowSlice), layoutSlice (chromeSlice's layout half), Banner/DetailTitleHeader/AddBannerButton/useBannerMenu → Interface/Header/, viewSettingsScope, Animation/paneSlide + toolbar-slide.css, Interactions/revealBar, styles.css (shell half), the menu presenter (Task 13 adds)
Core/Pages            PageView, pageEditor, Tiles/Surfaces/PageTile, Frames/PageMenu, MarkdownPM/PageHeader, restoreSnapshot
Core/Navigation       Navigation/* (minus testTree → Core/Testing/fixtures), Tabs/*, navigationSlice, tabState's warm half → warmTabs.ts, NavView + nav-view.css
Core/Views            Views/*, Frames/{Filter,Group,Sort,Layout,Hidden,Settings}Frame + LayoutToggles, CardsOptions, ViewItemMenu, switchRows, filterModel, hiddenFrameModel, viewIcon, Toolbar/ViewMenu + ViewFrame, Tables/{ColumnHeader,cellSweep,columnWidths,columnReorder,columnAlign,columnStyles}, Tiles/ViewTileScope, Properties/Assignment/valueUndo + cardValueInput's card half, notifications.restoreView
Core/Properties       Properties/* re-nested Cells/ Pickers/ Page/ Schema/ (PropertyFrame joins Schema/), Actions/linkResolve
Core/Tiles            TileHost, TileHandleMenu, tileKinds, useTileDoc, tileZoom, Surfaces/MarkdownTile, ViewTile, Interface/SpaceView, HomepageView, Frames/SettingsScaffold → HomepageSettings.tsx, Toolbar/SpaceMenu, Tiles/Core/* → Tiles/layout/
Core/MarkdownPM       MarkdownPM/* re-nested per A09 §6 (Model/, Render/, Guards/, Gestures/, Links/, Citations/, Embeds/, Menus/, Widgets/, Autocomplete/, Tables/); Toolbar/OutlineMenu + OutlineDnd + outlineTree, Tiles/tileCache, Subfield/subfieldStats, Interactions/useKeepInView
Core/Assets           Assets/*, Pickers/ImagePicker, Utilities/EntityIcon, useNexusIcon, Settings/IconPicker + iconFavorites, Symbols entity-icon policy (:192-208), store.useAssetUrl
Core/Settings         Settings/SettingsWindow, TrashFrame → Core/Trash/TrashFrame.tsx, AssetDirectoryRow, ExcludedDirectoriesRow, ClearActionRow, css; SETTINGS_WIN/SETTINGS_RAIL → UIX/Windows/bounds.ts
Core/Platform         Assets/assetUrl's scheme line, App.tsx:83–173 → useBridgeSubscriptions.ts, Actions/nativeMenus, openWebLink
Core/Testing          Testing/*, Navigation/testTree
Core/Interactions?    no — Actions/commands → UIX/Interactions/commands.ts; Sidebar/sidebarDndModel's generic half → UIX/Interactions/reorderModel.ts; Tables/tableDnd, Frames/frameDnd + model → UIX/Interactions
Desktop/Web           Tiles/Surfaces/WebTile + webRetention, Windows/WebWindow + css, Glance site branch (L108–122, 267–273, 412–430 as a WebSurface implementation), tile-base.css:146-161, glance-pane.css .glance-web*
Desktop/Renderer      main.tsx, index.html, env.d.ts, styles.css drag-region lines (:106-132, 160), the six -webkit-app-region rules, nativeEditorMenu (MarkdownPM/Editor/menu.ts:27-32)
Showcase/             Showcase/* + design-system.html + vite.config.ts
```

Files that dissolve into siblings in this move (no logic change): `Cards/Card.tsx` + `cards.css` → `UIX/Cards/`; `Tables/Table.css` + `table-tokens.css` → `UIX/Table/`; `Frames/InlineEditHeader` + header styles → `UIX/Menus/`; `Utilities/iteration-window` → `Core/Interface/Windows/IterationWindow.tsx`; `nativeCaret.ts` + `Carets.css` + `text-selection.css` → `UIX/Caret/`; `DesignSystem/Util/{capMap,checkSet,moveItem,pad}` → `Core/Nexus/util/`? no → `Core/Testing`? no → **`Core/Session/util/`** (their importers are Session, Navigation, Views); `Util/cx` → `UIX/Theme/cx.ts`; `Glass/glass-pane.tsx` `Surface` → `Core/Interface/InterfaceScaffold`.

**Assumed by:** Tasks 6–20.

**Verify — automated**

- [ ] `renderer-moves.tsv` line count equals the renderer's non-test file count at Task 5's start; every destination folder is in B-3, C-1, or D-1.
- [ ] `test ! -d Pommora/src/renderer`; `rg -F "@renderer/" Core UIX Desktop Showcase` → 0. Control: `rg -F "@pommora/uix/" Core` → ≥ 100.
- [ ] `rg -l "from '@pommora/core" UIX` → 0. Control: `rg -l "from '@pommora/uix" Core` → ≥ 100.
- [ ] `rg -l "useSession\|window\.nexus" UIX` — run as two commands: `rg -l "useSession" UIX` → 0 and `rg -l "window.nexus" UIX` → 0. Control: `rg -l "useSession" Core/Session` → ≥ 5.
- [ ] Full gate green; 321 / 4,006 (tests moved with subjects; the Desktop vitest project now covers `Pommora/src/main` only).

**Verify — user** *(none.)*

#### Task 6: The Platform seam

**Requirement:** 4

**Why:** Core stops importing Node directly; every fs, lock, and hash reach goes through one interface Desktop implements, with the five primitives the Mobile plan missed.

**Now** — `rg -l "from 'node:" Core` → the Task 4 list (~40 files); `IO/fileLock.ts` uses `AsyncLocalStorage`; `ids.ts:64` `createHash`; `paths.ts:11` `sep`; `utimes` at every sweep; `realpath` at five sites (`mutate.ts:11`, `pathSafety.ts:41-42`, three more per A01 §3); `birthtimeMs` at two; `Buffer` in six files.

**Becomes**

```ts
// Core/Platform/machine.ts (new, ~70 lines) — interfaces only
export interface FileStat { size: number; mtimeMs: number; birthtimeMs: number | null; isDirectory: boolean }
export interface DirEntry { name: string; kind: 'file' | 'dir' | 'other' }
export interface Machine {
  readText(p: string): Promise<string | null>          // absent → null
  readBytes(p: string): Promise<Uint8Array | null>
  writeText(p: string, text: string): Promise<void>     // atomic; records the watcher echo
  writeBytes(p: string, bytes: Uint8Array): Promise<void>
  writeRaw(p: string, text: string, mtimeMs: number): Promise<void>  // sync landings: no echo, restores mtime
  stat(p: string): Promise<FileStat | null>
  readDir(p: string): Promise<DirEntry[]>              // absent → []
  mkdir(p: string): Promise<'created' | 'exists'>
  rename(from: string, to: string): Promise<void>
  remove(p: string): Promise<void>
  utimes(p: string, mtimeMs: number): Promise<void>
  realpath(p: string): Promise<string>                 // hosts without one return p
  lock<T>(key: string, fn: () => Promise<T>): Promise<T>  // re-entrant on the same key within fn
  sha256Hex(text: string): string
  trashToSystem?(p: string): Promise<void>
}
export interface KeyValueStore { get(scope: string, key: string): string | null; set(scope: string, key: string, value: string | null): void }
let installed: Machine | undefined
export function installMachine(m: Machine): void
export function machine(): Machine   // throws "no platform installed" before installMachine; every Core caller uses machine().x
// Desktop/Platform/nodeMachine.ts (new, ~120 lines) — node:fs/promises, write-file-atomic, the existing fileLock with AsyncLocalStorage, node:crypto, shell.trashItem
// Core/IO/atomicWrite.ts, fileLock.ts, walk.ts, walkCache.ts … — every node:* import replaced by machine().*; posix path ops from a Core/Locations/posix.ts (join, dirname, basename, relative on '/' only; sep removed)
// Desktop/main.ts installs nodeMachine before openSession
```

`Buffer.byteLength` → `new TextEncoder().encode(s).length`; `setImmediate` → `queueMicrotask` where it was a yield, otherwise stays in Desktop.

**Assumed by:** Task 7–10, Task 13.

**Verify — automated**

- [ ] `rg -l "from 'node:" Core` → 0. Control: `rg -l "from 'node:" Desktop` → ≥ 8. `rg -l "AsyncLocalStorage" Core` → 0; `Desktop/Platform/nodeMachine.ts` → 1.
- [ ] `rg -F "Buffer\." Core` → 0. Control: `rg -F "TextEncoder" Core` → ≥ 1.
- [ ] Red-green: `Core/Platform/machine.test.ts` with an in-memory `Machine` fake runs the walk, a page write, a sweep with mtime preservation, and a lock re-entry; fails before `installMachine` exists.
- [ ] Full gate green; the built app opens the scratch Nexus, edits a body, saves (file mtime observed changed; `Last Modified` in the tree updated), a property sweep preserves page mtime (observed).

**Verify — user** *(none.)*

#### Task 7: The dialer replaces the api object

**Requirement:** 4

**Why:** One definition of the surface; the renderer calls channels by name; 145 lines leave.

**Now** — `preload/index.ts` api object 196 lines, 149 leaves; `rg -l "window.nexus" Core --glob '!Core/Platform/**'` re-run here (220 sites in 68 files at the audit, A04 §5a).

**Becomes**

```ts
// Pommora/src/preload/index.ts → Desktop/Bridge/preload.ts (~30 lines)
contextBridge.exposeInMainWorld('nexus', { ask, tell, on, openDropped: (f: File) => ask('nexus:openPath', webUtils.getPathForFile(f)) })
// every call site: window.nexus.folds.get(x) → window.nexus.ask('folds:get', x); window.nexus.onTree(cb) → window.nexus.on('tree', cb)  (Haiku sweep from the api object's leaf→channel table, generated first)
// Core/Platform/dialer.ts is the only Core file naming window.nexus; a `host()` accessor returns it; `LegacyApi` and the intersection deleted here
```

**Verify — automated**

- [ ] `rg -l "window.nexus" Core --glob '!Core/Platform/**'` → 0. Control: `rg -F "window.nexus" Core/Platform/dialer.ts` → 1.
- [ ] `rg -F "const api = {" Desktop` → 0. Control: `rg -F "exposeInMainWorld" Desktop/Bridge/preload.ts` → 1.
- [ ] Full gate green; the app's every surface exercised by hand at Gate 2 (menus native and in-app, tiles, windows, settings, history).

**Verify — user** *(none.)*

#### Task 8: main/index.ts splits by domain

**Requirement:** 4

**Why:** The 1,250-line handler literal becomes per-domain handler maps in Core taking a `HostContext`; the Electron lifecycle stays in Desktop; a second host can spread what it serves.

**Now** — `Pommora/src/main/index.ts` 2,071 lines at A04 §3's ranges; `ipc.ts` `serveBridge` with the `envelope|raw|menu|window` kind union; `contextMenu.ts` calls `handleMutate` directly.

**Becomes**

```ts
// Core/Contract/handlers.ts
export interface HostContext { machine: Machine; kv: KeyValueStore; push<K extends keyof Pushes>(k: K, p: Pushes[K]): void; pick(kind: 'file'|'folder'|'image'|'exclusion', opts?): Promise<string | null>; clipboard: { read(): Promise<string>; write(t: string): Promise<void> } }
export type Handlers = { [K in keyof Asks]: (ctx: HostContext, ...args: Asks[K]['args']) => Promise<Asks[K]['reply']> }
// Core/<Domain>/handlers.ts — one partial per domain: Nexus (session/open, tree), Pages, Properties, Contexts, Views, Tiles, Trash, Assets, Settings, Navigation, Interface (chrome KV), Index, Web (linkTitles), Actions (menu channels until Task 13)
// Core/Contract/serve.ts — `export const handlers: Handlers = { ...nexusHandlers, ...pagesHandlers, … }` — the compiler names any missing channel
// Desktop/Bridge/ipc.ts — binds handlers over ipcMain with the envelope wrapper (~60 lines); the kind union gone
// Desktop/main.ts (~350 lines) — lifecycle, createWindow, protocols, applyDefaultZoom, installAppMenu, the HostContext construction
// the 116 validators → Core/Contract/validators.ts; the 89 factories beside their domains; confirm-and-push helpers take ctx.push
```

**Verify — automated**

- [ ] `wc -l Desktop/main.ts` ≤ 400. `rg -F "ipcMain.handle" Desktop` → 1 site (the loop). Control: `rg -F "'nexus:state'" Core/Nexus/handlers.ts` → 1.
- [ ] `rg -F "BrowserWindow" Core` → 0. Control: `rg -F "BrowserWindow" Desktop/main.ts` → ≥ 1.
- [ ] Full gate green; hand walk of Gate 2.

**Verify — user** *(none.)*

#### Task 9: The dispatcher's inline bodies and the one sweep

**Requirement:** 5

**Why:** 784 → ~190 lines; the governed rewrite is one mechanism; a journal for a non-open root becomes clearable.

**Now** — `Core/Nexus/mutate.ts` 784: 13 thin arms (96), 5 orchestrations (111), 9 inline bodies (316), `adoptFile` (68); `sweepGovernedRoots` vs `cascadePages` vs four `rewritePageSerialized` loops (A03 §1.3); `journalSlot.ts:37`, `governedWrite.ts:38` call `sessionRoot()`; `MutateOutcome` declared twice; two disambiguators; three frontmatter writers.

**Becomes**

```ts
// Core/Nexus/mutate.ts (~190) — every arm `case 'x': return xOp(ctx, req)`; adoptFile → Core/Assets/adoptFile.ts
// Core/Pages/setBanner.ts, setIcon.ts … — the nine bodies, one file each, beside their domain
// Core/Properties/governed/sweep.ts — sweepGovernedRoots is the one engine; cascadePages = sweep with a files scope (deleted as a function; callers pass scope); the four ad-hoc loops call sweep
// journalSlot(root, …), governedWrite(root, …) — root a parameter; callers pass sessionRoot()
// MutateOutcome imported from Core/Pages/mutateRequest.ts in mutatePatch; createContextGroup uses createDisambiguated
```

**Verify — automated**

- [ ] `wc -l Core/Nexus/mutate.ts` ≤ 220. `rg -F "export function cascadePages" Core` → 0. Control: `rg -F "sweepGovernedRoots" Core` → ≥ 4.
- [ ] `rg -F "sessionRoot()" Core/Properties/governed Core/Contexts` → 0. Control: `rg -F "sessionRoot()" Core/Nexus/handlers.ts` → ≥ 1.
- [ ] Red-green: a governed sweep test against a second in-memory root clears its journal (fails before the root parameter).
- [ ] Full gate green; counts unmoved.

**Verify — user** *(none.)*

#### Gate 2 — the engine runs through the seam

- [ ] Gates green; test count as recorded at Task 4.
- [ ] `test ! -d Pommora`; the Desktop vitest project points at `Desktop/**`.
- [ ] Hand walk against the scratch Nexus: open, page edit and save, property edit, rename a page (link cascade observed in a linking page), delete to trash and restore, right-click sidebar / page / cell / tile / tab (native on, then off), drag a tile, Page Window, Nav Window, Page History restore, Settings toggle applies, an external edit with `echo >>` reaches the open tree.
- [ ] Simplification then review against `<base>..HEAD`; concerns fixed or ruled.

---

### Phase 3 — Filing inside the domains

#### Task 10: Interface, Views, Properties, Tiles, Navigation, Settings settle

**Requirement:** 3, 12

**Why:** The second-level subfolders per A11 §6, A13 §7, A15 §8 and the pure/React split where a domain exceeds thirty files; the three-walker tree index becomes one; the two property-row renders become one component.

**Now** — post-Task-6 folders holding flat contents; `Core/Session/treeIndex.ts` beside the merged `scope.ts`; `sidebarDndModel.buildIndex`, `destinationTree` walk the tree (A16 §4); `PageProperties.tsx` and `PagePanel` (in `PageWindow.tsx:235-507`) share 88 lines.

**Becomes**

```
Core/Views/pipeline/ host/ bands/ Table/ Cards/ Settings/         (A11 §6 tree)
Core/Properties/Cells/ Pickers/ Page/ Schema/ + value.ts formatValue.ts contextIdentity.ts contextOptions.ts resolveContext.ts at root
  Core/Properties/Page/PagePropertyRows.tsx ({ page, variant: 'page' | 'panel' }) replaces PageProperties + PagePanel; page-properties.css.ts is the one sheet
Core/Tiles/layout/ (the pure engine; HYSTERESIS a parameter) + host files at root
Core/Interface/Sidebar/ Toolbar/ SidePane/ Subfield/ Windows/ Header/ Glance/ Notifications/ Confirm/
Core/Session/treeIndex.ts — gains containersByPath, buildIndex projections; sidebarDndModel.buildIndex and destinationTree read it
```

**Verify — automated**

- [ ] `rg -F "function buildIndex" Core` → 1. Control: `rg -F "treeIndex" Core/Interface/Sidebar` → ≥ 1.
- [ ] `rg -F "PagePanel" Core` → 0; `rg -F "page-window-insp-" Core` → 0. Control: `rg -F "PagePropertyRows" Core` → ≥ 3.
- [ ] Full gate green; counts unmoved except tests renamed with subjects.

**Verify — user** *(none.)*

#### Task 11: MarkdownPM re-nests and the model separates

**Requirement:** 8

**Why:** The 41-file Editor bin dissolves; the pure model gets its subfolder so the engine imports it instead of re-deriving.

**Now** — `Core/MarkdownPM/{Detect,Parser,Tokens,Decorations,Input,Editor,Tables,Connections}` (A09 §1); `Core/Connections/scan.ts` re-derives from `markdownCode`; `Subfield/subfieldStats` imports nine Detect symbols.

**Becomes** — A09 §6's tree: `Model/` (parse, detect, codeLangs, tokens, docScan, embedRanges, headingScan, blockModel, blockMove, Tables/{model,codec,regions,operations,clipboard,navigate}), `MarkdownEditor.tsx` (index.tsx + zoom folded; `header?: ReactNode` slot), `api.ts`, `Input/`, `Render/`, `Guards/`, `Gestures/`, `Links/`, `Citations/`, `Embeds/`, `Widgets/reactWidget.ts` (the one chassis), `Menus/`, `Tables/` (widget half), `Autocomplete/`, `styles/editor.css`. `Core/Connections/scan.ts` imports `Model/detect`.

**Verify — automated**

- [ ] `test ! -d Core/MarkdownPM/Editor`; `rg -l "from '@codemirror\|from 'react'" Core/MarkdownPM/Model` as two commands → 0 each. Control: `rg -l "from '@codemirror" Core/MarkdownPM/Render` → ≥ 3.
- [ ] `rg -F "class .* extends WidgetType" Core/MarkdownPM` → the table and embed widgets extend `ReactWidget`; `rg -F "_root" Core/MarkdownPM` → 1 file.
- [ ] Full gate green.

**Verify — user** *(none.)*

#### Task 12: UIX settles at its root; motion has one definition

**Requirement:** 6

**Why:** The kit's categories at the root per C-1; the seven misfiles left in Task 5; motion's four readings become one in Animations.

**Now** — `UIX/` folders after Task 5; `Animations/motion.ts` `base: '280ms'`; `renderer/Interactions/OverScroll.tsx:87` (lands in `UIX/Elements` at Task 5) fallback `240`; `autoscroll.ts:235` mirrors an "out" easing that no longer exists; `Theme/theme-vars.css.ts:21` imports Animation; three inline copies of `useHeld` (A08 §3.1; `useHeldPresence` is a distinct composition over `useExitPresence` and stays); `engine.tsx:345-368`, `group.tsx:568-612` hand-roll the pointer skeleton; `glass-base.tsx:94-106 paneMaterial` ≡ `frostStyle({...SURFACE_FROST, brightness: 95})`.

**Becomes** — `UIX/Animations/motion.ts` the one source; `theme-vars` reads it from Animations; OverScroll reads the token; the JS easing mirror deleted; the three inline copies call `useHeld`; `engine.tsx` and `group.tsx` call `gesture.ts`'s `begin/onMove/detach`; `paneMaterial` = the frostStyle call. The `SortableZone.layout` prop removed at its nine sites; the drag options only the Lab used (`swap`, `bounds`, `modifiers`, `canReorder`, notify callbacks, ~45 lines) removed; the Lab itself left at Task 1.

**Verify — automated**

- [ ] `rg -F "getComputedStyle" UIX/Elements/OverScroll.tsx` → 0 (it reads the token, not the DOM). Control: `rg -F "duration.base" UIX` → ≥ 2.
- [ ] `rg -c "function useHeld\b" UIX` → 1 and `useHeldPresence` still defined once. `rg -F "paneMaterial" UIX` → the export only, defined as the frost call.
- [ ] Full gate green; a drag in the sidebar, a card drag, a table row drag, and a resize each observed working.

**Verify — user** *(none.)*

#### Gate 3 — every surface matches before

- [ ] Gates green. Hand walk of Gate 2 repeated; screenshots of Sidebar, a Table view, a Cards view, a Page with tiles, the Homepage board, Settings, the Page Window compared to the Task 0 set.
- [ ] Simplification then review against `<base>..HEAD`.

---

### Phase 4 — The two layers

#### Task 13: Every list menu on one path

**Requirement:** 7

**Why:** 26 menu channels become 1; 19 files and ~600 net lines leave; a phone gets menus.

**Now** — A05 §1 inventory: 22 models (`Core/Actions`), 23 poppers (`Pommora/src/main/*Menu.ts` → now `Desktop/Actions/`), 12 hand-built templates, 24 per-surface channels + `row-menu` + `context-menu`, 7 pushes only `contextMenu.ts` sends, `Actions/nativeMenus.ts` (`useNativeMenus`, `popRowMenu`), `DesignSystem/Menus/menu-index.tsx` (`MenuRow`), `askConfirm` at `chromeSlice.ts:32,138`.

**Becomes**

```ts
// Core/Actions/*.ts — every menu a function (ctx) => ActionItem<A>[]; the 12 hand-built ones gain theirs (tab, navRow, identity ×3, iconFavorite, create, grip, column, trash ×2, entity from contextMenu.ts:161-194); ActionItem gains radio?: boolean; confirm removed (dead on native)
// Core/Interface/Menus/RowMenuHost.tsx (~60) — one mounted pane over PickerMenu; presentRowMenu(items, at) → Promise<A | null>; rowMenuRows.tsx (~40) ActionItem → MenuRow with DrillLevel submenus
// Core/Platform/nativeMenus.ts (landed by Task 5) gains useMenuPresenter(): in-app by default; when devicePrefs.nativeMenus, ask('row-menu', …); popRowMenu stays as the native leg
// Desktop/Actions/rowMenu.ts, returningMenu.ts, editorMenu.ts, appMenu.ts (← menu.ts) survive; 18 poppers + contextMenu.ts + styleMenu.ts deleted; the entity-menu pick router → Core/Interface/Sidebar/entityMenuActions.ts
// Core/Contract/bridge.ts — Asks lose 24 menu channels; Pushes lose 7; 'row-menu' stays; editor Tells stay
// 37 call sites: window.nexus.ask('x-menu', ctx) → present(xMenuModel(ctx), anchor)
```

**Verify — automated**

- [ ] Every `Asks` key ending in `-menu` or `:menu` in `Core/Contract/bridge.ts` is `'row-menu'` alone; any other survivor is named in Rulings with the reason it resists. Control: `rg -F "'row-menu'" Desktop/Bridge` → ≥ 1.
- [ ] `ls Desktop/Actions` → rowMenu.ts, returningMenu.ts, editorMenu.ts, appMenu.ts, accelerators.ts (+ tests). `rg -F "buildFromTemplate" Desktop` → ≤ 4 files.
- [ ] Every model has a test (the 14 existing + one per new model); `rg -l "Menu.test" Core/Actions | wc -l` ≥ 22.
- [ ] Full gate green; every menu family right-clicked with native menus off (in-app) and on (native): sidebar container, page row, table cell, column header, card, tile handle, tab, nav row, trash row, property row, option, connection, citation, grip, view button, embed title, icon favorite, banner, title, history.

**Verify — user** *(none — Nathan's own pass at closeout.)*

#### Task 14: The editor takes its host

**Requirement:** 8

**Why:** 22 store reads and 20 bridge calls in the editor become one object its mounter constructs; 51 of 72 files ship to a phone unchanged.

**Now** — A09 §2's table: `useSession` in 10 files, `window.nexus` in 9, `glanceAction` in 5, `Tiles/Surfaces` lazy import in `embedWidget.tsx:108,339`, `menu.ts:22-32` `EditorMenuApi` (the one seam done right).

**Becomes**

```ts
// Core/MarkdownPM/api.ts
export interface EditorHost {
  settings(): Pick<Personalization, 'codeblockLineCount' | 'removeTitleOnLinkChange' | 'aliasPickerOnCommit' | 'jumpToCitation' | 'pasteLinkIntoText' | 'defaultLinkFormat'> & { pasteInverse: string[] }
  aliases: { list(id: string): string[]; remember(id: string, a: string): void; forget(id: string, a: string): void }
  linkTitles: { get(url: string): string | null; resolve(url: string): Promise<string | null>; subscribe(cb: () => void): () => void }
  citations: { shown(): boolean; set(v: boolean): void }
  clipboard: HostContext['clipboard']
  menus: { grip(ctx): Promise<GripMenuAction | null>; table(ctx): Promise<TableMenuAction | null>; citation(ctx): Promise<CitationMenuAction | null>; format: EditorMenuApi }
  glance: { arm(...); cancel(); close(); contains(el): boolean }
  renderTile(range: TileRange): ReactNode
  pickTree(): PickNode[]
}
// links open through Core/Platform/openWebLink directly
// MarkdownEditor takes host: EditorHost; a CM facet carries it; the five mounters (PageView, PageTile, MarkdownTile, PageHistoryWindow, editorHarness) construct it from Session + Platform
// Interface/Glance/glanceAction.ts stays in Core/Interface/Glance; MarkdownPM/Connections/index.ts:63-65 glanceLink → Core/Interface/Glance/glanceLink.ts; the editor reaches glance only through host.glance (ruled: Connections never holds Glances)
```

**Verify — automated**

- [ ] `rg -l "useSession" Core/MarkdownPM` → 0; `rg -l "window.nexus\|host()" Core/MarkdownPM` as two commands → 0 and 0. Control: `rg -F "EditorHost" Core/MarkdownPM/api.ts` → 1.
- [ ] `rg -F "import('@pommora/core/Tiles" Core/MarkdownPM` → 0. Control: `rg -F "renderTile" Core/MarkdownPM/Embeds` → ≥ 1.
- [ ] Full gate green; the editor exercised: link autocomplete, alias remember/forget, citation toggle, paste-as, grip menu, table menu, embed a page and a webpage, glance on hover, zoom.

**Verify — user** *(none.)*

#### Gate 4 — one menu path, one editor host

- [ ] Gates green; simplification then review against `<base>..HEAD`; concerns fixed or ruled.

---

### Phase 5 — Removals, fixes, docs

#### Task 15: The kill list at high confidence

**Requirement:** 9

**Why:** F-2's inventory, bucketed and deleted in one pass with the compiler enumerating.

**Now** — the high-confidence lists in A02 §Totals, A03 Part 2, A06 Part 2, A08 §Totals, A10 §Totals, A12 §Totals, A14 §Totals, A16 §Totals, A20 §2–3; the six dead deps already gone at Task 1.

**Becomes** — every item deleted, in this order: zero-importer exports and dead `export` keywords (compiler-safe) → dead store actions, unreachable paths, test-only functions (`closeSession`, `skipTopLevel`, `validateLayout`, `splitAtTile`, `tileIds`, `decorationsFor`, `parseTable`, the callout re-split, `allStructuralIds`, the nav `extras` path, `setNavOverride` + `navOverride`, `openSettings`, `setSubfieldOrder`, `.tabs-compact`, `AgendaMode.tsx` + plumbing, the two empty Settings frames) → duplicates (two frontmatter parsers → one in `Core/IO/pageFile.ts`; `isPlainObject` → one in `Core/Contract/result.ts`? no → `Core/IO/json.ts`; five normalizers → one; asset URL builder → one in `Core/Platform/assetUrl.ts`; four `WarmSeam` stores → one factory; four `ConnectionsApi` builders → one hook; four drag context skeletons → one provider in `UIX/Interactions`; `MeasuredRow` ×4 → one; the date-format label table → one; `MutateOutcome` ×2 → one; `containerOf` ≡ `parentOf`; `isTabRef` → `isNavRef`; seven boundary checks → `pathSafety.escapes`; two disambiguators → one) → the eleven same-name collisions renamed (A20 §1; logged) → residue (an export left with one caller inlined; a file left with one export folded).

The never-delete list holds; `VIEW_TYPES`' four unbuilt entries and the inert picker tiles stay (genuine placeholders per A12).

**Verify — automated**

- [ ] Each named symbol → 0 across `Core UIX Desktop` (one `rg -F` per symbol; the list is the Now). Control: `rg -F "capSet" Core UIX` → ≥ 4.
- [ ] `rg -c "function isPlainObject" Core UIX Desktop` → 1. `rg -c "splitFrontmatter" Core` → 1 definition.
- [ ] Full gate green; test files = 321 minus those whose subjects left (named in Rulings); no test weakened.

**Verify — user** *(none.)*

#### Task 13: The two write-path bugs

**Requirement:** 9

**Why:** Found by the audit; cheaper inside the move.

**Now** — `Core/Nexus/remint.ts:113-128` writes a sidecar outside `withSidecarLock`; `homepage.json` written directly at five sites bypassing `updateNexusConfig` (A20 §4 lists them).

**Becomes** — remint's write goes through `Core/IO/sidecar.ts`'s lock; the five homepage sites call `updateNexusConfig`. Sibling sweep: `rg -F "writeJson(" Core` → every site is either inside a lock helper or a lock-taking function (list recorded).

**Verify — automated**

- [ ] Red-green: a test that races remint against a container write and asserts the final sidecar holds both facts; fails before.
- [ ] `rg -F "homepage.json" Core` → 1 site (the path constant) + `updateNexusConfig`. Control: `rg -F "updateNexusConfig" Core` → ≥ 6.
- [ ] Full gate green.

**Verify — user** *(none.)*

#### Task 14: Showcase severed

**Requirement:** 1

**Why:** It imports the app store through two Settings constants; a bounds file cuts it loose.

**Now** — after Task 5, `rg -l "@pommora/core" Showcase` lists whatever leaves still reach Core (PanesLeaf's bounds import is already gone: Task 5 lands `SETTINGS_WIN`/`SETTINGS_RAIL` in `UIX/Windows/bounds.ts`; the Lab left at Task 1).

**Becomes** — each remaining Core import replaced by the UIX primitive it wanted, or the leaf deleted; zero Core imports.

**Verify — automated**

- [ ] `rg -l "@pommora/core" Showcase` → 0. Control: `rg -l "@pommora/uix" Showcase` → ≥ 10. `npm run build:showcase` green.

**Verify — user** *(none.)*

#### Task 15: The harness scripts

**Requirement:** 11

**Why:** `loc.py` and `check-atlas.mjs` read the old root; the comment ledgers already fail verify and retire.

**Now** — `loc.py:23 SRC = "Pommora/src"` + AREAS map with six dead prefixes + `:64` skips `"testing"`; `check-atlas.mjs:19-21,33-40`; `comment-ledger.mjs`, `comment-manifest.mjs` (`../../Pommora/node_modules/typescript`, `:87` pins 88); `.claude/hooks/republish-ledger.mjs` calls the ledger; `settings.json` PostToolUse hook; `settings.local.json:6-9` four dead `cp` permissions; `.claude/scripts/README.md`.

**Becomes** — `loc.py` walks `Core UIX Desktop Showcase`, area = `<workspace>/<first folder>`, series keyed so `loc-history.json` continues (a `renamed_from` map for the old areas); `check-atlas.mjs` reads `UIX/`; `comment-ledger.mjs`, `comment-manifest.mjs`, `comment-baseline.json`, `comment-units.json`, `Line-Ledger.html`, `hooks/republish-ledger.mjs` deleted; `settings.json` hook entry removed; README rewritten; the four permissions removed.

**Verify — automated**

- [ ] `python3 .claude/scripts/loc.py` runs and prints per-area lines. `node .claude/scripts/check-atlas.mjs` → "16 atlas tables checked" or the new count with the reason logged.
- [ ] `rg -F "Pommora/" .claude/scripts .claude/hooks .claude/settings.json` → 0. Control: `rg -F "UIX/" .claude/scripts/check-atlas.mjs` → ≥ 1.

**Verify — user** *(none.)*

#### Task 13: The docs path sweep and stale claims

**Requirement:** 11

**Why:** 199 prefixed citations, 120 bare folder names, 38 stale claims (A18 §2, §4).

**Now** — A18 §2's doc × pattern table; A18 §4.1's 38 misses by class.

**Becomes** — Haiku sweeps the mechanical patterns per A18 §2 with the path table below; Opus rewrites the 38 misses and the folder-spined sections of `DesignSystemPM` (its `Components/` heading gone; sections follow UIX's root categories) and `MarkdownPM.md` §Architecture; every Features doc gains a first-line `**Workspace:** Core · UIX · Desktop · cross-cutting` tag.

Path table (every doc reads through it): `Pommora/src/main/<x>` → `Core/<domain>/<x>` per Task 4's table; `src/renderer/<Folder>/` → per `renderer-moves.tsv`; `src/shared/<x>` → per Task 3's table; `src/preload` → `Desktop/Bridge`; `DesignSystem/<Sub>` → `UIX/<Sub>`; "run from `Pommora/`" → "from the repo root"; `npm run dev` → `npm run dev` (root forwards).

**Verify — automated**

- [ ] Dead Vocabulary sweep for the doc tokens → 0 each against controls.
- [ ] The 38 claims re-probed with `rg` against the new tree → 38 hits.

**Verify — user** *(none.)*

#### Task 14: The rules, the Architecture split, the Mobile plan

**Requirement:** 11

**Why:** What goes false is rewritten in the commit that falsifies it (Made False table).

**Now** — `.claude/CLAUDE.md` Hard Rules 1–3, Codebase Information, Testing Conventions launch command; `ArchitecturePM.md` §The Shape of the App, §The Process Boundary, §The Renderer; `Development-Environment.md` §Toolchain CJS bullet, §Running the GUI; Mobile plan Task 0 + Phase 8; Mobile log A-6, K-1, Prospects.

**Becomes** — CLAUDE.md: "The host owns the machine. Core reaches it only through `Core/Platform`; Desktop's implementation is the only place Node and Electron are called; UIX reaches nothing outside itself." / "`Core/Contract` is the contract between any interface and any host." / gates and launch from the root. `ArchitecturePM.md` → `CorePM.md` (the Nexus layout, data layer, domains, the Platform seam) + `DesktopPM.md` (Bridge, Store, FileWatch, Actions, Web, Capture, Config, Renderer); `Development-Environment.md` toolchain bullet restated per G-5. Mobile plan: a Standing line marking Task 0 and Phase 8 superseded with a path table; Mobile log A-6 → [confirmed] pointing here; K-1 → H-1; Prospect removed.

**Verify — automated**

- [ ] `rg -F "Main owns the filesystem" .claude/CLAUDE.md` → 0. Control: `rg -F "Core/Platform" .claude/CLAUDE.md` → ≥ 1.
- [ ] `test -f .claude/Features/CorePM.md && test -f .claude/Features/DesktopPM.md && test ! -f .claude/Features/ArchitecturePM.md`; every `[[ArchitecturePM]]` link retargeted (`rg -F "[[ArchitecturePM" .claude -g '!Sessions/**' -g '!HistoryPM.md'` → 0).

**Verify — user** *(none.)*

#### Gate 5 — nothing false stands, delta negative

- [ ] Gates green; Dead Vocabulary sweep at zero against controls.
- [ ] Simplification then review against the whole range `7c7c7542..HEAD`; concerns fixed or ruled.
- [ ] Line delta reported (non-test, non-comment) from `loc.py` before/after; negative.
- [ ] Closeout per H: Delivery Claim → neutral verifier → attack → Nathan's own pass.

---

## Implementation Log

### Progress

- [ ] **Phase 0** — Baseline, scratch, spike · base `7941edec`
  - [x] Task 0 — Baseline and scratch Nexus (launch check moved to Task 1)
  - [ ] Task 1 — Root, workspaces, spike
- [ ] **Phase 1** — shared dissolves
  - [ ] Task 2 — Contract and dialer type
  - [ ] Task 3 — shared dissolves, types.ts first
- [ ] **Phase 2** — Engine out of Electron
  - [ ] Task 4 — Pure engine domains move
  - [ ] Task 5 — Renderer into Core and UIX
  - [ ] Task 6 — Platform seam
  - [ ] Task 7 — Dialer replaces api
  - [ ] Task 8 — index.ts splits
  - [ ] Task 9 — Dispatcher and the one sweep
- [ ] **Phase 3** — Filing inside the domains
  - [ ] Task 10 — Domains settle
  - [ ] Task 11 — MarkdownPM re-nests
  - [ ] Task 12 — UIX settles; motion
- [ ] **Phase 4** — The two layers
  - [ ] Task 13 — One menu path
  - [ ] Task 14 — Editor host
- [ ] **Phase 5** — Removals, fixes, docs
  - [ ] Task 15 — Kill list
  - [ ] Task 13 — Write-path bugs
  - [ ] Task 14 — Showcase severed
  - [ ] Task 15 — Harness scripts
  - [ ] Task 13 — Docs sweep
  - [ ] Task 14 — Rules, Architecture split, Mobile plan

### Rulings

- 09-05-2026 (Nathan): Connections never holds Glances; glance is Interface's (or Windows'). Every open item in the decision log; cosmetic drift accepted where it unifies or fixes and would not be noticed; no visual confirmation required of the agents, Nathan verifies at his desk; models Haiku for mechanical, Opus for judgment, Fable supervises; the comment, scope, and naming constraints as written in Global Constraints; work in place, `.claude/` undisturbed.

### Open Against Later Tasks

### Deviations

- Task 0: the second-instance launch needs `app.setPath('userData', process.env.POMMORA_USERDATA)`, which the code lacks; the two-line seam lands in Task 1 (it moves with `main/index.ts` at Task 8 as a permanent dev affordance) and the launch check runs in Task 1's spike. Baseline recorded at `~/Pommora-Scratch/baseline/`: typecheck 0, 321/4,006, 1,019 lint files, build green, loc total 69,704, 16 atlas tables, 1,102 tracked files. Scratch Nexus at `~/Pommora-Scratch/NexusOS` (60 MB, no `.git`, no device databases).

### Lessons

### Sequenced After

- Mobile (Capacitor host, touch layer) and Sync (server) per the Mobile plan, re-pathed.
- main to ESM (G-5).
- `Core/Interface/Windows` promoted to a Core domain if Account or Sync add windows.

### Closeout

---

## Completion Criteria

**The directive**

```
Execute Pommora Monorepo — Implementation Plan. Live, Nathan at his desk; no stops except the hard stops (a gate red twice, a behavior unverifiable, a decision the log lacks, any new visible UI).
Live-verify: Nathan's own walk at Gate 5.
Screenshots: Gate 3's comparison set only.
Pings: at each gate and at completion.
Record: History arc "PM-129 || The Monorepo" at closeout.
Also: Haiku for mechanical sweeps, Opus for judgment and reviews; no comment-cleanup agents; comments none by default, twenty-line cap; variable names unchanged.
Everything else is the standard below.
```

**The Standard**

- **The bar.** Not doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. A future review of this arc finds nothing to correct.
- **Only the live confirmation may be pending.** No concerns carried, no "for a later session," no deferrals when the fix is known and could be done now. Where an item genuinely can't get there, the Log names which and why, and everything else is still finished.
- **Reusability first.** Search before writing. A second resolver, cache, or validator means the plan is wrong, or you are — log it before proceeding. Duplication is debt.
- **Fix at the source**, never down-river; leave a unified thing rather than stitched pieces. Add code only where it repairs something flawed or makes things simpler.
- **Ambiguity:** take the simplest reading, record it under Rulings or Deviations, continue. Execution does not stop for input.
- **Per phase:** implement → simplify → gates, exit codes read directly and never piped → code review → attack review → every finding fixed or carrying a defensible ruling → commit → ping. Simplification before review, never inverted. "Done with concerns" is unfinished work, and a result nobody watched happen is not a result.
- **Comments** per Global Constraints. **Docs** stay clean and non-bloated; what went false gets rewritten, not amended. Unattributed doc or style edits mid-run belong to the user — fold them into the commit at hand, never revert them.

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause.
- [ ] `test ! -d Pommora`; six workspaces; `Showcase` builds.
- [ ] `rg -l "from 'electron" Core UIX` → 0; `rg -l "@pommora/core" UIX` → 0.

**The passes**

- [ ] Simplification → code review → att over the full implementation in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against the decision log.
- [ ] Every finding from every pass fixed, or carrying a defensible ruling.

**The user's own pass**

- [ ] Nathan opens the app on his real Nexus and works in it for a day: pages, properties, views, tiles, menus, windows, settings, history, trash.
- [ ] Nathan flips through `Core`, `UIX`, `Desktop` and finds nothing he cannot place.

**The record**

- [ ] Documents made false rewritten in the commits that falsified them.
- [ ] The closing sweep at zero against its control.
- [ ] Context and Handoff current; the History entry written to its format.
- [ ] Lessons routed; successor work named in Sequenced After.

**The report**, in plain English — what shipped and why it matters · what happened along the way worth knowing · what each gate's real output was · in-flight decisions, a sentence or two each · what's left for the live pass · final +/- line count, comments and tests excluded. Honest about what didn't work.
