## A17 — Build Configs, Toolchain, and Harness Audit

Read-only audit of the build/tool/harness surface at `main` `7c7c7542`, 09-05-2026. Paths are relative to the repo root (`Project Pommora/`) unless prefixed; `P/` abbreviates `Pommora/`. Line numbers cite the file as it sits on disk today.

### 1. Config Map

| File | One line | Hard-coded source paths |
| --- | --- | --- |
| `P/package.json` | The single npm package (`pommora-react` 0.0.1, description still reads "Phase 1: window + glass sidebar scaffold", l.2-4). No `"type"` field → CommonJS. 16 scripts (l.9-23), 27 deps, 15 devDeps. | `"main": "./out/main/index.js"` (l.5); `dev:app`/`build:app` → `vite.config.app.ts` (l.18-19); `typecheck:*` → `tsconfig.node.json`/`tsconfig.web.json` (l.12-13). |
| `P/package-lock.json` | lockfileVersion 3; root entry `""` carries only name/version/license/dependencies/devDependencies. No `workspaces` key anywhere, zero `"link": true` entries — a flat single-package lock. | none |
| `P/biome.json` | Linter + formatter (schema 2.5.1). `vcs.useIgnoreFile: true` (l.3-7) so `.gitignore` drives exclusion; `files.includes: ["**", "!!**/dist", "!**/graphify-out"]` (l.9); 2-space/100-col, single quotes, `semicolons: asNeeded` (l.30-34); three rules off (l.21-27). | `**/dist`, `**/graphify-out` (l.9) |
| `P/electron.vite.config.ts` | The desktop build: three Vite blocks. `externalizeDepsPlugin()` on main + preload (l.8, 12); react + vanilla-extract on renderer (l.22). | `@shared → resolve('src/shared')` ×3 (l.9, 13, 18); `@renderer → resolve('src/renderer')` (l.19). **Implicit** (electron-vite defaults, `node_modules/electron-vite/dist/chunks/lib-q6ns0vZr.js:255, 514`): entries `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/index.html`; output `out/{main,preload,renderer}`. |
| `P/electron-builder.yml` | Packaging: ad-hoc unsigned mac `dir` target (l.29-32), fuses (l.22-26). | `directories.output: release` (l.4), `buildResources: build` (l.5), `files: out/**/*, package.json` (l.6-8), `asarUnpack: '**/*.node'` (l.27-28). |
| `P/build/` | electron-builder's `buildResources`. Holds one tracked file, `pommora-icon-src.png` (1.8 MB, Jun 16). `build/icon.png` was deleted in HEAD (`7c7c7542`). | — |
| `P/vite.config.ts` | The Showcase site build (plain Vite, not electron-vite); two HTML entries. | `@renderer`, `@shared` aliases (l.13-14); inputs `design-system.html`, `interactions.html` (l.20-21); output default `dist/`. |
| `P/vite.config.app.ts` | Standalone browser build of the app renderer — "the mobile/web build target" (l.6). | `root: resolve('src/renderer')` (l.10), `base: './'` (l.11), the two aliases (l.15-16), `outDir: resolve('dist-app')` (l.19). |
| `P/vitest.config.ts` | The whole test suite: one config, `environment: 'node'` (l.16). Aliases resolved against the config file's own dir (l.9, 22-23); react + vanilla-extract plugins for `.test.tsx` (l.14). | `include: ['src/**/*.test.ts', 'src/**/*.test.tsx']` (l.17); `setupFiles: ['src/renderer/Testing/setup.ts']` (l.18) — both cwd-relative strings, unlike the aliases. |
| `P/tsconfig.json` | Solution file: `files: []` + two references (l.2-3). No script runs `tsc -b`; the references are decorative. | `./tsconfig.node.json`, `./tsconfig.web.json` |
| `P/tsconfig.node.json` | Main + preload + shared typecheck. `composite: true` (l.3), `types: ["node"]` (l.12), `noEmit` (l.13). | `paths @shared/* → ./src/shared/*` (l.11); include `src/main/**`, `src/preload/**`, `src/shared/**`, `electron.vite.config.ts`, `vitest.config.ts` (l.15-21). **Not** included: `vite.config.ts`, `vite.config.app.ts` — never typechecked. |
| `P/tsconfig.web.json` | Renderer typecheck: `lib` DOM (l.7), `jsx: react-jsx` (l.8), no `types` field → every `@types/*` in `node_modules` is auto-included (Node globals visible to renderer code). | `paths @shared/*`, `@renderer/*` (l.13-16); include `src/renderer/**`, `src/shared/**`, `src/preload/index.d.ts` (l.19). |
| `P/design-system.html` | Showcase entry. | `<script src="/src/renderer/Showcase/main.tsx">` (l.10) |
| `P/interactions.html` | Interaction Lab entry. | `<script src="/src/renderer/Showcase/Lab/main.tsx">` (l.10) |
| `P/vercel.json` | Vercel config for a dashboard Root Directory of `Pommora`. `framework: vite`, `buildCommand: npm run build:showcase`, `outputDirectory: dist`, rewrite `/ → /design-system.html`. | `dist`, `design-system.html` |
| `vercel.json` (root) | Vercel config for a Root Directory of `.`: `framework: null`, `installCommand: cd Pommora && npm install` (l.4), `buildCommand: cd Pommora && npm run build:showcase` (l.5), `outputDirectory: Pommora/dist` (l.6), same rewrite (l.7). | `Pommora/`, `Pommora/dist` |
| `.gitignore` (root) | `.DS_Store`, logs, env, `.vscode/`, `.idea/`, `node_modules/`, `dist/`, `.nexus/`, `graphify-out/`, `.playwright-mcp/`, `.claude/settings.local.json`, `.claude/skills`, `.claude/commands`, `.claude/Sessions`. | — |
| `P/.gitignore` | `node_modules/ out/ dist/ dist-app/ release/ build/_dots.png .DS_Store *.log .vite/ coverage/ *.tsbuildinfo *.env`. | `dist-app/` (l.4), `build/_dots.png` (l.6) |
| `node_modules/` (root) | One entry: `.vite/vitest/<sha>/results.json` (Aug 19, 24 KB). It records 263 test files keyed `:Pommora/src/main/…` and `:Pommora/src/renderer/src/Detail/…`, every one `failed: true, duration: 0` — the cache of a vitest run invoked from the repo root that found nothing. | — |
| `P/node_modules/` | 439 top-level entries, 825 MB. `electron` 42.4.0 installed **with** the binary (`dist/Electron.app` present; bundled Node 24.16.0). `@lezer/highlight` and `@types/mdast` present transitively only. | — |
| `P/dist/` | Showcase build output, 4.7 MB, Sep 4 22:49: `design-system.html`, `interactions.html`, `assets/`. | — |
| `P/dist-app/` | The web-target build, 1.4 MB, **Jul 4** (`index.html` + `assets/index-BKQy4oBC.js`). | — |
| `P/out/` | electron-vite output, 8.3 MB, Sep 5 01:48. `out/main/index.js` is 408 KB CJS (`"use strict"; const electron = require("electron"); … require("node:sqlite") … require("write-file-atomic")`), preload 7 KB. | — |
| `P/release/` | electron-builder output, **370 MB**, Jul 5: `mac-arm64/Pommora.app` (368 MB), `.icon-icns/icon.icns` (1.4 MB, derived from the now-deleted `build/icon.png`), `builder-debug.yml`. | — |
| `P/tsconfig.{node,web}.tsbuildinfo` | 148 KB + 252 KB, Sep 5 14:50/14:51. Written because `composite: true` implies `incremental`; TS ≥4.0 permits `noEmit` + incremental, so `tsc --noEmit -p` writes them as its cache. Gitignored (`P/.gitignore:11`). | — |
| `.vscode/settings.json` | 138 bytes: `git.ignoreLimitWarning`, empty `tokenColorCustomizations`. Ignored by `.gitignore:8`. | — |
| `.claude/settings.json` | `autoMemoryDirectory` + one PostToolUse(Bash) hook: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/republish-ledger.mjs"` (l.10). | none (env-anchored) |
| `.claude/settings.local.json` | Permission allow-list + `outputStyle: Concise`. No secrets. Four `Bash(cp …)` entries (l.6-9) copy `.claude/SwiftInfo.md`, `.claude/Resources.md`, `.claude/ Features/Domain-Model.md`, `.claude/ Features/Prospects.md` to `~/NexusOS/Pommora/…` — **all four source files no longer exist**; dead entries. | absolute machine paths |
| `.claude/hooks/post-commit` | Native git hook (`core.hooksPath` is set, absolute: `/Users/…/Project Pommora/.claude/hooks`). Runs `python3 .claude/scripts/loc.py --update` (l.20), amends `loc-history.json` + `Line-Ledger.html` into the commit unless HEAD is already on the upstream (l.22-33), then `node .claude/scripts/check-atlas.mjs` (l.35). | repo-root-relative `.claude/scripts/*` only |
| `.claude/hooks/republish-ledger.mjs` | PostToolUse(Bash): on a `git commit`, `git diff --quiet HEAD~1 HEAD -- .claude/scripts/Line-Ledger.html` (l.25, 32); if the page moved, injects a "republish to artifact URL" instruction (l.26, 42-47). | `.claude/scripts/Line-Ledger.html` |
| `src/renderer/Testing/setup.ts` | Four jsdom-gap stubs, each guarded by `typeof` (l.3, 10, 17, 27): `document.elementFromPoint`, `Range.prototype.getClientRects/getBoundingClientRect`, `ResizeObserver`, `Element.prototype.scrollIntoView`. Under `environment: node` every guard is false → a no-op. | — |
| `src/renderer/env.d.ts` | `/// <reference types="vite/client" />` (l.1) — needed for `import.meta.env.DEV` (`renderer/main.tsx:32`, `Windows/windowCache.ts:33`, `PommoraUIX/Pickers/picker-base.tsx:121`) and the Showcase's `.jpg`/`.png` imports (`Showcase/Leaves/GlassLeaf.tsx:4-6`); plus `declare module '@fontsource-variable/inter'` (l.5). | — |
| `src/preload/index.d.ts` | `import type { NexusApi } from './index'` (l.1) → `declare global { interface Window { nexus: NexusApi } }`. `NexusApi = typeof api` (`preload/index.ts:196`), where `api` is built from `@shared/bridge`'s `Asks/Pushes/Tells` (`preload/index.ts:3`). Because tsconfig.web includes this file, tsc follows the type import into `src/preload/index.ts` and its `electron` import — the web project typechecks Electron's typings through the preload. | `./index` |

Two harness pieces outside the repo also touch the layout:

- `The Studio/.claude/settings.json` — PostToolUse(Edit|Write|MultiEdit): walks **up** from the edited file to the nearest `node_modules/.bin/biome`, `cd`s to that directory, and runs `biome format --write "$f"`. Today that lands in `Pommora/`, where `biome.json` lives.
- `~/.claude/settings.json` — PreToolUse(Bash): `git add` every modified or untracked `*.md`/`*.mdx` in the work tree (the auto-stage hook). Path-agnostic.

### 2. Stale

**`vite.config.app.ts` + `dist-app/` + `dev:app`/`build:app`.** Referenced only by themselves: `P/package.json:18-19`, `P/vite.config.app.ts:8, 19`, `P/.gitignore:4`, one History sentence (`.claude/HistoryPM.md:1040`, the Capacitor pre-paving commit `02bb4e11`), and the Mobile plan, which already schedules their removal (`.claude/Planning/Mobile Companion & Pommora Sync — Implementation Plan.md:134, 211, 243`). No doc, script, or config consumes them; `dist-app/` was last written Jul 4. Nothing has shipped from it. The Mobile plan's own design supersedes it (a Capacitor shell with its own Vite config).

**Root `node_modules/`.** A vitest cache from a root-invoked run (see Config Map). Delete.

**`*.tsbuildinfo`.** Not stale — they are the incremental cache `composite: true` makes `tsc --noEmit -p` write, and they are gitignored. Regenerable; they go when the tsconfigs move.

**`release/`.** 370 MB from Jul 5, built with an icon that no longer exists in the tree. Regenerable by `npm run package`. Delete.

**`design-system.html` + `interactions.html`.** `interactions.html` **is** wired: `vite.config.ts:21` lists it as a rollup input and `dist/interactions.html` was built Sep 4. But it is a second, orphaned entry: the Lab it mounts (`Showcase/Lab/main.tsx` → `Lab/Interactions`) is already a leaf of the hash-routed showcase (`Showcase/Leaves/InteractionsLeaf.tsx:1` imports `../Lab/Interactions`; `Showcase/Leaves/registry.tsx:74` labels it "Interaction Lab"; History `1256` records the merge into "one hash-routed showcase"). Nothing links to `/interactions.html` — the Vercel rewrite serves only `design-system.html`; the `Showcase/README.md:7` is the sole mention. Delete the HTML, `Lab/main.tsx`, and the input line; keep `Lab/Interactions.tsx`.

**Scripts nothing documents.** `start` (`electron-vite preview`) and `check` (`biome check --write .`) appear in no doc, guideline, or plan (0 hits outside package.json). `typecheck:node`/`typecheck:web` are named only in the Mobile plan. Everything else is documented in CLAUDE.md or Development-Environment.md.

**Dependency census** — importers under `P/src` (files), split by process:

| package | kind | src | main | preload | shared | renderer | note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `@codemirror/commands` | dep | 6 | 0 | 0 | 0 | 6 | |
| `@codemirror/lang-json` | dep | **0** | | | | | last importer `codeHighlight.ts` at `f396ec00`; dropped by `179a3867` ("typed codeblocks — nested parses") |
| `@codemirror/lang-markdown` | dep | 1 | 0 | 0 | 0 | 1 | `MarkdownPM/index.tsx:6` |
| `@codemirror/lang-yaml` | dep | **0** | | | | | same history as lang-json |
| `@codemirror/language` | dep | 1 | 0 | 0 | 0 | 1 | `MarkdownPM/Editor/codeHighlight.ts:5-11` |
| `@codemirror/legacy-modes` | dep | **0** | | | | | same history; 2.7 MB installed |
| `@codemirror/state` | dep | 48 | 0 | 0 | 0 | 48 | 3 files outside MarkdownPM (`Interface/{GlancePane,PageView,pageEditor}`) + `Testing/editorHarness.ts` |
| `@codemirror/view` | dep | 58 | 0 | 0 | 0 | 58 | |
| `@fontsource-variable/inter` | dep | 3 | 0 | 0 | 0 | 3 | side-effect import in the three entries (`renderer/main.tsx:5`, `Showcase/main.tsx:3`, `Showcase/Lab/main.tsx:3`) |
| `@samasante/liquid-glass` | dep | 1 | 0 | 0 | 0 | 1 | `PommoraUIX/Glass/glass-control.tsx:2` — used |
| `@tabler/icons-react` | dep | 2 | 0 | 0 | 0 | 2 | `PommoraUIX/Symbols/{customGlyphs.tsx:4, fileTypes.ts:6}` |
| `@tanstack/react-virtual` | dep | 1 | 0 | 0 | 0 | 1 | `PommoraUIX/Pickers/IconPicker.tsx:9` |
| `@vanilla-extract/css` | dep | 55 | 0 | 0 | 0 | 55 | 29 in PommoraUIX, 26 across 13 other renderer folders |
| `chokidar` | dep | 1 | 1 | 0 | 0 | 0 | `main/watcher.ts:6` |
| `lucide-react` | dep | 4 | 0 | 0 | 0 | 4 | all in `PommoraUIX/Symbols/` |
| `mdast-util-from-markdown` | dep | 1 | 0 | 0 | 0 | 1 | `MarkdownPM/Parser/index.ts:1` |
| `mdast-util-gfm` | dep | 1 | 0 | 0 | 0 | 1 | `MarkdownPM/Parser/index.ts:3` |
| `micromark-extension-gfm` | dep | 1 | 0 | 0 | 0 | 1 | `MarkdownPM/Parser/index.ts:2` |
| `react` | dep | 255 | 0 | 0 | 0 | 255 | |
| `react-dom` | dep | 74 | 0 | 0 | 0 | 74 | |
| `react-markdown` | dep | **0** | | | | | importers were `Embeds/StaticMarkdown.tsx`, `Blocks/MarkdownBlock.tsx`; replaced at `77019808` ("prose tiles become CM6 portals") |
| `remark-gfm` | dep | **0** | | | | | same |
| `ulidx` | dep | 3 | 3 | 0 | 0 | 0 | `main/ids.ts:7` + 2 tests |
| `write-file-atomic` | dep | 1 | 1 | 0 | 0 | 0 | `main/IO/atomicWrite.ts:6` — the real library, not hand-rolled |
| `yaml` | dep | 2 | 2 | 0 | 0 | 0 | `main/readNexus.ts:8`, `main/IO/pageFile.ts:14` |
| `zod` | dep | 10 | 4 | 0 | 6 | 0 | the only external `src/shared` imports |
| `zustand` | dep | 2 | 0 | 0 | 0 | 2 | `renderer/store.ts:1`, `Store/sessionState.ts:1` |
| `@biomejs/biome` | dev | 0 | | | | | CLI |
| `@types/node` | dev | 0 | | | | | `tsconfig.node.json:12` |
| `@types/react`, `@types/react-dom` | dev | 0 | | | | | tsc |
| `@types/write-file-atomic` | dev | 0 | | | | | tsc |
| `@vanilla-extract/vite-plugin` | dev | 0 | | | | | 4 configs |
| `@vitejs/plugin-react` | dev | 0 | | | | | 4 configs |
| `electron` | dev | 32 | 31 | 1 | 0 | 0 | renderer imports it nowhere — it reaches main only via `window.nexus` (71 files) |
| `electron-builder` | dev | 0 | | | | | CLI |
| `electron-vite` | dev | 0 | | | | | `electron.vite.config.ts` + CLI |
| `jsdom` | dev | 0 | | | | | resolved by vitest from 92 `// @vitest-environment jsdom` pragmas, all under `src/renderer` |
| `pngjs` | dev | **0** | | | | | sole importer `Pommora/scripts/make-icon.mjs`, retired `3ab0bd51` (07-20-2026); the script also explains `.gitignore:6 build/_dots.png` |
| `typescript` | dev | 0 | | | | | CLI; also imported by `.claude/scripts/comment-{ledger,manifest}.mjs` from `Pommora/node_modules` |
| `vite` | dev | 0 | | | | | configs |
| `vitest` | dev | 321 | 89 | 0 | 35 | 197 | |

Zero-importer, genuinely dead: **`pngjs`, `react-markdown`, `remark-gfm`, `@codemirror/lang-json`, `@codemirror/lang-yaml`, `@codemirror/legacy-modes`.** `npm ls` confirms `unified`, `remark-parse`, `remark-rehype`, `remark-stringify`, `hast-util-to-jsx-runtime` reach the tree only through `react-markdown`/`remark-gfm` (~1.6 MB with them); `mdast-util-to-markdown` stays (needed by `mdast-util-gfm`).

**Phantom dependencies** (imported, undeclared, present only transitively): `@lezer/highlight` (`MarkdownPM/Editor/codeHighlight.ts:12`; via `@codemirror/language`) and the `mdast` types (`MarkdownPM/Parser/index.ts:4`, `MarkdownPM/Tokens/index.ts:2`; `@types/mdast` via `mdast-util-from-markdown`). Hoisting hides both today; per-workspace `package.json`s must declare them or a strict installer breaks the editor.

**Other stale content in configs:**

- `electron-builder.yml:9-11` documents `better-sqlite3`; `npmRebuild: true` (l.12) and `asarUnpack` (l.27-28) exist for it. `better-sqlite3` is not installed; the driver is `node:sqlite` (`src/main/Database/driver.ts:5`). With `build/icon.png` gone, `buildResources` holds no `icon.*` → the next package uses Electron's default icon.
- `electron.vite.config.ts:23-26` says `server.fs.strict: false` is "Preview worktree only (uncommitted) … Not for the committed config." It has been committed since `1b1ba4b1` (the React→Pommora rename).
- `P/package.json:2-4` name `pommora-react` and the Phase-1 description.
- `.claude/scripts/comment-ledger.mjs:87` pins pragma counts `biome-ignore 79, KNOB 84, @vitest-environment 88`; today's counts are 79 / 84 / **92**, so `--verify` already exits 1 on the pragma check.
- `.claude/scripts/comment-manifest.mjs:40` still uses `ts.createScanner`, the raw scanner `comment-ledger.mjs:22-26` documents as desyncing on template literals; `:19` defaults `base` to commit `53b5d903` (09-01-2026).
- `.claude/scripts/loc.py:64` `SKIP_DIR` has `"testing"`; the folder is `Testing`, so the five harness files (156 code lines) count as "App Chrome".

### 3. Dependency Ownership Under Core / UIX / Desktop

Import edges are clean at the process level: renderer never imports `electron` or `src/main`; main never imports `src/renderer`; shared imports nothing but `zod` (and three files self-alias through `@shared/*`: `shared/treePatch.ts:5-18` etc.). `@shared` has 425 importers (148 main, 1 preload, 273 renderer, 3 shared); `@renderer` has 338, none outside the renderer.

| Workspace | Runtime deps | Dev deps | Evidence |
| --- | --- | --- | --- |
| **Core** (`src/shared`, later engine) | `zod` | — | 6 shared files; the only external there. Also the 2 JSON fixtures in `shared/__fixtures__` (consumed by 2 renderer Pipeline tests). |
| **UIX** (`PommoraUIX`, `Interactions`, `Animation`) | `react`, `react-dom`, `@vanilla-extract/css`, `lucide-react`, `@tabler/icons-react`, `@tanstack/react-virtual`, `@samasante/liquid-glass`, `@fontsource-variable/inter` | `@types/react`, `@types/react-dom`, `@vanilla-extract/vite-plugin`, `jsdom` | 51/4/33/4/2/1/1 files respectively inside those three folders. Purity leaks a UIX package would have to resolve: `PommoraUIX/Elements/PickerControl.tsx:6` → `@renderer/Actions/nativeMenus`; `PommoraUIX/Pickers/ImagePicker/ImagePicker.tsx:14-17` → `@renderer/Assets/*`, `@renderer/store`, and `:130, 193` call `window.nexus.pasteImage/pickFile`; 15 PommoraUIX files import `@shared/{theme,clamp,types,schemas,nexusPaths,cropGeometry}` (fine if UIX depends on Core). |
| **Desktop — main + preload** | `electron`, `chokidar`, `ulidx`, `yaml`, `write-file-atomic`, `zod` (4 main files) | `electron`, `electron-vite`, `electron-builder`, `@types/node`, `@types/write-file-atomic` | census rows above; `node:sqlite` is a builtin. |
| **Desktop — app renderer** (MarkdownPM, Views, Frames, Store, …) | `@codemirror/{state,view,commands,language,lang-markdown}`, `mdast-util-from-markdown`, `mdast-util-gfm`, `micromark-extension-gfm`, `@lezer/highlight` (declare), `@types/mdast` (declare), `zustand`, plus the UIX set (26 non-PommoraUIX files use `@vanilla-extract/css`; 179 use `react`) | `vite` (Showcase), `@vitejs/plugin-react`, `@vanilla-extract/vite-plugin`, `jsdom` | Whether MarkdownPM is Desktop or its own package is the open design question; its deps are self-contained (CodeMirror + micromark) and it is 14,025 lines. |
| **Root** | — | `@biomejs/biome`, `typescript`, `vitest`, `@vitejs/plugin-react`, `@vanilla-extract/vite-plugin`, `jsdom`, `@types/node` | whatever the root `vitest.config.ts`/`biome.json` import. |
| **Nobody** | `react-markdown`, `remark-gfm`, `@codemirror/lang-json`, `@codemirror/lang-yaml`, `@codemirror/legacy-modes` | `pngjs` | zero importers. |

Sizes for scale (non-test ts/tsx/css, `wc -l`): main 15,079 · preload 203 · shared 5,953 · renderer 66,709 (PommoraUIX 7,722 · Interactions 3,593 · MarkdownPM 14,025 · Showcase 3,197).

### 4. The Monorepo Config Surface

Assume PascalCase workspaces at the root (`Core`, `UIX`, `Desktop`; `Mobile`/`Sync` later), one root `package.json` with `workspaces`, one hoisted `node_modules`.

**Root (new or moved):**

- `package.json` — new: `private: true`, `workspaces`, root scripts delegating (`npm run dev -w Desktop`), root devDeps = what root configs import. `P/package-lock.json` is regenerated; the current one carries no workspace data.
- `biome.json` — **must move to the root**, not just because of `biome check .`: the Studio-level format hook `cd`s to the directory holding `node_modules/.bin/biome`, which becomes the root; Biome resolves config from the cwd upward, never downward, so a `Desktop/biome.json` would be invisible and every hooked write would be reformatted with Biome defaults (double quotes, semicolons). `includes` gains `"!**/out"`, `"!**/release"` only if `.gitignore` coverage is not relied on (`vcs.useIgnoreFile` reads the root ignore and, in Biome 2, nested ones — so moving `P/.gitignore`'s entries to the root ignore keeps it working).
- `vitest.config.ts` — move to root. `include` and `setupFiles` are cwd-relative strings (l.17-18) and must become `Desktop/src/**`, `Core/**`, `UIX/**` (or, better, `test.projects` — §5). Aliases (l.22-23) re-point `@shared → Core/shared`, `@renderer → Desktop/src/renderer` (and `@uix` if the PommoraUIX splits). Root vitest cache then lands in the root `node_modules/.vite`, which is where the stale one already is.
- `tsconfig.json` — root solution file referencing each workspace's tsconfig; scripts switch to `tsc -b` or keep per-project `-p` (§6).
- `vercel.json` — one file, root: `installCommand: npm install`, `buildCommand: npm run build:showcase` (delegating to Desktop), `outputDirectory: Desktop/dist`; delete `P/vercel.json`. The Vercel dashboard Root Directory must be `.` (the README notes either works today).
- `.gitignore` — merge `P/.gitignore`'s `out/ dist/ release/ .vite/ coverage/ *.tsbuildinfo *.env` into the root's; drop `dist-app/` and `build/_dots.png`.

**Desktop/:**

- `electron.vite.config.ts` — aliases `@shared → resolve('../Core/shared')` (l.9, 13, 18); `@renderer` unchanged (l.19). Entries stay default if `Desktop/src/{main,preload,renderer}` is kept; otherwise set `main.build.lib.entry`, `preload.build.lib.entry`, `renderer.root`. Delete l.23-26. **Trap:** `externalizeDepsPlugin()` externalizes every key of the *Desktop* `package.json`'s `dependencies` (lib chunk: `deps = Object.keys(pkg.dependencies)` → rollup `external`). If Core is listed as `@pommora/core` in Desktop's dependencies, `out/main/index.js` will contain `require("@pommora/core")` at runtime, which only works if Core ships compiled CJS. Either `externalizeDepsPlugin({ exclude: ['@pommora/core'] })` so it bundles, or reach Core through the alias/`paths` and never list it as a dep.
- `vite.config.ts` — same alias change; inputs lose `interactions.html`.
- `tsconfig.node.json` — `paths @shared/* → ../Core/shared/*`; include drops `src/shared/**`, adds a reference to Core (§6); `electron.vite.config.ts`, `vitest.config.ts` include entries follow wherever those files land (the root vitest config leaves this project).
- `tsconfig.web.json` — same `paths`; include drops `src/shared/**`; `src/preload/index.d.ts` stays only if the `Window.nexus` type stays in preload (§6 argues for moving it to Core).
- `electron-builder.yml`, `build/` — move unchanged; paths are relative to the file. Drop l.9-12 and l.27-28 (no native module); add an icon or accept the default.
- `design-system.html` — `/src/renderer/Showcase/main.tsx` is served relative to Vite's root (the Desktop folder), so it moves unchanged.
- `package.json` — `@pommora/desktop`, `main: ./out/main/index.js`, the Electron scripts; deps per §3.

**Core/**, **UIX/**: new `package.json` each (deps per §3), a tsconfig each (§6). Every cross-folder import already goes through `@shared`/`@renderer`, so **zero source lines change for a Core split**; a UIX split adds `@uix` and rewrites the `@renderer/PommoraUIX|Interactions|Animation` specifiers (559 + 105 + 54 import sites in non-test renderer files, plus 96/16/15 inside those folders) — a mechanical sed, but the three purity leaks above need real decisions.

**The harness — what hard-codes the layout and what it reads after:**

| Script | Line | Today | After |
| --- | --- | --- | --- |
| `comment-ledger.mjs` | 12 | `import ts from '../../Pommora/node_modules/typescript/lib/typescript.js'` | `'../../node_modules/typescript/lib/typescript.js'` (hoisted root) |
| | 15 | `appRoot = join(repoRoot, 'Pommora')` | `appRoot = repoRoot` |
| | 68, 71 | `git show rev:./file` / `readFileSync(join(appRoot, file))` with `src/…` keys | keys become `Desktop/src/…`, `Core/…`, `UIX/…` |
| | 80 | `git ls-files 'src/**/*.ts' 'src/**/*.tsx'` | `'Desktop/src/**/*.ts' 'Desktop/src/**/*.tsx' 'Core/**/*.ts' 'UIX/**/*.ts' 'UIX/**/*.tsx'` |
| | 87 | pinned pragma counts (already wrong: 88 vs 92) | re-derive or drop the pin |
| | 94 | `git grep … -- 'src/*.ts' 'src/*.tsx'` | the workspace globs |
| | 110 | `unitOf` strips `^src/` | strip the workspace prefix + `src/` |
| `comment-manifest.mjs` | 13, 16 | same ts import / `appRoot` | same fix |
| | 54, 60, 92 | `git show`/`ls-files 'src/**'`/`readFileSync` in appRoot | same globs |
| | 19 | default `base = '53b5d903'` — a pre-move commit whose `src/` paths will not match post-move files (every file reads as "new", nothing compares) | needs a post-move base or retirement |
| `comment-baseline.json`, `comment-units.json` | all 952 / 923 keys | `src/main/…`, `src/renderer/…` | invalid until `--snapshot` reruns; units are a finished pass's partition |
| `check-atlas.mjs` | 19-21 | `join(repoRoot, 'Pommora/src/renderer/PommoraUIX', f)` for `Tokens/theme-vars.css.ts`, `Tokens/color.css.ts` | `Desktop/src/renderer/PommoraUIX` or `UIX/PommoraUIX` |
| | 33, 35, 38 | `existsSync(join(repoRoot, s))` for each `` `path` `` on a Features `**SOURCE:**` line | the 31 `Pommora/src/…` paths across 16 tables in `.claude/Features/*.md` must be rewritten, or every table fails "source file missing" and the post-commit hook prints drift on every commit |
| | 40 | `base.split('/src/')[0] + 'src/renderer/PommoraUIX'` | still works for `Desktop/src/…`; breaks if PommoraUIX moves to `UIX/` without a `src/` segment |
| `loc.py` | 4, 121 | docstrings naming `Pommora/src` | text |
| | 23 | `SRC = "Pommora/src"` — used by `measure_tree` (l.123) and `git archive sha Pommora/src` (l.159, 186) | becomes a list of roots (`Desktop/src`, `Core`, `UIX`); `--history`/`--rebuild` must try both old and new paths per commit, the way l.69-70 already folds `renderer/src/` → `renderer/` from the last rename |
| | 28-50 | AREAS keyed `renderer/…`, `main`, `shared`, `preload` relative to SRC | "Shared Contract" (`shared` + `preload`) spans two roots; area keys need a root-aware mapping so `loc-history.json`'s seven series continue |
| | 64 | `SKIP_DIR` `"testing"` (case bug) | `"Testing"` |
| `hooks/post-commit` | 20, 22, 35 | `.claude/scripts/…` repo-relative | unchanged |
| `hooks/republish-ledger.mjs` | 25 | `.claude/scripts/Line-Ledger.html` | unchanged |
| `.claude/settings.json` | 10 | `$CLAUDE_PROJECT_DIR/.claude/hooks/…` | unchanged |
| `Line-Ledger.html`, `loc-history.json` | — | area names only, no paths | unchanged |
| `core.hooksPath` (git config) | — | absolute path to `.claude/hooks` | unchanged (the `.claude` folder does not move) |
| Docs | — | 448 mentions of `Pommora/src`, `src/main|renderer|shared|preload` across 26 `.claude` files (excluding Sessions/Planning; 16 in `Features/ArchitecturePM.md`); `cd Pommora` in `vercel.json:4-5`; "run from `Pommora/`" in `CLAUDE.md:24, 44` | sed pass |

### 5. The Test Setup

`vitest.config.ts` applies `environment: 'node'` (l.16) and `setupFiles: ['src/renderer/Testing/setup.ts']` (l.18) to all 321 test files: 89 main, 35 shared, 197 renderer (83 `.test.tsx`, 114 `.test.ts`).

What `setup.ts` does: stubs four APIs jsdom lacks — `document.elementFromPoint` (l.3-5), `Range#getClientRects/getBoundingClientRect` (l.10-13, CodeMirror's empty-doc measurement), `ResizeObserver` (l.17-23, PickerMenu), `Element#scrollIntoView` (l.27-29). Every stub is behind `typeof document/Range/globalThis/Element !== 'undefined'`, so under the node environment the file executes and does nothing. It only matters for the **92** renderer files carrying `// @vitest-environment jsdom` (all under `src/renderer`: MarkdownPM 30, Interactions 6, Frames 6, Tiles 6, …). 44 test files and 25 non-test renderer files touch the stubbed APIs; **none** are under `src/main`, `src/shared`, or `src/preload`. The 105 renderer tests without the pragma run in node and use no `document.`/`window.` (checked). Main does not need `setup.ts`; it costs a module load per main worker and nothing else.

Split the suite per workspace with Vitest 4 `test.projects` in the root config (one Vitest invocation, one report, per-project environment/setup/include):

- **Core** — `include: Core/**/*.test.ts`, `environment: node`, no setup, no react/vanilla-extract plugins.
- **Desktop-main** — `Desktop/src/{main,preload}/**/*.test.ts`, node, no setup.
- **Desktop-renderer / UIX** — `Desktop/src/renderer/**/*.test.{ts,tsx}` (+ `UIX/**`), `setupFiles: Testing/setup.ts`, react + vanilla-extract plugins. Default environment can stay `node` with the 92 pragmas kept, or flip to `jsdom` and delete the pragmas (the 105 node-only renderer tests would then pay jsdom's startup; the pragma count at `comment-ledger.mjs:87` would drop to 0 either way).

`renderer/Testing/*` (editorHarness, pointerHarness, pageValues, propsAtRoot, setup) has 0 consumers outside the renderer, so it moves with the renderer or with UIX, not to Core.

### 6. The Two tsconfig Projects

Today: `tsconfig.node.json` (main + preload + shared + two configs) and `tsconfig.web.json` (renderer + shared + `preload/index.d.ts`). `src/shared` (5,953 lines, 87 files) is typechecked twice; so is `src/preload/index.ts` — the web project reaches it through `index.d.ts`'s `import type … from './index'` (l.1), which drags Electron's typings into the renderer project. `tsconfig.json`'s `references` (l.3) are unused because the scripts run `tsc --noEmit -p` per project, never `tsc -b`. tsconfig.web has no `types` list, so Node's globals are visible to renderer code (no renderer file uses `NodeJS.*` or `process.`; a `types: []`/DOM-only config would pass).

Minimal set under project references, one per workspace plus the solution file:

1. `Core/tsconfig.json` — `composite`, `lib: ["ES2022"]` (no DOM, no node types: shared imports nothing platform-specific), `include: ["**/*.ts"]`. Shared is compiled once.
2. `Desktop/tsconfig.node.json` — main + preload, `types: ["node"]`, `references: [Core]`, `paths @shared/* → ../Core/shared/*`.
3. `Desktop/tsconfig.web.json` — renderer (+ Showcase), DOM lib, `jsx`, `references: [Core, UIX]`, `paths`. Drops `src/preload/index.d.ts` **if** the `Window.nexus` declaration moves: `NexusApi` is `typeof api` (`preload/index.ts:196`) and `api` is built from `@shared/bridge`'s `Asks/Pushes/Tells` (`preload/index.ts:3`), so a Core-side `NexusApi` type derived from the bridge map — with `preload` asserting `api satisfies NexusApi` — lets the renderer, UIX, and a future Mobile shim share the contract without importing preload or Electron.
4. `UIX/tsconfig.json` — if UIX splits: DOM lib, `jsx`, `references: [Core]`.
5. Root `tsconfig.json` — `files: []`, `references` to the four; `npm run typecheck` = `tsc -b` (references require `composite` on referenced projects, which every project already sets; with `noEmit` kept, `tsc -b` still typechecks and writes `.tsbuildinfo` — the reference graph resolves `@shared/*` via `paths` to source, no declaration emit needed).

That is four leaf projects (three if UIX stays inside Desktop's renderer) and one solution file; the two config-file includes (`electron.vite.config.ts`, `vitest.config.ts` at `tsconfig.node.json:19-20`) follow the files: the root vitest config joins a small root project or is left to Vitest's own bundling, and `vite.config.ts` finally gets typechecked by including it in Desktop's node project.

### 7. CommonJS

`Development-Environment.md:16`: "CommonJS main/preload — the package is intentionally not `type: module`; Electron's `require('electron')` fails on ESM named imports, and CJS keeps the preload sandboxed."

Checked against Electron 42 and electron-vite 5.0.0:

- **Main-process ESM is supported since Electron 28** (`electron/docs/tutorial/esm.md`: "This feature was added in `electron@28.0.0`"). `import { app } from 'electron'` is the documented form; the doc's only named-import caveat concerns *transpilers* that lower `import { bar }` to `require()` with interop semantics — not a failure of Electron's own ESM loader. The "fails on ESM named imports" half of the claim is outdated.
- **electron-vite 5 emits ESM only when `package.json` has `"type": "module"` and Electron ≥ 28** — `lib-q6ns0vZr.js:284, 390`: `format = pkg.type === 'module' && supportESM() ? 'es' : 'cjs'`; `supportESM()` (l.133-136) reads the installed Electron major; ESM outputs become `[name].mjs` (l.435-442); `import.meta.{url,filename,dirname}` are rewritten for the CJS case (l.767-773). The current `out/main/index.js` is CJS because there is no `type` field.
- **The sandboxed-preload half is real and binding.** `esm.md`: "Sandboxed preload scripts can't use ESM imports … Sandboxed preload scripts are run as plain JavaScript without an ESM context"; the table lists Renderer (Sandboxed) → "ESM Loader in Preload: Unsupported". The app sets `sandbox: true` (`src/main/index.ts:298`) and `contextIsolation: true` (l.299). So the preload bundle stays CJS regardless of `type`; electron-vite already bundles preload into a single file (l.8-13 `externalizeDepsPlugin` externalizes only `dependencies`), which is what Electron recommends for sandboxed preloads.
- Switching **main** to ESM is possible but not free: `__dirname` at `src/main/index.ts:227, 297` becomes `import.meta.dirname` (electron-vite handles the rewrite at Electron ≥ 30, `supportImportMetaPaths` l.137-140), and ESM's async loading means anything that must precede `app.ready` (e.g. `app.setPath`) needs explicit `await` (esm.md "You must use `await` generously before the app's `ready` event"). Nothing in main uses `require()` or `import.meta` today (0 files), so the source is format-neutral.

**Does it constrain Core's module format? No.** Core is TypeScript source consumed by bundlers — electron-vite bundles main and preload, Vite bundles the renderer, Vitest transforms on the fly — so Core never runs as a Node module in either format. The one place format leaks in is the `externalizeDepsPlugin` trap in §4: a Core listed as a *dependency* of Desktop is externalized and `require`d at runtime, which would force Core to ship compiled CJS. Excluding it from externalization (or aliasing instead of depending) removes the constraint entirely. `type: module` for Core's own `package.json` is harmless either way; for Desktop it flips the main bundle to `.mjs` and demands the `ready`-timing audit above.

### Delete Outright

| Item | Size | Why |
| --- | --- | --- |
| `Pommora/release/` | 370 MB | Jul 5 ad-hoc build; regenerable; icon cache from a deleted source |
| `Pommora/out/` | 8.3 MB | regenerable build output |
| `Pommora/dist/` | 4.7 MB | regenerable Showcase output (Vercel builds its own) |
| `Pommora/dist-app/` | 1.4 MB | orphaned web-target output, Jul 4 |
| `Pommora/vite.config.app.ts` + `dev:app`/`build:app` (`package.json:18-19`) + `.gitignore:4` | 761 B | the target nothing references; the Mobile plan already removes it |
| `Pommora/tsconfig.{node,web}.tsbuildinfo` | 400 KB | incremental cache; regenerates on the first typecheck |
| root `node_modules/` | 24 KB | vitest cache from a root-invoked failed run |
| `pngjs` devDep + `.gitignore:6 build/_dots.png` | 704 KB installed | importer retired 07-20-2026 |
| `react-markdown`, `remark-gfm` deps | ~1.6 MB installed incl. `unified`/`remark-*`/`hast-util-to-jsx-runtime` | zero importers since `77019808` |
| `@codemirror/legacy-modes`, `lang-json`, `lang-yaml` deps | 2.7 MB + 36 KB + 44 KB | zero importers since `179a3867` |
| `Pommora/interactions.html` + `src/renderer/Showcase/Lab/main.tsx` + `vite.config.ts:21` | 688 B | second entry to a leaf the hash-routed showcase already serves; nothing links to it |
| `Pommora/vercel.json` | 226 B | one of two; the root file governs Root Directory `.` |
| `.claude/scripts/comment-units.json` | 43 KB | a finished pass's work partition keyed by pre-move paths |
| `.claude/scripts/comment-baseline.json` | 111 KB | snapshot at a past rev, every key invalid post-move; regenerate with `--snapshot` if the ledger stays |
| `.claude/scripts/comment-manifest.mjs` | 5.6 KB | review tool for the finished pass; uses the raw scanner the ledger documents as broken |
| `.claude/settings.local.json:6-9` | 4 lines | `cp` permissions for four files that no longer exist |
| `electron-builder.yml:9-12, 27-28` | 6 lines | better-sqlite3 rebuild/unpack for a module that is gone |
| `electron.vite.config.ts:23-26` | 4 lines + `server.fs.strict` | comment claims "uncommitted"; committed since `1b1ba4b1` |
| `Pommora/build/pommora-icon-src.png` | 1.8 MB tracked | referenced nowhere; source for the retired icon script — a candidate, since it is the only icon source left |

Regenerable outputs total ~385 MB; dead dependencies ~5 MB installed; dead tracked files ~2 MB.

### Summary

The build surface is one flat npm package under `Pommora/` with four Vite configs (desktop, showcase, a dead web target, tests), two overlapping tsconfig projects that compile `src/shared` and `src/preload/index.ts` twice and whose root `references` nothing runs, and a Vitest suite that pushes a jsdom-only setup file and `environment: node` at all 321 files while 92 renderer files opt into jsdom by pragma. Six dependencies have zero importers (`pngjs`, `react-markdown`, `remark-gfm`, three CodeMirror language packs) and two are phantoms (`@lezer/highlight`, `mdast` types). Import edges are already workspace-clean: shared depends only on `zod`, renderer never touches `electron`, and every cross-folder import goes through `@shared`/`@renderer`, so a Core split changes zero source lines; a UIX split has three concrete purity leaks. Under a root monorepo, `biome.json` and `vitest.config.ts` must move to the root (the Studio format hook `cd`s to the hoisted `node_modules`), `electron-vite`'s `externalizeDepsPlugin` will externalize Core if listed as a dependency, and the four `.claude` scripts plus 31 Features `SOURCE` paths hard-code `Pommora/src`. The CJS rule is half-right: Electron 42 runs ESM main, but the sandboxed preload cannot be ESM, and Core's format is irrelevant because it is only ever bundled.
