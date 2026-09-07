## Pommora Monorepo — Delivery Claim

> Written 09-06-2026 against `3e6c87ca5`. Every number and every command output below was produced in the session that wrote this document, from the repository root, against the working tree as it stands. A reader with only this document and the repository can re-run every line.

### The Claim

The repository is a monorepo at its own root: six PascalCase workspaces — `Core` (Pommora itself, twenty-two domains, each holding that domain's logic, surfaces, and stylesheets), `UIX` (the design kit, seventeen categories at its root, importing nothing from Core), `Desktop` (the Electron host: the Platform implementation, the Store, the Bridge, FileWatch, Actions, Web, Capture, Config, Renderer), `Mobile` and `Sync` (seated with a manifest each), and `Showcase` (severed from Core, building on its own). The `Pommora/` package folder and the `src/{main,preload,renderer,shared}` split by process no longer exist; Core reaches a machine only through `Core/Platform`, and `Core/Contract` is the one channel table both sides derive from.

**Base:** `7941edeca` · **Tip:** `3e6c87ca5` — the commit every figure below was taken at, and the record commit under `.claude/Planning` for the closeout comment killer that landed at `12f52789d`. HEAD has since moved on only to carry this document; no code commit follows `3e6c87ca5`.

**Code-line delta, both counters:**

| Counter | Command | Base | Now | Delta |
| --- | --- | --- | --- | --- |
| The run's series | `python3 ~/Pommora-Scratch/codelines.py 7941edec HEAD` → `7941edec 69459` / `HEAD 68743` | 69,459 | 68,743 | **−716** |
| `loc.py` product areas | `python3 .claude/scripts/loc.py` → `total 70867`, `Showcase 2155` | 69,704 | 68,712 | **−992** |

The `loc.py` baseline of 69,704 is the figure recorded at Task 0 and still on disk at `~/Pommora-Scratch/baseline/loc.txt` (`{"head": "7941edec", … "total": 69704}`); Showcase sits outside the product figure on both sides. Both counters are negative.

**Tests:** 321 files / 4,006 tests at base (`~/Pommora-Scratch/baseline/test.txt`: `Test Files 321 passed (321)` · `Tests 4006 passed (4006)`) → **334 files / 4,050 tests** now (`npm run test` → `Test Files 334 passed (334)` · `Tests 4050 passed (4050)`, exit 0).

**Lint:** 1,019 files at base (`~/Pommora-Scratch/baseline/lint.txt`: `Checked 1019 files in 293ms. No fixes applied.`) → **1,065 files** now (`npm run lint` → `Checked 1065 files in 291ms. No fixes applied.`, exit 0).

**Pending:** Nathan's own pass over the restructured app — a day on the real Nexus and a flip through `Core`, `UIX`, and `Desktop` — is the one item the plan's Completion Criteria leaves open, recorded as the sole entry under Immediate Work in `.claude/ContextPM.md`. Two review passes are also still ahead of this document by the closeout's ruled order; they are named under **The Passes** below.

---

### Requirements 1–12

Each block gives the requirement as the plan states it, the task or tasks that delivered it with their commit hashes from Progress, and the evidence re-run now.

#### Requirement 1

*Six PascalCase workspaces at the root; `Pommora/` dissolves; root holds one Biome, one Vitest with a project per workspace, one root TypeScript file, `.claude/` untouched in place.*

**Delivered by:** Task 1 `ebed2f3aa` · Task 8 `4f6a88982` (`Pommora/` gone) · Task 17 `ffd56b07a` (Showcase severed).

- `node -e "console.log(JSON.parse(require('fs').readFileSync('package.json')).workspaces.join(' '))"` → `UIX Core Desktop Mobile Sync Showcase`
- `ls` at the root → `Core Desktop Mobile Showcase Sync UIX biome.json node_modules package-lock.json package.json vercel.json vitest.config.ts`
- `test ! -d Pommora` → exit 0
- `test -f biome.json` → present, the one Biome config
- `cat vitest.config.ts` → `test: { projects: ['UIX', 'Core', 'Desktop'] }`
- `ls Mobile Sync` → `Mobile: package.json` · `Sync: package.json tsconfig.json`
- `ls .claude/` → `CLAUDE.md ContextPM.md Features FrameworkPM.md Guidelines HandoffPM.md HistoryPM.md Planning PommoraPRD.md Sessions hooks scheduled_tasks.lock scripts settings.json settings.local.json skills` — in place, at the root, undisturbed.

**Ruled outcome:** the root TypeScript file does not exist. `test -f tsconfig.json` → absent. Gate 1's Deviations entry rules it: *"the root `tsconfig.json` (inert references, nothing runs `tsc -b`) deleted"* — the references it carried were never executed, and each workspace carries its own project. Recorded again under **Deviations and Open Items**.

#### Requirement 2

*`shared/` dissolves into Core, UIX, Desktop; `types.ts` splits into its seven files first.*

**Delivered by:** Task 2 `df7cde742` · Task 3 `30b897c9d`.

- `rg -F '@shared/' Core UIX Desktop Showcase` → 0 lines. Control: `rg -F '@pommora/core' Core UIX Desktop Showcase` → 716 lines.
- The Contract's home: `ls Core/Contract` → `bridge.ts handlers.ts result.ts serve.ts validators.ts`
- No `shared` folder survives in any workspace; the seven destination files named by Task 3's Becomes are reachable (`Core/Nexus/tree.ts`, `Core/Settings/personalization.ts`, `Core/Trash/trashRow.ts`, `Core/Navigation/navRef.ts`, `Core/Interface/chrome.ts`, `Core/Views/viewRow.ts`, `UIX/Theme/colorSetting.ts` — the last folded into `UIX/Theme/colors.ts` at Task 12, ruling: one color file).

#### Requirement 3

*Core filed by the domains of B-3, each with its admission rule; pure and React parts in separate subfolders where a domain exceeds about thirty files.*

**Delivered by:** Task 4 `e004a49a7` · Task 5 `7f8452c86` · Task 10 `48b23960e` · Task 11 `9dfe2e59f`.

- `ls Core` → `Actions Assets Connections Contexts Contract IO Index Interface Locations MarkdownPM Navigation Nexus Pages Platform Properties Session Settings Tiles Trash Utilities Views Web` (22 folders, plus `package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`).
- The Decision Log's B-3 tree names exactly these twenty-two domains. The plan's Requirement text says "23 domains of B-3"; B-3 itself lists twenty-two, and the tree matches B-3 name for name.
- Domains over about thirty files and their nesting (`git ls-files <domain> | wc -l`; `ls -d <domain>*/`): `MarkdownPM` 150 files / 11 subfolders · `Properties` 111 / 4 · `Views` 109 / 7 · `Interface` 92 / 10 · `Tiles` 47 / 2 · `Nexus` 54 / 0 · `Actions` 45 / 0 · `Assets` 31 / 0.
- `Nexus` and `Actions` stay flat because neither holds a React part: `git ls-files Core/Nexus | grep -c tsx` → 0 and `rg -l "from 'react'" Core/Nexus` → 0; the same two commands over `Core/Actions` → 0 and 0. The pure/React split has nothing to separate there. `Assets` sits at the "about thirty" line with six `.tsx` files and stays flat.

#### Requirement 4

*The Platform seam: interfaces in `Core/Platform`, implemented in `Desktop/Platform` and `Desktop/Renderer`; the handler literal split by domain into Core taking a context object; the preload `api` object deleted for a dialer; the renderer types against `Core/Contract`.*

**Delivered by:** Task 2 `df7cde742` · Task 6 `1cceaae3e` · Task 7 `1c052c1a3` · Task 8 `4f6a88982`.

- `ls Core/Platform` → `assetUrl.ts dialer.ts localState.test.ts localState.ts machine.test.ts machine.ts nativeMenus.ts openWebLink.ts stores.ts useBridgeSubscriptions.ts`
- `ls Desktop/Platform` → `fileLock.test.ts fileLock.ts nodeMachine.ts`
- `rg -c "interface Dialer" Core/Platform/dialer.ts` → 1 · `rg -c "interface HostContext" Core/Contract/handlers.ts` → 1
- `rg -l "from 'node:" Core --glob '!*.test.*'` → 0. Control: `rg -l "from 'node:" Desktop` → 17 files.
- Globals, which an import grep cannot see: `rg -n '\bsetImmediate\b|\bNodeJS\.|\.unref\(|\bprocess\.|\bBuffer\.' Core -g '!*.test.*' -g '!vitest.setup.ts' -g '!**/editorHarness.ts'` → 0.
- `rg -F 'Buffer.' Core --glob '!*.test.*'` → 0. Control: `rg -F 'TextEncoder' Core` → 2.
- `rg -F 'AsyncLocalStorage' Core` → 0. Control: `rg -c 'AsyncLocalStorage' Desktop/Platform/fileLock.ts` → 2.
- `rg -F 'NexusApi' Core UIX Desktop` → 0 · `rg -F 'LegacyApi' Core UIX Desktop` → 0 · `rg -F 'const api = {' Desktop` → 0.
- `rg -c 'exposeInMainWorld' Desktop/Bridge/preload.ts` → 1 · `wc -l Desktop/Bridge/preload.ts` → 26 lines (from 196).
- `ls Core/*/handlers.ts` → thirteen domain handler maps: `Actions Assets Contract Interface Navigation Nexus Pages Properties Settings Tiles Trash Views Web`.
- `wc -l Desktop/main.ts` → 346 (the Verify's cap is 400) · `rg -F 'ipcMain.handle' Desktop` → 1 site · `rg -F 'BrowserWindow' Core` → 0, control `rg -c 'BrowserWindow' Desktop/main.ts` → 6.

**Ruled outcome:** Task 6's Verify line reads `rg -l "from 'node:" Core` → 0 without a test exclusion; the figure including tests is 69 files. Task 6's Deviations entry rules it: *"Core tests keep `node:` for fixtures (67 files)"* — the seam governs production code, and no non-test Core file imports Node. The seam's compile gate is `Core/tsconfig.src.json` — Core's non-test sources typechecked without `node` in `types` (`npx tsc -p Core/tsconfig.src.json` → 0, in the root `typecheck` chain), restored at closeout after the widened `Core/tsconfig.json` had covered the tests' `node:` fixtures. Task 8's Deviations entry rules `HostContext` wider than the plan's sketch (push, pick, pasteImage, clipboard, reveal, openExternal, message, systemAccent, menu, thumbnails, webGuests, trashMode, fetchTitle, openStores, adopted, watch, applyZoom), because forty-odd channels are Electron-only and Core cannot import Electron.

#### Requirement 5

*The dispatcher's nine inline bodies become modules; the governed-key sweep is one mechanism; the two session-singleton reach-ins in primitives take the root as a parameter.*

**Delivered by:** Task 9 `838b1fa00`.

- `wc -l Core/Nexus/mutate.ts` → 171 (the Verify's cap is 220; 784 at base).
- `rg -F 'export function cascadePages' Core` → 0. Control: `rg -F 'sweepGovernedRoots' Core` → 34 lines.
- `rg -F 'sessionRoot()' Core/Contexts` → 0.

**Ruled outcome:** `rg -F 'sessionRoot()' Core/Properties` → 4 lines, not 0. Three are handler bodies at `Core/Properties/handlers.ts:55`, `:69` and `:115`, and the fourth is `Core/Properties/cascadeRace.test.ts:52`. (The imports at `handlers.ts:14` and `cascadeRace.test.ts:13` name the symbol without the call parentheses and do not match the literal.) The Verify names `Core/Properties/governed`, a folder Task 9 ruled out of existence: *"no `Core/Properties/governed/` folder (the governed code is flat in Properties and Task 10 names no subfolder)"*. The seam's intent — no session reach-in below the handler layer — is met: the primitives `journalSlot` and `governedWrite` take the root, and the remaining reads are in the handler layer, which is where the open session is known. Control: `rg -F 'sessionRoot()' Core/Nexus/handlers.ts` → 5.

#### Requirement 6

*UIX holds the kit only, categories at its root, importing nothing from Core; the seven misfiled feature files leave; motion has one definition in `UIX/Animations`.*

**Delivered by:** Task 5 `7f8452c86` · Task 12 `50eded4fb` · Task 13 `ab246bac7` (the last UIX→Core edge severed).

- `ls UIX` → `Animations Buttons Cards Caret Controls Elements Fields Glass Interactions Labels Menus Pickers Symbols Table Theme Utilities Windows` (17 categories at the root, plus `package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`). No `Primitives` folder: `test ! -d UIX/Primitives` → absent.
- `rg -l "from '@pommora/core" UIX` → 0. Control: `rg -F '@pommora/uix' Core UIX Desktop Showcase` → 671 lines.
- `rg -l 'useSession' UIX` → 0 · `rg -l 'window.nexus' UIX` → 0.
- `rg -F 'getComputedStyle' UIX/Interactions/OverScroll.tsx` → 0 (it reads the token). Control: `rg -F 'duration.base' UIX` → 8 lines.
- `rg -c 'function useHeld\b' UIX` → one file, `UIX/Animations/useExitPresence.ts:1`; `useHeldPresence` still defined once at `UIX/Animations/useExitPresence.ts:30`.
- `rg -n 'paneMaterial' UIX` → the export at `UIX/Glass/glass-base.tsx:91`, defined as `frostStyle({ ...SURFACE_FROST, brightness: 95 })`, and its one consumer at `UIX/Glass/glass-pane.tsx`.
- One color file: `rg -n '#[0-9a-fA-F]{6}\b|rgb\(|hsl\(|oklch\(' Core UIX Desktop -g '!*.test.*' -g '!UIX/Theme/colors.ts'` → 0. Control: `rg -c '#[0-9a-fA-F]{6}\b|rgb\(|hsl\(|oklch\(' UIX/Theme/colors.ts` → 20. `ls UIX/Theme` → `color.css.ts colors.test.ts colors.ts index.ts ramp.test.ts ramp.ts stack.ts theme-vars.css.ts typography.css.ts`.

#### Requirement 7

*Every list menu on one model (`Core/Actions`), one channel, one native popper (`Desktop/Actions`), one in-app presenter (`Core/Interface`); menu channels 26 → 1.*

**Delivered by:** Task 13 `ab246bac7` (comment killer `7b6a6ed13`).

- The channel table's menu-named keys, base against now (`grep -oE "^  '[^']*menu[^']*'" <bridge>`):
  - Base (`git show 7941edec:Pommora/src/shared/bridge.ts`) → 23 keys: `card-menu cell-menu citation-menu column-menu conn-menu context-menu create-menu grip-menu history:menu icon-favorite-menu menu:action nav-row-menu option-menu page-actions-menu property-menu row-menu tab-menu table-menu trash:menu view-button-menu view-embed-area-menu view-embed-title-menu view-row-menu`
  - Now (`Core/Contract/bridge.ts`) → 2 keys: `menu:action` (a Push, the editor menu's action) and `row-menu`. The Asks' menu channels go **22 → 1**.
- Total channels, base → now (`awk` over each `Asks`/`Tells`/`Pushes` block): Asks 129 → 104 · Tells 5 → 5 · Pushes 14 → 7.
- `ls Desktop/Actions` → `accelerators.test.ts accelerators.ts appMenu.ts editorMenu.ts returningMenu.ts rowMenu.test.ts rowMenu.ts` — the four survivors the Becomes names, plus accelerators and two tests.
- `rg -l 'buildFromTemplate' Desktop` → 3 files (the Verify's cap is 4).
- `ls Core/Actions | grep -c 'Menu.test'` → 18 model tests (the Verify asks ≥ 22 counting a differently-scoped set; see the ruled outcome).
- The in-app presenter exists: `Core/Interface/Menus/RowMenuHost.tsx`, 63 lines; `rg -F 'presentRowMenu' Core` → 5 lines. The native leg: `rg -F 'popRowMenu' Core Desktop` → 69 lines.
- One retired-channel string survives a literal search: `rg -F "'context-menu'" Core Desktop` → `Desktop/Actions/editorMenu.ts: win.webContents.on('context-menu', …)`. That is Chromium's own WebContents event name, not a bridge channel; ruling 37 keeps the editor context menu native and whole.

**Ruled outcome:** the plan's Verify control `rg -F "'row-menu'" Desktop/Bridge` → ≥ 1 cannot be met — it returns 0. Task 13's Deviations entry rules why: *"`Desktop/Bridge` holds no channel literal by construction (it iterates the handler map), so the Verify control … cannot be met there"*. The literal is present where the channel is served and dialed: `rg -F "'row-menu'" Core Desktop -l` → 15 files including `Core/Contract/bridge.ts`, `Core/Actions/handlers.ts`, and `Core/Platform/nativeMenus.ts`. The same entry rules the model-test count: *"The Becomes' '14 existing model tests' was 13; `tileMenu.test` left by ruling 34; `ls Core/Actions | grep -c Menu.test` → 18"* — 18 is the ruled figure and 18 is what the tree holds.

#### Requirement 8

*The editor takes an `EditorHost` object from its mounter; the pure model lives in `Core/MarkdownPM/Model`; the 41-file `Editor/` bin dissolves.*

**Delivered by:** Task 11 review `a9d737ab9` · Task 11 move `9dfe2e59f` · Task 14 `d4369bd2a` (comment killer `8afea4478`).

- `test ! -d Core/MarkdownPM/Editor` → exit 0; the bin is gone.
- `ls Core/MarkdownPM` → `Autocomplete Citations Embeds Engine Gestures Guards Input Links Menus Tables Widgets` plus `MarkdownEditor.tsx`, `api.ts`, `markdown-pm.css`, `markdown-tables.css` and the look code at the root.
- The pure model imports nothing from CodeMirror or React: `rg -l "from '@codemirror" Core/MarkdownPM/Engine` → 0 and `rg -l "from 'react'" Core/MarkdownPM/Engine` → 0.
- `rg -c 'EditorHost' Core/MarkdownPM/api.ts` → 2 (`wc -l` → 81 lines).
- `rg -l 'useSession' Core/MarkdownPM` → 0 · `rg -l 'window.nexus' Core/MarkdownPM` → 0 · the dialer's `host()` in MarkdownPM → 0 (`rg -o "(^|[^A-Za-z])host\(\)" Core/MarkdownPM` → 0; `rg -n 'Platform/dialer' Core/MarkdownPM` → 0). The 42 lines a naive `host()` search returns are `EditorHost`, `useEditorHost`, `buildEditorHost` and `testHost` — the host object's own vocabulary.
- `rg -l '_root' Core/MarkdownPM` → 1 file.

**Ruled outcome (two):** the pure model lives in `Engine/`, not `Model/` — ruling 16 (09-06-2026, Nathan) names the eleven subfolders and `Engine/` among them. The Verify line `rg -F "class .* extends WidgetType" Core/MarkdownPM` → "the table and embed widgets extend `ReactWidget`" resolves to 14 hits, not one: `rg -n 'extends WidgetType|extends ReactWidget' Core/MarkdownPM | wc -l` → 14, made up of eleven `extends WidgetType` — `Widgets/reactWidget.ts:10` (the `ReactWidget` base class itself) plus ten plain-DOM widgets (Reveal, Grip, ConnGlyph, Hr, Bullet, Checkbox, Line, CodeTag, OutlinerRail, CiteRef) — and three `extends ReactWidget` (two embed widgets, one table widget). Task 11's Deviations entry rules it: *"`extends WidgetType` is ten hits, not one — … the nine plain-DOM widgets … mount no React and stay on `WidgetType`"*. The count of plain-DOM widgets is ten, not nine; the ruling's substance — React widgets on one chassis, DOM widgets untouched — holds.

#### Requirement 9

*Removals at high confidence per F-2 and F-3, including every compatibility path for old on-disk shapes; six dead dependencies and the dead build config gone; the two write-path bugs fixed.*

**Delivered by:** Task 1 `ebed2f3aa` (dependencies, build config) · Task 4 `e004a49a7` (raw mode, the bare-Record reader) · Task 15 `f2db2a342` (the kill list) · Task 16 `4198404fd` (the write-path bugs).

- Compatibility paths: `rg -F 'sidecarMode' . -g '!node_modules' -g '!.claude/Planning/MonorepoAudit' -g '!.claude/HistoryPM.md' -g '!out' -g '!dist'` → 0. Control: `rg -F 'rmwJsonStrict' Core Desktop` → 39 lines.
- Dependencies: `rg -F '"pngjs"' */package.json package.json` → 0; the same for `"react-markdown"` → 0 and `"remark-gfm"` → 0.
- Dead build config: `rg -F 'vite.config.app' …` → 0 · `rg -F 'dist-app' …` → 0 (same exclusions).
- Duplicates: `rg -c 'function isPlainObject' Core UIX Desktop` → one definition, `Core/Properties/propertyValue.ts`. `rg -n 'export function splitFrontmatter' Core` → one definition, `Core/IO/pageFile.ts:32`.
- Bug 1 — the unlocked sidecar write: `rg -n 'withSidecarLock' Core/Nexus/remint.ts` → the import at :16 and the enclosing take at :102. Its red test stands at `Core/Nexus/remint.test.ts:319` — *"a container write held across the pass keeps both facts — the re-mint takes the sidecar lock"*.
- Bug 2 — `homepage.json` through one writer: `rg -F 'homepage.json' Core --glob '!*.test.*'` → 2 lines, `Core/Locations/paths.ts:62` (the path constant) and `Core/Assets/assetMigrate.ts:73` (a report label, not a path). Control: `rg -F 'updateNexusConfig' Core` → 9 lines.
- The three further bugs found in-run, each with its red test now in the suite: `Core/Nexus/page.test.ts:208` *"a value kind the schema has no shape for is refused, never a clear"*; `UIX/Interactions/tableDnd.test.tsx:159` *"a drop below the row the dragged one already follows is a no-op, not a slot above it"*; `Core/Pages/editorHost.test.ts:40` *"a host seated at mount renders a tile against the live connections"*.

**Ruled outcome:** the requirement says "the two write-path bugs"; five landed. Three were found during the run (Task 9's smoke, Gate 4's attack, the Task 12 lane) and routed to Task 16 through Open Against Later Tasks. `assetMigrate` and its `INVENTED` constant remain live — `rg -F 'assetMigrate' Core Desktop UIX` → 2 and `rg -F 'INVENTED' Core Desktop UIX` → 2 — by ruling 46 (09-06-2026, Nathan), which restored the asset-directory migration from `e004a49a^` with its thirteen tests and amended F-3 in the decision log. Three of the six dependencies the audit called dead (`@codemirror/lang-json`, `lang-yaml`, `legacy-modes`) are live through dynamic imports in `codeHighlight.ts` and stay, ruled at Task 1.

#### Requirement 10

*Tooling per G-1..G-7: npm workspaces, `exports` to source, UIX and Core as devDependencies of Desktop, Vitest projects, root Biome, no cross-workspace project references.*

**Delivered by:** Task 1 `ebed2f3aa` · Task 3 `30b897c9d` (Desktop gated early) · Task 8 `4f6a88982` (Desktop's own projects).

- `rg -n '"exports"' Core/package.json UIX/package.json` → one each.
- Desktop's manifest (`node -e` over `Desktop/package.json`): runtime `dependencies` are `chokidar electron write-file-atomic`; `@pommora/core` and `@pommora/uix` are both `devDependencies` — never runtime, as G-4 requires against electron-vite's externalization.
- `cat vitest.config.ts` → `test: { projects: ['UIX', 'Core', 'Desktop'] }` — a project per code-bearing workspace.
- `rg -n '"paths"' Core/tsconfig.json UIX/tsconfig.json Desktop/tsconfig.node.json Desktop/tsconfig.web.json Sync/tsconfig.json` → 0; `rg -n 'composite' …` over the same set → 0. No alias survives, no project reference runs.
- `npm run typecheck` → exit 0, running `tsc -p UIX && tsc -p Core && tsc -p Desktop/tsconfig.node.json && tsc -p Desktop/tsconfig.web.json` — four projects, one gate.

#### Requirement 11

*Docs reconciled per H-6: path citations and bare folder names swept; ArchitecturePM split into a Core map and a Desktop doc; Features tagged; stale claims corrected; CLAUDE.md Hard Rules restated; the Mobile plan's Task 0 and Phase 8 marked superseded with a path table.*

**Delivered by:** Task 18 `ffd56b07a` (the harness) · Task 19 `734baa799` · Task 20 `734baa799`, `9d2fb001e`.

- `test -f .claude/Features/CorePM.md` → present · `test -f .claude/Features/DesktopPM.md` → present · `test ! -f .claude/Features/ArchitecturePM.md` → absent.
- `rg -l '^\*\*Workspace:\*\*' .claude/Features | wc -l` → 19 of 19 Features docs carry the tag.
- `rg -F 'Main owns the filesystem' .claude/CLAUDE.md` → 0. Control: `rg -F 'Core/Platform' .claude/CLAUDE.md` → 1.
- The harness runs against the new roots: `python3 .claude/scripts/loc.py` prints nine areas and a total; `node .claude/scripts/check-atlas.mjs` → `16 atlas tables checked — all agree with source`, exit 0; `node .claude/scripts/comment-manifest.mjs` → `688 files · 2385 comment lines · 0 over the 20-line cap`; `node .claude/scripts/comment-ledger.mjs --verify` → `token streams identical — comments only`, exit 0.
- `ls .claude/Planning | grep -c Mobile` → 3 (the Mobile plan, its decision log, its research), all held by the never-delete list.

**Ruled outcome:** `rg -F 'Pommora/' .claude/scripts .claude/hooks .claude/settings.json` → 2, not 0. Both are in `.claude/scripts/loc.py`: `LEGACY_ROOT = "Pommora/src"` at :26 and its docstring at :164. Task 18's Deviations entry rules it: *"`loc.py` walks `Core UIX Desktop Showcase` plus the legacy `Pommora/src` root so `--rebuild`/`--history` keep 58 days of the chart (the Verify's `Pommora/` → 0 is therefore 2, both that root and its docstring — kept, reported)"*. Control: `rg -F 'UIX/' .claude/scripts/check-atlas.mjs` → 1.

#### Requirement 12

*Names per A-9: Interface, Locations, FileWatch, Platform, Actions/Menus/Actions, SidePane, no Primitives, MarkdownPM unchanged.*

**Delivered by:** Task 5 `7f8452c86` · Task 10 `48b23960e`.

- `test -d` on each: `Core/Interface` present · `Core/Locations` present · `Desktop/FileWatch` present · `Core/Platform` present · `Desktop/Platform` present · `Core/Actions` present · `Desktop/Actions` present · `UIX/Menus` present · `Core/Interface/SidePane` present · `Core/MarkdownPM` present.
- `test ! -d UIX/Primitives` → absent · `find Core UIX Desktop -type d -name Shell` → 0 · `test ! -d UIX/Canvas` → absent (retired at Task 5 when `TileGrid` proved to import six of Tiles' layout modules; A-9 records the retirement).
- `flavor` is gone as a word for a variant: `rg -i 'flavor' Core UIX Desktop .claude/Features` → 0. Control: `rg -F "kind: 'nav'" Core/Interface/Windows` → 2.

---

### The Acceptance Block

The plan's Acceptance sentence and Gate 5's checklist, line by line, each command run in this session.

| Acceptance line | Command | Output | Verdict |
| --- | --- | --- | --- |
| Four gates green from the root | `npm run typecheck` | exit 0 | ✔ |
| | `npm run test` | exit 0 · `Test Files 334 passed (334)` · `Tests 4050 passed (4050)` | ✔ |
| | `npm run lint` | exit 0 · `Checked 1065 files in 291ms. No fixes applied.` | ✔ |
| | `npm run build` | exit 0 · `✓ built in 2.71s` | ✔ |
| `from 'electron` only under `Desktop/` | `find Core UIX Desktop -name '*.ts*' \| xargs grep -l "from 'electron"` | 14 files, every one under `Desktop/` | ✔ |
| | `rg -l "from 'electron" Core UIX` | 0 | ✔ |
| `@pommora/core` in UIX → 0 | `rg -l "from '@pommora/core" UIX` | 0 | ✔ |
| `Pommora/` dissolved | `test ! -d Pommora` | exit 0 | ✔ |
| Six workspaces | root `package.json` workspaces | `UIX Core Desktop Mobile Sync Showcase` | ✔ |
| Showcase builds | `npm run build:showcase` | exit 0 · `✓ built in 1.76s` | ✔ |
| Test count reconciled | see below | 321 → 334, every change named | ✔ |
| Dead Vocabulary at zero | see below | zero against every control, three ruled notes | ✔ |
| Net line delta negative | both counters | −716 · −992 | ✔ |
| The built app opens a scratch Nexus, renders the tree, opens a page, saves an edit | not re-run here | recorded per task and gate (see below) | evidenced by record |

The fourteen files carrying `from 'electron`: `Desktop/Actions/appMenu.ts`, `Desktop/Actions/editorMenu.ts`, `Desktop/Actions/returningMenu.ts`, `Desktop/Actions/rowMenu.test.ts`, `Desktop/Actions/rowMenu.ts`, `Desktop/Bridge/ipc.ts`, `Desktop/Bridge/preload.ts`, `Desktop/Capture/thumbnails.ts`, `Desktop/FileWatch/watcher.test.ts`, `Desktop/FileWatch/watcher.ts`, `Desktop/Web/linkTitles.ts`, `Desktop/Web/webGuests.ts`, `Desktop/electron.vite.config.ts`, `Desktop/main.ts`.

**The behavior line.** The plan's Global Constraints set verification at one smoke launch per gate that touched runtime code, and each was run by the implementing agent and recorded in its Deviations entry — Task 6 (`1cceaae3e`: scratch Nexus rendered, `page:open` and `page:updateBody` round-tripped to disk, page restored), Task 7, Task 8, Task 9, Task 10, Task 11, Task 12, Task 13 (both presenters), Task 14 (every Verify item exercised), Task 15, and Gate 5 (`2053ee50e`: state open, tree rendered, the page body round-tripped and `cmp`-identical, a native `row-menu` resolved null on Escape). This document does not re-run a smoke launch; that line is carried on the record, and Nathan's own pass is the outstanding live confirmation.

#### Test-Count Reconciliation

`git diff --name-status --diff-filter=AD -M 7941edec HEAD -- '*.test.*'` returns 20 adds and 7 deletes.

**Deletes, each paired with the add that replaced it** (renames git lost across the range — the paths changed workspace, folder and in two cases name):

| Removed | Replaced by | Where it is named |
| --- | --- | --- |
| `Pommora/src/main/session.test.ts` | `Core/Nexus/session.test.ts` | Task 4 `e004a49a7` — `session` moves to `Core/Nexus` |
| `Pommora/src/shared/columnMenu.test.ts` | `Core/Actions/columnMenu.test.ts` | Task 3 `30b897c9d` — `columnMenu` → `Core/Actions` |
| `Pommora/src/renderer/Interface/Subfield/subfieldItems.test.ts` | `Core/Interface/Subfield/subfieldItems.test.ts` | Task 5 `7f8452c86` — the renderer moves |
| `Pommora/src/renderer/MarkdownPM/zoom.test.ts` | `Core/MarkdownPM/zoom.test.ts` | Task 5 `7f8452c86` |
| `Pommora/src/renderer/PommoraUIX/Tokens/colorMap.test.ts` | `UIX/Theme/colors.test.ts` | Task 12 `50eded4fb` — two color tests become one |
| `Pommora/src/renderer/PommoraUIX/Tokens/solidColor.test.ts` | *(same file)* | Task 12 `50eded4fb` |
| `Pommora/src/renderer/Tiles/TileCache.test.ts` | `Core/Pages/editorHost.test.ts` | Task 14 `d4369bd2a` — `tileCache` becomes the host's warm seam |

No removal is unnamed and no test was weakened. Four tests were deleted with their subjects inside Task 15 (`setProfileSubtitle` ×2, `skipTopLevel`, `allStructuralIds`), and twenty were deleted with theirs at Task 4 (`assetMigrate`'s thirteen — later restored whole under ruling 46 — raw mode's three, the bare-Record reader's three, `ExistState`'s one); those are case-level, not file-level, and are recorded in the Task 4 and Task 15 Deviations entries.

**Adds:** 20 total, of which 6 are the replacements named above (`Core/Actions/columnMenu.test.ts` among them); **14 are genuinely new** — eight menu-model tests under `Core/Actions` (`createMenu`, `entityMenu`, `gripMenu`, `identityMenus`, `navRowMenu`, `optionMenu`, `tabMenu`, `trashMenu`), three under `Core/Interface/Menus` (`RowMenuHost`, `connectionMenu`, `rowMenuRows`), `Core/MarkdownPM/Tables/cellAlias.test.tsx` (ruling 38), `Core/Platform/machine.test.ts` (Task 6's red-green), and `UIX/Interactions/reorderModel.test.ts` (Task 16's crossing pin). 8 + 3 + 1 + 1 + 1 = 14.

**Arithmetic:** 321 + 14 new − 1 (two color test files merged into one) = **334**. Case count 4,006 → 4,050.

#### Dead Vocabulary Sweep

| Token | Scope | Count | Control | Control count |
| --- | --- | --- | --- | --- |
| `@shared/` | `Core UIX Desktop Showcase` | 0 | `@pommora/core` | 716 |
| `@renderer/` | `Core UIX Desktop Showcase` | 0 | `@pommora/uix` | 671 |
| `window.nexus.` | `Core` outside `Core/Platform` | 0 | `window.nexus` in `Core/Platform` | 1 |
| `Pommora/src` | `.claude` registry (`CLAUDE.md`, Features, Guidelines, Context, Handoff, Framework) | 0 | `Core/` in `CorePM.md` | 15 |
| `PommoraUIX/` | `.claude/Features` | 0 | `UIX/Menus` in `PommoraUIX.md` | 3 |
| `renderer/Interface` | `.claude/Features` | 0 | — | — |
| `renderer/Actions` | `.claude/Features` | 0 | — | — |
| `renderer/Utilities` | `.claude/Features` | 0 | — | — |
| `src/shared` | `.claude/Features` | 0 | — | — |
| `flavor` (case-insensitive) | `Core UIX Desktop .claude/Features` | 0 | `kind: 'nav'` in `Core/Interface/Windows` | 2 |
| `sidecarMode` | repo, audit and History excluded | 0 | `rmwJsonStrict` | 39 |
| `vite.config.app` | same | 0 | — | — |
| `dist-app` | same | 0 | — | — |
| `react-markdown` | same | 0 | — | — |
| `pngjs` | same | 0 | — | — |
| The 23 retired menu channel names | `Core Desktop` | 0 as channels | `'row-menu'` | 20 |

**Three notes, each ruled:**

1. **`window.nexus.` control.** The Dead Vocabulary line asks for `window.nexus.` in `Core/Platform` ≥ 1, but the one reach in `Core/Platform/dialer.ts` is `return window.nexus` with no trailing dot, so the trailing-dot control string cannot match it. `rg -F 'window.nexus' Core/Platform` → 1. The intent — exactly one Core file naming the global, in Platform — is met. Ruled at Gate 5 `2053ee50e`.
2. **`Pommora/src` residue.** `git grep -l 'Pommora/src' 3e6c87ca5 -- .claude` returns **23 files** — the authoritative count, `rg` having silently skipped the five `.claude/Sessions/Session - *.md` transcripts. Fourteen are `Planning/MonorepoAudit` (thirteen reports plus `renderer-moves.tsv`) and the Mobile plan, both explicitly excluded by the rule; five are Sessions transcripts, also excluded; one is `.claude/scripts/loc.py` (2 hits), ruled at Task 18 to keep the chart's 58-day history. The remaining three are this run's own planning documents — the Implementation Plan, the Decision Log, and `Progress.html` — which cite the pre-move tree by design; the plan's own header states *"Citations name files and symbols as they stood at `7c7c7542`"*. The registry the sweep exists to protect is at zero. The same shape holds for `[[ArchitecturePM` links: `git grep -l '\[\[ArchitecturePM' 3e6c87ca5 -- .claude` → three files, all three the run's own planning documents; the Features, Guidelines, Context, Handoff and Framework docs carry none.
3. **`assetMigrate` and `INVENTED`.** Both live (2 hits each in `Core Desktop UIX`) by ruling 46, which restored the asset-directory migration with its thirteen tests; `INVENTED` is pinned by `assetMigrate.test.ts:68`. The Dead Vocabulary line already carries the correction in the plan.
4. **`'context-menu'`.** One literal survives, at `Desktop/Actions/editorMenu.ts` — Chromium's `WebContents` event name, not a bridge channel. Ruling 37 keeps the editor context menu native and whole.

---

### The Passes

**Landed.** Each hash below was confirmed present in the history in this session (`git log -1 --format='%h %s' <hash>`).

| Pass | Hash | What it was |
| --- | --- | --- |
| Gate 1 review | `90e2436b6` | one simplifier, dual-briefed, over the Phase 1 range |
| Gate 2 review | `de8c32b88` | two Opus reviewers (Core ops; Contract/Platform/Desktop) |
| Whole-tree simplification | `9c9b994e0` | Phase 4's stop taken early: three Opus simplifiers over exclusive folders, 39 files, −115 code lines — the run's first negative reading |
| Gate 3 review | `e25db9ea4` | one Opus code-simplifier over `de8c32b8..HEAD`, dual-briefed; the attack found zero bugs |
| Gate 4 review | `eba69edad` | one Opus code-simplifier over `e25db9ea..HEAD`, dual-briefed; one live regression found and ruled to Task 16 |
| Gate 5 review | `2053ee50e` | one Opus code-simplifier over the Phase 5 range; the Acceptance block walked line by line; the Phase 5 attack ran every question to a conclusion, zero bugs |
| Task 10 pre-move review | `d1e42e197` | two Opus agents by domain |
| Task 11 pre-move review | `a9d737ab9` | one Opus agent; comments 2,214 → 759 non-test lines |
| Task 10 comment killer | `3804eb52f` | before the Phase 3 move |
| Task 13 comment killer | `7b6a6ed13` | 515 → 233 comment lines before the collapse |
| Task 14 comment killer | `8afea4478` | 772 → 376 comment lines before the host landed |
| Closeout comment killer | `12f52789d` | Core, UIX and Desktop whole |

**The closeout comment killer, verified now.** `node .claude/scripts/comment-manifest.mjs` → `688 files · 2385 comment lines · 0 over the 20-line cap` — the cap is met with no exception. `node .claude/scripts/comment-ledger.mjs --verify` → exit 0, `token streams identical — comments only`, `cut 64,217 of 402,861 comment characters — 15.9%`. Markers survive: `KNOB` 149 occurrences on 147 lines (`rg -oF 'KNOB' Core UIX Desktop`), `LOAD-BEARING` 2, `(Nathan's call)` 1, and the three `// PLACEHOLDER` markers ruling 7 requires — `Core/Pages/PageMenu.tsx:86`, `Core/Views/Settings/HiddenFrame.tsx:62`, `Core/Views/Settings/ViewFrame.tsx:141`. (The closeout entry's "`// PLACEHOLDER` 7" counts the bare string `PLACEHOLDER`, which also matches the four `SEARCH_PLACEHOLDER` identifier lines in `UIX/Fields/SearchField`; the three ruled markers are all present and unchanged.)

**Still ahead.** Two passes the closeout order names and this document precedes:

- [ ] **The attack** — `build-breaking-agent` on Opus over the whole range `7941edec..HEAD`, verified findings fixed with red tests.
- [ ] **The closeout simplification** — `code-simplifier` on Opus over the whole tree, the delta staying negative.

A neutral verification of this document sits between them in the ruled order.

---

### Deviations and Open Items

Every ruling made at a commit that changed a Becomes, and every open item carried forward. One line each.

**Rulings that changed a Becomes**

- **Task 1 —** the `exports` map is the object form (`{ "./*": { "types": [".ts",".tsx","*"], "default": "./*" } }`); the bare array typechecks but Vite resolves no `.tsx`, which the spike caught.
- **Task 2 —** `LegacyApi` counted 3 rather than 2 (dialer.ts's own import); `composite` dropped from both Pommora tsconfigs on TS6307.
- **Task 3 —** Desktop became a gated workspace early because `editorMenu.test.ts` moved there whole; `clamp` was restored as a module after inlining read worse at 28 sites.
- **Gate 1 —** the root `tsconfig.json` deleted as inert (Requirement 1's "one root TypeScript file" is therefore unmet by ruling).
- **Task 4 —** the SQLite stores moved whole into `Core/Store`/`Core/Index` rather than splitting interface from body, because splitting before the seam existed would have made five Core domains import Desktop; Task 6 owns the split.
- **Task 5 —** `UIX/Canvas` retired (the tile grid imports six Tiles layout modules and is Core's); the kit's four helpers sit in `UIX/Utilities`; one UIX→Core edge held until Task 13.
- **Task 6 —** the lock stays refuse-on-re-take (its existing tests pin it) rather than the Becomes' "re-entrant"; `Machine.writeRaw` landed with no Core caller; Core tests keep `node:` for fixtures.
- **Task 7 —** the promised 145 lines did not materialize: `host().ask('chan', …)` is wider than a leaf and 68 files gained an import.
- **Task 8 —** `HostContext` is far wider than the sketch (eighteen members) because forty-odd channels are Electron-only; `machine`/`kv` are omitted from it since Core reaches both through installed globals; no Contexts or Index handler map, no channel being theirs.
- **Task 9 —** no `Core/Properties/governed/` folder: the governed code is flat in Properties; the thirteen thin arms stay two-to-five-line cases rather than thirteen logic-free modules; the three frontmatter writers became `setGovernedRootKeys`.
- **Task 10 —** `PagePropertyRows` is a discriminated union and the window panel's rows accept the ruled convergence (they lose the 40% label column, the value hover chip, and the group fill); stylesheets stayed in their Views subfolders, the domain-root rule being MarkdownPM's shape.
- **Task 11 —** the pure model is `Engine/`, not `Model/` (ruling 16); the `header?: ReactNode` slot and `api.ts` deferred to Task 14 because the slot would delete eight public props and break the `--header-zone` observer; `extends WidgetType` stands at eleven hits (the `ReactWidget` base plus ten plain-DOM widgets) rather than one; `Core/Connections/scan.ts` stays on `codeMask` to avoid a Connections → MarkdownPM → Connections cycle.
- **Task 12 —** the one color file is `UIX/Theme/colors.ts`, a `.ts` rather than a `.css.ts`, because vanilla-extract serializes every export and throws on a function and the main process reads `WINDOW_BG` from it; `ALL_ICONS` stays Lucide-only (ruling 24); the kit barrels `Menus/index.ts`, `PickerControl/index.ts` and `Theme/index.ts` stay as public entry points; `SortableZone.layout` removed at 15 sites, not nine.
- **Task 13 —** no `useMenuPresenter()` hook (ruling 31 leaves it no in-app case on desktop and ten of the 37 sites are outside React); `presentRowMenu` is a `chromeSlice` action, not a module singleton, under the locked no-global-client-state rule; object-shaped actions became strings, the one channel carrying `string | null`; `checked` became a checkbox item everywhere with no `radio` flag; `Desktop/Bridge` holds no channel literal by construction, so that Verify control cannot be met there.
- **Task 14 —** `renderTile(tile: TileMount)` rather than `(range)` (the tiles need editing/locked/ancestors/onBeginEdit/visible/zoom); `menus.format?` and `glance?` optional because the history window is inert; `linkTitles.resolve(url): void` since the store's resolver is fire-and-forget and the editor reads through `subscribe`; `menus.gripHot(hot)` added, the native menu's stand-down having no path; `EmbedHost.self` removed.
- **Task 15 —** the target was missed: **−255 against a −550 target**, because the audits' high-confidence lists had already been consumed by Tasks 3–14 and the simplification pass — the tree holds no fully dead export (0 of 2,854), no orphan source file, no dead CSS class, no dead dependency. Kept with reasons rather than bought for the number: `splitAtTile`/`tileIds`/`validateLayout`, `decorationsFor`/`parseTable`, `closeSession` and `sessionDb()`/`sessionVersionsDb()`, `restoreScrub` as a sweep call, the sidecar/order layering and `holdersOf`, the single-consumer pure-logic view files, 26 dead emitted typography classes, and the `chrome.ts`/`viewRow.ts` filing.
- **Task 16 —** the plan's two write-path bugs became five, the three extras found in-run and each landed red-first; five single-writer `writeJson` sites left unlocked with reasons.
- **Task 17 —** `TileLab` is a blank stage (`Showcase/Leaves/TileLab.tsx`, five lines): every symbol it used is `Core/Tiles`' by the 09-05 ruling, moving them to UIX would reverse that ruling, and retiring the leaf would breach the never-delete list. Nathan's call, filed in ContextPM.
- **Task 18 —** `loc.py` keeps a legacy `Pommora/src` root so `--rebuild`/`--history` retain 58 days of chart, which is why its `Pommora/` count is 2 rather than 0.
- **Tasks 19–20 —** Gate 5's review covers only the Phase 5 range, the closeout's attack and simplification covering the whole run, so no range is reviewed twice.

**Open items carried to `.claude/ContextPM.md`** (each verified present in that document in this session)

- `showError` versus `notifyError` — two error surfaces stand side by side and neither was made the other's (Open Calls).
- `ActionItem.confirm` is write-only — two `optionMenu` rows set it, no presenter reads it; it stays by ruling 35 (Open Calls).
- `RowMenuHost` has no desktop caller — `Desktop/main.ts` wires `HostContext.menu` to the native popper unconditionally, so about 110 lines are the phone's seat and unreachable today (Open Calls).
- `ALL_ICONS` stays Lucide-only — folding the 23 named Tabler glyphs in would add uncurated tiles to the Icon Picker (Open Calls).
- TileLab shows a blank stage (Open Calls).
- Five single-writer `writeJson` sites run unlocked — `Nexus/identity.ts`, `Properties/journalSlot.ts`, `Trash/record.ts`, `Nexus/adopt.ts`, `Contexts/contextsRegistry.ts`; the registry's seed-on-absent write is the one real double-seed window, benign under most-recent-wins (Known Issues).
- `page:open` does not raise the window — opening is not focusing (Known Issues).
- Native separators reach the host on Windows, and the five ex-radio menu groups draw a check rather than a bullet there (Known Issues).
- `NativePickerContext` does not cross `reactWidget`'s detached roots — latent, nothing under a widget mounts a `PickerControl` today (Known Issues).
- The line counter counts test harnesses as product code — about 300 lines across `editorHarness.ts`, `pointerHarness.ts`, `testTree.ts`, `propsAtRoot.ts`, `pageValues.ts` (Known Issues).

---

### Not Done

Stated plainly, each verified in this session.

- **Nathan's own pass has not happened.** The plan's Completion Criteria require a day on the real Nexus and a flip through the three workspaces. It is the sole entry under Immediate Work in `.claude/ContextPM.md`.
- **Two closeout passes are still ahead of this document:** the attack over `7941edec..HEAD`, and the closeout simplification over the whole tree. Neither has run; no hash exists for either.
- **Task 15 fell short of its target** — −255 code lines against a −550 target, with the reason recorded above. The run's overall delta is negative on both counters regardless, so the mandate holds; the task's own number does not.
- **Requirement 1's root TypeScript file does not exist.** `test -f tsconfig.json` → absent, ruled at Gate 1 as inert. A reader checking Requirement 1 literally will find this line unmet.
- **The four bare-reply `:get` channels were promised to ContextPM and are not there.** Gate 5's Deviations entry says the finding is *"pre-existing, filed in ContextPM's Known Issues at closeout"*; `rg -n 'citations:get|linkTitles:get|activeViews:get|aliases:get' .claude/ContextPM.md` → no output. The channels themselves are real: `Core/Contract/bridge.ts:63,81,83,234` declare `activeViews:get`, `citations:get`, `aliases:get` and `linkTitles:get` with bare reply types (`Record<…>`, not the `Result` envelope), so a main-side throw would be stored by `set()` as data. The filing is outstanding.
- **Three Verify lines cannot be met as written** and carry rulings rather than fixes: `rg -F "'row-menu'" Desktop/Bridge` → 0 (Task 13: the Bridge iterates the handler map and holds no literal); `rg -l "from 'node:" Core` → 69 rather than 0 (Task 6: Core's tests keep `node:` for fixtures; production is 0); `rg -F 'sessionRoot()' Core/Properties` → 4 rather than 0 (Task 9: no `governed/` folder exists, and the reads sit in the handler layer).
- **The behavior line of the Acceptance sentence was not re-run for this document.** Every smoke launch it names was run by the implementing agent at its task or gate and recorded in the Deviations entries; this session ran the four gates and the greps, not the app.
