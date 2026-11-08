### Views Cleanup — Overnight Handoff

**DATE:** 11-07-2026
**STATE:** The decision log is ratified, and planning starts from it. No production code has changed, and nothing in `.claude/Planning/Views Cleanup/` is committed.

Two prompts follow. The first goes into `/compact`, so the summary keeps what the run needs. The second starts the overnight run once compaction finishes. The run ticks *§Run Checklist* at the bottom of this file as it goes, and after any compaction it resumes from what's ticked.

---

#### Pre-Compaction Prompt

```
Compact for an unattended overnight planning run of Views Cleanup in Pommora (`~/The Studio/Projects/Project Pommora`, branch `active`). Keep these, and drop the back-and-forth that produced them:

- The planning folder, `.claude/Planning/Views Cleanup/`, holds:
  - *Views Cleanup — Decisions & Intention*, ratified 11-07-2026: topics A–G, Constraints, and Rejections.
  - *Views Cleanup — Investigation*, the synthesis at `cae07c129`, with nine themes, a Placements table, Calls, Needs a Live Run, Totals, and Becomes False.
  - `Scouts/1–8`, the reconciled scout reports.
  - *Views Cleanup — Fresh-Eyes Read*, the second zero-context read, every finding already folded into the log.
  - *Views Cleanup — Overnight Handoff*, this run's prompt and its Run Checklist.
- Where the Investigation and the log differ, the log wins, since it was written after the Investigation and corrected against the code twice. The log's own changes to the Investigation:
  - **Page renaming:** it goes through one view-held, surface-held rename shape grown from `PageNameRename`, not through the session fence (D-1, D-2), and I-040 rides along.
  - **Editor root:** neither option A nor B is taken (F-1).
  - **Kept names:** `PickerMenu` and `Views/Host/` keep their names; a `MenuBase` rename becomes its own phase only if planning finds that it earns one (G-1).
  - **Kept file:** `paneTargets.ts` stays.
  - **Behavior changes Nathan already ruled:**
    - Empty option bands appear at both levels under Hide Empty Groups (E-3).
    - The grouping and filter folder trees look identical, and Hide Disclosure Chevrons governs the sidebar and the Grouping list through one rule, the Location tree keeping its chevrons (C-4, C-5, as ruled at the morning review).
    - Cards' pickers lose their solid background (F-6).
    - The Trash and Archive date column is left-aligned (F-8).
    - Both icon switches read "Title Icons" (F-2).
    - The Filter menus go native, and the Checkbox operators read "Checked" and "Unchecked" (F-7).
- The process model is List Consolidation, Nathan's most recent plan, deleted from Planning in `e7f54e30f` and read through `git show e7f54e30f^:".claude/Planning/List Consolidation/<file>"`:
  - Its Implementation Plan, Plan Reviews, and Morning Report.
  - Its patch chain, built in a scratch worktree and saved to `Scouts/Planning/Phases/`.
  - Wave One Outward (`opus-xhigh`), Wave Two Inward (`opus-xhigh`), and Wave Three Both Ways (`fable-high`).
  - A closing proof that replayed every patch onto a clean export.
  - Final-Verification lenses and a `fable-high` Neutral Gate.
  MetadataV3's plan (`.claude/Planning/Completed/MetadataV3/`) is the model for Constraints' form, and `~/NexusOS/Studio/Athena/II. Drafts/Plan-Creation.md` is the plan document's format.
- Nathan's standing directives for this run:
  - Decide in-flight by his Approach and Principles, which are verbatim in the post-compaction prompt.
  - Report anything he'd genuinely want to reverse in the morning report.
  - Send PushNotification at checkpoints.
  - Wake him to a full plan plus an overview and report.
  - Every file placement is his to approve, so the plan proposes placements and the report presents them as one list.
  - Every agent brief carries his Approach and Principles in full, with an explicit model and effort.
- The six behavior fixes from the Investigation that Nathan has heard about and that planning carries:
  - ViewMenu misses staged edits (1.11).
  - The Table's anchored ghost drops early (2.4).
  - The Table re-renders on every selection (2.7).
  - A locked tile's pill begins a rename (3.2).
  - The 8px drop-line offset (6.6).
  - Tiles key on renderer classes (8.4).
- What the zero-context reads exposed, which planning must verify rather than assume:
  - G-3's page-record move may pull engine-side modules into the window; both boundary tests settle it.
  - D-2's in-flight-versus-gone rename timing needs a live run.
  - The column-style move (Investigation 5.7) has an import cycle through `views.ts`.
```

---

#### Post-Compaction Prompt

```
Plan Views Cleanup now, unattended and overnight, in Pommora (`~/The Studio/Projects/Project Pommora`). Nathan wakes to a finished plan that's ready to ratify, a morning report, and a prompt that starts execution. Nothing waits on him; every stop is yours to handle. Tick *Views Cleanup — Overnight Handoff · §Run Checklist* as each step closes. After any compaction, reread that file, this prompt's Approach and Principles, and the decision log from the files themselves rather than from a summary, then resume from what's ticked.

<approach>
- Any approaches being considered here must first assess what's true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We're not going to design based on what's currently there and simply adjust course, we're ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what's ultimately going to be replaced.
- We're approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
- We shouldn't adding anything new unless there's evidence that it's required. We'd approach this through the perspective of ending up with cumulatively "less stuff" in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and fewer headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our <principles>.
- Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebases' resulting shape — not just maintaining remnants or adherence to what's true *now* that's ultimately going to change. The approach should reflect the outcome and shouldn't be bound to constraints that were only relevant before.
- Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we're not starting from scratch.
- The complex data-level mechanics of the codebase are what least reflect *Nathan's* intentions and are primarily reflective of what's determined appropriate via past session agents. Treat it with care and respect, but don't assume it's beyond changing within reason, where simply presenting the approach to Nathan may be all that's required to genuinely change the codebase for the betterment of everything within it and future iterations.
</approach>

<principles>
- **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
- **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
- **Real Purpose:** Anything added to the codebase should have its purpose clearly stated from the perspective of its value in enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
- Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements.
- Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
- Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.
</principles>

**Sources, Read First From the Files:**
- `.claude/Planning/Views Cleanup/Views Cleanup — Decisions & Intention.md` (ratified; its Decisions, Constraints, and Rejections are rulings, not re-raised, unless the code shows a decision can't hold).
- *Views Cleanup — Investigation* and `Scouts/1–8` beside it. Where the Investigation and the log differ, the log wins.
- *Views Cleanup — Fresh-Eyes Read*.
- The model run, List Consolidation, through `git show e7f54e30f^:".claude/Planning/List Consolidation/<file>"`: its *Implementation Plan*, *Plan Reviews*, and *Morning Report*.
- MetadataV3's plan, in `.claude/Planning/Completed/MetadataV3/`, for its *§Constraints*.
- `~/NexusOS/Studio/Athena/II. Drafts/Plan-Creation.md`, for the plan document's format.
- `~/The Studio/.claude/skills/agent-orchestration/SKILL.md`, before dispatching anything.
- `.claude/Guidelines/Development-Environment.md` and `.claude/scripts/README.md`, before driving the app.

**How Decisions Get Made:**
- Nathan is asleep, so you make every call yourself, weighed against the Approach and Principles. Plan-Creation's "Ask First" becomes "decide, then disclose".
- Every call lands in the morning report's *§Calls I Took*.
- Anything Nathan could genuinely want reversed — a visible behavior change no decision names, a reading of a decision he might not share, a placement, or a rename he'd read in file names — also lands in *§What You'd Probably Overrule*, with what reversing it costs.
- A decision the code proves can't hold is followed as closely as the code allows, and recorded under *§Contradictions With the Log*.
- Every agent brief carries the Approach and Principles above in full, states its model and effort, and reads the decision log whole. The Neutral Gate's brief alone carries the Approach, the Principles, and its intention, with nothing from the plan.
- Model combinations follow the model run: `opus-xhigh` for the outward and inward waves, `fable-high` for the both-ways wave and the Neutral Gate, `opus-high` for synthesis and reconciliation, `opus-medium` for building phase patches, and `sonnet-medium` or `haiku-record` for lookups and running commands.

**The Run, in Order:**
1. **Freshness:** read `git log --oneline cae07c129..HEAD -- Core UIX Desktop` and re-verify every Investigation and log citation in a changed file. Take the BASELINE head as `active`'s HEAD at this step, and record the test count, the comment count (the model run's `git grep -c` command), and `~/Test`'s hash.
2. **Live Questions:** run the Investigation's *§Needs a Live Run* items that decide design rather than confirm it. That's D-2's in-flight rename across two mounted surfaces, the Table ghost's collapse-then-grow, the band chevron's Tab order, and the locked tile pill. Run them from a worktree of the BASELINE head, never the main checkout, and never stop an instance you didn't start.
3. **Design:**
   - **Phases:** set the phase shape from the Investigation's nine themes and the log. I-059 goes last as its own phase. A docs-and-issues phase follows it, rewriting false documentation as shorter user-facing summary, closing I-040, I-059, and I-070, and rewriting `FrameworkPM.md:21`. A `MenuBase` phase exists only if it earns one against the Principles.
   - **Ordering:** removal comes before addition. Sequence phases so each signature is written once.
   - **Placements:** propose every new, moved, renamed, and deleted file as one list.
4. **Build:**
   - **The chain:** build every phase as a commit chain in a detached worktree of the BASELINE head, made inside the session scratchpad. Link `$SCRATCHPAD/.claude` to `~/The Studio/.claude` for typecheck and lint.
   - **Commits:** commit there through `git -c core.hooksPath=/dev/null commit`, so no hook syncs or pushes.
   - **Gates and measure:** run the gates at every phase head, and measure each phase with `view-delta … --exclude .claude --save <scratch>`.
   - **Pins:** each pin a task names goes red without its change.
   - **Patches:** export one patch per task to `.claude/Planning/Views Cleanup/Scouts/Planning/Phases/`, and write each phase's *Notes* there.
   - **No production code lands on `active`.**
   - **If the build stalls:** any phase whose patch isn't built by the time Wave One must open gets a literal AFTER diff in Plan-Creation's format instead, is listed under *§Not Run*, and the waves review it as written. The morning always has a complete plan.
5. **The Plan:**
   - **File:** write `Views Cleanup — Implementation Plan.md` in Plan-Creation's format, using the model run's plan for shape and density, with each task's AFTER being its patch.
   - **Constraints** carry:
     - The Approach and Principles verbatim, as the Mandate.
     - Every Constraint from the log, and the Plan Rules.
     - The gates, commits, the Number with its Net Ledger, and the Comment Ledger.
     - Placements as proposed, pending Nathan's approval.
     - Sync (`git diff --stat <BASELINE>..HEAD -- Core/Sync Sync` prints nothing), execution and unattended rules, Notifications, and Reviews (opus-high simplification plus adversarial at each checkpoint).
     - A Neutral Gate with its intention written plainly. Its measure: whether a zero-context before-and-after reader prefers the after.
   - **Behavior changes:** a §Behavior Changes list numbers every visible change with its decision.
   - **Closing sections:** §Reconciliation lists every claim the work makes false and the task that rewrites it. §Concepts is written last.
6. **Plan Reviews**, recorded in `Views Cleanup — Plan Reviews.md` as the model run's was, each wave folded into the patches and the plan before the next opens, with a fold ledger in `Scouts/Planning/Phases/`:
   - **Wave One · Outward (`opus-xhigh`):** a simplification reviewer and an adversarial reviewer. The adversarial one replays the patches onto a clean export and runs what it can rather than only reading.
   - **Wave Two · Inward (`opus-xhigh`):** an executor read that replays every patch, runs every VERIFY as written, and reverts every pin, plus a second simplification read.
   - **Wave Three · Both Ways (`fable-high`):** one reviewer traces every fold into the code, and answers without hedging whether a neutral before-and-after reader prefers the after. Its verdict is quoted.
   - **Closing Proof:** every patch replays in order onto a clean export of the BASELINE head, the end tree matches the chain, and the gates and `npm run build` pass there. The repo's pre-commit hook (`.claude/hooks/pre-commit`) also runs clean over the replayed tree, since the chain's commits skipped it.
7. **The Morning Report:** write `Views Cleanup — Morning Report.md` in the model run's shape:
   - The headline number, `<net> (+added / -removed)`.
   - *§Overview* in plain terms, and *§Process Overview*.
   - *§Net Lines* per phase.
   - *§What You'd Probably Overrule*, first and numbered.
   - *§Placements for Approval*, as one table: path, change, and why.
   - *§Contradictions With the Log*, *§Calls I Took*, and *§Flagged Behavior Changes*.
   - *§Not Run*, honestly.
   - *§The Prompt That Starts Execution*, modeled on the model run's: `c/plan-execution`, unattended, with Approach and Principles carried in every brief, PushNotification at checkpoints, and a cold-machine close.
   Nathan isn't technical, so the overview and every overrule item read in plain terms first, with the code names second.
8. **Close:** remove every worktree, scratch export, and process the run started, then prove it with the model run's Cold-Machine Check. That means `git worktree list` shows the main checkout alone, no drive temp folders remain, no stray electron or vitest processes run beyond Nathan's own instance, and `~/Test`'s hash matches step 1.
   - **Plan status:** set it to "Ready to Ratify — Placements Pending".
   - **Commits:** commit nothing. Ratification and the planning folder's commit are Nathan's in the morning.
   - **Deliver:** send the morning report and the plan through `SendUserFile` (status `proactive`), then a final PushNotification.

**Notifications:** send a PushNotification in plain language at each of these, saying what happened, what was found, and what's next:
- The run starts.
- Freshness and the live questions close.
- The phase shape and placements are set.
- Every two or three phases built, with the running net.
- Each wave folds.
- The closing proof passes.
- The report is ready.
- Anything goes red that stops progress, along with what you did about it.

**Standing Rules:**
- `PushNotification` and `SendUserFile` are deferred tools; load them through `ToolSearch` before their first use.
- Gates are `npm run typecheck`, `npm run test`, and `npm run lint`, run from a tree's root, with lint clean.
- A scripted edit is followed by `npm run format`.
- A `\b` grep runs under `git grep -P`.
- Known load-flaky files rerun by file before a failure is read as real.
- A Bash command carrying `git` can't contain a personal name anywhere, heredocs included.
- Never launch the app from the main checkout, and drives run one at a time.
- An ambiguity takes its simplest reading consistent with the Principles, gets recorded, and the run carries on.
- A message from Nathan during the run is input to fold in, not a stop.
- Report every line count as `<net> (+added / -removed)`, excluding tests, comments, and docs.
```

---

#### Run Checklist

- [x] 1 · Freshness and BASELINE recorded — `cae07c129`, unchanged since the Investigation; 9,269 tests, comments 3,517, `~/Test` `e5a32a5d3…` (*Scouts/Planning/Phases/Build Log*)
- [x] 2 · Live questions run — timing, ghost, and Tab order confirmed live; twins answered from `useHosts`; the locked pill from code (*Build Log · §Live Questions*)
- [x] 3 · Phase shape and placements set — eleven phases in *Views Cleanup — Implementation Plan* (Draft), placements in its *§Constraints*
- [x] 4 · Phase patches built and measured — 27 patches, Phases 1 to 11, chain at `f8e96f1e2`, -376 (+3282 / -3658), comments 3,493 (*Build Log*)
- [x] 5 · Implementation Plan written — Draft, every task's AFTER its patch, Concepts filled; STATUS set at the close
- [x] 6a · Wave One folded — 17 folds, chain re-squashed one commit per task at `a0740a60b`, -387 (+3324 / -3711) (*Plan Reviews*, *Wave One — Fold Ledger*)
- [x] 6b · Wave Two folded — the plan's text corrected from the executor read, seven code folds, chain at `099c236ee`, -370 (+3392 / -3762)
- [x] 6c · Wave Three folded — 0 High, 1 Medium, 7 Low, all plan text, folded; every ledger fold traced and holding; verdict "Yes"
- [x] 6d · Closing proof passed — 27 patches onto a clean `cae07c129` match `099c236ee`; gates, build, pre-commit hook, atlas green there
- [x] 7 · Morning Report written — *Views Cleanup — Morning Report*, headline -370 (+3392 / -3762), fifteen overrule items, 38 placements; after the morning review's two rulings folded, -352 (+3409 / -3761) and thirteen items
- [x] 8 · Cold-Machine Check clean, files sent — main checkout alone in `git worktree list`, no `vc-*` branch, no drive temp folder, only the dev instance from the main checkout running, `git status` showing the planning folder alone, `~/Test` at `e5a32a5d3…`; the two `.claude` links removed
