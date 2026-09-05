## Handoff — Pommora

> **User Prompt:** *"I want to retire the Links/ folder … completely refactor the 'hover over this, display it in a preview pane' system to where it becomes one shared … chassis; with its action being able to be used app-wide."* — then, ratifying: *"Glances go under Interface please."*, *"Dwell knob lives in glance-action.ts … which describes different timers for different users"*, *"Glance action can be camelCase"*, *"Unify the connection + web to one 'Link' dwell timer"*, *"the current ui-copy stands. Open in Preview stays"*, *"Ends with /closeout. No History, re-write handoff + ContextPM accordingly."*

#### Current Focus

**Session ID:** 973f0051-88f1-4a64-ae11-23e6a6ef57ff
**Dates:** 09-03-2026 → 09-04
**Model:** Fable 5.1

**The Glance Pane arc is closed.** The hover pane left `renderer/Links/` and became `renderer/Interface/Glance/`: `GlancePane.tsx` on the PickerMenu chassis, `glanceAction.ts` as the import-free seam any host calls (`armGlance(target, el, 'link')`, `cancelGlance`, `closeGlance`, the per-host dwell table `GLANCE_DWELL`, the presenter slot, and `watchAnchor`, which keeps a glance standing while the content view scrolls until its anchor leaves the DOM), and `glance-pane.css` for the rules PickerMenu cannot express. MarkdownPM is one host of the seam through a single `ConnectionsApi.glance` hook (`glanceLink`); its own dwell timer and the two pre-gate cancels that would have killed a shared timer are gone. The pane resolves its page itself, records focus on the capture-phase press and hands it back through the host editor's own view, and keeps an eight-entry id-keyed warm store fenced by `fenceWarm`, so re-glancing a page returns to where it was left unless the page changed. The three link helpers moved to `Actions/`; `Links/` no longer exists.

**The vocabulary moved with it, in code only.** Every identifier that said "preview" and meant the floating Page Window says "window" — `windowSlice`, `pageWindow`, `openWindow`, `WindowsFile`, IPC `windows:*` and `glance:*`, push `open-in-window`, local_state keys `windows` and `glancePane`, action strings `title:window` / `link:window` / `open-window`. Nathan ruled the user-facing and on-disk words stay: "Open Preview", "Open Connections In Preview", "Hover Preview Linger", the "Preview / Full Page" toggle, sidecar `page-preview`, settings.json `connectionsOpenInPreview` and `hoverPreviewLinger`.

**Verified live over CDP against NexusOS, as distinct from traced:** a website glance on a markdown link (its cover never lifted for a slow external site and the resolve deadline closed it, the standing contract); a connection glance in the main editor that stayed through a content-view scroll, scrolled inside on `.cm-scroller`, closed on Escape, and re-glanced at the same scroll (402 → 402); a connection glance inside a Page Window tab; and, after a Gate 3 fix, the focus hand-back after a selection drag with no scroll jump. Not driven live: a table-cell link and a dashboard-tile link (no NexusOS page holds one; the unit suites cover both hosts), "Open Preview" from the native link menu (native menus are not CDP-drivable), and the edit-then-re-glance fence (unit-covered, a real page would have been mutated).

**The closeout attack found no regression from the arc** and six inherited fragilities; four are fixed (`a25d7e8f`): the pane no longer registers as a modal picker, so menus and toolbar panels dismiss normally while a glance stands; a drag pinned at a cramped anchor's cap keeps the stored size; the size seeds per nexus; a table inside a glanced page no longer closes the pane, and a read-only tile's cell no longer mounts an editor. Nathan then ruled webpages inert inside a glance too; `followTarget` is the one seat (the wikilink and citation follows now route through it). One is accepted: a single Escape both exits a tile's edit and closes a glance. Nathan's mid-closeout ruling put the glance and the autocomplete on the window glass (`37fa4c59`), and the simplifier rerun over the folds landed one `insideGlance` predicate and a supersession token on the size seed (`c5990564`).

**What the reviews changed.** The plan attack before ratification folded nine findings — the scroll owner moving to `.cm-scroller`, the focus record's guards, the sweep globs, the ledger mechanism, the knob's home, the resolve-then-open order, and the seam's self-guard. The implementation review folded two: every close routes through one `dismiss` that cancels a queued retarget beat and supersedes an in-flight cold fetch. The live walkthrough found the third: CodeMirror focuses its own content inside the native mousedown, so the press record moved to `onMouseDownCapture`.

#### Completion Criteria

- [x] Every requirement traces to a landed task; the plan's Progress carries the hashes.
- [x] The acceptance walkthrough observed over CDP where the data allowed, with the three unit-covered clauses named.
- [x] Simplification, comment pass, code review, and attack ran per gate; every finding folded or ruled in the plan's Log.
- [x] Docs, guidelines, the Codebase Map, and the comment ledgers rewritten; the closing sweep at zero against its control.
- [x] Handoff and Context rewritten; no History entry, by ruling.
- [ ] Nathan's own pass: the glance in the running app (now on the window glass), the Page Window routes, and InterfacePM's Glance Pane section.

#### Next Session

- Nathan's own pass over the glance and the window routes; his remembered Page Window tab sets and glance size reset once with the key rename.
- Non-editor glance hosts — sidebar rows, tabs, view rows, PropertyPanel values — are the arc's Prospect: a host supplies an element and a dwell row, and the seam does the rest.
- Blur-close for the glance on ⌘-Tab, if wanted; none exists today.
- `main/remint.ts` never drops the old origin key when copying a window set (pre-existing).

#### Feedback

- "Panel is taken, Pane may be too broad … lets call it a Pane for now."
- "I want the size to be bound to the core TSX file … minimal amount of files total is the best outcome here."
- "the detachment focus should be done in a way where markdownpm doesn't need to enumerate it. the 'click off and have an active cursor elsewhere' should just be core behavior."
- "Stop and ask when you need to — otherwise please try and handle this autonomously."

#### Session Pointers

- The spec and the plan: `.claude/Planning/Glance Pane — Decision Log.md`, `.claude/Planning/Glance Pane — Implementation Plan.md` (Rulings R-1 through R-5, Deviations, the Delivery Claim under Closeout).
- The seam: `Pommora/src/renderer/Interface/Glance/glanceAction.ts`; the pane: `GlancePane.tsx`; the hook: `MarkdownPM/Connections/index.ts` (`glanceLink`); the hosts: `Interface/PageView.tsx`, `Tiles/TileHost.tsx`, `Windows/PageWindow.tsx`, `Windows/NavWindow.tsx`.
- The CDP driver, throwaway, in the session scratchpad: `cdp.mjs` (`eval` / `--move` / `--down` / `--up` / `--wheel` / `--key` / `--shot`); the screenshots `glance-site.png`, `glance-connection.png`, `glance-window.png`.
- A parallel session (the CalendarPicker delegation) committed on the same tree throughout; its files were never staged here.

#### Working Notes

- CodeMirror focuses its content during the native mousedown, before a bubbling React handler runs; anything that must read "who had focus before this press" reads it on the capture phase.
- One shared dwell timer under N pointer handlers turns every defensive pre-gate cancel into a killer of the one that armed; audit the cancels, not the arms.
- jsdom performs no layout, so `scrollTop` cannot be set or read on a scroller there; scroll-restore is a seam-level unit test plus a live check.
- `git stash` on a shared tree takes a parallel session's uncommitted work with it; filter their paths out of gate output instead.
- `electron-vite dev` needs a fresh launch with `--remote-debugging-port=9333` after a main-process change; a page reload follows any edit to a module the renderer imports at boot.

#### Changes

**FILES ADDED**

- Pommora/src/renderer/Interface/Glance/glanceAction.ts · glanceAction.test.ts · glance-pane.css · glancePane.test.tsx

**FILES MOVED**

- Pommora/src/renderer/Links/ConnectionPane.tsx → Interface/Glance/GlancePane.tsx (rewritten)
- Pommora/src/renderer/Links/{connectionMenu,linkResolve,openWebLink}.ts → Actions/
- Pommora/src/renderer/Store/previewSlice.ts · previewSlice.test.ts → windowSlice.ts · windowSlice.test.ts
- Pommora/src/main/IO/previewState.ts · previewState.test.ts → windowState.ts · windowState.test.ts

**FILES REMOVED**

- Pommora/src/renderer/Links/ (connection-pane.css · connectionPane.test.tsx · hoverPaneSize.ts · hoverPaneSize.test.ts · panePresenter.ts)

**FILES MODIFIED**

- .claude: CLAUDE.md · ContextPM.md · HandoffPM.md · scripts/comment-baseline.json · comment-units.json · comment-ledger.mjs
- .claude/Features: ArchitecturePM · ConfigurationPM · ConnectionsPM · DesignSystemPM · InteractionPM · InterfacePM · MarkdownPM · TilesPM · WebviewPM; Guidelines: Editor-Internals · Web-Guests
- Pommora/src/shared: types.ts · bridge.ts · links.ts · citationMenu.ts · pageMenu.ts · connMenu.ts · cellMenu.ts · navRowMenu.ts · tabMenu.ts and their tests
- Pommora/src/main: index.ts · contextMenu.ts · navRowMenu.ts · tabMenu.ts · remint.ts · sessionDb.ts · webGuests.ts · Database/localState.ts; preload/index.ts
- Pommora/src/renderer: App.tsx · Store/nexusSlice.ts · sessionState.ts · store.ts · Interface/PageView.tsx · restoreSnapshot.ts · pageEditor.ts · Tiles/TileHost.tsx · Surfaces/WebTile.tsx · tileCache.ts · Windows/PageWindow.tsx · NavWindow.tsx · WindowTabStrip.tsx · useWindowWarm.ts · windowTabs.ts · windowCache.ts · windowMorph.ts · page-window.css · PageHistoryWindow.tsx · Interactions/FloatingWindow.tsx · Tabs/TabBar.tsx · Navigation/NavList.tsx · Sidebar/Sidebar.tsx · Views/TableView/TableView.tsx · CardView/CardsView.tsx · CardValue.tsx · CardPickerHost.tsx · Properties/PageProperties.tsx · Assignment/LinkCell.tsx · usePropertyRows.ts · cardValueInput.ts · MarkdownPM/index.tsx · PageHeader.tsx · Connections/index.ts · Editor/pointerPath.ts · links.ts · connections.ts · folding.ts · editorGesture.ts · citationPointer.ts · Tables/MarkdownTable.tsx · cellStatic.tsx
- The matching test files beside each of the above.

**COMMITS**

- `f19ca8bd` the ratified plan · `6992b60f` Task 1 · `c54a2c57` Task 2 · `e26a0095` Task 3 · `97ac9438` Gate 1
- `6f7cb913` Task 4 · `70afe9da` Task 5 · `3c1010d4` Tasks 6–8 · `2ef7e752` Task 9 · `99acb80b` Gate 3 · `cf2ba0fe` the comment pass and residue sweep · `a3ce42eb` the record · `37fa4c59` the window glass · `a25d7e8f` the attack's folds · `c5990564` the simplifier rerun · `7343d5ac` the comment pass
- The parallel session's, interleaved and not this session's: the `pickers` commits from `e7e3bd17` onward.

#### Handoff Guidelines

- §Current Focus names its focus in the first line and separates what was verified from what was assumed.
- A criterion is a checkable statement about the work; process steps do not belong here.
- §Changes comes from git, and a file that rode another session's commit is said to have done so rather than listed as this session's.
