## Handoff — Pommora

> **User Prompt:** *"The repository becomes a monorepo at its current root: Core, UIX, Desktop, Mobile and Sync seated, Showcase compiling. The `Pommora/` package folder and the `src/{main,preload,renderer,shared}` split by process dissolve. Every file has a home named for what it is, or its homelessness is a stated decision."* Then, through the run: gates from the root chained with `&&`; moves are `git mv`; no new visible UI; a task that grows beyond its Becomes stops and reports; every simplification pass dual-briefed to report bugs as well as complexity.

#### Current Focus

**Dates:** 09-05-2026 to 09-06-2026
**Model:** Opus 5 · Fable 5.1 (Tasks 13 and 14)

**The restructure is in and closed out.** Tasks 0 through 18 landed over `7c7c7542..ffd56b07a`, the docs phase at `734baa79`, Gate 5 at `2053ee50`, and the closeout's five passes through `60603de2`; the run's counter ends at 68,679 code lines against 69,459 (−780), the strict count excluding harnesses at −1,002: the six workspaces, `shared/` dissolved into Core, UIX and Desktop, Core filed by domain, the Platform seam and the Contract split out of the Electron host, the 26 menu channels collapsed onto one, the editor taking an `EditorHost` from its mounter, the Phase 5 removals and the two write-path fixes, the Showcase severed from Core, and the harness scripts repointed at the new tree. Tasks 19 and 20 — this document's own phase — reconciled the `.claude` registry against what the moves made true, on a character budget rather than a free rewrite.

**What the docs phase changed.** Every prefixed path citation and bare folder name in the registry was swept through the new tree and each rewritten path checked for existence; the 38 stale claims the A18 audit found were rewritten true — the casing misses, the wrong folders, the names that no longer exist, and the PRD's retired `PageID`/`TaskID`/`EventID` keys and `(Projects):` syntax. `ArchitecturePM` split at its own seams into `CorePM` (the Nexus layout, the data layer, the domains, the Platform seam, the Contract) and `DesktopPM` (Bridge, Store, FileWatch, Actions, Web, Capture, Config, Renderer), and every link retargeted. `DesignSystemPM`'s spine now mirrors `UIX`'s root categories, its `Components` heading gone and its atlas tables agreeing with the code. `MarkdownPM` §Architecture describes the Engine/host shape. Every Features doc carries a first-line workspace tag. `CLAUDE.md`'s Hard Rules restate for the monorepo — the host owns the machine, `Core/Contract` is the contract between any interface and any host — with the gates and both launch commands run from the root.

**What the run left standing.** Five open questions reached ContextPM rather than being decided here: `showError` versus `notifyError`, `ActionItem.confirm` as a write-only field, `RowMenuHost` without a desktop caller, `ALL_ICONS` staying Lucide-only, and TileLab's blank stage. The Windows notes, the five unlocked single-writer `writeJson` sites, `page:open` not raising a window, and the latent `NativePickerContext` gap are recorded under Known Issues.

#### Completion Criteria

- [x] Six workspaces at the root; `Pommora/` dissolved; gates green from the root.
- [x] Core reaches the machine only through `Core/Platform`; only `Desktop/` imports Node and Electron.
- [x] Docs reconciled: paths swept, 38 claims corrected, `ArchitecturePM` split, Features tagged.
- [x] `CLAUDE.md` Hard Rules restated; the Mobile plan's superseded tasks marked with a path table.
- [x] Gate 5 (`2053ee50`) and the closeout: the comment killer (`12f52789`), the Delivery Claim (`29c84ba1`, verified), the attack and its fixes (`817e967e`), the simplification (`60603de2`).
- [ ] Nathan's own pass.

#### Next Session

- Nathan's own pass — the app on his real Nexus for a day, and a flip through `Core`, `UIX`, and `Desktop` to say whether the filing reads the way it was meant to.
- The five open questions in ContextPM's Open Calls, each cheap once decided.
- The inspector arc still stands on `.claude/Planning/TilesV2-Spec.md`.

#### Feedback

- "Every claim reworded to be true, on a tight line budget." / "`CLAUDE.md` stays tight: rules restated, nothing added that does not apply to the whole project."
- "Documentation reconciliation runs as its own targeted phase after the code is still."

#### Session Pointers

- The plan and its evidence: `.claude/Planning/Pommora Monorepo — Implementation Plan.md` (Goal, Global Constraints, Dead Vocabulary, the Log's Rulings and Deviations), the Decision Log, and `.claude/Planning/MonorepoAudit/A01–A20`.
- The docs phase's own input: `MonorepoAudit/A18-docs-reconciliation.md` — the doc × pattern table, the 38 misses by class, the folders no doc named, and the doc-to-workspace map.
- The atlas gate: `node .claude/scripts/check-atlas.mjs` reads every `**SOURCE:**` table in `.claude/Features` against the code it names; the doc changes, never the code.

#### Working Notes

- A doc's path citations resolve more reliably by basename against `git ls-files` than by replaying a plan's move tables; the tables describe intent, the tree describes fact.
- `check-atlas.mjs` cannot see a CSS variable a template literal generates, so a token that exists only at runtime must be described in prose rather than claimed in a table cell.
- The registry's character budget is what keeps a reconciliation from becoming a rewrite: a true claim that needs more words is paid for by a redundant sentence in the same registry.
- A folder-spined document pays for the spine when the folders move. `DesignSystemPM` was the only one, and reordering it to `ls UIX` was mechanical only because each section was already self-contained; the sections that had drifted into groupings rather than folders — `Components`, `Composite Shells` — were the ones that had to be taken apart by hand.
- Three of the audit's stale claims were stale in the other direction: the debt they described had already been paid. The two renders of a page's property rows are one `PagePropertyRows` mounted by both surfaces, the `main/index.ts` split happened in Task 8, and `WEB_PARTITION` settled in `Core/Web`. A reconciliation has to re-probe the finding, not just the wording.

#### Changes

**FILES ADDED**

- .claude/Features/DesktopPM.md

**FILES MOVED**

- .claude/Features/ArchitecturePM.md → CorePM.md

**FILES MODIFIED**

- .claude: CLAUDE.md · ContextPM.md · HandoffPM.md · FrameworkPM.md · PommoraPRD.md
- .claude/Features: all nineteen docs — the path sweep, the workspace tags, DesignSystemPM's spine, MarkdownPM's architecture
- .claude/Guidelines: Dependencies · Development-Environment · Editor-Internals · Web-Guests
- .claude/Planning: both Mobile Companion documents — Task 0 and Phase 8 superseded with a path table; A-6, K-1, and the Prospect restated

**VERIFIED**

- Every backtick path token in the registry resolves against the tree; the retargeted wiki-links reach zero; `check-atlas.mjs` reports sixteen tables agreeing with source; the Dead Vocabulary tokens read zero against their controls.

**COMMITS**

- Tasks 0–18 over `7c7c7542..ffd56b07a` (75 commits); the docs phase's own commit and Gate 5 follow.
