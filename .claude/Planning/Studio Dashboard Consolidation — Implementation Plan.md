## Studio Dashboard Consolidation — Implementation Plan

**DATE:** 10-13-2026
**STATUS:** Draft
**SOURCE:** The 10-13-2026 "Studio dashboard consolidation" session — Nathan's rulings and the recon of all three dashboards.

**BASELINE**

| Repo | Head | Tests | Start | End |
|------|------|-------|-------|-----|
| The Studio | `6391622` | — | | |
| Pommora | `84e26b529` | | | |
| Sapphire | `8e264233` | | | |

### Context

Three dashboards exist today:

- **Studio:** `~/The Studio/.claude/dashboard/` is a single vanilla page, `studio-dashboard.html`, about 980 lines. It shows Claude Code usage from `studio-dashboard.json`, which `studio-dashboard.py` writes from the daily `~/.claude/scripts/auto-push.sh`. The Vercel project `studio-dashboard` serves that folder from The Studio's `active` branch with no build. `.github/studio-repo.py` leaves `dashboard` out of `main`.
- **Pommora:** `Dashboard/` is a Vite and React workspace built on Pommora's UIX. It has the line ledger, the codebase audit, and the Showcase, with a glass corner menu switching between them. It deploys as its own Vercel project from Pommora's `active`, and its data is imported at build time from files the pre-commit hook regenerates.
- **Sapphire:** `.claude/scripts/sapphire-dashboard.{html,css,js,mjs}` is a hand-port of Pommora's ledger view. It's published to a Claude artifact by a background Haiku that post-commit launches.

The two ledger writers, `pommora-dashboard.mjs` (untracked, from an unfinished refactor) and `sapphire-dashboard.mjs`, share their engine and differ only in configuration.

Recon established the constraints below:

- **Vercel can't build the site.** It can't see Pommora: The Studio tracks only `.claude/`, and `Projects/` is gitignored.
- **One symlinked install builds and typechecks the site.** A Studio folder that symlinks Pommora's `node_modules` builds in about 3 seconds and typechecks cleanly. It ends up with exactly one React copy, the patched liquid-glass, and the `@pommora/uix` workspace link, with no install of its own.
- **One shared, header-driven ledger engine reproduces both writers.**

### Overview

Everything lands in `~/The Studio/.claude/dashboard/`:

- **The app:** one Vite app with four views behind Pommora's glass corner menu: Claude Code, Pommora, Sapphire, and Theme & UIX.
- **Built on the Mac:** the app is compiled locally into a committed `site/` folder. Vercel keeps serving static files, and two rewrites point `/` at the build.
- **Runtime data:** every view fetches its data from `data/` when it opens, so data never needs a rebuild.
- **One shared post-commit, `sync.mjs`, run by every repo:**
  - It pushes `active`.
  - It measures the repo's ledger with the shared engine `ledger.mjs` and that repo's file in `projects/`, and copies Pommora's audit.
  - It rebuilds `site/` only when the site's inputs changed.
  - It commits `data/` and `site/` in The Studio. The Studio's own copy of the hook pushes that commit.

The Claude Code page is rebuilt in React over UIX and the promoted ledger primitives. The Code card's lines, files, commits and pushes are cut, and so are the always-empty Languages card and reply-time stat. Pommora's `Dashboard/`, Sapphire's dashboard scripts and artifact, and every hook, config, script and doc line that served them are removed. The only dashboard trace left in each project is a one-line `post-commit`.

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `node_modules` • Symlink | Committed relative symlink to Pommora's install; the site's only dependency source. | `~/The Studio/.claude/dashboard/` |
| `package.json` • File | `{"name": "studio-dashboard", "private": true}`. vanilla-extract needs the name to scope class names. | `.claude/dashboard/` |
| `vite.config.ts`, `tsconfig.json`, `index.html` • Files | The site's build. Output goes to `site/`, the dev cache to `.vite/`, and the dev server may read Pommora's files. | `.claude/dashboard/` |
| `site/` • Folder | The committed build output that Vercel serves. | `.claude/dashboard/` |
| `data/` • Folder | Runtime data: `claude-code.json`, `pommora.json`, `pommora-audit.md`, `sapphire.json`. | `.claude/dashboard/` |
| `ledger.mjs` • Script | The shared line-ledger engine: measures a commit's tree per area, day by day, into a header-declared group set. | `.claude/dashboard/` |
| `projects/` • Folder | One module per repo: `pommora.mjs`, `sapphire.mjs`, `studio.mjs`, each declaring its ledger configuration, rebuild paths, and copies. | `.claude/dashboard/` |
| `sync.mjs` • Script | The post-commit body every repo runs. | `.claude/dashboard/` |
| `hooks/post-commit` • Git hook | The Studio's own post-commit, reached through The Studio's `core.hooksPath`. | `.claude/dashboard/` |
| `README.md` • Doc | The dashboard's single doc: views, data, the ledger, the hook, and building. | `.claude/dashboard/` |
| `groups` • Ledger header field | `[{ key, label, kind: 'subset' \| 'extra' \| 'band' }]`, from which the view derives its include menu. | `data/*.json` |
| `ClaudeCode` • View | The Claude Code page, rebuilt over UIX. | `src/claude-code/` |
| `ProjectView`, `LedgerView` • Components | Fetch a project's ledger (and audit), then render it for any project. | `src/ledger/` |
| `Tooltip`, `tip()` • Component, helper | The single cursor-following glass tooltip, shared by every chart. | `src/shared/Tooltip.tsx` |
| `SortTable` • Component | The single sortable table, shared by every table. | `src/shared/SortTable.tsx` |
| `Swatch`, `Track`, `Stat` • Components | Shared legend swatch, share bar, and stat tile. | `src/shared/ui.tsx` |
| `useData` • Hook | Fetches a data file with `no-store`. | `src/shared/useData.ts` |
| `MenuDoor`, `MenuDoorHost` • Component | Installs UIX's menu door, so `PickerControl` opens its menu outside the Pommora app. | `src/shell/MenuDoor.tsx` |
| `usePick` • Hook | A remembered selection, validated against its options and backed by `localStorage`. | `src/claude-code/usePick.ts` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `Dashboard/` • Workspace | The whole workspace, including its `vercel.json`, README, `package.json`, `dist/` and `node_modules/`. Its code moves to The Studio. | Pommora |
| `pommora-dashboard.mjs` • Script | Untracked; its logic moves into `ledger.mjs` and `projects/pommora.mjs`. | Pommora `.claude/scripts/` |
| `loc.py`, `comment-ledger.mjs`, `comment-manifest.mjs`, `comment-baseline.json`, `comment-units.json`, `pommora-commit-map.txt` • Files | Already staged for deletion. | Pommora `.claude/scripts/` |
| `dashboard-published`, `dashboard-data-published`, `showcase-published` • Files | Stale republish stamps. | Pommora `.git/` |
| `.claude/scripts/` • Folder | All of it: the four dashboard files, `loc-history.json`, and the README. | Sapphire |
| `pre-commit` • Git hook | Its only job was the ledger. | Sapphire `.claude/hooks/` |
| `dashboard-publish.log` • File | The last artifact-publish log. | Sapphire `.git/` |
| Sapphire Dashboard • Artifact | `https://claude.ai/artifact/5Drmysjup8Ta96vp4Vj332`. | claude.ai |
| `studio-dashboard.html` • Page | Replaced by `ClaudeCode`. | `.claude/dashboard/` |
| `meta_stats()`, `meta` • Collector function, JSON key | Lines, files, commits and pushes, cut by Nathan. Languages and reply time are always empty, because `~/.claude/usage-data/session-meta` doesn't exist. | `studio-dashboard.py` |
| `Filters`/`FILTER_ROWS`/`DEFAULT_FILTERS` (fixed shape), `LedgerLeaf` • Types, component | Replaced by groups derived from the ledger header, and by `LedgerView`. | moved ledger code |

#### Constraints

- **Gates:**
  - **Studio site:** run these from `~/The Studio/.claude/dashboard`:
    - `node_modules/.bin/tsc -p .` (exit 0)
    - `node_modules/.bin/vite build` (prints `✓ built`)
  - **Pommora:** `npm run typecheck`, `npm test`, and `npm run lint`.
  - **Sapphire:** `npm run build` and `npm test`.
  - "Run the gates" means the gates of every repo the task touched.
- **Never Delete:**
  - Pommora's `UIX/` and `check-atlas.mjs`.
  - `.claude/Planning/Pommora Codebase Audit.md`.
  - Pommora's other `.claude/scripts/` entries: `editor-parity/`, both `live-drive` folders, and `README.md` itself.
  - `studio-dashboard.py`, `accounts.json`, and `plan.json`.
  - The Studio's `.claude/hooks/no-name-mentions.mjs`.
  - Any branch, worktree, or git history. The `bench-fp` worktrees and the `benchmark-branch`, `current/mac` and `swift` branches stay as they are.
  - Other sessions' work: Pommora's untracked `Open In Preview Rules — Implementation Plan.md`, and anything another session stages.
- **Kept for History:**
  - Pommora's `.github/workflows/clean-main.yml` keeps `--path Dashboard/`. The workflow rewrites `main` from all of `active`'s history, and old commits still contain `Dashboard/`.
  - The Pommora ledger's `classify` keeps skipping `Dashboard` and `Showcase` for the same reason.
- **Never Run npm There:** never run `npm install`, `npm ci`, or `npx` in `.claude/dashboard`. npm reconciles the symlinked install against the empty `package.json` and deletes 513 of Pommora's packages. Vite is always called as `node_modules/.bin/vite`.
- **Commits:**
  - Commit only by explicit pathspec in all three repos (`git commit -- <paths>`). Other sessions are active in Pommora.
  - Commit messages are past tense and one to two sentences.
  - Nathan edits every `CLAUDE.md` himself.
- **Shape:** removal. The inventory is *§Concepts › REMOVED* plus the per-task edit lists, and the never-delete list is above. The ledger rebuild is checked against a frozen oracle, and old and new must agree row for row.

#### Process Overview

- [ ] **Phase 1** — Studio Site Foundation
  - [ ] Task 1-1 Scaffold and symlink
  - [ ] Task 1-2 Shell and moved views
  - [ ] Task 1-3 Ledger engine, project configs, and the generalized view
  - [ ] Task 1-4 `sync.mjs` and The Studio's hook
  - [ ] Task 1-5 The `view-changes` kit on the same symlink
  - [ ] Review Checkpoint
- [ ] **Phase 2** — Claude Code View
  - [ ] Task 2-1 Shared modules, adopted by Ledger and Audit
  - [ ] Task 2-2 The model
  - [ ] Task 2-3 Charts
  - [ ] Task 2-4 Sections and page
  - [ ] Task 2-5 Collector output and cuts
  - [ ] Review Checkpoint
- [ ] `[Stop: Nathan looks over the local site before the cutover]`
- [ ] **Phase 3** — Cutover and Teardown
  - [ ] Task 3-1 Studio cutover
  - [ ] Task 3-2 Pommora teardown
  - [ ] Task 3-3 Sapphire teardown
  - [ ] Task 3-4 Delete the Sapphire artifact
  - [ ] Review Checkpoint

---

### Phase 1 — Studio Site Foundation

**GOAL:** The merged site builds and runs locally from The Studio. It has the shell, the moved Pommora views, both ledgers generalized from their headers, and the shared hook in place but not yet wired into the projects. Vercel keeps serving the old page until Phase 3, so nothing here is live.

#### Task 1-1

**TASK:** Scaffold the site in `~/The Studio/.claude/dashboard/` on Pommora's install.

**NOW:** The folder holds the vanilla page, its JSON, the collector, `accounts.json`, `plan.json`, `vercel.json`, and `.vercelignore`. `.claude/launch.json` (untracked) serves the folder with `python3 -m http.server 8745`.

**CHANGE**

- [ ] `ln -s "../../Projects/Project Pommora/node_modules" node_modules`. It's tracked, mode 120000; the gitignores already allow it.
- [ ] Write `package.json`, `tsconfig.json`, `vite.config.ts`, and `index.html` as in *AFTER*.
- [ ] Add `dashboard/.vite/` to `~/The Studio/.claude/.gitignore`.
- [ ] Point `.claude/launch.json`'s `studio-dashboard` entry at `node_modules/.bin/vite --port 8745`, with `cwd` set to `.claude/dashboard`.

**AFTER**

```.claude/dashboard/package.json
{ "name": "studio-dashboard", "private": true }
```

```.claude/dashboard/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'

// Built against Pommora's own install through the node_modules symlink; the dev server may read its files.
export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  cacheDir: '.vite',
  build: { outDir: 'site' },
  server: { fs: { allow: ['.', '../../Projects/Project Pommora'] } },
})
```

```.claude/dashboard/tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

```.claude/dashboard/index.html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Studio Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```.claude/.gitignore diff
 # Rebuilt from Pommora's UIX on demand.
 scripts/view-changes/kit/dist/
+
+# The dashboard's dev cache.
+dashboard/.vite/
```

**VERIFY**

- [ ] `readlink node_modules` prints the relative path, and `node_modules/.bin/vite --version` runs.
- [ ] `git check-ignore -v .claude/dashboard/node_modules` exits 1, and `git check-ignore .claude/dashboard/.vite/x` exits 0.

#### Task 1-2

**TASK:** Move the shell, Showcase, and Audit into `src/`, and route four views by hash.

**NOW:** Pommora's `Dashboard/` has two views: an empty hash shows the Dashboard, and a leaf id shows the Showcase. Audit imports `audit.md?raw` at build time.

**CHANGE**

- [ ] Copy these from Pommora's `Dashboard/` into `src/`, unchanged unless listed below:

  | From | To |
  |---|---|
  | `main.tsx` | `main.tsx` (imports `./base.css`) |
  | `dashboard.css` | `base.css` |
  | `CornerMenu.tsx`, `shell.css.ts`, `useHashRoute.ts` | `shell/` |
  | `Leaves/*`, `showcase.css` | `showcase/` |
  | `Surfaces/` | `showcase/Surfaces/` |
  | `Audit/*` except `audit.md` | `audit/` |
  | `Ledger/*` except `loc-history.json` | `ledger/` (generalized in Task 1-3) |

  Fix every relative import the move breaks.
- [ ] Audit takes its source as a prop. `ProjectView` (Task 1-3) passes the fetched text.

  ```src/audit/Audit.tsx diff
  -import source from './audit.md?raw'
  ...
  -function parse(): Load {
  +function parse(source: string): Load {
  ...
  -const load = parse()
  ...
  -export function Audit(): React.JSX.Element {
  +export function Audit({ source }: { source: string }): React.JSX.Element {
  +  const load = useMemo(() => parse(source), [source])
  ```
- [ ] Rewrite `App.tsx` with the routing in *AFTER*.
  - `#` or anything unrecognized shows Claude Code.
  - `#pommora` and `#sapphire` show the ledgers.
  - `#uix/<leaf>` shows Theme & UIX. An unknown leaf, or `#uix` alone, falls back to `LEAVES[0]`.
  - The right-side leaf menu renders only on `uix`.
  - `ClaudeCode` is created in Phase 2. Until then the `''` route renders nothing.

**AFTER**

```src/App.tsx
import { Audit } from './audit/Audit'
import { ClaudeCode } from './claude-code/ClaudeCode'
import { ProjectView, PROJECTS } from './ledger/ProjectView'
import { MenuDoorHost } from './shell/MenuDoor'
import { CornerMenu } from './shell/CornerMenu'
import { setHashRoute, useHashRoute } from './shell/useHashRoute'
import { Tooltip } from './shared/Tooltip'
import { LEAVES, SECTIONS } from './showcase/registry'
import './showcase/showcase.css'

const VIEWS = [
  { route: '', label: 'Claude Code', icon: 'terminal' },
  { route: 'pommora', label: PROJECTS.pommora.name, icon: PROJECTS.pommora.icon },
  { route: 'sapphire', label: PROJECTS.sapphire.name, icon: PROJECTS.sapphire.icon },
  { route: 'uix', label: 'Theme & UIX', icon: 'swatch-book' },
] as const

export function App(): React.JSX.Element {
  const [head, sub] = useHashRoute().split('/')
  const view = VIEWS.find((v) => v.route === head) ?? VIEWS[0]
  const leaf = LEAVES.find((l) => l.id === sub) ?? LEAVES[0]

  return (
    <>
      <CornerMenu
        side="left"
        title="View"
        icon={view.icon}
        label={view.label}
        groups={[VIEWS.map((v) => ({ key: v.label, label: v.label, icon: v.icon, picked: v === view, onPick: () => setHashRoute(v.route) }))]}
      />
      {view.route === 'uix' && (
        <CornerMenu
          side="right"
          title="Leaves"
          icon={leaf.icon}
          label={leaf.label}
          groups={SECTIONS.map((sec) =>
            LEAVES.filter((l) => l.section === sec.id).map((l) => ({
              key: l.id, label: l.label, icon: l.icon, picked: l === leaf, onPick: () => setHashRoute(`uix/${l.id}`),
            })),
          )}
        />
      )}
      {view.route === 'uix' ? (
        <main>{leaf.render()}</main>
      ) : view.route === '' ? (
        <ClaudeCode />
      ) : (
        <ProjectView key={view.route} project={PROJECTS[view.route]} />
      )}
      <Tooltip />
      <MenuDoorHost />
    </>
  )
}
```

`ProjectView` is keyed by route, so moving between ledgers resets zoom and filters. Imports of modules from later tasks (`ClaudeCode`, `Tooltip`, `MenuDoorHost`) are added when those tasks create them.

**VERIFY**

- [ ] Every Showcase leaf renders at `#uix/<id>` in the dev server. The glass leaf shows its photos, and the browser console has no errors.
- [ ] Old leaf links (`#colors`) fall back to the Claude Code route.
- [ ] Run the gates.

#### Task 1-3

**TASK:** Merge the two ledger writers into `ledger.mjs` plus per-repo configs, write each ledger's `groups` into its header, and render any project's ledger from its header.

**NOW:**
- **Two writers:** `pommora-dashboard.mjs` (untracked, 304 lines) and `sapphire-dashboard.mjs` (310 lines) duplicate one engine (`countLines`, `measureRev`, `history`, `update`, `rebuild`).
- **Per-repo differences:** measured roots, area maps, legacy prefixes, colors, `classify` and `areaOf`. Sapphire also has the `reg` group and the legacy `styles.css` split.
- **Pre-commit measuring:** both measure the index (`git write-tree`) in pre-commit and date rows by wall clock.
- **Hardcoded categories:** `ledgerModel.ts` hardcodes `io`, `brackets`, `css`, `comments` and `tests`, so Sapphire's `reg` would silently vanish.

**CHANGE**

- [ ] **Freeze the oracles first:**
  - `cp "Projects/Project Pommora/Dashboard/Ledger/loc-history.json"` (the staged version) to the scratchpad as `oracle-pommora.json`.
  - `cp Projects/Sapphire/.claude/scripts/loc-history.json` to `oracle-sapphire.json`.
- [ ] **Write `ledger.mjs`**, the engine both writers share, ported verbatim apart from the changes below. It exports:
  - `IO`, `BRACKETS`, `CSS`, `COMMENTS`, `TESTS`: the built-in group descriptors.
  - `update(project, root)` and `rebuild(project, root)`.
  - A CLI: `node ledger.mjs <project> [--rebuild]` uses `project.root`.

  The changes:
  - **Group-driven samples:** `countLines(text, style, rel, groups)` assigns each code line to the first matching disjoint group, in this order: `io`, then `css` (stylesheet lines), then `br`, then any project subset group with a `match(line, rel)`. `SERIES_KEYS` is `['v', ...groups.map((g) => g.key)]`.
  - **Header:** `header()` writes `groups` as `{ key, label, kind }`.
  - **Measure `HEAD`:** `update()` measures `HEAD` and takes the row's date from `git log -1 --format=%ad --date=short HEAD`, the same author date `history()` uses.
  - **Census order:** a file joins the source/tests/config count before the area check. This is Sapphire's order; Pommora's config returns `null` from `classify` for skipped prefixes and generated files.
  - **No ledger yet:** a missing ledger file triggers a rebuild.
  - **Output:** the ledger goes to `data/<project.ledger.file>`.
- [ ] **Write `projects/pommora.mjs`** with `name: 'Pommora'` and:
  - `root`: `~/The Studio/Projects/Project Pommora`.
  - `rebuild: ['UIX', 'package-lock.json']`.
  - `copies: [['.claude/Planning/Pommora Codebase Audit.md', 'pommora-audit.md']]`.
  - `ledger`: `file: 'pommora.json'`, plus `measured`, `areas`, `order`, `areaOf` and `classify` taken from `pommora-dashboard.mjs`, with `SKIP_PREFIX` kept. Its groups are `[IO, BRACKETS, CSS, COMMENTS, TESTS]`.
- [ ] **Write `projects/sapphire.mjs`** with `name: 'Sapphire'`, `root` (`~/The Studio/Projects/Sapphire`), `rebuild: []`, and:
  - `ledger.file: 'sapphire.json'`, plus `measured`, `CONFIG`, `areas`, `order`, `areaOf` (with test mirroring) and `classify`.
  - **`expand(rel, text)`:** the legacy `styles.css` split. It builds its style-line map from the `HEAD` tree it extracted, not from the working tree.
  - **Groups:** `[IO, BRACKETS, CSS, REG, COMMENTS, TESTS]`. `REG` is `{ key: 'reg', label: 'Registration', kind: 'subset', match: (line, rel) => rel === 'src/main.ts' || REGISTRATION.test(line) }`.
- [ ] **Write `projects/studio.mjs`:** `{ name: 'The Studio', root: '~/The Studio', rebuild: ['.claude/dashboard/src', '.claude/dashboard/index.html', '.claude/dashboard/vite.config.ts', '.claude/dashboard/package.json'] }`, with the paths resolved through `homedir()`.
- [ ] **Run** `node ledger.mjs pommora --rebuild` and `node ledger.mjs sapphire --rebuild`.
- [ ] **Generalize `ledgerModel.ts`** as in *AFTER*. `sum`, `fmt` and `dayLabel` stay until Task 2-1 moves them.
- [ ] **Rename `LedgerLeaf.tsx` to `LedgerView.tsx`:**
  - It takes `{ ledger, project }`.
  - The include menu maps `ledger.groups`, and the filters start at `defaultFilters(groups)`.
  - The heading uses `project.icon` and `project.name`, and the strings "system", "Per system", "System" and "Whole app" become `project.noun` and `project.whole`.
  - `LedgerChart` takes a `label` prop in place of its hardcoded "Pommora's" `aria-label`.
- [ ] **Write `ledger/ProjectView.tsx`:** `PROJECTS` plus a component that `useData`s the ledger (and Pommora's audit), then renders `LedgerView`, followed by `Audit` when there is one. Create `src/shared/useData.ts` here.

**AFTER**

```src/ledger/ledgerModel.ts diff
-export type Sample = { d: string; v: number[]; io: number[]; br: number[]; css: number[]; c: number[]; t: number[] }
+export type Group = { key: string; label: string; kind: 'subset' | 'extra' | 'band' }
+export type Sample = { d: string; v: number[]; [group: string]: string | number[] }
 export type Ledger = {
   areas: string[]
   colors: string[]
+  groups: Group[]
   series: Sample[]
   files: number[]
   kinds: Record<string, number>
 }
-export type Filters = { io: boolean; brackets: boolean; css: boolean; comments: boolean; tests: boolean }
-export const DEFAULT_FILTERS: Filters = { ... }
-export const FILTER_ROWS = [ ... ]
+export type Filters = Record<string, boolean>
+export const defaultFilters = (groups: Group[]): Filters => Object.fromEntries(groups.map((g) => [g.key, g.kind === 'subset']))
-const COMMENTS: Band = { name: 'Comments', color: vars.color.label.tertiary }
+const lines = (s: Sample, g: Group): number[] => s[g.key] as number[]
+const banded = (groups: Group[], f: Filters): Group[] => groups.filter((g) => g.kind === 'band' && f[g.key])
+// An excluded subset leaves `v`; an included extra joins it.
+const sign = (g: Group, on: boolean): number => (g.kind === 'subset' ? (on ? 0 : -1) : g.kind === 'extra' && on ? 1 : 0)

-export function bands({ areas, colors }: Ledger, f: Filters): Band[] {
-  const own = areas.map((name, k) => ({ name, color: colors[k] }))
-  return f.comments ? [...own, COMMENTS] : own
+export function bands({ areas, colors, groups }: Ledger, f: Filters): Band[] {
+  const own = areas.map((name, k) => ({ name, color: colors[k] }))
+  return [...own, ...banded(groups, f).map((g) => ({ name: g.label, color: vars.color.label.tertiary }))]
 }

-export function stacked(s: Sample, f: Filters): number[] {
-  const own = s.v.map((v, k) => v - (f.io ? 0 : s.io[k]) - (f.brackets ? 0 : s.br[k]) - (f.css ? 0 : s.css[k]) + (f.tests ? s.t[k] : 0))
-  return f.comments ? [...own, sum(s.c)] : own
+export function stacked(s: Sample, groups: Group[], f: Filters): number[] {
+  const own = s.v.map((v, k) => groups.reduce((n, g) => n + sign(g, f[g.key]) * lines(s, g)[k], v))
+  return [...own, ...banded(groups, f).map((g) => sum(lines(s, g)))]
 }
```

```src/ledger/ProjectView.tsx (shape)
export type Project = { name: string; icon: string; noun: string; whole: string; ledger: string; audit?: string }

export const PROJECTS = {
  pommora: { name: 'Pommora', icon: 'pommora', noun: 'system', whole: 'Whole app', ledger: '/data/pommora.json', audit: '/data/pommora-audit.md' },
  sapphire: { name: 'Sapphire', icon: 'hexagon', noun: 'domain', whole: 'Whole plugin', ledger: '/data/sapphire.json' },
} satisfies Record<string, Project>
```

**VERIFY**

- [ ] **Oracle diff:** for each project, after removing `groups` from the new header, every row of the oracle except the latest date matches the rebuilt `data/*.json` exactly, and so does the header. A mismatch is a porting error to fix, not a result to accept.
- [ ] Sapphire's include menu shows Registration, and toggling it changes the total. Pommora's menu shows no Registration.
- [ ] `#pommora` renders the ledger and the audit. `#sapphire` renders the ledger only. Switching between them resets zoom.
- [ ] Run the gates.

#### Task 1-4

**TASK:** Write `sync.mjs` and The Studio's post-commit, and point The Studio at it.

**NOW:** The Studio has no git hooks. Each project's post-commit pushes `active` itself, and Sapphire's also launches the artifact publish.

**CHANGE**

- [ ] Write `sync.mjs` and `hooks/post-commit` as in *AFTER*, and make both executable.
- [ ] `git -C ~/"The Studio" config core.hooksPath .claude/dashboard/hooks`.

**AFTER**

```.claude/dashboard/sync.mjs
#!/usr/bin/env node
// Every Studio repo's post-commit: pushes active, carries the commit's dashboard data into The Studio,
// rebuilds the site when its inputs changed, and commits both there; that commit's own hook pushes The Studio.
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { update } from './ledger.mjs'

const DASH = dirname(fileURLToPath(import.meta.url))
const STUDIO = join(DASH, '..', '..')
const OUT = ['.claude/dashboard/data', '.claude/dashboard/site']
const project = (await import(`./projects/${process.argv[2]}.mjs`)).default
const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim()

const root = git(process.cwd(), 'rev-parse', '--show-toplevel')
const gitDir = git(root, 'rev-parse', '--absolute-git-dir')
const replaying = ['rebase-merge', 'rebase-apply', 'MERGE_HEAD'].some((p) => existsSync(join(gitDir, p)))
if (replaying || git(root, 'branch', '--show-current') !== 'active') process.exit(0)

const step = (label, run) => {
  try {
    run()
  } catch (err) {
    console.error(`dashboard: ${label} failed: ${String(err.message).split('\n')[0]}`)
  }
}

step('push', () => git(root, 'push', '-q', 'origin', 'active'))
if (project.ledger) step('line ledger', () => console.log(`line ledger: ${update(project, root)}`))
for (const [from, to] of project.copies ?? []) step(`copy ${to}`, () => copyFileSync(join(root, from), join(DASH, 'data', to)))
step('site build', () => {
  if (project.rebuild.length && git(root, 'diff', '--name-only', 'HEAD^', 'HEAD', '--', ...project.rebuild))
    execFileSync(join(DASH, 'node_modules/.bin/vite'), ['build', '--logLevel', 'warn'], { cwd: DASH, stdio: 'inherit' })
})
step('studio commit', () => {
  git(STUDIO, 'add', '-A', '--', ...OUT)
  if (git(STUDIO, 'diff', '--cached', '--name-only', '--', ...OUT))
    git(STUDIO, 'commit', '-q', '-m', `Dashboard followed ${project.name} ${git(root, 'rev-parse', '--short', 'HEAD')}.`, '--', ...OUT)
})
```

```.claude/dashboard/hooks/post-commit
#!/bin/sh
exec node "$HOME/The Studio/.claude/dashboard/sync.mjs" studio
```

How the loops close:
- **A project commit** pushes the project, then commits `data/` (and `site/` if it rebuilt) in The Studio. That commit runs The Studio's hook, which finds no source change, commits nothing, and pushes The Studio. Its first step is the push, so `sync.mjs` pushes The Studio's `active` there.
- **A Studio commit that touches `src/`** rebuilds and commits `site/`. That commit's hook then pushes.
- **The daily `auto-push.sh` commit** runs the hook too. Nothing rebuilds, and the hook pushes, which duplicates auto-push's own harmless push.

**VERIFY**

- [ ] **Studio source commit:** make a throwaway one-line edit to a `src/` file and commit it. `site/` is rebuilt and committed by the hook, `origin/active` matches local `active`, and `git log -2` shows the source commit, then "Dashboard followed The Studio …". Revert the edit afterwards; the revert commit rebuilds `site/` back.
- [ ] **Data-only commit:** commit something that touches only `data/` and confirm no build runs.
- [ ] **Branch gate:** `git checkout -b scratch-hook` in a throwaway Studio worktree, commit there, and confirm the hook exits without pushing. Then remove the worktree and the branch.

#### Task 1-5

**TASK:** Move the `view-changes` kit onto the same symlink, so there's one way of reaching Pommora.

**NOW:** `scripts/view-changes/kit/vite.config.mjs` reaches Pommora through `createRequire`, plus `@pommora/uix` and `react` aliases and `dedupe`. `view-changes.py:225` runs Pommora's Vite with `cwd=pommora`. Its comment says the kit renders "exactly what the Dashboard does".

**CHANGE**

- [ ] `ln -s "../../../../Projects/Project Pommora/node_modules" .claude/scripts/view-changes/kit/node_modules`.
- [ ] Rewrite the kit config: plain imports, keeping only the `allSymbols` stub alias, `define`, and `build`.
- [ ] `view-changes.py` runs `kit/node_modules/.bin/vite build --config kit/vite.config.mjs` with `cwd=kit`.

**AFTER**

```.claude/scripts/view-changes/kit/vite.config.mjs diff
-import { createRequire } from 'node:module'
-import { homedir } from 'node:os'
 import { dirname, join } from 'node:path'
 import { fileURLToPath } from 'node:url'
+import { defineConfig } from 'vite'
+import react from '@vitejs/plugin-react'
+import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'

-// Pommora's own UIX, theme, and liquid glass, resolved from its checkout so the kit renders exactly what the Dashboard does.
-const POMMORA = join(homedir(), 'The Studio/Projects/Project Pommora')
-const need = createRequire(join(POMMORA, 'package.json'))
-const { defineConfig } = need('vite')
-const react = need('@vitejs/plugin-react').default
-const { vanillaExtractPlugin } = need('@vanilla-extract/vite-plugin')
+// Pommora's own UIX, theme, and liquid glass, through the node_modules symlink to its install.
 const here = dirname(fileURLToPath(import.meta.url))
-const mod = (name) => join(POMMORA, 'node_modules', name)
 ...
   resolve: {
-    alias: [
-      { find: '@pommora/uix', replacement: join(POMMORA, 'UIX') },
-      { find: /^\.\/allSymbols$/, replacement: join(here, 'icon-set-stub.ts') },
-      { find: /^react-dom(\/.*)?$/, replacement: `${mod('react-dom')}$1` },
-      { find: /^react(\/.*)?$/, replacement: `${mod('react')}$1` },
-    ],
-    dedupe: ['react', 'react-dom'],
+    alias: [{ find: /^\.\/allSymbols$/, replacement: join(here, 'icon-set-stub.ts') }],
   },
```

**VERIFY**

- [ ] `rm -rf kit/dist` and run `/view-changes` on a small range. The kit rebuilds, and the page renders its glass corner and switcher.
- [ ] `grep -c 'ReactCurrentOwner\|__CLIENT_INTERNALS' kit/dist/kit.js` shows one React runtime.

#### Review Checkpoint

- [ ] Both oracle diffs are clean.
- [ ] The site builds, typechecks, and serves every route with a clean console.
- [ ] `sync.mjs` behaved as described in all three Task 1-4 checks.
- [ ] The kit builds.
- [ ] Commit Phase 1 in The Studio (`git commit -- .claude/dashboard .claude/.gitignore .claude/scripts/view-changes`).

---

### Phase 2 — Claude Code View

**GOAL:** The Claude Code page is rebuilt in React over UIX with full functional parity, minus Nathan's cuts. `studio-dashboard.html` at the baseline head is the behavioral spec for every section, and it stays in the tree until Task 3-1. The primitives it shares with the ledger and audit are promoted once and adopted by all three views.

#### Task 2-1

**TASK:** Promote shared modules, and have Ledger and Audit adopt them.

**NOW:**
- **Ledger:** owns `sum`, `fmt`, `dayLabel`, a top-pinned tooltip (`LedgerChart.tsx:118–126, 206–226`), a swatch and share bar (`ledger.css:209–214, 293–305`), and a fixed per-area table.
- **Audit:** owns `Stat` (`Overview.tsx:78–85`).
- **Menus:** UIX's `PickerControl` opens its menu through a module-level door that only Pommora's `Core` installs (`Core/Interface/mount.tsx:19`).

**CHANGE**

- [ ] **`src/shared/format.ts`:**
  - `sum` and `fmt` (moved from the ledger).
  - `money`, `dollars`, `count`, `pct`, `titled`, `prettyModel`, ported from `studio-dashboard.html:325–349`.
- [ ] **`src/shared/dates.ts`:**
  - `parseDay`, `ymd`, `mdy`, `md`, `clock`, `stamp`, `hourName`, `addDays`, `weekStartOf` and `DAYS`, ported from `studio-dashboard.html:339–350`.
  - `dayLabel` is deleted, and its callers use `md(parseDay(d))`, which returns the same "Jul 5".
- [ ] **`src/shared/Tooltip.tsx`:**
  - A `channel<Tip | null>` store, using UIX `Utilities/subscribable`.
  - One `<Tooltip/>`: fixed position, follows the cursor on both axes at a 14px offset, and flips at the viewport edges like vanilla `place()` (`html:370–376`).
  - `tip(content)` returns `{ onPointerEnter, onPointerMove, onPointerLeave }`.
  - `Tip = { title: string; rows: [label: string, value: string, color?: string][]; total?: [string, string] }`.
  - A document `pointerdown` clears it.
  - Styling is the vanilla glass tip (`html:224`), using UIX variables. `LedgerChart` drops its own tip and uses `tip()` on its hover columns.
- [ ] **`src/shared/ui.tsx`:**
  - `Swatch({ color })`, `Track({ value, color })` and `Stat({ value, label })`.
  - The ledger's swatch and bar, and Audit's `Stat`, switch to these.
- [ ] **`src/shared/SortTable.tsx`:**
  - Columns are `{ key, label, r?, text?, wrap?, value(row), cell(row) }`, with an optional `tip(row)` per row.
  - Sorting works like the vanilla `table()` (`html:432–450`):
    - A new column sorts text ascending and numbers descending.
    - Clicking the same column flips it.
    - Nulls go last.
    - `aria-sort` is set on the header.
    - The chevron fades in on hover and turns for ascending.
  - Sort state lives in the component.
  - The ledger's per-area table becomes a `SortTable`, with the Whole row pinned below the body.
- [ ] **`src/shared/shared.css`:** `.panel` (vanilla `.card`: radius 12, `--surface-primary`, `--border-base`, `container-type: inline-size`), plus the tip, swatch, track, stat and table classes. The ledger and audit CSS drop their duplicates.
- [ ] **`src/shell/MenuDoor.tsx`:**
  - `setMenuDoor` resolves a pending `{ rows, trigger, resolve }`.
  - `MenuDoorHost` renders one always-mounted `PickerMenu` with `MenuItem picked={checked ? 'solo' : undefined}` rows, the same way `CornerMenu` does.

**VERIFY**

- [ ] The ledger hover shows the shared tip with the same rows as before, and the per-area table sorts.
- [ ] Audit's stat strip looks unchanged.
- [ ] `grep -rn "dayLabel\|lg-tip\|FILTER_ROWS" src` finds nothing.
- [ ] Run the gates.

#### Task 2-2

**TASK:** Port the page's data model to `src/claude-code/model.ts`.

**NOW:** `studio-dashboard.html:520–660` derives everything from `S` in loose functions.

**CHANGE**

- [ ] **Types:**
  - `Stats` covers every top-level key except `meta`.
  - `Day` covers `date`, `sessions`, `prompts | null`, `cost`, `tokens`, `output`, `estimated`, `models`, `model_tokens`, `roles`, `accounts`, `kinds`, `kind_cost`, `contexts`, and `late?: Partial<Day>`.
- [ ] **`derive(S)`:** ported one-for-one, returning the following:
  - `today` comes from `S.generated`.
  - `byDay`, `firstOf`, `valueOn`, `known`, `merge`, `usageOf` and `change`.
  - The plan-week set:
    - A typed recursive `minus`.
    - `lateOf`: `row.late`, or the whole row when it's estimated and the reset falls before noon.
    - `earlyOf`, `planWeek`, `activeIn`, `windowStart`, `weekBuckets` and `sameSpan`.
  - `PERIODS`: Day, Week, Month and Total, each with `title`, `range`, `now`, `prior`, `vs` and `buckets`, exactly as in `html:600–613`.
  - The colors:
    - `MODELS` sorted by all-time cost.
    - Family colors from `vars.color.solid.{lavender, blue, pink, brown}`, with a tint step for each later version via `mixAt`.
    - `ramp(i)` over the accent steps, the role ramp, and the account colors.
- [ ] **Null handling:** the Total headline and KPIs use plain sums. Comparisons, sparklines and buckets use `known`.

**VERIFY**

- [ ] **Value check:** a scratch script in the dev console prints these for the live `data/claude-code.json` from both the old page and `derive`, and they're identical:
  - Each period's `now`, `prior` and `change` for cost, sessions, prompts and tokens.
  - The latest 12 `weekBuckets` costs.
  - `activeIn` for the latest 4 weeks.
- [ ] Run the gates.

#### Task 2-3

**TASK:** Build the chart set in `src/claude-code/charts/`, which has no UIX counterpart.

**NOW:** The vanilla page builds rings, donuts, the calendar, the heatmap, bars, lines, sparklines and bar lists as SVG strings (`html:380–520`).

**CHANGE**

- [ ] **`svg.ts`:** `path`/`areaOf`, which break the line into runs at nulls, plus `labelEvery` and `axis`.
- [ ] **`Donut.tsx`:**
  - `Arc` is a circle with a dasharray, rotated −90°.
  - `Ring`:
    - The tone is error at 90% or more, orange at 70% or more, and accent otherwise.
    - A null percent shows "—" with no arc.
    - The grow animation plays once, under `prefers-reduced-motion: no-preference`, keyed by the reading's label.
  - `Donut`:
    - Shows parts above 0, with a 2px gap capped at 0.3 of the length.
    - The total and a sub-label sit in the center, and the legend shows name, value and percent.
    - Hovering an arc or a legend row dims the others to `--state-inactive`.
- [ ] **`HeatGrid.tsx`:** the Days calendar and the 7×24 Hours grid.
  - `levels()` cuts at quantiles 25, 50, 75 and 92% of the positive values. `shade()` gives level 0 `--fill-tertiary` and levels 1–5 accent tints from quinary to solid.
  - Cell outlines: an estimated day is dashed, a no-data day is faint.
  - Month labels de-collide from the right. Days rows show Mon, Wed, Fri and Sun; hours label every 3 or 6 hours.
  - On mount the calendar scrolls fully right.
  - `Scale` is a Less-to-More legend with a tooltip for each level. The Days view adds Estimated and No Data keys.
- [ ] **`Bars.tsx`:** compact period buckets (no axis, highlighting the current bucket) and weekly bars with an axis, stacked by `MODELS` for cost and tokens.
- [ ] **`LineChart.tsx`:** the daily chart. It has three gridlines, a dashed trailing 7-day average that skips nulls, and a crosshair plus a dot that hides on null. With `compact`, it's the 240×36 sparkline with a hit area for each bucket.
- [ ] **`BarList.tsx`:**
  - `BarList` shows name, track and value. Its mix-row form shows swatch, name, track, percent, count and dollars, and drops the track below 480px of container width.
  - `StackBar` gives each segment at least 3px.
- [ ] **Width:** every width-driven chart measures its host with a `ResizeObserver` (`useWidth(ref)`), using the vanilla sizes (`html:973–977` and the per-chart widths).
- [ ] **Shared pieces:** all charts use `tip()`, `Swatch` and `Track`.

**VERIFY**

- [ ] Every chart renders on `data/claude-code.json` at 1400px, 900px and 375px widths, with tooltips matching the vanilla rows.
- [ ] Run the gates.

#### Task 2-4

**TASK:** Assemble the page's sections in `src/claude-code/`.

**NOW:** `html:245–315` lays out eight sections, with 13 segmented controls and 5 dropdowns.

**CHANGE**

- [ ] **`usePick.ts`:** `usePick(key, options, fallback)` validates the stored value against `options` and wraps every `localStorage` access in try/catch. It keeps all 14 vanilla keys.
- [ ] **Controls:**
  - Segmented controls are UIX `Segmented size="button-medium"`.
  - Dropdowns are UIX `PickerControl`. Two options toggle in place; three or more open through the menu door.
- [ ] **`ClaudeCode.tsx`:**
  - `useData('/data/claude-code.json')` loads the data, then `derive` runs. Nothing renders on failure.
  - The header is an inline `ClaudeMark` (the SVG path from `html:246`) followed by "Claude Code Statistics".
  - It mounts the sections in order.
- [ ] **`Overview.tsx`:**
  - **Period card:** title, range, hero, delta, stats and buckets.
  - **Plan Limits card:**
    - It's rendered with `hidden` when no account has readings, so `.span-7:has(+ [hidden])` still widens the period card.
    - The account switch appears only when more than one account has readings.
    - It has the rings, the meta line, and "Resets in" counted against `generated`.
  - **KPI strip:** Sessions, Prompts, Tokens and Per Prompt.
  - **Pies:** Cost by Model, Tokens by Model, Cost by Role (with the "Logged" sub-label) and Cost by Account.
- [ ] **`Activity.tsx`:**
  - Days and Hours views, with Prompts, Cost, Tokens or Sessions as the metric.
  - **Rhythm:** current and longest streak, active days, weekend share, busiest day, and peak hour.
- [ ] **`Trends.tsx`:**
  - **Daily:** range of 30, 60 or 90 days or All Time.
  - **Weekly.**
  - **Weeks table:** 8, 12 or all weeks. The current week's change compares against `sameSpan`.
- [ ] **`Tokens.tsx`:**
  - Token Mix.
  - Context Ranges: scope Subagents or Main Session. Weekly % appears only when every account has `week`, and `ranges` is optional.
  - The Models table.
- [ ] **`Breakdowns.tsx`:**
  - Subagents (top 10), Tools (top 12, `mcp__` stripped, `__` shown as " › "), and Skills (prefix stripped).
  - Projects: a donut plus a table.
  - **Session Health**, as one full-width card. Its stats are Tool Calls, Tool Success, Compactions, Median Size at Compaction, Interruptions, and one "From VS Code / Desktop / CLI" stat per `entries` row.
  - Costliest Sessions.
- [ ] **`claude-code.css`:** vanilla `html:67–240`, minus the `:root` tokens, `.seg`, `.picker`, `.menu` and `.tip`, which UIX and `shared.css` now provide.
  - Keep the 12-column grid with spans 4, 5, 7 and 8.
  - Keep the breakpoints at 1100, 1000, 900 and 680px.
  - Keep the container queries at 560, 520, 480 and 320px.
- [ ] **Not carried over:** the Code card, the Languages card, and Median Reply Time.

**VERIFY**

- [ ] **Behavioral parity:** in the browser pane, serve the old page (`python3 -m http.server` over the baseline file with a copy of `claude-code.json` as `studio-dashboard.json`) beside the new route. For every control, confirm the numbers, the tooltips and the remembered selection after a reload match, except for the cut items.
- [ ] At 375px there's no horizontal page scroll, and the calendar scrolls inside its card.
- [ ] Run the gates.

#### Task 2-5

**TASK:** Point the collector at `data/` and remove what the page no longer shows.

**NOW:** `studio-dashboard.py:15` writes `studio-dashboard.json` beside itself, `:244–259` collects `meta`, and `:549` emits it.

**CHANGE**

- [ ] `git mv studio-dashboard.json data/claude-code.json`.
- [ ] Apply the *AFTER* changes. `meta_stats()` is deleted whole; its `statistics` import stays because `collect` still uses it.

**AFTER**

```.claude/dashboard/studio-dashboard.py diff
 """Collect Claude Code usage statistics from the local logs into studio-dashboard.json beside this script, which the
~"""Collect Claude Code usage statistics from the local logs into data/claude-code.json, which the
 dashboard page reads. plan.json, when present, holds a live plan-limit reading a Claude session took for one account."""
...
-OUTPUT = os.path.join(HERE, "studio-dashboard.json")
+OUTPUT = os.path.join(HERE, "data", "claude-code.json")
...
-def meta_stats():
-    ...
-
...
         "sessions_top": top[:15],
-        "meta": meta_stats(),
         "skills": skill_stats(),
```

**VERIFY**

- [ ] `python3 studio-dashboard.py` rewrites `data/claude-code.json` without `meta`, keeps its estimated-day ledger (the pruned days are still present), and the page renders from it.
- [ ] Run the gates.

#### Review Checkpoint

- [ ] The Task 2-4 parity walk is complete. Every deviation from the old page is either one of Nathan's cuts or recorded in *§Deviations*.
- [ ] `grep -rn "meta\b\|lines_added\|languages" src studio-dashboard.py` finds nothing related to the cut fields.
- [ ] Commit Phase 2 in The Studio. The hook rebuilds `site/`.

---

### Phase 3 — Cutover and Teardown

**GOAL:** Vercel serves the new site. Every repo's post-commit runs `sync.mjs`, and everything that served the three old dashboards is gone. Each repo lands in one commit, the projects only after The Studio is live.

#### Task 3-1

**TASK:** Switch Vercel to the new site, remove the old page, and write the dashboard README.

**NOW:** `vercel.json` rewrites `/` to `studio-dashboard.html`, and `.vercelignore` lists `studio-dashboard.py`, `accounts.json` and `plan.json`.

**CHANGE**

- [ ] `git rm studio-dashboard.html`.
- [ ] Rewrite `vercel.json` and `.vercelignore` as in *AFTER*.
- [ ] Write `README.md`. Overview level, it covers:
  - The four views and their routes.
  - The `data/` files and who writes each.
  - The ledger engine, each project's area semantics (carrying over the prose of Sapphire's *§Domains* and Pommora's ledger paragraph), and the groups header.
  - The hook flow and The Studio's `core.hooksPath`.
  - Building: `node_modules/.bin/vite` only, with the warning never to run npm here.
  - Local dev through `launch.json`.

**AFTER**

```.claude/dashboard/vercel.json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/", "destination": "/site/index.html" },
    { "source": "/assets/:path*", "destination": "/site/assets/:path*" }
  ],
  "ignoreCommand": "git diff --quiet HEAD^ HEAD ./"
}
```

```.claude/dashboard/.vercelignore
/*
!site
!data
!vercel.json
```

**VERIFY**

- [ ] Commit, and let the hook push. When the Vercel deploy finishes, the production URL serves all four routes.
- [ ] `/accounts.json`, `/plan.json`, `/package.json`, `/src/main.tsx` and `/studio-dashboard.py` return 404.
- [ ] `/data/claude-code.json` returns 200.

#### Task 3-2

**TASK:** Wire Pommora to `sync.mjs`, and remove its dashboard.

**NOW:**
- **Unfinished refactor:** Pommora's working tree holds it. `loc.py` and five companions are staged for deletion, `pommora-dashboard.mjs` is untracked, and the pre-commit, the scripts README and `Dashboard/README.md` have unstaged edits.
- **Hooks:** pre-commit refreshes the ledger and audit into `Dashboard/` and runs `check-atlas.mjs`. Post-commit resets those paths and pushes.

**CHANGE**

- [ ] **Hooks:** rewrite them as in *AFTER*.
- [ ] **Remove the dashboard:**
  - `git rm -r Dashboard`, then `rm -rf Dashboard` to clear its untracked `dist/` and `node_modules/`.
  - `rm .claude/scripts/pommora-dashboard.mjs`.
  - `rm .git/dashboard-published .git/dashboard-data-published .git/showcase-published`.
- [ ] **`package.json`:**
  - Drop `"Dashboard"` from `workspaces`, drop the `dashboard` and `build:dashboard` scripts, and drop `&& tsc -p Dashboard` from `typecheck`.
  - Move `patch-package` from `UIX/package.json` devDependencies back to the root devDependencies. It went into UIX only for Vercel's partial install.
- [ ] **Lockfile:** run `npm install` at Pommora's root to regenerate `package-lock.json`. This prunes `node_modules/@pommora/dashboard`.
- [ ] **`biome.json:16`:** drop `"!Dashboard/Ledger/loc-history.json"`.
- [ ] **`.claude/scripts/editor-parity/worktree.sh:14`:** drop `dashboard:Dashboard`.
- [ ] **`.claude/scripts/README.md`:**
  - Replace the `pommora-dashboard.mjs` and ledger section (`:3–23`) with one sentence: the post-commit runs The Studio's `sync.mjs`, documented in `~/The Studio/.claude/dashboard/README.md`.
  - Rewrite the hook and `hooksPath` paragraph (`:76–87`) to match the two hooks below.
  - Keep the `check-atlas` paragraph.
- [ ] **Docs:**
  - `.claude/Guidelines/Development-Environment.md:41`: "all seven tsconfig projects" becomes six, and `build:dashboard` is dropped.
  - `.claude/Guidelines/Development-Environment.md:47`: the ledger and audit now go to The Studio's dashboard through post-commit.
  - `.claude/Features/PommoraUIX.md:6`: the Showcase now lives in The Studio's dashboard as Theme & UIX.
- [ ] **UIX comments:**
  - `UIX/Windows/windowBounds.ts:4`: drop the showcase-replica clause, since only Settings consumes it.
  - `UIX/Theme/ramp.ts:174`: "such as the showcase" becomes "such as The Studio's dashboard".
- [ ] **Commit with explicit pathspecs:** every path above plus the six staged deletions. Leave the other session's untracked plan and anything else another session has staged.

**AFTER**

```.claude/hooks/pre-commit
#!/bin/sh
# Git pre-commit hook: re-check the token atlas against the tree being committed.

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$ROOT" || exit 0

node .claude/scripts/check-atlas.mjs || echo "token ledger: drift above — the Features SOURCE tables disagree with the code" >&2
exit 0
```

```.claude/hooks/post-commit
#!/bin/sh
exec node "$HOME/The Studio/.claude/dashboard/sync.mjs" pommora
```

**VERIFY**

- [ ] **The teardown commit's own post-commit runs `sync.mjs`:**
  - Pommora's `active` is pushed.
  - `data/pommora.json` gains the commit's row.
  - `site/` rebuilds, since `package-lock.json` changed.
  - The Studio gets "Dashboard followed Pommora …" and pushes.
- [ ] `git grep -n "Dashboard/\|loc-history\|pommora-dashboard\|build:dashboard"` finds only the kept `clean-main.yml` line, plans, and history.
- [ ] Run the gates.

#### Task 3-3

**TASK:** Wire Sapphire to `sync.mjs`, and remove its dashboard.

**NOW:** `.claude/scripts/` holds only the dashboard. Pre-commit writes and stages the ledger. Post-commit resets it, pushes, and launches the Haiku publish.

**CHANGE**

- [ ] `git rm -r .claude/scripts .claude/hooks/pre-commit`.
- [ ] `rm .git/dashboard-publish.log`.
- [ ] Rewrite `.claude/hooks/post-commit` as in *AFTER*.
- [ ] Commit by explicit pathspec.

**AFTER**

```.claude/hooks/post-commit
#!/bin/sh
exec node "$HOME/The Studio/.claude/dashboard/sync.mjs" sapphire
```

**VERIFY**

- [ ] The teardown commit's post-commit pushes Sapphire's `active` and updates `data/sapphire.json`. The Studio gets "Dashboard followed Sapphire …", and no Claude process starts (`pgrep -f "claude -p"` is empty).
- [ ] `git grep -n "dashboard\|loc-history\|artifact"` finds no hits about the dashboard.
- [ ] Run the gates.

#### Task 3-4

**TASK:** Delete the Sapphire Dashboard artifact, which Nathan approved on 10-13-2026.

**CHANGE**

- [ ] `Artifact` `action: "delete"` on `https://claude.ai/artifact/5Drmysjup8Ta96vp4Vj332`.

**VERIFY**

- [ ] `Artifact` `action: "list"` no longer shows it.

#### Review Checkpoint

- [ ] On the production URL, `#sapphire` shows the Sapphire commit from Task 3-3 as today's row, and `#pommora` shows Task 3-2's.
- [ ] Each repo's working tree is clean of this plan's paths.
- [ ] Nathan has deleted the `pommora-dashboard` Vercel project; that one is his.

---

### Completion Criteria

- **Conformance:** One mechanism reaches Pommora (the symlink, shared by the site and the kit), one engine measures every ledger, and one hook body serves every repo. Nothing changed outside the paths this plan names.
- **Correctness:**
  - The live site serves all four views.
  - A commit in any project shows up on the live site within one deploy, without anyone running anything.
  - The ledgers match their oracles.
  - The Claude Code page matches the old page apart from the cuts.
- **Completeness:**
  - Every *§Concepts › REMOVED* item is gone.
  - Each project's only dashboard trace is its one-line post-commit.
  - The Studio's `dashboard/` holds no leftovers from the old page.
- **Confirmation:** every VERIFY ran and its output was read. The parity walk and the oracle diffs are recorded.
- **Continuity:** *§Reconciliation* has been walked, and each `CLAUDE.md` line is handed to Nathan.
- **Confidence:** all gates are green in all three repos from a clean state. The delta is reported.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. That means doing the laundry, folding it, picking up what fell out of the hamper, and emptying the lint trap, so no trace is left that anything went wrong.

- Nothing is carried as a concern.
- Nothing is deferred where the fix is known.
- Nothing is declared that wasn't watched happen.

Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

- [ ] Phase review (opus-high): Phase 1 · Phase 2 · Phase 3
- [ ] Simplification lens → adversarial lens (opus-high), over the baseline-to-HEAD range of all three repos
- [ ] Neutral verification (opus-high), over the same ranges
- [ ] Own pass: gates · diff · deviations · criteria
- [ ] Reconciliation walked
- [ ] Report delivered

#### Reconciliation

**Pommora**

- `.claude/CLAUDE.md:28`: "`Dashboard/` builds the Vercel-hosted Pommora Dashboard… The commit hooks keep it current". **Nathan.**
- `.claude/CLAUDE.md:116`: the `// Dashboard` tree row. **Nathan.**
- `.claude/Guidelines/Development-Environment.md:41, 47`: seven tsconfigs, `build:dashboard`, and the pre-commit folding the ledger into the Dashboard. **Task 3-2.**
- `.claude/Features/PommoraUIX.md:6`: "builds as the standalone showcase page in `Dashboard/`". **Task 3-2.**
- `.claude/scripts/README.md:3–23, 76–87`: the dashboard writer, the hook pair and `hooksPath`. **Task 3-2.**
- `UIX/Windows/windowBounds.ts:4` and `UIX/Theme/ramp.ts:174`: the showcase mentions. **Task 3-2.**

**The Studio**

- `.claude/scripts/view-changes/view-changes.py:9, 32`: `Dashboard` in the default excludes and the docstring. **Task 1-5.** The exclude is dead once Pommora has no `Dashboard/`.
- `.claude/skills/adversarial-review/evals/worktree.sh:11`: `Dashboard` in the workspace loop. **Task 3-2.**
- `.claude/scripts/view-changes/kit/vite.config.mjs`: "exactly what the Dashboard does". **Task 1-5.**

**Sapphire**

- Sapphire `.claude/scripts/README.md`: deleted in Task 3-3. Its domain prose moves into the dashboard README in Task 3-1.

#### Open Items

- Nathan deletes the `pommora-dashboard` Vercel project.

#### Deviations
