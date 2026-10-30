### Write Path — Brief

**DATE:** 10-28-2026
**STATUS:** The plan is complete (10-29-2026) and the reach-in matrix re-run; the Trash & Archive brainstorm's last phase is next
**SOURCE:** the Trash & Archive Restructure brainstorm (10-28-2026), *Trash & Archive Restructure — Decisions & Intention* (Decisions A-7 and F-1–F-3), and *Write Path — Investigation* beside this brief.

This brief is the handoff for one session. That session writes the Write Path plan, reviews and ratifies it, implements its two phases, verifies them, and then hands the Trash & Archive Restructure back in a state the session after it resumes from this brief alone.

---

#### Context

Pommora is mid-way through planning a Trash & Archive Restructure, a cleanup that consolidates the Trash, the Archive, and their adjacencies into one design with less code. Its brainstorm is in `.claude/Planning/Trash & Archive Restructure/`: the *Decisions & Intention* document (Decisions A-1–A-7, B-1–B-4, C-1–C-7, and F-1–F-3, the Mandate verbatim under *§Constraints*), the *Investigation* (the reconciled code map, bugs B-1 to B-8, and the Removal & Consolidation Ledger), and six cleaned scout reports in `Scouts/`. The one open design question is whether the Trash moves onto the Archive's reach-in model, where trashed copies stay inside every cascade. A benchmark of a reach-in prototype was run to decide it.

That benchmark exposed something larger than the Trash: every cascade (a property, option, Context, or Space rename, a delete's Link strip, a page rename's relink, a restore's refill) costs about 7 ms per rewritten file, so renaming a property on 7,000 of 10,000 pages takes about 50 seconds. *Write Path — Investigation* traced it. The largest single cost is the flushed write, 51-60% of a rename's wall time (*Reach-In Measurement · §5*): `write-file-atomic`'s `fsync` reaches macOS's `F_FULLFSYNC` through libuv and waits for the drive, one file at a time. The rest is a per-page index transaction (about 0.45 ms against 0.04 ms batched), five or six frontmatter parses, and two redundant reads per file. A Context rename also re-walks the Nexus about five times (*inferred*). Reach-in's extra cost is this per-file cost times the trashed copies a cascade reaches, so the Trash's model can only be judged after this is fixed. Nathan ruled the fix its own two-phase plan, run first (Decision F-2), with the flush kept and taken in groups rather than per file (Decision F-3).

- **SOURCE:** `.claude/CLAUDE.md` (Pommora's rules; the Hard Rules on expensive work "on every X" and on full rebuilds)
- **SOURCE:** `.claude/Planning/Write Path/Write Path — Investigation.md` (the per-file ledger, the measurements, the design, the invariants, the scope)
- **SOURCE:** `.claude/Planning/Trash & Archive Restructure/Trash & Archive Restructure — Reach-In Measurement.md` (the benchmark's matrix and its "Where the Time Goes" CPU profile)

#### Mandate

Write, review, ratify, implement, and close out the Write Path plan within this one session. Every cascade reads each file once and parses it once. Writes land through one batched writer that keeps every page's bytes flushed to the drive before its name points at them (Decision F-3), flushing a chunk of files together. The index and the tree are recorded once per chunk, and every per-file step the index or the write itself already answers leaves. When the plan is complete, re-run the reach-in benchmark on the new HEAD, and leave the Trash & Archive Restructure ready for its model decision.

The plan is two phases, as the Investigation's *§Recommendation* sizes them. **W-1, One Landing** covers the batched writer, the Machine seam, the sweep's read, land, and record passes, recording per chunk, and the settle reading the index. **W-2, One Read** covers the pre-reads the index answers, the option sweep's narrowing, and the Context rename's walk race as the profile describes it.

#### Approach (Nathan, Verbatim)

- Any approaches being considered here must first assess what’s true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We’re not going to design based on what’s currently there and simply adjust course, we’re ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what’s ultimately going to be replaced.
- We’re approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
- We shouldn’t adding anything new unless there’s evidence that it’s required. We’d approach this through the perspective of ending up with cumulatively “less stuff” in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and less headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our <principles>.
- Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebases' resulting shape — not just maintaining remnants or adherence to what’s true *now* that’s ultimately going to change. The approach should reflect the outcome and shouldn’t be bound to constraints that were only relevant before.
- Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we’re not starting from scratch.
- The complex data-level mechanics of the codebase are what least reflect *Nathan’s* intentions and are primarily reflective of what’s determined appropriate via past session agents. Treat it with care and respect, but don’t assume it’s beyond changing within reason, where simply presenting the approach to Nathan may be all that’s required to genuinely change the codebase for the betterment of everything within it and future iterations.

#### Principles (Nathan, Verbatim)

- **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on. 
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
- **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
- **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
- Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements. 
- Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
- Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.

#### Constraints

- **Briefs:** every agent brief, from scouts and executors to reviewers, carries the Approach and the Principles above in full, plus these Constraints. The neutral gate's brief carries the Approach and the Principles alone.
- **Placement:** any new or moved file goes to Nathan for approval before it's written. The Investigation finds none needed.
- **Not Feature-Level:** what the user sees and gets is unchanged, other than speed. Every page still lands whole or not at all, and still reaches the drive before its name points at it.
- **Sync:** sync code changes as little as possible (Decision B-1). Sync's own landing, `landBytes`, keeps its behavior, and the plan states whether its body changes when `utimes` folds into the seam.
- **Removal First:** within each phase, what leaves goes first: `write-file-atomic` and its types, `writeText`/`writeBytes` as separate Machine methods, the duplicate per-path serializer, `rewritePreservingTimes`, the index's stat, the settle's file branch, and the clash read.
- **The Number:** the plan measures about +180 Actionable on its validated worktree (*Write Path — Implementation Plan · §Overview · The Number*). A net-positive result states what it buys against the Mandate: a dependency, three Machine methods folded into one, a serializer, a second rewrite pipeline, two of three reads and most parses per file, and a per-file database transaction removed.
- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint` from the repo root, with lint clean. Biome formats every write. `npm run build` runs at the final head.
- **Commits:** on `active`, through `git commit --only -m "…" -- <paths>` after `git add` for new files (*Development-Environment · §Gates & Commits*). Messages are past tense, one to three sentences, and end with the session's attribution lines. The post-commit hook pushes.

#### Tasks

##### Written and Reviewed in the Planning Session

- [x] The benchmark's results are at `.claude/Planning/Trash & Archive Restructure/Trash & Archive Restructure — Reach-In Measurement.md`, and its re-run harness is at `.claude/Benchmarks/Reach-In/` (`RERUN.md`).
- [x] Scouts A and B and the merged design are in `Scouts/`; the plan is `Write Path — Implementation Plan.md`, every task's AFTER validated in a scratch worktree (typecheck, Biome, the full suite).
- [x] The pre-ratification review: Wave One, Wave Two, and the neutral gate, each folded into the plan; the neutral gate answered yes.
- [x] Nathan's ratification (10-29-2026), then the overnight run from *§Implement and Verify*.

##### Implement and Verify

8. Execute through `c/plan-execution`. Each task goes to an `execution-agent` (`opus-medium`), and each phase ends with a read-only review checkpoint (`opus-high`, loading `code-simplification` then `adversarial-review`, reading outward).
9. Run Final Verification over `<BASELINE>..HEAD`: Wave One, Wave Two, and the neutral gate, then the own pass. Task 1-8 leaves the harness's baseline worktree, the re-fitted `instrumentation.patch`, and Medium-0 behind; the own pass moves that worktree to HEAD for its before-and-after, and step 11's matrix reuses it, adding the reach-in worktree and the other fills, so the harness is built once. The Cold-Machine Check moves to after step 12, since the matrix still needs the harness.
10. Close out through `closeout-review`: the closeout report, a `HistoryPM.md` entry in the file's own format, and the reconciled docs.

##### Resume the Trash & Archive Restructure

11. Re-run the reach-in matrix on the new HEAD with `.claude/Benchmarks/Reach-In/RERUN.md`. Both patches were cut against `15fe7422a`, and W-1 rewrites `governedSweep.ts`, `settle.ts`, and `nodeMachine.ts`, so re-fit them onto the new HEAD and note every hunk that needed re-fitting: `instrumentation.patch` counts `land`, the seam's one write, where it counted `writeText` and `writeBytes`, and `bench.mjs`, `profile.mjs`, and `report.mjs` follow the new names. The first run's raw results are kept as `results/<cell>-15fe7422a.jsonl`, as the profile's are. The matrix runs only the cells the recommendation rests on: Medium-10 (a typical Trash) and Medium-50 (a heavy one) at three runs per build, and Large-50 (the worst case at scale) at two, about forty minutes in all; each cell compares the two builds on the same fill, so the first run's 0% cells, Small, and Large-0 aren't repeated. Then `./teardown.sh` and the Cold-Machine Check.
12. Write the new matrix into *Trash & Archive Restructure — Investigation*'s *§The Trash's Model · §The Measurement*, which is the pending slot.
13. Bring Nathan two things, in plain words: the recommendation on the Trash's model (reach-in or resolve-on-restore, consolidated), with the numbers and B-9 weighed; and I-064, the Investigation's one open question (a page dragged out of the Trash in Finder), whose direction Nathan gave on 10-29-2026, with his trash-marked-ID suggestion kept open for the next session's brainstorm. The overnight run ends here, with the morning report and a final `PushNotification`.
14. Then continue the brainstorm's last phase on the Trash & Archive Decisions document: ratified categorization of the decisions, a self-review, and the pre-ratification review the Decisions' *§Constraints · Process* names. After that comes the Trash & Archive plan, under six phases, carrying every model-independent fold and fix regardless (Decision A-7). Its first phase is the change-time identity Nathan approved on 10-29-2026 (*Write Path — Implementation Plan · §Deviations · D-2*).

#### Verification

- **Speed:** a Medium property rename's per-file cost falls from about 7.3 ms toward the Investigation's 3-3.5 ms, measured with the harness rather than estimated. The Context rename loses its repeated walks.
- **One Read:** the harness's I/O counts show one `readText` and one parse per file a cascade rewrites, and no per-file index `stat`.
- **Gone:** `write-file-atomic` is absent from `Desktop/package.json` and the lockfile, and no production code writes a page outside the one landing.
- **Invariants:** each of the Investigation's *§Invariants It Must Keep* has a test that fails without it. That includes a new test for the land pass refusing a file an outside writer changed mid-chunk.

#### Insights

- **The Flush Is the Cost:** reads are about 0.05 ms each. The plan should not spend its effort shaving reads at the flush's expense.
- **Chunk Size:** about 64 files per flush, with `UV_THREADPOOL_SIZE=16` measured at about 1.6 ms per file against about 2.6 ms at the default pool size. Whether the host raises the pool size is the plan's call, and the plan states why.
- **The Machine Seam Is the Owner:** only the host can flush, so batching lives in the seam. `writeText` and `writeBytes` fold into one landing that takes `{ path, data, mtimeMs?, expect? }[]` and answers each file's stat or its refusal.
- **Outside Edits:** today an outside write between a sweep's read and its rename is overwritten silently. The land pass's stat recheck turns that into a skip that Try Again picks up, a correctness gain on top of the speed.
- **The Trash Plan's Callers Don't Change:** `restoreProperty`, `spend`, `restoreScrub`, `trashedCopies`, and `archive` consume the sweep. Leave them for the Trash & Archive plan.

#### Checkpoints

- **Plan Ratification:** Nathan's word before any code.
- **Feature-Level Surprise:** anything that would change what a user sees, other than speed and the plan's race-only changes, is taken at its simplest reading that changes nothing visible and recorded under the plan's *§Deviations* for the morning report.
- **Context Budget:** the session delegates exploration, execution, and review to agents, and reads their reports rather than whole files. The run doesn't stop for compaction: progress is kept durable as it goes (the plan's *§Process Overview* ticks, its Net Ledger, and its *§Deviations* at each task, and a commit per task), and the continuation rereads this brief, the plan's *§Constraints*, and `c/plan-execution` from the files before its next task.
