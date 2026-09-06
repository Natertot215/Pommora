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

**Acceptance — the whole thing working:** From the repo root, `npm run typecheck && npm run test && npm run lint && npm run build` are green; the built desktop app opens a scratch copy of NexusOS, renders the tree, opens a page, saves an edit; `find Core UIX Desktop -name '*.ts*' | xargs grep -l "from 'electron"` lists only files under `Desktop/`; `grep -rl "from '@pommora/core" UIX` → 0; the test count is 321 files / 4,006 tests minus only the tests whose subjects the kill list removed, each named in the Log; the net line delta is negative.

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
- Sidecar files have four write paths, one unlocked (`remint.ts:113-128`), and `homepage.json` bypasses `updateNexusConfig` at five sites (A20 §4) → Task 16 fixes both under the lock.
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

**Shapes:** refactor (baseline invariant: 321 test files / 4,006 tests / 1,019 lint files / `npm run build` green, carried through Phases 1–4 unchanged except where a task names a test it moves or deletes) · removal (Phase 5 inventory per F-2 with the never-delete list below) · fix (Task 16's two write-path bugs, each with a sibling sweep and a red test) · user-visible in effect only (no new UI; every menu family re-verified by hand).

**Global Constraints (every task inherits these):**

- Gates from the repo root, chained with `&&`, exit codes read directly, never piped: `npm run typecheck && npm run test && npm run lint && npm run build`. A gate's file counts are read from its own summary line.
- **Verification:** the four gate commands are the proof. Behavior is checked once per gate that touched runtime code, as one smoke launch (open the scratch Nexus, render the tree, open a page, save an edit, kill it); no hand walks, no screenshot sets, no clicking through behavior the compiler and the tests already hold. Reviews attack the implementation (the seam, duplication, dead paths, a move that left an owner behind), never whether the app works.
- **Comments:** none by default; a hard cap of twenty comment lines per file; a comment carries only a why the code cannot state. No comment names a value its own declaration holds. No "moved from", "was", "formerly", "TODO", or build-status text anywhere.
- **Scope:** a task's file list is its whole scope. No "while I'm here." No new abstraction, helper, wrapper, or type unless a task's Becomes names it. Ten lines beat a hundred; a task that grows beyond its Becomes stops and reports rather than continuing.
- **Names:** variable and function names stay as they are. The only identifier renames are the eleven same-name collisions A20 §1 lists and the file-level renames A-9 rules; each is logged under Rulings. When a file is renamed or split, its exports read coherently with the new file name.
- **Moves are `git mv`,** never delete-and-create, so history follows. Stage explicit paths; never `git add -A` or a directory. No `git stash`, `checkout .`, `clean`, or `reset` on the shared tree. One tree-touching implementer at a time; confirm the tree is still before dispatching the next.
- **Imports:** cross-workspace by package name (`@pommora/uix/...`, `@pommora/core/...`); inside a workspace, relative. No `paths` aliases survive Task 1.
- **The never-delete list:** anything under `.claude/` except the four harness scripts Task 18 rewrites; `Pommora/build/` (moves to `Desktop/build/`); every test whose subject survives; `Showcase/` (moves, compiles); the `TilesV2-Spec` and both Mobile plan documents.
- Out of scope everywhere: Mobile and Sync implementation; touch handling; any change to on-disk Nexus format; any menu's contents; Showcase beyond compiling; History entry until closeout.
- Live app: kill and relaunch freely; open only the scratch Nexus at `~/Pommora-Scratch/NexusOS` with `POMMORA_USERDATA=~/Pommora-Scratch/userData`, whose `pommora.json` is seeded with the scratch path so the app restores it and no chooser is ever driven; never the real `~/NexusOS`.

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
| every Features doc | `Pommora/src`, `src/main|renderer|shared`, `renderer/<Folder>/` citations (199 + 120 bare) | the new tree | 19 || 19 |
| `DesignSystemPM` | spine mirrors `DesignSystem/` subfolders; `Components/` heading | UIX root categories | 19 |
| `PommoraPRD` | `PageID`/`TaskID`/`EventID` keys; `(Projects):` syntax | retired per `identity.ts:5`; corrected | 19 |

**Dead Vocabulary**

- `@shared/` → 0 in `Core UIX Desktop Showcase`. Control: `@pommora/core` → ≥ 200.
- `@renderer/` → 0. Control: `@pommora/uix` → ≥ 100.
- `window.nexus.` in `Core` outside `Core/Platform` → 0. Control: in `Core/Platform` → ≥ 1.
- `Pommora/src` in `.claude` excluding `Planning/MonorepoAudit`, `Planning/*Mobile*`, `Sessions`, `HistoryPM.md` → 0. Control: `Core/` in `ArchitecturePM.md` → ≥ 5.
- `DesignSystem/`, `renderer/Interface`, `renderer/Actions`, `renderer/Utilities`, `src/shared` in `.claude/Features` → 0. Control: `UIX/Menus` in `DesignSystemPM.md` → ≥ 1.
- `flavor` (case-insensitive, `navFlavor` included) → 0 across `Core UIX Desktop .claude/Features`; the identifier and the stored `open.flavor` key become `kind` at Task 10 (ruling 09-05-2026). Control: `rg -F "kind: 'nav'" Core/Interface/Windows` → ≥ 1.
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
UIX/package.json                   { "name": "@pommora/uix", "private": true, "exports": { "./*": { "types": ["./*.ts", "./*.tsx", "./*"], "default": "./*" } }, "dependencies": { react, react-dom, lucide-react, @tabler/icons-react, @vanilla-extract/css, @samasante/liquid-glass, @tanstack/react-virtual, @fontsource-variable/inter } }
UIX/tsconfig.json                  { compilerOptions: { module ESNext, moduleResolution Bundler, target ES2022, lib [ES2022, DOM, DOM.Iterable], jsx react-jsx, strict, noEmit, types [] }, include ["**/*"], exclude ["node_modules"] }
Core/package.json                  { "name": "@pommora/core", "private": true, "exports": { "./*": { "types": ["./*.ts", "./*.tsx", "./*"], "default": "./*" } }, "dependencies": { zod, yaml, ulidx, zustand, @codemirror/*, react, react-dom, mdast-util-from-markdown, mdast-util-gfm, micromark-extension-gfm }, "devDependencies": { "@pommora/uix": "*" } }
Core/tsconfig.json                 as UIX's plus "types": ["node"] is NOT set; Node types reach Core only through Core/Platform's interfaces
Desktop/package.json               { "name": "@pommora/desktop", "private": true, "main": "./out/main/index.js", scripts dev/build/start/package as today, "dependencies": { electron-updater? no — electron, chokidar, write-file-atomic }, "devDependencies": { "@pommora/core": "*", "@pommora/uix": "*", electron, electron-vite, electron-builder, vite, @types/react, @types/react-dom, @types/write-file-atomic } }
Desktop/electron.vite.config.ts    written at Task 8 with explicit inputs (main: Desktop/main.ts · preload: Desktop/Bridge/preload.ts · renderer: Desktop/Renderer/index.html), no externalizeDepsPlugin, plugins [react(), vanillaExtractPlugin()]; Pommora/electron.vite.config.ts stays the app's build until then. The spike uses a throwaway Desktop/electron.vite.config.ts whose inputs are the probe entries, deleted with the probe
Desktop/tsconfig.node.json         include ["main.ts","Bridge/**","Platform/**","Store/**","FileWatch/**","Actions/**","Web/**/*.ts","Capture/**","Config/**"]; types ["node"]
Desktop/tsconfig.web.json          include ["Renderer/**"]; lib DOM
Mobile/package.json                { "name": "@pommora/mobile", "private": true }
Sync/package.json                  { "name": "@pommora/sync", "private": true }   Sync/tsconfig.json: lib ["ES2022"] only — no DOM
Showcase/package.json              { "name": "@pommora/showcase", "private": true, scripts dev/build, "devDependencies": { "@pommora/uix": "*", vite, react plugins } }
Removed:                           Pommora/vite.config.app.ts, dist-app/, dev:app/build:app scripts, Pommora/vercel.json, root node_modules/, release/, out/, dist/, *.tsbuildinfo, interactions.html + Showcase/Lab/ whole (the iteration lab; its drag options and TileLab go with it), Pommora/node_modules (reinstalled at root)
Removed deps:                      pngjs, react-markdown, remark-gfm (the three CodeMirror language packs are live through 38 dynamic imports in codeHighlight.ts and stay)
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
Core/Settings/personalization.ts  lines 43–302: Personalization, every *_STEPS, coerce*, clampInt, HISTORY_*, TAB_*; DEFAULT_COMMANDS → Core/Actions/commands.ts (the user's commands; the chord matcher stays UIX/Interactions); WEB_PARTITION → Desktop/Web/partition.ts; interfaceScaleZoom/INTERFACE_SCALE_* → Desktop/Config
Core/Trash/trashRow.ts         lines 57–82 + 652–654: TrashCrumb, ClearReport, TrashRow, TrashMode, DEFAULT_TRASH_MODE
Core/Navigation/navRef.ts      lines 455–499 (NavRef, toNavRef, NavigationState, SelectionState, SelectTarget, Tab, TabTarget, NewTabSentinel, WindowTabTarget); StoredTab/StoredTabSet/WindowSetRecord/WindowsFile/EMPTY_WINDOWS/GlanceSize → Core/Interface/Windows/windowRecord.ts
Core/Interface/chrome.ts       lines 554–583: ThumbRect, SubfieldConfig, NavViewMode(s)
Core/Views/viewRow.ts          lines 585–648: PageDetail → Core/Pages/pageDetail.ts; PageValues, ViewRow, ColumnKind, ResolvedColumn, GroupKind, ResolvedGroup, UNGROUPED, OpenIn, ViewButton, ViewStyle here
UIX/Theme/colorSetting.ts      lines 12–41: SOLID_COLORS, SolidColor, ColorSetting family
```

Every importer rewritten to the new file (Haiku; the compiler enumerates). The 13 exports referenced nowhere outside the file: dropped in this task (A06 §2 lists them).

**Then the rest of shared.** `Pommora/src/shared/` 86 remaining files (52 non-test modules + tests + `__fixtures__`), destinations per A06 §1 and §3.

**Becomes** — `git mv` per this table; tests travel with subjects; `__fixtures__` → `Core/Views/fixtures/` (its two JSON inputs are read only by Views tests):

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
- [ ] One review: the simplifier (Opus), dual-briefed to report correctness bugs, against `<base>..HEAD` scoped to `Core UIX Desktop package.json`; every concern fixed or ruled (Nathan 09-05-2026: this gate is small, one review).
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

**Why:** The interface halves join their engine halves; the kit becomes UIX; every drawer dissolves. `git mv` by the tables in A07 §8–9, A11 §6–7, A13 §7–8, A15 §8–9 with the log's rulings applied (Interface not Shell; Content dissolved into Interface + Pages; Tiles a Core domain holding every tile kind, the page and web tiles included; Settings and Assets top-level; Navigation absorbs Tabs; slices with their domain; UIX categories at root).

**Now** — `Pommora/src/renderer/` 25 folders + 12 root files (A07 §1, A11 §1, A13 §1, A15 §1).

**Becomes** — Fable authors the exact file table from the four audits into `.claude/Planning/MonorepoAudit/renderer-moves.tsv` (source → destination, one line per file, every file accounted for: `wc -l` equals `git ls-files Pommora/src/renderer | grep -v test | wc -l`), Nathan-visible before execution; Haiku executes it. Destination folders:

```
UIX/Theme Animations Interactions Buttons Labels Controls Fields Elements Glass Menus Pickers Symbols Windows Cards Canvas Table Caret
Core/Session          store.ts → Session/store.ts, treeIndex (+ Interface/scope.ts merged), sessionState, nexusSlice, configSlice (+ setAssetDirectory/setExclusions), cacheSlice, renameSlice → mutationSlice.ts, chromeSlice's neutral half, tabState's detail half → pageDetailCache.ts, selection, destinationTree, Interface/pageFlush + Tiles/pageTileWrite → saveScheduler.ts, Tokens/personalization.ts
Core/Interface        App.tsx, ContentView, InterfaceScaffold, InspectorPane → SidePane/, Subfield/, NotificationLabel + notifications, ConfirmationWindow + confirmations, Glance/ (page branch, glanceAction, glanceLink from MarkdownPM/Connections), Sidebar/, Toolbar/ (Toolbar, ToolbarTrio, NavMenu, SettingsMenu), Windows/ (PageWindow minus PagePanel, NavWindow, PageHistoryWindow, WindowTabStrip, useWindowWarm, windowMorph, windowTabs, windowCache, windowSlice), layoutSlice (chromeSlice's layout half), Banner/DetailTitleHeader/AddBannerButton/useBannerMenu → Interface/Header/, viewSettingsScope, Animation/paneSlide + toolbar-slide.css, Interactions/revealBar, styles.css (shell half), the menu presenter (Task 13 adds)
Core/Pages            PageView, pageEditor, Frames/PageMenu, MarkdownPM/PageHeader, restoreSnapshot
Core/Navigation       Navigation/* (testTree included), Tabs/*, navigationSlice, tabState's warm half → warmTabs.ts, NavView + nav-view.css
Core/Views            Views/*, Frames/{Filter,Group,Sort,Layout,Hidden,Settings}Frame + LayoutToggles, CardsOptions, ViewItemMenu, switchRows, filterModel, hiddenFrameModel, viewIcon, Toolbar/ViewMenu + ViewFrame, Tables/{ColumnHeader,cellSweep,columnWidths,columnReorder,columnAlign,columnStyles}, Tiles/ViewTileScope, Properties/Assignment/valueUndo + cardValueInput's card half, notifications.restoreView
Core/Properties       Properties/* re-nested Cells/ Pickers/ Page/ Schema/ (PropertyFrame joins Schema/), Actions/linkResolve
Core/Tiles            TileHost, TileHandleMenu, tileKinds, useTileDoc, tileZoom, Surfaces/ whole (MarkdownTile, ViewTile, PageTile, WebTile + webRetention; every tile kind), tile-base.css whole, Interface/SpaceView, HomepageView, Frames/SettingsScaffold → HomepageSettings.tsx, Toolbar/SpaceMenu, Tiles/Core/* → Tiles/layout/
Core/MarkdownPM       MarkdownPM/* re-nested per A09 §6 (Model/, Render/, Guards/, Gestures/, Links/, Citations/, Embeds/, Menus/, Widgets/, Autocomplete/, Tables/); Toolbar/OutlineMenu + OutlineDnd + outlineTree, Tiles/tileCache, Subfield/subfieldStats, Interactions/useKeepInView
Core/Assets           Assets/*, Pickers/ImagePicker, Utilities/EntityIcon, useNexusIcon, Settings/IconPicker + iconFavorites (the bound picker; the unbound one is UIX's), Symbols entity-icon policy (:192-208), store.useAssetUrl
Core/Utilities        DesignSystem/Util/{capMap,checkSet,moveItem,pad}, Utilities/iteration-window (+ css)
Core/Settings         Settings/SettingsWindow, TrashFrame → Core/Trash/TrashFrame.tsx, AssetDirectoryRow, ExcludedDirectoriesRow, ClearActionRow, css; SETTINGS_WIN/SETTINGS_RAIL → UIX/Windows/bounds.ts
Core/Platform         Assets/assetUrl's scheme line, App.tsx:83–173 → useBridgeSubscriptions.ts, Actions/nativeMenus, openWebLink
No Core/Testing (ruling 09-05-2026: the folder collapses; each harness lives with what it exercises): Testing/editorHarness → Core/MarkdownPM/editorHarness.ts; Testing/pointerHarness → UIX/Interactions/pointerHarness.ts (nine importing folders, a gesture harness); Testing/pageValues + propsAtRoot → Core/Views/; Testing/setup → Core/vitest.setup.ts (the Core project's `setupFiles`)
Core/Interactions?    no — Actions/commands → UIX/Interactions/commands.ts; Sidebar/sidebarDndModel's generic half → UIX/Interactions/reorderModel.ts; Tables/tableDnd, Frames/frameDnd + model → UIX/Interactions
Desktop/Web           Windows/WebWindow + css, Glance site branch (L108–122, 267–273, 412–430 as a WebSurface implementation), glance-pane.css .glance-web*
Desktop/Renderer      main.tsx, index.html, env.d.ts, styles.css drag-region lines (:106-132, 160), the six -webkit-app-region rules, nativeEditorMenu (MarkdownPM/Editor/menu.ts:27-32)
Showcase/             Showcase/* + design-system.html + vite.config.ts
```

Files that dissolve into siblings in this move (no logic change): `Cards/Card.tsx` + `cards.css` → `UIX/Cards/`; `Tables/Table.css` + `table-tokens.css` → `UIX/Table/`; `Frames/InlineEditHeader` + header styles → `UIX/Menus/`; `Utilities/iteration-window` → `Core/Utilities/IterationWindow.tsx`; `nativeCaret.ts` + `Carets.css` + `text-selection.css` → `UIX/Caret/`; `DesignSystem/Util/{capMap,checkSet,moveItem,pad}` → `Core/Utilities/`; `Util/cx` → `UIX/Theme/cx.ts`; `Glass/glass-pane.tsx` `Surface` → `Core/Interface/InterfaceScaffold`.

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

**Now** — `rg -l "from 'node:" Core` → the Task 4 list (123 files); `Core/Store/{driver,open,schema,localState,versionsDb,sessionDb}` and `Core/Index/contentIndex.ts` hold the SQLite bodies whole (Task 4's deferral; this task splits them: interfaces in `Core/Platform`, bodies in `Desktop/Store`, `Core/Store` removed); `IO/fileLock.ts` uses `AsyncLocalStorage`; `ids.ts:64` `createHash`; `paths.ts:11` `sep`; `utimes` at every sweep; `realpath` at five sites (`mutate.ts:11`, `pathSafety.ts:41-42`, three more per A01 §3); `birthtimeMs` at two; `Buffer` in six files.

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
- [ ] Full gate green; one smoke launch; a property sweep's `utimes` call covered by its existing test.

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
- [ ] Full gate green.

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
- [ ] One smoke launch: the built app opens the scratch Nexus, renders the tree, opens a page, saves an edit; killed.
- [ ] Simplification then review against `<base>..HEAD`; concerns fixed or ruled.

---

### Phase 3 — Filing inside the domains

Each task in this phase runs review → polish → move, in that order (Nathan 09-05-2026). Before any re-nest, Fable reads the domain as it stands after Phase 2 and writes a short simplification list for it (duplicates, one-caller exports, dead paths, comment volume over the cap, a file that should not exist), applies or briefs those cuts, gates them green, and only then dispatches the move. The re-nest never carries something the review would have removed. The review also collapses every stylesheet of about fifteen lines or fewer into the sibling `.css.ts` of the component it styles, or the domain's one stylesheet where the component has none (a one-variable override like `card-add-picker.css.ts`'s single `--row-pad-y: 0` class is the type case and may become the element's own `style`; a real rule set joins a stylesheet); fourteen such files exist at Phase 2's end (`date-time-editor`, `card-add-picker`, `empty-value`, `entity-icon`, `view-host`, `option-row`, `nav-gallery`, `segment`, `autoscroll`, `asset-image`, `outline-menu`, `window-panel`, `iteration-window`, `progress-bar`). The list and its outcome go under Deviations per task.

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
Core/Interface/Sidebar/ Toolbar/ SidePane/ Subfield/ Windows/ Header/ Glance
  Windows/: `flavor` → `kind` everywhere (the `'page' | 'nav'` discriminant, `navFlavor` → `navKind`, the stored `open.flavor` key; 47 sites in 16 files, the compiler enumerates; the windows record is device-local, no migration)/ Notifications/ Confirm/
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
- [ ] Full gate green; the drag providers' existing tests pass under the one provider.

**Verify — user** *(none.)*

#### Gate 3 — every surface matches before

- [ ] Gates green; one smoke launch: the built app opens the scratch Nexus, renders the tree, opens a page, saves an edit; killed.
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
- [ ] Full gate green; one menu opened through each presenter (one native, one in-app) over CDP; the rest is the compiler's, since every family is one `row-menu` call.

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

**Becomes** — every item deleted, in this order: zero-importer exports and dead `export` keywords (compiler-safe) → dead store actions, unreachable paths, test-only functions (`closeSession`, `skipTopLevel`, `validateLayout`, `splitAtTile`, `tileIds`, `decorationsFor`, `parseTable`, the callout re-split, `allStructuralIds`, the nav `extras` path, `setNavOverride` + `navOverride`, `openSettings`, `setSubfieldOrder`, `.tabs-compact`) → duplicates (two frontmatter parsers → one in `Core/IO/pageFile.ts`; `isPlainObject` → one in `Core/Contract/result.ts`? no → `Core/IO/json.ts`; five normalizers → one; asset URL builder → one in `Core/Platform/assetUrl.ts`; four `WarmSeam` stores → one factory; four `ConnectionsApi` builders → one hook; four drag context skeletons → one provider in `UIX/Interactions`; `MeasuredRow` ×4 → one; the date-format label table → one; `MutateOutcome` ×2 → one; `containerOf` ≡ `parentOf`; `isTabRef` → `isNavRef`; seven boundary checks → `pathSafety.escapes`; two disambiguators → one) → the eleven same-name collisions renamed (A20 §1; logged) → residue (an export left with one caller inlined; a file left with one export folded).

The never-delete list holds; `VIEW_TYPES`' four unbuilt entries, the inert picker tiles, `AgendaMode.tsx` and its plumbing, and the two empty Settings frames stay (genuine placeholders; Nathan 09-05-2026).

**Verify — automated**

- [ ] Each named symbol → 0 across `Core UIX Desktop` (one `rg -F` per symbol; the list is the Now). Control: `rg -F "capSet" Core UIX` → ≥ 4.
- [ ] `rg -c "function isPlainObject" Core UIX Desktop` → 1. `rg -c "splitFrontmatter" Core` → 1 definition.
- [ ] Full gate green; test files = 321 minus those whose subjects left (named in Rulings); no test weakened.

**Verify — user** *(none.)*

#### Task 16: The two write-path bugs

**Requirement:** 9

**Why:** Found by the audit; cheaper inside the move.

**Now** — `Core/Nexus/remint.ts:113-128` writes a sidecar outside `withSidecarLock`; `homepage.json` written directly at five sites bypassing `updateNexusConfig` (A20 §4 lists them).

**Becomes** — remint's write goes through `Core/IO/sidecar.ts`'s lock; the five homepage sites call `updateNexusConfig`. Sibling sweep: `rg -F "writeJson(" Core` → every site is either inside a lock helper or a lock-taking function (list recorded).

**Verify — automated**

- [ ] Red-green: a test that races remint against a container write and asserts the final sidecar holds both facts; fails before.
- [ ] `rg -F "homepage.json" Core` → 1 site (the path constant) + `updateNexusConfig`. Control: `rg -F "updateNexusConfig" Core` → ≥ 6.
- [ ] Full gate green.

**Verify — user** *(none.)*

#### Task 17: Showcase severed

**Requirement:** 1

**Why:** It imports the app store through two Settings constants; a bounds file cuts it loose.

**Now** — after Task 5, `rg -l "@pommora/core" Showcase` lists whatever leaves still reach Core (PanesLeaf's bounds import is already gone: Task 5 lands `SETTINGS_WIN`/`SETTINGS_RAIL` in `UIX/Windows/bounds.ts`; the Lab left at Task 1).

**Becomes** — each remaining Core import replaced by the UIX primitive it wanted, or the leaf deleted; zero Core imports.

**Verify — automated**

- [ ] `rg -l "@pommora/core" Showcase` → 0. Control: `rg -l "@pommora/uix" Showcase` → ≥ 10. `npm run build:showcase` green.

**Verify — user** *(none.)*

#### Task 18: The harness scripts

**Requirement:** 11

**Why:** every harness script reads the old root; each is repointed and none retires (Nathan's ruling 09-05-2026: the comment ledgers stay). The comment manifest is what excludes comments from the closeout delta and what proves the twenty-line cap.

**Now** — `loc.py:23 SRC = "Pommora/src"` + AREAS map with six dead prefixes + `:64` skips `"testing"`; `check-atlas.mjs:19-21,33-40`; `comment-ledger.mjs`, `comment-manifest.mjs` (`../../Pommora/node_modules/typescript`, `:87` pins 88); `.claude/hooks/republish-ledger.mjs` calls the ledger; `settings.json` PostToolUse hook; `settings.local.json:6-9` four dead `cp` permissions; `.claude/scripts/README.md`.

**Becomes** — `loc.py` walks `Core UIX Desktop Showcase`, area = `<workspace>/<first folder>`, series keyed so `loc-history.json` continues (a `renamed_from` map for the old areas); `check-atlas.mjs` reads `UIX/`; `comment-ledger.mjs` and `comment-manifest.mjs` resolve TypeScript from the root `node_modules` and walk the three workspaces, the pin at `:87` lifted to the installed major; `comment-baseline.json` re-snapshotted at Gate 5's base and `comment-units.json` regenerated; `Line-Ledger.html` and `hooks/republish-ledger.mjs` unchanged beyond the paths they read; README rewritten for the new roots; the four dead permissions removed.

**Verify — automated**

- [ ] `python3 .claude/scripts/loc.py` runs and prints per-area lines. `node .claude/scripts/check-atlas.mjs` → "16 atlas tables checked" or the new count with the reason logged.
- [ ] `node .claude/scripts/comment-manifest.mjs` runs and reports per-file comment lines for `Core UIX Desktop`; no file above twenty. `node .claude/scripts/comment-ledger.mjs --verify` exits 0 against the fresh baseline.
- [ ] `rg -F "Pommora/" .claude/scripts .claude/hooks .claude/settings.json` → 0. Control: `rg -F "UIX/" .claude/scripts/check-atlas.mjs` → ≥ 1.

**Verify — user** *(none.)*

#### Task 19: The docs path sweep and stale claims

**Requirement:** 11

**Why:** 199 prefixed citations, 120 bare folder names, 38 stale claims (A18 §2, §4).

**Now** — A18 §2's doc × pattern table; A18 §4.1's 38 misses by class.

**Becomes** — Haiku sweeps the mechanical patterns per A18 §2 with the path table below; Opus rewrites the 38 misses and the folder-spined sections of `DesignSystemPM` (its `Components/` heading gone; sections follow UIX's root categories) and `MarkdownPM.md` §Architecture; every Features doc gains a first-line `**Workspace:** Core · UIX · Desktop · cross-cutting` tag.

Path table (every doc reads through it): `Pommora/src/main/<x>` → `Core/<domain>/<x>` per Task 4's table; `src/renderer/<Folder>/` → per `renderer-moves.tsv`; `src/shared/<x>` → per Task 3's table; `src/preload` → `Desktop/Bridge`; `DesignSystem/<Sub>` → `UIX/<Sub>`; "run from `Pommora/`" → "from the repo root"; `npm run dev` → `npm run dev` (root forwards).

**Verify — automated**

- [ ] Dead Vocabulary sweep for the doc tokens → 0 each against controls.
- [ ] The 38 claims re-probed with `rg` against the new tree → 38 hits.

**Verify — user** *(none.)*

#### Task 20: The rules, the Architecture split, the Mobile plan

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

The run board at `// Planning // Pommora Monorepo — Progress.html` is republished to https://claude.ai/code/artifact/7c901e31-31ae-47e0-83e5-03b437eaa681 after every task and gate; its `DATA` block is the one place state is edited. Its code-line series comes from `~/Pommora-Scratch/codelines.py <hash...>` (TS and CSS under the app source, minus tests, shims, configs, Showcase, comments, blanks), run at every landed commit.

- [ ] **Phase 0** — Baseline, scratch, spike · base `7941edec`
  - [x] Task 0 — Baseline and scratch Nexus (launch check moved to Task 1)
  - [x] Task 1 — Root, workspaces, spike · `ebed2f3a`
- [x] **Phase 1** — shared dissolves · Gate 1 `90e2436b`
  - [x] Task 2 — Contract and dialer type · `df7cde74`
  - [x] Task 3 — shared dissolves, types.ts first · `30b897c9`
- [x] **Phase 2** — Engine out of Electron · Gate 2 `de8c32b8`
  - [x] Task 4 — Pure engine domains move · `e004a49a`
  - [x] Task 5 — Renderer into Core and UIX · `7f8452c8`
  - [x] Task 6 — Platform seam · `1cceaae3`
  - [x] Task 7 — Dialer replaces api · `1c052c1a`
  - [x] Task 8 — index.ts splits · `4f6a8898`
  - [x] Task 9 — Dispatcher and the one sweep · `838b1fa0`
- [ ] **Phase 3** — Filing inside the domains
  - [x] Task 10 — Domains settle · review `d1e42e19` · comments `3804eb52` · move `48b23960`
  - [x] Task 11 — MarkdownPM re-nests
  - [x] Task 12 — UIX settles; motion
- [ ] **Phase 4** — The two layers
  - [ ] Task 13 — One menu path
  - [ ] Task 14 — Editor host
- [ ] **Phase 5** — Removals, fixes, docs
  - [ ] Task 15 — Kill list
  - [ ] Task 16 — Write-path bugs
  - [ ] Task 17 — Showcase severed
  - [ ] Task 18 — Harness scripts
  - [ ] Task 19 — Docs sweep
  - [ ] Task 20 — Rules, Architecture split, Mobile plan

### Post-Compact Prompt

Ruled 09-06-2026 (Nathan, asleep): this prompt carries a fresh supervisor from wherever the run stands to the origin push. Hand it back verbatim after any compaction.

```
You are the supervising session (Fable) of the Pommora monorepo run, overnight, unattended. Repo: /Users/nathantaichman/The Studio/Projects/Project Pommora, branch main. Nathan is asleep; the run completes end-to-end without stopping. Hard stops only: a gate red twice on the same task, a behavior no agent can verify, a decision the plan and its Rulings lack, or new visible UI. Anything else you decide yourself, record under Deviations, and continue.

READ FIRST, IN ORDER
1. .claude/Planning/Pommora Monorepo — Implementation Plan.md — Goal, Requirements, Global Constraints, Dead Vocabulary, then the Implementation Log: Progress (ticks say where you are), Rulings (all of them; the "Findings Q&A rulings" block binds Tasks 10–15 item by item), Deviations (newest first: what each landed task ruled and what it left for a later one), Open Against Later Tasks, Sequenced After, Completion Criteria.
2. .claude/Planning/Pommora Monorepo — Findings Q&A.md — Nathan's own words per ruling; if a live edit sits uncommitted in it, read it, commit it, and treat it as a ruling.
3. .claude/Planning/Pommora Monorepo — Decision Log.md — only the sections a task cites.
4. .claude/CLAUDE.md, .claude/Guidelines/Development-Environment.md.
5. `git log --oneline -15` and `git status --short`. A dirty tree means an agent was mid-flight when compaction hit: run the four gates; if green and the diff reads as one task's work, commit it under that task; if red, `git checkout HEAD -- <the files the diff names>` only after confirming no agent is live (ListAgents), then redispatch that task.

WHAT NATHAN WANTS (the mandate, verbatim in spirit)
An easier to read, cleaner, more sustainable codebase: fewer files, less complexity, less duplication, near-zero comments. The code-line delta from base 7941edec MUST end negative (`python3 ~/Pommora-Scratch/codelines.py <hash>`; base 69,459; check the board's series for the latest). Variable/function/export names unchanged except where a ruling names one. No new abstractions unless a Becomes or a ruling names them. Moves are git mv. Nothing that makes a future refactor harder. A file's contents match its name. Small stylesheets fold only into a sibling .css.ts, a domain sheet at the domain root, or an element style that fully describes them; otherwise they stay. Comments: absolute minimum, one-line whys only; KNOB, LOAD-BEARING, (Nathan's call), // PLACEHOLDER markers survive byte-for-byte. Defensive code for unreachable states goes. Glass Controls/Segment stay two; AgendaMode and the empty Settings frames stay; .tabs-compact stays; UIX imports nothing from Core; every tile kind in Core/Tiles; every color declaration and value in one UIX/Theme file; every Core domain's stylesheets at its root.

HOW YOU WORK (Nathan's rules on the supervisor)
- Orchestrate only. Never drive smoke launches, CDP, or hand loops yourself; never read many files yourself. Opus agents are free on Nathan's plan and your context is the scarce resource: delegate every task, review, sweep, verification, and doc draft to background Opus agents (`Agent` tool, run_in_background true, model opus, no sub-agents, no worktree, no commits), read only their final reports, message them mid-flight only when needed. Fable (model fable) only for Tasks 13 and 14 (ruled). One tree-touching agent at a time except where two have exclusive folder lists; confirm the tree is still (ListAgents) before dispatching onto it.
- Every implementer brief carries: what to read (the plan sections above + its task + its rulings), its exclusive folders, the Becomes verbatim, the constraints paragraph (comments minimum, names, git mv, no new abstractions, no while-I'm-here, never touch other folders), its loop (`npx tsc -p <workspace>`, `npx vitest run <folders>`, exit codes direct, never piped), the four root gates before reporting (`npm run typecheck && npm run test && npm run lint && npm run build`, baseline counts stated), the smoke recipe below when the task touched runtime code, and the report shape (files created/moved/removed, the task's Verify lines with actual outputs, gate exits + vitest summary, smoke results, `git diff HEAD --stat | tail -1` with non-test vs test split, deviations with reasons, bugs seen not fixed, comment-line max).
- Smoke recipe (the agent runs it, once per task or gate that touched runtime code): `npm run build`, then from Desktop/: `POMMORA_USERDATA=~/Pommora-Scratch/userData env -u ELECTRON_RUN_AS_NODE ../node_modules/.bin/electron . --remote-debugging-port=9333 &`; wait ~10 s; over CDP (Node 24's built-in WebSocket against http://localhost:9333/json's page target, Runtime.evaluate with awaitPromise/returnByValue): `window.nexus.ask('nexus:state')` → status open (not enveloped: it returns {status, tree}); document.body.innerText shows the tree; `ask('page:open','Ideas/Claude-Codemap-Hook.md')` ok; `ask('page:updateBody', that path, '\n\nsmoke-N')` ok and on disk; restore the file byte-for-byte from a backup taken first; `pkill -f "node_modules/.bin/electron ."`; confirm none remain. Only ~/Pommora-Scratch/NexusOS, never ~/NexusOS, never the chooser. Task-specific extra: exercise what the task moved (a mutate arm, a menu channel, the editor).
- When an agent reports: run the four root gates yourself once (that is the one hands-on check), spot-check the diff stat, then commit its paths with `git add -A -- <its folders>` and a message describing what changed and why (never git add -A bare; never stash/reset/checkout on the shared tree). Nathan's own uncommitted comment trims in adjacent files ride along. Then: tick the task in Progress with its hash; write its Deviations entry (files, +/− and code-line delta, every ruling made at commit, every item left for a later task, the smoke result); add items to Open Against Later Tasks; add the hash to the board's `loc` series (`python3 ~/Pommora-Scratch/codelines.py <hash>`) and a gate block; commit .claude/Planning; republish the board (`Artifact` tool, file .claude/Planning/Pommora Monorepo — Progress.html, url https://claude.ai/code/artifact/7c901e31-31ae-47e0-83e5-03b437eaa681); send a PushNotification (one line: task, hash, tests, delta). The post-commit hook prints a stale-ledger notice and a check-atlas ENOENT until Task 18/19 repoint them; republish .claude/scripts/Line-Ledger.html to https://claude.ai/code/artifact/7840fc59-41d5-4692-b5b6-c45de4d11401 when the hook says so.
- A DONE_WITH_CONCERNS report means fix: send the agent back for the concern (SendMessage to its id) unless the fix is a later task's by ruling; log the rest.
- A reviewer's "not fixed, behavior change" on a bug the plan or a ruling names: fix it with a red test via the agent.

BRIEF TEMPLATE (ruled: every non-architectural review or sweep is briefed like the 09-06 simplifiers; Fable's Tasks 13–14 stay architecturally scoped)
"Pommora monorepo run. Repo: <path>, HEAD <hash>. Read first: the plan's Global Constraints, the Rulings in full (the Findings Q&A block, the 09-06 rulings on dead code, defensive branches, stylesheets, the negative delta), Deviations, Open Against Later Tasks (logged; don't re-report; don't pre-empt later tasks' ruled fixes). Your exclusive folders (touch nothing else; siblings own the rest): <list>. If a cut needs one edit outside, skip it and report. Nathan's words: 'an easier to read, cleaner, and more sustainable codebase; this removes files and complexity.' Architecture-free: behavior identical; names unchanged; no moves; no new abstractions, barrels, or index files. Cut, in this priority: duplicate logic (Rule of Two met → one, using the existing better half, never a new helper), one-caller exports inlined, forwarding re-exports, dead branches the type gate proves unreachable, defensive code for unreachable states, hand-rolled parallels to UIX/Utilities or UIX/Theme, nested conditionals that flatten into a switch or early return, a file whose contents don't match its name (report; rename only when obvious), stylesheets ≤ ~15 lines with a sibling .css.ts or element style to fold into (nothing manufactured), comments to one-line whys (every file ≤ 20; KNOB, LOAD-BEARING, (Nathan's call), // PLACEHOLDER byte-for-byte). Don't make a future rework harder; when a cut is arguable, leave it and list it. Prove the floor or beat it; report the delta honestly. No commits, stash, reset, checkout, sub-agents, worktree, app launch. Loop from the root, exit codes direct, never piped: npx tsc -p <ws>, npx vitest run <folders>. Before reporting: the four root gates (baseline stated; a red only in another agent's folders is theirs, say so). Report: each cut as file → what → lines; arguable cuts left; bugs seen (not fixed); comment-line max; gate exits + vitest summary; git diff HEAD --stat -- <folders> | tail -1 and the code-line delta (non-test, non-comment)."

STATE AT THE LAST UPDATE OF THIS PROMPT (09-06-2026, after the Q&A commit 19538867)
- Task 12 is done (`50eded4f`, 69,223, −236 vs base). Gate 3's review (one Opus code-simplifier over `de8c32b8..HEAD`, dual-briefed simplify + attack, whole tree) was dispatched; Task 12's smoke stands as the gate's. Land it as Gate 3's commit, tick Phase 3, then the Phase 4 notification and Task 13 (Fable, comment killer first).
- S1/S2 report-only items to carry into Task 15's inventory: ConnectionsApi built at four sites (PageWindow, NavWindow, TileHost, PageView; one source beside resolveOnlyConnections in Core/Session/treeIndex.ts); Interface/styles.css + Interface/Interface.css both imported by Desktop/Renderer/main.tsx (token half → UIX/Theme at Task 12); Core/Interface/chrome.ts a bag of three unrelated types; Core/Views/viewRow.ts holds UI unions belonging with views.ts; LayoutToggles/CardsOptions twins; scopeSet's dead typeof guard (Core/Interface/handlers.ts:39).

SEQUENCE FROM HERE (check Progress ticks; skip what is ticked)
Phase 3 (review → polish → move per domain; Opus):
- Task 11 MarkdownPM: (a) pre-move review agent (may be running or landed: rulings 16–18, caretSeat → caretPlacement, Tables/widget.css → markdown-tables.css at the domain root, a color inventory for Task 12, A10 dead code that Task 14's rulings 38–43 don't own, comments to minimum); commit. (b) an Opus comment killer over Core/MarkdownPM if the review left any file over twenty. (c) the re-nest agent per Task 11's Becomes and ruling 16: Engine/ (not Model/) Input/ Guards/ Gestures/ Links/ Citations/ Embeds/ Widgets/ Menus/ Tables/ Autocomplete/ with MarkdownEditor.tsx and markdown-pm.css (Styles.css renamed) at the root; no Render/ or Styles/ folder; look-related code at the root beside the sheet; the pure model in Engine/ imports nothing React/DOM; the Editor/ bin stays until Task 14 dissolves it (do not pre-empt Task 14's EditorHost). Verify lines from the task. Smoke: open a page, type into the editor over CDP (hit-test activeElement first), save, restore.
- Task 12 UIX settles: one Opus agent over UIX/** (the lane already simplified it; this is the settle): rulings 19–30 verbatim from the Rulings block (knobs distinct, BLOOM canonical + baseSnap survives, OverScroll reads --ease-base and "close enough is close enough" across all animation work, easeOutQuint tied to a token, menu densities sourced once, unread icons dropped only where zero readers (house goes; list-rounded, chart-gantt stay; keep the six otherwise ruled at 49), Tabler by named import, Lucide whole, title* weight classes gone, icon steps footnote + control, MenuSurface/MenuDropdown/PickerMenu deliberate, solid button + outline variants + solid tint stay, pane widths in localStorage); size.css.ts folds into theme-vars.css.ts; every color declaration and value across Core/Desktop/UIX consolidated into ONE UIX/Theme file (the MarkdownPM inventory from Task 11's report, PINK and the ramp seats included: nothing stranded); motion has one definition in UIX/Animations; the seven misfiled feature files leave UIX (C-5); UIX/Theme ends minimal. UIX imports nothing from Core except the PickerControl → nativeMenus edge Task 13 severs. Verify lines from the task.
- Gate 3: the agent's smoke stands if Task 12's touched runtime code; else one smoke by an Opus agent. One Opus simplifier review of the Phase 3 range (last Gate 2 hash de8c32b8..HEAD) dual-briefed (simplify + attack the implementation, report bugs). Commit, tick, board, notification.
Phase 4 (Fable implements; Opus comment killer first over each task's files, aiming for half or more):
- BEFORE dispatching Task 13: send a PushNotification that reads "POST-COMPACT PROMPT READY — Phase 4 starting; compact whenever you wake" and print this prompt's location in chat (this section). Then continue without waiting.
- Task 13 (Fable): every list menu on one path per the Becomes and rulings 31–37: one model in Core/Actions, one channel, one native popper in Desktop/Actions, one in-app presenter in Core/Interface; menu channels 26 → 1; native stays the desktop default (ruling 31), the two surfaces honoring nativeMenus keep honoring it; `checked` is the one flag, no radio flag, interaction and visuals unchanged; icons per presenter unchanged; tileMenuModel gone, TileHandleMenu's painting canonical and the native tile menu derived from the same source; ActionItem.confirm stays; sidebar and band picks run in the renderer with in-app failure notifications; the editor context menu stays native and whole. Sever the UIX→Core edge: PickerControl no longer imports Core/Platform/nativeMenus; revert UIX/tsconfig.json's types/skipLibCheck/dialer-include hacks from Task 5. No menu's contents change. Verify lines from the task.
- Task 14 (Fable): the editor takes an EditorHost from its mounter per the Becomes; the pure model in Core/MarkdownPM/Engine; the Editor/ bin dissolves; rulings 38–45 (refusedInAlias wired into the cell editor; autocomplete reads the cached document scan; double-backtick spans render as md-code; $$ coloring from the block model's pairing; one callout-head rule, Detect's; editor zoom collapses to 15pt × scale within 0.5–1.5; glance dwell table stays one row with a one-line note; iOS keyboard attributes stay, flagged as mobile scaffolding). Each of 38–42 gets a red test first.
- Gate 4: smoke by the agent; one Opus simplifier review of the Phase 4 range; commit, tick, board, notification.
Phase 5 (Opus):
- Task 15 kill list per F-2/F-3 as amended and the 09-06 rulings: .tabs-compact stays (window tabs use it); A16 and most dead-code citations removable; A08 taken with salt (fold where nothing changes, delete only with no consumer); every defensive branch for an unreachable state goes; rulings 46–50 (asset migration already restored; trash date labels unify with DATE_FORMAT_LABELS; createdAt stays; only house goes; NavMenu stays); sessionDb()/sessionVersionsDb() have zero production consumers (28 test sites; re-express or keep as the test escape hatch, your call, log it); mutateRequest.ts's setProfileSubtitle fence ruled here (keep the function if a surface will use it, else delete both); six dead dependencies and the dead build config. Inventory first (dead regardless / dead by rule / needs confirmation), never-delete list honored, deletion order, residue pass. This task must bring the run negative with margin: report the delta.
- Task 16 the write-path bugs: the plan's two (sidecar writes under the lock; homepage.json through updateNexusConfig) plus the three found in-run, each with a red test first: an unknown PropertyValue.kind through mutate setProperty is refused, never a clear; UIX/Interactions/tableDnd.tsx's within-group reorder skips the dragged id (route through nextOrder once they agree); IconPicker.tsx's openContext deps include favorites.onMenu. Sibling sweep for each.
- Task 17 Showcase severed (compiles only; never a priority).
- Task 18 harness scripts: loc.py counts Core UIX Desktop (the ledger's areas remapped to the new tree), check-atlas.mjs repointed at UIX/Theme's one color file and theme-vars, comment-ledger.mjs/comment-manifest.mjs resolve TS from root node_modules and walk the three workspaces, baseline re-snapshotted; the format script excluded from .claude (it reflowed two audit Markdown files). Then regenerate and republish the Line-Ledger artifact from the new sources.
- Task 19 + Task 20 docs (Opus, its own targeted phase after the code is still): every path citation and bare folder name swept (Dead Vocabulary lines), 38 stale claims corrected, ArchitecturePM split into a Core map and a Desktop doc, Features tagged, DesignSystemPM's spine mirrors UIX's root categories, PommoraPRD's retired keys corrected, CLAUDE.md Hard Rules restated and kept tight (nothing added that doesn't apply to the whole project; new launch commands: dev `env -u ELECTRON_RUN_AS_NODE npm run dev -- --remote-debugging-port=9333` from the root, built `cd Desktop && env -u ELECTRON_RUN_AS_NODE ../node_modules/.bin/electron .`), Development-Environment's CJS claim corrected, the Mobile plan's Task 0 and Phase 8 marked superseded with a path table, the Mobile decision log's A-6/K-1 restated. Budget: measure total characters across .claude/{CLAUDE.md,Features,Guidelines,ContextPM.md,HandoffPM.md,FrameworkPM.md} before and after; end within ±250. Every claim reworded to be true, never amended with "was/formerly". ContextPM's Known Issue on WEB_PARTITION removed as resolved.
- Gate 5: gates green; the Acceptance block's every line checked by an Opus agent (electron only under Desktop; @pommora/core in UIX → 0 except none; test count = 321/4,006 minus the named removals plus the named additions; delta negative); every Dead Vocabulary line with its control; one smoke.
CLOSEOUT (Opus agents, in this order, each committed before the next):
1. Comment killer over the whole of Core UIX Desktop (very aggressive; markers survive; every file ≤ 20, most far under).
2. Delivery Claim: an Opus agent writes .claude/Planning/Pommora Monorepo — Delivery Claim.md from the plan's Completion Criteria: each Requirement 1–12 with the evidence (hash, grep, count), the Acceptance block's outputs, the final delta, the test count reconciliation, every deviation and open item in one list.
3. Neutral verification: a fresh general-purpose Opus agent handed ONLY the Delivery Claim and the repo, told to verify every claim independently and report which fail. Fix failures via agents; re-verify.
4. Attack: build-breaking-agent (Opus) over the whole run (base..HEAD), plan-and-implementation mode; verified findings fixed via agents (each with a red test), the rest ruled and logged.
5. Simplification: code-simplifier (Opus) over what the attack left, whole tree, delta must stay negative.
Then: History — .claude/HistoryPM.md gets "PM-129 || The Repo Restructure" per .claude/references/History-Format.md (read it), one to two paragraphs, the broad idea (the monorepo, the seam, the domains, the two layers, the removals; the delta), not findings or folds. Context — .claude/ContextPM.md per Context-Format.md: where things stand, the new tree at depth 1, the launch commands, Open Questions gains "showError vs notifyError" (ruling 6) and any unresolved item, Known Issues gains what the attack ruled out of scope, and Nathan's own pass is the ONE pending item. Handoff — .claude/HandoffPM.md for this session (summary, changes, notes, pending focus). Ledger redone at the new sources (Task 18's scripts run, Line-Ledger.html regenerated, republished). The board's every task done, its final series, its closeout block; republish.
FINALIZATION: `git status` clean; all four gates green once more; `git log --oneline 7941edec..HEAD | wc -l` for the count; `git push origin main` with the last commit's message being the complete summary: what the repo is now (six workspaces, the seam, the dialer, the handler maps, the domains, one menu path, the editor host, the removals), the final code-line delta against 69,459, the test count, the hashes of every gate, and the pending item (Nathan's own pass). PushNotification: "Pommora monorepo run complete — pushed <hash>, delta <n>, tests <n>; your pass is the one pending item."
```

### Rulings

- 09-06-2026 (Nathan): the simplification agents' briefs — Nathan's mandate quoted in his own words, the cut priority list, "arguable cuts left", proven-not-asserted floor claims — are the template for every non-architectural review or sweep from here; the Fable phases (Tasks 13, 14) stay architecturally scoped within the plan's core principles.
- 09-06-2026 (Nathan): the implementation as it stands gets a whole-tree Opus simplification pass now, in parallel with Task 11, as the Phase 4 stop taken early; the plan does not pause for it. Exclusive folder lists per agent; Core/MarkdownPM excluded while Task 11's review holds it; architecture-free, behavior identical, the delta must fall.
- 09-06-2026 (Nathan): `caretSeat` → `caretPlacement` (identifier and file, wherever it lives). MarkdownPM's `Tables/widget.css` → `markdown-tables.css` at the domain root. Every color declaration and value lives in `UIX/Theme`, in one file; a color declared anywhere else (a stranded pink included) moves there at Task 12. Tasks 19 and 20 (both parts of the docs work) run on Opus.
- 09-06-2026 (Nathan): a small stylesheet collapses only when it has a sibling `.css.ts` or domain sheet to bind to, or an element style that describes it fully. `autoscroll`, `progress-bar`, and the like stay as files because nothing of theirs exists to fold into. `nav-gallery.css` folds into `NavGallery.tsx` where the TSX can describe it.

**Findings Q&A rulings (09-06-2026, Nathan; `// Planning // Pommora Monorepo — Findings Q&A.md`).** Binding on every remaining task. Two standing rules ride every item: a file's contents must match its name, and only fixes that stay true regardless of future direction are made here.

- Task 10: (1) `PageProperties`/`PagePanel` keep both Context-row behaviors behind one cleanly named variant. (2) One property stylesheet (the vanilla-extract one); the window pane's own padding and the panel's padding stay unchanged. (3) `.page-window-insp` and the history column are both the window panel: one name, `window-panel`, same as the component. (4) View delete: `ViewFrame.tsx`'s rule wins (any view when more than one exists); `ViewItemMenu`'s default-view refusal goes. (5) Recents reorder: `setRecentsOrder` is the writer; `reorderRecent` removed. (6) `showError` vs `notifyError` stays as is; filed as a ContextPM open question at closeout. (7) The three disabled controls stay, each with a one-line `// PLACEHOLDER` comment. (8) `empty_placement` is the grouped view's placement; where `ungrouped_placement` already solves it, the duplicate collapses. (9) One tab-close hook (`TabClose` or similar) for `TabBar` and `WindowTabStrip`. (10) Slide/morph twins stay as they are. (11) Cache policies stay distinct; glance's cap moves 8 → 10. (12) The iteration window ships as is. (13) `UIX/Pickers/IconPicker` is the component; Core's wrapper is the binding that decides the icon and is named for that (`IconChoice`), living in `Core/Assets`. (14) The Card primitive is `UIX/Cards` (done at Task 5). (15) `subfieldOrder` goes entirely: store action, disk key, reader.
- Task 11: (16) MarkdownPM re-nests as `Engine/ Input/ Guards/ Gestures/ Links/ Citations/ Embeds/ Widgets/ Menus/ Tables/ Autocomplete/` with `MarkdownEditor.tsx` and `markdown-pm.css` at the root (the `Styles` folder and a `Render/` folder do not exist; look-related code sits at the root beside the stylesheet). Every Core domain keeps its stylesheets at the domain root. (17) `WebTile` stays in `Core/Tiles/Surfaces` with one line saying it lacks a tile-detail-surface creation method. (18) The `↔` glyph is one `.dual-direction-arrow` rule in `markdown-pm.css`, no document scan.
- Task 12: (19) Slider and DualSwitch knobs stay distinct; the false doc line is gone. (20) `BLOOM` is the canonical curve; `baseSnap` survives; any duplicate declaration collapses. (21) OverScroll reads `--ease-base`; across all animation work, close enough is close enough. (22) `easeOutQuint` ties to an existing token. (23) Menu row density keeps both variations, sourced once and exported from one high-level place, no duplicate branches. (24) The curated registry stays; unread entries drop; `allSymbols` reads Lucide plus the Tabler glyphs imported by name. (25) Tabler enumerated by named import where used; Lucide ships whole. (26) The `title*` weight classes go; weight is per-style as needed. (27) Icon steps are `footnote` and `control`; `callout`/`subline` icon steps repoint to them; both font-scale names stay. (28) `MenuSurface` (square glass pane) and `MenuDropdown` (the beaked one) are deliberate; `PickerMenu` derives from `MenuSurface`; only true dead branches go. (29) `Button type="solid"`, `Segmented.outline`, `InputField.outline`, and the `solid` tint step stay. (30) Pane widths stay in `localStorage`.
- Task 13: (31) Right-click menus stay native on desktop; the two surfaces honoring `nativeMenus` keep honoring it; the collapse to one model/channel/popper/presenter does not flip the default. (32) `checked` is the one flag; no `radio` flag; interaction and visuals unchanged. (33) Menu icons stay as they are per presenter. (34) `tileMenuModel` goes; what `TileHandleMenu` paints today is canonical and the native tile menu derives from the same source. (35) `ActionItem.confirm` stays for in-app surfaces. (36) Sidebar and band menu picks run in the renderer; a failed mutation is an in-app notification. (37) The editor context menu stays native and whole; a simplification pass only if due.
- Task 14: (38) `refusedInAlias` wired into the table cell editor. (39) Autocomplete reads the cached document scan (fence-blind no more). (40) Double-backtick spans render as `md-code`. (41) `$$` coloring derives from the block model's pairing. (42) One callout-head rule, Detect's. (43) Editor zoom collapses to 15pt × scale within 0.5–1.5. (44) The glance dwell table stays one row with a one-line note that more glance surfaces will be added. (45) The iOS keyboard attributes stay, flagged as mobile scaffolding.
- Task 15: (46) The asset-directory migration (relocating banners and profile images when `asset_directory` changes) is kept: Task 4 deleted `assetMigrate` under F-3, so it is restored from `e004a49a^` with its 13 tests at the Assets review, and F-3 is amended in the decision log. (47) Trash date labels unify with the column enumeration (`DATE_FORMAT_LABELS`). (48) `createdAt` stays. (49) Of the six unread icons only `house` goes; `list-rounded` and `chart-gantt` stay. (50) `NavMenu` stays.

- 09-06-2026 (Nathan): Finalization pushes `main` to origin with a complete summary in the push's commit message. History gets a one-to-two-paragraph entry, "The Repo Restructure": the broad idea, not the findings or folds. A phone notification goes out at every task and gate landing, and loudest at the post-compact prompt before Phase 4, since Nathan must hand it back and compact himself.
- 09-06-2026 (Nathan): the code-line delta from base MUST end negative; fewer files and less complexity is the mandate, not a side effect. Standing at Task 9: 69,757 against 69,459 (+298). Every Phase 3 review reports its delta before its move dispatches; Task 15's kill list and the defensive-branch sweep are sized to clear the deficit with margin; a task that would end the run positive is reworked, not accepted.
- 09-06-2026 (Nathan, going to bed): the run completes end-to-end without stopping; the only hard stops are the plan's (a gate red twice, an unverifiable behavior, a decision the log lacks, new visible UI). A post-compact prompt is written into this Log before Phase 4 opens (Nathan's one chance to re-prompt manually). Closeout is Opus agents in this order: comment killer → Delivery Claim → neutral verification → attack review → simplification. The final step redoes the line ledger at the new sources: `loc.py` repointed (Task 18), the ledger regenerated and republished, the run's series recomputed from it.
- 09-06-2026 (Nathan): Closeout order is attack review first, then the simplification pass over what the attack left; the run is overnight, so Nathan's own pass is recorded in ContextPM as the one pending item rather than awaited.
- 09-06-2026 (Nathan): Documentation reconciliation (Tasks 19–20) runs as its own targeted phase after the code is still: every claim reworded to be true, on a tight line budget — the total character count across the `.claude` registry (CLAUDE.md, Features, Guidelines, Context, Handoff, Framework; Planning, Sessions, and History excluded because they grow by design) stays within about ±250 of its count at the phase's start, measured before and after. `CLAUDE.md` stays tight: rules restated, nothing added that does not apply to the whole project.
- 09-06-2026 (Nathan): The Findings Q&A (`// Planning // Pommora Monorepo — Findings Q&A.md`) is complete; its answers are read and confirmed back as rulings before Task 10 opens.
- 09-06-2026 (Nathan): For Task 15, `.tabs-compact` stays — A16's "nothing toggles compact" was wrong; `Core/Interface/Windows/WindowTabStrip.tsx:110` applies it, so window tabs use the compact density. Otherwise A16 (renderer shell dead) and most dead-code citations across A02, A08, A10, A12, A14 are removable as listed. A08 (renderer foundation dead) is taken with salt: most of what it names has a use; folding or simplifying is the right move where it changes nothing, deletion only where the compiler or a grep proves no consumer.
- 09-06-2026 (Nathan): Defensive code for unreachable states goes entirely at Task 15 (casts for tests without a bridge, catches on envelope channels that cannot reject, `?? []` on values the type proves present, guards on states a union rules out).
- 09-06-2026 (Nathan): At Task 12, `UIX/Theme/size.css.ts` folds into `theme-vars.css.ts`; `UIX/Theme` ends with a minimal file set, each a clear stylesheet or token module.
- 09-05-2026 (Nathan): `Core/Testing` collapses. Harnesses live beside what they exercise (editor harness in MarkdownPM, pointer harness in UIX/Interactions, the two Views helpers in Views, `testTree` back in Navigation), the two JSON fixtures in `Core/Views/fixtures/`, and the vitest setup file at Core's root as `vitest.setup.ts`.
- 09-05-2026 (Nathan): `flavor` leaves the codebase as a word for a variant; `kind` replaces it (Nathan offered Layout, Type, or anything else; `kind` is what the codebase already says for tiles and entities). Executed at Task 10 with the Windows settle; swept at Gate 5.
- 09-05-2026 (Nathan): The comment ledgers stay; Task 18 repoints them rather than deleting them. Their working-tree deletion earlier today was Nathan's own and is restored.
- 09-05-2026 (Nathan): Verification is one smoke launch per gate that touched runtime code; hand walks, screenshot sets, and per-family right-click lists dropped. Reviews attack the implementation, not whether the app works.
- 09-05-2026 (Nathan): A stylesheet that does not need to exist (roughly fifteen lines or fewer) collapses into its component's sibling `.css.ts`, or the domain's one stylesheet; done in Phase 3's review of each domain.
- 09-05-2026 (Nathan): Before each Fable task (6, 8, 13, 14), an Opus comment-killer pass runs first over every file that task touches, aiming for a reduction of half or more, MarkdownPM above all; `KNOB` and `(Nathan's call)` markers survive. Single-handed, no sub-agents, no worktree; gated and committed before the Fable task dispatches. This supersedes the earlier "no comment-cleanup agents" instruction.
- 09-05-2026 (Nathan): Phase 3 (Interface, Views, Properties, Tiles, Navigation, Settings; MarkdownPM; UIX) is review → polish → move. Fable analyzes and simplifies each domain before its re-nest is dispatched; nothing is filed that a review would have cut.
- 09-05-2026 (Nathan): `AgendaMode.tsx` with its plumbing and the two empty Settings frames are placeholders for Agenda and future settings, not dead code; they move with their domains and no pass deletes them.
- 09-05-2026 (Nathan): The Glass recipes for Controls and Segment are identical on purpose, kept as two so they can diverge later. No pass (Task 12's UIX settle, Task 15's duplicate collapse, any simplifier) merges them.
- 09-05-2026 (Nathan, then reversed the same day on Claude's objection): the icon-picker binding stays in Core (`Core/Assets`, beside the entity-icon policy); UIX imports nothing from Core, no exceptions. `Core/Utilities` exists as a folder for what the user never invokes: the four kit data helpers and the iteration window. The commands the user does invoke (`DEFAULT_COMMANDS`: toggle-ribbon, toggle-nav, paste-inverse) are `Core/Actions/commands.ts`; the chord matcher is a keyboard mechanism and stays `UIX/Interactions/commands.ts`. Icon files other than the picker binding stay in `Core/Assets`.
- 09-05-2026 (Nathan): Fable implements Tasks 6, 8, 13, 14 and authors Task 5's `renderer-moves.tsv` (Haiku still executes it). Every other task keeps its Opus or Haiku assignment.
- 09-05-2026 (Nathan): Every tile kind lives in `Core/Tiles/Surfaces` (Page and Web tiles included); the tile calls its domain's actions (Pages' save and open, Web's link open and title fetch) rather than moving to the domain. The web tile stays `<webview>` end to end, so the `webview` JSX intrinsic is declared in Core and a phone host simply never mounts that kind.
- 09-05-2026 (Nathan): Connections never holds Glances; glance is Interface's (or Windows'). Every open item in the decision log; cosmetic drift accepted where it unifies or fixes and would not be noticed; no visual confirmation required of the agents, Nathan verifies at his desk; models Haiku for mechanical, Opus for judgment, Fable supervises; the comment, scope, and naming constraints as written in Global Constraints; work in place, `.claude/` undisturbed.

### Open Against Later Tasks

- Task 18: `npm run format` reflowed two Markdown audit files under `.claude/Planning/MonorepoAudit` (Biome's `includes` excludes `.claude` for `check`; find what `format` runs and exclude `.claude` there too). Restored from HEAD at Task 10.
- Task 16 (a third write-path bug, found at Task 9's smoke): a `mutate` `setProperty` with an unknown `PropertyValue.kind` (e.g. `{kind:'status'}`) returns ok and deletes the page's key: `isBlankValue`/`reconcilePropertyValue` treat an unrecognized kind as blank. Fix with a red test: an unknown kind is refused, never a clear.
- Task 9 or 10: `Core/Nexus/confirm.ts` keeps `setImmediate` (Node-only) for the deferred push, same class as `fileHistory.ts`'s timer. Task 20 (Windows note): `nexus:openPath`'s `getPathForFile` and `nodeMachine.realpath` still emit native separators; `posixPath` covers only what `main.ts` hands over. `mutateDeps.trashToSystem` rejects when the machine has none; a phone must never choose `trashMode: 'system'`.
- Task 8: `posix.ts` operates on '/' only, so Desktop must hand Core a forward-slash root at the install site (a backslash root from Electron's dialog would break `relative`/`dirname`).
- Task 9 or 10: `Core/Pages/fileHistory.ts:95` `timer.unref()` and `NodeJS.Timeout` are Node-only; a browser `setTimeout` has no `unref`.
- Task 16 (or Task 12, whichever touches `UIX/Interactions/tableDnd.tsx` first): the within-group reorder at line 103 derives `beforeId` from the full order without skipping the dragged id, unlike `reorderModel.ts`'s `slotInGroup`; dropping a row on the bottom half of the row above it yields `beforeId` = itself, `indexOf` −1, and a `slice(0, −1)` insert one slot off. Fix with a red test; route the block through `nextOrder` only once the two agree.
- Task 12 or 15: `UIX/Pickers/IconPicker/IconPicker.tsx:80-86` `openContext` omits `favorites.onMenu` from its deps.

### Deviations

- Task 12 (`50eded4f`): 173 files, +806 / −1,035 (non-test 167 files +708 / −939); code lines 69,408 → 69,223 (−185; the run stands at −236 against base); source files −15; tests 323 → 322 files (`colorMap.test.ts` + `solidColor.test.ts` → `colors.test.ts`), 4,003 held; lint 1,083 → 1,068 files. The one color file is `UIX/Theme/colors.ts` (`theme.ts` renamed; `tint.ts`, `colorSetting.ts`, `color.css.ts`'s literals, Glass's `PURE_WHITE` folded in; every export name kept) — a `.ts` rather than `.css.ts` because vanilla-extract serializes every export and throws on a function, and `Desktop/main.ts` and `Capture/thumbnails.ts` read `WINDOW_BG` from the main process. `color.css.ts` is the token publisher (zero literals); `ramp.ts` absorbed `colorMap.ts`, `solidColor.ts`, `accent.ts` (the stored-string → cell → CSS chain, every seat a token; the ramp must emit `var(--color-solid-*)`, which `ramp.test.ts` pins). `size.css.ts` into `theme-vars.css.ts`. Theme: 13 modules + 3 tests → 7 + 2 (`colors.ts`, `color.css.ts`, `ramp.ts`, `theme-vars.css.ts`, `typography.css.ts`, `stack.ts`, `index.ts`). The inventory (`#hex|rgb|hsl|oklch` over Core/UIX/Desktop) → 21 hits, all in `colors.ts`; MarkdownPM verified literal-free; `hover-remove.css.ts`'s three `#000000` mask stops → `var(--system-black)` (alpha masking, identical pixels). Rulings 19–30: 19 the false slider doc line gone, knobs distinct; 20 `BLOOM` → `easing.bloom` in `motion.ts`, five readers, `baseSnap` untouched; 21 OverScroll reads `ms(duration.base)` (240 → 280 ms, the ruled outcome); 22 `easeOutQuint` kept and tied to `easing.baseSnap`; 23 `--row-pad-standard`/`--row-pad-compact` the two sources, `menuCompact` exported from `UIX/Menus/index.ts`; 24 `house` gone, `ALL_ICONS` stays Lucide-only (adding the 23 Tabler file glyphs would put 23 new tiles in the Icon Picker — Nathan's call); 25 `fileTypes.ts` on 23 named Tabler imports; 26 `text.title*` gone (12 unminted classes; the Showcase specimen updated); 27 `ICON_PX` 10 → 8 steps, `AutocompletePane`'s `subline` → `footnote` (same 10 px); 28 nothing removed (`PickerMenu`'s `!selfManaged` branch is live via the Showcase and `picker-base.test.tsx`; `PickerMenu` composes `GlassSurface` directly and is not restructured ahead of Task 13); 29, 30 verified untouched. The Becomes: `useHeld` was already one; `engine.tsx` and `group.tsx` on `gesture.ts` (accepted unifying drift: Escape cancels a live drag on both, a phantom click after an engine drop is suppressed, capture at activation, a pre-activation `buttons === 0` aborts); `paneMaterial` = the frost call, emitted style byte-identical; `SortableZone.layout` removed at 15 sites (not nine); the Lab-only drag options, `resolveBounds`, the modifier loop, the Promise-verdict path, `DragNotify`/`Modifier` gone. C-5: the seven were already in Core since Task 5 (Task 5's rulings keep the four data helpers in `UIX/Utilities` and the tile knobs in theme-vars). Lane leftovers: eight barrels retired (`Animations`, `Buttons`, `EyeToggle`, `NavTrail`, `Fields`, `Glass`, `Labels`, `TextPicker`; 53 importers), `Menus/index.ts` and `PickerControl/index.ts` kept for Task 13; `cards.css` and `over-scroll.css` each on one importer; `IconPicker`'s `openContext` deps gain `favorites.onMenu` (no red test practical for a deps array). `Core/Interface/styles.css`'s `:root` half holds app-shell geometry only (`--app-inset`, `--toolbar-h`, `--safe-*`) and stays — app chrome, not the kit. Smoke (agent-driven): tree rendered, fifteen tokens resolved non-empty on `:root` (`--accent`, `--bg-window`, `--solid-red`, `--shadow-base`, `--row-pad-compact`, `--duration-base`…), page body round-tripped and restored byte-identical. Seen: the Showcase does not build at HEAD (`TileLab.tsx` carries five `@renderer/` imports; Task 17's).
- Task 11 move (`9dfe2e59`): 146 files in MarkdownPM (116 `git mv`, 33 content-identical) plus 16 importers; +490 / −468; code lines 69,398 → 69,408 (+10, the two mandated files: `Widgets/reactWidget.ts` +31 net after the table and embed widgets shed their `createRoot` plumbing, `Guards/aliasGuard.ts` +3; the run stands at −51). The tree: `Engine/` (23 files + `Engine/Tables/` 12: detect, parser, tokens, docScan, embedRanges, headingScan, blockModel, listDragModel, subfieldStats, outlineTree, the table model half), `Autocomplete/ Citations/ Embeds/ Gestures/ Guards/ Input/ Links/ Menus/ Tables/ Widgets/`, and at the root `MarkdownEditor.tsx` (`index.tsx` + `zoom.ts`), `markdown-pm.css`, `markdown-tables.css`, the look code (decorations, codeGlyphs, codeHighlight, lineDom, folding, blockHandles), `docCache.ts` (the `Text`-keyed half; the pure `perText`/`scanOf` half moved into `Engine/docScan.ts` so Engine never reaches `@codemirror/state`), `warmSeam.ts`, the harness and the five harness-driven integration tests. `Editor/` keeps seven files for Task 14: `input.ts`, `formatKeymap.ts`, `selection.ts`, `caret.ts`, `caretPlacement.ts`, `travel.ts` (+ test) — the extensions an EditorHost assembles; `Core/Pages/pageEditor.ts` is the one outside importer of `Editor/` (`travelTo`). Renamed because their folder's name dissolved: `Decorations/intent.ts` → `Engine/docScan.ts`, `Connections/index.ts` → `Links/connectionsApi.ts`, `Input/index.ts` → `Input/edits.ts`. Rulings at commit: the `header?: ReactNode` slot and `api.ts` wait for Task 14's host boundary (the slot would delete eight public props, rewrite `PageView.tsx`, and break the `--header-zone` ResizeObserver's ref; the five API interfaces sit beside their implementations); `extends WidgetType` is ten hits, not one — the table and embed widgets extend `ReactWidget`, the nine plain-DOM widgets (Bullet, Checkbox, Hr, Line, CodeTag, ConnGlyph, OutlinerRail, CiteRef, Grip, Reveal) mount no React and stay on `WidgetType`; `_root` → 1 file holds; `Core/Connections/scan.ts` stays on `codeMask` (Engine's detect imports `Connections/markdownCode`, so pointing scan at Engine would close a Connections → MarkdownPM → Connections cycle); `Menus/outline-menu.css.ts` stays beside `OutlineMenu` as a vanilla-extract sibling; `Tables/guard.ts` stays with the widget half beside `sync.ts`. Smoke (agent-driven): tree rendered; `page:open` ok; hit-test then `smoke-11` typed over CDP, in the DOM and on disk after the debounce; undone; file byte-identical. `page:open` returns ok without raising the page window (the first `.cm-content` was a MarkdownTile; the agent typed there first, undid it, then opened the page by its row) — open ≠ focus, not investigated. For Task 14: `zoomMultiplier`/`clampZoom`/`ZOOM_MIN`/`ZOOM_MAX` are test-only exports (ruling 43 settles zoom); `Engine/docScan.ts` carries 29 comment lines (26 inherited from `intent.ts`). Lesson: `vi.mock('…')` path strings are invisible to tsc and lint — `PageTile.test.tsx`'s was the one red after the move.
- Task 11 review (`a9d737ab`, before the move): one Opus agent; 67 files, +796 / −2,379 against `6905351c`; code lines 69,433 → 69,398 (−36; the run stands at −61). Rulings executed: `caretSeat` → `caretPlacement` (file and identifier, seven importers; `seatAtNearerEdge` is a different name and stays), `Tables/widget.css` → `markdown-tables.css` at the domain root, ruling 18 (`docBidirMarks`'s whole-document scan gone; decorations walk `visibleRanges`; one `.dual-direction-arrow` rule). A10 items taken: H3 (the callout scan a required parameter), H5 (`folding.ts`'s heading re-exports; `Core/Pages/pageEditor.ts` repointed at `headingScan`), H6 (Detect's pass-throughs), H7 (`embedRegex` ≡ Connections' `pageEmbedPattern`, which takes the `d` flag), H8 (`HEADING_PREFIX` onto `headingParts`), H10, H11 (`FoldEntry.clone` never absent, `hasBody` a constant), H12 (three single-selection guards; `allowMultipleSelections` enabled nowhere); `Tables/index.ts` barrel gone; `pasteLink` reads the cached scan; two clamps on `UIX/Utilities/clamp`. Left with reasons: H1/H2 reference implementations the equivalence pins compare against (a sibling module measured +24 and one file; reverted), H4 `CODE_LOADER_NAMES` (a real parity pin until M11), H9 `lineMarkerRe` (not composable with `blockquotePrefixRe`; `>> a` would change), M4 `inLinkTarget`, H13/M17 (test-consumed exports and fallbacks). Colors: no literal color anywhere in MarkdownPM; thirteen local custom properties all read `var(--…)` from UIX/Theme — nothing for Task 12 to pull. Comments 2,214 → 759 non-test lines, every file ≤ 20 (max `Decorations/intent.ts`). Two rulings at commit: (b) the comment killer over MarkdownPM is skipped (every file already at the cap); the review's `git mv` renames were staged when the simplification pass committed, so `9c9b994e` carries `caretPlacement.ts` and `markdown-tables.css` while its importers landed here (that one commit does not typecheck in isolation; history not rewritten). For Task 14: `Editor/blockModel.ts` rebuilds `blockContext` from scratch on every `blockAt`/`blockStarts` (per doc change, hover, drag, menu) — the one derivation beside the single model rather than in it (A10 M9), a live violation of the never-on-every-X rule. One MarkdownPM vitest flake seen (a single test failed once, green on re-run with no edit). The counter concern the agent raised (trailing-comment lines flipping to code) does not apply: `codelines.py` is line-granular and counts `foo() // note` as code before and after.
- Simplification pass (`9c9b994e`, Phase 4's stop taken early, parallel to Task 11): three Opus simplifiers over exclusive folders, 39 files, +261 / −528; code lines 69,548 → 69,433 (−115; the run stands at −26 against base, negative for the first time). S1 Views/Tiles/Pages −70: `placeTail` parameterized (five 11-line literals → one call each), `TableView`'s lead and plain cells one `<div>`, `SortFrame`'s `pickerRow` shared from `GroupFrame`, a six-deep ternary flattened. S2 Interface/Properties/Navigation/Settings/Assets −26: seven hand-rolled plain-object predicates → `isPlainObject`, `formatRelative` flattened, `reorderInner` on `moveItem`/`clamp`, five provable `?? []` gone. S3 engine folders + Desktop −17 (−151 comment lines): `findSet` via `findContainer`, `setIcon`/`setDisclosureLock` one arm, ten dead guards on `NexusTree`'s required arrays, `allCollections` gone, 18 unread exports narrowed, every file ≤ 20 comment lines but `Contract/bridge.ts` (32, the channel table's headers). Kept: `treeIndex.walk`'s `?? []` (pinned by `containerTargets({} as NexusTree)`). Carried to Task 15: `ConnectionsApi` built at four sites (one source beside `resolveOnlyConnections`); the no-nexus guard at 28 handler sites (~−50 with one `withRoot` owner across all eleven handler files); `Interface/styles.css` + `Interface/Interface.css` both imported by `Desktop/Renderer/main.tsx` (token half → UIX/Theme at Task 12); `Core/Interface/chrome.ts` a bag of three unrelated types; `viewRow.ts` holds UI unions belonging with `views.ts`; `LayoutToggles`/`CardsOptions` twins; `scopeSet`'s dead `typeof` guard; `reorder.ts`'s two `state.json` writers; `reorderTopInTree` = `reorderChildrenInTree(tree, '')`; `closeSession` production-dead (43 test sites). Left uncommitted for Task 11: `Core/Pages/pageEditor.ts`'s import repoint and `connections.ts`'s `/dg` flag, both that agent's.
- Task 10 move (`48b23960`): 98 files, +568 / −840; code lines 69,832 → 69,548 (−284; the run stands at +89 against base). Views: `Pipeline/ Host/ Bands/ Table/ Cards/ Settings/` (`TableView/` → `Table/`, `CardView/` → `Cards/`; `Host/` holds the view host, its hooks, `viewMint`, and `columnStyles` with `useStyleFor`, dissolving the A20 collision with `Properties/columnStyles.ts`; `reassign` at the root, read by both renderers). `Tiles/Layout/` is the pure engine, `HYSTERESIS` a parameter defaulting to 0 so the engine imports nothing from UIX. Interface gains `Notifications/` and `Confirm/`; `Menus/` survives for Task 13. `Properties/resolveContext.ts` → `valueContext.ts` with `ValueContext`/`buildValueContext` (19 files). `PagePropertyRows` is a discriminated union: `{ variant: 'page', page, onBack }` | `{ variant: 'panel', page: WindowTarget }`; every review-listed delta stays behind the variant; row styling is `page-properties.css.ts` alone, the panel's padding through a `panelRows` composition (ruling 2) — the window panel's rows therefore lose the 40% label column, the value hover chip, and the group fill and take the menu-item look, the convergence ruling 2 accepted. `containerTargets` takes the tree; three test fixtures gained the fields the real walk reads. Stylesheets stayed in their Views subfolders (the audit trees place them there; the "at the domain root" ruling is Task 11's MarkdownPM shape). `nav-gallery.css` folded into `NavGallery.tsx` (class name kept; `NavWindow.tsx:31` selects it); `view-host.css.ts` stays as its component's sibling. `flavor → kind` at 26 sites in 12 files; `open.flavor` → `open.kind`, no migration. `hide_empty_groups` is live (`Pipeline/resolveView.ts`). Smoke (agent-driven): page window opened, the merged panel rendered two property rows, body round-tripped, restored.
- Task 10 review (`d1e42e19`, before the move): two Opus agents by domain; code lines 69,748 → 69,844 (+96: the restored asset-directory migration is +183, every other change −87). Tests 322/3,992 → 323/4,003 (+13 migration tests, −1 `empty_placement` case, −1 `isSubfieldItemId` case). Rulings landed: 4, 5, 7, 8 (`empty_placement` was a write-only mirror of `ungrouped_placement`; gone from the union, decoder, writer, fixture), 9 (`Core/Navigation/tabClose.ts`, `useTabClose`, `EXIT_MS` once), 11, 13 (`Core/Assets/IconChoice.tsx`, 15 callers), 15 (`subfieldOrder` gone from store, chrome type, disk read, hydration; `subfield:set` carries `{ expanded }` alone), 17, 46 (`Core/Assets/assetMigrate.ts` on the seam: md5-over-Buffer → `sha256Hex` over a latin-1 decode, thumbnails swept by the directory removal; wired at `assets:setDir`, the point the directory changes). Gate 2's items: `sweepGovernedRoots(root, scope, plan)` with `SweepPlan = { raw } | { text, sidecars? }` (Gate 2's "dead at every caller" was wrong at `contextCascade.ts:107`, which passes both); `registryOp(narrow, write)` serves ten arms, `optionValueOp`/`optionRenameOp` gone; `isString` in Pages handlers; `mutateRequest.ts` 51 → 18. Also: the five defensive `.catch` on enveloped asks gone; pane-width twins one `storedWidth`/`clampWidth`; three clamps on `UIX/Utilities/clamp`; `entity-icon.css`, `card-add-picker.css.ts`, `date-time-editor.css.ts` folded; `personalization.ts` 75 → 12 comment lines. Left for the move: rulings 1 and 2 (`PagePropertyRows` with `variant`, one sheet, the `.page-window-insp-*` row family dissolved; the `.page-window-insp` column is `window-panel-column` already), `flavor → kind`, `Properties/resolveContext.ts` named for what it holds, `hide_empty_groups`'s write-only config copy (same shape as `empty_placement`; `GroupFrame.tsx:184` reads it as a fallback, so it stays unless the mover proves it dead). An Opus comment killer runs over the eight domains before the move.
- Gate 2 (`de8c32b8`): two Opus reviewers (Core ops; Contract/Platform/Desktop), +266 / −386, code lines 69,757 → 69,748; tests 322/3,992 (+1). Fixed: `Desktop/Capture/thumbnails.ts` built the asset URL by hand beside `Core/Platform/assetUrl` (two writers); `updatePageProperty(root, …)` takes its root, the last `sessionRoot()` reach-in below the handlers, red-green against a second nexus; `menu.ts` imported `appConfig` twice; `optionOps` spelled one failure six times; Desktop and Locations comment volume under the cap. Logged, not changed: `createContextGroup`'s exhaustion message now names the 50th attempt and its post-write race feeds a retry; `restoreScrub` through the sweep also notes value writes and indexes pages. For Task 10: the `rewrite` parameter of `governedSweep.rewriteText` is dead at all six callers; four registry arms in `Core/Properties/handlers.ts:171-209` repeat `optionValueOp`'s body (a `registryOp` combinator is authorized there); ~40 handlers repeat the no-nexus guard; `isString` unused where handlers spell `typeof === 'string'`; `mutateRequest.ts` (51) and `mutatePatch.ts` (45) over the comment cap, `mutateRequest.ts:83-84`'s "Parked … NOT dead code" fence reworded at Task 15 when `setProfileSubtitle` is ruled. For Task 15: `sessionDb()`/`sessionVersionsDb()` have zero production consumers (28 test sites reach them for raw SQL). Task 9's smoke stood as the gate's.
- Task 9 (`838b1fa0`): 28 files, +284 / −707 (non-test net +151: one file became fourteen, each paying an import block; the audit's −100 assumed a sidecar-RMW merge the Becomes never named). `mutate.ts` 633 → 178. Rulings at commit: no `Core/Properties/governed/` folder (the governed code is flat in Properties and Task 10 names no subfolder; `governedSweep.ts` is the engine unmoved); the 13 thin arms stay 2–5-line cases through a local `done` rather than 13 logic-free modules; `journalSlot` already took its root, so the reach-in (`sessionRoot() !== root` inside `clear`) was deleted rather than re-plumbed, `setGovernedRootKeys(root, …)` gained the parameter; the three frontmatter writers were one thing and are now `setGovernedRootKeys` (which also skips an unchanged write); `MutateContext` is the ctx type; `create.ts` and `move.ts` each hold two arms sharing a private helper; `fault`, `setOrDrop`, `isReserved`, `relJoin` rehomed to Contract/result, IO/atomicWrite, Locations/pathSafety, Locations/posix. Behavior notes: `renameCascade` admits by `sweepAdmits` (a non-round-tripping page is refused, not rewritten); `restoreScrub` and `spend.addContextValues` lose per-file `.catch(() => false)`; `addContextValues` now also notes the value write and indexes the page. `keyHolderFiles(root, key, await collectionFolders(root))` repeats at 5 sites by design. Tests 322/3,990 → 322/3,991: the "leaves the record when the session root has moved on" test pinned the bug and is replaced by "clears a record on a nexus other than the open session" (red with the guard reinstated, 2 failures; green without). Smoke (agent-driven): `mutate` setProperty and setIcon round-tripped to frontmatter; restored. Nathan's Views comment trims (4 files) rode along.
- Task 8 (`4f6a8898`): 64 files, non-test +2,018 / −2,371 (net −353); `Pommora/` gone; `Desktop/main.ts` 357 lines (17 comment lines after the supervisor's trim). Rulings at commit: `HostContext` is wider than the sketch (push, pick, pasteImage, clipboard, reveal, openExternal, message, systemAccent, menu, contextMenu, thumbnails, webGuests, trashMode, fetchTitle, openStores, adopted, watch, applyZoom) because forty-odd channels are Electron-only and Core cannot import Electron; `machine`/`kv` omitted from it since Core reaches both through the installed globals. The five tells bind Desktop-side in `main.ts`. Every ask is enveloped (the old `raw` kind's rejection becomes `{ok:false}`). No Contexts or Index handler map (no channel is theirs). `Handler` allows a sync reply. The open sequence is `Core/Nexus/handlers.ts`'s with Desktop supplying `openStores`/`adopted`. `linkTitles` split: cache half Core/Web, fetch half `Desktop/Web/linkTitles.ts`. `Desktop/Actions/poppers.ts` is the 25-channel native popper table until Task 13. `posixPath` in `main.ts` forward-slashes every path Desktop hands Core. Root scripts `-w Desktop`; the vitest `Pommora` project gone; `scopeBoundary.test.ts` beside `scopeGet` in Core/Interface. Launch: `env -u ELECTRON_RUN_AS_NODE npm run dev -- --remote-debugging-port=9333` from the root; built: `cd Desktop && env -u ELECTRON_RUN_AS_NODE ../node_modules/.bin/electron .`. Smoke (agent-driven): state open, 7 collections, page round-trip, restored.
- Task 7 (`1c052c1a`): 112 files, +919 / −859 (non-test −12, tests +72); the leaf table at `MonorepoAudit/api-leaf-table.tsv` (149 leaves: 130 ask, 14 on, 5 tell; 147 pure renames). `Pommora/src/preload` gone; `Desktop/Bridge/preload.ts` 26 lines; `electron.vite.config.ts` names the preload input explicitly until Task 8's Desktop config. `NO_NEXUS` was already `Core/Contract/result.ts`'s since Task 4. Rulings at commit: `host` imported as `dialer` in seven files where `host` is a domain identifier (export name unchanged); a test-only `stubDialer(channels)` in `Core/vitest.setup.ts` replaces 30 leaf-shaped `window.nexus` stubs; `windowSlice.ts`'s defensive `nexus?.` guard and MarkdownPM's four `window.nexus?.leaf?.()` guards are gone (the seam throws without a bridge; tests install one). The "145 lines leave" did not materialize: `host().ask('chan', …)` is wider than a leaf and 68 files gained an import. Smoke (agent-driven): `window.nexus` exposes exactly ask/tell/on/openDropped; state open, tree rendered, `page:open`/`page:updateBody` round-tripped, page restored.
- Task 6 (`1cceaae3`): 113 files, +1,114 / −1,982; code lines 69,546 → 69,811 (+265, the seam's interfaces and the node implementation; the touched files' comments 1,381 → 309). `Core/Platform/machine.ts` per the Becomes plus `Core/Platform/stores.ts` (`KeyValueStore` with an `entries(scope)` the scope reads needed, `ContentIndexStore`, `SnapshotStore`, one `installStores`), `Core/Locations/posix.ts`, `Desktop/Platform/{nodeMachine,fileLock}.ts`, `Desktop/Store/{driver,open,schema,sessionDb,versionsDb,stores}.ts`; `Core/Store` gone, `localState.ts` (the JSON half) is `Core/Platform`'s. Rulings at commit: the lock stays refuse-on-re-take (the existing tests pin it; the Becomes' "re-entrant" read as B-2's rule); the watcher echo stays recorded by Core's write funnel, the Machine's `writeText` is a plain atomic write, `writeRaw` has no Core caller yet; stores install at DB open from Desktop's `openSessionDb`; `fileHistory`'s in-memory `bodyHash` is sha256 via the machine; `walkCache.FileStat` folded into Platform's. Test-only Core→Desktop edge: `Core/vitest.setup.ts` installs the node machine and 16 Core tests import `@pommora/desktop/Store/sessionDb` (`@pommora/desktop` a Core devDependency); Core tests keep `node:` for fixtures (67 files). Tests 321/3,986 → 322/3,990 (`machine.test.ts`, red before `installMachine` existed). `nativeEditorMenu` is `window.nexus`-only, so its split is Task 7's; the glance `site` branch keeps `<webview>` per the tile ruling. `install` of the machine sits at `main/index.ts`'s top until Task 8. Nathan's own comment trims in `Core/MarkdownPM` (8 files) and `Core/Assets` (3) rode this commit. Smoke launch: scratch Nexus rendered, `page:open` and `page:updateBody` round-tripped to disk, page restored.
- Lane (09-06-2026): closed in three commits before Task 6 landed — `50e88ab3` Core/Connections + Core/Utilities (the iteration window's ten-line stylesheet onto its element; `rewrite.ts` 21 → 12 comment lines), `3d35fbce` UIX Buttons through Labels (Carets.css's selector list enumerated twice merged into one rule; three `Math.max(0, Math.min(…))` clamps on `UIX/Utilities/clamp`; six files under the cap), `22ed2423` UIX Symbols, Table, Theme, Utilities, Windows, Pickers (`window-panel.css` folded into `window-base.css`; seven `@pommora/uix/Theme/*` self-imports made relative; `iconNameOr` reads `asRenderableIcon`). Code lines 69,569 → 69,557 (−12); the bulk of the −116 gross was comments. Each committed on its workspace typecheck, folder tests, and Biome because Task 6 was mid-rewrite on Core and Desktop; the root gates catch up at Task 6's commit. Left for their owners: the six pure-forwarding UIX barrels and `Pickers/TextPicker/index.ts` (consumers in Core; Task 12), `Cards/cards.css` and `Elements/over-scroll.css` imported both by their component and by `Desktop/Renderer/main.tsx` (two writers; Task 12), the `retained` reconcile effect duplicated in `PageHistoryWindow.tsx:62` and `TrashFrame.tsx:88` (Task 10), `IconPicker.tsx:80-86`'s `openContext` missing `favorites.onMenu` from its deps (a real bug; Task 12 or 15), `Slider` and `DualSwitch` knobs documented as one shape but 26×18 r9 vs 21×14 r7 (Nathan's call). The comment-killer pass that was to precede Task 6 was killed in flight and left nothing; skipped, Task 6 dispatched on `fc12cc82`. Nathan then widened the lane to the three UIX folders held back for Tasks 12 and 13, briefed not to pre-empt them: `26a05524` Animations + Menus (−83, comments; `MenuPlacement` and `RAIL_W` made local), `36ab5034` Interactions (−146: dead `arraySwap`/`Row` gone, `group.tsx`'s twin guards one, comments 388 → 227). Code lines after the widened lane: 69,545 → see board.

- Task 5: 712 files moved by the table; `Pommora/src/renderer` gone; smoke launch rendered the scratch Nexus. Rulings at commit: the kit's four helpers (`cx`, `clamp`, `moveItem`, `pad`) live in `UIX/Utilities` because UIX consumes them and UIX imports nothing from Core; `Core/Utilities` keeps `capMap`, `checkSet`, the iteration window. `TileGrid` imports six of the layout modules, so it is `Core/Tiles`' and `UIX/Canvas` does not exist (the name retires). `paneSlide`, `toolbar-slide`, `revealBar` stay in UIX (its Windows use them). The web window is `Core/Interface/Windows/WebWindow.tsx` like the web tile; `Desktop/Web` holds only the guests and the title fetch. The vitest setup file is `UIX/vitest.setup.ts`, Core points at it. `Desktop/tsconfig.web.json` (an unreferenced Task 1 scaffold) deleted. `TileLab.tsx` restored (Showcase leaf, never-delete). One UIX→Core edge stands until Task 13: `UIX/Pickers/PickerControl` calls `Core/Platform/nativeMenus`; UIX's tsconfig carries `types: ["vite/client"]`, `skipLibCheck`, and a dialer include for it, all reverted at Task 13. Deferred to Task 6: `nativeEditorMenu`'s split and the glance site branch's WebSurface (both need the seam). `size.css.ts` tile knobs stay in UIX/Theme (theme-vars reads them). `entityIcon.ts` → `entityIconPolicy.ts` (case-insensitive collision with `EntityIcon.tsx`). 127 files carry comment volume above the cap into the comment-killer pass that precedes Task 6.
- Task 4: net −702. The SQLite stores (`driver`, `open`, `schema`, `localState`, `versionsDb`, `sessionDb`) and `contentIndex` moved whole into `Core/Store` and `Core/Index` rather than splitting interface from SQL body: five Core domains read them, and splitting before the Platform seam exists would have made every one a Core→Desktop import. Task 6 owns the split (the key-value, content-index, and snapshot interfaces in `Core/Platform`, the SQLite bodies to `Desktop/Store`, `Core/Store` gone). `webGuests.ts` stays in `main` until Task 8 (it calls `ipc.ts`'s `push`). `assetMime.ts` is `Core/Assets`' (a MIME table `mutate.ts` reads). Two basename collisions with Task 3's contracts forced `tilesFile.ts` and `viewsFile.ts`. Raw mode's one live branch survives as an optional `adopting` flag on `FolderKindContext`, set only by `stampAdopted`. Tests: 321 → 320 files, 4,006 → 3,986 (assetMigrate's 13, raw mode's 3, the bare-Record reader's 3, `ExistState`'s 1). Ten files carry comment volume above the cap (`spend.ts` 76, `readNexus.ts` 62, `pageFile.ts` 57, others 22–32); trimmed with Task 10's settle.
- Gate 1: one review (the simplifier), net −4. Ruled: `dialer.ts`'s reach into the preload for `LegacyApi` is the transitional seam Task 7 closes; `tree.ts` importing `AccentSetting` from UIX/Theme is Core pulling its kit (the accent names are the theme's); `keyBindingFor`'s only test rides in `Desktop/Actions/accelerators.test.ts` until Task 13 touches the editor menu. Fixed: the root `tsconfig.json` (inert references, nothing runs `tsc -b`) deleted; `Core/vitest.config.ts` gains UIX's `noExternal`. `hasWebScheme` stays in `links.ts` beside its callers.
- Task 3: Desktop became a gated workspace early (its own vitest project, `tsc -p Desktop/tsconfig.node.json` in the root typecheck, an `exports` map) because `editorMenu.test.ts` moved there whole. `WEB_PARTITION` is `Core/Web/partition.ts` (three of four readers are Core surfaces; ruled at commit). `PickFileOptions` sits in `Core/Contract/bridge.ts`; `WINDOW_BG` in `UIX/Theme/theme.ts`; the interface-scale setting in `Core/Settings/personalization.ts` with only the Electron zoom mapping left in Desktop. `clamp` restored as `Core/Utilities/clamp.ts` after inlining read worse at 28 sites. The two JSON fixtures live in `Core/Views/fixtures/` (inlining would triplicate a 37-line registry). Five of the 13 zero-importer exports stay exported because the split put their one consumer across a file boundary. `personalization.ts` (75) and `tree.ts` (34) carry `types.ts`'s field docs above the twenty-line cap; trimmed at Task 10 with the defaults moved to the Settings Features doc.
- Task 2: `LegacyApi` counts 3, the third being dialer.ts's own import. `composite` dropped from Pommora's two tsconfigs (TS6307 across the workspace boundary; nothing runs `tsc -b`). `tsconfig.web.json` includes `../Core/Platform/dialer.ts` explicitly until Task 5 gives the renderer a Core import. `Core/Contract/bridge.ts` reaches back into `Pommora/src/shared` for 24 type imports until Task 3 moves them.
- Task 1: the `exports` map is `{ "./*": { "types": ["./*.ts", "./*.tsx", "./*"], "default": "./*" } }`; the bare array form typechecks but Vite takes only the first fallback and resolves no `.tsx`, which the spike caught. Three of the six "dead" dependencies (`@codemirror/lang-json`, `lang-yaml`, `legacy-modes`) are live through dynamic `import()` in `codeHighlight.ts` and stay; only `pngjs`, `react-markdown`, `remark-gfm` left. `biome.json` excludes `.claude/` (root-run Biome pulled the harness scripts into scope). `TileLab.tsx` is a Showcase leaf, not Lab, and stays. The gate's launch seeds `pommora.json` in the scratch userData instead of driving the chooser, after a System Events keystroke missed and the chooser opened `~/NexusOS/Assets` as a Nexus root; the minted `.nexus/` and seeded folders there were removed and the real Nexus' content is untouched.

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
Live-verify: one smoke launch per gate that touched runtime code; Nathan's own pass at the end.
Screenshots: none.
Pings: at each gate and at completion.
Record: History arc "PM-129 || The Monorepo" at closeout.
Also: Haiku for mechanical sweeps, Opus for judgment and reviews, an Opus comment-killer over a Fable task's files before it runs, Fable for the five must-be-right-first-time tasks (Task 5's move table, Task 6 the Platform seam, Task 8 the index.ts split, Task 13 the menu collapse, Task 14 the editor host; ruled 09-05-2026); no comment-cleanup agents; comments none by default, twenty-line cap; variable names unchanged.
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
- [ ] The acceptance criterion's greps and counts run; one smoke launch.
- [ ] `test ! -d Pommora`; six workspaces; `Showcase` builds.
- [ ] `rg -l "from 'electron" Core UIX` → 0; `rg -l "@pommora/core" UIX` → 0.

**The passes**

- [ ] Simplification → code review → attack over the full implementation in that order, each aimed at the implementation.
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
