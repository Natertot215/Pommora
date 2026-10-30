## Trash & Archive Restructure — Implementation Plan

**DATE:** 10-29-2026
**STATUS:** Draft
**SOURCE:** *Trash & Archive Restructure — Decisions & Intention* (ratified 10-29-2026, Decisions A-1–G-4 and its *§Rejected*), *Trash & Archive Restructure — Investigation* and its `Scouts/`, *Trash & Archive Restructure — Reach-In Measurement*, and the planning session's placements (10-29-2026), which *§Constraints · Placements* records.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| | | | |

**Net Ledger** (Actionable column of `view-delta --exclude .claude`, per phase, cumulative from the BASELINE head; estimates from *Investigation · §Removal & Consolidation Ledger · §The Net*):

| Phase | Estimate | Measured |
|---|---|---|
| 1 · The Landing | about +35 | |
| 2 · Residue | about −155 | |
| 3 · Delete, Journal, and Carry | about −115 | |
| 4 · Reach-In | about −450 | |
| 5 · One Restore, Recognition, and the Interface | about −95 | |
| 6 · Tests, Docs, and the Closing Measurement | ±0 | |
| **Total** | **about −700** | |

### Context

Pommora keeps every departed item as a bundle: a stamped folder holding the item beside a `_record.json` saying where it belonged and what it carried. The Trash keeps deleted pages, Sets, Collections, Spaces, Contexts, and properties in `.trash`; each Collection's Archive keeps archived pages and Sets in `.nexus/archive/<Collection ID>`. The two stores run two models. The Archive is reach-in: its pages are indexed and every cascade rewrites them as it rewrites live pages, so its restore is a move. The Trash is resolve-on-restore: a trashed copy is frozen, and its restore re-spells keys and option words, repairs its links against a frozen snapshot of their targets, and refills what its delete stripped. The scrub can't follow a rename, so a page restored after one returns holding the old names (*Investigation*, B-9), and three paths reach into trashed copies regardless. Around the two models sit a second delete mode that bypasses the Trash, two restores, two Undo shapes, two notice owners, six hand-written Archive hides, and compatibility-only decodes.

Every cascade lands its writes through `Machine.land` (`Core/Platform/machine.ts`, implemented by `Desktop/Platform/nodeMachine.ts`), which the Write Path plan built. A property rename across 7,027 pages of a 10,000-page Nexus takes 14.7 s on an idle machine, and two-thirds of it is the drive emptying its whole cache once per file (*Investigation · §The Trash's Model · §The Measurement*); the index tells a changed file by its modified time and size, which a cascade's rewrite keeps.

### Overview

Six phases move the Trash onto the Archive's model and fold everything the two models duplicated into one design, removal first. Phase 1 lands each group of files with one flush and identifies every file by its change time, so a property rename falls to roughly 6–7 s and the index can trust what it holds. Phase 2 removes System Trash Mode, the `TrashDeps` seam, compatibility-only decodes, and dead code. Phase 3 gives every delete one mint, one record written ahead of its strip, one note, and one tail, and the Archive one carry. Phase 4 admits the Trash into the index and every cascade, watched as the Archive is, with one store-of-path rule, and removes the frozen model whole. Phase 5 makes one restore serve both stores and every item moved out of a store by hand, with one Undo shape and one notice owner. Phase 6 puts tests where their behavior lives, measures the property rename again, and removes the measurement harness.

User-facing behavior stays as it is, except that a restored page returns current, items moved out of a store by hand finish as restores, and trashed pages follow live pages' rules (Decisions D-4, D-5, E-1–E-4). The plan ends about 700 production lines and about 1,000 test lines lighter, and what leaves beyond lines is listed under *Investigation · §The Net*: the scrub and `targets`' frozen identity, the trashed refill and its owed work, System Trash Mode, the `TrashDeps` seam, the content-hash echo, the flush per file, two stat identities, two watch policies, two restores, and two notice owners.

#### Concepts

<!-- CONCEPTS -->

#### Constraints

- **Mandate (Nathan's, verbatim from *Trash & Archive Restructure — Decisions & Intention · §Constraints*):**
  - **Approach:**
    - Any approaches being considered here must first assess what’s true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We’re not going to design based on what’s currently there and simply adjust course, we’re ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what’s ultimately going to be replaced.
    - We’re approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
    - We shouldn’t adding anything new unless there’s evidence that it’s required. We’d approach this through the perspective of ending up with cumulatively “less stuff” in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and less headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our <principles>.
    - Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebases' resulting shape — not just maintaining remnants or adherence to what’s true *now* that’s ultimately going to change. The approach should reflect the outcome and shouldn’t be bound to constraints that were only relevant before.
    - Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we’re not starting from scratch.
    - The complex data-level mechanics of the codebase are what least reflect *Nathan’s* intentions and are primarily reflective of what’s determined appropriate via past session agents. Treat it with care and respect, but don’t assume it’s beyond changing within reason, where simply presenting the approach to Nathan may be all that’s required to genuinely change the codebase for the betterment of everything within it and future iterations.
  - **Principles:**
    - **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
    - **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
    - **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
    - **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
    - **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
    - **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
    - Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements.
    - Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
    - Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.
- **Adherence:** how the plan holds to each principle, so a reviewer can test the plan against it:
  - **Less to Carry:** the scrub, `targets`, the trashed refill and `Worked`, System Trash Mode, `TrashDeps`, the content-hash echo, and the per-file flush leave whole; every addition (the store-of-path rule, the claim rule, the stored-Space source, recognition) replaces something named beside it.
  - **Less to Understand:** "where a departed item lives, and how it comes back" has one answer for both stores: one model, one restore in `Core/Bundles/restore.ts`, one arrival in `Core/Nexus/arrival.ts`, one store-of-path rule in `Core/Paths/bundleLayout.ts`.
  - **Clearer Boundaries:** `Core/Bundles` owns what both stores share, `Core/Trash` and `Core/Archive` only what's theirs, and the path layout sits in `Core/Paths` below both; every new or moved file is one Nathan approved (*§Placements*).
  - **Reads as Designed:** compatibility-only decodes, ghost guards, test-only exports, the kept record, and the half-reach paths leave; no transitional form lands between commits except Phase 4's one stated inversion.
  - **One Way:** one landing flush per drive, one file identity (`sameFile` with the change time), one watch policy, one claim rule, one restore, one Undo shape, one notice owner, one gone-for-good step, one carry, one trail resolver.
  - **Real Purpose:** each added line is justified in its task against what it removes or the decided behavior it delivers; a phase that lands above its estimate reports what the increase buys.
  - **Reflected Everywhere:** trashed pages follow live pages' rules (Decision D-4), both stores are watched and recognized when moved by hand (Decisions E-1, E-3), and the restore's refill names a trashed page's miss as a live page's (Decision D-5).
- **Briefs:** every agent brief on this plan — executors, checkpoint reviewers, the final waves, and every compaction continuation — carries the Mandate above in full and has its agent read *§Constraints* whole from this file before anything else. The neutral gate's brief carries the Mandate alone.
- **Rulings (Not Re-Raised):** every entry in *Trash & Archive Restructure — Decisions & Intention* and its *§Rejected*; the design calls *Investigation · §The Landing* and *§The Trash's Model · §The Rules* record (the watched Trash, the claim rule and its pass-over, the governed rule by the record's Collection ID, links recorded ahead of the strip, the post-rename stat ahead of the change time, a trashed Collection keeping a deleted property's assignment until the property is gone for good, Decision D-3's views through the configuration pass, the scrub removed whole); and these: the watcher swap (I-081) is its own plan; I-033 gets no batch channel; `assetMigrate.ts` stays, since it runs when the user changes the image folder.
- **Placements (Nathan, 10-29-2026):** every new, moved, renamed, or deleted file is one of these, and no other file is created:
  - **Moved:** `Core/Bundles/layout.ts` → `Core/Paths/bundleLayout.ts`, gaining the store-of-path rule, `ArchiveStore` and `archiveDirRel` (from `nexusPaths.ts`), and `archiveStoreOf` (from `names.ts`); `Core/Settings/TrashFrame.tsx` and `trash-frame.css` → `Core/Trash/`.
  - **New:** `Core/Bundles/restore.ts` (the one restore); `Core/Nexus/arrival.ts` (`returningCascade`, `repairLanded`, `artifactFiles`, and the shared arrival tail recognition runs); `Core/Testing/bundles.ts` (the shared bundle fixture and browser harness).
  - **Renamed:** `Core/Trash/spend.ts` → `Core/Trash/empty.ts`; `Core/Archive/archivePlace.ts` → `Core/Archive/archiveLabel.ts`.
  - **Deleted:** `Core/Trash/restoreScrub.ts`, `Core/Trash/trashedCopies.ts`, `Core/Trash/trashMode.ts`, `Core/Trash/handlers.ts` (its channel into `Core/Bundles/handlers.ts`).
  - **Between Existing Files:** `parkLinks` into `Core/Bundles/record.ts`; `collectionArchive` into `empty.ts`; the journal's strip release into `Core/Nexus/owed.ts`; the links-ahead gatherer into `Core/Trash/gather.ts`; the one notice builder into `Core/Interface/Notifications/notifications.ts`; the flat discard's two functions into one in `Core/Trash/discard.ts`; the stored-Space source into `Core/Nexus/heldPages.ts`, which stays one file.
- **Plan Rules:** removal comes first in every phase, Phase 4's reach landing with L-10's removals being the one inversion (*Investigation · §Order Constraints*, 7). Tasks are written to their result, so no executor reads an opening to do more than they say. A test that changes asserts the behavior the decisions name rather than being bent to pass. AFTER blocks leave fewer comments than they find, and add one only where the code would otherwise be misread. Any cautionary code has its reason asked of Nathan before it's written. Consolidation that's unambiguously right needs no separate sign-off, and dead or dormant code inside the surface leaves.
- **Net-Less, for the Whole System (Nathan, 10-29-2026):** the Approach, the Principles, and net-less weigh every decision for the whole system, not the task in isolation; anything a task makes bigger is justified by them where a reader meets it. The codebase's comment count doesn't grow. Documentation changes are minimal, small re-wordings where a claim turns false, and net-less where possible: no new sections, since little here is user-facing.
- **Obvious Folds (Nathan, 10-29-2026):** a fold inside the surface that Nathan would answer "fix it here" to, and that carries no architectural risk or domino effect, is included without asking; anything larger is recorded under *§Deviations* for him.
- **Not Feature-Level:** what a user sees is unchanged apart from speed and the decided behaviors under *§Overview*; the Trash's and the Archive's tables keep their looks (Decision C-7). Anything else that would change what a user sees is recorded under *§Deviations* for Nathan and taken at its simplest reading that changes nothing visible.
- **Sync:** nothing under `Core/Sync/` or `Sync/` changes (Decision B-1). Sync's landing, `landBytes`, is Core code and inherits the group flush unchanged; `Core/Sync/Client/tap.ts:50`'s drop of watched `.trash` events becomes reachable once the Trash is watched, and stays as it is.
- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint`, from the repo root; each prints its own failures, and lint runs clean. Biome formats every TS and JSON write, so an edit failing on whitespace means it reformatted: re-read and retry. "Run the gates" in a task means those three. `npm run build`, confirming `✓ built in`, runs from a clean state at the final head.
- **Commits:** each task commits once its VERIFY passes, through `git commit --only -m "…" -- <paths>` after `git add` for new files (*Development-Environment · §Gates & Commits*). Messages are past tense, one to three sentences, and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The post-commit hook pushes `active`. A Bash command carrying `git` can't contain a personal name anywhere, paths included.
- **Tests:** each new behavior gets a test that fails without its change, run once against the code with the change reverted and watched red; a rewritten case counts as that test. A test pinning behavior a decision removes is rewritten to the decided behavior or leaves with the code it pinned, as its task names. Tests stay in the suites they're in until Phase 6 moves them where their behavior lives.
- **The Number:** every phase's VERIFY runs `python3 ~/"The Studio/.claude/scripts/view-delta/view-delta.py" <BASELINE>..HEAD --exclude .claude` and records the **Actionable** column in the Net Ledger beside the phase's estimate, additions and removals apart. A phase that lands above its estimate is reported in chat before the next phase opens, with what the increase buys.
- **The Measurement (Decision G-2):** the property rename's before is on record: the re-run's medians at `9b9c0d630` (*Investigation · §The Trash's Model · §The Measurement*), whose app code the BASELINE head still carries, with the baseline build for today's Trash and the reach-in prototype for a reach-in one. After Phase 5, the harness in `.claude/Benchmarks/Reach-In/` (`RERUN.md`) measures HEAD alone at Medium-0 and Medium-50, three runs each, since the code itself is now reach-in, and the Net Ledger records both against the recorded medians. Phase 1's thread-pool measurement is its own task. The harness and its fixtures leave in Phase 6 (Decision A-1).
- **Live Drives:** Nathan takes no hand checks (10-29-2026). Every live check runs as an agent's CDP drive (*Development-Environment*) on a scratch copy of `~/Test`, from a worktree build with its own userData and debug port; the app is never launched from the main checkout, where Nathan's instance runs.
- **Execution:** the plan runs end to end through `c/plan-execution`, headlessly once Nathan ratifies it, and no step waits on Nathan; a message from him during the run is input to fold in, not a stop. An ambiguity is taken at its simplest reading and recorded under *§Deviations*; anything that needs Nathan's word is recorded there for the final report. Each task goes to an `execution-agent` (`opus-medium`) informed of *§Context* and *§Overview*, which applies the task's AFTER as written and reports insights, concerns, and suggestions rather than diverging; the orchestrator checks its result against the task's AFTER and VERIFY. Every phase ends with its review checkpoint: two read-only agents, one under `code-simplification` and one under `adversarial-review`, each weighing the phase against these constraints and its place in the plan, reading outward rather than in isolation. Compaction checkpoints follow Phases 2 and 4.
- **Cold Machine:** when the run ends, no process, worktree, benchmark Nexus, scratch userData, test fixture, or temporary script it created remains; *§Final Verification · The Cold-Machine Check* proves it with commands, and the final report states the result. A Pommora instance launched from the main checkout before the run isn't the run's, and it's left alone.
- **Neutral Gate:** the post-implementation neutral reviewer (`fable-high`) gets only the BASELINE head, HEAD, the Mandate, and this intention: *"Pommora kept departed items in two stores built on two models. The Archive kept its pages in the index and inside every cascade, so its restore was a move; the Trash froze each copy and repaired it on return through a scrub that couldn't follow a rename, while three paths reached into trashed copies anyway, a second delete mode bypassed the Trash, each restore, notice, and Undo was written twice, and every write waited for the drive one file at a time. This work moves the Trash onto the Archive's model so trashed pages stay current and one restore serves both stores and every item moved out of a store by hand, removes the frozen-copy machinery and the second delete mode, and lands each group of files with one flush, identified by the file's change time. User-facing behavior is unchanged except where trashed pages now follow live pages' rules."*
- **Out of Scope Everywhere:** the watcher swap (I-081); Sync's code; a Context moved back by hand (Decision E-4); verifying the write-through flag and the change time on Windows and exFAT (*§Open Items*); merging the two stores or changing the Archive's layout (Decision C-1); merging a Context's two orders, which is feature-level.

#### Process Overview

<!-- PROCESS -->

---

<!-- PHASES -->

---

### Completion Criteria

- **Conformance:** the implementation adheres to the project's guidelines, Nathan's stated preferences, and *§Constraints*; no mechanism landed that an existing one already provided, every file created, moved, or deleted is one *§Constraints · Placements* names, and nothing changed outside what the plan named.
- **Correctness:** each decision is observably true: a page restored after a property, option, Space, and Context rename returns holding the new names; a page, Set, or Space moved out of a store by hand finishes as a restore; a trashed page's refill miss is named; the property rename's time at both ends is recorded; and the whole works end to end as a user would use it, driven live.
- **Completeness:** every task landed and is ticked; nothing was deferred, narrowed, or left as scaffolding, debug output, or an unauthorized TODO.
- **Confirmation:** every verification ran and its result was read; every new test goes red without its change.
- **Continuity:** *§Reconciliation* is walked, the project's living documents read true, and every deviation is fixed or ruled on.
- **Confidence:** gates are green from a clean state across the full range from the BASELINE head, and the diff is the size the Net Ledger implied; growth past it is reported, not tidied away.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

The reviews run over `<BASELINE>..HEAD`, each wave closed before the next opens. Every reviewer brief carries the Mandate verbatim and has its agent read *§Constraints* whole, except the neutral gate's, which carries the Mandate alone.

- [ ] Phase Review: Phase 1 · Phase 2 · Phase 3 · Phase 4 · Phase 5 · Phase 6
- [ ] **Wave One:** two read-only `opus-xhigh` reviewers briefed with `code-simplification`, one reading inward at the diff and one outward against the rest of Core, Desktop, and UIX; one fix agent folds what holds as numbered fixes beside a Not Taken list with reasons, and the fold commits.
- [ ] **Wave Two:** two fresh `opus-xhigh` reviewers, inward and outward, briefed with `adversarial-review` over the folded range and given the Not Taken list, so a fold left out returns only on new evidence; folded and committed the same way.
- [ ] **The Dashboard Map:** in each wave, one more read-only agent (one per lens: `code-simplification` in Wave One, `adversarial-review` in Wave Two) maps how the Studio dashboard's Pommora line count (`~/The Studio/.claude/dashboard/projects/pommora.mjs`, read with its `README.md` and `line-count.mjs`) would divide so Trash & Archive becomes its own section: which paths it takes from which areas, what the other areas keep, and what the history rebuild costs. The second reconciles the first's map; the result goes to Nathan in the report, and nothing in the dashboard changes.
- [ ] **The Neutral Gate:** one `fable-high` agent given only `<BASELINE>..HEAD`, the Mandate, and the intention under *§Constraints · Neutral Gate*; a yes-or-no verdict, its corrections, and the strengths to keep, re-run after a fold.
- [ ] **The Own Pass:** the gates from a clean state and `npm run build`; the diff read once; *§Completion Criteria* ticked.
- [ ] **The Cold-Machine Check:** each of these prints nothing, or only what it names: `git worktree list` (the main checkout alone); `ls -d ~/Benchmark-* 2>/dev/null`; `ls "${TMPDIR}/pommora-reach-in" 2>/dev/null`; `ls .claude/Benchmarks/Reach-In 2>/dev/null`; and a process listing for Electron or Node launched from a worktree or scratch folder.
- [ ] **Reconciliation:** *§Reconciliation* walked; *§Deviations* ruled on; STATUS and BASELINE's End filled.
- [ ] **The Report:** in `closeout-review`'s closeout format, with the range presented through `view-delta`, the per-phase and total delta, the property rename's before-and-after, every deviation, the Cold-Machine Check's result, and the neutral gate's answer verbatim.

#### Reconciliation

<!-- RECONCILIATION -->

#### Open Items

- **Windows and exFAT:** the write-through flag (Decision G-4) and the change time on an NTFS rename-over and on exFAT ship unverified, so the guards the change time retires leave only where it's known to be real.
- **Power Loss:** that a write-through temp counts as flushed when the drive's cache is emptied rests on Apple's `fcntl(2)` documentation and git's batch mode, not on a power-cut test.

#### Deviations
