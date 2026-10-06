## Data Layer — Implementation Plan

**Written:** 09-30-2026 · **Source:** *Data Layer — Decision Log* (revised 10-01-2026) · **Evidence:** *Data Layer — Investigation* and `Data Layer — Investigation Reports/00 — Orchestrator Notes.md`

### Context

Pommora keeps several copies of the open Nexus: the host's tree, the window's tree, the content index, and the pushes that tell the window which pages and values moved. One system keeps them current for a file an outside tool changed: the watcher's settle (`Desktop/FileWatch/watcher.ts`) classifies each event, patches the tree from the changed file (`Core/Nexus/watchPatch.ts`), maintains the index, and derives every push. The app's own writes are filtered out of that system by echo suppression and confirmed through a second one built by hand: a routing table with its disk re-reads (`Core/Nexus/mutatePatch.ts`), four confirm helpers (`Core/Nexus/confirm.ts`), two ledgers of recent writes (`Core/Nexus/valuesChanged.ts`), eight hand-placed index calls, a set of request-keyed tree transforms (`Core/Nexus/treePatch.ts`), and the window's own copy of the routing switch (`Core/Session/nexusSlice.ts`). Most of the audit's findings in this layer live in the second system or in the seams between the two.

This plan deletes the second system and sends every change down the first. It touches `Core/Nexus`, `Core/Files`, `Core/Index`, `Core/Contexts`, `Core/Trash`, `Core/Session`, `Core/Properties`, `Core/Contract`, the handlers and writers of `Core/Settings`, `Core/Views`, `Core/Assets`, and `Core/Pages`, and `Desktop/FileWatch` and `Desktop/Store`. It leaves alone the file formats on disk, how files are written (atomic replacement, per-file locks, strict read-modify-write, echo records), Sync's wire and landing code, tiles, navigation, tabs, the editor, the 40 side channels as channels (F-611), the whole-app error table (F-621), and the shared machinery of the two registries (F-622).

### Summary

Today Pommora has two ways of noticing that a file changed. One handles files that Obsidian, Finder, or Sync touched, and it does the whole job in one place. The other handles files Pommora itself wrote, and it was built by hand, one operation at a time, with its own table of rules, two notebooks, and a duplicate of that table in the window. The two have drifted apart, and nearly every data-layer bug in the audit is a place where they disagree or where the second one forgot something.

When this plan is done there is one way. A file Pommora writes is reported the same way an outside edit is, with the bytes it wrote, and one step updates the picture, the search index, and the window. Pages, Spaces, and folder settings are each read by one piece of code instead of three. Settings sit in their own record. Notes and folders made outside the app get their permanent ID the moment the app sees them. The window is told what changed instead of being sent everything. Nothing you use changes except the notices for files the app can't read, the ID stamping, and the few small rulings *§Constraints* lists. The code ends about 380 lines smaller (somewhere between 315 and 440; by phase about +80, +25, −465, and −20, since the first two phases build what the third deletes with), with fewer mechanisms to keep in agreement, and a new feature that writes a file the tree already reads is picked up without wiring.

#### Core Principles

This plan is judged by what it does to the codebase. Someone who has never seen the request, comparing the code before and after, should find the result smaller, plainer to read, clearer about what belongs where, and deliberate throughout. Every task, every call made while implementing, and every deviation is held to the six principles below, and *§Finalization Review* tests them.

- **Less to Carry:** The codebase ends with fewer functions, helpers, wrappers, types, layers, and call sites than it began with, and with no logic stated twice. New code earns its place by removing more than it adds, or by making correct a behavior that was wrong. A phase that nets an increase states what the increase buys.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before. That holds for a developer reading the code and for Nathan reading file names, file headers, and the names table.
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice left between layers, helpers, or modules.
- **Better, Rather Than Moved:** The structure is materially better than it was. Complexity that was relocated, renamed, or exchanged for new complexity of similar weight counts as no improvement.
- **Reads as Designed:** The finished code shows a structure someone chose. Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains in it.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth, and no part contradicts another. An exception carries its reason where a reader meets it: in the code, or in the feature document when the code can't say it.

**Open Calls:** Where the plan leaves a decision to whoever is implementing or orchestrating, it is made toward the option that best satisfies these six, disclosed in chat as it is made, and recorded in the area it changes when it changes an outcome.

#### Constraints

- **Gates,** from the repo root: `npm run typecheck` · `npm run test` · `npm run lint`. Each exits 0; `set -o pipefail` before piping to `tail`, and a Biome "Found N warnings" line counts as red. Biome reformats every TS and JSON write, so an Edit that fails on whitespace means re-read and retry.
- **The standard:** *§Core Principles* (Decision Log A-9), tested by *§Finalization Review*. A task that can't meet them as written stops and reports instead of landing a compromise.
- **Clarity over cleverness (A-8):** plain code beats machinery. A helper, type, or layer the task's printed code doesn't show isn't added.
- **No behavior change** beyond the Decision Log's rulings and the list here. The rulings: the notices for a file the app can't read, worded by what Try Again can do and acting on the one file named (E-2, E-4, E-7, E-8); a Collection or Set whose settings file is damaged staying out of the app until it is corrected, with what belongs to its pages kept (E-7); ID stamping on first sight and the end of temporary IDs (E-6); one name-stepping rule (F-3); a new Collection landing last (F-603); and a rename, a property delete, an option rename, and an option remove reporting, with Try Again, the files they skipped (G-3, F-627). The rest: a Space's own values reconciled as a page's are; an unreadable Space blocking tag edits of its own Context alone (F-201); a Space link edit finishing the Spaces it can reach and reporting the one it can't; a restored Context's Spaces rekeyed by the live rename's merge (Task 1.6); a corrupt `matrix.json` met by a delete rebuilt from its last read (Task 1.7); a settings toggle holding through the host's echo (F-194); and a case-only rename of a folder holding excluded entries costing one walk. Everything else a user can observe is identical before and after each phase.
- **File formats don't change.** No sidecar, frontmatter, or `.nexus/*.json` shape moves. `settings.json` and every other file read and write as they do today.
- **Safety properties that stay as they are:** whole-file atomic replacement, per-file locks and strict read-modify-write, echo suppression by bytes (`Core/Files/writeEcho.ts`), the single-flight walk with stale-walk discard and the root pin (`Core/Nexus/liveTree.ts`), the parse cache (`Core/Files/walkCache.ts`), the index seed's database-identity bail, a value write resolving its property inside the file's lock, and the live writers never shrinking a Context tag they can't resolve. No task edits these except where its printed code shows the exact lines.
- **The fallback is the walk.** An event the settle can't place re-reads the Nexus. No task replaces a walk with a guess; a task that removes a walk adds the arm that makes it unnecessary and the parity test that proves the arm.
- **Tests come in two kinds.** A behavior test asserts what the app does through a public entry (`mutate`, a handler, a store action, a file on disk); it is never edited to make a task pass, and a red one is a defect in the task. A mechanism test imports or spies on a symbol a task deletes; the task that deletes the symbol retires or rewrites the test, and its VERIFY names the file. Where a task changes a function's signature, a test's call sites follow it and its assertions stay; where a task moves a field, an assertion's access path follows it and its expected value doesn't change. Test bodies aren't written in this plan: the implementer writes them against the task's printed code. A parity test compares the settled tree against `readNexus` on the same disk.
- **Printed code:** each task's code was printed before it was implemented, one entry per file per phase. A new file is printed whole. An edited file is printed as a `diff` against the state the task starts from, or whole when the task rewrites most of it. An entry is the code as it lands, imports included; the implementer writes nothing the entry doesn't show. A fan-out edit (one rule applied at many sites) is given as the rule, the command that lists the sites, and the count the command prints after the edit.
- **Comments:** an entry's comments are the ones it prints: a new file's header, `// ── Section ──` dividers, and a reason a reader would otherwise undo. The implementer adds none. A comment already in the tree stays with its code; a comment on code a task rewrites or deletes goes with it; a comment the task makes false is rewritten in the same commit to say what is now true, in the present tense, with no mention of the change.
- **Hard rules from `CLAUDE.md` hold in every task:** Core reaches the machine only through `Core/Platform`; the host-run half imports no React (`Core/Contract/engineGraph.test.ts`, `Desktop/hostGraph.test.ts`); every channel is declared once in `Core/Contract/bridge.ts`; finite states are unions with a `switch`; no O(N) work on a high-frequency trigger.
- **Speed (A-6):** every phase holds the 10,000-page requirement, measured on `~/Benchmark`, which `.claude/Benchmarks/make-benchmark-nexus.mjs` builds identically on every run. Phase 3's checkpoint measures a property write, a settings toggle, and a page create there against *§Baseline*.
- **Re-pin (J-6):** feature work continues beside this plan. Before a phase is dispatched the orchestrator runs `git diff --name-only <baseline>..main` against that phase's FILES; for each hit, the affected NOW text and printed entry are re-derived against the new code before the implementer starts, and the change is recorded under the phase.
- **Shared checkout:** each phase runs in its own worktree on a `data-layer-<n>` branch. Every commit is path-scoped (`git commit --only -m "…" -- <paths>`, new files `git add`ed first). `.claude/` is its own repository (`git -C .claude commit`). `Dashboard/Ledger/loc-history.json` belongs to no task.
- **Never edit:** `Core/Sync/**` beyond the import lines Phase 3 re-points (`Client/tap.ts`, `Client/tap.test.ts`, `Arrival/captures.ts`), `Sync/**`, `Core/Tiles/**` beyond the lines a task names, `Core/MarkdownPM/**`, `UIX/**`, `Core/Files/walkCache.ts`, `Core/Files/writeEcho.ts` beyond Tasks 3.1 and 3.2's lines, and `Core/Files/atomicWrite.ts` beyond Tasks 1.4, 3.1, and 3.3's lines.
- **Names** are approved as the printed code spells them.

#### Baseline

Recorded 10-01-2026 at `03dde6468`, with the working tree clean but for `Dashboard/Ledger/loc-history.json`, which its post-commit hook rewrites.

- Gates: green at `03dde6468` (typecheck exit 0; 6,873 tests passed and 2 skipped across 511 files; lint exit 0 over 1,402 files).
- **The line measure,** used here, at every checkpoint, and in every report: `git ls-files 'Core/**/*.ts' 'Core/**/*.tsx' 'Desktop/**/*.ts' | grep -v '\.test\.' | xargs grep -hvcE '^[[:space:]]*(//|/\*|\*|$)' | paste -sd+ - | bc` → 67,759 — production lines that are neither blank nor comment; moves by each phase's stated figure
- `wc -l Core/Nexus/mutatePatch.ts Core/Nexus/confirm.ts` → 237, 70 — both files deleted in Phase 3
- `grep -rn "isAdoptedId\|adoptedId(" Core Desktop --include='*.ts' --include='*.tsx' | grep -v "\.test\.\|/out/" | wc -l` → 28 — 0 after Phase 2
- `grep -rn "indexWrittenPage(\|moveIndexPaths(\|deindexPath(\|noteValueWrite(\|noteSidecarWrite(" Core --include='*.ts' | grep -v "\.test\.\|Core/Index/\|Nexus/fileEvents.ts" | wc -l` → 27 — 0 after Phase 3
- `grep -rn "confirmWrite\|confirmContainerWrite\|confirmRegistryWrite\|confirmSettingsWrite\|confirmRescope\|confirmMutation\|confirmRegistry(" Core --include='*.ts' | grep -v "\.test\." | wc -l` → 28 — 0 after Phase 3
- `grep -rn "resolveEntityContexts\|rawContextByNode" Core --include='*.ts' --include='*.tsx' | grep -v "\.test\." | wc -l` → 7 — 0 after Phase 2
- `grep -c '^##### F-' ".claude/Planning/Pommora Codebase Audit.md"` → 51 — rises by the four findings Task 0.2 adds, then falls as each phase removes the findings it resolves
- 10,000-page timings on `~/Benchmark`, taken over CDP on the baseline commit as the first step of execution, before any phase is dispatched: open to first paint, a cold index seed, a walk, a property write to its repaint, a settings toggle to its repaint, a page create to its row → open 3,127 · cold seed 7,095 (its first paint 7,646) · walk 785 · property write 43 · settings toggle 87 · page create 92 — none rises

**START:** `2026-10-01T19:16:44Z`
**END:** `2026-10-03T00:15:58Z` — executed and verified at `b35bc050a`, landed on `active` at `62bab886b`; Finalized by Nathan's ruling on 10-02-2026, after the fourth *§Finalization Review* pass, that its findings, closed in code or answered with the code, close the plan without a fifth (*§Report & Closure*).

#### Phase Reviews

Each phase closed with its own review before the next opened: one opus-high simplification reviewer reading inward and outward, then one opus-high adversarial reviewer, both scoped to the phase's files and commit range, briefed with *§Constraints* and the Decision Log, and holding the phase to *§Core Principles*. The adversarial reviewer attacked the phase on the ground this plan exists for: complexity the phase added or left standing that would produce the failures the plan set out to end, such as two mechanisms that can disagree, a copy that can go stale, a step the next writer can forget, a state reached only through a special case, or more machinery than its behavior needs. Findings were fixed or ruled on before the next phase was dispatched. Two whole-plan reviews followed Phase 4 (*§Final Verification*), a fix round followed the second Finalization pass (*§The Fix Round*), and four *§Finalization Review* passes ran, each by a reviewer given none of that briefing.

Each area below states what the code did at the baseline (**Before**), what it does at `b35bc050a` (**After**), the reason (**Why**), what its checks showed (**Verified**), and the commits that made it (**Commits**), fix-round commits included. A commit that serves two areas is listed under both. Each phase ends with its line figure by *§Baseline*'s measure, as `Net | Total`.

---

### Phase 0: The Audit Says Where Each Finding Lands

The audit's data-layer findings name the phase that resolves them, the six findings this work replaces describe what replaces them, and the problems the investigation found that stay open have entries of their own (K-5). It ran beside Phase 1. **Lines:** none; documentation only.

#### Task 0.1 · Each Finding Names Its Phase

**Before:** The audit's W14 and W15 findings proposed fixes this work replaces (F-186, F-187, F-188, F-194, F-199, F-201), none named the work that would resolve it, and the Verdict held that none of the area needed a redesign.

**After:** Each superseded fix describes the design in the Decision Log's sections B and H. Each finding the plan resolves named its phase and was removed by that phase's reconciliation (*§Reconciliation*): F-186, F-187, F-197, F-199, F-200, F-201, F-205, F-209, F-210, F-211, F-603, and F-620 are gone, F-198 and F-206 remain narrowed to what the plan left, and F-212 reads as what remains of it (C-2). W14's and W15's openers say their findings land through this plan, and the Verdict's "none need a redesign" is corrected for this area (K-4).

**Why:** A finding stays in the audit while it is open and leaves with the work that resolves it, so the audit and the code never disagree about what is done (K-2, K-5).

**Verified:** The "Data Layer" lines in the audit met the count, and each rewritten fix reads as the intended design.

**Commits:** None here: the audit sits in `.claude/Planning/`, which this repository's history doesn't carry.

#### Task 0.2 · Five Findings Added

**Before:** The audit carried none of the problems the investigation found that would stay open after this plan.

**After:** Five findings were added, each re-derived from the code by an agent other than its writer: F-623 (the container schemas in `schemas.ts` have no production reader), F-624 (a delete to the system Trash leaves the page's metadata entry behind), F-625 (trashing a Collection or Set uploads its excluded folders' contents to Sync, which the bundle's path can't match even before `releaseExcludedFolders` empties the list; weight High), F-626 (an in-app create or rename of a Space, or rename of a Context, leaves pages already tagged with the new name unlinked), and F-627, which entered at Nathan's direction and now covers an option remove alone (Task 4.3). The Verdict's Readiness counts follow F-625.

**Why:** K-3. A finding the plan resolves isn't added, since its phase would remove it again.

**Verified:** Every new footnote's `path:line` held its symbol at the time, and the header's **Findings** count equalled `grep -c '^##### F-'`.

**Commits:** None here, as above.

---

### Phase 1: Foundation

The pieces every later phase stands on: one table of entity kinds, settings in their own record, one way to move a file or folder, one name-stepping rule, and four unrelated defects.

#### Task 1.1 · One Table of Entity Kinds

**Before:** Five literals stated overlapping subsets of one list: `NodeKind` (`tree.ts`), `RecordKind` (`record.ts`), `MutableKind` and `CONTAINER_KINDS` (`mutateRequest.ts`), `ContainerKind` (`schemas.ts`), and `KIND_MARK` (`identityMark.ts`). `RecordKind` and `MutableKind` were the same five kinds under two names.

**After:** `Core/Nexus/entities.ts` lists every kind of thing a Nexus holds and what is true of each, and the kind types derive from it: `HeldKind` replaces `RecordKind` and `MutableKind`, the request schema's enums read `HELD_KINDS` and `CONTAINER_KINDS`, and `identityMark.ts` reads each kind's mark from the table. The bridge's view channels, `configReach.ts`, `gather.ts`, and the lock action name `ContainerKind`, and a folder node's kind is `FolderNodeKind` wherever one is stamped, re-minted, or read. `SIDECAR_FILENAME` and its `SidecarKind` stay keyed by folder kind in `Core/Paths/nexusPaths.ts`, since the Agenda folders aren't entity kinds and `Core/Paths` imports nothing from `Core/Nexus`; the table has no reader column, since the event arm and the walk choose each kind's reader in their own `switch` (A-8). The kind lists past the host are F-212's.

**Why:** C-1. Adding a kind is one row, and a row missing a fact fails the typecheck.

**Verified:** The greps for the five old names found nothing, and adding a key to `ENTITIES` without its row, or an `AgendaKind` without its row, failed `npm run typecheck`.

**Commits:**
- `2254514d3` one table lists every entity kind, and the five hand-kept kind lists derive from it
- `d1569b6af` the bridge's view channels, configReach, gather, and the lock action name the container kind as ContainerKind
- `30462ecc8` tileBodyUnder is fileEvents' own and its cases are asserted through classifyEvent, and a folder node's kind is FolderNodeKind

#### Task 1.2 · Settings in One Record

**Before:** `NexusTree` carried eleven configuration fields on its root beside `collections` and `contexts`. Five caches were a `WeakMap` keyed on the root (`treeIndex.ts`, `valuesChanged.ts` twice, `remintLedger.ts`, `contextOptions.ts`), and every configuration patch built a new root, so a settings toggle discarded all five. The window kept `personalization` and `commands` a second time on its store (`configSlice.ts`) and copied them from each tree it applied.

**After:** Configuration sits in one record, `tree.config` (`NexusConfig`), so the root holds the Nexus's identity, its entities, and that record, and `profileSubtitle`, which nothing read, is gone. Every tree-derived table keeps its value through `entityMemo` (`tree.ts`), keyed by the Collections and checked against exactly the inputs its build reads, compared in a loop so a hit allocates nothing; `contextOptions.ts` keys on the Space identity map. An order change on disk keeps the whole held order record (`config.order`) current and pushes it. The window reads settings from the tree through `personalizationOf` and `commandsOf`, and `withOwnSettings` (`configSlice.ts`) keeps the window's value for a setting with an ask in flight, since an older tree landing after a newer toggle would roll it back; the window's `install` stabilizes after it, so a push that lands mid-toggle keeps the held tree when nothing else moved.

**Why:** D-3 and the F-194 ruling: a toggle neither rebuilds every lookup nor rolls back. A sibling record beside the tree would have threaded a second argument through `treeIndex.ts`'s 43 importers, icons resolved at display time would have spread the icon rule across every surface that draws one, and re-keying the caches alone would have left settings where they were.

**Verified:** The reader-site greps found no moved field read from the root and no store copy of the two settings, and no `WeakMap` keys on a tree. New tests show the lookups surviving a configuration patch and an in-flight setting surviving a push of an older tree. About thirty fixture files follow `config` in setup only, and the watcher case for an order list that moves no entity asserts the push that list now makes. Phase 1's timings at close, beside a baseline rerun (ms): open 3,046 (3,067) · cold seed 7,215 (7,222) · walk 789 (789) · property write 41 (44) · settings toggle 78 (87) · page create 91 (91).

**Commits:**
- `8e1e348f1` configuration sits in one tree.config record, every entity lookup survives a settings write, and the window holds settings once
- `63c32e5fb` an order change on disk keeps the whole held order record current
- `67b061b63` the view host reads page metadata through one local, and creation reads the tree off the state it holds
- `2270395cc` a push while a setting is in flight keeps the held tree when nothing else moved, and the entity table keeps its kind type private
- `db6c0c626` personalizationOf imports sit with the session store's, and the watcher's batch chain is named for what it orders
- `24567921f` every tree-derived table keeps its value through entityMemo, keyed by the Collections and checked against exactly the inputs its build reads
- `4f6c75e27` a tree memo's hit compares its inputs in a loop against the values it kept, so a lookup allocates nothing and holds no previous tree
- `06566dd34` the settings decoder and the live-tree patch name the event arm and the walk that answer them
- `77a73c396` each personalizationOf import sits beside its file's other Session imports
- `e18689a72` entityMemo states what it keys on and that a caller lists every other tree field its builder reads
- `d5e8081b7` a setting with an ask in flight keeps the slice's value, since an older tree landing after a newer toggle would roll it back

#### Task 1.3 · The Menus Follow a Commands Change

**Before:** `liveTree.ts` assigned the held tree at five sites, `patchLiveTree` bumped its epoch before calling its transform even when the transform answered the tree it was given, and `Desktop/main.ts` refreshed the native menus only at launch and after an adoption, so a shortcut edited in `settings.json` left the menus on the old chord until relaunch.

**After:** One private `hold` assigns the held tree and calls the commands tap, which `Desktop/main.ts` registers through `setCommandsTap`, when `config.commands` changes by value. Every tree that becomes the held one passes through `hold`, the open's seed among them, which is the reason it sits there rather than in the settle. `patchLiveTree` bumps the epoch only when its transform answers null or a different tree, or when no tree is held, so a patch that leaves the tree as it was doesn't restart a walk in flight.

**Why:** I-1's menu defect.

**Verified:** `liveTree.test.ts` covers the tap and the epoch. On a scratch instance, driven by the orchestrator at Nathan's instruction (10-01-2026), an edit of `commands['new-page']` in `settings.json` moved the File menu's New Page item from ⌘⇧N to ⌘⇧Y without a relaunch, and the restored file moved it back.

**Commits:**
- `c9931c3f7` the native menus follow a commands change, and a patch that leaves the tree as it was doesn't restart a walk

#### Task 1.4 · One Function Moves a File or Folder

**Before:** Nine sites wrote `recordWrite(from); recordWrite(to); await machine().rename(from, to)` by hand under different policies. `relocatePage` (`page.ts`) took the source's lock and reported the rename; the folder movers (`folderEntity.ts`) took no lock and left the report to `landedFolder`; `settleBundle` (`bundle.ts`) and restore (`spend.ts`) never reported; the Context cascade's live moves reported without a lock and its replay's moves did neither; and `migrateContainerSidecar` (`adopt.ts`) did neither, so its rename reached no settle.

**After:** `relocate` (`Core/Files/atomicWrite.ts`) is the one move: under the source's lock it records both ends for the echo and renames, then notes the move as an own event (Task 3.1), runs its `landed` step, and reports the rename to Sync. Page and folder renames and moves, delete's bundle arm, restore, the Context cascade's five moves, and the sidecar migration all call it, so trashing a Collection moves it on Sync instead of deleting and re-uploading every page. A rename's and a restore's replies carry no path, since the window reads where each landed from the push.

**Why:** F-2: one move under one policy, reported to Sync the same way whoever calls it.

**Verified:** The remaining raw `machine().rename(` sites move no held entity. A new test shows a Collection delete and its restore each reporting one rename with the folder's two paths and no page write inside it, the restore's report arriving once the settings hold its excluded folders again.

**Commits:**
- `69c25d0e9` one relocate moves every file and folder under its source lock and reports the rename, so delete and restore move a Collection on Sync instead of re-uploading it

#### Task 1.5 · One Name-Stepping Rule

**Before:** Restore's `freeName` stepped from a name's bare form, while `createDisambiguated` (create, a from-create rename, asset adoption) appended to whatever it was given, so a taken `Ideas (2)` became `Ideas (2) (2)`.

**After:** `createDisambiguated` (`Core/Paths/names.ts`) takes a probe for whether a name is held and, when its first attempt finds the name taken and the name ends in a counter, steps from the bare name as `freeName` does: `Ideas (2)` becomes `Ideas (3)` for a create, a from-create rename, an adopted asset, and a restore alike. A Space create steps its name inside `createSpace` against the held tree.

**Why:** F-3.

**Verified:** New cases in `names.test.ts`: with `Ideas` and `Ideas (2)` held, creating `Ideas (2)` lands `Ideas (3)`; with only `Taxes (2024)` held, creating `Taxes (2024)` lands `Taxes (2024) (2)`.

**Commits:**
- `3e352f2f0` one name-stepping rule, so a taken Ideas (2) becomes Ideas (3) for a create, a from-create rename, and an adopted asset as for a restore
- `f26d137e1` minted states why a mutate create carries the window's ID while a tile's or property's learns it from the reply, and createDisambiguated why it states freeName's base rule again

#### Task 1.6 · Restore Shares the Cascade's Rewrite

**Before:** Restore rewrote a Context key in each Space sidecar with its own copy of the cascade's merge (`rekeyPassengers`, `spend.ts`), which dropped entries that weren't strings and dropped an emptied key where the cascade kept both. Three loops (`restoredSpaceTitles`, `gatherContextEvidence`, `trashedHolders`) each read every Space sidecar's `id`. Restore re-checked after `resolveRecord` that its target sat inside the Nexus, outside the Trash, and in the resolver's directory, and `holdings.ts` documented a `restoreWorld` that no longer existed.

**After:** `rekeyContext` (`contextCascade.ts`) is the one Context rekey, used by a live rename and a restore alike, and `spaceIdsIn` (`spaceSidecar.ts`) is the one read of every Space's id. The path guard is gone: a Context record's title parses through `contextEntry`, whose `holdsName` refinement (`Core/Contexts/contexts.ts`, `Core/Paths/names.ts`) refuses `/`, `\`, NUL, `.`, `..`, and the empty name; a page's and a Space's names are directory entries, and a Collection or Set passes `landingRefusal`.

**Why:** A restore and a live rename merge a key by one rule, and the guard had no input that could reach it.

**Verified:** `spend.test.ts`'s outside-the-Nexus refusal cases stay green without the guard.

**Commits:**
- `8d2bbfe77` restore rekeys a Context through the cascade's own rewrite, one spaceIdsIn reads every Space id, and the unreachable path guard goes

#### Task 1.7 · Three Standalone Defects

**Before:** `writeMatrixFile` wrote `matrix.json` through `updateNexusConfig`, which rebuilds a corrupt file from its last read, while a delete's configuration reach wrote it through `editJsonStrict`, which skipped a corrupt one. `writeFreshId` (`remint.ts`) answered false for a Context, so two registry entries sharing an ID stayed that way. `whileAdopting` (`session.ts`) counted overlapping adoptions and let them interleave.

**After:** The delete's matrix edit calls `updateNexusConfig(root, 'matrix', …)`, so one writer and one policy hold the file. `writeFreshId`'s Context arm calls `remintContextEntry`. `whileAdopting` runs each adoption after the one before through `inTurns` (`Core/Platform/inTurns.ts`), the one helper behind every serializing chain in the app.

**Why:** I-1's three remaining defects.

**Verified:** New tests: a delete over a corrupt `matrix.json` leaves a readable file and sets the damaged one aside; two registry entries sharing an ID open with distinct IDs; two overlapping adoptions run in order.

**Commits:**
- `fd3e96c06` matrix.json has one writer, a duplicated Context ID re-mints, and two Nexus opens run one after the other
- `c16a91726` inTurns runs each step after the one before it settles and answers its own result, so the adoption, settle, reseed, Sync, undo, and watcher-batch chains are one function rather than six hand-written tails

**Phase 1 Lines:** +88 | 67,847, against a stated +80 (+75 to +87). The entries landed at their printed size; the excess is Biome re-wrapping reader lines the `.config.` insertion pushed past 100 columns, and the `satisfies` clause in `entities.ts`. `Desktop/main.ts`'s +2 sits outside the measure. The increase buys one list of kinds, settings held once with a toggle that neither rebuilds every lookup nor rolls back, and every move reporting to Sync through one function.

---

### Phase 2: One Reader Per Kind of File

A page's identity is decided by one rule wherever a page is read, a folder's and a Space's node by one function, and nothing is held under a made-up ID: a file without one is stamped, and one that can't be read or stamped is reported with Try Again. Phase 3's one path reads through these readers.

#### Task 2.1 · One Page Parser

**Before:** Five sites paired `splitFrontmatter` with `admitContentFile(…, 'page')` by hand: `readPageRecord`, `stampPage`, `pageAdmission`, `sweepAdmitsBody`, and `extractPageIndex`, which parsed the frontmatter twice. `readPageDetail` paired nothing: it took any string `ID:` or minted a temporary one, so `page:open` opened any file with a string there.

**After:** `parsePage` (`Core/Files/pageFile.ts`) turns a page's text into its frontmatter and its admission, and every page read goes through it: the walk's record, the page a tab opens, the index's rows, the stamp, and the sweeps' gate (`sweepAdmits`). `readPage` answers a `Result`: not-found for an absent file, and `NO_FILEABLE_ID` ("That page has no ID Pommora can file.") for anything but a member, the one statement of that refusal, which the stamp's caller and the metadata writer return too. `page:open` refuses what admission refuses. The name `openPage` belongs to the link opener alone.

**Why:** D-1 and E-2: one rule decides a page's identity, and a page with a foreign `ID:` stays out of the app everywhere.

**Verified:** `admitContentFile(` appears at its definition and in `parsePage` alone; the read's tests show a member opening and `ID: 42`, a Task's ID, and no ID each answering the refusal.

**Commits:**
- `e62567f22` one parsePage reads a page's frontmatter and admission everywhere, and page:open refuses a page admission refuses
- `ba0f982bc` the sweep's admission gate reads identity and round-trip in one function, with the body-only half that nothing called folded in
- `c5ecc43b6` the refusal of a page with no fileable ID is stated once in pageFile, and adopt and the metadata writer return it
- `f6333d6ef` pageFile's read of a page into its detail is named readPage, so openPage names only the link that opens one

#### Task 2.2 · One Builder per Folder and Space Node

**Before:** `readSet` and `readPageCollection` (`readNexus.ts`) and `patchContainerFromDisk` (`watchPatch.ts`) each assembled a container node from a sidecar, two of them restating the Collection-only fields, and `readSpace` and `patchSpaceFromDisk` each assembled a Space node.

**After:** `containerNodeFrom` (`containerFields.ts`) and `spaceNodeFrom` (`spaceSidecar.ts`) build each node from its sidecar's parsed content, for the walk and the event arms alike; each reads its own fields and answers null for a sidecar with no `id`. The walk reads both container kinds through one `readContainer`. The property registry keyed by ID that the container builder reads is built once, by `registryOf` beside `orderedDefs` (`propertiesRegistry.ts`).

**Why:** D-1: a node built two ways is two copies that can drift.

**Verified:** The container and Space parity cases (a patched node equals the walk's) stayed green, and the node factories have no caller outside the two builders.

**Commits:**
- `dfc3946c3` one builder per folder and Space node, the walk lists what it can't read with a reason instead of minting, and a missing ID is stamped at the open and the settle
- `a661f3ff6` a container's and a Space's node builder reads its own fields, so each node has one function and its tests read the node
- `889c203f9` the property registry keyed by ID is built once by registryOf, beside orderedDefs, for readNexus and fileEvents

#### Task 2.3 · The Walk Lists What It Can't Read

**Before:** `tree.unreadable` was a list of paths. The walk minted `adoptedId(rel)` for a page, Set, Collection, or Space with no ID, and `adoptedId(root)` for a Nexus whose identity had none. A page admission called unknown was listed with no reason and never cached, so each outside save of it walked the Nexus. A container whose sidecar didn't parse was listed and still held, under a temporary ID with default fields. A second pass over the finished tree wrote Context links onto nodes the parse cache shared (F-211). The window never read the list.

**After:** The walk mints nothing. Each entry on `tree.unreadable` carries its path, the kind its lister resolved, and a reason: `missing` (no ID), `malformed` (a foreign ID), `contradicting` (a Pommora ID of the wrong kind), or `unparsed` (a file that doesn't parse, a page whose frontmatter can't round-trip among them). The list is held in path order and written through `listUnreadable` (`treePatch.ts`), so a held tree and a fresh walk differ only where their entries do. `readPageRecord` answers a `PageRecord`, read or unread by its `kind`, and both are cached. Context links resolve as each page and Space is read (`contextLinker`), on a copy of the cached node (F-211). Each root folder is resolved once: a folder no Agenda claim takes resolves as a Collection, and `adoptsAsCollection` (`folderKind.ts`) decides from its sidecar or its content. A Space folder without a sidecar is a plain folder and isn't listed. A Nexus whose identity has no ID takes `unidentified-<hash>`, and `readNexus.ts` names what produces one.

A Collection or Set whose sidecar doesn't parse stays out of the tree with what lies beneath it, and `withheldIn` (`tree.ts`) keeps what belongs to its pages: a tab's target and back-stack, page slots, the selection, window tabs, and glance pins reconcile through `reconcileWith`; pinned tabs keep their place, derived in one pass (`derivePinnedTabs`); a delete still strips links from those pages; and the ledger carries their entries. A schema change counts each such folder as a skipped file (`damagedFolders`, `reachConfig`), so its warning shows and the journal's replay reaches the folder once it reads; `collectionFolders` includes a damaged Collection, so its pages are swept with the rest; and a property delete marks its record partial for one. What `withheldIn` keeps is kept by path, so renaming or moving the parent of a damaged Set closes the tabs and pins on its pages.

**Why:** E-6 (no temporary IDs), E-7 (a damaged folder stays out, with what belongs to its pages kept), and F-211. Without the damaged-folder count, an option or property operation passed a damaged folder in silence and cleared its journal, so nothing brought it current once it read (Nathan, 10-01-2026).

**Verified:** `readNexus.test.ts` shows an ID-less page, an ID-less Set, an `ID: 42` page, a Task's file in a Collection, a corrupt Set sidecar, and an ID-less page whose frontmatter is a YAML list each absent and listed with their reason; a second walk of an unchanged `ID: 42` page parses nothing; a Space renamed on disk leaves the first walk's page objects as they were. A Set corrupted mid-session keeps the tabs, window tabs, glance pins, and pinned tabs on its pages, a delete still strips their links, and its repaired sidecar's event holds it again without Try Again. The assertions that followed E-6 and E-7 changed as each VERIFY listed, and three tests that asserted only a temporary-ID filter retired with it.

**Commits:**
- `dfc3946c3` one builder per folder and Space node, the walk lists what it can't read with a reason instead of minting, and a missing ID is stamped at the open and the settle
- `5db0b1584` a schema change counts a Collection or Set whose sidecar doesn't parse as owed, and reaches a damaged Collection's pages
- `12c0ea662` a property delete marks its record partial for a Collection whose sidecar doesn't parse, and two comments say what holds now
- `dfe711a01` pinned tabs derive in one pass, each ref answering its live tab or the withheld tab it held before
- `cbd521be5` derivePinnedTabs takes the tabs it held before as a required argument
- `74dd71571` the unreadable list holds one order, by path, so a held tree and a fresh walk differ only when their entries do
- `4ca4e49ac` a folder's unreadable entries land in one step with one sort
- `1d17c2a67` repointing a tree's unreadable list takes a tree and answers one, so a removal has no fallback to carry
- `4881651e1` the root-derived Nexus id names what leaves a tree without one
- `917b408fa` whether a root folder adopts as a Collection is decided once, for the adoption pass and the walk alike
- `c12e44bd0` an unreadable entry carries the kind its lister resolved, so the stamp and the filters read it rather than re-deriving it from the path
- `2c4677708` the unreadable list's comparator and filters sit beside listUnreadable, so the tree's type file imports only types
- `03f77099d` only a node can be listed missing, so the stamp has no registry arm to skip
- `5dc743088` an unreadable entry's kind answers what it is wherever that is asked, and a path is read only for where it sits
- `7870339fa` a root folder no Agenda claim takes resolves as a Collection, and its sidecar or content decides the rest, so the walk resolves each root folder once
- `b9555ced9` the tree patch's header names the unreadable list's order and filters it holds
- `f9849b767` a single folder's read takes the Agenda-free kind context from agendaContext, so the empty context is written once
- `a0c1338ca` a page read answers read or unread by its kind, so no reader tests which key the result carries
- `ba794d3cd` a walk lists no Space folder without a sidecar as unreadable, since such a folder is a plain folder

#### Task 2.4 · An ID on First Sight

**Before:** The open ran `stampAdopted` before its walk, which through `stampTree` opened every page one at a time to stamp the ones with no ID, and the walk then read every page again. Mid-session nothing stamped except `stampListed` and `ensureFolderId`, on demand, and nothing stamped a Space; a file made outside the app was held under a temporary ID until the next open.

**After:** The open stamps before it reads and again before it holds the tree. `stampAdopted` first stamps what the walk can't list (a folder with no sidecar, where the walk stops; an Agenda folder's files, which it never lists; and the Agenda re-home). The open then reads the Nexus, stamps every file the read lists missing its ID (`stampMissing`), and reads again while a stamp lands; only then does it seed the held tree and run the ledger on it, whose re-mints land as own events, a Set's, Space's, or Context's by a walk the open's settle pays. `handlers.ts` states why it reads again rather than patching: a first adoption stamps every page, and one more read costs less than a patch per stamp. A page with a foreign ID is written over only by its Try Again. `seedLiveTree` clears the walk slot, so a walk in flight installs nothing over the open's tree, and a walk that fails drops the held tree, so no tree stands in place of one where two entities share an ID (F-210).

Mid-session, a page missing its ID is stamped by its own event, by Try Again, or under a folder a change of scope admits; `stampable` (`fileEvents.ts`) is the one rule, and its comment states the reason. A folder's read leaves any other page missing its ID out of the tree until the page's event or the next full read lists it, except the read of a folder the tree listed unreadable for a reason other than a missing ID, which lists them, since a note added while the folder couldn't be read has spent its event. A walk lists such a page and leaves it unstamped. A folder or Space that a walk or a folder's read lists missing its ID is stamped in that settle, since its stamp writes a sidecar no other writer holds, and a Space the tree listed unreadable lands from its stamp by a walk, so the pages tagged with it gain their link. A page event under a folder whose stamp is owed waits for that stamp, and the watcher's batch applies it once more after the stamp lands, so the folder's read decides what the file is. A change of scope is seen whether the settings event or a walk reads it first (`oweRescope`).

**Why:** E-6 and F-197. A stamp replaces the file through an atomic rename, so a stamp landing while an outside tool is still writing a note loses the bytes written after it; the watcher reports a file once it stops changing, so a page's own settled event is the evidence that its writer has finished, and a path newly in reach (Try Again, a folder the scope admits) has no events coming. Duplicate IDs keep today's re-mint at the next open (J-4).

**Verified:** Tests at `b35bc050a`: an open stamps a folder of ID-less notes and holds each under the ID in its file, reads once when it stamps nothing, and holds a page tagged with a Space it stamped; a reopen that re-mints a duplicated page, Set, Space, or Context agrees with a fresh read (`handlers.test.ts`); an ID-less page added while the watcher runs is stamped and held without a walk, and one whose own event hasn't settled isn't stamped by another write's walk (`watcher.test.ts`); a walk leaves a page it lists for the page's own event, a stamp never lands on a file the batch that listed it is still reading, a note arriving with a sidecar-less folder keeps every byte of a later rewrite, and un-excluding folders of ID-less notes stamps and holds them (`settle.test.ts`); a walk in flight installs nothing over the open's seeded tree (`liveTree.test.ts`). Open fell from 3,024 to 1,762 ms at Phase 2's tip.

**Commits:**
- `dfc3946c3` one builder per folder and Space node, the walk lists what it can't read with a reason instead of minting, and a missing ID is stamped at the open and the settle
- `dfd6f6caf` the open pass's failure log claims nothing about the baseline
- `35502d3f5` a folder a walk lists without an ID is stamped and settled in the same flush, so un-excluding a folder holds it and its notes
- `670b863c3` the open holds its one read and stamps against it, so each stamp lands as an own event and neither the open nor the ledger walks again
- `3aec9778f` the cascade fixture's page is dated still, as a note written before the session is
- `dc569c8ce` a page a folder read or a walk lists missing its ID is stamped once it has been still for the watcher's settle, so a note still being written keeps every byte
- `687111720` the open stamps what its read lists and reads again while a stamp lands before it holds the tree, so a first adoption costs one more read and a stamped Space holds its tagged pages
- `ecd9ed5e4` a Space the tree listed unreadable lands from its stamp by a walk, so the pages tagged with it gain their link
- `92038c669` the stillness rule is named onlyStill and STILL_MS and states what each route does with a page not yet still, and the settle's walk loop is walkWhileOwed
- `5f129bb90` a page missing its ID is stamped by its own event, or whole by the open, a change of scope, or Try Again, with no clock read, and a page whose event was spent on a folder not yet held waits in still for that folder's read
- `9ed94a281` a page missing its ID is stamped by its own event, or by a listing under a folder Try Again or a change of scope newly brought in reach, and nothing about a page's stillness outlives the event that proved it
- `bf5e2117f` a page event waiting on the stamp of a folder above it applies once more after that stamp lands, so the folder's read decides what the file is, and a settle landing mid-pass keeps the walk owed and the paths in reach for that pass
- `e0de8c3d7` only a watcher's batch applies again the page events that waited on a folder's stamp, since the app's own write under such a folder is held or left by that folder's read
- `dce3279e4` a folder's sidecar event reads the folder even while its stamp is owed, and a batch's replay places the events that waited, one per path, without indexing them again
- `9e66c9c41` a walk that reads a changed scope before the settings event owes what that event would, through oweRescope, so a settings file rewritten outside re-arms the watcher and stamps what came into reach
- `b35bc050a` the read of a folder the tree listed unreadable lists the pages missing their ID it finds, since a note added while the folder couldn't be read has spent its event

#### Task 2.5 · Temporary IDs Deleted

**Before:** `ids.ts` held `ADOPTED_PREFIX`, `adoptedId`, and `isAdoptedId`, and eleven places special-cased a temporary ID: the watcher's and the confirm's walk arms, `reorder.ts`'s `persistable`, the filters in `creationOrder.ts`, `bandRouter.ts`, and `remintLedger.ts`, `stampListed` with the holder reads in `cascade.ts` and `keyHolders.ts`, `pageMetadata.ts`, and the guards in `NavList.tsx` and `navigationSlice.ts` (*§Baseline*: 28 sites).

**After:** None of them exists. The reorders write the IDs they're given, a property strip reads a holder's ID from its frontmatter alone and keeps a holder with no ID out of the strip, a page's metadata write finds its page's ID in the held tree, and `ensurePageId` serves the restore scrub alone.

**Why:** E-6 ends temporary IDs. A temporary ID was a second identity that changed when the file was stamped, which pins refused and recents stored.

**Verified:** `grep -rnE "adopted-|[Aa]doptedId"` finds nothing; the adopted-ID tests are deleted, and their fixtures take a ULID.

**Commits:**
- `93a1aba4f` temporary IDs go, so order writes, the ledger, and a property strip take the ids they're given, and a page's metadata write reads its ID from the held tree

#### Task 2.6 · The Unreadable Notices and Try Again

**Before:** The unreadable list rode the tree to the window, which never read it, so a file the app couldn't read was absent with no word to the user.

**After:** When a tree the window installs lists a new entry, it posts one notice naming the first new one, in Nathan's words and worded by what Try Again can do (E-8): **'Item' contains invalid metadata** for a file the user corrects first (`contradicting`, `unparsed`), and **'Item' contains unreadable metadata** for one Try Again repairs (`missing`, `malformed`). Try Again sends `retryUnreadable { path }`, which acts on that one file: for a `missing` or `malformed` entry it owes the file's stamp, through which `stampMissing` writes over a foreign ID on the user's word (E-3), and marks the path newly in reach; every Try Again owes a walk, which drops what now reads, and a `contradicting` or `unparsed` file is written by nothing.

**Why:** E-2, E-3, E-4, E-7, and E-8.

**Verified:** New tests cover each notice, an unchanged list posting nothing, Try Again stamping an `ID: 42` page and rewriting only the named one of two, and writing nothing for a Task's file or a repaired Set. On a scratch instance over `~/Test`, driven by the orchestrator at Nathan's instruction (10-01-2026), a Set whose `_pageset.json` was corrupted posted the invalid-metadata notice with Try Again while the page tab open on it stayed, and returned when the file was fixed; a note with `ID: 42` posted **'Foreign' contains unreadable metadata**, and Try Again stamped it and the page appeared. The pin wasn't driven, since built output exposes no store.

**Commits:**
- `ff2de4e57` a file the Nexus can't read posts a notice worded by what Try Again can do, and Try Again stamps or re-reads the one file it names
- `5adb92ab3` a retry owes its walk through oweWalk, so the owed record is written only beside its own module and the settle
- `bc1a7fd3d` Try Again owes a page with a foreign ID like one missing its ID, and stampMissing writes over the foreign one, so retryUnreadable stamps nothing inline and the open passes only the files missing their ID
- `7787c0258` Try Again owes a stamp only for a file missing its ID or holding a foreign one, so a contradicting or unparsed file keeps only the walk and never leaves the window's unreadable list for a turn

#### Task 2.7 · The Index Seed Commits in Batches

**Before:** `seedContentIndex` wrote each page's rows as its own run of autocommits, and `upsertPageIndex` (`Desktop/Store/stores.ts`) prepared its four inserts and `clearPath`'s deletes on every call; `inTransaction` wrapped only the key-value store's rows.

**After:** The seed reads files as before, queues each read page, and flushes every 200 (`SEED_BATCH`); `upsertPageIndexes(rows)` prepares its inserts once per call and writes the rows in one transaction, and the memory store loops. A flush checks each row for a fresher one a maintaining writer left, and the database-identity bail runs before every flush. A page written in the app has its rows written by `indexWrittenPage`, where they are read. The seed keeps its own stat-gated read, which covers the files the tree doesn't hold (root files, unadopted folders, the Agenda folders). A page read into a batch and renamed or trashed before its flush leaves its old row until the next open's prune.

**Why:** F-198, which remains narrowed to the index's path renames and removals and Sync's record reset.

**Verified:** A two-row batch whose second row can't serialize leaves neither row; a cold seed fell from 7,067 to 2,605 ms at Phase 2's tip.

**Commits:**
- `df4a2db24` the seed commits its pages in batches of 200, each one transaction with its inserts prepared once
- `b5b80cccb` a written page's rows go to the store where they are read, and an Agenda folder's stamp names its kind directly
- `1989bddba` the content index contract upserts one page through a local helper over the rows signature

**Phase 2 Lines:** +93 | 67,940, against a stated +25 (+20 to +32). +44 is `Core/Testing/storesContract.ts`, a test-support file the measure counts, whose call sites the formatter re-wrapped for the rows signature (a local helper won about 40 back in Phase 3); about +18 is the formatter wrapping lines the entries printed shorter; +14 is the damaged-folder count; the simplification review took 6 back. The increase buys the two notices and their Try Again, the reasons on the unreadable list, the stamp step, the rule that keeps what belongs to a damaged folder's pages, and the seed's batched commits. Phase 2's timings ran with every phase's after Phase 4's code landed (Nathan, 10-01-2026; *§Report & Closure*).

---

### Phase 3: One Path for Every Change

A file the app writes is applied the way a file an outside tool changed is: as an event, to the one step that keeps the tree, the index, and the window's pushes current. The hand-built system that confirmed the app's own writes is gone, and the window is sent what changed instead of the whole tree.

#### Task 3.1 · Every App Write Reports Itself

**Before:** `recordWrite` (`writeEcho.ts`) saw every app write before it landed and kept only its hash, for the watcher to drop the echo. `atomicWriteFile`, `atomicWriteBinary`, `relocate`, and `discardFile` were the four ways a Nexus file was written, moved, or removed, and the editor's own body save was told apart from every other page write by the argument `writeBody` handed the value ledger.

**After:** `noteOwn` (`Core/Files/writeEcho.ts`) reports each landed write to the own tap as a `FileEvent`: a `Changed` or a `Moved`. `Changed` is a union on `origin`: a watched event alone carries `written`, the hash its arrival named, and the app's own alone carries `text` and `bodyOnly`, each member naming the other's keys as `?: never`, the idiom `Settings/frames.ts` and `Sync/Client/call.ts` already use, so a reader reads a field directly and only a question of who wrote it asks `origin`. The text writers report `change`, since the tree and the index take an add and a change alike; the binary writer reports `add`, since only an add lists an asset; `relocate` reports a `move` after its lock releases and before its `landed` step; `discardFile` reports an `unlink`; each convention is stated at its site. `bodyOnly` threads from the editor's save to `atomicWriteFile`. A note is awaited inside its write's own continuation, under whatever lock the writer holds, which gives events in the order their writes landed with no queue and no kept text.

The own tap is installed when `settle.ts` loads, and `settle.ts` states why: the settle's imports reach `Core/Files`, so a writer importing the settle would close a cycle, and the tap is the same function for the life of the process. Sync's landings stay outside edits (H-4): `landBytes` records no echo, the watcher sees the landing, and its event reaches the tree. Sync's write tap stays its own: `recordWrite` registers an echo before the bytes land, which the settle's event can't do, and Sync hears `.trash` writes, which no settle event carries, only through it; moving Sync's tap onto the own event changes when Sync hears a move against the excluded-folder follow, which is F-625's to design.

**Why:** B-1: a write is a file event, applied by the same arms as an outside edit.

**Verified:** New tests beside `atomicWrite`'s show a text write noting one `change` with its text after the file holds it, a preserved-time rewrite noting after the file's time is restored, a `move` the tap can take the source's lock inside, a discard noting an `unlink`, and the editor's save noting `bodyOnly`; with no tap set, every write behaves as before. `noteOwn(` has five call sites.

**Commits:**
- `36cad1eae` every write the app lands notes itself as a file event, with the text it wrote, to one own tap
- `d6dae75db` the body-only flag is named bodyOnly end to end, the unreadable appender listUnreadable, the path comparator comparePaths, and the watcher's batch step drainBatch, so no two of them share a name
- `83e6767d0` the settle reads the body-only flag under the name its push carries
- `2beaa28e3` the own tap states that the writers reach the settle through it because the settle's imports reach Core/Files
- `1ffaff74a` a file event states who wrote it as origin watched or own, so no reader tests whether an own marker is present
- `423ed486b` a file event's Changed is one interface whose origin is watched or own, fileEvents names PageRead, and Delta states why its members carry no kind
- `bc6b69b5d` a file event's Changed is a union on origin, so a watched event alone carries written and the app's own alone carries text and bodyOnly, and each reader narrows first
- `28d7b4550` a file event's Changed names the other arm's keys as never, so every reader reads text, bodyOnly, and written directly and only a fact of who wrote it asks origin
- `843f006ca` the file-event logs name events, and writeEcho's header names its echo window, own tap, and sync and watch taps
- `bab21f745` the text writers report 'change' since the tree and the index take an add and a change alike, the binary writer reports 'add' since only an add lists an asset, and Sync's landing reaches the tree as the watcher's event

#### Task 3.2 · One Module Applies Every Event, and One Settles

**Before:** `applyWatchEvents` (`watchPatch.ts`) classified a whole batch and walked for all of it when one event couldn't be placed. A folder added or removed, a file beside pages that isn't one, `properties.json`, the Context registry, and any path on the unreadable list each classified as a full walk, and each arm read its file from disk. The watcher's `settle` (`watchSettle.ts`) derived every push from the batch's classes and, for the app's own cascade writes, from the value ledger, and a new page or folder was ranked by reading its parent's sidecar for the order list.

**After:** `Core/Nexus/fileEvents.ts` applies an event whoever made it. For each event the index follows first (`indexEvent`), then one arm patches the tree from the one file that changed, reading the event's text when the app wrote it and the disk otherwise. An arm that can't place its event, or throws, owes a walk, and the rest of the batch still applies (H-3).

- **A page** whose ID matches the held node replaces it in place, and changes nothing when equal; any other lands through `placeNode`. A page that doesn't read is listed with its reason and held nowhere, so a foreign-ID page costs no walk on save (H-2). A page in a folder the tree doesn't hold reads that folder.
- **A folder** the tree doesn't hold is read whole and placed, with what it lists unreadable (*§Task 2.4* states which pages it lists); a folder whose parent isn't held reads the parent, and a folder event for a path no longer on disk clears it. A root folder becomes a Collection once it holds content (E-6).
- **Gone** removes what the tree holds at the path. A Collection's or Set's sidecar that left takes its node, and walks only when the folder is still on disk, so a folder removed or renamed outside the app costs no walk (H-2).
- **A move** the tree can make in place (a rename, a move between held containers, a Space or Context rename) is one step; any other is its two ends. A folder landing where an excluded entry already names a path at or beneath it walks and reseeds without re-arming the watch, since no settings write reports that move (`applyMove`; `entryWithin` lives in `Core/Paths/exclusion.ts`).
- **A sidecar** of a held container or Space rebuilds that node from the text. One that doesn't parse takes its container out and lists it `unparsed` (E-7), and its correction arrives as a sidecar event for a folder the tree doesn't hold, which the folder arm reads.
- **The Context registry** regroups in place when its entries are the held groups under their held titles; an entry that arrives or leaves, or a title the Context folder's move hasn't already placed, walks. **`properties.json`** re-points the held definitions, and walks when an outside edit adds one the tree can't resolve alone.
- **Settings, order, homepage, crops, and a metadata month** decode the event's text; a scope that moved lands at once and owes the walk, the reseed, and the re-arm.
- **Still a walk:** a Space or Context that left or came back, a Context entry arriving, `nexus.json`, an Agenda sidecar, a sidecar removed from a folder still on disk, a container whose ID changed under it, and a Space the tree listed unreadable landing from its stamp.

`Core/Nexus/settle.ts` is the one place a change reaches the window. `settleNow`, which a write's gate runs, stamps what its events listed, then runs one settle at a time: the walk the events owed, repeated while one is owed, and one push of what moved; a reseed and a watcher re-arm run on a chain of their own, which a reply joins only when its own settle found the corpus or the scope moved. `settleBatch` is the watcher's turn: it applies the batch, stamps what it listed, applies once more the page events that waited on a folder's stamp, stamps again, and settles. A gate leaves the list to a batch in its turn (`batching`), so a reply never waits on an import's stamps, and `shown` leaves a file whose stamp is still owed out of what the window is sent. Every own write marks the disk moved, so a walk in flight while a Context or Space rename finishes reads again, except the editor's body save, which leaves the frontmatter a walk reads as it was. The owed record (`Owed`) is declared in `fileEvents.ts`, where events owe it, and the settle pays it and empties it in place, so an arm still awaiting its file owes the next settle. The chains are `inTurns` steps (`inTurn`, `reseeding`, and the watcher's `batchQueue`), and the exported names say their job: `settleNow`, `settleBatch`, `recordHanded` (the baseline `nexus:state` hands the window), and `payOwedWalk`. `classifyEvent`, `readShard`, `isConfigPath`, and `syncIgnoredUnder` state that they are exported for tests alone. `Core/Testing/settledMutate.ts` settles a test's write and checks the held tree against a fresh read on every call.

**The held tree moves during an operation,** as each write lands. A tree a writer captured stays a snapshot, since nothing writes a held node in place, and a function that reads the held tree again after a write sees that write: `deleteCascade`, `renameCascade`, and `reachConfig` read correctly either way, and `renameOp` reads `titleHeldOutside` before its rename.

**Why:** B-1, B-5, B-6, H-2, and H-3. The stamping turn moved out of the settle chain because the printed settle stamped from one list shared by replies and the watcher: one of five creates during a 400-note import took 2,171 ms against 12 ms before the phase, and a reply's stamp could land on a note the batch was still reading. The excluded-entry walk covers a landing that already names its new path, which no settings write reports; without it the excluded folder's pages stayed in the tree, search, and links until the next open.

**Verified:** `watchPatch.test.ts`'s cases moved to `fileEvents.test.ts` against the new arms; new parity tests end with the held tree equal to `readNexus` for a folder of notes added outside, a Collection and a Set each removed and renamed outside with chokidar's full event set and no walk, a root folder gaining its first note, `properties.json` edits, a registry reorder, a stray file, a batch whose middle event can't be placed, an `ID: 42` page saved twice, and a Set's sidecar corrupted and corrected outside. Each routine operation has a case through `settledMutate` asserting no walk, and every `settledMutate` call checks parity (34 of 560 had checked nothing before `c686b0c15`). Randomized drives of the real modules compared the held tree, the window's tree, and the index to the disk after each step (*§Final Verification*). By reply latency on `~/Benchmark` at Phase 4's tip, nineteen routine operations answer in 9 to 76 ms (12 to 87 at the baseline) and none walks.

**Commits:**
- `9b237b483` every change is one file event applied by fileEvents, and settle is the one place a change is pushed
- `51a34409e` the file-event, page-record, cached-ids, and tree-entity types stay private to the files that read them
- `942c78188` tileBodyUnder is asserted once per file, and the container parity case names the one mapper both paths share
- `a61f61f0b` a fallback walk takes the asset listing again only when a map is held, so no window is sent one it never asked for
- `1b600fc37` the mutate helper is named settledMutate, after the settle it runs before checking the held tree against a fresh read
- `95121fcdc` an outside batch stamps what it listed in the watcher's turn, so a reply's settle never waits on those stamps or stamps a file the batch is still reading
- `bd0aab8c5` a folder already owed its stamp isn't read again for each file inside it, and a folder landing over an excluded entry reseeds without re-arming the watch
- `8be62d611` a settle's walk that read a file before an outside batch stamped it walks again and holds the stamp
- `2ddb6c7ff` entryWithin lives with the path functions it composes, so the file events read it from the paths rather than the settings writer
- `b5b1504dd` every own write marks the disk moved, so a walk that read it mid-rename reads it again
- `e5681cca7` a folder event for a path no longer on disk clears it, so a late event under a Set the app renamed or deleted lists nothing unreadable
- `616e7f362` a folder whose parent the tree doesn't hold reads the parent, so a root folder whose first note lands in a subfolder is held
- `c686b0c15` settledMutate holds a tree before the mutate, so every call checks the held tree against a fresh read
- `d0ce7ff6f` the settle's header names what it pushes to the window
- `3e10bfebd` the delta, the settle's stamp filter, own-write epoch, and sent baseline, the Contexts lock, the own tap, and the entity table each state why they hold where a reader meets them
- `53002eded` the editor's body save leaves a walk in flight to install what it read, since the frontmatter a walk reads is unchanged
- `424bc6224` the settle's walk steps are named payWalks and payOwedWalk, beside oweWalk, and its owed record is named owed throughout
- `3c903e84a` the settle's exports are settleNow and handed, and the tree delta's are deltaOf and applyDelta, so each name says its job
- `a83d749d1` the own tap, recordWrite, stampAdopted, the settle's second settle, a rename's Try Again, and hold each state their reason where a reader meets them
- `5695d6fe2` the Contexts lock, a rename's Try Again, and the open's stamping state their reason as it now is, readPageRecord answers a PageRecord, and the settle's baseline is taken by recordHanded
- `b690b8e6e` a month's event reads through jsonOf and the event says when the month left, so readShard reads only the disk
- `39a208d03` the settle's fallback walk marks disk as moved and walks itself, so liveTree carries no wrapper for it
- `c16a91726` inTurns runs each step after the one before it settles and answers its own result, so the adoption, settle, reseed, Sync, undo, and watcher-batch chains are one function rather than six hand-written tails
- `a4ff3a1c8` Owed states it is declared where events owe it, and the settle pays and empties it
- `b82aeb216` classifyEvent, readShard, isConfigPath, and syncIgnoredUnder state they are exported for tests alone

#### Task 3.3 · The Confirm System Deleted

**Before:** After a write, its handler called one of seven confirm helpers (`confirm.ts`), which routed through `confirmMutation`, `confirmRegistry`, or `confirmBy` (`mutatePatch.ts`) to a request-keyed transform or a re-read of the file just written. Writers called `indexWrittenPage`, `moveIndexPaths`, `deindexPath`, `noteValueWrite`, and `noteSidecarWrite` by hand beside their writes, so a write that forgot one left a copy stale (B-7), and a landing that moved excluded folders reported `rescope` up through four return types so its handler could ask for a walk.

**After:** `mutatePatch.ts`, `confirm.ts`, and `watchPatch.ts` are gone, and `valuesChanged.ts` is `heldPages.ts`, which holds the host's page lookups alone (`idHeld` and the ID index). `withWriteRoot` (`Core/Contract/handlers.ts`) settles in a `finally`, so a handler that writes a file the tree already reads needs no call of its own (B-8), and one that throws still settles. `mutate` and the property handlers hand their cascade's pages and tile hosts to the settle (`oweCascade`) and push nothing themselves; the open settles after the schema replay and again after the repair sweep. A landing that moved excluded folders rewrote `settings.json`, whose arm sees the scope move, so the settle walks, reseeds, and re-arms; a case-only rename of a folder holding excluded entries costs one walk, as every other such landing does. The held tree has no unpinned accessor (`heldTreeOf` takes a root), and a fallback walk takes the asset listing again only when a map is held.

**Why:** B-2, B-7, and B-8: the second system and every hand-placed call it needed are gone, and a write the tree already reads is picked up without wiring.

**Verified:** The confirm, note, and flush names have no hit in `Core` or `Desktop`; `nexus:changed`, `pages:changed`, `values:changed`, `tiles:changed`, and `assets:changed` are pushed from `settle.ts` alone; *§Baseline*'s hand-placed-call and confirm greps read 0. New tests: a create pushes `nexus:changed` before its reply resolves; a handler that throws still settles; renaming `foo` to `Foo` rewrites its links; one write through each of `views:save`, `schema:add`, `property:rename`, `property:editOption`, `personalization:set`, `exclusions:set`, `exclusions:clear`, `assets:adopt`, and `page:updateBody` leaves the held tree equal to `readNexus` and pushes what changed, B-7's three gaps among them.

**Commits:**
- `d078fbaa8` the confirm system goes, and the write gate settles what a handler wrote, so a write the tree already reads needs no call of its own
- `846bead4a` a view's create and the key-holder confirm describe the write path as it runs, with no optimistic apply or echo window
- `807a18ed7` a governed sweep counts a file whose lock body throws as skipped, since nothing after its write can throw
- `06e53b7f1` the registry's file shape stays private to the module that reads it
- `b1f2dee0a` a property restore finds each recorded Collection by the ID its tree node carries, in place of reading every sidecar again
- `7877ab096` the optimistic setActiveView case retires, and the view override case names the push it survives
- `0ebe6e25b` case titles name the held tree and the push in place of a confirm
- `cf2921442` a page's metadata write finds its page in one lookup, and the not-held refusal is stated once
- `f14dfeaca` a journal's clear records no echo, since the watcher and Sync's manifest both pass over a journal file
- `7baa53673` a configuration pass's reach test takes its folder and scope as two arguments
- `e5ac4e023` a page tile reads its page's ID from the window's own index, and the host's page lookups stay the host's
- `e07bde9d6` a rename and a restore answer no path, since the window reads where each landed from the push
- `02d131857` two case titles name the push in place of a confirming one
- `677bd7baa` a metadata drop asks the held pages whether an id is still held, so the unpinned tree accessor leaves the engine
- `ea2c39e80` the override's settle counter is private to its file

#### Task 3.4 · A New Collection Lands Last

**Before:** A new page, Set, or Space was created with its siblings' order, while a Collection was created bare, so once `order.collections` existed a new Collection sorted to its title's place among the unlisted.

**After:** `createContainerOp` appends a new Collection to the sidebar's order through `appendCollection` (`reorder.ts`) when one is written; with none written, the newest ID already sorts last.

**Why:** F-603 and Nathan's ruling that a new Collection always lands last.

**Verified:** Through `settledMutate`, a created Collection is last in the held tree and after a fresh read, with an order written and without.

**Commits:**
- `6617875de` a new Collection lands last, appended to the sidebar's order when one is written

#### Task 3.5 · The Window Is Sent the Difference

**Before:** `nexus:changed` carried the whole tree, which the window ran through `stabilize` to recover identity. After a `mutate` reply the window applied its own copy of the routing switch (`nexusSlice.ts`) and an optimistic create, and the host's push landed a moment later. `treePatch.ts` held the request-keyed transforms both routing tables called, four node factories, and `orderInTree`, which the window called to paint a drag ahead of its write.

**After:** `Core/Nexus/treeDelta.ts` holds one structural `deltaOf` and one `applyDelta`, generic over plain objects and keyed lists; `Delta<T>` carries the tree's type, so the window installs a whole tree without a cast, and each member's one required key is its tag, which its comment states. The settle holds a version and pushes `{ version, delta }` taken against the tree the window was handed; `applyChange` (`nexusSlice.ts`) applies it, installs a whole tree when one arrives, and asks for the whole tree when the version isn't the next or the difference doesn't fit, and `install` is the slice's one way in for a tree. The routing switch and the optimistic create are gone, and a `mutate` patches its pages without asking for a tree. `treePatch.ts` holds the steps the arms use (`placeNode`, `moveNodeInTree`, `removeNodeInTree`, `listUnreadable`); each node kind has one builder, so the factories are gone; `orderInTree` and `withChildOrder` sit in `Views/Host/pendingView.ts` beside their one caller, and `OrderRequest` is declared beside `CreateRequest` in `mutateRequest.ts`, so `bandRouter.ts` imports nothing from `Views/Host`.

**Why:** B-3. A named change per operation would be the routing table again, kept in two processes; the difference is taken from the two trees themselves, so a write nothing was built for still reaches the window, and its cost follows what changed, since a subtree both trees share is never entered.

**Verified:** `treeDelta.test.ts` shows, over generated pairs, `applyDelta(a, deltaOf(a, b))` deep-equal to `b`, null between equal trees, shared parts kept by identity, and a throw for a member `a` never held; store tests show the next version applying, a gap or misfit asking `nexus:state`, and a window in its error state becoming ready on a whole tree. The deleted transforms and factories have no reference.

**Commits:**
- `ff501007b` the window is sent the difference from the tree it holds, with a version, and applies it in place of its own routing switch
- `47bf30ecd` a mutate patches its pages without asking for a tree it doesn't read, and a whole tree always arrives with its version
- `a6e8f930e` the window stabilizes a tree where it installs one, so a whole tree and a difference land through the same step
- `eba91c5f9` a whole tree installs only through applyChange, so the slice offers one way in for a tree
- `1fe1986d5` a tree's difference carries the tree's type, so the window installs a whole tree without a cast
- `ee462d285` OrderRequest is declared beside CreateRequest in mutateRequest, so bandRouter imports nothing from Views/Host

#### Every Create Carries the Window's ID

**Before:** The host minted every created entity's ID and answered it in the reply. Once the host pushed before replying, a page created from a grouped or sorted view mounted before the window knew its ID, so its seeds and its slot landed a render late and the row jumped; the window carried `NEW_SLOT`, `fillSlot`, `placeAt`'s filter, and `mutate`'s `onCreated` to place a newborn after the fact.

**After:** `minted` (`mutateRequest.ts`) gives an ID-less `mutate` create the ID its kind takes as the request is sent, and the host lands the page, Collection, Set, Space, or Context group under it, admitting only a ULID-shaped ID, as a tile's already is. `useViewCreation.ts` stages the seed override and the order with the ask and takes both back on a refusal; a host create returns its path alone; `createPage` requires its ID, which tests take from `Core/Testing/createTestPage.ts`; the creation hook opens a newborn's title through the `rename` its host hands it; and a Cards create's ghost retires in the commit its card appears. A tile's or a property's create learns its ID from the reply, since its ask places nothing, which `minted`'s comment states. The rename field opens on the reply, one frame after the row, since a rename session is claimed by the path the host decides (F-631).

**Why:** Nathan's ruling (10-01-2026): with the push ahead of the reply, the window has to know a newborn's ID as it asks, and one rule for every kind retired the window's after-the-fact placement.

**Verified:** A dedicated review of the change found no gap; a page create's row paints at 53 ms against 93 at the baseline, at Phase 4's tip.

**Commits:**
- `9d7ae8d3a` a page create carries the ID the window minted, so its seeds and slot are staged with the ask and the push that mounts the row paints it in its band at its slot
- `6d1b3b129` every create the window sends carries an ID it minted as it built the ask, the host lands the Collection, Set, Space, or Context group under it, and the order names it where the placeholder stood
- `aae591c94` a page create requires the ID it lands under, and tests that write a page directly take one from createTestPage
- `2fda55963` the window names a newborn by the ID it sent, and a create's reply carries only the path the host landed it at
- `78e100154` a Cards create's ghost retires in the commit its newborn's card appears, since the flight names the newborn's ID from the gesture
- `c9b3c73c5` the creation hook names every page it lands through the rename its host hands it, so no call site wraps a flight to open its title
- `d7674e875` a host create returns only the path it landed at, since the ID it was given is the caller's already
- `a59a5a39b` every create op names its request by the one Extract over MutateRequest
- `e1cf21a2e` one minted helper gives any ID-less create the ID its op takes, so a creator holds a plain request and is minted where it is sent
- `693e7ab3c` a band's add answers nothing, since nothing reads the flight it started
- `336a188de` a create's ID is admitted only ULID-shaped, as a tile's is, so a malformed one is refused before anything is written

**Phase 3 Lines:** −521 | 67,419, against a stated −465 (−435 to −495). The tasks landed at −492; two simplification agents and the fold after them took about 125 more, 105 of it in `Core/Testing/storesContract.ts`, whose twenty single-row calls go through one local `upsert`; the stamping turn's correction (+29) and the window-minted IDs (+67) gave back about 96.

---

### Phase 4: Contexts and Properties

"Which Spaces does each Context have" is worked out once, from the tree, and every writer and reader asks that one lookup. A Space's own values reconcile as a page's do, and a rename keeps track of the files it couldn't update.

#### Task 4.1 · One Context Lookup

**Before:** To tag one page, color one Space, or rename one Space, `loadContextWorld` (`contextWrite.ts`) read the registry and every Space's sidecar from disk, one at a time, and failed the whole operation when any one wouldn't read; a property write paid for that load whenever `contextDriftPresent` found a tag out of shape, and `resolveContextKeys` and `reconcileGovernedRoot` rebuilt a title table of every Space for each Context key of each page.

**After:** `contextWorldOf(groups)` (`contextResolve.ts`) answers every Context resolution from the groups the tree holds, cached against that array, and `spaceWorldOf` extends it for a Space's own values beside it. `governedWorldOf(root, absFile)` builds a page's world, finding its Collection in the tree it already read. `setSpaceContext`, private to `contextWrite.ts`, takes the Space and Context the tag edit holds, decides each far half inside that file's own read-modify-write, counts a far half it can't write and writes the rest, and adopts the options its far writes found even when the Space's own write fails. `setContextOp` refuses a tag edit only on a Context holding a Space the tree lists unreadable, since that Space would be dropped from the page's list or left with no far half (stated at the refusal), and a write that targets the unreadable Space answers not-found. `createSpace` names its Context's folder from the held tree and steps its name there, and a create against a registry that won't read answers "Unknown Context.". `confirmedKeyHolders` keeps its disk read of Space sidecars, since every sweep that writes Space sidecars lists them on disk, the crash replay among them, which runs before a tree exists; `keyHolders.ts` states it, and moving the sweeps onto the tree together is F-622's.

The Contexts lock holds until the walk its write owed is paid: `underContexts` (`mutate.ts`) awaits `payOwedWalk`, a turn on the settle's own chain, so the next queued Contexts write reads a current tree and no settle pushes between the walk being claimed and its tree landing. A Space or Context delete, and a restore of one, still walk, since members a sweep skipped would otherwise keep a link the walk drops (F-4). A Context entry the tree doesn't hold lands by a walk whoever wrote it, so a Context created over a folder already on disk, or re-minted at open, holds the Spaces its folder holds. An in-app create or rename of a Space, and a rename of a Context, place the node and relink nothing; a page whose kept tag now resolves to it gains its link at the next walk (F-626).

**Why:** F-200, F-201, G-3, and G-4. The lock correction answers a premise the plan stated wrong: the gate paid a delete's walk after the lock released, so a tag queued behind a Space delete landed naming the deleted Space.

**Verified:** The old loader's names have no hit; two calls of `contextWorldOf` on one array answer the same object and a Space rename answers a new one; a tag edit on a Context holding an unreadable Space is refused while one on another Context lands; a Space link edit with one far Space unwritable links the rest and answers the line for one file; a page tag written during a Space or Context delete is refused as an unknown Space. Open and a walk on `~/Benchmark`, with its 10,000 tagged pages and 500 Spaces, fell against *§Baseline*. By reply latency at Phase 4's tip, a Space delete and a Context delete walk (240 and 225 ms, against 432 and 685 at the baseline), and a Space rename and a Context rename place their node and sweep without one (126 and 127 ms, against 184 and 110).

**Commits:**
- `751b1f573` the Contexts lock holds until the walk its write owed is paid, so the next Contexts write reads a current tree
- `7554fda27` every Context resolution asks one lookup built from the tree's groups, a tag edit is refused only on a Context holding an unreadable Space, and a Space link edit finishes the far halves it can reach
- `5129b3d54` the walk a Contexts write owed takes its turn on the settle chain, so no settle pushes the tree that walk is replacing
- `62eb9191c` a page's governed world finds its Collection in the tree it already read
- `33bf18584` a Space's link edit takes the Space and Context the tag edit already holds, and its tests drive the setContext request
- `44ed893a4` the unreadable-Space page tag case goes, since the unknown-Space case already refuses the same write
- `fa452a7d9` a Space's world is built beside the Context world it extends, so a restore reads it without a writer module
- `a0d139615` a Space create names its Context's folder from the held tree, which the Contexts lock keeps current, in place of a registry read per name it tries
- `5d1cadeac` a Space create steps its name inside createSpace, so the Context is looked up once
- `321dd95d7` the key-holder check says why both its loops read from disk, the Spaces through the enumeration the sweeps write through
- `91942537a` a Context created over a folder already on disk owes a walk, so the group lands with the Spaces the folder holds
- `2b499c3a3` a Space link edit adopts the options its far writes found even when the Space's own sidecar write fails
- `7e5abfb50` a Context entry the tree doesn't hold lands by a walk whoever wrote it, so a Context re-minted at open or created over a folder holds the Spaces its folder holds
- `2f88ed2f6` a tag edit refuses on a Context holding an unreadable Space, since that Space would be dropped from a page's list or left with no far half

#### Task 4.2 · The Contexts Lock and a Space's Values

**Before:** `setProperty`, `setSpaceColor`, and `setSpaceRowOrder` (`mutate.ts`) ran outside the Contexts lock every other Contexts write takes, so one could read a Space's path, lose the race to a rename, and write where the folder was. `setSpaceProperty` set one key and reconciled nothing, and `setSpaceContext` and the restore scrub reconciled a Space's Context keys without definitions, so a Space's property values kept whatever shape they were written in.

**After:** A Space's value write, `setSpaceColor`, and `setSpaceRowOrder`, which resolves its target inside the lock, run under `underContexts`, so a write that names a Space by ID lands on it across a rename and one naming a moved path answers the refusal. A page's property write runs outside the lock: it takes the page's own lock, which every sweep takes too, and `preservedChanges` never shrinks or drops a key it can't resolve, so it lands right whether it comes before or after a sweep reaches the page; the lock's comment in `mutate.ts` states that mechanism. The dispatch decides page or Space once (`setPagePropertyOp`, `setSpacePropertyOp`), and a page's property write reads its page once, a missing page answering "Page not found." and an unreadable one "That page could not be read.". `repairedSpace` reconciles a Space sidecar against the registry's definitions on every value or tag write to that Space, and a restored Space reconciles against `spaceWorldOf` with nothing frozen, so an option deleted while it sat in the Trash doesn't return; a restored Space's values clean up as a restored page's do (Nathan, 10-02-2026). A refused Space or Context delete puts back each swept file whole while it still holds the sweep's write and otherwise puts back only the keys the sweep changed, carries on past a file that throws, leaves a page the sweep would no longer admit as it is, and counts every file it couldn't put back in its refusal (`undoSweep`, `governedSweep.ts`).

**Why:** G-3. The page write left the lock once eight pause-harness tests showed it landing right mid-sweep of a Context or Space rename, delete, and restore. Its rollback fix answers what that exposed: a refused delete rewrote a page to its pre-sweep bytes and erased a value written mid-sweep, which a body save could already do at the baseline.

**Verified:** Through `settledMutate`, a color queued behind a Space rename lands on the renamed Space and a value addressed to its old path is refused; a page value written while a Space or Context restore stands lands and the tag is back; a scalar Select on a Space is written back as `[value]`; a value the reconcile can't place is left as written; a restored Space loses an option deleted since. The refused-delete cases cover a value and a body written mid-sweep.

**Commits:**
- `0134cc02d` value writes and Space color and row-order writes run under the Contexts lock, and a Space's own values reconcile against the registry as a page's do, on every write to it and on its restore
- `573d5d672` a property write reads its page once, through the governed write, so a missing page answers as every page write does
- `135fd7454` a governed write reads its page once, and a page that refuses the read answers that it could not be read
- `01df6e180` a page's property write runs outside the Contexts lock, since it resolves its world inside the page's own lock that every sweep takes
- `94952bddc` the mutate dispatch decides page or Space once, and setProperty's page and Space arms each ask mutableTarget for their own kind
- `4597f526d` a refused Space or Context delete returns a swept file whole only while it still holds the sweep's write, and otherwise puts back the keys the sweep changed, so a value or body written since is kept
- `bd44ba07e` a refused Space or Context delete puts back every swept file it can, past one that throws, and counts the files it couldn't put back in its refusal, and a governed file's root is read by rootOf alone
- `29ac4fda9` a refused delete's undo leaves a page a sweep would no longer admit as it is and counts it, and a governed file's root is read by governedRoot

#### Task 4.3 · Renames and Schema Operations Keep Track of Skipped Files

**Before:** `renameContextOp`'s failure arm ran the reverse cascade, discarded what it skipped, and cleared the journal. The Context and Space renames and `renameProperty` ignored a refused journal write and said nothing of the files their sweep skipped. The option and delete operations reported theirs, with Try Again only when the journal slot took their record, since `property:replay` replayed whatever the slot held. Schema operations queued on a promise chain of their own (`schemaChain.ts`), which a quit cut after two seconds.

**After:** A failed Context rename writes the reversed record, cascades back, and settles the journal with what the reversal skipped, and its refusal carries the line for files it couldn't reach. A Context or Space rename whose sweep skipped files answers `unswept(skipped, from)` whether or not the journal took its record, and the reply's `retry` is the same request with `from`; Try Again sweeps `from` to the title the item holds now, answers that nothing moved only when another Context or Space holds `from`, and clears the journal once it reaches everything. A property rename, a property delete, and an option rename answer `owed`, their record, whenever they skipped files, and Try Again hands it to `replaySchemaCascade`; each arm does nothing once the item has changed since, a delete's record reading the property's present definition as a restore. An option remove answers its record only when the journal took it and replays a handed-in record only while the slot holds it, since an option has no identity beyond its value (F-627). `retryOwed` (`PropertyFrame.tsx`) shows the line with Try Again when a record comes with it. Schema operations queue on the `.nexus` folder's machine lock (`serializeSchemaOp`, `propertiesRegistry.ts`), which nothing they run takes, so a quit waits for a schema cascade in flight as it already did for a Context rename. Removing a property keeps the cached values its Collection already holds beside the ones it strips, so a refill a quit cut short loses nothing to the next Remove.

**Why:** G-3 and F-627: a rename, a property delete, an option rename, and an option remove report the files they skipped with a Try Again that reaches them. Crash recovery for a Context or Space delete needs a record carrying the bundle and a replay across both Trash modes, a second replay machine beside the two F-622 exists to merge, so it is F-622's; a delete cut short still leaves its write-ahead record in the bundle, and deleting again finishes it.

**Verified:** A Context rename whose commit fails with a member unreadable leaves a journal the next open completes; a rename over an unreadable member answers the line and a `retry` whether or not the journal took it, its `retry` reaches the member once it reads and clears the journal, and a `retry` after another rename or after another item took the old name changes nothing; each property operation started while another record holds the slot answers the line and its record (an option remove the line alone), and a late replay after the item changed again changes nothing. A gate reported green at `93baa6931` was red on an unhandled rejection from a rename mock answering no `cascade`; the mock was fixed in `b70e0062e`, and every later close ran the gates directly.

**Commits:**
- `93baa6931` a rename, a property delete, an option rename, and an option remove report the files they skipped with a Try Again that reaches them, and a failed Context rename journals its way back
- `b70e0062e` the property frame's rename mock answers the cascade a rename's reply carries
- `eaaddaea2` a failed Context rename's line reads its skip count directly, and an option rename stages its record where it runs
- `1132fe0a4` a delete's record replayed from its answer leaves a restored property alone, since that answer exists only once the registry let the property go
- `6e2d61669` an option remove offers its record only when the journal took it, and a record handed back replays only while the journal still holds it, since an option added again reads as the one still owed
- `9a5a8d7c2` a Space rename's retry stands down once another Space takes the old name in any case, since the sweep it would run matches titles case-insensitively
- `9e1705d1c` an option remove's skipped-files line shows even when the journal kept no record, offering Try Again only when it did
- `669b9ecc0` the case-differing retry case tags the page the setup already wrote, so no fresh unreadable file rides the held tree's event order
- `a2a2f7bb4` a Context or Space rename reports every file its sweep skipped with Try Again, and a Try Again that reaches everything clears the journal
- `329a85a67` schemaChain states why schema ops chain apart from the machine's lock, and which of their cascades a quit leaves to the journal
- `52eaca4a9` schema operations queue on the .nexus folder's machine lock through serializeSchemaOp in propertiesRegistry, so a quit lets a schema cascade in flight finish as it does a Context's
- `a90c7d2dc` a rename's Try Again sweeps the title it left to the title the Context or Space holds now, and answers that nothing moved only when another holds the old title
- `511beb2eb` removing a property keeps the cached values its Collection already holds beside the ones it strips, so a refill cut short loses nothing to the next Remove

**Phase 4 Lines:** −25 | 67,394, against a stated −20 (−40 to 0). The tasks landed at −8; the lock correction gave back 17 and the late-record guards with the restored report line 19; the create-ID fold took 30 and the simplification review 23.

---

### The Fix Round (10-02-2026)

The second *§Finalization Review* pass failed Less to Carry and Reads as Designed, and what stood went to Nathan, who ruled a fix round over `f9849b767`. Its bar was *§Core Principles*, each standing on its own, and the review's step 6: a finding is closed in code or answered with the code that shows it wrong, a cost stands only where the code or its feature document states the reason, and new code earns its place by making a wrong behavior correct. It ran `f9849b767..b35bc050a`, 55 commits, landed on `active` through `a164ab9bc`, `519759aa0`, and `62bab886b`; Nathan's own `e1b925c0d` (a Date holds a span) and the merges sit beside it and aren't the plan's.

#### What Stood

Both neutral passes had raised the same three things: the open read the Nexus a second time when its first read listed a file to stamp; the watcher's turn wrote an ID into a file an outside tool had just added; and a write reached the settle through a tap installed as an import's side effect. Pass 2 alone raised three retry shapes, two announcement channels for an own write, two open-time stampers, unions told apart by key presence, and generic or near-identical names.

#### Investigations

Four agents worked from `f9849b767` in parallel: one on the settle (the open's second read, the tap, own writes restarting a walk, the serializing chains, the stamping rule), one on the retries, channels, unions, and ID minting, one re-deriving nineteen open claims against the code, and one making the mechanical changes that needed no ruling. Each ruling was then reviewed: a fable-high simplification review, a fable-high adversarial review, a targeted review of the stamping and rollback commits, a re-check of their rework, and a narrow check of the final loop, before passes 3 and 4.

#### Rulings and Reversals

- **The stamping rule took four turns.** At `f9849b767` a folder's read stamped every page it listed missing its ID, and a folder's event isn't held back until its files are still, so a note an outside tool was still writing into a new folder was stamped mid-write and the stamp's rename cut off its later bytes (reproduced in three shapes; the baseline never stamped mid-session). A clock rule followed, stamping a listed page once its modification time was older than the watcher's 200 ms window (`dc569c8ce`, which moved that constant into `writeEcho.ts`); the adversarial review showed it reading the local clock, so a future-dated note was never still and stayed absent, and a volume whose clock ran behind was stamped mid-write. A clock-free record of pages known to be still followed (`5f129bb90`, the constant back in the watcher); the targeted review showed its entries outliving their reason, three of them reproducing the mid-write loss. The final form (`9ed94a281`, `bf5e2117f`, `e0de8c3d7`, `dce3279e4`) keeps nothing beyond the event that proves stillness: a page's own event stamps it, a listing stamps a page only under a path newly in reach, and a page event waiting on a folder's stamp applies again after it. Its first rework owed a waiting page's stamp by path prefix, which stamped a Task's file in a nested Agenda folder as a page, and deferring the event replaced it.
- **The open read once, and that was reversed on measurement.** `670b863c3` seeded the first read's tree and let each stamp land as an own event, retiring the ledger's own re-walk; the simplification review measured a first adoption of 12,000 ID-less pages at 10.6 s against 5.5 s, since each stamp's event re-sorted its container, and found a stamped ID-less Space landing unlinked. `687111720` returned to stamping before the tree is held and reading again while a stamp lands, keeping the ledger's re-mints as events, and `ecd9ed5e4` closed the Space's walk route.
- **Schema operations moved to the `.nexus` folder's machine lock, were dropped, and were re-taken.** The first move, in a commit the branch later dropped, made a quit wait for a whole schema cascade; `329a85a67` then stated why the chain stood apart. The adversarial review showed a quit already waiting out a whole Context rename on the Contexts lock, and four schema cascades with no journal for a cut quit to resume from, so `52eaca4a9` re-took the lock and deleted `schemaChain.ts`.
- **`Changed` took four shapes.** It was tagged on `origin` (`1ffaff74a`), flattened into one interface since no reader narrowed (`423ed486b`), made a union again since the flat form admitted impossible pairs against the rule that finite states are unions (`bc6b69b5d`), and given `?: never` members, the idiom two modules already used, which removed a helper, three narrows, and a dead clause (`28d7b4550`).
- **A page's property write left the Contexts lock, and the refused delete's undo was fixed instead of re-locking it.** `01df6e180` proved the narrowing with pause-harness tests across Context and Space renames, deletes, and restores; the adversarial review then showed a refused delete restoring a page's pre-sweep bytes over a value written mid-sweep, and `4597f526d`, `bd44ba07e`, and `29ac4fda9` made the undo put back only what the sweep changed.
- **Creating a Context owes a walk.** `91942537a` owed one for a Context created over a folder already on disk; the adversarial review found a Context re-minted at open landing with no Spaces by the same route, so `7e5abfb50` has every arriving Context entry walk, whoever wrote it.
- **Renames report every skipped file.** A rename the journal took, over an unreadable file, had told the user nothing and left a stale journal record (`a2a2f7bb4`), and after a second rename the first's Try Again had answered ok and left the file as it was (`a90c7d2dc`).
- **Six promise chains became one helper.** Pass 4 found the serializing pattern written by hand; `c16a91726` added `inTurns` (`Core/Platform/inTurns.ts`) for the adoption chain, the settle's turn and reseed chains, Sync's session run (`Core/Sync/Client/session.ts`), the notification undo, and the watcher's batch queue.
- **Two folds Nathan asked for after pass 4:** a scope change seen by a walk before its settings event owes what that event would (`9e66c9c41`), and the read of a folder the tree listed unreadable lists the ID-less notes it finds (`b35bc050a`); `7787c0258` limits Try Again's stamp to a missing or foreign ID.

The rest of the round's commits sit in their areas above.

#### Behaviors That Changed for the User

- Quitting waits for a property operation in flight, as it already did for a Context rename.
- Creating a Context costs one full read of the Nexus.
- A Context or Space rename always reports the files it skipped, with Try Again.
- A property edit on a page no longer queues behind Context operations.
- Typing in the editor no longer restarts a re-read in flight.
- A new page's reply follows its write, so its row paints before the reply returns (since Phase 3).

**Lines:** +68 | 67,426. The round added 68 lines for the behaviors it made correct, against `f9849b767`'s 67,358.

---

### What Was Left, With the Reason

Each item stands where a reader meets it, with its reason stated there.

- **The own tap is installed on import.** `settle.ts`, above `setOwnTap`: the writers reach the settle through a tap because the settle's imports reach `Core/Files`, and the tap is the same function for the life of the process.
- **Two write channels, `recordWrite` and `noteOwn`.** `writeEcho.ts`, above `recordWrite`: an echo is recorded before the bytes land, so no echo of the landing arrives ahead of its record, and `noteOwn` follows the landing; Sync's write tap rides `recordWrite` for the reasons *§Task 3.1* gives.
- **Three retry shapes:** a property operation's record handed back, a rename re-sent with `from`, and `retryUnreadable`. `mutate.ts`, above `renamed`: a refused rename has no record to replay and a later rename displaces a taken one's; one journal for both registries is F-622's.
- **The owed walk is paid from two callers,** the settle and the Contexts lock (`payOwedWalk`). `mutate.ts`, at `underContexts`: the lock holds until the walk its write owed is paid, and one owner would hold the lock through a push and a reseed.
- **The settle's chains and flags** (`inTurn`, `reseeding`, `batching`, `stamping`, and `settleNow` calling itself). `settle.ts`, at `settleNow`, `stampListed`, `settleBatch`, and the self-call, each stating what it orders.
- **Tile and property IDs are minted by the host.** `mutateRequest.ts`, above `minted`: their asks place nothing, so they learn their ID from the reply.
- **Exports used only by tests** (`classifyEvent`, `readShard`, `isConfigPath`, `syncIgnoredUnder`), each marked "Exported for tests alone." at its definition.
- **The step-aside rule is stated twice in `names.ts`.** At `createDisambiguated`: `freeName` decides over a held list, often inside a synchronous edit that can't await the probe.
- **The `unidentified-` fallback.** `readNexus.ts`: an identity the open couldn't write, or one deleted while the Nexus is open, reads as no ID.
- **The audit findings that carry the rest:** F-622 (two journals, two replayers, and two reporting rules for one pattern, with crash recovery for a Context or Space delete); F-625 (trashing a Collection or Set uploads its excluded folders' contents to Sync; High); F-627 (an option remove the journal refused offers no Try Again); F-629 (an outside tool that strips a held page's `ID:` gets it a new ID); F-630 (a watcher restart drops its pending batch and the changes during the restart); F-636 (a page whose event was spent or never came is held nowhere until the next full read, and a settle during a stamp pass can post one Try Again for a page whose ID is landing); F-631 (a new item's rename field opens one frame after its row); F-632 (a Set dragged to another band shows its old rank for the round trip); F-633 (a write's reply waits behind a walk an outside change owes); F-637 (a page renamed during a refused delete keeps the swept state); F-638 (a refused create clears another new row's staged order); F-639 (an outside edit under a path an own folder move vacated waits for the page's next event).

---

### Completion Criteria

**Finalized** means the codebase after this plan is smaller, simpler, clearer about what belongs where, more coherent, and more deliberate than the codebase before it, and that a reviewer who knew nothing of the plan tried to show otherwise and couldn't. The six groups below are evidence toward that outcome. A plan that meets every line of them while the codebase is no better is incomplete.

**Conformance**

- [x] Every task's code matches its printed entry, or its area states the difference and its reason: the printed settle's stamping, `keyHolders.ts`'s Space half, Task 4.3's property half, and the fix round among them.
- [x] Every helper, type, or layer beyond the printed code is stated in its area with what it buys. No dependency was added: `package.json` is unchanged between `03dde6468` and `b35bc050a`.
- [x] The hard rules hold: `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` pass in every gate run, every channel is declared in `bridge.ts`, and each file changed beyond a task's list is named where it changed.
- [x] Each open call was made toward *§Core Principles* and disclosed; how the result stands against them is *§Report & Closure*'s.

**Correctness**

- [x] One path: the same arms apply an own write and an outside edit of the same file, and both leave the same tree and the same index rows. A new Space and a new registry definition are placed for an own write and walked for an outside one, a new Context entry walks whoever wrote it, and what is pushed follows the origin where the window already holds the change. The one exception to the same tree is an in-app create or rename of a Space, or rename of a Context, which relinks nothing until the next walk (F-626), and a member a rename's sweep skipped keeps its link in the held tree until its file is swept. Every `settledMutate` call checks the held tree against a fresh read.
- [x] The window holds the host's tree after every operation, and asks for the whole tree on a missed version: the drive on `~/Test` ended with window and host at version 33.
- [x] Pages, Spaces, and container sidecars are each built into a node by one function, wherever they are read (`readPageRecord`, `spaceNodeFrom`, `containerNodeFrom`).
- [x] No page, folder, or Space is held under a made-up ID. A page without one is stamped by its own settled event, by Try Again, or under a folder a change of scope admits; a folder or Space a walk or a folder's read lists without one is stamped in that settle; a page a folder's read finds without one waits for its own event or the next full read; and what a walk lists is shown with Try Again.
- [x] Settings, crops, page metadata, homepage, and order sit under `tree.config`, and a toggle re-identifies neither entity array.

**Completeness**

- [x] Every task of Phases 0 to 4 landed, as its area records.
- [x] `mutatePatch.ts`, `confirm.ts`, `watchPatch.ts`, and `watchSettle.ts` don't exist, and *§Baseline*'s greps each read 0 at `b35bc050a`.
- [x] No TODO, commented-out code, or debug output was added: the diff's added lines carry none.

**Confirmation**

- [x] Each phase's VERIFY ran: its named tests and the gates at the phase's tip, run by the orchestrator at every close after a gate reported green at `93baa6931` proved red.
- [x] Each user-confirmed check was driven by the orchestrator at Nathan's instruction (10-01-2026), with its result recorded in its area.
- [x] The 10,000-page timings were measured for every phase's tip, Phase 1's at its close and the rest in one run after Phase 4's code landed (Nathan, 10-01-2026), and again at the landed tree.

**Continuity**

- [x] *§Reconciliation*'s documents read true (nine feature and guideline documents reconciled against `b35bc050a` on 10-02-2026), and every comment a task falsified is rewritten in the present tense.
- [x] Every difference from the printed plan is fixed or carries Nathan's ruling. The audit holds no finding this plan resolved, and each finding that stays open reads true for what remains (reconciled to `b35bc050a`: 52 findings; F-634, F-635, and F-628 removed; F-636 split from F-630; F-637, F-638, and F-639 added).

**Confidence**

- [x] Gates green from a clean checkout of the landed tree, `62bab886b`: `npm ci`, typecheck, lint, and build exit 0, and 510 test files run 7,028 tests passed and 2 skipped with nothing unhandled.
- [x] The line measure moved −333, against a stated −380 (−315 to −440), and each phase's difference from its figure is explained in its **Lines** line.
- [x] *§Finalization Review* ran four passes, and none ended with all six principles withstood; Nathan ruled on 10-02-2026 that pass 4's findings, closed in code or answered with the code, close the plan without a fifth pass.

### Final Verification

- [x] From a clean checkout of the landed tree (`62bab886b`): `npm ci`, `npm run typecheck`, `npm run test`, `npm run lint`, and `npm run build`, each exit 0, with 7,028 tests passed and 2 skipped; at `b35bc050a` in the tree, 7,013 passed and 2 skipped across 510 files, none unhandled.
- [x] Every *§Baseline* command re-run: each grep reads 0, `mutatePatch.ts` and `confirm.ts` are gone, and the line measure reads 67,426.
- [x] On `~/Test`, driven by script over CDP on a scratch instance, end to end: create, rename, move, reorder, delete, and restore a page, a Set, a Collection, a Space, and a Context; set a property, a Context tag, and a setting; edit a note in another editor, add and remove a folder in Finder, and rename a file there. All 34 steps held the expected result, the window stood at the host's version (33) at the end, a fresh reopen's walk equalled the tree the drive left held, and `~/Test` was restored.
- [x] The 10,000-page timings against *§Baseline*: none rose (*§Report & Closure*).
- [x] The user-confirmed line was driven by the orchestrator at Nathan's instruction (10-01-2026).
- [x] *§Finalization Review* ran four passes; none ended with all six principles withstood; Nathan ruled on 10-02-2026 that pass 4's findings, closed in code or answered with the code, close the plan without a fifth pass.

#### Whole-Plan Reviews

Two whole-plan reviews ran ahead of *§Finalization Review* (Nathan, 10-01-2026), each over the whole range and briefed with the plan and every difference from it: one fable-high simplification reviewer, whose cuts sit in their areas, and one fable-high adversarial reviewer, which drove the real modules through randomized steps and compared the held tree, the window's tree, and the index to the disk after each. The adversarial review's fixes are in *§Task 2.4* and *§Task 3.2*: every own write marks the disk moved, a folder a walk lists without an ID is stamped in that settle, a folder event for a vanished path clears it, a folder whose parent the tree doesn't hold reads the parent, a folder's unreadable entries land in one step, and `settledMutate` checks parity on every call. What it recorded and left is F-633 and F-639. The line measure stood at 67,358 at `f9849b767`, −401 against the baseline, 39 of it in `Core/Testing`.

#### Finalization Review

The plan is **Finalized** when its before-and-after state has withstood a reviewer who knows nothing about it and is trying to show the change made the codebase worse. Every step is mandatory, and the review runs once every other *§Final Verification* box is ticked.

1. **The Reviewer:** One fable-high agent, dispatched fresh, that has taken no part in this plan, its planning, or its reviews.
2. **What It Is Given:** The `CLAUDE.md` files as they load on their own, the baseline commit, the final commit, and `git diff <baseline>..<final> -- Core Desktop`. It may read any code at either commit.
3. **What It Is Denied:** The plan, its printed code, the Decision Log, the audit, the Investigation, every feature document, commit messages, and any word about what the change was for. Its brief tells it to leave `.claude/Planning/` and `.claude/Features/` unopened and to read history through `git diff` alone. The brief states no goal, no summary of the work, and no expected finding.
4. **Its Charge:** Treat the difference as a change to a codebase of unknown purpose and try to prove the result is no better than the start. For each of the six *§Core Principles* it makes its strongest case against the change, working from these questions:
   - What does each new function, type, file, and layer replace, and is what it replaced gone?
   - Could the same behavior be written with less structure?
   - Is there now a second way to do something the codebase already did?
   - Did each responsibility move somewhere more obvious?
   - Which callers, wrappers, and helpers have a single use or no reason to exist?
   - What became harder to find or follow?
   - Where would the next change of each kind go, and is that plainer than before?
   - What looks left over from the work of getting here?
   - Which contradictions, duplicates, or diverging patterns go unexplained?
5. **Its Report:** For each principle, the attempts it made (what it looked for, and where) and one verdict, *withstood* or *failed*. Each finding cites the code before and after, the principle it fails, and the smallest change that would close it. The report also gives the counts it measured across the changed directories at both commits: files, exported names, functions, and lines outside tests and comments. A principle with no recorded attempt counts as unreviewed, and the review is rerun.
6. **Disposition:** Each finding is closed in code, or answered with the code that shows it wrong. "The plan called for it" answers nothing. A cost a ruling requires is acceptable only where the code, or its feature document, states the reason a reader needs. Fixes land as their own commits with the gates green.
7. **The Second Pass:** After any fix, a new reviewer under the same terms reviews `<baseline>..<new final>`. The plan is Finalized when a pass ends with all six principles *withstood*. A finding still standing after the second pass goes to Nathan with the reviewer's case and the answer to it, side by side.
8. **The Record:** *§Report & Closure* carries each pass's verdicts, counts, and findings, and how each finding was closed.

#### Reconciliation

Each is rewritten in the phase that makes it false, surgically, in the present tense. *Data Layer — Investigation*, *§Feature-Doc Divergences*, is the list of claims to check.

- **`Features/CorePM.md`:** *§The Read + State Layer* (one walk in one pass, records never written in place, the unreadable list's reasons), *§Adoption* (stamping on first sight, Try Again over a foreign ID, no temporary IDs), and the write path (a write is a file event; the gate settles; no confirm step).
- **`Features/DesktopPM.md`:** the watcher's settle (events apply one at a time; a folder, a registry, and a stray file no longer walk).
- **`Features/NexusRecordPM.md`:** the ledger takes the open's tree, and a failed re-walk leaves none.
- **`Features/ContextsPM.md`** and **`Features/PropertiesPM.md`:** the one lookup, the lock's reach, and a Space's values reconciled.
- **`PommoraPRD.md`:** *§Storage Philosophy*'s "byte-identical until the user edits them" (E-1).
- **Project `CLAUDE.md`:** the Read-Write Separation rule reads true once Task 2.3 lands, since the walk then writes nothing; it is re-read at close and no edit is expected.
- **Comments:** `grep -rnE "full-refresh|confirm(s|ing|ed)? |optimistic|echo window|adopted" Core Desktop --include='*.ts' --include='*.tsx' | grep -v "\.test\."` lists the candidates. Each that describes the deleted system is rewritten or goes with its code; `Core/Properties/journalSlot.ts`'s note on its `recordWrite` goes with that call, since a journal's event is one the path ignores.
- **The audit (K-5):** each phase's last commit removes the findings that phase resolves, by the phase Tasks 0.1 and 0.2 name for each, and resets the header's **Findings** count from `grep -c '^##### F-'`. A finding that stays open, in whole or in part, is reworded in place to what remains; F-622 gains the delete replay.

#### Report & Closure

The orchestrator reports, per phase: what landed, each VERIFY's result, the line difference by *§Baseline*'s measure against the stated figure (`Net | Total`), the timings, and every deviation. The closing report adds each *§Finalization Review* pass: its verdicts, counts, and findings, and how each finding was closed.

##### Finalization Review, Pass 1

One fable-high reviewer, given `03dde6468`, `35502d3f5`, and the code, and denied everything else (10-02-2026). It judged the later commit better, the gain structural and not in size.

- **Verdicts:** Less to Carry *failed*, narrowly; Less to Understand, Clearer Boundaries, Better Rather Than Moved, Reads as Designed, and One Way *withstood*.
- **Counts,** by the compiler's own parse of `Core` and `Desktop` outside test files, `Core/Testing` included (earlier, later): files 634, 635; exported names 2,964, 2,964; named functions 3,815, 3,798; lines neither blank nor comment 68,887, 68,483. `Core/Nexus` alone: exported names 264, 242; named functions 330, 304; lines 4,914, 4,564.
- **Closed in code** (`35502d3f5..b9555ced9`):
  - The adoptable-root rule is one function (`adoptsAsCollection`, `folderKind.ts`), and a root folder is resolved once, which retires the resolver's `adopting` mode.
  - An unreadable entry carries its `kind`, set where it is listed, and every reader that worked it out from the path asks it; `stampMissing` no longer decides Collection or Set by depth.
  - A create's ID is admitted by the rule a tile's already is (`mintedId`, `mutateRequest.ts`).
  - `valueOverride.ts`'s `settle` is private; `repointUnreadable`'s unreachable fallback goes; `oweWalk` is the one way `mutate.ts` owes a walk.
  - `treeIndex.ts`'s index joins `entityMemo`, which compares the inputs it is given and allocates nothing on a hit, in place of a hand-listed `sameInputs`.
  - The body-only flag is `bodyOnly` end to end, `setUnreadable` is `listUnreadable`, the path comparator is `comparePaths`, the watcher's step is `drainBatch`; the unreadable list's helpers sit in `treePatch.ts`, and `tree.ts` imports types alone.
  - Reasons stated where a reader meets them: why the window is sent a difference (`treeDelta.ts`), why a page a walk lists isn't stamped and why every own write marks the disk moved (`settle.ts`), what the own tap is and who installs it (`writeEcho.ts`), what the kinds table derives (`entities.ts`), which operations the Contexts lock covers (`mutate.ts`), and what produces a Nexus with no ID (`readNexus.ts`).
- **Answered with the code:**
  - The stepped-name base (`names.ts`) is one rule in a form over a held set and a form over a probe of the disk, and no shared statement is smaller than the two.
  - The five test-only exports (`classifyEvent`, `tileBodyUnder`, `titlesOf`, `isConfigPath`, `syncIgnoredUnder`) are the seams `watchPatch.ts` and `watchSettle.ts` exported at the earlier commit.
  - The event types sit with `noteOwn`, which emits them; the writers' modules reach the settle through a tap because the settle imports them, and `writeEcho.ts` importing its event types back from `fileEvents.ts` would turn that edge around.
  - The body-only flag rides the event, since the settle drains `values` at any flush and a mark set after the write could miss the one that pushes it.
  - `liveTree.ts`'s `hold` is the one assignment of the held tree, so it sees a commands change by every route, the open's seed among them, which no settle follows.
  - The `batching` flag keeps a reply's settle from waiting on an import's stamps, which the printed settle did (2,171 ms against 12).
  - The mode flags each select one line of a shared body. A Trash move's first attempt costs nothing a check wouldn't. The four promise chains differ in what they do with a failure.
  - The earlier commit held an ID-less page under a second identity that changed when it was stamped, which pins refused and recents stored; the later code has no second identity.
  - Try Again walks because every arm has already failed to place the file. The open walks a second time only when the first listed a file to stamp, where every open ran an adoption traversal ahead of its walk before.
  - A push at or below the window's version can't follow the install, since the channel is ordered and there is one window.
- **Standing, as costs the rulings carry:** every value write queued on the Contexts lock, which the fix round narrowed to a Space's (Task 4.2); a Context or Space rename's Try Again re-sends the rename where a property operation's replays a record, the two registries keeping separate journals (`ContextsPM`, the audit's F-622); a body save restarts a walk in flight; three unions are told apart by key presence (the audit's F-634).

##### Finalization Review, Pass 2

A second fable-high reviewer under the same terms, over `03dde6468..b9555ced9` (10-02-2026). It judged the later commit better, at about 70% confidence. **Two principles failed, so the plan is not Finalized, and what stands goes to Nathan** (step 7).

- **Verdicts:** Less to Carry and Reads as Designed *failed*; Less to Understand, Clearer Boundaries, Better Rather Than Moved (narrowly), and One Way *withstood*. On an absolute reading it would also fail Clearer Boundaries and One Way on the findings under each.
- **Counts** (earlier, later): files 633, 634; exported names 2,964, 2,964; functions with a body, callbacks included, 8,445, 8,442; type and interface declarations 925, 941; code lines 68,887, 68,474. `Core/Nexus` alone: lines 4,914, 4,553; functions 615, 595; exported names 264, 243. It also counted, as conceded reductions: writer-side notification call sites 56 to 24, `ctx.push` sites 19 to 13, raw `machine().rename` sites 18 to 8, `recordWrite` sites 35 to 18.
- **Closed in code after the pass** (`b9555ced9..f9849b767`): the two comments that named removed mechanisms (`codec.ts`, `liveTree.ts`); `personalizationOf`'s import beside each file's other Session imports in the twenty files where it had been appended; the reason the writers reach the settle through a tap (`settle.ts`: the settle imports their modules, so the import the other way would close a cycle); `entityMemo`'s contract (`tree.ts`); the "no ID Pommora can file" refusal stated once (`NO_FILEABLE_ID`, `pageFile.ts`); one statement of the empty Agenda context (`agendaContext(root, null)`).
- **Answered with the code:** the step-aside base in `names.ts` (each site must compute `bare` before it can ask whether it is taken, one from a set and one from the disk, so a shared function holds only the final choice and adds a line); the registry-by-id map built at two sites (a shared definition adds a line and shortens neither); `createTestPage.ts` (sixteen test files need the ID a create no longer echoes); the test-only exports, the `batching` flag, the body-only flag on the event, `liveTree.ts`'s commands tap, and the kept `unidentified-` identity, as under Pass 1; the literal `'collection' | 'set'` unions outside `schemas.ts` and `tree.ts` (Task 1.1's scope; the audit's F-212 carries the rest).
- **Standing, for Nathan:**
  - **Less to Carry.** The totals are flat: the same count of exported names, three fewer functions, sixteen more types, one more file, and 413 fewer lines, with module-level bindings for tree and push bookkeeping up from eight to fifteen and serializing chains from one to four. The plan's own measure stands at −401 against a stated −380.
  - **Reads as Designed.** `own: {}` as a bare marker and the eleven other reads of `ev.own` (the audit's F-634); the `batching` flag, the `gate` boolean, and `flush` calling itself; the four test-only exports.
  - **Both passes raised, independently:** the open reads the Nexus a second time when its first read lists a file to stamp, where `stampTree` stamped pages ahead of the one walk before; the watcher's turn writes an ID into a file an outside tool just added, against the rule that reads don't write; and a write reaches the settle through a tap installed as an import's side effect, an edge go-to-definition can't follow.
  - **Raised by Pass 2 alone:** three retry shapes (a record handed back, a request re-sent with `from`, and the `retryUnreadable` operation); own writes announced on two taps (`recordWrite` and `reportRename` for Sync, `noteOwn` for the settle), with `relocate` firing both; two open-time stampers (`stampTree` over the disk, `stampMissing` over the walk's list) with no stated split; the owed record declared in `fileEvents.ts` and reset in `settle.ts`; `nexus:state`, a read, recording what the window holds (`sent`); `orderInTree` and `withChildOrder` in `Views/Host/pendingView.ts`; the difference's `{ set: unknown }` cast in `nexusSlice.ts`; a create's ID admitted without its kind mark being checked; near-identical names (`oweWalk`, `walkOwed`, `walkDue`; `owed` and `due` for one record); generic exported names (`patch`, `diff`, `flush`, `sent`); `openPage` sharing its name with `connectionsApi.ts`'s.

##### Finalization Review, Pass 3

A fresh fable-high reviewer under the same terms, over `03dde6468..dce3279e4`, the fix round's code before it landed beside Nathan's own commit (10-02-2026). It judged the core smaller and single-mechanism, with six small findings standing.

- **Verdicts:** Clearer Boundaries and Better Rather Than Moved *withstood*; Less to Carry, Less to Understand, Reads as Designed, and One Way *failed*.
- **Counts** (Core and Desktop outside tests, earlier, later): files 634, 634; exported names 2,960, 2,970; functions 3,241, 3,202; lines neither blank nor comment 68,212, 67,876. It counted `fileEvents.ts` and `settle.ts` (629 and 181 lines) against what they replace: `watchPatch.ts`, `watchSettle.ts`, `mutatePatch.ts`, and `confirm.ts` (491, 85, 237, and 70), about 190 lines of `treePatch.ts`, and about 70 of `nexusSlice.ts`.
- **Closed in code** (`dce3279e4..843f006ca`):
  - `withOwnSettings`'s in-flight values state why they hold: an older tree landing after a newer toggle would roll the toggle back (`configSlice.ts`).
  - The tag edit's refusal on a Context holding an unreadable Space states why the other Space writes don't refuse: that Space would be dropped from the page's list or left with no far half (`contextWrite.ts`).
  - "The event's text, else the disk" has two shapes, `jsonOf` and the page arm's read; `readShard` reads only the disk, and a month's event says when the month left.
  - `refreshAfterWrite`, a two-line wrapper with one caller, is gone; the settle's fallback walk marks the disk moved and walks itself.
  - The walk states why it lists no Space folder without a sidecar: such a folder is a plain folder.
  - The file events' logs name events, and `writeEcho.ts`'s header names its echo window, own tap, and Sync and watch taps.

##### Finalization Review, Pass 4

A fresh fable-high reviewer under the same terms, over `03dde6468..843f006ca` (10-02-2026). Apart from its first finding, it judged the findings small against a core that is smaller and single-mechanism.

- **Verdicts:** Less to Understand and Better Rather Than Moved *withstood*; Less to Carry, Clearer Boundaries (modestly), Reads as Designed, and One Way *failed*.
- **Counts** (earlier, later): files 634, 634; exported names 2,953, 2,963; functions 3,938, 3,924; lines 68,212, 67,872.
- **Answered with the code:**
  - **F1,** that removing restore's path guard let a Context record's title steer the move: `contextEntry.title` refines through `holdsName` (`Core/Contexts/contexts.ts`), which refuses `/`, `\`, NUL, `.`, `..`, and the empty name, and the record's registry parses through that schema; a page's and a Space's names are directory entries, and a Collection or Set passes `landingRefusal`. Pass 3 had reached the same conclusion.
  - **F5,** the own tap installed on import: its reason is stated at `settle.ts`, and an explicit install would add a call site in every process and suite that writes.
- **Closed in code** (`843f006ca..bab21f745`):
  - **F2:** the serializing chains written by hand are one helper, `inTurns` (`c16a91726`).
  - **F3:** `Owed` states that it is declared where events owe it and that the settle pays and empties it (`a4ff3a1c8`).
  - **F4:** the four exports used only by tests say so (`b82aeb216`).
  - **F6:** Try Again owes a page with a foreign ID as it does one missing its ID, and `stampMissing` writes over the foreign one, so `retryUnreadable` stamps nothing inline (`bc1a7fd3d`).
  - **F7:** the text writers, the binary writer, and Sync's landing each state the event they report and why (`bab21f745`).
- **Folded at Nathan's request after the pass:** Try Again owes a stamp only for a file missing its ID or holding a foreign one (`7787c0258`), a scope change seen by a walk before its event (`9e66c9c41`), and a repaired folder's read listing the notes it finds (`b35bc050a`).
- **Disposition:** Nathan ruled on 10-02-2026 that pass 4's findings, closed in code or answered with the code, close the plan without a fifth pass, and the plan is **Finalized** on that ruling.

##### Closing Figures

By *§Baseline*'s measure (`Net | Total`, against 67,759):

| Stage | Range | Net | Total | Stated |
|---|---|---|---|---|
| Phase 1 | `03dde6468..2270395cc` | +88 | 67,847 | about +80 |
| Phase 2 | `2270395cc..dfd6f6caf` | +93 | 67,940 | about +25 |
| Phase 3 | `dfd6f6caf..78e100154` | −521 | 67,419 | about −465 |
| Phase 4 | `78e100154..5d1cadeac` | −25 | 67,394 | about −20 |
| Whole-plan reviews and Finalization passes 1 and 2 | `5d1cadeac..f9849b767` | −36 | 67,358 | none |
| The fix round and passes 3 and 4 | `f9849b767..b35bc050a` | +68 | 67,426 | none |
| **The plan** | `03dde6468..b35bc050a` | **−333** | **67,426** | about −380 (−315 to −440) |

The 10,000-page timings on `~/Benchmark`, in median milliseconds. The phase columns were built and measured in one run on 10-02-2026, the baseline first; the last two columns compare the clean checkout of the landed tree, `62bab886b`, with the baseline figures its verification measured against. None rose.

| Measure | Baseline | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Landed | Baseline |
|---|---|---|---|---|---|---|---|
| Open to first paint | 3,024 | 3,015 | 1,762 | 1,776 | 1,542 | 1,618 | 3,024 |
| Cold index seed | 7,067 | 6,965 | 2,605 | 2,619 | 2,393 | 2,533 | 7,067 |
| First paint during a cold seed | | | | | | 3,227 | 7,564 |
| Walk | 789 | 788 | 797 | 773 | 546 | 540 | 789 |
| Property write to its repaint | 42 | 44 | 46 | 45 | 40 | 37 | 45 |
| Settings toggle to its repaint | 86 | 81 | 81 | 23 | 23 | 22 | 87 |
| Page create to its row | 93 | 94 | 93 | 53 | 51 | 43 | 95 |

The walk is timed with a settings leaf moving in the same batch, since a walk that changes nothing pushes nothing after Phase 3. A page create's reply resolves after the push that paints its row (42 ms at the landed tree, against 15 at the baseline), which is the order Phase 3 sets.

### Open Items

- **A duplicate that can't be re-minted has no notice (E-5).** It needs the walk to leave the second claimant of an ID out of the tree, which also retires the rules for two files sharing one; meanwhile a duplicated Space ID resolves to its last copy in the window until the next open re-mints it. F-640 carries it.
- **One notice names the first new unreadable file,** and Try Again acts on that file. The others stay listed and unannounced until the list changes again; showing them all is F-621's.
- **A tab from a previous session on a page under a Collection or Set already damaged at launch isn't restored.** A stored tab holds an ID alone, and the page it names isn't in the tree to resolve it; tabs open when the damage happens, and every pin, are kept (E-7).
- **Crash recovery for Context and Space deletes** is F-622's (*§Task 4.3*).
- **Trashing a Collection or Set uploads its excluded folders' contents to Sync** (F-625). High weight, outside this plan's files; it should be scheduled on its own.
