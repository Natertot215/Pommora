## Glance Pane — Implementation Plan

> **Status:** ratified — in execution · Spec: [[Glance Pane — Decision Log]] · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

At the end, `renderer/Links/` no longer exists. The hover-preview surface is `renderer/Interface/Glance/GlancePane.tsx`, raised through an import-free seam `renderer/Interface/Glance/glanceAction.ts` that takes any anchor element and a page or site target and owns the per-host dwell table, the dwell timer, the anchor watch that keeps a glance standing while the content view scrolls, and the presenter slot. The pane itself resolves the page, restores focus to whatever held it, and keeps its own bounded warm store. MarkdownPM is one host of that seam rather than its owner. The three link helpers live in `renderer/Actions/`. Every code identifier that said "preview" and meant the floating window says "window"; every one that meant the hover surface says "glance". Nothing the user reads or that sits on disk changes.

The shape follows the decision log: the pane stays on the PickerMenu chassis (the canonical anchored surface) with one small stylesheet for the rules PickerMenu cannot express; the seam stays a leaf because the pane renders `PageTile`, which reaches into MarkdownPM; the dwell moves into the seam as a per-call delay so a future host can set its own; the `glance` hook on `ConnectionsApi` survives as a hook because `armable()` reads its presence and that is what stops a glance from glancing its own body. Disk words and UI copy stay "Preview" by Nathan's ruling, which removes every migration and coerce from the plan.

Not solved here: any new glance host (sidebar, tabs, view rows), blur-close, the floating windows' own behavior, any on-disk or settings-file word.

**Requirements**

1. `Interface/Glance/glanceAction.ts`: `GLANCE_DWELL` (the per-host dwell table, KNOB), `armGlance(target, el, dwell)`, `cancelGlance()`, `closeGlance()`, `setGlancePresenter()`, `watchAnchor()` (the scroll/keydown detachment watch), `GlanceTarget`; imports nothing; refuses an anchor inside the pane's own body.
2. `Interface/Glance/GlancePane.tsx` renders today's page and site glances with today's contract (no focus on open, glance-only, resize, linger, detachment, site cover + wheel), owns size persistence, resolves the page itself, and restores focus host-neutrally.
3. A fenced, id-keyed, bounded warm store inside the pane; the tab cache and window cache are never touched.
4. MarkdownPM (editor pointer path, markdown links, table cells) calls the seam through one `ConnectionsApi.glance` hook; `hoverIntent` and the pre-gate cancels are gone; the bloom still fires past the dwell.
5. The window vocabulary: every identifier, channel, preload namespace, local_state key, and menu action string in B-4 through B-7 of the log renamed; UI labels and disk values untouched; the do-not-rename list (B-8) untouched.
6. `connectionMenu.ts`, `linkResolve.ts`, `openWebLink.ts` in `Actions/`, behavior unchanged.
7. `Links/` deleted; every doc, guideline, planning note, comment, and ledger row that named it or the hover pane rewritten.

**Acceptance — the whole thing working:** In a running instance, resting one second on a resolved `[[Connection]]` in the main page editor, in a table cell, in a Page Window tab, and in a dashboard page tile opens the glance pane over that link with the page body; resting on a website link opens the live site behind its cover; dragging text inside the pane and moving off returns the caret to the host editor with no scroll jump; re-glancing a page just glanced restores its scroll; editing that page in a tab then re-glancing it shows the edit; "Open Preview" in the link menu still opens the Page Window; `rg -F "Links/" Pommora/src` is zero.

**Forced By**

- `pointerHandlers` is instantiated four times per editor and each `mouseover` cancels before `armable()` (`pointerPath.ts:119`); `cellStatic.tsx:263` does the same → one seam-owned timer requires deleting both pre-gate cancels (Task 7), and `connectionHover.test.tsx` must keep asserting the fired bloom.
- `armable()` reads `api.hover !== undefined` and the pane's body API has no such member → the hook stays a hook (Task 7, Task 8).
- `PageTile.initialEntry` prefers the warm doc over fresh detail → the warm store's `restore` fences with `fenceWarm` (Task 6).
- `panePresenter.ts` imports only a type → the new seam declares its own types and imports nothing (Task 5).
- `const { tabs, pinned, preview } = s` at `connectionMenu.ts:49` is followed by `window.nexus.connMenu(...)` → the slice field cannot be named `window`; it is `pageWindow` (Task 2).
- `NexusApi = typeof api` in preload → channel and namespace renames are compile-enumerated; the hand-written `on*` method names are not (Task 1 lists them).
- The `[class^="conn-hover-resize-"]` prefix is read by both the strip rule and the portal accent-stroke rule → the strips stay in the glance sheet (Task 6).

**Inherited Reasoning:** see the log's Considered & Rejected: no `glanceSlice`; no `pane-base.css`; no zero-CSS; strips do not join `resize-strip.css`; no disk or settings.json rename; the editor never calls `armGlance` directly; no reconcile-driven eviction.

**Grounding**

- `.claude/Planning/Glance Pane — Decision Log.md` — the spec; every decision tagged.
- `Pommora/src/renderer/Links/*` — the six sources being replaced or moved.
- `Pommora/src/renderer/MarkdownPM/Editor/pointerPath.ts`, `links.ts`, `connections.ts`, `Tables/cellStatic.tsx`, `Tables/MarkdownTable.tsx`, `Connections/index.ts` — the host side.
- `Pommora/src/renderer/Store/previewSlice.ts`, `Windows/windowTabs.ts`, `Store/nexusSlice.ts:123-128`, `main/IO/previewState.ts`, `main/remint.ts:158-163`, `main/index.ts:339,809-843`, `main/contextMenu.ts:99-100`, `shared/bridge.ts:263-266,381`, `preload/index.ts:115-116,184`, `shared/types.ts:499,521,534-552`, `main/Database/localState.ts:24,26` — the window vocabulary.
- `Pommora/src/shared/pageMenu.ts:24,100,109,153`, `connMenu.ts:15,23,26,37,40,99,126`, `navRowMenu.ts:19`, `tabMenu.ts:16`, `cellMenu.ts:133`, `main/contextMenu.ts:99,142`, `main/tabMenu.ts:17`, `main/navRowMenu.ts:21`, `renderer/Tabs/TabBar.tsx:159`, `Navigation/NavList.tsx:62`, `Views/TableView/TableView.tsx:869`, `MarkdownPM/Editor/linkEdit.test.tsx:207` — the action strings.
- `Pommora/src/renderer/SurfacePM/tileCache.ts`, `Store/tabState.ts:95-105`, `MarkdownPM/warmSeam.ts`, `SurfacePM/PageTile.tsx:39-66` — the warm seam.
- `.claude/Guidelines/Editor-Internals.md:27`, `Web-Guests.md:8,20`, the Features docs listed in the log's E-1, `.claude/CLAUDE.md:118`, `Planning/RendererRework.md:5,26`, `scripts/comment-ledger.mjs`.

**Environment:** Plan directory `.claude/Planning`. Explorer: `Explore`. Code reviewer: `feature-dev:code-reviewer`. Attack reviewer: `build-breaking-agent`. Neutral verifier: `general-purpose`. Simplification: `code-simplifier` + `comment-killer-agent` (briefed single-handed: no sub-agents, no worktree). Gates from `Pommora/package.json`: `npm run typecheck`, `npm run test`, `npm run lint`. Rules directory `.claude/Guidelines`.

**Shapes:** refactor (behavior-preserving rename, baseline = test count and the acceptance walkthrough) · removal (Links/, hoverIntent, the pre-gate cancels) · additive (the seam, the warm store, the focus restore) · user-visible (the glance).

**Global Constraints (every task inherits these):**

- Run from `Pommora/`: `npm run typecheck`, `npm run test`, `npm run lint`. Exit codes read directly, never piped. `set -o pipefail` if a pipe is unavoidable.
- Biome formats every TS/CSS write through the hook; a shell-driven edit bypasses it, so `npm run format` before the gate after any `sed`/`mv`-driven change.
- One tree-touching writer at a time. Stage explicit paths; the auto-stage hook pre-stages `.claude` edits, so commit them along.
- Comments: near zero; one why at most where the codebase cannot infer it. `KNOB` markers survive.
- Commit per task; tick the task's boxes in the same commit. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Out of scope everywhere: UI labels and hints, `.nexus/settings.json` keys, sidecar values, `card_banner: 'preview'`, `dropPreview`, `PropertyPreview`, `AssetImage.preview`, `--card-preview-zoom`, Showcase `.gl-preview*`, `thumbnails.ts`, SurfacePM/group drag-preview prose.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| InterfacePM | "the components live in … `Windows/`, and `Links/`" · "### The Hover Pane … (`Links/ConnectionPane.tsx`)" | Links/ gone; the pane is `Interface/Glance/GlancePane.tsx` | 9 |
| ConnectionsPM | "Resting on a resolved connection raises the hover pane" · "A read-only surface — a hover pane" | the surface is the glance pane | 9 |
| WebviewPM | "live hover previews for website links" · "### Website Hover Previews … raises the shared hover pane" · "the hover pane — all on the shared partition" | glance | 9 |
| ArchitecturePM | "the hover pane size" (local_state list, table row 158) · "the hover pane rides the lighter PickerMenu chassis" · "hover preview" (row 172) | glance pane / glance size | 9 |
| DesignSystemPM | "the hover pane, the autocomplete" (vocabulary line 9, GlassPane row 209) | glance pane | 9 |
| ConfigurationPM | "How long a connection's hover preview stays open" | glance (label stays "Hover Preview Linger") | 9 |
| SurfacePM, MarkdownPM, InteractionPM | "the hover pane" as a PageTile consumer / Bloom taker | glance pane | 9 |
| Guidelines/Editor-Internals | "`Links/ConnectionPane` reaches into MarkdownPM … (`Links/PanePresenter.ts`)" | `Interface/Glance/GlancePane.tsx`, `Interface/Glance/glanceAction.ts` | 9 |
| Guidelines/Web-Guests | "the hover pane's load cover" · "the tile and hover pane both do this" | glance pane | 9 |
| CLAUDE.md Codebase Map | "`// Links` · Everything that happens to a link — the hover pane, the link menu, resolution" | `// Glance` · the glance pane; helpers in Actions | 9 |
| Planning/RendererRework | "`Links/connectionMenu`" (R2 example) | `Actions/connectionMenu` | 9 |
| `MarkdownPM/index.tsx:327` comment | "Close the connection pane when focus leaves the editor" | the handler closes the autocomplete only | 7 |
| `scripts/comment-baseline.json`, `comment-units.json` | rows under `src/renderer/Links/` | paths moved | 9 |

**Dead Vocabulary**

- `Links/` · `panePresenter` · `hoverIntent` · `hoverConnection` · `hoverWebsite` · `hoverPaneSize` · `HoverCardSize` · `hoverCard` · `conn-hover` · `HOVER_ANCESTORS` · `hover-card` · `ConnectionPane` · `openPreview` · `PreviewState` · `previewsFile` · `PreviewsFile` · `previewState` · `previews:` · `open-in-preview` · `onOpenInPreview` · `title:preview` · `link:preview` · `open-preview` · `previewTargetOf` · `previewSlice` → expect 0 in `Pommora/src` and `.claude` with `--glob '!**/Planning/Glance*' --glob '!**/Planning/CalendarPicker*' --glob '!**/Sessions/**' --glob '!**/HistoryPM.md'`. Legitimate hits: the two excluded plans, session transcripts, and History.
- Control: `PickerMenu` → 20+. `openWindow` → 20+ after Phase 1. Zero here means the sweep never ran.

---

### Phase 1 — The window vocabulary

#### Task 1: Shared, preload, and main say "window"

**Requirement:** 5

**Why:** The contract is declared once in `bridge.ts` and derived on both sides, so renaming there first lets the compiler enumerate every renderer consumer for Task 2.

**Now** — `rg -F "previews:" Pommora/src` → 6 · `rg -F "hoverCard" Pommora/src` → 12 · `rg -F "open-in-preview" Pommora/src` → 3:

```ts
// shared/types.ts:499,521,534,542,552
export type PreviewTabTarget = SelectTarget | { kind: 'navwindow' }
export interface HoverCardSize { w: number; h: number }
export interface PreviewSetRecord { tabs: { target: NavRef }[]; activeIndex: number }
export interface PreviewsFile { navSet; origins; open; navOverride? }
export const EMPTY_PREVIEWS: PreviewsFile
// shared/bridge.ts:263-266,381
'previews:load' · 'previews:save' · 'hoverCard:load' · 'hoverCard:save' · 'open-in-preview': ContextTarget
// preload/index.ts:115,116,184
previews: { load, save } · hoverCard: { load, save } · onOpenInPreview: on('open-in-preview')
// main/IO/previewState.ts — sanitizePreviews · readPreviewsState · writePreviewsState
// main/Database/localState.ts:24,26 — 'previews' | 'hoverCard'
// main/index.ts:339 isCardSize · 809-843 the four handlers
// main/contextMenu.ts:100 push(win, 'open-in-preview', target) · main/remint.ts:158-163
```

**Becomes**

```ts
// shared/types.ts
export type WindowTabTarget = SelectTarget | { kind: 'navwindow' }
export interface GlanceSize { w: number; h: number }
export interface WindowSetRecord { tabs: { target: NavRef }[]; activeIndex: number }
export interface WindowsFile { navSet; origins; open; navOverride? }
export const EMPTY_WINDOWS: WindowsFile
// shared/bridge.ts
'windows:load' · 'windows:save' · 'glance:load' · 'glance:save' · 'open-in-window': ContextTarget
// preload/index.ts
windows: { load, save } · glance: { load, save } · onOpenInWindow: on('open-in-window')
// main/IO/windowState.ts (renamed) — sanitizeWindows · readWindowsState · writeWindowsState
// main/Database/localState.ts — 'windows' | 'glancePane'
// main/index.ts — isGlanceSize; handlers under the new channel names
// main/contextMenu.ts — push(win, 'open-in-window', target) · main/remint.ts repointed
```

**Assumed by:** Task 2 (store), Task 3 (action strings), Task 6 (`GlanceSize`, `nexus.glance`).

**Verify — automated**

- [ ] `npm run typecheck` red after the shared rename alone (renderer consumers), green after preload + main follow.
- [ ] `main/IO/previewState.test.ts` renamed to `windowState.test.ts`, green.
- [ ] `rg -F "previews:" Pommora/src` → 0 · `rg -F "hoverCard" Pommora/src` → 0 · `rg -F "open-in-preview" Pommora/src` → 0. Control: `rg -F "tabs:load" Pommora/src` → 3.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none — the surfaces land in Task 2.)*

#### Task 2: The store slice and its consumers say "window"

**Requirement:** 5

**Why:** The slice is where the word does the most damage, since every host reads `s.preview` to mean the Page Window while the glance also calls itself a preview.

**Now** — `rg -F "openPreview" Pommora/src/renderer` → 78 · `rg -F "s.preview" Pommora/src/renderer` → 15 · test fixtures setting `preview:` through `useSession.setState`: `Windows/useWindowWarm.test.tsx:27`, `Windows/windowTabs.test.ts:34`; `previewing:` fixtures: `MarkdownPM/Editor/externalLink.test.tsx:145`, `linkEdit.test.tsx:55,68,80,110`:

```ts
// renderer/Store/previewSlice.ts
export type PreviewTarget = { id: string; path: string }
export interface PreviewSlice { preview; previewsFile; previewSlide; previewExit; openPreview; openNavPreview; openPreviewTab; activatePreviewTab; reorderPreviewTabs; closePreviewTab; closePreview; reconcilePreview; resetPreview; … }
export const previewTargetOf
export const createPreviewSlice
// renderer/Windows/windowTabs.ts — PreviewTab · PreviewState
// renderer/store.ts:10,17,19,25 · Store/sessionState.ts · Store/nexusSlice.ts:125,128
// consumers: App, Sidebar, TabBar, NavList, TableView, CardsView, PageView, TileSurface, PageWindow, NavWindow, WindowTabStrip, useWindowWarm, windowMorph, connectionMenu, ConnectionPane, SettingsFrame, PageHistoryWindow, tests
```

**Becomes**

```ts
// renderer/Store/windowSlice.ts (renamed)
export type WindowTarget = { id: string; path: string }
export interface WindowSlice { pageWindow: WindowState | null; windowsFile; windowSlide; windowExit; openWindow; openNavWindow; openWindowTab; activateWindowTab; reorderWindowTabs; closeWindowTab; closeWindow; reconcileWindow; resetWindow; … }
// `pageWindow`, not `window`: a destructure would shadow the global (connectionMenu.ts:49).
export const windowTargetOf
export const createWindowSlice
// renderer/Windows/windowTabs.ts — WindowTab · WindowState
// every consumer repointed; local names `openInPreview` → `openInWindow`, `setPreviewBody` → `setWindowBody`
```

**Assumed by:** Task 3, Task 6 (`useSession((s) => s.pageWindow)` closes the glance), Task 8.

**Verify — automated**

- [ ] `npm run typecheck` green; the compiler enumerated every consumer.
- [ ] `store.test.tsx`, `windowTabs.test.ts`, `useWindowWarm.test.tsx` green with the same test count as before Phase 1 (record the count in the Log).
- [ ] `rg -F "openPreview" Pommora/src` → 0 · `rg -F "PreviewState" Pommora/src` → 0 · `rg -F "previewsFile" Pommora/src` → 0 · `rg -F "previewSlice" Pommora/src` → 0. Control: `rg -F "openWindow" Pommora/src` → 20+.
- [ ] Prose sweep: `rg -i "preview" Pommora/src/renderer/Windows Pommora/src/renderer/Store` → only hits that are labels (`aria-label`, "Preview tabs") or the do-not-rename list; every comment that meant the window rewritten.

**Verify — user**

- [ ] Page Window opens from a Collection set to Open In → Preview, from "Open Preview" in a link menu, from a tab's menu, from a nav row; tabs persist across relaunch.

#### Task 3: Menu action strings say "window"

**Requirement:** 5

**Why:** The action vocabulary is internal; the labels beside it keep "Open Preview" by ruling, so only the strings move.

**Now** — `rg -F "title:preview" Pommora/src` → 15 · `rg -F "link:preview" Pommora/src` → 8 · `rg -F "'open-preview'" Pommora/src` → 3 · `rg -F "'preview'" Pommora/src/shared/tabMenu.ts Pommora/src/main/tabMenu.ts Pommora/src/renderer/Tabs/TabBar.tsx` → 3:

```ts
// shared/pageMenu.ts:24 'title:preview' · :100 preview?: boolean · :109 label 'Open Preview' · :153 preview: true
// shared/connMenu.ts:15 previewing?: boolean · :23,26 'title:preview' · :37,40 'link:preview' · :99,126
// shared/navRowMenu.ts:19 'open-preview' · shared/tabMenu.ts:16 'preview' · shared/cellMenu.ts:133 preview: true
// main/contextMenu.ts:99,142 · main/tabMenu.ts:17 · main/navRowMenu.ts:21
// renderer: TabBar.tsx:159 · NavList.tsx:62 · TableView.tsx:869 · Links/connectionMenu.ts:38,67 · linkEdit.test.tsx:207 · shared/*.test.ts labels
```

**Becomes**

```ts
'title:window' · 'link:window' · 'open-window' · 'window'
// pageMenu opts: window?: boolean · connMenu ctx: windowed?: boolean
// labels unchanged: 'Open Preview'
```

**Verify — automated**

- [ ] `shared/pageMenu.test.ts`, `connMenu.test.ts`, `cellMenu.test.ts`, `linkEdit.test.tsx` green with label assertions unchanged.
- [ ] `rg -F "title:preview" Pommora/src` → 0 · `rg -F "link:preview" Pommora/src` → 0 · `rg -F "open-preview" Pommora/src` → 0. Control: `rg -F "'Open Preview'" Pommora/src` → 10 (unchanged).
- [ ] Full gate green.

**Verify — user**

- [ ] Right-click a connection → "Open Preview" opens the Page Window; a website link → "Open Preview" opens the Web Window.

#### Gate 1 — the window vocabulary, behavior unmoved

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** ticked against a watched result.
- [ ] Every Now count re-run; matched or the divergence rewrote the plan.
- [ ] Simplification and code review dispatched against `<base>..HEAD` scoped to the phase's paths.
- [ ] Every concern fixed, or carrying a ruling in the Log.
- [ ] Progress hashes filled in.
- [ ] Not a declared stop; Phase 2 opens; the user boxes carry to Completion Criteria.

---

### Phase 2 — Re-homing

#### Task 4: The three helpers move to Actions/

**Requirement:** 6

**Why:** None of them is a glance concern; Actions already holds the menu glue and commands, and the folder must be empty of everything but the pane before the pane is replaced.

**Now** — `rg -F "Links/connectionMenu" Pommora/src` → 10 · `rg -F "Links/linkResolve" Pommora/src` → 6 · `rg -F "Links/openWebLink" Pommora/src` → 5:

```ts
// renderer/Links/connectionMenu.ts · linkResolve.ts · openWebLink.ts — unchanged bodies
```

**Becomes**

```ts
// renderer/Actions/connectionMenu.ts · Actions/linkResolve.ts · Actions/openWebLink.ts — git mv, bodies unchanged
// 17 importers repointed (the log's D-1 list)
```

**Verify — automated**

- [ ] `git mv` used, so history follows.
- [ ] `rg -F "Links/connectionMenu" Pommora/src` → 0 · `rg -F "Links/linkResolve" Pommora/src` → 0 · `rg -F "Links/openWebLink" Pommora/src` → 0. Control: `rg -F "Actions/connectionMenu" Pommora/src` → 10.
- [ ] Full gate green; test count unmoved.

**Verify — user**

- [ ] *(none — no behavior moves.)*

#### Gate 2 — three moves, nothing else

- [ ] Gate commands green.
- [ ] Simplification and review against the range: reports cite only import lines.
- [ ] Progress hashes filled in; Phase 3 opens.

---

### Phase 3 — The Glance

#### Task 5: The seam

**Requirement:** 1

**Why:** Every host, present and future, reaches the pane through this one leaf. It owns the dwell so a host never carries a timer, and it imports nothing so the editor and the table can call it without the cycle Editor-Internals records.

**Now** — `—` (new); replaces `Links/panePresenter.ts` (21 lines), `hoverIntent` + `CONN_HOVER_INTENT_MS` in `pointerPath.ts:9-27`, and the anchor-detachment listeners in `ConnectionPane.tsx:340-368` (`checkDetached`, the capture-phase scroll and keydown listeners).

**Becomes**

```ts
// renderer/Interface/Glance/glanceAction.ts (new) + glanceAction.test.ts
export type GlanceTarget =
  | { kind: 'page'; id: string; path: string }
  | { kind: 'site'; url: string }
export interface GlanceRequest { target: GlanceTarget; el: Element }

/** KNOB — one dwell per host kind. A host names its row; a future host adds one. */
export const GLANCE_DWELL = { link: 1000 } as const
export type GlanceDwell = keyof typeof GLANCE_DWELL

export function setGlancePresenter(fn: ((next: GlanceRequest | null) => void) | null): void
/** Starts the dwell; a re-arm replaces the pending one. Fires present({target, el}) after
 *  dwellMs. A call before the pane mounts fires into nothing. An el inside `[data-glance]`
 *  (the pane's own body) arms nothing — the self-guard is structural, not host-cooperative. */
export function armGlance(target: GlanceTarget, el: Element, dwell: GlanceDwell): void
/** Clears a pending dwell; idempotent. Never closes an open pane. */
export function cancelGlance(): void
/** Clears the pending dwell AND closes the open pane. */
export function closeGlance(): void
/** The stays-open-while-scrolling watch: capture-phase scroll and keydown listeners that
 *  re-check `el.isConnected` behind CM's update (double rAF) and close through the presenter
 *  when the anchor is gone; Escape closes directly. Returns the unsubscribe. */
export function watchAnchor(el: Element, onDetached: () => void, onDropBoxes: () => void): () => void
```

**Assumed by:** Task 6 (claims the presenter), Task 7 (the callers).

**Verify — automated**

- [ ] Red first: arm fires once after `GLANCE_DWELL.link` (fake timers); re-arm within the window fires once with the latest target; cancel prevents the fire; close calls the presenter with null and clears a pending arm; arm with no presenter is a no-op; arm with an el under `[data-glance]` never fires; `watchAnchor` fires `onDetached` after two frames once the element leaves the DOM on a scroll, and not while it stays. Expect 7 failures, module not found. Then green.
- [ ] `rg -F "from '" Pommora/src/renderer/Interface/Glance/glanceAction.ts` → 0 (imports nothing). Control: `rg -F "export function" Pommora/src/renderer/Interface/Glance/glanceAction.ts` → 5.

**Verify — user**

- [ ] *(none.)*

#### Task 6: GlancePane

**Requirement:** 2, 3

**Why:** The pane keeps every behavior the hover pane has today and sheds its editor assumptions: it resolves its own page, restores focus to whoever held it, and warms its own re-opens. Folding the size accessor in leaves one file owning the pane.

**Now** — `Links/ConnectionPane.tsx` (469) · `Links/hoverPaneSize.ts` (36) · `Links/connection-pane.css` (116) · `Links/connectionPane.test.tsx` (119) · `Links/hoverPaneSize.test.ts` (42):

```ts
// Links/ConnectionPane.tsx
export type Hovered = { kind: 'page'; page: ConnPage; el } | { kind: 'site'; url; el }
export function hoverConnection(page: ConnPage, el: Element): void   // resolves detail, then presentHoverCard
export function hoverWebsite(url: string, el: Element): void
export function ConnectionPane(): JSX.Element                         // PickerMenu glass="pane", PageTile ancestors={['hover-card']}
// close(): if focus inside pane → EditorView.findFromDOM(hovered.el.closest('.cm-editor'))?.focus()
// Links/hoverPaneSize.ts — CARD_DEFAULT · CARD_MIN · seedHoverCardSize · hoverPaneSize · setHoverCardSize (nexus.hoverCard)
```

**Becomes**

```tsx
// renderer/Interface/Glance/GlancePane.tsx (git mv from ConnectionPane.tsx, then rewritten)
export function GlancePane(): React.JSX.Element
// claims setGlancePresenter at mount; releases on unmount
// present({kind:'page'}): readPageDetail(path) → fetchPageDetail(path), as today;
//   opens only if el.isConnected && el.matches(':hover'); a newer request supersedes the fetch
//   (the warm store is read only at PageTile mount, through the seam, so the fence always has a fresh body)
// present({kind:'site'}): as today (cover, did-fail-load, render-process-gone, resolve deadline)
// body div carries data-glance (the seam's self-guard reads it)
// onMouseDown (button 0): selectingRef = true; if (!body.contains(document.activeElement)) focusBefore = document.activeElement
// close(): if body contains activeElement → const host = focusBefore?.closest('.cm-editor');
//   (host ? EditorView.findFromDOM(host) : null)?.focus() ?? (focusBefore as HTMLElement | null)?.focus()
//   — never findFromDOM(body): it is a descendant query and would focus the first editor on the page
// ancestors={['glance']}
// size: KNOB GLANCE_DEFAULT {260,120} · GLANCE_MIN {180,100}; seed/read/set folded in, nexus.glance (local_state key 'glancePane')
// warm store: KNOB GLANCE_WARM_CAP = 8; Map<pageId, {editorState, scrollTop}> insertion-ordered LRU;
//   warmSeam(id, path): restore = fenceWarm(entry, readPageDetail(path)?.body) with self-delete on stale;
//   capture = set + trim to cap; passed to <PageTile warm={…}>
// scroll owner: the seam captures/restores view.scrollDOM (.cm-scroller). Today `.page-tile` scrolls and
//   the scroller never does, so the glance sheet moves `overflow-y: auto; overscroll-behavior: contain`
//   from `.glance-body .page-tile` onto `.glance-body .cm-scroller` (verified live at Task 6: the
//   clip, the inset KNOB, and heading folds must still hold)
// closes on selection / activeTabId / pageWindow change, as today; the scroll/keydown anchor watch
//   comes from watchAnchor in glanceAction, the pane keeps only the mousemove leave lifecycle

// renderer/Interface/Glance/glance-pane.css (git mv from connection-pane.css) — `conn-hover-` → `glance-`
// renderer/Interface/Glance/glancePane.test.tsx — ports connectionPane.test.tsx + hoverPaneSize.test.ts against the seam;
//   the warm-path cases carry the same `el.matches` spy the cold-path cases already do
```

**Assumed by:** Task 7 (`GlanceTarget` shape from the seam), Task 8 (mount).

**Verify — automated**

- [ ] Red first, new assertions: a glance re-opened for the same page id restores captured scroll on `.cm-scroller` (the assertion sets and reads that element, not `.page-tile`); after `cachePageDetail` with a changed body the warm entry is dropped and the fresh body renders (fence); the ninth distinct page evicts the first (cap); close after a press inside the pane focuses the element that held focus before the press; a second press inside the pane does not re-record; with `<body>` focused before the press, close leaves focus on `<body>` rather than an unrelated editor. Expect 6 failures. Then green with every ported assertion also green.
- [ ] Size tests ported: absent row keeps the default; stored value clamps on read; set clamps, rounds, writes through `nexus.glance.save`.
- [ ] `rg -F "conn-hover" Pommora/src` → 0 · `rg -F "hover-card" Pommora/src` → 0 · `rg -F "HoverCardSize" Pommora/src` → 0. Control: `rg -F "glance-" Pommora/src/renderer/Interface/Glance/glance-pane.css` → 20+.
- [ ] Full gate green.

**Verify — user**

- [ ] Carried to Task 8's walkthrough.

#### Task 7: MarkdownPM calls the seam

**Requirement:** 4

**Why:** The editor becomes one host: it wires a `glance` hook, and every dwell, cancel, and close it owes goes through the seam. Deleting the two pre-gate cancels is what makes one timer safe under four handlers.

**Now** — `rg -F "hoverIntent" Pommora/src` → 4 · `rg -F "api.hover" Pommora/src/renderer/MarkdownPM` → 2 · `rg -F "closeActiveHoverCard" Pommora/src` → 11:

```ts
// MarkdownPM/Connections/index.ts:57-61
hover?: (page: ConnPage, el: Element) => void
hoverSite?: (url: string, el: Element) => void
// MarkdownPM/Editor/pointerPath.ts:9,12,74,83,118-120,131-135,164
export function hoverIntent(): { arm; cancel }
const intent = hoverIntent()
mouseover(event, view) { intent.cancel(); if (!spec.armable()) return false; … if (bloom) intent.arm(bloom) }
mouseout() { intent.cancel(); actedOnLink = false }
consume(): intent.cancel(); actedOnLink = true
contextmenu: … closeActiveHoverCard(); pop()
// MarkdownPM/Editor/links.ts:70-83 dwellTarget → () => api.hover?.(page, el) | () => api.hoverSite?.(web, el)
// links.ts:88-92 armable: api?.hover !== undefined || api?.hoverSite !== undefined
// MarkdownPM/Editor/connections.ts:68,76-79 armable: getApi()?.hover !== undefined · dwell → hover(page, el)
// MarkdownPM/Tables/MarkdownTable.tsx:153-160,584-586 intent = useMemo(hoverIntent) · dismissHoverCard · onHoverArm/Leave/End props
// MarkdownPM/Tables/cellStatic.tsx:154-178,259-271 the three props; onMouseOver { onHoverLeave(); …; onHoverArm(bloom) }
// MarkdownPM/index.tsx:327-328 the stale "connection pane" comment
```

**Becomes**

```ts
// MarkdownPM/Connections/index.ts
import { armGlance, type GlanceTarget } from '@renderer/Interface/Glance/glanceAction'
/** The hook every host wires; its presence is what makes a surface armable. */
export const glanceLink: NonNullable<ConnectionsApi['glance']> = (target, el) =>
  armGlance(target, el, 'link')
export interface ConnectionsApi extends PageIndex {
  …
  glance?: (target: GlanceTarget, el: Element) => void
}
// pointerPath.ts — no timer, no hoverIntent
mouseover(event, view) { if (!spec.armable()) return false; …; spec.dwell(hit, el)?.() }
mouseout() { cancelGlance(); actedOnLink = false }
consume(): cancelGlance(); actedOnLink = true
contextmenu: … closeGlance(); pop()
// links.ts dwellTarget → () => api.glance?.({ kind: 'page', id: page.id, path: page.path }, el)
//                     | () => api.glance?.({ kind: 'site', url: web }, el)
// links.ts / connections.ts armable: getApi()?.glance !== undefined
// cellStatic.tsx — props gone; imports the seam:
onMouseOver={(e) => { const found = linkAt(e); const bloom = found && dwellTarget(...); if (bloom) bloom() }}
onMouseOut={cancelGlance}   // onContextMenu / onClick: closeGlance()
// MarkdownTable.tsx — `intent`, `dismissHoverCard`, and the three props gone; onSelect calls closeGlance()
// index.tsx:327 comment rewritten: the blur handler closes the autocomplete
```

**Assumed by:** Task 8 (hosts wire `glance: glanceLink`).

**Verify — automated**

- [ ] `connectionHover.test.tsx` rewritten to wire `glance: glanceLink` and a presenter spy through `setGlancePresenter`; it asserts the presenter **fires** after `GLANCE_DWELL.link` with the span element, and every existing negative case (caret inside, acted-on latch, leave before dwell) still asserts no fire. Red before Task 7's edits land against the new API (module shape), green after.
- [ ] New assertion, the F1 regression: with all four pointer extensions registered (the real `MarkdownPM` mount), a wikilink dwell fires exactly once. Red with the pre-gate cancel restored, green without it.
- [ ] `cellLinks.test.tsx` green against the seam.
- [ ] `rg -F "hoverIntent" Pommora/src` → 0 · `rg -F "hoverSite" Pommora/src` → 0 · `rg -F "closeActiveHoverCard" Pommora/src` → 0. Control: `rg -F "cancelGlance" Pommora/src` → 5+.
- [ ] Full gate green.

**Verify — user**

- [ ] Carried to Task 8.

#### Task 8: Hosts wire the hook, App mounts the pane, Links/ dies

**Requirement:** 2, 4, 7

**Why:** The last four consumers of the old entries switch to the hook, the app mounts the renamed pane, and the folder is deleted; the residue check proves nothing points at it.

**Now** — `rg -F "hoverConnection" Pommora/src` → 17 · `rg -F "ConnectionPane" Pommora/src` → 10:

```ts
// Interface/PageView.tsx:116-117 · SurfacePM/TileSurface.tsx:141-142 · Windows/PageWindow.tsx:120-121 · Windows/NavWindow.tsx:140-141
hover: hoverConnection,
hoverSite: hoverWebsite,
// App.tsx:25,307 import { ConnectionPane } … {status === 'ready' && <ConnectionPane />}
```

**Becomes**

```ts
glance: glanceLink,
// App.tsx: import { GlancePane } from './Glance/GlancePane' … <GlancePane />
// renderer/Links/ — deleted (git rm of whatever remains after Tasks 4 and 6)
```

**Verify — automated**

- [ ] `test -d Pommora/src/renderer/Links` → exit 1.
- [ ] `rg -F "Links/" Pommora/src` → 0 · `rg -F "hoverConnection" Pommora/src` → 0 · `rg -F "ConnectionPane" Pommora/src` → 0. Control: `rg -F "glanceLink" Pommora/src` → 5.
- [ ] Full gate green; test count = baseline + the new assertions from Tasks 5–7 (record).

**Verify — user**

- [ ] The acceptance walkthrough, all clauses, in a running instance. The agent drives it over CDP (the `run` skill) and records what it saw; Nathan's eyes are the final tick.

#### Task 9: Docs, guidelines, map, and ledgers

**Requirement:** 7

**Why:** Everything in Made False goes false in Phase 3; the rewrites land here, and the comment ledgers follow the moved paths so the next comment pass reads the right rows.

**Now** — `rg -F "hover pane" .claude/Features .claude/Guidelines .claude/CLAUDE.md` → 19 · `rg -F "Links/" .claude --glob '!**/Planning/Glance*'` → 15 (Editor-Internals 1, InterfacePM 2, RendererRework 2, HandoffPM 1, comment-baseline 1, comment-units 8):

```md
(the rows of Made False, quoted)
```

**Becomes**

```md
InterfacePM: "### The Glance Pane" — Resting on a resolved connection past a short intent delay raises the glance pane (`Interface/Glance/GlancePane.tsx`) … re-opening a page just glanced restores its scroll from a small per-page store …
ConnectionsPM / WebviewPM / ArchitecturePM / DesignSystemPM / ConfigurationPM / SurfacePM / MarkdownPM / InteractionPM: "hover pane" → "glance pane"; "hover preview" → "glance"; labels quoted verbatim stay
Editor-Internals: `Interface/Glance/GlancePane.tsx` … the imperative seam lives in its own leaf (`Interface/Glance/glanceAction.ts`)
Web-Guests: "the glance pane's load cover" · "the tile and glance pane both do this"
CLAUDE.md map: under `// Interface` add `// Glance | • The glance pane — the hover surface any anchor can raise`; InterfacePM's one-liner gains "the glance pane"; Actions line gains "link menu, link resolution, external-link routing"
RendererRework R2: `Actions/connectionMenu`
CLAUDE.md map Store line: "nexus, navigation, window, …"
scripts: no regenerator exists for `comment-units.json` and a bare `comment-ledger.mjs` run writes nothing — the `renderer/Links/` rows in both JSON files are re-keyed by hand to their new paths (three to `Actions/`, the pane files to `Interface/Glance/`, `panePresenter` → `glance`), `PRAGMAS.KNOB` at `comment-ledger.mjs:87` is bumped by the KNOBs Task 6 adds, and a fresh `--snapshot` is taken at closeout after the comment pass because rewritten files legitimately moved their token streams (accepted: the pre-arc `was` resets)
```

**Verify — automated**

- [ ] `rg -F "hover pane" .claude/Features .claude/Guidelines .claude/CLAUDE.md` → 0 · `rg -F "Links/" .claude --glob '!**/Planning/Glance*' --glob '!**/Planning/CalendarPicker*' --glob '!**/Sessions/**'` → 0 · `rg -F "renderer/Links" .claude/scripts` → 0 · `node .claude/scripts/comment-ledger.mjs --verify` exits 0 after the snapshot. Control: `rg -F "glance pane" .claude/Features` → 10+.
- [ ] Markdown prose never hard-wraps: each rewritten paragraph is one line.

**Verify — user**

- [ ] Skim InterfacePM's Glance Pane section reads true.

#### Gate 3 — the glance, host-neutral

- [ ] Gate commands green.
- [ ] Every Now count re-run.
- [ ] Simplification (code-simplifier, comment-killer single-handed) then code review against `<base>..HEAD` scoped to `Interface/Glance/`, `MarkdownPM/`, the four hosts, `App.tsx`.
- [ ] Attack review (build-breaking-agent) against the same range, briefed with the log's Considered & Rejected as the do-not-re-raise list.
- [ ] Every concern fixed or ruled.
- [ ] Progress hashes filled in.

---

### Phase 4 — Closeout

Invoke `/closeout` over the whole arc: the Delivery Claim, the neutral verifier against the decision log, the attack, the Dead Vocabulary sweep against its control. **No History entry** (Nathan's ruling). Rewrite `HandoffPM.md` for this session and `ContextPM.md` so the Glance arc is the standing focus: drop the other focus, and condense the RendererRework portion.

---

## Implementation Log

### Progress

- [x] **Phase 1** — The window vocabulary · base `f19ca8bd` · baseline 317 files / 3942 tests, all gates green
  - [x] Task 1 — Shared, preload, main · `6992b60f`
  - [x] Task 2 — Store slice and consumers · `c54a2c57`
  - [x] Task 3 — Menu action strings · `e26a0095`
  - [x] Gate 1 cleanup (simplifier's rename residue) · `97ac9438`
- [x] **Phase 2** — Re-homing
  - [x] Task 4 — Helpers to Actions/ · `6f7cb913`
- [ ] **Phase 3** — The Glance
  - [x] Task 5 — The seam · `70afe9da` (renamed to `glanceAction.ts` in the Task 6–8 commit)
  - [x] Task 6 — GlancePane · (with 7 and 8)
  - [x] Task 7 — MarkdownPM calls the seam · (with 6 and 8)
  - [x] Task 8 — Hosts, App, Links/ deleted · `3c1010d4` (Tasks 6–8 together)
  - [ ] Task 9 — Docs and ledgers · `<commit>`
- [ ] **Phase 4** — Closeout

### Rulings

- R-5 (Nathan, 09-04, mid-run): the seam file is camelCase `glanceAction.ts`. The connection and web dwells unify as one `link` row in `GLANCE_DWELL`; the hook is `glanceLink`.
- R-1 (Nathan, 09-03, pre-execution): the seam file is `glanceAction.ts`; the dwell knob lives there as a per-host table (`GLANCE_DWELL`), and hosts name their row. The anchor watch that keeps a glance standing while the content view scrolls also lives in the seam. Local_state key `hoverCard` → `glancePane` (IPC stays `glance:*`).
- R-2 (Claude, pre-execution, disclosed): the seam self-guards against an anchor inside the pane's body via a `data-glance` attribute, so the no-recursion guarantee no longer rests on `resolveOnlyConnections` alone.
- R-3 (Claude, pre-execution, disclosed): the glance's scroll owner moves from `.page-tile` to `.cm-scroller` so the shared warm seam captures real scroll; verified live in Task 6.
- R-4 (Claude, pre-execution, disclosed): the comment ledgers are re-keyed by hand and re-snapshotted at closeout.

- Nathan (09-03): UI copy stands ("Open Preview", "Open Connections In Preview", "Hover Preview Linger", "Preview / Full Page"); disk words stand.
- Nathan (09-03): the surface is the Glance; component `GlancePane.tsx`; the action is `glance`; the store IPC is `glance:load/save`.
- Nathan (09-03): size owned by the core TSX; minimal file count; no glance slice (assumed, unobjected).
- Nathan (09-03): helpers to `Actions/`.
- Nathan (09-03): warm store is id-keyed, 5–10 entries, never the tab cache.

### Open Against Later Tasks

### Deviations

- Tasks 6, 7, and 8 landed in one commit: the tree cannot be green between them (App and MarkdownPM import the pane and the seam), and a red intermediate commit was worse than a wider one.
- Task 6's two integration assertions on scroll restore were replaced by seam-level unit tests (`glanceWarmSeam`: restore-what-was-captured, the fence drop, the cap and LRU order) plus one integration assertion that the pane hands the tile a seam that captures on close. jsdom performs no layout, so `scrollTop` cannot be set or read on the scroller there; the scroll restore itself is verified live at Gate 3. `glanceWarmSeam` is exported for the tests.
- Task 7's F1 regression test is the existing "fires exactly once after the delay" case: `mountEditor` mounts the real editor with all four pointer extensions, so it goes red the moment a pre-gate cancel returns.
- A parallel session's in-flight PickerMenu edits keep the whole-tree typecheck and one of its own tests red during this run; the gate is read with those seven files stashed (once) and thereafter with their diagnostics filtered by path. The stash pop conflicted on one file the peer had rewritten meanwhile; six files were restored from the stash and the seventh left as the peer's copy, with the stash kept and the peer session messaged.
- Task 1 also repointed the renderer's consumers of the *shared* names (`WindowsFile`, `EMPTY_WINDOWS`, `GlanceSize`, `nexus.windows`, `nexus.glance`, `onOpenInWindow`) so the commit stayed green; the plan had those under Task 2.
- A parallel session (the CalendarPicker delegation plan) is committing on the same tree; its uncommitted `DesignSystem/Pickers/*` edits made the whole-tree typecheck red at Task 4. Proven green with that one file stashed; the baseline test count rose 3942 → 3947 from its test additions, not mine. Its `iteration-window.tsx` caught a blind `previewing`→`windowed` hit; reverted in the working tree (never staged).
- Task 5's test and implementation were written together rather than red-first; the six dwell cases and two watch cases all pass on first run.
- Plan review round 1 (build-breaking-agent): nine findings folded before ratification — scroll owner (R-3), focus record/restore guard, glob anchoring on the sweeps, the ledger mechanism (R-4), the knob move (R-1), the Goal sentence, Now counts re-derived, warm-store open order reverted to resolve-then-open, the seam self-guard (R-2).

### Lessons

### Sequenced After

- Non-editor glance hosts (sidebar rows, tabs, view rows, PropertyPanel values).
- Blur-close for the glance on ⌘-Tab, if wanted.
- `main/remint.ts` never drops the old origin key when copying a window set.

### Closeout

---

## Completion Criteria

**The directive**

```
Execute Glance Pane — Implementation Plan. Unattended overnight.
Live-verify: the acceptance walkthrough with Nathan's own eyes (the agent drives it over CDP first).
Screenshots: Phase 3 — the glance open over an editor link, a table cell, a Page Window tab, a dashboard tile; a site glance.
Pings: at completion.
Record: no History entry; Handoff + ContextPM rewritten.
Also: UI copy and disk words never change; the do-not-rename list is inviolable.
Everything else is the standard below.
```

**The Standard**

- **The bar.** Not doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. A future review of this arc finds nothing to correct.
- **Only the live confirmation may be pending.** No concerns carried, no "for a later session," no deferrals when the fix is known and could be done now.
- **Reusability first.** Search before writing. A second resolver, cache, or validator means the plan is wrong, or you are — log it before proceeding.
- **Fix at the source**, never down-river.
- **Ambiguity:** take the simplest reading, record it under Rulings or Deviations, continue.
- **Per phase:** implement → simplify → comment pass → gates → code review → attack review → every finding fixed or ruled → commit. Simplification before review, never inverted.
- **Comments** only where the why can't be inferred. **Docs** stay clean; what went false gets rewritten. Unattributed doc or style edits mid-run belong to Nathan — fold them in, never revert.

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause, over CDP.
- [ ] The Links/ folder does not exist; `Interface/Glance/` holds exactly `GlancePane.tsx`, `glanceAction.ts`, `glance-pane.css`, and their tests.

**The passes**

- [ ] Simplification and the comment pass over the whole range.
- [ ] Simplification → code review over the full implementation in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against the decision log.
- [ ] Every finding from every pass fixed, or carrying a defensible ruling.

**The user's own pass**

- [ ] The acceptance walkthrough in the running app.
- [ ] Page Window routes (Collection Open In, link menu, tab menu, nav row) still open the window; tab sets persisted before the run are gone once (B-7) and re-persist.
- [ ] InterfacePM's Glance Pane section reads true.

**The record**

- [ ] Documents made false rewritten in the commits that falsified them.
- [ ] The closing sweep at zero against its control.
- [ ] Context and Handoff rewritten; no History entry (ruled).
- [ ] Lessons routed to `.claude/Guidelines`; successor work named in Sequenced After.

**The report**, in plain English — what shipped and why it matters · what happened along the way worth knowing · what each screenshot showed · every gate's real output · in-flight decisions · what's left for the live pass · final +/- line count, comments and tests excluded. Honest about what didn't work.
